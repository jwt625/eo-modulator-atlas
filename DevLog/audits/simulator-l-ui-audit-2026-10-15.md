---
title: L-UI sim workbench audit (DevLog-027, DevLog-023 S6)
date: 2026-10-15
auditor: fresh-context Claude subagent
scope: app/src/routes/sim/, app/src/lib/sim/, app/src/lib/{sim.worker.ts,SimStageResults.svelte}, sim steps of app/scripts/smoke.mjs; gates, browser behaviour, numerical display, performance, robustness, user-taste rules. Report only, no code changed.
---

# L-UI audit 2026-10-15

Session 2026-10-15 00:08 to 00:28 PDT. Production build + `vite preview` on 127.0.0.1:47613, one headless Chrome
(temporary profile in a session scratch folder), `nice -n 10`, `?pool=2` for sweeps. The preview server and the scratch
folder (screenshots, profile, scripts) were removed at the end. No process left running.

Engine drift during the audit: other lanes edited `engine/src` while I worked (`mesh.mjs` 00:12:40, `config.mjs`
00:13:01, `templates.mjs` 00:13:31, `run.mjs` 00:24:04). Browser-vs-Node comparisons below use a rebuild at 00:13:54 and a
Node reference at 00:13:57 (no engine edits in between), except where stated.

## Gates (reproduced)

| Gate | Result | Clock |
|---|---|---|
| `nice -n 10 npm test` | 5 files, 46/46 pass | 00:10:00 |
| `npm run check` | 439 files, 0 errors, 0 warnings | 00:10:10 |
| `nice -n 10 npm run build` | OK (rebuilt again 00:13:54 for engine-consistent comparisons) | 00:10:17 |
| `nice -n 10 npm run smoke` | 21 PASS lines, 18.0 s wall | 00:10:48 |

Chunk graph (Vite manifest closure): `/sim` node `nodes/5` static closure 9 files, no Plotly chunk; its only dynamic
import is `src/lib/sim/synthetic.ts`. Plotly (`DkK01cfS.js`, 4,628 kB) is reached only by `nodes/4` (/explore) as a
dynamic import. `app/package.json` unchanged (no new runtime dependency).

## Verified (passes, with evidence)

- Probe correctness: mao2022-a, 18 hover probes (phi, |E|, E_x at 6 points) equal a Node P1 barycentric evaluation of
  `runCrossSection(text, {fields: true})` to the 5 displayed significant figures, e.g. x -1.1932 y 1.2941 um:
  UI 0.66343 V vs Node 0.6634312; |E| 0.15833 V/um vs 0.15832770; E_x 0.096912 vs 0.09691188 V/um. Unit conversion
  V/m to V/um (x 1e-6) correct; per-triangle quantities show the element value (no fake interpolation).
- Cut line: mao2022-a E_x from (-6, 0.2) to (6, 0.2) um, CSV export 500/500 samples, max relative difference vs Node
  1.4e-7, no NaN mismatches.
- Sweep: renaud2023 study `gap` (4 points, ES + optical + EO) on 2 workers in 1,485 ms wall; all 9 metrics of all 4
  points bit-identical to `node cli.mjs ../sims/renaud2023/config.yaml --sweep gap` (vpi_dc_v 0.5096556816635954,
  0.6254441759957718, 0.865987456970808, 1.1194521660705035 V). Max 2 concurrent workers; created 4 / terminated 4.
  4 study sweep targets overlaid.
- Derived values labels/units: C' pF/m, C0' pF/m, L' nH/m, n_RF, Z0 Ohm, n_g, n_eff, VpiL V.cm, Vpi V (table and
  bottom Table tab). Per-arm VpiL = lambda/(2|dn/dV|): 1.55e-4 cm / (2 x 1.3849e-5 /V) = 5.596 V.cm, as shown.
- Cancel mid-solve: worker terminated (created 2 / terminated 2), status `Cancelled`, results cleared. Cancel
  mid-sweep (wavelength study, 5 points): 5/5 rows `cancelled`, all workers terminated.
- Rapid config switching (during a solve and during a sweep): no result of the old config shown, workers 9/9 and 13/13
  terminated.
- Memory: JS heap after forced GC 10 MB before and after each of 6 repeated Computes; workers created = terminated.
- Main thread: 0 long tasks (> 50 ms) during a 672 ms mao2022 ES + optical + EO solve.
- Frame time, mao2022-a 110,186 triangles, pan: rAF interval median 16.7 / p95 16.8 / max 17.0 ms, CPU draw 0.10 ms.
  Quantity switch phi/|E|/E_x/E_y 31 to 33 ms including two rAFs. First paint 11.7 ms after the result (logged).
- Layout stable while solving at 1440 px: graphics stage rect `578,104,862,682` before, during (all samples) and after.
- Sharp corners: 0 elements with non-zero computed border radius inside `.sim-page` (spinner excepted). Dark default,
  light toggle works. 0 controls without an accessible name. No emoji in rendered text or sources.
- Invalid YAML: Compute disabled, parser error in Messages, previous result tagged stale. deng2026-a draft: Build mesh
  20,103 nodes / 39,728 triangles in 71 ms, Compute disabled with the blocking reason.
- URL restore (`mesh=2`, `stages`, `set=params.gap_um.value=4`, `sweep=study:gap`): all restored. 390 px: no
  horizontal overflow (scrollWidth - innerWidth = 0); solve works.
- Exports: derived CSV, targets CSV, cut-line CSV/PNG, sweep CSV, graphics PNG (WebGL + overlay + colorbar composited).

## Findings

### U1 (major) WebGL context loss is not handled

- Evidence: no `webglcontextlost`/`webglcontextrestored` listener anywhere in `app/src` (grep). After
  `WEBGL_lose_context.loseContext()` on mao2022-a the field plot went blank and stayed blank after a quantity change;
  `restoreContext()` was refused by Chrome (`context restoration not allowed`) because the loss event was not
  `preventDefault`ed. No message in Messages/Log. A graphics PNG exported in this state contains only the overlay and
  colorbar.
- Fix: in `Graphics.svelte` listen for `webglcontextlost` (preventDefault, log a warning, show a notice in the stage),
  on `webglcontextrestored` recreate `GlRenderer` and reset `uploaded` so mesh/values re-upload; if restoration fails,
  switch to `Canvas2DRenderer`.
- Lane: L-UI.

### U2 (major, forward compatibility) Engine round 2 (P2 default, vector solver, new metal policies) is not consumed

- Evidence: at 00:27 `engine/src/config.mjs` has `DEFAULT_ELEMENT_ORDER = 2`; `fields.mjs` now exports
  `es.elementOrder` and `es.p2 = {phiDof, elem}` with `ex, ey` as P2 centroid values; `run.mjs` adds `elementOrder`,
  `opticalSolver`; `METAL_POLICIES_ALL` adds `pec`, `lossy`; `OPTICS_KEYS` adds `solver`, `vector_order`,
  `metal_permittivity`. Current engine mao2022-a: elementOrder 2, C' 186.632 pF/m vs 187.053 pF/m in the audited
  build (built 00:13:54, which predates P2 in the bundle: no `element_order` string in the worker chunk). On the next
  build the UI will (a) draw and probe the P2 potential as the P1 interpolant of vertex values (midpoint DOFs ignored),
  so probe, cut line and contours will not equal the engine solution away from vertices; (b) still say "P1 anisotropic
  FEM" (`Settings.svelte` physics.es) and "P1 field is constant per element" (`fieldsView.ts` tooltips) and
  "E-form scalar mode" (`DerivedValues.svelte:47`, `SimStageResults.svelte:22`, tree tooltip "Scalar optical
  eigenmode") regardless of `opticalSolver`; (c) offer metal policies `reject, absent, pec_scalar` only
  (`Settings.svelte:48`), no `optics.solver`, `vector_order`, `mesh.element_order` controls.
- Fix: consume `es.elementOrder`/`p2` (6-node quadratic evaluation for probe/cut line; subdivide each triangle into 4
  for rendering), drive labels from `result.elementOrder` and `result.opticalSolver`, add the new enums from the engine
  exports instead of hard-coded lists. L-PARAM to record the extended `fields` shape in DevLog-026 (requested in
  DevLog-027).
- Lane: L-UI (consumer), L-PARAM (contract note).

### U3 (minor) YAML round trip rewrites about half the file on one edit

- Evidence: editing `params.gap_um.value` in renaud2023 changed 81 of 160 lines; same edit pattern changes 75/145
  lines in mao2022 and 73/149 in arabjuneghani2022. Flow collections gain padding (`{value: 738, ...}` ->
  `{ value: 738, ... }`, `[a, b]` -> `[ a, b ]`), trailing-comment spacing collapses. Comments are kept (0 of 5, 13, 14
  lost). DevLog-027 states "comments and layout survive".
- Fix: `doc.toString({ lineWidth: 0, flowCollectionPadding: false })` in `yamlEdit.ts` (`setIn`, `applyOverrides`);
  tested against the engine's `yaml` 2.9.1: 81 -> 17 changed lines for the same edit (the rest is sequence indentation
  and comment spacing).
- Lane: L-UI.

### U4 (minor) Stale view mixes new inputs with the old solution

- Evidence: renaud2023 solved at gap 3 um, then `gap_um` set to 4: the overlay (electrodes, windows, region outlines,
  hover region/material text) is drawn from the edited config while the field is the old solve, so electrode outlines
  no longer coincide with the field's electrode holes. The `stale` tag is shown.
- Fix: keep the geometry (and arm windows) of the run with the result and draw/probe that snapshot while stale, or
  hide the overlay of mismatched geometry.
- Lane: L-UI.

### U5 (minor) Colorbar and scale edge cases

- (a) `Graphics.svelte:281` `.slice(0, 16)` cuts "Element size (µm)" to "Element size (µm" and the 78 px colorbar
  canvas clips it further; the screenshot of the mao2022 mesh-size view showed "Element size (µ". (b) Log scale plots |value| but the colorbar/probe label stays "E_x (V/um)". (c) Lock range in linear
  (E_x: -0.6689 to 0.6693), then Scale = log: shader `log2(uMin)` of a non-positive min gives NaN mapping; whole plot
  drawn in the lowest color, colorbar without ticks, no warning (`renderer.ts:85`, `fieldmath.ts` `scaleT`).
- Fix: no slice (wrap or ellipsis with full title); label `|E_x|` in log mode; reject or clamp locked min <= 0 in log
  with a Messages warning.
- Lane: L-UI.

### U6 (minor) Canvas 2D fallback silently drops contours and arrow direction sign

- Evidence: `?renderer=canvas`, Contours = 10, E arrows on: no contour lines drawn; arrows are headless segments
  (`renderer.ts:482-492`), so the field sign is not shown. The settings still offer contours.
- Fix: disable Contours (with tooltip) when `rendererKind === 'canvas2d'`, or implement; add arrowheads.
- Lane: L-UI.

### U7 (minor) Graphics toolbar wraps and shifts the canvas

- Evidence: 1280 x 800, mao2022-a: stage `578,104,702,482` with Potential; selecting Optical intensity adds the mode
  select and the bar wraps to two rows: stage `578,132,702,454` (28 px down, 28 px shorter). The `stale` tag adds to
  the same row.
- Fix: single-row bar with overflow menu, or keep the mode picker only in Plot settings.
- Lane: L-UI.

### U8 (minor) Sweep workflow gaps

- (a) Sweep results have no stale tracking when inputs change after a sweep. (b) Run sweep switches Settings to Sweep
  Plot, which has no Cancel sweep button (only the toolbar Cancel). (c) The bottom status line is not updated by
  sweeps: it showed the previous `Cancelled` while the sweep spinner ran. (d) Sweep CSV/table write only `r.value`
  (first axis) (`SweepPlot.svelte:39-40, 57`); multi-axis config studies lose the other axes. (e) Sweep x label
  `gap_um` and table headers (`C'`, `C0'`, ...) carry no units.
- Fix: sweep key + stale tag, Cancel on the Sweep Plot node, status text from sweep progress, one CSV column per axis,
  units from `METRIC_LABELS` and `params.*.unit`.
- Lane: L-UI.

### U9 (minor) Worker cap can be exceeded; query options lost on config switch

- Evidence: `canRun` ignores `sweepRunning`, so Compute and Build mesh stay enabled during a sweep: pool
  (default up to hardwareConcurrency - 1) + 1 solve worker. The config select calls `goto('/sim?id=...')`, dropping
  `pool`, `renderer` and `debug`: after one switch, the renaud2023 gap sweep spawned 4 workers although the page was
  opened with `?pool=2`.
- Fix: block Compute/Build mesh during a sweep (or count them in the cap); carry `pool`, `renderer`, `debug` across
  config navigation.
- Lane: L-UI.

### U10 (minor) Smoothed element fields are not labelled as smoothed

- Evidence: with "Smooth element fields" on, the probe, cut line and cut-line CSV show area-averaged nodal values under
  the same label (`E_x (V/um)`); the cut-line note only mentions piecewise constant fields when smoothing is off.
- Fix: label `E_x (smoothed, display only)` in probe, plot, CSV header.
- Lane: L-UI.

### U11 (minor) RF line plots lack log-y and per-plot export

- Evidence: `SimStageResults.svelte:65` passes `toggles={false}`; only a shared "log f" checkbox exists. User rule:
  plots carry log toggles.
- Fix: enable toggles (log x/y, CSV, PNG) or add a shared log-y control.
- Lane: L-UI.

### U12 (note) Default sweep pool on this machine is 11 workers

- Evidence: `navigator.hardwareConcurrency` 12; Sweep settings text "up to 11 worker(s)". Meets the
  `<= hardwareConcurrency - 1` rule; memory of 11 concurrent workers was not measured (audit capped at 2).
- Suggest: default `min(hardwareConcurrency - 1, 4)` with `?pool=N` override, given the user's machine is in use.
- Lane: L-UI.

### U13 (note) Messages rows have no timestamps

- Log and Progress rows start with `HH:MM:SS.mmm`; Messages rows (errors, blocked stages, stale notice) do not.
- Lane: L-UI.

### U14 (note) Graphics axis and colorbar overlap

- Tick labels collide at the bottom-left corner (mao2022: y `-120` over x `-140`; arabjuneghani2022: `-250` over
  `-200`). The 78 px colorbar overlays the plot top-right (about 20 percent of the width at 390 px).
- Lane: L-UI.

### U15 (note) Touch at 390 px

- `.ov { touch-action: none }` makes the 380 px graphics band unusable for page scrolling by finger; no pinch zoom
  (documented limitation).
- Lane: L-UI.

### U16 (note) Form fields cannot unset a value; Link drops free YAML edits silently

- `Field.svelte` ignores an empty input, so a value cannot be returned to `null`/absent from the form (YAML tab
  needed). Free YAML-tab edits are not in the shared link; only a tooltip says so. Suggest a log warning when the text
  differs from published text + overrides at Link time.
- Lane: L-UI.

### U17 (note) S6 scope items not present

- No Pockels delta n view, no H-field view (S6 Graphics list); Build Selected / Up To Here not offered (documented);
  global `border-radius: 0 !important` still in `app/src/app.css` lines 48 and 162 (S6 item; requested from the app
  shell, not this lane). These are absences, not fake controls.
- Lane: L-UI / app shell.

### U18 (note, process) Engine drift breaks browser-vs-Node comparisons

- Evidence: with the 00:10:17 build and a Node run after `mesh.mjs` changed (00:12:40), mao2022-a all-stage values
  differed (C' 187.05281 vs 187.05220 pF/m, n_eff 2.136137 vs 2.136019, VpiL 2.797132 vs 2.797230 V.cm). After a rebuild
  at 00:13:54 and a Node run at 00:13:57 the sweep matched bit for bit. Smoke builds and compares from the same tree,
  so it is not affected; ad-hoc audits and the DevLog-027 measurements are snapshot-dependent.
- Suggest: re-run the L-UI gates after L-PARAM/L-PERF round 2 lands (also needed for U2).
- Lane: coordinator.

## Summary

0 blocking, 2 major (U1 context loss, U2 round-2 engine contract), 9 minor (U3-U11), 7 notes (U12-U18). Core
numerics shown by the UI (probe, cut line, derived values, sweep) agree with the engine at the same snapshot; gates
reproduce; Plotly is off the /sim chunk graph; no leaks, no main-thread blocking, stable layout during solves.
