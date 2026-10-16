// Validation of the `semiconductor` config block (DevLog-039; schema engine/schema/sim.schema.json $defs/semiconductor).
// Strict keys: a typo must not silently drop an input. No physical default is supplied for any device input
// (doping, lifetimes, contacts); model choices default to the documented models.
// License: GPL-3.0-or-later.

import { pointInPolygon, rectToPolygon } from '../geometry.mjs';

const fail = (path, message) => { throw new Error(`${path}: ${message}`); };
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const object = (v, p) => { if (!isObj(v)) fail(p, 'expected an object'); return v; };
const keys = (v, allowed, p) => { object(v, p); for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${p}.${k}`, 'unsupported field'); return v; };
const num = (v, p, { positive = false, nonneg = false } = {}) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(p, 'expected a finite number');
  if (positive && !(v > 0)) fail(p, 'expected a positive number');
  if (nonneg && !(v >= 0)) fail(p, 'expected a non-negative number');
  return v;
};
const oneOf = (v, options, p) => { if (!options.includes(v)) fail(p, `expected one of ${options.join(', ')}`); return v; };
const interval = (v, p) => {
  if (!Array.isArray(v) || v.length !== 2) fail(p, 'expected [min, max]');
  v.forEach((x, i) => num(x, `${p}[${i}]`));
  if (!(v[1] > v[0])) fail(p, 'max must exceed min');
  return [v[0], v[1]];
};

export const DOPING_PROFILES = Object.freeze(['uniform', 'gaussian', 'erfc']);
/** vpi_convention values accepted on semiconductor VpiL targets (the catalogue list of config.mjs). */
export const SEMI_VPI_CONVENTIONS = Object.freeze(['per_arm_phase_shifter', 'mzm_push_pull', 'mzm_series_push_pull', 'mzm_differential', 'mzm_single_arm', 'resonance_tuning_derived', 'unspecified']);
export const SEMI_METRICS = Object.freeze(['vpil_vcm', 'vpil_differential_vcm', 'dneff', 'dalpha_db_per_cm', 'loss_db_per_cm', 'c_pf_per_mm', 'r_ohm_mm', 'f_rc_ghz']);
export const DEFAULT_NUMERICS = Object.freeze({ rampStepV: 1.0, forwardRampStepV: 0.1, updateTolVt: 1e-8, maxNewton: 40 });
export const DEFAULT_DV_V = 0.01;
export const MAX_BIAS_POINTS = 401;

function withinSpec(w, p, regionNames, materialNames) {
  if (w == null) return { kind: 'all' };
  keys(w, ['regions', 'material', 'rect', 'polygon_um'], p);
  const given = ['regions', 'material', 'rect', 'polygon_um'].filter((k) => w[k] != null);
  if (given.length !== 1) fail(p, 'give exactly one of regions, material, rect, polygon_um');
  if (w.regions != null) {
    if (!Array.isArray(w.regions) || !w.regions.length) fail(`${p}.regions`, 'expected a non-empty list of region names');
    w.regions.forEach((r, i) => { if (!regionNames.includes(r)) fail(`${p}.regions[${i}]`, `unknown region ${r}`); });
    return { kind: 'regions', regions: [...w.regions] };
  }
  if (w.material != null) {
    if (!materialNames.includes(w.material)) fail(`${p}.material`, `${w.material} is not a semiconductor material of this block`);
    return { kind: 'material', material: w.material };
  }
  if (w.rect != null) {
    keys(w.rect, ['x_um', 'y_um'], `${p}.rect`);
    return { kind: 'polygon', poly: rectToPolygon(interval(w.rect.x_um, `${p}.rect.x_um`), interval(w.rect.y_um, `${p}.rect.y_um`)) };
  }
  if (!Array.isArray(w.polygon_um) || w.polygon_um.length < 3) fail(`${p}.polygon_um`, 'expected at least three [x, y] points');
  return { kind: 'polygon', poly: w.polygon_um.map((q, i) => { if (!Array.isArray(q) || q.length !== 2) fail(`${p}.polygon_um[${i}]`, 'expected [x, y]'); return [num(q[0], p), num(q[1], p)]; }) };
}

function dopingEntry(d, p, regionNames, materialNames) {
  keys(d, ['name', 'species', 'profile', 'concentration_cm3', 'peak_cm3', 'vertical', 'lateral', 'within'], p);
  if (d.name != null && typeof d.name !== 'string') fail(`${p}.name`, 'expected a string');
  const species = oneOf(d.species, ['donor', 'acceptor'], `${p}.species`);
  const profile = oneOf(d.profile, DOPING_PROFILES, `${p}.profile`);
  const out = { name: d.name ?? `${species}_${profile}`, species, profile, within: withinSpec(d.within, `${p}.within`, regionNames, materialNames), lateral: null, vertical: null };
  if (profile === 'uniform') {
    if (d.peak_cm3 != null || d.vertical != null) fail(p, 'uniform profile takes concentration_cm3 (and optional lateral / within) only');
    out.value = num(d.concentration_cm3, `${p}.concentration_cm3`, { nonneg: true });
  } else {
    if (d.concentration_cm3 != null) fail(`${p}.concentration_cm3`, `${profile} profile takes peak_cm3`);
    out.value = num(d.peak_cm3, `${p}.peak_cm3`, { nonneg: true });
    const v = keys(d.vertical, ['surface_y_um', 'range_um', 'straggle_um', 'depth_um'], `${p}.vertical`);
    const surface = num(v.surface_y_um, `${p}.vertical.surface_y_um`);
    if (profile === 'gaussian') {
      if (v.depth_um != null) fail(`${p}.vertical.depth_um`, 'gaussian takes range_um and straggle_um');
      out.vertical = { surface, range: num(v.range_um, `${p}.vertical.range_um`), straggle: num(v.straggle_um, `${p}.vertical.straggle_um`, { positive: true }) };
    } else {
      if (v.range_um != null || v.straggle_um != null) fail(`${p}.vertical`, 'erfc takes depth_um');
      out.vertical = { surface, depth: num(v.depth_um, `${p}.vertical.depth_um`, { positive: true }) };
    }
  }
  if (d.lateral != null) {
    const l = keys(d.lateral, ['x_um', 'straggle_um'], `${p}.lateral`);
    out.lateral = { x: interval(l.x_um, `${p}.lateral.x_um`), straggle: l.straggle_um == null ? 0 : num(l.straggle_um, `${p}.lateral.straggle_um`, { nonneg: true }) };
  }
  return out;
}

/**
 * Validate and resolve `config.raw.semiconductor` against the parsed geometry.
 * @param {any} raw expanded config (parseConfig().raw)
 * @param {any} geom normalised geometry of the solved section
 * @param {Record<string, any>} materials resolved materials (parseConfig().materials)
 */
export function semiconductorOptions(raw, geom, materials) {
  const s = raw?.semiconductor;
  if (s == null) fail('semiconductor', 'the semiconductor stage needs a semiconductor block');
  keys(s, ['temperature_k', 'materials', 'doping', 'contacts', 'bias', 'numerics', 'small_signal', 'mesh', 'optics', 'targets', 'poisson_domain', 'operating_bias_v'], 'semiconductor');
  const T = s.temperature_k == null ? 300 : num(s.temperature_k, 'semiconductor.temperature_k', { positive: true });
  const regionNames = geom.regions.map((r) => r.name);
  const mats = {};
  for (const [name, m] of Object.entries(object(s.materials, 'semiconductor.materials'))) {
    const p = `semiconductor.materials.${name}`;
    keys(m, ['semiconductor', 'intrinsic_density', 'mobility', 'recombination'], p);
    if (!materials[name]) fail(p, `unknown material ${name}`);
    if (materials[name].conductor) fail(p, 'a conductor cannot be a semiconductor');
    if (!geom.regions.some((r) => r.material === name)) fail(p, `no region of the solved cross-section uses ${name}`);
    oneOf(m.semiconductor, ['silicon'], `${p}.semiconductor`);
    let ni;
    if (m.intrinsic_density == null || m.intrinsic_density === 'sproul_green_1991') ni = { model: 'sproul_green_1991' };
    else {
      keys(m.intrinsic_density, ['ni_cm3'], `${p}.intrinsic_density`);
      ni = { model: 'configured', niCm3: num(m.intrinsic_density.ni_cm3, `${p}.intrinsic_density.ni_cm3`, { positive: true }) };
    }
    const mo = m.mobility == null ? {} : keys(m.mobility, ['doping', 'donor', 'field', 'mu_n_cm2_per_vs', 'mu_p_cm2_per_vs'], `${p}.mobility`);
    const mobility = {
      doping: mo.doping == null ? 'masetti_1983' : oneOf(mo.doping, ['masetti_1983', 'caughey_thomas_1967', 'constant'], `${p}.mobility.doping`),
      donor: mo.donor == null ? 'phosphorus' : oneOf(mo.donor, ['phosphorus', 'arsenic'], `${p}.mobility.donor`),
      field: mo.field == null ? 'caughey_thomas_1967' : oneOf(mo.field, ['caughey_thomas_1967', 'none'], `${p}.mobility.field`),
    };
    if (mobility.doping === 'constant') {
      mobility.muN = num(mo.mu_n_cm2_per_vs, `${p}.mobility.mu_n_cm2_per_vs`, { positive: true });
      mobility.muP = num(mo.mu_p_cm2_per_vs, `${p}.mobility.mu_p_cm2_per_vs`, { positive: true });
    } else if (mo.mu_n_cm2_per_vs != null || mo.mu_p_cm2_per_vs != null) fail(`${p}.mobility`, 'mu_n_cm2_per_vs / mu_p_cm2_per_vs apply to doping: constant only');
    let srh = null;
    if (m.recombination != null) {
      keys(m.recombination, ['srh'], `${p}.recombination`);
      if (m.recombination.srh != null) {
        const r = keys(m.recombination.srh, ['tau_n_s', 'tau_p_s', 'trap_level_ev'], `${p}.recombination.srh`);
        srh = { tauN: num(r.tau_n_s, `${p}.recombination.srh.tau_n_s`, { positive: true }), tauP: num(r.tau_p_s, `${p}.recombination.srh.tau_p_s`, { positive: true }), trapEv: r.trap_level_ev == null ? 0 : num(r.trap_level_ev, `${p}.recombination.srh.trap_level_ev`) };
      }
    }
    mats[name] = { name, ni, mobility, srh };
  }
  const materialNames = Object.keys(mats);
  if (!materialNames.length) fail('semiconductor.materials', 'at least one semiconductor material is required');
  if (materialNames.length > 1) fail('semiconductor.materials', 'one semiconductor material per cross-section is supported (heterojunctions are not modelled)');
  if (!Array.isArray(s.doping) || !s.doping.length) fail('semiconductor.doping', 'expected a non-empty list');
  const doping = s.doping.map((d, i) => dopingEntry(d, `semiconductor.doping[${i}]`, regionNames, materialNames));
  if (!Array.isArray(s.contacts) || !s.contacts.length) fail('semiconductor.contacts', 'expected a non-empty list');
  const electrodeNames = geom.electrodes.map((e) => e.name);
  // a contact is a geometry electrode (metal touching the semiconductor) or a named segment of the semiconductor
  // boundary (bare-face ohmic contact: the semiconductor nodes on the segment are pinned)
  const contacts = s.contacts.map((c, i) => {
    const p = `semiconductor.contacts[${i}]`;
    keys(c, ['electrode', 'name', 'segment', 'type', 'bias_v'], p);
    if (c.type != null) oneOf(c.type, ['ohmic'], `${p}.type`);
    const biasV = c.bias_v == null ? 0 : num(c.bias_v, `${p}.bias_v`);
    if ((c.electrode != null) === (c.segment != null)) fail(p, 'give exactly one of electrode or segment');
    if (c.electrode != null) {
      if (c.name != null) fail(`${p}.name`, 'an electrode contact is named by its electrode');
      if (!electrodeNames.includes(c.electrode)) fail(`${p}.electrode`, `unknown electrode ${c.electrode}`);
      return { electrode: c.electrode, index: electrodeNames.indexOf(c.electrode), segment: null, type: 'ohmic', biasV };
    }
    if (typeof c.name !== 'string' || !c.name) fail(`${p}.name`, 'a segment contact needs a name');
    if (electrodeNames.includes(c.name)) fail(`${p}.name`, `${c.name} is also an electrode name`);
    const sg = keys(c.segment, ['x_um', 'y_um'], `${p}.segment`);
    const seg = (v, q) => { if (!Array.isArray(v) || v.length !== 2) fail(q, 'expected [min, max] (equal values for a straight segment)'); v.forEach((x) => num(x, q)); if (v[1] < v[0]) fail(q, 'max below min'); return [v[0], v[1]]; };
    const segment = { x: seg(sg.x_um, `${p}.segment.x_um`), y: seg(sg.y_um, `${p}.segment.y_um`) };
    if (segment.x[0] !== segment.x[1] && segment.y[0] !== segment.y[1]) fail(`${p}.segment`, 'a contact segment is vertical (equal x) or horizontal (equal y)');
    return { electrode: c.name, index: -1, segment, type: 'ohmic', biasV };
  });
  if (new Set(contacts.map((c) => c.electrode)).size !== contacts.length) fail('semiconductor.contacts', 'each electrode / contact name may appear once');
  for (const e of electrodeNames) if (!contacts.some((c) => c.electrode === e && c.index >= 0)) fail('semiconductor.contacts', `electrode ${e} of the cross-section is not a semiconductor contact (every electrode must be listed)`);
  if (geom.symmetry !== 'none') fail('geometry.symmetry', 'the semiconductor stage solves the full cross-section (symmetry: none)');
  // audit D10: the stage has zero-flux outer boundaries only; a Dirichlet box would be silently ignored otherwise
  for (const side of ['left', 'right', 'top', 'bottom']) if ((geom.boundary?.[side] ?? 'neumann') !== 'neumann') fail(`geometry.boundary.${side}`, 'the semiconductor stage supports zero-flux (neumann) outer boundaries only');
  const poissonDomain = s.poisson_domain == null ? 'all' : oneOf(s.poisson_domain, ['all', 'semiconductor'], 'semiconductor.poisson_domain');
  let bias = null;
  if (s.bias != null) {
    const b = keys(s.bias, ['contact', 'values_v', 'start_v', 'stop_v', 'step_v', 'reference_v'], 'semiconductor.bias');
    const ci = contacts.findIndex((c) => c.electrode === b.contact);
    if (ci < 0) fail('semiconductor.bias.contact', `${b.contact} is not a contact`);
    let values;
    if (b.values_v != null) {
      if (b.start_v != null || b.stop_v != null || b.step_v != null) fail('semiconductor.bias', 'give values_v or start_v/stop_v/step_v');
      if (!Array.isArray(b.values_v) || !b.values_v.length) fail('semiconductor.bias.values_v', 'expected a non-empty list');
      values = b.values_v.map((v, i) => num(v, `semiconductor.bias.values_v[${i}]`));
    } else {
      const a = num(b.start_v, 'semiconductor.bias.start_v'), z = num(b.stop_v, 'semiconductor.bias.stop_v'), st = num(b.step_v, 'semiconductor.bias.step_v', { positive: true });
      const n = Math.floor(Math.abs(z - a) / st + 1e-9) + 1;
      if (n > MAX_BIAS_POINTS) fail('semiconductor.bias', `at most ${MAX_BIAS_POINTS} points`);
      values = Array.from({ length: n }, (_, k) => a + Math.sign(z - a || 1) * k * st);
    }
    if (values.length > MAX_BIAS_POINTS) fail('semiconductor.bias.values_v', `at most ${MAX_BIAS_POINTS} points`);
    const reference = b.reference_v == null ? values[0] : num(b.reference_v, 'semiconductor.bias.reference_v');
    bias = { contact: ci, electrode: b.contact, values, reference };
  }
  const nu = s.numerics == null ? {} : keys(s.numerics, ['ramp_step_v', 'forward_ramp_step_v', 'update_tol_vt', 'max_newton'], 'semiconductor.numerics');
  const numerics = {
    rampStepV: nu.ramp_step_v == null ? DEFAULT_NUMERICS.rampStepV : num(nu.ramp_step_v, 'semiconductor.numerics.ramp_step_v', { positive: true }),
    forwardRampStepV: nu.forward_ramp_step_v == null ? DEFAULT_NUMERICS.forwardRampStepV : num(nu.forward_ramp_step_v, 'semiconductor.numerics.forward_ramp_step_v', { positive: true }),
    updateTolVt: nu.update_tol_vt == null ? DEFAULT_NUMERICS.updateTolVt : num(nu.update_tol_vt, 'semiconductor.numerics.update_tol_vt', { positive: true }),
    maxNewton: nu.max_newton == null ? DEFAULT_NUMERICS.maxNewton : num(nu.max_newton, 'semiconductor.numerics.max_newton', { positive: true }),
  };
  const ss = s.small_signal == null ? {} : keys(s.small_signal, ['dv_v', 'capacitance', 'series_resistance'], 'semiconductor.small_signal');
  const smallSignal = {
    dv: ss.dv_v == null ? DEFAULT_DV_V : num(ss.dv_v, 'semiconductor.small_signal.dv_v', { positive: true }),
    capacitance: ss.capacitance == null ? true : !!ss.capacitance,
    seriesResistance: ss.series_resistance == null ? true : !!ss.series_resistance,
  };
  const me = s.mesh == null ? {} : keys(s.mesh, ['semiconductor_edge_um', 'junction_edge_um', 'max_vertices'], 'semiconductor.mesh');
  const mesh = {
    semiEdgeUm: me.semiconductor_edge_um == null ? null : num(me.semiconductor_edge_um, 'semiconductor.mesh.semiconductor_edge_um', { positive: true }),
    junctionEdgeUm: me.junction_edge_um == null ? null : num(me.junction_edge_um, 'semiconductor.mesh.junction_edge_um', { positive: true }),
    maxVertices: me.max_vertices == null ? null : num(me.max_vertices, 'semiconductor.mesh.max_vertices', { positive: true }),
  };
  let optics = null;
  if (s.optics != null) {
    const o = keys(s.optics, ['plasma_dispersion', 'wavelength_nm', 'drive', 'density_basis', 'delta_eps'], 'semiconductor.optics');
    const wl = o.wavelength_nm ?? raw.optics?.wavelength_nm;
    if (wl == null) fail('semiconductor.optics.wavelength_nm', 'give a wavelength here or in optics.wavelength_nm');
    optics = {
      model: o.plasma_dispersion == null ? 'nedeljkovic_2011' : oneOf(o.plasma_dispersion, ['nedeljkovic_2011', 'soref_bennett_1987'], 'semiconductor.optics.plasma_dispersion'),
      lambdaUm: num(wl, 'semiconductor.optics.wavelength_nm', { positive: true }) / 1000,
      drive: o.drive == null ? 'single_arm' : oneOf(o.drive, ['single_arm', 'push_pull'], 'semiconductor.optics.drive'),
      // absolute (default): delta n(V) = f(N(V), P(V)) - f(N(V0), P(V0)), the fit applied to the absolute free-carrier
      // densities; change: f applied to the density change N(V) - N(V0) (sign carried through)
      densityBasis: o.density_basis == null ? 'absolute' : oneOf(o.density_basis, ['absolute', 'change'], 'semiconductor.optics.density_basis'),
      // audit D7: first_order (default) delta eps = 2 n (dn + i dk), consistent with the first-order mode perturbation;
      // exact = (n + dn + i dk)^2 - n^2
      deltaEps: o.delta_eps == null ? 'first_order' : oneOf(o.delta_eps, ['first_order', 'exact'], 'semiconductor.optics.delta_eps'),
    };
    if (raw.optics == null) fail('optics', 'semiconductor.optics needs the optics block (vector mode solve of the optical_window)');
  }
  const targets = (s.targets ?? []).map((t, i) => {
    const p = `semiconductor.targets[${i}]`;
    keys(t, ['metric', 'value', 'at_bias_v', 'tol_abs', 'tol_rel', 'vpi_convention', 'reference', 'source'], p);
    oneOf(t.metric, SEMI_METRICS, `${p}.metric`);
    if (t.vpi_convention != null) {
      if (!['vpil_vcm', 'vpil_differential_vcm'].includes(t.metric)) fail(`${p}.vpi_convention`, 'only meaningful for vpil_vcm and vpil_differential_vcm');
      oneOf(t.vpi_convention, SEMI_VPI_CONVENTIONS, `${p}.vpi_convention`);
    }
    if (t.reference != null) oneOf(t.reference, ['dc', 'low_freq_unstated', 'unspecified'], `${p}.reference`);
    if (t.source != null && (typeof t.source !== 'object' || Array.isArray(t.source))) fail(`${p}.source`, 'expected an object');
    if (t.source?.comparable != null && typeof t.source.comparable !== 'boolean') fail(`${p}.source.comparable`, 'expected a boolean');
    num(t.value, `${p}.value`);
    num(t.at_bias_v, `${p}.at_bias_v`);
    if (t.tol_abs == null && t.tol_rel == null) fail(p, 'a target needs tol_abs or tol_rel');
    if (t.tol_abs != null) num(t.tol_abs, `${p}.tol_abs`, { nonneg: true });
    if (t.tol_rel != null) num(t.tol_rel, `${p}.tol_rel`, { nonneg: true });
    return { ...t };
  });
  if (!Array.isArray(s.targets ?? [])) fail('semiconductor.targets', 'expected a list');
  // operating DC bias of the swept contact for the junction-loaded TWE response (orchestrator decision, round 3)
  let operatingBiasV = null;
  if (s.operating_bias_v != null) {
    operatingBiasV = num(s.operating_bias_v, 'semiconductor.operating_bias_v');
    if (!bias || !bias.values.some((v) => Math.abs(v - operatingBiasV) < 1e-12)) fail('semiconductor.operating_bias_v', 'must be one of semiconductor.bias values');
  }
  return { temperatureK: T, material: mats[materialNames[0]], materialName: materialNames[0], doping, contacts, bias, numerics, smallSignal, mesh, optics, targets, poissonDomain, operatingBiasV };
}

// ---- doping profiles ------------------------------------------------------------------------------------------

/** Complementary error function: Chebyshev-type fit of Press et al., Numerical Recipes (2nd ed., sec. 6.2, erfcc),
 * fractional error below 1.2e-7 for all x (checked in tests/semi-models.test.mjs). */
export function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** Lateral mask factor of a window [x0, x1] with Gaussian lateral straggle s (s = 0: step). */
function lateralFactor(l, x) {
  if (!l) return 1;
  if (!(l.straggle > 0)) return x >= l.x[0] && x <= l.x[1] ? 1 : 0;
  const k = Math.SQRT2 * l.straggle;
  return 0.5 * (erfc((l.x[0] - x) / k) - erfc((l.x[1] - x) / k));
}

/** Vertical profile value (cm^-3) at height y (um) of one doping entry. */
function verticalValue(d, y) {
  if (d.profile === 'uniform') return d.value;
  const depth = d.vertical.surface - y;
  if (d.profile === 'gaussian') { const u = (depth - d.vertical.range) / d.vertical.straggle; return d.value * Math.exp(-0.5 * u * u); }
  return d.value * erfc(depth / d.vertical.depth);
}

/**
 * Donor and acceptor density (cm^-3) at a point of semiconductor triangle t.
 * @param {any[]} doping resolved entries
 * @param {{regionName:string, material:string}} where region of the triangle the point belongs to
 */
export function dopingAt(doping, x, y, where) {
  let nd = 0, na = 0;
  for (const d of doping) {
    const w = d.within;
    if (w.kind === 'regions' && !w.regions.includes(where.regionName)) continue;
    if (w.kind === 'material' && w.material !== where.material) continue;
    if (w.kind === 'polygon' && !pointInPolygon(x, y, w.poly)) continue;
    const v = verticalValue(d, y) * lateralFactor(d.lateral, x);
    if (d.species === 'donor') nd += v;
    else na += v;
  }
  return [nd, na];
}
