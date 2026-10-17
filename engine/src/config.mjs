// Shared browser/CLI input boundary. Physical inputs are never silently filled in.
// Numerical meshing defaults are documented in sims/SPEC.md. GPL-3.0-or-later.
import { semiconductorOptions, dopingAt } from './semi/config.mjs';
import { parseDocument } from 'yaml';
import { rectToPolygon, polygonArea, distPointPolygon } from './geometry.mjs';
import { resolveMaterial, MATERIAL_LIBRARY, libraryIndex } from './materials.mjs';
import { resolveParams, substituteExpressions } from './params.mjs';
import { expandTemplate } from './templates.mjs';
import { normalizeWeights } from './electrostatics.mjs';
import { CrossSection } from './section.mjs';

export const MAX_VERTICES = 80000;
export const STAGES = ['electrostatics', 'optical_mode', 'eo_overlap', 'rf_line', 'loaded_line', 'eo_response', 'semiconductor'];
/** Stages runCrossSection can execute (all STAGES since DevLog-036; semiconductor since DevLog-039 round 2, run alone). */
export const IMPLEMENTED_STAGES = ['electrostatics', 'optical_mode', 'eo_overlap', 'rf_line', 'loaded_line', 'eo_response', 'semiconductor'];
/** Frequency-response target metrics (eo_response stage, DevLog-036). */
export const RESPONSE_METRICS = ['eo_rolloff_db', 'bw3db_ghz', 'bw6db_ghz'];
export const TARGET_METRICS = ['vpi_l_dc_vcm', 'vpi_dc_v', 'n_eff', 'ng_opt', 'n_rf', 'z0_ohm', 'c_pul_pf_per_m', 'c0_pul_pf_per_m', 'l_pul_nh_per_m', 'rf_loss_db_per_cm', 'eo_rolloff_db', 'bw3db_ghz', 'bw6db_ghz', 'optical_confinement_in_region'];
/** data/schema/devices.schema.yaml vpi_convention enum (copied, not imported: the engine has no data/ dependency). */
export const VPI_CONVENTIONS = ['per_arm_phase_shifter', 'mzm_push_pull', 'mzm_series_push_pull', 'mzm_differential', 'mzm_single_arm', 'resonance_tuning_derived', 'unspecified'];
export const VPI_METRICS = ['vpi_l_dc_vcm', 'vpi_dc_v'];
export const ARM_DRIVES = ['single_arm', 'two_arm_field_resolved'];
export const TERMINAL_DRIVES = ['single_ended', 'differential'];
export const CONDUCTOR_LOSS_MODELS = ['none', 'rprime_reference', 'skin_effect_geometry_factor', 'skin_effect_perimeter', 'skin_effect_wheeler', 'from_paper_alpha'];
export const DIELECTRIC_LOSS_MODELS = ['none', 'tan_delta_regions'];
export const MAX_SWEEP_POINTS = 4001;
/** Metrics whose frequency-specific (at_ghz) targets the rf_line stage evaluates. */
export const RF_FREQUENCY_METRICS = ['rf_loss_db_per_cm', 'n_rf', 'z0_ohm'];
const OPTICS_KEYS = ['wavelength_nm', 'polarization', 'mode_index', 'group_index_from', 'ng_fixed', 'eo_axis', 'metal_in_window', 'eo', 'solver', 'vector_order', 'metal_permittivity', 'mode_select', 'max_metal_power_fraction', 'num_modes'];
/** Optical solver switch: vector (default since DevLog-026 round 5, audit F1) or the approximate scalar FEM. */
export const OPTICAL_SOLVERS = ['scalar', 'vector'];
export const DEFAULT_OPTICAL_SOLVER = 'vector';
export const VECTOR_SOLVER_AVAILABLE = true;
/** Group index methods: perturbation (default, one eigen solve), finite_difference_wavelength (+-delta solves), fixed. */
export const GROUP_INDEX_METHODS = ['perturbation', 'finite_difference_wavelength', 'fixed'];
/** Metal-in-window policies. Scalar: reject | absent | pec_scalar. Vector: reject | absent | pec | lossy (pec_scalar maps to pec). */
export const METAL_POLICIES_ALL = ['reject', 'absent', 'pec_scalar', 'pec', 'lossy'];
/** Electrostatic element orders (mesh.element_order): 1 = P1, 2 = P2 Lagrange (DevLog-024 S3.9). */
export const ELEMENT_ORDERS = [1, 2];
/** Default electrostatic element order when mesh.element_order is absent (decision and evidence: DevLog-026 round 2). */
export const DEFAULT_ELEMENT_ORDER = 2;
/** Electrostatic mesh-scale factor applied with P2 (mesh.p2_mesh_factor; DevLog-026 round 5, audit F4). P1 uses 1. */
export const DEFAULT_P2_MESH_FACTOR = 2;
const LINE_KEYS = ['length_mm', 'conductor_loss_model', 'dielectric_loss_model', 'include_internal_inductance', 'r_pul_ref_ohm_per_m', 'r_pul_ref_ghz',
  'conductor_k_per_m', 'perimeters_cover_carrying_surfaces', 'rf_loss_table', 'rf_loss_law', 'source_ohm', 'load_ohm', 'differential', 'loading',
  'conductor_thickness_model', 'rf_section'];
/** line.conductor_thickness_model (DevLog-036 round 2, S2); semi_infinite is the round-1 surface-resistance model. */
export const CONDUCTOR_THICKNESS_MODELS = ['semi_infinite', 'slab_one_sided', 'slab_symmetric'];
/** line.loading.response_model for periodic lines (DevLog-036 round 2, S5). */
export const PERIODIC_RESPONSE_MODELS = ['exact_cascade', 'bloch_homogenised'];
/** Target `reference` values (data/schema bw_reference subset without a frequency; numeric references use reference_ghz). */
export const TARGET_REFERENCES = ['dc', 'low_freq_unstated', 'unspecified'];
const POCKELS_KEYS = ['r13', 'r22', 'r33', 'r51', 'voigt'];
/** Material keys read by the solver boundary (Q2 M4: a typo such as r_pm_per_V must not silently drop a tensor). */
const MATERIAL_KEYS = ['conductor', 'eps_r', 'n', 'n_o', 'n_e', 'sigma_Sm', 'crystal', 'r_pm_per_v', 'tan_delta_rf', 'dispersion', 'thickness_um', 'n_complex'];
/** Target keys (Q2 M4: a typo such as at_GHz must not turn a frequency target into a static one). `source` stays open. */
const TARGET_KEYS = ['metric', 'value', 'tol_abs', 'tol_rel', 'at_ghz', 'vpi_convention', 'reference_ghz', 'reference', 'source'];

/** Never expanded as expressions (audit A13): metadata and free-text blocks at the top level, and free-text keys at any depth. */
export const FREE_TEXT_TOP_LEVEL = ['schema', 'id', 'title', 'paper_id', 'device_id', 'repro_grade', 'validation_status', 'chain', 'params', 'study', 'studies', 'provenance', 'missing', 'limitations', 'reported_curves'];
export const FREE_TEXT_KEYS = ['source', 'note', 'notes', 'description', 'locator', 'citation', 'name', 'material', 'role'];
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const object = (v, p) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p, 'expected an object');
  return v;
};
const number = (v, p, positive = false) => {
  if (typeof v !== 'number' || !Number.isFinite(v) || (positive && v <= 0)) fail(p, `expected a finite ${positive ? 'positive ' : ''}number`);
  return v;
};
const oneOf = (v, options, p) => {
  if (!options.includes(v)) fail(p, `expected one of ${options.join(', ')}`);
  return v;
};
const interval = (v, p) => {
  if (!Array.isArray(v) || v.length !== 2) fail(p, 'expected [min, max]');
  v.forEach((x) => number(x, p));
  if (v[1] <= v[0]) fail(p, 'max must exceed min');
  return [...v];
};
const keys = (v, allowed, p) => {
  object(v, p);
  for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${p}.${k}`, 'unsupported field');
};
const array = (v, p) => {
  if (!Array.isArray(v)) fail(p, 'expected an array');
  return v;
};
const window = (v, p) => {
  keys(v, ['x_um', 'y_um'], p);
  return { x: interval(v.x_um, `${p}.x_um`), y: interval(v.y_um, `${p}.y_um`) };
};

function shape(v, p) {
  if (!!v.rect === !!v.polygon_um) fail(p, 'provide exactly one of rect or polygon_um');
  if (v.rect) {
    const r = window(v.rect, `${p}.rect`);
    return rectToPolygon(r.x, r.y);
  }
  if (!Array.isArray(v.polygon_um) || v.polygon_um.length < 3) fail(p, 'polygon requires at least three points');
  const poly = v.polygon_um.map((pt) => {
    if (!Array.isArray(pt) || pt.length !== 2) fail(p, 'polygon point must be [x, y]');
    return pt.map((x) => number(x, p));
  });
  const area2 = poly.reduce((a, q, i) => { const r = poly[(i + 1) % poly.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0);
  if (Math.abs(area2) < 1e-12) fail(p, 'polygon has zero area');
  return poly;
}

export function normalizeGeometry(raw, materials, path = 'geometry', { allowNoElectrodes = false } = {}) {
  keys(raw, ['symmetry', 'mirror_x_um', 'domain', 'regions', 'electrodes', 'optical_window', 'mesh', 'boundary'], path);
  const domain = window(raw.domain, `${path}.domain`);
  const symmetry = oneOf(raw.symmetry ?? 'none', ['none', 'x_mirror_odd', 'x_mirror_even'], `${path}.symmetry`);
  const mirror = number(raw.mirror_x_um ?? 0, `${path}.mirror_x_um`);
  if (symmetry !== 'none' && (mirror < domain.x[0] || mirror > domain.x[1])) fail(path, 'mirror plane must meet the domain');
  const entities = (rows, kind) => {
    // S8 (DevLog-039 round 2): a semiconductor-only cross-section may have no metal (bare-face segment contacts)
    if (kind === 'electrodes' && allowNoElectrodes && Array.isArray(rows) && !rows.length) return [];
    if (!Array.isArray(rows) || !rows.length) fail(`${path}.${kind}`, 'expected a non-empty array');
    const names = new Set();
    return rows.map((r, i) => {
      const p = `${path}.${kind}[${i}]`;
      object(r, p);
      if (typeof r.name !== 'string' || !r.name || names.has(r.name)) fail(p, 'name must be non-empty and unique');
      names.add(r.name);
      if (!Object.hasOwn(materials, r.material)) fail(p, `unknown material ${r.material}`);
      if (kind === 'regions' && materials[r.material].conductor) fail(p, 'conductors must be electrodes');
      if (kind === 'electrodes' && !materials[r.material].conductor) fail(p, 'electrode material must be a conductor');
      return { ...r, poly: shape(r, p), ...(kind === 'electrodes' ? { weight: number(r.weight, `${p}.weight`) } : {}) };
    });
  };
  const mesh = { ...object(raw.mesh ?? {}, `${path}.mesh`) };
  keys(mesh, ['max_edge_um', 'electrode_edge_um', 'electrode_face_um', 'window_edge_um', 'far_edge_um', 'min_edge_um', 'grade', 'grade_far', 'grade_corner', 'min_angle_bound', 'max_vertices', 'regions', 'element_order', 'p2_mesh_factor'], `${path}.mesh`);
  for (const [k, v] of Object.entries(mesh)) {
    if (k === 'regions') { Object.values(object(v, `${path}.mesh.regions`)).forEach((x) => number(x, `${path}.mesh.regions`, true)); }
    else number(v, `${path}.mesh.${k}`, true);
  }
  // Explicit resource ceiling for an interactive solve; never silently coarsen the mesh.
  mesh.max_vertices ??= MAX_VERTICES;
  if (!Number.isInteger(mesh.max_vertices) || mesh.max_vertices < 4 || mesh.max_vertices > MAX_VERTICES) fail(`${path}.mesh.max_vertices`, `expected an integer from 4 to ${MAX_VERTICES}`);
  if (mesh.element_order != null && !ELEMENT_ORDERS.includes(mesh.element_order)) fail(`${path}.mesh.element_order`, 'expected 1 (P1) or 2 (P2)');
  if (mesh.p2_mesh_factor != null && !(mesh.p2_mesh_factor >= 0.5 && mesh.p2_mesh_factor <= 4)) fail(`${path}.mesh.p2_mesh_factor`, 'expected a number from 0.5 to 4');
  if (mesh.min_angle_bound != null && mesh.min_angle_bound < 1) fail(`${path}.mesh.min_angle_bound`, 'radius/edge bound must be at least 1');
  const boundary = { left: 'neumann', right: 'neumann', top: 'neumann', bottom: 'neumann', ...object(raw.boundary ?? {}, `${path}.boundary`) };
  keys(boundary, ['left', 'right', 'top', 'bottom'], `${path}.boundary`);
  Object.entries(boundary).forEach(([k, v]) => oneOf(v, ['neumann', 'dirichlet'], `${path}.boundary.${k}`));
  const optical_window = raw.optical_window ? window(raw.optical_window, `${path}.optical_window`) : null;
  if (optical_window && ['x', 'y'].some((k) => optical_window[k][0] < domain[k][0] || optical_window[k][1] > domain[k][1])) fail(path, 'optical_window must lie within the domain');
  const regions = entities(raw.regions, 'regions');
  const electrodes = entities(raw.electrodes, 'electrodes');
  if (electrodes.length) normalizeWeights(electrodes, symmetry);
  for (const name of Object.keys(mesh.regions ?? {})) if (!regions.some(r => r.name === name)) fail(`${path}.mesh.regions`, `unknown region ${name}`);
  return { domain, symmetry, mirror_x_um: mirror, regions, electrodes, optical_window, mesh, boundary };
}

function readDocument(text) {
  if (typeof text !== 'string' || text.length > 1000000) fail('config', 'expected YAML text of at most 1,000,000 characters');
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`YAML: ${doc.errors.map((e) => e.message).join('; ')}`);
  return doc.toJS({ maxAliasCount: 100 });
}

/**
 * Strict solver input. `params` overrides replace parameter values before expressions and templates are expanded.
 * @param {string} text
 * @param {{params?: Record<string, number>}} [options]
 */
export function parseConfig(text, { params = {} } = {}) {
  const expanded = expandConfig(readDocument(text), { params });
  return { ...normalizeConfig(expanded.raw), ...expanded.meta };
}

// ---- expansion: params, expressions, template, material library (DevLog-026) -----------------------------------

/**
 * Expand a parsed YAML document into the plain config the validators consume: resolve `params` (with overrides),
 * substitute every `=expr` string, generate `geometry` (and EO arm windows) from `template`, and merge library
 * material constants. The input object is not modified.
 * @returns {{raw:any, meta:{source:any, params:{values:Record<string,number>, defs:any}, substitutions:any[], template:any, materialSources:Record<string, any>}}}
 */
export function expandConfig(source, { params: overrides = {} } = {}) {
  object(source, 'config');
  const { values, defs } = resolveParams(source.params, overrides);
  const units = Object.fromEntries(Object.entries(defs).map(([k, d]) => [k, d.unit]));
  const { tree: raw, substitutions } = substituteExpressions(source, values, units, { skip: FREE_TEXT_TOP_LEVEL, skipKeys: FREE_TEXT_KEYS });
  let template = null;
  if (raw.template != null) {
    if (raw.geometry != null) fail('template', 'give either template or geometry, not both (the template generates geometry)');
    const out = expandTemplate(raw.template);
    raw.geometry = out.geometry;
    template = { type: raw.template.type, arms: out.arms, armWindows: out.armWindows, summary: out.summary };
    const eo = raw.optics?.eo;
    if (eo != null && typeof eo === 'object' && !Array.isArray(eo)) {
      const want = out.arms === 'push_pull' ? 'two_arm_field_resolved' : 'single_arm';
      if (eo.arm_drive != null && eo.arm_drive !== want) fail('optics.eo.arm_drive', `${eo.arm_drive} does not match template arms ${out.arms} (expected ${want})`);
      if (eo.arm_windows == null) raw.optics = { ...raw.optics, eo: { ...eo, arm_windows: out.armWindows.B ? { A: out.armWindows.A, B: out.armWindows.B } : { A: out.armWindows.A } } };
    }
  }
  const materialSources = Object.create(null);
  if (raw.materials != null && typeof raw.materials === 'object' && !Array.isArray(raw.materials)) {
    const merged = {};
    for (const [name, m] of Object.entries(raw.materials)) {
      if (m && typeof m === 'object' && !Array.isArray(m) && m.library != null) {
        const r = libraryMaterial(name, m);
        merged[name] = r.material;
        materialSources[name] = r.source;
      } else merged[name] = m;
    }
    raw.materials = merged;
  }
  return { raw, meta: { source, params: { values, defs }, substitutions, template, materialSources } };
}

const LIBRARY_FIELDS = ['eps_r', 'r_pm_per_v', 'sigma_Sm'];

/** Merge a library entry under the config keys (config wins; eps_r {perp, par} and named r_pm_per_v merge one level). */
function libraryMaterial(name, m) {
  const p = `materials.${name}.library`;
  const key = m.library;
  if (typeof key !== 'string' || !Object.hasOwn(MATERIAL_LIBRARY.library ?? {}, key)) fail(p, `unknown library key ${key} (available: ${Object.keys(MATERIAL_LIBRARY.library ?? {}).join(', ')})`);
  const lib = MATERIAL_LIBRARY.library[key];
  const { library: _drop, ...cfg } = m;
  const out = {};
  const fromLibrary = [];
  const overridden = [];
  const citations = {};
  if (lib.conductor) out.conductor = true;
  if (lib.dispersion && cfg.dispersion == null) { out.dispersion = lib.dispersion; fromLibrary.push('dispersion'); }
  if (lib.conductor && cfg.conductor === false) fail(p, `${key} is a conductor`);
  Object.assign(out, cfg);
  for (const f of LIBRARY_FIELDS) {
    const entry = lib[f];
    if (!entry) continue;
    const v = entry.value;
    const c = cfg[f];
    const mergeable = v && typeof v === 'object' && c && typeof c === 'object' && !Array.isArray(c) && !(f === 'r_pm_per_v' && c.voigt != null);
    if (c == null) { out[f] = structuredClone(v); fromLibrary.push(f); }
    else if (mergeable) {
      out[f] = { ...v, ...c };
      fromLibrary.push(...Object.keys(v).filter((k) => !Object.hasOwn(c, k)).map((k) => `${f}.${k}`));
      overridden.push(...Object.keys(c).filter((k) => Object.hasOwn(v, k)).map((k) => `${f}.${k}`));
    } else overridden.push(f);
    citations[f] = { source: entry.source_read, locator: entry.locator, condition: entry.condition, verification: entry.verification, primaryCited: entry.primary_cited ?? null };
  }
  // Round-6 audit G4: report the merged values themselves, so additions (e.g. r13/r22 next to a paper r33) are visible.
  const addedFromLibrary = Object.fromEntries(fromLibrary.map((f) => [f, f.split('.').reduce((o, k) => o?.[k], out)]));
  return { material: out, source: { library: key, provenanceClass: 'standard_reference', fromLibrary, addedFromLibrary, overridden, citations } };
}

function validateMetadata(raw) {
  object(raw, 'config');
  if (raw.schema !== 'eo-atlas.sim/v1') fail('schema', 'expected eo-atlas.sim/v1');
  if (typeof raw.id !== 'string' || !raw.id) fail('id', 'expected a non-empty string');
  for (const key of ['title', 'paper_id', 'device_id']) if (raw[key] != null && typeof raw[key] !== 'string') fail(key, 'expected a string');
  if (raw.chain != null) array(raw.chain, 'chain').forEach((s, i) => oneOf(s, STAGES, `chain[${i}]`));
  if (raw.repro_grade != null) oneOf(raw.repro_grade, ['A', 'B'], 'repro_grade');
  if (raw.validation_status != null) oneOf(raw.validation_status, ['unvalidated', 'analytic_gates_pass', 'literature_regression', 'cross_solver'], 'validation_status');
  if (raw.missing != null) array(raw.missing, 'missing');
  if (raw.limitations != null) array(raw.limitations, 'limitations').forEach(v => { if (typeof v !== 'string') fail('limitations', 'expected strings'); });
  if (raw.provenance != null) for (const [key, p] of Object.entries(object(raw.provenance, 'provenance'))) {
    object(p, `provenance.${key}`);
    oneOf(p.class, ['paper_exact', 'figure_digitized', 'project_inference', 'standard_reference', 'unknown'], `provenance.${key}.class`);
  }
}

function materialDeclarations(raw) {
  const materials = object(raw.materials, 'materials');
  for (const [name, m] of Object.entries(materials)) {
    const p = `materials.${name}`;
    object(m, p);
    if (m.conductor != null && typeof m.conductor !== 'boolean') fail(`${p}.conductor`, 'expected a boolean');
  }
  return materials;
}

function normalizeGeometries(raw, materials) {
  const geometries = Object.create(null);
  const gopt = { allowNoElectrodes: raw.semiconductor != null };
  geometries.geometry = normalizeGeometry(raw.geometry, materials, 'geometry', gopt);
  for (const [name, g] of Object.entries(object(raw.alt_geometries ?? {}, 'alt_geometries'))) {
    if (name === 'geometry' || name === '__proto__') fail('alt_geometries', 'reserved geometry name');
    geometries[name] = normalizeGeometry(g, materials, `alt_geometries.${name}`, gopt);
  }
  return geometries;
}

// A geometric preview is not a solver input. It supplies no material constants,
// resolves no library materials and never changes the raw document or its status.
// Invalid metadata/geometry still throws; physics errors are returned separately.
export function inspectConfig(text, section = 'geometry', { params = {}, solver = null } = {}) {
  const expanded = expandConfig(readDocument(text), { params });
  const raw = expanded.raw;
  validateMetadata(raw);
  const preview = { raw, geometries: normalizeGeometries(raw, materialDeclarations(raw)), ...expanded.meta };
  let solveError = '';
  let stages = null;
  let semi = null;
  const hasSemiconductor = raw.semiconductor != null;
  try {
    const config = { ...normalizeConfig(raw), ...expanded.meta };
    stages = stageErrors(config, section, { solver });
    if (hasSemiconductor) semi = semiconductorStageErrors(config, section);
  } catch (e) { solveError = e instanceof Error ? e.message : String(e); }
  // When the input boundary fails, every stage is blocked by that same error.
  if (!stages) stages = Object.fromEntries(STAGES.map((s) => [s, IMPLEMENTED_STAGES.includes(s) ? solveError : `${s} is not implemented in this engine`]));
  if (hasSemiconductor && !semi) semi = { optical_mode: solveError, eo_response: solveError };
  // DevLog-043: input of stage-compat.mjs stageCompatibility (readiness of both run paths for this section)
  const g = preview.geometries?.[section];
  const stageContext = { hasSemiconductor, semiSection: !!g && semiconductorSection(raw, g), topology: lineTopology(raw), readiness: stages, semiReadiness: semi };
  return { preview, solveError, stageErrors: stages, stageContext };
}

export function normalizeConfig(raw) {
  validateMetadata(raw);
  const materials = Object.create(null);
  for (const [name, m] of Object.entries(materialDeclarations(raw))) {
    const p = `materials.${name}`;
    keys(m, MATERIAL_KEYS, p);
    if (!m.conductor) {
      const e = m.eps_r;
      if (typeof e === 'number') number(e, `${p}.eps_r`, true);
      else if (e?.perp !== undefined && e?.par !== undefined) { keys(e, ['perp', 'par'], `${p}.eps_r`); number(e.perp, `${p}.eps_r.perp`, true); number(e.par, `${p}.eps_r.par`, true); }
      else if (e?.xx !== undefined && e?.yy !== undefined && e?.zz !== undefined) { keys(e, ['xx', 'yy', 'zz'], `${p}.eps_r`); Object.values(e).forEach((v) => number(v, `${p}.eps_r`, true)); }
      else fail(`${p}.eps_r`, 'RF permittivity is required; unknown is not vacuum');
    }
    for (const k of ['n', 'n_o', 'n_e', 'sigma_Sm']) if (m[k] != null) number(m[k], `${p}.${k}`, true);
    if ((m.n_o != null) !== (m.n_e != null)) fail(p, 'n_o and n_e must be provided together');
    if (m.n != null && m.n_o != null) fail(p, 'provide either n or n_o/n_e, not both');
    materialPhysics(m, p);
    materials[name] = resolveMaterial(name, m);
  }
  const geometries = normalizeGeometries(raw, materials);
  if (raw.optics != null) opticalOptions(raw);
  if (raw.line != null) {
    keys(raw.line, LINE_KEYS, 'line');
    if (raw.line.differential != null && typeof raw.line.differential !== 'boolean') fail('line.differential', 'expected a boolean');
    lineFields(raw.line);
    // DevLog-039 round 3: electrode cross-section of the junction-loaded TWE response (semiconductor + eo_response)
    if (raw.line.rf_section != null && (typeof raw.line.rf_section !== 'string' || !Object.hasOwn(geometries, raw.line.rf_section))) fail('line.rf_section', 'must name an existing cross-section (geometry or alt_geometries)');
    const loading = raw.line.loading;
    if (loading != null) {
      object(loading, 'line.loading');
      oneOf(loading.type, ['none', 'periodic_t_rail'], 'line.loading.type');
      if (loading.type === 'periodic_t_rail') {
        number(loading.period_um, 'line.loading.period_um', true);
        number(loading.loaded_length_um, 'line.loading.loaded_length_um', true);
        if (loading.response_model != null) oneOf(loading.response_model, PERIODIC_RESPONSE_MODELS, 'line.loading.response_model');
        if (loading.loaded_length_um > loading.period_um) fail('line.loading.loaded_length_um', 'cannot exceed the period');
        for (const k of ['loaded_cross_section', 'unloaded_cross_section']) {
          const name = k === 'loaded_cross_section' ? loading[k] ?? 'geometry' : loading[k];
          if (typeof name !== 'string' || !Object.hasOwn(geometries, name)) fail(`line.loading.${k}`, 'must reference an existing cross-section');
        }
      }
    }
  }
  if (raw.optics?.eo != null) eoOptions(raw, geometries);
  if (raw.sweep != null) sweepFrequencies(raw.sweep);
  for (const [i, t] of array(raw.targets ?? [], 'targets').entries()) validateTarget(t, `targets[${i}]`);
  if (raw.study != null || raw.studies != null) {
    // Structure of study blocks is validated by sweep.mjs studyOf(); here only their container types.
    if (raw.study != null) object(raw.study, 'study');
    if (raw.studies != null) object(raw.studies, 'studies');
  }
  return { raw, materials, geometries };
}

/** One paper target (config `targets` and study `sweep_targets` without their `at`). */
export function validateTarget(t, p) {
  keys(t, TARGET_KEYS, p);
  number(t.value, `${p}.value`);
  oneOf(t.metric, TARGET_METRICS, `${p}.metric`);
  if (t.vpi_convention != null) {
    if (!VPI_METRICS.includes(t.metric)) fail(`${p}.vpi_convention`, `only meaningful for ${VPI_METRICS.join(', ')}`);
    oneOf(t.vpi_convention, VPI_CONVENTIONS, `${p}.vpi_convention`);
  }
  if (t.source != null) {
    object(t.source, `${p}.source`);
    if (t.source.comparable != null && typeof t.source.comparable !== 'boolean') fail(`${p}.source.comparable`, 'expected a boolean');
  }
  if (t.at_ghz != null) number(t.at_ghz, `${p}.at_ghz`, true);
  if (t.metric === 'eo_rolloff_db' && t.at_ghz == null) fail(`${p}.at_ghz`, 'eo_rolloff_db needs the frequency of the roll-off (at_ghz)');
  if (['bw3db_ghz', 'bw6db_ghz'].includes(t.metric) && t.at_ghz != null) fail(`${p}.at_ghz`, `${t.metric} is a frequency; at_ghz is not meaningful`);
  if (t.reference_ghz != null) {
    if (!RESPONSE_METRICS.includes(t.metric)) fail(`${p}.reference_ghz`, `only meaningful for ${RESPONSE_METRICS.join(', ')}`);
    number(t.reference_ghz, `${p}.reference_ghz`, true);
    if (t.metric === 'eo_rolloff_db' && !(t.reference_ghz < t.at_ghz)) fail(`${p}.reference_ghz`, 'must lie below at_ghz');
  }
  if (t.reference != null) {
    if (!RESPONSE_METRICS.includes(t.metric)) fail(`${p}.reference`, `only meaningful for ${RESPONSE_METRICS.join(', ')}`);
    oneOf(t.reference, TARGET_REFERENCES, `${p}.reference`);
    if (t.reference_ghz != null) fail(`${p}.reference`, 'give either reference (dc, low_freq_unstated, unspecified) or reference_ghz, not both');
  }
  if (t.tol_abs == null && t.tol_rel == null) fail(p, 'tolerance is required');
  for (const k of ['tol_abs', 'tol_rel']) if (t[k] != null && number(t[k], `${p}.${k}`) < 0) fail(p, 'tolerance cannot be negative');
  if (!Number.isFinite(Math.max(t.tol_abs ?? 0, Math.abs(t.value) * (t.tol_rel ?? 0)))) fail(p, 'tolerance must remain finite');
}

/**
 * Validated optical inputs. `override.solver` (run option) replaces `optics.solver`.
 * @returns {{polarization:string, lambda0Um:number, modeIndex:number, metal:string, solver:'scalar'|'vector',
 *   vectorOrder:1|2, groupIndex:'perturbation'|'finite_difference_wavelength'|'fixed', metalPermittivity:Record<string,[number,number]>|null}}
 */
/** Upper bound of optics.num_modes / the numModes run option (DevLog-031). */
export const MAX_NUM_MODES = 24;

export function opticalOptions(raw, override = {}) {
  const o = object(raw.optics, 'optics');
  keys(o, OPTICS_KEYS, 'optics');
  if (o.eo_axis != null) oneOf(o.eo_axis, ['auto'], 'optics.eo_axis');
  number(o.wavelength_nm, 'optics.wavelength_nm', true);
  const polarization = oneOf(o.polarization, ['TE', 'TM', 'quasi-TE', 'quasi-TM'], 'optics.polarization').replace('quasi-', '');
  const modeIndex = number(o.mode_index ?? 0, 'optics.mode_index');
  if (!Number.isInteger(modeIndex) || modeIndex < 0 || modeIndex > 4) fail('optics.mode_index', 'expected an integer from 0 to 4');
  const groupIndex = oneOf(o.group_index_from ?? 'perturbation', GROUP_INDEX_METHODS, 'optics.group_index_from');
  if (groupIndex === 'fixed') number(o.ng_fixed, 'optics.ng_fixed', true);
  const solver = oneOf(override.solver ?? o.solver ?? DEFAULT_OPTICAL_SOLVER, OPTICAL_SOLVERS, override.solver != null ? 'solver (run option)' : 'optics.solver');
  if (solver === 'vector' && !VECTOR_SOLVER_AVAILABLE) fail('optics.solver', 'the full-vector mode solver is not available');
  let metal = o.metal_in_window === undefined ? 'reject' : oneOf(o.metal_in_window, METAL_POLICIES_ALL, 'optics.metal_in_window');
  if (solver === 'scalar' && (metal === 'pec' || metal === 'lossy')) fail('optics.metal_in_window', `${metal} needs optics.solver: vector (the scalar solver offers reject, absent, pec_scalar)`);
  if (solver === 'vector' && metal === 'pec_scalar') metal = 'pec';
  const vectorOrder = o.vector_order == null ? 2 : oneOf(o.vector_order, [1, 2], 'optics.vector_order');
  let metalPermittivity = null;
  if (o.metal_permittivity != null && metal !== 'lossy') fail('optics.metal_permittivity', 'only used with metal_in_window: lossy');
  if (o.metal_permittivity != null) {
    object(o.metal_permittivity, 'optics.metal_permittivity');
    metalPermittivity = {};
    for (const [m, v] of Object.entries(o.metal_permittivity)) {
      const p = `optics.metal_permittivity.${m}`;
      if (!Array.isArray(v) || v.length !== 2) fail(p, "expected [eps', eps''] (relative permittivity eps = eps' - j eps'' at the optical wavelength)");
      v.forEach((x) => number(x, p));
      if (v[1] < 0) fail(p, "eps'' must be >= 0 (passive metal)");
      // A metal permittivity is a physical input: it needs a sourced provenance entry (no default exists).
      const pr = raw.provenance?.[p] ?? raw.provenance?.['optics.metal_permittivity'];
      if (!pr || !(pr.locator || pr.citation)) fail(p, 'needs a provenance entry with a locator or citation (no metal permittivity is defaulted)');
      metalPermittivity[m] = [v[0], v[1]];
    }
  }
  if (metal === 'lossy') {
    if (solver !== 'vector') fail('optics.metal_in_window', 'lossy needs optics.solver: vector');
    if (!metalPermittivity) fail('optics.metal_permittivity', 'metal_in_window: lossy needs a sourced optical permittivity per metal');
  }
  let modeSelect = null;
  if (o.mode_select != null) {
    keys(o.mode_select, ['by', 'region'], 'optics.mode_select');
    const by = oneOf(o.mode_select.by, ['te_fraction', 'confinement'], 'optics.mode_select.by');
    if (solver !== 'vector' && by !== 'te_fraction') fail('optics.mode_select.by', 'confinement selection needs optics.solver: vector');
    if (by === 'confinement' && (typeof o.mode_select.region !== 'string' || !o.mode_select.region)) fail('optics.mode_select.region', 'a region name is required for by: confinement');
    if (by === 'te_fraction' && o.mode_select.region != null) fail('optics.mode_select.region', 'only used with by: confinement');
    modeSelect = { by, ...(by === 'confinement' ? { region: o.mode_select.region } : {}) };
  }
  let maxMetalPowerFraction = null;
  if (o.max_metal_power_fraction != null) {
    if (metal !== 'lossy') fail('optics.max_metal_power_fraction', 'only used with metal_in_window: lossy');
    maxMetalPowerFraction = number(o.max_metal_power_fraction, 'optics.max_metal_power_fraction', true);
    if (maxMetalPowerFraction > 1) fail('optics.max_metal_power_fraction', 'expected a fraction in (0, 1]');
  }
  // DevLog-031: compute at least this many modes per optical solve (mode table); the selection rule is unchanged.
  const nmRaw = override.numModes ?? o.num_modes ?? null;
  let numModes = null;
  if (nmRaw != null) {
    if (!Number.isInteger(nmRaw) || nmRaw < 1 || nmRaw > MAX_NUM_MODES) fail(override.numModes != null ? 'numModes (run option)' : 'optics.num_modes', `expected an integer from 1 to ${MAX_NUM_MODES}`);
    numModes = nmRaw;
  }
  return { polarization, lambda0Um: o.wavelength_nm / 1000, modeIndex, metal, solver, vectorOrder, groupIndex, metalPermittivity, modeSelect, maxMetalPowerFraction, numModes };
}

/**
 * Audit F3 (round 5): the scalar TM overlap keeps only H_x / d eps_yy and drops E_z (d eps_zz = r13 E) and the hybrid
 * E_x content (r33, r51); on the K4 geometry it is 35 % low in |dn|. TM EO runs therefore need the vector solver.
 */
export function checkEoSolver(opts) {
  if (opts.solver === 'scalar' && opts.polarization === 'TM')
    fail('optics.solver', 'eo_overlap with polarization TM needs optics.solver: vector (the scalar TM overlap omits E_z and the shear/hybrid Pockels terms; about -35 % in dn on the K4 geometry, audit F3)');
}

// ---- material physics fields (crystal frame, Pockels, RF loss) ------------------------------------------------

function materialPhysics(m, p) {
  if (m.crystal != null) {
    keys(m.crystal, ['cut', 'propagation', 'rotation_deg'], `${p}.crystal`);
    if (m.crystal.rotation_deg != null) number(m.crystal.rotation_deg, `${p}.crystal.rotation_deg`);
  }
  if (m.r_pm_per_v != null) {
    keys(m.r_pm_per_v, POCKELS_KEYS, `${p}.r_pm_per_v`);
    if (m.r_pm_per_v.voigt != null) {
      if (Object.keys(m.r_pm_per_v).length !== 1) fail(`${p}.r_pm_per_v`, 'give either the 6x3 voigt matrix or named coefficients, not both');
      const v = array(m.r_pm_per_v.voigt, `${p}.r_pm_per_v.voigt`);
      if (v.length !== 6 || v.some((row) => !Array.isArray(row) || row.length !== 3)) fail(`${p}.r_pm_per_v.voigt`, 'expected a 6x3 array (pm/V)');
      v.flat().forEach((x) => number(x, `${p}.r_pm_per_v.voigt`));
    } else for (const [k, v] of Object.entries(m.r_pm_per_v)) number(v, `${p}.r_pm_per_v.${k}`);
  }
  if (m.tan_delta_rf != null) {
    if (m.conductor) fail(`${p}.tan_delta_rf`, 'not meaningful for a conductor');
    if (number(m.tan_delta_rf, `${p}.tan_delta_rf`) < 0) fail(`${p}.tan_delta_rf`, 'expected a finite number >= 0');
  }
  if (!m.conductor && m.sigma_Sm != null) {
    // Dielectric conduction loss: tan delta(f) = sigma / (omega eps0 eps_r); needs one scalar permittivity.
    if (m.tan_delta_rf != null) fail(p, 'give either tan_delta_rf or a dielectric sigma_Sm, not both');
    if (typeof m.eps_r !== 'number') fail(`${p}.sigma_Sm`, 'dielectric conduction loss requires a scalar eps_r');
  }
}

// ---- EO overlap stage inputs ----------------------------------------------------------------------------------

const overlaps = (a, b) => a.x[0] < b.x[1] && b.x[0] < a.x[1] && a.y[0] < b.y[1] && b.y[0] < a.y[1];

/**
 * Validated `optics.eo` block: explicit arm windows, arm drive and terminal drive (label only).
 * Required only when the eo_overlap stage is requested; validated whenever present.
 */
export function eoOptions(raw, geometries) {
  if (raw.optics == null) fail('optics', 'the eo_overlap stage requires an optics block');
  const eo = raw.optics.eo;
  if (eo == null) fail('optics.eo', 'the eo_overlap stage requires explicit arm_drive, terminal_drive and arm_windows (no arm is inferred)');
  keys(eo, ['arm_drive', 'terminal_drive', 'arm_windows'], 'optics.eo');
  const armDrive = oneOf(eo.arm_drive, ARM_DRIVES, 'optics.eo.arm_drive');
  const terminalDrive = oneOf(eo.terminal_drive, TERMINAL_DRIVES, 'optics.eo.terminal_drive');
  if (typeof raw.line?.differential === 'boolean' && raw.line.differential !== (terminalDrive === 'differential'))
    fail('optics.eo.terminal_drive', `${terminalDrive} contradicts line.differential: ${raw.line.differential}`);
  keys(eo.arm_windows, ['A', 'B'], 'optics.eo.arm_windows');
  if (eo.arm_windows.A == null) fail('optics.eo.arm_windows.A', 'arm A window is required');
  const A = window(eo.arm_windows.A, 'optics.eo.arm_windows.A');
  let B = null;
  if (armDrive === 'single_arm' && eo.arm_windows.B != null) fail('optics.eo.arm_windows.B', 'single_arm drive takes arm A only');
  if (armDrive === 'two_arm_field_resolved') {
    if (eo.arm_windows.B == null) fail('optics.eo.arm_windows.B', 'two_arm_field_resolved requires an arm B window');
    B = window(eo.arm_windows.B, 'optics.eo.arm_windows.B');
    if (overlaps(A, B)) fail('optics.eo.arm_windows', 'arm windows A and B overlap');
  }
  const domain = geometries?.geometry?.domain;
  if (domain) for (const [k, w] of [['A', A], ['B', B]]) {
    if (w && ['x', 'y'].some((d) => w[d][0] < domain[d][0] || w[d][1] > domain[d][1])) fail(`optics.eo.arm_windows.${k}`, 'must lie within the geometry domain');
  }
  return { armDrive, terminalDrive, windows: { A, B } };
}

/** EO arm windows a config declares ([] without `optics.eo`); every electrostatic mesh of the config refines them (Q2 N1). */
export function armWindowsOf(config) {
  if (config.raw.optics?.eo == null) return [];
  const { windows } = eoOptions(config.raw, config.geometries);
  return [windows.A, windows.B].filter(Boolean);
}

/** Cross-section `name` of a parsed config, with the EO arm windows as electrostatic refinement sources. */
export function crossSectionOf(config, name) {
  return new CrossSection(config.geometries[name], name, { refineWindows: armWindowsOf(config) });
}

/**
 * Arm windows against the selected cross-section: inside its full domain and inside the solved half when a mirror
 * symmetry crops the electrostatics. Shared by readiness and the run (Q2 M6), so both report the same error.
 * @param {{windows:{A:any, B:any}}} eo validated eoOptions()
 * @param {CrossSection} section
 */
export function checkArmWindows(eo, section) {
  const full = section.fullRect;
  const solved = section.rect;
  for (const name of ['A', 'B']) {
    const w = eo.windows[name];
    if (!w) continue;
    if (w.x[0] < full.x0 || w.x[1] > full.x1 || w.y[0] < full.y0 || w.y[1] > full.y1) fail(`optics.eo.arm_windows.${name}`, `outside the domain of cross-section ${section.name}`);
    if (w.x[0] < solved.x0 || w.x[1] > solved.x1) fail(`optics.eo.arm_windows.${name}`, `outside the solved half-domain of cross-section ${section.name} (mirror symmetry crops the electrostatic solve); field-resolved arms need symmetry: none or both arms on the solved side`);
  }
}

// ---- RF line stage inputs -------------------------------------------------------------------------------------

const MODEL_FIELDS = {
  rprime_reference: ['r_pul_ref_ohm_per_m', 'r_pul_ref_ghz', 'include_internal_inductance'],
  skin_effect_geometry_factor: ['conductor_k_per_m', 'include_internal_inductance'],
  skin_effect_perimeter: ['perimeters_cover_carrying_surfaces', 'include_internal_inductance'],
  skin_effect_wheeler: ['include_internal_inductance'],
  from_paper_alpha: ['rf_loss_table', 'rf_loss_law'],
};

function paperTable(t, p) {
  if (!Array.isArray(t) || t.length < 2) fail(p, 'expected at least two {f_ghz, alpha_db_per_cm} rows');
  return t.map((row, i) => {
    keys(row, ['f_ghz', 'alpha_db_per_cm'], `${p}[${i}]`);
    const f = number(row.f_ghz, `${p}[${i}].f_ghz`, true);
    const a = number(row.alpha_db_per_cm, `${p}[${i}].alpha_db_per_cm`);
    if (a < 0) fail(`${p}[${i}].alpha_db_per_cm`, 'attenuation is a positive loss (>= 0)');
    if (i > 0 && !(f > t[i - 1].f_ghz)) fail(p, 'f_ghz must be strictly increasing');
    return { f, a };
  });
}

/** Parse-time checks of the line block: types and model/field consistency of what is present. */
function lineFields(line) {
  if (line.length_mm != null) number(line.length_mm, 'line.length_mm', true);
  for (const k of ['source_ohm', 'load_ohm']) if (line[k] != null) number(line[k], `line.${k}`, true);
  const cm = line.conductor_loss_model == null ? null : oneOf(line.conductor_loss_model, CONDUCTOR_LOSS_MODELS, 'line.conductor_loss_model');
  if (line.dielectric_loss_model != null) oneOf(line.dielectric_loss_model, DIELECTRIC_LOSS_MODELS, 'line.dielectric_loss_model');
  for (const k of ['include_internal_inductance', 'perimeters_cover_carrying_surfaces']) if (line[k] != null && typeof line[k] !== 'boolean') fail(`line.${k}`, 'expected a boolean');
  if (line.r_pul_ref_ohm_per_m != null && number(line.r_pul_ref_ohm_per_m, 'line.r_pul_ref_ohm_per_m') < 0) fail('line.r_pul_ref_ohm_per_m', 'expected a finite number >= 0');
  if (line.r_pul_ref_ghz != null) number(line.r_pul_ref_ghz, 'line.r_pul_ref_ghz', true);
  if (line.conductor_k_per_m != null) number(line.conductor_k_per_m, 'line.conductor_k_per_m', true);
  if (line.rf_loss_table != null) paperTable(line.rf_loss_table, 'line.rf_loss_table');
  if (line.rf_loss_law != null) {
    keys(line.rf_loss_law, ['alpha0_db_per_cm_per_sqrt_ghz'], 'line.rf_loss_law');
    number(line.rf_loss_law.alpha0_db_per_cm_per_sqrt_ghz, 'line.rf_loss_law.alpha0_db_per_cm_per_sqrt_ghz', true);
  }
  // A model-specific field under another model would be silently ignored: reject it.
  for (const [model, fields] of Object.entries(MODEL_FIELDS)) for (const f of fields) {
    if (line[f] == null || f === 'include_internal_inductance') continue;
    if (cm !== model) fail(`line.${f}`, `only used by conductor_loss_model: ${model}`);
  }
  if (line.include_internal_inductance != null && !['rprime_reference', 'skin_effect_geometry_factor', 'skin_effect_perimeter', 'skin_effect_wheeler'].includes(cm))
    fail('line.include_internal_inductance', 'only used by the rprime_reference and skin_effect_* conductor models');
  if (cm === 'from_paper_alpha' && line.dielectric_loss_model != null) fail('line.dielectric_loss_model', 'from_paper_alpha is a total-attenuation input; a dielectric model would double count loss');
  if (line.rf_loss_table != null && line.rf_loss_law != null) fail('line', 'give either rf_loss_table or rf_loss_law, not both');
  if (line.conductor_thickness_model != null) {
    oneOf(line.conductor_thickness_model, CONDUCTOR_THICKNESS_MODELS, 'line.conductor_thickness_model');
    if (!['skin_effect_geometry_factor', 'skin_effect_perimeter', 'skin_effect_wheeler'].includes(cm)) fail('line.conductor_thickness_model', 'only used by the skin_effect_* conductor models');
  }
}

/** Validated sweep frequencies in GHz (inclusive linear grid). */
export function sweepFrequencies(sweep) {
  keys(sweep, ['f_start_ghz', 'f_stop_ghz', 'n_points'], 'sweep');
  const a = number(sweep.f_start_ghz, 'sweep.f_start_ghz', true);
  const b = number(sweep.f_stop_ghz, 'sweep.f_stop_ghz', true);
  const n = number(sweep.n_points, 'sweep.n_points');
  if (!Number.isInteger(n) || n < 1 || n > MAX_SWEEP_POINTS) fail('sweep.n_points', `expected an integer from 1 to ${MAX_SWEEP_POINTS}`);
  if (n === 1 ? b !== a : !(b > a)) fail('sweep', n === 1 ? 'a single point needs f_stop_ghz = f_start_ghz' : 'f_stop_ghz must exceed f_start_ghz');
  return n === 1 ? [a] : Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

const citationOf = (raw, key) => {
  const pr = raw.provenance?.[key];
  const text = [pr?.locator, pr?.citation].filter((v) => typeof v === 'string' && v.trim()).join('; ');
  if (!text) fail(`provenance.${key}`, 'a paper attenuation input needs a provenance locator or citation');
  return `${pr.class}: ${text}`;
};

/**
 * Complete RF-loss declaration for the rf_line stage (stage-time check; no loss is ever defaulted).
 * Resolves conductor conductivity from the section electrodes and the dielectric loss of every region material.
 * @returns {{conductorModel:string, dielectricModel:string|null, conductor:any, dielectricLoss:Record<string, any>|null,
 *   paper:any, sweepGhz:number[]|null, thicknessUm:number|null}}
 */
export function rfOptions(raw, materials, geometry, sectionName = 'geometry', { allowLoadedCut = false } = {}) {
  const line = raw.line;
  if (line == null) fail('line', 'the rf_line stage requires a line block');
  const loading = line.loading;
  // Q2 C2: the loaded cut of a T-rail line holds conductors (the T pads) that carry no line current in the 2D section;
  // a uniform-line L', R' and loss of that cut are not meaningful, and the Wheeler recess would treat the pads as
  // current-carrying surfaces. Blocked until the loaded_line stage exists.
  // allowLoadedCut: the loaded_line stage reads the loss declaration of the loaded cut for its own section model.
  if (!allowLoadedCut && loading?.type === 'periodic_t_rail' && sectionName === (loading.loaded_cross_section ?? 'geometry'))
    fail('rf_line', `cross-section ${sectionName} is the loaded cut of a periodic_t_rail line; its T-rail conductors carry no line current in a 2D section, so a uniform-line model of it is not meaningful. Run rf_line on the unloaded cross-section (${loading.unloaded_cross_section}); the loaded line is the loaded_line stage`);
  const cm = line.conductor_loss_model;
  if (cm == null) fail('line.conductor_loss_model', 'required for rf_line; unknown conductor loss is not zero (declare none explicitly)');
  const sweepGhz = raw.sweep == null ? null : sweepFrequencies(raw.sweep);
  if (cm === 'from_paper_alpha') {
    if (line.rf_loss_table == null && line.rf_loss_law == null) fail('line', 'from_paper_alpha requires rf_loss_table or rf_loss_law');
    const paper = line.rf_loss_table != null
      ? { source: 'paper_table', citation: citationOf(raw, 'line.rf_loss_table'), fGhz: line.rf_loss_table.map((r) => r.f_ghz), alphaDbPerCm: line.rf_loss_table.map((r) => r.alpha_db_per_cm) }
      : { source: 'paper_law', citation: citationOf(raw, 'line.rf_loss_law'), alpha0DbPerCmPerSqrtGhz: line.rf_loss_law.alpha0_db_per_cm_per_sqrt_ghz };
    if (sweepGhz && paper.source === 'paper_table' && (sweepGhz[0] < paper.fGhz[0] || sweepGhz.at(-1) > paper.fGhz.at(-1)))
      fail('sweep', `the paper attenuation table covers ${paper.fGhz[0]}-${paper.fGhz.at(-1)} GHz; no extrapolation`);
    return { conductorModel: cm, dielectricModel: null, conductor: null, dielectricLoss: null, paper, sweepGhz, thicknessUm: null };
  }
  const dm = line.dielectric_loss_model;
  if (dm == null) fail('line.dielectric_loss_model', 'required for rf_line; unknown dielectric loss is not zero (declare none explicitly)');
  let conductor = { model: 'none' };
  let thicknessUm = null;
  if (cm !== 'none') {
    if (typeof line.include_internal_inductance !== 'boolean') fail('line.include_internal_inductance', `required (explicit boolean) by ${cm}`);
    const internal = line.include_internal_inductance;
    if (cm === 'rprime_reference') {
      if (line.r_pul_ref_ohm_per_m == null || line.r_pul_ref_ghz == null) fail('line', 'rprime_reference requires r_pul_ref_ohm_per_m and r_pul_ref_ghz');
      conductor = { model: 'rprime_reference', rPulRefOhmPerM: line.r_pul_ref_ohm_per_m, fRefHz: line.r_pul_ref_ghz * 1e9, includeInternalInductance: internal };
    } else {
      const sigmas = [...new Set(geometry.electrodes.map((e) => materials[e.material].sigmaS))];
      if (sigmas.includes(null)) fail('materials', `${cm} requires sigma_Sm for every electrode material (no conductivity default)`);
      if (sigmas.length !== 1) fail('materials', `${cm} needs one conductivity for all electrodes; got ${sigmas.join(', ')} S/m`);
      // Skin-depth validity check uses the smallest electrode bounding-box dimension (a geometric input, labelled).
      thicknessUm = Math.min(...geometry.electrodes.map((e) => {
        const xs = e.poly.map((q) => q[0]), ys = e.poly.map((q) => q[1]);
        return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      }));
      const base = { sigmaSm: sigmas[0], thicknessM: thicknessUm * 1e-6, includeInternalInductance: internal, thicknessModel: line.conductor_thickness_model ?? 'semi_infinite' };
      if (cm === 'skin_effect_wheeler') {
        // Reference frequency of the recessed solves: the highest requested frequency (smallest skin depth); R' then scales
        // with R_s. A numerical choice derived from the inputs, not a physical constant.
        // Targets marked comparable: false are never evaluated and do not set it (Q2 M1).
        const freqs = [...(sweepGhz ?? []), ...(raw.targets ?? []).filter((t) => t.at_ghz != null && RF_FREQUENCY_METRICS.includes(t.metric) && t.source?.comparable !== false).map((t) => t.at_ghz)];
        if (!freqs.length) fail('line.conductor_loss_model', 'skin_effect_wheeler needs a sweep or an RF target frequency to set its reference skin depth');
        conductor = { model: 'wheeler', fRefHz: Math.max(...freqs) * 1e9, ...base };
      } else if (cm === 'skin_effect_geometry_factor') {
        if (line.conductor_k_per_m == null) fail('line.conductor_k_per_m', 'required by skin_effect_geometry_factor (integral |J_s|^2 dl / I^2, 1/m)');
        conductor = { model: 'surface_resistance_geometry_factor', kPerM: line.conductor_k_per_m, ...base };
      } else {
        if (typeof line.perimeters_cover_carrying_surfaces !== 'boolean') fail('line.perimeters_cover_carrying_surfaces', 'required (explicit boolean) by skin_effect_perimeter');
        const roles = [...new Set(geometry.electrodes.map((e) => e.role))];
        if (roles.some((r) => r !== 'signal' && r !== 'ground') || !roles.includes('signal') || !roles.includes('ground'))
          fail('geometry.electrodes', 'skin_effect_perimeter needs electrode roles signal and ground only');
        conductor = { model: 'surface_resistance_perimeter', perimetersCoverCarryingSurfaces: line.perimeters_cover_carrying_surfaces, ...base };
      }
    }
  }
  let dielectricLoss = null;
  if (dm === 'tan_delta_regions') {
    dielectricLoss = Object.create(null);
    for (const r of geometry.regions) {
      const m = materials[r.material];
      if (m.tanDelta != null) dielectricLoss[r.material] = m.tanDelta;
      else if (m.dielectricSigmaS != null) dielectricLoss[r.material] = { sigmaSm: m.dielectricSigmaS, epsR: m.epsRfCrystal[0] };
      else fail(`materials.${r.material}`, `tan_delta_rf (or a dielectric sigma_Sm) is required by dielectric_loss_model tan_delta_regions (region ${r.name}); unknown loss is not zero`);
    }
  }
  // Q2 M3: a dirichlet outer side is a grounded return conductor whose surface the Wheeler and perimeter models omit.
  const dirichletSides = ['skin_effect_wheeler', 'skin_effect_perimeter'].includes(cm)
    ? Object.entries(geometry.boundary ?? {}).filter(([, v]) => v === 'dirichlet').map(([k]) => k) : [];
  return { conductorModel: cm, dielectricModel: dm, conductor, dielectricLoss, paper: null, sweepGhz, thicknessUm, dirichletSides };
}

// ---- loaded line and EO response stage inputs (DevLog-036) ----------------------------------------------------

/**
 * Validated periodic-line inputs of the loaded_line stage. The loss part (lossError null) needs a complete loss
 * declaration on both cuts (conductor model on the unloaded cut, dielectric model on both); without it only the lossless
 * Bloch quantities are computed. from_paper_alpha describes the whole line and gives no per-section loss.
 * @returns {{periodM:number, loadedLengthM:number, loadedName:string, unloadedName:string, lossError:string|null,
 *   rfUnloaded:any, rfLoaded:any}}
 */
export function loadedLineOptions(raw, materials, geometries) {
  const loading = raw.line?.loading;
  if (loading?.type !== 'periodic_t_rail') fail('line.loading.type', 'the loaded_line stage needs line.loading.type: periodic_t_rail');
  const loadedName = loading.loaded_cross_section ?? 'geometry';
  const unloadedName = loading.unloaded_cross_section;
  if (loadedName === unloadedName) fail('line.loading', 'loaded and unloaded cross-sections must differ');
  for (const n of [loadedName, unloadedName]) if (!Object.hasOwn(geometries, n)) fail('line.loading', `unknown cross-section ${n}`);
  let lossError = null;
  let rfUnloaded = null;
  let rfLoaded = null;
  try {
    if (raw.line.conductor_loss_model === 'from_paper_alpha') fail('line.conductor_loss_model', 'from_paper_alpha is a whole-line attenuation; the loaded line needs per-section conductor and dielectric models');
    rfUnloaded = rfOptions(raw, materials, geometries[unloadedName], unloadedName);
    rfLoaded = rfOptions(raw, materials, geometries[loadedName], loadedName, { allowLoadedCut: true });
  } catch (e) { lossError = e instanceof Error ? e.message : String(e); rfUnloaded = rfLoaded = null; }
  return { periodM: loading.period_um * 1e-6, loadedLengthM: loading.loaded_length_um * 1e-6, periodUm: loading.period_um, loadedLengthUm: loading.loaded_length_um, loadedName, unloadedName, lossError, rfUnloaded, rfLoaded };
}

/**
 * Validated eo_response inputs: line.length_mm (electrode length per arm, data convention (q)), source and load
 * impedance, and a frequency sweep (the response grid and the bandwidth search range). Nothing is defaulted.
 * @returns {{lengthM:number, zs:number, zl:number, sweepGhz:number[]}}
 */
export function eoResponseOptions(raw) {
  const line = raw.line;
  if (line == null) fail('line', 'the eo_response stage requires a line block');
  for (const k of ['length_mm', 'source_ohm', 'load_ohm']) if (line[k] == null) fail(`line.${k}`, `required by eo_response (no default)`);
  if (raw.sweep == null) fail('sweep', 'eo_response needs a frequency sweep (response grid and bandwidth search range)');
  return { lengthM: line.length_mm * 1e-3, zs: line.source_ohm, zl: line.load_ohm, sweepGhz: sweepFrequencies(raw.sweep) };
}

/** Topology of the RF line: 'none' (uniform), 'periodic_t_rail' or 'unspecified'. */
export const lineTopology = (raw) => raw.line?.loading?.type ?? 'unspecified';

/**
 * Stages added by a request (DevLog-036): eo_response needs the optical group index (optical_mode) and an RF line
 * (rf_line for a uniform line, loaded_line for periodic_t_rail). Returned in STAGES order.
 */
export function withStageDependencies(stages, raw) {
  const s = new Set(stages);
  if (s.has('eo_response')) {
    s.add('optical_mode');
    s.add(lineTopology(raw) === 'periodic_t_rail' ? 'loaded_line' : 'rf_line');
  }
  return STAGES.filter((x) => s.has(x));
}

/**
 * Per-stage readiness of a parsed config for one cross-section: null when the stage's inputs pass the input boundary,
 * otherwise the blocking message. Uses the same checks as runCrossSection (cross-section construction, arm windows
 * against the selected section, rf_line on a loaded T-rail cut). Mesh-dependent failures (metal in the optical
 * window, mode convergence, a Wheeler recess that collapses a conductor) are only found by running the stage.
 */
export function stageErrors(config, sectionName = 'geometry', { solver = null } = {}) {
  const { raw, materials, geometries } = config;
  const g = Object.hasOwn(geometries, sectionName) ? geometries[sectionName] : null;
  const out = {};
  const check = (stage, f) => {
    try { f(); out[stage] = null; } catch (e) { out[stage] = e instanceof Error ? e.message : String(e); }
  };
  if (!g) return Object.fromEntries(STAGES.map((s) => [s, `Unknown cross-section: ${sectionName}`]));
  let section;
  try { section = crossSectionOf(config, sectionName); sharedElectrodeEdgeCheck(g, sectionName); }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Object.fromEntries(STAGES.map((s) => [s, IMPLEMENTED_STAGES.includes(s) ? message : `${s} is not implemented in this engine`]));
  }
  out.electrostatics = null;
  check('optical_mode', () => {
    const oo = opticalOptions(raw, { solver });
    if (!g?.optical_window) fail(`${sectionName}.optical_window`, 'required for the optical mode stage');
    metalWindowCheck(g, materials, oo, [['optical_window', g.optical_window]], sectionName);
    dispersionAnchorCheck(g, materials, oo.lambda0Um, [g.optical_window]);
  });
  check('eo_overlap', () => {
    const oo = opticalOptions(raw, { solver });
    checkEoSolver(oo);
    const eo = eoOptions(raw, geometries);
    checkArmWindows(eo, section);
    if (!Object.values(materials).some((m) => m.r)) fail('materials', 'no material has Pockels coefficients (r_pm_per_v)');
    metalWindowCheck(g, materials, oo, [['optics.eo.arm_windows.A', eo.windows.A], ...(eo.windows.B ? [['optics.eo.arm_windows.B', eo.windows.B]] : [])], sectionName);
    dispersionAnchorCheck(g, materials, oo.lambda0Um, [eo.windows.A, ...(eo.windows.B ? [eo.windows.B] : [])]);
  });
  check('rf_line', () => rfOptions(raw, materials, g, sectionName));
  check('loaded_line', () => loadedLineOptions(raw, materials, geometries));
  check('eo_response', () => {
    eoResponseOptions(raw);
    if (out.optical_mode) fail('eo_response', `needs the optical group index: ${out.optical_mode}`);
    if (lineTopology(raw) === 'periodic_t_rail') {
      const lo = loadedLineOptions(raw, materials, geometries);
      if (lo.lossError) fail('eo_response', `the loaded line has no complete loss declaration: ${lo.lossError}`);
    } else if (out.rf_line) fail('eo_response', `needs the rf_line stage: ${out.rf_line}`);
  });
  // S8 (DevLog-039): the semiconductor block validated against this cross-section; DevLog-043: plus the run-time input
  // checks of its optical solve (vector solver, one wavelength, optical window), so a ready stage is not rejected by them
  check('semiconductor', () => {
    if (raw.semiconductor == null) fail('semiconductor', 'the semiconductor stage needs a semiconductor block');
    const so = semiconductorOptions(raw, g, materials);
    if (so.optics) semiconductorOpticsCheck(raw, so, g, sectionName, materials);
  });
  for (const s of STAGES) if (!IMPLEMENTED_STAGES.includes(s)) out[s] = `${s} is not implemented in this engine`;
  return out;
}

/**
 * DevLog-043 F4b: a cross-section whose regions use a material of the `semiconductor` block (doped silicon solved by
 * drift-diffusion). The Laplace electrostatics stage is not available there.
 */
export function semiconductorSection(raw, geometry) {
  const mats = raw?.semiconductor?.materials;
  return !!mats && typeof mats === 'object' && geometry.regions.some((r) => Object.hasOwn(mats, r.material));
}

/** Inputs of the semiconductor stage's own optical solve (semi-stage.mjs runSemiconductor), checked before any solve. */
function semiconductorOpticsCheck(raw, so, g, sectionName, materials = null) {
  const oo = opticalOptions(raw);
  if (oo.solver !== 'vector') fail('optics.solver', 'semiconductor optics needs optics.solver: vector');
  if (Math.abs(oo.lambda0Um - so.optics.lambdaUm) > 1e-9) fail('semiconductor.optics.wavelength_nm', 'must equal optics.wavelength_nm (one mode solve per run)');
  if (!g.optical_window) fail(`${sectionName}.optical_window`, 'required for the optical mode of semiconductor.optics');
  metalWindowCheck(g, materials, oo, [['optical_window', g.optical_window]], sectionName);
  // semi-stage.mjs opticalMaterials: an explicit n with a provenance entry replaces the library dispersion
  const overridden = new Set(Object.keys(materials ?? {}).filter((m) => raw.materials?.[m]?.n != null && (raw.provenance?.[`materials.${m}.n`] ?? raw.provenance?.[`materials.${m}`])));
  if (materials) dispersionAnchorCheck(g, materials, oo.lambda0Um, [g.optical_window], overridden);
}

/**
 * DevLog-043: the optical solvers reject a library dispersion whose validity range excludes the anchor wavelength
 * (optics.mjs assertAnchorInRange, vector-mode.mjs anchorInRange) for every material meshed in a mode window.
 */
function dispersionAnchorCheck(g, materials, lambda0Um, windows, skip = new Set()) {
  for (const w of windows) {
    const area = (w.x[1] - w.x[0]) * (w.y[1] - w.y[0]);
    for (const r of g.regions) {
      const m = materials[r.material];
      if (!m?.dispersionKey || m.conductor || skip.has(r.material) || !(windowOverlapArea(r.poly, w) > 1e-9 * area)) continue;
      for (const comp of ['n', 'n_o', 'n_e']) {
        const l = libraryIndex(m.dispersionKey, comp, lambda0Um);
        if (l && !l.inRange) fail(`materials.${r.material}`, `library dispersion '${m.dispersionKey}' (${comp}) is not valid at the optical wavelength ${lambda0Um} um (outside its validity range); the optical solve rejects it`);
      }
    }
  }
}

/**
 * DevLog-043: the mesher rejects two electrodes that share a boundary segment (geometry.mjs buildPslg). Statically:
 * collinear edges of two electrode polygons overlapping over a positive length (relative 1e-9 of the domain).
 */
function sharedElectrodeEdgeCheck(g, sectionName) {
  const span = Math.hypot(g.domain.x[1] - g.domain.x[0], g.domain.y[1] - g.domain.y[0]);
  const tol = 1e-9 * span;
  const edges = (p) => p.map((a, i) => [a, p[(i + 1) % p.length]]);
  const E = g.electrodes.map((e) => edges(e.poly));
  for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) {
    for (const [a, b] of E[i]) {
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if (!(L > tol)) continue;
      const ux = dx / L, uy = dy / L;
      for (const [c, d] of E[j]) {
        const off = (q) => Math.abs((q[0] - a[0]) * uy - (q[1] - a[1]) * ux);
        if (off(c) > tol || off(d) > tol) continue;
        const t = (q) => (q[0] - a[0]) * ux + (q[1] - a[1]) * uy;
        const lo = Math.max(0, Math.min(t(c), t(d))), hi = Math.min(L, Math.max(t(c), t(d)));
        if (hi - lo > tol) fail(`${sectionName}.electrodes`, `electrodes ${g.electrodes[i].name} and ${g.electrodes[j].name} share a boundary segment; the mesher rejects touching electrodes (merge them or separate them)`);
      }
    }
  }
}

/** Area of a polygon inside an axis-aligned window {x:[a,b], y:[c,d]} (Sutherland-Hodgman clip). */
function windowOverlapArea(poly, w) {
  let pts = poly;
  const edges = [[0, w.x[0], 1], [0, w.x[1], -1], [1, w.y[0], 1], [1, w.y[1], -1]];
  for (const [axis, v, sign] of edges) {
    const inside = (p) => sign * (p[axis] - v) >= 0;
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const ia = inside(a), ib = inside(b);
      if (ia) out.push(a);
      if (ia !== ib) {
        const t = (v - a[axis]) / (b[axis] - a[axis]);
        out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    pts = out;
    if (!pts.length) return 0;
  }
  return Math.abs(polygonArea(pts));
}

/**
 * DevLog-043: the optical solvers reject a conductor meshed inside a mode window under metal_in_window: reject (scalar
 * optics.mjs, vector vector-mode.mjs). Statically: any electrode, or region of a conductor material, overlapping the
 * window with positive area (relative 1e-9 of the window; edge contact meshes no conductor triangle).
 */
function metalWindowCheck(g, materials, oo, windows, sectionName) {
  if (oo.metal !== 'reject') return;
  const conductors = [...g.electrodes.map((e) => ({ name: e.name, poly: e.poly })), ...g.regions.filter((r) => materials?.[r.material]?.conductor).map((r) => ({ name: r.name, poly: r.poly }))];
  for (const [path, w] of windows) {
    const area = (w.x[1] - w.x[0]) * (w.y[1] - w.y[0]);
    const hit = conductors.filter((c) => windowOverlapArea(c.poly, w) > 1e-9 * area).map((c) => c.name);
    if (hit.length) fail(path === 'optical_window' ? `${sectionName}.optical_window` : path, `conductor ${hit.join(', ')} inside this mode window under optics.metal_in_window: reject (the default); metal optical modes are not computed unless a policy bounds the metal explicitly (${oo.solver === 'vector' ? 'absent, pec or lossy' : 'absent or pec_scalar'})`);
  }
}

/**
 * DevLog-043: doping type of each semiconductor contact from the doping on its boundary with the semiconductor (the
 * device rule, semi/device.mjs: sign of the net doping averaged over the contact; here length-weighted samples of the
 * contact edge instead of the contact control volumes). null for a contact that touches no semiconductor region.
 */
function contactDopingTypes(g, so) {
  const semiRegions = g.regions.filter((r) => r.material === so.materialName);
  const span = Math.max(g.domain.x[1] - g.domain.x[0], g.domain.y[1] - g.domain.y[0]);
  const tol = 1e-9 * span;
  const N = 16;
  return so.contacts.map((c) => {
    const edges = [];
    if (c.segment) edges.push([[c.segment.x[0], c.segment.y[0]], [c.segment.x[1], c.segment.y[1]]]);
    else { const p = g.electrodes[c.index].poly; for (let i = 0; i < p.length; i++) edges.push([p[i], p[(i + 1) % p.length]]); }
    let s = 0, w = 0;
    for (const [a, b] of edges) {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let k = 0; k < N; k++) {
        const t = (k + 0.5) / N, x = a[0] + t * (b[0] - a[0]), y = a[1] + t * (b[1] - a[1]);
        const r = semiRegions.find((q) => distPointPolygon(x, y, q.poly, true) <= tol);
        if (!r) continue;
        const [nd, na] = dopingAt(so.doping, x, y, { regionName: r.name, material: r.material });
        s += (len / N) * (nd - na);
        w += len / N;
      }
    }
    return w > 0 ? (s >= 0 ? 'n' : 'p') : null;
  });
}

/**
 * DevLog-043: readiness of the stages that may run with the semiconductor stage (stage-compat.mjs), for one
 * cross-section: optical_mode (the semiconductor stage's own vector mode, no second solve) and eo_response (the
 * junction-loaded line on line.rf_section at semiconductor.operating_bias_v). null = inputs pass, else the message.
 * Run-option overrides (rfSection, biasV) are not seen here; the UI has no such path.
 */
export function semiconductorStageErrors(config, sectionName = 'geometry', { rfSection = null, biasV = null } = {}) {
  const { raw, materials, geometries } = config;
  const g = Object.hasOwn(geometries, sectionName) ? geometries[sectionName] : null;
  if (!g) return { optical_mode: `Unknown cross-section: ${sectionName}`, eo_response: `Unknown cross-section: ${sectionName}` };
  let so = null;
  let semiError = null;
  try {
    if (raw.semiconductor == null) fail('semiconductor', 'the semiconductor stage needs a semiconductor block');
    crossSectionOf(config, sectionName);
    sharedElectrodeEdgeCheck(g, sectionName);
    so = semiconductorOptions(raw, g, materials);
    if (so.optics) semiconductorOpticsCheck(raw, so, g, sectionName, materials);
  } catch (e) { semiError = `the semiconductor stage is blocked: ${e instanceof Error ? e.message : String(e)}`; }
  const out = {};
  const check = (stage, f) => {
    try { if (semiError) throw new Error(semiError); f(); out[stage] = null; } catch (e) { out[stage] = e instanceof Error ? e.message : String(e); }
  };
  check('optical_mode', () => {
    if (!so.optics) fail('semiconductor.optics', "with the semiconductor stage the optical mode is the stage's own vector-mode solve, which needs semiconductor.optics");
  });
  check('eo_response', () => {
    const rs = rfSection ?? raw.line?.rf_section ?? null;
    const opBias = biasV ?? so.operatingBiasV;
    if (rs == null) fail('line.rf_section', 'eo_response after the semiconductor stage needs the electrode cross-section of the line (line.rf_section, or the run option rfSection)');
    if (typeof rs !== 'string' || !Object.hasOwn(geometries, rs)) fail('line.rf_section', `eo_response after the semiconductor stage needs the electrode cross-section of the line (got ${rs})`);
    if (opBias == null) fail('semiconductor.operating_bias_v', 'eo_response after the semiconductor stage needs the operating DC bias (one of semiconductor.bias values; or the run option biasV)');
    if (!so.bias || !so.bias.values.some((v) => Math.abs(v - opBias) < 1e-12)) fail('semiconductor.operating_bias_v', `no semiconductor bias point at ${opBias} V (bias values ${so.bias?.values.join(', ') ?? 'none'})`);
    if (!so.optics) fail('semiconductor.optics', 'eo_response after the semiconductor stage needs dn_eff/dV (plasma-dispersion optics)');
    if (!so.smallSignal.capacitance || !so.smallSignal.seriesResistance) fail('semiconductor.small_signal', "eo_response after the semiconductor stage needs the junction C' and R' (capacitance and series_resistance on)");
    if (lineTopology(raw) === 'periodic_t_rail') fail('line.loading.type', 'the junction-loaded line is a uniform line (Shin 2011 Fig. 2 branch); periodic_t_rail with the semiconductor stage is not implemented');
    // forward-bias operating point (run-time rule of stages.mjs runJunctionResponseStage), from the contact doping types
    const types = contactDopingTypes(g, so);
    if (so.bias && types.every((t) => t)) {
      const b = so.contacts.map((c, k) => (k === so.bias.contact ? opBias : c.biasV));
      const mean = (t) => { const v = b.filter((_, k) => types[k] === t); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
      const fwd = mean('p') != null && mean('n') != null ? mean('p') - mean('n') : 0;
      if (fwd > 0) fail('semiconductor.operating_bias_v', `${opBias} V is a forward-bias point (forward ${fwd} V; contacts ${so.contacts.map((c, k) => `${c.electrode} ${types[k]}`).join(', ')}): its C' is the quasi-static diffusion capacitance (valid only for omega tau << 1), so the junction-loaded TWE circuit is not valid; use a reverse-bias (depletion) operating point`);
    }
    eoResponseOptions(raw);
    crossSectionOf(config, rs);
    rfOptions(raw, materials, geometries[rs], rs);
  });
  return out;
}
