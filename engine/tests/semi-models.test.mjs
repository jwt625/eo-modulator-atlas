// S8 model coefficients and closed-form checks (DevLog-039 gate G8 and model sanity). Reference values are the
// papers' own tabulated numbers (locators in engine/src/semi/models.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { intrinsicDensitySproulGreen, masettiMobility, MASETTI_1983, caugheyThomasField, CAUGHEY_THOMAS_1967, plasmaRow, plasmaDispersion, srh, thermalVoltage } from '../src/semi/models.mjs';
import { erfc } from '../src/semi/config.mjs';
import { bernoulli } from '../src/semi/linear.mjs';

const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

test('Sproul-Green n_i: eq. (14) at 300 K vs their Table II value 1.00(3)e10 cm^-3; range enforced', () => {
  const ni = intrinsicDensitySproulGreen(300);
  assert.ok(rel(ni, 1.0e10) < 0.005, `n_i(300 K) = ${ni}`);
  // Table II saturation-current column: 275 K 1.05e9, 325 K 6.90e10, 350 K 3.61e11, 375 K 1.54e12 (the paper states eq. (14) describes them to within 0.5 %; checked at 2 %)
  for (const [T, v] of [[275, 1.05e9], [325, 6.9e10], [350, 3.61e11], [375, 1.54e12]]) assert.ok(rel(intrinsicDensitySproulGreen(T), v) < 0.02, `T ${T}`);
  assert.throws(() => intrinsicDensitySproulGreen(400), /275-375 K/);
});

test('thermal voltage at 300 K from the SI constants vs Sproul-Green p. 848: 25.85216(22) meV (CODATA 1986)', () => {
  assert.ok(Math.abs(thermalVoltage(300) - 0.02585216) < 2.2e-7);
});

test('Masetti eq. (1), (4): low-doping limits are mumax; monotone decrease with doping', () => {
  for (const k of ['phosphorus', 'arsenic', 'boron']) {
    const p = MASETTI_1983[k];
    assert.ok(rel(masettiMobility(p, 1e10), p.mumax) < 1e-3, k);
    let last = Infinity;
    for (const N of [1e14, 1e16, 1e17, 1e18, 1e19, 1e20, 1e21]) { const m = masettiMobility(p, N); assert.ok(m < last && m > 0, `${k} ${N}`); last = m; }
  }
});

test('Caughey-Thomas chord mobility: low field mu0, saturation velocity v_m at high field', () => {
  const e = CAUGHEY_THOMAS_1967.field.electrons, h = CAUGHEY_THOMAS_1967.field.holes;
  assert.ok(rel(caugheyThomasField(1400, 1, e), 1400) < 1e-6);
  assert.ok(rel(caugheyThomasField(1400, 1e7, e) * 1e7, e.vm) < 1e-3);
  assert.ok(rel(caugheyThomasField(480, 1e8, h) * 1e8, h.vm) < 1e-3);
});

test('erfc fit vs exact values (fractional error < 2e-7)', () => {
  for (const [x, v] of [[0, 1], [0.5, 0.4795001221869535], [1, 0.15729920705028513], [2, 0.004677734981047266], [-1, 1.8427007929497148]]) assert.ok(rel(erfc(x), v) < 2e-7, `x ${x}`);
});

test('Bernoulli function: B(0) = 1, B(-x) = B(x) + x, derivative by finite difference', () => {
  assert.equal(bernoulli(0)[0], 1);
  for (const x of [-50, -3, -1e-4, 2e-4, 0.7, 5, 40]) {
    const [b, db] = bernoulli(x);
    assert.ok(Math.abs(bernoulli(-x)[0] - (b + x)) < 1e-12 * Math.max(1, Math.abs(x)), `x ${x}`);
    const h = 1e-6 * Math.max(1, Math.abs(x));
    const fd = (bernoulli(x + h)[0] - bernoulli(x - h)[0]) / (2 * h);
    assert.ok(Math.abs(fd - db) < 1e-6 * Math.max(1, Math.abs(db)), `x ${x}: ${fd} vs ${db}`);
  }
});

test('SRH: zero at n p = n_i^2, generation n_i / (2 tau) when depleted, derivatives by finite difference', () => {
  const ni = 1e10;
  assert.equal(srh(1e15, 1e5, ni * ni, 1e-6, 1e-6, ni, ni)[0], 0);
  assert.ok(rel(-srh(0, 0, ni * ni, 1e-6, 1e-6, ni, ni)[0], ni / 2e-6) < 1e-12);
  const [, un, up] = srh(3e14, 2e9, ni * ni, 1e-6, 2e-6, ni, ni);
  const fn = (srh(3e14 * (1 + 1e-6), 2e9, ni * ni, 1e-6, 2e-6, ni, ni)[0] - srh(3e14 * (1 - 1e-6), 2e9, ni * ni, 1e-6, 2e-6, ni, ni)[0]) / (6e8);
  const fp = (srh(3e14, 2e9 * (1 + 1e-6), ni * ni, 1e-6, 2e-6, ni, ni)[0] - srh(3e14, 2e9 * (1 - 1e-6), ni * ni, 1e-6, 2e-6, ni, ni)[0]) / (4e3);
  assert.ok(rel(fn, un) < 1e-5 && rel(fp, up) < 1e-5);
});

test('G8 Nedeljkovic 2011: Table 2 (1.55 um, N_h = 1e17): -dn 2.70e-4, d alpha 0.416 cm^-1, L_pi 0.287 cm (< 1 %)', () => {
  const row = plasmaRow('nedeljkovic_2011', 1.55);
  const [dn, da] = plasmaDispersion(row.coeff, 0, 1e17);
  assert.ok(rel(-dn, 2.7e-4) < 0.01, `-dn ${-dn}`);
  assert.ok(rel(da, 0.416) < 0.01, `da ${da}`);
  assert.ok(rel(1.55e-4 / (2 * -dn), 0.287) < 0.01);
  // 1310 nm maps to the 1.3 um row with the mismatch reported
  const r13 = plasmaRow('nedeljkovic_2011', 1.31);
  assert.equal(r13.rowUm, 1.3);
  assert.ok(Math.abs(r13.mismatchUm - 0.01) < 1e-12);
  // all 27 Table 1 rows (1.3-14 um); 1.97 um maps to the 2.0 um row; 1.8 um is not covered (rows are not interpolated)
  assert.equal(plasmaRow('nedeljkovic_2011', 1.97).rowUm, 2);
  assert.equal(plasmaRow('nedeljkovic_2011', 14).coeff.s, 0.656);
  assert.throws(() => plasmaRow('nedeljkovic_2011', 1.8), /not covered/);
  assert.throws(() => plasmaRow('soref_bennett_1987', 2.0), /not covered/);
});

test('G8 Soref-Bennett closed form (Reed 2010 p. 519): 5e17 cm^-3 of each carrier gives dn = -1.66e-3 at 1.55 um (< 1 %)', () => {
  const [dn] = plasmaDispersion(plasmaRow('soref_bennett_1987', 1.55).coeff, 5e17, 5e17);
  assert.ok(rel(dn, -1.66e-3) < 0.01, `dn ${dn}`);
});
