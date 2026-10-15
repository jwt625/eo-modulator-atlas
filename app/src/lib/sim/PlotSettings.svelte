<script lang="ts">
	// Surface-plot settings of the graphics window (COMSOL "Surface" node): scale, colormap, range, contours, arrows.
	import type { Workbench, Quantity } from './workbench.svelte';
	import { COLORMAPS } from './colormap';
	import { opticalSets, quantityOptions, viewSpec } from './fieldsView';
	import { autoRange } from './fieldmath';
	import { fmt } from '../logic';
	import type { ScaleMode } from './types';

	let { wb }: { wb: Workbench } = $props();
	const options = $derived(quantityOptions(wb.fields, wb.mesh, wb.modeIndex, wb.opticalSet));
	const spec = $derived(viewSpec(wb.quantity, wb.fields, wb.mesh, wb.modeIndex, wb.opticalSet));
	const requested = $derived(wb.node.startsWith('results.field:') ? wb.node.slice(14) : null);
	const unavailable = $derived(requested && !options.some((o) => o.value === requested));

	function lock(on: boolean) {
		if (on && spec.field) {
			const mode: ScaleMode = wb.scaleMode === 'auto' ? (spec.field.signed ? 'symmetric' : 'linear') : wb.scaleMode;
			const r = autoRange(spec.field.values, mode);
			wb.rangeMin = Number(r.min.toPrecision(4));
			wb.rangeMax = Number(r.max.toPrecision(4));
		}
		wb.lockRange = on;
	}
</script>

{#if unavailable}
	<p class="muted">{requested === 'opt_int' || requested?.startsWith('pk:') ? 'No optical field. Include the Optical mode or EO overlap stage and Compute.' : 'No electrostatic field. Compute the study first.'}</p>
{/if}
<label class="f">Quantity
	<select value={wb.quantity} onchange={(e) => (wb.quantity = e.currentTarget.value as Quantity)}>{#each options as o}<option value={o.value} title={o.tip}>{o.label}</option>{/each}</select>
</label>
{#if opticalSets(wb.fields).length}
	<label class="f" title="Optical dataset (optical window or EO arm window) and mode">Mode
		<select value={`${wb.opticalSet}:${wb.modeIndex}`} onchange={(e) => { const [st, k] = e.currentTarget.value.split(':'); wb.opticalSet = st as 'optical'; wb.modeIndex = Number(k); }}>
			{#each opticalSets(wb.fields) as st}{#each st.data.modes as m, k}<option value="{st.key}:{k}">{st.label} mode {k}, n_eff {fmt(m.n_eff, 6)}</option>{/each}{/each}
		</select>
	</label>
{/if}
<label class="f" title="auto: symmetric for signed quantities, linear otherwise; log uses |value|">Scale
	<select value={wb.scaleMode} onchange={(e) => (wb.scaleMode = e.currentTarget.value as ScaleMode | 'auto')}>
		<option value="auto">auto</option><option value="linear">linear</option><option value="symmetric">linear symmetric</option><option value="log">log |value|</option>
	</select>
</label>
<label class="f">Colormap
	<select value={wb.colormap} onchange={(e) => (wb.colormap = e.currentTarget.value as typeof wb.colormap)}>
		<option value="auto">auto</option>{#each COLORMAPS as c}<option value={c}>{c}</option>{/each}
	</select>
</label>
<label class="f" title="Lock the color range; unlocked follows the data"><span>Lock range</span><input type="checkbox" checked={wb.lockRange} onchange={(e) => lock(e.currentTarget.checked)} /></label>
{#if wb.lockRange}
	<label class="f">min <input type="number" step="any" bind:value={wb.rangeMin} /></label>
	<label class="f">max <input type="number" step="any" bind:value={wb.rangeMax} /></label>
{/if}
<label class="f" title="Contour lines of node- or corner-valued fields (potential, P2 fields, optical modes, or smoothed element fields); per-element P1 fields have none; 0 = off">Contours
	<input type="number" min="0" max="64" step="1" value={wb.contours} onchange={(e) => (wb.contours = Math.max(0, Math.min(64, Math.round(Number(e.currentTarget.value) || 0))))} />
</label>
<label class="f" title="Electric field direction arrows (electrostatic field, uniform length)"><span>E arrows</span><input type="checkbox" bind:checked={wb.arrows} /></label>
<label class="f" title={spec.field?.at === 'tri' ? 'Area-weighted average of per-element values onto nodes (display only; labelled smoothed; enables contours)' : 'No effect: the shown field is not per element (nodal, P2 or corner values)'}><span>Smooth element fields</span><input type="checkbox" bind:checked={wb.smooth} disabled={spec.field?.at !== 'tri'} /></label>
<label class="f"><span>Mesh wireframe</span><input type="checkbox" bind:checked={wb.wire} /></label>
{#if spec.field}<p class="muted small">{spec.field.label} ({spec.field.unit}), {spec.field.at === 'node' ? (spec.field.note === 'P2' ? 'P2 quadratic, drawn on elements split into 4' : 'per node, Gouraud') : spec.field.at === 'corner' ? 'linear per element (P2 field)' : 'per element, flat'}{wb.paintInfo ? `; first paint ${wb.paintInfo.afterResultMs.toFixed(1)} ms after the result` : ''}.</p>{/if}

<style>
	.f { display: grid; grid-template-columns: minmax(80px, 40%) minmax(0, 1fr); align-items: center; gap: 6px; margin: 3px 0; color: var(--ink-2); }
	.f select, .f input[type='number'] { width: 100%; height: 22px; border-radius: 0; background: var(--bg); border: 1px solid var(--border); color: var(--ink); padding: 0 4px; }
	.f input[type='checkbox'] { justify-self: start; }
	p { margin: 6px 0; line-height: 1.5; }
	.small { font-size: 11px; }
</style>
