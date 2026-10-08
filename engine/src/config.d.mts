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
}
export function parseConfig(text: string): ParsedConfig;
export const STAGES: string[];
export const IMPLEMENTED_STAGES: string[];
/** Per stage: null when its inputs pass the input boundary, else the blocking message. */
export type StageErrors = Record<string, string | null>;
/** Geometry and disclosures only; never use preview as solver input. */
export function inspectConfig(text: string, section?: string): { preview: ParsedConfig; solveError: string; stageErrors: StageErrors };
