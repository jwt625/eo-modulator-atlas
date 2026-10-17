import type { StageContext } from './config.mjs';
export const SEMICONDUCTOR: 'semiconductor';
export const SEMICONDUCTOR_COMPANIONS: Readonly<Record<string, string>>;
export const SEMICONDUCTOR_CONFLICTS: Readonly<Record<string, string>>;
export const STAGE_PRIORITY: readonly string[];
export const SEMICONDUCTOR_SECTION_REASON: string;
export interface StageState {
  selected: boolean;
  /** Runs in Compute: selected or implied (dependency). */
  runs: boolean;
  /** Stage that adds this one as a dependency ('always' for electrostatics on the cross-section path), else null. */
  impliedBy: string | null;
  /** Why the stage cannot be selected now (readiness on its run path or a conflict); for a selected stage, why it cannot run. */
  blocked: string | null;
  conflictsWith: string[];
  /** What the stage is on the current path (e.g. the semiconductor stage's own mode). */
  note: string | null;
}
export interface StageCompatibility {
  /** mode_only: section with doped silicon of the semiconductor block, without the semiconductor stage (F4b). */
  path: 'cross_section' | 'semiconductor' | 'mode_only';
  run: string[];
  invalid: { stage: string; reason: string }[];
  stages: Record<string, StageState>;
}
export function stageCompatibility(selected: readonly string[], context?: Partial<StageContext> | null): StageCompatibility;
export function sanitizeStages(candidates: readonly string[], context?: Partial<StageContext> | null): { kept: string[]; dropped: { stage: string; reason: string }[] };
export function checkStageSelection(stages: readonly string[] | null, raw: Record<string, unknown> | null, options?: { semiSection?: boolean }): StageCompatibility;
