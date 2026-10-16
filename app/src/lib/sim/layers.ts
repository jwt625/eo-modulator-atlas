// Pure helpers turning plot features + evaluated arrays into renderer layers: ranges, contour levels, region masks,
// arrow grids, auto titles. Unit-tested in sim.test.ts.
import { autoRange, buildTriIndex, locate, meshBBox, triToNode, type Range, type TriIndex } from './fieldmath';
import type { Feature, PlotGroup } from './results.svelte';
import { FEATURE_LABEL } from './results.svelte';
import type { PlotResult } from './post/contract';
import type { FieldMesh, ScaleMode } from './types';
import type { ValueAt } from './renderer';
import { prettyUnit } from './post/ui';

export const atOf = (loc: PlotResult['location']): ValueAt => (loc === 'element' ? 'tri' : loc === 'sweep' ? 'node' : loc);

/** Display range of a feature: manual, else automatic from the evaluated min/max (log: positive |v| range). */
export function featureRange(f: Feature, p: PlotResult): Range {
	const scale = f.range.scale;
	if (f.range.manual && Number.isFinite(f.range.min) && Number.isFinite(f.range.max) && f.range.max > f.range.min && !(scale === 'log' && f.range.min <= 0))
		return { min: f.range.min, max: f.range.max };
	if (scale === 'log') return autoRange(p.values, 'log');
	let { min, max } = p;
	if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
	if (scale === 'symmetric') {
		const a = Math.max(Math.abs(min), Math.abs(max)) || 1;
		return { min: -a, max: a };
	}
	if (min === max) {
		const d = Math.abs(min) * 0.5 || 0.5;
		return { min: min - d, max: max + d };
	}
	return { min, max };
}

/** Contour levels: N levels evenly inside the range (geometric for log), or an explicit list (display unit). */
export function contourLevels(f: Feature, r: Range): number[] {
	if (f.levelsMode === 'list')
		return f.list.split(/[,\s]+/).map(Number).filter(Number.isFinite).slice(0, 64);
	const n = Math.max(1, Math.min(64, Math.round(f.count)));
	const out: number[] = [];
	for (let i = 1; i <= n; i++) {
		const u = i / (n + 1);
		out.push(f.range.scale === 'log' && r.min > 0 ? 10 ** (Math.log10(r.min) + u * (Math.log10(r.max) - Math.log10(r.min))) : r.min + u * (r.max - r.min));
	}
	return out;
}

const smoothMemo = new WeakMap<Float64Array, Float64Array>();
/** Area-weighted nodal average of per-element or per-corner values (display smoothing). */
export function smoothed(mesh: FieldMesh, p: { values: Float64Array; location: PlotResult['location'] }): { values: Float64Array; at: ValueAt } {
	if (p.location !== 'element' && p.location !== 'corner') return { values: p.values, at: atOf(p.location) };
	let v = smoothMemo.get(p.values);
	if (!v) {
		if (p.location === 'element') v = triToNode(mesh, p.values);
		else {
			const nN = mesh.x.length, acc = new Float64Array(nN), w = new Float64Array(nN);
			const { x, y, tri } = mesh;
			for (let t = 0; t < tri.length / 3; t++) {
				const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
				const area = Math.abs((x[b] - x[a]) * (y[c] - y[a]) - (x[c] - x[a]) * (y[b] - y[a])) / 2;
				for (let k = 0; k < 3; k++) {
					const val = p.values[3 * t + k];
					if (!Number.isFinite(val)) continue;
					acc[tri[3 * t + k]] += area * val;
					w[tri[3 * t + k]] += area;
				}
			}
			for (let i = 0; i < nN; i++) acc[i] = w[i] > 0 ? acc[i] / w[i] : NaN;
			v = acc;
		}
		smoothMemo.set(p.values, v);
	}
	return { values: v, at: 'node' };
}
/** Contours need continuous values: element values are averaged onto nodes (display only). */
export function contourValues(mesh: FieldMesh, p: PlotResult): { values: Float64Array; at: ValueAt } {
	if (p.location !== 'element') return { values: p.values, at: atOf(p.location) };
	return smoothed(mesh, p);
}

/** Allowed regions of a mesh for a selection (region names); null = all. */
export function regionMask(mesh: FieldMesh, regions: string[] | null): Uint8Array | null {
	if (!regions) return null;
	const m = new Uint8Array(Math.max(1, mesh.regionNames.length));
	for (const n of regions) {
		const i = mesh.regionNames.indexOf(n);
		if (i >= 0) m[i] = 1;
	}
	return m;
}

const idxMemo = new WeakMap<FieldMesh, TriIndex>();
export function meshIndex(m: FieldMesh): TriIndex {
	if (m.index) return m.index;
	let i = idxMemo.get(m);
	if (!i) idxMemo.set(m, (i = buildTriIndex(m)));
	return i;
}

/** Interpolated value of a plotted array at a world point (µm); NaN outside. */
export function sampleAt(mesh: FieldMesh, p: { values: Float64Array; location: PlotResult['location'] }, x: number, y: number): number {
	const loc = locate(mesh, meshIndex(mesh), x, y);
	if (!loc) return NaN;
	const t = loc.t, a = p.values;
	if (p.location === 'element') return a[t];
	if (p.location === 'corner') return loc.w0 * a[3 * t] + loc.w1 * a[3 * t + 1] + loc.w2 * a[3 * t + 2];
	return loc.w0 * a[mesh.tri[3 * t]] + loc.w1 * a[mesh.tri[3 * t + 1]] + loc.w2 * a[mesh.tri[3 * t + 2]];
}

export interface ArrowGrid {
	/** x, y (µm), angle (rad), length (µm) per arrow. */
	data: Float32Array;
	n: number;
}

/**
 * Arrow Surface on a world grid (COMSOL grid placement): gridX x gridY points over `box` (the visible view, the mesh or
 * the selection bounding box; default the mesh). Length proportional to |v| (longest = one cell x scale, cell =
 * sqrt(dx dy)), normalized (all equal), or logarithmic (range 100).
 */
export function arrowGrid(mesh: FieldMesh, px: PlotResult, py: PlotResult, f: Feature, mask: Uint8Array | null, box?: { x0: number; x1: number; y0: number; y1: number }): ArrowGrid {
	const b = box ?? meshBBox(mesh);
	const nx = Math.max(2, Math.min(200, Math.round(f.gridX))), ny = Math.max(2, Math.min(200, Math.round(f.gridY)));
	const dx = (b.x1 - b.x0) / nx, dy = (b.y1 - b.y0) / ny;
	const cell = Math.sqrt(dx * dy);
	const pts: number[] = [];
	let vmax = 0;
	const idx = meshIndex(mesh);
	for (let j = 0; j < ny; j++)
		for (let i = 0; i < nx; i++) {
			const x = b.x0 + (i + 0.5) * dx, y = b.y0 + (j + 0.5) * dy;
			const loc = locate(mesh, idx, x, y);
			if (!loc || (mask && !mask[mesh.triRegion[loc.t]])) continue;
			const vx = sampleAt(mesh, px, x, y), vy = sampleAt(mesh, py, x, y);
			const m = Math.hypot(vx, vy);
			if (!(m > 0)) continue;
			vmax = Math.max(vmax, m);
			pts.push(x, y, Math.atan2(vy, vx), m);
		}
	const data = new Float32Array(pts.length);
	const R = 100;
	for (let k = 0; k < pts.length; k += 4) {
		const m = pts[k + 3];
		const rel = f.lengthMode === 'normalized' ? 0.9 : f.lengthMode === 'logarithmic' ? Math.max(0, 1 + Math.log(m / vmax) / Math.log(R)) : m / vmax;
		data[k] = pts[k];
		data[k + 1] = pts[k + 1];
		data[k + 2] = pts[k + 2];
		data[k + 3] = rel * cell * f.scaleFactor;
	}
	return { data, n: pts.length / 4 };
}

export function exprLabel(f: Feature, unit: string): string {
	if (f.type === 'arrow') return f.description || `(${f.xExpr}, ${f.yExpr})`;
	if (f.type === 'line') return 'boundaries';
	return `${f.description || f.expr}${unit ? ` (${prettyUnit(unit)})` : ''}`;
}

/**
 * COMSOL-style automatic title: datasets (with the mode of optical datasets, `dsLabel`), then each visible feature
 * with its expression (or description) and unit; feature titles may be manual or omitted.
 */
export function autoTitle(g: PlotGroup, dsLabel: (id: string) => string, units: Record<string, string>): string {
	if (g.titleMode === 'none') return '';
	if (g.titleMode === 'custom') return g.title;
	const vis = g.features.filter((f) => f.visible);
	const sets = [...new Set(vis.map((f) => f.dataset || g.dataset).filter(Boolean))];
	const head = sets.length ? `Dataset: ${sets.map(dsLabel).join('; ')}` : '';
	const parts = vis.filter((f) => f.titleMode !== 'none').map((f) => (f.titleMode === 'manual' ? f.title : `${FEATURE_LABEL[f.type]}: ${exprLabel(f, units[f.id] ?? f.unit)}`));
	return [head, ...parts].filter(Boolean).join('   ');
}

export type { ScaleMode };
