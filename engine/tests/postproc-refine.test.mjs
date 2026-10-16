// Refined field-plot sampling (DevLog-034): lattice pattern, exactness of every element-local sample against exact point
// evaluation (vector Nedelec order 1 and 2 with Lagrange E_z, P2 electrostatics and its gradient, scalar P1 modes, EO
// integrand across meshes, arbitrary expressions), smoothing groups (none / inside material domains / everywhere),
// the sub-triangle cap and the convergence of the drawn (interpolated) field with resolution.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../src/run.mjs';
import { setIn } from '../src/yaml-edit.mjs';
import {
  createSolutionStore, evaluatePlot, evaluateAtPoints, refinePattern, latticeIndex, refinedPoints, interpolateRefined,
  RESOLUTIONS, MAX_SUBTRIANGLES,
} from '../src/postproc/index.mjs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const gsg = read('./fixtures/gsg-eo-rf.yaml');
const renaud = read('../../sims/renaud2023/config.yaml');

const maxAbs = (a) => { let m = 0; for (const v of a) if (Number.isFinite(v) && Math.abs(v) > m) m = Math.abs(v); return m; };

test('pattern: lattice order, sub-triangles tile the element, resolution names', () => {
  for (const r of [1, 2, 3, 4, 6, 8]) {
    const p = refinePattern(r);
    assert.equal(p.np, ((r + 1) * (r + 2)) / 2);
    assert.equal(p.sub.length, 3 * r * r);
    // every lattice point sums to 1 and sits at its index
    for (let i = 0; i <= r; i++) for (let j = 0; j <= r - i; j++) {
      const k = latticeIndex(r, i, j);
      assert.equal(p.L[3 * k], i / r);
      assert.equal(p.L[3 * k + 1], j / r);
      assert.ok(Math.abs(p.L[3 * k] + p.L[3 * k + 1] + p.L[3 * k + 2] - 1) < 1e-15);
    }
    // signed areas in (L0, L1): all positive, total 1/2
    let tot = 0;
    for (let s = 0; s < r * r; s++) {
      const [a, b, c] = [p.sub[3 * s], p.sub[3 * s + 1], p.sub[3 * s + 2]];
      const A = 0.5 * ((p.L[3 * b] - p.L[3 * a]) * (p.L[3 * c + 1] - p.L[3 * a + 1]) - (p.L[3 * c] - p.L[3 * a]) * (p.L[3 * b + 1] - p.L[3 * a + 1]));
      assert.ok(Math.abs(Math.abs(A) - 0.5 / (r * r)) < 1e-14);
      tot += Math.abs(A);
    }
    assert.ok(Math.abs(tot - 0.5) < 1e-13);
  }
  assert.deepEqual(RESOLUTIONS, { none: 1, coarse: 2, normal: 3, fine: 4, finer: 6, extra: 8 });
  assert.throws(() => refinePattern(0), /resolution/);
  // interpolation reproduces lattice values and linear functions
  const r = 4, p = refinePattern(r);
  const vals = Float64Array.from({ length: p.np }, (_, k) => 2 * p.L[3 * k] - 3 * p.L[3 * k + 1] + 0.5);
  for (const [l0, l1] of [[0.1, 0.2], [0.7, 0.05], [0.33, 0.33], [0, 1], [1, 0], [0, 0], [0.25, 0.5]]) {
    assert.ok(Math.abs(interpolateRefined(vals, r, 0, l0, l1) - (2 * l0 - 3 * l1 + 0.5)) < 1e-13, `${l0}, ${l1}`);
  }
});

/** Assert that the refined values (smoothing none) equal exact point evaluation at interior and edge lattice points. */
function assertExact(st, dataset, expr, r, label, { tolInterior = 1e-11, tolEdge = 1e-5, edges = true } = {}) {
  const p = evaluatePlot(st, { dataset, expr, location: 'refined', resolution: r, smoothing: 'none' });
  assert.equal(p.location, 'refined');
  assert.equal(p.resolution, r);
  const m = st.mesh(p.mesh);
  assert.equal(p.n, m.nTris * p.np);
  const { x, y } = refinedPoints(m, r);
  const scale = maxAbs(p.values) || 1;
  // interior lattice points (unique element): exact point evaluation at the same coordinates
  const interior = [], edge = [];
  const pat = refinePattern(r);
  for (let t = 0; t < m.nTris; t += Math.max(1, Math.floor(m.nTris / 400))) {
    for (let k = 0; k < pat.np; k++) {
      const [l0, l1, l2] = [pat.L[3 * k], pat.L[3 * k + 1], pat.L[3 * k + 2]];
      const i = t * pat.np + k;
      if (Math.min(l0, l1, l2) > 0) interior.push(i);
      else if (Math.max(l0, l1, l2) < 1) edge.push([i, t]);
    }
  }
  const e = evaluateAtPoints(st, { dataset, expr, x: interior.map((i) => x[i]), y: interior.map((i) => y[i]) }).values;
  let worst = 0;
  interior.forEach((i, k) => { const d = Math.abs(e[k] - p.values[i]); if (!(d <= worst)) worst = Number.isNaN(d) ? Infinity : d; });
  assert.ok(worst <= tolInterior * scale, `${label}: interior max |drawn - exact| ${worst} vs scale ${scale}`);
  // edge lattice points: the element's own side (a point 1e-7 of the way to the element centroid is evaluated exactly).
  // Fields of another mesh (es.* on an optical dataset, EO) are located by coordinates in that mesh at every point,
  // so a shifted point may fall in a neighbouring element of that mesh: checked at interior points only.
  if (!edges) return { p, interior: interior.length, worst: worst / scale };
  const ex = [], ey = [];
  for (const [i, t] of edge) {
    const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2];
    const cx = (m.x[a] + m.x[b] + m.x[c]) / 3, cy = (m.y[a] + m.y[b] + m.y[c]) / 3;
    ex.push(x[i] + 1e-7 * (cx - x[i])); ey.push(y[i] + 1e-7 * (cy - y[i]));
  }
  const g = evaluateAtPoints(st, { dataset, expr, x: ex, y: ey }).values;
  let wEdge = 0;
  edge.forEach(([i], k) => { const d = Math.abs(g[k] - p.values[i]); if (!(d <= wEdge)) wEdge = Number.isNaN(d) ? Infinity : d; });
  assert.ok(wEdge <= tolEdge * scale, `${label}: edge max |drawn - inside value| ${wEdge} vs scale ${scale}`);
  return { p, interior: interior.length, edge: edge.length, worst: worst / scale, wEdge: wEdge / scale };
}

test('exactness: vector order 2 and 1, P2 electrostatics and gradient, EO integrand, expressions (renaud2023)', () => {
  const r2 = runCrossSection(renaud, { stages: ['optical_mode', 'eo_overlap'], solver: 'vector', keep: true });
  const st = createSolutionStore(r2);
  for (const [ds, e] of [['opt', 'opt.Ex'], ['opt', 'opt.Ey'], ['opt', 'imag(opt.Ez)'], ['opt', 'opt.normE^2'], ['opt', 'opt.Hz'], ['opt', 'opt.Sz'],
    ['es', 'es.V'], ['es', 'es.Ex'], ['es', 'es.normE'], ['es', 'es.We'], ['eoA', 'eo.integrand'], ['eoA', 'eo.dnxx'], ['opt', 'es.normE*opt.normE'], ['opt', 'sin(x/(0.3[um]))*opt.normE']]) {
    assertExact(st, ds, e, 3, `order 2 ${ds} ${e}`, { edges: !(ds === 'eoA' || e.includes('es.') && ds !== 'es') });
  }
  const o1 = runCrossSection(setIn(renaud, 'optics.vector_order', 1), { stages: ['optical_mode'], solver: 'vector', keep: true });
  const s1 = createSolutionStore(o1);
  for (const e of ['opt.Ex', 'opt.Ey', 'imag(opt.Ez)', 'opt.normE^2']) assertExact(s1, 'opt', e, 4, `order 1 ${e}`);
});

test('exactness: scalar P1 mode and P1 electrostatics (gsg fixture)', () => {
  const r = runCrossSection(setIn(gsg, 'geometry.mesh.element_order', 1), { stages: ['optical_mode', 'eo_overlap'], solver: 'scalar', keep: true });
  const st = createSolutionStore(r);
  for (const [ds, e] of [['opt', 'opt.psi'], ['opt', 'opt.Sz'], ['es', 'es.V'], ['es', 'es.Ex'], ['eoA', 'eo.integrand']]) assertExact(st, ds, e, 3, `scalar/P1 ${ds} ${e}`);
});

test('smoothing: coincident points, material domains never mixed, none is raw, mean of the element sides', () => {
  const res = runCrossSection(renaud, { stages: ['optical_mode'], solver: 'vector', keep: true });
  const st = createSolutionStore(res);
  const m = st.mesh('opt');
  const r = 3, np = refinePattern(r).np;
  const { x, y } = refinedPoints(m, r);
  const mat = (t) => m.regionMaterials[m.triRegion[t]];
  const raw = evaluatePlot(st, { dataset: 'opt', expr: 'opt.Ey', location: 'refined', resolution: r, smoothing: 'none' }).values;
  const matV = evaluatePlot(st, { dataset: 'opt', expr: 'opt.Ey', location: 'refined', resolution: r }).values;
  const allV = evaluatePlot(st, { dataset: 'opt', expr: 'opt.Ey', location: 'refined', resolution: r, smoothing: 'everywhere' }).values;
  const tol = 1e-12 * maxAbs(raw);
  // groups of identical coordinates (shared vertices and edge lattice points)
  const groups = new Map();
  for (let i = 0; i < x.length; i++) {
    const k = `${x[i]},${y[i]}`;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(i);
  }
  let interfacePts = 0, jumps = 0, shared = 0;
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    shared++;
    const mean = (ids) => ids.reduce((s, i) => s + raw[i], 0) / ids.length;
    for (const i of g) assert.ok(Math.abs(allV[i] - mean(g)) <= tol, 'everywhere = mean of every element side');
    const byMat = new Map();
    for (const i of g) { const k = mat(Math.floor(i / np)); if (!byMat.has(k)) byMat.set(k, []); byMat.get(k).push(i); }
    for (const ids of byMat.values()) for (const i of ids) assert.ok(Math.abs(matV[i] - mean(ids)) <= tol, 'material = mean over the same material only');
    if (byMat.size > 1) {
      interfacePts++;
      const [a, b] = [...byMat.values()].map((ids) => matV[ids[0]]);
      if (Math.abs(a - b) > 1e9 * tol) jumps++;
    }
  }
  assert.ok(shared > 1000 && interfacePts > 50, `${shared} shared points, ${interfacePts} on material interfaces`);
  // E_y (normal to horizontal LN / oxide / air interfaces) keeps its jump at the interfaces
  assert.ok(jumps > interfacePts / 4, `${jumps} of ${interfacePts} interface points keep a jump`);
  // interior points are never changed
  for (let t = 0; t < m.nTris; t += 13) { const i = t * np + latticeIndex(r, 1, 1); assert.equal(matV[i], raw[i]); assert.equal(allV[i], raw[i]); }
});

test('cap: the sub-triangle budget lowers the resolution and says so', () => {
  const st = createSolutionStore(runCrossSection(gsg, { stages: ['electrostatics'], keep: true }));
  const nT = st.mesh('es').nTris;
  const p = evaluatePlot(st, { dataset: 'es', expr: 'es.V', location: 'refined', resolution: 'extra', maxSubTriangles: 10 * nT });
  assert.equal(p.requestedResolution, 8);
  assert.equal(p.resolution, 3);
  assert.equal(p.capped, true);
  assert.equal(p.nSub, 9 * nT);
  const q = evaluatePlot(st, { dataset: 'es', expr: 'es.V', location: 'refined', resolution: 2 });
  assert.equal(q.capped, false);
  assert.ok(nT * 64 <= MAX_SUBTRIANGLES);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'es.V', resolution: 'fine' }), /refined/);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'es.V', location: 'refined', smoothing: 'nodal' }), /smoothing/);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'es.V', location: 'refined', resolution: 'ultra' }), /unknown resolution/);
});

test('convergence: the drawn field approaches the exact field as r^-2 (analytic expression and FE fields)', () => {
  const res = runCrossSection(renaud, { stages: ['optical_mode'], solver: 'vector', keep: true });
  const st = createSolutionStore(res);
  // deterministic pseudo-random points in elements of the optical window
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const cases = [['opt', 'sin(x/(0.4[um]))*cos(y/(0.3[um]))'], ['opt', 'opt.normE^2'], ['es', 'es.V']];
  for (const [ds, expr] of cases) {
    const m = st.mesh(ds);
    const samples = [];
    for (let k = 0; k < 3000; k++) {
      const t = Math.floor(rnd() * m.nTris);
      let l0 = rnd(), l1 = rnd();
      if (l0 + l1 > 1) { l0 = 1 - l0; l1 = 1 - l1; }
      const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2], l2 = 1 - l0 - l1;
      // keep strictly inside (exact evaluation then refers to element t)
      if (Math.min(l0, l1, l2) < 1e-3) continue;
      samples.push({ t, l0, l1, x: l0 * m.x[a] + l1 * m.x[b] + l2 * m.x[c], y: l0 * m.y[a] + l1 * m.y[b] + l2 * m.y[c] });
    }
    const exact = evaluateAtPoints(st, { dataset: ds, expr, x: samples.map((s) => s.x), y: samples.map((s) => s.y) }).values;
    const scale = maxAbs(exact);
    const err = {};
    for (const r of [2, 4, 8]) {
      const v = evaluatePlot(st, { dataset: ds, expr, location: 'refined', resolution: r, smoothing: 'none' }).values;
      let e2 = 0;
      samples.forEach((s, k) => { e2 += (interpolateRefined(v, r, s.t, s.l0, s.l1) - exact[k]) ** 2; });
      err[r] = Math.sqrt(e2 / samples.length) / scale;
    }
    const q1 = err[2] / err[4], q2 = err[4] / err[8];
    assert.ok(q1 > 3 && q1 < 5.5 && q2 > 3 && q2 < 5.5, `${ds} ${expr}: rms rel error ${err[2]}, ${err[4]}, ${err[8]} (ratios ${q1}, ${q2})`);
  }
});
