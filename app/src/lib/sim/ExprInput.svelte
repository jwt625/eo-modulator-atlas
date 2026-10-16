<script lang="ts">
	// Expression field (COMSOL Expression): typed text is committed as written (Enter, blur); a suggestion replaces the
	// word at the cursor only when chosen with the arrow keys + Enter, Tab or a click. Inline check (syntax, unit,
	// display-unit compatibility; integrated unit for integrals) and an Insert/Replace Expression browser of the
	// variable registry (grouped, with units and descriptions, filter field).
	import type { Workbench } from './workbench.svelte';
	import type { CheckResult, VariableInfo } from './post/contract';
	import { formatUnit, parseExpression } from '../../../../engine/src/postproc/index.mjs';
	import { StaleError } from './post/client';
	import { splitTop } from './exprSplit';
	import { EXPRESSION_FUNCTIONS, prettyUnit } from './post/ui';

	interface Props {
		wb: Workbench;
		dataset: string;
		value: string;
		unit?: string;
		label: string;
		/** Extra variables (e.g. sweep globals) offered and accepted without a worker check. */
		extra?: VariableInfo[];
		/** Check on the main thread only (sweep globals; comma-separated lists are split). */
		local?: boolean;
		/** Integration measure added to the shown unit ('m^2' surface, 'm' line). */
		measure?: '' | 'm^2' | 'm';
		/** Sweep point solution addressed by the check. */
		sol?: string;
		onchange: (v: string) => void;
	}
	let { wb, dataset, value, unit = '', label, extra = [], local = false, measure = '', sol, onchange }: Props = $props();

	let text = $state('');
	let focused = $state(false);
	let caret = $state(0);
	/** -1 = no suggestion chosen (Enter commits the typed text). */
	let active = $state(-1);
	let input: HTMLInputElement;
	let check = $state<{ ok: boolean; msg: string } | null>(null);
	let timer: ReturnType<typeof setTimeout> | null = null;
	let browse = $state(false);
	let filter = $state('');

	$effect(() => {
		text = value;
	});

	const vars: VariableInfo[] = $derived.by(() => {
		const own = wb.vars[dataset] ?? (Object.values(wb.vars)[0] ?? []).filter((v) => v.location === 'global');
		const seen = new Set<string>();
		return [...extra, ...own].filter((v) => (seen.has(v.name) ? false : (seen.add(v.name), true)));
	});
	const token = $derived.by(() => {
		const m = /[A-Za-z_][\w.]*$/.exec(text.slice(0, caret));
		return m ? { start: caret - m[0].length, word: m[0] } : null;
	});
	const suggestions = $derived.by(() => {
		if (!focused || !token) return [];
		const w = token.word.toLowerCase();
		const all = [...vars.map((v) => ({ name: v.name, detail: `${prettyUnit(v.unit)}  ${v.description}` })), ...EXPRESSION_FUNCTIONS.map((n) => ({ name: `${n}(`, detail: 'function' }))];
		// Exact match first, then prefix matches, then (for 2+ letters) substring matches.
		const exact = all.filter((s) => s.name.toLowerCase() === w);
		const pre = all.filter((s) => s.name.toLowerCase() !== w && s.name.toLowerCase().startsWith(w));
		const sub = w.length > 1 ? all.filter((s) => !s.name.toLowerCase().startsWith(w) && s.name.toLowerCase().includes(w)) : [];
		const hits = [...exact, ...pre, ...sub].slice(0, 12);
		return hits.length === 1 && hits[0].name === token.word ? [] : hits;
	});
	const groups = $derived.by(() => {
		const f = filter.trim().toLowerCase();
		const m = new Map<string, VariableInfo[]>();
		for (const v of vars) {
			if (f && !`${v.name} ${v.description}`.toLowerCase().includes(f)) continue;
			const g = v.group || (v.location === 'global' ? 'global' : 'other');
			m.set(g, [...(m.get(g) ?? []), v]);
		}
		// Field quantities first, then globals, coordinates and constants.
		const rank = (g: string) => (g === 'constants' ? 3 : g === 'coordinates' ? 2 : g === 'global' ? 1 : 0);
		return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0]));
	});

	const addMeasure = (dim: number[]) => (measure === 'm^2' ? [dim[0] + 2, dim[1], dim[2], dim[3]] : measure === 'm' ? [dim[0] + 1, dim[1], dim[2], dim[3]] : dim);

	function runCheck(t: string, u: string) {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			if (!t.trim()) {
				check = null;
				return;
			}
			const parts = splitTop(t);
			if (local || !wb.post) {
				try {
					for (const p of parts) parseExpression(p);
					check = null;
				} catch (e) {
					check = { ok: false, msg: e instanceof Error ? e.message : String(e) };
				}
				return;
			}
			// Comma-separated lists (Global y-axis data) are checked expression by expression.
			const client = wb.post;
			Promise.all(parts.map((p, i) => client.request<CheckResult>({ op: 'check', dataset, mode: sol ? undefined : wb.results.mode(dataset), expr: p, unit: measure ? '' : u, sol }, `check:${label}:${i}`)))
				.then((rs) => rs[0])
				.then((r) => {
					const shown = measure ? (u || formatUnit(addMeasure(r.dim) as [number, number, number, number])) : r.unit;
					check = { ok: true, msg: `${prettyUnit(shown)}${measure ? ' (integrated)' : r.global ? ', global' : r.continuous ? ', continuous' : ', per element'}` };
				})
				.catch((e) => {
					if (!(e instanceof StaleError)) check = { ok: false, msg: e instanceof Error ? e.message : String(e) };
				});
		}, 300);
	}
	$effect(() => {
		runCheck(text, unit);
	});

	function commit() {
		const v = text.trim();
		if (v !== value) onchange(v);
	}
	function pick(name: string) {
		if (!token) return;
		text = text.slice(0, token.start) + name + text.slice(caret);
		const pos = token.start + name.length;
		queueMicrotask(() => {
			input.setSelectionRange(pos, pos);
			caret = pos;
		});
		active = -1;
		if (!name.endsWith('(')) commit();
	}
	function onKey(e: KeyboardEvent) {
		if (suggestions.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
			active = active < 0 ? (e.key === 'ArrowDown' ? 0 : suggestions.length - 1) : (active + (e.key === 'ArrowDown' ? 1 : suggestions.length - 1)) % suggestions.length;
			e.preventDefault();
			return;
		}
		if (suggestions.length && e.key === 'Tab' && !e.shiftKey) {
			pick(suggestions[Math.max(0, active)].name);
			e.preventDefault();
			return;
		}
		if (e.key === 'Enter') {
			// A suggestion is used only when it was chosen with the arrow keys; otherwise the typed text is committed.
			if (active >= 0 && suggestions[active]) {
				pick(suggestions[active].name);
				e.preventDefault();
				return;
			}
			commit();
			focused = false;
		}
		if (e.key === 'Escape') {
			focused = false;
			active = -1;
		}
	}
	/** Expression browser: replace the whole expression, or insert the name at the cursor. */
	function choose(name: string, mode: 'replace' | 'insert') {
		text = mode === 'replace' ? name : text.slice(0, caret) + name + text.slice(caret);
		browse = false;
		commit();
		wb.addLog(`${label}: ${mode === 'replace' ? 'replaced by' : 'inserted'} ${name}`);
	}
</script>

<div class="ex">
	<div class="row">
		<input bind:this={input} type="text" spellcheck="false" autocomplete="off" aria-label={label} class:bad={check && !check.ok} bind:value={text}
			onfocus={() => (focused = true)} onblur={() => { setTimeout(() => (focused = false), 120); commit(); }}
			oninput={(e) => { caret = e.currentTarget.selectionStart ?? text.length; active = -1; focused = true; }}
			onkeyup={(e) => (caret = e.currentTarget.selectionStart ?? caret)} onclick={(e) => (caret = e.currentTarget.selectionStart ?? caret)} onkeydown={onKey} />
		<button class="br" class:on={browse} aria-label="Browse variables" data-tip="Insert or replace an expression from the variable registry (units, descriptions)" onclick={() => (browse = !browse)}>
			<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M1 2h10M1 6h10M1 10h6" stroke="currentColor" stroke-width="1.4" fill="none" /></svg>
		</button>
	</div>
	{#if suggestions.length && !browse}
		<div class="ac" role="listbox" aria-label="Variables">
			{#each suggestions as s, i}
				<button role="option" aria-selected={i === active} class:on={i === active} onmousedown={(e) => { e.preventDefault(); pick(s.name); }} data-tip={s.detail}><span class="mono">{s.name}</span><span class="d">{s.detail}</span></button>
			{/each}
		</div>
	{/if}
	{#if browse}
		<div class="brw" role="dialog" aria-label="Expression browser">
			<input type="text" placeholder="filter" aria-label="Filter variables" bind:value={filter} />
			<div class="list">
				{#each groups as [g, list]}
					<div class="gh">{g}</div>
					{#each list as v}
						<div class="vr">
							<button class="nm" onclick={() => choose(v.name, 'replace')} data-tip="Replace the expression with {v.name}"><span class="mono">{v.name}</span><span class="u">{prettyUnit(v.unit)}</span><span class="d2">{v.description}</span></button>
							<button class="ins" onclick={() => choose(v.name, 'insert')} data-tip="Insert {v.name} at the cursor">ins</button>
						</div>
					{/each}
				{:else}<p class="muted small">No match.</p>{/each}
			</div>
		</div>
	{/if}
	{#if check}<div class="chk" class:err={!check.ok} data-expr-check={check.ok ? 'ok' : 'error'}>{check.ok ? `-> ${check.msg}` : check.msg}</div>{/if}
</div>

<style>
	.ex { position: relative; min-width: 0; }
	.row { display: flex; min-width: 0; }
	input { flex: 1; min-width: 0; width: 100%; height: 22px; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; font: 12px var(--mono); border-radius: 0; }
	input.bad { border-color: var(--crit); }
	.br { flex: none; width: 22px; height: 22px; padding: 0; margin-left: -1px; display: flex; align-items: center; justify-content: center; border-radius: 0; }
	.ac, .brw { position: absolute; z-index: 20; left: 0; right: 0; top: 23px; background: var(--surface); border: 1px solid var(--line); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); border-radius: 0; }
	.ac { max-height: 220px; overflow: auto; }
	.ac button { display: flex; gap: 8px; width: 100%; text-align: left; border: 0; border-radius: 0; background: none; height: 22px; padding: 0 6px; color: var(--ink-2); overflow: hidden; white-space: nowrap; }
	.ac button.on, .ac button:hover { background: var(--hover); color: var(--ink); }
	.d { color: var(--ink-3); overflow: hidden; text-overflow: ellipsis; font-size: 11px; }
	.brw { padding: 4px; }
	.brw input { font: 12px var(--sans); }
	.list { max-height: 260px; overflow: auto; margin-top: 4px; }
	.gh { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-3); padding: 4px 2px 2px; }
	.vr { display: flex; }
	.vr .nm { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0 6px; text-align: left; border: 0; background: none; height: auto; padding: 2px 4px; color: var(--ink-2); border-radius: 0; }
	.d2 { grid-column: 1 / -1; color: var(--ink-3); font-size: 10px; line-height: 1.3; white-space: normal; }
	.vr .nm:hover { background: var(--hover); color: var(--ink); }
	.u { color: var(--ink-3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; }
	.ins { height: 20px; font-size: 10px; padding: 0 5px; border-radius: 0; }
	.chk { font-size: 11px; color: var(--ink-3); margin-top: 1px; overflow-wrap: anywhere; }
	.chk.err { color: var(--crit); }
	.small { font-size: 11px; }
</style>
