// S7 periodic loaded line: Bloch cell limits. All line parameters are ILLUSTRATIVE TEST INPUTS (not material data).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cx, cabs, csub, cmul, cdiv, csqrt } from '../src/complex.mjs';
import { C_LIGHT, createRfLine, propagationAt } from '../src/rf-line.mjs';
import { blochCell, sectionAbcd, abcdMul, createLoadedLine, blochAt, quasiStaticBloch, braggFrequency, losslessHalfTrace, casinh } from '../src/loaded-line.mjs';

const L_U = 4.0e-7; // H/m
const C_U = 1.6e-10; // F/m (Z = 50 ohm, n = 2.4)
const lossyLine = (cPul, lPul) => createRfLine({ cPul, lPul, conductor: { model: 'rprime_reference', rPulRefOhmPerM: 600, fRefHz: 5e10, includeInternalInductance: true }, dielectric: { model: 'uniform', tanDelta: 4e-3 } });
const losslessLine = (cPul, lPul) => createRfLine({ cPul, lPul, conductor: { model: 'none' }, dielectric: { model: 'none' } });

test('zero loading: the Bloch cell of two identical sections is the uniform line (gamma_B = gamma, Z_B = Z0)', () => {
  const u = lossyLine(C_U, L_U);
  const ll = createLoadedLine({ periodM: 50e-6, loadedLengthM: 36e-6, unloaded: u, loaded: u });
  for (const f of [1e8, 1e9, 5e10, 2e11]) {
    const b = blochAt(ll, f);
    const p = propagationAt(u, f);
    assert.ok(cabs(csub(b.gammaB, p.gamma)) < 1e-9 * cabs(p.gamma), `gamma at ${f}: ${JSON.stringify(b.gammaB)} vs ${JSON.stringify(p.gamma)}`);
    assert.ok(cabs(csub(b.zB, p.z0)) < 1e-9 * cabs(p.z0), `Z at ${f}`);
  }
  // no stopband: Bragg = c / (2 p n), found as the maximum of beta_B p
  const n = C_LIGHT * Math.sqrt(L_U * C_U);
  assert.ok(Math.abs(ll.bragg.fHz / (C_LIGHT / (2 * 50e-6 * n)) - 1) < 1e-6);
  assert.equal(ll.bragg.gap, false);
});

test('stable half trace: (A + D)/2 of the cell equals the explicit ABCD product', () => {
  const pU = propagationAt(lossyLine(C_U, L_U), 3e10);
  const pL = propagationAt(lossyLine(3 * C_U, L_U), 3e10);
  const b = blochCell({ gammaU: pU.gamma, z0U: pU.z0, gammaL: pL.gamma, z0L: pL.z0, lU: 14e-6, lL: 36e-6 });
  const m = abcdMul(abcdMul(sectionAbcd(pU.gamma, pU.z0, 7e-6), sectionAbcd(pL.gamma, pL.z0, 36e-6)), sectionAbcd(pU.gamma, pU.z0, 7e-6));
  const ht = { re: (m.A.re + m.D.re) / 2, im: (m.A.im + m.D.im) / 2 };
  assert.ok(cabs(csub(ht, b.halfTrace)) < 1e-12);
  // symmetric cell: A = D, AD - BC = 1
  assert.ok(cabs(csub(m.A, m.D)) < 1e-12);
  const det = csub(cmul(m.A, m.D), cmul(m.B, m.C));
  assert.ok(Math.abs(det.re - 1) < 1e-12 && Math.abs(det.im) < 1e-12);
  // cosh(gamma_B p) = half trace
  const w = { re: b.gammaB.re * 50e-6, im: b.gammaB.im * 50e-6 };
  const ch = { re: Math.cosh(w.re) * Math.cos(w.im), im: Math.sinh(w.re) * Math.sin(w.im) };
  assert.ok(cabs(csub(ch, b.halfTrace)) < 1e-12);
  assert.ok(b.gammaB.re >= 0 && b.gammaB.im > 0);
  // Z_B^2 = B / C
  const zz = cmul(b.zB, b.zB);
  assert.ok(cabs(csub(zz, cdiv(m.B, m.C))) < 1e-9 * cabs(zz));
});

test('long-wavelength limit: n_B -> c sqrt(L_avg C_avg), Z_B -> sqrt(L_avg / C_avg) (lossless)', () => {
  const ll = createLoadedLine({ periodM: 50e-6, loadedLengthM: 36e-6, unloaded: losslessLine(C_U, L_U), loaded: losslessLine(2.5 * C_U, L_U) });
  const qs = quasiStaticBloch(ll.lc);
  const b = blochAt(ll, 1e7);
  assert.ok(Math.abs(b.nB / qs.nRf - 1) < 1e-9, `${b.nB} vs ${qs.nRf}`);
  assert.ok(Math.abs(b.zB.re / qs.zOhm - 1) < 1e-9 && Math.abs(b.zB.im) < 1e-9 * qs.zOhm);
  assert.ok(Math.abs(qs.nRf - C_LIGHT * Math.sqrt(L_U * C_U * (14 + 36 * 2.5) / 50)) < 1e-12);
});

test('small-loading perturbation: n_B = n_U (1 + eps l_L / (2 p)) to first order in eps, dispersion O((beta p)^2)', () => {
  const eps = 1e-4;
  const ll = createLoadedLine({ periodM: 50e-6, loadedLengthM: 36e-6, unloaded: losslessLine(C_U, L_U), loaded: losslessLine((1 + eps) * C_U, L_U) });
  const nU = C_LIGHT * Math.sqrt(L_U * C_U);
  for (const f of [1e9, 5e10]) {
    const b = blochAt(ll, f);
    const first = nU * (1 + (eps * 36) / (2 * 50));
    assert.ok(Math.abs(b.nB / first - 1) < 5 * eps * eps, `f ${f}: ${b.nB} vs ${first}`);
  }
});

test('Bragg frequency: lossless cell (A+D)/2 = -1 at the band edge; above it the cell is in the stopband', () => {
  const ll = createLoadedLine({ periodM: 50e-6, loadedLengthM: 10e-6, unloaded: losslessLine(C_U, L_U), loaded: losslessLine(20 * C_U, L_U) });
  const fb = ll.bragg.fHz;
  assert.equal(ll.bragg.gap, true);
  assert.ok(Math.abs(losslessHalfTrace(ll.lc, fb) + 1) < 1e-9);
  assert.ok(losslessHalfTrace(ll.lc, 0.999 * fb) > -1);
  assert.ok(fb < ll.bragg.estimateHz, 'the first band edge of a loaded line lies below c/(2 p n_B0)');
  const below = blochAt(ll, 0.9 * fb), above = blochAt(ll, 1.02 * fb);
  assert.ok(Math.abs(below.gammaB.re) < 1e-9 && below.betaP < Math.PI);
  assert.ok(above.gammaB.re > 0 && Math.abs(above.betaP - Math.PI) < 1e-9 && above.aboveBragg);
});

test('lumped-load limit: short loaded section of high C reproduces the half line / shunt C / half line cell', () => {
  // Harness formula note (DevLog-023): cell = half line, shunt j omega C_T, half line. A loaded section of length d with
  // C'_L d = C_T (plus the line's own C' d) and the same L' tends to that cell as d -> 0.
  const p = 50e-6, cT = 5e-15, f = 4e10, w = 2 * Math.PI * f;
  const u = losslessLine(C_U, L_U);
  const pu = propagationAt(u, f);
  const half = sectionAbcd(pu.gamma, pu.z0, p / 2);
  const shunt = { A: cx(1), B: cx(0), C: cx(0, w * cT), D: cx(1) };
  const ref = abcdMul(abcdMul(half, shunt), half);
  const refHalfTrace = (ref.A.re + ref.D.re) / 2;
  let prev = Infinity;
  for (const d of [1e-6, 1e-7, 1e-8]) {
    const ll = createLoadedLine({ periodM: p, loadedLengthM: d, unloaded: u, loaded: losslessLine(C_U + cT / d, L_U) });
    const b = blochAt(ll, f);
    const ht = Math.cos(b.betaP);
    const err = Math.abs(ht - refHalfTrace);
    assert.ok(err < prev, `d ${d}: error ${err} not decreasing`);
    prev = err;
  }
  assert.ok(prev < 1e-6);
});

test('complex asinh: series and log branches agree near the switch', () => {
  for (const s of [cx(9.9e-4, 2e-4), cx(1.01e-3, -3e-4), cx(0, 0.5), cx(0.2, 1.3)]) {
    const a = casinh(s);
    // sinh(a) = s
    const sh = { re: Math.sinh(a.re) * Math.cos(a.im), im: Math.cosh(a.re) * Math.sin(a.im) };
    assert.ok(cabs(csub(sh, s)) < 1e-13 * Math.max(1, cabs(s)));
  }
  assert.ok(cabs(csqrt(cx(4))) === 2);
});
