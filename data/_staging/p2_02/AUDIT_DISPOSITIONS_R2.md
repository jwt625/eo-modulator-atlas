# Audit dispositions, round 2: han2023 (batch p2_02)

- Audit: `data/_staging/audits/pilots-p2_01-han2023-r2-claude-audit-2026-10-03.md`
- Papers: han2023 (this file); see `data/_staging/pilot_ogiso2016/AUDIT_DISPOSITIONS_R2.md` for the scope of the whole audit.
- Date: 2026-10-04
- Files edited: `data/evidence/han2023.yaml`. Not edited: `data/papers.csv`, `sims/`, `references/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F2 | metadata | deferred | Not a han2023 error but a DB-wide form question. The audit compares han2023 only with kieninger2020 and wolf2018a (p2_01 F16 form: venue "arXiv", bare arxiv_id, abs URL, `numbers_from_arxiv_v1` tag). Canonical `papers.csv` has 26 other rows whose venue uses the han2023 form ("arXiv; associated journal: ...", versioned arxiv_id, versioned pdf URL; e.g. feng2022, gao2024, geravand2025, hsu2024, xu2020, zwickel2020), and the `numbers_from_arxiv_v1` tag is used only by kieninger2020 and wolf2018a. Changing han2023 alone would make it the outlier. Needs a coordinator decision: one DB-wide form, or record that both forms are allowed. han2023 notes already state the version (2302.03652v1) and the journal reference. No number changes. |
| R2-F8 | minor | applied | `data/evidence/han2023.yaml` entry han2023-a `ng_opt` `unit` '' -> '1' (schema unit "1", as in chen2022). |

Counts: applied 1, applied-adjusted 0, rejected 0, deferred 1.

## Changed numerical or blocking cells

None.

## Sim config follow-ups

None (no sim config for han2023).

## Deferred items needing decisions

- R2-F2: choose the DB-wide papers.csv form for arXiv-v1 rows that have a journal version (p2_01 F16 form vs the "arXiv; associated journal: ..." form used by 27 rows including han2023), then normalize all such rows in one pass.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/pilots-p2_01-han2023-r2-verify-claude-audit-2026-10-04.md` confirmed every change. Correction to the R2-F2 deferral reason above: the `numbers_from_arxiv_v1` device tag is carried by 15 papers in devices.csv (not only kieninger2020 and wolf2018a); four of them (lee2020, luan2026, taghavi2026, witmer2020) also use the "arXiv; associated journal" venue form. The form decision stays with the user.
