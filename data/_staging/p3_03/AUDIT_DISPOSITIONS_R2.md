# Audit dispositions R2: p3_03

- Audit: `data/_staging/audits/p3_03-p3_04-r2-claude-audit-2026-10-03.md`
- Papers: zhang2023, li2020, shen2024, liu2025c, lin2026a
- Date: 2026-10-04
- Files edited (canonical): `data/papers.csv`, `data/devices.csv`, `data/evidence/lin2026a.yaml`, `data/evidence/liu2025c.yaml`, `data/evidence/shen2024.yaml`. `data/organizations.csv` unchanged. `audit_status` untouched.

Each finding was re-checked against `references/<paper_id>/text.md` and the figure images before editing.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F3 | metadata | applied | p.1 affiliations read "Ghent University - imec" (text.md lines 20-22). Database precedent: vanackere2023, nenezic2026, niels2025a, niels2026, tan2024, ulrich2025, wu2023 all list imec. papers.csv lin2026a `companies` '' -> `imec` (existing org row, research_institute, BE). countries BE unchanged. |
| R2-F4 | metadata | applied | `references/<id>/source.json` url is the arXiv PDF for both; all numbers come from those files. papers.csv li2020 `url` https://doi.org/10.1038/s41467-020-17950-7 -> https://arxiv.org/pdf/2003.03259v3; shen2024 `url` https://doi.org/10.1038/s41566-023-01370-2 -> https://arxiv.org/pdf/2309.03284v1. `doi` and venue unchanged. |
| R2-F5 | metadata | applied-adjusted (partial; rest deferred) | Only what convention (k) requires for the filled cells: page-1 stamps verified (liu2025c "arXiv:2511.02202v1 [physics.optics] 4 Nov 2025", lin2026a "arXiv:2605.02758v1 [physics.optics] 4 May 2026", shen2024 "arXiv:2309.03284v1 [quant-ph] 6 Sep 2023"; shen2024 crossref.json has only the journal date 2024-01-16; liu2025c and lin2026a have no crossref.json). Added a `context_values` item `published_on_arxiv_v1_stamp` (value, locator p.1 arXiv stamp, note quoting the stamp) to `data/evidence/liu2025c.yaml`, `lin2026a.yaml`, `shen2024.yaml` (same block kharel2021 uses for its arXiv v1 date). No published_on cell changed. Choice (a) fill from v1 stamp vs (b) clear, and filling sayem2026a/kim2025, deferred to the coordinator. |
| R2-F6 | minor | applied | Fig. 4 image (img_p09_1.png, panel labelled (e), caption (d)): Exp. points about 0.085 V cm at 1.5 um, about 0.118 at 2.0 um, about 0.16 (bar about 0.15-0.17) at 2.5 um. devices.csv lin2026a-a `notes`: inserted before "Not reported:" the sentence "Fig. 4(e) image (caption (d)) also shows measured VpiL about 0.12 V cm at 2.0 um and 0.16 V cm at 2.5 um gap (visual; no Vpi or length)." No new rows (no Vpi or length stated). |
| R2-F7 | minor | applied | p.13: 700 uW guided, 10 log10(0.7) = -1.549 dBm; -1.5 overstates a gt bound. devices.csv lin2026a-a `optical_power_handling_dbm` -1.5 -> -1.55 (qualifier gt kept); evidence entry value -1.5 -> -1.55; row note "(10 log10 0.7 mW = -1.55 dBm, rounded -1.5)" -> "(10 log10 0.7 mW = -1.55 dBm)". |

Findings for zhang2023: none. Round-1 F17 (lin2026a config eps_r placeholders) remains deferred as recorded in `AUDIT_DISPOSITIONS.md`; the R2 audit adds nothing new to it.

## Counts

applied 4, applied-adjusted 1 (R2-F5, partial), rejected 0, deferred 0 as whole findings (the remainder of R2-F5 is listed below).

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| lin2026a | lin2026a-a | optical_power_handling_dbm | -1.5 -> -1.55 (gt) | p.13 text (700 uW guided power) |

Metadata cells changed (not numerical): papers.csv lin2026a `companies` '' -> imec (p.1 affiliations); li2020 `url` and shen2024 `url` DOI -> arXiv PDF (`references/<id>/source.json`).

## Sim config follow-ups

None. `sims/lin2026a/config.yaml` has no optical-power target; its targets (vpi_l 0.085, vpi 4.2, z0 23, n_rf 2.3, ng 2.8) are unaffected.

## Deferred items needing decisions

1. R2-F5 (coordinator, cross-batch): one rule for `published_on` on arXiv-sourced rows: (a) fill from the cached v1 page stamp (would add sayem2026a 2026-04-30 and kim2025 2025-07-23, both stamps verified in the cache) or (b) clear liu2025c, lin2026a, shen2024 to match the database majority. Also whether `context_values` is the accepted place for the (k) quote (the schema names "the evidence note" but has no paper-level slot).
2. Round-1 F17 (lin2026a config eps_r placeholders) and F31 (verified_on date) remain deferred from round 1.
