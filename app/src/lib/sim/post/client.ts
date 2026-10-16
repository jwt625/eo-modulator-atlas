// Main-thread client of the solution worker (DevLog-032 worker protocol). Requests carry an id; a request with the same
// `key` as a pending one supersedes it: the old one is cancelled in the worker queue and its promise rejects with
// StaleError (callers ignore it). Replies of superseded requests are dropped.
import type { PostRequest } from './contract';

export class StaleError extends Error {
	constructor() {
		super('superseded');
	}
}

interface Pending {
	resolve: (v: unknown) => void;
	reject: (e: Error) => void;
	key: string | null;
	t0: number;
	op: string;
}

export class PostClient {
	private pending = new Map<number, Pending>();
	private byKey = new Map<string, number>();
	private next = 1;
	/** Last round-trip time per op (ms), for the performance record. */
	timing: Record<string, number> = {};
	/** Worker-side compute time of the last reply per op (ms). */
	workerMs: Record<string, number> = {};

	constructor(private worker: Worker) {}

	request<T>(req: PostRequest, key: string | null = null): Promise<T> {
		const id = this.next++;
		if (key) {
			const old = this.byKey.get(key);
			if (old != null) {
				const p = this.pending.get(old);
				this.pending.delete(old);
				this.worker.postMessage({ type: 'cancel', ids: [old] });
				p?.reject(new StaleError());
			}
			this.byKey.set(key, id);
		}
		return new Promise<T>((resolve, reject) => {
			this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, key, t0: performance.now(), op: req.op });
			// Requests are small JSON; a JSON copy strips reactive proxies (not structured-cloneable).
			this.worker.postMessage({ type: 'post', id, req: JSON.parse(JSON.stringify(req)) });
		});
	}

	/** Called with every `post` reply from the worker. */
	handle(msg: { id: number; ok: boolean; data?: unknown; error?: string; ms: number }) {
		const p = this.pending.get(msg.id);
		if (!p) return;
		this.pending.delete(msg.id);
		if (p.key && this.byKey.get(p.key) === msg.id) this.byKey.delete(p.key);
		this.timing[p.op] = performance.now() - p.t0;
		this.workerMs[p.op] = msg.ms;
		if (msg.ok) p.resolve(msg.data);
		else p.reject(new Error(msg.error ?? 'evaluation failed'));
	}

	dispose() {
		for (const p of this.pending.values()) p.reject(new StaleError());
		this.pending.clear();
		this.byKey.clear();
	}
}
