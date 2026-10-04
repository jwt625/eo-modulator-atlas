# geo_05 author-affiliation extraction report (2026-10-04)

Papers: 27. Rows: 370 in author_affiliations.csv. New organizations: 0 (organizations.csv is header-only).
Author-list mismatches between printed lists and papers.csv: none found (names and order match for all papers).
Self-check passed: (paper_id, author_index, author) match data/papers.csv exactly; all org_name values exist in data/organizations.csv; country is ISO alpha-2 uppercase; no duplicate (paper_id, author_index, aff_order).

Per paper: authors in papers.csv / authors with >= 1 row. All papers have every author covered except xu2022.

| paper_id | authors | with rows | notes |
|---|---|---|---|
| ummethala2021 | 13 | 13 | markers 6,7 are email markers, ignored |
| valdez2022 | 12 | 12 | |
| valdez2023 | 4 | 4 | |
| valdez2023a | 3 | 3 | "La Jolla" printed without state; recorded as La Jolla, CA |
| vanackere2023 | 16 | 16 | printed "Ghent University-imec"; mapped to Ghent University (imec not assigned as separate org); affiliation 1/3 units differ |
| wang2018 | 5 | 5 | Stern has Cornell and Columbia (two rows) |
| wang2022a | 14 | 14 | |
| wang2024a | 11 | 11 | EPFL affiliations 1 and 2 are two units of the same institution, two rows each |
| wang2024b | 15 | 15 | affiliations in p.1 footer; marker 4 (equal contribution) is not an affiliation; EPFL units as two rows |
| wang2025 | 7 | 7 | no marker-style affiliations; taken from "Author Information" (p.6). SCNU key lab and National Center are two printed entries for Guo and K. Chen (two rows) |
| wang2026a | 10 | 10 | printed "Advanced Micro Foundry Pte Ltd"; mapped to existing row |
| wang2026b | 14 | 14 | printed affiliation 1 is duplicated in the header line; State Key Lab of THz and mmWave (aff 2) is a CityU unit |
| weigel2018 | 14 | 14 | |
| witmer2020 | 9 | 9 | J. Luo: CityU Hong Kong, country HK per organizations.csv convention |
| wolf2018a | 13 | 13 | Hartmann aff 3 (Muenster) and Lauermann aff 4 (Infinera) are "Now with" -> present_address |
| wu2023 | 13 | 13 | affiliations given per name group (no numeric markers); Ghent printed "Gent"; "Ghent University-imec" mapped to Ghent University |
| wu2025 | 14 | 14 | SCNU aff 5 (National Center for International Research on Green Optoelectronics) as separate row for Guo and K. Chen |
| xu2020 | 14 | 14 | aff 2 mapped to the National Information Optoelectronics Innovation Center row (printed as part of CICT, which has its own row for aff 3) |
| xu2022 | 14 | 8 | crossref only (no cached text). 6 authors without rows: Fabio Pittala (3), Jin Tang (4), Wing Chau Ng (6), Xuefeng Tang (9), Maxim Kuschnerov (10), Bofang Zheng (13) - empty Crossref affiliation. 8 rows have no city (Crossref gives institution name only); country CN inferred from institution |
| yu2024 | 9 | 9 | S. Wu is School of Physics, ZJU |
| yue2023 | 3 | 3 | |
| yue2025 | 6 | 6 | |
| zhang2022 | 10 | 10 | Shao: Harvard and Virginia Tech (both numeric); Zhu: Harvard and A*STAR IMRE |
| zhang2023 | 13 | 13 | affiliations 3 and 4 only on p.9 "Author details"; aff 2 (AEMD) mapped to its own facility row under SJTU |
| zheng2026 | 24 | 24 | |
| zhong2026 | 9 | 9 | |
| zwickel2020 | 10 | 10 | no city printed for KIT (aff 1, 2) and Kyushu (aff 4): locality empty, noted |

Judgment calls
- Same-institution multi-unit affiliations (EPFL, SCNU, CityU, KIT, Ghent) are one row per printed affiliation entry, with the unit differing.
- No page_01.png exists under references/<id>/figures for this batch; markers were read from text.md, which printed them cleanly next to author names (no garbled markers encountered).
- Country for Hong Kong rows is HK (matches organizations.csv).

Post-audit corrections (2026-10-04)
- source: 362 rows changed from text.md to paper (allowed values: paper, crossref).
- locator: vanackere2023 affiliations are on p.2 (21 rows); zhang2023 affiliations are on p.9 author details (11 rows; rows 11 and 12 already cited p.9).
- zhang2023 AEMD stays as org_name (own row in data/organizations.csv); see AUDIT_DISPOSITIONS.md.
