<script lang="ts">
	import type { Workbench, Quantity } from './workbench.svelte';
	import { opticalSets } from './fieldsView';

	let { wb }: { wb: Workbench } = $props();

	interface Node {
		id: string;
		label: string;
		depth: number;
		tip?: string;
		tag?: { text: string; kind: 'warn' | 'muted' | 'crit' };
		group?: string;
	}

	let collapsed = $state<Record<string, boolean>>({ materials: false, geometry: true });

	const FIELD_NODES: [string, string, string][] = [
		['phi', 'Potential', 'Electric potential, per volt of terminal voltage'],
		['enorm', 'Electric field |E|', '|E| per volt of terminal voltage (P1: per element; P2: linear per element)'],
		['ex', 'E_x', 'Per-triangle E_x, per volt of terminal voltage'],
		['ey', 'E_y', 'Per-triangle E_y, per volt of terminal voltage'],
		['opt_int', 'Optical mode', 'Optical mode intensity (requires the optical mode stage)'],
		['pk:dnXX', 'Pockels delta n', 'Pockels index change per volt on the optical meshes (dn_xx, dn_yy, dn_zz, d eps_xy; per element)']
	];

	const nodes: Node[] = $derived.by(() => {
		const raw = wb.raw;
		const g = wb.geometry;
		const out: Node[] = [];
		const stageTag = (id: string): Node['tag'] => {
			const err = wb.stageError(id);
			if (err) return { text: 'blocked', kind: 'crit' };
			if (id !== 'electrostatics' && !wb.selected.includes(id)) return { text: 'off', kind: 'muted' };
			return undefined;
		};
		const resTag: Node['tag'] = !wb.result ? { text: 'empty', kind: 'muted' } : wb.stale ? { text: 'stale', kind: 'warn' } : undefined;
		out.push({ id: 'model', label: raw?.id ?? 'Model', depth: 0, tip: raw?.title ?? 'Model: description, disclosures, provenance' });
		const nParams = raw?.params && typeof raw.params === 'object' ? Object.keys(raw.params).length : 0;
		out.push({ id: 'params', label: 'Parameters', depth: 1, tip: `${nParams} parameter(s) in the params block`, tag: nParams ? undefined : { text: 'none', kind: 'muted' } });
		const mats = Object.keys(raw?.materials ?? {});
		out.push({ id: 'materials', label: 'Materials', depth: 1, group: 'materials', tip: `${mats.length} material(s)` });
		if (!collapsed.materials) for (const m of mats) out.push({ id: `material:${m}`, label: m, depth: 2, tip: `Material ${m}; selecting highlights its regions` });
		out.push({ id: 'geometry', label: `Geometry (${wb.section})`, depth: 1, group: 'geometry', tip: 'Domain, regions, electrodes, windows' });
		if (!collapsed.geometry && g) {
			g.regions.forEach((r, i) => out.push({ id: `region:${i}`, label: r.name, depth: 2, tip: `Region ${r.name}, ${r.material}` }));
			g.electrodes.forEach((e, i) => out.push({ id: `electrode:${i}`, label: e.name, depth: 2, tip: `Electrode ${e.name}, weight ${e.weight}` }));
		}
		out.push({ id: 'mesh', label: 'Mesh', depth: 1, tip: 'Mesh hints, level, build and statistics', tag: wb.meshStale ? { text: 'stale', kind: 'warn' } : undefined });
		out.push({ id: 'physics.es', label: 'Electrostatics', depth: 1, tip: 'Quasi-static electrostatics (always runs)', tag: wb.parsed.error ? { text: 'blocked', kind: 'crit' } : undefined });
		out.push({ id: 'physics.mode', label: 'Mode Analysis', depth: 1, tip: wb.stageError('optical_mode') ?? `Optical eigenmode (${wb.raw?.optics?.solver ?? 'scalar'} solver)`, tag: stageTag('optical_mode') });
		out.push({ id: 'physics.eo', label: 'EO Coupling', depth: 1, tip: wb.stageError('eo_overlap') ?? 'DC first-order Pockels overlap', tag: stageTag('eo_overlap') });
		out.push({ id: 'physics.rf', label: 'RF Line', depth: 1, tip: wb.stageError('rf_line') ?? 'Uniform quasi-TEM line', tag: stageTag('rf_line') });
		out.push({ id: 'study', label: 'Study', depth: 0, tip: 'Stationary electrostatics and mode analysis' });
		out.push({ id: 'study.stationary', label: 'Stationary + Mode', depth: 1, tip: 'Stages, mesh level, Compute' });
		out.push({ id: 'study.sweep', label: 'Parametric Sweep', depth: 1, tip: 'Sweep a parameter or YAML path on a worker pool', tag: wb.sweepRunning ? { text: 'running', kind: 'warn' } : undefined });
		out.push({ id: 'results', label: 'Results', depth: 0, tip: 'Plots, derived values, targets' });
		for (const [q, label, tip] of FIELD_NODES) out.push({ id: `results.field:${q}`, label, depth: 1, tip, tag: resTag });
		out.push({ id: 'results.cutline', label: 'Cut Line 2D', depth: 1, tip: 'Field along a line drawn on the canvas', tag: wb.cutLine ? undefined : { text: 'none', kind: 'muted' } });
		out.push({ id: 'results.derived', label: 'Derived Values', depth: 1, tip: "C', L', Z0, n_RF, n_eff, ng, VpiL, EO arms", tag: resTag });
		out.push({ id: 'results.targets', label: 'Targets', depth: 1, tip: 'Paper targets and evaluation status', tag: resTag });
		out.push({ id: 'results.rf', label: 'RF Line', depth: 1, tip: 'RF line results and frequency sweep', tag: wb.result?.rf ? resTag : { text: 'empty', kind: 'muted' } });
		out.push({ id: 'results.sweep', label: 'Sweep Plot', depth: 1, tip: 'Sweep results with paper points', tag: !wb.sweepRows.length ? { text: 'empty', kind: 'muted' } : wb.sweepStale ? { text: 'stale', kind: 'warn' } : undefined });
		return out;
	});

	function selectionOf(id: string): { regions: string[]; electrodes: string[] } | null {
		const g = wb.geometry;
		if (!g) return null;
		if (id.startsWith('material:')) {
			const m = id.slice(9);
			return { regions: g.regions.filter((r) => r.material === m).map((r) => r.name), electrodes: g.electrodes.filter((e) => e.material === m).map((e) => e.name) };
		}
		if (id.startsWith('region:')) return { regions: [g.regions[Number(id.slice(7))]?.name], electrodes: [] };
		if (id.startsWith('electrode:')) return { regions: [], electrodes: [g.electrodes[Number(id.slice(10))]?.name] };
		return null;
	}

	function select(n: Node) {
		wb.node = n.id;
		wb.settingsTab = 'settings';
		wb.highlight = selectionOf(n.id);
		if (n.id.startsWith('results.field:')) {
			const q = n.id.slice(14) as Quantity;
			if (q === 'opt_int' || q.startsWith('pk:') ? opticalSets(wb.fields).length : wb.fields?.es) wb.quantity = q;
		} else if (n.id === 'mesh' && (wb.mesh || wb.fields?.es)) wb.quantity = 'mesh';
	}

	function onKey(e: KeyboardEvent) {
		const i = nodes.findIndex((n) => n.id === wb.node);
		let j = i;
		if (e.key === 'ArrowDown') j = Math.min(nodes.length - 1, i + 1);
		else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
		else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && nodes[i]?.group) {
			collapsed[nodes[i].group!] = e.key === 'ArrowLeft';
			e.preventDefault();
			return;
		} else return;
		e.preventDefault();
		select(nodes[j]);
		document.getElementById(`tree-${nodes[j].id}`)?.focus();
	}
</script>

<div class="tree" role="tree" aria-label="Model Builder" tabindex="-1" onkeydown={onKey}>
	<div class="hdr">Model Builder</div>
	{#each nodes as n (n.id)}
		<div class="row" style:padding-left="{6 + n.depth * 14}px" class:sel={wb.node === n.id} class:root={n.depth === 0}>
			{#if n.group}
				<button class="tw" aria-label={collapsed[n.group] ? `Expand ${n.label}` : `Collapse ${n.label}`} onclick={() => (collapsed[n.group!] = !collapsed[n.group!])}>{collapsed[n.group] ? '+' : '-'}</button>
			{:else}<span class="tw"></span>{/if}
			<button id="tree-{n.id}" class="item" role="treeitem" aria-selected={wb.node === n.id} aria-level={n.depth + 1} title={n.tip} data-node={n.id} onclick={() => select(n)} onpointerenter={() => (wb.hoverHighlight = selectionOf(n.id))} onpointerleave={() => (wb.hoverHighlight = null)} tabindex={wb.node === n.id ? 0 : -1}>
				<span class="lbl">{n.label}</span>
				{#if n.tag}<span class="tag {n.tag.kind}">{n.tag.text}</span>{/if}
			</button>
		</div>
	{/each}
</div>

<style>
	.tree { height: 100%; overflow: auto; background: var(--surface); padding-bottom: 8px; }
	.hdr { padding: 6px 8px; color: var(--ink-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 1; }
	.row { display: flex; align-items: center; min-width: 0; }
	.row.sel { background: var(--sel); }
	.row:hover { background: var(--hover); }
	.tw { width: 14px; height: 20px; flex: none; padding: 0; border: 0; background: none; color: var(--ink-3); font: 11px var(--mono); border-radius: 0; }
	.item { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; height: 22px; padding: 0 6px 0 2px; border: 0; background: none; text-align: left; color: var(--ink-2); border-radius: 0; }
	.item:hover { background: none; }
	.root .item { color: var(--ink); font-weight: 600; }
	.sel .item { color: var(--ink); }
	.lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tag { margin-left: auto; font-size: 10px; padding: 0 3px; border: 1px solid currentColor; border-radius: 0; line-height: 13px; flex: none; }
	.tag.warn { color: var(--warn); }
	.tag.crit { color: var(--crit); }
	.tag.muted { color: var(--ink-3); border-color: var(--border); }
</style>
