// Solutions a 1D plot group draws (one statement for the settings page, the graphics header and the CSV): Line
// Graphs use their cut line's solution, RF Global features the group's Parameter value, parametric Global features all
// sweep points, Table Graphs the table rows (Solution column).
import type { Workbench } from './workbench.svelte';
import type { PlotGroup } from './results.svelte';

export function oneDSolutions(wb: Workbench, g: PlotGroup): { labels: string[]; tag: string; hasRf: boolean } {
	const R = wb.results;
	const labels: string[] = [];
	const tags: string[] = [];
	let hasRf = false;
	const add = (label: string, tag: string) => {
		if (!labels.includes(label)) labels.push(label);
		if (tag && !tags.includes(tag)) tags.push(tag);
	};
	const tagOf = (p: number) => (p < 0 ? 'Compute' : `p${p + 1}-${Object.entries(wb.sweepRows[p]?.values ?? {}).map(([k, v]) => `${wb.axisLabel(k).replace(/ \(.*\)$/, '')}=${v}`).join('_')}`);
	for (const f of g.features) {
		if (!f.visible) continue;
		if (f.type === 'linegraph') {
			const cl = R.cutLines.find((c) => c.id === f.dataset);
			if (cl) add(wb.solutionLabel(cl.point ?? -1), tagOf(cl.point ?? -1));
		} else if (f.type === 'global' && f.dataset === 'rf') {
			hasRf = true;
			add(wb.solutionLabel(g.point), tagOf(g.point));
		} else if (f.type === 'global') add('all sweep points', 'sweep');
		else if (f.type === 'tablegraph') {
			const t = R.tables.find((x) => x.id === f.tableId);
			if (t) add(`table ${t.name} (Solution column)`, 'table');
		}
	}
	return { labels, tag: tags.join('_').replace(/[^\w.=-]+/g, '_'), hasRf };
}
