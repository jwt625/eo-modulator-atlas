// Inward recess of electrode polygons for the Wheeler incremental-inductance rule (DevLog-012 item 4).
// Every polygon edge that is a real conductor surface moves into the metal by `d` (um); edges lying on the domain
// boundary or on the mirror plane are cuts through a conductor, not surfaces, and stay. License: GPL-3.0-or-later.

const signedArea2 = (p) => p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]; return a + q[0] * r[1] - r[0] * q[1]; }, 0);

function segmentsCross(a, b, c, d) {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/**
 * Recess a simple polygon inward.
 * @param {number[][]} poly vertices (um), either orientation
 * @param {number} d recess depth (um), > 0
 * @param {(a:number[], b:number[]) => boolean} keep true for an edge that must not move (domain boundary, mirror plane)
 * @returns {number[][]} recessed polygon in the input orientation; throws when the recess changes the topology
 *   (an edge collapses or reverses, or the polygon self-intersects): the recess must be small against every feature.
 */
export function recessPolygon(poly, d, keep = () => false) {
  if (!(d > 0) || !Number.isFinite(d)) throw new Error(`recess depth must be a finite positive number; got ${d}`);
  const n = poly.length;
  const ccw = signedArea2(poly) > 0;
  const p = ccw ? poly : [...poly].reverse();
  // Offset line of edge i (p_i -> p_i+1): point + t * dir, shifted along the inward (left) normal for a CCW polygon.
  const lines = p.map((a, i) => {
    const b = p[(i + 1) % n];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    if (!(len > 0)) throw new Error('recess: polygon has a zero-length edge');
    const s = keep(a, b) ? 0 : d;
    const nx = -dy / len, ny = dx / len;
    return { x: a[0] + s * nx, y: a[1] + s * ny, dx: dx / len, dy: dy / len, s, nx, ny };
  });
  const out = p.map((v, i) => {
    const L1 = lines[(i - 1 + n) % n], L2 = lines[i];
    const den = L1.dx * L2.dy - L1.dy * L2.dx;
    if (Math.abs(den) < 1e-12) {
      if (Math.abs(L1.s - L2.s) > 1e-15) throw new Error('recess: collinear edges with different recess (a surface ends on a boundary cut mid-edge)');
      return [v[0] + L2.s * L2.nx, v[1] + L2.s * L2.ny];
    }
    const t = ((L2.x - L1.x) * L2.dy - (L2.y - L1.y) * L2.dx) / den;
    return [L1.x + t * L1.dx, L1.y + t * L1.dy];
  });
  for (let i = 0; i < n; i++) {
    const a = out[i], b = out[(i + 1) % n];
    if ((b[0] - a[0]) * lines[i].dx + (b[1] - a[1]) * lines[i].dy <= 0) throw new Error(`recess: depth ${d} um collapses an electrode edge; the skin depth is not small against the conductor features`);
  }
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (segmentsCross(out[i], out[(i + 1) % n], out[j], out[(j + 1) % n])) throw new Error('recess: recessed electrode polygon self-intersects');
  }
  if (!(signedArea2(out) > 0) || signedArea2(out) >= signedArea2(p)) throw new Error('recess: recessed polygon is not inside the original');
  return ccw ? out : out.reverse();
}

/**
 * Normalised geometry with every electrode recessed by d (um). Edges on the outer domain boundary and, with a mirror
 * symmetry, on the mirror plane are kept. Regions are unchanged: the vacated metal takes the region underneath, which is
 * irrelevant for L' = 1/(c^2 C0') (all permittivities 1).
 */
export function recessGeometry(geom, d) {
  const tol = 1e-9 * Math.max(geom.domain.x[1] - geom.domain.x[0], geom.domain.y[1] - geom.domain.y[0]);
  const on = (a, b, k, v) => Math.abs(a[k] - v) < tol && Math.abs(b[k] - v) < tol;
  const keep = (a, b) => on(a, b, 0, geom.domain.x[0]) || on(a, b, 0, geom.domain.x[1]) || on(a, b, 1, geom.domain.y[0]) || on(a, b, 1, geom.domain.y[1])
    || (geom.symmetry !== 'none' && on(a, b, 0, geom.mirror_x_um));
  return { ...geom, electrodes: geom.electrodes.map((e) => ({ ...e, poly: recessPolygon(e.poly, d, keep) })) };
}
