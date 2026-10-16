// S7 stage wiring: eo_response on a uniform line and on the loaded line, target rules, loaded_line quasi-static limits.
// Inputs: the ILLUSTRATIVE analytic fixture tests/fixtures/gsg-eo-rf.yaml (not literature data) and synthetic variants.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../src/run.mjs';
import { parseConfig, stageErrors } from '../src/config.mjs';
import { cx, cabs } from '../src/complex.mjs';
import { C_LIGHT, EPS0, createRfLine, propagationAt, surfaceResistanceOhm, dbPerCmToNpPerM } from '../src/rf-line.mjs';
import { responseAt, toDb } from '../src/eo-response.mjs';
import { blochCell } from '../src/loaded-line.mjs';

const fixture = readFileSync(new URL('./fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
const raw = () => structuredClone(parseConfig(fixture).raw);
const run = (cfg, stages, extra = {}) => runCrossSection(JSON.stringify(cfg), { stages, ...extra });
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

/** Uniform fixture with source/load impedance and a short line (illustrative values). */
function uniform({ zs = 50, zl = 50, lengthMm = 1, targets = [] } = {}) {
  const c = raw();
  Object.assign(c.line, { source_ohm: zs, load_ohm: zl, length_mm: lengthMm });
  c.sweep = { f_start_ghz: 1, f_stop_ghz: 100, n_points: 100 };
  c.targets = targets;
  return c;
}

test('eo_response adds its dependencies and reproduces the closed-form response from the rf_line sweep', () => {
  const c = uniform({ zs: 50, zl: 35 });
  const r = run(c, ['eo_overlap', 'eo_response']);
  assert.deepEqual(r.stages, ['electrostatics', 'optical_mode', 'eo_overlap', 'rf_line', 'eo_response']);
  const sw = r.rf.sweep;
  const resp = r.response;
  assert.equal(resp.lineKind, 'uniform_rf_line');
  for (const i of [0, 37, 99]) {
    const f = sw.fGhz[i] * 1e9;
    const gamma = cx(dbPerCmToNpPerM(sw.alphaDbPerCm[i]), (2 * Math.PI * f * sw.nRf[i]) / C_LIGHT);
    const h = responseAt({ fHz: f, gamma, z0: cx(sw.z0ReOhm[i], sw.z0ImOhm[i]), zs: 50, zl: 35, ngOpt: r.metrics.ng_opt, lengthM: 1e-3 });
    assert.ok(Math.abs(toDb(h) - resp.sweep.s21EoDb[i]) < 1e-9, `f ${sw.fGhz[i]}`);
    assert.ok(rel(resp.sweep.vpiRfV[i], r.metrics.vpi_dc_v / cabs(h)) < 1e-9);
  }
  // bandwidth metrics are the first crossings
  if (resp.bw3dbGhz != null) {
    const k = resp.sweep.s21EoDb.findIndex((v) => v <= -3);
    assert.ok(resp.bw3dbGhz <= resp.sweep.fGhz[k] && resp.bw3dbGhz > resp.sweep.fGhz[k - 1]);
    assert.equal(r.metrics.bw3db_ghz, resp.bw3dbGhz);
  }
});

test('response target rules: configured group index, comparable false, reference_ghz, decidable bandwidth bounds', () => {
  const t = (o) => ({ tol_abs: 0.01, source: { locator: 'synthetic' }, ...o });
  let c = uniform({ targets: [t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1 })] });
  let r = run(c, ['eo_response']);
  assert.match(r.targets[0].reason, /group index is a configured input/);
  // computed group index: evaluated
  c = uniform();
  c.optics.group_index_from = 'perturbation';
  delete c.optics.ng_fixed;
  const base = run(c, ['eo_response']);
  const i50 = base.response.sweep.fGhz.findIndex((f) => Math.abs(f - 50) < 1e-9);
  const i20 = base.response.sweep.fGhz.findIndex((f) => Math.abs(f - 20) < 1e-9);
  const s = base.response.sweep.s21EoDb;
  const bw3 = base.response.bw3dbGhz;
  c.targets = [
    t({ metric: 'eo_rolloff_db', at_ghz: 50, value: s[i50] }),
    t({ metric: 'eo_rolloff_db', at_ghz: 50, reference_ghz: 20, value: s[i50] - s[i20] }),
    t({ metric: 'eo_rolloff_db', at_ghz: 50, value: s[i50], source: { comparable: false } }),
    t({ metric: 'bw3db_ghz', value: bw3, tol_rel: 1e-6 }),
    t({ metric: 'bw6db_ghz', value: 40, tol_abs: 5 }),
  ];
  r = run(c, ['eo_response']);
  assert.equal(r.targets[0].status, 'pass');
  assert.ok(Math.abs(r.targets[0].actual - s[i50]) < 1e-12);
  assert.equal(r.targets[1].status, 'pass');
  assert.match(r.targets[2].reason, /comparable: false/);
  assert.equal(r.targets[3].status, 'pass');
  const b6 = r.response.bandwidth.bw6db_ghz;
  if (b6.status === 'no_crossing') {
    // the sweep ends at 100 GHz > 40 + 5: decidable fail with the bound
    assert.equal(r.targets[4].status, 'fail');
    assert.deepEqual(r.targets[4].actualBound, { gt: 100 });
  } else assert.equal(b6.status, 'found');
  // unspecified topology: computed, not compared
  delete c.line.loading;
  r = run(c, ['eo_response']);
  assert.match(r.targets[0].reason, /topology is unspecified/);
  assert.ok(r.response.sweep.s21EoDb.every(Number.isFinite));
});

test('eo_response readiness: missing source/load/sweep inputs are errors (never defaulted)', () => {
  const c = uniform();
  delete c.line.load_ohm;
  assert.match(stageErrors(parseConfig(JSON.stringify(c))).eo_response, /line.load_ohm: required by eo_response/);
  assert.throws(() => run(c, ['eo_response']), /load_ohm: required/);
  const d = uniform();
  delete d.sweep;
  assert.match(stageErrors(parseConfig(JSON.stringify(d))).eo_response, /frequency sweep/);
  const e = uniform();
  e.targets = [{ metric: 'bw3db_ghz', value: 10, tol_abs: 1, reference_ghz: 1, at_ghz: 5 }];
  assert.throws(() => parseConfig(JSON.stringify(e)), /at_ghz is not meaningful/);
  e.targets = [{ metric: 'n_rf', value: 2, tol_abs: 1, reference_ghz: 1 }];
  assert.throws(() => parseConfig(JSON.stringify(e)), /reference_ghz: only meaningful/);
});

// Periodic synthetic line: the fixture section is the unloaded cut; the loaded cut adds a signal-side and a
// ground-side pad in each gap (full-height plates, zero-flux top/bottom: exact 1D fields). Gap g = 2 um becomes
// 0.8 um between the pads, so C'_L / C'_U = C0'_L / C0'_U = 2 / 0.8 exactly; T-rail rule L'_L = L'_U.
function periodic({ lossy = true } = {}) {
  const c = uniform({ lengthMm: 1 });
  const unloaded = structuredClone(c.geometry);
  const loaded = structuredClone(c.geometry);
  const pad = (name, role, w, x0, x1) => ({ name, role, material: 'metal', weight: w, rect: { x_um: [x0, x1], y_um: [-1, 1] } });
  loaded.electrodes.push(pad('pad_r_s', 'signal', 1, 1.2, 1.6), pad('pad_r_g', 'ground', 0, 2.4, 2.8), pad('pad_l_s', 'signal', 1, -1.6, -1.2), pad('pad_l_g', 'ground', 0, -2.8, -2.4));
  loaded.optical_window = { x_um: [1.7, 2.3], y_um: [-0.8, 0.8] };
  c.geometry = loaded;
  c.alt_geometries = { unloaded };
  c.optics.eo.arm_windows = { A: { x_um: [1.7, 2.3], y_um: [-0.8, 0.8] }, B: { x_um: [-2.3, -1.7], y_um: [-0.8, 0.8] } };
  c.line.loading = { type: 'periodic_t_rail', period_um: 50, loaded_length_um: 30, unloaded_cross_section: 'unloaded', loaded_cross_section: null };
  if (!lossy) delete c.line.dielectric_loss_model;
  return c;
}

test('loaded_line: closed-form per-length values, quasi-static Bloch targets, lossless-only without a loss declaration', () => {
  const c = periodic({ lossy: false });
  c.targets = [
    { metric: 'n_rf', value: 1, tol_rel: 10, source: { locator: 'synthetic' } },
    { metric: 'z0_ohm', value: 1, tol_rel: 100, source: { locator: 'synthetic' } },
    { metric: 'rf_loss_db_per_cm', at_ghz: 50, value: 1, tol_rel: 1, source: { locator: 'synthetic' } },
  ];
  const se = stageErrors(parseConfig(JSON.stringify(c)));
  assert.equal(se.loaded_line, null);
  assert.match(se.eo_response, /no complete loss declaration: line.dielectric_loss_model/);
  const r = run(c, ['loaded_line']);
  const L = r.loaded;
  assert.deepEqual(L.loadingConductors, ['pad_r_s', 'pad_r_g', 'pad_l_s', 'pad_l_g']);
  assert.equal(L.railsIdentical, true);
  const eps0 = EPS0;
  const cU = (2 * eps0 * 30 * 2) / 2, cL = (2 * eps0 * 30 * 2) / 0.8; // F/m (h = g units cancel: h/g dimensionless)
  assert.ok(rel(L.perLength.unloaded.cPfPerM * 1e-12, cU) < 1e-9);
  assert.ok(rel(L.perLength.loaded.cPfPerM * 1e-12, cL) < 1e-9);
  const lU = 1 / (C_LIGHT ** 2 * (cU / 30));
  assert.ok(rel(L.perLength.loaded.lNhPerM * 1e-9, lU) < 1e-9);
  const cAvg = (cU * 20 + cL * 30) / 50;
  assert.ok(rel(L.quasiStatic.nRf, C_LIGHT * Math.sqrt(lU * cAvg)) < 1e-9);
  assert.ok(rel(L.quasiStatic.zOhm, Math.sqrt(lU / cAvg)) < 1e-9);
  assert.equal(r.targets[0].actual, L.quasiStatic.nRf);
  assert.equal(r.targets[1].actual, L.quasiStatic.zOhm);
  assert.match(r.targets[2].reason, /needs the lossy loaded line/);
  assert.equal(L.loss, null);
  assert.ok(L.lossless.sweep.nRf.every((v) => v > 0));
  assert.ok(!r.warnings.includes('cross_section_only_not_periodic_line'));
});

test('eo_response on the loaded line (bloch_homogenised option) equals the independent Bloch-cell response from the closed-form sections', () => {
  const c = periodic();
  c.line.loading.response_model = 'bloch_homogenised';
  const r = run(c, ['eo_response']);
  assert.deepEqual(r.stages, ['electrostatics', 'optical_mode', 'loaded_line', 'eo_response']);
  assert.equal(r.response.lineKind, 'loaded_line_bloch');
  const eps0 = EPS0;
  const cU = (2 * eps0 * 30 * 2) / 2, cL = (2 * eps0 * 30 * 2) / 0.8;
  const lU = 1 / (C_LIGHT ** 2 * (cU / 30));
  const tan = 0.001, k = 5.0e5, sigma = 4.0e7;
  for (const i of [0, 49, 99]) {
    const fGhz = r.response.sweep.fGhz[i], f = fGhz * 1e9, w = 2 * Math.PI * f;
    const R = surfaceResistanceOhm(f, sigma) * k;
    const sec = (C) => {
      const line = createRfLine({ cPul: C, lPul: lU, conductor: { model: 'rprime_reference', rPulRefOhmPerM: R, fRefHz: f, includeInternalInductance: false }, dielectric: { model: 'uniform', tanDelta: tan } });
      return propagationAt(line, f);
    };
    const pU = sec(cU), pL = sec(cL);
    const b = blochCell({ gammaU: pU.gamma, z0U: pU.z0, gammaL: pL.gamma, z0L: pL.z0, lU: 20e-6, lL: 30e-6 });
    const h = responseAt({ fHz: f, gamma: b.gammaB, z0: b.zB, zs: 50, zl: 50, ngOpt: r.metrics.ng_opt, lengthM: 1e-3 });
    assert.ok(Math.abs(toDb(h) - r.response.sweep.s21EoDb[i]) < 1e-6, `f ${fGhz}: ${toDb(h)} vs ${r.response.sweep.s21EoDb[i]}`);
    assert.ok(rel(r.loaded.loss.sweep.nRf[i], (C_LIGHT * b.gammaB.im) / w) < 1e-6);
  }
  // c / (2 p n_B0) = about 375 GHz here; the first band edge lies below that estimate and above the 100 GHz sweep end
  assert.ok(r.loaded.braggGhz > 100 && r.loaded.braggGhz < r.loaded.braggEstimateGhz);
  assert.ok(Math.abs(r.loaded.braggEstimateGhz * 1e9 - C_LIGHT / (2 * 50e-6 * r.loaded.quasiStatic.nRf)) < 1);
});

test('round 2 target rules: unstated reference (S1), thin-conductor band (S2), dielectric none (S3), Bragg 3x warning (S5)', () => {
  const t = (o) => ({ tol_abs: 100, source: { locator: 'synthetic' }, ...o });
  const c = uniform();
  c.optics.group_index_from = 'perturbation';
  delete c.optics.ng_fixed;
  c.targets = [
    t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1, reference: 'low_freq_unstated' }),
    t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1 }),
    t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1, reference_ghz: 20 }),
  ];
  let r = run(c, ['eo_response']);
  const [u, dc, ref20] = r.targets;
  assert.equal(u.status, 'not_evaluated');
  assert.match(u.reason, /low freq unstated; not compared on an arbitrary reference/);
  assert.deepEqual(u.referenceSensitivity.map((x) => x.referenceGhz), [null, 1, 3]);
  const i50 = r.response.sweep.fGhz.findIndex((f) => Math.abs(f - 50) < 1e-9);
  assert.ok(Math.abs(u.referenceSensitivity[0].value - r.response.sweep.s21EoDb[i50]) < 1e-12);
  // fixture plates: t = 2 um, sigma 4e7 S/m -> t = 3 delta at 9 / (pi mu0 sigma t^2) = 14.2 GHz
  assert.ok(Math.abs(r.response.thinConductorBelowGhz - 9 / (Math.PI * 1.25663706212e-6 * 4e7 * 4e-12) / 1e9) < 1e-9);
  assert.ok(dc.diagnosticCodes.includes('thin_conductor_semi_infinite_surface_impedance_in_band') && dc.status === 'pass');
  assert.ok(!(ref20.diagnosticCodes ?? []).includes('thin_conductor_semi_infinite_surface_impedance_in_band'));
  assert.ok(!(dc.diagnosticCodes ?? []).includes('assumption_dielectric_loss_none'));
  // slab model removes the thin-conductor flag
  c.line.conductor_thickness_model = 'slab_symmetric';
  r = run(c, ['eo_response']);
  assert.equal(r.response.thinConductorBelowGhz, null);
  assert.ok(!(r.targets[1].diagnosticCodes ?? []).includes('thin_conductor_semi_infinite_surface_impedance_in_band'));
  // dielectric none: evaluated, flagged
  c.line.dielectric_loss_model = 'none';
  r = run(c, ['eo_response']);
  assert.ok(r.targets[1].diagnosticCodes.includes('assumption_dielectric_loss_none') && r.targets[1].status === 'pass');
  assert.ok(r.targetSummary.flagged >= 2);
  // periodic synthetic line (exact cascade is the default): Bragg below 3 x the 150 GHz sweep end -> warning
  const p = periodic();
  p.sweep = { f_start_ghz: 1, f_stop_ghz: 150, n_points: 150 };
  const rp = run(p, ['eo_response']);
  assert.ok(rp.loaded.braggGhz < 450, `Bragg ${rp.loaded.braggGhz} GHz`);
  assert.equal(rp.response.lineKind, 'loaded_line_exact_cascade');
  assert.ok(rp.warnings.includes('bragg_frequency_within_3x_of_highest_evaluated_frequency') && rp.response.braggWithin3x);
  assert.ok(!rp.warnings.includes('vpi_rf_uses_run_section_eo_overlap_over_full_length'));
  const rv = run(p, ['eo_overlap', 'eo_response']);
  assert.ok(rv.warnings.includes('vpi_rf_uses_run_section_eo_overlap_over_full_length'));
});

test('round 3: slab normalization to the model DC limit (R2-4), slab limits and lateral-relaxation diagnostics (R2-2, R2-3)', () => {
  const t = (o) => ({ tol_abs: 100, source: { locator: 'synthetic' }, ...o });
  const c = uniform({ zs: 50, zl: 35 });
  c.optics.group_index_from = 'perturbation';
  delete c.optics.ng_fixed;
  c.sweep = { f_start_ghz: 0.001, f_stop_ghz: 100, n_points: 200 };
  c.line.conductor_thickness_model = 'slab_symmetric';
  c.targets = [t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1 }), t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1, reference_ghz: 20 })];
  const r = run(c, ['eo_response']);
  const resp = r.response;
  // DC circuit with R_0 = R'(0) L: Phi_0 / Phi_DC,lossless = (Z_L + R_0/2)(Z_s + Z_L) / (Z_L (Z_s + Z_L + R_0))
  const r0 = resp.seriesResistanceDcOhm;
  assert.ok(r0 > 0 && resp.normalization === 'model_dc_with_series_resistance');
  const want = 20 * Math.log10(((35 + r0 / 2) * 85) / (35 * (85 + r0)));
  assert.ok(Math.abs(resp.normalizationOffsetDb - want) < 1e-12);
  assert.ok(Math.abs(resp.sweep.s21EoDb[0]) < 1e-3, `H(1 MHz) ${resp.sweep.s21EoDb[0]} dB vs the model DC limit`);
  // fixture: t = 2 um, narrowest signal strip 2 um, sigma 4e7 S/m -> f_lat = 1 / (pi mu0 sigma t w) = 1.58 GHz
  assert.ok(Math.abs(resp.lateralRelaxationGhz - 1 / (Math.PI * 1.25663706212e-6 * 4e7 * 4e-12) / 1e9) < 1e-9);
  const [dc, ref20] = r.targets;
  assert.ok(dc.diagnosticCodes.includes('slab_model_limits') && dc.diagnosticCodes.includes('band_below_lateral_current_relaxation_estimate'));
  assert.ok(ref20.diagnosticCodes.includes('slab_model_limits') && !ref20.diagnosticCodes.includes('band_below_lateral_current_relaxation_estimate'));
  assert.ok(!(dc.diagnosticCodes ?? []).includes('thin_conductor_semi_infinite_surface_impedance_in_band'));
  assert.ok(r.warnings.includes('slab_model_limits_frozen_geometry_factor_and_sidewalls'));
  // matched source and load: the model DC limit equals the lossless one
  const m = uniform({ zs: 50, zl: 50 });
  m.line.conductor_thickness_model = 'slab_symmetric';
  assert.ok(Math.abs(run(m, ['eo_response']).response.normalizationOffsetDb) < 1e-12);
  // semi-infinite: lateral estimate still flags DC-referenced bands, no slab limits
  const s = uniform();
  s.optics.group_index_from = 'perturbation';
  delete s.optics.ng_fixed;
  s.targets = [t({ metric: 'eo_rolloff_db', at_ghz: 50, value: -1 })];
  const rs = run(s, ['eo_response']);
  assert.equal(rs.response.normalization, 'lossless_dc');
  assert.ok(rs.targets[0].diagnosticCodes.includes('band_below_lateral_current_relaxation_estimate') && !rs.targets[0].diagnosticCodes.includes('slab_model_limits'));
});

test('round 5 (R34-1): DC-referenced headline bandwidths and the DC entry of referenceSensitivity carry the conductor diagnostics', () => {
  const c = uniform({ zs: 50, zl: 50 });
  c.optics.group_index_from = 'perturbation';
  delete c.optics.ng_fixed;
  c.sweep = { f_start_ghz: 0.01, f_stop_ghz: 100, n_points: 400 };
  c.line.conductor_thickness_model = 'slab_symmetric';
  c.targets = [{ metric: 'eo_rolloff_db', at_ghz: 50, value: -1, tol_abs: 100, reference: 'low_freq_unstated', source: { locator: 'synthetic' } }];
  const r = run(c, ['eo_response']);
  const b3 = r.response.bandwidth.bw3db_ghz;
  assert.equal(b3.status, 'found');
  assert.deepEqual(b3.diagnostics.map((d) => d.code), ['slab_model_limits', 'band_below_lateral_current_relaxation_estimate']);
  assert.deepEqual(r.response.metricDiagnostics.bw3db_ghz, ['slab_model_limits', 'band_below_lateral_current_relaxation_estimate']);
  // f_lat = 1.58 GHz for the fixture plates: DC and 1 GHz references reach below it, 3 GHz does not
  const sens = r.targets[0].referenceSensitivity;
  assert.ok(sens[0].diagnosticCodes.includes('band_below_lateral_current_relaxation_estimate'));
  assert.ok(sens[1].diagnosticCodes.includes('band_below_lateral_current_relaxation_estimate'));
  assert.ok(!sens[2].diagnosticCodes.includes('band_below_lateral_current_relaxation_estimate') && sens[2].diagnosticCodes.includes('slab_model_limits'));
  assert.ok(r.warnings.includes('band_below_lateral_current_relaxation_estimate'));
  // slab model: V_ref is the mean DC line voltage of the model; for Z_s = Z_L it equals V_s Z_L / (Z_s + Z_L)
  assert.match(r.response.vRefDefinition, /mean DC/);
  assert.ok(Math.abs(r.response.normalizationOffsetDb) < 1e-12);
});
