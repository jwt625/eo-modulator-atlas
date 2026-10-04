# Audit dispositions, round 2: batch p3_02

- Audit: `data/_staging/audits/p3_01-p3_02-r2-claude-audit-2026-10-03.md`
- Papers: churaev2023, vanackere2023, liu2023, wu2025, celik2022
- Date: 2026-10-04
- Companion file for the p3_01 papers of the same audit: `data/_staging/p3_01/AUDIT_DISPOSITIONS_R2.md`
- Source re-check: `references/vanackere2023/text.md` p.5 (Sec. IV, lines on the 56 Gb/s eye); `references/liu2023/text.md` p.9 (article history) and `references/liu2023/crossref.json` (only year 2023 in `published`/`issued`; `created` 2023-05-09); `data/papers.csv` celik2022 `notes`.
- Files edited: `data/papers.csv` (liu2023 `published_on` and `notes`; celik2022 `notes`), `data/evidence/vanackere2023.yaml`. Not edited: `data/devices.csv` rows of this batch, `data/organizations.csv`, `sims/`, `references/`, `audit_status`.
- churaev2023 and wu2025: no findings in this audit; unchanged.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F2 | minor | applied | Source: vanackere2023 p.5 "we estimate that the 4.4 V peak-to-peak input signal at 56 Gb/s will result in an approximate extinction ratio of 3.7 dB"; the estimate is the ER, the 4.4 Vpp is the stated applied drive. `data/evidence/vanackere2023.yaml` vanackere2023-a `drive_vpp_v` (4.4) basis `author_estimate` -> `measured`; note unchanged ("4.4 V peak-to-peak input signal at 56 Gb/s; authors estimate the resulting dynamic ER as 3.7 dB"). CSV unchanged. |
| R2-F5 | metadata | applied | Coordinator condition: apply only if the schema wording decides it. Wording relied on: `data/schema/devices.schema.yaml` papers column `published_on`, desc "ISO date of first public version if known". Source p.9: "Accepted article preview online: 09 May 2023 / Published online: 29 May 2023"; the accepted preview is a public online version and is earlier; Crossref `created` 2023-05-09 is consistent. Convention (k) satisfied by quoting the paper's own notice. `papers.csv` liu2023 `published_on` 2023-05-29 -> 2023-05-09. `notes`: "published_on 2023-05-29 from 'Published online' on p.9 (Crossref gives only the year 2023)." -> "published_on 2023-05-09 = 'Accepted article preview online' on p.9 (first public version; version of record online 2023-05-29; Crossref gives only the year 2023)." `year` 2023 unchanged. |
| R2-F7 | minor | applied | Coordinator decision: apply. `papers.csv` celik2022 `notes`: the final sentence (project-member coauthor disclosure) is removed; the rest of the cell is byte-identical. The disclosure remains in the audit records and DevLog. The author list is unchanged. |

## Counts

- Findings for p3_02 papers: 3
- applied: 3 (R2-F2, R2-F5, R2-F7)
- applied-adjusted: 0
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| liu2023 | (papers.csv) | published_on | 2023-05-29 -> 2023-05-09 | p.9 article history ("Accepted article preview online: 09 May 2023") |
| vanackere2023 | vanackere2023-a | evidence `drive_vpp_v` basis (value 4.4) | author_estimate -> measured | p.5 Sec. IV |

## Sim config follow-ups

- None. vanackere2023 sim targets do not use `drive_vpp_v`; liu2023 and celik2022 have no sim config.

## Deferred items needing decisions

- None for this batch. Note for the coordinator: R2-F5 was decided on the existing schema wording ("first public version"); if the cross-batch `published_on` policy is later changed to version-of-record date, liu2023 should revert to 2023-05-29.
