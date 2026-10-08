// EO-overlap and RF-line stages of the cross-section runner (DevLog-012 items 1 and 2).
// Inputs come from the validated config (config.mjs eoOptions/rfOptions); nothing physical is defaulted here.
// Results are small serializable objects; no field arrays leave this module. License: GPL-3.0-or-later.

import { buildOpticalModel, solveModesAt } from './optics.mjs';
import { eoOverlapFromEngine, combineArms, vpiAtLength, EO_CONVENTIONS } from './eo-overlap.mjs';
import { createRfLine, propagationAt, lineParamsFromElectrostatics, electrodePerimetersM, skinDepthM, surfaceResistanceOhm, lPulFromC0, wheelerStepCheck } from './rf-line.mjs';
import { solveElectrostatics } from './electrostatics.mjs';
import { CrossSection } from './section.mjs';
import { recessGeometry } from './recess.mjs';
import { RF_FREQUENCY_METRICS, checkArmWindows } from './config.mjs';

export { RF_FREQUENCY_METRICS };
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
export function wheelerResistance({ section, meshScale, sigmaSm, fRefHz, lPulNominal, onProgress = () => {} }) {
  const halfDeltaUm = (skinDepthM(fRefHz, sigmaSm) / 2) * 1e6;
  const thicknessUm = section.thicknessHintUm ?? section.minElectrodeThickness();
  const solves = WHEELER_SCALES.map((scale) => {
    onProgress(`Wheeler recessed solve (${scale} x delta/2 = ${(scale * halfDeltaUm).toPrecision(3)} um)`);
    const recessed = new CrossSection(recessGeometry(section.geom, scale * halfDeltaUm), `${section.name}:recessed`,
      { refineWindows: section.refineWindows, thicknessUm });
    const es = solveElectrostatics(recessed, { meshScale, vacuumOnly: true });
    return { scale, lPul: lPulFromC0(es.c0Pul) };
  });
  const check = wheelerStepCheck(fRefHz, lPulNominal, solves);
  return { fRefGhz: fRefHz / 1e9, halfSkinDepthUm: halfDeltaUm, rPrimeOhmPerM: check.rPrimeOhmPerM[WHEELER_SCALES.indexOf(1)],
    scales: WHEELER_SCALES, rPrimeByScaleOhmPerM: check.rPrimeOhmPerM, maxRelativeSpread: check.maxRelativeSpread,
    spreadWarningLevel: WHEELER_SPREAD_WARNING };
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
export function runEoStage({ config, section, es, eo, opts, meshScale, onProgress, reuse = null }) {
  const lambda = opts.lambda0Um;
  const modeIndex = opts.modeIndex;
  const arms = {};
  checkArmWindows(eo, section);
  for (const name of ['A', 'B']) {
    const w = eo.windows[name];
    if (!w) continue;
    onProgress(`Solving the scalar optical mode of arm ${name}`);
    let model, mode;
    if (reuse && sameWindow(reuse.window, w)) ({ model, mode } = reuse);
    else {
      model = buildOpticalModel(section, config.materials, { ...opts, window: w, meshScale });
      mode = solveModesAt(model, lambda, { numModes: modeIndex + 1 });
    }
    if (!mode.converged) throw new Error(`Optical mode solve of arm ${name} did not converge`);
    const arm = eoOverlapFromEngine({ es, model, mode, modeIndex, arm: name });
    arms[name] = {
      arm,
      diagnostics: {
        window: { x_um: [...w.x], y_um: [...w.y] }, neff: arm.neff, dnEffPerV: arm.dnEffPerV, phasePerVPerM: arm.phasePerVPerM,
        form: arm.form, modeIndex, converged: arm.converged, iterations: mode.iterations, nNodes: model.mesh.nNodes, nTris: model.mesh.nTris,
        boundaryMarginFraction: arm.boundaryMarginFraction, metal: arm.metal, byRegion: arm.byRegion,
      },
    };
  }
  onProgress('Combining arm overlaps');
  const combined = combineArms({ armA: arms.A.arm, armB: arms.B?.arm ?? null, drive: eo.armDrive, lambdaUm: lambda, terminalDrive: eo.terminalDrive });
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
    warnings,
    result: {
      status: combined.status, drive: combined.drive, terminalDrive: combined.terminalDrive,
      arms: { A: arms.A.diagnostics, B: arms.B?.diagnostics ?? null },
      dnEffPerVDifference: combined.dnEffPerV.difference, phaseDifferencePerVPerM: combined.phaseDifferencePerVPerM,
      armGainVsArmA: combined.armGainVsArmA, pushPullBalance: combined.pushPullBalance,
      pushPullBalanceTolerance: PUSH_PULL_BALANCE_TOLERANCE, pushPullBalanceDeviates: balanceDeviates,
      vpiLVcm: combined.vpiLVcm, vpiDcV, lengthMm, compatibleVpiConventions: compatible,
      converged: combined.converged, labels: combined.labels, limitations: combined.limitations,
      assumptions: arms.A.arm.assumptions, convention: EO_CONVENTIONS.id,
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
export function runRfStage({ section, es, rf, targets, onProgress, meshScale = 1 }) {
  const params = lineParamsFromElectrostatics(es, section);
  let wheeler = null;
  if (rf.conductor?.model === 'wheeler') {
    const { fRefHz, ...rest } = rf.conductor;
    wheeler = wheelerResistance({ section, meshScale, sigmaSm: rest.sigmaSm, fRefHz, lPulNominal: params.lPul, onProgress });
    // R' proportional to R_s: the effective geometry factor R'/R_s carries the Wheeler value to every frequency.
    rf = { ...rf, conductor: { ...rest, model: 'surface_resistance_geometry_factor', kPerM: wheeler.rPrimeOhmPerM / surfaceResistanceOhm(fRefHz, rest.sigmaSm) } };
  }
  onProgress('Evaluating the RF line');
  const regions = params.regions.map((r) => ({ ...r, loss: rf.dielectricLoss ? rf.dielectricLoss[r.material] : null }));
  let spec;
  let conductor = rf.conductor;
  if (rf.paper) spec = { cPul: params.cPul, c0Pul: params.c0Pul, paperAttenuation: rf.paper };
  else {
    if (conductor.model === 'surface_resistance_perimeter') {
      const per = electrodePerimetersM(section);
      conductor = { ...conductor,
        signalPerimeterM: per.filter((e) => e.role === 'signal').reduce((a, e) => a + e.perimeterM, 0),
        returnPerimeterM: per.filter((e) => e.role === 'ground').reduce((a, e) => a + e.perimeterM, 0) };
    }
    const dielectric = rf.dielectricModel === 'none' ? { model: 'none' }
      : { model: 'regions', regions: regions.map((r) => (typeof r.loss === 'number' ? { name: r.name, energyFraction: r.energyFraction, tanDelta: r.loss } : { name: r.name, energyFraction: r.energyFraction, ...r.loss })) };
    spec = { cPul: params.cPul, c0Pul: params.c0Pul, conductor, dielectric };
  }
  const line = createRfLine(spec);
  const independent = !rf.paper && rf.conductorModel !== 'rprime_reference';
  const sweep = rf.sweepGhz ? rf.sweepGhz.map((f) => propagationAt(line, f * 1e9)) : null;
  // Paper-input lines are never evaluated at target frequencies (their values are inputs, not predictions).
  const freqs = independent ? [...new Set(targets.filter((t) => t.at_ghz != null && RF_FREQUENCY_METRICS.includes(t.metric)).map((t) => t.at_ghz))].sort((a, b) => a - b) : [];
  // fGhz echoes the target value exactly (f * 1e9 / 1e9 need not round-trip) so targets can be matched by equality.
  const atTargets = freqs.map((f) => ({ ...summarize(propagationAt(line, f * 1e9)), fGhz: f }));
  // Same labels as propagationAt().lossLabels (frequency independent).
  const conductorLabels = wheeler ? ['wheeler_incremental_inductance_recessed_solves', 'R_prime_scaled_with_R_s_from_reference_frequency'] : line.conductor?.labels;
  const lossLabels = line.kind === 'paper_input' ? ['paper_loss_is_input_equivalent_series_resistance'] : [...conductorLabels, line.dielectric.label];
  const pointWarnings = [...new Set([...(sweep ?? []).flatMap((p) => p.warnings), ...atTargets.flatMap((p) => p.warnings)])];
  const warnings = [...lossLabels, ...pointWarnings, 'frequency_independent_c_and_l_quasi_tem', 'perturbative_loss_lossless_field_distribution'];
  if (rf.dielectricModel === 'tan_delta_regions') warnings.push('scalar_tan_delta_per_region_energy_participation');
  if (rf.conductorModel === 'none') warnings.push('conductor_loss_declared_none');
  if (rf.dielectricModel === 'none') warnings.push('dielectric_loss_declared_none');
  if (rf.thicknessUm != null) warnings.push('skin_depth_check_uses_min_electrode_bbox_dimension');
  if (wheeler && wheeler.maxRelativeSpread > WHEELER_SPREAD_WARNING) warnings.push('wheeler_step_check_spread_above_1e-2');
  if (rf.dirichletSides?.length) warnings.push('dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included');
  if (!independent) warnings.push(rf.paper ? 'paper_loss_is_input_not_prediction' : 'conductor_resistance_is_configured_input');
  return {
    warnings,
    result: {
      lossSource: rf.paper ? 'paper_input' : 'model', independentPrediction: independent,
      conductorModel: rf.conductorModel, dielectricModel: rf.dielectricModel, lossLabels,
      sigmaSm: conductor?.sigmaSm ?? null, thicknessUm: rf.thicknessUm, kPerM: conductor?.kPerM ?? null, wheeler,
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
