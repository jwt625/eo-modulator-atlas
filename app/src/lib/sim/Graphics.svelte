<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { ui } from '../state.svelte';
	import { createRenderer, Canvas2DRenderer, GlRenderer, type FieldRenderer, type View, type DrawState } from './renderer';
	import { autoRange, indexFor, locate, valueAt, pointInPoly, triToNode, type TriIndex, type Range } from './fieldmath';
	import { colormapLut, materialColor, type ColormapName } from './colormap';
	import { linearTicks, logTicks, tickLabel } from './ticks';
	import { opticalSets, quantityOptions, viewSpec } from './fieldsView';
	import { downloadDataUrl } from './exportUtil';
	import type { Workbench, Quantity } from './workbench.svelte';
	import type { ScalarField, ScaleMode } from './types';

	let { wb }: { wb: Workbench } = $props();

	let box: HTMLDivElement;
	let glCanvas: HTMLCanvasElement;
	let overlay: HTMLCanvasElement;
	let cbCanvas: HTMLCanvasElement;
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
	let cutDraft: { ax: number; ay: number; bx: number; by: number } | null = null;
	let frames = 0;
	let paints = $state(0);
	let raf = 0;
	let lastFrameMs = $state(0);
	let uploaded: { mesh: unknown; values: unknown; at: string } = { mesh: null, values: null, at: '' };
	let lostNotice = $state('');
	let lostTimer: ReturnType<typeof setTimeout> | null = null;
	const pointers = new Map<number, { x: number; y: number }>();
	let pinch: { d: number; cx: number; cy: number } | null = null;

	const options = $derived(quantityOptions(wb.fields, wb.mesh, wb.modeIndex, wb.opticalSet));
	const spec = $derived(viewSpec(wb.quantity, wb.fields, wb.mesh, wb.modeIndex, wb.opticalSet));
	const display: ScalarField | null = $derived.by(() => {
		const f = spec.field;
		if (!f) return null;
		// U10: smoothed element fields are labelled as such everywhere they are shown.
		return wb.smooth && f.at === 'tri' ? { ...f, values: triToNode(f.mesh, f.values), at: 'node', label: `${f.label.replace(' (per element)', '')} (smoothed)` } : f;
	});
	// U4: geometry drawn and probed with a result is the geometry it was solved on.
	const shown = $derived.by(() => {
		if (spec.mesh && wb.fields && spec.mesh !== wb.mesh && wb.runGeometry) return wb.runGeometry;
		if (spec.mesh && spec.mesh === wb.mesh && wb.meshGeometry) return wb.meshGeometry;
		return wb.geometry ? { geometry: wb.geometry, armWindows: (wb.raw?.optics?.eo?.arm_windows ?? null) as Record<string, { x_um: number[]; y_um: number[] }> | null } : null;
	});
	const scaleMode: ScaleMode = $derived(wb.scaleMode === 'auto' ? (display?.signed ? 'symmetric' : 'linear') : wb.scaleMode);
	const cmap: ColormapName = $derived(wb.colormap === 'auto' ? (display?.signed && scaleMode === 'symmetric' ? 'rdbu' : 'viridis') : wb.colormap);
	// U5: a locked range that log scale cannot use (min <= 0) falls back to the automatic log range, with a warning.
	const lockInvalid = $derived(wb.lockRange && scaleMode === 'log' && !(wb.rangeMin > 0 && wb.rangeMax > wb.rangeMin));
	const qLabel = $derived(display ? (scaleMode === 'log' && display.signed ? `|${display.label}|` : display.label) : '');
	const autoR: Range = $derived(display ? autoRange(display.values, scaleMode) : { min: 0, max: 1 });
	const range: Range = $derived(wb.lockRange && !lockInvalid ? { min: wb.rangeMin, max: wb.rangeMax } : autoR);
	const index: TriIndex | null = $derived(spec.mesh ? indexFor(spec.mesh) : null);
	const esIndex: TriIndex | null = $derived(wb.arrows && wb.fields?.es ? (spec.mesh === wb.fields.es && index ? index : indexFor(wb.fields.es)) : null);
	const nTris = $derived(spec.mesh ? spec.mesh.tri.length / 3 : 0);
	const staleTag = $derived(spec.mesh && (wb.stale || (spec.mesh === wb.mesh && wb.meshStale)) ? 'stale' : '');
	const modeChoices = $derived(opticalSets(wb.fields).flatMap((st) => st.data.modes.map((m, k) => ({ value: `${st.key}:${k}`, label: `${st.label} mode ${k}, n_eff ${m.n_eff.toFixed(5)}` }))));

	export function getAutoRange(): Range {
		return autoR;
	}

	function css(name: string, fallback: string) {
		const v = getComputedStyle(box).getPropertyValue(name).trim();
		return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
	}

	function toWorld(px: number, py: number) {
		return { x: view.cx + (px - W / 2) / view.scale, y: view.cy - (py - H / 2) / view.scale };
	}
	const X = (x: number) => W / 2 + (x - view.cx) * view.scale;
	const Y = (y: number) => H / 2 - (y - view.cy) * view.scale;

	function fit(b: { x: number[]; y: number[] } | null | undefined) {
		if (!b) return;
		const w = Math.max(b.x[1] - b.x[0], 1e-6), h = Math.max(b.y[1] - b.y[0], 1e-6);
		view = { cx: (b.x[0] + b.x[1]) / 2, cy: (b.y[0] + b.y[1]) / 2, scale: Math.min((W - 24) / w, (H - 24) / h) };
		schedule();
	}
	function zoomExtents() {
		fit((shown?.geometry ?? wb.geometry)?.domain);
	}
	function zoomWindow() {
		// An optical or arm dataset on screen: zoom to its own window (arm B is not the optical window).
		const w = (spec.mesh as { window?: { x: number[]; y: number[] } } | null)?.window;
		const g = shown?.geometry ?? wb.geometry;
		fit(w ?? g?.optical_window ?? g?.domain);
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

	function arrowInstances(): Float32Array | null {
		const es = wb.fields?.es;
		if (!wb.arrows || !es || !esIndex) return null;
		const step = 36;
		const out: number[] = [];
		for (let py = step / 2; py < H; py += step)
			for (let px = step / 2; px < W; px += step) {
				const w = toWorld(px, py);
				const loc = locate(es, esIndex, w.x, w.y);
				if (!loc) continue;
				const ex = es.ex[loc.t], ey = es.ey[loc.t];
				if (!(Math.hypot(ex, ey) > 0)) continue;
				out.push(w.x, w.y, Math.atan2(ey, ex), step * 0.8);
			}
		return Float32Array.from(out);
	}

	function drawState(): DrawState {
		const dark = ui.theme !== 'light';
		const mesh = spec.mesh;
		const regionColors = (mesh?.regionNames ?? []).map((n, i) => {
			const mat = mesh?.regionMaterials?.[i] ?? shown?.geometry.regions.find((r) => r.name === n)?.material ?? n;
			return materialColor(mat, n.startsWith('electrode:'));
		});
		const state: DrawState = {
			view, mode: display ? 'scalar' : 'region', scaleMode, range, colormap: cmap,
			wire: wb.wire || wb.quantity === 'mesh', wireColor: dark ? '#e8e8e8' : '#202020',
			contours: display && display.at !== 'tri' ? wb.contours : 0, contourColor: dark ? '#ffffff' : '#000000',
			highlightRegion: -1, highlightColor: '#3987e5', regionColors,
			arrows: mesh ? arrowInstances() : null, arrowColor: dark ? '#f2f1ec' : '#0b0b0b', background: css('--bg', '#0d0d0d')
		};
		return state;
	}

	/** Value and region at a world point (Canvas 2D raster mode, W4). */
	function sampler(x: number, y: number) {
		const mesh = spec.mesh;
		if (!mesh || !index) return null;
		const loc = locate(display?.mesh ?? mesh, index, x, y);
		if (!loc) return null;
		return { v: display ? valueAt(display, loc, x, y) : NaN, region: mesh.triRegion[loc.t] };
	}

	function upload(r: FieldRenderer, force = false) {
		if (r instanceof Canvas2DRenderer) r.setSampler(sampler);
		const mesh = spec.mesh;
		if (force || uploaded.mesh !== mesh) {
			r.setMesh(mesh);
			uploaded = { mesh, values: null, at: '' };
		}
		if (display && (uploaded.values !== display.values || uploaded.at !== display.at)) {
			r.setValues(display.values, display.at);
			uploaded = { ...uploaded, values: display.values, at: display.at };
		}
	}

	function draw() {
		if (!renderer || renderer.isLost()) {
			drawOverlay(ui.theme !== 'light');
			return;
		}
		upload(renderer);
		renderer.draw(drawState());
		frames++;
		paints = frames;
		drawOverlay(ui.theme !== 'light');
		if (display && frames > 0) wb.notePaint(wb.quantity);
	}

	function polyPath(ctx: CanvasRenderingContext2D, poly: number[][]) {
		ctx.beginPath();
		poly.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
		ctx.closePath();
	}
	const rectPoly = (r: { x: number[]; y: number[] }) => [[r.x[0], r.y[0]], [r.x[1], r.y[0]], [r.x[1], r.y[1]], [r.x[0], r.y[1]]];

	function drawOverlay(dark: boolean) {
		const ctx = overlay.getContext('2d')!;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, W, H);
		const g = shown?.geometry ?? null;
		const ink = dark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
		if (g) {
			const fillGeometry = !spec.mesh;
			for (const r of g.regions) {
				polyPath(ctx, r.poly);
				if (fillGeometry) {
					ctx.fillStyle = materialColor(r.material);
					ctx.fill();
				}
				ctx.strokeStyle = `${ink}${fillGeometry ? 0.25 : 0.35})`;
				ctx.lineWidth = 1;
				ctx.stroke();
			}
			for (const e of g.electrodes) {
				polyPath(ctx, e.poly);
				if (fillGeometry || spec.esMesh) {
					ctx.fillStyle = materialColor(e.material, true);
					ctx.fill();
				}
				ctx.strokeStyle = '#f3d58f';
				ctx.lineWidth = 1;
				ctx.stroke();
			}
			if (wb.showWindows) {
				ctx.setLineDash([5, 4]);
				ctx.lineWidth = 1;
				const wins: [string, { x: number[]; y: number[] }][] = [];
				if (g.optical_window) wins.push(['optical window', g.optical_window]);
				const arms = shown?.armWindows ?? {};
				for (const [k, w] of Object.entries(arms) as [string, { x_um: number[]; y_um: number[] }][]) {
					if (!w?.x_um || !w?.y_um) continue;
					const same = wins.find(([, v]) => v.x[0] === w.x_um[0] && v.x[1] === w.x_um[1] && v.y[0] === w.y_um[0] && v.y[1] === w.y_um[1]);
					if (same) same[0] = `${same[0]} = arm ${k}`;
					else wins.push([`arm ${k}`, { x: w.x_um, y: w.y_um }]);
				}
				for (const [label, w] of wins) {
					ctx.strokeStyle = label.startsWith('optical window') ? '#5bb5c9' : '#c9a227';
					polyPath(ctx, rectPoly(w));
					ctx.stroke();
					ctx.fillStyle = ctx.strokeStyle;
					ctx.font = '10px system-ui, sans-serif';
					ctx.fillText(label, X(w.x[0]) + 2, Y(w.y[1]) - 3);
				}
				ctx.setLineDash([]);
			}
			const hl = wb.highlight;
			if (hl) {
				ctx.fillStyle = 'rgba(57,135,229,0.35)';
				ctx.strokeStyle = '#3987e5';
				ctx.lineWidth = 2;
				for (const r of g.regions.filter((r) => hl.regions.includes(r.name))) { polyPath(ctx, r.poly); ctx.fill(); ctx.stroke(); }
				for (const e of g.electrodes.filter((e) => hl.electrodes.includes(e.name))) { polyPath(ctx, e.poly); ctx.fill(); ctx.stroke(); }
			}
			const hh = wb.hoverHighlight;
			if (hh) {
				ctx.strokeStyle = '#3987e5';
				ctx.lineWidth = 2;
				ctx.setLineDash([4, 3]);
				for (const r of g.regions.filter((r) => hh.regions.includes(r.name))) { polyPath(ctx, r.poly); ctx.stroke(); }
				for (const e of g.electrodes.filter((e) => hh.electrodes.includes(e.name))) { polyPath(ctx, e.poly); ctx.stroke(); }
				ctx.setLineDash([]);
			}
			if (hoverRegion) {
				const poly = hoverRegion.kind === 'region' ? g.regions[hoverRegion.index]?.poly : g.electrodes[hoverRegion.index]?.poly;
				if (poly) {
					polyPath(ctx, poly);
					ctx.strokeStyle = `${ink}0.9)`;
					ctx.lineWidth = 1.5;
					ctx.stroke();
				}
			}
		}
		const cl = cutDraft ?? wb.cutLine;
		if (cl) {
			ctx.strokeStyle = '#e0803a';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(X(cl.ax), Y(cl.ay));
			ctx.lineTo(X(cl.bx), Y(cl.by));
			ctx.stroke();
			ctx.fillStyle = '#e0803a';
			ctx.fillRect(X(cl.ax) - 3, Y(cl.ay) - 3, 6, 6);
			ctx.fillRect(X(cl.bx) - 3, Y(cl.by) - 3, 6, 6);
		}
		// Axis ticks (µm) along the bottom and left edges.
		const w0 = toWorld(0, H), w1 = toWorld(W, 0);
		ctx.font = '10px system-ui, sans-serif';
		ctx.fillStyle = `${ink}0.7)`;
		ctx.strokeStyle = `${ink}0.5)`;
		ctx.lineWidth = 1;
		ctx.textAlign = 'center';
		// U14: labels skip the bottom-left corner (y labels), the unit label (bottom right) and each other.
		let lastRight = -Infinity;
		for (const t of linearTicks(w0.x, w1.x, Math.max(2, Math.floor(W / 90)))) {
			const px = Math.round(X(t)) + 0.5;
			ctx.beginPath(); ctx.moveTo(px, H); ctx.lineTo(px, H - 5); ctx.stroke();
			const label = tickLabel(t);
			const half = ctx.measureText(label).width / 2;
			if (px - half < 40 || px + half > W - 4 || px - half < lastRight + 6) continue;
			ctx.fillText(label, px, H - 8);
			lastRight = px + half;
		}
		ctx.textAlign = 'left';
		for (const t of linearTicks(w0.y, w1.y, Math.max(2, Math.floor(H / 70)))) {
			const py = Math.round(Y(t)) + 0.5;
			ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(5, py); ctx.stroke();
			if (py > H - 22 || py < 10) continue;
			ctx.fillText(tickLabel(t), 8, py + 3);
		}
		ctx.textAlign = 'right';
		ctx.fillText('x, y (µm)', W - 6, H - 22);
		ctx.textAlign = 'left';
		if (lostNotice) {
			ctx.fillStyle = '#fab219';
			ctx.font = '12px system-ui, sans-serif';
			ctx.fillText(lostNotice, 12, 20);
		}
	}

	function drawColorbar() {
		if (!cbCanvas) return;
		const ctx = cbCanvas.getContext('2d')!;
		const cw = W < 500 ? 64 : 82, ch = Math.max(90, Math.min(260, Math.round(H * 0.55)));
		cbCanvas.width = Math.round(cw * dpr);
		cbCanvas.height = Math.round(ch * dpr);
		cbCanvas.style.width = `${cw}px`;
		cbCanvas.style.height = `${ch}px`;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, cw, ch);
		if (!display) return;
		const dark = ui.theme !== 'light';
		ctx.fillStyle = dark ? 'rgba(26,26,25,0.85)' : 'rgba(252,252,251,0.88)';
		ctx.fillRect(0, 0, cw, ch);
		const lut = colormapLut(cmap);
		const top = 32, bot = ch - 8, bx = 6, bw = 12;
		for (let py = top; py < bot; py++) {
			const t = 1 - (py - top) / (bot - top - 1);
			const i = Math.round(t * 255);
			ctx.fillStyle = `rgb(${lut[4 * i]},${lut[4 * i + 1]},${lut[4 * i + 2]})`;
			ctx.fillRect(bx, py, bw, 1);
		}
		ctx.fillStyle = dark ? '#f2f1ec' : '#0b0b0b';
		ctx.font = '10px system-ui, sans-serif';
		// U5: title on two lines (quantity, unit), ellipsis only when a line does not fit; full title in the tooltip.
		const fitText = (txt: string, max: number) => {
			if (ctx.measureText(txt).width <= max) return txt;
			let t = txt;
			while (t.length > 1 && ctx.measureText(`${t}...`).width > max) t = t.slice(0, -1);
			return `${t}...`;
		};
		ctx.fillText(fitText(qLabel, cw - 8), 4, 12);
		ctx.fillText(fitText(`(${display.unit})${scaleMode === 'log' ? ' log' : ''}`, cw - 8), 4, 24);
		cbCanvas.title = `${qLabel} (${display.unit}), ${scaleMode} scale, range ${tickLabel(Number(range.min.toPrecision(4)))} to ${tickLabel(Number(range.max.toPrecision(4)))}`;
		const ticks = scaleMode === 'log' ? logTicks(range.min, range.max) : linearTicks(range.min, range.max, 5);
		for (const t of ticks) {
			const u = scaleMode === 'log' ? (Math.log10(t) - Math.log10(range.min)) / (Math.log10(range.max) - Math.log10(range.min)) : (t - range.min) / (range.max - range.min);
			if (!(u >= -1e-9 && u <= 1 + 1e-9)) continue;
			const py = Math.round(bot - u * (bot - top - 1)) + 0.5;
			ctx.fillRect(bx + bw, py, 3, 1);
			ctx.fillText(tickLabel(t), bx + bw + 5, py + 3);
		}
	}

	function onWheel(ev: WheelEvent) {
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
			cutDraft = null;
			return;
		}
		if (wb.cutTool) {
			const w = toWorld(px, py);
			cutDraft = { ax: w.x, ay: w.y, bx: w.x, by: w.y };
		} else drag = { x: px, y: py, cx: view.cx, cy: view.cy };
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
		if (cutDraft) {
			const w = toWorld(px, py);
			cutDraft = { ...cutDraft, bx: w.x, by: w.y };
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
		if (cutDraft) {
			const c = cutDraft;
			cutDraft = null;
			if (Math.hypot(X(c.bx) - X(c.ax), Y(c.by) - Y(c.ay)) > 4) {
				wb.cutLine = c;
				wb.cutTool = false;
				wb.node = 'results.cutline';
				wb.addLog(`Cut line (${c.ax.toPrecision(4)}, ${c.ay.toPrecision(4)}) to (${c.bx.toPrecision(4)}, ${c.by.toPrecision(4)}) µm`);
			}
			schedule();
		}
		drag = null;
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
		let valueText = '';
		if (display && index) {
			const loc = locate(display.mesh, index, w.x, w.y);
			if (loc) valueText = `${display.label} ${tickLabel(Number(valueAt(display, loc, w.x, w.y).toPrecision(5)))} ${display.unit}`;
		}
		probe = `x ${w.x.toPrecision(5)} µm  y ${w.y.toPrecision(5)} µm${valueText ? `  ${valueText}` : ''}${regionText ? `  ${regionText}` : ''}`;
		if (next?.index !== hoverRegion?.index || next?.kind !== hoverRegion?.kind) {
			hoverRegion = next;
			schedule();
		}
	}

	export function exportPng() {
		const c = document.createElement('canvas');
		c.width = glCanvas.width;
		c.height = glCanvas.height;
		const ctx = c.getContext('2d')!;
		if (renderer && !renderer.isLost()) {
			draw();
			ctx.drawImage(glCanvas, 0, 0);
		} else {
			// GL context lost: render the same view with the Canvas 2D renderer so the PNG is never blank (U1).
			const tmp = document.createElement('canvas');
			const r2 = new Canvas2DRenderer(tmp);
			r2.resize(W, H, dpr);
			r2.setSampler(sampler);
			r2.setMesh(spec.mesh);
			if (display) r2.setValues(display.values, display.at);
			r2.draw(drawState());
			ctx.drawImage(tmp, 0, 0);
			wb.addLog('PNG rendered with the Canvas 2D renderer (WebGL context lost)', 'warn');
		}
		ctx.drawImage(overlay, 0, 0);
		if (display) ctx.drawImage(cbCanvas, c.width - cbCanvas.width - 8 * dpr, 8 * dpr);
		downloadDataUrl(`${wb.raw?.id ?? 'sim'}-${wb.section}-${wb.quantity.replace(':', '-')}.png`, c.toDataURL('image/png'));
	}

	function useRenderer(r: FieldRenderer) {
		renderer = r;
		rendererKind = r.kind;
		rendererInfo = r.info();
		uploaded = { mesh: null, values: null, at: '' };
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
		// Diagnostics (dev server or ?debug=1): probe the displayed quantity at a world point, as the hover probe does.
		if (import.meta.env.DEV || params.get('debug') === '1')
			(window as unknown as Record<string, unknown>).__simProbe = (x: number, y: number) => {
				if (!display || !index) return null;
				const loc = locate(display.mesh, index, x, y);
				return loc ? { value: valueAt(display, loc, x, y), label: display.label, unit: display.unit, quantity: wb.quantity } : null;
			};
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
			drawColorbar();
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
		void [spec, display, range, scaleMode, cmap, wb.wire, wb.contours, wb.arrows, wb.highlight, wb.hoverHighlight, wb.cutLine, wb.showWindows, shown, ui.theme];
		schedule();
	});
	// U5: tell the user when a locked range cannot be used in log scale.
	let warnedLock = false;
	$effect(() => {
		if (lockInvalid && !warnedLock) wb.addNotice('Locked colour range has min <= 0 or max <= min; log scale uses the automatic range of |value| instead');
		warnedLock = lockInvalid;
	});
	$effect(() => {
		void [display, range, scaleMode, cmap, H, W, qLabel, ui.theme];
		drawColorbar();
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
	// Keep the selection valid when the data changes.
	$effect(() => {
		if (!options.some((o) => o.value === wb.quantity)) wb.quantity = 'geometry';
	});
</script>

<div class="gfx" data-paints={paints} data-renderer={rendererKind} data-quantity={wb.quantity} data-ntris={nTris} data-frame-ms={lastFrameMs.toFixed(2)}>
	<div class="bar">
		<select aria-label="Plot quantity" title="Quantity shown in the graphics window" value={wb.quantity} onchange={(e) => (wb.quantity = e.currentTarget.value as Quantity)}>
			{#each options as o}<option value={o.value} title={o.tip}>{o.label}</option>{/each}
		</select>
		{#if modeChoices.length && (wb.quantity.startsWith('opt') || wb.quantity.startsWith('pk:'))}
			<select aria-label="Optical mode index" title="Optical dataset (optical window or EO arm window) and mode" value={`${wb.opticalSet}:${wb.modeIndex}`}
				onchange={(e) => { const [st, k] = e.currentTarget.value.split(':'); wb.opticalSet = st as 'optical'; wb.modeIndex = Number(k); }}>
				{#each modeChoices as m}<option value={m.value}>{m.label}</option>{/each}
			</select>
		{/if}
		<label title="Mesh wireframe on top of the plot"><input type="checkbox" bind:checked={wb.wire} /> mesh</label>
		<label title="Optical and EO arm windows"><input type="checkbox" bind:checked={wb.showWindows} /> windows</label>
		<button title="Zoom extents (double-click the canvas)" onclick={zoomExtents}>Extents</button>
		<button title="Zoom to the optical window (or to the window of the optical or arm dataset shown)" onclick={zoomWindow} disabled={!wb.geometry?.optical_window}>Window</button>
		<button class:on={wb.cutTool} title="Cut Line 2D: drag on the canvas to sample the plotted field along a line" aria-pressed={wb.cutTool} onclick={() => (wb.cutTool = !wb.cutTool)}>Cut line</button>
		<button title="Download the graphics as PNG (with colorbar)" onclick={exportPng}>PNG</button>
		<span class="grow"></span>
		{#if staleTag}<span class="stale" title="Inputs changed since this solution or mesh was computed">stale</span>{/if}
		<span class="muted num info" title={`Renderer: ${rendererInfo}`}>{rendererKind}{nTris ? ` ${nTris.toLocaleString()} tri` : ''}</span>
	</div>
	<div class="stage" bind:this={box} ondblclick={zoomExtents} role="application" aria-label="Cross-section graphics">
		<canvas class="gl" bind:this={glCanvas}></canvas>
		<canvas class="ov" bind:this={overlay} class:cut={wb.cutTool}
			onpointerdown={onDown} onpointermove={onMove} onpointerup={onUp} onpointercancel={onUp} onpointerleave={() => { if (!drag && !cutDraft) probe = ''; }}></canvas>
		<canvas class="cb" bind:this={cbCanvas} class:hidden={!display} aria-hidden="true"></canvas>
		{#if !wb.geometry}<div class="empty muted">No geometry</div>{/if}
	</div>
	<div class="probe mono" data-probe={probe}>{probe || (wb.cutTool ? 'Drag to draw a cut line' : 'Hover for x, y, value and region; drag to pan; wheel to zoom')}</div>
</div>

<style>
	.gfx { display: grid; grid-template-rows: auto minmax(0, 1fr) 20px; height: 100%; min-height: 0; min-width: 0; background: var(--surface); }
	.bar { display: flex; flex-wrap: nowrap; align-items: center; gap: 4px 8px; height: 31px; padding: 0 6px; border-bottom: 1px solid var(--border); overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; }
	.bar > * { flex: none; }
	.bar .info { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.bar select { max-width: 170px; border-radius: 0; }
	.bar button { border-radius: 0; }
	.bar label { display: flex; align-items: center; gap: 4px; color: var(--ink-2); }
	.grow { flex: 1; }
	.stale { color: var(--warn); border: 1px solid var(--warn); padding: 0 4px; border-radius: 0; }
	.stage { position: relative; min-height: 0; overflow: hidden; background: var(--bg); }
	.stage canvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }
	.ov { cursor: grab; touch-action: pan-y; }
	.ov.cut { cursor: crosshair; }
	.stage canvas.cb { left: auto; right: 8px; top: 8px; width: 82px; height: 200px; border: 1px solid var(--border); border-radius: 0; }
	.stage canvas.cb.hidden { display: none; }
	.empty { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
	.probe { padding: 3px 6px; font-size: 11px; color: var(--ink-2); border-top: 1px solid var(--border); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	button:disabled { opacity: 0.5; cursor: default; }
</style>
