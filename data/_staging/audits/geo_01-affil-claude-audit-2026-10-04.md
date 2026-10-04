---
auditor: Claude (fresh-context independent audit subagent)
task: per-author affiliation audit, batch geo_01
date: 2026-10-04
scope: data/_staging/geo_01/author_affiliations.csv (337 rows, 27 papers, 270 authors with rows of 272 in papers.csv); data/_staging/geo_01/organizations.csv (2 new orgs)
mode: read-only
counts:
  papers: 27
  pass: 25
  pass_after_corrections: 1
  fail: 1
  findings_blocking: 0
  findings_metadata: 2
  findings_minor: 1
---

# geo_01 affiliation audit

## Method
- Mechanical: every (paper_id, author_index, author) compared with `data/papers.csv` `authors` (split on ";", whitespace stripped); index coverage 1..N per paper; key uniqueness of (paper_id, author_index, aff_order); aff_order contiguity per author; every org_name looked up in `data/organizations.csv` plus the staged `organizations.csv`; row country compared with registry country; registry scanned for spelling variants of every org used.
- Content: for each paper, the printed affiliation block in `references/<paper_id>/text.md` read and mapped marker by marker against the rows (p.1; p.2 for chen2022 behind the cover page; p.9 "Author details" for deng2026; p.13 "Author Information" for giambra2021; IEEE biographical footnote for gupta2023; end-of-page footnote block for chelladurai2025, churaev2023, didier2026). Equal-contribution markers (anderson2025 "*", cai2025 "*", churaev2023 "5", deng2026, feng2022 "†", guo2026 "†", han2023 "7", giambra2021 "†/‡") and corresponding-author markers checked as not mapped to affiliations.
- fukui2025 p.1 rendered from `source.pdf` into the scratchpad and its spans dumped to confirm the "1," after Fukui carries no further marker and "†" (present address) belongs to Yanwachirakul only.
- cai2025 `crossref.json` checked for the two missing authors (no affiliations listed there).
- `REPORT.md` read only after these checks.

## Mechanical results
- 27/27 papers present. Author names and indices match `papers.csv` for all 270 authors with rows; no extra authors.
- Missing authors: cai2025 authors 8 (Jiale Sun) and 9 (Shuhang Zheng), see F1.
- No duplicate keys; aff_order contiguous from 1 for every author.
- All org_names exist verbatim in `data/organizations.csv` or the staged file; the 2 staged orgs (Zurich Instruments AG; Chulalongkorn University) are absent from the registry (no variants found), and their type/country/region (company/CH/europe; university/TH/southeast_asia) are correct.
- Row country equals registry country for every row. Hong Kong addresses printed "Hong Kong, China" coded HK, consistent with the registry.
- Empty localities: celik2022 Stanford rows (address prints "348 Via Pueblo Mall, CA 94305", no city) and chiang2025 Polaris rows ("Polaris Electro-Optics, Inc., USA"); both correctly empty.

## Per-paper results

| paper_id | rows | result | findings |
|---|---|---|---|
| akazawa2026 | 9 | pass | - |
| anderson2025 | 13 | pass after corrections | F2 |
| arabjuneghani2022 | 10 | pass | - |
| berman2026 | 3 | pass | - |
| cai2025 | 13 | fail (open gap, not fixable from local sources) | F1 |
| celik2022 | 11 | pass | - |
| chelladurai2025 | 11 | pass | - |
| chen2022 | 14 | pass | - |
| chen2023a | 5 | pass | - |
| chen2024 | 15 | pass | - |
| chiang2025 | 8 | pass | - |
| churaev2023 | 26 | pass | F3 (minor, optional) |
| deng2026 | 23 | pass | - |
| derose2012 | 4 | pass | - |
| didier2026 | 11 | pass | - |
| dong2026 | 13 | pass | - |
| falcone2026 | 5 | pass | - |
| feng2022 | 9 | pass | - |
| fukui2025 | 16 | pass | - |
| gao2024 | 18 | pass | - |
| geravand2025 | 6 | pass | - |
| giambra2021 | 22 | pass | - |
| gui2022 | 8 | pass | - |
| guo2026 | 15 | pass | - |
| gupta2023 | 9 | pass | - |
| han2023 | 24 | pass | - |
| he2019 | 16 | pass | - |

## Findings

### F1 (metadata): cai2025 authors 8 and 9 have no rows
- Keys: (cai2025, 8, Jiale Sun) and (cai2025, 9, Shuhang Zheng): no rows.
- Current: absent. Correct: one or more rows each, per the published Nature Communications version (DOI 10.1038/s41467-026-69769-3).
- Source: `references/cai2025/text.md` p.1 and SI p.12 print a 10-author list without these two names (cached text is the preprint); `references/cai2025/crossref.json` lists both authors with empty affiliation arrays. No local source gives their affiliations; resolving needs the published version (network). Already disclosed in REPORT.md. Leave open and record as a gap rather than guessing.

### F2 (metadata): anderson2025 Christine Jilly org_name is the facility, not the institution
- Key: (anderson2025, 7, 1).
- Current: org_name "Stanford Nano Shared Facilities" (registry type facility, parent Stanford University), unit empty.
- Correct: org_name "Stanford University", unit "Stanford Nano Shared Facilities" (printed affiliation 4: "Stanford Nano Shared Facilities, Stanford University, Stanford, California 94305, United States"; text.md p.1). This matches how other Stanford units (E. L. Ginzton Laboratory) are coded and keeps the facility registry row (an acknowledgements entity) out of the author counts. Locality "Stanford, CA" and country US are correct either way, so no map-position impact.

### F3 (minor, optional): churaev2023 ETH locality spelling
- Key: (churaev2023, 9, 2).
- Current: locality "Zurich". Printed: "CH-8092 Zürich, Switzerland" (text.md p.1 footnote). The same row set writes "Rüschlikon" with the printed umlaut, so "Zürich" would be the as-printed form. Same city; no geocoding impact. Leave as is if the coordinator normalizes ETH to "Zurich" across batches.

## Notes (no finding)
- fukui2025: NICT affiliation printed at "588-2 Iwaoka, Nishi-ku, Kobe, Hyogo"; locality "Kobe, Hyogo" is correct even though the registry note for NICT mentions Koganei. Geocoding should use the Kobe site for these two rows.
- deng2026: Zhejiang University affiliation 4 printed at Taizhou; locality "Taizhou, Zhejiang" is correct (separate site from Hangzhou).
- gao2024: East China Normal University affiliation 4 printed with postcode 200062 (Putuo campus) and affiliations 3/8 with 200241 (Minhang campus); all coded "Shanghai", which is correct at city level.
- gupta2023: Baier's "was with" HHI coded primary and "now with" KEEQuant coded present_address; locality "Fürth" as printed.
- giambra2021: "NEST, Scuola Normale Superiore and Istituto Nanoscienze-CNR" split into two rows (SNS, CNR) for Pezzini and Fabbri; acceptable reading of one printed unit naming two institutions.
- celik2022 and chiang2025 empty localities are correct (no city printed); geocoding will need the org-level fallback for them.

## Papers verified clean
akazawa2026, arabjuneghani2022, berman2026, celik2022, chelladurai2025, chen2022, chen2023a, chen2024, chiang2025, churaev2023 (minor optional note only), deng2026, derose2012, didier2026, dong2026, falcone2026, feng2022, fukui2025, gao2024, geravand2025, giambra2021, gui2022, guo2026, gupta2023, han2023, he2019.
