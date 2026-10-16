---
title: Final fresh-context audit of the S7/S8 tranches - T1 round 5, T4 rounds 3-4, T7 round 2, regenerated atlas.json
date: 2026-10-16 (started 02:21 PDT, written 02:42 PDT)
auditor: fresh-context Claude subagent (did not write any of the audited code)
scope: DevLog-035 (plan, progress log); DevLog-036 "Round 5"; DevLog-039 "Round 3 plan/progress", "Round 4"; DevLog-042 "Round 2"; audits simulator-s7-round3-4 (R34-1..R34-9), simulator-s8-round2 (R1-R11), simulator-s8-ui (F1-F14); engine/src (stages, rf-line, eo-response, run, semi-stage, semi/*, section, mesh-entry), engine/tests (s7-*, semi-*, reference-cases), app/src/lib/sim (semi.ts, labels.ts, SemiResults, LinePlot, Plot1D, workbench), sims/*, app/static/data/atlas.json
status: complete
---

# S7/S8 final audit, 2026-10-16

Report only. The only repo file written is this report; `git status --short` was identical before and after the audit
(apart from this file). No git command that changes state was run. All runs were sequential under `nice -n 10` with Node
`--max-old-space-size=1536`, one heavy task at a time, one headless Chrome per browser script (preview on a random free
port, `--port 0`), nothing left running. Scratch: session scratchpad `finalaudit/`, which holds the scripts (`gdc.mjs`,
`s8node.mjs`, `rchecks.mjs`, `r8.mjs`, `r1.mjs`, `d11.mjs`, `regress.mjs`, `cmp.py`, `browser.mjs`, `browser2.mjs`),
their JSON outputs and timestamped logs. One screenshot (Physics > Semiconductor) was inspected and deleted. `npm run
build` / `smoke` regenerated the git-ignored `app/build/` and `app/static/sims/`. No source file changed during the audit
(no lane was running).

## Verdict

- All claimed gates reproduce exactly, including the counts.
- Every R34-*, R1-R11 and F1-F14 item marked fixed passes one concrete check. The audit also re-derived some items
  independently:
  - the junction-G' DC normalization against an own closed form;
  - dn_bias against delta_n(V) - delta_n(V0), in the browser and in Node;
  - G' against a bias-grid dI/dV;
  - the gate budgets from the T4 study data.
- S7 regression: 42 configs, 134 shared targets, 0 status changes against the T1 round-3 B snapshot. The largest value
  change is 4.1e-4 relative. The only new targets come from han2023 and anjali2025, which now run.
- No medium or high finding. Five low findings (A1-A5) and five info items (A6-A10) are listed below. None changes a
  number or a verdict that is reported today.
- Hygiene is clean: no absolute paths, no local user name, no secrets, emoji or PDFs in the change set, and
  `references/_inbox/` stays ignored.

## 1. Gates

| Gate | Claim | Measured (2026-10-16) | Log (scratchpad `finalaudit/logs/`) |
|---|---|---|---|
| engine `npm test` | 321: 318 pass, 0 fail, 2 skipped, 1 todo | 321: 318 pass, 0 fail, 0 cancelled, 2 skipped, 1 todo (todo = pre-existing D5 quasi-TE/TM); 97.9 s | `engine-test-20261016T022250.log` |
| engine `npm run test:reference` | 15/15 incl. K10-K12 | 15/15 (K10 V_bi and C'(V), K10 forward 0.3 V D1, K12, K11 both plasma models); 40.1 s. Printed margins: K10 C 0.66, K12 J 0.64, K12 n/p centre 0.50/0.50, n/p mean 0.50/0.51, K11 Si-only C 0.55, oxide C 0.35, alpha 0.43, dn_eff 0.40, d alpha 0.36, VpiL 0.40 | `engine-ref-20261016T022442.log` |
| app `npm test` | 74/74 | 74/74 (7 files) | `app-test-20261016T022534.log` |
| app `npm run check` | 0/0 | 470 files, 0 errors, 0 warnings | `app-check-20261016T022536.log` |
| app `npm run build` | OK | OK (adapter-static) | `app-build-20261016T022543.log` |
| app `npm run smoke` | 49 PASS | exit 0, 49 PASS, 52.6 s. Lines "S7 ... = Node", "S8 UI round 2: dn_bias plot = Node; oxide probe says outside selection; semiconductor + EO response (junction-loaded line, bw3 16.150 GHz = Node); chain stages seeded" and "S8 UI ..." present | `app-smoke-20261016T022552.log` |
| `uv run python scripts/validate_db.py` | - | exit 0, 0 errors, 0 warnings | `validate-20261016T*.log` |
| `uv run pytest -q` | - | 30 passed, 5 warnings (swig DeprecationWarning) | `pytest-20261016T*.log` |

## 2. Verification of fixed items

### T1 round 5 (R34-*)

| Item | Check | Result |
|---|---|---|
| R34-1 | 42-config survey: `response.bandwidth.bw3db_ghz/bw6db_ghz.diagnostics`, `metricDiagnostics`, `referenceSensitivity[].diagnosticCodes`, stage warning | pass. xu2022, mao2022, zhang2022, yang2022 and boynton2020 carry `slab_model_limits` + `band_below_lateral_current_relaxation_estimate` on both DC bandwidths. Per reference entry: boynton2020 DC / 1 GHz flagged (f_lat 1.39 GHz), 3 GHz only slab; mao2022 DC flagged, 1 / 3 GHz only slab (f_lat 0.234 GHz). Warning added on 15 slab configs vs the round-3 snapshot |
| R34-2 | DevLog-036 R2-2 row text | pass: "every electrode of every run and unloaded cut"; thinner T pads of chen2022, wang2025, wang2022 and xue2026 noted |
| R34-3 | valdez2022 / valdez2023 provenance | pass: `line.conductor_loss_model` and `line.conductor_thickness_model` entries (project_inference) at lines 212-214 |
| R34-4 | grep "p. 51" in engine/src, SPEC, DevLog-036, claims | pass: junction statement cited p. 50 (rf-line.mjs:462, SPEC.md:617). The one remaining "Sec. IV p. 51" (DevLog-036:78) is the modified-capacitance eq. (12), a different statement |
| R34-5 | `EO_RESPONSE_CONVENTIONS` | pass: `normalization` names both lossless_dc and the model-DC modes; `vpiRf` refers to V_s Phi_0 / L and `result.response.vRefDefinition` |
| R34-6 | runJunctionResponseStage | pass: `thinConductorBelowGhz` = 9 / (pi mu0 sigma t^2), the same formula as run.mjs:289 (stages.mjs:619). Asserted in s7-semi-twe round 5 (green) |
| R34-7 branch | junctionPropagationAt vs Shin Fig. 2 / eqs. (1)-(5) with a G' shunt | pass: Y'_j = (G' + j w C')/(1 + R'(G' + j w C')) = 1/(R' + 1/(G' + j w C')); divider 1/(1 + R'(G' + j w C')) = the voltage across G'||C'. This matches the T4 perLength note |
| R34-7 DC normalization | own closed form (series r_0 = R'(1 Hz) of a slab_symmetric line, shunt y_0 = G/(1 + R G), ABCD from the load, Phi = int V dz, times 1/(1 + R G)) vs `normalizationOffsetDb`; 4 cases (50/50, 50/35, 50/open, 25/75; G 5-50 S/m, L 3-10 mm) | pass: offsets -3.30 / -10.62 / -5.46 / -22.19 dB, auditor = engine to <= 3.6e-15 dB; abs S21 at 1 kHz <= 5.0e-10 dB, at 100 kHz <= 5.1e-8 dB. The r_0 > 0 branch has no unit test of its own (the test covers r_0 = 0) |
| R34-7 forward rejection | rib fixture through runCrossSection, sweep [-0.3, 0, 1, 2], `operating_bias_v: -0.3` | pass: "semiconductor operating bias -0.3 V is a forward-bias point (forward 0.3 V): its C' is the quasi-static diffusion capacitance (valid only for omega tau << 1) ...". `operating_bias_v: 1.5` (not in the sweep) is rejected by the config check |
| R34-7 config keys | smoke rib fixture with `line.rf_section` + `semiconductor.operating_bias_v` | pass: stages semiconductor, rf_line, eo_response; `lineKind` junction_loaded_rf_line; bw3 16.150391645729542 GHz, bw6 34.426 GHz; G' null -> 0, `normalization: lossless_dc`; dn_eff/dV 4.0966e-5 /V from perLength |
| R34-8 (info) | run.mjs:419, :405 | unchanged (A7) |
| R34-9 (info) | SPEC | sentence added (SPEC.md:628-629) |

### T4 rounds 3-4 (R1-R11)

| Item | Check | Result |
|---|---|---|
| R1 | (a) 96 meshes of 35 parseable configs, working-tree CrossSection at farScale 1 vs `git show HEAD:engine/src/section.mjs`, build scale 1 and 2, bitwise (x, y, tri, triRegion, nodeElectrode); (b) meshScale 0.85 node counts | pass: (a) 0 differences; 21 of 48 scale-1 meshes change at farScale 2 (the test is sensitive). (b) han2023 29,035 vs HEAD 28,712 nodes, mao2022 76,439 vs 75,813, so the grading now refines below 1 |
| R2 | formula F = 1/(1 - (s3/s1)^p) with p = min over monotone rows, capped at 2, p = 1 with fewer than 3 monotone rows; recomputed from T4's `t4semi/r2/budgets-*.json` | pass: every budget in the test reproduces (K10 F 1.81 -> 1.9e-4; K12 J 1.47 -> 2.9e-4; K12 densities F 2; K11 Si-only C' p 1.78, F 2.12 -> 3.9e-3; oxide C', dn_eff, VpiL, d alpha p = 1, F 3.33 -> 3.1e-3, 4.4e-3, 4.4e-3, 5.0e-3; alpha p capped at 2, F 1.96 -> 1.0e-3). Margins as printed above, all <= 0.66. The test-file comment differs from the printed run in three margins (A6) |
| R3 | forward PN (pn1d, N 1e17, SRH 1 us, anode sweep 0.59 / 0.60 / 0.61 V): stage G'(0.6 V) vs bias-grid central dI/dV | pass: 4.1926e-3 vs 4.2707e-3 S/m (grid +1.9 %). An exponential I(V) predicts a grid excess of sinh(x)/x - 1 = 2.5 % for x = 0.01/V_t; the excess is smaller because of the series R. perLength.gSPerM = point G'. Reverse bias (han2023, all 7 points): G' null with reason, `conductance_below_residual_floor` |
| R4 / R5 | han2023 meshScale 2 | pass: push-pull null at 0 V with the reason "push-pull needs a reverse DC bias (forward bias < 0) ..."; at 3 / 5 V pp = differential/2 (1.1019 / 2.2038, 1.4093 / 2.8186 V cm). Small-signal dn_eff/dV vs grid central difference: 3.5 V 3.2857e-5 vs 3.2884e-5 (h 0.5 V, -0.08 %); 1 V 5.189e-5 vs 5.432e-5 (h 1 V); consistent with O(h^2) grid error |
| R6 | pn1d with a third (n-type) contact | pass: "the two-terminal C' definition needs exactly two contacts of opposite doping type (got 3: p, n, n) ..." |
| R7 | code | pass: `farScale` set in mesh-entry.mjs (preview), the Wheeler recessed sections (stages.mjs:37), the loaded-line cuts (:275) and the junction-response sections (:593, :604) |
| R8 | rib fixture at 1970 nm (explicit n) | pass: row 2.0 um, mismatch -0.03 um, estimate dn 2.66 % / d alpha 2.70 % vs the neighbouring 1.55 um row at 1e18 cm^-3, as in DevLog-039. The 1.31 um path could not be run (A8) |
| R9 | han2023 notes, DevLog-039 numerics, schema | partly: T1 updated the han2023 target / provenance notes; the header comment of sims/han2023 is still stale (A3) |
| R10 | han2023 points | pass: `checks.continuityRel` null at all 7 reverse biases (`currentResolved` false) |
| R11 | tests | pass: `newton({residualTol: 0})` rejection, `testHooks.tangentFail` (same C' to 1e-6 plus flag), D6 reverse null / forward resolved, R6 throw, config-key throw (semi-1d-pn.test.mjs:100-137); the G6 `err < 2e-4` escape has been removed |
| round 4 dn_bias | han2023 meshScale 2, Node store: `semi.dn_bias` at semi:6 and semi:3 vs `semi.delta_n(semi:k) - semi.delta_n(semi:0)` (and vs the reference dataset `semi`) at 5 points | pass: relative difference <= 2.5e-10 (core points <= 1e-14). `semi.dalpha_bias` likewise (<= 4.9e-10), negative under depletion. On semi:0 the value is 1e-19..2e-18, not exactly 0 (A9) |
| round 4 globals | semi.dn_eff_per_v, semi.G, semi.operating_bias at k = 0, 3, 6 | pass: equal to the stage values; G NaN (null) in reverse bias |

### T7 round 2 (F1-F14), browser (production build, han2023-a loaded from the atlas, Coarse = meshScale 2 where noted)

| Item | Check | Result |
|---|---|---|
| F1 | views; `__simProbe` on "Delta n (bias)" at 5 points vs Node delta_n(5 V) - delta_n(0 V) (independent difference, not the engine variable) | pass: views Delta n (bias), Delta alpha (bias), Delta n vs undoped, Delta alpha vs undoped; probe label `semi.dn_bias [Semiconductor]`; relative difference <= 2.8e-13 |
| F2 | VpiL(V) notices; semi.ts descriptions | pass: `pushpull_gap` note "push-pull VpiL not defined at cathode = 0 V: push-pull needs a reverse DC bias ..." (engine reason); VpiL_diff "small signal ... dn_eff/dV over +-dv/2"; VpiL_pp "null at zero or forward DC bias" |
| F3 | C'(V) legend and marker | pass: one `[data-key-muted]` legend key "paper (comparable: false)" and a muted marker |
| F4 | VpiL(V) note and Semiconductor page | pass: `config_vpi` note "config target vpi_l_dc_vcm 0.96 V cm (convention unspecified, comparable: false): no bias stated, not placed"; listed in `[data-config-vpi]` |
| F5 | yang2022-a run, EO Response notices | pass: reference info; lateral_relaxation, slab_limits, wheeler_spread and dielectric_none warn. See A10 for the effect of R34-1 on the warn/info split |
| F6 / F14 | legend tooltips | pass: Net Doping "signed range -4e20 to 4e20 1/cm^3 (\|value\| from 4.37e14)"; Electron Density "values below 4e12 1/cm^3 (45,454 sample points) are drawn at the floor colour (8-decade clamp ...)" |
| F7 | legend tooltip | pass: "electron density n (1/cm^3), log scale ..." |
| F8 | probe at (0.3, 0.11) um (oxide) | pass: `outside: true` |
| F9 | Derived Values, Surface Average of `semi.n` on the Semiconductor dataset | pass: default unit "1/cm^3" |
| F10 | Semiconductor table headers | pass: R' (Ω·mm), VpiL (V·cm); CSV keeps ASCII (`CSV_COLS`) |
| F11 | Physics > Semiconductor screenshot at 1440 px (inspected, deleted) | pass: contact labels sit above the electrodes; no overlapping labels |
| F12 | BottomPanel.svelte:13 | pass (code): blocked messages filter `wb.selected` |
| F13 | Semiconductor page | pass: columns G' (S/m) and dn_eff/dV (1/V); dn_eff/dV at 3 V browser 3.516712774409656e-5 = Node to 9e-13; null G' cell tooltip gives the residual-floor reason; operating-bias line present |
| combined run | rib fixture + RF cut + both keys, browser | pass: `junction_loaded_rf_line`; bw3 16.150391645729542 GHz, browser = Node exactly |
| chain seeding | yang2022-a, zhang2022-a, mao2022-a | pass: EO response checked on load. han2023 / anjali2025 do not seed the Semiconductor stage (A3) |
| atlas.json | regenerated file | pass: generated_on 2026-10-16; papers 233, devices 519, organizations 277 (284 listed), sims 40 -> 42 (han2023, anjali2025), 3 warnings (aimone2026, sun2026, zhou2026 country mismatch, pre-existing); han2023-a selectable in /sim |
| page errors | all browser runs | none |

## 3. S7 regression (42-config status survey)

The harness has the same logic as T1's `t1-s7/scripts/regress.mjs`: readiness, then every ready stage. The one change:
a config whose semiconductor stage is ready runs that stage alone. Current engine, sims and library. Compared with T1's
round-3 B snapshot `t1-s7/logs/r3b-regress.jsonl`, which used the pre-T3 library.

- 42 / 42 configs. Error set unchanged:
  - cai2025, churaev2023, deng2026, he2019, nelan2022, sayem2026c, vanackere2023: RF permittivity missing;
  - chen2022: metal in the optical window;
  - lin2026a: LT dispersion range;
  - meng2023: shared electrode edge.
- han2023 and anjali2025 changed from "the semiconductor stage runs alone" (a harness artifact in round 3) to a
  semiconductor run:
  - han2023: 3 targets, all not_evaluated (comparable: false);
  - anjali2025: dn_eff(5 V) 8.979e-5 fail, VpiL 4.316 V cm fail, bw3db not_evaluated (comparable: false). These are the
    values in DevLog-041.
- 134 shared targets: 0 status changes.
  - Largest value change of an evaluated target: 4.1e-4 relative (yang2022 roll-off -2.5486 -> -2.5475 dB). Next:
    mao2022 VpiL 2.6e-4, boynton2020 VpiL 1.3e-4, boynton2020 z0 1.0e-4.
  - All of these are consistent with the T3 library change, which the round-3 snapshot did not contain.
- Reason text changed only on the unstated-reference targets (boynton2020, mao2022 bw3db): the DC / 1 / 3 GHz values
  are now printed (R34-1).
- Warnings: `band_below_lateral_current_relaxation_estimate` was added on 15 slab configs (R34-1 rule). No warning was
  removed.
- Status totals: fail 21 -> 23, pass 52 -> 52, not_evaluated 61 -> 65. The +2 / +4 are exactly the 6 new Si targets.

## Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| A1 | Low | The semiconductor target `engineConvention` strings are the pre-round-3 names. They disagree with the stage's own `vpilConventions`. | semi-stage.mjs:303-304 emit `push_pull_differential_both_arms_reverse_biased` / `single_arm_differential`; :278 uses `push_pull_small_signal_both_arms_reverse_biased` / `single_arm_small_signal_central_dv`. The UI maps both names (semi.ts:216-217), so nothing visible breaks. | Emit the round-3 names in `compareSemiTargets`. Keep the UI aliases for old results. |
| A2 | Low (latent) | G' = dI/dV at the terminal already includes the series resistance of the doped path, but it is placed as the intrinsic shunt behind R'_j. The DC branch admittance becomes G'/(1 + R'G') instead of G'. | Contact current from the full DD solve (semi-stage.mjs:143-146); branch and normalization use y_0 = G/(1 + R G) (stages.mjs:427-435, rf-line.mjs:475). No effect today: reverse-bias G' is null -> 0, forward bias is rejected for the TWE. pn1d at 0.6 V forward has R'G' = 0.138 x 4.19e-3 = 5.8e-4. | De-embed G'_j = G'_t / (1 - R' G'_t), or document and flag the requirement R'G' << 1 when G' > 0. |
| A3 | Low (data) | han2023 and anjali2025 declare `chain: [optical_mode]`. The new chain seeding therefore loads them with Electrostatics + Optical mode, not the Semiconductor stage (screenshot: "Include Semiconductor in Compute" unchecked). The han2023 header comment "(runConfig does not dispatch the semiconductor stage yet)" is stale (runConfig dispatches since T4 round 2). | sims/han2023/config.yaml:8, :11; sims/anjali2025/config.yaml:8; workbench.svelte.ts `seedStages` | `chain: [semiconductor]` in both (the schema enum has it); update the comment. |
| A4 | Low (UI code) | `responseNotices` pushes `metricDiagnostics` (arrays of code strings) into the `Diag[]` list, so `d.code` is undefined for those entries. | labels.ts loop over `resp.metricDiagnostics`; the engine stores codes only (stages.mjs `metricDiagnostics: {bw3db_ghz: [...codes]}`). No visible effect: `bandwidth.*.diagnostics` carries the same codes as objects. | Add the strings to the code set directly, or drop the loop. |
| A5 | Low (doc) | engine/README.md has no mention of the semiconductor stage, and the engine/package.json description lists S7 but not S8. | `grep -ci semiconductor engine/README.md` = 0 | One README section (stage, CLI `--stages semiconductor --section`, config keys) and a description update. |
| A6 | Info | The budget-table comment in reference-cases.test.mjs prints margins that differ from the run. | Comment vs run: K12 J 0.63 vs 0.64, K11 alpha 0.44 vs 0.43, K11 d alpha 0.40 vs 0.36. The budgets themselves reproduce. | Refresh the comment from the printed `# S8 gate margins` line. |
| A7 | Info | R34-8 is unchanged. | run.mjs:419: `pendingStages` filters only `semiconductor`, so a chain listing rf_line / eo_response would show them as pending after a combined run. run.mjs:405 accepts meshScale >= 0.3 (0.5 elsewhere). No shipped config is affected. | Filter the stages that actually ran; align or document the bound. |
| A8 | Info | O-band silicon cannot reach the optical solve, so the Nedeljkovic 1.3 um row (and the R8 1.31 um mismatch estimate) is not reachable through a run. | The library silicon Sellmeier range is 1.357-11.04 um. A material named `silicon` keeps `dispersionKey: silicon` even with an explicit `n`. The rib fixture at 1310 nm fails with "dispersion anchor wavelength 1.31 um is outside the library validity range". | A primary-source Si dispersion entry covering 1.26-1.36 um, or let an explicit `n` override the library dispersion key. Until then, list it as an S8 limitation. |
| A9 | Info | `semi.dn_bias` / `semi.dalpha_bias` on the reference dataset are 1e-19..2e-18, not exactly 0 as DevLog-039 states. | Node store probes at 5 points on semi:0. This is about 1e-15 of the core values. | Wording only ("zero to round-off"). |
| A10 | Info | After R34-1 every DC-referenced bandwidth of a slab line carries the lateral code, so `responseNotices` shows the lateral notice as a warning on every slab config. zhang2022 is now a warning, where it was info in the F5 audit split. | targetCodes includes `bandwidth.*.diagnostics` (labels.ts); survey: all 15 slab configs flagged | Consistent with the R34-1 decision. No change needed unless the user wants the target-band case distinguished in the text. |

## Commit hygiene

`git status --short` has 86 modified files and 55 untracked entries (63 files with `-uall`):

| Area | Modified | Untracked |
|---|---|---|
| engine/src | 13 (config, config.d, mesh-entry, postproc/store, rf-line, run, run.d, section, stages, ...) | eo-response.mjs, loaded-line.mjs, semi-stage.mjs, semi/ (9 files incl. run-cli.mjs) |
| engine/tests | 4 (eo-rf-runner, fields-solver-options, library-citations, reference-cases) | s7-* (5), semi-* (4 tests, semi-cases.mjs, semi-fixtures.mjs) |
| engine other | README.md, package.json, data/materials.json, schema/sim.schema.json | - |
| app | scripts/smoke.mjs, 27 src/lib/sim + SimStageResults + routes/sim, static/data/atlas.json (4.37 MB single-line JSON, regenerated 2026-10-16) | BiasSelect.svelte, SemiResults.svelte, semi.ts, semi.test.ts, semiOverlay.ts |
| sims | 36 config.yaml + SPEC.md | anjali2025/config.yaml, han2023/config.yaml |
| validation | pyproject.toml (+ devsim==2.11.0), uv.lock (+13 lines) | cases K10-K12.yaml, eoref (dd1d, plasma, semi, semi_devsim).py, reference (s7-K8, s7-K9, s7-limits, s8-K10..K12, summary-s8).json, scripts (ref_s7, ref_s8_1d, ref_s8_k11, summarize_s8).py, run_s8.sh |
| DevLog | - | DevLog-035..042, audits (7 files of 2026-10-16 plus this report) |
| coordination | claims/claude-simulator-2026-10-14.md | - |

Scans over all 149 changed and untracked files:

| Scan | Result |
|---|---|
| `/Users/`, `/home/`, `/private/tmp`, `/var/folders`, `C:\Users` | 0 hits |
| The local user name, the email address | 0 hits. The DevLog front matter carries the owner attribution line ("at ...'s request") used by the committed DevLog-000/030/034 (repo convention) |
| Keys and tokens (`api_key`, `secret`, `token`, `password`, private-key headers, `sk-`, `ghp_`, `AKIA`) | false positives only: the `secretstorage` package in validation/uv.lock; the atlas.json text match is not a credential |
| Emoji | 0 hits |
| IP addresses, ssh/scp/rsync | one version string in uv.lock (not an IP); schema `$id` host `eo-atlas.local` (pre-existing at HEAD) |
| PDFs, logs, build output, scratch | none in the change set. `references/_inbox/*.pdf` all show as ignored (`!!`); `app/build/`, `app/static/sims/`, `logs/`, `.venv/`, `validation/.venv/` and caches are ignored; no `scratchpad/` in the repo |
| Large files | atlas.json 4.37 MB (was 4.36 MB at HEAD; 1-line diff) |

Points to note for the commit:
- The validation environment gains devsim 2.11.0. Its licence is recorded in DevLog-035 / DevLog-040: Apache-2.0, with
  bundled UMFPACK under LGPL-2.1.
- run-cli.mjs is the han2023 / anjali2025 header's run command; it exists.

## Not checked

- The DevLog-036 round-5 illustrative example (16.07 GHz on the round-4 cut). This audit used the smoke fixture
  (16.150 GHz) instead.
- A schema validation of the K10-K12 engine configs against the new `allOf` electrodes rule.
- A small-signal (j omega) forward-bias solve. TWE forward points are rejected, so it is not needed for any current
  output.
