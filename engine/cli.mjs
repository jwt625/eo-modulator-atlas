#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runCrossSection } from './src/run.mjs';
import { inspectConfig, stageErrors, parseConfig, IMPLEMENTED_STAGES } from './src/config.mjs';

const usage = `Usage: node engine/cli.mjs CONFIG.yaml [--stages ${IMPLEMENTED_STAGES.join(',')}] [--optical] [--section unloaded] [--mesh-scale 1] [--check]
Runs the requested cross-section stages (electrostatics always runs; --optical adds optical_mode).
--check prints per-stage input readiness as JSON without solving.
JSON results go to stdout and are not saved.`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    optical: { type: 'boolean', default: false }, section: { type: 'string', default: 'geometry' },
    stages: { type: 'string' }, check: { type: 'boolean', default: false },
    'mesh-scale': { type: 'string', default: '1' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) console.log(usage);
  else {
    if (positionals.length !== 1) throw new Error('Provide one config path; use --help for usage');
    const text = await readFile(positionals[0], 'utf8');
    if (values.check) {
      // Readiness only: the strict boundary error (if any) and the blocking input error of every stage.
      const { solveError, stageErrors: blocked } = inspectConfig(text);
      const stages = solveError ? blocked : stageErrors(parseConfig(text), values.section);
      console.log(JSON.stringify({ section: values.section, solveError: solveError || null, stages }, null, 2));
    } else {
      const stages = values.stages == null ? null : values.stages.split(',').map((s) => s.trim()).filter(Boolean);
      const result = runCrossSection(text, {
        stages, optical: values.optical, section: values.section, meshScale: Number(values['mesh-scale']),
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
