// P1 triangle finite elements: anisotropic Poisson (electrostatics) and scalar Helmholtz-type matrices.
// Coordinates are micrometers; matrices are dimensionless 2D forms (capacitance per length is scale free).
// License: GPL-3.0-or-later.

import { buildPattern, triangleSlots, buildElementPattern, elementSlots, SparseCholesky } from './sparse.mjs';

/** Per-triangle geometry: area and shape function gradients. */
export function triangleGeometry(mesh) {
  const nt = mesh.nTris;
  const area = new Float64Array(nt);
  const gx = new Float64Array(3 * nt),
    gy = new Float64Array(3 * nt);
  for (let t = 0; t < nt; t++) {
    const i = mesh.tri[3 * t],
      j = mesh.tri[3 * t + 1],
      k = mesh.tri[3 * t + 2];
    const x1 = mesh.x[i],
      y1 = mesh.y[i],
      x2 = mesh.x[j],
      y2 = mesh.y[j],
      x3 = mesh.x[k],
      y3 = mesh.y[k];
    const a2 = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    area[t] = 0.5 * a2;
    gx[3 * t] = (y2 - y3) / a2;
    gx[3 * t + 1] = (y3 - y1) / a2;
    gx[3 * t + 2] = (y1 - y2) / a2;
    gy[3 * t] = (x3 - x2) / a2;
    gy[3 * t + 1] = (x1 - x3) / a2;
    gy[3 * t + 2] = (x2 - x1) / a2;
  }
  return { area, gx, gy };
}

/**
 * Assemble the global matrix  K = sum_T A_T [gradN]^T C_T [gradN]  with 2x2 symmetric tensor
 * C_T = [cxx cxy; cxy cyy] (3 values per triangle) and optionally a mass-type term  m_T * (A/12)(1+delta_ij).
 * @param {Object} mesh
 * @param {{pat:any}} ctx
 * @param {Float64Array|null} cTri 3 per tri (xx, xy, yy) or null
 * @param {Float64Array|null} mTri 1 per tri or null
 */
export function assemble(mesh, geo, pat, cTri, mTri, val = null) {
  val = val ?? new Float64Array(pat.nnz);
  const nt = mesh.nTris;
  const slots = triangleSlots(pat, mesh.tri);
  const { area, gx, gy } = geo;
  for (let t = 0; t < nt; t++) {
    const A = area[t];
    const cxx = cTri ? cTri[3 * t] : 0,
      cxy = cTri ? cTri[3 * t + 1] : 0,
      cyy = cTri ? cTri[3 * t + 2] : 0;
    const m = mTri ? mTri[t] : 0;
    for (let a = 0; a < 3; a++) {
      const gax = gx[3 * t + a],
        gay = gy[3 * t + a];
      for (let b = 0; b < 3; b++) {
        let s = 0;
        if (cTri) {
          const gbx = gx[3 * t + b],
            gby = gy[3 * t + b];
          s += A * (gax * (cxx * gbx + cxy * gby) + gay * (cxy * gbx + cyy * gby));
        }
        if (mTri) s += m * ((A / 12) * (a === b ? 2 : 1));
        if (s !== 0) val[slots[9 * t + 3 * a + b]] += s;
      }
    }
  }
  return val;
}

// ---- quadratic (P2) Lagrange elements (DevLog-024 S3.9; option, P1 stays the default) ---------------------------

/**
 * P2 DOF space on a P1 mesh: DOFs 0..nV-1 are the vertices, then one DOF per unique edge (its midpoint; straight
 * edges). elem holds 6 DOFs per triangle in the order v0, v1, v2, m01, m12, m20.
 * @returns {{kind:'P2', nV:number, nDof:number, nEdges:number, elem:Int32Array, edgeA:Int32Array, edgeB:Int32Array,
 *   x:Float64Array, y:Float64Array, pat:any, edgeOf:(a:number,b:number)=>number}}
 */
export function p2Space(mesh) {
  const nV = mesh.nNodes,
    nt = mesh.nTris;
  const pat1 = buildPattern(nV, mesh.tri);
  // one edge id per upper-triangle slot of the P1 pattern
  const edgeOfSlot = new Int32Array(pat1.nnz).fill(-1);
  let nE = 0;
  for (let a = 0; a < nV; a++) for (let p = pat1.rowptr[a]; p < pat1.rowptr[a + 1]; p++) if (pat1.colidx[p] > a) edgeOfSlot[p] = nE++;
  const edgeA = new Int32Array(nE),
    edgeB = new Int32Array(nE);
  for (let a = 0; a < nV; a++)
    for (let p = pat1.rowptr[a]; p < pat1.rowptr[a + 1]; p++)
      if (edgeOfSlot[p] >= 0) {
        edgeA[edgeOfSlot[p]] = a;
        edgeB[edgeOfSlot[p]] = pat1.colidx[p];
      }
  const slots1 = triangleSlots(pat1, mesh.tri);
  const elem = new Int32Array(6 * nt);
  const local = [[0, 1], [1, 2], [2, 0]];
  for (let t = 0; t < nt; t++) {
    for (let a = 0; a < 3; a++) elem[6 * t + a] = mesh.tri[3 * t + a];
    for (let e = 0; e < 3; e++) {
      const [i, j] = local[e];
      const vi = mesh.tri[3 * t + i],
        vj = mesh.tri[3 * t + j];
      const slot = vi < vj ? slots1[9 * t + 3 * i + j] : slots1[9 * t + 3 * j + i];
      elem[6 * t + 3 + e] = nV + edgeOfSlot[slot];
    }
  }
  const nDof = nV + nE;
  const x = new Float64Array(nDof),
    y = new Float64Array(nDof);
  x.set(mesh.x);
  y.set(mesh.y);
  for (let e = 0; e < nE; e++) {
    x[nV + e] = 0.5 * (mesh.x[edgeA[e]] + mesh.x[edgeB[e]]);
    y[nV + e] = 0.5 * (mesh.y[edgeA[e]] + mesh.y[edgeB[e]]);
  }
  const pat = buildElementPattern(nDof, elem, 6);
  const edgeOf = (a, b) => {
    const p = entryIndex1(pat1, Math.min(a, b), Math.max(a, b));
    return p < 0 ? -1 : edgeOfSlot[p];
  };
  return { kind: 'P2', nV, nDof, nEdges: nE, elem, edgeA, edgeB, x, y, pat, edgeOf };
}

function entryIndex1(pat, i, j) {
  let lo = pat.rowptr[i],
    hi = pat.rowptr[i + 1] - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const c = pat.colidx[m];
    if (c === j) return m;
    if (c < j) lo = m + 1;
    else hi = m - 1;
  }
  return -1;
}

// 3-point rule (exact for degree 2) in barycentric coordinates, weights 1/3 of the area each
const P2Q = [
  [2 / 3, 1 / 6, 1 / 6],
  [1 / 6, 2 / 3, 1 / 6],
  [1 / 6, 1 / 6, 2 / 3],
];
const P2E = [
  [0, 1],
  [1, 2],
  [2, 0],
];

/** Gradients of the 6 P2 shape functions at barycentric point L of triangle t (into gxN, gyN). */
export function p2Grad(geo, t, L, gxN, gyN) {
  for (let i = 0; i < 3; i++) {
    const f = 4 * L[i] - 1;
    gxN[i] = f * geo.gx[3 * t + i];
    gyN[i] = f * geo.gy[3 * t + i];
  }
  for (let e = 0; e < 3; e++) {
    const [i, j] = P2E[e];
    gxN[3 + e] = 4 * (L[i] * geo.gx[3 * t + j] + L[j] * geo.gx[3 * t + i]);
    gyN[3 + e] = 4 * (L[i] * geo.gy[3 * t + j] + L[j] * geo.gy[3 * t + i]);
  }
}

/** P2 stiffness  sum_T integral grad N_a . C_T grad N_b  (3-point rule, exact for straight triangles). */
export function assembleP2(mesh, geo, space, cTri, val = null) {
  const { pat, elem } = space;
  val = val ?? new Float64Array(pat.nnz);
  const slots = elementSlots(pat, elem, 6);
  const gxN = new Float64Array(6),
    gyN = new Float64Array(6),
    Ke = new Float64Array(36);
  for (let t = 0; t < mesh.nTris; t++) {
    const w = geo.area[t] / 3;
    const cxx = cTri[3 * t],
      cxy = cTri[3 * t + 1],
      cyy = cTri[3 * t + 2];
    Ke.fill(0);
    for (const L of P2Q) {
      p2Grad(geo, t, L, gxN, gyN);
      for (let a = 0; a < 6; a++)
        for (let b = 0; b < 6; b++) Ke[6 * a + b] += w * (gxN[a] * (cxx * gxN[b] + cxy * gyN[b]) + gyN[a] * (cxy * gxN[b] + cyy * gyN[b]));
    }
    for (let q = 0; q < 36; q++) val[slots[36 * t + q]] += Ke[q];
  }
  return val;
}

/** Restrict a full CSR matrix to a set of "free" rows/cols. Returns sub pattern/values and index maps. */
export function restrictMatrix(pat, val, isFree) {
  const n = pat.n;
  const map = new Int32Array(n).fill(-1);
  let nf = 0;
  for (let i = 0; i < n; i++) if (isFree[i]) map[i] = nf++;
  const rowptr = new Int32Array(nf + 1);
  let nnz = 0;
  for (let i = 0; i < n; i++) {
    if (map[i] < 0) continue;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) if (map[pat.colidx[p]] >= 0) nnz++;
    rowptr[map[i] + 1] = nnz;
  }
  const colidx = new Int32Array(nnz);
  const src = new Int32Array(nnz);
  const v = new Float64Array(nnz);
  let q = 0;
  for (let i = 0; i < n; i++) {
    if (map[i] < 0) continue;
    for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
      const c = map[pat.colidx[p]];
      if (c >= 0) {
        colidx[q] = c;
        src[q] = p;
        v[q] = val[p];
        q++;
      }
    }
  }
  return { pat: { n: nf, rowptr, colidx, nnz }, val: v, src, map, nf };
}

/**
 * Anisotropic Poisson problem  div( eps grad phi ) = 0  with Dirichlet nodes.
 * Natural (zero normal D) boundary elsewhere.
 */
export class PoissonSolver {
  /**
   * @param {Object} mesh extracted mesh
   * @param {Float64Array} epsTri 3 per tri (xx,xy,yy), relative permittivity in-plane block
   * @param {Uint8Array} isDirichlet per node
   * @param {any} [geo] triangleGeometry(mesh)
   * @param {any} [pat] buildPattern of the mesh
   * @param {{sym?:any}} [opts] sym: symbolic analysis of another PoissonSolver with the same mesh and Dirichlet set
   *   (its `chol.sym`), reused instead of a new ordering and analysis (same pattern, different coefficients)
   */
  constructor(mesh, epsTri, isDirichlet, geo = null, pat = null, { sym = null, space = null } = {}) {
    let t = performance.now();
    const lap = () => {
      const t1 = performance.now();
      const d = t1 - t;
      t = t1;
      return d;
    };
    this.mesh = mesh;
    this.geo = geo ?? triangleGeometry(mesh);
    this.space = space; // null: P1 (DOFs = mesh nodes); p2Space(mesh): P2
    this.pat = space ? space.pat : pat ?? buildPattern(mesh.nNodes, mesh.tri);
    const setup_ms = lap();
    this.epsTri = epsTri;
    this.K = space ? assembleP2(mesh, this.geo, space, epsTri) : assemble(mesh, this.geo, this.pat, epsTri, null);
    const assemble_ms = lap();
    this.isDirichlet = isDirichlet;
    const nDof = this.pat.n;
    const isFree = new Uint8Array(nDof);
    for (let i = 0; i < nDof; i++) isFree[i] = isDirichlet[i] ? 0 : 1;
    this.sub = restrictMatrix(this.pat, this.K, isFree);
    const restrict_ms = lap();
    this.chol = new SparseCholesky(this.sub.pat, null, { sym: sym && sym.n === this.sub.nf ? sym : null });
    if (!this.chol.factor(this.sub.val)) throw new Error('PoissonSolver: stiffness not positive definite (floating region?)');
    this.timing = { setup_ms, assemble_ms, restrict_ms, ordering_ms: this.chol.timing.ordering_ms, nFree: this.sub.nf, chol: this.chol.timing };
  }
  /**
   * @param {Float64Array} phiD potential at Dirichlet nodes (full-length array; free entries ignored)
   * @returns {{phi:Float64Array, residual:Float64Array}}
   */
  solve(phiD) {
    const { pat, K } = this;
    const n = pat.n;
    const rhs = new Float64Array(this.sub.nf);
    for (let i = 0; i < n; i++) {
      const fi = this.sub.map[i];
      if (fi < 0) continue;
      let s = 0;
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
        const j = pat.colidx[p];
        if (this.isDirichlet[j]) s += K[p] * phiD[j];
      }
      rhs[fi] = -s;
    }
    const xf = this.chol.solve(rhs);
    const phi = new Float64Array(n);
    for (let i = 0; i < n; i++) phi[i] = this.sub.map[i] >= 0 ? xf[this.sub.map[i]] : phiD[i];
    // nodal residual r = K phi (charge-like quantity at Dirichlet nodes)
    const residual = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) s += K[p] * phi[pat.colidx[p]];
      residual[i] = s;
    }
    return { phi, residual };
  }
  /** Energy form  phi^T K phi  (dimensionless; multiply by eps0/2 for J/m). */
  energyForm(phi) {
    const { pat, K } = this;
    let e = 0;
    for (let i = 0; i < pat.n; i++) {
      let s = 0;
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) s += K[p] * phi[pat.colidx[p]];
      e += phi[i] * s;
    }
    return e;
  }
  /** Per-triangle energy form phi^T Ke phi. */
  triEnergyForm(phi) {
    const { mesh, geo, epsTri } = this;
    if (this.space) {
      const out = new Float64Array(mesh.nTris);
      const gxN = new Float64Array(6),
        gyN = new Float64Array(6);
      const el = this.space.elem;
      for (let t = 0; t < mesh.nTris; t++) {
        const cxx = epsTri[3 * t],
          cxy = epsTri[3 * t + 1],
          cyy = epsTri[3 * t + 2];
        let e = 0;
        for (const L of P2Q) {
          p2Grad(geo, t, L, gxN, gyN);
          let ex = 0,
            ey = 0;
          for (let a = 0; a < 6; a++) {
            const p = phi[el[6 * t + a]];
            ex += gxN[a] * p;
            ey += gyN[a] * p;
          }
          e += (geo.area[t] / 3) * (ex * (cxx * ex + cxy * ey) + ey * (cxy * ex + cyy * ey));
        }
        out[t] = e;
      }
      return out;
    }
    const out = new Float64Array(mesh.nTris);
    for (let t = 0; t < mesh.nTris; t++) {
      let ex = 0,
        ey = 0;
      for (let a = 0; a < 3; a++) {
        const p = phi[mesh.tri[3 * t + a]];
        ex += geo.gx[3 * t + a] * p;
        ey += geo.gy[3 * t + a] * p;
      }
      const cxx = epsTri[3 * t],
        cxy = epsTri[3 * t + 1],
        cyy = epsTri[3 * t + 2];
      out[t] = geo.area[t] * (ex * (cxx * ex + cxy * ey) + ey * (cxy * ex + cyy * ey));
    }
    return out;
  }
  /** Gradient of phi per triangle (V/um); P2: the gradient at the centroid. */
  gradient(phi) {
    const { mesh, geo } = this;
    if (this.space) {
      const gx = new Float64Array(mesh.nTris),
        gy = new Float64Array(mesh.nTris);
      const gxN = new Float64Array(6),
        gyN = new Float64Array(6);
      const el = this.space.elem;
      const C = [1 / 3, 1 / 3, 1 / 3];
      for (let t = 0; t < mesh.nTris; t++) {
        p2Grad(geo, t, C, gxN, gyN);
        for (let a = 0; a < 6; a++) {
          const p = phi[el[6 * t + a]];
          gx[t] += gxN[a] * p;
          gy[t] += gyN[a] * p;
        }
      }
      return { gx, gy };
    }
    const gx = new Float64Array(mesh.nTris),
      gy = new Float64Array(mesh.nTris);
    for (let t = 0; t < mesh.nTris; t++)
      for (let a = 0; a < 3; a++) {
        const p = phi[mesh.tri[3 * t + a]];
        gx[t] += geo.gx[3 * t + a] * p;
        gy[t] += geo.gy[3 * t + a] * p;
      }
    return { gx, gy };
  }
}
