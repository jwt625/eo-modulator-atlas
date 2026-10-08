# geo_08 + geo_09 affiliation audit (Claude, fresh context, read-only, 2026-10-07)

Scope: `data/_staging/geo_08/` (14 papers, 172 rows) and `data/_staging/geo_09/` (14 papers, 195 rows), against
`references/<id>/text.md`, `data/papers.csv`, `data/organizations.csv`, `data/author_affiliations.csv` (1723 rows).
Brief: `data/_staging/ingest_2026_10_07/GEO_AUDIT_PROMPT.md` (and `GEO_EXTRACT_PROMPT.md`).

Result: 0 blocking, 0 metadata, 3 minor, 4 observations. Both batches are mergeable as staged; the minor items are
optional wording/consistency fixes.

## Per-paper results

| batch | paper | authors / with rows | result |
|---|---|---|---|
| geo_08 | bao2026a | 7/7 | pass (O3) |
| geo_08 | chen2023 | 7/7 | pass |
| geo_08 | eltes2023 | 8/8 | pass |
| geo_08 | huang2026 | 7/7 | pass |
| geo_08 | kohli2023 | 14/14 | pass |
| geo_08 | liu2026a | 9/9 | pass |
| geo_08 | oe2026 | 12/12 | pass |
| geo_08 | patel2026 | 1/1 | pass |
| geo_08 | schwarzenberger2026a | 19/19 | pass |
| geo_08 | starnault2026 | 10/10 | pass |
| geo_08 | theurer2026 | 9/9 | pass |
| geo_08 | weckenmann2026 | 9/9 | pass (m2) |
| geo_08 | yamaguchi2026 | 12/12 | pass |
| geo_08 | zhang2026a | 20/20 | pass |
| geo_09 | bao2026b | 8/8 | pass |
| geo_09 | chen2025 | 9/9 | pass |
| geo_09 | gong2026 | 19/19 | pass |
| geo_09 | hulyal2026 | 7/7 | pass |
| geo_09 | kotz2026 | 16/16 | pass |
| geo_09 | liu2026c | 7/7 | pass |
| geo_09 | ogiso2020 | 15/15 | pass (O1) |
| geo_09 | qiu2026a | 10/10 | pass |
| geo_09 | shen2025 | 14/14 | pass |
| geo_09 | su2026 | 4/4 | pass (m1) |
| geo_09 | tiberi2026 | 7/7 | pass |
| geo_09 | xu2026a | 4/4 | pass |
| geo_09 | yang2022 | 7/7 | pass |
| geo_09 | zhang2026b | 12/12 | pass |

No missing rows: every papers.csv author of all 28 papers has at least one row, and every printed affiliation
(including second units, present addresses, and later-page footnotes) is represented. No new organizations staged
(both `organizations.csv` files header-only), and none needed: every org_name exists in `data/organizations.csv`.

## Findings

| id | severity | paper / author | evidence (locator) | fix |
|---|---|---|---|---|
| m1 | minor | su2026, all 4 authors, aff_order 1 | Printed "Key Laboratory of Optoelectronic Technology & Systems Ministry of Education, Chongqing University" (text.md p.1 line 1 of affiliations, no parentheses); staged unit "Key Laboratory of Optoelectronic Technology & Systems (Ministry of Education)". REPORT says "as printed (parentheses differ)", which is not what the rows hold. | Acceptable as harmonization with chen2025's printed "(Ministry of Education)" for the same unit (see ruling 3); optionally add note "parentheses as in chen2025" or revert to printed form. No data change required. |
| m2 | minor | weckenmann2026, all 9 authors | Unit "Center for optics, photonics and lasers (COPL); Department of Electrical and Computer Engineering" vs canonical geravand2025 for the same Université Laval units: "Department of Electrical and Computer Engineering, Centre d'optique, photonique et laser (COPL)". Different order, separator, and COPL spelling (each as printed in its own paper). | None required (each follows its print). Note for a later unit-normalization pass only. |
| m3 | minor | geo_09 REPORT.md | Says kotz2026/hulyal2026 abbreviated units were expanded; hulyal2026 prints full unit names (text.md p.1: "Institute of Physics", "Institute of Electrical and Micro engineering", "Institute of Photonics and Quantum Electronics (IPQ)"); only kotz2026 was expanded. Rows are correct. | Report wording only. |
| O1 | observation | ogiso2020, Nakamura (13), Kobayashi (14), Miyamoto (6) | NTT Network Innovation Laboratories printed "Atsugi 239-0847, Japan" (text.md p.1 footnote). Postal code 239-xxxx is the Yokosuka area (NTT Yokosuka R&D Center, Hikarinooka), not Atsugi (243-xxxx); this is outside-the-paper knowledge, unverified here (no network). | Keep locality "Atsugi" (as printed rule). At geocoding, place this unit by org/postal code or add a site override; do not trust the city string. |
| O2 | observation | weckenmann2026 | Locality "Québec" (printed "Université Laval, Québec, Canada") is ambiguous between city and province. | Geocoder settlement-only lookup should give Quebec City; check in the site review. |
| O3 | observation | bao2026a vs bao2026b | Same XIOPM lab printed "The State Key Laboratory of Ultrafast Optical Science and Technology" (bao2026a) and without "The" (bao2026b); staged as printed. Canonical precedent gao2024 keeps a printed leading "The". | None; unit-normalization pass may drop a leading article. |
| O4 | observation | schwarzenberger2026a, Koos (19) IMT row | Printed "IPQ and the IMT, both KIT, and with SilOriX GmbH, all 76131 Karlsruhe" gives IMT locality Karlsruhe, while Kholeif/Kuzmin IMT rows in the same footnote print "76344 Eggenstein-Leopoldshafen". | None (as printed; identical split exists in canonical schwarzenberger2026 and kotz2026 prints IMT at 76131 Karlsruhe). Geocoding by locality will produce two IMT sites. |

## Rulings on the REPORT.md judgment calls

### geo_08

1. schwarzenberger2026a prose footnote (text.md p.1 lines 64-121): upheld in full.
   - Marker-to-author assignment by name sentence verified for all 19 authors and 29 rows.
   - IPQ-only authors (Schwarzenberger, Kotz, Fang, Sherifaj, Randel, Freude) get empty locality: correct. Their
     sentence prints "Institute of Photonics and Quantum Electronics (IPQ), Karlsruhe Institute of Technology (KIT)"
     with no city; "Karlsruhe" inside the org name is not a printed locality. Precedent zwickel2020 ("no city
     printed"). Do not back-fill from other sentences or from schwarzenberger2026 (that paper prints the city).
   - Other authors use the city in their own sentence: verified (IMT and IBCS-FMS Eggenstein-Leopoldshafen; IOC, LEM,
     SilOriX, IPQ Karlsruhe). Koos IMT "Karlsruhe" is as printed (O4).
   - Grünewald: "was with LEM ... He now is with ... University Freiburg" -> LEM primary + University of Freiburg
     present_address: correct, identical to canonical schwarzenberger2026. Org mapping "University Freiburg" ->
     "University of Freiburg" correct (org notes record the printed form).
   - Employee / co-founder / former-employee statements (lines 115-121) are not affiliations: correctly no rows.
   - IBCS-FMS unit with hyphen for the printed en dash: matches canonical string; accepted.
2. weckenmann2026 one row with units joined by "; ": upheld (see ruling A). Unit expansion "ECE Department" ->
   "Department of Electrical and Computer Engineering" allowed (ruling B); the result equals the canonical Laval
   unit wording in geravand2025.
3. huang2026 one unit string per marker ("State Key Laboratory ..., School of Integrated Circuit"): upheld; printed
   comma kept; two markers of SJTU for L. Wang -> two rows (correct per "several printed affiliations = several
   rows").
4. chen2023: second SCNU clause ("; and National Center for International Research on Green Optoelectronics, South
   China Normal University") as an additional row: correct, it is a separately printed affiliation. Dropping the
   building string "Sci, Bldg. No.5, ... Higher-Education Mega-Center" from the unit: correct (address, not a unit);
   resulting unit equals canonical guo2026/wang2025/wu2025 wording. Liu Liu's Jiaxing clause kept as a Zhejiang
   University unit (not the existing "Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging" org row):
   accepted, same printed structure as guo2026 (lab printed inside the ZJU Jiaxing Research Institute line); the
   separate org row is only used where the lab is printed as its own numbered affiliation (liu2023). Coordinator
   decision from the geo_03 audit O1 stands.
5. Mappings: Ligentec SA -> LIGENTEC, Lumiphase AG -> Lumiphase, SilOriX GmbH -> SilOriX, Technical University
   Berlin -> Technische Universität Berlin, HyperLight Corporation -> HyperLight: all correct (each org row records
   the 2026-10-05 rename to the org's own preferred name). Fraunhofer Heinrich-Hertz-Institute -> Fraunhofer
   Heinrich Hertz Institute: correct (gupta2023, tran2026 precedent). TU Berlin and HHI are distinct institutions;
   kept as two rows for Freund and Schell (markers 1,2): correct, no merge.
6. yamaguchi2026 "city, prefecture" localities: upheld; each is printed ("Koganei, Tokyo", "Funabashi, Chiba",
   "Nagoya, Aichi", "Okubo, Shinjuku, Tokyo" -> "Shinjuku, Tokyo" drops only the sub-district). Matches canonical
   Japanese style ("Meguro-ku, Tokyo", "Atsugi, Kanagawa").
7. Accents (Québec, Montréal, Stäfa): allowed (ruling C). Verified on rendered PDF page 1 for weckenmann2026
   ("Université Laval, Québec, Canada") and qiu2026a ("8712 Stäfa"); eltes2023 text.md already reads "Montréal"
   and "Stäfa" ungarbled.
8. kind: first marker primary, later additional, present address present_address: verified for all 367 rows (only
   non-additional aff_order >= 2 rows are schwarzenberger2026a Grünewald and tiberi2026 Tiberi, both
   present_address).

### geo_09

- tiberi2026 "*Now at CamGraPhIC srl" -> present_address aff_order 2: upheld (eltes2020 precedent); Romagnoli's own
  marker 3 CamGraPhIC primary is separate and correct.
- chen2025 HUST "Wuhan National Laboratory for Optoelectronics and School of Optical and Electronic Information" one
  row, "; " joined: upheld (li2026aa precedent, same institution and same wording). CUMEC: printed "Chongqing United
  Microelectronics Center (CUMEC), No.20 Xiyuannan Road, Chongqing 401332" -> existing "Chongqing United
  Microelectronics Center Co., Ltd": correct, same entity (wu2025 precedent); no new org.
- ogiso2020 "Nippon Telegraph and Telephone Corporation" -> "NTT, Inc.": correct; the org row states it was formerly
  listed as "Nippon Telegraph and Telephone Corporation" and renamed 2026-10-05 to its own preferred name (ogiso2016
  uses the same row). Not to be confused with the distinct rows "NTT Innovative Devices Corporation" and "NTT
  Research, Inc.". Locality "Atsugi" as printed (canonical ogiso2016 "Atsugi, Kanagawa" reflects that paper's
  print); see O1 for the Network Innovation Laboratories postal code. Units "NTT Device Innovation Center", "NTT
  Device Technology Laboratories", "NTT Network Innovation Laboratories" as printed.
- ogiso2020 author_index: correct. papers.csv order (Ogiso; Hashizume; Tanobe; Nunoya; Ida; Miyamoto; Ishikawa;
  Ozaki; Ueda; Wakita; Nagatani; Yamazaki; Nakamura; Kobayashi; Kanazawa) equals the Crossref author order in
  `references/ogiso2020/crossref.json`, which differs from the printed byline (Ogiso, Ozaki, Ueda, Wakita, ...). The
  brief defines author_index as the papers.csv position, and papers.csv follows Crossref by the 2026-10-05 standing
  rule, so indices must follow papers.csv, not the byline. Every one of the 15 name-to-unit assignments was checked
  against the three footnote sentences (8 Device Innovation Center, 4 Device Technology Laboratories, 3 Network
  Innovation Laboratories): all correct. No change to papers.csv is in scope.
- Unit wording expansions (shen2025 "State Key Lab" -> "State Key Laboratory", kotz2026 "Inst. of Photon. and
  Quantum Electron. (IPQ)" -> "Institute of Photonics and Quantum Electronics (IPQ)", IMT and IBCS-FMS likewise):
  allowed (ruling B); each expanded string equals an existing canonical unit string for the same org (zhang2023 for
  SJTU; kieninger2020/ummethala2021/schwarzenberger2026 for KIT). chen2025/su2026 Chongqing units: see m1.
- qiu2026a "Stäfa" from garbled "St¨afa": allowed (ruling C), verified on the rendered page.
- hulyal2026 printed "Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences" ->
  existing "Shanghai Institute of Microsystem and Information Technology": correct (CAS is the parent printed after
  the institute; cai2025 uses the same row and unit "State Key Laboratory of Materials for Integrated Circuits").
  "Swiss Federal Institute of Technology, Lausanne (EPFL)" -> existing "EPFL": correct (row notes the former long
  name).

### General rulings

A. One row per marker vs one row per unit. Established canonical practice in `data/author_affiliations.csv`: one row
   per printed affiliation (marker, numbered line, or footnote clause) per author; all department/lab units printed
   inside that one affiliation stay in one unit string; never one row per unit within a single printed affiliation.
   Separately printed affiliations of the same institution are separate rows (canonical liu2023, guo2026; staged
   chen2025, su2026, yang2022, huang2026, chen2023). Separator inside the unit string is not uniform in canonical:
   ", " (the printed comma) in 44 papers, "; " in 7 papers (li2025a, li2026aa, li2022b, hou2024, li2025b,
   holzgrafe2020, sia2022), typically where the print joins units with "and" or line breaks. Both staged usages
   (", " kept where printed; "; " for a printed "and" in weckenmann2026 and chen2025) conform. A single separator
   could be chosen in a later normalization pass; not a defect here.
B. Unit-name expansion of printed abbreviations. Allowed when it is a mechanical expansion of a standard abbreviation
   (Dept., Inst., Lab, ECE, Photon., Electron., Technol.) and the result equals a unit string already used for the
   same org (canonical) or printed in full elsewhere in the same paper; parenthesized acronyms as printed (IPQ, IMT,
   IBCS-FMS, COPL) are kept. Canonical precedent: tanaka2026 "Dept." -> "Department", zhang2023 "State Key Lab" ->
   "State Key Laboratory", schwarzenberger2026 en dash -> hyphen. This serves the deduplication goal (2026-10-05
   standing rule) without inventing content. Not allowed: translating, reordering into a different unit, or
   supplying a unit name that is printed nowhere. The canonical counterexample wang2022a ("Optical R&D Dept.", "B&P
   Lab.") is also acceptable (as printed); expansion is permitted, not required. All expansions in geo_08/09
   (starnault2026, qiu2026a "Dept."; weckenmann2026 "ECE Department"; shen2025; kotz2026) meet the condition.
C. Accent restoration. Allowed and required where text.md shows a pymupdf split diacritic ("Qu´ebec", "Universit´e",
   "St¨afa", "Vall´ee"): the printed PDF carries the accented letter, so restoring it is reading the print, not
   normalizing. Not allowed: adding accents the print lacks (starnault2026, zhang2026a, qiu2026a print "Montreal",
   staged "Montreal": correct) or stripping printed ones (kohli2023 "Zürich" as printed). Spelling variants
   ("Montréal, QC" vs "Montreal, QC"; "Zürich" vs "Zurich") become separate sites with near-identical points
   per DevLog-018; acceptable.

## What was checked

- Structural (script over both CSVs): header equals canonical; author string equals the papers.csv slot for every
  row; every papers.csv author has rows; no duplicate (paper_id, author_index, aff_order); aff_order contiguous 1..n
  per author; kind = primary at aff_order 1, additional at >= 2 except the two present_address rows; every org_name
  exists in `data/organizations.csv`; all countries ISO alpha-2 and consistent with the printed address; source =
  paper for all 367 rows.
- Content: read the printed affiliation block (byline markers, first-page footnotes, Wiley author-details block for
  chen2025/shen2025/chen2023) in every text.md; checked each marker or name sentence against every row (author,
  aff_order, unit, locality, country); checked org mappings and canonical precedents for LIGENTEC, Lumiphase,
  SilOriX, HyperLight, Ciena, Fraunhofer HHI, TU Berlin, NTT, CUMEC, SIMIT, EPFL, CNIT, CamGraPhIC, Wuhan ANPI, IME,
  NSTIC, Polaris, University of Freiburg, Jiaxing lab; checked `crossref.json` author order for ogiso2020.
- Rendered page 1 (top) of weckenmann2026 and qiu2026a from source.pdf into the session scratchpad to confirm
  diacritics; renders deleted afterwards.
- Not run: `scripts/merge_affiliations.py` dry run (reported by the extractor as 0 problems for both batches); no
  network, no git; this report is the only file written.
