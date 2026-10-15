export interface SectionMesh {
  x: Float64Array; y: Float64Array; tri: Int32Array; triRegion: Int32Array; nodeElectrode: Int32Array;
  regionNames: string[]; regionMaterials: string[]; electrodeNames: string[];
  nNodes: number; nTris: number; rect: { x0: number; x1: number; y0: number; y1: number };
  /** true when the strict input did not parse and the draft preview geometry was meshed. */
  fromPreview: boolean; solveError: string | null; mesh_ms: number;
}
export function buildSectionMesh(text: string, options?: { section?: string; meshScale?: number; params?: Record<string, number> }): SectionMesh;
