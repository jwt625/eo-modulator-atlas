---
title: Final sim workbench UI audit after L-UI rounds 2 and 3 (DevLog-027, DevLog-023 S6)
date: 2026-10-15
auditor: fresh-context Claude subagent
scope: app/src/routes/sim/, app/src/lib/sim/, app/src/lib/{sim.worker.ts,SimStageResults.svelte}, app/src/app.css, app/scripts/smoke.mjs; re-check of U1-U18 (simulator-l-ui-audit-2026-10-15.md); P2 display, vector display, solver/order/policy selectors, Pockels delta n view, vector sweeps, context loss, sharp corners, performance, layout. Report only, no code changed.
---

# Final UI audit 2026-10-15

Session 2026-10-15 08:18 to 08:32 PDT. Production build + `vite preview` on 127.0.0.1:47827 (port checked free; server
stopped at the end, port free again), one headless Chrome at a time with its own profile in a session scratch folder,
`nice -n 10`, `?pool=2` for every sweep. Scratch folder (scripts, CSV/PNG downloads, screenshots, profile) deleted at the
end; no process left running.

Engine snapshot: last `engine/src` edit 08:14:32 (`optical-stage.mjs`), build 08:20:04, no engine edit during the
session, so every browser-vs-Node comparison below is on one tree (U18 not triggered).

## Gates (reproduced, one at a time)

| Gate | Result | Clock |
|---|---|---|
| `nice -n 10 npm test` | 5 files, 48/48 pass | 08:19:50 |
| `npm run check` | 441 files, 0 errors, 0 warnings | 08:19:58 |
| `nice -n 10 npm run build` | OK | 08:20:04 |
| `nice -n 10 npm run smoke` | 24 PASS lines (incl. final suite line), 0 FAIL, 31 s wall | 08:20:44 |

## Verified (evidence)

- P2 potential display (mao2022-a, ES only, engine default `elementOrder` 2, 110,186 elements drawn as 440,744
  sub-triangles): 16 hover probes vs an independent Node evaluation of the engine's `phiDof`/`elem` (own quadratic
  shape functions, brute-force point location): phi max rel 3.0e-16, E_x 5.9e-12, E_y 5.3e-12. The P2-vs-P1-interpolant
  difference at the same points is up to 1.9e-4 V, so the probe is not silently P1. Cut line y = 0.3 um, x -8 to 8 um,
  UI CSV 500/500 samples: phi max abs 4.4e-16 V, E_x max rel 1.1e-11, 0 NaN mismatches. Quantity labels `(P2)`.
- Vector solver (renaud2023-3um-738, `optics.solver: vector` set from the form, ES + optical + EO): all 9 metrics equal
  Node `runCrossSection` on the same text (rel 0), e.g. n_eff 1.9657418532301947, VpiL 0.638266726373399 V.cm. Derived
  Values: `P2 electrostatics · vector optical solver`, TE fraction 0.9971, effective area 0.1834 um^2, residual 7.7e-9
  (Node 0.99709538, 0.18339515, 7.69e-9). Components ex/ey/ez/hx/hy/hz/ezNode and `|E|^2 (vector)` offered; probes at 8
  triangle centroids per set (optical window, arm A, arm B) equal the Node export exactly (rel 0) for opt:ex, opt:hy,
  opt:ez and opt_int.
- Selectors: solver options = engine `OPTICAL_SOLVERS`; metal policies = `METAL_POLICIES_ALL` (reject, absent,
  pec_scalar, pec, lossy); element order = `ELEMENT_ORDERS`; vector order 1/2 matches the engine's `oneOf([1, 2])`.
  Exception: group index (W1).
- Pockels delta n view: dn_xx, dn_yy, d eps_xy probes at 8 centroids per set equal the Node `pockels` arrays exactly
  (rel 0); label `dn_xx (per element)`, unit `1/V`, symmetric colorbar (-7.28e-5 to 7.28e-5). Sign consistent with the
  engine: arm A dn_xx range -7.282e-5 to 0, arm B 0 to 7.257e-5 1/V; Node arm dn_eff/dV A -2.8905e-5, B +2.8907e-5.
- Vector sweep, config study `gap` on 2 workers: 4/4 points done, 36 values vs
  `node engine/cli.mjs sims/renaud2023/config.yaml --sweep gap --solver vector` max rel 3.65e-10 (not bit-identical, see
  W11); Vpi 0.52048, 0.63827, 0.88301, 1.14081 V. Workers created 3 / terminated 3, max live 2. 4 sweep targets overlaid.
- Worker cap: `hardwareConcurrency` 12; default `poolSize` 4 (Sweep settings text "up to 4 worker(s)"); `?pool=2` gives
  max 2 live; `?pool=99` clamps to 11 (cores - 1). Compute and Build mesh disabled during a sweep.
- Context loss (U1): lose + restore within 2 s repaints in WebGL2 (screenshot distinct-colour count 369 before, 88 while
  lost, 369 after); PNG exported while lost contains the field (401 distinct colours in the plot area); no restore within
  2 s switches to Canvas 2D with a Messages row. Late-restore defect: W5.
- Sharp corners: computed-style scan including `::before`/`::after`, both themes: / 0, /table with drawer open 0,
  /about 0, /sim (Derived Values, Cut Line, Results, Sweep, Mesh, Mode Analysis nodes, all bottom tabs) 0. /explore: W12.
  No global `border-radius: 0 !important` left; remaining `!important` in `app/src/app.css` is scoped to
  `.js-plotly-plot` chrome. No emoji in sim sources.
- Layout: no horizontal overflow at 1440, 1280 and 390 px in both themes (`scrollWidth - innerWidth` = 0 for document
  and `.sim-page`). 1280 x 800: graphics stage rect `578,102,702,484` identical before, during an ES + optical solve
  (40 ms sampling), after it, across phi/|E|/E_x/optical quantity switches and with the stale tag shown. Screenshots
  inspected: 1440 dark/light (mesh and potential + contours + arrows), 1280 dark, 390 dark/light (tree, settings,
  graphics, Log tab with timestamped rows).
- Performance (headless Chrome, ANGLE Metal, Apple M4 Pro; vsync-bound): mao2022-a P2, 440,744 display triangles:
  potential pan rAF median/p95/max 16.7/16.7/16.8 ms, CPU draw 0.2/0.2 ms; zoom 16.7/16.7/16.8 ms, 0.1/0.2 ms; |E|
  with 12 contours + arrows pan 16.7/16.8/16.8 ms, CPU 0.3/0.4 ms, zoom CPU 0.4/0.6 ms; wireframe pan 16.7/16.7 ms.
  First paint after the result 61.1 ms, then 58.3, 98.2, 52.5, 43.3, 81.2 ms over 5 more Computes. Quantity switch to
  next paint 28.6 to 33.7 ms. JS heap after forced GC: 10.9 MB before, 77.1 MB after the first P2 result, then flat
  66.5 to 66.7 MB over 5 more Computes; workers 6 created / 6 terminated. Three renaud2023 scalar gap sweeps: 3.45 to
  3.51 s wall each, heap 12.5 / 13.5 / 13.7 / 13.7 MB, workers 6/6, max live 2.

## U1-U18 re-check

| Item | Status | Evidence |
|---|---|---|
| U1 context loss | fixed, one edge case (W5) | restore, 2 s fallback, PNG while lost (above) |
| U2 round-2 engine contract | fixed, with W1, W2 | P2, vector, Pockels, selectors (above) |
| U3 YAML round trip | partly fixed (W3) | existing scalar edit: 1 of 160 lines changed; new keys re-print the document |
| U4 stale geometry | fixed | after gap 3 -> 4 um the run's electrode polygons are kept and drawn; current geometry differs; `stale` tag shown |
| U5 colorbar | fixed | title `Element size (µm)` complete; log + locked range with min <= 0: title `|E_x| (V/µm), log scale, range 1.35e-8 to 1.349` plus a Messages notice |
| U6 Canvas 2D contours, arrowheads | fixed in code, unusable at P2 (W4) | arrowheads drawn; contours present but broken by the stride LOD |
| U7 graphics bar | fixed | stage rect constant (above) |
| U8 sweep workflow | fixed | status `Sweep 0/5`; Cancel sweep on the Sweep Plot node (5/5 cancelled, workers 3/3 terminated); headers `gap_um (µm)`, `C' (pF/m)`, ...; CSV one column per axis with units; stale tag on Sweep Plot and a Messages row after an edit |
| U9 cap and query options | fixed | Compute/Build mesh disabled during a sweep; config switch keeps `pool`, `renderer`, `debug` |
| U10 smoothed labels | fixed for P1 element fields | label `(smoothed)` path in `Graphics.svelte:46`, `CutLinePanel.svelte:10`; see W10 for P2 |
| U11 RF plots | fixed, with W6 | 3 plots, each with log x, log y, CSV, PNG |
| U12 pool default | fixed | default 4 on 12 cores |
| U13 Messages timestamps | fixed | rows `08:25:09.245 WebGL context lost ...` |
| U14 tick collisions | fixed | screenshots at 1440/1280/390: no overlapping tick labels |
| U15 touch | fixed (not exercised with real touch) | overlay `touch-action: pan-y`; pinch handler in `Graphics.svelte:362-388` |
| U16 unset value, Link warning | fixed | Link with a free YAML edit logs `warn: Link does not include free YAML-tab edits ...` |
| U17 global radius rule | fixed, /explore pseudo-elements remain (W12) | scan above |
| U18 engine drift | not triggered | no engine edit during the session |

## Findings

### W1 (minor) Group-index selector omits the engine default `perturbation`

- Evidence: `Settings.svelte:51` hard-codes `GI = ['fixed', 'finite_difference_wavelength']`; the engine exports
  `GROUP_INDEX_METHODS = ['perturbation', 'finite_difference_wavelength', 'fixed']` (`engine/src/config.mjs:31`) and all
  40 configs now set `group_index_from: perturbation` (DevLog-026 round 4). renaud2023 Mode Analysis: options
  `perturbation` (injected by `Field.svelte:48` only because it is the current value), `fixed`,
  `finite_difference_wavelength`; after choosing `fixed` the options are `fixed`, `finite_difference_wavelength`, so the
  default cannot be selected again from the form (YAML tab only). Contradicts the DevLog-027 U2 statement that the
  selectors come from engine lists.
- Fix: `const GI = GROUP_INDEX_METHODS` (and take POLS, ARM, TERM, COND, DIEL, loading types from engine exports where
  they exist: `ARM_DRIVES`, `TERMINAL_DRIVES`, `CONDUCTOR_LOSS_MODELS`, `DIELECTRIC_LOSS_MODELS`).

### W2 (minor) Element order and mesh hints are read-only on template configs

- Evidence: renaud2023-3um-738 Mesh node and Electrostatics node: element order select `disabled: true`
  (`readonly={ro}` on path `geometry.mesh.element_order`, `Settings.svelte` mesh and physics.es blocks). Template
  geometry is not in the source, but the template accepts `template.mesh` and copies it into `geometry.mesh`
  (`engine/src/templates.mjs:195`). Affects mao2022, renaud2023 and arabjuneghani2022 (3 of 40 configs, the ones with
  `params` and studies), so the P1/P2 selector and the mesh size hints of exactly the configs used for sweeps can only
  be changed in the YAML tab.
- Fix: for template configs bind these fields to `template.mesh.<key>` (show the resolved value in italics as for
  library values).

### W3 (minor) YAML edits that add or remove a key still re-print the document (U3 partly fixed)

- Evidence: existing scalar edit (renaud2023 `params.gap_um.value` 3 -> 4) changes 1 of 160 lines (fixed). Adding a key
  through the new selectors goes through `doc.toString(PRINT)` (`yamlEdit.ts` `setIn` fallback): renaud2023
  `optics.metal_in_window: reject` (or `optics.solver: vector`) changes 16 existing lines besides the new one: 6 `targets`
  and 9 `sweep_targets` items re-indented, and `}   # arm windows ...` collapsed to `} # ...`. chen2022-c
  `geometry.mesh.element_order: 1`: `sigma_Sm: 4.1e7` -> `4.1e+7`, the trailing comment on `geometry:` moved to its own
  line, flow arrays `[[-0.84,0.2],...]` re-spaced to `[[-0.84, 0.2], ...]`, aligned trailing comments collapsed; 15
  added or changed lines in the diff. `solver`, `element_order` and `metal_in_window` are absent from most configs, so most uses of the new
  selectors take this path; field clearing (`deleteIn`, U16) does as well.
- Fix: insert new keys by source splice (after the last child of the parent block map at its indentation, or before the
  closing brace of a flow map) and delete by removing the key's source line range; keep the Document API only as a
  fallback. If re-printing stays, test print options against the corpus (for example sequence indentation) so a new key
  does not re-indent unrelated sequences or reformat numbers.

### W4 (minor) Canvas 2D fallback renders the P2 default as speckle

- Evidence: mao2022-a with `?renderer=canvas`, potential, 10 contours, arrows, Window zoom: the 440,744 refined
  triangles exceed the 60,000 budget, the index stride (`renderer.ts:478`, `Canvas2DRenderer.draw`) skips most
  triangles, so the background shows through between drawn triangles across the whole plot and contour lines are
  dotted (screenshot inspected); CPU frame 72.4 ms. The U1 fix falls back to this renderer after an unrestored context
  loss, so the field becomes this speckle after a GPU reset.
- Fix: decimate in screen space (one fill per pixel cell, or draw the parent P1 elements with their mean when the
  refined mesh exceeds the budget) instead of skipping triangle indices; run contours over all visible triangles (or
  the parent elements).

### W5 (minor) A late WebGL restore after the Canvas fallback triggers a second fallback with a wrong message

- Evidence: lose context, wait > 2 s (fallback, Messages `... not restored within 2 s`), then `restoreContext()` on the
  original context: a new Messages row `Graphics switched to the Canvas 2D renderer: WebGL resources could not be
  recreated` and the canvas is replaced a second time. Cause: the `webglcontextlost/restored` listeners stay on the
  detached GL canvas (`Graphics.svelte:533-534`); `onContextRestored` (`:505-516`) then calls `GlRenderer.create` on
  the new 2D canvas, which fails.
- Fix: remove both listeners in `fallbackToCanvas`, or ignore events whose target is not the current `glCanvas`.

### W6 (minor) RF plots: upper plots have no x-axis label; their CSV x column has no name or unit

- Evidence: `SimStageResults.svelte:64` passes `xLabel = ''` to all but the last of the three stacked RF plots
  (screenshot: alpha and n_RF plots show bare tick numbers). Since U11 each plot has its own log x toggle and CSV, the
  x axes are independent; `LinePlot.svelte:198` builds the CSV header as `${name} x (${xLabel})`, which gives
  `α (dB/cm) x ()` for the first plot.
- Fix: pass `Frequency (GHz)` to every RF plot.

### W7 (minor) Pockels view: arm picker hidden in the graphics bar; arm not named in colorbar or probe

- Evidence: the bar's dataset/mode select renders only when `wb.quantity.startsWith('opt')` (`Graphics.svelte:603`);
  with `pk:dnXX` selected the count of `Optical mode index` selects is 0 (1 for `opt:ex`). The Pockels field of arm A and
  arm B differ in sign (above), but the colorbar title reads `dn_xx (per element) (1/V)` for either arm and the probe
  label does not name the dataset; switching arm requires the Results node's Mode select.
- Fix: show the dataset picker for `pk:` quantities and put the dataset (optical window / arm A / arm B) in the label.

### W8 (note) P2 |E| is interpolated from corner magnitudes, not computed from the components

- Evidence: `fieldsView.ts:123` builds `|E|` as corner values and `valueAt` interpolates them linearly; |E| is not linear
  where E_x, E_y are. 16 probes vs the exact hypot of the quadratic gradient: max rel 9.1e-4, median 1.7e-6 (worst x
  4.1322, y 0.0074 um: UI 0.0146928 vs 0.0146795 V/um). The tooltip says P2 fields are linear per element, which holds
  for E_x and E_y only.
- Fix: evaluate |E| in the probe and cut line as hypot of the interpolated components (shading can stay corner-based),
  or state the approximation in the tooltip.

### W9 (note) Vector mode components are per element but not labelled so

- Evidence: vector components are triangle-centroid values drawn flat (`at: 'tri'`), but the probe/colorbar label is
  `ex`, `hy` (`fieldsView.ts:161`), while Pockels values with the same location carry `(per element)`. Same labelling
  rule as U10.
- Fix: append `(per element)` to vector component labels (replaced by `(smoothed)` when Smooth is on).

### W10 (note) "Smooth element fields" does nothing to the electrostatic fields at the P2 default

- Evidence: P2 E fields are corner-valued, so `Graphics.svelte:46` skips smoothing; with Smooth on, the mao2022-a E_x
  probe keeps the label `E_x` and the same values. The control stays enabled; it now acts only on mesh metrics, Pockels,
  vector components and P1 runs. Its tooltip still says it enables contours on element fields.
- Fix: disable it (tooltip with the reason) when the displayed field is not per element.

### W11 (note, engine) Vector sweep values depend on the point order within a worker at the 1e-10 level

- Evidence: browser 2-worker sweep (worker 1: points 0, 2; worker 2: points 1, 3) vs the CLI (points 0..3 in one
  process): max rel 3.65e-10 (gap 3 um Vpi 0.638266726373399 vs 0.6382667261401536 V). Node `runSweepPoint` with the same
  per-worker order and a fresh cache for point 1 both reproduce the browser value bit for bit, so the UI passes the
  same inputs; the difference comes from the per-worker reuse cache (warm start) and is within the eigen residual
  (7.7e-9). Comparisons of UI sweeps with the CLI need a tolerance, not bit equality.
- Lane: L-VEC / L-PARAM (cache warm start), coordinator (test tolerance).

### W12 (minor, app shell) Plotly modebar tooltips on /explore are rounded

- Evidence: 85 `button.modebar-btn::after` pseudo-elements with `border-radius: 2px` (both themes); on hover the
  tooltip (e.g. "Download plot as a PNG") is shown with rounded corners (screenshot inspected). The U17 scan in
  DevLog-027 did not include pseudo-elements. The `.js-plotly-plot .modebar-btn` rule in `app/src/app.css` does not reach
  `::after`.
- Fix: add `.js-plotly-plot .modebar-btn::before, .js-plotly-plot .modebar-btn::after { border-radius: 0; }` and include
  pseudo-elements in the scan.

### W13 (note) Main-thread work per P2 result

- Evidence: 2 long tasks (70 and 73 ms) during 5 P2 Computes on mao2022-a; first paint 43 to 98 ms after the result.
  The refined P2 display mesh (`p2.ts`) and its triangle index are built on the main thread. Pan/zoom are unaffected.
- Suggest: build the refined mesh and the bin index in the worker and transfer them with the fields.

### W14 (note, app shell) Table sort hash appended to /sim URLs

- Evidence: every /sim URL gains `#sort=year%3Adesc` (e.g. `/sim?id=mao2022-a&pool=2&renderer=canvas&debug=1#sort=year%3Adesc`);
  the layout `$effect` writes the table hash on all routes (`app/src/routes/+layout.svelte:32-44`). The Link button
  builds its own URL, so shared links are unaffected.
- Suggest: write the table hash only on routes that use it.

## Summary

0 blocking, 0 major, 8 minor (W1-W7, W12), 6 notes (W8-W11, W13, W14). Gates reproduce (48/48, 0/0, build OK, smoke 24
PASS lines). P2 potential and E components, vector components, |E|^2, Pockels delta n, derived values and the vector
gap sweep agree with Node on the same tree (exact or to 1e-11; sweep 3.7e-10 by worker order). Worker cap holds (default
4, max live 2 at `?pool=2`), heap is flat over repeated runs and sweeps, pan/zoom at 440,744 triangles stays at vsync,
layout is stable while solving, and /sim has no rounded element in either theme.
