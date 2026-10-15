// Field export (DevLog-023 O4 contract) and content hashes for result reuse across sweep points (DevLog-026).
// Exported arrays are typed-array copies (transferable without detaching solver or cache memory). GPL-3.0-or-later.

import { epsRfLab, epsOptLab, deltaEpsLab } from './materials.mjs';
import { sampleFieldOnOpticalMesh } from './eo-overlap.mjs';

/** FNV-1a over a string, two independent 32-bit lanes (64-bit hex). Not cryptographic; a cache key only. */
export function hashString(s) {
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ c, 0x5bd1e995) >>> 0;
    b ^= b >>> 15;
  }
  return a.toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/**
 * Content hashes of an electrostatic problem.
 * mesh: geometry polygons, region/electrode names and order, mesh hints, refinement windows, thickness hint, mesh scale
 * (everything the mesher reads). solution: mesh + electrode potentials, symmetry, outer boundary conditions and the
 * lab-frame RF permittivity of every region material.
 * @param {import('./section.mjs').CrossSection} section
 */
export function geometryHash(section, materials, meshScale, elementOrder = 1) {
  const g = section.geom;
  const meshInput = {
    domain: g.domain, symmetry: g.symmetry, mirror: g.mirror_x_um, optical_window: g.optical_window,
    regions: g.regions.map((r) => [r.name, r.poly]), electrodes: g.electrodes.map((e) => [e.name, e.poly]),
    mesh: { ...g.mesh, element_order: undefined }, refine: section.refineWindows, thickness: section.thicknessHintUm ?? null, meshScale,
  };
  const mesh = hashString(JSON.stringify(meshInput));
  const solutionInput = {
    mesh, elementOrder, weights: g.electrodes.map((e) => e.weight), boundary: g.boundary,
    eps: g.regions.map((r) => (materials[r.material] ? epsRfLab(materials[r.material]) : null)),
  };
  return { mesh, solution: hashString(JSON.stringify(solutionInput)) };
}

const f64 = (a) => Float64Array.from(a);
const i32 = (a) => Int32Array.from(a);

/**
 * Electrostatic fields of one solve, per volt of terminal voltage V_t.
 * x, y node coordinates (um); tri node triples; triRegion index into regionNames; phi nodal potential (V per V_t);
 * ex, ey per-triangle field (V/m per V_t, E = -grad phi). nodeElectrode: electrode index per node or -1.
 */
export function esFields(es, section) {
  const m = es.mesh;
  const ex = new Float64Array(m.nTris), ey = new Float64Array(m.nTris);
  for (let t = 0; t < m.nTris; t++) { ex[t] = -es.grad.gx[t] * 1e6; ey[t] = -es.grad.gy[t] * 1e6; } // P2: centroid value
  return {
    x: f64(m.x), y: f64(m.y), tri: i32(m.tri), triRegion: i32(m.triRegion),
    regionNames: section.regions.map((r) => r.name), regionMaterials: section.regions.map((r) => r.material),
    electrodeNames: section.electrodes.map((e) => e.name), nodeElectrode: i32(m.nodeElectrode),
    phi: f64(es.phi), ex, ey, elementOrder: es.elementOrder ?? 1,
    // P2: all DOFs (vertices first, then edge midpoints) and the 6 DOF indices per triangle, for quadratic rendering.
    ...(es.elementOrder === 2 ? { p2: { phiDof: f64(es.phiDof), elem: i32(es.p2.elem) } } : {}),
    units: { x: 'um', y: 'um', phi: 'V per V_t', e: 'V/m per V_t' },
    rect: { ...m.rect },
  };
}

/**
 * Optical mesh and every solved mode of one optical model. Scalar solver: components.psi is the nodal field of the
 * dominant component (form E: E_x for TE; form H: H_x for TM), normalised to max |psi| = 1 with a positive peak.
 */
export function opticalFields(model, mode, opts = {}) {
  const m = model.mesh;
  return {
    x: f64(m.x), y: f64(m.y), tri: i32(m.tri), triRegion: i32(m.triRegion),
    regionNames: model.regions.map((r) => r.name), regionMaterials: model.regions.map((r) => r.material),
    window: { x: [...model.window.x], y: [...model.window.y] },
    solver: opts.solver ?? 'scalar', polarization: model.polarization, form: mode.form, lambdaUm: mode.lambdaUm ?? model.lambda0Um,
    modes: mode.neff.map((n, k) => ({ n_eff: n, components: { psi: f64(mode.psi[k]) } })),
    units: { x: 'um', y: 'um', psi: 'arbitrary (max |psi| = 1)' },
  };
}

/** Transferable buffers of a fields object (for postMessage). */
export function fieldTransferables(fields) {
  const out = [];
  const walk = (v) => {
    if (ArrayBuffer.isView(v)) out.push(v.buffer);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(fields);
  return [...new Set(out)];
}

/**
 * Pockels index change per optical-mesh triangle, per volt of terminal voltage V_t (DevLog-026 round 3, L-UI request).
 * The static field E (lab frame, V/m per V_t, E_z = 0) is sampled at each optical triangle centroid
 * (eo-overlap.sampleFieldOnOpticalMesh: P1 triangle gradient, P2 gradientAt; zero inside electrodes). The lab-frame
 * permittivity change is materials.deltaEpsLab (d eps = -eps d(1/eps) eps with the full 3m Voigt tensor of the
 * material and its crystal rotation), and the index change of each principal lab axis is dn_ii = d eps_ii / (2 n_ii)
 * with n_ii = sqrt(eps_opt_ii) at the solved wavelength (first order; sign as the engine convention: a positive r E
 * lowers the index). dEpsXY is the shear term (in-plane off-diagonal). Triangles of materials without Pockels
 * coefficients, conductors and PEC-excluded triangles carry 0. Units: 1/V (dn per volt), dEpsXY 1/V (relative
 * permittivity per volt).
 * @param {any} es solveElectrostatics result of the same cross-section
 * @param {{mesh:any, regions:any[], mats:Record<string, any>, section:any, lambda0Um:number, dead?:Uint8Array}} model
 *   scalar (optics.buildOpticalModel) or vector (vector-mode.buildVectorModel) optical model
 * @param {number} lambdaUm wavelength of the solved mode (um)
 */
export function pockelsDeltaN(es, model, lambdaUm) {
  const m = model.mesh;
  const nT = m.nTris;
  const E = sampleFieldOnOpticalMesh(es, model);
  const per = model.regions.map((r) => {
    const mat = model.mats[r.material];
    if (!mat || mat.conductor || !mat.r) return null;
    const e = epsOptLab(mat, lambdaUm, model.lambda0Um);
    return e ? { mat, e, n: [Math.sqrt(e[0]), Math.sqrt(e[4]), Math.sqrt(e[8])] } : null;
  });
  const dnXX = new Float64Array(nT), dnYY = new Float64Array(nT), dnZZ = new Float64Array(nT), dEpsXY = new Float64Array(nT);
  for (let t = 0; t < nT; t++) {
    if (model.dead?.[t]) continue;
    const p = per[m.triRegion[t]];
    if (!p) continue;
    const f = [E[3 * t], E[3 * t + 1], E[3 * t + 2]];
    if (f[0] === 0 && f[1] === 0 && f[2] === 0) continue;
    const d = deltaEpsLab(p.mat.r, p.mat.A, p.e, f);
    dnXX[t] = d[0] / (2 * p.n[0]);
    dnYY[t] = d[4] / (2 * p.n[1]);
    dnZZ[t] = d[8] / (2 * p.n[2]);
    dEpsXY[t] = 0.5 * (d[1] + d[3]);
  }
  return {
    dnXX, dnYY, dnZZ, dEpsXY, location: 'triangle_centroid', lambdaUm,
    units: { dn: '1/V (index change per volt of terminal voltage)', dEpsXY: '1/V (relative permittivity per volt)' },
    sign: 'first-order Pockels, d eps = -eps d(1/eps) eps; dn_ii = d eps_ii / (2 n_ii); positive r E lowers the index',
  };
}
