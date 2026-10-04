<script lang="ts">
	import Frame from './Frame.svelte';
	import Plot from './Plot.svelte';
	import { store, ui } from './state.svelte';
	import { REGION_ORDER, materialGroup, plotTheme, regionColor } from './colors';
	import { CENTROIDS } from './geo-centroids';
	import { enumLabel, type View } from './logic';

	let { view }: { view: View } = $props();
	let metric = $state<'papers' | 'devices'>('papers');
	let w = $state(1200);

	const th = $derived(plotTheme(ui.theme));
	const a = $derived(store.atlas);
	const lab = (en: string, v: string) => (a ? enumLabel(a, en, v) : v);
	const groupLabel = (g: string) => (g === 'other_group' ? 'Other EO materials' : lab('eo_material', g));

	interface CountryRow {
		code: string;
		papers: number;
		devices: number;
		groups: Map<string, number>;
		orgs: Map<string, number>;
	}

	const rows = $derived.by(() => {
		const m = new Map<string, CountryRow>();
		const row = (c: string) => {
			let r = m.get(c);
			if (!r) m.set(c, (r = { code: c, papers: 0, devices: 0, groups: new Map(), orgs: new Map() }));
			return r;
		};
		const devsByPaper = new Map<string, number>();
		for (const d of view.devices) devsByPaper.set(d.paper_id, (devsByPaper.get(d.paper_id) ?? 0) + 1);
		for (const p of view.papers) {
			const rep = view.reps.get(p.paper_id);
			const g = rep ? materialGroup(rep.eo_material) : null;
			for (const c of new Set(p.countries_derived)) {
				const r = row(c);
				r.papers += 1;
				r.devices += devsByPaper.get(p.paper_id) ?? 0;
				if (g) r.groups.set(g, (r.groups.get(g) ?? 0) + 1);
				for (const o of p.orgs_affil) if (o.country === c) r.orgs.set(o.org_name, (r.orgs.get(o.org_name) ?? 0) + 1);
			}
		}
		return [...m.values()].filter((r) => CENTROIDS[r.code]).sort((x, y) => y.papers - x.papers);
	});

	const top = (mm: Map<string, number>, n: number, f: (k: string) => string = (k) => k) =>
		[...mm.entries()]
			.sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
			.slice(0, n)
			.map(([k, v]) => `${f(k)} ${v}`)
			.join('<br>');

	const mapTraces = $derived.by(() => {
		const v = rows.map((r) => (metric === 'papers' ? r.papers : r.devices));
		const vmax = Math.max(1, ...v);
		return [
			{
				type: 'scattergeo',
				lon: rows.map((r) => CENTROIDS[r.code][0]),
				lat: rows.map((r) => CENTROIDS[r.code][1]),
				mode: 'markers+text',
				text: v.map(String),
				textposition: 'middle center',
				textfont: { size: 9, color: th.ink },
				marker: {
					size: v,
					sizemode: 'area',
					sizeref: (2 * vmax) / 46 ** 2,
					sizemin: 4,
					color: th.accent,
					opacity: 0.55,
					line: { color: th.surface, width: 2 }
				},
				customdata: rows.map(
					(r) =>
						`<b>${lab('country', r.code)}</b><br>${r.papers} papers, ${r.devices} devices<br><br><b>EO material</b> (papers)<br>${top(r.groups, 4, groupLabel)}<br><br><b>Affiliated organizations</b> (papers)<br>${top(r.orgs, 4)}`
				),
				hovertemplate: '%{customdata}<extra></extra>'
			}
		];
	});

	const mapLayout = $derived({
		paper_bgcolor: 'rgba(0,0,0,0)',
		margin: { l: 0, r: 0, t: 0, b: 0 },
		font: { family: 'system-ui, sans-serif', size: 11, color: th.ink2 },
		showlegend: false,
		dragmode: 'pan',
		hoverlabel: { bgcolor: th.surface, bordercolor: th.line, font: { color: th.ink, size: 11 }, align: 'left' },
		geo: {
			projection: { type: 'natural earth' },
			showframe: false,
			showcoastlines: false,
			showland: true,
			landcolor: th.grid,
			showcountries: true,
			countrycolor: th.line,
			countrywidth: 0.5,
			showocean: false,
			showlakes: false,
			bgcolor: 'rgba(0,0,0,0)',
			lataxis: { range: [-50, 75] },
			lonaxis: { range: [-170, 180] }
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
	desc="Geography: bubble area = papers (or device rows) with an affiliation in each country, at the country centroid; right: papers per year by affiliation region. Countries and regions come from the affiliation list; a multi-country paper counts once in each country and each region."
	badge={`${rows.length}`}
	badgeTip="countries in the current filter"
	height={narrow ? 660 : 440}
>
	{#snippet controls()}
		<span class="seg" title="Bubble size">
			<button class:on={metric === 'papers'} onclick={() => (metric = 'papers')}>papers</button><button class:on={metric === 'devices'} onclick={() => (metric = 'devices')}>devices</button>
		</span>
	{/snippet}
	<div class="geo" class:narrow>
		<div class="map"><Plot data={mapTraces} layout={mapLayout} /></div>
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
		grid-template-rows: 230px minmax(0, 1fr);
	}
	.map,
	.reg {
		min-width: 0;
		min-height: 0;
	}
</style>
