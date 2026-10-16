---
title: S7/S8 UI - semiconductor stage, bias datasets, silicon results views, S7 notices (lane T7)
date: 2026-10-16
status: implemented 2026-10-16 01:45 PDT (gates below); plan written 01:18 PDT before implementation
owner: T7 UI subagent (Claude, orchestrated at Wentao Jiang's request)
scope: app/src/lib/sim/, app/src/lib/sim.worker.ts, app/src/lib/SimStageResults.svelte, app/src/routes/sim/, sim steps of app/scripts/smoke.mjs, this file
---

# DevLog-042: S7/S8 UI (lane T7)

Parent: DevLog-035 row T7. Inputs: DevLog-032 (Results UI, per-view solution selection, `requests.ts`), DevLog-034
(refined plots), DevLog-036 (S7 engine + T1 S7 views), DevLog-039 (S8 stage, `semi` / `semi:<k>` datasets, 13 `semi.*`
variables, `perLength`, schema `$defs/semiconductor`). Engine is read-only for this lane (T1 round 4 edits it
concurrently: silicon TWE coupling); new engine fields are consumed when DevLog-036 announces them.

## Engine contract read (2026-10-16 01:15 PDT, Node probe on han2023 at meshScale 2: 7,824 nodes, 7 biases, 1.46 s)

- `runCrossSection(text, {stages: ['semiconductor'], keep: true})` runs the stage alone (no electrostatics);
  `result.semiconductor`: `models` (locators, density basis, delta-eps order), `points[]` (biasV per contact,
  sweptBiasV, forwardBiasV, capacitance {cFPerM, cPfPerMm, depletion...}, resistance {rOhmM, rOhmMm}, rc {fRcGhz},
  optics {dneff, dalphaDbPerCm, lossDbPerCm, alphaPerM, vpilVcm (single-arm secant), vpilDifferentialVcm,
  vpilPushPullVcm, vpilConventions}, newton {iterations, gmres, residualInf}, checks, flags, timing), `targets`,
  `sweep` {contact, valuesV, referenceV}, `reference`, `optical`, `mesh`, `labels`, `perLength`.
- Store datasets: `opt`, `opt:k`, `semi` (reference bias), `semi:<k>` (bias point k), mesh `semi` (device mesh incl.
  insulators; n = p = 0 at insulator nodes). Variables on `semi*`: psi, phin, phip, n, p, ND, NA, Nnet, rho, dN, dP,
  delta_n, delta_alpha (node P1, SI) plus the optical `opt.*` variables.
- Types: `engine/src/postproc/index.d.mts` DatasetInfo.kind has no 'semi' and run.d.mts has no `semiconductor`;
  the app declares structural types for both (no engine edit).
- `eo_response` result (yang2022 probe): normalization, normalizationOffsetDb, seriesResistanceDcOhm, thicknessModel,
  lateralRelaxationGhz (+note), thinConductorBelowGhz, byTarget[].diagnostics[{code, text}], junction (null until T1
  round 4); target `diagnostic`, `diagnosticCodes`, `referenceSensitivity` (unstated reference).

## Plan

### Model Builder and run

1. Stage `semiconductor` in the optional stages (toolbar and Study): runs alone (engine rule), so selecting it
   deselects the cross-section stages and vice versa (logged); electrostatics shown unchecked while it is selected;
   readiness from `inspectConfig` stage errors (`semiconductor`).
2. Physics node "Semiconductor" (when the config has a `semiconductor` block): stage toggle, readiness, temperature,
   material models (mobility, intrinsic density, recombination), children per doping region and per contact; selecting
   the node or a child draws the doping windows (rect / polygon / regions / material; lateral window of implant
   profiles) and the contacts on the Geometry view (donor and acceptor colours, labels with concentration).
3. Study node "Bias Sweep": swept contact, bias values (editable list written as a YAML sequence), reference bias,
   small signal dv, optics (plasma model, wavelength, drive, density basis); Compute.
4. Worker: unchanged protocol; `semi` base dataset; UI mode index of a `semi` dataset = bias point k (session maps
   `semi` + k -> `semi:k`, none -> `semi`, the reference bias).

### Bias as the parameter value (per view)

5. PlotGroup, CutLine, CutPoint, DerivedNode get `bias` (-1 = reference bias, k = bias point); a "Bias" selector in
   the Data section of every view whose dataset is a `semi` dataset (label `cathode = 3.5 V`); requests.ts routes it;
   default = last bias point (COMSOL: last parameter value); plot titles name the bias.

### Default plot groups after a semiconductor solve

6. 2D (filtered to an automatic "Semiconductor" selection of the semiconductor regions; n, p are 0 in insulators):
   Net Doping (semi.Nnet, 1/cm^3, new signed-log scale "log, signed": sign(v) log10|v| over the decades of the data,
   Wave table, contour at 0 = metallurgical junction), Electron Density and Hole Density (semi.n / semi.p, 1/cm^3, log
   scale), Potential and Quasi-Fermi Levels (semi.psi surface, phin and phip contours), Delta n (semi.delta_n) and
   Delta alpha (semi.delta_alpha, 1/cm), each with the optical mode intensity contour (dataset opt) when present.
   Refined plotting (DevLog-034) as for every surface.
7. 1D groups on a new Global dataset "Bias sweep" (per-bias values of the stage, evaluated on the main thread with the
   engine expression compiler and app-declared variables with SI units): C'(V), R'(V), f_RC(V), dn_eff(V), d alpha(V),
   VpiL(V) (single-arm secant, differential, push-pull as labelled by the engine), with paper semiconductor targets
   overlaid (comparable: false and engine convention in the point detail).

### Semiconductor results page

8. Derived Values > Semiconductor: per-bias table (V, forward bias, C', R', f_RC, dn_eff, d alpha, loss, VpiL secant /
   differential / push-pull, Newton iterations, GMRES, residual, flags), CSV; models with locators (n_i, mobility,
   field, recombination, plasma dispersion row and coefficients if importable without engine edits, density basis,
   delta-eps order, discretisation), mesh and optical-mode statistics, reference bias, targets with status, labels.

### S7 polish

9. EO Response 1D plot: notice strip with reference / normalization (DC limit with series resistance, offset), and
   diagnostics (thin conductor, lateral relaxation, slab limits, dielectric loss declared none, unstated reference with
   the DC / 1 / 3 GHz values) from the engine result and targets; same notices on the RF Line results page.
   Loaded Line: series labelled lossless or lossy explicitly.

### Derived Values on semi

10. Surface Integration / Average / Max / Min of semi.* over selections with the bias selector (e.g. int(semi.n) over
    the Semiconductor selection in 1/m); Point and Line evaluations on semi datasets use their cut point / line bias.

### Gates

app `npm test` (new unit tests: bias globals, signed-log mapping, bias request routing), `npm run check` 0/0,
`npm run build`, smoke extension (semiconductor stage run on han2023 at a coarse mesh; carrier plot probe vs Node point
values; bias selector changes the plotted solution; C'(V) series vs Node; Derived Value integral vs Node), screenshots
1440/1280/390 dark and light inspected, radius scan, performance (first plot after a bias solve < 100 ms on han2023,
no long tasks > 50 ms). Hardware: one heavy task at a time, nice -n 10, `?pool=2`, single headless Chrome.

## TODO

- [x] stage toggle / exclusivity, Physics Semiconductor node with doping/contact overlay, Study Bias Sweep
- [x] session semi mapping, bias per view (groups, cut lines/points, derived), titles
- [x] signed-log scale (renderer GL + Canvas 2D, legend ticks, contour levels)
- [x] default 2D groups, automatic Semiconductor selection
- [x] Bias sweep Global dataset + 1D defaults + target overlay
- [x] Semiconductor results page
- [x] S7 notices (EO Response plot, RF Line page), Loaded Line labels
- [x] tests, check, build, smoke, screenshots, radius scan, performance
- [ ] fresh-context audit (orchestrator)

## What was built (files)

| File | Change |
|---|---|
| `lib/sim/semi.ts` (new) | structural types of `result.semiconductor`; bias labels / choices; Bias sweep Global dataset (13 `semi.*` per-bias variables with SI units, evaluated by the engine `compileExpression` on the main thread); stage targets as plot points on the variable of the engine convention |
| `lib/sim/semiOverlay.ts` (new) | doping windows (rect, polygon, regions, material, implant lateral window dashed) and contacts from the expanded config |
| `lib/sim/BiasSelect.svelte` (new) | Bias selector of a view (last point default, reference when not a bias point) |
| `lib/sim/SemiResults.svelte` (new) | Derived Values > Semiconductor page: per-bias table + CSV, models with locators, plasma coefficients of the used row (engine `plasmaRow`, loaded by Vite glob import so the type checker does not check engine JS), density basis, delta-eps order, VpiL conventions, mesh / optical statistics, stage targets, labels |
| `lib/sim/semi.test.ts` (new) | 9 tests: bias globals and missing values, target points by convention, bias labels, request routing (groups, cut lines, derived), signed-log mapping / ranges / contour levels, response notices, doping shapes |
| `lib/sim/post/contract.ts`, `post/session.ts` | DatasetInfo kind `semi` (+ `nBias`); `semi` + bias k -> `semi:k`, none / -1 -> reference |
| `lib/sim/results.svelte.ts` | `bias` on plot groups, cut lines, cut points, derived values; `isSemi`, `biasIndex`, `indexFor`; auto selection `Semiconductor`; semiconductor default groups (6 x 2D, 6 x 1D) |
| `lib/sim/requests.ts`, `derived.ts` | bias routed as the mode of semi datasets; bias column in derived tables |
| `lib/sim/workbench.svelte.ts` | stage `semiconductor` (alone; `SEMI_COMBINABLE`), `stageList`, `semi`, `solvedMesh`, `editList`; defaults with the semiconductor regions; semi solves open on Net Doping; sweeps blocked with the semiconductor stage |
| `lib/sim/fieldmath.ts`, `renderer.ts`, `layers.ts`, `colorbar.ts`, `types.ts` | scale mode `symlog` (log, signed) in the GL shader, Canvas 2D, ranges, contour levels and legends |
| `lib/sim/Graphics.svelte` | bias in titles; doping / contact overlay; zoom extents to the selected domains; semi mesh in the Mesh view; probe / cut tools carry the bias |
| `lib/sim/ModelTree.svelte`, `Settings.svelte`, `enums.ts`, `Field.svelte` | Physics > Semiconductor (+ doping and contact children), Study > Bias Sweep, Derived Values > Semiconductor; schema enums of `$defs/semiconductor`; exponent display of numbers >= 1e9 |
| `lib/sim/PlotGroupSettings.svelte`, `ResultsPages.svelte`, `solutions1d.ts`, `Plot1D.svelte` | Bias selectors; Bias sweep Global dataset; Signed log option; S7 notice strip; Bloch series lossless / lossy |
| `lib/sim/labels.ts`, `lib/SimStageResults.svelte` | `responseNotices` (reference / normalization, thin conductor, lateral relaxation, slab limits, dielectric loss none, unstated reference); RF Line page notices and lossy label |
| `lib/sim/BottomPanel.svelte`, `SweepSettings.svelte`, `routes/sim/+page.svelte` | Messages list offered stages only; Run sweep disabled with the semiconductor stage; toolbar stage list and electrostatics state |
| `app/scripts/smoke.mjs` | S8 UI step (below) |

## Decisions

- D1 Bias is the parameter value of a view on the `semi` dataset (COMSOL: Parameter value of a parametric solution),
  carried in the request as the dataset's mode index; default last bias point; the reference bias is listed only when
  it is not one of the bias points.
- D2 Per-bias quantities are a main-thread Global dataset "Bias sweep" (as the parametric sweep globals): names
  `semi.V, semi.Vfwd, semi.C, semi.Cdep, semi.R, semi.fRC, semi.dneff, semi.dalpha_dB, semi.loss_dB, semi.alpha,
  semi.VpiL, semi.VpiL_diff, semi.VpiL_pp`; dB/cm quantities are plain numbers (R7 precedent of rf.alpha_dB).
- D3 Carrier, doping and Delta plots are filtered to an automatic "Semiconductor" selection (materials of the
  `semiconductor` block) because n = p = 0 at insulator nodes; Potential is drawn on all domains.
- D4 Net doping uses a new signed-log scale (sign(v) log10 |v| over the |v| range, |v| < min at the centre, 8-decade
  clamp as the log scale), so the values stay in absolute units (1/cm^3) and the probe shows the exact value; the
  junction is a contour at N_D - N_A = 0.
- D5 delta_n and delta_alpha are the engine's nodal P1 fields (`semi` dataset location node), drawn with the DevLog-034
  refined lattice like every surface; the engine has no per-element variant (the brief's "per element" not built).
- D6 The semiconductor stage stays alone in the UI: T1 round 4 combines it with eo_response through run options
  (`rfSection`, `biasV`) that the orchestrator will turn into config keys; wiring them now would be thrown away.

## Gates (2026-10-16 01:40-01:50 PDT, `nice -n 10`, one heavy task at a time, logs in the session scratchpad `t7ui/`)

- app `npm test` 72/72 (7 files), `npm run check` 0 errors 0 warnings (470 files), `npm run build` OK.
- smoke (before the last polish edits): exit 0, 48 PASS (47 + new S8 UI step): semiconductor stage alone (optical mode
  and electrostatics unchecked), doping table, han2023 at mesh level Coarse (7 bias points), electron density probe =
  Node store at 4 points for the last bias and bias point 0 (relative 1e-9; the selector changes the values), C'(V) plot
  CSV = Node per point (1e-9), Semiconductor page table, int(semi.n) over the Semiconductor selection = Node
  (7.2450e13 1/m, 1e-9). Final smoke after the polish edits (01:43 PDT): exit 0, 48 PASS (log `t7ui/smoke-20261016T014257.log`).
- Screenshots (scratchpad `t7ui/shots`, `t7ui/smoke-shots`) inspected at 1440 dark, 1280 light, 390 dark and light:
  Physics Semiconductor with overlay, doping child, Bias Sweep page, all default views, Semiconductor page, S7 EO
  Response notices (yang2022-a) and RF Line page. Radius scan (elements and ::before/::after) on /sim: 0 rounded, in
  every run.
- Performance (production build, headless Chrome, han2023 at the configured mesh, 7 bias points, solve 5.3 s wall in
  the worker): first plot painted 37.6 ms after the result message (Coarse: 28-42 ms); plot requests 10-30 ms in the
  worker; a bias change re-plots within 8-60 ms (50 ms polling granularity), no long tasks > 50 ms on the main thread
  during the solve, the view switches or the bias changes (PerformanceObserver longtask).

## Open items

- han2023 and anjali2025 are not in `app/static/data/atlas.json` (built 2026-10-08, before the configs), so /sim cannot
  select them by id; the smoke pastes the YAML. Regenerating the data (`npm run data`) is outside this lane.
- Semiconductor + eo_response in one Compute (T1 round 4) after the config keys `line.rf_section` and
  `semiconductor.operating_bias_v` exist: add the stage to `SEMI_COMBINABLE`; the response notices then apply.
- Parametric sweeps with the semiconductor stage are blocked in the UI (no sweep globals from the stage).
- Delta n default range is set by the 4e20 cm^-3 contact regions (han2023 legend about -0.35 to 0, Nedeljkovic fit on
  absolute densities); the core change is visible with a manual range or a smaller selection (data shown as computed).
- Bias selection of sweep-point solutions with a semiconductor dataset is not addressed (sweeps blocked).

## Progress log

- 2026-10-16 01:18 PDT Read DevLog-035/032/034/036/039, all of app/src/lib/sim, worker, page, smoke, engine types;
  Node probes of han2023 (semiconductor) and yang2022 (eo_response); app sources snapshot in the session scratchpad
  (`t7ui/snapshot/app-pre-t7.tar`) to detect concurrent edits. Plan above.
- 2026-10-16 01:20-01:39 PDT Implementation (files below); app test 72/72 (new `semi.test.ts`, 9 tests), check 0/0, build
  OK. Exploratory browser run (preview on port 47691, checked free, stopped after) on han2023 at mesh level Coarse:
  stage exclusivity, Physics Semiconductor page with the doping table and the doping/contact overlay, Bias Sweep page,
  13 default plot groups, Semiconductor results page; no page errors, no long tasks. S7 run on yang2022-a (EO response):
  notices reference / lateral relaxation / slab limits / dielectric none; screenshots reviewed (scratchpad `t7ui/shots`).
  Fixes from the screenshots: doping labels only where they fit (or focused), zoom extents to the selected domains,
  exponent display of large Field numbers, series names of the Bias sweep plots, Messages list only offered stages.
- Concurrent state (DevLog-035 01:3x): T1 round 4 landed `semiconductor` + `eo_response` with run options `rfSection`,
  `biasV`; the orchestrator will turn them into config keys (`line.rf_section`, `semiconductor.operating_bias_v`) next
  round, so the UI keeps the semiconductor stage alone for now (`SEMI_COMBINABLE = []`, open item).
- 2026-10-16 01:40-01:44 PDT Polish (signed-log legend ticks near the centre dropped, semiconductor solves open on Net
  Doping, sweeps blocked with the semiconductor stage), measurements at the configured han2023 mesh and 1280 / 390
  dark and light screenshots, final gates: test 72/72, check 0/0, build OK, smoke exit 0 with 48 PASS. No preview
  server or Chrome left running; app sources compared with the pre-edit snapshot (only this lane's files changed).

## Round 2 (2026-10-16 02:06-02:21 PDT): audit `DevLog/audits/simulator-s8-ui-audit-2026-10-16.md` F1-F14

Engine inputs: DevLog-039 round 4 (`semi.dn_bias`, `semi.dalpha_bias`, globals `semi.dn_eff_per_v`, `semi.G`,
`semi.operating_bias`; round 3 `conductance`, `optics.dneffPerV`, `vpilPushPullReason`, convention names
`single_arm_small_signal_central_dv`, `push_pull_small_signal_both_arms_reverse_biased`, `operatingBiasV`), DevLog-036
round 5 (eo_response after the semiconductor stage from `line.rf_section` + `semiconductor.operating_bias_v`).

| ID | Done |
|---|---|
| F1 | Default "Delta n (bias)" / "Delta alpha (bias)" = `semi.dn_bias` / `semi.dalpha_bias`; "Delta n vs undoped" / "Delta alpha vs undoped" (log) kept as secondary groups with the new feature option Automatic range = optical-mode region (lattice points with the mode intensity >= e^-2 of its peak, evaluated on the same lattice; values outside at the end colours; rule in the legend tooltip). han2023 5 V: ranges 0..1.0e-3 (dn_bias), -1.0e-3..0 (delta_n), 1e-7..4 1/cm (delta_alpha, log) |
| F2 | `semi.VpiL_diff` / `semi.VpiL_pp` descriptions restated from the engine definitions plus the engine convention label (`biasVariables`); push-pull gaps with `vpilPushPullReason` as plot notes and table tooltips; series renamed "single arm, small signal"; convention map accepts the round-3 names |
| F3 | comparable: false paper points: grey dashed diamond and their own legend key "paper (comparable: false)" |
| F4 | top-level VpiL config targets listed on the Semiconductor page and as a note on VpiL(V) (no bias stated: not placed) |
| F5 | notices are warnings only where the engine flags a target band or a DC-referenced bandwidth with the code (byTarget, bandwidth, metricDiagnostics, referenceSensitivity), else information; Wheeler step-check spread notice; reference-sensitivity values in the visible text; junction-loaded line notice |
| F6 / F14 | legend tooltips: signed range of the signed-log scale; count and level of values below an automatic log range (8-decade clamp) |
| F7 | descriptions "electron density n" / "hole density p" |
| F8 | probe outside the feature's selection says "outside selection" (`__simProbe` reports `outside`) |
| F9 | Derived Values: a plain variable gets its display unit by default (integrals keep SI) |
| F10 | Ω·mm / V·cm headers (CSV keeps ASCII), dn_eff tooltip and description from `deltaEps` / density basis |
| F11 | overlay labels placed above (else below) their shape, skipped on overlap; focused entry, contacts, doping in that order |
| F12 | Messages list blocked reasons for selected stages only (unselected: toolbar tooltip `data-stage-error`, Physics pages); smoke readiness checks moved to the tooltips |
| F13 | Semiconductor page columns G' (S/m, reason when null) and dn_eff/dV, operating bias line; Bias sweep variables `semi.G`, `semi.dn_eff_per_v`; Bias Sweep page fields `semiconductor.operating_bias_v`, `line.rf_section` and the EO response toggle; `semiCombinable('eo_response')` when both keys exist (rf_line shown as its dependency); RF page and EO Response notices for the junction-loaded line |
| chain | configs load with their `chain` stages when every optional chain stage passes readiness and the URL has no `stages` (yang2022, zhang2022, mao2022, ...; chen2022-c with blocked chain stages unchanged); links write `stages=` also when empty; smoke loads of renaud2023 / mao2022 pass `stages=` to keep their baselines |

Gates (02:19-02:21 PDT): app test 74/74 (semi.test.ts 11), check 0/0 (470 files), build OK, smoke exit 0 with 49 PASS
(new "S8 UI round 2": dn_bias probe = Node at 3 points, oxide probe outside selection, semiconductor + EO response on the
engine's illustrative rib fixture with an illustrative electrode cut and the two keys: stages semiconductor, rf_line,
eo_response, junction-loaded line, bw3 16.150 GHz = Node, notice strip; yang2022-a loads with EO response selected; log
`t7ui/smoke-20261016T021933.log`). Screenshots inspected (1440 dark at the configured mesh, 390 light, smoke shots).
Radius scan 0. Performance at the configured han2023 mesh: first plot 57.7 ms after the result (Net Doping, signed-log
scan included; Coarse 35 ms), plot requests 7-33 ms, bias change within 60 ms, no long tasks.

Open (round 2): han2023 / anjali2025 still not in atlas.json; parametric sweeps with the semiconductor stage blocked;
no sims config carries `line.rf_section` + `operating_bias_v` yet (combined run verified on the test fixture only).
