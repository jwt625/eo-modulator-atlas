---
auditor: Claude (fresh-context independent audit subagent)
task: per-author affiliation audit, batch geo_02
date: 2026-10-04
scope: data/_staging/geo_02/author_affiliations.csv (293 rows, 27 papers, 236 authors); data/_staging/geo_02/organizations.csv (header only, 0 new orgs)
mode: read-only
counts:
  papers: 27
  pass: 25
  pass_after_corrections: 2
  fail: 0
  findings_blocking: 0
  findings_metadata: 0
  findings_minor: 2
---

# geo_02 affiliation audit

## Method
- Mechanical: every (paper_id, author_index, author) compared with `data/papers.csv` `authors`; key uniqueness of (paper_id, author_index, aff_order); aff_order contiguity per author; every org_name looked up in `data/organizations.csv`; org country compared with row country; name-variant scan of registry for each org used.
- Content: for each paper, the printed affiliation block in `references/<paper_id>/text.md` (p.1; p.2 for lin2025; end-of-paper "Author details" for kohli2025) read and mapped marker by marker against the rows. hou2024 checked against `references/hou2024/crossref.json` (the cached arXiv text prints no affiliations; confirmed by grep for Xidian/Nanjing/Guangzhou: no hits).
- Page renders (scratchpad, p.1) inspected for li2026aa and hu2023 to confirm superscripts from line-broken extracted text.
- `REPORT.md` read only after these checks.

## Mechanical results
- 27/27 papers present; author names and indices match `papers.csv` for all 236 authors; no missing or extra authors.
- No duplicate keys; aff_order contiguous from 1 for every author.
- All org_names exist verbatim in `data/organizations.csv`; staged organizations.csv is header-only, consistent with that. No spelling-variant duplicates found among registry orgs used.
- Row country equals registry country for every row.
- Only empty locality: kari2025 author 4 (Cetus Photonics, Inc.); no city printed (correct to leave empty).

## Per-paper results

| paper_id | rows | result | findings |
|---|---|---|---|
| heidari2022 | 8 | pass | - |
| holzgrafe2020 | 13 | pass | - |
| hou2024 | 11 | pass | - |
| hsu2024 | 9 | pass | - |
| hu2023 | 16 | pass | - |
| hu2026 | 7 | pass | - |
| hu2026a | 21 | pass | - |
| huang2026a | 6 | pass | - |
| johnson2025 | 8 | pass | - |
| kari2025 | 6 | pass | - |
| kawahara2025 | 7 | pass | - |
| kharel2021 | 5 | pass | - |
| kieninger2020 | 12 | pass | - |
| kim2025 | 3 | pass | - |
| kohli2025 | 16 | pass | - |
| larocque2024 | 17 | pass | - |
| lee2020 | 8 | pass | - |
| lee2020a | 7 | pass | - |
| lee2026 | 23 | pass | - |
| li2020 | 7 | pass | - |
| li2022b | 7 | pass after corrections | M1 |
| li2025a | 15 | pass after corrections | M2 |
| li2025b | 4 | pass | - |
| li2026 | 7 | pass | - |
| li2026aa | 23 | pass | - |
| li2026ba | 7 | pass | - |
| lin2025 | 20 | pass | - |

## Findings

### Blocking
None.

### Metadata
None.

### Minor

M1. li2022b, Zhejiang University rows: (li2022b, 2, 1), (li2022b, 3, 1), (li2022b, 7, 1).
- Current unit: `State Key Laboratory for Modern Optical Instrumentation; Centre for Optical and Electromagnetic Research`
- Correct unit: `State Key Laboratory for Modern Optical Instrumentation; Centre for Optical and Electromagnetic Research; Zhejiang Provincial Key Laboratory for Sensing Technologies`
- Source: text.md p.1, affiliation 2 ("... Zhejiang Provincial Key Laboratory for Sensing Technologies, East Building No. 5, Zijingang Campus, Zhejiang University, Hangzhou 310058, China"). Org, locality, country correct.

M2. li2025a, Zhejiang University rows.
- (li2025a, 1..3, 1), (li2025a, 5..12, 1), all Hangzhou rows: current unit `State Key Laboratory for Extreme Photonics and Instrumentation; College of Optical Science and Engineering`; printed affiliation 1 also lists `International Research Center for Advanced Photonics`. Correct unit: `State Key Laboratory for Extreme Photonics and Instrumentation; College of Optical Science and Engineering; International Research Center for Advanced Photonics`.
- (li2025a, 10, 2), (li2025a, 11, 2), (li2025a, 12, 2), Jiaxing rows: current unit `Jiaxing Research Institute; Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging`; printed affiliation 3 is "Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging, Intelligent Optics & Photonics Research Center, Jiaxing Research Institute, Zhejiang University, Jiaxing 314000". Correct unit (printed order): `Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging; Intelligent Optics & Photonics Research Center; Jiaxing Research Institute`.
- Source: text.md p.1 affiliations 1 and 3. Org, locality, country correct.

## Observations (no change required)
- kari2025 (4, 1): Cetus Photonics, Inc. prints no address; country US comes from the registry, as the row note states. Not printed, so locality empty is correct.
- li2025a (4, 1): HKUST (Guangzhou) prints no street city ("Microelectronics Thrust, The Hong Kong University of Science and Technology (Guangzhou), China."); locality Guangzhou is taken from the campus name. Acceptable.
- lee2026 (12, 1): printed locality "Ramat Aviv" (Tel Aviv neighborhood) kept as printed; a geocoder may need it resolved to Tel Aviv.
- hu2023 rows for marker 2 use the registry string "China Information and Communication Technologies Group Corporation"; printed is "China Information Communication Technologies Group Corporation". Registry name, correct per rule 2.
- larocque2024: "DEVCOM Army Research Laboratory" -> registry "U.S. Army Combat Capabilities Development Command Army Research Laboratory"; "University of Illinois - Chicago" -> "University of Illinois Chicago". Both correct mappings.
- Equal-contribution markers correctly excluded: heidari2022 (dagger), hu2023 (5), hu2026 (3), lee2026 (asterisk), li2026/li2026ba (asterisk), li2026aa (7, confirmed on render: Li, Yi, Sun, Pan). Corresponding-author markers (*, dagger, envelope) not treated as affiliations anywhere.
- No present-address footnotes in any of the 27 papers (grep of text.md for "present address", "current address", "now at", "now with": no hits).
- REPORT.md agrees with these results; no discrepancy with its row counts or judgment calls.

## Papers verified clean
heidari2022, holzgrafe2020, hou2024, hsu2024, hu2023, hu2026, hu2026a, huang2026a, johnson2025, kari2025, kawahara2025, kharel2021, kieninger2020, kim2025, kohli2025, larocque2024, lee2020, lee2020a, lee2026, li2020, li2025b, li2026, li2026aa, li2026ba, lin2025 (25 papers).
