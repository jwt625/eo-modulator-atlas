// Display unit from a config key (sims/SPEC.md: explicit unit suffixes in keys).
export function unitOf(path: string): string {
	const k = path.split('.').filter((s) => !/^\d+$/.test(s)).pop() ?? '';
	if (/_um$/.test(k)) return 'µm';
	if (/_nm$/.test(k)) return 'nm';
	if (/_mm$/.test(k)) return 'mm';
	if (/_ghz$/.test(k)) return 'GHz';
	if (/_ohm$/.test(k)) return 'Ω';
	if (/_deg$/.test(k)) return 'deg';
	if (/_Sm$/.test(k)) return 'S/m';
	if (/_pf_per_m$/.test(k)) return 'pF/m';
	if (/_per_m$/.test(k)) return '/m';
	if (path.includes('r_pm_per_v.')) return 'pm/V';
	return '';
}

/** Flatten scalar leaves of an object (arrays of numbers kept as one leaf per element). */
export function leaves(obj: unknown, prefix: string): { path: string; key: string; value: unknown }[] {
	const out: { path: string; key: string; value: unknown }[] = [];
	const walk = (v: unknown, p: string, key: string) => {
		if (Array.isArray(v)) {
			if (v.every((x) => typeof x === 'number')) v.forEach((x, i) => out.push({ path: `${p}.${i}`, key: `${key}[${i}]`, value: x }));
			else out.push({ path: p, key, value: v });
		} else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${p}.${k}`, key ? `${key}.${k}` : k);
		else out.push({ path: p, key, value: v });
	};
	if (obj && typeof obj === 'object') for (const [k, x] of Object.entries(obj)) walk(x, `${prefix}.${k}`, k);
	return out;
}
