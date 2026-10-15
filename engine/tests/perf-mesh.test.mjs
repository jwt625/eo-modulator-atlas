// Mesher conformity (DevLog-024 R2.1): every region interface is a union of mesh edges, so each region's mesh area
// equals its polygon area to round-off and no triangle straddles an interface. Regression for the DevLog-025 finding
// (points on a subsegment's diametral circle deleted the subsegment without a re-split).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpticalModel } from '../src/optics.mjs';
import { geom, rect, mats, section } from './helpers.mjs';

function regionAreas(m, nRegions) {
  const a = new Float64Array(nRegions);
  for (let t = 0; t < m.nTris; t++) {
    const [i, j, k] = [0, 1, 2].map((q) => m.tri[3 * t + q]);
    a[m.triRegion[t]] += 0.5 * Math.abs((m.x[j] - m.x[i]) * (m.y[k] - m.y[i]) - (m.x[k] - m.x[i]) * (m.y[j] - m.y[i]));
  }
  return a;
}

function slabModel(domain, core, hints) {
  const g = geom({ domain, regions: [{ name: 'clad', material: 'clad', poly: rect(domain.x[0], domain.x[1], domain.y[0], domain.y[1]) }, { name: 'core', material: 'core', poly: core }],
    optical_window: domain });
  return buildOpticalModel(section(g), mats({ core: { n: 2, eps_r: 4 }, clad: { n: 1.45, eps_r: 2 } }), { polarization: 'TE', lambda0Um: 1.55, hints });
}

test('DevLog-025 reproductions mesh conformingly (core area exact, interface segments present)', () => {
  const cases = [
    [{ x: [0, 0.3], y: [-4, 4] }, rect(0, 0.3, -0.3, 0.3), 0.18],
    [{ x: [-3, 3], y: [0, 0.6] }, rect(-0.3, 0.3, 0, 0.6), 0.36],
  ];
  for (const [domain, core, exact] of cases) {
    const model = slabModel(domain, core, { core_edge_um: 0.05, max_edge_um: 0.1 });
    const a = regionAreas(model.mesh, 2);
    assert.ok(Math.abs(a[1] - exact) < 1e-12 * exact, `core area ${a[1]} vs ${exact}`);
    assert.equal(model.mesh.stats.nRepair, 0);
  }
});

test('core area is exact over a sweep of core sizes and size hints', () => {
  for (const w of [0.2, 0.3, 0.45]) for (const ce of [0.02, 0.03, 0.04, 0.05, 0.06]) {
    const model = slabModel({ x: [0, w], y: [-2, 2] }, rect(0, w, -0.3, 0.3), { core_edge_um: ce, max_edge_um: 2 * ce });
    const a = regionAreas(model.mesh, 2);
    assert.ok(Math.abs(a[1] - 0.6 * w) < 1e-12, `w ${w} core_edge ${ce}: ${a[1]} vs ${0.6 * w}`);
  }
});

test('Wheeler recess drops material interfaces by default (no d-thin slivers) and keeps hinted regions (R2.2)', async () => {
  const { recessGeometry } = await import('../src/recess.mjs');
  const g = geom({ domain: { x: [-20, 20], y: [-5, 5] },
    regions: [{ name: 'air', material: 'air', poly: rect(-20, 20, -5, 5) }, { name: 'clad', material: 'ox', poly: rect(-20, 20, 0, 2) }, { name: 'rib', material: 'ln', poly: rect(-1, 1, 0, 0.5) }],
    electrodes: [{ name: 's', weight: 1, poly: rect(2, 10, 0, 2) }, { name: 'g', weight: 0, poly: rect(-10, -2, 0, 2) }], mesh: { regions: { rib: 0.05 } } });
  const bg = recessGeometry(g, 0.03);
  assert.deepEqual(bg.regions.map((r) => r.name), ['air', 'rib']);
  assert.deepEqual(bg.regions[0].poly, rect(-20, 20, -5, 5));
  const keep = recessGeometry(g, 0.03, { regions: 'keep' });
  assert.deepEqual(keep.regions.map((r) => r.name), ['air', 'clad', 'rib']);
  assert.deepEqual(bg.electrodes, keep.electrodes);
  assert.ok(Math.abs(bg.electrodes[0].poly[0][1] - 0.03) < 1e-12);
});
