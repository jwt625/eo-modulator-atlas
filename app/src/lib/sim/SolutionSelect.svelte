<script lang="ts">
	// Parameter value of a view (COMSOL Data section): the last Compute or a finished sweep point; the label states the
	// solution with its parameter values, and a sweep point's fields are computed on first use (2 kept).
	import type { Workbench } from './workbench.svelte';

	let { wb, value, label = 'Parameter value', onchange }: { wb: Workbench; value: number; label?: string; onchange: (p: number) => void } = $props();
	const done = $derived(wb.sweepRows.filter((r) => r.status === 'done'));
	const st = $derived(value >= 0 ? (wb.points[value]?.status ?? 'none') : 'ready');
	$effect(() => {
		if (value >= 0 && wb.sweepJobs.length) wb.ensurePoint(value);
	});
</script>

<label class="f" data-tip="Solution this view evaluates: the last Compute, or the field solution of a sweep point (recomputed on first use; 2 kept)">{label}
	<select aria-label={label} value={String(value)} onchange={(e) => onchange(Number(e.currentTarget.value))}>
		<option value="-1">{wb.solutionLabel(-1)}</option>
		{#each done as r}<option value={String(r.index)}>{wb.solutionLabel(r.index)}</option>{/each}
	</select>
</label>
<p class="sol" data-solution-label={wb.solutionLabel(value)} data-point-status={st}>Solution: {wb.solutionLabel(value)}{st === 'loading' ? '; computing its fields' : st === 'error' ? `; ${wb.points[value]?.error ?? 'not available'}` : ''}</p>

<style>
	.f { display: grid; grid-template-columns: minmax(84px, 36%) minmax(0, 1fr); align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
	.f select { width: 100%; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; }
	.sol { margin: 2px 0 6px; font-size: 11px; color: var(--ink-3); overflow-wrap: anywhere; }
</style>
