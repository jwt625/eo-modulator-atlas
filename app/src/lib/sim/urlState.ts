// Shareable /sim URL state: config id, cross-section, mesh level, stages, YAML path overrides and the sweep study.
import { coerce } from './yamlEdit';

export interface SimUrlState {
	id: string | null;
	section: string | null;
	mesh: number | null;
	stages: string[] | null;
	overrides: [string, number | string][];
	sweep: { path: string; values: string } | null;
}

export function readUrlState(params: Pick<URLSearchParams, 'get' | 'getAll'>): SimUrlState {
	const mesh = params.get('mesh');
	const stages = params.get('stages');
	const sweepPath = params.get('sweep');
	const overrides: [string, number | string][] = [];
	for (const s of params.getAll('set')) {
		const k = s.indexOf('=');
		if (k > 0) overrides.push([s.slice(0, k), coerce(s.slice(k + 1))]);
	}
	return {
		id: params.get('id') ?? params.get('config'),
		section: params.get('section'),
		mesh: mesh != null && Number.isFinite(Number(mesh)) ? Number(mesh) : null,
		stages: stages == null ? null : stages.split(',').filter(Boolean),
		overrides,
		sweep: sweepPath ? { path: sweepPath, values: params.get('values') ?? '' } : null
	};
}

export function writeUrlState(s: SimUrlState): string {
	const p = new URLSearchParams();
	if (s.id) p.set('id', s.id);
	if (s.section && s.section !== 'geometry') p.set('section', s.section);
	if (s.mesh != null && s.mesh !== 1) p.set('mesh', String(s.mesh));
	if (s.stages && s.stages.length) p.set('stages', s.stages.join(','));
	for (const [k, v] of s.overrides) p.append('set', `${k}=${v}`);
	if (s.sweep) {
		p.set('sweep', s.sweep.path);
		p.set('values', s.sweep.values);
	}
	return p.toString();
}
