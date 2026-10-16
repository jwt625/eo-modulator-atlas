---
title: Recheck of F1-F3 (sweep-point probe, sweep-point export, undo after Compute) and sweep-point semantics of the last-Compute views
date: 2026-10-15
verifier: fresh-context Claude subagent
scope: working tree on HEAD 656c487 after DevLog-032 round 3 (lib/sim/requests.ts, Results.rebase); built app, renaud2023-3um-738, gap study; gates once
---

# F1-F3 recheck (2026-10-15 16:45-16:52 PDT)

No code was changed. `nice -n 10`, one heavy process at a time, Node 23.7 with `--max-old-space-size=1536`.
`npm run build`, then `vite preview --host 127.0.0.1 --port 47931 --strictPort` (port checked free before, stopped
after, free again). Headless Chrome via playwright-core (`channel: chrome`, temporary profile), 1440x1050,
`/sim?id=renaud2023-3um-738&pool=2&debug=1`, gap study (2.5, 3, 4, 5 um) run from the Parametric Sweep node. Node
references: `runCrossSection(text, {keep: true})` for the last Compute (gap 3, study default) and
`storeForSweepPoint(text, 2, {study: 'gap', meshScale: 1, stages: null})` for gap 4, evaluated with `evaluateDerived`
/ `evaluatePlot`. Node peak RSS 480 MB. Scratch in the session scratchpad only, deleted at the end.

## 1. F1-F3

| Item | Check | Evidence | Result |
|---|---|---|---|
| F1 `__simProbe` | Electric Field group, Parameter value `gap_um = 4` (point index 2); `__simProbe` at 3 points vs Node gap 4 | (0.19969, -0.051724): 0.16974671910670938 vs 0.16974671910670938; (0, 0.2): 0.13245978896161908 vs 0.13245978896161908; (1.0, 0.3): 0.24167902178953082 vs 0.24167902178953082. All bit-identical; `sol` = `sweep:2`. Last Compute at the same points: 0.23244666, 0.18308755, 0.35422150 | pass |
| F1 hover probe | mouse at the pixel of (0.19969, -0.051724) | `x 0.19970 µm  y -0.051720 µm  box (silicon_dioxide)  es.normE 0.16975 V/µm [gap_um = 4]`. Node at (0.1997, -0.05172): gap 4 0.16974872, last Compute 0.23245031. The probe names the parameter value | pass |
| F2 Export > Data | Export page link `Electric Field: Surface 1 (es.normE)` with the gap 4 view shown | file `renaud2023-3um-738-Electric_Field-Surface_1-p3-gap_um=4.csv`; header `# Electrostatics (geometry); sweep point 3 (gap_um = 4); es.normE (V/um) at element corners`; 100119 rows, first row `-71.74400000000001,0.12,0.0036169202784738026`, column sum 9705.47831720147. Node gap 4 `location: 'corner'`: n 100119, first 0.0036169202784738026, sum 9705.47831720147 (last Compute: n 89514, first 0.07228734947172794) | pass |
| F3 (electrostatics only, 2 default groups) | fresh load, Compute, delete the first plot group as soon as the default groups appear, Undo; 6 runs, plus 1 run with 1.2 s delay | delete 61, 67, 64, 62, 63, 63 ms after the defaults appeared; every run 2 -> 1 -> 2 groups, Undo then disabled, Redo enabled, still 2 groups 2 s later. Delayed run (1266 ms): same | pass (7/7) |
| F3 (optical mode + EO overlap, 7 default groups, the original audit's case) | same, stages Mode Analysis and EO Coupling included | delete 71, 61, 57, 59, 72, 64 ms after the defaults appeared; every run 7 -> 6 -> 7, Undo then disabled. Delayed run (1264 ms): 7 -> 6 -> 7, Undo disabled (the previous second-Undo-removes-defaults behaviour is gone) | pass (7/7) |

## 2. Sweep-point semantics of the views that use the last Compute

Setup: Compute (all stages for the optical/EO/RF rows; electrostatics only for the cut line and cut point rows), gap
sweep done, the Electric Field group set to `gap_um = 4`. Page texts were read with `innerText` of the settings pane;
values compared with Node.

DevLog-032 round 3 says these views "address the last Compute (stated on their pages)". No such statement was found:
the settings pane text of Mode Analysis, EO Coupling, Derived Values and RF Line contains neither "last Compute" nor
a parameter value. "last Compute" appears only in the Parameter value selector, the Export > Data header and the
Datasets tree-node tooltip ("Solutions of the last Compute, cut lines, cut points, parametric sweep").

| View | Solution used | Labelling while a group shows `gap_um = 4` | Silent mismatch |
|---|---|---|---|
| 2D plot group on a sweep point (surface, arrows, title, hover probe, `__simProbe`, Export > Data) | the sweep point (`sol`) | title `Dataset: Electrostatics (geometry) (gap_um = 4) ...`; probe `[gap_um = 4]`; export header and file name | no |
| 2D optical plot group on a sweep point | the sweep point, its solved mode (request without mode index) | title `Dataset: Optical mode (gap_um = 4)   Surface: opt.normE^2 (V²/m²)`: no mode label or n_eff (last Compute: `k=1 (TE0), n_eff 1.96574`); Mode selector hidden | no (mode unnamed) |
| Mode Analysis table (Results > Derived Values > Mode Analysis; dataset page) | last Compute | headings `OPTICAL MODE`, `ARM A MODE (= OPTICAL MODE)`, `ARM B MODE`; no solution named. Page text: "Selecting a row shows that mode in every plot and derived value of the dataset"; a sweep-point group ignores the row (code: `plotRequest` sends `mode: undefined` when `sol` is set; not exercised in the browser) | no value under a wrong label; ambiguous; the "every plot" sentence is not true for sweep-point groups |
| EO Coupling page | last Compute (VpiL 0.63732 V·cm, gap 3) | `MZM`, `PER ARM`, region and coefficient tables; no solution or gap named | no; ambiguous |
| Derived Values section table (C', Z0, n_eff, VpiL, Vpi) | last Compute | header `renaud2023-3um-738 · geometry · 1.63 s`; no solution named | no; ambiguous |
| Global Evaluation (Evaluate) | last Compute | table `dataset | VpiL (V·m)`, row `Electrostatics (geometry) | 0.006373167527131322`. No gap column: gap is the study default, not an override, so `solutionParams` adds nothing | no; ambiguous |
| Point Evaluation on a cut point placed on the gap 4 view | last Compute | Cut point Data selector lists only `Electrostatics (geometry)`; table `dataset | x (µm) | y (µm) | es.normE (V/µm)`, row `Electrostatics (geometry) | 0.19969901947531454 | -0.05171964731876599 | 0.23244982959493435` = Node last Compute 0.23244982959493435 (gap 4: 0.16974850). The hover probe at the same pixel shows 0.16975 `[gap_um = 4]` | no explicit wrong label, but two different unlabelled/labelled values for the same picked point; ambiguous |
| Line Graph of a cut line drawn on the gap 4 view | last Compute | Cut line tool tooltip: `Cut Line 2D: drag to create a cut-line dataset on the shown solution`; the cut line overlay is drawn on the gap 4 field; Data selector lists only `Electrostatics (geometry)`; group title `Line Graph: Cut Line 2D 1`, series `es.normE (V/m) [Cut Line 2D 1]`. Sample at arc length 18.0783 um (x 0.16336, y -0.05172): 220860.43 V/m = 0.22086 V/µm; Node last Compute 0.22085, gap 4 0.16177 | YES: the tooltip says the cut line is on the shown solution (gap 4); the values are gap 3 |
| RF Line 1D group and RF Line results page | last Compute | title `RF Line`; page `RF LINE (UNIFORM QUASI-TEM SECTION)`; no solution named. RF has no sweep-point selector | no; ambiguous |
| Sweep 1D group, Parametric Sweep page, Evaluate over sweep | all finished sweep points | x axis = swept parameter; rows carry the parameter column | no (not re-exercised here; covered by smoke) |

### Findings

- G1 (minor-major: silent wrong number). Cut lines drawn on a sweep-point view sample the last Compute, while the
  Cut line tool tooltip (`Graphics.svelte` TOOLS, line 975) says "on the shown solution". Cut lines and cut points
  only accept `R.datasets` (main solution) as Data, and `Plot1D.svelte` line requests and `derived.ts`
  `requestOf` carry no `sol`. Either carry the group's `sol` into the cut line/point (Data = sweep point) or reword the
  tooltip and label the Line Graph / Point Evaluation with "last Compute".
- G2 (minor: ambiguity). The round 3 claim "stated on their pages" is not implemented: Mode Analysis, EO Coupling,
  Derived Values, Global/Point Evaluation tables and RF pages do not name the solution. Global Evaluation rows of a
  config whose swept parameter is at its default have no parameter column, so a row cannot be told apart from a sweep
  point at the same value only by its columns (here gap 3 is both).
- G3 (minor: text). The Mode Analysis page sentence "Selecting a row shows that mode in every plot and derived value
  of the dataset" does not hold for sweep-point groups (code-inspected), and the sweep-point optical title omits the
  mode it shows.
- N1 (note). `lineGraph()` copies the shown feature's expression but not its unit: the Line Graph of `es.normE` is in
  V/m while the source group plots V/µm.

## 3. Gates (once, sequential)

| Gate | Claimed | Measured | Result |
|---|---|---|---|
| `app: npm test` | 62/62 | 6 files, 62 passed | pass |
| `app: npm run check` | 0/0 | 461 files, 0 errors, 0 warnings | pass |
| `app: npm run build` | OK | "Wrote site to build" | pass |
| `app: npm run smoke` | 40 PASS | exit 0, 40 PASS lines, 35 s | pass |

After the run: no vite preview or headless Chrome process left; port 47931 free.

## Summary

F1 pass, F2 pass, F3 pass (14/14 runs over two stage sets). Gates match the claims. One silent mismatch remains in
the last-Compute views (G1, cut-line Line Graph under a tooltip that names the shown solution); the other last-Compute
views are unlabelled rather than mislabelled (G2, G3).
