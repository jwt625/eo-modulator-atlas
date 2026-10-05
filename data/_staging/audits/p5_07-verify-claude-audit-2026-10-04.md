---
verifier: fresh-context subagent
task: independent verification of the Q1 audit corrections for staged batch p5_07
date: 2026-10-04
scope: data/_staging/p5_07 (hulyal2026, valdez2026, xu2026a, xu2026b, hess2026); audit p5_07-q1-claude-audit-2026-10-04.md; AUDIT_DISPOSITIONS.md; devices.csv (6 rows), papers.csv, evidence/*.yaml
mode: read-only (only this file written; scratch scripts in the session scratchpad; no git, no network, no --apply)
verdict: corrections confirmed; no blocking or numerical defect; 4 minor new findings (note/text precision only); merge-ready
counts: {confirmed: 13, not_confirmed: 0, new_findings: 4 (all minor)}
---

# Verification: p5_07 audit corrections

## Method

- Read the audit, the dispositions, all staged files, and `data/schema/devices.schema.yaml` convention (c) (coordinator ruling applied as given: paper's stated bound with `gt`, measured range in `bw_measured_to_ghz`, trace behaviour in notes; a paper whose own data contradict its bound gets an empty cell plus a conflict note).
- Read the full `references/<id>/text.md` of all 5 papers.
- Figure readings (all approximate):
  - xu2026a Fig. 4(b) (img_p03_3): pixel trace extraction, dashed -3 dB line rows 274-276, 0/-2/-4 dB tick rows about 72/207/342.
  - xu2026b Fig. 3(c): vector polyline extracted from `source.pdf` p.2 with axis ticks from the PDF (exact, not raster).
  - valdez2026 Fig. 2(a): vector polyline from `source.pdf` p.3 (red tick lines at -5/-10/-15/-20 dB); Fig. 2(c)/(d) (img_p03_2, img_p03_4): dot centroids, dashed 0 and -3 dB rows 64 and 121 (19 px/dB), x 10.0 px/GHz from the axis box.
  - hess2026 Fig. 1(d)/(e) (img_p02_1) and Fig. 2(a)/(b) (img_p03_1, 3x crops): gridline calibration.
  - hulyal2026 Fig. 2(d)/(g) (img_p02_1).
- Dry run of `scripts/merge_staging.py`.

## Per-paper verdicts

| Paper | Verdict | Notes |
|---|---|---|
| hulyal2026 | corrections confirmed | no findings; headline cells re-checked clean |
| valdez2026 | corrections confirmed | N1, N4 minor (Fig. 2(a) peak value in text cell; locator) |
| xu2026a | corrections confirmed | stated bound and trace note confirmed |
| xu2026b | corrections confirmed | stated bound and trace note confirmed (vector data) |
| hess2026 | corrections confirmed | N2, N3 minor (Fig. 2 note precision; text/figure mismatch in modulation_format) |

## Changed cells and notes

| Item | device_id / file | Change | Source check | Verdict |
|---|---|---|---|---|
| F1 | xu2026a-a `bw3db_ghz` 110 gt kept; notes + evidence note | trace touches -3 dB near 101-104 GHz, ends near -2.7 dB | Text p.1 "exceeds 110 GHz", p.2 "extending beyond 110 GHz", Fig. 4 caption "beyond 110 GHz". Trace centre minimum about -2.97 dB at about 101-103 GHz (rows 270-273 vs dashed 274-276); ends about -2.75 dB at 110 GHz; also about -2.85 dB near 91 GHz | confirmed |
| F2 | xu2026b-a `bw3db_ghz` 110 gt kept; notes + evidence note | trace touches -3 dB near 103-104 GHz, ends near -2.5 dB | Text p.1 abstract ">110 GHz", p.2 "exceeds 110 GHz", Fig. 3(c) label "3-dB EO bandwidth > 110 GHz". Vector trace: minimum -2.99 dB at 103.5-103.8 GHz (below -2.9 dB only 102.8-104.1 GHz), never below -3.0; ends -2.55 dB at 109.96 GHz | confirmed |
| F3 | valdez2026-a `bw3db_ghz` 50 gt kept; notes + evidence note | isolated 46 GHz point about -3.2 dB; fit about -1.8 dB at 50 GHz | Abstract/intro/conclusions "over 50 GHz". Fig. 2(d): point at about 45.5 GHz, -3.22 dB; neighbour 44.6 GHz -2.37 dB; fit about -1.6 to -1.8 dB near 47-50 GHz | confirmed |
| F4 | valdez2026-b `bw3db_ghz` empty; notes + `bw_measured_to_ghz` evidence note | contradiction note | p.3 text "3-dB bandwidths greater than 50 GHz" (both devices). Fig. 2(c): data about -2.7 to -3.0 dB at 24-25 GHz, -4.0 dB at about 25.7 GHz, -3.4 to -3.6 dB at 28-30 GHz, about -3.9 dB at 50 GHz; fit about -3.05 to -3.1 dB at 50 GHz. Data contradict the stated bound, so empty cell + conflict note is the correct application of the ruling | confirmed |
| F5 | valdez2026-a `il_onchip_includes`, `il_onchip_excludes` + 2 evidence entries | includes "device insertion loss as stated (not itemised)"; excludes "not stated; Fig. 2(a) fiber-to-fiber peak about -3.5 dB suggests edge coupling excluded" | Conclusions credit PDK edge-coupling/routing/splitting components; intro says "total insertion loss of the device is 1.75 dB"; Fig. 2(a) labelled fiber-to-fiber (p.2). Vector peak of the red trace is -3.32 dB at 1550.5-1550.9 nm (flat top), i.e. about 1.6 dB above the 1.75 dB value: edge coupling excluded is supported | confirmed (value precision: N1) |
| F6 | valdez2026-a `vpil_dc_vcm` evidence note; row note sentence | 1.36 = 6.8 V x 0.2 cm; RAMZM Vpi effective | p.1 intro "Vπ of 6.8 V ... 1.36 V·cm"; p.2 "6.7 V ... 1.4 V·cm"; Fig. 2(b) label "Vπ = 6.7 V"; p.2 "coupling coefficient modulator" | confirmed |
| F7 | valdez2026-b `vpi_dc_v` evidence note | fit extrapolation beyond +-10 V scan | p.2 20 Vpp at 1 MHz; Fig. 2(b) data span about -10 to +10 V, 20.9 V arrow spans the fit | confirmed |
| F8 | xu2026a-a row note | FOM uses 1.045 V and 110 GHz | 110/1.045^2 = 100.7 GHz/V^2 (text p.1, p.2) | confirmed |
| F9 | hess2026-a row note, papers.csv note, `il_onchip_db` evidence note | 2.2 dB = 7.8 - 2 x 2.8 | Fig. 1 caption "lowest loss of 7.8 dB at 1303.3 nm"; p.2 GC "approximately 2.8 dB each"; 2.6 dB "at the operating wavelength" | confirmed |
| F10 | hess2026-a `wavelength_nm` 1317 kept; evidence note | ER 12.5 dB matches dip near 1305 nm | Fig. 1(d) dips at about 1302.0, 1304.7, 1307.4, 1310.1, 1312.8, 1315.5, 1318.3 nm with depths about -12, -12.6, -14.2, -15.8, -17.4, -18.8, -20.7 dB; 12.5 dB matches the 1304.7 nm dip (Setup A laser 1305.2 nm). 1317 nm is the Setup B laser ("TLS at 1317 nm", p.1) that gives 445 Gb/s | confirmed |
| F11 | hess2026-a `max_baud_gbd` 224 kept; evidence note | Fig. 2(a) Setup A PAM4 to about 230-240 GBd, NDR about 355 | 224 GBd in text (p.1, p.2, Conclusions). Fig. 2(a) last Setup A PAM4 cross about 232 GBd at about 355 Gb/s; Fig. 2(b)-(d) Setup A PAM4 extend to 240 GBd (AIR about 357) | confirmed (note precision: N2) |
| F12 | hess2026-a `tags` athermal -> temperature_tolerant; `bw3db_ghz` evidence note; `optical_input_power_dbm` empty -> 11 + evidence | | p.2 Sec. 3 0.048/K and 0.054/K, "lower temperature susceptibility". Fig. 1(e) trace starts at 0 dB, rises to about +1 to +2 dB with a final bump near 100 GHz, never below about 0 dB; axis ends at 100 GHz. p.1 Sec. 2: TLS "with a power of 11 dBm" in both setups (Fig. 1(a) and 1(b)); schema "launch/on-chip optical power used in the measurement"; note "chip coupling loss not deducted" correct (GC about 2.8 dB) | confirmed |
| F13 | valdez2026 `wavelength_nm` locators | p.2 Sec. 2; p.3 Fig. 2 caption | "around 1550 nm" is on p.2; caption "near 1550 nm" on p.3 | confirmed |

All 13 dispositions are reflected in `devices.csv`, `papers.csv` and `evidence/*.yaml` exactly as stated in `AUDIT_DISPOSITIONS.md`.

## Independent re-check of headline cells

| Row | Cells checked | Result |
|---|---|---|
| hulyal2026-a | Vpi 4.71 V (Fig. 1(c) label, caption "Measured DC half-wave voltage"); length 7.6 mm (caption, p.3); band c_band (192.517-193.259 THz); max_baud 100 (PAM4); max_net 223 approx (Fig. 2(g) f4 NDR about 222-223; others about 197-219); aggregate 1.6943 Tb/s (caption); IL/ER/BW/wavelength empty (MZM values not reported; AWG 10 dB + 4 dB kept out) | clean |
| valdez2026-a | wavelength 1550 approx; length 2 mm; Vpi 6.7 V; VpiL 1.36; IL 1.75 dB; BW 50 gt / measured-to 50; film 300 nm; gap 5 um; signal 10 um; Al 1 um | clean |
| valdez2026-b | Vpi 20.9 derived; VpiL 4.2; length 2 mm; BW empty / measured-to 50 | clean |
| xu2026a-a | wavelength 1310; length 15 mm; Vpi 1.089 (avg), VpiL 1.63 (text p.2); BW 110 gt ref 2 GHz; IL 1.2 dB GC normalized; ER 35 gt (caption "greater than 35 dB", text "up to 35 dB", note records both); RF loss 4.8 dB/cm at 110 GHz; film 400 nm; trench 200 nm | clean |
| xu2026b-a | wavelength 1550; length 18 mm; Vpi 1.35 (avg, +-4%); BW 110 gt / measured-to 110 (trace ends 109.96 GHz); IL 2.4 on-chip, 12 f2f approx; ER 42 approx; prop 0.1 approx; 226 GBd; line 768; net 536.6 (226 x (3.4 - 0.2564 x 4) = 536.6); 23 dBm | clean |
| hess2026-a | wavelength 1317; length 0.006 mm (6 um slot); BW 100 gt / measured-to 100; IL 2.6 dB excl. GCs; ER 12.5 static; FSR 2.7 approx ((1318.3-1302.0)/6 = 2.72 nm); max_baud 224; max_net 445 (Fig. 2(a) Setup B PAM8 circle about 168 GBd, about 447 Gb/s); input power 11 dBm | clean (see N2, N3 for text cells) |

## New findings (all minor; no cell value change)

**N1 (minor). valdez2026-a: Fig. 2(a) peak is about -3.3 dB, not about -3.5 dB.**
- Source: p.3 Fig. 2(a) vector data; red trace maximum -3.32 dB at about 1550.5-1550.9 nm (red ticks -5/-10/-15/-20 dB at y = 89.9/104.8/119.7/134.6 pt).
- Fix: `devices.csv` valdez2026-a `il_onchip_excludes` -> "not stated; Fig. 2(a) fiber-to-fiber peak about -3.3 dB suggests edge coupling excluded". `evidence/valdez2026.yaml` valdez2026-a `il_onchip_excludes`: value same as the cell; note -> "Authors do not state exclusions; Fig. 2(a) fiber-to-fiber peak about -3.3 dB is about 1.6 dB above the on-chip value". Conclusion unchanged.

**N2 (minor). hess2026-a: `max_baud_gbd` evidence note conflates panels.**
- Source: p.3 Fig. 2(a) last Setup A PAM4 point about 232 GBd (NDR about 355 Gb/s); Fig. 2(b)-(d) Setup A PAM4 points extend to 240 GBd (AIR about 357 Gb/s).
- Fix: `evidence/hess2026.yaml` hess2026-a `max_baud_gbd` note -> "224 GBd PAM4 (text); Fig. 2(a) last Setup A PAM4 point about 232 GBd (NDR about 355 Gb/s); Fig. 2(b)-(d) extend to 240 GBd". Cell 224 unchanged.

**N3 (minor). hess2026-a: two text rate statements in `modulation_format` disagree with Fig. 2(a).**
- Source: p.2 Sec. 4 says "net 400Gbps ... 160GBd PAM8 in Setup A" and "396Gbps @ 224GBd" (PAM4, Setup A). On Fig. 2(a) (legend: cross = Setup A), Setup A PAM8 is about 378 Gb/s at 160 GBd and first reaches about 405 Gb/s at about 176 GBd; Setup A PAM4 at 224 GBd is about 385 Gb/s (a second point about 349 Gb/s). Setup B PAM8 is about 398 Gb/s at 144 GBd, consistent with the text. The same paragraph also swaps which setup has the higher bandwidth.
- Fix (note only, values kept from text): append to `devices.csv` hess2026-a `notes`: "Fig. 2(a) disagrees with two text values: Setup A PAM8 about 378 Gb/s at 160 GBd (400 reached near 176 GBd); Setup A PAM4 about 385 Gb/s at 224 GBd." No headline cell affected (max_net 445 is from Setup B and matches the figure).

**N4 (minor). valdez2026-a: `il_onchip_includes` evidence locator omits the intro wording.**
- Source: p.1 Sec. 1 "the total insertion loss of the device is 1.75 dB"; abstract "insertion loss of 1.75 dB"; Conclusions "on-chip insertion loss of 1.75 dB".
- Fix: `evidence/valdez2026.yaml` valdez2026-a `il_onchip_includes` locator "p.3 Conclusions" -> "p.1 Sec. 1; p.3 Conclusions"; note -> "Intro: total device insertion loss; conclusions: on-chip, crediting PDK edge-coupling, routing, splitting; coupler inclusion not stated".

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_07`:

```
merge counts: {'papers': 5, 'devices': 6, 'orgs': 3, 'evidence': 5}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
