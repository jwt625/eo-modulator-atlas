// Postprocessing dataset `semi` of a drift-diffusion state (DevLog-039): device mesh and nodal fields in SI units,
// with a variable registry in the shape of the postproc store ({name, unit, displayUnit, description, location}).
// The store hook (engine/src/postproc/store.mjs) is outside this lane; this module only builds the arrays.
// License: GPL-3.0-or-later.

/** Variables of the semi dataset: name, SI unit, display unit, description. */
export const SEMI_VARIABLES = Object.freeze([
  ['psi', 'V', 'V', 'electrostatic potential (0 = intrinsic level at equilibrium)'],
  ['phin', 'V', 'V', 'electron quasi-Fermi potential'],
  ['phip', 'V', 'V', 'hole quasi-Fermi potential'],
  ['n', '1/m^3', '1/cm^3', 'electron density'],
  ['p', '1/m^3', '1/cm^3', 'hole density'],
  ['ND', '1/m^3', '1/cm^3', 'donor density (control-volume average)'],
  ['NA', '1/m^3', '1/cm^3', 'acceptor density (control-volume average)'],
  ['Nnet', '1/m^3', '1/cm^3', 'net doping N_D - N_A'],
  ['rho', 'C/m^3', 'C/cm^3', 'space charge q (p - n + N_D - N_A)'],
  ['dN', '1/m^3', '1/cm^3', 'electron density change from the reference bias'],
  ['dP', '1/m^3', '1/cm^3', 'hole density change from the reference bias'],
  ['delta_n', '1', '1', 'free-carrier index change vs undoped silicon (plasma-dispersion model)'],
  ['delta_alpha', '1/m', '1/cm', 'free-carrier intensity absorption vs undoped silicon (plasma-dispersion model)'],
  ['dn_bias', '1', '1', 'bias-induced index change delta_n(V) - delta_n(V0) vs the reference bias V0 (with density_basis change: the fit applied to the density change); the field the dn_eff perturbation integrates'],
  ['dalpha_bias', '1/m', '1/cm', 'bias-induced absorption change delta_alpha(V) - delta_alpha(V0) vs the reference bias V0 (same basis as dn_bias); the field the d alpha perturbation integrates'],
].map(([name, unit, displayUnit, description]) => Object.freeze({ name, unit, displayUnit, description, location: 'node', group: 'semi' })));

/** Per-bias-point globals of the semi datasets (postproc `semi.<name>`, location global; DevLog-039 round 4). */
export const SEMI_GLOBALS = Object.freeze([
  ['dn_eff_per_v', '1/V', '1/V', 'small-signal d n_eff / dV of the swept contact at this bias point (central over +-dv/2); NaN without optics'],
  ['G', 'S/m', 'S/m', 'junction conductance per length G\'_j at this bias point: terminal dI/dV with the series path R\' de-embedded, G\'_t / (1 - R\' G\'_t); NaN when the contact current is below the residual floor (reverse bias)'],
  ['operating_bias', 'V', 'V', 'DC bias of the swept contact at this bias point (semiconductor.operating_bias_v marks the TWE operating point)'],
].map(([name, unit, displayUnit, description]) => Object.freeze({ name, unit, displayUnit, description, location: 'global', group: 'semi' })));

/**
 * Build the dataset of the current state.
 * @param {any} dd DriftDiffusion (current state)
 * @param {{reference?:{n:Float64Array, p:Float64Array}|null, plasma?:{dn:Float64Array, da:Float64Array}|null, biasV?:number[],
 *   biasPlasma?:{dn:Float64Array, da:Float64Array}|null}} [o] biasPlasma: change vs the reference bias (dn_bias, dalpha_bias)
 */
export function semiDataset(dd, { reference = null, plasma = null, biasV = null, biasPlasma = null } = {}) {
  const { dev } = dd;
  const m = dev.mesh;
  const nN = dd.nN;
  const { Vt, C0 } = dev.scale;
  const c = C0 * 1e6;
  const q = 1.602176634e-19;
  const f = (fn) => { const a = new Float64Array(nN); for (let i = 0; i < nN; i++) a[i] = fn(i); return a; };
  const semi = (i) => dev.isSemi[i] === 1;
  const values = {
    psi: f((i) => dd.psi[i] * Vt),
    phin: f((i) => (semi(i) ? dd.phin[i] * Vt : NaN)),
    phip: f((i) => (semi(i) ? dd.phip[i] * Vt : NaN)),
    n: f((i) => dd.n[i] * c),
    p: f((i) => dd.p[i] * c),
    ND: f((i) => dev.ND[i] * 1e6),
    NA: f((i) => dev.NA[i] * 1e6),
    Nnet: f((i) => (dev.ND[i] - dev.NA[i]) * 1e6),
    rho: f((i) => (semi(i) ? q * c * (dd.p[i] - dd.n[i] + dev.Chat[i]) : 0)),
    dN: f((i) => (reference ? (dd.n[i] - reference.n[i]) * c : NaN)),
    dP: f((i) => (reference ? (dd.p[i] - reference.p[i]) * c : NaN)),
    delta_n: f((i) => (plasma ? plasma.dn[i] : NaN)),
    delta_alpha: f((i) => (plasma ? plasma.da[i] : NaN)),
    dn_bias: f((i) => (biasPlasma ? biasPlasma.dn[i] : NaN)),
    dalpha_bias: f((i) => (biasPlasma ? biasPlasma.da[i] : NaN)),
  };
  return {
    id: 'semi', kind: 'semi', location: 'node', interpolation: 'P1 linear per triangle',
    biasV: biasV ?? Array.from(dd.bias),
    mesh: { x: Float64Array.from(m.x), y: Float64Array.from(m.y), tri: Int32Array.from(m.tri), triRegion: Int32Array.from(m.triRegion), regionNames: dev.section.regions.map((r) => r.name), regionMaterials: dev.section.regions.map((r) => r.material), units: { x: 'um', y: 'um' } },
    variables: SEMI_VARIABLES.map((v) => ({ ...v, values: values[v.name] })),
  };
}
