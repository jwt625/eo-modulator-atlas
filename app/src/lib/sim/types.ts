// Field-export contract (DevLog-023 O4). Typed arrays only, so they can be transferred from the worker. The UI types
// are structural subsets of the engine's run.d.mts types (EsFields, OpticalFields, SimulationFields), so engine
// results assign without casts; synthetic/test meshes only need these members.
import type { PockelsField } from '../../../../engine/src/run.mjs';
export type { PockelsField };

export interface FieldMesh {
	x: Float64Array;
	y: Float64Array;
	tri: Int32Array;
	triRegion: Int32Array;
	regionNames: string[];
	/** Material name per region index (UI extension; derived from the geometry when absent). */
	regionMaterials?: string[];
	/** Triangle bin index built off the main thread (P2 display, W13). */
	index?: import('./fieldmath').TriIndex;
}

export interface EsFields extends FieldMesh {
	/** 1 (P1) or 2 (P2); P2 adds `p2` (all DOFs, vertices first, and 6 DOF indices per triangle). */
	elementOrder?: 1 | 2;
	p2?: { phiDof: Float64Array; elem: Int32Array };
	/** Potential per node, V per volt of terminal voltage. */
	phi: Float64Array;
	/** E per triangle, V/m per volt of terminal voltage (engine units; the UI shows V/µm). */
	ex: Float64Array;
	ey: Float64Array;
}

export interface OpticalMode {
	n_eff: number;
	te_fraction?: number;
	components: Record<string, Float64Array | undefined>;
}

export interface OpticalFields extends FieldMesh {
	modes: OpticalMode[];
	solver?: 'scalar' | 'vector';
	form?: string;
	polarization?: string;
	/** Vector solver: 'triangle_centroid' (components per triangle). */
	location?: string;
	convention?: unknown;
	order?: number;
	/** Pockels index change on this optical mesh, per triangle centroid, 1/V per volt of terminal voltage. */
	pockels?: PockelsField;
}

export interface SimFields {
	es?: EsFields;
	optical?: OpticalFields | null;
	/** EO arm optical fields (arm A may equal `optical`). */
	arms?: { A: OpticalFields; B: OpticalFields | null } | null;
}

export type WorkerIn =
	| { type: 'run'; text: string; section: string; stages: string[]; meshScale: number; fields: boolean; params?: Record<string, number> }
	| { type: 'point'; text: string; study: string; index: number; section: string; meshScale: number; stages: string[] | null }
	| { type: 'mesh'; text: string; section: string; meshScale: number };

export type WorkerOut =
	| { type: 'progress'; message: string }
	| { type: 'result'; result: import('../../../../engine/src/run.mjs').SimulationResult; fields: SimFields | null }
	| { type: 'point'; point: import('../../../../engine/src/sweep.mjs').SweepPoint }
	| { type: 'mesh'; mesh: FieldMesh; ms: number }
	| { type: 'error'; message: string };

/** Scalar on a mesh, either per node (Gouraud) or per triangle (flat). */
export interface ScalarField {
	mesh: FieldMesh;
	values: Float64Array | Float32Array;
	/** node: per mesh node (Gouraud); tri: per triangle (flat); corner: 3 values per triangle (linear, discontinuous). */
	at: 'node' | 'tri' | 'corner';
	/** Exact evaluation inside display triangle t at (x, y) (P2 quadratic), used by probe and cut line. */
	evaluate?: (t: number, x: number, y: number) => number;
	/** Note shown with the value (e.g. smoothed, P2 refined display). */
	note?: string;
	label: string;
	unit: string;
	/** True for quantities whose sign matters (symmetric scale is the natural default). */
	signed: boolean;
}

export type ScaleMode = 'linear' | 'symmetric' | 'log';
