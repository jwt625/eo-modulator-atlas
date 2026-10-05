---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_02 (OFC 2026 conference papers)
date: 2026-10-04
scope: data/_staging/p5_02 (papers.csv, devices.csv, organizations.csv, evidence/lin2026.yaml, evidence/liu2026a.yaml, evidence/liu2026c.yaml, evidence/rakowski2026.yaml); papers lin2026, liu2026a, liu2026c, patel2026, rakowski2026
mode: read-only (only this file written; no edits, no git, no network)
verdict: no blocking defect; lin2026, liu2026c and rakowski2026 pass after corrections; liu2026a and patel2026 pass
findings: {blocking: 0, numerical: 3, metadata: 2, minor: 6}
---

# Q1 audit: p5_02

## Method and limits

- I read the rules first: `.claude/skills/eo-modulator-distill/SKILL.md`, the conventions (a)-(k) and column definitions in `data/schema/devices.schema.yaml`, and `data/_staging/BATCH_INSTRUCTIONS.md`. For report format only, I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md`.
- I dumped every populated cell of the 7 staged device rows, the 5 papers rows, the 5 staged organizations and the 4 evidence files.
- I read `references/<id>/text.md` in full for all 5 papers.
  - Identity: I checked title, author list and order, affiliations and paper code against the PDF first page and `data/_staging/batches/p5_02.csv`.
  - Crossref: only liu2026c has a `crossref.json`. It gives the title, the 7 authors in order, year 2026, page Th2A.11 and no license. The other four have no Crossref record.
  - Footer: every page of all five PDFs carries "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group" and a file code (Th2A.14, M2B.2, Th2A.11, M2A.7, M2A.3) that matches the DOI suffix.
- I opened these figures, using page renders and my own higher-resolution re-renders of the PDF made in the scratchpad:
  - lin2026: Fig. 2(a) and Fig. 2(d) (p.2), and Fig. 2(e)-(g).
  - liu2026a: Fig. 1(b) and (c) (p.1), and Fig. 3(b) with Table 1 (p.3).
  - liu2026c: Fig. 2(b) and (c) (p.2). For Fig. 2(c) I extracted the blue and orange traces column by column with a throwaway script, with axes calibrated on the plot frame (3 to -9 dB, 0 to 70 GHz). The orange trace reads -1.0 dB at 66 GHz, which matches the authors' 66 GHz 1 dB bandwidth and so validates the calibration.
  - rakowski2026: Fig. 1(c) (p.1), Fig. 2(a)-(c) and Fig. 3(a)-(b) with Table 1 (p.2).
  - patel2026: Table 1 and Fig. 3 (p.3).
- All figure readings below are mine and approximate.
- Mechanical check (throwaway script):
  - Every non-empty evidence-required cell has an evidence entry with an equal value: 0 missing, 0 mismatches.
  - Every unit equals the schema unit. Every basis is in the enum. No note exceeds 25 words. Every qualifier sits on a populated field.
- No sim configs exist (`sims/<id>/` absent for all five; `sim_config` empty). That is correct: all are silicon rings or a silicon MZM.
- `uv run python scripts/merge_staging.py data/_staging/p5_02` (dry run) output: `merge counts: {'papers': 5, 'devices': 7, 'orgs': 5, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after finishing the checks above.
- Limits:
  - These are 3-page OFC papers with no supplementary material.
  - The Fig. 2(d) trace in lin2026 and the Fig. 2(c) traces in liu2026c are noisy, so figure readings carry about ±1-2 GHz and ±0.3 dB of reading error.
  - published_on is empty for all five rows. That is consistent with convention (k) and with earlier OFC 2026 rows in `data/papers.csv`, because no Crossref date exists and the PDFs print none.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| lin2026 | 1 | pass after corrections | F1 (numerical), F6 (minor) |
| liu2026a | 2 | pass | F7 (minor) |
| liu2026c | 2 | pass after corrections | F2 (numerical), F5 (metadata), F8 (minor) |
| patel2026 | 0 (no_device_rows) | pass | none |
| rakowski2026 | 2 | pass after corrections | F3 (numerical), F4 (metadata), F9, F10, F11 (minor) |

## Findings

### Numerical

**F1 (numerical). lin2026-a `extinction_ratio_db` 34 is the simulated marker, not the measured dip.**
- Cells:
  - `data/_staging/p5_02/devices.csv` lin2026-a: `extinction_ratio_db` 34, qualifier `extinction_ratio_db:approx`, `er_type` static.
  - Evidence entry `extinction_ratio_db` 34, basis extracted_from_figure, note "Depth of measured resonance dip about -34 dB".
  - The row note says "Static ER about 34 dB is the minimum of the measured dip in Fig. 2(a)".
- Source: p.2, Fig. 2(a) (my 900 dpi re-render, approximate).
  - The black measured line reaches its minimum at about -36.4 dB near 1556.33 nm.
  - The lowest simulation circle sits at about -34 dB.
  - The off-resonance level is about -0.5 dB at 1555.6 nm and about -0.7 dB at 1557.0 nm.
  - The text gives no ER number ("The fitted model accurately reproduces the loaded Q-factor and extinction ratio").
- So the measured static ER is about 36 dB (reading range 35.5-36.5 dB). The 34 dB value matches the simulation marker.
- Change:
  - Set `extinction_ratio_db` to 36 and keep `extinction_ratio_db:approx`.
  - Evidence value 36, note: "Measured dip minimum about -36.4 dB vs off-resonance about -0.5 dB; simulation marker about -34 dB; not stated in text".
  - Row note: replace "Static ER about 34 dB is the minimum of the measured dip" with "Static ER about 36 dB read from the measured dip in Fig. 2(a)".

**F2 (numerical). liu2026c-b `bw3db_ghz` 65 (approx, extracted_from_figure) is too high for the measured trace.**
- Cells:
  - `devices.csv` liu2026c-b: `bw3db_ghz` 65, `bw3db_ghz:approx`, `bw_basis` extracted_from_figure, `bw3db_reference` dc, `bw_measured_to_ghz` 67.
  - Evidence note: "Blue trace reaches -3 dB near 65 GHz".
- Source: p.2, Fig. 2(c), blue "Conventional MZM -3V" trace. The authors do not state a 3 dB value for this device.
- My pixel extraction, relative to the 0 dB low-frequency level (approximate):

  | Frequency (GHz) | Response (dB) |
  |---|---|
  | 54-57 | about -2.0 to -2.3 |
  | 57.5 | about -2.7 |
  | 60 | about -3.0 |
  | 60.5-63.5 | about -3.0 to -3.2 |
  | 64.5 | about -3.5 |
  | 66 | about -3.5 |

- The first -3 dB crossing is at about 60 GHz, and the trace stays at or below -3 dB from there on. 65 GHz is about 5 GHz past the crossing.
- Change (pick one):
  - (a) Set `bw3db_ghz` = 60, keep approx and extracted_from_figure. Evidence note: "Measured trace first reaches -3 dB near 60 GHz, about -3.0 to -3.2 dB to 63 GHz, -3.5 dB at 66 GHz; not stated by authors". Update the row note sentence "read to cross -3 dB near 65 GHz" to match.
  - (b) Leave `bw3db_ghz` empty and keep only the stated 1 dB value (39 GHz), because the authors give no 3 dB number for this device.
- I prefer (a). It is a reading of measured data and is labelled as such.

**F3 (numerical). rakowski2026-a and -b `il_onchip_db` are labelled measured, but they are the same regression-trend read-outs as the bandwidths labelled derived.**
- Cells:
  - `devices.csv` rakowski2026-a: `il_onchip_db` 3, `il_basis` measured.
  - rakowski2026-b: `il_onchip_db` 1.8, `il_basis` measured.
  - The evidence entries for both have basis measured, locator "p.2, Table 1".
- Source:
  - Table 1 (p.2) lists "BW @ER=3.5dB 55GHz/70GHz" and "IL @ER=3.5dB 3dB/1.8dB" together.
  - p.2: "In Fig. 3, EO BW corresponding to an average ER of 3.5 dB is highlighted ... ER of 3.5 dB, IL of 3 dB, rOMA of 5.5 dB and a corresponding small-signal BW of 55 GHz".
  - Fig. 3(a) and (b) show scatter points with fitted trend lines and confidence bands. The highlighted values are read where the green ER trend crosses 3.5 dB. My reading: dashed markers at about 56.5 GHz and about 72 GHz; red IL trend about 3.1 dB and about 2.0 dB there.
  - The row notes already say these Table 1 values are "read by the authors from a regression trend". Only the IL basis contradicts this.
- Change:
  - Set `il_basis` = derived on both rows.
  - Set the evidence basis for `il_onchip_db` = derived on both rows, with locator "p.2, Table 1; Fig. 3(a)" for row a and "p.2, Table 1; Fig. 3(b)" for row b.
  - Evidence note: "IL at ER=3.5 dB from the authors' static-IL regression trend vs BW".
  - Values unchanged.
- Optional: the row-a `extinction_ratio_db` 3.5 is the selection level of the same read-out. It can stay measured ("average ER of 3.5 dB" is stated), but derived would be more consistent.

### Metadata

**F4 (metadata). GlobalFoundries: `org_type` company here, foundry in p5_01.**
- Cell: `data/_staging/p5_02/organizations.csv` row GlobalFoundries has `org_type` company.
- Conflict: `data/_staging/p5_01/organizations.csv` has GlobalFoundries with `org_type` foundry. The p5_01 Q1 audit (F3) confirmed that type as correct.
- Convention (e): org_type foundry means the primary business is contract fabrication. That fits GlobalFoundries.
- Neither dry run against `data/` can see the conflict. Whichever batch merges second will either collide or silently keep the first batch's type.
- Change:
  - Set `org_type` = foundry.
  - Make the notes compatible with the p5_01 row, for example "Malta, NY; also Essex Junction, VT and Santa Clara, CA (rakowski2026 affiliations 1-3)". Alternatively, drop the row from p5_02 if p5_01 merges first.
  - `companies` = GlobalFoundries in papers.csv stays (an affiliation list, not a type field).

**F5 (metadata). liu2026c-b `drive` series_push_pull and the series push-pull/termination text are inferred for the conventional device, and there is no derived evidence entry (convention (f)).**
- Cells:
  - `devices.csv` liu2026c-b: `drive` series_push_pull, `tags` series_push_pull;integrated_termination;thermal_phase_shifters.
  - Evidence `epitaxy_or_stack` for liu2026c-b: basis measured, note "Identical doping design stated for both devices". The value includes "integrated termination resistor; thermal phase shifters on both arms".
- Source:
  - Sec. 2 (p.2) describes "the proposed MZM": "The device employs a series push-pull electrode configuration with an integrated termination resistor".
  - Sec. 3 says the two devices have "identical optical and doping designs, differing only in the electrode configuration" and "the same ground-signal (GS) pad layout".
  - The drive scheme of the conventional device is therefore plausible but not stated.
- Change:
  - Add an evidence entry for liu2026c-b `drive`: value series_push_pull, basis derived, locator "p.2, Sec. 2; Sec. 3", note "Stated for the tabbed device; conventional device shares GS pads and design except electrode; authors do not state its drive".
  - In the liu2026c-b `epitaxy_or_stack` evidence note, add "termination and heaters stated for the tabbed device only".
  - Alternatively, set `drive` = unspecified on row b.

### Minor

**F6 (minor). lin2026 resonance wavelength in notes.**
- Where: the `devices.csv` lin2026-a note and BATCH_REPORT say "resonance dip near 1556.4 nm".
- Source: Fig. 2(a) dip at about 1556.33 nm (approximate).
- Change: "near 1556.3 nm". There is no cell impact (wavelength_nm is empty, band c_band is correct).

**F7 (minor, judgment). liu2026a: `extinction_ratio_db` mixes types across the two rows of one ring.**
- Cells:
  - liu2026a-a: 34, static (Fig. 1(b) "ER~34dB").
  - liu2026a-b: 3.5, dynamic (140 GBd PAM4 eye, Fig. 3(b)).
- The static 34 dB is a property of the ring and applies to both bias rows. Each row's dynamic ERs are already listed in `modulation_format` (row a: 1.94 and 2.40 dB; row b: 1.98 and 3.50 dB).
- Change (optional): use one er_type on both rows. Either set static 34 (approx) on both, or set dynamic on both (row a: 2.40 dB from 64 GBd PAM4, or 1.94 dB from 140 GBd NRZ).
- Values as staged match the source, so no correction is required.

**F8 (minor). liu2026c-b `electrode_type` other.**
- The conventional device is a GS (ground-signal) traveling-wave electrode in series push-pull (shared GS pads, p.2). `tw_cps` is the enum for a coplanar-strip traveling-wave line.
- Change (optional): `electrode_type` = tw_cps.

**F9 (minor). rakowski2026 `il_onchip_excludes` wording is hedged although the source defines the normalization.**
- Current value: "Grating couplers and routing, if the off-resonance level is the normalization (not otherwise stated)".
- Source:
  - Fig. 2(b) (p.2): IL goes to about 0 dB at ±1000 pm detuning.
  - Fig. 3 marks "Average power off resonance".
  - p.2: "rOMA ... normalized to the modulator input power".
- Change:
  - `il_onchip_excludes` = "Grating couplers, routing and off-resonance waveguide loss (IL is relative to off-resonance transmission, Fig. 2b)".
  - Optionally `il_onchip_includes` = "Ring-induced excess loss at the operating detuning (static)".

**F10 (minor). rakowski2026 bandwidth notes and reference.**
- Bandwidth fit:
  - Fig. 2(c) legend lists BW 72.3, 73.5, 68.6, 64.2, 53.4, 46.7 and 44.8 GHz, while all traces end at 67 GHz.
  - A red dotted roll-off fit and the title "3dB Bandwidth = 53.4GHz @ max DC Gain" show that every BW3dB is the authors' fit read-out, including values above the 67 GHz LCA (Lightwave Component Analyzer) range.
  - This supports basis derived for 55 and 70 GHz. Fig. 3(b)'s dashed marker sits at about 72 GHz against the stated 70 GHz, which is within the trend read-out.
- Change (optional):
  - Add to the rakowski2026-b evidence note "authors' fitted S21 bandwidths exceed 67 GHz elsewhere too (Fig. 2c legend)".
  - Add an evidence entry for `bw3db_reference` dc, locator "p.2, Fig. 2(c) title '@ max DC Gain'".

**F11 (minor, batch consistency). Ring operating wavelength handling differs.**
- How each row handles it:
  - lin2026-a leaves `wavelength_nm` empty because the operating point is detuned.
  - liu2026a enters the resonance (1313, approx).
  - rakowski2026 enters the 0 V resonance 1314.385 nm (Fig. 2b) and notes that the operating point is about -80 pm away.
- Each row explains its choice. Change (optional): pick one rule for detuned rings, for example the resonance wavelength with an approx qualifier and a note.

## Verified clean

lin2026:
- Identity: title, 7 authors in order, affiliations (NIAR (National Institutes of Applied Research) Taiwan Semiconductor Research Institute; Institute of Photonics Technologies and Dept. of EE, National Tsing-Hua University), DOI suffix Th2A.14.
- "fabricated on the imec iSiPP200 platform with a 220 nm silicon device layer" (p.1), so `foundry_or_fab` imec and process_name iSiPP200 are stated. imec reuses the existing org name exactly.
- `bw3db_ghz` 90 approx, measured: p.3 "The measured −3 dB EO bandwidth reaches approximately 90 GHz". In Fig. 2(d) the black measured trace first touches -3 dB at about 86-88 GHz amid noise, and the authors' dotted marker sits at about 91 GHz. The value is the authors' measured statement, not the red simulation, which crosses about 94 GHz.
- `bw_measured_to_ghz` 100 (Fig. 2(d) axis end; 110 GHz VNA in Fig. 2(e)).
- FSR 19.5 nm, n_g 3.95, radius 5 um, Cj 19.3 fF (equivalent-circuit parameter, derived), 220 nm.
- Fig. 2(g) labels: TDECQ 1.58 dB at 200 Gb/s and 2.94 dB at 224 Gb/s. SER 4.8e-4 and outer OMA 5.63 mW stated without per-rate attribution.
- "224 Gb/s PAM4 ... without equalization" (p.1).
- Driver chain matches Fig. 2(f): 224 Gb/s PAM4 PPG, 11 dB E-Amp, bias tee, GSG probe.
- Baud correctly left empty. repro_grade C correct.

liu2026a:
- Identity: title, 9 authors in order, affiliations (Fudan University College of Future Information Technology; Zhangjiang Laboratory), M2B.2. Both org names reuse `data/organizations.csv` exactly.
- Fig. 1(b) labels Q~1630, ER~34dB, FSR~6.97nm, which match the text "loaded Q-factor of 1630 and an FSR of 6.97 nm".
- 26.7 pm/V over 0 to -4 V gives Vpi*L 0.538 V cm (authors' value): basis derived and resonance_tuning_derived are correct.
- 3 dB 83/97/>110 GHz at 0 V and all >110 GHz at -3 V (p.2). Row b uses gt plus bw_measured_to 110 per convention (c).
- Eye labels: 140 GBd NRZ @0V ER 1.94 dB; 64 GBd PAM4 @0V ER 2.40 dB; 160 GBd NRZ @-3V ER 1.98 dB; 140 GBd PAM4 @-3V ER 3.50 dB.
- Vpp 1.2 V and 2.7 V; 16 and 32 FFE taps; 0 dBm and -3 dBm received power.
- 280 Gb/s PAM4 on row b; 140 Gb/s NRZ max on row a (conclusion: 128 Gbps PAM4 at 0 V).
- The Ge photodetector correctly has no row. Foundry correctly empty ("300 mm SOI platform").
- 13.5 dB grating-coupler loss correctly not entered as IL.

liu2026c:
- Identity matches `crossref.json` (title, 7 authors in order, Th2A.11) and the PDF. Organizations "Institute of Optics and Precision Mechanics, Chinese Academy of Sciences" and "University of Chinese Academy of Sciences" reuse existing names exactly.
- Vpi 4.5 V and 5.9 V: Fig. 2(b) nulls at about 4.5 V (tabbed) and about 5.8-6.0 V (conventional) on the DC sweep. Vpi*L 0.9 and 1.18 V cm are authors' values (derived). vpi_convention unspecified is honest.
- 1 dB bandwidths: 66 GHz confirmed by my trace extraction (-1.0 dB at 66 GHz) and 39 GHz (blue trace at about -1 dB near 39 GHz).
- `bw3db_ghz` 80 gt with basis author_estimate ("curve fitting ... indicates a 3 dB bandwidth exceeding 80 GHz") and `bw_measured_to_ghz` 67 (67 GHz GS probe; trace ends at about 67 GHz). This is correct per convention (c), with no extrapolation entered as measured.
- `bw3db_reference` dc and `eo_rolloff` 1 dB: the trace starts at about -0.1 dB, and the authors' 1 dB line sits at about -0.9 dB.
- Geometry: 220 nm, 380 nm ridge, 150 nm etch, 2 um BOX; doping 5.3e18, 1.0e19, 7.4e19, 1.1e20 cm^-3; length 2 mm.
- Large signal: about 2.4 Vpp (64 GBd) and about 1.8 Vpp (128 GBd); ER 5.08 and 2.21 dB; TDECQ 0.33 and 2.88 dB; PAM6 280 Gb/s eye; 1310 nm laser in Fig. 3(a); M8199B, SHF M827B and PDFA.

patel2026:
- Review/tutorial with no device of its own. Table 1 rows are other groups' papers cited by DOI, and Fig. 3 is a literature trade-off plot. Zero device rows is correct.
- The intro's "reports experimental results at high bit rates" is not backed by any own data in the 3 pages.
- Identity (sole author David Patel, NVIDIA, Santa Clara, M2A.7) and "(c) 2025 The Author(s)" in the abstract are as noted.
- NVIDIA as a new org (company, US, north_america) is correct. repro_grade empty is acceptable.

rakowski2026:
- Identity: title (200G/λ), 15 authors in order, all GlobalFoundries (Malta NY, Essex Junction VT, Santa Clara CA), M2A.3.
- Geometry: rib 160 nm high, 400 nm wide, 55 nm slab, radius 7.5 um, 1% drop port, S-shaped junction, NiSi heater with undercut, 2.5 mW/nm.
- Fig. 1(c) label FSR=9.2nm (1.6 THz in text).
- Table 1: Q ~3900 (approx correct), 80 pm/2 V, 125 pm/3 V, 55 and 70 GHz, IL 3 and 1.8 dB, rOMA 5.5 and 4.5 dB.
- Fig. 2(a) inset: Shift=80.00pm, Q=3574.9. Fig. 2(b) inset: Resonance@0V=1314.385.
- Fig. 2(c) legend: 1314.305 nm BW=53.4G, ER/IL/rOMA=3.4/3.5/6.1. The notes quote this correctly.
- S11 fit: R 15 ohm, C 50 fF (derived), "estimated BW of approximately 80 GHz" (not entered, correct).
- Eye diagrams at 2 Vpp:
  - NRZ 120 Gb/s, PRBS 2^16-1, 1 V reverse, ER 2.6 dB.
  - PAM4 240 Gb/s (120 GBd), 0.85 V (text) vs -0.86 V (caption).
  - 32 GHz filter, 21-tap FFE, SD-FEC threshold 5e-3, about 6 dBm at the device.
- ER >3.5 dB at 3 Vpp: abstract and p.3, so gt on row b is correct. 55 and 70 GHz with basis derived and bw_measured_to 67 is correct (see F10).
- `foundry_or_fab` empty follows SKILL rule 6 and matches the p5_01 F3 disposition for gong2026.
- `tuning_nm_per_v` correctly kept out of the CSV (distiller arithmetic in the `derived` list only).

Batch-wide:
- license publisher-copyright from the printed Optica footer (verified on every page of all five PDFs), redistribution restricted_local_only, source_type conference, access unknown.
- discovered_via ofc2026;local_corpus (from the batch CSV), cache_status full_extract, audit_status needs_audit, verified_on 2026-10-04.
- published_on empty because no Crossref date exists and none is printed (the batch CSV schedule dates are not a convention (k) source).
- New orgs National Tsing Hua University, National Institutes of Applied Research and Taiwan Semiconductor Research Institute (parent NIAR): official English names, research_institute/university, TW, east_asia, all correct. For GlobalFoundries, see F4.
- No absolute or home-relative paths and no emoji in the staged files.
