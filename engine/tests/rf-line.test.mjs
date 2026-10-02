import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { solveElectrostatics, C_LIGHT as C_E1, MU0 as MU0_E1, EPS0 as EPS0_E1 } from '../src/electrostatics.mjs';
import { runCrossSection } from '../src/run.mjs';
import { cx, cmul, cdiv, csqrt, cabs, cexp, ccosh, csinh } from '../src/complex.mjs';
import {
  C_LIGHT, MU0, EPS0, NEPER_TO_DB, createRfLine, propagationAt, rlgcAt, sweepGhz, linspaceGhz, ghzToHz, hzToGhz,
  npPerMToDbPerCm, dbPerCmToNpPerM, skinDepthM, surfaceResistanceOhm, wheelerRPrime, lPulFromC0, lowLossAlpha, matchedS21Db,
  wheelerStepCheck, lineParamsFromElectrostatics, lineParamsFromMetrics, dielectricFromRegions, electrodePerimetersM,
} from '../src/rf-line.mjs';
import { geom, rect, mats, section, relErr } from './helpers.mjs';

// All conductivities, loss tangents and line parameters below are ILLUSTRATIVE TEST INPUTS, not material data.
const SIGMA_TEST = 5.0e7; // S/m
const L_TEST = 3.0e-7; // H/m
const C_TEST = 1.2e-10; // F/m (Z0 = sqrt(L/C) = 50 Ohm)
const F_TEST = 10e9; // Hz
const W = 2 * Math.PI * F_TEST;
const near = (a, b, tol, msg) => assert.ok(relErr(a, b) < tol, `${msg ?? ''} got ${a}, want ${b}, rel ${relErr(a, b)}`);

const lossless = (extra = {}) => createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor: { model: 'none' }, dielectric: { model: 'none' }, ...extra });
// Series loss r = R'/(omega L'), shunt loss g = tan delta = G'/(omega C'), both at F_TEST.
const lossy = (r, g) => createRfLine({
  cPul: C_TEST, lPul: L_TEST,
  conductor: { model: 'rprime_reference', rPulRefOhmPerM: r * W * L_TEST, fRefHz: F_TEST, includeInternalInductance: false },
  dielectric: { model: 'uniform', tanDelta: g },
});

test('constants agree with the E1 electrostatics exports', () => {
  assert.equal(C_LIGHT, C_E1);
  assert.equal(MU0, MU0_E1);
  assert.equal(EPS0, EPS0_E1);
});

test('complex helpers: principal root branches, stability, products and hyperbolics', () => {
  const s = csqrt(cx(-4, 0));
  assert.ok(Math.abs(s.re) < 1e-15 && Math.abs(s.im - 2) < 1e-15);
  const t = csqrt(cx(-1, 1e-30)); // tiny imaginary part must not be lost
  assert.ok(Math.abs(t.re - 0.5e-30) < 1e-45 && Math.abs(t.im - 1) < 1e-15);
  for (const z of [cx(3, 4), cx(-3, 4), cx(-3, -4), cx(3, -4), cx(0, 2)]) {
    const r = csqrt(z);
    assert.ok(r.re >= 0);
    const back = cmul(r, r);
    assert.ok(cabs({ re: back.re - z.re, im: back.im - z.im }) < 1e-14 * cabs(z));
  }
  const q = cdiv(cx(1, 2), cx(3, -1));
  assert.ok(Math.abs(q.re - 1 / 10) < 1e-15 && Math.abs(q.im - 7 / 10) < 1e-15);
  assert.throws(() => cdiv(cx(1, 0), cx(0, 0)), /division by zero/);
  const z = cx(0.3, -0.7);
  const e = cexp(z);
  assert.ok(Math.abs(cabs(e) - Math.exp(0.3)) < 1e-15);
  const ch = ccosh(z);
  const sh = csinh(z);
  const id = { re: cmul(ch, ch).re - cmul(sh, sh).re, im: cmul(ch, ch).im - cmul(sh, sh).im };
  assert.ok(Math.abs(id.re - 1) < 1e-14 && Math.abs(id.im) < 1e-14);
});

test('lossless TEM limit: Z0 = sqrt(L/C), v = 1/sqrt(LC), n_rf = sqrt(C/C0) = sqrt(eps_eff), alpha = 0', () => {
  const epsEff = 4;
  const c0 = C_TEST / epsEff;
  const line = createRfLine({ cPul: C_TEST, c0Pul: c0, conductor: { model: 'none' }, dielectric: { model: 'none' } });
  assert.equal(line.lPul, 1 / (C_LIGHT * C_LIGHT * c0));
  for (const f of [1e6, 1e9, 6.7e10, 3e11]) {
    const p = propagationAt(line, f);
    const w = 2 * Math.PI * f;
    assert.equal(p.alphaNpPerM, 0);
    assert.equal(p.z0.im, 0);
    near(p.z0.re, Math.sqrt(line.lPul / C_TEST), 1e-13, 'Z0');
    near(p.vPhaseMPerS, 1 / Math.sqrt(line.lPul * C_TEST), 1e-13, 'v');
    near(p.betaRadPerM, w * Math.sqrt(line.lPul * C_TEST), 1e-13, 'beta');
    near(p.nRf, Math.sqrt(epsEff), 1e-12, 'n_rf');
    near(p.vPhaseOverC, 1 / Math.sqrt(epsEff), 1e-12, 'v/c');
    near(p.z0.re, 1 / (C_LIGHT * Math.sqrt(C_TEST * c0)), 1e-12, 'matches the E1 Z0 formula');
  }
});

test('parallel-plate analytic RLGC in repo units: C\' = eps0 eps_r w/d, L\' = mu0 d/w, Z0 = (d/w) eta0 / sqrt(eps_r)', () => {
  const w = 2e-6;
  const d = 1.8e-6;
  const epsR = 4;
  const c0 = (EPS0 * w) / d;
  const line = createRfLine({ cPul: epsR * c0, c0Pul: c0, conductor: { model: 'none' }, dielectric: { model: 'none' } });
  near(line.lPul, (MU0 * d) / w, 1e-9, "L'");
  const eta0 = Math.sqrt(MU0 / EPS0);
  const p = propagationAt(line, F_TEST);
  near(p.z0.re, ((d / w) * eta0) / Math.sqrt(epsR), 1e-8, 'Z0');
  near(p.nRf, Math.sqrt(epsR), 1e-8, 'n_rf');
});

test('exact lossy line: gamma^2 = Z Y, Re(gamma) >= 0, Z0 = gamma / Y, closed-form alpha and beta', () => {
  const line = lossy(0.2, 0.05); // moderate loss to make the closed form well conditioned
  const p = propagationAt(line, F_TEST);
  const Z = cx(p.rOhmPerM, W * p.lHPerM);
  const Y = cx(p.gSPerM, W * p.cFPerM);
  const g2 = cmul(p.gamma, p.gamma);
  const zy = cmul(Z, Y);
  assert.ok(cabs({ re: g2.re - zy.re, im: g2.im - zy.im }) < 1e-12 * cabs(zy));
  const m = cabs(zy);
  near(p.alphaNpPerM, Math.sqrt((m + zy.re) / 2), 1e-12, 'alpha closed form');
  near(p.betaRadPerM, Math.sqrt((m - zy.re) / 2), 1e-12, 'beta closed form');
  const zg = cmul(p.z0, Y);
  assert.ok(cabs({ re: zg.re - p.gamma.re, im: zg.im - p.gamma.im }) < 1e-12 * cabs(p.gamma));
  // Z0 gamma = Z' as well
  const z0g = cmul(p.z0, p.gamma);
  assert.ok(cabs({ re: z0g.re - Z.re, im: z0g.im - Z.im }) < 1e-12 * cabs(Z));
});

test('passivity: alpha >= 0, Re(Z0) > 0, beta > 0 over loss, model and frequency grids', () => {
  const lines = [lossless(), lossy(1e-4, 0), lossy(0, 1e-3), lossy(0.3, 0.2), lossy(5, 5), lossy(1e-9, 1e-9)];
  for (const line of lines) {
    for (const f of [1e5, 1e8, 1e9, 1e10, 1e11, 1e12]) {
      const p = propagationAt(line, f);
      assert.ok(p.alphaNpPerM >= 0, 'alpha');
      assert.ok(p.z0.re > 0, 'Re Z0');
      assert.ok(p.betaRadPerM > 0, 'beta');
      assert.ok(p.vPhaseMPerS > 0 && p.vPhaseMPerS <= C_LIGHT * 1.0000001, 'phase velocity bound for eps_eff >= 1 lines');
    }
  }
});

test('Heaviside distortionless line (R/L = G/C): alpha = R/Z0, beta = omega sqrt(LC), Z0 real, exactly', () => {
  // R'/(omega L') = G'/(omega C') = r at F_TEST (the condition holds at this single frequency by construction).
  const r = 0.1;
  const R = r * W * L_TEST;
  const line = createRfLine({
    cPul: C_TEST, lPul: L_TEST,
    conductor: { model: 'rprime_reference', rPulRefOhmPerM: R, fRefHz: F_TEST, includeInternalInductance: false },
    dielectric: { model: 'uniform', tanDelta: r }, // G' = omega C' r  =>  G'/C' = R'/L'
  });
  const p = propagationAt(line, F_TEST);
  const z0 = Math.sqrt(L_TEST / C_TEST);
  near(p.alphaNpPerM, R / z0, 1e-12, 'alpha = R/Z0');
  near(p.betaRadPerM, W * Math.sqrt(L_TEST * C_TEST), 1e-12, 'beta');
  assert.ok(Math.abs(p.z0.im) < 1e-12 * p.z0.re);
  near(p.z0.re, z0, 1e-12, 'Z0');
});

test('low-loss approximation alpha = R/(2 Z0) + G Z0/2 converges to the exact gamma as loss -> 0 (relative error ~ loss^2)', () => {
  const errs = [];
  for (const s of [1e-1, 1e-2, 1e-3, 1e-4]) {
    const p = propagationAt(lossy(s, 0.5 * s), F_TEST);
    const approx = lowLossAlpha({ R: p.rOhmPerM, G: p.gSPerM, L: L_TEST, C: C_TEST }).total;
    errs.push(Math.abs(approx / p.alphaNpPerM - 1));
  }
  for (let i = 1; i < errs.length; i++) assert.ok(errs[i] < 0.02 * errs[i - 1], `error ratio ${errs[i] / errs[i - 1]}`);
  assert.ok(errs[3] < 1e-7);
  // components of the split follow R/(2 Z0) and G Z0/2
  const p = propagationAt(lossy(1e-3, 0), F_TEST);
  near(p.lowLossComponentsNpPerM.conductor, p.rOhmPerM / (2 * Math.sqrt(L_TEST / C_TEST)), 1e-14);
  assert.equal(p.lowLossComponentsNpPerM.dielectric, 0);
});

test('dielectric loss only, homogeneous filling: alpha = (pi f / v) tan delta (low loss) and the exact closed form', () => {
  const epsEff = 6.25;
  const c0 = C_TEST / epsEff;
  const mk = (t) => createRfLine({ cPul: C_TEST, c0Pul: c0, conductor: { model: 'none' }, dielectric: { model: 'uniform', tanDelta: t } });
  for (const f of [1e9, 1e10, 1e11]) {
    const v = C_LIGHT / Math.sqrt(epsEff);
    const t = 1e-4;
    const p = propagationAt(mk(t), f);
    near(p.alphaNpPerM, (Math.PI * f / v) * t, 1e-7, 'low-loss');
    // exact: alpha = (omega/v) sqrt((sqrt(1+t^2) - 1)/2) for G' = omega C' t with L', C' lossless
    const tt = 0.3;
    const q = propagationAt(mk(tt), f);
    near(q.alphaNpPerM, ((2 * Math.PI * f) / v) * Math.sqrt((Math.sqrt(1 + tt * tt) - 1) / 2), 1e-12, 'exact');
    near(q.betaRadPerM, ((2 * Math.PI * f) / v) * Math.sqrt((Math.sqrt(1 + tt * tt) + 1) / 2), 1e-12, 'exact beta');
  }
  // linear in f for a fixed tan delta
  const a1 = propagationAt(mk(1e-4), 1e9).alphaNpPerM;
  const a4 = propagationAt(mk(1e-4), 4e9).alphaNpPerM;
  near(a4 / a1, 4, 1e-7, 'linear in f');
});

test('skin effect: delta = 1/sqrt(pi f mu0 sigma), R_s = 1/(sigma delta), sqrt(f) scaling of R\' and alpha', () => {
  const d = skinDepthM(F_TEST, SIGMA_TEST);
  near(surfaceResistanceOhm(F_TEST, SIGMA_TEST), 1 / (SIGMA_TEST * d), 1e-13, 'R_s = 1/(sigma delta)');
  near(surfaceResistanceOhm(4 * F_TEST, SIGMA_TEST) / surfaceResistanceOhm(F_TEST, SIGMA_TEST), 2, 1e-13, 'R_s sqrt f');
  const models = [
    { model: 'surface_resistance_geometry_factor', sigmaSm: SIGMA_TEST, kPerM: 1e3, includeInternalInductance: false },
    { model: 'surface_resistance_perimeter', sigmaSm: SIGMA_TEST, signalPerimeterM: 5e-3, returnPerimeterM: 8e-3, perimetersCoverCarryingSurfaces: true, includeInternalInductance: false },
    { model: 'rprime_reference', rPulRefOhmPerM: 5, fRefHz: 1e9, includeInternalInductance: false },
  ];
  for (const conductor of models) {
    const line = createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor, dielectric: { model: 'none' } });
    const r1 = rlgcAt(line, 1e9).R;
    near(rlgcAt(line, 4e9).R / r1, 2, 1e-13, `${conductor.model} R'`);
    near(rlgcAt(line, 16e9).R / r1, 4, 1e-13);
    // alpha/sqrt(f) is constant to second order in the (small) loss
    const k1 = propagationAt(line, 1e9).alphaDbPerCmPerSqrtGhz;
    const k2 = propagationAt(line, 4e9).alphaDbPerCmPerSqrtGhz;
    near(k1, k2, 2e-4, `${conductor.model} dB/cm/sqrt(GHz)`);
  }
  // explicit values: perimeter model R' = R_s (1/Ps + 1/Pr); rprime_reference returns the input at f_ref
  const per = createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor: models[1], dielectric: { model: 'none' } });
  near(rlgcAt(per, F_TEST).R, surfaceResistanceOhm(F_TEST, SIGMA_TEST) * (1 / 5e-3 + 1 / 8e-3), 1e-13);
  const ref = createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor: models[2], dielectric: { model: 'none' } });
  near(rlgcAt(ref, 1e9).R, 5, 1e-15);
});

test('conductor loss alpha = R\'/(2 Z0) for a conductor-only line, and internal inductance adds R\'/omega', () => {
  const R0 = 5; // Ohm/m at 1 GHz
  const mk = (internal) => createRfLine({
    cPul: C_TEST, lPul: L_TEST,
    conductor: { model: 'rprime_reference', rPulRefOhmPerM: R0, fRefHz: 1e9, includeInternalInductance: internal },
    dielectric: { model: 'none' },
  });
  const p = propagationAt(mk(false), 1e9);
  near(p.alphaNpPerM, R0 / (2 * Math.sqrt(L_TEST / C_TEST)), 1e-4, 'R/(2 Z0)');
  const w = 2 * Math.PI * 1e9;
  near(rlgcAt(mk(true), 1e9).L, L_TEST + R0 / w, 1e-14, 'L_int = R\'/omega');
  assert.ok(propagationAt(mk(true), 1e9).nRf > p.nRf, 'internal inductance slows the wave');
});

test('unit conversions: dB/cm <-> Np/m round trips, 20 log10(e), GHz <-> Hz, dB/cm/sqrt(GHz), signed matched S21', () => {
  near(NEPER_TO_DB, 8.685889638065037, 1e-15);
  near(npPerMToDbPerCm(1), 0.08685889638065037, 1e-15);
  near(dbPerCmToNpPerM(1), 11.512925464970229, 1e-15);
  for (const a of [1e-6, 0.3, 17, 250]) {
    near(dbPerCmToNpPerM(npPerMToDbPerCm(a)), a, 1e-14);
    near(npPerMToDbPerCm(dbPerCmToNpPerM(a)), a, 1e-14);
  }
  assert.equal(ghzToHz(67), 6.7e10);
  near(hzToGhz(ghzToHz(0.123)), 0.123, 1e-15);
  const p = propagationAt(lossy(0.02, 0.01), 40e9);
  near(p.alphaDbPerCm, npPerMToDbPerCm(p.alphaNpPerM), 1e-15);
  near(p.alphaDbPerCmPerSqrtGhz, p.alphaDbPerCm / Math.sqrt(40), 1e-15);
  assert.equal(p.fGhz, 40);
  // S21 of a matched 10 mm line with 2 dB/cm of power-loss: -2 dB/cm * 1 cm = -2 dB
  near(matchedS21Db(dbPerCmToNpPerM(2), 0.01), -2, 1e-13);
  assert.throws(() => matchedS21Db(-1, 1), /alpha/);
  // 1 Np/m field attenuation is 2 Np/m power attenuation = 8.686 dB/m
  near(npPerMToDbPerCm(1) * 100, 10 * Math.log10(Math.exp(2)), 1e-14);
  const sw = sweepGhz(lossy(0.01, 0.01), linspaceGhz(1, 5, 5));
  assert.deepEqual(sw.map((x) => x.fGhz), [1, 2, 3, 4, 5]);
  assert.throws(() => sweepGhz(lossless(), [0]), /frequency/);
  assert.throws(() => propagationAt(lossless(), 0), /frequency/);
});

test('paper attenuation is an input: exact alpha reproduction, labelled, interpolated, never extrapolated, exclusive', () => {
  const table = { source: 'paper_table', citation: 'test table, not a paper', fGhz: [1, 10, 100], alphaDbPerCm: [0.5, 1.5, 5] };
  const line = createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: table });
  for (const [f, a] of [[1, 0.5], [10, 1.5], [100, 5]]) {
    const p = propagationAt(line, f * 1e9);
    near(p.alphaDbPerCm, a, 1e-12, `alpha at ${f} GHz`);
    assert.equal(p.lossSource, 'paper_input');
    assert.equal(p.independentPrediction, false);
    assert.equal(p.gSPerM, 0);
    assert.ok(p.z0.re > 0);
  }
  near(propagationAt(line, 5.5e9).alphaDbPerCm, 1.0, 1e-12, 'linear interpolation in f');
  assert.throws(() => propagationAt(line, 0.5e9), /outside the paper table range/);
  assert.throws(() => propagationAt(line, 200e9), /outside the paper table range/);
  // a model line is labelled as a model prediction
  const m = propagationAt(lossy(0.01, 0.01), F_TEST);
  assert.equal(m.lossSource, 'model');
  assert.equal(m.independentPrediction, true);
  // power law: alpha = alpha0 sqrt(f_GHz) with alpha0 in dB/cm/sqrt(GHz)
  const law = createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: { source: 'paper_law', citation: 'test law', alpha0DbPerCmPerSqrtGhz: 0.3 } });
  near(propagationAt(law, 25e9).alphaDbPerCm, 0.3 * 5, 1e-12);
  near(propagationAt(law, 25e9).alphaDbPerCmPerSqrtGhz, 0.3, 1e-12);
  // exclusivity and labelling are enforced
  assert.throws(() => createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: table, conductor: { model: 'none' } }), /double count/);
  assert.throws(() => createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: { ...table, citation: '' } }), /citation/);
  assert.throws(() => createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: { ...table, source: 'model' } }), /paper_table/);
  assert.throws(() => createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: { ...table, fGhz: [1, 1, 100] } }), /increasing/);
  assert.throws(() => createRfLine({ cPul: C_TEST, lPul: L_TEST, paperAttenuation: { ...table, alphaDbPerCm: [1, 2] } }), /equal-length/);
});

test('missing or invalid loss inputs throw; nothing defaults to a material value', () => {
  const base = { cPul: C_TEST, lPul: L_TEST };
  const none = { model: 'none' };
  assert.throws(() => createRfLine({ ...base, dielectric: none }), /conductor model is required/);
  assert.throws(() => createRfLine({ ...base, conductor: none }), /dielectric model is required/);
  assert.throws(() => createRfLine({ ...base, conductor: { model: 'surface_resistance_perimeter', signalPerimeterM: 1e-6, returnPerimeterM: 1e-6, perimetersCoverCarryingSurfaces: true, includeInternalInductance: false }, dielectric: none }), /sigmaSm/);
  assert.throws(() => createRfLine({ ...base, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: SIGMA_TEST, kPerM: 1e6 }, dielectric: none }), /includeInternalInductance/);
  assert.throws(() => createRfLine({ ...base, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: 0, kPerM: 1e6, includeInternalInductance: false }, dielectric: none }), /sigma/);
  assert.throws(() => createRfLine({ ...base, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: SIGMA_TEST, includeInternalInductance: false }, dielectric: none }), /kPerM/);
  assert.throws(() => createRfLine({ ...base, conductor: { model: 'copper' }, dielectric: none }), /unknown conductor.model/);
  assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'uniform' } }), /tanDelta/);
  assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'uniform', tanDelta: -1e-3 } }), /tanDelta/);
  assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'regions', regions: [{ energyFraction: 1 }] } }), /unknown loss is not zero/);
  assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'regions', regions: [{ energyFraction: 0.5, tanDelta: 0 }] } }), /sum to 1/);
  assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'regions', regions: [{ energyFraction: 1, sigmaSm: 1 }] } }), /epsR/);
  assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'tan' } }), /unknown dielectric.model/);
  assert.throws(() => createRfLine({ cPul: C_TEST, conductor: none, dielectric: none }), /c0Pul or lPul/);
  assert.throws(() => createRfLine({ cPul: -1, lPul: L_TEST, conductor: none, dielectric: none }), /cPul/);
  assert.throws(() => createRfLine({ cPul: C_TEST, c0Pul: 1e-11, lPul: 1e-6, conductor: none, dielectric: none }), /inconsistent/);
  assert.throws(() => createRfLine(null), /spec/);
  assert.throws(() => skinDepthM(1e9, undefined), /sigma/);
  assert.throws(() => lPulFromC0(0), /C0/);
  assert.throws(() => lineParamsFromMetrics({}), /c_pul_pf_per_m/);
  assert.throws(() => dielectricFromRegions({ regions: null }, {}), /not available/);
  assert.throws(() => dielectricFromRegions({ regions: [{ name: 'r', material: 'x', energyFraction: 1 }] }, {}), /no loss tangent supplied for material "x"/);
  // conductor thickness below 3 skin depths is flagged on every evaluation
  const thin = createRfLine({ ...base, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: SIGMA_TEST, kPerM: 1e6, thicknessM: 10e-6, includeInternalInductance: false }, dielectric: none });
  assert.ok(propagationAt(thin, 1e6).warnings.includes('conductor_thickness_below_3_skin_depths_surface_resistance_invalid'));
  assert.equal(propagationAt(thin, 1e6).warnings.length, 1);
  assert.equal(propagationAt(thin, 1e12).warnings.length, 0);
});

test('conductivity-loss region: tan delta = sigma / (omega eps0 eps_r), participation weighted', () => {
  const s = 0.01; // S/m, illustrative
  const eps = 11.7; // illustrative
  const line = createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor: { model: 'none' }, dielectric: { model: 'regions', regions: [{ energyFraction: 0.3, sigmaSm: s, epsR: eps }, { energyFraction: 0.7, tanDelta: 0 }] } });
  for (const f of [1e8, 1e10]) {
    near(rlgcAt(line, f).G, 2 * Math.PI * f * C_TEST * 0.3 * (s / (2 * Math.PI * f * EPS0 * eps)), 1e-13);
  }
});

// ---- tests against real E1 section results ----------------------------------------------------

function platesGeom({ regions, left = [-1, -0.9], right = [0.9, 1] }) {
  return geom({
    domain: { x: [-1, 1], y: [-1, 1] },
    regions,
    electrodes: [
      { name: 'left', weight: 0, poly: rect(left[0], left[1], -1, 1) },
      { name: 'right', weight: 1, poly: rect(right[0], right[1], -1, 1) },
    ],
    mesh: { max_edge_um: 0.25, electrode_edge_um: 0.05, electrode_face_um: 0.25 },
  });
}
const solvePlates = (g, materials) => {
  const sec = section(g);
  return { sec, es: solveElectrostatics(sec, { resolvedMaterials: mats(materials) }) };
};

test('E1 parallel plates (eps_r = 4): adapter output reproduces analytic Z0, n_rf, L\', and homogeneous dielectric loss', () => {
  const g = platesGeom({ regions: [{ name: 'dielectric', material: 'dielectric', poly: rect(-1, 1, -1, 1) }] });
  const { sec, es } = solvePlates(g, { dielectric: { eps_r: 4 } });
  const params = lineParamsFromElectrostatics(es, sec);
  const c0 = (EPS0 * 2) / 1.8; // analytic, width 2 um, gap 1.8 um
  near(params.cPul, 4 * c0, 1e-8, 'C\'');
  near(params.c0Pul, c0, 1e-8, 'C0\'');
  near(params.lPul, (MU0 * 1.8) / 2, 1e-8, 'L\'');
  assert.equal(params.regions.length, 1);
  near(params.regions[0].energyFraction, 1, 1e-10, 'homogeneous participation');
  const tan = 2e-4; // illustrative test input
  const dielectric = dielectricFromRegions(params, { dielectric: tan });
  const line = createRfLine({ ...params, conductor: { model: 'none' }, dielectric });
  const p = propagationAt(line, F_TEST);
  const p0 = propagationAt(createRfLine({ ...params, conductor: { model: 'none' }, dielectric: { model: 'none' } }), F_TEST);
  near(p0.nRf, 2, 1e-8, 'n_rf');
  near(p0.nRf, es.nRf, 1e-12, 'matches E1 n_rf');
  near(p0.z0.re, es.z0, 1e-12, 'matches E1 Z0');
  near(p0.z0.re, (1.8 / 2) * Math.sqrt(MU0 / EPS0) / 2, 1e-8, 'analytic Z0');
  near(p.nRf, 2, 1e-6, 'loss shifts beta only at O(tan^2)');
  near(p.alphaNpPerM, ((Math.PI * F_TEST) / (C_LIGHT / 2)) * tan, 1e-6, 'alpha = pi f tan(delta) / v');
});

test('E1 two-slab plates: energy participation p_A = (d/eps_A)/(d/eps_A + d/eps_B) weights tan delta in G\'', () => {
  const regions = [
    { name: 'slab_a', material: 'a', poly: rect(-1, 0, -1, 1) },
    { name: 'slab_b', material: 'b', poly: rect(0, 1, -1, 1) },
  ];
  const { sec, es } = solvePlates(platesGeom({ regions }), { a: { eps_r: 4 }, b: { eps_r: 1 } });
  const params = lineParamsFromElectrostatics(es, sec);
  const pA = 0.25 / 1.25; // equal gap thickness 0.9 um each, field normal to the interface (D continuous)
  near(params.regions[0].energyFraction, pA, 1e-6, 'p_A');
  near(params.regions[0].energyFraction + params.regions[1].energyFraction, 1, 1e-12);
  const tanA = 0.01; // illustrative test input
  const line = createRfLine({ ...params, conductor: { model: 'none' }, dielectric: dielectricFromRegions(params, { a: tanA, b: 0 }) });
  near(rlgcAt(line, F_TEST).G, W * params.cPul * pA * tanA, 1e-6, "G'");
  // series capacitance of the two slabs: C' = eps0 w / (d/4 + d/1)
  near(params.cPul, (EPS0 * 2) / (0.9 / 4 + 0.9), 1e-6, "C'");
  // a participating region with no declared loss tangent is an error, even a vacuum-like one
  assert.throws(() => dielectricFromRegions(params, { a: tanA }), /material "b"/);
});

test('E1 runner metrics adapter (fixture) agrees with the full-result adapter; uniform dielectric loss only', () => {
  const text = readFileSync(new URL('./fixtures/parallel-plates.yaml', import.meta.url), 'utf8');
  const r = runCrossSection(text);
  const params = lineParamsFromMetrics(r.metrics);
  assert.equal(params.regions, null);
  near(params.cPul, 4 * (EPS0 * 2) / 1.8, 1e-8);
  const p = propagationAt(createRfLine({ ...params, conductor: { model: 'none' }, dielectric: { model: 'none' } }), F_TEST);
  near(p.nRf, r.metrics.n_rf, 1e-8);
  near(p.z0.re, r.metrics.z0_ohm, 1e-8);
  const lossyLine = createRfLine({ ...params, conductor: { model: 'none' }, dielectric: { model: 'uniform', tanDelta: 1e-3 } });
  near(propagationAt(lossyLine, F_TEST).alphaNpPerM, (Math.PI * F_TEST / (C_LIGHT / 2)) * 1e-3, 1e-6, 'alpha = pi f tan(delta) / v');
  assert.throws(() => dielectricFromRegions(params, { dielectric: 0 }), /not available/);
});

test('E1 plates: geometry-factor conductor loss R\' = 2 R_s / w, and the perimeter estimate is a lower bound', () => {
  const g = platesGeom({ regions: [{ name: 'dielectric', material: 'dielectric', poly: rect(-1, 1, -1, 1) }] });
  const { sec, es } = solvePlates(g, { dielectric: { eps_r: 4 } });
  const params = lineParamsFromElectrostatics(es, sec);
  const w = 2e-6;
  const rs = surfaceResistanceOhm(F_TEST, SIGMA_TEST);
  const geo = createRfLine({ ...params, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: SIGMA_TEST, kPerM: 2 / w, includeInternalInductance: false }, dielectric: { model: 'none' } });
  const pg = propagationAt(geo, F_TEST);
  near(pg.rOhmPerM, (2 * rs) / w, 1e-13);
  const fHigh = 1e12; // loss/omega L' small enough for the low-loss form to hold to 5e-4
  const ph = propagationAt(geo, fHigh);
  near(ph.alphaNpPerM, ph.rOhmPerM / (2 * es.z0), 5e-4, 'alpha = R/(2 Z0)');
  // perimeter helper: each plate is 0.1 x 2 um, perimeter 4.2 um
  const per = electrodePerimetersM(sec);
  assert.deepEqual(per.map((x) => x.name), ['left', 'right']);
  near(per[0].perimeterM, 4.2e-6, 1e-12);
  const est = createRfLine({ ...params, conductor: { model: 'surface_resistance_perimeter', sigmaSm: SIGMA_TEST, signalPerimeterM: per[1].perimeterM, returnPerimeterM: per[0].perimeterM, perimetersCoverCarryingSurfaces: true, includeInternalInductance: false }, dielectric: { model: 'none' } });
  const pe = propagationAt(est, F_TEST);
  assert.ok(pe.rOhmPerM < pg.rOhmPerM, 'uniform-perimeter estimate must not exceed the true plate value (Cauchy-Schwarz bound)');
  near(pe.rOhmPerM, (2 * rs) / 4.2e-6, 1e-12);
});

test('Wheeler incremental inductance with two E1 solves reproduces R\' = 2 R_s / w for parallel plates', () => {
  const sigma = 1e9; // illustrative, chosen so delta/2 is smaller than the 0.1 um plate thickness
  const f = F_TEST;
  const delta = skinDepthM(f, sigma);
  assert.ok(delta / 2 < 0.1e-6);
  const dUm = (delta * 1e6) / 2;
  const reg = [{ name: 'dielectric', material: 'dielectric', poly: rect(-1, 1, -1, 1) }];
  const nominal = solvePlates(platesGeom({ regions: reg }), { dielectric: { eps_r: 4 } }).es;
  // recess every current-carrying (gap-facing) surface by delta/2 into the metal
  const recessed = solvePlates(platesGeom({ regions: reg, left: [-1, -0.9 - dUm], right: [0.9 + dUm, 1] }), { dielectric: { eps_r: 4 } }).es;
  const rW = wheelerRPrime(f, nominal.lPul, recessed.lPul);
  near(rW, (2 * surfaceResistanceOhm(f, sigma)) / 2e-6, 2e-5, "Wheeler R'");
  assert.throws(() => wheelerRPrime(f, 2e-7, 1e-7), /exceed/);
  near(lPulFromC0(nominal.c0Pul), nominal.lPul, 1e-15);
});

// ---- Q2 audit corrections (F7, F8, F10, F12) ---------------------------------------------------

test('F7: perimeter model requires an explicit coverage declaration and labels the bound condition in every result', () => {
  const base = { cPul: C_TEST, lPul: L_TEST, dielectric: { model: 'none' } };
  const cond = { model: 'surface_resistance_perimeter', sigmaSm: SIGMA_TEST, signalPerimeterM: 5e-3, returnPerimeterM: 8e-3, thicknessM: 10e-6, includeInternalInductance: false };
  assert.throws(() => createRfLine({ ...base, conductor: cond }), /perimetersCoverCarryingSurfaces/);
  assert.throws(() => createRfLine({ ...base, conductor: { ...cond, perimetersCoverCarryingSurfaces: 'yes' } }), /perimetersCoverCarryingSurfaces/);
  const yes = propagationAt(createRfLine({ ...base, conductor: { ...cond, perimetersCoverCarryingSurfaces: true } }), F_TEST);
  assert.ok(yes.lossLabels.includes('lower_bound_only_under_caller_declared_perimeter_coverage_not_an_estimate'));
  assert.ok(yes.lossLabels.includes('no_current_crowding'));
  const no = propagationAt(createRfLine({ ...base, conductor: { ...cond, perimetersCoverCarryingSurfaces: false } }), F_TEST);
  assert.ok(no.lossLabels.includes('perimeter_coverage_not_declared_estimate_is_not_a_bound'));
  assert.ok(!no.lossLabels.some((l) => l.startsWith('lower_bound')));
  assert.equal(no.rOhmPerM, yes.rOhmPerM, 'the declaration labels the result; it does not change R\'');
  assert.ok(propagationAt(lossless(), F_TEST).lossLabels.includes('lossless_by_declaration'));
});

test('F7: microstrip-like E1 section, perimeter estimate stays below the Wheeler R\' but is not an estimate of it', () => {
  const sigma = 1e9; // illustrative
  const f = F_TEST;
  const dUm = (skinDepthM(f, sigma) * 1e6) / 2;
  const mk = (recess) => {
    const d = recess ? dUm : 0;
    const regions = [
      { name: 'air', material: 'air', poly: rect(-8, 8, -0.5, 4) },
      { name: 'film', material: 'film', poly: rect(-8, 8, -d, 1) },
      ...(d ? [{ name: 'under_strip', material: 'film', poly: rect(-1 + d, 1 - d, 1, 1 + d) }] : []),
    ];
    const g = geom({
      domain: { x: [-8, 8], y: [-0.5, 4] }, regions,
      electrodes: [
        { name: 'ground', role: 'ground', weight: 0, poly: rect(-8, 8, -0.5, -d) },
        { name: 'strip', role: 'signal', weight: 1, poly: rect(-1 + d, 1 - d, 1 + d, 1.4 - d) },
      ],
      mesh: { max_edge_um: 0.5, electrode_edge_um: 0.04, electrode_face_um: 0.1 },
    });
    const sec = section(g);
    return { sec, es: solveElectrostatics(sec, { resolvedMaterials: mats({ air: { eps_r: 1 }, film: { eps_r: 4 } }) }) };
  };
  const nom = mk(false);
  const rec = mk(true);
  const rWheeler = wheelerRPrime(f, nom.es.lPul, rec.es.lPul);
  const per = electrodePerimetersM(nom.sec);
  const ps = per.find((x) => x.name === 'strip').perimeterM;
  const pg = per.find((x) => x.name === 'ground').perimeterM;
  const line = createRfLine({
    ...lineParamsFromElectrostatics(nom.es, nom.sec),
    conductor: { model: 'surface_resistance_perimeter', sigmaSm: sigma, signalPerimeterM: ps, returnPerimeterM: pg, perimetersCoverCarryingSurfaces: true, thicknessM: 0.4e-6, includeInternalInductance: false },
    dielectric: { model: 'none' },
  });
  const rPer = rlgcAt(line, f).R;
  assert.ok(rPer < rWheeler, `bound holds: ${rPer} < ${rWheeler}`);
  assert.ok(rWheeler / rPer > 1.5, `but it is far from the incremental-inductance value: ratio ${rWheeler / rPer}`);
});

test('F8: dielectric region rows are validated eagerly and ambiguity is rejected', () => {
  const mkD = (row, extra = []) => () => createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor: { model: 'none' }, dielectric: { model: 'regions', regions: [row, ...extra] } });
  assert.throws(mkD({ energyFraction: 1, tanDelta: 1e-3, sigmaSm: 1, epsR: 4 }), /ambiguous loss/);
  assert.throws(mkD({ energyFraction: 1, tanDelta: 1e-3, epsR: 4 }), /epsR is only meaningful with sigmaSm/);
  assert.throws(mkD({ energyFraction: 1, tanDelta: NaN }), /tanDelta/, 'NaN is rejected at construction, not at first evaluation');
  assert.throws(mkD({ energyFraction: 1, tanDelta: -1 }), /tanDelta/);
  assert.throws(mkD({ energyFraction: 1, sigmaSm: NaN, epsR: 4 }), /sigmaSm/);
  assert.throws(mkD({ energyFraction: 1, sigmaSm: 1, epsR: 0 }), /epsR/);
  assert.throws(mkD({ energyFraction: 1, sigmaSm: 1 }), /epsR/);
  assert.throws(mkD({ energyFraction: NaN, tanDelta: 0 }), /energyFraction/);
  assert.throws(mkD({ energyFraction: 1.5, tanDelta: 0 }, [{ energyFraction: 0, tanDelta: 0 }]), /at most 1/);
  assert.throws(mkD({ energyFraction: 1, tandelta: 0.1 }), /unsupported field "tandelta"/);
  assert.throws(mkD(null), /must be an object/);
  assert.throws(mkD({ name: 'r2', energyFraction: 1 }), /r2.*neither tanDelta nor sigmaSm/);
  assert.throws(() => dielectricFromRegions({ regions: [{ name: 'r', material: 'x', energyFraction: 1 }] }, { x: null }), /must be a number/);
  assert.throws(() => dielectricFromRegions({ regions: [{ name: 'r', material: 'x', energyFraction: 1 }] }, { x: [1] }), /must be a number/);
  // a valid mixed set still builds
  const ok = createRfLine({ cPul: C_TEST, lPul: L_TEST, conductor: { model: 'none' }, dielectric: { model: 'regions', regions: [{ energyFraction: 0.5, tanDelta: 0 }, { energyFraction: 0.5, sigmaSm: 0.1, epsR: 4 }] } });
  assert.ok(rlgcAt(ok, F_TEST).G > 0);
});

test('F10: omitted conductor thickness is a standing machine-readable warning for skin-effect models', () => {
  const mk = (thicknessM) => createRfLine({
    cPul: C_TEST, lPul: L_TEST, dielectric: { model: 'none' },
    conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: SIGMA_TEST, kPerM: 1e3, includeInternalInductance: false, ...(thicknessM ? { thicknessM } : {}) },
  });
  for (const f of [1e3, 1e9, 1e12]) {
    assert.deepEqual(propagationAt(mk(), f).warnings, ['conductor_thickness_not_checked_skin_effect_validity_unknown']);
  }
  assert.deepEqual(propagationAt(mk(10e-6), 1e12).warnings, []);
  assert.deepEqual(propagationAt(mk(10e-6), 1e6).warnings, ['conductor_thickness_below_3_skin_depths_surface_resistance_invalid']);
  // user-supplied R' scaling and lossless lines make no skin-depth claim
  assert.deepEqual(propagationAt(lossy(0.01, 0), F_TEST).warnings, []);
  assert.throws(() => mk(-1), /thicknessM/);
});

test('F12: Wheeler step check on E1 plates is linear in the recess scale and flags a non-linear (too-large) step', () => {
  const sigma = 1e9;
  const f = F_TEST;
  const dUm = (skinDepthM(f, sigma) * 1e6) / 2;
  const reg = [{ name: 'dielectric', material: 'dielectric', poly: rect(-1, 1, -1, 1) }];
  const solve = (scale) => solvePlates(platesGeom({ regions: reg, left: [-1, -0.9 - scale * dUm], right: [0.9 + scale * dUm, 1] }), { dielectric: { eps_r: 4 } }).es.lPul;
  const l0 = solve(0);
  const chk = wheelerStepCheck(f, l0, [0.25, 0.5, 1].map((scale) => ({ scale, lPul: solve(scale) })));
  assert.ok(chk.maxRelativeSpread < 5e-3, `spread ${chk.maxRelativeSpread}`);
  near(chk.rPrimeOhmPerM[2], (2 * surfaceResistanceOhm(f, sigma)) / 2e-6, 2e-5);
  // a synthetic nonlinear response is reported as spread
  const bad = wheelerStepCheck(f, 1e-6, [{ scale: 0.5, lPul: 1.1e-6 }, { scale: 1, lPul: 1.4e-6 }]);
  assert.ok(bad.maxRelativeSpread > 0.3);
  assert.throws(() => wheelerStepCheck(f, 1e-6, [{ scale: 1, lPul: 2e-6 }]), /at least two/);
  assert.throws(() => wheelerStepCheck(f, 1e-6, [{ scale: 1, lPul: 2e-6 }, { scale: 0, lPul: 2e-6 }]), /scale/);
  assert.throws(() => wheelerStepCheck(f, 1e-6, [{ scale: 1, lPul: 2e-6 }, { scale: 2, lPul: 1e-6 }]), /exceed/);
});
