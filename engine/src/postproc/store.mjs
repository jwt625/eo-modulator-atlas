// Solution store of the postprocessing engine (DevLog-030 P1-P3, DevLog-031): datasets over the solved meshes of one
// run, the variable registry with SI units, exact point evaluation of every field from its own element interpolation,
// point sets (nodes, centroids, corners, quadrature points, arbitrary points) and a byte-bounded LRU cache of
// evaluated arrays. Built from runCrossSection(text, {keep: true}).internals; holds no solver factorisations.
// License: GPL-3.0-or-later.

import { TriLocator, EPS0, MU0, C_LIGHT } from '../electrostatics.mjs';
import { VECTOR_KERNELS } from '../vector-mode.mjs';
import { sampleFieldOnOpticalMesh } from '../eo-overlap.mjs';
import { regionOpticalData, POCKELS_COMPONENTS, armElectrodeGap } from './eo-analysis.mjs';
import { modeIdentity } from '../optical-stage.mjs';
import { compileExpression, ExpressionError } from './expr.mjs';
import { DIMLESS, formatUnit, parseUnit } from './units.mjs';

const ETA0 = MU0 * C_LIGHT;
export const DEFAULT_CACHE_BYTES = 128 * 1024 * 1024;
/** Above this many points a quadrature evaluation runs in element chunks and is not cached. */
export const MAX_CACHED_POINTS = 1 << 20;

const U = (s) => parseUnit(s).dim;
const DIM = {
  one: DIMLESS, m: U('m'), m2: U('m^2'), perM: U('1/m'), V: U('V'), Vm: U('V/m'), Am: U('A/m'), Wm2: U('W/m^2'),
  Cm2: U('C/m^2'), Jm3: U('J/m^3'), Fm: U('F/m'), Hm: U('H/m'), ohm: U('ohm'), perV: U('1/V'), perVm2: U('1/(V*m^2)'),
  Vm1: U('V*m'), s: U('s'), Hz: U('Hz'),
};

// ---- static registries -------------------------------------------------------------------------------------------

/** Run globals (unprefixed names; SI values from runGlobals). */
export const GLOBAL_VARIABLES = Object.freeze([
  ['C', DIM.Fm, 'pF/m', 'capacitance per length C\' (energy, full structure, per volt of terminal voltage)'],
  ['C0', DIM.Fm, 'pF/m', 'vacuum capacitance per length C0\''],
  ['L', DIM.Hm, 'nH/m', 'quasi-TEM inductance per length L\' = 1 / (c^2 C0\')'],
  ['Z0', DIM.ohm, 'ohm', 'quasi-TEM characteristic impedance'],
  ['nRF', DIM.one, '1', 'quasi-TEM RF index sqrt(C\' / C0\')'],
  ['neff', DIM.one, '1', 'effective index of the selected optical mode (optical_mode stage)'],
  ['ng', DIM.one, '1', 'group index of the selected optical mode'],
  ['dneffA', DIM.perV, '1/V', 'arm A d(n_eff)/dV (engine perturbation, per volt of terminal voltage)'],
  ['dneffB', DIM.perV, '1/V', 'arm B d(n_eff)/dV'],
  ['VpiL', DIM.Vm1, 'V*cm', 'DC Vpi-length product (engine)'],
  ['Vpi', DIM.V, 'V', 'DC Vpi at line.length_mm'],
  ['GammaA', DIM.one, '1', 'conventional overlap Gamma of arm A (gap from the geometry)'],
  ['GammaB', DIM.one, '1', 'conventional overlap Gamma of arm B'],
  ['EbarA', DIM.Vm, 'V/um', 'arm A overlap-weighted static field int_EO E_c |E|^2 / int |E|^2 (per terminal volt)'],
  ['EbarB', DIM.Vm, 'V/um', 'arm B overlap-weighted static field'],
  ['gapA', DIM.m, 'um', 'electrode gap of arm A from the geometry'],
  ['gapB', DIM.m, 'um', 'electrode gap of arm B from the geometry'],
  ['VpiLtextbook', DIM.Vm1, 'V*cm', 'implied textbook VpiL lambda / (n_e^3 r33 |Ebar_A - Ebar_B|)'],
  ['balance', DIM.one, '1', 'push-pull balance dn_B / dn_A'],
  ['t_total', DIM.s, 's', 'wall time of the run'],
].map(([name, dim, displayUnit, description]) => Object.freeze({ name, unit: formatUnit(dim), displayUnit, dim, description, location: 'global', complex: false, continuous: true, group: 'global' })));

/**
 * SI values of the run globals of a (serializable) result; absent quantities are omitted.
 * @param {import('../run.d.mts').SimulationResult} result
 * @returns {Record<string, number>}
 */
export function runGlobals(result, { lambdaUm = null } = {}) {
  const m = result?.metrics ?? {};
  const eo = result?.eo ?? null;
  const out = {};
  const put = (k, v) => { if (typeof v === 'number' && Number.isFinite(v)) out[k] = v; };
  put('C', m.c_pul_pf_per_m * 1e-12); put('C0', m.c0_pul_pf_per_m * 1e-12); put('L', m.l_pul_nh_per_m * 1e-9);
  put('Z0', m.z0_ohm); put('nRF', m.n_rf); put('neff', m.n_eff); put('ng', m.ng_opt);
  if (eo) {
    put('dneffA', eo.arms?.A?.dnEffPerV); put('dneffB', eo.arms?.B?.dnEffPerV); put('balance', eo.pushPullBalance);
    for (const a of ['A', 'B']) {
      const c = eo.arms?.[a]?.conventional;
      if (!c) continue;
      put(`Gamma${a}`, c.gamma); put(`Ebar${a}`, c.ebarVPerMPerV); put(`gap${a}`, c.gapUm == null ? null : c.gapUm * 1e-6);
    }
    put('VpiLtextbook', eo.conventional?.vpiLVcmTextbook == null ? null : eo.conventional.vpiLVcmTextbook * 1e-2);
  }
  put('VpiL', m.vpi_l_dc_vcm * 1e-2); put('Vpi', m.vpi_dc_v);
  put('t_total', result?.elapsed_ms / 1000);
  // vacuum wavelength (m), for lambda0 / k0 / f0 in global expressions over sweep points (not a listed variable)
  put('lambda0', lambdaUm == null ? null : lambdaUm * 1e-6);
  return out;
}

const varInfo = (name, dim, displayUnit, description, location, complex, continuous, group) =>
  ({ name, unit: formatUnit(dim), displayUnit, dim, description, location, complex, continuous, group });

const ES_VARS = [
  ['V', DIM.V, 'V', 'electric potential (per volt of terminal voltage)', true],
  ['Ex', DIM.Vm, 'V/um', 'static field x component, E = -grad V', false],
  ['Ey', DIM.Vm, 'V/um', 'static field y component', false],
  ['normE', DIM.Vm, 'V/um', 'static field norm', false],
  ['Dx', DIM.Cm2, 'C/m^2', 'electric displacement x, eps0 eps_rf E', false],
  ['Dy', DIM.Cm2, 'C/m^2', 'electric displacement y', false],
  ['We', DIM.Jm3, 'J/m^3', 'electric energy density E . D / 2 (its integral over the solved domain x symmetry factor is C\' V^2 / 2)', false],
  ['epsxx', DIM.one, '1', 'RF relative permittivity xx (lab)', false, 'element'],
  ['epsyy', DIM.one, '1', 'RF relative permittivity yy (lab)', false, 'element'],
  ['epsxy', DIM.one, '1', 'RF relative permittivity xy (lab)', false, 'element'],
  ['region', DIM.one, '1', 'region index of the electrostatic mesh (regionNames order)', false, 'element'],
];
const OPT_VECTOR_VARS = [
  ['Ex', DIM.Vm, 'V/um', 'optical E_x (power-normalised to 1 W, phasor)', false, 'point', true],
  ['Ey', DIM.Vm, 'V/um', 'optical E_y', false, 'point', true],
  ['Ez', DIM.Vm, 'V/um', 'optical E_z (j times a real field for a lossless mode)', true, 'point', true],
  ['Hx', DIM.Am, 'A/m', 'optical H_x', false, 'point', true],
  ['Hy', DIM.Am, 'A/m', 'optical H_y', false, 'point', true],
  ['Hz', DIM.Am, 'A/m', 'optical H_z', false, 'point', true],
  ['normE', DIM.Vm, 'V/um', 'optical |E|', false],
  ['normH', DIM.Am, 'A/m', 'optical |H|', false],
  ['Sz', DIM.Wm2, 'W/um^2', 'Poynting z, Re(E x H*)_z / 2 (its integral is 1 W)', false],
  ['I', DIM.Wm2, 'W/um^2', 'optical intensity = Sz', false],
  ['nxx', DIM.one, '1', 'optical index sqrt(eps_xx) (lab)', false, 'element'],
  ['nyy', DIM.one, '1', 'optical index sqrt(eps_yy)', false, 'element'],
  ['nzz', DIM.one, '1', 'optical index sqrt(eps_zz)', false, 'element'],
  ['region', DIM.one, '1', 'region index of the optical mesh', false, 'element'],
];
const OPT_SCALAR_VARS = {
  TE: [
    ['psi', DIM.one, '1', 'scalar solver field (E_x), max |psi| = 1', true],
    ['Ex', DIM.Vm, 'V/um', 'optical E_x (scalar TE, power-normalised to 1 W)', true],
    ['Hy', DIM.Am, 'A/m', 'optical H_y = n_eff E_x / eta0 (scalar TE)', true],
    ['normE', DIM.Vm, 'V/um', 'optical |E_x| (scalar TE)', true],
    ['Sz', DIM.Wm2, 'W/um^2', 'Poynting z = n_eff E_x^2 / (2 eta0) (scalar TE)', true],
    ['I', DIM.Wm2, 'W/um^2', 'optical intensity = Sz', true],
  ],
  TM: [
    ['psi', DIM.one, '1', 'scalar solver field (H_x), max |psi| = 1', true],
    ['Hx', DIM.Am, 'A/m', 'optical H_x (scalar TM, power-normalised to 1 W)', true],
    ['Ey', DIM.Vm, 'V/um', 'optical E_y = -n_eff eta0 H_x / n_yy^2 (scalar TM)', false],
    ['normE', DIM.Vm, 'V/um', 'optical |E_y| (scalar TM)', false],
    ['Sz', DIM.Wm2, 'W/um^2', 'Poynting z = n_eff eta0 H_x^2 / (2 n_yy^2) (scalar TM)', false],
    ['I', DIM.Wm2, 'W/um^2', 'optical intensity = Sz', false],
  ],
};
const OPT_SCALAR_COMMON = [
  ['nxx', DIM.one, '1', 'optical index sqrt(eps_xx) (lab)', false, 'element'],
  ['nyy', DIM.one, '1', 'optical index sqrt(eps_yy)', false, 'element'],
  ['nzz', DIM.one, '1', 'optical index sqrt(eps_zz)', false, 'element'],
  ['region', DIM.one, '1', 'region index of the optical mesh', false, 'element'],
];
const MODE_GLOBALS = [
  ['neff', DIM.one, '1', 'effective index of this mode'],
  ['ng', DIM.one, '1', 'group index of this mode (vector: perturbation; scalar: selected mode only)'],
  ['beta', DIM.perM, '1/um', 'propagation constant Re(beta)'],
  ['alpha', DIM.perM, '1/m', 'field attenuation -Im(beta) (lossy metal only, else 0)'],
  ['teFraction', DIM.one, '1', 'TE fraction int |E_x|^2 / int |E_t|^2 (vector)'],
  ['Aeff', DIM.m2, 'um^2', 'effective area (int |E|^2)^2 / int |E|^4 (vector)'],
];
const EO_VARS = [
  ['dnxx', DIM.perV, '1/V', 'Pockels index change of the lab x axis per volt, d eps_xx / (2 n_xx)'],
  ['dnyy', DIM.perV, '1/V', 'Pockels index change of the lab y axis per volt'],
  ['dnzz', DIM.perV, '1/V', 'Pockels index change of the lab z axis per volt'],
  ['depsxy', DIM.perV, '1/V', 'Pockels shear d eps_xy per volt (relative permittivity)'],
  ['Ec', DIM.Vm, 'V/um', 'static field along the in-plane projection of the EO material c axis (conventional Gamma integrand)'],
  ['integrand', DIM.perVm2, '1/(V*um^2)', 'd(n_eff)/dV per area; its integral over the arm window is the engine dn_eff/V'],
  ...POCKELS_COMPONENTS.map((c) => [`integrand_${c}`, DIM.perVm2, '1/(V*um^2)', `integrand with only the ${c} Pockels entries`]),
];
const RF_VARS = [
  ['f', DIM.Hz, 'GHz', 'RF frequency of the sweep point'],
  ['alpha', DIM.perM, '1/m', 'RF attenuation in nepers per metre (field), alpha_dB ln(10) / 20'],
  ['alpha_dB', DIM.perM, 'dB/cm', 'RF attenuation in decibels per metre (dB is a label with factor 1: display unit dB/cm gives dB per cm)'],
  ['nRF', DIM.one, '1', 'RF effective index of the line at this frequency'],
  ['Z0', DIM.ohm, 'ohm', 'complex characteristic impedance of the line'],
];
const CONSTANTS = [
  ['pi', Math.PI, DIM.one, 'pi'], ['eps0', EPS0, DIM.Fm, 'vacuum permittivity'], ['mu0', MU0, DIM.Hm, 'vacuum permeability'],
  ['c_const', C_LIGHT, U('m/s'), 'speed of light in vacuum'],
];

/**
 * Constants shared by store expressions and sweep global expressions (audit E4): pi, eps0, mu0, c_const, i, j, and
 * lambda0, k0, f0 when the vacuum wavelength (m) is known. Returns null for any other name.
 */
export function resolveConstant(name, lambdaM = null) {
  const c = CONSTANTS.find((q) => q[0] === name);
  if (c) return { kind: 'const', re: c[1], dim: c[2] };
  if (name === 'i' || name === 'j') return { kind: 'const', re: 0, im: 1, dim: DIMLESS };
  if (lambdaM > 0) {
    if (name === 'lambda0') return { kind: 'const', re: lambdaM, dim: DIM.m };
    if (name === 'k0') return { kind: 'const', re: (2 * Math.PI) / lambdaM, dim: DIM.perM };
    if (name === 'f0') return { kind: 'const', re: C_LIGHT / lambdaM, dim: DIM.Hz };
  }
  return null;
}
export const CONSTANT_NAMES = Object.freeze(['pi', 'eps0', 'mu0', 'c_const', 'i', 'j', 'lambda0', 'k0', 'f0']);

// ---- LRU cache ---------------------------------------------------------------------------------------------------

const bytesOf = (v) => {
  if (!v) return 0;
  if (ArrayBuffer.isView(v)) return v.byteLength;
  if (typeof v === 'object') { let b = 0; for (const x of Object.values(v)) if (ArrayBuffer.isView(x)) b += x.byteLength; else if (x && typeof x === 'object' && !Array.isArray(x)) for (const y of Object.values(x)) if (ArrayBuffer.isView(y)) b += y.byteLength; return b; }
  return 0;
};

class Lru {
  constructor(maxBytes) { this.max = maxBytes; this.map = new Map(); this.bytes = 0; }
  get(k) { const e = this.map.get(k); if (!e) return undefined; this.map.delete(k); this.map.set(k, e); return e.v; }
  set(k, v) {
    const b = bytesOf(v);
    const old = this.map.get(k);
    if (old) { this.bytes -= old.b; this.map.delete(k); }
    this.map.set(k, { v, b });
    this.bytes += b;
    while (this.bytes > this.max && this.map.size > 1) {
      const [k0, e0] = this.map.entries().next().value;
      this.map.delete(k0);
      this.bytes -= e0.b;
    }
    return v;
  }
  clear() { this.map.clear(); this.bytes = 0; }
}

// ---- point sets --------------------------------------------------------------------------------------------------

const { Q4 } = VECTOR_KERNELS;
const PATTERNS = {
  centroid: Float64Array.of(1 / 3, 1 / 3, 1 / 3),
  corner: Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1),
  quad: Float64Array.from(Q4.flatMap((q) => [q[0], q[1], q[2]])),
  // edge midpoints in the P2 local order m01, m12, m20
  edge: Float64Array.of(0.5, 0.5, 0, 0, 0.5, 0.5, 0.5, 0, 0.5),
  // P2 Lagrange points: vertices then edge midpoints (fem.p2Space local order)
  p2: Float64Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1, 0.5, 0.5, 0, 0, 0.5, 0.5, 0.5, 0, 0.5),
  // barycentric lattice of order 8 (45 points), used to refine a surface max/min inside the best element
  lattice: (() => { const a = []; for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8 - i; j++) a.push(i / 8, j / 8, (8 - i - j) / 8); return Float64Array.from(a); })(),
};
export const PATTERN_SIZES = Object.freeze(Object.fromEntries(Object.entries(PATTERNS).map(([k, v]) => [k, v.length / 3])));
export const QUAD_WEIGHTS = Float64Array.from(Q4.map((q) => q[3]));

/** Iterate the points of a location record: fn(i, t, L0, L1, L2). t < 0: not in the mesh (-1) or in electrode -2-t. */
function each(loc, fn) {
  if (loc.pattern) {
    const { elems, pattern: P, nEl } = loc;
    const np = P.length / 3;
    let i = 0;
    for (let e = 0; e < nEl; e++) {
      const t = elems ? elems[e] : e;
      for (let p = 0; p < np; p++, i++) fn(i, t, P[3 * p], P[3 * p + 1], P[3 * p + 2]);
    }
  } else {
    const { tri, L, n } = loc;
    for (let i = 0; i < n; i++) fn(i, tri[i], L[3 * i], L[3 * i + 1], L[3 * i + 2]);
  }
}

// ---- store -------------------------------------------------------------------------------------------------------

let STORE_SEQ = 0;

/**
 * Create a solution store from a run kept with `keep: true`.
 * @param {any} result runCrossSection / runConfig result with non-enumerable `internals`
 * @param {{cacheBytes?:number}} [options]
 */
export function createSolutionStore(result, { cacheBytes = DEFAULT_CACHE_BYTES } = {}) {
  const I = result?.internals;
  if (!I) throw new Error('createSolutionStore: the result has no internals; run with {keep: true}');
  return new SolutionStore(result, I, cacheBytes);
}

class SolutionStore {
  constructor(result, I, cacheBytes) {
    this.id = `store${++STORE_SEQ}`;
    this.section = I.section;
    this.sectionName = I.sectionName;
    this.lambdaUm = I.lambdaUm;
    this.cache = new Lru(cacheBytes);
    this.compiled = new Map();
    this.meshes = new Map();
    this.families = new Map();
    this.extra = new Map();
    this.seq = 0;
    this.dsSeq = 0;
    this.globals = result.globals ?? runGlobals(result, { lambdaUm: I.lambdaUm });
    // RF line frequency sweep (serializable result.rf.sweep), dataset 'rf' (R-UI request, round 2)
    const sw = result.rf?.sweep ?? null;
    this.rf = sw && sw.fGhz?.length ? { fGhz: Float64Array.from(sw.fGhz), alphaDbPerCm: Float64Array.from(sw.alphaDbPerCm), nRf: Float64Array.from(sw.nRf), z0Re: Float64Array.from(sw.z0ReOhm), z0Im: Float64Array.from(sw.z0ImOhm) } : null;
    this.es = null;
    if (I.es) this.initEs(I.es);
    const models = new Map();
    const addFamily = (name, solved, arm) => {
      if (!solved) return;
      let rec = models.get(solved);
      if (!rec) { rec = this.initModel(solved, name); models.set(solved, rec); }
      this.families.set(name, { name, rec, arm });
    };
    addFamily('opt', I.optical, null);
    addFamily('armA', I.arms?.A ?? null, 'A');
    addFamily('armB', I.arms?.B ?? null, 'B');
  }

  // ---- construction ----
  initEs(es) {
    const m = es.mesh;
    const absArea = Float64Array.from(es.geo.area, Math.abs);
    const rec = { id: 'es', kind: 'es', mesh: m, geo: es.geo, absArea, nNodes: m.nNodes, nTris: m.nTris,
      regionNames: this.section.regions.map((r) => r.name), regionMaterials: this.section.regions.map((r) => r.material), locator: null };
    this.meshes.set('es', rec);
    this.es = { rec, order: es.elementOrder ?? 1, phi: es.elementOrder === 2 ? es.phiDof : es.phi, elem: es.elementOrder === 2 ? es.p2.elem : null,
      epsTri: es.epsTri, potentials: es.electrodePotentials, symmetryFactor: es.symmetryFactor ?? 1, cPul: es.cPul,
      // slim copy for eo-overlap.sampleFieldOnOpticalMesh (no solver or factorisation is retained)
      raw: { mesh: m, geo: es.geo, grad: es.grad, elementOrder: es.elementOrder ?? 1, phiDof: es.phiDof, p2: es.p2 ? { elem: es.p2.elem } : null } };
  }

  initModel(solved, name) {
    // slim model: only what point evaluation and the EO data read (no CSR pattern, ordering or factorisation)
    const m0 = solved.model;
    const model = solved.kind === 'vector'
      ? { kind: 'vector', order: m0.order, mesh: m0.mesh, geo: m0.geo, area: m0.area, regions: m0.regions, mats: m0.mats, lambda0Um: m0.lambda0Um,
        dead: m0.dead, edges: { triSign: m0.edges.triSign }, dof: { nloc: m0.dof.nloc, td: m0.dof.td }, section: m0.section, window: m0.window }
      : { kind: 'scalar', mesh: m0.mesh, geo: m0.geo, regions: m0.regions, mats: m0.mats, lambda0Um: m0.lambda0Um, polarization: m0.polarization, section: m0.section, window: m0.window };
    const id = name;
    const absArea = model.area ? model.area : Float64Array.from(model.geo.area, Math.abs);
    const rec = { id, kind: solved.kind, mesh: model.mesh, geo: model.geo, absArea, nNodes: model.mesh.nNodes, nTris: model.mesh.nTris,
      regionNames: model.regions.map((r) => r.name), regionMaterials: model.regions.map((r) => r.material), locator: null,
      model, polarization: solved.kind === 'vector' ? solved.diagnostics.polarizationFamily : model.polarization,
      lambdaUm: solved.kind === 'vector' ? solved.res.lambdaUm : solved.mode.lambdaUm, modes: [], selected: 0, regionData: null, eoPrep: null };
    this.meshes.set(id, rec);
    if (solved.kind === 'vector') {
      rec.modes = solved.res.modes.map((md, k) => ({ ...vectorModeRec(md, k, model), ...modeIdentity(solved.res.modes, k) }));
      rec.selected = solved.res.modes.indexOf(solved.mode);
    } else {
      const md = solved.mode;
      rec.modes = md.psi.map((psi, k) => ({ ...scalarModeRec(md, k, model, solved), ...modeIdentity(null, k, model.polarization) }));
      rec.selected = solved.diagnostics.modeIndex;
    }
    return rec;
  }

  regionData(rec) { return (rec.regionData ??= regionOpticalData(rec.model, rec.lambdaUm)); }

  // ---- public API ----
  datasets() {
    if (this.disposed) throw new Error('solution store disposed');
    const out = [];
    if (this.es) out.push({ id: 'es', kind: 'es', label: `Electrostatics (${this.sectionName})`, section: this.sectionName, mesh: 'es' });
    for (const [name, f] of this.families) {
      const rec = f.rec;
      const kind = name === 'opt' ? 'opt' : 'arm';
      const base = { kind, section: this.sectionName, mesh: rec.id, nModes: rec.modes.length, ...(f.arm ? { arm: f.arm } : {}) };
      const lab = name === 'opt' ? 'Optical mode' : `Arm ${f.arm} mode`;
      // an arm solved on the optical window shares the optical-stage model: mark it as an alias of opt (round 2)
      const alias = name !== 'opt' && this.families.get('opt')?.rec === rec;
      const ms = rec.modes[rec.selected];
      out.push({ id: name, label: `${lab} ${ms.label}, solved (n_eff ${ms.neff.toFixed(5)})`, mode: rec.selected, selected: true, modeLabel: ms.label, family: ms.family, familyIndex: ms.familyIndex, ...base, ...(alias ? { aliasOf: 'opt' } : {}) });
      rec.modes.forEach((md, k) => out.push({ id: `${name}:${k}`, label: `${lab} ${md.label}${k === rec.selected ? ', solved' : ''} (n_eff ${md.neff.toFixed(5)})`, mode: k, selected: k === rec.selected, modeLabel: md.label, family: md.family, familyIndex: md.familyIndex, ...base, ...(alias ? { aliasOf: `opt:${k}` } : {}) }));
    }
    for (const a of ['A', 'B']) {
      const f = this.families.get(`arm${a}`);
      if (f && this.es) out.push({ id: `eo${a}`, kind: 'eo', label: `EO overlap arm ${a}`, section: this.sectionName, mesh: f.rec.id, arm: a, mode: f.rec.selected, selected: true });
    }
    if (this.rf) out.push({ id: 'rf', kind: 'rf', label: 'RF line (frequency sweep)', section: this.sectionName, mesh: null, n: this.rf.fGhz.length });
    for (const d of this.extra.values()) out.push(d.info);
    return out;
  }

  dataset(id) {
    if (this.disposed) throw new Error('solution store disposed');
    if (id === 'es') { if (!this.es) throw new Error('dataset es: no electrostatic solution in this run'); return { id, kind: 'es', mesh: 'es', family: null, mode: null, arm: null }; }
    if (id === 'rf') { if (!this.rf) throw new Error('dataset rf: the rf_line stage did not run with a frequency sweep'); return { id, kind: 'rf', mesh: null, family: null, mode: null, arm: null }; }
    const ex = this.extra.get(id);
    if (ex) return { ...this.dataset(ex.info.parent), id, kind: ex.info.kind, extra: ex };
    const m = /^(opt|armA|armB|eoA|eoB)(?::(\d+))?$/.exec(id ?? '');
    if (!m) throw new Error(`unknown dataset ${id} (available: ${this.datasets().map((d) => d.id).join(', ')})`);
    const famName = m[1].startsWith('eo') ? `arm${m[1].slice(2)}` : m[1];
    const f = this.families.get(famName);
    if (!f) throw new Error(`dataset ${id}: ${famName} was not solved in this run`);
    if (m[1].startsWith('eo') && !this.es) throw new Error(`dataset ${id}: EO datasets need the electrostatic solution`);
    const mode = m[2] == null ? f.rec.selected : Number(m[2]);
    if (!(mode >= 0 && mode < f.rec.modes.length)) throw new Error(`dataset ${id}: mode ${mode} outside 0..${f.rec.modes.length - 1}`);
    return { id, kind: m[1].startsWith('eo') ? 'eo' : famName === 'opt' ? 'opt' : 'arm', mesh: f.rec.id, family: famName, mode, arm: f.arm };
  }

  mesh(meshId) {
    if (this.disposed) throw new Error('solution store disposed');
    const r = this.meshes.get(meshId);
    if (!r) throw new Error(`unknown mesh ${meshId}`);
    return { id: r.id, x: r.mesh.x, y: r.mesh.y, tri: r.mesh.tri, triRegion: r.mesh.triRegion, regionNames: r.regionNames, regionMaterials: r.regionMaterials, nNodes: r.nNodes, nTris: r.nTris };
  }

  addCutLine({ points, parent = null, n = 1000, label = null } = {}) {
    checkPoints(points, 2, 'cut line');
    if (!(Number.isInteger(n) && n >= 2 && n <= 100000)) throw new Error('cut line: n must be an integer from 2 to 100000');
    const par = parent ?? this.defaultParent();
    this.dataset(par);
    const id = `cutline:${++this.dsSeq}`;
    const info = { id, kind: 'cutline', label: label ?? `Cut line ${this.dsSeq}`, section: this.sectionName, mesh: null, parent: par, points: points.map((p) => [p[0], p[1]]), n };
    this.extra.set(id, { info });
    return info;
  }

  addCutPoints({ points, parent = null, label = null } = {}) {
    checkPoints(points, 1, 'cut points');
    const par = parent ?? this.defaultParent();
    this.dataset(par);
    const id = `cutpoint:${++this.dsSeq}`;
    const info = { id, kind: 'cutpoint', label: label ?? `Cut point ${this.dsSeq}`, section: this.sectionName, mesh: null, parent: par, points: points.map((p) => [p[0], p[1]]) };
    this.extra.set(id, { info });
    return info;
  }

  removeDataset(id) { this.extra.delete(id); }
  defaultParent() { return this.es ? 'es' : this.families.has('opt') ? 'opt' : [...this.families.keys()][0]; }
  memory() {
    let storeBytes = 0;
    for (const r of this.meshes.values()) {
      storeBytes += bytesOf(r.mesh) + bytesOf(r.geo) + r.absArea.byteLength + (r.modes ?? []).reduce((s, md) => s + (md.x?.byteLength ?? 0) + (md.xIm?.byteLength ?? 0) + (md.psi?.byteLength ?? 0), 0);
      if (r.model?.dof) storeBytes += r.model.dof.td.byteLength + r.model.edges.triSign.byteLength + r.model.dead.byteLength;
    }
    if (this.es) storeBytes += this.es.phi.byteLength + (this.es.elem?.byteLength ?? 0) + this.es.epsTri.byteLength + bytesOf(this.es.raw.grad);
    return { cacheBytes: this.cache.bytes, cacheEntries: this.cache.map.size, storeBytes };
  }
  dispose() { this.disposed = true; this.cache.clear(); this.compiled.clear(); this.meshes.clear(); this.families.clear(); this.extra.clear(); this.es = null; }

  /** Variables evaluable on a dataset (names as written in expressions). */
  variables(datasetId) {
    const ds = this.dataset(datasetId);
    const out = [];
    out.push(varInfo('x', DIM.m, 'um', 'x coordinate', 'point', false, true, 'coordinates'), varInfo('y', DIM.m, 'um', 'y coordinate', 'point', false, true, 'coordinates'));
    for (const [n, , dim, d] of CONSTANTS) out.push(varInfo(n, dim, formatUnit(dim), d, 'global', false, true, 'constants'));
    if (this.lambdaUm) for (const [n, dim, du, d] of [['lambda0', DIM.m, 'nm', 'vacuum wavelength'], ['k0', DIM.perM, '1/um', 'vacuum wavenumber 2 pi / lambda0'], ['f0', DIM.Hz, 'THz', 'optical frequency c / lambda0']]) out.push(varInfo(n, dim, du, d, 'global', false, true, 'constants'));
    out.push(varInfo('i', DIM.one, '1', 'imaginary unit (also j)', 'global', true, true, 'constants'));
    for (const g of GLOBAL_VARIABLES) if (Object.hasOwn(this.globals, g.name)) out.push({ ...g });
    if (ds.extra?.info.kind === 'cutline') for (const [n, d] of [['t1x', 'unit tangent x of the line'], ['t1y', 'unit tangent y of the line']]) out.push(varInfo(n, DIM.one, '1', d, 'point', false, false, 'line'));
    if (ds.extra?.info.kind === 'cutline') out.push(varInfo('s', DIM.m, 'um', 'arc length along the line', 'point', false, true, 'line'));
    if (this.es) for (const [n, dim, du, d, cont, loc] of ES_VARS) out.push(varInfo(`es.${n}`, dim, du, d, loc ?? 'point', false, !!cont, 'es'));
    for (const [name, f] of this.families) {
      for (const v of this.familyVars(f.rec)) out.push(varInfo(`${name}.${v[0]}`, v[1], v[2], v[3], v[5] ?? 'point', !!v[6], !!v[4], name));
      for (const [n, dim, du, d] of MODE_GLOBALS) out.push(varInfo(`${name}.${n}`, dim, du, d, 'global', false, true, name));
    }
    if (this.es) for (const a of ['A', 'B']) {
      if (!this.families.has(`arm${a}`)) continue;
      for (const [n, dim, du, d] of EO_VARS) out.push(varInfo(`eo${a}.${n}`, dim, du, d, 'point', false, false, `eo${a}`));
    }
    if (this.es && ds.arm) for (const [n, dim, du, d] of EO_VARS) out.push(varInfo(`eo.${n}`, dim, du, d, 'point', false, false, 'eo'));
    if (this.rf && ds.kind === 'rf') for (const [n, dim, du, d] of RF_VARS) out.push(varInfo(`rf.${n}`, dim, du, d, 'point', n === 'Z0', true, 'rf'));
    return out;
  }

  familyVars(rec) {
    if (rec.kind === 'vector') return OPT_VECTOR_VARS;
    return [...OPT_SCALAR_VARS[rec.polarization], ...OPT_SCALAR_COMMON];
  }

  // ---- expression scope ----
  scope(ds, { line = false } = {}) {
    const self = this;
    return {
      resolve(name) { return self.resolveName(name, ds, line); },
      describe(name) {
        const p = name.includes('.') ? name.split('.')[0] : null;
        const names = self.variables(ds.extra ? ds.extra.info.id : ds.id).map((v) => v.name).filter((n) => (p ? n.startsWith(`${p}.`) : !n.includes('.')));
        return names.length ? ` (available${p ? ` with prefix ${p}.` : ''}: ${names.slice(0, 40).join(', ')}${names.length > 40 ? ', ...' : ''})` : '';
      },
    };
  }

  resolveName(name, ds, line) {
    if (this.disposed) throw new Error('solution store disposed');
    const c = resolveConstant(name, this.lambdaUm ? this.lambdaUm * 1e-6 : null);
    if (c) return c;
    if (name === 'x' || name === 'y') return { kind: 'field', key: name, dim: DIM.m, complex: false, continuous: true, mesh: null, get: (ps) => this.cached(name, ps, () => ({ re: scaled(this.coords(ps)[name], 1e-6), im: null })) };
    if (line && (name === 't1x' || name === 't1y' || name === 's')) return { kind: 'field', key: `line.${name}`, dim: name === 's' ? DIM.m : DIMLESS, complex: false, continuous: name === 's', mesh: null, get: (ps) => ({ re: ps.line[name], im: null }) };
    const g = GLOBAL_VARIABLES.find((q) => q.name === name);
    if (g) return Object.hasOwn(this.globals, name) ? { kind: 'const', re: this.globals[name], dim: g.dim, global: true } : null;
    const dot = name.indexOf('.');
    if (dot < 0) return null;
    const pre = name.slice(0, dot), v = name.slice(dot + 1);
    if (pre === 'es') return this.esVar(v);
    if (pre === 'rf') {
      if (!this.rf) return null;
      if (ds.kind !== 'rf') throw new ExpressionError(`'${name}': rf.* variables are evaluated on the rf dataset (one value per sweep frequency)`);
      return this.rfVar(v);
    }
    if (this.families.has(pre)) {
      const f = this.families.get(pre);
      const mode = ds.family && this.families.get(ds.family)?.rec === f.rec ? ds.mode : f.rec.selected;
      return this.optVar(f, mode, v);
    }
    if (pre === 'eo' || pre === 'eoA' || pre === 'eoB') {
      const arm = pre === 'eo' ? ds.arm : pre.slice(2);
      if (!arm) throw new ExpressionError(`'${name}': eo.* refers to the arm of an arm or EO dataset; use eoA.* or eoB.* here`);
      const f = this.families.get(`arm${arm}`);
      if (!f || !this.es) return null;
      const mode = ds.family === `arm${arm}` ? ds.mode : f.rec.selected;
      return this.eoVar(f, mode, v);
    }
    return null;
  }

  rfVar(v) {
    const def = RF_VARS.find((q) => q[0] === v);
    if (!def) return null;
    const rf = this.rf;
    const get = () => {
      const n = rf.fGhz.length, re = new Float64Array(n);
      let im = null;
      for (let i = 0; i < n; i++) {
        switch (v) {
          case 'f': re[i] = rf.fGhz[i] * 1e9; break;
          case 'alpha_dB': re[i] = rf.alphaDbPerCm[i] * 100; break;
          case 'alpha': re[i] = rf.alphaDbPerCm[i] * 100 * (Math.LN10 / 20); break;
          case 'nRF': re[i] = rf.nRf[i]; break;
          default: re[i] = rf.z0Re[i]; (im ??= new Float64Array(n))[i] = rf.z0Im[i];
        }
      }
      return { re, im };
    };
    return { kind: 'field', key: `rf.${v}`, dim: def[1], complex: v === 'Z0', continuous: true, mesh: null, get };
  }

  esVar(v) {
    const def = ES_VARS.find((q) => q[0] === v);
    if (!def || !this.es) return null;
    return { kind: 'field', key: `es.${v}`, dim: def[1], complex: false, continuous: !!def[4], mesh: 'es', get: (ps) => this.esValue(ps, v) };
  }

  optVar(f, mode, v) {
    const rec = f.rec;
    const md = rec.modes[mode];
    const mg = MODE_GLOBALS.find((q) => q[0] === v);
    if (mg) {
      const val = { neff: md.neff, ng: md.ng, beta: md.beta == null ? md.neff * 2 * Math.PI / (rec.lambdaUm * 1e-6) : md.beta * 1e6, alpha: md.betaIm ? -md.betaIm * 1e6 : 0, teFraction: md.teFraction, Aeff: md.aeffUm2 == null ? null : md.aeffUm2 * 1e-12 }[v];
      if (val == null || !Number.isFinite(val)) throw new ExpressionError(`'${f.name}.${v}' is not available for mode ${mode} of this ${rec.kind} solve`);
      return { kind: 'const', re: val, dim: mg[1] };
    }
    const def = this.familyVars(rec).find((q) => q[0] === v);
    if (!def) return null;
    return { kind: 'field', key: `${rec.id}#${mode}.${v}`, dim: def[1], complex: !!def[6], continuous: !!def[4], mesh: rec.id, get: (ps) => this.optValue(ps, rec, mode, v) };
  }

  eoVar(f, mode, v) {
    const def = EO_VARS.find((q) => q[0] === v);
    if (!def) return null;
    return { kind: 'field', key: `eo:${f.rec.id}#${mode}.${v}`, dim: def[1], complex: false, continuous: false, mesh: f.rec.id, meshes: ['es', f.rec.id], get: (ps) => this.eoValue(ps, f.rec, mode, v) };
  }

  compile(expr, ds, { line = false } = {}) {
    const key = `${ds.extra ? ds.extra.info.parent : ds.id}|${line ? 'L' : ''}|${expr}`;
    let c = this.compiled.get(key);
    if (!c) {
      c = compileExpression(expr, this.scope(ds, { line }));
      if (this.compiled.size > 256) this.compiled.clear();
      this.compiled.set(key, c);
    }
    return c;
  }

  // ---- point sets ----
  /** Structured point set on a mesh: kind node | centroid | corner | quad, optional element subset. */
  pointSet(meshId, kind, elems = null, elemKey = '') {
    const id = `${meshId}/${kind}/${elemKey}`;
    const hit = this.cache.get(`ps:${id}`);
    if (hit) return hit;
    const rec = this.meshes.get(meshId);
    let ps;
    if (kind === 'node') {
      const { tri: T, L, n } = this.nodeLocation(rec);
      ps = { id, meshId, kind, n, loc: { tri: T, L, n } };
    } else {
      const P = PATTERNS[kind];
      const nEl = elems ? elems.length : rec.nTris;
      ps = { id, meshId, kind, n: nEl * (P.length / 3), loc: { pattern: P, elems, nEl, n: nEl * (P.length / 3) } };
    }
    if (ps.n <= MAX_CACHED_POINTS) this.cache.set(`ps:${id}`, ps);
    return ps;
  }

  /** Arbitrary point set (um coordinates); optional line data {t1x, t1y, s, w}. */
  xyPointSet(x, y, extra = {}) {
    return { id: `xy${++this.seq}`, meshId: null, kind: 'xy', n: x.length, x, y, ...extra };
  }

  /** Point set of the P2 electrostatic DOFs (vertices first, then edge midpoints; fem.p2Space order). */
  p2DofPointSet() {
    const k = 'ps:es/p2dof/';
    const hit = this.cache.get(k);
    if (hit) return hit;
    if (!this.es || this.es.order !== 2) throw new Error("location 'p2nodes' needs a P2 electrostatic solution (dataset es, mesh.element_order 2)");
    const { elem } = this.es;
    const { mesh } = this.es.rec;
    let nDof = 0;
    for (let q = 0; q < elem.length; q++) if (elem[q] + 1 > nDof) nDof = elem[q] + 1;
    const T = new Int32Array(nDof).fill(-1), L = new Float64Array(3 * nDof), x = new Float64Array(nDof), y = new Float64Array(nDof);
    const P = PATTERNS.p2;
    for (let t = 0; t < mesh.nTris; t++) for (let a = 0; a < 6; a++) {
      const d = elem[6 * t + a];
      if (T[d] >= 0) continue;
      T[d] = t;
      const l0 = P[3 * a], l1 = P[3 * a + 1], l2 = P[3 * a + 2];
      L[3 * d] = l0; L[3 * d + 1] = l1; L[3 * d + 2] = l2;
      const i0 = mesh.tri[3 * t], i1 = mesh.tri[3 * t + 1], i2 = mesh.tri[3 * t + 2];
      x[d] = l0 * mesh.x[i0] + l1 * mesh.x[i1] + l2 * mesh.x[i2];
      y[d] = l0 * mesh.y[i0] + l1 * mesh.y[i1] + l2 * mesh.y[i2];
    }
    return this.cache.set(k, { id: 'es/p2dof/', meshId: 'es', kind: 'p2dof', n: nDof, loc: { tri: T, L, n: nDof }, x, y, elem });
  }

  /** Point set of the rf dataset (one point per sweep frequency; no coordinates). */
  rfPointSet() {
    return { id: 'rf', meshId: null, kind: 'rf', n: this.rf.fGhz.length };
  }

  nodeLocation(rec) {
    const k = `nodeloc:${rec.id}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const { tri, nTris } = rec.mesh;
    const n = rec.nNodes;
    const T = new Int32Array(n).fill(-1), L = new Float64Array(3 * n);
    for (let t = 0; t < nTris; t++) for (let a = 0; a < 3; a++) {
      const v = tri[3 * t + a];
      if (T[v] < 0) { T[v] = t; L[3 * v + a] = 1; }
    }
    return this.cache.set(k, { tri: T, L, n });
  }

  /** Coordinates (um) of a point set. */
  coords(ps) {
    if (ps.x) return { x: ps.x, y: ps.y };
    if (ps.kind === 'rf') throw new ExpressionError('the rf dataset has no coordinates; x, y and field variables are not defined on it');
    const k = `xy:${ps.id}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const rec = this.meshes.get(ps.meshId);
    const { x: X, y: Y, tri } = rec.mesh;
    const x = new Float64Array(ps.n), y = new Float64Array(ps.n);
    each(ps.loc, (i, t, l0, l1, l2) => {
      const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
      x[i] = l0 * X[a] + l1 * X[b] + l2 * X[c];
      y[i] = l0 * Y[a] + l1 * Y[b] + l2 * Y[c];
    });
    const out = { x, y };
    if (ps.n <= MAX_CACHED_POINTS) this.cache.set(k, out);
    return out;
  }

  locator(rec) {
    return (rec.locator ??= new WalkLocator(rec.mesh, rec.geo));
  }

  /** Location of the points of `ps` in mesh `meshId`: {tri, L, n} (tri -1 outside; -2-e inside electrode e, es only). */
  locate(ps, meshId) {
    if (ps.meshId === meshId) return ps.loc;
    const k = `loc:${ps.id}:${meshId}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const rec = this.meshes.get(meshId);
    const loc = this.locatePoints(rec, this.coords(ps));
    if (ps.n <= MAX_CACHED_POINTS) this.cache.set(k, loc);
    return loc;
  }

  locatePoints(rec, { x, y }) {
    const n = x.length;
    const T = new Int32Array(n), L = new Float64Array(3 * n);
    const lc = this.locator(rec);
    const { geo, mesh } = rec;
    for (let i = 0; i < n; i++) {
      const t = lc.find(x[i], y[i]);
      if (t < 0) {
        T[i] = -1;
        if (rec.kind === 'es') {
          const e = this.section.classify(x[i], y[i]).electrode;
          if (e >= 0) T[i] = -2 - e;
        }
        continue;
      }
      T[i] = t;
      const c = mesh.tri[3 * t + 2];
      const dx = x[i] - mesh.x[c], dy = y[i] - mesh.y[c];
      const l0 = geo.gx[3 * t] * dx + geo.gy[3 * t] * dy, l1 = geo.gx[3 * t + 1] * dx + geo.gy[3 * t + 1] * dy;
      L[3 * i] = l0; L[3 * i + 1] = l1; L[3 * i + 2] = 1 - l0 - l1;
    }
    return { tri: T, L, n };
  }

  // ---- variable values ----
  cached(key, ps, compute) {
    const k = `v:${ps.id}:${key}`;
    const hit = this.cache.get(k);
    if (hit) return hit;
    const v = compute();
    if (ps.n <= MAX_CACHED_POINTS) this.cache.set(k, v);
    return v;
  }

  esBundle(ps) {
    return this.cached('es', ps, () => {
      const loc = this.locate(ps, 'es');
      const { order, phi, elem, potentials } = this.es;
      const { mesh, geo } = this.es.rec;
      const n = ps.n;
      const V = new Float64Array(n), Ex = new Float64Array(n), Ey = new Float64Array(n), T = new Int32Array(n);
      const gx = geo.gx, gy = geo.gy, tri = mesh.tri;
      each(loc, (i, t, l0, l1, l2) => {
        T[i] = t;
        if (t < 0) {
          if (t === -1) { V[i] = NaN; Ex[i] = NaN; Ey[i] = NaN; } else V[i] = potentials[-2 - t];
          return;
        }
        const o = 3 * t;
        if (order === 2) {
          const e6 = 6 * t;
          const p0 = phi[elem[e6]], p1 = phi[elem[e6 + 1]], p2 = phi[elem[e6 + 2]], p3 = phi[elem[e6 + 3]], p4 = phi[elem[e6 + 4]], p5 = phi[elem[e6 + 5]];
          V[i] = l0 * (2 * l0 - 1) * p0 + l1 * (2 * l1 - 1) * p1 + l2 * (2 * l2 - 1) * p2 + 4 * (l0 * l1 * p3 + l1 * l2 * p4 + l2 * l0 * p5);
          const a0 = (4 * l0 - 1) * p0, a1 = (4 * l1 - 1) * p1, a2 = (4 * l2 - 1) * p2;
          const g0x = gx[o], g1x = gx[o + 1], g2x = gx[o + 2], g0y = gy[o], g1y = gy[o + 1], g2y = gy[o + 2];
          const dx = a0 * g0x + a1 * g1x + a2 * g2x + 4 * ((l0 * g1x + l1 * g0x) * p3 + (l1 * g2x + l2 * g1x) * p4 + (l2 * g0x + l0 * g2x) * p5);
          const dy = a0 * g0y + a1 * g1y + a2 * g2y + 4 * ((l0 * g1y + l1 * g0y) * p3 + (l1 * g2y + l2 * g1y) * p4 + (l2 * g0y + l0 * g2y) * p5);
          Ex[i] = -dx * 1e6;
          Ey[i] = -dy * 1e6;
        } else {
          const p0 = phi[tri[o]], p1 = phi[tri[o + 1]], p2 = phi[tri[o + 2]];
          V[i] = l0 * p0 + l1 * p1 + l2 * p2;
          Ex[i] = -(gx[o] * p0 + gx[o + 1] * p1 + gx[o + 2] * p2) * 1e6;
          Ey[i] = -(gy[o] * p0 + gy[o + 1] * p1 + gy[o + 2] * p2) * 1e6;
        }
      });
      return { V, Ex, Ey, T };
    });
  }

  esValue(ps, v) {
    return this.cached(`es.${v}`, ps, () => {
      const b = this.esBundle(ps);
      if (v === 'V' || v === 'Ex' || v === 'Ey') return { re: b[v], im: null };
      const n = ps.n, out = new Float64Array(n);
      const { epsTri } = this.es;
      const triRegion = this.es.rec.mesh.triRegion;
      for (let i = 0; i < n; i++) {
        const t = b.T[i];
        if (t === -1) { out[i] = NaN; continue; }
        const ex = b.Ex[i], ey = b.Ey[i];
        if (v === 'normE') { out[i] = Math.hypot(ex, ey); continue; }
        if (t < 0) { out[i] = v === 'region' ? NaN : 0; continue; } // inside an electrode: E = 0, no dielectric
        const exx = epsTri[3 * t], exy = epsTri[3 * t + 1], eyy = epsTri[3 * t + 2];
        switch (v) {
          case 'Dx': out[i] = EPS0 * (exx * ex + exy * ey); break;
          case 'Dy': out[i] = EPS0 * (exy * ex + eyy * ey); break;
          case 'We': out[i] = 0.5 * EPS0 * (ex * (exx * ex + exy * ey) + ey * (exy * ex + eyy * ey)); break;
          case 'epsxx': out[i] = exx; break;
          case 'epsyy': out[i] = eyy; break;
          case 'epsxy': out[i] = exy; break;
          case 'region': out[i] = triRegion[t]; break;
          default: out[i] = NaN;
        }
      }
      return { re: out, im: null };
    });
  }

  /** Optical bundle of a mode on a point set: vector {Ex..Hz re/im}, scalar {psi, comps}. */
  optBundle(ps, rec, mode) {
    return this.cached(`opt:${rec.id}#${mode}`, ps, () => {
      const loc = this.locate(ps, rec.id);
      return rec.kind === 'vector' ? vectorBundle(rec, rec.modes[mode], loc, ps.n) : scalarBundle(rec, rec.modes[mode], loc, ps.n);
    });
  }

  optValue(ps, rec, mode, v) {
    const b = this.optBundle(ps, rec, mode);
    if (b[v]) return b[v];
    return this.cached(`${rec.id}#${mode}.${v}`, ps, () => {
      const n = ps.n;
      const out = new Float64Array(n);
      if (v === 'nxx' || v === 'nyy' || v === 'nzz' || v === 'region') {
        const rd = this.regionData(rec);
        const k = { nxx: 0, nyy: 1, nzz: 2 }[v];
        const triRegion = rec.mesh.triRegion;
        for (let i = 0; i < n; i++) {
          const t = b.T[i];
          if (t < 0) { out[i] = NaN; continue; }
          const r = triRegion[t];
          out[i] = v === 'region' ? r : rd[r]?.n ? rd[r].n[k] : NaN;
        }
        return { re: out, im: null };
      }
      if (rec.kind === 'vector') {
        const { Ex, Ey, Ez, Hx, Hy, Hz } = b;
        const im = (c, i) => (c.im ? c.im[i] : 0);
        for (let i = 0; i < n; i++) {
          if (v === 'normE') out[i] = Math.sqrt(Ex.re[i] ** 2 + im(Ex, i) ** 2 + Ey.re[i] ** 2 + im(Ey, i) ** 2 + Ez.re[i] ** 2 + im(Ez, i) ** 2);
          else if (v === 'normH') out[i] = Math.sqrt(Hx.re[i] ** 2 + im(Hx, i) ** 2 + Hy.re[i] ** 2 + im(Hy, i) ** 2 + Hz.re[i] ** 2 + im(Hz, i) ** 2);
          else out[i] = 0.5 * (Ex.re[i] * Hy.re[i] + im(Ex, i) * im(Hy, i) - Ey.re[i] * Hx.re[i] - im(Ey, i) * im(Hx, i));
        }
        return { re: out, im: null };
      }
      throw new ExpressionError(`variable ${v} is not available for the scalar solver`);
    });
  }

  /** EO bundle of an arm mode on a point set. */
  eoBundle(ps, rec, mode) {
    return this.cached(`eo:${rec.id}#${mode}`, ps, () => {
      const es = this.esBundle(ps);
      const ob = this.optBundle(ps, rec, mode);
      const rd = this.regionData(rec);
      const md = rec.modes[mode];
      const n = ps.n;
      const mk = () => new Float64Array(n);
      const out = { dnxx: mk(), dnyy: mk(), dnzz: mk(), depsxy: mk(), Ec: mk(), integrand: mk() };
      for (const c of POCKELS_COMPONENTS) out[`integrand_${c}`] = mk();
      const triRegion = rec.mesh.triRegion;
      const comps = POCKELS_COMPONENTS;
      if (rec.kind === 'vector') {
        // integrand = Re[C (E_t . d . E_t - d_zz E_z^2)] x 1e12 per m^2, C = k0 beta / (2 s^2 x^T B x) (see md.eoConst)
        const C = md.eoConst;
        const { Ex, Ey, Ez } = ob;
        const zero = (c) => c.im ?? null;
        const exi = zero(Ex), eyi = zero(Ey), ezi = zero(Ez);
        for (let i = 0; i < n; i++) {
          const t = ob.T[i];
          if (t < 0 || es.T[i] === -1) { for (const k of Object.keys(out)) out[k][i] = NaN; continue; }
          const r = rd[triRegion[t]];
          const eo = r?.eo;
          if (!eo) continue;
          const sx = es.Ex[i], sy = es.Ey[i];
          if (eo.cInPlane) out.Ec[i] = sx * eo.cInPlane[0] + sy * eo.cInPlane[1];
          const M = eo.maps.all;
          const dxx = sx * M[0] + sy * M[4], dxy = sx * M[1] + sy * M[5], dyy = sx * M[2] + sy * M[6], dzz = sx * M[3] + sy * M[7];
          out.dnxx[i] = dxx / (2 * r.n[0]); out.dnyy[i] = dyy / (2 * r.n[1]); out.dnzz[i] = dzz / (2 * r.n[2]); out.depsxy[i] = dxy;
          const exr = Ex.re[i], exm = exi ? exi[i] : 0, eyr = Ey.re[i], eym = eyi ? eyi[i] : 0, ezr = Ez.re[i], ezm = ezi ? ezi[i] : 0;
          const xx2r = exr * exr - exm * exm, xx2i = 2 * exr * exm, yy2r = eyr * eyr - eym * eym, yy2i = 2 * eyr * eym;
          const xyr = exr * eyr - exm * eym, xyi = exr * eym + exm * eyr, zz2r = ezr * ezr - ezm * ezm, zz2i = 2 * ezr * ezm;
          const val = (Mm) => {
            const a = sx * Mm[0] + sy * Mm[4], b = sx * Mm[1] + sy * Mm[5], c = sx * Mm[2] + sy * Mm[6], d = sx * Mm[3] + sy * Mm[7];
            const fr = a * xx2r + 2 * b * xyr + c * yy2r - d * zz2r, fi = a * xx2i + 2 * b * xyi + c * yy2i - d * zz2i;
            return (C[0] * fr - C[1] * fi) * 1e12;
          };
          out.integrand[i] = val(M);
          for (const c of comps) if (eo.maps[c]) out[`integrand_${c}`][i] = val(eo.maps[c]);
        }
      } else {
        // scalar: element-wise centroid static field (engine sampling) x psi^2 x normalisation
        const prep = this.scalarEoPrep(rec, mode);
        const psi = ob.psi.re;
        for (let i = 0; i < n; i++) {
          const t = ob.T[i];
          if (t < 0 || es.T[i] === -1) { for (const k of Object.keys(out)) out[k][i] = NaN; continue; }
          if (md.excluded?.[t]) continue;
          const r = rd[triRegion[t]];
          const eo = r?.eo;
          if (!eo) continue;
          const sx = es.Ex[i], sy = es.Ey[i];
          if (eo.cInPlane) out.Ec[i] = sx * eo.cInPlane[0] + sy * eo.cInPlane[1];
          const M = eo.maps.all;
          out.dnxx[i] = (sx * M[0] + sy * M[4]) / (2 * r.n[0]); out.dnyy[i] = (sx * M[2] + sy * M[6]) / (2 * r.n[1]);
          out.dnzz[i] = (sx * M[3] + sy * M[7]) / (2 * r.n[2]); out.depsxy[i] = sx * M[1] + sy * M[5];
          const fx = prep.F[3 * t], fy = prep.F[3 * t + 1];
          const w = psi[i] * psi[i] * prep.factor[t] * 1e12;
          const val = (Mm) => (fx * Mm[prep.comp] + fy * Mm[4 + prep.comp]) * w;
          out.integrand[i] = val(M);
          for (const c of comps) if (eo.maps[c]) out[`integrand_${c}`][i] = val(eo.maps[c]);
        }
      }
      return out;
    });
  }

  scalarEoPrep(rec, mode) {
    rec.eoPrep ??= {};
    if (rec.eoPrep[mode]) return rec.eoPrep[mode];
    const md = rec.modes[mode];
    const te = rec.polarization === 'TE';
    const rd = this.regionData(rec);
    const F = sampleFieldOnOpticalMesh(this.es.raw, rec.model);
    const { mesh } = rec;
    const psi = md.psi;
    const nT = mesh.nTris;
    const factor = new Float64Array(nT);
    let den = 0;
    const I = new Float64Array(nT);
    for (let t = 0; t < nT; t++) {
      if (md.excluded?.[t]) continue;
      const r = rd[mesh.triRegion[t]];
      if (!r?.eps) continue;
      const a = psi[mesh.tri[3 * t]], b = psi[mesh.tri[3 * t + 1]], c = psi[mesh.tri[3 * t + 2]];
      I[t] = (rec.absArea[t] / 6) * (a * a + b * b + c * c + a * b + b * c + c * a);
      const n2 = r.eps[te ? 0 : 4];
      den += te ? I[t] : I[t] / n2;
    }
    for (let t = 0; t < nT; t++) {
      const r = rd[mesh.triRegion[t]];
      if (!r?.eps || md.excluded?.[t]) continue;
      const n2 = r.eps[te ? 0 : 4];
      factor[t] = te ? 1 / (2 * md.neff * den) : (md.neff / 2) / (n2 * n2 * den);
    }
    return (rec.eoPrep[mode] = { F, factor, comp: te ? 0 : 2, den });
  }

  eoValue(ps, rec, mode, v) {
    const b = this.eoBundle(ps, rec, mode);
    if (!b[v]) throw new ExpressionError(`unknown EO variable ${v}`);
    return { re: b[v], im: null };
  }

  /** Mesh ids whose fields an expression reads (for line splitting). */
  meshesOf(compiled) {
    const set = new Set();
    for (const r of compiled.fields.values()) {
      if (r.mesh) set.add(r.mesh);
      for (const m of r.meshes ?? []) set.add(m);
    }
    return [...set];
  }

  /** Evaluate a compiled expression on a point set: {re, im|null} arrays of length ps.n. */
  run(compiled, ps) {
    const ctx = { n: ps.n, get: (key) => compiled.fields.get(key).get(ps) };
    const v = compiled.run(ctx);
    if (v.s) return { re: new Float64Array(ps.n).fill(v.re), im: v.im !== 0 ? new Float64Array(ps.n).fill(v.im) : null };
    return v;
  }
}

/** A walk hit whose smallest barycentric coordinate is below this is treated as a possible tie (point on an edge). */
export const TIE_BARYCENTRIC = 1e-9;

/**
 * Deterministic point location (audit E1/E2). A walk across triangle neighbours from the previous hit finds a candidate
 * quickly; when the candidate's smallest barycentric coordinate is >= TIE_BARYCENTRIC the containing triangle is unique
 * and is returned. Otherwise (point on or within 1e-9 of an element edge or vertex, or the walk left the mesh) the
 * engine's grid locator decides (electrostatics.TriLocator.find: the lowest triangle index among triangles with
 * smallest barycentric >= -1e-12, else the best triangle within -1e-6). The result is therefore independent of the
 * query order and identical to the triangle the engine's own sampling (sampleStaticFieldQ, sampleFieldOnOpticalMesh)
 * uses for the same point.
 */
class WalkLocator {
  constructor(mesh, geo) {
    this.mesh = mesh;
    this.geo = geo;
    this.grid = new TriLocator(mesh, geo);
    const nT = mesh.nTris, tri = mesh.tri;
    // neighbour across local edge k (opposite vertex k): edge (k+1, k+2)
    const nb = new Int32Array(3 * nT).fill(-1);
    const keys = new Float64Array(3 * nT), idx = new Int32Array(3 * nT);
    const nN = mesh.nNodes;
    for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
      const a = tri[3 * t + ((k + 1) % 3)], b = tri[3 * t + ((k + 2) % 3)];
      keys[3 * t + k] = a < b ? a * nN + b : b * nN + a;
      idx[3 * t + k] = 3 * t + k;
    }
    idx.sort((p, q) => keys[p] - keys[q]);
    for (let j = 0; j + 1 < idx.length; j++) {
      const p = idx[j], q = idx[j + 1];
      if (keys[p] === keys[q]) { nb[p] = (q / 3) | 0; nb[q] = (p / 3) | 0; j++; }
    }
    this.nb = nb;
    this.last = -1;
  }
  find(px, py) {
    const { mesh, geo, nb } = this;
    let t = this.last;
    if (t >= 0) {
      for (let step = 0; step < 64; step++) {
        const o = 3 * t, c = mesh.tri[o + 2];
        const dx = px - mesh.x[c], dy = py - mesh.y[c];
        const l0 = geo.gx[o] * dx + geo.gy[o] * dy, l1 = geo.gx[o + 1] * dx + geo.gy[o + 1] * dy, l2 = 1 - l0 - l1;
        const m = Math.min(l0, l1, l2);
        if (m >= TIE_BARYCENTRIC) { this.last = t; return t; }
        if (m >= -1e-12) break; // tie candidate: the grid locator decides
        const k = m === l0 ? 0 : m === l1 ? 1 : 2;
        const nt = nb[o + k];
        if (nt < 0) break;
        t = nt;
      }
    }
    const f = this.grid.find(px, py);
    if (f >= 0) this.last = f;
    return f;
  }
}

function checkPoints(points, min, what) {
  if (!Array.isArray(points) || points.length < min) throw new Error(`${what}: expected at least ${min} point(s) [x_um, y_um]`);
  for (const p of points) if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) throw new Error(`${what}: every point must be [x_um, y_um] with finite numbers`);
}

function scaled(a, f) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * f;
  return out;
}

// ---- mode records and field kernels ------------------------------------------------------------------------------

/** Vector mode: power-normalised complex scale (|integral of S_z| = 1 W) and the EO integrand constant. */
function vectorModeRec(md, k, model) {
  const s0 = md.amplitudeScale ?? [1, 0];
  const p = md.powerW;
  const s = [s0[0] / Math.sqrt(p), s0[1] / Math.sqrt(p)];
  const beta = [md.beta, md.betaIm ?? 0];
  const lambdaUm = (2 * Math.PI) / (md.beta / md.neff);
  const k0 = (2 * Math.PI) / lambdaUm;
  // C = k0 beta / (2 s^2 x^T B x)
  const s2 = [s[0] * s[0] - s[1] * s[1], 2 * s[0] * s[1]];
  const xBx = [md.xBx, md.xBxIm ?? 0];
  const den = [2 * (s2[0] * xBx[0] - s2[1] * xBx[1]), 2 * (s2[0] * xBx[1] + s2[1] * xBx[0])];
  const dd = den[0] * den[0] + den[1] * den[1];
  const num = [k0 * beta[0], k0 * beta[1]];
  const eoConst = [(num[0] * den[0] + num[1] * den[1]) / dd, (num[1] * den[0] - num[0] * den[1]) / dd];
  return {
    k, neff: md.neff, ng: md.ng, beta: md.beta, betaIm: md.betaIm ?? 0, theta: md.theta, x: md.x, xIm: md.xIm ?? null, scale: s, k0,
    teFraction: md.teFraction, aeffUm2: md.effectiveAreaUm2 ?? null, confinement: md.confinement, lossDbPerCm: md.lossDbPerCm ?? null,
    residual: md.residual ?? null, eoConst, lossy: !!md.lossy, order: model.order,
  };
}

function scalarModeRec(md, k, model, solved) {
  const psi = md.psi[k];
  const neff = md.neff[k];
  const te = model.polarization === 'TE';
  // power normalisation: TE P = n_eff / (2 eta0) a^2 int psi^2 dA; TM P = n_eff eta0 / 2 a^2 int psi^2 / n_yy^2 dA
  const { mesh, geo } = model;
  let s = 0;
  for (let t = 0; t < mesh.nTris; t++) {
    if (md.excluded?.[t]) continue;
    const a = psi[mesh.tri[3 * t]], b = psi[mesh.tri[3 * t + 1]], c = psi[mesh.tri[3 * t + 2]];
    const it = (Math.abs(geo.area[t]) / 6) * (a * a + b * b + c * c + a * b + b * c + c * a) * 1e-12;
    s += te ? it : it / md.n2[t];
  }
  const amp = te ? Math.sqrt((2 * ETA0) / (neff * s)) : Math.sqrt(2 / (neff * ETA0 * s));
  return {
    k, neff, ng: k === solved.diagnostics.modeIndex ? solved.ng ?? null : null, beta: null, betaIm: 0, psi, amp, n2: md.n2, excluded: md.excluded,
    teFraction: null, aeffUm2: null, confinement: scalarConfinement(model, md, psi, te), lossDbPerCm: null,
    residual: md.residual?.[k] ?? null, converged: Array.isArray(md.modeConverged) ? md.modeConverged[k] : null,
  };
}

function scalarConfinement(model, md, psi, te) {
  const { mesh, geo } = model;
  const acc = new Float64Array(model.regions.length);
  let tot = 0;
  for (let t = 0; t < mesh.nTris; t++) {
    if (md.excluded?.[t]) continue;
    const a = psi[mesh.tri[3 * t]], b = psi[mesh.tri[3 * t + 1]], c = psi[mesh.tri[3 * t + 2]];
    let w = (Math.abs(geo.area[t]) / 6) * (a * a + b * b + c * c + a * b + b * c + c * a);
    if (!te) w /= md.n2[t];
    acc[mesh.triRegion[t]] += w;
    tot += w;
  }
  const out = {};
  model.regions.forEach((r, i) => { if (acc[i] !== 0) out[r.name] = { power: acc[i] / tot }; });
  return out;
}

function vectorBundle(rec, md, loc, n) {
  const { evalBasis, gatherLocal, pointFields, newBasisBuffers, newPoint } = VECTOR_KERNELS;
  const model = rec.model;
  const nloc = model.dof.nloc;
  const cr = new Float64Array(nloc), ci = new Float64Array(nloc);
  const B = newBasisBuffers(model.order), P = newPoint();
  const mk = () => new Float64Array(n);
  const ExR = mk(), ExI = mk(), EyR = mk(), EyI = mk(), EzR = mk(), EzI = mk(), HxR = mk(), HxI = mk(), HyR = mk(), HyI = mk(), HzR = mk(), HzI = mk();
  const T = new Int32Array(n);
  const [sr, si] = md.scale;
  const b2 = md.beta * md.beta + md.betaIm * md.betaIm;
  const sbr = (sr * md.beta + si * md.betaIm) / b2, sbi = (si * md.beta - sr * md.betaIm) / b2; // s / beta
  const hk = 1 / (md.k0 * ETA0);
  const L = [0, 0, 0];
  let last = -1;
  each(loc, (i, t, l0, l1, l2) => {
    T[i] = t;
    if (t < 0) { ExR[i] = ExI[i] = EyR[i] = EyI[i] = EzR[i] = EzI[i] = HxR[i] = HxI[i] = HyR[i] = HyI[i] = HzR[i] = HzI[i] = NaN; return; }
    if (t !== last) { gatherLocal(model, md.x, md.xIm, t, cr, ci); last = t; }
    L[0] = l0; L[1] = l1; L[2] = l2;
    evalBasis(model.order, model.geo, model.edges, t, L, B);
    pointFields(model, B, cr, ci, P);
    const et = P.et, ep = P.etp, ez = P.ez, cu = P.curl;
    ExR[i] = sbr * et[0] - sbi * et[1]; ExI[i] = sbr * et[1] + sbi * et[0];
    EyR[i] = sbr * et[2] - sbi * et[3]; EyI[i] = sbr * et[3] + sbi * et[2];
    // E_z = j s e_z
    const zr = sr * ez[0] - si * ez[1], zi = sr * ez[1] + si * ez[0];
    EzR[i] = -zi; EzI[i] = zr;
    // H_t = s (z x e_t') / (k0 eta0): (H_x, H_y) = s (-e'_y, e'_x) hk
    HxR[i] = -(sr * ep[2] - si * ep[3]) * hk; HxI[i] = -(sr * ep[3] + si * ep[2]) * hk;
    HyR[i] = (sr * ep[0] - si * ep[1]) * hk; HyI[i] = (sr * ep[1] + si * ep[0]) * hk;
    // H_z = j (s / beta) curl hk
    const cr2 = (sbr * cu[0] - sbi * cu[1]) * hk, ci2 = (sbr * cu[1] + sbi * cu[0]) * hk;
    HzR[i] = -ci2; HzI[i] = cr2;
  });
  const lossless = !md.lossy && md.betaIm === 0 && si === 0;
  const c = (re, im, realOnly) => ({ re, im: realOnly ? null : im });
  return {
    T, Ex: c(ExR, ExI, lossless), Ey: c(EyR, EyI, lossless), Ez: { re: lossless ? zeroLike(EzR) : EzR, im: EzI },
    Hx: c(HxR, HxI, lossless), Hy: c(HyR, HyI, lossless), Hz: { re: lossless ? zeroLike(HzR) : HzR, im: HzI },
  };
}

/** Zero array of the same length, keeping NaN markers of points outside the mesh. */
function zeroLike(a) {
  const out = new Float64Array(a.length);
  for (let i = 0; i < a.length; i++) if (Number.isNaN(a[i])) out[i] = NaN;
  return out;
}

function scalarBundle(rec, md, loc, n) {
  const { tri } = rec.mesh;
  const psi = md.psi;
  const P = new Float64Array(n), T = new Int32Array(n);
  each(loc, (i, t, l0, l1, l2) => {
    T[i] = t;
    if (t < 0) { P[i] = NaN; return; }
    P[i] = l0 * psi[tri[3 * t]] + l1 * psi[tri[3 * t + 1]] + l2 * psi[tri[3 * t + 2]];
  });
  const a = md.amp;
  const A = scaled(P, a);
  const out = { T, psi: { re: P, im: null } };
  if (rec.polarization === 'TE') {
    const Hy = scaled(A, md.neff / ETA0);
    const normE = new Float64Array(n), Sz = new Float64Array(n);
    for (let i = 0; i < n; i++) { normE[i] = Math.abs(A[i]); Sz[i] = (md.neff * A[i] * A[i]) / (2 * ETA0); }
    Object.assign(out, { Ex: { re: A, im: null }, Hy: { re: Hy, im: null }, normE: { re: normE, im: null }, Sz: { re: Sz, im: null }, I: { re: Sz, im: null } });
  } else {
    const Ey = new Float64Array(n), normE = new Float64Array(n), Sz = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const t = T[i];
      if (t < 0) { Ey[i] = normE[i] = Sz[i] = NaN; continue; }
      const n2 = md.n2[t];
      Ey[i] = n2 > 0 ? (-md.neff * ETA0 * A[i]) / n2 : 0;
      normE[i] = Math.abs(Ey[i]);
      Sz[i] = n2 > 0 ? (md.neff * ETA0 * A[i] * A[i]) / (2 * n2) : 0;
    }
    Object.assign(out, { Hx: { re: A, im: null }, Ey: { re: Ey, im: null }, normE: { re: normE, im: null }, Sz: { re: Sz, im: null }, I: { re: Sz, im: null } });
  }
  return out;
}

export { each as forEachPoint, armElectrodeGap };
