# Geo sites review (fresh-context audit), 2026-10-04

Input: `data/_staging/geo_sites/org_sites_geocoded.csv` (212 sites: 120 wikidata/campus, 19 nominatim/campus, 71 nominatim/city, 2 unresolved).
Context used: `data/author_affiliations.csv`, `data/organizations.csv`, `data/_staging/geo_cache/responses.jsonl` (search candidates, wbgetentities claims), `scripts/geocode_sites.py` (acceptance logic), and the affiliation text printed in `references/<paper_id>/text.md`.
No network calls were made. No coordinates are proposed; only queries, reuse of an existing site or entity, or keeping city precision.

## Summary

| severity | count |
|---|---|
| ok | 125 |
| weak | 68 (62 city-level fallbacks + 6 campus rows) |
| wrong | 17 (9 city-level fallbacks whose locality centre is wrong + 8 campus rows) |
| unresolved | 2 |
| total | 212 |

All 19 nominatim/campus rows are the named institution (AIXTRON, AMO, CSEM, Freedom Photonics, HIT Shenzhen, HPE, Huawei Shenzhen, IMRI, IIT Genova, NLM Photonics, Peng Cheng Lab x2, Shandong Normal, Xidian Guangzhou, Zurich Instruments, imec x2) except ZJU Ningbo (wrong entity) and ZJU Jiaxing (wrong campus); NLM Photonics is weak. Precision labels are consistent with what the source returned, with one exception: Lightmatter (the Wikidata coordinate is Boston's city centre but it is labelled campus).

## Pipeline findings (root causes)

1. **Locality-centre lookup returns an administrative area larger than the city.** Seen in the cached Nominatim responses:
   - Pisa: returns the province centroid (43.47147, 10.67979), about 30 km SE of the city.
   - Santa Clara, CA: returns Santa Clara County (37.23333, -121.68463), about 25 km SE of the city.
   - Chongqing: returns the municipality centroid (30.05518, 107.87487), about 140 km from Shapingba.
   - Moscow: returns the federal-city centroid (55.62558, 37.60639), about 14 km S of the centre.
   - Ithaca, NY: returns the Town of Ithaca centroid.
   - University Park, PA: returns a hamlet in Huntsville, **Alabama**.
   - Kanagawa: returns the prefecture centroid.
   - Fukushima: returns Fukushima city, but the paper means the prefecture.

   This produces wrong city fallbacks, inflated distance notes (for example, Scuola Normale, Sant'Anna and CNR-Nano Pisa show "35 km", but their points are correct), and a false rejection: Penn State's correct Wikidata hit (Q739627, 40.79611, -77.86278) and its correct Nominatim POI ("Penn State University ... College Township, Centre County") were both dropped by the 50 km check. Fix: use a structured Nominatim query (`city=`, `state=`, `country=`) or `featuretype=city`. Include the state for US localities.
2. **First P625 only.** Q525169 (SJTU) carries two coordinates: Xuhui (31.20083, 121.42972) and Minhang (31.025393, 121.436348). The script takes the first, which is the wrong campus for the printed postcode 200240.
3. **Missing P17 drops a good hit.** Q891612 (BBN Technologies) has P625 (42.38993, -71.14755, west Cambridge MA) but no P17, so the country filter discarded it.
4. **50 km gate is loose for prefecture-level localities.** Tokai University passed at 38 km from the Kanagawa prefecture centroid even though the point is in Tokyo. Kyushu passed at 24 km while being on the wrong campus.
5. **Nominatim free text can match a different institution.** "Zhejiang University, Ningbo" returned 宁波大学 (Ningbo University). Suggested guard: require the org name, or its known native name, in the returned `name`.
6. **Many Wikidata items exist but lack P625**, so they cannot place a point and the Nominatim route is needed: Advanced Micro Foundry, LNNano, Coherent, Dream Photonics, Dukhov VNIIA, HyperLight, Infinera, IIT, CHESS, Kavli at Cornell, MACOM, NOEIC, CNIT, NTT, Nissan Chemical, Nokia, Optics Valley Lab, Phase Sensitive Innovations, SRCQS, Zhangjiang Lab, Intel, Huawei, and HFNL (Q55361939).

## Wrong sites (must fix)

| org | locality | current source / ref / label | problem | fix |
|---|---|---|---|---|
| Kyushu University | Kasuga, Fukuoka | wikidata Q1188786 "Kyushu University" (33.59572, 130.21778) | Ito campus (Nishi-ku, Fukuoka). The paper prints "6-1 Kasuga-koen, Kasuga, Fukuoka 816-8580" (lu2020, mao2024), which is the Chikushi campus about 20 km away | Nominatim `九州大学筑紫キャンパス` |
| Tokai University | Kanagawa | wikidata Q963709 (35.66448, 139.6848) | Point is in Shibuya, Tokyo. The paper prints "Kanagawa 259-1292" (lu2020), the Hiratsuka (Shonan) postcode | Nominatim `東海大学 湘南キャンパス` |
| The University of Aizu | Fukushima | nominatim locality centre: Fukushima city | The paper prints "Fukushima 965-8580", a prefecture name with an Aizuwakamatsu postcode. Fukushima city is about 60 km away. Searching "The University of Aizu" returned only the Junior College Division (Q11381235, a separate site) | Wikidata `University of Aizu`; else Nominatim `会津大学, 会津若松市` |
| The Pennsylvania State University | University Park, PA | nominatim locality centre (34.74065, -86.62305) | Huntsville, Alabama | Fix the locality query (`University Park, Centre County, Pennsylvania`); Wikidata `Pennsylvania State University` (Q739627, P625 already cached) then passes |
| Karlsruhe Institute of Technology | Karlsruhe | wikidata Q309988 (49.0996, 8.4319) | This is Campus North (Eggenstein-Leopoldshafen). The paper prints "76131 Karlsruhe" (IPQ, LEM, IOC; cai2025, schwarzenberger2026), which is Campus South, about 10 km away. The Eggenstein-Leopoldshafen site correctly uses Campus North | Nominatim `KIT Campus Süd, Karlsruhe` |
| Shanghai Jiao Tong University | Shanghai | wikidata Q525169, first P625 = Xuhui (31.20083, 121.42972) | The paper prints 200240 (shen2021, zhang2023), the Minhang campus, about 20 km away | Use Q525169's second P625 (Minhang); or Nominatim `上海交通大学闵行校区` |
| Zhejiang University | Ningbo | nominatim osm:way/232142836 "宁波大学（东校区）" | Wrong entity: this is Ningbo University. The paper prints "Ningbo Research Institute, Zhejiang University, Ningbo 315100" (liu2023) | Nominatim `浙江大学宁波研究院` (reject 宁波大学 hits); else Ningbo city precision |
| Zhejiang University | Jiaxing | nominatim osm:node/9755082457 "浙江大学（海宁校区）" | Haining international campus. The paper prints "Jiaxing Research Institute, Zhejiang University, Jiaxing 314000" (guo2026, li2025a, liu2023), about 25 km away | Nominatim `浙江大学嘉兴研究院` |
| Lumiphase AG | Stäfa | wikidata Q107518429 "Lumiphase (Switzerland) (company in Zurich)" (47.31651, 8.53885) | The point is on the west shore of Lake Zurich, 17 km from the printed Stäfa (kohli2025) | Nominatim `Lumiphase, Stäfa`; else Stäfa city precision |
| Hefei National Laboratory | Hefei | wikidata Q107517791 "Hefei National Research Center for Physical Sciences at the Microscale" | Different entity: the label is the USTC microscale centre, not Hefei National Laboratory. The paper prints "Hefei 230088" (gao2024, hu2026a) | Nominatim `合肥国家实验室`; else Hefei city precision |
| CamGraPhIC srl | Pisa | nominatim locality centre: Pisa province centroid | Point is about 30 km SE of Pisa city | Nominatim postcode `56124 Pisa` (giambra2021 prints 56124); no street address is printed |
| INPHOTEC | Pisa | same | same | Nominatim postcode `56124 Pisa` |
| National Inter-University Consortium for Telecommunications | Pisa | same | same | Nominatim `Via Giuseppe Moruzzi 1, Pisa` (CNIT PNT Lab; the street is not printed, only "56124 Pisa", so verify) |
| Istituto Italiano di Tecnologia | Pisa | same | same. The unit is "Center for Nanotechnology Innovation @NEST, I-56127 Pisa" | Reuse the Istituto Nanoscienze site (Q30283302, NEST); or Nominatim `NEST, Piazza San Silvestro, Pisa` |
| Intel Corporation | Santa Clara, CA | nominatim locality centre: Santa Clara County centroid | About 25 km SE of the city. The paper prints "3600 Juliette Ln, Santa Clara, CA 95054" (hsu2024) | Nominatim `3600 Juliette Lane, Santa Clara, CA 95054` |
| MACOM Technology Solutions | Santa Clara, CA | same | same. The paper prints only "Santa Clara, CA 95050" (tran2026) | Nominatim postcode `95050, Santa Clara, CA` |
| Chongqing United Microelectronics Center Co., Ltd | Chongqing | nominatim locality centre: Chongqing municipality centroid | About 140 km from the printed "No. 20 Xiyuan South Street, Shapingba District, Chongqing 401332" (wu2025) | Nominatim `重庆联合微电子中心`; else `沙坪坝区, 重庆` as the locality |

## Weak campus-level sites

| org | locality | current source / ref / label | problem | fix |
|---|---|---|---|---|
| Zhejiang University | Hangzhou | wikidata Q197543 (Yuquan, 30.26361, 120.12083) | Several papers print Zijingang Campus or 310058 (li2022b, liu2023, wu2025, yu2024). chen2023a prints 310027 (Yuquan) | Nominatim `浙江大学紫金港校区` |
| Karlsruhe Institute of Technology | (empty) | wikidata Q309988 (Campus North) | zwickel2020 lists IPQ (Campus South) and IMT (Campus North). Campus South is KIT's seat and is the better default | Same query as KIT Karlsruhe (Campus South) |
| Kyushu University | (empty) | wikidata Q1188786 (Ito) | Ito is the main campus, so the choice is reasonable. However, the unit (IMCE, zwickel2020) is at Chikushi according to the other papers' printed address | Reuse the Kasuga (Chikushi) fix |
| East China Normal University | Shanghai | wikidata Q2034790 (Putuo, 31.22806, 121.4) | Mixed campuses: 200062 (SKL Precision Spectroscopy, which matches the current point) and 200241 (XXL lab, Minhang campus) | Keep. A site key of org+locality cannot split them |
| Lightmatter, Inc. | Boston, MA | wikidata Q107518457 (42.35938, -71.05897) | The coordinate is Boston's city centre (0.1 km away), so this is city-level labelled campus. The paper prints only "Boston, MA, 02210" (montifiore2026) | Nominatim postcode `02210, Boston, MA`; or relabel precision as city |
| NLM Photonics | Seattle, WA | nominatim osm:node/13325083671 (NE 65th St, Roosevelt) | Right entity, but the paper prints "4000 Mason Road, Suite 300, Seattle WA 98195" (johnson2025, UW campus), about 2.5 km away | Nominatim `4000 Mason Road, Seattle, WA 98195` |

## OK sites with notes (no action needed)

- Sun Yat-sen University, Guangzhou: South campus matches 510275 (he2019, xu2020, zhang2023). wu2025 prints 510006 (East campus); this is a minority.
- Xidian University, Xi'an: South campus (Chang'an). hou2024 affiliations come from Crossref with no postcode, so the campus can't be checked.
- Pisa: Scuola Normale, Sant'Anna and Istituto Nanoscienze are correct. Their "35 km" notes are an artifact of the province-centroid locality.
- Moscow: Bauman and Lomonosov are correct. Their distances are relative to the federal-city centroid.
- Empty-locality sites (ETH Zurich, Stanford, Nokia Bell Labs, Sun Yat-sen, Zhejiang University): the main campus is a reasonable choice. KIT and Kyushu are discussed above.

## Proposed queries (machine-readable)

Covers every city-level and unresolved site, plus the wrong and weak campus rows. These are single best queries. Wikidata strings were not run, because no network was used here. Where a cached search showed that an item lacks P625, `wikidata_search` is left empty.

| org_name | locality | wikidata_search | nominatim_query | note |
|---|---|---|---|---|
| 1FINITY Inc. | Kawasaki, Kanagawa |  | 4-1-1 Kamikodanaka, Nakahara-ku, Kawasaki | weak; printed address (tanaka2026); Japanese form 上小田中4-1-1, 中原区, 川崎市 if English fails |
| Advanced Fiber Resources (Zhuhai), Ltd. | Zhuhai |  | 珠海光库科技 | weak; printed "Zhuhai 519080" only (qi2024); native name 光库科技 from general knowledge, verify |
| Advanced Micro Foundry | Singapore |  | 117685, Singapore | weak; printed postcode only (wang2026a); Q118384382 has no P625 |
| Brazilian Nanotechnology National Laboratory | Campinas, São Paulo | Brazilian Center for Research in Energy and Materials | CNPEM, Campinas | weak; printed "LNNano, CNPEM, Campinas 13083-200" (navarro2026); Q47462549 has no P625 |
| CamGraPhIC srl | Pisa |  | 56124 Pisa | wrong; locality centre is the Pisa province centroid; no street printed |
| Center for Advanced Electronic Materials and Devices | Shanghai |  | 上海交通大学闵行校区 | weak; printed "Shanghai Jiao Tong University, Shanghai 200240" (zhang2023); same point as fixed SJTU |
| Cetus Photonics, Inc. |  | Cetus Photonics | Cetus Photonics | unresolved; kari2025 prints no city or address; if both queries return nothing, keep unresolved (do not guess a city) |
| China Information and Communication Technologies Group Corporation | Wuhan |  | 武汉邮电科学研究院 | weak; printed "Wuhan 430074"; corresponding email domain wri.com.cn (Wuhan Research Institute of Posts and Telecommunications) |
| China Information and Communication Technologies Group Corporation | Wuhan, Hubei |  | 武汉邮电科学研究院 | weak; same as above (hu2023) |
| Chongqing United Microelectronics Center Co., Ltd | Chongqing |  | 重庆联合微电子中心 | wrong; municipality centroid; printed "No. 20 Xiyuan South Street, Shapingba District, Chongqing 401332"; fallback locality 沙坪坝区, 重庆 |
| Coherent Corp. | Fremont, CA |  | 48800 Milmont Drive, Fremont, CA 94538 | weak; printed (dong2026); Q15109887 has no P625 |
| CompoundTek Pte | Singapore |  | 5 International Business Park, Singapore 609914 | weak; printed (sia2022) |
| Cornell High Energy Synchrotron Source | Ithaca, NY |  | Wilson Laboratory, Ithaca, NY | weak; Q122763773 has no P625; fallback reuse Cornell University Q49115 point |
| DRS Daylight Solutions | San Diego, CA |  | 92127, San Diego, CA | weak; printed postcode only (montifiore2026) |
| Dream Photonics Inc. | Vancouver, BC |  | 2366 Main Mall, Vancouver, BC | weak; printed (taghavi2024, taghavi2026); UBC campus |
| Dream Photonics Inc. | Woodinville, WA |  | Dream Photonics, Woodinville, WA | weak; no address printed; keep city if empty |
| Dukhov Automatics Research Institute | Moscow |  | ВНИИА им. Н. Л. Духова, Москва | weak; Q4127504 has no P625; also the Moscow centre is the federal-city centroid (14 km S) |
| Enosemi Inc | Seattle, WA |  | 1107 NE 45th Street, Seattle, WA 98105 | weak; printed (johnson2025) |
| Flux Photonics Inc. | Pacifica, CA |  | 580 Crespi Drive, Pacifica, CA 94044 | weak; printed (celik2022) |
| Graphenea Semiconductor SLU | San Sebastian | Graphenea | Graphenea, Donostia-San Sebastián | weak; no address printed (wu2023) |
| Huawei Technologies | Dongguan |  | 华为松山湖, 东莞 | weak; printed "Optical R&D Dept., Dongguan 523000" only (wang2022a); Songshan Lake site is an assumption, verify the returned POI |
| Hubei Optical Fundamental Research Center | Wuhan |  |  | weak; no address printed and no reliable name to search; keep city |
| HyperLight | Cambridge, MA |  | 501 Massachusetts Avenue, Cambridge, MA 02139 | weak; printed (holzgrafe2020, kharel2021); Q140345879 lacks P625 and P17 |
| IHP - Leibniz-Institut für innovative Mikroelektronik | Frankfurt (Oder) | Leibniz Institute for High Performance Microelectronics | IHP, Frankfurt (Oder) | weak; printed "Frankfurt Oder" only (steckler2025) |
| INPHOTEC | Pisa |  | 56124 Pisa | wrong; province centroid; printed "INPHOTEC, 56124 Pisa" (giambra2021) |
| Infinera Corporation | Sunnyvale, CA |  | Infinera, Sunnyvale, CA | weak; printed city only (wolf2018a); Q6029685 has no P625 |
| Institute for Theoretical and Applied Electromagnetics of the Russian Academy of Sciences | Moscow |  | ИТПЭ РАН, Москва | weak; printed "Moscow" only (lotkov2024) |
| Institute of Optics and Precision Mechanics, Chinese Academy of Sciences | Xi'an | Xi'an Institute of Optics and Precision Mechanics | 中国科学院西安光学精密机械研究所 | weak; printed "Xi'an 710119" (feng2022, liu2026b) |
| Institute of Semiconductors, Chinese Academy of Sciences | Beijing | Institute of Semiconductors, Chinese Academy of Sciences | 中国科学院半导体研究所 | weak; English org-name search returned nothing; also try "Institute of Semiconductors" |
| Intel Corporation | Hillsboro, OR |  | Intel, Hillsboro, OR | weak; printed "PHY research lab, Intel lab, Hillsboro" (lee2026); Q248 has no P625; accept only an Intel office/industrial POI |
| Intel Corporation | Santa Clara, CA |  | 3600 Juliette Lane, Santa Clara, CA 95054 | wrong; county centroid; printed (hsu2024) |
| International Business Machines Corporation Research Zurich | Rüschlikon | IBM Research – Zurich | Säumerstrasse 4, Rüschlikon | weak; printed "IBM Research - Europe, Zurich, Säumerstrasse 4, CH-8803 Rüschlikon" (churaev2023) |
| Istituto Italiano di Tecnologia | Pisa |  | NEST, Piazza San Silvestro, Pisa | wrong; province centroid; printed "CNI@NEST, I-56127 Pisa"; alternative: reuse Istituto Nanoscienze Q30283302 point (NEST) |
| Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging | Jiaxing |  | 浙江大学嘉兴研究院 | weak; printed with "Jiaxing Research Institute, Zhejiang University, Jiaxing 314000" |
| KEEQuant GmbH | Fürth |  | Gebhardtstraße 28, Fürth | weak; printed "Gebhardtstr. 28, 90762 Fürth" (gupta2023) |
| Kavli Institute at Cornell for Nanoscale Science | Ithaca, NY |  | Cornell University, Ithaca, NY | weak; Q55361440 has no P625; best is reuse Cornell University Q49115 point (printed with Cornell, 14853) |
| La Luce Cristallina, Inc. | Austin, TX |  | 78759, Austin, TX | weak; printed postcode only (sun2026a) |
| Ligentec SA | Ecublens | LIGENTEC | Chemin de la Dent-d'Oche 1B, Ecublens | weak; printed "EPFL Innovation Park, Batiment L, Ch. de la Dent d'Oche 1B, 1024 Ecublens VD" (rahman2025) |
| Ligentec SA | Ecublens VD | LIGENTEC | Chemin de la Dent-d'Oche 1B, Ecublens | weak; same |
| MACOM Technology Solutions | Santa Clara, CA |  | 95050, Santa Clara, CA | wrong; county centroid; printed postcode only (tran2026); Q17109447 has no P625 |
| Micram Microelectronic GmbH | Bochum |  | Micram Microelectronic, Bochum | weak; printed "44801 Bochum" (wolf2018a); fallback postcode 44801 |
| Monarch Quantum | San Diego, CA |  | 92131, San Diego, CA | weak; printed postcode only (sun2026a) |
| NTT Innovative Devices Corporation | Atsugi, Kanagawa |  | 森の里若宮3-1, 厚木市 | weak; printed "3-1 Morinosato Wakamiya, Atsugi" (ogiso2024) |
| NTT Research, Inc. | Sunnyvale, CA |  | 940 Stewart Drive, Sunnyvale, CA 94085 | weak; printed (celik2022) |
| National Information Optoelectronics Innovation Center | Wuhan |  | 国家信息光电子创新中心 | weak; Q139989239 has no P625; printed "Wuhan 430074" |
| National Institute of Information and Communications Technology | Kobe, Hyogo |  | 588-2 Iwaoka, Nishi-ku, Kobe | weak; printed (fukui2025); Japanese form 岩岡町岩岡588-2, 神戸市西区; Q6973676 P625 is Koganei only |
| National Inter-University Consortium for Telecommunications | Pisa |  | Via Giuseppe Moruzzi 1, Pisa | wrong; province centroid; printed "CNIT, 56124 Pisa" only, street from general knowledge, verify; fallback 56124 Pisa |
| Nippon Telegraph and Telephone Corporation | Atsugi, Kanagawa |  | 森の里若宮3-1, 厚木市 | weak; printed "3-1 Morinosato Wakamiya, Atsugi-shi" (ogiso2016) |
| Nissan Chemical Corporation | Funabashi |  | 274-0069, Funabashi | weak; printed postcode only (lu2020); Q7040930 has no P625 |
| Nokia Corporation | Sunnyvale, CA |  | 1322 Bordeaux Drive, Sunnyvale, CA 94089 | weak; printed (porto2026) |
| Optics Valley Laboratory | Wuhan |  | 光谷实验室, 武汉 | weak; Q137795911 has no P625; printed "Wuhan" only |
| Peking University Yangtze Delta Institute of Optoelectronics | Nantong |  | 北京大学长三角光电科学研究院 | weak; printed "Nantong 226010" (han2023) |
| Phase Sensitive Innovations | Newark, DE |  | Phase Sensitive Innovations, Newark, DE | weak; printed "Newark, Delaware 19713" (nelan2022); Q30298353 has no P625 |
| Photonics Electronics Technology Research Association | Bunkyo-ku, Tokyo |  | 1-20-10 Sekiguchi, Bunkyo-ku, Tokyo | weak; printed (tanaka2026); Q30294852 points to Tsukuba and was correctly rejected |
| Platform for the Accelerated Realization, Analysis, and Discovery of Interface Materials (PARADIM) | Ithaca, NY |  | Cornell University, Ithaca, NY | weak; printed "PARADIM, Cornell University, Ithaca, NY 14853"; best is reuse Cornell Q49115 point |
| Polaris Electro-Optics, Inc. |  |  | 3400 Industrial Lane, Broomfield, CO 80020 | unresolved; chiang2025 prints "USA" only; Broomfield address printed in taghavi2024/taghavi2026 (organizations.csv note agrees); merge with the Broomfield site |
| Polaris Electro-Optics, Inc. | Broomfield, CO |  | 3400 Industrial Lane, Broomfield, CO 80020 | weak; printed "3400 Industrial Ln, 3130 25th St, Broomfield, CO 80020" |
| Raytheon BBN Technologies | Cambridge, MA | Raytheon BBN Technologies |  | weak; Q891612 has P625 (west Cambridge) but no P17, so the country filter dropped it; accept with country override US; printed "Cambridge, MA 02138" |
| Rhinopix Technology Limited | Hong Kong |  | Rhinopix, Hong Kong | weak; printed "Hong Kong" only (wang2026b); keep city if empty |
| Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences | Shanghai | Shanghai Institute of Microsystem and Information Technology | 中国科学院上海微系统与信息技术研究所 | weak; printed "Shanghai" only |
| Shanghai Institute of Optics and Fine Mechanics, Chinese Academy of Sciences | Shanghai | Shanghai Institute of Optics and Fine Mechanics | 中国科学院上海光学精密机械研究所 | weak; printed "Shanghai 201800" (Jiading) (gao2024) |
| Shanghai Research Center for Quantum Sciences | Shanghai |  | 上海量子科学研究中心 | weak; Q140352012 has no P625; printed "Shanghai 201315" (hu2026a) |
| SilOriX GmbH | Karlsruhe |  | SilOriX, Karlsruhe | weak; printed "76131 Karlsruhe" only (schwarzenberger2026); fallback postcode 76131 |
| Stanford Nano Shared Facilities | Stanford, CA |  | Stanford University, Stanford, CA | weak; printed "Stanford University, Stanford, CA 94305"; best is reuse Stanford Q41506 point (current fallback is already 0.1 km from it) |
| Sumitomo Electric Industries, Ltd. | Yokohama, Kanagawa |  | 田谷町1, 栄区, 横浜市 | weak; printed "1 Taya-cho, Sakae-ku, Yokohama-shi" (tanaka2026) |
| Swiss Federal Institute of Technology Lausanne | Lausanne | École polytechnique fédérale de Lausanne |  | weak; cached search with this string returns Q262760 with P625 (46.52028, 6.56556), CH, about 5 km from Lausanne centre, so it passes; the run searched the English name, which returned nothing |
| TOPTICA Photonics Inc. | Pittsford, NY |  | TOPTICA Photonics, Pittsford, NY | weak; printed "Pittsford, NY 14534" (lee2026) |
| The Pennsylvania State University | University Park, PA | Pennsylvania State University | University Park, Centre County, Pennsylvania | wrong; nominatim_query here is the locality-centre query to replace "University Park, PA" (resolved to Alabama); with it, Q739627 passes the 50 km check |
| The University of Aizu | Fukushima | University of Aizu | 会津大学, 会津若松市 | wrong; printed "Fukushima 965-8580"; current point is Fukushima city |
| U.S. Army Combat Capabilities Development Command Army Research Laboratory | Adelphi, MD | Adelphi Laboratory Center | Adelphi Laboratory Center, Adelphi, MD | weak; printed "Adelphi, MD, 20783" (montifiore2026) |
| Wuhan ANPI Optoelectronics Company Ltd | Wuhan |  | Wuhan ANPI Optoelectronics, Wuhan | weak; printed "Wuhan" only (li2026aa); keep city if empty |
| Zhangjiang Laboratory | Shanghai |  | 张江实验室 | weak; Q132803533 has no P625; printed "Shanghai 201210" (hu2026) |
| Zhejiang University | Taizhou, Zhejiang |  | 浙江大学台州研究院 | weak; printed "Taizhou Institute of Zhejiang University" (deng2026) |
| Kyushu University | Kasuga, Fukuoka |  | 九州大学筑紫キャンパス | wrong; current = Ito campus; printed "6-1 Kasuga-koen, Kasuga" |
| Kyushu University |  |  | 九州大学筑紫キャンパス | weak; unit IMCE is at Chikushi; Ito is an acceptable main-campus default |
| Tokai University | Kanagawa |  | 東海大学 湘南キャンパス | wrong; current point in Shibuya, Tokyo; printed "Kanagawa 259-1292" |
| Karlsruhe Institute of Technology | Karlsruhe |  | KIT Campus Süd, Karlsruhe | wrong; current = Campus North; printed 76131 Karlsruhe |
| Karlsruhe Institute of Technology |  |  | KIT Campus Süd, Karlsruhe | weak; seat campus preferred for empty locality |
| Shanghai Jiao Tong University | Shanghai |  | 上海交通大学闵行校区 | wrong; or take Q525169 second P625 (31.025393, 121.436348) |
| Zhejiang University | Ningbo |  | 浙江大学宁波研究院 | wrong entity (宁波大学); reject Ningbo University hits; else Ningbo city precision |
| Zhejiang University | Jiaxing |  | 浙江大学嘉兴研究院 | wrong campus (Haining); printed Jiaxing Research Institute, 314000 |
| Zhejiang University | Hangzhou |  | 浙江大学紫金港校区 | weak; majority of printed addresses are Zijingang / 310058 |
| Lumiphase AG | Stäfa |  | Lumiphase, Stäfa | wrong; Wikidata point 17 km from Stäfa; else Stäfa city precision |
| Hefei National Laboratory | Hefei |  | 合肥国家实验室 | wrong entity (HFNL microscale centre); else Hefei city precision |
| Lightmatter, Inc. | Boston, MA |  | 02210, Boston, MA | weak; Wikidata coordinate equals Boston centre; or relabel precision city |
| NLM Photonics | Seattle, WA |  | 4000 Mason Road, Seattle, WA 98195 | weak; OSM POI differs from printed address by about 2.5 km |
| East China Normal University | Shanghai |  |  | weak; keep; mixed campuses (200062 Putuo matches current point; 200241 Minhang) |
