// Small-signal quantities of a solved drift-diffusion state (DevLog-039): junction capacitance by central difference of
// the contact charge, series (access) resistance from a quasi-neutral conduction solve, RC bandwidth.
// License: GPL-3.0-or-later.

import { Q_E } from './models.mjs';
import { ScaledSpdBlock } from './linear.mjs';

/** Depleted node: space charge above half of the local net doping (includes the metallurgical junction). */
export function depletedNodes(dd) {
  const { dev } = dd;
  const out = new Uint8Array(dd.nN);
  for (let i = 0; i < dd.nN; i++) {
    if (!dev.isSemi[i]) continue;
    const C = dev.Chat[i];
    out[i] = Math.abs(dd.p[i] - dd.n[i] + C) > 0.5 * Math.abs(C) ? 1 : 0;
  }
  return out;
}

/** Factor by which depleted (shorted) edges exceed the largest quasi-neutral edge conductance. */
export const SHORT_FACTOR = 1e6;

/**
 * Series resistance per unit length between contact `kA` (1 V) and every other contact (0 V), through the
 * semiconductor with conductivity q (mu_n n + mu_p p) of the current state and the depleted region shorted.
 * Returns {rOhmM, gSPerM, method, nDepleted}.
 */
export function seriesResistance(dd, kA) {
  const { dev } = dd;
  const E = dev.edges;
  const C0m = dev.scale.C0 * 1e6; // m^-3
  const dep = depletedNodes(dd);
  const sig = new Float64Array(E.n);
  let sMax = 0;
  for (let e = 0; e < E.n; e++) {
    const i = E.i[e], j = E.j[e];
    if (dep[i] && dep[j]) { sig[e] = -1; continue; }
    const mn = (0.5 * (dev.muN0[i] + dev.muN0[j]) * dd.fieldFactorN[e]) * 1e-4, mp = (0.5 * (dev.muP0[i] + dev.muP0[j]) * dd.fieldFactorP[e]) * 1e-4;
    const n = dep[i] ? dd.n[j] : dep[j] ? dd.n[i] : 0.5 * (dd.n[i] + dd.n[j]);
    const p = dep[i] ? dd.p[j] : dep[j] ? dd.p[i] : 0.5 * (dd.p[i] + dd.p[j]);
    sig[e] = Q_E * C0m * (mn * n + mp * p);
    sMax = Math.max(sMax, sig[e]);
  }
  for (let e = 0; e < E.n; e++) if (sig[e] < 0) sig[e] = SHORT_FACTOR * sMax;
  const { pat } = dev;
  const vals = new Float64Array(pat.nnz);
  for (let e = 0; e < E.n; e++) {
    const c = sig[e] * E.w[e];
    vals[dev.diagSlot[E.i[e]]] += c; vals[dev.diagSlot[E.j[e]]] += c;
    vals[E.sij[e]] -= c; vals[E.sji[e]] -= c;
  }
  const blk = dd._condBlock ??= new ScaledSpdBlock(pat, dd.carFree, { sym: dd.Hn.chol.sym });
  blk.factor(vals);
  const phi = new Float64Array(dd.nN);
  for (const i of dev.contactNodes[kA]) phi[i] = 1;
  const nodes = dd._carNodes;
  const b = new Float64Array(dd.nCar), x = new Float64Array(dd.nCar);
  for (let k = 0; k < dd.nCar; k++) {
    const i = nodes[k];
    let s = 0;
    for (let q = pat.rowptr[i]; q < pat.rowptr[i + 1]; q++) { const j = pat.colidx[q]; if (!dd.carFree[j]) s += vals[q] * phi[j]; }
    b[k] = -s;
  }
  blk.solve(b, x);
  for (let k = 0; k < dd.nCar; k++) phi[nodes[k]] = x[k];
  let G = 0;
  for (let e = 0; e < E.n; e++) { const d = phi[E.i[e]] - phi[E.j[e]]; G += sig[e] * E.w[e] * d * d; }
  return { rOhmM: 1 / G, gSPerM: G, method: 'quasi_neutral_conduction_depletion_shorted', nDepleted: dep.reduce((a, v) => a + v, 0) };
}

/** RC corner frequency 1 / (2 pi R' C') (Hz) of per-length R' (ohm m) and C' (F/m). */
export const rcCornerHz = (rOhmM, cFPerM) => 1 / (2 * Math.PI * rOhmM * cFPerM);
