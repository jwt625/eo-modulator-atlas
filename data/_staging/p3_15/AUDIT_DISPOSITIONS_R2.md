# Audit dispositions, round 2: batch p3_15

- Audit: `data/_staging/audits/p3_14-p3_15-r2-claude-audit-2026-10-03.md` (shared with p3_14; p3_14 items are in `data/_staging/p3_14/AUDIT_DISPOSITIONS_R2.md`)
- Papers: hsu2024, hu2023, shen2021, huang2026a, yue2023, kawahara2025, sia2022
- Date: 2026-10-04
- Source re-check: hu2023 `text.md` p.1-3, p.8-9 and `figures/img_p08_1.png` (Fig. 5); hsu2024 `text.md` p.7-8, p.13; kawahara2025 `text.md` p.1, p.4, Appendix D; sia2022 `figures/page_05.png` (Fig. 6); xu2020 `text.md` p.1 affiliations (for the CICT org note).
- Files edited: `data/papers.csv` (row hu2023, `companies`), `data/devices.csv` (rows hu2023-a, hu2023-b, hsu2024-a, kawahara2025-a, sia2022-a..d), `data/organizations.csv` (one new row), `data/evidence/hu2023.yaml`, `data/evidence/sia2022.yaml`. Not edited: `sims/`, `references/`, `audit_status`, `year` cells. CRLF line endings of the CSVs and LF of the YAML preserved.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | metadata | deferred | `year` rule (journal vs preprint year) is an open user decision per the coordinator. Cells unchanged: hsu2024 2024, hu2023 2023, shen2021 2021, kawahara2025 2025. |
| R2-F2 | metadata | applied-adjusted | Source: hu2023 p.1 affiliation 3 "National Information Optoelectronics Innovation Center, 430074 Wuhan, China", listed separately from affiliation 2 (CICT State Key Laboratory). `organizations.csv`: new row `National Information Optoelectronics Innovation Center,research_institute,CN,east_asia,,"Wuhan; hu2023 p.1 affiliation 3, listed separately, relation to China Information and Communication Technologies Group Corporation not stated there; xu2020 p.1 prints it as part of that group"` (inserted in sort order). `papers.csv` hu2023 `companies`: "China Information and Communication Technologies Group Corporation;Peng Cheng Laboratory" -> "China Information and Communication Technologies Group Corporation;National Information Optoelectronics Innovation Center;Peng Cheng Laboratory" (affiliation order). Adjustment: the proposed removal from the CICT org note is not done, because xu2020 p.1 prints "National Information Optoelectronics Innovation Center, China Information and Communication Technologies Group Corporation (CICT)", which supports that note; `parent_org` left empty since hu2023 does not state the relation. |
| R2-F3 | metadata | applied-adjusted | Source: p.1 "over 67GHz", p.2 and p.3 "beyond 67 GHz"; no S21, instrument or sweep range shown (p.3 defers to Ref. [34]). Chose the audit's second option: a measurement range would be invented, so `bw_measured_to_ghz` stays empty. `devices.csv` hu2023-b `notes` appended " bw_measured_to_ghz left empty: convention (c) is not applied because no S21 or sweep range is shown in this preprint." Coordinator may override to 67 (author_estimate). |
| R2-F4 | minor | applied | Source: p.8 Fig. 5 caption "The Vpp at c and d are both fixed at 600 mV"; Fig. 5(c),(d) render: data rate peaks at about 302 Gb/s at 1312.0 nm and at -0.9 V; p.9 Fig. 6(a) caption also states Vpp 0.6 V at 1312 nm, -0.9 V. Value 0.6 unchanged. Evidence hu2023-a `drive_vpp_v`: basis derived -> measured; locator "p.8, Fig. 5 caption; p.9, Fig. 6" -> "p.8, Fig. 5(c),(d) caption; p.9, Fig. 6"; note -> "Vpp fixed at 600 mV in the Fig. 5(c),(d) data-rate scans, which peak near 302 Gb/s at 1312 nm, -0.9 V; Fig. 7 run states no Vpp." `devices.csv` hu2023-a `notes`: sentence "The 302 Gb/s DMT run (p.10, Methods) states no Vpp: drive_vpp_v 0.6 is the Vpp stated for the wavelength and bias scans and the 5 GBaud transient." -> "drive_vpp_v 0.6: Vpp is fixed at 600 mV in the Fig. 5(c),(d) data-rate scans, which peak near 302 Gb/s at 1312.0 nm and -0.9 V (p.8); the Fig. 7 / Methods run states no Vpp." |
| R2-F6 | minor | applied | hsu2024: p.7-8 IL 3 dB is read on the normalized transmission (Fig. 4); p.13 light coupled through grating couplers. `devices.csv` hsu2024-a `il_onchip_excludes` "" -> "fiber grating-coupler loss (Fig. 4 transmission is normalized)". kawahara2025: p.4 "on-chip insertion loss was approximately 11 dB"; Appendix D "input and output via edge couplers using fiber-lens modules", no coupling loss given. `devices.csv` kawahara2025-a `il_onchip_excludes` "" -> "fiber-to-chip edge coupling (not quantified)". Column is not evidence-required. |
| R2-F9 | minor | applied | Source: Fig. 6 render (p.5): ticks 2 GHz and 4 GHz are 84 px apart; both traces start about 40 px left of the 2 GHz tick, i.e. near 1.0 GHz. `devices.csv` sia2022-a, -b, -c, -d `notes`: "(about 1.5 GHz)" -> "(about 1 GHz)". `evidence/sia2022.yaml` four `bw3db_reference` notes: same replacement. No value change. |
| R2-F10 | minor | deferred | p3_15 part: "IHP - Leibniz-Institut für innovative Mikroelektronik" (kawahara2025 names IHP only in body text p.4, not in its affiliations, and the row is shared with steckler2025) and "CompoundTek Pte" type foundry (sia2022 p.1 affiliation "CompoundTek" gives no fabrication role; the foundry type comes from another paper). Neither paper's affiliation text decides round-1 F19. Left to the coordinator. |

## Counts

- Findings for this batch: 7 (R2-F1 hsu2024/hu2023/shen2021/kawahara2025 part, R2-F2, R2-F3, R2-F4, R2-F6, R2-F9, R2-F10 IHP/CompoundTek part)
- applied: 3 (R2-F4, R2-F6, R2-F9)
- applied-adjusted: 2 (R2-F2, R2-F3)
- rejected: 0
- deferred: 2 (R2-F1, R2-F10)
- No finding for huang2026a or yue2023.

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| hu2023 | hu2023-a | drive_vpp_v (evidence basis only) | basis derived -> measured; value 0.6 unchanged | p.8, Fig. 5(c),(d) caption; p.9, Fig. 6 |
| hu2023 | (papers.csv) | companies | appended National Information Optoelectronics Innovation Center | p.1 affiliation 3 |
| hsu2024 | hsu2024-a | il_onchip_excludes | (empty) -> fiber grating-coupler loss (Fig. 4 transmission is normalized) | p.7-8 Fig. 4; p.13 |
| kawahara2025 | kawahara2025-a | il_onchip_excludes | (empty) -> fiber-to-chip edge coupling (not quantified) | p.4; Appendix D |

No numerical cell value changed in this batch. Notes-only changes: hu2023-a, hu2023-b, sia2022-a..d. New organizations.csv row: National Information Optoelectronics Innovation Center.

## Sim config follow-ups

- None. No `sims/<id>/config.yaml` exists for the seven papers.

## Deferred items needing decisions

- R2-F1 (user): one `year` rule. Preprint-year rule: hsu2024 2024 -> 2023, hu2023 2023 -> 2021. VoR rule: shen2021 2021 -> 2022, kawahara2025 2025 -> 2026.
- R2-F3 (coordinator, optional override): hu2023-b `bw_measured_to_ghz` empty vs 67 (author_estimate).
- R2-F10 (coordinator): round-1 F19 organization items (IHP German name; CompoundTek Pte type foundry).
- Out of scope, for the coordinator: xu2020 carries the National Information Optoelectronics Innovation Center in `research_groups` (as part of CICT, p.1 affiliation 2) and only CICT in `companies`; whether it should also list the new org row is a separate decision.
