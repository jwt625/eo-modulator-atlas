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

// ---- S8 (DevLog-039 rounds 2-3, audits D3, R1, R2): engine vs the T5 DEVSIM / numpy references
// validation/reference/summary-s8.json. Engine configs are built from validation/cases/K10-K12.yaml at test time
// (tests/semi-cases.mjs; mapping in DevLog-039; K11 with explicit 0.05 um oxide sizes, audit R1).
// Tolerance per quantity (round-2 audit R2): tol = U + F |x(s1) - x(s3)|max, the test mesh s1 = 1 and the finest level
// s3 of a three-level study (K10, K12: 1 / 0.7 / 0.5; K11: 1 / 0.85 / 0.7), F = 1 / (1 - (s3/s1)^p) (Richardson estimate
// of the s1 error from the change to s3), p = the smallest observed order over rows with monotone changes (orders from
// the three levels), capped at 2 (nominal order of the P1 / SG discretisation), and p = 1 when fewer than three rows
// are monotone (the unstructured-mesh changes of the K11 silicon quantities are not monotone at the 1e-3 level).
// Measured 2026-10-16 01:50-02:00 PDT (scratchpad t4semi/r2/budgets-*.json); margins as printed by the run
// (`# S8 gate margins`, test:reference 2026-10-16 02:04 PDT):
//   quantity        p     F     max|x1-x3|   budget    max|diff|  margin |diff|/tol
//   K10 C'          1.16  1.81  1.03e-4      1.9e-4    1.43e-4    0.66
//   K12 J           1.65  1.47  1.99e-4      2.9e-4    2.71e-4    0.64
//   K12 n / p ctr   1     2.00  1.66 / 1.52e-4  3.3 / 3.0e-4   2.3 / 2.1e-4   0.50
//   K12 n / p mean  1     2.00  1.54e-3 / 3.27e-4  3.1e-3 / 6.5e-4   2.1e-3 / 4.4e-4   0.51
//   K11 Si-only C'  1.78  2.12  1.82e-3      3.9e-3    2.40e-3    0.55
//   K11 C' oxide    1     3.33  9.19e-4      3.1e-3    1.17e-3    0.35  (electron-integral C', the reference definition)
//   K11 dn_eff/VpiL 1     3.33  1.33e-3      4.4e-3    2.10e-3    0.40  (both models)
//   K11 d alpha     1     3.33  1.49e-3      5.0e-3    2.13e-3    0.36
//   K11 alpha       2     1.96  5.05e-4      1.0e-3    3.82e-3    0.43  (U/ref 5-8e-3)
import { runSemiconductor } from '../src/semi-stage.mjs';
import { strip1d, k11, S8_REF } from './semi-cases.mjs';

const S8 = S8_REF();
const at = (r, v) => r.points.find((p) => Math.abs(p.sweptBiasV - v) < 1e-9);
const S8_MARGIN = {};
/** relative gate that also records the margin |diff| / tol of the gate family */
function gate(family, label, actual, ref, budgetRel) {
  const d = nearRel(label, actual, ref, budgetRel);
  const m = Math.abs(d) / (ref.U + budgetRel * Math.abs(ref.value));
  S8_MARGIN[family] = Math.max(S8_MARGIN[family] ?? 0, m);
}
test.after(() => { if (Object.keys(S8_MARGIN).length) console.log(`# S8 gate margins (max |diff| / tol): ${Object.entries(S8_MARGIN).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`); });

test('reference K10: V_bi and junction C\'(V) of the 1D abrupt PN (1e17 / 5e17) vs the S8 reference', () => {
  const h = 0.02;
  const r = runSemiconductor(strip1d('K10', { h }), { datasets: 'reference' });
  const ds = r.datasets[0], x = ds.mesh.x, psi = ds.variables.find((v) => v.name === 'psi').values;
  const mean = (x0) => { let s = 0, c = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - x0) < 0.03) { s += psi[i]; c++; } return s / c; };
  gate('K10 V_bi', 'K10 V_bi', mean(0.85) - mean(-0.85), { value: S8.K10.Vbi_V, U: 0 }, 1e-9);
  for (const row of S8.K10.rows) gate('K10 C', `K10 C' at ${row.V_pn} V`, (at(r, row.V_pn).capacitance.cFPerM / (h * 1e-6)) * 1e-4, row.C_F_cm2, 1.9e-4);
});

test('reference K10 forward 0.3 V (audit D1): terminal-charge C\' equals the carrier-integral charge through the contact', () => {
  const r = runSemiconductor(strip1d('K10', { values: [0, 0.3, 0.6] }), { optics: false });
  const p = at(r, 0.3);
  assert.ok(p.flags.includes('capacitance_includes_diffusion_charge'));
  assert.ok(Math.abs(p.capacitance.holeIntegralCFPerM / p.capacitance.cFPerM - 1) < 1e-9, 'anode (p) contact: C = q d(int p)/dV (no metal)');
  assert.ok(Math.abs(p.capacitance.electronIntegralCFPerM / p.capacitance.holeIntegralCFPerM - 1) < 1e-5, 'electron and hole integrals agree');
  assert.ok(p.capacitance.cFPerM > at(r, 0).capacitance.cFPerM);
  // audit R3: G' = dI/dV, resolved at 0.6 V forward
  const p6 = at(r, 0.6);
  assert.ok(p6.conductance.resolved && p6.conductance.gSPerM > 0, 'forward junction conductance G\'');
  assert.equal(p.conductance.resolved, false, 'at 0.3 V the hole current is still below the residual floor (flagged)');
});

test('reference K12: PIN forward J(V), centre and i-region mean densities vs the S8 reference', () => {
  const h = 0.01;
  const r = runSemiconductor(strip1d('K12', { h, edge: 0.0025, splits: [-0.4, 0.4] }), { datasets: 'all' });
  r.points.forEach((p, k) => {
    const row = S8.K12.rows.find((q) => Math.abs(q.V_pn - p.sweptBiasV) < 1e-9);
    gate('K12 J', `K12 J at ${row.V_pn} V`, (p.contacts[0].currentAPerM / (h * 1e-6)) * 1e-4, row.J_A_cm2, 2.9e-4);
    const ds = r.datasets[k], { x, y, tri } = ds.mesh;
    const val = (nm) => ds.variables.find((v) => v.name === nm).values;
    const centre = (f) => { let s = 0, c = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) < 1e-9) { s += f[i]; c++; } return (s / c) * 1e-6; };
    const meanI = (f) => { let s = 0, A = 0; for (let t = 0; t < tri.length / 3; t++) { const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2]; if (Math.abs((x[a] + x[b] + x[c]) / 3) > 0.4) continue; const ar = Math.abs((x[b] - x[a]) * (y[c] - y[a]) - (x[c] - x[a]) * (y[b] - y[a])) / 2; s += (ar * (f[a] + f[b] + f[c])) / 3; A += ar; } return (s / A) * 1e-6; };
    gate('K12 n centre', `K12 n centre at ${row.V_pn} V`, centre(val('n')), row.n_centre_cm3, 3.3e-4);
    gate('K12 p centre', `K12 p centre at ${row.V_pn} V`, centre(val('p')), row.p_centre_cm3, 3.0e-4);
    gate('K12 n mean', `K12 n mean i at ${row.V_pn} V`, meanI(val('n')), row.n_mean_i_cm3, 3.1e-3);
    gate('K12 p mean', `K12 p mean i at ${row.V_pn} V`, meanI(val('p')), row.p_mean_i_cm3, 6.5e-4);
    // audit D1: forward-bias C' carries the stored (diffusion) charge; electron and hole integrals agree
    assert.ok(Math.abs(p.capacitance.electronIntegralCFPerM / p.capacitance.holeIntegralCFPerM - 1) < 1e-5);
  });
});

if (FULL) test('reference K11: lateral PN rib Si-only C\', C\' with oxide, dn_eff, d alpha, alpha, VpiL (both plasma models)', () => {
  const si = runSemiconductor(k11({ siOnly: true }));
  const DB = 10 / Math.LN10;
  for (const [model, key] of [['nedeljkovic_2011', 'nedeljkovic_1550'], ['soref_bennett_1987', 'soref_bennett_1550']]) {
    const r = runSemiconductor(k11({ plasma: model }));
    for (const row of S8.K11.rows) {
      const p = at(r, row.V_pn), q = row[key];
      if (model === 'nedeljkovic_2011') {
        gate('K11 Si-only C', `K11 Si-only C' at ${row.V_pn} V`, at(si, row.V_pn).capacitance.cFPerM * 1e-2, row.C_si_only_F_cm, 3.9e-3);
        // reference definition q |dN_e/dV| (the stage C' adds the metal-corner flux, 0.5-1.9e-4)
        gate('K11 C oxide', `K11 C' with oxide at ${row.V_pn} V`, p.capacitance.electronIntegralCFPerM * 1e-2, row.C_F_cm, 3.1e-3);
      }
      gate('K11 alpha', `K11 ${key} alpha at ${row.V_pn} V`, p.optics.lossDbPerCm / DB, q.alpha_mode_cm, 1.0e-3);
      if (row.V_pn === 0) continue;
      gate('K11 dn_eff', `K11 ${key} dn_eff at ${row.V_pn} V`, p.optics.dneff, q.dneff_re, 4.4e-3);
      gate('K11 d alpha', `K11 ${key} d alpha at ${row.V_pn} V`, p.optics.dalphaDbPerCm / DB, q.dalpha_mode_cm, 5.0e-3);
      gate('K11 VpiL', `K11 ${key} VpiL at ${row.V_pn} V`, p.optics.vpilVcm, q.VpiL_V_cm, 4.4e-3);
    }
  }
});
