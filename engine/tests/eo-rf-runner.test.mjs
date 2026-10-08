// Runner gates for the eo_overlap and rf_line stages and stage selection (DevLog-012 items 1-3).
// Expected values are closed forms derived in the comments (independent of the engine modules); every material
// number comes from the ILLUSTRATIVE fixture tests/fixtures/gsg-eo-rf.yaml and is not reference data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseConfig, normalizeConfig, inspectConfig, stageErrors, rfOptions, crossSectionOf, IMPLEMENTED_STAGES, STAGES } from '../src/config.mjs';
import { solveElectrostatics } from '../src/electrostatics.mjs';
import { runCrossSection, resolveStages, compareTargets } from '../src/run.mjs';
import { compatibleVpiConventions } from '../src/stages.mjs';
import { resolveMaterial } from '../src/materials.mjs';
import { recessPolygon, recessGeometry } from '../src/recess.mjs';
import { relErr } from './helpers.mjs';

const fixture = readFileSync(new URL('./fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
const chen = readFileSync(new URL('../../sims/chen2022/config.yaml', import.meta.url), 'utf8');
const raw = () => structuredClone(parseConfig(fixture).raw);
const run = (cfg, stages, extra = {}) => runCrossSection(typeof cfg === 'string' ? cfg : JSON.stringify(cfg), { stages, ...extra });
const EO = ['eo_overlap'];
const RF = ['rf_line'];

// Fixture constants (illustrative), SI.
const EPS0 = 8.8541878128e-12, MU0 = 1.25663706212e-6, C = 299792458;
const LAMBDA = 1.55e-6, NE = 2.1, R33 = 30e-12, EPSR = 30, GAP = 2e-6, HEIGHT = 2e-6, SIGMA = 4e7, TAND = 1e-3, K = 1 / HEIGHT;
const E_GAP = 1 / GAP; // V/m per volt of terminal voltage, uniform between full-height plates with zero-flux top/bottom
const boxNeff = (w, h) => Math.sqrt(NE ** 2 - (LAMBDA / (2 * w)) ** 2 - (LAMBDA / (2 * h)) ** 2);
const C0 = (2 * EPS0 * HEIGHT) / GAP; // two gaps in parallel

// Principal complex square root in polar form (independent of complex.mjs).
const csqrtPolar = (re, im) => { const r = Math.sqrt(Math.hypot(re, im)), t = Math.atan2(im, re) / 2; return [r * Math.cos(t), r * Math.sin(t)]; };
function closedLine({ fHz, R, G, Cp, Lp }) {
  const w = 2 * Math.PI * fHz;
  const zr = R, zi = w * Lp, yr = G, yi = w * Cp;
  const [gr, gi] = csqrtPolar(zr * yr - zi * yi, zr * yi + zi * yr);
  const d = yr * yr + yi * yi;
  const [z0r] = csqrtPolar((zr * yr + zi * yi) / d, (zi * yr - zr * yi) / d);
  return { alphaDbPerCm: (gr * 20) / Math.LN10 / 100, nRf: (C * gi) / w, z0Re: z0r };
}
const fixtureLine = (fGhz, { tand = TAND, k = K, cp = EPSR * C0 } = {}) => {
  const f = fGhz * 1e9;
  return closedLine({ fHz: f, R: Math.sqrt((Math.PI * f * MU0) / SIGMA) * k, G: 2 * Math.PI * f * cp * tand, Cp: cp, Lp: 1 / (C * C * C0) });
};

// ---- item 1: EO overlap stage ---------------------------------------------------------------------------------

test('E2i.2 field-resolved G-S-G arms: per-arm dn, push-pull balance, VpiL and Vpi match the uniform-field closed forms', () => {
  const r = run(fixture, ['optical_mode', ...EO]);
  assert.deepEqual(r.stages, ['electrostatics', 'optical_mode', 'eo_overlap']);
  const { A, B } = r.eo.arms;
  // Uniform material and uniform field: dn = -n_e^4 r33 E / (2 n_eff) exactly for the solved n_eff (TE weight psi^2).
  assert.ok(relErr(A.dnEffPerV, (-(NE ** 4) * R33 * E_GAP) / (2 * A.neff)) < 1e-9, `${A.dnEffPerV}`);
  assert.ok(relErr(B.dnEffPerV, (NE ** 4 * R33 * E_GAP) / (2 * B.neff)) < 1e-9, `${B.dnEffPerV}`);
  assert.ok(Math.abs(r.eo.pushPullBalance + 1) < 1e-6);
  assert.ok(Math.abs(r.eo.armGainVsArmA - 2) < 1e-6);
  // VpiL = lambda / (2 |dn_A - dn_B|); vs the analytic box mode n_eff (FEM n_eff error only).
  assert.ok(relErr(r.metrics.vpi_l_dc_vcm, (100 * LAMBDA) / (2 * Math.abs(A.dnEffPerV - B.dnEffPerV))) < 1e-12);
  const analytic = (100 * LAMBDA * boxNeff(1.6e-6, 1.6e-6) * GAP) / (2 * NE ** 4 * R33);
  assert.ok(relErr(r.metrics.vpi_l_dc_vcm, analytic) < 1e-4, `${r.metrics.vpi_l_dc_vcm} vs ${analytic}`);
  assert.ok(relErr(r.metrics.vpi_dc_v, r.metrics.vpi_l_dc_vcm / 1.0) < 1e-12, 'Vpi = VpiL / (10 mm = 1 cm)');
  assert.ok(Math.abs(r.eo.phaseDifferencePerVPerM - (2 * Math.PI / LAMBDA) * (A.dnEffPerV - B.dnEffPerV)) < 1e-9);
  assert.deepEqual(r.eo.compatibleVpiConventions, ['mzm_push_pull']);
  assert.equal(r.eo.convention, 'eo-atlas.eo-overlap/v2');
  assert.equal(r.eo.status, 'unvalidated_analytic_only');
  assert.ok(A.converged && B.converged && r.eo.converged.all);
  assert.ok(A.byRegion.medium.powerFraction > 0.999999);
  for (const w of ['scalar_optical_not_full_vector', 'first_order_pockels_perturbation', 'field_sampled_across_meshes', 'dc_quasi_static_vpi_no_rf_velocity_or_loss', 'unvalidated_analytic_only']) assert.ok(r.warnings.includes(w), w);
  // arm A uses the configured optical window: the optical-stage mode is reused, so n_eff agrees exactly.
  assert.equal(A.neff, r.metrics.n_eff);
  const vpi = r.targets.find((t) => t.metric === 'vpi_l_dc_vcm');
  assert.equal(vpi.status, 'pass');
  assert.match(r.targets.find((t) => t.metric === 'vpi_dc_v').reason, /per_arm_phase_shifter does not match/);
  const json = JSON.parse(JSON.stringify(r));
  assert.deepEqual(json.eo, r.eo);
  assert.ok(!JSON.stringify(r.eo).includes('psi'));
});

test('E2i.2 the EO stage runs without the optical-mode stage and gives the same VpiL', () => {
  const a = run(fixture, EO);
  const b = run(fixture, ['optical_mode', ...EO]);
  assert.deepEqual(a.stages, ['electrostatics', 'eo_overlap']);
  assert.ok(relErr(a.metrics.vpi_l_dc_vcm, b.metrics.vpi_l_dc_vcm) < 1e-12);
  assert.equal(a.metrics.n_eff, undefined);
});

test('E2i.2 single-arm drive doubles VpiL and matches the per-arm conventions only', () => {
  const two = run(fixture, EO);
  const c = raw();
  c.optics.eo.arm_drive = 'single_arm';
  delete c.optics.eo.arm_windows.B;
  const one = run(c, EO);
  assert.ok(relErr(one.metrics.vpi_l_dc_vcm, 2 * two.metrics.vpi_l_dc_vcm) < 1e-6);
  assert.equal(one.eo.arms.B, null);
  assert.equal(one.eo.pushPullBalance, null);
  assert.deepEqual(one.eo.compatibleVpiConventions, ['per_arm_phase_shifter', 'mzm_single_arm']);
  assert.equal(one.targets.find((t) => t.metric === 'vpi_dc_v').status, 'fail', 'per-arm target now evaluated against the 2x single-arm value');
  assert.match(one.targets.find((t) => t.metric === 'vpi_l_dc_vcm').reason, /mzm_push_pull does not match/);
});

test('E2i.2 differential terminal weights give the same V_t-referenced VpiL; terminal drive is a label checked against line.differential', () => {
  const base = run(fixture, EO);
  const c = raw();
  c.geometry.electrodes[0].weight = -0.5; c.geometry.electrodes[1].weight = 0.5; c.geometry.electrodes[2].weight = -0.5;
  c.optics.eo.terminal_drive = 'differential';
  c.line.differential = true;
  const d = run(c, EO);
  assert.ok(relErr(d.metrics.vpi_l_dc_vcm, base.metrics.vpi_l_dc_vcm) < 1e-9);
  assert.deepEqual(d.eo.compatibleVpiConventions, ['mzm_differential']);
  c.line.differential = false;
  assert.throws(() => normalizeConfig(c), /terminal_drive: differential contradicts line.differential: false/);
});

test('E2i.2 crystal rotation reaches the runner: 180 deg about the propagation axis flips every dn and leaves VpiL', () => {
  const base = run(fixture, EO);
  const c = raw();
  c.materials.eo_medium.crystal.rotation_deg = 180;
  const r = run(c, EO);
  assert.ok(relErr(r.eo.arms.A.dnEffPerV, -base.eo.arms.A.dnEffPerV) < 1e-9);
  assert.ok(relErr(r.eo.arms.B.dnEffPerV, -base.eo.arms.B.dnEffPerV) < 1e-9);
  assert.ok(relErr(r.metrics.vpi_l_dc_vcm, base.metrics.vpi_l_dc_vcm) < 1e-9);
});

test('E2i.2 same-sign arms are not push-pull: no catalogue convention, Vpi targets not evaluated', () => {
  const c = raw();
  c.optics.eo.arm_windows = { A: { x_um: [1.1, 1.9], y_um: [-0.8, 0.8] }, B: { x_um: [2.1, 2.9], y_um: [-0.8, 0.8] } };
  const r = run(c, EO);
  assert.ok(r.eo.pushPullBalance > 0.99, `${r.eo.pushPullBalance}`);
  assert.deepEqual(r.eo.compatibleVpiConventions, []);
  assert.ok(r.warnings.includes('field_resolved_arms_not_push_pull'));
  assert.match(r.targets.find((t) => t.metric === 'vpi_l_dc_vcm').reason, /no catalogue convention/);
  assert.deepEqual(compatibleVpiConventions('two_arm_field_resolved', 'single_ended', null), []);
});

test('E2i.2 arm windows, drives, conventions and crystal/Pockels inputs are validated without defaults', () => {
  const cases = [
    [(c) => { c.optics.eo.arm_drive = 'single_arm'; }, /single_arm drive takes arm A only/],
    [(c) => { delete c.optics.eo.arm_windows.B; }, /requires an arm B window/],
    [(c) => { delete c.optics.eo.arm_windows.A; }, /arm A window is required/],
    [(c) => { c.optics.eo.arm_windows.B = { x_um: [2, 3], y_um: [-0.8, 0.8] }; }, /overlap/],
    [(c) => { c.optics.eo.arm_windows.B = { x_um: [-6, -4], y_um: [-0.8, 0.8] }; }, /within the geometry domain/],
    [(c) => { c.optics.eo.arm_drive = 'push_pull'; }, /expected one of single_arm, two_arm_field_resolved/],
    [(c) => { c.optics.eo.terminal_drive = undefined; }, /terminal_drive: expected one of/],
    [(c) => { c.optics.eo.length_mm = 10; }, /optics.eo.length_mm: unsupported field/],
    [(c) => { c.optics.eo_typo = 1; }, /optics.eo_typo: unsupported field/],
    [(c) => { c.targets[2].vpi_convention = 'mzm_push_pull'; }, /only meaningful for vpi_l_dc_vcm, vpi_dc_v/],
    [(c) => { c.targets[0].vpi_convention = 'push_pull'; }, /vpi_convention: expected one of/],
    [(c) => { c.targets[0].source.comparable = 'no'; }, /comparable: expected a boolean/],
    [(c) => { c.materials.eo_medium.crystal.rotation_deg = '90'; }, /rotation_deg: expected a finite number/],
    [(c) => { c.materials.eo_medium.crystal.axis = 'z'; }, /crystal.axis: unsupported field/],
    [(c) => { c.materials.eo_medium.r_pm_per_v.r42 = 1; }, /r_pm_per_v.r42: unsupported field/],
    [(c) => { c.materials.eo_medium.r_pm_per_v.voigt = [[0, 0, 0]]; }, /voigt matrix or named coefficients, not both/],
    [(c) => { c.line.length_mm = 0; }, /line.length_mm: expected a finite positive number/],
  ];
  for (const [change, message] of cases) { const c = raw(); change(c); assert.throws(() => normalizeConfig(c), message); }
});

test('E2i.2 stage-time requirements: no optics.eo, arm on the discarded mirror half, no Pockels material', () => {
  const noEo = raw();
  delete noEo.optics.eo;
  assert.throws(() => run(noEo, EO), /optics.eo: the eo_overlap stage requires explicit/);
  assert.match(stageErrors(normalizeConfig(noEo)).eo_overlap, /optics.eo/);
  assert.equal(run(noEo, ['optical_mode']).eo, null, 'other stages do not need the EO block');
  const half = raw();
  half.geometry.symmetry = 'x_mirror_even';
  assert.throws(() => run(half, EO), /arm_windows.B: outside the solved half-domain/);
  const passive = raw();
  delete passive.materials.eo_medium.r_pm_per_v;
  assert.match(stageErrors(normalizeConfig(passive)).eo_overlap, /no material has Pockels coefficients/);
  assert.throws(() => run(passive, EO), /zero electro-optic phase difference/);
});

test('E2i.2 target gating: missing convention and comparable: false are never evaluated', () => {
  const metrics = { vpi_l_dc_vcm: 1, n_rf: 2 };
  const eo = { drive: 'single_arm', terminalDrive: 'single_ended', compatibleVpiConventions: ['per_arm_phase_shifter', 'mzm_single_arm'], lengthMm: null };
  const t = (extra) => compareTargets([{ metric: 'vpi_l_dc_vcm', value: 1, tol_rel: 0.1, ...extra }], metrics, { topology: 'none', eo })[0];
  assert.match(t({}).reason, /no vpi_convention/);
  assert.equal(t({ vpi_convention: 'mzm_single_arm' }).status, 'pass');
  assert.equal(t({ vpi_convention: 'mzm_series_push_pull' }).status, 'not_evaluated');
  assert.match(t({ vpi_convention: 'mzm_single_arm', source: { comparable: false } }).reason, /comparable: false/);
  const vpi = compareTargets([{ metric: 'vpi_dc_v', value: 1, tol_rel: 0.1, vpi_convention: 'mzm_single_arm' }], metrics, { eo })[0];
  assert.match(vpi.reason, /line.length_mm is not set/);
  assert.match(compareTargets([{ metric: 'n_rf', value: 2, tol_rel: 0.1, source: { comparable: false } }], metrics, { topology: 'none' })[0].reason, /comparable: false/);
});

// ---- item 2: RF line stage ------------------------------------------------------------------------------------

test('E3i G-S-G plates: region-weighted tan delta and geometry-factor skin loss match the closed-form complex gamma', () => {
  const r = run(fixture, RF);
  assert.deepEqual(r.stages, ['electrostatics', 'rf_line']);
  assert.equal(r.rf.independentPrediction, true);
  assert.equal(r.rf.lossSource, 'model');
  assert.equal(r.rf.sweep.fGhz.length, 9);
  r.rf.sweep.fGhz.forEach((f, i) => {
    const e = fixtureLine(f);
    assert.ok(relErr(r.rf.sweep.alphaDbPerCm[i], e.alphaDbPerCm) < 1e-9, `alpha ${f} GHz`);
    assert.ok(relErr(r.rf.sweep.nRf[i], e.nRf) < 1e-9, `n_rf ${f} GHz`);
    assert.ok(relErr(r.rf.sweep.z0ReOhm[i], e.z0Re) < 1e-9, `Z0 ${f} GHz`);
  });
  assert.deepEqual(r.rf.sweep.fGhz, [20, 30, 40, 50, 60, 70, 80, 90, 100]);
  const e50 = fixtureLine(50);
  const at = Object.fromEntries(r.targets.filter((t) => t.at_ghz).map((t) => [t.metric, t]));
  assert.equal(at.rf_loss_db_per_cm.status, 'pass');
  assert.ok(relErr(at.rf_loss_db_per_cm.actual, e50.alphaDbPerCm) < 1e-9);
  assert.ok(relErr(at.n_rf.actual, e50.nRf) < 1e-9);
  assert.equal(at.eo_rolloff_db.status, 'not_evaluated');
  assert.equal(r.rf.regions.length, 1);
  assert.ok(Math.abs(r.rf.regions[0].energyFraction - 1) < 1e-12);
  assert.equal(r.rf.sigmaSm, SIGMA);
  assert.equal(r.rf.thicknessUm, 2);
  for (const w of ['R_s_times_user_geometry_factor', 'energy_participation_weighted_tan_delta', 'frequency_independent_c_and_l_quasi_tem', 'skin_depth_check_uses_min_electrode_bbox_dimension'])
    assert.ok(r.warnings.includes(w), w);
  assert.ok(!r.warnings.includes('conductor_thickness_below_3_skin_depths_surface_resistance_invalid'), 'thickness 2 um > 3 delta from 20 GHz');
  const lowF = raw();
  lowF.sweep = { f_start_ghz: 1, f_stop_ghz: 2, n_points: 2 };
  assert.ok(run(lowF, RF).warnings.includes('conductor_thickness_below_3_skin_depths_surface_resistance_invalid'));
});

test('E3i energy participation of a two-layer gap: p_i = eps_i h_i / sum and G\' = omega C\' sum p_i tan delta_i', () => {
  // Horizontal interface at y = 0 between full-height vertical plates: E_x is tangential and uniform in both layers.
  const c = raw();
  c.materials.cladding = { n: 1.5, eps_r: 10, tan_delta_rf: 0 };
  c.geometry.regions.push({ name: 'upper', material: 'cladding', rect: { x_um: [-5, 5], y_um: [0, 1] } });
  c.line.conductor_loss_model = 'none';
  delete c.line.conductor_k_per_m;
  delete c.line.include_internal_inductance;
  const r = run(c, RF);
  const pLower = (30 * 1) / (30 * 1 + 10 * 1);
  const frac = Object.fromEntries(r.rf.regions.map((x) => [x.name, x.energyFraction]));
  assert.ok(Math.abs(frac.medium - pLower) < 1e-9 && Math.abs(frac.upper - (1 - pLower)) < 1e-9, JSON.stringify(frac));
  const cp = (2 * EPS0 * (30 * 1e-6 + 10 * 1e-6)) / GAP;
  const e = fixtureLine(50, { tand: pLower * TAND, k: 0, cp });
  const at = r.targets.find((t) => t.metric === 'n_rf' && t.at_ghz === 50);
  assert.ok(relErr(at.actual, e.nRf) < 1e-9);
  assert.match(r.targets.find((t) => t.metric === 'rf_loss_db_per_cm').reason, /Conductor loss is declared none/);
  const a50 = r.rf.sweep.alphaDbPerCm[r.rf.sweep.fGhz.indexOf(50)];
  assert.ok(relErr(a50, e.alphaDbPerCm) < 1e-9);
  assert.ok(r.warnings.includes('conductor_loss_declared_none'));
});

test('E3i dielectric conduction loss: tan delta(f) = sigma / (omega eps0 eps_r) of a scalar-eps material', () => {
  const c = raw();
  delete c.materials.eo_medium.tan_delta_rf;
  c.materials.eo_medium.sigma_Sm = 0.05; // illustrative
  const r = run(c, RF);
  const f = 50e9;
  const e = fixtureLine(50, { tand: 0.05 / (2 * Math.PI * f * EPS0 * EPSR) });
  assert.ok(relErr(r.rf.sweep.alphaDbPerCm[3], e.alphaDbPerCm) < 1e-9);
  assert.deepEqual(r.rf.regions[0].loss, { sigmaSm: 0.05, epsR: 30 });
});

test('E3i paper attenuation is an input: reproduced exactly, never evaluated as a prediction, never extrapolated', () => {
  const c = raw();
  c.line.conductor_loss_model = 'from_paper_alpha';
  for (const k of ['conductor_k_per_m', 'include_internal_inductance', 'dielectric_loss_model']) delete c.line[k];
  c.line.rf_loss_table = [{ f_ghz: 10, alpha_db_per_cm: 1 }, { f_ghz: 110, alpha_db_per_cm: 6 }];
  assert.throws(() => run(c, RF), /provenance.line.rf_loss_table: a paper attenuation input needs a provenance locator/);
  c.provenance = { 'line.rf_loss_table': { class: 'figure_digitized', locator: 'synthetic test table' } };
  const r = run(c, RF);
  assert.equal(r.rf.independentPrediction, false);
  assert.equal(r.rf.lossSource, 'paper_input');
  r.rf.sweep.fGhz.forEach((f, i) => assert.ok(Math.abs(r.rf.sweep.alphaDbPerCm[i] - (1 + (5 * (f - 10)) / 100)) < 1e-12, `${f} GHz`));
  for (const t of r.targets.filter((x) => x.at_ghz && x.metric !== 'eo_rolloff_db')) assert.match(t.reason, /paper attenuation as an input/);
  assert.equal(r.rf.atTargets.length, 0);
  assert.ok(r.warnings.includes('paper_loss_is_input_not_prediction'));
  c.sweep.f_stop_ghz = 120;
  assert.throws(() => run(c, RF), /no extrapolation/);
  const law = raw();
  law.line.conductor_loss_model = 'from_paper_alpha';
  for (const k of ['conductor_k_per_m', 'include_internal_inductance', 'dielectric_loss_model']) delete law.line[k];
  law.line.rf_loss_law = { alpha0_db_per_cm_per_sqrt_ghz: 0.5 };
  law.provenance = { 'line.rf_loss_law': { class: 'paper_exact', locator: 'synthetic' } };
  const rl = run(law, RF);
  rl.rf.sweep.fGhz.forEach((f, i) => assert.ok(relErr(rl.rf.sweep.alphaDbPerCm[i], 0.5 * Math.sqrt(f)) < 1e-12));
});

test('E3i configured R\' (rprime_reference) scales as sqrt(f) and is not an independent prediction', () => {
  const c = raw();
  c.line.conductor_loss_model = 'rprime_reference';
  delete c.line.conductor_k_per_m;
  c.line.r_pul_ref_ohm_per_m = 1000; c.line.r_pul_ref_ghz = 50;
  const r = run(c, RF);
  const e = closedLine({ fHz: 50e9, R: 1000, G: 2 * Math.PI * 50e9 * EPSR * C0 * TAND, Cp: EPSR * C0, Lp: 1 / (C * C * C0) });
  assert.ok(relErr(r.rf.sweep.alphaDbPerCm[3], e.alphaDbPerCm) < 1e-9);
  assert.match(r.targets.find((t) => t.metric === 'n_rf' && t.at_ghz).reason, /configured conductor resistance/);
  assert.ok(r.warnings.includes('conductor_resistance_is_configured_input'));
});

test('E3i perimeter model takes the signal and ground polygon perimeters and labels the bound condition', () => {
  const c = raw();
  c.line.conductor_loss_model = 'skin_effect_perimeter';
  delete c.line.conductor_k_per_m;
  c.line.perimeters_cover_carrying_surfaces = false;
  const r = run(c, RF);
  assert.ok(Math.abs(r.rf.perimetersM.signal - 8e-6) < 1e-15 && Math.abs(r.rf.perimetersM.ground - 16e-6) < 1e-15);
  assert.ok(r.warnings.includes('perimeter_coverage_not_declared_estimate_is_not_a_bound'));
  const e = fixtureLine(50, { k: 1 / 8e-6 + 1 / 16e-6 });
  assert.ok(relErr(r.rf.sweep.alphaDbPerCm[3], e.alphaDbPerCm) < 1e-9);
});

test('E3i frequency targets need the rf_line stage and a uniform line', () => {
  assert.match(run(fixture, []).targets.find((t) => t.metric === 'rf_loss_db_per_cm').reason, /require the rf_line stage/);
  const c = raw();
  c.alt_geometries = { cell: structuredClone(c.geometry) };
  // top-level geometry is the unloaded cut here, so rf_line runs on it (the loaded cut is blocked, Q2 C2)
  c.line.loading = { type: 'periodic_t_rail', period_um: 50, loaded_length_um: 40, unloaded_cross_section: 'geometry', loaded_cross_section: 'cell' };
  const r = run(c, RF);
  assert.ok(r.targets.filter((t) => t.at_ghz).every((t) => t.status === 'not_evaluated'));
  assert.match(r.targets.find((t) => t.metric === 'n_rf' && t.at_ghz).reason, /Periodic-line target/);
  assert.ok(r.targets.filter((t) => t.metric === 'vpi_l_dc_vcm' || t.metric === 'vpi_dc_v').every((t) => t.status === 'not_evaluated'));
});

test('E3i loss declarations are explicit: every missing or ambiguous input is an error', () => {
  const stageCases = [
    [(c) => { delete c.line.dielectric_loss_model; }, /dielectric_loss_model: required for rf_line/],
    [(c) => { delete c.line.conductor_loss_model; delete c.line.conductor_k_per_m; delete c.line.include_internal_inductance; }, /conductor_loss_model: required for rf_line/],
    [(c) => { delete c.materials.eo_medium.tan_delta_rf; }, /eo_medium: tan_delta_rf .* is required .* unknown loss is not zero/],
    [(c) => { delete c.line.include_internal_inductance; }, /include_internal_inductance: required/],
    [(c) => { delete c.line.conductor_k_per_m; }, /conductor_k_per_m: required/],
    [(c) => { delete c.materials.metal.sigma_Sm; }, /requires sigma_Sm for every electrode material/],
    [(c) => { c.materials.metal2 = { conductor: true, sigma_Sm: 3e7 }; c.geometry.electrodes[0].material = 'metal2'; }, /one conductivity for all electrodes/],
    [(c) => { c.line.conductor_loss_model = 'skin_effect_wheeler'; delete c.line.conductor_k_per_m; delete c.sweep; c.targets = c.targets.filter((t) => !t.at_ghz); }, /skin_effect_wheeler needs a sweep or an RF target frequency/],
    [(c) => { c.line.conductor_loss_model = 'from_paper_alpha'; for (const k of ['conductor_k_per_m', 'include_internal_inductance', 'dielectric_loss_model']) delete c.line[k]; }, /requires rf_loss_table or rf_loss_law/],
    [(c) => { c.geometry.electrodes[1].role = 'bias'; c.line.conductor_loss_model = 'skin_effect_perimeter'; delete c.line.conductor_k_per_m; c.line.perimeters_cover_carrying_surfaces = true; }, /roles signal and ground only/],
  ];
  for (const [change, message] of stageCases) {
    const c = raw(); change(c);
    assert.throws(() => run(c, RF), message);
    assert.match(stageErrors(normalizeConfig(c)).rf_line, message);
  }
  const parseCases = [
    [(c) => { c.line.conductor_loss_model = 'none'; }, /conductor_k_per_m: only used by conductor_loss_model: skin_effect_geometry_factor/],
    [(c) => { c.line.conductor_loss_model = 'skin_effect'; }, /expected one of none, rprime_reference/],
    [(c) => { c.line.dielectric_loss_model = 'uniform'; }, /expected one of none, tan_delta_regions/],
    [(c) => { c.line.include_internal_inductance = 'no'; }, /expected a boolean/],
    [(c) => { c.line.rf_loss_table = [{ f_ghz: 1, alpha_db_per_cm: 1 }, { f_ghz: 2, alpha_db_per_cm: 2 }]; }, /rf_loss_table: only used by conductor_loss_model: from_paper_alpha/],
    [(c) => { c.line.conductor_loss_model = 'from_paper_alpha'; delete c.line.conductor_k_per_m; delete c.line.include_internal_inductance; }, /would double count loss/],
    [(c) => { c.line.conductor_loss_model = 'from_paper_alpha'; for (const k of ['conductor_k_per_m', 'include_internal_inductance', 'dielectric_loss_model']) delete c.line[k]; c.line.rf_loss_table = [{ f_ghz: 1, alpha_db_per_cm: 1 }, { f_ghz: 2, alpha_db_per_cm: 2 }]; c.line.rf_loss_law = { alpha0_db_per_cm_per_sqrt_ghz: 1 }; }, /either rf_loss_table or rf_loss_law/],
    [(c) => { c.line.conductor_loss_model = 'from_paper_alpha'; for (const k of ['conductor_k_per_m', 'include_internal_inductance', 'dielectric_loss_model']) delete c.line[k]; c.line.rf_loss_table = [{ f_ghz: 2, alpha_db_per_cm: 1 }, { f_ghz: 1, alpha_db_per_cm: 2 }]; }, /strictly increasing/],
    [(c) => { c.line.conductor_loss_model = 'from_paper_alpha'; for (const k of ['conductor_k_per_m', 'include_internal_inductance', 'dielectric_loss_model']) delete c.line[k]; c.line.rf_loss_table = [{ f_ghz: 1, alpha_db_per_cm: -1 }, { f_ghz: 2, alpha_db_per_cm: 2 }]; }, /positive loss/],
    [(c) => { c.line.typo = 1; }, /line.typo: unsupported field/],
    [(c) => { c.sweep.n_points = 2.5; }, /n_points: expected an integer/],
    [(c) => { c.sweep.n_points = 5000; }, /n_points: expected an integer from 1 to 4001/],
    [(c) => { c.sweep.f_stop_ghz = 10; }, /f_stop_ghz must exceed f_start_ghz/],
    [(c) => { c.sweep.f_step_ghz = 1; }, /sweep.f_step_ghz: unsupported field/],
    [(c) => { c.materials.eo_medium.tan_delta_rf = -1e-4; }, /tan_delta_rf: expected a finite number >= 0/],
    [(c) => { c.materials.metal.tan_delta_rf = 0; }, /not meaningful for a conductor/],
    [(c) => { c.materials.eo_medium.sigma_Sm = 1; }, /either tan_delta_rf or a dielectric sigma_Sm/],
    [(c) => { delete c.materials.eo_medium.tan_delta_rf; c.materials.eo_medium.sigma_Sm = 1; c.materials.eo_medium.eps_r = { perp: 40, par: 30 }; }, /requires a scalar eps_r/],
  ];
  for (const [change, message] of parseCases) { const c = raw(); change(c); assert.throws(() => normalizeConfig(c), message); }
  // Single-point sweep is allowed when start = stop.
  const one = raw(); one.sweep = { f_start_ghz: 50, f_stop_ghz: 50, n_points: 1 };
  assert.deepEqual(run(one, RF).rf.sweep.fGhz, [50]);
  // Unknown RF loss is null (unknown), not zero.
  assert.equal(resolveMaterial('x', { eps_r: 2 }).tanDelta, null);
});

// ---- item 3: stage selection and readiness ---------------------------------------------------------------------

test('U3 stage selection: electrostatics always, STAGES order, legacy optical flag, unknown and unimplemented stages rejected', () => {
  assert.deepEqual(resolveStages(), ['electrostatics']);
  assert.deepEqual(resolveStages({ optical: true }), ['electrostatics', 'optical_mode']);
  assert.deepEqual(resolveStages({ stages: ['rf_line', 'eo_overlap'] }), ['electrostatics', 'eo_overlap', 'rf_line']);
  assert.deepEqual(resolveStages({ stages: ['optical_mode'], optical: true }), ['electrostatics', 'optical_mode']);
  assert.throws(() => resolveStages({ stages: ['eo_response'] }), /not implemented/);
  assert.throws(() => resolveStages({ stages: ['loaded_line'] }), /not implemented/);
  assert.throws(() => resolveStages({ stages: ['bogus'] }), /Unknown stage: bogus/);
  assert.throws(() => resolveStages({ stages: 'rf_line' }), /array/);
  assert.deepEqual(IMPLEMENTED_STAGES, STAGES.slice(0, 4));
  const r = run(fixture, ['rf_line', 'eo_overlap', 'optical_mode']);
  assert.deepEqual(r.stages, ['electrostatics', 'optical_mode', 'eo_overlap', 'rf_line']);
  assert.deepEqual(r.pendingStages, []);
  // Stage input errors are raised before any solve.
  const c = raw(); delete c.line.dielectric_loss_model;
  const progress = [];
  assert.throws(() => runCrossSection(JSON.stringify(c), { stages: RF, onProgress: (m) => progress.push(m) }), /dielectric_loss_model/);
  assert.deepEqual(progress, []);
});

test('U3 readiness: inspectConfig reports per-stage blocking inputs for the fixture, a paper config and an invalid draft', () => {
  const ok = inspectConfig(fixture);
  assert.equal(ok.solveError, '');
  for (const s of IMPLEMENTED_STAGES) assert.equal(ok.stageErrors[s], null, s);
  assert.match(ok.stageErrors.eo_response, /not implemented/);
  const paper = inspectConfig(chen).stageErrors;
  assert.equal(paper.electrostatics, null);
  assert.match(paper.eo_overlap, /optics.eo/);
  assert.match(paper.rf_line, /loaded cut of a periodic_t_rail line/, 'Q2 C2: chen2022 top-level geometry is its loaded cut');
  assert.match(stageErrors(parseConfig(chen), 'unloaded').rf_line, /dielectric_loss_model: required/);
  const c = raw(); delete c.materials.eo_medium.eps_r;
  const bad = inspectConfig(JSON.stringify(c));
  assert.match(bad.solveError, /RF permittivity/);
  for (const s of IMPLEMENTED_STAGES) assert.equal(bad.stageErrors[s], bad.solveError);
  assert.match(stageErrors(parseConfig(fixture), 'missing').electrostatics, /Unknown cross-section/);
});

test('U3 CLI --stages and --check', () => {
  const dir = mkdtempSync(join(tmpdir(), 'eo-atlas-cli-'));
  try {
    const path = join(dir, 'config.yaml');
    writeFileSync(path, fixture);
    const cli = fileURLToPath(new URL('../cli.mjs', import.meta.url));
    const call = (...args) => spawnSync(process.execPath, [cli, path, ...args], { encoding: 'utf8', timeout: 60000 });
    let out = call('--stages', 'eo_overlap,rf_line');
    assert.equal(out.status, 0, out.stderr);
    const result = JSON.parse(out.stdout);
    assert.deepEqual(result.stages, ['electrostatics', 'eo_overlap', 'rf_line']);
    assert.equal(result.targetSummary.failed, 0);
    out = call('--check');
    assert.equal(out.status, 0, out.stderr);
    const check = JSON.parse(out.stdout);
    assert.equal(check.solveError, null);
    assert.equal(check.stages.rf_line, null);
    assert.match(check.stages.loaded_line, /not implemented/);
    out = call('--stages', 'eo_response');
    assert.equal(out.status, 1);
    assert.match(out.stderr, /not implemented/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---- item 4: Wheeler incremental-inductance conductor model ---------------------------------------------------

test('Wheeler recess: rectangles, a non-convex T, kept boundary edges, both orientations, and topology errors', () => {
  const close = (a, b) => a.length === b.length && a.every((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1]) < 1e-12);
  const sq = [[0, 0], [2, 0], [2, 1], [0, 1]];
  assert.ok(close(recessPolygon(sq, 0.1), [[0.1, 0.1], [1.9, 0.1], [1.9, 0.9], [0.1, 0.9]]));
  assert.ok(close(recessPolygon([...sq].reverse(), 0.1), [[0.1, 0.9], [1.9, 0.9], [1.9, 0.1], [0.1, 0.1]]), 'CW input keeps its orientation');
  // bottom edge kept (on a boundary): only the other three faces move
  assert.ok(close(recessPolygon(sq, 0.1, (a, b) => a[1] === 0 && b[1] === 0), [[0.1, 0], [1.9, 0], [1.9, 0.9], [0.1, 0.9]]));
  // T: stem [-1,1] x [0,2], bar [-3,3] x [2,3]; every face moves 0.1 inward (re-entrant corners move outward along the bisector)
  const T = [[-1, 0], [1, 0], [1, 2], [3, 2], [3, 3], [-3, 3], [-3, 2], [-1, 2]];
  assert.ok(close(recessPolygon(T, 0.1), [[-0.9, 0.1], [0.9, 0.1], [0.9, 2.1], [2.9, 2.1], [2.9, 2.9], [-2.9, 2.9], [-2.9, 2.1], [-0.9, 2.1]]));
  assert.throws(() => recessPolygon(sq, 0.6), /collapses an electrode edge/);
  assert.throws(() => recessPolygon([[0, 0], [1, 0], [2, 0], [2, 1], [0, 1]], 0.1, (a, b) => a[0] === 0 && b[0] === 1), /collinear edges with different recess/);
  assert.throws(() => recessPolygon(sq, 0), /finite positive/);
  const g = parseConfig(fixture).geometries.geometry;
  const rg = recessGeometry(g, 0.1);
  // outer ground faces at x = -5, 5 and all faces on y = -1, 1 are domain cuts, not surfaces
  assert.ok(close(rg.electrodes[0].poly, [[-5, -1], [-3.1, -1], [-3.1, 1], [-5, 1]]));
  assert.ok(close(rg.electrodes[1].poly, [[-0.9, -1], [0.9, -1], [0.9, 1], [-0.9, 1]]));
  const mirrored = recessGeometry({ ...g, symmetry: 'x_mirror_even', mirror_x_um: 0, electrodes: [{ ...g.electrodes[1], poly: [[0, -1], [1, -1], [1, 1], [0, 1]] }] }, 0.1);
  assert.ok(close(mirrored.electrodes[0].poly, [[0, -1], [0.9, -1], [0.9, 1], [0, 1]]), 'edge on the mirror plane stays');
});

test('Wheeler model on the G-S-G fixture: recessed gap faces give R\' = R_s / h exactly (equal to the geometry factor)', () => {
  // Recessing the gap faces by d widens each gap to g + 2d: L' = mu0 (g + 2d) / (2h), so R' = omega mu0 d / h with
  // d = delta/2 = 1 / (2 sqrt(pi f mu0 sigma)), i.e. R' = sqrt(pi f mu0 / sigma) / h = R_s K with K = 1/h.
  const c = raw();
  c.line.conductor_loss_model = 'skin_effect_wheeler';
  delete c.line.conductor_k_per_m;
  const r = run(c, RF);
  const w = r.rf.wheeler;
  assert.equal(w.fRefGhz, 100, 'highest sweep or target frequency');
  assert.ok(relErr(w.rPrimeOhmPerM, Math.sqrt((Math.PI * 100e9 * MU0) / SIGMA) * K) < 1e-9, `${w.rPrimeOhmPerM}`);
  assert.ok(w.maxRelativeSpread < 1e-9);
  assert.deepEqual(w.scales, [0.25, 0.5, 1]);
  assert.ok(relErr(r.rf.kPerM, K) < 1e-9);
  assert.equal(r.rf.independentPrediction, true);
  r.rf.sweep.fGhz.forEach((f, i) => assert.ok(relErr(r.rf.sweep.alphaDbPerCm[i], fixtureLine(f).alphaDbPerCm) < 1e-9, `${f} GHz`));
  assert.equal(r.targets.find((t) => t.metric === 'rf_loss_db_per_cm').status, 'pass');
  assert.ok(r.warnings.includes('wheeler_incremental_inductance_recessed_solves'));
  assert.ok(!r.warnings.includes('wheeler_step_check_spread_above_1e-2'));
  // A recess deeper than half the thinnest conductor is a topology error, not a silent result.
  const thin = raw();
  thin.line.conductor_loss_model = 'skin_effect_wheeler';
  delete thin.line.conductor_k_per_m;
  thin.sweep = { f_start_ghz: 0.001, f_stop_ghz: 0.001, n_points: 1 };
  thin.targets = [];
  assert.throws(() => run(thin, RF), /collapses an electrode edge/);
});

// ---- Q2 corrections (audit e2i2-e3i-u3-q2, 2026-10-07) ---------------------------------------------------------

// Mirror-symmetric coplanar G-S-G on a thin EO film with a rib in each gap (ILLUSTRATIVE constants, same set as the
// fixture). The field is non-uniform, so the sampled dn depends on the local electrostatic mesh; by symmetry
// dn_B = -dn_A exactly, i.e. pushPullBalance = -1 up to the mesh asymmetry.
const coplanar = (optical) => {
  const A = { x_um: [1.5, 4.5], y_um: [-1, 1.5] }, B = { x_um: [-4.5, -1.5], y_um: [-1, 1.5] };
  return {
    schema: 'eo-atlas.sim/v1', id: 'q2-n1-coplanar',
    materials: {
      eo: { crystal: { cut: 'x', propagation: 'y' }, n_o: 2.2, n_e: 2.1, eps_r: { perp: 40, par: 30 }, r_pm_per_v: { r13: 10, r22: 4, r33: 30, r51: 25 } },
      clad: { n: 1.45, eps_r: 4 }, air: { n: 1, eps_r: 1 }, metal: { conductor: true },
    },
    geometry: {
      domain: { x_um: [-20, 20], y_um: [-6, 6] },
      regions: [
        { name: 'air', material: 'air', rect: { x_um: [-20, 20], y_um: [-6, 6] } },
        { name: 'clad', material: 'clad', rect: { x_um: [-20, 20], y_um: [-6, 0] } },
        { name: 'slab', material: 'eo', rect: { x_um: [-20, 20], y_um: [0, 0.3] } },
        { name: 'rib_r', material: 'eo', rect: { x_um: [2.4, 3.6], y_um: [0.3, 0.6] } },
        { name: 'rib_l', material: 'eo', rect: { x_um: [-3.6, -2.4], y_um: [0.3, 0.6] } },
      ],
      electrodes: [
        { name: 'ground_l', role: 'ground', material: 'metal', weight: 0, rect: { x_um: [-20, -5], y_um: [0.3, 1.1] } },
        { name: 'signal', role: 'signal', material: 'metal', weight: 1, rect: { x_um: [-1, 1], y_um: [0.3, 1.1] } },
        { name: 'ground_r', role: 'ground', material: 'metal', weight: 0, rect: { x_um: [5, 20], y_um: [0.3, 1.1] } },
      ],
      optical_window: optical === 'A' ? A : B,
      mesh: { max_edge_um: 2, electrode_edge_um: 0.1 },
    },
    optics: { wavelength_nm: 1550, polarization: 'TE', mode_index: 0, group_index_from: 'fixed', ng_fixed: 2.3,
      eo: { arm_drive: 'two_arm_field_resolved', terminal_drive: 'single_ended', arm_windows: { A, B } } },
  };
};

test('Q2 N1 symmetric push-pull gate: |balance + 1| < 2e-3 whichever arm coincides with optical_window', () => {
  // Before the fix the arm off optical_window sampled the coarse electrostatic mesh: |balance + 1| = 1.26e-2 here.
  const r = ['A', 'B'].map((w) => run(coplanar(w), EO));
  for (const x of r) assert.ok(Math.abs(x.eo.pushPullBalance + 1) < 2e-3, `balance ${x.eo.pushPullBalance}`);
  assert.ok(relErr(r[0].metrics.vpi_l_dc_vcm, r[1].metrics.vpi_l_dc_vcm) < 1e-3, `${r[0].metrics.vpi_l_dc_vcm} vs ${r[1].metrics.vpi_l_dc_vcm}`);
  assert.deepEqual(r[0].eo.compatibleVpiConventions, ['mzm_push_pull']);
  assert.ok(!r[0].warnings.includes('push_pull_balance_deviates_from_-1_by_more_than_0.1'));
  // The refinement follows the declaration, not the stage selection: an electrostatics-only run uses the same mesh.
  assert.equal(run(coplanar('A'), []).electrostatics.nNodes, r[0].electrostatics.nNodes);
});

test('Q2 C2 rf_line on the loaded cut of a periodic_t_rail line is blocked identically in readiness and run', () => {
  const c = raw();
  c.alt_geometries = { cell: structuredClone(c.geometry) };
  c.line.loading = { type: 'periodic_t_rail', period_um: 50, loaded_length_um: 40, unloaded_cross_section: 'cell' };
  const ready = stageErrors(normalizeConfig(c));
  assert.match(ready.rf_line, /rf_line: cross-section geometry is the loaded cut of a periodic_t_rail line/);
  assert.throws(() => run(c, RF), (e) => e.message === ready.rf_line);
  assert.equal(ready.electrostatics, null);
  assert.equal(ready.eo_overlap, null, 'only rf_line is blocked');
  assert.equal(stageErrors(normalizeConfig(c), 'cell').rf_line, null);
  assert.deepEqual(run(c, RF, { section: 'cell' }).stages, ['electrostatics', 'rf_line']);
  c.line.loading.loaded_cross_section = 'cell';
  c.line.loading.unloaded_cross_section = 'geometry';
  assert.match(stageErrors(normalizeConfig(c), 'cell').rf_line, /cross-section cell is the loaded cut/);
  assert.equal(stageErrors(normalizeConfig(c), 'geometry').rf_line, null);
});

test('Q2 M4 material and target keys are strict', () => {
  const cases = [
    [(c) => { c.materials.eo_medium.r_pm_per_V = c.materials.eo_medium.r_pm_per_v; delete c.materials.eo_medium.r_pm_per_v; }, /materials.eo_medium.r_pm_per_V: unsupported field/],
    [(c) => { c.materials.metal.sigma_sm = 1; }, /materials.metal.sigma_sm: unsupported field/],
    [(c) => { c.targets[3].at_GHz = c.targets[3].at_ghz; delete c.targets[3].at_ghz; }, /targets\[3\].at_GHz: unsupported field/],
    [(c) => { c.targets[0].tolerance = 1; }, /targets\[0\].tolerance: unsupported field/],
  ];
  for (const [change, message] of cases) { const c = raw(); change(c); assert.throws(() => normalizeConfig(c), message); }
  const ok = raw();
  Object.assign(ok.materials.metal, { n_complex: null, thickness_um: 1 });
  ok.materials.eo_medium.dispersion = 'lithium_niobate';
  ok.targets[0].source = { device_id: 'x', field: 'y', note: 'open', comparable: true };
  assert.doesNotThrow(() => normalizeConfig(ok));
});

test('Q2 M5 a negative balance far from -1 stays comparable but carries a warning', () => {
  const c = raw();
  c.geometry.electrodes[0].weight = 0.5; // left gap sees half the terminal voltage: balance about -0.5
  const r = run(c, EO);
  assert.ok(r.eo.pushPullBalance < -0.4 && r.eo.pushPullBalance > -0.6, `${r.eo.pushPullBalance}`);
  assert.deepEqual(r.eo.compatibleVpiConventions, ['mzm_push_pull']);
  assert.equal(r.eo.pushPullBalanceDeviates, true);
  assert.equal(r.eo.pushPullBalanceTolerance, 0.1);
  assert.ok(r.warnings.includes('push_pull_balance_deviates_from_-1_by_more_than_0.1'));
  const base = run(fixture, EO);
  assert.equal(base.eo.pushPullBalanceDeviates, false);
  assert.ok(!base.warnings.includes('push_pull_balance_deviates_from_-1_by_more_than_0.1'));
});

test('Q2 M6 readiness checks arm windows against the selected section and its mirror-cropped half', () => {
  const c = raw();
  c.alt_geometries = { narrow: { ...structuredClone(c.geometry), domain: { x_um: [-1, 5], y_um: [-1, 1] }, optical_window: { x_um: [1.2, 2.8], y_um: [-0.8, 0.8] } } };
  c.alt_geometries.narrow.electrodes = c.alt_geometries.narrow.electrodes.slice(1);
  c.alt_geometries.narrow.regions = [{ name: 'medium', material: 'eo_medium', rect: { x_um: [-1, 5], y_um: [-1, 1] } }];
  const cfg = normalizeConfig(c);
  const msg = stageErrors(cfg, 'narrow').eo_overlap;
  assert.match(msg, /arm_windows.B: outside the domain of cross-section narrow/);
  const progress = [];
  assert.throws(() => run(c, EO, { section: 'narrow', onProgress: (m) => progress.push(m) }), (e) => e.message === msg);
  assert.deepEqual(progress, [], 'window check happens before any solve');
  assert.equal(stageErrors(cfg, 'narrow').electrostatics, null);
  assert.ok(run(c, [], { section: 'narrow' }).metrics.c_pul_pf_per_m > 0, 'an arm window outside a section does not block its electrostatics');
  const half = raw();
  half.geometry.symmetry = 'x_mirror_even';
  assert.match(stageErrors(normalizeConfig(half)).eo_overlap, /arm_windows.B: outside the solved half-domain/);
});

test('Q2 M2 an evaluated RF target is flagged when the Wheeler step-check spread exceeds 1e-2', () => {
  const rf = { independentPrediction: true, lossSource: 'model', conductorModel: 'skin_effect_wheeler',
    atTargets: [{ fGhz: 50, alphaDbPerCm: 1, nRf: 2, z0ReOhm: 50 }], wheeler: { maxRelativeSpread: 0.0136 } };
  const targets = [{ metric: 'rf_loss_db_per_cm', at_ghz: 50, value: 1, tol_rel: 0.1 }, { metric: 'n_rf', at_ghz: 50, value: 3, tol_rel: 0.1 }, { metric: 'z0_ohm', value: 50, tol_rel: 0.1 }];
  const [a, n, z] = compareTargets(targets, { z0_ohm: 50 }, { topology: 'none', rf });
  assert.equal(a.status, 'pass');
  assert.match(a.diagnostic, /Wheeler step-check relative spread 0.0136 exceeds 0.01/);
  assert.equal(n.status, 'fail');
  assert.match(n.diagnostic, /Wheeler/);
  assert.equal(z.diagnostic, null, 'static targets do not use R\'');
  const ok = compareTargets(targets, {}, { topology: 'none', rf: { ...rf, wheeler: { maxRelativeSpread: 0.005 } } });
  assert.ok(ok.every((t) => t.diagnostic === null));
  const r = run(fixture, RF);
  assert.equal(r.targetSummary.flagged, 0);
});

test('Q2 M1/M3 Wheeler reference frequency ignores comparable: false targets; a dirichlet side warns for surface models', () => {
  const c = raw();
  c.line.conductor_loss_model = 'skin_effect_wheeler';
  delete c.line.conductor_k_per_m;
  c.targets.push({ metric: 'n_rf', at_ghz: 200, value: 5, tol_rel: 0.1, source: { comparable: false } });
  const cfg = normalizeConfig(c);
  assert.equal(rfOptions(cfg.raw, cfg.materials, cfg.geometries.geometry).conductor.fRefHz, 100e9);
  c.targets.at(-1).source.comparable = true;
  assert.equal(rfOptions(c, normalizeConfig(c).materials, normalizeConfig(c).geometries.geometry).conductor.fRefHz, 200e9);
  const p = raw();
  p.line.conductor_loss_model = 'skin_effect_perimeter';
  delete p.line.conductor_k_per_m;
  p.line.perimeters_cover_carrying_surfaces = false;
  assert.ok(!run(p, RF).warnings.includes('dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included'));
  p.geometry.boundary = { top: 'dirichlet' };
  assert.ok(run(p, RF).warnings.includes('dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included'));
  assert.ok(!run(fixture, RF).warnings.includes('dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included'), 'user geometry factor: not flagged');
});

test('Q2 M8 the vacuum-only solve returns the same C0\' as the full solve', () => {
  const cfg = parseConfig(fixture);
  const section = crossSectionOf(cfg, 'geometry');
  const full = solveElectrostatics(section, { resolvedMaterials: cfg.materials });
  const vac = solveElectrostatics(section, { vacuumOnly: true });
  assert.equal(vac.c0Pul, full.c0Pul);
  assert.equal(vac.lPul, full.lPul);
  assert.equal(vac.cPul, undefined);
});
