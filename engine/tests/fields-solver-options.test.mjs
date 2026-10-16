// DevLog-026 round 2: optics.solver vector wiring, metal policy mapping, group-index methods, mesh.element_order,
// P2 field sampling and export, mesh-only entry point, YAML round-trip helpers. Inputs are the ILLUSTRATIVE analytic
// fixture tests/fixtures/gsg-eo-rf.yaml (closed forms in its header), not literature data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../src/run.mjs';
import { MATERIAL_LIBRARY } from '../src/materials.mjs';
import { parseConfig, opticalOptions } from '../src/config.mjs';
import { buildSectionMesh } from '../src/mesh-entry.mjs';
import { getIn, setIn, applyOverrides, deleteIn } from '../src/yaml-edit.mjs';

const fixture = readFileSync(new URL('./fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
const VPIL = 0.5273796; // fixture header closed form (scalar box mode, uniform field, r33 only)

test('solver: vector path runs optical_mode and eo_overlap, labels and fields follow the solver', () => {
  const s = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'] });
  const v = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'], solver: 'vector', fields: true });
  assert.equal(s.opticalSolver, 'scalar');
  assert.equal(v.opticalSolver, 'vector');
  assert.equal(v.optical.solver, 'vector');
  assert.equal(v.eo.solver, 'vector');
  assert.ok(v.warnings.includes('full_vector_optical') && !v.warnings.includes('scalar_optical_not_full_vector'));
  assert.ok(s.warnings.includes('scalar_optical_not_full_vector'));
  // Closed forms. Scalar (Dirichlet psi on all window sides): the fixture header value. Vector (PEC window): the mode with
  // E = E_x only is uniform in x and sin(pi y / H) in y (TE01 of the PEC box, E_x tangential only on the top and bottom
  // walls), so n_eff = sqrt(n_e^2 - (lambda / 2H)^2) and, with H_y = beta E_x / (omega mu0), the same overlap formula gives
  // VpiL = lambda n_eff g / (2 n_e^4 r33). H = 1.6 um, g = 2 um, n_e = 2.1, r33 = 30 pm/V (fixture inputs).
  const neV = 2.1, lam = 1.55, H = 1.6;
  const neffV = Math.sqrt(neV * neV - (lam / (2 * H)) ** 2);
  const vpilV = (lam * 1e-6 * neffV * 2e-6) / (2 * neV ** 4 * 30e-12) * 100;
  assert.ok(Math.abs(s.metrics.vpi_l_dc_vcm / VPIL - 1) < 2e-3);
  assert.ok(Math.abs(v.metrics.vpi_l_dc_vcm / vpilV - 1) < 2e-3, `${v.metrics.vpi_l_dc_vcm} vs closed form ${vpilV}`);
  assert.ok(Math.abs(v.metrics.n_eff / neffV - 1) < 1e-5, `${v.metrics.n_eff} vs ${neffV}`);
  assert.ok(v.eo.pushPullBalance < -0.99 && v.eo.pushPullBalance > -1.01);
  assert.equal(v.timing.eo.A.reusedOpticalStage, true);
  assert.ok(v.timing.modes && v.timing.opticalModel);
  // Fields: vector components per triangle centroid.
  const o = v.fields.optical;
  assert.equal(o.solver, 'vector');
  const nT = o.tri.length / 3;
  for (const c of ['ex', 'ey', 'ez', 'hx', 'hy', 'hz']) assert.equal(o.modes[0].components[c].length, nT, c);
  assert.ok(o.selectedMode >= 0);
  assert.equal(v.fields.arms.B.solver, 'vector');
});

test('solver: options validation (metal policies, lossy needs a sourced permittivity, group-index methods)', () => {
  const raw = parseConfig(fixture).raw;
  const withOptics = (optics) => ({ ...raw, optics: { ...raw.optics, ...optics } });
  assert.equal(opticalOptions(withOptics({ metal_in_window: 'pec_scalar' }), { solver: 'vector' }).metal, 'pec');
  assert.throws(() => opticalOptions(withOptics({ metal_in_window: 'pec' })), /needs optics.solver: vector/);
  assert.throws(() => opticalOptions(withOptics({ metal_in_window: 'lossy' }), { solver: 'vector' }), /sourced optical permittivity/);
  assert.throws(() => opticalOptions(withOptics({ metal_in_window: 'lossy', metal_permittivity: { metal: [-100, 10] } }), { solver: 'vector' }), /provenance entry/);
  const sourced = { ...withOptics({ metal_in_window: 'lossy', metal_permittivity: { metal: [-100, 10] } }), provenance: { 'optics.metal_permittivity.metal': { class: 'unknown', locator: 'test input' } } };
  assert.deepEqual(opticalOptions(sourced, { solver: 'vector' }).metalPermittivity, { metal: [-100, 10] });
  assert.throws(() => opticalOptions(withOptics({ metal_permittivity: { metal: [-100, 10] } }), { solver: 'vector' }), /only used with metal_in_window: lossy/);
  assert.equal(opticalOptions(withOptics({ group_index_from: undefined })).groupIndex, 'perturbation');
  assert.equal(opticalOptions(withOptics({ group_index_from: 'finite_difference_wavelength' })).groupIndex, 'finite_difference_wavelength');
  assert.throws(() => opticalOptions(withOptics({ vector_order: 3 }), { solver: 'vector' }), /vector_order/);
  assert.throws(() => runCrossSection(fixture, { stages: ['optical_mode'], solver: 'fdtd' }), /solver/);
});

test('group index: perturbation (default) and finite_difference_wavelength agree; vector likewise', () => {
  const text = fixture.replace('group_index_from: fixed', 'group_index_from: perturbation').replace('ng_fixed: 2.2', 'ng_fixed: null');
  const fdText = text.replace('group_index_from: perturbation', 'group_index_from: finite_difference_wavelength');
  const p = runCrossSection(text, { stages: ['optical_mode'] });
  const f = runCrossSection(fdText, { stages: ['optical_mode'] });
  assert.equal(p.optical.groupIndexMethod, 'perturbation');
  assert.equal(f.optical.groupIndexMethod, 'finite_difference_wavelength');
  assert.ok(Math.abs(p.metrics.ng_opt / f.metrics.ng_opt - 1) < 1e-4, `${p.metrics.ng_opt} vs ${f.metrics.ng_opt}`);
  const vp = runCrossSection(text, { stages: ['optical_mode'], solver: 'vector' });
  const vf = runCrossSection(fdText, { stages: ['optical_mode'], solver: 'vector' });
  assert.ok(Math.abs(vp.metrics.ng_opt / vf.metrics.ng_opt - 1) < 1e-4, `${vp.metrics.ng_opt} vs ${vf.metrics.ng_opt}`);
});

test('element order: config key, run override, P2 fields and gradient sampling', () => {
  const p1 = runCrossSection(fixture, { stages: ['eo_overlap'], elementOrder: 1, fields: true });
  const p2text = fixture.replace('window_edge_um: 0.25}', 'window_edge_um: 0.25, element_order: 2}');
  // Same mesh as P1 (p2MeshFactor 1) so the mesh hash comparison below is meaningful; the default factor is 2 (audit F4).
  const p2 = runCrossSection(p2text, { stages: ['eo_overlap'], fields: true, p2MeshFactor: 1 });
  const p2d = runCrossSection(p2text, { stages: [] });
  assert.equal(p2d.p2MeshFactor, 2);
  assert.equal(p2d.electrostaticMeshScale, 2);
  assert.equal(p1.p2MeshFactor, 1);
  assert.ok(p2d.electrostatics.nNodes < p2.electrostatics.nNodes);
  assert.equal(p1.elementOrder, 1);
  assert.equal(p2.elementOrder, 2);
  assert.equal(p2.fields.es.elementOrder, 2);
  assert.ok(p2.fields.es.p2.phiDof.length > p2.fields.es.x.length);
  assert.equal(p2.fields.es.p2.elem.length, 6 * (p2.fields.es.tri.length / 3));
  assert.equal(p1.fields.es.p2, undefined);
  // Uniform gap field: both orders reproduce the closed form (P2 sampled with gradientAt).
  for (const r of [p1, p2]) assert.ok(Math.abs(r.metrics.vpi_l_dc_vcm / VPIL - 1) < 2e-3, String(r.metrics.vpi_l_dc_vcm));
  assert.notEqual(p1.materialHash, p2.materialHash);
  assert.equal(p1.geometryHash, p2.geometryHash);
  assert.throws(() => parseConfig(fixture.replace('window_edge_um: 0.25}', 'window_edge_um: 0.25, element_order: 3}')), /element_order: expected 1 \(P1\) or 2 \(P2\)/);
});

test('mesh entry: strict input and draft preview', () => {
  const m = buildSectionMesh(fixture, { meshScale: 2 });
  assert.equal(m.fromPreview, false);
  assert.equal(m.x.length, m.nNodes);
  assert.equal(m.tri.length, 3 * m.nTris);
  assert.ok(m.triRegion instanceof Int32Array && m.nodeElectrode instanceof Int32Array);
  const draft = fixture.replace('    eps_r: 30\n', '');
  const d = buildSectionMesh(draft, { meshScale: 2 });
  assert.equal(d.fromPreview, true);
  assert.match(d.solveError, /RF permittivity is required/);
  assert.throws(() => buildSectionMesh(fixture, { section: 'nope' }), /Unknown cross-section/);
});

test('yaml helpers: round trip keeps comments and formatting elsewhere', () => {
  const text = '# header comment\nschema: eo-atlas.sim/v1   # trailing\nline: {length_mm: 10, differential: false}\nlist:\n  - {a: 1}\n';
  assert.equal(getIn(text, 'line.length_mm'), 10);
  const t2 = setIn(text, 'line.length_mm', 5);
  assert.match(t2, /# header comment/);
  assert.match(t2, /# trailing/);
  assert.equal(getIn(t2, 'line.length_mm'), 5);
  assert.equal(getIn(applyOverrides(text, [['list.0.a', 2], [['line', 'differential'], true]]), 'list.0.a'), 2);
  assert.equal(getIn(deleteIn(text, 'list'), 'list'), undefined);
  assert.throws(() => getIn('a: [1,', 'a'), /YAML/);
});

test('fields: Pockels delta-n per optical triangle, scalar and vector paths (round 3)', () => {
  // Fixture closed form: uniform E_x = +V_t / 2 um = 5e5 V/m per volt in the right gap (arm A window). x-cut LN,
  // propagation crystal y: lab x = crystal z (n_e, r33), lab y = crystal x (n_o, r13), lab z = crystal y (n_o, r13).
  // dn_xx = -n_e^3 r33 E / 2, dn_yy = dn_zz = -n_o^3 r13 E / 2 (first order), shear zero.
  const E = 5e5, ne = 2.1, no = 2.2, r33 = 30e-12, r13 = 10e-12;
  const want = { dnXX: -(ne ** 3) * r33 * E / 2, dnYY: -(no ** 3) * r13 * E / 2, dnZZ: -(no ** 3) * r13 * E / 2 };
  for (const solver of ['scalar', 'vector']) {
    const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'], solver, fields: true });
    const p = r.fields.optical.pockels;
    const nT = r.fields.optical.tri.length / 3;
    for (const k of ['dnXX', 'dnYY', 'dnZZ', 'dEpsXY']) assert.ok(p[k] instanceof Float64Array && p[k].length === nT, `${solver} ${k}`);
    for (const k of ['dnXX', 'dnYY', 'dnZZ']) {
      let maxErr = 0;
      for (let t = 0; t < nT; t++) maxErr = Math.max(maxErr, Math.abs(p[k][t] / want[k] - 1));
      assert.ok(maxErr < 1e-6, `${solver} ${k} max rel err ${maxErr}`);
    }
    assert.ok(p.dEpsXY.every((v) => Math.abs(v) < 1e-15));
    assert.equal(r.fields.arms.A, r.fields.optical); // arm A reuses the optical stage
    // Arm B (left gap, field -x): opposite sign.
    const b = r.fields.arms.B.pockels;
    assert.ok(Math.abs(b.dnXX[0] / -want.dnXX - 1) < 1e-6, `${solver} arm B ${b.dnXX[0]}`);
    assert.match(p.units.dn, /1\/V/);
  }
  // Absent unless fields are requested.
  assert.equal(runCrossSection(fixture, { stages: ['eo_overlap'] }).fields, undefined);
});

test('yaml helpers: flow collections print without padding', () => {
  const text = '# keep\nline: {length_mm: 10, differential: false}   # trailing\nwin: {x_um: [1, 2], y_um: [3, 4]}\n';
  const t2 = setIn(text, 'line.length_mm', 5);
  assert.match(t2, /^line: \{length_mm: 5, differential: false\}/m);
  assert.match(t2, /^win: \{x_um: \[1, 2\], y_um: \[3, 4\]\}/m);
  assert.match(t2, /# keep/);
  assert.match(t2, /# trailing/);
  assert.ok(!t2.includes('{ '));
  const t3 = applyOverrides(text, [['win.x_um', [0, 5]]]);
  assert.match(t3, /win: \{x_um: \[0, 5\], y_um: \[3, 4\]\}/);
});

test('round 5: vector is the default solver; scalar TM + eo_overlap is rejected (audit F1, F3)', async () => {
  const { parseConfig: pc, stageErrors } = await import('../src/config.mjs');
  const vec = fixture.replace('  solver: scalar          #', '  #');
  assert.equal(opticalOptions(pc(vec).raw).solver, 'vector');
  const s = runCrossSection(fixture, { stages: ['optical_mode'] });
  assert.ok(s.warnings.includes('scalar_optical_approximate'));
  const tm = fixture.replace('polarization: TE', 'polarization: TM');
  assert.throws(() => runCrossSection(tm, { stages: ['eo_overlap'] }), /polarization TM needs optics.solver: vector/);
  assert.match(stageErrors(pc(tm)).eo_overlap, /needs optics.solver: vector/);
  assert.equal(stageErrors(pc(tm), 'geometry', { solver: 'vector' }).eo_overlap, null);
  // TM vector runs; the error for a missing family index names the TM criterion.
  const r = runCrossSection(tm, { stages: ['eo_overlap'], solver: 'vector' });
  assert.ok(r.metrics.vpi_l_dc_vcm > 0 && r.eo.solver === 'vector');
  assert.ok(Number.isFinite(r.eo.arms.A.teFraction) && r.eo.arms.A.teFraction < 0.5);
});

test('round 5: lossy guard, mode_select validation, bounded warm cache (audit F2, F7, F8)', async () => {
  const { lossyModeGuard, warmGet, warmSet, warmCacheStats, WARM_CACHE_MAX_ENTRIES, VECTOR_MAX_DOUBLINGS } = await import('../src/optical-stage.mjs');
  assert.equal(lossyModeGuard({ neff: 1.8604, metalFraction: 1e-8, refNeff: 1.8604, sppIndices: [2.19, 2.27] }), null);
  assert.match(lossyModeGuard({ neff: 2.1157, metalFraction: 0.01, refNeff: 1.8604, sppIndices: [2.19, 2.27] }), /surface-plasmon index/);
  assert.match(lossyModeGuard({ neff: 1.87, metalFraction: 0.2, refNeff: 1.8604, sppIndices: [] }), /20.00 % of \|power\| or \|electric energy\| in metal/);
  // The index-proximity test applies to TM-like modes only (surface plasmons are TM): a TE mode near an SPP index passes.
  assert.equal(lossyModeGuard({ neff: 2.1157, teFraction: 0.99, metalFraction: 0.01, refNeff: 1.8604, sppIndices: [2.19] }), null);
  assert.equal(VECTOR_MAX_DOUBLINGS, 4);
  const raw = parseConfig(fixture).raw;
  const o = (optics, solver = 'vector') => opticalOptions({ ...raw, optics: { ...raw.optics, ...optics } }, { solver });
  assert.deepEqual(o({ mode_select: { by: 'confinement', region: 'medium' } }).modeSelect, { by: 'confinement', region: 'medium' });
  assert.throws(() => o({ mode_select: { by: 'confinement' } }), /region name is required/);
  assert.throws(() => o({ mode_select: { by: 'confinement', region: 'medium' } }, 'scalar'), /needs optics.solver: vector/);
  assert.throws(() => o({ max_metal_power_fraction: 0.1 }), /only used with metal_in_window: lossy/);
  const cache = {};
  for (let i = 0; i < 10; i++) warmSet(cache, `k${i}`, { X: [new Float64Array(1000)], n: 1000 });
  assert.equal(warmCacheStats(cache).entries, WARM_CACHE_MAX_ENTRIES);
  assert.equal(warmGet(cache, 'k0'), null);
  assert.ok(warmGet(cache, 'k9'));
  warmSet(cache, 'big', { X: [new Float64Array(9e6)], n: 9e6 }); // 72 MB > byte bound: older entries evicted
  assert.equal(warmCacheStats(cache).entries, 1);
});

test('yaml helpers: key insertion and deletion splice the source (UI audit W3)', async () => {
  const { readFileSync: rf } = await import('node:fs');
  const lines = (t) => t.split('\n');
  for (const [file, path, value] of [['chen2022', 'geometry.mesh.element_order', 1], ['renaud2023', 'optics.solver', 'vector'], ['renaud2023', 'optics.metal_in_window', 'reject']]) {
    const text = rf(new URL(`../../sims/${file}/config.yaml`, import.meta.url), 'utf8');
    const out = setIn(text, path, value);
    assert.equal(getIn(out, path), value);
    const a = lines(text), b = lines(out);
    const changed = b.filter((l) => !a.includes(l));
    assert.equal(changed.length, 1, `${file} ${path}: ${changed.join(' | ')}`);
    assert.ok(a.filter((l) => !b.includes(l)).length <= 1, `${file} ${path}: more than one original line changed`);
    assert.equal(deleteIn(out, path), text, `${file}: delete restores the original text`);
    if (file === 'chen2022') assert.ok(out.includes('4.1e7'), 'number spelling 4.1e7 kept');
  }
});

test('round 6: low-frequency range, window-edge label, solver-aware scalar label (audit G7, G8)', () => {
  // A kHz drive frequency on the closed-form VpiL target: the estimate is the value scaled by r33_used / max unclamped r33.
  const lf = fixture.replace("source: {locator: 'closed form, header'}}", "source: {locator: 'closed form, header', drive_frequency_hz: 100000}}");
  const r = runCrossSection(lf, { stages: ['eo_overlap'] });
  const t = r.targets.find((x) => x.metric === 'vpi_l_dc_vcm');
  assert.equal(t.lowFrequencyRange.driveFrequencyHz, 1e5);
  assert.equal(t.lowFrequencyRange.r33UsedPmPerV, 30);
  // Largest unclamped r33 among the library alternatives (Weis and Gaylord 1985 Table 4: 34.0, DevLog-038).
  const rMax = Math.max(...Object.entries(MATERIAL_LIBRARY.library.lithium_niobate_congruent.alternatives)
    .filter(([k, v]) => k.startsWith('r_pm_per_v_unclamped') && Number.isFinite(v.value?.r33)).map(([, v]) => v.value.r33));
  assert.equal(rMax, 34.0);
  assert.ok(Math.abs(t.lowFrequencyRange.unclampedEstimate / (t.actual * 30 / rMax) - 1) < 1e-12);
  assert.equal(t.lowFrequencyRange.affectsStatus, false);
  assert.equal(runCrossSection(fixture, { stages: ['eo_overlap'] }).targets.find((x) => x.metric === 'vpi_l_dc_vcm').lowFrequencyRange, undefined);
  // The fixture's vector TE mode fills the PEC box laterally: power at the window edge, label present.
  const v = runCrossSection(fixture, { stages: ['optical_mode'], solver: 'vector' });
  assert.ok(v.optical.windowMarginPowerFraction > 1e-2, String(v.optical.windowMarginPowerFraction));
  assert.ok(v.warnings.includes('vector_mode_power_near_window_edge_above_1e-2'));
  assert.ok(!v.warnings.includes('scalar_optical_not_full_vector'));
  assert.ok(runCrossSection(fixture, { stages: ['optical_mode'] }).warnings.includes('scalar_optical_not_full_vector'));
});

const K4 = readFileSync(new URL('../../validation/cases/K4.yaml', import.meta.url), 'utf8');

test('round 6: vector retry finds a higher TM family index; confinement selection end to end (audit G7)', () => {
  // K4 window (10 x 6 um, continuous slab): TE slab box modes fill the first computed modes; TM mode_index 1 needs the
  // doubling retry (one doubling was not enough before round 5, audit F7).
  const tm1 = runCrossSection(K4.replace('polarization: TE', 'polarization: TM').replace('mode_index: 0', 'mode_index: 1'), { modeOnly: true, stages: ['optical_mode'], meshScale: 2 });
  assert.ok(tm1.optical.teFraction < 0.5);
  assert.ok(tm1.optical.nModesComputed > 4, String(tm1.optical.nModesComputed));
  // mode_select by confinement in the rib returns the rib TE0 (same as the default n_eff order here).
  const sel = runCrossSection(K4.replace('  metal_in_window: absent', '  metal_in_window: absent\n  mode_select: {by: confinement, region: ln_rib_a}'), { modeOnly: true, stages: ['optical_mode'], meshScale: 2 });
  const def = runCrossSection(K4, { modeOnly: true, stages: ['optical_mode'], meshScale: 2 });
  assert.deepEqual(sel.optical.modeSelect, { by: 'confinement', region: 'ln_rib_a' });
  assert.ok(Math.abs(sel.metrics.n_eff - def.metrics.n_eff) < 1e-9);
});

test('round 6: lossy metal, an SPP-dominated window is rejected end to end; a dielectric mode passes (audit G6)', () => {
  const cfg = (layer, extra = '') => `schema: eo-atlas.sim/v1
id: spp-test
materials:
  air: {n: 1.0, eps_r: 1.0}
  glass: {n: 1.45, eps_r: 3.9}
  gold: {conductor: true}
geometry:
  domain: {x_um: [-3, 3], y_um: [-2, 2]}
  regions:
    - {name: ambient, material: air, rect: {x_um: [-3, 3], y_um: [-2, 2]}}
    - {name: layer, material: glass, rect: {x_um: [-3, 3], y_um: [0, ${layer}]}}
  electrodes:
    - {name: pad, role: signal, weight: 1, material: gold, rect: {x_um: [-3, 3], y_um: [-2, 0]}}
    - {name: far, role: ground, weight: 0, material: gold, rect: {x_um: [-3, 3], y_um: [1.8, 2]}}
  optical_window: {x_um: [-1.5, 1.5], y_um: [-0.5, 1.5]}
optics: {solver: vector, wavelength_nm: 1550, polarization: TM, metal_in_window: lossy, metal_permittivity: {gold: [-95, 10]}${extra}}
provenance: {optics.metal_permittivity.gold: {class: unknown, locator: illustrative test value}}
`;
  // 0.2 um glass on gold (illustrative eps -95 - 10j): the TM mode nearest the metal-absent reference carries 5.2 % of its
  // |power| or |electric energy| in the gold (an interface-bound mode), above the stated cap 0.02: the run fails.
  assert.throws(() => runCrossSection(cfg(0.2, ', max_metal_power_fraction: 0.02'), { modeOnly: true, stages: ['optical_mode'] }), /refusing to return a surface plasmon/);
  // K4 lossy TM: the dielectric rib mode (metal fraction about 3e-7) passes and carries the convergence label.
  const k4 = runCrossSection(K4.replace('polarization: TE', 'polarization: TM').replace('  metal_in_window: absent', '  metal_in_window: lossy\n  metal_permittivity: {gold: [-95, 10]}')
    .replace('\nline:', '\nprovenance: {optics.metal_permittivity.gold: {class: unknown, locator: illustrative test value}}\nline:'), { modeOnly: true, stages: ['optical_mode'], meshScale: 2 });
  assert.ok(k4.optical.lossy.metalFraction < 1e-5 && k4.optical.lossy.metalFraction >= 0);
  assert.ok(Math.abs(k4.metrics.n_eff - k4.optical.lossy.metalAbsentReferenceNeff) < 1e-4);
  assert.ok(k4.warnings.includes('lossy_metal_loss_mesh_sensitive_check_convergence'));
});

test('yaml helpers: deleteIn prunes maps it leaves empty (audit G9)', async () => {
  const { readFileSync: rf } = await import('node:fs');
  const text = rf(new URL('../../sims/mao2022/config.yaml', import.meta.url), 'utf8');
  const a = setIn(text, 'optics.mode_select.by', 'te_fraction');
  assert.match(a, /mode_select: \{by: te_fraction\}/);
  assert.equal(deleteIn(a, 'optics.mode_select.by'), text);
  const b = setIn(text, 'extra_block.inner.deep', 1);
  assert.equal(deleteIn(b, 'extra_block.inner.deep'), text);
  // A parent with other keys is kept.
  const c = setIn(setIn(text, 'optics.mode_select.by', 'confinement'), 'optics.mode_select.region', 'film');
  assert.match(deleteIn(c, 'optics.mode_select.region'), /mode_select: \{by: confinement\}/);
});
