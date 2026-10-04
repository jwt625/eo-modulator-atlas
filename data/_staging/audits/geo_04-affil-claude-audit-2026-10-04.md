---
auditor: claude (fresh-context independent audit)
task: geo_04 per-author affiliation audit
date: 2026-10-04
scope: data/_staging/geo_04/author_affiliations.csv (367 rows), data/_staging/geo_04/organizations.csv (header only), 27 papers in data/_staging/batches/geo_04.txt
mode: read-only
inputs_checked: papers.csv authors; references/<id>/text.md page-1/page-2 affiliation blocks and footnotes; references/<id>/crossref.json; page renders from source.pdf (taghavi2022a p.1, suceava2025 p.2) made in the session scratchpad, not in the repo
counts:
  papers: 27
  papers_pass: 25
  papers_fail: 2   # taghavi2022a (blocking), suceava2025 (metadata)
  findings_blocking: 1   # 9 rows
  findings_metadata: 4   # 9 missing rows (6 printed-source, 3 crossref-only)
  findings_minor: 3
  mechanical: 0 key mismatches, 0 duplicate keys, all org_name present in data/organizations.csv, no new orgs staged
---

# geo_04 affiliation audit

## Per-paper result

| paper_id | result | findings |
|---|---|---|
| prountzou2026 | pass (policy item) | M4 |
| qi2024 | pass | |
| rahman2025 | pass | |
| renaud2023 | pass | m2 |
| sabatti2024 | pass | |
| sayem2026 | pass | |
| sayem2026a | pass | |
| sayem2026b | pass | |
| sayem2026c | pass | |
| schwarzenberger2026 | pass | |
| shamsansari2021 | pass | |
| shen2021 | pass | (m3 info) |
| shen2024 | pass | |
| sia2022 | pass | |
| soma2025 | pass | |
| steckler2025 | pass | |
| suceava2025 | fail | M1, M2, M3 |
| sun2026a | pass | |
| taghavi2022a | fail | B1 |
| taghavi2024 | pass | |
| taghavi2026 | pass | |
| tan2024 | pass | (m3 info) |
| tanaka2026 | pass | |
| thiele2022 | pass | |
| tiberi2025 | pass | |
| tran2026 | pass | |
| ulrich2025 | pass (policy item) | M4 |

## Findings

### B1 (blocking) taghavi2022a: printed affiliation markers are swapped in the source

What is printed (arXiv 2203.04756v2, p.1, verified on a 200 dpi render and in the PDF span data, superscripts at 8.8 pt):

- Author line: TAGHAVI 1,2; DEHGHANNASIRI 2; FAN 2; TOFINI 1; MORADINEJAD 2; EFTERKHAR 2; SHEKHAR 1; CHROSTOWSKI 1; JAEGER 1; ADIBI 2.
- Affiliation list order: "1 Electrical and Computer Engineering Department, Georgia Institute of Technology, 778 Atlantic Dr NW, Atlanta, GA 30332, USA"; "2 Department of Electrical and Computer Engineering, University of British Columbia, 2332 Main Mall, Vancouver, B.C. V6T 1Z4, Canada".
- Footnote: "Corresponding author: ali.adibi@ece.gatech.edu". No other footnote on p.1.

The staged rows reproduce this printing exactly; the extraction is faithful. The source is internally inconsistent:

1. Adibi is marked 2 (UBC) but his corresponding-author email is @ece.gatech.edu (p.1).
2. Author Contributions (p.14): "developed and implemented by I.T., A.A.E., and A.A at Georgi Tech", i.e. Efterkhar and Adibi at Georgia Tech, both marked 2 (UBC) on p.1.
3. Acknowledgments (p.15): fabrication "performed in part at the Georgia Tech IEN".

External-to-PDF but local evidence:

- references/taghavi2022a/crossref.json (publisher deposit for the Optics Express version of record, doi 10.1364/oe.460830): Taghavi = Georgia Tech + UBC; Dehghannasiri, Fan, Moradinejad, Efterkhar, Adibi = Georgia Tech; Tofini, Shekhar, Chrostowski, Jaeger = UBC. This is exactly the swap of the printed markers.
- Same batch: taghavi2024 p.1 prints Jaeger, Shekhar, Chrostowski at UBC ECE; taghavi2026 p.1 prints Tofini, Jaeger, Chrostowski, Shekhar at UBC ECE.

Conclusion: the arXiv v2 page-1 markers 1 and 2 are transposed relative to the institutions. The REPORT.md statement that "No crossref affiliations were usable (empty or null in all crossref.json files)" is incorrect for this paper (see m1).

Correction (9 rows; source -> crossref.json; note e.g. "arXiv v2 p.1 prints markers swapped (1 = Georgia Tech, 2 = UBC); corrected per Crossref VoR affiliations, gatech corresponding-author email and Author Contributions p.14"):

| paper_id | author_index | author | aff_order | current | correct |
|---|---|---|---|---|---|
| taghavi2022a | 2 | Razi Dehghannasiri | 1 | University of British Columbia, Vancouver, BC, CA | Georgia Institute of Technology, unit "Electrical and Computer Engineering Department", Atlanta, GA, US |
| taghavi2022a | 3 | Tianren Fan | 1 | University of British Columbia, Vancouver, BC, CA | Georgia Institute of Technology, Atlanta, GA, US |
| taghavi2022a | 5 | Hesam Moradinejad | 1 | University of British Columbia, Vancouver, BC, CA | Georgia Institute of Technology, Atlanta, GA, US |
| taghavi2022a | 6 | Ali. A. Efterkhar | 1 | University of British Columbia, Vancouver, BC, CA | Georgia Institute of Technology, Atlanta, GA, US |
| taghavi2022a | 10 | Ali Adibi | 1 | University of British Columbia, Vancouver, BC, CA | Georgia Institute of Technology, Atlanta, GA, US |
| taghavi2022a | 4 | Alexander Tofini | 1 | Georgia Institute of Technology, Atlanta, GA, US | University of British Columbia, unit "Department of Electrical and Computer Engineering", Vancouver, BC, CA |
| taghavi2022a | 7 | Sudip Shekhar | 1 | Georgia Institute of Technology, Atlanta, GA, US | University of British Columbia, Vancouver, BC, CA |
| taghavi2022a | 8 | Lukas Chrostowski | 1 | Georgia Institute of Technology, Atlanta, GA, US | University of British Columbia, Vancouver, BC, CA |
| taghavi2022a | 9 | Nicolas A. F. Jaeger | 1 | Georgia Institute of Technology, Atlanta, GA, US | University of British Columbia, Vancouver, BC, CA |

Iman Taghavi (author_index 1, aff_order 1 Georgia Tech, aff_order 2 UBC): keep; the set is unchanged by the swap and the order matches Crossref (Georgia Tech first). Update the row notes only.

### M1 (metadata) suceava2025 Yang Yang: two printed affiliations missing

Printed on p.2 (continuation of the Wiley affiliation sidebar, verified on a p.2 render): "Y. Yang, Department of Nuclear Engineering, The Pennsylvania State University, University Park, PA 16802, USA" and "Y. Yang, Materials Research Institute, The Pennsylvania State University, University Park, PA 16802, USA". Crossref lists the same three affiliations in this order.

| key | current | correct |
|---|---|---|
| (suceava2025, 12, 1) | Penn State, Department of Engineering Science and Mechanics | keep |
| (suceava2025, 12, 2) | missing | additional, The Pennsylvania State University, unit "Department of Nuclear Engineering", University Park, PA, US, locator "p.2 affiliations (continued)" |
| (suceava2025, 12, 3) | missing | additional, The Pennsylvania State University, unit "Materials Research Institute", University Park, PA, US, locator "p.2 affiliations (continued)" |

### M2 (metadata) suceava2025 Darrell G. Schlom: two printed affiliations missing

Printed on p.2: "D. G. Schlom, Kavli Institute at Cornell for Nanoscale Science, Ithaca, NY 14853, USA" and "D. G. Schlom, Leibniz-Institut für Kristallzüchtung, Max-Born-Straße 2, 12489 Berlin, Germany". Both orgs already exist in data/organizations.csv (rows "Kavli Institute at Cornell for Nanoscale Science", parent Cornell University; "Leibniz-Institut für Kristallzüchtung", DE). Crossref lists the same three affiliations in this order.

| key | current | correct |
|---|---|---|
| (suceava2025, 15, 1) | Cornell University, Department of Materials Science and Engineering | keep |
| (suceava2025, 15, 2) | missing | additional, Kavli Institute at Cornell for Nanoscale Science, Ithaca, NY, US, locator "p.2 affiliations (continued)" |
| (suceava2025, 15, 3) | missing | additional, Leibniz-Institut für Kristallzüchtung, Berlin, DE, locator "p.2 affiliations (continued)" |

### M3 (metadata) suceava2025 "S. Sarker": both authors left without rows; resolvable from local crossref.json

What is printed: initials only, twice. "S. Sarker" in the Penn State Department of Materials Science and Engineering block (p.1, listed between H. Sarkar and V. A. Stoica) and "S. Sarker" in the "Cornell High Energy Synchrotron Source, Cornell University, Ithaca, NY 14853, USA" block (p.1). The printed page alone cannot bind initials to Saugata (idx 11) vs Suchismita (idx 13); the extractor's refusal to guess from outside knowledge was correct for the printed source.

However references/suceava2025/crossref.json (publisher deposit for the Advanced Materials version of record, i.e. the same article as the PDF) binds full names: author 11 "Saugata Sarker" -> "Department of Materials Science and Engineering The Pennsylvania State University University Park PA 16802 USA"; author 13 "Suchismita Sarker" -> "Cornell High Energy Synchrotron Source Cornell University Ithaca NY 14853 USA". The existing organizations.csv row for Cornell High Energy Synchrotron Source already names Suchismita Sarker. Recommended rows (source crossref.json for the name binding, affiliation text as printed p.1):

| key | correct |
|---|---|
| (suceava2025, 11, 1) | primary, The Pennsylvania State University, unit "Department of Materials Science and Engineering", University Park, PA, US, note "printed as initials S. Sarker; name bound via crossref.json" |
| (suceava2025, 13, 1) | primary, Cornell High Energy Synchrotron Source, Ithaca, NY, US, note "printed as initials S. Sarker; name bound via crossref.json" |

### M4 (metadata, coordinator policy) prountzou2026 Morgan Trassin and ulrich2025 Ahmed Khalil: no printed affiliation in the local source

Verified: the local arXiv v1 PDFs do not list these authors (prountzou2026 prints 5 authors; ulrich2025 prints 16). The extractor's "version mismatch, no row" is correct for the printed source. Crossref (VoR) does carry affiliations, contrary to REPORT.md:

- prountzou2026 author 5 Morgan Trassin: "ETH Zurich, Department of Materials" + "Multifunctional Ferroic Materials" (one affiliation split in two name fields; no city beyond the institution name).
- ulrich2025 author 5 Ahmed Khalil: "Imec, Leuven, Belgium." and "Department of Physics and Astronomy, KU Leuven, Leuven, Belgium."

If the policy allows crossref.json-sourced rows, add: (prountzou2026, 5, 1) ETH Zurich, unit "Department of Materials, Multifunctional Ferroic Materials", locality Zurich (from org name; not printed as an address), CH; (ulrich2025, 5, 1) imec, Leuven, BE; (ulrich2025, 5, 2) KU Leuven, unit "Department of Physics and Astronomy", Leuven, BE. Otherwise leave as is with the current REPORT explanation.

### m1 (minor) REPORT.md crossref claim is wrong

REPORT.md says "No crossref affiliations were usable (empty or null in all crossref.json files)". Crossref affiliations with names exist for 9 papers: prountzou2026 (6/6 authors), schwarzenberger2026 (22/22), shamsansari2021 (9/11), shen2021 (6/6), suceava2025 (17/17), taghavi2022a (10/10), taghavi2026 (4/7), tan2024 (10/10), ulrich2025 (17/17). This omission is why B1 and M3 were left unresolved.

### m2 (minor) renaud2023 Caltech state misprint normalized silently

(renaud2023, 7, 2) locality "Pasadena, CA". Printed: "California Institute of Technology, Pasadena 91125 MA, USA" (state misprinted as MA in the source). Value is correct; suggest a note "source prints 'Pasadena 91125 MA'".

### m3 (info, no change) crossref vs printed differences where the printed page governs

- shen2021: Crossref gives Zuyuan He both SJTU and HIT (Shenzhen); p.1 prints He with marker 1 only. Staged row follows print; correct.
- tan2024: Crossref adds "NB Photonics, Ghent University" for several authors; not printed in the PDF. Staged rows follow print; correct.
- schwarzenberger2026: Crossref lists one affiliation per author (e.g. Koos IPQ only); the p.1 IEEE footnotes print more (Koos IPQ, IMT, SilOriX). Staged rows follow print; correct.

## Checks performed

- Mechanical: every (paper_id, author_index, author) matches papers.csv; no duplicate (paper_id, author_index, aff_order); every org_name exists in data/organizations.csv; row country equals the org's DB country except (taghavi2024, 12, 3) Dream Photonics Inc. Woodinville, WA -> US, which is correct per the printed address of that affiliation.
- Marker mapping re-read for every paper from text.md, plus PDF span data/render for taghavi2022a and render for suceava2025 p.2.
- Kinds: the only present_address row, (schwarzenberger2026, 6, 2) University of Freiburg, matches "He is now with the Institute for Anatomy and Cell Biology, University Freiburg"; equal-contribution and corresponding-author markers (renaud2023 5, sabatti2024 dagger, shen2021 3, sun2026a dagger, ulrich2025 star/dagger, rahman2025 star/dagger) are not treated as affiliations.
- Localities: campus cities as printed (KIT IMT Eggenstein-Leopoldshafen vs Karlsruhe per printed postcode; imec Heverlee in tan2024 vs Leuven in ulrich2025; Tokyo wards in tanaka2026; Nokia Bell Labs locality empty where only "NJ, USA" is printed).

## Papers verified clean

prountzou2026 (rows present are correct; M4 is a policy item), qi2024, rahman2025, renaud2023 (m2 note only), sabatti2024, sayem2026, sayem2026a, sayem2026b, sayem2026c, schwarzenberger2026, shamsansari2021, shen2021, shen2024, sia2022, soma2025, steckler2025, sun2026a, taghavi2024, taghavi2026, tan2024, tanaka2026, thiele2022, tiberi2025, tran2026, ulrich2025 (rows present are correct; M4 is a policy item).
