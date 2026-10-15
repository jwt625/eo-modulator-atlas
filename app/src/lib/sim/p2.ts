// P2 (quadratic Lagrange) display support (DevLog-027 U2). Engine DOF layout (engine/src/fem.mjs p2Space): per triangle
// [v0, v1, v2, m01, m12, m20]; vertices are DOFs 0..nV-1, edge midpoints follow. Shape functions N_i = L_i (2 L_i - 1),
// N_{3+e} = 4 L_i L_j for edges (0,1), (1,2), (2,0).
import type { EsFields, FieldMesh } from './types';
import { buildTriIndex, type TriIndex } from './fieldmath';

export interface P2Display {
	/** Refined display mesh: every element split into 4 at its edge midpoints (nodes = all P2 DOFs). */
	mesh: FieldMesh;
	/** Potential at the refined nodes (= the P2 DOF values). */
	phi: Float64Array;
	/** -grad phi (V/µm) at the 3 corners of every refined triangle (linear in each P2 element). */
	ex: Float64Array;
	ey: Float64Array;
	/** Quadratic potential inside refined triangle s at (x, y). */
	phiAt: (s: number, x: number, y: number) => number;
}

const EDGES = [[0, 1], [1, 2], [2, 0]] as const;
// Sub-triangles in local DOF numbers (corners of the parent are 0..2, midpoints 3..5).
const SUB = [[0, 3, 5], [3, 1, 4], [5, 4, 2], [3, 4, 5]] as const;
// Barycentric coordinates of the 6 local DOFs.
const LOC: [number, number, number][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.5, 0.5, 0], [0, 0.5, 0.5], [0.5, 0, 0.5]];

/** Barycentric gradients of triangle (x, y) arrays at nodes a, b, c: [dL0/dx, dL0/dy, dL1/dx, ...]. */
function baryGrad(x: ArrayLike<number>, y: ArrayLike<number>, a: number, b: number, c: number): number[] {
	const d = (x[b] - x[a]) * (y[c] - y[a]) - (x[c] - x[a]) * (y[b] - y[a]);
	return [(y[b] - y[c]) / d, (x[c] - x[b]) / d, (y[c] - y[a]) / d, (x[a] - x[c]) / d, (y[a] - y[b]) / d, (x[b] - x[a]) / d];
}

/** Gradient of the quadratic interpolant with DOF values u (6) at barycentric L. */
export function p2Gradient(u: ArrayLike<number>, g: number[], L: ArrayLike<number>): [number, number] {
	let gx = 0, gy = 0;
	for (let i = 0; i < 3; i++) {
		const f = 4 * L[i] - 1;
		gx += u[i] * f * g[2 * i];
		gy += u[i] * f * g[2 * i + 1];
	}
	for (let e = 0; e < 3; e++) {
		const [i, j] = EDGES[e];
		gx += u[3 + e] * 4 * (L[i] * g[2 * j] + L[j] * g[2 * i]);
		gy += u[3 + e] * 4 * (L[i] * g[2 * j + 1] + L[j] * g[2 * i + 1]);
	}
	return [gx, gy];
}

export function p2Value(u: ArrayLike<number>, L: ArrayLike<number>): number {
	let v = 0;
	for (let i = 0; i < 3; i++) v += u[i] * L[i] * (2 * L[i] - 1);
	for (let e = 0; e < 3; e++) v += u[3 + e] * 4 * L[EDGES[e][0]] * L[EDGES[e][1]];
	return v;
}

const memo = new WeakMap<EsFields, P2Display>();

/** Arrays of the refined display (built in the worker and transferred, W13) plus the triangle index of its mesh. */
export interface P2Arrays {
	x: Float64Array;
	y: Float64Array;
	tri: Int32Array;
	triRegion: Int32Array;
	ex: Float64Array;
	ey: Float64Array;
	index: TriIndex;
}

/** Quadratic potential in refined triangle s at (x, y): parent element s >> 2, barycentrics from its vertices. */
function makePhiAt(es: EsFields) {
	const { phiDof, elem } = es.p2!;
	const w = new Float64Array(6);
	return (s: number, px: number, py: number) => {
		const t = s >> 2;
		const a = elem[6 * t];
		const g = baryGrad(es.x, es.y, a, elem[6 * t + 1], elem[6 * t + 2]);
		const dx = px - es.x[a], dy = py - es.y[a];
		const L1 = g[2] * dx + g[3] * dy, L2 = g[4] * dx + g[5] * dy;
		for (let k = 0; k < 6; k++) w[k] = phiDof[elem[6 * t + k]];
		return p2Value(w, [1 - L1 - L2, L1, L2]);
	};
}

/** Main thread: the display for an es field set, from transferred arrays when present (else built here). */
export function p2Display(es: EsFields & { display?: P2Arrays }): P2Display | null {
	if (es.elementOrder !== 2 || !es.p2) return null;
	const hit = memo.get(es);
	if (hit) return hit;
	const a = es.display ?? buildP2Arrays(es);
	if (!a) return null;
	const mesh: FieldMesh = { x: a.x, y: a.y, tri: a.tri, triRegion: a.triRegion, regionNames: es.regionNames, regionMaterials: es.regionMaterials, index: a.index };
	const out: P2Display = { mesh, phi: es.p2.phiDof, ex: a.ex, ey: a.ey, phiAt: makePhiAt(es) };
	memo.set(es, out);
	return out;
}

/** Refined mesh, corner E values and triangle index (worker side, W13). */
export function buildP2Arrays(es: EsFields): P2Arrays | null {
	if (es.elementOrder !== 2 || !es.p2) return null;
	const { phiDof, elem } = es.p2;
	const nT = elem.length / 6, nV = es.x.length, nDof = phiDof.length;
	const x = new Float64Array(nDof), y = new Float64Array(nDof);
	x.set(es.x);
	y.set(es.y);
	for (let t = 0; t < nT; t++)
		for (let e = 0; e < 3; e++) {
			const m = elem[6 * t + 3 + e];
			if (m < nV) continue;
			const [i, j] = EDGES[e];
			x[m] = 0.5 * (es.x[elem[6 * t + i]] + es.x[elem[6 * t + j]]);
			y[m] = 0.5 * (es.y[elem[6 * t + i]] + es.y[elem[6 * t + j]]);
		}
	const tri = new Int32Array(12 * nT), triRegion = new Int32Array(4 * nT);
	const ex = new Float64Array(12 * nT), ey = new Float64Array(12 * nT);
	const u = new Float64Array(6);
	for (let t = 0; t < nT; t++) {
		const g = baryGrad(es.x, es.y, elem[6 * t], elem[6 * t + 1], elem[6 * t + 2]);
		for (let k = 0; k < 6; k++) u[k] = phiDof[elem[6 * t + k]];
		for (let s = 0; s < 4; s++) {
			const q = 4 * t + s;
			triRegion[q] = es.triRegion[t];
			for (let c = 0; c < 3; c++) {
				const local = SUB[s][c];
				tri[3 * q + c] = elem[6 * t + local];
				const [gx, gy] = p2Gradient(u, g, LOC[local]);
				ex[3 * q + c] = -gx;
				ey[3 * q + c] = -gy;
			}
		}
	}
	const mesh: FieldMesh = { x, y, tri, triRegion, regionNames: es.regionNames };
	return { x, y, tri, triRegion, ex, ey, index: buildTriIndex(mesh) };
}
