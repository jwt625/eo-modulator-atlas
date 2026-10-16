<script lang="ts">
	// 1D plot group (COMSOL Line Graph, Global, Table Graph) drawn in the graphics window; series on the left or the
	// right y axis per feature.
	import LinePlot, { type OverlayPoint, type Series } from './LinePlot.svelte';
	import type { Workbench } from './workbench.svelte';
	import type { PlotGroup } from './results.svelte';
	import type { LineResult, PlotResult } from './post/contract';
	import { globalToUnit, METRIC_GLOBAL, prettyUnit, sweepValues } from './post/ui';
	import { splitTop } from './exprSplit';
	import { lineRequest, rfRequest } from './requests';
	import { oneDSolutions } from './solutions1d';
	import { store } from '../state.svelte';
	import { guessDeviceX, METRIC_DEVICE_COLUMN } from './sweepValues';

	let { wb, group, height = 360 }: { wb: Workbench; group: PlotGroup; height?: number } = $props();
	const R = $derived(wb.results);
	// Sweep-point solutions used by Line Graphs (cut lines) and RF Global features are computed on demand.
	$effect(() => {
		for (const f of group.features) {
			const p = f.type === 'linegraph' ? (R.cutLines.find((c) => c.id === f.dataset)?.point ?? -1) : f.type === 'global' && f.dataset === 'rf' ? group.point : -1;
			if (p >= 0) wb.ensurePoint(p);
		}
	});

	const out = $derived.by(() => {
		const series: Series[] = [];
		const points: OverlayPoint[] = [];
		const errs: string[] = [];
		let xLabel = '';
		const units: [Set<string>, Set<string>] = [new Set(), new Set()];
		const names: [string[], string[]] = [[], []];
		const push = (s: Series, unit: string, right: boolean) => {
			series.push({ ...s, y2: right });
			units[right ? 1 : 0].add(prettyUnit(unit));
			names[right ? 1 : 0].push(s.name);
		};
		for (const f of group.features) {
			if (!f.visible) continue;
			const right = f.yAxis === 'right';
			if (f.type === 'linegraph') {
				const cl = R.cutLines.find((c) => c.id === f.dataset);
				if (!cl) { errs.push(`${f.name}: choose a cut line dataset`); continue; }
				if (!f.expr.trim()) { errs.push(`${f.name}: empty expression`); continue; }
				if (cl.point >= 0 && wb.points[cl.point]?.status !== 'ready') { errs.push(`${f.name}: computing the fields of ${wb.solutionLabel(cl.point)}`); continue; }
				// G1: the cut line's own solution (Compute or a sweep point).
				const e = wb.cache.get<LineResult>(wb.post, R.gen, lineRequest(R, cl, f.expr, f.unit), `line:${f.id}`);
				if (e?.status === 'error') errs.push(`${f.name}: ${e.error}`);
				if (!e?.data) continue;
				xLabel = 'Arc length (µm)';
				push({ name: `${f.description || f.expr} (${prettyUnit(e.data.units[0])}) [${cl.name}]`, x: e.data.s, y: e.data.values[0] }, e.data.units[0], right);
			} else if (f.type === 'global') {
				const exprs = splitTop(f.exprs);
				if (f.dataset === 'rf') {
					if (group.point >= 0 && wb.points[group.point]?.status !== 'ready') { errs.push(`${f.name}: computing the fields of ${wb.solutionLabel(group.point)}`); continue; }
					if (!(group.point >= 0 ? wb.points[group.point]?.datasets : R.datasets)?.some((d) => d.kind === 'rf')) { errs.push(`${f.name}: no RF frequency sweep in ${wb.solutionLabel(group.point)}`); continue; }
					xLabel = 'Frequency (GHz)';
					exprs.forEach((ex, i) => {
						const e = wb.cache.get<PlotResult>(wb.post, R.gen, rfRequest(ex, f.unit, group.point), `rf:${f.id}:${i}`);
						if (e?.status === 'error') errs.push(`${f.name}: ${e.error}`);
						if (e?.data?.x) push({ name: `${ex} (${prettyUnit(e.data.unit)})`, x: e.data.x, y: e.data.values, markers: e.data.x.length <= 40 }, e.data.unit, right);
					});
				} else {
					const rows = wb.sweepRows.filter((r) => r.status === 'done' && r.globals);
					if (!rows.length) { errs.push(`${f.name}: no sweep results`); continue; }
					xLabel = wb.axisLabel(wb.sweepAxis);
					for (const ex of exprs) {
						try {
							const ys = sweepValues(ex, rows.map((r) => r.globals), f.unit);
							push({ name: `${ex} (${prettyUnit(ys.unit)})`, x: rows.map((r) => r.value), y: ys.values, markers: true }, ys.unit, right);
							// Paper points: the study's sweep targets of the quantity this expression names (display unit).
							const metric = Object.entries(METRIC_GLOBAL).find(([, v]) => v[0] === ex.trim());
							const before = points.length;
							if (metric) {
								const [key, [name, k]] = metric;
								const fac = globalToUnit(name, ys.unit);
								const axisKey = wb.sweepAxis.replace(/^params\.([^.]+)\.value$/, '$1');
								for (const t of wb.sweepTargets.filter((t) => t.metric === key && Number.isFinite(t.at[axisKey])))
									points.push({ x: t.at[axisKey], y: t.value * k * fac, label: t.label, detail: `sweep target ${t.metric} = ${t.value} at ${axisKey} = ${t.at[axisKey]}` });
							}
							// No study targets: atlas device columns of this paper (Parametric Sweep page selectors; no unit conversion).
							if (points.length === before) {
								const ox = wb.overlayX || guessDeviceX(wb.sweepAxis) || '';
								const oy = wb.overlayY || (metric ? METRIC_DEVICE_COLUMN[metric[0]] : '') || '';
								if (ox && oy)
									for (const d of (store.atlas?.devices ?? []).filter((d) => d.paper_id === wb.raw?.paper_id))
										if (typeof d[ox] === 'number' && typeof d[oy] === 'number') points.push({ x: d[ox] as number, y: d[oy] as number, label: d.device_id, detail: `atlas ${ox} ${d[ox]}, ${oy} ${d[oy]} (column units, not converted)` });
							}
						} catch (e) { errs.push(`${f.name}: ${e instanceof Error ? e.message : e}`); }
					}
				}
			} else if (f.type === 'tablegraph') {
				const t = R.tables.find((x) => x.id === f.tableId);
				if (!t) { errs.push(`${f.name}: choose a table`); continue; }
				const xi = t.columns.indexOf(f.xCol);
				const ys = f.yCols.split('|').filter(Boolean).map((c) => t.columns.indexOf(c)).filter((i) => i >= 0);
				if (!ys.length) { errs.push(`${f.name}: choose y columns`); continue; }
				const ok = t.rows.map((r) => (xi >= 0 ? typeof r[xi] === 'number' : true));
				const xs = t.rows.map((r, i) => (xi >= 0 ? Number(r[xi]) : i + 1)).filter((_, i) => ok[i]);
				xLabel = xi >= 0 ? f.xCol : 'Row';
				for (const yi of ys) {
					const unit = /\(([^()]*)\)$/.exec(t.columns[yi])?.[1] ?? '';
					push({ name: `${t.name}: ${t.columns[yi]}`, x: xs, y: t.rows.filter((_, i) => ok[i]).map((r) => (typeof r[yi] === 'number' ? (r[yi] as number) : NaN)), markers: true }, unit, right);
				}
			}
		}
		const label = (k: 0 | 1) => (names[k].length === 1 ? names[k][0].replace(/ \[.*\]$/, '') : units[k].size === 1 ? `(${[...units[k]][0]})` : [...units[k]].map((u) => `(${u})`).join(', '));
		const so = oneDSolutions(wb, group);
		return { series, points, errs, xLabel, yLabel: label(0), y2Label: label(1), sols: so.labels.join('; '), tag: so.tag };
	});
</script>

<div class="p1" data-series={out.series.length}>
	{#if group.titleMode !== 'none'}<div class="t">{group.titleMode === 'custom' ? group.title : group.name}</div>{/if}
	<div class="sol" data-solution-label={out.sols || 'none'}>Solution: {out.sols || 'none (no features)'}</div>
	<LinePlot series={out.series} points={out.points} pointsName="paper" xLabel={out.xLabel} yLabel={out.yLabel} y2Label={out.y2Label} bind:logX={group.logX} bind:logY={group.logY} ariaLabel="1D plot group {group.name}" height={Math.max(160, height - (group.titleMode !== 'none' ? 20 : 0) - 26 - out.errs.length * 18)} filename="{wb.raw?.id ?? 'sim'}-{group.name.replace(/[^\w.-]+/g, '_')}{out.tag ? `-${out.tag}` : ''}" csvNote="Solution: {out.sols || 'none'}" />
	{#each out.errs as e}<p class="err">{e}</p>{/each}
	{#if !group.features.length}<p class="muted">No plot features. Add a Line Graph, Global or Table Graph to this plot group.</p>{/if}
</div>

<style>
	.p1 { min-width: 0; }
	.t { font-size: 12px; color: var(--ink); }
	.sol { font-size: 11px; color: var(--ink-3); margin-bottom: 4px; }
	.err { color: var(--crit); font-size: 11px; margin: 4px 0; }
	p { margin: 4px 0; }
</style>
