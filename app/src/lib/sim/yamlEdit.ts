// YAML round-trip edits (DevLog-023 D6, DevLog-027 U3/G3). All edits go through the engine helpers in
// engine/src/yaml-edit.mjs, which splice the source text: a scalar edit or a key insertion changes one line, and
// deleting an inserted key restores the original text byte for byte. The Document API printer (`PRINT`) is the
// engine's own fallback. No local editing logic here.
import {
	setIn as engineSetIn,
	deleteIn as engineDeleteIn,
	getIn as engineGetIn,
	applyOverrides as engineApplyOverrides,
	splitPath as engineSplit
} from '../../../../engine/src/yaml-edit.mjs';

export type PathKey = string | number;

/** Split a dotted path; numeric segments index sequences (`geometry.regions.0.name`). */
export function splitPath(path: string): PathKey[] {
	return engineSplit(path);
}

/** Set a value at a path and return the new text; throws on unparsable input. */
export function setIn(text: string, path: PathKey[], value: unknown): string {
	return engineSetIn(text, path, value);
}

/** Remove a key (form field cleared). */
export function deleteIn(text: string, path: PathKey[]): string {
	return engineDeleteIn(text, path);
}

export function getIn(text: string, path: PathKey[]): unknown {
	return engineGetIn(text, path);
}

/** Apply several path=value overrides in order. */
export function applyOverrides(text: string, overrides: [string, unknown][]): string {
	return engineApplyOverrides(text, overrides);
}

/** Numeric leaves of a parsed config (for sweep path suggestions), skipping targets and provenance. */
export function numericLeaves(raw: unknown, prefix = '', out: { path: string; value: number }[] = []): { path: string; value: number }[] {
	if (raw == null || typeof raw !== 'object') return out;
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		const p = prefix ? `${prefix}.${k}` : k;
		if (!prefix && ['targets', 'provenance', 'missing', 'limitations', 'source'].includes(k)) continue;
		if (typeof v === 'number' && Number.isFinite(v)) out.push({ path: p, value: v });
		else if (v && typeof v === 'object') numericLeaves(v, p, out);
	}
	return out;
}

/** Parse a form value: number when numeric, else the trimmed string. */
export function coerce(input: string): number | string {
	const s = input.trim();
	if (s !== '' && Number.isFinite(Number(s))) return Number(s);
	return s;
}
