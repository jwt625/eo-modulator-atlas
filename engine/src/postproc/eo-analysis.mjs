// EO overlap analysis (DevLog-030 P5, DevLog-031 phase 2): integrand of the engine's first-order Pockels overlap split
// by Pockels coefficient and region, electrode gap of an arm from the geometry, conventional overlap Gamma and the
// implied textbook VpiL. The perturbation result of the engine (eo-overlap.mjs / vector-mode.vectorEoOverlap) stays
// primary; everything here is computed with the same quadrature, static-field sampling and material tensors, so the
// component sum reproduces the engine dn_eff/V to rounding. License: GPL-3.0-or-later.

import { epsOptLab, deltaEpsLab } from '../materials.mjs';
import { VECTOR_KERNELS } from '../vector-mode.mjs';
import { sampleFieldOnOpticalMesh } from '../eo-overlap.mjs';
import { triIntegralSquare } from '../optics.mjs';

/** Pockels coefficient groups of the 3m (LN, LT) Voigt matrix; entries outside these positions are `other`. */
export const POCKELS_COMPONENTS = Object.freeze(['r33', 'r13', 'r22', 'r51', 'other']);
const VOIGT_GROUP = (() => {
  const g = new Array(18).fill('other');
  const set = (I, j, name) => { g[3 * I + j] = name; };
  set(0, 2, 'r13'); set(1, 2, 'r13'); set(2, 2, 'r33');
  set(0, 1, 'r22'); set(1, 1, 'r22'); set(5, 0, 'r22');
  set(3, 1, 'r51'); set(4, 0, 'r51');
  return g;
})();

export const EO_FORMULAS = Object.freeze({
  engine: 'dn_eff/V = Re[(omega eps0 / (4 P)) int E* . (d eps/dV) . E dA] (first-order perturbation, full Pockels tensor incl. shear; vector: Hellmann-Feynman of the discrete pencil); VpiL = lambda / (2 |dn_A - dn_B|)',
  integrand: 'eo.integrand = d(n_eff)/dV per area (1/(V m^2)); vector: Re[k0 (e_t . d_eps . e_t + beta^2 d_eps_zz e_z^2) / (2 beta x^T B x)] (solver unknowns e_t = beta E_t, e_z = -j E_z); scalar TE: d_eps_xx u^2 / (2 n_eff int u^2 dA); scalar TM: (n_eff / 2) (d_eps_yy / n_yy^4) u^2 / int (u^2 / n_yy^2) dA, u = scalar solver field (E_x for TE, H_x for TM); its integral over the arm window is the engine dn_eff/V',
  components: 'd_eps = -eps d(1/eps) eps with only the Voigt entries of one coefficient kept: r33 (zz,z), r13 (xx,z; yy,z), r22 (xx,y; yy,y; xy,x), r51 (yz,y; xz,x), other (any remaining entry); the parts sum to the total (linear in r)',
  gap: 'g = lateral edge-to-edge distance between the bounding boxes of the nearest electrode left of the arm-window centre (right edge) and the nearest electrode right of it (left edge), when the two are at different potentials (mirror images included for mirror symmetry); electrodes whose bounding box spans the arm centre laterally but lies entirely above or below the arm window are ignored (ignoredElectrodes: backside ground, heater above the cladding); undefined when a spanning electrode overlaps the window height (e.g. z-cut electrode on the waveguide) or a side has no electrode',
  tensorTerms: 'split by lab tensor term of E* . d_eps . E: xx = d_eps_xx |E_x|^2, yy = d_eps_yy |E_y|^2, zz = d_eps_zz |E_z|^2, xy = 2 d_eps_xy Re(E_x* E_y) (d_eps_xz, d_eps_yz do not contribute at first order, E_z in quadrature); for x-cut LN with propagation along crystal y and an in-plane static field this equals the coefficient split: xx = r33, yy + zz = r13, xy = r51, r22 = 0 (DevLog-033 definitions)',
  gamma: 'Gamma = (g / V_gap) int_EO E_c |E_opt|^2 dA / int_window |E_opt|^2 dA; E_c = static field (per volt of terminal voltage) along the in-plane projection of the EO material c axis (lab x for x-cut); V_gap = potential difference of the two gap electrodes per terminal volt (1 for signal/ground at 1 V/0 V); EO = regions with Pockels coefficients; |E_opt|^2 = |Ex|^2 + |Ey|^2 + |Ez|^2 (vector) or the scalar dominant component; signed (sign of E_c); gammaEx: |E_x,opt|^2 in numerator and denominator; gammaByRegion: numerator restricted to one region; gammaEquiv = 2 g |dn_eff/V| / (n_e^3 r33) (the Gamma that reproduces the engine dn in the textbook formula)',
  ebar: 'Ebar = Gamma V_gap / g = int_EO E_c |E_opt|^2 dA / int_window |E_opt|^2 dA (V/m per terminal volt; independent of g)',
  textbook: 'dn_tb,arm = -(1/2) n_e^3 r33 Ebar_arm (= -(1/2) n_e^3 r33 Gamma V_gap / g); VpiL_textbook = lambda / (2 |dn_tb,A - dn_tb,B|) = lambda / (n_e^3 r33 |Ebar_A - Ebar_B|) (= lambda g / (2 n_e^3 r33 Gamma_mean) for equal gaps, V_gap = 1; single arm: lambda g / (n_e^3 r33 |Gamma|)); bulk n_e and r33 of the dominant EO material of arm A, no mode index factor; vpiLVcmTextbookEx uses the |E_x|^2 overlap',
  neffFactor: 'VpiL_neff = VpiL_textbook x n_eff,A / n_e (the n_e^4 / n_eff weight of a TE perturbation in a uniform field; equals the engine for a uniform field filling the EO region and equal arm indices)',
});

/**
 * Default-mesh accuracy statement carried with the EO outputs (audit E13). Measured in
 * DevLog/audits/simulator-r-eng-audit-2026-10-15.md against the independent references of DevLog-033.
 */
export const EO_ACCURACY_NOTE = 'Engine defaults (P2 electrostatics, p2_mesh_factor 2) vs independent references (DevLog-033; audit simulator-r-eng-audit-2026-10-15): dn_eff/V, Gamma, Gamma_equiv and the textbook VpiL differ by 1.4e-3 to 3.5e-3 relative on K4, K5 and K7K4 and by 0.3e-3 to 0.4e-3 on K7, set by the electrostatic discretisation (about first order in the electrostatic mesh scale); quote about three significant digits unless a mesh study converges further. The integrand split and the conventional quantities share that offset.';

const zeroVoigt = (r) => r.every((v) => v === 0);
function maskVoigt(r, name) {
  const out = new Float64Array(18);
  for (let k = 0; k < 18; k++) if (VOIGT_GROUP[k] === name) out[k] = r[k];
  return out;
}

/**
 * Optical and EO data per region of an optical model at a wavelength: optical permittivity (lab 3x3), principal indices,
 * and for Pockels materials the linear maps E -> d_eps for the full tensor and each coefficient group. Map layout:
 * 8 numbers [xx, xy, yy, zz] for a unit E_x then for a unit E_y (E_z = 0 in 2D).
 */
export function regionOpticalData(model, lambdaUm) {
  return model.regions.map((r) => {
    const m = model.mats[r.material];
    if (!m) return null;
    const e = m.conductor && !m.nCfg ? null : epsOptLab(m, lambdaUm, model.lambda0Um);
    if (!e) return { name: r.name, material: r.material, conductor: !!m.conductor, eps: null, eo: null };
    const out = { name: r.name, material: r.material, conductor: !!m.conductor, eps: e, n: [Math.sqrt(e[0]), Math.sqrt(e[4]), Math.sqrt(e[8])], eo: null };
    if (m.conductor || !m.r) return out;
    const map = (rr) => {
      const dx = deltaEpsLab(rr, m.A, e, [1, 0, 0]), dy = deltaEpsLab(rr, m.A, e, [0, 1, 0]);
      return Float64Array.of(dx[0], 0.5 * (dx[1] + dx[3]), dx[4], dx[8], dy[0], 0.5 * (dy[1] + dy[3]), dy[4], dy[8]);
    };
    const maps = { all: map(m.r) };
    for (const c of POCKELS_COMPONENTS) { const rr = maskVoigt(m.r, c); maps[c] = zeroVoigt(rr) ? null : map(rr); }
    // crystal c axis in lab coordinates: v_lab = A v_crystal, so c = A e_z (third column of A)
    const c = [m.A[2], m.A[5], m.A[8]];
    const ce = [e[0] * c[0] + e[1] * c[1] + e[2] * c[2], e[3] * c[0] + e[4] * c[1] + e[5] * c[2], e[6] * c[0] + e[7] * c[1] + e[8] * c[2]];
    const inPlane = Math.hypot(c[0], c[1]);
    out.eo = { maps, cAxis: c, cInPlane: inPlane > 1e-9 ? [c[0] / inPlane, c[1] / inPlane] : null, ne: Math.sqrt(c[0] * ce[0] + c[1] * ce[1] + c[2] * ce[2]), r33: m.r[8] };
    return out;
  });
}

/**
 * Electrode gap of an arm window from the geometry (see EO_FORMULAS.gap).
 * @param {any} section CrossSection
 * @param {{x:number[], y:number[]}} window arm window (um)
 * @param {number[]} potentials normalised electrode potentials (es.electrodePotentials, same order as section.electrodes)
 * @returns {{gapUm:number|null, left:string|null, right:string|null, vGap:number|null, reason:string|null}}
 */
export function armElectrodeGap(section, window, potentials) {
  const xc = 0.5 * (window.x[0] + window.x[1]);
  const g = section.geom;
  const list = section.electrodes.map((e, i) => ({ name: e.name, x0: e.bbox.x0, x1: e.bbox.x1, y0: e.bbox.y0, y1: e.bbox.y1, phi: potentials[i] }));
  if (g.symmetry === 'x_mirror_odd' || g.symmetry === 'x_mirror_even') {
    const xm = g.mirror_x_um, s = g.symmetry === 'x_mirror_odd' ? -1 : 1;
    for (const e of [...list]) list.push({ name: `${e.name}(mirror)`, x0: 2 * xm - e.x1, x1: 2 * xm - e.x0, y0: e.y0, y1: e.y1, phi: s * e.phi });
  }
  let left = null, right = null;
  const spanning = [], ignored = [];
  for (const e of list) {
    if (e.x1 <= xc) { if (!left || e.x1 > left.x1) left = e; }
    else if (e.x0 >= xc) { if (!right || e.x0 < right.x0) right = e; }
    // audit E9: an electrode spanning the arm centre laterally but entirely above or below the arm window (backside
    // ground plane, heater above the cladding) does not bound the arm laterally and is ignored for g
    else if (e.y1 <= window.y[0] || e.y0 >= window.y[1]) ignored.push(e.name);
    else spanning.push(e.name);
  }
  const none = (reason) => ({ gapUm: null, left: left?.name ?? null, right: right?.name ?? null, vGap: null, ignoredElectrodes: ignored, reason });
  if (spanning.length) return none(`electrode ${spanning.join(', ')} spans the arm centre laterally within the arm window's height; the lateral-gap Gamma is undefined`);
  if (!left || !right) return none(`no electrode on the ${!left ? 'left' : 'right'} of the arm centre`);
  const vGap = Math.abs(left.phi - right.phi);
  if (!(vGap > 1e-12)) return none(`the nearest electrodes ${left.name} and ${right.name} are at the same potential`);
  return { gapUm: right.x0 - left.x1, left: left.name, right: right.name, vGap, ignoredElectrodes: ignored, reason: null };
}

function emptyAcc(regions) {
  const z = () => Object.fromEntries(['all', ...POCKELS_COMPONENTS].map((c) => [c, [0, 0]]));
  return { total: z(), byRegion: regions.map(() => null), z };
}

/**
 * Vector arm: integrand split by Pockels coefficient and region, and the conventional-overlap integrals.
 * @param {any} model vector model (buildVectorModel)
 * @param {any} mode selected mode (solveVectorModes().modes entry)
 * @param {Float64Array} F static field per quadrature point (sampleStaticFieldQ) or per triangle (3 per triangle)
 * @param {number} lambdaUm
 */
export function vectorEoBreakdown(model, mode, F, lambdaUm) {
  const { Q4, newBasisBuffers, evalBasis, gatherLocal, pointFields, newPoint } = VECTOR_KERNELS;
  const { mesh, geo, area, edges } = model;
  const nT = mesh.nTris, nq = Q4.length;
  const perPoint = F.length === 3 * nq * nT;
  const regs = regionOpticalData(model, lambdaUm);
  const acc = emptyAcc(model.regions);
  const comps = ['all', ...POCKELS_COMPONENTS];
  const cr = new Float64Array(model.dof.nloc), ci = new Float64Array(model.dof.nloc);
  const B = newBasisBuffers(model.order), P = newPoint();
  const th = [mode.theta, mode.thetaIm ?? 0];
  const b2 = mode.beta * mode.beta + (mode.betaIm ?? 0) * (mode.betaIm ?? 0);
  let den = 0, denX = 0;
  const num = new Float64Array(model.regions.length), numX = new Float64Array(model.regions.length);
  const terms = { xx: [0, 0], yy: [0, 0], zz: [0, 0], xy: [0, 0] };
  for (let t = 0; t < nT; t++) {
    if (model.dead[t]) continue;
    gatherLocal(model, mode.x, mode.xIm ?? null, t, cr, ci);
    const rd = regs[mesh.triRegion[t]];
    const eo = rd?.eo ?? null;
    let racc = null;
    if (eo) racc = acc.byRegion[mesh.triRegion[t]] ??= acc.z();
    for (let q = 0; q < nq; q++) {
      const L = Q4[q];
      evalBasis(model.order, geo, edges, t, L, B);
      pointFields(model, B, cr, ci, P);
      const w = L[3] * area[t];
      const et = P.et, ez = P.ez;
      const e2 = (et[0] * et[0] + et[1] * et[1] + et[2] * et[2] + et[3] * et[3]) / b2 + ez[0] * ez[0] + ez[1] * ez[1];
      const ex2 = (et[0] * et[0] + et[1] * et[1]) / b2;
      den += w * e2;
      denX += w * ex2;
      if (!eo) continue;
      const f = perPoint ? 3 * (nq * t + q) : 3 * t;
      const Ex = F[f], Ey = F[f + 1];
      if (Ex === 0 && Ey === 0) continue;
      if (eo.cInPlane) {
        const ec = Ex * eo.cInPlane[0] + Ey * eo.cInPlane[1];
        num[mesh.triRegion[t]] += w * ec * e2;
        numX[mesh.triRegion[t]] += w * ec * ex2;
      }
      const ez2r = ez[0] * ez[0] - ez[1] * ez[1], ez2i = 2 * ez[0] * ez[1];
      {
        // tensor terms of the full map (unconjugated products of the solver unknowns)
        const M = eo.maps.all;
        const dxx = Ex * M[0] + Ey * M[4], dxy = Ex * M[1] + Ey * M[5], dyy = Ex * M[2] + Ey * M[6], dzz = Ex * M[3] + Ey * M[7];
        terms.xx[0] += w * dxx * (et[0] * et[0] - et[1] * et[1]); terms.xx[1] += w * dxx * 2 * et[0] * et[1];
        terms.yy[0] += w * dyy * (et[2] * et[2] - et[3] * et[3]); terms.yy[1] += w * dyy * 2 * et[2] * et[3];
        terms.xy[0] += w * 2 * dxy * (et[0] * et[2] - et[1] * et[3]); terms.xy[1] += w * 2 * dxy * (et[0] * et[3] + et[1] * et[2]);
        terms.zz[0] += w * dzz * (th[0] * ez2r - th[1] * ez2i); terms.zz[1] += w * dzz * (th[0] * ez2i + th[1] * ez2r);
      }
      for (const c of comps) {
        const M = eo.maps[c];
        if (!M) continue;
        const dxx = Ex * M[0] + Ey * M[4], dxy = Ex * M[1] + Ey * M[5], dyy = Ex * M[2] + Ey * M[6], dzz = Ex * M[3] + Ey * M[7];
        // unconjugated e_t . d . e_t (symTensorForm) + theta dzz e_z^2
        const vxr = dxx * et[0] + dxy * et[2], vxi = dxx * et[1] + dxy * et[3];
        const vyr = dxy * et[0] + dyy * et[2], vyi = dxy * et[1] + dyy * et[3];
        const fr = et[0] * vxr - et[1] * vxi + et[2] * vyr - et[3] * vyi + dzz * (th[0] * ez2r - th[1] * ez2i);
        const fi = et[0] * vxi + et[1] * vxr + et[2] * vyi + et[3] * vyr + dzz * (th[0] * ez2i + th[1] * ez2r);
        acc.total[c][0] += w * fr; acc.total[c][1] += w * fi;
        racc[c][0] += w * fr; racc[c][1] += w * fi;
      }
    }
  }
  // d n_eff = Re[k0 form / (2 beta x^T B x)] (vectorEoOverlap / dBetaFromForm)
  const k0 = (2 * Math.PI) / lambdaUm;
  const br = 2 * mode.beta, bi = 2 * (mode.betaIm ?? 0), xr = mode.xBx, xi = mode.xBxIm ?? 0;
  const dr = br * xr - bi * xi, di = br * xi + bi * xr, dd = dr * dr + di * di;
  const toDn = ([fr, fi]) => k0 * (fr * dr + fi * di) / dd;
  const byTensorTerm = Object.fromEntries(Object.entries(terms).map(([k, v]) => [k, toDn(v)]));
  return finish(acc, regs, model.regions, toDn, num, den, { kind: 'vector', byTensorTerm, numX, denX });
}

/**
 * Scalar arm: same split for the scalar overlap (eo-overlap.eoOverlapArm weights and centroid static-field sampling).
 */
export function scalarEoBreakdown(es, model, mode, modeIndex) {
  const { mesh, geo } = model;
  const nT = mesh.nTris;
  const lambdaUm = mode.lambdaUm;
  const regs = regionOpticalData(model, lambdaUm);
  const psi = mode.psi[modeIndex], neff = mode.neff[modeIndex];
  const te = model.polarization === 'TE';
  const comp = te ? 0 : 2; // index into the 4-vector [xx, xy, yy, zz]
  const ecomp = te ? 0 : 4; // index into the 3x3 eps
  const F = sampleFieldOnOpticalMesh(es, model);
  const I = triIntegralSquare(mesh, geo, psi);
  const acc = emptyAcc(model.regions);
  const comps = ['all', ...POCKELS_COMPONENTS];
  const num = new Float64Array(model.regions.length);
  let den = 0, denE = 0;
  for (let t = 0; t < nT; t++) {
    if (mode.excluded?.[t]) continue;
    const rd = regs[mesh.triRegion[t]];
    if (!rd?.eps) continue;
    const n2 = rd.eps[ecomp];
    const wPower = te ? I[t] : I[t] / n2, wField = te ? I[t] : I[t] / (n2 * n2);
    den += wPower;
    denE += wField; // |E_dominant|^2 weight: TE psi^2, TM psi^2 / n_yy^4
    const eo = rd.eo;
    if (!eo) continue;
    const Ex = F[3 * t], Ey = F[3 * t + 1];
    if (eo.cInPlane) num[mesh.triRegion[t]] += (Ex * eo.cInPlane[0] + Ey * eo.cInPlane[1]) * wField;
    const racc = acc.byRegion[mesh.triRegion[t]] ??= acc.z();
    for (const c of comps) {
      const M = eo.maps[c];
      if (!M) continue;
      const d = Ex * M[comp] + Ey * M[4 + comp];
      acc.total[c][0] += d * wField;
      racc[c][0] += d * wField;
    }
  }
  const toDn = ([s]) => (te ? s / (2 * neff * den) : (neff / 2) * (s / den));
  const all = toDn(acc.total.all);
  // scalar: only the dominant component is modelled (TE: E_x -> xx; TM: E_y -> yy)
  const byTensorTerm = { xx: te ? all : 0, yy: te ? 0 : all, zz: 0, xy: 0 };
  return finish(acc, regs, model.regions, toDn, num, denE, { kind: 'scalar', byTensorTerm, numX: te ? num : null, denX: te ? denE : null, den, polarization: model.polarization, neff, staticField: F });
}

function finish(acc, regs, regions, toDn, num, den, extra) {
  const byComponent = {};
  for (const c of ['all', ...POCKELS_COMPONENTS]) byComponent[c] = toDn(acc.total[c]);
  const sumParts = POCKELS_COMPONENTS.reduce((s, c) => s + byComponent[c], 0);
  const byRegion = {};
  acc.byRegion.forEach((a, i) => {
    if (!a) return;
    const row = {};
    for (const c of ['all', ...POCKELS_COMPONENTS]) row[c] = toDn(a[c]);
    byRegion[regions[i].name] = row;
  });
  // conventional overlap: Ebar = int_EO E_c |E|^2 / int |E|^2, dominant EO material by |numerator|
  let numTot = 0, best = -1;
  num.forEach((v, i) => { numTot += v; if (v !== 0 && (best < 0 || Math.abs(v) > Math.abs(num[best]))) best = i; });
  const dom = best >= 0 ? regs[best] : null;
  const numXTot = extra.numX ? extra.numX.reduce((a, b) => a + b, 0) : null;
  return {
    total: byComponent.all, byComponent, componentSum: sumParts, byRegion,
    overlap: { ebarVPerM: den > 0 ? numTot / den : null, ebarExVPerM: numXTot != null && extra.denX > 0 ? numXTot / extra.denX : null,
      ebarByRegion: Object.fromEntries([...num].map((v, i) => [regions[i].name, den > 0 ? v / den : null]).filter(([, v]) => v)), eoRegion: dom?.name ?? null, eoMaterial: dom?.material ?? null, ne: dom?.eo?.ne ?? null, r33: dom?.eo?.r33 ?? null, cAxisLab: dom?.eo?.cAxis ?? null,
      cInPlane: dom?.eo?.cInPlane ?? null, numeratorByRegion: Object.fromEntries([...num].map((v, i) => [regions[i].name, v]).filter(([, v]) => v !== 0)), denominator: den },
    ...extra, numX: undefined,
  };
}

/**
 * Conventional-overlap record of one arm (EO_FORMULAS.gamma / textbook): gap, Gamma, Ebar and the single-arm implied VpiL.
 * @param {ReturnType<typeof finish>} bd breakdown of the arm
 */
export function armConventional(bd, gap, lambdaUm, neff, dnEngine = bd.total) {
  const o = bd.overlap;
  const lam = lambdaUm * 1e-6;
  const rec = {
    gapUm: gap.gapUm, gapElectrodes: gap.left || gap.right ? { left: gap.left, right: gap.right } : null, gapVoltagePerVt: gap.vGap,
    gapIgnoredElectrodes: gap.ignoredElectrodes ?? [],
    gapReason: gap.reason, ebarVPerMPerV: o.ebarVPerM, ebarExVPerMPerV: o.ebarExVPerM, gamma: null, gammaEx: null, gammaByRegion: null, gammaEquiv: null,
    eoRegion: o.eoRegion, eoMaterial: o.eoMaterial, ne: o.ne, r33PmPerV: o.r33 == null ? null : o.r33 * 1e12, cAxisLab: o.cAxisLab, neff,
    vpiLVcmTextbook: null, vpiLVcmNeffFactor: null, reason: null,
  };
  if (o.ebarVPerM == null || !o.eoMaterial) { rec.reason = 'no Pockels material with an in-plane c axis carries mode power in the window'; return rec; }
  if (!o.cInPlane) { rec.reason = 'c axis of the EO material is along the propagation direction; E_c is undefined'; return rec; }
  const r = Math.abs(o.r33);
  if (gap.gapUm != null) {
    const gv = (gap.gapUm * 1e-6) / gap.vGap;
    rec.gamma = gv * o.ebarVPerM;
    rec.gammaEx = o.ebarExVPerM == null ? null : gv * o.ebarExVPerM;
    rec.gammaByRegion = Object.fromEntries(Object.entries(o.ebarByRegion).map(([k, v]) => [k, gv * v]));
    if (r > 0) rec.gammaEquiv = (2 * gap.gapUm * 1e-6 * Math.abs(dnEngine)) / (gap.vGap * o.ne ** 3 * r);
  }
  if (r > 0 && o.ebarVPerM !== 0) {
    // single-arm textbook value lambda / (n_e^3 r33 |Ebar|) and the n_eff / n_e variant
    rec.vpiLVcmTextbook = (lam / (o.ne ** 3 * r * Math.abs(o.ebarVPerM))) * 100;
    rec.vpiLVcmNeffFactor = rec.vpiLVcmTextbook * (neff / o.ne);
  }
  return rec;
}

/** Combined conventional record (two arms or single arm) with the engine value for comparison. */
export function combinedConventional(A, B, lambdaUm, engineVpiLVcm) {
  const lam = lambdaUm * 1e-6;
  const out = { vpiLVcmTextbook: null, vpiLVcmTextbookEx: null, vpiLVcmNeffFactor: null, engineVpiLVcm, engineOverTextbook: null, materialNote: null };
  if (A.ebarVPerMPerV == null || A.ne == null || !A.r33PmPerV) return out;
  const r = Math.abs(A.r33PmPerV) * 1e-12;
  const eb = B ? A.ebarVPerMPerV - (B.ebarVPerMPerV ?? 0) : A.ebarVPerMPerV;
  if (B && B.eoMaterial && B.eoMaterial !== A.eoMaterial) out.materialNote = `arm B EO material ${B.eoMaterial} differs from arm A ${A.eoMaterial}; n_e and r33 of arm A used`;
  if (eb !== 0) out.vpiLVcmTextbook = (lam / (A.ne ** 3 * r * Math.abs(eb))) * 100;
  const ebx = A.ebarExVPerMPerV == null ? null : B ? A.ebarExVPerMPerV - (B.ebarExVPerMPerV ?? 0) : A.ebarExVPerMPerV;
  if (ebx) out.vpiLVcmTextbookEx = (lam / (A.ne ** 3 * r * Math.abs(ebx))) * 100;
  if (out.vpiLVcmTextbook) out.vpiLVcmNeffFactor = out.vpiLVcmTextbook * (A.neff / A.ne);
  if (out.vpiLVcmTextbook) out.engineOverTextbook = engineVpiLVcm / out.vpiLVcmTextbook;
  return out;
}

/** Serializable breakdown for result.eo (drops typed arrays). */
export function breakdownSummary(bd, engineDn) {
  return {
    dnEffPerV: bd.total, byComponent: Object.fromEntries(POCKELS_COMPONENTS.map((c) => [c, bd.byComponent[c]])), componentSum: bd.componentSum,
    byTensorTerm: bd.byTensorTerm,
    relativeDifferenceVsEngine: engineDn !== 0 ? Math.abs(bd.total - engineDn) / Math.abs(engineDn) : null,
    byRegion: bd.byRegion, method: bd.kind === 'vector' ? 'six_point_quadrature_vector_pencil_form' : 'scalar_overlap_weights_centroid_static_field',
  };
}
