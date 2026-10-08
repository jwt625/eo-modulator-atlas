# geo_12 per-author affiliation audit (Claude, fresh context, 2026-10-07)

Batch `data/_staging/batches/geo_12.txt` (gaier2025, liu2025d, xie2024, zhang2024, park2026); staged
`data/_staging/geo_12/` (80 rows, 1 new org). Brief: `data/_staging/ingest_2026_10_07/GEO_AUDIT_PROMPT.md`.
Precedents: geo_06-07 R4 (empty locality) and R7 (reuse only for an identical printed address), geo_11 rulings A-C
and 1-10.

Result: 0 blocking, 1 metadata, 1 minor, 4 observations. Merge-ready after M1.

## Per-paper result

| paper | papers.csv authors | rows | result |
|---|---|---|---|
| gaier2025 | 9 | 15 (9 authors) | pass; m1 (note on QSE host) |
| liu2025d | 10 | 16 (10 authors) | M1 (Yao locality) |
| xie2024 | 8 | 8 (8 authors) | pass |
| zhang2024 | 9 | 16 (8 authors; Zeng slot 3 no row) | pass |
| park2026 | 14 | 25 (14 authors) | pass |

## Findings

| id | severity | paper / author | evidence (locator) | fix |
|---|---|---|---|---|
| M1 | metadata | liu2025d, Jianping Yao (10), aff_order 1 | Printed "5School of Electrical Engineering and Computer Science, University of Ottawa, Ottawa, Canada" (text.md p.1). No province printed. The existing University of Ottawa site "Ottawa, ON" comes from shabaninezhad2025, printed "University of Ottawa, Ottawa, ON K1N 6N5, Canada" (text.md lines 21-22): not the same printed address, so R7 reuse does not apply. Adding "ON" invents a field that is not in the print; the geo_10/11 "City, ST" rule only abbreviates a state that is printed. Direct precedent: multani2025 printed "Stanford University, Stanford, USA" and is coded "Stanford" (6 rows), alongside a separate "Stanford, CA" site. | locality `Ottawa`; note `printed "Ottawa, Canada" (no province)`. This creates a second University of Ottawa site (Ottawa, CA), as with Stanford. |
| m1 | minor | gaier2025, Gaier (1), Lampert (4), J. Liu (5), Benea-Chelmus (9), aff_order 2 | Printed "2Center for Quantum Science and Engineering (QSE), CH-1015, Switzerland" (text.md p.1; page render checked). No host institution is printed on this line, and the same batch codes liu2025d's standalone marker 2 as its own org, so the rows need to say why this one is different. Mapping to EPFL is right: canonical codes this center as an EPFL unit in 26 rows (churaev2023 "Center for Quantum Science and Engineering, EPFL, Lausanne"; wang2024a/wang2024b "Center of Quantum Science and Engineering, EPFL, CH-1015 Lausanne"), and CH-1015 is the same postcode as marker 1. | Keep `EPFL`, unit as printed. Add note: `printed without host; QSE is an EPFL unit in churaev2023/wang2024a/wang2024b (same CH-1015 postcode)`. |
| O1 | observation | gaier2025, EPFL rows | Empty locality adds an `EPFL,,CH` site next to the existing `EPFL,Lausanne,CH`. There is precedent for this pairing: ETH Zurich, Karlsruhe Institute of Technology, Stanford University and Zhejiang University all have an empty-locality site alongside a city site in data/org_sites.csv. | None. At geocoding, both resolve to the same Wikidata campus (Q262760). |
| O2 | observation | gaier2025, Shams-Ansari (7), DRS Daylight Solutions | Printed "16465 Via Esprillo, CA, USA": a street and a state, no city. The anjali2025 ("West Bengal") and murai2025 ("Ibaraki") precedents keep a printed state, but geo_11 ruling 1 also called empty defensible. A bare "CA" would geocode to a state-scale point. | Keep empty (see ruling 2). At geocoding, use the printed street in nominatim_query (University of Copenhagen precedent, precision building). |
| O3 | observation | zhang2024 | The VoR (10.1038/s41467-025-65293-y) is not cached. crossref.json has 9 authors, all with empty affiliation lists. The cached arXiv v1 lists 8 authors without Yuansong Zeng. The VoR affiliations may differ from the arXiv print. | None now. Re-check all 9 authors if the VoR PDF is cached later. |
| O4 | observation | canonical, cross-batch | Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging is its own org in liu2023, where it is printed standalone ("Jiaxing 314000, China", text.md line 878). In li2025a it is a Zhejiang University unit, where it is printed under ZJU. So the precedent is decided per print. | None here. Supports ruling 1. |

## Rulings on the REPORT.md judgment calls

1. liu2025d marker 2 as its own org: upheld. The printed line reads "2Key Laboratory of Photonic-Electric Integration
   and Communication-Sensing Convergence (Ministry of Education), Chengdu, China" (text.md p.1). It is a complete
   affiliation of its own, with no host institution. Marker 1 is a separate line ending in "Southwest Jiaotong
   University, Chengdu, China". The precedent is liu2023, where the standalone "Jiaxing Key Laboratory ..., Jiaxing
   314000, China" became its own org with an empty parent_org (O4). Making it a Southwest Jiaotong University unit
   would rely on a host relation the print does not state. All seven marker-2 authors also carry marker 1, which
   suggests the lab is hosted at SWJTU, but nothing in the corpus prints that: the name occurs only in
   references/liu2025d. This is the difference from QSE (m1), whose EPFL host is printed in three canonical papers.
   The staged org row is correct: name as printed including "(Ministry of Education)", type research_institute (as
   Jiaxing), CN, east_asia, parent_org empty, notes carry the locator, ror_id and name_source empty. No existing row
   matches.
2. Empty localities: upheld for all three.
   - EPFL: printed "École Polytechnique Fédérale de Lausanne (EPFL), CH-1015, Switzerland". Every canonical EPFL
     print includes the city ("CH-1015 Lausanne" in churaev2023/wang2024a/cai2025; "1015 Lausanne" in axline2026), so
     this is not the same printed address and R7 reuse does not apply. "Lausanne" inside the institution name is not a
     printed locality (KIT / IIT Kharagpur precedent, geo_08-09 and geo_11 ruling 1).
   - Delft: printed "Delft University of Technology, Netherlands"; same reasoning, and Delft has no prior site.
   - DRS Daylight Solutions: printed "16465 Via Esprillo, CA, USA". montifiore2026 printed "San Diego, CA, 92127,
     USA", so the address is not identical and reusing "San Diego, CA" would add a city that is not printed. See O2
     on the state-only alternative.
3. University of Ottawa "Ottawa, ON": overturned (M1). "Ottawa, Canada" is not the printed address behind the
   existing site ("Ottawa, ON K1N 6N5, Canada"). The fallback is the locality as printed, "Ottawa" (multani2025
   precedent).
4. Units as printed: upheld.
   - "Center for Quantum Science and Engineering (QSE)": the abbreviation is kept, as with li2026 "(IEM)".
   - "Harvard John A. Paulson School of Engineering and Applied Sciences": as printed; canonical has this form 9
     times.
   - liu2025d marker 1 "Center for Information Photonics and Communications, School of Information Science and
     Technology": one row for several units under one marker (geo_11 ruling A).
   - xie2024 "Department of Electrical Engineering & State Key Laboratory of Terahertz and Millimeter Waves": one
     marker, so one row, identical to feng2022 canonical (5 rows). crossref.json (VoR 10.23919/emsci.2024.0046)
     carries the identical combined string for all 8 authors.
5. Korean orgs and localities: upheld. All six orgs exist with exact names:
   - Korea Institute of Science and Technology
   - Korea University
   - Sejong University
   - Korea University of Science and Technology (KIST School is UST's campus unit; the print reads "Division of
     Quantum Information, KIST School, Korea University of Science and Technology, Seoul 02792")
   - Kyung Hee University
   - Korea Advanced Institute of Science and Technology

   Localities "Seoul" and "Daejeon" are as printed, with postcodes dropped. None of the six orgs has a prior site.
6. zhang2024 Zeng without row: upheld. papers.csv slot 3 "Yuansong Zeng" follows Crossref (VoR). The cached arXiv
   v1 print (text.md p.1) lists 8 authors without Zeng, and crossref.json gives every author an empty affiliation.
   No cached source prints an affiliation for Zeng, so per the brief there is no row; it is listed in REPORT.md.
   The other slots are shifted correctly: Chen 4, Feng 5, Zhu 6, Shum 7, Chan 8, Wang 9.

## What was checked

- All 80 rows against the papers.csv author slots: author_index and exact string, including "Marko Lončar" and
  "Ileana-Cristina Benea-Chelmus". Also checked: kind (primary for aff_order 1, additional for 2 and above; no
  present addresses printed), no duplicate (paper_id, author_index, aff_order), and that every org_name exists in
  canonical or staged organizations.csv. Independent script: 0 problems. The merge dry run reproduces the REPORT
  line: staged rows 80, kept canonical 2800, rows 2880, papers 231, new orgs 1, sites 309, problems 0. None of the 5
  papers has existing canonical rows.
- Markers on every byline in text.md p.1:
  - gaier2025: 1,2 / 1 / 3,4 / 1,2 / 1,2 / 3 / 3,5 / 3 / 1,2
  - liu2025d: 1,2 x3 / 3 / 4 / 4 / 1,2 x3 / 5
  - xie2024: 1 for all
  - zhang2024: 1,2 / 1,2,3 / 1,2 / 1,2 / 4 / 2 / 1,2 / 1,2,3
  - park2026: 1,2 / 1 / 1,3 / 1,4 / 1,2 / 1,2 / 1,4 / 1,5 / 1 / 6 / 1,4 / 1,5 / 1,4 / 1,4
- Rendered page-1 bylines of park2026 and gaier2025 from source.pdf to a scratch directory outside the repo; they
  confirm the text.md reading. Equal-contribution and corresponding markers are correctly excluded (dagger and
  asterisk in liu2025d, xie2024 and zhang2024; asterisk, dagger and double dagger in park2026).
- Later pages: no present or current address, no author-information affiliations (grep over all five text.md).
- Org mapping and localities against data/organizations.csv, canonical author_affiliations.csv, data/org_sites.csv
  and the canonical prints of EPFL, DRS Daylight Solutions and University of Ottawa (montifiore2026,
  shabaninezhad2025). Localities reuse existing site strings where the print matches: City University of Hong Kong
  "Kowloon, Hong Kong", Harvard "Cambridge, MA", Nankai "Tianjin".
- Not checked: VoR PDFs (not cached; no network).
