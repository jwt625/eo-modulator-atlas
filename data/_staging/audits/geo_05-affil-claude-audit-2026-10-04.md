---
auditor: claude (fresh-context independent audit, Opus)
task: per-author affiliation audit, batch geo_05 (DevLog-018 step 3)
date: 2026-10-04
scope: data/_staging/geo_05/author_affiliations.csv (370 rows, 27 papers), data/_staging/geo_05/organizations.csv (header only, 0 new orgs)
mode: read-only (only this report written)
counts:
  papers: 27
  rows: 370
  findings_blocking: 0
  findings_metadata: 1 (batch-wide, 362 rows)
  findings_minor: 3 (35 rows)
  papers_fail: 0
  papers_pass_after_corrections: 2 (vanackere2023, zhang2023; excludes batch-wide F01)
  papers_pass: 25 (content; F01 still applies to all except xu2022)
---

# geo_05 affiliation audit

Method: for every paper, compared each author's rows against the printed author line and affiliation block in `references/<paper_id>/text.md` (page-1 header, page-1 footer for Nature-family papers, "Author details" / "AUTHOR INFORMATION" sections where affiliations are printed there), checked footnote markers (email, equal-contribution, corresponding, "Now with"), checked org_name against `data/organizations.csv` (including spelling variants and parent/child entries), locality against the printed city of that affiliation, country ISO alpha-2, and the mechanical keys against `data/papers.csv`. xu2022 (no cached text) was checked against `references/xu2022/crossref.json`. Superscripts in text.md were unambiguous for every paper (markers comma-separated, no 1/l or letter ambiguity), so no page renders were needed. REPORT.md was read only after these checks.

Mechanical: all (paper_id, author_index, author) match papers.csv; no duplicate (paper_id, author_index, aff_order); aff_order contiguous from 1 per author; kind=primary iff aff_order=1 except present_address rows; no leading/trailing whitespace; every org_name exists in data/organizations.csv; all countries match the org's country.

## Per-paper results

Status reflects paper content; batch-wide F01 (source value) applies to every row with source=text.md and is not repeated per paper.

| paper_id | rows | status | findings |
|---|---|---|---|
| ummethala2021 | 15 | pass | - |
| valdez2022 | 12 | pass | - |
| valdez2023 | 4 | pass | - |
| valdez2023a | 3 | pass | - |
| vanackere2023 | 21 | pass after corrections | F02 |
| wang2018 | 6 | pass | - |
| wang2022a | 14 | pass | - |
| wang2024a | 17 | pass | - |
| wang2024b | 27 | pass | - |
| wang2025 | 9 | pass | - |
| wang2026a | 10 | pass | - |
| wang2026b | 23 | pass | - |
| weigel2018 | 14 | pass | - |
| witmer2020 | 9 | pass | - |
| wolf2018a | 19 | pass | - |
| wu2023 | 15 | pass | - |
| wu2025 | 17 | pass | - |
| xu2020 | 17 | pass | - |
| xu2022 | 8 | pass (source-limited) | - |
| yu2024 | 9 | pass | - |
| yue2023 | 3 | pass | - |
| yue2025 | 6 | pass | - |
| zhang2022 | 14 | pass | - |
| zhang2023 | 13 | pass after corrections | F03, F04 |
| zheng2026 | 43 | pass | - |
| zhong2026 | 9 | pass | - |
| zwickel2020 | 13 | pass | - |

## Findings

### F01 (metadata, batch-wide): source value not in the allowed set
- Rows: all 362 rows with `source=text.md` (every paper except xu2022).
- Current: `text.md`. Correct: `paper`.
- Locator: DevLog-018 table spec "source (paper | crossref)"; `scripts/validate_db.py` `AFFIL_SOURCES = {"paper", "crossref"}`. Every one of these rows would fail validation after merge.
- The 8 xu2022 rows (`source=crossref`) are fine.

### F02 (minor): vanackere2023 locator page
- Rows: (vanackere2023, 1..16, all aff_order) - 21 rows.
- Current locator: `p.1 affiliations`. Correct: `p.2 affiliations`.
- Source: text.md page 1 is the AIP cover sheet (title and author names only); the AFFILIATIONS block with markers 1-4 is on page 2.

### F03 (minor): zhang2023 locator page
- Rows: (zhang2023, 1..10, 1) and (zhang2023, 13, 1) - 11 rows.
- Current locator: `p.1 affiliations`. Correct: `p.9 author details`.
- Source: page 1 prints only the superscript markers; all four affiliation texts are in "Author details" on page 9 (text.md line ~1228). Rows 11 and 12 already cite `p.9 author details`.

### F04 (minor, convention call for the coordinator): zhang2023 AEMD as org_name
- Rows: (zhang2023, 8, 1), (zhang2023, 9, 1), (zhang2023, 10, 1).
- Current: org_name `Center for Advanced Electronic Materials and Devices` (facility row, parent_org Shanghai Jiao Tong University), unit empty.
- Printed (p.9): "2Center for Advanced Electronic Materials and Devices, Shanghai Jiao Tong University, Shanghai 200240, China."
- Alternative consistent with "unit holds departments/labs": org_name `Shanghai Jiao Tong University`, unit `Center for Advanced Electronic Materials and Devices`. City and country are identical either way, so no geographic effect. Other batches already use child-org rows as org_name (geo_01 Stanford Nano Shared Facilities, geo_04 Irvine Materials Research Institute), so the current value has precedent; decide one convention for all batches.

## Observations (no correction required by the spec, relevant to geocoding/merge)
- Empty locality (no city printed / Crossref name only): zwickel2020 12 rows (KIT aff 1-2, Kyushu aff 4; text.md prints only the country), xu2022 8 rows. `validate_db.py` requires an org_sites.csv row for every (org_name, locality); these need either a site row with empty locality or a policy decision.
- As-printed locality variants for the same campus will produce separate sites: Ghent University `Ghent` (vanackere2023, zheng2026) vs `Gent` (wu2023); City University of Hong Kong `Kowloon, Hong Kong` vs `Hong Kong` (witmer2020); KIT IMT `Eggenstein-Leopoldshafen` (ummethala2021, printed 76334) vs `Karlsruhe` (wolf2018a, printed 76131). All match their printed addresses.
- xu2022: 6 of 14 authors (Pittala, J. Tang, Ng, X. Tang, Kuschnerov, Zheng) have empty Crossref affiliation; the 8 present rows match crossref.json exactly (Sun Yat-Sen University x6, Zhejiang University x2).
- "Ghent University-imec" printed alone (vanackere2023 all authors; IDLab/PRG units) mapped to Ghent University only; where imec is printed as a separate numbered/grouped affiliation (wu2023, zheng2026) it has its own row. Consistent.
- Footnote markers correctly excluded: email markers (ummethala2021 6,7; wang2022a 4,5; zhang2022 6), equal-contribution (wang2024b 4; wang2018 *; wolf2018a dagger; witmer2020 double-dagger; wu2025 dagger). "Now with" footnotes in wolf2018a (Hartmann aff 3 Muenster, Lauermann aff 4 Infinera) correctly kind=present_address.

## Papers verified clean (content)
ummethala2021, valdez2022, valdez2023, valdez2023a, wang2018, wang2022a, wang2024a, wang2024b, wang2025, wang2026a, wang2026b, weigel2018, witmer2020, wolf2018a, wu2023, wu2025, xu2020, xu2022, yu2024, yue2023, yue2025, zhang2022, zheng2026, zhong2026, zwickel2020.
