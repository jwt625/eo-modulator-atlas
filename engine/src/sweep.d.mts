import type { TargetResult } from './run.d.mts';
export const MAX_STUDY_POINTS: number;
export interface SweepAxis { param: string; values: number[] }
export interface SweepTarget { at: Record<string, number>; metric: string; value: number; tol_abs?: number; tol_rel?: number; vpi_convention?: string; source?: Record<string, unknown> }
export interface SweepEnumeration {
  study: string; axes: SweepAxis[]; nPoints: number; stages: string[] | null; outputs: string[] | null; section: string | null;
  points: { index: number; values: Record<string, number> }[]; sweepTargets: SweepTarget[];
}
export interface SweepPoint {
  index: number; values: Record<string, number>; params?: Record<string, number>;
  metrics: Record<string, number> | null; outputs: Record<string, number | null> | null;
  targets: TargetResult[]; targetSummary: { total: number; evaluated: number; passed: number; failed: number; flagged: number } | null;
  warnings: string[]; timing: Record<string, unknown> | null; geometryHash: string | null; materialHash: string | null;
  reused: { mesh: boolean; electrostatics: boolean } | null;
  eo?: { pushPullBalance: number | null; armNeff: { A: number; B: number | null } } | null;
  elapsed_ms: number; error: string | null; fields?: import('./run.d.mts').SimulationFields;
  /** SI values of the run globals (postproc GLOBAL_VARIABLES; DevLog-031); null for a failed point. */
  globals: Record<string, number> | null;
  /** Non-enumerable; with options.keep (createSweepStore().addPoint retains a store). */
  readonly internals?: unknown;
}
export interface SweepOptions {
  study?: string | null; params?: Record<string, number>; stages?: string[] | null; section?: string | null; meshScale?: number;
  fields?: boolean; cache?: Record<string, unknown>; onProgress?: (message: string) => void;
  solver?: 'scalar' | 'vector' | null;
  /** Keep solver internals on each point (non-enumerable `internals`; DevLog-031). */
  keep?: boolean;
  /** Compute at least this many optical modes per solve. */
  numModes?: number | null;
}
export function enumerateSweep(text: string, options?: { study?: string | null; params?: Record<string, number> }): SweepEnumeration;
export function runSweepPoint(text: string, index: number, options?: SweepOptions): SweepPoint;
export function runSweep(text: string, options?: SweepOptions & { signal?: AbortSignal; stopOnError?: boolean },
  onPoint?: (point: SweepPoint, done: number, total: number) => void): Promise<{
  study: string; axes: SweepAxis[]; nPoints: number; completed: number; cancelled: boolean; points: SweepPoint[];
  targetSummary: { total: number; evaluated: number; passed: number; failed: number }; errors: number; elapsed_ms: number;
}>;
export function studiesOf(raw: Record<string, unknown>): Record<string, unknown>;
