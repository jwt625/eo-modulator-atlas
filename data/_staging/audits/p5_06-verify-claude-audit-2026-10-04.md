---
verifier: fresh-context subagent (independent verifier)
task: verify Q1 audit corrections for staged batch p5_06
date: 2026-10-04
scope: data/_staging/p5_06 (bhasker2026, oe2026, ohata2026, okuda2026, theurer2026); papers.csv, devices.csv (4 rows), organizations.csv, evidence/*.yaml; audit data/_staging/audits/p5_06-q1-claude-audit-2026-10-04.md; dispositions data/_staging/p5_06/AUDIT_DISPOSITIONS.md
mode: read-only (only this file written; no edits to staged files, no git, no network, no merge --apply, no build_views)
verdict: corrections confirmed; merge-ready
counts: {confirmed: 7, not_confirmed: 0, new_findings: 0}
---

# Independent verification: p5_06

## Method

- Read the audit, the dispositions, all staged files, and the full `references/<id>/text.md` for the five papers.
- Figure readings (all approximate, my own):
  - bhasker2026 Fig. 5 (`figures/img_p02_1.png`): pixel-digitized the measured blue SSD21 trace with axes calibrated on the gridlines (0 GHz at x=97, 6.25 px/GHz; 0 dB at y=118, 17.0 px/dB).
  - theurer2026 Fig. 2(b) and 2(c): re-rendered PDF page 2 at 600 dpi (pymupdf, scratch output only) and pixel-digitized against the gridlines.
  - okuda2026 Fig. 2(b): re-rendered at 600 dpi.
  - oe2026 Fig. 4(a) (`figures/img_p03_1.png`) and theurer2026 Fig. 3 (`img_p02_1.png` to `img_p02_4.png`, legend in `img_p02_4.png`): visual check.
- Mechanical check (scratch script): every evidence-required non-empty cell has an evidence entry with an equal value. No evidence for empty cells, no orphan entries for the deleted ohata2026 rows, no duplicates, no note over 25 words. `license_notice` context value present in all 5 evidence files. No absolute or home-relative paths in `data/_staging/p5_06`.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| bhasker2026 | 1 | corrections confirmed | F3 note matches Fig. 5 |
| oe2026 | 1 | corrections confirmed (no corrections; headline cells re-checked clean) | - |
| ohata2026 | 0 (papers row only) | corrections confirmed | F1/F2 applied; citations to refs 8 and 10 confirmed |
| okuda2026 | 1 | corrections confirmed (no corrections; headline cells re-checked clean) | - |
| theurer2026 | 1 | corrections confirmed | F4 note matches Fig. 2(b) |

## Changed cells and verdicts

| Item | Change | Source check | Verdict |
|---|---|---|---|
| F1 ohata2026-a | row deleted | p.1-2: "The EML 3-dB bandwidth achieved 106 GHz thanks to the narrow high-mesa waveguide structure [8]". Ref [8] = Okuda et al., "High-speed 340 Gbps PAM4 and 450 Gbps PAM6 Operations of Narrow High-Mesa EML", OFC2025 Tu2J.7, whose title is the Fig. 2 eye result (340 Gb/s PAM4 TDECQ 3.9 dB, 450 Gb/s PAM6). The "20 GHz improvement compared to our previous work" belongs to the same cited result. | confirmed |
| F1 ohata2026-b | row deleted | p.3: "The 3-dB bandwidth of 110 GHz was achieved for this configuration [10]". Ref [10] = Masuyama et al., "110 GHz Bandwidth Flip-Chip Bonded EML ...", ECOC2025 W.01.02.3. | confirmed |
| F1 evidence/ohata2026.yaml | 8 entries -> `entries: []` | header, `derived: []` and `license_notice` kept; no orphan entries | confirmed |
| F2 papers ohata2026 | `repro_grade` C -> empty; notes replaced | notes text equals the F2 text; source_type conference, companies, research_groups, countries unchanged | confirmed |
| F3 bhasker2026-a notes + bw3db_ghz evidence note | ripple note added; value 83 approx unchanged | Fig. 5 digitized: -2.71 dB at 70 GHz, -3.09 dB at 71 GHz, -3.29 dB at 72 GHz, -3.32 dB at 73 GHz, -3.12 dB at 74 GHz, back above -3 dB from about 75 GHz (-2.4 to -2.6 dB at 76-79 GHz), last crossing about 81-83 GHz (trace overlaps the orange simulated curve there), -6 dB between 99 and 100 GHz. First crossing is about 71 GHz; the minimum of the dip is about -3.3 dB near 72-73 GHz. The note "dips just below -3 dB near 72 GHz (about -3.3 dB, Fig. 5 reading); 83 GHz is the final crossing" matches. The disposition's -3.3 dB is closer to my reading than the auditor's -3.5 dB. Stated value 83 and approx are kept per convention (c). | confirmed |
| F4 theurer2026-a extinction_ratio_db evidence note | note extended; value 12 approx static unchanged | Fig. 2(b), 600 dpi: -12.5 to -12.8 dB at -3.5 V (axis end); at -2.0 V the four traces read -3.5 to -4.1 dB (EML#1 black about -3.6, others about -3.9 to -4.1). "about 3 to 4 dB at -2 V" is within the reading (upper end slightly under about 4.1, acceptable as approximate). The note is 25 words, at the limit. | confirmed |
| C1 license_notice | added to all 5 evidence YAML | footer "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group" printed on pages 1-3 of each text.md | confirmed |

Rejected or record-only items:
- F5 (advisory, rejected, no change). er_type: dynamic for bhasker2026 (3.8 dB RF ER, Fig. 6), oe2026 (5.2 dB after FFE) and okuda2026 ("approximately 4 dB"). Static for theurer2026 (the only ER given). All match the sources, so the rejection is sound.
- F6 (record only). Present in the `BATCH_REPORT.md` ohata2026 section.

## Independent headline re-check (all rows)

| Row | Cell | Value | Source | Verdict |
|---|---|---|---|---|
| bhasker2026-a | bw3db_ghz | 83 approx, ref dc | p.1 and p.2 "close to 83GHz"; Fig. 5 label "~83GHz" | ok (ripple note present) |
| bhasker2026-a | bw6db_ghz | 99 approx | p.2; Fig. 5 crossing about 99.5 GHz | ok |
| bhasker2026-a | extinction_ratio_db | 3.8 dynamic | p.3; Fig. 6 caption | ok |
| bhasker2026-a | wavelength_nm | 1314 approx | p.2 "around 1314nm" | ok |
| bhasker2026-a | drive_vpp_v / drive | 1.5 Vppd, differential | p.1, p.2 | ok |
| bhasker2026-a | max_baud / line rate | 160 GBd / 413 Gb/s (PAM6) | p.2-3, Figs. 6-7 | ok (intro "360" PAM4 discrepancy recorded in papers notes) |
| bhasker2026-a | length, Vpi, IL | empty | modulator length not given; no Vpi or IL stated | ok |
| oe2026-a | bw3db_ghz | 80, ref dc | abstract, p.2-3; Fig. 4(a) crosses -3 dB near 80 GHz | ok |
| oe2026-a | extinction_ratio_db | 5.2 dynamic | p.3 after FFE | ok |
| oe2026-a | wavelength_nm | 1311.1 | p.2 | ok |
| oe2026-a | drive_vpp_v / drive | 2.0, differential | p.3 | ok |
| oe2026-a | max_baud / line rate | 113.4375 / empty | p.3; no line rate stated | ok |
| oe2026-a | length | empty | EA lengths not given (only EA1 > EA2) | ok |
| okuda2026-a | bw3db_ghz | 100 gt, bw_measured_to 100 | abstract ">100 GHz"; Fig. 2(b) at 600 dpi: minimum about -2.3 dB near 98 GHz, ends about -1.7 dB at the 100 GHz axis edge, no crossing | ok |
| okuda2026-a | extinction_ratio_db | 4 approx dynamic | p.2 "approximately 4 dB" | ok |
| okuda2026-a | wavelength_nm | 1310 | p.2 "1.31 um" | ok |
| okuda2026-a | drive_vpp_v | 1.5 Vppd | p.2 | ok |
| okuda2026-a | max_baud / line rate | 180 / 360 | abstract, Fig. 3(a), TDECQ 3.3 dB BtB | ok |
| theurer2026-a | bw3db_ghz | 65 approx, bw_measured_to 67 approx | p.2 "approximately 65 GHz", conclusion "65 GHz". Fig. 2(c) at 600 dpi: traces between about -1.6 and -2.9 dB (band centre) over 60-67 GHz; lower edge first reaches -3 dB near 64-65 GHz (dip to about -3.6 dB at 65 GHz); data end at 67 GHz | ok |
| theurer2026-a | extinction_ratio_db | 12 approx static | p.2; Fig. 2(b) | ok |
| theurer2026-a | length_mm | 0.08 | p.1 "80 um long EAM" | ok |
| theurer2026-a | drive_vpp_v | 1.2 | Fig. 3 caption | ok |
| theurer2026-a | max_baud / line rate | 145 / 290 | p.3. Fig. 3: in every EML panel the 145 GBd (purple) curve is below 3.8e-3 at 10 dBm; 150 GBd (green) is not | ok |
| theurer2026-a | wavelength_nm | empty | only "O-band" stated | ok |

No new defects found.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_06`:

```
merge counts: {'papers': 5, 'devices': 4, 'orgs': 3, 'evidence': 5}; conflicts: 0; validation errors: 0
dry run (nothing written)
```

## Issues and proposed fixes

None.
