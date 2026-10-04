---
verifier: fresh-context subagent
task: verify round-2 audit corrections for p3_18 and p3_19
date: 2026-10-04
scope: p3_18 (taghavi2022a, johnson2025, taghavi2024, witmer2020); p3_19 (soma2025, fukui2025, sun2026a, prountzou2026); organizations.csv row "Takeda Sentanchi Super Cleanroom"
inputs: data/_staging/p3_18/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_19/AUDIT_DISPOSITIONS_R2.md, data/_staging/audits/p3_18-p3_19-r2-claude-audit-2026-10-03.md
mode: read-only (only this report written); git diff HEAD on data/ only
verdict: corrections confirmed; 3 advisory consistency notes (no value is wrong against the source)
counts: {changed_cells: 17, confirmed: 17, not_confirmed: 0, unrecorded_changes: 0, rejections_checked: 1, rejections_supported: 1}
validator: "uv run python scripts/validate_db.py -> 0 error(s)"
---

# Verification: round-2 corrections, p3_18 and p3_19

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` against `HEAD` (csv.DictReader, keyed by paper_id / device_id / org_name), filtered to the 8 papers and the Takeda row; `git diff HEAD` on the 8 evidence files. Other papers' changes (p3_11..p3_13 and others) ignored.
- Sources: `references/<id>/text.md` for all changed cells; renders opened: fukui2025 `page_10.png` (Fig. 2), soma2025 `page_07.png` (Fig. 4), taghavi2022a `page_13.png` (Figs. 12, 13). Figure readings are approximate (by eye).
- Line endings: devices.csv and organizations.csv all lines CRLF; evidence YAML LF. Evidence notes of changed entries <= 25 words.

## Per-paper verdicts

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| taghavi2022a | 1 | 1 | 0 | corrections confirmed |
| johnson2025 | 1 | 1 | 0 | corrections confirmed |
| taghavi2024 | 4 | 4 | 0 | corrections confirmed (R2-F8 rejection supported) |
| witmer2020 | 1 | 1 | 0 | corrections confirmed |
| soma2025 | 3 (incl. org row) | 3 | 0 | corrections confirmed; advisory note A3 |
| fukui2025 | 7 | 7 | 0 | corrections confirmed; advisory notes A1, A2 |
| sun2026a | 0 | - | - | no changes (none expected) |
| prountzou2026 | 0 | - | - | no changes (none expected) |

papers.csv: no in-scope change (consistent with R2-F8 rejected and R2-F7 no rename).

## Changed cells

| # | Paper / row / field | Old -> new | Source locator | Verdict |
|---|---|---|---|---|
| 1 | fukui2025 / devices fukui2025-b / wavelength_nm | 1547.4 -> 1550 | Table S1 p.22 numerical row: 1550 nm, Q 930, 40 GHz, 0.24 dB, 180 pm/V | confirmed (value as in Table S1; see A1) |
| 2 | fukui2025 / devices fukui2025-b / notes | "0.21 dB loss at the 1547.4 nm operating point (Fig. 2f)." -> "wavelength_nm 1550 and il_onchip_db 0.24 follow Table S1 (p.22); at the 1547.4 nm operating point (Fig. 2f, p.3) the insertion loss is 0.21 dB." | p.3 "operating wavelength is selected to be 1547.4 nm for IM-HCG ... insertion loss of 0.21 dB"; Fig. 2f label "-0.21 dB, lambda = 1547.4 nm" | confirmed |
| 3 | fukui2025 / evidence fukui2025-b wavelength_nm / value | 1547.4 -> 1550 | Table S1 p.22 | confirmed; equals CSV |
| 4 | fukui2025 / evidence fukui2025-b wavelength_nm / locator | "p.3; Fig. 2f (p.10)" -> "Table S1 (p.22)" | Table S1 is on PDF p.22 (text.md page marker 22) | confirmed |
| 5 | fukui2025 / evidence fukui2025-b wavelength_nm / note | -> "Table S1 numerical case, paired there with 0.24 dB loss; Fig. 2f operating point is 1547.4 nm with 0.21 dB (p.3)" | Table S1 p.22; p.3 | confirmed (21 words) |
| 6 | fukui2025 / evidence fukui2025-b il_onchip_db / note | "+ largest value over the simulated range (Methods p.4); Table S1 pairs it with 1550 nm" | Methods p.4 "we selected the largest value across the entire wavelength range shown in Figs. 2a and 2b"; Table S1 p.22 | confirmed (24 words); basis simulated, value 0.24 unchanged, equals CSV |
| 7 | soma2025 / devices soma2025-b / er_type | static -> unspecified | p.6 "reflection spectrum in a logarithmic scale for the unbiased case, indicating that 20-dB extinction is obtained at the resonant wavelength"; Fig. 4 caption p.7 "measured reflection spectrum at 0 V in the dB scale"; render: inset is one 0 V trace, notch roughly -20 to -25 dB near 1563 nm (approx) | confirmed against source (not a voltage-switched ratio); see A3 for cross-database consistency |
| 8 | soma2025 / devices soma2025-b / notes | "+ , not a voltage-switched ratio, so er_type is unspecified." | as #7 | confirmed |
| 9 | soma2025 / evidence soma2025-b extinction_ratio_db / note | "passive reflection at 0 V in dB scale" -> "0 V notch depth of the passive reflection spectrum in dB scale, not a voltage-switched ratio" | p.6; Fig. 4d inset | confirmed; value 20 equals CSV |
| 10 | org / Takeda Sentanchi Super Cleanroom / notes | "+ ; full name as written in akazawa2026; soma2025 writes 'Takeda Cleanroom'" | soma2025 text.md acknowledgements (p.12) "fabricated in part at Takeda Cleanroom"; akazawa2026 text.md "the Takeda Sentanchi super cleanroom, The University of Tokyo" | confirmed; no path, emoji or private info |
| 11 | johnson2025 / evidence 200g-best wavelength_nm / basis | author_estimate -> measured | p.2 below Eq. (1): "measurement wavelength lambda0 = 1290 nm" | confirmed (stated measurement condition); 1290 equals CSV |
| 12 | taghavi2024 / evidence taghavi2024-a vpil_dc_vcm / basis | author_estimate -> derived | p.11: "we achieved a DC modulation efficiency of VpiL approx 0.25 V.mm" with 500 um phase shifters (0.5 V x 0.5 mm); convention (h) | confirmed; 0.025 equals CSV |
| 13 | taghavi2024 / evidence taghavi2024-a vpil_dc_vcm / note | "... 0.25 V.mm for 500 um ..." -> "... 0.25 V.mm stated as achieved for 500 um ..." | p.11 | confirmed (25 words) |
| 14 | taghavi2024 / evidence taghavi2024-a prop_loss_db_per_cm / basis | derived -> measured | p.15 (text.md line 530-531, page marker 15): "we have recorded a total propagation loss of approx 4.2 dB/mm for the FLS waveguide"; p.11 "approx 4.2 dB mm-1" | confirmed; 42 equals CSV |
| 15 | taghavi2024 / evidence taghavi2024-a prop_loss_db_per_cm / note | "Stated about 4.2 dB/mm ..." -> "about 4.2 dB/mm recorded ..." | p.15 | confirmed |
| 16 | witmer2020 / devices witmer2020-unslotted / qualifiers | "tuning_nm_per_v:approx" -> "" | p.8 Fig. 4(h) annotation "3.9 pm/V" (Vpp = 6 V), no approx wording; text "2-6 pm/V" range is in the evidence note | confirmed; 0.0039 equals evidence |
| 17 | taghavi2022a / devices taghavi2022a-sim / notes | "Fig. 12(a) reads about 0.36 V.mm" -> "Fig. 12 VpiL panel (left in the render; the caption labels it (b)) reads about 0.36-0.37 V.mm" | p.13 render: left panel axis "VpiL (V.mm)", no panel letters; caption "(a) ... (Sp) and (b) ... (VpiL)"; 40 nm slot at 5 nm TiO2 reads about 0.37 V.mm (approx) | confirmed |

## Priority check: fukui2025-b operating point

Populated simulated fields on fukui2025-b and their sources:

| Field | Value | Table S1 numerical row (p.22) | Other locator | Wavelength dependence |
|---|---|---|---|---|
| wavelength_nm | 1550 | 1550 | Methods p.4: material indices at 1550 nm; Fig. 1d mode at 1550 nm | label |
| q_loaded | 930 | 930 | p.4 "Q factor ... enhanced to 930"; Fig. 2c IM-HCG at ND 1e19 about 920-940 (approx) | at the resonance (Fig. 2c caption) |
| bw3db_ghz | 40 (gt) | 40 | p.3 "can exceed 40 GHz", Fig. 2g | none (RC, 3D FEM) |
| il_onchip_db | 0.24 | 0.24 | p.2-3; Methods p.4: largest over Figs. 2a/2b range | max over 1546-1551 nm, not at one wavelength |
| tuning_nm_per_v | 0.18 | 180 pm/V | consistent with p.3: 2.2e-3 / 5.6 V x 450 nm/RI = 0.177 nm/V | from the Fig. 2f (1547.4 nm) analysis |
| length_mm, rib_width_nm, stack | 0.04, 380, Lambda 760 / d 630 / w 380, ND 1e19 | design | p.2-3, Fig. 2g | none |

Result: every value on the row now comes from one source row (Table S1 numerical case) and one design (IM-HCG, ND 1e19 cm-3, r33 200 pm/V, 40x40 um2). The mix flagged in R2-F5 (1547.4 nm label with the 0.24 dB loss) is removed; the 0.21 dB at 1547.4 nm is kept in notes. Correction confirmed. Caveat in A1: the 1550 nm is a nominal label, not a wavelength at which the simulated quantities are evaluated.

## Rejected / deferred findings

| ID | Disposition | Check | Verdict |
|---|---|---|---|
| R2-F8 taghavi2024 research_groups "Quantum Matter Institute" | rejected (kept) | p.1 affiliation 3 "Quantum Matter Institute, University of British Columbia" (text.md line 23); column practice: heidari2022 "Microelectronics Research Center (...)", chelladurai2025 "Institute of Electromagnetic Fields (IEF), ETH Zurich ...", churaev2023 "Institute of Physics; ..." all hold institutes/centres; taghavi2024 papers.csv note says "the Quantum Matter Institute is a University of British Columbia unit" | rejection supported |
| R2-F7 | applied-adjusted (note cites akazawa2026 instead of "outside the paper") | akazawa2026 text.md line 890 has the full name | adjustment supported |

No deferred items.

## Advisory notes (no value is wrong; coordinator decision)

- **A1 (fukui2025-b, wavelength label).** Table S1's 1550 nm is the nominal design wavelength: Methods p.4 uses material indices at 1550 nm; the simulated IM-HCG reflectance peak at ND 1e19 is near 1548 nm (Fig. 2a; Fig. 2d nEO 1.65 trace, approx), and the modulator operating point is 1547.4 nm (Fig. 2f). Also the paper is internally inconsistent on the 0.24 dB definition (p.2 and Fig. 2c caption: "at the resonance"; Methods p.4: largest value over the range); `il_onchip_includes` follows Methods. Proposed (optional) row-notes addition, after "...the insertion loss is 0.21 dB.": "Table S1's 1550 nm is the nominal design wavelength (material indices at 1550 nm, Methods p.4); the simulated resonance at ND 1e19 is near 1548 nm (Fig. 2a, by eye)."
- **A2 (fukui2025-b, band; pre-existing, not changed this round).** `band` = other with wavelength_nm 1550 (and previously 1547.4), both in the C band; soma2025-a/-b free-space rows at 1563 nm use c_band. Proposed: `data/devices.csv` fukui2025-b `band` other -> c_band (fukui2025-a at 1510 nm stays other).
- **A3 (soma2025-b er_type vs database practice).** The change to unspecified is supported by the source, but other rows type a passive resonance-dip depth as static: kari2025-a (2.5 dB) and kari2025-b (10.2 dB) (evidence notes "Passive resonance-dip depth ..., not modulation contrast"), and tan2024-a (37 dB, best resonance dip in Fig. 6(a)). The schema has no er_type definition. Proposed: pick one convention and record it in `data/schema/devices.schema.yaml` (er_type desc); either revert soma2025-b to static (its note already says passive 0 V dip), or set kari2025-a, kari2025-b and tan2024-a to unspecified with the same note wording.

## Unrecorded changes

None. In-scope CSV diff: fukui2025-b wavelength_nm and notes; soma2025-b er_type and notes; taghavi2022a-sim notes; witmer2020-unslotted qualifiers; Takeda org notes. In-scope evidence diff: johnson2025 (1 basis), taghavi2024 (2 basis, 2 notes), soma2025 (1 note), fukui2025 (wavelength value, locator, note; il note). taghavi2022a, witmer2020, sun2026a, prountzou2026 evidence files unchanged. All recorded in the disposition files.

## Validator

`uv run python scripts/validate_db.py` -> `0 error(s)`. Evidence value equals CSV value for every changed or touched field (fukui2025-b wavelength_nm 1550 and il_onchip_db 0.24; soma2025-b extinction_ratio_db 20; johnson2025-200g-best wavelength_nm 1290; taghavi2024-a vpil_dc_vcm 0.025 and prop_loss_db_per_cm 42; witmer2020-unslotted tuning_nm_per_v 0.0039).
