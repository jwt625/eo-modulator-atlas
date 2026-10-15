---
title: Fresh-context verification of the simulator after L-PARAM round 5 (F1-F10, W3, DevLog-029 proposals 1-7)
date: 2026-10-15 (started 09:01:45 PDT, written 09:18:37 PDT)
auditor: fresh-context Claude subagent
scope: full gates on the final tree (engine, reference tests, app test/check/build/smoke, Python DB); round-5 claims in DevLog-026 "Round 5 results" against the code, tests and runs; config physical inputs vs HEAD 365519a for the five round-5 configs; yang2022 vector VpiL change round 4 -> round 5; bench baseline
---

# Round-5 verification (2026-10-15)

Read-only on code and configs. Files written: this report, `logs/bench-baseline-20261015T0915.json` (write task A),
`logs/bench-20261015T0915.jsonl` (bench log). `logs/` is gitignored. Scratch scripts were in
`scratchpad/round5-verify-a1/` and were removed afterwards. No state-changing git commands were run.

Setup: Node 23.7.0, `nice -n 10`, `--max-old-space-size=1536`, one heavy process at a time. Load average was 2.6-3.0
from other work, so wall times are indicative only.

Result: 2 blocking (both are red app gates), 2 major, 4 minor, 5 notes. The engine side of round 5 holds:

- Suite: 222 tests (219 pass, 2 skipped, 1 todo); reference tests 11/11.
- ng flips and the new studies reproduce the DevLog-026 numbers exactly.
- K4 lossy TM returns the dielectric mode.
- The F4 timings and C' values reproduce.

The two app gates (`npm run check` and `npm run smoke`) are red on the final tree. Round 5 changed the engine types
and the test fixtures but did not update the app, so the reported 0/0 and 27 PASS are stale.

## Gates

| Gate | Reported | Measured (this audit) | Notes |
|---|---|---|---|
| `engine: npm test` | 222 / 219 pass / 0 fail / 2 skipped / 1 todo | 222 tests, 219 pass, 0 fail, 2 skipped, 1 todo (D5) | 31.7 s, peak RSS 1.03 GB |
| `engine: npm run test:reference` | 11/11 | 11 pass, 0 fail | 23.7 s, peak RSS 1.39 GB |
| `app: npm test` | 48/48 | 48 passed (5 files) | |
| `app: npm run check` | 0/0 | **3 errors, 0 warnings, exit 1** | G1 |
| `app: npm run build` | OK | OK (adapter-static, "Wrote site to build") | chunk-size warning only |
| `app: npm run smoke` | 27 PASS | **0 PASS, crash at startup, exit 1** | G2. A scratch copy with two test-side edits gives 27 PASS. |
| `uv run python scripts/validate_db.py` | unchanged | 0 errors, 0 warnings | |
| `uv run pytest -q` | unchanged | 30 passed, 5 warnings | |

## Round-5 claims, item by item

| Item | Exists | Test / evidence | Verified by this audit |
|---|---|---|---|
| F1: vector is the default and scalar results are labelled approximate | yes: `DEFAULT_OPTICAL_SOLVER = 'vector'` (config.mjs:29); label `scalar_optical_approximate` (optical-stage.mjs:99) | `fields-solver-options` "round 5: vector is the default ..." | yes |
| F1: three ng status flips | yes | survey of all 40 configs, default vs scalar (`optical_mode` + `eo_overlap` where ready) | yes. 30 runnable. Exactly 3 status changes, all ng_opt fail -> pass. wang2022: n_eff 1.95158 / 2.34639, ng 2.4579 / 3.7552 vs target 2.5. valdez2022: 2.3106 / 3.1264 vs 2.32. valdez2023: 2.3184 / 3.1343 vs 2.31. Same 10 non-runnable configs as listed. |
| F2: `optics.mode_select` and the metal-power / SPP guard | yes | unit test of `lossyModeGuard` and `mode_select` validation | yes, end to end on the audit's K4 lossy case (gold [-95, 10], vector). See below. |
| F3: scalar + TM + eo_overlap is an error | yes: `checkEoSolver` | test asserts the run error and the readiness error; vector TM runs | yes (test passes) |
| F4: `mesh.p2_mesh_factor` default 2 | yes (run.mjs:125-127; also applied to the Wheeler solves at run.mjs:174) | median of 3, electrostatics only (table below) | yes. C' and node counts identical to DevLog-026. Times within run-to-run spread. |
| F6: reference budgets | yes | REF_VERBOSE run | yes. Tolerance / measured difference: K1 n_eff 1.26e-5 / 4.7e-6 (2.7x); K2 5.06e-6 / 1.1e-6 (floor); K3 9.99e-6 / 3.9e-6 (2.5x); K4 VpiL 1.26e-2 / 4.8e-3 (2.6x); K5 per gap |
| F7: doublings, TM message, window margin | yes (`VECTOR_MAX_DOUBLINGS = 4`, `windowMarginPowerFraction` in diagnostics) | constant asserted | partly: `windowMarginPowerFraction` was seen in K4 diagnostics (1.2e-6). The >1e-2 warning label and the 4-doubling retry are not exercised by any test (G7). |
| F8: bounded warm cache | yes (4 entries / 64 MB LRU) | unit test (entry and byte eviction) | yes (test). The 12-point sweep memory figure was not re-measured. |
| F9: docs | mostly | README stage list, SPEC lines 5 and 94, package.json, `--test-concurrency=1` | yes, with stale remnants (G8) |
| F10: `modeOnly` / `--mode-only` | yes | reference test "K2 through runCrossSection modeOnly" | yes. CLI K2 `--mode-only`: n_eff 1.8941673, `electrostatics: null`. The nullable type broke the app check (G1). |
| W3: YAML splice | engine only | `fields-solver-options` W3 test | **engine yes, app no (G3)** |
| 029-1: vendor-datasheet library alternatives | yes (`eps_r_unclamped_vendor` 85 / 28.7, `r_pm_per_v_unclamped_vendor` 10 / 7 / 33 / 33), with locator p.2 and `secondary_vendor` | library-citations test pins the values | **unverified.** The PDF is not in `references/` or any local cache. Not downloaded. |
| 029-2: `drive_frequency_hz` and `lowFrequencyRange` | yes | runs: mao2022 2.598, yang2022 2.439, boynton2020 4.647; status unchanged | yes, and all five frequencies were confirmed in `references/*/text.md`. mao2022 10 kHz (l.329), renaud2023 1 MHz (l.213, 274), arabjuneghani2022 100 kHz (l.267), boynton2020 50 kHz (l.475, 529), yang2022 5 MHz (l.477, 482). No unit test (G7). renaud2023 has no `drive_locator` (G10). |
| 029-3: mao2022 `gap_fig1f` | yes, with locator | CLI sweep | yes: 6.0 um 2.7661 (fail vs 1.9), 4.84 um 2.2232 V cm |
| 029-4: renaud2023 `sidewall` | yes, with locator | CLI sweep | yes: 0.6134 / 0.6219 / 0.6297 / 0.6373 V. Nominal `sidewall_deg` is still 90. |
| 029-5: arabjuneghani2022 `offset_D` and `device_a` | yes, with locators | CLI sweeps | yes. offset_D Vpi 10.415 / 9.780 / 8.043 / 6.771 V (1 pass, 3 fail). device_a 2.3314 V cm, pass vs 2.2. |
| 029-6: boynton2020 4.88 target `comparable: false` | yes, with reason; LN from library, r33 31 kept | CLI run | yes: the 4.88 target is `not_evaluated`, the 6.67 target fails (VpiL 4.9463) |
| 029-7: yang2022 LN eps from the library | yes | runs | yes. The same `library:` line also adds r13/r22, which is undocumented (G4). |

### F4 timing and accuracy (electrostatics only, median of 3, 09:08 PDT)

| Case | P1 scale 1 | P2 factor 1 | P2 default (factor 2) | P1 scale 2 |
|---|---|---|---|---|
| mao2022 C' (pF/m) / nodes / ms | 187.0522 / 55,500 / 384 | 186.6324 / 55,500 / 1524 | 186.7045 / 19,478 / 415 | 187.3224 / 19,478 / 134 |
| renaud2023 | 233.3537 / 32,768 / 186 | 232.7871 / 32,768 / 617 | 232.8576 / 15,750 / 250 | 233.6556 / 15,750 / 96 |

- Difference from P2 at factor 1: P2 default +3.86e-4 (mao2022) and +3.03e-4 (renaud2023); P1 at scale 1 +2.25e-3
  and +2.43e-3.
- That makes P2 default 5.8x and 8.0x closer than P1 at scale 1. DevLog-026 says "6-8x".

### F2 spot check (K4 variant: `metal_in_window: lossy`, vector, gold [-95, 10], push-pull)

| Mesh scale | Pol. | n_eff | metal-absent reference | Loss (dB/cm) | VpiL (V cm) | Metal power fraction |
|---|---|---|---|---|---|---|
| 2 | TM | 1.860373 | 1.860372 | 0.0116 | 5.8335 | -9.1e-9 |
| 2 | TE | 1.894166 | 1.894166 | 0.0104 | 2.2684 | -8.5e-9 |
| 1 | TM | 1.860375 | 1.860375 | 0.0220 | 5.8462 | -2.1e-8 |
| 1 | TE | 1.894167 | 1.894167 | 0.0137 | 2.2739 | -1.3e-8 |

- The dielectric mode is returned for TM. The plasmons are not.
- At scale 2 the result reproduces DevLog-026 exactly (1.860373, 0.0116 dB/cm).
- `mode_select: {by: confinement, region: ln_slab}` returns the same mode.
- With `max_metal_power_fraction: 1e-12` the run still passes, because the fraction is negative (G6).

### Config physical inputs vs HEAD (round-5 configs: mao2022, renaud2023, arabjuneghani2022, boynton2020, yang2022)

Method: I resolved each config with the engine's `parseConfig` on HEAD and on the final text, then diffed materials,
geometry, optics and line.

- **mao2022:** no undocumented change. The round-5 window expression `min(2.9, gap/2 - 0.1)` gives 2.9 at 6.0 um. Arm
  windows resolve to [-2.9, 2.9], the same as before.
- **arabjuneghani2022:** no undocumented change. The window `min(2.0, G/2 - D - 0.1)` gives 2.0 at D = 2.6. HEAD's
  substrate rect bottom of -252 was already clipped by HEAD's domain bottom of -250, so there is no effective change.
- **renaud2023:** no undocumented change. The round-5 changes are the study, limitations and drive frequencies.
- **boynton2020:** n_o/n_e 2.211 / 2.138 were replaced by library dispersion (Zelmon), eps 43/28 by 44/27.9, and
  r13/r22/r51 placeholders by library values with r33 31 kept. This is documented (029-6 and provenance).
- **yang2022:** `r_pm_per_v.r13` was absent and is now 8.6; `r22` was absent and is now 3.4. **This is not
  documented** (G4). The eps change from 38/28 to 44/27.9 is documented.

The other 35 configs have not changed since 08:14 PDT (round 4), which the final engine audit covered.

## yang2022 attribution (vector VpiL 2.63362 in round 4 -> 2.60501 in round 5, -1.086 %)

Method: I reconstructed the round-4 material block from the current config by removing `library:` and restoring
`eps_r: {perp: 38.0, par: 28.0}`, with r13 and r22 absent. Each change was then applied alone, with `p2MeshFactor` 1
(the round-4 mesh) and 2 (the round-5 default). Both endpoints reproduce DevLog-026 to all printed digits.

| Variant (vector) | factor 1 | factor 2 |
|---|---|---|
| Round-4 materials (eps 38/28, r13 = r22 = 0) | **2.63362** | 2.63201 |
| + library eps 44/27.9 only | 2.62721 | 2.62561 |
| + library r13 8.6, r22 3.4 only | 2.61299 | 2.61139 |
| + library dispersion only (eps 38/28, r13 = r22 = 0 overridden) | 2.63362 | 2.63201 |
| eps + dispersion, r13 = r22 = 0 | 2.62721 | 2.62561 |
| Round-5 config as is | 2.60661 | **2.60501** |

| Cause | Change in VpiL | Share of -1.086 % |
|---|---|---|
| r13/r22 added by the library merge (undocumented) | -0.783 % | 72 % |
| LN eps 38/28 -> 44/27.9 (documented; DevLog-029 estimated -0.3 % from a scalar run) | -0.243 % | 22 % |
| P2 electrostatic mesh factor 1 -> 2 | -0.061 % | 6 % |
| Library dispersion | 0 | 0 |

- The contributions add: their sum is -1.087 % against a total of -1.086 %.
- n_eff (1.932354) and ng (2.2539) do not change in any variant.
- **Scalar cross-check** (2.59435 -> 2.58418, -0.39 %): eps accounts for -0.34 % and the mesh for -0.06 %. r13/r22
  have no effect, as expected. The scalar TE overlap uses only d eps_xx = f(r33) for x-cut, while the vector overlap
  also picks up r13 through the vertical (crystal x) E component. This explains why only the vector number moved by
  more than DevLog-029's -0.3 % estimate.

## Findings

### G1 (blocking: gate) `npm run check` fails (3 errors), not 0/0

- **Evidence.** `src/lib/sim/DerivedValues.svelte:44` has 3 errors of the form "'r.electrostatics' is possibly 'null'".
  `engine/src/run.d.mts:15` (modified 08:53, round 5 F10 `modeOnly`) now types `electrostatics` as `{...} | null`.
  `DerivedValues.svelte` was last modified at 08:15.
- **Runtime impact.** None today: the app never issues a `modeOnly` run, and the smoke run passes once its own issues
  (G2) are fixed. But the gate is red.
- **Fix.** Guard the nodes line in `DerivedValues.svelte` with `{#if r.electrostatics}`, or narrow the type in the
  worker result.

### G2 (blocking: gate) `npm run smoke` crashes before the first check

- **Cause 1.** Round 5 pinned `solver: scalar` in `engine/tests/fixtures/parallel-plates.yaml:20`.
  `app/scripts/smoke.mjs:22` still builds `vectorText` by inserting `solver: vector` after `optics:`. The result has a
  duplicate key, so the parse throws "Map keys must be unique at line 21". The run reaches 0 PASS and exits 1.
- **Cause 2.** With cause 1 patched in a scratch copy, smoke reaches 13 PASS and then times out at `smoke.mjs:340`. It
  waits for the scalar error text "metal optical modes are unsupported" on chen2022 + Optical mode. With vector as the
  default, the app (correctly) shows the vector message "conductor intersects the optical window ... choose metal
  policy 'absent', 'pec' or 'lossy'". This is the same message the CLI gives.
- **With both edits in a scratch copy, smoke passes 27/27.** The app behaviour is therefore fine, and the defect is in
  the test script.
- **Fix.** In `smoke.mjs:22`, replace the `solver: scalar` line instead of inserting a new one. In `smoke.mjs:340`,
  match the vector message, or both messages.

### G3 (major) W3 is fixed in the engine helper but not in the UI path

- **Evidence.** `app/src/lib/sim/yamlEdit.ts` (last modified 08:14) is what `workbench.svelte.ts` imports for
  `setIn`, `deleteIn` and `applyOverrides`. It still inserts new keys and deletes through `doc.setIn` / `doc.deleteIn`
  and `doc.toString(PRINT)`. It imports only `parseYamlDocument`, `splitPath` and `PRINT` from
  `engine/src/yaml-edit.mjs`.
- **Measured** by running the app module through `node --experimental-strip-types`:

  | Edit (app path) | Lines added or changed | Delete restores the text |
  |---|---|---|
  | chen2022 `geometry.mesh.element_order: 1` | 15 (`4.1e7` kept) | no |
  | renaud2023 `optics.solver: vector` | 17 | no |

- The engine `setIn` on the same edits changes 1 line, and its delete restores the original byte for byte (verified).
- The UI behaviour reported in W3 is therefore unchanged.
- **Fix.** Delegate the app's `setIn`/`deleteIn` to the engine `setIn`/`deleteIn`, which take a dotted path. Add an app
  test that pins 1 changed line on chen2022.

### G4 (major) yang2022: undocumented physical-input change (r13/r22 from the library), which is 72 % of the vector VpiL drop

- **Evidence.** With `library: lithium_niobate_congruent` and `r_pm_per_v: {r33: 30.9, r51: 32.6}`, the one-level merge
  adds r13 8.6 and r22 3.4. In round 4 both were absent (0).
- **What the config says.** The config comment says "r13/r22 from the engine library". The provenance
  `materials.lithium_niobate.r_pm_per_v` still says "r13 and r22 not given there and left out (see missing)". DevLog-026
  029-7 lists only the eps change.
- **Effect.** -0.78 % on vector VpiL; no effect on scalar.
- **Fix.** Record the change in DevLog-026 (029-7) and correct the r_pm_per_v provenance note to cite the library for
  r13/r22. Alternatively, if the paper-only tensor is intended, override them with 0 and record that.

### G5 (minor) Bench P2 cases are not pinned on the new mesh factor; an explicit factor case needs a code change

- **Evidence.**
  - `bench.mjs` `pinOverrides` and `runOpts` pin element order, solver, vector order, group index and meshScale, but not
    `p2_mesh_factor` / `p2MeshFactor`.
  - The `*-p2` case ids therefore changed meaning silently: P2 at scale 1 in round 3, P2 at factor 2 now
    (mao2022-es-p2 1622 -> 422 ms).
  - The new baseline stores the `p2MeshFactor` leaf (2), so a future change of the default shows as a leaf difference.
  - `CASES` is a hard-coded array, so adding a case requires a code change. There is no config-only path.
- **Fix.** Add `p2:` to the case pins, passed as the run option `p2MeshFactor`. Add a `mao2022-es-p2-f1` case for the
  previous setting.

### G6 (minor) The lossy guard's metal power fraction is a signed Poynting fraction; the cap cannot catch a plasmon

- **Evidence.** On K4, `lossy.metalPowerFraction` is -9.1e-9 (scale 2) and -2.1e-8 (scale 1), not "~1e-8" as reported.
  `max_metal_power_fraction: 1e-12` does not trip.
- **Why it matters.** In an SPP the Poynting flux inside the metal is negative (backward), so a Poynting-based metal
  fraction can stay small or negative for a plasmon.
- **What protects the run today.** Two things: the shift anchor on the metal-absent mode, and the SPP-index proximity
  test.
- **Test coverage.** End-to-end plasmon rejection through a run is not tested. Only `lossyModeGuard` is tested with
  hand-written inputs.
- **Fix.**
  - Use |S_z| or the electric-energy fraction in conductors for the cap.
  - Add a run-level test that forces the shift above n_spp and expects the error.

### G7 (minor) Round-5 behaviours with no test

- `target.lowFrequencyRange` (029-2).
- The `vector_mode_power_near_window_edge_above_1e-2` label, and `windowMarginPowerFraction` presence (F7).
- The 4-doubling retry finding a higher family index (F7).
- `mode_select: {by: confinement}` end to end.

### G8 (minor) Stale documentation remnants

- `sims/SPEC.md:421` says "`vector` is an input error until the DevLog-025 solver is integrated".
- `sims/SPEC.md:426` (Round 2 additions) says "default scalar", with no "superseded" mark.
- All 40 `sims/*/config.yaml` still list the limitation `scalar_optical_not_full_vector`, although the default is now
  vector.

### G9 (note) Nested delete leaves an invalid empty parent

Engine `deleteIn(setIn(mao2022, 'optics.mode_select.by', 'te_fraction'), 'optics.mode_select.by')` leaves
`mode_select: {}`. Parsing then fails with "optics.mode_select.by: expected one of te_fraction, confinement". This is not
reachable from the UI today, because `mode_select` is not a form field.

### G10 (note) renaud2023 drive frequency has no locator field

The 11 targets carry `drive_frequency_hz: 1000000` without `drive_locator`. The locator ("Methods p.5") is only in
limitation text. The other four configs carry `drive_locator`. The frequency itself is confirmed in the paper text.

### G11 (note) Vendor datasheet values not independently verified

The Crystal Technology DC-12 8/99 sheet is not in `references/` or any local cache, so the 85 / 28.7 and
10 / 7 / 33 / 33 entries were not checked against the page. They are labelled `secondary_vendor`, and `library:` does
not apply them.

### G12 (note) Lossy-metal loss is mesh-sensitive at this level

K4 TM loss is 0.0220 dB/cm at scale 1 and 0.0116 dB/cm at scale 2; TE is 0.0137 and 0.0104. n_eff is stable to 2e-6.
The DevLog quotes the scale-2 value without a scale.

### G13 (note) Memory

Peak RSS was 1.39 GB for the reference tests with K5/K7 and 1.03 GB for the full suite, both under the 1.5 GB guideline.

## Bench (write task A)

- **Command.** `nice -n 10 node --max-old-space-size=1536 bench/bench.mjs --write-baseline ../logs/bench-baseline-20261015T0915.json`
  (5 repeats).
- **Baseline location.** The script takes `--write-baseline FILE` and defines no default location. The round-1 baseline
  lived in a scratchpad. I chose `logs/`, which is gitignored and local.
- **Log.** `logs/bench-20261015T0915.jsonl`. 13 cases, no errors, all deterministic over the repeats.
- **P2 case.** Not added (needs a code change, G5). The existing `*-p2` cases now run at the default factor 2: the
  baseline leaves show `p2MeshFactor` 2 and `electrostaticMeshScale` 2.

| Case | Median wall (ms) | ES factor (ms) | nnz(L) |
|---|---|---|---|
| mao2022-es-p1 | 381.8 | 94.3 | 1,794,543 |
| mao2022-es-p2 (factor 2) | 422.3 | 161.0 | 3,023,070 |
| mao2022-opt-scalar-p1 | 378.8 | 92.8 | 1,794,543 |
| mao2022-opt-vector-p2 (factor 2) | 775.1 | 162.6 | 3,023,070 |
| arabjuneghani2022-es-p1 | 217.2 | 56.1 | 1,129,627 |
| arabjuneghani2022-opt-scalar-p1 | 279.0 | 57.0 | 1,129,627 |
| chen2022-unloaded-es-p1 | 278.0 | 60.1 | 1,342,121 |
| chen2022-unloaded-es-p2 (factor 2) | 404.4 | 148.4 | 3,306,516 |
| lin2025-es-p1 | 321.1 | 77.5 | 1,758,848 |
| lin2025-opt-scalar-p1 | 427.4 | 79.5 | 1,758,848 |
| gsg-eo-rf-p1-scalar | 150.3 | 0.1 | 2,203 |
| mao2022-wheeler-p1 | 972.3 | 83.2 | 1,794,543 |
| renaud2023-eo-vector-p2 (factor 2) | 1200.7 | 71.4 | 1,750,644 |

Against L-PERF round 3 (08:42 PDT, P2 at factor 1):

| Case | Round 3 (ms) | Now (ms) |
|---|---|---|
| mao2022-es-p2 | 1622 | 422 |
| mao2022-opt-vector-p2 | 2057 | 775 |
| chen2022-unloaded-es-p2 | 1107 | 404 |
| renaud2023-eo-vector-p2 | 1748 | 1201 |

The P1 rows are within run-to-run spread.
