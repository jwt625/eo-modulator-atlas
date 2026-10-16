// Worker side of the Results protocol (DevLog-032) over one engine solution store (DevLog-031 API, public entries
// only). Maps base dataset + mode to engine ids ('opt' + mode k -> 'opt:k'), region-name selections, cut lines by
// geometry (engine cut-line datasets, cached), the P2 display (engine `p2nodes` values on the refined display mesh),
// the RF frequency sweep (`rf` dataset), and min/max with locations for Max/Min markers. `prefix` namespaces the mesh
// ids of sweep-point solutions ('sweep:3/es').
import { evaluateAtPoints, evaluateDerived, evaluatePlot, modeTable, parseExpression, referencedNames, type SolutionStore } from '../../../../../engine/src/postproc/index.mjs';
import { buildTriIndex } from '../fieldmath';
import type { FieldMesh } from '../types';
import type { CheckResult, DatasetInfo, DerivedRequest, DerivedResult, LineResult, LineSpec, ModeRow, PlotRequest, PlotResult, VariableInfo } from './contract';

// Sub-triangles of a P2 element in local DOF numbers (vertices 0..2, midpoints 3 = m01, 4 = m12, 5 = m20).
const SUB = [[0, 3, 5], [3, 1, 4], [5, 4, 2], [3, 4, 5]] as const;

export class PostSession {
	private base: DatasetInfo[];
	private cutLines = new Map<string, string>();
	private p2: FieldMesh | null | undefined;
	private vars = new Map<string, VariableInfo[]>();

	constructor(readonly store: SolutionStore, private prefix = '') {
		// Base datasets only (the mode is a UI selection); labels without the selected mode's n_eff.
		this.base = this.store
			.datasets()
			.filter((d) => !d.id.includes(':'))
			.map((d) => ({
				...d,
				label: d.kind === 'es' ? d.label : d.kind === 'opt' ? 'Optical mode' : d.kind === 'arm' ? `Arm ${d.arm} mode${d.aliasOf ? ' (= optical mode)' : ''}` : d.kind === 'eo' ? `EO overlap arm ${d.arm}` : d.kind === 'rf' ? 'RF frequency sweep' : d.label
			}));
	}

	datasets(): DatasetInfo[] {
		return this.base;
	}

	/** Refined P2 display mesh (DOF coordinates as nodes, 4 sub-triangles per element) or null for P1. */
	private p2Mesh(): FieldMesh | null {
		if (this.p2 !== undefined) return this.p2;
		this.p2 = null;
		if (!this.base.some((d) => d.id === 'es')) return null;
		let r;
		try {
			r = evaluatePlot(this.store, { dataset: 'es', expr: 'es.V', location: 'p2nodes' });
		} catch {
			return null; // P1 solution
		}
		if (!r.x || !r.y || !r.elem) return null;
		const es = this.store.mesh('es');
		const nT = r.elem.length / 6;
		const tri = new Int32Array(12 * nT), triRegion = new Int32Array(4 * nT);
		for (let t = 0; t < nT; t++)
			for (let s = 0; s < 4; s++) {
				triRegion[4 * t + s] = es.triRegion[t];
				for (let c = 0; c < 3; c++) tri[3 * (4 * t + s) + c] = r.elem[6 * t + SUB[s][c]];
			}
		const mesh: FieldMesh = { x: Float64Array.from(r.x), y: Float64Array.from(r.y), tri, triRegion, regionNames: es.regionNames, regionMaterials: es.regionMaterials };
		mesh.index = buildTriIndex(mesh);
		this.p2 = mesh;
		return mesh;
	}

	private mid(id: string): string {
		return `${this.prefix}${id}`;
	}

	/** Display meshes for the main thread (copies by structured clone), ids prefixed for sweep points. */
	meshes(): Record<string, FieldMesh> {
		const out: Record<string, FieldMesh> = {};
		for (const id of new Set(this.base.map((d) => d.mesh).filter((m): m is string => !!m))) {
			const m = this.store.mesh(id);
			out[this.mid(id)] = { x: m.x, y: m.y, tri: m.tri, triRegion: m.triRegion, regionNames: m.regionNames, regionMaterials: m.regionMaterials };
		}
		const p2 = this.p2Mesh();
		if (p2) out[this.mid('es.p2')] = p2;
		return out;
	}

	/** Engine dataset id of a base dataset and mode. */
	private id(dataset: string, mode?: number): string {
		const d = this.base.find((x) => x.id === dataset);
		if (!d) return dataset;
		if (mode == null || d.nModes == null || d.kind === 'eo' || mode === d.mode) return dataset;
		return `${dataset}:${mode}`;
	}

	variables(dataset: string): VariableInfo[] {
		let v = this.vars.get(dataset);
		if (!v) this.vars.set(dataset, (v = this.store.variables(dataset)));
		return v;
	}

	modes(dataset: string): ModeRow[] {
		return modeTable(this.store, dataset);
	}

	/** Continuity of an expression from the registry (no evaluation): every referenced field variable continuous. */
	private continuous(dataset: string, expr: string): boolean {
		const vars = this.variables(dataset);
		return referencedNames(parseExpression(expr)).every((n) => {
			const v = vars.find((x) => x.name === n);
			return !v || v.location === 'global' || v.continuous;
		});
	}

	/** Unit, continuity and globality of an expression on a dataset (public entries only). */
	check(dataset: string, mode: number | undefined, expr: string, unit?: string): CheckResult {
		const names = referencedNames(parseExpression(expr));
		const vars = this.variables(dataset);
		const field = names.map((n) => vars.find((v) => v.name === n)).filter((v): v is VariableInfo => !!v && v.location !== 'global');
		const info = this.base.find((d) => d.id === dataset);
		let u: string, dim: number[];
		if (info?.kind === 'rf') {
			const r = evaluatePlot(this.store, { dataset: 'rf', expr, unit: unit?.trim() || undefined });
			u = r.unit;
			dim = r.dim;
		} else {
			const m = info?.mesh ? this.store.mesh(info.mesh) : this.store.mesh(this.base.find((d) => d.mesh)!.mesh!);
			const r = evaluateAtPoints(this.store, { dataset: this.id(dataset, mode), expr, x: [m.x[0]], y: [m.y[0]], unit: unit?.trim() || undefined });
			u = r.unit;
			dim = r.dim;
		}
		return { unit: u, dim, continuous: field.every((v) => v.continuous), global: field.length === 0 && !names.some((n) => n === 'x' || n === 'y') };
	}

	plot(req: PlotRequest): PlotResult {
		const ds = this.id(req.dataset, req.mode);
		const info = this.base.find((d) => d.id === req.dataset);
		const unit = req.unit || undefined;
		if (info?.kind === 'rf') {
			const r = evaluatePlot(this.store, { dataset: 'rf', expr: req.expr, unit });
			return { values: r.values, location: 'sweep', mesh: '', unit: r.unit, ms: r.ms, min: r.min, max: r.max, minAt: null, maxAt: null, x: r.fGhz ?? new Float64Array(0) };
		}
		const p2 = info?.kind === 'es' ? this.p2Mesh() : null;
		let values: Float64Array, location: PlotResult['location'], meshId: string, outUnit: string, ms: number;
		if (p2 && req.resolution !== 'normal' && this.continuous(req.dataset, req.expr)) {
			// P2: exact values at the P2 DOFs = the nodes of the refined display mesh.
			const r = evaluatePlot(this.store, { dataset: 'es', expr: req.expr, unit, location: 'p2nodes' });
			({ values, ms } = r);
			outUnit = r.unit;
			location = 'node';
			meshId = 'es.p2';
		} else {
			// P2 fields: exact corner values (linear per element); P1 and optical: node or element (engine continuity rule).
			const r = evaluatePlot(this.store, { dataset: ds, expr: req.expr, unit, location: p2 || (info?.kind === 'es' && req.resolution === 'normal') ? 'corner' : 'auto' });
			({ values, ms } = r);
			outUnit = r.unit;
			location = r.location === 'corner' ? 'corner' : r.location === 'element' ? 'element' : 'node';
			meshId = r.mesh ?? info?.mesh ?? '';
		}
		const mesh = meshId === 'es.p2' ? p2! : this.store.mesh(meshId);
		return { values, location, mesh: this.mid(meshId), unit: outUnit, ms, ...extrema(mesh, values, location, req.selection ?? null) };
	}

	derived(req: DerivedRequest): DerivedResult {
		const dataset = this.id(req.dataset, req.mode);
		const sel = req.selection;
		let selection: Parameters<typeof evaluateDerived>[1]['selection'];
		if (req.kind.startsWith('surface')) selection = Array.isArray(sel) && sel.length && typeof sel[0] === 'string' ? { regions: sel as string[] } : undefined;
		else if (req.kind.startsWith('line')) {
			const l = sel as LineSpec;
			selection = { polyline: [[l.ax, l.ay], [l.bx, l.by]] };
		} else if (req.kind === 'point') selection = { point: sel as [number, number] };
		const r = evaluateDerived(this.store, { kind: req.kind, dataset, expr: req.expr, unit: req.unit || undefined, selection });
		return { value: r.value, unit: r.unit, at: r.at ?? null, measure: r.measure, nSkipped: r.nSkipped, quadrature: r.quadrature };
	}

	line(dataset: string, mode: number | undefined, exprs: string[], units: string[], l: LineSpec): LineResult {
		const parent = this.id(dataset, mode);
		const key = JSON.stringify([parent, l.ax, l.ay, l.bx, l.by, l.n]);
		let id = this.cutLines.get(key);
		if (!id) {
			if (this.cutLines.size > 32) {
				for (const old of this.cutLines.values()) this.store.removeDataset(old);
				this.cutLines.clear();
			}
			id = this.store.addCutLine({ points: [[l.ax, l.ay], [l.bx, l.by]], parent, n: Math.max(2, Math.min(100000, Math.round(l.n))) }).id;
			this.cutLines.set(key, id);
		}
		let s: Float64Array = new Float64Array(0);
		const values: Float64Array[] = [], out: string[] = [];
		exprs.forEach((e, i) => {
			const r = evaluatePlot(this.store, { dataset: id!, expr: e, unit: units[i] || undefined });
			if (r.s) s = r.s;
			values.push(r.values);
			out.push(r.unit);
		});
		return { s, values, units: out };
	}

	dispose() {
		this.store.dispose();
	}
}

/** Min and max over the selection (by element region) with their locations. */
function extrema(mesh: FieldMesh, values: Float64Array, loc: PlotResult['location'], sel: string[] | null) {
	const nT = mesh.tri.length / 3;
	let mask: Uint8Array | null = null;
	if (sel) {
		mask = new Uint8Array(mesh.regionNames.length);
		for (const n of sel) {
			const i = mesh.regionNames.indexOf(n);
			if (i >= 0) mask[i] = 1;
		}
	}
	let min = Infinity, max = -Infinity, iMin = -1, iMax = -1;
	const take = (i: number) => {
		const x = values[i];
		if (!(x === x)) return;
		if (x < min) { min = x; iMin = i; }
		if (x > max) { max = x; iMax = i; }
	};
	if (loc === 'element') {
		for (let t = 0; t < nT; t++) if (!mask || mask[mesh.triRegion[t]]) take(t);
	} else if (loc === 'corner') {
		for (let t = 0; t < nT; t++) if (!mask || mask[mesh.triRegion[t]]) { take(3 * t); take(3 * t + 1); take(3 * t + 2); }
	} else if (mask) {
		for (let t = 0; t < nT; t++) if (mask[mesh.triRegion[t]]) for (let k = 0; k < 3; k++) take(mesh.tri[3 * t + k]);
	} else for (let i = 0; i < values.length; i++) take(i);
	const pos = (i: number): [number, number] | null => {
		if (i < 0) return null;
		if (loc === 'node') return [mesh.x[i], mesh.y[i]];
		if (loc === 'corner') return [mesh.x[mesh.tri[i]], mesh.y[mesh.tri[i]]];
		const a = mesh.tri[3 * i], b = mesh.tri[3 * i + 1], c = mesh.tri[3 * i + 2];
		return [(mesh.x[a] + mesh.x[b] + mesh.x[c]) / 3, (mesh.y[a] + mesh.y[b] + mesh.y[c]) / 3];
	};
	return { min: iMin >= 0 ? min : NaN, max: iMax >= 0 ? max : NaN, minAt: pos(iMin), maxAt: pos(iMax) };
}
