---
title: Library LN RF/EO constants from Weis and Gaylord 1985; LiTaO3 RF/EO source search
date: 2026-10-15
status: active
owner: lane T3 LIB (Claude subagent, DevLog-035)
scope: engine/data/materials.json `library`, engine/tests/library-*.test.mjs; impact on configs using `library: lithium_niobate_congruent`
---

# DevLog-038: primary LN constants, LiTaO3 source

## Plan (2026-10-15 23:23 PDT, before implementation)

1. Read Weis and Gaylord, Appl. Phys. A 37, 191-203 (1985), doi 10.1007/BF00614817 (`references/_inbox/weis1985.pdf`,
   git-ignored subscription copy) myself: Table 1 (relative permittivity), Table 4 (linear EO coefficients), the
   surrounding text (clamped vs unclamped, measurement frequency, composition) and the reference list; render the
   table regions to images (PyMuPDF) because the text layer is garbled.
2. Library `lithium_niobate_congruent`: replace the Zhu 2021 / Veithen 2003 secondary entries with the Weis-Gaylord
   table rows (locator: page, table, row reference number); default stays the clamped (high-frequency) set unless the
   source dictates otherwise; replace the vendor and Veithen unclamped alternatives where Weis-Gaylord covers them;
   `missing` updated honestly (composition, wavelength 1550 nm not covered).
3. Tests: `engine/tests/library-citations.test.mjs` updated to the new values and verification classes.
4. Impact without interference from the concurrent T1/T4 engine edits: export HEAD `engine/` and `sims/` with
   `git archive` (read-only) into the session scratchpad, run every LN-library config (vector default, ES + optical
   + eo_overlap + rf_line where ready) with the HEAD library (before) and the new library (after) in the same
   snapshot, sequentially, `nice -n 10`, `--max-old-space-size=1536`; table of VpiL, C', Z0, n_RF and target status.
5. LiTaO3: rate-limited (>= 5 s) search for open-access primary sources of RF permittivity and Pockels coefficients
   of congruent LiTaO3 (Crossref, arXiv, publisher OA pages); if only paywalled, list verified DOIs here for the user.
6. Gates: engine suite (`npm test`, sequential) and `npm run test:reference` on the live repo; K-case inputs are
   explicit case inputs (K7 lists eps/r explicitly), expected unchanged.

## TODO

- [x] Read Weis-Gaylord Tables 1 and 4, text, references
- [x] Library update + tests
- [x] Impact before/after on the HEAD snapshot
- [x] LiTaO3 source search (no OA primary full text read; download list below)
- [x] Gates (one out-of-scope test assertion needs a one-line update, see Follow-ups)
- [x] Report
- [x] Follow-up (orchestrator): `engine/tests/fields-solver-options.test.mjs:224` 30/33 -> rMax derived from the library (34.0)
- [ ] Follow-up (orchestrator, after T1 releases sims/): provenance strings in 9 configs and K7 case comments still cite Zhu 2021 / Veithen 2003
- [ ] Follow-up (user): download the LiTaO3 sources listed below into references/_inbox/

## Progress log

- 2026-10-15 23:20-23:23 PDT Weis-Gaylord read: text layer garbled for tables; Table 1 (p.197) and Table 4 (p.199)
  read from PyMuPDF renders at 110 and 260 dpi; reference list p.202-203 from the text layer.
- 2026-10-15 23:23 PDT plan written.
- 2026-10-15 23:25 PDT before-survey on a `git archive HEAD engine sims` snapshot in the session scratchpad.
- 2026-10-15 23:28-23:30 PDT LiTaO3 search (Crossref, Unpaywall, arXiv API, Optica, JCU, HAL, Tohoku), >= 5 s apart.
- 2026-10-15 23:30 PDT library and test edited; library test 3/3 pass.
- 2026-10-15 23:31 PDT after-survey (same snapshot, new materials.json); sensitivity run with the Kaminow 1980 set.
- 2026-10-15 23:33 PDT engine suite on the live repo: 269 tests, 265 pass, 1 fail (predicted, out of write scope),
  1 todo (D5, expected), 2 skipped. 23:35 PDT `test:reference` (FULL): 11/11 pass.

## Source read: Weis and Gaylord 1985

R. S. Weis, T. K. Gaylord, "Lithium niobate: summary of physical properties and crystal structure", Appl. Phys. A 37,
191-203 (1985), doi 10.1007/BF00614817; local subscription copy `references/_inbox/weis1985.pdf` (git-ignored).

| Item | Content (as printed) | Locator |
|---|---|---|
| Table 1 | eps^T_11, eps^T_33, eps^S_11, eps^S_33, T_c, Ref.: 85.2, 28.7, 44.3, 27.9, 1165 C [23]; 84, 30, 44, 29 [22]; 84.6, 28.6, -, - [24]; -, -, 43.9, 23.7 [25]; 84.1, 28.1, 46.5, 27.3 [26] | p.197, rendered image |
| eps conditions | "Capacitance measurements at very low frequencies are used to determine the unclamped values of permittivity (eps^T) [23-25]. Capacitance measurements at frequencies well above the mechanical resonance can be used to determine directly the clamped values of permittivity (eps^S) [23]. The clamped values can also be determined indirectly from acoustic phase velocity measurements [24]." No measurement frequency or temperature is given. | p.197 left column |
| composition | "The differences between the measured values may be due to stoichiometric differences between samples [28]. The stoichiometries of the samples are indicated in the table by the value of T_c" (given for [23] only); no row is labelled congruent or stoichiometric | p.197 |
| Table 4 (x 1e-12 m/V; columns nm, r51, r22, r13, r33) | r^T: 633, -, 6.7, -, - [40]; 633, -, 6.81a, +10.0a, +32.2a [37]; 633, 32, 3.3a, -, - [41]; 633, -, 6.7, -, - [42]; 1150, -, 5.4a, -, - [42]; 3390, -, 3.1, -, - [42]; 633, -, -, 10.9, 34.0 [42]. r^S: 633, +18.2, -, -, - [11]; 633, -, +3.4, +7.7, +28.8 [44]; 633, 28, 3.4, 8.6, 30.8 [45]; 3390, 23, 3.1, 6.5, 28 [46]. Footnote a: "These values were incorrect in [34]" | p.199, rendered image |
| EO conditions | free (unclamped, constant stress) includes the secondary (piezoelectric + photoelastic) effect, Eq. (13) r^T = r^S + p d; "A measurement made with a static applied electric field corresponds to the unclamped case. A measurement made with a high frequency (rf) electric field corresponds to the clamped condition"; "The values from [11] and [44] are probably the most accurate ... refined experimental methods that correct for fringing fields"; unclamped EO coefficients composition-independent within +-5 % [28]; temperature coefficient about 5e-4 /C [13] | p.199 |
| original references | [11] Kaminow, Turner, Barns, Bernstein, J. Appl. Phys. 51, 4379 (1980); [22] Savage, J. Appl. Phys. 37, 3071 (1966); [23] Warner, Onoe, Coquin, J. Acoust. Soc. Am. 42, 1223 (1967); [24] Smith, Welsh, J. Appl. Phys. 42, 2219 (1971); [25] Yamada, Niizeki, Toyoda, Jpn. J. Appl. Phys. 6, 151 (1967); [26] Teague, Rice, Gerson, J. Appl. Phys. 46, 2864 (1975); [37] Zook, Chen, Otto, Appl. Phys. Lett. 11, 159 (1967); [40] Lenzo, Spencer, Nassau, J. Opt. Soc. Am. 56, 633 (1966); [41] Bernal, Chen, Lee, Phys. Lett. 21, 259 (1966); [42] Smakula, Claspy, Trans. Metall. Soc. AIME 239, 421 (1967); [44] "E. H. Turner cited in [11]"; [45] Turner, Appl. Phys. Lett. 8, 303 (1966); [46] Turner, J. Opt. Soc. Am. 56, 1426 (1966). None read. | p.202-203 |

## Library changes (`lithium_niobate_congruent`)

| Field | Before | After | Locator | Verification |
|---|---|---|---|---|
| eps_r (default) | perp 44.0, par 27.9 (Zhu 2021 Table 1) | perp 44.3, par 27.9 | Table 1 p.197 row [23] eps^S | primary (evaluated compilation; [23] not read) |
| r_pm_per_v (default) | r13 8.6, r22 3.4, r33 30.8, r51 28.0 (Veithen 2003) | same values | Table 4 p.199 r^S 633 nm [45] | primary ([45] not read) |
| alt eps_r_unclamped | eps_r_unclamped_vendor 85.0 / 28.7 (secondary_vendor) | 85.2 / 28.7 | Table 1 row [23] eps^T | primary |
| alt r_pm_per_v_unclamped | Veithen 10.0 / 6.8 / 32.2 / 32.6 | r13 10.0, r22 6.81, r33 32.2 ([37]), r51 32 ([41]), 633 nm | Table 4 r^T rows [37], [41] | primary |
| alt r_pm_per_v_unclamped_smakula1967 | (new) | r13 10.9, r22 6.7, r33 34.0, 633 nm | Table 4 r^T rows [42] | primary |
| alt r_pm_per_v_unclamped_vendor | 10 / 7 / 33 / 33 | removed (covered by the source) | - | - |
| alt r_pm_per_v_clamped_kaminow1980 | (new) | r13 7.7, r22 3.4, r33 28.8 ([44]), r51 18.2 ([11]), 633 nm | Table 4 r^S rows [11], [44] | primary |
| alt r_pm_per_v_clamped_3390nm | (new) | r13 6.5, r22 3.1, r33 28, r51 23 | Table 4 r^S 3390 nm [46] | primary |

`missing`: removed `lithium_niobate_unclamped_rf_permittivity` and `lithium_niobate_primary_sources` (covered);
added `lithium_niobate_original_measurements`, `lithium_niobate_eo_1550nm`, `lithium_niobate_rf_eo_composition`;
`lithium_tantalate_rf_eo` updated. `library_schema` verification text: `primary` now also covers a critically
evaluated compilation that checked the original sources (Matula 1979, Weis and Gaylord 1985).

Decisions (recorded per the standing data-rule memory):
- eps default = row [23]: the source names it as the direct high-frequency (above mechanical resonance) capacitance
  measurement of eps^S and it is the only row with both eps^T and eps^S on one sample and a T_c.
- r default stays the complete clamped 633 nm row [45] (unchanged values). The source's "probably the most accurate"
  set ([11] + [44]) is a composite of two works, one of which ([44]) is itself only a citation in [11]; it is kept as
  a labelled, non-applied alternative with the sensitivity below. This is the one real fork for the user: switching
  the default to [11] + [44] raises VpiL by about 7 % for configs that take r33 from the library.
- Composition: the source does not establish "congruent" for these rows; key name kept for config compatibility, noted
  in `description`, `composition_note` and `missing`.
- No 1550 nm EO value exists in the source; 633 nm clamped values kept (the 3390 nm clamped row is an alternative).

## Impact (vector default, ES + optical_mode + eo_overlap + rf_line where ready; HEAD snapshot, library only)

Before = HEAD library, after = new library, same engine snapshot (`git archive HEAD`), run 2026-10-15 23:25 / 23:31 PDT.
Only eps_r.perp changed for the applied set (44.0 -> 44.3); r values unchanged. meng2023 is blocked in both runs
("electrodes 0 and 1 share an edge", unchanged since round 5).

| Case | VpiL (V cm) | C' (pF/m) | Z0 (ohm) | n_RF | Target status changes |
|---|---|---|---|---|---|
| arabjuneghani2022 | 4.02143 -> 4.02148 (+0.001 %) | 139.509 -> 139.513 (+0.003 %) | 51.6634 -> 51.6626 | 2.16075 -> 2.16079 | none |
| boynton2020 | 4.94634 -> 4.94697 (+0.013 %) | 169.439 -> 169.473 (+0.020 %) | 46.7587 -> 46.7539 | 2.37517 -> 2.37541 | none |
| gao2024 | - | 142.289 -> 142.299 (+0.007 %) | 47.7244 -> 47.7227 | 2.03579 -> 2.03587 | none (no targets) |
| mao2022 | 2.76607 -> 2.76536 (-0.026 %) | 186.705 -> 186.740 (+0.019 %) | 42.0601 -> 42.0561 | 2.35421 -> 2.35443 | none |
| renaud2023 | 0.637317 -> 0.637254 (-0.010 %) | 232.858 -> 232.866 (+0.003 %) | 34.2968 -> 34.2962 | 2.39422 -> 2.39427 | none |
| valdez2022 geometry / protrusion | - | 155.892 -> 155.902 / 194.549 -> 194.566 | 48.9145 -> 48.9129 / 38.8456 -> 38.8439 | 2.28603 -> 2.28610 / 2.26564 -> 2.26574 | none |
| valdez2023 geometry / protrusion | - | 157.986 -> 157.996 / 200.306 -> 200.325 | 48.0911 -> 48.0896 / 37.5900 -> 37.5883 | 2.27774 -> 2.27781 / 2.25730 -> 2.25740 | none |
| yang2022 | 2.60501 -> 2.60473 (-0.011 %) | 136.784 -> 136.796 (+0.009 %) | 50.5972 -> 50.5949 | 2.07483 -> 2.07492 | none |

n_eff and ng unchanged (optical inputs untouched). Low-frequency diagnostic (`target.lowFrequencyRange`, does not
affect status): largest library unclamped r33 33 (vendor) -> 34.0 (Smakula [42]), so unclamped estimates drop by
2.9 % (factor 33/34): arabjuneghani2022 3.7533 -> 3.6430, boynton2020 4.6466 -> 4.5105, mao2022 2.5984 -> 2.5214, renaud2023
0.59483 -> 0.57728 (both Vpi targets), yang2022 2.4392 -> 2.3672 V cm.

Sensitivity (not applied): default r replaced by `r_pm_per_v_clamped_kaminow1980` (r13 7.7, r22 3.4, r33 28.8,
r51 18.2): VpiL arabjuneghani2022 4.0215 -> 4.3150 (+7.30 %), renaud2023 0.6373 -> 0.6835 (+7.26 %); configs with
the paper r33 override: mao2022 +0.20 %, boynton2020 +0.02 %, yang2022 +0.08 % (r13/r22/r51 only); no status changes.

K cases: no `validation/cases/*.yaml` uses `library:` (K7 lists eps 44.0/27.9 and r explicitly); `test:reference`
11/11 pass, unchanged.

## LiTaO3 RF / EO source search (2026-10-15 23:28-23:30 PDT, >= 5 s between requests)

Result: no open-access primary full text could be read; LT RF/EO values stay in `missing`. Thin-film LT device papers
on arXiv (29 hits, arXiv API) quote LT constants without primary measurement (e.g. arXiv:2306.16492 p.2: r33 = 30.5
pm/V, eps33 = 43, no citation or clamping condition; not used). Anti-bot: HAL returned an Anubis block page on the
first request; no further HAL requests were made.

Download list for the user (DOIs verified on Crossref 2026-10-15; OA status from Unpaywall):

| # | Reference | DOI | Content (from title / abstract only) | Access |
|---|---|---|---|---|
| 1 | M. V. Jacob, J. G. Hartnett, J. Mazierska, V. Giordano, J. Krupka, M. E. Tobar, "Temperature dependence of permittivity and loss tangent of lithium tantalate at microwave frequencies", IEEE Trans. Microw. Theory Tech. 52, 536-541 (2004) | 10.1109/TMTT.2003.821911 | microwave eps and tan delta of c-axis LiTaO3, 14-295 K, 10 and 11.4 GHz, TE011 cavity; abstract (JCU repository record 800): permittivity 38.9 to 41.1, tan delta 1.1e-4 to 6.5e-4 over the range; tensor component and composition not in the abstract | closed; JCU copy restricted |
| 2 | M. Abarkan, J. P. Salvestrini, M. D. Fontana, M. Aillerie, "Frequency and wavelength dependences of electro-optic coefficients in inorganic crystals", Appl. Phys. B 76, 765-769 (2003) | 10.1007/s00340-003-1196-5 | clamped / unclamped EO coefficients, congruent and stoichiometric LiTaO3 and LiNbO3 (search snippet; not read) | Unpaywall green: hal.science/hal-00186027 (HAL anti-bot block; please download manually) |
| 3 | J. L. Casson et al., "Electro-optic coefficients of lithium tantalate at near-infrared wavelengths", J. Opt. Soc. Am. B 21, 1948 (2004) | 10.1364/JOSAB.21.001948 | unclamped r13, r33 at 980, 1330, 1558 nm (abstract, Optica page) | closed |
| 4 | P. V. Lenzo, E. H. Turner, E. G. Spencer, A. A. Ballman, "Electrooptic coefficients and elastic-wave propagation in single-domain ferroelectric lithium tantalate", Appl. Phys. Lett. 8, 81-82 (1966) | 10.1063/1.1754496 | LT EO coefficients (title) | closed |
| 5 | R. T. Smith, F. S. Welsh, "Temperature dependence of the elastic, piezoelectric, and dielectric constants of lithium tantalate and lithium niobate", J. Appl. Phys. 42, 2219-2230 (1971) | 10.1063/1.1660528 | LT dielectric constants (title); also Weis-Gaylord ref [24] for LN | closed |
| 6 | J. Kushibiki, I. Takanaga, M. Arakawa, T. Sannomiya, "Accurate measurements of the acoustical physical constants of LiNbO3 and LiTaO3 single crystals", IEEE Trans. Ultrason. Ferroelectr. Freq. Control 46, 1315-1323 (1999) | 10.1109/58.796136 | acoustical physical constants (title); whether eps^T / eps^S are tabulated not verified | Unpaywall green: tohoku.repo.nii.ac.jp/record/26141 (HTTP 503, maintenance 2026-10-16 13:30-19:00 JST) |
| 7 | J. Kushibiki, I. Takanaga, S. Komatsuzaki, T. Ujiie, "Chemical composition dependences of the acoustical physical constants of LiNbO3 and LiTaO3 single crystals", J. Appl. Phys. 91, 6341-6349 (2002) | 10.1063/1.1467608 | composition dependence (title) | Unpaywall green: tohoku.repo.nii.ac.jp/record/25796 (same maintenance) |
| 8 | A. W. Warner, M. Onoe, G. A. Coquin, "Determination of elastic and piezoelectric constants for crystals in class (3m)", J. Acoust. Soc. Am. 42, 1223-1231 (1967) | 10.1121/1.1910709 | Weis-Gaylord [23] for LN; LiTaO3 coverage not verified | closed |

Priority for the RF/EO library: 1 (GHz eps, the clamped regime of TFLT devices), 2 (clamped r at RF), 5 or 6/7
(eps^S and eps^T tensors), 3 (unclamped r at 1558 nm).

## Follow-ups (outside this lane's write paths)

1. `engine/tests/fields-solver-options.test.mjs:224` asserts the low-frequency estimate with the old largest unclamped
   r33 (`30 / 33`); with the Weis-Gaylord alternatives it is 34.0. One-line change `30 / 33` -> `30 / 34`; verified in
   the scratch snapshot (the round-6 subtest passes with 34).
2. Provenance strings in sims/{arabjuneghani2022, boynton2020, gao2024, mao2022, meng2023, renaud2023, valdez2022,
   valdez2023, yang2022}/config.yaml and the K7 case header comments (validation/cases/K7-*.yaml,
   validation/scripts/make_cases.py) still cite Zhu 2021 / Veithen 2003 and eps perp 44 / 44.0; should cite Weis and
   Gaylord 1985 Table 1 [23] / Table 4 [45] and 44.3. K7 inputs are explicit and need no value change.
3. User decision: default clamped r set [45] (kept) vs the source's preferred [11] + [44] (+7 % VpiL on library-r33
   configs).

## Orchestrator decisions and follow-up (2026-10-15 23:37 PDT)

- Decision (orchestrator, 2026-10-15): the default clamped r set stays the complete Turner 1966 row [45] (Table 4,
  p.199: r13 8.6, r22 3.4, r33 30.8, r51 28, 633 nm); the Weis-Gaylord "probably most accurate" set [11] + [44] stays
  the labelled, non-applied alternative `r_pm_per_v_clamped_kaminow1980`. Reason: [45] is a single consistent measured
  row giving all four coefficients, whereas [11] + [44] combines two works ([44] only as a citation in [11]); and the
  default matches the papers' own simulated VpiL within about 4 % (orchestrator's comparison; not re-derived in this
  lane).
- `engine/tests/fields-solver-options.test.mjs` (extra write path for this item): the low-frequency estimate check now
  derives the largest unclamped r33 from the library alternatives (asserts 34.0) instead of the hard-coded 33.
- Engine suite (sequential, 23:37-23:38 PDT): 269 tests, 263 pass, 3 fail, 1 todo (D5), 2 skipped. The round-6
  low-frequency subtest passes. The 3 failures are all in `tests/eo-rf-runner.test.mjs` (U3 stage selection,
  readiness, CLI --check: `loaded_line` is now reported as needing `line.loading.type` instead of "not implemented"),
  caused by T1's in-progress `loaded_line` implementation in stages.mjs/config.mjs/run.mjs, not by the library.
- Web requests: the user's email was sent in the Crossref User-Agent and the Unpaywall `email=` parameter during the
  LiTaO3 search (about 14 requests, 23:28-23:30 PDT); rule from now on: generic User-Agent without contact details.
