// Silicon material models for the drift-diffusion stage (DevLog-039). Every coefficient below is copied from the
// reference named next to it (page / equation / table locator); nothing is fitted or defaulted here.
// Units: concentrations cm^-3, mobilities cm^2/(V s), velocities cm/s, fields V/cm, times s, temperature K.
// License: GPL-3.0-or-later.

/** Exact SI 2019 constants (BIPM SI Brochure, 9th ed.: defining constants). */
export const Q_E = 1.602176634e-19; // C
export const K_B = 1.380649e-23; // J/K

/** Thermal voltage kT/q (V). */
export const thermalVoltage = (T) => (K_B * T) / Q_E;

// ---- intrinsic density ----------------------------------------------------------------------------------------

/**
 * Sproul and Green, J. Appl. Phys. 70, 846 (1991), eq. (14), p. 852: n_i = 9.15e19 (T/300)^2 exp(-6880/T) cm^-3,
 * describing their 275-375 K measurements (Table II) to within 0.5 %.
 */
export const SPROUL_GREEN_1991 = Object.freeze({ A: 9.15e19, exponent: 2, Tb: 6880, rangeK: [275, 375], locator: 'Sproul and Green, J. Appl. Phys. 70, 846 (1991), eq. (14), p. 852' });

export function intrinsicDensitySproulGreen(T) {
  const m = SPROUL_GREEN_1991;
  if (!(T >= m.rangeK[0] && T <= m.rangeK[1])) throw new Error(`semiconductor.temperature_k ${T}: Sproul-Green n_i is measured for ${m.rangeK[0]}-${m.rangeK[1]} K only`);
  return m.A * (T / 300) ** m.exponent * Math.exp(-m.Tb / T);
}

// ---- mobility -------------------------------------------------------------------------------------------------

/**
 * Masetti, Severi and Solmi, IEEE Trans. Electron Devices 30, 764 (1983), Table I p. 766 (300 K fits of eq. (1)
 * for electrons in As- or P-doped Si and eq. (4) for holes in B-doped Si). Boron alpha and beta: the scan of
 * Table I is damaged in the middle/last digit; read as 0.719 and 2.00 at 10x zoom (DevLog-039).
 */
export const MASETTI_1983 = Object.freeze({
  arsenic: Object.freeze({ mu0: 52.2, mumax: 1417, mu1: 43.4, Cr: 9.68e16, Cs: 3.43e20, alpha: 0.68, beta: 2.0, pc: 0 }),
  phosphorus: Object.freeze({ mu0: 68.5, mumax: 1414, mu1: 56.1, Cr: 9.2e16, Cs: 3.41e20, alpha: 0.711, beta: 1.98, pc: 0 }),
  boron: Object.freeze({ mu0: 44.9, mumax: 470.5, mu1: 29.0, Cr: 2.23e17, Cs: 6.1e20, alpha: 0.719, beta: 2.0, pc: 9.23e16 }),
  locator: 'Masetti, Severi, Solmi, IEEE TED 30, 764 (1983), eqs. (1) and (4), Table I p. 766',
});

/**
 * Masetti eq. (1) (pc = 0) / eq. (4) (pc > 0) at total impurity density N (cm^-3). N -> 0 gives mumax (eq. (1)) or
 * mumax (eq. (4), exp(-pc/N) -> 0).
 */
export function masettiMobility(p, N) {
  const n = Math.max(N, 1); // N = 0 limit; the terms below are continuous there
  const first = p.pc > 0 ? p.mu0 * Math.exp(-p.pc / n) : p.mu0;
  return first + (p.mumax - p.mu0 * (p.pc > 0 ? 0 : 1)) / (1 + (n / p.Cr) ** p.alpha) - p.mu1 / (1 + (p.Cs / n) ** p.beta);
}

/**
 * Caughey and Thomas, Proc. IEEE 55, 2192 (1967): Table I (doping fit of eq. (1), p. 2192) and Table II (field fit
 * of eq. (2), chord mobility eq. (3), p. 2193).
 */
export const CAUGHEY_THOMAS_1967 = Object.freeze({
  doping: Object.freeze({ holes: Object.freeze({ mumax: 495, mumin: 47.7, alpha: 0.76, Nref: 6.3e16 }), electrons: Object.freeze({ mumax: 1330, mumin: 65, alpha: 0.72, Nref: 8.5e16 }) }),
  field: Object.freeze({ holes: Object.freeze({ vm: 9.5e6, beta: 1 }), electrons: Object.freeze({ vm: 1.1e7, beta: 2 }) }),
  locator: 'Caughey and Thomas, Proc. IEEE 55, 2192 (1967), eq. (1) and Table I p. 2192; eqs. (2), (3) and Table II p. 2193',
});

/** Caughey-Thomas eq. (1): mu = (mumax - mumin) / (1 + (N/Nref)^alpha) + mumin. */
export const caugheyThomasDoping = (p, N) => (p.mumax - p.mumin) / (1 + (Math.max(N, 0) / p.Nref) ** p.alpha) + p.mumin;

/** Caughey-Thomas eq. (3) chord mobility at driving field F (V/cm): mu0 / (1 + (mu0 F / vm)^beta)^(1/beta). */
export function caugheyThomasField(mu0, F, f) {
  const r = (mu0 * Math.abs(F)) / f.vm;
  return f.beta === 1 ? mu0 / (1 + r) : f.beta === 2 ? mu0 / Math.sqrt(1 + r * r) : mu0 / (1 + r ** f.beta) ** (1 / f.beta);
}

/**
 * Low-field mobility pair for one node.
 * @param {{doping:string, donor:string, muN?:number, muP?:number}} m resolved mobility options
 * @param {number} Ntot N_D + N_A (cm^-3)
 */
export function lowFieldMobility(m, Ntot) {
  if (m.doping === 'constant') return [m.muN, m.muP];
  if (m.doping === 'caughey_thomas_1967') return [caugheyThomasDoping(CAUGHEY_THOMAS_1967.doping.electrons, Ntot), caugheyThomasDoping(CAUGHEY_THOMAS_1967.doping.holes, Ntot)];
  return [masettiMobility(MASETTI_1983[m.donor], Ntot), masettiMobility(MASETTI_1983.boron, Ntot)];
}

// ---- recombination --------------------------------------------------------------------------------------------

/**
 * Shockley and Read, Phys. Rev. 87, 835 (1952), eq. (4.4) with (4.5) (p. 837); Hall, Phys. Rev. 87, 387 (1952):
 * U = (n p - ni^2) / (tau_p (n + n1) + tau_n (p + p1)). Returns [U, dU/dn, dU/dp] (same units as n / tau).
 */
export function srh(n, p, ni2, tn, tp, n1, p1) {
  const den = tp * (n + n1) + tn * (p + p1);
  const num = n * p - ni2;
  const U = num / den;
  return [U, (p * den - num * tp) / (den * den), (n * den - num * tn) / (den * den)];
}

// ---- plasma dispersion ----------------------------------------------------------------------------------------

/**
 * Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171 (2011), eqs. (4), (5) p. 1175 and Table 1 p. 1178:
 * delta alpha = a Ne^b + c Nh^d (cm^-1), -delta n = p Ne^q + r Nh^s (N in cm^-3). Rows 1.3 and 1.55 um.
 */
export const NEDELJKOVIC_2011 = Object.freeze({
  // all 27 rows of Table 1 (1.3-14 um), read from the rendered page at 4-5x zoom
  rows: Object.freeze({
    '1.3': Object.freeze({ a: 3.48e-22, b: 1.229, c: 1.02e-19, d: 1.089, p: 2.98e-22, q: 1.016, r: 1.25e-18, s: 0.835 }),
    '1.55': Object.freeze({ a: 8.88e-21, b: 1.167, c: 5.84e-20, d: 1.109, p: 5.40e-22, q: 1.011, r: 1.53e-18, s: 0.838 }),
    '2.0': Object.freeze({ a: 3.22e-20, b: 1.149, c: 6.21e-20, d: 1.119, p: 1.91e-21, q: 0.992, r: 2.28e-18, s: 0.841 }),
    '2.5': Object.freeze({ a: 1.67e-20, b: 1.169, c: 8.08e-20, d: 1.123, p: 5.70e-21, q: 0.976, r: 5.19e-18, s: 0.832 }),
    '3.0': Object.freeze({ a: 6.29e-21, b: 1.193, c: 3.40e-20, d: 1.151, p: 6.57e-21, q: 0.981, r: 3.62e-18, s: 0.849 }),
    '3.5': Object.freeze({ a: 3.10e-21, b: 1.210, c: 6.05e-20, d: 1.145, p: 6.95e-21, q: 0.986, r: 9.28e-18, s: 0.834 }),
    '4.0': Object.freeze({ a: 7.45e-22, b: 1.245, c: 5.43e-20, d: 1.153, p: 7.25e-21, q: 0.991, r: 9.99e-18, s: 0.839 }),
    '4.5': Object.freeze({ a: 2.16e-22, b: 1.277, c: 5.58e-20, d: 1.158, p: 1.19e-20, q: 0.985, r: 1.29e-17, s: 0.838 }),
    '5.0': Object.freeze({ a: 9.28e-23, b: 1.299, c: 6.65e-20, d: 1.160, p: 2.46e-20, q: 0.973, r: 2.03e-17, s: 0.833 }),
    '5.5': Object.freeze({ a: 4.58e-23, b: 1.319, c: 8.53e-20, d: 1.159, p: 3.64e-20, q: 0.968, r: 3.31e-17, s: 0.826 }),
    '6.0': Object.freeze({ a: 3.26e-23, b: 1.330, c: 1.53e-19, d: 1.149, p: 4.96e-20, q: 0.965, r: 6.92e-17, s: 0.812 }),
    '6.5': Object.freeze({ a: 2.70e-23, b: 1.338, c: 1.22e-19, d: 1.158, p: 5.91e-20, q: 0.964, r: 8.23e-17, s: 0.812 }),
    '7.0': Object.freeze({ a: 2.25e-23, b: 1.345, c: 1.29e-19, d: 1.160, p: 5.52e-20, q: 0.969, r: 1.15e-16, s: 0.807 }),
    '7.5': Object.freeze({ a: 1.36e-23, b: 1.359, c: 9.99e-20, d: 1.170, p: 3.19e-20, q: 0.984, r: 4.81e-16, s: 0.776 }),
    '8.0': Object.freeze({ a: 1.85e-23, b: 1.354, c: 1.32e-19, d: 1.167, p: 3.56e-20, q: 0.984, r: 7.44e-16, s: 0.769 }),
    '8.5': Object.freeze({ a: 3.05e-23, b: 1.345, c: 1.57e-18, d: 1.111, p: 8.65e-20, q: 0.966, r: 7.11e-16, s: 0.774 }),
    '9.0': Object.freeze({ a: 4.08e-23, b: 1.340, c: 1.45e-18, d: 1.115, p: 2.09e-19, q: 0.948, r: 5.29e-16, s: 0.783 }),
    '9.5': Object.freeze({ a: 4.14e-23, b: 1.341, c: 1.70e-18, d: 1.115, p: 2.07e-19, q: 0.951, r: 9.72e-16, s: 0.772 }),
    '10.0': Object.freeze({ a: 3.81e-23, b: 1.344, c: 1.25e-18, d: 1.125, p: 3.01e-19, q: 0.944, r: 1.22e-15, s: 0.769 }),
    '10.5': Object.freeze({ a: 4.23e-23, b: 1.344, c: 8.14e-19, d: 1.137, p: 5.07e-19, q: 0.934, r: 1.16e-15, s: 0.772 }),
    '11.0': Object.freeze({ a: 5.81e-23, b: 1.338, c: 1.55e-18, d: 1.124, p: 1.51e-19, q: 0.965, r: 3.16e-15, s: 0.750 }),
    '11.5': Object.freeze({ a: 8.20e-23, b: 1.331, c: 4.81e-18, d: 1.100, p: 2.19e-19, q: 0.958, r: 1.51e-14, s: 0.716 }),
    '12.0': Object.freeze({ a: 1.13e-22, b: 1.325, c: 4.72e-18, d: 1.102, p: 3.04e-19, q: 0.953, r: 2.71e-14, s: 0.704 }),
    '12.5': Object.freeze({ a: 1.22e-22, b: 1.324, c: 2.09e-18, d: 1.124, p: 4.44e-19, q: 0.945, r: 2.65e-14, s: 0.706 }),
    '13.0': Object.freeze({ a: 1.09e-22, b: 1.328, c: 1.16e-18, d: 1.140, p: 6.96e-19, q: 0.936, r: 2.94e-14, s: 0.705 }),
    '13.5': Object.freeze({ a: 1.20e-22, b: 1.327, c: 2.01e-18, d: 1.130, p: 1.05e-18, q: 0.928, r: 6.85e-14, s: 0.686 }),
    '14.0': Object.freeze({ a: 1.62e-22, b: 1.321, c: 7.52e-18, d: 1.101, p: 1.45e-18, q: 0.922, r: 2.60e-13, s: 0.656 }),
  }),
  // Table 1 caption: c and d hold at lambda >= 11 um for dN_h <= 1.2e19; p and q at lambda >= 9 um for dN_e <= 1e19;
  // r and s at lambda >= 8 um for dN_h <= 1.2e19 (fits omit the saturated far-infrared points, p. 1175)
  validity: Object.freeze([
    Object.freeze({ fromUm: 11, coeff: ['c', 'd'], carrier: 'h', maxCm3: 1.2e19 }),
    Object.freeze({ fromUm: 9, coeff: ['p', 'q'], carrier: 'e', maxCm3: 1e19 }),
    Object.freeze({ fromUm: 8, coeff: ['r', 's'], carrier: 'h', maxCm3: 1.2e19 }),
  ]),
  locator: 'Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171 (2011), eqs. (4)-(5) p. 1175, Table 1 p. 1178',
});

/**
 * Soref and Bennett, IEEE JQE 23, 123 (1987) fits (Figs. 10-15; fitted slopes p. 126), closed forms as quoted by
 * Reed, Mashanovich, Gardes, Thomson, Nat. Photon. 4, 518 (2010), p. 519: same functional form as above.
 */
export const SOREF_BENNETT_1987 = Object.freeze({
  rows: Object.freeze({
    '1.3': Object.freeze({ a: 6.0e-18, b: 1, c: 4.0e-18, d: 1, p: 6.2e-22, q: 1, r: 6.0e-18, s: 0.8 }),
    '1.55': Object.freeze({ a: 8.5e-18, b: 1, c: 6.0e-18, d: 1, p: 8.8e-22, q: 1, r: 8.5e-18, s: 0.8 }),
  }),
  locator: 'Soref and Bennett, IEEE JQE 23, 123 (1987), Figs. 10-15; closed forms in Reed et al., Nat. Photon. 4, 518 (2010), p. 519',
});

export const PLASMA_MODELS = Object.freeze({ nedeljkovic_2011: NEDELJKOVIC_2011, soref_bennett_1987: SOREF_BENNETT_1987 });

/**
 * Largest wavelength mismatch (um) accepted when mapping a configured wavelength to a tabulated row (no interpolation
 * between rows: none is given by the sources); the mismatch is reported and labelled.
 */
export const PLASMA_ROW_TOLERANCE_UM = 0.05;

/**
 * Coefficient row of a plasma-dispersion model for a wavelength (um): the tabulated row within
 * PLASMA_ROW_TOLERANCE_UM (1310 nm maps to the 1.3 um row with a label), otherwise an error.
 */
export function plasmaRow(model, lambdaUm) {
  const m = PLASMA_MODELS[model];
  if (!m) throw new Error(`semiconductor.optics.plasma_dispersion: unknown model ${model}`);
  let best = null;
  for (const k of Object.keys(m.rows)) {
    const d = Math.abs(Number(k) - lambdaUm);
    if (d <= PLASMA_ROW_TOLERANCE_UM + 1e-12 && (!best || d < best.d)) best = { key: Number(k), name: k, d };
  }
  if (!best) throw new Error(`semiconductor.optics: ${model} has rows at ${Object.keys(m.rows).join(', ')} um only; wavelength ${lambdaUm} um is not covered`);
  const validity = (m.validity ?? []).filter((v) => best.key >= v.fromUm - 1e-9);
  const coeff = m.rows[best.name];
  const mismatchUm = lambdaUm - best.key;
  // audit R8: nearest row, no interpolation (none given by the source). Estimate of the mismatch effect: relative
  // change of dn and d alpha (at N = P = 1e18 cm^-3) to the neighbouring row on the mismatch side, scaled by
  // |mismatch| / row spacing (linear in wavelength); a stated estimate, not a bound.
  let mismatchEstimate = null;
  if (mismatchUm !== 0) {
    const names = Object.keys(m.rows).sort((a, b) => Number(a) - Number(b));
    const i = names.indexOf(best.name);
    const nb = mismatchUm > 0 ? names[i + 1] : names[i - 1];
    if (nb != null) {
      const [d0, a0] = plasmaDispersion(coeff, 1e18, 1e18), [d1, a1] = plasmaDispersion(m.rows[nb], 1e18, 1e18);
      const f = Math.abs(mismatchUm) / Math.abs(Number(nb) - best.key);
      mismatchEstimate = { neighbourRowUm: Number(nb), densityCm3: 1e18, dnRel: f * Math.abs(d1 / d0 - 1), dalphaRel: f * Math.abs(a1 / a0 - 1), method: 'relative change to the neighbouring row x |mismatch| / row spacing (linear-in-wavelength estimate)' };
    }
  }
  return { model, rowUm: best.key, mismatchUm, coeff, locator: m.locator, validity, mismatchEstimate };
}

/** Material change [delta n, delta alpha (cm^-1)] for free electron / hole densities Ne, Nh (cm^-3, >= 0). */
export function plasmaDispersion(c, Ne, Nh) {
  const e = Math.max(Ne, 0), h = Math.max(Nh, 0);
  const dn = -((e > 0 ? c.p * e ** c.q : 0) + (h > 0 ? c.r * h ** c.s : 0));
  const da = (e > 0 ? c.a * e ** c.b : 0) + (h > 0 ? c.c * h ** c.d : 0);
  return [dn, da];
}
