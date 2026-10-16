// Steady-state 2D drift-diffusion solver (DevLog-039): Scharfetter-Gummel box method on the P1 mesh, coupled Newton
// in (psi, phi_n, phi_p) with GMRES and a Cholesky block preconditioner, Gummel warm start / fallback, bias ramping.
// All potentials are scaled by V_t and densities by C0 (device.mjs scale). Residual rows (scaled):
//   F_psi_i = (K psi)_i - lambda^2 A_i (p - n + C)_i
//   F_n_i   = sum_j g^n_ij [B(-D_ij) n_i - B(D_ij) n_j] + A_i kappa U_i      (electron particle balance)
//   F_p_i   = sum_j g^p_ij [B(D_ij) p_i - B(-D_ij) p_j] + A_i kappa U_i      (hole particle balance)
// with D_ij = psi_j - psi_i, n = ni exp(psi - phi_n), p = ni exp(phi_p - psi).
// License: GPL-3.0-or-later.

import { bernoulli, gmres, ScaledSpdBlock } from './linear.mjs';
import { srh, caugheyThomasField, CAUGHEY_THOMAS_1967, Q_E } from './models.mjs';
import { contactEquilibrium } from './device.mjs';
import { EPS0 } from '../electrostatics.mjs';

const EXP_LIMIT = 500;
/** Largest quasi-Fermi update per node and Newton step (V_t). */
const PHI_STEP_CAP = 30;
/** Largest potential update per Newton step (V_t); larger steps are shortened as a whole. */
const PSI_STEP_CAP = 10;
/** Smallest Slotboom factor per step (a density decreases at most by this factor per Newton step). */
const SLOTBOOM_MIN_FACTOR = 1e-4;
/** GMRES iterations above which the next Newton iteration refactorises the preconditioner. */
const REFACTOR_GMRES = 6;
/** The preconditioner factors are reused only after a step below this size (V_t). */
const REUSE_STEP_VT = 1;
/** Gummel iterations before each coupled Newton solve (warm start; stops early when converged or stalled). */
const GUMMEL_WARM_START = 12;
/** Gummel warm start stops at this max update (V_t); Newton finishes. */
const GUMMEL_WARM_TOL = 1e-3;
/** Gummel warm start stops when an iteration reduces the update by less than this factor. */
const GUMMEL_SLOW_RATE = 0.3;
/** Field-dependent mobility: outer (lagged) iterations stop at this max change of the field factor. */
export const MOBILITY_TOL = 1e-5;
/** Bias steps up to this many V_t try Newton without a Gummel warm start first. */
const SMALL_STEP_VT = 4;
/** Quadratic termination threshold (V_t) of a Newton update. */
const QUAD_STOP_VT = 1e-5;
/** Converged states must also have a row-scaled residual (|F_i| / |J_ii|, significant rows) below this value. */
export const RESIDUAL_TOL = 1e-6;
/** A conservation-derived contact current counts as resolved when the free-node residual sum is below this fraction of it. */
export const CURRENT_RESOLVED_FRACTION = 1e-3;
/** Block symmetric Gauss-Seidel preconditioner (second carrier sweep with the psi coupling); off by default: the
 * block upper-triangular form needs the same GMRES iterations on the gate cases at fewer triangular solves. */
export let PRECOND_SYMMETRIC = false;
export function setPrecondSymmetric(v) { PRECOND_SYMMETRIC = !!v; }
/** Newton iterations of the fast path before falling back to Gummel + Newton. */
const FAST_NEWTON_MAX = 12;

export class DriftDiffusion {
  /** @param {ReturnType<import('./device.mjs').buildDevice>} dev */
  constructor(dev, { updateTolVt = 1e-8, maxNewton = 40 } = {}) {
    this.dev = dev;
    this.updateTol = updateTolVt;
    this.maxNewton = maxNewton;
    const { mesh, pat, isSemi, contactOfNode } = dev;
    const nN = mesh.nNodes;
    this.nN = nN;
    this.psiFree = new Uint8Array(nN);
    this.carFree = new Uint8Array(nN);
    for (let i = 0; i < nN; i++) {
      this.psiFree[i] = mesh.nodeElectrode[i] < 0 && contactOfNode[i] < 0 && (dev.poissonAll || isSemi[i]) ? 1 : 0;
      this.carFree[i] = isSemi[i] && contactOfNode[i] < 0 ? 1 : 0;
    }
    this.psiIdx = new Int32Array(nN).fill(-1);
    this.carIdx = new Int32Array(nN).fill(-1);
    let a = 0, b = 0;
    for (let i = 0; i < nN; i++) { if (this.psiFree[i]) this.psiIdx[i] = a++; if (this.carFree[i]) this.carIdx[i] = b++; }
    this.nPsi = a;
    this.nCar = b;
    this.nUnk = a + 2 * b;
    this._carNodes = nodesOf(this.carIdx, b);
    this._psiNodes = nodesOf(this.psiIdx, a);
    // state (scaled)
    this.psi = new Float64Array(nN);
    this.phin = new Float64Array(nN);
    this.phip = new Float64Array(nN);
    this.n = new Float64Array(nN);
    this.p = new Float64Array(nN);
    this.bias = new Float64Array(dev.contactNodes.length); // V per contact
    // contact built-in potentials (scaled), per node
    const { niCm3, Vt, C0 } = dev.scale;
    this.psiBi = new Float64Array(nN);
    this.contactPsiMean = new Float64Array(dev.contactNodes.length);
    dev.contactNodes.forEach((nodes, k) => {
      let s = 0, w = 0;
      for (const i of nodes) if (isSemi[i]) {
        const [psi0] = contactEquilibrium(dev.ND[i] - dev.NA[i], niCm3, Vt);
        this.psiBi[i] = psi0 / Vt;
        s += dev.cvArea[i] * this.psiBi[i];
        w += dev.cvArea[i];
      }
      this.contactPsiMean[k] = s / w;
      for (const i of nodes) if (!isSemi[i]) this.psiBi[i] = this.contactPsiMean[k];
    });
    // Jacobian storage (node pattern) and residuals
    const nnz = pat.nnz;
    this.F = { psi: new Float64Array(nN), n: new Float64Array(nN), p: new Float64Array(nN) };
    this.J = {
      psiPsi: new Float64Array(nnz), psiN: new Float64Array(nN), psiP: new Float64Array(nN),
      nPsi: new Float64Array(nnz), nN: new Float64Array(nnz), nP: new Float64Array(nN),
      pPsi: new Float64Array(nnz), pP: new Float64Array(nnz), pN: new Float64Array(nN),
    };
    // edge mobilities (scaled couplings g = w mu / mu_ref)
    const E = dev.edges;
    this.gN = new Float64Array(E.n);
    this.gP = new Float64Array(E.n);
    this.fieldFactorN = new Float64Array(E.n).fill(1);
    this.fieldFactorP = new Float64Array(E.n).fill(1);
    this.updateEdgeMobility();
    // preconditioner blocks (symbolic analysis once per mesh)
    this.S = new ScaledSpdBlock(pat, this.psiFree);
    this.Hn = new ScaledSpdBlock(pat, this.carFree);
    this.Hp = new ScaledSpdBlock(pat, this.carFree, { sym: this.Hn.chol.sym });
    this.hbuf = new Float64Array(nnz);
    this.u = new Float64Array(nN);
    this.v = new Float64Array(nN);
    this.stats = { newton: 0, gmres: 0, gummel: 0, factor: 0, assemble_ms: 0, factor_ms: 0, gmres_ms: 0 };
    this.equilibrium = null;
    this.floored = 0;
    this.factorsValid = false;
  }

  // ---- state helpers ----

  /** Set contact biases (V) and impose the Dirichlet values. */
  setBias(biasV) {
    const { dev } = this;
    const Vt = dev.scale.Vt;
    biasV.forEach((v, k) => { this.bias[k] = v; });
    dev.contactNodes.forEach((nodes, k) => {
      const vb = this.bias[k] / Vt;
      for (const i of nodes) {
        this.psi[i] = this.psiBi[i] + vb;
        if (dev.isSemi[i]) { this.phin[i] = vb; this.phip[i] = vb; }
      }
    });
    this.updateCarriers();
  }

  updateCarriers() {
    const { dev, psi, phin, phip, n, p } = this;
    const ni = dev.scale.niHat;
    for (let i = 0; i < this.nN; i++) {
      if (!dev.isSemi[i]) { n[i] = 0; p[i] = 0; continue; }
      let en = psi[i] - phin[i], ep = phip[i] - psi[i];
      // density floor n_i exp(-EXP_LIMIT): negligible carriers stay representable (quasi-Fermi level pinned there)
      if (en < -EXP_LIMIT) { en = -EXP_LIMIT; phin[i] = psi[i] + EXP_LIMIT; this.floored++; }
      if (ep < -EXP_LIMIT) { ep = -EXP_LIMIT; phip[i] = psi[i] - EXP_LIMIT; this.floored++; }
      if (en > EXP_LIMIT || ep > EXP_LIMIT) throw new Error('drift-diffusion: carrier density above the double-precision range');
      n[i] = ni * Math.exp(en);
      p[i] = ni * Math.exp(ep);
    }
  }

  snapshot() { return { psi: Float64Array.from(this.psi), phin: Float64Array.from(this.phin), phip: Float64Array.from(this.phip), bias: Float64Array.from(this.bias), gN: Float64Array.from(this.gN), gP: Float64Array.from(this.gP) }; }
  restore(s) { this.psi.set(s.psi); this.phin.set(s.phin); this.phip.set(s.phip); this.bias.set(s.bias); if (s.gN) { this.gN.set(s.gN); this.gP.set(s.gP); } this.updateCarriers(); }

  /** Edge couplings from low-field nodal mobility and the (lagged) Caughey-Thomas field factor. */
  updateEdgeMobility() {
    const { dev } = this;
    const E = dev.edges;
    for (let e = 0; e < E.n; e++) {
      const i = E.i[e], j = E.j[e];
      const mn = 0.5 * (dev.muN0[i] + dev.muN0[j]) * this.fieldFactorN[e];
      const mp = 0.5 * (dev.muP0[i] + dev.muP0[j]) * this.fieldFactorP[e];
      this.gN[e] = (E.w[e] * mn * 1e-4) / dev.scale.muRef;
      this.gP[e] = (E.w[e] * mp * 1e-4) / dev.scale.muRef;
    }
  }

  /** Caughey-Thomas field factors from the electric field along each edge; returns the max change. */
  updateFieldMobility() {
    const { dev } = this;
    if (dev.mobility.field !== 'caughey_thomas_1967') return 0;
    const E = dev.edges, Vt = dev.scale.Vt;
    let change = 0;
    for (let e = 0; e < E.n; e++) {
      const i = E.i[e], j = E.j[e];
      const h = E.len[e] * 1e-4; // cm
      // driving force: electric field component along the edge (Caughey-Thomas fit is drift velocity vs field)
      const fn = (Math.abs(this.psi[j] - this.psi[i]) * Vt) / h, fp = fn;
      const mn0 = 0.5 * (dev.muN0[i] + dev.muN0[j]), mp0 = 0.5 * (dev.muP0[i] + dev.muP0[j]);
      const an = caugheyThomasField(mn0, fn, CAUGHEY_THOMAS_1967.field.electrons) / mn0;
      const ap = caugheyThomasField(mp0, fp, CAUGHEY_THOMAS_1967.field.holes) / mp0;
      change = Math.max(change, Math.abs(an - this.fieldFactorN[e]), Math.abs(ap - this.fieldFactorP[e]));
      this.fieldFactorN[e] = an;
      this.fieldFactorP[e] = ap;
    }
    this.updateEdgeMobility();
    return change;
  }

  // ---- assembly ----

  /** Residuals (all nodes) and, with `jac`, the Jacobian in (psi, phi_n, phi_p). */
  assemble(jac = true) {
    const t0 = performance.now();
    const { dev, psi, n, p, F, J } = this;
    const { pat, K, cvArea, isSemi, Chat, diagSlot } = dev;
    const { lambda2, kappa, niHat } = dev.scale;
    const nN = this.nN;
    F.n.fill(0);
    F.p.fill(0);
    if (jac) { J.nPsi.fill(0); J.nN.fill(0); J.nP.fill(0); J.pPsi.fill(0); J.pP.fill(0); J.pN.fill(0); J.psiPsi.set(K); }
    for (let i = 0; i < nN; i++) {
      let s = 0;
      for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) s += K[q] * psi[pat.colidx[q]];
      if (isSemi[i]) {
        const A = cvArea[i];
        s -= lambda2 * A * (p[i] - n[i] + Chat[i]);
        if (jac) {
          J.psiPsi[diagSlot[i]] += lambda2 * A * (n[i] + p[i]);
          J.psiN[i] = -lambda2 * A * n[i];
          J.psiP[i] = -lambda2 * A * p[i];
        }
      } else if (jac) { J.psiN[i] = 0; J.psiP[i] = 0; }
      F.psi[i] = s;
    }
    const E = dev.edges;
    const { gN, gP } = this;
    for (let e = 0; e < E.n; e++) {
      const i = E.i[e], j = E.j[e];
      const D = psi[j] - psi[i];
      const [Bp, dB] = bernoulli(D);
      const Bm = Bp + D;
      const ni_ = n[i], nj = n[j], pi_ = p[i], pj = p[j];
      const g = gN[e], h = gP[e];
      const Fn = g * (Bm * ni_ - Bp * nj);
      const Fp = h * (Bp * pi_ - Bm * pj);
      F.n[i] += Fn; F.n[j] -= Fn;
      F.p[i] += Fp; F.p[j] -= Fp;
      if (!jac) continue;
      const sii = diagSlot[i], sjj = diagSlot[j], sij = E.sij[e], sji = E.sji[e];
      // electrons: d/dDelta, then total derivatives at fixed quasi-Fermi potentials
      const dFn = g * ((dB + 1) * ni_ - dB * nj);
      const nPsiJ = dFn - g * Bp * nj, nPsiI = -dFn + g * Bm * ni_;
      const nPhiI = -g * Bm * ni_, nPhiJ = g * Bp * nj;
      J.nPsi[sii] += nPsiI; J.nPsi[sij] += nPsiJ; J.nPsi[sji] -= nPsiI; J.nPsi[sjj] -= nPsiJ;
      J.nN[sii] += nPhiI; J.nN[sij] += nPhiJ; J.nN[sji] -= nPhiI; J.nN[sjj] -= nPhiJ;
      // holes
      const dFp = h * (dB * pi_ - (dB + 1) * pj);
      const pPsiJ = dFp + h * Bm * pj, pPsiI = -dFp - h * Bp * pi_;
      const pPhiI = h * Bp * pi_, pPhiJ = -h * Bm * pj;
      J.pPsi[sii] += pPsiI; J.pPsi[sij] += pPsiJ; J.pPsi[sji] -= pPsiI; J.pPsi[sjj] -= pPsiJ;
      J.pP[sii] += pPhiI; J.pP[sij] += pPhiJ; J.pP[sji] -= pPhiI; J.pP[sjj] -= pPhiJ;
    }
    const r = dev.srh;
    if (r) {
      const ni2 = niHat * niHat;
      for (let i = 0; i < nN; i++) {
        if (!isSemi[i]) continue;
        const A = cvArea[i] * kappa;
        const [U, Un, Up] = srh(n[i], p[i], ni2, r.tauN, r.tauP, r.n1, r.p1);
        F.n[i] += A * U;
        F.p[i] += A * U;
        if (!jac) continue;
        const dPhin = -A * Un * n[i], dPhip = A * Up * p[i], dPsi = A * (Un * n[i] - Up * p[i]);
        const d = diagSlot[i];
        J.nN[d] += dPhin; J.nP[i] += dPhip; J.nPsi[d] += dPsi;
        J.pN[i] += dPhin; J.pP[d] += dPhip; J.pPsi[d] += dPsi;
      }
    }
    this.stats.assemble_ms += performance.now() - t0;
  }

  // ---- preconditioner ----

  /** Factorise the three symmetric blocks at the current state (after assemble(true)). */
  factorBlocks() {
    const t0 = performance.now();
    this.factorsValid = true;
    this.S.factor(this.J.psiPsi);
    this.factorCarrier('n');
    this.factorCarrier('p');
    this.stats.factor++;
    this.stats.factor_ms += performance.now() - t0;
  }

  /**
   * Factorise one carrier block (after assemble(true)): electrons M = -J_nn, H = diag(u) M with
   * u = exp(-(phi_n - ref)); holes H = diag(v) J_pp with v = exp(phi_p - ref). Both are symmetric M-matrices.
   */
  factorCarrier(which) {
    const { dev, J, hbuf } = this;
    let lo = Infinity, hi = -Infinity;
    const phi = which === 'n' ? this.phin : this.phip;
    for (let i = 0; i < this.nN; i++) if (this.carFree[i]) { lo = Math.min(lo, phi[i]); hi = Math.max(hi, phi[i]); }
    const ref = 0.5 * (lo + hi);
    const w = which === 'n' ? this.u : this.v;
    for (let i = 0; i < this.nN; i++) w[i] = which === 'n' ? Math.exp(-(phi[i] - ref)) : Math.exp(phi[i] - ref);
    symmetrise(dev.pat, which === 'n' ? J.nN : J.pP, w, which === 'n' ? -1 : 1, hbuf);
    (which === 'n' ? this.Hn : this.Hp).factor(hbuf);
  }

  /** Apply the block preconditioner to an (unscaled) residual-space vector r (free layout); result z. */
  precondApply(r, z) {
    const { nPsi, nCar, S, Hn, Hp, u, v, J } = this;
    const bn = this._bn ??= new Float64Array(nCar), bp = this._bp ??= new Float64Array(nCar), bs = this._bs ??= new Float64Array(nPsi);
    const tn = this._tn ??= new Float64Array(nCar), tp = this._tp ??= new Float64Array(nCar), ts = this._ts ??= new Float64Array(nPsi);
    const carNodes = this._carNodes ??= nodesOf(this.carIdx, nCar), psiNodes = this._psiNodes ??= nodesOf(this.psiIdx, nPsi);
    // carriers first (J_nn z_n = r_n, J_pp z_p = r_p), then psi with the carrier coupling (block upper triangular)
    for (let k = 0; k < nCar; k++) { const i = carNodes[k]; bn[k] = -u[i] * r[nPsi + k]; bp[k] = v[i] * r[nPsi + nCar + k]; }
    Hn.solve(bn, tn);
    Hp.solve(bp, tp);
    for (let k = 0; k < nCar; k++) { z[nPsi + k] = tn[k]; z[nPsi + nCar + k] = tp[k]; }
    for (let k = 0; k < nPsi; k++) {
      const i = psiNodes[k];
      const kc = this.carIdx[i];
      bs[k] = r[k] - (kc >= 0 ? J.psiN[i] * tn[kc] + J.psiP[i] * tp[kc] : 0);
    }
    S.solve(bs, ts);
    for (let k = 0; k < nPsi; k++) z[k] = ts[k];
    if (!PRECOND_SYMMETRIC) return;
    // second carrier sweep with the psi coupling (block symmetric Gauss-Seidel): J_nn z_n = r_n - J_npsi z_psi
    const cpl = this._cpl ??= new Float64Array(2 * nCar);
    this.carrierPsiCoupling(ts, cpl);
    for (let k = 0; k < nCar; k++) { const i = carNodes[k]; bn[k] = -u[i] * (r[nPsi + k] - cpl[k]); bp[k] = v[i] * (r[nPsi + nCar + k] - cpl[nCar + k]); }
    Hn.solve(bn, tn);
    Hp.solve(bp, tp);
    for (let k = 0; k < nCar; k++) { z[nPsi + k] = tn[k]; z[nPsi + nCar + k] = tp[k]; }
  }

  /** (J_npsi x_psi, J_ppsi x_psi) on the free carrier rows for a free-psi vector x. */
  carrierPsiCoupling(xPsi, out) {
    const { dev, J, nCar } = this;
    const { pat } = dev;
    const xs = this._xs2 ??= new Float64Array(this.nN);
    for (let i = 0; i < this.nN; i++) { const a = this.psiIdx[i]; xs[i] = a >= 0 ? xPsi[a] : 0; }
    const carNodes = this._carNodes;
    for (let k = 0; k < nCar; k++) {
      const i = carNodes[k];
      let a = 0, b = 0;
      for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) { const x = xs[pat.colidx[q]]; a += J.nPsi[q] * x; b += J.pPsi[q] * x; }
      out[k] = a;
      out[nCar + k] = b;
    }
  }

  /** Jacobian times a free-layout vector. */
  jacApply(x, y) {
    const { dev, J, nPsi, nCar, psiIdx, carIdx } = this;
    const { pat } = dev;
    const nN = this.nN;
    const xs = this._xs ??= new Float64Array(nN), xn = this._xn ??= new Float64Array(nN), xp = this._xp ??= new Float64Array(nN);
    for (let i = 0; i < nN; i++) {
      const a = psiIdx[i], c = carIdx[i];
      xs[i] = a >= 0 ? x[a] : 0;
      xn[i] = c >= 0 ? x[nPsi + c] : 0;
      xp[i] = c >= 0 ? x[nPsi + nCar + c] : 0;
    }
    for (let i = 0; i < nN; i++) {
      const a = psiIdx[i], c = carIdx[i];
      if (a < 0 && c < 0) continue;
      let ys = 0, yn = 0, yp = 0;
      for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) {
        const j = pat.colidx[q];
        const sj = xs[j];
        ys += J.psiPsi[q] * sj;
        if (c >= 0) { yn += J.nPsi[q] * sj + J.nN[q] * xn[j]; yp += J.pPsi[q] * sj + J.pP[q] * xp[j]; }
      }
      if (a >= 0) y[a] = ys + J.psiN[i] * xn[i] + J.psiP[i] * xp[i];
      if (c >= 0) { y[nPsi + c] = yn + J.nP[i] * xp[i]; y[nPsi + nCar + c] = yp + J.pN[i] * xn[i]; }
    }
  }

  /** Row scaling (inverse diagonal magnitudes) of the free rows. */
  rowScale(out) {
    const { dev, J, nPsi, nCar } = this;
    const d = dev.diagSlot;
    for (let i = 0; i < this.nN; i++) {
      const a = this.psiIdx[i], c = this.carIdx[i];
      if (a >= 0) out[a] = 1 / J.psiPsi[d[i]];
      if (c >= 0) { out[nPsi + c] = 1 / Math.abs(J.nN[d[i]]); out[nPsi + nCar + c] = 1 / Math.abs(J.pP[d[i]]); }
    }
  }

  gatherResidual(out) {
    const { F, nPsi, nCar } = this;
    for (let i = 0; i < this.nN; i++) {
      const a = this.psiIdx[i], c = this.carIdx[i];
      if (a >= 0) out[a] = F.psi[i];
      if (c >= 0) { out[nPsi + c] = F.n[i]; out[nPsi + nCar + c] = F.p[i]; }
    }
  }

  // ---- solvers ----

  /** Equilibrium (all contacts at 0 V): nonlinear Poisson with phi_n = phi_p = 0 from the charge-neutral guess. */
  solveEquilibrium() {
    const { dev } = this;
    const ni = dev.scale.niHat;
    for (let i = 0; i < this.nN; i++) {
      this.phin[i] = 0; this.phip[i] = 0;
      this.psi[i] = dev.isSemi[i] ? Math.asinh(dev.Chat[i] / (2 * ni)) : 0;
    }
    this.setBias(new Float64Array(this.bias.length));
    // insulator nodes: start from the mean of the contact potentials
    for (let i = 0; i < this.nN; i++) if (!dev.isSemi[i] && this.psiFree[i]) this.psi[i] = 0;
    const r = this.solvePoisson({ maxIt: 200, tol: 1e-12 });
    if (!r.converged) throw new Error(`equilibrium Poisson did not converge (${r.iterations} iterations, max update ${r.maxUpdate.toExponential(2)} V_t)`);
    this.equilibrium = this.snapshot();
    return r;
  }

  /** Nonlinear Poisson at fixed quasi-Fermi potentials (Newton, SPD Jacobian), log-damped updates. */
  solvePoisson({ maxIt = 50, tol = 1e-10, chord = false } = {}) {
    const z = new Float64Array(this.nPsi), b = new Float64Array(this.nPsi);
    const psiNodes = this._psiNodes;
    let maxUpdate = Infinity, it = 0, prev = Infinity, fresh = false;
    for (; it < maxIt; it++) {
      this.assembleWithoutCarriers();
      // chord option (Gummel): the factor is refreshed at the first iteration and when the update stops shrinking
      if (!chord || it === 0 || maxUpdate > 0.25 * prev) {
        const t0 = performance.now();
        this.S.factor(this.J.psiPsi);
        this.stats.factor_ms += performance.now() - t0;
        fresh = true;
      } else fresh = false;
      prev = maxUpdate;
      for (let k = 0; k < this.nPsi; k++) b[k] = -this.F.psi[psiNodes[k]];
      this.S.solve(b, z);
      maxUpdate = 0;
      for (let k = 0; k < this.nPsi; k++) {
        const i = psiNodes[k];
        const d = z[k];
        const dd = Math.abs(d) > 1 ? Math.sign(d) * (1 + Math.log(Math.abs(d))) : d; // log damping beyond 1 V_t
        this.psi[i] += dd;
        maxUpdate = Math.max(maxUpdate, Math.abs(d));
      }
      this.updateCarriers();
      if (maxUpdate < tol) { it++; break; }
      if (!fresh && maxUpdate > prev) prev = Infinity; // force a refresh next time
    }
    return { converged: maxUpdate < tol, iterations: it, maxUpdate };
  }

  /** Poisson residual and Jacobian only (Gummel / equilibrium). */
  assembleWithoutCarriers() {
    const { dev, psi, n, p, F, J } = this;
    const { pat, K, cvArea, isSemi, Chat, diagSlot } = dev;
    const { lambda2 } = dev.scale;
    J.psiPsi.set(K);
    for (let i = 0; i < this.nN; i++) {
      let s = 0;
      for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) s += K[q] * psi[pat.colidx[q]];
      if (isSemi[i]) {
        const A = cvArea[i];
        s -= lambda2 * A * (p[i] - n[i] + Chat[i]);
        J.psiPsi[diagSlot[i]] += lambda2 * A * (n[i] + p[i]);
      }
      F.psi[i] = s;
    }
  }

  /**
   * Gummel iterations (nonlinear block Gauss-Seidel): nonlinear Poisson at fixed quasi-Fermi potentials, then the
   * electron and the hole continuity block (one Slotboom-form Newton step each, exact for the linear block with SRH
   * linearised). Stops at max update < tol (V_t) or when the update stops decreasing.
   */
  gummel({ maxIt = 30, tol = 1e-6 } = {}) {
    const nCar = this.nCar;
    const carNodes = this._carNodes;
    const bn = new Float64Array(nCar), tn = new Float64Array(nCar);
    let it = 0, maxUpdate = Infinity, best = Infinity, stall = 0, prevMu = Infinity;
    for (; it < maxIt; it++) {
      const psiOld = Float64Array.from(this.psi);
      this.solvePoisson({ maxIt: 30, tol: 1e-9, chord: true });
      let mu = 0;
      for (let i = 0; i < this.nN; i++) mu = Math.max(mu, Math.abs(this.psi[i] - psiOld[i]));
      for (const carrier of ['n', 'p']) {
        this.assemble(true);
        const t0 = performance.now();
        this.factorCarrier(carrier);
        this.stats.factor_ms += performance.now() - t0;
        const F = carrier === 'n' ? this.F.n : this.F.p, w = carrier === 'n' ? this.u : this.v;
        // J_nn dphi = -F_n  =>  dphi = H^-1 (u F_n);  J_pp dphi = -F_p  =>  dphi = -H^-1 (v F_p)
        for (let k = 0; k < nCar; k++) { const i = carNodes[k]; bn[k] = carrier === 'n' ? w[i] * F[i] : -w[i] * F[i]; }
        (carrier === 'n' ? this.Hn : this.Hp).solve(bn, tn);
        const phi = carrier === 'n' ? this.phin : this.phip;
        for (let k = 0; k < nCar; k++) {
          const f = carrier === 'n' ? 1 - tn[k] : 1 + tn[k];
          const d = clamp(Math.log(f > SLOTBOOM_MIN_FACTOR ? f : SLOTBOOM_MIN_FACTOR), PHI_STEP_CAP);
          phi[carNodes[k]] += carrier === 'n' ? -d : d;
          if (this.significant(carNodes[k], carrier)) mu = Math.max(mu, Math.abs(d));
        }
        this.updateCarriers();
      }
      maxUpdate = mu;
      this.stats.gummel++;
      if (mu < tol) { it++; break; }
      // slow linear convergence (high injection): hand over to Newton
      if (it >= 2 && mu > GUMMEL_SLOW_RATE * prevMu) { it++; break; }
      prevMu = mu;
      if (mu < 0.9 * best) { best = mu; stall = 0; } else if (++stall >= 4) { it++; break; }
    }
    return { iterations: it, maxUpdate, converged: maxUpdate < tol };
  }

  /** Scaled residual norm (row scaling d of the current state). */
  scaledNorm(d, buf) {
    this.gatherResidual(buf);
    let s = 0;
    for (let k = 0; k < buf.length; k++) { const v = buf[k] * d[k]; s += v * v; }
    return Math.sqrt(s);
  }

  /** Coupled Newton at the current bias from the current state. */
  newton({ maxIt = this.maxNewton, tol = this.updateTol, residualTol = RESIDUAL_TOL } = {}) {
    const N = this.nUnk, nPsi = this.nPsi, nCar = this.nCar;
    const d = new Float64Array(N), b = new Float64Array(N), buf = new Float64Array(N);
    const carNodes = this._carNodes, psiNodes = this._psiNodes;
    const tmp = new Float64Array(N);
    const history = [];
    let converged = false, it = 0, lastLin = null, lastGm = Infinity, lastStep = Infinity, prevUpd = Infinity, gmresFailures = 0;
    for (; it < maxIt; it++) {
      this.assemble(true);
      // the preconditioner factors (any recent state) are refreshed only when the linear solve gets hard or the
      // state moved far; GMRES absorbs the staleness
      let fresh = false;
      if (!this.factorsValid || lastGm > REFACTOR_GMRES || lastStep > REUSE_STEP_VT) { this.factorBlocks(); fresh = true; }
      this.rowScale(d);
      this.gatherResidual(b);
      let r0 = 0;
      for (let k = 0; k < N; k++) { b[k] = -b[k] * d[k]; r0 += b[k] * b[k]; }
      r0 = Math.sqrt(r0);
      const t0 = performance.now();
      const matvec = (x, y) => { this.jacApply(x, y); for (let k = 0; k < N; k++) y[k] *= d[k]; };
      const precond = (x, y) => { for (let k = 0; k < N; k++) tmp[k] = x[k] / d[k]; this.precondApply(tmp, y); };
      const eta = it < 2 ? 1e-4 : 1e-10;
      const work = this._gmresWork ??= {};
      let lin = gmres(matvec, precond, b, { tol: eta, restart: 30, maxIter: fresh ? 150 : 3 * REFACTOR_GMRES, work });
      if (!lin.converged && !fresh) {
        this.stats.gmres += lin.iterations;
        this.factorBlocks();
        lin = gmres(matvec, precond, b, { tol: eta, restart: 30, maxIter: 150, work });
      }
      if (!lin.converged) { gmresFailures++; this.stats.gmresFailures = (this.stats.gmresFailures ?? 0) + 1; }
      this.stats.gmres += lin.iterations;
      this.stats.gmres_ms += performance.now() - t0;
      lastLin = lin;
      lastGm = lin.iterations;
      const z = lin.x; // gmres returns the solution itself (x = M y accumulated)
      let maxPsi = 0, maxPhi = 0;
      for (let k = 0; k < nPsi; k++) maxPsi = Math.max(maxPsi, Math.abs(z[k]));
      for (let k = 0; k < nCar; k++) {
        const i = carNodes[k];
        if (this.significant(i, 'n')) maxPhi = Math.max(maxPhi, Math.abs(z[nPsi + k]));
        if (this.significant(i, 'p')) maxPhi = Math.max(maxPhi, Math.abs(z[nPsi + nCar + k]));
      }
      if (maxPsi < tol && maxPhi < tol) {
        this.applyStep(z, 1, psiNodes, carNodes);
        this.updateCarriers();
        // field-dependent mobility lagged by one Newton iteration: converged when its factors no longer change
        const dmu = this.updateFieldMobility();
        history.push({ it, r0, rNew: null, t: 1, maxPsi, maxPhi, gmres: lin.iterations, relres: lin.relres, mobilityChange: dmu });
        this.stats.newton++;
        if (dmu < MOBILITY_TOL) { converged = true; it++; break; }
        lastStep = Infinity;
        continue;
      }
      let t = Math.min(1, PSI_STEP_CAP / Math.max(maxPsi, 1e-300));
      const save = this.snapshot();
      let accepted = false, rNew = Infinity;
      for (let ls = 0; ls < 8; ls++) {
        this.applyStep(z, t, psiNodes, carNodes);
        try { this.updateCarriers(); this.assemble(false); rNew = this.scaledNorm(d, buf); } catch { rNew = Infinity; }
        if (rNew <= (1 - 1e-4 * t) * r0) { accepted = true; break; }
        this.restore(save);
        t *= 0.5;
      }
      if (!accepted) { this.restore(save); this.applyStep(z, t, psiNodes, carNodes); this.updateCarriers(); }
      const dmu = t === 1 ? this.updateFieldMobility() : 0;
      history.push({ it, r0, rNew, t, maxPsi, maxPhi, gmres: lin.iterations, relres: lin.relres, mobilityChange: dmu });
      this.stats.newton++;
      const upd = Math.max(maxPsi, maxPhi);
      // quadratic termination: a full step below QUAD_STOP_VT that squared the previous one predicts a next update
      // below 10 upd^2 < tol, so the verification iteration is skipped
      if (accepted && t === 1 && upd < QUAD_STOP_VT && upd <= 10 * prevUpd * prevUpd && 10 * upd * upd < tol && dmu < MOBILITY_TOL) { converged = true; it++; break; }
      prevUpd = t === 1 ? upd : Infinity;
      lastStep = dmu > REUSE_STEP_VT ? Infinity : t * upd;
    }
    // audit D5: residual check of the accepted state (row-scaled, significant carrier rows only)
    let residualInf = null;
    if (converged) {
      this.assemble(true);
      this.rowScale(d);
      this.gatherResidual(b);
      residualInf = 0;
      for (let k = 0; k < nPsi; k++) residualInf = Math.max(residualInf, Math.abs(b[k] * d[k]));
      for (let k = 0; k < nCar; k++) {
        const i = carNodes[k];
        if (this.significant(i, 'n')) residualInf = Math.max(residualInf, Math.abs(b[nPsi + k] * d[nPsi + k]));
        if (this.significant(i, 'p')) residualInf = Math.max(residualInf, Math.abs(b[nPsi + nCar + k] * d[nPsi + nCar + k]));
      }
      if (!(residualInf <= residualTol)) converged = false;
    }
    return { converged, iterations: it, history, residualInf, gmresFailures, lastLinear: lastLin ? { iterations: lastLin.iterations, relres: lastLin.relres } : null };
  }

  /**
   * Apply a Newton step z (psi, phi_n, phi_p linearisation) with length t. Carriers are updated in Slotboom form
   * (u = exp(-phi_n), v = exp(phi_p)): u <- u (1 - t dphi_n), v <- v (1 + t dphi_p), i.e. Newton in (psi, u, v),
   * exact for the linear continuity blocks; a factor below SLOTBOOM_MIN_FACTOR is replaced by it.
   */
  applyStep(z, t, psiNodes, carNodes) {
    const nPsi = this.nPsi, nCar = this.nCar;
    for (let k = 0; k < nPsi; k++) this.psi[psiNodes[k]] += t * z[k];
    for (let k = 0; k < nCar; k++) {
      const i = carNodes[k];
      const fu = 1 - t * z[nPsi + k], fv = 1 + t * z[nPsi + nCar + k];
      this.phin[i] -= clamp(Math.log(fu > SLOTBOOM_MIN_FACTOR ? fu : SLOTBOOM_MIN_FACTOR), PHI_STEP_CAP);
      this.phip[i] += clamp(Math.log(fv > SLOTBOOM_MIN_FACTOR ? fv : SLOTBOOM_MIN_FACTOR), PHI_STEP_CAP);
    }
  }

  /** Carrier counted in the convergence test (see below). */
  significant(i, which) {
    // above 1e-6 of the equilibrium minority density n_i^2 / max(|N|, n_i): majority and minority carriers of the
    // quasi-neutral regions count; carriers depleted far below that (reverse-biased space charge) do not
    const dev = this.dev;
    const ni = dev.scale.niHat;
    const ref = (1e-6 * ni * ni) / Math.max(Math.abs(dev.Chat[i]), ni);
    return (which === 'n' ? this.n[i] : this.p[i]) > ref;
  }

  /** Newton with lagged field-dependent mobility iterated to self-consistency. */
  solveCoupled({ gummel = true, maxIt = this.maxNewton } = {}) {
    const g = gummel ? this.gummel({ maxIt: GUMMEL_WARM_START, tol: GUMMEL_WARM_TOL }) : null;
    const r = this.newton({ maxIt });
    r.gummel = g;
    return r;
  }

  /**
   * Ramp the contact biases from the current state to `target` (V per contact) with adaptive steps. Each step: the
   * side-shift predictor, then Newton alone for a small step (<= SMALL_STEP_VT), otherwise a Gummel warm start and
   * Newton; a failed step is retried with Gummel and then halved. Easy steps grow by 1.5 up to maxStep.
   */
  rampTo(target, { maxStep = 0.5, forwardStep = null, minStep = 1e-3 } = {}) {
    const cur = Float64Array.from(this.bias);
    const tgt = Float64Array.from(target);
    let step = maxStep;
    const steps = [];
    const dist = (a, b) => { let m = 0; for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k] - b[k])); return m; };
    if (dist(cur, tgt) === 0) {
      const r = this.solveCoupled();
      steps.push({ bias: Array.from(cur), iterations: r.iterations, converged: r.converged, gummel: r.gummel?.iterations ?? 0, gmres: r.history?.reduce((a, h) => a + h.gmres, 0) ?? 0, residualInf: r.residualInf });
      if (!r.converged) throw new Error('drift-diffusion: Newton did not converge at the start bias');
      return steps;
    }
    while (dist(cur, tgt) > 0) {
      const d = dist(cur, tgt);
      // forward-biased junctions (p contacts above n contacts) ramp with the smaller forward step
      const lim = forwardStep != null && this.forwardBias(tgt) > 0 && this.forwardBias(tgt) >= this.forwardBias(cur) ? Math.min(step, forwardStep) : step;
      const frac = Math.min(1, lim / d);
      const next = Float64Array.from(cur, (v, k) => (frac === 1 ? tgt[k] : v + frac * (tgt[k] - v)));
      const save = this.snapshot();
      const small = dist(next, cur) <= SMALL_STEP_VT * this.dev.scale.Vt;
      const attempt = (gummel) => {
        this.restore(save);
        this.sideShift(cur, next);
        this.setBias(next);
        try { return this.solveCoupled({ gummel, maxIt: gummel ? this.maxNewton : FAST_NEWTON_MAX }); } catch (e) { return { converged: false, error: e.message }; }
      };
      let r = attempt(!small);
      if (!r.converged && small) r = attempt(true);
      if (!r.converged) {
        this.restore(save);
        step *= 0.5;
        if (step < minStep) throw new Error(`drift-diffusion: bias ramp failed near ${Array.from(next).map((v) => v.toFixed(4)).join(', ')} V (step below ${minStep} V)${r.error ? ': ' + r.error : ''}`);
        continue;
      }
      steps.push({ bias: Array.from(next), iterations: r.iterations, converged: true, gummel: r.gummel?.iterations ?? 0, gmres: r.history?.reduce((a, h) => a + h.gmres, 0) ?? 0, residualInf: r.residualInf });
      cur.set(next);
      if (r.iterations <= 5) step = Math.min(maxStep, step * 1.5);
    }
    return steps;
  }

  /** Forward bias of a bias vector: mean bias of p-type contacts minus mean of n-type contacts (0 if one type lacks). */
  forwardBias(b) {
    const t = this.dev.contactType;
    let sp = 0, np = 0, sn = 0, nn = 0;
    for (let k = 0; k < b.length; k++) if (t[k] === 'p') { sp += b[k]; np++; } else { sn += b[k]; nn++; }
    return np && nn ? sp / np - sn / nn : 0;
  }

  /** First-step predictor: shift psi and the quasi-Fermi potentials of each contact's doping-type side with its bias. */
  sideShift(from, to) {
    const { dev } = this;
    const Vt = dev.scale.Vt;
    for (let i = 0; i < this.nN; i++) {
      if (!this.carFree[i]) continue;
      let d = 0;
      for (let k = 0; k < from.length; k++) d += dev.sideWeight[k][i] * (to[k] - from[k]);
      d /= Vt;
      this.psi[i] += d; this.phin[i] += d; this.phip[i] += d;
    }
  }

  /**
   * Linear response of the converged state to the bias of contact k: z = dx/dV_k (free layout, per volt, in the
   * Newton variables psi, phi_n, phi_p scaled by V_t), from J z = -dF/dV_k at the current factors.
   */
  tangent(k) {
    const N = this.nUnk, nPsi = this.nPsi, nCar = this.nCar;
    const { dev, J } = this;
    const { pat } = dev;
    this.assemble(true);
    if (!this.factorsValid) this.factorBlocks();
    const d = new Float64Array(N), b = new Float64Array(N), tmp = new Float64Array(N);
    this.rowScale(d);
    const inv = 1 / dev.scale.Vt;
    const onC = (j) => dev.contactOfNode[j] === k;
    for (let i = 0; i < this.nN; i++) {
      const a = this.psiIdx[i], c = this.carIdx[i];
      if (a < 0 && c < 0) continue;
      let ys = 0, yn = 0, yp = 0;
      for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) {
        const j = pat.colidx[q];
        if (!onC(j)) continue;
        ys += J.psiPsi[q] * inv;
        if (c >= 0 && dev.isSemi[j]) { yn += (J.nPsi[q] + J.nN[q]) * inv; yp += (J.pPsi[q] + J.pP[q]) * inv; }
        else if (c >= 0) { yn += J.nPsi[q] * inv; yp += J.pPsi[q] * inv; }
      }
      if (a >= 0) b[a] = -ys * d[a];
      if (c >= 0) { b[nPsi + c] = -yn * d[nPsi + c]; b[nPsi + nCar + c] = -yp * d[nPsi + nCar + c]; }
    }
    const matvec = (x, y) => { this.jacApply(x, y); for (let q = 0; q < N; q++) y[q] *= d[q]; };
    const precond = (x, y) => { for (let q = 0; q < N; q++) tmp[q] = x[q] / d[q]; this.precondApply(tmp, y); };
    let lin = gmres(matvec, precond, b, { tol: 1e-10, restart: 30, maxIter: 150, work: this._gmresWork ??= {} });
    if (!lin.converged) { this.factorBlocks(); lin = gmres(matvec, precond, b, { tol: 1e-10, restart: 30, maxIter: 150, work: this._gmresWork }); }
    this.stats.gmres += lin.iterations;
    return { z: Float64Array.from(lin.x), converged: lin.converged, iterations: lin.iterations };
  }

  /** Move the state along a tangent: bias of contact k by dV (V) and the free unknowns by dV z (Slotboom map). */
  moveAlong(z, k, dV) {
    const b = Float64Array.from(this.bias);
    b[k] += dV;
    this.applyStep(z, dV, this._psiNodes, this._carNodes);
    this.setBias(b);
  }

  // ---- terminal quantities ----

  /** Contact currents (A/m, into the device) and charges (C/m) at the current state (assembles residuals). */
  terminals() {
    this.assemble(false);
    const { dev, F } = this;
    const { Vt, C0, muRef, L0 } = dev.scale;
    const flux = Q_E * muRef * Vt * C0 * 1e6; // A/m per scaled particle-balance unit
    const nC = dev.contactNodes.length;
    const rn = new Float64Array(nC), rp = new Float64Array(nC), qm = new Float64Array(nC);
    dev.contactNodes.forEach((nodes, k) => { for (const i of nodes) { rn[k] += F.n[i]; rp[k] += F.p[i]; qm[k] += F.psi[i]; } });
    // Majority-carrier contact residuals cancel large drift and diffusion terms; with a single contact where a carrier
    // is majority, its residual follows from particle conservation (sum over contacts = total recombination) and the
    // accurate minority residuals of the other contacts.
    // the residual rows summed over all nodes telescope to sum A kappa U (free-node residuals are the Newton residual)
    const derived = { n: null, p: null };
    const rnDirect = Float64Array.from(rn), rpDirect = Float64Array.from(rp);
    for (const c of ['n', 'p']) {
      const maj = dev.contactType.map((t) => t === c);
      if (maj.filter(Boolean).length !== 1 || nC < 2) continue;
      const km = maj.indexOf(true);
      const r = c === 'n' ? rn : rp;
      let freeSum = 0;
      for (let i = 0; i < this.nN; i++) if (this.carFree[i]) freeSum += (c === 'n' ? F.n[i] : F.p[i]);
      let other = 0;
      for (let k = 0; k < nC; k++) if (k !== km) other += r[k];
      const direct = r[km];
      r[km] = this.recombinationTotal() - other;
      // audit D6: the derived current is resolved only when the Newton residual left on the free nodes is small
      const resolved = Math.abs(freeSum) <= CURRENT_RESOLVED_FRACTION * Math.abs(r[km]);
      derived[c] = { contact: km, direct, derived: r[km], freeResidualSum: freeSum, resolved, directVsDerivedRel: r[km] !== 0 ? (direct - r[km]) / Math.abs(r[km]) : null };
    }
    const out = Array.from({ length: nC }, (_, k) => ({ currentAPerM: flux * (rp[k] - rn[k]), electronAPerM: -flux * rn[k], holeAPerM: flux * rp[k], currentDirectAPerM: flux * (rpDirect[k] - rnDirect[k]), metalChargeCPerM: EPS0 * Vt * qm[k] }));
    // free-carrier integrals and space charge (C/m)
    let qs = 0, intN = 0, intP = 0;
    const qSide = new Float64Array(nC);
    const unit = Q_E * C0 * 1e6 * L0 * L0;
    for (let i = 0; i < this.nN; i++) if (dev.isSemi[i]) {
      const A = dev.cvArea[i];
      const free = this.p[i] - this.n[i];
      qs += unit * A * (free + dev.Chat[i]);
      intN += unit * A * this.n[i];
      intP += unit * A * this.p[i];
      for (let k = 0; k < nC; k++) qSide[k] += unit * (dev.sideFixedHat[k][i] + dev.sideWeight[k][i] * A * free);
    }
    // audit D1: terminal charge = the charge that flows through the contact: its metal (Poisson-residual) charge plus
    // the free carriers that enter only through it (electrons for an n-type contact, holes for a p-type contact)
    out.forEach((o, k) => {
      o.depletionChargeCPerM = qSide[k];
      o.carrierChargeCPerM = dev.contactType[k] === 'n' ? -intN : intP;
      o.chargeCPerM = o.metalChargeCPerM + o.carrierChargeCPerM;
    });
    const resolved = ['n', 'p'].every((c) => !derived[c] || derived[c].resolved);
    return { contacts: out, spaceChargeCPerM: qs, electronChargeCPerM: -intN, holeChargeCPerM: intP, majorityDerivation: derived, currentResolved: resolved };
  }

  /** Total scaled recombination sum A kappa U over the semiconductor (particle units of the residual rows). */
  recombinationTotal() {
    const r = this.dev.srh;
    if (!r) return 0;
    const { cvArea, isSemi } = this.dev;
    const { kappa, niHat } = this.dev.scale;
    let s = 0;
    for (let i = 0; i < this.nN; i++) if (isSemi[i]) s += cvArea[i] * kappa * srh(this.n[i], this.p[i], niHat * niHat, r.tauN, r.tauP, r.n1, r.p1)[0];
    return s;
  }
}

/** H = sym(diag(w) * sign * A) on the node pattern: H_ij = 0.5 sign (w_i A_ij + w_j A_ji). */
function symmetrise(pat, A, w, sign, out) {
  for (let i = 0; i < pat.n; i++) for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) {
    const j = pat.colidx[q];
    if (j < i) continue;
    if (j === i) { out[q] = sign * w[i] * A[q]; continue; }
    let qt = pat.rowptr[j];
    { let lo = pat.rowptr[j], hi = pat.rowptr[j + 1] - 1; while (lo <= hi) { const m = (lo + hi) >> 1; const c = pat.colidx[m]; if (c === i) { qt = m; break; } if (c < i) lo = m + 1; else hi = m - 1; } }
    const h = 0.5 * sign * (w[i] * A[q] + w[j] * A[qt]);
    out[q] = h;
    out[qt] = h;
  }
}

function nodesOf(idx, n) {
  const out = new Int32Array(n);
  for (let i = 0; i < idx.length; i++) if (idx[i] >= 0) out[idx[i]] = i;
  return out;
}

const clamp = (x, c) => (x > c ? c : x < -c ? -c : x);
