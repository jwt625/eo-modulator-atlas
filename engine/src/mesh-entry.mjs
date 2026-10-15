// Mesh-only entry point for the workbench "Build mesh" action (L-UI request, DevLog-027): the electrostatic mesher of
// one cross-section without a solve. GPL-3.0-or-later.

import { parseConfig, inspectConfig, crossSectionOf } from './config.mjs';
import { CrossSection } from './section.mjs';

/**
 * Electrostatic mesh of a cross-section. Uses the strict solver input when it parses (EO arm windows then refine the
 * mesh exactly as in a run); otherwise falls back to the geometry preview of a draft (inspectConfig), so geometry
 * whose physics does not validate yet can still be meshed. Arrays are typed-array copies (transferable).
 * @param {string} text YAML config
 * @param {{section?:string, meshScale?:number, params?:Record<string, number>}} [options]
 */
export function buildSectionMesh(text, { section = 'geometry', meshScale = 1, params = {} } = {}) {
  if (typeof meshScale !== 'number' || !Number.isFinite(meshScale) || meshScale < 0.5 || meshScale > 4) throw new Error('meshScale must be between 0.5 and 4');
  let config = null;
  let solveError = null;
  try { config = parseConfig(text, { params }); } catch (e) { solveError = e instanceof Error ? e.message : String(e); }
  let sec, geometry;
  if (config) {
    if (!Object.hasOwn(config.geometries, section)) throw new Error(`Unknown cross-section: ${section}`);
    geometry = config.geometries[section];
    sec = crossSectionOf(config, section);
  } else {
    const preview = inspectConfig(text, section, { params }).preview;
    if (!Object.hasOwn(preview.geometries, section)) throw new Error(`Unknown cross-section: ${section}`);
    geometry = preview.geometries[section];
    sec = new CrossSection(geometry, section);
  }
  const t0 = performance.now();
  const mesh = sec.buildMesh({ scale: meshScale });
  return {
    x: Float64Array.from(mesh.x), y: Float64Array.from(mesh.y), tri: Int32Array.from(mesh.tri), triRegion: Int32Array.from(mesh.triRegion),
    nodeElectrode: Int32Array.from(mesh.nodeElectrode),
    regionNames: geometry.regions.map((r) => r.name), regionMaterials: geometry.regions.map((r) => r.material),
    electrodeNames: geometry.electrodes.map((e) => e.name),
    nNodes: mesh.nNodes, nTris: mesh.nTris, rect: { ...mesh.rect },
    fromPreview: !config, solveError, mesh_ms: performance.now() - t0,
  };
}
