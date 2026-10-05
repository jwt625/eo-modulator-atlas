<script lang="ts">
	import { onMount } from 'svelte';
	import Frame from './Frame.svelte';
	import Plot from './Plot.svelte';
	import { store, ui } from './state.svelte';
	import { REGION_ORDER, materialGroup, plotTheme, regionColor } from './colors';
	import { staticUrl } from './paths';
	import { clusterPoints } from './geo';
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

	const nAuthors = $derived(new Set(pins.map((q) => `${q.paper}|${q.author}`)).size);
	const nPapersLocated = $derived(view.papers.filter((p) => (p.affil ?? []).length).length);

	/** Per-site aggregate of the pins in the current unit mode. */
	const siteSummary = $derived.by(() => {
		const m = new Map<number, { site: Site; n: number; papers: Map<string, string>; authors: Set<string>; authorPapers: Set<string>; groups: Map<string, number> }>();
		for (const q of pins) {
			const r = m.get(q.site.id) ?? { site: q.site, n: 0, papers: new Map(), authors: new Set(), authorPapers: new Set(), groups: new Map() };
			r.n += 1;
			if (!r.papers.has(q.paper)) r.groups.set(q.group, (r.groups.get(q.group) ?? 0) + 1);
			r.papers.set(q.paper, q.label);
			r.authors.add(q.author);
			r.authorPapers.add(`${q.paper}|${q.author}`);
			m.set(q.site.id, r);
		}
		return [...m.values()];
	});

	const zoom0 = $derived(Math.max(-1, Math.log2(Math.max(mapW, 200) / 512)));
	/** Current map zoom (from user zoom/pan); clusters are recomputed for it. */
	let zoom = $state<number | null>(null);
	function onrelayout(e: any) {
		if (e && typeof e['map.zoom'] === 'number') zoom = e['map.zoom'];
		else if (e && e['map.zoom'] === undefined && e.map?.zoom !== undefined) zoom = e.map.zoom;
	}
	const clusters = $derived(clusterPoints(siteSummary.map((r) => ({ lon: r.site.lon, lat: r.site.lat, w: r.papers.size, item: r })), zoom ?? zoom0));

	const absUrl = (f: string) => (typeof location === 'undefined' ? '' : new URL(staticUrl(f), location.href).href);
	const geo = $derived({ c110: absUrl('geo/countries_110m.geojson'), c50: absUrl('geo/countries_50m.geojson'), s50: absUrl('geo/subunits_50m.geojson'), roads: absUrl('geo/roads_major.geojson'), minorA: absUrl('geo/roads_minor_a.geojson'), minorB: absUrl('geo/roads_minor_b.geojson') });
	const FINE_ZOOM = 3;
	const ROAD_ZOOM = 4.5;
	/** minor-road tiers (Natural Earth min_zoom <= 6, > 6) */
	const MINOR_A_ZOOM = 5.5;
	const MINOR_B_ZOOM = 6.5;
	const zEff = $derived(zoom ?? zoom0);

	/** Natural Earth labels (countries: [name, lon, lat, min_label]; places: [name, lon, lat, min_zoom]). */
	type Label = [string, number, number, number];
	let labels = $state<{ countries: Label[]; places: Label[] } | null>(null);
	onMount(() => {
		fetch(staticUrl('geo/labels.json'))
			.then((r) => (r.ok ? r.json() : null))
			.then((j) => (labels = j))
			.catch(() => (labels = null));
	});
	// Natural Earth zooms refer to 256 px tiles; this map uses 512 px tiles (NE zoom ~ map zoom + 1).
	const countryLabels = $derived(labels && zEff <= 7 ? labels.countries.filter((c) => c[3] <= zEff + 2) : []);
	const placeLabels = $derived(labels ? labels.places.filter((p) => p[3] <= zEff + 1) : []);

	const paperGroup = $derived(new Map(pins.map((q) => [q.paper, q.group])));

	const mapTraces = $derived.by(() => {
		const topGroups = (mm: Map<string, number>) =>
			[...mm.entries()]
				.sort((x, y) => y[1] - x[1])
				.slice(0, 3)
				.map(([k, v]) => `${esc(groupLabel(k))} ${v}`)
				.join(', ');
		const pl_ = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
		const where = (si: Site) => esc(si.locality || `city not printed, ${lab('country', si.country)}`);
		const hover = clusters.map((c) => {
			const pinsN = c.items.reduce((t, r) => t + r.n, 0);
			const people = new Set(c.items.flatMap((r) => [...r.authorPapers])).size;
			if (c.items.length === 1) {
				const r = c.items[0];
				const labels = [...r.papers.values()];
				const pl = [...r.papers.entries()].map(([id, l]) => (labels.filter((x) => x === l).length > 1 ? `${l} (${id})` : l));
				return (
					`<b>${esc(r.site.org_name)}</b><br>${where(r.site)} (${esc(r.site.precision)}, ${esc(r.site.source)}${r.site.source_ref ? ' ' + esc(r.site.source_ref) : ''})` +
					`<br>${pl_(r.authors.size, 'author')} on ${pl_(pl.length, 'paper')}; ${topGroups(r.groups)}<br>` +
					pl.slice(0, 10).map(esc).join('<br>') +
					(pl.length > 10 ? `<br>+${pl_(pl.length - 10, 'more paper')}` : '')
				);
			}
			const papers = new Set(c.items.flatMap((r) => [...r.papers.keys()]));
			// material mix over distinct papers (a paper with authors at several sites counts once)
			const groups = new Map<string, number>();
			for (const pid of papers) {
				const g = paperGroup.get(pid) ?? 'other_group';
				groups.set(g, (groups.get(g) ?? 0) + 1);
			}
			const ranked = [...c.items].sort((x, y) => y.papers.size - x.papers.size || y.authors.size - x.authors.size || x.site.org_name.localeCompare(y.site.org_name));
			return (
				`<b>${pl_(c.items.length, 'site')}, ${pl_(papers.size, 'paper')}, ${unit === 'authors' ? `${pl_(people, 'author')} (${pl_(pinsN, 'affiliation')})` : pl_(pinsN, 'paper-site pair')}</b><br>${topGroups(groups)}<br><br><b>Top sites by papers</b><br>` +
				ranked
					.slice(0, 5)
					.map((r) => `${esc(r.site.org_name)} (${where(r.site)}): ${pl_(r.papers.size, 'paper')}, ${pl_(r.authors.size, 'author')}`)
					.join('<br>') +
				(ranked.length > 5 ? `<br>+${pl_(ranked.length - 5, 'more site')}; zoom in to split` : '')
			);
		});
		// bubble label: distinct authors per paper (authors mode) or distinct papers (papers mode), not affiliation pins
		const n = clusters.map((c) => (unit === 'authors' ? new Set(c.items.flatMap((r) => [...r.authorPapers])).size : new Set(c.items.flatMap((r) => [...r.papers.keys()])).size));
		return [
			{
				type: 'scattermap',
				lat: countryLabels.map((c) => c[2]),
				lon: countryLabels.map((c) => c[1]),
				mode: 'text',
				text: countryLabels.map((c) => c[0]),
				textfont: { size: 11, color: th.muted },
				hoverinfo: 'skip'
			},
			{
				type: 'scattermap',
				lat: placeLabels.map((p) => p[2]),
				lon: placeLabels.map((p) => p[1]),
				mode: 'markers+text',
				text: placeLabels.map((p) => p[0]),
				textposition: 'top right',
				textfont: { size: 10, color: th.ink2 },
				marker: { size: 4, color: th.ink2, opacity: 0.8 },
				hoverinfo: 'skip'
			},
			{
				type: 'scattermap',
				lat: clusters.map((c) => c.lat),
				lon: clusters.map((c) => c.lon),
				mode: 'markers+text',
				text: n.map(String),
				textfont: { size: 10, color: '#ffffff' },
				marker: { size: n.map((v) => Math.min(46, 11 + 3.2 * Math.sqrt(v))), color: th.accent, opacity: 0.85 },
				customdata: hover,
				hovertemplate: '%{customdata}<extra></extra>'
			}
		];
	});

	const mapStyle = $derived({
		version: 8,
		sources: geo.c110
			? {
					c110: { type: 'geojson', data: geo.c110 },
					c50: { type: 'geojson', data: geo.c50 },
					s50: { type: 'geojson', data: geo.s50 }
				}
			: {},
		layers: [
			{ id: 'bg', type: 'background', paint: { 'background-color': th.surface } },
			...(geo.c110
				? [
						// coarse outlines when zoomed out, 1:50m outlines plus state/province borders when zoomed in
						{ id: 'land110', type: 'fill', source: 'c110', maxzoom: FINE_ZOOM, paint: { 'fill-color': th.grid } },
						{ id: 'borders110', type: 'line', source: 'c110', maxzoom: FINE_ZOOM, paint: { 'line-color': th.line, 'line-width': 0.6 } },
						{ id: 'land50', type: 'fill', source: 'c50', minzoom: FINE_ZOOM, paint: { 'fill-color': th.grid } },
						{ id: 'sub50', type: 'line', source: 's50', minzoom: FINE_ZOOM, paint: { 'line-color': th.line, 'line-width': 0.5, 'line-dasharray': [2, 2] } },
						{ id: 'borders50', type: 'line', source: 'c50', minzoom: FINE_ZOOM, paint: { 'line-color': th.line, 'line-width': 0.8 } }
					]
				: [])
		]
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
			style: mapStyle,
			// Natural Earth roads in three tiers; each layer (and its file) is added only once zoomed in that far
			layers: [
				{
					sourcetype: 'geojson',
					source: geo.minorB,
					type: 'line',
					color: th.muted,
					opacity: 0.3,
					line: { width: 0.5 },
					minzoom: MINOR_B_ZOOM,
					below: 'traces',
					visible: zEff >= MINOR_B_ZOOM && !!geo.minorB
				},
				{
					sourcetype: 'geojson',
					source: geo.minorA,
					type: 'line',
					color: th.muted,
					opacity: 0.4,
					line: { width: 0.7 },
					minzoom: MINOR_A_ZOOM,
					below: 'traces',
					visible: zEff >= MINOR_A_ZOOM && !!geo.minorA
				},
				{
					sourcetype: 'geojson',
					source: geo.roads,
					type: 'line',
					color: th.muted,
					opacity: 0.55,
					line: { width: 1 },
					minzoom: ROAD_ZOOM,
					below: 'traces',
					visible: zEff >= ROAD_ZOOM && !!geo.roads
				}
			]
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
	desc="Geography at author level: one pin per author and printed affiliation (or per paper and institution site), placed at the institution site (Wikidata or OpenStreetMap coordinates; precision campus or city). Sites cluster when zoomed out and split when zoomed in (scroll to zoom, drag to pan, double-click to reset); bubble label = distinct authors per paper (authors mode) or papers (papers mode); an author with two affiliations counts once in the label and twice as affiliations; hover a cluster for its top 5 sites by papers, or a single site for its papers. Country outlines refine from 1:110m to 1:50m with state/province borders at zoom 3; country and city labels appear by Natural Earth label zoom; major roads from zoom 4.5, secondary and other roads from zoom 5.5 and 6.5 (Natural Earth 1:10m; no city streets). Right: papers per year by affiliation region."
	badge={unit === 'authors' ? `${nAuthors} authors, ${pins.length} affiliations, ${nPapersLocated}/${view.papers.length} papers` : `${pins.length} paper-site pairs, ${nPapersLocated}/${view.papers.length} papers`}
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
				<Plot data={mapTraces} layout={mapLayout} config={{ scrollZoom: true }} {onrelayout} />
				<span class="attr">Sites: Wikidata, &copy; OpenStreetMap contributors; basemap labels and roads: Natural Earth</span>
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
