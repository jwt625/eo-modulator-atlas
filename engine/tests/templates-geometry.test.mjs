// templates.mjs tfln_rib_gsg: generated geometry is valid input, reproduces hand-written layouts, rejects bad inputs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stringify } from 'yaml';
import { expandTemplate } from '../src/templates.mjs';
import { parseConfig, stageErrors } from '../src/config.mjs';

const base = () => ({
  type: 'tfln_rib_gsg',
  materials: { film: 'ln', box: 'ox', substrate: 'si', ambient: 'air', cladding: 'ox', electrode: 'au' },
  film_thickness_um: 0.6, etch_depth_um: 0.3, rib_top_width_um: 1.0, sidewall_angle_deg: 60, box_thickness_um: 4.7, substrate_thickness_um: 20,
  cladding: { thickness_um: 1.0, from: 'film_top' },
  electrodes: { placement: 'on_slab', gap_um: 5, signal_width_um: 20, ground_width_um: 40, thickness_um: 0.8 },
  arms: 'push_pull', domain: { margin_x_um: 30, air_above_um: 10 },
});
const materials = {
  ln: { crystal: { cut: 'x', propagation: 'y' }, n_o: 2.21, n_e: 2.14, eps_r: { perp: 40, par: 30 }, r_pm_per_v: { r33: 30 } },
  ox: { n: 1.44, eps_r: 4 }, si: { n: 3.48, eps_r: 12 }, air: { n: 1, eps_r: 1 }, au: { conductor: true },
};
const config = (template, extra = {}) => stringify({ schema: 'eo-atlas.sim/v1', id: 'template-test', materials, template,
  optics: { wavelength_nm: 1550, polarization: 'TE', group_index_from: 'fixed', ng_fixed: 2.2, eo: { arm_drive: template.arms === 'push_pull' ? 'two_arm_field_resolved' : 'single_arm', terminal_drive: 'single_ended' } }, ...extra });

test('templates: sloped rib push-pull layout geometry and arm windows', () => {
  const out = expandTemplate(base());
  const g = out.geometry;
  const rib = g.regions.find((r) => r.name === 'rib_r');
  const bottom = 1.0 + (2 * 0.3) / Math.tan(Math.PI / 3);
  assert.ok(Math.abs(rib.polygon_um[1][0] - rib.polygon_um[0][0] - bottom) < 1e-8);
  assert.deepEqual(rib.polygon_um[2], [0.5, 0.6]);
  const sig = g.electrodes.find((e) => e.name === 'signal').rect;
  assert.deepEqual(sig.x_um, [-22.5, -2.5]);
  assert.deepEqual(sig.y_um, [0.3, 1.1]);
  assert.deepEqual(g.electrodes.find((e) => e.name === 'ground_r').rect.x_um, [2.5, 42.5]);
  assert.deepEqual(g.electrodes.find((e) => e.name === 'ground_l').rect.x_um, [-67.5, -27.5]);
  assert.equal(out.summary.armBCentreUm, -25);
  assert.deepEqual(g.domain, { x_um: [-97.5, 72.5], y_um: [-24.7, 11.6] });
  assert.deepEqual(out.armWindows.A.x_um, [-2.4, 2.4]); // gap edge 2.5 minus 0.1 clearance
  assert.deepEqual(out.armWindows.B.x_um, [-27.4, -22.6]);
  assert.deepEqual(out.armWindows.A.y_um, [-1.5, 1.6]);
  assert.equal(g.regions.map((r) => r.name).join(','), 'ambient,substrate,box,slab,cladding,rib_r,rib_l');
});

test('templates: generated geometry passes the config validators and readiness', () => {
  const parsed = parseConfig(config(base()));
  assert.equal(parsed.geometries.geometry.regions.length, 7);
  assert.equal(parsed.raw.optics.eo.arm_windows.B.x_um[0], -27.4);
  const ready = stageErrors(parsed);
  assert.equal(ready.electrostatics, null);
  assert.equal(ready.optical_mode, null);
  assert.equal(ready.eo_overlap, null);
  assert.equal(parsed.template.arms, 'push_pull');
});

test('templates: variants (unetched with loading strip, single arm, buffer, cladding placement)', () => {
  const strip = expandTemplate({ ...base(), etch_depth_um: 0, rib_top_width_um: undefined, sidewall_angle_deg: undefined,
    materials: { ...base().materials, strip: 'si' }, loading_strip: { width_um: 1, thickness_um: 0.07 } });
  assert.deepEqual(strip.geometry.regions.find((r) => r.name === 'strip_r').rect, { x_um: [-0.5, 0.5], y_um: [0.6, 0.67] });
  assert.equal(strip.geometry.regions[3].name, 'film');
  const single = expandTemplate({ ...base(), arms: 'single', electrodes: { ...base().electrodes, layout: 'gs' } });
  assert.equal(single.armWindows.B, null);
  assert.deepEqual(single.geometry.electrodes.map((e) => e.name), ['signal', 'ground_r']);
  assert.ok(!single.geometry.regions.some((r) => r.name === 'rib_l'));
  parseConfig(config({ ...base(), arms: 'single' }));
  const buf = expandTemplate({ ...base(), electrodes: { ...base().electrodes, placement: 'on_buffer', buffer_thickness_um: 0.2 } });
  assert.deepEqual(buf.geometry.electrodes[0].rect.y_um, [0.5, 1.3]);
  const top = expandTemplate({ ...base(), electrodes: { ...base().electrodes, placement: 'on_cladding' } });
  assert.deepEqual(top.geometry.electrodes[0].rect.y_um, [1.6, 2.4]);
  // Audit A8: with electrodes on a thin cladding the default window stops at the electrode bottom.
  const thin = expandTemplate({ ...base(), cladding: { thickness_um: 0.5, from: 'film_top' }, electrodes: { ...base().electrodes, placement: 'on_cladding' } });
  assert.equal(thin.armWindows.A.y_um[1], 1.1);
  assert.deepEqual(thin.geometry.electrodes[0].rect.y_um, [1.1, 1.9]);
  // Audit A9: generated regions are clipped to an explicit domain.
  const clip = expandTemplate({ ...base(), domain: { x_um: [-100, 80], y_um: [-10, 10] } });
  assert.deepEqual(clip.geometry.regions.find((r) => r.name === 'substrate').rect.y_um, [-10, -4.7]);
  assert.throws(() => expandTemplate({ ...base(), domain: { x_um: [-66, 80], y_um: [-10, 10] } }), /must contain every electrode/);
  const vert = expandTemplate({ ...base(), sidewall_angle_deg: 90 });
  assert.deepEqual(vert.geometry.regions.find((r) => r.name === 'rib_r').rect, { x_um: [-0.5, 0.5], y_um: [0.3, 0.6] });
});

test('templates: invalid inputs are rejected with paths', () => {
  const bad = (patch, re) => assert.throws(() => expandTemplate({ ...base(), ...patch }), re);
  bad({ etch_depth_um: 0.6 }, /etch_depth_um: must be smaller/);
  bad({ sidewall_angle_deg: 95 }, /at most 90/);
  bad({ sidewall_angle_deg: undefined }, /sidewall_angle_deg: expected a finite number/);
  bad({ film_thickness_um: -1 }, /film_thickness_um: expected a positive number/);
  bad({ electrodes: { ...base().electrodes, gap_um: 1 } }, /footprint touches or overlaps an electrode/);
  // Audit A6: a rib whose bottom exactly fills the gap touches the electrodes; a gap only slightly wider leaves no
  // room for a default window that contains the rib.
  const bottom = 1.0 + (2 * 0.3) / Math.tan(Math.PI / 3);
  bad({ electrodes: { ...base().electrodes, gap_um: bottom } }, /touches or overlaps/);
  bad({ electrodes: { ...base().electrodes, gap_um: bottom + 0.1 } }, /does not clear the waveguide footprint/);
  // Audit A7: an unetched film needs a loading strip.
  bad({ etch_depth_um: 0, rib_top_width_um: undefined, sidewall_angle_deg: undefined }, /loading_strip: required for an unetched film/);
  bad({ electrodes: { ...base().electrodes, placement: 'on_buffer' } }, /buffer_thickness_um: expected a finite number/);
  bad({ electrodes: { ...base().electrodes, layout: 'gs' } }, /push_pull needs the gsg layout/);
  bad({ cladding: undefined, materials: { ...base().materials, cladding: undefined }, electrodes: { ...base().electrodes, placement: 'on_cladding' } }, /on_cladding needs a cladding block/);
  bad({ cladding: undefined }, /materials.cladding: given without a cladding block/);
  bad({ loading_strip: { width_um: 1, thickness_um: 0.1 } }, /only for an unetched film/);
  bad({ domain: { x_um: [-10, 10], y_um: [-30, 20] } }, /must contain every electrode/);
  bad({ extra: 1 }, /template.extra: unsupported field/);
  bad({ materials: { ...base().materials, film: undefined } }, /materials.film: expected a non-empty string/);
  bad({ type: 'zcut' }, /template.type: expected one of tfln_rib_gsg/);
  assert.throws(() => parseConfig(config(base(), { geometry: { domain: { x_um: [0, 1], y_um: [0, 1] } } })), /either template or geometry/);
  assert.throws(() => parseConfig(stringify({ schema: 'eo-atlas.sim/v1', id: 'x', materials, template: base(),
    optics: { wavelength_nm: 1550, polarization: 'TE', group_index_from: 'fixed', ng_fixed: 2, eo: { arm_drive: 'single_arm', terminal_drive: 'single_ended' } } })), /does not match template arms push_pull/);
});

test('templates: rewritten paper configs carry params, template and generated arm windows', () => {
  for (const [id, a, b] of [['arabjuneghani2022', [-2, 2], [-28.8, -24.8]], ['mao2022', [-2.9, 2.9], [-24.9, -19.1]]]) {
    const p = parseConfig(readFileSync(new URL(`../../sims/${id}/config.yaml`, import.meta.url), 'utf8'));
    assert.deepEqual(p.raw.optics.eo.arm_windows.A.x_um, a, id);
    assert.deepEqual(p.raw.optics.eo.arm_windows.B.x_um, b, id);
    assert.ok(Object.keys(p.params.values).length > 5, id);
  }
});
