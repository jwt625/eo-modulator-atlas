export interface TargetResult {
  metric: string; value: number; at_ghz?: number; vpi_convention?: string; actual: number | null;
  tolerance: number; status: 'pass' | 'fail' | 'not_evaluated'; reason: string | null;
  /** Evaluated but numerically flagged (Wheeler step-check spread above 1e-2); null otherwise. */
  diagnostic: string | null;
  /** Measured kHz-MHz Vpi targets with source.drive_frequency_hz < 10 MHz: clamped value and an r33-scaled unclamped estimate. */
  lowFrequencyRange?: { driveFrequencyHz: number; clampedValue: number; unclampedEstimate: number; r33UsedPmPerV: number; r33Unclamped: { key: string; r33: number }[]; method: string; affectsStatus: false };
  source?: Record<string, unknown>;
}
export interface SimulationResult {
  id: string; section: string; scope: string; stages: string[]; pendingStages: string[];
  metrics: Record<string, number>; targets: TargetResult[]; warnings: string[];
  targetSummary: { total: number; evaluated: number; passed: number; failed: number; flagged: number };
  meshScale: number; elapsed_ms: number;
  electrostatics: { nNodes: number; nTris: number; energyChargeRelativeError: number } | null;
  optical: OpticalDiagnostics | null;
  eo: EoResult | null;
  rf: RfResult | null;
  /** Resolved `params` values (DevLog-026). */
  params: Record<string, number>;
  /** Library-backed materials: which fields came from engine/data/materials.json and their citations. */
  materialSources: Record<string, MaterialSource>;
  /** Content hash of the mesh inputs (geometry, refinement windows, hints, mesh scale). */
  geometryHash: string;
  /** geometryHash plus electrode potentials, boundaries and RF permittivities. */
  materialHash: string;
  reused: { mesh: boolean; electrostatics: boolean };
  /** Solver timing objects (DevLog-024 contract) passed through; null where a stage did not run or reused a result. */
  timing: {
    electrostatics: Record<string, unknown> | null; opticalModel: Record<string, unknown> | null;
    modes: Record<string, unknown> | null; groupIndex: Record<string, unknown> | null;
    eo: Record<string, unknown> | null; rf: { wheelerSolves: Record<string, unknown>[] } | null; total_ms: number;
  };
  /** Present only with options.fields: true (DevLog-023 O4). */
  fields?: SimulationFields;
  /** Optical solver used (null when no optical stage ran). */
  opticalSolver: 'scalar' | 'vector' | null;
  /** Electrostatic element order used (null for modeOnly runs). */
  elementOrder: 1 | 2 | null;
  /** Electrostatic mesh scale actually used (meshScale x p2MeshFactor for P2). */
  electrostaticMeshScale: number | null;
  p2MeshFactor: number | null;
  /** true for an optical-only run (no electrostatics). */
  modeOnly: boolean;
  /** Non-enumerable; present only with options.keep (solver internals for postproc/createSolutionStore). */
  readonly internals?: unknown;
}
export interface MaterialSource {
  library: string; provenanceClass: 'standard_reference'; fromLibrary: string[];
  /** value of every field taken from the library (dotted sub-keys for eps_r / r_pm_per_v merges), e.g. {'r_pm_per_v.r13': 8.6} */
  addedFromLibrary: Record<string, unknown>; overridden: string[];
  citations: Record<string, { source: string; locator: string; condition: string; verification: 'primary' | 'secondary_open_access'; primaryCited: string | null }>;
}
export interface EsFields {
  x: Float64Array; y: Float64Array; tri: Int32Array; triRegion: Int32Array; regionNames: string[]; regionMaterials: string[];
  electrodeNames: string[]; nodeElectrode: Int32Array;
  /** Nodal potential, V per volt of terminal voltage. */
  phi: Float64Array;
  /** Per-triangle field, V/m per volt of terminal voltage. */
  ex: Float64Array; ey: Float64Array;
  units: Record<string, string>; rect: { x0: number; x1: number; y0: number; y1: number };
  elementOrder: 1 | 2;
  /** P2 only: all DOF values (vertices first, then edge midpoints) and 6 DOF indices per triangle. */
  p2?: { phiDof: Float64Array; elem: Int32Array };
}
/** Metal handling record of an optical model (scalar: reject | absent | pec_scalar; vector: reject | absent | pec | lossy). */
export interface OpticalMetal {
  policy: 'reject' | 'absent' | 'pec_scalar' | 'pec' | 'lossy'; inMesh: string[];
  omittedFromModel: string[]; labels: string[];
  /** scalar only */
  excludedTriangles?: number;
  pecFaces?: { horizontalUm: number; verticalUm: number; obliqueUm: number; validFaceFraction: number } | null;
}
/** result.optical: shared fields plus solver-specific ones (DevLog-026 round 2/3). */
export interface OpticalDiagnostics {
  solver: 'scalar' | 'vector';
  nNodes: number; nTris: number; modeIndex: number; converged: boolean; labels: string[]; limitations: string[];
  /** The solved mode in the mode-table index space (round 3, X3); modeIndex is the config mode_index within the family. */
  mode: ModeIdentity;
  metal: OpticalMetal | null;
  /** perturbation | finite_difference_wavelength | fixed; null when no group index was computed */
  groupIndexMethod: 'perturbation' | 'finite_difference_wavelength' | 'fixed' | null;
  /** Eigen residual of the selected mode (scalar: ||A x - theta B x|| / (|theta| ||B x||); vector: pencil residual). */
  residual?: number | null;
  // scalar only
  iterations?: number; form?: 'E' | 'H';
  boundaryMarginFraction?: { marginUm: number; value: number };
  // vector only
  order?: 1 | 2; nDof?: number; polarizationFamily?: 'TE' | 'TM'; teFraction?: number; effectiveAreaUm2?: number | null;
  solverWarnings?: string[]; nModesComputed?: number; lossDbPerCm?: number;
  /** vector: power fraction within the window-edge margin of the selected mode, and the margin width (um) */
  windowMarginPowerFraction?: number | null; windowMarginUm?: number | null;
  modeSelect?: { by: 'te_fraction' | 'confinement'; region?: string };
  /** lossy metal only */
  lossy?: { metalPowerFraction: number; metalAbsentReferenceNeff: number; sppIndices: { metal: string; eps_d: number; nSpp: number }[] };
}
/** Pockels index change per optical-mesh triangle, per volt of terminal voltage (round 3). */
export interface PockelsField {
  /** dn of the lab x, y, z principal axes, 1/V: d eps_ii / (2 n_ii), d eps = -eps d(1/eps) eps (positive r E lowers n). */
  dnXX: Float64Array; dnYY: Float64Array; dnZZ: Float64Array;
  /** In-plane shear d eps_xy, relative permittivity per volt. */
  dEpsXY: Float64Array;
  location: 'triangle_centroid'; lambdaUm: number; units: Record<string, string>; sign: string;
}
/** Field components: scalar `psi`; vector `ex, ey, ez, hx, hy, hz` (+ `ezNode`; lossy adds `*Im`). */
export type ModeComponents = { psi?: Float64Array; ex?: Float64Array; ey?: Float64Array; ez?: Float64Array;
  hx?: Float64Array; hy?: Float64Array; hz?: Float64Array; ezNode?: Float64Array } & Record<string, Float64Array | undefined>;
export interface OpticalFields {
  x: Float64Array; y: Float64Array; tri: Int32Array; triRegion: Int32Array; regionNames: string[]; regionMaterials: string[];
  window: { x: number[]; y: number[] }; solver: 'scalar' | 'vector'; polarization: 'TE' | 'TM'; form: 'E' | 'H' | 'vector'; lambdaUm: number;
  /** vector only */
  order?: 1 | 2; location?: string; convention?: unknown; selectedMode?: number;
  /** Scalar solver: psi (E_x for form E, H_x for form H), max |psi| = 1. Vector solver: ex, ey, ez, hx, hy, hz per triangle centroid (ez, hz imaginary parts). */
  modes: { n_eff: number; te_fraction?: number; components: ModeComponents }[];
  units: Record<string, string>;
  /** Pockels delta-n of the static field on this optical mesh (present whenever fields are exported). */
  pockels: PockelsField;
}
export interface SimulationFields {
  es: EsFields; optical: OpticalFields | null; arms: { A: OpticalFields; B: OpticalFields | null } | null;
}
/** Mode identity (round 3): raw index k in the solved list (n_eff descending), family, index within the family, label 'k=1 (TE0)'. */
export interface ModeIdentity { k: number; family: 'TE' | 'TM'; familyIndex: number; label: string; selected: boolean }
export interface EoArm {
  /** the arm's solved mode (same index space as the mode table) */
  mode: ModeIdentity;
  window: { x_um: number[]; y_um: number[] }; neff: number; dnEffPerV: number; phasePerVPerM: number;
  form: string; modeIndex: number; converged: boolean | null; iterations: number; nNodes: number; nTris: number;
  boundaryMarginFraction: { marginUm: number; value: number } | null;
  metal: Record<string, unknown> | null;
  byRegion: Record<string, { powerFraction: number | null; dnEffPerV: number }> | null;
  solver: 'scalar' | 'vector';
  /** vector only */
  order?: 1 | 2; nDof?: number; teFraction?: number; residual?: number;
  /** DevLog-031: integrand split (same quadrature as the overlap; sums to dnEffPerV). */
  breakdown: EoBreakdown;
  /** DevLog-031: conventional overlap of this arm (formulas in EoResult.formulas). */
  conventional: EoArmConventional;
}
export interface EoBreakdown {
  dnEffPerV: number; byComponent: Record<'r33' | 'r13' | 'r22' | 'r51' | 'other', number>; componentSum: number;
  byTensorTerm: Record<'xx' | 'yy' | 'zz' | 'xy', number>; relativeDifferenceVsEngine: number | null;
  byRegion: Record<string, Record<'all' | 'r33' | 'r13' | 'r22' | 'r51' | 'other', number>>; method: string;
  /** wall time of the breakdown and conventional overlap of this arm */
  ms: number;
}
export interface EoArmConventional {
  gapUm: number | null; gapElectrodes: { left: string | null; right: string | null } | null; gapVoltagePerVt: number | null; gapReason: string | null;
  /** electrodes spanning the arm centre but outside the window height, ignored for g */
  gapIgnoredElectrodes: string[];
  /** V/m per terminal volt */
  ebarVPerMPerV: number | null; ebarExVPerMPerV: number | null;
  gamma: number | null; gammaEx: number | null; gammaByRegion: Record<string, number> | null; gammaEquiv: number | null;
  eoRegion: string | null; eoMaterial: string | null; ne: number | null; r33PmPerV: number | null; cAxisLab: number[] | null; neff: number;
  vpiLVcmTextbook: number | null; vpiLVcmNeffFactor: number | null; reason: string | null;
}
export interface EoResult {
  status: string; drive: 'single_arm' | 'two_arm_field_resolved'; terminalDrive: 'single_ended' | 'differential';
  arms: { A: EoArm; B: EoArm | null };
  /** optical solver of the arm modes */
  solver: 'scalar' | 'vector';
  dnEffPerVDifference: number; phaseDifferencePerVPerM: number; armGainVsArmA: number | null; pushPullBalance: number | null;
  pushPullBalanceTolerance: number; pushPullBalanceDeviates: boolean;
  vpiLVcm: number; vpiDcV: number | null; lengthMm: number | null; compatibleVpiConventions: string[];
  converged: { A: boolean | null; B: boolean | null; all: boolean | null };
  labels: string[]; limitations: string[]; assumptions: string[]; convention: string;
  /** DevLog-031: implied textbook VpiL (push-pull or single arm) next to the engine value. */
  conventional: { vpiLVcmTextbook: number | null; vpiLVcmTextbookEx: number | null; vpiLVcmNeffFactor: number | null; engineVpiLVcm: number; engineOverTextbook: number | null; materialNote: string | null };
  /** Formula strings of the engine overlap, integrand, splits, gap, Gamma and textbook VpiL. */
  formulas: Record<string, string>;
  /** Default-mesh accuracy of the EO outputs vs the independent references (audit E13). */
  accuracyNote: string;
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
export interface RunOptions {
  section?: string; stages?: string[] | null; optical?: boolean; meshScale?: number; onProgress?: (message: string) => void;
  /** Overrides of `params` values. */
  params?: Record<string, number>;
  /** Add typed-array field export (`result.fields`). */
  fields?: boolean;
  /** Override optics.solver (DevLog-026 round 2). */
  solver?: 'scalar' | 'vector' | null;
  /** Override mesh.element_order of the electrostatics (1 = P1, 2 = P2). */
  elementOrder?: 1 | 2 | null;
  /** Override mesh.p2_mesh_factor (electrostatic mesh-scale factor for P2; default 2). */
  p2MeshFactor?: number | null;
  /** optical_mode only, no electrostatics. */
  modeOnly?: boolean;
  /** Caller-owned reuse cache (sweeps). */
  cache?: Record<string, unknown>;
  /** Attach solver internals as the non-enumerable `result.internals` for createSolutionStore (DevLog-031). */
  keep?: boolean;
  /** Compute at least this many optical modes per solve (overrides optics.num_modes, 1..24; DevLog-031). */
  numModes?: number | null;
}
export function runCrossSection(text: string, options?: RunOptions): SimulationResult;
export function runConfig(config: import('./config.d.mts').ParsedConfig, options?: RunOptions & { targets?: Record<string, unknown>[] }): SimulationResult;
