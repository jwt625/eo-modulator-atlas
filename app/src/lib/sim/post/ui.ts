// Main-thread helpers over the engine expression language (DevLog-031): unit display, global expressions of sweep
// points, registry entries for autocomplete.
import { displayConversion, evaluateGlobals, EXPRESSION_FUNCTIONS, GLOBAL_VARIABLES } from '../../../../../engine/src/postproc/index.mjs';

export { EXPRESSION_FUNCTIONS, GLOBAL_VARIABLES };

/** Unit for display: um -> µm, ohm -> Ω, * -> ·, ^2 -> ², ^3 -> ³; '1' stays (dimensionless). */
export function prettyUnit(s: string): string {
	return s.replace(/\bu(?=[A-Za-z])/g, 'µ').replace(/\bohm\b/gi, 'Ω').replace(/\*/g, '·').replace(/\^2\b/g, '²').replace(/\^3\b/g, '³');
}

/** Engine metric key -> run global (DevLog-031 GLOBAL_VARIABLES) and the factor from the metric unit to SI. */
export const METRIC_GLOBAL: Record<string, [string, number]> = {
	c_pul_pf_per_m: ['C', 1e-12], c0_pul_pf_per_m: ['C0', 1e-12], l_pul_nh_per_m: ['L', 1e-9], z0_ohm: ['Z0', 1], n_rf: ['nRF', 1],
	n_eff: ['neff', 1], ng_opt: ['ng', 1], vpi_l_dc_vcm: ['VpiL', 1e-2], vpi_dc_v: ['Vpi', 1]
};

/** Global expression over sweep points (one value per point; NaN where a point lacks a referenced global). */
export function sweepValues(expr: string, globals: (Record<string, number> | null)[], unit?: string) {
	return evaluateGlobals(expr, globals, { unit: unit || undefined });
}

/** Factor that converts an SI value of the global `name` into `unit` (for paper-point overlays). */
export function globalToUnit(name: string, unit: string): number {
	const g = GLOBAL_VARIABLES.find((v) => v.name === name);
	if (!g) return NaN;
	return 1 / displayConversion(g.dim, unit || null).factor;
}
