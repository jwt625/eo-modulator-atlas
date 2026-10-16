#!/usr/bin/env node
// Node runner of the S8 semiconductor stage (DevLog-039) until engine/cli.mjs dispatches it:
//   node engine/src/semi/run-cli.mjs CONFIG.yaml [--mesh-scale 1] [--no-optics] [--param name=value ...]
// Prints the result JSON (datasets omitted) to stdout; progress to stderr. Nothing is written to disk.
// License: GPL-3.0-or-later.
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { runSemiconductor } from '../semi-stage.mjs';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'mesh-scale': { type: 'string' }, 'no-optics': { type: 'boolean' }, param: { type: 'string', multiple: true } } });
if (positionals.length !== 1) {
  console.error('Usage: node engine/src/semi/run-cli.mjs CONFIG.yaml [--mesh-scale 1] [--no-optics] [--param name=value ...]');
  process.exit(2);
}
const params = {};
for (const item of values.param ?? []) {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.+)$/.exec(item);
  if (!m || !Number.isFinite(Number(m[2]))) throw new Error(`--param expects name=number; got ${item}`);
  params[m[1]] = Number(m[2]);
}
const text = await readFile(positionals[0], 'utf8');
const result = runSemiconductor(text, { meshScale: values['mesh-scale'] ? Number(values['mesh-scale']) : 1, optics: !values['no-optics'], params, onProgress: (m) => console.error(`${new Date().toISOString()} ${m}`) });
console.log(JSON.stringify(result, null, 1));
