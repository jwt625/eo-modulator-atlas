#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runCrossSection } from './src/run.mjs';
import { inspectConfig, stageErrors, parseConfig, IMPLEMENTED_STAGES } from './src/config.mjs';
import { runSweep, enumerateSweep } from './src/sweep.mjs';
import { createSolutionStore, evaluateDerived, modeTable } from './src/postproc/index.mjs';

const usage = `Usage: node engine/cli.mjs CONFIG.yaml [--stages ${IMPLEMENTED_STAGES.join(',')}] [--optical] [--section unloaded] [--mesh-scale 1]
       [--param name=value ...] [--solver vector|scalar] [--mode-only] [--check] [--sweep [STUDY]] [--list-points]
Runs the requested cross-section stages (electrostatics always runs; --optical adds optical_mode).
--param overrides a value of the config's params block (repeatable). --solver overrides optics.solver (default vector).
--mode-only runs optical_mode without electrostatics (mode-only cases).
--check prints per-stage input readiness as JSON without solving.
--eval EXPR (repeatable) evaluates a postprocessing expression after the run (DevLog-031): [--dataset ID] (default es,
or the first optical dataset), [--kind global|surface_int|surface_avg|surface_max|surface_min|line_int|line_avg|point]
(default: point with --point, line_int with --line, global for expressions without fields, else surface_int),
[--over REGION,...] region selection, [--point X,Y] (um; repeatable), [--line X0,Y0,X1,Y1[,...]] (um), [--unit U]
(repeatable: one per --eval, in order). Write --eval=-EXPR for a leading minus. A failing expression is reported as
{expr, error} in the JSON and on stderr, and the exit status is 1.
--list-vars prints the datasets and the variables of --dataset after the run. --modes DATASET prints its mode table.
--num-modes N computes at least N optical modes per solve.
--sweep runs a parametric study (study: or studies.<STUDY>); --stages overrides the study's stages; progress goes to
stderr, the sweep result (one entry per point) to stdout. --list-points prints the enumerated points without solving.
JSON results go to stdout and are not saved.`;

function overrides(list) {
  const out = {};
  for (const item of list ?? []) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/.exec(item);
    if (!m || !Number.isFinite(Number(m[2]))) throw new Error(`--param expects name=number; got ${item}`);
    out[m[1]] = Number(m[2]);
  }
  return out;
}

const nums = (s, what) => {
  const v = s.split(',').map((q) => Number(q.trim()));
  if (v.length < 2 || v.length % 2 || !v.every(Number.isFinite)) throw new Error(`${what} expects comma-separated x,y pairs in um; got ${s}`);
  return Array.from({ length: v.length / 2 }, (_, i) => [v[2 * i], v[2 * i + 1]]);
};

/** --eval / --list-vars / --modes on a kept run (DevLog-031). */
function postprocess(result, values) {
  const store = createSolutionStore(result);
  const datasets = store.datasets();
  const dataset = values.dataset ?? (datasets.find((d) => d.id === 'es') ?? datasets[0]).id;
  const out = { id: result.id, section: result.section, metrics: result.metrics, dataset };
  if (values['list-vars']) Object.assign(out, { datasets, variables: store.variables(dataset) });
  if (values.modes) out.modeTable = modeTable(store, values.modes);
  if (values.eval?.length) {
    // --point and --unit are repeatable (audit E5): points concatenate; units align with --eval in order
    const point = values.point?.length ? values.point.flatMap((q) => nums(q, '--point')) : null;
    const line = values.line ? nums(values.line, '--line') : null;
    const units = values.unit ?? [];
    if (units.length > 1 && units.length !== values.eval.length) throw new Error(`give one --unit per --eval in order (${units.length} units for ${values.eval.length} expressions), or a single --unit for a single --eval`);
    if (units.length === 1 && values.eval.length > 1) throw new Error('one --unit with several --eval is ambiguous; give one --unit per --eval in order');
    out.results = values.eval.map((expr, k) => {
      const unit = units[k];
      try {
        let kind = values.kind;
        if (!kind) kind = point ? 'point' : line ? 'line_int' : null;
        let selection;
        if (point) selection = point.length === 1 ? { point: point[0] } : { points: point };
        else if (line) selection = { polyline: line };
        else if (values.over) selection = { regions: values.over.split(',').map((q) => q.trim()).filter(Boolean).map((q) => (/^\d+$/.test(q) ? Number(q) : q)) };
        if (!kind) {
          try { return evaluateDerived(store, { kind: 'global', dataset, expr, unit }); }
          catch (e) { if (!/depends on fields/.test(e.message)) throw e; kind = 'surface_int'; }
        }
        return evaluateDerived(store, { kind, dataset, expr, selection, unit });
      } catch (e) {
        // per-expression error: reported in the JSON and on stderr; the exit status is 1
        const message = e instanceof Error ? e.message : String(e);
        console.error(`--eval ${expr}: ${message}`);
        process.exitCode = 1;
        return { expr, error: message };
      }
    });
  }
  return out;
}

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    optical: { type: 'boolean', default: false }, section: { type: 'string' },
    stages: { type: 'string' }, check: { type: 'boolean', default: false },
    'mesh-scale': { type: 'string', default: '1' }, help: { type: 'boolean', short: 'h' },
    param: { type: 'string', multiple: true }, sweep: { type: 'boolean', default: false }, study: { type: 'string' },
    'list-points': { type: 'boolean', default: false }, solver: { type: 'string' }, 'mode-only': { type: 'boolean', default: false },
    eval: { type: 'string', multiple: true }, dataset: { type: 'string' }, kind: { type: 'string' }, over: { type: 'string' },
    point: { type: 'string', multiple: true }, line: { type: 'string' }, unit: { type: 'string', multiple: true }, 'list-vars': { type: 'boolean', default: false },
    modes: { type: 'string' }, 'num-modes': { type: 'string' },
  } });
  if (values.help) console.log(usage);
  else {
    // `--sweep NAME` arrives as a second positional because --sweep is a flag.
    const study = values.study ?? (values.sweep || values['list-points'] ? positionals[1] ?? null : null);
    if (positionals.length !== 1 && !(study && positionals.length === 2 && !values.study)) throw new Error('Provide one config path; use --help for usage');
    const text = await readFile(positionals[0], 'utf8');
    const params = overrides(values.param);
    const stages = values.stages == null ? null : values.stages.split(',').map((s) => s.trim()).filter(Boolean);
    if (values['list-points']) {
      console.log(JSON.stringify(enumerateSweep(text, { study, params }), null, 2));
    } else if (values.sweep) {
      const result = await runSweep(text, { study, params, stages, section: values.section ?? null, meshScale: Number(values['mesh-scale']), solver: values.solver ?? null,
        onProgress: (message) => console.error(`  ${message}`) },
      (p, done, total) => console.error(`point ${done}/${total} ${JSON.stringify(p.values)} ${p.error ? `error: ${p.error}` : `${p.elapsed_ms.toFixed(0)} ms reused ${JSON.stringify(p.reused)}`}`));
      console.log(JSON.stringify(result, null, 2));
      if (result.errors) process.exitCode = 1;
      else if (result.targetSummary.failed) process.exitCode = 2;
    } else if (values.check) {
      // Readiness only: the strict boundary error (if any) and the blocking input error of every stage.
      const section = values.section ?? 'geometry';
      const { solveError, stageErrors: blocked } = inspectConfig(text, section, { params, solver: values.solver ?? null });
      const stageState = solveError ? blocked : stageErrors(parseConfig(text, { params }), section, { solver: values.solver ?? null });
      console.log(JSON.stringify({ section, solveError: solveError || null, stages: stageState }, null, 2));
    } else {
      const post = !!(values.eval?.length || values['list-vars'] || values.modes);
      const numModes = values['num-modes'] == null ? null : Number(values['num-modes']);
      const result = runCrossSection(text, {
        stages: values['mode-only'] ? ['optical_mode'] : stages, optical: values.optical, section: values.section ?? 'geometry', meshScale: Number(values['mesh-scale']), params, solver: values.solver ?? null, modeOnly: values['mode-only'],
        keep: post, numModes, onProgress: (message) => console.error(message),
      });
      if (post) console.log(JSON.stringify(postprocess(result, values), null, 2));
      else console.log(JSON.stringify(result, null, 2));
      // Completion is not a literature pass. A failed evaluated target is a distinct exit status.
      if (result.targets.some((t) => t.status === 'fail')) process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
