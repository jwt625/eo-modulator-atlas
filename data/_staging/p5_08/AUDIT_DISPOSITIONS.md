# Audit dispositions: p5_08

Audit: `data/_staging/audits/p5_08-q1-claude-audit-2026-10-04.md`
Date: 2026-10-04
Coordinator decisions applied: F1/F2 drop rows with cross-reference; F3 trim option; F4 apply; F5 preferred fix; F6 keep "NVIDIA Corporation" here (coordinator aligns p5_02); F7 keep GB with traceable note; F8-F11 apply.

Each finding was re-checked against `references/tiberi2026` (text, Fig. 1(a), 2(a), 2(b), 3, Table 1 renders), `references/tiberi2025` (Table IV, Fig. 9 render, Ref. [103]), `references/kholeif2026` (Fig. 1 render, text), and the text of tatarczak2026, karakida2026, sun2026.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | blocking | applied | Confirmed: Fig. 2(b) trace and Table 1 C 40 um rows equal tiberi2025 Fig. 9(b) and Table IV filtered columns. devices.csv: row tiberi2026-a deleted; all its evidence entries deleted. papers.csv tiberi2026 notes: replaced "Four rows ..." with cross-reference (see F4). evidence/tiberi2026.yaml context_values added: static_er_c_band_40um (about 3.5 dB), drive_estimate (about 3 Vpp, under 100 fJ/bit, tiberi2025 states about 7 V and 58 fJ/bit), c_band_rows_not_entered. tiberi2025 canonical files untouched. |
| F2 | blocking | applied | Confirmed: Table 1 C 100 um rows equal tiberi2025 Table IV L = 100 um filtered rows. devices.csv: row tiberi2026-b deleted; its evidence entries deleted. Mentioned in papers.csv notes and context c_band_rows_not_entered. |
| F3 | numerical | applied (trim option) | devices.csv tiberi2026-c: max_baud_gbd 40 -> empty; max_line_rate_gbps 40 -> empty; modulation_format "NRZ 2^7-1 PRBS at 40 Gb/s; BER 4.4e-2" -> "NRZ 2^7-1 PRBS, 40 Gb/s demo as tiberi2025-c; BER 4.4e-2, eye ER 0.81 dB (Table 1)"; notes -> "Likely same 40 um device and eye as tiberi2025-c; new: static ER about 2 dB at 1310 nm, bias about -6 V, Table 1 BER." (shortened to 25 words from the audit wording). Evidence: max_baud_gbd and max_line_rate_gbps entries removed; modulation_format value, locator (p.3 Table 1) and note updated. Kept wavelength 1310, extinction_ratio_db 2 approx static, rib_width_nm 400. Context o_band_static added. |
| F4 | minor | applied | devices.csv tiberi2026-d: rib_width_nm empty -> 400, evidence entry added (extracted_from_figure, p.2 Fig. 1(a), O-band cross-section label; Fig. 1(a) shows 450 nm C and 400 nm O). tiberi2026-d max_baud_gbd evidence basis derived -> measured, note "NRZ, one bit per symbol". papers.csv tiberi2026 notes replaced with the two-row cross-reference. Context notes for eye_er_db_table1 and snr_table1 updated. |
| F5 | numerical | applied (preferred fix) | Confirmed p.2 Sec. 2.1 wording is a requirement and the eye is simulated. devices.csv tatarczak2026-a drive_vpp_v 2.0 -> empty; evidence entry removed; context drive_requirement added ("2.0 Vppd on 100 ohm, T = 20 C", p.2 Sec. 2.1). |
| F6 | metadata | applied-adjusted | organizations.csv NVIDIA Corporation notes extended to "Santa Clara, CA (sun2026, patel2026 p.1, written NVIDIA in patel2026); Yokneam, Israel site (sun2026)"; name kept. Verified patel2026 p.1 prints "NVIDIA, 2788 San Tomas Expressway, Santa Clara". The p5_02 change is the coordinator's (outside this batch). |
| F7 | metadata | applied | organizations.csv CORNERSTONE notes -> "SOI fab named in tiberi2026 p.1, no address printed; GB from the Southampton-hosted URL in tiberi2025 Ref. [103], cited as tiberi2026 Ref. [8]". Verified tiberi2025 Ref. [103] URL is cornerstone.sotonfab.co.uk and tiberi2025 affiliation 4 is Optoelectronics Research Centre, University of Southampton. Country GB and parent_org empty unchanged. |
| F8 | minor | applied-adjusted | evidence/kholeif2026.yaml: energy_per_bit_fj locator "p.1 abstract; p.3 Sec. 4" -> "p.1 Introduction; p.3 Sec. 4" (abstract has no aJ value; confirmed). il_onchip_db note -> "Off-resonance on-chip IL; Fig. 1(c) label 0.74; Fig. 1 caption says 0.75 dB" (label read on the p.2 render). context other_points note extended with swapped-voltage observation (arithmetic rechecked: 20/72 x 18 fF x (0.14 V)^2 = 98 aJ; 20/72 x 18 fF x (0.11 V)^2 = 60.5 aJ). No cell change. |
| F9 | minor | applied | evidence/kholeif2026.yaml derived (tuning_nm_per_v 0.208, fsr_nm 2.28) -> `derived: []`. 25.5 GHz/V and 279.5 GHz remain in context_values. |
| F10 | minor | applied | evidence/karakida2026.yaml: wavelength_nm note -> "IL and ER wavelength (1515 nm is below C-band); EO response measured at 1532 nm"; band c_band kept (judgment: S21 is at 1532 nm in C-band). context abstract_loss renamed loss_claim, locator -> "p.1 Sec. 1; p.3 Sec. 4" (verified: p.1 Introduction line and p.3 Conclusion "low-loss (2 dB)"). drive_vpp_v 10 kept (static swing, DB precedent). |
| F11 | minor | applied | evidence/sun2026.yaml: tuning_nm_per_v notes for sun2026-a and sun2026-b gain "bias range not stated" (sun2026-a note shortened by 2 words to stay at 24 words). Values unchanged. |

## Counts

- applied: 9 (F1, F2, F3, F4, F5, F7, F9, F10, F11)
- applied-adjusted: 2 (F6: name kept, note extended, p5_02 side left to coordinator; F8: locator and note edits only, no cell change)
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| tiberi2026-a | whole row (bw3db_ghz 67, bw_measured_to_ghz 67, max_baud_gbd 80, max_line_rate_gbps 80, modulation_format, extinction_ratio_db 3.5, drive_vpp_v 3, energy_per_bit_fj 100 lt, wavelength_nm 1550, rib_width_nm 450, length_mm 0.04) | deleted | tiberi2026 p.2 Fig. 2(b), p.3 Table 1 vs tiberi2025 Fig. 9(b)-(c), Table IV (p.14-15) |
| tiberi2026-b | whole row (length_mm 0.1, max_baud_gbd 80, max_line_rate_gbps 80, modulation_format) | deleted | tiberi2026 p.3 Table 1 vs tiberi2025 Table IV (p.15) |
| tiberi2026-c | max_baud_gbd | 40 -> empty | tiberi2025-c carries 40 GBd; tiberi2026 p.3 Table 1 |
| tiberi2026-c | max_line_rate_gbps | 40 -> empty | same |
| tiberi2026-c | modulation_format | "NRZ 2^7-1 PRBS at 40 Gb/s; BER 4.4e-2" -> "NRZ 2^7-1 PRBS, 40 Gb/s demo as tiberi2025-c; BER 4.4e-2, eye ER 0.81 dB (Table 1)" | p.3 Table 1 |
| tiberi2026-d | rib_width_nm | empty -> 400 | p.2 Fig. 1(a) |
| tatarczak2026-a | drive_vpp_v | 2.0 -> empty | p.2 Sec. 2.1 (requirement, not a measured demo swing) |

Unchanged but worth a verifier look: tiberi2026-c extinction_ratio_db 2 (approx, static; Fig. 2(a) O-band plateau about -2.0 dB, text "ER ~ 2 dB"), wavelength 1310.

## Deferred items needing decisions

- None in this batch.
- Coordinator follow-ups outside this batch: align p5_02 NVIDIA org name and patel2026 `companies` to "NVIDIA Corporation"; optionally add a tiberi2025 100 um C-band row (Table IV) and a pointer to tiberi2026 in tiberi2025-a notes (canonical files, not touched here).
