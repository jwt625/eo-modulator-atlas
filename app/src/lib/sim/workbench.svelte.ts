// Workbench state (runes). One instance per /sim page. Holds the canonical YAML text, run/mesh/sweep jobs, results,
// fields, graphics settings and the timestamped log. Large typed arrays live in $state.raw (never proxied).
import { inspectConfig } from '../../../../engine/src/config.mjs';
import type { Geometry, ParsedConfig, StageContext } from '../../../../engine/src/config.mjs';
import { stageCompatibility, sanitizeStages } from '../../../../engine/src/stage-compat.mjs';
import type { SimulationResult } from '../../../../engine/src/run.mjs';
import { applyOverrides, deleteIn, getIn, setIn, splitPath } from './yamlEdit';
import { parseSweepValues } from './sweepValues';
import { unitOf } from './units';
import { SweepPool, type SweepJob } from './pool';
import { enumerateSweep } from '../../../../engine/src/sweep.mjs';
import type { FieldMesh, WorkerOut } from './types';
import { Results } from './results.svelte';
import { PostCache } from './plots.svelte';
import { PostClient } from './post/client';
import type { DatasetInfo, PointSolution, VariableInfo } from './post/contract';
import { GLOBAL_VARIABLES, METRIC_GLOBAL } from './post/ui';
import { semiOf, type SemiResult } from './semi';

export const OPTIONAL = [
	{ id: 'optical_mode', label: 'Optical mode' },
	{ id: 'eo_overlap', label: 'EO overlap' },
	{ id: 'rf_line', label: 'RF line' },
	{ id: 'loaded_line', label: 'Loaded line' },
	{ id: 'eo_response', label: 'EO response' },
	{ id: 'semiconductor', label: 'Semiconductor' }
] as const;

/** Toolbar label of a stage id. */
export const stageLabel = (id: string): string => (OPTIONAL as readonly { id: string; label: string }[]).find((s) => s.id === id)?.label ?? (id === 'electrostatics' ? 'Electrostatics' : id);

export const MESH_LEVELS = [
	{ value: 4, label: 'Extra coarse (4x edge)' },
	{ value: 2, label: 'Coarse (2x edge)' },
	{ value: 1, label: 'Configured' },
	{ value: 0.5, label: 'Fine (1/2 edge)' }
];

export type Tool = 'pan' | 'zoombox' | 'select' | 'measure' | 'cutline' | 'cutpoint';

export interface LogEntry {
	t: number;
	level: 'info' | 'warn' | 'error';
	msg: string;
}

export interface SweepRow {
	index: number;
	/** Swept values of this point (one entry per axis). */
	values: Record<string, number>;
	/** First-axis value (plot x). */
	value: number;
	status: 'pending' | 'running' | 'done' | 'error' | 'cancelled';
	metrics: Record<string, number> | null;
	/** SI run globals of the point (engine runGlobals; Global plots and evaluations). */
	globals: Record<string, number> | null;
	error: string | null;
	ms: number | null;
	reused: { mesh: boolean; electrostatics: boolean } | null;
}

export function clock(t: number): string {
	const d = new Date(t);
	const p = (n: number, w = 2) => String(n).padStart(w, '0');
	return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

type Parsed = { config: ParsedConfig | null; error: string; stages: Record<string, string | null> | null; context: StageContext | null };

export class Workbench {
	text = $state('');
	section = $state('geometry');
	selected = $state<string[]>([]);
	meshScale = $state(1);
	node = $state('model');
	/** Settings panel view; selecting a tree node shows its settings (COMSOL behavior). */
	settingsTab = $state<'settings' | 'yaml'>('settings');
	loading = $state(false);
	busy = $state<null | 'run' | 'mesh'>(null);
	progress = $state('');
	error = $state('');
	missingConfig = $state(false);
	result = $state.raw<SimulationResult | null>(null);
	mesh = $state.raw<FieldMesh | null>(null);
	meshMs = $state<number | null>(null);
	runKey = $state('');
	builtMeshKey = $state('');
	runWavelengthUm = $state<number | null>(null);
	overrides = $state<[string, number | string][]>([]);
	log = $state<LogEntry[]>([]);
	progressRows = $state<LogEntry[]>([]);
	bottomTab = $state<'messages' | 'progress' | 'log' | 'table'>('messages');
	// graphics
	/** Graphics view: 'geometry', 'mesh' or a plot group id (COMSOL: the selected plot group is shown). */
	view = $state<string>('geometry');
	meshColor = $state<'material' | 'size' | 'quality'>('material');
	tool = $state<Tool>('pan');
	wire = $state(false);
	showWindows = $state(true);
	domainLabels = $state(false);
	ruler = $state<{ ax: number; ay: number; bx: number; by: number } | null>(null);
	highlight = $state<{ regions: string[]; electrodes: string[] } | null>(null);
	/** Transient highlight while hovering a tree node. */
	hoverHighlight = $state<{ regions: string[]; electrodes: string[] } | null>(null);
	zoomRequest = $state<{ kind: 'extents' | 'window'; n: number }>({ kind: 'extents', n: 0 });
	paintInfo = $state<{ afterResultMs: number; quantity: string } | null>(null);
	resultAt = 0;
	// results (DevLog-032): the solution stays in the run worker; the main thread holds display meshes only.
	results = new Results();
	cache = new PostCache();
	post = $state.raw<PostClient | null>(null);
	meshes = $state.raw<Record<string, FieldMesh>>({});
	vars = $state.raw<Record<string, VariableInfo[]>>({});
	/** Color range shown per plot feature (prefill of the manual range). */
	ranges = $state.raw<Record<string, { min: number; max: number }>>({});
	/** SI run globals of the shown result (engine runGlobals). */
	runGlobals = $state.raw<Record<string, number> | null>(null);
	/** Wall time from the result message to the registry being ready (ms). */
	registryMs = $state<number | null>(null);
	// sweep
	sweepStudy = $state('');
	sweepAxis = $state('');
	sweepTargets = $state<{ at: Record<string, number>; metric: string; value: number; label: string }[]>([]);
	sweepPath = $state('');
	sweepSpec = $state('');
	sweepRows = $state<SweepRow[]>([]);
	sweepRunning = $state(false);
	sweepStarted = 0;
	sweepMetric = $state('');
	overlayX = $state('');
	overlayY = $state('');

	private worker: Worker | null = null;
	private meshWorker: Worker | null = null;
	private pool: SweepPool | null = null;
	/** Published text + URL overrides at load (free YAML edits = text differs from this plus form overrides). */
	baseText = '';
	/** Geometry of the displayed result / built mesh, so a stale view draws the geometry it was solved on (U4). */
	runGeometry = $state.raw<{ geometry: Geometry; armWindows: Record<string, { x_um: number[]; y_um: number[] }> | null } | null>(null);
	meshGeometry = $state.raw<{ geometry: Geometry; armWindows: Record<string, { x_um: number[]; y_um: number[] }> | null } | null>(null);
	/** Timestamped notices shown in Messages (renderer events and other runtime warnings). */
	notices = $state<LogEntry[]>([]);
	sweepKey = $state('');

	parsed: Parsed = $derived.by(() => {
		if (!this.text) return { config: null, error: '', stages: null, context: null };
		try {
			const { preview, solveError, stageErrors, stageContext } = inspectConfig(this.text, this.section);
			return { config: preview, error: solveError, stages: stageErrors, context: stageContext };
		} catch (e) {
			return { config: null, error: e instanceof Error ? e.message : String(e), stages: null, context: null };
		}
	});
	raw = $derived((this.parsed.config?.raw ?? null) as Record<string, any> | null); // eslint-disable-line @typescript-eslint/no-explicit-any
	/** Unexpanded source document (params, expressions, template, library keys); equals raw for plain configs. */
	source = $derived(((this.parsed.config as { source?: unknown } | null)?.source ?? this.raw) as Record<string, any> | null); // eslint-disable-line @typescript-eslint/no-explicit-any
	template = $derived(((this.parsed.config as { template?: unknown } | null)?.template ?? null) as { type: string } | null);
	geometry: Geometry | null = $derived(this.parsed.config?.geometries[this.section] ?? null);
	sections = $derived(Object.keys(this.parsed.config?.geometries ?? {}));
	runStages = $derived(OPTIONAL.map((s) => s.id).filter((id) => this.selected.includes(id)) as string[]);
	/** Optional stages offered for this config (the semiconductor stage only with a `semiconductor` block). */
	stageList = $derived(OPTIONAL.filter((s) => s.id !== 'semiconductor' || this.raw?.semiconductor != null));
	/** The semiconductor stage is selected (no electrostatics; optical_mode and eo_response may run with it). */
	semiSelected = $derived(this.selected.includes('semiconductor'));
	/**
	 * DevLog-043: per-stage state from the engine rule set (stage-compat.mjs) for the current selection, config and
	 * section; the only source of the toolbar, Study, Bias Sweep and Model Builder stage states.
	 */
	compat = $derived(stageCompatibility(this.selected, this.parsed.context));
	/** Semiconductor stage result of the shown run (DevLog-039), or null. */
	semi: SemiResult | null = $derived(semiOf(this.result));
	currentKey = $derived(JSON.stringify([this.text, this.section, this.runStages, this.meshScale]));
	stale = $derived(this.result !== null && this.currentKey !== this.runKey);
	blocked = $derived(this.compat.invalid.map((x) => x.stage));
	/** Raw geometry block path of the current section. */
	geometryPath = $derived(this.section === 'geometry' ? 'geometry' : `alt_geometries.${this.section}`);
	meshKey = $derived(
		JSON.stringify([this.geometry, this.raw ? this.rawAt(this.geometryPath)?.mesh ?? null : null, this.raw?.optics?.eo?.arm_windows ?? null, this.meshScale])
	);
	meshStale = $derived(this.mesh !== null && this.builtMeshKey !== this.meshKey);
	canRun = $derived(!this.busy && !this.sweepRunning && !this.loading && !!this.geometry && !this.parsed.error && this.blocked.length === 0);
	/** Inputs of a sweep (text, section, mesh level, stages, study or path and values). */
	currentSweepKey = $derived(JSON.stringify([this.text, this.section, this.meshScale, this.runStages, this.sweepStudy, this.sweepPath, this.sweepSpec]));
	sweepStale = $derived(this.sweepRows.length > 0 && !this.sweepRunning && this.sweepKey !== this.currentSweepKey);
	/** Default pool min(4, hardwareConcurrency - 1) (shared machine); `?pool=N` sets it, never above hardwareConcurrency - 1. */
	poolSize(points: number): number {
		const hc = Math.max(1, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2) - 1);
		const cap = Number(typeof location !== 'undefined' ? new URLSearchParams(location.search).get('pool') : NaN);
		const want = Number.isInteger(cap) && cap > 0 ? cap : 4;
		return Math.max(1, Math.min(points, hc, want));
	}
	/** Swept axes of the current sweep rows (first axis is the plot x). */
	get sweepAxes(): string[] {
		return this.sweepRows.length ? Object.keys(this.sweepRows[0].values) : [];
	}
	/** Display unit of a swept axis: the params unit, else the key suffix (sims/SPEC.md). */
	axisUnit(key: string): string {
		const name = key.replace(/^params\.([^.]+)\.value$/, '$1');
		const u = (this.raw?.params?.[name]?.unit as string | undefined) ?? (key === 'meshScale' ? 'x edge' : unitOf(key));
		return u === 'um' ? 'µm' : u ?? '';
	}
	axisLabel(key: string): string {
		const u = this.axisUnit(key);
		const name = key.replace(/^params\.([^.]+)\.value$/, '$1');
		return u ? `${name} (${u})` : name;
	}
	geometrySnapshot() {
		return this.geometry ? { geometry: $state.snapshot(this.geometry) as Geometry, armWindows: (this.raw?.optics?.eo?.arm_windows ? $state.snapshot(this.raw.optics.eo.arm_windows) : null) as Record<string, { x_um: number[]; y_um: number[] }> | null } : null;
	}
	addNotice(msg: string, level: LogEntry['level'] = 'warn') {
		this.notices = [...this.notices.slice(-20), { t: Date.now(), level, msg }];
		this.addLog(msg, level);
		this.bottomTab = 'messages';
	}
	sweepDone = $derived(this.sweepRows.filter((r) => r.status !== 'pending' && r.status !== 'running').length);

	/** Why a stage cannot be selected now (readiness on its run path or a conflict), or why a selected one cannot run. */
	stageError(id: string): string | null {
		return this.compat.stages[id]?.blocked ?? null;
	}

	/** What the stage is on the current path (e.g. the semiconductor stage's own optical mode), or null. */
	stageNote(id: string): string | null {
		return this.compat.stages[id]?.note ?? null;
	}

	/** Readiness of optical_mode / eo_response with the semiconductor stage (Bias Sweep page), or null. */
	semiReadiness(id: string): string | null {
		return this.parsed.context?.semiReadiness?.[id] ?? null;
	}

	/**
	 * Stages of a freshly loaded config (no `stages` in the URL): the config `chain` stages that can run together
	 * (engine sanitizeStages); the others are logged with their reason (DevLog-043).
	 */
	seedStages() {
		const chain = ((this.raw?.chain ?? []) as string[]).filter((s) => s !== 'electrostatics');
		if (!chain.length || !this.parsed.context) return;
		const { kept, dropped } = sanitizeStages(chain, this.parsed.context);
		this.selected = kept;
		if (kept.length) this.addLog(`Stages from the config chain: ${kept.join(', ')}`);
		for (const d of dropped) this.addLog(`Config chain: ${stageLabel(d.stage)} not selected (${d.reason})`, 'warn');
	}

	/** Stages of a link (`stages=` scoped to this config): sanitized; the dropped ones are reported. Returns them. */
	applyUrlStages(stages: string[]): string[] {
		const ctx = this.parsed.context;
		const { kept, dropped } = ctx ? sanitizeStages(stages, ctx) : { kept: [], dropped: stages.map((s) => ({ stage: s, reason: this.parsed.error || 'the config does not parse' })) };
		this.selected = kept;
		for (const d of dropped) this.addNotice(`Link stages: ${stageLabel(d.stage)} not selected (${d.reason})`);
		return dropped.map((d) => d.stage);
	}

	/** Text and section the selection was last checked against (cause of a deselection in the log). */
	private seenText = '';
	private seenSection = 'geometry';

	/**
	 * DevLog-043 R2: after a YAML / form edit (including textarea undo and redo), a section change or a selection
	 * change, deselect the stages that can no longer run, with a Messages entry naming the cause and reason. Skipped
	 * while the whole input does not pass the input boundary (typing in the YAML tab does not clear the selection;
	 * Compute is blocked then anyway).
	 */
	enforceCompatibility() {
		const cause = this.text !== this.seenText ? 'YAML edit' : this.section !== this.seenSection ? `Section ${this.section}` : 'Stage selection';
		this.seenText = this.text;
		this.seenSection = this.section;
		if (!this.parsed.config || this.parsed.error || !this.parsed.context) return;
		const { kept, dropped } = sanitizeStages(this.selected, this.parsed.context);
		if (!dropped.length) return;
		this.selected = kept;
		if (cause === 'YAML edit') this.editDeselected = [...new Set([...this.editDeselected, ...dropped.map((d) => d.stage)])];
		for (const d of dropped) this.addNotice(`${cause}: ${stageLabel(d.stage)} deselected (${d.reason})`);
	}

	/** Stages deselected by YAML edits (F4a: an undo restores the text, not the selection; the undo says which can run again). */
	private editDeselected: string[] = [];

	/** YAML-tab undo / redo (native textarea history): logged, naming the stages that can run again but stay deselected. */
	noteYamlHistory(kind: 'undo' | 'redo') {
		queueMicrotask(() => {
			const again = this.editDeselected.filter((s) => !this.selected.includes(s) && !this.stageError(s));
			if (again.length) this.addNotice(`YAML ${kind}: text restored; ${again.map(stageLabel).join(', ')} can run again but ${again.length > 1 ? 'stay' : 'stays'} deselected (a deselection is not reversed; re-select to include)`);
			else this.addLog(`YAML ${kind}`);
		});
	}

	/**
	 * DevLog-036 round 2 (S9): a stage the engine adds as a dependency of a selected stage (eo_response adds
	 * optical_mode and rf_line, or loaded_line on a periodic_t_rail line; with the semiconductor stage only rf_line on
	 * line.rf_section); null when not added. From the engine rule set.
	 */
	stageAuto(id: string): string | null {
		const st = this.compat.stages[id];
		if (id === 'electrostatics' || !st?.impliedBy) return null;
		if (this.compat.path === 'semiconductor') return `Runs on line.rf_section (${String(this.raw?.line?.rf_section ?? '-')}) as a dependency of EO response after the Semiconductor stage`;
		return 'Runs as a dependency of EO response (added by the engine)';
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	rawAt(path: string, doc: unknown = this.raw): any {
		let v: unknown = doc;
		for (const k of splitPath(path)) v = v == null ? undefined : (v as Record<string | number, unknown>)[k];
		return v;
	}

	addLog(msg: string, level: LogEntry['level'] = 'info') {
		const e = { t: Date.now(), level, msg };
		this.log = [...this.log.slice(-499), e];
		if (level === 'error') this.bottomTab = 'messages';
	}

	/** Checkbox change: only a stage that is not blocked (readiness or conflict, engine rule set) can be added. */
	toggleStage(id: string, on: boolean) {
		if (!on) {
			this.selected = this.selected.filter((s) => s !== id);
			return;
		}
		const why = this.stageError(id);
		if (why) {
			this.addLog(`${stageLabel(id)} not selected: ${why}`, 'warn');
			return;
		}
		this.selected = [...new Set([...this.selected, id])];
	}

	/**
	 * DevLog-043 R3: reset every per-config state on a config switch (stage selection, mesh level, form overrides,
	 * sweep definitions and rows, selections, plot groups, results, view and page pickers, messages). Kept as global
	 * preferences: theme, renderer, worker pool, panel sizes, graphics display toggles, tree collapse state, the log.
	 */
	resetConfigState() {
		this.stopAll();
		this.text = '';
		this.baseText = '';
		this.section = 'geometry';
		this.selected = [];
		this.meshScale = 1;
		this.node = 'model';
		this.settingsTab = 'settings';
		this.result = null;
		this.mesh = null;
		this.meshMs = null;
		this.runKey = '';
		this.builtMeshKey = '';
		this.runWavelengthUm = null;
		this.error = '';
		this.progress = '';
		this.progressRows = [];
		this.notices = [];
		this.overrides = [];
		this.view = 'geometry';
		this.ruler = null;
		this.highlight = null;
		this.hoverHighlight = null;
		this.paintInfo = null;
		this.resultAt = 0;
		this.results.reset();
		this.clearSolution();
		this.ranges = {};
		this.runGlobals = null;
		this.runGeometry = null;
		this.meshGeometry = null;
		this.sweepStudy = '';
		this.sweepAxis = '';
		this.sweepTargets = [];
		this.sweepPath = '';
		this.sweepSpec = '';
		this.sweepRows = [];
		this.sweepKey = '';
		this.sweepMetric = '';
		this.overlayX = '';
		this.overlayY = '';
		this.sweepJobs = [];
		this.points = {};
		this.eoPoint = this.modesPoint = this.rfPoint = this.derivedPoint = -1;
		this.seenText = '';
		this.seenSection = 'geometry';
		this.editDeselected = [];
	}

	/** Load a fetched config text (all per-config state reset first) and apply URL overrides. */
	load(text: string, overrides: [string, number | string][] = []) {
		this.resetConfigState();
		let t = text;
		if (overrides.length) {
			try {
				t = applyOverrides(text, overrides);
				this.overrides = overrides;
				this.addLog(`Applied ${overrides.length} URL override(s): ${overrides.map(([k, v]) => `${k}=${v}`).join(', ')}`);
			} catch (e) {
				this.addLog(`URL overrides not applied: ${e instanceof Error ? e.message : e}`, 'warn');
			}
		}
		this.text = t;
		this.baseText = t;
		this.seenText = t;
		this.zoomRequest = { kind: 'extents', n: this.zoomRequest.n + 1 };
	}

	/** Form edit: set a YAML path in the canonical text (comments and layout preserved). */
	edit(path: string, value: number | string | boolean) {
		try {
			this.text = setIn(this.text, splitPath(path), value);
			if (typeof value !== 'boolean') this.overrides = [...this.overrides.filter(([k]) => k !== path), [path, value]];
			this.addLog(`Set ${path} = ${value}`);
		} catch (e) {
			this.addLog(`Edit of ${path} failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Form edit of a numeric list (e.g. semiconductor.bias.values_v), written as a YAML sequence. */
	editList(path: string, values: number[]) {
		try {
			this.text = setIn(this.text, splitPath(path), values);
			this.addLog(`Set ${path} = [${values.join(', ')}]`);
		} catch (e) {
			this.addLog(`Edit of ${path} failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Form field cleared: remove the key from the YAML (U16). */
	clear(path: string) {
		try {
			this.text = deleteIn(this.text, splitPath(path));
			this.overrides = this.overrides.filter(([k]) => k !== path);
			this.addLog(`Removed ${path}`);
		} catch (e) {
			this.addLog(`Removal of ${path} failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** True when the text has edits that the shareable link cannot carry (free YAML-tab edits or removals). */
	get hasFreeEdits(): boolean {
		try {
			return applyOverrides(this.baseText, this.overrides) !== this.text;
		} catch {
			return true;
		}
	}

	/** Drop the held solution (worker terminated with stopWorker). */
	clearSolution() {
		this.post?.dispose();
		this.post = null;
		this.meshes = {};
		this.vars = {};
		this.points = {};
		this.registryMs = null;
		this.results.clear();
		this.cache.reset(this.results.gen);
	}

	// ---- sweep point solutions (Parametric dataset, fields on demand) ----
	/** Status of the field solution of each sweep point loaded in the solution worker. */
	points = $state.raw<Record<number, { status: 'loading' | 'ready' | 'error'; error?: string; datasets?: DatasetInfo[] }>>({});
	/** Sweep job messages of the last sweep (point fields are recomputed from them). */
	sweepJobs: SweepJob[] = [];

	/** Run global of the study's targeted quantity (default Sweep plot), with its display unit. */
	get sweepMetricGlobal(): { name: string; unit: string } | null {
		const m = this.sweepTargets[0]?.metric;
		const g = m ? METRIC_GLOBAL[m] : null;
		const v = g ? GLOBAL_VARIABLES.find((x) => x.name === g[0]) : null;
		return v ? { name: v.name, unit: v.displayUnit } : null;
	}

	/** A worker for Results requests: the solution worker, or a post-only worker when no solution is held. */
	private ensurePostWorker(): PostClient {
		if (this.post) return this.post;
		const w = this.newWorker();
		this.worker = w;
		const client = new PostClient(w);
		this.post = client;
		w.onmessage = (ev: MessageEvent<WorkerOut>) => {
			if (this.worker !== w) return;
			const d = ev.data;
			if (d.type === 'post') client.handle(d);
			else if (d.type === 'progress') {
				this.progress = d.message;
				this.addLog(d.message);
			}
		};
		w.postMessage({ type: 'idle' });
		return client;
	}

	/** Parameter value of the pages that are not plot groups (COMSOL: every view selects its solution; -1 = last Compute). */
	eoPoint = $state(-1);
	modesPoint = $state(-1);
	rfPoint = $state(-1);
	derivedPoint = $state(-1);

	/** Values of the swept axes (or the numeric form overrides) of the last Compute, from the text it ran on. */
	get computeValues(): Record<string, number> {
		const out: Record<string, number> = {};
		const text = (() => {
			try {
				return (JSON.parse(this.runKey || '[]') as unknown[])[0] as string;
			} catch {
				return '';
			}
		})();
		const axes = this.sweepAxes.length ? this.sweepAxes : this.overrides.filter(([, v]) => typeof v === 'number').map(([k]) => k);
		for (const k of axes) {
			const name = k.replace(/^params\.([^.]+)\.value$/, '$1');
			let v: unknown;
			if (k === 'meshScale') v = this.result?.meshScale;
			else if (this.result?.params && name in this.result.params) v = this.result.params[name];
			else if (text) {
				try {
					v = getIn(text, splitPath(k.includes('.') ? k : `params.${k}.value`));
				} catch {
					v = undefined;
				}
			}
			if (typeof v === 'number') out[k] = v;
		}
		return out;
	}
	/** Parameter values of a solution as text with units: 'gap_um = 3 µm'. */
	solutionValues(point: number): string {
		const vals = point >= 0 ? (this.sweepRows[point]?.values ?? {}) : this.computeValues;
		return Object.entries(vals).map(([k, v]) => { const u = this.axisUnit(k); return `${k.replace(/^params\.([^.]+)\.value$/, '$1')} = ${Number(v.toPrecision(6))}${u ? ` ${u}` : ''}`; }).join(', ');
	}
	/** Explicit solution label (COMSOL: the solution / parameter value of a view): 'Compute (gap_um = 3 µm)'. */
	solutionLabel(point: number): string {
		const v = this.solutionValues(point);
		return point >= 0 ? `Sweep point ${point + 1}${v ? ` (${v})` : ''}` : `Compute${v ? ` (${v})` : ''}`;
	}
	/** Resolves when the field solution of sweep point i is loaded (computed on demand). */
	pointReady(i: number): Promise<void> {
		if (i < 0 || this.points[i]?.status === 'ready') return Promise.resolve();
		this.ensurePoint(i);
		return new Promise((resolve, reject) => {
			const t = setInterval(() => {
				const st = this.points[i]?.status;
				if (st === 'ready') { clearInterval(t); resolve(); }
				else if (st === 'error' || !st) { clearInterval(t); reject(new Error(this.points[i]?.error ?? 'sweep point fields not available')); }
			}, 50);
		});
	}

	/** Fields of sweep point i (recomputed in the worker on first use; at most 2 kept). */
	ensurePoint(i: number) {
		if (this.points[i]?.status === 'loading' || this.points[i]?.status === 'ready') return;
		const job = this.sweepJobs.find((j) => j.index === i);
		if (!job) {
			this.points = { ...this.points, [i]: { status: 'error', error: 'no sweep job for this point (run the sweep again)' } };
			return;
		}
		const client = this.ensurePostWorker();
		this.points = { ...this.points, [i]: { status: 'loading' } };
		const at = Object.entries(this.sweepRows[i]?.values ?? {}).map(([k, v]) => `${k} = ${v}`).join(', ');
		this.addLog(`Sweep point ${i + 1} (${at}): computing its field solution`);
		const t0 = performance.now();
		const msg = job.msg.type === 'run' || job.msg.type === 'point' ? { ...job.msg, pointIndex: i } : job.msg;
		client
			.request<PointSolution>({ op: 'loadPoint', job: msg })
			.then((r) => {
				if (this.post !== client) return;
				this.meshes = { ...this.meshes, ...r.meshes };
				// Points evicted by the worker's LRU (2 kept) are marked unloaded.
				const kept = Object.fromEntries(Object.entries(this.points).filter(([k, v]) => Number(k) === i || v.status !== 'ready').slice(-3));
				this.points = { ...kept, [i]: { status: 'ready', datasets: r.datasets } };
				const done = `Sweep point ${i + 1} field solution ${r.reused ? 'reused' : `ready in ${Math.round(performance.now() - t0)} ms`}`;
				// H4: the status bar must not keep the worker's last progress message once the fields are ready.
				this.progress = done;
				this.addLog(done);
			})
			.catch((e: unknown) => {
				this.points = { ...this.points, [i]: { status: 'error', error: e instanceof Error ? e.message : String(e) } };
				if (this.post === client) this.progress = `Sweep point ${i + 1} fields failed`;
				this.addLog(`Sweep point ${i + 1} fields failed: ${e instanceof Error ? e.message : e}`, 'error');
			});
	}

	/** True when a worker holds a solution (smoke: worker count). */
	get holdsSolution(): boolean {
		return !!this.post;
	}

	/** Display mesh of a dataset (by its mesh id). */
	meshOf(ds: DatasetInfo | null, point = -1): FieldMesh | null {
		return ds?.mesh ? (this.meshes[point >= 0 ? `sweep:${point}/${ds.mesh}` : ds.mesh] ?? null) : null;
	}

	/** Mesh of the shown solution for the Mesh view: electrostatic, else the semiconductor device mesh (S8). */
	get solvedMesh(): FieldMesh | null {
		return this.meshes.es ?? this.meshes.semi ?? null;
	}

	has(ds: string, name: string): boolean {
		return !!this.vars[ds]?.some((v) => v.name === name);
	}

	private stopWorker() {
		this.post?.dispose();
		this.post = null;
		if (this.worker) {
			this.worker.onmessage = null;
			this.worker.onerror = null;
			this.worker.terminate();
		}
		this.worker = null;
		if (this.busy === 'run') this.busy = null;
	}

	private stopMeshWorker() {
		if (this.meshWorker) {
			this.meshWorker.onmessage = null;
			this.meshWorker.terminate();
		}
		this.meshWorker = null;
		if (this.busy === 'mesh') this.busy = null;
	}

	stopAll() {
		this.stopWorker();
		this.stopMeshWorker();
		this.cancelSweep(false);
	}

	cancel() {
		const what = this.busy;
		if (what === 'run') this.stopWorker();
		if (what === 'mesh') this.stopMeshWorker();
		if (what) {
			this.progress = 'Cancelled';
			this.addLog(`Cancelled ${what === 'run' ? 'solve' : 'mesh build'}`, 'warn');
		}
		if (this.sweepRunning) this.cancelSweep(true);
	}

	private newWorker(): Worker {
		return new Worker(new URL('../sim.worker.ts', import.meta.url), { type: 'module' });
	}

	buildMesh() {
		if (this.busy || this.sweepRunning || !this.geometry) return;
		const snap = this.geometrySnapshot();
		this.stopMeshWorker();
		const key = this.meshKey;
		const started = performance.now();
		this.busy = 'mesh';
		this.progress = 'Building mesh';
		this.progressRows = [{ t: Date.now(), level: 'info', msg: 'Building mesh' }];
		this.addLog(`Build mesh: ${this.section}, mesh level ${this.meshScale}`);
		try {
			const w = this.newWorker();
			this.meshWorker = w;
			w.onmessage = (ev: MessageEvent<WorkerOut>) => {
				if (this.meshWorker !== w) return;
				const d = ev.data;
				if (d.type === 'mesh') {
					this.mesh = d.mesh;
					this.meshMs = d.ms;
					this.builtMeshKey = key;
					this.meshGeometry = snap;
					const nT = d.mesh.tri.length / 3;
					this.progress = 'Mesh built';
					this.addLog(`Mesh built: ${d.mesh.x.length.toLocaleString()} nodes, ${nT.toLocaleString()} triangles in ${Math.round(performance.now() - started)} ms`);
					if (this.view === 'geometry') this.view = 'mesh';
				} else if (d.type === 'error') {
					this.error = d.message;
					this.progress = 'Mesh build stopped';
					this.addLog(`Mesh build failed: ${d.message}`, 'error');
				}
				if (d.type !== 'progress') this.stopMeshWorker();
			};
			w.onerror = (ev) => {
				if (this.meshWorker !== w) return;
				this.error = ev.message || 'Worker failed';
				this.addLog(this.error, 'error');
				this.stopMeshWorker();
			};
			w.postMessage({ type: 'mesh', text: this.text, section: this.section, meshScale: this.meshScale });
		} catch (e) {
			this.error = String(e);
			this.stopMeshWorker();
		}
	}

	compute() {
		if (!this.canRun) return;
		this.stopWorker();
		this.error = '';
		this.result = null;
		this.clearSolution();
		this.paintInfo = null;
		this.busy = 'run';
		this.progress = 'Starting solver';
		this.runKey = this.currentKey;
		this.runGeometry = this.geometrySnapshot();
		const wl = Number(this.raw?.optics?.wavelength_nm);
		this.runWavelengthUm = Number.isFinite(wl) ? wl / 1000 : null;
		const started = performance.now();
		let last = started;
		const stages = $state.snapshot(this.runStages) as string[];
		this.progressRows = [{ t: Date.now(), level: 'info', msg: `Compute: ${this.section}, stages ${this.compat.run.join(', ')}${this.compat.path === 'mode_only' ? ' (mode only)' : ''}, mesh level ${this.meshScale}` }];
		this.addLog(this.progressRows[0].msg);
		try {
			const w = this.newWorker();
			this.worker = w;
			w.onmessage = (ev: MessageEvent<WorkerOut>) => {
				if (this.worker !== w) return;
				const d = ev.data;
				const now = performance.now();
				if (d.type === 'post') {
					this.post?.handle(d);
					return;
				}
				if (d.type === 'progress') {
					this.progress = d.message;
					const row = { t: Date.now(), level: 'info' as const, msg: `${d.message} (previous step ${Math.round(now - last)} ms)` };
					last = now;
					this.progressRows = [...this.progressRows, row];
					this.addLog(d.message);
					return;
				}
				if (d.type === 'result') {
					this.resultAt = now;
					this.result = d.result;
					this.runGlobals = d.globals ?? null;
					this.progress = 'Cross-section solve complete';
					this.progressRows = [...this.progressRows, { t: Date.now(), level: 'info', msg: `Complete in ${Math.round(now - started)} ms (engine ${Math.round(d.result.elapsed_ms)} ms)` }];
					this.addLog(`Solve complete in ${Math.round(now - started)} ms wall (engine elapsed ${Math.round(d.result.elapsed_ms)} ms)${d.result.reused?.electrostatics ? '; electrostatics reused from the previous run' : ''}`);
					if (d.meshes && d.datasets) {
						// The worker keeps the solution and serves Results requests (DevLog-030 P1).
						this.busy = null;
						this.adoptSolution(w, d.meshes, d.datasets);
						return;
					}
				} else if (d.type === 'error') {
					this.error = d.message;
					this.progress = 'Solve stopped';
					this.addLog(`Solve failed: ${d.message}`, 'error');
				}
				this.stopWorker();
			};
			w.onerror = (ev) => {
				if (this.worker !== w) return;
				this.error = ev.message || 'Worker failed';
				this.progress = 'Solve stopped';
				this.addLog(this.error, 'error');
				this.stopWorker();
			};
			w.postMessage({ type: 'run', text: this.text, section: this.section, stages, meshScale: this.meshScale, fields: true, keep: true });
		} catch (e) {
			this.error = String(e);
			this.progress = 'Solve stopped';
			this.stopWorker();
		}
	}

	/** A worker now holds a solution: datasets, variable registry, default plot groups. */
	private async adoptSolution(w: Worker, meshes: Record<string, FieldMesh>, datasets: DatasetInfo[]) {
		const t0 = performance.now();
		const client = new PostClient(w);
		this.post = client;
		this.meshes = meshes;
		this.results.setSolution(datasets);
		this.cache.reset(this.results.gen);
		try {
			const lists = await Promise.all(datasets.map((ds) => client.request<VariableInfo[]>({ op: 'variables', dataset: ds.id })));
			if (this.post !== client) return;
			this.vars = Object.fromEntries(datasets.map((ds, i) => [ds.id, lists[i]]));
			this.registryMs = performance.now() - t0;
			const before = new Set(this.results.groups.map((g) => g.id));
			this.results.defaults((ds, v) => this.has(ds, v), { rf: !!this.result?.rf?.sweep, response: !!this.result?.response, bloch: !!this.result?.loaded?.lossless?.sweep, sweep: this.sweepRows.find((r) => r.globals)?.globals ?? null, sweepMetric: this.sweepMetricGlobal, semi: this.semiDefaults() });
			// F3: the defaults are part of the new solution's baseline, not an undo step.
			this.results.rebase();
			const added = this.results.groups.filter((g) => !before.has(g.id));
			if (added.length) this.addLog(`Default plot groups: ${added.map((g) => g.name).join(', ')}`);
			if (this.view === 'geometry' || this.view === 'mesh' || !this.results.group(this.view)) {
				// S8: a semiconductor solve opens on its first own group (Net Doping), not the optical mode
				const first = (this.semi ? this.results.groups.find((g) => g.auto === 'semi:doping') : null) ?? this.results.groups.find((g) => g.kind === '2d');
				if (first) this.view = first.id;
			}
		} catch (e) {
			this.addLog(`Results registry failed: ${e instanceof Error ? e.message : e}`, 'error');
		}
	}

	/** Semiconductor regions of the solved device mesh (materials of the `semiconductor` block), for the default selection. */
	private semiDefaults(): { regions: string[] } | null {
		if (!this.semi) return null;
		const m = this.meshes.semi;
		const mats = new Set(Object.keys((this.rawAt('semiconductor.materials') as Record<string, unknown> | undefined) ?? {}));
		if (!m) return { regions: [] };
		const mm = m.regionMaterials ?? [];
		return { regions: m.regionNames.filter((_, i) => mats.has(mm[i] ?? '')) };
	}

	notePaint(quantity: string) {
		if (!this.resultAt || this.paintInfo) return;
		const ms = performance.now() - this.resultAt;
		this.paintInfo = { afterResultMs: ms, quantity };
		this.addLog(`First field paint (${quantity}) ${ms.toFixed(1)} ms after the result arrived`);
	}

	// ---- parametric sweep ----

	/** Studies declared in the config (`study` or `studies`), by name. */
	get configStudies(): string[] {
		const raw = this.raw;
		if (!raw) return [];
		if (raw.studies && typeof raw.studies === 'object') return Object.keys(raw.studies);
		if (raw.study && typeof raw.study === 'object') return [String(raw.study.name ?? 'study')];
		return [];
	}

	runSweep() {
		if (this.sweepRunning || !this.canRun) return;
		const fail = (m: string) => {
			this.error = m;
			this.addLog(m, 'error');
		};
		const stages = $state.snapshot(this.runStages) as string[];
		// DevLog-042: sweep points report run globals, which the semiconductor stage does not produce; its bias sweep runs in Compute.
		if (stages.includes('semiconductor')) {
			fail('Sweep: parametric sweeps of the semiconductor stage are not available (its bias sweep runs in Compute; per-bias values are on the Bias sweep dataset)');
			return;
		}
		const base = { section: this.section, meshScale: this.meshScale };
		let jobs: SweepJob[] = [];
		let axisValues: Record<string, number>[] = [];
		let label = '';
		this.sweepTargets = [];
		try {
			if (this.sweepStudy) {
				// Config study: the engine enumerates the points and runs each one by index (DevLog-026 sweep API).
				const e = enumerateSweep(this.text, { study: this.raw?.studies ? this.sweepStudy : null });
				axisValues = e.points.map((p) => p.values);
				jobs = e.points.map((p, i) => ({ index: i, msg: { type: 'point', text: this.text, study: e.study, index: p.index, section: e.section ?? this.section, meshScale: this.meshScale, stages: null } }));
				this.sweepAxis = e.axes[0]?.param ?? '';
				this.sweepTargets = e.sweepTargets.map((t) => ({ at: t.at, metric: t.metric, value: t.value, label: String((t.source as Record<string, unknown> | undefined)?.device_id ?? (t.source as Record<string, unknown> | undefined)?.locator ?? 'sweep target') }));
				if (this.sweepTargets.length) this.sweepMetric = this.sweepTargets[0].metric;
				label = `study ${e.study}: ${e.axes.map((a) => `${a.param} x ${a.values.length}`).join(', ')}${e.stages ? `, stages ${e.stages.join(', ')}` : ''}`;
			} else {
				const values = parseSweepValues(this.sweepSpec);
				const path = this.sweepPath.trim();
				if (!path) throw new Error('choose a parameter or YAML path');
				const param = path.match(/^params\.([A-Za-z_][\w]*)\.value$/)?.[1] ?? null;
				this.sweepAxis = path;
				axisValues = values.map((v) => ({ [path]: v }));
				jobs = values.map((value, index) => {
					const meshScale = path === 'meshScale' ? value : this.meshScale;
					const text = path === 'meshScale' || param ? this.text : applyOverrides(this.text, [[path, value]]);
					return { index, msg: { type: 'run', text, ...base, meshScale, stages, fields: false, ...(param ? { params: { [param]: value } } : {}) } };
				});
				label = `${path}: ${values.length} points, stages electrostatics${stages.length ? ', ' + stages.join(', ') : ''}`;
			}
		} catch (e) {
			fail(`Sweep: ${e instanceof Error ? e.message : e}`);
			return;
		}
		this.error = '';
		this.sweepJobs = jobs;
		if (this.post) void this.post.request({ op: 'clearPoints' }).catch(() => {});
		this.points = {};
		this.sweepRows = axisValues.map((values, index) => ({ index, values, value: Object.values(values)[0] ?? NaN, status: 'pending', metrics: null, globals: null, error: null, ms: null, reused: null }));
		this.sweepRunning = true;
		this.sweepKey = this.currentSweepKey;
		this.sweepStarted = performance.now();
		const size = this.poolSize(jobs.length);
		this.progress = `Sweep 0/${jobs.length}`;
		this.addLog(`Sweep ${label} on ${size} worker(s)`);
		this.progressRows = [{ t: Date.now(), level: 'info', msg: `Sweep ${label}, ${size} workers` }];
		const n = jobs.length;
		this.pool = new SweepPool(size);
		this.pool.run(jobs, {
			onStart: (i) => this.patchRow(i, { status: 'running' }),
			onResult: (i, out, ms) => {
				this.patchRow(i, out.error ? { status: 'error', error: out.error, ms } : { status: 'done', metrics: out.metrics, globals: out.globals ?? null, ms, reused: out.reused ?? null });
				const at = Object.entries(axisValues[i]).map(([k, v]) => `${k} = ${v}`).join(', ');
				const msg = `Sweep point ${i + 1}/${n} (${at}) ${out.error ? `failed: ${out.error}` : `done in ${Math.round(ms)} ms${out.reused?.electrostatics ? ', electrostatics reused' : ''}`}`;
				this.progressRows = [...this.progressRows, { t: Date.now(), level: out.error ? 'error' : 'info', msg }];
				this.addLog(msg, out.error ? 'warn' : 'info');
				this.progress = `Sweep ${this.sweepDone}/${n}`;
				if (!this.sweepMetric && out.metrics) this.sweepMetric = Object.keys(out.metrics).find((k) => k.startsWith('vpi')) ?? Object.keys(out.metrics)[0] ?? '';
			},
			onDone: () => {
				this.sweepRunning = false;
				this.pool = null;
				this.progress = `Sweep complete (${this.sweepRows.filter((r) => r.status === 'done').length}/${n} points)`;
				this.addLog(`Sweep finished in ${Math.round(performance.now() - this.sweepStarted)} ms wall`);
				this.results.defaults((ds, v) => this.has(ds, v), { rf: !!this.result?.rf?.sweep, response: !!this.result?.response, bloch: !!this.result?.loaded?.lossless?.sweep, sweep: this.sweepRows.find((r) => r.globals)?.globals ?? null, sweepMetric: this.sweepMetricGlobal, semi: this.semiDefaults() });
				this.results.rebase();
			}
		});
	}

	private patchRow(i: number, patch: Partial<SweepRow>) {
		this.sweepRows = this.sweepRows.map((r) => (r.index === i ? { ...r, ...patch } : r));
	}

	cancelSweep(log = true) {
		if (!this.pool) return;
		this.pool.cancel();
		this.pool = null;
		this.sweepRunning = false;
		this.sweepRows = this.sweepRows.map((r) => (r.status === 'pending' || r.status === 'running' ? { ...r, status: 'cancelled', error: 'cancelled' } : r));
		if (log) {
			this.progress = 'Sweep cancelled';
			this.addLog('Sweep cancelled; finished points kept', 'warn');
		}
	}
}
