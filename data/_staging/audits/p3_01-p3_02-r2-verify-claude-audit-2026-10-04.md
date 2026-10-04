---
verifier: fresh-context subagent
task: verify round-2 audit corrections for p3_01 and p3_02
date: 2026-10-04
scope: p3_01 (xu2020, wang2022a, zhang2022, qi2024, li2022b) and p3_02 (churaev2023, vanackere2023, liu2023, wu2025, celik2022); dispositions data/_staging/p3_01/AUDIT_DISPOSITIONS_R2.md and data/_staging/p3_02/AUDIT_DISPOSITIONS_R2.md; audit data/_staging/audits/p3_01-p3_02-r2-claude-audit-2026-10-03.md
mode: read-only (only this file written; read-only git diff / git show HEAD on data/; no network; no build or merge)
verdict: corrections confirmed for all papers in scope; no unrecorded change
counts: {changed_cells: 18, confirmed: 18, not_confirmed: 0}
validator: "uv run python scripts/validate_db.py -> 0 error(s)"
---

# Verification of round-2 corrections: p3_01 and p3_02

## Method

- Diff: `git diff HEAD` on `data/evidence/<id>.yaml` for the ten papers, plus a cell-by-cell comparison (scratchpad script, csv.DictReader on `git show HEAD:<file>` vs working copy) of `data/papers.csv`, `data/devices.csv` and `data/organizations.csv` restricted to rows whose `paper_id` is in scope.
- Sources: `references/<id>/text.md` (page markers used for page numbers) for xu2020 p.4-5, wang2022a p.2-3, qi2024 p.6, vanackere2023 p.5, liu2023 p.9, celik2022 p.1, p.3, p.7-8; `references/xu2020/figures/page_04.png` opened; `references/liu2023/crossref.json` and `references/celik2022/crossref.json` read.
- Evidence-vs-CSV equality checked for every changed field (script).
- Out-of-scope changes seen and ignored: devices.csv rows of other papers; the only organizations.csv change is the Sandia National Laboratories notes cell (valdez/weigel batch), not tied to any paper in scope.

## Per-paper summary

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| xu2020 | 7 (2 basis, 2 notes, 3 locators) | 7 | 0 | corrections confirmed |
| wang2022a | 5 (1 basis, 1 note, CSV cladding, evidence cladding value, evidence cladding note) | 5 | 0 | corrections confirmed |
| zhang2022 | 0 | - | - | unchanged (no findings) |
| qi2024 | 2 (1 basis, 1 note) | 2 | 0 | corrections confirmed |
| li2022b | 0 | - | - | unchanged (no findings) |
| churaev2023 | 0 | - | - | unchanged (no findings) |
| vanackere2023 | 1 (basis) | 1 | 0 | corrections confirmed |
| liu2023 | 2 (published_on, notes) | 2 | 0 | corrections confirmed |
| wu2025 | 0 | - | - | unchanged (no findings) |
| celik2022 | 1 (notes) | 1 | 0 | corrections confirmed |

## Changed cells

| # | Paper / device | File, field | Old -> new | Source locator | Verdict |
|---|---|---|---|---|---|
| 1 | xu2020-a | evidence `vpil_dc_vcm` (2.4) basis | measured -> derived | p.5 "measured Vpi for the 7.5 and 13 mm devices are 3.1 and 1.9 V, corresponding to VpiL of 2.3 and 2.4 V cm" | confirmed (author-computed product; convention h) |
| 2 | xu2020-a | evidence `vpil_dc_vcm` note | "as reported; 1.9 V x 1.3 cm = 2.47" -> "stated by authors from Vpi and length; 1.9 V x 1.3 cm = 2.47" | p.5 | confirmed (arithmetic 2.47 correct; 14 words) |
| 3 | xu2020-b | evidence `vpil_dc_vcm` (2.3) basis | measured -> derived | p.5 (same sentence) | confirmed |
| 4 | xu2020-b | evidence `vpil_dc_vcm` note | "as reported; 3.1 V x 0.75 cm = 2.33" -> "stated by authors from Vpi and length; 3.1 V x 0.75 cm = 2.33" | p.5 | confirmed |
| 5 | xu2020-a | evidence `extinction_ratio_db` locator | "p.5 Fig. 3(a) inset" -> "p.4 Fig. 3(a) inset; p.5 text" | page_04.png: Fig. 3(a) with "ER > 25 dB" inset on p.4; text "> 25 dB", "24 to 28 dB" on p.5 | confirmed |
| 6 | xu2020-a | evidence `band` locator | "p.5 Fig. 3(c)" -> "p.4 Fig. 3(c); p.5 text" | page_04.png: Fig. 3(c) 1530/1550/1570 nm traces on p.4; "whole C-band" on p.5 | confirmed |
| 7 | xu2020-b | evidence `band` locator | "p.5 Fig. 3(c)" -> "p.4 Fig. 3(c); p.5 text" | as #6 | confirmed |
| 8 | wang2022a-a | evidence `vpil_dc_vcm` (2.6) basis | measured -> derived | p.3 "half-wave voltage is 2.18 V, corresponding to the half-wave voltage length product of 2.6 V.cm" | confirmed |
| 9 | wang2022a-a | evidence `vpil_dc_vcm` note | "as reported; 2.18 V x 1.2 cm = 2.62" -> "stated by authors from Vpi and length; 2.18 V x 1.2 cm = 2.62" | p.3 | confirmed |
| 10 | wang2022a-a | devices.csv `cladding` | "SiO2 2 um (PECVD, whole chip)" -> "SiO2 2 um (whole chip)" | p.2 step (ix) "the whole chip is cladded by 2-um-thick SiO2 for the velocity matching condition in modulation section"; PECVD named only for the 900 nm SiO2 (step vi) and the 3.2 um SiON | confirmed |
| 11 | wang2022a-a | evidence `cladding` value | same as #10 | p.2 step (ix) | confirmed; equals CSV |
| 12 | wang2022a-a | evidence `cladding` note | "also 900 nm PECVD SiO2 earlier; 3.2 um SiON for the SSC; modulation-section stack not drawn" -> "deposition method of the 2 um layer not stated; 900 nm PECVD SiO2 earlier; 3.2 um PECVD SiON for the SSC; modulation-section stack not drawn" | p.2 steps (vi), (vii)-(viii) "3.2-um-thick SiON ... deposited on the whole chip by PECVD process" | confirmed (25 words, at the limit) |
| 13 | qi2024-d | evidence `vpil_dc_vcm` (2.53) basis | measured -> derived | p.6 "measured Vpi of a 12.917-mm modulator is 1.96 V, corresponding to a voltage-length product (VpiL) of 2.53 V cm" | confirmed |
| 14 | qi2024-d | evidence `vpil_dc_vcm` note | "1.96 V x 1.2917 cm = 2.53" -> "stated by authors from Vpi and length; 1.96 V x 1.2917 cm = 2.53" | p.6 | confirmed (1.96 x 1.2917 = 2.532) |
| 15 | vanackere2023-a | evidence `drive_vpp_v` (4.4) basis | author_estimate -> measured | p.5 "we estimate that the 4.4 V peak-to-peak input signal at 56 Gb/s will result in an approximate extinction ratio of 3.7 dB" | confirmed (the estimate is the ER; 4.4 Vpp is the stated applied drive; note unchanged) |
| 16 | liu2023 | papers.csv `published_on` | 2023-05-29 -> 2023-05-09 | p.9 "Accepted article preview online: 09 May 2023 / Published online: 29 May 2023"; crossref.json `created` 2023-05-09, `published`/`issued` year only; schema `published_on` = "ISO date of first public version if known" | confirmed |
| 17 | liu2023 | papers.csv `notes` | sentence "published_on 2023-05-29 from 'Published online' on p.9 (Crossref gives only the year 2023)." -> "published_on 2023-05-09 = 'Accepted article preview online' on p.9 (first public version; version of record online 2023-05-29; Crossref gives only the year 2023)." | p.9; crossref.json | confirmed; rest of cell unchanged |
| 18 | celik2022 | papers.csv `notes` | final sentence removed; remainder byte-identical | see metadata check below | confirmed |

Row-level `vpi_basis` stays `measured` on xu2020-a/b, wang2022a-a, qi2024-d (headline Vpi is measured); consistent with convention (h) ("evidence basis wins") and with the disposition text. No sim config target values are affected (vanackere2023 sims do not use `drive_vpp_v`; wang2022a/qi2024 VpiL targets unchanged in value).

## Rejected or deferred findings

None in either disposition file (p3_01: 3 applied; p3_02: 3 applied). Nothing to sample.

## Metadata and notes check

- celik2022 remaining notes: spot-checked against source. arXiv 2204.03138v1 stamp "7 Apr 2022" (p.1, text line with the arXiv stamp); Crossref volume 30, issue 13, page 23177, issued 2022-06-09, licenses `OA_License_v2#VOR-OA` and the TDM policy only (no preprint license); p.8 "Part of this work was performed at the Stanford Nano Shared Facilities (SNSF), and Stanford Nanofabrication Facility (SNF)"; RC circuit model with 50 ohm input and about 20 ohm electrode resistance (p.7); Qi = 4.4e5 at 780 nm, directional couplers, "10% efficient grating couplers" (p.1, p.3, p.5). Accurate. The removed sentence is not reintroduced or quoted here.
- liu2023 notes: accurate as above.
- No absolute paths, emoji or private information in the changed notes, evidence notes or the two disposition files.
- Evidence note lengths: all changed notes at or under 25 words (max 25, wang2022a-a cladding).

## Validator and equality

- `uv run python scripts/validate_db.py`: `0 error(s)`.
- Evidence vs CSV for changed fields: xu2020-a vpil 2.4 = 2.4; xu2020-b vpil 2.3 = 2.3; wang2022a-a vpil 2.6 = 2.6; wang2022a-a cladding "SiO2 2 um (whole chip)" = CSV; qi2024-d vpil 2.53 = 2.53; vanackere2023-a drive_vpp_v 4.4 = 4.4. All equal.

## Issues

None.

## Unrecorded changes

None. Every changed cell for the ten papers (papers.csv: liu2023 published_on and notes, celik2022 notes; devices.csv: wang2022a-a cladding; evidence: xu2020, wang2022a, qi2024, vanackere2023 entries above) is recorded in the disposition files. zhang2022, li2022b, churaev2023 and wu2025 show no change in any file.
