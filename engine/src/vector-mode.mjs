// Full-vector optical eigenmode solver on the conforming triangle mesh: Nedelec (H(curl)) edge elements for the
// transverse field and Lagrange elements for the longitudinal field, Lee-Sun-Cendes beta^2 formulation, solved by
// shift-invert block Arnoldi (thick restart) with a sparse LDL^T (ldlt.mjs). Vector post-processing and EO overlap.
//
// Element orders: order 1 = Whitney (Nedelec first kind, degree 1, 3 DOF) + P1 (closed-form element matrices);
// order 2 = hierarchical Nedelec first kind degree 2 (Whitney + gradient edge functions grad(L_a L_b) + 2 face
// functions L_2 N_01, L_0 N_12; 8 DOF) + hierarchical P2 (vertex L_a, edge bubble 4 L_a L_b; 6 DOF), 6-point degree-4
// quadrature (exact for every element integral with piecewise-constant permittivity). Both orders satisfy
// grad(Lagrange space) in the edge space, which the change of variables below requires.
//
// Frames and conventions (match materials.mjs / eo-overlap.mjs): lab x lateral, y film normal (up), z propagation.
// Fields E(x, y) exp(j(omega t - beta z)), mu = mu0, relative permittivity eps per triangle (piecewise constant) with
// eps_xz = eps_yz = 0 (holds for every lab rotation about the propagation axis; checked, throws otherwise).
// Coordinates in um, k0 = 2 pi / lambda_um (1/um), beta in 1/um.
//
// Formulation (derivation in DevLog-025). Unknowns e_t = beta E_t, e_z = -j E_z; change of variables
// e_t' = e_t + grad e_z. Pencil
//     A' x = -beta^2 B' x,   x = (e_t', e_z)
//     A' = [ S_tt - k0^2 T_eps ,  k0^2 G_eps ;  k0^2 G_eps^T , -k0^2 S_eps ]
//     B' = [ T_tt , 0 ; 0 , -k0^2 T_zz(eps_zz) ]
// Shift-invert matrix K = A' + sigma B' is quasi-definite for sigma > k0^2 max eps (LDL^T with 1x1 pivots exists for
// any ordering). Negative pivots of K minus N_z = number of (positive-type) eigenvalues above sigma (Sylvester).
// Lossy materials (metal policy 'lossy', eps = eps' - j eps''): complex-symmetric pencil, ComplexLDLT, Arnoldi on the
// realified operator; beta = beta_r - j alpha, loss 20 log10(e) alpha per length.
//
// Physical fields exported (lossless): E_t = e_t / beta (real), E_z = j * ez (ez stored), H_t = z x e_t' / (k0 eta0)
// (real), H_z = j * hz with hz = curl(E_t) / (k0 eta0). Normalised to max |E| = 1 V/m over triangle centroids, largest
// transverse centroid component positive. P_z (W, for that normalisation) = 1e-12 Re[ int e_t . conj(e_t') dA_um / beta ]
// / (2 eta0 k0); for a lossless eigenvector int e_t . e_t' = x^T B' x exactly (row 2 of the pencil).
// License: GPL-3.0-or-later.

import { buildOpticalModel } from './optics.mjs';
import { CrossSection } from './section.mjs';
import { triangleGeometry } from './fem.mjs';
import { ndOrder, analyze } from './sparse.mjs';
import { epsOptLab, opticalIndexAt, libraryIndex, deltaEpsLab } from './materials.mjs';
import { SymbolicLDLT, LDLT, ComplexLDLT, SupernodalLDLT, ComplexSupernodalLDLT } from './ldlt.mjs';
import { TriLocator, gradientAt } from './electrostatics.mjs';
import { eigenvalues, realEigenvectors, complexEigenvectors } from './vector-dense.mjs';

/** Labels carried by every vector result (element order label added per model). */
export const VECTOR_LABELS = Object.freeze(['full_vector_optical']);
const ORDER_LABELS = { 1: 'nedelec1_p1', 2: 'nedelec1_deg2_p2' };
/** Metal handling: reject (default), absent (metal not in the optical model), pec (vector PEC on the metal surface), lossy (complex permittivity). */
export const VECTOR_METAL_POLICIES = Object.freeze(['reject', 'absent', 'pec', 'lossy']);
const METAL_LABELS = { absent: 'optical_metal_absent_limit', pec: 'optical_metal_pec_vector', lossy: 'optical_metal_complex_permittivity' };
/** Free-space impedance mu0 c (ohm), CODATA 2018 (mu0 = 1.25663706212e-6 N/A^2, c exact). */
const ETA0 = 1.25663706212e-6 * 299792458;
const OFFDIAG_TOL = 1e-9;
/** Local DOF counts per triangle: nt (transverse, edge space), nz (longitudinal, Lagrange). */
const NLOC = { 1: { nt: 3, nz: 3 }, 2: { nt: 8, nz: 6 } };

const fail = (msg) => {
  throw new Error(`vector-mode: ${msg}`);
};

// ---------------------------------------------------------------------------------------------------------------
// Model: mesh (reused from optics.buildOpticalModel or explicit refinement boxes), edges, DOF map, CSR pattern,
// ordering, symbolic LDL^T.

const SIDES = ['left', 'right', 'bottom', 'top'];
function normalizeBoundary(b = {}) {
  const out = {};
  for (const s of SIDES) {
    const v = b[s] ?? 'pec';
    if (v === 'pec' || v === 'dirichlet') out[s] = 'pec';
    else if (v === 'pmc' || v === 'neumann') out[s] = 'pmc';
    else fail(`boundary.${s} must be pec or pmc (or the scalar aliases dirichlet / neumann); got ${v}`);
  }
  return out;
}

/**
 * Build the vector optical model of a cross-section (window mesh, topology, pattern, ordering, symbolic analysis).
 * The model depends on geometry, boundary conditions, metal policy and element order, not on the wavelength: one
 * model (and one symbolic factorisation) serves every wavelength, shift and material perturbation.
 * @param {import('./section.mjs').CrossSection} section
 * @param {Record<string, any>} mats resolved materials
 * @param {{lambda0Um:number, order?:1|2, window?:{x:[number,number],y:[number,number]}, metal?:string,
 *   boundary?:{left?:string,right?:string,bottom?:string,top?:string},
 *   mirror?:{xUm:number, keep:'left'|'right', condition:'pec'|'pmc'}, hints?:any, meshScale?:number,
 *   refine?:{x:[number,number], y:[number,number], h_um:number}[], cornerRefine?:{h_um:number, grade?:number},
 *   factorization?:'supernodal'|'uplooking',
 *   ordering?:'amd'|'nd'}} opts
 *   refine / cornerRefine: explicit window meshing (refinement boxes; graded point refinement at region vertices
 *   inside the window) instead of the scalar default sizing of buildOpticalModel.
 *   order: element order, 2 (default; Nedelec deg 2 + P2) or 1 (Whitney + P1).
 *   factorization: 'supernodal' (default; multifrontal on sparse.mjs analyze) or 'uplooking' (ldlt.mjs LDLT).
 *   ordering: 'amd' (default) or 'nd' (coordinate nested dissection).
 */
export function buildVectorModel(section, mats, opts = {}) {
  const t0 = performance.now();
  const metal = opts.metal ?? 'reject';
  const order = opts.order ?? 2;
  if (!NLOC[order]) fail(`order must be 1 or 2; got ${order}`);
  if (!VECTOR_METAL_POLICIES.includes(metal)) fail(`metal policy must be one of ${VECTOR_METAL_POLICIES.join(', ')}; got ${metal}`);
  if (!(opts.lambda0Um > 0)) fail('lambda0Um (anchor wavelength, um) is required');
  let win = opts.window ?? section.geom.optical_window;
  if (!win) fail(`cross-section ${section.name}: optical_window is required`);
  const boundary = normalizeBoundary(opts.boundary);
  let mirror = null;
  if (opts.mirror) {
    const { xUm, keep, condition } = opts.mirror;
    if (!Number.isFinite(xUm)) fail('mirror.xUm must be a finite number');
    if (keep !== 'left' && keep !== 'right') fail('mirror.keep must be left or right');
    if (condition !== 'pec' && condition !== 'pmc') fail('mirror.condition must be pec (E tangential = 0 on the plane, odd E_y/E_z) or pmc (even E_y/E_z)');
    if (!(xUm > win.x[0] && xUm < win.x[1])) fail('mirror plane must lie strictly inside the optical window');
    win = keep === 'right' ? { x: [xUm, win.x[1]], y: win.y } : { x: [win.x[0], xUm], y: win.y };
    boundary[keep === 'right' ? 'left' : 'right'] = condition;
    mirror = { xUm, keep, condition };
  }
  const sizing = opts.sizing ?? (opts.refine || opts.cornerRefine ? 'explicit' : 'auto');
  if (!['auto', 'explicit', 'scalar'].includes(sizing)) fail(`sizing must be auto, explicit or scalar; got ${sizing}`);
  const base = sizing === 'explicit'
    ? refinedWindowModel(section, mats, win, metal, opts)
    : sizing === 'auto'
      ? autoWindowModel(section, mats, win, metal, order, opts)
      : buildOpticalModel(section, mats, {
        window: win,
        polarization: 'TE',
        lambda0Um: opts.lambda0Um,
        metal: metal === 'absent' ? 'absent' : 'reject',
        hints: opts.hints,
        meshScale: opts.meshScale,
      });
  const tMesh = performance.now();
  const { mesh } = base;
  const geo = triangleGeometry(mesh);
  const nT = mesh.nTris;
  const area = new Float64Array(nT);
  for (let t = 0; t < nT; t++) area[t] = Math.abs(geo.area[t]);
  // conductor triangles (present unless metal policy 'absent')
  const isMetal = new Uint8Array(nT);
  let nMetal = 0;
  for (let t = 0; t < nT; t++) {
    const r = base.regions[mesh.triRegion[t]];
    if (mats[r.material]?.conductor) {
      isMetal[t] = 1;
      nMetal++;
    }
  }
  if (nMetal && metal === 'reject') fail(`conductor intersects the optical window (${nMetal} triangles); choose metal policy 'absent', 'pec' or 'lossy' explicitly`);
  const dead = new Uint8Array(nT);
  if (metal === 'pec') for (let t = 0; t < nT; t++) dead[t] = isMetal[t];
  const edges = buildEdges(mesh);
  const dof = buildDofMap(mesh, edges, dead, boundary, order);
  const pat = buildPattern(mesh, dof);
  const tPat = performance.now();
  const factorization = opts.factorization ?? 'supernodal';
  const ordering = opts.ordering ?? 'amd';
  if (factorization !== 'supernodal' && factorization !== 'uplooking') fail(`factorization must be supernodal or uplooking; got ${factorization}`);
  if (ordering !== 'amd' && ordering !== 'nd') fail(`ordering must be amd or nd; got ${ordering}`);
  let perm, sym, tOrd;
  if (factorization === 'supernodal') {
    sym = analyze(pat.pat, { ordering, x: dof.x, y: dof.y });
    perm = sym.perm;
    tOrd = tPat + sym.timing.ordering_ms;
  } else {
    perm = ordering === 'nd' ? ndOrder(pat.pat, dof.x, dof.y) : analyze(pat.pat, { ordering: 'amd' }).perm;
    tOrd = performance.now();
    sym = new SymbolicLDLT(pat.pat, perm);
  }
  const tSym = performance.now();
  const usedRegions = new Set(mesh.triRegion);
  const metalRec = {
    policy: metal,
    inMesh: base.regions.filter((r, i) => mats[r.material]?.conductor && usedRegions.has(i)).map((r) => r.name),
    omittedFromModel: base.metal.omittedFromModel,
    labels: METAL_LABELS[metal] ? [METAL_LABELS[metal]] : [],
  };
  return {
    kind: 'vector',
    order,
    section,
    mats,
    mesh,
    geo,
    area,
    regions: base.regions,
    lambda0Um: opts.lambda0Um,
    window: win,
    boundary,
    mirror,
    metal: metalRec,
    isMetal,
    dead,
    edges,
    dof,
    pattern: pat,
    perm,
    sym,
    factorization,
    ordering,
    sizing: { mode: sizing, ...(base.sizing ?? {}) },
    coreNames: base.coreNames,
    coreEdge: base.coreEdge,
    maxEdge: base.maxEdge,
    timing: { meshMs: tMesh - t0, topologyPatternMs: tPat - tMesh, orderingMs: tOrd - tPat, symbolicMs: tSym - tOrd },
  };
}

/**
 * Window mesh with explicit refinement boxes (opts.refine = [{x:[x0,x1], y:[y0,y1], h_um}]) instead of the scalar
 * default (every high-index region refined at lambda / (22 n_max)). Useful when a high-index slab spans the window.
 * Sizes are scaled by opts.meshScale; grading and max edge from opts.hints (grade 0.25, max_edge_um lambda / 8).
 */
function refinedWindowModel(section, mats, win, metal, opts) {
  const g = section.geom;
  const regions = g.regions.map((r) => ({ name: r.name, material: r.material, poly: r.poly }));
  if (metal !== 'absent') for (const e of g.electrodes) regions.push({ name: `electrode:${e.name}`, material: e.material, poly: e.poly });
  const os = new CrossSection({ symmetry: 'none', mirror_x_um: 0, domain: { x: win.x, y: win.y }, regions, electrodes: [], optical_window: null, mesh: {}, boundary: {} }, `${section.name}:optical`);
  const scale = opts.meshScale ?? 1;
  const hints = opts.hints ?? {};
  const grade = hints.grade ?? 0.25;
  const maxEdge = (hints.max_edge_um ?? opts.lambda0Um / 8) * scale;
  const sources = (opts.refine ?? []).map((b, i) => {
    if (!(Array.isArray(b.x) && Array.isArray(b.y) && b.h_um > 0)) fail(`refine[${i}] must be {x:[x0,x1], y:[y0,y1], h_um > 0}`);
    return { poly: [[b.x[0], b.y[0]], [b.x[1], b.y[0]], [b.x[1], b.y[1]], [b.x[0], b.y[1]]], filled: true, h0: b.h_um * scale, grade };
  });
  // graded point refinement at every region-polygon vertex strictly inside the window (field singularities at
  // dielectric and metal corners); same point-source mechanism the electrostatic mesh uses at electrode corners
  const cr = opts.cornerRefine;
  if (cr) {
    if (!(cr.h_um > 0)) fail('cornerRefine must be {h_um > 0, grade?}');
    const tol = 1e-9 * Math.hypot(win.x[1] - win.x[0], win.y[1] - win.y[0]);
    const seen = new Set();
    for (const r of regions)
      for (const [x, y] of r.poly) {
        if (!(x > win.x[0] + tol && x < win.x[1] - tol && y > win.y[0] + tol && y < win.y[1] - tol)) continue;
        const key = `${x.toPrecision(12)},${y.toPrecision(12)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        sources.push({ poly: [[x, y]], filled: false, h0: cr.h_um * scale, grade: cr.grade ?? grade });
      }
  }
  if (!sources.length) fail('refine boxes or cornerRefine required for the explicit meshing path');
  const mesh = os.buildMesh({ sourcesOnly: true, hints: { max_edge_um: maxEdge, grade, max_vertices: g.mesh?.max_vertices ?? 80000 }, extraSources: sources, scale: 1, minAngleBound: 1.35 });
  mesh.rect = os.rect;
  const omitted = metal === 'absent' ? g.electrodes.filter((e) => e.poly.some((p) => p[0] >= win.x[0] && p[0] <= win.x[1] && p[1] >= win.y[0] && p[1] <= win.y[1])).map((e) => `electrode:${e.name}`) : [];
  return { mesh, regions, coreNames: [], coreEdge: Math.min(...sources.map((q) => q.h0)), maxEdge, metal: { omittedFromModel: omitted } };
}

/**
 * Default sizing constants of the 'auto' (vector-tuned) window mesh, per element order: element size in a region of
 * index n is lambda0 / (cRegion n); core regions (index >= 0.98 of the window maximum, the scalar rule) use
 * lambda0 / (cCore n_max); region vertices inside the window get graded point refinement lambda0 / (cCorner n_max).
 * All sizes are multiplied by meshScale. Chosen by the DevLog-025 round-3 convergence study.
 */
export const AUTO_SIZING = Object.freeze({
  1: Object.freeze({ cRegion: 12, cCore: 24, cCorner: 80, grade: 0.25, cornerGrade: 0.2 }),
  2: Object.freeze({ cRegion: 5, cCore: 8, cCorner: 30, grade: 0.3, cornerGrade: 0.2 }),
});

/**
 * Vector-tuned window mesh ('auto' sizing): local-wavelength sizing per region, finer core regions, graded corner
 * refinement. Replaces the scalar default (every core region at lambda / (22 n), tuned for P1), which over-resolves
 * thin slabs for order-2 elements. Overrides: opts.sizingParams (any AUTO_SIZING field), opts.meshScale.
 */
function autoWindowModel(section, mats, win, metal, order, opts) {
  const g = section.geom;
  const P = { ...AUTO_SIZING[order], ...(opts.sizingParams ?? {}) };
  const scale = opts.meshScale ?? 1;
  const lam = opts.lambda0Um;
  const regions = g.regions.map((r) => ({ name: r.name, material: r.material, poly: r.poly }));
  if (metal !== 'absent') for (const e of g.electrodes) regions.push({ name: `electrode:${e.name}`, material: e.material, poly: e.poly });
  const os = new CrossSection({ symmetry: 'none', mirror_x_um: 0, domain: { x: win.x, y: win.y }, regions, electrodes: [], optical_window: null, mesh: {}, boundary: {} }, `${section.name}:optical`);
  const hitsWindow = (poly) => {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    return Math.max(...xs) > win.x[0] && Math.min(...xs) < win.x[1] && Math.max(...ys) > win.y[0] && Math.min(...ys) < win.y[1];
  };
  const index = (r) => {
    const m = mats[r.material];
    if (!m || m.conductor) return null;
    const e = epsOptLab(m, lam, lam);
    return e ? Math.sqrt(Math.max(e[0], e[4], e[8])) : null;
  };
  const inWin = regions.filter((r) => hitsWindow(r.poly));
  const nOf = new Map(inWin.map((r) => [r, index(r)]));
  const nMax = Math.max(...[...nOf.values()].filter((v) => v));
  if (!(nMax > 0)) fail('auto sizing: no dielectric with an optical index in the window');
  const hCore = (scale * lam) / (P.cCore * nMax), hCorner = (scale * lam) / (P.cCorner * nMax);
  const sources = [];
  const core = [];
  for (const r of inWin) {
    const n = nOf.get(r) ?? nMax; // metal (pec / lossy): treat with the core size; its corners get the corner size
    const isCore = n >= 0.98 * nMax;
    if (isCore) core.push(r.name);
    sources.push({ poly: r.poly, filled: true, h0: isCore ? hCore : (scale * lam) / (P.cRegion * n), grade: P.grade });
  }
  const tol = 1e-9 * Math.hypot(win.x[1] - win.x[0], win.y[1] - win.y[0]);
  const seen = new Set();
  let nCorners = 0;
  for (const r of inWin)
    for (const [x, y] of r.poly) {
      if (!(x > win.x[0] + tol && x < win.x[1] - tol && y > win.y[0] + tol && y < win.y[1] - tol)) continue;
      const key = `${x.toPrecision(12)},${y.toPrecision(12)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      sources.push({ poly: [[x, y]], filled: false, h0: hCorner, grade: P.cornerGrade });
      nCorners++;
    }
  const maxEdge = (scale * lam) / P.cRegion;
  const mesh = os.buildMesh({ sourcesOnly: true, hints: { max_edge_um: maxEdge, grade: P.grade, max_vertices: g.mesh?.max_vertices ?? 80000 }, extraSources: sources, scale: 1, minAngleBound: 1.35 });
  mesh.rect = os.rect;
  const omitted = metal === 'absent' ? g.electrodes.filter((e) => hitsWindow(e.poly)).map((e) => `electrode:${e.name}`) : [];
  return { mesh, regions, coreNames: core, coreEdge: hCore, maxEdge, metal: { omittedFromModel: omitted }, sizing: { params: P, meshScale: scale, hCoreUm: hCore, hCornerUm: hCorner, nMax, corners: nCorners } };
}

/** Unique edges with global orientation low -> high node index; per-triangle local edge k = (v_k, v_{k+1}). */
function buildEdges(mesh) {
  const nN = mesh.nNodes, nT = mesh.nTris, tri = mesh.tri;
  const start = new Int32Array(nN + 1);
  for (let t = 0; t < nT; t++)
    for (let k = 0; k < 3; k++) {
      const u = tri[3 * t + k], v = tri[3 * t + ((k + 1) % 3)];
      start[(u < v ? u : v) + 1]++;
    }
  for (let i = 0; i < nN; i++) start[i + 1] += start[i];
  const fill = start.slice(0, nN);
  const hiOf = new Int32Array(3 * nT), slotOf = new Int32Array(3 * nT);
  for (let t = 0; t < nT; t++)
    for (let k = 0; k < 3; k++) {
      const u = tri[3 * t + k], v = tri[3 * t + ((k + 1) % 3)];
      const lo = u < v ? u : v;
      const q = fill[lo]++;
      hiOf[q] = u < v ? v : u;
      slotOf[q] = 3 * t + k;
    }
  const triEdge = new Int32Array(3 * nT);
  const triSign = new Int8Array(3 * nT);
  const stamp = new Int32Array(nN).fill(-1), seen = new Int32Array(nN);
  const eA = [], eB = [];
  for (let lo = 0; lo < nN; lo++)
    for (let q = start[lo]; q < start[lo + 1]; q++) {
      const hi = hiOf[q];
      let e;
      if (stamp[hi] === lo) e = seen[hi];
      else {
        e = eA.length;
        eA.push(lo);
        eB.push(hi);
        stamp[hi] = lo;
        seen[hi] = e;
      }
      const s = slotOf[q];
      triEdge[s] = e;
      const t = (s / 3) | 0, k = s % 3;
      triSign[s] = tri[3 * t + k] < tri[3 * t + ((k + 1) % 3)] ? 1 : -1;
    }
  return { nE: eA.length, eA: Int32Array.from(eA), eB: Int32Array.from(eB), triEdge, triSign };
}

/**
 * DOF numbering and the per-triangle local DOF table.
 * Transverse (edge space) DOFs first: Whitney per edge [, gradient edge function per edge, 2 face functions per
 * triangle], then longitudinal: vertex [, edge bubble]. PEC window sides and PEC metal surfaces constrain the edge and
 * node DOFs on them (tangential E and E_z zero); PMC is natural. Local table td: nloc = nt + nz entries per triangle
 * in the local basis order of evalBasis (W01, W12, W20 [, G01, G12, G20, F0, F1] | L0, L1, L2 [, B01, B12, B20]);
 * -1 = constrained or dead triangle. Only the Whitney functions carry an orientation sign (edges.triSign).
 */
function buildDofMap(mesh, edges, dead, boundary, order) {
  const { nE, eA, eB, triEdge } = edges;
  const nN = mesh.nNodes, nT = mesh.nTris;
  const { nt, nz } = NLOC[order];
  const nloc = nt + nz;
  const rect = mesh.rect;
  const tol = 1e-9 * Math.hypot(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const sideBits = new Uint8Array(nN); // bit0 left, bit1 right, bit2 bottom, bit3 top
  for (let i = 0; i < nN; i++) {
    const x = mesh.x[i], y = mesh.y[i];
    sideBits[i] = (Math.abs(x - rect.x0) < tol ? 1 : 0) | (Math.abs(x - rect.x1) < tol ? 2 : 0) | (Math.abs(y - rect.y0) < tol ? 4 : 0) | (Math.abs(y - rect.y1) < tol ? 8 : 0);
  }
  const pecBits = (boundary.left === 'pec' ? 1 : 0) | (boundary.right === 'pec' ? 2 : 0) | (boundary.bottom === 'pec' ? 4 : 0) | (boundary.top === 'pec' ? 8 : 0);
  const liveNode = new Uint8Array(nN), deadNode = new Uint8Array(nN), liveEdge = new Uint8Array(nE), deadEdge = new Uint8Array(nE);
  for (let t = 0; t < nT; t++)
    for (let k = 0; k < 3; k++) {
      (dead[t] ? deadNode : liveNode)[mesh.tri[3 * t + k]] = 1;
      (dead[t] ? deadEdge : liveEdge)[triEdge[3 * t + k]] = 1;
    }
  const freeEdge = new Uint8Array(nE);
  for (let e = 0; e < nE; e++) freeEdge[e] = liveEdge[e] && !deadEdge[e] && !(sideBits[eA[e]] & sideBits[eB[e]] & pecBits) ? 1 : 0;
  const freeNode = new Uint8Array(nN);
  for (let i = 0; i < nN; i++) freeNode[i] = liveNode[i] && !deadNode[i] && !(sideBits[i] & pecBits) ? 1 : 0;
  let n = 0;
  const edgeDof = new Int32Array(nE).fill(-1);
  for (let e = 0; e < nE; e++) if (freeEdge[e]) edgeDof[e] = n++;
  let edgeDof2 = null, faceDof = null, edgeNodeDof = null;
  if (order === 2) {
    edgeDof2 = new Int32Array(nE).fill(-1);
    for (let e = 0; e < nE; e++) if (freeEdge[e]) edgeDof2[e] = n++;
    faceDof = new Int32Array(2 * nT).fill(-1);
    for (let t = 0; t < nT; t++) if (!dead[t]) faceDof[2 * t] = n++, faceDof[2 * t + 1] = n++;
  }
  const nTDof = n;
  const nodeDof = new Int32Array(nN).fill(-1);
  for (let i = 0; i < nN; i++) if (freeNode[i]) nodeDof[i] = n++;
  if (order === 2) {
    edgeNodeDof = new Int32Array(nE).fill(-1);
    for (let e = 0; e < nE; e++) if (freeEdge[e]) edgeNodeDof[e] = n++;
  }
  // DOF coordinates (for the nested-dissection ordering)
  const x = new Float64Array(n), y = new Float64Array(n);
  const setEdge = (arr) => {
    for (let e = 0; e < nE; e++)
      if (arr[e] >= 0) {
        x[arr[e]] = 0.5 * (mesh.x[eA[e]] + mesh.x[eB[e]]);
        y[arr[e]] = 0.5 * (mesh.y[eA[e]] + mesh.y[eB[e]]);
      }
  };
  setEdge(edgeDof);
  for (let i = 0; i < nN; i++)
    if (nodeDof[i] >= 0) {
      x[nodeDof[i]] = mesh.x[i];
      y[nodeDof[i]] = mesh.y[i];
    }
  if (order === 2) {
    setEdge(edgeDof2);
    setEdge(edgeNodeDof);
    for (let t = 0; t < nT; t++)
      for (let j = 0; j < 2; j++) {
        const d = faceDof[2 * t + j];
        if (d < 0) continue;
        const a = mesh.tri[3 * t], b = mesh.tri[3 * t + 1], c = mesh.tri[3 * t + 2];
        x[d] = (mesh.x[a] + mesh.x[b] + mesh.x[c]) / 3;
        y[d] = (mesh.y[a] + mesh.y[b] + mesh.y[c]) / 3;
      }
  }
  // local table
  const td = new Int32Array(nloc * nT).fill(-1);
  for (let t = 0; t < nT; t++) {
    if (dead[t]) continue;
    const o = nloc * t;
    for (let k = 0; k < 3; k++) {
      const e = triEdge[3 * t + k];
      td[o + k] = edgeDof[e];
      td[o + nt + k] = nodeDof[mesh.tri[3 * t + k]];
      if (order === 2) {
        td[o + 3 + k] = edgeDof2[e];
        td[o + nt + 3 + k] = edgeNodeDof[e];
      }
    }
    if (order === 2) {
      td[o + 6] = faceDof[2 * t];
      td[o + 7] = faceDof[2 * t + 1];
    }
  }
  return { order, n, nt, nz, nloc, nTDof, nZDof: n - nTDof, nEdgeDof: nTDof, nNodeDof: n - nTDof, edgeDof, edgeDof2, faceDof, nodeDof, edgeNodeDof, td, x, y };
}

/** CSR pattern as the union of per-triangle nloc x nloc cliques and the per-triangle scatter map. */
function buildPattern(mesh, dof) {
  const nT = mesh.nTris, n = dof.n, nloc = dof.nloc, td = dof.td;
  const cnt = new Int32Array(n + 1);
  for (let q = 0; q < nloc * nT; q++) if (td[q] >= 0) cnt[td[q] + 1]++;
  for (let i = 0; i < n; i++) cnt[i + 1] += cnt[i];
  const fillp = cnt.slice(0, n);
  const dt = new Int32Array(cnt[n]);
  for (let q = 0; q < nloc * nT; q++) if (td[q] >= 0) dt[fillp[td[q]]++] = (q / nloc) | 0;
  const mark = new Int32Array(n).fill(-1);
  const rowptr = new Int32Array(n + 1);
  let cols = new Int32Array(Math.max(16, 4 * nloc * n));
  let nnz = 0;
  const buf = [];
  for (let i = 0; i < n; i++) {
    buf.length = 0;
    for (let p = cnt[i]; p < cnt[i + 1]; p++) {
      const o = nloc * dt[p];
      for (let a = 0; a < nloc; a++) {
        const j = td[o + a];
        if (j >= 0 && mark[j] !== i) {
          mark[j] = i;
          buf.push(j);
        }
      }
    }
    buf.sort((a, b) => a - b);
    if (nnz + buf.length > cols.length) {
      const c2 = new Int32Array(Math.max(cols.length * 2, nnz + buf.length));
      c2.set(cols);
      cols = c2;
    }
    for (let k = 0; k < buf.length; k++) cols[nnz++] = buf[k];
    rowptr[i + 1] = nnz;
  }
  const colidx = cols.slice(0, nnz);
  const pat = { n, rowptr, colidx, nnz };
  const nl2 = nloc * nloc;
  const pos = new Int32Array(nl2 * nT).fill(-1);
  for (let t = 0; t < nT; t++)
    for (let a = 0; a < nloc; a++) {
      const i = td[nloc * t + a];
      if (i < 0) continue;
      for (let b = 0; b < nloc; b++) {
        const j = td[nloc * t + b];
        if (j < 0) continue;
        let lo = rowptr[i], hi = rowptr[i + 1] - 1;
        while (lo <= hi) {
          const m = (lo + hi) >> 1;
          if (colidx[m] < j) lo = m + 1;
          else hi = m - 1;
        }
        pos[nl2 * t + nloc * a + b] = lo;
      }
    }
  return { pat, pos };
}

// ---------------------------------------------------------------------------------------------------------------
// Materials per triangle.

function anchorInRange(m, lambda0Um) {
  if (!m.dispersionKey) return;
  for (const comp of ['n', 'n_o', 'n_e']) {
    const l = libraryIndex(m.dispersionKey, comp, lambda0Um);
    if (l && !l.inRange) fail(`material ${m.name} dispersion anchor wavelength ${lambda0Um} um is outside the library validity range`);
  }
}

/** Lab-frame tensor [xx, xy, yy, zz] of a material at a wavelength (null if no optical index). */
function tensor4(m, lambdaUm, lambda0Um, checkRange = true) {
  if (checkRange) {
    const idx = opticalIndexAt(m, lambdaUm, lambda0Um);
    if (idx && !idx.inRange) fail(`material ${m.name} dispersion is out of range at ${lambdaUm} um`);
  }
  const e = epsOptLab(m, lambdaUm, lambda0Um);
  if (!e) return null;
  const dmax = Math.max(Math.abs(e[0]), Math.abs(e[4]), Math.abs(e[8]));
  for (const k of [2, 5, 6, 7]) if (Math.abs(e[k]) > OFFDIAG_TOL * dmax) fail(`material ${m.name} has eps_xz or eps_yz != 0 in the lab frame (crystal axis tilted out of the cross-section plane); not supported by this formulation`);
  return [e[0], 0.5 * (e[1] + e[3]), e[4], e[8]];
}

/**
 * Complex relative permittivity of a conductor for the 'lossy' policy, from opts.metalPermittivity[materialName] =
 * [eps_real, eps_loss] meaning eps = eps_real - j eps_loss (exp(+j omega t) convention, eps_loss >= 0 for a lossy
 * metal). Required input; no metal permittivity is ever defaulted.
 */
function metalEps(m, opts) {
  const v = opts.metalPermittivity?.[m.name];
  if (!v) fail(`metal policy 'lossy' needs metalPermittivity.${m.name} = [eps_real, eps_loss] at the solve wavelength (eps = eps_real - j eps_loss, eps_loss >= 0); no metal index is ever defaulted`);
  if (!Array.isArray(v) || v.length !== 2 || !v.every(Number.isFinite) || v[1] < 0) fail(`metalPermittivity.${m.name} must be [eps_real, eps_loss >= 0]`);
  return v;
}

/**
 * Largest planar surface-plasmon index Re sqrt(eps_m eps_d / (eps_m + eps_d)) over every lossy metal (eps_m' < 0) and
 * every dielectric principal permittivity eps_d present in the window (conservative: pairs need not touch). Pairs with
 * eps_m' >= -eps_d support no bound planar SPP and are skipped. Returns {nSppMax, pairs: [{metal, eps_d, nSpp}]}.
 */
function metalPairs(per) {
  const metals = per.filter((p) => p && p.metal && p.eps[0] < 0);
  const diel = [];
  for (const p of per) if (p && p.live && !p.metal) diel.push(p.eps[0], p.eps[2], p.eps[3]);
  let nSppMax = 0;
  const pairs = [];
  for (const m of metals)
    for (const ed of new Set(diel)) {
      const er = m.eps[0], ei = -m.im[0]; // eps_m = er + j ei (ei = -eps'')
      if (!(er < -ed)) continue;
      // q = eps_m ed / (eps_m + ed)
      const nr = er * ed, ni = ei * ed, dr = er + ed, di = ei, d2 = dr * dr + di * di;
      const qr = (nr * dr + ni * di) / d2, qi = (ni * dr - nr * di) / d2;
      const mod = Math.hypot(qr, qi), nSpp = Math.sqrt(0.5 * (mod + qr));
      pairs.push({ metal: m.name, eps_d: ed, nSpp });
      if (Number.isFinite(nSpp)) nSppMax = Math.max(nSppMax, nSpp);
    }
  return { nSppMax, pairs };
}

/**
 * Per-triangle permittivity tensors at a wavelength.
 * @returns {{eps:Float64Array, epsG:Float64Array, epsIm:Float64Array|null, nMax:number}}
 *   eps, epsG: 4 per triangle [xx, xy, yy, zz]; epsG = eps - (lambda/2) d eps / d lambda (group term).
 *   epsIm: loss part (eps = eps - j epsIm) for the lossy metal policy, else null.
 */
export function vectorMaterialTensors(model, lambdaUm, opts = {}) {
  const { mesh, regions, mats } = model;
  const nT = mesh.nTris;
  const used = new Set(mesh.triRegion);
  const h = 1e-4 * lambdaUm;
  let lossy = false;
  const per = regions.map((r, i) => {
    if (!used.has(i)) return null;
    const m = mats[r.material];
    if (m.conductor) {
      if (model.metal.policy === 'pec') return { eps: [0, 0, 0, 0], epsG: [0, 0, 0, 0], im: [0, 0, 0, 0], live: false };
      if (model.metal.policy === 'lossy') {
        const [re, loss] = metalEps(m, opts);
        lossy = true;
        // metal dispersion is not modelled: group term uses eps itself (documented limitation)
        return { eps: [re, 0, re, re], epsG: [re, 0, re, re], im: [loss, 0, loss, loss], live: true, metal: true, name: m.name };
      }
      fail(`conductor ${r.material} in the optical window under metal policy ${model.metal.policy}`);
    }
    anchorInRange(m, model.lambda0Um);
    const e = tensor4(m, lambdaUm, model.lambda0Um);
    if (!e) fail(`material ${r.material} has no optical index`);
    if (!(e[0] > 0 && e[2] > 0 && e[3] > 0)) fail(`material ${r.material} has a non-positive optical permittivity`);
    const ep = tensor4(m, lambdaUm + h, model.lambda0Um, false), em = tensor4(m, lambdaUm - h, model.lambda0Um, false);
    const g = e.map((v, k) => v - (lambdaUm / 2) * (ep[k] - em[k]) / (2 * h));
    return { eps: e, epsG: g, im: [0, 0, 0, 0], live: true };
  });
  const eps = new Float64Array(4 * nT), epsG = new Float64Array(4 * nT);
  const epsIm = lossy ? new Float64Array(4 * nT) : null;
  let nMax2 = 0;
  for (let t = 0; t < nT; t++) {
    const p = per[mesh.triRegion[t]];
    for (let k = 0; k < 4; k++) {
      eps[4 * t + k] = p.eps[k];
      epsG[4 * t + k] = p.epsG[k];
      if (epsIm) epsIm[4 * t + k] = p.im[k];
    }
    if (p.live && (!p.metal || p.eps[0] > 0)) {
      // largest principal value of the in-plane block and eps_zz (dielectrics; a lossy material counts only if eps' > 0)
      const a = p.eps[0], b = p.eps[1], c = p.eps[2];
      const lmax = 0.5 * (a + c) + Math.sqrt(0.25 * (a - c) * (a - c) + b * b);
      nMax2 = Math.max(nMax2, lmax, p.eps[3]);
    }
  }
  if (!(nMax2 > 0)) fail('no dielectric with a positive optical permittivity in the window');
  // principal indices of every live dielectric (inertia-check level guard)
  const indices = [];
  for (const p of per) {
    if (!p || !p.live || p.metal) continue;
    const a = p.eps[0], b = p.eps[1], c = p.eps[2], r = Math.sqrt(0.25 * (a - c) * (a - c) + b * b);
    for (const v of [0.5 * (a + c) + r, 0.5 * (a + c) - r, p.eps[3]]) if (v > 0) indices.push(Math.sqrt(v));
  }
  return { eps, epsG, epsIm, nMax: Math.sqrt(nMax2), indices, pairs: metalPairs(per) };
}

// ---------------------------------------------------------------------------------------------------------------
// Basis functions, quadrature, element matrices and assembly.

/** Barycentric quadrature, degree 4, 6 points (Dunavant 1985 / Strang-Fix): [L0, L1, L2, weight], weights sum to 1. */
const Q4 = (() => {
  const a1 = 0.445948490915965, w1 = 0.223381589678011, a2 = 0.091576213509771, w2 = 0.109951743655322;
  const pts = [];
  for (const [a, w] of [[a1, w1], [a2, w2]]) {
    const b = 1 - 2 * a;
    pts.push([b, a, a, w], [a, b, a, w], [a, a, b, w]);
  }
  return pts;
})();

function newBasisBuffers(order) {
  const { nt, nz } = NLOC[order];
  return { vx: new Float64Array(nt), vy: new Float64Array(nt), curl: new Float64Array(nt), phi: new Float64Array(nz), dx: new Float64Array(nz), dy: new Float64Array(nz) };
}

/**
 * Evaluate the local basis of triangle t at barycentric point L (orientation signs applied to Whitney functions).
 * Transverse: W_ab = L_a g_b - L_b g_a (local edges (0,1), (1,2), (2,0)); order 2 adds G_ab = grad(L_a L_b) and the
 * face functions F0 = L_2 W_01, F1 = L_0 W_12. Longitudinal: L_a; order 2 adds 4 L_a L_b.
 * curl(f V) = grad f x V + f curl V (z components).
 */
function evalBasis(order, geo, edges, t, L, B) {
  const gx0 = geo.gx[3 * t], gx1 = geo.gx[3 * t + 1], gx2 = geo.gx[3 * t + 2];
  const gy0 = geo.gy[3 * t], gy1 = geo.gy[3 * t + 1], gy2 = geo.gy[3 * t + 2];
  const gx = [gx0, gx1, gx2], gy = [gy0, gy1, gy2];
  for (let k = 0; k < 3; k++) {
    const a = k, b = (k + 1) % 3;
    const s = edges.triSign[3 * t + k];
    B.vx[k] = s * (L[a] * gx[b] - L[b] * gx[a]);
    B.vy[k] = s * (L[a] * gy[b] - L[b] * gy[a]);
    B.curl[k] = s * 2 * (gx[a] * gy[b] - gy[a] * gx[b]);
    B.phi[k] = L[k];
    B.dx[k] = gx[k];
    B.dy[k] = gy[k];
  }
  if (order === 2) {
    for (let k = 0; k < 3; k++) {
      const a = k, b = (k + 1) % 3;
      B.vx[3 + k] = L[a] * gx[b] + L[b] * gx[a];
      B.vy[3 + k] = L[a] * gy[b] + L[b] * gy[a];
      B.curl[3 + k] = 0;
      B.phi[3 + k] = 4 * L[a] * L[b];
      B.dx[3 + k] = 4 * (L[a] * gx[b] + L[b] * gx[a]);
      B.dy[3 + k] = 4 * (L[a] * gy[b] + L[b] * gy[a]);
    }
    // face functions from the unsigned Whitney functions of local edges 0 and 1
    const w0x = L[0] * gx[1] - L[1] * gx[0], w0y = L[0] * gy[1] - L[1] * gy[0], c0 = 2 * (gx[0] * gy[1] - gy[0] * gx[1]);
    const w1x = L[1] * gx[2] - L[2] * gx[1], w1y = L[1] * gy[2] - L[2] * gy[1], c1 = 2 * (gx[1] * gy[2] - gy[1] * gx[2]);
    B.vx[6] = L[2] * w0x;
    B.vy[6] = L[2] * w0y;
    B.curl[6] = gx[2] * w0y - gy[2] * w0x + L[2] * c0;
    B.vx[7] = L[0] * w1x;
    B.vy[7] = L[0] * w1y;
    B.curl[7] = gx[0] * w1y - gy[0] * w1x + L[0] * c1;
  }
}

/** Order-2 element matrices by quadrature (exact: integrands of degree <= 4). Layout as elementMatricesP1, nloc = 14. */
function elementMatricesQ(t, model, epsT, k0, withConst, ae, be, B) {
  const { nt, nz } = NLOC[model.order];
  const nloc = nt + nz;
  const A = model.area[t];
  const exx = epsT[4 * t], exy = epsT[4 * t + 1], eyy = epsT[4 * t + 2], ezz = epsT[4 * t + 3];
  const k02 = k0 * k0;
  ae.fill(0, 0, nloc * nloc);
  be.fill(0, 0, nloc * nloc);
  for (const q of Q4) {
    evalBasis(model.order, model.geo, model.edges, t, q, B);
    const w = q[3] * A;
    for (let i = 0; i < nt; i++) {
      const vix = B.vx[i], viy = B.vy[i];
      // eps . N_i
      const eix = exx * vix + exy * viy, eiy = exy * vix + eyy * viy;
      for (let j = 0; j < nt; j++) {
        const vjx = B.vx[j], vjy = B.vy[j];
        let av = -k02 * (eix * vjx + eiy * vjy);
        if (withConst) {
          av += B.curl[i] * B.curl[j];
          be[nloc * i + j] += w * (vix * vjx + viy * vjy);
        }
        ae[nloc * i + j] += w * av;
      }
      for (let j = 0; j < nz; j++) {
        const g = w * k02 * (eix * B.dx[j] + eiy * B.dy[j]);
        ae[nloc * i + nt + j] += g;
        ae[nloc * (nt + j) + i] += g;
      }
    }
    for (let i = 0; i < nz; i++) {
      const dix = exx * B.dx[i] + exy * B.dy[i], diy = exy * B.dx[i] + eyy * B.dy[i];
      for (let j = 0; j < nz; j++) {
        ae[nloc * (nt + i) + nt + j] -= w * k02 * (dix * B.dx[j] + diy * B.dy[j]);
        be[nloc * (nt + i) + nt + j] -= w * k02 * ezz * B.phi[i] * B.phi[j];
      }
    }
  }
}

/**
 * Assemble A' and B' (values on the model CSR pattern) for a per-triangle tensor field.
 * @param {Float64Array} epsT 4 per triangle [xx, xy, yy, zz]
 * @param {boolean} [withConst=true] include eps-independent terms (false: only the eps-linear part, e.g. loss)
 */
export function assembleVector(model, epsT, k0, withConst = true) {
  const { pattern, mesh, dead } = model;
  const nloc = model.dof.nloc, nl2 = nloc * nloc;
  const nnz = pattern.pat.nnz;
  const Av = new Float64Array(nnz), Bv = new Float64Array(nnz);
  const ae = new Float64Array(nl2), be = new Float64Array(nl2);
  const Bb = newBasisBuffers(model.order);
  const pos = pattern.pos;
  for (let t = 0; t < mesh.nTris; t++) {
    if (dead[t]) continue;
    if (model.order === 1) elementMatricesP1(t, model, epsT, k0, withConst, ae, be);
    else elementMatricesQ(t, model, epsT, k0, withConst, ae, be, Bb);
    const o = nl2 * t;
    for (let q = 0; q < nl2; q++) {
      const p = pos[o + q];
      if (p < 0) continue;
      Av[p] += ae[q];
      Bv[p] += be[q];
    }
  }
  return { A: Av, B: Bv };
}

/**
 * Order-1 local 6x6 element blocks for one triangle (closed form).
 * Writes into ae (A' local) and be (B' local), row-major 6x6, local orientation already multiplied by edge signs.
 * withConst: include the eps-independent terms (curl-curl in A', T_tt in B').
 */
function elementMatricesP1(t, model, epsT, k0, withConst, ae, be) {
  const { geo, area, edges } = model;
  const A = area[t];
  const gx0 = geo.gx[3 * t], gx1 = geo.gx[3 * t + 1], gx2 = geo.gx[3 * t + 2];
  const gy0 = geo.gy[3 * t], gy1 = geo.gy[3 * t + 1], gy2 = geo.gy[3 * t + 2];
  const gx = [gx0, gx1, gx2], gy = [gy0, gy1, gy2];
  const exx = epsT[4 * t], exy = epsT[4 * t + 1], eyy = epsT[4 * t + 2], ezz = epsT[4 * t + 3];
  // G[i][j] = g_i . M . g_j for M = I and M = eps_t
  const GI = new Float64Array(9), GE = new Float64Array(9);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      GI[3 * i + j] = gx[i] * gx[j] + gy[i] * gy[j];
      GE[3 * i + j] = gx[i] * (exx * gx[j] + exy * gy[j]) + gy[i] * (exy * gx[j] + eyy * gy[j]);
    }
  const s = [edges.triSign[3 * t], edges.triSign[3 * t + 1], edges.triSign[3 * t + 2]];
  const k02 = k0 * k0;
  const A12 = A / 12;
  for (let q = 0; q < 36; q++) {
    ae[q] = 0;
    be[q] = 0;
  }
  for (let k = 0; k < 3; k++) {
    const ak = k, bk = (k + 1) % 3;
    const ck = 2 * (gx[ak] * gy[bk] - gy[ak] * gx[bk]);
    for (let l = 0; l < 3; l++) {
      const al = l, bl = (l + 1) % 3;
      const cl = 2 * (gx[al] * gy[bl] - gy[al] * gx[bl]);
      const d = (i, j) => (i === j ? 2 : 1);
      const mass = (G) => A12 * (d(ak, al) * G[3 * bk + bl] - d(ak, bl) * G[3 * bk + al] - d(bk, al) * G[3 * ak + bl] + d(bk, bl) * G[3 * ak + al]);
      const sg = s[k] * s[l];
      let av = -k02 * mass(GE);
      if (withConst) {
        av += A * ck * cl;
        be[6 * k + l] = sg * mass(GI);
      }
      ae[6 * k + l] = sg * av;
    }
    for (let v = 0; v < 3; v++) {
      const gval = (A / 3) * (GE[3 * bk + v] - GE[3 * ak + v]);
      ae[6 * k + 3 + v] = ae[6 * (3 + v) + k] = s[k] * k02 * gval;
    }
  }
  for (let u = 0; u < 3; u++)
    for (let v = 0; v < 3; v++) {
      ae[6 * (3 + u) + 3 + v] = -k02 * A * GE[3 * u + v];
      be[6 * (3 + u) + 3 + v] = -k02 * ezz * A12 * (u === v ? 2 : 1);
    }
}

function csrMatVec(pat, val, x, out) {
  const n = pat.n, rp = pat.rowptr, ci = pat.colidx;
  out = out ?? new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let p = rp[i]; p < rp[i + 1]; p++) s += val[p] * x[ci[p]];
    out[i] = s;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Block Arnoldi (shift-invert operator), Ritz extraction.

function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296 - 0.5;
  };
}

function dotv(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/**
 * Block Arnoldi with full (DGKS) reorthogonalisation and thick restart for the eigenvalues of largest modulus of a
 * linear operator. Thick restart: from C V_m = V_m H_m + W H_low, the kept Ritz vectors V_m Q (Q orthonormal basis of
 * the selected Ritz vectors of H_m) give the Krylov decomposition C U = U (Q^T H_m Q) + W (H_low Q) (exact up to the
 * Ritz-vector accuracy), and the Arnoldi process continues from the residual block W without losing the kept space.
 * @param {number} N vector length
 * @param {(X:Float64Array[]) => Float64Array[]} op
 * @param {{nWant:number, blockSize:number, maxBasis:number, tol:number, X0:Float64Array[]|null, maxRestarts:number,
 *   seed:number, realOnly:boolean, nKeep?:number}} o
 * @returns {{mu:{re:number,im:number}[], vecs:{re:Float64Array, im:Float64Array|null}[], ritzRes:number[], basis:number, opVectors:number, restarts:number, converged:boolean}}
 */
export function blockArnoldi(N, op, o) {
  const rnd = seededRandom(o.seed ?? 20261014);
  const b = o.blockSize;
  let mMax = Math.max(o.firstCycleBasis ?? o.maxBasis, o.nWant + 3 * b);
  const mMaxLater = Math.max(o.maxBasis, o.nWant + 3 * b);
  const nKeep = Math.min(o.nKeep ?? o.nWant + Math.max(2, o.nWant), Math.min(mMax, mMaxLater) - 2 * b);
  const ld = Math.max(mMax, mMaxLater);
  let H = new Float64Array((ld + b) * ld);
  let V = [];
  let opVectors = 0, restarts = 0;
  const addVec = (w, col) => {
    // DGKS: orthogonalise against V, a second pass if the norm dropped; coefficients accumulate into column col
    const n0 = Math.sqrt(dotv(w, w));
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < V.length; i++) {
        const vi = V[i];
        const h = dotv(vi, w);
        if (col >= 0) H[i * ld + col] += h;
        for (let q = 0; q < N; q++) w[q] -= h * vi[q];
      }
      if (Math.sqrt(dotv(w, w)) > 0.7 * n0) break;
    }
    let nw = Math.sqrt(dotv(w, w));
    if (!(nw > 1e-12 * (n0 || 1))) {
      // breakdown (invariant subspace or dependent start): continue with a random direction, H entry 0
      for (let q = 0; q < N; q++) w[q] = rnd();
      for (let pass = 0; pass < 2; pass++)
        for (let i = 0; i < V.length; i++) {
          const h = dotv(V[i], w);
          for (let q = 0; q < N; q++) w[q] -= h * V[i][q];
        }
      const nr = Math.sqrt(dotv(w, w));
      for (let q = 0; q < N; q++) w[q] /= nr;
      nw = 0;
    } else for (let q = 0; q < N; q++) w[q] /= nw;
    if (col >= 0) H[V.length * ld + col] = nw;
    V.push(w);
  };
  // initial block: warm vectors folded into b columns, random otherwise
  const X0 = o.X0 && o.X0.length ? o.X0 : null;
  for (let k = 0; k < b; k++) {
    const w = new Float64Array(N);
    if (X0 && k < X0.length) for (let j = k; j < X0.length; j += b) for (let q = 0; q < N; q++) w[q] += X0[j][q];
    else for (let q = 0; q < N; q++) w[q] = rnd();
    addVec(w, -1);
  }
  let col = 0;
  for (;;) {
    let converged = false;
    while (col < mMax) {
      const nb = Math.min(b, mMax - col);
      const W = op(V.slice(col, col + nb));
      opVectors += nb;
      for (let c = 0; c < nb; c++) addVec(W[c], col + c);
      col += nb;
      if (col >= o.nWant + b && ritz(H, ld, col, V, o, false).converged) {
        converged = true;
        break;
      }
    }
    if (converged || restarts >= o.maxRestarts) {
      const last = ritz(H, ld, col, V, o, true);
      return { ...last, basis: col, opVectors, restarts };
    }
    if (restarts === 0 && o.onFirstRestart) {
      // caller may change the operator (adaptive shift): return the current Ritz pairs and stop
      const peek = ritz(H, ld, col, V, o, false);
      if (o.onFirstRestart(peek.mu)) {
        const last = ritz(H, ld, col, V, o, true);
        return { ...last, basis: col, opVectors, restarts, switched: true };
      }
    }
    // thick restart
    restarts++;
    const m = col;
    const keep = ritzBasis(H, ld, m, nKeep, o.realOnly);
    const k = keep.k, Q = keep.Q; // Q: m x k row-major, orthonormal columns
    const Hm = keep.Hm;
    const U = [];
    for (let c = 0; c < k; c++) {
      const u = new Float64Array(N);
      for (let i = 0; i < m; i++) {
        const qi = Q[i * k + c];
        if (qi === 0) continue;
        const vi = V[i];
        for (let q = 0; q < N; q++) u[q] += qi * vi[q];
      }
      U.push(u);
    }
    const Wv = V.slice(m, m + b);
    const Hn = new Float64Array((ld + b) * ld);
    // Q^T H_m Q
    const HQ = new Float64Array(m * k);
    for (let i = 0; i < m; i++)
      for (let c = 0; c < k; c++) {
        let sum = 0;
        for (let j = 0; j < m; j++) sum += Hm[i * m + j] * Q[j * k + c];
        HQ[i * k + c] = sum;
      }
    for (let r = 0; r < k; r++)
      for (let c = 0; c < k; c++) {
        let sum = 0;
        for (let i = 0; i < m; i++) sum += Q[i * k + r] * HQ[i * k + c];
        Hn[r * ld + c] = sum;
      }
    for (let r = 0; r < Wv.length; r++)
      for (let c = 0; c < k; c++) {
        let sum = 0;
        for (let j = 0; j < m; j++) sum += H[(m + r) * ld + j] * Q[j * k + c];
        Hn[(k + r) * ld + c] = sum;
      }
    H = Hn;
    V = [...U, ...Wv];
    col = k;
    mMax = mMaxLater;
  }
}

/** Orthonormal basis (m x k, row-major) of the nKeep dominant Ritz vectors of H_m (complex pairs as re/im columns). */
function ritzBasis(H, ld, m, nKeep, realOnly) {
  const Hm = new Float64Array(m * m);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) Hm[i * m + j] = H[i * ld + j];
  const { re, im } = eigenvalues(Hm, m);
  const idx = [];
  for (let i = 0; i < m; i++) {
    const real = Math.abs(im[i]) <= 1e-9 * Math.hypot(re[i], im[i]);
    if (realOnly && !real) continue;
    if (!real && im[i] < 0) continue;
    idx.push(i);
  }
  idx.sort((a, c) => Math.hypot(re[c], im[c]) - Math.hypot(re[a], im[a]));
  const cols = [];
  const realL = [];
  const sel = [];
  for (const i of idx) {
    const real = Math.abs(im[i]) <= 1e-9 * Math.hypot(re[i], im[i]);
    const need = real ? 1 : 2;
    if (cols.length + sel.reduce((s, x) => s + x.need, 0) + need > nKeep) break;
    sel.push({ i, real, need });
    if (real) realL.push(re[i]);
  }
  const rv = realL.length ? realEigenvectors(Hm, m, realL) : [];
  let ri = 0;
  const cplx = [];
  for (const s of sel) {
    if (s.real) cols.push(rv[ri++]);
    else {
      const prev = cplx.filter((c) => Math.hypot(re[c.i] - re[s.i], im[c.i] - im[s.i]) <= 1e-7 * Math.hypot(re[s.i], im[s.i])).map((c) => c.v);
      const v = complexEigenvectors(Hm, m, re[s.i], im[s.i], { prev });
      cplx.push({ i: s.i, v });
      cols.push(v.re, v.im);
    }
  }
  // modified Gram-Schmidt (twice) in R^m, dropping dependent columns
  const kept = [];
  for (const c0 of cols) {
    const c = Float64Array.from(c0);
    const n0 = Math.sqrt(dotv(c, c));
    for (let pass = 0; pass < 2; pass++)
      for (const q of kept) {
        const d = dotv(q, c);
        for (let i = 0; i < m; i++) c[i] -= d * q[i];
      }
    const nc = Math.sqrt(dotv(c, c));
    if (nc > 1e-8 * n0) {
      for (let i = 0; i < m; i++) c[i] /= nc;
      kept.push(c);
    }
  }
  const k = kept.length;
  const Q = new Float64Array(m * k);
  for (let c = 0; c < k; c++) for (let i = 0; i < m; i++) Q[i * k + c] = kept[c][i];
  return { k, Q, Hm };
}

/** Ritz pairs of the leading m x m block of H; residual norms from the rows below m. */
function ritz(H, ld, m, V, o, formVectors) {
  const Hm = new Float64Array(m * m);
  for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) Hm[i * m + j] = H[i * ld + j];
  const { re, im } = eigenvalues(Hm, m);
  const idx = [];
  for (let i = 0; i < m; i++) {
    const real = Math.abs(im[i]) <= 1e-9 * Math.hypot(re[i], im[i]);
    if (o.realOnly && !real) continue;
    if (!o.realOnly && im[i] < 0) continue; // take one of each conjugate pair (the operator is realified)
    idx.push(i);
  }
  idx.sort((a, b) => Math.hypot(re[b], im[b]) - Math.hypot(re[a], im[a]));
  const want = idx.slice(0, o.nWant);
  const mus = want.map((i) => ({ re: re[i], im: Math.abs(im[i]) <= 1e-9 * Math.hypot(re[i], im[i]) ? 0 : im[i] }));
  const rows = V.length - m; // rows below the leading block
  const vecs = [], ritzRes = [];
  let converged = want.length === o.nWant;
  // real eigenvectors in one call (clusters handled), complex ones separately
  const realLams = mus.filter((u) => u.im === 0).map((u) => u.re);
  const realVecs = realLams.length ? realEigenvectors(Hm, m, realLams) : [];
  let ri = 0;
  const cplx = [];
  for (const mu of mus) {
    let yr, yi = null;
    if (mu.im === 0) yr = realVecs[ri++];
    else {
      const prev = cplx.filter((c) => Math.hypot(c.mu.re - mu.re, c.mu.im - mu.im) <= 1e-7 * Math.hypot(mu.re, mu.im)).map((c) => c.v);
      const v = complexEigenvectors(Hm, m, mu.re, mu.im, { prev });
      cplx.push({ mu, v });
      ({ re: yr, im: yi } = v);
    }
    // residual || H[m:, :m] y ||
    let rs = 0;
    for (let r = 0; r < rows; r++) {
      let sr = 0, si = 0;
      for (let c = 0; c < m; c++) {
        const h = H[(m + r) * ld + c];
        if (h === 0) continue;
        sr += h * yr[c];
        if (yi) si += h * yi[c];
      }
      rs += sr * sr + si * si;
    }
    const rel = Math.sqrt(rs) / Math.hypot(mu.re, mu.im);
    ritzRes.push(rel);
    if (!(rel < o.tol)) converged = false;
    if (!formVectors) continue;
    const N = V[0].length;
    const ur = new Float64Array(N), ui = yi ? new Float64Array(N) : null;
    for (let c = 0; c < m; c++) {
      const a = yr[c], bb = yi ? yi[c] : 0, vc = V[c];
      if (a !== 0) for (let q = 0; q < N; q++) ur[q] += a * vc[q];
      if (bb !== 0) for (let q = 0; q < N; q++) ui[q] += bb * vc[q];
    }
    vecs.push({ re: ur, im: ui });
  }
  return { mu: mus, vecs, ritzRes, converged };
}

// ---------------------------------------------------------------------------------------------------------------
// Solve.

/**
 * Full-vector modes at one wavelength.
 * @param {ReturnType<typeof buildVectorModel>} model
 * @param {number} lambdaUm
 * @param {{numModes?:number, nTarget?:number|null, tol?:number, blockSize?:number, maxBasis?:number|null,
 *   maxRestarts?:number, warm?:any, fields?:boolean, metalPermittivity?:Record<string,[number,number]>,
 *   inertiaCheckN?:number|null, epsDelta?:Float64Array, epsDeltaGroup?:Float64Array, epsDeltaScale?:number,
 *   refineSteps?:number}} [opts]
 *   nTarget: shift index (default sqrt(1.001) x the largest dielectric permittivity principal value in the window).
 *   warm: previous result's .warm; its X seeds the Krylov space (same model), its neffMax sets a warm shift
 *   n_target = 1.02 neffMax (any model, lossless, unless nTarget or shiftFromWarm: false), with automatic fallback to the
 *   default shift when the inertia shows an eigenvalue above it.
 *   adaptiveShift (default true; lossless, no nTarget, no warm): after one short Arnoldi cycle the matrix is refactored
 *   3 % (retry 10 %) above the estimated top n_eff if the inertia confirms nothing lies above it (res.shift.adaptive).
 *   inertiaCheckN: extra factorisation at sigma = (k0 n)^2 to count eigenvalues above n (Sylvester; lossless only).
 *   metalPermittivity: {materialName: [eps_real, eps_loss]} for metal policy 'lossy' (eps = eps_real - j eps_loss).
 *   epsDelta: additive per-triangle tensor perturbation (4 per triangle) times epsDeltaScale (sensitivity / tests);
 *   epsDeltaGroup: the matching perturbation of eps_g (same layout and scale); without it mode.ng is NaN.
 */
export function solveVectorModes(model, lambdaUm, opts = {}) {
  const t0 = performance.now();
  const numModes = opts.numModes ?? 4;
  const tol = opts.tol ?? 1e-7;
  const blockSize = opts.blockSize ?? 1;
  const k0 = (2 * Math.PI) / lambdaUm;
  const mt = vectorMaterialTensors(model, lambdaUm, opts);
  if (opts.epsDelta) {
    const d = opts.epsDelta, sc = opts.epsDeltaScale ?? 1;
    if (!(d instanceof Float64Array) || d.length !== mt.eps.length) fail('epsDelta must be a Float64Array of length 4 * nTris');
    for (let q = 0; q < d.length; q++) mt.eps[q] += sc * d[q];
    // the group tensor eps_g = eps - (lambda/2) d eps/d lambda needs its own perturbation (audit V10)
    const dg = opts.epsDeltaGroup;
    if (dg) {
      if (!(dg instanceof Float64Array) || dg.length !== mt.epsG.length) fail('epsDeltaGroup must be a Float64Array of length 4 * nTris');
      for (let q = 0; q < dg.length; q++) mt.epsG[q] += sc * dg[q];
    } else mt.ngValid = false;
  }
  // default shift: above the largest dielectric index and, for lossy metal, above every planar SPP index (audit V4)
  const nDefault = Math.max(mt.nMax, mt.epsIm ? mt.pairs.nSppMax : 0) * Math.sqrt(1 + 1e-3);
  // warm shift (lossless only): 2 % above the previous solve's top n_eff (wavelength / parameter sweeps); solveReal
  // falls back to the default shift when the inertia shows an eigenvalue above it or a pivot was perturbed
  let nTarget = opts.nTarget ?? nDefault;
  let warmShift = false;
  if (opts.nTarget == null && !mt.epsIm && opts.shiftFromWarm !== false && opts.warm?.neffMax > 0) {
    const h = opts.warm.neffMax * 1.02;
    if (h < nDefault) {
      nTarget = h;
      warmShift = true;
    }
  }
  const sigma = k0 * k0 * nTarget * nTarget;
  const { A, B } = assembleVector(model, mt.eps, k0, true);
  let Ai = null, Bi = null;
  if (mt.epsIm) {
    const L = assembleVector(model, mt.epsIm, k0, false);
    Ai = L.A.map((v) => -v);
    Bi = L.B.map((v) => -v);
  }
  const tAsm = performance.now();
  const common = { model, mt, k0, lambdaUm, nTarget, sigma, A, B, Ai, Bi, numModes, tol, blockSize, opts, t0, tAsm, warmShift, nDefault };
  return Ai ? solveComplex(common) : solveReal(common);
}

function solveReal({ model, mt, k0, lambdaUm, nTarget, sigma, A, B, numModes, tol, blockSize, opts, t0, tAsm, warmShift, nDefault }) {
  const pat = model.pattern.pat;
  const n = pat.n;
  const nZ = model.dof.nZDof;
  const factorAt = (sg) => {
    const K = new Float64Array(pat.nnz);
    for (let q = 0; q < K.length; q++) K[q] = A[q] + sg * B[q];
    const f = model.factorization === 'supernodal' ? new SupernodalLDLT(model.sym) : new LDLT(model.sym);
    return { f, r: f.factor(K), K, sigma: sg };
  };
  let cur = factorAt(sigma);
  let shiftFallback = false;
  if (warmShift && (!cur.r.ok || cur.r.nPerturbed > 0 || cur.r.nNeg !== nZ)) {
    nTarget = nDefault;
    sigma = k0 * k0 * nTarget * nTarget;
    cur = factorAt(sigma);
    shiftFallback = true;
  }
  if (!cur.r.ok) fail('shift-invert factorisation failed (non-finite pivot)');
  let nFactor = shiftFallback ? 2 : 1;
  const tFac = performance.now();
  let solves = 0;
  const op = (X) => {
    const { f, r, K } = cur;
    const m = X.length;
    const rhs = new Float64Array(n * m);
    for (let c = 0; c < m; c++) csrMatVec(pat, B, X[c], rhs.subarray(c * n, (c + 1) * n));
    solves += m;
    if (r.nPerturbed > 0) return X.map((_, c) => f.solveRefined(pat, K, rhs.subarray(c * n, (c + 1) * n)).x);
    const sol = m === 1 ? f.solve(rhs) : f.solveMany(rhs, m);
    return X.map((_, c) => sol.slice(c * n, (c + 1) * n));
  };
  const maxBasis = opts.maxBasis ?? Math.max(20, 3 * numModes + 8);
  const X0 = opts.warm?.X && opts.warm.n === n ? opts.warm.X : null;
  const arOpts = { nWant: numModes, blockSize, maxBasis, tol, maxRestarts: opts.maxRestarts ?? 30, seed: 20261014, realOnly: true };
  let ar;
  let adaptive = null;
  if (!warmShift && opts.nTarget == null && opts.adaptiveShift !== false && !X0) {
    // adaptive shift (round 3): at the first thick-restart point, estimate the top n_eff from the Ritz values; if the
    // safe shift is far above it (nTarget / nTop > 1.34, i.e. the shift distance shrinks by ~40x), refactor 3 % above
    // nTop when the inertia confirms nothing lies above and no pivot was perturbed, then continue from the Ritz
    // vectors. Otherwise the thick restart simply continues at the safe shift.
    let nTopEst = null;
    const ar1 = blockArnoldi(n, op, { ...arOpts, firstCycleBasis: opts.adaptiveFirstCycle ?? Math.max(numModes + 8, 12), onFirstRestart: (mus) => {
      const thetas = mus.filter((m) => m.re !== 0).map((m) => cur.sigma - 1 / m.re);
      const top = Math.max(...thetas);
      if (!(top > 0)) return false;
      nTopEst = Math.sqrt(top) / k0;
      return nTarget / nTopEst > (opts.adaptiveShiftRatio ?? 1.34);
    } });
    if (!ar1.switched) ar = ar1;
    else {
      // the first-cycle estimate can sit below the true top mode (unconverged Ritz value): 3 % margin, one retry at 10 %
      adaptive = { firstCycleOps: solves, nTopEstimate: nTopEst, accepted: false, rejectedNTarget: [] };
      for (const margin of [1.03, 1.1]) {
        const nNew = nTopEst * margin;
        if (!(nNew < 0.999 * nTarget)) break;
        const cand = factorAt(k0 * k0 * nNew * nNew);
        nFactor++;
        if (cand.r.ok && cand.r.nPerturbed === 0 && cand.r.nNeg === nZ) {
          adaptive = { ...adaptive, accepted: true, fromNTarget: nTarget, toNTarget: nNew };
          cur = cand;
          nTarget = nNew;
          sigma = cand.sigma;
          break;
        }
        adaptive.rejectedNTarget.push(nNew);
      }
      ar = blockArnoldi(n, op, { ...arOpts, X0: ar1.vecs.map((v) => v.re) });
    }
  } else ar = blockArnoldi(n, op, { ...arOpts, X0 });
  const fr = cur.r;
  const modesAboveShift = fr.nNeg - nZ;
  // refinement: inverse-iteration step(s) per Ritz vector (x <- C x), then the pencil Rayleigh quotient
  let vecs = ar.vecs.map((v) => v.re);
  for (let st = 0; st < (opts.refineSteps ?? 1) && vecs.length; st++) {
    vecs = op(vecs);
    for (const v of vecs) {
      const nv = Math.sqrt(dotv(v, v));
      for (let i = 0; i < n; i++) v[i] /= nv;
    }
  }
  const tEig = performance.now();
  const raw = [];
  for (let k = 0; k < vecs.length; k++) {
    const x = vecs[k];
    const Ax = csrMatVec(pat, A, x), Bx = csrMatVec(pat, B, x);
    const xAx = dotv(x, Ax), xBx = dotv(x, Bx);
    const theta = -xAx / xBx;
    let rn = 0, an = 0;
    for (let i = 0; i < n; i++) {
      const r = Ax[i] + theta * Bx[i];
      rn += r * r;
      an += Ax[i] * Ax[i];
    }
    raw.push({ theta: [theta, 0], xr: x, xi: null, xBx: [xBx, 0], residual: Math.sqrt(rn / an), ritzResidual: ar.ritzRes[k] });
  }
  raw.sort((a, b) => b.theta[0] - a.theta[0]);
  let check = null;
  if (opts.inertiaCheckN != null) {
    // A level equal to a material index makes the gradient-type DOFs of that region singular (zero pivots): move it
    // off by 1e-6 relative. Any static pivot perturbation makes the count unreliable (audit V2).
    let nUsed = opts.inertiaCheckN;
    if (mt.indices.some((nm) => Math.abs(nUsed - nm) <= 1e-9 * nm)) nUsed *= 1 + 1e-6;
    const s2 = k0 * k0 * nUsed * nUsed;
    const K2 = new Float64Array(pat.nnz);
    for (let q = 0; q < K2.length; q++) K2[q] = A[q] + s2 * B[q];
    const r2 = (model.factorization === 'supernodal' ? new SupernodalLDLT(model.sym) : new LDLT(model.sym)).factor(K2);
    check = { nCheck: opts.inertiaCheckN, nCheckUsed: nUsed, eigenvaluesAbove: r2.nNeg - model.dof.nZDof, nPerturbed: r2.nPerturbed, reliable: r2.nPerturbed === 0 };
  }
  const modes = raw.map((md) => postProcess(model, mt, k0, md, opts));
  const tPost = performance.now();
  const warnings = [];
  if (modesAboveShift !== 0) warnings.push(`inertia: ${modesAboveShift} eigenvalue(s) above the shift n_target = ${nTarget}; modes with n_eff > n_target may be missing`);
  if (fr.nPerturbed) warnings.push(`LDL^T: ${fr.nPerturbed} static pivot perturbation(s); solves used iterative refinement; inertia count at the shift is not reliable`);
  if (check && !check.reliable) warnings.push(`inertia check at n = ${check.nCheckUsed}: ${check.nPerturbed} static pivot perturbation(s); eigenvaluesAbove is not reliable`);
  if (!ar.converged) warnings.push('Arnoldi did not reach the requested tolerance; see ritzResidual per mode');
  if (mt.ngValid === false) warnings.push('epsDelta without epsDeltaGroup: ng is not defined for this perturbed solve (NaN)');
  return finishResult({ model, k0, lambdaUm, nTarget, sigma, modes, ar, solves, warnings, staticPivots: fr.nPerturbed,
    inertia: { negativePivots: fr.nNeg, zDofs: model.dof.nZDof, eigenvaluesAboveShift: modesAboveShift, reliable: fr.nPerturbed === 0, check },
    timing: { assembleMs: tAsm - t0, factorMs: tFac - tAsm, eigenMs: tEig - tFac, postMs: tPost - tEig, solveTotalMs: tPost - t0 },
    shift: { nTarget, source: warmShift ? (shiftFallback ? 'warm_rejected_default' : 'warm') : opts.nTarget != null ? 'user' : adaptive?.accepted ? 'adaptive' : 'default', adaptive, factorizations: nFactor },
    warm: { X: raw.map((m) => m.xr), n, neffMax: modes.length ? Math.max(...modes.map((m) => m.neff)) : null } });
}

/**
 * Lossy (complex-symmetric) solve: K = (A_r + j A_i) + sigma (B_r + j B_i) factorised by ComplexLDLT; block Arnoldi on
 * the realified operator R(C) = [[Cr, -Ci], [Ci, Cr]], whose eigenvalues are those of C and of conj(C). For a Ritz
 * vector w = [w1; w2] of R(C) with value lambda, z+ = w1 + j w2 satisfies C z+ = lambda z+ and z- = w1 - j w2
 * satisfies C conj(z-) = conj(lambda) conj(z-); the dominant one gives the physical pair. Final eigenvalue from the
 * complex (unconjugated) Rayleigh quotient theta = -(z^T A z) / (z^T B z).
 */
function solveComplex({ model, mt, k0, lambdaUm, nTarget, sigma, A, B, Ai, Bi, numModes, tol, blockSize, opts, t0, tAsm }) {
  const pat = model.pattern.pat;
  const n = pat.n;
  const Kr = new Float64Array(pat.nnz), Ki = new Float64Array(pat.nnz);
  for (let q = 0; q < Kr.length; q++) {
    Kr[q] = A[q] + sigma * B[q];
    Ki[q] = Ai[q] + sigma * Bi[q];
  }
  const fac = model.factorization === 'supernodal' ? new ComplexSupernodalLDLT(model.sym) : new ComplexLDLT(model.sym);
  const fr = fac.factor(Kr, Ki);
  if (!fr.ok) fail('complex shift-invert factorisation failed (non-finite pivot)');
  const tFac = performance.now();
  let solves = 0;
  const cmv = (Mr, Mi, zr, zi) => {
    const a = csrMatVec(pat, Mr, zr), b = csrMatVec(pat, Mi, zi), c = csrMatVec(pat, Mr, zi), d = csrMatVec(pat, Mi, zr);
    for (let i = 0; i < n; i++) {
      a[i] -= b[i];
      c[i] += d[i];
    }
    return { re: a, im: c };
  };
  const refine = fr.nPerturbed > 0;
  const applyC = (zr, zi) => {
    const bz = cmv(B, Bi, zr, zi);
    solves++;
    return refine ? fac.solveRefined(pat, Kr, Ki, bz.re, bz.im) : fac.solve(bz.re, bz.im);
  };
  const op = (X) =>
    X.map((w) => {
      const y = applyC(w.subarray(0, n), w.subarray(n));
      const out = new Float64Array(2 * n);
      out.set(y.re, 0);
      out.set(y.im, n);
      return out;
    });
  const maxBasis = opts.maxBasis ?? Math.max(30, 8 * numModes + 10);
  // the realified operator carries each eigenvalue of C together with eigenvalues of conj(C): ask for twice the
  // modes, recover the physical pairs, remove duplicates, keep numModes
  const ar = blockArnoldi(2 * n, op, { nWant: 2 * numModes, blockSize, maxBasis, tol, X0: null, maxRestarts: opts.maxRestarts ?? 30, seed: 20261015, realOnly: false });
  const raw = [];
  for (let k = 0; k < ar.vecs.length; k++) {
    const { re, im } = ar.vecs[k];
    const imv = im ?? new Float64Array(2 * n);
    const pr = new Float64Array(n), pi = new Float64Array(n), mr = new Float64Array(n), mi = new Float64Array(n);
    let np = 0, nm = 0;
    for (let i = 0; i < n; i++) {
      const a1 = re[i], b1 = imv[i], a2 = re[n + i], b2 = imv[n + i];
      pr[i] = a1 - b2;
      pi[i] = b1 + a2;
      mr[i] = a1 + b2;
      mi[i] = -(b1 - a2);
      np += pr[i] * pr[i] + pi[i] * pi[i];
      nm += mr[i] * mr[i] + mi[i] * mi[i];
    }
    let zr = np >= nm ? pr : mr, zi = np >= nm ? pi : mi;
    for (let st = 0; st < (opts.refineSteps ?? 1); st++) {
      const y = applyC(zr, zi);
      let nn = 0;
      for (let i = 0; i < n; i++) nn += y.re[i] * y.re[i] + y.im[i] * y.im[i];
      nn = Math.sqrt(nn);
      for (let i = 0; i < n; i++) {
        y.re[i] /= nn;
        y.im[i] /= nn;
      }
      zr = y.re;
      zi = y.im;
    }
    const Az = cmv(A, Ai, zr, zi), Bz = cmv(B, Bi, zr, zi);
    const zAz = cdot(zr, zi, Az.re, Az.im), zBz = cdot(zr, zi, Bz.re, Bz.im);
    const theta = cdiv(-zAz[0], -zAz[1], zBz[0], zBz[1]);
    let rn = 0, an = 0;
    for (let i = 0; i < n; i++) {
      const rr = Az.re[i] + theta[0] * Bz.re[i] - theta[1] * Bz.im[i];
      const ri = Az.im[i] + theta[0] * Bz.im[i] + theta[1] * Bz.re[i];
      rn += rr * rr + ri * ri;
      an += Az.re[i] * Az.re[i] + Az.im[i] * Az.im[i];
    }
    raw.push({ theta, xr: zr, xi: zi, xBx: zBz, residual: Math.sqrt(rn / an), ritzResidual: ar.ritzRes[k] });
  }
  // the realified operator can return the same physical eigenvalue twice (nearly real values): keep one
  raw.sort((a, b) => b.theta[0] - a.theta[0]);
  const uniq = [];
  // duplicate = same eigenvalue and parallel eigenvector (|z1^H z2| / (|z1| |z2|) > 0.99); degenerate modes stay
  const herm = (a, b) => {
    let re = 0, im = 0, na = 0, nb = 0;
    for (let i = 0; i < n; i++) {
      re += a.xr[i] * b.xr[i] + a.xi[i] * b.xi[i];
      im += a.xr[i] * b.xi[i] - a.xi[i] * b.xr[i];
      na += a.xr[i] * a.xr[i] + a.xi[i] * a.xi[i];
      nb += b.xr[i] * b.xr[i] + b.xi[i] * b.xi[i];
    }
    return Math.hypot(re, im) / Math.sqrt(na * nb);
  };
  for (const r of raw) if (!uniq.some((u) => Math.hypot(u.theta[0] - r.theta[0], u.theta[1] - r.theta[1]) <= 1e-8 * Math.hypot(...r.theta) && herm(u, r) > 0.99)) uniq.push(r);
  const kept = uniq.slice(0, numModes);
  const tEig = performance.now();
  const modes = kept.map((md) => postProcess(model, mt, k0, md, opts));
  const tPost = performance.now();
  const warnings = [];
  if (fr.nPerturbed) warnings.push(`complex LDL^T: ${fr.nPerturbed} static pivot perturbation(s); solves used iterative refinement`);
  if (!ar.converged) warnings.push('Arnoldi did not reach the requested tolerance; see ritzResidual per mode');
  if (mt.ngValid === false) warnings.push('epsDelta without epsDeltaGroup: ng is not defined for this perturbed solve (NaN)');
  if (mt.pairs.nSppMax > nTarget) warnings.push(`n_target = ${nTarget} lies below the planar surface-plasmon index ${mt.pairs.nSppMax} of a metal/dielectric pair in the window; plasmonic modes above the shift may be missing from the returned set`);
  const above = modes.filter((m) => m.neff > nTarget);
  if (above.length) warnings.push(`${above.length} returned mode(s) have Re n_eff above the shift n_target = ${nTarget} (max ${Math.max(...above.map((m) => m.neff))}); modes above the shift compete by |mu| and the list may not be the highest-n_eff set`);
  if (kept.length < numModes) warnings.push(`only ${kept.length} distinct mode(s) of ${numModes} requested were recovered from the realified operator`);
  return finishResult({ model, k0, lambdaUm, nTarget, sigma, modes, ar, solves, warnings, staticPivots: fr.nPerturbed, inertia: null, spp: mt.pairs,
    timing: { assembleMs: tAsm - t0, factorMs: tFac - tAsm, eigenMs: tEig - tFac, postMs: tPost - tEig, solveTotalMs: tPost - t0 },
    warm: null });
}

function finishResult({ model, k0, lambdaUm, nTarget, sigma, modes, ar, solves, warnings, staticPivots, inertia, timing, warm, spp = null, shift = null }) {
  const pat = model.pattern.pat, n = pat.n;
  return {
    lambdaUm,
    k0,
    nTarget,
    sigma,
    order: model.order,
    modes,
    converged: ar.converged,
    labels: [...VECTOR_LABELS, ORDER_LABELS[model.order], ...model.metal.labels],
    metal: model.metal,
    warnings,
    inertia,
    spp,
    shift,
    stats: { dof: n, transverseDofs: model.dof.nTDof, longitudinalDofs: model.dof.nZDof, edges: model.edges.nE, nodes: model.mesh.nNodes, triangles: model.mesh.nTris,
      nnzA: pat.nnz, nnzL: model.sym.nnzL, fillRatio: model.sym.nnzL / ((pat.nnz - n) / 2 + n), factorFlops: model.sym.flops, factorization: model.factorization, ordering: model.ordering,
      krylovBasis: ar.basis, operatorApplications: solves, restarts: ar.restarts, staticPivots },
    timing: { ...model.timing, ...timing },
    warm,
  };
}

function cdot(ar, ai, br, bi) {
  let r = 0, i = 0;
  for (let q = 0; q < ar.length; q++) {
    r += ar[q] * br[q] - ai[q] * bi[q];
    i += ar[q] * bi[q] + ai[q] * br[q];
  }
  return [r, i];
}
function cdiv(ar, ai, br, bi) {
  const d = br * br + bi * bi;
  return [(ar * br + ai * bi) / d, (ai * br - ar * bi) / d];
}
function csqrt(re, im) {
  const m = Math.hypot(re, im);
  const r = Math.sqrt(0.5 * (m + re));
  const i = Math.sqrt(Math.max(0, 0.5 * (m - re)));
  return [r, im < 0 ? -i : i];
}

// ---------------------------------------------------------------------------------------------------------------
// Post-processing (generic in element order; complex-capable for lossy modes).

/** Local coefficients of triangle t (re, im) from a DOF vector. */
function gatherLocal(model, xr, xi, t, cr, ci) {
  const { nloc, td } = model.dof;
  for (let a = 0; a < nloc; a++) {
    const d = td[nloc * t + a];
    cr[a] = d >= 0 ? xr[d] : 0;
    ci[a] = d >= 0 && xi ? xi[d] : 0;
  }
}

/**
 * Field values at a point from local coefficients: P.etp (e_t'), P.et (e_t = e_t' - grad e_z), P.ez, P.curl,
 * each as [re, im] pairs (vectors: [xr, xi, yr, yi]).
 */
function pointFields(model, B, cr, ci, P) {
  const { nt, nz } = NLOC[model.order];
  let pxr = 0, pxi = 0, pyr = 0, pyi = 0, cur = 0, cui = 0;
  for (let i = 0; i < nt; i++) {
    const a = cr[i], b = ci[i];
    pxr += a * B.vx[i];
    pxi += b * B.vx[i];
    pyr += a * B.vy[i];
    pyi += b * B.vy[i];
    cur += a * B.curl[i];
    cui += b * B.curl[i];
  }
  let zr = 0, zi = 0, gxr = 0, gxi = 0, gyr = 0, gyi = 0;
  for (let j = 0; j < nz; j++) {
    const a = cr[nt + j], b = ci[nt + j];
    zr += a * B.phi[j];
    zi += b * B.phi[j];
    gxr += a * B.dx[j];
    gxi += b * B.dx[j];
    gyr += a * B.dy[j];
    gyi += b * B.dy[j];
  }
  P.etp[0] = pxr; P.etp[1] = pxi; P.etp[2] = pyr; P.etp[3] = pyi;
  P.et[0] = pxr - gxr; P.et[1] = pxi - gxi; P.et[2] = pyr - gyr; P.et[3] = pyi - gyi;
  P.ez[0] = zr; P.ez[1] = zi;
  P.curl[0] = cur; P.curl[1] = cui;
}

const newPoint = () => ({ etp: new Float64Array(4), et: new Float64Array(4), ez: new Float64Array(2), curl: new Float64Array(2) });

/** Unconjugated u . M . v for complex 2-vectors [xr, xi, yr, yi] and a real symmetric tensor (mxx, mxy, myy): [re, im]. */
function symTensorForm(u, v, mxx, mxy, myy) {
  const vxr = mxx * v[0] + mxy * v[2], vxi = mxx * v[1] + mxy * v[3];
  const vyr = mxy * v[0] + myy * v[2], vyi = mxy * v[1] + myy * v[3];
  return [u[0] * vxr - u[1] * vxi + u[2] * vyr - u[3] * vyi, u[0] * vxi + u[1] * vxr + u[2] * vyi + u[3] * vyr];
}

function postProcess(model, mt, k0, md, opts) {
  const { mesh, geo, area, regions, edges } = model;
  const nT = mesh.nTris;
  const { nloc } = model.dof;
  const theta = md.theta; // [re, im]
  const lossy = !!md.xi;
  const beta = csqrt(theta[0], theta[1]);
  const b2 = beta[0] * beta[0] + beta[1] * beta[1];
  const cr = new Float64Array(nloc), ci = new Float64Array(nloc);
  const B = newBasisBuffers(model.order);
  const P = newPoint();
  let pCr = 0, pCi = 0, pSr = 0, pSi = 0, exx = 0, eyy = 0, ezz = 0, ngr = 0, ngi = 0, e2 = 0, e4 = 0, energyTot = 0;
  const regionPc = new Float64Array(2 * regions.length), regionEnergy = new Float64Array(regions.length);
  // window-margin diagnostic: power within 10 % of the smaller window size from the outer (non-mirror) sides
  const rect = mesh.rect, marginUm = 0.1 * Math.min(rect.x1 - rect.x0, rect.y1 - rect.y0);
  const mirrorSide = model.mirror ? (model.mirror.keep === 'right' ? 'left' : 'right') : null;
  let edgePr = 0, edgePi = 0;
  for (let t = 0; t < nT; t++) {
    if (model.dead[t]) continue;
    gatherLocal(model, md.xr, md.xi, t, cr, ci);
    const o = 4 * t, e = mt.eps, g = mt.epsG;
    const At = area[t];
    let tPr = 0, tPi = 0, tEn = 0;
    for (const q of Q4) {
      evalBasis(model.order, geo, edges, t, q, B);
      pointFields(model, B, cr, ci, P);
      const w = q[3] * At;
      const et = P.et, ep = P.etp, ez = P.ez;
      // Poynting integrand e_t . conj(e_t') and unconjugated e_t . e_t'
      tPr += w * (et[0] * ep[0] + et[1] * ep[1] + et[2] * ep[2] + et[3] * ep[3]);
      tPi += w * (et[1] * ep[0] - et[0] * ep[1] + et[3] * ep[2] - et[2] * ep[3]);
      pSr += w * (et[0] * ep[0] - et[1] * ep[1] + et[2] * ep[2] - et[3] * ep[3]);
      pSi += w * (et[0] * ep[1] + et[1] * ep[0] + et[2] * ep[3] + et[3] * ep[2]);
      const ax = et[0] * et[0] + et[1] * et[1], ay = et[2] * et[2] + et[3] * et[3], az = ez[0] * ez[0] + ez[1] * ez[1];
      exx += w * ax;
      eyy += w * ay;
      ezz += w * az;
      // electric energy density with the real part of eps: |E_t|^2 terms use e_t / beta
      const en = (e[o] * ax + e[o + 2] * ay + 2 * e[o + 1] * (et[0] * et[2] + et[1] * et[3])) / b2 + e[o + 3] * az;
      tEn += w * en;
      // group-index numerator (unconjugated): e_t . eps_g . e_t + theta eps_g,zz e_z^2
      const f = symTensorForm(et, et, g[o], g[o + 1], g[o + 2]);
      const ez2r = ez[0] * ez[0] - ez[1] * ez[1], ez2i = 2 * ez[0] * ez[1];
      ngr += w * (f[0] + g[o + 3] * (theta[0] * ez2r - theta[1] * ez2i));
      ngi += w * (f[1] + g[o + 3] * (theta[0] * ez2i + theta[1] * ez2r));
      const m2 = (ax + ay) / b2 + az;
      e2 += w * m2;
      e4 += w * m2 * m2;
    }
    pCr += tPr;
    pCi += tPi;
    {
      const a = mesh.tri[3 * t], b = mesh.tri[3 * t + 1], c = mesh.tri[3 * t + 2];
      const cx = (mesh.x[a] + mesh.x[b] + mesh.x[c]) / 3, cy = (mesh.y[a] + mesh.y[b] + mesh.y[c]) / 3;
      if ((mirrorSide !== 'left' && cx - rect.x0 < marginUm) || (mirrorSide !== 'right' && rect.x1 - cx < marginUm) || cy - rect.y0 < marginUm || rect.y1 - cy < marginUm) {
        edgePr += tPr;
        edgePi += tPi;
      }
    }
    const ri = mesh.triRegion[t];
    regionPc[2 * ri] += tPr;
    regionPc[2 * ri + 1] += tPi;
    regionEnergy[ri] += tEn;
    energyTot += tEn;
  }
  // P ~ Re[(1/beta) int e_t . conj(e_t')]
  const preal = (re, im) => (re * beta[0] + im * beta[1]) / b2;
  const pTot = preal(pCr, pCi);
  const confinement = {};
  regions.forEach((r, i) => {
    if (regionPc[2 * i] !== 0 || regionPc[2 * i + 1] !== 0 || regionEnergy[i] !== 0) confinement[r.name] = { power: preal(regionPc[2 * i], regionPc[2 * i + 1]) / pTot, electricEnergy: regionEnergy[i] / energyTot };
  });
  // n_g = (k0 / beta) num / (x^T B x)  (complex for lossy; real part reported)
  const ratio = cdiv(ngr, ngi, md.xBx[0], md.xBx[1]);
  const ngc = mt.ngValid === false ? [NaN, NaN] : cdiv(k0 * ratio[0], k0 * ratio[1], beta[0], beta[1]);
  const alpha = -beta[1]; // 1/um, beta = beta_r - j alpha
  const mode = {
    neff: beta[0] / k0,
    beta: beta[0],
    theta: theta[0],
    ng: ngc[0],
    residual: md.residual,
    ritzResidual: md.ritzResidual,
    teFraction: exx / (exx + eyy),
    longitudinalFraction: ezz / ((exx + eyy) / b2 + ezz),
    effectiveAreaUm2: (e2 * e2) / e4,
    confinement,
    powerIdentity: Math.hypot(pSr - md.xBx[0], pSi - md.xBx[1]) / Math.hypot(md.xBx[0], md.xBx[1]),
    windowMargin: { marginUm, powerFraction: preal(edgePr, edgePi) / pTot },
    x: md.xr,
    xBx: md.xBx[0],
  };
  if (lossy) {
    Object.assign(mode, {
      lossy: true,
      betaIm: beta[1],
      thetaIm: theta[1],
      kappa: -beta[1] / k0,
      alphaPerUm: alpha,
      lossDbPerCm: (20 / Math.LN10) * alpha * 1e4,
      ngIm: ngc[1],
      xIm: md.xi,
      xBxIm: md.xBx[1],
    });
  }
  const scale = fieldScale(model, md.xr, md.xi, beta);
  mode.amplitudeScale = scale;
  const s2 = scale[0] * scale[0] + scale[1] * scale[1];
  mode.powerW = (1e-12 * pTot * s2) / (2 * ETA0 * k0);
  if (opts.fields !== false) mode.fields = modeFields(model, md.xr, md.xi, beta, k0, scale);
  return mode;
}

/**
 * Complex scale s such that max over triangle centroids of |E| = 1 (V/m) and the dominant transverse component at
 * that centroid is real positive.
 */
function fieldScale(model, xr, xi, beta) {
  const { mesh, geo, edges } = model;
  const { nloc } = model.dof;
  const cr = new Float64Array(nloc), ci = new Float64Array(nloc);
  const B = newBasisBuffers(model.order), P = newPoint();
  const Lc = [1 / 3, 1 / 3, 1 / 3];
  const b2 = beta[0] * beta[0] + beta[1] * beta[1];
  let mx = 0, best = [1, 0];
  for (let t = 0; t < mesh.nTris; t++) {
    if (model.dead[t]) continue;
    gatherLocal(model, xr, xi, t, cr, ci);
    evalBasis(model.order, geo, edges, t, Lc, B);
    pointFields(model, B, cr, ci, P);
    const ax = P.et[0] * P.et[0] + P.et[1] * P.et[1], ay = P.et[2] * P.et[2] + P.et[3] * P.et[3];
    const m = Math.sqrt((ax + ay) / b2 + P.ez[0] * P.ez[0] + P.ez[1] * P.ez[1]);
    if (m > mx) {
      mx = m;
      // dominant transverse component of E_t = e_t / beta
      const c = ax >= ay ? [P.et[0], P.et[1]] : [P.et[2], P.et[3]];
      best = cdiv(c[0], c[1], beta[0], beta[1]);
    }
  }
  const bm = Math.hypot(best[0], best[1]) || 1;
  // s = conj(best) / (|best| mx)
  return [best[0] / (bm * (mx || 1)), -best[1] / (bm * (mx || 1))];
}

/**
 * Per-triangle centroid field components (typed arrays, transferable).
 * Lossless: ex, ey, hx, hy real amplitudes; ez, hz such that E_z = j ez, H_z = j hz.
 * Lossy: the same arrays hold real parts and exIm, eyIm, ezIm, hxIm, hyIm, hzIm the imaginary parts, with
 * E_z = j (ez + j ezIm), H_z = j (hz + j hzIm). ezNode (and ezNodeIm) at mesh nodes (vertex DOFs; P2 edge bubbles
 * vanish at nodes).
 */
function modeFields(model, xr, xi, beta, k0, s) {
  const { mesh, geo, edges } = model;
  const { nloc } = model.dof;
  const nT = mesh.nTris;
  const lossy = !!xi;
  const mk = () => new Float64Array(nT);
  const F = { ex: mk(), ey: mk(), ez: mk(), hx: mk(), hy: mk(), hz: mk() };
  const Fi = lossy ? { exIm: mk(), eyIm: mk(), ezIm: mk(), hxIm: mk(), hyIm: mk(), hzIm: mk() } : null;
  const ezNode = new Float64Array(mesh.nNodes), ezNodeIm = lossy ? new Float64Array(mesh.nNodes) : null;
  for (let i = 0; i < mesh.nNodes; i++) {
    const d = model.dof.nodeDof[i];
    if (d < 0) continue;
    const a = xr[d], b = xi ? xi[d] : 0;
    ezNode[i] = s[0] * a - s[1] * b;
    if (lossy) ezNodeIm[i] = s[0] * b + s[1] * a;
  }
  const cr = new Float64Array(nloc), ci = new Float64Array(nloc);
  const B = newBasisBuffers(model.order), P = newPoint();
  const Lc = [1 / 3, 1 / 3, 1 / 3];
  const hk = 1 / (k0 * ETA0);
  // complex multiply helpers
  const mul = (ar, ai, br, bi) => [ar * br - ai * bi, ar * bi + ai * br];
  const sb = cdiv(s[0], s[1], beta[0], beta[1]); // s / beta
  for (let t = 0; t < nT; t++) {
    if (model.dead[t]) continue;
    gatherLocal(model, xr, xi, t, cr, ci);
    evalBasis(model.order, geo, edges, t, Lc, B);
    pointFields(model, B, cr, ci, P);
    const ex = mul(sb[0], sb[1], P.et[0], P.et[1]), ey = mul(sb[0], sb[1], P.et[2], P.et[3]);
    const ez = mul(s[0], s[1], P.ez[0], P.ez[1]);
    // H_t = z x e_t' / (k0 eta0): (H_x, H_y) = (-e'_y, e'_x) / (k0 eta0)
    const hx = mul(s[0], s[1], -P.etp[2] * hk, -P.etp[3] * hk), hy = mul(s[0], s[1], P.etp[0] * hk, P.etp[1] * hk);
    const hz = mul(sb[0], sb[1], P.curl[0] * hk, P.curl[1] * hk);
    F.ex[t] = ex[0]; F.ey[t] = ey[0]; F.ez[t] = ez[0]; F.hx[t] = hx[0]; F.hy[t] = hy[0]; F.hz[t] = hz[0];
    if (lossy) {
      Fi.exIm[t] = ex[1]; Fi.eyIm[t] = ey[1]; Fi.ezIm[t] = ez[1]; Fi.hxIm[t] = hx[1]; Fi.hyIm[t] = hy[1]; Fi.hzIm[t] = hz[1];
    }
  }
  return { ...F, ...(Fi ?? {}), ezNode, ...(lossy ? { ezNodeIm } : {}), location: 'triangle_centroid',
    convention: lossy ? 'E_t = ex + j exIm; E_z = j (ez + j ezIm); H_t = hx + j hxIm; H_z = j (hz + j hzIm)' : 'E_t, H_t real; E_z = j ez; H_z = j hz' };
}

// ---------------------------------------------------------------------------------------------------------------
// Perturbations: vector EO overlap and generic permittivity perturbation (Hellmann-Feynman of the discrete pencil).

/** Unconjugated sum over triangles of int e_t . d_eps_t . e_t + theta d_eps_zz e_z^2 (dEpsT 4 per triangle), [re, im]. */
function pencilForm(model, mode, dEpsT, regionAcc = null) {
  const perPoint = dEpsT.length === 4 * Q4.length * model.mesh.nTris; // 4 per quadrature point (24 per triangle)
  const { mesh, geo, area, edges } = model;
  const { nloc } = model.dof;
  const theta = [mode.theta, mode.thetaIm ?? 0];
  const cr = new Float64Array(nloc), ci = new Float64Array(nloc);
  const B = newBasisBuffers(model.order), P = newPoint();
  let sr = 0, si = 0;
  for (let t = 0; t < mesh.nTris; t++) {
    if (model.dead[t]) continue;
    const stride = perPoint ? 4 * Q4.length : 4;
    let nz = false;
    for (let k = 0; k < stride; k++) if (dEpsT[stride * t + k] !== 0) nz = true;
    if (!nz) continue;
    gatherLocal(model, mode.x, mode.xIm ?? null, t, cr, ci);
    let tr = 0, ti = 0;
    for (let qi = 0; qi < Q4.length; qi++) {
      const q = Q4[qi];
      const o = perPoint ? stride * t + 4 * qi : 4 * t;
      const dxx = dEpsT[o], dxy = dEpsT[o + 1], dyy = dEpsT[o + 2], dzz = dEpsT[o + 3];
      evalBasis(model.order, geo, edges, t, q, B);
      pointFields(model, B, cr, ci, P);
      const w = q[3] * area[t];
      const f = symTensorForm(P.et, P.et, dxx, dxy, dyy);
      const ez2r = P.ez[0] * P.ez[0] - P.ez[1] * P.ez[1], ez2i = 2 * P.ez[0] * P.ez[1];
      tr += w * (f[0] + dzz * (theta[0] * ez2r - theta[1] * ez2i));
      ti += w * (f[1] + dzz * (theta[0] * ez2i + theta[1] * ez2r));
    }
    sr += tr;
    si += ti;
    if (regionAcc) regionAcc[mesh.triRegion[t]] += tr;
  }
  return [sr, si];
}

/** delta beta (complex [re, im], 1/um) for a pencil form value: d theta = k0^2 form / (x^T B x), d beta = d theta / (2 beta). */
function dBetaFromForm(mode, k0, form) {
  const beta = [mode.beta, mode.betaIm ?? 0];
  const xBx = [mode.xBx, mode.xBxIm ?? 0];
  const dth = cdiv(k0 * k0 * form[0], k0 * k0 * form[1], xBx[0], xBx[1]);
  return cdiv(dth[0], dth[1], 2 * beta[0], 2 * beta[1]);
}

/**
 * First-order Pockels change of a vector mode's effective index for a static field sampled on the optical triangles.
 *   delta n_eff = Re(delta beta) / k0,  delta beta = (k0^2 / (2 beta)) [ int e_t . d_eps_t . e_t + beta^2 int d_eps_zz e_z^2 ]
 *   / (x^T B' x)  =  (omega eps0 / (4 P)) int E* . d_eps . E dA for a lossless mode (Hellmann-Feynman of the pencil).
 * d_eps (lab) = -eps d(1/eps) eps from materials.deltaEpsLab with the full Voigt Pockels matrix, so shear terms
 * (d_eps_xy, e.g. r51 with a field along crystal x of x-cut LN) are included; d_eps_xz and d_eps_yz do not contribute
 * at first order (E_z is in quadrature with E_t for a lossless mode; for a lossy mode their contribution is
 * neglected, documented limitation).
 * @param {ReturnType<typeof buildVectorModel>} model
 * @param {object} mode an entry of solveVectorModes().modes
 * @param {Float64Array} triField lab (Ex, Ey, Ez) in V/m per volt of terminal voltage: 3 per optical triangle
 *   (eo-overlap.sampleFieldOnOpticalMesh, centroid sampling) or 3 per quadrature point, 18 per triangle
 *   (sampleStaticFieldQ; resolves the field variation inside an optical triangle and the P2 electrostatic gradient)
 * @param {number} lambdaUm wavelength of the mode
 * @returns {{dneffPerV:number, dAlphaPerUmPerV:number, byRegion:Record<string,number>, labels:string[]}}
 */
export function vectorEoOverlap(model, mode, triField, lambdaUm) {
  const { mesh, regions, mats } = model;
  const nT = mesh.nTris;
  const nq = Q4.length;
  const perPoint = triField instanceof Float64Array && triField.length === 3 * nq * nT;
  if (!(triField instanceof Float64Array) || !(triField.length === 3 * nT || perPoint)) fail(`triField must be a Float64Array of length 3 * nTris = ${3 * nT} (per triangle) or 3 * 6 * nTris = ${3 * nq * nT} (per quadrature point, sampleStaticFieldQ)`);
  if (!(mode && mode.x && mode.beta > 0 && Number.isFinite(mode.xBx))) fail('mode must be an entry of solveVectorModes().modes');
  if (!(lambdaUm > 0)) fail('lambdaUm is required');
  const k0 = (2 * Math.PI) / lambdaUm;
  const perRegion = regions.map((r) => {
    const m = mats[r.material];
    if (!m || m.conductor || !m.r) return null;
    const e = epsOptLab(m, lambdaUm, model.lambda0Um);
    return e ? { m, e } : null;
  });
  const np = perPoint ? nq : 1;
  const dEps = new Float64Array(4 * np * nT);
  for (let t = 0; t < nT; t++) {
    if (model.dead[t]) continue;
    const pr = perRegion[mesh.triRegion[t]];
    if (!pr) continue;
    for (let k = 0; k < np; k++) {
      const f = 3 * (np * t + k), o = 4 * (np * t + k);
      const E = [triField[f], triField[f + 1], triField[f + 2]];
      if (E[0] === 0 && E[1] === 0 && E[2] === 0) continue;
      const d = deltaEpsLab(pr.m.r, pr.m.A, pr.e, E);
      dEps[o] = d[0];
      dEps[o + 1] = 0.5 * (d[1] + d[3]);
      dEps[o + 2] = d[4];
      dEps[o + 3] = d[8];
    }
  }
  const regionAcc = new Float64Array(regions.length);
  const form = pencilForm(model, mode, dEps, regionAcc);
  const db = dBetaFromForm(mode, k0, form);
  const byRegion = {};
  regions.forEach((r, i) => {
    if (regionAcc[i] !== 0) byRegion[r.name] = (db[0] / k0) * (regionAcc[i] / form[0]);
  });
  return { dneffPerV: db[0] / k0, dAlphaPerUmPerV: -db[1], byRegion, labels: [...VECTOR_LABELS, ORDER_LABELS[model.order], 'first_order_pockels_vector_overlap'] };
}

/**
 * First-order change of n_eff for an arbitrary per-triangle symmetric permittivity perturbation (4 per triangle:
 * xx, xy, yy, zz; real). Returns delta n_eff (real part).
 */
export function vectorPerturbation(model, mode, dEpsT, lambdaUm) {
  const k0 = (2 * Math.PI) / lambdaUm;
  return dBetaFromForm(mode, k0, pencilForm(model, mode, dEpsT))[0] / k0;
}

/** Pick the mode of a polarisation family by TE fraction: 'TE' (teFraction >= 0.5) or 'TM', order 0 = highest n_eff. */
export function selectVectorMode(result, polarization, order = 0) {
  const fam = result.modes.filter((m) => (polarization === 'TE' ? m.teFraction >= 0.5 : m.teFraction < 0.5));
  return fam[order] ?? null;
}

/**
 * Optical field payload in the DevLog-023 O4 contract shape (typed arrays, transferable):
 * {x, y, tri, triRegion, regionNames, location, convention, modes: [{n_eff, components: {ex, ey, ez, hx, hy, hz}}]}.
 * Components are per-triangle centroid values (see modeFields for the phase convention; lossy modes add *Im arrays).
 * Requires solveVectorModes(..., {fields: true}) (the default).
 */
export function vectorOpticalFields(model, result) {
  const { mesh } = model;
  const modes = result.modes.map((m) => {
    if (!m.fields) fail('vectorOpticalFields: modes were solved with fields: false');
    const components = { ...m.fields };
    delete components.location;
    delete components.convention;
    return { n_eff: m.neff, te_fraction: m.teFraction, components };
  });
  return {
    x: mesh.x,
    y: mesh.y,
    tri: mesh.tri,
    triRegion: mesh.triRegion,
    regionNames: model.regions.map((r) => r.name),
    location: 'triangle_centroid',
    convention: result.modes[0]?.fields?.convention ?? null,
    modes,
  };
}

/**
 * Static field (V/m per volt, lab x, y; z = 0) at the 6 quadrature points of every optical triangle, from an
 * electrostatic result (P1: constant triangle gradient; P2 (elementOrder 2): linear gradient via
 * electrostatics.gradientAt). A point inside an electrode polygon gets E = 0, as eo-overlap.sampleFieldOnOpticalMesh.
 * Layout: 18 per triangle, [Ex, Ey, Ez] for points in the order of the internal 6-point rule.
 */
export function sampleStaticFieldQ(es, model) {
  if (!es?.mesh || !es.grad) fail('sampleStaticFieldQ: es must be a solveElectrostatics result');
  const loc = new TriLocator(es.mesh, es.geo);
  const om = model.mesh, nq = Q4.length;
  const out = new Float64Array(3 * nq * om.nTris);
  for (let t = 0; t < om.nTris; t++) {
    const a = om.tri[3 * t], b = om.tri[3 * t + 1], c = om.tri[3 * t + 2];
    for (let k = 0; k < nq; k++) {
      const L = Q4[k];
      const x = L[0] * om.x[a] + L[1] * om.x[b] + L[2] * om.x[c], y = L[0] * om.y[a] + L[1] * om.y[b] + L[2] * om.y[c];
      const e = loc.find(x, y);
      if (e < 0) {
        if (model.section?.classify && model.section.classify(x, y).electrode >= 0) continue;
        fail(`sampleStaticFieldQ: point (${x.toFixed(4)}, ${y.toFixed(4)}) um of optical triangle ${t} lies outside the electrostatic mesh`);
      }
      const g = gradientAt(es, e, x, y);
      out[3 * (nq * t + k)] = -g[0] * 1e6;
      out[3 * (nq * t + k) + 1] = -g[1] * 1e6;
    }
  }
  return out;
}

/**
 * Element kernels for the postprocessing engine (engine/src/postproc, DevLog-031): the solver's own 6-point
 * quadrature rule, basis evaluation, local DOF gather and point fields, exported so derived quantities use exactly the
 * solver interpolation. Read-only; no solver behaviour depends on this export.
 */
export const VECTOR_KERNELS = Object.freeze({ Q4, NLOC, ETA0, newBasisBuffers, evalBasis, gatherLocal, pointFields, newPoint });
