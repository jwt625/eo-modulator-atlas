// Reactive cache of postprocessing results (plot arrays, line samples, mode tables) keyed by request. A request is
// sent once per key; a newer request with the same `slot` (e.g. one plot feature) supersedes the pending one
// (cancelled in the worker queue, its reply dropped). Entries are bound to a solution generation: a new solution
// clears the cache, and replies for an older generation are discarded.
import { StaleError, type PostClient } from './post/client';
import type { PostRequest } from './post/contract';

/** Byte budget of cached values (plot arrays can be several MB each); least recently used entries are dropped first. */
const MAX_BYTES = 192 * 1024 * 1024;

export interface Entry<T = unknown> {
	status: 'pending' | 'ok' | 'error';
	data?: T;
	error?: string;
	ms?: number;
}

function bytesOf(v: unknown, depth = 0): number {
	if (v == null || depth > 3) return 0;
	if (ArrayBuffer.isView(v)) return v.byteLength;
	if (Array.isArray(v)) return v.reduce((s: number, x) => s + bytesOf(x, depth + 1), 0);
	if (typeof v === 'object') return Object.values(v as Record<string, unknown>).reduce((s: number, x) => s + bytesOf(x, depth + 1), 64);
	return 8;
}

export class PostCache {
	/** Entries by request key. Replies reassign the record (state created inside a derived is not tracked, so no per-key cells). */
	entries = $state.raw<Record<string, Entry>>({});
	private meta = new Map<string, { bytes: number; at: number }>();
	private total = 0;
	private gen = -1;
	private inflight = new Set<string>();

	reset(gen: number) {
		if (gen === this.gen) return;
		this.gen = gen;
		this.entries = {};
		this.meta = new Map();
		this.total = 0;
		this.inflight.clear();
	}

	/** Current entry of a request key without fetching (export). */
	peek<T>(req: PostRequest): Entry<T> | null {
		return (this.entries[JSON.stringify(req)] as Entry<T> | undefined) ?? null;
	}

	/**
	 * Store a reply. Only entries with large values (plot arrays) count against the byte budget and are evicted, least
	 * recently read first; small results (scalars, mode tables) are never evicted (no re-request loops).
	 */
	private set(key: string, e: Entry) {
		const next = { ...this.entries, [key]: e };
		const bytes = bytesOf(e.data);
		this.total += bytes - (this.meta.get(key)?.bytes ?? 0);
		this.meta.set(key, { bytes, at: performance.now() });
		if (this.total > MAX_BYTES) {
			for (const [k, m] of [...this.meta.entries()].sort((a, b) => a[1].at - b[1].at)) {
				if (this.total <= MAX_BYTES * 0.75) break;
				if (k === key || m.bytes < 65536) continue;
				this.total -= m.bytes;
				this.meta.delete(k);
				delete next[k];
			}
		}
		this.entries = next;
	}

	/** Cached entry for `req` (fetched when missing). Call from a reactive context; the entry updates when it arrives. */
	get<T>(client: PostClient | null, gen: number, req: PostRequest, slot: string | null = null): Entry<T> | null {
		// reset() is called by the workbench on a new solution (no state writes inside a derived).
		if (!client || gen !== this.gen) return null;
		const key = JSON.stringify(req);
		const m = this.meta.get(key);
		if (m) m.at = performance.now();
		const hit = this.entries[key] as Entry<T> | undefined;
		if (hit) return hit;
		if (!this.inflight.has(key)) {
			this.inflight.add(key);
			const t0 = performance.now();
			const myGen = gen;
			queueMicrotask(() => {
				client
					.request<T>(req, slot)
					.then((data) => {
						if (this.gen !== myGen) return;
						this.set(key, { status: 'ok', data, ms: performance.now() - t0 });
					})
					.catch((e: unknown) => {
						if (this.gen !== myGen) return;
						if (e instanceof StaleError) {
							this.inflight.delete(key);
							return;
						}
						this.set(key, { status: 'error', error: e instanceof Error ? e.message : String(e) });
					})
					.finally(() => this.inflight.delete(key));
			});
		}
		return { status: 'pending' };
	}
}
