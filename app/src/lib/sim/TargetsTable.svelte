<script lang="ts">
	import type { Workbench } from './workbench.svelte';
	import { fmt } from '../logic';
	import { downloadText, toCsv } from './exportUtil';

	let { wb }: { wb: Workbench } = $props();
	const r = $derived(wb.result);
	const reasons = $derived(r ? [...new Set(r.targets.map((t) => t.reason).filter(Boolean))] : []);
	const diagnostics = $derived(r ? [...new Set(r.targets.map((t) => t.diagnostic).filter(Boolean))] : []);

	function exportCsv() {
		if (!r) return;
		downloadText(`${r.id}-${r.section}-targets.csv`, toCsv(['metric', 'at_ghz', 'vpi_convention', 'target', 'tolerance', 'actual', 'status', 'reason', 'diagnostic'],
			r.targets.map((t) => [t.metric, t.at_ghz ?? '', t.vpi_convention ?? '', t.value, t.tolerance, t.actual, t.status, t.reason ?? '', t.diagnostic ?? ''])));
	}
</script>

{#if r}
	{#if wb.stale}<p class="notice">Inputs changed. These results belong to the previous run.</p>{/if}
	<div class="line">
		<span class="target-summary">{r.targetSummary.evaluated} of {r.targetSummary.total} targets evaluated · {r.targetSummary.passed} passed · {r.targetSummary.failed} failed{#if r.targetSummary.flagged} · <span class="notice" data-targets-flagged={r.targetSummary.flagged}>{r.targetSummary.flagged} flagged</span>{/if}</span>
		<span class="grow"></span><button onclick={exportCsv} title="Download targets as CSV">CSV</button>
	</div>
	<p class="muted small">Pass/fail applies only to an independently evaluated metric. Not evaluated is never counted as a pass. Hover a row for its reason.</p>
	<div class="scroll"><table class="grid"><thead><tr><th>Metric</th><th>Target</th><th>Actual</th><th>Status</th></tr></thead><tbody>
		{#each r.targets as t}
			<tr title={t.reason ?? t.diagnostic ?? JSON.stringify(t.source)}>
				<td>{t.metric}{t.at_ghz ? ` @ ${t.at_ghz} GHz` : ''}</td><td class="num">{fmt(t.value)} ± {fmt(t.tolerance)}</td><td class="num">{fmt(t.actual)}</td>
				<td class:failed={t.status === 'fail'} class:passed={t.status === 'pass'}>{t.status.replaceAll('_', ' ')}{#if t.diagnostic}<span class="notice" title={t.diagnostic}> · flagged</span>{/if}</td>
			</tr>
		{/each}
	</tbody></table></div>
	{#each reasons as reason}<p class="muted small">{reason}</p>{/each}
	{#each diagnostics as d}<p class="notice small">Flagged: {d}</p>{/each}
{:else}
	<p class="muted">No results. The config lists {wb.raw?.targets?.length ?? 0} target(s); Compute to evaluate them.</p>
{/if}

<style>
	.line { display: flex; align-items: center; gap: 8px; }
	.grow { flex: 1; }
	button { border-radius: 0; height: 22px; }
	.scroll { overflow: auto; }
	.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
	.grid th, .grid td { padding: 3px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.failed { color: var(--crit); } .passed { color: var(--good); }
	.notice { color: var(--warn); }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
</style>
