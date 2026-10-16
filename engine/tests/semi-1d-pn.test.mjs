// S8 1D abrupt PN gates (DevLog-039 G1-G7): drift-diffusion on a 2D strip vs closed forms derived in DevLog-039
// (depletion with the 2 V_t majority-tail term, short-base diffusion current, SRH generation zone).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSemiconductor } from '../src/semi-stage.mjs';
import { masettiMobility, MASETTI_1983 } from '../src/semi/models.mjs';
import { pn1d } from './semi-fixtures.mjs';

const q = 1.602176634e-19, eps = 11.7 * 8.8541878128e-12;
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
const N = 1e17, Nm = 1e23, h = 0.02e-6;

const runA = runSemiconductor(pn1d({ N, h: 0.02 }), { datasets: 'all' });
const Vt = runA.thermalVoltageV, ni = runA.niCm3 * 1e6;
const Vbi = Vt * Math.log((Nm * Nm) / (ni * ni));
const depl = (Vr, tail = true) => Math.sqrt((2 * eps * (Vbi + Vr - (tail ? 2 * Vt : 0)) * (2 / Nm)) / q); // total width (m), N_A = N_D
const point = (r, v) => r.points.find((p) => p.sweptBiasV === v);

test('G1 built-in potential: neutral-region potential difference vs V_t ln(N_A N_D / n_i^2) (< 1 %)', () => {
  const ds = runA.datasets[0];
  const { x } = ds.mesh;
  const psi = ds.variables.find((v) => v.name === 'psi').values;
  const at = (x0) => { let s = 0, c = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i] - x0) < 0.02) { s += psi[i]; c++; } return s / c; };
  const dpsi = at(0.6) - at(-0.6);
  assert.ok(rel(dpsi, Vbi) < 0.01, `dpsi ${dpsi} vs ${Vbi}`);
  assert.ok(rel(dpsi, Vbi) < 1e-4, `dpsi ${dpsi} vs ${Vbi} (expected near-exact)`);
});

test('G2 depletion charge and charge-equivalent width vs bias (< 1 %, 0 to 5 V reverse)', () => {
  for (const v of [0, 1, 2, 5]) {
    const p = point(runA, v);
    const Q = p.contacts[1].depletionChargeCPerM / h; // C/m^2, n-side space charge (kite split)
    const Wq = (Q * (2 / Nm)) / q;
    assert.ok(rel(Wq, depl(v)) < 0.01, `V ${v}: W_Q ${Wq} vs ${depl(v)}`);
  }
});

test('G3 junction capacitance C(V) by central difference vs closed form (< 1 %)', () => {
  for (const v of [0, 1, 2, 5]) {
    const p = point(runA, v);
    const C = Math.sqrt((q * eps * Nm * Nm) / (2 * 2 * Nm * (Vbi + v - 2 * Vt))) * h;
    assert.ok(rel(p.capacitance.cFPerM, C) < 0.01, `V ${v}: ${p.capacitance.cFPerM} vs ${C}`);
    // audit D1: terminal charge = charge through the contact; no metal charge here, so C = q |d int n / dV|
    assert.ok(Math.abs(p.capacitance.electronIntegralCFPerM / p.capacitance.cFPerM - 1) < 1e-6, `V ${v}`);
  }
});

test('G4/G5 equilibrium: zero current; charge neutrality at every bias', () => {
  const p0 = point(runA, 0);
  const scale = Math.abs(point(runB, 0.6).contacts[0].currentAPerM); // forward current scale
  assert.ok(Math.abs(p0.contacts[0].currentAPerM) < 1e-12 * scale, `I(0) ${p0.contacts[0].currentAPerM} vs ${scale}`);
  for (const p of runA.points) assert.ok(Math.abs(p.checks.chargeSumCPerM) < 1e-6 * p.checks.chargeMaxCPerM, `V ${p.sweptBiasV}: ${p.checks.chargeSumCPerM}`);
});

test('reverse saturation current (no recombination) vs short-base diode q n_i^2 D / (N W) (< 2 %)', () => {
  // minority electrons (p side) and holes (n side), linear profiles between the depletion edge and the ohmic contact
  const Dn = masettiMobility(MASETTI_1983.phosphorus, 1e17) * 1e-4 * Vt, Dp = masettiMobility(MASETTI_1983.boron, 1e17) * 1e-4 * Vt;
  for (const v of [1, 2, 5]) {
    const Wb = 1e-6 - depl(v) / 2;
    const Js = q * ni * ni * (Dn + Dp) / (Nm * Wb);
    const I = Math.abs(point(runA, v).contacts[1].currentAPerM);
    assert.ok(rel(I, Js * h) < 0.02, `V ${v}: ${I} vs ${Js * h}`);
  }
});

const runB = runSemiconductor(pn1d({ N, h: 0.02, srh: 1e-6, bias: '{contact: anode, values_v: [0, 0.6, -1, -3]}' }));

test('G4 current continuity at forward bias: majority-carrier contact residual direct vs from conservation (< 1e-6)', () => {
  const p = point(runB, 0.6);
  for (const c of ['n', 'p']) {
    const d = p.checks.majorityDerivation[c];
    assert.ok(rel(d.direct, d.derived) < 1e-6, `${c}: ${d.direct} vs ${d.derived}`);
  }
  assert.ok(p.contacts[0].currentAPerM > 0, 'forward current flows into the anode');
});

test('G7 reverse leakage: SRH generation zone of the depletion approximation (ratio 0.95-1.25)', () => {
  // generation zone: both carriers below n_i, 0 < psi - phi_p < V (abrupt symmetric junction, parabolic potential):
  // W_gen = W (1 - sqrt(V_bi / (V_bi + V))), I = q n_i W_gen h / (2 tau)
  for (const v of [1, 3]) {
    const W = Math.sqrt((2 * eps * (Vbi + v) * (2 / Nm)) / q);
    const Wg = W * (1 - Math.sqrt(Vbi / (Vbi + v)));
    const Ig = (q * ni * Wg * h) / (2 * 1e-6);
    const I = Math.abs(point(runB, -v).contacts[0].currentAPerM);
    const r = I / Ig;
    assert.ok(r > 0.95 && r < 1.25, `V ${v}: I ${I}, generation estimate ${Ig}, ratio ${r}`);
  }
});

test('G6 mesh convergence: C(2 V) error decreases with the semiconductor mesh size', () => {
  const C = Math.sqrt((q * eps * Nm * Nm) / (2 * 2 * Nm * (Vbi + 2 - 2 * Vt))) * h;
  const errs = [0.02, 0.01, 0.005].map((edge) => {
    const r = runSemiconductor(pn1d({ N, h: 0.02, edge, bias: '{contact: cathode, values_v: [2]}' }), { optics: false });
    return { edge, nodes: r.mesh.nNodes, err: rel(r.points[0].capacitance.cFPerM, C) };
  });
  for (let k = 1; k < errs.length; k++) assert.ok(errs[k].err < errs[k - 1].err, JSON.stringify(errs));
  assert.ok(errs[2].err < 1e-3, JSON.stringify(errs));
});

test('audit R11 / R5 / R6 / R10: residual rejection, flag semantics, small-signal derivative, two-terminal C\' rule', async () => {
  const { parseConfig, crossSectionOf } = await import('../src/config.mjs');
  const { semiconductorOptions } = await import('../src/semi/config.mjs');
  const { buildDeviceMesh, buildDevice } = await import('../src/semi/device.mjs');
  const { DriftDiffusion } = await import('../src/semi/solver.mjs');
  // D5: a converged update with a residual above the residual tolerance is reported as not converged
  const cfg = parseConfig(pn1d({ N, h: 0.02, edge: 0.01 }));
  const opts = semiconductorOptions(cfg.raw, cfg.geometries.geometry, cfg.materials);
  const sec = crossSectionOf(cfg, 'geometry');
  const dd = new DriftDiffusion(buildDevice(sec, cfg.materials, opts, buildDeviceMesh(sec, opts)), opts.numerics);
  dd.solveEquilibrium();
  dd.setBias([0, 0.5]);
  const strict = dd.newton({ residualTol: 0 });
  assert.equal(strict.converged, false);
  assert.ok(strict.residualInf >= 0);
  const ok = dd.newton();
  assert.equal(ok.converged, true);
  assert.ok(ok.residualInf < 1e-6);
  // D6 / R10: reverse bias without generation: currents below the residual floor, continuityRel null, G' null
  const rev = point(runA, 2);
  assert.ok(rev.flags.includes('contact_current_below_residual_floor') && rev.checks.continuityRel === null && rev.conductance.gSPerM === null);
  // forward (runB, SRH): resolved, continuity reported
  const fw = point(runB, 0.6);
  assert.ok(fw.checks.currentResolved && fw.checks.continuityRel < 1e-6 && fw.conductance.gSPerM > 0);
  // D2 hook: a failed tangent predictor falls back to plain bias steps with the same C' and a flag
  const a = runSemiconductor(pn1d({ N, h: 0.02, edge: 0.01, bias: '{contact: cathode, values_v: [1]}' }));
  const b = runSemiconductor(pn1d({ N, h: 0.02, edge: 0.01, bias: '{contact: cathode, values_v: [1]}' }), { testHooks: { tangentFail: true } });
  assert.ok(b.points[0].flags.includes('tangent_predictor_unconverged') && !a.points[0].flags.includes('tangent_predictor_unconverged'));
  assert.ok(Math.abs(b.points[0].capacitance.cFPerM / a.points[0].capacitance.cFPerM - 1) < 1e-6);
  // R6: three contacts (or two of one type) cannot use the two-terminal C'
  const three = pn1d({ N, h: 0.02, edge: 0.01 })
    .replace('    - {name: cathode, material: metal, weight: 1, rect: {x_um: [1.0, 1.05], y_um: [0, 0.02]}}', '    - {name: cathode, material: metal, weight: 1, rect: {x_um: [1.0, 1.05], y_um: [0, 0.02]}}\n    - {name: cathode2, material: metal, weight: 1, rect: {x_um: [0.5, 0.55], y_um: [0.015, 0.02]}}')
    .replace('    - {electrode: cathode, bias_v: 0}', '    - {electrode: cathode, bias_v: 0}\n    - {electrode: cathode2, bias_v: 0}');
  assert.ok(three.includes('cathode2, bias_v'));
  assert.throws(() => runSemiconductor(three), /two contacts of opposite doping type/);
  // operating_bias_v must be a bias value
  assert.throws(() => runSemiconductor(pn1d({ N, extra: '  operating_bias_v: 1.5\n' })), /operating_bias_v/);
});

test('round 4: semi.G global at a forward bias point equals the stage junction conductance', async () => {
  const { runCrossSection } = await import('../src/run.mjs');
  const { createSolutionStore, evaluateDerived } = await import('../src/postproc/index.mjs');
  const res = runCrossSection(pn1d({ N, h: 0.02, edge: 0.01, srh: 1e-6, bias: '{contact: anode, values_v: [0, 0.6]}' }), { stages: ['semiconductor'], keep: true });
  const st = createSolutionStore(res);
  const g = evaluateDerived(st, { kind: 'global', dataset: 'semi:1', expr: 'semi.G' });
  assert.ok(res.semiconductor.points[1].conductance.resolved);
  assert.equal(g.value, res.semiconductor.points[1].conductance.gSPerM);
  assert.equal(g.unit, 'S/m');
  assert.equal(evaluateDerived(st, { kind: 'global', dataset: 'semi:1', expr: 'semi.operating_bias' }).value, 0.6);
});

test('final audit A2: exported G\'_j de-embeds the series path, G\'_j / (1 + R\' G\'_j) reproduces the terminal G\'_t', () => {
  const p = point(runB, 0.6);
  const c = p.conductance, R = p.resistance.rOhmM;
  assert.ok(c.resolved && c.gTerminalSPerM > 0 && c.rTimesGTerminal < 1);
  assert.ok(Math.abs(c.gSPerM / (1 + R * c.gSPerM) / c.gTerminalSPerM - 1) < 1e-12);
  assert.ok(c.gSPerM > c.gTerminalSPerM);
  assert.equal(runB.perLength.find((q) => q.biasV === 0.6).gSPerM, c.gSPerM);
});
