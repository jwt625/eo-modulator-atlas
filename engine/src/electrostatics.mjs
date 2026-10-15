// 2D quasi-static electrostatics of a cross-section: anisotropic eps tensor, Dirichlet electrodes with
// weights, capacitance by energy and by terminal charge, C0' (all eps = 1), n_rf, Z0.
//
// Voltage normalisation (exact definition used everywhere in the engine):
//   Electrode i has potential  phi_i = w_i / V_line   so that the line voltage V_line_eff = 1 V, with
//     V_line = max_i(w_i) - min_i(w_i)            for symmetry none / x_mirror_even
//     V_line = 2 max_i |w_i|                       for symmetry x_mirror_odd (partner electrodes at -w_i)
//   (differential drive V+/V-: weights +-0.5 or +-1 give the same normalised problem; single ended: w = 1, 0).
//   C'  = 2 W' / (1 V)^2,   W' = energy per length of the FULL structure (x2 of the solved half for symmetry),
//   which equals the series capacitance seen by the line voltage; Z0 = 1/(c sqrt(C' C0')).
//   Terminal-charge form: C' = sum_i Q_i phi_i  (full structure), Q_i = eps0 * nodal residual sum on electrode i.
//
// License: GPL-3.0-or-later.

import { PoissonSolver, triangleGeometry, p2Space, p2Grad } from './fem.mjs';
import { buildPattern, recordTiming } from './sparse.mjs';
import { epsRfLab } from './materials.mjs';

export const EPS0 = 8.8541878128e-12;
export const MU0 = 1.25663706212e-6;
export const C_LIGHT = 299792458;

/** Grid-accelerated triangle locator over a mesh. */
export class TriLocator {
  constructor(mesh, geo) {
    this.mesh = mesh;
    const { x, y, tri, nTris } = mesh;
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (let i = 0; i < x.length; i++) {
      if (x[i] < x0) x0 = x[i];
      if (x[i] > x1) x1 = x[i];
      if (y[i] < y0) y0 = y[i];
      if (y[i] > y1) y1 = y[i];
    }
    const n = Math.max(8, Math.ceil(Math.sqrt(nTris / 2)));
    this.x0 = x0;
    this.y0 = y0;
    this.nx = n;
    this.ny = n;
    this.dx = (x1 - x0) / n || 1;
    this.dy = (y1 - y0) / n || 1;
    // bucket by triangle bbox (cap bucket spans)
    const buckets = new Array(n * n);
    for (let t = 0; t < nTris; t++) {
      const a = tri[3 * t],
        b = tri[3 * t + 1],
        c = tri[3 * t + 2];
      const tx0 = Math.min(x[a], x[b], x[c]),
        tx1 = Math.max(x[a], x[b], x[c]),
        ty0 = Math.min(y[a], y[b], y[c]),
        ty1 = Math.max(y[a], y[b], y[c]);
      const i0 = Math.max(0, Math.floor((tx0 - x0) / this.dx)),
        i1 = Math.min(n - 1, Math.floor((tx1 - x0) / this.dx));
      const j0 = Math.max(0, Math.floor((ty0 - y0) / this.dy)),
        j1 = Math.min(n - 1, Math.floor((ty1 - y0) / this.dy));
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const k = j * n + i;
          (buckets[k] ??= []).push(t);
        }
    }
    this.buckets = buckets;
  }
  /** Triangle index containing (px,py) or -1. */
  find(px, py) {
    const { mesh, nx, ny } = this;
    const i = Math.floor((px - this.x0) / this.dx),
      j = Math.floor((py - this.y0) / this.dy);
    if (i < 0 || j < 0 || i >= nx || j >= ny) return -1;
    const lst = this.buckets[j * nx + i];
    if (!lst) return -1;
    const eps = 1e-12;
    let best = -1,
      bestMin = -Infinity;
    for (const t of lst) {
      const a = mesh.tri[3 * t],
        b = mesh.tri[3 * t + 1],
        c = mesh.tri[3 * t + 2];
      const x1 = mesh.x[a],
        y1 = mesh.y[a],
        x2 = mesh.x[b],
        y2 = mesh.y[b],
        x3 = mesh.x[c],
        y3 = mesh.y[c];
      const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
      const l1 = ((y2 - y3) * (px - x3) + (x3 - x2) * (py - y3)) / d;
      const l2 = ((y3 - y1) * (px - x3) + (x1 - x3) * (py - y3)) / d;
      const l3 = 1 - l1 - l2;
      const m = Math.min(l1, l2, l3);
      if (m >= -eps) return t;
      if (m > bestMin) {
        bestMin = m;
        best = t;
      }
    }
    return bestMin > -1e-6 ? best : -1;
  }
}

/** Per-triangle in-plane relative permittivity block [xx, xy, yy]. */
export function epsTriangles(mesh, regionMaterials, isotropicOne = false) {
  const out = new Float64Array(3 * mesh.nTris);
  const cache = regionMaterials.map((m) => {
    if (isotropicOne || !m) return [1, 0, 1];
    const e = epsRfLab(m);
    return [e[0], e[1], e[4]];
  });
  for (let t = 0; t < mesh.nTris; t++) {
    const c = cache[mesh.triRegion[t]];
    out[3 * t] = c[0];
    out[3 * t + 1] = c[1];
    out[3 * t + 2] = c[2];
  }
  return out;
}

/**
 * Normalised electrode potentials (V) for unit line voltage.
 * @param {{weight:number}[]} electrodes
 * @param {string} symmetry
 */
export function normalizeWeights(electrodes, symmetry) {
  const w = electrodes.map((e) => e.weight);
  if (!w.length) throw new Error('no electrodes');
  let vline;
  if (symmetry === 'x_mirror_odd') vline = 2 * Math.max(...w.map(Math.abs));
  else vline = Math.max(...w) - Math.min(...w);
  if (!(vline > 0)) throw new Error('electrode weights give zero line voltage (need at least two distinct potentials)');
  return { vline, phi: w.map((v) => v / vline) };
}

/**
 * Solve a cross-section.
 * @param {import('./section.mjs').CrossSection} section
 * @param {{mesh?:any, meshScale?:number, resolvedMaterials:Object<string,any>, vacuumOnly?:boolean, elementOrder?:1|2}} opts
 *   elementOrder: 1 (P1, default) or 2 (P2 Lagrange on the same mesh; DevLog-024 S3.9).
 *   vacuumOnly: solve only the all-eps-1 problem and return {mesh, vline, c0Pul, lPul, stats} (Wheeler recessed sections,
 *   which use C0' only; Q2 M8). No material is read.
 */
export function solveElectrostatics(section, opts) {
  const t0 = performance.now();
  const g = section.geom;
  const mesh = opts.mesh ?? section.buildMesh({ scale: opts.meshScale ?? 1 });
  const tMesh = performance.now();
  const regionMats = opts.vacuumOnly ? section.regions.map(() => null) : section.regions.map((r) => opts.resolvedMaterials[r.material]);
  if (!opts.vacuumOnly) for (let i = 0; i < regionMats.length; i++) if (!regionMats[i]) throw new Error(`region ${section.regions[i].name}: unknown material ${section.regions[i].material}`);
  const geo = triangleGeometry(mesh);
  const tGeo = performance.now();
  const pat = buildPattern(mesh.nNodes, mesh.tri);
  const tPat = performance.now();
  const { vline, phi: elecPhi } = normalizeWeights(section.electrodes, g.symmetry);
  const symFactor = g.symmetry === 'none' ? 1 : 2;

  // Dirichlet set: electrodes, mirror plane (odd), optional outer sides
  const isD = new Uint8Array(mesh.nNodes);
  const phiD = new Float64Array(mesh.nNodes);
  const tol = 1e-9 * Math.hypot(mesh.rect.x1 - mesh.rect.x0, mesh.rect.y1 - mesh.rect.y0);
  const bc = g.boundary ?? {};
  const rect = mesh.rect;
  for (let i = 0; i < mesh.nNodes; i++) {
    const x = mesh.x[i],
      y = mesh.y[i];
    let d = false;
    if (bc.left === 'dirichlet' && Math.abs(x - rect.x0) < tol) d = true;
    if (bc.right === 'dirichlet' && Math.abs(x - rect.x1) < tol) d = true;
    if (bc.bottom === 'dirichlet' && Math.abs(y - rect.y0) < tol) d = true;
    if (bc.top === 'dirichlet' && Math.abs(y - rect.y1) < tol) d = true;
    if (g.symmetry === 'x_mirror_odd' && Math.abs(x - g.mirror_x_um) < tol) d = true;
    if (d) {
      isD[i] = 1;
      phiD[i] = 0;
    }
  }
  for (let i = 0; i < mesh.nNodes; i++) {
    const e = mesh.nodeElectrode[i];
    if (e >= 0) {
      isD[i] = 1;
      phiD[i] = elecPhi[e];
    }
  }
  const nElec = section.electrodes.length;
  const epsAir = epsTriangles(mesh, regionMats, true);
  // element order (DevLog-024 S3.9): 1 (default) or 2 (quadratic Lagrange; DOFs = vertices + edge midpoints)
  const order = opts.elementOrder ?? 1;
  if (order !== 1 && order !== 2) throw new Error(`electrostatics: elementOrder must be 1 or 2; got ${order}`);
  let space = null,
    isDof = isD,
    phiDof = phiD,
    dofElectrode = mesh.nodeElectrode;
  if (order === 2) {
    space = p2Space(mesh);
    const { nV, nDof } = space;
    isDof = new Uint8Array(nDof);
    phiDof = new Float64Array(nDof);
    dofElectrode = new Int16Array(nDof).fill(-1);
    isDof.set(isD);
    phiDof.set(phiD);
    dofElectrode.set(mesh.nodeElectrode);
    for (let e = 0; e < space.nEdges; e++) {
      const x = space.x[nV + e],
        y = space.y[nV + e];
      if ((bc.left === 'dirichlet' && Math.abs(x - rect.x0) < tol) || (bc.right === 'dirichlet' && Math.abs(x - rect.x1) < tol) || (bc.bottom === 'dirichlet' && Math.abs(y - rect.y0) < tol) || (bc.top === 'dirichlet' && Math.abs(y - rect.y1) < tol) || (g.symmetry === 'x_mirror_odd' && Math.abs(x - g.mirror_x_um) < tol)) isDof[nV + e] = 1;
    }
    // midpoints of electrode boundary edges carry the electrode potential (straight edges)
    for (const ed of mesh.electrodeEdges) {
      const id = space.edgeOf(ed.a, ed.b);
      if (id < 0) continue;
      isDof[nV + id] = 1;
      phiDof[nV + id] = elecPhi[ed.electrode];
      dofElectrode[nV + id] = ed.electrode;
    }
  }
  const tPrep = performance.now();
  const timingOf = (solvers, tEnd) => esTiming(mesh, solvers, { t0, tMesh, tGeo, tPat, tPrep, tEnd });
  if (opts.vacuumOnly) {
    const solverVac = new PoissonSolver(mesh, epsAir, isDof, geo, pat, { space });
    const c0 = EPS0 * solverVac.energyForm(solverVac.solve(phiDof).phi) * symFactor; // 2 W0' for V_line = 1 V
    const timing = timingOf([solverVac], performance.now());
    timing.elementOrder = order;
    timing.nDof = solverVac.pat.n;
    recordTiming('electrostatics_vacuum', timing);
    return { mesh, vline, c0Pul: c0, lPul: 1 / (C_LIGHT * C_LIGHT * c0), stats: { nNodes: mesh.nNodes, nTris: mesh.nTris }, timing };
  }
  const epsT = epsTriangles(mesh, regionMats);
  const solver = new PoissonSolver(mesh, epsT, isDof, geo, pat, { space });
  const sol = solver.solve(phiDof);
  // same mesh and Dirichlet set: the vacuum problem reuses the ordering and symbolic analysis
  const solver0 = new PoissonSolver(mesh, epsAir, isDof, geo, pat, { sym: solver.chol.sym, space });
  const sol0 = solver0.solve(phiDof);

  const charges = (res) => {
    const q = new Float64Array(nElec);
    for (let i = 0; i < dofElectrode.length; i++) if (dofElectrode[i] >= 0) q[dofElectrode[i]] += res[i] * EPS0;
    return q;
  };
  const Q = charges(sol.residual);
  const Q0 = charges(sol0.residual);
  let sumQphi = 0,
    sumQ0phi = 0;
  for (let e = 0; e < nElec; e++) {
    sumQphi += Q[e] * elecPhi[e];
    sumQ0phi += Q0[e] * elecPhi[e];
  }
  const energyForm = solver.energyForm(sol.phi);
  const energyForm0 = solver0.energyForm(sol0.phi);
  const W = 0.5 * EPS0 * energyForm * symFactor; // J/m for V_line = 1 V (full structure)
  const W0 = 0.5 * EPS0 * energyForm0 * symFactor;
  const C_energy = 2 * W;
  const C0_energy = 2 * W0;
  const C_charge = sumQphi * symFactor;
  const C0_charge = sumQ0phi * symFactor;
  const Cp = C_energy; // report energy-based value as primary
  const C0p = C0_energy;
  const nrf = Math.sqrt(Cp / C0p);
  const Z0 = 1 / (C_LIGHT * Math.sqrt(Cp * C0p));
  const Lp = 1 / (C_LIGHT * C_LIGHT * C0p);

  // energy partition per region (for dielectric loss), fraction of total
  const triE = solver.triEnergyForm(sol.phi);
  const regionEnergy = new Float64Array(section.regions.length);
  let tot = 0;
  for (let t = 0; t < mesh.nTris; t++) {
    regionEnergy[mesh.triRegion[t]] += triE[t];
    tot += triE[t];
  }
  const regionEnergyFraction = Array.from(regionEnergy, (v) => v / tot);

  const grad = solver.gradient(sol.phi);
  const grad0 = solver0.gradient(sol0.phi);
  const t1 = performance.now();
  const timing = timingOf([solver, solver0], t1);
  timing.elementOrder = order;
  timing.nDof = solver.pat.n;
  recordTiming('electrostatics', timing);
  return {
    mesh,
    geo,
    pat,
    vline,
    symmetryFactor: symFactor,
    electrodePotentials: elecPhi,
    // vertex values (P2: the first nNodes DOFs are the vertices; all DOFs in phiDof / phi0Dof)
    phi: order === 2 ? sol.phi.slice(0, mesh.nNodes) : sol.phi,
    phi0: order === 2 ? sol0.phi.slice(0, mesh.nNodes) : sol0.phi,
    residual: order === 2 ? sol.residual.slice(0, mesh.nNodes) : sol.residual,
    residual0: order === 2 ? sol0.residual.slice(0, mesh.nNodes) : sol0.residual,
    ...(order === 2 ? { phiDof: sol.phi, phi0Dof: sol0.phi, p2: space } : {}),
    elementOrder: order,
    grad, // V/um per triangle (V_line = 1 V)
    grad0,
    epsTri: epsT,
    solver,
    solver0,
    isDirichlet: isD,
    charges: Q,
    charges0: Q0,
    capacitance: { energy: C_energy, charge: C_charge },
    capacitance0: { energy: C0_energy, charge: C0_charge },
    cPul: Cp,
    c0Pul: C0p,
    lPul: Lp,
    nRf: nrf,
    z0: Z0,
    regionEnergyFraction,
    timings_ms: { mesh: tMesh - t0, solve: t1 - tMesh, total: t1 - t0 },
    timing,
    stats: { nNodes: mesh.nNodes, nTris: mesh.nTris },
  };
}

/** Phase timing of one electrostatic call (ms; see DevLog-024 timing contract). */
function esTiming(mesh, solvers, { t0, tMesh, tGeo, tPat, tPrep, tEnd }) {
  const sum = (f) => solvers.reduce((a, s) => a + f(s), 0);
  const assemble_ms = sum((s) => s.timing.assemble_ms),
    restrict_ms = sum((s) => s.timing.restrict_ms),
    ordering_ms = sum((s) => s.timing.ordering_ms),
    symbolic_ms = sum((s) => s.timing.chol.symbolic_ms),
    factor_ms = sum((s) => s.timing.chol.factor_ms),
    solve_ms = sum((s) => s.timing.chol.solve_ms);
  const total_ms = tEnd - t0;
  const c = solvers[0].timing.chol;
  return {
    mesh_ms: tMesh - t0,
    geometry_ms: tGeo - tMesh,
    pattern_ms: tPat - tGeo,
    prep_ms: tPrep - tPat,
    assemble_ms,
    restrict_ms,
    ordering_ms,
    symbolic_ms,
    factor_ms,
    nFactor: sum((s) => s.timing.chol.nFactor),
    solve_ms,
    nSolve: sum((s) => s.timing.chol.nSolve),
    post_ms: total_ms - (tPrep - t0) - assemble_ms - restrict_ms - ordering_ms - symbolic_ms - factor_ms - solve_ms,
    total_ms,
    nNodes: mesh.nNodes,
    nTris: mesh.nTris,
    nFree: solvers[0].timing.nFree,
    nnzA: c.nnzA,
    nnzL: c.nnzL,
    fill: c.fill,
    flops: c.flops,
    nsuper: c.nsuper,
    mesh: mesh.stats ? { ...mesh.stats } : null,
  };
}

/**
 * Potential gradient (V/um, V_line = 1 V) at point (x, y) inside ES triangle t. P1: the constant triangle gradient
 * (es.grad); P2 (elementOrder 2): the linear gradient of the quadratic potential evaluated at the point, which is
 * what an EO overlap should sample on a P2 solution (es.grad holds only the centroid value).
 * @param {any} es solveElectrostatics result
 * @param {boolean} [vacuum] use the all-eps-1 solution (phi0)
 * @returns {[number, number]}
 */
export function gradientAt(es, t, x, y, vacuum = false) {
  if (es.elementOrder !== 2) {
    const g = vacuum ? es.grad0 : es.grad;
    return [g.gx[t], g.gy[t]];
  }
  const { mesh, geo } = es;
  const phi = vacuum ? es.phi0Dof : es.phiDof;
  const el = es.p2.elem;
  const L = [0, 0, 0];
  const x3 = mesh.x[mesh.tri[3 * t + 2]],
    y3 = mesh.y[mesh.tri[3 * t + 2]];
  for (let i = 0; i < 2; i++) L[i] = geo.gx[3 * t + i] * (x - x3) + geo.gy[3 * t + i] * (y - y3);
  L[2] = 1 - L[0] - L[1];
  const gxN = new Float64Array(6),
    gyN = new Float64Array(6);
  p2Grad(geo, t, L, gxN, gyN);
  let gx = 0,
    gy = 0;
  for (let a = 0; a < 6; a++) {
    const p = phi[el[6 * t + a]];
    gx += gxN[a] * p;
    gy += gyN[a] * p;
  }
  return [gx, gy];
}
