<script lang="ts">
	// RF line frequency sweep of a sweep-point solution (engine `rf` dataset of that point): attenuation, RF index, Re Z0.
	import type { Workbench } from './workbench.svelte';
	import type { PlotResult } from './post/contract';
	import { rfRequest } from './requests';
	import LinePlot from './LinePlot.svelte';

	let { wb, point }: { wb: Workbench; point: number } = $props();
	const R = $derived(wb.results);
	const ready = $derived(wb.points[point]?.status === 'ready');
	const hasRf = $derived((wb.points[point]?.datasets ?? []).some((d) => d.kind === 'rf'));
	const ROWS = [['rf.alpha_dB', 'dB/cm', 'α (dB/cm)'], ['rf.nRF', '1', 'n RF'], ['real(rf.Z0)', 'ohm', 'Re Z₀ (Ω)']] as const;
	const data = $derived(ready && hasRf ? ROWS.map(([e, u]) => wb.cache.get<PlotResult>(wb.post, R.gen, rfRequest(e, u, point))) : []);
</script>

{#if !ready}<p class="muted small">Computing the fields of {wb.solutionLabel(point)}.</p>
{:else if !hasRf}<p class="muted">No RF line in {wb.solutionLabel(point)}. The sweep ran without the RF line stage.</p>
{:else}
	{#each ROWS as r, i}
		{@const e = data[i]}
		{#if e?.status === 'error'}<p class="err small">{r[0]}: {e.error}</p>{/if}
		{#if e?.data?.x}<LinePlot series={[{ name: r[2], x: e.data.x, y: e.data.values, markers: e.data.x.length <= 40 }]} xLabel="Frequency (GHz)" yLabel={r[2]} height={170} ariaLabel="RF sweep {r[2]} point {point + 1}" filename="{wb.raw?.id ?? 'sim'}-rf-p{point + 1}-{i}" csvNote="Solution: {wb.solutionLabel(point)}" />{/if}
	{/each}
{/if}

<style>
	p { margin: 6px 0; }
	.small { font-size: 11px; }
	.err { color: var(--crit); }
</style>
