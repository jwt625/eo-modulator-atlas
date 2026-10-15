// Parametric cross-section templates (DevLog-023 D5, DevLog-026 S2). A template generates the ordinary `geometry`
// block (regions, electrodes, optical window, mesh hints) and the EO arm windows; downstream code keeps consuming
// polygons and the normal geometry validators run on the result. Physical inputs are required, never defaulted;
// only numerical choices (optical window size) have documented defaults. GPL-3.0-or-later.
//
// tfln_rib_gsg frame (same as the hand-written configs): x lateral, y film normal (up), z propagation; y = 0 at the
// BOX top / film bottom; x = 0 at the centre of arm A (the right-hand waveguide). The signal electrode lies to the
// left of arm A; arm B (push-pull) is the mirror of arm A about the signal centre line.

export const TEMPLATE_TYPES = ['tfln_rib_gsg'];
const TOP_KEYS = ['type', 'materials', 'film_thickness_um', 'etch_depth_um', 'rib_top_width_um', 'sidewall_angle_deg', 'loading_strip',
  'box_thickness_um', 'substrate_thickness_um', 'cladding', 'electrodes', 'arms', 'domain', 'optical_window', 'symmetry', 'mesh', 'boundary'];
const MATERIAL_ROLES = ['film', 'box', 'substrate', 'ambient', 'cladding', 'electrode', 'strip'];
const ELECTRODE_KEYS = ['placement', 'buffer_thickness_um', 'gap_um', 'signal_width_um', 'ground_width_um', 'thickness_um', 'waveguide_offset_um', 'layout'];
/** Clearance between the default optical window and the nearest electrode edge (numerical choice, um). */
export const DEFAULT_WINDOW_CLEARANCE_UM = 0.1;
/** Default optical window: lateral reach beyond the rib (or strip) bottom half-width, and depth into the BOX (um). */
export const DEFAULT_WINDOW_REACH_UM = 2.0;
export const DEFAULT_WINDOW_DEPTH_UM = 1.5;
export const DEFAULT_WINDOW_HEIGHT_UM = 1.0;

const fail = (p, m) => { throw new Error(`${p}: ${m}`); };
const obj = (v, p) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p, 'expected an object'); return v; };
const keys = (v, allowed, p) => { obj(v, p); for (const k of Object.keys(v)) if (!allowed.includes(k)) fail(`${p}.${k}`, 'unsupported field'); };
const num = (v, p, { min = -Infinity, positive = false, nonNegative = false } = {}) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(p, 'expected a finite number');
  if (positive && !(v > 0)) fail(p, 'expected a positive number');
  if (nonNegative && v < 0) fail(p, 'expected a number >= 0');
  if (v < min) fail(p, `expected at least ${min}`);
  return v;
};
const oneOf = (v, opts, p) => { if (!opts.includes(v)) fail(p, `expected one of ${opts.join(', ')}`); return v; };
const str = (v, p) => { if (typeof v !== 'string' || !v) fail(p, 'expected a non-empty string'); return v; };
const rect = (x0, x1, y0, y1) => ({ x_um: [x0, x1], y_um: [y0, y1] });
// Round generated coordinates to 1e-9 um so that float noise of the arithmetic never shows up in the polygons.
const r9 = (v) => Math.round(v * 1e9) / 1e9;

/**
 * Generate geometry from a template block.
 * @param {any} t the (expression-substituted) `template` block
 * @returns {{geometry:any, armWindows:{A:{x_um:number[],y_um:number[]}, B:{x_um:number[],y_um:number[]}|null}, arms:'push_pull'|'single', summary:any}}
 */
export function expandTemplate(t, path = 'template') {
  obj(t, path);
  const type = oneOf(t.type, TEMPLATE_TYPES, `${path}.type`);
  if (type === 'tfln_rib_gsg') return tflnRibGsg(t, path);
  return fail(`${path}.type`, 'unknown template');
}

function tflnRibGsg(t, path) {
  keys(t, TOP_KEYS, path);
  const m = obj(t.materials, `${path}.materials`);
  keys(m, MATERIAL_ROLES, `${path}.materials`);
  for (const role of ['film', 'box', 'substrate', 'ambient', 'electrode']) str(m[role], `${path}.materials.${role}`);
  const film = num(t.film_thickness_um, `${path}.film_thickness_um`, { positive: true });
  const etch = num(t.etch_depth_um, `${path}.etch_depth_um`, { nonNegative: true });
  if (etch >= film) fail(`${path}.etch_depth_um`, 'must be smaller than film_thickness_um (a full etch is not a rib)');
  const etched = etch > 0;
  const ySlab = film - etch;
  let ribTop = null, ribBottom = null, angle = null, strip = null;
  if (etched) {
    ribTop = num(t.rib_top_width_um, `${path}.rib_top_width_um`, { positive: true });
    angle = num(t.sidewall_angle_deg, `${path}.sidewall_angle_deg`, { positive: true });
    if (angle > 90) fail(`${path}.sidewall_angle_deg`, 'measured from horizontal, at most 90 (vertical)');
    ribBottom = angle === 90 ? ribTop : ribTop + (2 * etch) / Math.tan((angle * Math.PI) / 180);
    if (t.loading_strip != null) fail(`${path}.loading_strip`, 'only for an unetched film (etch_depth_um: 0)');
  } else {
    for (const k of ['rib_top_width_um', 'sidewall_angle_deg']) if (t[k] != null) fail(`${path}.${k}`, 'not used for an unetched film (etch_depth_um: 0)');
    // An unetched film without a loading strip has no lateral guide; the window would confine a slab mode (audit A7).
    if (t.loading_strip == null) fail(`${path}.loading_strip`, 'required for an unetched film (etch_depth_um: 0); without it there is no lateral waveguide');
    {
      keys(t.loading_strip, ['width_um', 'thickness_um'], `${path}.loading_strip`);
      strip = { w: num(t.loading_strip.width_um, `${path}.loading_strip.width_um`, { positive: true }),
        h: num(t.loading_strip.thickness_um, `${path}.loading_strip.thickness_um`, { positive: true }) };
      str(m.strip, `${path}.materials.strip`);
    }
  }
  const box = num(t.box_thickness_um, `${path}.box_thickness_um`, { positive: true });
  const sub = num(t.substrate_thickness_um, `${path}.substrate_thickness_um`, { positive: true });
  let clad = null;
  if (t.cladding != null && t.cladding !== 'none') {
    keys(t.cladding, ['thickness_um', 'from'], `${path}.cladding`);
    const from = oneOf(t.cladding.from ?? 'slab_top', ['slab_top', 'film_top'], `${path}.cladding.from`);
    const th = num(t.cladding.thickness_um, `${path}.cladding.thickness_um`, { positive: true });
    str(m.cladding, `${path}.materials.cladding`);
    clad = { y0: ySlab, y1: (from === 'slab_top' ? ySlab : film) + th };
    if (clad.y1 <= film && etched) fail(`${path}.cladding.thickness_um`, 'cladding top would lie at or below the rib top');
  } else if (m.cladding != null) fail(`${path}.materials.cladding`, 'given without a cladding block');
  if (!strip && m.strip != null) fail(`${path}.materials.strip`, 'given without a loading_strip block');

  const e = obj(t.electrodes, `${path}.electrodes`);
  keys(e, ELECTRODE_KEYS, `${path}.electrodes`);
  const placement = oneOf(e.placement, ['on_slab', 'on_buffer', 'on_cladding'], `${path}.electrodes.placement`);
  const gap = num(e.gap_um, `${path}.electrodes.gap_um`, { positive: true });
  const ws = num(e.signal_width_um, `${path}.electrodes.signal_width_um`, { positive: true });
  const wg = num(e.ground_width_um, `${path}.electrodes.ground_width_um`, { positive: true });
  const te = num(e.thickness_um, `${path}.electrodes.thickness_um`, { positive: true });
  const offset = num(e.waveguide_offset_um ?? 0, `${path}.electrodes.waveguide_offset_um`);
  const layout = oneOf(e.layout ?? 'gsg', ['gsg', 'gs'], `${path}.electrodes.layout`);
  const arms = oneOf(t.arms, ['push_pull', 'single'], `${path}.arms`);
  if (arms === 'push_pull' && layout !== 'gsg') fail(`${path}.electrodes.layout`, 'push_pull needs the gsg layout (one arm per gap)');
  let yE0;
  if (placement === 'on_slab') { if (e.buffer_thickness_um != null) fail(`${path}.electrodes.buffer_thickness_um`, 'only for placement on_buffer'); yE0 = ySlab; }
  else if (placement === 'on_buffer') {
    const b = num(e.buffer_thickness_um, `${path}.electrodes.buffer_thickness_um`, { positive: true });
    if (!clad) fail(`${path}.electrodes.placement`, 'on_buffer needs a cladding block (the buffer is cladding material)');
    if (ySlab + b > clad.y1) fail(`${path}.electrodes.buffer_thickness_um`, 'buffer reaches above the cladding top');
    yE0 = ySlab + b;
  } else {
    if (e.buffer_thickness_um != null) fail(`${path}.electrodes.buffer_thickness_um`, 'only for placement on_buffer');
    if (!clad) fail(`${path}.electrodes.placement`, 'on_cladding needs a cladding block');
    yE0 = clad.y1;
  }
  const yE1 = yE0 + te;

  // Lateral layout. Arm A centre x = 0; gap A centre displaced from the waveguide away from the signal by `offset`.
  const halfFoot = etched ? ribBottom / 2 : strip ? strip.w / 2 : 0;
  const xg = offset;
  const sigR = xg - gap / 2;
  const sigL = sigR - ws;
  const xs = (sigL + sigR) / 2;
  const grR = [xg + gap / 2, xg + gap / 2 + wg];
  const mirror = (x) => 2 * xs - x;
  const grL = [mirror(grR[1]), mirror(grR[0])];
  const xB = arms === 'push_pull' ? mirror(0) : null;
  // The waveguide footprint (rib bottom or strip) must lie inside its gap when the electrodes reach down to it.
  // Strict clearance: an electrode touching the rib corner is rejected too (audit A6).
  if (placement !== 'on_cladding' && (-halfFoot <= sigR || halfFoot >= grR[0])) fail(`${path}.electrodes`, 'the waveguide footprint touches or overlaps an electrode (check gap_um, waveguide_offset_um and the rib width)');

  const electrodes = [
    { name: 'signal', role: 'signal', weight: 1.0, material: m.electrode, rect: rect(r9(sigL), r9(sigR), r9(yE0), r9(yE1)) },
    { name: 'ground_r', role: 'ground', weight: 0.0, material: m.electrode, rect: rect(r9(grR[0]), r9(grR[1]), r9(yE0), r9(yE1)) },
  ];
  if (layout === 'gsg') electrodes.push({ name: 'ground_l', role: 'ground', weight: 0.0, material: m.electrode, rect: rect(r9(grL[0]), r9(grL[1]), r9(yE0), r9(yE1)) });
  const xMinE = layout === 'gsg' ? grL[0] : sigL;
  const xMaxE = grR[1];

  // Domain: explicit, or margins around the electrodes and air above the top of the stack.
  const d = obj(t.domain, `${path}.domain`);
  const stackTop = Math.max(film, clad ? clad.y1 : -Infinity, yE1, strip ? film + strip.h : -Infinity);
  let dom;
  if (d.x_um != null || d.y_um != null) {
    keys(d, ['x_um', 'y_um'], `${path}.domain`);
    dom = { x: interval(d.x_um, `${path}.domain.x_um`), y: interval(d.y_um, `${path}.domain.y_um`) };
  } else {
    keys(d, ['margin_x_um', 'air_above_um'], `${path}.domain`);
    const mx = num(d.margin_x_um, `${path}.domain.margin_x_um`, { positive: true });
    const air = num(d.air_above_um, `${path}.domain.air_above_um`, { positive: true });
    dom = { x: [r9(xMinE - mx), r9(xMaxE + mx)], y: [r9(-(box + sub)), r9(stackTop + air)] };
  }
  if (dom.x[0] > xMinE || dom.x[1] < xMaxE) fail(`${path}.domain.x_um`, 'must contain every electrode');
  if (dom.y[1] < stackTop) fail(`${path}.domain.y_um`, 'must contain the top of the stack');
  if (dom.y[0] > -box) fail(`${path}.domain.y_um`, 'must reach below the BOX into the substrate');

  const X = dom.x;
  const regions = [
    { name: 'ambient', material: m.ambient, rect: rect(X[0], X[1], dom.y[0], dom.y[1]) },
    // Regions are clipped to the domain (audit A9); the domain bottom lies below the BOX (checked above).
    { name: 'substrate', material: m.substrate, rect: rect(X[0], X[1], r9(Math.max(-(box + sub), dom.y[0])), r9(-box)) },
    { name: 'box', material: m.box, rect: rect(X[0], X[1], r9(-box), 0) },
    { name: etched ? 'slab' : 'film', material: m.film, rect: rect(X[0], X[1], 0, r9(ySlab)) },
  ];
  if (clad) regions.push({ name: 'cladding', material: m.cladding, rect: rect(X[0], X[1], r9(clad.y0), r9(clad.y1)) });
  const waveguide = (xc, suffix) => {
    if (etched) {
      if (angle === 90) return { name: `rib_${suffix}`, material: m.film, rect: rect(r9(xc - ribTop / 2), r9(xc + ribTop / 2), r9(ySlab), r9(film)) };
      return { name: `rib_${suffix}`, material: m.film, polygon_um: [[r9(xc - ribBottom / 2), r9(ySlab)], [r9(xc + ribBottom / 2), r9(ySlab)], [r9(xc + ribTop / 2), r9(film)], [r9(xc - ribTop / 2), r9(film)]] };
    }
    if (strip) return { name: `strip_${suffix}`, material: m.strip, rect: rect(r9(xc - strip.w / 2), r9(xc + strip.w / 2), r9(film), r9(film + strip.h)) };
    return null;
  };
  for (const [xc, s] of [[0, 'r'], ...(xB == null ? [] : [[xB, 'l']])]) {
    if (xc - halfFoot < X[0] || xc + halfFoot > X[1]) fail(`${path}.domain.x_um`, 'must contain every waveguide');
    const w = waveguide(xc, s);
    if (w) regions.push(w);
  }

  // Optical windows (numerical choice): inside the gap with a clearance, unless given explicitly.
  const ow = t.optical_window ?? {};
  keys(ow, ['half_width_um', 'y_um'], `${path}.optical_window`);
  const clearance = placement === 'on_cladding' ? Infinity : Math.min(-sigR, grR[0]) - DEFAULT_WINDOW_CLEARANCE_UM;
  const hw = ow.half_width_um != null ? num(ow.half_width_um, `${path}.optical_window.half_width_um`, { positive: true })
    : r9(Math.min(clearance, halfFoot + DEFAULT_WINDOW_REACH_UM));
  // The default window must contain the whole waveguide footprint (audit A6).
  if (ow.half_width_um == null && !(hw > halfFoot)) fail(`${path}.optical_window`, `the default window half width ${hw} um does not clear the waveguide footprint (half width ${r9(halfFoot)} um) inside the gap; give optical_window.half_width_um explicitly`);
  // on_cladding: the electrodes may lie above the waveguide laterally, so the default window stops at their bottom (audit A8).
  const yTopDefault = Math.min(dom.y[1], Math.max(film, strip ? film + strip.h : film) + DEFAULT_WINDOW_HEIGHT_UM, placement === 'on_cladding' ? yE0 : Infinity);
  const wy = ow.y_um != null ? interval(ow.y_um, `${path}.optical_window.y_um`)
    : [r9(-Math.min(box, DEFAULT_WINDOW_DEPTH_UM)), r9(yTopDefault)];
  if (!(wy[1] > Math.max(film, strip ? film + strip.h : film))) fail(`${path}.optical_window.y_um`, 'the window top must lie above the film (and strip) top');
  const winA = { x_um: [r9(-hw), r9(hw)], y_um: wy };
  const winB = xB == null ? null : { x_um: [r9(xB - hw), r9(xB + hw)], y_um: [...wy] };

  const geometry = { symmetry: oneOf(t.symmetry ?? 'none', ['none'], `${path}.symmetry`), domain: { x_um: [...X], y_um: [...dom.y] }, regions, electrodes, optical_window: winA };
  if (t.mesh != null) geometry.mesh = { ...obj(t.mesh, `${path}.mesh`) };
  if (t.boundary != null) geometry.boundary = { ...obj(t.boundary, `${path}.boundary`) };
  return {
    geometry,
    armWindows: { A: winA, B: winB },
    arms,
    summary: { signalCentreUm: r9(xs), armBCentreUm: xB == null ? null : r9(xB), slabTopUm: r9(ySlab), electrodeBottomUm: r9(yE0), ribBottomWidthUm: ribBottom == null ? null : r9(ribBottom) },
  };
}

function interval(v, p) {
  if (!Array.isArray(v) || v.length !== 2) fail(p, 'expected [min, max]');
  v.forEach((x) => num(x, p));
  if (!(v[1] > v[0])) fail(p, 'max must exceed min');
  return [...v];
}
