---
title: Results UI (lane R-UI, DevLog-030) - COMSOL-style datasets, plot groups, derived values, tables
date: 2026-10-15
status: done 2026-10-15 15:28 PDT (gates green); plan written 14:40 PDT before implementation
owner: R-UI
scope: app/src/lib/sim/, app/src/lib/sim.worker.ts, app/src/lib/SimStageResults.svelte, app/src/routes/sim/, sim steps of app/scripts/smoke.mjs
---

# DevLog-032: Results UI (COMSOL Results model)

Parent: [DevLog-030](DevLog-030-results-postprocessing-comsol-spec.md) (decisions P1-P7, R-ENG/R-UI contract). Engine side:
DevLog-031 (R-ENG, not yet published at 14:40). Previous UI: [DevLog-027](DevLog-027-sim-workbench-ui.md).

## COMSOL-UX reference (semantics adopted)

Sources: COMSOL Multiphysics Reference Manual, Results chapter (doc.comsol.com, 6.x; color tables page
`comsol_ref_results.37.017`, Arrow Positioning `comsol_ref_results.37.014`, API `ArrowSurface`), fetched 2026-10-15 at
>= 5 s spacing. Only the semantics below are adopted; names are COMSOL's, data and colors are our own.

| COMSOL concept | Semantics adopted here |
|---|---|
| Results tree order | Datasets, Views (not used: one 2D view per plot group), Derived Values, Tables, Plot Groups, Export; Selections live under Results (COMSOL keeps them under Definitions; we have no Definitions node) |
| Dataset: Solution | one per solved optical/electrostatic solution of the last Compute: `es` (electrostatics), `opt` (optical window, mode k), `armA`/`armB` (EO arm modes, mode k), EO per arm (Pockels, integrand when the engine exports it) |
| Dataset: Cut Line 2D | source dataset + two points (µm) + resolution; plots sample the expression along arc length |
| Dataset: Cut Point 2D | source dataset + point(s); used by Point Evaluation and Line Graph markers |
| Dataset: Parametric (sweep) | global values per sweep point; fields per point only when the sweep kept them (retention) |
| Selection | named list of domains (regions); created from a region click in select mode (shift-click adds) or from the region list; used by plot filters and surface derived values |
| Plot Group (2D/1D) | ordered list of plot features drawn in order on one view; title (automatic: dataset, feature type, expression, unit); one color legend per surface/contour feature with color table coloring |
| Surface | expression, unit (display unit), range (automatic or manual color range), coloring (color table, reverse), scale (linear, symmetric, log), filter by selection |
| Contour | levels by number of levels or explicit list; coloring by color table or uniform color |
| Arrow Surface | x and y components; grid placement (x/y grid points); arrow length proportional, normalized or logarithmic (range 100); scale factor; arrow heads |
| Line (2D) | boundaries of domains (here: region outlines), uniform color, filter by selection |
| Max/Min Marker | location and value of max and min of an expression over the dataset (or selection), labelled |
| Line Graph (1D) | cut line dataset, one or more y expressions vs arc length |
| Global (1D) | global expressions vs the sweep parameter; paper points overlaid |
| Table Graph (1D) | table source, x column, y columns |
| Color tables | Rainbow (blue-cyan-green-yellow-red, default), RainbowLight (lighter), Thermal (heated metal, light = high), Wave (symmetric, blue negative, red positive; used with the symmetric scale), Viridis, Cividis, GrayScale; anchors are our own approximations of the described ramps, not COMSOL data |
| Derived Values | Global Evaluation, Surface Integration/Average/Maximum/Minimum (over a selection or all domains), Line Integration/Average (cut line), Point Evaluation (cut point or click); Evaluate appends rows to a Table (columns dataset, parameter values, expression, value, unit); evaluation over all sweep points adds one row per point |
| Tables | accumulate rows; CSV export; Table Graph plots columns |
| Graphics toolbar | zoom extents, zoom box, zoom to window, pan, select (domains), measure (distance), image snapshot with size, legend and title |
| Export | Data (plotted values of a feature, CSV), Table (CSV), Image (PNG at chosen size) |

## Plan (written before implementation, 2026-10-15 14:40 PDT)

### Worker protocol (P1)

- The run worker is no longer terminated after `result`: it keeps the solution (result + fields, and the engine
  store once `runCrossSection(..., {keep: true})` exists) and serves post requests. Fields reach the main thread as
  structured-clone copies (meshes for rendering); P2 display arrays are transferred (worker builds them, W13).
- Requests `{type: 'post', id, op: 'plot'|'derived'|'datasets'|'variables'|'modes'|'probe'|'line', ...}`; replies
  `{type: 'post', id, ok, data | error}` with typed arrays transferred. Worker-side queue (one item per macrotask) so
  `{type: 'cancel', ids}` drops queued requests; main thread keeps a sequence per plot feature and ignores stale
  replies (marked stale). A new Compute or a config switch terminates the worker (solution dropped).
- Smoke: "workers == 0" assertions become "no worker besides the solution holder".

### Adapter (deleted when DevLog-031 lands)

- `lib/sim/post/adapter.ts` implements the DevLog-030 contract on today's exported fields: datasets, variable
  registry (only variables the fields contain: x, y, es.V, es.Ex, es.Ey, es.normE, opt components, opt.normE, opt.I
  (= sum of squared E components, scalar |psi|^2), eo.dnxx/dnyy/dnzz/depsxy, globals from metrics), a small
  recursive-descent expression parser with SI dimension vectors and display-unit conversion, plot evaluation (node,
  element or corner values on the dataset's display mesh), derived values (area integrals by the element
  interpolation, max/min with location, line integrals, point evaluation; P2 potential evaluated quadratically) and a
  mode table from what the fields carry (n_eff, TE fraction; ng/loss/Aeff/confinement for the solved mode only).
- Variables the engine does not export (eo.integrand, es.D, es.We, eps) are not listed; features or default plot
  groups that need them appear only when the engine registry provides them (no fake capability).

### Results model (`lib/sim/results.svelte.ts`)

- Datasets (store + UI cut lines/points + sweep), Selections, Plot Groups (2D/1D) with Features, Derived Value nodes,
  Tables. Add, duplicate, delete, rename for plot groups, features, cut lines/points, selections, derived values,
  tables (compact + button and context menu in the tree).
- Default plot groups after a solve (P4): Electric Potential (Surface es.V + Contour es.V), Electric Field (Surface
  es.normE + Arrow Surface es.Ex/es.Ey), Optical Mode (Surface opt.normE^2 on each optical dataset), Pockels dn
  (Surface eo.dnxx on the optical dataset), EO Overlap (Surface eo.integrand + Contour opt intensity + arm window
  outlines; only when eo.integrand exists), RF line (1D, when rf), Sweep (1D Global, after a sweep). User-modified
  groups are kept across re-solves; defaults are re-created only when missing.

### Graphics

- Renderer draws layers (surface, contour, arrows) from several meshes in one frame; mesh buffers cached per mesh;
  contour lines in the fragment shader (N levels or up to 32 explicit levels, color table or uniform); region mask
  texture for selection filters; arrows instanced with proportional/normalized/log length.
- Overlay: region outlines (Line feature), window outlines, domain labels, selection highlight, cut lines/points,
  max/min markers, ruler, zoom box; axes frame with µm ticks; title line (dataset, feature, expression, unit); one
  colorbar per color-table feature. Modes: pan, zoom box, select, measure. Image export dialog (width, height,
  legend, title) renders off-screen at the chosen size.
- Geometry and Mesh nodes keep their own views (mesh colored by material, element size or min angle).
- 1D plot groups render a LinePlot in the graphics panel (same size; canvas kept mounted).

### Settings pages

- Plot group (name, dataset default, title, legends), feature pages (dataset, expression with autocomplete and inline
  error, unit, range, color table, levels, arrows, selection filter, visibility), dataset pages (cut line/point
  coordinates, mode picker = Mode Analysis table), selection page, derived value pages (kind, dataset, expression,
  selection, Evaluate, Evaluate over sweep), table page (rows, CSV, Table Graph), EO Coupling results page, Export.

### Gates

`npm test` (expression parser, units, adapter integrals vs analytic, color tables), `npm run check` 0/0, `npm run
build`, `npm run smoke` (new steps listed in the TODO), screenshots 1440/1280/390 dark and light, P6 measurements.

## TODO

- [x] Adapter + contract types + tests (adapter deleted after DevLog-031 landed)
- [x] Worker protocol (solution kept, queue, cancel, superseded requests dropped)
- [x] Results model, default plot groups
- [x] Color tables
- [x] Renderer layers (WebGL2 + Canvas 2D)
- [x] Graphics: layers, colorbars, title, axes, modes (pan, zoom box, select, measure, cut line, cut point), labels, markers, image export
- [x] Results tree (COMSOL order) + context actions (right-click or +/... button, F2 rename, Delete)
- [x] Feature/plot group/dataset/selection settings, expression input with autocomplete and inline check
- [x] Derived Values + Tables (Global Evaluation over sweep points), Table Graph, CSV, Table window
- [x] Mode Analysis table
- [x] EO Coupling results page
- [ ] Field datasets per sweep point: not built (see Open items)
- [x] Smoke extension; gates; screenshots; performance
- [x] Switch to the DevLog-031 API and delete the adapter

## Progress log

- 2026-10-15 14:40 PDT Read DevLog-030, DevLog-027, all of `app/src/lib/sim/`, worker, page, smoke, engine types. COMSOL
  reference fetched (3 requests, >= 5 s apart). DevLog-031 not present; building on the contract with an adapter.
- 2026-10-15 15:03 PDT Adapter (temporary contract implementation), worker protocol (solution kept in the run worker,
  queue, cancel, superseded requests), results model, color tables, layered renderer, Graphics rewrite, Results tree,
  settings pages, derived values/tables, mode table, EO page: `npm run check` 0/0, `npm test` green.
- 2026-10-15 15:08 PDT First visual pass (production build, port 47613, renaud2023-3um-738 with optical + EO): default
  groups, layered features, selection by click, Surface Integration into a table, cut line through the rib, export
  dialog all work; plot round trip 0.6-3.3 ms. Fixes: per-group view memory + zoom to dataset extents, title strip,
  tick-label halos, table column widths, Table window shows the last table, unit reset on dimension change, solved
  mode index from `selectedMode`, request JSON copy (reactive proxies are not cloneable).
- 2026-10-15 15:10 PDT DevLog-031 API v1 complete (R-ENG gates green). Adapter deleted (`post/adapter.ts`, `expr.ts`,
  `units.ts`, `globals.ts`); the worker now holds the engine store (`post/session.ts` maps base dataset + mode to
  engine ids, region names, cut lines by geometry, P2 display via an engine cut-point dataset at the refined nodes,
  min/max locations). Sweep points carry engine `globals`; Global plots/evaluations use `evaluateGlobals`. EO page shows
  the engine breakdown (coefficient x region, tensor terms), conventional Gamma with gap, textbook VpiL and formulas.
  Tests on the analytic G-S-G fixture: gap field 0.5 V/um, line integral -1 V, int eo.integrand = engine dn/V (1e-9),
  mode index mapping. Synthetic measurement field removed (the engine store needs a real run).
- 2026-10-15 15:20 PDT P2 display on the engine store: continuous expressions are evaluated at the vertices (engine node
  plot) and at the 3 edge midpoints of every element (structured barycentric point set through store internals, no
  point location), giving exact values at the refined display nodes; renaud2023 potential 45 ms -> 6.8 ms. Bug fixed:
  layers used the dataset mesh instead of the plot result's mesh (P2 values drawn on the coarse mesh).
- 2026-10-15 15:27 PDT Gates (`nice -n 10`, one at a time, `?pool=2`): `npm test` 58/58 (6 files; new
  `post/session.test.ts` on the analytic G-S-G fixture), `npm run check` 0 errors 0 warnings (457 files), `npm run build`
  OK, `npm run smoke` PASS, 32 PASS lines, 33 s. Radius scan of /sim incl. `::before/::after`, menu, autocomplete and
  export dialog open, dark and light: 0 rounded elements.

## What was built (files)

| File | Role |
|---|---|
| `lib/sim.worker.ts` | `run` with `keep`: the worker keeps the engine store (`PostSession`) and answers `post` requests from a queue (one per macrotask; `cancel` drops queued ids); results carry display meshes, base datasets and `runGlobals`; sweep `run`/`point` replies carry `globals` |
| `lib/sim/post/contract.ts` | UI <-> worker protocol (base dataset + mode, region-name selections, line geometry); engine types re-exported |
| `lib/sim/post/session.ts` | thin mapping onto `engine/src/postproc` (DevLog-031 v1): dataset ids (`opt` + k -> `opt:k`), cut lines cached by geometry, P2 display values, min/max with locations over a selection |
| `lib/sim/post/client.ts` | request ids, supersede by slot (cancel + `StaleError`), round-trip timing |
| `lib/sim/post/ui.ts` | unit display, sweep globals (`evaluateGlobals`), RF frequency variables (`compileExpression`), metric -> global map |
| `lib/sim/results.svelte.ts` | datasets, mode per dataset, cut lines/points, selections, plot groups with features, derived nodes, tables; add/duplicate/delete/move; default plot groups (P4) |
| `lib/sim/plots.svelte.ts` | reactive request cache bound to the solution generation (48 entries max) |
| `lib/sim/layers.ts` | feature range, contour levels, region masks, arrow grid (proportional/normalized/logarithmic), auto title |
| `lib/sim/renderer.ts` | layer renderer: surface, contour (64 levels, table or uniform), region; region mask; arrows with or without heads; mesh/value buffer cache; Canvas 2D fallback with the same layers |
| `lib/sim/colormap.ts`, `colorbar.ts` | Rainbow, RainbowLight, Thermal, Wave, Viridis, Cividis, GrayScale (reverse); legend drawing |
| `lib/sim/Graphics.svelte` | plot group view (layers, legends, title strip, max/min markers, lines, edges, windows, domain labels, cut lines/points), tools (pan, zoom box, select, ruler, cut line, cut point), per-group view memory and dataset extents, axes frame with tick halos, exact probe (worker point evaluation), image export (size, legend, title) |
| `lib/sim/Plot1D.svelte` | 1D plot groups in the graphics window: Line Graph (cut line), Global (sweep points with study targets; RF frequency sweep), Table Graph |
| `lib/sim/ModelTree.svelte` | Results in COMSOL order with context menu, rename, delete |
| `lib/sim/PlotGroupSettings.svelte`, `ResultsPages.svelte`, `ExprInput.svelte`, `ModeTable.svelte`, `EoCoupling.svelte`, `derived.ts` | settings pages, expression field (autocomplete from the registry, functions, inline unit/syntax check), mode table, EO Coupling page, Evaluate into tables |
| `lib/sim/BottomPanel.svelte` | Table window shows the last evaluated or selected table (CSV) |
| removed | `fieldsView.ts`, `PlotSettings.svelte`, `CutLinePanel.svelte`, `synthetic.ts` (and the adapter files) |

## Decisions

- R1 The UI addresses base datasets ('es', 'opt', 'armA', 'armB', 'eoA', 'eoB') plus a mode index (Mode Analysis row);
  the worker maps to the engine mode datasets. Dataset labels drop the selected mode's n_eff (it changes with the row).
- R2 Plot values carry their own display mesh id: P2 continuous expressions on the refined mesh ('es.p2', exact at
  vertices and edge midpoints), P2 discontinuous ones as exact corner values (linear per element), P1 and optical
  meshes node or element per the engine's continuity rule.
- R3 The hover probe is an exact point evaluation in the worker (coalesced, one in flight), not an interpolation of
  the drawn values. Contours of per-element values use the area-weighted nodal average (display only).
- R4 Selections are named domain lists from the solved geometry regions (electrodes are holes in the ES mesh); a
  click in Select mode edits the selection of the active node (feature filter, surface derived value) or a new one.
- R5 A new solution clears datasets and caches but keeps plot groups, selections, cut lines, derived nodes and tables
  (COMSOL keeps the Results tree); default groups are created only when missing.
- R6 Global Evaluation over a sweep and Global plots use the points' engine `globals` on the main thread
  (`evaluateGlobals`); field evaluations over sweep points are not offered (no field solutions are kept per point).
- R7 RF frequency variables: `rf.alpha` is the attenuation constant in Np per length (SI 1/m; the engine units have
  no dB), `rf.alphadB` the plain dB/cm number; the default RF Line 1D group plots `rf.alphadB` (labelled dB/cm).
- R8 Unit display: µ, Ω, ·, ², ³ in titles, legends and probe; values stay in the unit the engine reports.

## Measurements (2026-10-15 15:2x PDT, production build, headless Chrome, ANGLE Metal Apple M4 Pro, `nice -n 10`)

mao2022-a, electrostatics P2 at mesh level Fine (110,186 elements; 440,744 refined display triangles), the heaviest
case the engine vertex budget allows:

| Request (page -> worker -> page, arrays transferred) | first (ms) | repeat (ms) | values |
|---|---|---|---|
| plot es.V (exact at the 221,188 refined nodes) | 3.9 | 2.1 | 221,188 |
| plot es.normE (corner) | 18.3 | 2.7 | 330,558 |
| plot es.V*es.normE | 3.0 | 2.3 | 330,558 |
| plot es.We | 6.6 | 1.2 | 330,558 |
| surface integral es.We (all domains) | 23.5 | 4.2 | - |
| surface maximum es.normE | 15.4 | 3.4 | - |

- Pan and zoom (one synthetic event per frame, 120 frames): Electric Potential (440,744 triangles, surface + 12-level
  contour) rAF median/p95 16.7/18.4 ms, CPU draw 0.8/0.9 ms; Electric Field (110,186 triangles + 1,200 arrows)
  16.7/18.1 ms, CPU 0.7/1.0 ms.
- Long tasks (> 50 ms, PerformanceObserver): none during Compute + first plot, pan/zoom, or plot-group switching.
- renaud2023-3um-738 (optical + EO, vector): every default group plots in 0.6 to 22 ms round trip; registry (6 datasets,
  782 variables) ready 2 ms after the result.
- P6 targets (plot < 50 ms at 400k, derived < 30 ms, 60 fps, no long task > 50 ms): met on this case.

## Open items and requests

- R-ENG: a public entry for values at barycentric patterns of a mesh (the P2 display uses `store.compile`,
  `store.dataset`, `store.run` with a structured point set; fallback through a cut-point dataset is kept).
- R-ENG: `dB` (and `Np`) in the unit parser would let `rf.alpha` display in dB/cm.
- Field datasets per sweep point (plots/surface integrals over all points) are not built: the engine sweep store keeps
  at most a few full stores; needs a retention policy decision.
- Engine `opt` and `armA` are separate datasets even when arm A is the optical window, so three Optical Mode default
  groups appear for a two-arm run.
- Free-hand polygon selections, boundary selections, streamlines and 3D are not implemented (not in scope).
- Scratch `scratchpad/r-ui-work/` (session scratchpad) deleted at the end; preview server (port 47613) stopped.

## Round 2 plan (2026-10-15 15:48 PDT, before implementation)

Input: `DevLog/audits/simulator-results-ux-review-2026-10-15.md` (X1-X24), DevLog-031 "Round 2 progress" (engine API
additions), orchestrator round-2 list. Scratch in the session scratchpad `r-ui-r2-*/` only; same hardware rules.

Engine round 2:
- `evaluatePlot(..., {location: 'p2nodes'})` replaces the store internals (P2 display values at the DOFs); the cut-point
  fallback is removed.
- RF 1D plots from the engine `rf` dataset (`rf.alpha_dB` in dB/cm, `rf.nRF`, `rf.Z0`); local RF variables removed.
- `aliasOf`: arm datasets that share the optical model get no separate default groups and are labelled as aliases.
- Parametric dataset: plot groups get a Data "Parameter value" selector (last Compute or any sweep point). Fields of a
  point are computed on demand in the solution worker (`storeForSweepPoint` for config studies; a keep-run for custom
  path sweeps), bounded LRU of 2 point stores, progress rows while recomputing.

Findings:
- X1/X14/X17 tables in wide format: dataset, one numeric column per swept/overridden parameter (with unit), x and y for
  point evaluations, one column per evaluated quantity `kind(expr) [selection] (unit)`; Table Graph x/y from numeric
  columns only (y: several). Units prettified; the expression check shows the integrated unit for integrals.
- X2/X13 expression input: Enter commits the typed text; a suggestion is taken only after arrow selection, Tab or a
  click; suggestions de-duplicated. Insert/Replace Expression browser (registry tree by group with units,
  descriptions, filter). Unit field: compatible units (by dimension) plus free text.
- X3/X8 one mode label everywhere (`k=1 (TE0)` from the engine labels when DevLog-031 round 3 lands, else `k=1`);
  titles state dataset, mode, n_eff and expression; EO page uses the table k of the arm's solved mode.
- X4 Select tool edits only the active Selection node (or creates a new Selection node); applying a selection to a
  feature or derived value is an explicit choice in its Selection field; every change is logged.
- X5 Global feature: comma-separated expressions are checked one by one.
- X6 page messages keyed by node; X7 second y axis per 1D feature; X9 manual range prefilled with the current range,
  inline note when log cannot use it; X10 arrow placement over the visible view (default), the dataset or the
  selection, with grid counts; X11 line-integral help (Gauss points per element crossing; Resolution = Line Graph
  sampling only); X12 numbered names (Surface 1, Surface 2, Surface Integration 2) and short default group labels;
  X15 legends in a reserved right gutter; X16 icon toolbar that fits at 1280/1440, 2D tools hidden on 1D groups;
  X18 EO page without the duplicated legacy block, button "Integrand across arm"; X19 one sweep plot (the 1D Sweep
  group, default = the study's target metric with paper points), dataset page keeps the table; X20 plot-group views
  kept across recompute unless the geometry changed; X23 legend tooltip says "range of displayed values".
- Settings sections: Data (dataset, parameter value, mode), Expression (expression, unit, description), Title
  (automatic / manual), Range (color range, data range), Coloring and Style, Quality (smoothing for element values;
  P2 resolution).
- Undo/redo (50 steps) of Results edits (add, delete, rename, duplicate, settings), toolbar buttons and Ctrl/Cmd+Z,
  Shift+Ctrl/Cmd+Z outside text fields.
- Custom sharp-cornered tooltip component for the sim UI (`data-tip` instead of native `title`).

Gates: test, check 0/0, build, smoke (X1-X5, parameter selector, undo, tooltip), screenshots 1440/1280/390 dark/light,
radius scan, performance (first plot < 50 ms, 60 fps, no long tasks).

### Round 2 TODO

- [x] p2nodes, rf dataset, aliasOf
- [x] Parametric dataset selector (sweep point fields on demand)
- [x] X1/X14/X17 wide tables, Table Graph
- [x] X2/X5/X13 expression input, expression browser, unit dropdown
- [x] X3/X8 mode labels and titles
- [x] X4 selections
- [x] X6-X20 remaining items
- [x] Settings sections (Data, Expression, Title, Range, Coloring and Style, Quality)
- [x] Undo/redo
- [x] Tooltip component
- [x] Smoke, gates, screenshots, radius scan, performance

### Round 2 results (2026-10-15 16:18 PDT)

| Item | Change |
|---|---|
| Engine round 2 | `post/session.ts` uses public entries only: P2 display from `evaluatePlot(..., {location: 'p2nodes'})` (refined mesh built from the DOF coordinates and `elem`), checks via `evaluateAtPoints` + `referencedNames`, continuity from the registry; RF Global plots from the engine `rf` dataset (`rf.alpha_dB` in dB/cm, `rf.nRF`; local RF variables removed); `aliasOf` arms get no own default groups (labelled "= optical mode"); main runs no longer export `fields` |
| Parametric dataset | plot group Data > Parameter value (last Compute or any finished sweep point); the solution worker computes the point's fields on first use (`storeForSweepPoint` for config studies, a keep-run for path sweeps), keeps 2 (LRU), progress and log rows, `clearPoints` on a new sweep; meshes namespaced `sweep:i/` |
| X1/X14/X17 | wide tables (dataset, numeric swept/overridden parameter columns with units, x/y for point and max/min, one column per quantity `int(expr) [selection] (unit)`), column roles; Table Graph x = numeric column (default the parameter), y = several columns; the integration check shows the integrated unit; units prettified |
| X2/X13 | Enter commits the typed text; a suggestion only after arrow selection, Tab or click; exact match listed first; suggestions de-duplicated; Insert/Replace Expression browser (registry grouped by namespace with units and descriptions, filter); unit field with compatible units (by dimension and integration measure) plus free text |
| X3/X8 | engine mode labels (`k=1 (TE0)`) in the mode table (with a separate "solved" column), plot group Data > Mode, feature Data, EO page per-arm mode (table index space via the arm or aliased dataset) and plot titles (dataset, mode, n_eff, parameter value) |
| X4 | the Select tool edits the active Selection node or creates one; it never sets a feature filter; selection changes, filter changes, tree operations and renames are logged |
| X5 | comma-separated Global expressions are checked one by one (worker and main thread) |
| X6/X11/X12 | page messages keyed by node; help text: 6-point quadrature per element, 3 Gauss points per element crossing, Resolution = Line Graph sampling only; numbered names (Surface 1, Surface Integration 2, Selection 3, 2D Plot Group 2), short default labels (Mode, optical; EO overlap, arm A) |
| X7 | per-feature y axis (left/right) on 1D groups; right axis dashed with its own ticks and label (RF Line default: dB/cm left, n_RF right) |
| X9 | manual color range prefilled with the range shown; note when log cannot use it; manual data range (values outside not drawn, shader and Canvas 2D) |
| X10 | Arrow Surface placement: grid in the visible view (default, re-gridded on pan/zoom), over the dataset, or over the selection bounding box; grid counts |
| X15/X16/X23 | legends in their own column right of the plot (and in a gutter of exported images); icon toolbar (fits at 1280 and 1440; 2D tools hidden on 1D groups; 1D hint); legend tooltip "range of the displayed values" |
| X18/X19/X20 | EO page without the duplicated legacy block (convention line and balance warning kept), button "Integrand across arm"; one sweep plot (1D group Sweep, default = the study's target quantity with paper points, atlas columns when there are no study targets), Parametric Sweep page keeps table, CSV and paper-column selectors; plot group views kept across recompute unless the solved geometry changed |
| Settings sections | Data, Expression (expression, unit, description), Title (automatic/manual/none per feature and group), Range (color and data range), Coloring and Style, Quality (nodal smoothing of element/corner values; P2 resolution fine/normal) |
| Undo/redo | snapshots of the Results model (50 steps, edits within 400 ms coalesce), tree header buttons, Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z outside text fields |
| Tooltips | `Tooltip.svelte` (sharp, delayed, follows the pointer, keyboard focus); every `title` attribute in the sim UI replaced by `data-tip` (smoke: no `[title]` in `.sim-page`); state changes deferred so focus loss during DOM removal does not mutate state inside an update |

Gates (2026-10-15 16:18 PDT, `nice -n 10`, one at a time, `?pool=2`): `npm test` 62/62 (new: sweep-free RF dataset test,
names, wide tables, undo), `npm run check` 0 errors 0 warnings (460 files), `npm run build` OK, `npm run smoke` PASS,
38 PASS lines, exit 0 (new steps: X1 wide sweep table + Table Graph, X5 Global list, Parametric point fields, X2, X3/X8
labels, X4 Select tool, undo/redo, tooltip). Smoke has `SMOKE_TRACE=1` to print page errors as they occur.
Screenshots 1440/1280/390, dark and light, inspected (feature settings, expression browser, EO page, RF two-axis plot,
arrows in view, legend column, mobile). Radius scan of /sim with autocomplete, browser, tooltip, export dialog and
context menu open, dark and light: 0 rounded elements.

Performance (mao2022-a P2 Fine, 440,744 display triangles): first plot after Compute 3.9 ms (was 55.6 ms before the
continuity check stopped calling a point evaluation), first paint 25.0 ms after the result; plot round trips first /
repeat: es.V^2 10.2 / 3.1 ms (221,188 P2 nodes), es.normE*2 18.9 / 3.0 ms (330,558 corners), es.We 7.2 / 2.2 ms;
surface integral 24.5 / 7.7 ms; pan/zoom rAF median/p95 16.7/17.3-18.4 ms, CPU draw 0.8-1.0 ms (potential) and
1.8-2.5 ms (field with 534 view-gridded arrows); long tasks > 50 ms: none.

Open items (round 2):
- Plots and surface integrals over all sweep points at once (a table over points of a field quantity) are not built;
  any single point can be plotted through the plot group Parameter value selector (derived values use the last Compute or the points' globals).
- Scratch `r-ui-r2-work/` in the session scratchpad deleted at the end; preview and dev servers stopped.

- 2026-10-15 16:20 PDT Arrow color: the Arrow Surface default is the theme ink color (empty color = theme; light arrows
  in dark, dark arrows in light), recomputed on theme toggle and used by the image export; user-set colors unchanged
  ("Theme color" checkbox in Coloring and Style). Gates: `npm test` 62/62, `npm run check` 0/0, `npm run build` OK,
  `npm run smoke` PASS (38 PASS lines, exit 0).

## Round 3 (2026-10-15 16:44 PDT)

Input: `DevLog/audits/simulator-results-final-verification-2026-10-15.md` (F1-F3, N1).
- F1: feature requests are built in one place (`lib/sim/requests.ts`: `plotRequest`, `probeRequest`, `solOf`); the hover
  probe and `__simProbe` evaluate the solution the plot group shows (sweep point via `sol`; the probe line names the
  parameter value; `__simProbe` returns `sol`). Audit of every request: plots, probe and export carry `sol`; expression
  and unit checks of a sweep-point group carry `sol` without a main-solution mode index; mode tables, EO page,
  cut-line Line Graphs, RF and derived values address the last Compute (stated on their pages).
- F2: Export > Data uses the same request (cache key includes `sol`), fetches the values when not cached, and names
  the solution in the header (`last Compute` or `sweep point 3 (materials.eo_medium.eps_r = 40)`) and the file name
  (`...-p3-materials.eo_medium.eps_r=40.csv`).
- F3: `Results.rebase()` after the automatic default groups (Compute and sweep): the defaults are part of the new
  solution's baseline, no edit merges across it, and the undo history restarts there (Undo can never remove them);
  structural edits (add, delete, duplicate, move, remove) are always their own undo step.
- N1: app shell brand link, database count and theme toggle use the custom tooltip (`data-tip`); the tooltip component
  is mounted in `routes/+layout.svelte` (narrow change; also `lib/ThemeToggle.svelte`).
- Smoke: F3 (delete right after Compute, Undo restores only that group, Undo then disabled), F1 (sweep-point probe =
  Node keep-run of that point to 1e-9, `sol` = sweep:2), F2 (sweep-point export: file name, header, one row per P2 node of
  the point solution), no native `title` in the app shell.
- Gates (`nice -n 10`, sequential, `?pool=2`): `npm test` 62/62, `npm run check` 0/0 (461 files), `npm run build` OK,
  `npm run smoke` PASS (40 PASS lines, exit 0). Scratch in the session scratchpad only, deleted; no servers left.

## Round 4 (2026-10-15 17:11 PDT)

Input: `DevLog/audits/simulator-results-f1f3-recheck-2026-10-15.md` (G1-G3, N1). Decision (orchestrator): COMSOL semantics
everywhere; every dataset-consuming view selects its solution explicitly and states it.
- Solution selection: `SolutionSelect.svelte` (Parameter value: `Compute (gap_um = 3 µm)` or `Sweep point 2 (gap_um =
  4 µm)`, parameter values with units; the Compute's values come from the swept axes / numeric overrides of the text it
  ran on) on plot groups (2D and 1D/RF), cut lines, cut points, Derived Values nodes (global, surface; line/point kinds
  state the solution of their cut line/point), the Derived Values summary (sweep points: the point's section values),
  Mode Analysis, EO Coupling and RF Line pages; a solution chip in the graphics bar; Targets and dataset pages state
  "Compute". Sweep-point fields load on demand (`wb.pointReady`), 2 kept.
- All requests are built in `requests.ts` (plot, probe, line, modes, rf, global, integral, derived) with `sol` and the
  mode chosen for that dataset in that solution (`Results.modeFor`, keys `sweep:i|ds`).
- G1: cut lines/points drawn on a view inherit its dataset and solution; Line Graph, Line Integration/Average and Point
  Evaluation evaluate that solution.
- G2: Mode Analysis per solution; EO Coupling for a sweep point (`EoPoint.svelte`: run globals VpiL, Vpi, dn, balance,
  Gamma, gap, textbook VpiL, arm n_eff and mode label, and the breakdown by region and Pockels coefficient as surface
  integrals of eo.integrand in that point's store); RF Line page for a sweep point (`RfPoint.svelte`, engine `rf`
  dataset); every table row has a Solution column plus numeric parameter columns (also for Compute rows).
- G3: Mode Analysis text ("plot groups showing this same solution"); sweep-point optical titles carry the mode label
  and n_eff of that point.
- N1: a Line Graph created from a cut line copies the source feature's unit.
- Cache: small results are never evicted and plot arrays count against a 192 MB budget (the old 48-entry cap evicted
  and re-requested EO page values in a loop, visible as continuous repaints).
- Smoke (new): cut line on a sweep-point view (Line Integration = Node keep-run of that point to 1e-9, Solution column
  "Sweep point 3 (...)"), n_e sweep with optical + EO: EO page VpiL and Mode Analysis n_eff of sweep point 2 = Node,
  Mode Analysis text, solution label on every result page and every plot group.
- Gates (`nice -n 10`, sequential, `?pool=2`): `npm test` 62/62, `npm run check` 0/0 (464 files), `npm run build` OK,
  `npm run smoke` PASS (43 PASS lines, exit 0). Screenshots (1440 dark/light, 1280, 390) of the EO page, Mode Analysis and
  an optical plot group on a sweep point inspected. Scratch in the session scratchpad only, deleted; no servers left.

## Round 5 (2026-10-15 17:38 PDT)

Input: `DevLog/audits/simulator-results-g1g3-recheck-2026-10-15.md` (H1-H6).
- H1: "+ Line Integration / + Line Average / + Point Evaluation" on a cut line or cut point page target that cut line or
  point (and its dataset and solution), not the first one (`ResultsPages.svelte` `addDerived(kind, targetId)`).
- H2: one statement of the solutions a 1D plot group draws (`solutions1d.ts` `oneDSolutions`), used by the 1D group
  settings ("Solution: ..."), the Plot1D header and the CSV. The Parameter value selector shows only when the group has
  RF Global features ("Parameter value (RF features)"); no RF wording otherwise.
- H3: CSV headers: each y column is its own series name with its unit (`es.V (V) [Cut Line 2D 2]`), each x column
  `<x label> [<series>]`; Line Graph / 1D CSV first line `# Solution: ...` and the filename carries the solution tag
  (`-p1-materials.eo_medium.eps_r=20`, `-Compute`, `-sweep`, `-table`). RF sweep-point CSV first line names the point.
- H4: when a sweep point's fields are ready the status bar reads `Sweep point N field solution ready in X ms` (or
  `reused`); on failure `Sweep point N fields failed`. Previously the worker's last progress message stayed.
- H6: sweep-point EO page (`EoPoint.svelte`) carries the Compute page content, all from that point's store: MZM (VpiL,
  "Vπ at L = x mm" with L = VpiL / Vpi, dn_A - dn_B, balance with the deviation warning, gain vs arm A), per arm (n_eff,
  dn/dV, VpiL arm = lambda / (2 |dn|), mode), by region (power fraction = arm mode confinement, dn/dV), coefficient x
  region breakdown with total row and sum check vs the engine dn, conventional table (gap, Γ, Γ(E_x), Γ equiv, arm
  textbook VpiL), implied textbook VpiL, engine/textbook, formulas (engine `EO_FORMULAS`). Γ(E_x) = (Γ / Ebar) ∫ E_c
  |E_x|² / ∫ |E_x|² (g / V_gap = Γ / Ebar); n_e³ r33 = lambda / (VpiL_tb |Ebar_A - Ebar_B|) gives Γ equiv and the arm
  textbook VpiL. Node check on 5 configs (chen2023, lin2025, wang2022a, xu2022, zhang2022) and the gsg fixture: these
  reproduce the engine `result.eo` values to about 1e-14 relative. Not on the sweep-point page: the drive convention
  line and the lab tensor-term split (not in the point store), and "with n_eff / n_e factor" (needs bulk n_e; shown "-"
  with a tooltip).
- H5 (note): sweep-point optical and EO values depend on the worker's warm-start reuse cache (engine DevLog-026). Node
  with the same Compute-then-`storeForSweepPoint` sequence and cache reproduces the browser bit for bit; a fresh Node
  run differs by 1.5e-10 relative (VpiL) and 9.4e-10 (opt.normE²); electrostatic values are bit-identical. Smoke
  tolerances: 1e-9 relative for electrostatic quantities (line integral/average, point evaluation, probe; bit-identical
  in practice), 1e-6 relative for EO quantities on a sweep point (VpiL, VpiL arm, component sum, Γ(E_x), Γ equiv, arm
  textbook VpiL; 4 orders above the warm-start difference, 3 below the displayed 4-5 digits), 1e-6 absolute for power
  fractions, 1e-5 for mode n_eff (displayed digits).
- Smoke (new): two cut lines (sweep points 1 and 3) and two cut points (points 1 and 3): the + buttons target the shown
  one, Solution column, values = Node keep-run of that point to 1e-9; Line Graph settings and header name the same
  solution, no "(RF" text, CSV filename/first line/y header; sweep-point EO page per-arm VpiL, power fractions,
  component sum, Γ(E_x), Γ equiv, arm textbook VpiL, "Vπ at L = 10 mm", formulas = Node `result.eo` to 1e-6; status
  bar `Sweep point 2 field solution ready|reused`.
- Gates (`nice -n 10`, sequential, `?pool=2`): `npm test` 62/62, `npm run check` 0/0 (465 files), `npm run build` OK,
  `npm run smoke` PASS (45 PASS lines, exit 0). Scratch in the session scratchpad only, deleted; no servers left.
