# Audit dispositions: p4_01

Audit: `data/_staging/audits/p4_01-q1-claude-audit-2026-10-04.md`
Date: 2026-10-04
Files changed: `devices.csv`, `papers.csv`, `evidence/arabjuneghani2022.yaml`, `evidence/valdez2023a.yaml`, `evidence/liu2025.yaml`, `BATCH_REPORT.md`, `sims/arabjuneghani2022/config.yaml`, `sims/valdez2023a/config.yaml`. `audit_status` unchanged (needs_audit).

Each finding was re-checked against `references/<id>/text.md` and the figures (Fig. 5 of arabjuneghani2022 re-rendered from `source.pdf`; Fig. 4(b) and 4(d) of valdez2023a read from `figures/img_p06_13.png` and `img_p06_1.png`; Table II and Sec. 3.3 text of liu2025).

| ID | Severity | Disposition | Exact change or reason |
|---|---|---|---|
| F1 | blocking | applied | devices.csv arabjuneghani2022-b: `bw3db_ghz` 170 -> 100; `qualifiers` += `bw3db_ghz:gt`; `bw_basis` stays measured; notes first bandwidth sentence reworded (bound; 170 GHz extrapolation in notes only). evidence `bw3db_ghz`: 170/predicted -> 100/measured, locator "p.1 abstract; p.4 Sec. 3.3, Fig. 5(b)", note rewritten. papers.csv arabjuneghani2022 notes: "basis predicted" sentence replaced. Fig. 5(b) confirms: measured trace ends near -1.3 dB at 100 GHz; only the dashed curve crosses -3 dB (about 175-190 GHz). |
| F2 | numerical | applied | devices.csv liu2025-a: `bw3db_ghz` 220 -> 110, `bw_basis` predicted -> measured, `qualifiers` eo_rolloff_db:lt -> eo_rolloff_db:lt;bw3db_ghz:gt. liu2025-b: 218 -> 110, same basis and qualifier changes. Notes reworded (extrapolation 220 / 218 GHz is a prediction, not a column). evidence `bw3db_ghz` (both): value 110, basis measured, locator "p.10 Sec. 3.3, Fig. 8(b); p.12 Table II", note quotes 'far beyond 110 GHz' and Table II '> 110'. Source: Sec. 3.3 text and Table II (> 110 (220a), > 110 (218a), a: extrapolated). |
| F3 | numerical | applied | Re-read Fig. 4(d) (0.8 cm): points touch -3 dB near 74-81 GHz, lie below -3 dB near 95-96 and 101-103 GHz, stay below from about 106 GHz, end near -4.3 dB; authors take the edge above 100 GHz. Fig. 4(b) (0.4 cm): all points above -3 dB until the last point (about -3.1 dB at 110 GHz), so gt 100 stays. devices.csv valdez2023a-b: `qualifiers` bw3db_ghz:gt -> bw3db_ghz:approx; notes reworded. evidence `bw3db_ghz` (b) note rewritten, value 100 and basis unchanged. sims/valdez2023a/config.yaml: target comment and limitation reworded (approximate noisy crossing). papers.csv valdez2023a notes updated to describe gt for a, approx for b. |
| F4 | metadata | applied-adjusted | Per coordinator (no network): papers.csv liu2025 `doi` 10.1002/lpor.202570057 -> empty; `venue` -> "arXiv; associated journal: Laser & Photonics Reviews 19(14), 2025 (article DOI not verified)" (journal name kept, as the coordinator specified); notes IDENTITY CAVEAT rewritten (cover record, DOI cleared, article DOI unverified, needs Crossref fetch). No evidence entry referenced the DOI. |
| F5 | minor | applied | sims/arabjuneghani2022/config.yaml target `bw3db_ghz` 170: source changed from device cell to `{paper_id: arabjuneghani2022, locator: "p.1 abstract; p.4 Sec. 3.3, Fig. 5(b)", basis: predicted, note ...}`; limitation line notes the database stores the bound 100 gt. Target value 170 kept as a labelled prediction. |
| F6 | minor | applied | devices.csv arabjuneghani2022-a notes appended: trace scatters about -3 dB from about 75 to 100 GHz, deepest about -3.5 dB near 97 GHz (approx. reading). Fig. 5(a) re-rendered; consistent. Values and basis unchanged. |
| F7 | minor | applied | evidence/liu2025.yaml: the two `derived` items removed (`derived: []`); `energy_per_bit_fj` 4.42 (liu2025-a) and 0.69 (liu2025-b) added to `entries`, basis author_estimate, unit fJ/bit, locator "p.12 Sec. 4", note with Vrms and B. CSV values unchanged. BATCH_REPORT wording corrected. R = 35 ohm remark not added to the data (my arithmetic, not stated by the authors as the energy basis). |
| F8 | minor | applied | devices.csv liu2025b-a notes appended: Methods say 500 kHz triangular sweep, Fig. 4 caption and conclusion say 'at 1 GHz', entered as DC per Methods. |
| F9 | minor | applied | devices.csv valdez2023a-a notes: "Vpi 2 V and 1 V given to one significant figure" -> "Vpi 2.0 V and 1.0 V (p.4; conclusion rounds to 2 V and 1 V)" (p.4 verified). papers.csv valdez2023a notes: "dated 23 Nov 2022 on p.1" -> "arXiv stamp 23 Nov 2022, 'Dated: November 28, 2022' on p.1". |
| F10 | minor | applied | devices.csv liu2025-b notes: RF-line sentence -> "RF index n_rf is entered on liu2025-a only; RF loss and Z0 are not entered." `epitaxy_or_stack` "50 deg sidewall" -> "50 deg design sidewall" in devices.csv (liu2025-a, -b) and evidence/liu2025.yaml (both entries). |
| F11 | minor (optional) | applied-adjusted | Venue only: papers.csv liu2025b `venue` -> "Light: Advanced Manufacturing 6(3), 47" (Crossref issue 3 confirmed). The licence-quote part is not applied: the CC-BY notice is already quoted in papers.csv notes, matching repository practice, and the audit states no change is required. |

## Counts

- Findings: 11
- applied: 9 (F1, F2, F3, F5, F6, F7, F8, F9, F10)
- applied-adjusted: 2 (F4, F11)
- rejected: 0
- deferred: 0 (see below)

## Changed numerical or blocking cells

| device_id | column | old -> new | source locator |
|---|---|---|---|
| arabjuneghani2022-b | bw3db_ghz | 170 -> 100 | p.1 abstract; p.4 Sec. 3.3, Fig. 5(b) |
| arabjuneghani2022-b | qualifiers | (no bw3db qualifier) -> bw3db_ghz:gt | same |
| arabjuneghani2022-b | evidence bw3db_ghz basis | predicted -> measured | same |
| liu2025-a | bw3db_ghz | 220 -> 110 | p.10 Sec. 3.3, Fig. 8(b); p.12 Table II |
| liu2025-a | bw_basis | predicted -> measured | same |
| liu2025-a | qualifiers | eo_rolloff_db:lt -> eo_rolloff_db:lt;bw3db_ghz:gt | same |
| liu2025-b | bw3db_ghz | 218 -> 110 | p.10 Sec. 3.3, Fig. 8(b); p.12 Table II |
| liu2025-b | bw_basis | predicted -> measured | same |
| liu2025-b | qualifiers | eo_rolloff_db:lt -> eo_rolloff_db:lt;bw3db_ghz:gt | same |
| valdez2023a-b | qualifiers | bw3db_ghz:gt -> bw3db_ghz:approx (value 100 unchanged) | p.4 Sec. III; p.6 Fig. 4(d) |
| liu2025 (papers.csv) | doi | 10.1002/lpor.202570057 -> empty | references/liu2025/crossref.json |
| sims/arabjuneghani2022/config.yaml | target bw3db_ghz source | device cell -> paper citation, basis predicted (value 170 unchanged) | p.1 abstract; p.4 Sec. 3.3 |
| liu2025-a / -b | evidence energy_per_bit_fj | derived list -> entries, basis author_estimate (values 4.42 / 0.69 unchanged) | p.12 Sec. 4 |

## Deferred items needing decisions

- None deferred. Coordinator follow-ups (network): fetch the Crossref record of the liu2025 article itself to fill `doi`, and verify arXiv 2411.15037 against the manuscript.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p4_01-verify-claude-audit-2026-10-04.md`: 11 of 11 confirmed. N1 applied: liu2025-a/-b row notes record that the measured Fig. 8(b),(c) traces roll off more at 110 GHz than the stated 0.77/0.83 dB (values kept; author statements). Follow-up needing network: fetch the liu2025 article Crossref record; references/liu2025 text.md/source.json still carry the issue-cover DOI.
