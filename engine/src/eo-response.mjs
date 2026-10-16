// Small-signal traveling-wave EO response of a terminated RF line (DevLog-036). License: GPL-3.0-or-later.
//
// Conventions
//   - Phasors exp(+j omega t), RF wave exp(-gamma z), Re gamma >= 0 (rf-line.mjs). Frequencies in Hz unless named *Ghz.
//   - Thevenin source EMF V_s with impedance Z_s at z = 0, load Z_L at z = L (L = electrode length per arm).
//     V(z) = V+ [exp(-gamma z) + Gamma_L exp(-2 gamma L) exp(gamma z)],
//     V+ = V_s Z0 / (Z0 + Z_s) / (1 - Gamma_s Gamma_L exp(-2 gamma L)).
//   - Optical phase per volt is proportional to Phi = int_0^L V(z) exp(+j beta_o z) dz, beta_o = omega n_g / c (the
//     modulation sidebands walk off with the optical group velocity). Alferness, IEEE TMTT 30, 1121 (1982), Sec. VI.B,
//     eqs. (18)-(22), p. 1127: sinc form for pure velocity mismatch, (1 - e^-aL)/a for pure loss.
//   - H(f) = Phi(f) / Phi_DC with Phi_DC = L V_s Z_L / (Z_s + Z_L) (f -> 0 limit: uniform voltage across the load).
//   - S21_EO [dB] = 20 log10 |H(f) / H(f_ref)|; 3 dB / 6 dB bandwidths are the first crossings of -3 / -6 dB.
//   - RF Vpi(f) = Vpi_DC / |H(f)|, in amplitude of V_ref = V_s Z_L / (Z_s + Z_L) (= V_s / 2 for Z_L = Z_s).

import { cx, cadd, csub, cmul, cdiv, cexp, cabs, cscale } from './complex.mjs';
import { C_LIGHT } from './rf-line.mjs';

/** Thresholds (20 log10 |H|, dB) of the bandwidth metrics. */
export const BANDWIDTH_THRESHOLDS_DB = Object.freeze({ bw3db_ghz: -3, bw6db_ghz: -6 });

export const EO_RESPONSE_CONVENTIONS = Object.freeze({
  id: 'eo-atlas.eo-response/v1',
  phasor: 'exp(+j omega t); RF wave exp(-gamma z), Re gamma >= 0',
  integral: 'Phi = int_0^L V(z) exp(+j beta_o z) dz, beta_o = 2 pi f n_g / c (optical group index)',
  normalization: 'H = Phi / Phi_0 with Phi_0 the f -> 0 limit of the model: Phi_DC = L V_s Z_L / (Z_s + Z_L) when R\'(0) = 0 and no shunt conductance (result.response.normalization lossless_dc); with R\'(0) > 0 (slab conductor models) or a junction conductance the DC circuit of the line (model_dc_with_series_resistance / model_dc_with_junction_conductance)',
  db: 'S21_EO = 20 log10 |H(f) / H(f_ref)| (electrical dB; reference: DC limit of the model unless reference_ghz)',
  bandwidth: 'bw3db: first frequency with S21_EO <= -3 dB; bw6db: <= -6 dB (search on the sweep grid, bisection inside the bracketing interval)',
  vpiRf: 'Vpi_RF(f) = Vpi_DC / |H(f)|, in amplitude of V_ref = V_s Phi_0 / L, the mean DC line (junction) voltage of the model; = V_s Z_L / (Z_s + Z_L) in the lossless_dc mode (incident voltage V_s / 2 for Z_L = Z_s); result.response.vRefDefinition',
  rolloffSign: 'eo_rolloff_db is the signed S21_EO (negative = drop), the sim-target sign of sims/SPEC.md',
  references: [
    'Alferness, IEEE Trans. Microw. Theory Tech. 30, 1121 (1982), Sec. VI.B, eqs. (18)-(22), p. 1127 (corrections: ibid. 31, 315 (1983) do not change (18)-(22))',
  ],
});

const fail = (m) => { throw new Error(`eo-response: ${m}`); };
const finitePositive = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || !(v > 0)) fail(`${name} must be a finite positive number (got ${v})`);
  return v;
};

/** (1 - exp(-u)) / u, series below |u| = 1e-6. */
export function forwardKernel(u) {
  if (cabs(u) < 1e-6) {
    const u2 = cmul(u, u);
    return cadd(csub(cx(1), cscale(u, 0.5)), cscale(u2, 1 / 6));
  }
  return cdiv(csub(cx(1), cexp(cscale(u, -1))), u);
}

/** (exp(w) - 1) / w, series below |w| = 1e-6. */
export function backwardKernel(w) {
  if (cabs(w) < 1e-6) {
    const w2 = cmul(w, w);
    return cadd(cadd(cx(1), cscale(w, 0.5)), cscale(w2, 1 / 6));
  }
  return cdiv(csub(cexp(w), cx(1)), w);
}

/** Reflection coefficient (Z - Z0)/(Z + Z0); Z = Infinity is an open (1). */
export function reflection(z, z0) {
  if (z === Infinity) return cx(1);
  const zz = cx(z);
  return cdiv(csub(zz, z0), cadd(zz, z0));
}

/**
 * Optical phase integral per volt of source EMF (V_s = 1), in metres: Phi = int_0^L V(z) exp(+j beta_o z) dz.
 * @param {{gamma:{re:number,im:number}, z0:{re:number,im:number}, zs:number, zl:number, betaO:number, lengthM:number}} p
 *   zs: source impedance (ohm, >= 0 real); zl: load impedance (ohm, >= 0 real, Infinity = open).
 * @returns {{phi:{re:number,im:number}, vPlus:{re:number,im:number}, gammaL:{re:number,im:number}, gammaS:{re:number,im:number}}}
 */
export function phaseIntegral({ gamma, z0, zs, zl, betaO, lengthM }) {
  const L = finitePositive(lengthM, 'lengthM');
  if (!(zs >= 0) || !Number.isFinite(zs)) fail(`source impedance must be finite and >= 0 (got ${zs})`);
  if (!(zl >= 0)) fail(`load impedance must be >= 0 or Infinity (got ${zl})`);
  if (gamma.re < 0) fail('gamma must have Re >= 0');
  const gS = reflection(zs, z0);
  const gL = reflection(zl, z0);
  const e2 = cexp(cscale(gamma, -2 * L));
  const vPlus = cdiv(cdiv(z0, cadd(z0, cx(zs))), csub(cx(1), cmul(cmul(gS, gL), e2)));
  const jb = cx(0, betaO);
  const u = cscale(csub(gamma, jb), L);
  const w = cscale(cadd(gamma, jb), L);
  const fwd = cscale(forwardKernel(u), L);
  const bwd = cmul(cmul(gL, e2), cscale(backwardKernel(w), L));
  return { phi: cmul(vPlus, cadd(fwd, bwd)), vPlus, gammaL: gL, gammaS: gS };
}

/**
 * Exact phase integral per volt of source EMF (m) over a cascade of uniform sections (periodic loaded line, DevLog-036
 * round 2, S5). sections: [{gamma, z0, l}] in order from the source (z = 0) to the load. Per section
 * V(s) = a exp(-gamma s) + b exp(+gamma s), a = (V_k + Z_k I_k)/2, b = (V_k - Z_k I_k)/2, so
 * int_0^l V(s) exp(j beta_o (z_k + s)) ds = exp(j beta_o z_k) l [a F((gamma - j beta_o) l) + b B((gamma + j beta_o) l)]
 * with F(u) = (1 - e^-u)/u, B(w) = (e^w - 1)/w. Node input impedances by backward recursion from Z_L
 * (Z_in = (A Z_next + B)/(C Z_next + D)); V_0 = V_s Z_in,0 / (Z_s + Z_in,0); forward node voltage
 * V_next = a e^{-gamma l} + b e^{gamma l}, I_next = V_next / Z_in,next (exact for the terminated cascade).
 * Equivalent derivation: DevLog-037 S7.14 (independent reference; its code is not used here).
 * @returns {{re:number, im:number}}
 */
export function cascadePhaseIntegral({ sections, zs, zl, betaO }) {
  if (!Array.isArray(sections) || !sections.length) fail('cascade needs at least one section');
  if (!(zs >= 0) || !Number.isFinite(zs)) fail(`source impedance must be finite and >= 0 (got ${zs})`);
  if (!(zl >= 0)) fail(`load impedance must be >= 0 or Infinity (got ${zl})`);
  const n = sections.length;
  const ch = new Array(n), sh = new Array(n);
  for (let k = 0; k < n; k++) {
    const gl = cscale(sections[k].gamma, sections[k].l);
    const ep = cexp(gl), em = cexp(cscale(gl, -1));
    ch[k] = cscale(cadd(ep, em), 0.5);
    sh[k] = cscale(csub(ep, em), 0.5);
  }
  // backward input impedances; zin[n] = load (Infinity = open)
  const zin = new Array(n + 1);
  zin[n] = zl === Infinity ? null : cx(zl);
  for (let k = n - 1; k >= 0; k--) {
    const z0 = sections[k].z0;
    const B = cmul(z0, sh[k]);
    const C = cdiv(sh[k], z0);
    const zn = zin[k + 1];
    zin[k] = zn == null ? cdiv(ch[k], C) : cdiv(cadd(cmul(ch[k], zn), B), cadd(cmul(C, zn), ch[k]));
  }
  let V = cdiv(zin[0], cadd(cx(zs), zin[0]));
  let I = cdiv(cx(1), cadd(cx(zs), zin[0]));
  let z = 0;
  let acc = cx(0);
  const jb = cx(0, betaO);
  for (let k = 0; k < n; k++) {
    const { gamma, z0, l } = sections[k];
    const zi = cmul(z0, I);
    const a = cscale(cadd(V, zi), 0.5);
    const b = cscale(csub(V, zi), 0.5);
    const term = cadd(cmul(a, forwardKernel(cscale(csub(gamma, jb), l))), cmul(b, backwardKernel(cscale(cadd(gamma, jb), l))));
    acc = cadd(acc, cmul(cexp(cx(0, betaO * z)), cscale(term, l)));
    const gl = cscale(gamma, l);
    const ea = cmul(a, cexp(cscale(gl, -1)));
    const eb = cmul(b, cexp(gl));
    V = cadd(ea, eb);
    const zn = zin[k + 1];
    I = zn == null ? cx(0) : cabs(zn) > 0 ? cdiv(V, zn) : cdiv(csub(ea, eb), z0);
    z += l;
  }
  return acc;
}

/** DC phase integral per volt of source EMF (m): L Z_L / (Z_s + Z_L); open load: L. */
export function dcPhaseIntegral({ zs, zl, lengthM }) {
  finitePositive(lengthM, 'lengthM');
  if (zl === Infinity) return lengthM;
  if (!(zl > 0)) fail('the DC normalization needs a load impedance > 0 (a short has no DC phase)');
  return (lengthM * zl) / (zs + zl);
}

/**
 * Normalized complex response H(f) = Phi(f) / Phi_DC at one frequency.
 * @param {{fHz:number, gamma:any, z0:any, zs:number, zl:number, ngOpt:number, lengthM:number}} p
 */
export function responseAt({ fHz, gamma, z0, zs, zl, ngOpt, lengthM }) {
  finitePositive(fHz, 'fHz');
  finitePositive(ngOpt, 'optical group index');
  const betaO = (2 * Math.PI * fHz * ngOpt) / C_LIGHT;
  const { phi } = phaseIntegral({ gamma, z0, zs, zl, betaO, lengthM });
  const d = dcPhaseIntegral({ zs, zl, lengthM });
  return { re: phi.re / d, im: phi.im / d };
}

export const toDb = (h) => 20 * Math.log10(cabs(h));

/**
 * First frequency (Hz) at which g(f) [dB] falls to thresholdDb, searching the ascending grid fHz[] from index `start`;
 * bisection on the bracketing interval. Returns {fHz} | {below: true} (already at or below at the first point) |
 * {above: true} (no crossing up to the last point).
 * @param {(fHz:number)=>number} g response in dB
 * @param {number[]} grid ascending frequencies (Hz)
 * @param {number} thresholdDb
 * @param {number[]} [values] g evaluated on the grid (optional, same length)
 */
export function firstCrossing(g, grid, thresholdDb, values = null, start = null) {
  if (!grid.length) fail('empty frequency grid');
  let v = values ?? grid.map(g);
  // DevLog-036 round 2 (S7): the search starts at the reference (f_ref, or DC with 0 dB by the normalization), so the
  // interval [f_ref, first grid point] is bracketed too. g is only called at f > start.fHz.
  if (start) {
    if (!(start.valueDb > thresholdDb)) fail('the search start must lie above the threshold');
    grid = [start.fHz, ...grid];
    v = [start.valueDb, ...v];
  }
  if (!(v[0] > thresholdDb)) return { below: true, fHz: grid[0] };
  for (let i = 1; i < grid.length; i++) {
    if (!Number.isFinite(v[i])) return { above: true, invalidFromHz: grid[i], lastHz: grid[i - 1] };
    if (v[i] <= thresholdDb) {
      let a = grid[i - 1], b = grid[i];
      for (let k = 0; k < 80 && b - a > 1e-9 * b; k++) {
        const m = 0.5 * (a + b);
        if (g(m) > thresholdDb) a = m; else b = m;
      }
      return { fHz: 0.5 * (a + b) };
    }
  }
  return { above: true, lastHz: grid[grid.length - 1] };
}
