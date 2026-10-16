<script lang="ts">
	// Unit field (COMSOL Unit list): units compatible with the expression's dimension (plus the integration measure)
	// in a list, and free text. Empty = SI unit of the expression.
	import { formatUnit, parseUnit } from '../../../../engine/src/postproc/index.mjs';
	import type { Workbench } from './workbench.svelte';
	import type { CheckResult } from './post/contract';
	import { prettyUnit } from './post/ui';

	interface Props {
		wb: Workbench;
		dataset: string;
		expr: string;
		value: string;
		label?: string;
		measure?: '' | 'm^2' | 'm';
		sol?: string;
		local?: boolean;
		onchange: (v: string) => void;
	}
	let { wb, dataset, expr, value, label = 'Unit', measure = '', sol, local = false, onchange }: Props = $props();

	const CANDIDATES = ['1', 'V', 'mV', 'kV', 'V/m', 'V/um', 'V/mm', 'V/cm', 'kV/cm', '1/V', '1/(V*m^2)', '1/(V*um^2)', '1/(V*m)', '1/(V*um)', 'm', 'mm', 'um', 'nm', 'cm', 'm^2', 'um^2', '1/m', '1/cm', '1/um', 'J/m^3', 'J/m', 'pJ/m', 'C/m^2', 'F/m', 'pF/m', 'H/m', 'nH/m', 'ohm', 'V^2/m^2', 'V^2/um^2', 'W/m^2', 'W/um^2', 'V*m', 'V*cm', 'V*mm', 's', 'Hz', 'GHz', 'THz', 'dB/m', 'dB/cm'];
	let dim = $state<number[] | null>(null);
	const eq = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
	$effect(() => {
		const e = expr.trim();
		dim = null;
		if (!e || local || !wb.post) return;
		wb.post
			.request<CheckResult>({ op: 'check', dataset, mode: sol ? undefined : wb.results.mode(dataset), expr: e, sol }, `unitdim:${label}`)
			.then((r) => (dim = measure === 'm^2' ? [r.dim[0] + 2, ...r.dim.slice(1)] : measure === 'm' ? [r.dim[0] + 1, ...r.dim.slice(1)] : r.dim))
			.catch(() => (dim = null));
	});
	const options = $derived.by(() => {
		if (!dim) return [] as string[];
		const out = CANDIDATES.filter((u) => {
			try {
				return eq(parseUnit(u).dim, dim!);
			} catch {
				return false;
			}
		});
		const si = formatUnit(dim as [number, number, number, number]);
		return out.includes(si) ? out : [si, ...out];
	});
	const listId = `units-${Math.random().toString(36).slice(2, 8)}`;
</script>

<input type="text" list={listId} aria-label={label} value={value} placeholder={dim ? `SI: ${prettyUnit(formatUnit(dim as [number, number, number, number]))}` : 'SI'} data-tip="Display unit: pick a compatible unit or type one (e.g. V/um, pF/m, 1/V); empty = SI unit" onchange={(e) => onchange(e.currentTarget.value.trim())} />
<datalist id={listId}>{#each options as u}<option value={u}>{prettyUnit(u)}</option>{/each}</datalist>

<style>
	input { width: 100%; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; }
</style>
