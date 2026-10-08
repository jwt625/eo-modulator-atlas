// Shared browser/CLI input boundary. Physical inputs are never silently filled in.
// Numerical meshing defaults are documented in sims/SPEC.md. GPL-3.0-or-later.
import { parseDocument } from 'yaml';
import { rectToPolygon } from './geometry.mjs';
import { resolveMaterial } from './materials.mjs';
import { normalizeWeights } from './electrostatics.mjs';
import { CrossSection } from './section.mjs';

export const MAX_VERTICES = 80000;
export const STAGES = ['electrostatics', 'optical_mode', 'eo_overlap', 'rf_line', 'loaded_line', 'eo_response'];
/** Stages runCrossSection can execute; the remaining STAGES are recognised but not implemented. */
export const IMPLEMENTED_STAGES = ['electrostatics', 'optical_mode', 'eo_overlap', 'rf_line'];
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
const OPTICS_KEYS = ['wavelength_nm', 'polarization', 'mode_index', 'group_index_from', 'ng_fixed', 'eo_axis', 'metal_in_window', 'eo'];
const LINE_KEYS = ['length_mm', 'conductor_loss_model', 'dielectric_loss_model', 'include_internal_inductance', 'r_pul_ref_ohm_per_m', 'r_pul_ref_ghz',
  'conductor_k_per_m', 'perimeters_cover_carrying_surfaces', 'rf_loss_table', 'rf_loss_law', 'source_ohm', 'load_ohm', 'differential', 'loading'];
const POCKELS_KEYS = ['r13', 'r22', 'r33', 'r51', 'voigt'];
/** Material keys read by the solver boundary (Q2 M4: a typo such as r_pm_per_V must not silently drop a tensor). */
const MATERIAL_KEYS = ['conductor', 'eps_r', 'n', 'n_o', 'n_e', 'sigma_Sm', 'crystal', 'r_pm_per_v', 'tan_delta_rf', 'dispersion', 'thickness_um', 'n_complex'];
/** Target keys (Q2 M4: a typo such as at_GHz must not turn a frequency target into a static one). `source` stays open. */
const TARGET_KEYS = ['metric', 'value', 'tol_abs', 'tol_rel', 'at_ghz', 'vpi_convention', 'source'];

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

export function normalizeGeometry(raw, materials, path = 'geometry') {
  keys(raw, ['symmetry', 'mirror_x_um', 'domain', 'regions', 'electrodes', 'optical_window', 'mesh', 'boundary'], path);
  const domain = window(raw.domain, `${path}.domain`);
  const symmetry = oneOf(raw.symmetry ?? 'none', ['none', 'x_mirror_odd', 'x_mirror_even'], `${path}.symmetry`);
  const mirror = number(raw.mirror_x_um ?? 0, `${path}.mirror_x_um`);
  if (symmetry !== 'none' && (mirror < domain.x[0] || mirror > domain.x[1])) fail(path, 'mirror plane must meet the domain');
  const entities = (rows, kind) => {
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
  keys(mesh, ['max_edge_um', 'electrode_edge_um', 'electrode_face_um', 'window_edge_um', 'far_edge_um', 'min_edge_um', 'grade', 'grade_far', 'grade_corner', 'min_angle_bound', 'max_vertices', 'regions'], `${path}.mesh`);
  for (const [k, v] of Object.entries(mesh)) {
    if (k === 'regions') { Object.values(object(v, `${path}.mesh.regions`)).forEach((x) => number(x, `${path}.mesh.regions`, true)); }
    else number(v, `${path}.mesh.${k}`, true);
  }
  // Explicit resource ceiling for an interactive solve; never silently coarsen the mesh.
  mesh.max_vertices ??= MAX_VERTICES;
  if (!Number.isInteger(mesh.max_vertices) || mesh.max_vertices < 4 || mesh.max_vertices > MAX_VERTICES) fail(`${path}.mesh.max_vertices`, `expected an integer from 4 to ${MAX_VERTICES}`);
  if (mesh.min_angle_bound != null && mesh.min_angle_bound < 1) fail(`${path}.mesh.min_angle_bound`, 'radius/edge bound must be at least 1');
  const boundary = { left: 'neumann', right: 'neumann', top: 'neumann', bottom: 'neumann', ...object(raw.boundary ?? {}, `${path}.boundary`) };
  keys(boundary, ['left', 'right', 'top', 'bottom'], `${path}.boundary`);
  Object.entries(boundary).forEach(([k, v]) => oneOf(v, ['neumann', 'dirichlet'], `${path}.boundary.${k}`));
  const optical_window = raw.optical_window ? window(raw.optical_window, `${path}.optical_window`) : null;
  if (optical_window && ['x', 'y'].some((k) => optical_window[k][0] < domain[k][0] || optical_window[k][1] > domain[k][1])) fail(path, 'optical_window must lie within the domain');
  const regions = entities(raw.regions, 'regions');
  const electrodes = entities(raw.electrodes, 'electrodes');
  normalizeWeights(electrodes, symmetry);
  for (const name of Object.keys(mesh.regions ?? {})) if (!regions.some(r => r.name === name)) fail(`${path}.mesh.regions`, `unknown region ${name}`);
  return { domain, symmetry, mirror_x_um: mirror, regions, electrodes, optical_window, mesh, boundary };
}

function readDocument(text) {
  if (typeof text !== 'string' || text.length > 1000000) fail('config', 'expected YAML text of at most 1,000,000 characters');
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`YAML: ${doc.errors.map((e) => e.message).join('; ')}`);
  return doc.toJS({ maxAliasCount: 100 });
}

export function parseConfig(text) {
  return normalizeConfig(readDocument(text));
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
  geometries.geometry = normalizeGeometry(raw.geometry, materials);
  for (const [name, g] of Object.entries(object(raw.alt_geometries ?? {}, 'alt_geometries'))) {
    if (name === 'geometry' || name === '__proto__') fail('alt_geometries', 'reserved geometry name');
    geometries[name] = normalizeGeometry(g, materials, `alt_geometries.${name}`);
  }
  return geometries;
}

// A geometric preview is not a solver input. It supplies no material constants,
// resolves no library materials and never changes the raw document or its status.
// Invalid metadata/geometry still throws; physics errors are returned separately.
export function inspectConfig(text, section = 'geometry') {
  const raw = readDocument(text);
  validateMetadata(raw);
  const preview = { raw, geometries: normalizeGeometries(raw, materialDeclarations(raw)) };
  let solveError = '';
  let stages = null;
  try { stages = stageErrors(normalizeConfig(raw), section); }
  catch (e) { solveError = e instanceof Error ? e.message : String(e); }
  // When the input boundary fails, every stage is blocked by that same error.
  if (!stages) stages = Object.fromEntries(STAGES.map((s) => [s, IMPLEMENTED_STAGES.includes(s) ? solveError : `${s} is not implemented in this engine`]));
  return { preview, solveError, stageErrors: stages };
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
    const loading = raw.line.loading;
    if (loading != null) {
      object(loading, 'line.loading');
      oneOf(loading.type, ['none', 'periodic_t_rail'], 'line.loading.type');
      if (loading.type === 'periodic_t_rail') {
        number(loading.period_um, 'line.loading.period_um', true);
        number(loading.loaded_length_um, 'line.loading.loaded_length_um', true);
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
  for (const [i, t] of array(raw.targets ?? [], 'targets').entries()) {
    const p = `targets[${i}]`;
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
    if (t.tol_abs == null && t.tol_rel == null) fail(p, 'tolerance is required');
    for (const k of ['tol_abs', 'tol_rel']) if (t[k] != null && number(t[k], `${p}.${k}`) < 0) fail(p, 'tolerance cannot be negative');
    if (!Number.isFinite(Math.max(t.tol_abs ?? 0, Math.abs(t.value) * (t.tol_rel ?? 0)))) fail(p, 'tolerance must remain finite');
  }
  return { raw, materials, geometries };
}

export function opticalOptions(raw) {
  const o = object(raw.optics, 'optics');
  keys(o, OPTICS_KEYS, 'optics');
  if (o.eo_axis != null) oneOf(o.eo_axis, ['auto'], 'optics.eo_axis');
  number(o.wavelength_nm, 'optics.wavelength_nm', true);
  const polarization = oneOf(o.polarization, ['TE', 'TM', 'quasi-TE', 'quasi-TM'], 'optics.polarization').replace('quasi-', '');
  const modeIndex = number(o.mode_index ?? 0, 'optics.mode_index');
  if (!Number.isInteger(modeIndex) || modeIndex < 0 || modeIndex > 4) fail('optics.mode_index', 'expected an integer from 0 to 4');
  oneOf(o.group_index_from, ['fixed', 'finite_difference_wavelength'], 'optics.group_index_from');
  if (o.group_index_from === 'fixed') number(o.ng_fixed, 'optics.ng_fixed', true);
  const metal = o.metal_in_window === undefined ? 'reject'
    : oneOf(o.metal_in_window, ['reject', 'absent', 'pec_scalar'], 'optics.metal_in_window');
  return { polarization, lambda0Um: o.wavelength_nm / 1000, modeIndex, metal };
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
export function rfOptions(raw, materials, geometry, sectionName = 'geometry') {
  const line = raw.line;
  if (line == null) fail('line', 'the rf_line stage requires a line block');
  const loading = line.loading;
  // Q2 C2: the loaded cut of a T-rail line holds conductors (the T pads) that carry no line current in the 2D section;
  // a uniform-line L', R' and loss of that cut are not meaningful, and the Wheeler recess would treat the pads as
  // current-carrying surfaces. Blocked until the loaded_line stage exists.
  if (loading?.type === 'periodic_t_rail' && sectionName === (loading.loaded_cross_section ?? 'geometry'))
    fail('rf_line', `cross-section ${sectionName} is the loaded cut of a periodic_t_rail line; its T-rail conductors carry no line current in a 2D section, so a uniform-line model of it is not meaningful. Run rf_line on the unloaded cross-section (${loading.unloaded_cross_section}); the loaded line needs the loaded_line stage (not implemented)`);
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
      const base = { sigmaSm: sigmas[0], thicknessM: thicknessUm * 1e-6, includeInternalInductance: internal };
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

/**
 * Per-stage readiness of a parsed config for one cross-section: null when the stage's inputs pass the input boundary,
 * otherwise the blocking message. Uses the same checks as runCrossSection (cross-section construction, arm windows
 * against the selected section, rf_line on a loaded T-rail cut). Mesh-dependent failures (metal in the optical
 * window, mode convergence, a Wheeler recess that collapses a conductor) are only found by running the stage.
 */
export function stageErrors(config, sectionName = 'geometry') {
  const { raw, materials, geometries } = config;
  const g = Object.hasOwn(geometries, sectionName) ? geometries[sectionName] : null;
  const out = {};
  const check = (stage, f) => {
    try { f(); out[stage] = null; } catch (e) { out[stage] = e instanceof Error ? e.message : String(e); }
  };
  if (!g) return Object.fromEntries(STAGES.map((s) => [s, `Unknown cross-section: ${sectionName}`]));
  let section;
  try { section = crossSectionOf(config, sectionName); }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Object.fromEntries(STAGES.map((s) => [s, IMPLEMENTED_STAGES.includes(s) ? message : `${s} is not implemented in this engine`]));
  }
  out.electrostatics = null;
  check('optical_mode', () => {
    opticalOptions(raw);
    if (!g?.optical_window) fail(`${sectionName}.optical_window`, 'required for the optical mode stage');
  });
  check('eo_overlap', () => {
    opticalOptions(raw);
    checkArmWindows(eoOptions(raw, geometries), section);
    if (!Object.values(materials).some((m) => m.r)) fail('materials', 'no material has Pockels coefficients (r_pm_per_v)');
  });
  check('rf_line', () => rfOptions(raw, materials, g, sectionName));
  for (const s of STAGES) if (!IMPLEMENTED_STAGES.includes(s)) out[s] = `${s} is not implemented in this engine`;
  return out;
}
