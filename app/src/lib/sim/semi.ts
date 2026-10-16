// S8 semiconductor stage in the UI (DevLog-042): structural types of `result.semiconductor` (engine/src/semi-stage.mjs,
// DevLog-039; not declared in engine/src/run.d.mts), bias labels, the "Bias sweep" Global dataset (per-bias values of
// the stage as SI globals, evaluated with the engine expression compiler) and the paper targets of the stage as plot
// points. Values are the engine's; this module only renames and converts units.
import { compileExpression, displayConversion, formatUnit, parseUnit } from '../../../../engine/src/postproc/index.mjs';
import type { Dim } from '../../../../engine/src/postproc/index.mjs';
import type { VariableInfo } from './post/contract';
import type { SimulationResult } from '../../../../engine/src/run.mjs';

export interface SemiPoint {
	biasV: number[];
	sweptBiasV: number | null;
	forwardBiasV: number;
	contacts: { electrode: string; biasV: number; currentAPerM: number; chargeCPerM: number }[];
	checks?: { chargeSumCPerM?: number; chargeMaxCPerM?: number; continuityRel?: number | null; currentResolved?: boolean };
	newton: { rampSteps: number; iterations: number; gmres: number; residualInf: number | null };
	flags: string[];
	timing: Record<string, number>;
	capacitance?: { cFPerM: number; cPfPerMm: number; depletionCFPerM: number; depletionCPfPerMm: number; metalCFPerM: number; dvV: number; contact: string; contactType: string; method: string };
	resistance?: { rOhmM: number; rOhmMm: number; method: string; nDepletedNodes: number };
	rc?: { fRcHz: number; fRcGhz: number; tauS: number };
	/** Junction conductance G' = dI/dV over +-dv/2 (DevLog-039 round 3); null below the residual floor (reverse bias). */
	conductance?: { gSPerM: number | null; resolved: boolean; rawGSPerM?: number; method?: string; reason?: string };
	optics?: {
		dneffVsUndoped: number; dneff: number; lossDbPerCm: number; dalphaDbPerCm: number; alphaPerM: number; densityBasis: string; deltaEps: string;
		vpilVcm?: number | null; vpilDifferentialVcm?: number | null; vpilPushPullVcm?: number | null; dneffPerV?: number | null; dalphaDbPerCmPerV?: number | null;
		vpilPushPullReason?: string; vpilConventions?: Record<string, string>;
	};
}

export interface SemiTarget {
	metric: string;
	at_bias_v: number;
	value: number;
	tol_rel?: number;
	tol_abs?: number;
	vpi_convention?: string;
	engineConvention?: string;
	computed: number | null;
	status: string;
	reason?: string;
	relError?: number | null;
	source?: { device_id?: string; locator?: string; comparable?: boolean; note?: string; basis?: string };
}

export interface SemiResult {
	stage: 'semiconductor';
	id: string;
	section: string;
	labels: string[];
	models: {
		intrinsicDensity: { model: string; locator?: string; niCm3?: number };
		mobility: { doping: string; donor?: string; field: string; locator: string; fieldLocator: string | null; drivingForce?: string; mu_n_cm2_per_vs?: number; mu_p_cm2_per_vs?: number };
		recombination: { model: string; tauNS?: number; tauPS?: number; trapLevelEv?: number; locator?: string };
		plasmaDispersion: { model: string; rowUm: number; mismatchUm: number; locator: string; densityBasis: string; deltaEps: string; definition: string } | null;
		discretisation: string;
	};
	temperatureK: number;
	niCm3: number;
	thermalVoltageV: number;
	mesh: { nNodes: number; nTris: number; nSemiNodes?: number; nSemiEdges?: number; negativeEdgeWeights?: number; build_ms?: number; meshScale: number };
	equilibrium: { iterations: number; maxUpdateVt: number };
	reference: { biasV: number[]; lossDbPerCm?: number; dneffVsUndoped?: number; newtonIterations: number };
	optical: { neff: number; teFraction: number; nNodes: number; nTris: number; nDof: number; window: { x: number[]; y: number[] }; nSiliconQuadraturePoints: number; nSilicon: number; labels: string[] } | null;
	drive: string | null;
	sweep: { contact: string; valuesV: number[]; referenceV: number } | null;
	points: SemiPoint[];
	targets: SemiTarget[];
	targetSummary: { total: number; evaluated: number; passed: number; failed: number };
	meshCheck: unknown;
	solverStats: Record<string, number>;
	timing: Record<string, number>;
	perLength: { biasV: number | null; forwardBiasV: number; cFPerM: number | null; rOhmM: number | null; gSPerM?: number | null; dneffPerV?: number | null; flags: string[]; note: string }[];
	/** semiconductor.operating_bias_v (DC bias of the swept contact for the TWE line), null when not configured. */
	operatingBiasV?: number | null;
}

/** The semiconductor stage result of a run, or null. */
export function semiOf(result: SimulationResult | null | undefined): SemiResult | null {
	const s = (result as unknown as { semiconductor?: SemiResult | null } | null)?.semiconductor;
	return s && Array.isArray(s.points) ? s : null;
}

const fmtV = (v: number) => `${Number(v.toPrecision(6))} V`;

/** Parameter-value label of a bias point: 'cathode = 3.5 V'; k = -1 is the reference bias. */
export function biasLabel(s: SemiResult | null, k: number): string {
	if (!s) return k < 0 ? 'reference bias' : `bias point ${k + 1}`;
	const c = s.sweep?.contact ?? 'bias';
	if (k < 0) return `reference, ${c} = ${fmtV(s.sweep?.referenceV ?? s.reference.biasV[0] ?? 0)}`;
	const p = s.points[k];
	if (!p) return `bias point ${k + 1}`;
	return p.sweptBiasV != null ? `${c} = ${fmtV(p.sweptBiasV)}` : `contacts ${p.biasV.map(fmtV).join(', ')}`;
}

/** Bias choices of a view: every bias point, plus the reference bias when it is not one of them. */
export function biasChoices(s: SemiResult | null): { k: number; label: string }[] {
	if (!s) return [];
	const out = s.points.map((_, k) => ({ k, label: biasLabel(s, k) }));
	const ref = s.sweep?.referenceV;
	if (ref == null || !s.points.some((p) => p.sweptBiasV != null && Math.abs(p.sweptBiasV - ref) < 1e-12)) out.unshift({ k: -1, label: biasLabel(s, -1) });
	return out;
}

/** Bias point shown by a view: its own choice (null = last point, COMSOL default), clamped to the solution. */
export function effectiveBias(s: SemiResult | null, bias: number | null | undefined): number {
	const n = s?.points.length ?? 0;
	if (!n) return -1;
	if (bias == null || bias >= n) return n - 1;
	return bias < -1 ? n - 1 : bias;
}

// ---- Bias sweep Global dataset ----

const D0: Dim = [0, 0, 0, 0];
/** Variables of the Bias sweep dataset: [name, SI unit, display unit, description, value of a point (SI)]. */
const BIAS_DEFS: [string, string, string, string, (p: SemiPoint) => number | null | undefined][] = [
	['semi.V', 'V', 'V', 'bias of the swept contact', (p) => p.sweptBiasV],
	['semi.Vfwd', 'V', 'V', 'forward bias (mean p-contact minus mean n-contact bias)', (p) => p.forwardBiasV],
	['semi.C', 'F/m', 'pF/mm', "C' per length: d(terminal charge)/dV of the swept contact (central difference)", (p) => p.capacitance?.cFPerM],
	['semi.Cdep', 'F/m', 'pF/mm', "C' from the doping-side space charge (depletion diagnostic)", (p) => p.capacitance?.depletionCFPerM],
	['semi.R', 'ohm*m', 'ohm*mm', "R' per length: quasi-neutral access resistance, depleted nodes shorted", (p) => p.resistance?.rOhmM],
	['semi.fRC', 'Hz', 'GHz', "RC corner 1/(2 pi R' C')", (p) => p.rc?.fRcHz],
	['semi.G', 'S/m', 'S/m', "G' per length: junction conductance dI/dV over +-dv/2 (null below the residual floor, i.e. reverse bias)", (p) => p.conductance?.gSPerM],
	['semi.dneff', '1', '1', 'effective index change from the reference bias (first-order mode perturbation by delta eps)', (p) => p.optics?.dneff],
	['semi.dn_eff_per_v', '1/V', '1/V', 'small-signal dn_eff/dV: central difference over the +-dv/2 states at the bias', (p) => p.optics?.dneffPerV],
	['semi.dalpha_dB', '1', '1', 'mode loss change from the reference bias, dB/cm (plain number)', (p) => p.optics?.dalphaDbPerCm],
	['semi.loss_dB', '1', '1', 'free-carrier mode loss vs undoped silicon, dB/cm (plain number)', (p) => p.optics?.lossDbPerCm],
	['semi.alpha', '1/m', '1/cm', 'free-carrier mode power attenuation coefficient', (p) => p.optics?.alphaPerM],
	['semi.VpiL', 'V*m', 'V*cm', 'VpiL single arm, secant from the reference bias', (p) => (p.optics?.vpilVcm ?? null) == null ? null : p.optics!.vpilVcm! * 1e-2],
	['semi.VpiL_diff', 'V*m', 'V*cm', 'VpiL single arm, small signal: lambda / (2 |dn_eff/dV|), dn_eff/dV over +-dv/2 at the bias', (p) => (p.optics?.vpilDifferentialVcm ?? null) == null ? null : p.optics!.vpilDifferentialVcm! * 1e-2],
	['semi.VpiL_pp', 'V*m', 'V*cm', 'VpiL push-pull: lambda / (4 |dn_eff/dV|), both arms reverse biased; null at zero or forward DC bias', (p) => (p.optics?.vpilPushPullVcm ?? null) == null ? null : p.optics!.vpilPushPullVcm! * 1e-2]
];

export const BIAS_VARIABLES: VariableInfo[] = BIAS_DEFS.map(([name, unit, displayUnit, description]) => ({ name, unit, dim: parseUnit(unit).dim, displayUnit, description, location: 'global', complex: false, continuous: true, group: 'bias sweep' }));

/** Engine labels appended to the static descriptions of a solution (VpiL conventions, delta-eps order, density basis). */
export function biasVariables(s: SemiResult | null): VariableInfo[] {
	const conv = s?.points.find((p) => p.optics?.vpilConventions)?.optics?.vpilConventions ?? {};
	const pd = s?.models.plasmaDispersion ?? null;
	const extra: Record<string, string> = {
		'semi.VpiL': conv.vpilVcm ?? '', 'semi.VpiL_diff': conv.vpilDifferentialVcm ?? '', 'semi.VpiL_pp': conv.vpilPushPullVcm ?? '',
		'semi.dneff': pd ? `delta eps ${pd.deltaEps.replaceAll('_', ' ')}, ${pd.densityBasis} density basis` : ''
	};
	return BIAS_VARIABLES.map((v) => (extra[v.name] ? { ...v, description: `${v.description} (engine: ${extra[v.name].replaceAll('_', ' ')})` } : v));
}

/** Bias points where the push-pull VpiL is not defined, with the engine's reason. */
export function pushPullGaps(s: SemiResult | null): { k: number; label: string; reason: string }[] {
	if (!s) return [];
	return s.points.flatMap((p, k) => (p.optics && p.optics.vpilPushPullVcm == null ? [{ k, label: biasLabel(s, k), reason: p.optics.vpilPushPullReason ?? 'not reported by the engine' }] : []));
}

/** Top-level config VpiL targets of a semiconductor run (no bias: listed, not placed on a curve). */
export function configVpiTargets(result: SimulationResult | null | undefined): { metric: string; value: number; convention: string; comparable: boolean; status: string; reason: string; source: string }[] {
	const ts = (result?.targets ?? []) as unknown as { metric: string; value: number; vpi_convention?: string; status: string; reason?: string | null; stage?: string; source?: { device_id?: string; comparable?: boolean; locator?: string; note?: string } }[];
	return ts.filter((t) => t.stage !== 'semiconductor' && /^vpi/.test(t.metric)).map((t) => ({ metric: t.metric, value: t.value, convention: t.vpi_convention ?? 'unspecified', comparable: t.source?.comparable !== false, status: t.status, reason: t.reason ?? '', source: [t.source?.device_id, t.source?.locator, t.source?.note].filter(Boolean).join('; ') }));
}

/** SI globals per bias point (sorted as the engine lists them); a missing value is absent from the record. */
export function biasRecords(s: SemiResult | null): Record<string, number>[] {
	if (!s) return [];
	return s.points.map((p) => {
		const r: Record<string, number> = {};
		for (const [name, , , , get] of BIAS_DEFS) {
			const v = get(p);
			if (typeof v === 'number' && Number.isFinite(v)) r[name] = v;
		}
		return r;
	});
}

/** A referenced value absent at one bias point (passed through the engine compiler, which rethrows passThrough errors). */
class Missing extends Error {
	get passThrough() {
		return true;
	}
}

/** Values of a Bias sweep expression per point in the display unit (NaN where a referenced value is missing). */
export function biasValues(expr: string, records: Record<string, number>[], unit?: string): { values: number[]; unit: string; siUnit: string; dim: Dim } {
	const known = new Map(BIAS_VARIABLES.map((v) => [v.name, v]));
	const scope = (rec: Record<string, number> | null) => ({
		resolve(name: string) {
			if (name === 'pi') return { kind: 'const', re: Math.PI, dim: D0 };
			const def = known.get(name);
			if (!def) return null;
			if (!rec) return { kind: 'const', re: 1, dim: def.dim };
			if (!Object.hasOwn(rec, name)) throw new Missing(name);
			return { kind: 'const', re: rec[name], dim: def.dim, global: true };
		}
	});
	const probe = compileExpression(expr, scope(null));
	const dim = probe.dim;
	const conv = displayConversion(dim, unit || null);
	const values = records.map((rec) => {
		try {
			const c = compileExpression(expr, scope(rec));
			return (c.constant?.re ?? NaN) / conv.factor;
		} catch (e) {
			if (e instanceof Missing) return NaN;
			throw e;
		}
	});
	return { values, unit: conv.unit, siUnit: formatUnit(dim), dim };
}

/** Semiconductor target metric -> Bias sweep variable and the factor from the metric unit to SI. */
const METRIC_VAR: Record<string, [string, number]> = {
	vpil_vcm: ['semi.VpiL', 1e-2], vpil_differential_vcm: ['semi.VpiL_diff', 1e-2], dneff: ['semi.dneff', 1],
	dalpha_db_per_cm: ['semi.dalpha_dB', 1], loss_db_per_cm: ['semi.loss_dB', 1], c_pf_per_mm: ['semi.C', 1e-9],
	r_ohm_mm: ['semi.R', 1e-3], f_rc_ghz: ['semi.fRC', 1e9]
};
// engine convention labels (round 2 names kept for older results)
const CONVENTION_VAR: Record<string, string> = {
	single_arm_secant_from_reference: 'semi.VpiL', single_arm_small_signal_central_dv: 'semi.VpiL_diff', push_pull_small_signal_both_arms_reverse_biased: 'semi.VpiL_pp',
	single_arm_differential: 'semi.VpiL_diff', push_pull_differential_both_arms_reverse_biased: 'semi.VpiL_pp'
};

/** Variable a semiconductor target compares with (VpiL follows the convention the engine used for it). */
export function targetVariable(t: SemiTarget): string | null {
	if ((t.metric === 'vpil_vcm' || t.metric === 'vpil_differential_vcm') && t.engineConvention && CONVENTION_VAR[t.engineConvention]) return CONVENTION_VAR[t.engineConvention];
	return METRIC_VAR[t.metric]?.[0] ?? null;
}

/** Paper points of the stage targets on a Bias sweep series of `expr` drawn in `unit` (only plain variable names). */
export function biasTargetPoints(s: SemiResult | null, expr: string, unit: string): { x: number; y: number; label: string; detail: string; muted?: boolean }[] {
	if (!s) return [];
	const name = expr.trim();
	const def = BIAS_VARIABLES.find((v) => v.name === name);
	if (!def) return [];
	const fac = displayConversion(def.dim, unit || null).factor;
	const out: { x: number; y: number; label: string; detail: string; muted?: boolean }[] = [];
	for (const t of s.targets) {
		if (targetVariable(t) !== name || !Number.isFinite(t.value) || !Number.isFinite(t.at_bias_v)) continue;
		const si = t.value * METRIC_VAR[t.metric][1];
		const cmp = t.source?.comparable === false ? ' (comparable: false)' : '';
		const conv = t.engineConvention ? `; engine convention ${t.engineConvention.replaceAll('_', ' ')}` : '';
		out.push({
			x: t.at_bias_v, y: si / fac, label: `${t.source?.device_id ?? 'paper'}${cmp}`, muted: t.source?.comparable === false,
			detail: `${t.metric} ${t.value} at ${t.at_bias_v} V${t.source?.locator ? ` (${t.source.locator})` : ''}; ${t.status}${t.computed != null ? `, engine ${Number(t.computed.toPrecision(4))}` : ''}${cmp}${conv}`
		});
	}
	return out;
}
