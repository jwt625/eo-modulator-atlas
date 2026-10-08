<script lang="ts">
  import type { SimulationResult } from '../../../engine/src/run.mjs';
  import Plot from './Plot.svelte';
  import { ui } from './state.svelte';
  import { plotTheme } from './colors';
  import { fmt } from './logic';

  let { result }: { result: SimulationResult } = $props();
  let logF = $state(false);
  const th = $derived(plotTheme(ui.theme));
  const eo = $derived(result.eo);
  const rf = $derived(result.rf);
  const sweep = $derived(rf?.sweep ?? null);
  const loss = (l: number | { sigmaSm: number; epsR: number } | null) =>
    l == null ? 'none' : typeof l === 'number' ? `tan δ ${fmt(l)}` : `σ ${fmt(l.sigmaSm)} S/m, εr ${fmt(l.epsR)}`;
  // Three small multiples sharing the frequency axis (one measure per axis, no dual y-scale).
  const rows = [
    { key: 'alphaDbPerCm', label: 'α (dB/cm)', tip: 'α: %{y:.4g} dB/cm' },
    { key: 'nRf', label: 'n RF', tip: 'n RF: %{y:.5g}' },
    { key: 'z0ReOhm', label: 'Re Z₀ (Ω)', tip: 'Re Z₀: %{y:.4g} Ω' }
  ] as const;
  const traces = $derived(sweep ? rows.map((r, i) => ({
    type: 'scatter', mode: sweep.fGhz.length > 1 ? 'lines+markers' : 'markers', x: sweep.fGhz, y: sweep[r.key],
    xaxis: 'x', yaxis: i ? `y${i + 1}` : 'y', line: { color: th.accent, width: 2 }, marker: { color: th.accent, size: 8 },
    hovertemplate: `%{x:.4g} GHz<br>${r.tip}<extra></extra>`
  })) : []);
  const axis = (label: string, domain: number[]) => ({
    title: { text: label, standoff: 4 }, domain, gridcolor: th.grid, linecolor: th.line, zeroline: false, automargin: true, tickfont: { size: 10 }
  });
  const layout = $derived({
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', showlegend: false,
    margin: { l: 8, r: 12, t: 6, b: 8 }, font: { family: 'system-ui, sans-serif', size: 11, color: th.ink2 },
    hoverlabel: { bgcolor: th.surface, bordercolor: th.line, font: { color: th.ink, size: 11 } }, hovermode: 'x',
    xaxis: { title: { text: 'Frequency (GHz)', standoff: 4 }, type: logF ? 'log' : 'linear', anchor: 'y3', gridcolor: th.grid, linecolor: th.line, automargin: true, tickfont: { size: 10 } },
    yaxis: { ...axis(rows[0].label, [0.70, 1]), anchor: 'x' },
    yaxis2: { ...axis(rows[1].label, [0.36, 0.64]), anchor: 'x' },
    yaxis3: { ...axis(rows[2].label, [0, 0.30]), anchor: 'x' }
  });
</script>

{#if eo}
  <h3>EO overlap (DC, first-order Pockels, scalar mode)</h3>
  <div class="table-scroll"><table data-eo-arms>
    <thead><tr><th>Arm</th><th>Window x, y (µm)</th><th>n eff</th><th title="d n_eff / d V_t, signed">dn/dV (1/V)</th><th title="Squared scalar mode within the margin of a Dirichlet window side">Edge fraction</th></tr></thead>
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
    <div class="caption"><span>Sweep · {sweep.fGhz.length} points</span><label><input type="checkbox" bind:checked={logF} /> log f</label></div>
    <div class="plot" aria-label="RF sweep"><Plot data={traces} {layout} /></div>
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
  h3 { font-size: 12px; margin-top: 18px; }
  .table-scroll { overflow: auto; } table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px; text-align: left; border-bottom: 1px solid var(--border); } th { color: var(--ink-3); }
  .caption { display: flex; justify-content: space-between; gap: 8px; padding: 8px 0; color: var(--ink-3); }
  label { display: flex; align-items: center; gap: 6px; }
  .plot { height: 420px; min-width: 0; }
  details { margin-top: 8px; } summary { cursor: pointer; color: var(--ink-2); }
  p { line-height: 1.6; overflow-wrap: anywhere; }
  .warn { color: var(--warn); }
</style>
