// Pure mesh/field helpers: bounding box, triangle bin index, point location, interpolation, line sampling,
// element size and quality, value ranges. No DOM access; unit-tested in fieldmath.test.ts.
import type { FieldMesh, ScaleMode, ScalarField } from './types';

export interface BBox {
	x0: number;
	x1: number;
	y0: number;
	y1: number;
}

export function meshBBox(m: Pick<FieldMesh, 'x' | 'y'>): BBox {
	let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
	for (let i = 0; i < m.x.length; i++) {
		const x = m.x[i], y = m.y[i];
		if (x < x0) x0 = x;
		if (x > x1) x1 = x;
		if (y < y0) y0 = y;
		if (y > y1) y1 = y;
	}
	return { x0, x1, y0, y1 };
}

/** Uniform grid of bins holding triangle ids (CSR layout) for point location. */
export interface TriIndex {
	box: BBox;
	nx: number;
	ny: number;
	dx: number;
	dy: number;
	start: Int32Array;
	items: Int32Array;
}

export function buildTriIndex(m: FieldMesh, perBin = 4): TriIndex {
	const nT = m.tri.length / 3;
	const box = meshBBox(m);
	const w = Math.max(box.x1 - box.x0, 1e-12), h = Math.max(box.y1 - box.y0, 1e-12);
	const nBins = Math.max(1, Math.min(1 << 20, Math.ceil(nT / perBin)));
	const nx = Math.max(1, Math.round(Math.sqrt((nBins * w) / h)));
	const ny = Math.max(1, Math.ceil(nBins / nx));
	const dx = w / nx, dy = h / ny;
	const counts = new Int32Array(nx * ny + 1);
	const range = new Int32Array(4 * nT);
	const { x, y, tri } = m;
	for (let t = 0; t < nT; t++) {
		const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
		const bx0 = clampI(Math.floor((Math.min(x[a], x[b], x[c]) - box.x0) / dx), nx);
		const bx1 = clampI(Math.floor((Math.max(x[a], x[b], x[c]) - box.x0) / dx), nx);
		const by0 = clampI(Math.floor((Math.min(y[a], y[b], y[c]) - box.y0) / dy), ny);
		const by1 = clampI(Math.floor((Math.max(y[a], y[b], y[c]) - box.y0) / dy), ny);
		range[4 * t] = bx0; range[4 * t + 1] = bx1; range[4 * t + 2] = by0; range[4 * t + 3] = by1;
		for (let j = by0; j <= by1; j++) for (let i = bx0; i <= bx1; i++) counts[j * nx + i + 1]++;
	}
	for (let k = 1; k < counts.length; k++) counts[k] += counts[k - 1];
	const items = new Int32Array(counts[counts.length - 1]);
	const fill = counts.slice(0, nx * ny);
	for (let t = 0; t < nT; t++) {
		for (let j = range[4 * t + 2]; j <= range[4 * t + 3]; j++)
			for (let i = range[4 * t]; i <= range[4 * t + 1]; i++) items[fill[j * nx + i]++] = t;
	}
	return { box, nx, ny, dx, dy, start: counts, items };
}

const indexMemo = new WeakMap<FieldMesh, TriIndex>();
/** Triangle index of a mesh: the precomputed one (worker) or a memoized build. */
export function indexFor(m: FieldMesh): TriIndex {
	if (m.index) return m.index;
	let idx = indexMemo.get(m);
	if (!idx) indexMemo.set(m, (idx = buildTriIndex(m)));
	return idx;
}

const clampI = (v: number, n: number) => (v < 0 ? 0 : v >= n ? n - 1 : v);

export interface Located {
	t: number;
	/** Barycentric weights of the triangle's nodes. */
	w0: number;
	w1: number;
	w2: number;
}

/** Triangle containing (px, py) or null (outside the mesh, e.g. an electrode hole). */
export function locate(m: FieldMesh, idx: TriIndex, px: number, py: number): Located | null {
	const { box } = idx;
	if (px < box.x0 || px > box.x1 || py < box.y0 || py > box.y1) return null;
	const i = clampI(Math.floor((px - box.x0) / idx.dx), idx.nx);
	const j = clampI(Math.floor((py - box.y0) / idx.dy), idx.ny);
	const b = j * idx.nx + i;
	const { x, y, tri } = m;
	const eps = 1e-9;
	for (let k = idx.start[b]; k < idx.start[b + 1]; k++) {
		const t = idx.items[k];
		const a = tri[3 * t], bb = tri[3 * t + 1], c = tri[3 * t + 2];
		const x0 = x[a], y0 = y[a];
		const d = (y[bb] - y[c]) * (x0 - x[c]) + (x[c] - x[bb]) * (y0 - y[c]);
		if (d === 0) continue;
		const w0 = ((y[bb] - y[c]) * (px - x[c]) + (x[c] - x[bb]) * (py - y[c])) / d;
		const w1 = ((y[c] - y0) * (px - x[c]) + (x0 - x[c]) * (py - y[c])) / d;
		const w2 = 1 - w0 - w1;
		if (w0 >= -eps && w1 >= -eps && w2 >= -eps) return { t, w0, w1, w2 };
	}
	return null;
}

export function valueAt(f: ScalarField, loc: Located, px?: number, py?: number): number {
	const t = loc.t;
	if (f.evaluate && px !== undefined && py !== undefined) return f.evaluate(t, px, py);
	if (f.at === 'tri') return f.values[t];
	if (f.at === 'corner') return loc.w0 * f.values[3 * t] + loc.w1 * f.values[3 * t + 1] + loc.w2 * f.values[3 * t + 2];
	const { tri } = f.mesh;
	return loc.w0 * f.values[tri[3 * t]] + loc.w1 * f.values[tri[3 * t + 1]] + loc.w2 * f.values[tri[3 * t + 2]];
}

export interface LineSample {
	s: number[];
	v: number[];
	x: number[];
	y: number[];
}

/** Field along the segment (ax, ay) -> (bx, by): arc length s (um) and value; NaN outside the mesh. */
export function sampleLine(f: ScalarField, idx: TriIndex, ax: number, ay: number, bx: number, by: number, n = 400): LineSample {
	const L = Math.hypot(bx - ax, by - ay);
	const out: LineSample = { s: [], v: [], x: [], y: [] };
	for (let k = 0; k < n; k++) {
		const u = n === 1 ? 0 : k / (n - 1);
		const px = ax + u * (bx - ax), py = ay + u * (by - ay);
		const loc = locate(f.mesh, idx, px, py);
		out.s.push(u * L);
		out.x.push(px);
		out.y.push(py);
		out.v.push(loc ? valueAt(f, loc, px, py) : NaN);
	}
	return out;
}

/** Longest edge per triangle (um). */
export function triSize(m: FieldMesh): Float64Array {
	const nT = m.tri.length / 3;
	const out = new Float64Array(nT);
	const { x, y, tri } = m;
	for (let t = 0; t < nT; t++) {
		const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
		out[t] = Math.max(Math.hypot(x[b] - x[a], y[b] - y[a]), Math.hypot(x[c] - x[b], y[c] - y[b]), Math.hypot(x[a] - x[c], y[a] - y[c]));
	}
	return out;
}

/** Minimum interior angle per triangle (degrees); 60 for equilateral. */
export function triMinAngle(m: FieldMesh): Float64Array {
	const nT = m.tri.length / 3;
	const out = new Float64Array(nT);
	const { x, y, tri } = m;
	for (let t = 0; t < nT; t++) {
		const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
		const la = Math.hypot(x[b] - x[c], y[b] - y[c]);
		const lb = Math.hypot(x[a] - x[c], y[a] - y[c]);
		const lc = Math.hypot(x[a] - x[b], y[a] - y[b]);
		const angle = (opp: number, s1: number, s2: number) => Math.acos(Math.max(-1, Math.min(1, (s1 * s1 + s2 * s2 - opp * opp) / (2 * s1 * s2))));
		out[t] = (Math.min(angle(la, lb, lc), angle(lb, la, lc), angle(lc, la, lb)) * 180) / Math.PI;
	}
	return out;
}

export interface Range {
	min: number;
	max: number;
}

/** Display range for a scale mode: linear min/max, symmetric +-max|v|, log over positive |v|. */
export function autoRange(values: ArrayLike<number>, mode: ScaleMode): Range {
	let lo = Infinity, hi = -Infinity, amax = 0, aminPos = Infinity;
	for (let i = 0; i < values.length; i++) {
		const v = values[i];
		if (!Number.isFinite(v)) continue;
		if (v < lo) lo = v;
		if (v > hi) hi = v;
		const a = Math.abs(v);
		if (a > amax) amax = a;
		if (a > 0 && a < aminPos) aminPos = a;
	}
	if (!Number.isFinite(lo)) return { min: 0, max: 1 };
	if (mode === 'symmetric') return amax > 0 ? { min: -amax, max: amax } : { min: -1, max: 1 };
	if (mode === 'log') {
		if (!(amax > 0)) return { min: 1e-6, max: 1 };
		// Clamp the dynamic range to 8 decades so a near-zero node does not flatten the map.
		return { min: Math.max(aminPos, amax * 1e-8), max: amax };
	}
	if (lo === hi) return { min: lo - (Math.abs(lo) || 1) * 0.5, max: hi + (Math.abs(hi) || 1) * 0.5 };
	return { min: lo, max: hi };
}

/** Normalized colormap coordinate in [0, 1] (NaN when not mappable). Mirrors the fragment shader. */
export function scaleT(v: number, mode: ScaleMode, r: Range): number {
	if (!Number.isFinite(v)) return NaN;
	let t: number;
	if (mode === 'log') {
		const a = Math.abs(v);
		if (!(a > 0)) return 0;
		t = (Math.log10(a) - Math.log10(r.min)) / (Math.log10(r.max) - Math.log10(r.min));
	} else t = (v - r.min) / (r.max - r.min);
	return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** Point-in-polygon (even-odd). */
export function pointInPoly(px: number, py: number, poly: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
		const [xi, yi] = poly[i], [xj, yj] = poly[j];
		if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}
