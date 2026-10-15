// Maps the workbench quantity selection to a renderable scalar field (pure; memoized by the caller).
import { triMinAngle, triSize } from './fieldmath';
import { p2Display } from './p2';
import type { FieldMesh, OpticalFields, ScalarField, SimFields } from './types';

export type OpticalSet = 'optical' | 'A' | 'B';

/** Optical datasets of a result: the optical_mode window and the EO arm windows (arm A may be the same object). */
export function opticalSets(fields: SimFields | null): { key: OpticalSet; label: string; data: OpticalFields }[] {
	const out: { key: OpticalSet; label: string; data: OpticalFields }[] = [];
	if (fields?.optical) out.push({ key: 'optical', label: 'optical window', data: fields.optical });
	const arms = fields?.arms;
	if (arms?.A && arms.A !== fields?.optical) out.push({ key: 'A', label: 'arm A', data: arms.A });
	if (arms?.B) out.push({ key: 'B', label: 'arm B', data: arms.B });
	return out;
}

export function opticalOf(fields: SimFields | null, set: OpticalSet): OpticalFields | null {
	return opticalSetOf(fields, set)?.data ?? null;
}

function opticalSetOf(fields: SimFields | null, set: OpticalSet) {
	const sets = opticalSets(fields);
	return sets.find((x) => x.key === set) ?? sets[0] ?? null;
}

/** |E| inside corner-valued triangle t at (x, y) from the linearly interpolated components (W8: exact for P2). */
function cornerHypot(m: FieldMesh, ex: Float64Array, ey: Float64Array) {
	return (t: number, px: number, py: number) => {
		const a = m.tri[3 * t], b = m.tri[3 * t + 1], c = m.tri[3 * t + 2];
		const d = (m.y[b] - m.y[c]) * (m.x[a] - m.x[c]) + (m.x[c] - m.x[b]) * (m.y[a] - m.y[c]);
		const w0 = ((m.y[b] - m.y[c]) * (px - m.x[c]) + (m.x[c] - m.x[b]) * (py - m.y[c])) / d;
		const w1 = ((m.y[c] - m.y[a]) * (px - m.x[c]) + (m.x[a] - m.x[c]) * (py - m.y[c])) / d;
		const w2 = 1 - w0 - w1;
		const vx = w0 * ex[3 * t] + w1 * ex[3 * t + 1] + w2 * ex[3 * t + 2];
		const vy = w0 * ey[3 * t] + w1 * ey[3 * t + 1] + w2 * ey[3 * t + 2];
		return Math.hypot(vx, vy);
	};
}

export interface QuantityOption {
	value: string;
	label: string;
	tip: string;
}

/** Where an optical component lives: per node or per triangle centroid (vector solver), by array length. */
function locationOf(opt: OpticalFields, c: ArrayLike<number> | undefined): 'node' | 'tri' | null {
	if (!c) return null;
	if (c.length === opt.x.length) return 'node';
	if (c.length === opt.tri.length / 3) return 'tri';
	return null;
}

const E_KEYS = ['ex', 'ey', 'ez', 'exIm', 'eyIm', 'ezIm'];

// Pockels index change of the static field on an optical mesh (engine round 3): per triangle centroid, per volt of
// terminal voltage (1/V). dn_ii are lab-axis index changes; d eps_xy is the in-plane shear of the relative permittivity.
const POCKELS: [ 'dnXX' | 'dnYY' | 'dnZZ' | 'dEpsXY', string][] = [['dnXX', 'dn_xx'], ['dnYY', 'dn_yy'], ['dnZZ', 'dn_zz'], ['dEpsXY', 'd eps_xy']];

function pockelsTip(opt: OpticalFields, k: string): string {
	const p = opt.pockels!;
	const what = k === 'dEpsXY' ? 'in-plane shear d eps_xy of the relative permittivity' : `index change of the lab ${k.slice(2, 3).toLowerCase()} axis`;
	return `Pockels ${what}, ${p.units?.[k === 'dEpsXY' ? 'dEpsXY' : 'dn'] ?? '1/V'}; per element (triangle centroid of the static field on this optical mesh, lambda ${p.lambdaUm} µm). ${p.sign}`;
}

function componentTip(opt: OpticalFields, k: string): string {
	if (k === 'psi') return `Scalar mode field psi (${opt.form === 'H' ? 'H-form: H_x for TM' : 'E-form: E_x for TE'}), max |psi| = 1, per node`;
	const where = opt.location === 'triangle_centroid' ? 'triangle centroid values' : 'per node';
	const imag = /^(ez|hz)$/.test(k) ? '; imaginary part (E_z = j ez, H_z = j hz)' : k.endsWith('Im') ? '; imaginary part of a lossy mode' : '';
	return `Vector mode component ${k}, ${where}${imag}`;
}

/** Selectable quantities for the available data. */
export function quantityOptions(fields: SimFields | null, mesh: FieldMesh | null, modeIndex: number, set: OpticalSet = 'optical'): QuantityOption[] {
	const out: QuantityOption[] = [{ value: 'geometry', label: 'Geometry', tip: 'Regions and electrodes by material (configured polygons)' }];
	if (fields?.es || mesh) {
		out.push({ value: 'mesh', label: 'Mesh', tip: 'Electrostatic mesh colored by region material (geometric triangles)' });
		out.push({ value: 'mesh_size', label: 'Mesh: element size', tip: 'Longest edge per triangle (µm)' });
		out.push({ value: 'mesh_quality', label: 'Mesh: min angle', tip: 'Smallest interior angle per triangle (deg)' });
	}
	const es = fields?.es;
	if (es) {
		const p2 = es.elementOrder === 2 && !!es.p2;
		const ord = p2 ? 'P2' : 'P1';
		out.push({ value: 'phi', label: `Potential V (${ord})`, tip: p2 ? 'Quadratic (P2) potential, V per volt of terminal voltage; drawn on elements split into 4 at the edge midpoints, probe and cut line evaluate the quadratic exactly' : 'Potential per node (V per volt of terminal voltage); linear (P1), Gouraud-shaded' });
		const eTip = p2 ? 'per volt of terminal voltage (V/µm); P2: linear within each element, evaluated from the quadratic potential' : 'per volt of terminal voltage (V/µm); P1: constant per element';
		out.push({ value: 'enorm', label: `Field |E| (${ord})`, tip: `|E| ${eTip}` });
		out.push({ value: 'ex', label: `Field E_x (${ord})`, tip: `E_x ${eTip}` });
		out.push({ value: 'ey', label: `Field E_y (${ord})`, tip: `E_y ${eTip}` });
	}
	const opt = opticalOf(fields, set);
	const mode = opt?.modes[modeIndex];
	if (opt && mode) {
		const vector = opt.solver === 'vector';
		out.push({ value: 'opt_int', label: vector ? 'Optical |E|^2 (vector)' : 'Optical intensity (scalar)', tip: vector ? 'Sum of squared electric components of the vector mode (triangle centroid values), normalized to max 1' : `|psi|^2 of the scalar mode (${opt.form === 'H' ? 'H_x for TM H-form' : 'E_x for TE E-form'}), normalized to max 1` });
		for (const [k, c] of Object.entries(mode.components)) if (locationOf(opt, c)) out.push({ value: `opt:${k}`, label: `Optical ${k}`, tip: componentTip(opt, k) });
	}
	if (opt?.pockels) for (const [k, label] of POCKELS) out.push({ value: `pk:${k}`, label: `Pockels ${label} (per V)`, tip: pockelsTip(opt, k) });
	return out;
}

const scaleMemo = new WeakMap<Float64Array, Float64Array>();
function scaled(a: Float64Array, k: number): Float64Array {
	let out = scaleMemo.get(a);
	if (!out) {
		out = a.map((v) => v * k);
		scaleMemo.set(a, out);
	}
	return out;
}

const memo = new WeakMap<FieldMesh, { size?: Float64Array; angle?: Float64Array }>();
function cached(m: FieldMesh, key: 'size' | 'angle'): Float64Array {
	let e = memo.get(m);
	if (!e) memo.set(m, (e = {}));
	return (e[key] ??= key === 'size' ? triSize(m) : triMinAngle(m));
}

export interface ViewSpec {
	mesh: FieldMesh | null;
	field: ScalarField | null;
	/** True when the view uses the electrostatic mesh (electrode holes are drawn by the overlay). */
	esMesh: boolean;
}

export function viewSpec(q: string, fields: SimFields | null, mesh: FieldMesh | null, modeIndex: number, set: OpticalSet = 'optical'): ViewSpec {
	const es = fields?.es ?? null;
	const meshES = es ?? mesh;
	const sc = (m: FieldMesh, values: Float64Array, at: ScalarField['at'], label: string, unit: string, signed: boolean, extra: Partial<ScalarField> = {}): ViewSpec =>
		({ mesh: m, field: { mesh: m, values, at, label, unit, signed, ...extra }, esMesh: m === meshES || m === p2?.mesh });
	const p2 = es ? p2Display(es) : null;
	if (q === 'mesh' && meshES) return { mesh: meshES, field: null, esMesh: true };
	if (q === 'mesh_size' && meshES) return sc(meshES, cached(meshES, 'size'), 'tri', 'Element size', 'µm', false);
	if (q === 'mesh_quality' && meshES) return sc(meshES, cached(meshES, 'angle'), 'tri', 'Min angle', 'deg', false);
	if (es && p2) {
		// P2: refined display mesh; potential evaluated exactly, E linear per element (3 corner values per sub-triangle).
		if (q === 'phi') return sc(p2.mesh, p2.phi, 'node', 'Potential', 'V', false, { evaluate: p2.phiAt, note: 'P2' });
		if (q === 'ex') return sc(p2.mesh, p2.ex, 'corner', 'E_x', 'V/µm', true, { note: 'P2' });
		if (q === 'ey') return sc(p2.mesh, p2.ey, 'corner', 'E_y', 'V/µm', true, { note: 'P2' });
		if (q === 'enorm') return sc(p2.mesh, normOf(p2.ex, p2.ey, 1), 'corner', '|E|', 'V/µm', false, { note: 'P2', evaluate: cornerHypot(p2.mesh, p2.ex, p2.ey) });
	} else if (es) {
		if (q === 'phi') return sc(es, es.phi, 'node', 'Potential', 'V', false);
		// Engine E is V/m per volt of terminal voltage; shown in V/µm.
		if (q === 'ex') return sc(es, scaled(es.ex, 1e-6), 'tri', 'E_x', 'V/µm', true);
		if (q === 'ey') return sc(es, scaled(es.ey, 1e-6), 'tri', 'E_y', 'V/µm', true);
		if (q === 'enorm') return sc(es, normOf(es.ex, es.ey, 1e-6), 'tri', '|E|', 'V/µm', false);
	}
	const setInfo = opticalSetOf(fields, set);
	const opt = setInfo?.data ?? null;
	const mode = opt?.modes[modeIndex];
	// W7: the optical dataset (window or arm) is part of every optical/Pockels label.
	const ds = setInfo ? ` [${setInfo.label}]` : '';
	if (opt && mode) {
		if (q === 'opt_int') {
			const comps = Object.entries(mode.components);
			let keys = comps.filter(([k]) => E_KEYS.includes(k)).map(([k]) => k);
			if (!keys.length) keys = comps.filter(([k]) => k === 'psi').map(([k]) => k);
			const at = keys.length ? locationOf(opt, mode.components[keys[0]]) : null;
			if (!at) return { mesh: null, field: null, esMesh: false };
			const n = at === 'node' ? opt.x.length : opt.tri.length / 3;
			const v = new Float64Array(n);
			for (const k of keys) {
				const c = mode.components[k];
				if (!c || c.length !== n) continue;
				for (let i = 0; i < n; i++) v[i] += c[i] * c[i];
			}
			let mx = 0;
			for (const x of v) if (x > mx) mx = x;
			if (mx > 0) for (let i = 0; i < n; i++) v[i] /= mx;
			return sc(opt, v, at, `${keys[0] === 'psi' ? '|psi|^2' : '|E|^2'}${ds}${at === 'tri' ? ' (per element)' : ''}`, 'norm.', false);
		}
		if (q.startsWith('pk:') && opt.pockels) {
			const key = q.slice(3) as 'dnXX' | 'dnYY' | 'dnZZ' | 'dEpsXY';
			const label = POCKELS.find(([k]) => k === key)?.[1];
			const c = opt.pockels[key];
			if (label && c && c.length === opt.tri.length / 3) return sc(opt, c, 'tri', `${label}${ds} (per element)`, '1/V', true);
		}
		if (q.startsWith('opt:')) {
			const c = mode.components[q.slice(4)];
			const at = c ? locationOf(opt, c) : null;
			if (c && at) return sc(opt, c, at, `${q.slice(4)}${ds}${at === 'tri' ? ' (per element)' : ''}`, opt.solver === 'vector' ? 'arb.' : 'norm.', true);
		}
	}
	return { mesh: null, field: null, esMesh: false };
}

const normMemo = new WeakMap<Float64Array, Float64Array>();
function normOf(ax: Float64Array, ay: Float64Array, k: number): Float64Array {
	let out = normMemo.get(ax);
	if (!out) {
		out = new Float64Array(ax.length);
		for (let i = 0; i < ax.length; i++) out[i] = Math.hypot(ax[i], ay[i]) * k;
		normMemo.set(ax, out);
	}
	return out;
}
