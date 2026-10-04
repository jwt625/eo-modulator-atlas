# geo_01 extraction report (2026-10-04)

27 papers, 337 rows in `author_affiliations.csv`, 2 new orgs in `organizations.csv`. Self-check passed: author strings match papers.csv (compared after trimming; see note 1), every org_name exists, countries are ISO alpha-2, no duplicate (paper_id, author_index, aff_order).

General notes
1. papers.csv `authors` uses "; " as separator in 168 author slots of this batch (leading space after the semicolon); `author` in the CSV is the trimmed string.
2. All affiliations read from text.md (markers legible; page-1 images were not available for all papers, so p.1 of gao2024, churaev2023, deng2026 was rendered from source.pdf and the markers checked visually). No crossref fallback used.
3. Two printed affiliations of one author at the same institution (different units) are two rows (aff_order 1, 2).
4. Superscript markers that denote equal contribution (churaev2023 "5", han2023 "7") are not affiliations and were ignored.

Per paper (authors in papers.csv / authors with rows / authors without rows)
- akazawa2026: 9/9/none.
- anderson2025: 11/11/none. Anderson (Stanford + UIUC), Van Gasse (Stanford + Ghent).
- arabjuneghani2022: 9/9/none. Fathpour has CREOL and ECE, both University of Central Florida (2 rows, same site).
- berman2026: 3/3/none.
- cai2025: 12/10/Jiale Sun, Shuhang Zheng. Mismatch: papers.csv (and Crossref) list both, the cached text printed author list (10 names) has neither; no affiliation to assign, left out.
- celik2022: 10/10/none. Stanford and Flux Photonics lines give street addresses without a city for Stanford ("348 Via Pueblo Mall, CA 94305"): locality empty. McKenna has Stanford + NTT Research.
- chelladurai2025: 10/10/none. Messner: ETH Zurich + Zurich Instruments AG (present address, new org).
- chen2022: 11/11/none. Affiliations on p.2 (p.1 is a cover page). Guo has 3 (SCNU x2 units, PolyU).
- chen2023a: 5/5/none.
- chen2024: 8/8/none. CityU department and state key lab both printed (2 rows each, same site).
- chiang2025: 8/8/none. Polaris Electro-Optics: only "USA" printed, locality empty.
- churaev2023: 16/16/none. Markers 1,2 are two EPFL units. IBM Research - Europe, Zurich mapped to the existing IBM Research Zurich row, locality Rueschlikon.
- deng2026: 19/19/none. Full six-item list is on p.9 (Author details); p.1 shows only 1 and 2. Taizhou Institute of Zhejiang University kept as a unit of Zhejiang University (locality Taizhou, Zhejiang) since it is not an org row.
- derose2012: 4/4/none.
- didier2026: 11/11/none.
- dong2026: 13/13/none (single address block).
- falcone2026: 5/5/none (single affiliation block, no markers).
- feng2022: 7/7/none.
- fukui2025: 15/15/none. Yanwachirakul present address: Chulalongkorn University (new org). NICT affiliation is the Kobe site (locality Kobe, Hyogo), unlike the existing org note (Koganei).
- gao2024: 10/10/none. Cheng has 7 affiliations (markers 1,3,4,5,6,7,8), verified on the rendered page.
- geravand2025: 6/6/none.
- giambra2021: 10/10/none. Affiliations from the "Author Information" list (p.13), not page 1. "NEST, Scuola Normale Superiore and Istituto Nanoscienze-CNR" printed as one unit for Pezzini and Fabbri: two rows (one per institution, unit NEST).
- gui2022: 8/8/none.
- guo2026: 12/12/none.
- gupta2023: 7/7/none. IEEE footnotes, no markers. Schell: HHI + TU Berlin. Baier: HHI ("was with") + KEEQuant GmbH ("now with", kind present_address).
- han2023: 17/17/none.
- he2019: 16/16/none.

Judgment calls
- Locality is left without province when none is printed (e.g. Guangzhou, Hangzhou, Ann Arbor, Hefei).
- Unit strings for Guo/Chen2022 SCNU affiliation 2 and 3 are kept as separate units under the same org.
