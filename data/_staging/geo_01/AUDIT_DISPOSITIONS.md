# geo_01 audit dispositions (2026-10-04)

Audit: `data/_staging/audits/geo_01-affil-claude-audit-2026-10-04.md`

| ID | Severity | Disposition | exact change (row keys, column, old -> new) or reason |
|---|---|---|---|
| F1 | metadata | rejected (recorded gap) | cai2025 authors 8 (Jiale Sun) and 9 (Shuhang Zheng) stay without rows. Local `text.md` and SI print a 10-author preprint list without these names; `crossref.json` lists both with empty affiliation arrays; no local source gives their affiliations and there is no network. Gap is already disclosed in REPORT.md; coordinator decision: stays a recorded gap. |
| F2 | metadata | rejected | (anderson2025, 7, 1) org_name stays "Stanford Nano Shared Facilities". It exists as its own row in `data/organizations.csv` (type facility, parent Stanford University), and the coordinator rule keeps the most specific unit that is its own registry row as org_name. Printed affiliation 4 confirms "Stanford Nano Shared Facilities, Stanford University, Stanford, California 94305"; locality "Stanford, CA" and country US unchanged, so no map-position impact. |
| F3 | minor | applied | (churaev2023, 9, 2) column locality: "Zurich" -> "Zürich". `references/churaev2023/text.md` p.1 footnote 4 prints "CH-8092 Zürich, Switzerland". Other Zurich rows (chelladurai2025, didier2026, falcone2026) left as is (spelling variants allowed). |
| mech | coordinator | applied (no-op) | `source` must be paper or crossref: all 337 rows already `paper`; no change. |

Counts: applied 1 (plus 1 no-op coordinator rule), adjusted 0, rejected 2 (F1, F2). Rows changed: 1 (of 337). organizations.csv and REPORT.md unchanged.
