// S8 canonical lateral PN rib in SOI end to end (DevLog-039 G9, G6, P1): drift-diffusion, C(V), series R, plasma
// dispersion, vector-mode perturbation, VpiL(V), loss(V). Doping, lifetimes and contact geometry are illustrative
// case inputs (tests/semi-fixtures.mjs), so the checks are physics consistency, not literature values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSemiconductor, runSemiconductorSweepPoint } from '../src/semi-stage.mjs';
import { rib } from './semi-fixtures.mjs';

const t0 = performance.now();
const r = runSemiconductor(rib({ values: '[0, 1, 2, 4]' }), { datasets: 'reference' });
const wall = performance.now() - t0;

test('G9 rib: depletion shifts n_eff up and loss down monotonically; C falls, f_RC rises with reverse bias', () => {
  const pts = r.points;
  assert.equal(pts[0].sweptBiasV, 0);
  assert.ok(Math.abs(pts[0].optics.dneff) < 1e-15);
  for (let k = 1; k < pts.length; k++) {
    assert.ok(pts[k].optics.dneff > pts[k - 1].optics.dneff, 'carrier depletion raises the index');
    assert.ok(pts[k].optics.lossDbPerCm < pts[k - 1].optics.lossDbPerCm, 'carrier depletion lowers the free-carrier loss');
    assert.ok(pts[k].capacitance.cFPerM < pts[k - 1].capacitance.cFPerM);
    assert.ok(pts[k].rc.fRcGhz > pts[k - 1].rc.fRcGhz);
    assert.ok(pts[k].optics.vpilVcm > 0 && Number.isFinite(pts[k].optics.vpilVcm));
  }
  // secant VpiL from the definition
  const p2 = pts.find((p) => p.sweptBiasV === 2);
  assert.ok(Math.abs(p2.optics.vpilVcm - (2 * 1.55e-4) / (2 * p2.optics.dneff)) < 1e-12);
  // reference loss: free carriers of the doped waveguide (absolute basis), positive
  assert.ok(r.reference.lossDbPerCm > 0 && r.reference.dneffVsUndoped < 0);
  // charge neutrality and the depletion part of C
  for (const p of pts) {
    assert.ok(Math.abs(p.checks.chargeSumCPerM) < 1e-6 * p.checks.chargeMaxCPerM, `neutrality at ${p.sweptBiasV} V`);
    assert.ok(p.capacitance.depletionCFPerM > 0 && p.capacitance.metalCFPerM > 0 && p.capacitance.depletionCFPerM < p.capacitance.cFPerM);
    assert.ok(p.resistance.rOhmM > 0);
  }
  console.log(`# rib: ${r.mesh.nNodes} nodes (${r.mesh.nSemiNodes} semiconductor), optical ${r.optical.nNodes} nodes, wall ${wall.toFixed(0)} ms, timing ${JSON.stringify(Object.fromEntries(Object.entries(r.timing).map(([k, v]) => [k, Math.round(v)])))}`);
  for (const p of pts) console.log(`#   ${p.sweptBiasV} V: C ${p.capacitance.cPfPerMm.toFixed(4)} pF/mm, R ${p.resistance.rOhmMm.toFixed(2)} ohm mm, fRC ${p.rc.fRcGhz.toFixed(1)} GHz, dneff ${p.optics.dneff.toExponential(3)}, loss ${p.optics.lossDbPerCm.toFixed(3)} dB/cm, VpiL ${p.optics.vpilVcm?.toFixed(3)} V cm, solve ${p.timing.solve_ms.toFixed(0)} ms, C ${p.timing.capacitance_ms.toFixed(0)} ms`);
});

test('G9 rib: models, labels and the semi dataset with units', () => {
  assert.equal(r.models.plasmaDispersion.model, 'nedeljkovic_2011');
  assert.equal(r.models.plasmaDispersion.densityBasis, 'absolute');
  assert.ok(r.labels.includes('no_bandgap_narrowing') && r.labels.includes('masetti_total_impurity_density'));
  const ds = r.datasets[0];
  const names = ds.variables.map((v) => v.name);
  for (const k of ['psi', 'phin', 'phip', 'n', 'p', 'Nnet', 'dN', 'dP', 'delta_n', 'delta_alpha']) assert.ok(names.includes(k), k);
  const v = Object.fromEntries(ds.variables.map((x) => [x.name, x]));
  assert.equal(v.n.unit, '1/m^3');
  assert.equal(v.delta_alpha.unit, '1/m');
  assert.equal(v.n.values.length, ds.mesh.x.length);
  // reference dataset: dN = 0 at the reference bias
  assert.ok(v.dN.values.every((x, i) => !Number.isFinite(x) || x === 0));
  // doped silicon has a negative index change
  let neg = 0;
  for (let i = 0; i < v.delta_n.values.length; i++) if (v.delta_n.values[i] < 0) neg++;
  assert.ok(neg > 1000);
});

test('plasma-dispersion density basis: change basis selectable, lower VpiL than the absolute basis here', () => {
  const c = runSemiconductor(rib({ values: '[0, 2]', optics: '{plasma_dispersion: nedeljkovic_2011, density_basis: change}' }));
  const a = r.points.find((p) => p.sweptBiasV === 2).optics, b = c.points[1].optics;
  assert.equal(b.densityBasis, 'change');
  assert.ok(Math.abs(b.dneffAbsoluteBasis - a.dneff) < 1e-9 * Math.abs(a.dneff) + 1e-12, 'absolute-basis value reproduced');
  assert.ok(b.dneff > a.dneff, 'sublinear fit (exponents < 1 for holes) gives a larger change from the density change');
  // Soref-Bennett alternative runs on the same state
  const s = runSemiconductor(rib({ values: '[0, 2]', optics: '{plasma_dispersion: soref_bennett_1987}' }));
  assert.equal(s.models.plasmaDispersion.model, 'soref_bennett_1987');
  assert.ok(s.points[1].optics.dneff > 0);
});

test('G6 rib mesh convergence: dn_eff(2 V) and C(2 V) changes shrink with the semiconductor mesh', () => {
  const out = [0.02, 0.014, 0.01].map((edge) => {
    const x = runSemiconductor(rib({ edge, values: '[0, 2]' }));
    return { edge, nodes: x.mesh.nNodes, dneff: x.points[1].optics.dneff, c: x.points[1].capacitance.cFPerM };
  });
  const d1 = Math.abs(out[1].dneff - out[0].dneff), d2 = Math.abs(out[2].dneff - out[1].dneff);
  const c1 = Math.abs(out[1].c - out[0].c), c2 = Math.abs(out[2].c - out[1].c);
  console.log(`# rib mesh study: ${JSON.stringify(out)}`);
  assert.ok(d2 < d1, `dneff changes ${d1} then ${d2}`);
  assert.ok(c2 < c1, `C changes ${c1} then ${c2}`);
  assert.ok(Math.abs(out[2].dneff - out[1].dneff) < 0.02 * out[2].dneff);
});

test('P1 performance: one reverse-bias point (DD solve) on a ~20k-node semiconductor mesh', () => {
  const pts = r.points.filter((p) => p.sweptBiasV > 0);
  const worst = Math.max(...pts.map((p) => p.timing.solve_ms));
  console.log(`# P1: semiconductor nodes ${r.mesh.nSemiNodes}, total nodes ${r.mesh.nNodes}, worst DD solve per point ${worst.toFixed(0)} ms, with C and R ${Math.max(...pts.map((p) => p.timing.total_ms)).toFixed(0)} ms`);
  assert.ok(r.mesh.nSemiNodes > 15000);
  // budget 1 s per point on an idle machine; the assertion allows 3x for a loaded test host
  assert.ok(worst < 3000, `worst ${worst} ms`);
});

test('parametric study point and config validation', () => {
  const text = rib({ values: '[0, 1]', extraTop: 'params:\n  n_body: {value: 5.0e17}\nstudies:\n  body: {type: parametric, sweep: [{param: n_body, values: [3.0e17, 5.0e17]}]}\n' }).replace('concentration_cm3: 5.0e17, within: {regions: [slab_n, rib_n]}', 'concentration_cm3: "=n_body", within: {regions: [slab_n, rib_n]}');
  const p = runSemiconductorSweepPoint(text, 0, { optics: false });
  assert.equal(p.error, null, p.error);
  assert.equal(p.values.n_body, 3e17);
  assert.ok(p.result.points[1].capacitance.cFPerM < r.points.find((q) => q.sweptBiasV === 1).capacitance.cFPerM, 'lighter n doping lowers C');
  assert.throws(() => runSemiconductor(rib().replace('{electrode: anode, bias_v: 0}', '{electrode: anode, bias_v: 0, typo: 1}')), /typo: unsupported field/);
  assert.throws(() => runSemiconductor(rib().replace('silicon: {semiconductor: silicon, recombination: {srh: {tau_n_s: 1.0e-6, tau_p_s: 1.0e-6}}}', 'silicon: {semiconductor: silicon, recombination: {srh: {tau_n_s: 1.0e-6}}}')), /tau_p_s/);
  assert.throws(() => runSemiconductor(rib().replace("- {electrode: cathode, bias_v: 0}", '')), /not a semiconductor contact|is not a semiconductor contact|not listed|every electrode/);
  // round 3 config keys: line.rf_section must name a cross-section; operating_bias_v must be a bias value
  assert.throws(() => runSemiconductor(rib().replace('optics:\n', 'line: {rf_section: nope}\noptics:\n')), /line.rf_section/);
  assert.equal(runSemiconductor(rib({ values: '[0, 1]' }).replace('  mesh: {semiconductor_edge_um', '  operating_bias_v: 1\n  mesh: {semiconductor_edge_um'), { optics: false }).operatingBiasV, 1);
});

test('audits D4 / R4 / R5: push-pull only at a reverse DC bias; small-signal dn_eff/dV from the +-dv/2 states', () => {
  const pt = (v) => r.points.find((q) => q.sweptBiasV === v);
  for (const p of r.points.filter((q) => q.sweptBiasV > 0)) {
    assert.ok(p.forwardBiasV < 0);
    assert.ok(Math.abs(p.optics.vpilPushPullVcm - p.optics.vpilDifferentialVcm / 2) < 1e-12);
    assert.ok(p.optics.vpilVcm > 0 && p.optics.dneffPerV > 0);
  }
  // 0 V DC: no push-pull (one arm would be forward biased), reason given; secant undefined at the reference
  assert.equal(pt(0).optics.vpilPushPullVcm, null);
  assert.match(pt(0).optics.vpilPushPullReason, /reverse DC bias/);
  assert.equal(pt(0).optics.vpilVcm, null);
  // the local derivative at 2 V lies between the grid secants on either side (dn_eff(V) is concave in reverse bias)
  const s1 = (pt(2).optics.dneff - pt(1).optics.dneff) / 1, s2 = (pt(4).optics.dneff - pt(2).optics.dneff) / 2;
  assert.ok(pt(2).optics.dneffPerV < s1 && pt(2).optics.dneffPerV > s2, `${s2} < ${pt(2).optics.dneffPerV} < ${s1}`);
  // per-length export for the TWE line (R3): C', R', G' (null in reverse bias: below the residual floor), dn_eff/dV
  const pl = r.perLength.find((q) => q.biasV === 2);
  assert.ok(pl.cFPerM > 0 && pl.rOhmM > 0 && pl.gSPerM === null && pl.dneffPerV > 0);
});

test('audit D7 / D10 / segment contacts / postproc semi datasets / mesh check', async () => {
  const { runCrossSection } = await import('../src/run.mjs');
  const { createSolutionStore, evaluateDerived } = await import('../src/postproc/index.mjs');
  // D7: exact delta eps differs from the first-order default at the 1e-4 level
  const ex = runSemiconductor(rib({ values: '[0, 2]', optics: '{plasma_dispersion: nedeljkovic_2011, delta_eps: exact}' }));
  const a = r.points.find((p) => p.sweptBiasV === 2).optics.dneff, b = ex.points[1].optics.dneff;
  assert.ok(Math.abs(b / a - 1) > 1e-6 && Math.abs(b / a - 1) < 1e-3, `exact vs first order ${b / a - 1}`);
  // D10: a Dirichlet outer boundary is rejected
  assert.throws(() => runSemiconductor(rib().replace('  optical_window:', '  boundary: {left: dirichlet}\n  optical_window:')), /neumann/);
  // runner dispatch + store: semi datasets per bias point with SI units
  const res = runCrossSection(rib({ values: '[0, 2]' }), { stages: ['semiconductor'], keep: true });
  assert.deepEqual(res.stages, ['semiconductor']);
  const store = createSolutionStore(res);
  const ids = store.datasets().map((d) => d.id);
  for (const id of ['semi', 'semi:0', 'semi:1', 'opt']) assert.ok(ids.includes(id), id);
  const vars = store.variables('semi:1').filter((v) => v.name.startsWith('semi.')).map((v) => v.name);
  for (const v of ['semi.n', 'semi.p', 'semi.psi', 'semi.phin', 'semi.phip', 'semi.Nnet', 'semi.dN', 'semi.dP', 'semi.delta_n', 'semi.delta_alpha']) assert.ok(vars.includes(v), v);
  const q = evaluateDerived(store, { kind: 'surface_int', dataset: 'semi:1', expr: 'semi.dN', selection: { regions: ['rib_n'] } });
  assert.ok(q.value < 0 && Number.isFinite(q.value), 'electrons removed from the n rib under reverse bias');
  // mesh-uncertainty option (audit D8)
  const mc = runSemiconductor(rib({ edge: 0.02, values: '[0, 2]' }), { meshCheck: 0.7 });
  assert.ok(mc.meshCheck.maxRel.dneff != null && mc.meshCheck.maxRel.dneff < 0.02 && mc.meshCheck.maxRel.c < 0.02, JSON.stringify(mc.meshCheck.maxRel));
});

test('round 4 (UI audit F1, F13): semi.dn_bias / semi.dalpha_bias fields and semi.dn_eff_per_v / semi.G / semi.operating_bias globals', async () => {
  const { runCrossSection } = await import('../src/run.mjs');
  const { createSolutionStore, evaluateDerived } = await import('../src/postproc/index.mjs');
  const res = runCrossSection(rib({ values: '[0, 2]' }), { stages: ['semiconductor'], keep: true });
  const st = createSolutionStore(res);
  const v = Object.fromEntries(st.variables('semi:1').map((x) => [x.name, x]));
  assert.equal(v['semi.dn_bias'].unit, '1');
  assert.equal(v['semi.dalpha_bias'].unit, '1/m');
  for (const g of ['semi.dn_eff_per_v', 'semi.G', 'semi.operating_bias']) assert.equal(v[g].location, 'global', g);
  const glob = (expr, dataset) => evaluateDerived(st, { kind: 'global', dataset, expr }).value;
  const p2 = res.semiconductor.points[1];
  assert.equal(glob('semi.dn_eff_per_v', 'semi:1'), p2.optics.dneffPerV);
  assert.equal(glob('semi.operating_bias', 'semi:1'), 2);
  assert.ok(Number.isNaN(glob('semi.G', 'semi:1')), 'reverse bias: G below the residual floor (NaN)');
  // the bias-induced change is zero at the reference bias and equals delta_n(V) - delta_n(V0) at V
  const surf = (expr, dataset, regions) => evaluateDerived(st, { kind: 'surface_int', dataset, expr, selection: { regions } }).value;
  assert.equal(surf('semi.dn_bias', 'semi', ['rib_n', 'rib_p']), 0);
  const d = surf('semi.dn_bias', 'semi:1', ['rib_n', 'rib_p']);
  const e = surf('semi.delta_n', 'semi:1', ['rib_n', 'rib_p']) - surf('semi.delta_n', 'semi:0', ['rib_n', 'rib_p']);
  assert.ok(d > 0 && Math.abs(d / e - 1) < 1e-9, `dn_bias ${d} vs delta_n difference ${e}`);
  const a = surf('semi.dalpha_bias', 'semi:1', ['rib_n', 'rib_p']);
  assert.ok(a < 0, 'depletion lowers the absorption');
});

test('final audit A8: an explicit silicon n (with provenance) replaces the library dispersion in the optical solve (1310 nm)', () => {
  // n 3.5 is a plumbing test input, not a material value; the Salzberg Sellmeier starts at 1.357 um
  const base = rib({ values: '[0, 2]' }).replace('wavelength_nm: 1550', 'wavelength_nm: 1310').replace('silicon: {library: silicon}', 'silicon: {library: silicon, n: 3.5}');
  assert.throws(() => runSemiconductor(base), /needs a provenance entry/);
  const ok = runSemiconductor(base + "provenance:\n  materials.silicon.n: {class: unknown, citation: 'test input (plumbing)'}\n");
  assert.equal(ok.optical.explicitIndexOverridesDispersion[0].material, 'silicon');
  assert.equal(ok.optical.nSilicon, 3.5);
  assert.equal(ok.models.plasmaDispersion.rowUm, 1.3);
  assert.ok(ok.labels.includes('plasma_dispersion_row_wavelength_mismatch') && ok.points[1].optics.dneff > 0);
});
