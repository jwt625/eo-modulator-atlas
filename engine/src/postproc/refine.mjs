// Refined element-local sampling for field plots (DevLog-034): barycentric lattice patterns of level r (COMSOL Quality >
// Resolution), the sub-triangle connectivity drawn by the UI, the drawn (piecewise-linear) interpolation, and the
// coincident-point groups used by smoothing (COMSOL Quality > Smoothing: none, inside material domains, everywhere).
// The engine evaluates every lattice point exactly from the element's own basis (store pattern point sets); the UI
// imports the same helpers, so drawn coordinates and interpolation are one implementation. License: GPL-3.0-or-later.

/** Resolution names and their subdivision level r (r^2 sub-triangles per element). */
export const RESOLUTIONS = Object.freeze({ none: 1, coarse: 2, normal: 3, fine: 4, finer: 6, extra: 8 });
export const MAX_RESOLUTION = 16;
/** Default cap on the total number of drawn sub-triangles (nTris x r^2). */
export const MAX_SUBTRIANGLES = 2_500_000;
export const SMOOTHING = Object.freeze(['none', 'material', 'everywhere']);

/** Index of lattice point (n0, n1, r - n0 - n1) in the pattern of level r. */
export const latticeIndex = (r, n0, n1) => n0 * (r + 1) - ((n0 * (n0 - 1)) >> 1) + n1;

const patterns = new Map();

/**
 * Refinement pattern of level r: barycentric coordinates L (3 per point, n0 outer, n1 inner), np = (r+1)(r+2)/2 points,
 * sub-triangles `sub` (3 local point indices each, r^2 of them).
 * @param {number} r
 * @returns {{r:number, np:number, nSub:number, L:Float64Array, sub:Int32Array}}
 */
export function refinePattern(r) {
  if (!(Number.isInteger(r) && r >= 1 && r <= MAX_RESOLUTION)) throw new Error(`resolution must be an integer from 1 to ${MAX_RESOLUTION} (or ${Object.keys(RESOLUTIONS).join(', ')})`);
  let p = patterns.get(r);
  if (p) return p;
  const np = ((r + 1) * (r + 2)) / 2;
  const L = new Float64Array(3 * np);
  let k = 0;
  for (let i = 0; i <= r; i++) for (let j = 0; j <= r - i; j++, k++) { L[3 * k] = i / r; L[3 * k + 1] = j / r; L[3 * k + 2] = (r - i - j) / r; }
  const sub = new Int32Array(3 * r * r);
  let s = 0;
  for (let i = 0; i < r; i++) for (let j = 0; j < r - i; j++) {
    sub[s++] = latticeIndex(r, i, j); sub[s++] = latticeIndex(r, i + 1, j); sub[s++] = latticeIndex(r, i, j + 1);
    if (i + j <= r - 2) { sub[s++] = latticeIndex(r, i + 1, j); sub[s++] = latticeIndex(r, i + 1, j + 1); sub[s++] = latticeIndex(r, i, j + 1); }
  }
  p = Object.freeze({ r, np, nSub: r * r, L, sub });
  patterns.set(r, p);
  return p;
}

/** Subdivision level of a resolution (name or integer). */
export function resolutionLevel(res = 'normal') {
  if (typeof res === 'number') { refinePattern(res); return res; }
  const r = RESOLUTIONS[res];
  if (!r) throw new Error(`unknown resolution '${res}' (${Object.keys(RESOLUTIONS).join(', ')} or an integer 1..${MAX_RESOLUTION})`);
  return r;
}

/** Largest level <= r with nTris r^2 <= cap (at least 1). */
export function cappedLevel(nTris, r, cap = MAX_SUBTRIANGLES) {
  let q = r;
  while (q > 1 && nTris * q * q > cap) q--;
  return q;
}

/**
 * Coordinates (um) of the lattice points of every element, element-major (same arithmetic as the store: l0 X[a] +
 * l1 X[b] + l2 X[c]).
 * @param {{x:ArrayLike<number>, y:ArrayLike<number>, tri:ArrayLike<number>}} mesh
 * @param {number} r
 */
export function refinedPoints(mesh, r) {
  const { L, np } = refinePattern(r);
  const { x: X, y: Y, tri } = mesh;
  const nT = tri.length / 3;
  const x = new Float64Array(nT * np), y = new Float64Array(nT * np);
  let i = 0;
  for (let t = 0; t < nT; t++) {
    const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
    for (let p = 0; p < np; p++, i++) {
      const l0 = L[3 * p], l1 = L[3 * p + 1], l2 = L[3 * p + 2];
      x[i] = l0 * X[a] + l1 * X[b] + l2 * X[c];
      y[i] = l0 * Y[a] + l1 * Y[b] + l2 * Y[c];
    }
  }
  return { x, y };
}

/**
 * Drawn value inside element t at barycentric (L0, L1, L2): linear interpolation on the sub-triangle of the lattice
 * that contains the point (what the renderer shades).
 * @param {ArrayLike<number>} values element-major lattice values
 * @param {number} r
 * @param {number} t element
 * @param {number} L0
 * @param {number} L1
 */
export function interpolateRefined(values, r, t, L0, L1) {
  const np = ((r + 1) * (r + 2)) / 2;
  const o = t * np;
  const s0 = Math.min(r, Math.max(0, L0 * r)), s1 = Math.min(r - s0, Math.max(0, L1 * r));
  let i = Math.min(r - 1, Math.floor(s0));
  let j = Math.min(r - 1 - i, Math.floor(s1));
  if (j < 0) j = 0;
  const f0 = s0 - i, f1 = s1 - j;
  const v = (a, b) => values[o + latticeIndex(r, a, b)];
  if (f0 + f1 <= 1 || i + j >= r - 1) return (1 - f0 - f1) * v(i, j) + f0 * v(i + 1, j) + f1 * v(i, j + 1);
  return (1 - f1) * v(i + 1, j) + (f0 + f1 - 1) * v(i + 1, j + 1) + (1 - f0) * v(i, j + 1);
}

/**
 * Neighbour across every local edge (edge k is opposite vertex k: vertices k+1, k+2), -1 on the boundary, from the
 * vertex-to-element adjacency (conforming mesh).
 * @param {{tri:ArrayLike<number>, nNodes?:number, x:ArrayLike<number>}} mesh
 */
export function edgeNeighbours(mesh) {
  const tri = mesh.tri, nT = tri.length / 3, nN = mesh.nNodes ?? mesh.x.length;
  const start = new Int32Array(nN + 1);
  for (let i = 0; i < 3 * nT; i++) start[tri[i] + 1]++;
  for (let v = 0; v < nN; v++) start[v + 1] += start[v];
  const fill = start.slice(0, nN), list = new Int32Array(3 * nT);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) list[fill[tri[3 * t + k]]++] = t;
  const nb = new Int32Array(3 * nT).fill(-1);
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    if (nb[3 * t + k] >= 0) continue;
    const a = tri[3 * t + ((k + 1) % 3)], b = tri[3 * t + ((k + 2) % 3)];
    for (let q = start[a]; q < start[a + 1]; q++) {
      const u = list[q];
      if (u === t) continue;
      const o = 3 * u;
      const kb = tri[o] === b ? 0 : tri[o + 1] === b ? 1 : tri[o + 2] === b ? 2 : -1;
      if (kb < 0) continue;
      const ka = tri[o] === a ? 0 : tri[o + 1] === a ? 1 : 2;
      nb[3 * t + k] = u;
      nb[o + (3 - ka - kb)] = t;
      break;
    }
  }
  return nb;
}

/**
 * Coincident-point groups of the lattice points of a mesh: slot[i] (element-major) and the slot count. Points in one
 * slot are averaged by smoothing. `group` (per element; null = everywhere) restricts sharing to elements of the same
 * group (material). Interior lattice points always get their own slot.
 * @param {{tri:ArrayLike<number>, x:ArrayLike<number>, nNodes?:number}} mesh
 * @param {Int32Array} nb edgeNeighbours(mesh)
 * @param {number} r
 * @param {ArrayLike<number>|null} group
 */
export function smoothingSlots(mesh, nb, r, group) {
  const { np } = refinePattern(r);
  const tri = mesh.tri, nT = tri.length / 3, nN = mesh.nNodes ?? mesh.x.length;
  const slot = new Int32Array(nT * np).fill(-1);
  let next = nN;
  // vertices: slot = node for the first group seen at the node, extra slots for further groups (interface vertices)
  const firstG = group ? new Int32Array(nN).fill(-1) : null;
  const extra = group ? new Map() : null;
  let G = 1;
  if (group) for (let t = 0; t < nT; t++) if (group[t] + 1 > G) G = group[t] + 1;
  const corner = [latticeIndex(r, r, 0), latticeIndex(r, 0, r), latticeIndex(r, 0, 0)];
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const v = tri[3 * t + k];
    let s = v;
    if (group) {
      const g = group[t];
      if (firstG[v] < 0) firstG[v] = g;
      else if (firstG[v] !== g) {
        const key = v * G + g;
        s = extra.get(key);
        if (s === undefined) { s = next++; extra.set(key, s); }
      }
    }
    slot[t * np + corner[k]] = s;
  }
  // edge lattice points: shared with the neighbour across the edge when it is in the same group
  const n = [0, 0, 0];
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const a = (k + 1) % 3, b = (k + 2) % 3;
    const u = nb[3 * t + k];
    const shared = u >= 0 && u < t && (!group || group[u] === group[t]);
    let ka = -1, kb = -1, kk = -1;
    if (shared) {
      const o = 3 * u, A = tri[3 * t + a], B = tri[3 * t + b];
      ka = tri[o] === A ? 0 : tri[o + 1] === A ? 1 : 2;
      kb = tri[o] === B ? 0 : tri[o + 1] === B ? 1 : 2;
      kk = 3 - ka - kb;
    }
    for (let m = 1; m < r; m++) {
      n[k] = 0; n[a] = r - m; n[b] = m;
      const i = t * np + latticeIndex(r, n[0], n[1]);
      if (shared) {
        n[kk] = 0; n[ka] = r - m; n[kb] = m;
        slot[i] = slot[u * np + latticeIndex(r, n[0], n[1])];
      } else slot[i] = next++;
    }
  }
  // interior points
  for (let i = 0; i < slot.length; i++) if (slot[i] < 0) slot[i] = next++;
  return { slot, nSlots: next };
}

/**
 * Smoothed copy of element-local values: every slot gets the arithmetic mean of its finite values (NaN when none).
 * @param {Float64Array} values
 * @param {{slot:Int32Array, nSlots:number}} slots
 */
export function smoothValues(values, { slot, nSlots }) {
  const sum = new Float64Array(nSlots), cnt = new Int32Array(nSlots);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === v) { sum[slot[i]] += v; cnt[slot[i]]++; }
  }
  const out = new Float64Array(values.length);
  for (let i = 0; i < values.length; i++) { const s = slot[i]; out[i] = cnt[s] ? sum[s] / cnt[s] : NaN; }
  return out;
}
