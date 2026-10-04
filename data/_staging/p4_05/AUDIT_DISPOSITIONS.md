# Audit dispositions: p4_05

- Audit: `data/_staging/audits/p4_05-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Author: correction pass; every finding re-checked against `references/<paper_id>/text.md` and page or figure renders. `audit_status` stays needs_audit.
- Paths below are relative to `data/_staging/p4_05/`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | metadata | applied | devices.csv derose2012-a, -b, -c, `drive`: push_pull -> series_push_pull; `tags`: push_pull -> series_push_pull. evidence/derose2012.yaml `drive` entries (a, b, c): value series_push_pull, basis design_target -> derived, locator "p.1, Fig. 1(c); p.2, Sec. 2", note rewritten (authors say push-pull; Fig. 1(c) and p.2 show two series-connected junctions driven by one RF signal). Fig. 1(c) render checked: V_RF across the outer contacts, centre n+ held by V_bias through a resistor. Device labels keep the authors' wording. |
| F2 | minor | applied | No value change. devices.csv dong2026-a `notes`: "trace ends near -3.6 dB at the 70 GHz axis end with high-frequency ripple" -> "trace dips to about -3.6 dB near 69.5-70 GHz (ripple the authors attribute to setup calibration), last point about -2.9 dB". evidence/dong2026.yaml `bw3db_ghz` note mirrored. Fig. 1 render checked. |
| F3 | minor | applied | devices.csv dong2026-a `bw3db_reference`: unspecified -> dc. evidence/dong2026.yaml `bw3db_reference`: value dc, basis stays derived, note "Sdd21 normalized to about 0 dB at the lowest frequency; reference not stated". Trace starts at 0 GHz near 0 dB, as for wang2026a, liu2026b, yue2025. |
| F4 | minor | applied | evidence/liu2026b.yaml liu2026b-a `bw3db_ghz` note: "responses stay above -1.1 dB at 0 V and -2 V" -> "No -3 dB crossing within 67 GHz; lowest point about -1.2 dB (Seg3, 0 V, near 66 GHz)". Fig. 2(b) render checked (Seg3 0 V minimum near -1.2 dB). No value change. |
| F5 | minor | applied | devices.csv liu2026b-a `il_onchip_excludes`: appended "; Fig. 2(a) peak about -9 dB on an absolute transmission axis, may include grating couplers". evidence/liu2026b.yaml `il_onchip_db` note extended likewise. Value 9 unchanged. |
| F6 | minor | applied-adjusted | devices.csv wang2026a-a `notes`: "about +1.5 dB peaking at low frequency" -> "about +2 dB peaking near 15-20 GHz". Auditor suggested "near 18 GHz"; my 600 dpi crop of Fig. 1(d) gives a broad maximum of about +1.9 dB around 15-20 GHz, so a range is stated. |
| F7 | minor | applied | devices.csv yue2025-b `vpi_convention`: unspecified -> (empty). No evidence entry existed; no Vpi/VpiL value on the row. |
| F8 | minor | applied | Coordinator condition met: p.13 Sec. 2B states the 0 V values (43.1 and 81.9 GHz) as measured 3 dB bandwidths of the Fig. 5(b) response, the same measurement and DC-normalized reference as the 6 V rows. Added devices.csv yue2025-c (TFT m=1, 0 V, bw3db_ghz 81.9, length_mm 0.9) and yue2025-d (m=0, 0 V, bw3db_ghz 43.1, length_mm 0.3), `bw3db_reference` dc, `bw_basis` measured, no qualifiers, no `bw_measured_to_ghz`. Device and geometry fields copied from -a / -b. Left empty because their bias is not stated or they belong to the 6 V operating point: IL, ER, propagation loss, Vpi, VpiL, drive amplitude, eye data, driver. evidence/yue2025.yaml: new entries for both rows (length_mm, geometry, substrate, epitaxy_or_stack, drive, bw3db_ghz, bw3db_reference), locator "p.13, Sec. 2B; Fig. 5(b)" for bandwidth. Fig. 5(b) render consistent (m=1 0 V near 80 GHz, m=0 0 V near 40-45 GHz). |
| F9 | minor | applied | No value change. evidence/derose2012.yaml `epitaxy_or_stack` notes (a, b, c) now end with "dopant species as written (As, P named for n- and p-type)" (23 words). |
| F10 | minor | applied | papers.csv yue2025 `notes`: appended "arXiv v1 p.1 states Optica Open Access Publishing Agreement; VoR license OA_License_v2 per Crossref." `license` and `redistribution` unchanged. |

Also edited: BATCH_REPORT.md (device count 9 -> 11, yue2025 0 V rows, dong2026 trace wording and reference, derose2012 drive). Formatting of evidence yaml files was normalized by the YAML dump (line wrapping only, no content change beyond the above).

## Counts

- Findings: 10 (F1-F10).
- applied: 9 (F1, F2, F3, F4, F5, F7, F8, F9, F10).
- applied-adjusted: 1 (F6).
- rejected: 0.
- deferred: 0.

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| yue2025-c | bw3db_ghz (new row) | (none) -> 81.9 | references/yue2025/text.md p.13 Sec. 2B; Fig. 5(b) |
| yue2025-c | length_mm (new row) | (none) -> 0.9 | p.14 Table 2; p.12 Sec. 2B |
| yue2025-d | bw3db_ghz (new row) | (none) -> 43.1 | p.13 Sec. 2B; Fig. 5(b) |
| yue2025-d | length_mm (new row) | (none) -> 0.3 | p.12 Fig. 4 caption |
| yue2025-c, yue2025-d | bw3db_reference (new rows) | (none) -> dc | p.13 Fig. 5(b)-(c) (derived) |
| dong2026-a | bw3db_reference | unspecified -> dc | p.2 Fig. 1 (derived) |
| derose2012-a, -b, -c | drive | push_pull -> series_push_pull | p.1 Fig. 1(c); p.2 Sec. 2 |
| yue2025-b | vpi_convention | unspecified -> empty | no Vpi value reported |

No Vpi, VpiL, IL, ER or other bandwidth values changed on existing rows.

## Deferred items needing decisions

None.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p4_05`: merge counts papers 5, devices 11, orgs 1, evidence 5; conflicts 0; validation errors 0 (dry run, nothing written).

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p4_05-verify-claude-audit-2026-10-04.md`: 17 of 17 corrections confirmed. New minor N1 applied: yue2025-b/-d `length_mm` evidence locator -> "p.11, Fig. 4(b) caption; p.12, Sec. 2B" (Fig. 4 caption is on p.11 of text.md). N2 applied to the yue2025-b `bw3db_ghz` evidence note ("trace first crosses -3 dB near 68-70 GHz") and row note ("near 68 to 70 GHz"). No value changed.
