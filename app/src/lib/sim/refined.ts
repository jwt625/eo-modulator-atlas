// Refined display of element-local plot values (DevLog-034): every parent element of a display mesh is split into r^2
// sub-triangles on the engine's barycentric lattice; plot values are one per lattice point, element-major (engine
// `location: 'refined'`). Coordinates and the drawn interpolation come from the engine helpers, so what is drawn and
// what the engine evaluated share one implementation.
import { interpolateRefined, refinePattern, refinedPoints } from '../../../../engine/src/postproc/index.mjs';
import { indexFor, locate } from './fieldmath';
import type { FieldMesh } from './types';

export interface RefinedDisplay {
	r: number;
	/** Lattice points per element. */
	np: number;
	nT: number;
	/** Lattice point coordinates (µm), element-major. */
	x: Float64Array;
	y: Float64Array;
	/** Sub-triangles (3 global lattice point indices each), r^2 per element, element-major. */
	sub: Uint32Array<ArrayBuffer>;
	/** Parent barycentrics (L0, L1) of every lattice point (wireframe of the parent elements). */
	bary: Float32Array<ArrayBuffer>;
}

const memo = new WeakMap<FieldMesh, Map<number, RefinedDisplay>>();
/** Levels kept per mesh: the current and the previous one (switching back is free, older levels are released). */
const KEEP = 2;

/** Refined display of a mesh at level r (memoised per mesh object, the last KEEP levels used). */
export function refinedDisplay(mesh: FieldMesh, r: number): RefinedDisplay {
	let m = memo.get(mesh);
	if (!m) memo.set(mesh, (m = new Map()));
	let d = m.get(r);
	if (d) {
		// most recently used last
		m.delete(r);
		m.set(r, d);
		return d;
	}
	const pat = refinePattern(r);
	const nT = mesh.tri.length / 3, np = pat.np, ns = pat.nSub;
	const { x, y } = refinedPoints(mesh, r);
	const sub = new Uint32Array(3 * ns * nT);
	const bary = new Float32Array(2 * np * nT);
	for (let t = 0; t < nT; t++) {
		const o = t * np, so = 3 * ns * t;
		for (let k = 0; k < 3 * ns; k++) sub[so + k] = o + pat.sub[k];
		for (let p = 0; p < np; p++) { bary[2 * (o + p)] = pat.L[3 * p]; bary[2 * (o + p) + 1] = pat.L[3 * p + 1]; }
	}
	d = { r, np, nT, x, y, sub, bary };
	m.set(r, d);
	while (m.size > KEEP) m.delete(m.keys().next().value!);
	return d;
}

/** Per-element values (one per triangle) as lattice values of level 1 (3 equal corner values per element). */
export function perElement(values: ArrayLike<number>): Float64Array {
	const out = new Float64Array(3 * values.length);
	for (let t = 0; t < values.length; t++) out[3 * t] = out[3 * t + 1] = out[3 * t + 2] = values[t];
	return out;
}

/** Drawn value at a world point (µm): parent element located in the mesh, then the sub-triangle interpolation. */
export function drawnAt(mesh: FieldMesh, values: ArrayLike<number>, r: number, x: number, y: number): { v: number; t: number } | null {
	const loc = locate(mesh, indexFor(mesh), x, y);
	if (!loc) return null;
	return { v: interpolateRefined(values, r, loc.t, loc.w0, loc.w1), t: loc.t };
}
