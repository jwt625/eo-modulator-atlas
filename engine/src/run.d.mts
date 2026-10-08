export interface TargetResult {
  metric: string; value: number; at_ghz?: number; vpi_convention?: string; actual: number | null;
  tolerance: number; status: 'pass' | 'fail' | 'not_evaluated'; reason: string | null;
  /** Evaluated but numerically flagged (Wheeler step-check spread above 1e-2); null otherwise. */
  diagnostic: string | null;
  source?: Record<string, unknown>;
}
export interface SimulationResult {
  id: string; section: string; scope: string; stages: string[]; pendingStages: string[];
  metrics: Record<string, number>; targets: TargetResult[]; warnings: string[];
  targetSummary: { total: number; evaluated: number; passed: number; failed: number; flagged: number };
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
  eo: EoResult | null;
  rf: RfResult | null;
}
export interface EoArm {
  window: { x_um: number[]; y_um: number[] }; neff: number; dnEffPerV: number; phasePerVPerM: number;
  form: string; modeIndex: number; converged: boolean | null; iterations: number; nNodes: number; nTris: number;
  boundaryMarginFraction: { marginUm: number; value: number } | null;
  metal: Record<string, unknown> | null;
  byRegion: Record<string, { powerFraction: number; dnEffPerV: number }> | null;
}
export interface EoResult {
  status: string; drive: 'single_arm' | 'two_arm_field_resolved'; terminalDrive: 'single_ended' | 'differential';
  arms: { A: EoArm; B: EoArm | null };
  dnEffPerVDifference: number; phaseDifferencePerVPerM: number; armGainVsArmA: number | null; pushPullBalance: number | null;
  pushPullBalanceTolerance: number; pushPullBalanceDeviates: boolean;
  vpiLVcm: number; vpiDcV: number | null; lengthMm: number | null; compatibleVpiConventions: string[];
  converged: { A: boolean | null; B: boolean | null; all: boolean | null };
  labels: string[]; limitations: string[]; assumptions: string[]; convention: string;
}
export interface RfPoint {
  fGhz: number; alphaDbPerCm: number; alphaNpPerM: number; nRf: number; z0ReOhm: number; z0ImOhm: number;
  rOhmPerM: number; gSPerM: number; warnings: string[];
}
export interface RfResult {
  lossSource: 'model' | 'paper_input'; independentPrediction: boolean;
  conductorModel: string; dielectricModel: string | null; lossLabels: string[];
  sigmaSm: number | null; thicknessUm: number | null; kPerM: number | null;
  wheeler: { fRefGhz: number; halfSkinDepthUm: number; rPrimeOhmPerM: number; scales: number[]; rPrimeByScaleOhmPerM: number[]; maxRelativeSpread: number; spreadWarningLevel: number } | null;
  perimetersM: { signal: number; ground: number } | null;
  regions: { name: string; material: string; energyFraction: number; loss: number | { sigmaSm: number; epsR: number } | null }[];
  paper: { source: string; citation: string } | null;
  lPulNhPerM: number; cPulPfPerM: number;
  sweep: { fGhz: number[]; alphaDbPerCm: number[]; nRf: number[]; z0ReOhm: number[]; z0ImOhm: number[] } | null;
  atTargets: RfPoint[];
}
export function resolveStages(options?: { stages?: string[] | null; optical?: boolean }): string[];
export function runCrossSection(text: string, options?: {
  section?: string; stages?: string[] | null; optical?: boolean; meshScale?: number; onProgress?: (message: string) => void;
}): SimulationResult;
