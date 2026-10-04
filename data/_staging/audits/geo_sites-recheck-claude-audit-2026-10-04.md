# Geo sites recheck (fresh-context audit), 2026-10-04

Inputs: `data/_staging/geo_sites/org_sites_geocoded.csv` (first pass), `data/_staging/geo_sites/org_sites_refined.csv` (refined pass), `data/_staging/geo_sites/sites_refine.csv` (override queries), `data/_staging/audits/geo_sites-review-claude-audit-2026-10-04.md` (previous review), `data/_staging/geo_cache/responses.jsonl` (raw Nominatim/Wikidata responses, for category/type/name/bbox of each hit), `scripts/geocode_sites.py`, `data/author_affiliations.csv`, `references/<paper_id>/text.md`.
No network calls. No coordinates proposed except ones already present in the refined CSV or in cached responses (cited by OSM id).

## Counts

| item | count |
|---|---|
| sites (same 212 keys in both files) | 212 |
| rows changed in any field (excluding notes, verified_on) | 62 |
| rows moved > 1 km or changed source/precision/resolution | 56 |
| previous-review "wrong" rows | 17 (8 fixed by the refined pass, 9 unchanged) |
| previous-review weak campus rows | 6 (NLM changed; 5 unchanged) |
| refined precision mix | wikidata/campus 129, nominatim/campus 31, nominatim/building 12, nominatim/postcode 7, nominatim/city 32, unresolved 1 |

| decision | count |
|---|---|
| accept-refined | 199 |
| fallback-city | 7 |
| unresolved | 6 |
| keep-first-pass | 0 |

## Pipeline findings (why 9 wrong rows are unchanged)

1. **Wikidata short-circuits the override.** `geocode()` searches Wikidata with `wd_q or org`; when `wikidata_search` is empty it still searches the org name, and any hit within 50 km returns before `nominatim_query` is tried. All 10 rows with an override Nominatim query and an org-name Wikidata hit kept the first-pass point: Kyushu (Kasuga and empty), Tokai, KIT (Karlsruhe and empty), SJTU, ZJU Hangzhou, Lumiphase, Hefei National Laboratory, Lightmatter. Fix: when `nominatim_query` is set and `wikidata_search` is empty, skip Wikidata.
2. **`featureType=settlement` did not fix the bad locality centres.** Cached responses with the new parameter still return the Pisa county relation (43.47147, 10.67979), the Chongqing municipality (state), the Moscow federal city (state), the Kanagawa prefecture (province) and Fukushima city. "University Park, Pennsylvania" and "Swavesey, Cambridge" now return nothing, so Penn State and AIXTRON skip the distance check ("no locality to check"); both points are correct.
3. **The 50 km gate rejected a correct hit.** `会津大学, 会津若松市` returned osm:way/81056653 (amenity/university, name 会津大学, 37.52367, 139.93807). It was rejected only because the locality centre is Fukushima city, about 54 km away.
4. **No name guard on Nominatim free text.** `光谷实验室, 武汉` returned a Hilton hotel; `张江实验室` returned an OSM building whose name is just 实验室 ("laboratory"), matched through the 张江镇 address component.
5. **`precision_of` maps `addresstype=place` (house-number address ways) to city.** This affects Nokia (1322 Bordeaux Drive) and Flux Photonics (580 Crespi Drive): both are building-level address points labelled city. The coordinates are correct; only the label understates them.

## Non-accept decisions

| org | locality | refined label (source) | reason | decision |
|---|---|---|---|---|
| Optics Valley Laboratory | Wuhan | 武汉光谷希尔顿酒店, 鸿雁路 ... (osm:way/1224004707, tourism/hotel) | Wrong entity: Hilton Optics Valley hotel. li2026aa prints only "Wuhan" | fallback-city (Wuhan centre, which is the first-pass point) |
| Zhangjiang Laboratory | Shanghai | 实验室, 龙东大道, 张江镇 ... 201203 (osm:way/464099663, building/commercial) | Generic building named 实验室, not Zhangjiang Laboratory; postcode 201203 vs printed "Shanghai 201210" (hu2026); building precision unjustified | fallback-city |
| Kyushu University | Kasuga, Fukuoka | Kyushu University (Q1188786) | Unchanged Ito campus, 24 km from printed "6-1 Kasuga-koen, Kasuga"; override query never ran (finding 1) | fallback-city (Kasuga centre, cached relation 4008346) |
| Karlsruhe Institute of Technology | Karlsruhe | Karlsruhe Institute of Technology (Q309988) | Unchanged Campus North, 10.5 km from printed 76131 Karlsruhe (Campus South); override never ran | fallback-city (Karlsruhe centre, cached relation 62518) |
| Lumiphase AG | Stäfa | Lumiphase (Switzerland) (company in Zurich) (Q107518429) | Unchanged; 17 km from printed Stäfa; override never ran | fallback-city (Stäfa centre, cached relation 1682214) |
| Hefei National Laboratory | Hefei | Hefei National Research Center for Physical Sciences at the Microscale (Q107517791) | Unchanged wrong entity (USTC microscale centre); override never ran | fallback-city (Hefei centre, cached relation 3288965) |
| Lightmatter, Inc. | Boston, MA | Lightmatter (Q107518457) | Unchanged; coordinate is Boston city centre (0.1 km) but labelled campus; paper prints only "Boston, MA, 02210" | fallback-city (same point, precision city) |
| Tokai University | Kanagawa | Tokai University (private university in Tokyo) (Q963709) | Unchanged; point is in Shibuya, Tokyo; printed "Kanagawa 259-1292" (Hiratsuka). The locality centre is the Kanagawa prefecture centroid, so a city fallback would not be a city | unresolved (re-run `東海大学 湘南キャンパス` with Wikidata skipped) |
| The University of Aizu | Fukushima | locality centre: Fukushima | Unchanged; Fukushima city is about 54 km from the university. The correct cached hit osm:way/81056653 (会津大学, amenity/university) was rejected by the 50 km gate (finding 3) | unresolved (resolvable from cache: accept osm:way/81056653, precision campus) |
| Shanghai Jiao Tong University | Shanghai | Shanghai Jiao Tong University (Q525169) | Unchanged Xuhui; printed 200240 (Minhang); override never ran. The same override query already resolved in the refined CAEMD row: osm:way/288249651 上海交通大学（闵行校区） | unresolved (resolvable: reuse osm:way/288249651 from the CAEMD row, precision campus) |
| Istituto Italiano di Tecnologia | Pisa | locality centre: Pisa | Unchanged Pisa county centroid, about 30 km SE of the city; `NEST, Piazza San Silvestro, Pisa` returned empty | unresolved (reuse the Istituto Nanoscienze Q30283302 NEST point, per the previous review) |
| Chongqing United Microelectronics Center Co., Ltd | Chongqing | locality centre: Chongqing | Unchanged municipality centroid, about 140 km from printed Shapingba address; `重庆联合微电子中心` returned empty | unresolved (re-run locality `沙坪坝区, 重庆`) |
| Cetus Photonics, Inc. | (empty) | (none) | Unresolved in both passes; kari2025 prints no city | unresolved |

## Accepted rows: notes (no decision change)

Verified as the right entity or the printed address:
- Previous-review wrong rows now fixed: Penn State (Q739627), ZJU Jiaxing (浙江大学嘉兴研究院), ZJU Ningbo (now Ningbo city centre, as the review specified), CamGraPhIC / INPHOTEC / CNIT (postcode 56124 centroid), Intel Santa Clara, MACOM (postcode 95050).
- Named-entity hits: AFR 光库科技 (Tangjiawan, Zhuhai), CNPEM Q18484000 (LNNano parent), CICT 武汉邮电科学研究院, CHESS (Wilson Synchrotron Laboratory), Dukhov VNIIA, Graphenea SA, Huawei 溪流背坡村 (Songshan Lake; the site choice remains an assumption, since the paper prints only "Dongguan 523000"), HyperLight (The Engine, 501 Massachusetts Avenue), IHP, XIOPM Q30259688, Institute of Semiconductors CAS, Intel Hillsboro (Ronler Drive), IBM Rüschlikon Q1474431, Jiaxing Key Lab (ZJU Jiaxing institute), Infinera (169 West Java Drive), NTT Research (940 Stewart Drive, OSM name "NTT Silicon Labs"), BBN Q891612, SIMIT Q30259636, SIOM Q30259638 (Jiading, matches 201800), EPFL Q262760, ZJU Taizhou institute, CAEMD (SJTU Minhang).
- Printed-address hits: 1FINITY (Kamikodanaka quarter), Coherent (48800 Milmont building), CompoundTek (International Business Park), Dream Photonics Vancouver (2366 Main Mall, ICICS), Enosemi (1107 NE 45th), KEEQuant (Gebhardtstraße 28), Ligentec (Chemin de la Dent d'Oche), NICT Kobe (Iwaoka quarter), Nokia (1322 Bordeaux), PETRA (Sekiguchi 1-chome), Sumitomo (Taya-cho), Polaris x2 (3400 Industrial Lane), postcode rows (DRS 92127, La Luce 78759, Monarch 92131).
- Reuse-style hits: Kavli at Cornell and PARADIM (Cornell University relation), Stanford Nano Shared Facilities (Stanford University way).

Caveats, kept as accept:
- U.S. Army ARL, Adelphi: label is "Harry Diamond Laboratories" (Q16841378), a defunct predecessor organisation. Its coordinate is the Adelphi Laboratory Center site that the printed "Adelphi, MD, 20783" refers to, so the point is right but the label is not the institution.
- NLM Photonics: the refined point is a 0.2 km segment of Mason Road NE (osm:way/4921392) in 98195, the printed street. It is labelled city, which is conservative. The first pass was a named NLM Photonics POI on NE 65th St, which does not match the printed address.
- Intel Santa Clara: the point is a bus stop named "3600 Juliette Lane", at the printed address. The city label is conservative.
- Precision under-labelled (finding 5): Nokia Sunnyvale and Flux Photonics are address points that should be `building`. Intel Hillsboro is labelled `building` but the hit is the campus-scale "Intel" way; `campus` would fit better.
- Advanced Micro Foundry (117685) and Nissan Chemical (274-0069): the postcode queries fell back to city objects. They are labelled city, which is correct.
- Pisa postcode rows: the notes "33.3 km from locality centre" are an artifact of the county centroid.
- Unchanged weak rows: ZJU Hangzhou (Yuquan; most printed addresses are Zijingang, and the override never ran), KIT (empty locality, Campus North), Kyushu (empty locality, Ito), ECNU (mixed campuses), ITAE RAS Moscow (federal-city centroid, inside Moscow but about 14 km S of the centre).

## Machine-readable (non-accept rows)

```
Optics Valley Laboratory | Wuhan | fallback-city
Zhangjiang Laboratory | Shanghai | fallback-city
Kyushu University | Kasuga, Fukuoka | fallback-city
Karlsruhe Institute of Technology | Karlsruhe | fallback-city
Lumiphase AG | Stäfa | fallback-city
Hefei National Laboratory | Hefei | fallback-city
Lightmatter, Inc. | Boston, MA | fallback-city
Tokai University | Kanagawa | unresolved
The University of Aizu | Fukushima | unresolved
Shanghai Jiao Tong University | Shanghai | unresolved
Istituto Italiano di Tecnologia | Pisa | unresolved
Chongqing United Microelectronics Center Co., Ltd | Chongqing | unresolved
Cetus Photonics, Inc. |  | unresolved
```
