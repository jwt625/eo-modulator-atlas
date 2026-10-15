<script lang="ts">
	import type { SimulationResult } from '../../../engine/src/run.mjs';
	import LinePlot from './sim/LinePlot.svelte';
	import { fmt } from './logic';

	let { result, part = 'all' }: { result: SimulationResult; part?: 'eo' | 'rf' | 'all' } = $props();
	const eo = $derived(part !== 'rf' ? result.eo : null);
	const rf = $derived(part !== 'eo' ? result.rf : null);
	const sweep = $derived(rf?.sweep ?? null);
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
		<thead><tr><th>Arm</th><th>Window x, y (µm)</th><th>n eff</th><th title="d n_eff / d V_t, signed">dn/dV (1/V)</th><th title="Squared mode within the margin of a Dirichlet window side">Edge fraction</th></tr></thead>
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
		<p class="warn" data-balance-warning={eo.pushPullBalance} title="The field-resolved Vπ is still the MZM value; the arms are far from a symmetric push-pull pair">dn_B/dn_A = {fmt(eo.pushPullBalance, 4)} deviates from −1 by more than {fmt(eo.pushPullBalanceTolerance)}.</p>
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
			<p class="warn" data-wheeler-flag title="Step-check spread is an uncertainty proxy, not a bound">Spread above {fmt(rf.wheeler.spreadWarningLevel)}: frequency targets are evaluated and flagged.</p>
		{/if}
	{/if}
	{#if rf.dielectricModel === 'tan_delta_regions'}
		<div class="table-scroll"><table>
			<thead><tr><th>Region</th><th>Material</th><th title="Electric energy fraction of the section">Energy fraction</th><th>Loss</th></tr></thead>
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
