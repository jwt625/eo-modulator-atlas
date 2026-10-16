// Results protocol between the solution worker and the UI (DevLog-032). The worker holds the engine solution store
// (engine/src/postproc, DevLog-031 API v1) and maps these requests onto it: the UI addresses base datasets ('es',
// 'opt', 'armA', 'armB', 'eoA', 'eoB', 'semi') plus a mode index (a bias index on 'semi'), region-name selections, and
// cut lines/points by geometry.
// Coordinates in requests are µm; expressions are SI.
import type { DatasetInfo as EngineDatasetInfo, DerivedKind, ModeRow, ResolutionName, Smoothing, VariableInfo } from '../../../../../engine/src/postproc/index.mjs';
export type { DerivedKind, ModeRow, ResolutionName, Smoothing, VariableInfo };

/**
 * Engine dataset info plus the S8 `semi` kind (store datasets `semi` = reference bias and `semi:<k>` = bias point k,
 * DevLog-039; not yet in index.d.mts). The UI addresses `semi` with a bias index in place of a mode (DevLog-042):
 * `nBias` bias points, `biasV` the contact biases of the reference.
 */
export type DatasetInfo = Omit<EngineDatasetInfo, 'kind'> & { kind: EngineDatasetInfo['kind'] | 'semi'; biasV?: number[]; nBias?: number };

export interface LineSpec {
	ax: number;
	ay: number;
	bx: number;
	by: number;
	n: number;
}

export interface PlotRequest {
	dataset: string;
	expr: string;
	/** Display unit; empty = SI unit of the expression. */
	unit?: string;
	mode?: number;
	/** Region names (filter and min/max); null = all domains. */
	selection?: string[] | null;
	/** Quality (DevLog-034): resolution level of the element-local sampling (default 'normal') and smoothing (default 'material'). */
	resolution?: ResolutionName;
	smoothing?: Smoothing;
}

/** Plot values with min/max (of the selection) and their locations (µm). */
export interface PlotResult {
	/** refined: one value per element-local lattice point of level `r` of the parent mesh `mesh`, element-major; sweep: per frequency. */
	values: Float64Array;
	location: 'refined' | 'sweep';
	mesh: string;
	/** refined: level drawn, level asked (lowered when the 2.5M sub-triangle cap applies), smoothing applied. */
	r?: number;
	requestedR?: number;
	smoothing?: Smoothing;
	unit: string;
	min: number;
	max: number;
	minAt: [number, number] | null;
	maxAt: [number, number] | null;
	/** refined: exact point value (engine point evaluation, as the probe) at minAt / maxAt. */
	minAtValue?: number;
	maxAtValue?: number;
	/** Engine evaluation time (ms). */
	ms?: number;
	/** rf dataset: frequencies (GHz) of the values. */
	x?: Float64Array;
}

export interface DerivedRequest {
	kind: DerivedKind;
	dataset: string;
	expr: string;
	unit?: string;
	mode?: number;
	/** surface_*: region names (null = all); line_*: line; point: [x, y] µm. */
	selection?: string[] | LineSpec | [number, number] | null;
}

export interface DerivedResult {
	value: number;
	unit: string;
	at?: [number, number] | null;
	/** Integrated area (m^2) or line length (m), NaN points excluded. */
	measure?: { value: number; unit: string };
	nSkipped?: number;
	/** line kinds: engine quadrature ('gauss3_per_element_crossing'). */
	quadrature?: string;
}

export interface LineResult {
	s: Float64Array;
	values: Float64Array[];
	units: string[];
}

export interface CheckResult {
	unit: string;
	/** SI dimension exponents (m, kg, s, A) of the expression. */
	dim: number[];
	continuous: boolean;
	global: boolean;
}

/** Solution addressed by a request: the last Compute ('main', default) or a sweep point ('sweep:<index>'). */
export type SolutionId = string;

/** Main thread -> solution worker. */
export type PostRequest = (
	| { op: 'datasets' }
	| { op: 'variables'; dataset: string; mode?: number }
	| { op: 'plot'; req: PlotRequest }
	| { op: 'derived'; req: DerivedRequest }
	| { op: 'line'; dataset: string; mode?: number; exprs: string[]; units: string[]; line: LineSpec }
	| { op: 'modes'; dataset: string }
	| { op: 'check'; dataset: string; mode?: number; expr: string; unit?: string }
	/** Fields of a sweep point on demand: `job` is the point's sweep job message (config study point or path run). */
	| { op: 'loadPoint'; job: import('../types').WorkerIn }
	| { op: 'clearPoints' }
) & { sol?: SolutionId };

/** Reply of loadPoint. */
export interface PointSolution {
	sol: SolutionId;
	datasets: DatasetInfo[];
	meshes: Record<string, import('../types').FieldMesh>;
	reused: boolean;
}
