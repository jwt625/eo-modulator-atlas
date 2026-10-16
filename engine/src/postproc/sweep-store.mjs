// Sweep datasets (DevLog-031 phase 2): the globals of every sweep point (always small) and a bounded LRU of full
// solution stores for points run with `keep: true` (default: at most 2 stores and 512 MiB). Global expressions over all
// points give table rows. License: GPL-3.0-or-later.

import { createSolutionStore } from './store.mjs';
import { evaluateGlobals } from './evaluate.mjs';
import { runSweepPoint } from '../sweep.mjs';
import { hashString } from '../fields.mjs';

export const DEFAULT_SWEEP_MAX_STORES = 2;
export const DEFAULT_SWEEP_MAX_BYTES = 512 * 1024 * 1024;

/**
 * @param {{maxStores?:number, maxBytes?:number, cacheBytes?:number}} [options] cacheBytes: value cache of each store
 */
export function createSweepStore({ maxStores = DEFAULT_SWEEP_MAX_STORES, maxBytes = DEFAULT_SWEEP_MAX_BYTES, cacheBytes = 32 * 1024 * 1024 } = {}) {
  if (!(Number.isInteger(maxStores) && maxStores >= 0)) throw new Error('maxStores must be an integer >= 0');
  const points = new Map();
  const stores = new Map();
  const bytesOf = (st) => st.memory().storeBytes + st.memory().cacheBytes;
  const evict = () => {
    let total = 0;
    for (const st of stores.values()) total += bytesOf(st);
    while (stores.size && (stores.size > maxStores || total > maxBytes)) {
      const [k, st] = stores.entries().next().value;
      total -= bytesOf(st);
      st.dispose();
      stores.delete(k);
    }
  };
  return {
    /** Record a sweep point (runSweepPoint result); its non-enumerable internals (keep: true) become a retained store. */
    addPoint(point) {
      if (!point || !Number.isInteger(point.index)) throw new Error('addPoint: expected a sweep point with an index');
      points.set(point.index, { index: point.index, values: point.values, globals: point.globals ?? null, error: point.error ?? null });
      if (point.internals && maxStores > 0) {
        stores.get(point.index)?.dispose();
        stores.delete(point.index);
        stores.set(point.index, createSolutionStore(point, { cacheBytes }));
        evict();
      }
    },
    /** Retained store of a point (marks it most recently used) or null. */
    /** Recorded point summary or null. */
    point(index) { return points.get(index) ?? null; },
    /** Free text bound by storeForSweepPoint (a different config, study or run option clears the store). */
    context: null,
    store(index) {
      const st = stores.get(index);
      if (!st) return null;
      stores.delete(index);
      stores.set(index, st);
      return st;
    },
    points: () => [...points.values()].sort((a, b) => a.index - b.index),
    datasets: () => [...points.values()].sort((a, b) => a.index - b.index).map((p) => ({ id: `sweep:${p.index}`, kind: 'sweep', label: `Sweep point ${p.index} ${JSON.stringify(p.values)}`, point: p.index, retained: stores.has(p.index), error: p.error })),
    /** Global expression over every recorded point -> rows {index, values, value}. */
    rows(expr, { unit } = {}) {
      const list = [...points.values()].sort((a, b) => a.index - b.index);
      const r = evaluateGlobals(expr, list.map((p) => p.globals), { unit });
      return { rows: list.map((p, i) => ({ index: p.index, values: p.values, value: r.values[i] })), unit: r.unit, siUnit: r.siUnit, dim: r.dim };
    },
    memory() {
      let bytes = 0;
      for (const st of stores.values()) bytes += bytesOf(st);
      return { points: points.size, stores: stores.size, bytes };
    },
    clear() { for (const st of stores.values()) st.dispose(); stores.clear(); points.clear(); },
  };
}

/**
 * Solution store of one sweep point, recomputed on demand and kept in the bounded sweep store (COMSOL parametric dataset
 * with a parameter-value selector; round 2, R-UI request). A retained store is returned without solving; otherwise the
 * point runs with keep: true (runSweepPoint, same options) and is added to the sweep store. A different config text,
 * study or run option clears the sweep store first. With maxStores 0 the store is returned but not retained.
 * @param {string} text YAML config
 * @param {number} index sweep point index
 * @param {{sweepStore:ReturnType<typeof createSweepStore>, study?:string|null, params?:Record<string,number>, stages?:string[]|null,
 *   section?:string|null, meshScale?:number, solver?:'scalar'|'vector'|null, numModes?:number|null, cache?:object, onProgress?:(m:string)=>void}} options
 * @returns {{store:any, point:any, reused:boolean}}
 */
export function storeForSweepPoint(text, index, { sweepStore, ...options } = {}) {
  if (!sweepStore) throw new Error('storeForSweepPoint: options.sweepStore (createSweepStore()) is required');
  const { cache, onProgress, ...keyOpts } = options;
  const ctx = hashString(JSON.stringify([text, keyOpts]));
  if (sweepStore.context !== ctx) { sweepStore.clear(); sweepStore.context = ctx; }
  const hit = sweepStore.store(index);
  if (hit) return { store: hit, point: sweepStore.point(index), reused: true };
  const point = runSweepPoint(text, index, { ...options, keep: true });
  if (point.error) throw new Error(`sweep point ${index}: ${point.error}`);
  sweepStore.addPoint(point);
  return { store: sweepStore.store(index) ?? createSolutionStore(point), point, reused: false };
}
