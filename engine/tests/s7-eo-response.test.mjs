// S7 traveling-wave EO response: closed-form limits, reflections against an independent quadrature, harness replay.
// All line parameters below are ILLUSTRATIVE TEST INPUTS (not material data) unless a source is named.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cx, cmul, cdiv, cadd, csub, cabs, cexp, ccosh, csinh, cscale } from '../src/complex.mjs';
import { C_LIGHT, createRfLine, propagationAt, dbPerCmToNpPerM } from '../src/rf-line.mjs';
import { phaseIntegral, dcPhaseIntegral, responseAt, toDb, firstCrossing, forwardKernel, backwardKernel, BANDWIDTH_THRESHOLDS_DB } from '../src/eo-response.mjs';

const L = 0.01; // m
const Z0 = cx(50);
/** Lossless line of RF index n: gamma(f) = j 2 pi f n / c. */
const lossless = (n) => (fHz) => ({ re: 0, im: (2 * Math.PI * fHz * n) / C_LIGHT });
const db = (h) => toDb(h);

test('lossless, velocity matched, matched source and load: 0 dB at every frequency', () => {
  for (const f of [1e8, 1e9, 1e10, 5e10, 1.1e11, 3e11]) {
    const h = responseAt({ fHz: f, gamma: lossless(2.2)(f), z0: Z0, zs: 50, zl: 50, ngOpt: 2.2, lengthM: L });
    assert.ok(Math.abs(db(h)) < 1e-9, `f ${f}: ${db(h)} dB`);
  }
});

test('pure velocity mismatch (matched, lossless): |H| = |sin(x)/x|, x = pi f L (n_RF - n_g)/c (Alferness 1982 eq. 20)', () => {
  const nRf = 2.6, ng = 2.2;
  for (const f of [1e9, 2e10, 6.7e10, 1.5e11]) {
    const h = responseAt({ fHz: f, gamma: lossless(nRf)(f), z0: Z0, zs: 50, zl: 50, ngOpt: ng, lengthM: L });
    const x = (Math.PI * f * L * (nRf - ng)) / C_LIGHT;
    assert.ok(Math.abs(cabs(h) - Math.abs(Math.sin(x) / x)) < 1e-12, `f ${f}`);
  }
  // the first zero of the sinc: x = pi
  const fz = C_LIGHT / (L * (nRf - ng));
  const h = responseAt({ fHz: fz, gamma: lossless(nRf)(fz), z0: Z0, zs: 50, zl: 50, ngOpt: ng, lengthM: L });
  assert.ok(cabs(h) < 1e-12);
});

test('pure loss (matched, velocity matched): |H| = (1 - exp(-aL)) / (aL) (Alferness 1982 eq. 22, field alpha)', () => {
  for (const a of [1, 10, 34, 100]) {
    const f = 5e10;
    const gamma = cx(a, (2 * Math.PI * f * 2.2) / C_LIGHT);
    const h = responseAt({ fHz: f, gamma, z0: Z0, zs: 50, zl: 50, ngOpt: 2.2, lengthM: L });
    const want = (1 - Math.exp(-a * L)) / (a * L);
    assert.ok(Math.abs(cabs(h) - want) < 1e-12, `a ${a}: ${cabs(h)} vs ${want}`);
  }
});

// Independent check: V(z) from the load end with the ABCD of the line (V_L, I_L), scaled so that V_s = V(0) + Z_s I(0) = 1,
// integrated with composite Simpson. Covers open (Z_L = Infinity), short (Z_L = 0) and arbitrary terminations, with loss
// and velocity mismatch.
function quadraturePhi({ gamma, z0, zs, zl, betaO, lengthM }, n = 4000) {
  const vl = zl === 0 ? cx(0) : cx(1);
  const il = zl === Infinity ? cx(0) : zl === 0 ? cx(1) : cdiv(cx(1), cx(zl));
  const at = (z) => {
    const g = cscale(gamma, lengthM - z);
    return { v: cadd(cmul(vl, ccosh(g)), cmul(cmul(il, z0), csinh(g))), i: cadd(cdiv(cmul(vl, csinh(g)), z0), cmul(il, ccosh(g))) };
  };
  const s0 = at(0);
  const vs = cadd(s0.v, cscale(s0.i, zs));
  let acc = cx(0);
  const hstep = lengthM / n;
  for (let k = 0; k <= n; k++) {
    const z = k * hstep;
    const wgt = k === 0 || k === n ? 1 : k % 2 ? 4 : 2;
    acc = cadd(acc, cscale(cmul(at(z).v, cexp(cx(0, betaO * z))), wgt));
  }
  return cdiv(cscale(acc, hstep / 3), vs);
}

test('open, short and mismatched loads: closed-form Phi agrees with an independent quadrature of V(z)', () => {
  const f = 4.3e10;
  const cases = [
    { gamma: cx(12, (2 * Math.PI * f * 2.3) / C_LIGHT), z0: cx(42, -1.5), zs: 50, zl: Infinity },
    { gamma: cx(12, (2 * Math.PI * f * 2.3) / C_LIGHT), z0: cx(42, -1.5), zs: 50, zl: 0 },
    { gamma: cx(3, (2 * Math.PI * f * 2.0) / C_LIGHT), z0: cx(38, -0.4), zs: 25, zl: 75 },
    { gamma: cx(0, (2 * Math.PI * f * 2.2) / C_LIGHT), z0: cx(50), zs: 0, zl: 10 },
  ];
  for (const c of cases) {
    const betaO = (2 * Math.PI * f * 2.2) / C_LIGHT;
    const { phi } = phaseIntegral({ ...c, betaO, lengthM: L });
    const q = quadraturePhi({ ...c, betaO, lengthM: L });
    assert.ok(cabs(csub(phi, q)) < 1e-9 * cabs(q), `zl ${c.zl}: ${JSON.stringify(phi)} vs ${JSON.stringify(q)}`);
  }
});

test('open load, matched source, lossless, velocity matched: H = (1/2)[1 + (1 - exp(-2 j b L)) / (2 j b L)]', () => {
  for (const f of [1e9, 1e10, 7e10]) {
    const b = (2 * Math.PI * f * 2.2) / C_LIGHT;
    const h = responseAt({ fHz: f, gamma: cx(0, b), z0: Z0, zs: 50, zl: Infinity, ngOpt: 2.2, lengthM: L });
    const x = cx(0, 2 * b * L);
    const want = cscale(cadd(cx(1), cdiv(csub(cx(1), cexp(cscale(x, -1))), x)), 0.5);
    assert.ok(cabs(csub(h, want)) < 1e-12, `f ${f}`);
  }
  // DC limit of the normalization: open load -> L, short has no DC phase
  assert.equal(dcPhaseIntegral({ zs: 50, zl: Infinity, lengthM: L }), L);
  assert.throws(() => dcPhaseIntegral({ zs: 50, zl: 0, lengthM: L }), /short/);
});

test('small-argument kernels are continuous across the series switch', () => {
  for (const u of [cx(9e-7, 3e-7), cx(1.1e-6, -2e-7)]) {
    const f = forwardKernel(u), b = backwardKernel(u);
    const fe = cdiv(csub(cx(1), cexp(cscale(u, -1))), u), be = cdiv(csub(cexp(u), cx(1)), u);
    assert.ok(cabs(csub(f, fe)) < 1e-9 && cabs(csub(b, be)) < 1e-9);
  }
});

test('low-frequency limit tends to 0 dB for a mismatched lossy line (normalization is the DC limit)', () => {
  const line = createRfLine({ cPul: 1.2e-10 * 4, lPul: 3e-7, conductor: { model: 'rprime_reference', rPulRefOhmPerM: 400, fRefHz: 1e10, includeInternalInductance: false }, dielectric: { model: 'none' } });
  const p = propagationAt(line, 1e6);
  const h = responseAt({ fHz: 1e6, gamma: p.gamma, z0: p.z0, zs: 50, zl: 40, ngOpt: 2.2, lengthM: L });
  assert.ok(Math.abs(db(h)) < 1e-3, `${db(h)} dB`);
});

test('harness Chen replay (formula check): 0.36 dB/cm/sqrt(GHz), n_RF 2.18, n_g 2.2, 10 mm, matched -> -1.46 dB at 67 GHz', () => {
  // Inputs as recorded in DevLog-023 (harness transmission_line.py replay of Chen 2022 measured loss); matched 50 ohm.
  const f = 67e9;
  const alpha = dbPerCmToNpPerM(0.36 * Math.sqrt(67));
  const gamma = cx(alpha, (2 * Math.PI * f * 2.18) / C_LIGHT);
  const h = responseAt({ fHz: f, gamma, z0: Z0, zs: 50, zl: 50, ngOpt: 2.2, lengthM: 0.01 });
  assert.ok(Math.abs(db(h) - -1.46) < 0.005, `${db(h)} dB`);
});

test('first crossing: bisection inside the bracketing interval; bounds when no crossing', () => {
  const nRf = 2.6, ng = 2.2;
  const g = (f) => db(responseAt({ fHz: f, gamma: lossless(nRf)(f), z0: Z0, zs: 50, zl: 50, ngOpt: ng, lengthM: L }));
  const grid = Array.from({ length: 50 }, (_, i) => 1e9 + i * 2e9);
  const c = firstCrossing(g, grid, BANDWIDTH_THRESHOLDS_DB.bw3db_ghz);
  // |sin x / x| = 10^(-3/20) at x = 1.3893486 (audit S8: comment corrected) (root of the equation, solved here independently by bisection)
  let a = 1, b = 2;
  for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (Math.abs(Math.sin(m) / m) > 10 ** (-3 / 20)) a = m; else b = m; }
  const fWant = (a * C_LIGHT) / (Math.PI * L * (nRf - ng));
  assert.ok(Math.abs(c.fHz - fWant) < 1e-6 * fWant, `${c.fHz} vs ${fWant}`);
  assert.deepEqual(firstCrossing(g, grid.slice(0, 3), -3).above, true);
  assert.equal(firstCrossing(() => -10, grid, -3).below, true);
});
