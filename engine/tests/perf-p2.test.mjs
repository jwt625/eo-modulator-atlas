// P2 Lagrange electrostatics option (DevLog-024 S3.9): exactness and convergence against analytic references.
import test from 'node:test';
import assert from 'node:assert/strict';
import { solveElectrostatics, gradientAt, EPS0 } from '../src/electrostatics.mjs';
import { geom, rect, mats, section, relErr } from './helpers.mjs';

// Parallel plates (linear field): P1 and P2 are both exact; C' = eps0 eps_r h / g with zero-flux top and bottom.
test('P2 reproduces the parallel-plate capacitance exactly and agrees with energy and terminal charge', () => {
  const g = geom({ domain: { x: [0, 4], y: [0, 1] }, regions: [{ name: 'd', material: 'diel', poly: rect(0, 4, 0, 1) }],
    electrodes: [{ name: 'l', weight: 0, poly: rect(0, 1, 0, 1) }, { name: 'r', weight: 1, poly: rect(3, 4, 0, 1) }], mesh: { max_edge_um: 0.3 } });
  const m = mats({ diel: { n: 2, eps_r: 5 }, gold: { conductor: true } });
  for (const elementOrder of [1, 2]) {
    const es = solveElectrostatics(section(g), { resolvedMaterials: m, elementOrder });
    const exact = (EPS0 * 5 * 1) / 2;
    assert.ok(relErr(es.cPul, exact) < 1e-10, `order ${elementOrder}: ${es.cPul} vs ${exact}`);
    assert.ok(relErr(es.capacitance.charge, es.capacitance.energy) < 1e-10);
    assert.equal(es.elementOrder, elementOrder);
    assert.equal(es.phi.length, es.mesh.nNodes);
  }
});

// Non-uniform field (two thin strips, corner singularities, grounded box): at matched DOF counts P2 is closer to a
// finer P2 reference than P1 (measured 2026-10-14: P1 11,326 DOFs 1.3e-3, P2 11,528 DOFs 2.2e-4).
test('P2 is more accurate than P1 at a matched DOF count on a non-uniform field (strip pair)', () => {
  const g = geom({ domain: { x: [-6, 6], y: [-6, 6] }, regions: [{ name: 'd', material: 'diel', poly: rect(-6, 6, -6, 6) }],
    electrodes: [{ name: 'a', weight: 0, poly: rect(-2, -0.5, -0.1, 0.1) }, { name: 'b', weight: 1, poly: rect(0.5, 2, -0.1, 0.1) }],
    mesh: { max_edge_um: 0.5 }, boundary: { left: 'dirichlet', right: 'dirichlet', top: 'dirichlet', bottom: 'dirichlet' } });
  const m = mats({ diel: { n: 1, eps_r: 1 }, gold: { conductor: true } });
  const ref = solveElectrostatics(section(g), { resolvedMaterials: m, elementOrder: 2, meshScale: 0.5 }).cPul;
  const p1 = solveElectrostatics(section(g), { resolvedMaterials: m, elementOrder: 1, meshScale: 0.5 });
  const p2 = solveElectrostatics(section(g), { resolvedMaterials: m, elementOrder: 2, meshScale: 1 });
  assert.ok(Math.abs(p2.timing.nDof - p1.timing.nDof) < 0.1 * p1.timing.nDof, `${p2.timing.nDof} vs ${p1.timing.nDof}`);
  assert.ok(relErr(p2.cPul, ref) < 0.5 * relErr(p1.cPul, ref), `P2 ${relErr(p2.cPul, ref)} vs P1 ${relErr(p1.cPul, ref)}`);
});

test('gradientAt: P1 returns the triangle gradient; P2 reproduces a uniform field at any interior point', () => {
  const g = geom({ domain: { x: [0, 4], y: [0, 1] }, regions: [{ name: 'd', material: 'diel', poly: rect(0, 4, 0, 1) }],
    electrodes: [{ name: 'l', weight: 0, poly: rect(0, 1, 0, 1) }, { name: 'r', weight: 1, poly: rect(3, 4, 0, 1) }], mesh: { max_edge_um: 0.3 } });
  const m = mats({ diel: { n: 2, eps_r: 5 }, gold: { conductor: true } });
  const p1 = solveElectrostatics(section(g), { resolvedMaterials: m });
  assert.deepEqual(gradientAt(p1, 3, 0, 0), [p1.grad.gx[3], p1.grad.gy[3]]);
  const p2 = solveElectrostatics(section(g), { resolvedMaterials: m, elementOrder: 2 });
  for (let t = 0; t < p2.mesh.nTris; t += 7) {
    const [a, b, c] = [0, 1, 2].map((k) => p2.mesh.tri[3 * t + k]);
    const px = 0.2 * p2.mesh.x[a] + 0.3 * p2.mesh.x[b] + 0.5 * p2.mesh.x[c], py = 0.2 * p2.mesh.y[a] + 0.3 * p2.mesh.y[b] + 0.5 * p2.mesh.y[c];
    const [gx, gy] = gradientAt(p2, t, px, py);
    assert.ok(Math.abs(gx - 0.5) < 1e-9 && Math.abs(gy) < 1e-9, `${gx} ${gy}`);
  }
});
