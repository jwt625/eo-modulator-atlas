---
title: Fresh-context audit of lane T1 (S7 eo_response and loaded_line) against the T2 references K8/K9, papers and gates
date: 2026-10-16 (started 23:58 PDT 2026-10-15, written 00:16-00:25 PDT)
auditor: fresh-context Claude subagent (did not write the T1 or T2 code)
scope: engine/src/eo-response.mjs, engine/src/loaded-line.mjs, their wiring in stages/run/config, engine/tests/s7-*, sims/SPEC.md S7, DevLog-036 claims; T2 references validation/reference/s7-{limits,K8,K9}.json (DevLog-037); Alferness 1982 Sec. VI.B; Shin, Sakamoto, Dagli 2011 Sec. II; paper comparisons; regression vs HEAD 17fa2fb; engine/app gates; S7 UI screenshots
---

# S7 audit (lane T1), 2026-10-16

Read-only on code, configs and references. Only file written in the repo: this report. Scratch (session scratchpad,
subfolder `s7audit/`): comparison script `compare.mjs` and its output, CLI outputs, gate logs, HEAD / working-tree
overlays for the regression (removed after the run), smoke screenshots (reviewed, removed). No state-changing git
commands (`git archive HEAD` to scratch and `git status` only).

## Verdict

- The S7 numerics are correct: on the exact T2 inputs the engine reproduces K8 (8 variants) and K9 (a, b, z) to
  round-off on every compared quantity (|S21_EO| on the 112-point grid, bw3/bw6, Bloch n, alpha, Z_B, Bragg,
  quasi-static limits). Signs, normalization and dB/bandwidth definitions match the derivation and Alferness 1982.
- Regression claim holds on 5 configs (no HEAD numeric value changed). Gate claims reproduced exactly.
- No code defect in the S7 formulas. The findings are in the target rules and the comparison policy (what the
  response targets are allowed to be compared with) and in config conventions: S1, S2 Medium; S3-S9 Low.
- Paper discrepancies (zhang2022 bw3, arabjuneghani2022 roll-off, xu2022 bw3) are physical / convention
  differences, not engine defects (section 4).

## 1. Engine vs T2 references (exact reference inputs)

Method: `compare.mjs` imports the engine functions (`responseAt`, `firstCrossing`, `createRfLine`, `propagationAt`,
`createLoadedLine`, `blochAt`, `runEoResponseStage`) and evaluates the reference inputs from `s7-K8.json` /
`s7-K9.json`. K8 primary (constant real Zc, alpha = a0 sqrt(f), 8.686 dB/Np): gamma, Z0 built by hand and passed
to `responseAt`; K8 RLGC and lossless: through `createRfLine` (`rprime_reference`, r1 = 2 Z0 a0 100/8.686 ohm/m at
1 GHz, internal inductance off) and the full `runEoResponseStage`. K9: both sections `createRfLine({cPul, lPul,
rprime_reference r1 at 1 GHz, dielectric none})`, `createLoadedLine`, `runEoResponseStage(kind periodic, fLimitHz =
Bragg)`. Bandwidths on a 0.01 GHz grid to 400 GHz + engine bisection. `nice -n 10 node --max-old-space-size=1536`.

### K8 (uniform line, K4 section, 50 ohm, L = 5 and 10 mm)

| Variant | max abs dS21 on grid (dB) | max abs dm (complex) | bw3 engine / ref (GHz) | bw6 engine / ref (GHz) | S21 at 67 GHz engine = ref (dB) |
|---|---|---|---|---|---|
| L5 primary | 2.8e-14 | 1.8e-15 | 69.893303 / 69.893303 | 108.303380 / 108.303380 | -2.833060 |
| L5 lossless (also stage path) | 1.5e-14 | 8.0e-16 | 81.995548 / 81.995548 | 116.966516 / 116.966516 | -2.117283 |
| L5 RLGC (stage path) | 6.5e-14 | 3.8e-15 | 69.897607 / 69.897607 | 108.365036 / 108.365036 | -2.827005 |
| L5 matched (Z_S = Z_L = Z0) | 2.9e-14 | 1.8e-15 | 76.969762 / 76.969762 | 112.284215 / 112.284215 | -2.388363 |
| L10 primary | 7.8e-14 | 1.0e-15 | 32.576288 / 32.576288 | 52.440791 / 52.440791 | -9.495608 |
| L10 lossless (stage) | 1.4e-13 | 3.4e-15 | 40.997774 / 40.997774 | 58.483258 / 58.483258 | -8.141140 |
| L10 RLGC (stage) | 6.2e-14 | 1.6e-15 | 32.669258 / 32.669258 | 52.470631 / 52.470631 | -9.488585 |
| L10 matched | 7.5e-14 | 1.1e-15 | 36.114085 / 36.114085 | 54.446775 / 54.446775 | -9.088799 |

All bandwidth differences 2e-9 to 2.5e-8 GHz (bisection / brentq tolerances). The complex m (phase included) agrees,
so the sign of the walk-off term (gamma - j beta_o) and of the reflected term are the same in both derivations.

### K9 (T-rail cell, chen2022-like period; illustrative sections)

| Case | Bragg engine / ref (GHz) | n_B, alpha_B, Z_B below Bragg (max abs diff on grid) | quasi-static n / Z | S21 engine vs ref Bloch-homogenised | S21 engine vs ref exact cascade | bw3 engine / ref cascade | bw6 engine / ref cascade |
|---|---|---|---|---|---|---|---|
| K9a 50/36 um | 1298.171606 / 1298.171606 (3.7e-13 rel) | 1.8e-15, 9.2e-13 dB/cm, 5.0e-14 ohm | 2.160000000 / 52.300000 | 4.4e-13 dB | 4.55e-3 dB (110 GHz) | 183.899 / 184.790 | 345.203 / 347.361 |
| K9b 1000/720 um | 64.908580 / 64.908580 (3.7e-13 rel) | 1.3e-15, 4.8e-14 dB/cm, 9.2e-14 ohm (66 of 112 points below Bragg) | 2.160000000 / 52.300000 | 3.5e-14 dB | 4.93 dB (64 GHz) | 57.821 / 63.757 | 62.933 / 66.369 |
| K9z zero loading | 1387.928049 / 1387.928046 (2.1e-9 rel, tangency, no gap) | 1.8e-15, 1.0e-12 dB/cm, 2.8e-14 ohm | 2.160000000 / 52.300000 | 4.8e-13 dB | 7.6e-13 dB | 184.1644 / 184.1644 | 341.6479 / 341.6479 |

Selected points (engine = reference to the printed digits): K9a 67 GHz n_B 2.16016358, alpha_B 2.946660 dB/cm, Z_B
52.28234 - 0.58424j ohm; K9b 64 GHz (0.986 f_B) n_B 2.23196225, alpha_B 5.050942 dB/cm, Z_B 17.75785 + 5.39746j ohm
(branch and Re Z_B > 0 rule consistent next to the band edge). K9a roll-off targets: engine -1.350946 dB at 67 GHz =
ref homogenised -1.350946; ref cascade -1.349264. Above Bragg the engine reports nothing (`above_bragg`): at K9b 67 GHz
(stopband) the raw `blochAt` equals the reference (n 2.221080, alpha 16.0427 dB/cm, Z_B 6.9232 + 29.3875j); at 110 GHz
(second passband) the raw principal branch folds (n -0.5715 vs ref 2.1539); not user-facing because every caller
guards f >= f_Bragg (stages.mjs:285, 298, 301; fLimitHz in run.mjs).

Explained differences (all definition or model level, stated in DevLog-036/037):

- Engine eo_response on a periodic line = the reference `bloch_homogenised` variant (S7.5 with gamma_B, Z_B), not the
  exact cascade (S7.14). Far below Bragg (K9a, f_B / f >= 3.5 at 400 GHz) the difference is <= 0.0045 dB to 110 GHz
  and 0.5 % / 0.6 % in bw3 / bw6. Near Bragg (K9b) it is up to 4.9 dB and -9.3 % in bw3 (finding S5).
- K8 primary vs RLGC (constant real Zc vs R' = 2 Z0 alpha): both reproduced; difference 0.004-0.09 GHz in bw3, as T2
  states. The engine's own lines are RLGC (complex Z0).
- DC normalization Z_L/(Z_S + Z_L), electrical dB 20 log10 H, first downward crossing: identical in both.

## 2. Definitions

- Line voltage V(z) = V+ [e^{-gamma z} + Gamma_L e^{-2 gamma L} e^{gamma z}], V+ = V_s Z0/(Z0 + Z_s)/(1 - Gamma_s
  Gamma_L e^{-2 gamma L}) (eo-response.mjs:72-88): the standard terminated-line solution (checked: V(0) + Z_s I(0) =
  V_s). Phase integral int V(z) e^{+j beta_o z} dz with beta_o = omega n_g / c: a photon entering at t0 is at z at
  t0 + n_g z / c, so the forward wave e^{j(omega t - beta z)} gives e^{-(gamma - j beta_o) z} (co-propagating
  walk-off) and the reflected wave e^{+(gamma + j beta_o) z}; kernels (1 - e^{-u})/u and (e^{w} - 1)/w with series
  below 1e-6 (eo-response.mjs:42-58). Signs correct (K8 complex m agreement above).
- Alferness 1982 p. 1127 (PDF p. 7): eqs. (18)-(20) use the optical effective index N_o and a matched line; the
  engine uses n_g (stated, standard for sideband walk-off) and adds reflections. Eq. (21) is the 50 % point of the
  integrated phase (electrical -6 dB, approximately: x = 2 gives |sinc| 0.455, T2 L2); "drive power must be
  doubled" (same paragraph) is the electrical -3 dB definition the engine uses for bw3db. Eq. (22) uses
  alpha_m = a/4.3 (dB/cm read with 10 log10 e); the engine and T2 use the field-amplitude 8.686 dB/Np of convention
  (cc). Relevant to arabjuneghani2022 (section 4).
- Normalization: H = Phi/Phi_DC, Phi_DC = L Z_L/(Z_s + Z_L) (eo-response.mjs:90-95): the lossless lumped DC limit;
  with the sqrt(f) conductor laws R'(0) = 0 so H(f -> 0) -> 1 (test s7-eo-response "low-frequency limit"). DC
  electrode resistance is not modelled (DevLog-036 open item; warning `eo_response_dc_limit_reference_lumped_lossless_dc`).
- bw3db: first f with 20 log10 |H/H(f_ref)| <= -3 (|H| 0.7079); bw6db: <= -6 (|H| 0.5012 = optical 3 dB). The data
  schema (`data/schema/devices.schema.yaml` convention (t)) defines bw_method and the reference, not the dB type;
  for the evaluated rows bw_method is `eo_s21` (boynton2020-a, mao2022-a, yang2022-a, xu2022-a) or `sideband`
  (zhang2022-a, arabjuneghani2022-b); both are electrical-dB measurements (LCA S21 is RF power; sideband/carrier
  power scales as J1^2 ~ (m/2)^2, i.e. 20 log10 m), so the engine convention is the right one. DevLog-036 notes the
  sideband dB convention per paper is not verified; agreed, not stored in the schema.
- reference_ghz: H(f_ref) is evaluated off-grid; the search starts at the first grid point above f_ref
  (stages.mjs:384-388). `eo_rolloff_db` requires reference_ghz < at_ghz (config.mjs:363). The plot overlay labels
  referenced targets "(curve: DC limit)" (labels.ts:25), which is honest. Edge case in S7.
- Rows evaluated with the DC default although the paper's reference is `low_freq_unstated`: boynton2020-a,
  mao2022-a, arabjuneghani2022-b (finding S1).

## 3. Loaded-line model

- Shin et al. 2011 Sec. II p. 48-50: T rails load the line capacitively, "the inductance of the loaded line is almost
  identical to its unloaded value" (p. 48); eqs. (4), (5): uniform line with modified capacitance; eq. (12): loss
  of a uniform line with that capacitance, conductor R of the unloaded line, T-rail resistance neglected (eq. (9)-(11)).
  Engine (stages.mjs:276-295): with loading conductors (loaded-cut electrode names absent from the unloaded cut),
  L'_L = L'_U and the loaded section reuses the unloaded conductor model (`conductorOverride: bu.conductor`, which is
  the Wheeler-resolved geometry factor or the unloaded perimeters); C'_L and G'_L from the loaded cut. This is the
  two-section form of Shin's homogenised line; the quasi-static limit c sqrt(L'_U C'_avg) is Shin eq. (15) with
  C_tot = C_U + c_T/p, c_T ~ (C'_L - C'_U) l_L. Correct. Reshaped-rail configs (valdez type) use each cut's own L'
  and conductor model (outside Shin; labelled).
- Cell symmetric [U(l_U/2)] [L(l_L)] [U(l_U/2)]; (A+D)/2 - 1 formed from half-angle sinh terms (loaded-line.mjs:62-76),
  gamma_B p = 2 asinh(sqrt(t/2)): no cancellation (K9 at 0.1 GHz agrees to 1.8e-15 in n_B; T2 needed the same
  care). Branch: Re >= 0 with rounding-level fixes (loaded-line.mjs:77-82); Z_B = principal sqrt(B/C). Consistent
  with T2's Re gamma_B > 0 / Re Z_B > 0 rule everywhere below Bragg, including 0.986 f_B on K9b.
- Bragg: scan of the lossless half trace to 4x c/(2 p n_B0), bisection, tangency (no gap) by golden section; K9z
  tangency 2.1e-9 rel. Lossy values at or above the lossless f_B are omitted (fLimitHz = lossless Bragg).
- Quasi-static limits: exact (2.160000000 / 52.300000 for all three K9 cells).
- 12 periodic configs (period, loaded length, cuts; T1 did not edit these fields): chen2022 50/36, kharel2021 50/39,
  li2026ba 35/32, liu2021 50/40, liu2025b 50/45, valdez2022 25/5 (loaded = slot cut `geometry`, unloaded =
  `protrusion`), valdez2023 25/5 (same), valdez2023a 20/15 (unloaded `recessed`), wang2022 50/33, wang2025 50/47,
  xue2026 50/40, zhang2024 20/18. Each has a provenance locator; the cuts exist and run. Convention inconsistency in
  the stem treatment: finding S4. valdez2022/2023 name the 80 % rail section "unloaded" and the 20 % slot section
  "loaded"; with no loading conductors the labels only move the Z_B reference plane (Bloch n, Bragg, quasi-static
  values unaffected). The EO overlap of the run section is applied over the whole length (finding S6).

## 4. Paper comparison sanity (engine runs `--stages eo_response`, current tree)

| Config | Engine facts | Assessment |
|---|---|---|
| zhang2022 bw3 65.7 vs 170 GHz (ref 1 GHz), bw6 287.5 vs 295 | Z0 40.3-41.3 ohm above 30 GHz (paper z0 target 41.5 at 250 GHz: pass), mismatch level 20 log10(2 Z0/(Z0 + 50)) = -0.99 dB reached by ~10 GHz (quarter-wave c/(4 n L) ~ 5.4 GHz); alpha 16.6 vs paper 13 dB/cm at 250 GHz (rf_loss target fails, +28 %); S21 -2.73 dB at 49 GHz, -3.10 at 69, -4.39 at 150, -6.06 at 290 GHz: slope ~0.012-0.017 dB/GHz, so a 1 dB offset moves the -3 dB crossing by > 60 GHz | Physical and ill-conditioned, not a defect. The 1 GHz reference is effectively DC (-0.047 dB). Any residual loss excess or impedance-mismatch difference relative to the paper's curve (which the paper computes from measured S-parameters, devices.csv note) shifts bw3 strongly; bw6 is the robust comparison. |
| "mismatched long lines drop 1-2 dB within a few GHz" | xu2022: Z0 34.7 ohm -> level -1.73 dB; S21 -1.44 dB at 1.6 GHz, -2.40 at 3.1 GHz | Physical (mismatch level -0.8 to -1.7 dB for Z0 42-35 ohm), but the first few GHz also carry the low-frequency conductor-model artefact (S2): n_RF 2.80 and Z0 58 ohm at 0.1 GHz vs 1.67 / 34.7 asymptotic. |
| xu2022 bw3 8.4 GHz (ref 1.5) vs 110 | n_RF 1.673 vs n_g 2.167 (uniform model without the paper's capacitive loading), first sinc null c/(L dn) = 25.8 GHz for 23.5 mm; S21 -21 dB at 30 GHz | Physical for the modelled (wrong-topology) line; `comparable: false` correctly set. DevLog-036 attributes the low bw mainly to electrical length and Z0; the dominant cause is the velocity mismatch (S8). |
| arabjuneghani2022 roll-off -1.16 vs -2.0 at 100 GHz | Z0 52.4 ohm, n_RF 2.19 vs n_g 2.23, alpha 5.28 dB/cm at 100 GHz (engine 4.32 vs paper 3.6 at 67: pass); loss-only (1 - e^-aL)/aL with engine alpha: -1.29 dB; dielectric_loss_model none | Engine internally consistent. With the paper's own alpha0 0.44 dB/cm/sqrt(GHz) (text.md p. 4) the loss-only roll-off at 100 GHz is -1.08 dB with 8.686 dB/Np and -2.11 dB with Alferness' a/4.343. The paper's measured -2.0 dB (LCA + extension setup, "perfectly matched" by its analytical model ref. [26]) is therefore reproduced only by the factor-2 convention or by loss/launch effects the model omits (Si substrate dielectric loss declared none, probes). Not decidable from the repo; not an engine defect (S3). |

## 5. Regression and gates

- Regression (5 configs: boynton2020, mao2022, zhang2022, yang2022 with `--stages optical_mode,eo_overlap,rf_line`;
  kharel2021 `--stages optical_mode`): HEAD 17fa2fb tree (`git archive`) vs working tree, both with the HEAD
  `engine/data/materials.json` (excludes the T3 library change, as T1 did). 5884 HEAD leaf values compared
  (relative 1e-12): 0 numeric differences; 9 string differences, all target `reason` texts ("... not implemented."
  -> "(not run)."; kharel2021 periodic reasons now name the loaded_line stage). Claim holds.
- Engine `npm test` (sequential, nice 10, 1536 MB): 274 tests, 271 pass, 0 fail, 2 skipped, 1 todo (D5), 62 s.
- `npm run test:reference`: 11/11 pass, 25 s.
- App: `npm test` 63/63 (6 files); `npm run check` 465 files, 0 errors, 0 warnings; `npm run build` OK;
  `npm run smoke` exit 0, 47 PASS including "PASS S7: EO response (6 dB none GHz) and chen2022 loaded line
  (n_B0 2.10846)". No smoke process left running. All claims reproduced.

## 6. UI (smoke screenshots sim-eo-response, sim-loaded-line, reviewed)

- EO Response: y axis `rf.S21EO_dB (dB)`, x `Frequency (GHz)`, "Solution: Compute", paper target diamond with
  tooltip (referenced targets say "curve: DC limit"). Units correct.
- Loaded Line: `rf.nB (1)` and `real(rf.ZB) (ohm)` vs GHz; panel lists per-section C', C0', L', period average,
  quasi-static n 2.1085 / Z 58.888 ohm / Bragg 1320.3 GHz, the Shin reference and "Lossless Bloch quantities only"
  with the blocking reason. No fake capability: blocked stages are shown as blocked with the engine message.
- Minor: the stage checkbox row shows `RF line` unchecked while rf_line ran as an eo_response dependency (its results
  page is shown); the Loaded Line plot legend does not say lossless when only the lossless sweep exists (the panel
  does). See S9.

## Findings

### S1 (Medium) Response targets of `low_freq_unstated` rows are pass/fail against the DC limit, and the verdict depends on the unknown reference

Evidence: boynton2020-a, mao2022-a, arabjuneghani2022-b have `bw3db_reference: low_freq_unstated` (devices.csv);
their configs carry no `reference_ghz`, so the engine evaluates against the DC limit (stages.mjs:384-388, run.mjs:71-75).
mao2022 (Z0 42.1 ohm, mismatch level -0.78 dB) with the same run and extra audit-only targets: bw3 52.78 GHz (DC,
reported pass vs 60 +-15 %), 52.95 (ref 1 GHz), 57.48 (ref 3 GHz), no crossing to the 70 GHz sweep end (ref 6 GHz).
A plateau reference anywhere between 1 and 6 GHz is consistent with "low frequency"; the pass is not robust.
Fix: for `low_freq_unstated` (and `unspecified`) references, do not issue pass/fail from the DC limit alone: evaluate
over a stated reference window (min/max of the metric for f_ref in a window the config declares with a provenance
note) or mark `not_evaluated` / diagnostic when the response at the window ends differs from DC by more than the
target tolerance allows. Config-side alternative: read the plateau frequency from each paper's plot
(DevLog-036 open item) before evaluating.

### S2 (Medium) The response normalization band is computed where the conductor model is flagged invalid, and the DC-referenced bandwidths depend on it

Evidence: every evaluated uniform config (boynton2020 0.87 um, yang2022 0.83 um, mao2022 1.5 um, zhang2022, arabjuneghani2022; plus xu2022) carries `conductor_thickness_below_3_skin_depths_surface_resistance_invalid`
(t = 3 delta at 61 GHz zhang2022 Cu 0.8 um, 69 GHz xu2022 Au 0.9 um, 50 GHz arabjuneghani2022 1 um; mao2022 1.5 um).
Below that frequency R' is the sqrt(f) surface law and, with `include_internal_inductance: true`, L_int = R'/omega
diverges as f^-1/2: n_RF 3.48 / Z0 61.3 ohm at 0.1 GHz (zhang2022, asymptotic 2.29 / 40.3), 3.73 / 66.5 ohm
(mao2022, 2.41 / 43.1), 2.80 / 58.0 ohm (xu2022, 1.67 / 34.7), 3.02 / 72.3 ohm (arabjuneghani2022, 2.18 / 52.2).
This shapes the DC -> plateau transition (arabjuneghani2022 shows a +0.15 dB bump at 5 GHz). Sensitivity (not a
truth claim): mao2022 with `include_internal_inductance: false` gives bw3 39.3 GHz (DC) instead of 52.8 (and 41.5 /
48.4 / 63.9 GHz for ref 1 / 3 / 6 GHz), i.e. the reported pass would become a fail. The rf_line model is
pre-existing; S7 is where it decides pass/fail through the normalization. The DC electrode resistance is also absent
(stated). Fix: when the thickness warning applies between f_ref and the crossing, attach a target diagnostic (or
`not_evaluated`) rather than a clean pass/fail; longer term a thin-conductor low-frequency R'(f), L_int(f) model
(uniform-current R_DC and saturating internal inductance below t ~ delta) from a primary reference.

### S3 (Low) `dielectric_loss_model: none` still yields an "independent" response verdict

Evidence: responseReason (run.mjs:36-47) rejects conductor `none` but not dielectric `none`; arabjuneghani2022
(Si substrate, paper says its 3.6 dB/cm combines conductor and dielectric loss) is reported `fail` -1.16 vs -2.0;
boynton2020, mao2022, yang2022 are reported pass with dielectric none. Fix: label the verdict (diagnostic
"dielectric loss declared none") or require an explicit justification field; same rule for `rf_loss_db_per_cm`.

### S4 (Low) Inconsistent loaded-length convention across the periodic configs

Evidence: kharel2021 (45 - 6 = 39), liu2021 (45 - 5 = 40), xue2026 (45 - 5 = 40) subtract the stem width from the
T-head length; li2026ba (bar length 32 of 35), liu2025b (45 of 50), wang2025 (47 of 50), zhang2024 (18 of 20) use
the head/bar length. In the two-cut model the stem region still carries the T head (it is loaded, with extra stem
capacitance), so subtracting it under-counts the loaded fraction. Effect with 45 um (from the engine's own C'_U,
C'_L, L'): kharel2021 n_B0 2.2064 -> 2.2679, Z_B0 44.22 -> 43.02 ohm; liu2021 2.2052 -> 2.2611, 46.47 -> 45.32;
xue2026 2.1712 -> 2.2105, 52.05 -> 51.13. No target status changes (all within tolerance either way). Fix: one rule
in SPEC (data lane) and the three configs aligned or the exception documented.

### S5 (Low) Bloch-homogenised response is inaccurate approaching Bragg, without a warning

Evidence: K9b bw3 57.82 (engine) vs 63.76 GHz (exact cascade), bw6 62.93 vs 66.37; |dS21| up to 4.93 dB at 64 GHz
(0.986 f_B). The only warning is `eo_response_sweep_reaches_bragg_frequency_values_omitted` (sweep reaching f_B); a
sweep ending below f_B gets none. Current configs: Bragg >= ~1300 GHz for 50 um periods, so no present impact.
Fix: warn when a crossing or target frequency exceeds a stated fraction of f_B, or implement the exact cascade
(T2 S7.14) for periodic lines.

### S6 (Low) Periodic-line Vpi and EO weight use the run-section overlap over the whole length without a result label

Evidence: `vpiDcV` from eo_overlap of `geometry` (run.mjs:258) drives `vpiRfV` for periodic lines; the loaded
fraction l_L/p is 0.2-0.94 across the 12 configs; DevLog-036 lists the limitation but `LOADED_LINE_LIMITATIONS`
(stages.mjs:229-235) and the eo_response warnings do not. T2 K9 eta variants show the normalized response is
insensitive (<= 0.93 dB at 67 GHz for K9b, 0.0006 dB for K9a), the absolute Vpi is not. Fix: add a label
(e.g. `eo_overlap_of_run_section_applied_over_full_period`) and optionally weight the two cuts.

### S7 (Low) Bandwidth search cannot bracket between f_ref (or DC) and the first grid point

Evidence: stages.mjs:384-395 searches from the first grid point above f_ref; if that point is already at or below the
threshold the target is `not_evaluated` ("already below the threshold at the search start") although H(f_ref) = 0 dB
brackets the crossing; same for the DC case at the sweep start. Fix: bracket [f_ref (or a small f > 0), first grid
point] before scanning.

### S8 (Low, docs/tests) Small inaccuracies

- DevLog-036 Paper comparison: xu2022's low bw3 is dominated by the velocity mismatch of the unloaded uniform model
  (n_RF 1.673 vs n_g 2.167, first null 25.8 GHz), not mainly by electrical length / Z0.
- engine/tests/s7-eo-response.test.mjs:125 comment "|sin x / x| = 10^(-3/20) at x = 1.39156": the root is
  1.3893486 (sinc(1.39156) = 0.70711 = 1/sqrt 2); the test computes the root itself, so only the comment is wrong.
- app/scripts/smoke.mjs S7 step asserts browser = Node for bw6 on a fixture with no 6 dB crossing ("6 dB none GHz"),
  so a found bandwidth is never compared in the browser.
- engine/package.json description still says "loaded line and EO response recognised, not implemented" (listed in
  DevLog-036 open items).

### S9 (Low, UI) Dependency and lossless state not visible in the plot controls

Evidence: sim-eo-response screenshot: `RF line` checkbox unchecked while the rf_line results (added as a dependency)
are shown; sim-loaded-line: legend `rf.nB (1)` without "lossless" when only the lossless Bloch sweep exists (the
side panel says so). Fix: show auto-added stages as checked/disabled with a tip; mark lossless Bloch series in the
legend or dataset label.

## Process notes (auditor)

- Deviation: two short mao2022 CLI runs (~5 s each, < 0.6 GB) ran while the engine test suite was running in the
  background, i.e. two heavy processes overlapped for seconds. Everything else was sequential.
- Deviation: PDF text extraction used `uv run --no-project --with pypdf` (ephemeral environment, pypdf fetched from
  PyPI into the uv cache, no personal data sent) because no PDF tool is installed and the validation project has no
  PDF library.
- Nothing left running; scratch overlays and screenshots removed; repo unchanged except this file.
