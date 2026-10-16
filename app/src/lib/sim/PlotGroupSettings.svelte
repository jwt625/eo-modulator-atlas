<script lang="ts">
	// Settings of a plot group (COMSOL 2D/1D Plot Group: Data, Title, Plot Settings) or of one of its features, in COMSOL
	// sections: Data, Expression (with Description), Title, Range (color and data range), Coloring and Style, Quality.
	import type { Workbench } from './workbench.svelte';
	import { FEATURE_LABEL, FEATURES_1D, FEATURES_2D, type Feature, type FeatureType } from './results.svelte';
	import { COLORMAPS, COLORMAP_TIPS } from './colormap';
	import { GLOBAL_VARIABLES } from './post/ui';
	import type { ModeRow, PlotResult, VariableInfo } from './post/contract';
	import { MAX_SUBTRIANGLES, RESOLUTIONS } from '../../../../engine/src/postproc/index.mjs';
	import ExprInput from './ExprInput.svelte';
	import SolutionSelect from './SolutionSelect.svelte';
	import BiasSelect from './BiasSelect.svelte';
	import { biasLabel, biasVariables } from './semi';
	import { oneDSolutions } from './solutions1d';
	import { modesRequest, plotRequest } from './requests';
	import UnitInput from './UnitInput.svelte';
	import { fmt } from '../logic';

	let { wb, gid, fid = null }: { wb: Workbench; gid: string; fid?: string | null } = $props();
	const R = $derived(wb.results);
	const g = $derived(R.group(gid));
	const f = $derived(fid ? R.feature(gid, fid) : null);
	const ds = $derived(f ? f.dataset || g?.dataset || '' : (g?.dataset ?? ''));
	const sol = $derived(g && g.point >= 0 ? `sweep:${g.point}` : undefined);
	const sets = $derived(g && g.point >= 0 ? (wb.points[g.point]?.datasets ?? R.fieldSets).filter((d) => d.kind !== 'rf') : R.fieldSets);
	const modeRows = $derived(R.dataset(ds)?.nModes && (!g || g.point < 0 || wb.points[g.point]?.status === 'ready') ? (wb.cache.get<ModeRow[]>(wb.post, R.gen, modesRequest(ds, g?.point ?? -1))?.data ?? []) : []);

	function add(t: FeatureType) {
		const over: Partial<Feature> = t === 'arrow' ? { xExpr: 'es.Ex', yExpr: 'es.Ey' } : t === 'linegraph' ? { dataset: R.cutLines[0]?.id ?? '' } : t === 'global' ? (wb.semi && !wb.sweepRows.length ? { dataset: 'bias', exprs: 'semi.C', unit: 'pF/mm' } : { dataset: 'sweep', exprs: 'VpiL', unit: 'V*cm' }) : t === 'tablegraph' ? { tableId: R.tables[0]?.id ?? '' } : {};
		const nf = R.addFeature(gid, t, over);
		if (nf) {
			wb.node = `pf:${gid}:${nf.id}`;
			wb.view = gid;
			wb.addLog(`${g?.name}: added ${nf.name}`);
		}
	}
	const sweepVars: VariableInfo[] = $derived.by(() => {
		const gl = wb.sweepRows.find((r) => r.globals)?.globals ?? wb.runGlobals;
		return GLOBAL_VARIABLES.filter((v) => !gl || v.name in gl);
	});
	const rfVars: VariableInfo[] = $derived(wb.vars.rf ?? []);
	/** Semiconductor dataset drawn by the group (its own or a feature's): the group's Bias selects the bias point. */
	const semiDs = $derived(g ? [g.dataset, ...g.features.map((x) => x.dataset)].find((d) => d && R.isSemi(d)) ?? '' : '');
	const RES: [Feature['resolution'], string][] = [['none', 'No refinement'], ['coarse', 'Coarse'], ['normal', 'Normal'], ['fine', 'Fine'], ['finer', 'Finer'], ['extra', 'Extra fine']];
	const tbl = $derived(f?.type === 'tablegraph' ? R.tables.find((t) => t.id === f.tableId) : null);
	const numericCols = $derived(tbl ? tbl.columns.filter((c, i) => tbl.rows.some((r) => typeof r[i] === 'number')) : []);
	const num = (v: string, d: number) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : d);
	/** New expression; a display unit that no longer matches its dimension is cleared (SI shown instead). */
	function setExpr(feat: Feature, v: string, dsId: string) {
		feat.expr = v;
		if (!feat.unit || !wb.post || !v) return;
		wb.post.request({ op: 'check', dataset: dsId, mode: sol ? undefined : R.mode(dsId), expr: v, unit: feat.unit, sol }).catch((e: unknown) => {
			if (e instanceof Error && /^unit "/.test(e.message)) {
				wb.addLog(`${feat.name}: unit ${feat.unit} does not match ${v}; using the SI unit`, 'warn');
				feat.unit = '';
			}
		});
	}
	/** Manual color range: prefilled with the range currently shown. */
	function manualRange(feat: Feature, on: boolean) {
		const cur = wb.ranges[feat.id];
		if (on && cur) {
			feat.range.min = Number(cur.min.toPrecision(4));
			feat.range.max = Number(cur.max.toPrecision(4));
		}
		feat.range.manual = on;
	}
	function manualData(feat: Feature, on: boolean) {
		const cur = wb.ranges[feat.id];
		if (on && cur) {
			feat.dataRange.min = Number(cur.min.toPrecision(4));
			feat.dataRange.max = Number(cur.max.toPrecision(4));
		}
		feat.dataRange.manual = on;
	}
	function setSelection(feat: { name: string; selection: string }, id: string) {
		feat.selection = id;
		wb.addLog(`${feat.name}: selection ${id ? (R.selections.find((s) => s.id === id)?.name ?? id) : 'all domains'}`);
	}
	const logInvalid = (feat: Feature) => feat.range.manual && (feat.range.scale === 'log' || feat.range.scale === 'symlog') && !(feat.range.min > 0 && feat.range.max > feat.range.min);
</script>

{#snippet selectionField(feat: Feature)}
	<label class="f" data-tip="Draw only the domains of this selection (COMSOL Selection); all domains when none">Selection
		<select aria-label="Feature selection" value={feat.selection} onchange={(e) => setSelection(feat, e.currentTarget.value)}>
			<option value="">all domains</option>
			{#each R.selections as s}<option value={s.id}>{s.name} ({s.regions.length})</option>{/each}
		</select>
	</label>
{/snippet}

{#snippet titleFields(feat: Feature)}
	<h4>Title</h4>
	<label class="f" data-tip="This feature's part of the plot group's automatic title">Title type
		<select value={feat.titleMode} onchange={(e) => (feat.titleMode = e.currentTarget.value as Feature['titleMode'])}><option value="auto">automatic</option><option value="manual">manual</option><option value="none">none</option></select>
	</label>
	{#if feat.titleMode === 'manual'}<label class="f">Title <input type="text" bind:value={feat.title} /></label>{/if}
{/snippet}

{#snippet rangeFields(feat: Feature)}
	<h4>Range</h4>
	<label class="f" data-tip="linear; symmetric: +-max|v| around zero; log: log10 |v|; log, signed: sign(v) log10 |v| (negative decades below the centre, positive above; |v| below the range min at the centre; range = |v| range)">Scale
		<select value={feat.range.scale} onchange={(e) => (feat.range.scale = e.currentTarget.value as Feature['range']['scale'])}><option value="linear">linear</option><option value="symmetric">linear symmetric</option><option value="log">log |value|</option><option value="symlog">log, signed</option></select>
	</label>
	{@const optDs = R.datasets.find((d) => d.kind === 'opt')}
	{@const mexpr = feat.modeExpr || (optDs ? R.intensityExpr(optDs.id, (d, v) => wb.has(d, v)) : '')}
	{#if mexpr && wb.has(feat.dataset || g?.dataset || '', mexpr.replace(/\^2$/, ''))}
		<label class="f" data-tip="Automatic color range from all displayed values, or from the optical-mode region only: lattice points where {mexpr} >= e^-2 of its peak (values outside are drawn at the end colours)">Automatic range
			<select aria-label="Automatic range from" value={feat.rangeFrom ?? 'data'} onchange={(e) => { feat.rangeFrom = e.currentTarget.value as 'data' | 'mode'; if (feat.rangeFrom === 'mode') feat.modeExpr = mexpr; }}><option value="data">all values</option><option value="mode">optical-mode region</option></select>
		</label>
	{/if}
	<label class="f" data-tip="Manual color range (prefilled with the range shown); off = range of the displayed values"><span>Manual color range</span><input type="checkbox" aria-label="Manual color range" checked={feat.range.manual} onchange={(e) => manualRange(feat, e.currentTarget.checked)} /></label>
	{#if feat.range.manual}
		<label class="f">min <input type="number" step="any" aria-label="Color range min" value={feat.range.min} onchange={(e) => (feat.range.min = num(e.currentTarget.value, feat.range.min))} /></label>
		<label class="f">max <input type="number" step="any" aria-label="Color range max" value={feat.range.max} onchange={(e) => (feat.range.max = num(e.currentTarget.value, feat.range.max))} /></label>
		{#if logInvalid(feat)}<p class="warn small" data-range-note>Log scales need 0 &lt; min &lt; max (|value| range); the automatic range is used.</p>{/if}
	{/if}
	<label class="f" data-tip="Values outside the data range are not drawn (COMSOL manual data range)"><span>Manual data range</span><input type="checkbox" aria-label="Manual data range" checked={feat.dataRange.manual} onchange={(e) => manualData(feat, e.currentTarget.checked)} /></label>
	{#if feat.dataRange.manual}
		<label class="f">min <input type="number" step="any" aria-label="Data range min" value={feat.dataRange.min} onchange={(e) => (feat.dataRange.min = num(e.currentTarget.value, feat.dataRange.min))} /></label>
		<label class="f">max <input type="number" step="any" aria-label="Data range max" value={feat.dataRange.max} onchange={(e) => (feat.dataRange.max = num(e.currentTarget.value, feat.dataRange.max))} /></label>
	{/if}
{/snippet}

{#snippet colorFields(feat: Feature)}
	<label class="f" data-tip={COLORMAP_TIPS[feat.table]}>Color table
		<select aria-label="Color table" value={feat.table} onchange={(e) => (feat.table = e.currentTarget.value as Feature['table'])}>{#each COLORMAPS as c}<option value={c}>{c}</option>{/each}</select>
	</label>
	<label class="f"><span>Reverse</span><input type="checkbox" bind:checked={feat.reverse} /></label>
	<label class="f" data-tip="Color legend in the graphics (right gutter)"><span>Color legend</span><input type="checkbox" bind:checked={feat.legend} /></label>
{/snippet}

{#snippet qualityFields(feat: Feature, smoothing = true)}
	{@const shown = g ? wb.cache.peek<PlotResult>(feat.type === 'arrow' ? plotRequest(R, g, feat, feat.xExpr, '') : plotRequest(R, g, feat, feat.expr, feat.unit))?.data : null}
	<h4>Quality</h4>
	<label class="f" data-tip={`Elements split into r x r sub-triangles; every sub-triangle corner is evaluated exactly from the element's own basis and shaded linearly between (r: ${RES.map(([k, l]) => `${l} ${RESOLUTIONS[k]}`).join(', ')}; at most ${(MAX_SUBTRIANGLES / 1e6).toFixed(1)}M sub-triangles)`}>Resolution
		<select aria-label="Resolution" value={feat.resolution} onchange={(e) => (feat.resolution = e.currentTarget.value as Feature['resolution'])}>{#each RES as [k, l]}<option value={k}>{l}</option>{/each}</select>
	</label>
	{#if smoothing}
		<label class="f" data-tip="Coincident element-side values (element vertices and edges) replaced by their mean: None draws every element discontinuity; Inside material domains keeps the jumps at material interfaces; Everywhere averages across them too. The color range follows the smoothed (drawn) values; the probe shows the exact value.">Smoothing
			<select aria-label="Smoothing" value={feat.smoothing} onchange={(e) => (feat.smoothing = e.currentTarget.value as Feature['smoothing'])}><option value="none">None</option><option value="material">Inside material domains</option><option value="everywhere">Everywhere</option></select>
		</label>
	{:else}
		<p class="muted small" data-tip="Markers search the unsmoothed element-local values at the lattice points of the resolution and show the exact value at the marker (as the probe)">Smoothing: None (exact extrema)</p>
	{/if}
	{#if shown?.r && shown.requestedR && shown.r < shown.requestedR}<p class="warn small" data-resolution-capped={shown.r}>Resolution lowered to r = {shown.r} (cap {(MAX_SUBTRIANGLES / 1e6).toFixed(1)}M sub-triangles).</p>{/if}
{/snippet}

{#if !g}
	<p class="muted">Plot group not found.</p>
{:else if !f}
	<label class="f">Label <input type="text" value={g.name} onchange={(e) => (g.name = e.currentTarget.value || g.name)} aria-label="Plot group label" /></label>
	{#if g.kind === '2d'}
		<h4>Data</h4>
		<label class="f" data-tip="Default dataset of the features (each feature can set its own)">Dataset
			<select aria-label="Plot group dataset" value={g.dataset} onchange={(e) => (g.dataset = e.currentTarget.value)}>
				{#if !sets.length}<option value="">no solution</option>{/if}
				{#each sets as d}<option value={d.id}>{d.label}</option>{/each}
			</select>
		</label>
		<SolutionSelect {wb} value={g.point} onchange={(p) => { g.point = p; wb.addLog(`${g.name}: solution ${wb.solutionLabel(p)}`); }} />
		{#if semiDs}<BiasSelect {wb} dataset={semiDs} value={g.bias} onchange={(b) => { g.bias = b; wb.addLog(`${g.name}: bias ${biasLabel(wb.semi, R.biasIndex(semiDs, b))}`); }} />{/if}
		{#if R.dataset(g.dataset)?.nModes && modeRows.length}
			{@const key = g.point >= 0 ? `sweep:${g.point}|${g.dataset}` : g.dataset}
			<label class="f" data-tip="Mode of this dataset in every plot group showing this same solution (same as the Mode Analysis table row)">Mode
				<select aria-label="Plot group mode" value={String(R.modeOf[key] ?? modeRows.find((m) => m.selected)?.k ?? 0)} onchange={(e) => (R.modeOf = { ...R.modeOf, [key]: Number(e.currentTarget.value) })}>
					{#each modeRows as m}<option value={String(m.k)}>{m.label ?? `k=${m.k}`}, n_eff {fmt(m.neff, 6)}</option>{/each}
				</select>
			</label>
		{/if}
	{:else}
		{@const so = oneDSolutions(wb, g)}
		<h4>Data</h4>
		{#if so.hasRf}<SolutionSelect {wb} value={g.point} onchange={(p) => { g.point = p; wb.addLog(`${g.name}: solution ${wb.solutionLabel(p)}`); }} label="Parameter value (RF features)" />{/if}
		<p class="sol small" data-solution-label={so.labels.join('; ') || 'none'}>Solution: {so.labels.join('; ') || 'none (no features)'}</p>
		<p class="muted small">Line Graphs use their cut line's solution (set on the cut line), Global features on the RF frequency sweep this group's Parameter value, Global features on the parametric sweep all points, Table Graphs the table rows.</p>
	{/if}
	<h4>Title</h4>
	<label class="f" data-tip="automatic: dataset, mode and each feature's expression and unit">Title type
		<select value={g.titleMode} onchange={(e) => (g.titleMode = e.currentTarget.value as typeof g.titleMode)}><option value="auto">automatic</option><option value="custom">manual</option><option value="none">none</option></select>
	</label>
	{#if g.titleMode === 'custom'}<label class="f">Title <input type="text" bind:value={g.title} /></label>{/if}
	{#if g.kind === '2d'}
		<h4>Plot settings</h4>
		<label class="f" data-tip="Region and electrode outlines of the solved geometry"><span>Dataset edges</span><input type="checkbox" bind:checked={g.edges} /></label>
	{/if}
	<h4>Plot features (drawn in order)</h4>
	<table class="grid"><tbody>
		{#each g.features as feat, i (feat.id)}
			<tr>
				<td><input type="checkbox" checked={feat.visible} onchange={(e) => (feat.visible = e.currentTarget.checked)} aria-label="Show {feat.name}" data-tip="Visible" /></td>
				<td><button class="link" onclick={() => (wb.node = `pf:${gid}:${feat.id}`)}>{feat.name}</button></td>
				<td class="mono small muted">{feat.type === 'arrow' ? `${feat.xExpr}, ${feat.yExpr}` : feat.type === 'global' ? feat.exprs : feat.expr}</td>
				<td class="acts"><button data-tip="Move up" disabled={i === 0} onclick={() => R.moveFeature(gid, feat.id, -1)}>Up</button><button data-tip="Delete" onclick={() => { R.deleteFeature(gid, feat.id); wb.addLog(`${g.name}: deleted ${feat.name}`); }}>Del</button></td>
			</tr>
		{/each}
	</tbody></table>
	<div class="adds">
		{#each g.kind === '2d' ? FEATURES_2D : FEATURES_1D as t}<button onclick={() => add(t)} data-tip="Add a {FEATURE_LABEL[t]} feature">+ {FEATURE_LABEL[t]}</button>{/each}
	</div>
	<div class="adds"><button class="on" onclick={() => (wb.view = gid)}>Plot</button><button onclick={() => { const c = R.duplicateGroup(gid); if (c) { wb.node = `pg:${c.id}`; wb.addLog(`Duplicated ${g.name} as ${c.name}`); } }}>Duplicate</button><button onclick={() => { wb.addLog(`Deleted ${g.name}`); R.deleteGroup(gid); wb.node = 'results'; }}>Delete</button></div>
{:else}
	<label class="f">Label <input type="text" value={f.name} onchange={(e) => (f.name = e.currentTarget.value || f.name)} aria-label="Feature label" /></label>
	<label class="f"><span>Visible</span><input type="checkbox" bind:checked={f.visible} /></label>
	{#if g.kind === '2d'}
		<h4>Data</h4>
		<label class="f" data-tip="From parent = the plot group's dataset; features of different datasets layer on the same geometry">Dataset
			<select aria-label="Feature dataset" value={f.dataset} onchange={(e) => (f.dataset = e.currentTarget.value)}>
				<option value="">from parent ({R.dsLabel(g.dataset)})</option>
				{#each sets as d}<option value={d.id}>{d.label}</option>{/each}
			</select>
		</label>
		{#if R.dataset(ds)?.nModes}{@const mk = R.modeFor(ds, sol) ?? modeRows.find((m) => m.selected)?.k}<p class="muted small">Mode {modeRows.find((m) => m.k === mk)?.label ?? `k=${mk ?? 0}`} in {wb.solutionLabel(g.point)} (plot group Data, or Mode Analysis for this solution).</p>{/if}
		{#if R.isSemi(ds)}<p class="muted small" data-feature-bias={R.biasIndex(ds, g.bias)}>Bias {biasLabel(wb.semi, R.biasIndex(ds, g.bias))} (plot group Data).</p>{/if}
	{/if}
	{#if f.type === 'surface' || f.type === 'contour' || f.type === 'maxmin'}
		{@render selectionField(f)}
		<h4>Expression</h4>
		<div class="f"><span>Expression</span><ExprInput {wb} dataset={ds} {sol} value={f.expr} unit={f.unit} label="Expression" onchange={(v) => setExpr(f, v, ds)} /></div>
		<div class="f"><span>Unit</span><UnitInput {wb} dataset={ds} {sol} expr={f.expr} value={f.unit} onchange={(v) => (f.unit = v)} /></div>
		<label class="f" data-tip="Shown in titles and legends instead of the expression">Description <input type="text" aria-label="Description" bind:value={f.description} /></label>
		{@render titleFields(f)}
	{/if}
	{#if f.type === 'surface'}
		{@render rangeFields(f)}
		<h4>Coloring and style</h4>
		{@render colorFields(f)}
		{@render qualityFields(f)}
	{:else if f.type === 'contour'}
		<h4>Levels</h4>
		<label class="f">Entry method <select value={f.levelsMode} onchange={(e) => (f.levelsMode = e.currentTarget.value as Feature['levelsMode'])}><option value="count">number of levels</option><option value="list">levels (list)</option></select></label>
		{#if f.levelsMode === 'count'}<label class="f">Levels <input type="number" min="1" max="64" step="1" value={f.count} onchange={(e) => (f.count = Math.max(1, Math.min(64, Math.round(num(e.currentTarget.value, f.count)))))} /></label>
		{:else}<label class="f" data-tip="Values in the display unit, comma separated (max 64)">Values <input type="text" bind:value={f.list} /></label>{/if}
		{@render rangeFields(f)}
		<h4>Coloring and style</h4>
		<label class="f">Coloring <select value={f.coloring} onchange={(e) => (f.coloring = e.currentTarget.value as Feature['coloring'])}><option value="table">color table</option><option value="uniform">uniform</option></select></label>
		{#if f.coloring === 'uniform'}<label class="f">Color <input type="color" bind:value={f.color} /></label>{:else}{@render colorFields(f)}{/if}
		{@render qualityFields(f)}
	{:else if f.type === 'arrow'}
		{@render selectionField(f)}
		<h4>Expression</h4>
		<div class="f"><span>x component</span><ExprInput {wb} dataset={ds} {sol} value={f.xExpr} label="x component" onchange={(v) => (f.xExpr = v)} /></div>
		<div class="f"><span>y component</span><ExprInput {wb} dataset={ds} {sol} value={f.yExpr} label="y component" onchange={(v) => (f.yExpr = v)} /></div>
		<label class="f">Description <input type="text" bind:value={f.description} /></label>
		{@render titleFields(f)}
		<h4>Arrow positioning</h4>
		<label class="f" data-tip="Grid over the visible view (re-gridded on pan and zoom), the dataset bounding box, or the bounding box of the selection">Placement
			<select aria-label="Arrow placement" value={f.placement} onchange={(e) => (f.placement = e.currentTarget.value as Feature['placement'])}><option value="view">grid in view</option><option value="dataset">grid over dataset</option><option value="selection">grid over selection</option></select>
		</label>
		<label class="f">x grid points <input type="number" min="2" max="200" step="1" value={f.gridX} onchange={(e) => (f.gridX = Math.max(2, Math.min(200, Math.round(num(e.currentTarget.value, f.gridX)))))} /></label>
		<label class="f">y grid points <input type="number" min="2" max="200" step="1" value={f.gridY} onchange={(e) => (f.gridY = Math.max(2, Math.min(200, Math.round(num(e.currentTarget.value, f.gridY)))))} /></label>
		<h4>Coloring and style</h4>
		<label class="f" data-tip="proportional: longest arrow = one grid cell x scale; normalized: equal length; logarithmic: ln(|v|/max), range 100">Arrow length <select value={f.lengthMode} onchange={(e) => (f.lengthMode = e.currentTarget.value as Feature['lengthMode'])}><option value="proportional">proportional</option><option value="normalized">normalized</option><option value="logarithmic">logarithmic</option></select></label>
		<label class="f">Scale factor <input type="number" min="0" step="any" value={f.scaleFactor} onchange={(e) => (f.scaleFactor = Math.max(0, num(e.currentTarget.value, f.scaleFactor)))} /></label>
		<label class="f"><span>Arrow heads</span><input type="checkbox" bind:checked={f.heads} /></label>
		<label class="f" data-tip="Theme color: the ink color of the current theme (light arrows in dark, dark arrows in light)"><span>Theme color</span><input type="checkbox" aria-label="Arrow theme color" checked={!f.color} onchange={(e) => (f.color = e.currentTarget.checked ? '' : '#ff8c00')} /></label>
		{#if f.color}<label class="f">Color <input type="color" bind:value={f.color} /></label>{/if}
		{@render qualityFields(f)}
	{:else if f.type === 'line'}
		{@render selectionField(f)}
		<p class="muted small">Region boundaries of the solved geometry (all domains, or those of the selection).</p>
		<h4>Coloring and style</h4>
		<label class="f">Color <input type="color" bind:value={f.color} /></label>
	{:else if f.type === 'maxmin'}
		<h4>Display</h4>
		<label class="f">Display <select value={f.show} onchange={(e) => (f.show = e.currentTarget.value as Feature['show'])}><option value="both">max and min</option><option value="max">max</option><option value="min">min</option></select></label>
		{@render qualityFields(f, false)}
	{:else if f.type === 'linegraph'}
		<h4>Data</h4>
		<label class="f" data-tip="Cut Line 2D dataset (Datasets, or the Cut line tool)">Dataset
			<select aria-label="Cut line dataset" value={f.dataset} onchange={(e) => (f.dataset = e.currentTarget.value)}>
				<option value="">choose a cut line</option>
				{#each R.cutLines as c}<option value={c.id}>{c.name} ({R.dsLabel(c.source)})</option>{/each}
			</select>
		</label>
		{@const src = R.cutLines.find((c) => c.id === f.dataset)?.source ?? ''}
		<h4>y-axis data</h4>
		<div class="f"><span>Expression</span><ExprInput {wb} dataset={src} value={f.expr} unit={f.unit} label="y expression" onchange={(v) => setExpr(f, v, src)} /></div>
		<div class="f"><span>Unit</span><UnitInput {wb} dataset={src} expr={f.expr} value={f.unit} onchange={(v) => (f.unit = v)} /></div>
		<label class="f">Description <input type="text" bind:value={f.description} /></label>
		<label class="f" data-tip="Second y axis for quantities of another unit">y axis <select aria-label="y axis" value={f.yAxis} onchange={(e) => (f.yAxis = e.currentTarget.value as Feature['yAxis'])}><option value="left">left</option><option value="right">right</option></select></label>
		<p class="muted small">x axis: arc length along the cut line (µm), sampled at the cut line resolution. Add Line Graph features for more series.</p>
	{:else if f.type === 'global'}
		<h4>Data</h4>
		<label class="f" data-tip="Parametric sweep points, or the RF frequency sweep of the solution">Dataset
			<select aria-label="Global dataset" value={f.dataset} onchange={(e) => (f.dataset = e.currentTarget.value)}><option value="sweep">Parametric sweep</option><option value="rf" disabled={!R.dataset('rf')}>RF frequency sweep</option><option value="bias" disabled={!wb.semi}>Bias sweep (semiconductor)</option></select>
		</label>
		<h4>y-axis data</h4>
		{#if f.dataset === 'rf'}
			<div class="f"><span>Expressions</span><ExprInput {wb} dataset="rf" value={f.exprs} unit={f.unit} label="Global expressions" extra={rfVars} onchange={(v) => (f.exprs = v)} /></div>
		{:else if f.dataset === 'bias'}
			<div class="f"><span>Expressions</span><ExprInput {wb} dataset="" local value={f.exprs} label="Global expressions" extra={biasVariables(wb.semi)} onchange={(v) => (f.exprs = v)} /></div>
		{:else}
			<div class="f"><span>Expressions</span><ExprInput {wb} dataset="" local value={f.exprs} label="Global expressions" extra={sweepVars} onchange={(v) => (f.exprs = v)} /></div>
		{/if}
		<div class="f"><span>Unit</span><UnitInput {wb} dataset={f.dataset === 'rf' ? 'rf' : ''} local={f.dataset !== 'rf'} expr={f.exprs.split(',')[0] ?? ''} value={f.unit} onchange={(v) => (f.unit = v)} /></div>
		<label class="f" data-tip="Second y axis for quantities of another unit">y axis <select aria-label="y axis" value={f.yAxis} onchange={(e) => (f.yAxis = e.currentTarget.value as Feature['yAxis'])}><option value="left">left</option><option value="right">right</option></select></label>
		<p class="muted small">Comma-separated expressions, one series each, vs {f.dataset === 'rf' ? 'frequency' : f.dataset === 'bias' ? 'the bias of the swept contact (all bias points of the last Compute); the semiconductor targets of a named quantity are overlaid' : 'the first swept parameter'}{f.dataset === 'bias' ? '' : "; the study's sweep targets of a named quantity are overlaid"}.</p>
	{:else if f.type === 'tablegraph'}
		<h4>Data</h4>
		<label class="f">Table <select aria-label="Table" value={f.tableId} onchange={(e) => (f.tableId = e.currentTarget.value)}><option value="">choose a table</option>{#each R.tables as t}<option value={t.id}>{t.name}</option>{/each}</select></label>
		{#if tbl}
			<label class="f">x-axis data <select aria-label="x column" value={f.xCol} onchange={(e) => (f.xCol = e.currentTarget.value)}><option value="">row index</option>{#each numericCols as c}<option value={c}>{c}</option>{/each}</select></label>
			<div class="f"><span>y-axis data</span><div class="cols">{#each numericCols.filter((c) => c !== f.xCol) as c}<label class="chk"><input type="checkbox" aria-label="y column {c}" checked={f.yCols.split('|').includes(c)} onchange={(e) => (f.yCols = (e.currentTarget.checked ? [...f.yCols.split('|').filter(Boolean), c] : f.yCols.split('|').filter((x) => x && x !== c)).join('|'))} /> {c}</label>{/each}</div></div>
			<label class="f" data-tip="Second y axis for these columns">y axis <select value={f.yAxis} onchange={(e) => (f.yAxis = e.currentTarget.value as Feature['yAxis'])}><option value="left">left</option><option value="right">right</option></select></label>
		{/if}
	{/if}
	<div class="adds"><button onclick={() => { const c = R.duplicateFeature(gid, f.id); if (c) { wb.node = `pf:${gid}:${c.id}`; wb.addLog(`${g.name}: duplicated ${f.name} as ${c.name}`); } }}>Duplicate</button><button onclick={() => { wb.addLog(`${g.name}: deleted ${f.name}`); R.deleteFeature(gid, f.id); wb.node = `pg:${gid}`; }}>Delete</button></div>
{/if}

<style>
	.f { display: grid; grid-template-columns: minmax(84px, 36%) minmax(0, 1fr); align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
	.f select, .f input[type='number'], .f input[type='text'] { width: 100%; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; }
	.f input[type='checkbox'] { justify-self: start; }
	.f input[type='color'] { width: 40px; height: 22px; padding: 0; border: 1px solid var(--border); border-radius: 0; background: none; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; border-bottom: 1px solid var(--border); padding-bottom: 2px; }
	p { margin: 6px 0; line-height: 1.5; }
	.small { font-size: 11px; }
	.warn { color: var(--warn); }
	.sol { color: var(--ink-3); }
	.grid { width: 100%; border-collapse: collapse; } .grid td { padding: 2px 4px; border-bottom: 1px solid var(--border); }
	.acts { white-space: nowrap; text-align: right; }
	.acts button { height: 20px; font-size: 11px; padding: 0 5px; border-radius: 0; }
	.adds { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
	.adds button { height: 22px; font-size: 11px; border-radius: 0; }
	.link { border: 0; background: none; padding: 0; height: auto; color: var(--accent); border-radius: 0; text-align: left; }
	.cols { display: flex; flex-direction: column; gap: 2px; }
	.chk { display: flex; align-items: center; gap: 6px; }
	button:disabled { opacity: 0.5; cursor: default; }
</style>
