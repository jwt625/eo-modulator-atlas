# geo_06 extraction report (2026-10-07)

15 papers, 200 rows in `author_affiliations.csv`, 0 new orgs (`organizations.csv` is header-only). Dry run: `rows 200, papers 15, new orgs 0, sites 44, problems 0`. Self-check: author strings match papers.csv slots, every org_name exists in data/organizations.csv, ISO alpha-2 countries, no duplicate (paper_id, author_index, aff_order).

General notes
1. All affiliations read from text.md; superscript markers were legible in every paper. No page_01.png images exist in the reference folders (figures/ holds only extracted images), so markers were not checked on a rendered page. No crossref fallback used (singer2025 crossref only lists SilOriX/ROR for authors, which disagrees with the print; print wins).
2. Equal-contribution and corresponding markers (deng2026a "+", singer2025 dagger, marker 8 = e-mail, asterisks) ignored.
3. aff_order follows the order of the markers as printed after each author name (e.g. li2026b Pang "8,4": ZJU = 1, RTU = 2).
4. Localities are as printed; empty where no city is printed.

Per paper (authors in papers.csv / authors with rows / authors without rows)
- aihara2026: 7/7/none. Page 1 (OFC). NTT, Inc. units Device Innovation Center (1) and Device Technology Labs (2); Matsuo has only 2, Ota only 1.
- boynton2020: 12/12/none. Single address, Sandia (unit Photonic & Phononic Microsystems).
- deng2026a: 15/15/none. ISCAS + UCAS (markers 1,3) for 9 authors; Zhangjiang Laboratory (2) for 5; Xu has 3 only; Jia has 2 only.
- hillier2025: 9/9/none. Markers 1-4: TU/e (unit Eindhoven Hendrik Casimir Institute), Nokia Bell Labs (Murray Hill, NJ), SMART Photonics (existing org, Eindhoven), UCL (unit Department of Electronic and Electrical Engineering, London). Augustin 1,3; Wale 1,4.
- kawahara2026: 7/7/none. Kawahara 1,2; Nishiyama 1,4 (PETRA, Tokyo); AIST printed without a unit.
- li2026b: 14/14/none. Schatz has only marker 2 (RISE) as printed. Osadchuk (University of Copenhagen): no city printed, locality empty. Ostrovskis 4,5 (RTU + Keysight Deutschland, Boeblingen). Zhejiang University Hangzhou (marker 8).
- mao2022: 4/4/none. Affiliations on p.2 (p.1 is a cover page). Kyushu University carries two units (markers 1 and 2: Interdisciplinary Graduate School of Engineering Sciences; Institute for Materials Chemistry and Engineering), Yokoyama has both, Lu has 2 and 3 (University of Aizu, locality "Fukushima" as printed).
- okuda2026: 15/15/none. Mitsubishi Electric Corporation, two units: High Frequency & Optical Device Works (Itami, Hyogo) for 13 authors; Information Technology R & D Center (Kamakura, Kanagawa) for Uchiyama and Shirao.
- schwarzenberger2023: 13/13/none. Compact printed block, markers in parentheses. KIT unit printed as one string "Inst. of Photonics and Quantum Electron. (IPQ)/Inst. of Microstruct. Technol. (IMT)", no city (only "Germany"): locality empty. NLM Photonics (Seattle), University of Washington Dpt. of Chemistry (Seattle).
- singer2025: 16/16/none. Seven printed units; KIT carries 5 rows-units (IPQ, IMT at Eggenstein-Leopoldshafen, IHE, IOC, IBCS-FMS). Koos has 1,2,3 (8 = e-mail). MultiLane Inc.: no city printed ("Houmal Technology Park, Lebanon"), locality empty.
- taghavi2026a: 5/5/none. UBC rows split by unit (ECE; Quantum Matter Institute); Dream Photonics at UBC address (existing org); Polaris Electro-Optics, Broomfield, CO. Jaeger has marker 1 only (the "1," trailing comma is a print artifact).
- valdez2026: 9/9/none. LIGENTEC SA mapped to existing org LIGENTEC; UCSD unit Department of Electrical and Computer Engineering.
- xue2023: 11/11/none. Meta, unit Reality Labs Research, Redmond, Washington; Lin has 1 and 3 (University of Rochester, two units).
- yin2026: 16/16/none. All four affiliations on one line; markers legible. Chu has 4 (Zhangjiang Laboratory).
- zhou2026: 7/7/none. Ligent Technologies, Inc. at two sites (San Jose, CA, US; Qingdao, CN); Zhou and Hong 1, the rest 2.

Judgment calls to audit
- singer2025 marker 7 (IBCS-FMS): the printed line carries no institution name; mapped to Karlsruhe Institute of Technology from the shared address with marker 6 (KIT IOC, Kaiserstr. 12, 76131 Karlsruhe). Affects Sarwar and Brase (note on those rows).
- singer2025 / schwarzenberger2023: IPQ/IMT units kept as printed; IMT in singer2025 is at Eggenstein-Leopoldshafen (marker 3).
- mao2022 Aizu locality "Fukushima" is a prefecture, kept as printed.
- schwarzenberger2023 KIT locality empty (no city printed) although other markers in the same paper print cities.
- li2026b Schatz: only RISE (marker 2) printed.
- Equal-contribution marks (deng2026a, singer2025) excluded.
