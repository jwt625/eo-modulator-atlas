# geo_03 audit dispositions (2026-10-04)

Audit: data/_staging/audits/geo_03-affil-claude-audit-2026-10-04.md. Each finding re-checked against references/<paper_id>/text.md.

| ID | Severity | Disposition | Exact change or reason |
|---|---|---|---|
| M1 | minor | applied | liu2023, author_index 1-9, aff_order 1 (9 rows), column unit: "State Key Laboratory for Modern Optical Instrumentation, College of Optical Science and Engineering" -> "State Key Laboratory for Modern Optical Instrumentation, Center for Optical & Electromagnetic Research, College of Optical Science and Engineering, International Research Center for Advanced Photonics". Verified against text.md p.1 and p.8 "Author details" 1. |
| M2 | minor | applied (adjusted wording) | 48 rows with note "printed as Ghent University-imec; one row" (lin2026a, nenezic2026, niels2025a, niels2026), column note. lin2026a (aff 1 rows) and niels2025a (all rows, printed "Ghent University - imec") -> "joint string 'Ghent University - imec' mapped to Ghent University only; no separate imec row". lin2026a author_index 3 (Moerman, IDLab, printed "Ghent University-imec") -> "joint string 'Ghent University-imec' mapped to Ghent University only; no separate imec row". nenezic2026 and niels2026 (printed with en dash; imec printed separately as affiliation 2, own imec row verified for every author carrying the note) -> "joint string 'Ghent University-imec' (en dash) mapped to Ghent University only; imec printed separately as affiliation 2 and has its own row". |
| G | judgment | rejected (no change) | Coordinator decision: keep Ghent University mapping for joint "Ghent University - imec" strings; no extra imec rows. REPORT.md judgment call 1 updated to record the decision. |
| O1 | observation | rejected (no change) | Coordinator decision: keep staged org "Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging"; printed standalone as affiliation 3 in liu2023 (text.md p.8). |
| O2 | observation | rejected (no change) | lu2020 prefecture-only localities (Fukushima, Kanagawa) stay as printed (coordinator rule: locality stays as printed); geocoding is by org. |
| O3 | observation | rejected (no change) | Locality spelling variants stay as printed (coordinator rule); dedupe belongs to org_sites build. |
| O4 | observation | rejected (no change) | Name strings follow papers.csv; no action. |
| C1 | coordinator | applied | column source: "text.md" -> "paper" in all 347 rows (author_affiliations.csv). REPORT.md line 5 reworded to match. |

Counts: applied 3 (M1, M2, C1), adjusted 0 additional (M2 applied with adjusted wording), rejected 5 (G, O1, O2, O3, O4).
Rows changed in author_affiliations.csv: 347 (source on all; of these 9 also unit, 48 also note). organizations.csv unchanged.
