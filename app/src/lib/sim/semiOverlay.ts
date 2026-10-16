// Doping windows and contacts of the `semiconductor` block drawn on the Geometry view (DevLog-042): the configured
// clip shapes (rect, polygon, regions, material; implant profiles with their lateral mask window), not the solved
// doping (the Net Doping plot group shows that). Pure helpers; unit-tested in sim.test.ts.
import type { Geometry } from '../../../../engine/src/config.mjs';

export interface DopingShape {
	index: number;
	name: string;
	species: 'donor' | 'acceptor';
	profile: string;
	/** Peak or uniform concentration (cm^-3) as configured. */
	cm3: number | null;
	polys: number[][][];
	/** Implant lateral mask window (erf edges) or a window spanning the clip shapes: drawn dashed. */
	dashed: boolean;
}

type Raw = Record<string, unknown> | null | undefined;
const rectPoly = (x: number[], y: number[]) => [[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]];
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Shapes of every doping entry of `semiconductor.doping` on the geometry (expanded config values, µm). */
export function dopingShapes(semi: Raw, g: Geometry | null): DopingShape[] {
	const list = (semi?.doping as Record<string, unknown>[] | undefined) ?? [];
	if (!g || !Array.isArray(list)) return [];
	const semiMats = new Set(Object.keys((semi?.materials as Record<string, unknown> | undefined) ?? {}));
	const out: DopingShape[] = [];
	list.forEach((d, index) => {
		const w = (d.within ?? {}) as Record<string, unknown>;
		let polys: number[][][] = [];
		const rect = w.rect as { x_um?: number[]; y_um?: number[] } | undefined;
		if (rect?.x_um?.length === 2 && rect.y_um?.length === 2) polys = [rectPoly(rect.x_um, rect.y_um)];
		else if (Array.isArray(w.polygon_um)) polys = [w.polygon_um as number[][]];
		else if (Array.isArray(w.regions)) polys = g.regions.filter((r) => (w.regions as string[]).includes(r.name)).map((r) => r.poly);
		else {
			const mat = typeof w.material === 'string' ? w.material : null;
			polys = g.regions.filter((r) => (mat ? r.material === mat : semiMats.has(r.material))).map((r) => r.poly);
		}
		const lat = (d.lateral as { x_um?: number[] } | undefined)?.x_um;
		let dashed = false;
		if (Array.isArray(lat) && lat.length === 2 && polys.length) {
			// lateral mask window of an implant profile, over the vertical extent of its clip shapes
			const ys = polys.flat().map((p) => p[1]);
			polys = [rectPoly(lat, [Math.min(...ys), Math.max(...ys)])];
			dashed = true;
		}
		out.push({ index, name: String(d.name ?? `doping ${index + 1}`), species: d.species === 'donor' ? 'donor' : 'acceptor', profile: String(d.profile ?? 'uniform'), cm3: num(d.concentration_cm3) ?? num(d.peak_cm3), polys, dashed });
	});
	return out;
}

/** Contacts of the semiconductor block with their electrode names and configured bias. */
export function semiContacts(semi: Raw): { index: number; electrode: string; type: string; biasV: number | null }[] {
	const list = (semi?.contacts as Record<string, unknown>[] | undefined) ?? [];
	return Array.isArray(list) ? list.map((c, index) => ({ index, electrode: String(c.electrode ?? c.name ?? ''), type: String(c.type ?? 'ohmic'), biasV: num(c.bias_v) })) : [];
}

/** Short concentration label: '5e17 cm^-3'. */
export function cm3Label(v: number | null): string {
	if (v == null) return '';
	const e = Math.floor(Math.log10(Math.abs(v) || 1));
	const m = v / 10 ** e;
	return `${Number(m.toPrecision(3))}e${e} cm⁻³`;
}
