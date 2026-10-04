---
verifier: fresh-context subagent
task: independent verification of round-2 audit corrections (pilots, p2_01, han2023)
date: 2026-10-04
scope: chen2022, kohli2025, ogiso2016, kieninger2020, wolf2018a, han2023
dispositions: data/_staging/pilot_ogiso2016/AUDIT_DISPOSITIONS_R2.md, data/_staging/pilot_chen2022/AUDIT_DISPOSITIONS_R2.md, data/_staging/pilot_kohli2025/AUDIT_DISPOSITIONS_R2.md, data/_staging/p2_02/AUDIT_DISPOSITIONS_R2.md
audit: data/_staging/audits/pilots-p2_01-han2023-r2-claude-audit-2026-10-03.md
mode: read-only except this report; sources re-read from references/<id>/source.pdf (pymupdf text extraction, page renders, embedded-image and vector-object analysis in a scratch area outside the repo)
verdict: corrections confirmed; one inaccurate statement in the R2-F2 deferral reason (no data impact)
counts: confirmed 13 changed-cell groups, not confirmed 0
---

# Round-2 correction verification: pilots, p2_01, han2023

## Per-paper summary

| Paper | Changed cells (CSV / evidence) | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| ogiso2016 | 1 / 4 | 5 | 0 | corrections confirmed |
| kohli2025 | 4 / 2 | 6 | 0 | corrections confirmed |
| chen2022 | 3 / 34 (3 values, 3 notes, 28 locators) | 37 | 0 | corrections confirmed |
| han2023 | 0 / 1 | 1 | 0 | corrections confirmed (R2-F2 deferral reason partly inaccurate, see Issues) |
| kieninger2020 | 0 / 0 | - | - | no changes |
| wolf2018a | 0 / 0 | - | - | no changes |

papers.csv and organizations.csv: no rows of the in-scope papers changed (the working-tree diffs there belong to other papers).

## Priority check 1: ogiso2016-a `eo_rolloff_db` 2.7 -> 2.0

Measured independently before reading the corrector's numbers.

- Fig. 4 (p.1) is an embedded 331 x 145 px JPEG; the axis labels are vector text outside it.
- Y axis: the 0 dB tick is a dark horizontal stub at row 2 px; the -3 dB level is the x-axis line at row 138 px. That gives 45.3 px/dB.
- X axis: tick columns at 6, 52, 145, 191, 237 and 283 px, so 0 GHz is at 6 px with 4.62 px/GHz. The 98 px tick is hidden under the trace region.
- The red trace starts at column 14 px (about 1.7 GHz) at row 4-15 px, which is about 0 dB. This matches the paper's 1.5 GHz reference ("3 dB EO-BW (1.5 GHz reference) was over 67 GHz").
- The trace ends at column 315 px (66.9 GHz). There the red pixels span rows 89-95 px, centred at 92 px, which is -1.99 dB (lowest pixel -2.05 dB). Column 314 reads rows 82-88 px (-1.8 to -1.9 dB). The lowest point of the whole trace is at the end of the trace, about -2.05 dB.
- Reading: about -2.0 dB (+/- 0.1 dB) at 67 GHz. The value 2.7 dB is not supported. **2.0 (approx) confirmed.**
- The corrector's measurement in the disposition (y ticks at 2 and 138 px, end at 315 px, rows 88-95 px, -1.90 to -2.05 dB) agrees with mine.

## Priority check 2: kohli2025-rt `bw_measured_to_ghz` 70 -> 75

- Fig. 4d (p.6) is vector graphics with a broken axis (lower sideband -75 to -30 GHz, upper sideband 30 to about 75 GHz).
- Label centres: 30, 50 and 70 GHz at x = 416.8, 447.5 and 478.2 pt, which gives 1.535 pt/GHz. The 70 GHz gridline is at x = 478.2 pt.
- The right frame line is at x = 485.6 pt, so the axis ends at (485.6 - 478.2)/1.535 + 70 = 74.8 GHz.
- The left frame is at x = 332.4 pt and the -70 label centre at 340.05 pt, so the left end is -75.0 GHz.
- On both sidebands the markers continue to the frame and are clipped by it. The last upper-sideband markers are near +1 to +2 dB; the lower-sideband markers at the edge are within about +/-1 dB.
- Methods (p.9) say a direct RF source was used up to 70 GHz and an RF mixer from 70 to 110 GHz, with an overlap at 70 GHz. So 70 GHz is not an instrument limit.
- About 75 GHz (approx, figure read) is confirmed. The new qualifier `bw_measured_to_ghz:approx` is appropriate.
- Caveat: markers centred at or just beyond the frame are clipped, so the plotted data may extend slightly past 75 GHz. 75 GHz remains a conservative lower bound on the measured span.

## Changed cells

| Paper | Row / entry | Field | Old -> new | Source locator | Verdict |
|---|---|---|---|---|---|
| ogiso2016 | devices ogiso2016-a | eo_rolloff_db | 2.7 -> 2.0 | p.1 Fig. 4, end of trace at 66.9 GHz, -1.99 dB (centre), ref 1.5 GHz (text p.1) | confirmed (approx) |
| ogiso2016 | evidence ogiso2016-a eo_rolloff_db | value | 2.7 -> 2.0 | same | confirmed; equals CSV |
| ogiso2016 | evidence ogiso2016-a eo_rolloff_db | note | "-2.7 dB ..." -> "-2.0 dB ... (figure read, pixel analysis against axis ticks)" | same | confirmed |
| ogiso2016 | evidence context_values eo_response_at_end_of_trace | value, note | "approx -2.7" -> "approx -2.0"; stale "not entered in CSV" -> "same reading as CSV eo_rolloff_db 2.0 at 67 GHz" | same | confirmed |
| kohli2025 | devices kohli2025-rt | bw_measured_to_ghz | 70 -> 75 | p.6 Fig. 4d axis end 74.8 GHz, data to frame; p.9 Methods 70-110 GHz via mixer | confirmed (approx) |
| kohli2025 | devices kohli2025-rt | qualifiers | += `bw_measured_to_ghz:approx` | figure read | confirmed |
| kohli2025 | devices kohli2025-rt | notes | "flat to the 70 GHz axis limit (Fig. 4d)" -> "flat to the axis end at about 75 GHz (Fig. 4d, figure read; last labelled tick 70 GHz)" | p.6 Fig. 4d | confirmed |
| kohli2025 | evidence kohli2025-rt bw_measured_to_ghz | value, note | 70 -> 75; "Axis spans +/-70 GHz" -> "Data plotted to the axis end at about +/-75 GHz ..." | p.6 Fig. 4d | confirmed; equals CSV |
| kohli2025 | devices kohli2025-iq | notes | trailing duplicate sentence removed; "text: response starts to drop at ~70 GHz" merged | p.5 text ("The frequency response starts to drop at ~70 GHz", IQ section); p.5 Fig. 3b caption (cutoff around 80 GHz; 3-dB drop between 10 and 70 GHz) | confirmed |
| chen2022 | devices chen2022-a/b/c | substrate | "silicon 725 um with 35 um isotropic undercut ..." -> "silicon 725 um, isotropically undercut beneath the modulation section (35 um design optimum; fabricated depth not stated)" | p.5 "a 35 um undercut etching of the silicon substrate is optimal"; p.6 isotropic ICP-RIE etch, 725 um Si, no depth; p.7 "Longer isotropic undercut etching ... should be done" | confirmed |
| chen2022 | evidence substrate (3 entries) | value, locator, note | as in the disposition | same | confirmed; values equal CSV |
| chen2022 | evidence locators (25 entries, R2-F5) | locator | Fig. 4 / Fig. 5 -> "p.6 Fig. ..."; "p.6-7 Fig. 6" -> "p.7 Fig. 6; p.7-8 text"; "p.6-7 Fig. 6(d); abstract" -> "p.7 Fig. 6(d); p.8 text; abstract"; "Table I" -> "p.8 Table I" | PDF text: FIG. 4 and FIG. 5 captions on p.6; FIG. 6 caption on p.7; Fig. 6(c)-(e) BER text and TABLE I on p.8 | confirmed (25 = 21 + 4 adjusted, matches the disposition) |
| han2023 | evidence han2023-a ng_opt | unit | '' -> '1' | data/schema/devices.schema.yaml: `ng_opt` unit "1" | confirmed |

No cells were cleared.

## Rejected / deferred findings

- **R2-F6 (chen2022 sim config S2/S3/S5), deferred.** The reason is supported: the write scope excluded `sims/`. I checked `sims/chen2022/config.yaml`:
  - the title still says "T-rail";
  - the `ln_rib_r` note still says "~68 deg";
  - the materials are still `standard_reference` with "not verified" notes;
  - the undercut polygons run from -3.0 to -38.0 um (35 um deep).

  The new follow-up the corrector added (label the undercut as the design value) is accurate.
- **R2-F2 (han2023 papers.csv form), deferred.** The deferral itself is reasonable. Exactly 27 papers.csv rows use the "arXiv; associated journal: ..." venue form, including han2023 and the six papers named. However, one supporting statement is wrong; see Issues.

## Metadata / notes

All changed notes are accurate to the source. They contain no paths, emoji or private information.

## Validator

`uv run python scripts/validate_db.py`: 0 error(s).

Evidence-vs-CSV equality holds for every changed value cell:
- ogiso2016-a eo_rolloff_db 2.0
- kohli2025-rt bw_measured_to_ghz 75
- chen2022-a/b/c substrate

## Issues

1. **R2-F2 disposition reason, factual error (no data change needed now).** `data/_staging/p2_02/AUDIT_DISPOSITIONS_R2.md` says "the `numbers_from_arxiv_v1` tag is used only by kieninger2020 and wolf2018a".
   - In fact `devices.csv` `tags` carry it for 15 papers: akazawa2026, chiang2025, johnson2025, kieninger2020, lee2020, lee2020a, luan2026, luan2026a, navarro2026, niels2026, taghavi2026, tiberi2025, witmer2020, wolf2018a, wu2023.
   - Four of these (lee2020, luan2026, taghavi2026, witmer2020) also use the "arXiv; associated journal" venue form that han2023 uses. So the tag and that venue form already coexist.
   - Proposed fix: change the sentence to "the `numbers_from_arxiv_v1` tag is used by 15 papers, including 4 that use the han2023 venue form (lee2020, luan2026, taghavi2026, witmer2020)".
   - For the coordinator decision: whatever is decided about the venue form, adding `numbers_from_arxiv_v1` to han2023-a `tags` would match that existing practice. han2023 numbers are from arXiv 2302.03652v1 per its notes.

## Unrecorded changes

None. Every changed cell for the in-scope papers in devices.csv and evidence yaml is recorded in a disposition. kieninger2020 and wolf2018a are unchanged, and no in-scope rows changed in papers.csv or organizations.csv.
