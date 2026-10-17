// EO-overlap and RF-line stages of the cross-section runner (DevLog-012 items 1 and 2).
// Inputs come from the validated config (config.mjs eoOptions/rfOptions); nothing physical is defaulted here.
// Results are small serializable objects; field arrays leave this module only through `models` (field export). License: GPL-3.0-or-later.

import { combineArms, vpiAtLength, EO_CONVENTIONS } from './eo-overlap.mjs';
import { solveOptical, armOverlap, scalarModeConverged, warmGet, warmSet } from './optical-stage.mjs';
import { C_LIGHT, MU0, createRfLine, propagationAt, junctionPropagationAt, lineParamsFromElectrostatics, electrodePerimetersM, skinDepthM, surfaceResistanceOhm, lPulFromC0, wheelerStepCheck } from './rf-line.mjs';
import { solveElectrostatics } from './electrostatics.mjs';
import { CrossSection } from './section.mjs';
import { recessGeometry } from './recess.mjs';
import { RF_FREQUENCY_METRICS, RESPONSE_METRICS, checkArmWindows, crossSectionOf, DEFAULT_ELEMENT_ORDER, DEFAULT_P2_MESH_FACTOR, rfOptions, eoResponseOptions, opticalOptions } from './config.mjs';
import { geometryHash } from './fields.mjs';
import { cx, cmul } from './complex.mjs';
import { createLoadedLine, blochAt, cascadeSections, cascadeAt } from './loaded-line.mjs';
import { responseAt, phaseIntegral, toDb, firstCrossing, cascadePhaseIntegral, dcPhaseIntegral, BANDWIDTH_THRESHOLDS_DB, EO_RESPONSE_CONVENTIONS } from './eo-response.mjs';
import { vectorEoBreakdown, scalarEoBreakdown, armElectrodeGap, armConventional, combinedConventional, breakdownSummary, EO_FORMULAS, EO_ACCURACY_NOTE } from './postproc/eo-analysis.mjs';

export { RF_FREQUENCY_METRICS, RESPONSE_METRICS };
/** Recess scales (multiples of delta/2) of the Wheeler step check; scale 1 is the Wheeler value (DevLog-008 guidance). */
export const WHEELER_SCALES = [0.25, 0.5, 1];
export const WHEELER_SPREAD_WARNING = 1e-2;
/** |pushPullBalance + 1| above this adds a warning to an opposite-sign (push-pull comparable) result (Q2 M5). */
export const PUSH_PULL_BALANCE_TOLERANCE = 0.1;

/**
 * Wheeler incremental-inductance R' at fRefHz: every electrode surface recessed by scale * delta/2, L' = 1/(c^2 C0')
 * from a vacuum-only electrostatic solve per scale. The recessed meshes keep the nominal section's mesh hints, refinement
 * windows and electrode-thickness hint (the recess must not change the default corner size; Q2 M8). Returns the value
 * and the step check.
 */
export function wheelerResistance({ section, meshScale, sigmaSm, fRefHz, lPulNominal, onProgress = () => {}, elementOrder = 1 }) {
  const halfDeltaUm = (skinDepthM(fRefHz, sigmaSm) / 2) * 1e6;
  const thicknessUm = section.thicknessHintUm ?? section.minElectrodeThickness();
  const solves = WHEELER_SCALES.map((scale) => {
    onProgress(`Wheeler recessed solve (${scale} x delta/2 = ${(scale * halfDeltaUm).toPrecision(3)} um)`);
    const recessed = new CrossSection(recessGeometry(section.geom, scale * halfDeltaUm), `${section.name}:recessed`,
      { refineWindows: section.refineWindows, thicknessUm, farScale: section.farScale }); // R7 (DevLog-039): same far-field scale as the nominal section
    const es = solveElectrostatics(recessed, { meshScale, vacuumOnly: true, elementOrder });
    return { scale, lPul: lPulFromC0(es.c0Pul), timing: es.timing ?? null };
  });
  const check = wheelerStepCheck(fRefHz, lPulNominal, solves);
  return { fRefGhz: fRefHz / 1e9, halfSkinDepthUm: halfDeltaUm, rPrimeOhmPerM: check.rPrimeOhmPerM[WHEELER_SCALES.indexOf(1)],
    scales: WHEELER_SCALES, rPrimeByScaleOhmPerM: check.rPrimeOhmPerM, maxRelativeSpread: check.maxRelativeSpread,
    spreadWarningLevel: WHEELER_SPREAD_WARNING, solveTiming: solves.map((x) => x.timing) };
}

const sameWindow = (a, b) => !!a && !!b && a.x[0] === b.x[0] && a.x[1] === b.x[1] && a.y[0] === b.y[0] && a.y[1] === b.y[1];

/**
 * Catalogue vpi_convention values (data/schema/devices.schema.yaml) that the engine V_pi can be compared with.
 * single_arm: one driven arm, the value is the per-arm phase-shifter V_pi (also an MZM with one arm driven).
 * two arms with opposite-sign dn (field-resolved push-pull): mzm_push_pull for a single-ended terminal pair, mzm_differential
 * for a differential pair. mzm_differential follows data schema convention (q) (2026-10-07): MZM V_pi quoted against the
 * full terminal difference V+ - V-, which is the engine V_t; a per-side amplitude is half of that and is never converted.
 * Same-sign arms and series push-pull match nothing. Any negative balance qualifies; |balance + 1| above
 * PUSH_PULL_BALANCE_TOLERANCE only adds a warning (the V_pi itself is the field-resolved value for any balance).
 */
export function compatibleVpiConventions(drive, terminalDrive, pushPullBalance) {
  if (drive === 'single_arm') return ['per_arm_phase_shifter', 'mzm_single_arm'];
  if (!(pushPullBalance < 0)) return [];
  return terminalDrive === 'differential' ? ['mzm_differential'] : ['mzm_push_pull'];
}

/**
 * Solve the optical mode of every requested arm and combine the first-order Pockels overlaps.
 * @param {{config:any, section:any, es:any, eo:any, opts:any, meshScale:number, onProgress:(m:string)=>void,
 *   reuse?:{window:any, model:any, mode:any}|null}} p
 */
export function runEoStage({ config, section, es, eo, opts, meshScale, onProgress, reuse = null, cache = null }) {
  const lambda = opts.lambda0Um;
  const modeIndex = opts.modeIndex;
  const arms = {};
  const timing = {};
  checkArmWindows(eo, section);
  for (const name of ['A', 'B']) {
    const w = eo.windows[name];
    if (!w) continue;
    onProgress(`Solving the ${opts.solver} optical mode of arm ${name}`);
    const reused = !!(reuse && sameWindow(reuse.window, w));
    const wk = `${opts.solver}:arm:${JSON.stringify(w)}`;
    const solved = reused ? reuse.solved : solveOptical(section, config.materials, opts, { meshScale, window: w, warm: warmGet(cache, wk) });
    if (!reused && solved.res?.warm) warmSet(cache, wk, solved.res.warm);
    if (solved.kind === 'scalar' ? !scalarModeConverged(solved.mode, modeIndex) : !solved.res.converged) throw new Error(`Optical mode solve of arm ${name} did not converge`);
    const arm = armOverlap(es, solved, name, lambda);
    const d = solved.diagnostics;
    // DevLog-031 phase 2: integrand split by Pockels coefficient and region, conventional overlap (same quadrature and
    // static-field sampling as the overlap above; the engine dn_eff/V stays primary).
    const tB = performance.now();
    const bd = solved.kind === 'vector' ? vectorEoBreakdown(solved.model, solved.mode, arm.staticFieldQ, lambda) : scalarEoBreakdown(es, solved.model, solved.mode, d.modeIndex);
    const conventional = armConventional(bd, armElectrodeGap(section, w, es.electrodePotentials), lambda, arm.neff, arm.dnEffPerV);
    const breakdownMs = performance.now() - tB;
    timing[name] = reused ? { reusedOpticalStage: true } : solved.timing;
    arms[name] = {
      arm, solved,
      diagnostics: {
        window: { x_um: [...w.x], y_um: [...w.y] }, neff: arm.neff, dnEffPerV: arm.dnEffPerV, phasePerVPerM: arm.phasePerVPerM,
        form: arm.form, modeIndex, mode: d.mode, converged: arm.converged, iterations: d.iterations ?? null, nNodes: d.nNodes, nTris: d.nTris,
        boundaryMarginFraction: arm.boundaryMarginFraction, metal: arm.metal, byRegion: arm.byRegion,
        solver: solved.kind, ...(solved.kind === 'vector' ? { order: d.order, nDof: d.nDof, teFraction: d.teFraction, residual: d.residual } : {}),
        breakdown: { ...breakdownSummary(bd, arm.dnEffPerV), ms: breakdownMs }, conventional,
      },
    };
  }
  onProgress('Combining arm overlaps');
  const combined = combineArms({ armA: arms.A.arm, armB: arms.B?.arm ?? null, drive: eo.armDrive, lambdaUm: lambda, terminalDrive: eo.terminalDrive, ...(opts.solver === 'vector' ? { baseLabels: [] } : {}) });
  const lengthMm = config.raw.line?.length_mm ?? null;
  const vpiDcV = lengthMm == null ? null : vpiAtLength(combined.vpiLVcm, lengthMm / 10);
  const compatible = compatibleVpiConventions(eo.armDrive, eo.terminalDrive, combined.pushPullBalance);
  const warnings = [...combined.labels, ...combined.limitations, ...arms.A.arm.assumptions,
    'field_sampled_across_meshes', 'dc_quasi_static_vpi_no_rf_velocity_or_loss', combined.status];
  if (eo.armDrive === 'two_arm_field_resolved' && !compatible.length) warnings.push('field_resolved_arms_not_push_pull');
  const balanceDeviates = combined.pushPullBalance < 0 && Math.abs(combined.pushPullBalance + 1) > PUSH_PULL_BALANCE_TOLERANCE;
  if (balanceDeviates) warnings.push('push_pull_balance_deviates_from_-1_by_more_than_0.1');
  return {
    metrics: { vpi_l_dc_vcm: combined.vpiLVcm, ...(vpiDcV == null ? {} : { vpi_dc_v: vpiDcV }) },
    warnings, timing,
    models: { A: arms.A.solved, B: arms.B ? arms.B.solved : null },
    result: {
      status: combined.status, drive: combined.drive, terminalDrive: combined.terminalDrive,
      arms: { A: arms.A.diagnostics, B: arms.B?.diagnostics ?? null },
      dnEffPerVDifference: combined.dnEffPerV.difference, phaseDifferencePerVPerM: combined.phaseDifferencePerVPerM,
      armGainVsArmA: combined.armGainVsArmA, pushPullBalance: combined.pushPullBalance,
      pushPullBalanceTolerance: PUSH_PULL_BALANCE_TOLERANCE, pushPullBalanceDeviates: balanceDeviates,
      vpiLVcm: combined.vpiLVcm, vpiDcV, lengthMm, compatibleVpiConventions: compatible,
      converged: combined.converged, labels: combined.labels, limitations: combined.limitations,
      assumptions: arms.A.arm.assumptions, convention: EO_CONVENTIONS.id, solver: opts.solver,
      conventional: combinedConventional(arms.A.diagnostics.conventional, arms.B?.diagnostics.conventional ?? null, lambda, combined.vpiLVcm),
      formulas: EO_FORMULAS,
      accuracyNote: EO_ACCURACY_NOTE,
    },
  };
}

const summarize = (p) => ({
  fGhz: p.fGhz, alphaDbPerCm: p.alphaDbPerCm, alphaNpPerM: p.alphaNpPerM, nRf: p.nRf, z0ReOhm: p.z0.re, z0ImOhm: p.z0.im,
  rOhmPerM: p.rOhmPerM, gSPerM: p.gSPerM, warnings: p.warnings,
});

/**
 * Build the uniform RF line from the electrostatic section result and the validated loss declaration, then evaluate the
 * sweep and every frequency-specific RF target frequency.
 * @param {{section:any, es:any, rf:any, targets:any[], onProgress:(m:string)=>void}} p
 */
export function runRfStage({ section, es, rf, targets, onProgress, meshScale = 1, elementOrder = 1 }) {
  const { line, wheeler, conductor, regions, lossLabels } = buildRfLine({ section, es, rf, onProgress, meshScale, elementOrder });
  const independent = !rf.paper && rf.conductorModel !== 'rprime_reference';
  const sweep = rf.sweepGhz ? rf.sweepGhz.map((f) => propagationAt(line, f * 1e9)) : null;
  // Paper-input lines are never evaluated at target frequencies (their values are inputs, not predictions).
  const freqs = independent ? [...new Set(targets.filter((t) => t.at_ghz != null && RF_FREQUENCY_METRICS.includes(t.metric)).map((t) => t.at_ghz))].sort((a, b) => a - b) : [];
  // fGhz echoes the target value exactly (f * 1e9 / 1e9 need not round-trip) so targets can be matched by equality.
  const atTargets = freqs.map((f) => ({ ...summarize(propagationAt(line, f * 1e9)), fGhz: f }));
  const pointWarnings = [...new Set([...(sweep ?? []).flatMap((p) => p.warnings), ...atTargets.flatMap((p) => p.warnings)])];
  const warnings = [...lossLabels, ...pointWarnings, ...rfModelWarnings(rf, wheeler, independent)];
  return {
    warnings, line,
    timing: wheeler ? { wheelerSolves: wheeler.solveTiming } : null,
    result: {
      lossSource: rf.paper ? 'paper_input' : 'model', independentPrediction: independent,
      conductorModel: rf.conductorModel, dielectricModel: rf.dielectricModel, lossLabels,
      sigmaSm: conductor?.sigmaSm ?? null, thicknessUm: rf.thicknessUm, kPerM: conductor?.kPerM ?? null,
      thicknessModel: rf.conductor?.thicknessModel ?? null,
      dcResistance: dcResistanceCheck(section, conductor, rf),
      wheeler: wheeler && (({ solveTiming, ...w }) => w)(wheeler),
      perimetersM: conductor?.signalPerimeterM != null ? { signal: conductor.signalPerimeterM, ground: conductor.returnPerimeterM } : null,
      regions: regions.map((r) => ({ name: r.name, material: r.material, energyFraction: r.energyFraction, loss: r.loss })),
      paper: rf.paper ? { source: rf.paper.source, citation: rf.paper.citation } : null,
      lPulNhPerM: line.lPul * 1e9, cPulPfPerM: line.cPul * 1e12,
      sweep: sweep && {
        fGhz: sweep.map((p) => p.fGhz), alphaDbPerCm: sweep.map((p) => p.alphaDbPerCm), nRf: sweep.map((p) => p.nRf),
        z0ReOhm: sweep.map((p) => p.z0.re), z0ImOhm: sweep.map((p) => p.z0.im),
      },
      atTargets,
    },
  };
}

/**
 * DC check of the conductor model (DevLog-036 round 2, S2): uniform-current loop resistance from the electrode
 * cross-section areas, 1/(sigma A_signal) + 1/(sigma sum A_ground) (config-frame polygons; a mirror-cropped half is not
 * corrected), next to the f -> 0 limit K / (sigma t_eff) of the slab surface model (null for semi_infinite, whose
 * R' -> 0). A comparison, not a correction.
 */
function dcResistanceCheck(section, conductor, rf) {
  const sigma = conductor?.sigmaSm;
  if (!(sigma > 0) || conductor?.kPerM == null) return null;
  const area = (poly) => Math.abs(poly.reduce((a, q, i) => { const r = poly[(i + 1) % poly.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0)) / 2 * 1e-12;
  const as = section.electrodes.filter((e) => e.role === 'signal').reduce((a, e) => a + area(e.poly), 0);
  const ag = section.electrodes.filter((e) => e.role === 'ground').reduce((a, e) => a + area(e.poly), 0);
  const tm = rf.conductor?.thicknessModel ?? 'semi_infinite';
  const tEff = rf.thicknessUm == null ? null : rf.thicknessUm * 1e-6 * (tm === 'slab_symmetric' ? 0.5 : 1);
  return {
    uniformCurrentOhmPerM: as > 0 && ag > 0 ? 1 / (sigma * as) + 1 / (sigma * ag) : null,
    slabLimitOhmPerM: tm !== 'semi_infinite' && tEff ? conductor.kPerM / (sigma * tEff) : null,
    thicknessModel: tm,
    // round 3 (audit R2-1): the slab limit uses the geometry factor K frozen at the high-frequency current distribution
    note: 'model f -> 0 limit (geometry factor K frozen at the high-frequency distribution) next to the uniform-current R_DC; not a validity test of the face model',
  };
}

/** Standing labels of an RF line model (shared by rf_line and the loaded-line sections). */
function rfModelWarnings(rf, wheeler, independent) {
  const warnings = ['frequency_independent_c_and_l_quasi_tem', 'perturbative_loss_lossless_field_distribution'];
  if (rf.dielectricModel === 'tan_delta_regions') warnings.push('scalar_tan_delta_per_region_energy_participation');
  if (rf.conductorModel === 'none') warnings.push('conductor_loss_declared_none');
  if (rf.dielectricModel === 'none') warnings.push('dielectric_loss_declared_none');
  if (rf.thicknessUm != null) warnings.push('skin_depth_check_uses_min_electrode_bbox_dimension');
  if (wheeler && wheeler.maxRelativeSpread > WHEELER_SPREAD_WARNING) warnings.push('wheeler_step_check_spread_above_1e-2');
  if (rf.dirichletSides?.length) warnings.push('dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included');
  if (!independent) warnings.push(rf.paper ? 'paper_loss_is_input_not_prediction' : 'conductor_resistance_is_configured_input');
  return warnings;
}

/**
 * Uniform RF line of one cross-section from its electrostatic result and the validated loss declaration (rfOptions).
 * Wheeler runs its recessed solves here. `cPulOverride` / `lPulOverride` (F/m, H/m) replace the section C' / L' (the
 * loaded section of a periodic line keeps the unloaded L', DevLog-036); `conductorOverride` replaces the conductor model.
 * @returns {{line:any, wheeler:any, conductor:any, regions:any[], lossLabels:string[]}}
 */
export function buildRfLine({ section, es, rf, onProgress = () => {}, meshScale = 1, elementOrder = 1, lPulOverride = null, conductorOverride = null }) {
  const params = lineParamsFromElectrostatics(es, section);
  let wheeler = null;
  if (!conductorOverride && rf.conductor?.model === 'wheeler') {
    const { fRefHz, ...rest } = rf.conductor;
    wheeler = wheelerResistance({ section, meshScale, sigmaSm: rest.sigmaSm, fRefHz, lPulNominal: params.lPul, onProgress, elementOrder });
    // R' proportional to R_s: the effective geometry factor R'/R_s carries the Wheeler value to every frequency.
    rf = { ...rf, conductor: { ...rest, model: 'surface_resistance_geometry_factor', kPerM: wheeler.rPrimeOhmPerM / surfaceResistanceOhm(fRefHz, rest.sigmaSm) } };
  }
  onProgress('Evaluating the RF line');
  const regions = params.regions.map((r) => ({ ...r, loss: rf.dielectricLoss ? rf.dielectricLoss[r.material] : null }));
  let spec;
  let conductor = conductorOverride ?? rf.conductor;
  const lc = lPulOverride != null ? { lPul: lPulOverride } : { c0Pul: params.c0Pul };
  if (rf.paper) spec = { cPul: params.cPul, ...lc, paperAttenuation: rf.paper };
  else {
    if (!conductorOverride && conductor.model === 'surface_resistance_perimeter') {
      const per = electrodePerimetersM(section);
      conductor = { ...conductor,
        signalPerimeterM: per.filter((e) => e.role === 'signal').reduce((a, e) => a + e.perimeterM, 0),
        returnPerimeterM: per.filter((e) => e.role === 'ground').reduce((a, e) => a + e.perimeterM, 0) };
    }
    const dielectric = rf.dielectricModel === 'none' ? { model: 'none' }
      : { model: 'regions', regions: regions.map((r) => (typeof r.loss === 'number' ? { name: r.name, energyFraction: r.energyFraction, tanDelta: r.loss } : { name: r.name, energyFraction: r.energyFraction, ...r.loss })) };
    spec = { cPul: params.cPul, ...lc, conductor, dielectric };
  }
  // Strip widths and conductor thickness travel with the line for the eo_response limits (DevLog-036 round 3, R2-2/R2-3).
  const widthUm = (e) => { const xs = e.poly.map((q) => q[0]); return Math.max(...xs) - Math.min(...xs); };
  const line = Object.freeze({ ...createRfLine(spec), strips: {
    signalWidthsUm: section.electrodes.filter((e) => e.role === 'signal').map(widthUm),
    groundWidthsUm: section.electrodes.filter((e) => e.role === 'ground').map(widthUm),
    thicknessUm: rf.thicknessUm ?? null,
  } });
  // Same labels as propagationAt().lossLabels (frequency independent).
  const conductorLabels = wheeler ? ['wheeler_incremental_inductance_recessed_solves', 'R_prime_scaled_with_R_s_from_reference_frequency'] : line.conductor?.labels;
  const lossLabels = line.kind === 'paper_input' ? ['paper_loss_is_input_equivalent_series_resistance'] : [...conductorLabels, line.dielectric.label];
  return { line, wheeler, conductor, regions, lossLabels, rf };
}

// ---- loaded line (periodic T-rail), DevLog-036 -------------------------------------------------------------------

/** Labels of every loaded-line result (model limits, DevLog-036). */
export const LOADED_LINE_LIMITATIONS = Object.freeze([
  'two_uniform_sections_per_period_from_2d_cuts',
  'no_3d_fringing_of_t_segments_or_stems',
  'loading_pads_held_at_electrode_potentials_by_config_weights',
  't_rail_stem_inductance_and_resistance_neglected',
  'bloch_line_used_as_effective_uniform_line_cell_averaged',
]);

const LOADED_LINE_REFERENCE = 'Shin, Sakamoto, Dagli, J. Lightwave Technol. 29, 48 (2011), Sec. II, eqs. (4), (5), (12); Sec. IV (T-rail width below about 3 um)';

/** Electrostatics of one cut of the periodic line, reusing the run solution or a small per-cache map (2 entries). */
function cutElectrostatics({ config, name, runSection, runEs, runEsScale, runElementOrder, meshScale, orderOverride, p2MeshFactor, cache, onProgress }) {
  if (name === runSection) return { es: runEs, section: crossSectionOf(config, name), reused: true, elementOrder: runElementOrder, meshScale: runEsScale };
  const section = crossSectionOf(config, name);
  section.farScale = meshScale; // R7 (DevLog-039): loaded-line cuts mesh with the run's far-field scale
  const g = config.geometries[name];
  const order = orderOverride ?? g.mesh.element_order ?? DEFAULT_ELEMENT_ORDER;
  const factor = order === 2 ? (p2MeshFactor ?? g.mesh.p2_mesh_factor ?? DEFAULT_P2_MESH_FACTOR) : 1;
  const key = geometryHash(section, config.materials, meshScale * factor, order).solution;
  const hit = cache?.s7Cuts?.find((e) => e.key === key);
  if (hit) return { es: hit.es, section, reused: true, elementOrder: order, meshScale: meshScale * factor };
  onProgress(`Meshing and solving electrostatics of cross-section ${name} (loaded line)`);
  const es = solveElectrostatics(section, { resolvedMaterials: config.materials, meshScale: meshScale * factor, elementOrder: order });
  if (cache) cache.s7Cuts = [{ key, es }, ...(cache.s7Cuts ?? [])].slice(0, 2);
  return { es, section, reused: false, elementOrder: order, meshScale: meshScale * factor };
}

const samePoly = (a, b) => a.length === b.length && a.every((p, i) => p[0] === b[i][0] && p[1] === b[i][1]);

/**
 * loaded_line stage: lossless Bloch quantities always (2D electrostatics of both cuts); the lossy Bloch line when the loss
 * declaration of both cuts is complete (lo.lossError null).
 * @param {{config:any, lo:any, runSection:string, runEs:any, meshScale:number, orderOverride:number|null, p2MeshFactor:number|null,
 *   cache:any, onProgress:(m:string)=>void, targets:any[], sweepGhz:number[]|null}} p
 */
export function runLoadedLineStage({ config, lo, runSection, runEs, runEsScale, runElementOrder, meshScale, orderOverride = null, p2MeshFactor = null, cache = null, onProgress = () => {}, targets = [], sweepGhz = null }) {
  const cutArgs = { config, runSection, runEs, runEsScale, runElementOrder, meshScale, orderOverride, p2MeshFactor, cache, onProgress };
  const U = cutElectrostatics({ ...cutArgs, name: lo.unloadedName });
  const Lc = cutElectrostatics({ ...cutArgs, name: lo.loadedName });
  const gU = config.geometries[lo.unloadedName];
  const gL = config.geometries[lo.loadedName];
  const unloadedNames = new Set(gU.electrodes.map((e) => e.name));
  const loadingConductors = gL.electrodes.filter((e) => !unloadedNames.has(e.name)).map((e) => e.name);
  const shared = gL.electrodes.filter((e) => unloadedNames.has(e.name));
  const railsIdentical = shared.length === gU.electrodes.length && shared.every((e) => samePoly(e.poly, gU.electrodes.find((u) => u.name === e.name).poly));
  const warnings = [...LOADED_LINE_LIMITATIONS];
  // Shin et al. 2011: T rails (separate loading conductors) leave L' and R' of the unloaded line; otherwise (the same
  // electrode set reshaped) the loaded section carries the line current itself and uses its own L' and conductor model.
  const tRail = loadingConductors.length > 0;
  if (tRail && !railsIdentical) warnings.push('loaded_and_unloaded_rails_differ_unloaded_inductance_used_for_both');
  if (!tRail) warnings.push('no_loading_conductors_loaded_section_uses_its_own_inductance_and_conductor_model');
  const LU = lPulFromC0(U.es.c0Pul);
  const LL = tRail ? LU : lPulFromC0(Lc.es.c0Pul);
  const none = { conductor: { model: 'none' }, dielectric: { model: 'none' } };
  const lossless = createLoadedLine({ periodM: lo.periodM, loadedLengthM: lo.loadedLengthM,
    unloaded: createRfLine({ cPul: U.es.cPul, lPul: LU, ...none }), loaded: createRfLine({ cPul: Lc.es.cPul, lPul: LL, ...none }) });
  const fBragg = lossless.bragg.fHz;
  const losslessSweep = sweepGhz && sweepGhz.map((f) => (f * 1e9 >= fBragg ? null : blochAt(lossless, f * 1e9)));
  let loss = null;
  let lossy = null;
  let timing = null;
  if (!lo.lossError) {
    onProgress('Loaded line: unloaded-section RF line');
    const bu = buildRfLine({ section: U.section, es: U.es, rf: lo.rfUnloaded, onProgress, meshScale: U.meshScale, elementOrder: U.elementOrder });
    onProgress('Loaded line: loaded-section RF line');
    const bl = tRail
      ? buildRfLine({ section: Lc.section, es: Lc.es, rf: lo.rfLoaded, onProgress, lPulOverride: LU, conductorOverride: bu.conductor })
      : buildRfLine({ section: Lc.section, es: Lc.es, rf: lo.rfLoaded, onProgress, meshScale: Lc.meshScale, elementOrder: Lc.elementOrder });
    lossy = createLoadedLine({ periodM: lo.periodM, loadedLengthM: lo.loadedLengthM, unloaded: bu.line, loaded: bl.line });
    const independent = lo.rfUnloaded.conductorModel !== 'rprime_reference';
    const sweep = sweepGhz && sweepGhz.map((f) => (f * 1e9 >= fBragg ? null : blochAt(lossy, f * 1e9)));
    const freqs = independent ? [...new Set(targets.filter((t) => t.at_ghz != null && RF_FREQUENCY_METRICS.includes(t.metric)).map((t) => t.at_ghz))].sort((a, b) => a - b) : [];
    const atTargets = freqs.map((f) => {
      if (f * 1e9 >= fBragg) return { fGhz: f, aboveBragg: true };
      const b = blochAt(lossy, f * 1e9);
      return { fGhz: f, alphaDbPerCm: b.alphaDbPerCm, nRf: b.nB, z0ReOhm: b.zB.re, z0ImOhm: b.zB.im, warnings: b.warnings };
    });
    const wheelers = { unloaded: bu.wheeler && (({ solveTiming, ...w }) => w)(bu.wheeler), loaded: bl.wheeler && (({ solveTiming, ...w }) => w)(bl.wheeler) };
    const pointWarnings = [...new Set([...(sweep ?? []).filter(Boolean).flatMap((p) => p.warnings), ...atTargets.flatMap((p) => p.warnings ?? [])])];
    warnings.push(...bu.lossLabels, ...pointWarnings, ...rfModelWarnings(lo.rfUnloaded, bu.wheeler, independent));
    if (!tRail) warnings.push(...rfModelWarnings(lo.rfLoaded, bl.wheeler, independent));
    timing = { wheelerSolves: [...(bu.wheeler?.solveTiming ?? []), ...(bl.wheeler?.solveTiming ?? [])] };
    loss = {
      lossSource: 'model', independentPrediction: independent, conductorModel: lo.rfUnloaded.conductorModel, dielectricModel: lo.rfUnloaded.dielectricModel,
      sigmaSm: bu.conductor?.sigmaSm ?? null, thicknessUm: lo.rfUnloaded.thicknessUm, thicknessModel: lo.rfUnloaded.conductor?.thicknessModel ?? null,
      lossLabels: bu.lossLabels, loadedSectionConductor: tRail ? 'unloaded_section_R_prime_shin2011' : 'own_conductor_model',
      wheeler: wheelers.unloaded, wheelerLoaded: wheelers.loaded,
      maxWheelerSpread: Math.max(wheelers.unloaded?.maxRelativeSpread ?? 0, wheelers.loaded?.maxRelativeSpread ?? 0),
      sections: {
        unloaded: { regions: bu.regions.map((r) => ({ name: r.name, material: r.material, energyFraction: r.energyFraction, loss: r.loss })) },
        loaded: { regions: bl.regions.map((r) => ({ name: r.name, material: r.material, energyFraction: r.energyFraction, loss: r.loss })) },
      },
      sweep: sweep && blochSweep(sweepGhz, sweep), atTargets,
    };
  } else warnings.push('loaded_line_loss_not_computed_incomplete_loss_declaration');
  const qs = lossless.quasiStatic;
  return {
    warnings, timing, line: lossy, losslessLine: lossless,
    result: {
      cuts: { loaded: lo.loadedName, unloaded: lo.unloadedName, solvedLoaded: !Lc.reused, solvedUnloaded: !U.reused },
      periodUm: lo.periodUm, loadedLengthUm: lo.loadedLengthUm, unloadedLengthUm: lo.periodUm - lo.loadedLengthUm,
      loadingConductors, railsIdentical, sectionModel: tRail ? 't_rail_capacitive_loading' : 'reshaped_rails',
      perLength: {
        unloaded: { cPfPerM: U.es.cPul * 1e12, c0PfPerM: U.es.c0Pul * 1e12, lNhPerM: LU * 1e9 },
        loaded: { cPfPerM: Lc.es.cPul * 1e12, c0PfPerM: Lc.es.c0Pul * 1e12, lNhPerM: LL * 1e9 },
        average: { cPfPerM: qs.cAvgFPerM * 1e12, lNhPerM: qs.lAvgHPerM * 1e9 },
      },
      quasiStatic: { nRf: qs.nRf, zOhm: qs.zOhm },
      braggGhz: fBragg / 1e9, braggGap: lossless.bragg.gap, braggEstimateGhz: lossless.bragg.estimateHz / 1e9,
      lossless: { sweep: losslessSweep && blochSweep(sweepGhz, losslessSweep) },
      loss, lossReason: lo.lossError, reference: LOADED_LINE_REFERENCE,
      formulas: {
        cell: 'symmetric [U(l_U/2)] [L(l_L)] [U(l_U/2)]; uniform section A = D = cosh(gamma l), B = Z0 sinh(gamma l), C = sinh(gamma l)/Z0',
        bloch: 'cosh(gamma_B p) = (A + D)/2, principal branch Re >= 0; Z_B = sqrt(B/C) at the middle of the unloaded section; n_B = c Im(gamma_B)/omega',
        sections: 'unloaded: C\'_U, L\'_U = 1/(c^2 C0\'_U), R\'_U; loaded (T rails present): C\'_L, L\'_L = L\'_U, R\'_L = R\'_U; G\' = omega C\' sum p_i tan d_i per cut',
        bragg: 'lowest f of the lossless cell with beta_B p = pi; values at or above it are not reported',
        quasiStatic: 'f -> 0: n_B0 = c sqrt(L\'_avg C\'_avg), Z_B0 = sqrt(L\'_avg / C\'_avg), X_avg = (X_U l_U + X_L l_L)/p',
      },
    },
  };
}

function blochSweep(fGhz, pts) {
  const g = (fn) => pts.map((p) => (p ? fn(p) : null));
  return { fGhz: [...fGhz], alphaDbPerCm: g((p) => p.alphaDbPerCm), nRf: g((p) => p.nB), zReOhm: g((p) => p.zB.re), zImOhm: g((p) => p.zB.im) };
}

// ---- EO response, DevLog-036 -----------------------------------------------------------------------------------------

/** Key of a response target (metric, frequency, reference) used to match targets with stage results. */
export const responseTargetKey = (t) => `${t.metric}|${t.at_ghz ?? ''}|${t.reference_ghz ?? ''}|${t.reference ?? ''}`;

/** References at which a target with an unstated paper reference is reported (GHz; null = DC limit), audit S1. */
export const UNSTATED_REFERENCE_SET_GHZ = Object.freeze([null, 1, 3]);
/** Warning when the Bragg frequency is within this factor of the highest evaluated frequency (audit S5). */
export const BRAGG_WARNING_FACTOR = 3;

/**
 * eo_response stage on a uniform rf_line (line from runRfStage) or the lossy loaded line. Periodic lines use the exact
 * cascade of the cell sections by default (responseModel 'exact_cascade'), or the Bloch gamma_B, Z_B as an effective
 * uniform line ('bloch_homogenised', values at or above fLimitHz omitted). ng: optical group index (optical_mode).
 * vpiDcV: eo_overlap Vpi at line.length_mm (or null).
 * @param {{kind:'uniform'|'periodic', line:any, opts:{lengthM:number, zs:number, zl:number, sweepGhz:number[]}, ngOpt:number,
 *   ngSource:string, vpiDcV:number|null, targets:any[], fLimitHz:number|null, responseModel?:string}} p
 */
export function runEoResponseStage({ kind, line, opts, ngOpt, ngSource, vpiDcV = null, targets = [], fLimitHz = null, responseModel = 'exact_cascade', junction = null }) {
  if (junction && kind !== 'uniform') throw new Error('eo_response: junction loading is implemented for a uniform electrode line only');
  const { lengthM, zs, zl, sweepGhz } = opts;
  const periodic = kind === 'periodic';
  const cascade = periodic && responseModel === 'exact_cascade';
  const sections = cascade ? cascadeSections(line, lengthM) : null;
  const phiDc = dcPhaseIntegral({ zs, zl, lengthM });
  // Round 3 (audit R2-4): with a finite-thickness conductor model R'(0) > 0 and the model's own f -> 0 limit is the DC
  // circuit: current I = V_s / (Z_s + Z_L + R_0), V(z) = I (Z_L + int_z^L R' ds), so
  // Phi_0 = I (Z_L L + int_0^L z R'(z) dz) (open load: Phi_0 = L). H is normalized by Phi_0; it equals the lossless
  // Phi_DC when R'(0) = 0 (semi-infinite surface model, paper loss laws) or Z_s = Z_L.
  const r0Of = (l) => (l?.kind === 'model' && l.conductor?.thicknessModel && l.conductor.thicknessModel !== 'semi_infinite' ? l.conductor.rAt(1) : 0);
  const segs = periodic ? cascadeSections(line, lengthM).map((x) => ({ l: x.l, r: r0Of(x.kind === 'U' ? line.unloaded : line.loaded) })) : [{ l: lengthM, r: r0Of(line) }];
  let zAcc = 0, rTot = 0, zr = 0;
  for (const g of segs) { rTot += g.r * g.l; zr += g.r * (zAcc * g.l + (g.l * g.l) / 2); zAcc += g.l; }
  let phiNorm = rTot > 0 ? (zl === Infinity ? lengthM : (zl * lengthM + zr) / (zs + zl + rTot)) : phiDc;
  // Round 5 (audit R34-7): a junction branch with a shunt conductance G'_j (reverse-bias leakage) gives the DC line a
  // shunt y_0 = G'_j / (1 + R'_j G'_j) per length: the DC line is the uniform line with series r_0 = R'(0) and shunt y_0
  // (gamma_0 = sqrt(r_0 y_0), Z_0 = sqrt(r_0 / y_0); for r_0 = 0 a uniform voltage across Z_L || 1/(y_0 L)), and the
  // junction voltage is the line voltage times 1 / (1 + R'_j G'_j). H is normalized by that DC junction phase.
  let junctionDcFactor = 1;
  const gj = junction?.gSPerM ?? 0;
  if (junction && gj > 0) {
    const y0 = gj / (1 + junction.rOhmM * gj);
    const r0 = rTot / lengthM;
    if (r0 > 0) phiNorm = phaseIntegral({ gamma: cx(Math.sqrt(r0 * y0)), z0: cx(Math.sqrt(r0 / y0)), zs, zl, betaO: 0, lengthM }).phi.re;
    else { const zp = zl === Infinity ? 1 / (y0 * lengthM) : zl / (1 + zl * y0 * lengthM); phiNorm = (lengthM * zp) / (zs + zp); }
    junctionDcFactor = 1 / (1 + junction.rOhmM * gj);
  }
  const phiNormJ = phiNorm * junctionDcFactor;
  const scale = phiDc / (junction ? phiNormJ : phiNorm);
  const h = (fHz) => {
    if (cascade) {
      const betaO = (2 * Math.PI * fHz * ngOpt) / C_LIGHT;
      const phi = cascadePhaseIntegral({ sections: cascadeAt(line, sections, fHz), zs, zl, betaO });
      return { re: phi.re / phiNorm, im: phi.im / phiNorm };
    }
    if (periodic && fLimitHz != null && fHz >= fLimitHz) return null;
    if (junction) {
      // DevLog-036 rounds 4-5: junction-loaded line; the phase follows V_j = V_line / (1 + R'_j (G'_j + j w C'_j))
      const p = junctionPropagationAt(line, junction, fHz);
      const v = cmul(responseAt({ fHz, gamma: p.gamma, z0: p.z0, zs, zl, ngOpt, lengthM }), p.junctionFactor);
      return { re: v.re * scale, im: v.im * scale };
    }
    const l = periodic ? (({ gammaB, zB }) => ({ gamma: gammaB, z0: zB }))(blochAt(line, fHz)) : (({ gamma, z0 }) => ({ gamma, z0 }))(propagationAt(line, fHz));
    const v = responseAt({ fHz, gamma: l.gamma, z0: l.z0, zs, zl, ngOpt, lengthM });
    return { re: v.re * scale, im: v.im * scale };
  };
  const grid = sweepGhz.map((f) => f * 1e9);
  const hs = grid.map(h);
  const s21 = hs.map((v) => (v ? toDb(v) : null));
  const refDb = (refGhz) => { if (refGhz == null) return 0; const v = h(refGhz * 1e9); return v ? toDb(v) : null; };
  const relDb = (fHz, r) => { const v = h(fHz); return v ? toDb(v) - r : NaN; };
  // S7: the bracket starts at the reference (DC: f = 0, 0 dB by the normalization) and continues on the sweep grid.
  const bandwidth = (thr, refGhz) => {
    const r = refDb(refGhz);
    if (r == null) return { status: 'invalid_reference', referenceGhz: refGhz };
    const f0 = refGhz == null ? 0 : refGhz * 1e9;
    const idx = grid.map((f, i) => i).filter((i) => grid[i] > f0);
    if (!idx.length) return { status: 'reference_above_sweep', referenceGhz: refGhz };
    const sub = idx.map((i) => grid[i]);
    const vals = idx.map((i) => (s21[i] == null ? NaN : s21[i] - r));
    const c = firstCrossing((f) => relDb(f, r), sub, thr, vals, { fHz: f0, valueDb: 0 });
    if (c.above) return { status: 'no_crossing', boundGhz: c.lastHz / 1e9, referenceGhz: refGhz, ...(c.invalidFromHz ? { invalidFromGhz: c.invalidFromHz / 1e9 } : {}) };
    return { status: 'found', fGhz: c.fHz / 1e9, referenceGhz: refGhz };
  };
  const evalTarget = (t, refGhz) => {
    if (t.metric === 'eo_rolloff_db') {
      const r = refDb(refGhz);
      const v = r == null ? NaN : relDb(t.at_ghz * 1e9, r);
      return Number.isFinite(v) ? { status: 'found', valueDb: v, referenceGhz: refGhz } : { status: 'above_bragg', referenceGhz: refGhz };
    }
    return bandwidth(BANDWIDTH_THRESHOLDS_DB[t.metric], refGhz);
  };
  const bw = { bw3db_ghz: bandwidth(BANDWIDTH_THRESHOLDS_DB.bw3db_ghz, null), bw6db_ghz: bandwidth(BANDWIDTH_THRESHOLDS_DB.bw6db_ghz, null) };
  const byTarget = [];
  const seen = new Set();
  for (const t of targets) {
    if (!RESPONSE_METRICS.includes(t.metric)) continue;
    const key = responseTargetKey(t);
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      if (t.reference === 'low_freq_unstated' || t.reference === 'unspecified')
        byTarget.push({ key, metric: t.metric, status: 'reference_unstated', reference: t.reference, byReference: UNSTATED_REFERENCE_SET_GHZ.map((g) => evalTarget(t, g)) });
      else byTarget.push({ key, metric: t.metric, ...evalTarget(t, t.reference_ghz ?? null) });
    } catch (e) { byTarget.push({ key, metric: t.metric, status: 'error', error: e instanceof Error ? e.message : String(e) }); }
  }
  // Round 3 (audit R2-2, R2-3): conductor-model limits along the evaluated band of each target.
  const cl = periodic ? line.unloaded : line;
  const cond = cl?.kind === 'model' ? cl.conductor : null;
  const strips = cl?.strips ?? null;
  const tm = cond?.thicknessModel ?? null;
  const slabModel = tm != null && tm !== 'semi_infinite';
  const wMin = strips?.signalWidthsUm?.length ? Math.min(...strips.signalWidthsUm) : null;
  // order-of-magnitude estimate: the thin-sheet diffusion length delta^2 / t equals the strip width w
  const fLatHz = cond?.sigmaSm > 0 && strips?.thicknessUm > 0 && wMin > 0 ? 1 / (Math.PI * MU0 * cond.sigmaSm * strips.thicknessUm * 1e-6 * wMin * 1e-6) : null;
  const lateralText = fLatHz == null ? null : `band_below_lateral_current_relaxation_estimate: the band from the reference reaches below f_lat ~ 1/(pi mu0 sigma t w) = ${(fLatHz / 1e9).toPrecision(2)} GHz (t ${strips.thicknessUm} um, narrowest signal strip w ${wMin} um; order-of-magnitude estimate), below which the current spreads across the strip width towards R_DC and the geometry factor K of the high-frequency distribution no longer applies.`;
  const slabText = slabModel ? `slab_model_limits: ${tm} surface impedance with the geometry factor K frozen at the high-frequency (Wheeler / perimeter) current distribution; sidewall surfaces also get coth(k t_eff) although they are thick in their own normal direction; the f -> 0 R' is not a DC prediction.` : null;
  const diagnosticsFor = (refGhz) => {
    const out = [];
    if (slabText) out.push({ code: 'slab_model_limits', text: slabText });
    const low = refGhz != null ? refGhz * 1e9 : 0;
    if (lateralText && low < fLatHz) out.push({ code: 'band_below_lateral_current_relaxation_estimate', text: lateralText });
    return out;
  };
  const attach = (x, refGhz) => { const d = diagnosticsFor(refGhz); if (d.length) x.diagnostics = d; };
  for (const x of byTarget) {
    const t = targets.find((q) => responseTargetKey(q) === x.key);
    if (!t || x.status === 'error') continue;
    // round 5 (audit R34-1): the per-reference entries of unstated-reference targets carry their own diagnostics
    if (x.status === 'reference_unstated') x.byReference.forEach((e) => attach(e, e.referenceGhz));
    else attach(x, t.reference_ghz ?? null);
  }
  // DC-referenced headline bandwidths (and metrics.bw3db_ghz / bw6db_ghz)
  attach(bw.bw3db_ghz, null);
  attach(bw.bw6db_ghz, null);
  const warnings = ['eo_response_small_signal_first_order_pockels', rTot > 0 ? 'eo_response_normalized_to_model_dc_limit_with_series_resistance' : 'eo_response_dc_limit_reference_lumped_lossless_dc'];
  if (slabModel) warnings.push('slab_model_limits_frozen_geometry_factor_and_sidewalls');
  // round 5 (R34-1): the sweep and the headline bandwidths are DC-referenced, so the warning stands whenever the estimate exists
  if (fLatHz != null) warnings.push('band_below_lateral_current_relaxation_estimate');
  if (cascade) warnings.push('eo_response_on_exact_section_cascade_uniform_eo_weight');
  else if (periodic) warnings.push('eo_response_on_bloch_effective_line');
  if (periodic && vpiDcV != null) warnings.push('vpi_rf_uses_run_section_eo_overlap_over_full_length');
  if (ngSource === 'fixed') warnings.push('eo_response_uses_configured_group_index');
  if (!cascade && periodic && fLimitHz != null && grid.some((f) => f >= fLimitHz)) warnings.push('eo_response_sweep_reaches_bragg_frequency_values_omitted');
  // highest evaluated frequency: sweep end, target frequencies and found crossings
  const found = [...Object.values(bw), ...byTarget.flatMap((x) => (x.byReference ? x.byReference : [x]))].filter((x) => x.status === 'found' && x.fGhz != null).map((x) => x.fGhz * 1e9);
  const fMaxHz = Math.max(grid.at(-1), ...targets.filter((t) => t.at_ghz != null && RESPONSE_METRICS.includes(t.metric)).map((t) => t.at_ghz * 1e9), ...found);
  const braggWarn = periodic && fLimitHz != null && fLimitHz < BRAGG_WARNING_FACTOR * fMaxHz;
  if (braggWarn) warnings.push('bragg_frequency_within_3x_of_highest_evaluated_frequency');
  return {
    warnings,
    result: {
      convention: EO_RESPONSE_CONVENTIONS, lineKind: periodic ? (cascade ? 'loaded_line_exact_cascade' : 'loaded_line_bloch') : junction ? 'junction_loaded_rf_line' : 'uniform_rf_line',
      junction: junction ? { rOhmM: junction.rOhmM, cFPerM: junction.cFPerM, gSPerM: junction.gSPerM ?? 0, fRcGhz: 1 / (2 * Math.PI * junction.rOhmM * junction.cFPerM) / 1e9, biasV: junction.biasV ?? null } : null,
      responseModel: periodic ? responseModel : null, nSections: sections ? sections.length : null,
      lengthMm: lengthM * 1e3, sourceOhm: zs, loadOhm: zl, ngOpt, ngSource, vpiDcV,
      reference: 'dc_limit', fLimitGhz: !cascade && fLimitHz != null ? fLimitHz / 1e9 : null,
      normalization: junction && gj > 0 ? 'model_dc_with_junction_conductance' : rTot > 0 ? 'model_dc_with_series_resistance' : 'lossless_dc', seriesResistanceDcOhm: rTot,
      normalizationOffsetDb: 20 * Math.log10((junction ? phiNormJ : phiNorm) / phiDc), thicknessModel: tm,
      vRefDefinition: rTot > 0 || (junction && gj > 0) ? 'mean DC junction (line) voltage of the model, V_s Phi_0 / L' : 'V_s Z_L / (Z_s + Z_L)',
      metricDiagnostics: { bw3db_ghz: (bw.bw3db_ghz.diagnostics ?? []).map((d) => d.code), bw6db_ghz: (bw.bw6db_ghz.diagnostics ?? []).map((d) => d.code) },
      lateralRelaxationGhz: fLatHz == null ? null : fLatHz / 1e9, lateralRelaxationNote: fLatHz == null ? null : 'f_lat ~ 1/(pi mu0 sigma t w), narrowest signal strip; order-of-magnitude estimate (thin-sheet diffusion length delta^2/t equal to w)',
      braggGhz: periodic && fLimitHz != null ? fLimitHz / 1e9 : null, highestEvaluatedGhz: fMaxHz / 1e9, braggWithin3x: braggWarn,
      sweep: {
        fGhz: [...sweepGhz], s21EoDb: s21, hRe: hs.map((v) => (v ? v.re : null)), hIm: hs.map((v) => (v ? v.im : null)),
        vpiRfV: vpiDcV == null ? null : hs.map((v) => (v ? vpiDcV / Math.hypot(v.re, v.im) : null)),
      },
      bw3dbGhz: bw.bw3db_ghz.status === 'found' ? bw.bw3db_ghz.fGhz : null,
      bw6dbGhz: bw.bw6db_ghz.status === 'found' ? bw.bw6db_ghz.fGhz : null,
      bandwidth: bw, byTarget,
    },
  };
}

// ---- Si phase shifter: junction-loaded traveling-wave response after the semiconductor stage (DevLog-036 round 4) ------

/**
 * Junction-loaded TWE response. Electrode line: rf_line on the electrode cross-section `rfSection` (C', L', R', G' with
 * the config's loss declaration); junction branch per length from the semiconductor stage at the operating DC bias
 * `biasV` (semiconductor.operating_bias_v; reverse bias only): R'_j = perLength.rOhmM, C'_j = cFPerM, G'_j = gSPerM
 * (null = 0), shunt Y'_j = (G'_j + j w C'_j) / (1 + R'_j (G'_j + j w C'_j)) (Shin et al. 2011 Fig. 2, eqs. (1)-(5), p. 49;
 * p. 50 for junction loading); the phase follows V_j = V_line / (1 + R'_j (G'_j + j w C'_j)) with the small-signal
 * dn_eff/dV of the semiconductor stage at that bias (perLength.dneffPerV, +-dv/2 states). Optical group index: vector
 * mode solve on `semiSection`.
 * RF Vpi(f) = Vpi_DC / |H(f)|, Vpi_DC = lambda / (2 L |dn_eff/dV|) (single arm, swept-contact volts).
 * @param {{config:any, semi:any, semiSection:string, rfSection:string, biasV:number, meshScale?:number,
 *   onProgress?:(m:string)=>void, targets?:any[]}} p
 */
export function runJunctionResponseStage({ config, semi, semiSection = 'geometry', rfSection, biasV, meshScale = 1, onProgress = () => {}, targets = [] }) {
  if (typeof biasV !== 'number' || !Number.isFinite(biasV)) throw new Error('eo_response after the semiconductor stage needs the operating DC bias (semiconductor.operating_bias_v, or the run option biasV; one of semiconductor.bias.values); no default');
  if (typeof rfSection !== 'string' || !Object.hasOwn(config.geometries, rfSection)) throw new Error(`eo_response after the semiconductor stage needs the electrode cross-section (line.rf_section, or the run option rfSection; got ${rfSection})`);
  const pl = (semi.perLength ?? []).find((q) => q.biasV === biasV);
  const pt = (semi.points ?? []).find((q) => q.sweptBiasV === biasV);
  if (!pl || !pt) throw new Error(`no semiconductor bias point at ${biasV} V (biases: ${(semi.perLength ?? []).map((q) => q.biasV).join(', ')})`);
  if (!(pl.cFPerM > 0) || !(pl.rOhmM > 0)) throw new Error(`semiconductor bias ${biasV} V has no C' / R' (C' ${pl.cFPerM}, R' ${pl.rOhmM})`);
  // round 5 (audit R34-7): forward-bias C' is the quasi-static (charge-control) diffusion capacitance of the stored
  // minority charge, valid only for omega tau << 1 (configured SRH lifetimes, typically far below the GHz band); the
  // small-signal TWE would need the frequency-dependent diffusion admittance, which is not modelled.
  if (pl.forwardBiasV > 0) throw new Error(`semiconductor operating bias ${biasV} V is a forward-bias point (forward ${pl.forwardBiasV} V): its C' is the quasi-static diffusion capacitance (valid only for omega tau << 1), so the junction-loaded TWE circuit is not valid there; use a reverse-bias (depletion) operating point`);
  const dn = pl.dneffPerV ?? pt.optics?.dneffPerV;
  if (!Number.isFinite(dn)) throw new Error(`semiconductor bias ${biasV} V has no dn_eff/dV (needs semiconductor.optics and a swept bias with neighbours)`);
  const ero = eoResponseOptions(config.raw);
  // electrode line on the RF cross-section
  onProgress(`Electrode line on cross-section ${rfSection}`);
  const section = crossSectionOf(config, rfSection);
  section.farScale = meshScale; // R7 (DevLog-039)
  const g = config.geometries[rfSection];
  const order = g.mesh.element_order ?? DEFAULT_ELEMENT_ORDER;
  const esScale = meshScale * (order === 2 ? g.mesh.p2_mesh_factor ?? DEFAULT_P2_MESH_FACTOR : 1);
  const es = solveElectrostatics(section, { resolvedMaterials: config.materials, meshScale: esScale, elementOrder: order });
  const rf = rfOptions(config.raw, config.materials, g, rfSection);
  const rfOut = runRfStage({ section, es, rf, targets, onProgress, meshScale: esScale, elementOrder: order });
  // optical group index of the junction waveguide: the semiconductor stage's own mode (DevLog-043: same solve and
  // materials, including an explicit-index override; no second mode solve)
  const oo = opticalOptions(config.raw);
  const ngOpt = oo.groupIndex === 'fixed' ? config.raw.optics.ng_fixed : semi.optical?.ng;
  if (!(typeof ngOpt === 'number' && Number.isFinite(ngOpt) && ngOpt > 0)) throw new Error(`eo_response after the semiconductor stage needs the group index of the stage's optical mode (semiconductor.optics; got ${ngOpt})`);
  const lambdaM = oo.lambda0Um * 1e-6;
  const vpiDcV = lambdaM / (2 * ero.lengthM * Math.abs(dn));
  // G' null = below the residual floor (reverse bias): taken as 0 (semiconductor stage note)
  const junction = { rOhmM: pl.rOhmM, cFPerM: pl.cFPerM, gSPerM: pl.gSPerM ?? 0, biasV };
  const out = runEoResponseStage({ kind: 'uniform', line: rfOut.line, opts: ero, ngOpt, ngSource: oo.groupIndex, vpiDcV, targets, junction });
  const loaded = (ero.sweepGhz ?? []).map((f) => junctionPropagationAt(rfOut.line, junction, f * 1e9));
  out.result.junctionLine = {
    fGhz: [...ero.sweepGhz], alphaDbPerCm: loaded.map((q) => q.alphaDbPerCm), nRf: loaded.map((q) => q.nRf),
    z0ReOhm: loaded.map((q) => q.z0.re), z0ImOhm: loaded.map((q) => q.z0.im),
  };
  // round 5 (audit R34-6): thin-conductor diagnostic of the semi-infinite surface model, as on the cross-section path
  const rr = rfOut.result;
  out.result.thinConductorBelowGhz = rr.thicknessModel === 'semi_infinite' && rr.thicknessUm > 0 && rr.sigmaSm > 0
    ? 9 / (Math.PI * MU0 * rr.sigmaSm * (rr.thicknessUm * 1e-6) ** 2) / 1e9 : null;
  out.result.semiconductor = { biasV, dneffPerV: dn, gSPerM: junction.gSPerM, vpiDcConvention: 'single_arm_small_signal_lambda_over_2_L_dneff_per_v', flags: pl.flags ?? [], fRcGhz: 1 / (2 * Math.PI * pl.rOhmM * pl.cFPerM) / 1e9 };
  const warnings = [...rfOut.warnings, ...out.warnings, 'junction_loaded_line_shin2011_fig2_branch', 'phase_driven_by_junction_voltage_small_signal_at_dc_bias', 'electrode_cross_section_capacitance_excludes_junction_by_config'];
  if ((pl.flags ?? []).length) warnings.push('semiconductor_bias_point_flags_present');
  return { warnings, rf: rfOut.result, response: out.result, ngOpt, vpiDcV };
}
