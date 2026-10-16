// DevLog-042: semiconductor UI helpers (bias sweep globals, bias routing, signed-log scale, notices, doping shapes).
// Synthetic inputs only (no engine run): values are arbitrary test numbers, not physics data.
import { describe, expect, it } from 'vitest';
import { biasChoices, biasLabel, biasRecords, biasTargetPoints, biasValues, biasVariables, configVpiTargets, effectiveBias, pushPullGaps, type SemiPoint, type SemiResult } from './semi';
import { scaleT, autoRange } from './fieldmath';
import { belowLogRange, contourLevels, featureRange, modeRegionValues } from './layers';
import { newFeature, Results } from './results.svelte';
import { plotRequest, derivedRequest, lineRequest } from './requests';
import { responseNotices } from './labels';
import { cm3Label, dopingShapes, semiContacts } from './semiOverlay';
import type { Geometry } from '../../../../engine/src/config.mjs';

function point(v: number, c: number, r: number, dneff: number): SemiPoint {
	return {
		biasV: [0, v], sweptBiasV: v, forwardBiasV: -v, contacts: [], newton: { rampSteps: 1, iterations: 3, gmres: 4, residualInf: 1e-14 }, flags: [], timing: {},
		capacitance: { cFPerM: c, cPfPerMm: c * 1e9, depletionCFPerM: c, depletionCPfPerMm: c * 1e9, metalCFPerM: 0, dvV: 0.01, contact: 'cathode', contactType: 'n', method: 'test' },
		resistance: { rOhmM: r, rOhmMm: r * 1e3, method: 'test', nDepletedNodes: 0 },
		rc: { fRcHz: 1 / (2 * Math.PI * r * c), fRcGhz: 1 / (2 * Math.PI * r * c) / 1e9, tauS: r * c },
		optics: { dneffVsUndoped: dneff, dneff, lossDbPerCm: 10, dalphaDbPerCm: -1, alphaPerM: 200, densityBasis: 'absolute', deltaEps: 'first_order', vpilVcm: v > 0 ? 1.2 * v : null, vpilDifferentialVcm: 1.5, vpilPushPullVcm: v > 0 ? 0.75 : null }
	};
}
function fake(ref = 0): SemiResult {
	return {
		stage: 'semiconductor', id: 't', section: 'geometry', labels: [], temperatureK: 300, niCm3: 1e10, thermalVoltageV: 0.0258,
		models: { intrinsicDensity: { model: 'x' }, mobility: { doping: 'x', field: 'y', locator: '', fieldLocator: null }, recombination: { model: 'none' }, plasmaDispersion: null, discretisation: '' },
		mesh: { nNodes: 1, nTris: 1, meshScale: 1 }, equilibrium: { iterations: 1, maxUpdateVt: 0 }, reference: { biasV: [0, ref], newtonIterations: 1 }, optical: null, drive: 'single_arm',
		sweep: { contact: 'cathode', valuesV: [0, 1, 2], referenceV: ref },
		points: [point(0, 3e-10, 6e-3, 0), point(1, 2.5e-10, 6e-3, 6e-5), point(2, 2e-10, 6e-3, 1e-4)],
		targets: [{ metric: 'c_pf_per_mm', at_bias_v: 2, value: 0.15, computed: null, status: 'not_evaluated', source: { device_id: 'paper-a', comparable: false } }, { metric: 'vpil_vcm', at_bias_v: 2, value: 1.6, computed: 0.75, status: 'fail', engineConvention: 'push_pull_differential_both_arms_reverse_biased' }],
		targetSummary: { total: 2, evaluated: 1, passed: 0, failed: 1 }, meshCheck: null, solverStats: {}, timing: { total_ms: 1 }, perLength: []
	};
}

describe('Bias sweep dataset (DevLog-042)', () => {
	it('evaluates per-bias globals in display units and expressions of them', () => {
		const recs = biasRecords(fake());
		const c = biasValues('semi.C', recs, 'pF/mm');
		expect(c.unit).toBe('pF/mm');
		expect(c.values[0]).toBeCloseTo(0.3, 12);
		expect(biasValues('semi.VpiL', recs, 'V*cm').values.slice(1)).toEqual([expect.closeTo(1.2, 12), expect.closeTo(2.4, 12)]);
		// a missing value (no secant VpiL at the reference bias) is NaN, not zero
		expect(Number.isNaN(biasValues('semi.VpiL', recs, 'V*cm').values[0])).toBe(true);
		const f = biasValues('1/(2*pi*semi.R*semi.C)', recs, 'GHz').values;
		const g = biasValues('semi.fRC', recs, 'GHz').values;
		f.forEach((v, i) => expect(v).toBeCloseTo(g[i], 9));
		expect(() => biasValues('semi.nope', recs)).toThrow();
	});
	it('places stage targets on the variable of their engine convention, in the plotted unit', () => {
		const s = fake();
		expect(biasTargetPoints(s, 'semi.C', 'pF/mm')).toEqual([expect.objectContaining({ x: 2, y: expect.closeTo(0.15, 12) })]);
		expect(biasTargetPoints(s, 'semi.C', 'pF/m')[0].y).toBeCloseTo(150, 9);
		expect(biasTargetPoints(s, 'semi.C', 'pF/mm')[0].label).toContain('comparable: false');
		expect(biasTargetPoints(s, 'semi.C', 'pF/mm')[0].muted).toBe(true);
		expect(biasTargetPoints(s, 'semi.VpiL_pp', 'V*cm')[0].muted).toBe(false);
		// push-pull convention -> the push-pull series, not the secant one
		expect(biasTargetPoints(s, 'semi.VpiL', 'V*cm')).toEqual([]);
		expect(biasTargetPoints(s, 'semi.VpiL_pp', 'V*cm')[0].y).toBeCloseTo(1.6, 12);
		// round 3 engine convention names map to the same variables
		s.targets[1].engineConvention = 'push_pull_small_signal_both_arms_reverse_biased';
		expect(biasTargetPoints(s, 'semi.VpiL_pp', 'V*cm').length).toBe(1);
		s.targets[1].engineConvention = 'single_arm_small_signal_central_dv';
		expect(biasTargetPoints(s, 'semi.VpiL_diff', 'V*cm').length).toBe(1);
	});
	it('reports push-pull gaps with the engine reason, engine labels in descriptions, config VpiL targets', () => {
		const s = fake();
		s.points[0].optics!.vpilPushPullReason = 'needs a reverse DC bias';
		expect(pushPullGaps(s)).toEqual([{ k: 0, label: 'cathode = 0 V', reason: 'needs a reverse DC bias' }]);
		s.points[1].optics!.vpilConventions = { vpilDifferentialVcm: 'single_arm_small_signal_central_dv' };
		expect(biasVariables(s).find((v) => v.name === 'semi.VpiL_diff')?.description).toContain('single arm small signal central dv');
		const r = { targets: [{ metric: 'vpi_l_dc_vcm', value: 0.96, vpi_convention: 'unspecified', status: 'not_evaluated', source: { comparable: false } }, { metric: 'c_pf_per_mm', value: 1, status: 'x', stage: 'semiconductor' }] };
		expect(configVpiTargets(r as never)).toEqual([expect.objectContaining({ metric: 'vpi_l_dc_vcm', value: 0.96, comparable: false, convention: 'unspecified' })]);
	});
	it('labels bias points and lists the reference only when it is not a bias point', () => {
		expect(biasLabel(fake(), 2)).toBe('cathode = 2 V');
		expect(biasChoices(fake()).map((c) => c.k)).toEqual([0, 1, 2]);
		expect(biasChoices(fake(0.5)).map((c) => c.k)).toEqual([-1, 0, 1, 2]);
		expect(effectiveBias(fake(), null)).toBe(2);
		expect(effectiveBias(fake(), 7)).toBe(2);
		expect(effectiveBias(fake(), -1)).toBe(-1);
	});
});

describe('bias routing of requests (DevLog-042)', () => {
	const R = new Results();
	R.setSolution([
		{ id: 'semi', kind: 'semi', label: 'Semiconductor', section: 'geometry', mesh: 'semi', nBias: 3 },
		{ id: 'opt', kind: 'opt', label: 'Optical mode', section: 'geometry', mesh: 'opt', nModes: 2, mode: 0 }
	]);
	it('sends the bias index of the view as the mode of semiconductor datasets', () => {
		const g = R.addGroup('2d', 'semi', 'G', [newFeature('surface', { expr: 'semi.n', unit: '1/cm^3' }), newFeature('contour', { dataset: 'opt', expr: 'opt.normE^2' })]);
		const req = (b: number | null) => { g.bias = b; return plotRequest(R, g, g.features[0], 'semi.n', '1/cm^3'); };
		expect(req(null)).toMatchObject({ req: { dataset: 'semi', mode: 2 } });
		expect(req(0)).toMatchObject({ req: { mode: 0 } });
		expect(req(-1)).toMatchObject({ req: { mode: -1 } });
		expect(req(9)).toMatchObject({ req: { mode: 2 } });
		// optical features of the same group keep their mode
		expect(plotRequest(R, g, g.features[1], 'opt.normE^2', '')).toMatchObject({ req: { dataset: 'opt', mode: 0 } });
	});
	it('routes cut line and derived value biases', () => {
		const cl = R.addCutLine('semi', { ax: 0, ay: 0, bx: 1, by: 0, n: 10 });
		cl.bias = 1;
		expect(lineRequest(R, cl, 'semi.psi', 'V')).toMatchObject({ dataset: 'semi', mode: 1 });
		const d = R.addDerived('surface_int', { dataset: 'semi', expr: 'semi.n', bias: 0 });
		const r = derivedRequest(R, d);
		expect(typeof r === 'string' ? r : r.req.mode).toBe(0);
	});
});

describe('signed log scale (DevLog-042)', () => {
	const r = { min: 1e12, max: 1e20 };
	it('maps sign and decades symmetrically about the centre', () => {
		expect(scaleT(1e20, 'symlog', r)).toBeCloseTo(1, 12);
		expect(scaleT(-1e20, 'symlog', r)).toBeCloseTo(0, 12);
		expect(scaleT(1e16, 'symlog', r)).toBeCloseTo(0.75, 12);
		expect(scaleT(-1e16, 'symlog', r)).toBeCloseTo(0.25, 12);
		expect(scaleT(1e3, 'symlog', r)).toBe(0.5);
		expect(scaleT(0, 'symlog', r)).toBe(0.5);
	});
	it('takes the automatic |value| range and symmetric contour levels', () => {
		expect(autoRange([-4e20, 5e17, 2e18], 'symlog')).toEqual({ min: 5e17, max: 4e20 });
		const f = newFeature('contour', { count: 3, range: { manual: false, min: 0, max: 1, scale: 'symlog' } });
		const lv = contourLevels(f, r);
		expect(lv[0]).toBeCloseTo(-1e16, 0);
		expect(lv[1]).toBe(0);
		expect(lv[2]).toBeCloseTo(1e16, 0);
		const p = { values: Float64Array.from([-1e19, 1e17]), min: -1e19, max: 1e17, minAt: null, maxAt: null, location: 'refined' as const, mesh: 'semi', unit: '1/cm^3' };
		expect(featureRange(newFeature('surface', { range: { manual: false, min: 0, max: 1, scale: 'symlog' } }), p)).toEqual({ min: 1e17, max: 1e19 });
	});
});

describe('mode-region range and log clamp (DevLog-042 round 2)', () => {
	it('ranges on the lattice points where the mode intensity is >= e^-2 of its peak', () => {
		const v = Float64Array.from([-0.36, -0.3, -1e-3, -5e-4, 0]);
		const w = Float64Array.from([0, 0.01, 1, 0.2, 0.5]);
		expect(Array.from(modeRegionValues(v, w))).toEqual([-1e-3, -5e-4, 0]);
		const p = { values: v, min: -0.36, max: 0, minAt: null, maxAt: null, location: 'refined' as const, mesh: 'semi', unit: '1' };
		expect(featureRange(newFeature('surface', { rangeFrom: 'mode' }), p, w)).toEqual({ min: -1e-3, max: 0 });
		expect(featureRange(newFeature('surface'), p, w)).toEqual({ min: -0.36, max: 0 });
		expect(featureRange(newFeature('surface', { rangeFrom: 'mode', range: { manual: false, min: 0, max: 1, scale: 'log' } }), { ...p, values: Float64Array.from([9e3, 4, 2, 1e-25, 0]) }, w)).toEqual({ min: 2e-8, max: 2 }); // 9e3 and 4 lie outside the mode region; 8-decade clamp
		expect(belowLogRange([1e-5, 4e12, 1e20, 0], { min: 4e12, max: 4e20 })).toBe(1);
	});
});

describe('S7 response notices (DevLog-042)', () => {
	it('lists reference, conductor-model and dielectric-loss notices from the engine result', () => {
		const result = {
			response: { reference: 'dc_limit', normalization: 'model_dc_with_series_resistance', seriesResistanceDcOhm: 25.7, normalizationOffsetDb: 0.353, thinConductorBelowGhz: 61.4, lateralRelaxationGhz: 0.372, thicknessModel: 'slab_symmetric', convention: { normalization: 'H = Phi / Phi_DC' }, byTarget: [{ diagnostics: [{ code: 'slab_model_limits', text: 'slab text' }] }] },
			rf: { dielectricModel: 'none' }, warnings: [],
			targets: [{ metric: 'bw3db_ghz', value: 60, reference: 'low_freq_unstated', referenceSensitivity: [{}], reason: 'not compared' }, { metric: 'eo_rolloff_db', value: -2.5, at_ghz: 110, reference_ghz: 0.01 }]
		};
		const n = responseNotices(result);
		expect(n.map((x) => x.code)).toEqual(['reference', 'thin_conductor', 'lateral_relaxation', 'slab_limits', 'dielectric_none', 'reference_unstated']);
		expect(n[0].text).toContain('DC limit');
		expect(n[0].text).toContain('0.353 dB');
		expect(n[0].text).toContain('0.01 GHz');
		expect(n[3].tip).toBe('slab text');
		// audit F5: a limit is a warning only where the engine flags a target band with its code
		expect(n.find((x) => x.code === 'lateral_relaxation')?.level).toBe('info');
		expect(n.find((x) => x.code === 'slab_limits')?.level).toBe('warn');
		expect(n.find((x) => x.code === 'reference_unstated')?.text).toContain('not evaluated');
		const flagged = responseNotices({ ...result, targets: [{ metric: 'eo_rolloff_db', value: -2.5, at_ghz: 110, diagnosticCodes: ['band_below_lateral_current_relaxation_estimate', 'wheeler_step_check_spread_above_1e-2'] }], rf: { dielectricModel: 'tan_delta_regions', wheeler: { maxRelativeSpread: 0.0186, spreadWarningLevel: 0.01 } } });
		expect(flagged.find((x) => x.code === 'lateral_relaxation')?.level).toBe('warn');
		expect(flagged.find((x) => x.code === 'wheeler_spread')?.text).toContain('0.0186');
		expect(flagged.some((x) => x.code === 'dielectric_none')).toBe(false);
		expect(responseNotices({ response: null })).toEqual([]);
	});
});

describe('doping windows on the geometry (DevLog-042)', () => {
	const sq = (x0: number, x1: number, y0: number, y1: number) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
	const g = { regions: [{ name: 'box', material: 'oxide', poly: sq(-2, 2, -1, 0) }, { name: 'si', material: 'silicon', poly: sq(-2, 2, 0, 0.2) }], electrodes: [] } as unknown as Geometry;
	it('builds rect, region, material and implant-window shapes', () => {
		const semi = {
			materials: { silicon: {} },
			doping: [
				{ name: 'p', species: 'acceptor', profile: 'uniform', concentration_cm3: 5e17, within: { rect: { x_um: [-1, 0], y_um: [0, 0.2] } } },
				{ name: 'n', species: 'donor', profile: 'uniform', concentration_cm3: 5e17, within: { regions: ['si'] } },
				{ name: 'bg', species: 'acceptor', profile: 'uniform', concentration_cm3: 1e15 },
				{ name: 'imp', species: 'donor', profile: 'gaussian', peak_cm3: 1e18, lateral: { x_um: [0, 1] }, within: { material: 'silicon' } }
			],
			contacts: [{ electrode: 'anode', type: 'ohmic', bias_v: 0 }]
		};
		const s = dopingShapes(semi, g);
		expect(s.map((x) => [x.name, x.species, x.polys.length, x.dashed])).toEqual([['p', 'acceptor', 1, false], ['n', 'donor', 1, false], ['bg', 'acceptor', 1, false], ['imp', 'donor', 1, true]]);
		expect(s[3].polys[0]).toEqual(sq(0, 1, 0, 0.2));
		expect(semiContacts(semi)).toEqual([{ index: 0, electrode: 'anode', type: 'ohmic', biasV: 0 }]);
		expect(cm3Label(5e17)).toBe('5e17 cm⁻³');
	});
});
