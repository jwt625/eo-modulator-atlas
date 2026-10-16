// Results protocol between the solution worker and the UI (DevLog-032). The worker holds the engine solution store
// (engine/src/postproc, DevLog-031 API v1) and maps these requests onto it: the UI addresses base datasets ('es',
// 'opt', 'armA', 'armB', 'eoA', 'eoB') plus a mode index, region-name selections, and cut lines/points by geometry.
// Coordinates in requests are µm; expressions are SI.
import type { DatasetInfo, DerivedKind, ModeRow, VariableInfo } from '../../../../../engine/src/postproc/index.mjs';
export type { DatasetInfo, DerivedKind, ModeRow, VariableInfo };

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
	/** Quality: P2 continuous expressions at the P2 nodes ('fine', default) or at the element vertices ('normal'). */
	resolution?: 'fine' | 'normal';
}

/** Plot values on a display mesh, with min/max (of the selection) and their locations (µm). */
export interface PlotResult {
	values: Float64Array;
	location: 'node' | 'element' | 'corner' | 'sweep';
	mesh: string;
	unit: string;
	min: number;
	max: number;
	minAt: [number, number] | null;
	maxAt: [number, number] | null;
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
