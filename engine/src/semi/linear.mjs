// Linear algebra helpers of the drift-diffusion solver (DevLog-039): Bernoulli function, restarted right-preconditioned
// GMRES (modified Gram-Schmidt, Givens rotations; Saad and Schultz, SIAM J. Sci. Stat. Comput. 7, 856 (1986)) and a
// Jacobi-scaled sparse Cholesky wrapper over sparse.mjs for the symmetric preconditioner blocks.
// License: GPL-3.0-or-later.

import { SparseCholesky } from '../sparse.mjs';
import { restrictMatrix } from '../fem.mjs';

/** Bernoulli function B(x) = x / (exp(x) - 1) and its derivative, stable for all x. Returns [B, B']. */
export function bernoulli(x) {
  const ax = Math.abs(x);
  if (ax < 1e-3) {
    const x2 = x * x;
    return [1 - 0.5 * x + x2 / 12 - (x2 * x2) / 720, -0.5 + x / 6 - (x2 * x) / 180];
  }
  if (x > 700) { const e = Math.exp(-x); return [x * e, e * (1 - x)]; }
  if (x < -700) return [-x, -1];
  const em1 = Math.expm1(x);
  const B = x / em1;
  // B'(x) = B (1 - B - x) / x  (identity B(-x) = B(x) + x)
  return [B, (B * (1 - B - x)) / x];
}

/**
 * Restarted GMRES with right preconditioning: solve A x = b, x = M y. Returns {x, iterations, relres, converged}.
 * @param {(v:Float64Array, out:Float64Array)=>void} matvec A
 * @param {(v:Float64Array, out:Float64Array)=>void} precond M
 */
export function gmres(matvec, precond, b, { tol = 1e-10, restart = 40, maxIter = 400, x0 = null, work = null } = {}) {
  const n = b.length;
  const x = x0 ? Float64Array.from(x0) : new Float64Array(n);
  const m = restart;
  // workspace (Krylov and preconditioned bases) reused across calls when `work` is given; vectors are made on demand
  const ws = work && work.n === n ? work : { n, Vs: [], Zs: [], r: new Float64Array(n), w: new Float64Array(n), z: new Float64Array(n) };
  if (work && work.n !== n) Object.assign(work, ws);
  const { r, w, z } = ws;
  const V = (k) => (ws.Vs[k] ??= new Float64Array(n));
  const Z = (k) => (ws.Zs[k] ??= new Float64Array(n));
  const bnorm = norm2(b) || 1;
  const H = new Float64Array((m + 1) * m), cs = new Float64Array(m), sn = new Float64Array(m), g = new Float64Array(m + 1);
  let iters = 0, relres = 1;
  const residual = () => {
    matvec(x, r);
    for (let i = 0; i < n; i++) r[i] = b[i] - r[i];
    return norm2(r);
  };
  let beta = x0 ? residual() : (r.set(b), bnorm);
  relres = beta / bnorm;
  while (relres > tol && iters < maxIter) {
    const v0 = V(0);
    for (let i = 0; i < n; i++) v0[i] = r[i] / beta;
    g.fill(0);
    g[0] = beta;
    let k = 0;
    for (; k < m && iters < maxIter; k++) {
      iters++;
      precond(V(k), Z(k));
      matvec(Z(k), w);
      for (let j = 0; j <= k; j++) {
        const vj = V(j);
        let h = 0;
        for (let i = 0; i < n; i++) h += w[i] * vj[i];
        H[j * m + k] = h;
        for (let i = 0; i < n; i++) w[i] -= h * vj[i];
      }
      const hn = norm2(w);
      H[(k + 1) * m + k] = hn;
      if (hn > 0) { const vk = V(k + 1); for (let i = 0; i < n; i++) vk[i] = w[i] / hn; }
      for (let j = 0; j < k; j++) {
        const a = H[j * m + k], c = H[(j + 1) * m + k];
        H[j * m + k] = cs[j] * a + sn[j] * c;
        H[(j + 1) * m + k] = -sn[j] * a + cs[j] * c;
      }
      const a = H[k * m + k], c = H[(k + 1) * m + k];
      const d = Math.hypot(a, c) || 1e-300;
      cs[k] = a / d;
      sn[k] = c / d;
      H[k * m + k] = d;
      H[(k + 1) * m + k] = 0;
      g[k + 1] = -sn[k] * g[k];
      g[k] = cs[k] * g[k];
      relres = Math.abs(g[k + 1]) / bnorm;
      if (relres <= tol || hn === 0) { k++; break; }
    }
    // back substitution and update x += Z y
    const y = new Float64Array(k);
    for (let i = k - 1; i >= 0; i--) {
      let s = g[i];
      for (let j = i + 1; j < k; j++) s -= H[i * m + j] * y[j];
      y[i] = s / H[i * m + i];
    }
    z.fill(0);
    for (let j = 0; j < k; j++) { const zj = Z(j), yj = y[j]; for (let i = 0; i < n; i++) z[i] += yj * zj[i]; }
    for (let i = 0; i < n; i++) x[i] += z[i];
    if (relres <= tol || iters >= maxIter) break;
    beta = residual();
    relres = beta / bnorm;
  }
  // true residual of the returned iterate
  const trueRes = residual() / bnorm;
  return { x, iterations: iters, relres: trueRes, converged: trueRes <= Math.max(tol * 10, 1e-14) };
}

export function norm2(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}

/**
 * Symmetric positive definite block on a free subset of a node pattern, factorised with symmetric Jacobi scaling
 * (unit diagonal) by the engine's supernodal Cholesky. `update(values)` takes values on the full node pattern.
 */
export class ScaledSpdBlock {
  constructor(pat, isFree, { sym = null } = {}) {
    const dummy = new Float64Array(pat.nnz);
    const sub = restrictMatrix(pat, dummy, isFree);
    this.sub = sub;
    this.n = sub.nf;
    this.vals = new Float64Array(sub.pat.nnz);
    this.s = new Float64Array(sub.nf);
    this.diagPos = new Int32Array(sub.nf);
    for (let i = 0; i < sub.nf; i++) for (let p = sub.pat.rowptr[i]; p < sub.pat.rowptr[i + 1]; p++) if (sub.pat.colidx[p] === i) this.diagPos[i] = p;
    this.chol = new SparseCholesky(sub.pat, null, sym ? { sym } : {});
    this.tmp = new Float64Array(sub.nf);
  }
  /** Factorise from full-pattern values (already symmetric). Throws when not positive definite. */
  factor(full) {
    const { sub, vals, s } = this;
    for (let q = 0; q < vals.length; q++) vals[q] = full[sub.src[q]];
    for (let i = 0; i < this.n; i++) {
      const d = vals[this.diagPos[i]];
      if (!(d > 0) || !Number.isFinite(d)) throw new Error(`preconditioner block: non-positive diagonal ${d} at row ${i}`);
      s[i] = 1 / Math.sqrt(d);
    }
    for (let i = 0; i < this.n; i++) for (let p = sub.pat.rowptr[i]; p < sub.pat.rowptr[i + 1]; p++) vals[p] *= s[i] * s[sub.pat.colidx[p]];
    if (!this.chol.factor(vals)) throw new Error('preconditioner block not positive definite');
  }
  /** Solve on the free subset (vectors of length n). */
  solve(b, out) {
    const { s, tmp } = this;
    for (let i = 0; i < this.n; i++) tmp[i] = b[i] * s[i];
    const x = this.chol.solve(tmp);
    for (let i = 0; i < this.n; i++) out[i] = x[i] * s[i];
    return out;
  }
}
