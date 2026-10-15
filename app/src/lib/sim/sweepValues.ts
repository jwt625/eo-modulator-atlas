// Sweep value specs: "3, 4, 5" (list) or "start:step:stop" (inclusive range) or "linspace(a, b, n)".

export const MAX_SWEEP_POINTS = 200;

export function parseSweepValues(spec: string): number[] {
	const s = spec.trim();
	if (!s) throw new Error('Empty sweep values');
	let out: number[];
	const lin = s.match(/^linspace\(\s*([^,]+),\s*([^,]+),\s*([^)]+)\)$/i);
	if (lin) {
		const [a, b, n] = [Number(lin[1]), Number(lin[2]), Number(lin[3])];
		if (![a, b, n].every(Number.isFinite) || !Number.isInteger(n) || n < 1) throw new Error('linspace(a, b, n) needs numbers and an integer n >= 1');
		out = Array.from({ length: n }, (_, k) => (n === 1 ? a : a + ((b - a) * k) / (n - 1)));
	} else if (/^[^,]+:[^,]+:[^,]+$/.test(s)) {
		const [a, step, b] = s.split(':').map((v) => Number(v.trim()));
		if (![a, step, b].every(Number.isFinite) || step === 0 || Math.sign(b - a) * Math.sign(step) < 0) throw new Error('Range start:step:stop needs a nonzero step towards stop');
		const n = Math.floor((b - a) / step + 1e-9) + 1;
		if (n > MAX_SWEEP_POINTS) throw new Error(`At most ${MAX_SWEEP_POINTS} points`);
		out = Array.from({ length: n }, (_, k) => Number((a + k * step).toPrecision(12)));
	} else {
		out = s.split(/[,\s]+/).filter(Boolean).map((v) => {
			const n = Number(v);
			if (!Number.isFinite(n)) throw new Error(`Not a number: ${v}`);
			return n;
		});
	}
	if (!out.length) throw new Error('No sweep values');
	if (out.length > MAX_SWEEP_POINTS) throw new Error(`At most ${MAX_SWEEP_POINTS} points`);
	return out;
}

/** Default device column for a sweep path (paper overlay x axis), by name only. */
export function guessDeviceX(path: string): string | null {
	const p = path.toLowerCase();
	if (p.includes('gap')) return 'electrode_gap_um';
	if (p.includes('wavelength')) return 'wavelength_nm';
	if (p.includes('length_mm')) return 'length_mm';
	if (p.includes('signal') && p.includes('width')) return 'signal_width_um';
	if (p.includes('etch')) return 'etch_depth_nm';
	if (p.includes('rib') && p.includes('width')) return 'rib_width_nm';
	return null;
}

/** Device column holding the same quantity as an engine metric (paper overlay y axis). */
export const METRIC_DEVICE_COLUMN: Record<string, string> = {
	vpi_l_dc_vcm: 'vpil_dc_vcm',
	vpi_dc_v: 'vpi_dc_v',
	n_rf: 'n_rf',
	z0_ohm: 'z0_ohm',
	ng_opt: 'ng_opt'
};
