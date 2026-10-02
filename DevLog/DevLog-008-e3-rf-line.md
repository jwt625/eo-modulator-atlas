---
title: EO modulator atlas - E3 uniform RF line and loss
date: 2026-10-02
status: ready_for_review
owner: claude-wave-2026-10-02
tasks: [E3]
---

# DevLog-008: E3 uniform RF transmission line (RLGC, gamma, Z0, loss)

Claim: [claude-wave-2026-10-02](../coordination/claims/claude-wave-2026-10-02.md). Plan:
[DevLog-002](DevLog-002-work-plan-and-ownership.md) section E3. Status is
`ready_for_review`; no `validation_status` is changed and no paper target is
compared or tuned. All conductivities, loss tangents and line parameters in the
tests are labelled illustrative test inputs, not material data.

## Scope

Delivered (all new files; no shared file edited):

- `engine/src/complex.mjs`: plain `{re, im}` helpers (add, sub, scale, mul, div, abs, principal sqrt, exp, cosh, sinh).
- `engine/src/rf-line.mjs`: RLGC, complex gamma, Z0, n_rf, phase velocity, attenuation (Np/m, dB/cm, dB/cm/sqrt(GHz)), conductor and dielectric loss models, paper-attenuation input, adapters from E1 results, unit conversions, Wheeler rule helper.
- `engine/tests/rf-line.test.mjs`: 20 tests with analytic gates, including real E1 section solves.

Not in scope: periodic loaded line (E4), EO response, runner/config wiring (proposals below).

## Input contract against the E1 result

What E1 exposes, read from `engine/src/electrostatics.mjs` and `run.mjs` (not modified):

| Quantity | Where | Units | Definition |
|---|---|---|---|
| C' | `solveElectrostatics(...).cPul` (`capacitance.energy`; `capacitance.charge` is the check) | F/m | C' = 2 W' / V^2, V = full terminal voltage difference (`vline` normalised to 1 V), W' of the FULL structure (x2 of the solved half for mirror symmetry) |
| C0' | `.c0Pul` | F/m | same solve with all eps_r = 1 |
| L' | `.lPul` | H/m | 1 / (c^2 C0'), exact c = 299792458 m/s |
| n_rf, Z0 | `.nRf`, `.z0` | -, Ohm | sqrt(C'/C0'), 1/(c sqrt(C' C0')) |
| energy partition | `.regionEnergyFraction` | fractions, sum 1 | per `section.regions` entry (index order), electric energy fraction, full structure |
| runner metrics | `runCrossSection(...).metrics` | pF/m, nH/m, -, Ohm | `c_pul_pf_per_m`, `c0_pul_pf_per_m`, `l_pul_nh_per_m`, `n_rf`, `z0_ohm` only |

Normalisation consequences (documented in the module header):

- Differential or single-ended drive, full or half domain (`x_mirror_odd`/`x_mirror_even`) all give the same C' (E1 tests assert this); no `line.differential` factor is applied. So Z0 = V/I with V the signal-return voltage and I the total signal current.
- R' must be supplied in that same loop normalisation (signal plus return path). For a GSG CPW the return current splits over both grounds, so R' = R'_signal + R'_ground,eff.
- Adapters: `lineParamsFromElectrostatics(es, section)` takes the full result and the `CrossSection` (needs the energy fractions); `lineParamsFromMetrics(metrics)` takes the runner output but has no region energy, so only uniform or no dielectric loss is available through it. `createRfLine({...params, conductor, dielectric})` or `{...params, paperAttenuation}` builds the model.
- The runner result does not expose `regionEnergyFraction` or `es`; the module therefore cannot yet be driven from `runCrossSection` alone for region-weighted dielectric loss (see proposals).

E1 findings relevant to loss (read-only, for the owner):

- `resolveMaterial` sets `tanDelta = cfg.tan_delta_rf ?? 0` and `normalizeConfig` neither type-checks `tan_delta_rf` nor treats absence as missing. An unknown loss tangent becomes 0 silently. rf-line does NOT read `m.tanDelta`; the caller must pass an explicit table (`dielectricFromRegions(params, tanDeltaByMaterial)` throws for any participating material not listed, so vacuum/air must be declared, for example `air: 0`).
- `sigma_Sm` is validated positive when present and otherwise `sigmaS = null`; rf-line throws if a skin-effect model has no `sigmaSm`.
- `line.conductor_loss_model`, `line.rf_loss_table` are not validated by `normalizeConfig` (only `differential` and `loading` are), so a misspelt model name is accepted silently today.
- SPEC sample writes `tan_delta_rf: 0.0` for LN and SiO2; as an example this reads like a claim of zero loss.

## Models and conventions

Conventions (fixed in the module header and tested):

- Phasor time dependence exp(+j omega t); wave exp(-gamma z); gamma = alpha + j beta with alpha >= 0; Z' = R' + j omega L'; Y' = G' + j omega C'; gamma = sqrt(Z'Y'), Z0 = sqrt(Z'/Y'), principal roots (Re >= 0). The root is evaluated by a cancellation-free algorithm so alpha stays accurate as loss -> 0.
- SI inside: F/m, H/m, Ohm/m, S/m, Np/m, rad/m, Hz. `propagationAt(line, fHz)` takes Hz; `sweepGhz(line, [GHz])`, `linspaceGhz`, and every field named `*Ghz` use GHz. omega = 2 pi f in rad/s.
- alpha is POSITIVE attenuation of the field amplitude in Np/m. `alphaDbPerCm = alpha * (20/ln 10) / 100` (1 Np/m = 0.0868589 dB/cm; field Np/m, so power attenuation is 2 alpha Np/m = 8.686 alpha dB/m). This matches the positive-drop `rf_loss_db_per_cm` of `data/schema/devices.schema.yaml`. A signed (negative dB) matched-line S21 is a separate helper, `matchedS21Db(alpha, length)`. The SPEC target sample writes `eo_rolloff_db: -1.4` (signed) whereas the data schema defines `eo_rolloff_db` as a positive drop; that conflict belongs to the E1/E4 owners and is not resolved here.
- `alphaDbPerCmPerSqrtGhz = alphaDbPerCm / sqrt(fGhz)` is returned always but is only meaningful where conductor loss dominates (alpha proportional to sqrt f).
- n_rf = c beta / omega; v_phase = omega / beta. Lossless limit: n_rf = sqrt(C'/C0') = sqrt(eps_eff), Z0 = sqrt(L'/C').

Loss models:

- Conductor, `conductor.model`:
  - `none`: lossless by declaration (explicit, never implied).
  - `rprime_reference`: user R'_ref at `fRefHz`, R'(f) = R'_ref sqrt(f / f_ref). Use when R' comes from a full-wave or measured source.
  - `surface_resistance_geometry_factor`: R'(f) = R_s(f) * `kPerM`, R_s = sqrt(pi f mu0 / sigma). `kPerM` [1/m] is the caller-supplied geometry factor K = (integral of |J_s|^2 dl) / I^2 (for a uniform strip of width w with a return of equal width, K = 2/w). This is the explicit current-distribution input.
  - `surface_resistance_perimeter`: R' = R_s (1/P_signal + 1/P_return), uniform current over the stated perimeters, no current crowding. NOT an estimate of R'. It is a lower bound only under a stated condition: by Cauchy-Schwarz, integral K^2 >= I^2/S >= I^2/P whenever the supplied perimeter P is at least the true current-carrying surface length S (for several return conductors, P_return is the sum of their perimeters). The condition fails for electrodes truncated by the domain or mirror plane, and for thin films (thickness < 3 skin depths, where the surface-impedance model itself fails). The caller must therefore declare `perimetersCoverCarryingSurfaces` (required boolean); the declaration only changes the result labels (`lossLabels`: `lower_bound_only_under_caller_declared_perimeter_coverage_not_an_estimate` versus `perimeter_coverage_not_declared_estimate_is_not_a_bound`, plus `no_current_crowding`), never R'. Even when the bound holds it can be far low: a microstrip-like E1 section (strip 2 x 0.4 um on 1 um eps_r 4 over a ground plane, illustrative sigma 1e9 S/m, 10 GHz) gives a Wheeler/perimeter ratio of 1.95 (test `F7`). `electrodePerimetersM(section)` returns polygon perimeters in metres (config frame; no mirror-plane or truncation handling).
  - `wheelerRPrime(fHz, lNominal, lRecessed)`: Wheeler incremental-inductance rule R' = omega (L'_recessed - L'_nominal), every current-carrying surface recessed by delta/2, with L' = 1/(c^2 C0') from two E1 solves. The caller builds the recessed geometry (no polygon offsetting is implemented here). Reproduces 2 R_s / w for parallel plates (tested with two E1 solves); result feeds `rprime_reference`.
  - Every skin-effect model requires `sigmaSm` and an explicit boolean `includeInternalInductance` (surface impedance Z_s = R_s (1 + j) adds L_int = R'/omega to L'). Optional `thicknessM` triggers the warning `conductor_thickness_below_3_skin_depths_surface_resistance_invalid` when thickness < 3 skin depths; when `thicknessM` is omitted every result carries the standing warning `conductor_thickness_not_checked_skin_effect_validity_unknown` (Q2 F10). The skin-effect R'(f) tends to 0 as f -> 0 (no DC resistance floor): do not use these models below the frequency where delta approaches the conductor thickness.
- Dielectric, `dielectric.model`:
  - `none`: lossless by declaration. `uniform`: one `tanDelta` with full participation (homogeneous filling or an effective value).
  - `regions` (rows validated eagerly at construction; allowed keys `name`, `energyFraction` in [0, 1], `tanDelta` or `sigmaSm`+`epsR`; a row with both `tanDelta` and `sigmaSm`, `epsR` with `tanDelta`, an unknown key or a non-finite value throws; Q2 F8): G' = omega C' sum_i p_i tan(delta_i), p_i the electric-energy fraction of region i (from E1 `regionEnergyFraction`). Derivation: P_diss = 2 omega sum_i tan(delta_i) W_i and P = G' |V|^2 / 2, W = C' |V|^2 / 4. Region entries accept `tanDelta` or `{sigmaSm, epsR}` for conduction loss (tan delta(f) = sigma / (omega eps0 eps_r)). Perturbative: the lossless field distribution is used; valid for tan delta << 1. Scalar tan delta per region (no tensor loss).
- Paper attenuation, `paperAttenuation`: `{source: 'paper_table', citation, fGhz[], alphaDbPerCm[]}` (linear interpolation in f, no extrapolation: out-of-range throws) or `{source: 'paper_law', citation, alpha0DbPerCmPerSqrtGhz}`. Non-empty `citation` is required. Mutually exclusive with `conductor`/`dielectric` (throws, avoids double counting). It is represented as an equivalent series R'(f) with G' = 0 chosen so that gamma reproduces the input alpha exactly for the given L', C' (R' = 2 alpha beta / (omega C'), beta = sqrt(alpha^2 + omega^2 L' C')); Z0 and beta are then complex-consistent. Results carry `lossSource: 'paper_input'` and `independentPrediction: false`; model results carry `'model'` and `true`. The equivalent-resistance attribution is a representation choice, not a physical split of conductor versus dielectric loss.
- `lowLossComponentsNpPerM`: R'/(2 Z0) and G' Z0/2 with the lossless Z0; an approximate split that does not sum to the exact alpha.
- Missing inputs: no `conductor`, `dielectric`, `sigmaSm`, `kPerM`, perimeters, `includeInternalInductance`, `tanDelta`, region loss, or `citation` ever default; each throws a descriptive error. Explicit `{model: 'none'}` is the only way to declare lossless.

## Limitations

- No current crowding or proximity effect: a single 2D electrostatic section gives no current distribution. Accuracy of the skin-effect models rests on the supplied `kPerM`, `rPulRef` or Wheeler R'; the perimeter model is a conditional lower bound only (see above). Edge crowding on thin electrodes can make true R' larger by a factor of order 2 or more (not quantified here).
- Surface roughness, finite-thickness (thin-film) resistance and kinetic effects are not modelled; thickness is only a warning flag, and a missing thickness is itself flagged.
- No substrate conductivity default and no substrate-loss prediction. Resistive substrates (for example silicon with unknown resistivity, called out as missing in the Chen and Lin configs) can be included only by an explicit `{sigmaSm, epsR}` region input, and only as a first-order perturbation (sigma/(omega eps) << 1). Slow-wave/Maxwell-Wagner regimes where the quasi-static field is changed by the conductivity are not representable.
- Frequency-independent C' and L' (quasi-TEM): no dielectric dispersion, no radiation or surface-wave loss, no higher-order-mode or dispersion in n_rf, no pad/launch effects (carried from the E1 warnings `quasi_static_2d_rf`, `finite_domain_boundary`).
- Scalar loss tangent per region; anisotropic loss tensors (LN tan delta differs by axis) are not represented.
- Periodic/loaded lines are not handled here; a section result from a periodic device is a unit-cell input for E4 and its n_rf/Z0 is not the device value (E1 `compareTargets` already excludes it).
- Unvalidated physics beyond analytic gates: nothing here reproduces a paper loss figure.

## Exact commands and outcomes

All from the repository checkout on 2026-10-02:

- `cd engine && node --test tests/rf-line.test.mjs`: initial delivery 20 tests, 20 pass; after the Q2 corrections 25 tests, 25 pass, 0 fail.
- `cd engine && npm test` after the Q2 corrections: 100 tests, 98 pass, 0 fail, 2 todo at the last run (95/90/0/5 earlier, before another agent fixed some E2 findings concurrently). The remaining todo are audit D-tests for E2 findings, not E3. At the initial delivery the run was 40/40 with the E2 test files not yet present.
- `uv run pytest -q` (repository root): 28 passed, 5 warnings (PyMuPDF/SWIG deprecation, pre-existing).
- Not run: `app` tests/check (no app file touched).

Test coverage map (analytic gates):

| Gate | Test |
|---|---|
| Z0 = sqrt(L/C), v = 1/sqrt(LC), n_rf = sqrt(eps_eff), alpha = 0 | lossless TEM limit |
| C' = eps0 eps_r w/d, L' = mu0 d/w, Z0 = (d/w) eta0/sqrt(eps_r) | parallel-plate analytic RLGC |
| gamma^2 = Z'Y', closed-form alpha, beta, Z0 gamma = Z' | exact lossy line |
| alpha >= 0, Re Z0 > 0, beta > 0 on a loss x frequency grid (1e5..1e12 Hz) | passivity |
| alpha = R/Z0 exactly (R/L = G/C) | Heaviside distortionless line |
| alpha = R/(2 Z0) + G Z0/2 versus exact; error ratio < 0.02 per decade of loss, < 1e-7 at s = 1e-4 | convergence as loss -> 0 |
| alpha = (pi f/v) tan delta; exact (omega/v) sqrt((sqrt(1+t^2)-1)/2); linear in f | homogeneous dielectric loss |
| delta, R_s = 1/(sigma delta), R'(4f) = 2 R'(f), alpha/sqrt(f) constant | skin-effect sqrt(f) scaling |
| dB/cm <-> Np/m round trips, 20 log10(e), GHz <-> Hz, S21 sign | unit conversions |
| exact alpha reproduction, interpolation, no extrapolation, labelling, exclusivity | paper attenuation as input |
| every missing input throws | error cases |
| real E1 plates: C', C0', L', Z0, n_rf, loss | E1 parallel plates (fixture geometry) |
| real E1 two-slab plates: p_A = 0.2 energy participation, G' weighting, series C' | E1 two-slab |
| `runCrossSection` on `parallel-plates.yaml` fixture through the metrics adapter | runner adapter |
| geometry-factor R' = 2 R_s/w; perimeter estimate below it | E1 plates conductor loss |
| Wheeler rule from two E1 solves reproduces 2 R_s/w to 2e-5 | Wheeler |
| perimeter coverage declaration, labels; microstrip E1 section ratio 1.95 | F7 tests |
| eager region validation, ambiguity errors | F8 test |
| omitted thickness warning | F10 test |
| Wheeler step check, linear in recess scale | F12 test |

## Wheeler two-solve convergence guidance (Q2 F12)

R' = omega (L'_recessed - L'_nominal) subtracts two inductances that differ by about delta/gap, so it is a small difference of large numbers. Practice:

- Use identical mesh hints (absolute `max_edge_um`, `electrode_edge_um`, `electrode_face_um`) and identical topology for the nominal and recessed geometry; do not let a recessed solve re-grade the mesh.
- Run recess scales 0.25, 0.5 and 1 times delta/2 and call `wheelerStepCheck(fHz, lNominal, [{scale, lPul}, ...])`: R'_s = omega (L'_s - L'_nominal) / scale must be scale independent. A spread above about 1e-2 means the recess is too large (non-linear, geometry changes) or too small (mesh noise dominates); the scale 1 entry is the Wheeler value. On the plates fixture the spread is below 5e-3 and the scale 1 value matches 2 R_s/w to 2e-5 (test `F12`).
- Repeat at two `meshScale` values; the R' change under mesh refinement is the discretisation uncertainty, to be quoted with the value.
- The recess must be smaller than the thinnest conductor dimension, and delta must be small compared with the gap and conductor thickness; otherwise the surface-impedance model itself is invalid.
- Recessing means shrinking every current-carrying surface into the metal and filling the vacated space with the adjacent medium (air or dielectric); only gap-facing surfaces matter for plates, all surfaces for a strip.

## Open interface issue: `eo_rolloff_db` sign (Q2 F11)

Conflicting references, none edited here:

- `sims/SPEC.md` line 81 (target sample) writes `eo_rolloff_db` with `value: -1.4`; `sims/chen2022/config.yaml` lines 111-112 (-1.4, -0.76), `sims/kharel2021/config.yaml` line 93 (-1.8) and `sims/liu2021/config.yaml` line 101 (-1.3) follow it (negative = S21-like response relative to the reference).
- `data/schema/devices.schema.yaml` line 12 (comment (g)) and line 103 define `eo_rolloff_db` as a positive number, the drop in dB (positive = drop); line 12 itself notes the sim-target sign is a separate convention.
- `engine/src/run.mjs` `compareTargets` compares the raw numbers with no sign handling, so a positive drop from the database and a negative target in a config would fail by sign alone.
- RF-line side: `alphaDbPerCm` and `rf_loss_db_per_cm` are positive attenuation (consistent with the schema and the Chen RF-loss target 2.947); the signed quantity is `matchedS21Db` (negative).

Recommendation (for the E1/E4 interface owner): keep `rf_loss_db_per_cm` positive. Define `eo_rolloff_db` in sim targets as the schema's positive drop (change the sim target values to positive, or rename the signed S21 metric `eo_s21_rel_db`) so the config and the catalogue agree; E4 should then report a positive drop and use one explicit sign helper. A shared target schema should state the sign per metric.

## Q2 audit disposition

Audit: `DevLog/audits/e2-e3-claude-wave-2026-10-02-q2.md` (verdict accept after corrections; no error found in the RLGC, gamma, Z0, loss or dB cores; the author gates killed 22 of 22 rf-line/complex mutants). Findings relevant to E3:

| Finding | Disposition | Detail | Test outcome |
|---|---|---|---|
| F7 perimeter model labelled lower bound unconditionally | applied | Docs and label state the Cauchy-Schwarz condition; required boolean `perimetersCoverCarryingSurfaces`; machine-readable `lossLabels` (`no_current_crowding`, conditional-bound or not-a-bound label); 1.95 microstrip ratio recorded | `F7` x2 pass (25/25 file) |
| F8 region row with both `tanDelta` and `sigmaSm`; lazy validation | applied | Ambiguity throws; eager and complete row validation (types, ranges, unknown keys, `epsR` with `tanDelta`, fraction <= 1, adapter entry type) | `F8` pass |
| F10 thickness check silent when `thicknessM` omitted | applied (warning variant) | Standing warning `conductor_thickness_not_checked_skin_effect_validity_unknown`; DC-floor limitation documented (no code floor) | `F10` pass |
| F12 Wheeler small difference of large numbers | applied (doc + helper) | Guidance section above; `wheelerStepCheck` helper | `F12` pass |
| F11 `eo_rolloff_db` sign conflict | open proposal | Recorded above with exact references and recommendation; SPEC/schema untouched | none (no code) |
| F9 V_pi convention mapping | not E3 | E2/SPEC tranche | n/a |
| F1-F6 | E2/E1 scope | Not touched (other agent) | audit todo D1-D5 remain todo |
| Verified-clean E3 items 6-11 | no action | Independent derivations agree | n/a |

Not done: a code-level DC floor for R'(f); polygon offsetting for a runner-built Wheeler recess (still a proposal).

## Proposed shared-interface changes (not applied; owner: codex-main / E1 contract)

1. Material fields (`config.mjs`, `materials.mjs`, schema, SPEC):
   - `materials.<name>.tan_delta_rf`: finite number >= 0 when present; absent means unknown. Change `resolveMaterial` to `tanDelta: cfg.tan_delta_rf ?? null` and let the RF-line stage throw for a participating region with `null`. Update the SPEC sample so zeros are not written as defaults.
   - `materials.<name>.sigma_Sm` allowed for non-conductor (resistive substrate) materials as a conduction-loss input, requires scalar `eps_r`; absent means unknown.
2. Line fields (`line.*`; validate keys, today unvalidated): `conductor_loss_model` enum `none | rprime_reference | skin_effect_geometry_factor | skin_effect_perimeter | skin_effect_wheeler | from_paper_alpha`, with `r_pul_ref_ohm_per_m` and `r_pul_ref_ghz` (rprime_reference), `conductor_k_per_m` (geometry factor), `include_internal_inductance` (boolean, required for the skin-effect models), `perimeters_cover_carrying_surfaces` (boolean, required for `skin_effect_perimeter`; labels the result, see Q2 F7), `conductor_thickness_um` (optional). `skin_effect_wheeler` requires runner-built recessed geometry (polygon offset of every conductor surface by delta/2), which does not exist yet; until then it should error as unsupported rather than silently map to another model.
3. Paper input: keep `line.rf_loss_table` as `[{f_ghz, alpha_db_per_cm}]` and add `line.rf_loss_law: {alpha0_db_per_cm_per_sqrt_ghz}` (item 11 of the Chen pilot SPEC proposals); both require `provenance` locators (mapped to `citation`), and `from_paper_alpha` without either is an error. Metrics produced this way must be flagged non-independent and excluded from target comparison, mirroring the fixed-group-index rule in `compareTargets`.
4. Runner wiring (`run.mjs`): when `chain` includes `rf_line`, call `lineParamsFromElectrostatics(es, section)` and `createRfLine`, evaluate `sweep` (`f_start_ghz`, `f_stop_ghz`, `n_points`) with `sweepGhz`, add `metrics.rf_loss_db_per_cm` evaluated per target `at_ghz`, and add result fields `rf: {frequenciesGhz, alphaDbPerCm, nRf, z0}` plus `lossSource`. Expose `regionEnergyFraction` with region and material names in the runner result (or run the adapter inside `run.mjs`). `compareTargets` currently excludes every `at_ghz` target; per-target frequency evaluation is a coordinated change. The `rf_line` stage name already exists in `STAGES`.
5. SPEC text for the RF-line stage: conventions as above (exp(+j omega t), positive attenuation, Np/m field amplitude, V = full terminal voltage and R' in the same loop normalisation, quasi-TEM L' = 1/(c^2 C0')), the approximation labels `no_current_crowding`, `perimeter_uniform_current_lower_bound`, `scalar_tan_delta_energy_participation`, `paper_loss_is_input`, and "unknown loss is not zero".
6. Sign convention: decide `eo_rolloff_db` positive drop (data schema) versus negative S21 sample (SPEC), and state that `rf_loss_db_per_cm` is a positive attenuation.

## Files released to E4

`engine/src/rf-line.mjs` and `engine/src/complex.mjs` are stable for E4 to import; E4 owns nothing in them. Suggested E4 use: `createRfLine`/`propagationAt` per cell for gamma and Z0, then unit-cell ABCD from `cmul`, `cdiv`, `ccosh`, `csinh` (A = D = cosh(gamma l), B = Z0 sinh(gamma l), C = sinh(gamma l)/Z0). Requests for new behaviour go through this DevLog or the claim file. `engine/tests/rf-line.test.mjs` stays with the E3 claim.

## TODO

- [x] Input contract documented and adapters written without touching E1 modules.
- [x] RLGC, gamma, Z0, n_rf, loss models, paper-input labelling, unit conversions.
- [x] Analytic tests, including two real E1 section solves.
- [x] Handoff and interface proposals.
- [ ] Independent review (Q2); runner/config wiring after the proposals are decided.
