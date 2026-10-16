// Display labels, units and tooltips of engine metrics.
export const METRIC_LABELS: Record<string, [label: string, unit: string, tip: string]> = {
	c_pul_pf_per_m: ["C'", 'pF/m', 'Capacitance per unit length (energy method)'],
	c0_pul_pf_per_m: ["C0'", 'pF/m', 'Vacuum capacitance per unit length'],
	l_pul_nh_per_m: ["L'", 'nH/m', "Inductance per unit length from C0'"],
	n_rf: ['n_RF', '', 'Quasi-static RF index of this section, sqrt(C/C0)'],
	z0_ohm: ['Z0', 'Ω', 'Quasi-static characteristic impedance of this section'],
	n_eff: ['n_eff', '', 'Effective index of the selected optical mode'],
	ng_opt: ['n_g', '', 'Optical group index'],
	vpi_l_dc_vcm: ['VπL', 'V·cm', 'DC Vpi-length product (engine convention, see EO table)'],
	vpi_dc_v: ['Vπ', 'V', 'DC Vpi at line.length_mm'],
	bw3db_ghz: ['f 3dB', 'GHz', 'EO 3 dB bandwidth: first -3 dB crossing of 20 log10 |H| relative to the DC limit (eo_response)'],
	bw6db_ghz: ['f 6dB', 'GHz', 'EO 6 dB bandwidth: first -6 dB crossing (eo_response)']
};

interface ResponseTarget { metric: string; value: number; at_ghz?: number; reference_ghz?: number; status: string; actual: number | null }

/**
 * Paper response targets as points on the S21 EO (dB) curve: eo_rolloff_db at (at_ghz, value), bandwidths at (value,
 * -3 dB) and (value, -6 dB). A target normalized to reference_ghz is drawn at its own value (the curve is DC-referenced).
 */
export function responseTargetPoints(targets: ResponseTarget[]): { x: number; y: number; label: string; detail: string }[] {
	const out: { x: number; y: number; label: string; detail: string }[] = [];
	for (const t of targets) {
		const ref = t.reference_ghz != null ? `, referenced to ${t.reference_ghz} GHz (curve: DC limit)` : '';
		const st = `${t.status}${t.actual != null ? `, engine ${t.actual.toPrecision(4)}` : ''}`;
		if (t.metric === 'eo_rolloff_db' && t.at_ghz != null) out.push({ x: t.at_ghz, y: t.value, label: 'roll-off', detail: `eo_rolloff_db ${t.value} dB at ${t.at_ghz} GHz${ref}; ${st}` });
		else if (t.metric === 'bw3db_ghz') out.push({ x: t.value, y: -3, label: 'f 3dB', detail: `bw3db_ghz ${t.value} GHz${ref}; ${st}` });
		else if (t.metric === 'bw6db_ghz') out.push({ x: t.value, y: -6, label: 'f 6dB', detail: `bw6db_ghz ${t.value} GHz${ref}; ${st}` });
	}
	return out;
}

export interface ResponseNotice {
	code: string;
	level: 'info' | 'warn';
	/** Short text shown in the notice strip. */
	text: string;
	/** Full engine text (tooltip). */
	tip: string;
}

const g3 = (v: number) => Number(v.toPrecision(3));

/**
 * Reference, normalization and model diagnostics of an eo_response result as notices (DevLog-042; round 2, audit F5):
 * the engine's own fields, warnings and per-target / per-bandwidth diagnostic codes (DevLog-036 rounds 2-5). A model
 * limit is a warning only where the engine flags a target band (or a DC-referenced bandwidth) with its code, otherwise
 * information about the curve. Nothing is computed here.
 */
export function responseNotices(result: unknown): ResponseNotice[] {
	type Diag = { code: string; text: string };
	type Sens = { referenceGhz: number | null; status: string; value: number | null; boundGhz?: number; diagnosticCodes?: string[] };
	const r = result as {
		response?: Record<string, unknown> | null; rf?: { dielectricModel?: string | null; wheeler?: { maxRelativeSpread?: number; spreadWarningLevel?: number } | null } | null;
		loaded?: { loss?: { dielectricModel?: string | null } | null } | null;
		warnings?: string[];
		targets?: { metric: string; reason?: string | null; referenceSensitivity?: Sens[]; diagnosticCodes?: string[]; diagnostic?: string | null; reference?: string; reference_ghz?: number; at_ghz?: number; value: number; status?: string }[];
	} | null;
	const resp = r?.response;
	if (!resp) return [];
	const out: ResponseNotice[] = [];
	const warnings = r?.warnings ?? [];
	const targets = (r?.targets ?? []).filter((t) => ['bw3db_ghz', 'bw6db_ghz', 'eo_rolloff_db'].includes(t.metric));
	const conv = (resp.convention ?? {}) as Record<string, unknown>;
	const norm = String(resp.normalization ?? '');
	const rs = typeof resp.seriesResistanceDcOhm === 'number' ? resp.seriesResistanceDcOhm : null;
	const off = typeof resp.normalizationOffsetDb === 'number' ? resp.normalizationOffsetDb : null;
	const refs = [...new Set(targets.filter((t) => t.reference_ghz != null).map((t) => t.reference_ghz))];
	// every diagnostic of the response: per target (byTarget), per DC-referenced bandwidth, per metric, per reference entry
	const diags: Diag[] = [];
	for (const b of (resp.byTarget ?? []) as { diagnostics?: Diag[] }[]) diags.push(...(b.diagnostics ?? []));
	for (const b of Object.values((resp.bandwidth ?? {}) as Record<string, { diagnostics?: Diag[] }>)) diags.push(...(b?.diagnostics ?? []));
	// metricDiagnostics holds code strings only (stages.mjs): they join the code set, not the Diag list (final audit A4)
	const metricCodes: string[] = [];
	for (const list of Object.values((resp.metricDiagnostics ?? {}) as Record<string, unknown>)) if (Array.isArray(list)) for (const c of list) if (typeof c === 'string') metricCodes.push(c);
	const targetCodes = new Set<string>([...targets.flatMap((t) => t.diagnosticCodes ?? []), ...targets.flatMap((t) => (t.referenceSensitivity ?? []).flatMap((x) => x.diagnosticCodes ?? [])), ...diags.map((d) => d.code), ...metricCodes]);
	const textOf = (code: string) => diags.find((d) => d.code === code)?.text ?? null;
	const junction = resp.junction as { rOhmM?: number; cFPerM?: number; gSPerM?: number | null; fRcGhz?: number; biasV?: number } | null | undefined;
	out.push({
		code: 'reference', level: 'info',
		text: `Curve reference: ${resp.reference === 'dc_limit' ? 'DC limit of the model' : String(resp.reference)}${norm ? ` (${norm.replaceAll('_', ' ')}${rs != null && rs > 0 ? `, DC series R ${g3(rs)} Ω` : ''}${off != null && Math.abs(off) > 1e-9 ? `, ${g3(off)} dB vs the lossless divider` : ''})` : ''}${refs.length ? `; targets referenced to ${refs.join(', ')} GHz` : ''}`,
		tip: [conv.normalization, conv.db, resp.vRefDefinition].filter(Boolean).map(String).join('. ')
	});
	if (junction && resp.lineKind === 'junction_loaded_rf_line')
		out.push({ code: 'junction', level: 'info', text: `Junction-loaded line at ${junction.biasV ?? '-'} V: C'_j ${g3((junction.cFPerM ?? NaN) * 1e9)} pF/mm, R'_j ${g3((junction.rOhmM ?? NaN) * 1e3)} Ω·mm, f_RC ${g3(junction.fRcGhz ?? NaN)} GHz${junction.gSPerM ? `, G'_j ${g3(junction.gSPerM)} S/m` : ''}`, tip: 'Shin, Sakamoto, Dagli 2011 Fig. 2 branch from the semiconductor stage at semiconductor.operating_bias_v; phase driven by the junction voltage (DevLog-036 round 4)' });
	if (typeof resp.thinConductorBelowGhz === 'number') {
		const flagged = targetCodes.has('thin_conductor_semi_infinite_surface_impedance_in_band');
		out.push({ code: 'thin_conductor', level: flagged ? 'warn' : 'info', text: `Thin conductor: thinner than 3 skin depths below ${g3(resp.thinConductorBelowGhz)} GHz (semi-infinite surface impedance)${flagged ? '; a target band reaches below it' : '; no target band below it'}`, tip: 'line.conductor_thickness_model slab_one_sided or slab_symmetric uses the finite-thickness surface impedance.' });
	}
	if (typeof resp.lateralRelaxationGhz === 'number') {
		const flagged = targetCodes.has('band_below_lateral_current_relaxation_estimate');
		out.push({ code: 'lateral_relaxation', level: flagged ? 'warn' : 'info', text: `Lateral current relaxation f_lat ~ ${g3(resp.lateralRelaxationGhz)} GHz (order of magnitude): ${flagged ? 'a target band or the DC-referenced bandwidth reaches below it' : 'the curve below it only; no target band'}`, tip: textOf('band_below_lateral_current_relaxation_estimate') ?? String(resp.lateralRelaxationNote ?? '') });
	}
	const slabFlagged = targetCodes.has('slab_model_limits');
	if (slabFlagged || warnings.includes('slab_model_limits_frozen_geometry_factor_and_sidewalls'))
		out.push({ code: 'slab_limits', level: slabFlagged ? 'warn' : 'info', text: `Slab conductor model (${String(resp.thicknessModel ?? 'slab').replaceAll('_', ' ')}): frozen geometry factor, sidewalls, f -> 0 R' not a DC prediction`, tip: textOf('slab_model_limits') ?? 'slab_model_limits_frozen_geometry_factor_and_sidewalls' });
	const sp = r?.rf?.wheeler?.maxRelativeSpread;
	if (targetCodes.has('wheeler_step_check_spread_above_1e-2') || (typeof sp === 'number' && typeof r?.rf?.wheeler?.spreadWarningLevel === 'number' && sp > r.rf.wheeler.spreadWarningLevel))
		out.push({ code: 'wheeler_spread', level: targetCodes.has('wheeler_step_check_spread_above_1e-2') ? 'warn' : 'info', text: `Wheeler step-check spread ${typeof sp === 'number' ? g3(sp) : '-'} (above ${r?.rf?.wheeler?.spreadWarningLevel ?? 0.01}): conductor resistance uncertain at about that level`, tip: 'wheeler_step_check_spread_above_1e-2: step-check proxy, not a bound (DevLog-036)' });
	const dielNone = (r?.loaded?.loss?.dielectricModel ?? r?.rf?.dielectricModel) === 'none' || warnings.includes('dielectric_loss_declared_none') || targetCodes.has('assumption_dielectric_loss_none');
	if (dielNone) out.push({ code: 'dielectric_none', level: 'warn', text: 'Dielectric loss declared none: the curve and the target verdicts assume a lossless dielectric', tip: 'assumption_dielectric_loss_none (DevLog-036 audit S3)' });
	for (const t of targets)
		if (t.referenceSensitivity && t.reason) {
			const unit = t.metric === 'eo_rolloff_db' ? ' dB' : ' GHz';
			const vals = t.referenceSensitivity.map((x) => `${x.referenceGhz == null ? 'DC' : `${x.referenceGhz} GHz`}: ${x.value != null ? `${g3(x.value)}${unit}` : x.boundGhz != null ? `> ${x.boundGhz} GHz` : String(x.status ?? '-').replaceAll('_', ' ')}`).join(', ');
			out.push({ code: 'reference_unstated', level: 'warn', text: `${t.metric}${t.at_ghz != null ? ` @${t.at_ghz} GHz` : ''} (paper ${t.value}): reference ${String(t.reference ?? 'unstated').replaceAll('_', ' ')}, not evaluated; engine with reference ${vals}`, tip: t.reason });
		}
	return out;
}
