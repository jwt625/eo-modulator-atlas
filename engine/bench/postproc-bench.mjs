// Postprocessing benchmark (DevLog-031): run a config with keep, then time plot and derived evaluations (first call
// builds the caches, second call hits them). Usage: node bench/postproc-bench.mjs ../sims/mao2022/config.yaml [stages]
// Prints one JSON line per measurement to stdout; no file is written. License: GPL-3.0-or-later.
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../src/run.mjs';
import { createSolutionStore, evaluatePlot, evaluateDerived } from '../src/postproc/index.mjs';

const [path, stagesArg] = process.argv.slice(2);
if (!path) { console.error('usage: node bench/postproc-bench.mjs CONFIG.yaml [stage,stage]'); process.exit(1); }
const stages = (stagesArg ?? 'optical_mode,eo_overlap').split(',');
const t0 = performance.now();
const r = runCrossSection(readFileSync(path, 'utf8'), { stages, keep: true });
const out = (o) => console.log(JSON.stringify(o));
out({ config: path, run_ms: performance.now() - t0, esTris: r.electrostatics?.nTris ?? null, optTris: r.optical?.nTris ?? null, solver: r.opticalSolver, elementOrder: r.elementOrder });
const st = createSolutionStore(r);
const ds = st.datasets().map((d) => d.id);
const cases = [
  ['plot', { dataset: 'es', expr: 'es.normE', unit: 'V/um' }],
  ['plot', { dataset: 'es', expr: 'es.V' }],
  ['plot', { dataset: 'es', expr: 'es.Ex', location: 'corner' }],
  ['derived', { kind: 'surface_int', dataset: 'es', expr: 'es.We' }],
  ['derived', { kind: 'surface_max', dataset: 'es', expr: 'es.normE' }],
  ...(ds.includes('opt') ? [['plot', { dataset: 'opt', expr: 'opt.normE' }], ['plot', { dataset: 'opt', expr: 'abs(opt.Ex)^2', location: 'node' }], ['derived', { kind: 'surface_int', dataset: 'opt', expr: 'opt.Sz' }]] : []),
  ...['A', 'B'].filter((a) => ds.includes(`eo${a}`)).flatMap((a) => [['derived', { kind: 'surface_int', dataset: `eo${a}`, expr: 'eo.integrand' }], ['plot', { dataset: `eo${a}`, expr: 'eo.integrand' }]]),
];
for (const pass of [1, 2]) for (const [what, req] of cases) {
  const t = performance.now();
  const res = what === 'plot' ? evaluatePlot(st, req) : evaluateDerived(st, req);
  out({ pass, what, ...req, ms: performance.now() - t, n: res.n ?? null, value: res.value ?? null });
}
out({ memory: st.memory(), rssMB: process.memoryUsage().rss / 1e6 });
