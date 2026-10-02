export interface TargetResult {
  metric: string; value: number; at_ghz?: number; actual: number | null;
  tolerance: number; status: 'pass' | 'fail' | 'not_evaluated'; reason: string | null;
  source?: Record<string, unknown>;
}
export interface SimulationResult {
  id: string; section: string; scope: string; stages: string[]; pendingStages: string[];
  metrics: Record<string, number>; targets: TargetResult[]; warnings: string[];
  targetSummary: { total: number; evaluated: number; passed: number; failed: number };
  meshScale: number; elapsed_ms: number;
  electrostatics: { nNodes: number; nTris: number; energyChargeRelativeError: number };
  optical: {
    nNodes: number; nTris: number; iterations: number; form: string;
    modeIndex: number; converged: boolean; labels: string[]; limitations: string[];
    metal: {
      policy: 'reject' | 'absent' | 'pec_scalar'; inMesh: string[];
      omittedFromModel: string[]; labels: string[]; excludedTriangles: number;
      pecFaces: { horizontalUm: number; verticalUm: number; obliqueUm: number; validFaceFraction: number } | null;
    } | null;
    boundaryMarginFraction: { marginUm: number; value: number };
  } | null;
}
export function runCrossSection(text: string, options?: {
  section?: string; optical?: boolean; meshScale?: number; onProgress?: (message: string) => void;
}): SimulationResult;
