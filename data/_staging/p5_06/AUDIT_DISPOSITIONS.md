# Audit dispositions: p5_06

- Audit: `data/_staging/audits/p5_06-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Coordinator decisions applied: F1 apply (remove ohata2026 device rows, empty evidence entries, papers row kept with F2); every evidence YAML carries a top-level `context_values` item `license_notice`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | blocking | applied | Re-checked against `references/ohata2026/text.md`: 106 GHz cited to [8], 110 GHz to [10], eyes follow [8] title. `devices.csv`: rows ohata2026-a and ohata2026-b deleted. `evidence/ohata2026.yaml`: 8 entries -> `entries: []` (header and `derived: []` kept). |
| F2 | metadata | applied | `papers.csv` ohata2026: `repro_grade` C -> empty; `notes` replaced with the "NO DEVICE ROWS ... cited to ref 8 ... ref 10" text. `source_type` conference, companies, research_groups, countries unchanged. |
| F3 | numerical | applied-adjusted | Fig. 5 (img_p02_1) re-read: measured trace dips to about -3.3 dB near 72 GHz, so I wrote "about -3.3 dB near 72 GHz" (auditor: about -3.5 dB near 73 GHz); 83 GHz stays (stated, final crossing, `approx`, measured). `devices.csv` bhasker2026-a `notes`: appended "SSD21 ripple: dips just below -3 dB near 72 GHz (about -3.3 dB, Fig. 5 reading); 83 GHz is the final crossing." `evidence/bhasker2026.yaml` bw3db_ghz `note`: "Stated close to 83 GHz; measured mixed-mode SDD21 at 55 C, ..." -> "Stated close to 83 GHz (final -3 dB crossing); trace dips to about -3.3 dB near 72 GHz, Fig. 5 reading". Value 83 unchanged. |
| F4 | minor | applied-adjusted | Fig. 2(b) re-read: about -12.5 dB at -3.5 V (axis end); at -2 V the curve reads about -3 to -4 dB (auditor: 3-3.5), so "about 3 to 4 dB". `evidence/theurer2026.yaml` theurer2026-a extinction_ratio_db `note`: "Static ER, maximum up to 12 dB over plotted bias range, 50 C" -> "Static ER, maximum up to 12 dB at -3.5 V, 50 C; about 3 to 4 dB at -2 V operating bias, Fig. 2(b) reading". Value 12, `approx`, static unchanged; row notes not changed. |
| F5 | minor (advisory) | rejected (no cell change) | Advisory only; er_type choices (dynamic for bhasker2026, oe2026, okuda2026; static for theurer2026) confirmed against the sources. Views comparing ER must filter by `er_type`. |
| F6 | minor (informational) | applied (record only) | Primary papers (Okuda OFC 2025 Tu2J.7 / JLT 10.1109/JLT.2025.3588689; Masuyama ECOC 2025 W.01.02.3) noted in `BATCH_REPORT.md` ohata2026 section as candidates to queue. |
| C1 | coordinator | applied | `context_values: license_notice` (dict form: value "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group", locator "p.1-3 page footer (repeated on every page)", note) added to bhasker2026, oe2026, ohata2026, okuda2026, theurer2026 evidence YAML. Footer verified printed on pages 1-3 of each `text.md`. |

Also: `BATCH_REPORT.md` updated (device row count 6 -> 4, ohata2026 section, repro_grade note).

## Counts

- applied: 3 (F1, F2, C1); applied-adjusted: 2 (F3, F4); applied record-only: 1 (F6); rejected: 1 (F5, advisory, no change); deferred: 0.

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| ohata2026-a | whole row (bw3db_ghz 106, max_line_rate_gbps 450, modulation_format, epitaxy_or_stack, bw3db_reference) | removed | ohata2026 p.1-2, refs [8]; Fig. 1(d), Fig. 2 |
| ohata2026-b | whole row (bw3db_ghz 110, bw_measured_to_ghz 110, bw3db_reference) | removed | ohata2026 p.3, ref [10]; Fig. 3(c) |
| (papers) ohata2026 | repro_grade | C -> empty | n/a (no device rows) |
| bhasker2026-a | bw3db_ghz | 83 -> 83 (value unchanged; note and qualifier context added) | bhasker2026 p.2, Fig. 5 (dip to about -3.3 dB near 72 GHz) |
| theurer2026-a | extinction_ratio_db | 12 -> 12 (value unchanged; evidence note adds -3.5 V and -2 V reading) | theurer2026 p.2, Fig. 2(b) |

## Deferred items needing decisions

None.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_06`: merge counts papers 5, devices 4, orgs 3, evidence 5; conflicts 0; validation errors 0.
