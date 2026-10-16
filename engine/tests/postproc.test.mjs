// Postprocessing engine (DevLog-031): expression language, units, solution store identities, plots, derived values,
// EO breakdown, mode table, sweep globals. Inputs: the synthetic analytic fixture gsg-eo-rf (uniform gap field).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../src/run.mjs';
import { runSweepPoint } from '../src/sweep.mjs';
import { parseConfig, opticalOptions } from '../src/config.mjs';
import {
  createSolutionStore, evaluatePlot, evaluateDerived, modeTable, evaluateGlobals, createSweepStore, runGlobals,
  compileExpression, parseExpression, parseUnit, formatUnit, displayConversion, ExpressionError,
  evaluateAtPoints, storeForSweepPoint, armElectrodeGap,
} from '../src/postproc/index.mjs';
import { DIMLESS } from '../src/postproc/units.mjs';

const fixture = readFileSync(new URL('./fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// ---- expression language -----------------------------------------------------------------------------------------

const constScope = (vars = {}) => ({ resolve: (n) => (Object.hasOwn(vars, n) ? { kind: 'const', ...vars[n] } : n === 'i' ? { kind: 'const', re: 0, im: 1, dim: DIMLESS } : null) });
const val = (src, vars) => compileExpression(src, constScope(vars)).constant;
const V = parseUnit('V').dim, M = parseUnit('m').dim;

test('expr: precedence and associativity', () => {
  assert.equal(val('1 + 2 * 3').re, 7);
  assert.equal(val('-2^2').re, -4);
  assert.equal(val('2^3^2').re, 512);
  assert.equal(val('2^-1').re, 0.5);
  assert.equal(val('(1 + 2) * 3').re, 9);
  assert.equal(val('8 / 4 / 2').re, 1);
  assert.equal(val('1 < 2 && 3 >= 3').re, 1);
  assert.equal(val('1 > 2 || !(1 == 1)').re, 0);
  assert.equal(val('if(2 != 2, 5, 6)').re, 6);
  assert.equal(val('max(1, 4, 2) - min(3, -1)').re, 5);
  assert.equal(val('atan2(1, 1) * 4').re, Math.PI);
  assert.ok(Math.abs(val('log10(1000)').re - 3) < 1e-15);
});

test('expr: complex arithmetic', () => {
  assert.deepEqual(val('i^2'), { re: -1, im: 0 });
  const s = val('sqrt(-4)');
  assert.ok(Math.abs(s.re) < 1e-15 && Math.abs(s.im - 2) < 1e-15);
  assert.equal(val('abs(3 + 4*i)').re, 5);
  assert.deepEqual(val('conj(1 + 2*i)'), { re: 1, im: -2 });
  assert.deepEqual(val('imag((1 + 2*i) * (3 - i))'), { re: 5, im: 0 });
  const e = val('exp(i * pi)', { pi: { re: Math.PI, dim: DIMLESS } });
  assert.ok(Math.abs(e.re + 1) < 1e-15 && Math.abs(e.im) < 1e-15);
  assert.throws(() => val('max(i, 1)'), /complex/);
  assert.throws(() => val('i < 1'), /real operands/);
});

test('expr: units are inferred and checked', () => {
  const vars = { u: { re: 2, dim: V }, d: { re: 4e-6, dim: M } };
  const c = compileExpression('u / d', constScope(vars));
  assert.equal(c.unit, 'V/m');
  assert.equal(c.constant.re, 5e5);
  assert.equal(compileExpression('sqrt(d^2)', constScope(vars)).unit, 'm');
  assert.equal(val('2[um]').re, 2e-6);
  assert.equal(compileExpression('d[1/m]', constScope(vars)).unit, '1');
  assert.throws(() => compileExpression('u + d', constScope(vars)), (e) => e instanceof ExpressionError && /incompatible units V and m/.test(e.message) && e.pos === 2);
  assert.throws(() => compileExpression('exp(d)', constScope(vars)), /dimensionless/);
  assert.throws(() => compileExpression('d^u', constScope(vars)), /exponent must be dimensionless/);
  assert.throws(() => compileExpression('min(u, d)', constScope(vars)), /incompatible/);
  assert.equal(displayConversion(parseUnit('V/m').dim, 'V/um').factor, 1e6);
  assert.throws(() => displayConversion(parseUnit('V/m').dim, 'pF/m'), /does not match/);
});

test('expr: errors and no evaluation of host code', () => {
  for (const src of ['', '1 +', '(1', '1)', 'foo(1)', 'sqrt', '1 2', 'a[', '"x"', 'x.constructor', '__proto__', 'process.exit(1)', 'this', 'a;b', '`x`']) {
    assert.throws(() => compileExpression(src, constScope()), ExpressionError, src);
  }
  assert.throws(() => parseExpression('1'.repeat(3000)), /longer than/);
  assert.throws(() => parseExpression('('.repeat(80) + '1' + ')'.repeat(80)), /nesting too deep/);
  assert.throws(() => compileExpression('sqrt(1, 2)', constScope()), /takes 1 argument/);
});

test('units: parser and formatting', () => {
  assert.deepEqual(parseUnit('pF/m'), { dim: parseUnit('F/m').dim, factor: 1e-12 });
  assert.equal(parseUnit('V*cm').factor, 1e-2);
  assert.equal(formatUnit(parseUnit('1/(V*um^2)').dim), '1/(V*m^2)');
  assert.ok(Math.abs(parseUnit('1/(V*um^2)').factor - 1e12) < 1e-3);
  assert.equal(parseUnit('kg').factor, 1);
  assert.equal(parseUnit('THz').factor, 1e12);
  assert.equal(formatUnit(parseUnit('W/um^2').dim), 'W/m^2');
  assert.throws(() => parseUnit('V/furlong'), /unknown unit/);
  assert.throws(() => parseUnit('2V'), /only the number 1/);
});

// ---- keep, store, identities -------------------------------------------------------------------------------------

test('keep: internals are non-enumerable; the result is otherwise unchanged', () => {
  const a = runCrossSection(fixture, { stages: ['eo_overlap'] });
  const b = runCrossSection(fixture, { stages: ['eo_overlap'], keep: true });
  assert.equal('internals' in a, false);
  assert.ok(b.internals && b.internals.es);
  assert.deepEqual(Object.keys(a), Object.keys(b));
  assert.deepEqual(a.metrics, b.metrics);
  assert.equal(JSON.stringify(b).includes('internals'), false);
  assert.equal('internals' in structuredClone(b), false);
  assert.throws(() => createSolutionStore(a), /keep: true/);
  assert.throws(() => runCrossSection(fixture, { keep: 'yes' }), /keep must be a boolean/);
});

for (const solver of ['scalar', 'vector']) {
  test(`identities (${solver}): energy, line integral, EO integrand, power, electrode potentials`, () => {
    const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'], solver, keep: true });
    const st = createSolutionStore(r);
    // integral of es.We over the solved domain (symmetry none) = C' V^2 / 2
    const W = evaluateDerived(st, { kind: 'surface_int', dataset: 'es', expr: 'es.We' });
    assert.equal(W.unit, 'J/m');
    assert.ok(rel(W.value, (r.metrics.c_pul_pf_per_m * 1e-12) / 2) < 1e-9, String(W.value));
    // int (-E . t) dl from the signal face (x = 1 um) to the ground face (x = 3 um) = phi(ground) - phi(signal) = -1 V
    for (const y of [0, 0.37, -0.81]) {
      const L = evaluateDerived(st, { kind: 'line_int', dataset: 'es', expr: '-(es.Ex*t1x + es.Ey*t1y)', selection: { polyline: [[1, y], [3, y]] } });
      assert.equal(L.unit, 'V');
      assert.ok(Math.abs(L.value + 1) < 1e-12, String(L.value));
    }
    // EO integrand integrates to the engine dn_eff/V of each arm (gate 1e-9)
    for (const a of ['A', 'B']) {
      const I = evaluateDerived(st, { kind: 'surface_int', dataset: `eo${a}`, expr: 'eo.integrand' });
      assert.equal(I.unit, '1/V');
      assert.ok(rel(I.value, r.eo.arms[a].dnEffPerV) < 1e-9, `${a} ${I.value} vs ${r.eo.arms[a].dnEffPerV}`);
      const parts = ['r33', 'r13', 'r22', 'r51', 'other'].map((c) => evaluateDerived(st, { kind: 'surface_int', dataset: `eo${a}`, expr: `eo.integrand_${c}` }).value);
      assert.ok(rel(parts.reduce((s, v) => s + v, 0), I.value) < 1e-12);
      assert.ok(r.eo.arms[a].breakdown.relativeDifferenceVsEngine < 1e-12);
    }
    // explicit arm prefix from any dataset equals the arm dataset value
    assert.ok(rel(evaluateDerived(st, { kind: 'surface_int', dataset: 'armA', expr: 'eoA.integrand' }).value, r.eo.arms.A.dnEffPerV) < 1e-9);
    // optical power normalisation: int S_z dA = 1 W
    const P = evaluateDerived(st, { kind: 'surface_int', dataset: 'opt', expr: 'opt.Sz' });
    assert.equal(P.unit, 'W');
    assert.ok(Math.abs(P.value - 1) < 1e-9, String(P.value));
    // es.V at and inside electrodes equals the normalised electrode potential (signal 1 V, grounds 0 V)
    const pv = evaluateDerived(st, { kind: 'point', dataset: 'es', expr: 'es.V', selection: { points: [[0, 0], [1, 0.2], [-4, 0.5], [3, -0.3], [2, 0]] } });
    assert.deepEqual(pv.values.slice(0, 4), [1, 1, 0, 0]);
    assert.ok(Math.abs(pv.values[4] - 0.5) < 1e-12);
    const pe = evaluateDerived(st, { kind: 'point', dataset: 'es', expr: 'es.Ex', unit: 'V/um', selection: { point: [2, 0] } });
    assert.ok(Math.abs(pe.value - 0.5) < 1e-9, String(pe.value));
    // uniform field: conventional Gamma = +1 (A) and -1 (B), gap 2 um from the geometry
    assert.equal(r.eo.arms.A.conventional.gapUm, 2);
    assert.ok(Math.abs(r.eo.arms.A.conventional.gamma - 1) < 1e-9 && Math.abs(r.eo.arms.B.conventional.gamma + 1) < 1e-9);
    assert.ok(rel(evaluateDerived(st, { kind: 'global', dataset: 'es', expr: 'GammaA - GammaB' }).value, 2) < 1e-9);
  });
}

test('EO: scalar uniform field reproduces the closed-form VpiL through the n_eff-factor textbook variant', () => {
  const r = runCrossSection(fixture, { stages: ['eo_overlap'], solver: 'scalar' });
  const c = r.eo.conventional;
  assert.ok(rel(c.vpiLVcmNeffFactor, r.eo.vpiLVcm) < 1e-6, `${c.vpiLVcmNeffFactor} vs ${r.eo.vpiLVcm}`);
  // textbook (no n_eff factor): lambda g / (2 n_e^3 r33 Gamma) with Gamma = 1, g = 2 um
  assert.ok(rel(c.vpiLVcmTextbook, (1.55e-6 * 2e-6) / (2 * 2.1 ** 3 * 30e-12) * 100) < 1e-9);
  assert.equal(typeof r.eo.formulas.gamma, 'string');
  const t = r.eo.arms.A.breakdown.byTensorTerm;
  assert.ok(rel(t.xx, r.eo.arms.A.breakdown.byComponent.r33) < 1e-12);
});

test('plots: locations, sizes, smoothing, units, cut lines and points', () => {
  const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'], solver: 'vector', keep: true });
  const st = createSolutionStore(r);
  const es = st.mesh('es');
  const p1 = evaluatePlot(st, { dataset: 'es', expr: 'es.V' });
  assert.equal(p1.location, 'node');
  assert.equal(p1.n, es.nNodes);
  assert.equal(p1.min, 0);
  assert.equal(p1.max, 1);
  const p2 = evaluatePlot(st, { dataset: 'es', expr: 'es.normE', unit: 'V/um' });
  assert.equal(p2.location, 'element');
  assert.equal(p2.n, es.nTris);
  assert.equal(evaluatePlot(st, { dataset: 'es', expr: 'es.Ex', location: 'corner' }).n, 3 * es.nTris);
  assert.equal(evaluatePlot(st, { dataset: 'es', expr: 'es.Ex', location: 'quad' }).n, 6 * es.nTris);
  const sm = evaluatePlot(st, { dataset: 'es', expr: 'es.normE', location: 'node' });
  assert.equal(sm.n, es.nNodes);
  // values are fresh arrays (transferable without touching the cache)
  const again = evaluatePlot(st, { dataset: 'es', expr: 'es.V' });
  assert.notEqual(again.values.buffer, p1.values.buffer);
  const o = evaluatePlot(st, { dataset: 'opt', expr: 'opt.Ez', part: 'imag' });
  assert.equal(o.complex, true);
  assert.equal(evaluatePlot(st, { dataset: 'opt', expr: 'opt.Ex' }).complex, false);
  const cl = st.addCutLine({ points: [[-4, 0], [4, 0]], n: 81 });
  const c = evaluatePlot(st, { dataset: cl.id, expr: 'es.V' });
  assert.equal(c.values.length, 81);
  assert.equal(c.s[80], 8);
  assert.ok(Math.abs(c.values[40] - 1) < 1e-12 && Math.abs(c.values[60] - 0.5) < 1e-9);
  const li = evaluateDerived(st, { kind: 'line_int', dataset: cl.id, expr: 'es.Ex*t1x' });
  assert.ok(Math.abs(li.value) < 1e-9);
  const cp = st.addCutPoints({ points: [[2, 0], [-2, 0]] });
  const cv = evaluatePlot(st, { dataset: cp.id, expr: 'es.Ex', unit: 'V/um' });
  assert.ok(Math.abs(cv.values[0] - 0.5) < 1e-9 && Math.abs(cv.values[1] + 0.5) < 1e-9);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'es.V + es.Ex' }), /incompatible units/);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'eo.integrand' }), /eoA/);
  assert.throws(() => evaluatePlot(st, { dataset: 'nope', expr: '1' }), /unknown dataset/);
});

test('derived: region selections, averages, extrema, globals', () => {
  const r = runCrossSection(fixture, { stages: ['eo_overlap'], solver: 'scalar', keep: true });
  const st = createSolutionStore(r);
  const area = evaluateDerived(st, { kind: 'surface_int', dataset: 'es', expr: '1', selection: { regions: ['medium'] } });
  assert.equal(area.unit, 'm^2');
  // medium 10 x 2 um minus three 2 x 2 um electrodes
  assert.ok(rel(area.value, 8e-12) < 1e-12, String(area.value));
  const avg = evaluateDerived(st, { kind: 'surface_avg', dataset: 'es', expr: 'es.V', selection: ['medium'] });
  assert.ok(Math.abs(avg.value - 0.5) < 1e-9, String(avg.value));
  const mx = evaluateDerived(st, { kind: 'surface_max', dataset: 'es', expr: 'es.Ex', unit: 'V/um' });
  assert.ok(Math.abs(mx.value - 0.5) < 1e-9 && mx.at.length === 2);
  const mn = evaluateDerived(st, { kind: 'surface_min', dataset: 'es', expr: 'es.Ex', unit: 'V/um' });
  assert.ok(Math.abs(mn.value + 0.5) < 1e-9);
  assert.throws(() => evaluateDerived(st, { kind: 'surface_int', dataset: 'es', expr: '1', selection: { regions: ['nope'] } }), /unknown region nope/);
  const g = evaluateDerived(st, { kind: 'global', dataset: 'es', expr: 'C', unit: 'pF/m' });
  assert.ok(rel(g.value, r.metrics.c_pul_pf_per_m) < 1e-12);
  assert.throws(() => evaluateDerived(st, { kind: 'global', dataset: 'es', expr: 'es.V' }), /depends on fields/);
  const vars = st.variables('eoA').map((v) => v.name);
  for (const n of ['x', 'es.We', 'armA.psi', 'eo.integrand', 'eoB.integrand_r33', 'C', 'VpiL', 'armA.neff']) assert.ok(vars.includes(n), n);
});

test('modes: numModes / optics.num_modes and the mode table', () => {
  assert.throws(() => opticalOptions(parseConfig(fixture).raw, { numModes: 0 }), /numModes/);
  assert.throws(() => parseConfig(fixture.replace('mode_index: 0', 'mode_index: 0\n  num_modes: 99')), /num_modes/);
  const base = runCrossSection(fixture, { stages: ['optical_mode'], solver: 'vector', keep: true });
  const r = runCrossSection(fixture, { stages: ['optical_mode'], solver: 'vector', keep: true, numModes: 6 });
  assert.ok(Math.abs(r.metrics.n_eff - base.metrics.n_eff) < 1e-9);
  const rows = modeTable(createSolutionStore(r), 'opt');
  assert.ok(rows.length >= 6);
  assert.equal(rows.filter((x) => x.selected).length, 1);
  for (let k = 1; k < rows.length; k++) assert.ok(rows[k].neff <= rows[k - 1].neff);
  const sel = rows.find((x) => x.selected);
  assert.ok(Math.abs(sel.neff - r.metrics.n_eff) < 1e-12 && sel.teFraction >= 0.5);
  assert.ok(Math.abs(Object.values(sel.confinement).reduce((s, v) => s + v, 0) - 1) < 1e-9);
});

test('sweeps: globals on every point, retained stores bounded, rows over points', () => {
  const text = fixture.replace('    eps_r: 30\n', '    eps_r: "=eps_m"\n') + '\nparams:\n  eps_m: {value: 30}\nstudy: {type: parametric, sweep: [{param: eps_m, values: [30, 20, 10]}], stages: [eo_overlap]}\n';
  const sw = createSweepStore({ maxStores: 2 });
  for (let i = 0; i < 3; i++) sw.addPoint(runSweepPoint(text, i, { keep: true, solver: 'scalar' }));
  assert.equal(sw.memory().stores, 2);
  assert.equal(sw.store(0), null);
  assert.ok(sw.store(2));
  const rows = sw.rows('C', { unit: 'pF/m' }).rows;
  assert.equal(rows.length, 3);
  // C' = 2 eps0 eps_r h / g scales with eps_r
  assert.ok(Math.abs(rows[0].value / rows[2].value - 3) < 1e-9);
  const st = sw.store(2);
  assert.ok(rel(evaluateDerived(st, { kind: 'global', dataset: 'es', expr: 'C' }).value, rows[2].value * 1e-12) < 1e-12);
  const g = runGlobals(runCrossSection(text, { stages: ['eo_overlap'], solver: 'scalar', params: { eps_m: 30 } }));
  const ev = evaluateGlobals('VpiL * 1[1/m]', [g, {}]);
  assert.ok(Number.isFinite(ev.values[0]) && Number.isNaN(ev.values[1]));
});

// ---- round 2 (audit simulator-r-eng-audit-2026-10-15) ---------------------------------------------------------

const readCase = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// E1: the integrand integral equals the engine dn_eff/V on non-uniform realistic meshes (quadrature points on
// electrostatic element edges are located in the same triangle as the engine sampling).
for (const [name, path] of [['K4', '../../validation/cases/K4.yaml'], ['K7-D2.6', '../../validation/cases/K7-D2.6.yaml'], ['renaud2023', '../../sims/renaud2023/config.yaml']]) {
  test(`E1 gate: int eo.integrand = engine dn_eff/V to 1e-9 on ${name} (vector, both arms)`, () => {
    const r = runCrossSection(readCase(path), { stages: ['eo_overlap'], solver: 'vector', keep: true });
    const st = createSolutionStore(r);
    for (const a of ['A', 'B']) {
      if (!r.eo.arms[a]) continue;
      const v = evaluateDerived(st, { kind: 'surface_int', dataset: `eo${a}`, expr: 'eo.integrand' }).value;
      assert.ok(rel(v, r.eo.arms[a].dnEffPerV) < 1e-9, `${name} ${a}: ${rel(v, r.eo.arms[a].dnEffPerV)}`);
    }
    if (name === 'K7-D2.6') {
      // E2: values at element vertices (shared by several triangles) do not depend on the query history
      const m = st.mesh('es');
      const pts = [];
      for (let i = 0; i < m.nNodes && pts.length < 40; i += 97) pts.push([m.x[i], m.y[i]]);
      const fwd = evaluateAtPoints(st, { dataset: 'es', expr: 'es.Ex', points: pts }).values;
      const rev = evaluateAtPoints(st, { dataset: 'es', expr: 'es.Ex', points: [...pts].reverse() }).values.reverse();
      for (let i = 0; i < pts.length; i++) assert.ok(Object.is(fwd[i], rev[i]) || fwd[i] === rev[i], `point ${i}: ${fwd[i]} vs ${rev[i]}`);
      for (const p of pts) assert.equal(evaluateAtPoints(st, { dataset: 'es', expr: 'es.Ex', points: [[p[0] + 0.3, p[1] - 0.2], p] }).values[1], fwd[pts.indexOf(p)]);
    }
  });
}

test('E3: complex values at run time are rejected where real operands are required', () => {
  const r = runCrossSection(fixture, { stages: ['electrostatics'], keep: true });
  const st = createSolutionStore(r);
  const q = (expr) => evaluateDerived(st, { kind: 'point', dataset: 'es', expr, selection: { point: [2.9, 0.9] } });
  for (const e of ['sqrt(es.V/1[V] - 0.5) > -1', 'max(sqrt(es.V/1[V] - 0.5), -1)', 'atan2(sqrt(es.V/1[V] - 0.5), 1)', 'if(sqrt(es.V/1[V] - 0.5), 1, 0)']) {
    assert.throws(() => q(e), /complex at run time/, e);
  }
  assert.ok(q('imag(if(1, sqrt(es.V/1[V] - 0.5), 0))').value > 0);
});

test('E4/E6/E7: shared constants, one position per message, ambiguous exponent units', () => {
  const g = evaluateGlobals('C*i + VpiL/lambda0*0[F/(m*V)]', [{ C: 1e-10, VpiL: 0.02, lambda0: 1.55e-6 }, { C: 1e-10, VpiL: 0.02 }]);
  assert.equal(g.valuesIm[0], 1e-10);
  assert.ok(Number.isNaN(g.values[1]));
  assert.throws(() => compileExpression('1[min]', constScope()), (e) => /unit \[min\]: unknown unit 'min' at position 3$/.test(e.message));
  assert.throws(() => compileExpression('1 2', constScope()), /unexpected '2' at position 3/);
  assert.throws(() => compileExpression('2^2[um]', constScope()), /ambiguous/);
  assert.equal(compileExpression('(2^2)[um]', constScope()).unit, 'm');
  assert.equal(parseUnit('dB/cm').factor, 100);
});

test('E9: electrodes outside the arm window height do not set the gap', () => {
  const sec = (els) => ({ geom: { symmetry: 'none' }, electrodes: els.map(([name, x0, x1, y0, y1]) => ({ name, bbox: { x0, x1, y0, y1 } })) });
  const win = { x: [-1, 1], y: [-0.5, 1] };
  const g = armElectrodeGap(sec([['s', -5, -2, 0.3, 1], ['g', 2.5, 6, 0.3, 1], ['back', -20, 20, -3, -2]]), win, [1, 0, 0]);
  assert.equal(g.gapUm, 4.5);
  assert.deepEqual(g.ignoredElectrodes, ['back']);
  const h = armElectrodeGap(sec([['s', -5, -2, 0.3, 1], ['g', 2.5, 6, 0.3, 1], ['top', -1, 1, 0.8, 1.2]]), win, [1, 0, 0]);
  assert.equal(h.gapUm, null);
  assert.match(h.reason, /spans the arm centre/);
});

test('round 2 additions: p2nodes, rf dataset, alias, accuracy note, refined max, dispose, sweep point store', () => {
  const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap', 'rf_line'], solver: 'vector', keep: true });
  assert.match(r.eo.accuracyNote, /1.4e-3 to 3.5e-3/);
  const st = createSolutionStore(r);
  const p2 = evaluatePlot(st, { dataset: 'es', expr: 'es.V', location: 'p2nodes' });
  const nodes = evaluatePlot(st, { dataset: 'es', expr: 'es.V' });
  assert.ok(p2.n > nodes.n && p2.elem.length === 6 * st.mesh('es').nTris && p2.x.length === p2.n);
  for (let i = 0; i < nodes.n; i++) assert.equal(p2.values[i], nodes.values[i]);
  assert.equal(evaluatePlot(st, { dataset: 'es', expr: 'es.normE', location: 'p2nodes' }).n, p2.n);
  const rf = evaluatePlot(st, { dataset: 'rf', expr: 'rf.alpha_dB', unit: 'dB/cm' });
  assert.equal(rf.location, 'sweep');
  assert.deepEqual(Array.from(rf.values), r.rf.sweep.alphaDbPerCm);
  assert.deepEqual(Array.from(rf.fGhz), r.rf.sweep.fGhz);
  const np = evaluatePlot(st, { dataset: 'rf', expr: 'rf.alpha / rf.alpha_dB' });
  assert.ok(Math.abs(np.values[0] - Math.LN10 / 20) < 1e-15);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'rf.nRF' }), /rf dataset/);
  const ds = st.datasets();
  assert.equal(ds.find((d) => d.id === 'armA').aliasOf, 'opt');
  assert.equal(ds.find((d) => d.id === 'armB').aliasOf, undefined);
  const mx = evaluateDerived(st, { kind: 'surface_max', dataset: 'opt', expr: 'opt.Sz' });
  const quadMax = evaluatePlot(st, { dataset: 'opt', expr: 'opt.Sz', location: 'quad' }).max;
  assert.ok(mx.value >= quadMax && Number.isInteger(mx.element));
  st.dispose();
  assert.throws(() => st.datasets(), /solution store disposed/);
  assert.throws(() => evaluatePlot(st, { dataset: 'es', expr: 'es.V' }), /solution store disposed/);
  const text = fixture.replace('    eps_r: 30\n', '    eps_r: "=eps_m"\n') + '\nparams:\n  eps_m: {value: 30}\nstudy: {type: parametric, sweep: [{param: eps_m, values: [30, 20]}], stages: [eo_overlap]}\n';
  const sw = createSweepStore({ maxStores: 1 });
  const a = storeForSweepPoint(text, 1, { sweepStore: sw, solver: 'scalar' });
  assert.equal(a.reused, false);
  const b = storeForSweepPoint(text, 1, { sweepStore: sw, solver: 'scalar' });
  assert.equal(b.reused, true);
  assert.equal(b.store, a.store);
  const c = storeForSweepPoint(text, 1, { sweepStore: sw, solver: 'vector' });
  assert.equal(c.reused, false);
  assert.ok(rel(evaluateDerived(c.store, { kind: 'global', dataset: 'es', expr: 'C' }).value, (2 * 8.8541878128e-12 * 20 * 2e-6) / 2e-6) < 1e-6);
});

test('round 3: one mode index space (X3) and line quadrature without resolution (X11)', () => {
  const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'], solver: 'vector', keep: true, numModes: 4 });
  const st = createSolutionStore(r);
  const rows = modeTable(st, 'opt');
  const sel = rows.find((x) => x.selected);
  assert.deepEqual(r.optical.mode, { k: sel.k, family: sel.family, familyIndex: sel.familyIndex, label: sel.label, selected: true });
  assert.equal(r.optical.mode.family, 'TE');
  assert.equal(r.optical.mode.familyIndex, r.optical.modeIndex);
  assert.equal(r.optical.mode.label, `k=${sel.k} (TE0)`);
  for (const x of rows) assert.equal(x.label, `k=${x.k} (${x.family}${x.familyIndex})`);
  assert.deepEqual(r.eo.arms.A.mode, r.optical.mode);
  assert.equal(r.eo.arms.B.mode.family, 'TE');
  const d = st.datasets().find((q) => q.id === `opt:${sel.k}`);
  assert.equal(d.modeLabel, sel.label);
  assert.match(d.label, /solved/);
  const s = runCrossSection(fixture, { stages: ['optical_mode'], solver: 'scalar' });
  assert.deepEqual(s.optical.mode, { k: 0, family: 'TE', familyIndex: 0, label: 'k=0 (TE0)', selected: true });
  const L = evaluateDerived(st, { kind: 'line_int', dataset: 'es', expr: 'es.Ex', selection: { polyline: [[1, 0], [3, 0]] } });
  assert.equal(L.quadrature, 'gauss3_per_element_crossing');
  assert.throws(() => evaluateDerived(st, { kind: 'line_int', dataset: 'es', expr: 'es.Ex', selection: { polyline: [[1, 0], [3, 0]] }, resolution: 600 }), /resolution is not used/);
});
