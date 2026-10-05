---
verifier: fresh-context subagent (independent of the Q1 auditor and the corrector)
task: verify the audit corrections of staged batch p5_04 and re-check every headline cell
date: 2026-10-04
scope: data/_staging/p5_04 (huang2026, shen2026, starnault2026, su2026, tobing2026); 7 device rows, papers.csv, evidence/*.yaml; audit data/_staging/audits/p5_04-q1-claude-audit-2026-10-04.md; dispositions data/_staging/p5_04/AUDIT_DISPOSITIONS.md
mode: read-only (only this file written; scratch scripts in the session scratchpad; no network, no git, no merge --apply, no build_views)
verdict: issues (1 changed cell not confirmed; 1 new numerical finding; 5 new minor/metadata findings; no blocking defect)
counts: {confirmed: 10, not_confirmed: 1, new_findings: 6}
---

# p5_04 verification of audit corrections

## Method

- Read the audit (F1-F12), the dispositions, all 7 staged device rows, papers.csv, and all five evidence files. Read the full `text.md` for all five papers.
- Figures read by me:
  - huang2026: `img_p02_1.png` Fig. 1(c) (3792 px embedded) and `page_02.png`; `img_p03_1.png` Fig. 2(a).
  - shen2026: `img_p03_1.png` Fig. 3(c) (5861 px embedded) and `page_03.png` for the Fig. 3(d) "3.1 V" label (the label is missing from the embedded image).
  - starnault2026: `page_03.png` Fig. 2.
  - su2026: `img_p03_1.png` Fig. 3(c)-(d).
  - tobing2026: `page_03.png` Fig. 4(d)-(f), zoomed 5x.
- Pixel tracing (scratch scripts, colour masks calibrated on grid lines):
  - huang2026 Fig. 1(c): x from the vertical grid lines (20/40/60/80/100 GHz, 8.28 px/GHz). y from the frame top (0 dB) and the -5 to -35 dB grid lines (18.3 px/dB).
  - shen2026 Fig. 3(c): x from the 0 and 100 GHz tick labels (the red fit spans 0.8-110.1 GHz on this scale). y from the 0 dB label and the dashed -3 dB line (32.7 px/dB).
  - All readings are approximate: about +/-0.2 dB and +/-2 GHz, plus the trace line width (about 0.35 dB in huang2026 Fig. 1(c)).
- Mechanical checks: every populated evidence-required column (51 schema columns) has an entry. No entry sits on an empty cell, and no CSV/evidence value mismatches.
- Dry run of `uv run python scripts/merge_staging.py data/_staging/p5_04`: `merge counts: {'papers': 5, 'devices': 7, 'orgs': 5, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.

## Per-paper verdicts

| Paper | Rows | Verdict | Open items |
|---|---|---|---|
| huang2026 | 2 | issues | V1 (huang2026-b bw3db_ghz value not confirmed); N2, N6 (minor); N4 (metadata) |
| shen2026 | 1 | issues | N1 (numerical: gt is inconsistent with an observed crossing); N4 (metadata) |
| starnault2026 | 2 | corrections confirmed | N4 (metadata) |
| su2026 | 1 | corrections confirmed | none |
| tobing2026 | 1 | corrections confirmed; minor additions | N3, N5 (minor); N4 (metadata) |

## Dispositions reflected in staged files

All 12 dispositions are reflected in `devices.csv`, `papers.csv` and `evidence/*.yaml` as written in AUDIT_DISPOSITIONS.md:

- F1/F2: qualifiers and `bw_measured_to_ghz` 110 are set, with evidence entries.
- F3: the shen evidence note and row note are updated.
- F4/F5: the tobing ER, er_type, qualifier and buffer oxide cells are cleared, and their evidence entries are removed. The stack text is reworded.
- F6: both starnault rows are unspecified, with notes.
- F7: `license_notice` context_values are in all five files. The footer is present 3x in every `text.md`. "The Author(s)" is in starnault2026, su2026 (split across lines 22-23) and tobing2026.
- F8: device_class mzm on both huang rows, with evidence entries.
- F9: shen integration is monolithic.
- F10: the su `il_onchip_includes` text and note are updated.
- F11: the tobing note is updated.
- F12: starnault-b modulation_format is updated in the CSV and the evidence.

## Changed cells

| device_id | column | old -> new | Verdict | My reading / reason |
|---|---|---|---|---|
| huang2026-a | bw_measured_to_ghz | empty -> 110 | confirmed | Fig. 1(c): both S21 traces run to the right frame at 110 GHz. The dashed (before packaging) trace ends at about -2.6 dB and never reaches -3 dB; its lowest point is about -2.8 dB near 108 GHz. |
| huang2026-b | bw_measured_to_ghz | empty -> 110 | confirmed | Same axis end; the solid trace runs to 110 GHz. |
| huang2026-b | qualifiers (bw3db_ghz) | gt -> approx | confirmed | The solid (after packaging) trace reaches -3 dB inside the range, so the batch rule calls it a crossing. |
| huang2026-b | bw3db_ghz value (kept 100) | 100 (unchanged) | **not confirmed** | See V1. The figure supports about 80 GHz, not 100 GHz. |
| tobing2026-a | extinction_ratio_db | 40 -> empty | confirmed | p.3 text and the Fig. 4 caption: (d) is "TFLN MZI spectrum" (wavelength sweep, "MZI with unbalanced arms in SiN layer"); (e) is "a TFLN MZI modulator of 7 mm length". The ~40 dB is not tied to the 7 mm modulator. Fig. 4(d): fringe depth grows to about 40 dB at the long-wavelength end. |
| tobing2026-a | er_type | static -> empty | confirmed | Follows from the row above. |
| tobing2026-a | qualifiers | extinction_ratio_db:approx removed | confirmed | `bw3db_ghz:approx` remains. |
| tobing2026-a | buffer_oxide_um | 0.5 -> empty | confirmed | p.2 Sec. 2.2: LNOI dies with a 725 um Si substrate are bonded and then the "Silicon substrate is then removed"; "TEM of the TFLN-SiO2 interface". Removing the handle after bonding puts the die's 500 nm thermal oxide on the far side of the LN from the SiN wafer. The paper states the position in neither direction, so the cell must stay empty. |
| starnault2026-a, -b | vpi_convention | mzm_differential -> unspecified | confirmed | p.2: "low-MHz differential Vpi of 2.2V" for "the BW oDACs". Per-arm S+/S- vs MZM-level (V1 = -V2) is not stated. |
| huang2026-a, -b | device_class | other -> mzm | confirmed | Fig. 2(a) (p.3) draws the TFLN chip as a two-arm interferometer with input/output splitters and a central RF electrode. |
| shen2026-a | integration | bonded_heterogeneous -> monolithic | confirmed | p.2 Sec. 2: "MZMs in the TFLN layer"; p.2 Sec. 4: the laser is "monolithically coupled to a 5.8 mm-long traveling-wave TFLN MZM". GaAs is bonded for the gain sections only. |

Text-only changes:

- F3: wording confirmed. My reading is that the fit crosses -3 dB at 105.5 GHz.
- F10: arithmetic confirmed: 11.81 - 10.90 = 0.91.
- F11: confirmed. Fig. 4(f): 0 dB at about 1 GHz, a dip to about -3.0 dB near 3 GHz, -0.6 dB near 10 GHz, a sustained -3 dB crossing at about 22-23 GHz, and data to about 67 GHz at about -9 dB.
- F12: wording matches p.2-3.
- F7: license notice quotes confirmed.

## Issue V1 (numerical, not confirmed): huang2026-b `bw3db_ghz` should be 80 (approx), not 100

My reading of Fig. 1(c), solid "S21 after packaging" trace, at line centre:

| f (GHz) | 60 | 70 | 72 | 80 | 82-84 | 88 | 90-92 | 95 | 98-99 | 100 | 103-104 | 106 | 108-110 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| S21 (dB) | -2.2 to -2.3 | -2.4 | -3.0 (first touch) | -2.9 to -3.0 | -3.1 to -3.3 | -2.9 to -3.2 | -3.1 to -3.5 | -3.4 | -3.5 to -3.6 | -3.0 to -3.2 | -2.6 (ripple peak) | -3.3 | -3.6 to -3.7 |

- The low-frequency level is about -0.2 dB.
- The packaged trace first touches -3 dB at about 72 GHz (within the line width).
- It is at or below -3 dB on average from about 80-82 GHz. From 82 to 110 GHz it oscillates between about -2.6 and -3.7 dB; the mean of my 2-GHz bins over 82-100 GHz is about -3.15 dB.
- Nothing in the figure marks 100 GHz as a crossing. The trace is no closer to -3 dB at 100 GHz than at 82-90 GHz, and "consistently remains above 100 GHz" (p.2) is not supported.
- Under the batch rule (a trace that reaches -3 dB is a crossing, recorded as approx), the crossing frequency is the first point where the response reaches -3 dB and stays near it: about 80 GHz (reading range 72-84 GHz).

Proposed exact fix:

- devices.csv huang2026-b:
  - `bw3db_ghz` 100 -> 80.
  - `bw_basis` measured -> extracted_from_figure.
  - Keep `bw3db_ghz:approx` and `bw_measured_to_ghz` 110.
  - Row note: replace "3 dB about 100 GHz after packaging (110 GHz before); Fig. 1(c) packaged trace near -3 dB from about 80 GHz (reading), paper also says 'above 100 GHz'" with "Authors state '100 GHz' (Secs. 1, 4) and 'above 100 GHz' (Sec. 2); Fig. 1(c) packaged S21 first reaches -3 dB near 80 GHz (first touch about 72 GHz) and stays at -2.6 to -3.7 dB to 110 GHz (reading)".
- evidence/huang2026.yaml huang2026-b `bw3db_ghz`:
  - value 80, basis extracted_from_figure, locator "p.2, Fig. 1(c); Sec. 1, 2, 4".
  - note "first -3 dB crossing about 80 GHz (72-84) of packaged S21; authors state '100 GHz' / 'above 100 GHz'".
- Precedent caveat: wu2025-a kept the authors' "about 100 GHz" where the trace first reached -3 dB near 90 GHz. If the coordinator prefers that authors'-value policy, the only alternative is 100 approx with the current note; that is defensible only as the authors' number, not as a figure reading. I recommend 80 here for two reasons. The gap is 20%, not 10%. And the paper's own "above 100 GHz" is contradicted by its figure.

## New findings

**N1 (numerical). shen2026-a `bw3db_ghz:gt` 100 is inconsistent with the observed crossing in Fig. 3(c).**

- Convention (c) applies `gt` to "Bandwidth with no 3 dB crossing", and the batch rule allows gt only if the trace never reaches -3 dB.
- My reading of Fig. 3(c):
  - Red fit: -2.0 dB at 100 GHz, -2.9 dB at 105 GHz, -3.1 dB at 106 GHz, -4.1 dB at 110 GHz. It crosses -3 dB at about 105.5 GHz.
  - OSA points: about -2.1 to -3.0 dB at 95 GHz, -3.1 dB at 100 GHz, -2.4 / -3.3 dB at 105 GHz, -3.6 dB at 110 GHz.
- The measured data and the fit both reach -3 dB inside the 110 GHz range.
- Fix:
  - devices.csv shen2026-a: `bw3db_ghz` 100 -> 105; `qualifiers` `bw3db_ghz:gt;sidewall_angle_deg:approx` -> `bw3db_ghz:approx;sidewall_angle_deg:approx`; `bw_basis` -> extracted_from_figure; keep `bw_measured_to_ghz` 110.
  - evidence shen2026-a `bw3db_ghz`: value 105, basis extracted_from_figure, locator "p.3, Fig. 3(c); p.2 Sec. 4", note "fit crosses -3 dB near 105 GHz; OSA points about -3.1 dB at 100, -3.6 dB at 110 GHz; authors state 'exceeding 100 GHz'".
  - Row note: change "Fit crosses -3 dB at about 105 GHz (reading)" to keep the authors' ">100 GHz" wording.
- If the coordinator prefers the authors' number, use 100 approx, but not gt.

**N2 (minor). huang2026-a: under the batch rule, `bw3db_ghz:gt` applies.**

- The dashed pre-packaging trace never reaches -3 dB; its lowest point is about -2.8 dB and it ends at about -2.6 dB at the 110 GHz axis end.
- The current form (110 with no qualifier, plus measured-to 110) follows convention (c)'s "claimed crossing at the instrument limit" ("3-dB electro-optic bandwidth of 110 GHz"), so it is not wrong under (c).
- But the batch rule says gt exactly when the trace never reaches -3 dB, and the paper's "110 GHz" is the axis limit, not an observed crossing.
- Recommended for consistency with su2026-a (same situation, gt): `qualifiers` empty -> `bw3db_ghz:gt`. Evidence note: "trace ends near -2.6 dB at the 110 GHz axis end; no crossing observed".

**N3 (minor). tobing2026-a `bw_measured_to_ghz` missing.**

- Fig. 4(f) data end at about 67 GHz (axis to 70); the batch rule records a crossing with `bw_measured_to_ghz`.
- Fix: `bw_measured_to_ghz` = 67, with an evidence entry {basis: extracted_from_figure, locator: "p.3, Fig. 4(f)", note: "normalized S21 data end at about 67 GHz (about -9 dB)"}.
- The 20 approx value is confirmed: the sustained crossing reads about 22-23 GHz, and the paper says "~20 GHz".

**N4 (metadata, minor). papers.csv notes assert Crossref facts that the local cache cannot support.**

- huang2026, shen2026, starnault2026 and tobing2026 have no `references/<id>/crossref.json`.
- Their notes nevertheless say "Crossref lists no license" and "Crossref (year only)", while the same notes say "Crossref record absent".
- Fix for these four: replace "Crossref lists no license." with "Crossref record not cached." and "that Crossref (year only) and the paper do not confirm" with "that the paper does not confirm".
- su2026 (crossref.json present) is correct as is.

**N5 (minor). tobing2026-a note calls the Fig. 4(d) device "Passive".**

- The paper says only "TFLN MZI with unbalanced arms in SiN layer" (caption "TFLN MZI spectrum"); "passive" is an inference.
- Fix: "Unbalanced-arm TFLN MZI (Fig. 4(d), wavelength sweep) shows fringe extinction up to ~40 dB; not stated to be the 7 mm modulator."

**N6 (minor). huang2026-a note is self-inconsistent after F8.**

- "chip type, length and geometry are not given" now sits beside "MZ layout from the Fig. 2(a) schematic".
- Fix: "length and geometry are not given; chip type from the Fig. 2(a) schematic only".

## Independent headline re-check (all rows)

| Row | Cells re-checked against source | Result |
|---|---|---|
| huang2026-a | bw3db 110, measured-to 110, class | ok except N2 |
| huang2026-b | vpi_dc_v 4 ("a V_pi of 4 V", frequency not stated), il_fiber_to_fiber 4.2 lt ("less than 4.2 dB"), wavelength 1550.12 (C34, T/F demo), band c_band, measured-to 110 | ok except V1 |
| shen2026-a | length 5.8 mm, Vpi 3.1 V (Fig. 3(d) label, page render), VpiL 1.8 (3.1 x 0.58 = 1.80), wavelength 1064, film 360 / etch 180 / slab 180, sidewall ~62, Au 0.9 um, cl_twe, 160 Gb/s PAM4, 100 Gb/s NRZ SNR 14.61 dB, TDECQ 0.04 dB | ok except N1 |
| starnault2026-a | Vpi 2.2 (measured, low-MHz), bw6db 100 gt simulated, 1310 nm, ER 3.76 dB dynamic (text + Fig. 2(g) "ER = 3.76 dB", BER 1.51E-3), 225 GBd, net 540 (PAM8 225 GBd, 25% SD-FEC), drive_vpp 0.6 (600 mV differential, noted) | ok |
| starnault2026-b | 187.5 GBd, net 1200, 16-QAM 125 GBd / 800 Gb/s wording, Fig. 2(d)-(f) labels | ok |
| su2026-a | VpiL 1.3 (Fig. 3(c) label), length 1 mm, bw 110 gt (Fig. 3(d): S21 within about +/-1 dB to 110 GHz, never near -3 dB), measured-to 110, IL 0.86 on-chip / 11.81 total / 5.45 per grating, 8.2 dB/cm derived, film 400, etch 200, sidewall 64.37, Ti/Au 20/400, x-cut, 1550 nm | ok |
| tobing2026-a | length 7 mm (arm), Vpi 4.14 (Fig. 4(e) label, about -0.6 to 3.5 V), VpiL 2.9 (4.14 x 0.7 = 2.90), bw 20 approx (Fig. 4(f) sustained crossing about 22-23 GHz), gap 4 um, film 350, band cl_band with no wavelength | ok except N3 |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_04` -> `merge counts: {'papers': 5, 'devices': 7, 'orgs': 5, 'evidence': 5}; conflicts: 0; validation errors: 0`; `dry run (nothing written)`.
