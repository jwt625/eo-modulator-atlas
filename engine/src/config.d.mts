export interface Geometry {
  domain: { x: number[]; y: number[] };
  optical_window: { x: number[]; y: number[] } | null;
  regions: { name: string; material: string; poly: number[][] }[];
  electrodes: { name: string; material: string; weight: number; poly: number[][] }[];
}
export interface ParsedConfig {
  raw: {
    id: string; title?: string; paper_id?: string; validation_status?: string;
    chain?: string[]; targets?: Record<string, unknown>[];
    optics?: { metal_in_window?: 'reject' | 'absent' | 'pec_scalar'; [key: string]: unknown };
    provenance?: Record<string, { class: string; locator?: string; citation?: string; note?: string }>;
    missing?: unknown[]; limitations?: string[];
  };
  geometries: Record<string, Geometry>;
  /** Original YAML document before params/template/library expansion (raw is the expanded one). */
  source?: Record<string, unknown>;
  params?: { values: Record<string, number>; defs: Record<string, { value: number | string; unit: string | null; description: string | null; expression: string | null; overridden: boolean }> };
  substitutions?: { path: string; expression: string; value: number; unitChecked: boolean }[];
  template?: { type: string; arms: 'push_pull' | 'single'; armWindows: { A: { x_um: number[]; y_um: number[] }; B: { x_um: number[]; y_um: number[] } | null }; summary: Record<string, number | null> } | null;
  materialSources?: Record<string, unknown>;
}
export function parseConfig(text: string, options?: { params?: Record<string, number> }): ParsedConfig;
export const STAGES: string[];
export const IMPLEMENTED_STAGES: string[];
/** Per stage: null when its inputs pass the input boundary, else the blocking message. */
export type StageErrors = Record<string, string | null>;
/** Geometry and disclosures only; never use preview as solver input. */
export function inspectConfig(text: string, section?: string, options?: { params?: Record<string, number>; solver?: 'scalar' | 'vector' | null }): { preview: ParsedConfig; solveError: string; stageErrors: StageErrors };
export function stageErrors(config: ParsedConfig, section?: string, options?: { solver?: 'scalar' | 'vector' | null }): StageErrors;
export const GROUP_INDEX_METHODS: string[];
export const METAL_POLICIES_ALL: string[];
export const ELEMENT_ORDERS: number[];
export const DEFAULT_ELEMENT_ORDER: 1 | 2;
export const DEFAULT_P2_MESH_FACTOR: number;
export const DEFAULT_OPTICAL_SOLVER: 'vector' | 'scalar';
export function checkEoSolver(opts: { solver: string; polarization: string }): void;
export const FREE_TEXT_TOP_LEVEL: string[];
export const FREE_TEXT_KEYS: string[];
export function expandConfig(source: Record<string, unknown>, options?: { params?: Record<string, number> }): { raw: Record<string, unknown>; meta: Record<string, unknown> };
export function validateTarget(target: Record<string, unknown>, path: string): void;
export const OPTICAL_SOLVERS: string[];
