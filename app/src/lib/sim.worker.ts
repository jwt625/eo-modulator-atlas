// Solver worker. Messages: WorkerIn / WorkerOut in lib/sim/types.ts.
// `run` with keep: the worker stays alive after the result and holds the solution (engine store, DevLog-031); Results
// requests (`post`) are evaluated here (DevLog-030 P1) and only the arrays a plot needs are transferred. Requests are
// queued one per macrotask so `cancel` can drop queued ones. Sweep points get their fields on demand (`loadPoint`):
// config studies through the engine `storeForSweepPoint`, path sweeps through a keep-run; at most 2 point solutions
// are kept (LRU). One reuse cache per worker (engine DevLog-026).
import { runCrossSection } from '../../../engine/src/run.mjs';
import { runSweepPoint } from '../../../engine/src/sweep.mjs';
import { fieldTransferables } from '../../../engine/src/fields.mjs';
import { buildSectionMesh } from '../../../engine/src/mesh-entry.mjs';
import { createSolutionStore, createSweepStore, runGlobals, storeForSweepPoint } from '../../../engine/src/postproc/index.mjs';
import { PostSession } from './sim/post/session';
import type { PointSolution, PostRequest } from './sim/post/contract';
import type { WorkerIn, WorkerOut } from './sim/types';

const post = (msg: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);
const cache: Record<string, unknown> = {};
const sessions = new Map<string, PostSession>();
const sweepStore = createSweepStore({ maxStores: 2 });
const MAX_POINTS = 2;
const queue: { id: number; req: PostRequest }[] = [];
let scheduled = false;

function session(sol = 'main'): PostSession {
	const s = sessions.get(sol);
	if (!s) throw new Error(sol === 'main' ? 'no solution in this worker' : `sweep point solution ${sol} is not loaded`);
	// LRU order: most recently used last.
	sessions.delete(sol);
	sessions.set(sol, s);
	return s;
}

function loadPoint(job: WorkerIn): PointSolution {
	const index = job.type === 'point' || job.type === 'run' ? (job.pointIndex ?? (job.type === 'point' ? job.index : 0)) : 0;
	const sol = `sweep:${index}`;
	const hit = sessions.get(sol);
	const onProgress = (message: string) => post({ type: 'progress', message: `Sweep point ${index + 1} fields: ${message}` });
	let store;
	let reused = false;
	if (job.type === 'point') {
		const r = storeForSweepPoint(job.text, job.index, { sweepStore, study: job.study, section: job.section, meshScale: job.meshScale, stages: job.stages, cache, onProgress });
		store = r.store;
		reused = r.reused;
		if (hit && hit.store === store) return { sol, datasets: hit.datasets(), meshes: hit.meshes(), reused: true };
	} else if (job.type === 'run') {
		if (hit) return { sol, datasets: hit.datasets(), meshes: hit.meshes(), reused: true };
		const result = runCrossSection(job.text, { section: job.section, stages: job.stages, meshScale: job.meshScale, params: job.params, keep: true, cache, onProgress });
		store = createSolutionStore(result);
	} else throw new Error('loadPoint needs a sweep job');
	hit?.dispose();
	const s = new PostSession(store, `${sol}/`);
	sessions.set(sol, s);
	const points = [...sessions.keys()].filter((k) => k !== 'main');
	while (points.length > MAX_POINTS) {
		const old = points.shift()!;
		sessions.get(old)?.dispose();
		sessions.delete(old);
	}
	return { sol, datasets: s.datasets(), meshes: s.meshes(), reused };
}

function handle(req: PostRequest): { data: unknown; transfer: Transferable[] } {
	if (req.op === 'loadPoint') return { data: loadPoint(req.job), transfer: [] };
	if (req.op === 'clearPoints') {
		for (const [k, s] of sessions) if (k !== 'main') { s.dispose(); sessions.delete(k); }
		sweepStore.clear();
		return { data: null, transfer: [] };
	}
	const s = session(req.sol);
	switch (req.op) {
		case 'datasets':
			return { data: s.datasets(), transfer: [] };
		case 'variables':
			return { data: s.variables(req.dataset), transfer: [] };
		case 'modes':
			return { data: s.modes(req.dataset), transfer: [] };
		case 'check':
			return { data: s.check(req.dataset, req.mode, req.expr, req.unit), transfer: [] };
		case 'plot': {
			const r = s.plot(req.req);
			return { data: r, transfer: [r.values.buffer, ...(r.x ? [r.x.buffer] : [])] };
		}
		case 'derived':
			return { data: s.derived(req.req), transfer: [] };
		case 'line': {
			const r = s.line(req.dataset, req.mode, req.exprs, req.units, req.line);
			return { data: r, transfer: [r.s.buffer, ...r.values.map((v) => v.buffer)] };
		}
	}
}

function pump() {
	scheduled = false;
	const item = queue.shift();
	if (!item) return;
	const t0 = performance.now();
	try {
		const { data, transfer } = handle(item.req);
		post({ type: 'post', id: item.id, ok: true, data, ms: performance.now() - t0 }, transfer);
	} catch (e) {
		post({ type: 'post', id: item.id, ok: false, error: e instanceof Error ? e.message : String(e), ms: performance.now() - t0 });
	}
	if (queue.length) schedule();
}
function schedule() {
	if (scheduled) return;
	scheduled = true;
	setTimeout(pump, 0);
}

self.onmessage = (event: MessageEvent<WorkerIn>) => {
	const msg = event.data;
	if (msg.type === 'post') {
		queue.push({ id: msg.id, req: msg.req });
		schedule();
		return;
	}
	if (msg.type === 'cancel') {
		const ids = new Set(msg.ids);
		for (let i = queue.length - 1; i >= 0; i--) if (ids.has(queue[i].id)) queue.splice(i, 1);
		return;
	}
	if (msg.type === 'idle') return; // a post-only worker (sweep point fields without a main solution)
	try {
		if (msg.type === 'mesh') {
			// Engine mesh-only entry (DevLog-026 round 2): falls back to the draft preview geometry when physics does not parse.
			const t0 = performance.now();
			const m = buildSectionMesh(msg.text, { section: msg.section, meshScale: msg.meshScale });
			const mesh = { x: m.x, y: m.y, tri: m.tri, triRegion: m.triRegion, regionNames: m.regionNames, regionMaterials: m.regionMaterials };
			post({ type: 'mesh', mesh, ms: performance.now() - t0 }, [m.x.buffer, m.y.buffer, m.tri.buffer, m.triRegion.buffer] as ArrayBuffer[]);
			return;
		}
		if (msg.type === 'point') {
			const point = runSweepPoint(msg.text, msg.index, { study: msg.study, section: msg.section, meshScale: msg.meshScale, stages: msg.stages, cache });
			post({ type: 'point', point });
			return;
		}
		const { text, section, stages, meshScale, params } = msg;
		const keep = !!msg.keep;
		const result = runCrossSection(text, {
			section, stages, meshScale, params, fields: !keep && msg.fields, cache, keep,
			onProgress: (message) => post({ type: 'progress', message })
		});
		const fields = result.fields ?? null;
		delete result.fields;
		if (keep) {
			// The solution stays here; the main thread receives the display meshes (refined per plot from the engine lattice values, DevLog-034) and datasets.
			sessions.get('main')?.dispose();
			const s = new PostSession(createSolutionStore(result));
			sessions.set('main', s);
			post({ type: 'result', result, fields: null, meshes: s.meshes(), datasets: s.datasets(), globals: runGlobals(result) });
			return;
		}
		post({ type: 'result', result, fields, globals: runGlobals(result) }, fields ? fieldTransferables(fields) : []);
	} catch (error) {
		post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
	}
};
