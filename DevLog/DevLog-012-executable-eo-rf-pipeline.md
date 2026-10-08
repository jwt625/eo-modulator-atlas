---
title: Executable EO and RF pipeline continuation
date: 2026-10-02
status: ready_for_review
owner: claude-continuation-2026-10-07 (engine subagent; taken over from codex-main 2026-10-07)
tasks: [E2i.2, E3i, U3]
---

# DevLog-012: executable EO/RF pipeline

The previous turn completed a narrow integration tranche while the EO and RF
modules remained disconnected. The user requested continuing through available
work. Checked origin: HEAD and origin/main remain `73f8439`. Existing uncommitted
DevLog-011 work is preserved. Released implementation paths are claimed in
`coordination/claims/codex-main.md`; the paused data lane is not overwritten.

2026-10-07: codex-main claimed E2i.2/E3i on 2026-10-02 with no progress; the
coordinator claim `coordination/claims/claude-continuation-2026-10-07.md` (E1)
took the tranche over and assigned it to an engine subagent. Write paths: `engine/`,
`app/src/routes/sim/` and the sim UI pieces it uses, `sims/SPEC.md` (addenda +
changelog), `engine/README.md`, this DevLog. No `data/` or `sims/<paper_id>/config.yaml`
edits (proposed config changes are listed at the end). No git, no network.

## Sequential work

1. E2i.2: validate explicit arm windows, terminal voltage and Vpi conventions;
   solve each requested arm and expose overlap/length metrics. Gate targets on
   matching conventions. Fix the audited crystal-frame rotation sense.
2. E3i: validate explicit loss declarations and sweep inputs; connect region
   energy participation and RF propagation; evaluate frequency-specific targets
   without presenting paper attenuation inputs as independent predictions.
3. U3: expose stage selection and diagnostics in CLI/browser; verify shared
   results and both deployment paths.
4. Continue into the next physics tranche after those gates pass, based on the
   available inputs. Record true limitations separately from unfinished wiring.

## Plan (written 2026-10-07 21:45, before implementation)

Baseline before any edit (2026-10-07 21:40): `cd engine && npm test` = 104 tests,
102 pass, 0 fail, 2 todo (audit D3 rotation sense, D5 vertical-wall scalar error).
CLI on all 39 `sims/*/config.yaml`, electrostatics and `--optical`, snapshotted in
the session scratchpad (not in the repo) for a before/after regression.

### Item 1 (E2i.2) contract

New optional block `optics.eo` (validated whenever present; required only when the
`eo_overlap` stage is requested):

```yaml
optics:
  eo:
    arm_drive: two_arm_field_resolved   # single_arm | two_arm_field_resolved
    terminal_drive: single_ended        # single_ended | differential (label only; V_t = full terminal difference)
    arm_windows:
      A: {x_um: [.., ..], y_um: [.., ..]}
      B: {x_um: [.., ..], y_um: [.., ..]}   # required for two_arm_field_resolved, rejected for single_arm
```

- Arm windows are explicit (never inferred from `optical_window`), must lie in the
  top-level domain, must not overlap each other, and at run time must lie inside the
  solved (possibly mirror-cropped) electrostatic domain of the selected section.
- `terminal_drive` must agree with `line.differential` when both are present.
- Each arm: own optical model on its window (same `optics` polarization, mode index,
  metal policy), converged mode required, field sampled from the one electrostatic
  solve, `eoOverlapFromEngine`, then `combineArms`.
- Length: `line.length_mm` (electrode length per arm, data convention (q)); validated
  finite positive when present. `vpi_dc_v` only when it is present.
- Metrics: `vpi_l_dc_vcm`, `vpi_dc_v`. Signed per-arm `dn_eff/V`, phase per V per m,
  balance, gain, margins, metal, convergence, per-region power fractions go to
  `result.eo` (signed values cannot enter `metrics`, which must be positive).
- Engine Vpi convention (DevLog-007 P10, Q2 F9): `single_arm` matches target
  `vpi_convention` `per_arm_phase_shifter` or `mzm_single_arm`; two arms with opposite
  signs (`pushPullBalance < 0`) and `single_ended` match `mzm_push_pull`, with
  `differential` match `mzm_differential` (V_pi relative to V+ - V-); same-sign arms
  and `mzm_series_push_pull` match nothing.
- Target gating: a `vpi_l_dc_vcm`/`vpi_dc_v` target needs a target-level
  `vpi_convention` (data-schema enum) that the engine result matches, else
  `not_evaluated` with the reason; `source.comparable: false` (already used by 7
  configs) makes any target `not_evaluated`. No silent factor-of-2 conversion.
- Rotation fix (Q2 F6, DevLog-007 P9 option b): `labFromCrystal` implements the
  documented CCW rotation of the LAB frame about the propagation axis
  (`x' = c x + s y`, `y' = -s x + c y`). No config sets `rotation_deg`; the E2 tests
  that encoded the old sense are re-derived; audit D3 un-todoed. Crystal keys
  (`cut`, `propagation`, `rotation_deg`) and `r_pm_per_v` keys validated (unknown keys
  were silently ignored).

Gates: GSG vertical-plate homogeneous x-cut crystal (uniform field V_t/gap in both
gaps): per-arm `dn = -n_e^4 r33 E / (2 n_eff)` exact for uniform material, push-pull
balance -1, VpiL = lambda n_eff gap / (2 n_e^4 r33), single arm doubles it,
differential weights identical, `vpi_dc_v = VpiL / L`, rotation 180 deg flips the
sign of dn and leaves VpiL unchanged; target gating and every validation error.

### Item 2 (E3i) contract

```yaml
materials:
  lithium_niobate: {..., tan_delta_rf: 0.004}   # finite >= 0; absent = unknown (no longer 0)
  silicon: {eps_r: 11.7, sigma_Sm: 10}          # dielectric conduction loss, scalar eps_r only, excludes tan_delta_rf
line:
  conductor_loss_model: skin_effect_geometry_factor  # none | rprime_reference | skin_effect_geometry_factor
                                                     # | skin_effect_perimeter | skin_effect_wheeler | from_paper_alpha
  dielectric_loss_model: tan_delta_regions           # none | tan_delta_regions (required unless from_paper_alpha)
  include_internal_inductance: false                 # required by rprime_reference and skin_effect_*
  r_pul_ref_ohm_per_m: ..  r_pul_ref_ghz: ..          # rprime_reference
  conductor_k_per_m: ..                              # skin_effect_geometry_factor
  perimeters_cover_carrying_surfaces: false          # skin_effect_perimeter
  rf_loss_table: [{f_ghz: .., alpha_db_per_cm: ..}]  # from_paper_alpha (table or law, not both)
  rf_loss_law: {alpha0_db_per_cm_per_sqrt_ghz: ..}
sweep: {f_start_ghz: .., f_stop_ghz: .., n_points: ..}
```

- Parse time: types/enums of present fields; unknown `line`/`sweep` keys rejected.
  Stage time: completeness (no default loss anywhere). Conductivity = the common
  `sigma_Sm` of the electrode materials (mixed values rejected). Skin-depth validity
  uses the minimum electrode bounding-box dimension as thickness (labelled).
- Region participation: `es.regionEnergyFraction` x per-material loss; every region
  material of the section needs a loss entry (decided during implementation: simpler
  and checkable before the solve; the zero-fraction exemption was dropped).
- `skin_effect_wheeler` needs recessed-geometry solves: explicit unsupported error in
  item 2; implementation is the item 4 candidate.
- Paper attenuation (`from_paper_alpha`) and `rprime_reference` are configured inputs:
  `rf_loss_db_per_cm`, `n_rf@f`, `z0_ohm@f` targets are `not_evaluated` for them.
  `rf_loss_db_per_cm@f` also needs a skin-effect conductor model (a declared-lossless
  conductor is not a loss prediction). `z0_ohm@f` compares Re(Z0).
- Frequency targets are evaluated exactly at `at_ghz` (no sweep interpolation), only on
  the configured section with `line.loading.type: none`. `eo_rolloff_db`, `bw*`,
  RF Vpi remain `not_evaluated` (EO response stage not implemented).
- Result `rf`: loss source/labels/warnings, per-region participation and loss, sweep
  arrays (frequency-domain line values, not field arrays) and per-target-frequency values.

Gates: closed-form complex gamma (polar-form root, independent of `complex.mjs`) for
GSG plates with uniform tan delta, analytic geometry factor `K = 1/h`, two-layer
parallel participation `p_i = eps_i h_i / sum`, paper table reproduced but excluded,
sweep validation, every missing-declaration error, target gating.

### Item 3 (U3) contract

- `runCrossSection(text, {stages, optical, section, meshScale})`: `stages` subset of the
  implemented `electrostatics, optical_mode, eo_overlap, rf_line` (electrostatics always
  runs); unimplemented `loaded_line`/`eo_response` error; legacy `optical: true` adds
  `optical_mode`. Default unchanged (electrostatics only).
- `inspectConfig` adds `stageErrors` (per stage: null or the blocking input error).
- CLI `--stages a,b`, `--check` (readiness JSON, no solve). Browser: one checkbox per
  stage, blocked stages disabled with the reason, EO and RF result panels (sweep plot).
- Smoke: synthetic analytic EO/RF fixture in the browser vs Node, readiness of a paper
  config, root and `BASE_PATH` builds.

### Item 4 plan (added 2026-10-07 22:03, after items 1-3 passed)

Wheeler incremental-inductance conductor model (`skin_effect_wheeler`, declared by 32
of 39 configs): R' = omega (L'_recessed - L'_nominal), every current-carrying electrode
face recessed by delta/2 (faces on the domain boundary or mirror plane are not
surfaces and stay), L' = 1/(c^2 C0') from extra electrostatic solves, recess scales
0.25/0.5/1 of delta/2 for the DevLog-008 step check (spread reported, warning above
1e-2), scale 1 is the value. R' scales with R_s (sqrt f) from one reference frequency:
the highest sweep or RF target frequency (smallest skin depth). Gate: on the G-S-G
fixture the recessed gap faces give exactly R' = R_s / h, equal to the geometry
factor model. Not chosen: EO response (needs its own contract for source/load,
reference frequency and sign; next tranche).

### S1-S27 decisions (W2 section 5, engine owner)

| ID | Decision in this tranche |
|---|---|
| S2 | adopted in part: `optics.eo` arm drive/terminal drive/arm windows; target-level `vpi_convention` with the data enum; no silent conversion |
| S7 | adopted: per-material `tan_delta_rf` (absent = unknown), dielectric `sigma_Sm` conduction loss |
| S9 | adopted in part: `source.comparable: false` honoured by the runner; inline source unchanged |
| S11 | adopted: `line.rf_loss_law` (input only, never a prediction) |
| S17 | adopted in part: `rotation_deg` sense fixed and documented, crystal/Pockels keys validated; Miller/Euler orientation open |
| S23 | adopted in part: `n_rf`, `z0_ohm`, `rf_loss_db_per_cm` with `at_ghz`; `vpi_rf_v`, confinement `region`, bandwidth reference open |
| S16 | unchanged: placeholders stay `unknown`; configs mark dependent targets `comparable: false` (now honoured) |
| S3, S5, S6, S8, S10, S13, S14, S18, S19, S22, S24, S25 | open, outside these steps |
| S27 | config follow-ups: proposals listed at the end of this DevLog |

## TODO

- [x] Item 1 E2i.2: rotation fix and tests; `optics.eo` validation; runner stage; target gating; schema/SPEC/README
- [x] Item 2 E3i: material/line/sweep validation; RF stage wiring; frequency targets; schema/SPEC/README
- [x] Item 3 U3: stage selection in runner/CLI/worker/UI; readiness; smoke for both base paths
- [x] Item 4: Wheeler recessed-geometry conductor model
- [x] Regression of all configs against the scratch baseline; engine tests, app tests, svelte-check, builds, smoke
- [x] Independent Q2 audit (not by this author): `DevLog/audits/e2i2-e3i-u3-q2-claude-audit-2026-10-07.md`; corrections in "Q2 corrections" below
- [ ] Config owners: adopt the proposed config changes below (not done here; data lane)
- [ ] Next tranche: `eo_response` (traveling-wave S21_EO, bandwidth/roll-off targets), then `loaded_line`

## Progress

- Claimed the released engine and simulation UI paths. No canonical paper data
  or paper simulation inputs are modified. No independent acceptance claimed.
- 2026-10-07 21:45 Plan above written; baseline recorded.
- 2026-10-07 21:56 Item 1 done. `materials.labFromCrystal` now applies the documented
  CCW lab-frame rotation (`[c, s; -s, c]` on the rows); E2 tests at 90 deg (plus a new
  -90 deg sign check) and 30 deg re-derived by hand for the new sense; audit D3
  un-todoed (assertion unchanged). `EO_CONVENTIONS.id` -> `eo-atlas.eo-overlap/v2`.
  `config.mjs`: `optics.eo` (`eoOptions`), crystal/Pockels key validation, target
  `vpi_convention`, `source.comparable`, strict `optics` keys. `stages.mjs` `runEoStage`:
  per-arm optical model on its window, converged mode, `eoOverlapFromEngine`,
  `combineArms`, `vpi_dc_v` from `line.length_mm`, `compatibleVpiConventions`.
  `run.mjs` `compareTargets` gates Vpi targets on convention, honours `comparable: false`.
- 2026-10-07 21:56 Item 2 done. `resolveMaterial.tanDelta` absent -> null (was 0);
  dielectric `sigma_Sm`; `lineFields` (types, model/field consistency, strict keys),
  `sweepFrequencies`, stage-time `rfOptions` (no default loss; common electrode
  sigma; thickness = min electrode bbox dimension); `runRfStage` (E1 energy fractions
  -> `createRfLine`, sweep, exact-frequency target values); frequency targets per the
  plan. Analytic fixture `engine/tests/fixtures/gsg-eo-rf.yaml` (illustrative
  constants, closed forms in its header, computed by an independent Python script in
  the session scratchpad).
- 2026-10-07 22:00 Item 3 done. `resolveStages`, `runCrossSection({stages})` (legacy
  `optical` kept), `inspectConfig(text, section).stageErrors`, `stageErrors`; CLI
  `--stages`, `--check`; worker passes `stages`; sim page stage checkboxes with
  per-stage blocking reasons (a selected blocked stage disables Run), new
  `app/src/lib/SimStageResults.svelte` (EO arm table, conventions, RF region
  participation, sweep as three small multiples sharing the frequency axis with a log-f
  toggle, sweep/target tables). `app/scripts/smoke.mjs`: label rename, paper-config
  readiness, fixture run in the worker vs Node, blocked-stage guard.
- 2026-10-07 22:05 Item 4 done. `engine/src/recess.mjs` (inward polygon offset, kept
  domain-boundary/mirror edges, topology checks); `wheelerResistance` in `stages.mjs`
  (3 recessed air-filled solves, `wheelerStepCheck`, scale-1 value carried to all
  frequencies as `K_eff = R'/R_s`). Fixture: R' = R_s/h to 1e-9, spread 1e-13.
  Mechanics check only (in memory, placeholder constants, dielectric loss declared
  none, no config file changed, not validation): lin2025, chen2026, li2026aa step-check
  spreads 0.0044, 0.0087, 0.0074; 5.3, 6.1, 23 s per run in Node.
- 2026-10-07 22:08 Final checks (exact results):
  - `cd engine && npm test`: 126 tests, 125 pass, 0 fail, 1 todo (audit D5, scalar
    vertical-wall error, unchanged). New file `tests/eo-rf-runner.test.mjs` 22 tests.
  - Mutation checks (scratch copies, repo untouched): 13 mutants of the new code
    (convention map, independence rule, region weighting, push-pull criterion, alpha
    unit, perimeter roles, paper/dielectric exclusivity, rotation sense, Wheeler kept
    edges, recess depth, reference frequency, mirror edge) all killed; the rotation
    mutant only by the unit tests (180 deg in the runner is sense-independent).
  - Regression, 39 configs x {electrostatics, +optical} vs the pre-edit snapshot:
    0 metric differences, 0 error differences; reason texts updated; 4 target statuses
    pass -> not_evaluated because their configs set `source.comparable: false`
    (liu2021 ng_opt, wang2024a n_rf x2 runs, zhang2022 ng_opt). zhang2024 (added
    concurrently by another agent) parses and runs.
  - `cd app && npm test`: 35 passed (4 files). `npm run check`: 0 errors, 0 warnings.
  - `BASE_PATH=/eo-atlas npm run build` + `npm run smoke`: pass (17 steps);
    `npm run build` + `npm run smoke` at `/`: pass; root build restored last.
  - Screenshots (session scratchpad only) inspected: RF sweep panel at 1440 and 390 px
    wide, no horizontal overflow; fixed a missing space before the sigma label.

## Results of the tranche

| Item | Gate | Result |
|---|---|---|
| E2i.2 | per-arm dn vs `-n_e^4 r33 E/(2 n_eff)` (uniform field) | 1e-9 |
| E2i.2 | push-pull balance / gain | -1 / 2 within 1e-6 |
| E2i.2 | VpiL vs closed form with box n_eff | 0.527374 vs 0.527380 V cm (1.1e-5, FEM n_eff) |
| E2i.2 | single arm = 2x, differential weights identical, 180 deg flips dn | 1e-6, 1e-9, 1e-9 |
| E3i | alpha, n_rf, Re Z0 vs polar-form closed gamma (9 sweep points) | 1e-9 |
| E3i | two-layer participation 0.75/0.25, G' weighting | 1e-9 |
| E3i | conduction-loss tan delta, rprime sqrt f, perimeter K | 1e-9 |
| E3i | paper table reproduced, excluded, no extrapolation | exact / reason / error |
| Item 4 | Wheeler R' = R_s/h on the fixture | 1e-9, step spread 1e-13 |

## Decisions and behaviour changes

- `tan_delta_rf` absent now means unknown (null), not 0 (DevLog-008 proposal 1).
- `rotation_deg` sense flipped to the documented one (Q2 F6 option b). No config uses it.
- Unknown keys in `optics`, `optics.eo`, `line`, `sweep`, `crystal`, `r_pm_per_v` are
  errors (all 39 current configs still parse exactly as before).
- `source.comparable: false` is honoured (4 statuses changed, see regression).
- Vpi targets need a target-level `vpi_convention`; without it they stay `not_evaluated`.
- `z0_ohm@f` compares Re(Z0); `rf_loss_db_per_cm@f` needs a skin-effect conductor model;
  `from_paper_alpha` and `rprime_reference` lines never evaluate frequency targets.
- Wheeler reference frequency = highest sweep/RF-target frequency (numerical choice).

## Limitations

True physical/model limitations (not fixable by wiring):

- Scalar optical forms (exact only at horizontal interfaces; audit D5 open, error
  unquantified for ribs), first-order Pockels, neglected shear terms, field sampled
  across meshes with O(h) error near interfaces.
- DC Vpi only: no RF velocity mismatch, loss or reflections in Vpi.
- Quasi-TEM line: frequency-independent C' and L', no dispersion, radiation or
  surface waves; perturbative loss with scalar tan delta per region; skin-effect
  surface impedance only (no roughness, thin-film or proximity beyond what the recessed
  solves capture); R' scaled as sqrt f from one reference frequency is invalid where
  thickness < 3 delta (flagged per frequency).
- Wheeler R' is a small difference of large numbers on remeshed geometry; the step
  spread (0.4-0.9 percent on three CPW geometries) is the reported numerical
  uncertainty proxy, not a convergence proof.

Unfinished wiring:

- `loaded_line` and `eo_response` not implemented (bandwidth, roll-off, RF Vpi stay
  `not_evaluated`).
- Field-resolved arm B on the discarded side of a mirror-symmetric solve is an error
  (no mirror mapping of the field).
- Arm windows are not drawn in the geometry preview; one mode index for both arms.
- `optical_confinement_in_region` (needs a `region` key, S23) not computed.
- No paper config can run `eo_overlap` or `rf_line` until the config changes below.

## Proposed config changes (not applied; for the data/config owners)

1. Two-arm GSG configs whose comments state "push-pull arms by geometry" (for example
   arabjuneghani2022, boynton2020, cai2025, chen2022, chen2023, chen2026, he2019,
   kharel2021, li2022b, li2026aa, li2026ba, lin2025, lin2026a, liu2021): add
   `optics.eo: {arm_drive: two_arm_field_resolved, terminal_drive: single_ended,
   arm_windows: {A: <current optical_window>, B: <window on the left rib>}}`, B taken
   from the left rib polygon already in each geometry (for example chen2022
   x [-114.8, -106.8] um as used in DevLog-007; li2026ba rib at x = -118 um; lin2026a
   left rib at x = -65.5 um).
2. Single-arm configs (churaev2023, deng2026): `arm_drive: single_arm` with arm A only.
   gao2024 has one waveguide in each gap of a single pass; its drive needs the config
   owner's reading before choosing.
3. Every Vpi target: add `vpi_convention` copied from the cited `devices.csv` row (for
   example churaev2023 `per_arm_phase_shifter`; he2019 `mzm_push_pull` per its
   limitation note). Rows with `unspecified` stay unevaluated by design.
4. RF loss: `dielectric_loss_model` and per-material `tan_delta_rf` only where a source
   states them (kharel2021 states the LN tan delta 0.004 used in its own simulation,
   p.4; quartz only an upper bound). Where none is stated, an explicit
   `dielectric_loss_model: none` is a modelling assumption that makes the loss a
   conductor-only value; record it in `limitations` if adopted.
5. Skin-effect configs: explicit `include_internal_inductance` (true or false is a
   modelling choice; state it in provenance).
6. renaud2023: `rf_loss_law: {alpha0_db_per_cm_per_sqrt_ghz: 1.35}` with provenance
   p.3 (currently `from_paper_alpha` with no input). meng2023: `from_paper_alpha`
   without any reported loss figure; change to a model or `none`.
7. `sweep` ranges below about 3 skin depths of the electrode thickness will carry the
   thin-film warning at the low end; no change needed, noted for readers.

## For the independent Q2 audit

- Rotation-sense fix: `labFromCrystal`, the re-derived 90/-90/30 deg tests, D3.
- `compatibleVpiConventions`: mapping to the data enum, the `pushPullBalance < 0`
  criterion (no tolerance), `mzm_differential` = V_pi relative to V+ - V-.
- EO stage: arm reuse of the optical-stage mode, window checks against the cropped
  domain, length convention (per arm), no factor applied for differential drive.
- RF stage: independence rules, Re(Z0) choice, exact-frequency evaluation, thickness
  from the minimum electrode bounding-box dimension, all-region loss requirement,
  equivalence of the perimeter roles with DevLog-008.
- Wheeler: recess algorithm (kept edges, re-entrant corners, edges outside the domain),
  reference-frequency choice, sqrt-f carry via `K_eff`, internal inductance with
  Wheeler, the 1e-2 spread warning.
- Strict key rejection and the `comparable: false` behaviour change.
- UI: blocked-stage handling, sweep chart (three small multiples, one measure per axis).

## Q2 corrections (2026-10-07 22:37)

Audit `DevLog/audits/e2i2-e3i-u3-q2-claude-audit-2026-10-07.md` (0 blocking, N1, C1-C2, M1-M8), applied by an engine
subagent on the coordinator's decisions. Write paths: `engine/`, `app/src/routes/sim/`, `app/src/lib/SimStageResults.svelte`,
`app/scripts/smoke.mjs`, `sims/SPEC.md`, `engine/README.md`, this DevLog. No `data/` or `sims/<paper_id>/config.yaml` edits.

| ID | Disposition | Change |
|---|---|---|
| N1 | applied | Every `optics.eo.arm_windows` entry that meets the solved domain is an electrostatic refinement source with the `optical_window` rule (`section.mjs` `refineWindows`, `config.mjs` `crossSectionOf`), whenever `optics.eo` is declared (stage-independent C'). Gate `Q2 N1 symmetric push-pull gate` (mirror-symmetric coplanar G-S-G on a thin film, ribs in both gaps, illustrative constants): \|balance + 1\| < 2e-3 with either arm as `optical_window`; pre-fix engine 1.26e-2 (fails, verified on a pre-edit copy), post-fix 1.7e-5; VpiL with A or B as `optical_window` now identical (was 1.9537 / 1.9545 V cm, now 1.9655 V cm) |
| C1 | applied (wording) | Engine meaning kept (`mzm_differential` = V_pi against V+ - V-, the engine V_t); `compatibleVpiConventions` doc, SPEC and the JSON schema `vpi_convention` description cite data schema convention (q) (2026-10-07, coordinator) |
| C2 | applied | `rfOptions(raw, materials, geometry, sectionName)` errors on the loaded cut of a `periodic_t_rail` line (`loaded_cross_section`, default `geometry`) for every conductor model; readiness and run use the same call, so the messages are identical (test `Q2 C2`). Floating-conductor exclusion not attempted |
| M1 | applied (partial) | Wheeler reference frequency ignores `source.comparable: false` targets; the remaining dependence on the sweep end (0.07 % on lin2025 per the audit) is documented in SPEC as within the step-check spread |
| M2 | applied | Spread > 1e-2 keeps frequency targets evaluated and sets `target.diagnostic` (null otherwise) and `targetSummary.flagged`; UI shows "flagged" in the status cell, the diagnostic text and a Wheeler-panel note (`wheeler.spreadWarningLevel`) |
| M3 | applied | `dirichlet` outer side with `skin_effect_wheeler` or `skin_effect_perimeter`: warning `dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included` (`rf.dirichletSides`) |
| M4 | applied | Strict material keys (`conductor, eps_r, n, n_o, n_e, sigma_Sm, crystal, r_pm_per_v, tan_delta_rf, dispersion, thickness_um, n_complex`) and target keys (`metric, value, tol_abs, tol_rel, at_ghz, vpi_convention, source`; `source` open) at the solver boundary; JSON schema `additionalProperties: false` on `material` and `target` (adds `dispersion`, `thickness_um`, `n_complex`). No current config uses another key |
| M5 | applied | `PUSH_PULL_BALANCE_TOLERANCE = 0.1`: negative balance with \|balance + 1\| > 0.1 stays comparable, adds warning `push_pull_balance_deviates_from_-1_by_more_than_0.1` and `result.eo.pushPullBalanceDeviates`; UI line under the EO table (screenshot inspected, scratchpad only, deleted) |
| M6 | applied | `checkArmWindows(eo, section)` shared by `stageErrors` (selected section: full domain and mirror-cropped half) and `runCrossSection` (before any solve); `stageErrors` also constructs the cross-section, so a construction error blocks every stage in readiness |
| M7 | applied | Fixture header: `n_eff = sqrt(n_e^2 - (lambda/2W)^2 - (lambda/2H)^2) = 1.985135` |
| M8 | applied | Recessed Wheeler solves are vacuum-only (`solveElectrostatics(..., {vacuumOnly: true})`, identical C0' to the full solve, test `Q2 M8`) and keep the nominal electrode-thickness hint and refinement windows. Probe (placeholder declarations in memory, not validation): lin2025 and chen2026 R' and spread unchanged (both set `electrode_edge_um`, so the pin has no effect there), run time 5.0 -> 3.7 s and 7.7 -> 5.1 s |

Checks (exact results):

- `cd engine && npm test`: 134 tests, 133 pass, 0 fail, 1 todo (audit D5, unchanged). 8 new `Q2 ...` tests; 3 existing tests
  adjusted (chen2022 readiness now reports the C2 block on its loaded top-level cut and `dielectric_loss_model` on
  `unloaded`; the periodic-target test uses `geometry` as the unloaded cut; `targetSummary` gained `flagged`).
- Regression, 40 `sims/*/config.yaml` x {electrostatics, +optical_mode} plus readiness of every section, pre-edit engine copy
  vs edited engine (scratchpad snapshots, configs unchanged between the two runs): 80 runs, 0 metric, error, status,
  reason or warning differences; 10 readiness messages changed, all `rf_line` on the loaded top-level cut of a periodic
  config (chen2022, kharel2021, li2026ba, liu2021, liu2025b, valdez2023a, wang2022, wang2025, xue2026, zhang2024), each
  already blocked before (missing `dielectric_loss_model`), now by the C2 message. No stage flipped between ready and blocked.
- `cd app && npm test`: 35 passed (4 files); `npm run check`: 0 errors, 0 warnings.
- `BASE_PATH=/eo-atlas npm run build` + `npm run smoke`: pass (17 steps, readiness step now checks the loaded and unloaded
  cuts, EO step checks the balance warning); `npm run build` + `npm run smoke` at `/`: pass; root build restored last.
  Smoke previews bind port 0 (free port); no process was stopped.

Remaining limitations from this audit:

- Wheeler R' at a fixed frequency still depends on the reference frequency (sweep end), at the level of the step-check spread.
- The spread is an uncertainty proxy, not a convergence bound; flagged targets are still pass/fail-evaluated.
- The C2 block covers the declared loaded cut only; floating conductors in any other section are not detected (no
  survey of current configs for them was made).
- N1 gate is one synthetic geometry; arm windows in an alternate section that crops them are refined only where they
  meet the solved domain.

