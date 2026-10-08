# geo_07 extraction report (2026-10-07)

Saved by the coordinator from the extractor's final message (the subagent's file write was refused by the harness).

14 papers, 172 rows, 0 new orgs, 0 authors without rows. Dry run: `rows 172, papers 14, new orgs 0, sites 28,
problems 0`. Page 1 of eltes2020 (author line is image text, absent from text.md), xue2026 and horst2025 (byline
markers wrap in text.md) was rendered to a scratch location outside the repo.

## Per paper (authors in papers.csv / authors with rows)

- aimone2026: 10/10. Aimone Nokia Bell Labs Stuttgart (DE); the other nine Nokia Bell Labs New Providence, NJ (US).
- cai2026: 7/7. Cai and Wang (Xu) Fudan (College of Future Information Technology) + Zhangjiang Laboratory; rest
  Zhangjiang only; # and * marks ignored.
- eltes2020: 12/12. IBM Research - Zurich (Caimi, Siegwart, Stark, Eltes, Fompeyrine, Abel; Stark corrected per
  audit B1); University of Bristol (other six); Eltes, Fompeyrine, Abel also Lumiphase (Zurich) as present_address, aff_order 2. Bristol marker 2 prints
  two units, kept as one row "Quantum Engineering Technology Labs; H. H. Wills Physics Laboratory".
- horst2025: 17/17. ETH Zurich IEF (Zurich) and Polariton Technologies AG (Adliswil) for Fernandes, Funck, Destraz,
  Heni, Leuthold; Leuthold both.
- kholeif2026: 10/10. KIT (IPQ, IMT, IOC with IBCS-FMS) and SilOriX, Karlsruhe. Kholeif, Kuzmin 1,2; Sarwar 3,4;
  Erk 1,4; Koos 1,2,4; Brase 3.
- lin2026: 7/7. Marker 1 Taiwan Semiconductor Research Institute, marker 2 National Tsing Hua University, Hsinchu.
- murai2025: 6/6. AIST (Photonics-Electronics Integration Research Center, locality "Ibaraki") for four; Furukawa
  FITEL ("Chiyoda-ku, Tokyo") for Imai and Takabayashi.
- pan2021: 9/9. Zhejiang University (Hangzhou), South China Normal University (Guangzhou), ZJU Ningbo Research
  Institute (Ningbo) for Dai only; markers 4, 5 are e-mails.
- schwarzenberger2023a: 12/12. Text layer without word spaces, markers legible. KIT, SilOriX (Karlsruhe), Lightwave
  Logic, Inc. (Englewood, CO).
- sobu2026: 3/3. PETRA ("Bunkyo-ku, Tokyo") and 1Finity ("Kawasaki-shi, Kanagawa").
- tatarczak2026: 5/5. Coherent Corp., Santa Clara, CA.
- wang2022: 11/11. No byline markers; Author Information p.6 (locator "p.6 author information"). ZJU for Gengxin
  Chen, Ziliang Ruan, Liu Liu; SCNU for the other eight; K. Chen, Lu, Guo also the National Center for International
  Research on Green Optoelectronics at SCNU (aff_order 2), as in chen2022, guo2026, wang2025.
- xue2026: 13/13. Markers 1-5: Shanghai Research Center for Quantum Sciences, SJTU, Zhangjiang Laboratory, Hefei
  Laboratory (printed "Hefei National Laboratory"), Shandong Normal University (Jinan); 6, 7 e-mails. Zheng, Chen
  1-5; Xu 1,2,3; Qiu 2,3; Xue 1,2.
- yu2026: 15/15. Wuhan HGGenuine Optics Tech Co., Ltd ("Wuhan, Hubei") and Genuine Optics ("San Jose, CA"); Yu
  both; Bhatta Genuine only.

## Judgment calls

1. kind: aff_order 1 primary, 2+ additional, printed present address present_address (canonical rule).
2. One marker printing several units of one institution kept as one row with units joined by "; " (kholeif2026
   marker 3, eltes2020 marker 2; li2025b precedent).
3. lin2026 marker 1 "National Institutes of Applied Research Taiwan Semiconductor Research Institute" -> existing
   TSRI row (parent NIAR).
4. Localities: murai2025 AIST "Ibaraki" (prefecture as printed); 1Finity "Kawasaki-shi, Kanagawa" (ward dropped);
   PETRA "Bunkyo-ku, Tokyo".
5. Org mappings: "Lumiphase AG" -> Lumiphase; "Hefei National Laboratory" -> Hefei Laboratory; ZJU Ningbo Research
   Institute as a unit of Zhejiang University; aimone2026 Stuttgart rows Nokia Bell Labs with country DE as printed.
6. Markers: yu2026 "Haijiang Yu1, 2*" = markers 1 and 2; e-mail, equal-contribution and corresponding marks
   excluded; xue2026 and horst2025 confirmed on the rendered page; no Crossref fallback (eltes2020 crossref.json has
   no affiliations).
