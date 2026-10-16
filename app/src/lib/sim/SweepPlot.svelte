<script lang="ts">
	import type { Workbench } from './workbench.svelte';
	import type { OverlayPoint } from './LinePlot.svelte';
	import { store } from '../state.svelte';
	import { METRIC_LABELS } from './labels';
	import { guessDeviceX, METRIC_DEVICE_COLUMN } from './sweepValues';
	import { downloadText, toCsv } from './exportUtil';
	import { fmt } from '../logic';

	let { wb }: { wb: Workbench } = $props();
	const done = $derived(wb.sweepRows.filter((r) => r.status === 'done' && r.metrics));
	const metrics = $derived([...new Set(done.flatMap((r) => Object.keys(r.metrics!)))]);
	const metric = $derived(metrics.includes(wb.sweepMetric) ? wb.sweepMetric : metrics[0] ?? '');
	const devices = $derived((store.atlas?.devices ?? []).filter((d) => d.paper_id === wb.raw?.paper_id));
	const numericCols = $derived.by(() => {
		const cols = new Set<string>();
		for (const d of devices) for (const [k, v] of Object.entries(d)) if (typeof v === 'number' && Number.isFinite(v)) cols.add(k);
		return [...cols].sort();
	});
	const ox = $derived(wb.overlayX || guessDeviceX(wb.sweepAxis) || '');
	const oy = $derived(wb.overlayY || METRIC_DEVICE_COLUMN[metric] || '');
	// Study sweep targets (config `sweep_targets`, with their source device_id) for the plotted metric.
	const axisKey = $derived(wb.sweepAxis.replace(/^params\.([^.]+)\.value$/, '$1'));
	const targetPoints: OverlayPoint[] = $derived(
		wb.sweepTargets.filter((t) => t.metric === metric && Number.isFinite(t.at[axisKey])).map((t) => ({ x: t.at[axisKey], y: t.value, label: t.label, detail: `sweep target ${t.metric} = ${t.value} at ${axisKey} = ${t.at[axisKey]}` }))
	);
	const devicePoints: OverlayPoint[] = $derived(
		ox && oy && !targetPoints.length
			? devices.filter((d) => typeof d[ox] === 'number' && typeof d[oy] === 'number').map((d) => ({ x: d[ox] as number, y: d[oy] as number, label: d.device_id, detail: `atlas ${ox} ${d[ox]}, ${oy} ${d[oy]}${d.vpi_convention ? `, ${d.vpi_convention}` : ''}` }))
			: []
	);
	const points = $derived([...targetPoints, ...devicePoints]);
	const ml = $derived(METRIC_LABELS[metric]);
	const yLabel = $derived(ml ? `${ml[0]}${ml[1] ? ` (${ml[1]})` : ''}` : metric);

	const axes = $derived(wb.sweepAxes);
	const mHead = (m: string) => (METRIC_LABELS[m] ? `${METRIC_LABELS[m][0]}${METRIC_LABELS[m][1] ? ` (${METRIC_LABELS[m][1]})` : ''}` : m);

	function openPlot() {
		const R = wb.results;
		let g = R.groups.find((x) => x.auto === 'sweep');
		if (!g) {
			R.defaults((ds, v) => wb.has(ds, v), { rf: false, sweep: wb.sweepRows.find((r) => r.globals)?.globals ?? null, sweepMetric: wb.sweepMetricGlobal });
			g = R.groups.find((x) => x.auto === 'sweep');
		}
		if (g) {
			wb.view = g.id;
			wb.node = `pg:${g.id}`;
		}
	}
	// U8: one column per swept axis, metric columns with units.
	function exportCsv() {
		downloadText(`${wb.raw?.id ?? 'sim'}-sweep.csv`, toCsv(['index', ...axes.map((a) => wb.axisLabel(a)), 'status', 'error', 'ms', ...metrics.map((m) => `${m}${METRIC_LABELS[m]?.[1] ? ` (${METRIC_LABELS[m][1]})` : ''}`)],
			wb.sweepRows.map((r) => [r.index, ...axes.map((a) => r.values[a]), r.status, r.error ?? '', r.ms ?? '', ...metrics.map((m) => r.metrics?.[m] ?? '')])));
	}
</script>

{#if !wb.sweepRows.length}
	<p class="muted">No sweep results. Define and run a sweep under Study, Parametric Sweep.</p>
{:else}
	{#if wb.sweepStale}<p class="notice" data-sweep-stale>Inputs changed since this sweep ran; the points belong to the previous inputs.</p>{/if}
	<p class="muted small">The sweep plot is the 1D plot group Sweep (Global feature of the points' global values, with the paper points). <button class="link" onclick={openPlot}>Show it</button></p>
	<div class="sel">
		<label class:off={targetPoints.length > 0} data-tip="{targetPoints.length ? 'Not used: the study sweep targets are plotted. ' : ''}Device column plotted on x for the paper points ({devices.length} devices of {wb.raw?.paper_id ?? 'this paper'})">paper x <select aria-label="Paper x column" value={ox} onchange={(e) => (wb.overlayX = e.currentTarget.value)}><option value="">none</option>{#each numericCols as c}<option value={c}>{c}</option>{/each}</select></label>
		<label class:off={targetPoints.length > 0} data-tip="{targetPoints.length ? 'Not used: the study sweep targets are plotted. ' : ''}Device column plotted on y for the paper points">paper y <select aria-label="Paper y column" value={oy} onchange={(e) => (wb.overlayY = e.currentTarget.value)}><option value="">none</option>{#each numericCols as c}<option value={c}>{c}</option>{/each}</select></label>
	</div>
	<p class="muted small" data-paper-points={points.length}>{#if targetPoints.length}Paper points: the study's sweep targets for {metric} ({targetPoints.length}).{:else if !devices.length}No atlas devices for paper {wb.raw?.paper_id ?? 'of this config'}.{:else}Paper points: atlas device columns <span class="mono">{ox || 'none'}</span> vs <span class="mono">{oy || 'none'}</span> (check units and Vpi convention against the swept quantity).{/if} Hover a marker for its device_id.</p>
	<div class="line"><span class="muted small">{done.length} of {wb.sweepRows.length} points done{wb.sweepRunning ? ', running' : ''}</span><span class="grow"></span>{#if wb.sweepRunning}<button onclick={() => wb.cancelSweep()} data-tip="Stop the sweep; finished points are kept">Cancel sweep</button>{/if}<button onclick={exportCsv} data-tip="Download all sweep points as CSV (one column per swept axis)">CSV</button></div>
	<div class="scroll"><table class="grid"><thead><tr>{#each axes as a}<th>{wb.axisLabel(a)}</th>{/each}{#each metrics as m}<th data-tip={m}>{mHead(m)}</th>{/each}</tr></thead><tbody>
		{#each wb.sweepRows as r}<tr>{#each axes as a}<td class="num">{fmt(r.values[a], 6)}</td>{/each}{#each metrics as m}<td class="num">{r.metrics ? fmt(r.metrics[m], 5) : r.status}</td>{/each}</tr>{/each}
	</tbody></table></div>
{/if}

<style>
	.sel { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-bottom: 4px; }
	.sel label { display: flex; align-items: center; gap: 4px; color: var(--ink-2); }
	.sel label.off { opacity: 0.5; }
	.link { border: 0; background: none; padding: 0; height: auto; color: var(--accent); border-radius: 0; }
	.sel select { max-width: 150px; height: 22px; border-radius: 0; }
	.line { display: flex; align-items: center; gap: 8px; }
	.grow { flex: 1; }
	button { border-radius: 0; height: 22px; }
	.scroll { overflow: auto; }
	.grid { width: 100%; border-collapse: collapse; }
	.grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
	.grid th { color: var(--ink-3); font-weight: 500; }
	p { margin: 4px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.notice { color: var(--warn); }
</style>
