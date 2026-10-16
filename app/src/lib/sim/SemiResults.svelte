<script lang="ts">
	// Derived Values > Semiconductor (DevLog-042): per-bias table of the S8 stage (C', R', f_RC, dn_eff, d alpha, loss,
	// VpiL variants as labelled by the engine, convergence and flags), models with their locators and the plasma
	// dispersion coefficients used, density basis and delta-eps order, mesh and optical statistics, stage targets.
	import type { Workbench } from './workbench.svelte';
	import { fmt } from '../logic';
	import { downloadText, toCsv } from './exportUtil';
	import { biasLabel, configVpiTargets } from './semi';
	// Coefficient rows of the plasma-dispersion models (engine/src/semi/models.mjs, read-only; loaded through Vite's glob
	// import so the type checker does not check the engine JS, which has no declaration file).
	const MODELS = Object.values(import.meta.glob('../../../../engine/src/semi/models.mjs', { eager: true }))[0] as { plasmaRow?: (model: string, lambdaUm: number) => { coeff: Record<string, number> } } | undefined;

	let { wb }: { wb: Workbench } = $props();
	const s = $derived(wb.semi);
	const pd = $derived(s?.models.plasmaDispersion ?? null);
	const coeff = $derived.by(() => {
		if (!pd) return null;
		try {
			return MODELS?.plasmaRow?.(pd.model, pd.rowUm).coeff ?? null;
		} catch {
			return null;
		}
	});
	const conv = $derived(s?.points.find((p) => p.optics?.vpilConventions)?.optics?.vpilConventions ?? null);
	// column indices used below: 0 V, 2 C', 5 dn_eff, 11 VpiL push-pull, 12/13 Newton/GMRES, 14 residual, 15 flags
	const COLS = ['V (V)', 'V_fwd (V)', "C' (pF/mm)", "R' (Ω·mm)", "G' (S/m)", 'dn_eff', 'dn_eff/dV (1/V)', 'd alpha (dB/cm)', 'loss (dB/cm)', 'VpiL secant (V·cm)', 'VpiL small-signal (V·cm)', 'VpiL push-pull (V·cm)', 'Newton', 'GMRES', 'residual', 'flags'];
	const CSV_COLS = COLS.map((c) => c.replace('Ω·mm', 'ohm mm').replace('V·cm', 'V cm'));
	const rows = $derived(
		(s?.points ?? []).map((p) => [
			p.sweptBiasV ?? NaN, p.forwardBiasV, p.capacitance?.cPfPerMm ?? NaN, p.resistance?.rOhmMm ?? NaN, p.conductance?.gSPerM ?? NaN, p.optics?.dneff ?? NaN, p.optics?.dneffPerV ?? NaN,
			p.optics?.dalphaDbPerCm ?? NaN, p.optics?.lossDbPerCm ?? NaN, p.optics?.vpilVcm ?? NaN, p.optics?.vpilDifferentialVcm ?? NaN, p.optics?.vpilPushPullVcm ?? NaN,
			p.newton.iterations, p.newton.gmres, p.newton.residualInf ?? NaN, p.flags.join(' ')
		] as (number | string)[])
	);
	const cell = (v: number | string, k: number) => (typeof v === 'string' ? v : !Number.isFinite(v) ? '-' : k >= 12 && k <= 13 ? String(v) : k === 14 ? v.toExponential(1) : fmt(v, k === 5 || k === 6 ? 4 : 5));
	/** Cell tooltip: engine reasons for missing values (push-pull VpiL, G' below the residual floor) and the flags. */
	const cellTip = (i: number, k: number, v: number | string): string | undefined => {
		const p = s?.points[i];
		if (k === 15) return String(v) || 'no flags';
		if (k === 11 && !(typeof v === 'number' && Number.isFinite(v))) return p?.optics?.vpilPushPullReason ?? undefined;
		if (k === 4 && !(typeof v === 'number' && Number.isFinite(v))) return p?.conductance?.reason ?? undefined;
		return undefined;
	};
	const cfgVpi = $derived(configVpiTargets(wb.result));
	function exportCsv() {
		if (!s) return;
		downloadText(`${s.id}-${s.section}-semiconductor.csv`, `# ${wb.solutionLabel(-1)}; swept contact ${s.sweep?.contact ?? '-'}; reference ${s.sweep?.referenceV ?? '-'} V; ${pd ? `${pd.model} ${pd.rowUm} um row, ${pd.densityBasis} density basis, ${pd.deltaEps} delta eps` : 'no optics'}\n` + toCsv(CSV_COLS, rows));
	}
	const tip: Record<string, string> = $derived({
		"C' (pF/mm)": "d(terminal charge)/dV of the swept contact by central difference (engine capacitance.method); forward bias includes the stored diffusion charge",
		"R' (Ω·mm)": 'quasi-neutral access resistance of both sides, depleted nodes shorted (engine resistance.method)',
		"G' (S/m)": "junction conductance dI/dV over +-dv/2 (engine conductance.method); '-' below the residual floor (reverse bias), hover for the reason",
		'f_RC (GHz)': "1 / (2 pi R' C')",
		dn_eff: `effective index change from the reference bias: first-order mode perturbation by delta eps (${pd?.deltaEps.replaceAll('_', ' ') ?? 'no optics'}), ${pd?.densityBasis ?? '-'} density basis`,
		'dn_eff/dV (1/V)': 'small-signal derivative: central difference of the modal response over the +-dv/2 states',
		'd alpha (dB/cm)': 'mode loss change from the reference bias',
		'loss (dB/cm)': 'absolute free-carrier mode loss vs undoped silicon',
		'VpiL secant (V·cm)': (conv?.vpilVcm ?? 'single_arm_secant_from_reference').replaceAll('_', ' '),
		'VpiL small-signal (V·cm)': `${(conv?.vpilDifferentialVcm ?? '').replaceAll('_', ' ')}: lambda / (2 |dn_eff/dV|)`,
		'VpiL push-pull (V·cm)': `${(conv?.vpilPushPullVcm ?? '').replaceAll('_', ' ')}: lambda / (4 |dn_eff/dV|), reverse DC bias only ('-' cells: hover for the engine reason)`,
		residual: 'row-scaled residual max |F_i / J_ii| at the last Newton step',
		flags: 'engine flags of the bias point'
	});
</script>

{#if !s}
	<p class="muted">No semiconductor result. Include the Semiconductor stage (Physics or Study) and Compute.</p>
{:else}
	<div class="line"><span data-semi-info>{s.id} · {s.section} · {s.points.length} bias points · {fmt(s.timing.total_ms / 1000)} s</span><span class="grow"></span><button onclick={exportCsv} data-tip="Download the per-bias table as CSV">CSV</button></div>
	<p class="muted small" data-solution-label={wb.solutionLabel(-1)}>Solution: {wb.solutionLabel(-1)}. Swept contact <span class="mono">{s.sweep?.contact ?? '-'}</span>; {biasLabel(s, -1)}; operating bias <span data-operating-bias={s.operatingBiasV ?? ''}>{s.operatingBiasV != null ? `${s.operatingBiasV} V` : 'not set (semiconductor.operating_bias_v)'}</span>{s.reference.lossDbPerCm != null ? `; loss at reference ${fmt(s.reference.lossDbPerCm, 4)} dB/cm` : ''}.</p>
	<div class="scroll"><table class="grid" data-semi-table={s.points.length}>
		<thead><tr>{#each COLS as c}<th data-tip={tip[c] ?? c}>{c}</th>{/each}</tr></thead>
		<tbody>{#each rows as r, i}<tr data-semi-row={i}>{#each r as v, k}<td class:num={typeof v === 'number'} class:flag={k === 15 && v !== ''} data-col={k} data-value={typeof v === 'number' && Number.isFinite(v) ? v : undefined} data-tip={cellTip(i, k, v)}>{cell(v, k)}</td>{/each}</tr>{/each}</tbody>
	</table></div>
	<p class="muted small">Plots: C'(V), R'(V), f_RC(V), dn_eff(V), d alpha(V), VpiL(V) plot groups (Bias sweep dataset); fields per bias: Net Doping, Electron/Hole Density, Potential, Delta n / Delta alpha (bias): change from the reference bias, and vs undoped Si (Bias in the plot group Data).</p>

	<h4>Models</h4>
	<table class="grid small" data-semi-models><tbody>
		<tr><td>temperature</td><td>{fmt(s.temperatureK)} K · V_t {fmt(s.thermalVoltageV * 1e3, 5)} mV</td></tr>
		<tr><td>intrinsic density</td><td>{s.models.intrinsicDensity.model.replaceAll('_', ' ')} · n_i {fmt(s.niCm3, 5)} cm⁻³{#if s.models.intrinsicDensity.locator}<br /><span class="muted">{s.models.intrinsicDensity.locator}</span>{/if}</td></tr>
		<tr><td>mobility</td><td>{s.models.mobility.doping.replaceAll('_', ' ')}{s.models.mobility.donor ? ` (${s.models.mobility.donor})` : ''} · field {s.models.mobility.field.replaceAll('_', ' ')}<br /><span class="muted">{s.models.mobility.locator}{s.models.mobility.fieldLocator ? `; ${s.models.mobility.fieldLocator}` : ''}{s.models.mobility.drivingForce ? `; driving force: ${s.models.mobility.drivingForce}` : ''}</span></td></tr>
		<tr><td>recombination</td><td>{s.models.recombination.model}{s.models.recombination.tauNS != null ? ` · tau_n ${fmt(s.models.recombination.tauNS)} s, tau_p ${fmt(s.models.recombination.tauPS ?? null)} s, E_t - E_i ${fmt(s.models.recombination.trapLevelEv ?? 0)} eV` : ''}{#if s.models.recombination.locator}<br /><span class="muted">{s.models.recombination.locator}</span>{/if}</td></tr>
		{#if pd}
			<tr><td>plasma dispersion</td><td data-plasma={pd.model}>{pd.model.replaceAll('_', ' ')} · {pd.rowUm} µm row{pd.mismatchUm ? ` (mismatch ${fmt(pd.mismatchUm)} µm)` : ''}<br /><span class="muted">{pd.locator}</span></td></tr>
			{#if coeff}<tr><td data-tip="delta alpha = a N_e^b + c N_h^d (cm^-1); -delta n = p N_e^q + r N_h^s (N in cm^-3)">coefficients</td><td class="mono">{Object.entries(coeff).map(([k, v]) => `${k} ${v}`).join(' · ')}</td></tr>{/if}
			<tr><td>density basis</td><td data-density-basis={pd.densityBasis}>{pd.densityBasis} · {pd.definition}</td></tr>
			<tr><td>delta eps order</td><td data-delta-eps={pd.deltaEps}>{pd.deltaEps === 'first_order' ? 'first order: 2 n_Si (dn + i dk)' : pd.deltaEps === 'exact' ? 'exact: (n_Si + dn + i dk)^2 - n_Si^2' : pd.deltaEps}</td></tr>
		{:else}<tr><td>optics</td><td class="muted">no optics block in the semiconductor stage (no dn_eff, loss, VpiL)</td></tr>{/if}
		<tr><td>discretisation</td><td class="muted">{s.models.discretisation}</td></tr>
		<tr><td>drive</td><td>{s.drive ?? '-'}</td></tr>
	</tbody></table>
	{#if conv}<p class="muted small" data-vpil-conventions>VpiL conventions: secant {conv.vpilVcm?.replaceAll('_', ' ')}; differential {conv.vpilDifferentialVcm?.replaceAll('_', ' ')}; push-pull {conv.vpilPushPullVcm?.replaceAll('_', ' ')}.</p>{/if}

	<h4>Mesh and optical mode</h4>
	<dl class="kv num small">
		<dt>device mesh</dt><dd>{s.mesh.nNodes.toLocaleString()} nodes ({(s.mesh.nSemiNodes ?? 0).toLocaleString()} semiconductor), {s.mesh.nTris.toLocaleString()} triangles, mesh level {s.mesh.meshScale}{s.mesh.negativeEdgeWeights ? `, ${s.mesh.negativeEdgeWeights} negative edge weights clamped` : ''}</dd>
		<dt>equilibrium</dt><dd>{s.equilibrium.iterations} iterations</dd>
		{#if s.optical}<dt>optical mode</dt><dd>n_eff {fmt(s.optical.neff, 6)} · TE {fmt(s.optical.teFraction, 4)} · {s.optical.nDof.toLocaleString()} DOF · {s.optical.nSiliconQuadraturePoints.toLocaleString()} Si quadrature points · n_Si {fmt(s.optical.nSilicon, 5)}</dd>{/if}
	</dl>

	{#if s.targets.length}
		<h4>Stage targets</h4>
		<table class="grid small" data-semi-targets><thead><tr><th>Metric</th><th>Bias</th><th>Paper</th><th>Engine</th><th>Status</th></tr></thead><tbody>
			{#each s.targets as t}<tr data-tip={[t.reason, t.source?.locator, t.source?.note].filter(Boolean).join('\n')}><td class="mono">{t.metric}</td><td class="num">{t.at_bias_v} V</td><td class="num">{t.value}</td><td class="num">{t.computed != null ? fmt(t.computed, 4) : '-'}</td><td class:warn={t.status === 'fail'}>{t.status.replaceAll('_', ' ')}{t.source?.comparable === false ? ' (comparable: false)' : ''}</td></tr>{/each}
		</tbody></table>
	{/if}

	{#if cfgVpi.length}
		<h4>Config targets (not placed on a curve)</h4>
		<table class="grid small" data-config-vpi><thead><tr><th>Metric</th><th>Paper</th><th>Convention</th><th>Status</th></tr></thead><tbody>
			{#each cfgVpi as t}<tr data-tip={[t.source, t.reason].filter(Boolean).join('\n')}><td class="mono">{t.metric}</td><td class="num">{t.value} V·cm</td><td>{t.convention.replaceAll('_', ' ')}</td><td>{t.status.replaceAll('_', ' ')}{t.comparable ? '' : ' (comparable: false)'}</td></tr>{/each}
		</tbody></table>
		<p class="muted small">No bias is stated for these targets, so they are not drawn on a VpiL(V) series.</p>
	{/if}

	<h4>Model limitations</h4>
	<ul>{#each s.labels as l}<li>{l.replaceAll('_', ' ')}</li>{/each}</ul>
{/if}

<style>
	.line { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
	.grow { flex: 1; }
	button { border-radius: 0; height: 22px; }
	.scroll { overflow: auto; max-height: 48vh; }
	.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
	.grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top; }
	.grid th { color: var(--ink-3); font-weight: 500; white-space: nowrap; }
	[data-semi-table] td { white-space: nowrap; }
	td.flag { color: var(--warn); max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.warn { color: var(--warn); }
	.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 6px 0; } .kv dt { color: var(--ink-3); } .kv dd { margin: 0; overflow-wrap: anywhere; }
	ul { padding-left: 16px; margin: 4px 0; font-size: 11px; color: var(--ink-3); }
</style>
