#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runCrossSection } from './src/run.mjs';
import { inspectConfig, stageErrors, parseConfig, IMPLEMENTED_STAGES } from './src/config.mjs';
import { runSweep, enumerateSweep } from './src/sweep.mjs';

const usage = `Usage: node engine/cli.mjs CONFIG.yaml [--stages ${IMPLEMENTED_STAGES.join(',')}] [--optical] [--section unloaded] [--mesh-scale 1]
       [--param name=value ...] [--solver vector|scalar] [--mode-only] [--check] [--sweep [STUDY]] [--list-points]
Runs the requested cross-section stages (electrostatics always runs; --optical adds optical_mode).
--param overrides a value of the config's params block (repeatable). --solver overrides optics.solver (default vector).
--mode-only runs optical_mode without electrostatics (mode-only cases).
--check prints per-stage input readiness as JSON without solving.
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

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    optical: { type: 'boolean', default: false }, section: { type: 'string' },
    stages: { type: 'string' }, check: { type: 'boolean', default: false },
    'mesh-scale': { type: 'string', default: '1' }, help: { type: 'boolean', short: 'h' },
    param: { type: 'string', multiple: true }, sweep: { type: 'boolean', default: false }, study: { type: 'string' },
    'list-points': { type: 'boolean', default: false }, solver: { type: 'string' }, 'mode-only': { type: 'boolean', default: false },
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
      const result = runCrossSection(text, {
        stages: values['mode-only'] ? ['optical_mode'] : stages, optical: values.optical, section: values.section ?? 'geometry', meshScale: Number(values['mesh-scale']), params, solver: values.solver ?? null, modeOnly: values['mode-only'],
        onProgress: (message) => console.error(message),
      });
      console.log(JSON.stringify(result, null, 2));
      // Completion is not a literature pass. A failed evaluated target is a distinct exit status.
      if (result.targets.some((t) => t.status === 'fail')) process.exitCode = 2;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
