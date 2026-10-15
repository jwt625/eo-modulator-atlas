// sweep.mjs: point enumeration, per-index runs, sweep targets, reuse and cancellation (DevLog-026 S2).
// The parametric G-S-G input is the ILLUSTRATIVE analytic fixture of tests/fixtures/gsg-eo-rf.yaml with the gap and the
// wavelength as params (g_um = 2 reproduces the fixture). Closed form (fixture header): E = V_t / g in each gap,
// box TE mode n_eff = sqrt(n_e^2 - (lambda/2W)^2 - (lambda/2H)^2) with W = g - 0.4 um, H = 1.6 um,
// VpiL = lambda n_eff g / (2 n_e^4 r33).
import test from 'node:test';
import assert from 'node:assert/strict';
import { enumerateSweep, runSweepPoint, runSweep } from '../src/sweep.mjs';
import { runCrossSection } from '../src/run.mjs';

export const PARAM_GSG = `
schema: eo-atlas.sim/v1
id: analytic-gsg-param
params:
  g_um: {value: 2, unit: um, description: gap between signal and ground}
  lambda_nm: {value: 1550, unit: nm}
materials:
  eo_medium: {crystal: {cut: x, propagation: y}, n_o: 2.2, n_e: 2.1, eps_r: 30, r_pm_per_v: {r13: 10, r22: 4, r33: 30, r51: 25}}
  metal: {conductor: true}
geometry:
  domain: {x_um: ["=-(3 + g_um)", "=3 + g_um"], y_um: [-1, 1]}
  regions:
    - {name: medium, material: eo_medium, rect: {x_um: ["=-(3 + g_um)", "=3 + g_um"], y_um: [-1, 1]}}
  electrodes:
    - {name: ground_l, role: ground, material: metal, weight: 0, rect: {x_um: ["=-(3 + g_um)", "=-(1 + g_um)"], y_um: [-1, 1]}}
    - {name: signal, role: signal, material: metal, weight: 1, rect: {x_um: [-1, 1], y_um: [-1, 1]}}
    - {name: ground_r, role: ground, material: metal, weight: 0, rect: {x_um: ["=1 + g_um", "=3 + g_um"], y_um: [-1, 1]}}
  optical_window: {x_um: [1.2, "=0.8 + g_um"], y_um: [-0.8, 0.8]}
  mesh: {max_edge_um: 0.5, electrode_edge_um: 0.25, electrode_face_um: 0.5, window_edge_um: 0.25}
optics:
  solver: scalar
  wavelength_nm: "=lambda_nm"
  polarization: TE
  group_index_from: fixed
  ng_fixed: 2.2
  eo:
    arm_drive: two_arm_field_resolved
    terminal_drive: single_ended
    arm_windows:
      A: {x_um: [1.2, "=0.8 + g_um"], y_um: [-0.8, 0.8]}
      B: {x_um: ["=-0.8 - g_um", -1.2], y_um: [-0.8, 0.8]}
line: {length_mm: 10, differential: false, loading: {type: none}}
studies:
  gap:
    type: parametric
    stages: [electrostatics, optical_mode, eo_overlap]
    sweep: [{param: g_um, values: [2, 3]}]
    outputs: [vpi_l_dc_vcm, n_eff]
    sweep_targets:
      - {at: {g_um: 2}, metric: vpi_l_dc_vcm, value: 0.5273796, tol_rel: 0.002, vpi_convention: mzm_push_pull, source: {locator: closed form}}
  wavelength:
    type: parametric
    stages: [electrostatics, optical_mode, eo_overlap]
    sweep: [{param: lambda_nm, range: {start: 1500, stop: 1600, n: 3}}]
  grid:
    type: parametric
    sweep: [{param: g_um, values: [2, 3, 4]}, {param: lambda_nm, values: [1500, 1600]}]
`;

const vpiL = (g, lambdaUm) => {
  const ne = 2.1, W = g - 0.4, H = 1.6;
  const neff = Math.sqrt(ne * ne - (lambdaUm / (2 * W)) ** 2 - (lambdaUm / (2 * H)) ** 2);
  return (lambdaUm * 1e-6 * neff * g * 1e-6) / (2 * ne ** 4 * 30e-12) * 100; // V cm
};

test('sweep: enumeration order (nested, last axis fastest), ranges, targets, errors', () => {
  const grid = enumerateSweep(PARAM_GSG, { study: 'grid' });
  assert.equal(grid.nPoints, 6);
  assert.deepEqual(grid.points.map((p) => [p.values.g_um, p.values.lambda_nm]), [[2, 1500], [2, 1600], [3, 1500], [3, 1600], [4, 1500], [4, 1600]]);
  assert.deepEqual(grid.points.map((p) => p.index), [0, 1, 2, 3, 4, 5]);
  const wl = enumerateSweep(PARAM_GSG, { study: 'wavelength' });
  assert.deepEqual(wl.axes[0].values, [1500, 1550, 1600]);
  assert.equal(enumerateSweep(PARAM_GSG, { study: 'gap' }).sweepTargets[0].at.g_um, 2);
  assert.throws(() => enumerateSweep(PARAM_GSG), /several studies/);
  assert.throws(() => enumerateSweep(PARAM_GSG, { study: 'nope' }), /unknown study nope/);
  assert.throws(() => enumerateSweep(PARAM_GSG, { study: 'gap', params: { g_um: 3 } }), /swept by the study/);
  const bad = (study, re) => assert.throws(() => enumerateSweep(PARAM_GSG.replace(/studies:[\s\S]*$/, `study:\n${study}\n`)), re);
  bad('  type: parametric\n  sweep: [{param: zz, values: [1]}]', /unknown parameter zz/);
  bad('  type: parametric\n  sweep: [{param: g_um, values: []}]', /non-empty array/);
  bad('  type: parametric\n  sweep: [{param: g_um, values: [1], range: {start: 1, stop: 2, n: 2}}]', /exactly one of values or range/);
  bad('  type: parametric\n  sweep: [{param: g_um, range: {start: 1, stop: 2, n: 0}}]', /integer >= 1/);
  bad('  type: grid\n  sweep: [{param: g_um, values: [1]}]', /expected parametric/);
  bad('  type: parametric\n  sweep: [{param: g_um, values: [2]}, {param: g_um, values: [3]}]', /swept twice/);
  bad('  type: parametric\n  sweep: [{param: g_um, values: [2]}]\n  sweep_targets: [{at: {g_um: 2}, metric: vpi_l_dc_vcm, value: 1}]', /tolerance is required/);
  bad('  type: parametric\n  sweep: [{param: g_um, range: {start: 1, stop: 2, n: 3000}}]', /exceed the limit/);
});

test('sweep: geometry sweep remeshes, matches the closed form and evaluates sweep targets', async () => {
  const seen = [];
  const r = await runSweep(PARAM_GSG, { study: 'gap' }, (p, done, total) => seen.push([p.index, done, total]));
  assert.deepEqual(seen, [[0, 1, 2], [1, 2, 2]]);
  assert.equal(r.errors, 0);
  const [p2, p3] = r.points;
  assert.notEqual(p2.geometryHash, p3.geometryHash);
  assert.deepEqual(p3.reused, { mesh: false, electrostatics: false });
  assert.ok(Math.abs(p2.metrics.vpi_l_dc_vcm / 0.5273796 - 1) < 2e-3);
  assert.ok(Math.abs(p3.metrics.vpi_l_dc_vcm / vpiL(3, 1.55) - 1) < 5e-3, `${p3.metrics.vpi_l_dc_vcm} vs ${vpiL(3, 1.55)}`);
  assert.deepEqual(Object.keys(p2.outputs), ['vpi_l_dc_vcm', 'n_eff']);
  assert.equal(p2.targets.length, 1);
  assert.equal(p2.targets[0].status, 'pass');
  assert.equal(p3.targets.length, 0); // no sweep target at g = 3; base targets are not compared at sweep points
  assert.deepEqual(r.targetSummary, { total: 1, evaluated: 1, passed: 1, failed: 0 });
  // runSweepPoint by index equals the sequential run (worker-pool path).
  const single = runSweepPoint(PARAM_GSG, 1, { study: 'gap' });
  assert.equal(single.metrics.vpi_l_dc_vcm, p3.metrics.vpi_l_dc_vcm);
  // Same as a direct run with a params override.
  assert.equal(runCrossSection(PARAM_GSG, { params: { g_um: 3 }, stages: ['eo_overlap'] }).metrics.vpi_l_dc_vcm, p3.metrics.vpi_l_dc_vcm);
});

test('sweep: wavelength-only sweep reuses the electrostatic mesh and solution', async () => {
  const r = await runSweep(PARAM_GSG, { study: 'wavelength' });
  assert.deepEqual(r.points.map((p) => p.reused), [{ mesh: false, electrostatics: false }, { mesh: true, electrostatics: true }, { mesh: true, electrostatics: true }]);
  assert.equal(new Set(r.points.map((p) => p.geometryHash)).size, 1);
  assert.equal(new Set(r.points.map((p) => p.metrics.c_pul_pf_per_m)).size, 1);
  for (const p of r.points) assert.ok(Math.abs(p.metrics.vpi_l_dc_vcm / vpiL(2, p.values.lambda_nm / 1000) - 1) < 3e-3, String(p.values.lambda_nm));
  assert.equal(r.points[1].timing.electrostatics, null); // reused: no solver timing
});

test('sweep: cancellation and point errors', async () => {
  const ac = new AbortController();
  const r = await runSweep(PARAM_GSG, { study: 'grid', signal: ac.signal }, (p, done) => { if (done === 2) ac.abort(); });
  assert.equal(r.cancelled, true);
  assert.equal(r.completed, 2);
  // g_um = 0.1 makes the arm windows invert: the point records the error and the sweep continues.
  const text = PARAM_GSG.replace('values: [2, 3, 4]', 'values: [0.1, 2]');
  const e = await runSweep(text, { study: 'grid', stages: ['electrostatics'] });
  assert.equal(e.errors, 2);
  assert.match(e.points[0].error, /x_um/);
  assert.equal(e.points[2].error, null);
  assert.throws(() => runSweepPoint(PARAM_GSG, 9, { study: 'gap' }), /outside 0\.\.1/);
  // Audit A12: a fixed override of a swept param is rejected by runSweepPoint too (as by runSweep / enumerateSweep).
  assert.throws(() => runSweepPoint(PARAM_GSG, 0, { study: 'gap', params: { g_um: 3 } }), /swept by the study/);
});
