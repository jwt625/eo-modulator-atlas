---
title: S7 (EO response, loaded line) and S8 (silicon PN/PIN) tranche plan
date: 2026-10-15
status: active
owner: orchestrator (Claude, at Wentao Jiang's request); implementation and validation by subagents
scope: engine (new stages), validation (independent references), sims configs, library constants, later UI
---

# DevLog-035: S7 and S8 tranches

## User decisions (2026-10-15)

1. Order: S7 (traveling-wave EO response, periodic loaded line) first, then S8 silicon PN/PIN; InP deferred.
2. Model references downloaded by the user and moved by the orchestrator to `references/_inbox/` (git-ignored,
   local-only subscription copies), identity checked from the first-page text:

| File | Reference | DOI |
|---|---|---|
| alferness1982.pdf | Alferness, Waveguide Electrooptic Modulators, IEEE TMTT 30, 1121 (1982) | 10.1109/tmtt.1982.1131213 |
| alferness1983.pdf | Alferness, Corrections, IEEE TMTT 31, 315 (1983) (shared page) | 10.1109/tmtt.1983.1131486 |
| wheeler1942.pdf | Wheeler, Formulas for the Skin Effect, Proc. IRE 30, 412 (1942) | 10.1109/jrproc.1942.232015 |
| weis1985.pdf | Weis, Gaylord, Lithium niobate: summary of physical properties, Appl. Phys. A 37, 191 (1985) | 10.1007/bf00614817 |
| soref1987.pdf | Soref, Bennett, Electrooptical effects in silicon, IEEE JQE 23, 123 (1987) | 10.1109/jqe.1987.1073206 |
| masetti1983.pdf | Masetti, Severi, Solmi, carrier mobility in As/P/B-doped Si, IEEE TED 30, 764 (1983) | 10.1109/t-ed.1983.21207 |
| caughey1967.pdf | Caughey, Thomas, mobilities related to doping and field, Proc. IEEE 55, 2192 (1967) | 10.1109/proc.1967.6123 |
| scharfetter1969.pdf | Scharfetter, Gummel, Read diode oscillator, IEEE TED 16, 64 (1969) | 10.1109/t-ed.1969.16566 |
| shockley1952.pdf | Shockley, Read, recombination statistics, Phys. Rev. 87, 835 (1952) | 10.1103/physrev.87.835 |
| hall1952.pdf | Hall, electron-hole recombination in Ge, Phys. Rev. 87, 387 (1952) (shared page) | 10.1103/physrev.87.387 |
| sproul1991.pdf | Sproul, Green, Si intrinsic carrier concentration, J. Appl. Phys. 70, 846 (1991) | 10.1063/1.349645 |
| klaassen1992.pdf | Klaassen, unified mobility model I, Solid-State Electron. 35, 953 (1992) | 10.1016/0038-1101(92)90325-7 |
| reed2010.pdf | Reed et al., Silicon optical modulators, Nat. Photonics 4, 518 (2010) | 10.1038/nphoton.2010.179 |

Open access, fetched by the lanes (rate-limited): Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171
(2011), doi 10.1109/jphot.2011.2171930. Already local: Shin et al., conductor loss of capacitively loaded slow-wave
electrodes (PDF in the InP-Modulator repo).

## Tranches and lanes

| ID | Lane | Scope | Owns (write paths) | Depends | DevLog |
|---|---|---|---|---|---|
| T1 | S7-ENG (impl) | `eo_response`: uniform TWE small-signal EO response with RF loss (from `rf_line`), velocity mismatch, source/load impedance mismatch (forward and reflected waves), bandwidth and roll-off targets; then `loaded_line`: periodic T-rail per-period exact distributed ABCD from loaded/unloaded cuts, Bloch impedance/index, Bragg frequency, loaded-line EO response; config wiring for the 12 periodic configs; UI datasets/plots for S21_EO and Bloch quantities via the postproc store | `engine/src/` (new `eo-response.mjs`, `loaded-line.mjs`; `stages.mjs`, `run.mjs`, `config.mjs` for the new stages), `engine/schema/`, `engine/tests/s7-*`, `sims/*/config.yaml` (line/loading/target fields only), `sims/SPEC.md` S7 section, `app/src/lib/sim/` (S7 views only) | rf_line (done) | DevLog-036 |
| T2 | S7-REF (validation, fresh, independent) | independent Python implementation of the TWE response and the exact distributed Bloch cell in `validation/`; closed-form limits (lossless matched velocity-matched -> flat; pure mismatch sinc; pure loss (1-e^-aL)/aL; Bloch limits); canonical cases K8 (uniform GSG line response) and K9 (T-rail cell) as inputs | `validation/` (new files only), DevLog-037 | none | DevLog-037 |
| T3 | LIB (impl, small) | replace secondary LN RF/EO constants with Weis and Gaylord 1985 values (read the PDF tables yourself: clamped/unclamped r_ij, eps_ij, conditions, wavelength); find a verified primary source for LiTaO3 RF and EO constants (rate-limited web search, open-access only; otherwise list for the user to download); report config impact | `engine/data/materials.json`, `engine/tests/library-*` | none | DevLog-038 |
| T4 | S8-ENG (impl) | 2D steady-state drift-diffusion on the conforming mesh (Poisson + electron/hole continuity, Scharfetter-Gummel, Newton with damping, bias ramping), doping regions (uniform, Gaussian/erfc implant profiles), mobility (Masetti, Caughey-Thomas field), SRH, intrinsic density (Sproul-Green), ohmic contacts; small-signal C(V) and series R; plasma dispersion (Soref-Bennett / Nedeljkovic 2011 at 1310/1550 nm) -> complex delta-eps -> vector-mode perturbation -> dn_eff(V), d alpha(V), VpiL(V), loss(V); postproc datasets (n, p, potential, quasi-Fermi levels, delta n); config schema `semiconductor` block published early | `engine/src/semi/` (new), `engine/src/semi-stage.mjs` (new), `engine/tests/semi-*`, `sims/SPEC.md` S8 section, schema additions for the `semiconductor` block (coordinate with T1 on `engine/schema/sim.schema.json`: T4 adds a separate `$defs/semiconductor` and one property line) | none (RC+TWE coupling later uses T1) | DevLog-039 |
| T5 | S8-REF (validation, fresh, independent) | DEVSIM (open source) references in `validation/` for canonical Si cases: K10 1D abrupt PN (closed-form depletion width, C, built-in voltage), K11 lateral PN rib in SOI (220 nm/90 nm slab, standard doping) C(V), carrier profiles, dn_eff(V) and VpiL(V) with an independent plasma-dispersion implementation, K12 PIN forward bias (current, injected carriers); convergence and uncertainty per the round-2 rule | `validation/` (new files only), DevLog-040 | none | DevLog-040 |
| T6 | S8-CFG (data, after T4 schema) | Si paper configs with doping disclosure (start with derose2012, sia2022, han2023, hu2026, zhong2026; read the papers in references/), targets VpiL(V), C, loss, bandwidth | `sims/<si-paper>/config.yaml` (new), DevLog-041 | T4 schema | DevLog-041 |
| T7 | UI (after T1/T4 datasets) | S21_EO and Bloch plots, bias sweep and carrier-density plot groups, Si EO page | `app/src/lib/sim/` | T1, T4 | DevLog-042 |

Fresh-context audits after each implementation lane reports (O5 rule); then fix rounds; final gates; commit on request.

## Rules for all lanes

- No emoji. Never invent numbers; every constant or model coefficient from a primary reference read by the lane
  (page/table/equation locator in provenance). ISO dates; timestamps from `date`.
- Hardware (user is using the machine): one heavy process per lane, `nice -n 10`, Node `--max-old-space-size=1536`,
  Python threads 1-2 and RSS < 1.4 GiB with the validation watchdog, at most ~2 GB per lane, no idle processes.
- Scratch only in the session scratchpad directory from the environment (never `scratchpad/` in the repo); own
  uniquely named subfolders; never wipe the root.
- No git commands that change state. Subscription PDFs stay in `references/_inbox/` (git-ignored); never copy them
  into tracked paths.
- Validation lanes never read the implementation lanes' engine code.

## TODO

- [x] T1 S7-ENG eo_response (uniform) -> audit
- [x] T1 S7-ENG loaded_line (T-rail) -> audit
- [x] T2 S7-REF references K8, K9
- [x] T3 LIB LN primary constants (LiTaO3 waits on user downloads, DevLog-038)
- [x] T4 S8-ENG drift-diffusion + plasma dispersion + EO coupling (audit running)
- [x] T5 S8-REF DEVSIM references K10-K12 (audit pending)
- [x] T6 S8-CFG Si configs (han2023, anjali2025; 25 papers lack disclosure, DevLog-041)
- [x] T7 UI for S7/S8 (audit running)
- [ ] Final gates; commit and push on request

## Progress log

- 2026-10-15 23:2x PDT References verified (first-page text and target article present in shared-page PDFs) and moved from ~/Downloads to references/_inbox/ with the planned names; plan written. Launched T1 (DevLog-036), T2 (DevLog-037), T3 (DevLog-038), T4 (DevLog-039), T5 (DevLog-040): 5 concurrent. T6 waits for the T4 schema; T7 waits for T1/T4 datasets.
- 2026-10-15 23:35 PDT T2 done (DevLog-037): independent TWE response + exact distributed Bloch cell in
  `validation/scripts/ref_s7.py`; all closed-form limits to <= 1e-12; harness replay -1.46015 dB. K8 (K4 line,
  a0 0.36 dB/cm/sqrt(GHz) case input, 50 ohm): 5 mm bw3 69.893 GHz, 10 mm bw3 32.576 GHz. K9 T-rail (chen2022
  period/lengths, illustrative section values): K9a bw3 184.790 GHz, -1.349 dB at 67 GHz (inputs set from chen2022
  targets, not a reproduction); K9b 1000 um period Bragg 64.909 GHz. Conventions: H normalized to DC
  Z_L/(Z_S+Z_L); electrical dB = 20 log10 H; Bloch branch Re gamma > 0 and Re Z_B > 0 in passbands. Noted:
  Alferness eq. (21) is approximate (0.455 point). Awaiting T1 for the comparison audit.
- 2026-10-15 23:36 PDT T3 done (DevLog-038): LN library now primary from Weis and Gaylord 1985 (tables read from page
  images): default clamped eps 44.3/27.9 (Table 1 [23]) and r13 8.6, r22 3.4, r33 30.8, r51 28 at 633 nm (Table 4
  [45]); unclamped and alternative clamped sets as labelled alternatives; vendor/Veithen entries removed. Impact on the
  9 LN-library configs <= 0.03 %, no status change. No 1550 nm Pockels values in the source. LiTaO3: no readable
  open-access primary source; 8 DOIs listed in DevLog-038 for the user. One engine test hard-codes the old unclamped
  r33 (33 -> 34): follow-up sent to T3. Orchestrator decision: keep the complete Turner [45] row as default
  (single consistent measured set; papers' simulated VpiL agree within ~4 %), [11]+[44] as an alternative
  (+7.3 % VpiL if adopted). Privacy: T3 and the orchestrator's own earlier Crossref check (2026-10-15) sent the
  user's email as the Crossref/Unpaywall polite-pool contact without being asked; all lanes told to use a generic
  User-Agent without contact details. Config provenance strings (9 configs, K7 comments) to be updated after T1.
- 2026-10-15 23:39 PDT T3 follow-up: library-derived unclamped r33 in the test; suite 269 (263 pass, 3 fail in eo-rf-runner U3 tests from T1's in-progress loaded_line contract change, 1 todo, 2 skipped); T1 told to update those assertions.
- 2026-10-16 T1 done (DevLog-036): `eo_response` (forward + reflected waves, Alferness 1982 Sec. VI.B, 20 log10|H/H(f_ref)|,
  bisected bw3/bw6, RF Vpi) and `loaded_line` (symmetric exact-distributed cell, Shin 2011 section rule, Bloch gamma/Z,
  Bragg, quasi-static limits); postproc rf dataset and globals; UI EO Response and Loaded Line plot groups.
  Closed-form tests pass; harness replay -1.4601 dB. Engine 271 pass, 0 fail, 2 skipped, 1 todo; reference 11/11; app
  63/63, check 0/0, build, smoke 47. New paper evaluations: pass boynton2020 bw3 27.1 vs 30.55, mao2022 bw3 52.8 vs
  60, yang2022 roll-off -2.66 vs -2.5, zhang2022 bw6 287.5 vs 295; fail arabjuneghani2022 roll-off -1.16 vs -2.0,
  zhang2022 bw3 65.7 vs 170; periodic static n/Z now compared against quasi-static Bloch limits (10 pass, 9 fail).
  Periodic response targets blocked by missing `dielectric_loss_model` (12 configs). Shell heredoc incident logged
  (no file modified). Fresh-context audit vs T2 launched (`DevLog/audits/simulator-s7-audit-2026-10-16.md`).
- 2026-10-16 00:03 PDT T5 done (DevLog-040): DEVSIM 2.11.0 (Apache-2.0; bundled UMFPACK LGPL-2.1) with own physics +
  own numpy 1D solver (agrees to 4e-14 / 1e-11). K10 V_bi 0.874977 V, C'(0/-2/-4 V) 0.91657/0.49493/0.37866 fF/um^2
  (= 2V_t-corrected depletion formula to 4e-8). K12 PIN J(1.0 V) 21117 A/cm^2. K11 lateral PN rib (illustrative
  inputs): VpiL(-2 V) 1.264 (Soref-Bennett) / 1.441 (Nedeljkovic) V cm, C'(-2 V) 2.717 pF/cm incl. oxide fringe.
  Definition: dn_Si = f(N(V)) - f(N(0)) on absolute densities (fit on the density change gives 6-22 % lower VpiL).
  Masetti boron alpha/beta read from a partly illegible scan (0.719, 2.00). Definitions sent to T4; fresh audit of
  T5 launched (`DevLog/audits/simulator-s8-ref-audit-2026-10-16.md`).
- 2026-10-16 T4 done (DevLog-039): Boltzmann DD with SG fluxes on a lumped P1 box method, Newton + GMRES with block
  Cholesky preconditioner, Slotboom updates, Masetti/Caughey-Thomas mobility, SRH, Sproul-Green n_i, terminal-charge
  C', shorted-depletion R', Nedeljkovic/Soref-Bennett plasma dispersion on absolute densities, first-order vector
  perturbation. 1D gates: V_bi 2e-16, C(V) 1e-5..1.1e-4, neutrality 1e-13. Rib (illustrative): VpiL 1.26/1.44/1.74
  V cm at 1/2/4 V reverse, f_RC 33-49 GHz; ~1 s per bias point incl. C'. Engine 297 (294 pass, 0 fail, 2 skipped,
  1 todo), reference 11/11. Schema `$defs/semiconductor` published. Open: runConfig/CLI dispatch, postproc `semi`
  dataset registration, T1 TWE consumption of per-length C'/R' (integration round after audits); rib C' linear vs
  finite-difference 1.4-4.3e-4 unexplained. The rib VpiL is numerically close to the T5 K11 column: independence to
  be checked by the audit. Launched: T4 audit (`DevLog/audits/simulator-s8-engine-audit-2026-10-16.md`) and T6
  Si configs (DevLog-041).
- 2026-10-16 S7 audit done (`DevLog/audits/simulator-s7-audit-2026-10-16.md`): engine vs T2 at round-off (K8
  |dS21| <= 1.4e-13 dB, bw to 1e-8 GHz; K9 Bloch n/alpha/Z <= 1e-12, Bragg rel <= 4e-13); definitions and Shin rule
  verified; paper discrepancies physical/convention (zhang2022 mismatch + loss, xu2022 velocity mismatch,
  arabjuneghani2022 dB/Np factor-2 question), not defects. Findings: S1 (medium) unstated low-frequency reference
  judged at DC; S2 (medium) thin-conductor low-frequency band shapes the normalization (mao2022 bw3 52.8 -> 39.3 GHz
  without internal inductance); S3-S9 low. Auditor overlapped two short CLI runs with a suite (hardware rule slip).
- Orchestrator decisions: S1 not_evaluated with DC/1/3 GHz diagnostic when the reference is unstated; S2 implement
  finite-thickness slab surface impedance and flag overlapping bands; S3 flag `dielectric_loss_model: none`; S5 exact
  cascade response becomes the default for periodic lines. T1 round 2 started (also updates the 9 config provenance
  strings to Weis and Gaylord).
- 2026-10-16 T5 audit done (`DevLog/audits/simulator-s8-ref-audit-2026-10-16.md`): every coefficient matches its source
  page; independent 1D Poisson reproduces K10 C' to 4e-7; K11 and K10 pilots within U; dn_Si absolute-density
  definition confirmed standard (Nedeljkovic eq. (2), Soref 1987). Findings: Q1 K11 oxide C' U understated ~3x;
  Q2 oxide C' depends on the domain (+1.3-2.55 % when doubling BOX/cladding) -> Si-only C' is the primary gate;
  Q3 K12 window statistics biased/inflated; Q8 contact losses 23 % of J at 1.0 V; Q9 docs; Masetti boron alpha/beta
  glyphs illegible (fit 0.719/2.00; source ref. Thurber 1980). DEVSIM licence confirmed. T5 round 2 started.
- 2026-10-16 T6 round 1 (DevLog-041): 1 of 5 built (han2023: 220/90 nm SOI, P/N 5e17, P+/N+ 2e18, P++/N++ 4e20,
  band edges digitized from Fig. 2(A)); derose2012, hu2026, zhong2026 skipped (doping or geometry undisclosed),
  sia2022 skipped (1970 nm: needs a 2 um plasma-dispersion row). han2023 C'(3.5 V) 0.2285 pF/mm vs the authors'
  model 0.15 (their value equals the 1D depletion estimate 0.152; engine adds 2D fringing) -> to be marked
  comparable: false (definition mismatch). Round 2: screen the remaining ~26 Si papers and build up to 6 more.
- 2026-10-16 T6 round 2 (DevLog-041): 26 remaining Si papers screened; 1 more built (anjali2025-c, simulation design
  study): dn_eff(5 V) 8.98e-5 vs 1.1e-4 (-18 %), VpiL 4.32 vs 3.17 V cm (+36 %) with Nedeljkovic; with Soref-Bennett
  dn_eff -1 %, VpiL 3.56 (paper internally inconsistent: its own dn_eff implies 3.52) -> authors likely used
  Soref-Bennett (unconfirmed). 25 skipped (14 without doping numbers, 8 partial, 2 engine limits: hsu2024 MOS/ITiO,
  shen2021 needs 2 um row). han2023 C' marked comparable: false. Engine follow-ups queued for the S8 integration
  round: semiconductor targets must honour `comparable`; add Nedeljkovic 2 um rows; runConfig/CLI dispatch with
  `--section`; postproc `semi` dataset; T1 TWE consumption of semiconductor C'/R'.
- 2026-10-16 00:39 PDT T5 round 2 done (DevLog-040): oxide grading now refines with the level (Q1 confirmed larger:
  K11 oxide C' moved -6e-4..-8e-4); comparison domain recorded; Si-only C' primary gate, oxide C' secondary; K12
  node-aligned windows; contact-loss fractions (0.228 at 1.0 V); docs fixed. Masetti boron alpha 0.719 confirmed by
  the open NBS SP 400-64 (1981) Table 13 (same authors as Masetti ref. [13]); Thurber et al. 1980 (doi
  10.1149/1.2129394) paywalled, listed for the user. T4 auditor informed of the updated references.
- 2026-10-16 T1 round 2 done (DevLog-036): S1 `reference` target key (unstated -> not_evaluated with DC/1/3 GHz
  sensitivity; boynton2020 and mao2022 bw3 pass -> not_evaluated, arabjuneghani2022 roll-off fail -> not_evaluated);
  S2 opt-in finite-thickness slab surface impedance + in-band thin-conductor diagnostic + DC resistance check; S3
  dielectric-loss-none diagnostic; S4 Shin loaded length (kharel2021/liu2021/xue2026 -> 45 um, n_B0 up 0.04-0.06);
  S5 exact cascade default (vs T2 K9 <= 2.2e-11 dB); S6-S9; LN provenance strings -> Weis and Gaylord. Engine 304
  (301 pass, 0 fail, 2 skipped, 1 todo); reference 11/11; app 63/63, check 0/0, build, smoke 47. Round-2 audit
  launched (`DevLog/audits/simulator-s7-round2-audit-2026-10-16.md`).
- 2026-10-16 T4 audit done (`DevLog/audits/simulator-s8-engine-audit-2026-10-16.md`, against T5 round-2 references):
  core solver correct; K10 V_bi 6e-15, C'(-2/-4 V) -1.2e-5/-3e-6; K12 J and centre densities within U; K11 Si-only
  C' -4.4e-4..-4e-5, dn_eff/VpiL within U to -2.5 V and 1-3.3x U at -3..-4 V (shrinking). Independence: no leak
  (engine on the exact K11 mapping gives VpiL 1.2571/1.4409/1.7393; fixture is a different device). D1 (high):
  C' uses metal + doping-side charge instead of contact charge (K10 0 V -0.24 %, forward K12 270-545x low; f_RC and
  exported C' inherit it). D2-D11 medium/low incl. D4 push-pull VpiL convention and D11 shared far-field mesh cap
  not scaled by meshScale. T4 round 2 started: all fixes + S8 integration (runner/CLI dispatch, postproc semi
  dataset, comparable flags, Nedeljkovic 2 um rows, S8 reference tests, per-length C'/R' export).
- 2026-10-16 S7 round-2 audit done (`DevLog/audits/simulator-s7-round2-audit-2026-10-16.md`): S1, S3, S5-S9 and the
  provenance fix verified; slab formula derived independently and checked by an FD diffusion solve (6-7 digits);
  exact cascade matches an independent script and T2 to <= 1.1e-12 dB; S1 tags and S4 lengths correct. R2-1: the
  DC check cannot discriminate face models (one-sided/R_DC ratio 0.99..3.30 across configs). R2-2: coplanar
  electrodes carry symmetric face currents -> `slab_symmetric` is the consistent model; R2-3/R2-4 needed before a
  default switch. Full engine suite had 1 failure (S8 G8, T4 lane in progress). Orchestrator decisions: slab_symmetric
  becomes the coplanar default after R2-3/R2-4 and a listed regression; lateral-relaxation diagnostic. T1 round 3
  started; T4 told about G8.
- 2026-10-16 01:09 PDT T4 round 2 done (DevLog-039): D1 contact-charge C' (K10 0 V -1.4e-4/-4e-5; K12 forward stored
  charge 1.446e-9 F/m at 0.8 V), D2 cross-check removed, D4 push-pull = differential/2 around reverse bias, D5-D8,
  D7 first-order delta-eps default, D10, D11 farScale (96 meshes bitwise identical at meshScale 1); semiconductor
  stage in runConfig/CLI (`--stages semiconductor --section`), postproc `semi`/`semi:<k>` datasets, comparable/
  reference/vpi_convention honoured, perLength C'/R' export, Nedeljkovic Table 1 all 27 rows (1.3-14 um); S8 gates
  in test:reference (15/15). Engine 310 (307 pass, 0 fail, 2 skipped, 1 todo). Open: K11 oxide C' +1e-3 above the
  reference, not converging; schema edited outside write paths (chain enum). Fresh audit launched
  (`DevLog/audits/simulator-s8-round2-audit-2026-10-16.md`). T7 (UI) waits for T1 round 3 (app S7 views overlap).
- 2026-10-16 T1 round 3 done (DevLog-036): R2-1 DevLog corrected; R2-2 all 33 Wheeler configs (verified coplanar) set
  `slab_symmetric` + lateral-relaxation diagnostic (mao2022 f_lat ~0.23 GHz); R2-3 slab-limits diagnostic; R2-4 DC
  normalization from the model's own DC circuit (li2026aa +0.353 dB); R2-6 tags. No target status changes from the
  switch; value changes e.g. zhang2022 bw3 65.75 -> 73.39 GHz, yang2022 roll-off -2.656 -> -2.549 dB; DC-referenced
  bandwidths of long mismatched lines move most (xu2022 4.87 -> 1.68 GHz). run.mjs: 2 added lines (logged). S7 29/29;
  full suite had 1 failure (schema chain enum, T4 lane; T4 reports it fixed). Started: T1 round 4 (Si TWE coupling
  with junction R'_j C'_j loading) and T7 UI (S8 views, S7 polish; DevLog-042). Combined fresh audit of S7 rounds
  3-4 after T1 round 4.
- 2026-10-16 T1 round 4 done (DevLog-036): Si junction-loaded TWE per Shin et al. JLT 2011 Fig. 2 eqs. (1)-(5) (p. 51:
  applies to semiconductor-junction loading): Y'1 = 1/(R'_j + 1/(j omega C'_j)) from semiconductor perLength,
  junction divider for the phase drive, H_Si = H_line / (1 + j omega R'_j C'_j); tests 6/6 (limits to 1e-12, lumped
  RC corner 1e-4); example on the canonical rib (illustrative electrode cut) bw3 16.1 GHz. Engine 316 (313 pass,
  0 fail, 2 skipped, 1 todo); reference 15/15; app 63/63, check 0/0, build, smoke 47. Electrode section and bias are
  run options (rfSection, biasV); orchestrator decision: make them config keys (`line.rf_section`,
  `semiconductor.operating_bias_v`) in the next T4/T1 round (config.mjs owner). han2023/anjali2025 lack RF line
  inputs (listed). Combined S7 rounds 3-4 audit launched (`DevLog/audits/simulator-s7-round3-4-audit-2026-10-16.md`).
- 2026-10-16 T4 round-2 audit done (`DevLog/audits/simulator-s8-round2-audit-2026-10-16.md`): suites match claims;
  D1 C' derived independently and correct (K10 0 V -1.43e-4; K12 forward C' = q dN/dV to 3e-6, quasi-static
  charge-control value); D7 signs correct; D11 96 meshes bitwise identical; all 27 Nedeljkovic rows verified; the
  K11 oxide C' reference is right and the engine gap is its fixed mesh grading (R1). Medium: R1 grading not scaled
  with meshScale; R2 oxide C' gate tolerance set above the observed gap (tuned); R3 perLength lacks junction G'
  (forward bias). Low: R4-R8; info R9-R11. T4 round 3 started (incl. config keys line.rf_section and
  semiconductor.operating_bias_v).
- 2026-10-16 T7 done (DevLog-042): Semiconductor stage in toolbar/Physics/Study (runs alone until the config keys
  land), doping/contact nodes drawn on the geometry, bias as parameter value per view, 6 default 2D groups (signed
  log net doping, n, p, potential with quasi-Fermi contours, delta n and delta alpha with mode overlay) and 6 1D
  groups (C', R', f_RC, dn_eff, d alpha, VpiL variants with targets), Semiconductor results page, S7 diagnostics
  notices. App 72/72, check 0/0, build, smoke 48 (S8 step: probes and C'(V) equal Node to 1e-9). First plot 37.6 ms
  after a 5.3 s han2023 solve. Open: atlas.json (built 2026-10-08) lacks han2023/anjali2025 (orchestrator to run
  `npm run data` before commit); delta n default colour range dominated by contact regions. Fresh UI audit
  launched (`DevLog/audits/simulator-s8-ui-audit-2026-10-16.md`).
- 2026-10-16 S7 rounds 3-4 audit done (`DevLog/audits/simulator-s7-round3-4-audit-2026-10-16.md`): physics correct
  (coplanarity on all 33, f_lat derivation, DC normalization vs an independent closed form and lumped ladder on 7
  cases, junction-loaded gamma/Z0 vs Shin Fig. 2, divider not double counted, RC limits); run.mjs hunks byte-identical
  to the recorded diffs. R34-1 (medium): DC-referenced headline bandwidths lack the lateral-relaxation warning (slab
  f->0 R' is 2.0-6.6x R_DC; e.g. xu2022 bw3 1.68 GHz). R34-2..R34-7 low (incl. junction G' ignored in forward bias).
  Gate failures observed (semi-rib mesh-check, K10 forward) were T4 round-3 work in flux. T1 round 5 queued until
  T4 round 3 settles (shared stages.mjs).
- 2026-10-16 01:52 PDT T4 round 3 done (DevLog-039): R1 grading scales with min(1, meshScale) (96 meshes bitwise
  identical at meshScale 1); R2 gate tolerances U + F max|x(s1)-x(s3)| with F from the observed order (margins
  0.35-0.66; K11 Si-side noise ~2e-3 keeps p = 1); R3 junction G' in perLength with branch formula; R4/R5 central
  dn_eff/dV, push-pull only at reverse DC bias; R6 two-contact rule enforced; R7 farScale through preview, Wheeler,
  S7 cuts; R8 nearest Nedeljkovic row with labelled mismatch estimate; config keys `line.rf_section` and
  `semiconductor.operating_bias_v`. Engine 317 (314 pass, 0 fail, 2 skipped, 1 todo); reference 15/15. T1 round 5
  started (R34 findings, G' consumption, config keys).
- 2026-10-16 T7 UI audit done (`DevLog/audits/simulator-s8-ui-audit-2026-10-16.md`): gates hold; browser = Node
  (2D probes 7e-14, 1D CSVs exact at 7 biases); performance first plot 26.7 ms, no long tasks. Medium: F1 delta n /
  delta alpha default range dominated by contact regions (core change invisible) -> plot the bias-induced change
  delta_n(V) - delta_n(V0) by default (needs engine variables; T4 small round 4 started); F2 stale VpiL_diff
  description and missing push-pull reason. Low F3-F11, info F12-F14 (incl. new G'/dn_eff/dV/operating bias not in
  UI). T7 round 2 queued after T1 round 5 and T4 round 4.
- 2026-10-16 T1 round 5 done (DevLog-036): R34-1 conductor diagnostics on DC-referenced headline bandwidths, metrics
  and referenceSensitivity (1 line in run.mjs); R34-2..R34-6; R34-7 junction branch with G' and matching divider,
  model DC normalization with junction conductance, forward-bias operating points rejected (quasi-static diffusion
  C' invalid for omega tau >> 1); config keys used (run options override). S7 37/37; engine 319 (316 pass, 0 fail,
  2 skipped, 1 todo); reference 15/15; app 72/72, check 0/0, build, smoke 48. Plan: one combined fresh audit of
  T1 round 5 + T4 rounds 3-4 + T7 round 2 after T7 round 2; then final gates; commit on request.
- 2026-10-16 02:05 PDT T4 round 4 done (DevLog-039): store variables semi.dn_bias, semi.dalpha_bias (change vs V0),
  globals semi.dn_eff_per_v, semi.G, semi.operating_bias; tests; engine 321 (318 pass, 0 fail, 2 skipped, 1 todo);
  reference 15/15. T7 round 2 started (UI audit F1-F14, combined semiconductor + eo_response run, chain checkbox bug).
- 2026-10-16 T7 round 2 done (DevLog-042): F1 default Delta n/alpha groups plot dn_bias/dalpha_bias (absolute fields
  secondary, ranged on the mode region); F2-F14; combined semiconductor + eo_response Compute when the config keys
  exist (fixture bw3 16.150 GHz = Node); chain seeding fixed (yang2022/zhang2022 load with EO response). App 74/74,
  check 0/0, build, smoke 49. Orchestrator regenerated app/static/data/atlas.json (`scripts/build_views.py`: 233
  papers, 519 devices, 277 orgs; 3 pre-existing country warnings) so han2023 and anjali2025 are selectable. Final
  combined audit launched (`DevLog/audits/simulator-s7-s8-final-audit-2026-10-16.md`).
- 2026-10-16 Final S7/S8 audit (`DevLog/audits/simulator-s7-s8-final-audit-2026-10-16.md`): all gates reproduce
  (engine 321: 318/0/2/1; reference 15/15, margins 0.35-0.66; app 74/74, check 0/0, build, smoke 49; validate_db 0/0;
  pytest 30); every fixed item verified (G' DC normalization vs closed form 4e-15 dB; dn_bias browser vs Node
  2.8e-13; combined Si TWE bw3 16.150391645729542 GHz browser = Node); S7 regression 134 shared targets, 0 status
  changes. 5 low (A1 stale convention names, A2 terminal G' behind R'_j double-counts series R (latent), A3 Si
  configs chain lacks semiconductor, A4 labels.ts, A5 docs) and 5 info (A8: 1310 nm Si optical index outside the
  Salzberg Sellmeier range). Hygiene clean. Final cleanup round sent to T4.
- 2026-10-16 02:52 PDT Final cleanup done (DevLog-039): A1 convention names; A2 junction G' de-embedded from series
  R (G'_j = G'_t/(1 - R'G'_t), terminal value kept); A3 Si configs chain [semiconductor]; A4 labels.ts; A5 docs; A6;
  A8 explicit `n` overrides the library dispersion in the semiconductor stage (provenance required); Si index
  sources for the user: Li 1980 (doi 10.1063/1.555624), Frey et al. 2006 (doi 10.1117/12.672850).
- 2026-10-16 Orchestrator gate run on the final tree (sequential, nice): engine 323 (320 pass, 0 fail, 2 skipped,
  1 todo); reference 15/15; app 74/74, check 0 errors 0 warnings (470 files), build OK, smoke 49 PASS;
  validate_db 0 errors 0 warnings; pytest 30 passed. 142 changed/untracked entries; nothing committed.

## Status (2026-10-16)

Done: T1-T7 (S7 eo_response + loaded_line + Si junction-loaded TWE; S8 drift-diffusion + plasma dispersion + EO;
library primary constants; independent references K8-K12; Si configs han2023, anjali2025; UI). Open: LiTaO3 RF/EO
constants (user downloads, DevLog-038); Thurber 1980 (DevLog-040); Si optical index at 1.31 um (Li 1980 or Frey
2006); dielectric-loss declarations for the 12 periodic configs; frequency-dependent conductor K; RF electrode
lines for Si configs; 25 Si papers lack disclosure; InP deferred.
