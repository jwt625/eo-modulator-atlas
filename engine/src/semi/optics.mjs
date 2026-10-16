// Plasma-dispersion coupling of a drift-diffusion state to the vector optical mode (DevLog-039).
// Nodal free-carrier densities -> (delta n, delta alpha) by the configured model (models.mjs) -> complex delta eps,
// linearly interpolated to the 6 quadrature points of every semiconductor optical triangle -> first-order vector
// perturbation (vector-mode.vectorPerturbation) of the lossless reference mode, real and imaginary parts separately.
// License: GPL-3.0-or-later.

import { TriLocator } from '../electrostatics.mjs';
import { VECTOR_KERNELS, vectorPerturbation } from '../vector-mode.mjs';
import { epsOptLab } from '../materials.mjs';
import { plasmaDispersion } from './models.mjs';

const { Q4 } = VECTOR_KERNELS;
export const DB_PER_NEPER_POWER = 10 / Math.LN10; // dB per unit of power attenuation exponent (10 log10 e)

/**
 * Locate every quadrature point of the semiconductor optical triangles on the device mesh (once per mesh pair).
 * @param {any} dev buildDevice()
 * @param {any} solved optical-stage solveOptical() result (vector)
 * @param {string} materialName semiconductor material
 */
export function prepareOpticalCoupling(dev, solved, materialName) {
  if (solved.kind !== 'vector') throw new Error('semiconductor optics needs the vector optical solver (optics.solver: vector)');
  const model = solved.model;
  const om = model.mesh;
  const nq = Q4.length;
  const regionSemi = model.regions.map((r) => r.material === materialName);
  const loc = new TriLocator(dev.mesh, dev.geo);
  const nodes = new Int32Array(3 * nq * om.nTris).fill(-1);
  const bary = new Float64Array(3 * nq * om.nTris);
  let nPoints = 0;
  const m = model.mats[materialName];
  const eps = epsOptLab(m, solved.res.lambdaUm, model.lambda0Um);
  if (!eps || Math.abs(eps[0] - eps[4]) > 1e-12 * eps[0] || Math.abs(eps[0] - eps[8]) > 1e-12 * eps[0]) throw new Error(`semiconductor optics: material ${materialName} needs an isotropic optical index`);
  const nSi = Math.sqrt(eps[0]);
  for (let t = 0; t < om.nTris; t++) {
    if (!regionSemi[om.triRegion[t]] || model.dead[t]) continue;
    const a = om.tri[3 * t], b = om.tri[3 * t + 1], c = om.tri[3 * t + 2];
    for (let k = 0; k < nq; k++) {
      const L = Q4[k];
      const x = L[0] * om.x[a] + L[1] * om.x[b] + L[2] * om.x[c], y = L[0] * om.y[a] + L[1] * om.y[b] + L[2] * om.y[c];
      const e = loc.find(x, y);
      if (e < 0 || !dev.triSemi[e]) throw new Error(`semiconductor optics: quadrature point (${x.toFixed(4)}, ${y.toFixed(4)}) um of a silicon optical triangle is not in a semiconductor device triangle`);
      const i0 = dev.mesh.tri[3 * e], i1 = dev.mesh.tri[3 * e + 1], i2 = dev.mesh.tri[3 * e + 2];
      const X = dev.mesh.x, Y = dev.mesh.y;
      const det = (Y[i1] - Y[i2]) * (X[i0] - X[i2]) + (X[i2] - X[i1]) * (Y[i0] - Y[i2]);
      const l0 = ((Y[i1] - Y[i2]) * (x - X[i2]) + (X[i2] - X[i1]) * (y - Y[i2])) / det;
      const l1 = ((Y[i2] - Y[i0]) * (x - X[i2]) + (X[i0] - X[i2]) * (y - Y[i2])) / det;
      const o = 3 * (nq * t + k);
      nodes[o] = i0; nodes[o + 1] = i1; nodes[o + 2] = i2;
      bary[o] = l0; bary[o + 1] = l1; bary[o + 2] = 1 - l0 - l1;
      nPoints++;
    }
  }
  return { model, mode: solved.mode, lambdaUm: solved.res.lambdaUm, nSi, nodes, bary, nTris: om.nTris, nPoints, neff: solved.neff };
}

/**
 * Nodal material change of the current state: delta n (1) and delta alpha (1/m) relative to undoped silicon
 * (absolute basis), or, with `reference` densities, the fit applied to the density change (change basis).
 * @param {any} dd DriftDiffusion
 * @param {{coeff:any}} row plasmaRow()
 */
export function nodalPlasma(dd, row, reference = null) {
  const { dev } = dd;
  const C0 = dev.scale.C0;
  const dn = new Float64Array(dd.nN), da = new Float64Array(dd.nN);
  for (let i = 0; i < dd.nN; i++) {
    if (!dev.isSemi[i]) continue;
    if (reference) {
      // density-change basis: the fit applied to |N(V) - N(V0)| with the sign of the change
      const dN = (dd.n[i] - reference.n[i]) * C0, dP = (dd.p[i] - reference.p[i]) * C0;
      const [an, bn] = plasmaDispersion(row.coeff, Math.abs(dN), 0), [ap, bp] = plasmaDispersion(row.coeff, 0, Math.abs(dP));
      dn[i] = Math.sign(dN) * an + Math.sign(dP) * ap;
      da[i] = (Math.sign(dN) * bn + Math.sign(dP) * bp) * 100;
      continue;
    }
    const [a, b] = plasmaDispersion(row.coeff, dd.n[i] * C0, dd.p[i] * C0);
    dn[i] = a;
    da[i] = b * 100; // cm^-1 -> m^-1
  }
  return { dn, da };
}

/**
 * First-order modal response of nodal (dn, da): {dneff, dkappaEff, alphaPerM, lossDbPerCm}. delta eps first order
 * 2 n (dn + i dk) by default (linear in the nodal fields), or exact (n + dn + i dk)^2 - n^2.
 */
export function modalResponse(coupling, dn, da, deltaEps = 'first_order') {
  const exact = deltaEps === 'exact';
  const { model, mode, lambdaUm, nSi, nodes, bary, nTris } = coupling;
  const nq = Q4.length;
  const lambdaM = lambdaUm * 1e-6;
  const er = new Float64Array(4 * nq * nTris), ei = new Float64Array(4 * nq * nTris);
  for (let q = 0; q < nq * nTris; q++) {
    const o = 3 * q;
    if (nodes[o] < 0) continue;
    const d = bary[o] * dn[nodes[o]] + bary[o + 1] * dn[nodes[o + 1]] + bary[o + 2] * dn[nodes[o + 2]];
    const a = bary[o] * da[nodes[o]] + bary[o + 1] * da[nodes[o + 1]] + bary[o + 2] * da[nodes[o + 2]];
    const k = (a * lambdaM) / (4 * Math.PI);
    // first order (default, audit D7): 2 n (dn + i dk), consistent with the first-order mode perturbation
    const re = exact ? 2 * nSi * d + d * d - k * k : 2 * nSi * d, im = exact ? 2 * (nSi + d) * k : 2 * nSi * k;
    er[4 * q] = re; er[4 * q + 2] = re; er[4 * q + 3] = re;
    ei[4 * q] = im; ei[4 * q + 2] = im; ei[4 * q + 3] = im;
  }
  const dneff = vectorPerturbation(model, mode, er, lambdaUm);
  const dkappaEff = vectorPerturbation(model, mode, ei, lambdaUm);
  const alphaPerM = (4 * Math.PI * dkappaEff) / lambdaM;
  return { dneff, dkappaEff, alphaPerM, lossDbPerCm: (DB_PER_NEPER_POWER * alphaPerM) / 100 };
}
