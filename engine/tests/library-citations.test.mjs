// engine/data/materials.json `library`: every value carries its source, locator, condition and verification level;
// config `library:` resolution and per-key override semantics (DevLog-026 S1).
import test from 'node:test';
import assert from 'node:assert/strict';
import { stringify } from 'yaml';
import { MATERIAL_LIBRARY } from '../src/materials.mjs';
import { parseConfig } from '../src/config.mjs';

const FIELDS = ['eps_r', 'r_pm_per_v', 'sigma_Sm'];

test('library: every entry value has a verified citation record', () => {
  const lib = MATERIAL_LIBRARY.library;
  assert.ok(lib && Object.keys(lib).length >= 4);
  for (const [key, entry] of Object.entries(lib)) {
    const present = FIELDS.filter((f) => entry[f]);
    assert.ok(present.length, `${key} has no constants`);
    for (const f of present) {
      const v = entry[f];
      for (const k of ['value', 'condition', 'source_read', 'locator', 'verification', 'verified_on']) assert.ok(v[k] != null && v[k] !== '', `${key}.${f}.${k}`);
      assert.ok(['primary', 'secondary_open_access'].includes(v.verification), `${key}.${f}.verification`);
      assert.match(v.verified_on, /^\d{4}-\d{2}-\d{2}$/);
      if (v.verification === 'secondary_open_access') assert.ok(v.primary_cited, `${key}.${f}.primary_cited`);
    }
    if (entry.dispersion) assert.ok(MATERIAL_LIBRARY.materials[entry.dispersion], `${key}.dispersion`);
  }
  const ln = lib.lithium_niobate_congruent;
  assert.deepEqual(ln.eps_r.value, { perp: 44.0, par: 27.9 });
  assert.match(ln.eps_r.condition, /clamped/);
  assert.deepEqual(ln.r_pm_per_v.value, { r13: 8.6, r22: 3.4, r33: 30.8, r51: 28.0 });
  assert.match(ln.r_pm_per_v.condition, /clamped/);
  assert.ok(Math.abs(lib.gold_bulk_293k.sigma_Sm.value - 1 / 2.214e-8) / 4.5e7 < 1e-4);
  assert.ok(MATERIAL_LIBRARY.missing.lithium_tantalate_rf_eo, 'LiTaO3 RF/EO listed as missing');
  // Alternatives (not applied by library:): every one carries the same citation record; vendor values verified 2026-10-15.
  for (const [k, v] of Object.entries(ln.alternatives)) {
    for (const f of ['value', 'condition', 'source_read', 'locator', 'verification', 'verified_on']) assert.ok(v[f] != null && v[f] !== '', `alternatives.${k}.${f}`);
    assert.ok(['secondary_open_access', 'secondary_vendor'].includes(v.verification), k);
  }
  assert.deepEqual(ln.alternatives.eps_r_unclamped_vendor.value, { perp: 85.0, par: 28.7 });
  assert.deepEqual(ln.alternatives.r_pm_per_v_unclamped_vendor.value, { r13: 10.0, r22: 7.0, r33: 33.0, r51: 33.0 });
  assert.match(ln.r_pm_per_v.condition, /r51/);
});

const cfg = (materials) => stringify({
  schema: 'eo-atlas.sim/v1', id: 'lib-test', materials,
  geometry: {
    domain: { x_um: [-5, 5], y_um: [-1, 1] },
    regions: [{ name: 'm', material: 'ln', rect: { x_um: [-5, 5], y_um: [-1, 1] } }],
    electrodes: [{ name: 's', role: 'signal', material: 'au', weight: 1, rect: { x_um: [-1, 1], y_um: [-1, 1] } },
      { name: 'g', role: 'ground', material: 'au', weight: 0, rect: { x_um: [3, 5], y_um: [-1, 1] } }],
  },
});

test('library: resolution, one-level override and provenance report', () => {
  const p = parseConfig(cfg({ ln: { library: 'lithium_niobate_congruent', crystal: { cut: 'x', propagation: 'y' }, eps_r: { par: 28 }, r_pm_per_v: { r33: 31 } },
    au: { library: 'gold_bulk_293k' } }));
  assert.deepEqual(p.raw.materials.ln.eps_r, { perp: 44.0, par: 28 });
  assert.deepEqual(p.raw.materials.ln.r_pm_per_v, { r13: 8.6, r22: 3.4, r33: 31, r51: 28.0 });
  assert.equal(p.raw.materials.ln.dispersion, 'lithium_niobate');
  assert.equal(p.materials.au.sigmaS, 4.5167e7);
  assert.ok(p.materials.au.conductor);
  const s = p.materialSources.ln;
  assert.equal(s.library, 'lithium_niobate_congruent');
  assert.deepEqual(s.overridden.sort(), ['eps_r.par', 'r_pm_per_v.r33']);
  assert.ok(s.fromLibrary.includes('eps_r.perp') && s.fromLibrary.includes('r_pm_per_v.r51'));
  assert.equal(s.citations.eps_r.verification, 'secondary_open_access');
  // A scalar override replaces the whole field.
  const q = parseConfig(cfg({ ln: { library: 'lithium_niobate_congruent', crystal: { cut: 'x', propagation: 'y' }, eps_r: 30 }, au: { conductor: true } }));
  assert.equal(q.raw.materials.ln.eps_r, 30);
  assert.deepEqual(q.materialSources.ln.overridden, ['eps_r']);
  assert.throws(() => parseConfig(cfg({ ln: { library: 'unobtainium' }, au: { conductor: true } })), /unknown library key unobtainium/);
  assert.throws(() => parseConfig(cfg({ ln: { library: 'silicon' }, au: { library: 'gold_bulk_293k', conductor: false } })), /is a conductor/);
});

test('library: renaud2023 now parses (RF permittivity from the library)', async () => {
  const { readFileSync } = await import('node:fs');
  const p = parseConfig(readFileSync(new URL('../../sims/renaud2023/config.yaml', import.meta.url), 'utf8'));
  assert.deepEqual(p.raw.materials.lithium_niobate.eps_r, { perp: 44.0, par: 27.9 });
  assert.equal(p.raw.materials.silicon_dioxide.eps_r, 3.9);
  assert.equal(p.raw.optics.wavelength_nm, 738);
  assert.equal(p.raw.optics.eo.arm_windows.B.x_um[0] < -50, true);
});
