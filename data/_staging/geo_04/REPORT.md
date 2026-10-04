# geo_04 author-affiliation extraction report (2026-10-04)

27 papers, 376 rows (287 primary, 88 additional, 1 present_address). 0 new organizations (organizations.csv is header-only). Source: paper for 362 rows (printed text, page 1-2; superscripts visually checked on page-1 renders for taghavi2022a, sun2026a, tanaka2026, tiberi2025), crossref for 14 rows (taghavi2022a 9, suceava2025 2, prountzou2026 1, ulrich2025 2; see below). Crossref affiliations are present with names in the crossref.json of 9 papers (prountzou2026, schwarzenberger2026, shamsansari2021, shen2021, suceava2025, taghavi2022a, taghavi2026, tan2024, ulrich2025); elsewhere they are empty or null. Where crossref and print differ for an author who has a printed affiliation (shen2021 He, tan2024, schwarzenberger2026), the printed page governs.

Corrections applied 2026-10-04 after the independent audit: see AUDIT_DISPOSITIONS.md.

Self-check passed: all (paper_id, author_index, author) match papers.csv; all org_name exist in data/organizations.csv; countries are uppercase ISO alpha-2; no duplicate (paper_id, author_index, aff_order).

## Authors added from crossref.json (not in the printed source)
- prountzou2026 idx 5 Morgan Trassin: absent from the printed author list of the cached arXiv v1 PDF (5 authors printed); row from crossref.json (ETH Zurich, Department of Materials, Multifunctional Ferroic Materials); locality empty (crossref prints no city).
- ulrich2025 idx 5 Ahmed Khalil: absent from the printed author list of arXiv v1 (16 printed; papers.csv has 17); rows from crossref.json (imec, Leuven; KU Leuven Department of Physics and Astronomy, Leuven).
- suceava2025 idx 11 Saugata Sarker and idx 13 Suchismita Sarker: the paper prints only "S. Sarker" twice (Penn State MSE; Cornell High Energy Synchrotron Source); the name-to-affiliation binding is taken from crossref.json (Saugata -> Penn State MSE, Suchismita -> CHESS), source = crossref.

All authors in papers.csv now have at least one row.

## Author-list mismatches
- prountzou2026: papers.csv has Morgan Trassin (idx 5), printed list does not (see above). Other 5 map by name.
- ulrich2025: papers.csv has Ahmed Khalil (idx 5), printed list does not. Other 16 map by name.
- All other papers: printed author list matches papers.csv by name (initials-only IEEE-style footnote lists in sia2022, suceava2025 mapped by initials + surname + position).

## Judgment calls per paper
- qi2024: Ting Hao on Advanced Fiber Resources (Zhuhai), others Tsinghua (unit State Key Laboratory of Precision Measurement Technology and Instruments, Department of Precision Instrument).
- rahman2025: Ligentec SA locality "Ecublens VD" as printed (EPFL Innovation Park); Rahman and Mookherjea at UC San Diego (La Jolla).
- renaud2023: Harvard SEAS (aff 1) and Harvard Department of Physics (aff 3) are separate rows for Yaowen Hu; A*STAR (IMRE, Singapore) for Di Zhu; Caltech (Pasadena, CA; source prints 'Pasadena 91125 MA') for Neil Sinclair. Aff 5 is "equal contribution", not an affiliation.
- sayem2026, sayem2026c: "Nokia Bell Labs, NJ, USA" with no city; locality left empty (note on each row). sayem2026a, sayem2026b print Murray Hill, NJ.
- schwarzenberger2026: IEEE-style author footnotes, no superscripts; rows per footnote paragraph. Karlsruhe vs Eggenstein-Leopoldshafen localities follow the printed postcode/city per unit (IMT is 76344 Eggenstein-Leopoldshafen for Kholeif and Kuzmin, 76131 Karlsruhe for Sarwar and Koos, as printed). IBCS-FMS Eggenstein-Leopoldshafen. Grünewald: "was with LEM, KIT; now with Institute for Anatomy and Cell Biology, University Freiburg" -> KIT row primary, Freiburg row present_address (locality Freiburg).
- shamsansari2021: HyperLight (Lingyan He, Mian Zhang) and Freedom Photonics (Hannah Grant, Leif Johansson, Goleta, CA); rest Harvard SEAS.
- sia2022: affiliations from IEEE footnotes on p.1 (J. X. B. Sia, X. Guo, J. Wang, W. Wang, H. Wang: NTU School of EEE; X. Li, C. Liu: NTU Temasek Laboratories; K. S. Ang: CompoundTek; Littlejohns, Reed: Southampton ORC; Z. Qiao: Hainan Normal University, Haikou). Initials map uniquely to the full names in papers.csv.
- soma2025: all five University of Tokyo School of Engineering, locality "Tokyo" as printed.
- steckler2025: affiliations are in the footnote (p.1 bottom of article block): IHP "Frankfurt Oder" printed; written "Frankfurt (Oder)" to match the existing organizations.csv spelling. Zimmermann also TU Berlin (unit FG Silizium-Photonik).
- suceava2025: initials-only footnote lists. Sotir: PARADIM row (org exists, parent Cornell) as aff 1, Cornell MSE as aff 2. Gopalan: Penn State MSE and Penn State Physics. Philippi, Brower: Penn State Physics. Ding, Zhu, Zhang: Penn State Engineering Science and Mechanics. Yang: Engineering Science and Mechanics (p.1), plus Nuclear Engineering and Materials Research Institute at Penn State (p.2 continuation block). Schlom: Cornell MSE (p.1), plus Kavli Institute at Cornell for Nanoscale Science and Leibniz-Institut fur Kristallzuchtung, Berlin (p.2 continuation block). Both S. Sarker authors bound via crossref.json (see above).
- sun2026a: markers 1-10 read from page-1 render; Harvard SEAS and Harvard Chemistry (Sun), Graz (Ossiander), KIT Institute of Nanotechnology (Meretska), UC Irvine MSE / Physics and Astronomy / IMRI (Pan).
- taghavi2022a: arXiv v2 p.1 prints markers 1 = Georgia Tech, 2 = UBC, but the markers are transposed relative to the paper's own corresponding-author email (ali.adibi@ece.gatech.edu), Author Contributions (p.14, work at Georgia Tech by I.T., A.A.E., A.A.) and crossref.json (version of record). Rows for the nine single-affiliation authors follow crossref.json (Georgia Tech: Dehghannasiri, Fan, Moradinejad, Efterkhar, Adibi; UBC: Tofini, Shekhar, Chrostowski, Jaeger), source = crossref, note "arXiv v2 p.1 markers transposed; crossref and p.14 agree". Taghavi keeps two rows, Georgia Tech first, as in crossref.
- taghavi2024: Shekhar has Dream Photonics Vancouver (aff 2) and Dream Photonics Inc., Woodinville, WA (aff 6): two rows with different localities. Quantum Matter Institute and UBC Physics and Astronomy rows use org UBC with the unit text.
- tan2024: imec locality "Heverlee" (Kapeldreef 75, 3001 Heverlee as printed); Ghent University localities "Ghent"; ULB written "Bruxelles" as printed (org Universite Libre de Bruxelles, unit OPERA-Photonique).
- tanaka2026: PETRA "Bunkyo-ku, Tokyo", Sumitomo Electric "Yokohama, Kanagawa", Institute of Science Tokyo "Meguro-ku, Tokyo", 1FINITY "Kawasaki, Kanagawa", UTokyo "Bunkyo-ku, Tokyo", as printed.
- thiele2022: both affiliations are Paderborn University with different units (Mesoscopic Quantum Optics vs Integrated Quantum Optics).
- tiberi2025: AIXTRON locality "Swavesey, Cambridge" (printed address); CNIT mapped to org "National Inter-University Consortium for Telecommunications" (Pisa); Romagnoli has CNIT and CamGraPhIC srl.
- tran2026: Schell and Freund also Technical University Berlin (Berlin); Parker, Phan, Allen at MACOM (Santa Clara, CA).
- ulrich2025: imec (Leuven) for all; Ghent INTEC PRG, KU Leuven ESAT / MTM / Physics and Astronomy as additional rows (three KU Leuven rows with different units for different authors).

## Blockers
None. No references/<id>/figures/page_01.png exists for any paper in this batch; page renders were made from source.pdf into the session scratchpad (not the repo).
