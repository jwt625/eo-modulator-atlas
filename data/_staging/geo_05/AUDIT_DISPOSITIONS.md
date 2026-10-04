# geo_05 audit dispositions (2026-10-04)

Audit: data/_staging/audits/geo_05-affil-claude-audit-2026-10-04.md

| ID | Severity | Disposition | exact change or reason |
|---|---|---|---|
| F01 | metadata | applied | author_affiliations.csv, column source, all 362 rows with source=text.md: `text.md` -> `paper` (8 xu2022 crossref rows untouched). |
| F02 | minor | applied | (vanackere2023, author_index 1..16, all aff_order), 21 rows, column locator: `p.1 affiliations` -> `p.2 affiliations`. Verified: references/vanackere2023/text.md page 1 marker precedes the AFFILIATIONS block, which sits after the `<!-- page 2 -->` marker (line 78 vs 52). |
| F03 | minor | applied | (zhang2023, 1..10, 1) and (zhang2023, 13, 1), 11 rows, column locator: `p.1 affiliations` -> `p.9 author details`. Verified: page 1 prints only superscript markers; "Author details" block (text.md line 1228) holds all affiliation texts. |
| F04 | minor | rejected | (zhang2023, 8..10, 1) keep org_name `Center for Advanced Electronic Materials and Devices`, unit empty. Coordinator rule: the most specific unit that exists as its own row in data/organizations.csv stays as org_name; that facility row exists (parent Shanghai Jiao Tong University). Printed text confirms "Center for Advanced Electronic Materials and Devices, Shanghai Jiao Tong University, Shanghai 200240, China." |

Observations section of the audit (empty locality, locality spelling variants, xu2022 empty Crossref affiliations): no change required; locality stays as printed per coordinator decision.

Counts: findings 4; applied 3 (F01, F02, F03); adjusted 0; rejected 1 (F04). Rows changed: 362 (source) + 21 (vanackere2023 locator) + 11 (zhang2023 locator) cell edits across 362 distinct rows (locator-edited rows are all among the source-edited rows; xu2022 rows unchanged).
