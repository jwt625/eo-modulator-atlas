// Device discretisation for the drift-diffusion stage (DevLog-039): mesh, node sets, P1 / box-method geometry,
// doping per control volume, contact node sets and the dimensionless scaling.
// Units: geometry um; doping cm^-3 in inputs, scaled by C0 internally.
// License: GPL-3.0-or-later.

import { buildPattern, entryIndex } from '../sparse.mjs';
import { triangleGeometry } from '../fem.mjs';
import { epsTriangles, EPS0 } from '../electrostatics.mjs';
import { rectToPolygon } from '../geometry.mjs';
import { Q_E, thermalVoltage, intrinsicDensitySproulGreen, lowFieldMobility } from './models.mjs';
import { dopingAt } from './config.mjs';

/** Mobility scale (m^2 / (V s)) of the dimensionless continuity rows (any constant; 1000 cm^2/Vs). */
export const MU_REF = 0.1;
/** Length unit of the mesh (m). */
export const L0 = 1e-6;
/** Default vertex budget of a device mesh (the engine-wide MAX_VERTICES is 80,000). */
export const DEFAULT_SEMI_MAX_VERTICES = 80000;
/** Barycentric sample point of a vertex kite (centroid of the control-volume part of one triangle). */
const KITE = [11 / 18, 7 / 36, 7 / 36];

/**
 * Build the device mesh. Size sources: semiconductor regions at `semiEdgeUm`; optional junction refinement around
 * net-doping sign changes of a first mesh (two passes).
 * @returns {any} extracted mesh (mesh.mjs) with rect
 */
export function buildDeviceMesh(section, opts, { meshScale = 1 } = {}) {
  const g = section.geom;
  const semiRegions = section.regions.filter((r) => r.material === opts.materialName);
  // the optical-window refinement of the geometry hints serves the mode solver, not the device: switched off here
  const hints = { ...(g.mesh ?? {}), window_edge_um: g.mesh?.max_edge_um ?? undefined, max_vertices: opts.mesh.maxVertices ?? Math.max(g.mesh?.max_vertices ?? 0, DEFAULT_SEMI_MAX_VERTICES) };
  if (hints.window_edge_um === undefined) delete hints.window_edge_um;
  const base = [];
  if (opts.mesh.semiEdgeUm) for (const r of semiRegions) base.push({ poly: r.poly, filled: true, h0: opts.mesh.semiEdgeUm * meshScale });
  let mesh = section.buildMesh({ scale: meshScale, hints, extraSources: base });
  if (opts.mesh.junctionEdgeUm) {
    const pts = junctionPoints(mesh, section, opts);
    if (pts.length) {
      const extra = [...base, ...pts.map((p) => ({ poly: [p], filled: false, h0: opts.mesh.junctionEdgeUm * meshScale }))];
      mesh = section.buildMesh({ scale: meshScale, hints, extraSources: extra });
    }
  }
  if (mesh.nNodes > hints.max_vertices) throw new Error(`semiconductor mesh has ${mesh.nNodes} vertices, above the budget ${hints.max_vertices}`);
  return mesh;
}

/** Midpoints of mesh edges inside the semiconductor whose end points have opposite net doping. */
function junctionPoints(mesh, section, opts) {
  const semi = section.regions.map((r) => r.material === opts.materialName);
  const net = new Float64Array(mesh.nNodes);
  const seen = new Uint8Array(mesh.nNodes);
  for (let t = 0; t < mesh.nTris; t++) {
    const reg = section.regions[mesh.triRegion[t]];
    if (!semi[mesh.triRegion[t]]) continue;
    for (let a = 0; a < 3; a++) {
      const v = mesh.tri[3 * t + a];
      if (seen[v]) continue;
      seen[v] = 1;
      const [nd, na] = dopingAt(opts.doping, mesh.x[v], mesh.y[v], { regionName: reg.name, material: reg.material });
      net[v] = nd - na;
    }
  }
  const pts = [];
  const done = new Set();
  for (let t = 0; t < mesh.nTris; t++) {
    if (!semi[mesh.triRegion[t]]) continue;
    for (let a = 0; a < 3; a++) {
      const i = mesh.tri[3 * t + a], j = mesh.tri[3 * t + ((a + 1) % 3)];
      const k = i < j ? i * mesh.nNodes + j : j * mesh.nNodes + i;
      if (done.has(k)) continue;
      done.add(k);
      if (net[i] * net[j] < 0) pts.push([0.5 * (mesh.x[i] + mesh.x[j]), 0.5 * (mesh.y[i] + mesh.y[j])]);
    }
  }
  return pts;
}

/**
 * Discretise the device on a mesh.
 * @param {any} section CrossSection
 * @param {Record<string, any>} materials resolved config materials
 * @param {any} opts semiconductorOptions()
 * @param {any} mesh buildDeviceMesh()
 */
export function buildDevice(section, materials, opts, mesh) {
  const t0 = performance.now();
  const nN = mesh.nNodes, nT = mesh.nTris;
  const T = opts.temperatureK;
  const Vt = thermalVoltage(T);
  const niCm3 = opts.material.ni.model === 'configured' ? opts.material.ni.niCm3 : intrinsicDensitySproulGreen(T);
  const regionMats = section.regions.map((r) => materials[r.material]);
  const semiRegion = section.regions.map((r) => r.material === opts.materialName);
  const triSemi = new Uint8Array(nT);
  for (let t = 0; t < nT; t++) triSemi[t] = semiRegion[mesh.triRegion[t]] ? 1 : 0;
  const geo = triangleGeometry(mesh);
  const poissonAll = (opts.poissonDomain ?? 'all') === 'all';
  const pat = buildPattern(nN, mesh.tri);
  const epsTri = epsTriangles(mesh, regionMats);
  // Poisson stiffness (dimensionless, region permittivity tensor) with |area| (orientation independent)
  const K = new Float64Array(pat.nnz);
  // box-method edge couplings of the semiconductor (sum of cot / 2 of semiconductor triangles)
  const wSemi = new Float64Array(pat.nnz);
  const slots = new Int32Array(9 * nT);
  for (let t = 0; t < nT; t++) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) slots[9 * t + 3 * a + b] = entryIndex(pat, mesh.tri[3 * t + a], mesh.tri[3 * t + b]);
  const cvArea = new Float64Array(nN); // semiconductor control-volume area (um^2)
  const isSemi = new Uint8Array(nN);
  const ndSum = new Float64Array(nN), naSum = new Float64Array(nN);
  // kite-level doping-type split of every control volume (charge attribution to the contact sides)
  const posArea = new Float64Array(nN), negArea = new Float64Array(nN), posNet = new Float64Array(nN), negNet = new Float64Array(nN);
  for (let t = 0; t < nT; t++) {
    const A = Math.abs(geo.area[t]);
    const exx = epsTri[3 * t], exy = epsTri[3 * t + 1], eyy = epsTri[3 * t + 2];
    for (let a = 0; a < 3; a++) {
      const gax = geo.gx[3 * t + a], gay = geo.gy[3 * t + a];
      for (let b = 0; b < 3; b++) {
        const gbx = geo.gx[3 * t + b], gby = geo.gy[3 * t + b];
        const s = slots[9 * t + 3 * a + b];
        // poisson_domain semiconductor: insulators removed from the electrostatics (zero flux on silicon surfaces)
        if (poissonAll || triSemi[t]) K[s] += A * (gax * (exx * gbx + exy * gby) + gay * (exy * gbx + eyy * gby));
        if (triSemi[t] && a !== b) wSemi[s] -= A * (gax * gbx + gay * gby);
      }
    }
    if (!triSemi[t]) continue;
    const reg = section.regions[mesh.triRegion[t]];
    const where = { regionName: reg.name, material: reg.material };
    const v = [mesh.tri[3 * t], mesh.tri[3 * t + 1], mesh.tri[3 * t + 2]];
    for (let a = 0; a < 3; a++) {
      const i = v[a], j = v[(a + 1) % 3], k = v[(a + 2) % 3];
      isSemi[i] = 1;
      cvArea[i] += A / 3;
      const x = KITE[0] * mesh.x[i] + KITE[1] * mesh.x[j] + KITE[2] * mesh.x[k];
      const y = KITE[0] * mesh.y[i] + KITE[1] * mesh.y[j] + KITE[2] * mesh.y[k];
      const [nd, na] = dopingAt(opts.doping, x, y, where);
      ndSum[i] += (A / 3) * nd;
      naSum[i] += (A / 3) * na;
      const net = nd - na;
      if (net > 0) { posArea[i] += A / 3; posNet[i] += (A / 3) * net; } else if (net < 0) { negArea[i] += A / 3; negNet[i] += (A / 3) * net; }
    }
  }
  // clamp negative semiconductor edge weights (should not occur on a conforming Delaunay mesh)
  let negative = 0, negativeMax = 0, wMax = 0;
  for (let p = 0; p < pat.nnz; p++) wMax = Math.max(wMax, Math.abs(wSemi[p]));
  for (let i = 0; i < nN; i++) for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
    if (pat.colidx[p] === i) { wSemi[p] = 0; continue; }
    if (wSemi[p] < 0) {
      if (-wSemi[p] > 1e-9 * wMax) negative++; // round-off of right angles is not counted
      negativeMax = Math.max(negativeMax, -wSemi[p]);
      wSemi[p] = 0;
    }
  }
  const ND = new Float64Array(nN), NA = new Float64Array(nN);
  for (let i = 0; i < nN; i++) if (isSemi[i]) { ND[i] = ndSum[i] / cvArea[i]; NA[i] = naSum[i] / cvArea[i]; }
  let C0 = niCm3;
  for (let i = 0; i < nN; i++) if (isSemi[i]) C0 = Math.max(C0, Math.abs(ND[i] - NA[i]));
  // edges (i < j) with semiconductor coupling or Poisson coupling
  const edgeI = [], edgeJ = [], edgeW = [], slotIJ = [], slotJI = [], edgeLen = [];
  for (let i = 0; i < nN; i++) for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) {
    const j = pat.colidx[p];
    if (j <= i || !(wSemi[p] > 0)) continue;
    edgeI.push(i); edgeJ.push(j); edgeW.push(wSemi[p]); slotIJ.push(p); slotJI.push(entryIndex(pat, j, i));
    edgeLen.push(Math.hypot(mesh.x[j] - mesh.x[i], mesh.y[j] - mesh.y[i]));
  }
  const diagSlot = new Int32Array(nN);
  for (let i = 0; i < nN; i++) diagSlot[i] = entryIndex(pat, i, i);
  // low-field mobility per node (cm^2/Vs), from the total impurity density
  const muN0 = new Float64Array(nN), muP0 = new Float64Array(nN);
  for (let i = 0; i < nN; i++) if (isSemi[i]) { const [mn, mp] = lowFieldMobility(opts.material.mobility, ND[i] + NA[i]); muN0[i] = mn; muP0[i] = mp; }
  // contacts
  const contactOfNode = new Int16Array(nN).fill(-1);
  const contactNodes = opts.contacts.map(() => []);
  const electrodeToContact = new Map(opts.contacts.map((c, k) => [c.index, k]));
  for (let i = 0; i < nN; i++) {
    const e = mesh.nodeElectrode[i];
    if (e < 0) continue;
    const k = electrodeToContact.get(e);
    if (k == null) throw new Error(`electrode ${section.electrodes[e].name} is not a semiconductor contact`);
    contactOfNode[i] = k;
    contactNodes[k].push(i);
  }
  // segment contacts: semiconductor nodes on the segment (tolerance 1e-9 of the domain diagonal)
  const tolSeg = 1e-9 * Math.hypot(mesh.rect.x1 - mesh.rect.x0, mesh.rect.y1 - mesh.rect.y0);
  opts.contacts.forEach((c, k) => {
    if (!c.segment) return;
    for (let i = 0; i < nN; i++) {
      if (!isSemi[i] || mesh.nodeElectrode[i] >= 0) continue;
      if (mesh.x[i] < c.segment.x[0] - tolSeg || mesh.x[i] > c.segment.x[1] + tolSeg || mesh.y[i] < c.segment.y[0] - tolSeg || mesh.y[i] > c.segment.y[1] + tolSeg) continue;
      if (contactOfNode[i] >= 0) throw new Error(`semiconductor.contacts: node (${mesh.x[i]}, ${mesh.y[i]}) belongs to two contacts`);
      contactOfNode[i] = k;
      contactNodes[k].push(i);
    }
    if (contactNodes[k].length < 2) throw new Error(`semiconductor.contacts: segment contact ${c.electrode} holds ${contactNodes[k].length} mesh node(s); it must lie on a meshed semiconductor boundary`);
  });
  opts.contacts.forEach((c, k) => {
    if (!contactNodes[k].some((i) => isSemi[i])) throw new Error(`semiconductor.contacts: electrode ${c.electrode} does not touch the semiconductor (gate contacts are not implemented)`);
  });
  // contact majority type and doping-type side weights (charge attribution of a two-terminal junction)
  const contactType = contactNodes.map((nodes) => {
    let s = 0, w = 0;
    for (const i of nodes) if (isSemi[i]) { s += cvArea[i] * (ND[i] - NA[i]); w += cvArea[i]; }
    return s / w >= 0 ? 'n' : 'p';
  });
  // side weight: fraction of the control volume with the contact's doping type (half of any compensated part);
  // side fixed charge: the doping of that fraction (cm^-3 um^2, scaled by C0 below)
  const sideWeight = contactType.map((t) => {
    const w = new Float64Array(nN);
    for (let i = 0; i < nN; i++) {
      if (!isSemi[i]) continue;
      const zero = Math.max(0, cvArea[i] - posArea[i] - negArea[i]);
      w[i] = ((t === 'n' ? posArea[i] : negArea[i]) + 0.5 * zero) / cvArea[i];
    }
    return w;
  });
  const sideFixed = contactType.map((t) => Float64Array.from(t === 'n' ? posNet : negNet));
  // every semiconductor component must reach a contact (otherwise the continuity blocks are singular)
  checkComponents(nN, edgeI, edgeJ, isSemi, contactOfNode);
  const niHat = niCm3 / C0;
  const lambda2 = (Q_E * C0 * 1e6 * L0 * L0) / (EPS0 * Vt);
  const kappa = (L0 * L0) / (MU_REF * Vt); // s: scaled recombination factor (U in s^-1 of scaled density)
  const srh = opts.material.srh ? { tauN: opts.material.srh.tauN, tauP: opts.material.srh.tauP, n1: niHat * Math.exp(opts.material.srh.trapEv / Vt), p1: niHat * Math.exp(-opts.material.srh.trapEv / Vt) } : null;
  return {
    mesh, section, geo, pat, K, wSemi, poissonAll, isSemi, cvArea, triSemi, epsTri,
    ND, NA, Chat: Float64Array.from(ND, (v, i) => (v - NA[i]) / C0),
    edges: { n: edgeI.length, i: Int32Array.from(edgeI), j: Int32Array.from(edgeJ), w: Float64Array.from(edgeW), sij: Int32Array.from(slotIJ), sji: Int32Array.from(slotJI), len: Float64Array.from(edgeLen) },
    diagSlot, muN0, muP0, contactOfNode, contactNodes: contactNodes.map((a) => Int32Array.from(a)), contactType, sideWeight, sideFixedHat: sideFixed.map((a) => a.map((v) => v / C0)),
    scale: { Vt, niCm3, C0, niHat, lambda2, kappa, muRef: MU_REF, L0, T },
    srh, mobility: opts.material.mobility,
    stats: { nNodes: nN, nTris: nT, nSemiNodes: isSemi.reduce((a, v) => a + v, 0), nSemiEdges: edgeI.length, negativeEdgeWeights: negative, negativeEdgeWeightMax: negativeMax, build_ms: performance.now() - t0 },
  };
}

function checkComponents(nN, ei, ej, isSemi, contactOfNode) {
  const parent = new Int32Array(nN);
  for (let i = 0; i < nN; i++) parent[i] = i;
  const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
  for (let e = 0; e < ei.length; e++) { const a = find(ei[e]), b = find(ej[e]); if (a !== b) parent[a] = b; }
  const hasContact = new Uint8Array(nN);
  for (let i = 0; i < nN; i++) if (isSemi[i] && contactOfNode[i] >= 0) hasContact[find(i)] = 1;
  for (let i = 0; i < nN; i++) if (isSemi[i] && !hasContact[find(i)]) throw new Error('a connected semiconductor region touches no contact (floating regions are not supported)');
}

/** Equilibrium contact values for net doping N (cm^-3): [psi (V, without bias), n0, p0 (cm^-3)]. */
export function contactEquilibrium(N, ni, Vt) {
  const h = 0.5 * N;
  const r = Math.sqrt(h * h + ni * ni);
  const n0 = N >= 0 ? h + r : (ni * ni) / (r - h);
  const p0 = N >= 0 ? (ni * ni) / (h + r) : r - h;
  return [Vt * Math.asinh(N / (2 * ni)), n0, p0];
}

/** Rectangle helper for tests and cases. */
export const rectPoly = (x, y) => rectToPolygon(x, y);
