// Types of the postprocessing engine (DevLog-031 API v1). Coordinates passed in and returned are um; expression
// values are SI (x, y are metres inside expressions).
import type { SimulationResult } from '../run.d.mts';

export type Dim = [number, number, number, number]; // exponents of m, kg, s, A
export type MeshId = string; // 'es' | 'opt' | 'armA' | 'armB'
export type PlotLocation = 'auto' | 'node' | 'element' | 'corner' | 'quad' | 'p2nodes';
export type Part = 'real' | 'imag' | 'abs';
export type DerivedKind = 'global' | 'surface_int' | 'surface_avg' | 'surface_max' | 'surface_min' | 'line_int' | 'line_avg' | 'point';
export type XY = [number, number];

export interface DatasetInfo {
  id: string;
  kind: 'es' | 'opt' | 'arm' | 'eo' | 'cutline' | 'cutpoint' | 'sweep' | 'rf';
  label: string; section: string; mesh: MeshId | null;
  mode?: number; selected?: boolean; arm?: 'A' | 'B'; point?: number; parent?: string; nModes?: number;
  points?: XY[]; n?: number;
  /** optical datasets (round 3): solved-mode identity, label 'k=1 (TE0)' */
  modeLabel?: string; family?: 'TE' | 'TM'; familyIndex?: number;
  /** round 2: an arm solved on the optical window shares the opt model (same mesh and modes) */
  aliasOf?: string;
}
export interface VariableInfo {
  name: string; unit: string; displayUnit: string; dim: Dim; description: string;
  location: 'node' | 'element' | 'point' | 'global'; complex: boolean; continuous: boolean; group: string;
}
export interface StoreMesh {
  id: MeshId; x: Float64Array; y: Float64Array; tri: Int32Array; triRegion: Int32Array;
  regionNames: string[]; regionMaterials: string[]; nNodes: number; nTris: number;
}
export interface SolutionStore {
  id: string;
  datasets(): DatasetInfo[];
  variables(datasetId: string): VariableInfo[];
  /** Shared arrays: copy before transferring. */
  mesh(meshId: MeshId): StoreMesh;
  addCutLine(spec: { points: XY[]; parent?: string; n?: number; label?: string }): DatasetInfo;
  addCutPoints(spec: { points: XY[]; parent?: string; label?: string }): DatasetInfo;
  removeDataset(id: string): void;
  memory(): { cacheBytes: number; cacheEntries: number; storeBytes: number };
  dispose(): void;
}
export function createSolutionStore(result: SimulationResult, options?: { cacheBytes?: number }): SolutionStore;
export const DEFAULT_CACHE_BYTES: number;

export interface PlotRequest { dataset: string; expr: string; unit?: string; location?: PlotLocation; part?: Part }
export interface PlotResult {
  /** Fresh array (transferable). Layout: node -> nNodes; element -> nTris; corner -> 3 nTris; quad -> 6 nTris; line/point -> samples. */
  values: Float64Array;
  location: 'node' | 'element' | 'corner' | 'quad' | 'line' | 'point' | 'p2nodes' | 'sweep';
  mesh: MeshId | null; n: number; unit: string; siUnit: string; dim: Dim; min: number; max: number; nNaN: number;
  complex: boolean; part: Part; ms: number;
  /** cut lines: arc length (um) and coordinates (um); cut points: coordinates */
  s?: Float64Array; x?: Float64Array; y?: Float64Array;
  /** p2nodes: 6 DOF indices per triangle (vertices, then midpoints m01 m12 m20); x, y are the DOF coordinates */
  elem?: Int32Array;
  /** rf dataset: sweep frequencies (GHz) */
  fGhz?: Float64Array;
}
export function evaluatePlot(store: SolutionStore, req: PlotRequest): PlotResult;

export type Selection = { regions: (string | number)[] } | (string | number)[] | { polyline: XY[] } | { point: XY } | { points: XY[] };
export interface DerivedRequest { kind: DerivedKind; dataset: string; expr: string; selection?: Selection; unit?: string; part?: Part;
  /** rejected for line kinds (X11); never used */
  resolution?: never; n?: never }
export interface DerivedResult {
  kind: DerivedKind; dataset: string; expr: string; value: number; valueIm?: number;
  values?: number[]; valuesIm?: number[]; points?: XY[];
  unit: string; siUnit: string; dim: Dim;
  /** surface_max / surface_min location (um) */
  at?: XY | null;
  /** surface_max / surface_min: element of the extremum */
  element?: number;
  /** integrated measure: area (m^2) or covered line length (m), NaN points excluded */
  measure?: { value: number; unit: 'm^2' | 'm' };
  regions?: string[]; length?: number; nSkipped?: number; nPoints?: number;
  /** line kinds: 'gauss3_per_element_crossing' (a resolution in the request is rejected) */
  quadrature?: string; ms: number;
}
export function evaluateDerived(store: SolutionStore, req: DerivedRequest): DerivedResult;

export interface ModeRow {
  k: number; family: 'TE' | 'TM'; familyIndex: number; label: string; neff: number; ng: number | null; lossDbPerCm: number | null; teFraction: number | null; aeffUm2: number | null;
  confinement: Record<string, number>; selected: boolean; residual: number | null; solver: 'vector' | 'scalar';
}
export function modeTable(store: SolutionStore, datasetId: string): ModeRow[];
/** Values at arbitrary points (um) of a dataset (round 2). */
export function evaluateAtPoints(store: SolutionStore, req: { dataset: string; expr: string; points?: XY[]; x?: ArrayLike<number>; y?: ArrayLike<number>; unit?: string; part?: Part }): {
  values: Float64Array; n: number; unit: string; siUnit: string; dim: Dim; min: number; max: number; nNaN: number; complex: boolean; part: Part; ms: number;
};
/** Names resolved as constants in every scope: pi, eps0, mu0, c_const, i, j, lambda0, k0, f0. */
export const CONSTANT_NAMES: readonly string[];
/** Smallest barycentric coordinate below which a point is treated as on an element edge (engine tie-break applies). */
export const TIE_BARYCENTRIC: number;

export const GLOBAL_VARIABLES: readonly VariableInfo[];
export function runGlobals(result: SimulationResult | Record<string, unknown>, options?: { lambdaUm?: number | null }): Record<string, number>;
export function evaluateGlobals(expr: string, list: (Record<string, number> | null)[], options?: { unit?: string }): { values: number[]; valuesIm?: number[]; unit: string; siUnit: string; dim: Dim };

export interface SweepStore {
  addPoint(point: { index: number; values: Record<string, number>; globals?: Record<string, number> | null; error?: string | null; internals?: unknown }): void;
  store(index: number): SolutionStore | null;
  point(index: number): { index: number; values: Record<string, number>; globals: Record<string, number> | null; error: string | null } | null;
  context: string | null;
  points(): { index: number; values: Record<string, number>; globals: Record<string, number> | null; error: string | null }[];
  datasets(): DatasetInfo[];
  rows(expr: string, options?: { unit?: string }): { rows: { index: number; values: Record<string, number>; value: number }[]; unit: string; siUnit: string; dim: Dim };
  memory(): { points: number; stores: number; bytes: number };
  clear(): void;
}
export function createSweepStore(options?: { maxStores?: number; maxBytes?: number; cacheBytes?: number }): SweepStore;
/** Store of one sweep point: retained or recomputed with keep (round 2). A different text/options clears the sweep store. */
export function storeForSweepPoint(text: string, index: number, options: { sweepStore: SweepStore; study?: string | null; params?: Record<string, number>;
  stages?: string[] | null; section?: string | null; meshScale?: number; solver?: 'scalar' | 'vector' | null; numModes?: number | null;
  cache?: Record<string, unknown>; onProgress?: (message: string) => void }): { store: SolutionStore; point: unknown; reused: boolean };

export class ExpressionError extends Error { pos: number | null }
export class UnitError extends Error {}
export const EXPRESSION_FUNCTIONS: readonly string[];
export function parseExpression(src: string): unknown;
export function referencedNames(ast: unknown): string[];
export function compileExpression(src: string, scope: { resolve(name: string): unknown; describe?(name: string): string }): {
  src: string; dim: Dim; unit: string; complex: boolean; global: boolean; continuous: boolean; constant: { re: number; im: number } | null;
};
export function parseUnit(unit: string): { dim: Dim; factor: number };
export function formatUnit(dim: Dim | number[]): string;
export function displayConversion(dim: Dim | number[], unit?: string | null): { factor: number; unit: string };
export const EO_FORMULAS: Readonly<Record<string, string>>;
export const POCKELS_COMPONENTS: readonly ['r33', 'r13', 'r22', 'r51', 'other'];
export function armElectrodeGap(section: unknown, window: { x: number[]; y: number[] }, potentials: number[]): { gapUm: number | null; left: string | null; right: string | null; vGap: number | null; reason: string | null };
