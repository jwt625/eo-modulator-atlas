# geo_02 audit dispositions (2026-10-04)

Audit: data/_staging/audits/geo_02-affil-claude-audit-2026-10-04.md

| ID | Severity | Disposition | Exact change or reason |
|---|---|---|---|
| M1 | Minor | applied | Rows (li2022b,2,1), (li2022b,3,1), (li2022b,7,1), column unit: "State Key Laboratory for Modern Optical Instrumentation; Centre for Optical and Electromagnetic Research" -> same + "; Zhejiang Provincial Key Laboratory for Sensing Technologies". Verified in references/li2022b/text.md p.1 affiliation 2. |
| M2a | Minor | applied | Rows (li2025a, 1,2,3,5,6,7,8,9,10,11,12; aff_order 1), column unit: "State Key Laboratory for Extreme Photonics and Instrumentation; College of Optical Science and Engineering" -> same + "; International Research Center for Advanced Photonics". Verified in references/li2025a/text.md p.1 affiliation 1. |
| M2b | Minor | applied | Rows (li2025a,10,2), (li2025a,11,2), (li2025a,12,2), column unit: "Jiaxing Research Institute; Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging" -> "Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging; Intelligent Optics & Photonics Research Center; Jiaxing Research Institute" (printed order, affiliation 3). Org stays Zhejiang University (no unit has its own row in data/organizations.csv). |
| C1 | Coordinator | applied | column source: "text.md" -> "paper" in 282 rows (all non-crossref rows of the batch). REPORT.md line 3 reworded accordingly. |

Observations in the audit (no change required) were not altered: kari2025 empty locality, li2025a (4,1) Guangzhou, lee2026 (12,1) "Ramat Aviv" kept as printed, registry-name mappings.

Counts: applied 4 (M1, M2a, M2b, C1), adjusted 0, rejected 0. Audit findings: 2 (both applied). Rows with unit changed: 17 (3 + 11 + 3). Rows with source changed: 282 (includes the 17).
