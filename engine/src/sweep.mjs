// Parametric sweep studies over config `params` (DevLog-023 S2, DevLog-026). Points are enumerated up front so a worker
// pool can run them by index (runSweepPoint); runSweep runs them in order with per-point callbacks and cancellation.
// Electrostatics are reused between points whose geometry and RF materials hash equal (wavelength-only sweeps); the
// mesh alone is reused when only RF permittivities change. GPL-3.0-or-later.

import { parseDocument } from 'yaml';
import { parseConfig, validateTarget, STAGES } from './config.mjs';
import { runConfig } from './run.mjs';
import { resolveParams } from './params.mjs';
import { runGlobals } from './postproc/store.mjs';

export const MAX_STUDY_POINTS = 2000;
const STUDY_KEYS = ['type', 'description', 'sweep', 'stages', 'outputs', 'sweep_targets', 'section'];
const fail = (p, m) => { throw new Error(`${p}: ${m}`); };
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function readRaw(text) {
  if (typeof text !== 'string') fail('config', 'expected YAML text');
  const doc = parseDocument(text, { uniqueKeys: true });
  if (doc.errors.length) throw new Error(`YAML: ${doc.errors.map((e) => e.message).join('; ')}`);
  return doc.toJS({ maxAliasCount: 100 });
}

/** Named studies of a raw config: `studies: {name: study}` and/or a single `study:` (named `study`). */
export function studiesOf(raw) {
  const out = {};
  if (raw.study != null) out.study = raw.study;
  if (raw.studies != null) {
    if (!isObj(raw.studies)) fail('studies', 'expected an object name -> study');
    for (const [k, v] of Object.entries(raw.studies)) {
      if (Object.hasOwn(out, k) || k === '__proto__') fail(`studies.${k}`, 'duplicate or reserved study name');
      out[k] = v;
    }
  }
  return out;
}

function sweepValues(entry, p) {
  if (!isObj(entry)) fail(p, 'expected {param, values} or {param, range}');
  for (const k of Object.keys(entry)) if (!['param', 'values', 'range'].includes(k)) fail(`${p}.${k}`, 'unsupported field');
  if (typeof entry.param !== 'string' || !entry.param) fail(`${p}.param`, 'expected a parameter name');
  if ((entry.values == null) === (entry.range == null)) fail(p, 'give exactly one of values or range');
  let values;
  if (entry.values != null) {
    if (!Array.isArray(entry.values) || !entry.values.length) fail(`${p}.values`, 'expected a non-empty array of numbers');
    values = entry.values.map((v, i) => { if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${p}.values[${i}]`, 'expected a finite number'); return v; });
  } else {
    const r = entry.range;
    if (!isObj(r)) fail(`${p}.range`, 'expected {start, stop, n}');
    for (const k of Object.keys(r)) if (!['start', 'stop', 'n'].includes(k)) fail(`${p}.range.${k}`, 'unsupported field');
    for (const k of ['start', 'stop']) if (typeof r[k] !== 'number' || !Number.isFinite(r[k])) fail(`${p}.range.${k}`, 'expected a finite number');
    if (!Number.isInteger(r.n) || r.n < 1) fail(`${p}.range.n`, 'expected an integer >= 1');
    if (r.n === 1 && r.stop !== r.start) fail(`${p}.range`, 'a single point needs stop = start');
    values = r.n === 1 ? [r.start] : Array.from({ length: r.n }, (_, i) => r.start + ((r.stop - r.start) * i) / (r.n - 1));
  }
  return { param: entry.param, values };
}

/**
 * Validated study: sweep axes (nested: the first axis is outermost), outputs, stages, sweep targets.
 * @param {any} raw parsed YAML document
 * @param {string|null} name study name (null: the only study)
 */
export function studyOf(raw, name = null) {
  const all = studiesOf(raw);
  const names = Object.keys(all);
  if (!names.length) fail('study', 'the config declares no study (study: or studies:)');
  if (name == null) {
    if (names.length > 1) fail('study', `several studies (${names.join(', ')}); choose one by name`);
    name = names[0];
  }
  if (!Object.hasOwn(all, name)) fail('study', `unknown study ${name} (available: ${names.join(', ')})`);
  const s = all[name];
  const p = name === 'study' ? 'study' : `studies.${name}`;
  if (!isObj(s)) fail(p, 'expected an object');
  for (const k of Object.keys(s)) if (!STUDY_KEYS.includes(k)) fail(`${p}.${k}`, 'unsupported field');
  if (s.type !== 'parametric') fail(`${p}.type`, 'expected parametric');
  if (!Array.isArray(s.sweep) || !s.sweep.length) fail(`${p}.sweep`, 'expected a non-empty array of sweep axes');
  const { defs } = resolveParams(raw.params);
  const axes = s.sweep.map((e, i) => sweepValues(e, `${p}.sweep[${i}]`));
  const seen = new Set();
  for (const [i, a] of axes.entries()) {
    if (!Object.hasOwn(defs, a.param)) fail(`${p}.sweep[${i}].param`, `unknown parameter ${a.param} (sweeps act on params)`);
    if (seen.has(a.param)) fail(`${p}.sweep[${i}].param`, `parameter ${a.param} swept twice`);
    seen.add(a.param);
  }
  const nPoints = axes.reduce((n, a) => n * a.values.length, 1);
  if (nPoints > MAX_STUDY_POINTS) fail(`${p}.sweep`, `${nPoints} points exceed the limit of ${MAX_STUDY_POINTS}`);
  let stages = null;
  if (s.stages != null) {
    if (!Array.isArray(s.stages)) fail(`${p}.stages`, 'expected an array of stage names');
    s.stages.forEach((x, i) => { if (!STAGES.includes(x)) fail(`${p}.stages[${i}]`, `expected one of ${STAGES.join(', ')}`); });
    stages = [...s.stages];
  }
  const outputs = s.outputs == null ? null : s.outputs.map((o, i) => { if (typeof o !== 'string') fail(`${p}.outputs[${i}]`, 'expected a metric name'); return o; });
  if (s.outputs != null && !Array.isArray(s.outputs)) fail(`${p}.outputs`, 'expected an array of metric names');
  const targets = (s.sweep_targets ?? []).map((t, i) => {
    const tp = `${p}.sweep_targets[${i}]`;
    if (!isObj(t)) fail(tp, 'expected an object');
    const { at, ...rest } = t;
    if (!isObj(at) || !Object.keys(at).length) fail(`${tp}.at`, 'expected {param: value, ...}');
    for (const [k, v] of Object.entries(at)) {
      if (!Object.hasOwn(defs, k)) fail(`${tp}.at.${k}`, 'unknown parameter');
      if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${tp}.at.${k}`, 'expected a finite number');
    }
    validateTarget(rest, tp);
    return { at: { ...at }, target: rest };
  });
  if (s.section != null && typeof s.section !== 'string') fail(`${p}.section`, 'expected a cross-section name');
  return { name, axes, nPoints, stages, outputs, targets, section: s.section ?? null, description: typeof s.description === 'string' ? s.description : null };
}

/** A fixed param override that is also swept would be silently replaced by the point value (audit A12): reject it. */
function rejectSweptOverrides(study, params) {
  for (const k of Object.keys(params ?? {})) if (study.axes.some((a) => a.param === k)) fail('params', `${k} is swept by the study; it cannot also be fixed`);
}

const near = (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** Parameter values of point `index` (row-major over the axes: the last axis varies fastest). */
export function pointValues(study, index) {
  if (!Number.isInteger(index) || index < 0 || index >= study.nPoints) fail('sweep', `point index ${index} outside 0..${study.nPoints - 1}`);
  const values = {};
  let rest = index;
  for (let a = study.axes.length - 1; a >= 0; a--) {
    const ax = study.axes[a];
    values[ax.param] = ax.values[rest % ax.values.length];
    rest = Math.floor(rest / ax.values.length);
  }
  return Object.fromEntries(study.axes.map((ax) => [ax.param, values[ax.param]]));
}

/**
 * Enumerate a study's points without solving.
 * @param {string} text YAML config
 * @param {{study?:string|null, params?:Record<string, number>}} [options] params: fixed overrides of non-swept params
 * @returns {{study:string, axes:{param:string, values:number[]}[], nPoints:number, stages:string[]|null, outputs:string[]|null,
 *   points:{index:number, values:Record<string, number>}[], sweepTargets:any[]}}
 */
export function enumerateSweep(text, { study = null, params = {} } = {}) {
  const raw = readRaw(text);
  const s = studyOf(raw, study);
  rejectSweptOverrides(s, params);
  return { study: s.name, axes: s.axes, nPoints: s.nPoints, stages: s.stages, outputs: s.outputs, section: s.section,
    points: Array.from({ length: s.nPoints }, (_, i) => ({ index: i, values: pointValues(s, i) })),
    sweepTargets: s.targets.map((t) => ({ at: t.at, ...t.target })) };
}

/**
 * Run one sweep point by index (for a worker pool: each worker keeps its own `cache` object across the points it runs).
 * Base `targets` are not compared at sweep points; the study's `sweep_targets` whose `at` matches the point are.
 * @param {string} text
 * @param {number} index
 * @param {{study?:string|null, params?:Record<string,number>, stages?:string[]|null, section?:string, meshScale?:number,
 *   fields?:boolean, cache?:object, onProgress?:(m:string)=>void}} [options] stages: overrides the study stages
 * @returns point result {index, values, metrics, outputs, targets, targetSummary, warnings, timing, geometryHash,
 *   materialHash, reused, elapsed_ms, error, fields?}
 */
export function runSweepPoint(text, index, options = {}) {
  const raw = readRaw(text);
  const s = studyOf(raw, options.study ?? null);
  rejectSweptOverrides(s, options.params);
  return runPoint(text, s, index, options);
}

function runPoint(text, s, index, { params = {}, stages = null, section = null, meshScale = 1, fields = false, cache = null, onProgress = () => {}, solver = null, elementOrder = null, p2MeshFactor = null, keep = false, numModes = null } = {}) {
  const values = pointValues(s, index);
  const t0 = performance.now();
  try {
    const config = parseConfig(text, { params: { ...params, ...values } });
    const all = config.params.values;
    const targets = s.targets.filter((t) => Object.entries(t.at).every(([k, v]) => near(all[k], v))).map((t) => ({ ...t.target, at: { ...t.at } }));
    const result = runConfig(config, { stages: stages ?? s.stages, section: section ?? s.section ?? 'geometry', meshScale, fields, cache, onProgress, targets, solver, elementOrder, p2MeshFactor, keep, numModes });
    const outputs = s.outputs ? Object.fromEntries(s.outputs.map((k) => [k, Object.hasOwn(result.metrics, k) ? result.metrics[k] : null])) : null;
    const point = { index, values, params: all, metrics: result.metrics, outputs, targets: result.targets, targetSummary: result.targetSummary,
      warnings: result.warnings, timing: result.timing, geometryHash: result.geometryHash, materialHash: result.materialHash,
      reused: result.reused, eo: result.eo ? { pushPullBalance: result.eo.pushPullBalance, armNeff: { A: result.eo.arms.A.neff, B: result.eo.arms.B?.neff ?? null } } : null,
      // DevLog-031: SI values of the run globals (postproc GLOBAL_VARIABLES) for global expressions over sweep points
      globals: runGlobals(result, { lambdaUm: config.raw.optics?.wavelength_nm != null ? config.raw.optics.wavelength_nm / 1000 : null }),
      elapsed_ms: performance.now() - t0, error: null, ...(fields ? { fields: result.fields } : {}) };
    if (keep) Object.defineProperty(point, 'internals', { value: result.internals, enumerable: false, configurable: true });
    return point;
  } catch (e) {
    return { index, values, metrics: null, outputs: null, targets: [], targetSummary: null, warnings: [], timing: null, geometryHash: null,
      materialHash: null, reused: null, globals: null, elapsed_ms: performance.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Run every point of a study in order. Cancellation: `options.signal` (AbortSignal) is checked before each point; the
 * function yields to the event loop between points so an abort can arrive. A failing point is recorded with its error
 * and the sweep continues unless `stopOnError`.
 * @param {string} text
 * @param {{study?:string|null, params?:Record<string,number>, stages?:string[]|null, section?:string, meshScale?:number,
 *   fields?:boolean, signal?:AbortSignal, stopOnError?:boolean, onProgress?:(m:string)=>void}} [options]
 * @param {(point:any, done:number, total:number)=>void} [onPoint]
 */
export async function runSweep(text, options = {}, onPoint = () => {}) {
  const raw = readRaw(text);
  const s = studyOf(raw, options.study ?? null);
  rejectSweptOverrides(s, options.params);
  const cache = {};
  const points = [];
  let cancelled = false;
  const t0 = performance.now();
  for (let i = 0; i < s.nPoints; i++) {
    if (options.signal?.aborted) { cancelled = true; break; }
    const point = runPoint(text, s, i, { ...options, cache });
    points.push(point);
    onPoint(point, i + 1, s.nPoints);
    if (point.error && options.stopOnError) break;
    await new Promise((r) => setTimeout(r, 0));
  }
  const evaluated = points.flatMap((p) => p.targets.filter((t) => t.status !== 'not_evaluated'));
  return { study: s.name, axes: s.axes, nPoints: s.nPoints, completed: points.length, cancelled, points,
    targetSummary: { total: points.reduce((n, p) => n + p.targets.length, 0), evaluated: evaluated.length,
      passed: evaluated.filter((t) => t.status === 'pass').length, failed: evaluated.filter((t) => t.status === 'fail').length },
    errors: points.filter((p) => p.error).length, elapsed_ms: performance.now() - t0 };
}
