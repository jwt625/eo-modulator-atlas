// Cross-section runner shared by Node and the browser worker. No results are persisted.
import { parseConfig, opticalOptions, checkEoSolver, DEFAULT_ELEMENT_ORDER, DEFAULT_P2_MESH_FACTOR, eoOptions, rfOptions, checkArmWindows, crossSectionOf, STAGES, IMPLEMENTED_STAGES, VPI_METRICS } from './config.mjs';
import { solveElectrostatics } from './electrostatics.mjs';
import { geometryHash, esFields, pockelsDeltaN } from './fields.mjs';
import { solveOptical, solvedFields, warmGet, warmSet } from './optical-stage.mjs';
import { MATERIAL_LIBRARY } from './materials.mjs';
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
 * @param {{section?:string, stages?:string[], optical?:boolean, meshScale?:number, onProgress?:(m:string)=>void,
 *   params?:Record<string, number>, fields?:boolean, cache?:object, solver?:'scalar'|'vector', elementOrder?:1|2}} [options]
 *   solver / elementOrder: override optics.solver and mesh.element_order of the config (DevLog-026 round 2).
 *   stages: subset of the implemented stages (electrostatics always runs); optical: true adds optical_mode (legacy flag).
 *   params: overrides of `params` values; fields: true adds typed-array field export (`result.fields`, DevLog-023 O4);
 *   cache: an object kept by the caller across runs (sweeps) to reuse the electrostatic mesh / solution when the
 *   geometry hash (and the RF material hash) are unchanged.
 */
export function runCrossSection(text, options = {}) {
  const config = parseConfig(text, { params: options.params ?? {} });
  return runConfig(config, options);
}

/**
 * Run a parsed config (parseConfig). Same options as runCrossSection; `targets` replaces the config targets in the
 * comparison (sweep points compare their own sweep_targets).
 */
export function runConfig(config, { section: name = 'geometry', stages: requested = null, optical = false, meshScale = 1, onProgress = () => {}, fields = false, cache = null, targets: targetOverride = null, solver = null, elementOrder: orderOverride = null, p2MeshFactor = null, modeOnly = false } = {}) {
  if (modeOnly) return runModeOnly(config, { section: name, stages: requested, meshScale, onProgress, fields, cache, targets: targetOverride, solver });
  const run = resolveStages({ stages: requested, optical });
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.5 || meshScale > 4) throw new Error('meshScale must be between 0.5 and 4');
  if (typeof fields !== 'boolean') throw new Error('fields must be a boolean');
  if (!Object.hasOwn(config.geometries, name)) throw new Error(`Unknown cross-section: ${name}`);
  const section = crossSectionOf(config, name);
  const wants = (s) => run.includes(s);
  // Input checks of every requested stage happen before any solve.
  const opts = wants('optical_mode') || wants('eo_overlap') ? opticalOptions(config.raw, { solver }) : null;
  if (wants('eo_overlap')) checkEoSolver(opts);
  const eo = wants('eo_overlap') ? eoOptions(config.raw, config.geometries) : null;
  if (eo) checkArmWindows(eo, section);
  const rf = wants('rf_line') ? rfOptions(config.raw, config.materials, config.geometries[name], name) : null;
  const started = performance.now();
  // Reuse (sweeps): the mesh depends on the geometry, refinement windows and mesh scale only; the solution also on the
  // RF permittivities of the region materials. Both keys are content hashes of the normalised inputs.
  // mesh.element_order (P1/P2, DevLog-024 S3.9) of the selected section; part of the solution hash.
  if (orderOverride != null && orderOverride !== 1 && orderOverride !== 2) throw new Error('elementOrder must be 1 or 2');
  const elementOrder = orderOverride ?? config.geometries[name].mesh.element_order ?? DEFAULT_ELEMENT_ORDER;
  // Audit F4 (round 5): P2 runs on a coarsened electrostatic mesh (factor mesh.p2_mesh_factor, default 2); P1 keeps the
  // configured mesh. Optical meshes are not affected.
  const p2Factor = elementOrder === 2 ? (p2MeshFactor ?? config.geometries[name].mesh.p2_mesh_factor ?? DEFAULT_P2_MESH_FACTOR) : 1;
  if (typeof p2Factor !== 'number' || !(p2Factor >= 0.5 && p2Factor <= 4)) throw new Error('p2MeshFactor must be between 0.5 and 4');
  const esScale = meshScale * p2Factor;
  const hashes = geometryHash(section, config.materials, esScale, elementOrder);
  const reused = { mesh: false, electrostatics: false };
  let es;
  if (cache && cache.esKey === hashes.solution && cache.es) { es = cache.es; reused.mesh = reused.electrostatics = true; onProgress('Reusing the electrostatic solution (unchanged geometry and RF materials)'); }
  else {
    const mesh = cache && cache.meshKey === hashes.mesh && cache.mesh ? cache.mesh : null;
    reused.mesh = !!mesh;
    onProgress(mesh ? 'Solving electrostatics on the cached mesh' : 'Meshing and solving electrostatics');
    es = solveElectrostatics(section, { resolvedMaterials: config.materials, meshScale: esScale, elementOrder, ...(mesh ? { mesh } : {}) });
    if (cache) Object.assign(cache, { meshKey: hashes.mesh, mesh: es.mesh, esKey: hashes.solution, es });
  }
  const metrics = { c_pul_pf_per_m: es.cPul * 1e12, c0_pul_pf_per_m: es.c0Pul * 1e12, l_pul_nh_per_m: es.lPul * 1e9, n_rf: es.nRf, z0_ohm: es.z0 };
  const warnings = ['quasi_static_2d_rf', 'finite_domain_boundary', 'no_3d_launch_pad_effects'];
  const stages = ['electrostatics'];
  const timing = { electrostatics: reused.electrostatics ? null : es.timing ?? null, opticalModel: null, modes: null, groupIndex: null, eo: null, rf: null, total_ms: null };
  let opticalResult = null;
  let reuse = null;
  if (wants('optical_mode')) {
    onProgress(`Meshing and solving the ${opts.solver} optical mode`);
    const warmKey = `${opts.solver}:optical_window`;
    const solved = solveOptical(section, config.materials, opts, { meshScale, withGroupIndex: true, warm: warmGet(cache, warmKey) });
    if (solved.res?.warm) warmSet(cache, warmKey, solved.res.warm);
    Object.assign(timing, solved.timing);
    if (opts.groupIndex === 'fixed') {
      metrics.ng_opt = config.raw.optics.ng_fixed;
      warnings.push('group_index_is_configured_not_predicted');
    } else metrics.ng_opt = solved.ng;
    metrics.n_eff = solved.neff;
    reuse = { window: solved.window, solved };
    opticalResult = solved.diagnostics;
    warnings.push(...solved.labels, ...solved.limitations);
    stages.push('optical_mode');
  }
  let eoResult = null;
  let armModels = null;
  if (eo) {
    const out = runEoStage({ config, section, es, eo, opts, meshScale, onProgress, reuse, cache });
    Object.assign(metrics, out.metrics);
    warnings.push(...out.warnings);
    eoResult = out.result;
    timing.eo = out.timing ?? null;
    armModels = out.models ?? null;
    stages.push('eo_overlap');
  }
  let rfResult = null;
  if (rf) {
    const out = runRfStage({ section, es, rf, targets: config.raw.targets ?? [], onProgress, meshScale: esScale, elementOrder });
    warnings.push(...out.warnings);
    rfResult = out.result;
    timing.rf = out.timing ?? null;
    stages.push('rf_line');
  }
  for (const [k, v] of Object.entries(metrics)) if (!Number.isFinite(v) || v <= 0) throw new Error(`Nonphysical result for ${k}: ${v}`);
  const topology = config.raw.line?.loading?.type ?? 'unspecified';
  const periodic = topology === 'periodic_t_rail';
  if (periodic) warnings.push('cross_section_only_not_periodic_line');
  const targets = compareTargets(targetOverride ?? config.raw.targets ?? [], metrics, { topology, section: name, fixedGroupIndex: config.raw.optics?.group_index_from === 'fixed', eo: eoResult, rf: rfResult });
  if (opts) warnings.push(`optical_solver_${opts.solver}`);
  if (eoResult) for (const t of targets) addLowFrequencyRange(t, metrics, config);
  const targetSummary = { total: targets.length, evaluated: targets.filter(t => t.status !== 'not_evaluated').length, passed: targets.filter(t => t.status === 'pass').length, failed: targets.filter(t => t.status === 'fail').length,
    flagged: targets.filter(t => t.diagnostic).length };
  const elapsed = performance.now() - started;
  timing.total_ms = elapsed;
  const libraryUse = Object.keys(config.materialSources ?? {}).length;
  if (libraryUse) warnings.push('library_material_constants_used');
  const result = { id: config.raw.id, section: name, scope: 'cross_section', stages, metrics, targets,
    targetSummary,
    pendingStages: (config.raw.chain ?? []).filter((s) => !stages.includes(s)),
    warnings: [...new Set(warnings)], meshScale, electrostatics: { ...es.stats, energyChargeRelativeError: Math.abs(es.capacitance.energy - es.capacitance.charge) / es.cPul },
    optical: opticalResult, eo: eoResult, rf: rfResult, elapsed_ms: elapsed,
    params: config.params?.values ?? {}, materialSources: config.materialSources ?? {},
    geometryHash: hashes.mesh, materialHash: hashes.solution, reused, timing, opticalSolver: opts?.solver ?? null, elementOrder,
    electrostaticMeshScale: esScale, p2MeshFactor: p2Factor, modeOnly: false };
  if (fields) {
    result.fields = { es: esFields(es, section), optical: null, arms: null };
    // Pockels delta-n per optical triangle (round 3): attached to every exported optical model, scalar or vector.
    const withPockels = (solved) => ({ ...solvedFields(solved, opts), pockels: pockelsDeltaN(es, solved.model, opts.lambda0Um) });
    if (reuse) result.fields.optical = withPockels(reuse.solved);
    if (armModels) result.fields.arms = Object.fromEntries(Object.entries(armModels).map(([k, v]) => [k, v ? (reuse && v === reuse.solved ? result.fields.optical : withPockels(v)) : null]));
  }
  return result;
}

/**
 * Optical-only run (audit F10): the optical_mode stage without electrostatics, for mode-only cases (validation K1-K3)
 * whose electrostatic mesh is not needed. Only n_eff / ng targets can be evaluated.
 */
function runModeOnly(config, { section: name = 'geometry', stages = null, meshScale = 1, onProgress = () => {}, fields = false, cache = null, targets: targetOverride = null, solver = null } = {}) {
  const wanted = (stages ?? ['optical_mode']).filter((x) => x !== 'electrostatics');
  if (wanted.length !== 1 || wanted[0] !== 'optical_mode') throw new Error('modeOnly runs the optical_mode stage only (stages: [optical_mode])');
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.5 || meshScale > 4) throw new Error('meshScale must be between 0.5 and 4');
  if (!Object.hasOwn(config.geometries, name)) throw new Error(`Unknown cross-section: ${name}`);
  const section = crossSectionOf(config, name);
  const opts = opticalOptions(config.raw, { solver });
  const started = performance.now();
  onProgress(`Meshing and solving the ${opts.solver} optical mode (mode only)`);
  const warmKey = `${opts.solver}:optical_window`;
  const solved = solveOptical(section, config.materials, opts, { meshScale, withGroupIndex: true, warm: warmGet(cache, warmKey) });
  if (solved.res?.warm) warmSet(cache, warmKey, solved.res.warm);
  const metrics = { n_eff: solved.neff };
  const warnings = [...solved.labels, ...solved.limitations, 'mode_only_no_electrostatics', `optical_solver_${opts.solver}`];
  if (opts.groupIndex === 'fixed') { metrics.ng_opt = config.raw.optics.ng_fixed; warnings.push('group_index_is_configured_not_predicted'); }
  else metrics.ng_opt = solved.ng;
  const targets = compareTargets(targetOverride ?? config.raw.targets ?? [], metrics, { topology: config.raw.line?.loading?.type ?? 'unspecified', section: name, fixedGroupIndex: opts.groupIndex === 'fixed' });
  const elapsed = performance.now() - started;
  const result = { id: config.raw.id, section: name, scope: 'cross_section', stages: ['optical_mode'], metrics, targets,
    targetSummary: { total: targets.length, evaluated: targets.filter((t) => t.status !== 'not_evaluated').length, passed: targets.filter((t) => t.status === 'pass').length, failed: targets.filter((t) => t.status === 'fail').length, flagged: targets.filter((t) => t.diagnostic).length },
    pendingStages: (config.raw.chain ?? []).filter((x) => x !== 'optical_mode'), warnings: [...new Set(warnings)], meshScale,
    electrostatics: null, optical: solved.diagnostics, eo: null, rf: null, elapsed_ms: elapsed,
    params: config.params?.values ?? {}, materialSources: config.materialSources ?? {}, geometryHash: null, materialHash: null,
    reused: { mesh: false, electrostatics: false }, timing: { electrostatics: null, ...solved.timing, eo: null, rf: null, total_ms: elapsed },
    opticalSolver: opts.solver, elementOrder: null, electrostaticMeshScale: null, p2MeshFactor: null, modeOnly: true };
  if (fields) result.fields = { es: null, optical: solvedFields(solved, opts), arms: null };
  return result;
}

/** Above this drive frequency the clamped Pockels values apply (vendor data sheet: clamped for v > 10 MHz). */
export const CLAMPED_ABOVE_HZ = 1e7;

/**
 * DevLog-029 proposal 2 (round 5): for a measured kHz-MHz Vpi target (`source.drive_frequency_hz` below 10 MHz) report
 * the VpiL / Vpi range between the clamped constants used and the unclamped r33 alternatives of the library, by r33
 * scaling (the r33 term dominates the x-cut TE overlap; the eps change is not included). Diagnostic only: the target
 * status is unchanged.
 */
function addLowFrequencyRange(t, metrics, config) {
  const f = t.source?.drive_frequency_hz;
  if (!VPI_METRICS.includes(t.metric) || typeof f !== 'number' || !(f < CLAMPED_ABOVE_HZ) || !Number.isFinite(metrics[t.metric])) return;
  const eoMats = Object.values(config.materials).filter((m) => m.r);
  if (!eoMats.length) return;
  const r33Used = Math.max(...eoMats.map((m) => Math.abs(m.r[8]) * 1e12)); // Voigt row zz, column z (pm/V)
  const alt = MATERIAL_LIBRARY.library?.lithium_niobate_congruent?.alternatives ?? {};
  const unclamped = Object.entries(alt).filter(([k, v]) => k.startsWith('r_pm_per_v_unclamped') && Number.isFinite(v.value?.r33)).map(([k, v]) => ({ key: k, r33: v.value.r33 }));
  if (!unclamped.length || !(r33Used > 0)) return;
  const rMax = Math.max(...unclamped.map((u) => u.r33));
  const v = metrics[t.metric];
  t.lowFrequencyRange = {
    driveFrequencyHz: f, clampedValue: v, unclampedEstimate: v * Math.min(1, r33Used / rMax), r33UsedPmPerV: r33Used, r33Unclamped: unclamped,
    method: 'r33 scaling of the computed value (r33 term dominant; eps change not included)', affectsStatus: false,
  };
}
