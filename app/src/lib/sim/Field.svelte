<script lang="ts">
	// One editable YAML value: reads the parsed config at `path`, writes back through Workbench.edit (YAML round trip).
	import type { Workbench } from './workbench.svelte';
	import { coerce } from './yamlEdit';

	interface Props {
		wb: Workbench;
		path: string;
		label: string;
		unit?: string;
		tip?: string;
		options?: readonly string[];
		bool?: boolean;
		readonly?: boolean;
		/** Input only (no label or unit column), for tables. */
		bare?: boolean;
	}
	let { wb, path, label, unit = '', tip = '', options, bool = false, readonly = false, bare = false }: Props = $props();
	// Source document value (may be an "=expr" expression); falls back to the resolved (expanded) value.
	const src = $derived(wb.rawAt(path, wb.source));
	const resolved = $derived(wb.rawAt(path));
	const value = $derived(src !== undefined ? src : resolved);
	const inherited = $derived(src === undefined && resolved !== undefined);
	const shown = $derived(value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value));
	const editable = $derived(!readonly && !wb.busy && (value == null || typeof value !== 'object'));
	const note = $derived(
		inherited ? `Resolved value (library or template); editing writes an override into the config.`
		: typeof src === 'string' && src.startsWith('=') ? `Expression; resolved ${JSON.stringify(resolved)}` : ''
	);

	function commit(input: string) {
		if (input === shown) return;
		// An emptied field removes the key (U16); nothing happens when it was not set.
		if (input.trim() === '') {
			if (src !== undefined) wb.clear(path);
			return;
		}
		wb.edit(path, coerce(input));
	}
</script>

<label class="f" class:bare class:inh={inherited} data-tip={`${tip ? tip + '\n' : ''}${note ? note + '\n' : ''}YAML: ${path} (empty = remove the key)`}>
	{#if !bare}<span class="k">{label}</span>{/if}
	{#if bool}
		<input type="checkbox" checked={value === true} disabled={!editable} onchange={(e) => wb.edit(path, e.currentTarget.checked)} />
	{:else if options}
		<select value={shown} disabled={!editable} onchange={(e) => commit(e.currentTarget.value)}>
			{#if !options.includes(shown)}<option value={shown}>{shown || 'not set'}</option>{/if}
			{#each options as o}<option value={o}>{o}</option>{/each}
		</select>
	{:else}
		<input type="text" class="num" value={shown} placeholder="not set" disabled={!editable} spellcheck="false"
			onchange={(e) => commit(e.currentTarget.value)} onkeydown={(e) => { if (e.key === 'Enter') commit(e.currentTarget.value); }} />
	{/if}
	{#if !bare}<span class="u">{unit}</span>{/if}
</label>

<style>
	.f { display: grid; grid-template-columns: minmax(70px, 42%) minmax(0, 1fr) 42px; align-items: center; gap: 6px; padding: 1px 0; }
	.f.bare { grid-template-columns: minmax(0, 1fr); }
	.k { color: var(--ink-2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.u { color: var(--ink-3); font-size: 11px; }
	input[type='text'], select { width: 100%; height: 22px; border-radius: 0; }
	input:disabled, select:disabled { opacity: 0.7; }
	input[type='checkbox'] { justify-self: start; }
	.inh input[type='text'], .inh select { color: var(--ink-3); font-style: italic; }
</style>
