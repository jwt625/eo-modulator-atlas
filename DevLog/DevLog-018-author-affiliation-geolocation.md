---
title: Per-author affiliations and institution coordinates for a clustered map
date: 2026-10-04
status: ready_for_review
owner: claude-geo-2026-10-04
---

# DevLog-018: author-level geolocation

User request (2026-10-04): locate affiliations as exactly as possible, include all authors
(one paper can contribute several pins and counts), and split/lump pins as the user zooms.
User decisions (2026-10-04): coordinates from Wikidata (P625, ID stored) with OSM Nominatim as
fallback, rate-limited to 1 request/s with a tiny pilot first; basemap = vendored country outlines
(no external tiles).

## New tables

`data/author_affiliations.csv` (one row per author x printed affiliation):
paper_id, author_index (1-based position in papers.csv `authors`), author (exact string at that
position), aff_order (1-based order of this author's affiliations), kind (primary | additional |
present_address), org_name (exists in organizations.csv), unit (department/lab as printed,
optional), locality (city as printed, e.g. "Cambridge, MA"), country (ISO alpha-2), source
(paper | crossref), locator, note.

`data/org_sites.csv` (one row per org x locality): site_id, org_name, locality, country, lat, lon,
precision (building | campus | city), source (wikidata | nominatim), source_ref (Q-id or
osm type/id), source_label, verified_on, notes.

A pin = (paper, author, site). "Papers" mode dedupes to (paper, site).

## Plan

1. Regenerate missing local extracts (23 papers; done, tracked source.json restored).
2. Extraction: 5 Sonnet subagents (geo_01..geo_05, 27 papers each) read the affiliation block
   (superscripts, footnotes) of each paper; staging only. boynton2020, li2026a, qiu2026 have no
   cached text or per-author Crossref affiliations: no rows (gap recorded). xu2022: Crossref
   affiliations for 8 of 14 authors.
3. Opus audit per batch (fresh context, every paper), Sonnet corrections, coordinator checks.
4. Geocoding (coordinator, one serialized script, 1 req/s, pilot first): Wikidata search + P625,
   country check; Nominatim fallback on "org, locality, country". Opus review of every site
   (label/description vs affiliation, precision) without network.
5. Validator + build_views support, tests; map panel k switches to `scattermap` with clustering
   over the vendored outlines (GeoJSON converted from the topojson); toggle authors / papers.
6. Checks, screenshots, DevLog results.

## TODO

- [x] Local extracts for 23 papers
- [x] Extraction (5 batches)
- [x] Audit and corrections
- [x] Geocoding pilot, full run, review
- [x] Validator, build_views, tests
- [x] Clustered map panel
- [x] Checks and results

## Progress log

- 2026-10-04: extraction done (5 Sonnet batches): 1714 rows; gaps: xu2022 6/14 authors (Crossref has no affiliation), cai2025 2 authors absent from the cached printed list, prountzou2026 and ulrich2025 one author each absent from arXiv v1, suceava2025 two "S. Sarker" ambiguous; new orgs: Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging, Zurich Instruments AG, Chulalongkorn University.
- 2026-10-04: geocoder written (`scripts/geocode_sites.py`); pilot 3/3 (Stanford Q41506, EPFL Q262760, Peng Cheng Lab via Nominatim); full run on 207 preliminary sites started (cached, resumable).
- 2026-10-04: geo_02 audit: 0 blocking, 0 metadata, 2 minor. geo_05 audit: 0 blocking, 1 metadata (source=text.md instead of paper, batch-wide), 3 minor. Coordinator decisions: normalize source to `paper`; keep the most specific org row as org_name; locality as printed; empty locality allowed (site geocoded from the org name only). Correctors started for geo_02, geo_05.
- 2026-10-04: build_views emits `sites` and per-paper `affil`; validator checks both new tables (optional files); GeoPanel rewritten as clustered `scattermap` over vendored country GeoJSON (`scripts/topojson_to_geojson.py`, antimeridian unwrap, no Antarctica); prototype showed no external requests. Country-centroid table from DevLog-017 removed (superseded by site coordinates).
- 2026-10-04: geo_03 audit: 0 blocking, 0 metadata, 2 minor (Ghent University - imec kept on Ghent; Jiaxing Key Laboratory follows print). geo_01 audit: 0 blocking, 2 metadata (cai2025 two authors: gap, no source; anderson2025 facility row kept under the org rule), 1 minor (Zürich as printed). geo_04 audit: 1 blocking (taghavi2022a arXiv markers transposed vs the paper's own email/Author Contributions and the Crossref version of record), 4 metadata (suceava2025 S. Sarker binding and missing p.2 affiliations; Trassin, Khalil absent from arXiv lists but in Crossref). Decisions: swap taghavi2022a per Crossref with note; add the suceava2025 and Crossref-only rows with source=crossref. Corrections applied for geo_01, geo_02, geo_05; geo_03, geo_04 running.
- 2026-10-04: all 5 batches corrected (dispositions in each `data/_staging/geo_0N/AUDIT_DISPOSITIONS.md`). Merged with `scripts/merge_affiliations.py`: `data/author_affiliations.csv` 1723 rows, 135 papers (no rows: boynton2020, li2026a, qiu2026), 3 new organizations, 212 unique (org, locality) sites; validator 0 errors. Remaining author gaps: xu2022 6 authors and cai2025 2 authors (no affiliation in any cached source).
- 2026-10-04: geocoder patched for HK/MO (Wikidata P17 = CN; Nominatim country codes cn,hk) after City University of Hong Kong came back unresolved; restarted on the final 212-site list (242 cached responses reused).
- 2026-10-04: geocoding complete for 212 sites (log `logs/geocode-final-*.log`): wikidata/campus 120, nominatim/campus 19, nominatim/city 71 (locality-centre fallback), unresolved 2 (Cetus Photonics, Polaris Electro-Optics: no printed city). Opus site review started (identity, location, precision; improved queries for city-level and unresolved sites). Validator tests added for the new tables (6 pass).
- 2026-10-04: Opus site review (`data/_staging/audits/geo_sites-review-claude-audit-2026-10-04.md`): 125 ok, 68 weak, 17 wrong, 2 unresolved. Root causes in the geocoder: free-text city lookup returned province/county/municipality centroids or a wrong state ("University Park, PA" -> Alabama), which broke the 50 km check; first-of-several Wikidata coordinates (SJTU Xuhui vs Minhang); items without P17 dropped (BBN). Fixes: settlement-only city lookup with US state names expanded; nearest Wikidata coordinate to the printed locality; P17-less items accepted only when the distance check runs; precision now building | campus | postcode | city from the OSM result type (validator enum extended). Reviewer queries (87; 85 non-empty) applied as overrides; the CNIT street address recalled from memory replaced by the printed postcode. Refinement run started on all 212 sites.
- 2026-10-04: provisional app check with the first geocode pass: clusters lump at world zoom (Europe 557, East Asia 542 author pins) and split at Europe and Boston zoom (Harvard 58 vs MIT); site hover lists institution, locality, precision, source id, author and paper counts, materials, papers; no external requests.
- 2026-10-04: refinement pass (log `logs/geocode-refine-*.log`): wikidata/campus 129, nominatim/campus 31, building 12, postcode 7, city 32, unresolved 1 (Cetus Photonics: no city or address printed anywhere). 52 sites changed > 1 km or resolved (Penn State Alabama -> University Park; KIT, SJTU Minhang, Zhejiang University Jiaxing/Taizhou institutes, Pisa postcodes, Santa Clara/Sunnyvale/Hillsboro addresses). Known bad: Optics Valley Laboratory matched a hotel. Fresh Opus recheck of all changed sites started.
- 2026-10-04: fresh Opus recheck of the refinement (`geo_sites-recheck-claude-audit-2026-10-04.md`): 199 accepted, 7 fallback-city, 6 unresolved; found that a Nominatim override still lost to the name-based Wikidata search (10 overrides never ran). Fix: an override without a Wikidata override skips Wikidata; override hits get a 100 km tolerance (prefecture/province localities). Re-run of 7 sites resolved Kyushu (Chikushi), Tokai (Shonan), Aizu, KIT Campus South; Hefei National Laboratory and Lumiphase fall back to the city; CUMEC uses the cached Shapingba district centre (the municipality centroid was rejected). Coordinator edits recorded in the site notes: Optics Valley Laboratory and Zhangjiang Laboratory -> locality centre; SJTU Shanghai -> Minhang point (printed 200240); IIT Pisa -> NEST point; Lightmatter relabelled city; Nokia Sunnyvale, Flux Photonics -> building; Intel Hillsboro -> campus; Cetus Photonics unresolved (no pin; validator and build_views accept `unresolved` with empty coordinates).
- 2026-10-04: app: clustered map verified (world lumps, Asia/Europe/Boston zoom splits), unit toggle keeps the view (`uirevision`), transparent hover layer (opacity 0) still hoverable, attribution line "Sites: Wikidata, (c) OpenStreetMap contributors", light/dark, 390 px; no external requests. Checks: validator 0 errors; build_views 0 warnings; 30 Python tests; 30 app tests; svelte-check 0 errors; smoke 15/15. Raw response cache (43 MB) git-ignored (`data/_staging/geo_cache/`).

## Results

| Item | Value |
|---|---|
| author_affiliations.csv | 1723 rows, 135 papers (source paper 1695 / crossref 28) |
| org_sites.csv | 212 sites: campus 160, building 12, postcode 7, city 32, unresolved 1; source wikidata 124, nominatim 87 |
| Affiliation rows by site precision | campus 1504, building 63, postcode 17, city 138, unresolved 1 |
| Pins (default filters) | 1524 author pins, 325 paper-institution pins, 126/128 papers located |

## Gaps and limits

- No affiliation rows: boynton2020, li2026a, qiu2026 (no cached text, no Crossref affiliations); xu2022 6/14 and cai2025 2 authors (no source states them).
- City-level sites (32) are institutions without a usable coordinate (mostly companies/institutes without Wikidata P625 or OSM object); the pin is the printed locality centre.
- Locality is kept as printed; spelling variants of one city (Gent/Ghent, Stanford/Stanford, CA) are separate sites with near-identical points.
- Coordinates come from Wikidata (CC0) and OpenStreetMap via Nominatim (ODbL; attribution shown on the map). Query strings proposed by reviewers were search inputs only; every accepted hit is stored with its source label and distance note.
- The outline basemap has no streets or city labels at high zoom (user choice: no external tiles).

