<script lang="ts">
	import { tick } from 'svelte';
	import type { Workbench } from './workbench.svelte';
	import { DERIVED_LABEL, FEATURE_LABEL, FEATURES_1D, FEATURES_2D, type FeatureType } from './results.svelte';
	import type { DerivedKind } from './post/contract';
	import Icon from './Icon.svelte';

	let { wb }: { wb: Workbench } = $props();
	const R = $derived(wb.results);

	interface Node {
		id: string;
		label: string;
		depth: number;
		tip?: string;
		tag?: { text: string; kind: 'warn' | 'muted' | 'crit' };
		group?: string;
		/** Context actions available (right-click or the + button). */
		menu?: boolean;
		renamable?: boolean;
		hidden?: boolean;
	}

	let collapsed = $state<Record<string, boolean>>({ materials: false, geometry: true });
	let renaming = $state<string | null>(null);
	let renameText = $state('');
	let menu = $state<{ id: string; x: number; y: number } | null>(null);

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
		// Results in COMSOL order: Datasets, Selections, Derived Values, Tables, Plot Groups, Export.
		out.push({ id: 'results', label: 'Results', depth: 0, tip: 'Datasets, selections, derived values, tables, plot groups, export', menu: true, tag: resTag });
		out.push({ id: 'res.datasets', label: 'Datasets', depth: 1, group: 'datasets', menu: true, tip: 'Solutions of the last Compute, cut lines, cut points, parametric sweep' });
		if (!collapsed.datasets) {
			for (const d of R.datasets) out.push({ id: `ds:${d.id}`, label: d.label, depth: 2, tip: `${d.kind} dataset${d.nModes ? `, ${d.nModes} mode(s), mode ${R.mode(d.id)} shown` : ''}`, tag: wb.stale ? { text: 'stale', kind: 'warn' } : undefined });
			for (const c of R.cutLines) out.push({ id: `ds:${c.id}`, label: c.name, depth: 2, tip: `Cut Line 2D on ${R.dsLabel(c.source)}`, menu: true, renamable: true });
			for (const c of R.cutPoints) out.push({ id: `ds:${c.id}`, label: c.name, depth: 2, tip: `Cut Point 2D on ${R.dsLabel(c.source)}`, menu: true, renamable: true });
			if (wb.sweepRows.length) out.push({ id: 'results.sweep', label: 'Parametric Sweep', depth: 2, tip: 'Sweep points: global values per point (table, plot, paper points)', tag: wb.sweepStale ? { text: 'stale', kind: 'warn' } : undefined });
		}
		out.push({ id: 'res.selections', label: 'Selections', depth: 1, group: 'selections', menu: true, tip: 'Named domain selections (select tool: click regions in the graphics)' });
		if (!collapsed.selections) for (const s of R.selections) out.push({ id: `sel:${s.id}`, label: s.name, depth: 2, tip: `${s.regions.length} domain(s): ${s.regions.join(', ')}`, menu: true, renamable: true, tag: s.regions.length ? undefined : { text: 'empty', kind: 'muted' } });
		out.push({ id: 'results.derived', label: 'Derived Values', depth: 1, group: 'derived', menu: true, tip: "Section values (C', Z0, n_eff, VpiL) and user evaluations into tables", tag: resTag });
		if (!collapsed.derived) {
			out.push({ id: 'res.modes', label: 'Mode Analysis', depth: 2, tip: 'Effective mode index table per optical dataset; a row sets the mode of every plot of that dataset', tag: R.datasets.some((d) => d.nModes) ? undefined : { text: 'empty', kind: 'muted' } });
			out.push({ id: 'res.eo', label: 'EO Coupling', depth: 2, tip: 'Per-arm dn/V, push-pull balance, VpiL, conventional overlap, breakdown tables', tag: wb.result?.eo ? resTag : { text: 'empty', kind: 'muted' } });
			out.push({ id: 'results.targets', label: 'Targets', depth: 2, tip: 'Paper targets and evaluation status', tag: resTag });
			for (const d of R.derived) out.push({ id: `dv:${d.id}`, label: d.name, depth: 2, tip: `${DERIVED_LABEL[d.kind]}: ${d.expr || 'no expression'}`, menu: true, renamable: true });
		}
		out.push({ id: 'res.tables', label: 'Tables', depth: 1, group: 'tables', menu: true, tip: 'Tables filled by Derived Values (CSV export, Table Graph)' });
		if (!collapsed.tables) {
			for (const t of R.tables) out.push({ id: `tbl:${t.id}`, label: t.name, depth: 2, tip: `${t.rows.length} row(s)`, menu: true, renamable: true });
			out.push({ id: 'results.rf', label: 'RF Line', depth: 2, tip: 'RF line results and frequency sweep table', tag: wb.result?.rf ? resTag : { text: 'empty', kind: 'muted' } });
		}
		for (const pg of R.groups) {
			out.push({ id: `pg:${pg.id}`, label: pg.name, depth: 1, group: `pg:${pg.id}`, menu: true, renamable: true, tip: `${pg.kind === '2d' ? '2D' : '1D'} Plot Group, ${pg.features.length} feature(s)${pg.dataset ? `, dataset ${R.dsLabel(pg.dataset)}` : ''}; click to plot` });
			if (!collapsed[`pg:${pg.id}`]) for (const f of pg.features) out.push({ id: `pf:${pg.id}:${f.id}`, label: f.name, depth: 2, menu: true, renamable: true, hidden: !f.visible, tip: `${FEATURE_LABEL[f.type]}: ${f.type === 'arrow' ? `${f.xExpr}, ${f.yExpr}` : f.type === 'global' ? f.exprs : f.expr}${f.visible ? '' : ' (hidden)'}` });
		}
		out.push({ id: 'res.export', label: 'Export', depth: 1, tip: 'Data (plotted values), tables and images' });
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
		if (id.startsWith('sel:')) return { regions: R.selections.find((s) => s.id === id.slice(4))?.regions ?? [], electrodes: [] };
		return null;
	}

	function select(n: Node) {
		wb.node = n.id;
		wb.settingsTab = 'settings';
		wb.highlight = n.id.startsWith('sel:') ? null : selectionOf(n.id);
		if (n.id.startsWith('tbl:')) R.lastTable = n.id.slice(4);
		// COMSOL: selecting a plot group (or one of its features) plots it; Geometry/Mesh nodes show their own views.
		if (n.id.startsWith('pg:')) wb.view = n.id.slice(3);
		else if (n.id.startsWith('pf:')) wb.view = n.id.split(':')[1];
		else if (n.id === 'mesh' && (wb.mesh || wb.meshes.es)) wb.view = 'mesh';
		else if (n.id === 'geometry' || n.id.startsWith('region:') || n.id.startsWith('electrode:')) wb.view = 'geometry';
	}

	function onKey(e: KeyboardEvent) {
		if (renaming) return;
		const i = nodes.findIndex((n) => n.id === wb.node);
		let j = i;
		if (e.key === 'ArrowDown') j = Math.min(nodes.length - 1, i + 1);
		else if (e.key === 'ArrowUp') j = Math.max(0, i - 1);
		else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && nodes[i]?.group) {
			collapsed[nodes[i].group!] = e.key === 'ArrowLeft';
			e.preventDefault();
			return;
		} else if (e.key === 'F2' && nodes[i]?.renamable) {
			startRename(nodes[i]);
			e.preventDefault();
			return;
		} else if (e.key === 'Delete' && nodes[i]?.renamable) {
			act(nodes[i].id, 'delete');
			e.preventDefault();
			return;
		} else return;
		e.preventDefault();
		select(nodes[j]);
		document.getElementById(`tree-${nodes[j].id}`)?.focus();
	}

	// ---- context actions ----
	interface Action { key: string; label: string; tip?: string }
	function actions(id: string): Action[] {
		const has2d = R.datasets.length > 0;
		if (id === 'results') return [{ key: 'pg2d', label: '2D Plot Group' }, { key: 'pg1d', label: '1D Plot Group' }];
		if (id === 'res.datasets') return [{ key: 'tool:cutline', label: 'Cut Line 2D', tip: 'Drag on the graphics to draw it' }, { key: 'tool:cutpoint', label: 'Cut Point 2D', tip: 'Click on the graphics to place it' }];
		if (id === 'res.selections') return [{ key: 'newsel', label: 'Selection', tip: 'New empty selection; then click domains with the Select tool' }];
		if (id === 'results.derived') return (Object.keys(DERIVED_LABEL) as DerivedKind[]).map((k) => ({ key: `dv:${k}`, label: DERIVED_LABEL[k] }));
		if (id === 'res.tables') return [{ key: 'newtable', label: 'Table' }];
		if (id.startsWith('pg:')) {
			const g = R.group(id.slice(3));
			if (!g) return [];
			const types = g.kind === '2d' ? FEATURES_2D : FEATURES_1D;
			return [...types.map((t) => ({ key: `add:${t}`, label: FEATURE_LABEL[t] })), { key: 'dup', label: 'Duplicate' }, { key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete' }];
		}
		if (id.startsWith('pf:')) {
			const [, gid, fid] = id.split(':');
			const f = R.feature(gid, fid);
			return [{ key: 'toggle', label: f?.visible ? 'Disable' : 'Enable' }, { key: 'dup', label: 'Duplicate' }, { key: 'up', label: 'Move up' }, { key: 'down', label: 'Move down' }, { key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete' }];
		}
		if (id.startsWith('dv:')) return [{ key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete' }];
		if (id.startsWith('tbl:')) return [{ key: 'clear', label: 'Clear rows' }, { key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete' }];
		if (id.startsWith('sel:') || id.startsWith('ds:')) return [{ key: 'rename', label: 'Rename' }, { key: 'delete', label: 'Delete' }];
		void has2d;
		return [];
	}

	function goto(id: string) {
		wb.node = id;
		wb.settingsTab = 'settings';
		const n = nodes.find((x) => x.id === id);
		if (n) select(n);
	}

	function act(id: string, key: string) {
		menu = null;
		const what = actions(id).find((a) => a.key === key)?.label ?? key;
		if (key !== 'rename') wb.addLog(`Results: ${what} (${nodes.find((n) => n.id === id)?.label ?? id})`);
		if (key === 'rename') {
			const n = nodes.find((x) => x.id === id);
			if (n) startRename(n);
			return;
		}
		if (key === 'pg2d' || key === 'pg1d') {
			const g = R.addGroup(key === 'pg2d' ? '2d' : '1d');
			collapsed[`pg:${g.id}`] = false;
			goto(`pg:${g.id}`);
			return;
		}
		if (key.startsWith('tool:')) {
			wb.tool = key.slice(5) as typeof wb.tool;
			wb.addLog(key === 'tool:cutline' ? 'Cut Line 2D: drag on the graphics' : 'Cut Point 2D: click on the graphics');
			return;
		}
		if (key === 'newsel') {
			const s = R.addSelection();
			collapsed.selections = false;
			wb.tool = 'select';
			goto(`sel:${s.id}`);
			return;
		}
		if (key.startsWith('dv:')) {
			const k = key.slice(3) as DerivedKind;
			const target = k.startsWith('surface') ? (R.selections[0]?.id ?? '') : k.startsWith('line') ? (R.cutLines[0]?.id ?? '') : k === 'point' ? (R.cutPoints[0]?.id ?? '') : '';
			const d = R.addDerived(k, { target, dataset: k.startsWith('line') ? (R.cutLines[0]?.source ?? R.datasets[0]?.id ?? '') : k === 'point' ? (R.cutPoints[0]?.source ?? R.datasets[0]?.id ?? '') : (R.datasets[0]?.id ?? '') });
			collapsed.derived = false;
			goto(`dv:${d.id}`);
			return;
		}
		if (key === 'newtable') {
			const t = R.addTable();
			collapsed.tables = false;
			goto(`tbl:${t.id}`);
			return;
		}
		if (id.startsWith('pg:')) {
			const gid = id.slice(3);
			if (key.startsWith('add:')) {
				const t = key.slice(4) as FeatureType;
				const g = R.group(gid);
				const over = t === 'arrow' ? { xExpr: 'es.Ex', yExpr: 'es.Ey' } : t === 'linegraph' ? { dataset: R.cutLines[0]?.id ?? '' } : t === 'global' ? { dataset: 'sweep', exprs: 'VpiL', unit: 'V*cm' } : t === 'tablegraph' ? { tableId: R.tables[0]?.id ?? '' } : {};
				const f = R.addFeature(gid, t, g?.kind === '2d' && t === 'arrow' && !wb.has(g.dataset, 'es.Ex') ? {} : over);
				collapsed[`pg:${gid}`] = false;
				if (f) goto(`pf:${gid}:${f.id}`);
			} else if (key === 'dup') {
				const g = R.duplicateGroup(gid);
				if (g) goto(`pg:${g.id}`);
			} else if (key === 'delete') {
				R.deleteGroup(gid);
				if (wb.view === gid) wb.view = R.groups.find((g) => g.kind === '2d')?.id ?? 'geometry';
				goto('results');
			}
			return;
		}
		if (id.startsWith('pf:')) {
			const [, gid, fid] = id.split(':');
			if (key === 'toggle') {
				const f = R.feature(gid, fid);
				if (f) f.visible = !f.visible;
			} else if (key === 'dup') {
				const f = R.duplicateFeature(gid, fid);
				if (f) goto(`pf:${gid}:${f.id}`);
			} else if (key === 'up' || key === 'down') R.moveFeature(gid, fid, key === 'up' ? -1 : 1);
			else if (key === 'delete') {
				R.deleteFeature(gid, fid);
				goto(`pg:${gid}`);
			}
			return;
		}
		if (key === 'clear' && id.startsWith('tbl:')) {
			const t = R.tables.find((x) => x.id === id.slice(4));
			if (t) t.rows = [];
			return;
		}
		if (key === 'delete') {
			const [kind, rid] = [id.split(':')[0], id.slice(id.indexOf(':') + 1)];
			if (kind === 'sel') R.remove('selection', rid);
			else if (kind === 'dv') R.remove('derived', rid);
			else if (kind === 'tbl') R.remove('table', rid);
			else if (kind === 'ds') R.remove(rid.startsWith('cl') ? 'cutline' : 'cutpoint', rid);
			goto('results');
		}
	}

	function nameOf(id: string): { get: () => string; set: (s: string) => void } | null {
		const ref = <T extends { name: string }>(o: T | null | undefined) => (o ? { get: () => o.name, set: (s: string) => (o.name = s) } : null);
		if (id.startsWith('pg:')) return ref(R.group(id.slice(3)));
		if (id.startsWith('pf:')) {
			const [, g, f] = id.split(':');
			return ref(R.feature(g, f));
		}
		if (id.startsWith('sel:')) return ref(R.selections.find((s) => s.id === id.slice(4)));
		if (id.startsWith('dv:')) return ref(R.derived.find((s) => s.id === id.slice(3)));
		if (id.startsWith('tbl:')) return ref(R.tables.find((s) => s.id === id.slice(4)));
		if (id.startsWith('ds:')) return ref(R.cutLines.find((s) => s.id === id.slice(3)) ?? R.cutPoints.find((s) => s.id === id.slice(3)));
		return null;
	}
	async function startRename(n: Node) {
		const r = nameOf(n.id);
		if (!r) return;
		renaming = n.id;
		renameText = r.get();
		await tick();
		const el = document.getElementById(`rename-${n.id}`) as HTMLInputElement | null;
		el?.focus();
		el?.select();
	}
	function commitRename() {
		if (!renaming) return;
		const r = nameOf(renaming);
		const t = renameText.trim();
		if (r && t && t !== r.get()) {
			wb.addLog(`Results: renamed ${r.get()} to ${t}`);
			r.set(t);
		}
		renaming = null;
	}

	function openMenu(e: MouseEvent, n: Node) {
		if (!n.menu || !actions(n.id).length) return;
		e.preventDefault();
		select(n);
		menu = { id: n.id, x: e.clientX, y: e.clientY };
	}
</script>

<svelte:window onpointerdown={(e) => { if (menu && !(e.target as HTMLElement).closest('.menu')) menu = null; }} onkeydown={(e) => { if (e.key === 'Escape') menu = null; }} />

<div class="tree" role="tree" aria-label="Model Builder" tabindex="-1" onkeydown={onKey}>
	<div class="hdr"><span>Model Builder</span><span class="grow"></span>
		<button class="ub" aria-label="Undo" data-tip="Undo the last Results edit (Ctrl/Cmd+Z)" disabled={!R.undoStack.length} onclick={() => { if (R.undo()) wb.addLog('Undo'); }}><Icon name="undo" /></button>
		<button class="ub" aria-label="Redo" data-tip="Redo (Shift+Ctrl/Cmd+Z)" disabled={!R.redoStack.length} onclick={() => { if (R.redo()) wb.addLog('Redo'); }}><Icon name="redo" /></button>
	</div>
	{#each nodes as n (n.id)}
		<div class="row" style:padding-left="{6 + n.depth * 14}px" class:sel={wb.node === n.id} class:root={n.depth === 0} class:off={n.hidden} oncontextmenu={(e) => openMenu(e, n)} role="none">
			{#if n.group}
				<button class="tw" aria-label={collapsed[n.group] ? `Expand ${n.label}` : `Collapse ${n.label}`} onclick={() => (collapsed[n.group!] = !collapsed[n.group!])}>{collapsed[n.group] ? '+' : '-'}</button>
			{:else}<span class="tw"></span>{/if}
			{#if renaming === n.id}
				<input id="rename-{n.id}" class="ren" aria-label="Rename {n.label}" bind:value={renameText} onkeydown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') renaming = null; e.stopPropagation(); }} onblur={commitRename} />
			{:else}
				<button id="tree-{n.id}" class="item" role="treeitem" aria-selected={wb.node === n.id} aria-level={n.depth + 1} data-tip={n.tip} data-node={n.id} onclick={() => select(n)} ondblclick={() => n.renamable && startRename(n)} onpointerenter={() => (wb.hoverHighlight = selectionOf(n.id))} onpointerleave={() => (wb.hoverHighlight = null)} tabindex={wb.node === n.id ? 0 : -1}>
					<span class="lbl">{n.label}</span>
					{#if n.tag}<span class="tag {n.tag.kind}">{n.tag.text}</span>{/if}
				</button>
				{#if n.menu && actions(n.id).length}<button class="plus" aria-label="Actions for {n.label}" data-tip="Add, duplicate, rename, delete (or right-click)" onclick={(e) => { select(n); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); menu = { id: n.id, x: r.left, y: r.bottom }; }}>{n.id.startsWith('pf:') || n.id.startsWith('sel:') || n.id.startsWith('dv:') || n.id.startsWith('tbl:') || (n.id.startsWith('ds:') && n.renamable) ? '...' : '+'}</button>{/if}
			{/if}
		</div>
	{/each}
</div>
{#if menu}
	<div class="menu" role="menu" style:left="{Math.min(menu.x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - 180)}px" style:top="{menu.y}px">
		{#each actions(menu.id) as a}<button role="menuitem" data-tip={a.tip} data-action={a.key} onclick={() => act(menu!.id, a.key)}>{a.label}</button>{/each}
	</div>
{/if}

<style>
	.tree { height: 100%; overflow: auto; background: var(--surface); padding-bottom: 8px; }
	.hdr { display: flex; align-items: center; gap: 2px; padding: 3px 4px 3px 8px; color: var(--ink-3); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--surface); z-index: 1; }
	.grow { flex: 1; }
	.ub { width: 22px; height: 20px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 0; }
	.ub:disabled { opacity: 0.4; }
	.row { display: flex; align-items: center; min-width: 0; }
	.row.sel { background: var(--sel); }
	.row:hover { background: var(--hover); }
	.row.off .lbl { color: var(--ink-3); text-decoration: line-through; }
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
	.plus { flex: none; width: 20px; height: 18px; padding: 0; margin-right: 4px; border: 1px solid transparent; background: none; color: var(--ink-3); font: 11px var(--mono); border-radius: 0; visibility: hidden; }
	.row:hover .plus, .row.sel .plus { visibility: visible; }
	.plus:hover { border-color: var(--border); color: var(--ink); }
	.ren { flex: 1; min-width: 0; height: 20px; margin-right: 6px; background: var(--bg); color: var(--ink); border: 1px solid var(--accent); padding: 0 4px; border-radius: 0; }
	.menu { position: fixed; z-index: 50; min-width: 160px; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35); border-radius: 0; }
	.menu button { text-align: left; border: 0; border-radius: 0; background: none; height: 24px; padding: 0 10px; color: var(--ink-2); }
	.menu button:hover { background: var(--hover); color: var(--ink); }
	@media (hover: none) { .plus { visibility: visible; } }
</style>
