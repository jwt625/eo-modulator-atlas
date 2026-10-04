# geo_03 author affiliation extraction (2026-10-04)

27 papers, 347 rows, all authors covered (0 authors without rows), 1 new organization, 0 author-list mismatches by name. Self-check passed: names match papers.csv by index, all org_name values resolve, ISO alpha-2 uppercase, no duplicate (paper_id, author_index, aff_order), org country equals row country.

Source column is `paper` for all rows (affiliations read from the paper text via text.md; page-1 byline superscripts read from extracted text; page-1 images of niels2026 and lotkov2024 checked and agree). crossref.json was not needed.

## Per paper (authors in papers.csv = authors with rows; none without rows)
- lin2025a: 4/4. Marker 2 on the first three authors is "These authors contributed equally", not an affiliation; ignored. Corresponding email domain (uestc.edu.cn) is not a printed affiliation; Yu Cao has NUS only.
- lin2026a: 11/11. Moerman also IDLab (aff 2).
- liu2021: 10/10. liu2025: 11/11 (page-1 text.md is blank; affiliation read from later text and PDF text layer, Tsinghua EE).
- liu2023: 9/9. Affiliations 1-2 on p.1, 3-4 in end-of-article "Author details" (p.8). Affiliation 3 (Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging) has no printed parent: added as new org.
- liu2025b: 10/10. liu2025c: 16/16 (Ren has Nankai twice with different units, plus Shanxi University). liu2026b: 6/6.
- lotkov2024: 18/18. Image checked.
- lu2020: 9/9. Aizu and Tokai print prefecture only (Fukushima, Kanagawa); no city.
- luan2026, luan2026a: Chao Luan has DTU plus MIT RLE as "Current address" (kind present_address).
- mao2024: 7/7 (Lu and Yokoyama have both Kyushu units; no Tokai/Aizu in this paper).
- meng2023: 13/13. montifiore2026: 11/11 (Chauhan and Wang have present-address rows: NIST, Univ. Colorado Boulder, Lightmatter).
- multani2025: 4/4. SLAC row printed "SLAC National Accelerator Laboratory, Stanford University": one row to SLAC.
- navarro2026: 4/4. LNNano row (CNPEM parent printed in same affiliation) mapped to existing LNNano org; accents restored in localities.
- nelan2022 (Hurley, Zablocki present), nelan2022a: 9/9, 7/7.
- nenezic2026, niels2026: marker orders kept as printed (e.g. "3,2" gives Ghent primary, imec additional; "2,3" gives imec primary, IDLab additional). niels2025a: Vandekerckhove also ULB OPERA-Photonique, Brussels.
- ogiso2016: 7/7. Affiliations only in end-of-letter list on p.2 (NTT Device Innovation Center; Ohiso at NTT Device Technology Laboratories), no superscripts. ogiso2024: 5/5. porto2026: 24/24 (single Nokia affiliation). powell2024, powell2024a: 7/7, 6/6.

## Judgment calls
1. "Ghent University - imec" (printed as one joint affiliation, lin2026a, niels2025a, nenezic2026, niels2026) mapped to one Ghent University row with the printed unit; imec is not added as a second row from this string. Where imec is separately printed (Kapeldreef 75, Leuven; nenezic2026, niels2026) it has its own imec row. Coordinator decision 2026-10-04: keep this mapping (no extra imec rows from joint strings).
2. US localities use postal state abbreviations (e.g. "Cambridge, MA"), except Stanford and Menlo Park where no state is printed.
3. Name-string variants (not mismatches): printed "Günther Roelkens" vs papers.csv "Gunther" (niels2025a); printed "Soe Janssen" in text layer is "Sofie Janssen" in image (niels2026); papers.csv strings used.

## New organization
- Jiaxing Key Laboratory of Photonic Sensing & Intelligent Imaging (research_institute, CN, east_asia), from liu2023.
