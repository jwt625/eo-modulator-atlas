<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { ui } from '../state.svelte';
	import { createRenderer, Canvas2DRenderer, GlRenderer, type FieldRenderer, type View, type DrawState, type Layer, type ArrowSet } from './renderer';
	import { autoRange, locate, meshBBox, pointInPoly, triMinAngle, triSize } from './fieldmath';
	import { materialColor } from './colormap';
	import { linearTicks, tickLabel } from './ticks';
	import { downloadDataUrl } from './exportUtil';
	import { drawLegend, legendTip, LEGEND_W, type LegendSpec } from './colorbar';
	import { arrowGrid, atOf, autoTitle, contourLevels, contourValues, featureRange, meshIndex, regionMask, sampleAt, smoothed, type ArrowGrid } from './layers';
	import type { Entry } from './plots.svelte';
	import type { Feature } from './results.svelte';
	import type { DerivedResult, ModeRow, PlotResult } from './post/contract';
	import { StaleError } from './post/client';
	import { prettyUnit } from './post/ui';
	import type { Workbench, Tool } from './workbench.svelte';
	import type { FieldMesh } from './types';
	import Plot1D from './Plot1D.svelte';
	import Icon from './Icon.svelte';
	import { modesRequest, plotRequest, probeRequest, solOf } from './requests';

	let { wb }: { wb: Workbench } = $props();

	let box: HTMLDivElement;
	let glCanvas: HTMLCanvasElement;
	let overlay: HTMLCanvasElement;
	let renderer: FieldRenderer | null = null;
	let rendererKind = $state<'webgl2' | 'canvas2d' | ''>('');
	let rendererInfo = $state('');
	let W = $state(400);
	let H = $state(300);
	let dpr = 1;
	let view: View = { cx: 0, cy: 0, scale: 10 };
	let probe = $state('');
	let hoverRegion: { kind: 'region' | 'electrode'; index: number } | null = null;
	let drag: { x: number; y: number; cx: number; cy: number } | null = null;
	/** Rubber band of the active tool (zoom box, measure, cut line), world µm. */
	let band = $state<{ ax: number; ay: number; bx: number; by: number } | null>(null);
	let frames = 0;
	let paints = $state(0);
	let raf = 0;
	let lastFrameMs = $state(0);
	let lostNotice = $state('');
	let lostTimer: ReturnType<typeof setTimeout> | null = null;
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { d: number; cx: number; cy: number } | null = null;
	let exportOpen = $state(false);
	let exW = $state(1600);
	let exH = $state(1000);
	let exLegend = $state(true);
	let exTitle = $state(true);

	const R = $derived(wb.results);
	const group = $derived(R.group(wb.view));
	/** Parameter value of the shown group: -1 = last Compute, else a sweep point (fields on demand). */
	const point = $derived(group && group.kind === '2d' ? group.point : -1);
	const pointReady = $derived(point < 0 || wb.points[point]?.status === 'ready');
	$effect(() => {
		if (point >= 0) untrack(() => wb.ensurePoint(point));
	});
	const is1d = $derived(group?.kind === '1d');
	const dark = $derived(ui.theme !== 'light');

	// ---- evaluated layers of the shown 2D plot group ----
	interface Planned {
		f: Feature;
		ds: string;
		mesh: FieldMesh | null;
		main: Entry<PlotResult> | null;
		ax: Entry<PlotResult> | null;
		ay: Entry<PlotResult> | null;
		regions: string[] | null;
	}
	const planned: Planned[] = $derived.by(() => {
		if (!group || group.kind !== '2d') return [];
		const out: Planned[] = [];
		for (const f of group.features) {
			if (!f.visible) continue;
			const ds = f.dataset || group.dataset;
			const info = (point >= 0 ? wb.points[point]?.datasets?.find((d) => d.id === ds) : null) ?? R.dataset(ds);
			const mesh = wb.meshOf(info, point);
			const regions = R.selectionRegions(f.selection);
			const pend = { status: 'pending' as const };
			const plot = (expr: string, unit: string, slot: string) =>
				!expr.trim() ? null : !pointReady ? pend : wb.cache.get<PlotResult>(wb.post, R.gen, plotRequest(R, group, f, expr, unit), slot);
			const needsExpr = f.type === 'surface' || f.type === 'contour' || f.type === 'maxmin';
			out.push({
				f, ds, mesh, regions,
				main: needsExpr ? plot(f.expr, f.unit, `plot:${f.id}`) : null,
				ax: f.type === 'arrow' ? plot(f.xExpr, '', `plot:${f.id}:x`) : null,
				ay: f.type === 'arrow' ? plot(f.yExpr, '', `plot:${f.id}:y`) : null
			});
		}
		return out;
	});
	/** Display unit actually used per feature (worker reply), for titles and legends. */
	const units = $derived(Object.fromEntries(planned.filter((p) => p.main?.data).map((p) => [p.f.id, p.main!.data!.unit])));
	const errors = $derived(planned.flatMap((p) => [p.main, p.ax, p.ay].filter((e) => e?.status === 'error').map((e) => `${p.f.name}: ${e!.error}`)));
	const pending = $derived(planned.some((p) => [p.main, p.ax, p.ay].some((e) => e?.status === 'pending')));
	/** Mode label of an optical dataset ('k=1 (TE0), n_eff 1.96574', engine mode table labels). */
	function modeText(ds: string): string {
		const d = (point >= 0 ? wb.points[point]?.datasets?.find((x) => x.id === ds) : null) ?? R.dataset(ds);
		if (!d?.nModes || !pointReady) return '';
		// G3: the mode of this dataset in the shown solution (sweep points: chosen for that point, else its solved mode).
		const rows = wb.cache.get<ModeRow[]>(wb.post, R.gen, modesRequest(ds, point))?.data;
		const k = R.modeFor(ds, solOf(group)) ?? rows?.find((r) => r.selected)?.k;
		const row = rows?.find((r) => r.k === k);
		return row ? `${row.label ?? `k=${k}`}, n_eff ${row.neff.toFixed(5)}` : '';
	}
	const pointText = $derived(point >= 0 ? Object.entries(wb.sweepRows[point]?.values ?? {}).map(([k, v]) => `${wb.axisLabel(k).replace(/ \(.*\)$/, '')} = ${tickLabel(Number(v.toPrecision(6)))}`).join(', ') : '');
	const title = $derived(group && group.kind === '2d' ? autoTitle(group, (id) => { const m = modeText(id); return `${R.dsLabel(id)}${m ? `, ${m}` : ''}${pointText ? ` (${pointText})` : ''}`; }, units) : '');

	/** Arrow grid of a feature: per view (re-gridded on pan/zoom), per dataset or per selection bounding box. */
	const arrowMemo = new WeakMap<Float64Array, { key: string; grid: ArrowGrid }>();
	function arrowsOf(a: Built['arrows'][number], v: View, w = W, h = H): ArrowGrid {
		const f = a.f;
		let box: { x0: number; x1: number; y0: number; y1: number } | undefined;
		if (f.placement === 'view') box = { x0: v.cx - w / 2 / v.scale, x1: v.cx + w / 2 / v.scale, y0: v.cy - h / 2 / v.scale, y1: v.cy + h / 2 / v.scale };
		else if (f.placement === 'selection' && a.mask) {
			let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
			const m = a.mesh;
			for (let t = 0; t < m.tri.length / 3; t++) {
				if (!a.mask[m.triRegion[t]]) continue;
				for (let k = 0; k < 3; k++) { const n = m.tri[3 * t + k]; x0 = Math.min(x0, m.x[n]); x1 = Math.max(x1, m.x[n]); y0 = Math.min(y0, m.y[n]); y1 = Math.max(y1, m.y[n]); }
			}
			if (Number.isFinite(x0)) box = { x0, x1, y0, y1 };
		}
		const key = `${box ? [box.x0, box.x1, box.y0, box.y1].map((q) => q.toPrecision(7)).join() : 'mesh'}|${f.gridX}|${f.gridY}|${f.lengthMode}|${f.scaleFactor}`;
		const hit = arrowMemo.get(a.x.values);
		if (hit && hit.key === key) return hit.grid;
		const grid = arrowGrid(a.mesh, a.x, a.y, f, a.mask, box);
		arrowMemo.set(a.x.values, { key, grid });
		return grid;
	}

	// Mesh view (Mesh node): material, element size or minimum angle.
	const meshView = $derived(wb.view === 'mesh' ? (wb.meshes.es ?? wb.mesh) : null);
	const meshStatMemo = new WeakMap<FieldMesh, { size: Float64Array; angle: Float64Array }>();
	function meshStat(m: FieldMesh) {
		let s = meshStatMemo.get(m);
		if (!s) meshStatMemo.set(m, (s = { size: triSize(m), angle: triMinAngle(m) }));
		return s;
	}

	interface Built {
		layers: Layer[];
		arrows: { f: Feature; mesh: FieldMesh; x: PlotResult; y: PlotResult; mask: Uint8Array | null; color: string; heads: boolean }[];
		legends: LegendSpec[];
		markers: { x: number; y: number; text: string; kind: 'max' | 'min' }[];
		lines: { regions: string[] | null; color: string }[];
		nTris: number;
		ranges: Record<string, { min: number; max: number }>;
	}
	const built: Built = $derived.by(() => {
		const out: Built = { layers: [], arrows: [], legends: [], markers: [], lines: [], nTris: 0, ranges: {} };
		const regionColors = (m: FieldMesh) => m.regionNames.map((n, i) => materialColor(m.regionMaterials?.[i] ?? shown?.geometry.regions.find((r) => r.name === n)?.material ?? n, n.startsWith('electrode:')));
		if (meshView) {
			out.nTris = meshView.tri.length / 3;
			if (wb.meshColor === 'material') out.layers.push({ kind: 'region', mesh: meshView, regionColors: regionColors(meshView), wire: true, wireColor: dark ? '#e8e8e8' : '#202020' });
			else {
				const v = meshStat(meshView)[wb.meshColor === 'size' ? 'size' : 'angle'];
				const range = autoRange(v, 'linear');
				out.layers.push({ kind: 'surface', mesh: meshView, values: v, at: 'tri', scaleMode: 'linear', range, colormap: 'Viridis', wire: true, wireColor: dark ? '#e8e8e8' : '#202020' });
				out.legends.push({ title: wb.meshColor === 'size' ? 'Element size' : 'Min angle', unit: wb.meshColor === 'size' ? 'µm' : 'deg', range, scale: 'linear', table: 'Viridis', reverse: false });
			}
			return out;
		}
		for (const p of planned) {
			const f = p.f;
			if (f.type === 'line') {
				out.lines.push({ regions: p.regions, color: f.color });
				continue;
			}
			if (!p.mesh) continue;
			if (f.type === 'arrow') {
				const x = p.ax?.data, y = p.ay?.data;
				const mesh = x ? (wb.meshes[x.mesh] ?? p.mesh) : null;
				// '' = theme ink color (recomputed on theme toggle; also used by the image export).
				const color = f.color || (dark ? '#f2f1ec' : '#0b0b0b');
				if (x && y && mesh && x.mesh === y.mesh) out.arrows.push({ f, mesh, x, y, mask: regionMask(mesh, p.regions), color, heads: f.heads });
				continue;
			}
			const d = p.main?.data;
			if (!d) continue;
			// The plot values refer to their own display mesh (P2: the refined mesh), not necessarily the dataset mesh.
			const mesh = wb.meshes[d.mesh] ?? p.mesh;
			if (!out.nTris) out.nTris = mesh.tri.length / 3;
			const range = featureRange(f, d);
			out.ranges[f.id] = range;
			const mask = regionMask(mesh, p.regions);
			const dataRange = f.dataRange.manual && f.dataRange.max > f.dataRange.min ? { min: f.dataRange.min, max: f.dataRange.max } : null;
			const legendTitle = f.description || f.expr;
			const sampler = (x: number, y: number) => {
				const loc = locate(mesh, meshIndex(mesh), x, y);
				return loc ? { v: sampleAt(mesh, d, x, y), region: mesh.triRegion[loc.t] } : null;
			};
			if (f.type === 'surface') {
				const sv = f.smoothing === 'nodal' ? smoothed(mesh, d) : { values: d.values, at: atOf(d.location) };
				out.layers.push({ kind: 'surface', mesh, values: sv.values, at: sv.at, scaleMode: f.range.scale, range, colormap: f.table, reverse: f.reverse, regionMask: mask, dataRange, sampler, wire: wb.wire, wireColor: dark ? '#e8e8e8' : '#202020' });
				if (f.legend) out.legends.push({ title: legendTitle, unit: prettyUnit(d.unit), range, scale: f.range.scale, table: f.table, reverse: f.reverse });
			} else if (f.type === 'contour') {
				const cv = contourValues(mesh, d);
				out.layers.push({ kind: 'contour', mesh, values: cv.values, at: cv.at, scaleMode: f.range.scale, range, colormap: f.table, reverse: f.reverse, levels: contourLevels(f, range), uniform: f.coloring === 'uniform' ? f.color : null, regionMask: mask, dataRange });
				if (f.legend && f.coloring === 'table') out.legends.push({ title: legendTitle, unit: prettyUnit(d.unit), range, scale: f.range.scale, table: f.table, reverse: f.reverse });
			} else if (f.type === 'maxmin') {
				const u = prettyUnit(d.unit);
				if (f.show !== 'min' && d.maxAt) out.markers.push({ x: d.maxAt[0], y: d.maxAt[1], kind: 'max', text: `max ${tickLabel(Number(d.max.toPrecision(4)))} ${u}` });
				if (f.show !== 'max' && d.minAt) out.markers.push({ x: d.minAt[0], y: d.minAt[1], kind: 'min', text: `min ${tickLabel(Number(d.min.toPrecision(4)))} ${u}` });
			}
		}
		return out;
	});

	// U4: geometry drawn with a result is the geometry it was solved on.
	const shown = $derived.by(() => {
		if (wb.view === 'mesh' && !wb.meshes.es && wb.mesh && wb.meshGeometry) return wb.meshGeometry;
		if (group && wb.result && wb.runGeometry) return wb.runGeometry;
		return wb.geometry ? { geometry: wb.geometry, armWindows: (wb.raw?.optics?.eo?.arm_windows ?? null) as Record<string, { x_um: number[]; y_um: number[] }> | null } : null;
	});
	const staleTag = $derived((group && wb.stale) || (wb.view === 'mesh' && !wb.meshes.es && wb.meshStale) ? 'stale' : '');
	const plotMs = $derived(planned.find((p) => p.main?.ms != null)?.main?.ms ?? null);
	const viewChoices = $derived([
		{ value: 'geometry', label: 'Geometry' },
		...(wb.meshes.es || wb.mesh ? [{ value: 'mesh', label: 'Mesh' }] : []),
		...R.groups.map((g) => ({ value: g.id, label: g.name }))
	]);

	// ---- coordinates ----
	function toWorld(px: number, py: number) {
		return { x: view.cx + (px - W / 2) / view.scale, y: view.cy - (py - H / 2) / view.scale };
	}
	const X = (x: number) => W / 2 + (x - view.cx) * view.scale;
	const Y = (y: number) => H / 2 - (y - view.cy) * view.scale;

	function fit(b: { x: number[]; y: number[] } | null | undefined) {
		if (!b) return;
		const w = Math.max(b.x[1] - b.x[0], 1e-6), h = Math.max(b.y[1] - b.y[0], 1e-6);
		// Room for the title line at the top and the color legends at the right (X15: legends outside the data).
		const top = title ? 22 : 0;
		const scale = Math.min((W - 24) / w, (H - 24 - top) / h);
		view = { cx: (b.x[0] + b.x[1]) / 2, cy: (b.y[0] + b.y[1]) / 2 + top / 2 / scale, scale };
		schedule();
	}
	/** Zoom extents: the union of the shown datasets' meshes (COMSOL: dataset extents), else the geometry domain. */
	function zoomExtents() {
		const ms = group && group.kind === '2d' ? planned.map((p) => p.mesh).filter((m): m is FieldMesh => !!m) : [];
		if (ms.length) {
			let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
			for (const m of ms) {
				const b = meshBBox(m);
				x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1);
			}
			fit({ x: [x0, x1], y: [y0, y1] });
		} else fit((shown?.geometry ?? wb.geometry)?.domain);
	}
	function zoomWindow() {
		// The window of the first optical/arm dataset of the shown plot group, else the optical window.
		const ds = group ? planned.map((p) => R.dataset(p.ds)).find((d) => d && (d.kind === 'opt' || d.kind === 'arm')) : null;
		const m = wb.meshOf(ds ?? null);
		const b = m ? meshBBox(m) : null;
		const g = shown?.geometry ?? wb.geometry;
		fit(b ? { x: [b.x0, b.x1], y: [b.y0, b.y1] } : (g?.optical_window ?? g?.domain));
	}

	function schedule() {
		if (!raf) raf = requestAnimationFrame(frame);
	}
	function frame() {
		raf = 0;
		const t0 = performance.now();
		draw();
		lastFrameMs = performance.now() - t0;
	}

	let arrowCount = $state(0);
	function arrowSets(v: View, w = W, h = H): ArrowSet[] {
		let n = 0;
		const sets = built.arrows.map((a) => {
			const grid = arrowsOf(a, v, w, h);
			n += grid.n;
			const inst = new Float32Array(grid.data.length);
			for (let i = 0; i < inst.length; i += 4) {
				inst[i] = grid.data[i];
				inst[i + 1] = grid.data[i + 1];
				inst[i + 2] = grid.data[i + 2];
				inst[i + 3] = grid.data[i + 3] * v.scale;
			}
			return { inst, color: a.color, heads: a.heads };
		});
		if (n !== arrowCount) queueMicrotask(() => (arrowCount = n));
		return sets;
	}

	function css(name: string, fallback: string) {
		const v = getComputedStyle(box).getPropertyValue(name).trim();
		return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
	}

	function drawState(v: View = view, w = W, h = H): DrawState {
		return { view: v, background: css('--bg', '#0d0d0d'), layers: built.layers, arrows: arrowSets(v, w, h) };
	}

	function draw() {
		if (!renderer || renderer.isLost()) {
			drawOverlay(overlay.getContext('2d')!, W, H, view, dpr);
			return;
		}
		renderer.draw(drawState());
		frames++;
		paints = frames;
		drawOverlay(overlay.getContext('2d')!, W, H, view, dpr);
		if (built.layers.some((l) => l.kind === 'surface') && group) wb.notePaint(group.name);
	}

	function polyPath(ctx: CanvasRenderingContext2D, poly: number[][], Xf: (x: number) => number, Yf: (y: number) => number) {
		ctx.beginPath();
		poly.forEach(([x, y], i) => (i ? ctx.lineTo(Xf(x), Yf(y)) : ctx.moveTo(Xf(x), Yf(y))));
		ctx.closePath();
	}
	const rectPoly = (r: { x: number[]; y: number[] }) => [[r.x[0], r.y[0]], [r.x[1], r.y[0]], [r.x[1], r.y[1]], [r.x[0], r.y[1]]];
	function centroid(poly: number[][]): [number, number] {
		let a = 0, cx = 0, cy = 0;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
			a += f;
			cx += (poly[j][0] + poly[i][0]) * f;
			cy += (poly[j][1] + poly[i][1]) * f;
		}
		return Math.abs(a) > 1e-18 ? [cx / (3 * a), cy / (3 * a)] : [poly[0][0], poly[0][1]];
	}

	/** Selection shown highlighted: the Selection node, or the selection of the active feature / derived value. */
	const activeSel = $derived.by(() => {
		const n = wb.node;
		if (n.startsWith('sel:')) return R.selections.find((s) => s.id === n.slice(4)) ?? null;
		if (n.startsWith('pf:')) {
			const [, gid, fid] = n.split(':');
			const f = R.feature(gid, fid);
			return f?.selection ? (R.selections.find((s) => s.id === f.selection) ?? null) : null;
		}
		if (n.startsWith('dv:')) {
			const d = R.derived.find((x) => x.id === n.slice(3));
			return d && d.kind.startsWith('surface') && d.target ? (R.selections.find((s) => s.id === d.target) ?? null) : null;
		}
		return null;
	});
	/** Cut lines / points of the active node (drawn emphasised) and all others (thin). */
	const activeCut = $derived(wb.node.startsWith('ds:') ? wb.node.slice(3) : '');

	function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, v: View, scaleDpr: number, opts: { legend?: boolean; title?: boolean; exportMode?: boolean } = {}) {
		const Xf = (x: number) => w / 2 + (x - v.cx) * v.scale;
		const Yf = (y: number) => h / 2 - (y - v.cy) * v.scale;
		ctx.setTransform(scaleDpr, 0, 0, scaleDpr, 0, 0);
		if (!opts.exportMode) ctx.clearRect(0, 0, w, h);
		const g = shown?.geometry ?? null;
		const ink = dark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
		const geometryOnly = wb.view === 'geometry' || (!group && wb.view !== 'mesh');
		if (g) {
			const edges = geometryOnly || wb.view === 'mesh' || !!group?.edges;
			if (edges) {
				for (const r of g.regions) {
					polyPath(ctx, r.poly, Xf, Yf);
					if (geometryOnly) {
						ctx.fillStyle = materialColor(r.material);
						ctx.fill();
					}
					ctx.strokeStyle = `${ink}${geometryOnly ? 0.25 : 0.35})`;
					ctx.lineWidth = 1;
					ctx.stroke();
				}
				const esShown = wb.view === 'mesh' || planned.some((p) => R.dataset(p.ds)?.kind === 'es');
				for (const e of g.electrodes) {
					polyPath(ctx, e.poly, Xf, Yf);
					if (geometryOnly || esShown) {
						ctx.fillStyle = materialColor(e.material, true);
						ctx.fill();
					}
					ctx.strokeStyle = '#f3d58f';
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			}
			// Line features: region boundaries (all, or of the feature's selection).
			for (const l of built.lines) {
				ctx.strokeStyle = l.color;
				ctx.lineWidth = 1.5;
				for (const r of g.regions) if (!l.regions || l.regions.includes(r.name)) { polyPath(ctx, r.poly, Xf, Yf); ctx.stroke(); }
			}
			if (wb.showWindows) {
				ctx.setLineDash([5, 4]);
				ctx.lineWidth = 1;
				const wins: [string, { x: number[]; y: number[] }][] = [];
				if (g.optical_window) wins.push(['optical window', g.optical_window]);
				for (const [k, win] of Object.entries(shown?.armWindows ?? {}) as [string, { x_um: number[]; y_um: number[] }][]) {
					if (!win?.x_um || !win?.y_um) continue;
					const same = wins.find(([, o]) => o.x[0] === win.x_um[0] && o.x[1] === win.x_um[1] && o.y[0] === win.y_um[0] && o.y[1] === win.y_um[1]);
					if (same) same[0] = `${same[0]} = arm ${k}`;
					else wins.push([`arm ${k}`, { x: win.x_um, y: win.y_um }]);
				}
				for (const [label, win] of wins) {
					ctx.strokeStyle = label.startsWith('optical window') ? '#5bb5c9' : '#c9a227';
					polyPath(ctx, rectPoly(win), Xf, Yf);
					ctx.stroke();
					ctx.fillStyle = ctx.strokeStyle;
					ctx.font = '10px system-ui, sans-serif';
					ctx.fillText(label, Xf(win.x[0]) + 2, Yf(win.y[1]) - 3);
				}
				ctx.setLineDash([]);
			}
			const fillSel = (names: string[], electrodes: string[], dashed: boolean) => {
				ctx.fillStyle = 'rgba(57,135,229,0.35)';
				ctx.strokeStyle = '#3987e5';
				ctx.lineWidth = 2;
				if (dashed) ctx.setLineDash([4, 3]);
				for (const r of g.regions.filter((r) => names.includes(r.name))) { polyPath(ctx, r.poly, Xf, Yf); if (!dashed) ctx.fill(); ctx.stroke(); }
				for (const e of g.electrodes.filter((e) => electrodes.includes(e.name))) { polyPath(ctx, e.poly, Xf, Yf); if (!dashed) ctx.fill(); ctx.stroke(); }
				ctx.setLineDash([]);
			};
			if (!opts.exportMode) {
				if (wb.highlight) fillSel(wb.highlight.regions, wb.highlight.electrodes, false);
				if (activeSel) fillSel(activeSel.regions, [], false);
				if (wb.hoverHighlight) fillSel(wb.hoverHighlight.regions, wb.hoverHighlight.electrodes, true);
				if (hoverRegion) {
					const poly = hoverRegion.kind === 'region' ? g.regions[hoverRegion.index]?.poly : g.electrodes[hoverRegion.index]?.poly;
					if (poly) {
						polyPath(ctx, poly, Xf, Yf);
						ctx.strokeStyle = `${ink}0.9)`;
						ctx.lineWidth = 1.5;
						ctx.stroke();
					}
				}
			}
			if (wb.domainLabels) {
				ctx.font = '10px system-ui, sans-serif';
				ctx.textAlign = 'center';
				for (const r of [...g.regions, ...g.electrodes]) {
					const [cx, cy] = centroid(r.poly);
					const px = Xf(cx), py = Yf(cy);
					if (px < 0 || px > w || py < 0 || py > h) continue;
					ctx.lineWidth = 3;
					ctx.strokeStyle = dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)';
					ctx.strokeText(r.name, px, py);
					ctx.fillStyle = dark ? '#f2f1ec' : '#0b0b0b';
					ctx.fillText(r.name, px, py);
				}
				ctx.textAlign = 'left';
			}
		}
		// Cut lines and cut points (datasets).
		{
			for (const c of R.cutLines) {
				const on = c.id === activeCut;
				ctx.strokeStyle = '#e0803a';
				ctx.lineWidth = on ? 2 : 1;
				ctx.beginPath();
				ctx.moveTo(Xf(c.ax), Yf(c.ay));
				ctx.lineTo(Xf(c.bx), Yf(c.by));
				ctx.stroke();
				ctx.fillStyle = '#e0803a';
				if (on) { ctx.fillRect(Xf(c.ax) - 3, Yf(c.ay) - 3, 6, 6); ctx.fillRect(Xf(c.bx) - 3, Yf(c.by) - 3, 6, 6); }
			}
			for (const c of R.cutPoints) {
				const on = c.id === activeCut;
				ctx.strokeStyle = '#e0803a';
				ctx.lineWidth = on ? 2 : 1;
				const px = Xf(c.x), py = Yf(c.y);
				ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); ctx.moveTo(px, py - 5); ctx.lineTo(px, py + 5); ctx.stroke();
			}
		}
		// Max/min markers.
		for (const m of built.markers) {
			const px = Xf(m.x), py = Yf(m.y);
			ctx.fillStyle = m.kind === 'max' ? '#d8452a' : '#2b8fe0';
			ctx.strokeStyle = dark ? '#000' : '#fff';
			ctx.lineWidth = 1;
			ctx.beginPath(); ctx.moveTo(px, py - 6); ctx.lineTo(px + 5, py + 3); ctx.lineTo(px - 5, py + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
			ctx.font = '10px system-ui, sans-serif';
			ctx.lineWidth = 3;
			ctx.strokeText(m.text, px + 7, py - 4);
			ctx.fillText(m.text, px + 7, py - 4);
		}
		// Ruler (measure) and the rubber band of the active tool.
		const rl = band && wb.tool === 'measure' ? band : wb.ruler;
		if (rl && !opts.exportMode) {
			ctx.strokeStyle = '#c160c1';
			ctx.fillStyle = '#c160c1';
			ctx.lineWidth = 1.5;
			ctx.beginPath(); ctx.moveTo(Xf(rl.ax), Yf(rl.ay)); ctx.lineTo(Xf(rl.bx), Yf(rl.by)); ctx.stroke();
			const d = Math.hypot(rl.bx - rl.ax, rl.by - rl.ay);
			ctx.font = '11px system-ui, sans-serif';
			ctx.fillText(`${tickLabel(Number(d.toPrecision(5)))} µm (dx ${tickLabel(Number((rl.bx - rl.ax).toPrecision(4)))}, dy ${tickLabel(Number((rl.by - rl.ay).toPrecision(4)))})`, Xf((rl.ax + rl.bx) / 2) + 6, Yf((rl.ay + rl.by) / 2) - 6);
		}
		if (band && !opts.exportMode && wb.tool !== 'measure') {
			ctx.strokeStyle = wb.tool === 'cutline' ? '#e0803a' : `${ink}0.8)`;
			ctx.lineWidth = 1;
			if (wb.tool === 'zoombox') {
				ctx.setLineDash([4, 3]);
				ctx.strokeRect(Xf(band.ax), Yf(band.ay), Xf(band.bx) - Xf(band.ax), Yf(band.by) - Yf(band.ay));
				ctx.setLineDash([]);
			} else {
				ctx.lineWidth = 2;
				ctx.beginPath(); ctx.moveTo(Xf(band.ax), Yf(band.ay)); ctx.lineTo(Xf(band.bx), Yf(band.by)); ctx.stroke();
			}
		}
		// Axes: frame with µm ticks on all sides, labels bottom and left (U14 collision rules).
		const w0 = { x: v.cx - w / 2 / v.scale, y: v.cy - h / 2 / v.scale }, w1 = { x: v.cx + w / 2 / v.scale, y: v.cy + h / 2 / v.scale };
		ctx.font = '10px system-ui, sans-serif';
		ctx.fillStyle = `${ink}0.7)`;
		ctx.strokeStyle = `${ink}0.5)`;
		ctx.lineWidth = 1;
		ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
		ctx.textAlign = 'center';
		// Tick labels with a halo so they stay readable over light or dark plot colors.
		const label = (t: string, x: number, y: number) => {
			ctx.save();
			ctx.lineWidth = 3;
			ctx.strokeStyle = dark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)';
			ctx.strokeText(t, x, y);
			ctx.restore();
			ctx.fillText(t, x, y);
		};
		let lastRight = -Infinity;
		for (const t of linearTicks(w0.x, w1.x, Math.max(2, Math.floor(w / 90)))) {
			const px = Math.round(Xf(t)) + 0.5;
			ctx.beginPath(); ctx.moveTo(px, h); ctx.lineTo(px, h - 5); ctx.moveTo(px, 0); ctx.lineTo(px, 4); ctx.stroke();
			const lbl = tickLabel(t);
			const half = ctx.measureText(lbl).width / 2;
			if (px - half < 40 || px + half > w - 4 || px - half < lastRight + 6) continue;
			label(lbl, px, h - 8);
			lastRight = px + half;
		}
		ctx.textAlign = 'left';
		for (const t of linearTicks(w0.y, w1.y, Math.max(2, Math.floor(h / 70)))) {
			const py = Math.round(Yf(t)) + 0.5;
			ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(5, py); ctx.moveTo(w, py); ctx.lineTo(w - 4, py); ctx.stroke();
			if (py > h - 22 || py < (title ? 24 : 10)) continue;
			label(tickLabel(t), 8, py + 3);
		}
		ctx.textAlign = 'right';
		label('x, y (µm)', w - 6, h - 22);
		ctx.textAlign = 'left';
		if (opts.title && title) {
			ctx.font = '12px system-ui, sans-serif';
			ctx.fillStyle = dark ? '#f2f1ec' : '#0b0b0b';
			ctx.fillText(title, 8, 16);
		}
		if (opts.legend) {
			let x = w - 8;
			for (const s of built.legends) {
				x -= LEGEND_W;
				drawLegend(ctx, x, 8 + (title && opts.title ? 14 : 0), LEGEND_W, Math.max(90, Math.min(300, Math.round(h * 0.55))), s, dark);
				x -= 6;
			}
		}
		if (lostNotice && !opts.exportMode) {
			ctx.fillStyle = '#fab219';
			ctx.font = '12px system-ui, sans-serif';
			ctx.fillText(lostNotice, 12, 36);
		}
	}

	// ---- colorbars (HTML canvases, one per color-table feature) ----
	let legendBox: HTMLDivElement | undefined = $state();
	function drawLegends() {
		if (!legendBox) return;
		const cs = [...legendBox.querySelectorAll('canvas')];
		const lh = Math.max(90, Math.min(260, Math.round(H * 0.55)));
		const lw = W < 500 ? 64 : LEGEND_W;
		built.legends.forEach((s, i) => {
			const c = cs[i];
			if (!c) return;
			c.width = Math.round(lw * dpr);
			c.height = Math.round(lh * dpr);
			c.style.width = `${lw}px`;
			c.style.height = `${lh}px`;
			const ctx = c.getContext('2d')!;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, lw, lh);
			drawLegend(ctx, 0, 0, lw, lh, s, dark);
			c.dataset.tip = `${legendTip(s)} (range of the displayed values)`;
		});
	}

	// ---- interaction ----
	function onWheel(ev: WheelEvent) {
		if (is1d) return;
		ev.preventDefault();
		const r = box.getBoundingClientRect();
		const px = ev.clientX - r.left, py = ev.clientY - r.top;
		const before = toWorld(px, py);
		const f = Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0015));
		view = { ...view, scale: Math.min(1e7, Math.max(1e-4, view.scale * f)) };
		const after = toWorld(px, py);
		view = { ...view, cx: view.cx + before.x - after.x, cy: view.cy + before.y - after.y };
		schedule();
	}

	function localXY(ev: PointerEvent) {
		const r = box.getBoundingClientRect();
		return { px: ev.clientX - r.left, py: ev.clientY - r.top };
	}

	function onDown(ev: PointerEvent) {
		const { px, py } = localXY(ev);
		overlay.setPointerCapture(ev.pointerId);
		pointers.set(ev.pointerId, { x: px, y: py });
		if (pointers.size === 2) {
			// Two-finger pinch zoom (U15); single-finger drag pans.
			const [a, b] = [...pointers.values()];
			pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
			drag = null;
			band = null;
			return;
		}
		const w = toWorld(px, py);
		if (wb.tool === 'zoombox' || wb.tool === 'measure' || wb.tool === 'cutline') band = { ax: w.x, ay: w.y, bx: w.x, by: w.y };
		else if (wb.tool === 'select') selectAt(w.x, w.y, ev.shiftKey || ev.ctrlKey || ev.metaKey);
		else if (wb.tool === 'cutpoint') addCutPoint(w.x, w.y);
		else drag = { x: px, y: py, cx: view.cx, cy: view.cy };
	}

	function onMove(ev: PointerEvent) {
		const { px, py } = localXY(ev);
		if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: px, y: py });
		if (pinch && pointers.size === 2) {
			const [a, b] = [...pointers.values()];
			const d = Math.hypot(a.x - b.x, a.y - b.y);
			const before = toWorld(pinch.cx, pinch.cy);
			view = { ...view, scale: Math.min(1e7, Math.max(1e-4, (view.scale * d) / Math.max(1, pinch.d))) };
			const after = toWorld((a.x + b.x) / 2, (a.y + b.y) / 2);
			view = { ...view, cx: view.cx + before.x - after.x, cy: view.cy + before.y - after.y };
			pinch = { d, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
			schedule();
			return;
		}
		if (band) {
			const w = toWorld(px, py);
			band = { ...band, bx: w.x, by: w.y };
			schedule();
			return;
		}
		if (drag) {
			view = { ...view, cx: drag.cx - (px - drag.x) / view.scale, cy: drag.cy + (py - drag.y) / view.scale };
			schedule();
			return;
		}
		updateProbe(px, py);
	}

	function onUp(ev: PointerEvent) {
		if (overlay.hasPointerCapture(ev.pointerId)) overlay.releasePointerCapture(ev.pointerId);
		pointers.delete(ev.pointerId);
		if (pinch) {
			if (pointers.size < 2) pinch = null;
			drag = null;
			return;
		}
		if (band) {
			const c = band;
			band = null;
			const long = Math.hypot(X(c.bx) - X(c.ax), Y(c.by) - Y(c.ay)) > 4;
			if (long && wb.tool === 'zoombox') fit({ x: [Math.min(c.ax, c.bx), Math.max(c.ax, c.bx)], y: [Math.min(c.ay, c.by), Math.max(c.ay, c.by)] });
			else if (long && wb.tool === 'measure') {
				wb.ruler = c;
				wb.addLog(`Measure: ${Math.hypot(c.bx - c.ax, c.by - c.ay).toPrecision(5)} µm from (${c.ax.toPrecision(4)}, ${c.ay.toPrecision(4)}) to (${c.bx.toPrecision(4)}, ${c.by.toPrecision(4)})`);
			} else if (long && wb.tool === 'cutline') addCutLine(c);
			schedule();
		}
		drag = null;
	}

	/** Dataset that a new cut line/point samples: the first dataset of the shown plot group, else the first dataset. */
	/** G1: a cut line/point drawn on a view samples that view's solution (dataset and parameter value). */
	function sourceDataset(): string {
		return planned.find((p) => p.mesh)?.ds ?? group?.dataset ?? R.datasets[0]?.id ?? '';
	}
	function addCutLine(c: { ax: number; ay: number; bx: number; by: number }) {
		const cl = R.addCutLine(sourceDataset(), { ...c, n: 500 }, undefined, point);
		wb.tool = 'pan';
		wb.node = `ds:${cl.id}`;
		wb.settingsTab = 'settings';
		wb.addLog(`${cl.name}: (${c.ax.toPrecision(4)}, ${c.ay.toPrecision(4)}) to (${c.bx.toPrecision(4)}, ${c.by.toPrecision(4)}) µm on ${R.dsLabel(cl.source)}, ${wb.solutionLabel(point)}`);
	}
	function addCutPoint(x: number, y: number) {
		const cp = R.addCutPoint(sourceDataset(), x, y, point);
		wb.tool = 'pan';
		wb.node = `ds:${cp.id}`;
		wb.settingsTab = 'settings';
		wb.addLog(`${cp.name}: (${x.toPrecision(5)}, ${y.toPrecision(5)}) µm on ${R.dsLabel(cp.source)}, ${wb.solutionLabel(point)}`);
	}

	/** Select mode: click a domain to set the active selection; shift/ctrl-click adds or removes it. */
	function selectAt(x: number, y: number, add: boolean) {
		const g = shown?.geometry;
		if (!g) return;
		let name = '';
		for (let i = g.regions.length - 1; i >= 0; i--)
			if (pointInPoly(x, y, g.regions[i].poly)) { name = g.regions[i].name; break; }
		if (!name || g.electrodes.some((e) => pointInPoly(x, y, e.poly))) return;
		// X4: the Select tool edits the active Selection node only; elsewhere it creates a new Selection node (never a
		// feature filter: applying a selection is an explicit choice in the feature's Selection field).
		let sel = wb.node.startsWith('sel:') ? (R.selections.find((q) => q.id === wb.node.slice(4)) ?? null) : null;
		if (!sel) {
			sel = R.addSelection([]);
			wb.node = `sel:${sel.id}`;
			wb.addLog(`${sel.name} created by the Select tool`);
		}
		const s = R.selections.find((q) => q.id === sel!.id)!;
		const had = s.regions.includes(name);
		s.regions = add ? (had ? s.regions.filter((r) => r !== name) : [...s.regions, name]) : [name];
		wb.addLog(`${s.name}: ${add ? (had ? `removed ${name}` : `added ${name}`) : `set to ${name}`} (${s.regions.join(', ') || 'empty'})`);
		wb.settingsTab = 'settings';
		schedule();
	}

	// Probe: exact point evaluation of the top visible feature in the worker (coalesced: one request in flight).
	let probeBusy = false;
	let probeNext: { x: number; y: number; text: string } | null = null;
	const probeFeature = $derived(planned.find((p) => p.f.type === 'surface' && p.main?.data) ?? planned.find((p) => p.main?.data) ?? null);
	function runProbe(x: number, y: number, base: string) {
		const p = probeFeature;
		if (!p || !wb.post || !group || !pointReady) {
			probe = base;
			return;
		}
		if (probeBusy) {
			probeNext = { x, y, text: base };
			return;
		}
		probeBusy = true;
		wb.post
			.request<DerivedResult>(probeRequest(R, group!, p.f, x, y), 'probe')
			.then((r) => {
				// F1: the probe evaluates the solution the group shows and names a sweep point.
				probe = Number.isFinite(r.value) ? `${base}  ${p.f.expr} ${tickLabel(Number(r.value.toPrecision(5)))}${r.unit === '1' ? '' : ` ${prettyUnit(r.unit)}`}${pointText ? ` [${pointText}]` : ''}` : base;
			})
			.catch((e) => {
				if (!(e instanceof StaleError)) probe = base;
			})
			.finally(() => {
				probeBusy = false;
				if (probeNext) {
					const n = probeNext;
					probeNext = null;
					runProbe(n.x, n.y, n.text);
				}
			});
	}

	function updateProbe(px: number, py: number) {
		const w = toWorld(px, py);
		const g = shown?.geometry ?? null;
		let regionText = '';
		let next: typeof hoverRegion = null;
		if (g) {
			const e = g.electrodes.findIndex((el) => pointInPoly(w.x, w.y, el.poly));
			if (e >= 0) { next = { kind: 'electrode', index: e }; regionText = `${g.electrodes[e].name} (${g.electrodes[e].material}, electrode)`; }
			else for (let i = g.regions.length - 1; i >= 0; i--)
				if (pointInPoly(w.x, w.y, g.regions[i].poly)) { next = { kind: 'region', index: i }; regionText = `${g.regions[i].name} (${g.regions[i].material})`; break; }
		}
		const base = `x ${w.x.toPrecision(5)} µm  y ${w.y.toPrecision(5)} µm${regionText ? `  ${regionText}` : ''}`;
		if (meshView && wb.meshColor !== 'material') {
			const loc = locate(meshView, meshIndex(meshView), w.x, w.y);
			const v = loc ? meshStat(meshView)[wb.meshColor === 'size' ? 'size' : 'angle'][loc.t] : NaN;
			probe = Number.isFinite(v) ? `${base}  ${wb.meshColor === 'size' ? 'element size' : 'min angle'} ${tickLabel(Number(v.toPrecision(4)))} ${wb.meshColor === 'size' ? 'µm' : 'deg'}` : base;
		} else runProbe(w.x, w.y, base);
		if (next?.index !== hoverRegion?.index || next?.kind !== hoverRegion?.kind) {
			hoverRegion = next;
			schedule();
		}
	}

	// ---- image export (chosen size, legend, title) ----
	function exportImage() {
		const wAll = Math.max(64, Math.min(8192, Math.round(exW))), h = Math.max(64, Math.min(8192, Math.round(exH)));
		// Legends in a gutter right of the plot (X15); the plot shows the same world window as the screen.
		const gut = exLegend && built.legends.length ? built.legends.length * (LEGEND_W + 6) + 8 : 0;
		const w = Math.max(32, wAll - gut);
		const k = Math.min(w / W, h / H);
		const v: View = { cx: view.cx, cy: view.cy, scale: view.scale * k };
		const out = document.createElement('canvas');
		out.width = wAll;
		out.height = h;
		const ctx = out.getContext('2d')!;
		ctx.fillStyle = css('--bg', '#0d0d0d');
		ctx.fillRect(0, 0, wAll, h);
		const tmp = document.createElement('canvas');
		let r2: FieldRenderer | null = renderer && !renderer.isLost() && renderer.kind === 'webgl2' ? GlRenderer.create(tmp) : null;
		if (!r2) {
			r2 = new Canvas2DRenderer(tmp);
			if (renderer?.isLost()) wb.addLog('Image rendered with the Canvas 2D renderer (WebGL context lost)', 'warn');
		}
		r2.resize(w, h, 1);
		r2.draw(drawState(v, w, h));
		ctx.drawImage(tmp, 0, 0);
		r2.dispose();
		drawOverlay(ctx, w, h, v, 1, { legend: false, title: exTitle, exportMode: true });
		if (gut) built.legends.forEach((sp, i) => drawLegend(ctx, w + 6 + i * (LEGEND_W + 6), 8, LEGEND_W, Math.max(90, Math.min(300, Math.round(h * 0.55))), sp, dark));
		const name = `${wb.raw?.id ?? 'sim'}-${wb.section}-${(group?.name ?? wb.view).replace(/[^\w.-]+/g, '_')}-${wAll}x${h}.png`;
		downloadDataUrl(name, out.toDataURL('image/png'));
		wb.addLog(`Image exported: ${name}`);
		exportOpen = false;
	}

	function useRenderer(r: FieldRenderer) {
		renderer = r;
		rendererKind = r.kind;
		rendererInfo = r.info();
		r.resize(W, H, dpr);
		schedule();
	}

	/** Replace the GL canvas with a fresh one driven by the Canvas 2D renderer (a lost context cannot give '2d'). */
	function fallbackToCanvas(reason: string) {
		if (lostTimer) clearTimeout(lostTimer);
		lostTimer = null;
		// W5: the detached GL canvas keeps no listeners, so a late restore cannot touch the new 2D canvas.
		glCanvas.removeEventListener('webglcontextlost', onContextLost);
		glCanvas.removeEventListener('webglcontextrestored', onContextRestored);
		const fresh = document.createElement('canvas');
		fresh.className = glCanvas.className;
		glCanvas.replaceWith(fresh);
		glCanvas = fresh;
		useRenderer(new Canvas2DRenderer(fresh));
		lostNotice = '';
		wb.addNotice(`Graphics switched to the Canvas 2D renderer: ${reason}`);
	}

	function onContextLost(ev: Event) {
		if (ev.target !== glCanvas) return;
		ev.preventDefault(); // allows restoration
		lostNotice = 'WebGL context lost; waiting for the browser to restore it';
		wb.addNotice('WebGL context lost; the graphics will be restored or switch to the Canvas 2D renderer');
		lostTimer = setTimeout(() => {
			if (renderer?.isLost()) fallbackToCanvas('the WebGL context was not restored within 2 s');
		}, 2000);
		schedule();
	}

	function onContextRestored(ev: Event) {
		if (ev.target !== glCanvas || renderer?.kind !== 'webgl2') return;
		if (lostTimer) clearTimeout(lostTimer);
		lostTimer = null;
		const r = GlRenderer.create(glCanvas);
		if (!r) {
			fallbackToCanvas('WebGL resources could not be recreated');
			return;
		}
		lostNotice = '';
		useRenderer(r);
		wb.addNotice('WebGL context restored; GPU buffers re-uploaded', 'info');
	}

	onMount(() => {
		const params = new URLSearchParams(location.search);
		// Diagnostics (dev server or ?debug=1): exact point value of the top feature of the shown plot group.
		if (import.meta.env.DEV || params.get('debug') === '1') {
			const w = window as unknown as Record<string, unknown>;
			w.__simProbe = async (x: number, y: number) => {
				const p = probeFeature;
				if (!p || !wb.post) return null;
				if (!group || !pointReady) return null;
				const r = await wb.post.request<DerivedResult>(probeRequest(R, group, p.f, x, y));
				return Number.isFinite(r.value) ? { value: r.value, label: `${p.f.expr} [${R.dsLabel(p.ds)}]`, unit: r.unit, dataset: p.ds, sol: solOf(group) ?? 'main' } : null;
			};
			w.__simView = () => ({ ...view, W, H });
		}
		const force = params.get('renderer') === 'canvas';
		renderer = createRenderer(glCanvas, force);
		rendererKind = renderer.kind;
		rendererInfo = renderer.info();
		wb.addLog(`Graphics renderer: ${renderer.kind} (${rendererInfo})`);
		glCanvas.addEventListener('webglcontextlost', onContextLost);
		glCanvas.addEventListener('webglcontextrestored', onContextRestored);
		const ro = new ResizeObserver(() => {
			const r = box.getBoundingClientRect();
			const first = W === 400 && H === 300;
			W = Math.max(1, Math.round(r.width));
			H = Math.max(1, Math.round(r.height));
			dpr = window.devicePixelRatio || 1;
			renderer?.resize(W, H, dpr);
			overlay.width = Math.round(W * dpr);
			overlay.height = Math.round(H * dpr);
			if (first) zoomExtents();
			drawLegends();
			schedule();
		});
		ro.observe(box);
		box.addEventListener('wheel', onWheel, { passive: false });
		return () => {
			ro.disconnect();
			glCanvas.removeEventListener('webglcontextlost', onContextLost);
			glCanvas.removeEventListener('webglcontextrestored', onContextRestored);
			if (lostTimer) clearTimeout(lostTimer);
			box.removeEventListener('wheel', onWheel);
			cancelAnimationFrame(raf);
			renderer?.dispose();
			renderer = null;
		};
	});

	// Redraw on any state the frame depends on.
	$effect(() => {
		void [built, shown, wb.highlight, wb.hoverHighlight, activeSel?.regions.length, activeSel?.regions.join(), R.cutLines.map((c) => [c.ax, c.ay, c.bx, c.by]), R.cutPoints.map((c) => [c.x, c.y]), activeCut, wb.showWindows, wb.domainLabels, wb.ruler, title, dark];
		schedule();
	});
	$effect(() => {
		void [built.legends, H, W, dark, legendBox];
		queueMicrotask(drawLegends);
	});
	$effect(() => {
		const z = wb.zoomRequest;
		if (z.n === 0 && z.kind === 'extents') return;
		// untrack: the zoom reads the displayed geometry, which must not re-trigger this request.
		untrack(() => (z.kind === 'window' ? zoomWindow() : zoomExtents()));
	});
	// Fit once when the first geometry of a config arrives.
	let fittedFor = '';
	$effect(() => {
		const id = `${wb.raw?.id ?? ''}|${wb.section}`;
		if (wb.geometry && id !== fittedFor) {
			fittedFor = id;
			untrack(zoomExtents);
		}
	});
	// COMSOL: each plot group keeps its own view; the first time a group is shown it zooms to its dataset extents.
	const views = new Map<string, View>();
	let lastView = '';
	let pendingFit = '';
	$effect(() => {
		const v = wb.view;
		const ready = (!planned.length || planned.some((p) => p.mesh)) && !pending;
		untrack(() => {
			if (v !== lastView) {
				if (lastView) views.set(lastView, view);
				lastView = v;
				const saved = views.get(v);
				if (saved) {
					view = saved;
					schedule();
					pendingFit = '';
				} else pendingFit = v;
			}
			if (pendingFit === v && ready && group) {
				pendingFit = '';
				zoomExtents();
			}
		});
	});
	// X20: a new solution keeps the plot-group views unless the solved geometry changed.
	let viewGeomKey = '';
	$effect(() => {
		void R.gen;
		untrack(() => {
			const key = JSON.stringify(wb.runGeometry?.geometry.domain ?? null) + JSON.stringify(wb.runGeometry?.geometry.regions.map((r) => r.poly) ?? null);
			if (key !== viewGeomKey) {
				viewGeomKey = key;
				views.clear();
				pendingFit = wb.view;
			}
		});
	});
	// Ranges shown per feature (manual range prefill, X9).
	$effect(() => {
		const r = built.ranges;
		untrack(() => (wb.ranges = { ...wb.ranges, ...r }));
	});
	// Keep the view valid when plot groups or the mesh disappear.
	$effect(() => {
		if (!viewChoices.some((o) => o.value === wb.view)) wb.view = 'geometry';
	});
	const TOOLS: [Tool, string, string][] = [
		['pan', 'Pan', 'Pan: drag to move, wheel to zoom (default)'],
		['zoombox', 'Zoom box', 'Zoom box: drag a rectangle to zoom to it'],
		['select', 'Select', 'Select domains: click a region to edit the active Selection node (or create one); shift-click adds or removes'],
		['measure', 'Measure', 'Measure distance: drag between two points'],
		['cutline', 'Cut line', 'Cut Line 2D: drag to create a cut-line dataset on the shown solution'],
		['cutpoint', 'Cut point', 'Cut Point 2D: click to create a cut-point dataset']
	];
</script>

<div class="gfx" data-paints={paints} data-renderer={rendererKind} data-view={wb.view} data-ntris={built.nTris} data-layers={built.layers.length} data-arrows={arrowCount} data-pending={pending} data-plot-ms={plotMs?.toFixed(1) ?? ''} data-frame-ms={lastFrameMs.toFixed(2)}>
	<div class="bar">
		<select aria-label="Graphics view" data-tip="Shown in the graphics window: geometry, mesh or a plot group" value={wb.view} onchange={(e) => (wb.view = e.currentTarget.value)}>
			{#each viewChoices as o}<option value={o.value}>{o.label}</option>{/each}
		</select>
		{#if wb.view === 'mesh'}
			<select aria-label="Mesh coloring" data-tip="Mesh coloring" value={wb.meshColor} onchange={(e) => (wb.meshColor = e.currentTarget.value as typeof wb.meshColor)}>
				<option value="material">material</option><option value="size">element size</option><option value="quality">min angle</option>
			</select>
		{/if}
		{#if !is1d}
			<span class="seg" role="group" aria-label="Graphics tool">
				{#each TOOLS as [id, label, tip]}<button class="ic" class:on={wb.tool === id} aria-pressed={wb.tool === id} aria-label={label} data-tip={tip} onclick={() => (wb.tool = wb.tool === id && id !== 'pan' ? 'pan' : id)}><Icon name={id} /></button>{/each}
			</span>
			<span class="seg">
				<button class="ic" aria-label="Extents" data-tip="Zoom extents: the shown datasets (double-click the canvas)" onclick={zoomExtents}><Icon name="extents" /></button>
				<button class="ic" aria-label="Window" data-tip="Zoom to the window of the shown optical or arm dataset (else the optical window)" onclick={zoomWindow} disabled={!wb.geometry?.optical_window}><Icon name="window" /></button>
			</span>
			<span class="seg">
				<button class="ic" class:on={wb.domainLabels} aria-pressed={wb.domainLabels} aria-label="Domain labels" data-tip="Domain labels (region and electrode names)" onclick={() => (wb.domainLabels = !wb.domainLabels)}><Icon name="labels" /></button>
				<button class="ic" class:on={wb.showWindows} aria-pressed={wb.showWindows} aria-label="Windows" data-tip="Optical and EO arm windows" onclick={() => (wb.showWindows = !wb.showWindows)}><Icon name="windows" /></button>
				<button class="ic" class:on={wb.wire} aria-pressed={wb.wire} aria-label="Mesh wireframe" data-tip="Mesh wireframe on surface plots" onclick={() => (wb.wire = !wb.wire)}><Icon name="mesh" /></button>
			</span>
			{#if wb.ruler}<button class="ic" aria-label="Clear ruler" data-tip="Remove the measurement" onclick={() => (wb.ruler = null)}><Icon name="clear" /></button>{/if}
			<button class="ic" class:on={exportOpen} aria-label="Image" data-tip="Image snapshot: PNG at a chosen size with legend and title" onclick={() => { exportOpen = !exportOpen; if (exportOpen) { exW = Math.round(W * 2); exH = Math.round(H * 2); } }}><Icon name="image" /></button>
		{/if}
		<span class="grow"></span>
		{#if pending}<span class="muted small" data-tip="Evaluating in the solution worker">evaluating</span>{/if}
		{#if group && !is1d}<span class="solchip" data-solution-label={wb.solutionLabel(point)} data-tip="Solution of this plot group (plot group Data, Parameter value)">{wb.solutionLabel(point)}</span>{/if}
		{#if staleTag}<span class="stale" data-tip="Inputs changed since this solution or mesh was computed">stale</span>{/if}
		<span class="muted num info" data-tip={`Renderer: ${rendererInfo}`}>{rendererKind}{built.nTris ? ` ${built.nTris.toLocaleString()} tri` : ''}</span>
	</div>
	<div class="stage">
	<div class="plot" bind:this={box} ondblclick={() => wb.tool === 'pan' && zoomExtents()} role="application" aria-label="Cross-section graphics">
		<canvas class="gl" bind:this={glCanvas}></canvas>
		<canvas class="ov tool-{wb.tool}" bind:this={overlay}
			onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} onpointerleave={() => { if (!drag && !band) probe = ''; }}></canvas>
		{#if title && !is1d}<div class="title" data-title={title}>{title}</div>{/if}
		{#if errors.length && !is1d}<div class="errs" role="status">{#each errors as e}<div>{e}</div>{/each}</div>{/if}
	</div>
		<div class="legends" bind:this={legendBox} class:hidden={is1d || !built.legends.length}>{#each built.legends as s, i (i)}<canvas aria-hidden="true" data-legend={s.title}></canvas>{/each}</div>
		{#if is1d && group}<div class="one"><Plot1D {wb} {group} height={Math.max(180, H - 70)} /></div>{/if}
		{#if !wb.geometry}<div class="empty muted">No geometry</div>{/if}
		{#if exportOpen}
			<div class="export" role="dialog" aria-label="Image export">
				<label>width <input type="number" min="64" max="8192" step="1" bind:value={exW} aria-label="Image width (px)" /></label>
				<label>height <input type="number" min="64" max="8192" step="1" bind:value={exH} aria-label="Image height (px)" /></label>
				<label><input type="checkbox" bind:checked={exLegend} /> legend</label>
				<label><input type="checkbox" bind:checked={exTitle} /> title</label>
				<button class="on" onclick={exportImage}>Export PNG</button>
			</div>
		{/if}
	</div>
	<div class="probe mono" data-probe={probe}>{probe || (is1d ? 'Hover a series for its values; log axes, CSV and PNG above the plot' : wb.tool === 'select' ? 'Click a domain to select it; shift-click adds or removes' : wb.tool === 'measure' ? 'Drag to measure a distance' : wb.tool === 'zoombox' ? 'Drag a rectangle to zoom' : wb.tool === 'cutline' ? 'Drag to draw a cut line' : wb.tool === 'cutpoint' ? 'Click to place a cut point' : 'Hover for x, y, value and region; drag to pan; wheel to zoom')}</div>
</div>

<style>
	.gfx { display: grid; grid-template-rows: auto minmax(0, 1fr) 20px; height: 100%; min-height: 0; min-width: 0; background: var(--surface); }
	.bar { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px 8px; height: 31px; padding: 0 6px; border-bottom: 1px solid var(--border); overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
	.bar > * { flex: none; }
	.bar .info { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.bar select { max-width: 190px; border-radius: 0; }
	.bar button { border-radius: 0; }
	.seg { display: flex; }
	.seg button { border-radius: 0; margin-left: -1px; }
	.ic { width: 26px; height: 22px; padding: 0; display: flex; align-items: center; justify-content: center; }
	.small { font-size: 11px; }
	.grow { flex: 1; }
	.solchip { flex: 0 1 auto; min-width: 0; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; color: var(--ink-2); border: 1px solid var(--border); padding: 0 4px; border-radius: 0; }
	.stale { color: var(--warn); border: 1px solid var(--warn); padding: 0 4px; border-radius: 0; }
	.stage { position: relative; min-height: 0; overflow: hidden; background: var(--bg); display: flex; }
	.plot { position: relative; flex: 1; min-width: 0; overflow: hidden; }
	.plot canvas.gl, .plot canvas.ov { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
	.ov { cursor: grab; touch-action: pan-y; }
	.ov.tool-zoombox, .ov.tool-measure, .ov.tool-cutline, .ov.tool-cutpoint { cursor: crosshair; }
	.ov.tool-select { cursor: pointer; }
	.title { position: absolute; left: 1px; top: 1px; right: 1px; height: 20px; line-height: 20px; padding: 0 7px; font-size: 12px; color: var(--ink); background: color-mix(in srgb, var(--surface) 82%, transparent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
	.legends { flex: none; display: flex; flex-direction: row-reverse; align-items: flex-start; gap: 6px; padding: 22px 6px 0; border-left: 1px solid var(--border); background: var(--bg); }
	.legends canvas { display: block; border-radius: 0; }
	.legends.hidden { display: none; }
	.errs { position: absolute; left: 8px; bottom: 26px; max-width: 70%; color: var(--crit); background: var(--surface); border: 1px solid var(--crit); padding: 2px 6px; font-size: 11px; border-radius: 0; }
	.one { position: absolute; inset: 0; background: var(--surface); overflow: auto; padding: 6px 8px; }
	.empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
	.export { position: absolute; right: 8px; top: 8px; z-index: 3; display: grid; grid-template-columns: auto auto; gap: 4px 8px; align-items: center; background: var(--surface); border: 1px solid var(--line); padding: 6px 8px; border-radius: 0; }
	.export label { display: flex; align-items: center; gap: 4px; color: var(--ink-2); }
	.export input[type='number'] { width: 70px; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); }
	.export button { grid-column: 1 / -1; border-radius: 0; }
	.probe { padding: 3px 6px; font-size: 11px; color: var(--ink-2); border-top: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	button:disabled { opacity: 0.5; cursor: default; }
</style>
