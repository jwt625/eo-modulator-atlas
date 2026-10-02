// Scalar optical mode solver on a conforming triangle mesh (P1 FEM), shift-and-invert subspace iteration.
//
// Every result of this module carries the label `scalar_optical_not_full_vector`.
// Two scalar weak forms are available (both exact in their slab limits and tested against the slab
// dispersion relations):
//   form 'E'  (quasi-TE, psi = E_x):    -lap psi - k0^2 n^2 psi = -beta^2 psi
//   form 'H'  (quasi-TM, psi = H_x):     div(n^-2 grad psi) + k0^2 psi = beta^2 n^-2 psi
// Quasi-TE uses the lab-frame n_xx component of each material. Quasi-TM uses eps_yy in the mass term (E_y = beta H_x /
// (omega eps0 eps_yy)) and, since 2026-10-02 (E2, Q2 finding F3), eps_zz (propagation axis) in the gradient term
// (E_z = (1/(i omega eps0 eps_zz)) d(H_x)/dy); for isotropic or n_yy = n_zz materials this is the previous equation.
//
// SCALAR-FORM LIMITATION (Q2 finding F1; machine-readable flag `scalar_forms_exact_only_at_horizontal_interfaces` in
// result.limitations). Both forms are exact for interfaces whose normal is the film normal y (horizontal interfaces; slab
// tests). At VERTICAL interfaces (normal x) the roles are swapped: form E enforces continuity of psi = E_x, but E_x is the
// field component NORMAL to such a wall (physical D_x continuity makes E_x jump by the permittivity ratio), so form E there
// reproduces the physical TANGENTIAL-field (quasi-TM-like) result; form H (psi = H_x, continuous n^-2 d_n psi) reproduces
// the physical NORMAL-field (quasi-TE-like) result. Illustration for a laterally stratified slab (core 2.2 / clad 1.45,
// 0.6 um wide, 1.55 um): engine TE 2.02960 vs physical E-normal 1.94848, engine TM 1.94839 vs physical E-tangential 2.02969.
// This is a pure vertical-wall upper-limit illustration, not a rib number; rib sidewalls mix both interface types and the
// resulting error in n_eff and in the Pockels power weight psi^2 is unquantified without a vector reference.
// License: GPL-3.0-or-later.

import { assemble, restrictMatrix, triangleGeometry } from './fem.mjs';
import { buildPattern, ndOrder, SparseCholesky, jacobiEigen, matVec } from './sparse.mjs';
import { CrossSection } from './section.mjs';
import { epsOptLab, opticalIndexAt, libraryIndex } from './materials.mjs';

export const OPTICAL_LABELS = ['scalar_optical_not_full_vector'];
/** Machine-readable limitation codes carried in every solveModesAt result (and downstream EO results). */
export const OPTICAL_LIMITATIONS = Object.freeze(['scalar_forms_exact_only_at_horizontal_interfaces', 'scalar_tm_lateral_gradient_uses_eps_zz_approximation']);

/**
 * Handling of a conductor that intersects the optical window (E2 model option; opt-in).
 *  - 'reject' (default): throw. The scalar solver has no metal model and no metal index is ever invented.
 *  - 'absent': the conductor is NOT part of the optical model; its footprint takes the underlying
 *    dielectric region. Limit "metal optically absent". Result label optical_metal_absent_limit.
 *  - 'pec_scalar': conductor triangles are removed and the metal surface is treated as a perfect electric
 *    conductor in the scalar equation (quasi-TE form E: psi = 0 on the metal boundary; quasi-TM form H:
 *    natural zero-normal-derivative). Exact only on faces whose normal is the film normal (horizontal faces);
 *    other faces violate the scalar derivation. Limit "metal ideal". Label optical_metal_pec_scalar_approximation.
 * Neither option is a real-metal result. They bracket it only to the extent that a real conductor lies between
 * "absent" and "ideal"; the difference of the two solves is the sensitivity of the mode to the metal.
 */
export const METAL_POLICIES = ['reject', 'absent', 'pec_scalar'];
const METAL_LABELS = { absent: 'optical_metal_absent_limit', pec_scalar: 'optical_metal_pec_scalar_approximation' };
const OFFDIAG_TOL = 1e-9; // relative to the largest diagonal entry; rotation by multiples of 90 deg is diagonal to round-off

/**
 * Build the optical sub-model (window mesh) of a cross-section.
 * Electrode regions are retained so that a metal intersecting the window is rejected.
 */
export function buildOpticalModel(section, mats, opts) {
  const { window: win, polarization, lambda0Um } = opts;
  const metalPolicy = opts.metal ?? 'reject';
  if (!METAL_POLICIES.includes(metalPolicy)) throw new Error(`optical: metal policy must be one of ${METAL_POLICIES.join(', ')}; got ${metalPolicy}`);
  if (polarization !== 'TE' && polarization !== 'TM') throw new Error(`optical: polarization must be TE or TM; got ${polarization}`);
  const g = section.geom;
  const wnd = win ?? g.optical_window;
  if (!wnd) throw new Error(`cross-section ${section.name}: optical_window is required for the optical mode stage`);
  const regions = [...g.regions.map((r) => ({ name: r.name, material: r.material, poly: r.poly }))];
  if (metalPolicy !== 'absent') for (const e of g.electrodes) regions.push({ name: `electrode:${e.name}`, material: e.material, poly: e.poly });
  const geomOpt = {
    symmetry: 'none',
    mirror_x_um: 0,
    domain: { x: wnd.x, y: wnd.y },
    regions,
    electrodes: [],
    optical_window: null,
    mesh: {},
    boundary: opts.boundary ?? {},
  };
  const os = new CrossSection(geomOpt, `${section.name}:optical`);
  const comp = polarization === 'TM' ? 4 : 0; // eps_opt_yy index 4, eps_opt_xx index 0
  // reference index at lambda0 per region (selected component)
  const regionN0 = regions.map((r) => {
    const m = mats[r.material];
    if (!m) throw new Error(`optical: unknown material ${r.material}`);
    if (metalPolicy === 'pec_scalar' && m.conductor) return null; // no optical index for metal, ever
    const e = epsOptLab(m, lambda0Um, lambda0Um);
    return e ? Math.sqrt(e[comp]) : null;
  });
  // which regions intersect the window (bounding-box test is enough for sizing)
  const inWin = (r) => {
    const b = os.regions.find((q) => q.name === r.name)?.bbox;
    return b && b.x1 >= wnd.x[0] && b.x0 <= wnd.x[1] && b.y1 >= wnd.y[0] && b.y0 <= wnd.y[1];
  };
  let nMax = 0;
  regions.forEach((r, i) => {
    if (inWin(r) && regionN0[i] !== null) nMax = Math.max(nMax, regionN0[i]);
  });
  if (!(nMax > 0) || !Number.isFinite(nMax)) throw new Error('optical: no finite positive index in the optical window');
  const core = [];
  regions.forEach((r, i) => {
    if (inWin(r) && regionN0[i] !== null && regionN0[i] >= nMax - 0.02 * nMax) core.push(r);
  });
  const lam = lambda0Um;
  const hints = opts.hints ?? {};
  const scale = opts.meshScale ?? 1;
  const coreEdge = (hints.core_edge_um ?? lam / (nMax * 22)) * scale;
  const maxEdge = (hints.max_edge_um ?? lam / 8) * scale;
  const grade = hints.grade ?? 0.25;
  const sources = core.map((r) => ({ poly: r.poly, filled: true, h0: coreEdge, grade }));
  const mesh = os.buildMesh({ sourcesOnly: true, hints: { max_edge_um: maxEdge, grade, max_vertices: g.mesh?.max_vertices ?? 80000 }, extraSources: sources, scale: 1, minAngleBound: 1.35 });
  mesh.rect = os.rect;
  const geo = triangleGeometry(mesh);
  const pat = buildPattern(mesh.nNodes, mesh.tri);
  // conductors actually present in the optical mesh (mesh membership, not bounding boxes)
  const usedRegions = new Set(mesh.triRegion);
  const metalNames = regions.filter((r, i) => mats[r.material]?.conductor && usedRegions.has(i)).map((r) => r.name);
  const omittedMetal = metalPolicy === 'absent' ? g.electrodes.filter((e) => polygonBBoxHits(e.poly, wnd)).map((e) => `electrode:${e.name}`) : [];
  const metal = { policy: metalPolicy, inMesh: metalNames, omittedFromModel: omittedMetal, labels: METAL_LABELS[metalPolicy] ? [METAL_LABELS[metalPolicy]] : [] };
  return { section, os, mats, mesh, geo, pat, regions, polarization, lambda0Um, window: wnd, boundary: opts.boundary ?? {}, nMax, coreNames: core.map((c) => c.name), coreEdge, maxEdge, metal };
}

function polygonBBoxHits(poly, w) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  return Math.max(...xs) >= w.x[0] && Math.min(...xs) <= w.x[1] && Math.max(...ys) >= w.y[0] && Math.min(...ys) <= w.y[1];
}

/**
 * Conductors whose bounding box meets a window (cheap pre-check; the solver itself uses mesh membership).
 * @returns {string[]} electrode names
 */
export function metalInWindow(section, win = null) {
  const w = win ?? section.geom.optical_window;
  if (!w) throw new Error(`cross-section ${section.name}: optical_window is required`);
  return section.geom.electrodes.filter((e) => polygonBBoxHits(e.poly, w)).map((e) => e.name);
}

/** Library dispersion validity at the anchor wavelength (materials.mjs checks only the evaluation wavelength). */
function assertAnchorInRange(m, lambda0Um) {
  if (!m.dispersionKey) return;
  for (const comp of ['n', 'n_o', 'n_e']) {
    const l = libraryIndex(m.dispersionKey, comp, lambda0Um);
    if (l && !l.inRange) throw new Error(`optical: material ${m.name} dispersion anchor wavelength ${lambda0Um} um is outside the library validity range`);
  }
}

/** Per-triangle n^2 for a wavelength. Conductor triangles (policy pec_scalar only) carry 0 and are excluded from the mode equation. */
export function n2Triangles(model, lambdaUm, compOverride = null) {
  const comp = compOverride ?? (model.polarization === 'TM' ? 4 : 0);
  const used = new Set(model.mesh.triRegion);
  const per = model.regions.map((r, i) => {
    // Off-window electrodes need no optical index. A metal actually present in
    // the window still fails explicitly: this scalar solver cannot model it.
    if (!used.has(i)) return null;
    const m = model.mats[r.material];
    if (m.conductor) {
      if (model.metal?.policy === 'pec_scalar') return 0;
      throw new Error(`optical: conductor ${r.material} intersects the optical window; metal optical modes are unsupported (opt in with metal policy 'absent' or 'pec_scalar' to bracket the metal explicitly)`);
    }
    assertAnchorInRange(m, model.lambda0Um);
    const index = opticalIndexAt(m, lambdaUm, model.lambda0Um);
    if (index && !index.inRange) throw new Error(`optical: material ${r.material} dispersion is out of range at ${lambdaUm} um`);
    const e = epsOptLab(m, lambdaUm, model.lambda0Um);
    if (!e) throw new Error(`material ${r.material} has no optical index`);
    const dmax = Math.max(e[0], e[4], e[8]);
    for (const k of [1, 2, 3, 5, 6, 7]) if (Math.abs(e[k]) > OFFDIAG_TOL * dmax) throw new Error(`optical: material ${r.material} has an off-diagonal lab-frame permittivity (crystal rotation not a multiple of 90 deg); the scalar solver would silently ignore it`);
    if (!Number.isFinite(e[comp]) || e[comp] <= 0) throw new Error(`material ${r.material} has no finite positive optical permittivity`);
    return e[comp];
  });
  const out = new Float64Array(model.mesh.nTris);
  for (let t = 0; t < model.mesh.nTris; t++) out[t] = per[model.mesh.triRegion[t]];
  return out;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Solve for the guided modes at one wavelength.
 * @returns {{neff:number[], psi:Float64Array[], theta:number[], iterations:number, form:string, warm:any}}
 */
export function solveModesAt(model, lambdaUm, { numModes = 2, form = null, warm = null, tol = 1e-11, maxIter = 120, marginUm = null } = {}) {
  const { mesh, geo, pat } = model;
  const pol = model.polarization;
  const useForm = form ?? (pol === 'TM' ? 'H' : 'E');
  const k0 = (2 * Math.PI) / lambdaUm;
  const n2 = n2Triangles(model, lambdaUm);
  // quasi-TM gradient coefficient uses eps_zz (lab index 8); mass term and spectrum bound use eps_yy (= n2)
  const n2z = useForm === 'H' ? n2Triangles(model, lambdaUm, 8) : null;
  const nT = mesh.nTris;
  let nMax2 = 0;
  for (const v of n2) if (v > nMax2) nMax2 = v;
  // triangles removed from the equation (conductor under policy pec_scalar)
  const excluded = new Uint8Array(nT);
  let nExcluded = 0;
  for (let t = 0; t < nT; t++) if (n2[t] === 0) { excluded[t] = 1; nExcluded++; }
  let cTri, mA, mB;
  if (useForm === 'E') {
    cTri = new Float64Array(3 * nT);
    mA = new Float64Array(nT);
    mB = new Float64Array(nT).fill(1);
    for (let t = 0; t < nT; t++) {
      if (excluded[t]) { mB[t] = 0; continue; }
      cTri[3 * t] = 1;
      cTri[3 * t + 2] = 1;
      mA[t] = -k0 * k0 * n2[t];
    }
  } else {
    cTri = new Float64Array(3 * nT);
    mA = new Float64Array(nT).fill(-k0 * k0);
    mB = new Float64Array(nT);
    for (let t = 0; t < nT; t++) {
      if (excluded[t]) { mA[t] = 0; continue; }
      cTri[3 * t] = 1 / n2z[t];
      cTri[3 * t + 2] = 1 / n2z[t];
      mB[t] = 1 / n2[t];
    }
  }
  const Afull = assemble(mesh, geo, pat, cTri, mA);
  const Bfull = assemble(mesh, geo, pat, null, mB);

  // Dirichlet at window boundary (per side)
  const bc = model.boundary ?? {};
  const rect = mesh.rect;
  const tolx = 1e-9 * Math.hypot(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const isFree = new Uint8Array(mesh.nNodes).fill(1);
  const side = (name) => (bc[name] ?? 'dirichlet') === 'dirichlet';
  for (let i = 0; i < mesh.nNodes; i++) {
    const x = mesh.x[i],
      y = mesh.y[i];
    if ((side('left') && Math.abs(x - rect.x0) < tolx) || (side('right') && Math.abs(x - rect.x1) < tolx) || (side('bottom') && Math.abs(y - rect.y0) < tolx) || (side('top') && Math.abs(y - rect.y1) < tolx)) isFree[i] = 0;
  }
  let pecFaces = null;
  if (nExcluded) {
    // nodes touched only by removed triangles carry no equation; for the E form every node on the
    // metal boundary is Dirichlet (PEC, E tangential = 0); the H form keeps them free (natural Neumann).
    const touchedLive = new Uint8Array(mesh.nNodes), touchedDead = new Uint8Array(mesh.nNodes);
    for (let t = 0; t < nT; t++) for (let a = 0; a < 3; a++) (excluded[t] ? touchedDead : touchedLive)[mesh.tri[3 * t + a]] = 1;
    for (let i = 0; i < mesh.nNodes; i++) if (touchedDead[i] && (!touchedLive[i] || useForm === 'E')) isFree[i] = 0;
    pecFaces = pecFaceSummary(mesh, excluded);
  }
  const sub = restrictMatrix(pat, Afull, isFree);
  const nf = sub.nf;
  const Av = sub.val;
  const Bv = new Float64Array(sub.pat.nnz);
  for (let q = 0; q < Bv.length; q++) Bv[q] = Bfull[sub.src[q]];
  const fx = new Float64Array(nf),
    fy = new Float64Array(nf);
  for (let i = 0; i < mesh.nNodes; i++)
    if (sub.map[i] >= 0) {
      fx[sub.map[i]] = mesh.x[i];
      fy[sub.map[i]] = mesh.y[i];
    }
  const perm = warm?.perm && warm.nf === nf ? warm.perm : ndOrder(sub.pat, fx, fy);
  const chol = new SparseCholesky(sub.pat, perm);
  const Cv = new Float64Array(sub.pat.nnz);
  const factorShift = (sigma) => {
    for (let q = 0; q < Cv.length; q++) Cv[q] = Av[q] - sigma * Bv[q];
    return chol.factor(Cv);
  };

  // lower bound of spectrum:  lambda_min >= -k0^2 n_max^2  (E form);  H form: -k0^2 n_max^2 as well
  let sigma = -k0 * k0 * nMax2 * (1 + 1e-3);
  if (!factorShift(sigma)) throw new Error('optics: shifted matrix not positive definite (check mesh / materials)');
  const p = numModes + 3;
  // initial vectors
  let X;
  if (warm?.X && warm.nf === nf && warm.X.length >= p) X = warm.X.slice(0, p).map((v) => Float64Array.from(v));
  else {
    X = [];
    let seed = 12345;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296 - 0.5;
    };
    for (let k = 0; k < p; k++) {
      const v = new Float64Array(nf);
      // seed with smooth bump centered on the highest-index region plus randomness
      for (let i = 0; i < nf; i++) v[i] = rnd();
      X.push(v);
    }
  }
  const sp = { n: nf, rowptr: sub.pat.rowptr, colidx: sub.pat.colidx };
  const mv = (val, x) => matVec(sp, val, x);
  let theta = new Float64Array(p).fill(Infinity);
  let iters = 0;
  let converged = false;
  let shiftUpdated = false;
  let stable = 0;
  for (let it = 1; it <= maxIter; it++) {
    iters = it;
    const Y = X.map((x) => chol.solve(mv(Bv, x)));
    // Rayleigh-Ritz
    const AY = Y.map((y) => mv(Av, y));
    const BY = Y.map((y) => mv(Bv, y));
    const H = new Float64Array(p * p),
      M = new Float64Array(p * p);
    for (let i = 0; i < p; i++)
      for (let j = i; j < p; j++) {
        const h = dot(Y[i], AY[j]),
          m = dot(Y[i], BY[j]);
        H[i * p + j] = H[j * p + i] = h;
        M[i * p + j] = M[j * p + i] = m;
      }
    // Cholesky of M (dense)
    const L = new Float64Array(p * p);
    let okc = true;
    for (let i = 0; i < p && okc; i++)
      for (let j = 0; j <= i; j++) {
        let s = M[i * p + j];
        for (let k = 0; k < j; k++) s -= L[i * p + k] * L[j * p + k];
        if (i === j) {
          if (!(s > 0)) {
            okc = false;
            break;
          }
          L[i * p + i] = Math.sqrt(s);
        } else L[i * p + j] = s / L[j * p + j];
      }
    if (!okc) throw new Error('optics: subspace became rank deficient');
    // G = L^-1 H L^-T
    const T = new Float64Array(p * p);
    for (let c = 0; c < p; c++)
      for (let i = 0; i < p; i++) {
        let s = H[i * p + c];
        for (let k = 0; k < i; k++) s -= L[i * p + k] * T[k * p + c];
        T[i * p + c] = s / L[i * p + i];
      }
    const G = new Float64Array(p * p);
    for (let r = 0; r < p; r++)
      for (let i = 0; i < p; i++) {
        let s = T[r * p + i];
        for (let k = 0; k < i; k++) s -= L[i * p + k] * G[r * p + k];
        G[r * p + i] = s / L[i * p + i];
      }
    for (let i = 0; i < p; i++) for (let j = 0; j < i; j++) G[i * p + j] = G[j * p + i] = 0.5 * (G[i * p + j] + G[j * p + i]);
    const { values, vectors } = jacobiEigen(G, p);
    // back-transform vectors: V = L^-T W
    const V = new Float64Array(p * p);
    for (let c = 0; c < p; c++)
      for (let i = p - 1; i >= 0; i--) {
        let s = vectors[i * p + c];
        for (let k = i + 1; k < p; k++) s -= L[k * p + i] * V[k * p + c];
        V[i * p + c] = s / L[i * p + i];
      }
    const Xn = [];
    for (let c = 0; c < p; c++) {
      const v = new Float64Array(nf);
      for (let i = 0; i < p; i++) {
        const w = V[i * p + c];
        const yi = Y[i];
        for (let q = 0; q < nf; q++) v[q] += w * yi[q];
      }
      Xn.push(v);
    }
    let dmax = 0;
    for (let k = 0; k < numModes; k++) dmax = Math.max(dmax, Math.abs(values[k] - theta[k]) / Math.max(1, Math.abs(values[k])));
    theta = Float64Array.from(values);
    X = Xn;
    if (dmax < tol) {
      stable++;
      if (stable >= 2) {
        converged = true;
        break;
      }
    } else stable = 0;
    // one-time shift update closer to the lowest eigenvalue
    if (!shiftUpdated && it >= 4 && dmax < 1e-4) {
      const s2 = theta[0] - 0.15 * (theta[0] - sigma);
      if (factorShift(s2)) sigma = s2;
      else factorShift(sigma);
      shiftUpdated = true;
    }
  }
  // assemble outputs
  const neff = [];
  const psi = [];
  for (let k = 0; k < numModes; k++) {
    const th = theta[k];
    neff.push(Math.sqrt(Math.max(-th, 0)) / k0);
    const full = new Float64Array(mesh.nNodes);
    for (let i = 0; i < mesh.nNodes; i++) if (sub.map[i] >= 0) full[i] = X[k][sub.map[i]];
    // normalise: max |psi| = 1 with positive peak
    let mx = 0,
      sg = 1;
    for (let i = 0; i < full.length; i++)
      if (Math.abs(full[i]) > mx) {
        mx = Math.abs(full[i]);
        sg = Math.sign(full[i]);
      }
    for (let i = 0; i < full.length; i++) full[i] *= sg / mx;
    psi.push(full);
  }
  const margin = marginUm ?? 0.1 * Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const boundaryMarginFraction = psi.map((f) => marginFraction(mesh, geo, f, rect, side, margin, excluded));
  const labels = [...OPTICAL_LABELS, ...(model.metal?.labels ?? [])];
  const limitations = OPTICAL_LIMITATIONS.filter((c) => useForm === 'H' || c !== 'scalar_tm_lateral_gradient_uses_eps_zz_approximation');
  const metal = model.metal ? { ...model.metal, excludedTriangles: nExcluded, pecFaces } : null;
  return { neff, psi, theta: Array.from(theta).slice(0, numModes), iterations: iters, converged, form: useForm, n2, excluded, k0, lambdaUm, warm: { X, nf, perm }, labels, limitations,
    metal, boundaryMarginFraction: { marginUm: margin, perMode: boundaryMarginFraction } };
}

/** Fraction of integral psi^2 in triangles whose centroid lies within `margin` of a Dirichlet window side (leakage/truncation diagnostic). */
function marginFraction(mesh, geo, f, rect, isDirichletSide, margin, excluded) {
  const tri = triIntegralSquare(mesh, geo, f);
  let tot = 0, inMargin = 0;
  for (let t = 0; t < mesh.nTris; t++) {
    if (excluded[t]) continue;
    const a = mesh.tri[3 * t], b = mesh.tri[3 * t + 1], c = mesh.tri[3 * t + 2];
    const cx = (mesh.x[a] + mesh.x[b] + mesh.x[c]) / 3, cy = (mesh.y[a] + mesh.y[b] + mesh.y[c]) / 3;
    tot += tri[t];
    if ((isDirichletSide('left') && cx - rect.x0 < margin) || (isDirichletSide('right') && rect.x1 - cx < margin) || (isDirichletSide('bottom') && cy - rect.y0 < margin) || (isDirichletSide('top') && rect.y1 - cy < margin)) inMargin += tri[t];
  }
  return tot > 0 ? inMargin / tot : NaN;
}

/** Length (um) of removed-metal faces by orientation: horizontal (normal along the film normal y) is the only orientation where the scalar PEC condition is exact. */
function pecFaceSummary(mesh, excluded) {
  const edges = new Map();
  for (let t = 0; t < mesh.nTris; t++)
    for (let e = 0; e < 3; e++) {
      const u = mesh.tri[3 * t + e], v = mesh.tri[3 * t + (e + 1) % 3];
      const key = u < v ? `${u}_${v}` : `${v}_${u}`;
      const rec = edges.get(key) ?? { u, v, dead: 0, live: 0 };
      rec[excluded[t] ? 'dead' : 'live']++;
      edges.set(key, rec);
    }
  let horizontal = 0, vertical = 0, oblique = 0;
  for (const { u, v, dead, live } of edges.values()) {
    if (!dead || !live) continue;
    const dx = Math.abs(mesh.x[u] - mesh.x[v]), dy = Math.abs(mesh.y[u] - mesh.y[v]), len = Math.hypot(dx, dy);
    if (dy <= 1e-6 * len) horizontal += len;
    else if (dx <= 1e-6 * len) vertical += len;
    else oblique += len;
  }
  const total = horizontal + vertical + oblique;
  return { horizontalUm: horizontal, verticalUm: vertical, obliqueUm: oblique, validFaceFraction: total > 0 ? horizontal / total : NaN };
}

/** Group index by central finite difference of n_eff(lambda) with material dispersion included. */
export function groupIndex(model, lambdaUm, modeIndex, { delta = 0.01, ...solveOpts } = {}) {
  const base = solveModesAt(model, lambdaUm, { numModes: modeIndex + 2, ...solveOpts });
  const lo = solveModesAt(model, lambdaUm - delta, { numModes: modeIndex + 2, warm: base.warm, ...solveOpts });
  const hi = solveModesAt(model, lambdaUm + delta, { numModes: modeIndex + 2, warm: base.warm, ...solveOpts });
  const dn = (hi.neff[modeIndex] - lo.neff[modeIndex]) / (2 * delta);
  return { ng: base.neff[modeIndex] - lambdaUm * dn, dneffDlambda: dn, base, lo, hi };
}

/** Integral of f^2 over each triangle for a P1 field. */
export function triIntegralSquare(mesh, geo, f) {
  const out = new Float64Array(mesh.nTris);
  for (let t = 0; t < mesh.nTris; t++) {
    const a = f[mesh.tri[3 * t]],
      b = f[mesh.tri[3 * t + 1]],
      c = f[mesh.tri[3 * t + 2]];
    out[t] = (geo.area[t] / 6) * (a * a + b * b + c * c + a * b + b * c + c * a);
  }
  return out;
}
