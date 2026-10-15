// Vector mode solver benchmark (lane L-VEC, DevLog-025). Cases from validation/cases (K1 Si strip, K2 TFLN rib) and
// sims/{renaud2023,mao2022} (EO arm windows).
// Each row: model built once, then `runs` solves (median reported). Every row logs the complete buildVectorModel and
// solveVectorModes option objects (including mesh hints) so the mesh is reproducible from the log alone.
// Usage (from engine/): nice -n 10 node --max-old-space-size=1536 bench/vector-bench.mjs [--runs 3] [--out path]
// Default log: ../logs/vector-bench-YYYYMMDDTHHMMZ.jsonl (UTC stamp).
// License: GPL-3.0-or-later.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildVectorModel, solveVectorModes, selectVectorMode } from '../src/vector-mode.mjs';
import { parseConfig, crossSectionOf, opticalOptions } from '../src/config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : dflt;
};
const runs = Number(arg('runs', 3));
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13) + 'Z';
const out = arg('out', path.join(repo, 'logs', `vector-bench-${stamp}.jsonl`));
fs.mkdirSync(path.dirname(out), { recursive: true });

const hints = { max_edge_um: 0.4, grade: 0.25 };
const K2box = { x: [-1.6, 1.6], y: [-0.6, 1.1] };
const K1box = { x: [-0.6, 0.6], y: [-0.45, 0.45] };
/** [case, label, model options (lambda0Um added), solve options, sweep: solve at lambda + 0.01 um warm-started] */
const rows = [
  ['K2', 'order1_box0.06', { order: 1, refine: [{ ...K2box, h_um: 0.06 }], hints }, { numModes: 2 }, false],
  ['K2', 'order1_box0.04', { order: 1, refine: [{ ...K2box, h_um: 0.04 }], hints }, { numModes: 2 }, false],
  ['K2', 'order2_box0.12', { order: 2, refine: [{ ...K2box, h_um: 0.12 }], hints }, { numModes: 2 }, false],
  ['K2', 'order2_box0.12_corner0.01', { order: 2, refine: [{ ...K2box, h_um: 0.12 }], cornerRefine: { h_um: 0.01, grade: 0.2 }, hints }, { numModes: 2 }, false],
  ['K2', 'order2_box0.12_sweep_warm', { order: 2, refine: [{ ...K2box, h_um: 0.12 }], hints }, { numModes: 2 }, true],
  ['K1', 'order2_box0.1_corner0.01', { order: 2, refine: [{ ...K1box, h_um: 0.1 }], cornerRefine: { h_um: 0.01, grade: 0.2 }, hints }, { numModes: 2 }, false],
  // round 3: default ('auto', vector-tuned) sizing vs the former default ('scalar' sizing) on the same windows
  ['K2', 'auto_default', { order: 2 }, { numModes: 2 }, false],
  ['K2', 'scalar_sizing_former_default', { order: 2, sizing: 'scalar' }, { numModes: 2 }, false],
  ['renaud2023', 'armB_auto_default', { order: 2, window: { x: [-54.4, -51.6], y: [-1.5, 1.3] } }, { numModes: 2 }, false],
  ['renaud2023', 'armB_scalar_sizing_former_default', { order: 2, sizing: 'scalar', window: { x: [-54.4, -51.6], y: [-1.5, 1.3] } }, { numModes: 2 }, false],
  ['mao2022', 'armB_auto_default', { order: 2, window: { x: [-24.9, -19.1], y: [-1.5, 2.2] } }, { numModes: 2 }, false],
  ['mao2022', 'armB_auto_adaptiveShift_off', { order: 2, window: { x: [-24.9, -19.1], y: [-1.5, 2.2] } }, { numModes: 2, adaptiveShift: false }, false],
];
const median = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
const keys = ['assembleMs', 'factorMs', 'eigenMs', 'postMs', 'solveTotalMs'];
const cfgCache = {};
for (const [id, label, mopts, sopts, sweep] of rows) {
  const cfgFile = id.startsWith('K') ? path.join(repo, 'validation', 'cases', `${id}.yaml`) : path.join(repo, 'sims', id, 'config.yaml');
  cfgCache[id] ??= parseConfig(fs.readFileSync(cfgFile, 'utf8'));
  const cfg = cfgCache[id];
  const section = crossSectionOf(cfg, 'geometry');
  const lambda0Um = opticalOptions(cfg.raw).lambda0Um;
  const modelOptions = { lambda0Um, ...mopts };
  const t0 = performance.now();
  const model = buildVectorModel(section, cfg.materials, modelOptions);
  const modelMs = performance.now() - t0;
  const base = sweep ? solveVectorModes(model, lambda0Um, { ...sopts, fields: true }) : null;
  const timings = [];
  let r;
  for (let k = 0; k < runs; k++) {
    r = sweep ? solveVectorModes(model, lambda0Um + 0.01, { ...sopts, fields: true, warm: base.warm }) : solveVectorModes(model, lambda0Um, { ...sopts, fields: true });
    timings.push(r.timing);
  }
  const te = selectVectorMode(r, 'TE');
  const rec = {
    date: new Date().toISOString(), node: process.version, case: id, label, lambdaUm: sweep ? lambda0Um + 0.01 : lambda0Um, sweepWarmFrom: sweep ? lambda0Um : null,
    modelOptions, solveOptions: { ...sopts, fields: true },
    edges: r.stats.edges, triangles: r.stats.triangles, dof: r.stats.dof, nnzL: r.stats.nnzL, factorFlops: r.stats.factorFlops,
    operatorApplications: r.stats.operatorApplications, shift: r.shift, sizing: model.sizing, modelMs: +modelMs.toFixed(1), modelTiming: model.timing,
    solveMedianMs: Object.fromEntries(keys.map((k) => [k, +median(timings.map((x) => x[k])).toFixed(1)])),
    rssMB: +(process.memoryUsage().rss / 1e6).toFixed(0), te0: { neff: te.neff, ng: te.ng, teFraction: te.teFraction }, warnings: r.warnings,
  };
  fs.appendFileSync(out, JSON.stringify(rec) + '\n');
  console.log(`${id} ${label}: edges ${rec.edges}, DOF ${rec.dof}, model ${rec.modelMs} ms, solve ${JSON.stringify(rec.solveMedianMs)}, ops ${rec.operatorApplications}, TE0 n_eff ${te.neff.toFixed(7)}`);
}
console.log(`log ${out}`);
