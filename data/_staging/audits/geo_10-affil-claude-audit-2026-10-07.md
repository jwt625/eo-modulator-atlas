# geo_10 affiliation audit (Claude, fresh context, read-only, 2026-10-07)

Scope: `data/_staging/geo_10/` (14 papers, 151 rows, 0 staged orgs) against `references/<id>/text.md`,
`references/<id>/crossref.json`, `data/papers.csv`, `data/organizations.csv`, `data/author_affiliations.csv`,
`data/org_sites.csv`. Brief: `data/_staging/ingest_2026_10_07/GEO_AUDIT_PROMPT.md` (and `GEO_EXTRACT_PROMPT.md`);
practice from `geo_06-07-` and `geo_08-09-affil-claude-audit-2026-10-07.md` (rulings A one row per printed
affiliation, B mechanical expansion, C accents).

Result: 0 blocking, 1 metadata, 2 minor, 4 observations. Mergeable after the one-field locator fix (M1); minor items
optional.

## Per-paper results

| paper | authors / with rows | rows | result |
|---|---|---|---|
| bhasker2026 | 6/6 | 6 | pass |
| chen2026 | 8/8 | 11 | pass |
| hess2026 | 11/11 | 12 | pass |
| karakida2026 | 5/5 | 5 | pass |
| li2024 | 8/8 | 8 | pass (m1) |
| liu2026d | 5/5 | 6 | finding M1 (locator) |
| ohata2026 | 7/7 | 7 | pass (m2) |
| rakowski2026 | 15/15 | 15 | pass |
| shen2026 | 20/20 | 20 | pass (O1, O2) |
| sun2026 | 6/6 | 6 | pass |
| tobing2026 | 24/24 | 37 | pass |
| xu2026b | 5/5 | 5 | pass |
| yang2026 | 7/7 | 7 | pass |
| zhang2026c | 6/6 | 6 | pass |

No missing rows: every papers.csv author has at least one row; every printed affiliation (including Ozolins 3+4,
Chen 1+2+3, Ye 2+4, the 13 tobing2026 two-marker authors, D. Zhu 1+3, T. Liu MPI+Toronto) is represented. No new
organizations staged and none needed: every org_name exists in `data/organizations.csv`.

## Findings

| id | severity | paper / author | evidence (locator) | fix |
|---|---|---|---|---|
| M1 | metadata | liu2026d, all 6 rows | Locator "p.12 Author Information". The AUTHOR INFORMATION section is on text.md `<!-- page 10 -->` (line 1218; page footer "ACS Photonics 2026, 13, 3951-3962 / 3960", i.e. the 10th of 12 pages). Page 12 is the reference list. | Set locator to "p.10 author information" (canonical lowercase style, e.g. "p.13 author information", "p.6 author information"). Row content is correct and matches crossref.json. |
| m1 | minor | li2024, McGill rows (authors 1, 3, 4, 5, 8) | Printed "Photonic Systems Group, Department of Electrical and Computer Engineering, McGill University" (text.md p.1 footnote, lines 62-64): comma, no "and". Staged unit joins with "; ". Ruling A: ", " kept where printed, "; " where the print joins with "and" or line breaks. | Optional: "Photonic Systems Group, Department of Electrical and Computer Engineering". Not a defect under ruling A (separator not uniform in canonical). |
| m2 | minor | ohata2026, Kenichi Abe (6) | Printed "3Manufacturijng Engineering Center, Mitsubishi Electric Corporation" (text.md p.1 line 3 of affiliations). Staged unit "Manufacturing Engineering Center" silently corrects the print typo; REPORT.md does not mention it. | Keep the corrected unit (obvious typo; matches the org row notes "Amagasaki (Manufacturing Engineering Center)"); add note "printed 'Manufacturijng'". |
| O1 | observation | shen2026, Daneil Lopez (15) | Author string as printed on p.1 and in crossref.json ("Daneil Lopez"); equals the papers.csv slot. | None in this batch (author_index/author must follow papers.csv). Any spelling correction belongs to papers.csv/people, out of scope. |
| O2 | observation | shen2026, Bian (2), Yuan (19) | Northeastern University printed "Oakland, California 94613, USA" (text.md p.1). The org row (ROR 04t5xt781, Boston-based university) has notes "Oakland, CA address". | None. At geocoding, place the site by the Oakland locality, not by the org headquarters (Boston). Not to be confused with Northeastern University (Shenyang, CN): only the US row exists, no wrong merge. |
| O3 | observation | canonical, cross-batch | State/province forms are mixed in canonical: 29 paper-locality pairs abbreviate a printed full US state name (e.g. anderson2025 "Stanford, CA", rahman2025 "La Jolla, CA", holzgrafe2020 "Cambridge, MA"); xue2023 ("Rochester, New York", "Redmond, Washington") and valdez2026 ("La Jolla, California") keep the full name; Canada keeps the printed form (geravand2025 "Quebec City, Quebec", others ON/BC/QC as printed). | None here; a later normalization pass could fold the full-name holdouts into the postal form. |
| O4 | observation | liu2026d, Joyce K. S. Poon (4) | Printed only "Department of Electrical and Computer Engineering, University of Toronto" in this paper (p.10 author information; crossref.json agrees). | None (as printed; no back-fill from other papers). |

## Rulings on the REPORT.md judgment calls

1. Single-marker multi-unit rows joined by "; " (chen2026, li2024, zhang2026c): upheld under ruling A (one row per
   printed affiliation, all units in one string). chen2026 Nanjing (printed "..., ..., and ...") and zhang2026c
   Qingdao (printed "..., ... & ...") fit the "; " usage; li2024 prints a plain comma (m1, optional).
2. No present_address rows: confirmed; none printed in any of the 14 papers. kind = primary at aff_order 1, additional
   at >= 2 for all 151 rows.
3. tobing2026 "Institute of Microelectronics (IME), A*STAR" -> existing row "Institute of Microelectronics" (SG,
   parent_org "Agency for Science, Technology and Research"): upheld. Same mapping as canonical zhang2026b (11 rows,
   same NSTIC/IME pair, "Singapore"). A*STAR is the parent printed inside the same affiliation, not a separate
   affiliation, so no extra A*STAR row (same treatment as CAS after an institute name). zhang2026c "Institute of
   Microelectronics, Chinese Academy of Sciences, Beijing" -> its own CN row: upheld; the org row notes record the
   distinction. No wrong merge.
4. US postal-state abbreviations vs printed state name: upheld. The brief's own example is "Cambridge, MA", and
   canonical practice abbreviates printed full state names in 29 paper-locality pairs vs 2 papers keeping the full
   name (O3). For shen2026, "Santa Clara, CA" is also the existing canonical string (NVIDIA patel2026, Keysight print
   in the same paper), so "Goleta, CA" / "Oakland, CA" keep the batch internally consistent. Postal codes dropped:
   correct (never part of locality in canonical). Canadian "Toronto, Ontario" (liu2026d) kept as printed: accepted,
   canonical keeps printed Canadian forms ("Quebec City, Quebec"); no existing Toronto site to collide with.
5. Japanese city/prefecture: upheld. ohata2026 "Kamakura, Kanagawa" (from "Ofuna, Kamakura, Kanagawa", dropping the
   sub-district as in yamaguchi2026 "Shinjuku, Tokyo"), "Itami, Hyogo", "Amagasaki, Hyogo"; the first two are the
   exact canonical strings for the same Mitsubishi units in okuda2026 (15 rows). karakida2026 "Bunkyo-ku, Tokyo"
   equals the existing UTokyo site string and the print ("7-3-1 Hongo, Bunkyo-ku, Tokyo").
6. li2024 accents "Montréal, QC", "Stäfa": upheld. text.md p.1 footnote reads "Montréal, QC H3A 0E9" and "8712 Stäfa"
   ungarbled, so the print carries the accents (ruling C). Both equal existing strings for the same orgs: McGill
   "Montréal, QC" in canonical eltes2023 (5 rows), Lumiphase site "Stäfa" (org_sites.csv). qiu2026a "Montreal, QC"
   follows its own unaccented print; the two spellings are already separate in canonical.
7. liu2026d Author Information section: upheld for content. Page 1 prints no affiliation block; the section lists
   Liu (MPI, then Toronto), Sacher, Bebeti, Straguzzi (MPI), Poon (Toronto). aff_order follows the printed order;
   crossref.json agrees author by author. Locator page is wrong (M1).
8. shen2026 Northeastern University "Oakland, CA": upheld. Printed "Department of Electrical and Computer
   Engineering, Northeastern University, Oakland, California 94613, USA"; locality from the print, not from the org's
   main campus (O2).
9. Equal-contribution (†, +, *) and corresponding markers ignored: verified in chen2026, shen2026, xu2026b, yang2026,
   hess2026, sun2026, rakowski2026, tobing2026.

## Locality vs existing sites (same org)

Reuses the existing string: ETH Zurich "Zurich", Polariton Technologies AG "Adliswil" (horst2025), RISE "Kista" and
Riga Technical University "Riga" (li2026b), The University of Tokyo "Bunkyo-ku, Tokyo", Lumiphase "Stäfa", McGill
"Montréal, QC" (eltes2023), Mitsubishi "Kamakura, Kanagawa" / "Itami, Hyogo" (okuda2026), NVIDIA "Santa Clara, CA"
(patel2026), GlobalFoundries "Malta, NY", University of Michigan "Ann Arbor, MI", Nokia Bell Labs "Murray Hill, NJ",
NSTIC / IME / NUS "Singapore", Zhangjiang Laboratory "Shanghai". New sites from distinct printed addresses only:
GlobalFoundries "Essex Junction, VT", "Santa Clara, CA"; Mitsubishi "Amagasaki, Hyogo"; NVIDIA "Yokneam" (IL); and
first sites of orgs with no prior rows (Broadcom, Nexus, Keysight, Northeastern, MPI Halle, Toronto, Nanjing,
Nanzhi, SINANO "Suzhou, Jiangsu", Suzhou Polytechnic "Suzhou", Changchun x2, Qingdao, CAS IME). No near-duplicate
string created for an existing site.

## What was checked

- Structural (script over the staged CSV): header equals canonical; author string equals the papers.csv slot for
  every row; every papers.csv author has rows; no duplicate (paper_id, author_index, aff_order); aff_order contiguous;
  kind consistent with aff_order; every org_name exists in `data/organizations.csv`; ISO countries consistent with
  the printed address; source = paper for all rows; batch list equals the staged paper set; none of the 14 papers
  already has canonical rows.
- Content: read the printed affiliation block (byline markers, IEEE first-page footnote for li2024, ACS author
  information for liu2026d, Wiley byline for zhang2026c) in every text.md and checked each marker or name sentence
  against every row (author, aff_order, org, unit, locality, country). crossref.json compared for liu2026d,
  zhang2026c, chen2026, shen2026 (agree; shen2026 has no affiliations).
- Org mappings: NVIDIA Corporation -> NVIDIA, IME A*STAR vs CAS IME, Northeastern University (US), Lumiphase AG ->
  Lumiphase, GlobalFoundries, Mitsubishi Electric Corporation, Keysight Technologies (not the Deutschland GmbH row).
- Locality strings vs `data/org_sites.csv` and canonical rows for each org; canonical US/CA/JP locality inventory and
  a scan of canonical papers whose print uses a full state name.
- Not run: `scripts/merge_affiliations.py` dry run (extractor reported 0 problems; structural checks above cover its
  checks); no page renders (markers legible in text.md for all 14 papers); no network, no git. This report is the only
  file written (scratch scripts in the session scratchpad).
