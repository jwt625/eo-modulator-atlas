// S7 round 4 (DevLog-036): Si phase-shifter TWE, electrode line loaded by the junction branch R'_j + 1/(j w C'_j)
// (Shin, Sakamoto, Dagli 2011, Fig. 2 / eqs. (1)-(5)), phase driven by the junction voltage. All numbers are
// ILLUSTRATIVE TEST INPUTS (no literature device).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cx, cadd, csub, cmul, cdiv, cabs, cscale } from '../src/complex.mjs';
import { C_LIGHT, createRfLine, propagationAt, junctionPropagationAt } from '../src/rf-line.mjs';
import { runEoResponseStage, runJunctionResponseStage } from '../src/stages.mjs';
import { responseAt } from '../src/eo-response.mjs';
import { parseConfig } from '../src/config.mjs';
import { runCrossSection } from '../src/run.mjs';
import { readFileSync } from 'node:fs';
import { rib } from './semi-fixtures.mjs';

const C_E = 1.0e-10, L_E = 4.0e-7; // electrode line (Z = 63 ohm, n = 1.9)
const lossy = () => createRfLine({ cPul: C_E, lPul: L_E, conductor: { model: 'rprime_reference', rPulRefOhmPerM: 300, fRefHz: 1e10, includeInternalInductance: false }, dielectric: { model: 'uniform', tanDelta: 1e-3 } });
const lossless = (c = C_E) => createRfLine({ cPul: c, lPul: L_E, conductor: { model: 'none' }, dielectric: { model: 'none' } });
const J = { rOhmM: 1.5e-2, cFPerM: 2.5e-10 }; // R' 15 ohm mm, C' 0.25 pF/mm: f_RC = 42 GHz

test('junction branch limits: R_j -> 0 gives the line with C + C_j; C_j -> 0 the bare line; branch admittance and divider', () => {
  for (const f of [1e9, 2e10, 8e10]) {
    const a = junctionPropagationAt(lossless(), { rOhmM: 0, cFPerM: J.cFPerM }, f);
    const b = propagationAt(lossless(C_E + J.cFPerM), f);
    assert.ok(cabs(csub(a.gamma, b.gamma)) < 1e-12 * cabs(b.gamma) && cabs(csub(a.z0, b.z0)) < 1e-12 * cabs(b.z0));
    const c = junctionPropagationAt(lossy(), { rOhmM: J.rOhmM, cFPerM: 0 }, f);
    const d = propagationAt(lossy(), f);
    assert.ok(cabs(csub(c.gamma, d.gamma)) < 1e-12 * cabs(d.gamma));
    const w = 2 * Math.PI * f;
    const p = junctionPropagationAt(lossy(), J, f);
    const yRef = cdiv(cx(1), cadd(cx(J.rOhmM), cdiv(cx(1), cx(0, w * J.cFPerM))));
    assert.ok(cabs(csub(p.yJunction, yRef)) < 1e-12 * cabs(yRef));
    const vj = cdiv(cdiv(cx(1), cx(0, w * J.cFPerM)), cadd(cx(J.rOhmM), cdiv(cx(1), cx(0, w * J.cFPerM))));
    assert.ok(cabs(csub(p.junctionFactor, vj)) < 1e-12);
  }
  // slow-wave loading: quasi-static n = c sqrt(L (C + C_j)) far below f_RC
  const q = junctionPropagationAt(lossless(), J, 1e7);
  assert.ok(Math.abs(q.nRf / (C_LIGHT * Math.sqrt(L_E * (C_E + J.cFPerM))) - 1) < 1e-6);
});

test('lumped RC limit: a short electrode with an open load gives V_j / V_s = 1 / ((1 + Z_s Y_tot)(1 + j w R_j C_j))', () => {
  const L = 20e-6, zs = 50;
  const opts = { lengthM: L, zs, zl: Infinity, sweepGhz: [1, 5, 10, 20, 40, 60] };
  const r = runEoResponseStage({ kind: 'uniform', line: lossless(), opts, ngOpt: 3.9, ngSource: 'fixed', junction: J }).result;
  r.sweep.fGhz.forEach((fg, i) => {
    const f = fg * 1e9, w = 2 * Math.PI * f;
    const p = junctionPropagationAt(lossless(), J, f);
    const ytot = cscale(cadd(cx(0, w * C_E), p.yJunction), L);
    // optical transit over the electrode: mean of exp(j beta_o z) over L = (exp(j x) - 1)/(j x), x = beta_o L
    const x = (2 * Math.PI * f * 3.9 * L) / C_LIGHT;
    const transit = cdiv(cx(Math.cos(x) - 1, Math.sin(x)), cx(0, x));
    const want = cmul(cmul(cdiv(cx(1), cadd(cx(1), cscale(ytot, zs))), p.junctionFactor), transit);
    const got = cx(r.sweep.hRe[i], r.sweep.hIm[i]);
    const gl = cabs(p.gamma) * L; // electrical length of the line: the distributed correction is second order
    assert.ok(cabs(csub(got, want)) < 2 * gl * gl + 1e-12, `f ${fg} GHz: ${cabs(csub(got, want))} vs ${2 * gl * gl}`);
  });
});

test('lumped RC corner: C << C_j L: single pole f_c = 1 / (2 pi C_j (Z_s L + R_j)); the -3 dB point is f_c sqrt(10^0.3 - 1)', () => {
  const L = 5e-6, zs = 50, j = { rOhmM: 2e-3, cFPerM: 2e-8 }; // large C_j so that Z_s C_j L sets the corner
  const fc = 1 / (2 * Math.PI * j.cFPerM * (zs * L + j.rOhmM));
  const grid = Array.from({ length: 200 }, (_, i) => (fc / 1e9) * 0.02 * (i + 1));
  const r = runEoResponseStage({ kind: 'uniform', line: lossless(1e-14), opts: { lengthM: L, zs, zl: Infinity, sweepGhz: grid }, ngOpt: 3.9, ngSource: 'fixed', junction: j }).result;
  const f3 = (fc / 1e9) * Math.sqrt(10 ** 0.3 - 1); // |H| = 10^(-3/20) of a single pole (not 1/sqrt 2)
  assert.ok(Math.abs(r.bw3dbGhz / f3 - 1) < 1e-4, `${r.bw3dbGhz} vs ${f3}`);
});

test('junction-loaded response: H = H_line(junction-loaded gamma, Z0) / (1 + j w R_j C_j); matched-DC normalization; lineKind', () => {
  const opts = { lengthM: 3e-3, zs: 50, zl: 50, sweepGhz: [1, 10, 30, 50] };
  const a = runEoResponseStage({ kind: 'uniform', line: lossy(), opts, ngOpt: 3.9, ngSource: 'fixed', junction: J }).result;
  assert.equal(a.lineKind, 'junction_loaded_rf_line');
  assert.ok(Math.abs(a.junction.fRcGhz - 1 / (2 * Math.PI * J.rOhmM * J.cFPerM) / 1e9) < 1e-9);
  const huge = runEoResponseStage({ kind: 'uniform', line: lossy(), opts, ngOpt: 3.9, ngSource: 'fixed', junction: { rOhmM: 1e-3, cFPerM: 1e-30 } }).result;
  const bare = runEoResponseStage({ kind: 'uniform', line: lossy(), opts, ngOpt: 3.9, ngSource: 'fixed' }).result;
  huge.sweep.s21EoDb.forEach((v, i) => assert.ok(Math.abs(v - bare.sweep.s21EoDb[i]) < 1e-9, 'negligible junction = bare line'));
  // identity: H = responseAt(junction-loaded gamma, Z0) x 1/(1 + j w R_j C_j)
  a.sweep.fGhz.forEach((fg, i) => {
    const p = junctionPropagationAt(lossy(), J, fg * 1e9);
    const want = cmul(responseAt({ fHz: fg * 1e9, gamma: p.gamma, z0: p.z0, zs: 50, zl: 50, ngOpt: 3.9, lengthM: 3e-3 }), p.junctionFactor);
    assert.ok(cabs(csub(cx(a.sweep.hRe[i], a.sweep.hIm[i]), want)) < 1e-12);
  });
});

const fixture = readFileSync(new URL('./fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
test('runJunctionResponseStage plumbing on a synthetic semiconductor result: Vpi_DC, bias selection, input errors', () => {
  const c = structuredClone(parseConfig(fixture).raw);
  Object.assign(c.line, { source_ohm: 50, load_ohm: 50, length_mm: 2 });
  c.sweep = { f_start_ghz: 1, f_stop_ghz: 60, n_points: 60 };
  const config = parseConfig(JSON.stringify(c));
  const semi = { perLength: [{ biasV: 2, cFPerM: J.cFPerM, rOhmM: J.rOhmM, flags: [] }], points: [{ sweptBiasV: 2, optics: { dneffPerV: 2e-5 } }] };
  const out = runJunctionResponseStage({ config, semi, semiSection: 'geometry', rfSection: 'geometry', biasV: 2 });
  assert.ok(Math.abs(out.vpiDcV - 1.55e-6 / (2 * 2e-3 * 2e-5)) < 1e-9);
  assert.equal(out.response.lineKind, 'junction_loaded_rf_line');
  assert.ok(out.response.sweep.vpiRfV.every((v, i) => Math.abs(v - out.vpiDcV / Math.hypot(out.response.sweep.hRe[i], out.response.sweep.hIm[i])) < 1e-9 * v));
  assert.ok(out.response.junctionLine.nRf.every((n, i) => n > out.rf.sweep.nRf[i]), 'junction loading slows the line');
  assert.throws(() => runJunctionResponseStage({ config, semi, rfSection: 'geometry', biasV: 3 }), /no semiconductor bias point at 3 V/);
  assert.throws(() => runJunctionResponseStage({ config, semi, rfSection: 'geometry' }), /operating DC bias/);
  assert.throws(() => runJunctionResponseStage({ config, semi, rfSection: 'nope', biasV: 2 }), /electrode cross-section/);
});

// End to end: canonical lateral PN rib (illustrative; DevLog-039 fixture) + an illustrative electrode cut `rf` (oxide
// only, coplanar strips; junction excluded from the electrode C' by construction) and a 1 mm line.
const RF_CUT = `alt_geometries:
  rf:
    domain: {x_um: [-40, 40], y_um: [-10, 10]}
    regions:
      - {name: box, material: silicon_dioxide, rect: {x_um: [-40, 40], y_um: [-10, 0]}}
      - {name: clad, material: silicon_dioxide, rect: {x_um: [-40, 40], y_um: [0, 10]}}
    electrodes:
      - {name: ground_l, role: ground, material: metal, weight: 0, rect: {x_um: [-30, -10], y_um: [1, 2]}}
      - {name: signal, role: signal, material: metal, weight: 1, rect: {x_um: [-4, 4], y_um: [1, 2]}}
      - {name: ground_r, role: ground, material: metal, weight: 0, rect: {x_um: [10, 30], y_um: [1, 2]}}
    mesh: {max_edge_um: 2, electrode_edge_um: 0.25}
line:
  length_mm: 1
  source_ohm: 50
  load_ohm: 50
  loading: {type: none}
  conductor_loss_model: rprime_reference
  r_pul_ref_ohm_per_m: 500
  r_pul_ref_ghz: 10
  include_internal_inductance: false
  dielectric_loss_model: none
sweep: {f_start_ghz: 1, f_stop_ghz: 80, n_points: 80}
targets:
  - {metric: bw3db_ghz, value: 30, tol_rel: 10, source: {locator: 'illustrative; gate of the dispatch only'}}
`;
test('runConfig dispatch: stages [semiconductor, eo_response] runs the junction-loaded line after the semiconductor stage', () => {
  const text = rib({ values: '[0, 1, 2, 4]', extraTop: RF_CUT });
  const r = runCrossSection(text, { stages: ['semiconductor', 'eo_response'], rfSection: 'rf', biasV: 2 });
  assert.deepEqual(r.stages, ['semiconductor', 'rf_line', 'eo_response']);
  const pl = r.semiconductor.perLength.find((q) => q.biasV === 2);
  assert.equal(r.response.junction.cFPerM, pl.cFPerM);
  assert.equal(r.response.junction.rOhmM, pl.rOhmM);
  assert.ok(r.response.bw3dbGhz > 0);
  const t = r.targets.find((q) => q.metric === 'bw3db_ghz');
  assert.ok(t.status !== 'not_evaluated' || /rprime_reference/.test(t.reason), t.reason);
  assert.throws(() => runCrossSection(text, { stages: ['semiconductor', 'eo_response'], rfSection: 'rf' }), /operating DC bias/);
});

test('round 5: junction shunt conductance G_j in the branch and in the DC normalization; forward-bias points rejected', () => {
  const j = { rOhmM: J.rOhmM, cFPerM: J.cFPerM, gSPerM: 5 }; // illustrative leakage 5 S/m
  for (const f of [1e8, 3e10]) {
    const w = 2 * Math.PI * f;
    const p = junctionPropagationAt(lossy(), j, f);
    const yb = cx(j.gSPerM, w * j.cFPerM);
    const want = cdiv(yb, cadd(cx(1), cmul(cx(j.rOhmM), yb)));
    assert.ok(cabs(csub(p.yJunction, want)) < 1e-12 * cabs(want));
    assert.ok(cabs(csub(p.junctionFactor, cdiv(cx(1), cadd(cx(1), cmul(cx(j.rOhmM), yb))))) < 1e-12);
  }
  // DC: semi-infinite electrodes (R'(0) = 0) with a leaking junction: uniform line voltage across Z_L || 1/(y0 L),
  // junction voltage x 1/(1 + R G); H -> 1 as f -> 0
  for (const zl of [50, 35, Infinity]) {
    const r = runEoResponseStage({ kind: 'uniform', line: lossy(), opts: { lengthM: 3e-3, zs: 50, zl, sweepGhz: [1e-4, 1] }, ngOpt: 3.9, ngSource: 'fixed', junction: j }).result;
    assert.equal(r.normalization, 'model_dc_with_junction_conductance');
    assert.ok(Math.abs(r.sweep.s21EoDb[0]) < 1e-4, `zl ${zl}: H(0.1 MHz) ${r.sweep.s21EoDb[0]} dB`);
  }
  // forward-bias operating point: rejected with the reason
  const c = structuredClone(parseConfig(fixture).raw);
  Object.assign(c.line, { source_ohm: 50, load_ohm: 50, length_mm: 2 });
  c.sweep = { f_start_ghz: 1, f_stop_ghz: 60, n_points: 60 };
  const config = parseConfig(JSON.stringify(c));
  const fwd = { perLength: [{ biasV: -0.7, forwardBiasV: 0.7, cFPerM: J.cFPerM, rOhmM: J.rOhmM, gSPerM: 100, dneffPerV: 1e-4, flags: [] }], points: [{ sweptBiasV: -0.7, optics: {} }] };
  assert.throws(() => runJunctionResponseStage({ config, semi: fwd, rfSection: 'geometry', biasV: -0.7 }), /forward-bias point.*quasi-static diffusion capacitance/);
  // reverse bias with the perLength dn_eff/dV and G' = null (below the floor, taken 0); thin-conductor value on the TWE path
  const rev = { perLength: [{ biasV: 2, forwardBiasV: -2, cFPerM: J.cFPerM, rOhmM: J.rOhmM, gSPerM: null, dneffPerV: 3e-5, flags: [] }], points: [{ sweptBiasV: 2, optics: {} }] };
  const out = runJunctionResponseStage({ config, semi: rev, rfSection: 'geometry', biasV: 2 });
  assert.equal(out.response.normalization, 'lossless_dc');
  assert.ok(Math.abs(out.vpiDcV - 1.55e-6 / (2 * 2e-3 * 3e-5)) < 1e-9);
  assert.ok(Math.abs(out.response.thinConductorBelowGhz - 9 / (Math.PI * 1.25663706212e-6 * 4e7 * 4e-12) / 1e9) < 1e-9);
});
