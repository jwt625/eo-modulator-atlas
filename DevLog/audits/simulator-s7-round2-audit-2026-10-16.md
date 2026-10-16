---
title: Fresh-context audit of lane T1 round 2 (S7 fixes S1-S9) - slab conductor model, exact cascade, reference tags, loaded lengths, gates
date: 2026-10-16 (started 00:43 PDT, written 00:56 PDT)
auditor: fresh-context Claude subagent (did not write the T1 or T2 code)
scope: DevLog/audits/simulator-s7-audit-2026-10-16.md (S1-S9); DevLog-036 "Round 2 plan" / "Round 2 results"; engine/src/{eo-response,loaded-line,rf-line,run,stages,config}.mjs; engine/tests/s7-cascade.test.mjs and the round-2 test in s7-stages.test.mjs; validation/reference/s7-{K8,K9,limits}.json and DevLog-037; sims kharel2021, liu2021, xue2026 (S4) and the 11 configs with new `reference` tags; data/devices.csv; references/{kharel2021,liu2021,xue2026}/text.md; engine and app gates
---

# S7 round 2 audit (lane T1), 2026-10-16

Read-only on code, configs and references; the only repo file written is this report. Scratch: session scratchpad
`r2audit/` (auditor scripts `slab.py`, `casc.py`, `casc_lib.py`, `stress.py`, `stress.mjs`, `mao.mjs`, `s4.mjs`,
`tags.mjs`, their JSON outputs, timestamped gate logs); smoke screenshots were written there, reviewed and removed.
`npm run build` / `smoke` regenerated the git-ignored `app/build/` and `app/static/sims/`. No git state change. All runs
sequential, `nice -n 10`, Node `--max-old-space-size=1536` (largest RSS seen 0.95 GB); nothing left running.

## Verdict

- S1, S3, S5, S6, S7, S8, S9 and the LN provenance item: implemented as planned, tested, behave as claimed.
- Exact cascade (S5): the derivation is correct. My own Python cascade (backward ABCD from the load, 12-point
  Gauss-Legendre per section, no shared code) matches the T2 K9a/b/z series to <= 8.0e-13 dB and their bw3/bw6 to the
  printed 6 digits. It also matches the engine to 1.1e-12 dB on 24 stress points (open, 25/75 ohm mismatched,
  non-integer L/p, at and above Bragg).
- S2 slab impedance: the formula, both limits and the code are correct (finite-difference ODE check below). The
  round-2 interpretation of the DC check is wrong: the one-sided slab matching R_DC on mao2022 is a coincidence of
  that geometry (R2-1). For coplanar electrodes the symmetric slab is the right face model (R2-2).
- S4: all three loaded-length changes are confirmed by the paper captions (head length + gap = period).
- S1 tags: all 11 configs match their devices.csv `bw3db_reference`. One untagged row in a new config (R2-6).
- Gates: everything reproduces except the full engine suite. It now has 1 failure in the S8 lane (G8 semi-models),
  whose source files changed after T1's gate run (R2-5). The 61 S7-related tests pass.

## 1. S1-S9 fix check

| ID | Implementation (file) | Test | Verified behaviour |
|---|---|---|---|
| S1 | target key `reference` (config.mjs:50, 373-376); stage evaluates DC / 1 / 3 GHz (stages.mjs `UNSTATED_REFERENCE_SET_GHZ`); compareTargets `not_evaluated` + `referenceSensitivity` (run.mjs:84-89) | s7-stages "round 2 target rules" | mao2022 rerun: 52.776 / 52.950 / 57.477 GHz = DevLog table |
| S2 | `slabSurfaceImpedance`, `thicknessModel`, `xAt` (rf-line.mjs:67-98, 249-261, 394); `dcResistanceCheck` (stages.mjs:182-195); thin-conductor diagnostic (run.mjs:101-104, 284-285) | s7-cascade slab test; s7-stages | formula correct (section 2); DC-check conclusion wrong (R2-1) |
| S3 | `assumption_dielectric_loss_none` code, still evaluated, counted in flagged (run.mjs:98-100) | s7-stages | yes |
| S4 | loaded_length_um 39/40/40 -> 45 | none needed | section 4; quasi-static values reproduced: kharel2021 2.26792 / 43.022 ohm, liu2021 2.26114, xue2026 2.21049 (all pass) |
| S5 | `cascadeSections`, `cascadeAt` (loaded-line.mjs:178-200); `cascadePhaseIntegral` (eo-response.mjs:100-143); default `exact_cascade`; warning at f_B < 3 f_max | s7-cascade (uniform closed form, brute force, K9 data) | section 3 |
| S6 | `vpi_rf_uses_run_section_eo_overlap_over_full_length` | s7-stages | yes |
| S7 | `firstCrossing(..., start)` with (f_ref or 0, 0 dB) (eo-response.mjs:177-199; stages.mjs:400-412) | s7-cascade bracket test; smoke S7 (1.22780 GHz, below the first sweep point) | yes |
| S8 | sinc root comment 1.3893486 (s7-eo-response.test.mjs:125); package.json, README; smoke S7 asserts a found bandwidth | - | yes |
| S9 | dependency stage checked/disabled; "lossless" in the Loaded Line legend | smoke | screenshots: `RF line` checked (greyed) on EO Response; legend `rf.nB (1) lossless`, `real(rf.ZB) (ohm) lossless` |
| LN | 9 configs cite Weis and Gaylord 1985 Table 1 row [23] / Table 4 row [45]; library eps^S 44.3 / 27.9 | library-citations | no remaining Zhu 2021 / Veithen / 44.0 LN strings in sims/*/config.yaml |

## 2. Finite-thickness slab surface impedance (independent derivation)

- Good conductor, quasi-static, phasor exp(+j omega t): curl H = sigma E, curl E = -j omega mu0 H give
  d^2E/dx^2 = j omega mu0 sigma E = k^2 E, k = (1 + j)/delta, delta = 1/sqrt(pi f mu0 sigma).
- One-sided (field and current entering at x = 0, H = dE/dx = 0 at x = t): E = E0 cosh(k(t - x))/cosh(kt).
  Current per width I = sigma int_0^t E dx = (sigma E0/k) tanh(kt), so Z_s = E0/I = (k/sigma) coth(kt).
- General two-face slab: E1 = Z11 J1 + Z12 J2 with Z11 = (k/sigma) coth(kt), Z12 = (k/sigma) csch(kt).
  Symmetric drive (J1 = J2): per face Z11 + Z12 = (k/sigma) coth(kt/2), i.e. t_eff = t/2. One-sided (J2 = 0): Z11.
- Limits: t >> delta gives coth -> 1 and Z_s -> (1 + j)/(sigma delta) = R_s (1 + j), the semi-infinite model.
  t << delta gives coth z = 1/z + z/3 - z^3/45, so Z_s -> 1/(sigma t_eff) + j omega mu0 t_eff/3
  (+ 4 x^3/(45 sigma delta) real, with x = t_eff/delta).
  The code (rf-line.mjs:86-97) uses that series for x < 1e-3, and above it
  coth((1+j)x) = (sinh 2x - j sin 2x)/(cosh 2x - cos 2x). Both are correct.
- Numerical check (`slab.py`, finite-difference solve of the ODE, 4000 cells, Au sigma 4.5167e7 S/m, t = 1.5 um,
  f = 0.1-70 GHz, t/delta = 0.20-5.30): closed form = FD to 6-7 digits for both drives. At 5 GHz, one-sided
  1.934464e-2 + 1.800341e-2j ohm and symmetric 3.017377e-2 + 9.807196e-3j ohm per face.

Which face model fits CPW/GSG electrodes:

- In the engine's quasi-TEM model, L' = 1/(c^2 C0'). The surface current density follows the vacuum (C0') surface charge.
  For coplanar strips on a planar surface in non-magnetic media, the conductor set is mirror-symmetric about the metal
  mid-plane. Top and bottom faces therefore carry equal current, up to the asymmetry of the outer domain boundary.
  That is the symmetric slab.
- One-sided is exact when one face carries the current: parallel plates (inner faces), the ground plane of a
  microstrip, or an electrode over a nearby ground or conductive layer.
- Thin-limit error for a face split a : (1 - a), with K taken over both faces (as Wheeler does):
  - the true R' is (1/(sigma t)) int J^2 dl / I^2;
  - one-sided gives (a^2 + (1-a)^2) times that, i.e. 1x to 0.5x (up to 2x low; 2x low at a = 1/2, the CPW case);
  - symmetric gives 2 (a^2 + (1-a)^2) times that, i.e. 1x to 2x (exact at a = 1/2).
- Caveats of either slab variant:
  - (i) K is frozen at the Wheeler frequency. Below the lateral-relaxation frequency the current spreads across the
    strip width and R' -> R_DC. My order-of-magnitude estimate is f_lat ~ 1/(pi mu0 sigma t w), where the thin-sheet
    length delta^2/t equals the strip width: about 0.23 GHz for mao2022 (w 16 um, t 1.5 um).
  - (ii) the sidewall share of K also gets coth(k t_eff), although the sidewalls are thick in their own normal
    direction. This overestimates their low-frequency resistance.

DC check logic (`dcResistanceCheck`):

- The formula is right: uniform current gives 1/(sigma A_s) + 1/(sigma sum A_g) (grounds in parallel; polygon areas
  in the config frame; mirror crop not corrected, as stated). It uses the modelled ground widths, which are often
  truncated or assumed.
- What it compares against is wrong. K/(sigma t_eff) is the f -> 0 limit of a K frozen at the high-frequency
  (edge-crowded) distribution, not a DC prediction, so its agreement with R_DC says nothing about the face model.
  Auditor runs (`mao.mjs`, rf_line, current tree):

| Config | K (1/m) | t (um) | R_DC uniform (ohm/m) | one-sided K/(sigma t) / R_DC | symmetric 2K/(sigma t) / R_DC |
|---|---|---|---|---|---|
| mao2022 | 93155 | 1.5 | 1383.8 | 0.994 | 1.987 |
| boynton2020 | 180217 | 0.87 | 5599.8 | 1.057 | 2.114 |
| yang2022 | 87540 | 0.83 | 2203.9 | 1.167 | 2.334 |
| arabjuneghani2022 | 68251 | 1.0 | 1283.1 | 1.178 | 2.355 |
| zhang2022 | 87657 | 0.8 | 1185.3 | 1.594 | 3.188 |
| xu2022 | 61882 | 0.9 | 508.1 | 3.300 | 6.601 |

mao2022 agrees because K ~ 1/w_s + 1/(2 w_g) = 93750 /m for its 16/16/16 um strips: an edge-crowding factor of about 2
over the two-face uniform value cancels the factor 1/2 of the one-sided limit. For comparison, the semi-infinite R' at
0.1 GHz (K R_s, my arithmetic: 93155 x 2.957e-3 ohm) is 275 ohm/m, about 5x below R_DC.

## 3. Exact cascade (re-derivation and spot checks)

- Section k from node (V_k, I_k): V(s) = a e^{-gamma s} + b e^{gamma s}, Z0 I(s) = a e^{-gamma s} - b e^{gamma s}, so
  a = (V_k + Z0 I_k)/2 and b = (V_k - Z0 I_k)/2.
- Phase integral: int_0^l V e^{j beta_o (z_k + s)} ds = e^{j beta_o z_k} l [a F((gamma - j beta_o) l) + b B((gamma + j beta_o) l)],
  with F(u) = (1 - e^{-u})/u and B(w) = (e^w - 1)/w.
  - This equals T2 S7.14, since e^w phi(w) = B(w).
  - Source: V_0 = Z_in,0/(Z_s + Z_in,0) and I_0 = 1/(Z_s + Z_in,0).
  - Node update: V_{k+1} = a e^{-gamma l} + b e^{gamma l}, I_{k+1} = V_{k+1}/Z_in,k+1. The short-load fallback
    (a e^{-gamma l} - b e^{gamma l})/Z0 is also correct.
  - Normalization: the same Phi_DC = L Z_L/(Z_s + Z_L) as the uniform line.
- Auditor reference (`casc.py`, stdlib only): K9a / K9b / K9z (600 / 30 / 600 sections) vs the T2 eta_uniform series,
  max |dS21| 8.0e-13 / 4.4e-14 / 6.8e-13 dB.

  | Case | S21 at 50 / 67 / 110 GHz (dB), auditor = T2 | bw3 (GHz) | bw6 (GHz) |
  |---|---|---|---|
  | K9a | -1.113776 / -1.349264 / -1.929345 | 184.789803 | 347.361127 |
  | K9b | -1.110343 / -6.496408 / -2.014133 | 63.757290 | 66.369104 |
  | K9z | -1.113807 / -1.349359 / -1.930236 | 184.164368 | 341.647931 |

- Engine vs auditor reference (`stress.mjs`): 24 points, K9b Z_s 25 ohm with an open load (1e12 ohm) and L 5.5 mm;
  K9a 50/75 ohm, L 7.3333 mm; K9b L 10.37 mm (partial cells); f 0.5-110 GHz including 64, 66 and 80 GHz around and
  above f_B 64.909 GHz. Max |d| 1.07e-12 dB.
- Through `runEoResponseStage` (default model): K9b bw3 63.757290 and bw6 66.369104 GHz, warning
  `bragg_frequency_within_3x_of_highest_evaluated_frequency`; K9a/K9z no warning.
- No shipped periodic config exercises the cascade: none of the 12 has `line.dielectric_loss_model`, so eo_response is
  blocked there (unchanged from round 1; informational).

## 4. Reference tags (S1) and loaded lengths (S4)

- `tags.mjs` joins every response target with its devices.csv row:
  - All 11 tagged configs match `bw3db_reference = low_freq_unstated`: arabjuneghani2022-b, boynton2020-a,
    chen2022-c (via paper_id; the row carries eo_rolloff 1.4 @ 67), deng2026-a (x2), li2026aa-d, liu2021-a, mao2022-a,
    meng2023-a, wang2022a-a, wang2025-a, xue2026-b.
  - arabjuneghani2022 predicted bw3 has no row; `unspecified` is consistent with the text-only basis.
  - The numeric references match their rows: kharel2021-b 1ghz -> 1, renaud2023 other/3 -> 3, valdez2023-cn1 1ghz -> 1,
    xu2022 other/1.5 -> 1.5, yang2022 / wang2024a other/0.01 -> 0.01, zhang2022 1ghz -> 1.
  - zhang2024 and anjali2025 rows are `dc`, untagged, so the DC default applies.
  - Exception: han2023-a (row `low_freq_unstated`) has no tag (R2-6).
- S4, from the paper texts:
  - kharel2021 text.md:135 gives "(g, h, s, t, r, c) = (5, 6, 2, 6, 45, 5) um": r 45 + c 5 = period 50.
  - xue2026 text.md:242 gives "(W, g, H, S, T, R, C) = (50, 5, 5.2, 2, 5, 45, 5) um": R 45 + C 5 = 50.
  - liu2021 text.md:245 gives "50 um period and 90% duty cycle", i.e. 45 um.
  - The old 39/40/40 would leave unloaded lengths of 11/10/10 um, which contradicts the stated gaps c/C of 5 um.
    The engine run confirms both cuts carry identical rails (`railsIdentical: true`) and differ only by the 4 pads.
    45 is correct.

## 5. Gates (reproduced, sequential)

| Gate | Claimed | Auditor | Note |
|---|---|---|---|
| engine `npm test` | 304: 301 pass, 0 fail, 2 skip, 1 todo | 304: 300 pass, 1 fail, 2 skip (K5, K7 full), 1 todo (D5), 77 s | fail = G8 Nedeljkovic, semi-models.test.mjs:64 (S8 lane); see R2-5 |
| S7-related subset (s7-*, eo-rf-runner, library-citations) | - | 61/61 | - |
| `npm run test:reference` | 11/11 | 11/11, 24.9 s | - |
| app `npm test` | 63/63 | 63/63 (6 files) | - |
| app `npm run check` | 0/0 | 465 files, 0 errors, 0 warnings | - |
| app `npm run build` | OK | OK | - |
| app `npm run smoke` | 47 PASS | exit 0, 47 PASS ("PASS S7: EO response (3 dB 1.22780 GHz) ... dependency stages shown") | - |

mao2022 S2 sensitivity table (DevLog-036) reproduced to all printed digits for the three models: bw3 at DC / 1 / 3 GHz
references; n_RF / Re Z0 at 0.1 and 70 GHz.

## Findings

### R2-1 (Medium) The DC check is read as support for the one-sided slab; it cannot discriminate face models

Evidence:
- DevLog-036 Round 2 results: "with the Wheeler K of this section the one-sided slab ... reproduces the DC resistance;
  the symmetric variant does not."
- The slab f -> 0 limit uses the frozen high-frequency K, so it is not a DC prediction. Across six Wheeler configs the
  one-sided ratio to R_DC is 0.99-3.30 and the symmetric ratio 1.99-6.60 (section 2 table). The mao2022 agreement is
  the edge-crowding factor of about 2 of that geometry.

Fix:
- Remove that sentence from DevLog-036.
- Label `result.rf.dcResistance` as "model f -> 0 limit (frozen high-frequency K) vs uniform-current R_DC; not a
  validity test" (README/SPEC).
- Choose the face model from the current distribution (R2-2), not from this comparison.

### R2-2 (Medium) Face-model guidance missing; for coplanar electrodes the symmetric slab is the consistent choice

Evidence (section 2):
- For coplanar CPW/GSG/GS strips, the quasi-TEM (C0') current is mirror-symmetric about the metal mid-plane.
- With the full-perimeter Wheeler K, one-sided understates the thin-limit R' by up to 2x (exactly 2x for equal faces).
  Symmetric is exact for equal faces.
- SPEC S7 round 2 lists both variants with no guidance.
- Open limitations of the slab models: frozen K below f_lat ~ 1/(pi mu0 sigma t w) (order-of-magnitude estimate, sub-GHz
  for the present configs), and sidewall surfaces treated with t_eff.

Fix:
- SPEC/README guidance: `slab_symmetric` for coplanar electrodes; `slab_one_sided` only for one-face current
  (parallel plates, microstrip-like, electrode over a ground or conductive layer).
- Optionally split K into horizontal and vertical faces (two Wheeler recess solves) and give the vertical faces the
  semi-infinite Z_s.

### R2-3 (Low) Selecting a slab model removes the thin-conductor diagnostic with no replacement

Evidence:
- run.mjs:284 sets `thinConductorBelowGhz` only for semi_infinite. Slab runs therefore report clean pass/fail even
  when [f_ref, f] reaches below f_lat, where the frozen K is off by the R2-1 ratios.
- No config selects a slab model today, so there is no present effect.

Fix: a slab diagnostic (e.g. `slab_frozen_geometry_factor_below_lateral_relaxation`) when the band reaches below an
f_lat estimate. Alternatively flag DC and <= 1 GHz references under any conductor model until K(f) relaxes to R_DC.

### R2-4 (Low) With a slab model and Z_S != Z_L the DC normalization is not the model's f -> 0 limit

Evidence:
- Phi_DC = L Z_L/(Z_s + Z_L) is lossless, and the bracket start assumes 0 dB at f = 0.
- With R(0) = R'(0) L the model gives H(0) = (Z_L + R/2)(Z_s + Z_L)/(Z_L (Z_s + Z_L + R)).
  This is exactly 1 for Z_s = Z_L, but not otherwise.
- li2026aa and wang2022a (Z_L 38 ohm) would sit at +0.205 / +0.353 dB and +0.200 / +0.345 dB (one-sided / symmetric,
  R(0) from the model limits 15.7 / 31.4 and 15.2 / 30.4 ohm).
- Only arises when a slab model is opted into.

Fix: when R'(0) > 0, normalize by the model's DC (or a small-f) value and start the bracket there, or state the offset
in the result.

### R2-5 (Low, process) Full engine suite currently red from the concurrent S8 lane, not from T1

Evidence:
- `npm test`: 300 pass, 1 fail (G8 Nedeljkovic 2011 Table 2, tests/semi-models.test.mjs:64, "Missing expected
  exception ... /not covered/").
- engine/src/semi/{models,config,device,solver,optics}.mjs were modified 00:48-00:54 PDT, after T1's gate run
  (00:36-00:40). Re-running semi-models alone at 00:55 still fails.
- The S7 subset passes 61/61. T1's 301-pass claim is consistent with the tree it ran on.

Fix: the S8 lane must re-run the full suite before its gate claim. The orchestrator should re-run the full suite after
both lanes settle.

### R2-6 (Low, data) Reference tag and traceability nits

- sims/han2023 `bw3db_ghz` (row han2023-a `low_freq_unstated`) has no `reference` tag. It is `comparable: false`, so
  there is no effect now, but it would be pass/fail against DC if the comparability flag were lifted.
- chen2022 roll-off targets cite `paper_id` only, although devices.csv chen2022-c holds the 67 GHz value
  (eo_rolloff_db 1.4). Adding `device_id: chen2022-c` to the 67 GHz target would make the tag check mechanical.

### R2-7 (Info) Exact cascade covered only by tests

None of the 12 periodic configs declares `line.dielectric_loss_model`, so the default `exact_cascade` path never runs
on a shipped config. It is verified here and in s7-cascade against independent data.

## Recommendation: default conductor thickness model

1. Short term (now): keep `semi_infinite` as the engine default and do not switch configs.
   - A default change moves every Wheeler config's low-frequency response. mao2022, for example: bw3 at the 3 GHz
     reference goes from 57.48 to 63.54 GHz with `slab_symmetric`, and DC-referenced 52.78 to 53.70 GHz.
   - The semi_infinite diagnostic already flags the affected targets.
2. Target default: `slab_symmetric` for coplanar electrode lines (all present `skin_effect_wheeler` configs are coplanar
   CPW/GSG/GS on a dielectric stack). `slab_one_sided` only when the config declares one-face current.
   - Physics: exact high-frequency limit, correct through-thickness thin behaviour for equal face currents, and finite
     internal inductance (no f^-1/2 divergence).
   - Do not choose one-sided because of the mao2022 DC agreement (R2-1).
   - Switch after: the R2-3 replacement diagnostic, the R2-4 normalization, a full regression and re-baselining of the
     Wheeler configs, and preferably the horizontal/vertical K split (R2-2).
3. Longer term: a frequency-dependent K (or a blend to R_DC below f_lat from a primary reference). Only that makes the
   0.1-1 GHz part of the sweep and the DC normalization physical.
