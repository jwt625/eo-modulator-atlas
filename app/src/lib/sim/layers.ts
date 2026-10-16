// Pure helpers turning plot features + evaluated arrays into renderer layers: ranges, contour levels, region masks,
// arrow grids, auto titles. Unit-tested in sim.test.ts.
import { autoRange, indexFor, locate, meshBBox, type Range, type TriIndex } from './fieldmath';
import type { Feature, PlotGroup } from './results.svelte';
import { FEATURE_LABEL } from './results.svelte';
import type { PlotResult } from './post/contract';
import type { FieldMesh, ScaleMode } from './types';
import { interpolateRefined } from '../../../../engine/src/postproc/index.mjs';
import { prettyUnit } from './post/ui';

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

export function meshIndex(m: FieldMesh): TriIndex {
	return indexFor(m);
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
			const vx = interpolateRefined(px.values, px.r ?? 1, loc.t, loc.w0, loc.w1), vy = interpolateRefined(py.values, py.r ?? 1, loc.t, loc.w0, loc.w1);
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
