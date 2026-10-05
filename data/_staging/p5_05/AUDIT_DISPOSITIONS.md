# p5_05 audit dispositions

Audit: `data/_staging/audits/p5_05-q1-claude-audit-2026-10-04.md`
Date: 2026-10-04
Coordinator decisions applied where stated (F1-F6, license_notice). All findings re-checked against `references/<paper_id>/text.md`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | blocking | applied | devices.csv zhou2026-a: bw3db_ghz 140 -> 67; bw_basis author_estimate -> measured; qualifiers `vpi_dc_v:lt;bw3db_ghz:gt;bw_measured_to_ghz:approx;extinction_ratio_db:approx` -> `vpi_dc_v:lt;bw3db_ghz:gt;extinction_ratio_db:approx`; bw_measured_to_ghz stays 67. evidence/zhou2026.yaml bw3db_ghz: 140/author_estimate -> 67/measured, note says extrapolated >140 GHz not entered. Row notes and papers.csv notes reworded (extrapolation to notes only). Source p.1 Sec. 2: "1dB roll-off at 67GHz ... extrapolated 3dB bandwidth exceeding 140GHz". |
| F2 | numerical | applied (coordinator: clear length, not 13.5) | devices.csv yamaguchi2026-c: length_mm 40.5 -> empty; notes: "Vpi x 4.05 cm = 8.1 V cm" sentence -> low-frequency Vpi set by equalizer design, no effective length stated, VpiL not derived, chip length on chip row. evidence/yamaguchi2026.yaml: removed yamaguchi2026-c length_mm entry and the derived vpil_dc_vcm 8.1 entry (derived: []). 13.5 mm not entered; chip length 40.5 stays on -b. |
| F3 | numerical | applied | devices.csv zhang2026b-b vpi_basis measured -> derived. evidence/zhang2026b.yaml zhang2026b-b vpil_dc_vcm basis measured -> derived; note appended "VpiL computed by authors from measured Vpi x 0.5 cm". Value 1.87 unchanged. Source p.2 Sec. 3 and Fig. 3(b) caption (VpiL wafer map for 5 mm devices). |
| F4 | numerical | applied-adjusted (coordinator: keep both maxima) | max_baud_gbd 200 and max_line_rate_gbps 448 kept (both stated maxima; 448 eye has no stated baud, text p.2). devices.csv aihara2026-a notes: "implies 224 GBd by arithmetic" sentence -> "448 Gbps was shown as an eye without a stated baud (224 GBd if PAM4 at 2 bit/symbol); max_baud_gbd holds the highest stated 200 GBd". evidence max_line_rate_gbps note adds "baud not stated". No 224 value entered. |
| F5 | metadata | applied (coordinator mapping) | organizations.csv: removed row "NTT, Inc.". papers.csv aihara2026 companies "NTT, Inc." -> "Nippon Telegraph and Telephone Corporation"; paper notes record that the paper prints "NTT, Inc.". Canonical org note append is for the coordinator. |
| F6 | metadata | applied-adjusted (coordinator: leave empty) | foundry_or_fab stays empty on zhou2026 (paper prints no country for Liobate Technology). papers.csv note reworded to "prints no country"; Liobate note kept. |
| F7 | minor | applied | devices.csv yamaguchi2026-a/-b/-c tags: appended `results_from_prior_paper`; papers.csv yamaguchi2026 notes mention it. source_type stays conference. Paper states Fig. 1 and Fig. 2 cite [5], [6]. |
| F8 | minor | applied | devices.csv yu2026-a and zhang2026b-c: bw3db_reference empty -> unspecified (matches existing evidence entries). |
| F9 | minor | applied | evidence/yamaguchi2026.yaml yamaguchi2026-c vpi_dc_v: locator -> "p.3, Sec. 3 and Sec. 4; Fig. 2(d)", note -> "Semi-static curve; Conclusion attributes 2 V to the packaged module; DC bias and convention not stated"; extinction_ratio_db locator -> same. Row notes updated to match. Source p.3 Sec. 4 confirmed. |
| F10 | minor | applied | devices.csv zhang2026b-a/-b/-c integration foundry_native -> monolithic (foundry aspect already in tags). |
| F11 | minor | applied | evidence/zhou2026.yaml zhou2026-a drive_vpp_v note -> "AWG differential output range 1.3 to 2 Vppd; optional RF amplifier, swing at MZM not stated". Value 2 unchanged. Source p.2 Sec. 2. |
| F12 | minor | applied | evidence/aihara2026.yaml max_baud_gbd note appended "Fig. 3(a) label 9.7e-3"; row notes add "Target SER 9.3e-3 in text, 9.7e-3 in Fig. 3(a) label". Source p.2 text and Fig. 3(a). |
| F13 | minor | applied | devices.csv yu2026-a notes appended "Sec. 1 quotes up to 100 GHz for the co-designed TOSA." Values unchanged. Source p.1 Sec. 1. |
| F14 | minor | rejected (no change required) | Duplicate org "National Semiconductor Translation and Innovation Centre" is in p5_04 as well; merge compares type/country/region only (no conflict) and p5_04 is outside this batch. Note merge is a coordinator option. |
| CTX | coordinator | applied | Each evidence YAML (aihara2026, yamaguchi2026, yu2026, zhang2026b, zhou2026) gained top-level `context_values.license_notice` (value: printed Optica footer, locator "p.1 page footer (repeated on every page)"), in the kharel2021 dict form. |

Also updated: BATCH_REPORT.md (org count 8 -> 7, judgment calls for F1-F5, F7, F10).

## Counts

- applied: 12 (F1, F2, F3, F5, F7, F8, F9, F10, F11, F12, F13, CTX)
- applied-adjusted: 2 (F4, F6; coordinator choices)
- rejected: 1 (F14)
- deferred: 0

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| zhou2026-a | bw3db_ghz | 140 -> 67 | p.1 Sec. 2; Fig. 1 (measured trace ends at 67 GHz) |
| zhou2026-a | bw_basis | author_estimate -> measured | p.1 Sec. 2 |
| zhou2026-a | qualifiers | removed bw_measured_to_ghz:approx | convention (c) |
| yamaguchi2026-c | length_mm | 40.5 -> (empty) | p.2 Sec. 3; Fig. 2(a) (total length incl. equalizer sections) |
| yamaguchi2026-c | derived vpil_dc_vcm (evidence only) | 8.1 -> removed | p.2-3 Sec. 3 |
| zhang2026b-b | vpi_basis (and vpil_dc_vcm evidence basis) | measured -> derived | p.2 Sec. 3; Fig. 3(b) |
| zhang2026b-a/-b/-c | integration | foundry_native -> monolithic | schema enum, canonical TFLN rows |
| aihara2026 (paper) | companies | NTT, Inc. -> Nippon Telegraph and Telephone Corporation | p.1 affiliations |

## Deferred items needing decisions

- None. Coordinator follow-ups: append "aihara2026 (2026) prints NTT, Inc. for the same Atsugi units" to the canonical Nippon Telegraph and Telephone Corporation org note; optionally merge the p5_04/p5_05 notes for the National Semiconductor Translation and Innovation Centre; Liobate Technology as foundry_or_fab only after its country is verified.


## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p5_05-verify-claude-audit-2026-10-04.md`: 15/15 confirmed. N1 applied (yamaguchi2026-c module trace crosses -3 dB near 100 GHz, not 102; evidence note and BATCH_REPORT). N3 applied (zhou2026 TDECQ note: Fig. 2 reads about 3.6 dB for 15 taps, 3.7 dB for 23 taps; staged value follows the text). N2 not applied (optional 1 dB roll-off columns).
