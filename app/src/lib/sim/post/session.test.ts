// Worker-side Results protocol over the engine store, on the analytic G-S-G fixture (uniform gap field 0.5 V/µm per
// terminal volt, +x in the right gap; closed forms in the fixture header).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../../../../../engine/src/run.mjs';
import { setIn } from '../../../../../engine/src/yaml-edit.mjs';
import { createSolutionStore } from '../../../../../engine/src/postproc/index.mjs';
import { PostSession } from './session';
import { sweepValues, prettyUnit } from './ui';
import type { FieldMesh } from '../types';

const gsg = readFileSync(new URL('../../../../../engine/tests/fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');

function session(text: string, numModes?: number) {
	const result = runCrossSection(text, { stages: ['optical_mode', 'eo_overlap'], keep: true, ...(numModes ? { numModes } : {}) });
	const s = new PostSession(createSolutionStore(result));
	const p2: FieldMesh | null = s.meshes()['es.p2'] ?? null;
	return { s, result, p2 };
}

describe('PostSession (engine store, DevLog-031)', () => {
	const { s, result, p2 } = session(gsg);
	it('exposes base datasets only, with display meshes', () => {
		const ids = s.datasets().map((d) => d.id);
		expect(ids).toContain('es');
		expect(ids).toContain('eoA');
		expect(ids.some((i) => i.includes(':'))).toBe(false);
		const m = s.meshes();
		expect(Object.keys(m)).toContain('es');
		if (p2) expect(m['es.p2'].tri.length).toBe(p2.tri.length);
	});
	it('evaluates the uniform gap field and the potential difference', () => {
		expect(s.derived({ kind: 'point', dataset: 'es', expr: 'es.Ex', unit: 'V/um', selection: [2, 0] }).value).toBeCloseTo(0.5, 9);
		expect(s.derived({ kind: 'line_int', dataset: 'es', expr: '-es.Ex', unit: 'V', selection: { ax: 1, ay: 0, bx: 3, by: 0, n: 100 } }).value).toBeCloseTo(-1, 9);
		const p = s.plot({ dataset: 'es', expr: 'es.V', unit: 'V', selection: ['medium'] });
		expect(p.max).toBeCloseTo(1, 9);
		expect(p.min).toBeCloseTo(0, 9);
		expect(p.maxAt).not.toBeNull();
		if (p2) expect(p.mesh).toBe('es.p2');
		if (p2) {
			// P2 display: refined node values equal the engine point values (vertices and edge midpoints).
			const pts = [5, p2.x.length - 3, Math.floor(p2.x.length / 2)];
			for (const i of pts) expect(p.values[i]).toBeCloseTo(s.derived({ kind: 'point', dataset: 'es', expr: 'es.V', unit: 'V', selection: [p2.x[i], p2.y[i]] }).value, 10);
		}
		const e = s.plot({ dataset: 'es', expr: 'es.Ex', unit: 'V/um' });
		expect(e.location).toBe(p2 ? 'corner' : 'element');
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
