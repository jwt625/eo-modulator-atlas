// DevLog-043: stage compatibility (one rule set for runner and UI). Inputs: published configs (yang2022, han2023,
// chen2022) for readiness only, and the ILLUSTRATIVE semiconductor fixtures of semi-fixtures.mjs (not literature data).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectConfig, parseConfig, stageErrors, crossSectionOf, opticalOptions } from '../src/config.mjs';
import { solveOptical } from '../src/optical-stage.mjs';
import { semiconductorStageErrors as semiconductorStageErrorsOf } from '../src/config.mjs';
import { solveElectrostatics } from '../src/electrostatics.mjs';
import { runSemiconductor } from '../src/semi-stage.mjs';
import { runJunctionResponseStage } from '../src/stages.mjs';
import { stageCompatibility, sanitizeStages, checkStageSelection } from '../src/stage-compat.mjs';
import { runCrossSection } from '../src/run.mjs';
import { createSolutionStore } from '../src/postproc/index.mjs';
import { rib, pn1d } from './semi-fixtures.mjs';

const sim = (id) => readFileSync(new URL(`../../sims/${id}/config.yaml`, import.meta.url), 'utf8');
const ctxOf = (text, section = 'geometry') => inspectConfig(text, section).stageContext;

// Illustrative electrode cut and line for the junction-loaded response (same construction as s7-semi-twe.test.mjs).
const RF_CUT = `alt_geometries:
  rf:
    domain: {x_um: [-40, 40], y_um: [-10, 10]}
    regions:
      - {name: box, material: silicon_dioxide, rect: {x_um: [-40, 40], y_um: [-10, 0]}}
      - {name: clad, material: silicon_dioxide, rect: {x_um: [-40, 40], y_um: [0, 10]}}
    electrodes:
      - {name: ground_l, role: ground, material: metal, weight: 0, rect: {x_um: [-30, -10], y_um: [1, 2]}}
      - {name: signal, role: signal, material: metal, weight: 1, rect: {x_um: [-4, 4], y_um: [1, 2]}}
      - {name: ground_r, role: ground, material: metal, weight: 0, rect: {x_um: [10, 30], y_um: [1, 2]}}
    mesh: {max_edge_um: 2, electrode_edge_um: 0.25}
line:
  rf_section: rf
  length_mm: 1
  source_ohm: 50
  load_ohm: 50
  loading: {type: none}
  conductor_loss_model: rprime_reference
  r_pul_ref_ohm_per_m: 500
  r_pul_ref_ghz: 10
  include_internal_inductance: false
  dielectric_loss_model: none
sweep: {f_start_ghz: 1, f_stop_ghz: 80, n_points: 80}
`;
const ribTwe = (opts = {}) => rib({ edge: 0.02, values: '[0, 1, 2]', extraTop: RF_CUT, ...opts }).replace('  mesh: {semiconductor_edge_um', '  operating_bias_v: 2\n  mesh: {semiconductor_edge_um');

test('TFLN config (yang2022): cross-section path, implied dependencies, no semiconductor stage', () => {
  const ctx = ctxOf(sim('yang2022'));
  assert.equal(ctx.hasSemiconductor, false);
  assert.equal(ctx.semiReadiness, null);
  const chain = parseConfig(sim('yang2022')).raw.chain;
  const seed = sanitizeStages(chain.filter((s) => s !== 'electrostatics'), ctx); // as the UI seeds (electrostatics implicit)
  assert.deepEqual(seed.dropped, []);
  assert.deepEqual(seed.kept, ['optical_mode', 'eo_overlap', 'rf_line', 'eo_response']);
  const c = stageCompatibility(['eo_response'], ctx);
  assert.equal(c.path, 'cross_section');
  assert.equal(c.stages.optical_mode.impliedBy, 'eo_response');
  assert.equal(c.stages.rf_line.impliedBy, 'eo_response');
  assert.deepEqual(c.run, ['electrostatics', 'optical_mode', 'rf_line', 'eo_response']);
  assert.equal(c.stages.electrostatics.impliedBy, 'always');
  assert.match(c.stages.semiconductor.blocked, /needs a semiconductor block/);
  assert.deepEqual(c.invalid, []);
});

test('chen2022: chain seeding keeps the available subset and names each dropped stage', () => {
  const ctx = ctxOf(sim('chen2022'));
  const { kept, dropped } = sanitizeStages(parseConfig(sim('chen2022')).raw.chain.filter((s) => s !== 'electrostatics'), ctx);
  // optical_mode: the T-rail pads lie in the optical window (reject policy), a readiness reason since DevLog-043
  assert.deepEqual(kept, ['loaded_line']);
  assert.deepEqual(dropped.map((d) => d.stage).sort(), ['eo_overlap', 'eo_response', 'optical_mode', 'rf_line']);
  for (const d of dropped) assert.equal(d.reason, ctx.readiness[d.stage], d.stage);
});

test('han2023: semiconductor + optical_mode allowed; electrostatics, eo_overlap, rf_line, loaded_line rejected with the reason', () => {
  const ctx = ctxOf(sim('han2023'));
  assert.equal(ctx.hasSemiconductor, true);
  assert.equal(ctx.readiness.semiconductor, null);
  assert.equal(ctx.semiReadiness.optical_mode, null);
  assert.match(ctx.semiReadiness.eo_response, /line\.rf_section/);
  const c = stageCompatibility(['semiconductor', 'optical_mode'], ctx);
  assert.equal(c.path, 'semiconductor');
  assert.deepEqual(c.invalid, []);
  assert.deepEqual(c.run, ['semiconductor', 'optical_mode']);
  assert.match(c.stages.optical_mode.note, /own vector mode/);
  assert.equal(c.stages.electrostatics.runs, false);
  assert.match(c.stages.electrostatics.blocked, /free carriers screen the field/);
  assert.match(c.stages.eo_overlap.blocked, /^conflicts with semiconductor: .*Pockels/);
  assert.match(c.stages.loaded_line.blocked, /junction-loaded periodic/);
  assert.match(c.stages.rf_line.blocked, /dependency of eo_response/);
  assert.match(c.stages.eo_response.blocked, /line\.rf_section/);
  // symmetric: with a conflicting stage selected the semiconductor stage is blocked and says by what
  const d = stageCompatibility(['rf_line'], { ...ctx, readiness: { ...ctx.readiness, rf_line: null } });
  assert.deepEqual(d.stages.semiconductor.conflictsWith, ['rf_line']);
  assert.match(d.stages.semiconductor.blocked, /^conflicts with rf_line: an RF line on the device cut/);
  // URL-like candidates: the semiconductor stage wins, the conflicting stage is dropped with its reason
  const s = sanitizeStages(['eo_overlap', 'optical_mode', 'semiconductor', 'bogus'], ctx);
  assert.deepEqual(s.kept, ['optical_mode', 'semiconductor']);
  assert.deepEqual(s.dropped.map((x) => x.stage), ['bogus', 'eo_overlap']);
  assert.match(s.dropped[1].reason, /Pockels/);
});

test('semiconductor fixture with line.rf_section: semiconductor + optical_mode + eo_response (+ implied rf_line on the electrode cut)', () => {
  const ctx = ctxOf(ribTwe());
  assert.deepEqual(ctx.semiReadiness, { optical_mode: null, eo_response: null });
  const c = stageCompatibility(['semiconductor', 'eo_response', 'optical_mode'], ctx);
  assert.deepEqual(c.invalid, []);
  assert.deepEqual(c.run, ['semiconductor', 'optical_mode', 'rf_line', 'eo_response']);
  assert.equal(c.stages.rf_line.impliedBy, 'eo_response');
  assert.match(c.stages.rf_line.note, /line\.rf_section/);
  assert.equal(c.stages.optical_mode.impliedBy, null, 'the semiconductor path does not add optical_mode');
  // an explicit rf_line is the same dependency; without eo_response it conflicts and is dropped
  assert.deepEqual(stageCompatibility(['semiconductor', 'rf_line', 'eo_response'], ctx).invalid, []);
  assert.deepEqual(sanitizeStages(['semiconductor', 'rf_line'], ctx), { kept: ['semiconductor'], dropped: [{ stage: 'rf_line', reason: stageCompatibility(['semiconductor'], ctx).stages.rf_line.blocked }] });
  // a periodic line is not a junction-loaded uniform line
  const periodic = ctxOf(ribTwe().replace('  loading: {type: none}', '  loading: {type: periodic_t_rail, period_um: 50, loaded_length_um: 45, loaded_cross_section: geometry, unloaded_cross_section: rf}'));
  assert.match(periodic.semiReadiness.eo_response, /periodic_t_rail with the semiconductor stage is not implemented/);
});

test('readiness of the semiconductor optical solve: vector solver and one wavelength are input checks', () => {
  const scalar = rib().replace('  solver: vector\n', '  solver: scalar\n');
  const se = stageErrors(parseConfig(scalar));
  assert.match(se.semiconductor, /optics\.solver: semiconductor optics needs optics\.solver: vector/);
  assert.throws(() => runCrossSection(scalar, { stages: ['semiconductor'] }), /semiconductor optics needs optics\.solver: vector/);
  const ctx = ctxOf(scalar);
  assert.match(ctx.semiReadiness.optical_mode, /the semiconductor stage is blocked: optics\.solver/);
  // no semiconductor.optics: the mode with the semiconductor stage is not available
  const bare = ctxOf(pn1d());
  assert.match(bare.semiReadiness.optical_mode, /needs semiconductor\.optics/);
});

test('runner: combinations rejected before any solve, with the physics reason', () => {
  const text = ribTwe();
  const quick = (stages, re) => {
    const t0 = performance.now();
    assert.throws(() => runCrossSection(text, { stages }), re, stages.join(','));
    assert.ok(performance.now() - t0 < 2000, `${stages.join(',')} rejected before the solve`);
  };
  quick(['semiconductor', 'eo_overlap'], /^Error: Stage selection: eo_overlap: conflicts with semiconductor: .*Pockels/);
  quick(['semiconductor', 'loaded_line'], /loaded_line: conflicts with semiconductor: a junction-loaded periodic/);
  quick(['semiconductor', 'rf_line'], /rf_line: conflicts with semiconductor: .*dependency of eo_response/);
  quick(['semiconductor', 'electrostatics'], /electrostatics: conflicts with semiconductor: .*own Poisson equation/);
  assert.throws(() => checkStageSelection(['semiconductor', 'bogus'], parseConfig(text).raw), /Unknown stage: bogus/);
  assert.throws(() => runCrossSection(pn1d(), { stages: ['semiconductor', 'optical_mode'] }), /needs semiconductor\.optics/);
});

test('runner: semiconductor + optical_mode exposes the stage mode (one optical solve), result.optical and dataset opt', () => {
  const text = rib({ edge: 0.02, values: '[0, 2]' });
  const progress = [];
  const r = runCrossSection(text, { stages: ['semiconductor', 'optical_mode'], keep: true, fields: true, onProgress: (m) => progress.push(m) });
  assert.deepEqual(r.stages, ['semiconductor', 'optical_mode']);
  assert.equal(progress.filter((m) => /optical mode/i.test(m)).length, 1, progress.join(' | '));
  assert.equal(r.metrics.n_eff, r.semiconductor.optical.neff);
  assert.equal(r.optical.source, 'semiconductor_stage');
  assert.equal(r.optical.neff, r.semiconductor.optical.neff);
  assert.ok(r.warnings.includes('optical_mode_from_semiconductor_stage'));
  assert.ok(r.fields.optical && r.fields.es === null, 'mode exported with fields: true');
  const store = createSolutionStore(r);
  const opt = store.datasets().find((d) => d.id === 'opt');
  assert.ok(opt, 'dataset opt');
  assert.match(opt.label, new RegExp(`n_eff ${r.semiconductor.optical.neff.toFixed(5)}`));
  // the semiconductor result is unchanged by adding optical_mode
  const alone = runCrossSection(text, { stages: ['semiconductor'] });
  assert.deepEqual(alone.stages, ['semiconductor']);
  assert.equal(alone.semiconductor.optical.neff, r.semiconductor.optical.neff);
  assert.equal(alone.semiconductor.points[1].optics.dneff, r.semiconductor.points[1].optics.dneff);
});

test('runner: eo_response after the semiconductor stage reuses the stage mode and its group index (one optical solve)', () => {
  const progress = [];
  const r = runCrossSection(ribTwe(), { stages: ['semiconductor', 'optical_mode', 'eo_response'], onProgress: (m) => progress.push(m) });
  assert.deepEqual(r.stages, ['semiconductor', 'optical_mode', 'rf_line', 'eo_response']);
  assert.equal(progress.filter((m) => /optical mode|group index/i.test(m)).length, 1, progress.join(' | '));
  assert.ok(Number.isFinite(r.semiconductor.optical.ng) && r.semiconductor.optical.ng > r.semiconductor.optical.neff, 'perturbation n_g of the stage mode');
  assert.equal(r.semiconductor.optical.groupIndexMethod, 'perturbation');
  assert.equal(r.response.ngOpt, r.semiconductor.optical.ng, 'response n_g = stage mode n_g');
  assert.equal(r.metrics.ng_opt, r.semiconductor.optical.ng);
});

test('readiness catches the static run-time failures: metal in a mode window (reject policy), forward-bias operating point', async () => {
  const { setIn } = await import('../src/yaml-edit.mjs');
  // chen2022: the T-rail pads lie in the optical window; the run rejects them under the default policy
  const chen = sim('chen2022');
  const ctx = ctxOf(chen);
  assert.match(ctx.readiness.optical_mode, /optical_window: conductor .* inside this mode window under optics\.metal_in_window: reject/);
  assert.throws(() => runCrossSection(chen, { stages: ['optical_mode'] }), /inside this mode window/, 'runner: readiness before any solve (F3)');
  const cc = parseConfig(chen);
  assert.throws(() => solveOptical(crossSectionOf(cc, 'geometry'), cc.materials, opticalOptions(cc.raw), {}), /conductor .*optical window|in the optical window/, 'the solver rule agrees');
  assert.ok(!sanitizeStages(parseConfig(chen).raw.chain, ctx).kept.includes('optical_mode'), 'not seeded');
  assert.equal(ctxOf(setIn(chen, 'optics.metal_in_window', 'absent')).readiness.optical_mode, null, 'an explicit policy allows it');
  // forward-bias operating point: anode (p side) at 0 V, cathode (n side) swept to -0.5 V -> forward 0.5 V
  const fwd = ribTwe({ values: '[-0.5, 0, 2]' }).replace('operating_bias_v: 2', 'operating_bias_v: -0.5');
  const fc = ctxOf(fwd);
  assert.match(fc.semiReadiness.eo_response, /operating_bias_v: -0\.5 V is a forward-bias point \(forward 0\.5 V; contacts anode p, cathode n\)/);
  assert.equal(ctxOf(ribTwe({ values: '[-0.5, 0, 2]' })).semiReadiness.eo_response, null, 'reverse bias 2 V passes');
  const t0 = performance.now();
  assert.throws(() => runCrossSection(fwd, { stages: ['semiconductor', 'eo_response'] }), /forward-bias point/);
  assert.ok(performance.now() - t0 < 1500, 'runner: rejected before the drift-diffusion solve (F3)');
  const fcfg = parseConfig(fwd);
  assert.throws(() => runJunctionResponseStage({ config: fcfg, semi: runSemiconductor(fcfg), rfSection: 'rf', biasV: -0.5 }), /forward-bias point/, 'the run-time rule agrees');
});

test('readiness: touching electrodes (meng2023) and a library dispersion outside its range at the wavelength (lin2026a) agree with the run', () => {
  const meng = sim('meng2023');
  const m = ctxOf(meng);
  assert.match(m.readiness.electrostatics, /electrodes signal_au and signal_ito share a boundary segment/);
  assert.deepEqual(stageCompatibility([], m).invalid.map((x) => x.stage), ['electrostatics'], 'the implicit electrostatics stage blocks Compute');
  assert.throws(() => runCrossSection(meng), /share a boundary segment/, 'runner: readiness before any solve (F3)');
  const mc = parseConfig(meng);
  assert.throws(() => solveElectrostatics(crossSectionOf(mc, 'geometry'), { resolvedMaterials: mc.materials }), /share an edge/, 'the mesher rule agrees');
  const lin = sim('lin2026a');
  const l = ctxOf(lin);
  assert.match(l.readiness.optical_mode, /lithium_tantalate.*not valid at the optical wavelength 0\.375 um/);
  assert.match(l.readiness.eo_overlap, /not valid at the optical wavelength/);
  assert.throws(() => runCrossSection(lin, { stages: ['optical_mode'] }), /not valid at the optical wavelength/, 'runner: readiness before any solve (F3)');
  const lc = parseConfig(lin);
  assert.throws(() => solveOptical(crossSectionOf(lc, 'geometry'), lc.materials, opticalOptions(lc.raw), {}), /dispersion anchor wavelength 0\.375 um is outside the library validity range/, 'the solver rule agrees');
});

test('round 3: F1 implied regardless of selection; F4b no Laplace stage on a doped-silicon section, optical_mode mode-only; F5 implicit electrostatics reported; F3 run-option overrides', () => {
  // F1: optical_mode and rf_line are implied by eo_response also when selected explicitly
  const y = ctxOf(sim('yang2022'));
  const c = stageCompatibility(['optical_mode', 'rf_line', 'eo_response'], y);
  assert.equal(c.stages.optical_mode.impliedBy, 'eo_response');
  assert.equal(c.stages.rf_line.impliedBy, 'eo_response');
  assert.equal(stageCompatibility(['optical_mode'], y).stages.optical_mode.impliedBy, null, 'not implied without eo_response');
  // F4b: han2023 geometry has doped silicon of the semiconductor block
  const h = ctxOf(sim('han2023'));
  assert.equal(h.semiSection, true);
  const none = stageCompatibility([], h);
  assert.equal(none.path, 'mode_only');
  assert.deepEqual(none.invalid.map((x) => x.stage), ['electrostatics'], 'nothing runnable: Compute blocked');
  assert.match(none.stages.electrostatics.blocked, /^not available: this cross-section contains doped silicon/);
  for (const s of ['eo_overlap', 'rf_line', 'loaded_line', 'eo_response']) assert.match(none.stages[s].blocked, /^needs the Laplace electrostatics stage/, s);
  const om = stageCompatibility(['optical_mode'], h);
  assert.deepEqual([om.path, om.run, om.invalid], ['mode_only', ['optical_mode'], []]);
  assert.match(om.stages.optical_mode.note, /mode-only/);
  assert.equal(ctxOf(ribTwe(), 'rf').semiSection, false, 'the oxide electrode cut keeps electrostatics');
  assert.throws(() => runCrossSection(sim('han2023')), /electrostatics: not available: this cross-section contains doped silicon/);
  assert.throws(() => runCrossSection(sim('han2023'), { stages: ['rf_line'] }), /rf_line: needs the Laplace electrostatics stage/);
  const r = runCrossSection(rib({ edge: 0.02, values: '[0, 2]' }), { stages: ['optical_mode'] });
  assert.equal(r.modeOnly, true);
  assert.deepEqual(r.stages, ['optical_mode']);
  assert.equal(r.electrostatics, null);
  // F5: electrostatics named in a link is reported (the link is rewritten)
  assert.deepEqual(sanitizeStages(['electrostatics', 'optical_mode'], y).dropped.map((d) => d.stage), ['electrostatics']);
  // F3: semiconductorStageErrors honours the run options; the runner checks it before the solve
  const plain = rib({ edge: 0.02, values: '[0, 2]', extraTop: RF_CUT.replace('  rf_section: rf\n', '') });
  const pc = parseConfig(plain);
  assert.match(semiconductorStageErrorsOf(pc).eo_response, /line\.rf_section/);
  assert.equal(semiconductorStageErrorsOf(pc, 'geometry', { rfSection: 'rf', biasV: 2 }).eo_response, null);
  assert.match(semiconductorStageErrorsOf(pc, 'geometry', { rfSection: 'rf', biasV: 3 }).eo_response, /no semiconductor bias point at 3 V/);
  const t0 = performance.now();
  assert.throws(() => runCrossSection(plain, { stages: ['semiconductor', 'eo_response'], rfSection: 'rf' }), /operating DC bias/);
  assert.ok(performance.now() - t0 < 1500, 'missing key rejected before the semiconductor solve');
});
