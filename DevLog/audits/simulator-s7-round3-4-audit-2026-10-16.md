---
title: Fresh-context audit of lane T1 rounds 3 and 4 (S7) - symmetric slab default on 33 coplanar configs, lateral-relaxation and slab-limits diagnostics, model-DC normalization, Si junction-loaded TWE response
date: 2026-10-16 (started 01:29 PDT, written 01:50 PDT)
auditor: fresh-context Claude subagent (did not write the T1 code)
scope: DevLog/audits/simulator-s7-round2-audit-2026-10-16.md (R2-1..R2-7); DevLog-036 "Round 3", "Round 4 plan", "Round 4 results" (incl. run.mjs diffs); engine/src/{rf-line,eo-response,loaded-line,stages,run}.mjs (S7 and S7 x S8 parts); engine/tests/s7-*.test.mjs (incl. s7-semi-twe); sims/SPEC.md S7 and "S7 x S8"; the 33 skin_effect_wheeler configs; Shin, Sakamoto, Dagli, JLT 29, 48 (2011) (local PDF, Fig. 2, eqs. (1)-(5), pp. 49-50); DevLog-039 D4 and the perLength contract; engine and app gates
---

# S7 rounds 3-4 audit (lane T1), 2026-10-16

Read-only on code, configs and references. The only repo file written is this report. Scratch: session scratchpad
`r34audit/`. It holds the auditor scripts (`coplanar*.mjs`, `flat.mjs`, `ref.py` + `engine_dump.mjs`, `lumped.py` +
`engine_dump2.mjs`, `conv.py`, `regress.mjs`, `dcr.mjs`, `off.mjs`, `twe_e2e.mjs`), their outputs, and timestamped gate
logs. Rendered PDF page crops were read and then removed. `npm run build` / `smoke` regenerated the git-ignored
`app/build/` and `app/static/sims/`. No git state change. All runs were sequential under `nice -n 10` with Node
`--max-old-space-size=1536` (largest RSS 0.83 GB). Nothing is left running.

Moving tree: the T4 lane (DevLog-039 round 3) edited these files during the audit:
- `engine/src/stages.mjs` 01:36:51 (4 `farScale` lines, R7);
- `run.mjs` and `config.mjs` 01:38:55 (config keys `line.rf_section`, `semiconductor.operating_bias_v`);
- `section.mjs`, `semi-stage.mjs`, `semi/*.mjs` and the reference tests (01:36-01:43).

T7 is editing `app/`. Each gate below records whether files changed during its run.

## Verdict

- Round 3 behaves as claimed:
  - the R2-1 text is corrected, with a `dcResistance.note`;
  - SPEC guidance is in place;
  - the 33 configs are on `slab_symmetric`; every unloaded/run cut is coplanar;
  - the slab-limits and lateral diagnostics are present;
  - the model-DC normalization is derived correctly. Auditor = engine to 1e-6 dB in the offset, and H(1 kHz) = 1 to
    1e-8 dB on 7 cases, including mismatched, open, high-R and junction-loaded lines.
- The round-3 regression table reproduces with no status change. One gap: the DC-referenced headline bandwidths carry
  no lateral diagnostic, although the slab f -> 0 R' is 2.0-6.6x the uniform R_DC (R34-1).
- Round 4 is correct:
  - gamma and Z0 follow Shin eq. (4)/(5), first equalities, with Y'_1 from eq. (3);
  - the junction divider is not double counted. An independent lumped ladder converges to the engine at second order;
  - the lumped RC and short-electrode limits hold;
  - Vpi_DC matches the S8 single-arm differential convention.
- Gaps: a citation page number (R34-4), stale convention strings (R34-5), a missing semi-infinite thin-conductor
  diagnostic on the TWE path (R34-6), and T4's new perLength fields not used (R34-7).
- run.mjs: T1's round-3 and round-4 hunks are byte-identical to the recorded diffs. T4's code is intact. T4 has since
  added its own round-3 hunk (config keys) on top.
- Gates: the S7 subset is green (102/102). The full engine suite (1 fail) and test:reference (1 fail) fail only in S8
  tests from T4's in-progress round 3. App: 72/72, 0/0, build OK, smoke 48 PASS (counts grew with T7).

## 1. Coplanarity and provenance (check 1)

- `coplanar.mjs` parses all 33 `skin_effect_wheeler` configs and lists the y band of every electrode of every cut.
  `coplanar_raw.mjs` handles the 4 configs that do not parse for an unrelated missing RF permittivity (cai2025,
  deng2026, sayem2026c, vanackere2023), using the expanded YAML.
- Result: every run cut and every unloaded cut has a single y band (33/33), with roles s/g only, no Dirichlet side, and
  no conductor other than the electrodes. In 5 configs the T pads share the rail band (kharel2021, li2026ba, liu2025b,
  liu2021, zhang2024).
- Exception to the DevLog wording "every electrode of every cut shares one y band": in the loaded cuts of 4 T-rail
  configs the pads are thinner than the rails (R34-2).

  | Config | Rail band (um) | Pad band (um) |
  |---|---|---|
  | chen2022 | 1.1..2.2 | 1.1..1.3 |
  | wang2025 | 1.1..2.2 | 1.1..1.3 |
  | wang2022 | 1.52..2.62 | 1.52..1.72 |
  | xue2026 | 0.1..1.2 | 0.1..0.7 |

  No effect on R': the T-rail loaded section uses the unloaded conductor model (`conductorOverride: bu.conductor`), and
  the diagnostics read `line.unloaded.strips`.
- Slab thickness t = smallest electrode bounding-box dimension. It equals the metal thickness in every evaluable config
  (`flat.mjs`: e.g. boynton2020 0.87, xu2022 0.9, mao2022 1.5 um).
- Provenance: `line.conductor_thickness_model` provenance is present in 31/33 configs. valdez2022 and valdez2023 have
  only the inline comment, and no `line.conductor_loss_model` provenance either (consistent with the DevLog's "31
  configs"; R34-3).

## 2. Lateral-relaxation estimate (check 2)

- Derivation: for a thin sheet (t << delta) with sheet resistance 1/(sigma t), the quasi-static field-diffusion
  (screening) length of a current redistribution across the sheet is Lambda = 2/(omega mu0 sigma t) = delta^2/t.
  Setting Lambda = w gives f_lat = 1/(pi mu0 sigma t w), which is the code's formula (stages.mjs:487).
  - Equivalent statement: delta^2 = t w.
  - The text says "order-of-magnitude estimate" in the diagnostic, the result note, SPEC and the DevLog. The labelling
    is correct.
- Values (`flat.mjs`, config sigma and t, narrowest signal strip) agree with the DevLog:

  | Config | f_lat (GHz) |
  |---|---|
  | mao2022 | 0.234 |
  | yang2022 | 0.372 |
  | zhang2022 | 0.273 |
  | li2026aa | 0.247 |

  Others: boynton2020 1.39, chen2023 0.965, pan2021 0.727, xue2023 0.465, xu2022 0.0858, lin2025 0.106.
- In every evaluable config the narrowest conductor is a signal strip, so taking the narrowest signal strip loses
  nothing today.
- Caveat (not a defect): the transition is gradual. The frozen-K error persists above f_lat (the high-frequency K has
  a logarithmic edge cutoff that relaxes with Lambda), so "below f_lat" is a lower edge, not a validity bound.

## 3. Model-DC normalization (check 3)

- Independent derivation: at DC the line is a series resistance R'(z) with no shunt current, so I = V_s/(Z_s + Z_L + R_0)
  with R_0 = int_0^L R' dz.
  - V(z) = I (Z_L + int_z^L R'(s) ds).
  - Phi_0 = int_0^L V dz = I (Z_L L + int_0^L s R'(s) ds), by exchanging the order of integration.
  - Open load: I = 0 and V = V_s, so Phi_0 = L.
  - Uniform R': Phi_0/Phi_DC = (Z_L + R_0/2)(Z_s + Z_L)/(Z_L (Z_s + Z_L + R_0)), which is exactly 1 for Z_s = Z_L.
  - The engine's segment accumulation `zr += r (zAcc l + l^2/2)` is the same integral for piecewise-constant R'.
- Numerical test (`ref.py`, stdlib). Inputs:
  - own slab Z_s, K Z_s + j omega L' series, tan delta shunt;
  - own closed form Phi = V+ L [F(u) + Gamma_L e^{-2 gamma L} B(w)];
  - own lumped ladder: N symmetric T cells, voltage taken at the cell centre;
  - each compared with `runEoResponseStage` on the same line. R'(0) is from the slab limit K/(sigma t_eff), not from
    the engine.

| Case | Z_s / Z_L (ohm) | R_0 (ohm), auditor = engine | Offset (dB), auditor = engine | max abs dH vs closed form | max abs dH vs ladder N = 4000 | 20 log10 abs H(1 kHz) |
|---|---|---|---|---|---|---|
| matched, symmetric slab | 50 / 50 | 16.499657 | 0.000000 | 1.6e-10 | 1.9e-5 | -2.8e-9 |
| mismatched, symmetric | 50 / 38 | 16.499657 | +0.213887 | 2.0e-10 | 2.2e-5 | -2.4e-9 |
| mismatched, one-sided | 50 / 38 | 8.249828 | +0.116763 | 1.0e-13 | 2.2e-5 | -2.3e-9 |
| high R (K 4e5, t 0.3 um, 10 mm) | 25 / 75 | 590.401547 | -2.914514 | 5.7e-14 | 4.6e-6 | -1.2e-8 |
| open load | 50 / open | 16.499657 | 0.000000 | 1.8e-13 | 8.4e-6 | -5.8e-9 |
| junction-loaded, matched | 50 / 50 | 19.926052 | 0.000000 | 5.4e-14 | 1.1e-7 | -8.7e-10 |
| junction-loaded, mismatched | 50 / 30 | 19.926052 | +0.558967 | 1.3e-13 | 1.3e-7 | -6.8e-10 |

- The ladder-vs-closed-form residual (mismatched symmetric case) falls 3.4e-4 / 2.2e-5 / 1.3e-6 at N = 1000 / 4000 /
  16000 (`conv.py`). That is second order, so the ladder converges onto the engine.
- Shipped configs (`off.mjs`):
  - li2026aa (50/38 ohm): R_0 31.357 ohm, offset +0.3530 dB;
  - wang2022a (50/38 ohm): R_0 30.419 ohm, offset +0.3453 dB.
  - Both equal the auditor formula and the round-2 predictions (+0.353 / +0.345 dB).

## 4. Round-3 regression reproduction (check 4)

`regress.mjs`: current tree, stages electrostatics + optical_mode + rf_line + eo_response. A = the config with
`semi_infinite` substituted, B = the repo config (`slab_symmetric`).

| Config | Quantity | DevLog A / B | Auditor A / B | Status A = B |
|---|---|---|---|---|
| zhang2022 | bw3 ref 1 GHz (fail) / bw6 ref 1 (pass) | 65.75 / 73.39; 287.53 / 292.56 | 65.749 / 73.392; 287.525 / 292.563 | yes |
| zhang2022 | rf_loss @250 (fail) / z0 @250 (pass) | 16.614 / 16.656; 40.345 / 40.348 | 16.614 / 16.656; 40.345 / 40.348 | yes |
| zhang2022 | DC bw3 / bw6 | 61.50 / 284.84; 70.57 / 284.01 | 61.501 / 284.837; 70.571 / 284.009 | - |
| xu2022 | DC bw3 / bw6 | 4.87 / 12.22; 1.68 / 5.80 | 4.866 / 12.223; 1.679 / 5.801 | - |
| arabjuneghani2022 | rf_loss @67 (pass) | 4.319 / 3.990 | 4.319 / 3.990 | yes |
| mao2022 | DC bw3; unstated-reference set (B) | 52.76 / 53.69; 53.70 / 54.69 / 63.54 | 52.776 / 53.704; 53.704 / 54.688 / 63.539 | yes |
| yang2022 | roll-off @110, ref 0.01 (pass) | -2.656 / -2.549 | -2.655 / -2.547 | yes |
| boynton2020 | DC bw3 / bw6 | 27.13 / 51.46; 20.86 / 54.16 | 27.115 / 51.436; 20.838 / 54.124 | - |

- No status changes. zhang2022, xu2022 and arabjuneghani2022 reproduce to every printed digit.
- mao2022, yang2022 and boynton2020 differ in the 3rd-4th significant digit (<= 0.04 GHz, <= 0.002 dB). This is
  consistent with the DevLog's stated "pre-T3 library" harness: T3 changed the LN library eps^S_11 from 44.0 to 44.3 at
  23:36 on 2026-10-15. Not separately verified by me.
- Removed / added warnings as stated:
  - B has no `conductor_thickness_below_3_skin_depths...`;
  - B has `eo_response_normalized_to_model_dc_limit_with_series_resistance` and
    `slab_model_limits_frozen_geometry_factor_and_sidewalls`;
  - yang2022 (ref 0.01 GHz < f_lat 0.372) carries `band_below_lateral_current_relaxation_estimate` in A and B;
  - zhang2022 (ref 1 GHz > 0.273) does not.

## 5. Junction-loaded line (check 5)

Source check (Shin et al. 2011, rendered pages):
- Fig. 2 (p. 49): series Z_0 = R_0 + j w L_0. Shunt Y_0 = G_0 + j w C_0, in parallel with Y_1 = R_1 in series with 2 dC.
  The text: "R_1 and 2 dC are the resistance and capacitance per unit length", R_1 = R_T p.
- Eqs. (1)-(3): Y_1 = 1/(R_1 + 1/(j w 2 dC)) = j w 2 dC/(1 + j w 2 dC R_1).
- Eqs. (4)/(5): gamma_L = sqrt(Z_0 (Y_0 + Y_1)), Z_L = sqrt(Z_0/(Y_0 + Y_1)), first equalities. The second equalities
  are the R_1 -> 0 form.
- The semiconductor-junction statement ("One example is when doped semiconductor junctions are used as loading
  elements. Even for such cases, the equivalent circuit, as shown in Fig. 2, can still be used ..."; dc resistance of
  doped layers) is on p. 50, not p. 51 (R34-4).
- `junctionPropagationAt` implements exactly this:
  - Y'_j = (w^2 R C^2 + j w C)/(1 + (w R C)^2);
  - gamma = sqrt(Z' (Y' + Y'_j)), Z0 = sqrt(Z'/(Y' + Y'_j));
  - divider 1/(1 + j w R'_j C'_j).

Double counting:
- The branch admittance sets how the line voltage evolves (gamma, Z0, reflections). The divider converts the local line
  voltage into the voltage across C'_j, which carries the depletion charge and thus the phase. These are distinct
  quantities.
- The auditor ladder models each cell's junction branch physically: R'_j/dz in series with C'_j dz, phase from the
  C'_j voltage. It agrees with the engine to 1e-7 at N = 4000 (table above, junction rows). A double-counted divider
  would differ by a factor 1/(1 + j w R C) (0.53 at the 40 GHz f_RC point of these inputs).
- Normalization: Y'_j(0) = 0 and divider(0) = 1, so the DC normalization is unchanged.

Independent limits (`lumped.py`, own formulas; 20 um electrode, C' 1e-10 F/m, L' 4e-7 H/m, R'_j 1.5e-2 ohm m, C'_j
2.5e-10 F/m):
- Open load:
  - lumped V_j/V_s = [1/(1 + Z_s Y_tot)] / (1 + j w R'_j C'_j), times the transit (e^{jx} - 1)/(jx), with
    Y_tot = L (j w C' + j w C'_j/(1 + j w R'_j C'_j));
  - residual <= 0.33 (abs(gamma) L)^2, 1 to 60 GHz;
  - this is the expected size of the distributed correction of an open stub (coth z = 1/z + z/3).
- 50 ohm load: residual <= 0.15 (abs(gamma) L)^2.
- Corner:
  - inputs: C' 1e-14 F/m, C'_j 2e-8 F/m, R'_j 2e-3 ohm m, L 5 um, Z_s 50 ohm;
  - f_c = 1/(2 pi C'_j (Z_s L + R'_j)) = 3.536777 GHz; analytic -3 dB point f_c sqrt(10^0.3 - 1) = 3.528388 GHz;
  - engine bw3 3.528504 GHz, rel +3.3e-5; abs(S21) within 2.5e-4 dB of the single pole over 300 points.
  - Units check: Z_s L + R'_j is in ohm m and C'_j in F/m, giving a time constant in s. This equals R C of the lumped
    device (C = C'_j L, R = Z_s + R'_j/L).

Vpi_DC convention:
- Vpi_DC = lambda/(2 L abs(dn_eff/dV)) is pi = (2 pi/lambda) abs(dn/dV) V L, solved for V.
- It equals S8's `vpilDifferentialVcm` / L, labelled `single_arm_differential` (DevLog-039 D4: differential
  lambda/(2 abs(dn/dV)); push-pull = differential/2, only for reverse-biased stencils).
- Data convention: a single-arm, swept-contact value corresponds to `per_arm_phase_shifter` / `mzm_single_arm`, not
  `mzm_differential` (convention (q), full V+ - V-).
- The TWE path compares no Vpi target (metrics {}), so no convention mismatch can arise.

End-to-end reproduction (`twe_e2e.mjs`, test fixture rib + illustrative cut, 2 V):

| Quantity | DevLog | Current tree |
|---|---|---|
| C'_j (pF/mm) | 0.263 | 0.2633 |
| R'_j (ohm mm) | 15.39 | 15.387 |
| f_RC (GHz) | 39.3 | 39.28 |
| n_g | 3.897 | 3.8975 |
| n / Z at 1 GHz (bare n 1.98) | 3.82 / 35.5 ohm | 3.8207 / 35.50 ohm (bare 1.9756) |
| bw3 / bw6 (GHz) | 16.1 / 34.3 | 16.072 / 34.264 |
| dn_eff/dV (1/V) | 3.88e-5 | 4.138e-5 |
| Vpi_DC (V) | 19.96 | 18.73 |
| RF Vpi at 40 GHz (V) | 44.6 | 41.85 |

- The dn_eff/dV change is T4's round-3 redefinition. `semi-stage.mjs` now takes `dneffPerV` from the +-dv/2
  small-signal states, where it was the bias-list central difference (one-sided at the list ends). The arithmetic
  Vpi_DC = lambda/(2 L abs(dn)) holds for both values.

## 6. run.mjs edits (check 6)

- T1's own snapshots (`t1-s7/run.mjs.before-r3`, `run.mjs.before-r4`, `run-r4.diff` in the shared session scratchpad):
  - before-r3 -> before-r4 is exactly the recorded two-line insertion (105a106,107);
  - before-r4 -> the file at 01:37 equals `run-r4.diff` byte for byte (import line, options, dispatch,
    runSemiconductorOnly, twe/tweTargets/configTargets, result fields and `flagged`).
- No other hunk; T4's runSemiconductorOnly lines outside the recorded hunks are unchanged.
- After 01:38:55 the file differs from that state only by T4's round-3 hunk. It adds `rfSection ?? line.rf_section`
  and `biasV ?? semi.operatingBiasV`, the orchestrator decision.

## 7. Gates (check 7, sequential)

| Gate | T1 claim | Auditor | Note |
|---|---|---|---|
| engine `npm test` | 316: 313 pass, 0 fail, 2 skip, 1 todo | run 1 (01:38:38): 312 pass, 1 fail; run 2 (01:41:23, no file changed during it): 316, 312 pass, 1 fail, 2 skip, 1 todo, 98 s | fail = `semi-rib.test.mjs:111` "audit D7 / D10 / ... / mesh check" (meshCheck maxRel.dneff 0.5 > 0.02). S8 lane: semi-stage, semi/*, section.mjs modified 01:36-01:39 by T4 round 3, after T1's 01:26 gate |
| S7-related subset (s7-*, eo-rf-runner, library-citations, rf-line*, config*) | - | 102/102 | - |
| `npm run test:reference` | 15/15 | 14/15, 42 s | fail = K10 forward 0.3 V D1 (S8). `semi/solver.mjs`, `reference-cases.test.mjs`, `semi-1d-pn.test.mjs` changed during the run (T4). No S7 case in this suite |
| app `npm test` | 63/63 | 72/72 (7 files) | T7 added tests |
| app `npm run check` | 0/0 (468 files) | 470 files, 0 errors, 0 warnings | - |
| app `npm run build` | OK | OK | - |
| app `npm run smoke` | exit 0, 47 PASS | exit 0, 48 PASS; "PASS S7: EO response (3 dB 1.22780 GHz) and chen2022 loaded line (n_B0 2.10846) in the browser = Node" | T7 added a step; no app/engine source changed during build/smoke |

## Findings

### R34-1 (Medium) DC-referenced headline outputs carry no lateral-relaxation diagnostic

The slab f -> 0 R' is 2.0-6.6x the uniform R_DC, and nothing on the DC-referenced outputs says so.

Evidence:
- The diagnostic is attached only to config targets with a reference below f_lat (stages.mjs:490-503). Targets marked
  `reference_unstated` are skipped. The stage warning is raised only if such a target exists.
- `result.response.bandwidth` / `bw3dbGhz` / `bw6dbGhz` and `metrics.bw3db_ghz` / `bw6db_ghz` are DC-referenced by
  definition (band from f = 0 < f_lat). So is the DC entry of `referenceSensitivity`.
- `dcr.mjs` (B state): the run warning `band_below_lateral_current_relaxation_estimate` is absent:

| Config | Slab f -> 0 R' / uniform R_DC | R_0 model / uniform (ohm) | DC bw3 (GHz) |
|---|---|---|---|
| xu2022 | 6.60 | 78.8 / 11.9 | 1.679 (A: 4.866) |
| xue2023 | 3.23 | 71.0 / 22.0 | 8.111 (A: 18.18, DevLog value, not re-run) |
| wang2022a | 3.56 | 30.4 / 8.5 | 36.654 (A: 41.98, DevLog value, not re-run) |
| boynton2020 | 2.11 | 59.2 / 28.0 | 20.838 (A: 27.115) |
| mao2022 | 1.99 | 16.5 / 8.3 | 53.704 (A: 52.776) |

- These are the values that moved most in round 3 (DevLog text). Their crossings lie in the 0.1-2 GHz band, where the
  frozen K of the thin (t < delta) conductor dominates R'.
- The global `slab_model_limits_...` warning is present; the lateral one is not.

Fix:
- Attach the lateral diagnostic (and the code) to `result.response.bandwidth.*` and to the DC entry of
  `referenceSensitivity`.
- Emit the stage warning whenever a DC-referenced quantity is reported with a skin-effect conductor model.
- Note in DevLog-036 that DC-referenced bandwidths of long lines are frozen-K dominated. Long-term remedy as in R2: a
  frequency-dependent K, or a blend to R_DC.

### R34-2 (Low, doc) Coplanarity statement over-general

Evidence: the DevLog says "every electrode of every cut shares one y band". The loaded cuts of chen2022, wang2025,
wang2022 and xue2026 have thinner T pads (section 1). The run/unloaded cuts, which set R', K, t and the diagnostics,
are all single-band (33/33).

Fix: reword to "every run and unloaded cut". Optionally record the pad thickness in the provenance note.

### R34-3 (Low, data) Two configs without thickness-model provenance

Evidence: valdez2022 and valdez2023 carry only the inline comment. They also lack a `line.conductor_loss_model`
provenance entry.

Fix: add both provenance entries (project_inference, same note as the other 31).

### R34-4 (Low, citation) Shin et al. 2011 page of the junction-loading statement

Evidence: the statement and the "dc resistance of doped layers" sentence are at the end of Sec. II, journal p. 50 (PDF
page 3; left column bottom and right column top). They are cited as p. 51 in:
- rf-line.mjs:461;
- SPEC.md:613;
- DevLog-036:485;
- the claims file entry.

Fig. 2 and eqs. (1)-(5) are on p. 49, as cited.

Fix: p. 51 -> p. 50 in the four places.

### R34-5 (Low, doc) Convention strings stale when R_0 > 0

Evidence:
- `EO_RESPONSE_CONVENTIONS.normalization` ("H = Phi / Phi_DC, Phi_DC = L V_s Z_L/(Z_s + Z_L)") and `vpiRf`
  ("amplitude of V_ref = V_s Z_L/(Z_s + Z_L)") are unchanged.
- With a slab model H is divided by Phi_0, so Vpi_RF(0) = Vpi_DC refers to the mean DC line voltage V_s Phi_0/L, not to
  V_s Z_L/(Z_s + Z_L). These differ when Z_s != Z_L (e.g. +0.353 dB on li2026aa).
- The code is self-consistent and `result.response.normalization` states the mode.

Fix: make the convention text state both modes (or point to `normalization`), and update README/SPEC wording for RF Vpi.

### R34-6 (Low) TWE path lacks the semi-infinite thin-conductor diagnostic

Evidence:
- `responseResult.thinConductorBelowGhz` is set only in runConfig (run.mjs after runEoResponseStage), not in
  runSemiconductorOnly / runJunctionResponseStage.
- A Si TWE run with `semi_infinite` (default) and thin electrodes therefore gets no
  `thin_conductor_semi_infinite_surface_impedance_in_band`. The lateral diagnostic does apply.

Fix: compute it in runJunctionResponseStage from `rfOut.result` (same formula), or in run.mjs after `twe`.

### R34-7 (Low, coordination) T4 round 3 changed the perLength contract under the TWE stage

Evidence:
- `semi-stage.mjs` now provides `dneffPerV` from +-dv/2 small-signal states (previously the bias-list central
  difference, one-sided at the list ends). The DevLog-036 round-4 illustrative values (3.88e-5 /V, 19.96 V, 44.6 V) are
  now 4.138e-5 /V, 18.73 V, 41.85 V. All other printed values reproduce.
- `perLength` now also has `gSPerM` (junction conductance; S8 round-2 audit R3). `runJunctionResponseStage` ignores it,
  and accepts forward-bias points behind the generic `semiconductor_bias_point_flags_present` warning.

Fix:
- After T4 settles, re-run the round-4 example and update the DevLog numbers.
- Either reject forward-bias (or G'_j > 0) operating points, or extend the branch:
  - Y'_j = 1/(R'_j + 1/(G'_j + j w C'_j));
  - divider 1/(1 + R'_j (G'_j + j w C'_j));
  - then Y'_j(0) != 0, so the DC normalization must include the shunt conductance.

### R34-8 (Info) Runner details of the TWE dispatch

- `pendingStages` in runSemiconductorOnly removes only `semiconductor`. A config whose `chain` lists `rf_line` /
  `eo_response` would show them as pending although they ran.
- The semiconductor runner accepts meshScale >= 0.3 and passes it to the electrode electrostatics and optical solve
  (runConfig requires >= 0.5).
- The TWE re-solves the optical mode of the device cut, which the semiconductor stage already solved (cost only).

### R34-9 (Info, model) Junction branch content

- C'_j is the D1 terminal-charge capacitance of the device cut: metal charge plus carriers through the contact. Any
  contact-to-contact capacitance in that domain is placed behind R'_j, both in the branch and in the divider.
- The SPEC rule "the electrode cross-section must not contain the junction" is a label only
  (`electrode_cross_section_capacitance_excludes_junction_by_config`); it is not enforced.

Both are acceptable as stated; worth one sentence in SPEC.

## Recommendation

1. R34-1 before relying on any DC-referenced headline value of a slab line. The fix is small: diagnostics on
   `bandwidth`, plus the warning rule.
2. R34-2..R34-6 as text/config edits in the next T1 round.
3. R34-7 after T4 round 3 lands, together with the config keys `line.rf_section` / `semiconductor.operating_bias_v`
   that T4 has just added to run.mjs.
4. Re-run the full engine suite and test:reference once T4 settles. The current failures are S8-only.
