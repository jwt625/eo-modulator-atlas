// Cross-section runner shared by Node and the browser worker. No results are persisted.
import { parseConfig, opticalOptions, eoOptions, rfOptions, checkArmWindows, crossSectionOf, STAGES, IMPLEMENTED_STAGES, VPI_METRICS } from './config.mjs';
import { solveElectrostatics } from './electrostatics.mjs';
import { buildOpticalModel, solveModesAt, groupIndex } from './optics.mjs';
import { runEoStage, runRfStage, RF_FREQUENCY_METRICS, WHEELER_SPREAD_WARNING } from './stages.mjs';

const STATIC_RF = ['n_rf', 'z0_ohm', 'c_pul_pf_per_m', 'c0_pul_pf_per_m', 'l_pul_nh_per_m'];
const RESPONSE = ['eo_rolloff_db', 'bw3db_ghz', 'bw6db_ghz'];

function frequencyReason(target, topology, rf) {
  if (RESPONSE.includes(target.metric) || VPI_METRICS.includes(target.metric)) return 'Frequency response targets require the eo_response stage, which is not implemented.';
  if (!RF_FREQUENCY_METRICS.includes(target.metric)) return 'A frequency-specific value of this metric is not computed.';
  if (!rf) return 'Frequency-specific RF targets require the rf_line stage.';
  if (topology !== 'none') return topology === 'periodic_t_rail'
    ? 'Periodic-line target needs the loaded-line model; a single cross-section is not comparable.'
    : 'Line topology is unspecified; uniform-line target comparison requires line.loading.type: none.';
  if (!rf.independentPrediction) return rf.lossSource === 'paper_input'
    ? 'The RF line uses the paper attenuation as an input; its values are not independent predictions.'
    : 'The RF line uses a configured conductor resistance (rprime_reference); its values are not independent predictions.';
  if (target.metric === 'rf_loss_db_per_cm' && rf.conductorModel === 'none') return 'Conductor loss is declared none; the attenuation is not a conductor-loss prediction.';
  return null;
}

/**
 * Compare paper targets with computed metrics. A target is evaluated only when the metric is an independent prediction of
 * the requested stages under a matching convention; everything else is `not_evaluated` with the reason.
 * @param {any[]} targets
 * @param {Record<string, number>} metrics
 * @param {{topology?:string, section?:string, fixedGroupIndex?:boolean, eo?:any, rf?:any}} [context]
 *   eo: result.eo of the eo_overlap stage (compatibleVpiConventions); rf: result.rf of the rf_line stage (atTargets).
 */
export function compareTargets(targets, metrics, { topology = 'unspecified', section = 'geometry', fixedGroupIndex = false, eo = null, rf = null } = {}) {
  return targets.map((target) => {
    const staticRf = STATIC_RF.includes(target.metric);
    const vpi = VPI_METRICS.includes(target.metric);
    let reason = null;
    let value = null;
    let diagnostic = null;
    if (target.source?.comparable === false) reason = 'The config marks this target comparable: false (source.comparable).';
    else if (section !== 'geometry') reason = 'Alternate cross-section; targets apply to the configured device.';
    else if (target.at_ghz != null) {
      reason = frequencyReason(target, topology, rf);
      if (!reason) {
        const point = rf.atTargets.find((p) => p.fGhz === target.at_ghz);
        value = target.metric === 'rf_loss_db_per_cm' ? point.alphaDbPerCm : target.metric === 'n_rf' ? point.nRf : point.z0ReOhm;
        if (!Number.isFinite(value)) { reason = 'Metric was not computed by the requested cross-section stages.'; value = null; }
        // Q2 M2: evaluated, but flagged when the Wheeler step check exceeds its warning level.
        else if (rf.wheeler && rf.wheeler.maxRelativeSpread > WHEELER_SPREAD_WARNING)
          diagnostic = `Wheeler step-check relative spread ${rf.wheeler.maxRelativeSpread.toPrecision(3)} exceeds ${WHEELER_SPREAD_WARNING}; the conductor resistance is numerically uncertain at about that level (step-check proxy, not a bound).`;
      }
    }
    else if (RESPONSE.includes(target.metric)) reason = 'Frequency response targets require the eo_response stage, which is not implemented.';
    else if (staticRf && topology !== 'none') reason = topology === 'periodic_t_rail'
      ? 'Periodic-line target needs the loaded-line model; a single cross-section is not comparable.'
      : 'Line topology is unspecified; uniform-line target comparison requires line.loading.type: none.';
    else if (target.metric === 'ng_opt' && fixedGroupIndex) reason = 'Group index is a configured input, not an independent prediction.';
    else if (vpi && target.vpi_convention == null) reason = 'Vpi target has no vpi_convention; the engine does not guess the arm or push-pull factor.';
    else if (vpi && eo && !eo.compatibleVpiConventions.includes(target.vpi_convention)) reason = `Target vpi_convention ${target.vpi_convention} does not match the engine result (${eo.drive}, ${eo.terminalDrive}; comparable with ${eo.compatibleVpiConventions.join(', ') || 'no catalogue convention'}).`;
    else if (target.metric === 'vpi_dc_v' && eo && eo.lengthMm == null) reason = 'line.length_mm is not set; only the Vpi-length product is computed.';
    else if (!Object.hasOwn(metrics, target.metric) || !Number.isFinite(metrics[target.metric])) reason = 'Metric was not computed by the requested cross-section stages.';
    else value = metrics[target.metric];
    if (reason) { value = null; diagnostic = null; }
    const tolerance = Math.max(target.tol_abs ?? 0, Math.abs(target.value) * (target.tol_rel ?? 0));
    return { ...target, actual: value, tolerance, reason, diagnostic,
      status: value == null ? 'not_evaluated' : Math.abs(value - target.value) <= tolerance ? 'pass' : 'fail' };
  });
}

/** Requested stage list in STAGES order; electrostatics always runs. */
export function resolveStages({ stages = null, optical = false } = {}) {
  if (typeof optical !== 'boolean') throw new Error('optical must be a boolean');
  if (stages != null && !Array.isArray(stages)) throw new Error('stages must be an array of stage names');
  const wanted = new Set(['electrostatics', ...(stages ?? []), ...(optical ? ['optical_mode'] : [])]);
  for (const s of wanted) {
    if (!STAGES.includes(s)) throw new Error(`Unknown stage: ${s} (expected one of ${STAGES.join(', ')})`);
    if (!IMPLEMENTED_STAGES.includes(s)) throw new Error(`Stage ${s} is not implemented in this engine`);
  }
  return STAGES.filter((s) => wanted.has(s));
}

/**
 * Run the requested cross-section stages.
 * @param {string} text YAML/JSON config
 * @param {{section?:string, stages?:string[], optical?:boolean, meshScale?:number, onProgress?:(m:string)=>void}} [options]
 *   stages: subset of the implemented stages (electrostatics always runs); optical: true adds optical_mode (legacy flag).
 */
export function runCrossSection(text, { section: name = 'geometry', stages: requested = null, optical = false, meshScale = 1, onProgress = () => {} } = {}) {
  const run = resolveStages({ stages: requested, optical });
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.5 || meshScale > 4) throw new Error('meshScale must be between 0.5 and 4');
  const config = parseConfig(text);
  if (!Object.hasOwn(config.geometries, name)) throw new Error(`Unknown cross-section: ${name}`);
  const section = crossSectionOf(config, name);
  const wants = (s) => run.includes(s);
  // Input checks of every requested stage happen before any solve.
  const opts = wants('optical_mode') || wants('eo_overlap') ? opticalOptions(config.raw) : null;
  const eo = wants('eo_overlap') ? eoOptions(config.raw, config.geometries) : null;
  if (eo) checkArmWindows(eo, section);
  const rf = wants('rf_line') ? rfOptions(config.raw, config.materials, config.geometries[name], name) : null;
  const started = performance.now();
  onProgress('Meshing and solving electrostatics');
  const es = solveElectrostatics(section, { resolvedMaterials: config.materials, meshScale });
  const metrics = { c_pul_pf_per_m: es.cPul * 1e12, c0_pul_pf_per_m: es.c0Pul * 1e12, l_pul_nh_per_m: es.lPul * 1e9, n_rf: es.nRf, z0_ohm: es.z0 };
  const warnings = ['quasi_static_2d_rf', 'finite_domain_boundary', 'no_3d_launch_pad_effects'];
  const stages = ['electrostatics'];
  let opticalResult = null;
  let reuse = null;
  if (wants('optical_mode')) {
    onProgress('Meshing and solving the scalar optical mode');
    const model = buildOpticalModel(section, config.materials, { ...opts, meshScale });
    const modeIndex = opts.modeIndex;
    const lambda = opts.lambda0Um;
    let base;
    if (config.raw.optics.group_index_from === 'fixed') {
      base = solveModesAt(model, lambda, { numModes: modeIndex + 1 });
      metrics.ng_opt = config.raw.optics.ng_fixed;
      warnings.push('group_index_is_configured_not_predicted');
    } else {
      const g = groupIndex(model, lambda, modeIndex, { delta: Math.min(0.01, lambda / 100) });
      if (!g.lo.converged || !g.hi.converged) throw new Error('Optical group-index solves did not converge');
      base = g.base;
      metrics.ng_opt = g.ng;
    }
    if (!base.converged) throw new Error('Optical mode solve did not converge');
    metrics.n_eff = base.neff[modeIndex];
    reuse = { window: model.window, model, mode: base };
    opticalResult = {
      nNodes: model.mesh.nNodes, nTris: model.mesh.nTris, iterations: base.iterations,
      form: base.form, modeIndex, converged: base.converged,
      metal: base.metal, labels: base.labels, limitations: base.limitations,
      boundaryMarginFraction: {
        marginUm: base.boundaryMarginFraction.marginUm,
        value: base.boundaryMarginFraction.perMode[modeIndex]
      }
    };
    warnings.push(...base.labels, ...base.limitations);
    stages.push('optical_mode');
  }
  let eoResult = null;
  if (eo) {
    const out = runEoStage({ config, section, es, eo, opts, meshScale, onProgress, reuse });
    Object.assign(metrics, out.metrics);
    warnings.push(...out.warnings);
    eoResult = out.result;
    stages.push('eo_overlap');
  }
  let rfResult = null;
  if (rf) {
    const out = runRfStage({ section, es, rf, targets: config.raw.targets ?? [], onProgress, meshScale });
    warnings.push(...out.warnings);
    rfResult = out.result;
    stages.push('rf_line');
  }
  for (const [k, v] of Object.entries(metrics)) if (!Number.isFinite(v) || v <= 0) throw new Error(`Nonphysical result for ${k}: ${v}`);
  const topology = config.raw.line?.loading?.type ?? 'unspecified';
  const periodic = topology === 'periodic_t_rail';
  if (periodic) warnings.push('cross_section_only_not_periodic_line');
  const targets = compareTargets(config.raw.targets ?? [], metrics, { topology, section: name, fixedGroupIndex: config.raw.optics?.group_index_from === 'fixed', eo: eoResult, rf: rfResult });
  const targetSummary = { total: targets.length, evaluated: targets.filter(t => t.status !== 'not_evaluated').length, passed: targets.filter(t => t.status === 'pass').length, failed: targets.filter(t => t.status === 'fail').length,
    flagged: targets.filter(t => t.diagnostic).length };
  return { id: config.raw.id, section: name, scope: 'cross_section', stages, metrics, targets,
    targetSummary,
    pendingStages: (config.raw.chain ?? []).filter((s) => !stages.includes(s)),
    warnings: [...new Set(warnings)], meshScale, electrostatics: { ...es.stats, energyChargeRelativeError: Math.abs(es.capacitance.energy - es.capacitance.charge) / es.cPul },
    optical: opticalResult, eo: eoResult, rf: rfResult, elapsed_ms: performance.now() - started };
}
