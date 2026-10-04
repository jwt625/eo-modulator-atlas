---
verifier: fresh-context subagent
task: verify round-2 audit corrections for p3_14 and p3_15
date: 2026-10-04
scope: p3_14 (sabatti2024, chen2024, shamsansari2021, guo2026, sayem2026), p3_15 (hsu2024, hu2023, shen2021, huang2026a, yue2023, kawahara2025, sia2022); organizations.csv rows "National Information Optoelectronics Innovation Center" (new) and "Binnig and Rohrer Nanotechnology Center" (notes)
inputs: data/_staging/p3_14/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_15/AUDIT_DISPOSITIONS_R2.md, data/_staging/audits/p3_14-p3_15-r2-claude-audit-2026-10-03.md
mode: read-only except this file; git diff HEAD / git show HEAD only; no network; no build or merge scripts
verdict: all corrections confirmed; no unrecorded change in scope
counts: {changed_cells: 23, confirmed: 23, not_confirmed: 0}
---

# Verification of round-2 corrections: p3_14 and p3_15

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` (HEAD vs working tree, parsed as CSV, filtered to the 12 papers and the two named org rows) and `git diff HEAD` of the 12 evidence files (9 exist; chen2024, sayem2026, huang2026a have none).
- Sources: `references/shamsansari2021/text.md` p.3 and `figures/img_p03_1.png` (Fig. 4(d)); `references/hu2023/text.md` p.1, p.3, p.8, p.9 and `figures/img_p08_1.png` (Fig. 5); `references/hsu2024/text.md` p.7, p.8, p.13 and `figures/img_p08_1.png` (Fig. 4); `references/kawahara2025/text.md` p.4, p.8 (Appendix D); `references/sia2022/figures/page_05.png` (Fig. 6); `references/sabatti2024/text.md` p.4; `references/xu2020/text.md` p.1; `crossref.json` of shamsansari2021, hsu2024, hu2023, shen2021, kawahara2025; `references/sayem2026/text.md` p.1. Figure readings are approximate.
- `uv run python scripts/validate_db.py`: `0 error(s)`.
- CSV line endings: CRLF on every line of all three CSVs (118/118, 278/278, 188/188); the three edited YAML files are LF ASCII. No absolute or home-relative path in any added line.

## Per-paper verdicts

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| sabatti2024 | 0 (org note only, counted under orgs) | 0 | 0 | no change; deferred `published_on` (R2-F1) supported |
| chen2024 | 0 | 0 | 0 | no change |
| shamsansari2021 | 5 (CSV bw_measured_to_ghz, notes; evidence value, locator, note) | 5 | 0 | corrections confirmed |
| guo2026 | 0 | 0 | 0 | no change |
| sayem2026 | 0 | 0 | 0 | no change; deferral R2-F10 supported |
| hsu2024 | 1 (il_onchip_excludes) | 1 | 0 | corrections confirmed |
| hu2023 | 6 (papers companies; -a notes; -b notes; evidence drive_vpp_v basis, locator, note) | 6 | 0 | corrections confirmed |
| shen2021 | 0 | 0 | 0 | no change |
| huang2026a | 0 | 0 | 0 | no change |
| yue2023 | 0 | 0 | 0 | no change |
| kawahara2025 | 1 (il_onchip_excludes) | 1 | 0 | corrections confirmed |
| sia2022 | 8 (notes -a..-d; four evidence bw3db_reference notes) | 8 | 0 | corrections confirmed |
| organizations.csv | 2 (new NIOIC row; BRNC notes) | 2 | 0 | corrections confirmed |

Total 23 changed cells (evidence sub-fields of one entry counted separately; sia2022 = 4 row notes + 4 evidence notes).

## Changed cells

| # | File / row / column | Old -> new | Source locator | Verdict |
|---|---|---|---|---|
| 1 | devices.csv shamsansari2021-a `bw_measured_to_ghz` | 45 -> 50 | p.3 "50 GHz Vector Network Analyzer ... 45 GHz fast photo-diode ... detector response are subtracted"; Fig. 4(d) x-axis 0-50 GHz, trace ends at about 50 GHz (approx) | confirmed (convention (c) third sentence; detector de-embedded) |
| 2 | devices.csv shamsansari2021-a `notes` | appended "bw_measured_to_ghz 50 = VNA sweep and plotted trace end; photodiode response is de-embedded (p.3)." | p.3 text; Fig. 4(d) | confirmed |
| 3 | evidence shamsansari2021 `bw_measured_to_ghz` value | 45 -> 50 | as #1 | confirmed; equals CSV 50 |
| 4 | evidence shamsansari2021 `bw_measured_to_ghz` locator | "p.3 Fig. 4(d) and text" -> "p.3 text (50 GHz VNA); Fig. 4(d)" | p.3 | confirmed |
| 5 | evidence shamsansari2021 `bw_measured_to_ghz` note | -> "VNA sweep and plotted trace end at 50 GHz; 45 GHz photodiode response de-embedded; authors attribute fluctuation beyond 45 GHz to the photodiode." | p.3 "The response fluctuation beyond 45 GHz is due to the limited bandwidth of the photodiode." | confirmed |
| 6 | devices.csv hsu2024-a `il_onchip_excludes` | "" -> "fiber grating-coupler loss (Fig. 4 transmission is normalized)" | p.8 Fig. 4(a) caption "Normalized transmission spectra"; Fig. 4(c) 3 dB IL read from a 0 dB off-resonance scale (render); p.13 "coupled in and out through waveguide grating couplers" | confirmed |
| 7 | papers.csv hu2023 `companies` | "...CICT;Peng Cheng Laboratory" -> "...CICT;National Information Optoelectronics Innovation Center;Peng Cheng Laboratory" | p.1 affiliation 3 "National Information Optoelectronics Innovation Center, 430074 Wuhan, China", listed separately from affiliation 2; order matches affiliations 2, 3, 4 | confirmed |
| 8 | devices.csv hu2023-a `notes` | Vpp sentence replaced by "drive_vpp_v 0.6: Vpp is fixed at 600 mV in the Fig. 5(c),(d) data-rate scans, which peak near 302 Gb/s at 1312.0 nm and -0.9 V (p.8); the Fig. 7 / Methods run states no Vpp." | p.8 Fig. 5 caption "The Vpp at c and d are both fixed at 600 mV"; Fig. 5(c) peak about 302 Gb/s at 1312.0 nm, Fig. 5(d) peak about 302 Gb/s at -0.9 V (render, approx) | confirmed |
| 9 | devices.csv hu2023-b `notes` | appended "bw_measured_to_ghz left empty: convention (c) is not applied because no S21 or sweep range is shown in this preprint." | p.1 "over 67GHz"; p.3 "beyond 67 GHz ... More characteristics ... reported in Ref. [34]"; no S21 for this point in the preprint | confirmed (audit's second option; deviation from convention (c) now documented) |
| 10 | evidence hu2023-a `drive_vpp_v` basis | derived -> measured | p.8 Fig. 5 caption; p.9 Fig. 6(a) caption "Vpp of 0.6 V" at 1312 nm, -0.9 V | confirmed (Vpp is a stated experimental setting at the row's operating point) |
| 11 | evidence hu2023-a `drive_vpp_v` locator | "p.8, Fig. 5 caption; p.9, Fig. 6" -> "p.8, Fig. 5(c),(d) caption; p.9, Fig. 6" | as #10 | confirmed |
| 12 | evidence hu2023-a `drive_vpp_v` note | -> "Vpp fixed at 600 mV in the Fig. 5(c),(d) data-rate scans, which peak near 302 Gb/s at 1312 nm, -0.9 V; Fig. 7 run states no Vpp." | as #8 | confirmed; value 0.6 equals CSV 0.6 |
| 13 | devices.csv kawahara2025-a `il_onchip_excludes` | "" -> "fiber-to-chip edge coupling (not quantified)" | p.4 "The on-chip insertion loss was approximately 11 dB, including the p-n doped PCW phase shifter loss of ~8 dB"; p.8 Appendix D "input and output via edge couplers using fiber-lens modules"; no coupling loss stated | confirmed |
| 14 | devices.csv sia2022-a..-d `notes` (4 cells) | "(about 1.5 GHz)" -> "(about 1 GHz)" | p.5 Fig. 6 render: 2 GHz and 4 GHz ticks about 84 px apart, both traces start about 40 px left of the 2 GHz tick, i.e. about 1.0-1.1 GHz (approx) | confirmed |
| 15 | evidence sia2022 `bw3db_reference` notes, -a..-d (4 entries) | same replacement | as #14 | confirmed; value `unspecified` unchanged |
| 16 | organizations.csv new row National Information Optoelectronics Innovation Center | (absent) -> research_institute, CN, east_asia, parent_org empty, note "Wuhan; hu2023 p.1 affiliation 3, listed separately, relation to ... not stated there; xu2020 p.1 prints it as part of that group" | hu2023 p.1 affiliation 3; xu2020 p.1 affiliation 2 "National Information Optoelectronics Innovation Center, China Information and Communication Technologies Group..." | confirmed; inserted in alphabetical order (between Nanyang Technological University and National Institute of Advanced Industrial Science and Technology) |
| 17 | organizations.csv Binnig and Rohrer Nanotechnology Center `notes` | appended "; sabatti2024 p.4 names it 'BRNC of ETH Zurich and IBM Ruschlikon'" | sabatti2024 p.4 "cleanroom facilities FIRST and BRNC of ETH Zurich and IBM Ruschlikon" | confirmed |

Rows #14 and #15 each group four identical edits.

## Rejected and deferred findings

| Finding | Disposition | Check | Verdict |
|---|---|---|---|
| R2-F8 shamsansari2021-a `etch_depth_nm` derived-only | rejected | `derived` item present (600 nm - 300 nm, inputs eo_film_thickness_nm, slab_thickness_nm); source p.1 "600 nm thick", p.2 "slab height of 300-nm"; p1_04 R2-F15 documents the derived-only convention; validator accepts | rejection supported |
| R2-F1 year rule | deferred (user) | Crossref issued: shamsansari2021 2022-04-06, hsu2024 2024-01-27, hu2023 2023-09-23, shen2021 2022-02-10, kawahara2025 2026-03; shamsansari2021 v2 stamp "25 Nov 2021" (text.md line 91); year cells unchanged | deferral facts accurate |
| R2-F10 org items | deferred (coordinator) | sayem2026 p.1 "Nokia Bell Labs, NJ, USA" vs org note "Murray Hill, NJ"; kawahara2025 names IHP only in body text p.4 / p.8 ("Leibniz Institute for High Performance Microelectronics (IHP)"); sia2022 affiliation "CompoundTek, 5 International Business Park, Singapore" with no fabrication role; org rows unchanged | deferral facts accurate |
| R2-F3 (adjusted) | bw_measured_to_ghz left empty | no S21 / sweep range for the 67 GHz point in the cached preprint | supported (coordinator override to 67 author_estimate remains possible) |
| R2-F2 (adjusted) | CICT org note not edited | xu2020 p.1 prints NIOIC as part of CICT | adjustment supported |

## Metadata and notes

- All new note text is accurate to the source, ASCII, no emoji, no paths, no private information.
- Observation (not a correction defect, pre-existing text): shamsansari2021-a notes keep "the trace falls below -3 dB beyond about 43 GHz". My reading of Fig. 4(d) (approx; 20 px/GHz on the image, -3 dB line at the green dash) puts the first excursions below -3 dB near 39-40 GHz, with a near-touch around 32 GHz; the round-2 audit wrote "below -3 dB for most of about 40-50 GHz". Optional wording fix: "beyond about 43 GHz" -> "from about 40 GHz". Not a numeric cell.
- Observation: the BRNC org note now reads "host institution and address not stated in the paper ...; sabatti2024 p.4 names it ..." where "the paper" refers to another paper using the row. Acceptable as recorded; optional clarification by naming that paper.

## Validator and equality

- `uv run python scripts/validate_db.py`: `0 error(s)`.
- Evidence vs CSV for changed or touched evidence cells: shamsansari2021-a `bw_measured_to_ghz` 50 = 50; hu2023-a `drive_vpp_v` 0.6 = 0.6; sia2022-a..-d `bw3db_reference` unspecified (unchanged) consistent. hu2023-b `bw_measured_to_ghz` empty in CSV with no evidence entry.

## Unrecorded changes

None in scope. Out of scope (other batches, ignored): `organizations.csv` "Sandia National Laboratories" `notes` changed (valdez2022 / weigel2018 / valdez2023 wording), plus diffs in other papers' rows and evidence files.
