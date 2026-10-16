<script lang="ts">
	// EO Coupling page of a sweep-point solution, same content as the Compute page (H6), evaluated in that point's store:
	// run globals (VpiL, Vpi, dneffA/B, GammaA/B, EbarA/B, gapA/B, VpiLtextbook, balance, lambda0), the arm mode row
	// (power fraction per region = mode confinement), and surface integrals over the arm window of eo.integrand and its
	// Pockels-coefficient parts per region. Gamma(E_x) = (Gamma / Ebar) int eo.Ec |E_x|^2 / int |E_x|^2 (g / V_gap =
	// Gamma / Ebar). n_e^3 r33 = lambda / (VpiL_tb |Ebar_A - Ebar_B|) gives Gamma equiv and the arm textbook VpiL.
	// Node check (5 configs): these reproduce the engine result.eo values to 1e-14 relative.
	import type { Workbench } from './workbench.svelte';
	import type { DerivedResult, ModeRow } from './post/contract';
	import { globalRequest, integralRequest, modesRequest } from './requests';
	import type { Entry } from './plots.svelte';
	import { fmt } from '../logic';
	import { EO_FORMULAS } from '../../../../engine/src/postproc/index.mjs';

	let { wb, point }: { wb: Workbench; point: number } = $props();
	const R = $derived(wb.results);
	const ready = $derived(wb.points[point]?.status === 'ready');
	const sets = $derived(wb.points[point]?.datasets ?? []);
	const COMPONENTS = ['r33', 'r13', 'r22', 'r51', 'other'] as const;
	const F_VPIL = 'VpiL = lambda / (2 |dn_A - dn_B|) (DC, lossless, no RF mismatch); Vpi = VpiL / L with L = line.length_mm.';
	const F_ARM = 'Single-arm phase shifter: VpiL = lambda / (2 |dn_eff/dV|), not the MZM value.';
	const F_PERT = EO_FORMULAS.engine;
	// Engine PUSH_PULL_BALANCE_TOLERANCE (engine/src/stages.mjs); taken from the Compute result when present.
	const balTol = $derived(wb.result?.eo?.pushPullBalanceTolerance ?? 0.1);
	const val = (e: Entry<DerivedResult> | null) => (e?.status === 'ok' ? e.data!.value : null);
	const g = (expr: string, unit: string) => (ready ? val(wb.cache.get<DerivedResult>(wb.post, R.gen, globalRequest(sets[0]?.id ?? 'es', expr, unit, point))) : null);
	const mzm = $derived.by(() => {
		const vpil = g('VpiL', 'V*cm'), vpi = g('Vpi', 'V'), dA = g('dneffA', '1/V'), dB = g('dneffB', '1/V');
		const tb = g('VpiLtextbook', 'V*cm'), lam = g('lambda0', 'm'), bal = g('balance', '1');
		const eA = g('EbarA', 'V/m'), eB = g('EbarB', 'V/m');
		const eb = eA == null ? null : eA - (eB ?? 0);
		return {
			vpil, vpi, dA, dB, bal, tb, lam,
			// L = VpiL / Vpi (the engine Vpi is VpiL / line.length_mm); mm
			lengthMm: vpil != null && vpi ? (vpil / vpi) * 10 : null,
			diff: dA != null ? dA - (dB ?? 0) : null,
			gain: dA ? (dA - (dB ?? 0)) / dA : null,
			// n_e^3 r33 (m/V) of arm A's EO material, from the textbook VpiL (V*m) and the Ebar difference
			k: tb && lam != null && eb ? lam / ((tb / 100) * Math.abs(eb)) : null
		};
	});
	function arm(a: 'A' | 'B') {
		const armSet = sets.find((d) => d.kind === 'arm' && d.arm === a);
		const eoSet = sets.find((d) => d.kind === 'eo' && d.arm === a);
		if (!armSet || !eoSet || !ready) return null;
		const rows = wb.cache.get<ModeRow[]>(wb.post, R.gen, modesRequest(armSet.aliasOf ?? armSet.id, point))?.data;
		const row = rows?.find((m) => m.selected) ?? rows?.find((m) => m.k === armSet.mode);
		const mesh = wb.meshes[`sweep:${point}/${eoSet.mesh}`];
		const regions = (mesh?.regionNames ?? []).filter((r) => !r.startsWith('electrode:'));
		const integ = (expr: string, unit: string, reg: string[] | null) => val(wb.cache.get<DerivedResult>(wb.post, R.gen, integralRequest(eoSet.id, expr, unit, reg, point)));
		const dn = a === 'A' ? mzm.dA : mzm.dB;
		const conf = (row?.confinement ?? {}) as Record<string, number>;
		const byRegion = regions
			.map((r) => ({ name: r, pf: conf[r] ?? null, all: integ('eo.integrand', '1/V', [r]) }))
			.filter((x) => (x.all !== 0 && x.all !== null) || (x.pf ?? 0) > 0);
		const breakdown = byRegion.filter((x) => x.all !== 0 && x.all !== null).map((x) => ({ ...x, parts: COMPONENTS.map((c) => integ(`eo.integrand_${c}`, '1/V', [x.name])) }));
		const totals = COMPONENTS.map((c) => integ(`eo.integrand_${c}`, '1/V', null));
		const componentSum = totals.every((v) => v != null) ? totals.reduce((s, v) => s + v!, 0) : null;
		const gamma = g(`Gamma${a}`, '1'), ebar = g(`Ebar${a}`, 'V/m'), gapUm = g(`gap${a}`, 'um');
		const ex = `arm${a}.Ex`;
		// null (shown '-') when the arm family has no E_x (scalar TM) or the window has no in-plane c axis
		const numX = integ(`eo.Ec*abs(${ex})^2`, 'V^3/m', null);
		const denX = integ(`abs(${ex})^2`, 'V^2', null);
		const gv = gamma != null && ebar ? gamma / ebar : null; // g / V_gap (m/V)
		const k = mzm.k;
		return {
			neff: g(`arm${a}.neff`, '1'), dn, mode: row?.label ?? armSet.modeLabel ?? `k=${armSet.mode ?? 0}`,
			vpilArm: mzm.lam != null && dn ? ((mzm.lam / (2 * Math.abs(dn))) * 100) : null,
			byRegion, breakdown, totals, componentSum,
			relDiff: componentSum != null && dn ? Math.abs(componentSum - dn) / Math.abs(dn) : null,
			gapUm, gamma,
			gammaEx: gv != null && numX != null && denX ? (gv * numX) / denX : null,
			gammaEquiv: gv != null && k && dn != null ? (2 * gv * Math.abs(dn)) / k : null,
			vpilTb: k && ebar && mzm.lam != null ? (mzm.lam / (k * Math.abs(ebar))) * 100 : null
		};
	}
	const arms = $derived({ A: arm('A'), B: arm('B') });
	const deviates = $derived(mzm.bal != null && mzm.bal < 0 && Math.abs(mzm.bal + 1) > balTol);
</script>

{#if !ready}
	<p class="muted small">Computing the fields of {wb.solutionLabel(point)}.</p>
{:else if !sets.some((d) => d.kind === 'eo')}
	<p class="muted">No EO coupling in {wb.solutionLabel(point)}. The sweep ran without the EO overlap stage.</p>
{:else}
	<h4>MZM</h4>
	<table class="grid"><tbody>
		<tr data-tip={F_VPIL}><td>VπL</td><td class="num" data-eo-vpil={mzm.vpil}>{fmt(mzm.vpil, 5)}</td><td class="muted">V·cm</td></tr>
		<tr data-tip={F_VPIL}><td data-eo-length={mzm.lengthMm}>Vπ at L{mzm.lengthMm != null ? ` = ${fmt(mzm.lengthMm)} mm` : ''}</td><td class="num">{mzm.vpi == null ? '-' : fmt(mzm.vpi, 5)}</td><td class="muted">V</td></tr>
		<tr data-tip="d(phi_A - phi_B)/dV / k0 = dn_A - dn_B"><td>dn_A - dn_B</td><td class="num">{fmt(mzm.diff, 5)}</td><td class="muted">1/V</td></tr>
		<tr data-tip="dn_B / dn_A; -1 = ideal push-pull"><td>push-pull balance</td><td class="num" data-eo-balance={mzm.bal}>{mzm.bal == null ? '-' : fmt(mzm.bal, 5)}</td><td class="muted">{deviates ? 'deviates from -1' : ''}</td></tr>
		<tr data-tip="(dn_A - dn_B) / dn_A"><td>gain vs arm A alone</td><td class="num">{mzm.gain == null ? '-' : fmt(mzm.gain, 5)}</td><td></td></tr>
	</tbody></table>
	{#if mzm.vpi == null}<p class="muted small">No line length; Vπ not computed.</p>{/if}
	{#if deviates}<p class="warn small" data-balance-warning={mzm.bal}>dn_B/dn_A = {fmt(mzm.bal, 4)} deviates from -1 by more than {fmt(balTol)}; the field-resolved Vπ is still the MZM value.</p>{/if}
	<h4>Per arm</h4>
	<table class="grid"><thead><tr><th>Arm</th><th>n_eff</th><th data-tip={F_PERT}>dn/dV (1/V)</th><th data-tip={F_ARM}>VπL arm (V·cm)</th><th data-tip="Arm mode in the Mode Analysis index space">mode</th></tr></thead><tbody>
		{#each ['A', 'B'] as const as k}{@const a = arms[k]}{#if a}
			<tr><td>{k}</td><td class="num">{fmt(a.neff, 6)}</td><td class="num" data-tip={F_PERT} data-arm-dn={k} data-value={a.dn}>{fmt(a.dn, 5)}</td><td class="num" data-arm-vpil={k} data-value={a.vpilArm}>{fmt(a.vpilArm, 4)}</td><td class="muted small" data-arm-mode={k}>{a.mode}</td></tr>
		{/if}{/each}
	</tbody></table>
	{#each ['A', 'B'] as const as k}{@const a = arms[k]}{#if a?.byRegion.length}
		<h4>Arm {k} by region</h4>
		<table class="grid" data-eo-regions={k}><thead><tr><th>Region</th><th data-tip="Fraction of the mode power in the region (confinement factor)">power fraction</th><th data-tip="Contribution of the region to dn_eff/dV (all tensor components)">dn/dV (1/V)</th></tr></thead><tbody>
			{#each a.byRegion as r}<tr><td>{r.name}</td><td class="num" data-power-fraction={r.name} data-value={r.pf}>{r.pf == null ? '-' : fmt(r.pf, 4)}</td><td class="num">{fmt(r.all, 4)}</td></tr>{/each}
		</tbody></table>
	{/if}{/each}
	{#each ['A', 'B'] as const as k}{@const a = arms[k]}{#if a?.breakdown.length}
		<h4>Arm {k} by Pockels coefficient and region</h4>
		<div class="scroll"><table class="grid small" data-eo-breakdown={k}><thead><tr><th data-tip={EO_FORMULAS.components}>region</th>{#each COMPONENTS as c}<th>{c}</th>{/each}<th>all (1/V)</th></tr></thead><tbody>
			{#each a.breakdown as r}<tr><td>{r.name}</td>{#each r.parts as v}<td class="num">{fmt(v, 3)}</td>{/each}<td class="num">{fmt(r.all, 4)}</td></tr>{/each}
			<tr class="sum"><td>total</td>{#each a.totals as v}<td class="num">{fmt(v, 3)}</td>{/each}<td class="num" data-component-sum={k} data-value={a.componentSum} data-tip="relative difference vs the engine dn/dV: {fmt(a.relDiff, 2)}">{fmt(a.componentSum, 4)}</td></tr>
		</tbody></table></div>
		<p class="muted small">Sum vs engine: {fmt(a.relDiff, 2)} relative.</p>
	{/if}{/each}
	{#if arms.A && (arms.A.gamma != null || mzm.tb != null)}
		<h4 data-tip={EO_FORMULAS.gamma}>Conventional overlap (comparison with papers)</h4>
		<table class="grid" data-eo-conventional><thead><tr><th>Arm</th><th data-tip="Edge-to-edge electrode gap of the arm from the geometry">gap (µm)</th><th data-tip={EO_FORMULAS.gamma}>Γ</th><th data-tip="|E_x|^2 variant: (Gamma / Ebar) int_EO E_c |E_x|^2 dA / int |E_x|^2 dA">Γ (E_x)</th><th data-tip="2 g |dn| / (n_e^3 r33)">Γ equiv.</th><th data-tip="Textbook VpiL of this arm alone, lambda / (n_e^3 r33 |Ebar|)">VπL tb (V·cm)</th></tr></thead><tbody>
			{#each ['A', 'B'] as const as k}{@const c = arms[k]}{#if c}
				<tr><td>{k}</td><td class="num">{c.gapUm == null ? '-' : fmt(c.gapUm, 4)}</td><td class="num" data-gamma={k}>{c.gamma == null ? '-' : fmt(c.gamma, 4)}</td><td class="num" data-gamma-ex={k} data-value={c.gammaEx}>{c.gammaEx == null ? '-' : fmt(c.gammaEx, 4)}</td><td class="num" data-gamma-equiv={k} data-value={c.gammaEquiv}>{c.gammaEquiv == null ? '-' : fmt(c.gammaEquiv, 4)}</td><td class="num" data-arm-vpil-tb={k} data-value={c.vpilTb}>{c.vpilTb == null ? '-' : fmt(c.vpilTb, 4)}</td></tr>
			{/if}{/each}
		</tbody></table>
		<table class="grid"><tbody>
			<tr data-tip={EO_FORMULAS.textbook}><td>implied textbook VπL</td><td class="num">{mzm.tb == null ? '-' : fmt(mzm.tb, 5)}</td><td class="muted">V·cm</td></tr>
			<tr data-tip="Textbook VpiL x n_eff,A / n_e needs the bulk n_e, which the sweep-point store does not carry; select Compute at these parameter values for it"><td>with n_eff / n_e factor</td><td class="num">-</td><td class="muted">V·cm</td></tr>
			<tr><td>engine / textbook</td><td class="num">{mzm.vpil != null && mzm.tb ? fmt(mzm.vpil / mzm.tb, 4) : '-'}</td><td></td></tr>
		</tbody></table>
		<p class="muted small">The engine perturbation result (top) is primary; Γ uses the edge-to-edge gap of each arm from the geometry and is shown for comparison with published values.</p>
	{/if}
	<details><summary>Formulas</summary>
		{#each Object.entries(EO_FORMULAS) as [k, f]}<p class="small"><span class="muted">{k}</span> <span class="mono">{f}</span></p>{/each}
		<p class="small mono">{F_VPIL}</p><p class="small mono">{F_ARM}</p></details>
	<p class="muted small">Values of {wb.solutionLabel(point)}, evaluated in that point's field solution: run globals, the arm mode's power confinement, and surface integrals of eo.integrand (and its Pockels-coefficient parts) over the arm window.</p>
{/if}

<style>
	.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
	.grid th, .grid td { padding: 3px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.grid tr.sum td { border-top: 1px solid var(--line); }
	.scroll { overflow-x: auto; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.warn { color: var(--warn); }
	details { margin-top: 8px; } summary { cursor: pointer; color: var(--ink-2); }
</style>
