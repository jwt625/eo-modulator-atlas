<script lang="ts">
	import type { Workbench } from './workbench.svelte';
	import { fmt } from '../logic';
	import { downloadText, toCsv } from './exportUtil';
	import { METRIC_LABELS } from './labels';
	import SolutionSelect from './SolutionSelect.svelte';

	let { wb }: { wb: Workbench } = $props();
	const r = $derived(wb.result);

	const timing = $derived(r?.timing);
	const timingRows = $derived.by(() => {
		const out: [string, number][] = [];
		const walk = (v: unknown, p: string) => {
			if (typeof v === 'number' && /_ms$/.test(p)) out.push([p, v]);
			else if (v && typeof v === 'object' && !Array.isArray(v)) for (const [k, x] of Object.entries(v)) walk(x, p ? `${p}.${k}` : k);
		};
		walk(timing, '');
		return out;
	});

	function exportCsv() {
		if (!r) return;
		const rows: (string | number)[][] = Object.entries(r.metrics).map(([k, v]) => [k, METRIC_LABELS[k]?.[0] ?? k, v, METRIC_LABELS[k]?.[1] ?? '']);
		for (const k of ['A', 'B'] as const) {
			const a = r.eo?.arms[k];
			if (a) rows.push([`arm_${k}_dn_eff_per_v`, `dn_eff/dV arm ${k}`, a.dnEffPerV, '1/V'], [`arm_${k}_n_eff`, `n_eff arm ${k}`, a.neff, '']);
		}
		rows.push(['elapsed_ms', 'engine elapsed', r.elapsed_ms, 'ms']);
		downloadText(`${r.id}-${r.section}-derived.csv`, toCsv(['key', 'label', 'value', 'unit'], rows));
	}
</script>

<SolutionSelect {wb} value={wb.derivedPoint} onchange={(p) => (wb.derivedPoint = p)} />
{#if wb.derivedPoint >= 0}
	{@const row = wb.sweepRows[wb.derivedPoint]}
	<table class="grid"><thead><tr><th>Quantity</th><th>Value</th><th>Unit</th></tr></thead><tbody>
		{#each Object.entries(row?.metrics ?? {}) as [key, value]}
			{@const l = METRIC_LABELS[key]}
			<tr data-tip={l?.[2] ?? key}><td>{l?.[0] ?? key}</td><td class="num" data-metric={key} data-value={value}>{fmt(value, 5)}</td><td class="muted">{l?.[1] ?? ''}</td></tr>
		{/each}
	</tbody></table>
	<p class="muted small">Section values of the sweep point (computed by the sweep). Field quantities of this point: plot groups and derived value nodes with this Parameter value.</p>
{:else if r}
	{#if wb.stale}<p class="notice">Inputs changed. These results belong to the previous run.</p>{/if}
	<div class="line"><span data-run-info>{r.id} · {r.section} · {fmt(r.elapsed_ms / 1000)} s</span><span class="muted small" data-run-solver data-tip="Electrostatic element order and optical solver of this result">{r.electrostatics ? `P${r.elementOrder ?? 1} electrostatics` : 'no electrostatics'}{r.opticalSolver ? ` · ${r.opticalSolver} optical solver` : ''}</span><span class="grow"></span><button onclick={exportCsv} data-tip="Download derived values as CSV">CSV</button></div>
	<table class="grid"><thead><tr><th>Quantity</th><th>Value</th><th>Unit</th></tr></thead><tbody>
		{#each Object.entries(r.metrics) as [key, value]}
			{@const l = METRIC_LABELS[key]}
			<tr data-tip={l?.[2] ?? key}><td>{l?.[0] ?? key}</td><td class="num" data-metric={key} data-value={value}>{fmt(value, 5)}</td><td class="muted">{l?.[1] ?? ''}</td></tr>
		{/each}
	</tbody></table>
	{#if r.electrostatics}
		<p class="muted small">{r.electrostatics.nNodes.toLocaleString()} nodes · {r.electrostatics.nTris.toLocaleString()} triangles · charge/energy relative difference {fmt(r.electrostatics.energyChargeRelativeError)}</p>
	{:else if (r as { semiconductor?: unknown }).semiconductor}
		<p class="muted small" data-semi-only>Semiconductor stage result: no Laplace electrostatics (the stage solves its own Poisson equation on the device mesh).</p>
	{:else}
		<p class="muted small" data-mode-only>Mode-only result: no electrostatic solve (no C', Z0, n_RF, potential or field views).</p>
	{/if}
	{#if r.optical}
		{@const o = r.optical}
		{#if o.source === 'semiconductor_stage'}
			{@const so = o as unknown as { neff?: number; teFraction?: number; nDof?: number; nNodes?: number }}
			<p class="muted small" data-optical-source="semiconductor_stage" data-tip="DevLog-043: with the Semiconductor stage the optical mode is the stage's own solve (plasma-dispersion coupling); no second mode solve">Optical model: the semiconductor stage's own full-vector mode (n_eff {fmt(so.neff ?? null, 6)}, TE fraction {fmt(so.teFraction ?? null, 4)}, {so.nDof?.toLocaleString?.() ?? 'n/a'} DOF, {so.nNodes?.toLocaleString?.() ?? 'n/a'} nodes).</p>
		{:else if r.opticalSolver === 'vector'}
			<p class="muted small" data-optical-policy={o.metal?.policy}>Optical model: full-vector mode {o.modeIndex} (order {o.order ?? 'n/a'}, {o.nDof?.toLocaleString?.() ?? 'n/a'} DOF, {o.nNodes?.toLocaleString?.() ?? 'n/a'} nodes); metal policy {o.metal?.policy ?? 'reject'}; converged {o.converged ? 'yes' : 'no'}.</p>
			<p class="muted small" data-vector-mode>TE fraction {fmt(o.teFraction ?? null, 4)} · effective area {fmt(o.effectiveAreaUm2 ?? null, 4)} µm² · residual {fmt(o.residual ?? null, 2)} · {o.nModesComputed ?? 'n/a'} modes computed{o.groupIndexMethod ? ` · n_g by ${o.groupIndexMethod}` : ''}.</p>
			{#each o.solverWarnings ?? [] as w}<p class="notice small">{w}</p>{/each}
		{:else}
			<p class="muted small" data-optical-policy={o.metal?.policy}>Optical model: {o.form}-form scalar mode {o.modeIndex}; metal policy {o.metal?.policy ?? 'reject'}; {o.nNodes?.toLocaleString?.() ?? 'n/a'} nodes, {o.iterations ?? 'n/a'} iterations.</p>
			{#if o.boundaryMarginFraction}<p class="muted small">Window-edge diagnostic: {fmt(100 * o.boundaryMarginFraction.value)}% of the squared scalar mode lies within {fmt(o.boundaryMarginFraction.marginUm)} µm of a Dirichlet boundary. This is a truncation indicator; expand the window to check convergence.</p>{/if}
			{#if o.metal?.pecFaces}<p class="muted small">Scalar PEC is exact on horizontal faces only: {fmt(100 * o.metal.pecFaces.validFaceFraction)}% of the modelled metal perimeter is horizontal.</p>{/if}
		{/if}
	{/if}
	{#if r.eo}<p class="small">EO coupling (per-arm dn/V, VπL, balance, breakdown): <button class="link" onclick={() => (wb.node = 'res.eo')}>Derived Values, EO Coupling</button>.</p>{/if}
	{#if timingRows.length}
		<h4>Timing</h4>
		<table class="grid"><tbody>{#each timingRows as [k, v]}<tr><td class="mono small">{k}</td><td class="num">{fmt(v, 4)} ms</td></tr>{/each}</tbody></table>
	{/if}
	<p class="muted small" data-stages={r.stages.join(' ')}>Stages run: {r.stages.join(', ').replaceAll('_', ' ')}. Pending: {r.pendingStages.join(', ').replaceAll('_', ' ') || 'none'}.</p>
	<h4>Model limitations</h4>
	<ul>{#each r.warnings as w}<li>{w.replaceAll('_', ' ')}</li>{/each}</ul>
{:else}
	<p class="muted">No results. Compute the study to calculate the section values.</p>
{/if}

<style>
	.line { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
	.grow { flex: 1; }
	button { border-radius: 0; height: 22px; }
	.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
	.grid th, .grid td { padding: 3px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.notice { color: var(--warn); }
	.link { border: 0; background: none; padding: 0; height: auto; color: var(--accent); border-radius: 0; }
	ul { padding-left: 16px; margin: 4px 0; font-size: 11px; color: var(--ink-3); }
</style>
