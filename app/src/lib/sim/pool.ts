// Worker pool for sweep points: N module workers, one point per message, results streamed back. No
// SharedArrayBuffer (static hosting cannot set COOP/COEP); points carry only text and options.
import type { WorkerIn, WorkerOut } from './types';

/** One sweep point: a worker message (`run` with fields: false, or `point` for a config study). */
export interface SweepJob {
	index: number;
	msg: WorkerIn;
}

export interface PointOutcome {
	metrics: Record<string, number> | null;
	error: string | null;
	/** Engine-reported reuse of mesh/electrostatics (config studies). */
	reused?: { mesh: boolean; electrostatics: boolean } | null;
	targets?: { metric: string; value: number; actual: number | null; status: string }[];
}

export interface PoolCallbacks {
	onStart: (index: number) => void;
	onResult: (index: number, out: PointOutcome, ms: number) => void;
	onDone: () => void;
}

export class SweepPool {
	private workers: Worker[] = [];
	private cancelled = false;

	constructor(private size: number) {}

	run(jobs: SweepJob[], cb: PoolCallbacks): void {
		const queue = [...jobs];
		let active = 0;
		const next = (w: Worker) => {
			if (this.cancelled) return;
			const job = queue.shift();
			if (!job) {
				w.terminate();
				this.workers = this.workers.filter((x) => x !== w);
				if (--active === 0) cb.onDone();
				return;
			}
			const t0 = performance.now();
			cb.onStart(job.index);
			w.onmessage = (ev: MessageEvent<WorkerOut>) => {
				if (this.cancelled) return;
				const d = ev.data;
				if (d.type === 'progress') return;
				const ms = performance.now() - t0;
				if (d.type === 'result') cb.onResult(job.index, { metrics: d.result.metrics, error: null, reused: d.result.reused ?? null }, ms);
				else if (d.type === 'point') cb.onResult(job.index, { metrics: d.point.metrics, error: d.point.error, reused: d.point.reused, targets: d.point.targets }, ms);
				else if (d.type === 'error') cb.onResult(job.index, { metrics: null, error: d.message }, ms);
				else return;
				next(w);
			};
			w.onerror = (ev) => {
				if (this.cancelled) return;
				ev.preventDefault();
				cb.onResult(job.index, { metrics: null, error: ev.message || 'worker failed' }, performance.now() - t0);
				// A crashed worker is replaced so the remaining points still run.
				w.terminate();
				this.workers = this.workers.filter((x) => x !== w);
				const fresh = this.spawn();
				next(fresh);
			};
			w.postMessage(job.msg);
		};
		const n = Math.min(this.size, jobs.length);
		if (!n) {
			cb.onDone();
			return;
		}
		for (let i = 0; i < n; i++) {
			active++;
			next(this.spawn());
		}
	}

	private spawn(): Worker {
		const w = new Worker(new URL('../sim.worker.ts', import.meta.url), { type: 'module' });
		this.workers.push(w);
		return w;
	}

	get count(): number {
		return this.workers.length;
	}

	cancel(): void {
		this.cancelled = true;
		for (const w of this.workers) {
			w.onmessage = null;
			w.onerror = null;
			w.terminate();
		}
		this.workers = [];
	}
}
