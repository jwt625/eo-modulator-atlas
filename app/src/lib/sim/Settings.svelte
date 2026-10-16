<script lang="ts">
	import { MESH_LEVELS, type Workbench } from './workbench.svelte';
	import SemiResults from './SemiResults.svelte';
	import { cm3Label, dopingShapes, semiContacts } from './semiOverlay';
	import { parseSweepValues } from './sweepValues';
	import Field from './Field.svelte';
	import DerivedValues from './DerivedValues.svelte';
	import TargetsTable from './TargetsTable.svelte';
	import SweepSettings from './SweepSettings.svelte';
	import SweepPlot from './SweepPlot.svelte';
	import PlotGroupSettings from './PlotGroupSettings.svelte';
	import ResultsPages from './ResultsPages.svelte';
	import EoCoupling from './EoCoupling.svelte';
	import SolutionSelect from './SolutionSelect.svelte';
	import RfPoint from './RfPoint.svelte';
	import { DERIVED_LABEL, FEATURE_LABEL } from './results.svelte';
	import type { DerivedKind } from './post/contract';
	import SimStageResults from '../SimStageResults.svelte';
	import { leaves, unitOf } from './units';
	import { triMinAngle, triSize } from './fieldmath';
	import { fmt } from '../logic';
	import { DEFAULT_ELEMENT_ORDER } from '../../../../engine/src/config.mjs';
	import { ENUMS } from './enums';


	let { wb, downloadHref }: { wb: Workbench; downloadHref: string | null } = $props();

	const raw = $derived(wb.raw);
	const order = $derived(Number(wb.rawAt(`${wb.geometryPath}.mesh.element_order`) ?? DEFAULT_ELEMENT_ORDER));
	const solver = $derived(String(wb.raw?.optics?.solver ?? 'scalar'));
	const g = $derived(wb.geometry);
	const gp = $derived(wb.geometryPath);
	// Template-generated geometry is not in the source document: edit the template block or params instead.
	const ro = $derived(!!wb.template && wb.section === 'geometry');
	// W2: template configs take mesh hints and element order in `template.mesh` (copied into geometry.mesh by the engine).
	const mp = $derived(ro ? 'template.mesh' : `${gp}.mesh`);
	const node = $derived(wb.node);
	const titles: Record<string, string> = {
		model: 'Model', params: 'Parameters', materials: 'Materials', geometry: 'Geometry', mesh: 'Mesh',
		'physics.es': 'Electrostatics', 'physics.mode': 'Mode Analysis', 'physics.eo': 'EO Coupling', 'physics.rf': 'RF Line',
		'physics.semi': 'Semiconductor', 'study.bias': 'Bias Sweep (semiconductor)', 'res.semi': 'Semiconductor (results)',
		study: 'Study', 'study.stationary': 'Stationary + Mode', 'study.sweep': 'Parametric Sweep', results: 'Results',
		'results.derived': 'Derived Values', 'results.targets': 'Targets', 'results.rf': 'RF Line results',
		'results.sweep': 'Parametric Sweep (dataset)', 'res.datasets': 'Datasets', 'res.selections': 'Selections', 'res.tables': 'Tables',
		'res.modes': 'Mode Analysis', 'res.eo': 'EO Coupling (results)', 'res.export': 'Export'
	};
	const R = $derived(wb.results);
	function resultTitle(n: string): string | null {
		const id = n.slice(n.indexOf(':') + 1);
		if (n.startsWith('pg:')) {
			const g = R.group(id);
			return g ? `${g.kind === '2d' ? '2D' : '1D'} Plot Group: ${g.name}` : 'Plot Group';
		}
		if (n.startsWith('pf:')) {
			const [, gid, fid] = n.split(':');
			const f = R.feature(gid, fid);
			return f ? `${FEATURE_LABEL[f.type]}: ${f.name}` : 'Plot feature';
		}
		if (n.startsWith('ds:')) return R.dataset(id) ? `Dataset: ${R.dataset(id)!.label}` : R.cutLines.some((c) => c.id === id) ? `Cut Line 2D: ${R.dsLabel(id)}` : `Cut Point 2D: ${R.dsLabel(id)}`;
		if (n.startsWith('sel:')) return `Selection: ${R.selections.find((s) => s.id === id)?.name ?? ''}`;
		if (n.startsWith('dv:')) {
			const d = R.derived.find((x) => x.id === id);
			return d ? `${DERIVED_LABEL[d.kind]}: ${d.name}` : 'Derived value';
		}
		if (n.startsWith('tbl:')) return `Table: ${R.tables.find((t) => t.id === id)?.name ?? ''}`;
		return null;
	}
	const title = $derived(
		titles[node] ??
			(node.startsWith('material:') ? `Material: ${node.slice(9)}`
			: node.startsWith('region:') ? `Region: ${g?.regions[Number(node.slice(7))]?.name ?? ''}`
			: node.startsWith('electrode:') ? `Electrode: ${g?.electrodes[Number(node.slice(10))]?.name ?? ''}`
			: node.startsWith('semi.doping:') ? `Doping: ${dopingShapes(wb.raw?.semiconductor, g)[Number(node.slice(12))]?.name ?? ''}`
			: node.startsWith('semi.contact:') ? `Contact: ${semiContacts(wb.raw?.semiconductor)[Number(node.slice(13))]?.electrode ?? ''}`
			: resultTitle(node) ?? node)
	);
	const meshStats = $derived.by(() => {
		const m = wb.solvedMesh ?? wb.mesh;
		if (!m) return null;
		const size = triSize(m), ang = triMinAngle(m);
		let smin = Infinity, smax = 0, amin = 180, asum = 0;
		for (let i = 0; i < size.length; i++) { smin = Math.min(smin, size[i]); smax = Math.max(smax, size[i]); amin = Math.min(amin, ang[i]); asum += ang[i]; }
		return { nodes: m.x.length, tris: size.length, smin, smax, amin, amean: asum / size.length, solved: m === wb.solvedMesh, semi: !wb.meshes.es && m === wb.meshes.semi };
	});
	const POLS = ENUMS.polarization;
	const GI = ENUMS.groupIndex;
	// Enumerations from the engine (no hard-coded lists): metal policies, optical solvers, element orders.
	const METAL = ENUMS.metal;
	const SOLVERS = ENUMS.solver;
	const ORDERS = ENUMS.elementOrder;
	const ARM = ENUMS.armDrive;
	const TERM = ENUMS.terminalDrive;
	const COND = ENUMS.conductorLoss;
	const DIEL = ENUMS.dielectricLoss;
	const BC = ENUMS.boundary;
	const SYM = ENUMS.symmetry;
	const VORDERS = ENUMS.vectorOrder;
	const LOADING = ENUMS.loading;
	const semiMats = $derived(Object.keys((raw?.semiconductor?.materials ?? {}) as Record<string, unknown>));
	let biasText = $state('');
	let biasErr = $state('');
	$effect(() => {
		const v = raw?.semiconductor?.bias?.values_v;
		biasText = Array.isArray(v) ? v.join(', ') : '';
	});
	function commitBias(text: string) {
		biasErr = '';
		if (text.trim() === biasText) return;
		try {
			wb.editList('semiconductor.bias.values_v', parseSweepValues(text));
		} catch (e) {
			biasErr = e instanceof Error ? e.message : String(e);
		}
	}
	const shapeOf = (r: Record<string, unknown> | undefined) => (r?.rect ? 'rect' : r?.polygon_um ? 'polygon_um' : 'other');
</script>

{#snippet readiness(id: string)}
	{@const err = wb.stageError(id)}
	{#if err}<p class="crit" data-readiness={id}>Blocked: {err}</p>{:else}<p class="muted" data-readiness={id}>Inputs pass the input boundary.</p>{/if}
{/snippet}

{#snippet stageToggle(id: string, label: string)}
	{@const err = wb.stageError(id)}
	{@const auto = wb.stageAuto(id)}
	<label class="toggle" data-tip={auto ?? err ?? (id === 'semiconductor' ? 'Include this stage in Compute; it runs alone (own device mesh and Poisson solve), so the cross-section stages are switched off' : 'Include this stage in Compute')}><input type="checkbox" checked={wb.selected.includes(id) || !!auto} disabled={!!wb.busy || !!auto || (!!err && !wb.selected.includes(id))} onchange={(e) => wb.toggleStage(id, e.currentTarget.checked)} /> Include {label} in Compute{auto ? ' (dependency of EO response)' : ''}</label>
{/snippet}

{#snippet rectFields(base: string, obj: Record<string, unknown> | undefined)}
	{#if obj?.rect}
		<Field {wb} readonly={ro} path="{base}.rect.x_um.0" label="x min" unit="µm" />
		<Field {wb} readonly={ro} path="{base}.rect.x_um.1" label="x max" unit="µm" />
		<Field {wb} readonly={ro} path="{base}.rect.y_um.0" label="y min" unit="µm" />
		<Field {wb} readonly={ro} path="{base}.rect.y_um.1" label="y max" unit="µm" />
	{:else if Array.isArray(obj?.polygon_um)}
		<p class="muted mono small" data-tip="Polygon vertices (µm); edit in the YAML tab">polygon_um: {JSON.stringify(obj.polygon_um)}</p>
	{/if}
{/snippet}

<div class="settings">
	<div class="head">
		<span class="title" data-tip={title}>{title}</span>
		<span class="grow"></span>
		<div class="tabs" role="tablist" aria-label="Settings view">
			<button role="tab" aria-selected={wb.settingsTab === 'settings'} class:on={wb.settingsTab === 'settings'} onclick={() => (wb.settingsTab = 'settings')}>Settings</button>
			<button role="tab" aria-selected={wb.settingsTab === 'yaml'} class:on={wb.settingsTab === 'yaml'} onclick={() => (wb.settingsTab = 'yaml')} data-tip="Canonical YAML; form edits write here">YAML</button>
		</div>
	</div>
	<div class="body">
		{#if wb.settingsTab === 'yaml'}
			<textarea aria-label="Input YAML" spellcheck="false" bind:value={wb.text} disabled={!!wb.busy || wb.loading}></textarea>
		{:else if !raw}
			<p class="muted">{wb.loading ? 'Loading config...' : wb.parsed.error ? 'Input does not parse; fix it in the YAML tab.' : 'No config loaded.'}</p>
		{:else if node === 'model'}
			<h3>{raw.title ?? raw.id}</h3>
			<dl class="kv">
				<dt>id</dt><dd class="mono">{raw.id}</dd>
				{#if raw.paper_id}<dt>paper</dt><dd class="mono">{raw.paper_id}</dd>{/if}
				{#if raw.device_id}<dt>device</dt><dd class="mono">{raw.device_id}</dd>{/if}
				{#if raw.repro_grade}<dt>repro grade</dt><dd>{raw.repro_grade}</dd>{/if}
				<dt>chain</dt><dd>{(raw.chain ?? []).join(', ').replaceAll('_', ' ')}</dd>
			</dl>
			<p>Config validation status: {raw.validation_status ?? 'unvalidated'}</p>
			<p class="muted small">Electrostatics, optical modes (scalar or vector solver), DC EO overlap, the uniform RF line, the periodic loaded line, the traveling-wave EO response and the silicon drift-diffusion stage run locally in this browser; results stay in memory. Section values do not establish reproduction of a complete modulator.</p>
			{#if downloadHref}<p><a href={downloadHref} download="config.yaml">Download input YAML</a> <span class="muted small">(published file, without session edits)</span></p>{/if}
			{#if raw.limitations?.length}<h4>Limitations</h4><ul>{#each raw.limitations as note}<li>{note}</li>{/each}</ul>{/if}
			{#if raw.missing?.length}<h4>Missing or inferred inputs</h4><ul>{#each raw.missing as item}<li>{typeof item === 'string' ? item : JSON.stringify(item)}</li>{/each}</ul>{/if}
			<details><summary>Parameter provenance</summary><dl>{#each Object.entries(raw.provenance ?? {}) as [key, ev]}{@const e = ev as Record<string, string>}<dt class="mono">{key}</dt><dd>{e.class} · {e.locator ?? e.citation ?? ''}{e.note ? ` - ${e.note}` : ''}</dd>{/each}</dl></details>
		{:else if node === 'params'}
			{#if raw.params && typeof raw.params === 'object' && Object.keys(raw.params).length}
				<table class="grid"><thead><tr><th>Name</th><th>Value</th><th>Unit</th></tr></thead><tbody>
					{#each Object.entries(raw.params) as [name, p]}
						{@const pp = (p ?? {}) as Record<string, unknown>}
						<tr data-tip={String(pp.description ?? '')}><td class="mono">{name}</td><td><Field {wb} path="params.{name}.value" label={name} bare tip={String(pp.description ?? '')} /></td><td>{pp.unit === 'um' ? 'µm' : pp.unit ?? ''}</td></tr>
					{/each}
				</tbody></table>
				<p class="muted small">Values may be numbers or expressions (engine syntax). Sweeps can target <span class="mono">params.&lt;name&gt;.value</span>.</p>
			{:else}
				<p class="muted">No <span class="mono">params</span> block in this config. Edit values under Materials, Geometry and Physics, or in the YAML tab. Parameterized templates come from the engine lane (DevLog-026).</p>
			{/if}
		{:else if node === 'materials'}
			<table class="grid"><thead><tr><th>Material</th><th>Kind</th><th>Used by</th></tr></thead><tbody>
				{#each Object.entries(raw.materials ?? {}) as [name, m]}
					{@const mm = (m ?? {}) as Record<string, unknown>}
					<tr><td><button class="link" onclick={() => (wb.node = `material:${name}`)}>{name}</button></td><td>{mm.conductor ? 'conductor' : mm.crystal ? 'crystal' : 'dielectric'}</td>
						<td class="small">{[...(g?.regions.filter((r) => r.material === name).map((r) => r.name) ?? []), ...(g?.electrodes.filter((e) => e.material === name).map((e) => e.name) ?? [])].join(', ')}</td></tr>
				{/each}
			</tbody></table>
		{:else if node.startsWith('material:')}
			{@const name = node.slice(9)}
			{#each leaves(raw.materials?.[name], `materials.${name}`) as l}
				<Field {wb} path={l.path} label={l.key} unit={unitOf(l.path)} readonly={Array.isArray(l.value)} />
			{/each}
		{:else if node === 'geometry'}
			{#if ro && wb.template}
				<p class="muted small">Generated by template <span class="mono">{wb.template.type}</span>. Edit the template inputs below or the Parameters; the expanded geometry is read-only.</p>
				<h4>Template</h4>
				{#each leaves(wb.source?.template, 'template').filter((l) => l.key !== 'type') as l}
					<Field {wb} path={l.path} label={l.key} unit={unitOf(l.path)} readonly={Array.isArray(l.value)} />
				{/each}
			{/if}
			<h4>Domain</h4>
			<Field {wb} readonly={ro} path="{gp}.domain.x_um.0" label="x min" unit="µm" />
			<Field {wb} readonly={ro} path="{gp}.domain.x_um.1" label="x max" unit="µm" />
			<Field {wb} readonly={ro} path="{gp}.domain.y_um.0" label="y min" unit="µm" />
			<Field {wb} readonly={ro} path="{gp}.domain.y_um.1" label="y max" unit="µm" />
			<Field {wb} readonly={ro} path="{gp}.symmetry" label="symmetry" options={SYM} tip="Mirror symmetry crops the electrostatic solve to half the domain" />
			{#if wb.rawAt(gp)?.optical_window}
				<h4>Optical window</h4>
				<Field {wb} readonly={ro} path="{gp}.optical_window.x_um.0" label="x min" unit="µm" />
				<Field {wb} readonly={ro} path="{gp}.optical_window.x_um.1" label="x max" unit="µm" />
				<Field {wb} readonly={ro} path="{gp}.optical_window.y_um.0" label="y min" unit="µm" />
				<Field {wb} readonly={ro} path="{gp}.optical_window.y_um.1" label="y max" unit="µm" />
			{/if}
			<h4>Regions (painter order, later wins)</h4>
			<table class="grid"><tbody>
				{#each g?.regions ?? [] as r, i}<tr><td><button class="link" onclick={() => { wb.node = `region:${i}`; wb.highlight = { regions: [r.name], electrodes: [] }; }}>{r.name}</button></td><td>{r.material}</td><td class="muted">{shapeOf(wb.rawAt(`${gp}.regions.${i}`))}</td></tr>{/each}
				{#each g?.electrodes ?? [] as e, i}<tr><td><button class="link" onclick={() => { wb.node = `electrode:${i}`; wb.highlight = { regions: [], electrodes: [e.name] }; }}>{e.name}</button></td><td>{e.material}</td><td class="muted">electrode, weight {e.weight}</td></tr>{/each}
			</tbody></table>
		{:else if node.startsWith('region:')}
			{@const i = Number(node.slice(7))}
			{@const base = `${gp}.regions.${i}`}
			<Field {wb} readonly={ro} path="{base}.name" label="name" />
			<Field {wb} readonly={ro} path="{base}.material" label="material" options={Object.keys(raw.materials ?? {})} />
			{@render rectFields(base, wb.rawAt(base))}
		{:else if node.startsWith('electrode:')}
			{@const i = Number(node.slice(10))}
			{@const base = `${gp}.electrodes.${i}`}
			<Field {wb} readonly={ro} path="{base}.name" label="name" />
			<Field {wb} readonly={ro} path="{base}.role" label="role" />
			<Field {wb} readonly={ro} path="{base}.weight" label="weight" tip="Terminal potential weight; normalized to the line voltage" />
			<Field {wb} readonly={ro} path="{base}.material" label="material" options={Object.keys(raw.materials ?? {})} />
			{@render rectFields(base, wb.rawAt(base))}
		{:else if node === 'mesh'}
			<label class="f2" data-tip="Scales every mesh edge length (engine meshScale)">Mesh level
				<select aria-label="Mesh level" value={wb.meshScale} disabled={!!wb.busy} onchange={(e) => (wb.meshScale = Number(e.currentTarget.value))}>{#each MESH_LEVELS as m}<option value={m.value}>{m.label}</option>{/each}</select></label>
			<h4>Size hints</h4>
			{#each ['max_edge_um', 'electrode_edge_um', 'electrode_face_um', 'window_edge_um', 'far_edge_um', 'min_edge_um', 'grade', 'grade_far', 'max_vertices'] as k}
				{#if wb.rawAt(`${mp}.${k}`) != null || wb.rawAt(`${gp}.mesh.${k}`) != null || ['max_edge_um', 'electrode_edge_um', 'window_edge_um'].includes(k)}
					<Field {wb} path="{mp}.{k}" label={k} unit={unitOf(k)} />
				{/if}
			{/each}
			<Field {wb} path="{mp}.element_order" label="element order" options={ORDERS} tip="Electrostatic element order (1 = P1, 2 = P2); the geometric mesh is the same" />
			<div class="actions"><button class="on" onclick={() => wb.buildMesh()} disabled={!!wb.busy || wb.sweepRunning || !g}>Build mesh</button>{#if wb.meshStale}<span class="warn">stale</span>{/if}</div>
			{#if meshStats}
				<h4>Statistics {meshStats.semi ? '(solved semiconductor device mesh)' : meshStats.solved ? '(solved electrostatic mesh)' : '(built mesh)'}</h4>
				<dl class="kv num">
					<dt>nodes</dt><dd>{meshStats.nodes.toLocaleString()}</dd>
					<dt>triangles</dt><dd data-mesh-tris={meshStats.tris}>{meshStats.tris.toLocaleString()}</dd>
					<dt>edge length</dt><dd>{fmt(meshStats.smin)} to {fmt(meshStats.smax)} µm</dd>
					<dt>min angle</dt><dd>{fmt(meshStats.amin)} deg (mean {fmt(meshStats.amean)})</dd>
					{#if wb.meshMs != null && !meshStats.solved}<dt>build</dt><dd>{Math.round(wb.meshMs)} ms</dd>{/if}
				</dl>
			{/if}
		{:else if node === 'physics.es'}
			{@render readiness('electrostatics')}
			<p class="muted small" data-element-order={order}>Always runs. P{order} anisotropic FEM (mesh.element_order {order}{wb.rawAt(`${wb.geometryPath}.mesh.element_order`) == null ? ', engine default' : ''}); C' from energy and terminal charge; vacuum C0' gives n_RF, Z0, L'.</p>
			<Field {wb} path="{mp}.element_order" label="element order" options={ORDERS} tip="1 = linear (P1), 2 = quadratic (P2) Lagrange elements; empty = engine default" />
			<Field {wb} readonly={ro} path="{gp}.symmetry" label="symmetry" options={SYM} />
			{#each ['left', 'right', 'top', 'bottom'] as side}<Field {wb} readonly={ro} path="{gp}.boundary.{side}" label="boundary {side}" options={BC} />{/each}
			<h4>Terminals</h4>
			{#each g?.electrodes ?? [] as e, i}<Field {wb} readonly={ro} path="{gp}.electrodes.{i}.weight" label="{e.name} weight" tip="Potential weight of {e.name}" />{/each}
		{:else if node === 'physics.mode'}
			{@render stageToggle('optical_mode', 'Optical mode')}
			{@render readiness('optical_mode')}
			<Field {wb} path="optics.wavelength_nm" label="wavelength" unit="nm" />
			<Field {wb} path="optics.polarization" label="polarization" options={POLS} />
			<Field {wb} path="optics.mode_index" label="mode index" tip="0 = fundamental" />
			<Field {wb} path="optics.group_index_from" label="group index" options={GI} />
			<Field {wb} path="optics.ng_fixed" label="ng fixed" tip="Used only when group index = fixed" />
			<Field {wb} path="optics.solver" label="solver" options={SOLVERS} tip="scalar: P1 scalar FEM (forms E/H); vector: full-vector edge-element solver" />
			{#if solver === 'vector'}<Field {wb} path="optics.vector_order" label="vector order" options={VORDERS} tip="Element order of the vector solver (engine schema default 2)" />{/if}
			<Field {wb} path="optics.metal_in_window" label="metal in window" options={METAL} tip="reject (default) stops the solve; the other policies are explicit limits or need a sourced optical permittivity (lossy)" />
			{#if raw.optics?.metal_in_window === 'lossy'}<p class="muted small mono" data-tip="optics.metal_permittivity (edit in the YAML tab; needs a provenance entry)">metal_permittivity: {JSON.stringify(raw.optics?.metal_permittivity ?? null)}</p>{/if}
			<p class="muted small">Optical metal policy: <strong>{raw.optics?.metal_in_window ?? 'reject'}</strong>; solver <strong>{solver}</strong>. Only <span class="mono">lossy</span> with a sourced permittivity models metal absorption.</p>
		{:else if node === 'physics.eo'}
			{@render stageToggle('eo_overlap', 'EO overlap')}
			{@render readiness('eo_overlap')}
			{#if raw.optics?.eo}
				<Field {wb} path="optics.eo.arm_drive" label="arm drive" options={ARM} />
				<Field {wb} path="optics.eo.terminal_drive" label="terminal drive" options={TERM} />
				{#each Object.keys(raw.optics.eo.arm_windows ?? {}) as arm}
					<h4>Arm {arm} window</h4>
					<Field {wb} path="optics.eo.arm_windows.{arm}.x_um.0" label="x min" unit="µm" />
					<Field {wb} path="optics.eo.arm_windows.{arm}.x_um.1" label="x max" unit="µm" />
					<Field {wb} path="optics.eo.arm_windows.{arm}.y_um.0" label="y min" unit="µm" />
					<Field {wb} path="optics.eo.arm_windows.{arm}.y_um.1" label="y max" unit="µm" />
				{/each}
			{:else}<p class="muted">No <span class="mono">optics.eo</span> block: add arm windows in the YAML tab.</p>{/if}
		{:else if node === 'physics.rf'}
			{@render stageToggle('rf_line', 'RF line')}
			{@render readiness('rf_line')}
			{#if raw.line}
				<Field {wb} path="line.length_mm" label="length" unit="mm" />
				<Field {wb} path="line.differential" label="differential" bool />
				<Field {wb} path="line.loading.type" label="loading" options={LOADING} />
				<Field {wb} path="line.conductor_loss_model" label="conductor loss" options={COND} />
				<Field {wb} path="line.dielectric_loss_model" label="dielectric loss" options={DIEL} />
				{#if raw.line.source_ohm != null}<Field {wb} path="line.source_ohm" label="source" unit="Ω" />{/if}
				{#if raw.line.load_ohm != null}<Field {wb} path="line.load_ohm" label="load" unit="Ω" />{/if}
				{#if raw.line.loading?.type === 'periodic_t_rail'}
					<h4>Loaded line (periodic T-rail)</h4>
					{@render stageToggle('loaded_line', 'Loaded line')}
					{@render readiness('loaded_line')}
					<Field {wb} path="line.loading.period_um" label="period" unit="µm" />
					<Field {wb} path="line.loading.loaded_length_um" label="loaded length" unit="µm" />
				{/if}
				<h4>EO response (traveling wave)</h4>
				{@render stageToggle('eo_response', 'EO response')}
				{@render readiness('eo_response')}
			{:else}<p class="muted">No <span class="mono">line</span> block.</p>{/if}
			{#if raw.sweep}
				<h4>Frequency sweep</h4>
				<Field {wb} path="sweep.f_start_ghz" label="start" unit="GHz" />
				<Field {wb} path="sweep.f_stop_ghz" label="stop" unit="GHz" />
				<Field {wb} path="sweep.n_points" label="points" />
			{/if}
		{:else if node === 'physics.semi' || node.startsWith('semi.')}
			{@const sc = raw.semiconductor}
			{#if !sc}<p class="muted">No <span class="mono">semiconductor</span> block.</p>
			{:else if node === 'physics.semi'}
				{@render stageToggle('semiconductor', 'Semiconductor')}
				{@render readiness('semiconductor')}
				<p class="muted small">2D steady-state drift-diffusion on its own device mesh (no electrostatics stage), small-signal C', R', G', plasma dispersion and first-order mode perturbation for dn_eff, d alpha, VpiL. Only the EO response can follow it in the same Compute (needs line.rf_section and semiconductor.operating_bias_v; Study > Bias Sweep). Doping windows and contacts are drawn on the geometry.</p>
				<Field {wb} path="semiconductor.temperature_k" label="temperature" unit="K" tip="275-375 K (Sproul-Green range); empty = 300 K" />
				<Field {wb} path="semiconductor.poisson_domain" label="Poisson domain" options={ENUMS.poissonDomain} tip="semiconductor: insulators removed from the electrostatics (Si-only C'); empty = all" />
				{#each semiMats as m}
					<h4>Material {m}</h4>
					<Field {wb} path="semiconductor.materials.{m}.mobility.doping" label="mobility" options={ENUMS.semiMobility} tip="Doping-dependent mobility model (empty = masetti_1983)" />
					<Field {wb} path="semiconductor.materials.{m}.mobility.donor" label="donor" options={ENUMS.semiDonor} tip="Masetti electron column (empty = phosphorus)" />
					<Field {wb} path="semiconductor.materials.{m}.mobility.field" label="field" options={ENUMS.semiField} tip="High-field saturation (empty = caughey_thomas_1967)" />
					<Field {wb} path="semiconductor.materials.{m}.recombination.srh.tau_n_s" label="SRH tau_n" unit="s" tip="Omit the srh block for no recombination" />
					<Field {wb} path="semiconductor.materials.{m}.recombination.srh.tau_p_s" label="SRH tau_p" unit="s" />
				{/each}
				<h4>Doping ({sc.doping?.length ?? 0})</h4>
				<table class="grid small" data-semi-doping={sc.doping?.length ?? 0}><thead><tr><th>Name</th><th>Species</th><th>Profile</th><th>N (cm⁻³)</th></tr></thead><tbody>
					{#each dopingShapes(sc, g) as d}<tr><td><button class="link" onclick={() => (wb.node = `semi.doping:${d.index}`)}>{d.name}</button></td><td class:dn={d.species === 'donor'} class:ac={d.species === 'acceptor'}>{d.species}</td><td>{d.profile}</td><td class="num">{cm3Label(d.cm3)}</td></tr>{/each}
				</tbody></table>
				<h4>Contacts</h4>
				<table class="grid small"><tbody>
					{#each semiContacts(sc) as c}<tr><td><button class="link" onclick={() => (wb.node = `semi.contact:${c.index}`)}>{c.electrode}</button></td><td>{c.type}</td><td class="num">{c.biasV ?? 0} V</td></tr>{/each}
				</tbody></table>
				<h4>Mesh</h4>
				<Field {wb} path="semiconductor.mesh.semiconductor_edge_um" label="semiconductor edge" unit="µm" tip="Edge size in every semiconductor region (check the Debye length)" />
				<Field {wb} path="semiconductor.mesh.junction_edge_um" label="junction edge" unit="µm" tip="Edge size near N_D = N_A crossings (two-pass mesh)" />
			{:else if node.startsWith('semi.doping:')}
				{@const i = Number(node.slice(12))}
				{@const d = sc.doping?.[i] ?? {}}
				{@const base = `semiconductor.doping.${i}`}
				<Field {wb} path="{base}.name" label="name" />
				<Field {wb} path="{base}.species" label="species" options={ENUMS.semiSpecies} />
				<Field {wb} path="{base}.profile" label="profile" options={ENUMS.semiProfile} />
				{#if d.profile === 'uniform' || d.profile == null}<Field {wb} path="{base}.concentration_cm3" label="concentration" unit="cm⁻³" />
				{:else}<Field {wb} path="{base}.peak_cm3" label="peak" unit="cm⁻³" />
					{#each Object.keys(d.vertical ?? {}) as k}<Field {wb} path="{base}.vertical.{k}" label="vertical {k.replace(/_um$/, '')}" unit="µm" />{/each}
					{#if d.lateral}<Field {wb} path="{base}.lateral.x_um.0" label="lateral x min" unit="µm" /><Field {wb} path="{base}.lateral.x_um.1" label="lateral x max" unit="µm" />{#if d.lateral.straggle_um != null}<Field {wb} path="{base}.lateral.straggle_um" label="lateral straggle" unit="µm" />{/if}{/if}
				{/if}
				<h4>Within</h4>
				{#if d.within?.rect}{@render rectFields(`${base}.within`, d.within)}
				{:else}<p class="muted small mono" data-tip="Clip shape of this doping entry; edit in the YAML tab">{JSON.stringify(d.within ?? 'all semiconductor')}</p>{/if}
			{:else if node.startsWith('semi.contact:')}
				{@const i = Number(node.slice(13))}
				<Field {wb} path="semiconductor.contacts.{i}.electrode" label="electrode" options={g?.electrodes.map((e) => e.name) ?? []} />
				<Field {wb} path="semiconductor.contacts.{i}.bias_v" label="bias" unit="V" tip="DC bias of this contact; the swept contact's bias comes from the Bias Sweep" />
				<p class="muted small">Ohmic contact (charge neutrality and equilibrium at the contact); the electrode must touch the semiconductor.</p>
			{/if}
		{:else if node === 'study.bias'}
			{@render stageToggle('semiconductor', 'Semiconductor')}
			{@render readiness('semiconductor')}
			<Field {wb} path="semiconductor.bias.contact" label="swept contact" options={semiContacts(raw.semiconductor).map((c) => c.electrode)} tip="Contact whose bias is swept; the others stay at their bias_v. Reverse bias of a lateral PN: positive cathode bias." />
			<label class="f3" data-tip="Bias values of the swept contact: '0, 1, 2', 'start:step:stop' or 'linspace(a, b, n)' (written as a YAML list)"><span>bias values</span>
				<input type="text" aria-label="Bias values" value={biasText} disabled={!!wb.busy} spellcheck="false" onchange={(e) => commitBias(e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') commitBias(e.currentTarget.value); }} /><span class="u">V</span></label>
			{#if biasErr}<p class="crit small">{biasErr}</p>{/if}
			<Field {wb} path="semiconductor.bias.reference_v" label="reference" unit="V" tip="Reference bias of dn_eff and the secant VpiL (empty = first bias value)" />
			<Field {wb} path="semiconductor.operating_bias_v" label="operating bias" unit="V" tip="DC bias of the swept contact for the traveling-wave line (one of the bias values; reverse bias only for the EO response)" />
			<h4>Traveling-wave EO response</h4>
			{#if raw.line}<Field {wb} path="line.rf_section" label="RF section" options={wb.sections} tip="Electrode cross-section of the TWE line (line.rf_section); the junction loads it at the operating bias" />{/if}
			{#if wb.semiCombinable('eo_response')}{@render stageToggle('eo_response', 'EO response')}{@render readiness('eo_response')}
			{:else}<p class="muted small" data-semi-twe="unavailable">EO response after the semiconductor stage needs <span class="mono">line.rf_section</span> and <span class="mono">semiconductor.operating_bias_v</span>{raw.line ? '' : ' and a line block'}.</p>{/if}
			<h4>Small signal</h4>
			<Field {wb} path="semiconductor.small_signal.dv_v" label="dV" unit="V" tip="Central-difference step of C' (empty = 10 mV)" />
			<Field {wb} path="semiconductor.small_signal.capacitance" label="C'" bool />
			<Field {wb} path="semiconductor.small_signal.series_resistance" label="R'" bool />
			<h4>Optics</h4>
			<Field {wb} path="semiconductor.optics.plasma_dispersion" label="plasma dispersion" options={ENUMS.plasma} />
			<Field {wb} path="semiconductor.optics.wavelength_nm" label="wavelength" unit="nm" tip="Must equal optics.wavelength_nm (one mode solve per run)" />
			<Field {wb} path="semiconductor.optics.drive" label="drive" options={ENUMS.semiDrive} />
			<Field {wb} path="semiconductor.optics.density_basis" label="density basis" options={ENUMS.densityBasis} tip="absolute (default): dn(V) = f(N(V), P(V)) - f(N(V0), P(V0)); change: f applied to N(V) - N(V0)" />
			<Field {wb} path="semiconductor.optics.delta_eps" label="delta eps" options={ENUMS.deltaEps} tip="first_order (default): 2 n (dn + i dk); exact: (n + dn + i dk)^2 - n^2" />
			<label class="f2">Mesh level <select value={wb.meshScale} disabled={!!wb.busy} onchange={(e) => (wb.meshScale = Number(e.currentTarget.value))}>{#each MESH_LEVELS as m}<option value={m.value}>{m.label}</option>{/each}</select></label>
			<div class="actions"><button class="on" onclick={() => wb.compute()} disabled={!wb.canRun || !wb.semiSelected} data-tip={wb.semiSelected ? 'Solve every bias point' : 'Include the Semiconductor stage first'}>Compute</button><button onclick={() => wb.cancel()} disabled={!wb.busy}>Cancel</button></div>
		{:else if node === 'res.semi'}
			<SemiResults {wb} />
		{:else if node === 'study' || node === 'study.stationary'}
			<p class="muted small">{wb.semiSelected ? 'Semiconductor stage selected: no electrostatics; only the EO response can follow it (config keys line.rf_section, semiconductor.operating_bias_v).' : 'Electrostatics always runs; optional stages run in order.'}</p>
			{#each wb.stageList as s}{@render stageToggle(s.id, s.label)}{/each}
			<label class="f2">Mesh level <select value={wb.meshScale} disabled={!!wb.busy} onchange={(e) => (wb.meshScale = Number(e.currentTarget.value))}>{#each MESH_LEVELS as m}<option value={m.value}>{m.label}</option>{/each}</select></label>
			<div class="actions"><button class="on" onclick={() => wb.compute()} disabled={!wb.canRun}>Compute</button><button onclick={() => wb.cancel()} disabled={!wb.busy}>Cancel</button></div>
			{#if wb.result}<p class="small">Last run: {wb.result.id} · {wb.result.section} · {fmt(wb.result.elapsed_ms / 1000)} s engine{#if wb.stale} · <span class="warn">stale</span>{/if}</p>{/if}
		{:else if node === 'study.sweep'}
			<SweepSettings {wb} />
		{:else if node.startsWith('pg:') || node.startsWith('pf:')}
			{@const parts = node.split(':')}
			<PlotGroupSettings {wb} gid={parts[1]} fid={parts[2] ?? null} />
		{:else if node === 'res.eo'}
			<EoCoupling {wb} />
		{:else if node === 'results.derived'}
			<div class="actions">{#each Object.keys(DERIVED_LABEL) as k}<button onclick={() => { const d = R.addDerived(k as DerivedKind, { target: k.startsWith('surface') ? (R.selections[0]?.id ?? '') : k.startsWith('line') ? (R.cutLines[0]?.id ?? '') : k === 'point' ? (R.cutPoints[0]?.id ?? '') : '' }); wb.node = `dv:${d.id}`; }} class="small">+ {DERIVED_LABEL[k as DerivedKind]}</button>{/each}</div>
			<DerivedValues {wb} />
		{:else if node === 'results' || node.startsWith('res.') || node.startsWith('ds:') || node.startsWith('sel:') || node.startsWith('dv:') || node.startsWith('tbl:')}
			<ResultsPages {wb} {node} />
		{:else if node === 'results.targets'}
			<p class="muted small" data-solution-label={wb.solutionLabel(-1)}>Solution: {wb.solutionLabel(-1)} (paper targets of the last Compute; sweep targets are on the Sweep plot group).</p>
			<TargetsTable {wb} />
		{:else if node === 'results.rf'}
			<SolutionSelect {wb} value={wb.rfPoint} onchange={(p) => (wb.rfPoint = p)} />
			{#if wb.rfPoint >= 0}<RfPoint {wb} point={wb.rfPoint} />
			{:else if wb.result?.rf || wb.result?.loaded || wb.result?.response}<SimStageResults result={wb.result} part="rf" />{:else}<p class="muted">No RF line result. Include the RF line, loaded line or EO response stage and Compute.</p>{/if}
		{:else if node === 'results.sweep'}
			<SweepPlot {wb} />
		{/if}
	</div>
</div>

<style>
	.settings { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; background: var(--surface); }
	.head { display: flex; align-items: center; gap: 8px; padding: 0 0 0 8px; border-bottom: 1px solid var(--border); min-width: 0; }
	.title { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.grow { flex: 1; }
	.tabs { display: flex; }
	.tabs button { border: 0; border-left: 1px solid var(--border); height: 28px; background: none; color: var(--ink-3); border-radius: 0; }
	.tabs button.on { color: var(--ink); background: var(--surface-2); box-shadow: inset 0 -2px var(--accent); }
	.body { overflow: auto; padding: 8px; min-height: 0; }
	textarea { width: 100%; height: 100%; min-height: 300px; resize: none; color: var(--ink); background: var(--bg); border: 1px solid var(--border); font: 11px/1.5 var(--mono); padding: 8px; white-space: pre; border-radius: 0; }
	h3 { font-size: 13px; margin: 0 0 8px; }
	h4 { font-size: 11px; color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.04em; margin: 12px 0 4px; }
	p { margin: 6px 0; line-height: 1.5; overflow-wrap: anywhere; }
	.small { font-size: 11px; }
	.crit { color: var(--crit); }
	.warn { color: var(--warn); }
	ul { padding-left: 16px; margin: 4px 0; } li { margin: 3px 0; overflow-wrap: anywhere; }
	.kv { display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 2px 10px; margin: 6px 0; }
	.kv dt { color: var(--ink-3); } .kv dd { margin: 0; overflow-wrap: anywhere; }
	details { margin-top: 10px; overflow-wrap: anywhere; } summary { cursor: pointer; color: var(--ink-2); }
	details dt { margin-top: 8px; color: var(--ink-2); } details dd { margin: 2px 0 0; color: var(--ink-3); }
	.grid { width: 100%; border-collapse: collapse; } .grid th, .grid td { padding: 3px 4px; text-align: left; border-bottom: 1px solid var(--border); }
	.grid th { color: var(--ink-3); font-weight: 500; }
	.link { border: 0; background: none; padding: 0; height: auto; color: var(--accent); border-radius: 0; }
	.toggle { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
	.f2 { display: flex; align-items: center; gap: 8px; margin: 6px 0; color: var(--ink-2); }
	.f2 select { border-radius: 0; }
	.f3 { display: grid; grid-template-columns: minmax(70px, 42%) minmax(0, 1fr) 42px; align-items: center; gap: 6px; padding: 1px 0; color: var(--ink-2); }
	.f3 input { width: 100%; height: 22px; border-radius: 0; }
	.f3 .u { color: var(--ink-3); font-size: 11px; }
	td.dn { color: #e0603a; } td.ac { color: #3987e5; }
	.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin: 10px 0; }
	.actions button { border-radius: 0; }
	button:disabled { opacity: 0.5; cursor: default; }
	a { color: var(--accent); }
</style>
