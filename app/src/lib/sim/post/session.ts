// Worker side of the Results protocol (DevLog-032) over one engine solution store (DevLog-031 API, public entries
// only). Maps base dataset + mode to engine ids ('opt' + mode k -> 'opt:k'), region-name selections, cut lines by
// geometry (engine cut-line datasets, cached), field plots as refined element-local lattice values with smoothing
// (engine `location: 'refined'`, DevLog-034), the RF frequency sweep (`rf` dataset), and min/max with locations for
// Max/Min markers. `prefix` namespaces the mesh ids of sweep-point solutions ('sweep:3/es').
import { evaluateAtPoints, evaluateDerived, evaluatePlot, modeTable, parseExpression, referencedNames, refinePattern, type SolutionStore } from '../../../../../engine/src/postproc/index.mjs';
import type { FieldMesh } from '../types';
import type { CheckResult, DatasetInfo, DerivedRequest, DerivedResult, LineResult, LineSpec, ModeRow, PlotRequest, PlotResult, VariableInfo } from './contract';

export class PostSession {
	private base: DatasetInfo[];
	private cutLines = new Map<string, string>();
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
		// Element-local lattice of the requested resolution, exact per element, smoothed as requested (DevLog-034).
		const r = evaluatePlot(this.store, { dataset: ds, expr: req.expr, unit, location: 'refined', resolution: req.resolution ?? 'normal', smoothing: req.smoothing ?? 'material' });
		const meshId = r.mesh ?? info?.mesh ?? '';
		const lev = r.resolution ?? 1;
		const ex = extrema(this.store.mesh(meshId), r.values, lev, req.selection ?? null);
		// Exact point values at the extremum locations (same evaluation as the probe), for Max/Min markers.
		const at = [ex.maxAt, ex.minAt].filter((p): p is [number, number] => !!p);
		const pv = at.length ? evaluateAtPoints(this.store, { dataset: ds, expr: req.expr, unit, points: at }).values : null;
		const atValues = pv ? { maxAtValue: ex.maxAt ? pv[0] : undefined, minAtValue: ex.minAt ? pv[ex.maxAt ? 1 : 0] : undefined } : {};
		return { values: r.values, location: 'refined', mesh: this.mid(meshId), unit: r.unit, ms: r.ms, r: lev, requestedR: r.requestedResolution, smoothing: r.smoothing, ...ex, ...atValues };
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

/** Min and max of refined lattice values over the selection (by element region) with their locations. */
function extrema(mesh: FieldMesh, values: Float64Array, r: number, sel: string[] | null) {
	const nT = mesh.tri.length / 3;
	const { np, L } = refinePattern(r);
	let mask: Uint8Array | null = null;
	if (sel) {
		mask = new Uint8Array(mesh.regionNames.length);
		for (const n of sel) {
			const i = mesh.regionNames.indexOf(n);
			if (i >= 0) mask[i] = 1;
		}
	}
	let min = Infinity, max = -Infinity, iMin = -1, iMax = -1;
	for (let t = 0; t < nT; t++) {
		if (mask && !mask[mesh.triRegion[t]]) continue;
		for (let i = t * np; i < (t + 1) * np; i++) {
			const x = values[i];
			if (!(x === x)) continue;
			if (x < min) { min = x; iMin = i; }
			if (x > max) { max = x; iMax = i; }
		}
	}
	const pos = (i: number): [number, number] | null => {
		if (i < 0) return null;
		const t = Math.floor(i / np), p = i - t * np;
		const a = mesh.tri[3 * t], b = mesh.tri[3 * t + 1], c = mesh.tri[3 * t + 2];
		const l0 = L[3 * p], l1 = L[3 * p + 1], l2 = L[3 * p + 2];
		return [l0 * mesh.x[a] + l1 * mesh.x[b] + l2 * mesh.x[c], l0 * mesh.y[a] + l1 * mesh.y[b] + l2 * mesh.y[c]];
	};
	return { min: iMin >= 0 ? min : NaN, max: iMax >= 0 ? max : NaN, minAt: pos(iMin), maxAt: pos(iMax) };
}
