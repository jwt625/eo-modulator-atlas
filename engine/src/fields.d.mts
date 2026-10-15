export function hashString(s: string): string;
export function geometryHash(section: unknown, materials: Record<string, unknown>, meshScale: number): { mesh: string; solution: string };
export function fieldTransferables(fields: unknown): ArrayBuffer[];
export function pockelsDeltaN(es: unknown, model: unknown, lambdaUm: number): import('./run.d.mts').PockelsField;
