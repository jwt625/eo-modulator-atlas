/** Solver-dispatched optical solve (scalar optics.mjs or vector vector-mode.mjs), DevLog-026 round 2. */
export interface SolvedOptical {
  kind: 'scalar' | 'vector'; model: unknown; mode: unknown; res: unknown; neff: number; ng: number | null;
  window: { x: number[]; y: number[] }; labels: string[]; limitations: string[];
  timing: { opticalModel: unknown; modes: unknown; groupIndex: unknown };
  diagnostics: Record<string, unknown>;
}
export const VECTOR_RESULT_LABELS: string[];
export function scalarModeConverged(result: unknown, modeIndex: number): boolean;
export function solveOptical(section: unknown, materials: Record<string, unknown>, opts: Record<string, unknown>,
  options?: { meshScale?: number; window?: { x: number[]; y: number[] } | null; withGroupIndex?: boolean; warm?: unknown }): SolvedOptical;
export function armOverlap(es: unknown, solved: SolvedOptical, name: string, lambdaUm: number): Record<string, unknown>;
export function solvedFields(solved: SolvedOptical, opts: Record<string, unknown>): import('./run.d.mts').OpticalFields;
export const VECTOR_MAX_DOUBLINGS: number;
export const WINDOW_MARGIN_WARNING: number;
export const DEFAULT_MAX_METAL_POWER_FRACTION: number;
export const WARM_CACHE_MAX_ENTRIES: number;
export const WARM_CACHE_MAX_BYTES: number;
export function lossyModeGuard(p: { neff: number; metalFraction: number; refNeff: number; sppIndices?: number[]; cap?: number; teFraction?: number }): string | null;
export function metalFractions(model: unknown, mode: unknown): { absPower: number; electricEnergy: number; value: number };
export function warmGet(cache: Record<string, unknown> | null | undefined, key: string): unknown;
export function warmSet(cache: Record<string, unknown> | null | undefined, key: string, warm: unknown): void;
export function warmCacheStats(cache: Record<string, unknown> | null | undefined): { entries: number; bytes: number };
