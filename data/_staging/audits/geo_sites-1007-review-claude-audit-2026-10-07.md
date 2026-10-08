# Geo sites 2026-10-07 batch review (fresh-context audit), 2026-10-07

Input: `data/_staging/geo_sites_1007/geocoded_a.csv` (53 sites) and `geocoded_b.csv` (18 sites), 71 sites in total.
Output: `data/_staging/geo_sites_1007/site_review.csv` (one row per site, in input order; columns org_name, locality, country, verdict, same_as, wikidata_search, nominatim_query, reason).
Context used: `data/author_affiliations.csv`, `data/org_sites.csv`, `data/organizations.csv`, the printed affiliation text in `references/<paper_id>/text.md`, the 170 cached responses from this run in `data/_staging/geo_cache/responses.jsonl` (Wikidata search candidates, Nominatim hits with category, type and addresstype), `scripts/geocode_sites.py`, and the 2026-10-04 review and recheck audits.
No network, no git, and no coordinates proposed. Queries are search inputs only. Every street address in a query is the address printed in the paper (Japanese block addresses in printed romaji form; two Chinese queries are the printed address or park name in Chinese script). Judgments marked "from memory" in the CSV are not verified against a source.

## Counts

| verdict | count |
|---|---|
| ok | 30 |
| weak | 34 |
| wrong | 6 |
| unresolved | 1 |
| total | 71 |

| proposal | weak | wrong | unresolved | total |
|---|---|---|---|---|
| same_as (existing org_sites key) | 4 | 1 | 0 | 5 |
| nominatim_query only | 25 | 5 | 1 | 31 |
| wikidata_search + nominatim_query | 1 | 0 | 0 | 1 |
| keep city | 4 | 0 | 0 | 4 |
| total | 34 | 6 | 1 | 41 |

Input mix: 28 wikidata/campus, 6 nominatim/campus (office or landuse POIs), 36 nominatim/city (locality centre), 1 unresolved.

## Method

1. For each site, listed the affiliation rows that use it and read the printed affiliation lines in each paper's `text.md`.
2. Compared the point with the printed address or postcode, the entity label (Wikidata QID or OSM display name) and the existing `org_sites.csv` rows of the same organization.
3. Read the cached responses for this run to see why each fallback happened (empty search, wrong candidate, or a correct hit rejected by the distance gate).
4. Proposed one fix per non-ok row: `same_as` when an existing key is the same organization at the same site, a printed-address or native-name query when one exists, else keep city.
5. A script checked that the CSV keys match the 71 input keys exactly, that every `same_as` value exists in `org_sites.csv`, and that each non-ok row has at most one proposal type.

## Wrong (6)

| site | problem | proposal |
|---|---|---|
| Chongqing University, Chongqing | Municipality centroid, about 140 km from Shapingba (printed 400044). The correct 重庆大学 hit was rejected by the gate | `重庆大学, 沙坪坝区, 重庆`. Even the 100 km override gate will reject it while the locality centre is the municipality, so re-run with locality `沙坪坝区, 重庆` (as for CUMEC) or accept the hit manually |
| Coherent Corp., Santa Clara, CA | Santa Clara County centroid | printed `5100 Patrick Henry Drive, Santa Clara, CA 95054` |
| Keysight Technologies, Santa Clara, CA | same | printed `5301 Stevens Creek Boulevard, Santa Clara, CA 95051` |
| GlobalFoundries, Santa Clara, CA | same | printed `2600 Great America Way, Santa Clara, CA 95054` |
| Université Laval, Québec | Province centroid (52.48, -71.83), about 640 km off. The correct Laval POI was returned and rejected by the gate | `same_as` `Université Laval\|Quebec City, Quebec` |
| Changchun University, Changchun | Wrong entity: Q17030460 is Changchun University of Technology. The correct Q5071743 has no point | `长春大学, 长春` |

## Special cases flagged by the affiliation audits

- **shen2026 Northeastern University, "Oakland, CA"**: ok. Q638859 (Mills College at Northeastern University) is in Oakland, and the printed ZIP is 94613. It is not placed in Boston.
- **ogiso2020 NTT "Atsugi"**: weak, `same_as` `NTT, Inc.|Atsugi, Kanagawa` (the coordinates are already identical; both are city precision). For the affiliation audit: the Network Innovation Laboratories line prints "Atsugi 239-0847". From memory, 239-0847 is the Yokosuka (Hikarinooka) postcode, so that unit may really be at the Yokosuka R&D center. This is a printed-text issue, not a geocoding one.
- **weckenmann2026 Université Laval "Québec"**: wrong, `same_as` the Quebec City campus row (see above).
- **Nokia Bell Labs "New Providence, NJ"**: ok. Q217365 is identical to the existing Murray Hill row.
- **Nokia Bell Labs "Stuttgart"**: weak, city centre. Query `Nokia, Stuttgart`; accept only a Nokia office POI (from memory it is in Zuffenhausen), else keep city.
- **AIST "Ibaraki"**: ok. Q1076542 is identical to the existing Tsukuba rows. The printed postcode 305-8569 is a Tsukuba postcode (from memory, Tsukuba West), and the "39.1 km" note only reflects the Ibaraki prefecture centroid.
- **MultiLane Inc., Lebanon, no city**: unresolved. Query the printed `Houmal Technology Park` (restricted to LB). If it is empty, keep unresolved and do not guess a city.

## Other notable cases

- **Same-site variants copied (`same_as`)**: NLM Photonics `Seattle` (the first pass found a NE 65th St POI, but the 2026-10-04 recheck put `Seattle, WA` at the printed Mason Road), PETRA `Tokyo` (to Bunkyo-ku Sekiguchi), NOEIC `Wuhan, Hubei` (to `Wuhan`; its Chinese-name query already returned nothing on 2026-10-04).
- **Right entity, wrong part of campus**: IME Singapore (Q30296095 is about 1.4 km from Fusionopolis, printed 2 Fusionopolis Way), Waseda (main campus, but printed 3-4-1 Okubo is Nishi-Waseda), University of Copenhagen (city campus, but printed Karen Blixens Plads 8 is South Campus). Each gets a printed-address query, which skips Wikidata because no `wikidata_search` is set.
- **Historical Wikidata item**: CUST matched Q17499649 "(1951-2000)" rather than the current Q1009991. The point is unverified offline, so it is weak, with query `长春理工大学, 长春`.
- **Ok with a caveat**: Riga TU is the main building, while the photonics institute is on Ķīpsala, about 1.5 km away (from memory). Suzhou Polytechnic University's identity is judged from the label and the Wuzhong postcode only. The NVIDIA Santa Clara "29 km" note is an artefact of the county centroid; the point is the Nvidia HQ landuse polygon.
- **Shared printed buildings**: Genuine Optics and Ligent San Jose both print 2580 North First Street, so they use the same query.
- **SEDI Yokohama**: printed "1, Toya-cho, Sakae-ku". The query `田谷町1, 栄区, 横浜市` already resolved the SEI Yokohama row (osm:relation/3830453). It is a different organization name, so it is a query rather than `same_as`.

## Pipeline findings

1. **Admin-area locality centres are still the main failure.** Four are seen in this batch: Chongqing (municipality), Santa Clara, CA (county), Québec (province) and Ibaraki (prefecture). `featureType=settlement` does not prevent them. Two correct institution hits (Université Laval, Chongqing University) were rejected because of this. Suggested guard: when the settlement hit's `addresstype` is `state`, `province` or `county`, skip the distance gate or treat the locality as unchecked.
2. **The override gate (100 km) does not rescue Chongqing**, because the centroid is about 140 km from Shapingba. A per-site locality override, or the guard in 1, is needed.
3. **Company names with legal suffixes ("Inc.", "Co., Ltd.", "Corporation", "GmbH") return nothing in Nominatim free text.** This affected 20+ companies in this batch. Printed street addresses work better. Of the 32 Nominatim queries proposed here, 22 are printed addresses or printed place names; the other 10 are the organization's native or short name.
