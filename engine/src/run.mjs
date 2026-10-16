// Cross-section runner shared by Node and the browser worker. No results are persisted.
import { parseConfig, opticalOptions, checkEoSolver, DEFAULT_ELEMENT_ORDER, DEFAULT_P2_MESH_FACTOR, eoOptions, rfOptions, checkArmWindows, crossSectionOf, STAGES, IMPLEMENTED_STAGES, VPI_METRICS, RESPONSE_METRICS, loadedLineOptions, eoResponseOptions, withStageDependencies, lineTopology, sweepFrequencies } from './config.mjs';
import { solveElectrostatics } from './electrostatics.mjs';
import { geometryHash, esFields, pockelsDeltaN } from './fields.mjs';
import { solveOptical, solvedFields, warmGet, warmSet } from './optical-stage.mjs';
import { MATERIAL_LIBRARY } from './materials.mjs';
import { MU0 } from './rf-line.mjs';
import { runSemiconductor } from './semi-stage.mjs';
import { runEoStage, runRfStage, runLoadedLineStage, runEoResponseStage, runJunctionResponseStage, responseTargetKey, RF_FREQUENCY_METRICS, WHEELER_SPREAD_WARNING } from './stages.mjs';

const STATIC_RF = ['n_rf', 'z0_ohm', 'c_pul_pf_per_m', 'c0_pul_pf_per_m', 'l_pul_nh_per_m'];
const RESPONSE = RESPONSE_METRICS;
const UNSPECIFIED_TOPOLOGY = 'Line topology is unspecified; uniform-line target comparison requires line.loading.type: none.';

/** Reason a periodic-line frequency target cannot use the lossy loaded line (null when it can). */
function loadedFrequencyReason(target, loaded) {
  if (!loaded) return 'Periodic-line target needs the loaded_line stage; a single cross-section is not comparable.';
  if (!loaded.loss) return `Periodic-line frequency target needs the lossy loaded line: ${loaded.lossReason}`;
  if (!loaded.loss.independentPrediction) return 'The loaded line uses a configured conductor resistance (rprime_reference); its values are not independent predictions.';
  if (target.metric === 'rf_loss_db_per_cm' && loaded.loss.conductorModel === 'none') return 'Conductor loss is declared none; the attenuation is not a conductor-loss prediction.';
  return null;
}

function frequencyReason(target, topology, rf, loaded) {
  if (VPI_METRICS.includes(target.metric)) return 'A frequency-specific Vpi target is not computed (the RF Vpi is reported in result.response.sweep only).';
  if (!RF_FREQUENCY_METRICS.includes(target.metric)) return 'A frequency-specific value of this metric is not computed.';
  if (topology === 'periodic_t_rail') return loadedFrequencyReason(target, loaded);
  if (!rf) return 'Frequency-specific RF targets require the rf_line stage.';
  if (topology !== 'none') return UNSPECIFIED_TOPOLOGY;
  if (!rf.independentPrediction) return rf.lossSource === 'paper_input'
    ? 'The RF line uses the paper attenuation as an input; its values are not independent predictions.'
    : 'The RF line uses a configured conductor resistance (rprime_reference); its values are not independent predictions.';
  if (target.metric === 'rf_loss_db_per_cm' && rf.conductorModel === 'none') return 'Conductor loss is declared none; the attenuation is not a conductor-loss prediction.';
  return null;
}

/** Reason a response target (eo_rolloff_db, bw3db_ghz, bw6db_ghz) is not evaluated (null when it is). */
function responseReason(topology, response, rf, loaded, fixedGroupIndex) {
  if (!response) return 'Frequency response targets require the eo_response stage (not run).';
  if (topology === 'unspecified') return UNSPECIFIED_TOPOLOGY;
  if (fixedGroupIndex) return 'The group index is a configured input; the response is not an independent prediction.';
  const loss = topology === 'periodic_t_rail' ? loaded?.loss : rf;
  if (!loss) return 'The response line has no loss model.';
  if (loss.lossSource === 'paper_input') return 'The RF line uses the paper attenuation as an input; the response is not an independent prediction.';
  if (!loss.independentPrediction) return 'The RF line uses a configured conductor resistance (rprime_reference); the response is not an independent prediction.';
  if (loss.conductorModel === 'none') return 'Conductor loss is declared none; the response is not a prediction of the lossy line.';
  return null;
}

const wheelerSpreadOf = (topology, rf, loaded) => (topology === 'periodic_t_rail' ? loaded?.loss?.maxWheelerSpread ?? 0 : rf?.wheeler?.maxRelativeSpread ?? 0);
const spreadDiagnostic = (s) => `Wheeler step-check relative spread ${s.toPrecision(3)} exceeds ${WHEELER_SPREAD_WARNING}; the conductor resistance is numerically uncertain at about that level (step-check proxy, not a bound).`;

/**
 * Compare paper targets with computed metrics. A target is evaluated only when the metric is an independent prediction of
 * the requested stages under a matching convention; everything else is `not_evaluated` with the reason.
 * @param {any[]} targets
 * @param {Record<string, number>} metrics
 * @param {{topology?:string, section?:string, fixedGroupIndex?:boolean, eo?:any, rf?:any}} [context]
 *   eo: result.eo of the eo_overlap stage (compatibleVpiConventions); rf: result.rf of the rf_line stage (atTargets).
 */
export function compareTargets(targets, metrics, { topology = 'unspecified', section = 'geometry', fixedGroupIndex = false, eo = null, rf = null, loaded = null, response = null } = {}) {
  return targets.map((target) => {
    const staticRf = STATIC_RF.includes(target.metric);
    const vpi = VPI_METRICS.includes(target.metric);
    let reason = null;
    let value = null;
    let diagnostic = null;
    let actualBound = null;
    let forcedStatus = null;
    let referenceSensitivity = null;
    const codes = [];
    if (target.source?.comparable === false) reason = 'The config marks this target comparable: false (source.comparable).';
    else if (section !== 'geometry') reason = 'Alternate cross-section; targets apply to the configured device.';
    else if (RESPONSE.includes(target.metric)) {
      reason = responseReason(topology, response, rf, loaded, fixedGroupIndex);
      if (!reason) {
        const r = response.byTarget.find((x) => x.key === responseTargetKey(target));
        const tol = Math.max(target.tol_abs ?? 0, Math.abs(target.value) * (target.tol_rel ?? 0));
        if (!r || r.status === 'error') reason = `The response was not computed for this target${r?.error ? `: ${r.error}` : ''}.`;
        else if (r.status === 'reference_unstated') {
          // audit S1: no pass/fail on an arbitrary reference; report the values at the DC, 1 GHz and 3 GHz references.
          referenceSensitivity = r.byReference.map((x) => ({ referenceGhz: x.referenceGhz, status: x.status, value: x.status === 'found' ? (x.valueDb ?? x.fGhz) : null, ...(x.boundGhz != null ? { boundGhz: x.boundGhz } : {}), ...(x.diagnostics ? { diagnosticCodes: x.diagnostics.map((d) => d.code) } : {}) }));
          const txt = referenceSensitivity.map((x) => `${x.referenceGhz == null ? 'DC' : `${x.referenceGhz} GHz`}: ${x.value != null ? `${x.value.toPrecision(4)}${target.metric === 'eo_rolloff_db' ? ' dB' : ' GHz'}` : x.boundGhz != null ? `> ${x.boundGhz} GHz` : x.status.replaceAll('_', ' ')}`).join('; ');
          reason = `The paper's response reference is ${r.reference.replaceAll('_', ' ')}; not compared on an arbitrary reference. Engine values with the reference at ${txt}.`;
        }
        else if (r.status === 'found') value = target.metric === 'eo_rolloff_db' ? r.valueDb : r.fGhz;
        else if (r.status === 'no_crossing') {
          actualBound = { gt: r.boundGhz };
          // decidable: the response stays above the threshold beyond value + tolerance
          if (r.boundGhz > target.value + tol) { forcedStatus = 'fail'; diagnostic = `No ${target.metric === 'bw3db_ghz' ? '-3' : '-6'} dB crossing up to ${r.boundGhz} GHz (sweep end${r.invalidFromGhz ? ', or the Bragg frequency' : ''}); the bandwidth exceeds value + tolerance.`; }
          else reason = `No ${target.metric === 'bw3db_ghz' ? '-3' : '-6'} dB crossing up to ${r.boundGhz} GHz (sweep end${r.invalidFromGhz ? ' or Bragg frequency' : ''}); the bandwidth is only bounded (> ${r.boundGhz} GHz).`;
        } else if (r.status === 'below_search_start') reason = `The response is already below the threshold at the search start ${r.boundGhz} GHz.`;
        else if (r.status === 'above_bragg') reason = 'The target frequency is at or above the Bragg frequency of the loaded line.';
        else reason = `The bandwidth search could not run (${r.status}).`;
        const spread = wheelerSpreadOf(topology, rf, loaded);
        if (!reason && spread > WHEELER_SPREAD_WARNING) { diagnostic = [diagnostic, spreadDiagnostic(spread)].filter(Boolean).join(' '); codes.push('wheeler_step_check_spread_above_1e-2'); }
        if (!reason) {
          // audit S3: a declared-lossless dielectric is an assumption of the verdict
          const loss = topology === 'periodic_t_rail' ? loaded?.loss : rf;
          if (loss?.dielectricModel === 'none') { codes.push('assumption_dielectric_loss_none'); diagnostic = [diagnostic, 'assumption_dielectric_loss_none: dielectric loss is declared none in the line model; the verdict assumes it.'].filter(Boolean).join(' '); }
          // audit S2: the semi-infinite surface impedance is invalid below the frequency where t = 3 delta; flag a band from the
          // reference to the evaluated frequency that reaches below it
          const thin = response.thinConductorBelowGhz;
          const low = target.reference_ghz ?? 0;
          if (thin != null && low < thin) { codes.push('thin_conductor_semi_infinite_surface_impedance_in_band'); diagnostic = [diagnostic, `thin_conductor_semi_infinite_surface_impedance_in_band: the conductor is thinner than 3 skin depths below ${thin.toPrecision(3)} GHz, inside the band from the reference (${low ? `${low} GHz` : 'DC'}) to the evaluated frequency; the surface-resistance R' and internal inductance are invalid there (line.conductor_thickness_model slab_* gives the finite-thickness model).`].filter(Boolean).join(' '); }
          // DevLog-036 round 3 (R2-2, R2-3): conductor-model limits computed per target by the eo_response stage
          for (const d of r.diagnostics ?? []) { codes.push(d.code); diagnostic = [diagnostic, d.text].filter(Boolean).join(' '); }
        }
      }
    }
    else if (target.at_ghz != null) {
      reason = frequencyReason(target, topology, rf, loaded);
      if (!reason) {
        const src = topology === 'periodic_t_rail' ? loaded.loss : rf;
        const point = src.atTargets.find((p) => p.fGhz === target.at_ghz);
        if (point?.aboveBragg) reason = 'The target frequency is at or above the Bragg frequency of the loaded line.';
        else {
          value = target.metric === 'rf_loss_db_per_cm' ? point.alphaDbPerCm : target.metric === 'n_rf' ? point.nRf : point.z0ReOhm;
          if (!Number.isFinite(value)) { reason = 'Metric was not computed by the requested cross-section stages.'; value = null; }
          // Q2 M2: evaluated, but flagged when the Wheeler step check exceeds its warning level.
          else if (wheelerSpreadOf(topology, rf, loaded) > WHEELER_SPREAD_WARNING) diagnostic = spreadDiagnostic(wheelerSpreadOf(topology, rf, loaded));
        }
      }
    }
    else if (staticRf && topology === 'periodic_t_rail') {
      // DevLog-036: the periodic line's static n_rf and z0_ohm are the quasi-static (f -> 0, lossless) Bloch limits.
      if (!loaded) reason = 'Periodic-line target needs the loaded_line stage; a single cross-section is not comparable.';
      else if (target.metric === 'n_rf') value = loaded.quasiStatic.nRf;
      else if (target.metric === 'z0_ohm') value = loaded.quasiStatic.zOhm;
      else reason = 'A periodic-line value of this per-length metric is not defined (the section values differ per cut).';
    }
    else if (staticRf && topology !== 'none') reason = UNSPECIFIED_TOPOLOGY;
    else if (target.metric === 'ng_opt' && fixedGroupIndex) reason = 'Group index is a configured input, not an independent prediction.';
    else if (vpi && target.vpi_convention == null) reason = 'Vpi target has no vpi_convention; the engine does not guess the arm or push-pull factor.';
    else if (vpi && eo && !eo.compatibleVpiConventions.includes(target.vpi_convention)) reason = `Target vpi_convention ${target.vpi_convention} does not match the engine result (${eo.drive}, ${eo.terminalDrive}; comparable with ${eo.compatibleVpiConventions.join(', ') || 'no catalogue convention'}).`;
    else if (target.metric === 'vpi_dc_v' && eo && eo.lengthMm == null) reason = 'line.length_mm is not set; only the Vpi-length product is computed.';
    else if (!Object.hasOwn(metrics, target.metric) || !Number.isFinite(metrics[target.metric])) reason = 'Metric was not computed by the requested cross-section stages.';
    else value = metrics[target.metric];
    if (reason) { value = null; diagnostic = null; forcedStatus = null; codes.length = 0; }
    const tolerance = Math.max(target.tol_abs ?? 0, Math.abs(target.value) * (target.tol_rel ?? 0));
    return { ...target, actual: value, tolerance, reason, diagnostic, ...(actualBound ? { actualBound } : {}),
      ...(codes.length ? { diagnosticCodes: [...codes] } : {}), ...(referenceSensitivity ? { referenceSensitivity } : {}),
      status: forcedStatus ?? (value == null ? 'not_evaluated' : Math.abs(value - target.value) <= tolerance ? 'pass' : 'fail') };
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
 *   keep: true attaches the solver internals as the non-enumerable `result.internals` (postprocessing store, DevLog-031);
 *   numModes: compute at least this many optical modes per solve (overrides optics.num_modes; mode table).
 */
export function runCrossSection(text, options = {}) {
  const config = parseConfig(text, { params: options.params ?? {} });
  return runConfig(config, options);
}

/**
 * Run a parsed config (parseConfig). Same options as runCrossSection; `targets` replaces the config targets in the
 * comparison (sweep points compare their own sweep_targets).
 */
export function runConfig(config, { section: name = 'geometry', stages: requested = null, optical = false, meshScale = 1, onProgress = () => {}, fields = false, cache = null, targets: targetOverride = null, solver = null, elementOrder: orderOverride = null, p2MeshFactor = null, modeOnly = false, keep = false, numModes = null, rfSection = null, biasV = null } = {}) {
  if (typeof keep !== 'boolean') throw new Error('keep must be a boolean');
  if (modeOnly) return runModeOnly(config, { section: name, stages: requested, meshScale, onProgress, fields, cache, targets: targetOverride, solver, keep, numModes });
  if (Array.isArray(requested) && requested.includes('semiconductor')) return runSemiconductorOnly(config, { section: name, stages: requested, meshScale, onProgress, fields, keep, targets: targetOverride, rfSection, biasV });
  const run = withStageDependencies(resolveStages({ stages: requested, optical }), config.raw);
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.5 || meshScale > 4) throw new Error('meshScale must be between 0.5 and 4');
  if (typeof fields !== 'boolean') throw new Error('fields must be a boolean');
  if (!Object.hasOwn(config.geometries, name)) throw new Error(`Unknown cross-section: ${name}`);
  const section = crossSectionOf(config, name);
  section.farScale = meshScale; // D11 (DevLog-039 round 2): the default far-field mesh cap follows the user mesh scale
  const wants = (s) => run.includes(s);
  // Input checks of every requested stage happen before any solve.
  const opts = wants('optical_mode') || wants('eo_overlap') ? opticalOptions(config.raw, { solver, numModes }) : null;
  if (wants('eo_overlap')) checkEoSolver(opts);
  const eo = wants('eo_overlap') ? eoOptions(config.raw, config.geometries) : null;
  if (eo) checkArmWindows(eo, section);
  const rf = wants('rf_line') ? rfOptions(config.raw, config.materials, config.geometries[name], name) : null;
  const topology = lineTopology(config.raw);
  const lo = wants('loaded_line') ? loadedLineOptions(config.raw, config.materials, config.geometries) : null;
  const ero = wants('eo_response') ? eoResponseOptions(config.raw) : null;
  if (ero && topology === 'periodic_t_rail' && lo.lossError) throw new Error(`eo_response: the loaded line has no complete loss declaration: ${lo.lossError}`);
  const targetList = targetOverride ?? config.raw.targets ?? [];
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
  const timing = { electrostatics: reused.electrostatics ? null : es.timing ?? null, opticalModel: null, modes: null, groupIndex: null, eo: null, rf: null, loadedLine: null, total_ms: null };
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
  let rfLine = null;
  if (rf) {
    const out = runRfStage({ section, es, rf, targets: config.raw.targets ?? [], onProgress, meshScale: esScale, elementOrder });
    warnings.push(...out.warnings);
    rfResult = out.result;
    rfLine = out.line;
    timing.rf = out.timing ?? null;
    stages.push('rf_line');
  }
  let loadedResult = null;
  let loadedLine = null;
  if (lo) {
    const out = runLoadedLineStage({ config, lo, runSection: name, runEs: es, meshScale, orderOverride, p2MeshFactor, cache, onProgress, targets: config.raw.targets ?? [], sweepGhz: config.raw.sweep ? sweepFrequencies(config.raw.sweep) : null, runEsScale: esScale, runElementOrder: elementOrder });
    warnings.push(...out.warnings);
    loadedResult = out.result;
    loadedLine = out.line;
    timing.loadedLine = out.timing ?? null;
    stages.push('loaded_line');
  }
  let responseResult = null;
  if (ero) {
    onProgress('Evaluating the traveling-wave EO response');
    const periodic = topology === 'periodic_t_rail';
    const out = runEoResponseStage({ kind: periodic ? 'periodic' : 'uniform', line: periodic ? loadedLine : rfLine, opts: ero,
      ngOpt: metrics.ng_opt, ngSource: opts.groupIndex, vpiDcV: eoResult?.vpiDcV ?? null, targets: targetList,
      fLimitHz: periodic ? loadedResult.braggGhz * 1e9 : null, responseModel: config.raw.line.loading?.response_model ?? 'exact_cascade' });
    warnings.push(...out.warnings);
    responseResult = out.result;
    // audit S2: frequency below which the conductor is thinner than 3 skin depths (semi-infinite surface model only)
    const cond = periodic ? loadedResult.loss : rfResult;
    responseResult.thinConductorBelowGhz = cond?.thicknessModel === 'semi_infinite' && cond.thicknessUm > 0 && cond.sigmaSm > 0
      ? 9 / (Math.PI * MU0 * cond.sigmaSm * (cond.thicknessUm * 1e-6) ** 2) / 1e9 : null;
    if (responseResult.bw3dbGhz != null) metrics.bw3db_ghz = responseResult.bw3dbGhz;
    if (responseResult.bw6dbGhz != null) metrics.bw6db_ghz = responseResult.bw6dbGhz;
    stages.push('eo_response');
  }
  for (const [k, v] of Object.entries(metrics)) if (!Number.isFinite(v) || v <= 0) throw new Error(`Nonphysical result for ${k}: ${v}`);
  const periodic = topology === 'periodic_t_rail';
  if (periodic && !loadedResult) warnings.push('cross_section_only_not_periodic_line');
  const targets = compareTargets(targetList, metrics, { topology, section: name, fixedGroupIndex: config.raw.optics?.group_index_from === 'fixed', eo: eoResult, rf: rfResult, loaded: loadedResult, response: responseResult });
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
    optical: opticalResult, eo: eoResult, rf: rfResult, loaded: loadedResult, response: responseResult, elapsed_ms: elapsed,
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
  if (keep) keepInternals(result, { config, section, sectionName: name, es, opts, eo, optical: reuse?.solved ?? null, arms: armModels });
  return result;
}

/**
 * DevLog-031: attach the solver internals a postprocessing store needs (postproc/store.mjs createSolutionStore) as a
 * NON-enumerable property, so JSON serialisation and structured clone (worker postMessage) of the result are unchanged.
 */
function keepInternals(result, internals) {
  Object.defineProperty(result, 'internals', { value: Object.freeze({ ...internals, lambdaUm: internals.opts?.lambda0Um ?? null }), enumerable: false, configurable: true, writable: false });
}

/**
 * Optical-only run (audit F10): the optical_mode stage without electrostatics, for mode-only cases (validation K1-K3)
 * whose electrostatic mesh is not needed. Only n_eff / ng targets can be evaluated.
 */
function runModeOnly(config, { section: name = 'geometry', stages = null, meshScale = 1, onProgress = () => {}, fields = false, cache = null, targets: targetOverride = null, solver = null, keep = false, numModes = null } = {}) {
  const wanted = (stages ?? ['optical_mode']).filter((x) => x !== 'electrostatics');
  if (wanted.length !== 1 || wanted[0] !== 'optical_mode') throw new Error('modeOnly runs the optical_mode stage only (stages: [optical_mode])');
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.5 || meshScale > 4) throw new Error('meshScale must be between 0.5 and 4');
  if (!Object.hasOwn(config.geometries, name)) throw new Error(`Unknown cross-section: ${name}`);
  const section = crossSectionOf(config, name);
  section.farScale = meshScale; // D11 (DevLog-039 round 2): the default far-field mesh cap follows the user mesh scale
  const opts = opticalOptions(config.raw, { solver, numModes });
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
  if (keep) keepInternals(result, { config, section, sectionName: name, es: null, opts, eo: null, optical: solved, arms: null });
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

/**
 * S8 semiconductor stage run through the runner (DevLog-039 round 2): `stages: ['semiconductor']` runs it alone (it
 * has its own device mesh and Poisson solve; electrostatics is not run). Config `targets` (ES / RF / EO metrics) are
 * reported not_evaluated; `semiconductor.targets` are compared by the stage. fields: true adds the `semi` dataset of
 * every bias point (result.semiconductor.datasets); keep: true attaches the internals for the postproc store.
 */
function runSemiconductorOnly(config, { section: name = 'geometry', stages, meshScale = 1, onProgress = () => {}, fields = false, keep = false, targets: targetOverride = null, rfSection = null, biasV = null } = {}) {
  // DevLog-036 round 4: eo_response (with its rf_line on rfSection) may follow the semiconductor stage
  const others = stages.filter((x) => x !== 'semiconductor' && x !== 'electrostatics' && x !== 'eo_response' && x !== 'rf_line');
  if (others.length) throw new Error(`the semiconductor stage runs alone (got ${others.join(', ')} as well)`);
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.3 || meshScale > 4) throw new Error('meshScale must be between 0.3 and 4');
  const started = performance.now();
  const semi = runSemiconductor(config, { section: name, meshScale, onProgress, datasets: fields ? 'all' : 'none', keep });
  // orchestrator decision (DevLog-039 round 3): config keys line.rf_section and semiconductor.operating_bias_v; the run
  // options rfSection / biasV override them
  const twe = stages.includes('eo_response') ? runJunctionResponseStage({ config, semi, semiSection: name, rfSection: rfSection ?? config.raw.line?.rf_section ?? null, biasV: biasV ?? semi.operatingBiasV ?? null, meshScale, onProgress, targets: targetOverride ?? config.raw.targets ?? [] }) : null;
  const tweTargets = twe ? compareTargets(targetOverride ?? config.raw.targets ?? [], {}, { topology: lineTopology(config.raw), section: name, fixedGroupIndex: config.raw.optics?.group_index_from === 'fixed', rf: twe.rf, response: twe.response }) : null;
  const configTargets = (targetOverride ?? config.raw.targets ?? []).map((t, i) => (tweTargets && RESPONSE_METRICS.includes(t.metric) ? tweTargets[i] : { ...t, computed: null, status: 'not_evaluated', reason: t.source?.comparable === false ? 'The config marks this target comparable: false (source.comparable).' : 'Not computed by the semiconductor stage (run the cross-section stages for ES / optical / RF metrics).' }));
  const semiTargets = semi.targets.map((t) => ({ ...t, stage: 'semiconductor' }));
  const targets = [...semiTargets, ...configTargets];
  const elapsed = performance.now() - started;
  const result = {
    id: config.raw.id, section: name, scope: 'cross_section', stages: twe ? ['semiconductor', 'rf_line', 'eo_response'] : ['semiconductor'], metrics: {}, targets,
    targetSummary: { total: targets.length, evaluated: targets.filter((t) => t.status !== 'not_evaluated').length, passed: targets.filter((t) => t.status === 'pass').length, failed: targets.filter((t) => t.status === 'fail').length, flagged: targets.filter((t) => t.diagnostic).length },
    pendingStages: (config.raw.chain ?? []).filter((x) => x !== 'semiconductor'), warnings: [...new Set([...semi.labels, ...(twe?.warnings ?? [])])], meshScale,
    electrostatics: null, optical: semi.optical, eo: null, rf: twe?.rf ?? null, response: twe?.response ?? null, semiconductor: semi, elapsed_ms: elapsed,
    params: config.params?.values ?? {}, materialSources: config.materialSources ?? {}, geometryHash: null, materialHash: null,
    reused: { mesh: false, electrostatics: false }, timing: { semiconductor: semi.timing, total_ms: elapsed }, opticalSolver: semi.optical ? 'vector' : null,
    elementOrder: null, electrostaticMeshScale: null, p2MeshFactor: null, modeOnly: false,
  };
  if (keep) {
    const si = semi.internals;
    keepInternals(result, { config, section: si.section, sectionName: name, es: null, opts: si.opticalOpts ?? null, eo: null, optical: si.solved ?? null, arms: null, semi: si.semi });
  }
  return result;
}
