import { describe, expect, it } from 'vitest';
import { autoRange, buildTriIndex, locate, meshBBox, pointInPoly, sampleLine, scaleT, triMinAngle, triSize, valueAt } from './fieldmath';
import { colormapLut } from './colormap';
import { linearTicks, logTicks, tickLabel } from './ticks';
import { applyOverrides, deleteIn, getIn, numericLeaves, setIn, splitPath } from './yamlEdit';
import { readFileSync } from 'node:fs';
import { parseSweepValues, guessDeviceX } from './sweepValues';
import { readUrlState, writeUrlState, urlStagesFor } from './urlState';
import type { EsFields, FieldMesh, ScalarField } from './types';
import { drawnAt, perElement, refinedDisplay } from './refined';
import { contourLevels, featureRange } from './layers';
import { newFeature, nextName, Results } from './results.svelte';

/** Structured n x n grid on [0, 1]^2, two triangles per cell. */
function grid(n: number): FieldMesh {
	const x = new Float64Array((n + 1) * (n + 1)), y = new Float64Array((n + 1) * (n + 1));
	for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { x[j * (n + 1) + i] = i / n; y[j * (n + 1) + i] = j / n; }
	const tri = new Int32Array(6 * n * n);
	let k = 0;
	for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
		const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
		tri.set([a, b, d, a, d, c], k); k += 6;
	}
	return { x, y, tri, triRegion: new Int32Array(2 * n * n), regionNames: ['r'] };
}

describe('mesh index and probe', () => {
	const m = grid(20);
	const idx = buildTriIndex(m);
	it('locates every probe point inside the unit square and none outside', () => {
		for (let k = 0; k < 500; k++) {
			const px = (k * 0.6180339) % 1, py = (k * 0.4142135) % 1;
			const loc = locate(m, idx, px, py);
			expect(loc).not.toBeNull();
			const { tri, x, y } = m;
			const t = loc!.t;
			const rx = loc!.w0 * x[tri[3 * t]] + loc!.w1 * x[tri[3 * t + 1]] + loc!.w2 * x[tri[3 * t + 2]];
			const ry = loc!.w0 * y[tri[3 * t]] + loc!.w1 * y[tri[3 * t + 1]] + loc!.w2 * y[tri[3 * t + 2]];
			expect(rx).toBeCloseTo(px, 12);
			expect(ry).toBeCloseTo(py, 12);
		}
		expect(locate(m, idx, 1.5, 0.5)).toBeNull();
	});
	it('interpolates a linear nodal field exactly and samples it along a line', () => {
		const values = new Float64Array(m.x.length).map((_, i) => 2 * m.x[i] - 3 * m.y[i] + 1);
		const f: ScalarField = { mesh: m, values, at: 'node', label: 'f', unit: '', signed: true };
		const loc = locate(m, idx, 0.37, 0.71)!;
		expect(valueAt(f, loc)).toBeCloseTo(2 * 0.37 - 3 * 0.71 + 1, 12);
		const line = sampleLine(f, idx, 0, 0.5, 1, 0.5, 11);
		expect(line.s[10]).toBeCloseTo(1, 12);
		line.v.forEach((v, k) => expect(v).toBeCloseTo(2 * (k / 10) - 0.5, 10));
		const outside = sampleLine(f, idx, -1, 0.5, -0.5, 0.5, 3);
		expect(outside.v.every(Number.isNaN)).toBe(true);
	});
	it('reports element size and quality', () => {
		expect(triSize(m)[0]).toBeCloseTo(Math.SQRT2 / 20, 12);
		expect(triMinAngle(m)[0]).toBeCloseTo(45, 9);
		expect(meshBBox(m)).toEqual({ x0: 0, x1: 1, y0: 0, y1: 1 });
	});
	it('computes ranges and normalized coordinates per scale mode', () => {
		const v = [-2, 0.5, 1, 4];
		expect(autoRange(v, 'linear')).toEqual({ min: -2, max: 4 });
		expect(autoRange(v, 'symmetric')).toEqual({ min: -4, max: 4 });
		expect(autoRange(v, 'log')).toEqual({ min: 0.5, max: 4 });
		expect(scaleT(1, 'log', { min: 0.1, max: 10 })).toBeCloseTo(0.5, 12);
		expect(scaleT(5, 'linear', { min: 0, max: 10 })).toBe(0.5);
		expect(scaleT(NaN, 'linear', { min: 0, max: 1 })).toBeNaN();
	});
	it('tests point-in-polygon', () => {
		const sq = [[0, 0], [1, 0], [1, 1], [0, 1]];
		expect(pointInPoly(0.5, 0.5, sq)).toBe(true);
		expect(pointInPoly(1.5, 0.5, sq)).toBe(false);
	});
});

describe('colormap and ticks', () => {
	it('builds 256-entry tables that hit both anchors', () => {
		const lut = colormapLut('Viridis');
		expect(lut.length).toBe(1024);
		expect(Array.from(lut.slice(0, 3))).toEqual([0x44, 0x01, 0x54]);
		expect(Array.from(lut.slice(1020, 1023))).toEqual([0xfd, 0xe7, 0x25]);
	});
	it('produces nice linear and log ticks', () => {
		expect(linearTicks(0, 1, 5)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
		expect(linearTicks(-3.2, 7.9, 5)).toEqual([-2, 0, 2, 4, 6]);
		expect(logTicks(1, 1000)).toEqual([1, 10, 100, 1000]);
		expect(logTicks(1, 50)).toEqual([1, 2, 5, 10, 20, 50]);
		expect(tickLabel(0.6000000000000001)).toBe('0.6');
		expect(tickLabel(1e-6)).toBe('1e-6');
	});
});

describe('YAML round trip', () => {
	const text = '# header comment\nschema: eo-atlas.sim/v1\noptics:\n  wavelength_nm: 1550 # keep me\ngeometry:\n  regions:\n    - {name: a, rect: {x_um: [-1, 1], y_um: [0, 1]}}\n';
	it('sets values without losing comments or flow style', () => {
		const out = setIn(text, splitPath('optics.wavelength_nm'), 1310);
		expect(out).toContain('# header comment');
		expect(out).toContain('wavelength_nm: 1310 # keep me');
		const out2 = setIn(out, splitPath('geometry.regions.0.rect.x_um.1'), 2);
		expect(out2).toContain('x_um: [-1, 2], y_um');
		expect(getIn(out2, ['geometry', 'regions', 0, 'rect', 'x_um'])).toEqual([-1, 2]);
	});
	it('changes only the edited value (U3) and quotes strings safely', () => {
		const src = 'a: {value: 738, unit: nm}   # spaced comment\nlist:\n- [1, 2]\nexpr: "=gap_um/2"\n';
		const out = setIn(src, ['a', 'value'], 532);
		const changed = out.split('\n').filter((l, i) => l !== src.split('\n')[i]);
		expect(changed).toEqual(['a: {value: 532, unit: nm}   # spaced comment']);
		expect(getIn(setIn(src, ['expr'], '=max(gap_um, 2)'), ['expr'])).toBe('=max(gap_um, 2)');
		expect(getIn(deleteIn(src, ['a', 'unit']), ['a'])).toEqual({ value: 738 });
	});
	// G3: key insertion through the app path changes one line; deleting it restores the text byte for byte.
	const changedLines = (a: string, b: string) => {
		const x = a.split('\n'), y = b.split('\n');
		let i = 0;
		while (i < x.length && i < y.length && x[i] === y[i]) i++;
		let j = 0;
		while (j < x.length - i && j < y.length - i && x[x.length - 1 - j] === y[y.length - 1 - j]) j++;
		return { removed: x.length - i - j, added: y.length - i - j };
	};
	for (const [file, path, value] of [
		['../sims/chen2022/config.yaml', 'geometry.mesh.element_order', 1],
		['../sims/renaud2023/config.yaml', 'optics.solver', 'vector'],
		['../sims/renaud2023/config.yaml', 'params.gap_um.value', 4]
	] as [string, string, number | string][]) {
		it(`round-trips ${path} on ${file.split('/')[2]}`, () => {
			const src = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8');
			const had = getIn(src, splitPath(path)) !== undefined;
			const out = setIn(src, splitPath(path), value);
			expect(getIn(out, splitPath(path))).toBe(value);
			const d = changedLines(src, out);
			expect(d.added).toBe(1);
			// one line changes: an existing value line, an insertion into a flow map's line, or one new block line
			expect(d.removed).toBeLessThanOrEqual(1);
			if (had) expect(d.removed).toBe(1);
			if (!had) expect(deleteIn(out, splitPath(path))).toBe(src);
		});
	}
	it('applies overrides and lists numeric leaves', () => {
		const out = applyOverrides(text, [['optics.wavelength_nm', 1000]]);
		expect(getIn(out, ['optics', 'wavelength_nm'])).toBe(1000);
		const leaves = numericLeaves({ optics: { wavelength_nm: 1550 }, targets: [{ value: 1 }] });
		expect(leaves).toEqual([{ path: 'optics.wavelength_nm', value: 1550 }]);
	});
});

describe('sweep values and URL state', () => {
	it('parses lists, ranges and linspace', () => {
		expect(parseSweepValues('3, 4 5')).toEqual([3, 4, 5]);
		expect(parseSweepValues('2.5:0.5:4')).toEqual([2.5, 3, 3.5, 4]);
		expect(parseSweepValues('linspace(0, 1, 3)')).toEqual([0, 0.5, 1]);
		expect(() => parseSweepValues('1:-1:3')).toThrow();
		expect(() => parseSweepValues('a, b')).toThrow();
		expect(guessDeviceX('geometry.electrodes.0.gap_um')).toBe('electrode_gap_um');
	});
	it('round-trips the shareable state', () => {
		const s = { id: 'mao2022-a', section: 'unloaded', mesh: 2, stages: ['optical_mode'], overrides: [['optics.wavelength_nm', 1310]] as [string, number][], sweep: { path: 'optics.wavelength_nm', values: '1300:50:1600' } };
		const back = readUrlState(new URLSearchParams(writeUrlState(s)));
		expect(back).toEqual(s);
		expect(readUrlState(new URLSearchParams('config=sims/x/config.yaml')).id).toBe('sims/x/config.yaml');
	});
	it('scopes link stages to the config the link names (DevLog-043)', () => {
		const sim = { id: 'han2023-a', path: 'sims/han2023/config.yaml' };
		expect(urlStagesFor(readUrlState(new URLSearchParams('id=han2023-a&stages=semiconductor,optical_mode')), sim)).toEqual(['semiconductor', 'optical_mode']);
		expect(urlStagesFor(readUrlState(new URLSearchParams('config=sims/han2023/config.yaml&stages=semiconductor')), sim)).toEqual(['semiconductor']);
		expect(urlStagesFor(readUrlState(new URLSearchParams('stages=semiconductor')), sim)).toBeNull();
		expect(urlStagesFor(readUrlState(new URLSearchParams('id=yang2022-a&stages=eo_overlap')), sim)).toBeNull();
		expect(urlStagesFor(readUrlState(new URLSearchParams('id=han2023-a&stages=')), sim)).toEqual([]);
		expect(urlStagesFor(readUrlState(new URLSearchParams('id=han2023-a')), sim)).toBeNull();
	});
});

describe('refined display (DevLog-034)', () => {
	const m = grid(3);
	it('splits every element into r^2 sub-triangles on the element-local lattice', () => {
		const nT = m.tri.length / 3;
		for (const r of [1, 2, 3, 5]) {
			const d = refinedDisplay(m, r);
			const np = ((r + 1) * (r + 2)) / 2;
			expect(d.np).toBe(np);
			expect(d.x.length).toBe(nT * np);
			expect(d.sub.length).toBe(3 * r * r * nT);
			// sub-triangles of element t only reference its own lattice points; their areas add up to the element area
			for (let t = 0; t < nT; t++) {
				let area = 0;
				for (let q = 0; q < r * r; q++) {
					const [a, b, c] = [0, 1, 2].map((k) => d.sub[3 * (t * r * r + q) + k]);
					for (const i of [a, b, c]) expect(Math.floor(i / np)).toBe(t);
					area += Math.abs((d.x[b] - d.x[a]) * (d.y[c] - d.y[a]) - (d.x[c] - d.x[a]) * (d.y[b] - d.y[a])) / 2;
				}
				expect(area).toBeCloseTo(1 / (2 * 9), 12);
			}
		}
		expect(refinedDisplay(m, 3)).toBe(refinedDisplay(m, 3));
	});
	it('draws the linear interpolation of the lattice values and reproduces lattice values exactly', () => {
		const r = 4, d = refinedDisplay(m, r);
		const f = (x: number, y: number) => x * x - 2 * x * y + 0.5 * y;
		const values = Float64Array.from(d.x, (x, i) => f(x, d.y[i]));
		for (const i of [0, 7, 33, values.length - 1]) expect(drawnAt(m, values, r, d.x[i], d.y[i])!.v).toBeCloseTo(values[i], 12);
		// quadratic field: interpolation error bounded by h^2 / 8 |f''| with h = 1 / (3 r)
		for (const [x, y] of [[0.11, 0.42], [0.5, 0.5], [0.93, 0.07], [0.31, 0.77]]) expect(Math.abs(drawnAt(m, values, r, x, y)!.v - f(x, y))).toBeLessThan(((1 / 12) ** 2 / 8) * 6);
		expect(drawnAt(m, values, r, 1.5, 0.5)).toBeNull();
		expect(Array.from(perElement([2, 5]))).toEqual([2, 2, 2, 5, 5, 5]);
	});
});

describe('plot feature layers', () => {
	it('computes ranges and contour levels', () => {
		const f = newFeature('contour', { count: 4 });
		const p = { values: Float64Array.of(-2, 1, 3), location: 'refined' as const, mesh: 'm', unit: 'V', min: -2, max: 3, minAt: null, maxAt: null };
		expect(featureRange(f, p)).toEqual({ min: -2, max: 3 });
		f.range.scale = 'symmetric';
		expect(featureRange(f, p)).toEqual({ min: -3, max: 3 });
		expect(contourLevels(f, { min: -3, max: 3 }).map((v) => Number(v.toFixed(6)))).toEqual([-1.8, -0.6, 0.6, 1.8]);
		f.levelsMode = 'list';
		f.list = '0, 1.5 2';
		expect(contourLevels(f, { min: -3, max: 3 })).toEqual([0, 1.5, 2]);
		f.range = { manual: true, min: -1, max: 1, scale: 'linear' };
		expect(featureRange(f, p)).toEqual({ min: -1, max: 1 });
	});
});

describe('results model (round 2)', () => {
	it('numbers new names like COMSOL', () => {
		expect(nextName('Surface', [])).toBe('Surface 1');
		expect(nextName('Surface', ['Surface 1', 'Surface 3', 'Contour 1'])).toBe('Surface 4');
		const R = new Results();
		const g = R.addGroup('2d');
		expect(R.addFeature(g.id, 'surface')!.name).toBe('Surface 1');
		expect(R.addFeature(g.id, 'surface')!.name).toBe('Surface 2');
		expect(R.addDerived('surface_int').name).toBe('Surface Integration 1');
		expect(R.addDerived('surface_int').name).toBe('Surface Integration 2');
	});
	it('writes wide tables with numeric parameter columns', () => {
		const R = new Results();
		const t = R.addTable();
		R.appendRow(t, { dataset: 'sweep', 'gap_um (µm)': 2.5, 'Z0 (Ω)': 40 }, { 'gap_um (µm)': 'param', 'Z0 (Ω)': 'value' });
		R.appendRow(t, { dataset: 'sweep', 'gap_um (µm)': 3, 'C (pF/m)': 120 }, { 'C (pF/m)': 'value' });
		expect(t.columns).toEqual(['dataset', 'gap_um (µm)', 'Z0 (Ω)', 'C (pF/m)']);
		expect(t.rows).toEqual([['sweep', 2.5, 40, ''], ['sweep', 3, '', 120]]);
		expect(t.roles['gap_um (µm)']).toBe('param');
	});
	it('undoes and redoes model edits', () => {
		const R = new Results();
		R.commit(R.snapshotJson());
		const g = R.addGroup('2d', '', 'A');
		(R as unknown as { lastAt: number }).lastAt = 0;
		R.commit(R.snapshotJson());
		R.deleteGroup(g.id);
		(R as unknown as { lastAt: number }).lastAt = 0;
		R.commit(R.snapshotJson());
		expect(R.groups.length).toBe(0);
		expect(R.undo()).toBe(true);
		expect(R.groups.map((x) => x.name)).toEqual(['A']);
		expect(R.undo()).toBe(true);
		expect(R.groups.length).toBe(0);
		expect(R.redo()).toBe(true);
		expect(R.groups.map((x) => x.name)).toEqual(['A']);
	});
});
