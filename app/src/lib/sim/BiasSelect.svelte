<script lang="ts">
	// Bias point of a view on a semiconductor dataset (COMSOL: Parameter value of a parametric solution; DevLog-042).
	// The stage solves every bias of `semiconductor.bias`; the view picks one (default: the last bias point).
	import type { Workbench } from './workbench.svelte';
	import { biasChoices, biasLabel } from './semi';

	let { wb, dataset, value, onchange }: { wb: Workbench; dataset: string; value: number | null | undefined; onchange: (b: number | null) => void } = $props();
	const choices = $derived(biasChoices(wb.semi));
	const k = $derived(wb.results.biasIndex(dataset, value));
</script>

{#if choices.length}
	<label class="f" data-tip="Bias point of the semiconductor solution this view evaluates (all bias points are solved by Compute; the swept contact and its bias are named)">Bias
		<select aria-label="Bias point" data-bias={k} value={String(value == null ? 'last' : k)} onchange={(e) => onchange(e.currentTarget.value === 'last' ? null : Number(e.currentTarget.value))}>
			<option value="last">last ({biasLabel(wb.semi, (wb.semi?.points.length ?? 1) - 1)})</option>
			{#each choices as c}<option value={String(c.k)}>{c.label}</option>{/each}
		</select>
	</label>
{/if}

<style>
	.f { display: grid; grid-template-columns: minmax(84px, 36%) minmax(0, 1fr); align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
	.f select { width: 100%; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; }
</style>
