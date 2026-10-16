// Derived Values evaluation (COMSOL Evaluate): one row per evaluation appended to the node's table in wide format:
// Solution (explicit: 'Compute (gap_um = 3 µm)' or 'Sweep point 2 (...)'), dataset, numeric parameter columns of that
// solution (unit in the header), x/y for point values, one column per evaluated quantity with its unit. Every
// evaluation addresses the node's solution (parameter value) through the worker (sweep points computed on demand).
import type { Workbench } from './workbench.svelte';
import type { DerivedNode, Table } from './results.svelte';
import { DERIVED_SHORT } from './results.svelte';
import type { DerivedResult } from './post/contract';
import { prettyUnit, sweepValues } from './post/ui';
import { derivedRequest } from './requests';

function tableOf(wb: Workbench, d: DerivedNode): Table {
	const R = wb.results;
	let t = R.tables.find((x) => x.id === d.tableId);
	if (!t) {
		t = R.addTable(`Table: ${d.name}`);
		d.tableId = t.id;
	}
	return t;
}

/** Header of the value column: `int(es.We) [Selection 1] (J/m)` (COMSOL table column = expression with unit). */
export function valueColumn(wb: Workbench, d: DerivedNode, unit: string): string {
	const R = wb.results;
	const f = DERIVED_SHORT[d.kind];
	const where = d.kind.startsWith('surface') ? (d.target ? ` [${R.selections.find((s) => s.id === d.target)?.name ?? d.target}]` : ' [all]') : d.kind.startsWith('line') ? ` [${R.cutLines.find((c) => c.id === d.target)?.name ?? ''}]` : '';
	return `${f ? `${f}(${d.expr})` : d.expr}${where} (${prettyUnit(unit)})`;
}

type Role = 'param' | 'value' | 'coord' | 'text';

/** Solution and parameter columns of a solution (-1 = last Compute). */
function solutionColumns(wb: Workbench, point: number): { rec: Record<string, string | number>; roles: Record<string, Role> } {
	const vals = point >= 0 ? (wb.sweepRows[point]?.values ?? {}) : wb.computeValues;
	const rec: Record<string, string | number> = { solution: wb.solutionLabel(point) };
	const roles: Record<string, Role> = { solution: 'text' };
	for (const [k, v] of Object.entries(vals)) {
		rec[wb.axisLabel(k)] = v;
		roles[wb.axisLabel(k)] = 'param';
	}
	return { rec, roles };
}

export async function evaluateNode(wb: Workbench, d: DerivedNode): Promise<number> {
	const r0 = derivedRequest(wb.results, d);
	if (typeof r0 === 'string') throw new Error(r0);
	if (!wb.post && r0.point < 0) throw new Error('no solution: Compute the study first');
	await wb.pointReady(r0.point);
	if (!wb.post) throw new Error('no solution worker');
	const r = await wb.post.request<DerivedResult>(r0.post);
	const t = tableOf(wb, d);
	wb.results.lastTable = t.id;
	wb.bottomTab = 'table';
	const { rec, roles } = solutionColumns(wb, r0.point);
	rec.dataset = wb.results.dsLabel(r0.req.dataset);
	roles.dataset = 'text';
	const at = d.kind === 'point' && Array.isArray(r0.req.selection) ? r0.req.selection : (d.kind === 'surface_max' || d.kind === 'surface_min') && r.at ? r.at : null;
	if (at) Object.assign(rec, { 'x (µm)': at[0], 'y (µm)': at[1] }), Object.assign(roles, { 'x (µm)': 'coord', 'y (µm)': 'coord' });
	const col = valueColumn(wb, d, r.unit);
	rec[col] = r.value;
	roles[col] = 'value';
	wb.results.appendRow(t, rec, roles);
	wb.addLog(`${d.name}: ${d.expr} = ${r.value.toPrecision(6)} ${prettyUnit(r.unit)}${r.at ? ` at (${r.at[0].toPrecision(4)}, ${r.at[1].toPrecision(4)}) µm` : ''} in ${rec.solution} -> ${t.name}`);
	return r.value;
}

/** Global Evaluation over all finished sweep points (one row per point, one numeric column per swept parameter). */
export function evaluateOverSweep(wb: Workbench, d: DerivedNode): number {
	if (d.kind !== 'global') throw new Error('only Global Evaluation runs over sweep points without field solutions');
	const rows = wb.sweepRows.filter((r) => r.status === 'done' && r.globals);
	if (!rows.length) throw new Error('no finished sweep points');
	const v = sweepValues(d.expr, rows.map((r) => r.globals), d.unit);
	const t = tableOf(wb, d);
	wb.results.lastTable = t.id;
	wb.bottomTab = 'table';
	rows.forEach((r, i) => {
		const { rec, roles } = solutionColumns(wb, r.index);
		rec.dataset = 'Parametric sweep';
		roles.dataset = 'text';
		const col = valueColumn(wb, d, v.unit);
		rec[col] = v.values[i];
		roles[col] = 'value';
		wb.results.appendRow(t, rec, roles);
	});
	wb.addLog(`${d.name}: ${d.expr} over ${rows.length} sweep points -> ${t.name}`);
	return rows.length;
}
