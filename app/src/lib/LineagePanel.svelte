<script lang="ts">
	import Frame from './Frame.svelte';
	import Plot from './Plot.svelte';
	import { store, ui } from './state.svelte';
	import { GROUP_ORDER, groupColor, materialGroup, plotTheme } from './colors';
	import { buildLineage, orderRows } from './lineage';
	import { enumLabel, type View } from './logic';

	let { view }: { view: View } = $props();
	let minPapers = $state(2);
	let w = $state(1200);
	const narrow = $derived(w < 720);

	const th = $derived(plotTheme(ui.theme));
	const a = $derived(store.atlas);
	const groupLabel = (g: string) => (g === 'other_group' ? 'Other EO materials' : a ? enumLabel(a, 'eo_material', g) : g);
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	const graph = $derived(buildLineage(view.papers));
	const rows = $derived(orderRows(graph, minPapers));
	const rowOf = $derived(new Map(rows.map((r, i) => [r.key, i])));
	const nameOf = $derived(new Map(graph.pis.map((p) => [p.key, p.name])));
	const edges = $derived(graph.edges.filter((e) => rowOf.has(e.from) && rowOf.has(e.to)));
	const nLineage = $derived(edges.filter((e) => e.kind === 'lineage').length);

	const traces = $derived.by(() => {
		const out: any[] = [];
		// active span of each PI (first to last last-author paper)
		const sx: (number | null)[] = [];
		const sy: (number | null)[] = [];
		rows.forEach((r, i) => {
			if (r.last > r.first) sx.push(r.first, r.last, null), sy.push(i, i, null);
		});
		out.push({ type: 'scatter', mode: 'lines', x: sx, y: sy, line: { color: th.line, width: 2 }, hoverinfo: 'skip', showlegend: false });
		// collaboration links
		const cx: (number | null)[] = [];
		const cy: (number | null)[] = [];
		const hx: number[] = [];
		const hy: number[] = [];
		const ht: string[] = [];
		for (const e of edges) {
			const y0 = rowOf.get(e.from)!;
			const y1 = rowOf.get(e.to)!;
			if (e.kind === 'collab') cx.push(e.year, e.year, null), cy.push(y0, y1, null);
			const x1 = e.kind === 'lineage' ? rows[y1].first : e.year;
			hx.push((e.year + x1) / 2);
			hy.push((y0 + y1) / 2);
			ht.push(
				`<b>${e.kind === 'lineage' ? 'Candidate lineage' : 'PI co-authorship'}</b><br>${esc(nameOf.get(e.to) ?? e.to)}: author ${e.pos}/${e.n} on<br>${esc(e.paper.label)} (last author ${esc(nameOf.get(e.from) ?? e.from)})` +
					(e.kind === 'lineage' ? `<br>first last-author paper: ${rows[y1].first}` : '')
			);
		}
		out.push({ type: 'scatter', mode: 'lines', x: cx, y: cy, line: { color: th.muted, width: 1, dash: 'dot' }, hoverinfo: 'skip', showlegend: false });
		out.push({ type: 'scatter', mode: 'markers', x: hx, y: hy, marker: { size: 12, color: 'rgba(0,0,0,0)' }, customdata: ht, hovertemplate: '%{customdata}<extra></extra>', showlegend: false });
		// papers as last author, one trace per material group (fixed colour per group)
		const pts = new Map<string, { x: number[]; y: number[]; t: string[] }>();
		rows.forEach((r, i) => {
			const perYear = new Map<number, number>();
			for (const p of r.papers) {
				const k = perYear.get(p.year) ?? 0;
				perYear.set(p.year, k + 1);
				const rep = view.reps.get(p.paper_id);
				const g = rep ? materialGroup(rep.eo_material) : 'other_group';
				const s = pts.get(g) ?? { x: [], y: [], t: [] };
				s.x.push(p.year + (narrow ? 0.26 : 0.18) * k);
				s.y.push(i);
				s.t.push(`<b>${esc(p.label)}</b><br>${esc(p.title)}<br>${p.year}, ${esc(groupLabel(g))}<br>last author: ${esc(r.name)}`);
				pts.set(g, s);
			}
		});
		for (const g of GROUP_ORDER) {
			const s = pts.get(g);
			if (!s) continue;
			out.push({
				type: 'scatter',
				mode: 'markers',
				x: s.x,
				y: s.y,
				marker: { size: narrow ? 7 : 9, color: groupColor(g, ui.theme), line: { color: th.surface, width: 1.5 } },
				customdata: s.t,
				hovertemplate: '%{customdata}<extra></extra>',
				showlegend: false
			});
		}
		return out;
	});

	const years = $derived([...rows.flatMap((r) => [r.first, r.last]), ...edges.map((e) => e.year)]);
	const height = $derived(Math.max(260, rows.length * 20 + 60));
	const layout = $derived({
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		margin: { l: 8, r: 16, t: 8, b: 8 },
		font: { family: 'system-ui, sans-serif', size: 11, color: th.ink2 },
		showlegend: false,
		hovermode: 'closest',
		hoverlabel: { bgcolor: th.surface, bordercolor: th.line, font: { color: th.ink, size: 11 }, align: 'left' },
		xaxis: {
			title: { text: 'Publication year', standoff: 4 },
			tickformat: 'd',
			dtick: narrow ? 2 : 1,
			tickangle: 0,
			range: years.length ? [Math.min(...years) - 0.6, Math.max(...years) + 0.8] : undefined,
			gridcolor: th.grid,
			linecolor: th.line,
			tickfont: { size: 10 },
			automargin: true,
			zeroline: false,
			side: 'top'
		},
		yaxis: {
			tickmode: 'array',
			tickvals: rows.map((_, i) => i),
			ticktext: rows.map((r) => `${esc(r.name)} (${r.papers.length})`),
			range: [rows.length - 0.5, -0.7],
			tickfont: { size: 10, color: th.ink },
			showgrid: false,
			linecolor: th.line,
			automargin: true,
			zeroline: false
		},
		annotations: edges
			.filter((e) => e.kind === 'lineage')
			.map((e) => ({
				x: rows[rowOf.get(e.to)!].first,
				y: rowOf.get(e.to)!,
				ax: e.year,
				ay: rowOf.get(e.from)!,
				xref: 'x',
				yref: 'y',
				axref: 'x',
				ayref: 'y',
				text: '',
				showarrow: true,
				arrowhead: 2,
				arrowsize: 1,
				arrowwidth: 1.5,
				arrowcolor: th.ink2,
				standoff: 6,
				startstandoff: 6
			}))
	});
</script>

<svelte:window bind:innerWidth={w} />

<Frame
	letter="l"
	desc="Academic lineage from author order (no advisor records in the database). Rows: last authors as PI proxy; markers: their papers, coloured by EO material. Arrow (candidate lineage): the person was in the first half of the author list of that PI's paper before their own first last-author paper here. Dotted: other co-authorships between PIs. Names matched by first and last name; not verified relations; limited to papers in the current filter."
	badge={`${rows.length}/${nLineage}`}
	badgeTip="PI rows shown / candidate lineage arrows, in the current filter"
	height={480}
>
	{#snippet controls()}
		<span class="key" title="Candidate lineage (author-order heuristic, unverified)">
			<svg viewBox="0 0 22 10" width="22" height="10"><path d="M1 5 H19 M15 1.5 L20 5 L15 8.5" fill="none" stroke="currentColor" stroke-width="1.4" /></svg>lineage
		</span>
		<span class="key" title="Co-authorship between PIs">
			<svg viewBox="0 0 22 10" width="22" height="10"><path d="M1 5 H21" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2" /></svg>co-author
		</span>
		<span class="seg" title="Which PIs get a row">
			<button class:on={minPapers === 2} onclick={() => (minPapers = 2)} title="PIs with 2+ last-author papers or any link">2+</button><button class:on={minPapers === 1} onclick={() => (minPapers = 1)}>all</button>
		</span>
	{/snippet}
	<div class="sc">
		<div style="height:{height}px"><Plot data={traces} {layout} /></div>
	</div>
</Frame>

<style>
	.sc {
		height: 100%;
		overflow-y: auto;
	}
	.key {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--ink-3);
		font-size: 10px;
	}
</style>
