---
verifier: fresh-context subagent
task: verify round-2 audit corrections for batches p1_02, p3_03, p3_04
date: 2026-10-04
scope: tran2026, wang2018, weigel2018, he2019, boynton2020 (p1_02); zhang2023, li2020, shen2024, liu2025c, lin2026a (p3_03); sayem2026a, sayem2026b, lin2025a, kim2025, mao2024 (p3_04)
dispositions: data/_staging/p1_02/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_03/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_04/AUDIT_DISPOSITIONS_R2.md
audits: data/_staging/audits/p1_02-r2-claude-audit-2026-10-03.md, data/_staging/audits/p3_03-p3_04-r2-claude-audit-2026-10-03.md
mode: read-only (only this report written); git diff HEAD on data/; no network; no build_views or merge
verdict: corrections confirmed except one minor note wording (he2019 bw3db_reference, 2 evidence notes)
changed_cells: 104
confirmed: 102
not_confirmed: 2
validator: 0 error(s)
---

# R2 correction verification: p1_02, p3_03, p3_04

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv` against `git show HEAD:` (csv.DictReader, keyed by paper_id / device_id); `git diff HEAD` on the eight changed evidence YAMLs. `data/organizations.csv` and `data/evidence/weigel2018.yaml` are unchanged (git status clean for both). No row added or removed. No p1_04 rows were in the diff at the time of the cell diff.
- tran2026, wang2018, weigel2018, he2019 have no `text.md`/`figures/`: text extracted and pages rendered from each `source.pdf` with pymupdf into the scratchpad (page counts 3, 6, 19, 21; PDF page index = locator page). Zoomed crops rendered for wang2018 Fig. 2c, tran2026 Fig. 1 labels, he2019 Fig. 3b and the p.14 equation image.
- p3_03/p3_04 checked against `references/<id>/text.md`, `source.json`, and `figures/img_p09_1.png` (lin2026a), `figures/img_p04_1.png` (mao2024).
- Figure readings below are approximate.

## Per-paper summary

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| tran2026 | 5 | 5 | 0 | corrections confirmed |
| wang2018 | 67 | 67 | 0 | corrections confirmed |
| weigel2018 | 1 | 1 | 0 | corrections confirmed |
| he2019 | 9 | 7 | 2 | issues (minor note wording) |
| boynton2020 | 1 | 1 | 0 | corrections confirmed |
| zhang2023 | 0 | 0 | 0 | no changes (none proposed) |
| li2020 | 1 | 1 | 0 | corrections confirmed |
| shen2024 | 2 | 2 | 0 | corrections confirmed |
| liu2025c | 1 | 1 | 0 | corrections confirmed |
| lin2026a | 5 | 5 | 0 | corrections confirmed |
| sayem2026a | 0 | 0 | 0 | no changes (R2-F5 deferred) |
| sayem2026b | 0 | 0 | 0 | no changes (none proposed) |
| lin2025a | 7 | 7 | 0 | corrections confirmed |
| kim2025 | 0 | 0 | 0 | no changes (R2-F5 deferred) |
| mao2024 | 5 | 5 | 0 | corrections confirmed |

## Changed cells

| Paper | File / row / field | Old -> new | Source locator | Verdict |
|---|---|---|---|---|
| tran2026 | devices tran2026-a `vpi_basis` | measured -> author_estimate | p.2 text "yields an estimated 3 dB-bandwidth of 76 GHz and a Vπ = 3.1 V at 5 V bias"; p.3 Conclusion 3.1 V; p.2 Fig. 1 center label "Vp=3.4 V" next to "5V bias" | confirmed (method for 3.1 V not stated; differs from the labelled measured curve) |
| tran2026 | devices tran2026-a `notes` | DC-transfer sentence -> "Vpi 3.1 V is the text/conclusion value at 5 V bias (method not stated); the static DC transfer curve (Fig. 1 center) is labelled 3.4 V." | same | confirmed |
| tran2026 | evidence tran2026-a vpi_dc_v `basis` | measured -> author_estimate | same | confirmed; equals CSV `vpi_basis` |
| tran2026 | evidence tran2026-a vpi_dc_v `locator` | "p.2, Sec. 3; p.3, Conclusion; Fig. 1 center" -> "p.2, Sec. 3 text; p.3, Conclusion" | same | confirmed |
| tran2026 | evidence tran2026-a vpi_dc_v `note` | -> "Text value; ... labelled 3.4 V; method for 3.1 V not stated" | same | confirmed |
| wang2018 | devices rt-q50k, rt-q8k, rt-q5p7k, rt-q18k, rt-eye `rib_width_nm` (5 cells) | '' -> 900 | p.3 "top width w = 900 nm" (platform optical waveguides) | confirmed |
| wang2018 | same 5 rows `etch_depth_nm` (5) | '' -> 400 | p.3 "rib height h = 400 nm"; p.2 Fig. 2c crop: h arrow spans slab top to rib top, so h is the etch depth | confirmed |
| wang2018 | same 5 rows `slab_thickness_nm` (5) | '' -> 300 | p.3 "slab thickness s = 300 nm" | confirmed |
| wang2018 | same 5 rows `crystal_cut` (5) | '' -> x-cut | p.3 "Our devices make use of an x-cut LN configuration" | confirmed |
| wang2018 | same 5 rows `cladding` (5) | '' -> SiO2 | p.3 "A SiO2 cladding layer is used" | confirmed |
| wang2018 | same 5 rows `electrode_metal` (5) | '' -> gold | p.3 "placing gold micro-RF electrodes" | confirmed |
| wang2018 | same 5 rows `notes` (5) | appended "Cut, cladding, electrode metal and waveguide w/h/s from the p.3 platform statement; electrode gap not entered (Q set by electrode distance, p.4)." | p.4 "The Q factors are engineered ... by controlling the distance between the RF electrodes and the optical waveguide" | confirmed |
| wang2018 | evidence: 30 new `entries` (6 fields x 5 rows), basis measured, locator "p.3, Sec. text" | added | p.3 | confirmed; every value equals its CSV cell (scripted check) |
| wang2018 | evidence new entry wang2018-mzi `max_baud_gbd` | added 22 GBd, derived, "p.4, Fig. 4 caption; p.5" | p.4 Fig. 4 caption "non-return-to-zero"; p.5 "40 Gbps and 22 Gbps for the racetrack and MZI" | confirmed; equals CSV 22 |
| wang2018 | evidence new entry wang2018-rt-eye `max_baud_gbd` | added 40 GBd, derived | same | confirmed; equals CSV 40 |
| weigel2018 | devices weigel2018-a `il_basis` | measured -> derived | p.6 "fiber insertion loss was -13.6 dB ... actual insertion loss was around -7.6 dB" | confirmed; equals evidence il_onchip_db basis derived |
| he2019 | papers he2019 `notes` | appended later-revision sentence | p.11 refs: "Nature 562, 101-104 (2018)", "Opt. Exp. 26, 23728-", QSFP-DD Rev. 4.0 URL ".../2018/09/...rev4p0-9-12-18" | confirmed |
| he2019 | devices he2019-a `il_basis` | author_estimate -> measured | p.1 abstract "exhibits an insertion loss of 2.5 dB"; p.8 Table 1 "2.5 dB"; no "estimated" | confirmed; equals evidence basis |
| he2019 | devices he2019-a `notes` | "manuscript with" -> "manuscript (a later revision than arXiv v1) with" | p.11 refs | confirmed |
| he2019 | devices he2019-b `notes` | same insertion | p.11 refs | confirmed |
| he2019 | evidence he2019-a il_onchip_db `basis` | author_estimate -> measured | p.1; p.8 | confirmed |
| he2019 | evidence he2019-a drive_vpp_v `basis` | author_estimate -> measured | p.9 Methods "SHF 807 with output saturation Vpp of 4 V"; p.16 "Vpp of 4 V is obtained after the RF amplifier" | confirmed |
| he2019 | evidence he2019-a bw3db_reference `note` | "...trace starts near 10 GHz" -> "0 dB reference not stated; traces start at a few GHz (approximate figure reading); PD response de-embedded (p.9 Methods)" | p.5 Fig. 3b (600 dpi crop): gridlines 10 and 20 GHz about 17 px/GHz apart; left axis edge about 9 GHz left of the 10 GHz line, so both traces start near 1 GHz (approximate). p.9 "frequency response of the PD (XPDV4120R) is deducted" | not confirmed (wording): traces start near 1 GHz, not "a few GHz" |
| he2019 | evidence he2019-b bw3db_reference `note` | same | same | not confirmed (wording), same fix |
| he2019 | evidence context_values simulated_vpil_experimental_structure `locator` | "p.16, Supp. II" -> "p.14, Supp. I; p.16, Supp. II" | p.14 equation image reads "the calculated Vπ·L = 2.46 V·cm" (crop viewed); p.16 "a simulated ... =2.46" | confirmed |
| boynton2020 | papers boynton2020 `notes` | Crossref-abstract sentence -> batch-CSV-hint sentence | `crossref.json` has no `abstract` key and no "30.6"/"6.7"; `data/_staging/batches/p1_02.csv` row notes "30.6 GHz, 6.7 V cm. Surfaced via Crossref title search" | confirmed |
| li2020 | papers li2020 `url` | doi.org/10.1038/s41467-020-17950-7 -> arxiv.org/pdf/2003.03259v3 | `references/li2020/source.json` url identical | confirmed |
| shen2024 | papers shen2024 `url` | doi.org/10.1038/s41566-023-01370-2 -> arxiv.org/pdf/2309.03284v1 | `references/shen2024/source.json` url identical | confirmed |
| shen2024 | evidence context_values `published_on_arxiv_v1_stamp` | added '2023-09-06' | text.md "arXiv:2309.03284v1 [quant-ph] 6 Sep 2023"; papers.csv published_on 2023-09-06 | confirmed |
| liu2025c | evidence context_values `published_on_arxiv_v1_stamp` | added '2025-11-04' | text.md "arXiv:2511.02202v1 [physics.optics] 4 Nov 2025"; published_on 2025-11-04; no crossref.json | confirmed |
| lin2026a | papers lin2026a `companies` | '' -> imec | text.md p.1 "Ghent University - imec" (both affiliations); `imec` row exists in organizations.csv (research_institute, BE) | confirmed |
| lin2026a | devices lin2026a-a `optical_power_handling_dbm` | -1.5 -> -1.55 (gt kept) | p.13 text "calculated from a 700 µW guide power"; 10 log10(0.7) = -1.549 | confirmed; equals evidence -1.55 |
| lin2026a | devices lin2026a-a `notes` | "(... = -1.55 dBm, rounded -1.5)" -> "(... = -1.55 dBm)"; inserted Fig. 4(e) VpiL sentence | p.9 Fig. 4 image panel (e) (caption calls it (d)): Exp. points about 0.085 at 1.5 um, about 0.118 at 2.0 um, about 0.16 at 2.5 um, lambda 375 nm | confirmed |
| lin2026a | evidence lin2026a-a optical_power_handling_dbm `value` | -1.5 -> -1.55 | same | confirmed |
| lin2026a | evidence context_values `published_on_arxiv_v1_stamp` | added '2026-05-04' | text.md "arXiv:2605.02758v1 [physics.optics] 4 May 2026"; published_on 2026-05-04 | confirmed |
| lin2025a | devices lin2025a-mzi `vpi_dc_v` | 31.0 -> '' (cleared) | p.3 text and p.4 Fig. 2 caption: only FSR 2.563 nm, 0.288 nm at 5 V, 41.3 pm/V over 0-20 V, r42 1268 pm/V; no Vpi or VpiL for the device | confirmed |
| lin2025a | devices lin2025a-mzi `vpi_basis` | derived -> '' | same | confirmed |
| lin2025a | devices lin2025a-mzi `qualifiers` | vpi_dc_v:approx -> '' | same | confirmed (no other qualifier was present) |
| lin2025a | devices lin2025a-mzi `vpi_convention` | per_arm_phase_shifter -> '' | same; no Vpi left to qualify | confirmed |
| lin2025a | devices lin2025a-mzi `notes` | 31 V sentence -> "No Vpi reported, none entered: ... about 31 V ... or 22 V ..., extrapolated beyond the 20 V measured range ..." | p.3: 2.563/(2 x 0.0413) = 31.0; 2.563/(2 x 0.0576) = 22.2; measured range 0-20 V | confirmed |
| lin2025a | evidence `entries` vpi_convention item | removed | same | confirmed; no orphan |
| lin2025a | evidence `derived` vpi_dc_v item | removed | same | confirmed; no vpi/vpil item remains |
| mao2024 | devices mao2024-1550 `bw_basis` | measured -> derived | p.4 text: blue changes sharply 1-8 GHz; "by compensating for the electrical properties in the low-frequency region, a broad frequency response from 1 to 70 GHz ... red line"; Fig. 3(b) caption "bandwidth larger than 70 GHz" | confirmed; equals evidence basis |
| mao2024 | devices mao2024-1550 `il_onchip_excludes` | '' -> "not stated by the authors (fiber-to-chip coupling not mentioned)" | p.6 Methods "on-chip loss ... estimated to be 5.6 dB, comprising a phase-shifter loss of 1.7 dB and other passive component losses of 3.9 dB" | confirmed (no evidence entry; 1 of 76 filled `il_onchip_excludes` cells has one, validator does not require it) |
| mao2024 | devices mao2024-1550 `notes` | appended compensated-S21 sentence | img_p04_1.png panel b: blue peak about +6 dB near 3 GHz; red reaches about -3 dB (just below) near 55-56 GHz | confirmed |
| mao2024 | evidence mao2024-1550 bw3db_ghz `basis` | measured -> derived | same | confirmed |
| mao2024 | evidence mao2024-1550 bw3db_ghz `note` | -> "Bound on the authors' low-frequency-compensated S21 (red trace); compensation method not given; wavelength not stated" | same | confirmed |

Counting: notes cells count once per cell; wang2018 = 35 CSV cells + 32 evidence items.

## Rejected and deferred findings

| Finding | Disposition | Check | Verdict |
|---|---|---|---|
| p1_02 R2-F9 weigel2018 `foundry_or_fab` Sandia | rejected (no change proposed) | p.2 "realized in a foundry Si photonics process [4]"; ref. [4] "Radio frequency silicon photonics at Sandia National Laboratories"; affiliation 2 Sandia, Applied Microphotonic Systems; papers.csv notes already state the citation route | rejection supported |
| p1_02 R2-F2 remark boynton2020 `redistribution` | left unknown (optional) | metadata-only row | acceptable |
| p3_03 / p3_04 R2-F5 `published_on` for arXiv rows | partial (evidence quotes only) + deferred rule | stamps verified: sayem2026a "30 Apr 2026", kim2025 "23 Jul 2025", sayem2026b only v2 "5 Apr 2026" (correctly empty); filled rows match their v1 stamps | deferral supported; coordinator decision still open |
| p1_02 R2-F5c sim config locator | applied to evidence; sim config listed as follow-up | `sims/` out of scope; p.14 value confirmed | follow-up still open |
| p3_03 round-1 F17, F31 | remain deferred | not re-examined (no R2 change) | n/a |

All findings in both audit reports have a disposition (p1_02 F1-F9; p3_03/p3_04 R2-F1 to R2-F8, split across the two disposition files).

## Metadata and notes

- All changed notes and context_values are accurate against the sources above.
- Added lines contain no non-ASCII characters, no absolute or home-relative paths, no emoji, no private information (scripted scan of `git diff HEAD` added lines).
- he2019-a and tran2026-a notes are slightly redundant (tran2026-a still also carries "Vpi 3.1 V in text and conclusion; the Fig. 1 center label reads Vp=3.4 V"), not an error.

## Validator and equality

- `uv run python scripts/validate_db.py`: 0 error(s).
- Evidence-vs-CSV: every changed value/basis cell equals its evidence item (tran2026-a vpi 3.1 author_estimate; he2019-a IL 2.5 measured; weigel2018-a IL 7.6 derived; mao2024-1550 BW 70 derived, qualifier gt; lin2026a-a -1.55 with qualifier gt; 30 wang2018 geometry/material cells and 2 max_baud cells). lin2025a-mzi: no vpi cell and no vpi/vpil evidence item remain.

## Issues and proposed fixes

1. he2019 `bw3db_reference` evidence notes (he2019-a and he2019-b), `data/evidence/he2019.yaml`: "traces start at a few GHz" does not match Fig. 3b (p.5), where both traces start at the left axis edge near 1 GHz (approximate reading). Proposed note: "0 dB reference not stated; traces start near 1 GHz (approximate figure reading); PD response de-embedded (p.9 Methods)". Value (unspecified) unchanged. Severity minor (note text only).

## Unrecorded changes

None. Every changed cell in scope (papers.csv, devices.csv, the eight evidence YAMLs) is recorded in a disposition file. organizations.csv and weigel2018.yaml are unchanged, as stated.
