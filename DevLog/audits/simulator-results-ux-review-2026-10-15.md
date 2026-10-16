---
title: /sim Results UI - fresh-context COMSOL-UX review and functional audit (R-VAL)
date: 2026-10-15
reviewer: fresh-context Claude subagent
scope: /sim Results UI (DevLog-030 spec, DevLog-032 lane R-UI) judged against COMSOL Multiphysics Results UX; workflow walk on renaud2023-3um-738 and mao2022-a; numeric spot checks vs the engine API/CLI; performance. Report only, no code changed.
---

# /sim Results UI: COMSOL-UX review (2026-10-15)

## Setup

- Read: DevLog-030, DevLog-032, `app/src/lib/sim/` (incl. `post/`), `app/src/lib/sim.worker.ts`, `app/src/routes/sim/+page.svelte`,
  `engine/src/postproc/index.d.mts` (read-only), plus `engine/src/postproc/evaluate.mjs` line-integral code for one claim.
- Build: `cd app && nice -n 10 npm run build`, 2026-10-15 15:31:24-15:31:27 PDT, HEAD 656c487 plus the working tree. The engine lane
  was in a fix round: `engine/src/postproc/{expr,units,store,evaluate}.mjs` were modified 15:29:56-15:30:29 and
  `eo-analysis.mjs` at 15:31:24 (same second the build started), so the bundle has the engine state of about 15:31.
- Preview: `vite preview` on 127.0.0.1:47731 (checked free), one headless Chrome (playwright-core, `channel: chrome`, temporary
  profile), viewport 1440x900, `?pool=2&debug=1`, `nice -n 10`. Server, browser and driver stopped at the end; scratch
  `scratchpad/ux-review-2026-10-15/` (screenshots, downloads, scripts) deleted.
- Node references: `engine/src/postproc` API (`runCrossSection(..., {keep: true})`, `createSolutionStore`, `evaluateDerived`,
  `modeTable`) and `node engine/cli.mjs ... --eval`, same configs and stages as the browser runs.
- COMSOL reference (doc.comsol.com, >= 5 s apart): Common Results Node Settings
  ([6.3 comsol_ref_results.37.003](https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_results.37.003.html)),
  Expressions and Predefined Quantities
  ([6.3 comsol_ref_results.37.007](https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_results.37.007.html)),
  Derived Values/Evaluate (New Table), Table Graph
  ([6.1 comsol_ref_results.36.091](https://doc.comsol.com/6.1/doc/com.comsol.help.comsol/comsol_ref_results.36.091.html)),
  Table window ([6.2 comsol_ref_results.35.082](https://doc.comsol.com/6.2/doc/com.comsol.help.comsol/comsol_ref_results.35.082.html)),
  Selecting a Dataset for Plots and Postprocessing
  ([6.3 comsol_ref_results.37.004](https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_results.37.004.html), from
  search snippets: Data section, Parameter value list for parametric solutions, Solution parameters From parent for
  time/eigenmode/parameter). Statements about COMSOL below are limited to what these pages say plus the tree/node names
  DevLog-032 already adopted.

## Workflow walked (what ran)

renaud2023 (stages optical_mode, eo_overlap, rf_line; Configured mesh): Compute -> 9 default groups; Results right-click ->
2D Plot Group; + Surface es.normE (autocomplete), + Contour opt.normE^2 on dataset Optical mode, + Arrow Surface (prefilled
es.Ex, es.Ey); unit V/um, color table Thermal, manual range 0..0.5, log scale; Select tool: click rib_r, shift-click slab;
Surface Integration es.We and eo.integrand (eoA) over the selection and over all domains into one table; Cut Point 2D +
Point Evaluation es.Ex; Cut line tool through the rib (-1.4..1.4 um at y = 0.2) -> Line Graph es.Ex + eo.integrand; YAML tab
`optics.num_modes: 4` -> Compute -> Mode Analysis table, switched modes 1/0/2/3; EO Coupling page vs CLI; study `gap`
(4 points, pool 2) -> Sweep Global group, Global Evaluation GammaA over sweep, Table Graph; image export 1200x800, data CSV;
EO page buttons "EO overlap plot", "Integrand along rib" + Line Integration. mao2022-a: Configured mesh with optical + EO
(EO page vs CLI, es.We integral); Fine mesh electrostatics (P2, 440,744 display triangles) for performance; expression and
unit errors; tree keyboard; light theme; radius scan.

## Parity with COMSOL Results

| COMSOL concept | Rating | Concrete differences |
|---|---|---|
| Results tree structure and naming | partial | Order Datasets, Selections, Derived Values, Tables, Plot Groups, Export matches the adopted model. Mode Analysis, EO Coupling, Targets are pseudo-nodes under Derived Values; RF Line pseudo-node under Tables. Plot groups sit directly under Results (no Plot Groups folder). New nodes get unnumbered duplicate names ("Surface Integration" twice, "Line Graph" twice, X12); plot groups are numbered by kind count. Three Optical Mode default groups for a two-arm run (opt and armA identical, known open item). |
| Settings window sections (Data, Expression, Title, Range, Coloring and Style, Inherit Style, Quality) | partial | Present: Dataset (from parent or explicit), Expression, Unit, Selection filter, Range (manual color range, linear/symmetric/log scale), Color table, Reverse, Legend. Missing: feature-level Title, Description, Manual data range (separate from color range), Inherit Style, Quality (resolution/smoothing), Plot Previous/Next Expression. Manual range checkbox does not prefill the current automatic range (X9). |
| Plot button vs auto-update | partial (deliberate) | Every edit re-plots automatically (worker round trip ms); a Plot button exists on the group page and only sets the view. COMSOL documents the Plot button as preview and requires it for most changes; auto-update is a reasonable improvement here. |
| Expression entry (Replace/Insert Expression, Ctrl+Space, units, description) | partial | Typed autocomplete from the registry with unit and description per entry, inline unit/syntax check: good. No Replace/Insert Expression menu or browsable quantity tree (COMSOL: Insert Expression / Ctrl+Space list with a filter field). Unit is free text (COMSOL: list of compatible units, editable). Enter accepts a longer completion over an exact variable name (X2). Duplicate entries in Global Evaluation suggestions (X13). |
| Mode selection (eigenmode in Data section) | partial | Mode is chosen per dataset globally by clicking a Mode Analysis row, not per plot/feature (COMSOL: Data section eigenmode, or From parent). Titles do not state the mode or n_eff (X8). EO page labels the solved mode k=0 while the table marks it k=1 (X3). |
| Selections | partial | Named domain lists, click/shift-click in Select mode, checkbox list per region, used as feature filter and surface derived value selection: works. Creating a selection while a feature or derived node is active silently attaches it as that node's filter (X4). Selections under Results (no Definitions node). No boundary/point selections, no Add/Remove/Clear buttons as in COMSOL selection lists (checkbox list instead). |
| Datasets: Solution, Cut Line 2D, Cut Point 2D | match (2D) | Base datasets es/opt/armA/armB/eoA/eoB plus cut lines and points with source, coordinates, resolution; variables table per dataset. Cut line Resolution does not affect Line Integration (X11). |
| Dataset: Parametric | missing (fields) / partial (globals) | Sweep points carry globals only; no parameter-value selector for fields (COMSOL Parameter value list). Known open item in DevLog-032. |
| Plot features 2D (Surface, Contour, Arrow Surface, Line, Max/Min) | partial | All present with layering across datasets and meshes. Arrow grid always spans the dataset bounding box, so on renaud2023 (about 240 um wide) no arrows land in the 3 um gap at window zoom (X10). No Streamline, no Height expression, no deformation. |
| Plot features 1D (Line Graph, Global, Table Graph) | partial | Line Graph x axis is arc length only; one y axis for all series (V/m and 1/(V m^2) on one axis, X7); no zoom/pan or manual axis range on 1D plots; Table Graph cannot use the parameter as x (X1). |
| Color tables, range, legend | match / partial | Rainbow, RainbowLight, Thermal, Wave, Viridis, Cividis, GrayScale, reverse, linear/symmetric/log, legend with unit. Legends overlay the plot area (X15). Log scale silently drops a manual range with min <= 0 (X9). |
| Derived values (Global, Surface Int/Avg/Max/Min, Line Int/Avg, Point) | match (values) / partial (UX) | All 8 kinds evaluate correctly (spot checks below). Evaluate into new or existing table, Evaluate over sweep for Global. No Evaluate All / Clear and Evaluate All on the Derived Values node; no multi-expression table per node (COMSOL: Add Expression rows). Status message of the previous node shows on a new node (X6). Expression check shows the integrand unit, not the integrated unit (X17). |
| Tables and Table window | partial | Tables accumulate rows (long format: dataset, parameters, expression, value, unit), CSV, Table Graph button, bottom Table window shows the last table. The parameters column is a text string of all 14 params (X14) and not numeric (X1); Point Evaluation rows carry no coordinates (X17). |
| Graphics window toolbar | match / partial | Pan, zoom box, select, ruler, cut line, cut point, extents, window, labels, windows, mesh, image export with size/legend/title: works. Toolbar overflows at 1440 px (Image button clipped, X16); tool buttons look active on 1D plots; no zoom in/out buttons, no undo of view. |
| Messages / Progress / Log / Table windows | match | Timestamped rows (HH:MM:SS.mmm), log save with ISO timestamps and timestamped filename, progress per stage and per sweep point. Selection creation and table edits are not logged (note). |
| Export node | partial | Data (plotted values of the shown 2D group, element corners or nodes), Tables (CSV), Image (toolbar). No dataset+expression Data export independent of a plot, no regular-grid export, no export of 1D group data from the Export node (only the plot's CSV button); 1D PNG has no size option. |
| EO Coupling page (project-specific) | n/a (beyond COMSOL) | Numbers equal the CLI to all printed digits on both configs; formulas in tooltips and a Formulas disclosure. Issues: mode label (X3), duplicated legacy block (X18), "Integrand along rib" label on unetched devices (X18). |

## Findings

| ID | Severity | Finding and evidence | Suggested change | COMSOL reference |
|---|---|---|---|---|
| X1 | major | Table Graph over a sweep is impossible. Global Evaluation over sweep writes the parameter as text `gap_um=2.5` into a single `parameters` column; Table Graph with x column `parameters` shows "No data" (renaud2023 gap study, 4 rows). The x-column menu also offers non-numeric columns (dataset, expression, unit). | Write one numeric column per swept parameter (and one per expression with the unit in the header) for sweep evaluations; offer only numeric columns as x. | Derived Values evaluated on a parametric solution fill tables that Table Graph plots (36.091). |
| X2 | major | Expression autocomplete replaces an exact variable with a longer one on Enter: typing `Vpi` + Enter in a Global Evaluation or Global feature stores `VpiL` (suggestion list order VpiL, Vpi, VpiLtextbook). Blur keeps `Vpi`. Silent wrong expression. Code: `ExprInput.svelte` onKey picks `suggestions[active]` whenever it differs from the token. | Commit the typed text on Enter when the token is an exact registry name (or sort exact match first); accept a pick only on Tab or explicit arrow selection. | Insert Expression inserts at the cursor only when chosen (37.007). |
| X3 | major | Mode index inconsistency. renaud2023 (num_modes 2 or 4): Mode Analysis table marks k=1 (n_eff 1.96574, TE fraction 0.9971) as the solved mode, the EO Coupling per-arm table says "vector P2 k=0" (engine `arms.A.modeIndex` = 0 = config `mode_index` among TE-like modes). Two different k for the same mode on two pages. | Show one index space: either the table k of the solved mode, or label the EO value "mode_index 0 (TE-filtered) = table k=1". Mark the solved/EO mode in the Mode Analysis table separately from the plotting selection. | Eigenmode selected in the Data section by effective mode index (37.004). |
| X4 | major | Select tool side effect: with a plot feature (or surface derived value) selected in the tree, the first click in Select mode creates "Selection 1" and silently sets it as that feature's filter; the Surface es.normE was cut down to rib_r + slab without any message or log row. A user who meant to create a selection changes an existing plot. | Create selections only from the Selections node or an explicit "Create selection" in the feature's Selection field; otherwise ask or log "Selection 1 created and applied to Surface". | Selections are separate nodes referenced by features (common node settings, 37.003). |
| X5 | major | Global feature with several comma-separated expressions shows a red parse error `unexpected ',' at position 5` under the field while the plot correctly draws both series (VpiL, VpiLtextbook). False error. Code: `ExprInput` with `local` parses the whole list with `parseExpression`. | Split on top-level commas before the local check (the plot already uses `splitTop`). | - |
| X6 | minor | Stale status message: the "Evaluated; row added to the table." text from the previous derived node appears on a newly created Point Evaluation page before it was evaluated (`evalMsg` lives in the shared `ResultsPages` instance). | Reset the message when `node` changes or key it by node id. | - |
| X7 | minor | One y axis for all 1D series: Line Graph of es.Ex (V/m, about 1e5) and eoA.integrand (1/(V m^2), about -3e8) on one axis; es.Ex appears as a flat line. | Add a second y axis option, or warn when series units differ. | 1D plot groups support two y-axes (COMSOL 1D Plot Group setting; not quoted from the fetched pages). |
| X8 | minor | 2D titles do not include the mode: switching modes 1/0/2/3 left the title "Dataset: Optical mode Surface: opt.normE^2 (V²/m²)" identical. | Append "mode k, n_eff = ..." for optical/arm datasets. | Plot titles for plot groups (37.011). |
| X9 | minor | Range: ticking Manual range leaves min 0, max 1 regardless of the data (COMSOL-like prefill missing); with log scale and a manual min <= 0 the manual range is silently ignored (legend 2.1e-7 to 1.076 while the form shows 0 and 0.5). | Prefill the current auto range on enable; show an inline note when log ignores the manual range. | Defining the Color and Data Ranges (37.019). |
| X10 | minor | Arrow Surface grid spans the dataset bounding box; selection filter masks but does not re-grid. On renaud2023 the default 25x25 grid has no arrow inside the optical window (2.8 um wide) and at most a few near the 3 um gap. | Grid over the selection bounding box or the current view, or offer "arrows in view". | Arrow Positioning (DevLog-032 cites comsol_ref_results.37.014). |
| X11 | minor | Inaccurate in-UI claim: the derived-value page says line integrals use "the trapezoid rule over the cut-line samples"; the engine uses Gauss points per element crossing (`evaluate.mjs` line 294) and ignores the cut line Resolution: Line Integration of eo.integrand along the rib cut gives -124.14820123926664 1/(V m) with n=600 and with no n, 918 points both. | Correct the text; state that Resolution affects Line Graph sampling only. | - |
| X12 | minor | Duplicate default names: two "Surface Integration" nodes, two "Line Graph" features in one group; error lines read "Line Graph: ..." without saying which. Tree labels of default groups are truncated ("Optical Mode (Optical ...", "EO Overlap (EO overlap..."). | Number new nodes (Surface Integration 2); shorten default labels (e.g. "Mode, arm A"). | - |
| X13 | minor | Global Evaluation autocomplete lists every global twice (registry globals plus `sweepVars` extra). | De-duplicate by name. | - |
| X14 | minor | Table "parameters" column holds all 14 params of the run as one string (`wavelength_nm=738; film_um=0.3; ...`), clipped in the Table window. | Show only swept/overridden parameters, numeric, one column each. | - |
| X15 | minor | Color legends overlay the plot area (right edge) instead of reserving space; at window zoom on renaud2023 they cover field data next to the right electrode. | Reserve a legend gutter (or offer legend position). | Coloring and Style section (37.020, not read in detail). |
| X16 | minor | Graphics toolbar overflows at 1440 px (Image button clipped; horizontal scroll); on 1D groups the 2D tools stay visible with Pan still highlighted and the probe line keeps the 2D hint "drag to pan; wheel to zoom". | Group/overflow menu for less used tools; hide 2D tools and the 2D hint on 1D groups. | Graphics window toolbar. |
| X17 | minor | Derived-value units: the inline check under an integration expression shows the integrand unit ("-> J/m³") while the result is J/m; table units are ASCII (`V/um`, `1/(V*m)`) while titles use µ and ·; Point Evaluation rows carry no x, y. | Show the integrated unit in the check; prettify table units consistently; add coordinates columns. | Unit handling for derived values (37.007). |
| X18 | minor | EO Coupling page: the legacy "EO overlap (DC, first-order Pockels, vector mode)" block repeats per-arm n_eff and dn/dV a third time; "Integrand along rib" is labelled for rib devices but is offered on unetched mao2022 (strip-loaded film). | Drop the duplicate block or fold it into the per-arm table; label "Integrand across the arm (mode max height)". | - |
| X19 | minor | Two sweep views after a study: Settings panel "Parametric Sweep (dataset)" with its own plot and table, plus a "Sweep" 1D group in the graphics. The default Sweep group plots VpiL, while the study's sweep targets are vpi_dc_v, so the default Global plot shows no paper points (the Settings-panel plot does). Bottom text refers to a "Sweep Plot" node that no longer exists. | Make the 1D Sweep group the single sweep plot and default its expression to the metric of the study targets; update the wording. | - |
| X20 | minor | A new solution re-fits every plot group view to dataset extents (views map cleared on `R.gen`); a zoom on the rib is lost on each recompute. | Keep per-group views when the geometry extents are unchanged. | - |
| X21 | note | Sharp-corner scan (all elements and ::before/::after, dark and light, context menu and autocomplete open): 0 computed rounded corners. Tooltips are native `title` attributes and checkboxes/selects/color inputs keep native appearance (11-14 elements), which the OS renders with its own (rounded) style; the "sharp corners incl. tooltips" rule cannot hold for those. | Custom tooltip element and `appearance: none` controls if the rule must be strict. | - |
| X22 | note | No undo for Delete (tree Delete key or context menu) of plot groups, features, tables. | Undo of the last structural edit, or confirm for groups/tables with rows. | - |
| X23 | note | Max/min and legend ranges come from displayed values; Surface Maximum of opt.normE^2 (mode 0) in Node is 3.943e15 V²/m² while the auto legend max is 3.86e15 (display nodes vs element interpolation). Not wrong, but two "max" numbers differ by about 2 %. | State "range of displayed values" in the legend tooltip. | - |
| X24 | note | Good: error messages are specific (unknown variable lists the available names with the prefix; unit mismatch names both units; eo.* on a non-EO dataset suggests eoA.*/eoB.*); tree supports arrows, F2, Delete, Escape; no emoji; dark default; log rows timestamped. | - | - |

## Numeric spot checks (browser vs Node, same config, stages and mesh)

Node values from `engine/src/postproc` (API) or `engine/cli.mjs --eval`; browser values from the table rows (`data-value`, full
double), the probe line, the EO page text and the mode table.

| # | Quantity | Browser | Node | Agreement |
|---|---|---|---|---|
| 1 | renaud2023 probe es.normE at (0.9, 0.06) um, V/um | 0.33444 (probe, 5 sig.) | 0.33444089302500796 | to displayed digits |
| 2 | renaud2023 Point Evaluation es.Ex at (0, 0.2) um, V/um | 0.1830869928020662 | 0.1830869928020662 | identical |
| 3 | renaud2023 Surface Integration es.We over rib_r + slab, J/m | 1.0731094529299503e-11 | 1.0731094529299503e-11 | identical |
| 4 | renaud2023 Surface Integration eo.integrand (eoA) over rib_r + slab, 1/V | -2.894946950776213e-5 | -2.894946950776213e-5 (engine dn_A -2.8949469507762055e-5) | identical; vs engine dn 2.6e-15 rel. |
| 5 | renaud2023 Line Integration eo.integrand along y = 0.15598 um, -1.4..1.4 um, 1/(V m) | -124.14820123926664 | -124.14820123926664 | identical |
| 6 | renaud2023 (num_modes 4) EO page VpiL, V cm | 0.63732 | VpiL 0.006373167523193795 V m | to displayed digits |
| 7 | renaud2023 EO page Gamma A | 0.4942 | GammaA 0.49417153383422674 | to displayed digits |
| 8 | renaud2023 EO page implied textbook VpiL, V cm | 0.69891 | VpiLtextbook 0.006989136443250712 V m | to displayed digits |
| 9 | renaud2023 Global Evaluation GammaA over sweep, gap 2.5/3/4/5 um | 0.5052247129507141 / 0.49417153383422674 / 0.47606829746309964 / 0.46049731703188806 | sweep point globals (same engine run); gap 3 equals CLI GammaA | identical at gap 3 |
| 10 | renaud2023 Mode table k=0: n_eff, n_g, TE frac., A_eff (um²), confinement | 1.97288, 2.5608, 0.008077, 0.2137, 0.582 rib_r | 1.9728768277500368, 2.5608061651669725, 0.008076801898848785, 0.2137171304499227, 0.581727 rib_r | to displayed digits |
| 11 | renaud2023 Mode table k=1 (solved): n_eff, n_g, TE frac., A_eff | 1.96574, 2.3803, 0.9971, 0.1834 | 1.9657418532301996, 2.380329977236202, 0.9970953772299782, 0.18339515092607098 | to displayed digits |
| 12 | mao2022-a EO page VpiL (V cm), dn/dV arm A (1/V), Gamma A | 2.7661, -1.401e-5, 0.5623 | 2.7660742058304355 (metric), -1.400965321611397e-5, 0.5623397355907626 | to displayed digits |
| 13 | mao2022-a Surface Integration es.We over all domains, J/m | 9.335225631782227e-11 | 9.335225631782227e-11 (C'/2 = 1.8670451263552646e-10 / 2) | identical |

Units: correct in every check (V/µm after the display-unit change, J/m and 1/V for integrals, 1/(V·m) for the line integral,
V·cm on the EO page, mV accepted for es.V with legend 0 to 1000 mV). Inconsistency only in presentation (X17).

## Performance (production build, headless Chrome, Apple M4 Pro ANGLE Metal, `nice -n 10`, 2026-10-15 15:32-15:45 PDT)

| Measurement | Value | How |
|---|---|---|
| Compute end to first plot paint, renaud2023 (29,838 es triangles, optical + EO + RF) | 17.8 ms (22.1 ms on a later run) | `wb.paintInfo.afterResultMs` (result message to first surface paint) |
| Compute end to first plot paint, mao2022-a Configured (153,120 display triangles, optical + EO) | 25.2 ms | same |
| Compute end to first plot paint, mao2022-a Fine P2 (440,744 display triangles) | 30.9 ms | same |
| Registry ready after result (renaud2023) | 1.4 ms | `wb.registryMs` |
| Plot switching, mao2022 Fine: first switch to Electric Field (normE + 1,200 arrows) | 73.6 ms | select change to second rAF after `data-pending=false`; includes Playwright polling (about 30 ms floor) |
| Plot switching, cached, Electric Potential / Electric Field | 31.6-31.8 ms (at the measurement floor) | same; engine plot time 14.7 / 19.4 ms (`data-plot-ms`) |
| Mode switch replot, renaud2023 opt modes 0-3 | 33-35 ms (measurement floor), engine 14.4-18.0 ms | same method |
| Pan/zoom, mao2022 Fine Electric Potential (440,744 triangles + 12-level contour), 60 wheel + 60 drag frames | rAF median 16.7 ms, p95 18.0 ms, max 18.7 ms; CPU draw median 0.6 ms, p95 0.9 ms | one synthetic event per rAF, `data-frame-ms` |
| Surface Integration es.We, mao2022 Configured | worker 13.2 ms, round trip 14.5 ms, click to row about 55 ms | `post.workerMs`, `post.timing` |
| Sweep, renaud2023 gap study, 4 points, pool 2 | 5.1 s wall (points 1.8-3.1 s each) | log |
| Long tasks > 50 ms (PerformanceObserver) | none recorded in any phase (compute, first plot, switching, pan/zoom, sweep) | `longtask` entries |
| Main-thread JS heap after mao2022 Fine | 55 MB | `performance.memory` |

P6 targets (plot < 50 ms, derived < 30 ms, 60 fps, no long task > 50 ms) hold on these cases; the 73.6 ms first switch is
dominated by the measurement method and the main-thread arrow grid (not split out).

## Summary

Values are right: every browser number checked equals the engine to the last printed or stored digit. The COMSOL model is
recognisable (tree order, layered features across datasets, selections, derived values into tables, cut line/point datasets,
graphics tools, export), with clear error messages and good performance. The gaps are workflow-level: sweep tables cannot be
graphed against the parameter (X1), autocomplete can silently change an expression (X2), the solved mode carries two different
indices (X3), the Select tool silently filters an existing plot (X4), and multi-expression Global fields show a false error
(X5). Missing COMSOL pieces: parametric dataset fields, Insert/Replace Expression browser, Description, Inherit Style,
Quality, manual data range, two y-axes, Evaluate All.
