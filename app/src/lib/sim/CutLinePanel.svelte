<script lang="ts">
	import type { Workbench } from './workbench.svelte';
	import LinePlot from './LinePlot.svelte';
	import { viewSpec } from './fieldsView';
	import { indexFor, sampleLine, triToNode } from './fieldmath';
	import type { ScalarField } from './types';

	let { wb }: { wb: Workbench } = $props();
	const spec = $derived(viewSpec(wb.quantity, wb.fields, wb.mesh, wb.modeIndex, wb.opticalSet));
	const field: ScalarField | null = $derived(spec.field && wb.smooth && spec.field.at === 'tri' ? { ...spec.field, values: triToNode(spec.field.mesh, spec.field.values), at: 'node', label: `${spec.field.label.replace(' (per element)', '')} (smoothed)` } : spec.field);
	const sample = $derived.by(() => {
		const c = wb.cutLine;
		if (!c || !field) return null;
		return sampleLine(field, indexFor(field.mesh), c.ax, c.ay, c.bx, c.by, 500);
	});
	const valid = $derived(sample ? sample.v.filter(Number.isFinite).length : 0);

	function setCoord(k: 'ax' | 'ay' | 'bx' | 'by', v: string) {
		const n = Number(v);
		if (wb.cutLine && Number.isFinite(n)) wb.cutLine = { ...wb.cutLine, [k]: n };
	}
</script>

<div class="row">
	<button class:on={wb.cutTool} aria-pressed={wb.cutTool} onclick={() => (wb.cutTool = !wb.cutTool)} title="Then drag on the graphics canvas">Draw cut line</button>
	{#if wb.cutLine}<button onclick={() => (wb.cutLine = null)}>Clear</button>{/if}
</div>
{#if wb.cutLine}
	<div class="coords">
		{#each [['ax', 'start x'], ['ay', 'start y'], ['bx', 'end x'], ['by', 'end y']] as [k, label]}
			<label title="µm">{label}<input type="number" step="any" value={Number(wb.cutLine[k as 'ax'].toPrecision(6))} onchange={(e) => setCoord(k as 'ax', e.currentTarget.value)} /></label>
		{/each}
	</div>
	{#if sample && field}
		<LinePlot series={[{ name: `${field.label} (${field.unit})`, x: sample.s, y: sample.v }]} xLabel="Arc length (µm)" yLabel="{field.label} ({field.unit})" ariaLabel="Cut line plot" height={240}
			filename="{wb.raw?.id ?? 'sim'}-cutline-{wb.quantity.replace(':', '-')}" />
		<p class="muted small" data-cut-valid={valid}>{valid} of {sample.v.length} samples inside the {spec.esMesh ? 'electrostatic' : 'optical'} mesh; gaps are electrodes or outside the solved domain.{field.at === 'tri' ? ' Element fields are piecewise constant.' : ''}{field.label.endsWith('(smoothed)') ? ' Smoothed: area-weighted nodal average, display only.' : ''}{field.note === 'P2' ? ' P2: potential evaluated quadratically, field linear per element.' : ''}</p>
	{:else}
		<p class="muted">Choose a field quantity in the graphics window to sample it.</p>
	{/if}
{:else}
	<p class="muted">No cut line. Press Draw cut line (or Cut line in the graphics toolbar), then drag across the canvas.</p>
{/if}

<style>
	.row { display: flex; gap: 6px; margin-bottom: 6px; }
	button { border-radius: 0; }
	.coords { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; margin-bottom: 6px; }
	.coords label { display: grid; grid-template-columns: 50px minmax(0, 1fr); align-items: center; gap: 4px; color: var(--ink-2); }
	.coords input { width: 100%; height: 22px; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; border-radius: 0; }
	p { margin: 6px 0; line-height: 1.5; }
	.small { font-size: 11px; }
</style>
