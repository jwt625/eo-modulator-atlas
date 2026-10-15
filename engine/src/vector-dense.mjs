// Small dense nonsymmetric eigenvalue tools for the Krylov (Arnoldi) Ritz problem of the vector mode solver.
//   - hessenbergEigenvalues: Gaussian-elimination Hessenberg reduction with pivoting, then the Francis double-shift
//     QR iteration (the EISPACK elmhes/hqr algorithms, public-domain Fortran, re-implemented from the published
//     algorithm description; Wilkinson and Reinsch, Handbook for Automatic Computation II, 1971).
//   - realEigenvectors: inverse iteration on the original matrix for selected real eigenvalues, with
//     orthogonalisation inside clusters so that degenerate (semisimple) eigenvalues get independent vectors.
// Matrices are row-major Float64Array of size n*n. Intended for n up to a few hundred.
// License: GPL-3.0-or-later.

/**
 * All eigenvalues of a real square matrix.
 * @param {Float64Array} A row-major n x n (not modified)
 * @param {number} n
 * @returns {{re:Float64Array, im:Float64Array}}
 */
export function eigenvalues(A, n) {
  const a = Float64Array.from(A);
  toHessenberg(a, n);
  return hqr(a, n);
}

/** In-place reduction to upper Hessenberg form by stabilised elementary similarity transforms (elmhes). */
export function toHessenberg(a, n) {
  const at = (i, j) => i * n + j;
  for (let m = 1; m < n - 1; m++) {
    let x = 0, piv = m;
    for (let j = m; j < n; j++)
      if (Math.abs(a[at(j, m - 1)]) > Math.abs(x)) {
        x = a[at(j, m - 1)];
        piv = j;
      }
    if (piv !== m) {
      for (let j = m - 1; j < n; j++) {
        const t = a[at(piv, j)];
        a[at(piv, j)] = a[at(m, j)];
        a[at(m, j)] = t;
      }
      for (let j = 0; j < n; j++) {
        const t = a[at(j, piv)];
        a[at(j, piv)] = a[at(j, m)];
        a[at(j, m)] = t;
      }
    }
    if (x !== 0)
      for (let i = m + 1; i < n; i++) {
        let y = a[at(i, m - 1)];
        if (y !== 0) {
          y /= x;
          a[at(i, m - 1)] = y;
          for (let j = m; j < n; j++) a[at(i, j)] -= y * a[at(m, j)];
          for (let j = 0; j < n; j++) a[at(j, m)] += y * a[at(j, i)];
        }
      }
  }
  // clear the multipliers stored below the subdiagonal
  for (let i = 2; i < n; i++) for (let j = 0; j < i - 1; j++) a[at(i, j)] = 0;
}

/**
 * Eigenvalues of an upper Hessenberg matrix by the Francis double-shift QR iteration (destroys a).
 * Internally 1-based indices (A(i, j)) to follow the published algorithm closely.
 */
export function hqr(a, n) {
  const wr = new Float64Array(n), wi = new Float64Array(n);
  const g = (i, j) => a[(i - 1) * n + (j - 1)];
  const s_ = (i, j, v) => {
    a[(i - 1) * n + (j - 1)] = v;
  };
  const sign = (x, y) => (y >= 0 ? Math.abs(x) : -Math.abs(x));
  let anorm = 0;
  for (let i = 1; i <= n; i++) for (let j = Math.max(i - 1, 1); j <= n; j++) anorm += Math.abs(g(i, j));
  let nn = n, t = 0;
  let p = 0, q = 0, r = 0, s = 0, w = 0, x = 0, y = 0, z = 0;
  while (nn >= 1) {
    let its = 0, l;
    do {
      for (l = nn; l >= 2; l--) {
        s = Math.abs(g(l - 1, l - 1)) + Math.abs(g(l, l));
        if (s === 0) s = anorm;
        if (Math.abs(g(l, l - 1)) + s === s) {
          s_(l, l - 1, 0);
          break;
        }
      }
      x = g(nn, nn);
      if (l === nn) {
        wr[nn - 1] = x + t;
        wi[nn - 1] = 0;
        nn--;
      } else {
        y = g(nn - 1, nn - 1);
        w = g(nn, nn - 1) * g(nn - 1, nn);
        if (l === nn - 1) {
          p = 0.5 * (y - x);
          q = p * p + w;
          z = Math.sqrt(Math.abs(q));
          x += t;
          if (q >= 0) {
            z = p + sign(z, p);
            wr[nn - 2] = wr[nn - 1] = x + z;
            if (z) wr[nn - 1] = x - w / z;
            wi[nn - 2] = wi[nn - 1] = 0;
          } else {
            wr[nn - 2] = wr[nn - 1] = x + p;
            wi[nn - 2] = -z;
            wi[nn - 1] = z;
          }
          nn -= 2;
        } else {
          if (its === 60) throw new Error('vector-dense: QR iteration did not converge');
          if (its === 10 || its === 20 || its === 40) {
            t += x;
            for (let i = 1; i <= nn; i++) s_(i, i, g(i, i) - x);
            s = Math.abs(g(nn, nn - 1)) + Math.abs(g(nn - 1, nn - 2));
            y = x = 0.75 * s;
            w = -0.4375 * s * s;
          }
          ++its;
          let m;
          for (m = nn - 2; m >= l; m--) {
            z = g(m, m);
            r = x - z;
            s = y - z;
            p = (r * s - w) / g(m + 1, m) + g(m, m + 1);
            q = g(m + 1, m + 1) - z - r - s;
            r = g(m + 2, m + 1);
            s = Math.abs(p) + Math.abs(q) + Math.abs(r);
            p /= s;
            q /= s;
            r /= s;
            if (m === l) break;
            const u = Math.abs(g(m, m - 1)) * (Math.abs(q) + Math.abs(r));
            const v = Math.abs(p) * (Math.abs(g(m - 1, m - 1)) + Math.abs(z) + Math.abs(g(m + 1, m + 1)));
            if (u + v === v) break;
          }
          for (let i = m + 2; i <= nn; i++) {
            s_(i, i - 2, 0);
            if (i !== m + 2) s_(i, i - 3, 0);
          }
          for (let k = m; k <= nn - 1; k++) {
            if (k !== m) {
              p = g(k, k - 1);
              q = g(k + 1, k - 1);
              r = 0;
              if (k !== nn - 1) r = g(k + 2, k - 1);
              x = Math.abs(p) + Math.abs(q) + Math.abs(r);
              if (x !== 0) {
                p /= x;
                q /= x;
                r /= x;
              }
            }
            s = sign(Math.sqrt(p * p + q * q + r * r), p);
            if (s !== 0) {
              if (k === m) {
                if (l !== m) s_(k, k - 1, -g(k, k - 1));
              } else s_(k, k - 1, -s * x);
              p += s;
              x = p / s;
              y = q / s;
              z = r / s;
              q /= p;
              r /= p;
              for (let j = k; j <= nn; j++) {
                p = g(k, j) + q * g(k + 1, j);
                if (k !== nn - 1) {
                  p += r * g(k + 2, j);
                  s_(k + 2, j, g(k + 2, j) - p * z);
                }
                s_(k + 1, j, g(k + 1, j) - p * y);
                s_(k, j, g(k, j) - p * x);
              }
              const mmin = nn < k + 3 ? nn : k + 3;
              for (let i = l; i <= mmin; i++) {
                p = x * g(i, k) + y * g(i, k + 1);
                if (k !== nn - 1) {
                  p += z * g(i, k + 2);
                  s_(i, k + 2, g(i, k + 2) - p * r);
                }
                s_(i, k + 1, g(i, k + 1) - p * q);
                s_(i, k, g(i, k) - p);
              }
            }
          }
        }
      }
    } while (l < nn - 1);
  }
  return { re: wr, im: wi };
}

/** Solve (M) x = b in place for a dense n x n row-major matrix by LU with partial pivoting (M is copied). */
function luSolveFactory(M, n) {
  const a = Float64Array.from(M);
  const piv = new Int32Array(n);
  let amax = 0;
  for (let i = 0; i < n * n; i++) amax = Math.max(amax, Math.abs(a[i]));
  const tiny = 1e-300 + 1e-16 * amax;
  for (let k = 0; k < n; k++) {
    let p = k, mx = Math.abs(a[k * n + k]);
    for (let i = k + 1; i < n; i++)
      if (Math.abs(a[i * n + k]) > mx) {
        mx = Math.abs(a[i * n + k]);
        p = i;
      }
    piv[k] = p;
    if (p !== k)
      for (let j = 0; j < n; j++) {
        const t = a[k * n + j];
        a[k * n + j] = a[p * n + j];
        a[p * n + j] = t;
      }
    if (Math.abs(a[k * n + k]) < tiny) a[k * n + k] = a[k * n + k] < 0 ? -tiny : tiny;
    const d = a[k * n + k];
    for (let i = k + 1; i < n; i++) {
      const f = (a[i * n + k] /= d);
      if (f !== 0) for (let j = k + 1; j < n; j++) a[i * n + j] -= f * a[k * n + j];
    }
  }
  return (b) => {
    const x = Float64Array.from(b);
    for (let k = 0; k < n; k++) {
      const p = piv[k];
      if (p !== k) {
        const t = x[k];
        x[k] = x[p];
        x[p] = t;
      }
      for (let i = k + 1; i < n; i++) x[i] -= a[i * n + k] * x[k];
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = x[i];
      for (let j = i + 1; j < n; j++) s -= a[i * n + j] * x[j];
      x[i] = s / a[i * n + i];
    }
    return x;
  };
}

/**
 * Unit eigenvectors of A (n x n, row-major) for the given real eigenvalues by inverse iteration.
 * Eigenvalues closer than clusterTol (relative) form a cluster; vectors inside a cluster are orthogonalised so that
 * a semisimple multiple eigenvalue yields independent vectors.
 * @param {Float64Array} A
 * @param {number} n
 * @param {number[]} lambdas
 * @returns {Float64Array[]}
 */
export function realEigenvectors(A, n, lambdas, { clusterTol = 1e-7, iters = 3 } = {}) {
  let anorm = 0;
  for (let i = 0; i < n * n; i++) anorm = Math.max(anorm, Math.abs(A[i]));
  anorm = anorm || 1;
  let seed = 987654321;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296 - 0.5;
  };
  const out = [];
  for (let k = 0; k < lambdas.length; k++) {
    const lam = lambdas[k];
    // cluster members found so far
    const prev = [];
    for (let j = 0; j < k; j++) if (Math.abs(lambdas[j] - lam) <= clusterTol * Math.max(Math.abs(lam), anorm * 1e-8)) prev.push(out[j]);
    const shift = lam + 1e-13 * Math.max(Math.abs(lam), anorm);
    const M = Float64Array.from(A);
    for (let i = 0; i < n; i++) M[i * n + i] -= shift;
    const solve = luSolveFactory(M, n);
    let v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = rnd();
    for (let it = 0; it < iters; it++) {
      for (const u of prev) {
        let d = 0;
        for (let i = 0; i < n; i++) d += u[i] * v[i];
        for (let i = 0; i < n; i++) v[i] -= d * u[i];
      }
      v = solve(v);
      let nv = 0;
      for (let i = 0; i < n; i++) nv += v[i] * v[i];
      nv = Math.sqrt(nv) || 1;
      for (let i = 0; i < n; i++) v[i] /= nv;
    }
    for (const u of prev) {
      let d = 0;
      for (let i = 0; i < n; i++) d += u[i] * v[i];
      for (let i = 0; i < n; i++) v[i] -= d * u[i];
    }
    let nv = 0;
    for (let i = 0; i < n; i++) nv += v[i] * v[i];
    nv = Math.sqrt(nv) || 1;
    for (let i = 0; i < n; i++) v[i] /= nv;
    out.push(v);
  }
  return out;
}

/**
 * Unit complex eigenvector (re, im parts) of a real matrix A for a complex eigenvalue (lr + j li), by inverse
 * iteration on the realified 2n x 2n system [[A - lr, li], [-li, A - lr]] [vr; vi] = [wr; wi].
 * prev: unit complex vectors of the same (degenerate) eigenvalue already found; the result is made Hermitian-
 * orthogonal to them so that a multiple eigenvalue yields independent vectors.
 */
export function complexEigenvectors(A, n, lr, li, { iters = 3, prev = [], seed = 192837465 } = {}) {
  let anorm = 0;
  for (let i = 0; i < n * n; i++) anorm = Math.max(anorm, Math.abs(A[i]));
  const sr = lr + 1e-13 * Math.max(Math.hypot(lr, li), anorm);
  const N2 = 2 * n;
  const M = new Float64Array(N2 * N2);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const a = A[i * n + j] - (i === j ? sr : 0);
      M[i * N2 + j] = a;
      M[(n + i) * N2 + n + j] = a;
    }
  for (let i = 0; i < n; i++) {
    M[i * N2 + n + i] = li;
    M[(n + i) * N2 + i] = -li;
  }
  const solve = luSolveFactory(M, N2);
  let st = (seed + 7919 * prev.length) >>> 0;
  let v = new Float64Array(N2);
  for (let i = 0; i < N2; i++) {
    st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
    v[i] = st / 4294967296 - 0.5;
  }
  const orth = () => {
    for (const u of prev) {
      // c = u^H v; v -= c u
      let cr = 0, ci = 0;
      for (let i = 0; i < n; i++) {
        cr += u.re[i] * v[i] + u.im[i] * v[n + i];
        ci += u.re[i] * v[n + i] - u.im[i] * v[i];
      }
      for (let i = 0; i < n; i++) {
        v[i] -= cr * u.re[i] - ci * u.im[i];
        v[n + i] -= cr * u.im[i] + ci * u.re[i];
      }
    }
    let nv = 0;
    for (let i = 0; i < N2; i++) nv += v[i] * v[i];
    nv = Math.sqrt(nv) || 1;
    for (let i = 0; i < N2; i++) v[i] /= nv;
  };
  for (let it = 0; it < iters; it++) {
    orth();
    v = solve(v);
    orth();
  }
  return { re: v.slice(0, n), im: v.slice(n) };
}
