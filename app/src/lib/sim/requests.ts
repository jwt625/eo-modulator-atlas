// Every postprocessing request of the UI is built here, so each one addresses the solution its view selects (COMSOL:
// every dataset-consuming view has a solution / parameter value): the last Compute, or a sweep point (`sol`), with the
// mode chosen for that dataset in that solution (DevLog-032 F1/F2/G1/G2).
import type { DerivedRequest, LineSpec, PlotRequest, PostRequest } from './post/contract';
import type { CutLine, DerivedNode, Feature, PlotGroup, Results } from './results.svelte';

/** Solution id of a parameter value: undefined = last Compute, else 'sweep:<index>'. */
export function solFor(point: number): string | undefined {
	return point >= 0 ? `sweep:${point}` : undefined;
}
/** Solution id of a plot group. */
export function solOf(g: PlotGroup | null): string | undefined {
	return g ? solFor(g.point) : undefined;
}
const withSol = <T extends object>(r: T, sol: string | undefined) => (sol ? { ...r, sol } : r);

/** Plot request of a feature expression (also the cache key of its values). */
export function plotRequest(R: Results, g: PlotGroup, f: Feature, expr: string, unit: string): PostRequest {
	const ds = f.dataset || g.dataset;
	const sol = solOf(g);
	const req: PlotRequest = { dataset: ds, expr, unit, mode: R.modeFor(ds, sol), selection: R.selectionRegions(f.selection), ...(f.resolution === 'normal' ? { resolution: 'normal' as const } : {}) };
	return withSol({ op: 'plot' as const, req }, sol);
}

/** Exact point value of a feature expression at (x, y) µm in the shown solution (hover probe, `__simProbe`). */
export function probeRequest(R: Results, g: PlotGroup, f: Feature, x: number, y: number): PostRequest {
	const ds = f.dataset || g.dataset;
	const sol = solOf(g);
	const req: DerivedRequest = { kind: 'point', dataset: ds, expr: f.expr, unit: f.unit, mode: R.modeFor(ds, sol), selection: [x, y] };
	return withSol({ op: 'derived' as const, req }, sol);
}

/** Line Graph values along a cut line, in the cut line's solution. */
export function lineRequest(R: Results, cl: CutLine, expr: string, unit: string): PostRequest {
	const sol = solFor(cl.point);
	const line: LineSpec = { ax: cl.ax, ay: cl.ay, bx: cl.bx, by: cl.by, n: cl.n };
	return withSol({ op: 'line' as const, dataset: cl.source, mode: R.modeFor(cl.source, sol), exprs: [expr], units: [unit], line }, sol);
}

/** Mode Analysis table of a dataset in a solution. */
export function modesRequest(ds: string, point: number): PostRequest {
	return withSol({ op: 'modes' as const, dataset: ds }, solFor(point));
}

/** Values of an RF frequency-sweep expression in a solution. */
export function rfRequest(expr: string, unit: string, point: number): PostRequest {
	return withSol({ op: 'plot' as const, req: { dataset: 'rf', expr, unit } }, solFor(point));
}

/** Global value of an expression in a solution (EO page, Global Evaluation). */
export function globalRequest(ds: string, expr: string, unit: string, point: number): PostRequest {
	return withSol({ op: 'derived' as const, req: { kind: 'global' as const, dataset: ds, expr, unit } }, solFor(point));
}

/** Surface integral of an expression over regions of a dataset in a solution (EO breakdown). */
export function integralRequest(ds: string, expr: string, unit: string, regions: string[] | null, point: number): PostRequest {
	return withSol({ op: 'derived' as const, req: { kind: 'surface_int' as const, dataset: ds, expr, unit, selection: regions } }, solFor(point));
}

/** Point of a derived node: its own (global, surface) or its cut line's / cut point's. */
export function derivedPoint(R: Results, d: DerivedNode): number {
	if (d.kind.startsWith('line')) return R.cutLines.find((x) => x.id === d.target)?.point ?? -1;
	if (d.kind === 'point') return R.cutPoints.find((x) => x.id === d.target)?.point ?? -1;
	return d.point ?? -1;
}

/** Request of a derived node, or an error message when its inputs are incomplete. */
export function derivedRequest(R: Results, d: DerivedNode): { post: PostRequest; req: DerivedRequest; point: number } | string {
	if (!d.expr.trim()) return 'empty expression';
	const point = derivedPoint(R, d);
	const sol = solFor(point);
	const base: DerivedRequest = { kind: d.kind, dataset: d.dataset, expr: d.expr, unit: d.unit, mode: R.modeFor(d.dataset, sol) };
	let req: DerivedRequest;
	if (d.kind === 'global') req = base;
	else if (d.kind.startsWith('surface')) {
		const regions = d.target ? R.selectionRegions(d.target) : null;
		if (d.target && !regions?.length) return 'the selection is empty';
		req = { ...base, selection: regions };
	} else if (d.kind.startsWith('line')) {
		const c = R.cutLines.find((x) => x.id === d.target);
		if (!c) return 'choose a cut line dataset';
		req = { ...base, dataset: c.source, mode: R.modeFor(c.source, sol), selection: { ax: c.ax, ay: c.ay, bx: c.bx, by: c.by, n: c.n } };
	} else {
		const p = R.cutPoints.find((x) => x.id === d.target);
		if (!p) return 'choose a cut point dataset';
		req = { ...base, dataset: p.source, mode: R.modeFor(p.source, sol), selection: [p.x, p.y] };
	}
	return { post: withSol({ op: 'derived' as const, req }, sol), req, point };
}
