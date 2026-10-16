<script lang="ts">
	import type { SimulationResult } from '../../../engine/src/run.mjs';
	import LinePlot from './sim/LinePlot.svelte';
	import { fmt } from './logic';
	import { responseNotices } from './sim/labels';

	let { result, part = 'all' }: { result: SimulationResult; part?: 'eo' | 'rf' | 'all' } = $props();
	const eo = $derived(part !== 'rf' ? result.eo : null);
	const rf = $derived(part !== 'eo' ? result.rf : null);
	const sweep = $derived(rf?.sweep ?? null);
	// DevLog-036: periodic loaded line (Bloch cell) and traveling-wave EO response.
	const ll = $derived(part !== 'eo' ? (result.loaded ?? null) : null);
	const resp = $derived(part !== 'eo' ? (result.response ?? null) : null);
	// DevLog-042: reference / normalization and model diagnostics of the response (engine fields and target diagnostics)
	const notices = $derived(resp ? responseNotices(result) : []);
	const bwText = (b: { status: string; fGhz?: number; boundGhz?: number } | undefined) =>
		!b ? '-' : b.status === 'found' ? `${fmt(b.fGhz ?? null, 4)} GHz` : b.status === 'no_crossing' ? `> ${fmt(b.boundGhz ?? null)} GHz (no crossing in the sweep)` : b.status.replaceAll('_', ' ');
	const loss = (l: number | { sigmaSm: number; epsR: number } | null) =>
		l == null ? 'none' : typeof l === 'number' ? `tan δ ${fmt(l)}` : `σ ${fmt(l.sigmaSm)} S/m, εr ${fmt(l.epsR)}`;
	// Three small multiples sharing the frequency axis (one measure per axis, no dual y-scale).
	const rows = [
		{ key: 'alphaDbPerCm', label: 'α (dB/cm)' },
		{ key: 'nRf', label: 'n RF' },
		{ key: 'z0ReOhm', label: 'Re Z₀ (Ω)' }
	] as const;
</script>

{#if eo}
	<h3>EO overlap (DC, first-order Pockels, {result.opticalSolver === 'vector' ? 'vector' : 'scalar'} mode)</h3>
	<div class="table-scroll"><table data-eo-arms>
		<thead><tr><th>Arm</th><th>Window x, y (µm)</th><th>n eff</th><th data-tip="d n_eff / d V_t, signed">dn/dV (1/V)</th><th data-tip="Squared mode within the margin of a Dirichlet window side">Edge fraction</th></tr></thead>
		<tbody>{#each (['A', 'B'] as const) as k}{@const a = eo.arms[k]}{#if a}<tr>
			<td>{k}</td><td class="num">{a.window.x_um.join('…')}, {a.window.y_um.join('…')}</td><td class="num">{fmt(a.neff, 6)}</td>
			<td class="num" data-arm-dn={k} data-value={a.dnEffPerV}>{fmt(a.dnEffPerV, 4)}</td><td class="num">{fmt(a.boundaryMarginFraction?.value ?? null)}</td>
		</tr>{/if}{/each}</tbody>
	</table></div>
	<p class="muted" data-eo-convention={eo.compatibleVpiConventions.join(' ')}>
		{eo.drive.replaceAll('_', ' ')} · terminal {eo.terminalDrive.replaceAll('_', ' ')} ·
		{#if eo.pushPullBalance != null}dn_B/dn_A {fmt(eo.pushPullBalance, 4)} · {/if}
		Vπ targets comparable with: {eo.compatibleVpiConventions.join(', ').replaceAll('_', ' ') || 'no catalogue convention'}
		{#if eo.lengthMm == null} · no line length, Vπ not computed{:else} · L = {fmt(eo.lengthMm)} mm per arm{/if}
	</p>
	{#if eo.pushPullBalanceDeviates}
		<p class="warn" data-balance-warning={eo.pushPullBalance} data-tip="The field-resolved Vπ is still the MZM value; the arms are far from a symmetric push-pull pair">dn_B/dn_A = {fmt(eo.pushPullBalance, 4)} deviates from −1 by more than {fmt(eo.pushPullBalanceTolerance)}.</p>
	{/if}
{/if}

{#if rf}
	<h3>RF line (uniform quasi-TEM section)</h3>
	<p class="muted" data-rf-source={rf.lossSource}>
		Conductor {rf.conductorModel.replaceAll('_', ' ')}{rf.sigmaSm != null ? ` · σ ${fmt(rf.sigmaSm)} S/m` : ''}
		· dielectric {(rf.dielectricModel ?? 'in paper attenuation').replaceAll('_', ' ')}
		· {rf.independentPrediction ? 'model prediction' : 'configured loss input, not a prediction'}
		{#if rf.paper} · {rf.paper.citation}{/if}
	</p>
	{#if rf.wheeler}
		<p class="muted" data-wheeler-spread={rf.wheeler.maxRelativeSpread}>Wheeler R′ {fmt(rf.wheeler.rPrimeOhmPerM, 5)} Ω/m at {fmt(rf.wheeler.fRefGhz)} GHz (recess δ/2 = {fmt(rf.wheeler.halfSkinDepthUm)} µm), scaled with R<sub>s</sub>; step check over {rf.wheeler.scales.join(', ')} × δ/2: relative spread {fmt(rf.wheeler.maxRelativeSpread, 2)}.</p>
		{#if rf.wheeler.maxRelativeSpread > rf.wheeler.spreadWarningLevel}
			<p class="warn" data-wheeler-flag data-tip="Step-check spread is an uncertainty proxy, not a bound">Spread above {fmt(rf.wheeler.spreadWarningLevel)}: frequency targets are evaluated and flagged.</p>
		{/if}
	{/if}
	{#if rf.dielectricModel === 'tan_delta_regions'}
		<div class="table-scroll"><table>
			<thead><tr><th>Region</th><th>Material</th><th data-tip="Electric energy fraction of the section">Energy fraction</th><th>Loss</th></tr></thead>
			<tbody>{#each rf.regions as r}<tr><td>{r.name}</td><td>{r.material}</td><td class="num">{fmt(r.energyFraction, 4)}</td><td>{loss(r.loss)}</td></tr>{/each}</tbody>
		</table></div>
	{/if}
	{#if sweep}
		<div class="caption"><span>Sweep · {sweep.fGhz.length} points</span></div>
		<div class="plots" aria-label="RF sweep">
			{#each rows as r, i}
				<LinePlot series={[{ name: r.label, x: sweep.fGhz, y: sweep[r.key], markers: sweep.fGhz.length <= 40 }]} xLabel="Frequency (GHz)" yLabel={r.label}
					height={170} ariaLabel={`RF sweep ${r.label}`} filename={`${result.id}-rf-${r.key}`} />
			{/each}
		</div>
		<details><summary>Sweep table</summary><div class="table-scroll"><table data-rf-sweep>
			<thead><tr><th>f (GHz)</th><th>α (dB/cm)</th><th>n RF</th><th>Re Z₀ (Ω)</th><th>Im Z₀ (Ω)</th></tr></thead>
			<tbody>{#each sweep.fGhz as f, i}<tr><td class="num">{fmt(f, 5)}</td><td class="num">{fmt(sweep.alphaDbPerCm[i], 5)}</td><td class="num">{fmt(sweep.nRf[i], 6)}</td><td class="num">{fmt(sweep.z0ReOhm[i], 5)}</td><td class="num">{fmt(sweep.z0ImOhm[i], 4)}</td></tr>{/each}</tbody>
		</table></div></details>
	{:else}<p class="muted">No sweep configured; values are computed at target frequencies only.</p>{/if}
	{#if rf.atTargets.length}
		<div class="table-scroll"><table data-rf-targets>
			<thead><tr><th>Target f (GHz)</th><th>α (dB/cm)</th><th>n RF</th><th>Re Z₀ (Ω)</th></tr></thead>
			<tbody>{#each rf.atTargets as p}<tr><td class="num">{fmt(p.fGhz, 5)}</td><td class="num" data-rf-alpha={p.fGhz} data-value={p.alphaDbPerCm}>{fmt(p.alphaDbPerCm, 5)}</td><td class="num">{fmt(p.nRf, 6)}</td><td class="num">{fmt(p.z0ReOhm, 5)}</td></tr>{/each}</tbody>
		</table></div>
	{/if}
{/if}

{#if ll}
	<h3>Loaded line (periodic, exact distributed Bloch cell)</h3>
	<p class="muted" data-loaded-model={ll.sectionModel}>
		Period {fmt(ll.periodUm)} µm = loaded {fmt(ll.loadedLengthUm)} µm ({ll.cuts.loaded}) + unloaded {fmt(ll.unloadedLengthUm)} µm ({ll.cuts.unloaded})
		· {ll.sectionModel === 't_rail_capacitive_loading' ? `loading conductors ${ll.loadingConductors.join(', ')}: L′ and R′ of the unloaded cut` : 'no loading conductors: each cut its own L′'}
		{#if !ll.railsIdentical && ll.loadingConductors.length} · <span class="warn">rails differ between the cuts</span>{/if}
	</p>
	<div class="table-scroll"><table data-loaded-perlength>
		<thead><tr><th>Section</th><th>C′ (pF/m)</th><th>C0′ (pF/m)</th><th>L′ (nH/m)</th></tr></thead>
		<tbody>
			<tr><td>unloaded</td><td class="num">{fmt(ll.perLength.unloaded.cPfPerM, 5)}</td><td class="num">{fmt(ll.perLength.unloaded.c0PfPerM, 5)}</td><td class="num">{fmt(ll.perLength.unloaded.lNhPerM, 5)}</td></tr>
			<tr><td>loaded</td><td class="num">{fmt(ll.perLength.loaded.cPfPerM, 5)}</td><td class="num">{fmt(ll.perLength.loaded.c0PfPerM, 5)}</td><td class="num">{fmt(ll.perLength.loaded.lNhPerM, 5)}</td></tr>
			<tr><td>period average</td><td class="num">{fmt(ll.perLength.average.cPfPerM, 5)}</td><td></td><td class="num">{fmt(ll.perLength.average.lNhPerM, 5)}</td></tr>
		</tbody>
	</table></div>
	<p class="muted" data-bloch-qs={ll.quasiStatic.nRf} data-tip="f -> 0 lossless limits; compared with static n_rf and z0_ohm targets of the periodic line">
		Quasi-static Bloch n {fmt(ll.quasiStatic.nRf, 5)} · Z {fmt(ll.quasiStatic.zOhm, 5)} Ω · Bragg {fmt(ll.braggGhz, 5)} GHz{ll.braggGap ? '' : ' (no stopband)'}
	</p>
	{#if ll.loss}<p class="muted" data-loaded-loss="declared">Lossy Bloch quantities (declared loss model). Loss: conductor {ll.loss.conductorModel.replaceAll('_', ' ')}, dielectric {(ll.loss.dielectricModel ?? '-').replaceAll('_', ' ')} · loaded-section R′ {ll.loss.loadedSectionConductor.replaceAll('_', ' ')}</p>
	{:else}<p class="warn" data-loaded-loss="none">Lossless Bloch quantities only: {ll.lossReason}</p>{/if}
	<p class="muted small">{ll.reference}</p>
{/if}

{#if resp}
	<h3>EO response (traveling wave, small signal)</h3>
	<p class="muted" data-response-line={resp.lineKind}>
		{resp.lineKind === 'loaded_line_exact_cascade' ? `Loaded line, exact cascade of ${resp.nSections} sections` : resp.lineKind === 'loaded_line_bloch' ? 'Loaded line (Bloch γ, Z, homogenised)' : (resp.lineKind as string) === 'junction_loaded_rf_line' ? 'Junction-loaded RF line (semiconductor stage at the operating bias, Shin 2011 branch)' : 'Uniform RF line'} · L {fmt(resp.lengthMm)} mm · Z_s {fmt(resp.sourceOhm)} Ω · Z_L {fmt(resp.loadOhm)} Ω
		· n_g {fmt(resp.ngOpt, 5)} ({resp.ngSource.replaceAll('_', ' ')}){#if resp.vpiDcV != null} · Vπ DC {fmt(resp.vpiDcV, 4)} V{/if}
	</p>
	<div class="table-scroll"><table data-response-bw>
		<thead><tr><th data-tip="20 log10 |H| relative to the DC limit of the model">Bandwidth (DC reference)</th><th>Value</th></tr></thead>
		<tbody>
			<tr><td>-3 dB</td><td class="num" data-bw3={resp.bw3dbGhz ?? ''}>{bwText(resp.bandwidth.bw3db_ghz)}</td></tr>
			<tr><td>-6 dB</td><td class="num" data-bw6={resp.bw6dbGhz ?? ''}>{bwText(resp.bandwidth.bw6db_ghz)}</td></tr>
		</tbody>
	</table></div>
	{#if resp.braggWithin3x}<p class="warn" data-bragg-warning>Bragg frequency {fmt(resp.braggGhz, 5)} GHz is within 3x of the highest evaluated frequency ({fmt(resp.highestEvaluatedGhz, 4)} GHz).</p>{/if}
	{#each notices as n}<p class={n.level === 'warn' ? 'warn' : 'muted'} data-notice={n.code} data-thin-conductor={n.code === 'thin_conductor' ? resp.thinConductorBelowGhz : undefined} data-tip={n.tip || undefined}>{n.text}</p>{/each}
	<p class="muted small" data-tip={String(resp.convention.vpiRf ?? '')}>{String(resp.convention.db ?? '')}. RF Vπ(f) = Vπ DC / |H(f)| (amplitude of V_s Z_L / (Z_s + Z_L)). Plot: EO Response plot group.</p>
{/if}

<style>
	h3 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	.table-scroll { overflow: auto; } table { width: 100%; border-collapse: collapse; }
	th, td { padding: 3px 4px; text-align: left; border-bottom: 1px solid var(--border); } th { color: var(--ink-3); font-weight: 500; }
	.caption { display: flex; justify-content: space-between; gap: 8px; padding: 6px 0; color: var(--ink-3); }
	.plots { display: grid; gap: 2px; min-width: 0; }
	details { margin-top: 8px; } summary { cursor: pointer; color: var(--ink-2); }
	p { line-height: 1.5; margin: 6px 0; overflow-wrap: anywhere; font-size: 11px; }
	.warn { color: var(--warn); }
</style>
