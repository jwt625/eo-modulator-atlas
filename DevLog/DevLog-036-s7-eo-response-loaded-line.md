---
title: S7 traveling-wave EO response (eo_response) and periodic loaded line (loaded_line)
date: 2026-10-15
status: round 5 implemented (round 3-4 audit R34-1..R34-9); gates green (lane T1 S7-ENG of DevLog-035)
owner: T1 S7-ENG subagent (Claude, orchestrated at Wentao Jiang's request)
scope: engine/src (eo-response.mjs, loaded-line.mjs, stages/run/config wiring), engine/schema, engine/tests/s7-*, sims configs (line/loading/target fields only), sims/SPEC.md S7 section, app/src/lib/sim (S7 views only)
---

# DevLog-036: S7 EO response and loaded line

Lane T1 of DevLog-035. Independent references K8/K9 are built by lane T2 (DevLog-037) without reading this code; a later
audit compares. Formula notes from the harness (`transmission_line.py`, GPL) and InP-Modulator (`cltwe/eo.py`,
`cltwe/loaded_line.py`, no licence) were read for the math only; no code is copied (clean re-derivation below).

## Requirements (from the T1 brief)

1. `eo_response` on a uniform line: small-signal optical phase response of a traveling-wave phase modulator / MZM from
   the `rf_line` gamma(f), Z0(f), source and load impedance, optical group index, electrode length; normalized
   |S21_EO|(f) in dB, roll-off at target frequencies, 3 dB and 6 dB bandwidths, RF Vpi(f) = Vpi_DC / |H(f)|; targets
   `bw3db_ghz`, `bw6db_ghz`, `eo_rolloff_db` evaluated under the target rules (`comparable: false` honoured).
2. `loaded_line` (periodic T-rail): per-period exact distributed ABCD of two uniform sections (unloaded cut over the gap,
   loaded cut over the T-segment length), Bloch gamma_B, Z_B, Bragg frequency; then `eo_response` on the loaded line.
3. Postprocessing: dataset `rf` gains S21_EO(f), Bloch n and Z, per-frequency Vpi; globals bw3dB, bw6dB.
4. Configs: wire only where the inputs exist; never invent inputs; list what is missing.
5. UI: RF Line page and a default 1D plot group for |S21_EO| (dB) vs f with paper targets and Bloch quantities.

## Model and conventions (contract)

### Phasors, line, voltages

- Time dependence exp(+j omega t); RF wave exp(-gamma z), gamma = alpha + j beta, Re gamma >= 0 (rf-line.mjs).
- Thevenin source: open-circuit EMF V_s, impedance Z_s (`line.source_ohm`) at z = 0; load Z_L (`line.load_ohm`) at
  z = L; L = `line.length_mm` = electrode length per arm (data convention (q)). Line Z0(f), gamma(f) from `rf_line`
  (uniform) or the Bloch Z_B, gamma_B (periodic).
- Line voltage V(z) = V+ [exp(-gamma z) + Gamma_L exp(-2 gamma L) exp(+gamma z)],
  V+ = V_s Z0 / (Z0 + Z_s) / (1 - Gamma_s Gamma_L exp(-2 gamma L)), Gamma_{s,L} = (Z_{s,L} - Z0) / (Z_{s,L} + Z0)
  (standard terminated-line solution; equivalent to the input-impedance form V(0) = V_s Z_in / (Z_s + Z_in)).

### Optical phase integral

- A photon entering at t0 is at z at t0 + z n_g / c (group velocity: the modulation sidebands at omega_o +- Omega
  accumulate beta(omega_o +- Omega) - beta(omega_o) = +- Omega n_g / c to first order, so the walk-off uses the group
  index n_g; Alferness 1982, Sec. VI.B, eqs. (18)-(20), p. 1127, writes the same integral with the mode index N_o).
  The phase per volt is proportional to
  Phi(f) = int_0^L V(z) exp(+j beta_o z) dz, beta_o = omega n_g / c,
  = V+ [ L (1 - exp(-u)) / u + Gamma_L exp(-2 gamma L) L (exp(w) - 1) / w ], u = (gamma - j beta_o) L,
  w = (gamma + j beta_o) L (forward and reflected waves; series expansions for |u|, |w| < 1e-6).
- DC limit (f -> 0, gamma -> 0): V(z) = V_s Z_L / (Z_s + Z_L) uniform, Phi_DC = L V_s Z_L / (Z_s + Z_L).
- Normalized response H(f) = Phi(f) / Phi_DC (complex). |H| = 1 for a lossless, velocity-matched, matched line.
- Limits used as gates: matched, lossless: |H| = |sin(x) / x|, x = pi f L (n_RF - n_g) / c (Alferness 1982 eq. (20));
  matched, velocity matched, loss alpha [Np/m] on the field: |H| = (1 - exp(-alpha L)) / (alpha L) (Alferness 1982
  eq. (22); Alferness converts dB/cm with 4.3, the engine uses the field-amplitude alpha = alpha_dB / 8.686 of
  rf-line.mjs and data convention (cc), because the phase is linear in the voltage amplitude).

### Decibel and bandwidth convention

- S21_EO [dB] = 20 log10 |H(f) / H(f_ref)| ("electrical" dB: a photodetected LCA/VNA S21 is proportional to |m|^2 in
  power, i.e. 20 log10 of the modulation amplitude). Default reference: the DC limit of the model (f_ref = 0, H = 1);
  per target `reference_ghz` (devices.csv `bw3db_reference` / `bw3db_reference_freq_ghz`) replaces it.
- `bw3db_ghz`: lowest frequency where S21_EO falls to -3 dB (|H| = 0.708; Alferness 1982 p. 1127: "the frequency for
  which the drive power must be doubled to maintain the modulation depth"). `bw6db_ghz`: -6 dB (|H| = 0.501; Alferness
  eq. (21) defines the bandwidth at 50 % of the integrated phase, i.e. this one). Search: from the reference (or the
  sweep start) upward on the `sweep` grid, first grid point at or below the threshold, then bisection on the analytic
  response inside that interval; no crossing up to the sweep end -> the bandwidth is only bounded (> f_stop).
- `eo_rolloff_db` (at_ghz): signed S21_EO at that frequency (negative = drop), the sign convention of the existing sim
  targets (SPEC sample, DevLog-008 F11); data convention (g) stores the positive drop and is not converted here.
- RF Vpi(f) = Vpi_DC / |H(f)|: the amplitude of V_ref = V_s Z_L / (Z_s + Z_L), the voltage the same source puts across
  the load at DC (for Z_L = Z_s, the incident-wave voltage V_s / 2 on the Z_s reference line). Vpi_DC is the eo_overlap
  value at `line.length_mm` (field-resolved push-pull, its own vpi convention).

### Loaded line (periodic T-rail)

- Period p = `line.loading.period_um`, loaded length l_L = `loaded_length_um`, unloaded length l_U = p - l_L. Cuts:
  loaded = `loaded_cross_section` (null = `geometry`), unloaded = `unloaded_cross_section`; both solved by the 2D
  electrostatics (the run section's solution is reused).
- Per-length parameters (Shin, Sakamoto, Dagli, JLT 29, 48 (2011), Sec. II, p. 48-50: the T-rails load the line
  capacitively, the inductance stays the unloaded value, eqs. (4)-(5); the conductor loss is that of the uniform line
  with the modified capacitance, eq. (12), valid for T-rail widths below about 3 um, Sec. IV p. 51):
  - unloaded section: C'_U, L'_U = 1 / (c^2 C0'_U), R'_U(f) (conductor model on the unloaded cut), G'_U = omega C'_U
    sum p_i tan d_i (unloaded-cut energy fractions);
  - loaded section: C'_L from the loaded cut; G'_L from the loaded-cut energy fractions; when the loaded cut has
    loading conductors (electrodes absent from the unloaded cut by name, i.e. the T segments) L'_L = L'_U and
    R'_L = R'_U (Shin et al.); when it has none (same electrode set reshaped, e.g. valdez protrusions) the loaded
    section uses its own L'_L = 1 / (c^2 C0'_L) and its own conductor model.
- Cell ABCD: symmetric [U(l_U/2)] [L(l_L)] [U(l_U/2)], each uniform section exact distributed: A = D = cosh(gamma l),
  B = Z sinh(gamma l), C = sinh(gamma l) / Z. cosh(gamma_B p) = (A + D) / 2, gamma_B = acosh((A + D)/2) / p with the
  principal branch (Re >= 0, Im in [0, pi] in the first passband), Z_B = sqrt(B / C) (Re >= 0; reference plane at the
  middle of the unloaded section). n_B = c Im(gamma_B) / omega, alpha_B = Re(gamma_B).
- Bragg frequency: lowest f of the lossless cell with beta_B p = pi ((A + D)/2 = -1), scan + bisection (or the maximum
  of acos((A+D)/2) when the cell has no gap, e.g. zero loading). Response and Bloch values at or above it are NaN.
- Quasi-static limits (f -> 0, lossless): n_B0 = c sqrt(L'_avg C'_avg), Z_B0 = sqrt(L'_avg / C'_avg),
  X'_avg = (X'_U l_U + X'_L l_L) / p; these are the periodic-line values of the static `n_rf`, `z0_ohm` targets.
- `eo_response` on the loaded line treats gamma_B, Z_B as an effective uniform line over L (cell-averaged voltage);
  N = L / p need not be an integer.
- Limitations (labels): 2D cuts only; no 3D fringing of the T segments or stems; floating pads are given electrode
  potentials by the config weights; stem inductance and T-rail resistance neglected (Shin et al. condition); the EO
  overlap is that of the run section applied over the whole length; the intra-cell standing pattern is averaged.

### Target rules

- Response targets (`eo_rolloff_db`, `bw3db_ghz`, `bw6db_ghz`) are evaluated when `eo_response` ran on the configured
  section (`geometry`), the topology is explicit (`none` -> uniform response; `periodic_t_rail` -> loaded line), the RF
  loss is an independent model (not `from_paper_alpha`, not `rprime_reference`, conductor model not `none`), the
  group index is computed (not `fixed`), and `comparable` is not false. Bandwidth without a crossing: not evaluated
  with the bound in the reason, or `fail` when the sweep end exceeds value + tolerance (decidable).
- Periodic static targets `n_rf`, `z0_ohm` use the loaded-line quasi-static limits; periodic `at_ghz` RF targets use
  the lossy Bloch values (independent loss model required).

### Config contract (additions)

- Stages `loaded_line`, `eo_response` implemented. Requesting `eo_response` adds `optical_mode` and `rf_line`
  (uniform) or `loaded_line` (periodic) to the run. `eo_response` requires `line.length_mm`, `line.source_ohm`,
  `line.load_ohm`, `sweep` and a complete loss declaration; `loaded_line` requires `periodic_t_rail` with both cuts
  (its loss part runs only with a complete loss declaration; otherwise only the lossless Bloch quantities).
- Target key `reference_ghz` (response metrics only): normalization frequency of the paper's response.

## Gates

- [x] Closed-form tests (`engine/tests/s7-eo-response.test.mjs`, 9 tests): lossless velocity-matched matched ->
      |S21| < 1e-9 dB from 0.1 to 300 GHz; pure mismatch |H| = |sin x / x| to 1e-12 (and the zero at x = pi); pure
      loss (1 - e^-aL)/(aL) to 1e-12; open, short and two mismatched terminations vs an independent Simpson quadrature of
      V(z) from the load-end ABCD (relative 1e-9); open-load velocity-matched closed form to 1e-12; kernel series switch;
      low-frequency limit of a lossy mismatched line -> 0 dB; first-crossing bisection vs an independent root of
      |sin x / x| = 10^(-3/20) (relative 1e-6).
- [x] Bloch tests (`engine/tests/s7-loaded-line.test.mjs`, 7 tests): zero loading -> gamma_B = gamma, Z_B = Z0 (1e-9,
      lossy) and Bragg = c/(2 p n) without a gap; half trace = explicit ABCD product, A = D, AD - BC = 1,
      cosh(gamma_B p) = (A+D)/2, Z_B^2 = B/C; long-wavelength limit c sqrt(L_avg C_avg), sqrt(L_avg/C_avg) to 1e-9;
      small-loading perturbation n_U (1 + eps l_L/(2p)) within 5 eps^2; Bragg band edge (A+D)/2 = -1 and stopband
      (Re gamma_B > 0, beta_B p = pi) above it; lumped-load limit (short high-C section -> half line / shunt C_T / half
      line, error decreasing to < 1e-6); complex asinh.
- [x] Stage tests (`engine/tests/s7-stages.test.mjs`, 5 tests): dependency stages added; response sweep and RF Vpi equal
      the closed form rebuilt from the rf_line sweep (1e-9); target rules (configured n_g, comparable false,
      reference_ghz, decidable bandwidth bound, unspecified topology); readiness errors for missing load / sweep;
      periodic synthetic line with exact 1D fields: per-length C', L' and quasi-static n_B0, Z_B0 equal the closed forms
      (1e-9), static periodic targets use them, lossless-only without a loss declaration; loaded-line response equals an
      independent Bloch-cell + response evaluation from closed-form sections (1e-6 dB).
- [x] Harness Chen replay (formula check): 0.36 dB/cm/sqrt(GHz) at 67 GHz (alpha L = 0.33925 Np), n_RF 2.18, n_g 2.2,
      10 mm, matched -> -1.4601 dB (expected -1.46).
- [x] 40-config regression vs the pre-edit snapshot (below): no pre-existing metric changed (relative 1e-12); new bw
      metrics and status changes from the new stages only.
- [x] Paper comparison table (below).
- [x] engine `npm test` (sequential): 274 tests, 271 pass, 0 fail, 2 skipped, 1 todo (D5, pre-existing);
      `npm run test:reference` 11/11; app `npm test` 63/63, `npm run check` 0 errors 0 warnings (465 files),
      `npm run build` OK, `npm run smoke` exit 0, 47 PASS (new S7 step: browser = Node for the 6 dB bandwidth and the
      chen2022 quasi-static Bloch index; screenshots of the EO Response and Loaded Line plot groups reviewed).

## Regression (40 configs, readiness + every ready stage; pre = HEAD snapshot, post = this tranche)

Both runs in the session scratchpad with the pre-edit `engine/data/materials.json`, so the T3 library change (LN
eps_perp 44.0 -> 44.3) is not part of the comparison (no library-caused differences to list). Errors unchanged
(cai2025, churaev2023, deng2026, he2019, nelan2022, sayem2026c, vanackere2023: RF permittivity missing; chen2022: metal
in the optical window (reject policy); lin2026a: LT dispersion range; meng2023: shared electrode edge). No metric of
the pre-run changed. Status changes (all from not_evaluated):

| Config | Target | Paper | Engine | New status |
|---|---|---|---|---|
| arabjuneghani2022 | eo_rolloff_db @100 | -2.0 +-0.5 | -1.16 dB | fail |
| boynton2020 | bw3db_ghz | 30.55 +-15 % | 27.13 GHz | pass |
| mao2022 | bw3db_ghz | 60 +-15 % | 52.76 GHz | pass |
| yang2022 | eo_rolloff_db @110 (ref 0.01 GHz) | -2.5 +-1.0 | -2.66 dB | pass |
| zhang2022 | bw3db_ghz (ref 1 GHz) | 170 +-15 % | 65.75 GHz | fail |
| zhang2022 | bw6db_ghz (ref 1 GHz) | 295 +-15 % | 287.5 GHz | pass |
| kharel2021 | n_rf / z0_ohm (static) | 2.23 / 42 | 2.206 / 44.22 | pass / pass |
| li2026ba | n_rf / z0_ohm | 2.24 / 42 | 2.192 / 44.28 | pass / pass |
| liu2021 | n_rf | 2.3 | 2.205 | pass |
| liu2025b | n_rf / z0_ohm | 2.22 / 47 | 2.486 / 49.73 | fail / fail |
| valdez2022 | z0_ohm | 42 | 40.70 | pass |
| valdez2023 | z0_ohm | 40 | 39.51 | pass |
| valdez2023a | n_rf | 2.24 | 2.049 | fail |
| wang2022 | n_rf (two targets) / z0_ohm | 2.6, 2.5 / 50.3 | 2.327 / 60.75 | fail / fail |
| wang2025 | z0_ohm | 50 | 56.93 | fail |
| xue2026 | n_rf | 2.26 | 2.171 | pass |
| zhang2024 | n_rf / z0_ohm | 2.26 / 46 | 2.062 / 50.05 | fail / fail |

Other changes: reasons of not-evaluated response and periodic targets name the actual blocker; the warning
`cross_section_only_not_periodic_line` is dropped when `loaded_line` ran; new metrics `bw3db_ghz` / `bw6db_ghz` where a
crossing exists (also on configs without bandwidth targets: chen2026, li2022b, lin2025, murai2025, qi2024, renaud2023,
wang2022a, xu2022, xue2023). chen2022 is not in the table (its optical stage errors first); `loaded_line` alone gives
n_B0 2.108, Z_B0 58.89 ohm vs n_rf 2.35, 2.16 and z0 50.5, 52.3 (all four fail).

## Paper bandwidth / roll-off comparison (every config with a response target)

| Config | Target | Paper | Engine | Status | Reason |
|---|---|---|---|---|---|
| arabjuneghani2022 | eo_rolloff_db @100 | -2 +-0.5 | -1.16 dB | fail | |
| arabjuneghani2022 | bw3db_ghz | 170 +-20 % | > 200 GHz | not_evaluated | no -3 dB crossing up to the 200 GHz sweep end |
| boynton2020 | bw3db_ghz | 30.55 +-15 % | 27.1 GHz | pass | |
| chen2022 | eo_rolloff_db @67 | -1.4 +-0.5 | not run | not_evaluated | eo_response blocked: no line.dielectric_loss_model |
| chen2022 | eo_rolloff_db @50 | -0.76 +-0.4 | not run | not_evaluated | same |
| deng2026 | bw3db_ghz, bw6db_ghz | 12, 28 | - | error | BaTiO3 RF permittivity missing |
| kharel2021 | eo_rolloff_db @50 (ref 1), bw3db_ghz (ref 1) | -1.8, 180 | not run | not_evaluated | comparable: false (and no dielectric loss model) |
| li2026aa | bw3db_ghz | 100 +-20 % | > 110 GHz | not_evaluated | no crossing up to the 110 GHz sweep end (undecidable: 120 > 110) |
| liu2021 | eo_rolloff_db @67 | -1.3 +-0.5 | not run | not_evaluated | comparable: false |
| mao2022 | bw3db_ghz | 60 +-15 % | 52.8 GHz | pass | |
| meng2023 | bw3db_ghz | 108 | - | error | shared electrode edge; from_paper_alpha without table or law |
| renaud2023 | bw3db_ghz (ref 3) | 35 +-15 % | 33.2 GHz | not_evaluated | paper attenuation is an input |
| valdez2023 | bw3db_ghz (ref 1) | 69 +-20 % | not run | not_evaluated | eo_response blocked: no line.dielectric_loss_model |
| wang2022a | eo_rolloff_db @67 | -5 +-1 | -3.91 dB | not_evaluated | comparable: false |
| wang2024a | bw3db_ghz (ref 0.01) | 110 +-15 % | > 110 GHz | not_evaluated | comparable: false |
| wang2025 | bw3db_ghz | 55 +-15 % | not run | not_evaluated | comparable: false |
| xu2022 | bw3db_ghz (ref 1.5) | 110 +-15 % | 8.4 GHz | not_evaluated | comparable: false |
| xue2026 | eo_rolloff_db @67 | -1.3 +-0.5 | not run | not_evaluated | eo_response blocked: no line.dielectric_loss_model |
| yang2022 | eo_rolloff_db @110 (ref 0.01) | -2.5 +-1 | -2.66 dB | pass | |
| zhang2022 | bw3db_ghz (ref 1) | 170 +-15 % | 65.7 GHz | fail | |
| zhang2022 | bw6db_ghz (ref 1) | 295 +-15 % | 287.5 GHz | pass | |
| zhang2024 | bw3db_ghz, bw6db_ghz | 145, 310 | not run | not_evaluated | eo_response blocked: no line.dielectric_loss_model |

Engine values of not-evaluated targets are shown when computed. Observations (no tuning done):

- zhang2022 bw3db 65.7 vs 170 GHz with bw6db 287.5 vs 295 GHz: the modelled response sits near -3 dB over a wide band
  (Z0 about 40 ohm vs 50 ohm terminations; modelled loss 16.6 vs 13 dB/cm at 250 GHz, that rf_loss target fails too),
  so the -3 dB crossing is very sensitive to loss and impedance.
- Long mismatched lines (lin2025 16 mm, xue2023 8 mm) drop 1-2 dB below the DC limit within the first few GHz (the
  line becomes electrically long; Z0 35-40 ohm vs 50 ohm), so their DC-referenced bw3db is low (14.5, 18 GHz).
  xu2022 (bw3db 4.9 GHz, 8.4 GHz with ref 1.5 GHz): corrected 2026-10-16 (audit S8): the dominant cause is the
  velocity mismatch of the unloaded uniform model (n_RF 1.673 vs n_g 2.167, first sinc null c/(L dn) = 25.8 GHz for
  23.5 mm), not the electrical length or Z0; the config omits the paper's capacitive loading (comparable: false).
  `low_freq_unstated` references cannot be reproduced; `reference_ghz` is set only where devices.csv states the
  frequency.
- renaud2023 (paper loss input, ref 3 GHz) 33.2 vs 35 GHz: consistency with the paper's own loss law, not a prediction.

## Config changes (target fields only)

`reference_ghz` added from devices.csv `bw3db_reference` / `bw3db_reference_freq_ghz` of the target's device row (the
column applies to all response fields of the row, data convention (t)):

| Config | Targets | reference_ghz | devices.csv |
|---|---|---|---|
| kharel2021 | eo_rolloff_db @50, bw3db_ghz | 1 | kharel2021-b `1ghz` (the bw3db note also says relative to 1 GHz) |
| renaud2023 | bw3db_ghz | 3 | renaud2023-3um-738 `other`, 3 |
| valdez2023 | bw3db_ghz | 1 | valdez2023-cn1 `1ghz` |
| wang2024a | bw3db_ghz | 0.01 | wang2024a-a `other`, 0.01 |
| xu2022 | bw3db_ghz | 1.5 | xu2022-a `other`, 1.5 |
| yang2022 | eo_rolloff_db @110 | 0.01 | yang2022-a `other`, 0.01 (target note: reference 10 MHz) |
| zhang2022 | bw3db_ghz, bw6db_ghz | 1 | zhang2022-a `1ghz` |

Not changed: zhang2024 (`dc` = the default) and the `low_freq_unstated` rows. No `line` or `loading` field was edited:
every config with response targets already lists `eo_response` (periodic ones also `loaded_line`) in `chain` and has
`length_mm`, `source_ohm`, `load_ohm` and the loading fields.

Missing inputs that block `eo_response` (not invented; for the config/data lane):

- `line.dielectric_loss_model` (and the region tan delta it needs): all 12 periodic configs (chen2022, kharel2021,
  li2026ba, liu2021, liu2025b, valdez2022, valdez2023, valdez2023a, wang2022, wang2025, xue2026, zhang2024) and gao2024.
- RF permittivity: cai2025, sayem2026c (LiTaO3); churaev2023, he2019, nelan2022, vanackere2023 (LN); deng2026 (BTO).
  churaev2023 and vanackere2023 also have no `sweep`.
- meng2023: `from_paper_alpha` without `rf_loss_table` or `rf_loss_law` (and its geometry fails: shared electrode edge).
- chen2022 also fails the optical stage with the default metal policy (pads in the optical window).

## Files

New: `engine/src/eo-response.mjs`, `engine/src/loaded-line.mjs`, `engine/tests/s7-eo-response.test.mjs`,
`engine/tests/s7-loaded-line.test.mjs`, `engine/tests/s7-stages.test.mjs`. Edited: `engine/src/config.mjs`
(IMPLEMENTED_STAGES, RESPONSE_METRICS, target key `reference_ghz` and its checks, `loadedLineOptions`,
`eoResponseOptions`, `withStageDependencies`, `lineTopology`, readiness, `rfOptions` option `allowLoadedCut`),
`engine/src/stages.mjs` (`buildRfLine` factored out of `runRfStage`, behaviour unchanged per the regression;
`runLoadedLineStage`, `runEoResponseStage`), `engine/src/run.mjs` (wiring, target rules), `engine/src/postproc/store.mjs`
(dataset `rf` columns, globals), `engine/src/run.d.mts`, `engine/src/config.d.mts`, `engine/schema/sim.schema.json`
(target `reference_ghz` in both target definitions, description; T4 entries untouched), `sims/SPEC.md` (S7 section,
stage-contract text, changelog), 7 configs. Outside the T1 list, by necessity: `engine/tests/eo-rf-runner.test.mjs`
(three U3 assertions that expected "not implemented"; coordinator-approved), `app/src/lib/SimStageResults.svelte` (RF
Line results page body), `app/scripts/smoke.mjs` (S7 step). App `app/src/lib/sim/`: `workbench.svelte.ts` (stage
checkboxes), `results.svelte.ts` (default plot groups EO Response, Loaded Line), `Plot1D.svelte` (paper response targets
on the S21 EO curve, Compute solution only), `labels.ts`, `Settings.svelte` (RF Line page: loaded-line and EO response
toggles, readiness, period fields), `ModelTree.svelte` (tips, tags).

## Open items

(Updated 2026-10-16 after round 2.)

- Round-2 audit.
- Loss declarations for the 12 periodic configs (tan delta sources) to enable their lossy loaded line and response.
- `reference_ghz` for `low_freq_unstated` rows would need the plateau frequency read from each paper's plot (those
  targets are now not evaluated, with values at three references).
- Sideband-method rows (arabjuneghani2022, renaud2023, zhang2022, zhang2024): the engine dB is 20 log10 |H|; the audit
  argues sideband power also scales as 20 log10 m; per-paper confirmation not done.
- Conductor thickness (updated round 3): the 33 coplanar Wheeler configs use `slab_symmetric`; the frozen geometry
  factor below the lateral relaxation and the sidewall treatment remain (diagnostics); a frequency-dependent K or a
  horizontal / vertical face split of K is not implemented.
- Periodic EO weight per length is uniform (run-section overlap over the whole length, labelled); weighting the two
  cuts by their own overlap is not implemented.
- Configs without loading conductors (valdez type, reshaped rails) use each cut's own L' and conductor model; Shin et al.
  covers T rails only, so this branch is checked only against the uniform-line limits.

## TODO

- [x] eo-response.mjs + tests
- [x] loaded-line.mjs + tests
- [x] stages/run/config wiring, readiness, target rules, schema, SPEC S7 section
- [x] postproc rf dataset + globals
- [x] configs (target reference_ghz, list missing inputs)
- [x] UI (RF Line page, default S21_EO plot group)
- [x] regression, comparison table, gates
- [x] fresh-context audit (`DevLog/audits/simulator-s7-audit-2026-10-16.md`); T2 K8/K9 comparison (round-off)
- [x] round 2: S1-S9 and LN provenance (section Round 2 results)
- [x] round-2 audit (`DevLog/audits/simulator-s7-round2-audit-2026-10-16.md`)
- [x] round 3: R2-1..R2-6 (section Round 3)
- [ ] round-3 audit
- [x] round 4: Si phase-shifter TWE (section Round 4 results)
- [x] round-3/4 audit (`DevLog/audits/simulator-s7-round3-4-audit-2026-10-16.md`)
- [x] round 5 (section Round 5)
- [ ] round-5 audit

## Round 2 plan (audit `DevLog/audits/simulator-s7-audit-2026-10-16.md`, orchestrator decisions 2026-10-16)

Audit verdict: numerics equal the T2 references to round-off; findings S1-S9 are rules, conventions, docs and UI.

| ID | Decision | Implementation plan |
|---|---|---|
| S1 | rows with an unstated low-frequency reference: `not_evaluated` with values at DC, 1 GHz, 3 GHz references | target key `reference` (`dc` = default, `low_freq_unstated`, `unspecified`, from the data enum `bw_reference`); the response stage evaluates such targets at the three references; compareTargets: reason + `referenceSensitivity`; configs: `reference: low_freq_unstated` on every response target whose device row says so |
| S2 | finite-thickness conductor internal impedance; diagnostic until the config geometry supports it; mao2022 sensitivity | slab surface impedance Z_s = (k/sigma) coth(k t_eff), k = (1+j)/delta, derived from the 1D diffusion equation in the conductor (below); opt-in `line.conductor_thickness_model: semi_infinite (default) | slab_one_sided | slab_symmetric`; R' = K Re Z_s, L_int = K Im Z_s / omega; tests: t >> delta -> R_s (1+j) (the Wheeler / surface-resistance model), t << delta -> 1/(sigma t_eff) (DC sheet resistance) plus mu0 t_eff/3 internal inductance; diagnostic on response targets when the band [f_ref, f] reaches below the frequency where t = 3 delta and the model is semi_infinite |
| S3 | `dielectric_loss_model: none`: diagnostic `assumption_dielectric_loss_none` on response targets, still evaluated, counted in flagged | compareTargets |
| S4 | one loaded-length convention: Shin 2011 (l = length of the T-rail) | kharel2021, liu2021, xue2026: 39/40/40 -> 45 (head length; their cuts differ only by the pads, so the stem region is a loaded section whose stem capacitance is not modelled); others unchanged with reason |
| S5 | exact cascade response default for periodic lines, homogenised optional, warn when f_B < 3 x highest evaluated f | `line.loading.response_model: exact_cascade (default) | bloch_homogenised`; section list U(l_U/2) L(l_L) U(l_U/2) repeated and cut at L; per section V = a e^{-gamma s} + b e^{gamma s}, backward input-impedance recursion from Z_L, forward node voltages with I = V / Z_in (re-derived; DevLog-037 S7.14 as the math reference, its code not read); warning `bragg_frequency_within_3x_of_highest_evaluated_frequency` |
| S6 | label periodic VpiRF | warning `vpi_rf_uses_run_section_eo_overlap_over_full_length` on periodic responses with VpiRF |
| S7 | bandwidth bracket starts at f_ref or DC | the search grid starts with (f_ref or 0, 0 dB), bisection on the first bracketing interval |
| S8 | docs/tests | xu2022 cause (done above), sinc root comment 1.3893486, smoke S7 checks a found bandwidth vs Node on a config with a crossing, engine/package.json and README |
| S9 | UI | dependency-run stages shown checked/disabled with a tip; Loaded Line legend says lossless when only lossless values exist |
| LN | provenance strings citing Zhu 2021 / Veithen 2003 / 44.0 for the LN library (9 configs) | cite Weis and Gaylord 1985 Table 1 p.197 row [23] (eps^S 44.3 / 27.9) and Table 4 p.199 r^S 633 nm row [45]; SiO2 / Si strings stay (library unchanged there) |

Slab derivation (S2). In a good conductor (sigma >> omega eps) the tangential field E(x) at depth x obeys
d^2E/dx^2 = j omega mu0 sigma E = k^2 E, k = (1 + j)/delta, delta = 1/sqrt(pi f mu0 sigma) (quasi-static diffusion,
from curl H = sigma E, curl E = -j omega mu0 H). Slab 0 <= x <= t driven at x = 0 with no field at the far face
(H(t) = 0, i.e. no current return through it): E = E0 cosh(k (t - x)) / cosh(k t), surface current per width
I = sigma int E dx = (sigma E0 / k) tanh(k t), internal impedance per square Z_s = E0 / I = (k / sigma) coth(k t)
(the orchestrator's form). Limits: t >> delta: Z_s -> (1 + j)/(sigma delta) = R_s (1 + j), the surface resistance and
the equal internal reactance of the semi-infinite model (rf-line.mjs: R_s and L_int = R'/omega); t << delta:
coth(z) = 1/z + z/3 + O(z^3), Z_s -> 1/(sigma t) + j omega mu0 t / 3 (DC sheet resistance, internal inductance mu0 t/3).
A strip carrying current on both faces is the symmetric slab (field on both faces, E = E0 cosh(k (x - t/2)) /
cosh(k t/2)): per face Z_s = (k / sigma) coth(k t/2), i.e. t_eff = t/2, whose DC limit 2/(sigma t) per face gives the
uniform-current resistance 1/(sigma t w) for two faces of width w in parallel. Applied with the section geometry
factor K (R' = K Re Z_s), the DC limit is K/(sigma t_eff), exact only for uniform face currents; the result reports it
next to the uniform-current DC resistance from the electrode cross-section areas (check, not a claim).

## Round 2 results (2026-10-16)

Implemented as planned above (S1-S9, LN provenance). Round-1 tables above are kept as history; status changes are
listed here.

Gates:

- New `engine/tests/s7-cascade.test.mjs` (6 tests) and one more in `s7-stages.test.mjs`:
  - cascade of identical sections = uniform closed form (open, short, matched, mismatched; li2026ba-like non-integer
    L/p = 514.29) to 1e-10 relative; loaded cascade = independent backward propagation + Simpson quadrature (also at
    0.97 f_B and in the stopband) to 1e-9;
  - slab Z_s: thick limit R_s (1+j) to 1e-15, thin limit 1/(sigma t) to 1e-6 and omega mu0 t/3 to 1e-5, series switch
    continuity, symmetric(t) = one-sided(t/2); on a line R'(1 MHz) = K/(sigma t_eff) and the 1 THz semi-infinite limit;
    the thin-conductor warning disappears with the slab model;
  - bandwidth bracket from DC finds a crossing below the first grid point;
  - T2 data files (values only): K9a / K9b / K9z exact cascade vs the reference cascade max |dS21| 6.6e-12 /
    7.5e-13 / 2.2e-11 dB on the 112-point grid (600 / 30 / 600 sections), Bloch-homogenised vs the reference
    homogenised 4.4e-13 / 3.5e-14 / 4.8e-13 dB; cascade bw3 184.789803 / 63.757290 / 184.164368 GHz and bw6
    347.361127 / 66.369104 / 341.647931 GHz = reference to the printed digits (test tolerance 1e-5 GHz); K8 all 8
    variants < 1e-9 dB and bw3 / bw6 within 1e-5 GHz;
  - S1 / S2 / S3 / S5 / S6 rules on the fixture (unstated reference values at DC/1/3 GHz, thin-conductor code with
    t = 3 delta at 14.25 GHz for the 2 um, 4e7 S/m plates, slab model clears it, dielectric none code and flagged count,
    exact cascade default, Bragg 3x warning, periodic VpiRF label).
- engine `npm test` sequential: 304 tests, 301 pass, 0 fail, 2 skipped, 1 todo (D5); `npm run test:reference` 11/11;
  app `npm test` 63/63, `npm run check` 0 errors / 0 warnings (465 files), `npm run build` OK, `npm run smoke` exit 0,
  47 PASS (S7 step now: browser 3 dB bandwidth = Node on the fixture, 1.22780 GHz, crossing below the first sweep
  point; dependency `rf_line` shown checked/disabled; Loaded Line legend "lossless"; screenshots reviewed and removed).

S2 sensitivity, mao2022 (`bw3db_ghz` target 60 +-15 %, now `reference: low_freq_unstated`, not evaluated; values
with the reference at DC / 1 GHz / 3 GHz; no 6 dB crossing to the 70 GHz sweep end in any case):

| conductor_thickness_model | bw3 DC | bw3 ref 1 GHz | bw3 ref 3 GHz | n_RF / Re Z0 at 0.1 GHz | at 70 GHz |
|---|---|---|---|---|---|
| semi_infinite (default, round 1) | 52.78 | 52.95 | 57.48 | 3.725 / 66.5 ohm | 2.413 / 43.1 |
| slab_one_sided | 52.78 | 53.59 | 59.04 | 4.682 / 83.6 ohm | 2.413 / 43.1 |
| slab_symmetric | 53.70 | 54.69 | 63.54 | 6.314 / 112.8 ohm | 2.414 / 43.1 |

DC check (`result.rf.dcResistance`, mao2022, t = 1.5 um): uniform-current loop resistance from the electrode areas
1383.8 ohm/m; slab f -> 0 limit K/(sigma t_eff) 1375.0 (one-sided, -0.6 %) and 2750.0 ohm/m (symmetric, 2x).
Corrected 2026-10-16 (round-2 audit R2-1): the slab f -> 0 limit uses the geometry factor K frozen at the
high-frequency (edge-crowded) distribution, so it is not a DC prediction and this comparison cannot discriminate the
face models; the mao2022 agreement is a coincidence of that geometry (edge-crowding factor of about 2 cancelling the
one-sided factor 1/2; across six Wheeler configs the one-sided ratio is 0.99-3.30, the symmetric 1.99-6.60, audit
table). The uniform-current R_DC stays a separate reported check (`dcResistance.note`). The face model follows the
current distribution instead (round 3, R2-2: symmetric slab for coplanar electrodes). The larger low-frequency n_RF and
Z0 of the slab models come from the DC series resistance (RC-like line below a few GHz), which the semi-infinite model
sets to zero.

S4 loaded lengths (Shin 2011: l = length of the T-rail): kharel2021 39 -> 45, liu2021 40 -> 45, xue2026 40 -> 45
(their loaded and unloaded cuts differ only by the pads, so the stem region belongs to the loaded section; head
lengths r = 45, rail 45, R = 45 from the captions / Fig. 3(a) inset as the configs' provenance records). Not changed:
li2026ba (bar length 32), liu2025b (segment 45), wang2025 (T-bar 47), zhang2024 (head 18) already follow the head
length; chen2022 (36) and wang2022 (33) are the bar-with-slot coexistence lengths: their real cell has three section
types (T-bar over the substrate slot, slot without bar in the gap c, T-bar without slot over the stem bridge), the
two cuts represent the first two, and the stem-bridge region is lumped into the unloaded cut (documented in their
provenance; kept, a three-section cell would need a third cut); valdez2022/2023/2023a have no loading conductors
(reshaped rails, own L' per cut).

Config changes (round 2): `reference: low_freq_unstated` on the response targets of arabjuneghani2022 (roll-off),
boynton2020, chen2022 (2), deng2026 (2), li2026aa, liu2021, mao2022, meng2023, wang2022a, wang2025, xue2026 (rows with
devices.csv `bw3db_reference: low_freq_unstated`); `reference: unspecified` on the arabjuneghani2022 predicted bw3db
(paper text, normalization not stated); S4 loaded lengths above; LN library provenance strings of arabjuneghani2022,
boynton2020, gao2024, mao2022, meng2023, renaud2023, valdez2022, valdez2023, yang2022 now cite Weis and Gaylord 1985
Table 1 p.197 row [23] (eps^S 44.3 / 27.9) and Table 4 p.199 r^S 633 nm row [45] (SiO2 / Si strings unchanged; the
yang2022 "corroborated by the Crystal Technology data sheet" clause referred to 44 and was removed).

Regression (40 configs + 2 new T6 configs anjali2025, han2023 that run electrostatics + optical only; pre-T3 library in
both runs) vs round 1: no metric change except the periodic quasi-static values of the S4 configs; status changes:

| Config | Target | Round 1 | Round 2 |
|---|---|---|---|
| arabjuneghani2022 | eo_rolloff_db @100 | fail (-1.16 dB) | not_evaluated, unstated reference: -1.164 / -1.187 / -1.262 dB (DC / 1 / 3 GHz) |
| arabjuneghani2022 | bw3db_ghz | not_evaluated (> 200) | not_evaluated, unspecified reference: > 200 GHz at all three |
| boynton2020 | bw3db_ghz | pass (27.13) | not_evaluated: 27.12 / 26.72 / 26.53 GHz |
| li2026aa | bw3db_ghz | not_evaluated (> 110) | not_evaluated, unstated reference |
| mao2022 | bw3db_ghz | pass (52.76) | not_evaluated: 52.78 / 52.95 / 57.48 GHz |
| kharel2021 | n_rf / z0_ohm | pass 2.206 / 44.22 | pass 2.268 / 43.02 (S4) |
| liu2021 | n_rf | pass 2.205 | pass 2.261 (S4) |
| xue2026 | n_rf | pass 2.171 | pass 2.210 (S4) |

Still evaluated: yang2022 roll-off pass (-2.66 vs -2.5, ref 0.01 GHz; flagged: Wheeler spread, assumption_dielectric_loss_none,
thin conductor below 80.7 GHz), zhang2022 bw3 fail (65.7 vs 170) and bw6 pass (287.5 vs 295) (ref 1 GHz; flagged: thin
conductor below 61.4 GHz).

## Round 3 (round-2 audit `DevLog/audits/simulator-s7-round2-audit-2026-10-16.md`, orchestrator decisions 2026-10-16)

| ID | Decision | Done |
|---|---|---|
| R2-1 | correct the DC-check reading; keep R_DC as a separate check | DevLog text above corrected; `rf.dcResistance.note`; SPEC S7 |
| R2-2 | coplanar electrodes use `slab_symmetric`; `slab_one_sided` only for declared single-face current; switch after R2-3, R2-4 and a listed regression; lateral-relaxation diagnostic | SPEC guidance; all 33 `skin_effect_wheeler` configs checked coplanar (every electrode of every run and unloaded cut shares one y band; the loaded cuts of chen2022, wang2025, wang2022 and xue2026 have thinner T pads, which set neither R', K nor t; reworded round 5, audit R34-2) and set to `conductor_thickness_model: slab_symmetric` (inline comment; provenance entry in the 31 configs that have a `line.conductor_loss_model` provenance key); diagnostic `band_below_lateral_current_relaxation_estimate` with f_lat ~ 1/(pi mu0 sigma t w), narrowest signal strip, stated as an order-of-magnitude estimate (mao2022 0.23 GHz, yang2022 0.37, zhang2022 0.27, li2026aa 0.25 GHz) |
| R2-3 | slab models keep a diagnostic with the remaining limits | `slab_model_limits` on every response target of a slab line (frozen K, sidewalls, f -> 0 R' not a DC prediction) and the run warning `slab_model_limits_frozen_geometry_factor_and_sidewalls` |
| R2-4 | normalize by the model's own f -> 0 limit | Phi_0 = I (Z_L L + int_0^L z R'(z) dz), I = V_s/(Z_s + Z_L + R_0) (open load: L); `response.normalization`, `seriesResistanceDcOhm`, `normalizationOffsetDb`; li2026aa (Z_L 38 ohm) offset +0.353 dB = audit value; Z_s = Z_L exactly 0 |
| R2-6 | han2023 tag, chen2022 traceability | han2023 bw3db `reference: low_freq_unstated` (row han2023-a); chen2022 67 GHz roll-off cites `device_id: chen2022-c, field: eo_rolloff_db` |
| R2-7 | note only | the exact cascade still runs on no shipped config (no periodic config declares a dielectric loss model) |

Files: `engine/src/stages.mjs` (strip widths on the line object, `dcResistance.note`, normalization, per-target
diagnostics in `response.byTarget[].diagnostics`, warnings), `engine/tests/s7-stages.test.mjs` (round-3 test),
SPEC S7, 33 + 2 configs, this DevLog. `engine/src/run.mjs`: one Edit-tool replacement allowed by the orchestrator
(re-read before, file snapshot compared after; T4's concurrent edits intact), exact diff:

```
105a106,107
>           // DevLog-036 round 3 (R2-2, R2-3): conductor-model limits computed per target by the eo_response stage
>           for (const d of r.diagnostics ?? []) { codes.push(d.code); diagnostic = [diagnostic, d.text].filter(Boolean).join(' '); }
```

The `thinConductorBelowGhz` assignment after `runEoResponseStage` was left unchanged: the stage reports its own
fields (`lateralRelaxationGhz`, `thicknessModel`), so nothing is overwritten and a second edit was not needed.

Regression (42 configs, pre-T3 library, scratch overlays; A = round-3 code with round-2 configs, B = A with the 33
Wheeler configs on `slab_symmetric`, i.e. the repo state). A vs round 2: no S7 change; the only differences come from
T4's concurrent `semiconductor` stage (readiness messages on every config; anjali2025 and han2023 now error in the
regression harness because it requests every ready stage and the semiconductor stage must run alone). B vs A: no
target status change; values and bandwidths:

| Config | Quantity | A (semi_infinite) | B (slab_symmetric) |
|---|---|---|---|
| arabjuneghani2022 | rf_loss @67 (target 3.6, pass) | 4.319 | 3.990 dB/cm |
| chen2026 | n_rf @47 (pass) | 2.1615 | 2.1527 |
| lin2025 | rf_loss @67 (pass) | 5.309 | 5.328 dB/cm |
| yang2022 | roll-off @110, ref 0.01 GHz (pass) | -2.656 | -2.549 dB |
| zhang2022 | bw3db, ref 1 GHz (fail, 170) / bw6db (pass, 295) | 65.75 / 287.53 | 73.39 / 292.56 GHz |
| zhang2022 | rf_loss @250 (fail, 13) / z0 @250 (pass) | 16.614 / 40.345 | 16.656 / 40.348 |
| DC-referenced bw3 / bw6 (GHz) | boynton2020 | 27.13 / 51.46 | 20.86 / 54.16 |
| | chen2026 | 61.98 / - | 67.46 / - |
| | li2022b | 63.67 / 90.21 | 64.23 / 90.60 |
| | lin2025 | 14.53 / 105.76 | 17.71 / 105.70 |
| | mao2022 | 52.76 / - | 53.69 / - |
| | murai2025 | 30.72 / - | 30.99 / - |
| | qi2024 | 51.69 / - | 47.76 / - |
| | wang2022a | 41.98 / - | 36.65 / - |
| | xu2022 | 4.87 / 12.22 | 1.68 / 5.80 |
| | xue2023 | 18.18 / 29.87 | 8.11 / 24.34 |
| | zhang2022 | 61.50 / 284.84 | 70.57 / 284.01 |
| | renaud2023 (paper loss) | 3.87 / 46.35 | unchanged |

The DC-referenced bandwidths of long mismatched lines move most (xu2022, xue2023, boynton2020, wang2022a): their
-3 dB crossing lies in the RC-like low-frequency band where the frozen K matters; those targets carry the lateral
diagnostic where the reference reaches below f_lat. Unstated-reference targets (not evaluated) with B:
mao2022 53.70 / 54.69 / 63.54 GHz, li2026aa > 110 GHz at all three references. Removed warnings in B:
`conductor_thickness_below_3_skin_depths_surface_resistance_invalid` and the lossless-DC normalization label (replaced
by `eo_response_normalized_to_model_dc_limit_with_series_resistance` and the slab-limits warning).

Gates (round 3): S7 tests 29/29; S7-related subset (s7-*, eo-rf-runner, rf-line, library-citations, config) 95/96, the
failure is `config.test.mjs` "documented schema enums" (STAGES now contains T4's `semiconductor`, the schema `chain`
enum not yet; T4 lane); full engine suite 310: 306 pass, 1 fail (same T4 test), 2 skipped, 1 todo; `test:reference`
15/15 (T4/T5 added cases); app test 63/63, check 0 errors / 0 warnings (465 files), build OK, smoke exit 0, 47 PASS.

## Round 4 plan: Si phase-shifter TWE (junction-loaded line) after the semiconductor stage (2026-10-16)

Circuit (source: Shin, Sakamoto, Dagli, JLT 29, 48 (2011), Fig. 2 and eqs. (1)-(5), p. 49: the line Z_0 = R_0 + j w L_0,
Y_0 = G_0 + j w C_0 plus a loading branch Y_1 = 1 / (R_1 + 1/(j w 2 dC)) per length, gamma = sqrt(Z_0 (Y_0 + Y_1)),
Z = sqrt(Z_0 / (Y_0 + Y_1)); p. 50 (end of Sec. II; corrected from p. 51, audit R34-4): "when doped semiconductor junctions are used as loading elements ... the
equivalent circuit, as shown in Fig. 2, can still be used"). Si TWE: electrode line = `rf_line` on the electrode
cross-section (C', L', R', G' with the config's loss declaration); loading branch = the junction of the semiconductor
stage at the operating DC bias: series R'_j (perLength.rOhmM, ohm m) and C'_j(V) (perLength.cFPerM, F/m), i.e. T4's
Y'_j = j w C'_j / (1 + j w R'_j C'_j). Phase drive: the voltage across C'_j, V_j = V_line / (1 + j w R'_j C'_j) (voltage
divider of that branch), times the small-signal dn_eff/dV at the bias (semiconductor optics.dneffPerV). Since the
factor is z independent on a uniform line, H_Si(f) = H_line(f) / (1 + j w R'_j C'_j) with H_line from the junction-loaded
gamma, Z0; DC normalization unchanged (Y'_j(0) = 0). RF Vpi(f) = Vpi_DC / |H|, Vpi_DC = lambda / (2 L |dn_eff/dV|)
(single arm, swept-contact volts). Limits as tests: R'_j -> 0 (line with C' + C'_j), C'_j -> 0 (bare line), short
electrode -> lumped RC V_j / V_s = 1 / ((1 + Z_s Y_tot)(1 + j w R'_j C'_j)), Y_tot = L (j w C' + Y'_j) (open load), and
with C' << C'_j L the corner 1 / (2 pi C'_j (Z_s L + R'_j)).

Inputs not in the config schema (config.mjs is T4's file this round): the electrode cross-section and the operating DC
bias are run options `rfSection` and `biasV` (no default; errors when absent); a config key is a follow-up.

Planned `engine/src/run.mjs` change (one atomic read-modify-write of three places; T4's code otherwise untouched):

```
@@ export function runConfig(config, { ... modeOnly = false, keep = false, numModes = null } = {}) {
-  ..., modeOnly = false, keep = false, numModes = null } = {}) {
+  ..., modeOnly = false, keep = false, numModes = null, rfSection = null, biasV = null } = {}) {
@@ dispatch
-  if (Array.isArray(requested) && requested.includes('semiconductor')) return runSemiconductorOnly(config, { section: name, stages: requested, meshScale, onProgress, fields, keep, targets: targetOverride });
+  if (Array.isArray(requested) && requested.includes('semiconductor')) return runSemiconductorOnly(config, { section: name, stages: requested, meshScale, onProgress, fields, keep, targets: targetOverride, rfSection, biasV });
@@ function runSemiconductorOnly
-function runSemiconductorOnly(config, { ..., targets: targetOverride = null } = {}) {
-  const others = stages.filter((x) => x !== 'semiconductor' && x !== 'electrostatics');
+function runSemiconductorOnly(config, { ..., targets: targetOverride = null, rfSection = null, biasV = null } = {}) {
+  // DevLog-036 round 4: eo_response (with its rf_line on rfSection) may follow the semiconductor stage
+  const others = stages.filter((x) => x !== 'semiconductor' && x !== 'electrostatics' && x !== 'eo_response' && x !== 'rf_line');
@@ after `const semi = runSemiconductor(...)`
+  const twe = stages.includes('eo_response') ? runJunctionResponseStage({ config, semi, semiSection: name, rfSection, biasV, meshScale, onProgress, targets: targetOverride ?? config.raw.targets ?? [] }) : null;
+  const tweTargets = twe ? compareTargets(targetOverride ?? config.raw.targets ?? [], {}, { topology: lineTopology(config.raw), section: name, fixedGroupIndex: config.raw.optics?.group_index_from === 'fixed', rf: twe.rf, response: twe.response }) : null;
-  const configTargets = (targetOverride ?? config.raw.targets ?? []).map((t) => ({ ...
+  const configTargets = (targetOverride ?? config.raw.targets ?? []).map((t, i) => (tweTargets && RESPONSE_METRICS.includes(t.metric) ? tweTargets[i] : { ...
@@ result
-    id: ..., stages: ['semiconductor'], metrics: {}, targets,
+    id: ..., stages: twe ? ['semiconductor', 'rf_line', 'eo_response'] : ['semiconductor'], metrics: {}, targets,
-    ... warnings: [...new Set(semi.labels)], meshScale,
+    ... warnings: [...new Set([...semi.labels, ...(twe?.warnings ?? [])])], meshScale,
-    electrostatics: null, optical: semi.optical, eo: null, rf: null, semiconductor: semi, elapsed_ms: elapsed,
+    electrostatics: null, optical: semi.optical, eo: null, rf: twe?.rf ?? null, response: twe?.response ?? null, semiconductor: semi, elapsed_ms: elapsed,
+  (flagged: counts the response-target diagnostics)
```

## Round 4 results (2026-10-16)

Implemented as planned. Code: `rf-line.mjs` `junctionPropagationAt` (Y'_j added to the shunt, gamma, Z0, branch divider
1/(1 + j w R'_j C'_j)); `stages.mjs` `runEoResponseStage(..., junction)` (uniform line only; H x junction factor) and
`runJunctionResponseStage` (electrode electrostatics + rf_line on `rfSection`, optical group index on the run section,
operating-bias C'_j, R'_j, dn_eff/dV from the semiconductor result, Vpi_DC = lambda/(2 L |dn_eff/dV|),
`junctionLine` sweep, labels `junction_loaded_line_shin2011_fig2_branch`,
`phase_driven_by_junction_voltage_small_signal_at_dc_bias`, `electrode_cross_section_capacitance_excludes_junction_by_config`).

`engine/src/run.mjs`: one atomic read-modify-write (snapshot before, diff after; T4 code otherwise untouched). Actual
diff = the plan above plus the import line (not listed in the plan) and `flagged` counted from target diagnostics:

```
9c9    import { runEoStage, runRfStage, runLoadedLineStage, runEoResponseStage, runJunctionResponseStage, responseTargetKey, ... } from './stages.mjs';
181c181  runConfig options: + rfSection = null, biasV = null
184c184  dispatch: runSemiconductorOnly(config, { ..., targets: targetOverride, rfSection, biasV })
401,402c401,403  runSemiconductorOnly options + rfSection, biasV; comment; `others` also allows eo_response and rf_line
407c408,410  + const twe = stages.includes('eo_response') ? runJunctionResponseStage({...}) : null;
             + const tweTargets = twe ? compareTargets(targets, {}, { topology, section, fixedGroupIndex, rf: twe.rf, response: twe.response }) : null;
             configTargets: response metrics take tweTargets[i]
412,415c415,418  stages ['semiconductor', 'rf_line', 'eo_response'] when twe; flagged = targets with a diagnostic;
                 warnings + twe.warnings; rf: twe?.rf ?? null, response: twe?.response ?? null
```

Gates:

- `engine/tests/s7-semi-twe.test.mjs` 6/6:
  - limits: R'_j -> 0 equals the line with C' + C'_j (1e-12); C'_j -> 0 equals the bare line; branch admittance and
    divider = circuit formulas (1e-12); quasi-static n = c sqrt(L'(C' + C'_j)) (1e-6);
  - short open electrode (20 um) = lumped V_j/V_s = (1/(1 + Z_s Y_tot)) (1/(1 + j w R'_j C'_j)) x optical transit
    (e^{jx} - 1)/(jx) within 2 (|gamma| L)^2 to 60 GHz;
  - lumped corner with C' << C'_j L: bw3 = f_c sqrt(10^0.3 - 1), f_c = 1/(2 pi C'_j (Z_s L + R'_j)), within 1e-4;
  - identity H = H(junction-loaded gamma, Z0) / (1 + j w R'_j C'_j) (1e-12); negligible junction = bare line;
  - plumbing on a synthetic semiconductor result (Vpi_DC, RF Vpi, bias selection, input errors);
  - end to end through `runCrossSection(text, {stages: [semiconductor, eo_response], rfSection, biasV})` on the
    DevLog-039 canonical lateral PN rib plus an illustrative oxide-only coplanar electrode cut (8 s). Illustrative output
    at 2 V reverse bias: C'_j 0.263 pF/mm, R'_j 15.39 ohm mm (f_RC 39.3 GHz), dn_eff/dV 3.88e-5 /V, n_g 3.897;
    loaded line n 3.82 / Z 35.5 ohm at 1 GHz (bare 1.98); bw3 16.1 GHz, bw6 34.3 GHz, Vpi_DC 19.96 V (1 mm, single
    arm), RF Vpi 44.6 V at 40 GHz (illustrative inputs, not a device claim).
- Engine suite sequential: 316 tests, 313 pass, 0 fail, 2 skipped, 1 todo (the round-3 schema-enum failure is gone;
  pre-round-4 run 01:12: 307/310 pass, 0 fail). `test:reference` 15/15. App test 63/63, check 0 errors / 0 warnings
  (468 files), build OK, smoke exit 0, 47 PASS.

han2023 and anjali2025: not applied; their configs carry no TWE line inputs. Missing: a `line` block (`length_mm`,
`source_ohm`, `load_ohm`, `loading.type`, conductor and dielectric loss models), an electrode cross-section of the RF line
(signal/ground electrodes with roles and conductivity; the configs have only the device cut with ideal via contacts),
a `sweep`, `rf_line` / `eo_response` in `chain`, and the operating bias as an input (han2023 records 3.5 V in the
provenance of `semiconductor.bias`; anjali2025 none). han2023's bw3db target is `comparable: false` (CROW optical
bandwidth, 3D periodic structure).

## Round 5 (audit `DevLog/audits/simulator-s7-round3-4-audit-2026-10-16.md`, 2026-10-16)

| ID | Done |
|---|---|
| R34-1 | The conductor diagnostics (`slab_model_limits`, `band_below_lateral_current_relaxation_estimate`) are attached to the DC-referenced `response.bandwidth.bw3db_ghz` / `bw6db_ghz` (`diagnostics`), listed for metrics bw3db_ghz / bw6db_ghz in `response.metricDiagnostics`, and given per reference entry of `referenceSensitivity` (`diagnosticCodes`; run.mjs one-line change in the referenceSensitivity map, re-read before). The stage warning `band_below_lateral_current_relaxation_estimate` stands whenever the estimate exists (the sweep is DC-referenced). Note: the DC-referenced bandwidths of long lines (xu2022, xue2023, wang2022a, boynton2020, mao2022) lie in the 0.1-2 GHz band, where the frozen high-frequency K dominates R' (slab f -> 0 R' 2.0-6.6x the uniform R_DC, audit table); they are frozen-K dominated, and only a frequency-dependent K or a blend to R_DC would make them physical. |
| R34-2 | Coplanarity sentence reworded (run and unloaded cuts; thinner T pads of the loaded cuts noted). |
| R34-3 | valdez2022, valdez2023: `line.conductor_loss_model` and `line.conductor_thickness_model` provenance entries (project_inference). |
| R34-4 | Shin junction-loading statement cited as p. 50 (end of Sec. II) in rf-line.mjs, SPEC and this DevLog; the claims file is not in the T1 write paths (no "p. 51" string left there). |
| R34-5 | `EO_RESPONSE_CONVENTIONS.normalization` / `vpiRf` state both modes; `response.vRefDefinition`; SPEC S7 and S7 x S8 RF Vpi wording. |
| R34-6 | `runJunctionResponseStage` sets `response.thinConductorBelowGhz` from its rf_line result (same formula), so the TWE path gets `thin_conductor_semi_infinite_surface_impedance_in_band`. |
| R34-7 | Branch Y'_j = (G'_j + j w C'_j)/(1 + R'_j (G'_j + j w C'_j)) and divider 1/(1 + R'_j (G'_j + j w C'_j)) (T4 formula; G' null = 0); DC normalization with the junction shunt y_0 = G'_j/(1 + R'_j G'_j) (DC line with r_0 = R'(0), y_0; r_0 = 0: uniform voltage across Z_L || 1/(y_0 L)) times 1/(1 + R'_j G'_j), `normalization: model_dc_with_junction_conductance`. Forward-bias operating points are rejected (quasi-static diffusion capacitance, omega tau << 1 only). Config keys `line.rf_section` / `semiconductor.operating_bias_v` are read by runConfig (T4 round 3); run options override; error texts name the keys. dn_eff/dV from `perLength.dneffPerV`. |
| han2023 | stale notes updated (semiconductor stage honours comparable; push-pull VpiL now reported by the stage). |

Round-4 example re-run with T4's round-3 dn_eff/dV (+-dv/2 states): dn_eff/dV 4.138e-5 /V (was 3.88e-5), Vpi_DC 18.73 V
(was 19.96 V), RF Vpi at 40 GHz 41.85 V (was 44.6 V); unchanged: C'_j 0.263 pF/mm, R'_j 15.39 ohm mm, f_RC 39.3 GHz,
n_g 3.897, loaded n 3.82 / Z 35.5 ohm at 1 GHz, bw3 16.07 GHz, bw6 34.26 GHz (G'_j null at 2 V reverse bias, i.e. 0;
`normalization: lossless_dc`; all illustrative).

## Progress log

- 2026-10-15 23:24 PDT Pre-edit snapshot of `engine/` and `sims/` (both equal to HEAD) in the session scratchpad;
  baseline regression of 40 configs (readiness + every ready implemented stage) recorded there.
- 2026-10-15 23:28 PDT Read DevLog-035/023/012/008, SPEC, engine rf-line/stages/run/config/postproc store, the 12
  periodic configs (all lack `line.dielectric_loss_model`, so their lossy loaded line and response are blocked;
  static Bloch quantities are not), Alferness 1982 Sec. VI.B and the 1983 corrections (eqs. (8), (12), (23), (24) and
  a line below (22) corrected; (18)-(22) unchanged), Shin et al. 2011. Plan above.
- 2026-10-15 23:35 PDT eo-response.mjs and loaded-line.mjs with closed-form tests (16 tests green); Bloch branch fixes
  (rounding-level -0 imaginary part and negative real part of the lossless passband root).
- 2026-10-15 23:42 PDT Stage wiring (config/stages/run), postproc rf dataset and globals, types, schema, stage tests;
  three U3 assertions of eo-rf-runner.test.mjs updated to the new contract.
- 2026-10-15 23:46 PDT reference_ghz on 7 configs; post-edit regression in a scratch overlay (pre library); table.
- 2026-10-15 23:53 PDT UI (stages, RF Line page, EO Response / Loaded Line plot groups, target overlay); app check, test,
  build, smoke (47 PASS) green; engine suite and reference tests green.
- 2026-10-15 23:56 PDT Process incident: a DevLog write via an unquoted shell heredoc expanded backtick-quoted names as
  commands (all failed: not found, not executable, or npm without package.json at the repo root; one `dc` waited on
  stdin and was killed). No file was modified by it (git status checked); the DevLog was then written with the editor.
- 2026-10-16 00:00 PDT Results, regression, comparison table, config changes, missing inputs and open items above.
- 2026-10-16 00:23 PDT Round 2 started: audit read; plan written (section Round 2 plan).
- 2026-10-16 00:30 PDT Slab surface impedance, cascade integral, bracket from the reference, target `reference`,
  diagnostics, response model option; tests (K8/K9 data comparison at round-off).
- 2026-10-16 00:34 PDT Configs (S1 references, S4 loaded lengths, LN provenance), UI S9, smoke S8, SPEC, README,
  package.json; mao2022 sensitivity and DC check.
- 2026-10-16 00:36-00:40 PDT Regression (round 2 vs round 1), engine suite, reference tests, app test/check/build/smoke.
- 2026-10-16 01:00 PDT Round 3 started (round-2 audit read; run.mjs edit permission obtained for one replacement).
- 2026-10-16 01:05 PDT stages.mjs normalization and diagnostics, run.mjs two-line edit (diff above), round-3 test.
- 2026-10-16 01:06-01:09 PDT Coplanarity check, regressions A/B, 33 configs on slab_symmetric, R2-6 edits, SPEC.
- 2026-10-16 01:10 PDT Gates (S7 29/29, full suite 306/310 with one T4 failure, reference 15/15, app green).
- 2026-10-16 01:12 PDT Round 4 started; full engine suite 307/310 pass, 0 fail (schema-enum failure gone).
- 2026-10-16 01:14-01:20 PDT Shin 2011 Fig. 2 / eqs. (1)-(5) read from the rendered page; Reed 2010 checked (review,
  no TWE circuit); junction-loaded propagation, response option and stage runner; run.mjs diff written here, then
  applied atomically.
- 2026-10-16 01:21-01:27 PDT s7-semi-twe tests (6/6), SPEC S7 x S8 section, engine suite 313/316 (0 fail), reference
  15/15, app gates green.
- 2026-10-16 01:54 PDT Round 5 started (round 3-4 audit read; stages.mjs and run.mjs re-read before each edit).
- 2026-10-16 01:55-02:00 PDT G' branch, DC normalization with the junction shunt, forward-bias rejection, R34-1
  diagnostics, convention strings, TWE thin-conductor value, run.mjs one-line referenceSensitivity change; configs
  (valdez provenance, han2023 notes); SPEC; round-5 tests.
- 2026-10-16 02:03 PDT Gates: S7 tests 37/37; engine suite 319 tests, 316 pass, 0 fail, 2 skipped, 1 todo;
  test:reference 15/15; app test 72/72, check 0/0 (470 files), build OK, smoke exit 0, 48 PASS.
