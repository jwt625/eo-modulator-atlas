// Uniform RF transmission line: RLGC per unit length, complex propagation constant, characteristic
// impedance, microwave index, conductor and dielectric loss.  License: GPL-3.0-or-later.
//
// Conventions (all functions in this file)
//   - SI base units internally: F/m, H/m, Ohm/m, S/m, Np/m, rad/m, Hz.  Frequencies passed to
//     propagationAt/rlgcAt are in Hz; sweepGhz and every `*Ghz` name are in GHz.  omega = 2 pi f (rad/s).
//   - Phasor time dependence exp(+j omega t), wave exp(-gamma z), gamma = alpha + j beta, alpha >= 0.
//     Series impedance Z' = R' + j omega L', shunt admittance Y' = G' + j omega C',
//     gamma = sqrt(Z' Y'), Z0 = sqrt(Z' / Y') (principal roots, Re >= 0).
//   - Attenuation is reported as a POSITIVE loss: alpha in Np/m (field amplitude), alphaDbPerCm = alpha *
//     (20 / ln 10) / 100.  A signed matched-line S21 (negative dB) is matchedS21Db().
//   - Voltage/current normalisation follows the E1 section result: V = full terminal voltage difference
//     (signal minus return), C' = 2 W' / V^2 of the full structure, Z0 = V / I for the total signal
//     current I.  R' is the series loop resistance in the same normalisation (signal + return path).
//   - Frequency independent C' and L' (quasi-TEM limit, L' = 1 / (c^2 C0')): no dispersion, no radiation,
//     no surface roughness.  Missing loss inputs are errors, never material defaults.

import { cx, cmul, cdiv, csqrt } from './complex.mjs';

// Same values as electrostatics.mjs (tests assert equality); duplicated so this module has no solver import.
export const C_LIGHT = 299792458;
export const MU0 = 1.25663706212e-6;
export const EPS0 = 8.8541878128e-12;

/** Np -> dB for a field (amplitude) quantity: 20 log10(e). */
export const NEPER_TO_DB = 20 / Math.LN10;

export const ghzToHz = (fGhz) => fGhz * 1e9;
export const hzToGhz = (fHz) => fHz / 1e9;
/** alpha [Np/m] -> dB/cm. */
export const npPerMToDbPerCm = (a) => (a * NEPER_TO_DB) / 100;
/** dB/cm -> alpha [Np/m]. */
export const dbPerCmToNpPerM = (a) => (a * 100) / NEPER_TO_DB;

const fail = (m) => {
  throw new Error(`rf-line: ${m}`);
};
const positive = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || !(v > 0)) fail(`${name} must be a finite positive number (got ${v})`);
  return v;
};
const nonNegative = (v, name) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) fail(`${name} must be a finite number >= 0 (got ${v})`);
  return v;
};
const required = (obj, key, where) => {
  if (obj == null || obj[key] === undefined || obj[key] === null) fail(`${where}.${key} is required (no default is supplied)`);
  return obj[key];
};

// ---- elementary skin-effect relations ------------------------------------------------------

/** Skin depth delta = 1 / sqrt(pi f mu0 sigma) [m]. */
export function skinDepthM(fHz, sigmaSm) {
  positive(fHz, 'frequency (Hz)');
  positive(sigmaSm, 'conductivity sigma (S/m)');
  return 1 / Math.sqrt(Math.PI * fHz * MU0 * sigmaSm);
}

/** Surface resistance R_s = sqrt(pi f mu0 / sigma) [Ohm/square]; valid for thickness >> skin depth. */
export function surfaceResistanceOhm(fHz, sigmaSm) {
  positive(fHz, 'frequency (Hz)');
  positive(sigmaSm, 'conductivity sigma (S/m)');
  return Math.sqrt((Math.PI * fHz * MU0) / sigmaSm);
}

/** Lossless TEM inductance L' = 1 / (c^2 C0') [H/m] from the air-filled (all eps_r = 1) capacitance. */
export function lPulFromC0(c0Pul) {
  positive(c0Pul, 'C0 per unit length (F/m)');
  return 1 / (C_LIGHT * C_LIGHT * c0Pul);
}

/**
 * Wheeler incremental-inductance rule: R' = omega (L'_recessed - L'_nominal) where every current-carrying
 * conductor surface is recessed by delta/2 (delta = skin depth at fHz) when computing L'_recessed.  Both
 * inductances are external (air-filled) values, e.g. 1 / (c^2 C0') from two section solves.  The caller
 * is responsible for building the recessed geometry; this function only applies the rule.
 * For parallel plates this reproduces R' = 2 R_s / w exactly.
 */
export function wheelerRPrime(fHz, lPulNominal, lPulRecessed) {
  positive(fHz, 'frequency (Hz)');
  positive(lPulNominal, 'nominal L\' (H/m)');
  positive(lPulRecessed, 'recessed L\' (H/m)');
  if (!(lPulRecessed > lPulNominal)) fail('recessed inductance must exceed the nominal inductance');
  return 2 * Math.PI * fHz * (lPulRecessed - lPulNominal);
}

/**
 * Step-size/perturbation check for the Wheeler two-solve rule.  Pass L' from several recessed solves with recess
 * = scale * delta/2 (scale > 0, same mesh hints and topology as the nominal solve).  In the linear regime
 * R'_s = omega (L'_s - L'_nominal) / scale is independent of scale; the relative spread of R'_s over the scales
 * measures the perturbation error (recess too large) plus the mesh noise of a small difference of large numbers
 * (recess too small).  Returns {rPrimeOhmPerM: [...], maxRelativeSpread}; the scale = 1 entry is the Wheeler value.
 */
export function wheelerStepCheck(fHz, lPulNominal, solves) {
  positive(fHz, 'frequency (Hz)');
  positive(lPulNominal, 'nominal L\' (H/m)');
  if (!Array.isArray(solves) || solves.length < 2) fail('wheelerStepCheck needs at least two recessed solves [{scale, lPul}]');
  const r = solves.map((s, i) => {
    positive(s?.scale, `solves[${i}].scale`);
    positive(s?.lPul, `solves[${i}].lPul`);
    if (!(s.lPul > lPulNominal)) fail(`solves[${i}]: recessed inductance must exceed the nominal inductance`);
    return (2 * Math.PI * fHz * (s.lPul - lPulNominal)) / s.scale;
  });
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  return { rPrimeOhmPerM: r, maxRelativeSpread: (Math.max(...r) - Math.min(...r)) / mean };
}

/** Low-loss attenuation alpha ~ R'/(2 Z0) + G' Z0 / 2 [Np/m] with Z0 = sqrt(L'/C') real. */
export function lowLossAlpha({ R, G, L, C }) {
  const z0 = Math.sqrt(L / C);
  return { conductor: R / (2 * z0), dielectric: (G * z0) / 2, total: R / (2 * z0) + (G * z0) / 2 };
}

/** Signed S21 (dB, negative) of a line of length lengthM matched to its own Z0: -alpha * L * 20 log10(e). */
export function matchedS21Db(alphaNpPerM, lengthM) {
  nonNegative(alphaNpPerM, 'alpha (Np/m)');
  nonNegative(lengthM, 'length (m)');
  return -alphaNpPerM * lengthM * NEPER_TO_DB;
}

// ---- adapters from the E1 section results ---------------------------------------------------

/**
 * Line parameters from the full E1 electrostatics result (solveElectrostatics(...)) and its CrossSection.
 * Uses es.cPul, es.c0Pul [F/m], es.lPul [H/m] and es.regionEnergyFraction (energy participation per
 * section.regions entry).  The E1 result does NOT carry loss data; pass it to createRfLine explicitly.
 */
export function lineParamsFromElectrostatics(es, section) {
  if (!es || !section?.regions) fail('lineParamsFromElectrostatics needs the solveElectrostatics result and its CrossSection');
  const frac = es.regionEnergyFraction;
  if (!frac || frac.length !== section.regions.length) fail('electrostatics result has no per-region energy fractions matching the section');
  return {
    cPul: positive(es.cPul, 'es.cPul'),
    c0Pul: positive(es.c0Pul, 'es.c0Pul'),
    lPul: positive(es.lPul, 'es.lPul'),
    regions: section.regions.map((r, i) => ({ name: r.name, material: r.material, energyFraction: frac[i] })),
  };
}

/**
 * Line parameters from runCrossSection(...).metrics (pF/m, nH/m).  The runner does not expose region
 * energy fractions, so only uniform dielectric models (or none) are possible from this adapter.
 */
export function lineParamsFromMetrics(metrics) {
  return {
    cPul: positive(metrics?.c_pul_pf_per_m, 'metrics.c_pul_pf_per_m') * 1e-12,
    c0Pul: positive(metrics?.c0_pul_pf_per_m, 'metrics.c0_pul_pf_per_m') * 1e-12,
    lPul: positive(metrics?.l_pul_nh_per_m, 'metrics.l_pul_nh_per_m') * 1e-9,
    regions: null,
  };
}

/**
 * Dielectric model spec from region energy fractions and an explicit per-material loss table.
 * tanDeltaByMaterial[name] is either a number (tan delta) or {sigmaSm, epsR} (conduction loss,
 * tan delta(f) = sigma / (omega eps0 epsR)).  A participating region whose material is absent from the
 * table throws: an unknown loss tangent is not zero.  Declare lossless media explicitly (e.g. air: 0).
 */
export function dielectricFromRegions(params, tanDeltaByMaterial) {
  if (!params.regions) fail('region energy fractions are not available (use lineParamsFromElectrostatics)');
  if (!tanDeltaByMaterial || typeof tanDeltaByMaterial !== 'object') fail('tanDeltaByMaterial table is required');
  const regions = params.regions.map((r) => {
    if (!Object.hasOwn(tanDeltaByMaterial, r.material)) fail(`no loss tangent supplied for material "${r.material}" (region "${r.name}", energy fraction ${r.energyFraction}); unknown is not zero`);
    const t = tanDeltaByMaterial[r.material];
    if (typeof t !== 'number' && (t == null || typeof t !== 'object' || Array.isArray(t))) fail(`loss entry for material "${r.material}" must be a number (tan delta) or {sigmaSm, epsR}`);
    return typeof t === 'number' ? { name: r.name, energyFraction: r.energyFraction, tanDelta: t } : { name: r.name, energyFraction: r.energyFraction, ...t };
  });
  return { model: 'regions', regions };
}

/** Perimeter [m] of each electrode polygon (config frame, micrometer vertices) of a CrossSection. */
export function electrodePerimetersM(section) {
  return section.electrodes.map((e) => {
    let p = 0;
    for (let i = 0; i < e.poly.length; i++) {
      const a = e.poly[i];
      const b = e.poly[(i + 1) % e.poly.length];
      p += Math.hypot(b[0] - a[0], b[1] - a[1]);
    }
    return { name: e.name, role: e.role, perimeterM: p * 1e-6 };
  });
}

// ---- model construction ---------------------------------------------------------------------

function buildConductor(c) {
  if (c == null) fail('conductor model is required: {model:"none"} to declare lossless conductors explicitly');
  const model = required(c, 'model', 'conductor');
  if (model === 'none') return { model, label: 'lossless_by_declaration', labels: ['lossless_by_declaration'], rAt: () => 0, internal: false };
  if (!['rprime_reference', 'surface_resistance_geometry_factor', 'surface_resistance_perimeter'].includes(model)) fail(`unknown conductor.model "${model}"`);
  const internal = c.includeInternalInductance;
  if (typeof internal !== 'boolean') fail('conductor.includeInternalInductance must be an explicit boolean (surface reactance X_s = R_s, so L_int = R\'/omega)');
  if (model === 'rprime_reference') {
    const r0 = nonNegative(required(c, 'rPulRefOhmPerM', 'conductor'), 'conductor.rPulRefOhmPerM');
    const f0 = positive(required(c, 'fRefHz', 'conductor'), 'conductor.fRefHz');
    return { model, label: 'user_R_prime_scaled_sqrt_f', labels: ['user_R_prime_scaled_sqrt_f'], rAt: (f) => r0 * Math.sqrt(f / f0), internal, warn: () => [] };
  }
  if (model === 'surface_resistance_geometry_factor' || model === 'surface_resistance_perimeter') {
    const sigma = positive(required(c, 'sigmaSm', 'conductor'), 'conductor.sigmaSm (conductivity must be supplied; no material default)');
    let k;
    let labels;
    if (model === 'surface_resistance_geometry_factor') {
      k = positive(required(c, 'kPerM', 'conductor'), 'conductor.kPerM');
      labels = ['R_s_times_user_geometry_factor'];
    } else {
      const ps = positive(required(c, 'signalPerimeterM', 'conductor'), 'conductor.signalPerimeterM');
      const pr = positive(required(c, 'returnPerimeterM', 'conductor'), 'conductor.returnPerimeterM');
      const covers = c.perimetersCoverCarryingSurfaces;
      if (typeof covers !== 'boolean') fail('conductor.perimetersCoverCarryingSurfaces must be an explicit boolean: true only if the supplied perimeters are at least the true current-carrying surface lengths (not truncated by the domain or mirror plane, not thin film)');
      k = 1 / ps + 1 / pr;
      // Cauchy-Schwarz: integral K^2 >= I^2 / S >= I^2 / P when P >= S (S = true carrying surface length).
      labels = ['uniform_current_over_perimeter_approximation', 'no_current_crowding',
        covers ? 'lower_bound_only_under_caller_declared_perimeter_coverage_not_an_estimate' : 'perimeter_coverage_not_declared_estimate_is_not_a_bound'];
    }
    const t = c.thicknessM == null ? null : positive(c.thicknessM, 'conductor.thicknessM');
    const warn = (f) => (t == null ? ['conductor_thickness_not_checked_skin_effect_validity_unknown']
      : t < 3 * skinDepthM(f, sigma) ? ['conductor_thickness_below_3_skin_depths_surface_resistance_invalid'] : []);
    return { model, label: labels[0], labels, kPerM: k, sigmaSm: sigma, rAt: (f) => surfaceResistanceOhm(f, sigma) * k, internal, warn };
  }
  return fail('unreachable');
}

function buildDielectric(d) {
  if (d == null) fail('dielectric model is required: {model:"none"} to declare lossless dielectrics explicitly');
  const model = required(d, 'model', 'dielectric');
  if (model === 'none') return { model, label: 'lossless_by_declaration', tanAt: () => 0 };
  if (model === 'uniform') {
    const t = nonNegative(required(d, 'tanDelta', 'dielectric'), 'dielectric.tanDelta');
    return { model, label: 'uniform_tan_delta_full_participation', tanAt: () => t };
  }
  if (model === 'regions') {
    if (!Array.isArray(d.regions) || !d.regions.length) fail('dielectric.regions must be a non-empty array');
    const rows = d.regions.map((r, i) => {
      if (!r || typeof r !== 'object') fail(`dielectric.regions[${i}] must be an object`);
      const where = `dielectric.regions[${i}]${r.name ? ` (${r.name})` : ''}`;
      for (const k of Object.keys(r)) if (!['name', 'energyFraction', 'tanDelta', 'sigmaSm', 'epsR'].includes(k)) fail(`${where}: unsupported field "${k}"`);
      const p = nonNegative(required(r, 'energyFraction', where), `${where}.energyFraction`);
      if (p > 1) fail(`${where}.energyFraction must be at most 1 (got ${p})`);
      const hasTan = r.tanDelta !== undefined;
      const hasSigma = r.sigmaSm !== undefined;
      if (hasTan && hasSigma) fail(`${where}: ambiguous loss, give either tanDelta or {sigmaSm, epsR}, not both`);
      if (hasTan) {
        if (r.epsR !== undefined) fail(`${where}: epsR is only meaningful with sigmaSm`);
        const t = nonNegative(r.tanDelta, `${where}.tanDelta`);
        return { p, tan: () => t };
      }
      if (hasSigma) {
        const sg = nonNegative(r.sigmaSm, `${where}.sigmaSm`);
        const e = positive(required(r, 'epsR', where), `${where}.epsR`);
        return { p, tan: (f) => sg / (2 * Math.PI * f * EPS0 * e) };
      }
      return fail(`${where}: neither tanDelta nor sigmaSm supplied; unknown loss is not zero`);
    });
    const sum = rows.reduce((a, r) => a + r.p, 0);
    if (Math.abs(sum - 1) > 1e-6) fail(`dielectric region energy fractions must sum to 1 (got ${sum})`);
    return { model, label: 'energy_participation_weighted_tan_delta', tanAt: (f) => rows.reduce((a, r) => a + r.p * r.tan(f), 0) };
  }
  return fail(`unknown dielectric.model "${model}"`);
}

function buildPaperAttenuation(a) {
  const source = required(a, 'source', 'paperAttenuation');
  if (source !== 'paper_table' && source !== 'paper_law') fail('paperAttenuation.source must be "paper_table" or "paper_law"');
  const citation = required(a, 'citation', 'paperAttenuation');
  if (typeof citation !== 'string' || !citation.trim()) fail('paperAttenuation.citation must name the source locator');
  if (source === 'paper_law') {
    const a0 = positive(required(a, 'alpha0DbPerCmPerSqrtGhz', 'paperAttenuation'), 'paperAttenuation.alpha0DbPerCmPerSqrtGhz');
    return { source, citation, alphaAt: (fHz) => a0 * Math.sqrt(hzToGhz(fHz)), range: null };
  }
  const f = required(a, 'fGhz', 'paperAttenuation');
  const al = required(a, 'alphaDbPerCm', 'paperAttenuation');
  if (!Array.isArray(f) || !Array.isArray(al) || f.length !== al.length || f.length < 2) fail('paperAttenuation.fGhz and alphaDbPerCm must be equal-length arrays with at least 2 points');
  f.forEach((v, i) => {
    positive(v, `paperAttenuation.fGhz[${i}]`);
    nonNegative(al[i], `paperAttenuation.alphaDbPerCm[${i}]`);
    if (i > 0 && !(v > f[i - 1])) fail('paperAttenuation.fGhz must be strictly increasing');
  });
  const alphaAt = (fHz) => {
    const g = hzToGhz(fHz);
    if (g < f[0] - 1e-12 || g > f[f.length - 1] + 1e-12) fail(`frequency ${g} GHz is outside the paper table range [${f[0]}, ${f[f.length - 1]}] GHz; no extrapolation`);
    let i = 0;
    while (i < f.length - 2 && g > f[i + 1]) i++;
    const w = (g - f[i]) / (f[i + 1] - f[i]);
    return al[i] * (1 - w) + al[i + 1] * w; // linear interpolation in f, dB/cm
  };
  return { source, citation, alphaAt, range: [f[0], f[f.length - 1]] };
}

/**
 * Build a validated uniform-line model.
 * @param {object} spec
 *   cPul   F/m   per-unit-length capacitance C' (E1: es.cPul), required
 *   c0Pul  F/m   air-filled capacitance C0' (E1: es.c0Pul); gives L' = 1 / (c^2 C0')
 *   lPul   H/m   optional explicit L'; if both given they must agree (1e-6 relative)
 *   conductor    {model:'none'} | {model:'rprime_reference', rPulRefOhmPerM, fRefHz, includeInternalInductance}
 *                | {model:'surface_resistance_geometry_factor', sigmaSm, kPerM, thicknessM?, includeInternalInductance}
 *                  (R' = R_s(f) * kPerM; kPerM [1/m] = integral |J_s|^2 dl / I^2, supplied by the caller)
 *                | {model:'surface_resistance_perimeter', sigmaSm, signalPerimeterM, returnPerimeterM,
 *                   perimetersCoverCarryingSurfaces, thicknessM?, includeInternalInductance}
 *                  (R' = R_s (1/Ps + 1/Pr).  Uniform current over the perimeters, no crowding.  It is a lower
 *                  bound on R' ONLY IF each supplied perimeter is >= the true current-carrying surface length
 *                  (Cauchy-Schwarz); not if the polygons are truncated by the domain/mirror plane or the film is
 *                  thin.  Even when valid it can be ~2x low (microstrip-like section); never use as an estimate.)
 *                  thicknessM is optional but, when omitted, every result carries the warning
 *                  'conductor_thickness_not_checked_skin_effect_validity_unknown'.
 *   dielectric   {model:'none'} | {model:'uniform', tanDelta} | {model:'regions', regions:[{energyFraction,
 *                tanDelta | {sigmaSm, epsR}}]}  (G' = omega C' sum_i p_i tan delta_i)
 *   paperAttenuation  {source:'paper_table', citation, fGhz[], alphaDbPerCm[]} | {source:'paper_law', citation,
 *                alpha0DbPerCmPerSqrtGhz}.  Mutually exclusive with conductor/dielectric: it is an INPUT, not a
 *                prediction.  It is represented as an equivalent series R'(f) (G' = 0) that reproduces the
 *                input alpha exactly with the given L', C'.
 */
export function createRfLine(spec) {
  if (!spec || typeof spec !== 'object') fail('spec must be an object');
  const C = positive(spec.cPul, 'cPul (F/m)');
  let L;
  if (spec.c0Pul != null) {
    L = lPulFromC0(spec.c0Pul);
    if (spec.lPul != null && Math.abs(spec.lPul / L - 1) > 1e-6) fail(`lPul (${spec.lPul}) is inconsistent with 1/(c^2 C0') (${L})`);
  } else if (spec.lPul != null) L = positive(spec.lPul, 'lPul (H/m)');
  else fail('either c0Pul or lPul is required');
  const paper = spec.paperAttenuation != null;
  if (paper && (spec.conductor != null || spec.dielectric != null)) fail('paperAttenuation excludes conductor/dielectric models (would double count loss)');
  const out = { cPul: C, lPul: L, c0Pul: spec.c0Pul ?? null, kind: paper ? 'paper_input' : 'model' };
  if (paper) out.paper = buildPaperAttenuation(spec.paperAttenuation);
  else {
    out.conductor = buildConductor(spec.conductor);
    out.dielectric = buildDielectric(spec.dielectric);
  }
  return Object.freeze(out);
}

// ---- evaluation ---------------------------------------------------------------------------------

/** R', L'(total series inductance incl. optional internal), G', C' at fHz. */
export function rlgcAt(line, fHz) {
  positive(fHz, 'frequency (Hz)');
  const w = 2 * Math.PI * fHz;
  const warnings = [];
  let R;
  let Lser = line.lPul;
  let G;
  if (line.kind === 'paper_input') {
    const a = dbPerCmToNpPerM(line.paper.alphaAt(fHz));
    const beta = Math.sqrt(a * a + w * w * line.lPul * line.cPul);
    R = (2 * a * beta) / (w * line.cPul);
    G = 0;
  } else {
    R = line.conductor.rAt(fHz);
    if (line.conductor.internal) Lser += R / w;
    if (line.conductor.warn) warnings.push(...line.conductor.warn(fHz));
    G = w * line.cPul * line.dielectric.tanAt(fHz);
  }
  return { R, L: Lser, G, C: line.cPul, warnings };
}

/** Full propagation result at fHz (Hz). */
export function propagationAt(line, fHz) {
  const p = rlgcAt(line, fHz);
  const w = 2 * Math.PI * fHz;
  const Z = cx(p.R, w * p.L);
  const Y = cx(p.G, w * p.C);
  const gamma = csqrt(cmul(Z, Y));
  const z0 = csqrt(cdiv(Z, Y));
  const alpha = gamma.re;
  const beta = gamma.im;
  const lossless = lowLossAlpha({ R: p.R, G: p.G, L: line.lPul, C: p.C });
  const fGhz = hzToGhz(fHz);
  return {
    fHz,
    fGhz,
    omegaRadPerS: w,
    rOhmPerM: p.R,
    lHPerM: p.L,
    gSPerM: p.G,
    cFPerM: p.C,
    gamma,
    alphaNpPerM: alpha,
    betaRadPerM: beta,
    alphaDbPerCm: npPerMToDbPerCm(alpha),
    alphaDbPerCmPerSqrtGhz: npPerMToDbPerCm(alpha) / Math.sqrt(fGhz),
    z0,
    nRf: (C_LIGHT * beta) / w,
    vPhaseMPerS: w / beta,
    vPhaseOverC: w / beta / C_LIGHT,
    // Low-loss split with the lossless Z0 = sqrt(L'/C'); components sum to the approximation, not to gamma.
    lowLossComponentsNpPerM: { conductor: lossless.conductor, dielectric: lossless.dielectric },
    lossSource: line.kind === 'paper_input' ? 'paper_input' : 'model',
    // Machine-readable model labels: conductor labels (and any bound condition) plus the dielectric label.
    lossLabels: line.kind === 'paper_input' ? ['paper_loss_is_input_equivalent_series_resistance'] : [...line.conductor.labels, line.dielectric.label],
    independentPrediction: line.kind === 'model',
    warnings: p.warnings,
  };
}

/** Sweep over frequencies given in GHz; returns one propagationAt result per point. */
export function sweepGhz(line, fGhzList) {
  if (!Array.isArray(fGhzList) || !fGhzList.length) fail('frequency list (GHz) must be a non-empty array');
  return fGhzList.map((g) => propagationAt(line, ghzToHz(positive(g, 'frequency (GHz)'))));
}

/** Evenly spaced frequency list in GHz (inclusive of both ends). */
export function linspaceGhz(startGhz, stopGhz, n) {
  positive(startGhz, 'start (GHz)');
  positive(stopGhz, 'stop (GHz)');
  if (!Number.isInteger(n) || n < 1) fail('n must be a positive integer');
  if (n === 1) return [startGhz];
  return Array.from({ length: n }, (_, i) => startGhz + ((stopGhz - startGhz) * i) / (n - 1));
}
