---
verifier: fresh-context subagent
task: independent verification of Q1 audit corrections for staged batch p5_01
date: 2026-10-04
scope: data/_staging/p5_01 (bao2026a, bao2026b, deng2026a, gong2026, kawahara2026); audit p5_01-q1-claude-audit-2026-10-04.md; AUDIT_DISPOSITIONS.md; papers.csv, devices.csv (10 rows), organizations.csv (1 row), evidence/*.yaml
mode: read-only (only this file written; scratch scripts in session scratchpad; no network, no git, no merge --apply, no build_views)
verdict: all dispositions reflected in staged files and confirmed against source; 1 new minor finding (optional band fill for deng2026a), 1 cosmetic note
counts: {confirmed: 14, not_confirmed: 0, new_findings: 1 minor, cosmetic: 1}
---

# Verification: p5_01

## Method

- Read the audit, dispositions, all staged files, and `references/<id>/text.md` for all five papers.
- Figures opened and read myself (all readings approximate):
  - gong2026 img_p02_1 (Fig. 2), img_p02_2 (Fig. 3), img_p03_1 (Fig. 4).
  - kawahara2026 page_03 plus a 4x crop of Fig. 2(b) with pixel calibration (x: 18.05 px/GHz; y: 30 px/dB).
  - deng2026a img_p02_1 (Fig. 2), img_p03_1 (Fig. 4).
  - bao2026a img_p02_1 (Fig. 2); bao2026b img_p02_1 (Fig. 2).
- Scratch check (pyyaml): every evidence entry value equals its CSV cell; no duplicate (device_id, field); no note over 25 words. Non-empty cells without evidence are only enum columns (band, electrode_type, waveguide_platform, integration) that the schema does not mark `evidence: true`. 0 defects.
- Org names reused by these rows all exist exactly in `data/organizations.csv`; GlobalFoundries is the only new org.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| bao2026a | 2 | corrections confirmed (none needed) | headline cells re-checked clean |
| bao2026b | 1 | corrections confirmed (none needed) | headline cells re-checked clean |
| deng2026a | 2 | corrections confirmed | F2, F4 (incl. adjusted -b), F5; new minor N1 (band) |
| gong2026 | 2 | corrections confirmed | F1, F3, F7 |
| kawahara2026 | 3 | corrections confirmed | F5, F6, F8; cosmetic C1 |

## Changed cells and dispositions

| # | Finding | device / file | Cell | Change | Reflected in staged files | Source check | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | F1 | gong2026-a | max_line_rate_gbps | 200 -> 240 | yes (CSV, evidence value/locator/note, row notes, BATCH_REPORT l.27) | p.3: "TDECQ values of 1.6 dB at 200 Gbps and 3.1 dB at 240 Gbps"; Fig. 4(d) label "240Gbps 1.92Vppd, 3.1 dB TDECQ"; presented as achieved | confirmed |
| 2 | F1 | gong2026-a | max_baud_gbd | kept 100 | yes | Fig. 4(f) x-axis 53-100 GBd; 120 GBd never stated | confirmed |
| 3 | F2 | deng2026a-a evidence | energy_per_bit_fj basis | measured -> derived (value 2470 unchanged) | yes | p.3 Sec. 6: 831 mW / 336 Gb/s = 2.47 pJ/b (831/336 = 2.473) | confirmed |
| 4 | F3 | papers.csv gong2026 | foundry_or_fab | GlobalFoundries -> empty | yes; papers notes, gong2026-a notes (sentence removed), org notes "Malta, NY; gong2026 p.1 sole affiliation" all updated | p.1-3: no fab or process named; title "300-mm Monolithic CMOS Silicon Photonics Foundry"; sole affiliation GlobalFoundries | confirmed |
| 5 | F4 | deng2026a-a notes + bw3db evidence note | text | "median" wording replaced | yes | Fig. 2(d) label "EO 3 dB Bandwidth = 40.8 GHz" on -3 V trace; inset "Median = 38.0 GHz", "Max = 43.0 GHz"; median of the 12 legible die values computes to 38.1 GHz, consistent with the inset; one die reads 40.8. -3 V trace crosses -3 dB at about 39-40 GHz | confirmed |
| 6 | F4 adj. | deng2026a-b notes + bw3db evidence note | text | same fix for 52.9 GHz | yes | Fig. 2(d) label "EO 3 dB Bandwidth = 52.9 GHz" (no "median"); -6 V trace crosses at about 51-52 GHz | confirmed |
| 7 | F5 | deng2026a-a/-b evidence | drive basis | design_target -> measured | yes (both) | p.2: "These two p-n junctions are serially connected to form a push-pull configuration" | confirmed |
| 8 | F5 | kawahara2026-a/-c evidence | drive basis | design_target -> derived, new note | yes (both) | p.1 "When driven by differential signals ..."; p.2 setup states only AWG + broadband amplifier + probe | confirmed |
| 9 | F6 | kawahara2026-c notes | text | prefix on drive_vpp_v vs 200 Gb/s pairing | yes | Fig. 3(a) 112 Gb/s eye "2.0 V"; Fig. 3 caption PAM4 "Vpp = 5.2-4.2 V" | confirmed |
| 10 | F7 | gong2026-a notes + z0 evidence note | text | "differential" stated | yes | p.3: "around 70 ohm (differential)" | confirmed |
| 11 | F8 adj. | kawahara2026-a | band | empty -> c_band (derived) | yes (CSV + evidence) | p.1 "ng ~ 30 in the C-band"; p.2 EDFA compensates setup losses; no wavelength stated | confirmed |
| 12 | F8 adj. | kawahara2026-b | band | empty -> c_band (derived) | yes | same | confirmed |
| 13 | F8 adj. | kawahara2026-c | band | empty -> c_band (derived) | yes | same; optical_input_power_dbm left empty (13 dBm is laser light into lensed fiber) | confirmed |
| 14 | F9 | papers.csv (all 5) | license | rejected (no change) | n/a | Footer "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group" on every page of all five text.md; coordinator convention accepted; notice to be added to evidence files before merge | rejection reason confirmed |

## Independent headline re-check (all rows)

| Row | Cells checked | Result |
|---|---|---|
| bao2026a-a | bw3db 110 gt, bw_measured_to 110 approx, wavelength 1310.8, ER 18 gt static, Q 2300, FSR 11, 0.037 nm/V, 1 Vpp single-ended, max rate 416 | clean. Fig. 2(d) red trace stays above about -1.4 dB to its end at about 110 GHz; 0 V dip at about 1310.8 nm, about -18.5 dB; FSR dips at about 1310.8 and 1321.9 nm. 416 (stated headline) over 448 (text: eye "gradually closes") accepted |
| bao2026a-b | bw3db 64 | clean; blue trace crosses -3 dB at about 63-64 GHz |
| bao2026b-a | bw3db 65 approx, bw_measured_to 100, ER 16 approx static, wavelength 1326.3, Q 3500, FSR 19.6, 0.025 nm/V, 8 fF, 2 Vpp, 256 Gb/s | clean; trace first touches -3 dB at about 62-63 GHz, label "~ 65 GHz" and text "65 GHz"; 0 V dip about -15.7 dB at about 1326.32 nm |
| deng2026a-a | length 2.5, VpiL 1.5 (unspecified), bw3db 40.8, ER 3.38 dynamic, 3.2 Vppd, 112 GBd, 336 Gb/s, 2470 fJ/bit | clean; Fig. 4(b)/(c)/(e) labels ER 4.05 / 3.38 dB, RLM 94.4%, TDECQ 1.25 dB, 336 Gb/s PAM8; no IL or Vpi in V reported |
| deng2026a-b | length 2.5, bw3db 52.9 | clean |
| gong2026-a | VpiL 1.80, loss 10.3 dB/cm, bw3db 61, ER 3.2 dynamic, z0 70 approx, 3.2 Vppd, 100 GBd, 240 Gb/s | clean; Fig. 2(a) lot means 1.79-1.83; Fig. 2(b) about -10.0 to -10.5 dB/cm; Fig. 3(a) crossings about 58-66 GHz, Fig. 3(c) means about 58-63.5; Fig. 4(f) ER flat about 3.2 dB (about 3.15 at 100 GBd). Abstract's "3.7 dB ER in 200 Gbps" is the conditional matched-drive DC ER, correctly not entered and noted |
| gong2026-b | bw3db 67 gt, bw_measured_to 67 | clean; traces end at about 66 GHz, lowest about -2.9 dB; 67 GHz LCA limit and text ">67 GHz" |
| kawahara2026-a | bw3db 66 gt, bw_measured_to 66 approx, ng 30 approx design_target | clean; calibrated crop: solid red trace ends at about 66.3 GHz at about -0.3 dB; dotted extrapolation reaches -3 dB at 80 GHz; peak about +6 dB at about 40-46 GHz |
| kawahara2026-b | bw3db 35 | clean; black trace crosses -3 dB at about 35.6-36.7 GHz, ends at about 66 GHz, about -9.5 dB |
| kawahara2026-c | drive_vpp 2 approx, 200 Gb/s | clean; eye labels and TDEC/TDECQ values in modulation_format match Fig. 3 |

## New findings

**N1 (minor, optional; deng2026a-a and deng2026a-b, band empty).**
- Source: Fig. 4(a) test setup (img_p03_1) labels a "PDFA" (praseodymium-doped fiber amplifier, O-band) after the grating-coupled output; no wavelength is stated in text.
- This is the same inference class the coordinator applied to kawahara2026 (F8: EDFA -> c_band, basis derived).
- Proposed fix for consistency:
  - devices.csv deng2026a-a `band` empty -> `o_band`; deng2026a-b `band` empty -> `o_band`.
  - evidence/deng2026a.yaml, one entry per row: `field: band`, `value: o_band`, `unit: ''`, `basis: derived`, `locator: p.3, Fig. 4(a)`, `note: PDFA (O-band amplifier) in test setup; wavelength not stated`.
  - Row notes "Not reported: wavelength" stay valid.
- If not applied, no defect remains; band empty is also defensible.

**C1 (cosmetic, kawahara2026-c notes).** After the F6 prefix, the note states the drive pairing twice ("drive_vpp_v refers to 112 Gb/s OOK; the 200 Gb/s PAM4 max rate used 4.2-5.2 Vpp." and later "OOK 112 Gb/s DSP-free at Vpp about 2 V; PAM4 uses Vpp 4.2 to 5.2 V (Fig. 3 caption, per-rate mapping not given)."). Optional: drop the second sentence's first clause, keep "(Fig. 3 caption, per-rate mapping not given)". No value change.

No not-confirmed items.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_01`:

```
merge counts: {'papers': 5, 'devices': 10, 'orgs': 1, 'evidence': 5}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
