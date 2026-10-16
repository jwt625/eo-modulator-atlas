<script lang="ts">
	import type { Workbench } from './workbench.svelte';
	import { numericLeaves } from './yamlEdit';
	import { parseSweepValues } from './sweepValues';
	import { fmt } from '../logic';
	/* eslint-disable @typescript-eslint/no-explicit-any */

	let { wb }: { wb: Workbench } = $props();
	const params = $derived(wb.raw?.params && typeof wb.raw.params === 'object' ? Object.keys(wb.raw.params).map((n) => `params.${n}.value`) : []);
	const leaves = $derived(wb.raw ? numericLeaves(wb.raw).map((l) => l.path).filter((p) => !p.startsWith('params.')) : []);
	const parsedValues = $derived.by(() => {
		if (!wb.sweepSpec.trim()) return { values: [] as number[], error: '' };
		try {
			return { values: parseSweepValues(wb.sweepSpec), error: '' };
		} catch (e) {
			return { values: [] as number[], error: e instanceof Error ? e.message : String(e) };
		}
	});
	const current = $derived(wb.sweepPath === 'meshScale' ? wb.meshScale : wb.sweepPath ? wb.rawAt(wb.sweepPath) : undefined);
	// Default min(4, hardwareConcurrency - 1); `?pool=N` sets it (U12).
	const workers = $derived(wb.poolSize(1000));
	const metric = $derived(wb.sweepMetric);
</script>

<label class="f" data-tip="A study declared in the config (engine enumerates and runs its points, with its stages and sweep targets), or a custom one-parameter sweep">Study
	<select aria-label="Sweep study" bind:value={wb.sweepStudy} disabled={wb.sweepRunning}>
		<option value="">custom (one parameter)</option>
		{#each wb.configStudies as st}<option value={st}>config: {st}</option>{/each}
	</select>
</label>
{#if wb.sweepStudy}
	{@const def = (wb.raw?.studies?.[wb.sweepStudy] ?? wb.raw?.study ?? {}) as Record<string, any>}
	{#if def.description}<p class="small">{def.description}</p>{/if}
	<p class="muted small mono">{JSON.stringify(def.sweep ?? [])}</p>
	<p class="muted small">Stages: {(def.stages ?? ['config default']).join(', ')}. {def.sweep_targets?.length ?? 0} sweep target(s) are overlaid on the Sweep plot group. Points run on up to {workers} worker(s).</p>
{:else}
<p class="muted small">Each point re-runs the selected stages with one value changed (same section and mesh level), on up to {workers} worker(s). A <span class="mono">params.NAME.value</span> path is passed to the engine as a param override.</p>
<label class="f" data-tip="A params entry (params.NAME.value), any numeric YAML path, or meshScale (mesh level, for convergence)">Parameter
	<input type="text" list="sweep-paths" aria-label="Sweep parameter" placeholder="params.gap_um.value" bind:value={wb.sweepPath} spellcheck="false" disabled={wb.sweepRunning} />
</label>
<datalist id="sweep-paths">
	{#each params as p}<option value={p}></option>{/each}
	<option value="meshScale">mesh level (meshScale)</option>
	{#each leaves as p}<option value={p}></option>{/each}
</datalist>
{#if wb.sweepPath}<p class="muted small">Current value: <span class="mono">{current === undefined ? 'not set in this config' : JSON.stringify(current)}</span></p>{/if}
<label class="f" data-tip="List: 3, 4, 5. Range: start:step:stop. Or linspace(a, b, n)">Values
	<input type="text" aria-label="Sweep values" placeholder="3, 4, 5  or  2:0.5:5" bind:value={wb.sweepSpec} spellcheck="false" disabled={wb.sweepRunning} />
</label>
{/if}
<p class="small" class:crit={!!parsedValues.error} class:hidden={!!wb.sweepStudy} class:muted={!parsedValues.error}>{parsedValues.error || (parsedValues.values.length ? `${parsedValues.values.length} points: ${parsedValues.values.slice(0, 8).map((v) => fmt(v, 6)).join(', ')}${parsedValues.values.length > 8 ? ', ...' : ''}` : 'No values')}</p>
<div class="actions">
	<button class="on" onclick={() => { wb.runSweep(); if (wb.sweepRunning) wb.node = 'results.sweep'; }} disabled={wb.sweepRunning || !wb.canRun || wb.semiSelected || (!wb.sweepStudy && (!parsedValues.values.length || !wb.sweepPath))} data-tip={wb.semiSelected ? 'Not available with the Semiconductor stage: its bias sweep runs in Compute (Study > Bias Sweep)' : undefined}>Run sweep</button>
	<button onclick={() => wb.cancelSweep()} disabled={!wb.sweepRunning}>Cancel sweep</button>
	{#if wb.sweepRows.length}<span class="muted num" data-sweep-progress={`${wb.sweepDone}/${wb.sweepRows.length}`}>{wb.sweepDone}/{wb.sweepRows.length}</span>{/if}
</div>
{#if wb.sweepRows.length}
	<div class="bar"><i style:width="{(100 * wb.sweepDone) / wb.sweepRows.length}%"></i></div>
	{#if wb.sweepStale}<p class="small stale">Inputs changed since this sweep ran.</p>{/if}
	<table class="grid"><thead><tr><th>#</th>{#each wb.sweepAxes as a}<th>{wb.axisLabel(a)}</th>{/each}<th>Status</th><th>{metric || 'metric'}</th><th>ms</th></tr></thead><tbody>
		{#each wb.sweepRows as r}<tr data-sweep-row={r.status}><td>{r.index + 1}</td>{#each wb.sweepAxes as a}<td class="num">{fmt(r.values[a], 6)}</td>{/each}<td class:crit={r.status === 'error'} data-tip={r.error ?? (r.reused?.electrostatics ? 'electrostatics reused' : '')}>{r.status}</td><td class="num">{r.metrics && metric ? fmt(r.metrics[metric], 5) : ''}</td><td class="num">{r.ms == null ? '' : Math.round(r.ms)}</td></tr>{/each}
	</tbody></table>
{/if}

<style>
	.f { display: grid; grid-template-columns: 70px minmax(0, 1fr); align-items: center; gap: 6px; margin: 4px 0; color: var(--ink-2); }
	.f input { width: 100%; height: 22px; border-radius: 0; }
	.actions { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
	.actions button { border-radius: 0; }
	button:disabled { opacity: 0.5; cursor: default; }
	.bar { height: 3px; background: var(--grid); margin-bottom: 6px; }
	.bar i { display: block; height: 100%; background: var(--accent); }
	.grid { width: 100%; border-collapse: collapse; }
	.grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.crit { color: var(--crit); }
	.stale { color: var(--warn); }
	p { margin: 4px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.hidden { display: none; }
</style>
