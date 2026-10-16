<script lang="ts">
	// EO Coupling results (DevLog-030 P5): per-arm dn/V, push-pull balance, VpiL and Vpi, per-region breakdown, the
	// formulas (tooltips), and quick links to the EO overlap plot and the integrand along a cut line through the rib.
	import type { Workbench } from './workbench.svelte';
	import { newFeature } from './results.svelte';
	import type { DerivedResult, ModeRow } from './post/contract';
	import { fmt } from '../logic';
	import { meshBBox } from './fieldmath';
	import SolutionSelect from './SolutionSelect.svelte';
	import EoPoint from './EoPoint.svelte';

	let { wb }: { wb: Workbench } = $props();
	const r = $derived(wb.result);
	const eo = $derived(r?.eo ?? null);
	const R = $derived(wb.results);
	const lam = $derived(wb.runWavelengthUm);
	const armVpiL = (dn: number) => (lam != null && dn !== 0 ? (lam * 1e-4) / (2 * Math.abs(dn)) : null);
	const formulas = $derived((eo?.formulas ?? {}) as Record<string, string>);
	const F_PERT = $derived(formulas.engine ?? 'First-order perturbation (engine): dn_eff/V = (omega eps0 / (4 P k0)) int E* . d(eps)/dV . E dA, full tensor, power-normalized mode of the arm in the arm window.');
	const COMPONENTS = ['r33', 'r13', 'r22', 'r51', 'other'] as const;
	const TERMS = ['xx', 'yy', 'zz', 'xy'] as const;
	const F_VPIL = 'VpiL = lambda / (2 |dn_A - dn_B|) (DC, lossless, no RF mismatch); Vpi = VpiL / L with L = line.length_mm.';
	const F_ARM = 'Single-arm phase shifter: VpiL = lambda / (2 |dn_eff/dV|), not the MZM value.';
	const armSets = $derived(R.datasets.filter((d) => d.kind === 'arm'));
	/** X3: the arm's solved mode in the Mode Analysis index space ('k=1 (TE0)'), from the arm dataset (or the optical one it aliases). */
	function armMode(arm: 'A' | 'B'): string {
		const d = R.datasets.find((x) => x.kind === 'arm' && x.arm === arm);
		if (!d) return '';
		const id = d.aliasOf ?? d.id;
		const rows = wb.cache.get<ModeRow[]>(wb.post, R.gen, { op: 'modes', dataset: id })?.data;
		const row = rows?.find((m) => m.selected) ?? rows?.find((m) => m.k === d.mode);
		return row?.label ?? d.modeLabel ?? `k=${d.mode ?? 0}`;
	}
	const eoSet = (arm: 'A' | 'B') => R.datasets.find((d) => d.kind === 'eo' && d.arm === arm)?.id ?? '';
	const integrand = (ds: string) => (wb.has(ds, 'eo.integrand') ? 'eo.integrand' : 'eo.dnxx');
	const intensity = (ds: string) => R.intensityExpr(ds, (d, v) => wb.has(d, v));
	let busy = $state(false);
	let msg = $state('');

	function openOverlap() {
		const ds = eoSet('A') || armSets[0]?.id || R.datasets.find((d) => d.kind === 'opt')?.id;
		if (!ds) return;
		let g = R.groups.find((x) => x.auto === `eo:${ds}` || x.auto === `eoq:${ds}`);
		if (!g) {
			const ex = integrand(ds);
			g = R.addGroup('2d', ds, ex === 'eo.integrand' ? `EO Overlap (${R.dsLabel(ds)})` : `EO Overlap: Pockels dn_xx and mode (${R.dsLabel(ds)})`, [
				newFeature('surface', { expr: ex, unit: ex === 'eo.integrand' ? '1/(V*um^2)' : '1/V', table: 'Wave', range: { manual: false, min: 0, max: 1, scale: 'symmetric' } }),
				...(intensity(ds) ? [newFeature('contour', { expr: intensity(ds), unit: '', count: 6, coloring: 'uniform', color: '#000000', legend: false })] : [])
			], `eoq:${ds}`);
		}
		wb.view = g.id;
		wb.node = `pg:${g.id}`;
		wb.showWindows = true;
	}

	/** Horizontal cut line across the arm window at the height of the mode intensity maximum (through the rib). */
	async function cutThroughRib() {
		const ds = eoSet('A') || armSets[0]?.id || R.datasets.find((d) => d.kind === 'opt')?.id;
		const mesh = wb.meshOf(R.dataset(ds ?? ''));
		if (!ds || !wb.post || !mesh) return;
		busy = true;
		msg = '';
		try {
			const mx = await wb.post.request<DerivedResult>({ op: 'derived', req: { kind: 'surface_max', dataset: ds, expr: intensity(ds), mode: R.mode(ds) } });
			if (!mx.at) throw new Error('no maximum found');
			// The arm mesh covers the arm window.
			const b = meshBBox(mesh);
			const w = { x: [b.x0, b.x1], y: [b.y0, b.y1] };
			const cl = R.addCutLine(ds, { ax: w.x[0], ay: mx.at[1], bx: w.x[1], by: mx.at[1], n: 600 });
			cl.name = `Cut through rib (${R.dsLabel(ds)})`;
			const ex = integrand(ds);
			const g = R.addGroup('1d', '', `${ex === 'eo.integrand' ? 'EO integrand' : 'Pockels dn_xx'} along ${cl.name}`, [newFeature('linegraph', { dataset: cl.id, expr: ex, unit: ex === 'eo.integrand' ? '1/(V*um^2)' : '1/V' })]);
			wb.view = g.id;
			wb.node = `pg:${g.id}`;
			wb.addLog(`${cl.name}: y = ${mx.at[1].toPrecision(5)} µm (mode intensity maximum), x ${w.x[0]} to ${w.x[1]} µm`);
		} catch (e) {
			msg = e instanceof Error ? e.message : String(e);
		} finally {
			busy = false;
		}
	}
</script>

<SolutionSelect {wb} value={wb.eoPoint} onchange={(p) => (wb.eoPoint = p)} />
{#if wb.eoPoint >= 0}
	<EoPoint {wb} point={wb.eoPoint} />
{:else if !r || !eo}
	<p class="muted">No EO coupling result. Include the EO overlap stage and Compute.</p>
{:else}
	{#if wb.stale}<p class="notice">Inputs changed. These results belong to the previous run.</p>{/if}
	<div class="acts">
		<button onclick={openOverlap} disabled={!wb.post} data-tip="Open (or create) the EO Overlap plot group: {wb.has(armSets[0]?.id ?? '', 'eo.integrand') ? 'Surface of eo.integrand' : 'Surface of Pockels dn_xx (the engine does not export eo.integrand yet)'} with a contour of the mode intensity and the arm windows">EO overlap plot</button>
		<button onclick={cutThroughRib} disabled={!wb.post || busy} data-tip="Cut line across the arm window at the height of the mode intensity maximum (through the rib or strip), with a Line Graph of {wb.has(armSets[0]?.id ?? '', 'eo.integrand') ? 'eo.integrand' : 'eo.dnxx (no eo.integrand exported)'}">Integrand across arm</button>
	</div>
	{#if msg}<p class="err">{msg}</p>{/if}
	<h4>MZM</h4>
	<table class="grid"><tbody>
		<tr data-tip={F_VPIL}><td>VπL</td><td class="num" data-eo-vpil={eo.vpiLVcm}>{fmt(eo.vpiLVcm, 5)}</td><td class="muted">V·cm</td></tr>
		<tr data-tip={F_VPIL}><td>Vπ at L{eo.lengthMm != null ? ` = ${fmt(eo.lengthMm)} mm` : ''}</td><td class="num">{eo.vpiDcV == null ? '-' : fmt(eo.vpiDcV, 5)}</td><td class="muted">V</td></tr>
		<tr data-tip="d(phi_A - phi_B)/dV / k0 = dn_A - dn_B"><td>dn_A - dn_B</td><td class="num">{fmt(eo.dnEffPerVDifference, 5)}</td><td class="muted">1/V</td></tr>
		<tr data-tip="dn_B / dn_A; -1 = ideal push-pull"><td>push-pull balance</td><td class="num" data-eo-balance={eo.pushPullBalance}>{eo.pushPullBalance == null ? '-' : fmt(eo.pushPullBalance, 5)}</td><td class="muted">{eo.pushPullBalanceDeviates ? 'deviates from -1' : ''}</td></tr>
		<tr data-tip="(dn_A - dn_B) / dn_A"><td>gain vs arm A alone</td><td class="num">{eo.armGainVsArmA == null ? '-' : fmt(eo.armGainVsArmA, 5)}</td><td></td></tr>
	</tbody></table>
	<p class="muted small" data-eo-convention={eo.compatibleVpiConventions.join(' ')}>{eo.drive.replaceAll('_', ' ')}, terminal {eo.terminalDrive.replaceAll('_', ' ')}; Vπ targets comparable with: {eo.compatibleVpiConventions.join(', ').replaceAll('_', ' ') || 'no catalogue convention'}{eo.lengthMm == null ? '; no line length, Vπ not computed' : ''}.</p>
	{#if eo.pushPullBalanceDeviates}<p class="warn small" data-balance-warning={eo.pushPullBalance}>dn_B/dn_A = {fmt(eo.pushPullBalance, 4)} deviates from -1 by more than {fmt(eo.pushPullBalanceTolerance)}; the field-resolved Vπ is still the MZM value.</p>{/if}
	<h4>Per arm</h4>
	<table class="grid"><thead><tr><th>Arm</th><th>n_eff</th><th data-tip={F_PERT}>dn/dV (1/V)</th><th data-tip={F_ARM}>VπL arm (V·cm)</th><th data-tip="Mode solver and order of the arm mode">mode</th></tr></thead><tbody>
		{#each ['A', 'B'] as const as k}{@const a = eo.arms[k]}{#if a}
			<tr><td>{k}</td><td class="num">{fmt(a.neff, 6)}</td><td class="num" data-tip={F_PERT} data-arm-dn={k} data-value={a.dnEffPerV}>{fmt(a.dnEffPerV, 5)}</td><td class="num" data-arm-vpil={k}>{fmt(armVpiL(a.dnEffPerV), 4)}</td><td class="muted small" data-arm-mode={k}>{armMode(k)}, {a.solver}{a.order ? ` P${a.order}` : ''}</td></tr>
		{/if}{/each}
	</tbody></table>
	{#each ['A', 'B'] as const as k}{@const a = eo.arms[k]}{#if a?.byRegion}
		<h4>Arm {k} by region</h4>
		<table class="grid"><thead><tr><th>Region</th><th data-tip="Fraction of the mode power in the region (confinement factor)">power fraction</th><th data-tip="Contribution of the region to dn_eff/dV (all tensor components)">dn/dV (1/V)</th></tr></thead><tbody>
			{#each Object.entries(a.byRegion) as [name, v]}<tr><td>{name}</td><td class="num">{fmt(v.powerFraction, 4)}</td><td class="num">{fmt(v.dnEffPerV, 4)}</td></tr>{/each}
		</tbody></table>
	{/if}{/each}
	{#each ['A', 'B'] as const as k}{@const a = eo.arms[k]}{#if a?.breakdown}
		{@const bd = a.breakdown}
		<h4>Arm {k} by Pockels coefficient and region</h4>
		<div class="scroll"><table class="grid small" data-eo-breakdown={k}><thead><tr><th data-tip={formulas.components ?? ''}>region</th>{#each COMPONENTS as c}<th>{c}</th>{/each}<th>all (1/V)</th></tr></thead><tbody>
			{#each Object.entries(bd.byRegion) as [name, v]}<tr><td>{name}</td>{#each COMPONENTS as c}<td class="num">{fmt(v[c], 3)}</td>{/each}<td class="num">{fmt(v.all, 4)}</td></tr>{/each}
			<tr class="sum"><td>total</td>{#each COMPONENTS as c}<td class="num">{fmt(bd.byComponent[c], 3)}</td>{/each}<td class="num" data-tip="relative difference vs the engine dn/dV: {fmt(bd.relativeDifferenceVsEngine, 2)}">{fmt(bd.componentSum, 4)}</td></tr>
		</tbody></table></div>
		<p class="muted small" data-tip={bd.method}>Lab tensor terms: {TERMS.map((t) => `${t} ${fmt(bd.byTensorTerm[t], 3)}`).join(', ')} (1/V). Sum vs engine: {fmt(bd.relativeDifferenceVsEngine, 2)} relative.</p>
	{/if}{/each}
	{#if eo.arms.A?.conventional}
		<h4 data-tip={formulas.gamma ?? ''}>Conventional overlap (comparison with papers)</h4>
		<table class="grid" data-eo-conventional><thead><tr><th>Arm</th><th data-tip="Edge-to-edge electrode gap of the arm from the geometry">gap (µm)</th><th data-tip={formulas.gamma ?? 'Gamma = (g / V) int E_c |E_opt|^2 dA / int |E_opt|^2 dA'}>Γ</th><th data-tip="|E_x|^2 variant">Γ (E_x)</th><th data-tip="2 g |dn| / (n_e^3 r33)">Γ equiv.</th><th data-tip="Textbook VpiL of this arm alone">VπL tb (V·cm)</th></tr></thead><tbody>
			{#each ['A', 'B'] as const as k}{@const c = eo.arms[k]?.conventional}{#if c}
				<tr data-tip={c.reason ?? `${c.gapElectrodes?.left ?? ''} | ${c.gapElectrodes?.right ?? ''}; n_e ${fmt(c.ne)}, r33 ${fmt(c.r33PmPerV)} pm/V, ${c.eoRegion ?? ''}`}><td>{k}</td><td class="num">{c.gapUm == null ? '-' : fmt(c.gapUm, 4)}</td><td class="num" data-gamma={k}>{c.gamma == null ? '-' : fmt(c.gamma, 4)}</td><td class="num">{c.gammaEx == null ? '-' : fmt(c.gammaEx, 4)}</td><td class="num">{c.gammaEquiv == null ? '-' : fmt(c.gammaEquiv, 4)}</td><td class="num">{c.vpiLVcmTextbook == null ? '-' : fmt(c.vpiLVcmTextbook, 4)}</td></tr>
			{/if}{/each}
		</tbody></table>
		{#if eo.conventional}
			<table class="grid"><tbody>
				<tr data-tip={formulas.textbook ?? ''}><td>implied textbook VπL</td><td class="num">{eo.conventional.vpiLVcmTextbook == null ? '-' : fmt(eo.conventional.vpiLVcmTextbook, 5)}</td><td class="muted">V·cm</td></tr>
				<tr data-tip="Textbook VpiL x n_eff,A / n_e (DevLog-033)"><td>with n_eff / n_e factor</td><td class="num">{eo.conventional.vpiLVcmNeffFactor == null ? '-' : fmt(eo.conventional.vpiLVcmNeffFactor, 5)}</td><td class="muted">V·cm</td></tr>
				<tr><td>engine / textbook</td><td class="num">{eo.conventional.engineOverTextbook == null ? '-' : fmt(eo.conventional.engineOverTextbook, 4)}</td><td></td></tr>
			</tbody></table>
			{#if eo.conventional.materialNote}<p class="muted small">{eo.conventional.materialNote}</p>{/if}
		{/if}
		<p class="muted small">The engine perturbation result (top) is primary; Γ uses the edge-to-edge gap of each arm from the geometry and is shown for comparison with published values.</p>
	{/if}
	<details><summary>Formulas</summary>
		{#each Object.entries(formulas) as [k, f]}<p class="small"><span class="muted">{k}</span> <span class="mono">{f}</span></p>{/each}
		<p class="small mono">{F_VPIL}</p><p class="small mono">{F_ARM}</p><p class="small muted">Convention: {eo.convention}</p></details>
{/if}

<style>
	.scroll { overflow-x: auto; }
	.grid tr.sum td { border-top: 1px solid var(--line); }
	.acts { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
	.acts button { height: 22px; border-radius: 0; }
	.grid { width: 100%; border-collapse: collapse; margin: 4px 0; }
	.grid th, .grid td { padding: 3px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.notice { color: var(--warn); }
	.warn { color: var(--warn); }
	.err { color: var(--crit); }
	details { margin-top: 8px; } summary { cursor: pointer; color: var(--ink-2); }
	button:disabled { opacity: 0.5; cursor: default; }
</style>
