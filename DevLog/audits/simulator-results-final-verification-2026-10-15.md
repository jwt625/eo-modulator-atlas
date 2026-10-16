---
title: Final verification of the simulator results/postprocessing work (DevLog-030 to DevLog-033, audit fixes E1-E14 and X1-X24)
date: 2026-10-15
verifier: fresh-context Claude subagent
scope: working tree on HEAD 656c487 (uncommitted engine/src/postproc, app/src/lib/sim Results UI, DevLog-030..033, validation EO references); gates, spot checks of the audit fixes, engine vs DevLog-033 references, commit hygiene
---

# Final verification (2026-10-15 16:21-16:36 PDT)

No code was changed. All runs used `nice -n 10`, one heavy process at a time, and Node 23.7 with
`--max-old-space-size=1536` (via NODE_OPTIONS for the npm scripts). The browser checks used one headless Chrome
(playwright-core `channel: chrome`, temporary profile) against `vite preview` on 127.0.0.1:47917. The port was checked
free before use, the server was stopped afterwards, and the port was free again. Peak RSS of the Node engine spot
script was 1.16 GB. Scratch lived in `scratchpad/results-final-verify/` and was deleted at the end.

## 1. Gates

| Gate | Claimed | Measured | Result |
|---|---|---|---|
| `engine: npm test` | 247 tests: 244 pass, 0 fail, 2 skipped, 1 todo | 247 tests: 244 pass, 0 fail, 0 cancelled, 2 skipped, 1 todo; 53.5 s. The one red line is the todo D5 (`audit-claude-wave-2026-10-02.test.mjs:404`, known scalar TE/TM limit) | pass |
| `engine: npm run test:reference` | 11/11 | 11 pass, 0 fail; 24.2 s | pass |
| `app: npm test` | 62/62 | 6 files, 62 passed | pass |
| `app: npm run check` | 0/0 | 460 files, 0 errors, 0 warnings | pass |
| `app: npm run build` | OK | exit 0, "Wrote site to build" | pass |
| `app: npm run smoke` | 38 PASS | exit 0, 38 PASS lines (renderer webgl2) | pass |
| `uv run python scripts/validate_db.py` | - | 0 errors, 0 warnings | pass |
| `uv run pytest -q` | - | 30 passed, 5 warnings | pass |

## 2. Spot checks of the fixes

Engine checks use the public API (`runCrossSection(..., {keep: true})`, `createSolutionStore`, `evaluateDerived`,
`modeTable`, `armElectrodeGap`) at engine defaults (vector solver). UI checks ran on renaud2023-3um-738
(`/sim?id=renaud2023-3um-738&pool=2&debug=1`), with stages Electrostatics, Optical mode and EO overlap.

| Item | Check | Evidence | Result |
|---|---|---|---|
| E1 | `surface_int eo.integrand` vs engine dn_eff/V, K4 arms A/B | -1.7040781144763314e-5 vs -1.704078114476348e-5 (9.8e-15); B 1.18e-14 | pass (<= 1e-9) |
| E1 | same, renaud2023 arms A/B | A -2.894946950776213e-5 vs -2.8949469507762055e-5 (2.7e-15); B 2.2e-16 | pass |
| E3 | run-time complex operands at (2.9, 0.9) um on the gsg fixture, with expressions other than the suite's | `log(...) < 0`, `min((...)^0.5, 2)`, `sqrt(...) == 0`, `!sqrt(...)` all raise "needs real operands, but operand 1 is complex at run time ... use real() or abs()" with a position; `abs(sqrt(...))` = 0.6708 | pass |
| E5 | CLI `--point` repeated, `--unit` aligned with `--eval` | `--point 2,0 --point 2.5,0` gives both values (0.5, 0.25 V). `--eval es.We --eval C --unit J/m --unit pF/m` gives both results. One `--unit` for two `--eval`: "one --unit with several --eval is ambiguous", exit 1. A failing expression gives a stderr message and exit 1 | pass |
| E9 | gap with a backside plane and a heater outside the window height; electrode overlapping the window | ignored `['plane', 'heater']`, gap 6 um. Overlapping electrode: gap null, reason "spans the arm centre laterally within the arm window's height" | pass |
| X1 | Global Evaluation `GammaA` over the `gap` study, then Table Graph | wide table header `dataset | gap_um (µm) | GammaA (1)`, numeric gap column 2.5 / 3 / 4 / 5. Table Graph has 1 series, and the x axis reads `gap_um (µm)` (screenshot inspected) | pass |
| X2 | type `Vpi` + Enter in a Global Evaluation | field keeps `Vpi`; table column `Vpi (V)` = 0.6373167527131322 | pass |
| X3 / X8 | one mode label | mode table `k=0 (TM0)`, `k=1 (TE0)`, solved `k=1 (TE0)`; EO page arm A and B `k=1 (TE0), vector P2`; title `Optical mode, k=1 (TE0), n_eff 1.96574`. The engine gives the same labels (result.optical.mode, eo.arms.A/B.mode, mode table, dataset labels, `armA aliasOf opt`) | pass |
| X4 | Select tool with a Surface feature active | feature selection `''` before and after the click; "Selection 1" created; log row "created by the Select tool" | pass |
| X5 | Sweep group Global `VpiL, VpiLtextbook` | no expression-check error, 2 series. With the default unit `V` left in place, the plot shows the correct unit-mismatch message ("unit V does not match V*m"), not a parse error | pass |
| Parametric selector | renaud2023 study `gap`, plot group Electric Field, Parameter value `gap_um = 4` (point 2); plot values captured from the worker replies, Node `storeForSweepPoint(text, 2, {study: 'gap', meshScale: 1})` | es.normE corner values: n 100119, sum 9705.47831720147, min 4.553727360586529e-8, max 0.9061437751342668, identical in browser and Node. es.Ex and es.Ey sums, min and max are identical too. The title says `(gap_um = 4)`. Last Compute (gap 3) differs: n 89514, max 1.0762 | pass (plotted fields) |
| Parametric selector: probe readout | hover probe on the gap 4 view | probe line `x 0.19969 µm y -0.051724 µm ... es.normE 0.23245 V/µm`. Node at that point: gap 4 = 0.16975, last Compute = 0.23245. `__simProbe(0, 0.2)` returns 0.18309 = last Compute, dataset `es` | FAIL (F1) |
| Parametric selector: Export Data | Export > Data with the gap 4 view shown | CSV header `# Electrostatics (geometry); es.normE (V/um) at element corners`. First row (-54.2433828125, -2.279099326481302, 0.07228734947172794) is the last-Compute mesh's first corner (Node). The point mesh starts at (-71.744, 0.12, 0.0036169) | FAIL (F2) |
| Undo / redo | delete Electric Potential, Undo, Redo, Undo (600 ms pauses) | 9 -> 8 -> 9 -> 8 -> 9 views; works on a fresh model and after a selection edit | pass |
| Undo / redo: fast delete after Compute | Compute, then show Electric Potential and delete it at once (about 140-200 ms after Compute's default groups appear), then Undo | Undo leaves only Geometry and Mesh. All 7 default plot groups are gone and Undo is disabled. Reproduced 6/6 runs | FAIL (F3) |
| Tooltips | custom tooltip, no native `title` | `.tip-pop` border radius 0px; `.sim-page [title]` count 0 on Mode Analysis, EO Coupling, Derived Values, Export, Parametric Sweep, Mesh. The app shell outside `.sim-page` still has 3 native titles (brand link, database count, theme toggle) | pass (sim UI); note N1 |
| Arrows in light theme | Electric Field group, Window view, dark then light | 580 arrows in both themes; "Theme color" checked; arrows white in dark and black in light, clearly visible (screenshots inspected) | pass |

Values from repeated engine runs of the same sweep point differ slightly in the mode-dependent globals. For example,
GammaA at gap 4 is 0.4760682974770137 (UI sweep row), 0.47606829737402084 (Node `storeForSweepPoint`) and
0.47606829746309964 (UX review), a spread of about 2e-10 relative. VpiL from the EO page (0.6373167527131322 V cm)
and from the UX review's Node run (0.6373167523193795) differ by about 6e-10. The electrostatic field values are
bit-identical. This is consistent with the iterative mode solver's tolerance and cache reuse, not a postprocessing
mismatch.

### Failures

- F1 (minor-major: silent wrong number). On a plot group whose Parameter value is a sweep point, the hover probe line
  and `__simProbe` evaluate the last-Compute solution. `Graphics.svelte` `runProbe` (around line 731) and the debug
  hook (around line 860) send `{op: 'derived', req: {...}}` without `sol`. Plot requests include
  `...(sol ? { sol } : {})` (line 86). The probe text does not say which solution it used.
- F2 (minor-major: wrong data in a file). Export > Data on a sweep-point view writes the last-Compute plot.
  `ResultsPages.svelte` `exportData` (line 84) looks up the cache key without `sol`. Neither the header nor the file
  name names the parameter value. If the main plot of that feature is not cached, the user gets "Plot the group first"
  even though the group is plotted.
- F3 (minor: narrow timing window, large effect). Results edits within 400 ms of the previous recorded change coalesce
  into one undo step (`results.svelte.ts` `commit`). Compute's default-group creation is itself a recorded change.
  A user edit inside that window is merged with the default-group creation, and one Undo returns to the empty
  pre-Compute model.
  - Snapshot trace (test-side `JSON.stringify` probe): t = 1982 ms 7 groups (defaults), 2190 ms 6 groups (delete),
    2231 ms 0 groups (Undo).
  - With more than 400 ms between Compute and the edit, Undo works. However, a second Undo still removes all default
    groups (9 -> 2 views), because Compute's default-group creation is an undo step.
  - Smoke passes because its delete happens long after Compute.
  - Suggested fix: do not record automatic default-group creation (reset the history baseline after `defaults()`), or
    close the coalescing window on structural tree operations (delete, add, duplicate).

### Notes

- N1: the app shell (`+layout.svelte` brand link, database count, `ThemeToggle.svelte`) still uses native `title`.
  This is outside `.sim-page`, so the smoke assertion holds, but a native tooltip appears on /sim.
- N2: the first browser pass recorded `mode_labels: []` because `allInnerTexts` ran before the table rendered. After
  waiting, the labels are present (`k=0 (TM0)`, `k=1 (TE0)`). This was an artefact of the verifier script, not a
  defect.

## 3. Engine vs DevLog-033 references (K4, engine defaults)

`runCrossSection(K4, {stages: ['eo_overlap'], keep: true})` (vector, P2, default mesh). The reference is
`validation/reference/eo-overlap-K4.json` `extrapolated.<key>.f_ext` and `U`. Gap: engine 5 um, reference 5 um (both
arms). The `case_sha256` of all 13 reference JSONs matches the current `validation/cases/*.yaml`.

| Quantity | Engine | Reference f_ext | (eng - ref)/\|ref\| | (eng - ref)/U |
|---|---|---|---|---|
| dn_eff/V arm A (1/V) | -1.704078e-5 | -1.700479e-5 | -2.12e-3 | -6.5 |
| dn_eff/V arm B (1/V) | 1.704283e-5 | 1.700683e-5 | +2.12e-3 | 11.9 |
| dn A, r33 | -1.631002e-5 | -1.627525e-5 | -2.14e-3 | -6.8 |
| dn A, r13 | -3.31807e-7 | -3.30961e-7 | -2.56e-3 | -4.0 |
| dn A, r51 | -3.98951e-7 | -3.98905e-7 | -1.2e-4 | -0.3 |
| dn A, r22 | 0 | 0 | exact | - |
| dn A, ln_slab | -1.068933e-5 | -1.066977e-5 | -1.83e-3 | -8.2 |
| dn A, ln_rib | -6.35145e-6 | -6.33665e-6 | -2.34e-3 | -5.9 |
| Gamma A (\|E\|^2) | 0.501948 | 0.500863 | +2.17e-3 | 6.6 |
| Gamma A (\|E_x\|^2) | 0.501912 | 0.500839 | +2.14e-3 | 6.9 |
| Gamma B (\|E\|^2) | -0.502013 | -0.500911 | -2.20e-3 | -10.2 |
| VpiL full tensor (V cm) | 2.273820 | 2.278604 | -2.10e-3 | -8.9 |
| VpiL textbook \|E\|^2 (V cm) | 2.557831 | 2.563398 | -2.17e-3 | -8.2 |
| VpiL textbook x n_eff/n_e (V cm) | 2.266584 | 2.271517 | -2.17e-3 | -8.2 |

All offsets are 1.2e-4 to 2.6e-3 relative and have the same sign pattern as in the R-ENG audit (K4 L0 row: dn A
-2.12e-3, Gamma +2.17e-3, VpiL full -2.10e-3, textbook -2.17e-3). They fall inside the 1.4e-3 to 3.5e-3 band stated in
`result.eo.accuracyNote`. As documented, this is the electrostatic discretisation of the default mesh, not a
definition difference. The textbook / full-tensor VpiL ratio is 1.125 (engine) vs 1.125 (reference).

## 4. Commit hygiene

`git status --short`: 38 tracked files modified or deleted (4 deletions: CutLinePanel.svelte, PlotSettings.svelte,
fieldsView.ts, synthetic.ts; the build passes without them). 110 untracked files, not counting this verifier's
deleted scratch.

- Grep of all 90 changed and untracked non-scratch files for `/Users/`, the local user name, `/home/`, `/private/tmp`, and
  for secret patterns (api key, password, bearer, token assignment, ghp_, sk-, AKIA, private key): no hits. The one
  match is the code identifier `const token` in `ExprInput.svelte`. No hits for `daily-notes`, `luxretius`, `jwt625`
  or `@gmail`. No emoji.
- Should NOT be committed:
  - `scratchpad/audit-r-eng-cmp/` (58 files, 328 KB; the R-ENG audit's scripts, JSON and logs). It is untracked and
    not ignored (`.gitignore` has no `scratchpad/` rule), so `git add -A` would include it.
    `scratchpad/audit-r-eng-cmp/engine-test-20261015T1519.log` contains absolute local home-directory paths (Node
    stack traces). Delete it, or add `scratchpad/` to `.gitignore`, before staging.
- Ignored, so not at risk: `logs/` (the round logs cited in DevLog-031), `app/build/`, `app/.svelte-kit/`,
  `app/static/sims/`.
- Candidates to commit (source, docs, data):
  - DevLog-030..033 and the two audits plus this file;
  - `app/src/lib/sim/*` (new components, `post/`, `results.svelte.ts`);
  - `engine/src/postproc/`, `engine/tests/postproc.test.mjs`, `engine/bench/postproc-bench.mjs`;
  - `validation/reference/eo-overlap-*.json` (13 files, 50-57 KB each) and `summary-eo.json` (115 KB);
  - `validation/run_eo.sh`, `validation/scripts/ref_eo_overlap.py`.

  `run_eo.sh` depends on `run_guarded.sh` and `run.sh`, which are already tracked.

## Commands

```
cd engine && NODE_OPTIONS=--max-old-space-size=1536 nice -n 10 npm test
cd engine && NODE_OPTIONS=--max-old-space-size=1536 nice -n 10 npm run test:reference
cd app && NODE_OPTIONS=--max-old-space-size=1536 nice -n 10 npm test        # also: run check, run build, run smoke
nice -n 10 uv run python scripts/validate_db.py && nice -n 10 uv run pytest -q
# spot checks: scratch scripts spot-engine.mjs (E1/E3/E9/mode identity/K4 reference), node-point.mjs (sweep point 2),
# ui-check*.mjs (playwright-core, vite preview --port 47917 --strictPort); deleted after the run
```
