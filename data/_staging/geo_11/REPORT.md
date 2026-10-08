# geo_11 extraction report (2026-10-07)

Saved by the coordinator from the extractor's final message. Papers: the 20 merged p8 papers (cached arXiv copies).

Dry run: `staged rows 187, staged papers 20, kept canonical rows 2613; rows 2800, papers 226, new orgs 1, sites
296, problems 0`; author without rows: datta2024 Vivian Zhou (absent from the cached print; Crossref has no
affiliation). Author strings follow papers.csv after the 2026-10-07 Crossref refresh (bankwitz2026, chaudhury2024,
yeh2026). Markers legible in text.md for every paper; no page renders. Source paper, locator "p.1 affiliations"
unless noted.

## Per paper (authors / with rows / rows)

- behzadfar2026 4/4/5: UCF CREOL ("Orlando, FL"); Fathpour also ECE (footnote "also with"); locator "p.1 author
  footnote".
- ghavami2023 3/3/3: Tarbiat Modares University (Faculty of Electrical and Computer Engineering, "Tehran").
- wu2022 10/10/24: markers 1 SIOM (State Key Laboratory of High Field Laser Physics), 2 UCAS, 3 ECNU (State Key
  Laboratory of Precision Spectroscopy), 4 ECNU (XXL, School of Physics and Electronics Science), 5 Shandong Normal
  University, 6 Shanghai Research Center for Quantum Sciences; 7, 8 correspondence.
- yeh2026 6/6/7: Harvard SEAS ("Cambridge, MA"); Barton present_address Northwestern University ("Evanston, IL");
  Lončar matched by NFC normalisation, papers.csv string written.
- bankwitz2026 12/12/14: Heidelberg University (Kirchhoff-Institute for Physics) all but Hartmann; Varri and Pernice
  also University of Münster (Physics Institute); Hartmann Pixel Photonics GmbH.
- zhu2022 14/14/15: Harvard ten; Di Zhu also A*STAR (IMRE, "Singapore"); Chen, Wong MIT (RLE); He, Reimer, Zhang
  HyperLight ("Cambridge, MA").
- axline2026 9/9/9: Miraex SA ("Ecublens") six; EPFL ("Lausanne") Alma, Roquet, Villanueva.
- mohl2025 10/10/11: IBM Research - Zurich ("Rüschlikon"); Glantschnig present_address Infineon Technologies
  Austria AG ("Villach", new org), locator "p.1 author footnote".
- khalil2026 15/15/25: imec ("Leuven") fourteen; KU Leuven units (Physics and Astronomy; ESAT Proximus Chair; MTM);
  Ghent University INTEC; Painter Caltech only (two rows, Kavli Nanoscience Institute and Watson Laboratory; IQIM).
- lin2026b 6/6/7: NUS ECE ("Singapore"); Shang also Nanjing University (long unit string as printed).
- thureja2025 6/6/6: Caltech Watson Laboratories of Applied Physics ("Pasadena, CA").
- tian2026 11/11/11: Tsinghua University eight; Lin Peking University; Gao, Zheng National Center for Nanoscience
  and Technology; all "Beijing".
- datta2020 12/12/12: Columbia EE, ME, Physics ("New York, NY"); NC State (two departments in one row, "Raleigh,
  NC"); University of Chicago ("Chicago, IL").
- datta2024 6/5/6: Columbia EE (Datta, Gil-Molina, Lipson), ME (Hone); Chae ME + Nanyang Technological University
  ("Singapore"); Vivian Zhou no row.
- taki2024 9/9/9: The University of Tokyo (EEIS, "Bunkyo-ku, Tokyo", existing site string).
- anjali2025 3/3/3: IIT Kharagpur (Advanced Technology Development Centre), locality "West Bengal".
- chaudhury2024 6/6/6: papers.csv slot 3 Vladimir Fedorov from crossref.json (UCSD ECE, "La Jolla, CA", source
  crossref; note records the arXiv print's Chengkuan Gao); others "p.1 author footnote".
- saxena2023 2/2/2, shawon2024 2/2/2: University of Delaware ECE ("Newark, DE").
- shabaninezhad2025 5/5/10: University of Ottawa (EECS 1, Physics 2), NEXQT Institute ("Ottawa, ON", 3), Huawei
  Technologies Canada ("Kanata, ON", 4).

## Judgment calls

- anjali2025 locality "West Bengal" (no city printed apart from the institution name; alternatives empty or
  "Kharagpur, West Bengal").
- "Münster" as printed (existing University of Münster site "Muenster" from another paper's print).
- Separate rows for two separately marked units of one institution (wu2022 ECNU 3/4; behzadfar2026 Fathpour); one
  row for several units under one marker (datta2020 NC State, lin2026b Nanjing).
- wu2022 marker 4 unit keeps the printed em dash and "Electronics Science".
- Mappings: SIOM (CAS suffix) -> existing row; "IBM Research Europe" -> IBM Research - Zurich; "HyperLight
  Corporation" -> HyperLight; A*STAR with IMRE as unit; "École Polytechnique Fédérale de Lausanne" -> EPFL.
- present_address rows: yeh2026 Barton, mohl2025 Glantschnig (eltes2020/tiberi2026 precedent).
