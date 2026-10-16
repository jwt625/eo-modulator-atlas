// Plot and derived-value evaluation over a solution store (DevLog-030 contract, DevLog-031): evaluatePlot (values on
// nodes, element centroids, element corners, quadrature points, refined element-local lattices with smoothing
// (DevLog-034), cut lines and cut points), evaluateDerived (global,
// surface integral / average / max / min over region selections, line integral / average along polylines, point
// evaluation), modeTable and global expressions over sweep points. Integrals use the solver's 6-point degree-4 rule
// on the dataset mesh; line integrals split every segment at the element crossings of each mesh the expression reads
// and use 3-point Gauss on each piece. License: GPL-3.0-or-later.

import { QUAD_WEIGHTS, MAX_CACHED_POINTS, GLOBAL_VARIABLES, PATTERN_SIZES, resolveConstant } from './store.mjs';
import { compileExpression, ExpressionError } from './expr.mjs';
import { displayConversion, formatUnit, dimMul, parseUnit } from './units.mjs';
import { resolutionLevel, cappedLevel, refinePattern, smoothValues, MAX_SUBTRIANGLES, SMOOTHING } from './refine.mjs';

const LOCATIONS = ['auto', 'node', 'element', 'corner', 'quad', 'refined'];
const PARTS = ['real', 'imag', 'abs'];
const M2 = parseUnit('m^2').dim, M1 = parseUnit('m').dim;

function pick(v, part, factor) {
  const n = v.re.length;
  const out = new Float64Array(n);
  if (part === 'imag') { if (v.im) for (let i = 0; i < n; i++) out[i] = v.im[i] / factor; else for (let i = 0; i < n; i++) out[i] = Number.isNaN(v.re[i]) ? NaN : 0; }
  else if (part === 'abs') for (let i = 0; i < n; i++) out[i] = (v.im ? Math.hypot(v.re[i], v.im[i]) : Math.abs(v.re[i])) / factor;
  else for (let i = 0; i < n; i++) out[i] = v.re[i] / factor;
  return out;
}

function stats(a) {
  let min = Infinity, max = -Infinity, nNaN = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    if (Number.isNaN(x)) { nNaN++; continue; }
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return { min: nNaN === a.length ? NaN : min, max: nNaN === a.length ? NaN : max, nNaN };
}

const isComplex = (v) => {
  if (!v.im) return false;
  for (let i = 0; i < v.im.length; i++) if (v.im[i] !== 0 && !Number.isNaN(v.im[i])) return true;
  return false;
};

/** Points of a cut line: n samples uniform in arc length (um), with the segment tangent of each sample. */
function cutlineSamples(points, n) {
  const segLen = [];
  let total = 0;
  for (let k = 0; k + 1 < points.length; k++) { const l = Math.hypot(points[k + 1][0] - points[k][0], points[k + 1][1] - points[k][1]); segLen.push(l); total += l; }
  if (!(total > 0)) throw new Error('cut line has zero length');
  const x = new Float64Array(n), y = new Float64Array(n), s = new Float64Array(n), tx = new Float64Array(n), ty = new Float64Array(n);
  let k = 0, acc = 0;
  for (let i = 0; i < n; i++) {
    const si = (total * i) / (n - 1);
    while (k < segLen.length - 1 && si > acc + segLen[k]) { acc += segLen[k]; k++; }
    const l = segLen[k] || 1;
    const u = Math.min(1, Math.max(0, (si - acc) / l));
    const [x0, y0] = points[k], [x1, y1] = points[k + 1];
    x[i] = x0 + u * (x1 - x0); y[i] = y0 + u * (y1 - y0); s[i] = si;
    tx[i] = (x1 - x0) / l; ty[i] = (y1 - y0) / l;
  }
  return { x, y, s, tx, ty, total };
}

function lineData(s, tx, ty) {
  return { line: { s: Float64Array.from(s, (v) => v * 1e-6), t1x: tx, t1y: ty } };
}

/**
 * Plot values of an expression on a dataset.
 * @param {any} store createSolutionStore result
 * @param {{dataset:string, expr:string, unit?:string, location?:'auto'|'node'|'element'|'corner'|'quad'|'refined', part?:'real'|'imag'|'abs',
 *   resolution?:string|number, smoothing?:'none'|'material'|'everywhere', maxSubTriangles?:number}} req
 */
export function evaluatePlot(store, req) {
  const t0 = performance.now();
  const ds = store.dataset(req.dataset);
  const part = req.part ?? 'real';
  if (!PARTS.includes(part)) throw new Error(`part must be one of ${PARTS.join(', ')}`);
  const kind = ds.extra?.info.kind ?? null;
  const compiled = store.compile(req.expr, ds, { line: kind === 'cutline' });
  const conv = displayConversion(compiled.dim, req.unit);
  let ps, location, mesh = null;
  const extra = {};
  if (kind === 'cutline') {
    const smp = cutlineSamples(ds.extra.info.points, ds.extra.info.n);
    ps = store.xyPointSet(smp.x, smp.y, lineData(smp.s, smp.tx, smp.ty));
    location = 'line';
    Object.assign(extra, { s: smp.s, x: Float64Array.from(smp.x), y: Float64Array.from(smp.y) });
  } else if (ds.kind === 'rf') {
    ps = store.rfPointSet();
    location = 'sweep';
    extra.fGhz = Float64Array.from(store.rf.fGhz);
  } else if (kind === 'cutpoint') {
    const pts = ds.extra.info.points;
    ps = store.xyPointSet(Float64Array.from(pts, (p) => p[0]), Float64Array.from(pts, (p) => p[1]));
    location = 'point';
    Object.assign(extra, { x: Float64Array.from(ps.x), y: Float64Array.from(ps.y) });
  } else {
    location = req.location ?? 'auto';
    if (!LOCATIONS.includes(location)) throw new Error(`location must be one of ${LOCATIONS.join(', ')}`);
    if (location === 'auto') location = compiled.continuous ? 'node' : 'element';
    mesh = ds.mesh;
  }
  if (location !== 'refined' && (req.resolution != null || req.smoothing != null)) throw new Error("resolution and smoothing apply to location 'refined' only");
  let v, smoothing = null;
  if (location === 'refined') {
    // element-local lattice of level r (DevLog-034): exact values from each element's own basis, then smoothing of
    // coincident points (none, inside material domains, everywhere)
    smoothing = req.smoothing ?? 'material';
    if (!SMOOTHING.includes(smoothing)) throw new Error(`smoothing must be one of ${SMOOTHING.join(', ')}`);
    const rec = store.meshes.get(mesh);
    const want = resolutionLevel(req.resolution ?? 'normal');
    const cap = req.maxSubTriangles ?? MAX_SUBTRIANGLES;
    const r = cappedLevel(rec.nTris, want, cap);
    const pat = refinePattern(r);
    v = store.run(compiled, store.pointSet(mesh, `refine${r}`));
    Object.assign(extra, { resolution: r, requestedResolution: want, capped: r < want, np: pat.np, nSub: rec.nTris * pat.nSub, smoothing });
  } else if (location === 'node' && !compiled.continuous) {
    // smoothing: area-weighted mean of the corner values of every element sharing the node
    const corner = store.run(compiled, store.pointSet(mesh, 'corner'));
    v = smoothToNodes(store, mesh, corner);
  } else {
    if (!ps) ps = store.pointSet(mesh, location === 'element' ? 'centroid' : location);
    v = store.run(compiled, ps);
  }
  let values = pick(v, part, conv.factor);
  if (smoothing && smoothing !== 'none') values = smoothValues(values, store.smoothingSlots(mesh, extra.resolution, smoothing));
  const st = stats(values);
  return { values, location, mesh, n: values.length, unit: conv.unit, siUnit: compiled.unit, dim: compiled.dim, ...st,
    complex: isComplex(v), part, ...extra, ms: performance.now() - t0 };
}

function smoothToNodes(store, meshId, v) {
  const rec = store.meshes.get(meshId);
  const { tri, nTris } = rec.mesh;
  const n = rec.nNodes;
  const sr = new Float64Array(n), si = v.im ? new Float64Array(n) : null, w = new Float64Array(n);
  for (let t = 0; t < nTris; t++) {
    const a = rec.absArea[t];
    for (let k = 0; k < 3; k++) {
      const i = 3 * t + k, x = v.re[i];
      if (Number.isNaN(x)) continue;
      const node = tri[i];
      sr[node] += a * x;
      if (si) si[node] += a * v.im[i];
      w[node] += a;
    }
  }
  for (let i = 0; i < n; i++) { sr[i] = w[i] > 0 ? sr[i] / w[i] : NaN; if (si) si[i] = w[i] > 0 ? si[i] / w[i] : NaN; }
  return { re: sr, im: si };
}

/** Element subset of a region selection on a mesh: {elems|null, key, names}. */
function regionSelection(store, meshId, selection) {
  const rec = store.meshes.get(meshId);
  let list = selection == null ? null : Array.isArray(selection) ? selection : selection.regions ?? null;
  if (selection && !Array.isArray(selection) && selection.regions == null && (selection.polyline || selection.point || selection.points)) throw new Error('surface evaluations take a region selection {regions: [...]}');
  if (list == null) return { elems: null, key: '', names: rec.regionNames };
  if (!Array.isArray(list) || !list.length) throw new Error('selection.regions must be a non-empty array of region names or ids');
  const ids = new Set();
  for (const r of list) {
    const id = typeof r === 'number' ? r : rec.regionNames.indexOf(r);
    if (!(Number.isInteger(id) && id >= 0 && id < rec.regionNames.length)) throw new Error(`unknown region ${r} in mesh ${meshId} (regions: ${rec.regionNames.join(', ')})`);
    ids.add(id);
  }
  const tr = rec.mesh.triRegion;
  let cnt = 0;
  for (let t = 0; t < rec.nTris; t++) if (ids.has(tr[t])) cnt++;
  const elems = new Int32Array(cnt);
  cnt = 0;
  for (let t = 0; t < rec.nTris; t++) if (ids.has(tr[t])) elems[cnt++] = t;
  const sorted = [...ids].sort((a, b) => a - b);
  return { elems, key: `r${sorted.join(',')}`, names: sorted.map((i) => rec.regionNames[i]) };
}

/** Quadrature integral of a compiled expression over elements (chunked for large meshes). */
function surfaceIntegral(store, meshId, compiled, sel) {
  const rec = store.meshes.get(meshId);
  const nq = QUAD_WEIGHTS.length;
  const all = sel.elems ?? null;
  const nEl = all ? all.length : rec.nTris;
  const chunk = Math.max(1, Math.floor(MAX_CACHED_POINTS / nq));
  let sr = 0, si = 0, area = 0, nSkipped = 0;
  for (let e0 = 0; e0 < nEl; e0 += chunk) {
    const e1 = Math.min(nEl, e0 + chunk);
    let elems = all ? all.subarray(e0, e1) : null;
    let key = sel.key;
    if (!all && (e0 > 0 || e1 < nEl)) { elems = Int32Array.from({ length: e1 - e0 }, (_, i) => e0 + i); key = `c${e0}`; }
    else if (all && (e0 > 0 || e1 < nEl)) key = `${sel.key}c${e0}`;
    const ps = store.pointSet(meshId, 'quad', elems, key);
    const v = store.run(compiled, ps);
    let i = 0;
    for (let e = 0; e < e1 - e0; e++) {
      const t = elems ? elems[e] : e;
      const a = rec.absArea[t] * 1e-12;
      for (let q = 0; q < nq; q++, i++) {
        const x = v.re[i];
        if (Number.isNaN(x)) { nSkipped++; continue; }
        const w = QUAD_WEIGHTS[q] * a;
        sr += w * x;
        if (v.im) si += w * v.im[i];
        area += w;
      }
    }
  }
  return { re: sr, im: si, area, nSkipped };
}

/**
 * Surface max / min (audit E10): sampled at element corners, edge midpoints and the 6 quadrature points of every
 * selected element, then refined on a barycentric lattice of order 8 (45 points) inside the element that holds the best
 * sample. Extrema strictly between these samples in other elements can be missed.
 */
function surfaceExtreme(store, meshId, compiled, sel, wantMax, part) {
  let best = wantMax ? -Infinity : Infinity, at = null, bestT = -1;
  const better = (x) => (wantMax ? x > best : x < best);
  const scan = (kind, elems, key) => {
    const ps = store.pointSet(meshId, kind, elems, key);
    const v = store.run(compiled, ps);
    const vals = pick(v, part, 1);
    const np = PATTERN_SIZES[kind];
    let bi = -1;
    for (let i = 0; i < vals.length; i++) { const x = vals[i]; if (!Number.isNaN(x) && better(x)) { best = x; bi = i; } }
    if (bi >= 0) {
      const c = store.coords(ps);
      at = [c.x[bi], c.y[bi]];
      const e = Math.floor(bi / np);
      bestT = elems ? elems[e] : e;
    }
  };
  for (const kind of ['corner', 'edge', 'quad']) scan(kind, sel.elems, sel.key);
  if (bestT >= 0) scan('lattice', Int32Array.of(bestT), `t${bestT}`);
  return { value: Number.isFinite(best) ? best : NaN, at, element: bestT };
}

/**
 * Candidate triangles of a segment (audit E11): the grid-locator buckets of every cell within one cell of the segment
 * (cells sampled at a quarter of the cell size), instead of a scan of every triangle.
 */
function segmentCandidates(store, rec, p0, p1) {
  const g = store.locator(rec).grid;
  const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const step = 0.25 * Math.min(g.dx, g.dy);
  const nStep = Math.max(1, Math.ceil(len / step));
  const cells = new Set();
  for (let k = 0; k <= nStep; k++) {
    const u = k / nStep;
    const ci = Math.floor((p0[0] + u * (p1[0] - p0[0]) - g.x0) / g.dx), cj = Math.floor((p0[1] + u * (p1[1] - p0[1]) - g.y0) / g.dy);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const i = ci + di, j = cj + dj;
      if (i >= 0 && j >= 0 && i < g.nx && j < g.ny) cells.add(j * g.nx + i);
    }
  }
  const tris = new Set();
  for (const c of cells) for (const t of g.buckets[c] ?? []) tris.add(t);
  return tris;
}

/** Breakpoints (segment parameter in [0, 1]) where segment p0 -> p1 crosses the elements of a mesh. */
function crossings(store, rec, p0, p1, out) {
  const { mesh, geo } = rec;
  const { x: X, y: Y, tri } = mesh;
  const dx = p1[0] - p0[0], dy = p1[1] - p0[1];
  const bx0 = Math.min(p0[0], p1[0]), bx1 = Math.max(p0[0], p1[0]), by0 = Math.min(p0[1], p1[1]), by1 = Math.max(p0[1], p1[1]);
  const tol = 1e-12;
  for (const t of segmentCandidates(store, rec, p0, p1)) {
    const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
    if (Math.max(X[a], X[b], X[c]) < bx0 || Math.min(X[a], X[b], X[c]) > bx1 || Math.max(Y[a], Y[b], Y[c]) < by0 || Math.min(Y[a], Y[b], Y[c]) > by1) continue;
    const o = 3 * t;
    const rx = p0[0] - X[c], ry = p0[1] - Y[c];
    const a0 = geo.gx[o] * rx + geo.gy[o] * ry, a1 = geo.gx[o + 1] * rx + geo.gy[o + 1] * ry;
    const b0 = geo.gx[o] * dx + geo.gy[o] * dy, b1 = geo.gx[o + 1] * dx + geo.gy[o + 1] * dy;
    let lo = 0, hi = 1;
    for (const [aa, bb] of [[a0, b0], [a1, b1], [1 - a0 - a1, -b0 - b1]]) {
      if (Math.abs(bb) < 1e-300) { if (aa < -tol) { lo = 1; hi = 0; break; } continue; }
      const r = -aa / bb;
      if (bb > 0) lo = Math.max(lo, r); else hi = Math.min(hi, r);
    }
    if (hi > lo + tol) { out.push(lo, hi); }
  }
}

const G3 = [[0.5 - 0.5 * Math.sqrt(0.6), 5 / 18], [0.5, 8 / 18], [0.5 + 0.5 * Math.sqrt(0.6), 5 / 18]];

/** Gauss points of a polyline split at the element crossings of the given meshes. */
function lineGauss(store, points, meshIds) {
  const xs = [], ys = [], ws = [], txs = [], tys = [], ss = [];
  let s0 = 0;
  for (let k = 0; k + 1 < points.length; k++) {
    const p0 = points[k], p1 = points[k + 1];
    const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (!(len > 0)) continue;
    const br = [0, 1];
    for (const id of meshIds) crossings(store, store.meshes.get(id), p0, p1, br);
    br.sort((a, b) => a - b);
    const tx = (p1[0] - p0[0]) / len, ty = (p1[1] - p0[1]) / len;
    for (let j = 0; j + 1 < br.length; j++) {
      const u0 = Math.max(0, br[j]), u1 = Math.min(1, br[j + 1]);
      if (!(u1 - u0 > 1e-12)) continue;
      for (const [g, w] of G3) {
        const u = u0 + g * (u1 - u0);
        xs.push(p0[0] + u * (p1[0] - p0[0])); ys.push(p0[1] + u * (p1[1] - p0[1]));
        ws.push(w * (u1 - u0) * len * 1e-6); txs.push(tx); tys.push(ty); ss.push((s0 + u * len) * 1e-6);
      }
    }
    s0 += len;
  }
  return { x: Float64Array.from(xs), y: Float64Array.from(ys), w: Float64Array.from(ws), tx: Float64Array.from(txs), ty: Float64Array.from(tys), s: Float64Array.from(ss), length: s0 * 1e-6 };
}

function points2(sel, what) {
  if (!Array.isArray(sel) || sel.length < 2 || !sel.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) throw new Error(`${what} must be an array of at least two [x_um, y_um] points`);
  return sel;
}

/**
 * Derived value of an expression.
 * @param {any} store
 * @param {{kind:string, dataset:string, expr:string, selection?:any, unit?:string, part?:'real'|'imag'|'abs'}} req
 */
export function evaluateDerived(store, req) {
  const t0 = performance.now();
  const { kind } = req;
  const ds = store.dataset(req.dataset);
  const part = req.part ?? 'real';
  if (!PARTS.includes(part)) throw new Error(`part must be one of ${PARTS.join(', ')}`);
  const base = { kind, dataset: req.dataset, expr: req.expr };
  const dsKind = ds.extra?.info.kind ?? null;
  const lineKinds = kind === 'line_int' || kind === 'line_avg';
  const compiled = store.compile(req.expr, ds, { line: lineKinds });
  const finish = (dim, re, im, more = {}) => {
    const conv = displayConversion(dim, req.unit);
    const value = part === 'abs' ? Math.hypot(re, im) / conv.factor : part === 'imag' ? im / conv.factor : re / conv.factor;
    return { ...base, value, ...(im !== 0 && part === 'real' ? { valueIm: im / conv.factor } : {}), unit: conv.unit, siUnit: formatUnit(dim), dim, ...more, ms: performance.now() - t0 };
  };
  switch (kind) {
    case 'global': {
      if (!compiled.global) throw new ExpressionError(`expression "${req.expr}" depends on fields; use a surface, line or point evaluation`);
      return finish(compiled.dim, compiled.constant.re, compiled.constant.im);
    }
    case 'surface_int': case 'surface_avg': case 'surface_max': case 'surface_min': {
      if (dsKind || !ds.mesh) throw new Error(`${kind} needs a mesh dataset (not ${dsKind ?? ds.kind})`);
      const sel = regionSelection(store, ds.mesh, req.selection);
      if (kind === 'surface_max' || kind === 'surface_min') {
        const r = surfaceExtreme(store, ds.mesh, compiled, sel, kind === 'surface_max', part);
        const conv = displayConversion(compiled.dim, req.unit);
        return { ...base, value: r.value / conv.factor, unit: conv.unit, siUnit: compiled.unit, dim: compiled.dim, at: r.at, element: r.element, regions: sel.names, ms: performance.now() - t0 };
      }
      const r = surfaceIntegral(store, ds.mesh, compiled, sel);
      const more = { measure: { value: r.area, unit: 'm^2' }, regions: sel.names, nSkipped: r.nSkipped };
      if (kind === 'surface_int') return finish(dimMul(compiled.dim, M2), r.re, r.im, more);
      return finish(compiled.dim, r.re / r.area, r.im / r.area, more);
    }
    case 'line_int': case 'line_avg': {
      // X11: no sampling resolution applies; refuse one explicitly instead of ignoring it
      if (req.resolution != null || req.n != null) throw new Error(`${kind} uses 3-point Gauss quadrature on every piece between element crossings (exact for the solver interpolation); a resolution is not used (the cut line n sets Line Graph sampling only)`);
      const pts = dsKind === 'cutline' && !req.selection?.polyline ? ds.extra.info.points : points2(req.selection?.polyline, 'selection.polyline');
      const meshIds = new Set(store.meshesOf(compiled));
      if (ds.mesh) meshIds.add(ds.mesh);
      const g = lineGauss(store, pts, [...meshIds]);
      const ps = store.xyPointSet(g.x, g.y, { line: { s: g.s, t1x: g.tx, t1y: g.ty } });
      const v = store.run(compiled, ps);
      let sr = 0, si = 0, cov = 0, nSkipped = 0;
      for (let i = 0; i < ps.n; i++) {
        if (Number.isNaN(v.re[i])) { nSkipped++; continue; }
        sr += g.w[i] * v.re[i];
        if (v.im) si += g.w[i] * v.im[i];
        cov += g.w[i];
      }
      const more = { measure: { value: cov, unit: 'm' }, length: g.length, nSkipped, nPoints: ps.n, quadrature: 'gauss3_per_element_crossing' };
      if (kind === 'line_int') return finish(dimMul(compiled.dim, M1), sr, si, more);
      return finish(compiled.dim, sr / cov, si / cov, more);
    }
    case 'point': {
      let pts;
      if (dsKind === 'cutpoint' && !req.selection) pts = ds.extra.info.points;
      else if (req.selection?.point) pts = [req.selection.point];
      else if (req.selection?.points) pts = req.selection.points;
      else throw new Error('point evaluation needs selection {point: [x_um, y_um]} or {points: [...]} or a cut point dataset');
      for (const p of pts) if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) throw new Error('points must be [x_um, y_um]');
      const ps = store.xyPointSet(Float64Array.from(pts, (p) => p[0]), Float64Array.from(pts, (p) => p[1]));
      const v = store.run(compiled, ps);
      const conv = displayConversion(compiled.dim, req.unit);
      const vals = pick(v, part, conv.factor);
      const ims = v.im && part === 'real' ? Array.from(v.im, (x) => x / conv.factor) : null;
      return { ...base, value: vals[0], ...(ims && ims[0] !== 0 ? { valueIm: ims[0] } : {}), values: Array.from(vals), ...(ims ? { valuesIm: ims } : {}),
        points: pts.map((p) => [p[0], p[1]]), unit: conv.unit, siUnit: compiled.unit, dim: compiled.dim, ms: performance.now() - t0 };
    }
    default: throw new Error(`unknown derived kind ${kind} (global, surface_int, surface_avg, surface_max, surface_min, line_int, line_avg, point)`);
  }
}

/**
 * Values of an expression at arbitrary points (um) of a dataset: the public entry for refined or custom sampling
 * (round 2, R-UI request; same evaluation as cut points). Points outside the dataset's meshes give NaN.
 * @param {any} store
 * @param {{dataset:string, expr:string, points?:[number, number][], x?:ArrayLike<number>, y?:ArrayLike<number>, unit?:string, part?:'real'|'imag'|'abs'}} req
 */
export function evaluateAtPoints(store, req) {
  const t0 = performance.now();
  const ds = store.dataset(req.dataset);
  const part = req.part ?? 'real';
  if (!PARTS.includes(part)) throw new Error(`part must be one of ${PARTS.join(', ')}`);
  let x, y;
  if (req.points) {
    if (!Array.isArray(req.points)) throw new Error('points must be an array of [x_um, y_um]');
    x = Float64Array.from(req.points, (p) => p[0]); y = Float64Array.from(req.points, (p) => p[1]);
  } else {
    if (!req.x || !req.y || req.x.length !== req.y.length) throw new Error('give points or x and y arrays of equal length (um)');
    x = Float64Array.from(req.x); y = Float64Array.from(req.y);
  }
  for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i]) || !Number.isFinite(y[i])) throw new Error(`point ${i} is not finite`);
  const compiled = store.compile(req.expr, ds);
  const conv = displayConversion(compiled.dim, req.unit);
  const v = store.run(compiled, store.xyPointSet(x, y));
  const values = pick(v, part, conv.factor);
  return { values, n: values.length, unit: conv.unit, siUnit: compiled.unit, dim: compiled.dim, ...stats(values), complex: isComplex(v), part, ms: performance.now() - t0 };
}

/** Mode table of an optical dataset family (every computed mode, n_eff descending). */
export function modeTable(store, datasetId) {
  const ds = store.dataset(datasetId);
  if (!ds.family) throw new Error(`dataset ${datasetId} is not an optical dataset`);
  const rec = store.families.get(ds.family).rec;
  return rec.modes.map((md, k) => ({
    k, family: md.family, familyIndex: md.familyIndex, label: md.label, neff: md.neff, ng: Number.isFinite(md.ng) ? md.ng : null, lossDbPerCm: md.lossDbPerCm ?? null, teFraction: md.teFraction ?? null,
    aeffUm2: md.aeffUm2 ?? null, confinement: Object.fromEntries(Object.entries(md.confinement ?? {}).map(([r, c]) => [r, c.power])),
    selected: k === rec.selected, residual: md.residual ?? null, solver: rec.kind,
  }));
}


/**
 * Global expression over a list of globals records (runGlobals of each sweep point) -> one value per record (NaN when a
 * record lacks a referenced global).
 * @param {string} expr
 * @param {Record<string, number>[]} list
 * @param {{unit?:string}} [options]
 */
export function evaluateGlobals(expr, list, { unit } = {}) {
  const known = new Map(GLOBAL_VARIABLES.map((g) => [g.name, g]));
  let dim = null;
  const ims = [];
  const values = list.map((g) => {
    if (!g) { ims.push(0); return NaN; }
    let c;
    try {
      c = compileExpression(expr, { resolve(name) {
        const k = resolveConstant(name, g.lambda0 ?? null);
        if (k) return k;
        if (name === 'lambda0' || name === 'k0' || name === 'f0') throw new MissingGlobal(name);
        const def = known.get(name);
        if (!def) return null;
        if (!Object.hasOwn(g, name)) throw new MissingGlobal(name);
        return { kind: 'const', re: g[name], dim: def.dim, global: true };
      } });
    } catch (e) {
      if (e instanceof MissingGlobal) { ims.push(0); return NaN; }
      throw e;
    }
    dim = c.dim;
    ims.push(c.constant.im);
    return c.constant.re;
  });
  if (!dim) {
    // every record lacked a global: compile once with placeholder values to report the unit or the error
    const c = compileExpression(expr, { resolve: (name) => resolveConstant(name, 1) ?? (known.has(name) ? { kind: 'const', re: 1, dim: known.get(name).dim } : null) });
    dim = c.dim;
  }
  const conv = displayConversion(dim, unit);
  return { values: values.map((v) => v / conv.factor), ...(ims.some((v) => v !== 0) ? { valuesIm: ims.map((v) => v / conv.factor) } : {}), unit: conv.unit, siUnit: formatUnit(dim), dim };
}

class MissingGlobal extends Error {
  get passThrough() { return true; }
}
