<script lang="ts">
	// Mode Analysis table of an optical dataset in a solution (COMSOL effective mode index table). Selecting a row sets
	// the mode of that dataset in the plot groups (and their derived values) showing the same solution.
	import type { Workbench } from './workbench.svelte';
	import type { ModeRow } from './post/contract';
	import { modesRequest, solFor } from './requests';
	import { fmt } from '../logic';

	let { wb, dataset, point = -1 }: { wb: Workbench; dataset: string; point?: number } = $props();
	const R = $derived(wb.results);
	const ready = $derived(point < 0 || wb.points[point]?.status === 'ready');
	const entry = $derived(ready ? wb.cache.get<ModeRow[]>(wb.post, R.gen, modesRequest(dataset, point)) : { status: 'pending' as const });
	const rows = $derived(entry?.data ?? []);
	const key = $derived(point >= 0 ? `${solFor(point)}|${dataset}` : dataset);
	const sel = $derived(R.modeOf[key] ?? (point >= 0 ? rows.find((r) => r.selected)?.k : R.mode(dataset)));
	const na = 'not exported for this mode (the engine reports it for the solved mode only)';
	function pick(k: number) {
		R.modeOf = { ...R.modeOf, [key]: k };
		wb.addLog(`${R.dsLabel(dataset)} in ${wb.solutionLabel(point)}: plots show ${rows.find((r) => r.k === k)?.label ?? `k=${k}`}`);
	}
</script>

{#if entry?.status === 'error'}<p class="err">{entry.error}</p>{/if}
{#if rows.length}
	<div class="scroll"><table class="grid" aria-label="Mode table {R.dsLabel(dataset)}" data-mode-table={dataset} data-mode-point={point}><thead><tr>
		<th data-tip="Mode index and family label (engine mode table)">mode</th><th data-tip="The mode the engine used for n_eff, n_g and EO (optics.mode_index rule)">solved</th><th data-tip="Effective index">n_eff</th><th data-tip="Group index">n_g</th><th data-tip="Propagation loss">loss (dB/cm)</th><th data-tip="TE fraction">TE frac.</th><th data-tip="Effective mode area">A_eff (µm²)</th><th data-tip="Power confinement of the largest region (all regions in the tooltip)">confinement</th>
	</tr></thead><tbody>
		{#each rows as r}
			{@const top = r.confinement ? Object.entries(r.confinement).sort((a, b) => b[1] - a[1])[0] : null}
			<tr class:on={r.k === sel} onclick={() => pick(r.k)} data-mode-row={r.k} aria-selected={r.k === sel} data-tip="Plot {r.label ?? `k=${r.k}`} in every plot of this dataset (the highlighted row)">
				<td data-mode-label={r.k}>{r.label ?? `k=${r.k}`}</td><td>{r.selected ? 'solved' : ''}</td><td class="num">{fmt(r.neff, 6)}</td>
				<td class="num" data-tip={r.ng == null ? na : ''}>{r.ng == null ? '-' : fmt(r.ng, 5)}</td>
				<td class="num" data-tip={r.lossDbPerCm == null ? na : ''}>{r.lossDbPerCm == null ? '-' : fmt(r.lossDbPerCm, 4)}</td>
				<td class="num" data-tip={r.teFraction == null ? na : ''}>{r.teFraction == null ? '-' : fmt(r.teFraction, 4)}</td>
				<td class="num" data-tip={r.aeffUm2 == null ? na : ''}>{r.aeffUm2 == null ? '-' : fmt(r.aeffUm2, 4)}</td>
				<td class="num" data-tip={r.confinement ? Object.entries(r.confinement).map(([k, v]) => `${k}: ${fmt(v, 4)}`).join('\n') : na}>{top ? `${fmt(top[1], 3)} ${top[0]}` : '-'}</td>
			</tr>
		{/each}
	</tbody></table></div>
{:else if entry?.status === 'pending'}<p class="muted small">Loading modes</p>{/if}

<style>
	.scroll { overflow-x: auto; }
	.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
	.grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
	.grid th { color: var(--ink-3); font-weight: 500; }
	tbody tr { cursor: pointer; }
	tbody tr:hover { background: var(--hover); }
	tbody tr.on { background: var(--sel); box-shadow: inset 2px 0 var(--accent); }
	.err { color: var(--crit); }
	.small { font-size: 11px; }
</style>
