// Independent numerical audit (Q2, scope E2 + E3), auditor claude-wave-2026-10-02, 2026-10-02.
// Every expected value below is derived here from first principles (explicit tensor expressions, closed forms, 1D slab
// transfer-condition roots, polar-form complex roots, complex series capacitance). The implementation under audit is only
// called, never copied. Inputs are illustrative round numbers, not material data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpticalModel, solveModesAt } from '../src/optics.mjs';
import { solveElectrostatics } from '../src/electrostatics.mjs';
import { eoOverlapArm, eoOverlapFromEngine, combineArms, uniformTriField, materialsPerTriangle, sampleFieldOnOpticalMesh } from '../src/eo-overlap.mjs';
import { labFromCrystal } from '../src/materials.mjs';
import { createRfLine, propagationAt, rlgcAt, lineParamsFromElectrostatics, dielectricFromRegions, surfaceResistanceOhm, wheelerRPrime, npPerMToDbPerCm } from '../src/rf-line.mjs';
import { geom, rect, mats, section, relErr } from './helpers.mjs';

const LAMBDA = 1.55;
const N_O = 2.2, N_E = 2.1;
const R = { r13: 10, r22: 4, r33: 30, r51: 25 }; // pm/V
const PM = 1e-12;
const EF = 1e4; // V/m, first-order regime

// ------------------------------------------------------------------------------------------------------------
// A1. Pockels sign, magnitude and frame, all six (cut, propagation) pairs, TE and TM, lab field along x and along y.
// Independent reference: crystal-frame impermeability change written out component by component (Weis-Gaylord 3m form),
// lab axes given as explicit crystal unit vectors (hand-derived from lab_x = cut x prop), exact first-order
// d_eps = -eps d_eta eps with eps diagonal along a crystal axis, so d_eps_aa = -eps_aa^2 (a^T d_eta a).
const AX = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1], '-x': [-1, 0, 0], '-y': [0, -1, 0], '-z': [0, 0, -1] };
// [lab x, lab y (= cut normal), lab z (= propagation)] in crystal coordinates; lab_x = cut x prop (right handed)
const FRAMES = {
  'x,y': ['z', 'x', 'y'],
  'x,z': ['-y', 'x', 'z'],
  'y,x': ['-z', 'y', 'x'],
  'y,z': ['x', 'y', 'z'],
  'z,x': ['y', 'z', 'x'],
  'z,y': ['-x', 'z', 'y'],
};
function deltaEtaCrystal(E) {
  const [E1, E2, E3] = E.map((v) => v * PM);
  const B1 = -R.r22 * E2 + R.r13 * E3, B2 = R.r22 * E2 + R.r13 * E3, B3 = R.r33 * E3;
  const B4 = R.r51 * E2, B5 = R.r51 * E1, B6 = -R.r22 * E1;
  return [[B1, B6, B5], [B6, B2, B4], [B5, B4, B3]];
}
const quad = (a, M) => a.reduce((s, ai, i) => s + a.reduce((t, aj, j) => t + ai * M[i][j] * aj, 0), 0);
const nOfAxis = (a) => (Math.abs(a[2]) === 1 ? N_E : N_O);

const crystalMat = (cut, propagation, rotation_deg = 0) => ({ crystal: { cut, propagation, rotation_deg }, n_o: N_O, n_e: N_E, eps_r: { perp: 40, par: 30 }, r_pm_per_v: R });
const H = 1.0;
function box(matCfg, pol) {
  const g = geom({ domain: { x: [0, 0.3], y: [-H / 2, H / 2] }, regions: [{ name: 'medium', material: 'medium', poly: rect(0, 0.3, -H / 2, H / 2) }],
    electrodes: [{ name: 'm', material: 'gold', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-H / 2, H / 2] } });
  const model = buildOpticalModel(section(g), mats({ medium: matCfg, gold: { conductor: true } }), { polarization: pol, lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.03, max_edge_um: 0.06 } });
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.ok(mode.converged);
  return { model, mode, nT: model.mesh.nTris };
}
function armOf({ model, mode, nT }, E) {
  return eoOverlapArm({ mesh: model.mesh, geo: model.geo, psi: mode.psi[0], polarization: model.polarization, form: mode.form, neff: mode.neff[0], lambdaUm: LAMBDA, lambda0Um: LAMBDA,
    triField: uniformTriField(nT, E), triMaterial: materialsPerTriangle(model) });
}

for (const [key, [axX, axY]] of Object.entries(FRAMES).map(([k, v]) => [k, [AX[v[0]], AX[v[1]]]])) {
  const [cut, prop] = key.split(',');
  test(`A1 Pockels delta n_eff, cut ${cut} propagation ${prop}: TE (lab x) and TM (lab y), lab field along x and y, matches independent tensor algebra`, () => {
    for (const pol of ['TE', 'TM']) {
      const s = box(crystalMat(cut, prop), pol);
      for (const [Ename, Edir] of [['x', [1, 0, 0]], ['y', [0, 1, 0]]]) {
        const E = Edir.map((v) => v * EF);
        const Ec = [0, 1, 2].map((i) => E[0] * axX[i] + E[1] * axY[i]); // E_crystal = sum_i E_lab,i * (lab axis i in crystal coords)
        const a = pol === 'TE' ? axX : axY;
        const eps = nOfAxis(a) ** 2;
        const dEps = -eps * eps * quad(a, deltaEtaCrystal(Ec));
        const neff = s.mode.neff[0];
        const expected = pol === 'TE' ? dEps / (2 * neff) : (neff * dEps) / (2 * eps);
        const got = armOf(s, E).dnEffPerV;
        if (Math.abs(expected) < 1e-20) assert.ok(Math.abs(got) < 1e-18, `${pol} E${Ename}: expected 0, got ${got}`);
        else assert.ok(relErr(got, expected) < 1e-10, `${pol} E${Ename}: got ${got} expected ${expected}`);
      }
    }
  });
}

test('A1b sign: positive r33*E lowers n_e: delta n = -(1/2) n_e^3 r33 E in the plane-wave limit (n/n_eff factor removed)', () => {
  const s = box(crystalMat('x', 'y'), 'TE');
  const got = armOf(s, [EF, 0, 0]).dnEffPerV;
  const planeWave = -0.5 * N_E ** 3 * R.r33 * PM * EF;
  assert.ok(relErr(got * s.mode.neff[0] / N_E, planeWave) < 1e-10);
});

// ------------------------------------------------------------------------------------------------------------
// A2. TM overlap against an independent 1D anisotropic slab solution (eps_y perturbed, eps_z fixed), non-uniform index.
// Slab: core |y| < d, n = 2.2 (isotropic optical, Pockels active, z-cut so lab y = crystal z), cladding 1.45.
// Exact 1D TM relation: (1/eps_z) H')' + (k0^2 - beta^2/eps_y) H = 0, H and H'/eps_z continuous.
function slabNeffTM({ d, epsYc, epsZc, epsCl, k0 }) {
  // parametrise by u = k_y d in (0, pi/2): beta^2 = eps_y (k0^2 - u^2 / (eps_z d^2)); gamma^2 = beta^2 - epsCl k0^2 (isotropic cladding)
  const beta2 = (u) => epsYc * (k0 * k0 - (u * u) / (epsZc * d * d));
  const uMaxGamma = d * Math.sqrt(epsZc * (k0 * k0 - (epsCl * k0 * k0) / epsYc)); // gamma = 0
  let lo = 1e-12, hi = Math.min(Math.PI / 2 - 1e-12, uMaxGamma - 1e-12);
  const res = (u) => (u / epsZc) * Math.tan(u) - (Math.sqrt(Math.max(beta2(u) - epsCl * k0 * k0, 0)) * d) / epsCl; // even-mode matching, times d
  for (let i = 0; i < 200; i++) {
    const mid = 0.5 * (lo + hi);
    if (res(mid) < 0) lo = mid; else hi = mid;
  }
  return Math.sqrt(beta2(0.5 * (lo + hi))) / k0;
}
test('A2 TM overlap in a non-uniform slab equals the finite difference of the independent anisotropic 1D slab solution', () => {
  const d = 0.3, nCore = 2.2, nClad = 1.45;
  const g = geom({ domain: { x: [0, 0.3], y: [-3, 3] }, regions: [{ name: 'clad', material: 'clad', poly: rect(0, 0.3, -3, 3) }, { name: 'core', material: 'core', poly: rect(0, 0.3, -d, d) }],
    electrodes: [{ name: 'm', material: 'gold', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-3, 3] } });
  const m = mats({ clad: { n: nClad, eps_r: 2 }, core: { crystal: { cut: 'z', propagation: 'y' }, n_o: nCore, n_e: nCore, eps_r: { perp: 40, par: 30 }, r_pm_per_v: R }, gold: { conductor: true } });
  const model = buildOpticalModel(section(g), m, { polarization: 'TM', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.01, max_edge_um: 0.08 } });
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.ok(mode.converged);
  const k0 = (2 * Math.PI) / LAMBDA;
  const exact0 = slabNeffTM({ d, epsYc: nCore ** 2, epsZc: nCore ** 2, epsCl: nClad ** 2, k0 });
  assert.ok(relErr(mode.neff[0], exact0) < 1e-3, `engine ${mode.neff[0]} vs exact slab ${exact0}`);
  // Pockels field only in the core, E_y = E (lab y = crystal z): d_eps_yy = -n^4 r33 E exactly to first order
  const E = 2e5; // V/m
  const nT = model.mesh.nTris;
  const f = new Float64Array(3 * nT);
  model.mesh.triRegion.forEach((ri, t) => { if (model.regions[ri].name === 'core') f[3 * t + 1] = E; });
  const o = eoOverlapArm({ mesh: model.mesh, geo: model.geo, psi: mode.psi[0], polarization: 'TM', form: 'H', neff: mode.neff[0], lambdaUm: LAMBDA, lambda0Um: LAMBDA, triField: f, triMaterial: materialsPerTriangle(model) });
  const dEps = -(nCore ** 4) * R.r33 * PM * E; // first order; use exact inverse for the FD
  const epsPlus = 1 / (1 / nCore ** 2 + R.r33 * PM * E), epsMinus = 1 / (1 / nCore ** 2 - R.r33 * PM * E);
  const fd = (slabNeffTM({ d, epsYc: epsPlus, epsZc: nCore ** 2, epsCl: nClad ** 2, k0 }) - slabNeffTM({ d, epsYc: epsMinus, epsZc: nCore ** 2, epsCl: nClad ** 2, k0 })) / 2;
  assert.ok(Math.abs(fd) > 1e-8);
  assert.ok(Math.abs(dEps) > 0);
  if (process.env.AUDIT_VERBOSE) console.log('A2', o.dnEffPerV, fd, relErr(o.dnEffPerV, fd));
  assert.ok(relErr(o.dnEffPerV, fd) < 5e-3, `overlap ${o.dnEffPerV} vs 1D FD ${fd}`);
});

// ------------------------------------------------------------------------------------------------------------
// A3. combineArms and V_pi: independent derivation. phi = k0 n L, delta_phi = phi_A - phi_B, |delta_phi| = pi.
test('A3 V_pi*L from the phase definition: solve |k0 L (dnA - dnB) V| = pi for V and compare', () => {
  const dnA = -1.9e-5, dnB = +1.95e-5; // per volt, illustrative
  const k0 = (2 * Math.PI) / (LAMBDA * 1e-6);
  const L = 3e-3;
  const vpi = Math.PI / (k0 * L * Math.abs(dnA - dnB)); // volts
  const c = combineArms({ armA: { dnEffPerV: dnA }, armB: { dnEffPerV: dnB }, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  assert.ok(relErr(c.vpiLVm / L, vpi) < 1e-14);
  assert.ok(relErr(c.vpiLVcm, 100 * vpi * L) < 1e-14);
  // absolute phase per volt per metre, and its consistency with V_pi*L: V_pi L = pi / (d(delta_phi)/dV per m)
  assert.ok(relErr(c.phaseDifferencePerVPerM, k0 * (dnA - dnB)) < 1e-14);
  assert.ok(relErr(Math.PI / Math.abs(c.phaseDifferencePerVPerM), c.vpiLVm) < 1e-14);
  const single = combineArms({ armA: { dnEffPerV: dnA }, armB: null, drive: 'single_arm', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  assert.ok(relErr(single.vpiLVm / L, Math.PI / (k0 * L * Math.abs(dnA))) < 1e-14);
});

// ------------------------------------------------------------------------------------------------------------
// A4. Electrostatic normalisation: full-structure C' for odd and even half domains against the parallel-plate closed form.
const EPS0 = 8.8541878128e-12;
function gsg(symmetry) {
  // domain [-1, 1] x [-1, 1] um, plates span the full height so C' is exactly eps0 eps h / gap per gap (Neumann top/bottom)
  const mirrorEven = symmetry === 'x_mirror_even';
  const electrodes = mirrorEven
    ? [{ name: 'gl', weight: 0, poly: rect(-1, -0.9, -1, 1) }, { name: 'sig', weight: 1, poly: rect(-0.1, 0.1, -1, 1) }, { name: 'gr', weight: 0, poly: rect(0.9, 1, -1, 1) }]
    : [{ name: 'gl', weight: 0, poly: rect(-1, -0.9, -1, 1) }, { name: 'sig', weight: 1, poly: rect(-0.1, 0.1, -1, 1) }, { name: 'gr', weight: 0, poly: rect(0.9, 1, -1, 1) }];
  const g = geom({ domain: { x: [-1, 1], y: [-1, 1] }, symmetry, mirror_x_um: 0, regions: [{ name: 'd', material: 'd', poly: rect(-1, 1, -1, 1) }], electrodes,
    mesh: { max_edge_um: 0.2, electrode_edge_um: 0.1, electrode_face_um: 0.2 } });
  return solveElectrostatics(section(g), { resolvedMaterials: mats({ d: { eps_r: 4 } }) });
}
test('A4 C\' is the FULL-structure capacitance to the full terminal voltage: GSG (two gaps in parallel), full domain and even half domain', () => {
  const analytic = 2 * (EPS0 * 4 * 2e-6) / 0.8e-6; // two 0.8 um gaps, plate height 2 um, V = 1 V across each
  const full = gsg('none');
  const half = gsg('x_mirror_even');
  assert.ok(relErr(full.cPul, analytic) < 1e-8, `${full.cPul} vs ${analytic}`);
  assert.ok(relErr(half.cPul, analytic) < 1e-8, `${half.cPul} vs ${analytic}`);
  assert.ok(relErr(full.capacitance.charge, full.capacitance.energy) < 1e-8);
  assert.ok(relErr(half.capacitance.charge, half.capacitance.energy) < 1e-8);
  // Z0 = V/I for the total signal current, L' = 1/(c^2 C0')
  assert.ok(relErr(full.z0, 1 / (299792458 * Math.sqrt(full.cPul * full.c0Pul))) < 1e-12);
});

// ------------------------------------------------------------------------------------------------------------
// A5. Field sampling across a dielectric interface: D continuity fixes E in each slab; the optical mesh must report it.
test('A5 sampled field per optical triangle equals the analytic piecewise-uniform field of a two-dielectric capacitor', () => {
  const g = geom({ domain: { x: [-1, 1], y: [-0.5, 0.5] }, regions: [{ name: 'a', material: 'a', poly: rect(-1, 0, -0.5, 0.5) }, { name: 'b', material: 'b', poly: rect(0, 1, -0.5, 0.5) }],
    electrodes: [{ name: 'l', weight: 0, poly: rect(-1, -0.9, -0.5, 0.5) }, { name: 'r', weight: 1, poly: rect(0.9, 1, -0.5, 0.5) }],
    mesh: { max_edge_um: 0.2, electrode_edge_um: 0.1, electrode_face_um: 0.2 }, optical_window: { x: [-0.8, 0.8], y: [-0.4, 0.4] } });
  const m = mats({ a: { eps_r: 4, n: 2 }, b: { eps_r: 1, n: 1.5 }, gold: { conductor: true } });
  const sec = section(g);
  const es = solveElectrostatics(sec, { resolvedMaterials: mats({ a: { eps_r: 4, n: 2 }, b: { eps_r: 1, n: 1.5 }, gold: { conductor: true } }) });
  const model = buildOpticalModel(sec, mats({ a: { eps_r: 4, n: 2 }, b: { eps_r: 1, n: 1.5 }, gold: { conductor: true } }), { polarization: 'TE', lambda0Um: LAMBDA, window: { x: [-0.8, 0.8], y: [-0.4, 0.4] }, boundary: { left: 'neumann', right: 'neumann' } });
  const f = sampleFieldOnOpticalMesh(es, model);
  // D continuity: 4 E_a = 1 E_b; E_a (0.9) + E_b (0.9) = 1 V (gaps: a from -0.9 to 0, b from 0 to 0.9)
  const Ea = -1 / (0.9e-6 * (1 + 4)), Eb = 4 * Ea; // phi increases with x -> E_x negative
  let nA = 0, nB = 0;
  const { mesh } = model;
  for (let t = 0; t < mesh.nTris; t++) {
    const xc = (mesh.x[mesh.tri[3 * t]] + mesh.x[mesh.tri[3 * t + 1]] + mesh.x[mesh.tri[3 * t + 2]]) / 3;
    const want = xc < 0 ? Ea : Eb;
    assert.ok(relErr(f[3 * t], want) < 1e-6, `tri ${t} x ${xc}: ${f[3 * t]} vs ${want}`);
    assert.equal(f[3 * t + 2], 0);
    if (xc < 0) nA++; else nB++;
  }
  assert.ok(nA > 0 && nB > 0);
  void m;
});

// ------------------------------------------------------------------------------------------------------------
// B1. RLGC: independent polar-form complex roots (atan2 branch), passivity, and the exp(+j w t) sign convention
// Z' gamma^-1 = Z0 identity, power decays along +z.
test('B1 gamma and Z0 against polar-form roots over all quadrants of Z Y, plus gamma Z0 = Z and Z0 / gamma = 1/Y', () => {
  const L = 3e-7, C = 1.2e-10;
  for (const f of [1e6, 1e9, 1e10, 1e11, 1e12]) {
    for (const [r, g] of [[0, 0], [1e-3, 0], [0, 1e-3], [0.2, 0.05], [3, 0.01], [0.01, 3], [20, 20]]) {
      const w = 2 * Math.PI * f;
      const Rr = r * w * L, G = g * w * C;
      const line = createRfLine({ cPul: C, lPul: L, conductor: Rr > 0 ? { model: 'rprime_reference', rPulRefOhmPerM: Rr, fRefHz: f, includeInternalInductance: false } : { model: 'none' }, dielectric: g > 0 ? { model: 'uniform', tanDelta: g } : { model: 'none' } });
      const p = propagationAt(line, f);
      // polar reference
      const Z = [Rr, w * L], Y = [G, w * C];
      const zy = [Z[0] * Y[0] - Z[1] * Y[1], Z[0] * Y[1] + Z[1] * Y[0]];
      const mag = Math.hypot(...zy), arg = Math.atan2(zy[1], zy[0]);
      const gam = [Math.sqrt(mag) * Math.cos(arg / 2), Math.sqrt(mag) * Math.sin(arg / 2)];
      assert.ok(Math.abs(p.gamma.re - gam[0]) <= 1e-12 * Math.hypot(...gam) + 1e-30, `alpha f=${f} r=${r} g=${g}`);
      assert.ok(relErr(p.gamma.im, gam[1]) < 1e-12);
      assert.ok(p.gamma.re >= 0 && p.gamma.im > 0 && p.z0.re > 0);
      const zq = [(Z[0] * Y[0] + Z[1] * Y[1]) / (Y[0] ** 2 + Y[1] ** 2), (Z[1] * Y[0] - Z[0] * Y[1]) / (Y[0] ** 2 + Y[1] ** 2)];
      const zm = Math.hypot(...zq), za = Math.atan2(zq[1], zq[0]);
      assert.ok(relErr(p.z0.re, Math.sqrt(zm) * Math.cos(za / 2)) < 1e-12);
      assert.ok(Math.abs(p.z0.im - Math.sqrt(zm) * Math.sin(za / 2)) <= 1e-12 * Math.sqrt(zm));
      // telegrapher identity for a wave exp(-gamma z): -dV/dz = Z I, I = V / Z0  =>  gamma Z0 = Z
      const gz = [p.gamma.re * p.z0.re - p.gamma.im * p.z0.im, p.gamma.re * p.z0.im + p.gamma.im * p.z0.re];
      assert.ok(Math.hypot(gz[0] - Z[0], gz[1] - Z[1]) <= 1e-12 * Math.hypot(...Z));
      // time-averaged forward power Re(V I*)/2 = |V|^2 Re(1/Z0*)/2 > 0 and decays as exp(-2 alpha z)
      assert.ok(p.z0.re > 0);
    }
  }
});

// B2. Dielectric loss weighting: exact complex series capacitance of a two-slab capacitor versus G' = w C' sum p_i tan(delta_i)
test('B2 energy-participation dielectric loss agrees with the exact complex series capacitance (exp(+jwt), eps* = eps (1 - j tan d))', () => {
  const g = geom({ domain: { x: [-1, 1], y: [-1, 1] }, regions: [{ name: 'a', material: 'a', poly: rect(-1, 0, -1, 1) }, { name: 'b', material: 'b', poly: rect(0, 1, -1, 1) }],
    electrodes: [{ name: 'l', weight: 0, poly: rect(-1, -0.9, -1, 1) }, { name: 'r', weight: 1, poly: rect(0.9, 1, -1, 1) }], mesh: { max_edge_um: 0.25, electrode_edge_um: 0.1, electrode_face_um: 0.25 } });
  const sec = section(g);
  // a is anisotropic LN-like (field along lab x sees par = 28), b is a different dielectric
  const mm = mats({ a: { crystal: { cut: 'x', propagation: 'y' }, eps_r: { perp: 43, par: 28 } }, b: { eps_r: 2 } });
  const es = solveElectrostatics(sec, { resolvedMaterials: mm });
  const params = lineParamsFromElectrostatics(es, sec);
  const tanA = 0.02, tanB = 0.005;
  const line = createRfLine({ ...params, conductor: { model: 'none' }, dielectric: dielectricFromRegions(params, { a: tanA, b: tanB }) });
  const f = 10e9, w = 2 * Math.PI * f;
  const p = rlgcAt(line, f);
  // exact: Y' = j w eps0 (h) / (da / eps_a* + db / eps_b*), h = 2 um, da = db = 0.9 um
  const ea = [28, -28 * tanA], eb = [2, -2 * tanB];
  const inv = (c) => { const d = c[0] ** 2 + c[1] ** 2; return [c[0] / d, -c[1] / d]; };
  const ia = inv(ea), ib = inv(eb);
  const s = [0.9 * ia[0] + 0.9 * ib[0], 0.9 * ia[1] + 0.9 * ib[1]]; // (d/eps*) sum, um
  const yc = inv(s); // eps0 h * this = Y'/(j w) with h = 2: (G' + j w C')/(j w) = eps0 * 2 * yc
  const Cexact = EPS0 * 2 * yc[0], Gexact = -w * EPS0 * 2 * yc[1] * -1; // Y' = j w (C_re + j C_im) -> G' = -w C_im
  const Gex = -w * (EPS0 * 2 * yc[1]);
  void Gexact;
  if (process.env.AUDIT_VERBOSE) console.log('B2', p.C, Cexact, p.G, Gex);
  assert.ok(relErr(p.C, Cexact) < 1e-3, `C' ${p.C} vs ${Cexact}`); // tan d^2 level difference only
  assert.ok(relErr(p.G, Gex) < 5e-3, `G' ${p.G} vs ${Gex}`); // first order in tan d
});

// B3. Wheeler incremental-inductance rule and the perimeter lower bound on a NON-uniform current distribution: strip over a ground plane
test('B3 microstrip-like section: Wheeler R\' (two E1 solves) is not below the uniform-perimeter estimate (Cauchy-Schwarz lower bound)', () => {
  const sigma = 1e9, f = 10e9;
  const delta = 1 / Math.sqrt(Math.PI * f * 1.25663706212e-6 * sigma); // m
  const dUm = (delta * 1e6) / 2;
  // geometry: ground plane occupies y in [-0.5, 0] (top surface y = 0), substrate 0..1 um, strip y in [1, 1.4], width 2 um.
  const build = (rec) => {
    const w = 2, t = 0.4, h = 1;
    const g = geom({ domain: { x: [-8, 8], y: [-0.5, 6] },
      regions: [{ name: 'air', material: 'air', poly: rect(-8, 8, -0.5, 6) }, { name: 'sub', material: 'sub', poly: rect(-8, 8, -0.5, h) }],
      electrodes: [{ name: 'gnd', weight: 0, poly: rect(-8, 8, -0.5, -rec) }, { name: 'sig', weight: 1, poly: rect(-w / 2 + rec, w / 2 - rec, h + rec, h + t - rec) }],
      mesh: { max_edge_um: 1.0, electrode_edge_um: 0.02, electrode_face_um: 0.1 } });
    const sec = section(g);
    const es = solveElectrostatics(sec, { resolvedMaterials: mats({ air: { eps_r: 1 }, sub: { eps_r: 4 } }) });
    return { sec, es };
  };
  const nom = build(0), rec = build(dUm);
  const rW = wheelerRPrime(f, nom.es.lPul, rec.es.lPul);
  const per = nom.sec.electrodes.map((e) => { let p = 0; for (let i = 0; i < e.poly.length; i++) { const a = e.poly[i], b = e.poly[(i + 1) % e.poly.length]; p += Math.hypot(b[0] - a[0], b[1] - a[1]); } return p * 1e-6; });
  const rs = surfaceResistanceOhm(f, sigma);
  const rPer = rs * (1 / per[1] + 1 / per[0]);
  if (process.env.AUDIT_VERBOSE) console.log('B3', rW, rPer, rW / rPer);
  assert.ok(rW > rPer, `Wheeler ${rW} vs perimeter ${rPer}`);
  // the true loop current crowds under the strip: Wheeler/perimeter ratio documents how weak the bound is for this geometry
  assert.ok(rW / rPer > 1.5, `ratio ${rW / rPer}`);
});

// B4. unit conversions: field-amplitude Np/m -> dB/cm, and failure behaviour on NaN / non-finite / zero inputs
test('B4 dB conversion 20 log10 e and failure behaviour: NaN, Infinity, zero frequency, negative or missing inputs throw', () => {
  assert.ok(relErr(npPerMToDbPerCm(100), 8.685889638065037) < 1e-15); // 100 Np/m = 1 Np/cm = 8.6859 dB/cm
  const base = { cPul: 1.2e-10, lPul: 3e-7 };
  const none = { model: 'none' };
  for (const bad of [NaN, Infinity, -1, 0, undefined, null, '1e-10']) assert.throws(() => createRfLine({ ...base, cPul: bad, conductor: none, dielectric: none }), /cPul/, `cPul ${bad}`);
  for (const bad of [NaN, Infinity, -1]) assert.throws(() => createRfLine({ ...base, conductor: none, dielectric: { model: 'uniform', tanDelta: bad } }), /tanDelta/, `tanDelta ${bad}`);
  const line = createRfLine({ ...base, conductor: none, dielectric: none });
  for (const bad of [0, NaN, -1e9, Infinity]) {
    if (Number.isFinite(bad) && bad > 0) continue;
    assert.throws(() => propagationAt(line, bad), /frequency/, `f ${bad}`);
  }
});


// ------------------------------------------------------------------------------------------------------------
// A6. End-to-end VERTICAL field (z-cut, TM, E_y component of the electrostatic sampling) and PEC-scalar metal chain.
// Horizontal plates y = -0.4 and +0.4 um (0 V / 1 V), z-cut y-propagation crystal in the gap. E_y = -1 V / 0.8 um.
const horizPlates = () => {
  const g = geom({ domain: { x: [-1, 1], y: [-0.5, 0.5] }, regions: [{ name: 'medium', material: 'medium', poly: rect(-1, 1, -0.5, 0.5) }],
    electrodes: [{ name: 'bot', weight: 0, poly: rect(-1, 1, -0.5, -0.4) }, { name: 'top', weight: 1, poly: rect(-1, 1, 0.4, 0.5) }],
    mesh: { max_edge_um: 0.2, electrode_edge_um: 0.1, electrode_face_um: 0.2 }, optical_window: { x: [-0.5, 0.5], y: [-0.4, 0.4] } });
  const m = mats({ medium: crystalMat('z', 'y'), gold: { conductor: true } });
  const sec = section(g);
  return { g, m, sec, es: solveElectrostatics(sec, { resolvedMaterials: m }) };
};
test('A6 vertical-field chain: sampled E_y = -V/gap (V/m), TM overlap = n_eff d_eps_yy / (2 eps_yy) with r33 and n_e', () => {
  const { sec, m, es } = horizPlates();
  const model = buildOpticalModel(sec, m, { polarization: 'TM', lambda0Um: LAMBDA, window: { x: [-0.5, 0.5], y: [-0.4, 0.4] }, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.03, max_edge_um: 0.08 } });
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.ok(mode.converged);
  const f = sampleFieldOnOpticalMesh(es, model);
  const Ey = -1 / 0.8e-6;
  for (let t = 0; t < model.mesh.nTris; t++) {
    assert.ok(relErr(f[3 * t + 1], Ey) < 1e-6, `Ey ${f[3 * t + 1]} vs ${Ey}`);
    assert.ok(Math.abs(f[3 * t]) < 1e-3 * Math.abs(Ey));
  }
  const o = eoOverlapFromEngine({ es, model, mode, modeIndex: 0 });
  const dEps = -(N_E ** 4) * R.r33 * PM * Ey;
  assert.ok(relErr(o.dnEffPerV, (mode.neff[0] * dEps) / (2 * N_E ** 2)) < 1e-6, `${o.dnEffPerV}`);
});

test('A6b pec_scalar metal chain: TE between PEC plates, electrode footprint excluded from the overlap, uniform-field value reproduced', () => {
  const g = geom({ domain: { x: [-3, 3], y: [-0.6, 0.6] }, regions: [{ name: 'medium', material: 'medium', poly: rect(-3, 3, -0.6, 0.6) }],
    electrodes: [{ name: 'bot', weight: 0, poly: rect(-3, 3, -0.6, -0.4) }, { name: 'top', weight: 1, poly: rect(-3, 3, 0.4, 0.6) }],
    mesh: { max_edge_um: 0.3, electrode_edge_um: 0.1, electrode_face_um: 0.3 }, optical_window: { x: [-0.3, 0.3], y: [-0.6, 0.6] } });
  const m = mats({ medium: crystalMat('z', 'y'), gold: { conductor: true } });
  const sec = section(g);
  const es = solveElectrostatics(sec, { resolvedMaterials: m });
  const model = buildOpticalModel(sec, m, { polarization: 'TE', lambda0Um: LAMBDA, metal: 'pec_scalar', boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.03, max_edge_um: 0.08 } });
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.ok(mode.converged && mode.excluded.some((v) => v === 1));
  const o = eoOverlapFromEngine({ es, model, mode, modeIndex: 0 });
  const Ey = -1 / 0.8e-6;
  // TE (lab x = -crystal x, n_o): d(1/eps)_xx = r13 E_z(crystal) with crystal z = lab y
  const dEps = -(N_O ** 4) * R.r13 * PM * Ey;
  assert.ok(relErr(o.dnEffPerV, dEps / (2 * mode.neff[0])) < 1e-6, `${o.dnEffPerV} vs ${dEps / (2 * mode.neff[0])}`);
});

// ------------------------------------------------------------------------------------------------------------
// DEFECT-REVEALING tests (todo: they assert the CORRECT behaviour and currently fail; the suite stays green).

// fixed 2026-10-02 by E2 author
test('D1 eoOverlapFromEngine must not silently use an unconverged mode', () => {
  const { sec, m, es } = horizPlates();
  const model = buildOpticalModel(sec, m, { polarization: 'TE', lambda0Um: LAMBDA, window: { x: [-0.5, 0.5], y: [-0.4, 0.4] }, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.03, max_edge_um: 0.08 } });
  const bad = solveModesAt(model, LAMBDA, { numModes: 1, maxIter: 2 });
  assert.equal(bad.converged, false);
  assert.throws(() => eoOverlapFromEngine({ es, model, mode: bad, modeIndex: 0 }), /converge/);
});

// fixed 2026-10-02 by E2 author
test('D2 EO overlap results carry the scalar-optical and metal-policy labels of the mode they were computed from', () => {
  const g = geom({ domain: { x: [-3, 3], y: [-0.6, 0.6] }, regions: [{ name: 'medium', material: 'medium', poly: rect(-3, 3, -0.6, 0.6) }],
    electrodes: [{ name: 'bot', weight: 0, poly: rect(-3, 3, -0.6, -0.4) }, { name: 'top', weight: 1, poly: rect(-3, 3, 0.4, 0.6) }],
    mesh: { max_edge_um: 0.3, electrode_edge_um: 0.1, electrode_face_um: 0.3 }, optical_window: { x: [-0.3, 0.3], y: [-0.6, 0.6] } });
  const m = mats({ medium: crystalMat('z', 'y'), gold: { conductor: true } });
  const sec = section(g);
  const es = solveElectrostatics(sec, { resolvedMaterials: m });
  const model = buildOpticalModel(sec, m, { polarization: 'TE', lambda0Um: LAMBDA, metal: 'pec_scalar', boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.03, max_edge_um: 0.08 } });
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  const o = eoOverlapFromEngine({ es, model, mode, modeIndex: 0 });
  const text = JSON.stringify([o.assumptions, o.labels ?? null, o.metal ?? null]);
  assert.match(text, /scalar_optical_not_full_vector/);
  assert.match(text, /optical_metal_pec_scalar_approximation/);
});

// fixed 2026-10-07 by engine owner (DevLog-012 item 1, DevLog-007 P9 option b)
test('D3 rotation_deg is documented as a CCW rotation of the LAB frame about the propagation axis: lab x\' must move toward the film normal', () => {
  const th = 90;
  const A = labFromCrystal('x', 'y', th); // rows: lab axes in crystal coordinates; unrotated lab x = z, lab y (film normal) = x
  const unrotated = labFromCrystal('x', 'y', 0);
  const c = Math.cos((th * Math.PI) / 180), s = Math.sin((th * Math.PI) / 180);
  // CCW lab-frame rotation by th: x' = c x + s y  (lab y = film normal)
  const expectRow0 = [0, 1, 2].map((i) => c * unrotated[i] + s * unrotated[3 + i]);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(A[i] - expectRow0[i]) < 1e-12, `row0[${i}] ${A[i]} vs ${expectRow0[i]}`);
});

// fixed 2026-10-02 by E2 author
test('D4 quasi-TM mode of a uniaxial (LN-like, n_o != n_e) slab should match the exact anisotropic slab n_eff (eps_zz in the gradient term)', () => {
  const d = 0.3, nCl = 1.444, no = 2.211, ne = 2.138;
  const g = geom({ domain: { x: [0, 0.3], y: [-3, 3] }, regions: [{ name: 'clad', material: 'clad', poly: rect(0, 0.3, -3, 3) }, { name: 'core', material: 'core', poly: rect(0, 0.3, -d, d) }],
    electrodes: [{ name: 'm', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-3, 3] } });
  // z-cut, propagation y: lab y = crystal z (n_e), lab z = crystal y (n_o)
  const m = mats({ clad: { n: nCl, eps_r: 2 }, core: { crystal: { cut: 'z', propagation: 'y' }, n_o: no, n_e: ne, eps_r: { perp: 40, par: 30 } }, gold: { conductor: true } });
  const model = buildOpticalModel(section(g), m, { polarization: 'TM', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.01, max_edge_um: 0.08 } });
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  const exact = slabNeffTM({ d, epsYc: ne * ne, epsZc: no * no, epsCl: nCl * nCl, k0: (2 * Math.PI) / LAMBDA });
  assert.ok(Math.abs(mode.neff[0] - exact) < 1e-3, `engine ${mode.neff[0]} vs exact anisotropic slab ${exact}`);
});

// Scalar validity at VERTICAL dielectric walls (documented limitation O4, quantified here). A laterally stratified slab (core |x| < d,
// uniform in y) has exact closed forms: the field component normal to the walls (E_x) obeys D-continuity (slab "TM" relation, q = n_c^2/n_s^2)
// and the tangential one (E_y) obeys E-continuity (slab "TE" relation, q = 1). The engine TE form (psi = E_x, continuous psi) reproduces the
// q = 1 result and the TM form reproduces the q = n_c^2/n_s^2 result, i.e. the two labels are swapped at vertical walls.
function lateralSlabNeff(q, { nc, ns, d, lambda }) {
  const k0 = (2 * Math.PI) / lambda, V = k0 * d * Math.sqrt(nc * nc - ns * ns);
  let lo = 0, hi = Math.min(V, Math.PI / 2 - 1e-10);
  for (let i = 0; i < 100; i++) { const u = (lo + hi) / 2; if (u * Math.tan(u) > q * Math.sqrt(V * V - u * u)) hi = u; else lo = u; }
  return Math.sqrt(nc * nc - ((hi + lo) / (2 * k0 * d)) ** 2);
}
test('D5 quasi-TE / quasi-TM n_eff on a pure vertical-wall (laterally stratified) slab match the physical field components', { todo: 'Q2 finding F1: scalar forms are exact only at horizontal interfaces; error about 0.08 in n_eff here (swapped TE/TM)' }, () => {
  const nc = 2.2, ns = 1.45, d = 0.3;
  const solve = (pol) => {
    const g = geom({ domain: { x: [-3, 3], y: [0, 0.3] }, regions: [{ name: 'clad', material: 'clad', poly: rect(-3, 3, 0, 0.3) }, { name: 'core', material: 'core', poly: rect(-d, d, 0, 0.3) }],
      electrodes: [{ name: 'm', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [-3, 3], y: [0, 0.3] } });
    const model = buildOpticalModel(section(g), mats({ clad: { n: ns, eps_r: 2 }, core: { n: nc, eps_r: 4 }, gold: { conductor: true } }), { polarization: pol, lambda0Um: LAMBDA, boundary: { top: 'neumann', bottom: 'neumann' }, hints: { core_edge_um: 0.01, max_edge_um: 0.08 } });
    return solveModesAt(model, LAMBDA, { numModes: 1 }).neff[0];
  };
  const normalE = lateralSlabNeff((nc * nc) / (ns * ns), { nc, ns, d, lambda: LAMBDA }); // E_x normal to the walls = quasi-TE of this geometry
  const tangentialE = lateralSlabNeff(1, { nc, ns, d, lambda: LAMBDA }); // E_y tangential = quasi-TM of this geometry
  assert.ok(Math.abs(solve('TE') - normalE) < 1e-2, `TE engine ${solve('TE')} vs physical ${normalE}`);
  assert.ok(Math.abs(solve('TM') - tangentialE) < 1e-2, `TM engine ${solve('TM')} vs physical ${tangentialE}`);
});
