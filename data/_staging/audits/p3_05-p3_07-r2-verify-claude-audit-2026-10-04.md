---
verifier: fresh-context subagent
task: independent verification of round-2 audit corrections for p3_05, p3_06, p3_07
date: 2026-10-04
scope: li2025b, montifiore2026, steckler2025 (p3_05); hu2026, geravand2025, zhong2026, gupta2023 (p3_06); lu2020, schwarzenberger2026, zwickel2020 (p3_07)
dispositions: data/_staging/p3_05/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_06/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_07/AUDIT_DISPOSITIONS_R2.md
audit: data/_staging/audits/p3_05-p3_07-r2-claude-audit-2026-10-03.md
mode: read-only except this report; git diff HEAD on data/ only; no build_views or merge scripts
verdict: corrections confirmed, one minor evidence-note wording issue (zwickel2020-gate300 z0_ohm note)
counts: {changed_items: 16, confirmed: 15, not_confirmed: 1}
validator: "uv run python scripts/validate_db.py -> 0 error(s)"
---

# Verification: p3_05-p3_07 round-2 corrections

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` (HEAD vs working tree, rows of the ten papers only) and `git diff HEAD` of the ten evidence files. organizations.csv: no changes for these papers.
- zwickel2020 priority items: rendered `references/zwickel2020/source.pdf` pages 5, 7, 8, 9, 11 (150 dpi) and pages 8, 11 at 500 dpi with pymupdf. Axis calibration from the plot frame and gridlines (Fig. 4 panels: frame = 0-100 GHz and 0-1.2 /mm, gridlines every 10 GHz / 0.2 /mm at 137 px / 96.2 px; Fig. 2 panels: tick-label centroids, 13.8 px/GHz). Measured (blue) points read in the 49-51 GHz column window with a blueness-weighted intensity distribution, because the 0 V point cloud in Fig. 4(a) is semi-transparent and fades upward (a hard colour mask truncates the top of the cloud). All figure readings are approximate.
- hu2026: 10x crop of `references/hu2026/figures/img_p31_1.png` (Fig. 3(e)).
- Other changes: `references/<id>/text.md` searched for the quoted sentences, page numbers taken from the page markers.

## zwickel2020 RF loss: independent derivation (done before using the corrector's numbers)

1. Convention. p.5 Eq. (4): gamma = alpha + j beta; "Note that in these relations alpha denotes an amplitude attenuation coefficient. The corresponding power attenuation coefficient amounts to 2 alpha." Fig. 4 and Fig. 2(f) axes are alpha (1/mm) = Re{gamma}, i.e. Np/mm (field). Conversion: dB/cm = 20 log10(e) x alpha[1/mm] x 10 = 86.86 x alpha. Factor in the rows (8.686 x 10) is correct.
2. Readings at 50 GHz (approximate):

| Source | Trace | alpha (1/mm), centre | spread | dB/cm centre | dB/cm range |
|---|---|---|---|---|---|
| p.11 Fig. 4(a), Ugate 0 V | measured points (blue), 49-51 GHz | 0.245-0.25 (weighted median; mean 0.252) | 0.215-0.30 (2.5-97.5 pct) | 21-22 | 19-26 |
| p.11 Fig. 4(a) | model, red Re{gamma} / black sum | about 0.19-0.20 | - | 17 | - |
| p.8 Fig. 2(f), de-embedded black (gate 0 V) | measured, noisy | 0.29 (median) | 0.24-0.36 (5-95 pct) | 25 | 21-31 |
| p.11 Fig. 4(c), Ugate 300 V | measured points (blue), 49-51 GHz | 0.76 (weighted median; mean 0.761) | 0.65-0.84 (2.5-97.5 pct); 0.69-0.82 (10-90 pct) | 66 | 56-73 |
| p.11 Fig. 4(c) | model, red Re{gamma} | about 0.70 (black sum 0.66) | - | 61 | - |

3. Result: gate 0 V about 22 dB/cm (range 19-26 from Fig. 4(a); Fig. 2(f) de-embedded trace sits higher, about 25, 21-31). Gate 300 V about 66 dB/cm (range 56-73). The old values 17 and 59 correspond to the model curves (0.19-0.20 and 0.68-0.70). Corrector's 22 and 66 match my centres; the auditor's 21 (0.24) is within the same reading uncertainty. Corrector's stated gate-300 scatter (0.68-0.84, 59-73 dB/cm) is slightly narrower at the low end than my 2.5 percentile (0.65); acceptable for an approx note.

## Per-paper summary

| Paper | Changed items | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| li2025b | 6 (papers notes; electrode_metal a, b; vpi_basis c, d; electrode_thickness evidence notes a, b) | 6 | 0 | corrections confirmed |
| montifiore2026 | 1 (evidence capacitance basis/note) | 1 | 0 | corrections confirmed |
| steckler2025 | 0 (R2-F3 deferred) | - | - | no change; deferral supported |
| hu2026 | 1 (hu2026-a notes) | 1 | 0 | corrections confirmed |
| geravand2025 | 1 (geravand2025-b qualifiers) | 1 | 0 | corrections confirmed |
| zhong2026 | 0 | - | - | no change |
| gupta2023 | 0 (R2-F3 deferred) | - | - | no change; deferral supported |
| lu2020 | 0 | - | - | no change |
| schwarzenberger2026 | 0 | - | - | no change |
| zwickel2020 | 7 (rf_loss gate0, gate300 cells + evidence; row notes x2; z0 evidence gate0, gate300) | 6 | 1 | issues (one note wording) |

## Changed cells

| # | Paper / row | File, field | Old -> new | Source locator | Verdict |
|---|---|---|---|---|---|
| 1 | zwickel2020-gate0 | devices.csv rf_loss_db_per_cm | 17 -> 22 (approx kept) | p.5 Eq. (4) note (amplitude alpha); p.11 Fig. 4(a) measured points 0.245-0.25 /mm at 50 GHz; p.8 Fig. 2(f) | confirmed (22, range 19-26) |
| 2 | zwickel2020-gate300 | devices.csv rf_loss_db_per_cm | 59 -> 66 (approx kept) | p.11 Fig. 4(c) measured points 0.76 /mm at 50 GHz | confirmed (66, range 56-73) |
| 3 | zwickel2020-gate0/-gate300 | evidence rf_loss_db_per_cm | derived (17/59, formula) -> entries, basis extracted_from_figure, value 22/66, unit dB/cm, locators "p.11 Fig. 4(a); p.8 Fig. 2(f)" / "p.11 Fig. 4(c)"; `derived: []` | as above | confirmed; evidence = CSV (22, 66) |
| 4 | zwickel2020-gate0 | evidence z0_ohm | basis derived -> measured; locator -> "p.7-8 Sec. 3; Fig. 2(d)"; note "de-embedded Re Z0 about 51-55 ohm from 5 to 50 GHz" | p.7 (Fig. 2 S-parameters at Ugate 0 V; de-embedded black traces Fig. 2(d-g)); p.8 "Z0 has a negligible imaginary part and amounts to approximately 50 ohm - except for the low-frequency region"; Fig. 2(d) black reads 54.5-55 ohm at 5-30 GHz, 53 at 40, 50.6 at 50, 47.7 at 60 GHz | confirmed; value 50 approx unchanged |
| 5 | zwickel2020-gate300 | evidence z0_ohm | locator -> "p.9 Sec. 3; Fig. 3(a); p.8 Fig. 2(d)"; note -> "...insensitive to gate voltage; ... measured value shown only at gate 0 V"; basis derived kept | p.9 "The characteristic impedance Z0 as well as the imaginary part of gamma are rather insensitive to the gate voltage"; Fig. 3 caption: blue = measured values vs frequency and Ugate 0-300 V | not confirmed (wording): Fig. 3(a) plots measured Re{Z0} for all gate voltages up to 300 V, so "measured value shown only at gate 0 V" is inaccurate. Basis derived acceptable. See Issues. |
| 6 | zwickel2020-gate0 | devices.csv notes | Z0 sentence ("analytic limit ... falls steeply ... clear gate dependence ... not a measured value") -> measured at 0 V (Fig. 2(d) 51-55 ohm), insensitive to gate (p.9); RF-loss sentence -> measured points, amplitude convention p.5; "alpha about 0.2 ... 17 dB/cm" -> "Measured alpha about 0.25 /mm (scatter 0.22-0.30, 19-26 dB/cm; model 0.19; Fig. 2(f) 0.23-0.35) gives about 22 dB/cm"; "reading uncertainty about 10 percent" removed | p.5, p.7-9, Fig. 2(d), 2(f), 4(a) | confirmed (figures match my readings) |
| 7 | zwickel2020-gate300 | devices.csv notes | same Z0 and method sentences; "alpha about 0.68 ... 59 dB/cm" -> "Measured alpha about 0.76 /mm (scatter 0.68-0.84, 59-73 dB/cm; model 0.70) gives about 66 dB/cm" | p.11 Fig. 4(c) | confirmed |
| 8 | li2025b-a | devices.csv electrode_metal | '' -> 'AuGe/Ni/Au (45/15/400 nm)' (evidence entry added, design_target, "p.8 App. A step (f); p.3 Sec. II") | p.8 "A 45/15/400 nm AuGe/Ni/Au metal layer is then deposited by electron-beam evaporation"; p.3 "annealed AuGe/Ni/Au metal stack"; p.2 Fig. 1 caption t_elec = 460 nm = 45+15+400 | confirmed (single metallization step described; applying it to the top electrode is an inference supported by the thickness match) |
| 9 | li2025b-b | devices.csv electrode_metal | same as #8 | same | confirmed |
| 10 | li2025b-a/-b | evidence electrode_thickness_um notes | "electrode metal not stated separately" -> "equals the 45/15/400 nm AuGe/Ni/Au stack sum (App. A step (f))" | p.2, p.8 | confirmed |
| 11 | li2025b-c | devices.csv vpi_basis (+ evidence basis/note) | measured -> derived (86 V unchanged) | p.5 "We extract the two Vpi to be, respectively 86 V for device (i) and 93 V for device (ii)"; p.5 DC sweep 0-32 V (Fig. 4) | confirmed |
| 12 | li2025b-d | devices.csv vpi_basis (+ evidence basis/note) | measured -> derived (93 V unchanged) | same | confirmed |
| 13 | li2025b | papers.csv notes | "fabricated sidewall angle and top-electrode metal are not stated" -> "the fabricated sidewall angle is not stated and the paper describes one AuGe/Ni/Au metallization (App. A) without a separate top-electrode stack" | p.8-9 App. A | confirmed |
| 14 | montifiore2026-a | evidence capacitance_ff basis/note | measured -> author_estimate; note "19 nF stated PZT actuator capacitance; measurement method not given" (cell 19000000 unchanged) | p.4 "leads to a relatively high capacitance on the PZT of 19nF"; no measurement method | confirmed |
| 15 | geravand2025-b | devices.csv qualifiers | 'wavelength_nm:approx;' removed | p.13 Methods "with a center wavelength of 1550.5 nm" (no approximation wording) | confirmed |
| 16 | hu2026-a | devices.csv notes | wafer map "81.8 to 88.2 GHz" -> "81.8 to 93.6 GHz" | p.31 Fig. 3(e) (img_p31_1): top-right die cell reads 93.6 (10x crop), red (top of the 80-95 GHz colour bar); other dies 82.6, 82.9, 84.8, 83.6, 88.2, 81.8, 82, 82.7; no 83.8 cell | confirmed |

Evidence vs CSV equality for changed cells: all equal (electrode_metal a/b, vpi_dc_v c/d 86/93 with basis derived matching vpi_basis, rf_loss 22/66, z0 50/50, capacitance 19000000, wavelength 1550.5). New evidence notes are 7-23 words (within the 25-word convention). No paths, emoji or private information in any changed text.

## Deferred items (sampled)

- R2-F3 (steckler2025-a/-b, gupta2023-e band c_band at 1555-1580 / 1570 nm): `data/schema/devices.schema.yaml` line 33 defines only the enum `[o_band, c_band, l_band, cl_band, ...]`, no edges in nm. steckler2025 p.3 "Most dynamic measurements were conducted at a wavelength of 1580 nm", p.5 eyes at 1555-1565 and 1575 nm; gupta2023 p.5 "over the C-band ... 1530 nm ... 1570 nm". Deferral reason supported.
- R2-F4 (published_on): papers.csv has geravand2025 = 2024-12-23, li2025b = '' . Open user decision; deferral reason supported.

## Issues and proposed fixes

1. zwickel2020-gate300 evidence `z0_ohm` note (data/evidence/zwickel2020.yaml, entry device_id zwickel2020-gate300, field z0_ohm). Current: "Authors state Z0 is rather insensitive to gate voltage; high-frequency limit sqrt(L'/(C'S+C'TL)) about 50 ohm; measured value shown only at gate 0 V." Fig. 3 caption (p.9) states the blue traces are measured values versus frequency and gate voltage (0-300 V), so measured Re{Z0} at 300 V is plotted. Proposed note: "Authors state Z0 is rather insensitive to gate voltage (p.9); measured Re Z0 at 300 V only in 3D Fig. 3(a), not read; limit about 50 ohm." (24 words). Basis derived and value 50 approx can stay. Same nuance in the gate300 row note is already worded correctly ("stated to be rather insensitive to the gate voltage (p.9, Fig. 3(a))"), no CSV change needed.

No value or blocking-class issue found.

## Unrecorded changes

None. Every changed cell for the ten papers maps to R2-F1, R2-F2, R2-F5, R2-F6, R2-F7, R2-F8 or R2-F9 in the disposition files. The removal of "reading uncertainty about 10 percent" from both zwickel2020 row notes is part of the R2-F1 row-note rewrite (recorded as "RF-loss method sentence now says measured points").

## Validator

`uv run python scripts/validate_db.py` -> `0 error(s)`.
