import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpticalModel, solveModesAt } from '../src/optics.mjs';
import { solveElectrostatics } from '../src/electrostatics.mjs';
import { EO_STATUS_LABEL, eoOverlapArm, eoOverlapFromEngine, combineArms, idealPushPullArmB, uniformTriField, materialsPerTriangle, sampleFieldOnOpticalMesh, vpiAtLength, EO_CONVENTIONS } from '../src/eo-overlap.mjs';
import { geom, rect, mats, section, relErr } from './helpers.mjs';

// ---------------------------------------------------------------------------------------------------------
// ILLUSTRATIVE TEST INPUTS. These are chosen round numbers for analytic gates. They are NOT lithium niobate
// reference data, carry no provenance and must not be reused as material constants.
//   n_o = 2.20, n_e = 2.10, r13 = 10, r22 = 4, r33 = 30, r51 = 25 pm/V, lambda = 1.55 um.
const LAMBDA = 1.55;
const N_O = 2.2;
const N_E = 2.1;
const R = { r13: 10, r22: 4, r33: 30, r51: 25 };
const PM = 1e-12;
const EFIELD = 1e4; // V/m per V_t, small enough that the first-order result is accurate to ~1e-7

const crystalMat = (cut, propagation, rotation_deg = 0, withR = true) => ({
  crystal: { cut, propagation, rotation_deg },
  n_o: N_O,
  n_e: N_E,
  eps_r: { perp: 40, par: 30 },
  ...(withR ? { r_pm_per_v: R } : {}),
});

// Quasi-1D window: homogeneous medium in y in [-H/2, H/2], Neumann left/right, Dirichlet top/bottom.
// For a homogeneous medium with psi = cos(pi y / H) and k_y = pi / H:  n_eff^2 = n^2 - (lambda / (2 H))^2.
const H = 1.0;
function homogeneousModel(matCfgs, pol, regionSplit = false) {
  const regions = regionSplit
    ? [
        { name: 'lower', material: 'lower', poly: rect(0, 0.3, -H / 2, 0) },
        { name: 'upper', material: 'upper', poly: rect(0, 0.3, 0, H / 2) },
      ]
    : [{ name: 'medium', material: 'medium', poly: rect(0, 0.3, -H / 2, H / 2) }];
  const g = geom({ domain: { x: [0, 0.3], y: [-H / 2, H / 2] }, regions, electrodes: [{ name: 'm', material: 'gold', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-H / 2, H / 2] } });
  const m = mats({ ...matCfgs, gold: { conductor: true } });
  return buildOpticalModel(section(g), m, { polarization: pol, lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.02, max_edge_um: 0.05 } });
}
const analyticNeff = (n) => Math.sqrt(n * n - (LAMBDA / (2 * H)) ** 2);

function arm(model, mode, field, extra = {}) {
  return eoOverlapArm({
    mesh: model.mesh, geo: model.geo, psi: mode.psi[0], polarization: model.polarization, form: mode.form, neff: mode.neff[0],
    lambdaUm: LAMBDA, lambda0Um: LAMBDA, triField: field, triMaterial: materialsPerTriangle(model), ...extra,
  });
}
function solved(matCfgs, pol, split = false) {
  const model = homogeneousModel(matCfgs, pol, split);
  const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.ok(mode.converged);
  return { model, mode, nT: model.mesh.nTris };
}

// --- uniform field, analytic: delta_eps = -n^4 r E (first order), TE: dn = delta_eps / (2 n_eff) ---------------
test('x-cut (propagation y) TE with lateral field uses r33 and n_e: dn_eff = -n_e^4 r33 E / (2 n_eff)', () => {
  // lab x = crystal z (c axis), lab y = crystal x, lab z = crystal y. TE polarisation along lab x = crystal z (n_e).
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const out = arm(model, mode, uniformTriField(nT, [EFIELD, 0, 0]));
  const neff = mode.neff[0];
  assert.ok(relErr(neff, analyticNeff(N_E)) < 1e-3, 'mode is the analytic homogeneous-box mode');
  const dEps = -(N_E ** 4) * R.r33 * PM * EFIELD;
  assert.ok(relErr(out.dnEffPerV, dEps / (2 * neff)) < 1e-12);
  assert.ok(relErr(out.dnEffPerV, dEps / (2 * analyticNeff(N_E))) < 1e-3);
  // plane-wave limit check of the n_eff factor: dn_eff / (-1/2 n^3 r E) = n / n_eff
  assert.ok(relErr(out.dnEffPerV / (-0.5 * N_E ** 3 * R.r33 * PM * EFIELD), N_E / neff) < 1e-12);
  assert.ok(out.dnEffPerV < 0, 'positive r*E lowers the index (frozen sign convention)');
  assert.equal(out.convention, EO_CONVENTIONS);
});

test('x-cut TE with vertical field: first-order change is zero (r_31 = 0); crystal-x field only shears (r51)', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const out = arm(model, mode, uniformTriField(nT, [0, EFIELD, 0]));
  assert.ok(Math.abs(out.dnEffPerV) < 1e-18);
});

test('z-cut (propagation y): vertical field, TM uses r33/n_e and TE uses r13/n_o', () => {
  // lab y = crystal z. TM polarisation along lab y (n_e): d(1/eps)_zz = r33 E. TE along lab x = -crystal x (n_o): d(1/eps)_xx = r13 E.
  const te = solved({ medium: crystalMat('z', 'y') }, 'TE');
  const outTe = arm(te.model, te.mode, uniformTriField(te.nT, [0, EFIELD, 0]));
  assert.ok(relErr(outTe.dnEffPerV, (-(N_O ** 4) * R.r13 * PM * EFIELD) / (2 * te.mode.neff[0])) < 1e-12);
  // TM: engine H form with Dirichlet window; homogeneous uniaxial dispersion beta^2 = eps_yy (k0^2 - k_y^2 / eps_zz) with eps_zz
  // (lab z = crystal y, n_o here) fixed gives d(neff)/d(eps_yy) = neff / (2 eps_yy)  (independent derivation, see DevLog-007).
  // Since 2026-10-02 (Q2 F3) the engine TM gradient term uses eps_zz, so the mode itself also matches this dispersion.
  const tm = solved({ medium: crystalMat('z', 'y') }, 'TM');
  const outTm = arm(tm.model, tm.mode, uniformTriField(tm.nT, [0, EFIELD, 0]));
  const dEps = -(N_E ** 4) * R.r33 * PM * EFIELD;
  assert.ok(relErr(outTm.dnEffPerV, (tm.mode.neff[0] * dEps) / (2 * N_E ** 2)) < 1e-12);
  // finite-difference of the analytic uniaxial dispersion with eps_zz held fixed
  const k0 = (2 * Math.PI) / LAMBDA, ky = Math.PI / H, e0 = N_E ** 2, h = 1e-6, ezz = N_O ** 2;
  assert.ok(relErr(tm.mode.neff[0], Math.sqrt(e0 * (k0 * k0 - (ky * ky) / ezz)) / k0) < 1e-3, 'TM mode follows the exact uniaxial dispersion (eps_zz in the gradient term)');
  const beta = (e) => Math.sqrt(e * (k0 * k0 - (ky * ky) / ezz));
  const fd = (beta(e0 + h) - beta(e0 - h)) / (2 * h) / k0; // d neff / d eps_yy
  assert.ok(relErr(outTm.dnEffPerV, fd * dEps) < 1e-3);
});

// --- sign reversal, arm swap, drive factors ---------------------------------------------------------------------
test('flipping the field flips the sign of dn_eff and phase per volt exactly', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const p = arm(model, mode, uniformTriField(nT, [EFIELD, 0, 0]));
  const m = arm(model, mode, uniformTriField(nT, [-EFIELD, 0, 0]));
  assert.equal(m.dnEffPerV, -p.dnEffPerV);
  assert.equal(m.phasePerVPerM, -p.phasePerVPerM);
  // phase = k0 dn with k0 in 1/m
  assert.ok(relErr(p.phasePerVPerM, ((2 * Math.PI) / (LAMBDA * 1e-6)) * p.dnEffPerV) < 1e-14);
});

test('arm swap flips delta_phi; push-pull doubles the single-arm phase and halves V_pi*L', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const A = arm(model, mode, uniformTriField(nT, [EFIELD, 0, 0]), { arm: 'left' });
  const B = arm(model, mode, uniformTriField(nT, [-EFIELD, 0, 0]), { arm: 'right' });
  const single = combineArms({ armA: A, armB: null, drive: 'single_arm', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  const pp = combineArms({ armA: A, armB: B, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'differential' });
  const swapped = combineArms({ armA: B, armB: A, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'differential' });
  assert.ok(relErr(pp.phaseDifferencePerVPerM, 2 * single.phaseDifferencePerVPerM) < 1e-14);
  assert.ok(relErr(pp.armGainVsArmA, 2) < 1e-14);
  assert.ok(relErr(pp.pushPullBalance, -1) < 1e-14);
  assert.ok(relErr(single.vpiLVm, 2 * pp.vpiLVm) < 1e-14);
  assert.equal(swapped.phaseDifferencePerVPerM, -pp.phaseDifferencePerVPerM);
  assert.equal(swapped.vpiLVm, pp.vpiLVm, 'V_pi*L is unsigned');
  // single-arm closed form: V_pi L = lambda / (2 |dn|)
  assert.ok(relErr(single.vpiLVm, (LAMBDA * 1e-6) / (2 * Math.abs(A.dnEffPerV))) < 1e-14);
  assert.ok(relErr(single.vpiLVcm, 100 * single.vpiLVm) < 1e-14);
  // idealised antisymmetric arm B reproduces the field-resolved one for this symmetric case
  const ideal = combineArms({ armA: A, armB: idealPushPullArmB(A), drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'differential', requirePushPull: true, balanceTolerance: 1e-9 });
  assert.ok(relErr(ideal.vpiLVm, pp.vpiLVm) < 1e-14);
  assert.ok(relErr(vpiAtLength(single.vpiLVcm, 0.5), 2 * single.vpiLVcm) < 1e-14);
  // terminalDrive is an echo only
  const se = combineArms({ armA: A, armB: B, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  assert.equal(se.vpiLVm, pp.vpiLVm);
});

test('absolute phase difference per volt per metre is k0 (dn_A - dn_B) with lambda in metres (unit gate)', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const A = arm(model, mode, uniformTriField(nT, [EFIELD, 0, 0]));
  const B = arm(model, mode, uniformTriField(nT, [-EFIELD, 0, 0]));
  const c = combineArms({ armA: A, armB: B, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  const k0PerM = (2 * Math.PI) / (LAMBDA * 1e-6);
  assert.ok(relErr(c.phaseDifferencePerVPerM, k0PerM * (A.dnEffPerV - B.dnEffPerV)) < 1e-14);
  // at V_pi the accumulated phase over V_pi L / V is pi
  assert.ok(relErr(Math.abs(c.phaseDifferencePerVPerM) * c.vpiLVm, Math.PI) < 1e-12);
});

test('same-sign arm fields cancel in the phase difference (common-mode) and V_pi is undefined', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const A = arm(model, mode, uniformTriField(nT, [EFIELD, 0, 0]));
  assert.throws(() => combineArms({ armA: A, armB: A, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' }), /V_pi is undefined/);
  assert.throws(() => combineArms({ armA: A, armB: A, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended', requirePushPull: true, balanceTolerance: 0.1 }), /not push-pull/);
});

// --- tensor frame rotation by 90 degrees swaps the r33 / r13 roles -------------------------------------------------
test('rotation_deg = 90 (as implemented: crystal rotated CCW about the propagation axis) swaps r33/r13 and TE/TM roles (x-cut, y-prop)', () => {
  // rotation 0 : lab x = crystal z, lab y = crystal x.  Rows of A: lab axes in crystal coordinates.
  // rotation 90: lab x' = -crystal x (n_o), lab y' = +crystal z (n_e)   [row0' = c*lx - s*n = -n, row1' = s*lx + c*n = lx = z].
  // Same physical field along crystal z in both cases: lab x (rotation 0) and lab y' (rotation 90).
  const r0 = solved({ medium: crystalMat('x', 'y', 0) }, 'TE');
  const a0 = arm(r0.model, r0.mode, uniformTriField(r0.nT, [EFIELD, 0, 0]));
  assert.ok(relErr(a0.dnEffPerV, (-(N_E ** 4) * R.r33 * PM * EFIELD) / (2 * r0.mode.neff[0])) < 1e-12, 'rot 0, TE: r33 with n_e');
  const r90te = solved({ medium: crystalMat('x', 'y', 90) }, 'TE');
  const a90te = arm(r90te.model, r90te.mode, uniformTriField(r90te.nT, [0, EFIELD, 0]));
  assert.ok(relErr(a90te.dnEffPerV, (-(N_O ** 4) * R.r13 * PM * EFIELD) / (2 * r90te.mode.neff[0])) < 1e-12, 'rot 90, TE: r13 with n_o');
  const r90tm = solved({ medium: crystalMat('x', 'y', 90) }, 'TM');
  const a90tm = arm(r90tm.model, r90tm.mode, uniformTriField(r90tm.nT, [0, EFIELD, 0]));
  assert.ok(relErr(a90tm.dnEffPerV, (r90tm.mode.neff[0] * -(N_E ** 4) * R.r33 * PM * EFIELD) / (2 * N_E ** 2)) < 1e-12, 'rot 90, TM: r33 with n_e');
  // and the lateral field in the rotated frame (crystal -x) produces no first-order TE index change
  const none = arm(r90te.model, r90te.mode, uniformTriField(r90te.nT, [EFIELD, 0, 0]));
  assert.ok(Math.abs(none.dnEffPerV) < 1e-18);
});

// --- independent representative anisotropic calculation ---------------------------------------------------------------
test('z-cut rotated 30 deg: Pockels delta_eps_xx equals an independent exact-inverse crystal-frame calculation', () => {
  // INDEPENDENT DERIVATION (no matrix helper from materials.mjs). Crystal frame (1,2,3 = x,y,z), diagonal eps_c = diag(n_o^2, n_o^2, n_e^2).
  // z-cut, propagation along crystal y: lab x = -x_c, lab y = z_c, lab z = y_c. Rotating the lab frame by theta about lab z (CCW):
  //   lab x' axis in crystal coordinates = c*(-1,0,0) - s*(0,0,1) = (-c, 0, -s);  lab y' axis = s*(-1,0,0) + c*(0,0,1) = (-s, 0, c).
  // Lab field (Ex', Ey', 0) in crystal components: E_cx = -c Ex' - s Ey', E_cz = -s Ex' + c Ey'.
  // Pockels (3m): d(1/eps)_xx = r13 E_z, d(1/eps)_yy = r13 E_z, d(1/eps)_zz = r33 E_z, d(1/eps)_xz = r51 E_x (and r22 terms
  // d_xx = -r22 E_y etc. vanish for E_cy = 0).  Perturbed permittivity is the EXACT inverse of (diag(1/eps_c) + d(1/eps)).
  // delta_eps_xx' = e_x'^T [ (diag + d)^-1 - diag^-1 ] e_x' with e_x' = (-c, 0, -s).
  const theta = (30 * Math.PI) / 180, c = Math.cos(theta), s = Math.sin(theta);
  const Ex = 0.8 * EFIELD, Ey = 0.6 * EFIELD;
  const Ecx = -c * Ex - s * Ey, Ecz = -s * Ex + c * Ey;
  const eo2 = N_O ** 2, ee2 = N_E ** 2;
  const d = (v) => v * PM;
  const inv0 = [1 / eo2, 0, 0, 0, 1 / eo2, 0, 0, 0, 1 / ee2];
  const dInv = [d(R.r13) * Ecz, 0, d(R.r51) * Ecx, 0, d(R.r13) * Ecz, 0, d(R.r51) * Ecx, 0, d(R.r33) * Ecz];
  const sum = inv0.map((v, i) => v + dInv[i]);
  const inv3 = (m) => {
    const [a, b, cc, dd, e, f, g, h, i] = m;
    const det = a * (e * i - f * h) - b * (dd * i - f * g) + cc * (dd * h - e * g);
    return [e * i - f * h, cc * h - b * i, b * f - cc * e, f * g - dd * i, a * i - cc * g, cc * dd - a * f, dd * h - e * g, b * g - a * h, a * e - b * dd].map((v) => v / det);
  };
  const epsP = inv3(sum), eps0 = inv3(inv0);
  const ex = [-c, 0, -s];
  const quad = (m) => ex.reduce((acc, vi, i) => acc + ex.reduce((a2, vj, j) => a2 + vi * m[3 * i + j] * vj, 0), 0);
  const expectedDeltaEpsXX = quad(epsP) - quad(eps0);
  // engine: the scalar overlap of a uniform field with the same material on a TE mode is delta_eps_xx / (2 n_eff) (uniform weight).
  // The optical solve rejects off-diagonal permittivity, so build the mode in the unrotated medium (any positive psi) and only
  // rotate the Pockels material: this isolates the tensor chain under test.
  const base = solved({ medium: crystalMat('z', 'y', 0, false) }, 'TE');
  const rotated = mats({ medium: crystalMat('z', 'y', 30) }).medium;
  const triMaterial = Array.from({ length: base.nT }, () => rotated);
  const out = eoOverlapArm({ mesh: base.model.mesh, geo: base.model.geo, psi: base.mode.psi[0], polarization: 'TE', form: 'E', neff: base.mode.neff[0], lambdaUm: LAMBDA, lambda0Um: LAMBDA, triField: uniformTriField(base.nT, [Ex, Ey, 0]), triMaterial });
  // lab-frame eps_xx' of the rotated unperturbed medium is NOT n_o^2: the engine uses eps_xx' for its first-order formula, as does the exact inverse above.
  assert.ok(relErr(out.dnEffPerV * 2 * base.mode.neff[0], expectedDeltaEpsXX) < 1e-5, `${out.dnEffPerV * 2 * base.mode.neff[0]} vs ${expectedDeltaEpsXX}`);
});

// --- normalisation ---------------------------------------------------------------------------------------------------
test('overlap is invariant to the amplitude and sign of the mode field', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const f = uniformTriField(nT, [EFIELD, 0, 0]);
  const ref = arm(model, mode, f).dnEffPerV;
  for (const scale of [1e-9, -3.7, 4.2e6]) {
    const scaled = { ...mode, psi: [mode.psi[0].map((v) => v * scale)] };
    assert.ok(relErr(arm(model, scaled, f).dnEffPerV, ref) < 1e-12, `scale ${scale}`);
  }
  const tm = solved({ medium: crystalMat('z', 'y') }, 'TM');
  const ftm = uniformTriField(tm.nT, [0, EFIELD, 0]);
  const refTm = arm(tm.model, tm.mode, ftm).dnEffPerV;
  assert.ok(relErr(arm(tm.model, { ...tm.mode, psi: [tm.mode.psi[0].map((v) => -2e5 * v)] }, ftm).dnEffPerV, refTm) < 1e-12);
});

// --- partial overlap --------------------------------------------------------------------------------------------------
test('Pockels active in the upper half only gives the independent power fraction of the uniform value (about one half)', () => {
  const split = (pol, cut) => solved({ lower: crystalMat(cut, 'y', 0, false), upper: crystalMat(cut, 'y', 0, true) }, pol, true);
  for (const [pol, cut, E] of [['TE', 'x', [EFIELD, 0, 0]], ['TM', 'z', [0, EFIELD, 0]]]) {
    const { model, mode, nT } = split(pol, cut);
    const f = uniformTriField(nT, E);
    const half = arm(model, mode, f, { triRegion: model.mesh.triRegion, regionNames: model.regions.map((r) => r.name) });
    // uniform reference: the same field in an all-Pockels medium (same optical indices, same mesh)
    const allR = eoOverlapArm({ mesh: model.mesh, geo: model.geo, psi: mode.psi[0], polarization: pol, form: mode.form, neff: mode.neff[0], lambdaUm: LAMBDA, lambda0Um: LAMBDA, triField: f,
      triMaterial: Array.from({ length: nT }, () => mats({ m: crystalMat(cut, 'y', 0, true) }).m) });
    // independent fraction: node quadrature of psi^2 over the upper half (centroid-based), no triangle-integral helper
    const { mesh } = model;
    let up = 0, tot = 0;
    for (let t = 0; t < nT; t++) {
      const [a, b, c] = [mesh.tri[3 * t], mesh.tri[3 * t + 1], mesh.tri[3 * t + 2]];
      const area = Math.abs((mesh.x[b] - mesh.x[a]) * (mesh.y[c] - mesh.y[a]) - (mesh.x[c] - mesh.x[a]) * (mesh.y[b] - mesh.y[a])) / 2;
      const [pa, pb, pc] = [mode.psi[0][a], mode.psi[0][b], mode.psi[0][c]];
      const w = (area / 6) * (pa * pa + pb * pb + pc * pc + pa * pb + pb * pc + pc * pa); // exact P1 integral of psi^2
      const yc = (mesh.y[a] + mesh.y[b] + mesh.y[c]) / 3;
      tot += w;
      if (yc > 0) up += w;
    }
    // TE and TM share the same weight ratio because the index is identical in both halves
    assert.ok(relErr(half.dnEffPerV / allR.dnEffPerV, up / tot) < 1e-9, `${pol} fraction vs independent quadrature`);
    assert.ok(Math.abs(up / tot - 0.5) < 0.01, `${pol} fraction ${up / tot} near 0.5 by mirror symmetry of the cos mode`);
    assert.ok(Math.abs(half.byRegion.upper.powerFraction - 0.5) < 0.01);
    assert.ok(Math.abs(half.byRegion.lower.dnEffPerV) === 0);
  }
});

// --- independent finite-difference check of the TE perturbation weights (non-uniform) ---------------------------------
test('TE perturbation in a sub-region matches a central finite difference of the solved n_eff', () => {
  // Core strip (n_e = 2.1 for TE along crystal z) in a lower-index cladding; Pockels field only inside the core.
  // The FD re-solves with eps_xx' = 1/(1/eps +/- r33 E) in the core: independent of the overlap formula.
  const build = (nCore) => {
    const g = geom({ domain: { x: [0, 0.3], y: [-3, 3] }, regions: [{ name: 'clad', material: 'clad', poly: rect(0, 0.3, -3, 3) }, { name: 'core', material: 'core', poly: rect(0, 0.3, -0.3, 0.3) }],
      electrodes: [{ name: 'm', material: 'gold', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-3, 3] } });
    const coreCfg = { ...crystalMat('x', 'y'), n_e: nCore };
    return buildOpticalModel(section(g), mats({ clad: { n: 1.45, eps_r: 2 }, core: coreCfg, gold: { conductor: true } }), { polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.02, max_edge_um: 0.1 } });
  };
  const base = build(N_E);
  const mode = solveModesAt(base, LAMBDA, { numModes: 1 });
  const nT = base.mesh.nTris;
  const f = new Float64Array(3 * nT);
  const regionNames = base.regions.map((r) => r.name);
  for (let t = 0; t < nT; t++) if (regionNames[base.mesh.triRegion[t]] === 'core') f[3 * t] = EFIELD;
  const E = 1e5; // V/m: eps*r*E ~ 1e-6, second order cancels in the central difference
  const sc = E / EFIELD;
  const fScaled = f.map((v) => v * sc);
  const o = arm(base, mode, fScaled, { triRegion: base.mesh.triRegion, regionNames });
  // exact perturbed core permittivity: 1/eps' = 1/eps + r33 E  (lab x = crystal z)
  const epsPert = (sgn) => 1 / (1 / N_E ** 2 + sgn * R.r33 * PM * E);
  const np = solveModesAt(build(Math.sqrt(epsPert(+1))), LAMBDA, { numModes: 1 }).neff[0];
  const nm = solveModesAt(build(Math.sqrt(epsPert(-1))), LAMBDA, { numModes: 1 }).neff[0];
  const fd = (np - nm) / 2;
  assert.ok(Math.abs(fd) > 1e-9, 'perturbation is resolved above solver noise');
  assert.ok(relErr(o.dnEffPerV, fd) < 1e-6, `${o.dnEffPerV} vs ${fd}`);
  assert.ok(o.byRegion.core.powerFraction > 0.3 && o.byRegion.core.powerFraction < 1);
});

// --- end-to-end through the engine: electrostatics -> optical mode -> overlap ----------------------------------------
function plates(weights, symmetry = 'none') {
  // x-cut (propagation y) LN-like medium filling a parallel-plate gap; Neumann top/bottom, plates at x = -3.0..-2.9 ... see weights.
  const g = geom({
    domain: { x: [-3, 3], y: [-0.5, 0.5] }, symmetry,
    regions: [{ name: 'medium', material: 'medium', poly: rect(-3, 3, -0.5, 0.5) }],
    electrodes: [
      { name: 'left', weight: weights[0], poly: rect(-3, -2.8, -0.5, 0.5) },
      { name: 'mid', weight: weights[1], poly: rect(-0.1, 0.1, -0.5, 0.5) },
      { name: 'right', weight: weights[2], poly: rect(2.8, 3, -0.5, 0.5) },
    ],
    mesh: { max_edge_um: 0.3, electrode_edge_um: 0.1, electrode_face_um: 0.3 },
    optical_window: { x: [-2, -1], y: [-0.5, 0.5] },
  });
  const m = mats({ medium: crystalMat('x', 'y'), gold: { conductor: true } });
  return { g, m, es: solveElectrostatics(section(g), { resolvedMaterials: m }) };
}
function arms(weights) {
  const { g, m, es } = plates(weights);
  const mk = (x) => buildOpticalModel(section(g), m, { window: { x, y: [-0.5, 0.5] }, polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.05, max_edge_um: 0.1 } });
  const out = {};
  for (const [name, x] of [['left', [-2, -1]], ['right', [1, 2]]]) {
    const model = mk(x);
    const mode = solveModesAt(model, LAMBDA, { numModes: 1 });
    out[name] = eoOverlapFromEngine({ es, model, mode, modeIndex: 0, arm: name });
    out[name].neffSolved = mode.neff[0];
  }
  return { es, ...out };
}

test('engine chain: signal in the centre gives equal and opposite arm fields (push-pull from geometry), E = V_t / gap', () => {
  const { left, right, es } = arms([0, 1, 0]);
  const gapM = 2.7e-6; // mid electrode edge at -0.1, left ground edge at -2.8
  const dEps = (E) => -(N_E ** 4) * R.r33 * PM * E;
  // left gap: phi rises from 0 (x=-2.8) to 1 (x=-0.1): E_x = -1/gap; right gap: E_x = +1/gap
  assert.ok(relErr(left.dnEffPerV, dEps(-1 / gapM) / (2 * left.neffSolved)) < 1e-6);
  assert.ok(relErr(right.dnEffPerV, dEps(+1 / gapM) / (2 * right.neffSolved)) < 1e-6);
  const pp = combineArms({ armA: left, armB: right, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  const sa = combineArms({ armA: left, armB: null, drive: 'single_arm', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  assert.ok(relErr(pp.armGainVsArmA, 2) < 1e-5);
  assert.ok(relErr(sa.vpiLVm / pp.vpiLVm, 2) < 1e-5);
  assert.ok(Math.abs(es.vline - 1) < 1e-12);
});

test('engine chain: terminal-voltage normalisation, differential and single-ended drives give identical V_pi*L', () => {
  const ref = combineArms({ ...(() => { const a = arms([0, 1, 0]); return { armA: a.left, armB: a.right }; })(), drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  // grounds at -0.5 and mid at +0.5 (same V_t = 1), and an overall scale (V_t = 2 -> field per volt of V_t unchanged)
  for (const w of [[-0.5, 0.5, -0.5], [-1, 1, -1], [3, 5, 3]]) {
    const a = arms(w);
    const c = combineArms({ armA: a.left, armB: a.right, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'differential' });
    assert.ok(relErr(c.vpiLVm, ref.vpiLVm) < 1e-9, `weights ${w}`);
  }
});

test('sampled field has the sign of -grad(phi) and the V/m unit', () => {
  const { g, m, es } = plates([0, 1, 0]);
  const model = buildOpticalModel(section(g), m, { window: { x: [-2, -1], y: [-0.5, 0.5] }, polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' } });
  const f = sampleFieldOnOpticalMesh(es, model);
  assert.ok(relErr(f[0], -1 / 2.7e-6) < 1e-6);
});

test('field sampling: zero inside an electrode footprint (ideal conductor interior), readable error outside the electrostatic mesh', () => {
  const { g, m, es } = plates([0, 1, 0]);
  const over = buildOpticalModel(section(g), m, { window: { x: [-0.5, 0.5], y: [-0.5, 0.5] }, polarization: 'TE', lambda0Um: LAMBDA, metal: 'absent', boundary: { left: 'neumann', right: 'neumann' } });
  const f = sampleFieldOnOpticalMesh(es, over);
  let inside = 0, outside = 0;
  for (let t = 0; t < over.mesh.nTris; t++) {
    const [a, b, c] = [over.mesh.tri[3 * t], over.mesh.tri[3 * t + 1], over.mesh.tri[3 * t + 2]];
    const xc = (over.mesh.x[a] + over.mesh.x[b] + over.mesh.x[c]) / 3;
    if (Math.abs(xc) < 0.1) { assert.equal(f[3 * t], 0); inside++; } else { assert.ok(Math.abs(f[3 * t]) > 1e5); outside++; }
  }
  assert.ok(inside > 0 && outside > 0);
  // odd mirror symmetry crops the electrostatic mesh to the half containing the configured window (x < 0 here);
  // an optical window on the discarded half has no field data and must fail loudly
  const half = plates([-1, 0, 1], 'x_mirror_odd');
  const discarded = buildOpticalModel(section(half.g), half.m, { window: { x: [1, 2], y: [-0.5, 0.5] }, polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' } });
  assert.throws(() => sampleFieldOnOpticalMesh(half.es, discarded), /outside the electrostatic mesh/);
});

// --- Q2 F4 / F5: convergence refusal and diagnostics carried through ---------------------------------------------------
test('eoOverlapFromEngine refuses an unconverged mode unless explicitly accepted, and echoes converged = false', () => {
  const { g, m, es } = plates([0, 1, 0]);
  const model = buildOpticalModel(section(g), m, { window: { x: [-2, -1], y: [-0.5, 0.5] }, polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.05, max_edge_um: 0.1 } });
  const bad = solveModesAt(model, LAMBDA, { numModes: 1, maxIter: 2 });
  assert.equal(bad.converged, false);
  assert.throws(() => eoOverlapFromEngine({ es, model, mode: bad, modeIndex: 0 }), /did not converge.*acceptUnconverged/);
  const accepted = eoOverlapFromEngine({ es, model, mode: bad, modeIndex: 0, acceptUnconverged: true });
  assert.equal(accepted.converged, false);
  assert.ok(accepted.labels.includes('mode_not_converged'));
  const c = combineArms({ armA: accepted, armB: null, drive: 'single_arm', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  assert.equal(c.converged.all, false);
  assert.ok(c.labels.includes('mode_not_converged'));
  // converged mode: converged = true
  const good = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.equal(eoOverlapFromEngine({ es, model, mode: good, modeIndex: 0 }).converged, true);
});

test('arm and combined results always carry labels, limitation flags, metal policy, margin fraction and the unvalidated status', () => {
  const { g, m, es } = plates([0, 1, 0]);
  const mk = (x) => buildOpticalModel(section(g), m, { window: { x, y: [-0.5, 0.5] }, polarization: 'TE', lambda0Um: LAMBDA, metal: 'absent', boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.05, max_edge_um: 0.1 } });
  const run = (x, name) => { const model = mk(x); return eoOverlapFromEngine({ es, model, mode: solveModesAt(model, LAMBDA, { numModes: 1 }), modeIndex: 0, arm: name }); };
  const a = run([-2, -1], 'left');
  const b = run([1, 2], 'right');
  for (const r of [a, b]) {
    assert.equal(r.status, EO_STATUS_LABEL);
    assert.ok(r.labels.includes('scalar_optical_not_full_vector') && r.labels.includes('optical_metal_absent_limit'));
    assert.ok(r.limitations.includes('scalar_forms_exact_only_at_horizontal_interfaces'));
    assert.equal(r.metal.policy, 'absent');
    assert.ok(r.boundaryMarginFraction.marginUm > 0 && Number.isFinite(r.boundaryMarginFraction.value));
  }
  const c = combineArms({ armA: a, armB: b, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' });
  assert.equal(c.status, EO_STATUS_LABEL);
  assert.ok(c.labels.includes('optical_metal_absent_limit') && c.labels.includes('scalar_optical_not_full_vector'));
  assert.equal(c.metal.A.policy, 'absent');
  assert.equal(c.metal.B.policy, 'absent');
  assert.equal(c.converged.all, true);
  // a bare arm built without mode diagnostics still carries the scalar label and an UNKNOWN (null) convergence, never true
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const bare = arm(model, mode, uniformTriField(nT, [EFIELD, 0, 0]));
  assert.equal(bare.converged, null);
  assert.ok(bare.labels.includes('scalar_optical_not_full_vector'));
  assert.equal(combineArms({ armA: bare, armB: null, drive: 'single_arm', lambdaUm: LAMBDA, terminalDrive: 'single_ended' }).converged.all, null);
});

// --- readable errors for missing inputs ------------------------------------------------------------------------------
test('missing or inconsistent inputs throw readable errors; nothing is defaulted', () => {
  const { model, mode, nT } = solved({ medium: crystalMat('x', 'y') }, 'TE');
  const good = { mesh: model.mesh, geo: model.geo, psi: mode.psi[0], polarization: 'TE', form: 'E', neff: mode.neff[0], lambdaUm: LAMBDA, lambda0Um: LAMBDA, triField: uniformTriField(nT, [1, 0, 0]), triMaterial: materialsPerTriangle(model) };
  assert.doesNotThrow(() => eoOverlapArm(good));
  for (const k of ['mesh', 'geo', 'psi', 'neff', 'lambdaUm', 'lambda0Um', 'triField', 'triMaterial']) assert.throws(() => eoOverlapArm({ ...good, [k]: undefined }), new RegExp(`eo-overlap: .*${k}`), k);
  assert.throws(() => eoOverlapArm({ ...good, polarization: 'TM' }), /does not match polarization/);
  assert.throws(() => eoOverlapArm({ ...good, polarization: 'diag' }), /polarization must be/);
  assert.throws(() => eoOverlapArm({ ...good, neff: -1 }), /neff must be/);
  assert.throws(() => eoOverlapArm({ ...good, triField: new Float64Array(5) }), /triField must be an array of length/);
  assert.throws(() => eoOverlapArm({ ...good, triField: uniformTriField(nT, [NaN, 0, 0]) }), /not finite/);
  assert.throws(() => eoOverlapArm({ ...good, psi: new Float64Array(3) }), /node count/);
  assert.throws(() => uniformTriField(4, [1, 2]), /Ex, Ey, Ez/);
  assert.throws(() => combineArms({ armA: { dnEffPerV: 1 }, armB: null, drive: 'single_arm', lambdaUm: LAMBDA }), /terminalDrive/);
  assert.throws(() => combineArms({ armA: { dnEffPerV: 1 }, armB: null, drive: 'push_pull', lambdaUm: LAMBDA, terminalDrive: 'single_ended' }), /drive must be/);
  assert.throws(() => combineArms({ armA: { dnEffPerV: 1 }, armB: { dnEffPerV: 1 }, drive: 'single_arm', lambdaUm: LAMBDA, terminalDrive: 'single_ended' }), /armB = null/);
  assert.throws(() => combineArms({ armA: { dnEffPerV: 1 }, armB: null, drive: 'two_arm_field_resolved', lambdaUm: LAMBDA, terminalDrive: 'single_ended' }), /requires armB/);
});
