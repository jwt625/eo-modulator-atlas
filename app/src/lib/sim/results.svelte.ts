// Results model (COMSOL Results tree, DevLog-032): datasets, selections, plot groups with layered features, derived
// value nodes and tables, plus an undo/redo history of the edits. Pure state + editing; evaluation goes through the
// workbench's PostClient.
import type { ColormapName } from './colormap';
import type { DatasetInfo, DerivedKind, LineSpec, ResolutionName, Smoothing } from './post/contract';
import type { ScaleMode } from './types';

export type FeatureType = 'surface' | 'contour' | 'arrow' | 'line' | 'maxmin' | 'linegraph' | 'global' | 'tablegraph';

export interface RangeSpec {
	manual: boolean;
	min: number;
	max: number;
	scale: ScaleMode;
}

export interface Feature {
	id: string;
	type: FeatureType;
	name: string;
	visible: boolean;
	/** Dataset id; '' = the plot group's dataset. */
	dataset: string;
	expr: string;
	unit: string;
	/** Description shown instead of the expression in titles and legends (COMSOL Expression > Description). */
	description: string;
	/** Feature title in the plot group's automatic title: automatic, manual (`title`) or none. */
	titleMode: 'auto' | 'manual' | 'none';
	title: string;
	/** Color range (COMSOL Range > Manual color range) and scale. */
	range: RangeSpec;
	/** Data range: values outside [min, max] are not drawn (COMSOL Range > Manual data range). */
	dataRange: { manual: boolean; min: number; max: number };
	/**
	 * Automatic colour range from all values ('data') or from the optical-mode region ('mode': lattice points where
	 * `modeExpr` >= e^-2 of its peak, evaluated on the feature's dataset; DevLog-042 round 2, audit F1).
	 */
	rangeFrom?: 'data' | 'mode';
	modeExpr?: string;
	table: ColormapName;
	reverse: boolean;
	legend: boolean;
	/** Selection id (filter); '' = all domains. */
	selection: string;
	/** Quality (COMSOL, DevLog-034): element subdivision of the drawn values and smoothing of coincident element-side values. */
	resolution: ResolutionName;
	smoothing: Smoothing;
	// contour
	levelsMode: 'count' | 'list';
	count: number;
	list: string;
	coloring: 'table' | 'uniform';
	color: string;
	// arrow surface
	xExpr: string;
	yExpr: string;
	/** Arrow grid over the visible view, the dataset bounding box, or the selection bounding box. */
	placement: 'view' | 'dataset' | 'selection';
	gridX: number;
	gridY: number;
	lengthMode: 'proportional' | 'normalized' | 'logarithmic';
	scaleFactor: number;
	heads: boolean;
	// max/min marker
	show: 'both' | 'max' | 'min';
	// global (comma-separated expressions)
	exprs: string;
	// 1D: y axis of the series
	yAxis: 'left' | 'right';
	// table graph
	tableId: string;
	xCol: string;
	yCols: string;
}

export interface PlotGroup {
	id: string;
	name: string;
	kind: '2d' | '1d';
	dataset: string;
	/** Parameter value: -1 = the last Compute, else the sweep point index (Parametric dataset). */
	point: number;
	/** S8 bias point of semiconductor datasets (DevLog-042): null = last bias point, -1 = reference bias, k = point k. */
	bias?: number | null;
	features: Feature[];
	titleMode: 'auto' | 'custom' | 'none';
	title: string;
	/** Draw region and electrode outlines of the dataset geometry (COMSOL "plot dataset edges"). */
	edges: boolean;
	logX: boolean;
	logY: boolean;
	/** Created by the default set (re-created when missing; user groups are never replaced). */
	auto: string;
}

export interface CutLine extends LineSpec {
	id: string;
	name: string;
	source: string;
	/** Solution of the source: -1 = last Compute, else the sweep point index. */
	point: number;
	/** Bias point of a semiconductor source (null = last). */
	bias?: number | null;
}
export interface CutPoint {
	id: string;
	name: string;
	source: string;
	point: number;
	bias?: number | null;
	x: number;
	y: number;
}
export interface Selection {
	id: string;
	name: string;
	regions: string[];
	/** Created by the default set (e.g. 'semiconductor'); re-created only when missing. */
	auto?: string;
}
export interface DerivedNode {
	id: string;
	name: string;
	kind: DerivedKind;
	dataset: string;
	expr: string;
	unit: string;
	/** surface_*: selection id; line_*: cut line id; point: cut point id. */
	target: string;
	tableId: string;
	/** Parameter value (global and surface kinds; line/point kinds use their cut line/point's): -1 = last Compute. */
	point: number;
	/** Bias point of a semiconductor dataset (global and surface kinds; null = last). */
	bias?: number | null;
}
/** Wide table: one row per evaluation; numeric parameter and value columns (headers carry the unit). */
export interface Table {
	id: string;
	name: string;
	columns: string[];
	rows: (string | number)[][];
	/** Column roles: parameter (x candidates), value (evaluated quantity), coordinate, text. */
	roles: Record<string, 'param' | 'value' | 'coord' | 'text'>;
}

export const FEATURE_LABEL: Record<FeatureType, string> = {
	surface: 'Surface', contour: 'Contour', arrow: 'Arrow Surface', line: 'Line', maxmin: 'Max/Min Marker',
	linegraph: 'Line Graph', global: 'Global', tablegraph: 'Table Graph'
};
export const FEATURES_2D: FeatureType[] = ['surface', 'contour', 'arrow', 'line', 'maxmin'];
export const FEATURES_1D: FeatureType[] = ['linegraph', 'global', 'tablegraph'];
export const DERIVED_LABEL: Record<DerivedKind, string> = {
	global: 'Global Evaluation', surface_int: 'Surface Integration', surface_avg: 'Surface Average', surface_max: 'Surface Maximum',
	surface_min: 'Surface Minimum', line_int: 'Line Integration', line_avg: 'Line Average', point: 'Point Evaluation'
};
export const DERIVED_SHORT: Record<DerivedKind, string> = {
	global: '', surface_int: 'int', surface_avg: 'avg', surface_max: 'max', surface_min: 'min', line_int: 'lineint', line_avg: 'lineavg', point: ''
};

let seq = 0;
const uid = (p: string) => `${p}${++seq}`;

/** COMSOL-style numbered name: `base n` with n one above the highest number in use. */
export function nextName(base: string, names: string[]): string {
	let n = 0;
	const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} (\\d+)$`);
	for (const x of names) {
		const m = re.exec(x);
		if (m) n = Math.max(n, Number(m[1]));
	}
	return `${base} ${n + 1}`;
}

export function newFeature(type: FeatureType, over: Partial<Feature> = {}): Feature {
	return {
		id: uid('f'), type, name: FEATURE_LABEL[type], visible: true, dataset: '', expr: '', unit: '', description: '',
		titleMode: 'auto', title: '', range: { manual: false, min: 0, max: 1, scale: 'linear' }, dataRange: { manual: false, min: 0, max: 1 },
		table: 'Rainbow', reverse: false, legend: true, selection: '', resolution: 'normal', smoothing: 'material',
		levelsMode: 'count', count: 10, list: '', coloring: 'table', color: '#ffffff',
		xExpr: '', yExpr: '', placement: 'view', gridX: 25, gridY: 25, lengthMode: 'proportional', scaleFactor: 1, heads: true,
		show: 'both', exprs: '', yAxis: 'left', tableId: '', xCol: '', yCols: '',
		// Arrow Surface: '' = theme ink color (visible in dark and light themes, follows the toggle).
		...(type === 'arrow' ? { color: '' } : {}), ...over
	};
}

interface Snapshot {
	cutLines: CutLine[];
	cutPoints: CutPoint[];
	selections: Selection[];
	groups: PlotGroup[];
	derived: DerivedNode[];
	tables: Table[];
	modeOf: Record<string, number>;
}

export class Results {
	datasets = $state<DatasetInfo[]>([]);
	/** Selected mode per optical dataset (Mode Analysis table row). */
	modeOf = $state<Record<string, number>>({});
	cutLines = $state<CutLine[]>([]);
	cutPoints = $state<CutPoint[]>([]);
	selections = $state<Selection[]>([]);
	groups = $state<PlotGroup[]>([]);
	derived = $state<DerivedNode[]>([]);
	tables = $state<Table[]>([]);
	/** Table shown in the bottom Table window (last evaluated or selected). */
	lastTable = $state('');
	/** Solution generation: bumps on every new solution (plot caches key on it). */
	gen = $state(0);

	dataset(id: string): DatasetInfo | null {
		return this.datasets.find((d) => d.id === id) ?? null;
	}
	/** Datasets drawn on a 2D plot (no RF frequency sweep). */
	get fieldSets(): DatasetInfo[] {
		return this.datasets.filter((d) => d.kind !== 'rf');
	}
	group(id: string): PlotGroup | null {
		return this.groups.find((g) => g.id === id) ?? null;
	}
	feature(gid: string, fid: string): Feature | null {
		return this.group(gid)?.features.find((f) => f.id === fid) ?? null;
	}
	/** Dataset label for ids of solution datasets, cut lines and cut points. */
	dsLabel(id: string): string {
		return this.dataset(id)?.label ?? this.cutLines.find((c) => c.id === id)?.name ?? this.cutPoints.find((c) => c.id === id)?.name ?? (id === 'sweep' ? 'Parametric sweep' : id === 'rf' ? 'RF frequency sweep' : id || 'none');
	}
	/** Optical variable prefix of a dataset (engine API v1): opt.* on the optical window, armA.* / armB.* on the arms. */
	optPrefix(ds: string): string | null {
		const d = this.dataset(ds);
		if (!d) return null;
		if (d.kind === 'opt') return 'opt';
		if (d.kind === 'arm' || d.kind === 'eo') return d.arm ? `arm${d.arm}` : d.id.split(':')[0];
		return null;
	}
	/** Mode intensity expression of an optical dataset (|E|^2, else psi^2), or ''. */
	intensityExpr(ds: string, has: (ds: string, v: string) => boolean): string {
		const p = this.optPrefix(ds);
		if (!p) return '';
		return has(ds, `${p}.normE`) ? `${p}.normE^2` : has(ds, `${p}.psi`) ? `${p}.psi^2` : '';
	}
	/** Mode shown for a dataset in a solution: the last Compute (by dataset) or a sweep point ('sweep:i|ds'; undefined = its solved mode). */
	modeFor(ds: string, sol?: string): number | undefined {
		return sol ? this.modeOf[`${sol}|${ds}`] : this.mode(ds);
	}
	mode(ds: string): number {
		return this.modeOf[ds] ?? this.dataset(ds)?.mode ?? 0;
	}
	/** S8: a semiconductor dataset (addressed with a bias index instead of a mode). */
	isSemi(ds: string): boolean {
		return this.dataset(ds)?.kind === 'semi';
	}
	/** Bias point shown by a view (null = last point; clamped to the solution's bias points; -1 = reference bias). */
	biasIndex(ds: string, bias: number | null | undefined): number {
		const n = this.dataset(ds)?.nBias ?? 0;
		if (!n) return -1;
		if (bias == null || bias >= n || bias < -1) return n - 1;
		return bias;
	}
	/** Mode (optical datasets) or bias index (semiconductor datasets) of a request from a view. */
	indexFor(ds: string, sol: string | undefined, bias: number | null | undefined): number | undefined {
		return this.isSemi(ds) ? this.biasIndex(ds, bias) : this.modeFor(ds, sol);
	}
	selectionRegions(id: string): string[] | null {
		if (!id) return null;
		return this.selections.find((s) => s.id === id)?.regions ?? null;
	}

	/** New solution: datasets replaced, solution-bound cut lines kept when their source still exists. */
	setSolution(ds: DatasetInfo[]) {
		this.datasets = ds;
		const ids = new Set(ds.map((d) => d.id));
		this.modeOf = Object.fromEntries(Object.entries(this.modeOf).filter(([k, v]) => ids.has(k) && v < (this.dataset(k)?.nModes ?? 1)));
		for (const c of this.cutLines) if (!ids.has(c.source) && ds[0]) c.source = ds[0].id;
		for (const c of this.cutPoints) if (!ids.has(c.source) && ds[0]) c.source = ds[0].id;
		this.gen++;
	}
	/** New model (config switch): everything removed, history cleared. */
	reset() {
		this.cutLines = [];
		this.cutPoints = [];
		this.selections = [];
		this.groups = [];
		this.derived = [];
		this.tables = [];
		this.clear();
		this.undoStack = [];
		this.redoStack = [];
		this.last = '';
	}
	clear() {
		this.datasets = [];
		this.modeOf = {};
		this.gen++;
	}

	// ---- undo / redo (snapshots of the editable model, at most 50 steps) ----
	undoStack = $state.raw<string[]>([]);
	redoStack = $state.raw<string[]>([]);
	private last = '';
	private lastAt = 0;
	private restoring = false;

	/**
	 * New solution (F3): the automatic default plot groups are not an undo step and no edit merges across it; the
	 * history restarts at the current model (so Undo can never remove the defaults of the current solution).
	 */
	rebase() {
		this.undoStack = [];
		this.redoStack = [];
		this.last = this.snapshotJson();
		this.lastAt = 0;
	}
	/** Structural edits (add, delete, duplicate, move) are always their own undo step. */
	private breakStep() {
		this.lastAt = 0;
	}

	snapshotJson(): string {
		const s: Snapshot = { cutLines: this.cutLines, cutPoints: this.cutPoints, selections: this.selections, groups: this.groups, derived: this.derived, tables: this.tables, modeOf: this.modeOf };
		return JSON.stringify(s);
	}
	/** Record the current state after a change (edits within 400 ms coalesce into one step). */
	commit(json: string) {
		if (this.restoring || json === this.last) return;
		const now = Date.now();
		if (this.last) {
			if (now - this.lastAt < 400 && this.undoStack.length) {
				/* same step */
			} else this.undoStack = [...this.undoStack.slice(-49), this.last];
			this.redoStack = [];
		}
		this.last = json;
		this.lastAt = now;
	}
	private restore(json: string) {
		const s = JSON.parse(json) as Snapshot;
		this.restoring = true;
		this.cutLines = s.cutLines;
		this.cutPoints = s.cutPoints;
		this.selections = s.selections;
		this.groups = s.groups;
		this.derived = s.derived;
		this.tables = s.tables;
		this.modeOf = s.modeOf;
		this.last = json;
		this.lastAt = 0;
		queueMicrotask(() => (this.restoring = false));
	}
	undo(): boolean {
		const prev = this.undoStack[this.undoStack.length - 1];
		if (!prev) return false;
		this.undoStack = this.undoStack.slice(0, -1);
		this.redoStack = [...this.redoStack, this.last];
		this.restore(prev);
		return true;
	}
	redo(): boolean {
		const next = this.redoStack[this.redoStack.length - 1];
		if (!next) return false;
		this.redoStack = this.redoStack.slice(0, -1);
		this.undoStack = [...this.undoStack.slice(-49), this.last];
		this.restore(next);
		return true;
	}

	// ---- plot groups and features ----
	addGroup(kind: '2d' | '1d', dataset = '', name?: string, features: Feature[] = [], auto = ''): PlotGroup {
		this.breakStep();
		const g: PlotGroup = { id: uid('pg'), name: name ?? nextName(`${kind === '2d' ? '2D' : '1D'} Plot Group`, this.groups.map((x) => x.name)), kind, dataset: dataset || (kind === '2d' ? (this.fieldSets[0]?.id ?? '') : ''), point: -1, bias: null, features: [], titleMode: 'auto', title: '', edges: true, logX: false, logY: false, auto };
		for (const f of features) g.features.push({ ...f, name: f.name === FEATURE_LABEL[f.type] ? nextName(FEATURE_LABEL[f.type], g.features.map((x) => x.name)) : f.name });
		this.groups = [...this.groups, g];
		return this.groups[this.groups.length - 1];
	}
	duplicateGroup(id: string): PlotGroup | null {
		const g = this.group(id);
		if (!g) return null;
		this.breakStep();
		const copy: PlotGroup = { ...$state.snapshot(g), id: uid('pg'), name: nextName(g.name.replace(/ \d+$/, ''), this.groups.map((x) => x.name)), auto: '', features: $state.snapshot(g).features.map((f) => ({ ...f, id: uid('f') })) } as PlotGroup;
		const i = this.groups.indexOf(g);
		this.groups = [...this.groups.slice(0, i + 1), copy, ...this.groups.slice(i + 1)];
		return this.groups[i + 1];
	}
	deleteGroup(id: string) {
		this.breakStep();
		this.groups = this.groups.filter((g) => g.id !== id);
	}
	addFeature(gid: string, type: FeatureType, over: Partial<Feature> = {}): Feature | null {
		const g = this.group(gid);
		if (!g) return null;
		this.breakStep();
		const prev = [...g.features].reverse().find((f) => f.expr);
		const same = type === 'surface' || type === 'contour' || type === 'maxmin';
		const f = newFeature(type, { name: nextName(FEATURE_LABEL[type], g.features.map((x) => x.name)), expr: same ? (prev?.expr ?? '') : '', unit: same ? (prev?.unit ?? '') : '', ...over });
		g.features.push(f);
		return g.features[g.features.length - 1];
	}
	duplicateFeature(gid: string, fid: string): Feature | null {
		const g = this.group(gid);
		const f = g?.features.find((x) => x.id === fid);
		if (!g || !f) return null;
		this.breakStep();
		const copy = { ...$state.snapshot(f), id: uid('f'), name: nextName(FEATURE_LABEL[f.type], g.features.map((x) => x.name)) } as Feature;
		const i = g.features.indexOf(f);
		g.features.splice(i + 1, 0, copy);
		return g.features[i + 1];
	}
	deleteFeature(gid: string, fid: string) {
		this.breakStep();
		const g = this.group(gid);
		if (g) g.features = g.features.filter((f) => f.id !== fid);
	}
	moveFeature(gid: string, fid: string, d: -1 | 1) {
		const g = this.group(gid);
		if (!g) return;
		const i = g.features.findIndex((f) => f.id === fid);
		const j = i + d;
		if (i < 0 || j < 0 || j >= g.features.length) return;
		this.breakStep();
		const a = [...g.features];
		[a[i], a[j]] = [a[j], a[i]];
		g.features = a;
	}

	// ---- datasets, selections, derived values, tables ----
	addCutLine(source: string, l: LineSpec, name?: string, point = -1): CutLine {
		this.breakStep();
		const c: CutLine = { id: uid('cl'), name: name ?? nextName('Cut Line 2D', this.cutLines.map((x) => x.name)), source, point, ...l };
		this.cutLines = [...this.cutLines, c];
		return this.cutLines[this.cutLines.length - 1];
	}
	addCutPoint(source: string, x: number, y: number, point = -1): CutPoint {
		this.breakStep();
		const c: CutPoint = { id: uid('cp'), name: nextName('Cut Point 2D', this.cutPoints.map((q) => q.name)), source, x, y, point };
		this.cutPoints = [...this.cutPoints, c];
		return this.cutPoints[this.cutPoints.length - 1];
	}
	addSelection(regions: string[] = [], name?: string, auto?: string): Selection {
		this.breakStep();
		const s: Selection = { id: uid('sel'), name: name ?? nextName('Selection', this.selections.map((x) => x.name)), regions, ...(auto ? { auto } : {}) };
		this.selections = [...this.selections, s];
		return this.selections[this.selections.length - 1];
	}
	addDerived(kind: DerivedKind, over: Partial<DerivedNode> = {}): DerivedNode {
		this.breakStep();
		const d: DerivedNode = { id: uid('dv'), name: nextName(DERIVED_LABEL[kind], this.derived.map((x) => x.name)), kind, dataset: this.fieldSets[0]?.id ?? '', expr: '', unit: '', target: '', tableId: '', point: -1, ...over };
		this.derived = [...this.derived, d];
		return this.derived[this.derived.length - 1];
	}
	addTable(name?: string): Table {
		const t: Table = { id: uid('tbl'), name: name ?? nextName('Table', this.tables.map((x) => x.name)), columns: [], rows: [], roles: {} };
		this.tables = [...this.tables, t];
		return this.tables[this.tables.length - 1];
	}
	/** Append one evaluation as a row; new keys become new columns (earlier rows get empty cells). */
	appendRow(t: Table, rec: Record<string, string | number>, roles: Record<string, 'param' | 'value' | 'coord' | 'text'> = {}) {
		t.roles = { ...(t.roles ?? {}), ...roles };
		const cols = [...t.columns];
		for (const k of Object.keys(rec)) if (!cols.includes(k)) cols.push(k);
		const rows = t.rows.map((r) => [...r, ...Array(cols.length - r.length).fill('')]);
		rows.push(cols.map((c) => (c in rec ? rec[c] : '')));
		t.columns = cols;
		t.rows = rows;
	}
	remove(kind: 'cutline' | 'cutpoint' | 'selection' | 'derived' | 'table', id: string) {
		this.breakStep();
		if (kind === 'cutline') this.cutLines = this.cutLines.filter((x) => x.id !== id);
		if (kind === 'cutpoint') this.cutPoints = this.cutPoints.filter((x) => x.id !== id);
		if (kind === 'selection') {
			this.selections = this.selections.filter((x) => x.id !== id);
			for (const g of this.groups) for (const f of g.features) if (f.selection === id) f.selection = '';
		}
		if (kind === 'derived') this.derived = this.derived.filter((x) => x.id !== id);
		if (kind === 'table') this.tables = this.tables.filter((x) => x.id !== id);
	}

	/**
	 * Default plot groups after a solve (DevLog-030 P4), created only when missing. `has(ds, variable)` tells which
	 * variables the solution registry provides; groups needing an absent variable are not created. Arm datasets that
	 * alias the optical model get no groups of their own.
	 */
	defaults(has: (ds: string, v: string) => boolean, opts: { rf: boolean; response?: boolean; bloch?: boolean; sweep: Record<string, number> | null; sweepMetric?: { name: string; unit: string } | null; semi?: { regions: string[] } | null }) {
		const ensure = (key: string, make: () => void) => {
			if (!this.groups.some((g) => g.auto === key)) make();
		};
		const es = this.datasets.find((d) => d.kind === 'es');
		const opticals = this.datasets.filter((d) => (d.kind === 'opt' || d.kind === 'arm' || d.kind === 'eo') && !d.aliasOf);
		const short = (d: DatasetInfo) => (d.kind === 'opt' ? 'optical' : `arm ${d.arm}`);
		if (es && has(es.id, 'es.V'))
			ensure('potential', () => this.addGroup('2d', es.id, 'Electric Potential', [
				newFeature('surface', { expr: 'es.V', unit: 'V', table: 'Rainbow' }),
				newFeature('contour', { expr: 'es.V', unit: 'V', count: 12, coloring: 'uniform', color: '#ffffff', legend: false })
			], 'potential'));
		if (es && has(es.id, 'es.normE'))
			ensure('efield', () => this.addGroup('2d', es.id, 'Electric Field', [
				newFeature('surface', { expr: 'es.normE', unit: 'V/um', table: 'Rainbow' }),
				newFeature('arrow', { xExpr: 'es.Ex', yExpr: 'es.Ey', lengthMode: 'logarithmic', gridX: 30, gridY: 20, placement: 'view' })
			], 'efield'));
		for (const d of opticals) {
			const ex = d.kind === 'eo' ? '' : this.intensityExpr(d.id, has);
			if (ex) ensure(`mode:${d.id}`, () => this.addGroup('2d', d.id, `Mode, ${short(d)}`, [newFeature('surface', { expr: ex, unit: '', table: 'Rainbow' })], `mode:${d.id}`));
		}
		// Pockels dn lives on the arm datasets (also when arm A aliases the optical model): arm A first.
		const arms = this.datasets.filter((d) => d.kind === 'arm' || d.kind === 'eo');
		const pk = arms.find((d) => d.kind === 'arm' && has(d.id, 'eo.dnxx')) ?? arms.find((d) => has(d.id, 'eo.dnxx'));
		if (pk)
			ensure('pockels', () => this.addGroup('2d', pk.id, 'Pockels dn', [newFeature('surface', { expr: 'eo.dnxx', unit: '1/V', table: 'Wave', range: { manual: false, min: 0, max: 1, scale: 'symmetric' } })], 'pockels'));
		for (const d of opticals) {
			if (d.kind !== 'eo' || !has(d.id, 'eo.integrand')) continue;
			const ex = this.intensityExpr(d.id, has);
			ensure(`eo:${d.id}`, () => this.addGroup('2d', d.id, `EO overlap, arm ${d.arm}`, [
				newFeature('surface', { expr: 'eo.integrand', unit: '1/(V*um^2)', table: 'Wave', range: { manual: false, min: 0, max: 1, scale: 'symmetric' } }),
				...(ex ? [newFeature('contour', { expr: ex, unit: '', count: 6, coloring: 'uniform', color: '#000000', legend: false })] : [])
			], `eo:${d.id}`));
		}
		if (opts.rf)
			ensure('rf', () => this.addGroup('1d', '', 'RF Line', [
				newFeature('global', { dataset: 'rf', exprs: 'rf.alpha_dB', unit: 'dB/cm', name: 'Attenuation' }),
				newFeature('global', { dataset: 'rf', exprs: 'rf.nRF', unit: '1', name: 'RF index', yAxis: 'right' })
			], 'rf'));
		// DevLog-036: traveling-wave EO response (paper targets overlaid by Plot1D) and the loaded-line Bloch quantities.
		if (opts.response)
			ensure('response', () => this.addGroup('1d', '', 'EO Response', [
				newFeature('global', { dataset: 'rf', exprs: 'rf.S21EO_dB', unit: 'dB', name: 'S21 EO' })
			], 'response'));
		if (opts.bloch)
			ensure('bloch', () => this.addGroup('1d', '', 'Loaded Line', [
				newFeature('global', { dataset: 'rf', exprs: 'rf.nB', unit: '1', name: 'Bloch index' }),
				newFeature('global', { dataset: 'rf', exprs: 'real(rf.ZB)', unit: 'ohm', name: 'Bloch impedance', yAxis: 'right' })
			], 'bloch'));
		// S8 (DevLog-042): semiconductor fields on the semiconductor domains (n, p are zero in insulators), the optical
		// mode as a contour overlay, and the per-bias stage values on the Bias sweep dataset.
		const sd = this.datasets.find((d) => d.kind === 'semi');
		if (sd && opts.semi) {
			let sel = this.selections.find((x) => x.auto === 'semiconductor');
			if (!sel && opts.semi.regions.length) sel = this.addSelection([...opts.semi.regions], 'Semiconductor', 'semiconductor');
			const only = sel?.id ?? '';
			const opt = this.datasets.find((d) => d.kind === 'opt');
			const mode = opt ? this.intensityExpr(opt.id, has) : '';
			const overlay = () => (opt && mode ? [newFeature('contour', { name: 'Optical mode', dataset: opt.id, expr: mode, unit: '', count: 5, coloring: 'uniform', color: '#ffffff', legend: false, description: 'optical mode intensity' })] : []);
			const surf = (expr: string, unit: string, over: Partial<Feature> = {}) => newFeature('surface', { expr, unit, table: 'Rainbow', selection: only, ...over });
			if (has(sd.id, 'semi.Nnet'))
				ensure('semi:doping', () => this.addGroup('2d', sd.id, 'Net Doping', [
					surf('semi.Nnet', '1/cm^3', { table: 'Wave', description: 'N_D - N_A', range: { manual: false, min: 0, max: 1, scale: 'symlog' } }),
					newFeature('contour', { name: 'Junction', expr: 'semi.Nnet', unit: '1/cm^3', levelsMode: 'list', list: '0', coloring: 'uniform', color: '#000000', legend: false, selection: only, description: 'N_D - N_A = 0' })
				], 'semi:doping'));
			if (has(sd.id, 'semi.n')) ensure('semi:n', () => this.addGroup('2d', sd.id, 'Electron Density', [surf('semi.n', '1/cm^3', { description: 'electron density n', range: { manual: false, min: 0, max: 1, scale: 'log' } })], 'semi:n'));
			if (has(sd.id, 'semi.p')) ensure('semi:p', () => this.addGroup('2d', sd.id, 'Hole Density', [surf('semi.p', '1/cm^3', { description: 'hole density p', range: { manual: false, min: 0, max: 1, scale: 'log' } })], 'semi:p'));
			if (has(sd.id, 'semi.psi'))
				ensure('semi:psi', () => this.addGroup('2d', sd.id, 'Potential and Quasi-Fermi Levels', [
					newFeature('surface', { expr: 'semi.psi', unit: 'V', table: 'Rainbow', description: 'potential psi' }),
					...(has(sd.id, 'semi.phin') ? [newFeature('contour', { name: 'phi_n', expr: 'semi.phin', unit: 'V', count: 10, coloring: 'uniform', color: '#ffffff', legend: false, selection: only, description: 'electron quasi-Fermi potential' })] : []),
					...(has(sd.id, 'semi.phip') ? [newFeature('contour', { name: 'phi_p', expr: 'semi.phip', unit: 'V', count: 10, coloring: 'uniform', color: '#000000', legend: false, selection: only, description: 'hole quasi-Fermi potential' })] : [])
				], 'semi:psi'));
			// Audit F1: the primary Delta groups show the bias-induced change (what dn_eff integrates; zero in the
			// bias-independent contacts); the absolute fields vs undoped Si are secondary, ranged on the mode region.
			const modeRange: Partial<Feature> = opt && mode && has(sd.id, mode.replace(/\^2$/, '')) ? { rangeFrom: 'mode', modeExpr: mode } : {};
			if (has(sd.id, 'semi.dn_bias')) ensure('semi:dnb', () => this.addGroup('2d', sd.id, 'Delta n (bias)', [surf('semi.dn_bias', '1', { description: 'index change from the reference bias' }), ...overlay()], 'semi:dnb'));
			if (has(sd.id, 'semi.dalpha_bias')) ensure('semi:dab', () => this.addGroup('2d', sd.id, 'Delta alpha (bias)', [surf('semi.dalpha_bias', '1/cm', { description: 'absorption change from the reference bias' }), ...overlay()], 'semi:dab'));
			if (has(sd.id, 'semi.delta_n')) ensure('semi:dn', () => this.addGroup('2d', sd.id, 'Delta n vs undoped', [surf('semi.delta_n', '1', { description: 'free-carrier index change vs undoped Si', ...modeRange }), ...overlay()], 'semi:dn'));
			if (has(sd.id, 'semi.delta_alpha')) ensure('semi:dalpha', () => this.addGroup('2d', sd.id, 'Delta alpha vs undoped', [surf('semi.delta_alpha', '1/cm', { description: 'free-carrier absorption vs undoped Si', ...modeRange, range: { manual: false, min: 0, max: 1, scale: 'log' } }), ...overlay()], 'semi:dalpha'));
			const bias1d = (key: string, name: string, items: [string, string, string, ('left' | 'right')?][]) =>
				ensure(key, () => this.addGroup('1d', '', name, items.map(([exprs, unit, n, yAxis]) => newFeature('global', { dataset: 'bias', exprs, unit, name: n, yAxis: yAxis ?? 'left' })), key));
			bias1d('semi:C', "C'(V)", [['semi.C', 'pF/mm', "C'"]]);
			bias1d('semi:R', "R'(V)", [['semi.R', 'ohm*mm', "R'"]]);
			bias1d('semi:fRC', 'f_RC(V)', [['semi.fRC', 'GHz', 'f_RC']]);
			bias1d('semi:dneff', 'dn_eff(V)', [['semi.dneff', '1', 'dn_eff']]);
			bias1d('semi:dalpha1d', 'd alpha(V)', [['semi.dalpha_dB', '1', 'd alpha']]);
			bias1d('semi:vpil', 'VpiL(V)', [['semi.VpiL', 'V*cm', 'single arm, secant'], ['semi.VpiL_diff', 'V*cm', 'single arm, small signal'], ['semi.VpiL_pp', 'V*cm', 'push-pull']]);
		}
		// Sweep: the study's targeted quantity (with its paper points), else the first of VpiL, Z0, C present.
		const sw = opts.sweep;
		const pick = opts.sweepMetric && sw && opts.sweepMetric.name in sw ? [opts.sweepMetric.name, opts.sweepMetric.unit] : sw ? ([['VpiL', 'V*cm'], ['Z0', 'ohm'], ['C', 'pF/m']] as const).find(([n]) => n in sw) : null;
		if (pick) ensure('sweep', () => this.addGroup('1d', '', 'Sweep', [newFeature('global', { exprs: pick[0], unit: pick[1], dataset: 'sweep' })], 'sweep'));
	}
}
