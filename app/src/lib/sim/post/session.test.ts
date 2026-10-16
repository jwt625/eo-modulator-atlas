// Worker-side Results protocol over the engine store, on the analytic G-S-G fixture (uniform gap field 0.5 V/µm per
// terminal volt, +x in the right gap; closed forms in the fixture header).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../../../../../engine/src/run.mjs';
import { setIn } from '../../../../../engine/src/yaml-edit.mjs';
import { createSolutionStore, latticeIndex, refinedPoints } from '../../../../../engine/src/postproc/index.mjs';
import { PostSession } from './session';
import { sweepValues, prettyUnit } from './ui';

const gsg = readFileSync(new URL('../../../../../engine/tests/fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');

function session(text: string, numModes?: number) {
	const result = runCrossSection(text, { stages: ['optical_mode', 'eo_overlap'], keep: true, ...(numModes ? { numModes } : {}) });
	const s = new PostSession(createSolutionStore(result));
	return { s, result };
}

describe('PostSession (engine store, DevLog-031)', () => {
	const { s, result } = session(gsg);
	it('exposes base datasets only, with display meshes', () => {
		const ids = s.datasets().map((d) => d.id);
		expect(ids).toContain('es');
		expect(ids).toContain('eoA');
		expect(ids.some((i) => i.includes(':'))).toBe(false);
		const m = s.meshes();
		expect(Object.keys(m)).toContain('es');
		expect(Object.keys(m).some((k) => k.includes('p2'))).toBe(false);
	});
	it('evaluates the uniform gap field and the potential difference', () => {
		expect(s.derived({ kind: 'point', dataset: 'es', expr: 'es.Ex', unit: 'V/um', selection: [2, 0] }).value).toBeCloseTo(0.5, 9);
		expect(s.derived({ kind: 'line_int', dataset: 'es', expr: '-es.Ex', unit: 'V', selection: { ax: 1, ay: 0, bx: 3, by: 0, n: 100 } }).value).toBeCloseTo(-1, 9);
		const p = s.plot({ dataset: 'es', expr: 'es.V', unit: 'V', selection: ['medium'] });
		expect(p.max).toBeCloseTo(1, 9);
		expect(p.min).toBeCloseTo(0, 9);
		expect(p.maxAt).not.toBeNull();
		// refined element-local lattice (DevLog-034): default Normal (r = 3), smoothing inside material domains
		expect(p.location).toBe('refined');
		expect(p.mesh).toBe('es');
		expect(p.r).toBe(3);
		expect(p.smoothing).toBe('material');
		const es = s.meshes().es;
		expect(p.values.length).toBe((es.tri.length / 3) * 10);
		// interior lattice points: drawn value = exact point value
		const { x, y } = refinedPoints(es, 3);
		for (const t of [0, 7, Math.floor(es.tri.length / 6)]) {
			const i = t * 10 + latticeIndex(3, 1, 1);
			expect(p.values[i]).toBeCloseTo(s.derived({ kind: 'point', dataset: 'es', expr: 'es.V', unit: 'V', selection: [x[i], y[i]] }).value, 10);
		}
		const e = s.plot({ dataset: 'es', expr: 'es.Ex', unit: 'V/um', resolution: 'fine', smoothing: 'none' });
		expect(e.r).toBe(4);
		expect(e.smoothing).toBe('none');
		expect(e.values.length).toBe((es.tri.length / 3) * 15);
	});
	it('integrates the EO integrand to the engine dn_eff/V', () => {
		const dn = result.eo!.arms.A.dnEffPerV;
		const r = s.derived({ kind: 'surface_int', dataset: 'eoA', expr: 'eo.integrand', unit: '1/V' });
		expect(Math.abs(r.value - dn)).toBeLessThanOrEqual(Math.abs(dn) * 1e-9);
	});
	it('checks units and reports errors', () => {
		expect(s.check('es', undefined, 'es.normE', 'V/um').unit).toBe('V/um');
		expect(() => s.check('es', undefined, 'es.normE', 'V')).toThrow(/does not match/);
		expect(() => s.plot({ dataset: 'es', expr: 'es.V + es.Ex' })).toThrow();
		const l = s.line('es', undefined, ['es.V'], ['V'], { ax: -1, ay: 0, bx: 3, by: 0, n: 41 });
		expect(l.values[0].length).toBe(41);
		expect(l.s[40]).toBeCloseTo(4, 9);
	});
	it('maps a mode index to the engine mode dataset', () => {
		const two = session(gsg, 2).s;
		const opt = two.datasets().find((d) => d.id === 'opt')!;
		expect(opt.nModes).toBe(2);
		const rows = two.modes('opt');
		expect(rows.length).toBe(2);
		const other = rows.find((r) => !r.selected)!.k;
		const a = two.derived({ kind: 'global', dataset: 'opt', expr: 'opt.neff', mode: other });
		expect(a.value).toBeCloseTo(rows[other].neff, 12);
	});
});

describe('RF frequency sweep dataset', () => {
	it('plots rf.alpha_dB in dB/cm per frequency as the engine RF result', () => {
		const result = runCrossSection(gsg, { stages: ['optical_mode', 'eo_overlap', 'rf_line'], keep: true });
		const s = new PostSession(createSolutionStore(result));
		expect(s.datasets().some((d) => d.kind === 'rf')).toBe(true);
		const p = s.plot({ dataset: 'rf', expr: 'rf.alpha_dB', unit: 'dB/cm' });
		const sw = result.rf!.sweep!;
		expect(p.location).toBe('sweep');
		expect(Array.from(p.x!)).toEqual(sw.fGhz);
		for (let i = 0; i < sw.fGhz.length; i++) expect(p.values[i]).toBeCloseTo(sw.alphaDbPerCm[i], 9);
	});
});

describe('main-thread globals (engine evaluateGlobals)', () => {
	it('evaluates sweep globals and RF variables with units', () => {
		const v = sweepValues('VpiL', [{ VpiL: 0.025 }, null], 'V*cm');
		expect(v.values[0]).toBeCloseTo(2.5, 12);
		expect(Number.isNaN(v.values[1])).toBe(true);
		expect(prettyUnit('V/um')).toBe('V/µm');
	});
});
