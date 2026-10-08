# geo_11 affiliation audit (Claude, fresh context, read-only, 2026-10-07)

Scope: `data/_staging/geo_11/` (20 papers, 187 rows, 1 staged org) against `references/<id>/text.md`,
`references/<id>/crossref.json` / `arxiv.json`, `data/papers.csv`, `data/organizations.csv`,
`data/author_affiliations.csv`, `data/org_sites.csv`. Brief: `data/_staging/ingest_2026_10_07/GEO_AUDIT_PROMPT.md`
(and `GEO_EXTRACT_PROMPT.md`); practice from `geo_06-07-`, `geo_08-09-`, `geo_10-affil-claude-audit-2026-10-07.md`
(ruling A one row per printed affiliation, B mechanical expansion, C accents only where printed; R7 locality reuse).

Result: 0 blocking, 0 metadata, 2 minor, 5 observations. Mergeable as staged; minor items optional.

## Per-paper results

| paper | authors / with rows | rows | result |
|---|---|---|---|
| behzadfar2026 | 4/4 | 5 | pass |
| ghavami2023 | 3/3 | 3 | pass |
| wu2022 | 10/10 | 24 | pass |
| yeh2026 | 6/6 | 7 | pass |
| bankwitz2026 | 12/12 | 14 | pass (O1, O3) |
| zhu2022 | 14/14 | 15 | pass |
| axline2026 | 9/9 | 9 | pass |
| mohl2025 | 10/10 | 11 | pass |
| khalil2026 | 15/15 | 25 | pass |
| lin2026b | 6/6 | 7 | pass |
| thureja2025 | 6/6 | 6 | pass |
| tian2026 | 11/11 | 11 | pass (O4) |
| datta2020 | 12/12 | 12 | pass |
| datta2024 | 6/5 | 6 | pass (Vivian Zhou correctly without row) |
| taki2024 | 9/9 | 9 | pass |
| anjali2025 | 3/3 | 3 | pass (m2, O2) |
| chaudhury2024 | 6/6 | 6 | pass (m1) |
| saxena2023 | 2/2 | 2 | pass |
| shawon2024 | 2/2 | 2 | pass |
| shabaninezhad2025 | 5/5 | 10 | pass |

No missing rows: every printed affiliation is represented (wu2022 Cheng six markers 1-6, Qi 3+4 with 7 =
correspondence excluded; khalil2026 Painter 6+7; shabaninezhad2025 Shabaninezhad and Berini 1+2+3, Ramunno 2+3;
bankwitz2026 Varri and Pernice 1+2; zhu2022 Di Zhu 1+2; lin2026b Shang 1+2; datta2024 Chae 2+3). The only author
without a row is datta2024 Vivian Zhou (slot 4): absent from the cached arXiv byline (5 authors); crossref.json gives
her `affiliation: [{name: null}]`, so nothing to fill. Correct.

## Findings

| id | severity | paper / author | evidence (locator) | fix |
|---|---|---|---|---|
| m1 | minor | chaudhury2024, Vladimir Fedorov (3) | Locator "crossref.json author affiliation" is a new variant. Canonical crossref rows use "crossref.json affiliation" (11 rows) or "crossref.json author N" (3 rows). Content is correct: crossref.json author 3 "Department of Electrical and Computer Engineering, University of California, San Diego, La Jolla, CA, USA". | Optional: locator "crossref.json author 3". |
| m2 | minor | anjali2025, all 3 rows | Locality "West Bengal" is a state, not a city (printed "Indian Institute of Technology Kharagpur, Advanced Technology Development Centre, West Bengal-721302, India", text.md p.1). Canonical precedent murai2025 AIST "Ibaraki" carries note "no city printed (only 'Ibaraki 305-8569'); prefecture kept as printed"; the staged rows have an empty note. | Optional: note "no city printed (only 'West Bengal-721302'); state kept as printed". |
| O1 | observation | bankwitz2026, Varri (9), Pernice (11), Hartmann (10) | Print "Physics Institute, University of Münster, Heisenbergstraße 11, 48149 Münster, Germany" and "Pixel Photonics GmbH, Heisenbergstraße 11, 48149 Münster" (text.md p.1). Existing University of Münster site "Muenster" comes from wolf2018a, whose own print reads "University of Muenster, 48149 Muenster" (text.md line 25). | None (as printed, R7). Creates a second University of Münster site with a near-identical point; fold only in a later locality-normalization pass. |
| O2 | observation | anjali2025 | "West Bengal" state centroid is roughly 90-100 km from the IIT Kharagpur campus (estimate, not measured). | At geocoding, place the site by the institution, not the state centroid; `scripts/geocode_sites.py` has a 100 km override for printed provinces/prefectures. |
| O3 | observation | bankwitz2026, Wladick Hartmann (10) | papers.csv "Wladick Hartmann" (Crossref and print); canonical wolf2018a slot 3 "Wladislaw Hartmann" (email [e-mail address at uni-muenster.de, redacted] in wolf2018a text.md line 41). | None here; people dedup only. |
| O4 | observation | tian2026, Chenguang Deng (9) | Byline "Chenguang Deng 1,*" only; his email domain btifii.org.cn is not a printed affiliation. | None (no row from an email domain). |
| O5 | observation | yeh2026 Barton, datta2020 NC State | Unit strings keep the printed "and" ("Department of Materials Science and Engineering and the Materials Research Center"; "Department of Materials Science and Engineering and Department of Physics"). Canonical separator is not uniform (geo_06-07 R1). | None. |

## Rulings on the REPORT.md judgment calls

1. anjali2025 locality "West Bengal": upheld. The address prints no city; "Kharagpur" occurs only inside the
   institution name, which is not a printed locality (zwickel2020 / schwarzenberger2026a KIT precedent). The printed
   state is kept as printed, same as murai2025 "Ibaraki" (prefecture only). Empty would also be defensible but would
   drop printed location data; "Kharagpur, West Bengal" would invent a city from the org name. Add the note (m2).
   The org row notes already say "Kharagpur, West Bengal"; that is org metadata, not a printed locality.
2. "Münster" vs existing "Muenster": upheld as printed. R7 (geo_06-07): reuse the existing string only when the printed
   address is identical; here the print spells "Münster", wolf2018a printed "Muenster" (horst2025 "Zürich" vs
   "Zurich" precedent). Accent is in the print (ruling C). Pixel Photonics GmbH has no prior site; "Münster" is its
   first. See O1.
3. chaudhury2024 Fedorov from Crossref: upheld. papers.csv slot 3 is "Vladimir Fedorov" (Crossref VoR 10.1109/
   lpt.2024.3488699, refreshed 2026-10-07); the cached arXiv print (2407.11172v1, arxiv.json and text.md line 124)
   lists Chengkuan Gao in that position. The brief allows crossref.json to fill authors the cached paper does not cover:
   Fedorov is not covered, and crossref.json gives him the same UCSD ECE, La Jolla address as all other authors (which
   also matches the print's "The authors are with ..." footnote, text.md lines 116-117). source crossref, note records
   the arXiv/VoR difference. Only the locator wording is off-pattern (m1). No row for Gao (not in papers.csv): correct.
4. Org mappings: all upheld.
   - "Shanghai Institute of Optics and Fine Mechanics, Chinese Academy of Sciences" -> `Shanghai Institute of Optics
     and Fine Mechanics` (renamed 2026-10-05, own name; CAS suffix is the parent, not a separate affiliation). Unit
     State Key Laboratory of High Field Laser Physics matches the org notes.
   - "IBM Research Europe, Zurich, Säumerstrasse 4, CH-8803 Rüschlikon" -> `IBM Research - Zurich`; org notes record
     the printed form and the Rüschlikon address; crossref.json ROR 02js37d36 equals the org row ROR. Locality
     "Rüschlikon" equals the existing site string.
   - "HyperLight Corporation, 501 Massachusetts Ave, Cambridge, MA" -> `HyperLight`: same address in org notes;
     canonical holzgrafe2020 and kharel2021 map the same way.
   - "Institute of Materials Research and Engineering, Agency for Science, Technology and Research (A*STAR)" ->
     `Agency for Science, Technology and Research` with unit IMRE: no IMRE org row exists; identical to canonical
     renaud2023 (Di Zhu, same unit, "Singapore"). Distinct from the IME row (`Institute of Microelectronics`); no wrong
     merge.
   - "École Polytechnique Fédérale de Lausanne (EPFL)" (text.md "´Ecole ... F´ed´erale", split accents) -> `EPFL`
     (renamed 2026-10-05, own preferred name). Unit empty, locality "Lausanne" equals the existing site.
   - Others checked: Tarbiat Modares University, UCAS, ECNU (separate rows for markers 3 and 4, ruling A), Shandong
     Normal University, Shanghai Research Center for Quantum Sciences, Heidelberg University, University of Münster,
     Pixel Photonics GmbH, MIT (RLE), Miraex SA, imec ("Imec"), KU Leuven (three distinct units under three markers),
     Ghent University ("Ghent" equals an existing site string), Caltech (marker 6 "Kavli ... and Thomas J. Watson,
     Sr., Laboratory of Applied Physics" in one row, marker 7 IQIM separate; no Kavli/IQIM org rows), NUS, Nanjing
     University (one marker, one row, long unit as printed), Tsinghua, Peking University, National Center for
     Nanoscience and Technology, Columbia (EE/ME/Physics per marker), North Carolina State University, University of
     Chicago, Nanyang Technological University, The University of Tokyo ("Bunkyo-ku, Tokyo" printed and equal to the
     existing site), IIT Kharagpur, UCSD, University of Delaware, University of Ottawa, NEXQT Institute, Huawei
     Technologies Canada ("Kanata, ON"; not the CN parent row).
5. present_address rows: upheld.
   - yeh2026 Barton: "1,a"; "aPresent address: Department of Materials Science and Engineering and the Materials
     Research Center, Northwestern University, Evanston, IL 60208, USA" (text.md p.1). Primary Harvard at aff_order 1,
     present_address Northwestern at aff_order 2, locality "Evanston, IL" equals the existing Northwestern site.
   - mohl2025 Glantschnig: "1, †"; "† Present address: Infineon Technologies Austria AG, Siemensstraße 2, 9500
     Villach, Austria" (text.md lines 63-64, p.1). Primary IBM at aff_order 1, present_address Infineon at 2, locator
     "p.1 author footnote". Same pattern as canonical eltes2020 / tiberi2026 / wolf2018a (present_address after the
     primary). Karg "‡" and Seidler "§" are not address footnotes in the cached text (no other present-address line);
     no rows needed.
6. New org `Infineon Technologies Austria AG`: upheld. No Infineon row exists in `data/organizations.csv`. Name as
   printed; org_type company; country AT and region europe (consistent with the existing AT row Graz University of
   Technology); parent_org empty (no Infineon Technologies AG row to point to); notes give locality and locator;
   ror_id and name_source empty as the brief requires. Header equals the canonical header.
7. Separate rows for separately marked units of one institution (wu2022 ECNU 3/4; behzadfar2026 Fathpour "is with
   CREOL ... and also with the Department of Electrical and Computer Engineering, University of Central Florida",
   text.md lines 131-134, two complete printed addresses) and one row for several units under one marker (datta2020
   NC State, lin2026b Nanjing, datta2024 NTU, datta2020 UChicago): upheld (ruling A).
8. wu2022 marker-4 unit with the printed em dash and "Electronics Science": upheld (as printed; crossref.json carries
   the identical string).
9. Mechanical expansions: saxena2023 "ECE Department" -> "Electrical and Computer Engineering Department";
   shabaninezhad2025 "School of Electrical Eng. and Comp. Sci." -> "School of Electrical Engineering and Computer
   Science": upheld (ruling B). shawon2024 unit as printed ("Department of Electrical and Computer Engineering"),
   matches crossref.json.
10. US "City, ST": thureja2025 "Pasadena, California" -> "Pasadena, CA"; datta2020 "New York, New York" ->
    "New York, NY", "Raleigh, North Carolina" -> "Raleigh, NC": upheld (geo_10 ruling 4); each equals the existing
    site string where one exists (Caltech, Columbia). Canada "Ottawa, ON" / "Kanata, ON" as printed (NEXQT printed
    "Ottawa ON" without comma; comma insertion is mechanical).

## Locality vs existing sites (same org)

Reuses the existing string: Harvard, MIT, HyperLight "Cambridge, MA"; Northwestern "Evanston, IL"; A*STAR, NUS, NTU
"Singapore"; EPFL "Lausanne"; IBM "Rüschlikon"; imec, KU Leuven "Leuven"; Ghent University "Ghent"; Caltech
"Pasadena, CA"; Columbia "New York, NY"; UTokyo "Bunkyo-ku, Tokyo"; UCSD "La Jolla, CA"; Delaware "Newark, DE";
UCF "Orlando, FL"; SIOM, ECNU, SRCQS "Shanghai"; UCAS, Tsinghua, Peking "Beijing"; Nanjing "Nanjing"; Shandong Normal
"Jinan". New sites: University of Münster "Münster" (O1, print differs from wolf2018a), and first sites of orgs with
no prior site (Tarbiat Modares "Tehran", Heidelberg "Heidelberg", Pixel Photonics "Münster", Miraex "Ecublens",
NCNST "Beijing", NC State "Raleigh, NC", UChicago "Chicago, IL", IIT Kharagpur "West Bengal", Ottawa / NEXQT
"Ottawa, ON", Huawei Canada "Kanata, ON", Infineon "Villach"). No near-duplicate string created for an existing site
from an identical printed address.

## What was checked

- Structural (script over the staged CSV, run with -I from the session scratchpad): header equals canonical; author
  string equals the papers.csv slot for every row (yeh2026 / zhu2022 "Marko Lončar", bankwitz2026 umlauts, mohl2025
  "Charles Möhl" exact); every papers.csv author has rows except datta2024 Zhou; no duplicate (paper_id,
  author_index, aff_order); aff_order contiguous per author; kind primary at 1, additional / present_address at >= 2
  (150 primary, 35 additional, 2 present_address); every org_name exists in `data/organizations.csv` or the staged
  file; source paper 186, crossref 1; batch list equals the staged paper set; none of the 20 papers already has
  canonical rows.
- Content: read the printed affiliation block of every paper in text.md (byline markers for 15 papers; IEEE first-page
  footnotes for behzadfar2026, chaudhury2024, saxena2023, shawon2024; anjali2025 single affiliation line), checked
  every marker against every row (author, aff_order, kind, org, unit, locality, country). Equal-contribution (wu2022
  none; zhu2022 dagger; mohl2025 asterisk; lin2026b "a)"; tian2026 "#"; datta2020 asterisk), corresponding and e-mail
  markers (wu2022 7, 8; khalil2026, yeh2026, axline2026, thureja2025, tian2026 asterisks; anjali2025 2, 3 are e-mail
  markers) correctly excluded. mohl2025 text.md needed `grep -a` (binary-flagged) to find the p.1 footnotes.
- crossref.json compared where present: wu2022 (identical per author), lin2026b (identical), thureja2025, shawon2024,
  chaudhury2024, shabaninezhad2025 (NEXQT and Huawei agree), datta2024 (Chae NTU agrees; Zhou empty), mohl2025 (IBM
  only; ROR equals org row), yeh2026 (Harvard only, no present address; print wins), bankwitz2026 / zhu2022 /
  datta2020 / taki2024 (no affiliations).
- Org rows and `data/org_sites.csv` for every org used; canonical precedents renaud2023 (IMRE), holzgrafe2020 /
  kharel2021 (HyperLight), murai2025 (prefecture-only locality), zwickel2020 / schwarzenberger2026a (no city
  printed), wolf2018a (Muenster print).
- Not run: `scripts/merge_affiliations.py` dry run (the auditor's invocation was refused by the permission system;
  the extractor reported problems 0, and the structural checks above cover its checks). No page renders (markers
  legible in text.md for all 20 papers). No network, no git. This report is the only file written in the repo.
