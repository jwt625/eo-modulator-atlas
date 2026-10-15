---
title: Sim workbench UI (lane L-UI, DevLog-023 S6)
date: 2026-10-14
status: round 4 done 2026-10-15 08:43 PDT; round 3 done 2026-10-15 08:17 PDT
owner: L-UI
scope: app/src/routes/sim/, app/src/lib/sim/ (new), app/src/lib/{sim.worker.ts,CrossSection.svelte,SimStageResults.svelte}, sim steps of app/scripts/smoke.mjs
---

# DevLog-027: COMSOL-style sim workbench

Parent: [DevLog-023](DevLog-023-simulator-tfln-roadmap.md) task S6, decisions D6 (YAML canonical), D7 (no Plotly on
/sim), D8 (WebGL2 field rendering), O1 (stays the atlas `/sim` route), O4 (field-export contract).

## Plan (written before implementation, 2026-10-14 23:10 PDT)

### Layout

- Full-viewport workbench inside the existing app shell (header/footer unchanged):
  toolbar / [Model Builder tree | Settings | Graphics] / bottom tabs (Messages, Progress, Log, Table).
- Pointer-drag splitters (tree|settings, settings|graphics, top|bottom); sizes kept in localStorage (try/catch,
  per-viewer convenience only). Graphics size never depends on solve state (stable layout).
- <= 760 px: panels stack in one scrolling column (toolbar, tree, settings, graphics 340 px, bottom), no splitters.
- Sharp corners per component (no new global rule). Existing `app.css` global `border-radius: 0 !important` is not
  in this lane's write paths; removal is requested below.

### State

- `lib/sim/workbench.svelte.ts`: one runes class holding config text, section, stages, mesh level, selected tree
  node, run/mesh/sweep jobs, results, fields, log. Page component only wires it to the URL and layout.
- Staleness keys: mesh key = (geometry block of the section, mesh hints, mesh level); result key = (text, section,
  stages, mesh level) as before. Upstream edits mark mesh and/or results stale; stale data stays visible with a
  "stale" marker (COMSOL behavior), never silently replaced.
- YAML stays canonical (D6): forms edit through `yaml` `parseDocument().setIn()` so comments and layout survive;
  the YAML tab edits the same text. Form edits are also recorded as overrides for the shareable URL.
  `yaml` is imported from the engine's installed copy (same physical module the engine bundles; no new dependency).

### Model Builder tree

Model (disclosures, provenance) / Parameters / Materials (per material) / Geometry (per region, electrode, windows)
/ Mesh / Physics: Electrostatics, Mode Analysis, EO Coupling, RF Line / Study: Stationary + Mode, Parametric Sweep /
Results: Field plots (Potential, |E|, E_x, E_y, Optical mode), Cut Line 2D, Derived Values, Targets, RF Line, Sweep plot.
Physics nodes show stage readiness (blocked reason in tooltip and settings). Results nodes show stale state.

### Worker protocol (`lib/sim.worker.ts`)

- in `{type: 'run', text, section, stages, meshScale, fields}` -> `progress*`, `result` (+ `fields`, typed arrays
  transferred) or `error`.
- in `{type: 'mesh', text, section, meshScale}` -> `mesh` (typed arrays transferred) or `error`.
- Dev adapter until L-PARAM's `runCrossSection(text, {fields: true})` lands: after `runCrossSection`, re-solve
  electrostatics (and the optical mode when requested) with existing engine functions and emit the O4 contract
  shape. Doubles solve time; removed when the real API exists.

### Graphics (D8, own WebGL2 renderer, no deps)

- De-indexed triangle buffers (3 vertices per triangle: float32 position relative to mesh centre, value, region);
  one draw call. Per-vertex fields are Gouraud-interpolated; per-triangle fields are constant per triangle.
- Fragment shader: scale transform (linear, symmetric, log10 |v|) + 256-entry colormap texture; region colors from
  a small texture; wireframe from barycentrics (`gl_VertexID % 3`) with `fwidth`, faded when triangles are a few px;
  contour lines from `fract` of the scaled value; selection highlight by region index.
- E-field arrows: instanced arrow mesh, one instance per screen-grid sample (spatial-index lookup per sample).
- Overlay Canvas 2D: geometry polygons (geometry view), region outlines, electrodes (holes in the ES mesh), optical
  and arm windows, selection highlight, cut line. Colorbar canvas with ticks, auto or locked range.
- Hover probe: uniform-grid triangle bin index (CSR typed arrays), barycentric location, value, region, material in a
  fixed status line. Canvas 2D fallback (flat per triangle, viewport culling + stride LOD) when WebGL2 is missing.
- Pan (drag), wheel zoom at cursor, zoom extents, zoom to optical window, PNG export (composited).

### Plots (D7)

- `LinePlot.svelte` on Canvas 2D: nice ticks (linear and log), axis labels with units, log toggles, multiple series,
  hover readout, overlay points with tooltip (device_id), PNG and CSV export. Replaces Plotly in
  `SimStageResults.svelte`; check the built chunk graph so `/sim` no longer reaches the Plotly chunk.

### Sweep

- Study > Parametric Sweep: parameter = a `params` entry (when the config has `params`), any numeric YAML path, or
  mesh level; values as list `3, 4, 5` or range `start:step:stop`. Points run on a pool of
  `max(1, hardwareConcurrency - 1)` module workers (no SharedArrayBuffer); results stream into the table and plot;
  cancel terminates the pool. Switch to L-PARAM's point enumeration when its API exists.
- Paper overlay: devices of the config's paper with numeric x/y device columns chosen by the user (defaults guessed
  from names, e.g. gap -> `electrode_gap_um`, metric `vpi_dc_v` -> `vpi_dc_v`); tooltip shows `device_id`.

### Results, URL, export

- Derived values (C', C0', L', Z0, n_RF, n_eff, ng, VpiL, per-arm dn/dV and single-arm VpiL = lambda / (2 |dn/dV|),
  timing when the engine provides it), mode picker, targets, RF line, CSV export of tables, PNG of graphics and plots.
- URL: `?id=<config>&section=&mesh=&stages=a,b&set=<path>=<value>` (repeatable) `&sweep=<path>&values=<spec>`.
  Free YAML-tab edits are not encoded (tooltip says so).

### Gates

`npm test` (new pure-function tests: spatial index, interpolation, ticks, scales, sweep value parsing, yaml edit,
url state), `npm run check` 0/0, `npm run build`, `npm run smoke` (extended: tree navigation, field view, cut line,
sweep run, cancel). Screenshots 1440 px and 390 px, dark and light, in the session scratchpad only. Perf: pan/zoom
frame time on the largest mesh and on a synthetic 200k-triangle mesh, time to first field paint after a solve.

## Round 2 plan (2026-10-15 00:33 PDT, before implementation)

Input: `DevLog/audits/simulator-l-ui-audit-2026-10-15.md` (U1-U18). Extra write paths this round: `app/src/app.css` and
any app component needed to drop the global `border-radius: 0 !important` (U17). Timestamps from `date` only. Scratch in
`scratchpad/l-ui-r2-*/` only. Hardware rules unchanged (one heavy task, `nice -n 10`, one headless Chrome, pool 2).

Independent items first:
- U1 context loss: `webglcontextlost` (preventDefault, Messages warning, stage notice), `webglcontextrestored`
  (recreate GL resources, re-upload), no restore within 2 s or failed restore: fresh canvas with Canvas 2D. PNG export
  renders through Canvas 2D when the GL context is lost (never blank). Smoke: lose/restore via WEBGL_lose_context.
- U3 YAML: scalar edits splice the new value into the node's source range (only the value changes); new keys and
  deletions fall back to the Document API with `flowCollectionPadding: false`.
- U4 stale view: the geometry (and arm windows) of the run is kept with the result and drawn/probed while its fields
  are shown; built mesh keeps its own geometry snapshot.
- U5 colorbar: full title (two lines, ellipsis + tooltip), `|q|` label in log mode, locked range invalid for log
  (min <= 0) falls back to the auto log range with a Messages warning.
- U6 Canvas fallback: contour lines (marching triangles) and arrowheads.
- U7 graphics bar: one fixed-height row (no wrap); overflow scrolls horizontally, stage never moves.
- U8 sweep: stale key + tag, Cancel on the Sweep Plot node, status line `Sweep k/n`, one column per axis in table and
  CSV, units on axes and headers.
- U9 Compute/Build mesh disabled while a sweep runs; `pool`, `renderer`, `debug` survive config switches.
- U10 smoothed element fields labelled `(smoothed)` in probe, cut line, CSV.
- U11 RF plots: per-plot log x/y, CSV, PNG.
- U12 default pool `min(4, hardwareConcurrency - 1)`, `?pool=N` override.
- U13 Messages rows carry the time each message first appeared.
- U14 axis tick labels skip collisions (corner, unit label, colorbar); narrower colorbar on small screens.
- U15 touch: `touch-action: pan-y` on the canvas so the page scrolls vertically; horizontal drag pans; two-finger
  pinch zooms.
- U16 empty field = remove the key (YAML delete); Link warns in the log when free YAML edits are not encoded.
- U17 replace the global rule with per-element base rules (`button, input, select, textarea, fieldset, ...`) and
  per-component rules; scan computed `border-radius` on /, /table, /explore, /about, /sim.
Then U2 (engine round 2, DevLog-026): P2 potential drawn on 4-way subdivided elements with exact quadratic probe and
cut line; P2 E fields as linear per-element (per-corner) values; vector modes (per-triangle centroid components,
`te_fraction`) and H components; labels from `result.elementOrder` / `result.opticalSolver`; selectors for
`optics.solver`, `mesh.element_order`, `optics.vector_order`, metal policies from `METAL_POLICIES_ALL`;
`buildSectionMesh` and the engine YAML helpers replace `import.meta.glob` and the direct `yaml` import. Pockels delta n
view only if the engine exports it.

### Round 2 progress

- 2026-10-15 00:32 PDT Plan above written; U3 (value splice in `yamlEdit.ts`, tests), U8/U9/U12/U16 workbench parts,
  field clearing, `p2.ts` (P2 display) started.
- 2026-10-15 00:35 to 07:53 PDT Session interrupted (API session limit). Resumed 07:53: files re-checked; `npm run check`
  shows one error from the in-progress `corner` field kind (renderer signature), no other damage.

- 2026-10-15 08:12 PDT All U1, U3-U17 items implemented; U2 implemented against the round-2 API as it stands
  (`fields.es.elementOrder`/`p2`, `result.elementOrder`/`opticalSolver`, vector `fields.optical` with
  `location: triangle_centroid`, `METAL_POLICIES_ALL`/`OPTICAL_SOLVERS`/`ELEMENT_ORDERS`, `buildSectionMesh`,
  `yaml-edit.mjs`). DevLog-026 does not yet state round 2 done, so U2 needs a re-check when it does. Gates below.

### Round 2 TODO

- [x] U1 [x] U3 [x] U4 [x] U5 [x] U6 [x] U7 [x] U8 [x] U9 [x] U10 [x] U11 [x] U12 [x] U13 [x] U14 [x] U15 [x] U16 [x] U17
- [x] U2 against the current round-2 API; [x] re-checked against the final API (round 3)
- [x] smoke: context loss, P2 and vector display; gates; screenshots (own subfolder, deleted)

### Round 2 results

| Item | Change |
|---|---|
| U1 | `webglcontextlost` (preventDefault, Messages notice, canvas notice), `webglcontextrestored` (new GL resources, re-upload, repaint), no restore in 2 s or failed recreation: fresh canvas + Canvas 2D (Messages notice); PNG export renders through Canvas 2D while the context is lost |
| U2 | P2: elements split into 4 at edge midpoints; potential probed/cut exactly (quadratic shape functions), E from the quadratic gradient, linear per element (3 corner values); labels `(P1)`/`(P2)`; vector modes: centroid components per triangle, `|E|^2` from e-components, H and `ezNode` selectable, TE fraction/residual/effective area/DOF in Derived Values; labels from `result.opticalSolver`; selectors `optics.solver`, `optics.vector_order`, `mesh.element_order`, metal policies from `METAL_POLICIES_ALL`; Build mesh uses `buildSectionMesh`; forms use `yaml-edit.mjs` (`parseYamlDocument`, `splitPath`); `import.meta.glob` and the path import of `yaml` removed |
| U3 | scalar edits splice the value into the node's source range (verified to parse back to the value); other edits re-print with `flowCollectionPadding: false`; test: one edited line only |
| U4 | geometry and arm windows of the run (and of a built mesh) are snapshotted and used for overlay and probe while that solution or mesh is shown |
| U5 | two-line colorbar title with ellipsis and full tooltip; `|q|` and `log` in log mode; locked range unusable in log falls back to the automatic range with a Messages notice |
| U6 | Canvas 2D fallback: marching-triangle contours on node/corner fields, arrowheads |
| U7 | graphics bar is one 31 px row (horizontal scroll when narrow); 1280 px check: stage rect identical before and after switching to the optical quantity |
| U8 | sweep inputs key + stale tag (tree, Sweep Plot, Messages), Cancel sweep on Sweep Plot, status line `Sweep k/n`, one column per axis in table and CSV, units on axis and metric headers |
| U9 | Compute and Build mesh disabled during a sweep; `pool`, `renderer`, `debug` kept across config switches |
| U10 | `(smoothed)` in labels, probe, colorbar, cut line, CSV header; note in the cut-line text |
| U11 | each RF plot has log x/y, CSV, PNG |
| U12 | pool `min(points, hardwareConcurrency - 1, ?pool or 4)` |
| U13 | Messages rows start with the time the message first appeared; runtime notices listed with their own time; Clear notices |
| U14 | tick labels skip the bottom-left corner, the unit label and overlaps; colorbar 64 px below 500 px width |
| U15 | canvas `touch-action: pan-y` (finger scroll moves the page), horizontal drag pans, two-finger pinch zooms |
| U16 | emptied field removes the key (`deleteIn`); Link logs a warning when free YAML edits or removed keys are not encodable; tooltip says so |
| U17 | global `*:not(.spinner) { border-radius: 0 !important }` removed from `app.css`; element base rule (form controls, details, summary, dialog, progress, meter, pre, code, kbd, mark, img) without `!important`; Plotly map attribution control fixed with a scoped rule. Computed-style scan on /, /table (with drawer), /explore, /about, /sim, dark and light: 0 rounded elements (spinner excepted) |
| Pockels delta n view | not added: the engine does not export a delta n field |

Gates (2026-10-15 08:08 PDT, `nice -n 10`, one at a time): `npm test` 48/48 (13 in `lib/sim/sim.test.ts`, new: value
splice, quoting, delete, P2 exactness), `npm run check` 0 errors 0 warnings (441 files), `npm run build` OK,
`npm run smoke` PASS (23 PASS lines incl. new: WebGL context loss restore/fallback/PNG-while-lost, P2 refined display
and labels, vector solver selection with browser/Node n_eff agreement and H components; 29 s; pool 2).

Measurements (headless Chrome, ANGLE Metal Apple M4 Pro, production build, other lanes running): mao2022-a with the
engine's P2 default draws 440,744 refined triangles; pan and zoom rAF interval median/p95 16.7/16.7 ms, CPU draw
0.1/0.2 ms; |E| with 12 contours and arrows 16.7/16.7 ms, CPU draw 0.3/0.4 ms; first field paint 63.1 ms after the
result (includes building the refined mesh and its triangle index). renaud2023-3um-738 (253,700 refined triangles)
first paint 38.5 ms.

Requests (round 2):
- L-PARAM: `yaml-edit.mjs` `setIn`/`applyOverrides` print with padded flow collections; adopt
  `toString({ lineWidth: 0, flowCollectionPadding: false })` or a value splice (the UI does its own splice).
- L-PARAM: `run.d.mts` `optical` result type lacks the vector fields (`order`, `nDof`, `teFraction`, `residual`,
  `effectiveAreaUm2`, `nModesComputed`, `solverWarnings`, `groupIndexMethod`); the UI reads them untyped.
- L-PARAM/L-VEC: a Pockels delta n (or delta eps) field export would enable the S6 delta n view.


## TODO (round 1)

- [x] DevLog plan (this file)
- [x] Pure modules + tests: mesh index/probe/line sampling, colormaps, scales, ticks, yaml edit, sweep values, url state
- [x] WebGL2 renderer + Canvas 2D fallback (`?renderer=canvas` forces the fallback)
- [x] Graphics (pan/zoom, probe, colorbar, contours, arrows, cut line, PNG, zoom extents/window, stale marker)
- [x] LinePlot (nice ticks, log axes, hover readout, multiple series, overlay points with device_id, PNG/CSV)
- [x] Worker protocol; L-PARAM field export (`fields: true`) and sweep API adopted; dev field adapter removed
- [x] Workbench state class, Model Builder tree, settings forms, YAML round trip, stale state
- [x] Bottom panel (Messages, Progress, Log, Table), timestamped rows, log download
- [x] Sweep pool (config studies via `enumerateSweep`/`runSweepPoint`, custom path or `params` override), sweep
      plot with study `sweep_targets` (or atlas device columns) overlaid, cancel
- [x] SimStageResults without Plotly; chunk graph checked
- [x] URL state + Link button
- [x] Mobile 390 px
- [x] Smoke extension; gates
- [x] Screenshots reviewed (1440/390, dark/light); temp screenshots deleted
- [x] Perf numbers recorded

## Progress log

- 2026-10-14 23:10 PDT Read DevLog-023, current /sim route, worker, components, app shell, smoke, engine types and
  the eo_fem reference UI (read-only). Plan written. No DevLog-026 (L-PARAM) yet; building against the O4 contract.
- 2026-10-14 23:30 PDT Pure modules + 11 unit tests, WebGL2 renderer + Canvas 2D fallback, Graphics, LinePlot, tree,
  settings, bottom panel, sweep pool, worker protocol with a temporary dev field adapter. `npm run check` 0/0, build OK;
  /sim node no longer reaches the Plotly chunk (manifest closure check).
- 2026-10-14 23:35 PDT Coordinator limits applied: one heavy task at a time, `nice -n 10`, one headless Chrome, pool
  capped at 2 in tests (`?pool=2`), one server. Dev server dropped: it reloads the page whenever another lane edits
  `engine/`; visual checks run on a production build + `vite preview` (port 47391) instead.
- 2026-10-14 23:45 PDT L-PARAM API landed (DevLog-026): worker switched to `runCrossSection(text, {fields: true,
  cache})`, `fieldTransferables`, `runSweepPoint`/`enumerateSweep` for config studies, `params` overrides for
  `params.NAME.value` sweeps. Dev field adapter removed (only a mesh-only job remains, `lib/sim/meshJob.ts`). Engine E
  is V/m per volt of terminal voltage; the UI shows V/µm. Forms read the unexpanded source document (`preview.source`),
  show resolved library/template values in italics, and make template-generated geometry read-only.

- 2026-10-15 00:05 PDT Gates: `npm test` 46/46 (5 files; 11 new in `lib/sim/sim.test.ts`), `npm run check` 0 errors
  0 warnings (439 files), `npm run build` OK, `npm run smoke` PASS (21 PASS lines, 18 s; pool capped at 2 via
  `?pool=2`). Visual pass on the production build at 1440 px and 390 px, dark and light (mao2022-a, renaud2023-3um-738,
  deng2026-a draft, analytic fixtures); findings fixed (window-label overlap, page/graphics class collision, settings
  tab on node select, missing-config flag, policy note vs "No messages", compact param inputs). Temp screenshots and
  scratch scripts deleted.

## What was built (files)

- `app/src/routes/sim/+page.svelte`: full-viewport workbench (toolbar, tree | settings | graphics, bottom tabs),
  pointer/keyboard splitters with sizes in localStorage (try/catch), URL state, Link button, diagnostics hook
  (`?debug=1` or dev server: `window.__simWorkbench`, `window.__simSynthetic(nTris)`).
- `app/src/lib/sim/`: `workbench.svelte.ts` (state, jobs, sweep), `ModelTree`, `Settings`, `Field` (YAML-path form
  field; reads the unexpanded source, italic = resolved library/template value), `Graphics` + `renderer.ts`
  (WebGL2 / Canvas 2D), `fieldsView.ts`, `fieldmath.ts`, `colormap.ts`, `ticks.ts`, `LinePlot`, `CutLinePanel`,
  `PlotSettings`, `DerivedValues`, `TargetsTable`, `SweepSettings`, `SweepPlot`, `BottomPanel`, `Splitter`,
  `pool.ts`, `meshJob.ts`, `yamlEdit.ts`, `sweepValues.ts`, `urlState.ts`, `units.ts`, `labels.ts`, `exportUtil.ts`,
  `synthetic.ts` (renderer measurements only, lazy chunk), `types.ts`, `sim.test.ts`.
- `app/src/lib/sim.worker.ts`: `run` (runCrossSection with `fields`, per-worker reuse `cache`, transferables),
  `point` (runSweepPoint), `mesh` (mesh only).
- `app/src/lib/SimStageResults.svelte`: Plotly replaced by three native LinePlots; `part` prop (eo | rf | all).
- `app/src/lib/CrossSection.svelte`: deleted (geometry drawing moved into Graphics).
- `app/scripts/smoke.mjs`: sim steps rewritten for the workbench and extended (tree navigation, Build mesh on a draft,
  field view + probe, quantity switching, cut line, stale marker, cancel, optical field view, form-edit YAML round
  trip, custom sweep on a 2-worker pool with Node agreement, sweep cancel, URL state restore, 390 px).

## Decisions

- UI-D1 Stale results stay visible with a marker (graphics tag, tree tags, notice); a new Compute clears them first
  (keeps the existing error/cancel contract: a cancelled or failed run shows no metrics).
- UI-D2 Template-generated geometry is read-only in the forms (it is not in the source document); the Geometry node
  shows the template inputs instead. Material fields show library values in italics; editing writes an override.
- UI-D3 Engine E fields are V/m per volt of terminal voltage; the UI shows V/µm (x 1e-6).
- UI-D4 Paper overlay on the sweep plot: the study's `sweep_targets` when present (value, `source.device_id`);
  otherwise atlas device columns chosen by the user (defaults by name). No unit conversion is applied; the plot note
  says so.
- UI-D5 Per-arm single-arm VπL is shown as λ / (2 |dn_eff/dV|) with λ from the run input (tooltip states the formula;
  it is not the MZM value).
- UI-D6 Sweep pool size `min(points, hardwareConcurrency - 1, ?pool=N)`; tests use `?pool=2`.
- UI-D7 Dev server is unusable for checks while other lanes edit `engine/` (Vite reloads the page); checks run on a
  production build.

## Requests to other lanes

- App shell (not L-UI): remove the global `*:not(.spinner) { border-radius: 0 !important; }` in `app/src/app.css`.
  All new /sim components already set `border-radius: 0` per component; other routes need the same audit first.
- L-PARAM: a typed mesh-only entry point (for example `buildSectionMesh(text, section, meshScale)` with a `.d.mts`) so
  `lib/sim/meshJob.ts` no longer reaches untyped `section.mjs`/`crossSectionOf` through `import.meta.glob`.
- L-PARAM: re-export a YAML round-trip helper (`setIn(text, path, value)`) or `parseDocument` from `config.mjs` so
  `lib/sim/yamlEdit.ts` no longer imports `engine/node_modules/yaml/browser/index.js` by path.
- L-PARAM: `opticalFields` units and per-arm field export are consumed as published; please record any change of
  `fields` shape in DevLog-026 (the UI reads `es`, `optical`, `arms.A/B`, `modes[].components`).
- L-VEC: when vector modes land, `components {ex, ey, ez, hx, hy, hz}` are picked up automatically (each component is
  a selectable quantity; intensity sums the `e*` components).

## Measurements (2026-10-15 00:00 PDT, headless Chrome on the user's laptop, ANGLE Metal, Apple M4 Pro, other lanes running)

Method: production build + `vite preview`; 180 frames, one synthetic pointer-move (pan) or wheel (zoom) event per
animation frame; rAF interval and the graphics' own CPU draw time (`data-frame-ms`; GPU work is asynchronous).

| Case | Triangles | rAF interval median / p95 (ms) | CPU draw median / p95 (ms) |
|---|---|---|---|
| mao2022-a, configured mesh, potential, pan | 110,186 | 16.7 / 16.7 | 0.1 / 0.2 |
| mao2022-a, zoom | 110,186 | 16.7 / 16.8 | 0.1 / 0.2 |
| synthetic grid, pan | 199,808 | 16.7 / 16.7 | 0.1 / 0.2 |
| synthetic grid, zoom | 199,808 | 16.7 / 16.8 | 0.0 / 0.1 |
| synthetic grid, pan with 12 contours + arrows | 199,808 | 16.7 / 16.8 | 0.1 / 0.3 |
| Canvas 2D fallback, mao2022-a pan (60k budget LOD) | 110,186 | 33.3 / n.r. | 26.7 / n.r. |
| Canvas 2D fallback, synthetic pan | 199,808 | 33.3 / n.r. | 22.7 / n.r. |

- Time to first field paint after the result message: 18.4 ms (mao2022-a, 110,186 triangles, potential; includes
  buffer upload and triangle-index build), 8 ms (synthetic 199,808, already indexed path), 45.7 ms with the Canvas 2D
  fallback. renaud2023-3um-738: 10.9 ms (63,425 triangles).
- Solve wall time in the browser (Compute click to result): mao2022-a ES 830 ms; renaud2023-3um-738 ES + optical +
  EO 639 ms wall, engine 615 ms. Config study `gap` (4 points, ES + optical + EO) on 2 workers: 1,388 ms wall.
- renaud2023 at mesh level Fine (0.5) stops with the engine's vertex budget error (shown in Messages).
- `/sim` route closure: 10 files, 456,419 bytes (engine, yaml, UI); no Plotly chunk (4.6 MB, still used by
  /explore). Worker chunk 268,536 bytes.

## Limitations

- Build mesh is one action (no Build Selected / Up To Here); geometry has no separate build step (polygons are drawn
  directly from the config).
- Contours only on node-valued fields (potential, optical, or element fields with Smooth on).
- E arrows use uniform length (direction only) on a 36 px screen grid; magnitude is in the color plot.
- No pinch zoom on touch devices (single-finger pan only); wheel zoom on desktop.
- Sweeps are one-dimensional in the custom mode; multi-axis sweeps run only as config studies (plot uses the first
  axis).
- Free YAML-tab edits are not encoded in the shared link (form edits are).
- The run worker is created per Compute, so the engine reuse cache only helps within a sweep worker.
- Headless frame times are vsync-bound (16.7 ms); they show no dropped frames but not the headroom. GPU time per frame
  was not measured (no timer query used).

## Round 3 (2026-10-15 08:17 PDT)

Input: coordinator round 3 (L-PARAM rounds 2 and 3 done, DevLog-026). Plan: re-check U2 on the final API and drop
casts the new `run.d.mts` types cover; use the engine's `PRINT` for YAML re-printing; add the Pockels delta n view;
gates with a browser-vs-Node delta n step.

- U2 re-check: UI field types are now structural subsets of the engine types (`EsFields`, `OpticalFields` with
  `pockels: PockelsField`, `ModeComponents` with optional members); the worker assigns `result.fields` without a cast;
  `DerivedValues` reads `OpticalDiagnostics` (vector `order`, `nDof`, `teFraction`, `residual`, `effectiveAreaUm2`,
  `solverWarnings`, `nModesComputed`, `groupIndexMethod`) and `result.timing` without casts. Remaining casts are the
  untyped raw config (`raw`/`source` are user YAML) and the worker `self`.
- YAML: re-printing uses the engine's exported `PRINT` (`lineWidth: 0, flowCollectionPadding: false`); the value
  splice stays (it keeps the rest of the text byte-identical, which `PRINT` alone does not guarantee).
- Pockels view: quantities `Pockels dn_xx / dn_yy / dn_zz / d eps_xy (per V)` for the optical window and arm A/B
  meshes (mode picker selects the mesh); values per triangle centroid in 1/V per volt of terminal voltage; labelled
  `(per element)` in probe, colorbar, cut line and CSV (`(smoothed)` replaces it when Smooth is on); signed, so the
  automatic scale is symmetric with the diverging map; tooltip carries the engine's units, sign convention and
  wavelength. Tree node Results, Pockels delta n. Screenshot check (renaud2023-3um-738, optical window): non-zero
  only in the LN slab and rib, negative dn_xx in arm A (x-cut, +x field), symmetric colorbar, probe
  `dn_xx (per element) -3.04e-5 1/V`.
- Gates (2026-10-15 08:17 PDT, `nice -n 10`, one at a time, pool 2): `npm test` 48/48, `npm run check` 0/0 (441 files), `npm run build`
  OK, `npm run smoke` PASS, 24 PASS lines, 33 s; new step: 6 browser probes of dn_xx at Node triangle centroids equal the
  Node export to 1e-12 relative, unit `1/V`, label `per element` (vector numbers compared on the same tree, as L-VEC
  changes vector mesh sizing concurrently).
- Scratch in `scratchpad/l-ui-r3-work/` only, deleted at the end; preview server stopped.

## Round 4 plan (2026-10-15 08:35 PDT, before implementation)

Input: `DevLog/audits/simulator-final-ui-audit-2026-10-15.md` (W1-W14). Scratch `scratchpad/l-ui-r4-*/` only.
- W1 every form enumeration from the engine: typed exports (`GROUP_INDEX_METHODS`, `OPTICAL_SOLVERS`,
  `METAL_POLICIES_ALL`, `ELEMENT_ORDERS`), the rest from the engine JSON schema enums (`engine/schema/sim.schema.json`:
  polarization, arm/terminal drive, loading type, loss models, symmetry, boundary). No hard-coded lists.
- W2 template configs: element order and mesh hints bound to `template.mesh.<key>` (resolved value in italics).
- W4 Canvas 2D fallback over budget: screen-space raster (one sampled cell per few px through the triangle index,
  gap-free) with marching-squares contours, instead of skipping triangle indices.
- W5 listeners removed from a detached canvas; restore events for a canvas that is no longer shown are ignored.
- W6 every RF plot gets `Frequency (GHz)` (axis and CSV header).
- W7 dataset picker shown for Pockels quantities; dataset (optical window / arm A / arm B) in label, colorbar, probe.
- W8 P2 |E| probe/cut line = hypot of the interpolated components (shading stays corner-based).
- W9 vector components labelled `(per element)`.
- W10 Smooth control disabled (reason in tooltip) when the field is not per element.
- W12 scoped rule for Plotly modebar `::before/::after`; radius scan includes pseudo-elements.
- W13 P2 refined display mesh and its triangle index built in the worker and transferred.
- W14 hash writer is in `app/src/routes/+layout.svelte` (app shell, not this lane): report only.
- W3 (YAML key insertion) is L-PARAM's (engine yaml-edit.mjs); no local workaround. W11 is engine/coordinator.

## Round 4 results (2026-10-15 08:43 PDT)

| Item | Change |
|---|---|
| W1 | `lib/sim/enums.ts`: `GROUP_INDEX_METHODS`, `OPTICAL_SOLVERS`, `METAL_POLICIES_ALL`, `ELEMENT_ORDERS` from engine exports; polarization, arm/terminal drive, loading type, loss models, symmetry, boundary, vector order from the engine JSON schema enums; no hard-coded lists in Settings |
| W2 | template configs bind element order and mesh hints to `template.mesh.<key>` (editable; the engine copies them into the generated geometry) |
| W4 | Canvas 2D fallback above the 60k-triangle budget samples one cell per few px through the triangle index (ImageData, gap-free) and draws marching-squares contours; mao2022-a P2 (440,744 display triangles) background fraction inside the optical window 0.0000 |
| W5 | fallback removes the context listeners from the detached GL canvas; events from a canvas that is no longer shown are ignored (smoke: late restore after fallback leaves the Canvas 2D renderer and adds no message) |
| W6 | every RF plot: x label `Frequency (GHz)` (axis and CSV header) |
| W7 | dataset picker shown for Pockels quantities; `[optical window]` / `[arm A]` / `[arm B]` in label, colorbar, probe; Window zooms to the shown dataset's own window |
| W8 | P2 |E| probe and cut line = magnitude of the interpolated components (unit test: exact for a quadratic potential) |
| W9 | vector components and vector |E|^2 labelled `(per element)` |
| W10 | Smooth control disabled with the reason when the shown field is not per element |
| W12 | `.js-plotly-plot .plotly .modebar-btn[data-title]::before/::after` (one class above Plotly's injected rule); radius scan including `::before`/`::after`, / /table (drawer) /explore (modebar hovered) /about /sim, dark and light: 0 rounded |
| W13 | P2 refined mesh and its triangle index built in the worker and transferred; first paint mao2022-a 22.7 / 16.4 / 18.0 ms after the result over 3 Computes (was 43 to 98), 0 long tasks |
| W3 | not worked around (L-PARAM, engine `yaml-edit.mjs`) |
| W11 | engine/coordinator (worker-order dependence at 1e-10) |
| W14 | not fixed: the hash writer is the app shell layout `$effect` (`app/src/routes/+layout.svelte:32-44`), outside the sim code and outside this lane's write paths; suggested fix: write the table hash only on /table and /explore |

Gates (2026-10-15 08:43 PDT, `nice -n 10`, one at a time, pool 2): `npm test` 48/48 (P2 test extended for W8), `npm run check` 0/0
(443 files), `npm run build` OK, `npm run smoke` PASS, 27 PASS lines, 33 s; new steps: group-index options (W1),
template element order to `template.mesh` (W2), gap-free Canvas 2D at P2 (W4), late restore after fallback (W5),
Pockels arm picker and arm label (W7). Screenshots inspected: Canvas 2D P2 potential with contours (continuous,
gap-free), Pockels dn_xx arm B. Scratch `scratchpad/l-ui-r4-work/` deleted; preview stopped.

## W14 (2026-10-15 08:44 PDT, approved narrow fix)

`app/src/routes/+layout.svelte` hash effect (only change in that file): filters and table sort are written to the hash
only on /table and /explore (route from `page.url.pathname` minus the base path). Smoke: /sim URL has no hash after
load (new assertion); the existing table/explore hash adoption, stale sort key and shared-URL search steps still pass.
Gates: `npm test` 48/48, `npm run check` 0/0, `npm run build` OK, `npm run smoke` PASS (27 PASS lines, 34 s).

## Round 5 (2026-10-15 09:23 PDT)

Input: `DevLog/audits/simulator-round5-verification-2026-10-15.md` (G1-G3 for this lane).
- G1: `result.electrostatics` is nullable (engine `modeOnly`). Derived Values shows a mode-only line instead of the
  node/triangle line, and the run label says "no electrostatics"; the other sim views already treat `fields.es` as
  optional (no potential/field quantities, no arrows, no ES mesh stats).
- G2: smoke builds the vector variant with the engine `setIn` (replaces the fixture's pinned `solver: scalar`), and
  the chen2022 optical-stop assertion uses the engine's own error text (computed in Node from the same tree), so it
  follows whichever solver is the default.
- G3: `lib/sim/yamlEdit.ts` delegates `setIn`, `deleteIn`, `getIn`, `applyOverrides`, `splitPath` to
  `engine/src/yaml-edit.mjs` (splice helpers); the local splice/printer code is removed. New tests on the real configs:
  chen2022-c `geometry.mesh.element_order` insert (one line changed, inside the flow map) and delete (byte for byte),
  renaud2023 `optics.solver` insert and delete (byte for byte), renaud2023 `params.gap_um.value` edit (one line).
- G9 (`deleteIn` pruning an emptied parent map): listed in DevLog-026 but not yet in `yaml-edit.mjs`; the app calls the
  engine `deleteIn`, so it inherits the fix when it lands. Not reachable from the forms today (`mode_select` is not a
  form field).
- Gates (2026-10-15 09:23 PDT, `nice -n 10`, one at a time, pool 2): `npm test` 51/51, `npm run check` 0 errors 0 warnings (443 files),
  `npm run build` OK, `npm run smoke` PASS (27 PASS lines, 27 s).
