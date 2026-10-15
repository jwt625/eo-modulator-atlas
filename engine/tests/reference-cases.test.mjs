// Engine vs L-REF open-source references (DevLog-023 O2/O3, DevLog-028): the canonical cases validation/cases/K*.yaml
// are run unchanged through the engine and compared with validation/reference/summary.json.
//
// Tolerance = reference uncertainty U (L-REF summary.json) + an engine discretisation budget at the test mesh. Each
// budget below is about 2.5x the engine-minus-reference difference measured on 2026-10-15 08:04 PDT (K7: 08:49 PDT)
// at the coarse meshes that keep each test under ~5 s (round 5, audit F6: per-case budgets replace the earlier shared
// ones that were 6-53x the measured differences). Floor: K2 n_eff 5e-6 (L-REF: its K1/K2 n_eff are trustworthy at
// >= 5e-6). Electrostatic runs pin p2MeshFactor 1 so the meshes are those measured (the run default is 2, audit F4).
//   quantity                         measured         budget
//   K1 n_eff / ng / TE (scale 1)     +4.7e-6 / -6.2e-5 / +7.4e-6      1.2e-5 / 1.6e-4 / 1.9e-5
//   K2 n_eff / ng / TE (scale 2)     -1.1e-6 / -3.4e-5 / -3.8e-6      5e-6 (floor) / 8.5e-5 / 9.6e-6
//   K3 n_eff / ng / TE (scale 2)     -3.9e-6 / -2.5e-5 / -4.8e-6      9.8e-6 / 6.3e-5 / 1.2e-5
//   K4 P2 C' C0' Z0 n_RF (rel)       7.9e-4 1.5e-4 4.7e-4 3.3e-4      2e-3 3.8e-4 1.2e-3 8.3e-4
//   K4 P1 C' C0' Z0 n_RF (rel)       4.3e-3 2.7e-3 3.5e-3 8.2e-4      1.1e-2 6.8e-3 8.8e-3 2.1e-3
//   K4 VpiL / mean |dn| (rel)        2.1e-3 / 2.1e-3                  5.3e-3 / 5.3e-3
//   K5 g3 g4 g5 g6 g8 VpiL (rel)     3.5e-3 2.7e-3 2.1e-3 1.7e-3 1.4e-3   8.8e-3 6.8e-3 5.3e-3 4.3e-3 3.5e-3
//   K5 C' (rel), same gaps           1.5e-3 1.2e-3 7.9e-4 6.3e-4 5.2e-4   3.9e-3 2.9e-3 2e-3 1.6e-3 1.3e-3
//   K6a / K6b P2 C' (rel)            2.3e-4 / 3.3e-4                  5.8e-4 / 8.3e-4
//   K6a / K6b P2 C0', n_RF, Z0       8.1e-5 / 9.2e-5, 7.6e-5 / 1.2e-4, 1.6e-4 / 2.1e-4   2.3e-4, 3e-4, 5.3e-4
//   K6a / K6b P1 C', Z0 (rel)        3.6e-3, 3.3e-3                   9e-3, 8.5e-3
//   K7 D0 / D1 / D2.6 / D3.6 VpiL    2.6e-4 3.3e-4 2.0e-4 4.1e-4      1e-3 (each)
// The K4/K5/K6 configured meshes exceed the 80,000-vertex budget at meshScale 1 (all lanes observed this), hence scale 2.
// K4's reference `vpil_scalar_vcm` is the textbook Gamma-weighted estimate of DevLog-028, not the engine's scalar FEM
// overlap, so it is not a target for the engine scalar path. Tidy3D values are sanity-only and not gated; EO comparands
// are VpiL and dn_mean_abs_per_V (L-REF round 2 primary comparands; per-arm dn are informational); K6 gates on the FEM values
// (the K6b closed form is approximate). Case files and reference values are read at test time (no hashes): re-run after
// L-REF round 2 rewrites the case indices. K5 (5 gaps) runs only with ENGINE_REFERENCE_FULL=1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseConfig, opticalOptions, crossSectionOf } from '../src/config.mjs';
import { solveOptical } from '../src/optical-stage.mjs';
import { runCrossSection } from '../src/run.mjs';

const root = new URL('../../validation/', import.meta.url);
const caseText = (k) => readFileSync(new URL(`cases/${k}.yaml`, root), 'utf8');
const REF = JSON.parse(readFileSync(new URL('reference/summary.json', root), 'utf8')).cases;
const FULL = process.env.ENGINE_REFERENCE_FULL === '1';

const VERBOSE = process.env.REF_VERBOSE === '1';
/** |a - ref| <= U + budget (absolute budget). */
function near(label, actual, ref, budgetAbs) {
  const tol = ref.U + budgetAbs;
  if (VERBOSE) console.log(`REF ${label}: engine ${actual} ref ${ref.value} U ${ref.U} diff ${(actual - ref.value).toExponential(3)} rel ${((actual - ref.value) / Math.abs(ref.value)).toExponential(3)} tol ${tol.toExponential(2)}`);
  assert.ok(Number.isFinite(actual) && Math.abs(actual - ref.value) <= tol, `${label}: engine ${actual} vs reference ${ref.value} (U ${ref.U}), |diff| ${Math.abs(actual - ref.value).toExponential(2)} > tol ${tol.toExponential(2)}`);
  return actual - ref.value;
}
/** relative: |a/ref - 1| <= U/|ref| + budgetRel. */
function nearRel(label, actual, ref, budgetRel) {
  return near(label, actual, ref, budgetRel * Math.abs(ref.value));
}

function vectorMode(k, meshScale) {
  const cfg = parseConfig(caseText(k));
  const opts = { ...opticalOptions(cfg.raw, { solver: 'vector' }), groupIndex: 'perturbation' };
  return solveOptical(crossSectionOf(cfg, 'geometry'), cfg.materials, opts, { meshScale, withGroupIndex: true });
}

for (const [k, scale, b] of [['K1', 1, { n: 1.2e-5, ng: 1.6e-4, te: 1.9e-5 }], ['K2', 2, { n: 5e-6, ng: 8.5e-5, te: 9.6e-6 }], ['K3', 2, { n: 9.8e-6, ng: 6.3e-5, te: 1.2e-5 }]]) {
  test(`reference ${k}: vector TE0 n_eff, ng (perturbation) and TE fraction vs FEM (femwell) references`, () => {
    const s = vectorMode(k, scale);
    const r = REF[k].fem;
    assert.equal(s.kind, 'vector');
    assert.equal(s.diagnostics.order, 2);
    near(`${k} n_eff`, s.neff, r.n_eff, b.n);
    near(`${k} ng`, s.ng, r.ng_opt, b.ng);
    near(`${k} TE fraction`, s.mode.teFraction, r.te_fraction, b.te);
  });
}

function electrostatic(k, order, scale) {
  return runCrossSection(caseText(k), { stages: [], meshScale: scale, elementOrder: order, p2MeshFactor: 1 });
}

test('reference K4: electrostatics P2 (scale 2) and P1 (scale 2) vs scikit-fem P2; P2 is the more accurate', () => {
  const r = REF.K4;
  const p2 = electrostatic('K4', 2, 2).metrics;
  const e2 = {
    c: nearRel('K4 P2 C\'', p2.c_pul_pf_per_m, r.C_pF_per_m, 2e-3),
    c0: nearRel('K4 P2 C0\'', p2.c0_pul_pf_per_m, r.C0_pF_per_m, 3.8e-4),
    z: nearRel('K4 P2 Z0', p2.z0_ohm, r.Z0_ohm, 1.2e-3),
    n: nearRel('K4 P2 n_RF', p2.n_rf, r.n_rf, 8.3e-4),
  };
  const p1 = electrostatic('K4', 1, 2).metrics;
  const e1 = {
    c: nearRel('K4 P1 C\'', p1.c_pul_pf_per_m, r.C_pF_per_m, 1.1e-2),
    c0: nearRel('K4 P1 C0\'', p1.c0_pul_pf_per_m, r.C0_pF_per_m, 6.8e-3),
    z: nearRel('K4 P1 Z0', p1.z0_ohm, r.Z0_ohm, 8.8e-3),
    n: nearRel('K4 P1 n_RF', p1.n_rf, r.n_rf, 2.1e-3),
  };
  // Evidence for the default element order (DevLog-026 round 2): P2 on the same mesh is closer on every quantity.
  for (const q of ['c', 'c0', 'z', 'n']) assert.ok(Math.abs(e2[q]) < Math.abs(e1[q]), `P2 not closer than P1 on ${q}`);
});

test('reference K4: push-pull VpiL and dn_A with vector arm modes and the full Pockels tensor (P2 electrostatics, scale 2)', () => {
  const res = runCrossSection(caseText('K4'), { stages: ['eo_overlap'], meshScale: 2, elementOrder: 2, p2MeshFactor: 1, solver: 'vector' });
  const r = REF.K4;
  assert.equal(res.eo.solver, 'vector');
  nearRel('K4 VpiL', res.metrics.vpi_l_dc_vcm, r.vpil_vcm, 5.3e-3);
  // Per-arm dn values were extrapolated separately by L-REF (an artificial imbalance); compare the mean |dn| instead and
  // gate the balance on the engine's own symmetry (L-REF audit 2026-10-15).
  // L-REF round 2 publishes dn_mean_abs_per_V (primary comparand); older summaries only had the per-arm values.
  const meanRef = r.dn_mean_abs_per_V ?? { value: (Math.abs(r.dn_A_per_V.value) + Math.abs(r.dn_B_per_V.value)) / 2, U: (r.dn_A_per_V.U + r.dn_B_per_V.U) / 2 };
  nearRel('K4 mean |dn|', (Math.abs(res.eo.arms.A.dnEffPerV) + Math.abs(res.eo.arms.B.dnEffPerV)) / 2, meanRef, 5.3e-3);
  assert.ok(Math.abs(res.eo.pushPullBalance + 1) < 1e-3, `balance ${res.eo.pushPullBalance}`);
  assert.ok(Math.abs(res.eo.arms.A.neff - r.arm_modes.A.n_eff) < 1e-4, `arm A n_eff ${res.eo.arms.A.neff} vs ${r.arm_modes.A.n_eff}`);
});

for (const k of ['K6a', 'K6b']) {
  test(`reference ${k}: CPW electrostatics P2 and P1 (scale 2) vs scikit-fem with the same 0.1 um electrodes and domain`, () => {
    const fa = REF[k].fem_area_R500;
    const p2 = electrostatic(k, 2, 2).metrics;
    nearRel(`${k} P2 C'`, p2.c_pul_pf_per_m, fa.C_pF_per_m, k === 'K6a' ? 5.8e-4 : 8.3e-4);
    nearRel(`${k} P2 C0'`, p2.c0_pul_pf_per_m, fa.C0_pF_per_m, 2.3e-4);
    nearRel(`${k} P2 n_RF`, p2.n_rf, fa.n_rf, 3e-4);
    nearRel(`${k} P2 Z0`, p2.z0_ohm, fa.Z0_ohm, 5.3e-4);
    const p1 = electrostatic(k, 1, 2).metrics;
    nearRel(`${k} P1 C'`, p1.c_pul_pf_per_m, fa.C_pF_per_m, 9e-3);
    nearRel(`${k} P1 Z0`, p1.z0_ohm, fa.Z0_ohm, 8.5e-3);
  });
}

test('reference K5: VpiL and C\' vs gap (3, 4, 5, 6, 8 um), vector arms, P2 scale 2', { skip: !FULL && 'set ENGINE_REFERENCE_FULL=1 (5 runs, about 4 s each)' }, () => {
  const budget = { 3: [8.8e-3, 3.9e-3], 4: [6.8e-3, 2.9e-3], 5: [5.3e-3, 2e-3], 6: [4.3e-3, 1.6e-3], 8: [3.5e-3, 1.3e-3] };
  for (const g of [3, 4, 5, 6, 8]) {
    const k = `K5-g${g}`;
    const res = runCrossSection(caseText(k), { stages: ['eo_overlap'], meshScale: 2, elementOrder: 2, p2MeshFactor: 1, solver: 'vector' });
    nearRel(`${k} VpiL`, res.metrics.vpi_l_dc_vcm, REF[k].vpil_vcm, budget[g][0]);
    if (REF[k].dn_mean_abs_per_V) nearRel(`${k} mean |dn|`, (Math.abs(res.eo.arms.A.dnEffPerV) + Math.abs(res.eo.arms.B.dnEffPerV)) / 2, REF[k].dn_mean_abs_per_V, budget[g][0]);
    nearRel(`${k} C'`, res.metrics.c_pul_pf_per_m, REF[k].C_pF_per_m, budget[g][1]);
    nearRel(`${k} Z0`, res.metrics.z0_ohm, REF[k].Z0_ohm, 2e-3);
  }
});

function k7(k) {
  const res = runCrossSection(caseText(k), { stages: ['eo_overlap'], meshScale: 2, elementOrder: 2, p2MeshFactor: 1, solver: 'vector' });
  nearRel(`${k} VpiL`, res.metrics.vpi_l_dc_vcm, REF[k].vpil_vcm, 1e-3);
  return res.metrics.vpi_l_dc_vcm;
}

test('reference K7: off-centre waveguide (arabjuneghani2022 device #2 stack), D = 0 and 3.6 um, and their VpiL ratio', () => {
  const v0 = k7('K7-D0');
  const v36 = k7('K7-D3.6');
  // Ratio VpiL(D = 0) / VpiL(D = 3.6): the independent pipeline gives 1.5316 +- 1.5e-4 (paper Fig. 3(c) measured: 2.50).
  const ref = JSON.parse(readFileSync(new URL('reference/summary.json', root), 'utf8')).ratios?.K7?.['K7-D0/K7-D3.6'];
  if (ref) near('K7 ratio D0/D3.6', v0 / v36, ref, 1.5e-3);
});

test('reference K7: D = 1 and 2.6 um', { skip: !FULL && 'set ENGINE_REFERENCE_FULL=1' }, () => {
  k7('K7-D1');
  k7('K7-D2.6');
});

test('reference K2 through runCrossSection modeOnly (no electrostatic mesh; audit F10)', () => {
  const r = runCrossSection(caseText('K2'), { modeOnly: true, stages: ['optical_mode'], meshScale: 2 });
  assert.equal(r.modeOnly, true);
  assert.equal(r.electrostatics, null);
  near('K2 n_eff (mode only)', r.metrics.n_eff, REF.K2.fem.n_eff, 5e-6);
});
