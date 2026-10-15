#!/usr/bin/env node
// Solver benchmark and regression check (DevLog-024, lane L-PERF).
//
// Runs a fixed case set through runCrossSection N times, reports medians of the wall time and of every solver phase
// (from the opt-in timing sink in sparse.mjs), writes one JSONL line per case to logs/bench-YYYYMMDDTHHMM.jsonl and
// compares every numeric result leaf with a stored baseline (relative 1e-9 unless a documented per-metric tolerance
// applies: a method change, see METHOD_TOLERANCES).
//
// Usage:
//   node engine/bench/bench.mjs [--repeats 5] [--cases mao2022-es,...] [--src DIR] [--configs DIR]
//                               [--baseline FILE] [--write-baseline FILE] [--out FILE] [--no-log] [--extra-cases FILE]
//   --src DIR      engine source directory to import (default engine/src); lets a frozen engine copy run the same bench
//   --configs DIR  directory with <name>.yaml copies of the inputs (default: the repo files listed in CASES)
//
// Baseline from git HEAD (read-only; no worktree): extract `git archive HEAD engine sims | tar -x -C <dir>`, link
// <dir>/engine/node_modules to engine/node_modules, copy <dir>/sims/<name>/config.yaml and
// <dir>/engine/tests/fixtures/gsg-eo-rf.yaml to <cfg>/<name>.yaml, then
//   node engine/bench/bench.mjs --src <dir>/engine/src --configs <cfg> --repeats 1 --write-baseline <base.json> --no-log
// and compare with --src engine/src --configs <cfg> --baseline <base.json>.
// License: GPL-3.0-or-later.

import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import os from 'node:os';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');

/** Bench inputs. `file` is relative to the repo; `name` is the file stem used with --configs. */
const INPUTS = {
  mao2022: 'sims/mao2022/config.yaml',
  arabjuneghani2022: 'sims/arabjuneghani2022/config.yaml',
  chen2022: 'sims/chen2022/config.yaml',
  lin2025: 'sims/lin2025/config.yaml',
  renaud2023: 'sims/renaud2023/config.yaml',
  'gsg-eo-rf': 'engine/tests/fixtures/gsg-eo-rf.yaml',
};

/**
 * Synthetic bench variant (performance only, not a physics input): dielectric loss none and no internal inductance so
 * rf_line runs on mao2022 and exercises the three Wheeler recessed vacuum solves. Set through the YAML document API
 * (engine yaml-edit), so keys already present are replaced, not duplicated (final audit F5).
 */
const WHEELER_OVERRIDES = [
  ['line.conductor_loss_model', 'skin_effect_wheeler'],
  ['line.dielectric_loss_model', 'none'],
  ['line.include_internal_inductance', false],
];

/**
 * Bench cases. Every numerical choice that has a config default is pinned explicitly (final audit F5; L-PARAM changes
 * defaults over time): electrostatic element order (`es`: 1 or 2), optical solver (`optics`: 'scalar' or 'vector'),
 * vector element order (2), group-index method (perturbation), mesh scale (1) and, for P2, the electrostatic mesh
 * factor (`p2`, default 2 since DevLog-026 round 5; round-6 audit G5). Pins go both into the YAML (`mesh.element_order`,
 * `mesh.p2_mesh_factor`, `optics.solver`, `optics.vector_order`, `optics.group_index_from`) and into the run options
 * (`elementOrder`, `p2MeshFactor`, `solver`, `meshScale`). More cases without code changes: `--extra-cases FILE` (a JSON
 * array of case objects with the same fields).
 */
export const CASES = [
  { id: 'mao2022-es-p1', input: 'mao2022', stages: [], es: 1 },
  { id: 'mao2022-es-p2', input: 'mao2022', stages: [], es: 2, p2: 2 },
  { id: 'mao2022-es-p2f1', input: 'mao2022', stages: [], es: 2, p2: 1 },
  { id: 'mao2022-es-p2f2', input: 'mao2022', stages: [], es: 2, p2: 2 },
  { id: 'mao2022-opt-scalar-p1', input: 'mao2022', stages: ['optical_mode'], es: 1, optics: 'scalar' },
  { id: 'mao2022-opt-vector-p2', input: 'mao2022', stages: ['optical_mode'], es: 2, p2: 2, optics: 'vector' },
  { id: 'arabjuneghani2022-es-p1', input: 'arabjuneghani2022', stages: [], es: 1 },
  { id: 'arabjuneghani2022-opt-scalar-p1', input: 'arabjuneghani2022', stages: ['optical_mode'], es: 1, optics: 'scalar' },
  { id: 'chen2022-unloaded-es-p1', input: 'chen2022', section: 'unloaded', stages: [], es: 1 },
  { id: 'chen2022-unloaded-es-p2', input: 'chen2022', section: 'unloaded', stages: [], es: 2, p2: 2 },
  { id: 'lin2025-es-p1', input: 'lin2025', stages: [], es: 1 },
  { id: 'lin2025-opt-scalar-p1', input: 'lin2025', stages: ['optical_mode'], es: 1, optics: 'scalar' },
  { id: 'gsg-eo-rf-p1-scalar', input: 'gsg-eo-rf', stages: ['eo_overlap', 'rf_line'], es: 1, optics: 'scalar' },
  { id: 'mao2022-wheeler-p1', input: 'mao2022', stages: ['rf_line'], es: 1, overrides: WHEELER_OVERRIDES },
  { id: 'renaud2023-eo-vector-p2', input: 'renaud2023', stages: ['optical_mode', 'eo_overlap'], es: 2, p2: 2, optics: 'vector' },
];
// K4 (validation/cases/K4.yaml) is not a case: its electrostatic mesh exceeds the 80,000-vertex maximum
// (mesh: vertex budget exceeded, 2026-10-15), so runCrossSection cannot run it; renaud2023 is the vector EO case.

/** YAML overrides that pin a case's numerical choices (see CASES). Template configs carry the mesh under `template`. */
function pinOverrides(c, text, getIn) {
  const geomPath = c.section ? `alt_geometries.${c.section}` : getIn(text, 'template') != null ? 'template' : 'geometry';
  const o = [[`${geomPath}.mesh.element_order`, c.es]];
  if (c.es === 2) o.push([`${geomPath}.mesh.p2_mesh_factor`, c.p2 ?? 2]);
  if (c.optics) {
    o.push(['optics.solver', c.optics], ['optics.group_index_from', 'perturbation']);
    if (c.optics === 'vector') o.push(['optics.vector_order', 2]);
  }
  return [...o, ...(c.overrides ?? [])];
}

/**
 * Documented tolerances for method changes (DevLog-024). Keys are regexes on the flattened leaf path.
 * ng by eigenvector perturbation replaces the wavelength finite difference (S3 step 3); the FD truncation error
 * (delta = 10 nm) is the difference, gate 1e-4 relative.
 */
export const METHOD_TOLERANCES = [
  // computed ng only (audit P4): the metric and the ng target's `actual`; config inputs of the target stay at 1e-9
  { re: /^metrics\.ng_opt$|^targets\.ng_opt#\d+\.actual$/, rel: 1e-4, why: 'ng by perturbation vs FD' },
  // S3.7 eigen solver: eigenvector residual criterion; the baseline vectors were converged only to ~1e-8 in this
  // integral of psi^2 (lin2025 baseline differs from a tol 1e-15 reference by 3.6e-8; the new value by 2.5e-10)
  { re: /boundaryMarginFraction\.(value|perMode\.\d+)$/, rel: 1e-7, why: 'eigenvector convergence (S3.7)' },
];

/** Leaves whose value is itself a round-off quantity: compared with an absolute tolerance (DevLog-024). */
export const ABS_TOLERANCES = [{ re: /energyChargeRelativeError$/, abs: 1e-10, why: 'round-off diagnostic (energy vs charge C, ~1e-13)' }];

/** Result leaves keyed so that a target's metric is part of its path (targets.<metric>#<index>.<field>). */
const keyed = (res) => ({ ...res, targets: Object.fromEntries((res.targets ?? []).map((t, i) => [`${t.metric}#${i}`, t])) });

const SKIP = /(_ms$|^elapsed_ms$|(^|\.)timing(\.|$)|(^|\.)iterations$)/;

/**
 * Flatten the leaves of a JSON-like value into {path: value}: numbers (compared with tolerances) and strings, booleans
 * and null (compared exactly; statuses, converged flags, warnings, labels, stages; audit P4).
 */
export function flatten(v, path = '', out = {}) {
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v === null) {
    if (!SKIP.test(path)) out[path] = v;
  } else if (Array.isArray(v)) v.forEach((x, i) => flatten(x, path ? `${path}.${i}` : `${i}`, out));
  else if (v && typeof v === 'object' && !ArrayBuffer.isView(v)) for (const [k, x] of Object.entries(v)) flatten(x, path ? `${path}.${k}` : k, out);
  return out;
}

const median = (a) => {
  const s = [...a].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
};

/** Sum numeric timing fields per kind over the sink records of one run. */
function phaseSums(records) {
  const out = {};
  for (const r of records) {
    const k = (out[r.kind] ??= { calls: 0 });
    k.calls++;
    for (const [f, v] of Object.entries(r)) {
      if (typeof v !== 'number') continue;
      if (f === 'nnzL' || f === 'nnzA' || f === 'fill' || f === 'nNodes' || f === 'nTris' || f === 'nFree' || f === 'subspace') k[f] = Math.max(k[f] ?? 0, v);
      else if (/_ms$/.test(f) || /^n[A-Z]/.test(f) || f === 'iterations') k[f] = (k[f] ?? 0) + v;
    }
    if (r.mesh && typeof r.mesh === 'object')
      for (const [f, v] of Object.entries(r.mesh)) if (typeof v === 'number') k[`mesh.${f}`] = (k[`mesh.${f}`] ?? 0) + v;
  }
  return out;
}

function compare(base, cur, tolDefault = 1e-9) {
  const diffs = [];
  const keys = new Set([...Object.keys(base), ...Object.keys(cur)]);
  let maxRel = 0,
    maxPath = null;
  for (const k of keys) {
    const a = base[k],
      b = cur[k];
    if (a === undefined || b === undefined) {
      diffs.push({ path: k, base: a ?? null, cur: b ?? null, reason: 'missing' });
      continue;
    }
    if (typeof a !== 'number' || typeof b !== 'number') {
      if (a !== b) diffs.push({ path: k, base: a, cur: b, reason: 'non-numeric leaf differs' });
      continue;
    }
    const at = ABS_TOLERANCES.find((t) => t.re.test(k));
    if (at) {
      if (!(Math.abs(a - b) <= at.abs)) diffs.push({ path: k, base: a, cur: b, abs: Math.abs(a - b), tol: at.abs, why: at.why });
      continue;
    }
    const rel = a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
    const mt = METHOD_TOLERANCES.find((t) => t.re.test(k));
    const tol = mt ? mt.rel : tolDefault;
    if (!mt && rel > maxRel) {
      maxRel = rel;
      maxPath = k;
    }
    if (!(rel <= tol)) diffs.push({ path: k, base: a, cur: b, rel, tol, why: mt?.why });
  }
  return { diffs, maxRel, maxPath };
}

async function main() {
  const { values } = parseArgs({
    options: {
      repeats: { type: 'string', default: '5' },
      cases: { type: 'string' },
      src: { type: 'string', default: join(repo, 'engine', 'src') },
      configs: { type: 'string' },
      baseline: { type: 'string' },
      'write-baseline': { type: 'string' },
      out: { type: 'string' },
      'no-log': { type: 'boolean', default: false },
      tol: { type: 'string', default: '1e-9' },
      'extra-cases': { type: 'string' },
    },
  });
  const repeats = Math.max(1, Number(values.repeats));
  const src = resolve(values.src);
  const { runCrossSection } = await import(pathToFileURL(join(src, 'run.mjs')).href);
  const { applyOverrides, getIn } = await import(pathToFileURL(join(src, 'yaml-edit.mjs')).href);
  const sparse = await import(pathToFileURL(join(src, 'sparse.mjs')).href);
  const sink = sparse.timingSink ?? null;
  const pick = values.cases ? values.cases.split(',') : null;
  const extra = values['extra-cases'] ? JSON.parse(readFileSync(values['extra-cases'], 'utf8')) : [];
  if (!Array.isArray(extra) || extra.some((c) => !c?.id || !c.input || !Array.isArray(c.stages) || ![1, 2].includes(c.es))) throw new Error('--extra-cases: expected a JSON array of {id, input, stages, es, p2?, optics?, section?}');
  const cases = [...CASES, ...extra].filter((c) => !pick || pick.includes(c.id));
  const stamp = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  const tag = `${stamp.getFullYear()}${p2(stamp.getMonth() + 1)}${p2(stamp.getDate())}T${p2(stamp.getHours())}${p2(stamp.getMinutes())}`;
  const outFile = values.out ?? join(repo, 'logs', `bench-${tag}.jsonl`);
  if (!values['no-log']) {
    mkdirSync(dirname(outFile), { recursive: true });
    appendFileSync(outFile, `${JSON.stringify({ type: 'header', date: stamp.toISOString(), node: process.version, cpu: os.cpus()[0]?.model, src, configs: values.configs ?? 'repo', repeats })}\n`);
  }
  const baseline = values.baseline ? JSON.parse(readFileSync(values.baseline, 'utf8')) : null;
  const newBaseline = { date: stamp.toISOString(), src, configs: values.configs ?? 'repo', cases: {} };
  let failed = false;
  const rows = [];
  for (const c of cases) {
    // one failing case is recorded and the run continues (final audit F5)
    try {
      rows.push(runCase(c));
    } catch (e) {
      failed = true;
      const row = { type: 'case', id: c.id, stages: c.stages, section: c.section ?? 'geometry', pin: { es: c.es, optics: c.optics ?? null }, error: String(e?.message ?? e) };
      rows.push(row);
      if (!values['no-log']) appendFileSync(outFile, `${JSON.stringify(row)}\n`);
      console.log(`${c.id.padEnd(30)} ERROR ${row.error}`);
    }
  }
  if (values['write-baseline']) writeFileSync(values['write-baseline'], JSON.stringify(newBaseline));
  if (!values['no-log']) console.log(`log: ${outFile}`);
  if (failed) process.exitCode = 1;
  return rows;

  function runCase(c) {
    const file = values.configs ? join(values.configs, `${c.input}.yaml`) : join(repo, INPUTS[c.input]);
    if (!existsSync(file)) throw new Error(`bench input missing: ${file}`);
    const raw = readFileSync(file, 'utf8');
    const text = applyOverrides(raw, pinOverrides(c, raw, getIn));
    const runOpts = { section: c.section ?? 'geometry', stages: c.stages, meshScale: 1, elementOrder: c.es, ...(c.es === 2 ? { p2MeshFactor: c.p2 ?? 2 } : {}), ...(c.optics ? { solver: c.optics } : {}) };
    const walls = [];
    const phases = [];
    let leaves = null;
    let nonDeterministic = false;
    for (let r = 0; r < repeats; r++) {
      if (sink) sink.records = [];
      const t0 = performance.now();
      const res = runCrossSection(text, runOpts);
      walls.push(performance.now() - t0);
      if (sink) phases.push(phaseSums(sink.records));
      const f = flatten(keyed(res));
      if (!leaves) leaves = f;
      else if (compare(leaves, f, 0).diffs.length) nonDeterministic = true;
    }
    if (sink) sink.records = null;
    const phaseMedian = {};
    if (phases.length)
      for (const kind of Object.keys(phases[0])) {
        phaseMedian[kind] = {};
        for (const f of Object.keys(phases[0][kind])) phaseMedian[kind][f] = median(phases.map((p) => p[kind]?.[f] ?? NaN));
      }
    newBaseline.cases[c.id] = { leaves };
    let cmp = null;
    if (baseline) {
      const b = baseline.cases[c.id];
      if (!b) cmp = { diffs: [{ reason: 'case missing from baseline' }], maxRel: NaN };
      else cmp = compare(b.leaves, leaves, Number(values.tol));
      if (cmp.diffs.length) failed = true;
    }
    if (nonDeterministic) failed = true;
    const row = { type: 'case', id: c.id, stages: c.stages, section: c.section ?? 'geometry', pin: { es: c.es, p2MeshFactor: c.es === 2 ? c.p2 ?? 2 : null, optics: c.optics ?? null, vectorOrder: c.optics === 'vector' ? 2 : null, meshScale: 1 }, repeats, wall_ms_median: median(walls), wall_ms_cold: walls[0], wall_ms: walls, phases: phaseMedian,
      nonDeterministic, regression: cmp ? { pass: cmp.diffs.length === 0, maxRelUnchanged: cmp.maxRel, maxRelPath: cmp.maxPath, diffs: cmp.diffs.slice(0, 20), nDiffs: cmp.diffs.length } : null };
    if (!values['no-log']) appendFileSync(outFile, `${JSON.stringify(row)}\n`);
    const es = phaseMedian.electrostatics;
    const md = phaseMedian.modes;
    const fmt = (v) => (v === undefined || Number.isNaN(v) ? '-' : v.toFixed(1));
    console.log(`${c.id.padEnd(30)} wall ${fmt(row.wall_ms_median).padStart(8)} ms (cold ${fmt(walls[0])})` +
      (es ? `  es[mesh ${fmt(es.mesh_ms)} ord ${fmt(es.ordering_ms)} sym ${fmt(es.symbolic_ms)} fac ${fmt(es.factor_ms)} sol ${fmt(es.solve_ms)} nnzL ${es.nnzL}]` : '') +
      (md ? `  modes[fac ${fmt(md.factor_ms)} sol ${fmt(md.solve_ms)} it ${md.iterations} calls ${md.calls}]` : '') +
      (cmp ? `  regression ${cmp.diffs.length ? `FAIL (${cmp.diffs.length})` : 'ok'} maxRel ${cmp.maxRel.toExponential(2)} (${cmp.maxPath})` : '') + (nonDeterministic ? '  NONDETERMINISTIC' : ''));
    if (cmp?.diffs.length) for (const d of cmp.diffs.slice(0, 8)) console.log(`    ${JSON.stringify(d)}`);
    return row;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
