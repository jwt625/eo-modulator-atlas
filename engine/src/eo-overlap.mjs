// Electro-optic (Pockels) overlap of a scalar optical mode with a static field, MZM arm/phase/V_pi conventions.
// Pure functions on explicit inputs: no physical constant is defaulted; a missing input throws a readable error.
// License: GPL-3.0-or-later.
//
// ---------------------------------------------------------------------------------------------------------
// FROZEN CONVENTIONS (E2, 2026-10-02; mirrored in DevLog-007). Any change is an interface change.
//
// Frames. Lab frame: x lateral, y film normal (up), z propagation (materials.mjs). Crystal axes 1,2,3 = x,y,z
//   with c = 3. materials.labFromCrystal returns A with v_lab = A v_crystal; ROWS of A are the lab axes written in
//   crystal coordinates. Rank-2 tensors transform T_lab = A T_crystal A^T; a lab field maps to the crystal frame
//   by E_c = A^T E_lab. materials.deltaEpsLab implements exactly this chain; it is reused here, not re-derived.
//   rotation_deg SENSE (Q2 F6): materials.labFromCrystal applies A' = R(theta) A with R = [[c,-s],[s,c]], i.e. row0' = c lx - s n,
//   row1' = s lx + c n. This rotates the CRYSTAL CCW about the propagation axis (the lab axes move clockwise in the crystal frame);
//   the comment in materials.mjs calls it a CCW rotation of the lab frame, which is the opposite sense (sign of dn flips for 90/180 deg).
//   This module takes the implemented sense as the contract; the doc/code mismatch is a proposal to the materials.mjs owner (DevLog-007 P9).
// Pockels. Delta(1/n^2)_I = sum_j r_Ij E_j, I = 1..6 contracted (xx, yy, zz, yz, xz, xy), j = crystal x,y,z
//   (materials.pockelsVoigt, coefficients in pm/V converted to m/V). No clamped/unclamped distinction is made by
//   the engine: the supplied r values are used as given. First order: Delta(eps) = -eps Delta(1/eps) eps (lab frame).
//   Consequently a positive r*E component REDUCES the index: Delta n = -(1/2) n^3 r E (sign, not only magnitude).
// Static field. E = -grad(phi) in lab frame, V/m, per volt of TERMINAL voltage V_t (see below); 2D: E_z = 0.
// Terminal voltage. V_t is the engine's normalised full terminal difference (electrostatics.mjs normalizeWeights:
//   max(w) - min(w), or 2 max|w| for x_mirror_odd). Single-ended (signal V_t, ground 0) and differential
//   (+V_t/2, -V_t/2) drives are the same V_t; "differential" is a terminal property and adds NO optical factor.
//   Caveat (electrostatics, not this module): common-mode offsets are only irrelevant when no outer Dirichlet boundary is used.
// Optical phase. phi_arm = k0 n_eff L with k0 = 2 pi / lambda0 (vacuum), positive phase = longer optical path.
//   dn_eff,arm = d(n_eff)/dV_t evaluated by first-order perturbation theory of the arm's own mode in the arm's own field.
// MZM phase difference. Delta_phi = phi_A - phi_B over length L; B absent (null) = single-arm drive.
//   d(Delta_phi)/dV_t = k0 L (dn_A - dn_B). Push-pull is NOT assumed: it emerges when the two arms' fields give
//   dn_B = -dn_A (factor 2 relative to arm A alone, reported as armGainVsArmA).
// V_pi. The terminal voltage V_t (as defined above) for which |Delta_phi| = pi, DC/low-frequency, lossless, no RF
//   mismatch:  V_pi L = lambda0 / (2 |dn_A - dn_B|)  [V m]  (reported also in V cm).
// Result markers (Q2 F4/F5): every arm/combined result carries `status: unvalidated_analytic_only`, scalar labels, the metal policy
//   and PEC face summary, the boundary-margin fraction, machine-readable limitation codes and the convergence flag of the mode.
//   eoOverlapFromEngine throws on an unconverged mode unless acceptUnconverged: true (then converged = false is echoed).
// Mode normalisation. Power weighted, scalar approximation (only the dominant E component of the quasi-mode):
//   quasi-TE (form E, psi = E_x):      Delta n_eff = [ int Delta_eps_xx psi^2 dA ] / [ 2 n_eff int psi^2 dA ]
//   quasi-TM (form H, psi = H_x):      Delta n_eff = (n_eff / 2) [ int (Delta_eps_yy / n_yy^4) psi^2 dA ] / [ int psi^2 / n_yy^2 dA ]
//   Derivation: Delta_beta = (omega eps0 / 4P) int E* . Delta_eps . E dA with P = (1/2) int Re(E x H*)_z dA, using
//   H_y = beta E_x/(omega mu0) (TE) and E_y = beta H_x/(omega eps0 n_yy^2) (TM). The result is independent of the
//   amplitude and sign of psi. E_z/E_y(TE) components and off-diagonal Delta_eps are neglected (documented limitation).
// ---------------------------------------------------------------------------------------------------------

import { epsOptLab, deltaEpsLab } from './materials.mjs';
import { TriLocator } from './electrostatics.mjs';
import { triIntegralSquare, OPTICAL_LABELS, OPTICAL_LIMITATIONS } from './optics.mjs';

/** Status marker carried by every EO result: analytic-gate level only, no validation_status promotion, draft inputs unverified. */
export const EO_STATUS_LABEL = 'unvalidated_analytic_only';

export const ARM_DRIVE_MODES = ['single_arm', 'two_arm_field_resolved'];
export const TERMINAL_DRIVES = ['single_ended', 'differential'];

export const EO_CONVENTIONS = Object.freeze({
  id: 'eo-atlas.eo-overlap/v1',
  lab_frame: 'x lateral, y film normal (up), z propagation',
  crystal_to_lab: 'v_lab = A v_crystal; rows of A are lab axes in crystal coordinates (materials.labFromCrystal); T_lab = A T A^T',
  pockels: 'delta(1/n^2)_I = sum_j r_Ij E_j, I contracted xx,yy,zz,yz,xz,xy; j crystal x,y,z; r in m/V; coefficients used as supplied',
  delta_n_sign: 'delta(eps) = -eps delta(1/eps) eps; delta n = -(1/2) n^3 r E (positive r*E lowers the index)',
  field: 'E = -grad(phi), V/m per volt of terminal voltage, lab frame, E_z = 0',
  terminal_voltage: 'engine-normalised full terminal difference V_t; differential and single-ended drives share V_t; no optical factor',
  phase: 'phi = k0 n_eff L, k0 = 2 pi / lambda_vacuum, positive = longer optical path',
  arm_phase_difference: 'delta_phi = phi_A - phi_B; B = null is single-arm drive; push-pull emerges from the arm fields',
  vpi: '|delta_phi| = pi at terminal voltage V_pi; V_pi L = lambda / (2 |dn_A - dn_B|); DC, lossless, no RF mismatch',
  mode_normalisation: 'power weighted scalar: TE weight psi^2 (uniform in n), TM weight psi^2/n^2 for power and psi^2/n^4 in the field term',
});

const fail = (msg) => {
  throw new Error(`eo-overlap: ${msg}`);
};
const need = (v, name) => {
  if (v === undefined || v === null) fail(`missing required input ${name}`);
  return v;
};
const positive = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) fail(`${name} must be a finite positive number; got ${v}`);
  return v;
};
const finiteArray = (a, len, name) => {
  need(a, name);
  if (!(a instanceof Float64Array || Array.isArray(a)) || a.length !== len) fail(`${name} must be an array of length ${len}`);
  for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) fail(`${name}[${i}] is not finite`);
  return a;
};

/** Uniform lab-frame field (V/m per V_t) on every triangle: convenience for analytic gates. */
export function uniformTriField(nTris, E) {
  if (!Array.isArray(E) || E.length !== 3) fail('uniform field must be [Ex, Ey, Ez] in V/m per volt');
  const out = new Float64Array(3 * nTris);
  for (let t = 0; t < nTris; t++) for (let k = 0; k < 3; k++) out[3 * t + k] = E[k];
  return out;
}

/**
 * Static field per optical-mesh triangle (V/m per volt of terminal voltage) sampled at triangle centroids of the
 * optical mesh from the electrostatic solution (E = -grad phi, piecewise constant per electrostatic triangle).
 * A centroid inside an electrode polygon gets E = 0 (ideal conductor interior; no electrostatic triangle exists there).
 * Nearest-triangle sampling error is O(h_electrostatic) near material interfaces and electrodes; the two meshes are
 * different, so convergence of both must be checked by the caller.
 * @param {{mesh:any, geo?:any, grad:{gx:Float64Array, gy:Float64Array}}} es electrostatic result (solveElectrostatics)
 * @param {{mesh:any}} model optical model (buildOpticalModel)
 */
export function sampleFieldOnOpticalMesh(es, model) {
  need(es, 'es (electrostatic result)');
  need(model, 'model (optical model)');
  const { mesh: emesh, grad } = es;
  need(emesh, 'es.mesh');
  need(grad, 'es.grad');
  const loc = new TriLocator(emesh, es.geo);
  const om = model.mesh;
  const out = new Float64Array(3 * om.nTris);
  for (let t = 0; t < om.nTris; t++) {
    const a = om.tri[3 * t], b = om.tri[3 * t + 1], c = om.tri[3 * t + 2];
    const cx = (om.x[a] + om.x[b] + om.x[c]) / 3, cy = (om.y[a] + om.y[b] + om.y[c]) / 3;
    const k = loc.find(cx, cy);
    if (k < 0) {
      // Inside an ideal conductor the static field is zero and the electrostatic mesh has no triangles there.
      const inElectrode = model.section?.classify ? model.section.classify(cx, cy).electrode >= 0 : false;
      if (inElectrode) continue;
    }
    if (k < 0) fail(`optical triangle ${t} centroid (${cx.toFixed(4)}, ${cy.toFixed(4)}) um lies outside the electrostatic mesh (cropped half-domain or window outside the domain)`);
    out[3 * t] = -grad.gx[k] * 1e6; // V/um -> V/m
    out[3 * t + 1] = -grad.gy[k] * 1e6;
  }
  return out;
}

/** Resolved material per optical-mesh triangle (null never occurs for a valid model). */
export function materialsPerTriangle(model) {
  need(model, 'model (optical model)');
  const mats = model.regions.map((r) => need(model.mats[r.material], `material ${r.material}`));
  return Array.from(model.mesh.triRegion, (ri) => mats[ri]);
}

/**
 * First-order Pockels overlap of one optical mode with a static field in ONE arm.
 *
 * @param {Object} p
 * @param {any} p.mesh optical triangle mesh (tri, x, y, nTris)
 * @param {{area:Float64Array}} p.geo triangle geometry (triangleGeometry)
 * @param {Float64Array} p.psi nodal mode field (any amplitude/sign)
 * @param {'TE'|'TM'} p.polarization quasi-TE (form E) or quasi-TM (form H)
 * @param {string} p.form 'E' or 'H' (must match the polarization)
 * @param {number} p.neff effective index of that mode
 * @param {number} p.lambdaUm vacuum wavelength (um) at which the mode was solved
 * @param {number} p.lambda0Um anchor wavelength of the material indices (um), as used by the optical solve
 * @param {Float64Array} p.triField lab-frame static field per triangle, 3 values (V/m per V_t), length 3*nTris
 * @param {any[]} p.triMaterial resolved material per triangle (materials.resolveMaterial); r === null means no Pockels effect
 * @param {Float64Array|number[]} [p.excluded] 1 for triangles removed from the mode equation (pec_scalar metal)
 * @param {Int32Array|number[]} [p.triRegion] region index per triangle for the per-region breakdown
 * @param {string[]} [p.regionNames] names matching triRegion
 * @param {string} [p.arm] label echoed in the output
 * @param {{labels?:string[], limitations?:string[], metal?:any, boundaryMarginFraction?:any, converged?:boolean|null, modeIndex?:number}} [p.modeInfo]
 *   diagnostics of the solved mode, carried verbatim into the result (labels, metal policy, truncation margin, convergence).
 *   Absent = the caller did not supply them: `converged` is then null (unknown), never true.
 */
export function eoOverlapArm(p) {
  need(p, 'arguments');
  const { mesh, geo, psi, polarization, form, neff, lambdaUm, lambda0Um, triField, triMaterial } = p;
  need(mesh, 'mesh');
  need(geo, 'geo');
  need(psi, 'psi');
  if (polarization !== 'TE' && polarization !== 'TM') fail(`polarization must be 'TE' or 'TM'; got ${polarization}`);
  if ((polarization === 'TE') !== (form === 'E')) fail(`form ${form} does not match polarization ${polarization} (TE <-> E, TM <-> H)`);
  positive(neff, 'neff');
  positive(lambdaUm, 'lambdaUm');
  positive(lambda0Um, 'lambda0Um');
  const nT = mesh.nTris;
  if (psi.length !== mesh.nNodes) fail(`psi length ${psi.length} does not match the mesh node count ${mesh.nNodes}`);
  finiteArray(triField, 3 * nT, 'triField');
  need(triMaterial, 'triMaterial');
  if (triMaterial.length !== nT) fail(`triMaterial must have one entry per triangle (${nT})`);
  const comp = polarization === 'TE' ? 0 : 4; // epsilon_xx or epsilon_yy in the lab frame
  const I = triIntegralSquare(mesh, geo, psi); // integral of psi^2 per triangle
  const cache = new Map();
  const epsOf = (m) => {
    let e = cache.get(m);
    if (!e) {
      e = epsOptLab(m, lambdaUm, lambda0Um);
      if (!e) fail(`material ${m.name} has no optical index at ${lambdaUm} um`);
      cache.set(m, e);
    }
    return e;
  };
  let num = 0;
  let den = 0;
  const regionAcc = new Map();
  for (let t = 0; t < nT; t++) {
    if (p.excluded?.[t]) continue;
    const m = triMaterial[t];
    const e = epsOf(m);
    const n2 = e[comp];
    let dEps = 0;
    if (m.r) {
      const E = [triField[3 * t], triField[3 * t + 1], triField[3 * t + 2]];
      dEps = deltaEpsLab(m.r, m.A, e, E)[comp];
    }
    const wPower = polarization === 'TE' ? I[t] : I[t] / n2;
    const wField = polarization === 'TE' ? I[t] : I[t] / (n2 * n2);
    den += wPower;
    num += dEps * wField;
    if (p.triRegion) {
      const nm = p.regionNames?.[p.triRegion[t]] ?? String(p.triRegion[t]);
      const acc = regionAcc.get(nm) ?? { power: 0, num: 0 };
      acc.power += wPower;
      acc.num += dEps * wField;
      regionAcc.set(nm, acc);
    }
  }
  if (!(den > 0)) fail('mode has zero power in the non-excluded region (psi is identically zero?)');
  const dn = polarization === 'TE' ? num / (2 * neff * den) : (neff / 2) * (num / den);
  const k0 = (2 * Math.PI) / (lambdaUm * 1e-6);
  const byRegion = {};
  for (const [nm, acc] of regionAcc) {
    byRegion[nm] = { powerFraction: acc.power / den, dnEffPerV: polarization === 'TE' ? acc.num / (2 * neff * den) : (neff / 2) * (acc.num / den) };
  }
  const mi = p.modeInfo ?? {};
  const labels = [...new Set([...OPTICAL_LABELS, ...(mi.labels ?? []), ...(mi.converged === false ? ['mode_not_converged'] : [])])];
  const limitations = [...new Set([...OPTICAL_LIMITATIONS.filter((c) => form === 'H' || c !== 'scalar_tm_lateral_gradient_uses_eps_zz_approximation'), ...(mi.limitations ?? [])])];
  return {
    arm: p.arm ?? null,
    status: EO_STATUS_LABEL,
    labels,
    limitations,
    converged: mi.converged ?? null,
    metal: mi.metal ?? null,
    boundaryMarginFraction: mi.boundaryMarginFraction ?? null,
    dnEffPerV: dn,
    phasePerVPerM: k0 * dn,
    polarization,
    form,
    neff,
    lambdaUm,
    byRegion: p.triRegion ? byRegion : null,
    convention: EO_CONVENTIONS,
    assumptions: [
      'first_order_pockels_perturbation',
      'scalar_mode_dominant_component_only',
      polarization === 'TE' ? 'delta_eps_xx_with_Ex_weight' : 'delta_eps_yy_with_Ey_weight',
      'off_diagonal_delta_eps_neglected',
      'static_field_E_z_zero_2d',
    ],
  };
}

/**
 * Combine arm results into the MZM phase difference and V_pi*L under the frozen conventions.
 * @param {Object} p
 * @param {{dnEffPerV:number, arm?:string}} p.armA
 * @param {{dnEffPerV:number, arm?:string}|null} p.armB null = single-arm drive
 * @param {string} p.drive 'single_arm' (armB must be null) or 'two_arm_field_resolved' (armB required)
 * @param {number} p.lambdaUm vacuum wavelength
 * @param {string} p.terminalDrive 'single_ended' | 'differential' (echo only; no numerical effect)
 * @param {number} [p.balanceTolerance] with two arms, throws when |dn_B + dn_A| > tol |dn_A| only if `requirePushPull` is set
 * @param {boolean} [p.requirePushPull]
 * The result carries the union of both arms' labels/limitations, per-arm metal policy, margin fraction and convergence,
 * and the fixed status `unvalidated_analytic_only`: a V_pi*L is never returned without those markers.
 */
export function combineArms(p) {
  need(p, 'arguments');
  const { armA, armB, drive, lambdaUm, terminalDrive } = p;
  need(armA, 'armA');
  positive(lambdaUm, 'lambdaUm');
  if (!ARM_DRIVE_MODES.includes(drive)) fail(`drive must be one of ${ARM_DRIVE_MODES.join(', ')}; got ${drive}`);
  if (!TERMINAL_DRIVES.includes(terminalDrive)) fail(`terminalDrive must be one of ${TERMINAL_DRIVES.join(', ')}; got ${terminalDrive}`);
  if (!Number.isFinite(armA.dnEffPerV)) fail('armA.dnEffPerV must be finite');
  if (drive === 'single_arm' && armB != null) fail("drive 'single_arm' requires armB = null");
  if (drive === 'two_arm_field_resolved' && armB == null) fail("drive 'two_arm_field_resolved' requires armB");
  const dnB = armB ? armB.dnEffPerV : 0;
  if (!Number.isFinite(dnB)) fail('armB.dnEffPerV must be finite');
  const dnDiff = armA.dnEffPerV - dnB;
  const balance = armB && armA.dnEffPerV !== 0 ? armB.dnEffPerV / armA.dnEffPerV : null; // -1 = ideal push-pull
  if (p.requirePushPull && armB) {
    const tol = p.balanceTolerance;
    positive(tol, 'balanceTolerance');
    if (balance === null || Math.abs(balance + 1) > tol) fail(`arms are not push-pull within ${tol}: dn_B/dn_A = ${balance}`);
  }
  const k0 = (2 * Math.PI) / (lambdaUm * 1e-6);
  if (dnDiff === 0) fail('zero electro-optic phase difference per volt; V_pi is undefined');
  const vpiLVm = (lambdaUm * 1e-6) / (2 * Math.abs(dnDiff));
  const armsUsed = armB ? [armA, armB] : [armA];
  const converged = armsUsed.map((a) => a.converged ?? null);
  const labels = [...new Set([...OPTICAL_LABELS, ...armsUsed.flatMap((a) => a.labels ?? []), ...(converged.includes(false) ? ['mode_not_converged'] : [])])];
  const limitations = [...new Set(armsUsed.flatMap((a) => a.limitations ?? []))];
  return {
    status: EO_STATUS_LABEL,
    labels,
    limitations,
    converged: { A: converged[0], B: armB ? converged[1] : null, all: converged.includes(false) ? false : converged.includes(null) ? null : true },
    metal: { A: armA.metal ?? null, B: armB ? (armB.metal ?? null) : null },
    boundaryMarginFraction: { A: armA.boundaryMarginFraction ?? null, B: armB ? (armB.boundaryMarginFraction ?? null) : null },
    drive,
    terminalDrive,
    armA: armA.arm ?? 'A',
    armB: armB ? (armB.arm ?? 'B') : null,
    dnEffPerV: { A: armA.dnEffPerV, B: armB ? armB.dnEffPerV : null, difference: dnDiff },
    phaseDifferencePerVPerM: k0 * dnDiff,
    armGainVsArmA: armA.dnEffPerV !== 0 ? dnDiff / armA.dnEffPerV : null,
    pushPullBalance: balance,
    vpiLVm,
    vpiLVcm: vpiLVm * 100,
    convention: EO_CONVENTIONS,
  };
}

/** Antisymmetric idealisation: arm B with dn_B = -dn_A. Labelled; for design-space analysis and tests, not a substitute for a field-resolved arm B. */
export function idealPushPullArmB(armA) {
  need(armA, 'armA');
  return { arm: 'B(ideal_antisymmetric)', dnEffPerV: -armA.dnEffPerV, idealised: true };
}

/** V_pi at a device length for a V_pi*L product (V cm) and length (cm). */
export function vpiAtLength(vpiLVcm, lengthCm) {
  positive(vpiLVcm, 'vpiLVcm');
  positive(lengthCm, 'lengthCm');
  return vpiLVcm / lengthCm;
}

/**
 * Convenience wrapper tying the engine stages together for one arm: optical model + solved mode + electrostatics.
 * @param {{es:any, model:any, mode:any, modeIndex:number, arm?:string, acceptUnconverged?:boolean}} p
 * mode: result of solveModesAt (psi[], neff[], form, lambdaUm, converged, labels, metal, boundaryMarginFraction).
 * An unconverged mode throws unless `acceptUnconverged === true` is passed explicitly; the result then echoes
 * converged = false and the label `mode_not_converged`.
 */
export function eoOverlapFromEngine({ es, model, mode, modeIndex, arm, acceptUnconverged = false }) {
  need(es, 'es');
  need(model, 'model');
  need(mode, 'mode');
  if (!Number.isInteger(modeIndex) || modeIndex < 0 || modeIndex >= mode.neff.length) fail(`modeIndex must be an integer in [0, ${mode.neff.length - 1}]`);
  if (mode.converged !== true && acceptUnconverged !== true) fail(`mode did not converge (converged = ${mode.converged}); refusing to compute an overlap from it (pass acceptUnconverged: true to accept it explicitly)`);
  return eoOverlapArm({
    modeInfo: {
      labels: mode.labels,
      limitations: mode.limitations,
      metal: mode.metal ?? null,
      boundaryMarginFraction: mode.boundaryMarginFraction ? { marginUm: mode.boundaryMarginFraction.marginUm, value: mode.boundaryMarginFraction.perMode[modeIndex] } : null,
      converged: mode.converged === true,
      modeIndex,
    },
    mesh: model.mesh,
    geo: model.geo,
    psi: mode.psi[modeIndex],
    polarization: model.polarization,
    form: mode.form,
    neff: mode.neff[modeIndex],
    lambdaUm: mode.lambdaUm,
    lambda0Um: model.lambda0Um,
    triField: sampleFieldOnOpticalMesh(es, model),
    triMaterial: materialsPerTriangle(model),
    excluded: mode.excluded,
    triRegion: model.mesh.triRegion,
    regionNames: model.regions.map((r) => r.name),
    arm,
  });
}
