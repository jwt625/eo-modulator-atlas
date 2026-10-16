---
title: Results, postprocessing and EO overlap evaluation - COMSOL-style spec
date: 2026-10-15
status: plan (spec written before implementation)
owner: orchestrator (Claude, at Wentao Jiang's request); implementation by subagents
scope: engine postprocessing API, /sim Results tree, plots, derived values, EO overlap evaluation
---

# DevLog-030: results and postprocessing (COMSOL-style)

## Request (user, 2026-10-15)

"Solver seems to run, but visualization and eval should follow similar specs as COMSOL's UI/UX has. Spec out the
works, take notes, and delegate to subagents." Standing guidelines from DevLog-023 apply: browser only, no server,
minimal dependencies, ruthless performance, COMSOL-like but clean, sharp corners, dark default, dense.

## Assessment of the current state (2026-10-15, after DevLog-027 round 5)

What exists (`app/src/lib/sim/`, 4.5k lines): Model Builder tree with fixed nodes, one Graphics view with a fixed
quantity menu (potential, |E|, E_x, E_y, optical intensity/components, H, Pockels dn, mesh size/quality), colorbar
(linear/symmetric/log, lock), contour and arrow toggles, hover probe, one Cut Line 2D, Derived Values card (fixed
metrics, per-arm per-region power fraction and dn table), targets table, RF line plots, sweep plot with paper overlay.

Gaps against COMSOL's Results model:

| COMSOL concept | Current | Gap |
|---|---|---|
| Datasets (Solution per study/section, mode k, parametric solutions, Cut Line 2D, Cut Point 2D) | implicit: last run only; mode index fixed; sweep points not browsable as fields | no dataset registry; cannot plot field of sweep point i or mode k |
| Plot Groups (2D, 1D) with layered features (Surface, Contour, Arrow Surface, Streamline, Line, Max/Min marker; Line Graph, Global, Table Graph) | one hard-wired plot with toggles | no user-created plot groups, no layering of different expressions/datasets (e.g. Surface of RF E_x with Contour of optical intensity) |
| Expressions with units (`es.normE`, `ewfd.Ex`, user expressions) | fixed menu | no expression entry, no variable namespace, no units in expressions |
| Selections (domains, boundaries, points; named) | none (probe only) | cannot select regions to integrate or filter |
| Derived Values (Global Evaluation, Surface Integration/Average/Max-Min, Line Integration, Point Evaluation) -> Tables | fixed metric card | no user evaluation, no tables that accumulate, no evaluation over all sweep points |
| Mode Analysis results (effective mode index table, pick mode) | one mode | no mode table, cannot browse modes |
| EO overlap (users build overlap integrals; COMSOL shows integrand plots) | per-arm dn/V, VpiL, per-region table | no integrand map, no conventional Gamma, no tensor-component breakdown, no RF-field-over-mode overlay, formula not shown |
| Color tables (Rainbow, RainbowLight, Thermal, Wave, Viridis/Cividis), range, legend, title | one map + diverging | limited |
| Graphics tools (zoom box, zoom extents, select vs pan, measure, axes with ticks, domain labels, image export with size) | pan/zoom/extents/window, PNG | no zoom box, selection mode, ruler, axis ticks, domain labels, export sizing |
| Export (Data, Table, Image) | CSV/PNG for some views | not uniform |

## Architecture decisions

- P1 Postprocessing runs in the worker that holds the solution (no field copies to the main thread except what a plot
  needs). The engine exposes a solution store with exact evaluation (P2 electrostatics, vector edge elements) at
  arbitrary points and quadrature points; the main thread sends plot/evaluation requests and receives typed arrays
  or scalars. Integrals use quadrature of the actual element interpolation, so derived values match the engine's own
  integrals (gate: integral of the EO integrand equals the engine dn_eff/V to <= 1e-9 relative).
- P2 Expression language: own recursive-descent parser (extend `engine/src/params.mjs` style; no eval). Operators
  `+ - * / ^`, comparisons, unary minus; functions `abs real imag conj sqrt exp log log10 sin cos tan atan2 min max
  if`; complex-aware. Units carried as dimension vectors (SI base) and displayed in a chosen unit; user may append a
  display unit (`V/um`, `pF/m`, `1/V`). Evaluated per node, per element, or per quadrature point automatically by the
  variables used.
- P3 Variable namespace (COMSOL-like prefixes, SI internally, documented with unit and description in a registry the
  UI reads):
  - Coordinates and constants: `x, y` (m), `pi, eps0, mu0, c_const, lambda0, k0, f0`.
  - Electrostatics dataset `es` (per section, per terminal volt): `es.V, es.Ex, es.Ey, es.normE, es.Dx, es.Dy, es.We`
    (energy density), `es.epsxx, es.epsyy, es.epsxy` (RF permittivity), `es.region`.
  - Optical datasets `opt`, `armA`, `armB`, mode k selectable: `Ex, Ey, Ez, Hx, Hy, Hz` (complex), `normE, I`
    (`Sz`, Poynting z), `nxx, nyy, nzz`, `neff, ng` (global), power-normalized.
  - EO dataset (per arm): `eo.dnxx, eo.dnyy, eo.dnzz, eo.depsxy` (per V), `eo.integrand` (d(n_eff)/dV density, 1/(V m^2),
    integrates to dn_eff/V), `eo.integrand_r33, _r13, _r22, _r51` (tensor-component split).
  - Globals per run: `C, C0, L, Z0, nRF, neff, ng, dneffA, dneffB, VpiL, Vpi, GammaA, GammaB, balance`, timings.
- P4 Results tree (COMSOL order): Datasets / Views / Selections / Derived Values / Tables / Plot Groups (2D, 1D) /
  Export. Default plot groups auto-created after a solve (COMSOL behaviour): Electric Potential (Surface + Contour),
  Electric Field (Surface normE + Arrow), Optical Mode (Surface normE^2 or I, per mode), Pockels dn (Surface eo.dnxx),
  EO Overlap (Surface eo.integrand + Contour of mode intensity + arm window outlines), RF line (1D), Sweep (1D Global).
  Users can add, duplicate, delete, rename plot groups and features; each feature has dataset, expression, unit,
  range (auto/manual, symmetric, log), color table, coloring style, filter by selection, and per-feature visibility.
- P5 EO overlap definitions shown with the numbers (formula in tooltip and in the EO Coupling settings):
  - First-order perturbation (engine): dn_eff/V = (omega eps0 / (4 P k0)) int E* . d(eps)/dV . E dA, full tensor.
  - Conventional overlap (for comparison with papers): Gamma = (g / V) int E_x,rf |E_opt|^2 dA / int |E_opt|^2 dA over
    the arm's LN region, g = edge-to-edge electrode gap from the geometry (config), stated as such; plus the implied
    VpiL from the textbook formula lambda g / (n_e^3 r33 Gamma) with the effective index factor stated. Both shown,
    clearly labelled; the engine's perturbation result remains the primary.
  - Breakdown tables: per arm x per region x per tensor component.
- P6 Performance targets: plot request round trip < 50 ms for 400k elements (expression eval in worker, typed
  arrays, transferable); derived value (surface integral) < 30 ms; mode table immediate; 60 fps pan/zoom unchanged;
  no main-thread long tasks > 50 ms.
- P7 Validation (fresh-context): integral identities (sum of es.We over all domains = C' V^2 / 2; line integral of
  -E along a path between electrodes = V; integral of eo.integrand = dn_eff/V; mode power = 1 after normalization;
  Gamma_conv on K4 against an independent computation in `validation/`), browser vs Node agreement, COMSOL-UX review.

## Lanes and ownership (no file shared between lanes)

| Lane | Scope | Owns | DevLog |
|---|---|---|---|
| R-ENG | solution store, variable registry, expression language, evaluation (plot arrays, integrals, line integrals, point eval, max/min), EO integrand and component/region breakdown, conventional Gamma, multi-mode results (N modes, mode table), datasets per sweep point (retention policy), CLI `--eval` | `engine/` (all), `sims/SPEC.md` | DevLog-031 |
| R-UI | Results tree, datasets, selections, plot groups and features, color tables, graphics tools (zoom box, select mode, ruler, axes ticks, domain labels, export sizing), derived values and tables, mode table, EO Coupling results page, 1D plot groups, worker protocol | `app/src/lib/sim/`, `app/src/lib/sim.worker.ts`, `app/src/lib/SimStageResults.svelte`, `app/src/routes/sim/`, sim steps of `app/scripts/smoke.mjs` | DevLog-032 |
| R-VAL (later, fresh) | identities, independent Gamma on K4/K5/K7 in `validation/`, browser vs Node, COMSOL-UX review | `validation/`, `DevLog/audits/` | DevLog-033 + audits |

Contract between R-ENG and R-UI (R-ENG publishes exact signatures in DevLog-031 before its second progress entry;
R-UI builds against this shape and adapts):

```
// worker side (engine/src/postproc/*)
const store = createSolutionStore(runInternals)          // kept in the worker after runCrossSection(..., {keep: true})
store.datasets()   -> [{id, kind: 'es'|'opt'|'arm'|'eo'|'cutline'|'sweep', label, section, mode?, arm?, point?}]
store.variables(datasetId) -> [{name, unit, description, location: 'node'|'element'|'quad'|'global', complex}]
evaluatePlot(store, {dataset, expr, unit?, location?: 'auto'|'node'|'element'}) -> {values: Float64Array, location, mesh refs, unit, min, max}
evaluateDerived(store, {kind: 'global'|'surface_int'|'surface_avg'|'surface_max'|'surface_min'|'line_int'|'line_avg'|'point',
                        dataset, expr, selection?: regionIds|polyline|point, unit?}) -> {value, unit, at?}
modeTable(store, datasetId) -> rows [{k, neff, ng, lossDbPerCm, teFraction, aeffUm2, confinement: {region: frac}}]
```

## TODO

- [x] R-ENG phase 1: solution store + registry + expressions + plot/derived evaluation; tests (identities above).
- [x] R-ENG phase 2: EO integrand, tensor/region breakdown, conventional Gamma, multi-mode table, sweep datasets.
- [x] R-UI phase 1: Results tree restructure, plot groups with layered features, expressions with units, color tables.
- [x] R-UI phase 2: selections, derived values and tables (incl. over sweep points), mode table, EO Coupling page,
      graphics tools, export.
- [x] R-VAL: identities, independent Gamma, browser vs Node, COMSOL-UX review (fresh context).
- [ ] Fix rounds from audits; final gates; commit on request.

## Progress log

- 2026-10-15 Spec written from the current code (`app/src/lib/sim/`, `engine/src/run.d.mts`) and the COMSOL Results
  model (Datasets, Plot Groups with features, Derived Values, Tables, Selections, Export). Lanes R-ENG and R-UI
  launched; R-VAL after both report.
- 2026-10-15 R-VAL part 1 launched in parallel (independent of the engine): independent tensor-component and region
  split of dn_eff/V, conventional Gamma and implied textbook VpiL, and integral identities for K4, K5, K7, K7K4 in
  `validation/` (DevLog-033). The COMSOL-UX review and browser-vs-Node checks follow once R-ENG and R-UI report.
- 2026-10-15 14:49 PDT R-VAL part 1 done (DevLog-033; 13 cases, watchdog 1.4 GiB, no engine code read). K4 arm A
  dn_eff/V -17.0048e-6 (r33 95.7 %, r13 1.9 %, r51 2.3 %, r22 0 for a lossless mode; slab 63 %, rib 37 %);
  Gamma_A 0.50086 (|E|^2), textbook push-pull VpiL 2.5634 vs full-tensor 2.2786 V cm (textbook 11.7-12.5 % high for
  K4/K5, 14.8-14.9 % for K7; within 0.3-1.0 % after the n_eff/n_e factor). Gamma 0.43-0.66 across all cases. Identities:
  W' (= C'/2 at 1 V), line integral at slab mid-height and exactly -1 V at electrode-bottom height. Definitions sent
  to R-ENG for comparable outputs (no tuning to values).
- 2026-10-15 15:06 PDT R-ENG done (DevLog-031): `engine/src/postproc/` (units, expressions, solution store, plot and
  derived evaluation, EO analysis, sweep store), `runCrossSection(..., {keep: true})`, `optics.num_modes`, CLI
  `--eval/--list-vars/--modes`. Gates: integral of es.We vs C'/2 <= 6.3e-13; line integral -1 V to 1e-15; integral of
  eo.integrand vs engine dn_eff/V <= 3.3e-15; mode power 1 W to 5e-15. Engine 239 tests (236 pass, 0 fail,
  2 skipped, 1 todo), reference 11/11. Performance: plots 3-5 ms first / 0.1-0.3 ms repeat; first uncached surface
  integral extrapolates to ~75 ms at 400k elements (target 30 ms missed; real meshes capped near 160k triangles,
  ~30 ms). Fresh-context audit and comparison against DevLog-033 launched
  (`DevLog/audits/simulator-r-eng-audit-2026-10-15.md`).
- 2026-10-15 R-ENG audit done: definitions match DevLog-033 term by term; all 13 cases agree with the references at
  1.4-3.5e-3 (K4/K5/K7K4) and 0.2-0.4e-3 (K7) relative at default mesh, shrinking with electrostatic refinement
  (discretisation, not definitions); exact identities hold (gap, r22 = 0, splits 1e-14, es.We = C'/2 to 1e-12,
  -1 V to 7e-14). Major E1: integral of eo.integrand vs engine dn_eff/V differs by 7e-9 to 3.8e-6 on non-uniform
  meshes (edge-located quadrature points resolved to different triangles), so the claimed 1e-9 gate fails outside
  the uniform fixture. Minor E2-E6, E9; notes E7-E14. R-ENG round 2 started.
- 2026-10-15 15:28 PDT R-UI done (DevLog-032): COMSOL-order Results tree (Datasets, Selections, Derived Values incl.
  Mode Analysis and EO Coupling, Tables, Plot Groups, Export), default plot groups, 2D features (Surface, Contour,
  Arrow Surface, Line, Max/Min) and 1D (Line Graph, Global, Table Graph) with per-feature dataset, expression with
  autocomplete and unit check, 7 color tables, selection filter; graphics tools (pan, zoom box, select, ruler, cut
  line/point, um axes, domain labels, sized image export); 8 derived-value kinds into tables incl. over sweep; mode
  table; EO page. App test 58/58, check 0/0, build, smoke 32/32. mao2022 P2 fine (440k display triangles): first
  plot 3.9-18.3 ms, surface integral 23.5 ms, 60 fps, no long tasks.
- Orchestrator decisions on R-UI open items: public P2 point-evaluation entry, dB variables for RF attenuation, `armA`
  alias of `opt` when identical, and sweep-point fields by on-demand recompute with the bounded sweep store
  (COMSOL Parametric dataset with a parameter-value selector) -> added to R-ENG round 2; UI side follows in R-UI
  round 2. Fresh-context COMSOL-UX review launched (`DevLog/audits/simulator-results-ux-review-2026-10-15.md`).
- 2026-10-15 15:38 PDT R-ENG round 2 done (DevLog-031): E1 fixed by matching the engine point locator exactly
  (integral of eo.integrand vs dn_eff/V now <= 1.2e-14 on K4, K7-D0, K7-D2.6, renaud2023, both arms; gate tests
  added); E2-E13 fixed (complex-at-runtime errors, shared constants, CLI repeatable flags, single-position errors,
  unit-literal ambiguity error, gap rule ignores electrodes above/below the arm window, refined max/min, line
  integral 101 -> 20.6 ms for 200 segments, accuracy note in result.eo). R-UI additions: `evaluateAtPoints`,
  `location: 'p2nodes'`, `rf` dataset with dB variables, `aliasOf`, `storeForSweepPoint`. Engine 246 tests (243 pass,
  0 fail, 2 skipped, 1 todo); reference 11/11. Open: E14 first-call surface integral ~86 ms at 400k elements.
- 2026-10-15 COMSOL-UX review done (`DevLog/audits/simulator-results-ux-review-2026-10-15.md`): 13 numeric spot checks
  identical to Node (integral of eo.integrand vs dn/dV 2.6e-15); parity: match on cut line/point datasets, color
  tables, windows, graphics tools, derived-value kinds; partial on naming, settings sections, expression entry, mode
  labelling, selections, 1D plots, tables, export; missing Parametric dataset selector. Major: X1 sweep parameter
  stored as text so Table Graph cannot plot vs parameter; X2 Enter replaces an exact name by the first suggestion;
  X3 two mode indices (raw k vs TE-family index); X4 Select tool silently applies a filter; X5 false parse error on
  Global multi-expressions. Performance: first plot 18-31 ms, 60 fps on 440k triangles, no long tasks.
- Started: R-ENG round 3 (mode labels k / family / familyIndex / selected; line-integral quadrature doc) and R-UI
  round 2 (X1-X20, engine round-2 entries incl. Parametric dataset selector, COMSOL settings sections, Insert
  Expression browser, unit dropdown, undo/redo, custom sharp tooltips).
- 2026-10-15 15:48 PDT R-ENG round 3 done: one mode identity (`k`, `family`, `familyIndex`, `label` like
  'k=2 (TE0)', `selected`) on result.optical, result.eo arms, mode table rows and datasets; line integrals documented
  as 3-point Gauss per element crossing (exact for the interpolation), `resolution` rejected for line integrals.
  Engine 247 tests (244 pass, 0 fail, 2 skipped, 1 todo); reference 11/11.
- 2026-10-15 16:18 PDT R-UI round 2 done (DevLog-032): X1-X23 fixed; public engine entries only; Parametric dataset
  "Parameter value" selector with on-demand point fields (max 2 retained); wide numeric tables; Insert/Replace
  Expression browser; unit dropdown; one mode label everywhere; Select tool edits only Selection nodes; COMSOL
  settings sections (Data, Expression, Title, Range, Coloring and Style, Quality); undo/redo 50 steps; custom sharp
  tooltips (no native title left). App test 62/62, check 0/0, build, smoke 38/38; radius scan 0 rounded. mao2022 P2
  fine: first plot after Compute 3.9 ms, surface integral 24.5 ms first, 60 fps, no long tasks. Open: field plots or
  integrals across all sweep points at once (single point via the selector works). Arrow default color white in
  both themes -> quick fix requested before the final verification.
- 2026-10-15 16:20 PDT Arrow default color follows the theme ink color (and exports); gates re-run green.
- 2026-10-15 16:36 PDT Final verification (`DevLog/audits/simulator-results-final-verification-2026-10-15.md`): all
  8 gates match claims (engine 247: 244 pass, 0 fail, 2 skipped, 1 todo; reference 11/11; app 62/62, check 0/0,
  build, smoke 38/38; validate_db 0/0; pytest 30). E1, E3, E5, E9, X1-X5, undo, tooltips, light-theme arrows,
  Parametric fields verified; K4 vs DevLog-033 within the documented 1.4-3.5e-3 band. Failures: F1 hover probe on a
  sweep-point view shows the last Compute's value (silent wrong number); F2 data export on a sweep-point view exports
  the last Compute's data; F3 delete within 400 ms of Compute then Undo loses all default plot groups. Hygiene: an
  in-repo `scratchpad/audit-r-eng-cmp/` (created by the R-ENG auditor, contained absolute local paths) removed by
  the orchestrator. R-UI round 3 started for F1-F3 plus the 3 native app-shell tooltips.
- 2026-10-15 16:44 PDT R-UI round 3 done (DevLog-032): F1 probe and expression checks on sweep-point views use the
  shown solution (single request helper `requests.ts`); F2 sweep-point export with parameter values in header and
  filename; F3 default plot groups are not an undo step, history restarts at Compute; app-shell tooltips custom.
  App test 62/62, check 0/0, build, smoke 40/40. Lane states mode table, EO page, Line Graph, RF plots and Derived
  Values use the last Compute by design; fresh recheck launched to confirm F1-F3 and that these views are labelled
  unambiguously (`DevLog/audits/simulator-results-f1f3-recheck-2026-10-15.md`).
- 2026-10-15 F1-F3 recheck: F1 (probe 0.16974671910670938 = Node gap 4, labelled), F2 (sweep-point CSV correct, named),
  F3 (14/14 runs) pass; gates 62/62, 0/0, build, smoke 40/40. New: G1 silent wrong number (cut lines/points drawn
  on a sweep-point view evaluate the last Compute: 0.22086 V/um vs 0.16177 at gap 4); G2 mode table, EO page,
  derived values, Global/Point evaluation and RF views do not name the solution they use; G3 text; N1 unit not copied.
- Orchestrator decision: COMSOL semantics everywhere: every dataset-consuming view and derived value has an explicit
  solution/parameter selection, states it, and table rows carry a Solution column. R-UI round 4 started.
- 2026-10-15 17:11 PDT R-UI round 4 done (DevLog-032): Parameter value selector and solution label on every
  solution-consuming view (plot groups, cut lines/points, derived values, mode analysis, EO page, RF page, graphics
  toolbar); all requests through `requests.ts` with solution and mode; Solution column in every table; G3 text; N1
  unit; result-cache eviction loop fixed (small results not evicted, plot arrays 192 MB budget). App test 62/62,
  check 0/0, build, smoke 43/43. Fresh recheck launched (`DevLog/audits/simulator-results-g1g3-recheck-2026-10-15.md`).
- 2026-10-15 G1-G3 recheck: G1, G2, G3, N1 pass; every view at gap_um = 4 names its solution and equals Node (probe,
  cut-line Line Graph 500 samples, point evaluation, mode table, EO page VpiL 0.8819537364212485, Global Evaluation,
  optical title); views on Compute equal Node; no repaint/request loop (0 frames, 0 worker messages, 0 requests over
  10 s idle). All 8 gates green (engine 247: 244/0/2/1, reference 11/11, app 62/62, check 0/0, build, smoke 43/43,
  validate_db 0/0, pytest 30). New: H1 "+" derived buttons target the first cut line/point (labelled, not silent),
  H2-H4 labels/CSV/status, H5 sweep-point optical values depend on the worker reuse cache at ~1e-10, H6 sweep-point
  EO page shows fewer fields. R-UI round 5 started for H1-H4, H6. Orchestrator redacted a local home path and the
  local user name in two uncommitted audit files (two already-committed audits list the user name as a grep pattern).
- 2026-10-15 17:38 PDT R-UI round 5 done (DevLog-032): H1 derived buttons target the shown cut line/point; H2 one
  solution resolver for 1D groups; H3 CSV headers per series with units and solution; H4 status bar; H6 sweep-point
  EO page with the Compute page's content (agrees with engine result.eo to ~1e-14 on 5 configs + fixture; drive
  convention, tensor-term split and n_eff/n_e row not available at sweep points, shown as "-" with reason); H5 and
  smoke tolerances documented.
- 2026-10-15 Orchestrator gate run on the final tree (sequential, nice): engine 247 (244 pass, 0 fail, 2 skipped,
  1 todo), reference 11/11, app test 62/62, check 0 errors 0 warnings (465 files), build OK, smoke 45 PASS exit 0.

## Status (2026-10-15)

Done: R-ENG phases 1-2 (+ rounds 2-3), R-UI phases 1-2 (+ rounds 2-5), R-VAL references and checks, COMSOL-UX
review. Open: field plots/integrals across all sweep points at once (one point at a time via the Parameter value
selector); first uncached surface integral ~86 ms at 400k elements (real meshes capped near 160k triangles); sweep-
point EO page lacks drive convention, tensor-term split and n_eff/n_e row; ~1e-10 warm-start dependence of sweep-point
optical values. Nothing committed.
