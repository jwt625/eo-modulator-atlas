<script lang="ts">
	// Settings pages of the Results nodes other than plot groups: datasets (solution, cut line, cut point), selections,
	// derived values, tables, Mode Analysis, Export, and the group nodes.
	import type { Workbench } from './workbench.svelte';
	import { DERIVED_LABEL, newFeature, type DerivedNode } from './results.svelte';
	import type { DerivedKind, PlotResult } from './post/contract';
	import { evaluateNode, evaluateOverSweep } from './derived';
	import { derivedPoint, derivedRequest } from './requests';
	import SolutionSelect from './SolutionSelect.svelte';
	import { downloadText, toCsv } from './exportUtil';
	import { GLOBAL_VARIABLES } from './post/ui';
	import ExprInput from './ExprInput.svelte';
	import ModeTable from './ModeTable.svelte';
	import UnitInput from './UnitInput.svelte';
	import { plotRequest } from './requests';
	import { fmt } from '../logic';

	let { wb, node }: { wb: Workbench; node: string } = $props();
	const R = $derived(wb.results);
	const id = $derived(node.slice(node.indexOf(':') + 1));
	const sol = $derived(node.startsWith('ds:') ? R.dataset(id) : null);
	const cl = $derived(node.startsWith('ds:') ? R.cutLines.find((c) => c.id === id) : null);
	const cp = $derived(node.startsWith('ds:') ? R.cutPoints.find((c) => c.id === id) : null);
	const sel = $derived(node.startsWith('sel:') ? R.selections.find((s) => s.id === id) : null);
	const dv = $derived(node.startsWith('dv:') ? R.derived.find((d) => d.id === id) : null);
	const tbl = $derived(node.startsWith('tbl:') ? R.tables.find((t) => t.id === id) : null);
	/** Datasets of a solution (-1 = last Compute, else the sweep point's loaded solution). */
	const setsOf = (point: number) => (point >= 0 ? (wb.points[point]?.datasets ?? R.fieldSets) : R.fieldSets).filter((d) => d.kind !== 'rf');
	const regions = $derived(wb.runGeometry?.geometry.regions ?? wb.geometry?.regions ?? []);
	// X6: page messages belong to the node they were produced on.
	let msgs = $state<Record<string, string>>({});
	const evalMsg = $derived(msgs[node] ?? '');
	const setMsg = (m: string, n = node) => (msgs = { ...msgs, [n]: m });
	let evalBusy = $state(false);
	const num = (v: string, d: number) => (Number.isFinite(Number(v)) && v.trim() !== '' ? Number(v) : d);

	async function evaluate(d: DerivedNode) {
		evalBusy = true;
		setMsg('');
		try {
			await evaluateNode(wb, d);
			setMsg('Evaluated; row added to the table.');
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		} finally {
			evalBusy = false;
		}
	}
	function overSweep(d: DerivedNode) {
		setMsg('');
		try {
			const n = evaluateOverSweep(wb, d);
			setMsg(`${n} rows added.`);
		} catch (e) {
			setMsg(e instanceof Error ? e.message : String(e));
		}
	}
	function lineGraph(clId: string) {
		const c = R.cutLines.find((x) => x.id === clId);
		if (!c) return;
		// N1: expression and unit of the shown feature on the cut line's dataset.
		const shownF = R.groups.find((g) => g.id === wb.view)?.features.find((f) => f.expr && (f.dataset || R.group(wb.view)?.dataset) === c.source);
		const expr = shownF?.expr ?? (wb.has(c.source, 'es.V') ? 'es.V' : R.intensityExpr(c.source, (d, v) => wb.has(d, v)) || (wb.vars[c.source]?.find((v) => v.location !== 'global' && v.name !== 'x' && v.name !== 'y')?.name ?? ''));
		const g = R.addGroup('1d', '', `Line Graph: ${c.name}`, [newFeature('linegraph', { dataset: c.id, expr, unit: shownF?.unit ?? '' })]);
		wb.view = g.id;
		wb.node = `pg:${g.id}`;
	}
	function tableGraph(tid: string) {
		const t = R.tables.find((x) => x.id === tid);
		if (!t) return;
		// x: the first numeric parameter column; y: the value columns (headers with a unit and an expression).
		const x = t.columns.find((c) => t.roles?.[c] === 'param') ?? '';
		const ys = t.columns.filter((c) => t.roles?.[c] === 'value').join('|');
		const g = R.addGroup('1d', '', `Table Graph: ${t.name}`, [newFeature('tablegraph', { tableId: t.id, xCol: x, yCols: ys })]);
		wb.view = g.id;
		wb.node = `pg:${g.id}`;
	}
	/** New derived node; from a cut line / cut point page it targets that dataset (H1). */
	function addDerived(k: DerivedKind, targetId = '') {
		const target = targetId || (k.startsWith('surface') ? (R.selections[0]?.id ?? '') : k.startsWith('line') ? (R.cutLines[0]?.id ?? '') : k === 'point' ? (R.cutPoints[0]?.id ?? '') : '');
		const src = R.cutLines.find((c) => c.id === target)?.source ?? R.cutPoints.find((c) => c.id === target)?.source;
		const d = R.addDerived(k, { target, ...(src ? { dataset: src } : {}) });
		wb.addLog(`${d.name} on ${R.dsLabel(target) || 'all domains'}`);
		wb.node = `dv:${d.id}`;
	}
	const sweepVars = $derived.by(() => {
		const g = wb.sweepRows.find((r) => r.globals)?.globals ?? wb.runGlobals;
		return GLOBAL_VARIABLES.filter((v) => !g || v.name in g);
	});

	// ---- Export: plotted data of the shown 2D plot group ----
	const shownGroup = $derived(R.group(wb.view));
	/** Export > Data: the plotted values of a feature in the solution the group shows (F2: sweep points included). */
	async function exportData(fi: number) {
		const g = shownGroup;
		const f = g?.features[fi];
		if (!g || !f || !wb.post) return;
		const ds = f.dataset || g.dataset;
		const req = plotRequest(R, g, f, f.expr, f.unit);
		let p = wb.cache.peek<PlotResult>(req)?.data;
		if (!p) {
			if (g.point >= 0 && wb.points[g.point]?.status !== 'ready') {
				setMsg('The sweep point fields are still being computed; export when the plot is shown.');
				return;
			}
			try {
				p = await wb.post.request<PlotResult>(req);
			} catch (e) {
				setMsg(e instanceof Error ? e.message : String(e));
				return;
			}
		}
		const mesh = wb.meshes[p.mesh];
		if (!mesh) {
			setMsg('No display mesh for this plot.');
			return;
		}
		const rows: (number | string)[][] = [];
		const nT = mesh.tri.length / 3;
		if (p.location === 'node') for (let i = 0; i < mesh.x.length; i++) rows.push([mesh.x[i], mesh.y[i], p.values[i]]);
		else if (p.location === 'element')
			for (let t = 0; t < nT; t++) {
				const a = mesh.tri[3 * t], b = mesh.tri[3 * t + 1], c = mesh.tri[3 * t + 2];
				rows.push([(mesh.x[a] + mesh.x[b] + mesh.x[c]) / 3, (mesh.y[a] + mesh.y[b] + mesh.y[c]) / 3, p.values[t]]);
			}
		else for (let i = 0; i < 3 * nT; i++) rows.push([mesh.x[mesh.tri[i]], mesh.y[mesh.tri[i]], p.values[i]]);
		const where = p.location === 'node' ? 'mesh nodes' : p.location === 'element' ? 'element centroids' : 'element corners';
		const point = g.point >= 0 ? Object.entries(wb.sweepRows[g.point]?.values ?? {}).map(([k, v]) => `${wb.axisLabel(k).replace(/ \(.*\)$/, '')} = ${v}`).join(', ') : '';
		const solText = point ? `sweep point ${g.point + 1} (${point})` : 'last Compute';
		const safe = (t: string) => t.replace(/[^\w.=-]+/g, '_');
		const pointFile = g.point >= 0 ? Object.entries(wb.sweepRows[g.point]?.values ?? {}).map(([k, v]) => `${wb.axisLabel(k).replace(/ \(.*\)$/, '')}=${v}`).join('_') : '';
		const name = `${wb.raw?.id ?? 'sim'}-${safe(g.name)}-${safe(f.name)}${pointFile ? `-p${g.point + 1}-${safe(pointFile)}` : ''}.csv`;
		downloadText(name, `# ${R.dsLabel(ds)}; ${solText}; ${f.expr} (${p.unit}) at ${where}\n` + toCsv(['x (um)', 'y (um)', `${f.expr} (${p.unit})`], rows));
		wb.addLog(`Exported ${rows.length.toLocaleString()} values of ${f.expr} (${where}, ${solText}) to ${name}`);
	}
	function exportTable(tid: string) {
		const t = R.tables.find((x) => x.id === tid);
		if (t) downloadText(`${wb.raw?.id ?? 'sim'}-${t.name.replace(/[^\w.-]+/g, '_')}.csv`, toCsv(t.columns, t.rows));
	}
</script>

{#if node === 'results'}
	<p class="muted small">Datasets, selections, derived values into tables, plot groups with layered features, export. Right-click a node (or use its + button) to add, duplicate, rename or delete; F2 renames, Delete removes.</p>
	<div class="adds"><button onclick={() => { const g = R.addGroup('2d'); wb.view = g.id; wb.node = `pg:${g.id}`; }}>+ 2D Plot Group</button><button onclick={() => { const g = R.addGroup('1d'); wb.view = g.id; wb.node = `pg:${g.id}`; }}>+ 1D Plot Group</button></div>
	{#if wb.post}<p class="muted small" data-results-ready={R.datasets.length}>{R.datasets.length} dataset(s), {Object.values(wb.vars).reduce((s, v) => s + v.length, 0)} registry entries{wb.registryMs != null ? `, registry ready ${wb.registryMs.toFixed(0)} ms after the result` : ''}.</p>{:else}<p class="muted">No solution. Compute the study.</p>{/if}
{:else if node === 'res.datasets'}
	<table class="grid"><thead><tr><th>Dataset</th><th>Kind</th><th>Modes</th></tr></thead><tbody>
		{#each R.datasets as d}<tr><td><button class="link" onclick={() => (wb.node = `ds:${d.id}`)}>{d.label}</button></td><td>{d.kind}</td><td class="num">{d.nModes ?? ''}</td></tr>{/each}
		{#each R.cutLines as c}<tr><td><button class="link" onclick={() => (wb.node = `ds:${c.id}`)}>{c.name}</button></td><td>Cut Line 2D</td><td></td></tr>{/each}
		{#each R.cutPoints as c}<tr><td><button class="link" onclick={() => (wb.node = `ds:${c.id}`)}>{c.name}</button></td><td>Cut Point 2D</td><td></td></tr>{/each}
	</tbody></table>
	<div class="adds"><button onclick={() => (wb.tool = 'cutline')} data-tip="Then drag on the graphics">+ Cut Line 2D</button><button onclick={() => (wb.tool = 'cutpoint')} data-tip="Then click on the graphics">+ Cut Point 2D</button></div>
{:else if sol}
	<dl class="kv"><dt>kind</dt><dd>{sol.kind}</dd><dt>section</dt><dd>{sol.section ?? ''}</dd>{#if sol.arm}<dt>arm</dt><dd>{sol.arm}</dd>{/if}<dt>display mesh</dt><dd class="mono">{sol.mesh} ({((wb.meshOf(sol)?.tri.length ?? 0) / 3).toLocaleString()} triangles)</dd></dl>
	<p class="muted small" data-solution-label={wb.solutionLabel(-1)}>Solution: {wb.solutionLabel(-1)}</p>
	{#if sol.nModes}<h4>Mode Analysis</h4><ModeTable {wb} dataset={sol.id} point={-1} />{/if}
	<h4>Variables</h4>
	<table class="grid small"><thead><tr><th>Name</th><th>Unit</th><th>Location</th><th>Description</th></tr></thead><tbody>
		{#each wb.vars[sol.id] ?? [] as v}<tr><td class="mono">{v.name}</td><td class="mono">{v.unit}</td><td>{v.location}</td><td class="muted">{v.description}</td></tr>{/each}
	</tbody></table>
{:else if cl}
	<label class="f">Label <input type="text" value={cl.name} onchange={(e) => (cl.name = e.currentTarget.value || cl.name)} /></label>
	<SolutionSelect {wb} value={cl.point} onchange={(p) => { cl.point = p; wb.addLog(`${cl.name}: solution ${wb.solutionLabel(p)}`); }} />
	<label class="f">Data <select aria-label="Cut line source" value={cl.source} onchange={(e) => (cl.source = e.currentTarget.value)}>{#each setsOf(cl.point) as d}<option value={d.id}>{d.label}</option>{/each}</select></label>
	<div class="coords">
		{#each [['ax', 'point 1 x'], ['ay', 'point 1 y'], ['bx', 'point 2 x'], ['by', 'point 2 y']] as [k, label]}
			<label data-tip="µm">{label}<input type="number" step="any" value={Number(cl[k as 'ax'].toPrecision(6))} onchange={(e) => (cl[k as 'ax'] = num(e.currentTarget.value, cl[k as 'ax']))} /></label>
		{/each}
	</div>
	<label class="f" data-tip="Number of samples of Line Graph plots along this line; Line Integration and Line Average use 3 Gauss points per element crossing instead">Resolution <input type="number" min="2" max="20000" step="1" value={cl.n} onchange={(e) => (cl.n = Math.max(2, Math.min(20000, Math.round(num(e.currentTarget.value, cl.n)))))} /></label>
	<p class="muted small">Length {fmt(Math.hypot(cl.bx - cl.ax, cl.by - cl.ay), 5)} µm. Gaps (electrodes, outside the mesh) are NaN.</p>
	<div class="adds"><button class="on" onclick={() => lineGraph(cl.id)}>Line Graph</button><button onclick={() => addDerived('line_int', cl.id)}>+ Line Integration</button><button onclick={() => addDerived('line_avg', cl.id)}>+ Line Average</button></div>
{:else if cp}
	<label class="f">Label <input type="text" value={cp.name} onchange={(e) => (cp.name = e.currentTarget.value || cp.name)} /></label>
	<SolutionSelect {wb} value={cp.point} onchange={(p) => { cp.point = p; wb.addLog(`${cp.name}: solution ${wb.solutionLabel(p)}`); }} />
	<label class="f">Data <select aria-label="Cut point source" value={cp.source} onchange={(e) => (cp.source = e.currentTarget.value)}>{#each setsOf(cp.point) as d}<option value={d.id}>{d.label}</option>{/each}</select></label>
	<label class="f">x (µm) <input type="number" step="any" value={cp.x} onchange={(e) => (cp.x = num(e.currentTarget.value, cp.x))} /></label>
	<label class="f">y (µm) <input type="number" step="any" value={cp.y} onchange={(e) => (cp.y = num(e.currentTarget.value, cp.y))} /></label>
	<div class="adds"><button onclick={() => addDerived('point', cp.id)}>+ Point Evaluation</button></div>
{:else if node === 'res.selections'}
	<p class="muted small">Use the Select tool in the graphics: click a domain to select it, shift-click to add or remove. Selections filter plot features and set the domains of surface derived values.</p>
	<div class="adds"><button onclick={() => { const s = R.addSelection(); wb.node = `sel:${s.id}`; wb.tool = 'select'; }}>+ Selection</button></div>
{:else if sel}
	<label class="f">Label <input type="text" value={sel.name} onchange={(e) => (sel.name = e.currentTarget.value || sel.name)} /></label>
	<div class="adds"><button class:on={wb.tool === 'select'} onclick={() => (wb.tool = wb.tool === 'select' ? 'pan' : 'select')} data-tip="Click domains in the graphics">Select in graphics</button><button onclick={() => (sel.regions = regions.map((r) => r.name))}>All</button><button onclick={() => (sel.regions = [])}>None</button></div>
	<table class="grid" data-selection={sel.id} data-selection-regions={sel.regions.join(',')}><tbody>
		{#each regions as r}<tr><td><label class="chk"><input type="checkbox" checked={sel.regions.includes(r.name)} onchange={(e) => (sel.regions = e.currentTarget.checked ? [...sel.regions, r.name] : sel.regions.filter((x) => x !== r.name))} /> {r.name}</label></td><td class="muted">{r.material}</td></tr>{/each}
	</tbody></table>
{:else if node === 'results.derived'}
	<!-- rendered by DerivedValues in Settings -->
{:else if dv}
	{@const kinds = Object.keys(DERIVED_LABEL) as DerivedKind[]}
	<label class="f">Label <input type="text" value={dv.name} onchange={(e) => (dv.name = e.currentTarget.value || dv.name)} /></label>
	<label class="f">Type <select aria-label="Derived value type" value={dv.kind} onchange={(e) => (dv.kind = e.currentTarget.value as DerivedKind)}>{#each kinds as k}<option value={k}>{DERIVED_LABEL[k]}</option>{/each}</select></label>
	{#if dv.kind === 'global' || dv.kind.startsWith('surface')}
		<SolutionSelect {wb} value={dv.point ?? -1} onchange={(p) => { dv.point = p; wb.addLog(`${dv.name}: solution ${wb.solutionLabel(p)}`); }} />
		<label class="f">Dataset <select aria-label="Derived dataset" value={dv.dataset} onchange={(e) => (dv.dataset = e.currentTarget.value)}>{#each setsOf(dv.point ?? -1) as d}<option value={d.id}>{d.label}</option>{/each}</select></label>
	{:else}
		{@const pt = derivedPoint(R, dv)}
		<p class="muted small" data-solution-label={wb.solutionLabel(pt)}>Solution: {wb.solutionLabel(pt)} (of the {dv.kind === 'point' ? 'cut point' : 'cut line'}; set it on that dataset).</p>
	{/if}
	{#if dv.kind.startsWith('surface')}
		<label class="f" data-tip="Domains integrated over; none = all domains">Selection <select aria-label="Derived selection" value={dv.target} onchange={(e) => (dv.target = e.currentTarget.value)}><option value="">all domains</option>{#each R.selections as s}<option value={s.id}>{s.name} ({s.regions.length})</option>{/each}</select></label>
	{:else if dv.kind.startsWith('line')}
		<label class="f">Cut line <select aria-label="Derived cut line" value={dv.target} onchange={(e) => (dv.target = e.currentTarget.value)}><option value="">choose</option>{#each R.cutLines as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
	{:else if dv.kind === 'point'}
		<label class="f">Cut point <select aria-label="Derived cut point" value={dv.target} onchange={(e) => (dv.target = e.currentTarget.value)}><option value="">choose</option>{#each R.cutPoints as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
	{/if}
	{@const req = derivedRequest(R, dv)}
	{@const dsx = typeof req === 'string' ? dv.dataset : req.req.dataset}
	{@const measure = dv.kind === 'surface_int' ? 'm^2' : dv.kind === 'line_int' ? 'm' : ''}
	<div class="f"><span>Expression</span><ExprInput {wb} dataset={dsx} value={dv.expr} unit={dv.unit} {measure} label="Derived expression" extra={dv.kind === 'global' ? sweepVars : []} onchange={(v) => { dv.expr = v; wb.addLog(`${dv.name}: expression ${v}`); }} /></div>
	<div class="f"><span>Unit</span><UnitInput {wb} dataset={dsx} expr={dv.expr} value={dv.unit} {measure} label="Derived unit" onchange={(v) => (dv.unit = v)} /></div>
	<label class="f">Table <select value={dv.tableId} onchange={(e) => (dv.tableId = e.currentTarget.value)}><option value="">new table</option>{#each R.tables as t}<option value={t.id}>{t.name}</option>{/each}</select></label>
	<div class="adds">
		<button class="on" onclick={() => evaluate(dv)} disabled={evalBusy || (!wb.post && !wb.sweepJobs.length)}>Evaluate</button>
		{#if dv.kind === 'global' && wb.sweepRows.some((r) => r.status === 'done')}<button onclick={() => overSweep(dv)} data-tip="One row per finished sweep point, from the points' global values">Evaluate over sweep</button>{/if}
		{#if dv.tableId}<button onclick={() => (wb.node = `tbl:${dv.tableId}`)}>Table</button>{/if}
	</div>
	{#if evalMsg}<p class="small" class:err={!evalMsg.startsWith('Evaluated') && !evalMsg.endsWith('rows added.')} data-eval-msg>{evalMsg}</p>{/if}
	{#if typeof req === 'string' && dv.expr}<p class="muted small">{req}</p>{/if}
	<p class="muted small" data-derived-help>Surface integrals: the solver's 6-point quadrature in every element of the selection. Line integrals and averages: 3 Gauss points per element crossing along the cut line (the cut line Resolution sets only the Line Graph sampling). Max/min: corners, edge midpoints and quadrature points, refined in the best element. Over a sweep: Global Evaluation from the points' global values.</p>
{:else if node === 'res.tables'}
	<div class="adds"><button onclick={() => { const t = R.addTable(); wb.node = `tbl:${t.id}`; }}>+ Table</button></div>
	{#each R.tables as t}<p><button class="link" onclick={() => (wb.node = `tbl:${t.id}`)}>{t.name}</button> <span class="muted small">{t.rows.length} rows</span></p>{/each}
{:else if tbl}
	<label class="f">Label <input type="text" value={tbl.name} onchange={(e) => (tbl.name = e.currentTarget.value || tbl.name)} /></label>
	<div class="adds"><button onclick={() => exportTable(tbl.id)}>CSV</button><button onclick={() => tableGraph(tbl.id)}>Table Graph</button><button onclick={() => (tbl.rows = [])}>Clear</button></div>
	<div class="scroll"><table class="grid" data-table={tbl.id} data-rows={tbl.rows.length}><thead><tr>{#each tbl.columns as c}<th>{c}</th>{/each}</tr></thead><tbody>
		{#each tbl.rows as row}<tr>{#each row as v, ci}<td class:num={typeof v === 'number'} class:clip={ci < 3} data-tip={String(v)} data-value={typeof v === 'number' ? v : undefined}>{typeof v === 'number' ? fmt(v, 6) : v}</td>{/each}</tr>{/each}
	</tbody></table></div>
{:else if node === 'res.modes'}
	<SolutionSelect {wb} value={wb.modesPoint} onchange={(p) => (wb.modesPoint = p)} />
	{#each setsOf(wb.modesPoint).filter((d) => d.nModes && !d.aliasOf) as d}<h4>{d.label}</h4><ModeTable {wb} dataset={d.id} point={wb.modesPoint} />{:else}<p class="muted">No optical dataset in this solution. Include the optical mode or EO overlap stage.</p>{/each}
	<p class="muted small" data-mode-help>Selecting a row sets the mode of that dataset in the plot groups showing this same solution ({wb.solutionLabel(wb.modesPoint)}) and in their derived values. Quantities the engine reports for the solved mode only show '-' for the other modes.</p>
{:else if node === 'res.export'}
	<h4>Data (plotted values)</h4>
	{#if shownGroup?.kind === '2d'}
		{#each shownGroup.features as f, i}{#if f.expr && f.type !== 'arrow'}<p><button class="link" onclick={() => exportData(i)}>{shownGroup.name}: {f.name} ({f.expr})</button></p>{/if}{/each}
	{:else}<p class="muted small">Show a 2D plot group to export its feature values (CSV of x, y, value at the evaluation points).</p>{/if}
	<h4>Tables</h4>
	{#each R.tables as t}<p><button class="link" onclick={() => exportTable(t.id)}>{t.name} ({t.rows.length} rows)</button></p>{:else}<p class="muted small">No tables.</p>{/each}
	<h4>Image</h4>
	<p class="muted small">Image in the graphics toolbar: PNG at a chosen size with legend and title. 1D plots: PNG and CSV buttons on the plot.</p>
	{#if evalMsg}<p class="err small">{evalMsg}</p>{/if}
{/if}

<style>
	.f { display: grid; grid-template-columns: minmax(84px, 36%) minmax(0, 1fr); align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
	.f select, .f input[type='number'], .f input[type='text'] { width: 100%; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; }
	.coords { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 8px; margin: 4px 0; }
	.coords label { display: grid; grid-template-columns: 62px minmax(0, 1fr); align-items: center; gap: 4px; color: var(--ink-2); }
	.coords input { width: 100%; height: 22px; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; border-radius: 0; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.err { color: var(--crit); }
	.grid { width: 100%; border-collapse: collapse; } .grid th, .grid td { padding: 2px 4px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; } .grid th { color: var(--ink-3); font-weight: 500; }
	.scroll { overflow: auto; max-height: 60vh; }
	td.clip { max-width: 130px; overflow: hidden; text-overflow: ellipsis; }
	.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 6px 0; } .kv dt { color: var(--ink-3); } .kv dd { margin: 0; }
	.adds { display: flex; flex-wrap: wrap; gap: 4px; margin: 8px 0; }
	.adds button { height: 22px; font-size: 11px; border-radius: 0; }
	.link { border: 0; background: none; padding: 0; height: auto; color: var(--accent); border-radius: 0; text-align: left; }
	.chk { display: flex; align-items: center; gap: 6px; }
	button:disabled { opacity: 0.5; cursor: default; }
</style>
