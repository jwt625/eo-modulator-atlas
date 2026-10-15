// Solver worker. Messages: WorkerIn / WorkerOut in lib/sim/types.ts. Field arrays are transferred, not copied.
// One reuse cache per worker (engine DevLog-026): consecutive runs with equal mesh/material hashes skip work.
import { runCrossSection } from '../../../engine/src/run.mjs';
import { runSweepPoint } from '../../../engine/src/sweep.mjs';
import { fieldTransferables } from '../../../engine/src/fields.mjs';
import { buildSectionMesh } from '../../../engine/src/mesh-entry.mjs';
import { buildP2Arrays } from './sim/p2';
import type { SimFields, WorkerIn, WorkerOut } from './sim/types';

const post = (msg: WorkerOut, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer);
const cache: Record<string, unknown> = {};

self.onmessage = (event: MessageEvent<WorkerIn>) => {
	const msg = event.data;
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
		const result = runCrossSection(text, {
			section, stages, meshScale, params, fields: msg.fields, cache,
			onProgress: (message) => post({ type: 'progress', message })
		});
		const fields: SimFields | null = result.fields ?? null;
		delete result.fields;
		// W13: the P2 refined display mesh and its triangle index are built here, off the main thread.
		if (fields?.es) {
			const display = buildP2Arrays(fields.es);
			if (display) Object.assign(fields.es, { display });
		}
		post({ type: 'result', result, fields }, fields ? fieldTransferables(fields) : []);
	} catch (error) {
		post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
	}
};
