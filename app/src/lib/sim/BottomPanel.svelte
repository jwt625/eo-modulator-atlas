<script lang="ts">
	import { OPTIONAL, clock, type Workbench } from './workbench.svelte';
	import { METRIC_LABELS } from './labels';
	import { downloadText, toCsv } from './exportUtil';
	import { fmt } from '../logic';

	let { wb }: { wb: Workbench } = $props();
	let paneEl: HTMLDivElement | undefined = $state();
	let prevErrors = 0;

	const p = $derived(wb.parsed);
	const blockedStages = $derived(p.config && !p.error ? OPTIONAL.filter((s) => wb.stageError(s.id)) : []);
	const nErrors = $derived((p.error ? 1 : 0) + (wb.missingConfig ? 1 : 0) + (wb.blocked.length ? 1 : 0) + (wb.error ? 1 : 0));
	const policyNote = $derived((wb.selected.includes('optical_mode') || wb.selected.includes('eo_overlap')) && !!p.config);
	// U13: every message row carries the time it first appeared (kept while the message persists).
	interface Msg { key: string; kind: 'crit' | 'notice' | 'muted'; alert?: boolean; text: string; stage?: string; t?: number }
	const messages: Msg[] = $derived.by(() => {
		const out: Msg[] = [];
		if (wb.missingConfig) out.push({ key: 'missing', kind: 'crit', alert: true, text: 'The requested config is not in this atlas.' });
		if (p.error) out.push({ key: `parse:${p.error}`, kind: 'crit', alert: true, text: `${p.config ? 'Preview only. Solve blocked: ' : ''}${p.error}` });
		for (const st of blockedStages) out.push({ key: `blocked:${st.id}:${wb.stageError(st.id)}`, kind: 'muted', stage: st.id, text: `${st.label} blocked: ${wb.stageError(st.id)}` });
		if (wb.blocked.length) out.push({ key: `sel:${wb.blocked.join()}`, kind: 'crit', alert: true, text: `Selected stage blocked: ${wb.blocked.join(', ').replaceAll('_', ' ')}. Clear it or fix its inputs.` });
		if (wb.error) out.push({ key: `err:${wb.error}`, kind: 'crit', alert: true, text: wb.error });
		if (wb.stale) out.push({ key: 'stale', kind: 'notice', text: 'Inputs changed. These results belong to the previous run.' });
		if (wb.sweepStale) out.push({ key: 'sweepstale', kind: 'notice', text: 'Inputs changed since the sweep ran. Sweep results belong to the previous inputs.' });
		if (policyNote) out.push({ key: `policy:${p.config?.raw.optics?.metal_in_window}`, kind: 'muted', text: `Optical metal policy: ${p.config?.raw.optics?.metal_in_window ?? 'reject'}. Metal in the window is rejected by default; the other policies are explicit limits. A failed requested stage stops the run.` });
		for (const n of wb.notices) out.push({ key: `notice:${n.t}:${n.msg}`, kind: n.level === 'info' ? 'muted' : 'notice', text: n.msg, t: n.t });
		return out;
	});
	const nMessages = $derived(messages.filter((m) => m.kind !== 'muted' || m.stage).length);
	const firstSeen = new Map<string, number>();
	const seenAt = (m: Msg) => {
		if (m.t) return m.t;
		if (!firstSeen.has(m.key)) firstSeen.set(m.key, Date.now());
		return firstSeen.get(m.key)!;
	};
	$effect(() => {
		const keys = new Set(messages.map((m) => m.key));
		for (const k of [...firstSeen.keys()]) if (!keys.has(k)) firstSeen.delete(k);
	});
	const tabs = [
		['messages', 'Messages'],
		['progress', 'Progress'],
		['log', 'Log'],
		['table', 'Table']
	] as const;

	$effect(() => {
		void wb.log.length;
		if (paneEl && wb.bottomTab === 'log') paneEl.scrollTop = paneEl.scrollHeight;
	});
	// New blocking problems bring the Messages tab forward.
	$effect(() => {
		const n = nErrors;
		if (n > prevErrors) wb.bottomTab = 'messages';
		prevErrors = n;
	});

	function saveLog() {
		const d = new Date();
		const p2 = (n: number) => String(n).padStart(2, '0');
		const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
		downloadText(`sim-log-${stamp}.txt`, wb.log.map((e) => `${new Date(e.t).toISOString()} ${e.level.toUpperCase()} ${e.msg}`).join('\n') + '\n', 'text/plain');
	}

	function exportDerived() {
		const r = wb.result;
		if (!r) return;
		downloadText(`${r.id}-${r.section}-derived.csv`, toCsv(['key', 'label', 'value', 'unit'], Object.entries(r.metrics).map(([k, v]) => [k, METRIC_LABELS[k]?.[0] ?? k, v, METRIC_LABELS[k]?.[1] ?? ''])));
	}
</script>

<div class="bottom">
	<div class="tabs" role="tablist" aria-label="Output panels">
		{#each tabs as [id, label]}
			<button role="tab" aria-selected={wb.bottomTab === id} class:on={wb.bottomTab === id} onclick={() => (wb.bottomTab = id)}>
				{label}{#if id === 'messages' && nMessages}<span class="count" class:err={nErrors > 0}>{nMessages}</span>{/if}
			</button>
		{/each}
		<span class="grow"></span>
		<span class="status" role="status" data-status={wb.progress}>{#if wb.busy || wb.sweepRunning}<span class="spinner"></span>{/if}{wb.progress}</span>
	</div>
	<div class="pane" bind:this={paneEl}>
		{#if wb.bottomTab === 'messages'}
			{#each messages as m (m.key)}
				<div class="row msg {m.kind}" role={m.alert ? 'alert' : undefined} data-stage-blocked={m.stage}><span class="t">{clock(seenAt(m))}</span><span>{m.text}</span></div>
			{/each}
			{#if wb.notices.length}<button class="clear" onclick={() => (wb.notices = [])} title="Clear runtime notices">Clear notices</button>{/if}
			{#if !messages.length}<p class="muted">No messages.</p>{/if}
		{:else if wb.bottomTab === 'progress'}
			{#if wb.sweepRows.length}
				<div class="pbar" title="Sweep points finished"><i style:width="{(100 * wb.sweepDone) / wb.sweepRows.length}%"></i></div>
			{/if}
			{#each wb.progressRows as e}<div class="row {e.level}"><span class="t">{clock(e.t)}</span><span>{e.msg}</span></div>{/each}
			{#if !wb.progressRows.length}<p class="muted">Idle.</p>{/if}
		{:else if wb.bottomTab === 'log'}
			<div class="logtools"><button onclick={saveLog} title="Download the log as a timestamped text file">Save</button><button onclick={() => (wb.log = [])}>Clear</button></div>
			{#each wb.log as e}<div class="row {e.level}"><span class="t">{clock(e.t)}</span><span>{e.msg}</span></div>{/each}
		{:else}
			{#if wb.result}
				<div class="logtools"><span class="muted">{wb.result.id} · {wb.result.section}{wb.stale ? ' · stale' : ''}</span><button onclick={exportDerived}>CSV</button></div>
				<table class="grid" aria-label="Derived values table"><tbody>
					<tr>{#each Object.keys(wb.result.metrics) as k}<th title={METRIC_LABELS[k]?.[2] ?? k}>{METRIC_LABELS[k]?.[0] ?? k}{METRIC_LABELS[k]?.[1] ? ` (${METRIC_LABELS[k][1]})` : ''}</th>{/each}</tr>
					<tr>{#each Object.values(wb.result.metrics) as v}<td class="num">{fmt(v, 6)}</td>{/each}</tr>
				</tbody></table>
			{:else}<p class="muted">No results.</p>{/if}
			{#if wb.sweepRows.length}
				<p class="muted">Sweep: {wb.sweepDone}/{wb.sweepRows.length} points (Results, Sweep Plot has the table and CSV).</p>
			{/if}
		{/if}
	</div>
</div>

<style>
	.bottom { display: grid; grid-template-rows: auto minmax(0, 1fr); height: 100%; min-height: 0; background: var(--surface); }
	.tabs { display: flex; align-items: center; border-bottom: 1px solid var(--border); min-width: 0; }
	.tabs button { border: 0; border-right: 1px solid var(--border); height: 26px; background: none; color: var(--ink-3); display: flex; align-items: center; gap: 4px; border-radius: 0; }
	.tabs button.on { color: var(--ink); background: var(--surface-2); box-shadow: inset 0 -2px var(--accent); }
	.count { font-size: 10px; padding: 0 4px; border: 1px solid var(--ink-3); border-radius: 0; line-height: 13px; }
	.count.err { color: var(--crit); border-color: var(--crit); }
	.grow { flex: 1; }
	.status { display: flex; align-items: center; gap: 6px; padding: 0 8px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60%; }
	.pane { overflow: auto; padding: 4px 8px; min-height: 0; }
	p { margin: 4px 0; line-height: 1.45; overflow-wrap: anywhere; }
	.crit { color: var(--crit); }
	.notice { color: var(--warn); }
	.row { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 8px; font: 11px/1.45 var(--mono); }
	.row .t { color: var(--ink-3); }
	.row.error { color: var(--crit); } .row.warn { color: var(--warn); }
	.row.msg { font: 12px/1.45 var(--sans); } .row.msg .t { font: 11px/1.6 var(--mono); }
	.row.crit { color: var(--crit); } .row.notice { color: var(--warn); } .row.muted { color: var(--ink-3); }
	.clear { height: 20px; font-size: 11px; margin-top: 4px; border-radius: 0; }
	.logtools { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
	.logtools button { height: 20px; font-size: 11px; border-radius: 0; }
	.pbar { height: 3px; background: var(--grid); margin: 2px 0 6px; }
	.pbar i { display: block; height: 100%; background: var(--accent); }
	.grid { border-collapse: collapse; } .grid th, .grid td { padding: 2px 8px; text-align: left; border: 1px solid var(--border); white-space: nowrap; } .grid th { color: var(--ink-3); font-weight: 500; }
</style>
