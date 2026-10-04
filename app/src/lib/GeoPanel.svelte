<script lang="ts">
	import Frame from './Frame.svelte';
	import Plot from './Plot.svelte';
	import { store, ui } from './state.svelte';
	import { REGION_ORDER, materialGroup, plotTheme, regionColor } from './colors';
	import { staticUrl } from './paths';
	import { enumLabel, type View } from './logic';
	import type { Site } from './types';

	let { view }: { view: View } = $props();
	let unit = $state<'authors' | 'papers'>('authors');
	let w = $state(1200);
	let mapW = $state(800);

	const th = $derived(plotTheme(ui.theme));
	const a = $derived(store.atlas);
	const sites = $derived(a?.sites ?? []);
	const lab = (en: string, v: string) => (a ? enumLabel(a, en, v) : v);
	const groupLabel = (g: string) => (g === 'other_group' ? 'Other EO materials' : lab('eo_material', g));
	const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	interface Pin {
		site: Site;
		paper: string;
		label: string;
		author: string;
		group: string;
	}

	/** One pin per (paper, author, site) in author mode; per (paper, site) in paper mode. */
	const pins = $derived.by(() => {
		const out: Pin[] = [];
		for (const p of view.papers) {
			const rep = view.reps.get(p.paper_id);
			const group = rep ? materialGroup(rep.eo_material) : 'other_group';
			const seen = new Set<string>();
			for (const f of p.affil ?? []) {
				const site = sites[f.s];
				if (!site) continue;
				const key = unit === 'authors' ? `${f.a}|${f.s}` : `${f.s}`;
				if (seen.has(key)) continue;
				seen.add(key);
				out.push({ site, paper: p.paper_id, label: p.label, author: f.n, group });
			}
		}
		return out;
	});

	const nPapersLocated = $derived(view.papers.filter((p) => (p.affil ?? []).length).length);

	/** Hover summary per site (invisible, unclustered markers on top of the clustered pins). */
	const siteSummary = $derived.by(() => {
		const m = new Map<number, { site: Site; n: number; papers: Map<string, string>; authors: Set<string>; groups: Map<string, number> }>();
		for (const q of pins) {
			const r = m.get(q.site.id) ?? { site: q.site, n: 0, papers: new Map(), authors: new Set(), groups: new Map() };
			r.n += 1;
			if (!r.papers.has(q.paper)) r.groups.set(q.group, (r.groups.get(q.group) ?? 0) + 1);
			r.papers.set(q.paper, q.label);
			r.authors.add(q.author);
			m.set(q.site.id, r);
		}
		return [...m.values()];
	});

	const zoom0 = $derived(Math.max(-1, Math.log2(Math.max(mapW, 200) / 512)));
	const geojsonUrl = $derived(typeof location === 'undefined' ? '' : new URL(staticUrl('geo/countries_110m.geojson'), location.href).href);

	const mapTraces = $derived.by(() => {
		const top = (mm: Map<string, number>) =>
			[...mm.entries()]
				.sort((x, y) => y[1] - x[1])
				.slice(0, 3)
				.map(([k, v]) => `${esc(groupLabel(k))} ${v}`)
				.join(', ');
		return [
			{
				type: 'scattermap',
				lat: pins.map((q) => q.site.lat),
				lon: pins.map((q) => q.site.lon),
				mode: 'markers',
				marker: { size: 9, color: th.accent, opacity: 0.9 },
				cluster: { enabled: true, maxzoom: 14, color: th.accent, opacity: 0.85, size: [16, 22, 30, 38], step: [10, 40, 120] },
				hoverinfo: 'skip'
			},
			{
				type: 'scattermap',
				lat: siteSummary.map((r) => r.site.lat),
				lon: siteSummary.map((r) => r.site.lon),
				mode: 'markers',
				marker: { size: 18, color: th.accent, opacity: 0 },
				customdata: siteSummary.map((r) => {
					const labels = [...r.papers.values()];
					const pl = [...r.papers.entries()].map(([id, l]) => (labels.filter((x) => x === l).length > 1 ? `${l} (${id})` : l));
					return (
						`<b>${esc(r.site.org_name)}</b><br>${esc(r.site.locality || lab('country', r.site.country))} (${esc(r.site.precision)}, ${esc(r.site.source)}${r.site.source_ref ? ' ' + esc(r.site.source_ref) : ''})` +
						`<br>${r.authors.size} authors on ${pl.length} papers<br>${top(r.groups)}<br>` +
						pl.slice(0, 8).map(esc).join('<br>') +
						(pl.length > 8 ? `<br>+${pl.length - 8} more` : '')
					);
				}),
				hovertemplate: '%{customdata}<extra></extra>'
			}
		];
	});

	const mapLayout = $derived({
		uirevision: 'k-map',
		paper_bgcolor: 'rgba(0,0,0,0)',
		margin: { l: 0, r: 0, t: 0, b: 0 },
		font: { family: 'system-ui, sans-serif', size: 11, color: th.ink2 },
		showlegend: false,
		hovermode: 'closest',
		hoverlabel: { bgcolor: th.surface, bordercolor: th.line, font: { color: th.ink, size: 11 }, align: 'left' },
		map: {
			center: { lat: 28, lon: 15 },
			zoom: zoom0,
			style: {
				version: 8,
				sources: geojsonUrl ? { countries: { type: 'geojson', data: geojsonUrl } } : {},
				layers: [
					{ id: 'bg', type: 'background', paint: { 'background-color': th.surface } },
					...(geojsonUrl
						? [
								{ id: 'land', type: 'fill', source: 'countries', paint: { 'fill-color': th.grid } },
								{ id: 'borders', type: 'line', source: 'countries', paint: { 'line-color': th.line, 'line-width': 0.6 } }
							]
						: [])
				]
			}
		}
	});

	const regionData = $derived.by(() => {
		const years = [...new Set(view.papers.map((p) => p.year))].sort((x, y) => x - y);
		const counts = new Map<string, Map<number, number>>();
		for (const p of view.papers)
			for (const r of new Set(p.regions_derived)) {
				const m = counts.get(r) ?? new Map<number, number>();
				m.set(p.year, (m.get(p.year) ?? 0) + 1);
				counts.set(r, m);
			}
		const regions = REGION_ORDER.filter((r) => counts.has(r)).concat([...counts.keys()].filter((r) => !REGION_ORDER.includes(r)));
		return { years, regions, counts };
	});

	const regionTraces = $derived(
		regionData.regions.map((r) => ({
			type: 'bar',
			name: lab('region', r),
			x: regionData.years,
			y: regionData.years.map((y) => regionData.counts.get(r)?.get(y) ?? 0),
			marker: { color: regionColor(r, ui.theme), line: { color: th.surface, width: 2 } },
			hovertemplate: `${lab('region', r)}<br>%{x}: %{y} papers<extra></extra>`,
			textposition: 'none'
		}))
	);

	const regionLayout = $derived({
		barmode: 'stack',
		bargap: 0.35,
		paper_bgcolor: 'rgba(0,0,0,0)',
		plot_bgcolor: 'rgba(0,0,0,0)',
		margin: { l: 44, r: 8, t: 8, b: 8 },
		font: { family: 'system-ui, sans-serif', size: 11, color: th.ink2 },
		showlegend: true,
		legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 10, color: th.ink2 } },
		hoverlabel: { bgcolor: th.surface, bordercolor: th.line, font: { color: th.ink, size: 11 } },
		xaxis: { title: { text: 'Publication year', standoff: 4 }, tickformat: 'd', gridcolor: th.grid, linecolor: th.line, tickfont: { size: 10 }, automargin: true, zeroline: false },
		yaxis: { title: { text: 'Papers (count)', standoff: 4 }, gridcolor: th.grid, linecolor: th.line, tickfont: { size: 10 }, rangemode: 'tozero', tickformat: 'd', automargin: true, zeroline: false }
	});

	const narrow = $derived(w < 900);
</script>

<svelte:window bind:innerWidth={w} />

<Frame
	letter="k"
	desc="Geography at author level: one pin per author and printed affiliation (or per paper and institution site), placed at the institution site (Wikidata or OpenStreetMap coordinates; precision campus or city). Pins cluster when zoomed out and split when zoomed in (scroll to zoom, drag to pan, double-click to reset); hover a site for its papers. Right: papers per year by affiliation region."
	badge={`${pins.length} pins, ${nPapersLocated}/${view.papers.length} papers`}
	badgeTip="pins in the current filter; papers with at least one located affiliation / papers in the filter"
	height={narrow ? 660 : 480}
>
	{#snippet controls()}
		<span class="seg" title="Pin unit">
			<button class:on={unit === 'authors'} onclick={() => (unit = 'authors')} title="one pin per author and affiliation">authors</button><button class:on={unit === 'papers'} onclick={() => (unit = 'papers')} title="one pin per paper and institution site">papers</button>
		</span>
	{/snippet}
	<div class="geo" class:narrow>
		<div class="map" bind:clientWidth={mapW}>
			{#if sites.length}
				<Plot data={mapTraces} layout={mapLayout} config={{ scrollZoom: true }} />
				<span class="attr">Sites: Wikidata, &copy; OpenStreetMap contributors</span>
			{:else}
				<div class="msg muted">no located affiliations in this build</div>
			{/if}
		</div>
		<div class="reg"><Plot data={regionTraces} layout={regionLayout} /></div>
	</div>
</Frame>

<style>
	.geo {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		height: 100%;
	}
	.geo.narrow {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: 260px minmax(0, 1fr);
	}
	.map,
	.reg {
		min-width: 0;
		min-height: 0;
		position: relative;
	}
	.attr {
		position: absolute;
		left: 4px;
		bottom: 2px;
		font-size: 9px;
		color: var(--ink-3);
		pointer-events: none;
	}
	.msg {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
