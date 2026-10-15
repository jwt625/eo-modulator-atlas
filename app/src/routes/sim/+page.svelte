<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { store } from '../../lib/state.svelte';
	import { staticUrl, link } from '../../lib/paths';
	import { Workbench, OPTIONAL, MESH_LEVELS } from '../../lib/sim/workbench.svelte';
	import { readUrlState, writeUrlState } from '../../lib/sim/urlState';
	import ModelTree from '../../lib/sim/ModelTree.svelte';
	import Settings from '../../lib/sim/Settings.svelte';
	import Graphics from '../../lib/sim/Graphics.svelte';
	import BottomPanel from '../../lib/sim/BottomPanel.svelte';
	import Splitter from '../../lib/sim/Splitter.svelte';

	const wb = new Workbench();
	const sims = $derived(store.atlas?.sims ?? []);
	const urlState = $derived(readUrlState(page.url.searchParams));
	const requested = $derived(urlState.id);
	const chosen = $derived(requested ? sims.find((s) => s.id === requested || s.path === requested) : sims[0]);

	// Panel sizes (per-viewer convenience; storage may be unavailable).
	const SIZE_KEY = 'eo-atlas-sim-panels';
	let treeW = $state(210);
	let setW = $state(360);
	let botH = $state(170);
	onMount(() => {
		try {
			const s = JSON.parse(localStorage.getItem(SIZE_KEY) ?? 'null');
			if (s && [s.treeW, s.setW, s.botH].every(Number.isFinite)) ({ treeW, setW, botH } = s);
		} catch {
			/* storage unavailable */
		}
		// Diagnostics for renderer measurements (DevLog-027): dev server or ?debug=1 only; synthetic code loads lazily.
		if (import.meta.env.DEV || page.url.searchParams.get('debug') === '1') {
			const w = window as unknown as Record<string, unknown>;
			w.__simWorkbench = wb;
			w.__simSynthetic = async (n: number) => {
				const { syntheticEs } = await import('../../lib/sim/synthetic');
				wb.fields = { es: syntheticEs(n) };
				wb.resultAt = performance.now();
				wb.paintInfo = null;
				wb.quantity = 'phi';
			};
		}
	});
	function saveSizes() {
		try {
			localStorage.setItem(SIZE_KEY, JSON.stringify({ treeW, setW, botH }));
		} catch {
			/* storage unavailable */
		}
	}
	const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

	onDestroy(() => wb.stopAll());
	$effect(() => {
		wb.missingConfig = !!requested && !chosen && sims.length > 0;
	});

	$effect(() => {
		const sim = chosen;
		const st = untrack(() => urlState);
		untrack(() => {
			wb.stopAll();
			wb.text = '';
			wb.result = null;
			wb.fields = null;
			wb.error = '';
			wb.section = 'geometry';
			wb.progress = '';
		});
		if (!sim) return;
		const controller = new AbortController();
		wb.loading = true;
		fetch(staticUrl(sim.path), { signal: controller.signal })
			.then(async (res) => {
				if (!res.ok) throw new Error(`Config: HTTP ${res.status}`);
				return res.text();
			})
			.then((value) => {
				if (controller.signal.aborted) return;
				wb.loading = false;
				wb.load(value, st.overrides);
				wb.addLog(`Loaded ${sim.id} (${sim.path})`);
				if (st.section && wb.sections.includes(st.section)) wb.section = st.section;
				if (st.mesh != null && MESH_LEVELS.some((m) => m.value === st.mesh)) wb.meshScale = st.mesh;
				if (st.stages) wb.selected = st.stages.filter((s) => OPTIONAL.some((o) => o.id === s));
				if (st.sweep?.path.startsWith('study:')) wb.sweepStudy = st.sweep.path.slice(6);
				else if (st.sweep) {
					wb.sweepPath = st.sweep.path;
					wb.sweepSpec = st.sweep.values;
				}
			})
			.catch((e) => {
				if (controller.signal.aborted) return;
				wb.error = String(e);
				wb.loading = false;
				wb.addLog(String(e), 'error');
			});
		return () => controller.abort();
	});

	// Session options (pool cap, renderer, diagnostics) survive config switches (U9).
	function switchConfig(id: string) {
		const keep = new URLSearchParams();
		keep.set('id', id);
		for (const k of ['pool', 'renderer', 'debug']) {
			const v = page.url.searchParams.get(k);
			if (v != null) keep.set(k, v);
		}
		void goto(link(`/sim?${keep.toString()}`));
	}

	async function copyLink() {
		const qs = writeUrlState({
			id: chosen?.id ?? null, section: wb.section, mesh: wb.meshScale, stages: wb.selected, overrides: wb.overrides,
			sweep: wb.sweepStudy ? { path: `study:${wb.sweepStudy}`, values: '' } : wb.sweepPath && wb.sweepSpec ? { path: wb.sweepPath, values: wb.sweepSpec } : null
		});
		const url = `${location.origin}${link('/sim')}?${qs}`;
		if (wb.hasFreeEdits) wb.addLog('Link does not include free YAML-tab edits or removed keys; only config, section, mesh level, stages, form overrides and sweep are encoded.', 'warn');
		try {
			await navigator.clipboard.writeText(url);
			wb.addLog(`Link copied: ${url}`);
		} catch {
			wb.addLog(`Link (copy blocked by the browser): ${url}`, 'warn');
			wb.bottomTab = 'log';
		}
	}
</script>

<svelte:head><title>Simulation · EO Modulator Atlas</title></svelte:head>
<div class="sim-page" style:--tree-w="{treeW}px" style:--set-w="{setW}px" style:--bot-h="{botH}px">
	<div class="toolbar">
		<label title="Simulation config (sims/*/config.yaml)">Config
			<select aria-label="Simulation config" value={chosen?.id ?? ''} disabled={store.loading} onchange={(e) => switchConfig(e.currentTarget.value)}>
				{#if !chosen}<option value="">{store.loading ? 'Loading atlas...' : 'Unknown config'}</option>{/if}
				{#each sims as s}<option value={s.id}>{s.id} · {s.paper_id}</option>{/each}
			</select>
		</label>
		<label title="Cross-section (geometry or alt_geometries)">Section
			<select aria-label="Cross-section" bind:value={wb.section} disabled={!!wb.busy}>{#each wb.sections as name}<option value={name}>{name}</option>{/each}</select>
		</label>
		<label title="Scales every mesh edge length">Mesh
			<select aria-label="Mesh resolution" bind:value={wb.meshScale} disabled={!!wb.busy}>{#each MESH_LEVELS as m}<option value={m.value}>{m.label}</option>{/each}</select>
		</label>
		<fieldset class="stages" aria-label="Stages">
			<label title="Always runs"><input type="checkbox" checked disabled /> Electrostatics</label>
			{#each OPTIONAL as s}
				{@const err = wb.stageError(s.id)}
				<label title={err ?? 'Inputs pass the input boundary'} class:blocked={!!err}><input type="checkbox" checked={wb.selected.includes(s.id)} disabled={!!wb.busy || (!!err && !wb.selected.includes(s.id))} onchange={(e) => wb.toggleStage(s.id, e.currentTarget.checked)} /> {s.label}</label>
			{/each}
		</fieldset>
		<div class="acts">
			<button onclick={() => wb.buildMesh()} disabled={!!wb.busy || wb.sweepRunning || wb.loading || !wb.geometry} title="Build the electrostatic mesh only (Mesh node shows statistics)">Build mesh</button>
			<button class="on" onclick={() => wb.compute()} disabled={!wb.canRun} title="Run the study: electrostatics plus the selected stages">Compute</button>
			<button onclick={() => wb.cancel()} disabled={!wb.busy && !wb.sweepRunning} title="Stop the running solve, mesh build or sweep">Cancel</button>
			<button onclick={copyLink} disabled={!chosen} title="Copy a link with config, section, mesh level, stages, form overrides and sweep. Free YAML-tab edits and removed keys are not encoded (a log warning says so when present).">Link</button>
		</div>
	</div>
	<div class="busyline" class:on={!!wb.busy || wb.sweepRunning}></div>
	<div class="main">
		<div class="p p-tree"><ModelTree {wb} /></div>
		<Splitter dir="x" label="Resize model tree" onmove={(d) => { treeW = clamp(treeW + d, 140, 480); saveSizes(); }} />
		<div class="p p-set"><Settings {wb} downloadHref={chosen ? staticUrl(chosen.path) : null} /></div>
		<Splitter dir="x" label="Resize settings" onmove={(d) => { setW = clamp(setW + d, 240, 900); saveSizes(); }} />
		<div class="p p-gfx"><Graphics {wb} /></div>
	</div>
	<Splitter dir="y" label="Resize output panel" onmove={(d) => { botH = clamp(botH - d, 60, 600); saveSizes(); }} />
	<div class="p p-bot"><BottomPanel {wb} /></div>
</div>

<style>
	.sim-page { height: 100%; display: grid; grid-template-rows: auto 2px minmax(0, 1fr) 4px var(--bot-h); min-width: 0; background: var(--bg); }
	.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 4px 8px; background: var(--surface); border-bottom: 1px solid var(--border); min-width: 0; }
	.toolbar label { display: flex; align-items: center; gap: 4px; color: var(--ink-2); }
	.toolbar select { max-width: 220px; border-radius: 0; }
	.stages { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; border: 1px solid var(--border); margin: 0; padding: 1px 8px; border-radius: 0; }
	.stages label.blocked { color: var(--ink-3); }
	.acts { display: flex; gap: 4px; margin-left: auto; }
	.acts button { border-radius: 0; }
	button:disabled { opacity: 0.5; cursor: default; }
	.busyline { background: transparent; overflow: hidden; position: relative; }
	.busyline.on::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 30%; background: var(--accent); animation: slide 1.2s linear infinite; }
	@keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
	.main { display: grid; grid-template-columns: var(--tree-w) 4px var(--set-w) 4px minmax(0, 1fr); min-height: 0; min-width: 0; }
	.p { min-width: 0; min-height: 0; overflow: hidden; }
	@media (max-width: 760px) {
		.sim-page { display: block; overflow-y: auto; overflow-x: hidden; }
		.toolbar { gap: 4px 8px; }
		.toolbar select { max-width: 100%; }
		.toolbar label { flex: 1 1 auto; min-width: 0; }
		.acts { margin-left: 0; width: 100%; }
		.acts button { flex: 1; }
		.main { display: flex; flex-direction: column; }
		.main > :global(.split), .sim-page > :global(.split) { display: none; }
		.p-tree { height: 220px; border-bottom: 1px solid var(--border); }
		.p-set { height: auto; max-height: 70vh; display: flex; flex-direction: column; border-bottom: 1px solid var(--border); }
		.p-gfx { height: 380px; border-bottom: 1px solid var(--border); }
		.p-bot { height: 240px; }
	}
</style>
