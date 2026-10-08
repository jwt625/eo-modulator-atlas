# geo_06 + geo_07 per-author affiliation audit (Claude, fresh context, 2026-10-07)

Brief: `data/_staging/ingest_2026_10_07/GEO_AUDIT_PROMPT.md` (extraction rules in `GEO_EXTRACT_PROMPT.md`).
Scope: geo_06 (15 papers, 200 rows) and geo_07 (14 papers, 172 rows); both `organizations.csv` header-only.
Read-only; this report is the only file written.

Result: 1 blocking, 2 metadata, 1 minor.

## Per-paper results

| batch | paper | authors (papers.csv / rows) | result |
|---|---|---|---|
| geo_06 | aihara2026 | 7 / 7 | pass (M1 locality form) |
| geo_06 | boynton2020 | 12 / 12 | pass |
| geo_06 | deng2026a | 15 / 15 | pass |
| geo_06 | hillier2025 | 9 / 9 | pass |
| geo_06 | kawahara2026 | 7 / 7 | pass |
| geo_06 | li2026b | 14 / 14 | pass |
| geo_06 | mao2022 | 4 / 4 | pass |
| geo_06 | okuda2026 | 15 / 15 | pass |
| geo_06 | schwarzenberger2023 | 13 / 13 | pass (m1 unit string) |
| geo_06 | singer2025 | 16 / 16 | pass |
| geo_06 | taghavi2026a | 5 / 5 | pass |
| geo_06 | valdez2026 | 9 / 9 | pass |
| geo_06 | xue2023 | 11 / 11 | pass |
| geo_06 | yin2026 | 16 / 16 | pass |
| geo_06 | zhou2026 | 7 / 7 | pass |
| geo_07 | aimone2026 | 10 / 10 | pass |
| geo_07 | cai2026 | 7 / 7 | pass |
| geo_07 | eltes2020 | 12 / 12 | **B1** (Pascal Stark marker) |
| geo_07 | horst2025 | 17 / 17 | pass |
| geo_07 | kholeif2026 | 10 / 10 | pass |
| geo_07 | lin2026 | 7 / 7 | pass |
| geo_07 | murai2025 | 6 / 6 | pass |
| geo_07 | pan2021 | 9 / 9 | pass |
| geo_07 | schwarzenberger2023a | 12 / 12 | pass (m1 unit string) |
| geo_07 | sobu2026 | 3 / 3 | pass (M2 locality form) |
| geo_07 | tatarczak2026 | 5 / 5 | pass |
| geo_07 | wang2022 | 11 / 11 | pass |
| geo_07 | xue2026 | 13 / 13 | pass |
| geo_07 | yu2026 | 15 / 15 | pass |

No author without a printed affiliation in either batch; no missing printed affiliation except B1's wrong one.

## Findings

| id | severity | paper / author | evidence (locator) | fix |
|---|---|---|---|---|
| B1 | blocking | eltes2020, author 7 Pascal Stark | `references/eltes2020/source.pdf` p.1 byline: "Andy Hart^2, Pascal Stark^1, Graham D. Marshall^2" (superscript span flags checked with PyMuPDF and on a 150 dpi render). Marker 1 = "IBM Research - Zurich, Rüschlikon, Switzerland". Staged row: University of Bristol / QET Labs; H. H. Wills / Bristol / GB. The byline is image-level text absent from text.md; the extractor's rendered reading slipped here (REPORT lists the IBM group as Caimi, Siegwart, Eltes, Fompeyrine, Abel, omitting Stark). | (eltes2020, 7, Pascal Stark, 1, primary): org_name `IBM Research - Zurich`, unit empty, locality `Rüschlikon`, country `CH`, source paper, locator `p.1 affiliations`, note "byline marker 1 (rendered p.1)". Update REPORT: IBM group = Eltes, Caimi, Siegwart, Stark, Fompeyrine, Abel (6); Bristol = 6. |
| M1 | metadata | aihara2026, all 13 NTT, Inc. rows | Printed "3-1, Morinosato Wakamiya, Atsugi-shi, Kanagawa" (text.md p.1). The canonical table coded the identical printed address (ogiso2016: "Atsugi-shi, Kanagawa Pref.") as `Atsugi, Kanagawa`, and org_sites.csv already holds that site. `Atsugi-shi, Kanagawa` creates a second, ungeocoded site for the same campus and splits its map counts. | locality `Atsugi, Kanagawa` on all 13 rows (reuses the existing site). |
| M2 | metadata | sobu2026, 3 1Finity rows | Printed "4-1-1 Kamikodanaka, Nakahara-ku, Kawasaki-shi, Kanagawa" (text.md p.1). tanaka2026 prints the identical address and is coded `Kawasaki, Kanagawa` (existing site in org_sites.csv, geocoded). | locality `Kawasaki, Kanagawa` on all 3 rows. |
| m1 | minor | schwarzenberger2023 (geo_06, 7 KIT rows) and schwarzenberger2023a (geo_07, 9 KIT rows) | Both print one marker "(IPQ)/(IMT)" for KIT. geo_06 keeps the abbreviated string "Inst. of Photonics and Quantum Electron. (IPQ)/Inst. of Microstruct. Technol. (IMT)"; geo_07 keeps "Institute of ... (IPQ)/Institute of ... (IMT)"; kholeif2026 in the same batch expands abbreviations and joins two units of one marker with "; ". One row per marker is correct in all three (see ruling R1). | Optional, for consistency: unit `Institute of Photonics and Quantum Electronics (IPQ); Institute of Microstructure Technology (IMT)` on the 16 rows. No map impact. |

## Rulings on the REPORT.md judgment calls

R1. One row per marker printing several units of one institution vs one row per unit. Established canonical practice
(`data/author_affiliations.csv`): one row per printed affiliation entry (marker). 47 canonical rows in 7 papers carry
several units of one marker joined by "; " (holzgrafe2020, hou2024, li2022b, li2025a, li2025b, li2026aa, sia2022),
and many more keep a printed comma-separated unit string in one row (e.g. Zhejiang University "State Key Laboratory
for Modern Optical Instrumentation, Center for Optical & Electromagnetic Research, ..."). Units of one institution
under separate markers are separate rows (135 canonical author cases, e.g. zwickel2020 IPQ marker 1 / IMT marker 2,
multani2025). No canonical paper splits one marker into several rows. The brief's "several units ... = several rows"
refers to separate markers. Both batches follow this: geo_06 mao2022 (Kyushu markers 1 and 2: two rows), xue2023
(Rochester 1 and 3), taghavi2026a (UBC 1 and 2), singer2025 (KIT IPQ/IMT/IHE/IOC/IBCS-FMS separate markers: separate
rows), aihara2026 (NTT 1 and 2); geo_07 eltes2020 Bristol marker 2 and kholeif2026 marker 3 kept as one row each,
schwarzenberger2023a and schwarzenberger2023 "IPQ/IMT" one row. Accepted; separator consistency is m1 only.

R2. singer2025 marker 7 (IBCS-FMS) -> Karlsruhe Institute of Technology. Accepted. IBCS-FMS is a KIT institute: the
same unit is printed with "KIT" in kholeif2026 p.1 ("... (IBCS-FMS), KIT, 76131, Karlsruhe") and schwarzenberger2026
p.1, and canonical schwarzenberger2026 rows map it to KIT. The printed address (Kaiserstr. 12, 76131 Karlsruhe) is
KIT's; locality Karlsruhe as printed is correct (schwarzenberger2026 prints Eggenstein-Leopoldshafen for the same unit;
both are as printed). Row note is adequate.

R3. singer2025 IMT at Eggenstein-Leopoldshafen: correct (printed 76344 Eggenstein-Leopoldshafen; canonical kieninger2020
and ummethala2021 precedent). kholeif2026 IMT at Karlsruhe: also as printed (76131 Karlsruhe).

R4. Empty localities. Accepted where no city is printed, per the DevLog-018 coordinator decision (empty locality allowed,
site geocoded from the org name):
- schwarzenberger2023 KIT (only "Germany" printed): canonical zwickel2020 precedent; the (KIT, "", DE) site exists.
- li2026b Osadchuk, University of Copenhagen ("Karen Blixens Plads 8, 2300, Denmark"; 2300 is a postcode, no city).
- singer2025 Dagher, MultiLane Inc. ("Houmal Technology Park, Lebanon": a site name, not a city line). New site
  (MultiLane Inc., "", LB) will need a name-only geocode.

R5. Prefecture as locality. Accepted:
- mao2022 The University of Aizu "Fukushima" (printed "Fukushima 965-8580"): identical to canonical lu2020; the site
  already exists and is geocoded to the Aizu campus.
- murai2025 AIST "Ibaraki" (printed "Ibaraki 305-8569"): precedent Aizu/Fukushima and Tokai University/Kanagawa; the
  geocoder's 100 km override tolerance for prefecture localities (DevLog-018) covers it. New site (AIST, Ibaraki, JP).

R6. Org mappings:
- Hefei National Laboratory -> `Hefei Laboratory`: accepted (organizations.csv row renamed 2026-10-05 from "Hefei
  National Laboratory" to its own preferred name, DevLog-020 rule 9; xue2026 rows carry the printed form in the note).
- aimone2026 Nokia Bell Labs Stuttgart -> `Nokia Bell Labs`, country DE, locality Stuttgart: accepted. One org row per
  organization with sites per (org, locality); row country follows the printed address (DevLog-020: countries from the
  printed affiliation; canonical precedent Dream Photonics org CA with a US row "Woodinville, WA"; geo_06 zhou2026
  Ligent Qingdao rows CN under a US org). New site (Nokia Bell Labs, Stuttgart, DE).
- aimone2026 New Providence, NJ: as printed (the Bell Labs campus at 600 Mountain Ave is printed Murray Hill elsewhere);
  separate site by the as-printed rule. Accepted.
- lin2026 "National Institutes of Applied Research Taiwan Semiconductor Research Institute" -> `Taiwan Semiconductor
  Research Institute` (parent NIAR): most specific existing row. Accepted.
- eltes2020 "Lumiphase AG" -> `Lumiphase` (renamed 2026-10-05): accepted; present_address at aff_order 2 per the
  canonical kind rule.
- pan2021 ZJU Ningbo Research Institute as a unit of Zhejiang University: accepted (canonical liu2023 precedent; no
  org row).
- valdez2026 "LIGENTEC SA" -> `LIGENTEC`; taghavi2026a "Polaris Electro-Optics" -> `Polaris Electro-Optics, Inc.`;
  Dream Photonics at a UBC address -> `Dream Photonics`; hillier2025 SMART Photonics; li2026b Keysight Technologies
  Deutschland GmbH (own row, parent Keysight Technologies): all correct.

R7. Localities with "-shi"/ward forms: see M1, M2. Rule applied: when the printed address is identical to one already
coded canonically, reuse the canonical locality string; when the print differs (kawahara2026 PETRA "Tokyo" vs
canonical "Bunkyo-ku, Tokyo"; murai2025 AIST "Ibaraki"; horst2025 ETH "Zürich"), keep as printed. PETRA "Bunkyo-ku,
Tokyo" (sobu2026) matches canonical exactly.

R8. Markers: li2026b Schatz only marker 2 (RISE) confirmed in the PDF byline; taghavi2026a Jaeger "1," = marker 1 only
(trailing comma); yu2026 "Yu^{1, 2}*" = 1 and 2, Su "^{1,} *" = 1 only; equal-contribution (deng2026a "+", cai2026 "#",
singer2025 and xue2026 dagger, kholeif2026 dagger), corresponding and e-mail markers (singer2025 8, pan2021 4-5,
xue2026 6-7) correctly excluded.

R9. kind: geo_06 after the coordinator change: aff_order 1 primary 160, aff_order 2-3 additional 40; geo_07: primary 137,
additional 32, present_address 3 (eltes2020 Lumiphase). Matches the canonical rule.

## What was checked

- Every row of both batches against `data/papers.csv` author slots (index and exact string) and the printed byline and
  affiliation block in `references/<id>/text.md`; for all of geo_07 and for hillier2025, singer2025, taghavi2026a,
  xue2023, li2026b additionally against superscript spans extracted from `source.pdf` with PyMuPDF (repo `.venv`, run
  with -I), and a 150 dpi render of eltes2020 p.1 into the session scratchpad (outside the repo).
- wang2022: no byline markers; per-author "AUTHOR INFORMATION" block on p.6 (page marker verified) read for all 11 authors.
- mao2022 locator p.2 verified (p.1 is the cover page).
- org_name against `data/organizations.csv` (exact names, renamed rows, parent rows); country ISO alpha-2 against the
  printed address; locality against the printed city; unit as printed.
- Canonical precedents in `data/author_affiliations.csv` (multi-unit markers, KIT units and localities, empty
  localities, JP localities, row country vs org country) and `data/org_sites.csv` (existing sites; new sites listed:
  geo_06 22, geo_07 13, after M1/M2 fixes 21 and 12).
- `scripts/merge_affiliations.py` dry run per batch: `rows 200, papers 15, new orgs 0, sites 44, problems 0` and
  `rows 172, papers 14, new orgs 0, sites 28, problems 0`; no duplicate keys, all sources `paper`; neither batch's
  papers already present in the canonical table.
- Not checked: crossref.json affiliations (no Crossref fallback used in either batch; print covers every author).
