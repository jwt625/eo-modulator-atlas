---
verifier: fresh-context subagent (independent verification of audit dispositions)
task: verify the Q1 audit corrections of staged batch p5_05
date: 2026-10-04
scope: data/_staging/p5_05 (papers.csv, devices.csv, organizations.csv, evidence/*.yaml) for yamaguchi2026, yu2026, zhang2026b, zhou2026, aihara2026; audit data/_staging/audits/p5_05-q1-claude-audit-2026-10-04.md; dispositions data/_staging/p5_05/AUDIT_DISPOSITIONS.md
mode: read-only (only this file written; no staging edits, no git, no network; scratch scripts in session scratchpad)
verdict: all 14 dispositions (F1-F13, CTX) are reflected in the staged files and confirmed against the source; F14 rejection reason holds; 3 new minor findings, none blocking
counts: {confirmed: 15, not_confirmed: 0, new_findings: {blocking: 0, numerical: 0, minor: 3}}
---

# Verification of p5_05 audit corrections

## Method

- Read the audit, the dispositions, all staged CSVs and all 5 evidence YAMLs. Read `references/<id>/text.md` in full for all 5 papers.
- Figures checked directly:
  - zhou2026 Fig. 1 (left): re-rendered at 600 dpi; pixel scan of the blue "Measurement" trace.
  - zhou2026 Fig. 2 (right): re-rendered at 500 dpi.
  - yamaguchi2026 Fig. 1 and Fig. 2 (page renders); Fig. 2(c) re-rendered at 500 dpi with a pixel scan of the chip and module traces.
  - zhang2026b Fig. 3 (page render at 90 dpi; Fig. 3(c)-(d) at 450 dpi).
  - aihara2026 Fig. 2 and Fig. 3 (page render).
- All figure readings are approximate.
- Mechanical check (scratch script), comparing evidence values with CSV cells:
  - 0 mismatches and 0 notes over 25 words.
  - 0 populated headline numeric cells without evidence, and 0 qualifiers on empty fields.
  - The derived lists hold only zhang2026b etch_depth 200 (x3, matching the CSV) and zhou2026-a max_line_rate 365 (CSV empty, by design).
- Dry run `uv run python scripts/merge_staging.py data/_staging/p5_05`: `merge counts: {'papers': 5, 'devices': 9, 'orgs': 7, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| yamaguchi2026 | 3 | corrections confirmed | F2, F7, F9 confirmed; new minor N1, N2 |
| yu2026 | 1 | corrections confirmed | F8, F13 confirmed |
| zhang2026b | 3 | corrections confirmed | F3, F8, F10 confirmed |
| zhou2026 | 1 | corrections confirmed | F1, F6, F11 confirmed; Fig. 1 read independently; new minor N3 |
| aihara2026 | 1 | corrections confirmed | F4, F5, F12 confirmed |

## Changed cells and dispositions

| Item | device/paper | column / file | staged now | Verdict | Source check |
|---|---|---|---|---|---|
| F1 | zhou2026-a | bw3db_ghz | 67, qualifier gt | confirmed | Fig. 1 left: the blue measured trace ends at about 66-67 GHz at about -0.6 dB. Its lowest point is about -1.5 dB near 56-57 GHz, and it never reaches the -3 dB line. The only curve reaching -3 dB (at about 140 GHz) is the red dotted "Simulation". Text p.1 Sec. 2: "merely 1dB roll-off at 67GHz ... extrapolated 3dB bandwidth exceeding 140GHz". |
| F1 | zhou2026-a | bw_basis | measured | confirmed | End of the measured trace. |
| F1 | zhou2026-a | qualifiers | `vpi_dc_v:lt;bw3db_ghz:gt;extinction_ratio_db:approx` | confirmed | bw_measured_to_ghz 67 carries no qualifier, per convention (c). |
| F1 | zhou2026 | evidence bw3db_ghz; row and paper notes | 67 / measured; >140 GHz only in notes | confirmed | Wording matches the source. bw_measured_to_ghz evidence is 67, extracted_from_figure, consistent with my reading. |
| F2 | yamaguchi2026-c | length_mm | empty | confirmed | p.2 Sec. 3 "total operating length ... 40.5 mm"; Fig. 2(a) fundamental section 13.5 mm. Per the coordinator's decision, no effective length is entered. 40.5 stays on -b. |
| F2 | yamaguchi2026 | evidence `derived:` | `[]` (8.1 V cm removed) | confirmed | No length_mm entry for -c remains. The -c notes explain why VpiL is not derived. |
| F3 | zhang2026b-b | vpi_basis; evidence vpil_dc_vcm basis | derived / derived, value 1.87 | confirmed | p.2 Sec. 3 says Vpi is measured and "corresponds to a VpiL" (author arithmetic). Fig. 3(b) is the wafer map of VpiL for 5 mm devices; best 1.87 per text, caption and Table 1. Convention (h). |
| F4 | aihara2026-a | max_baud_gbd / max_line_rate_gbps | 200 / 448 (both kept) | confirmed | p.2 Sec. 3 gives TDECQ to 200 GBaud (Fig. 3(a) points at 160/180/190/200). The 448 Gbps eyes (Fig. 3(f-i)) print no baud. Notes and evidence state this. No 224 value entered, per coordinator. |
| F5 | aihara2026 | papers.companies; organizations.csv | "Nippon Telegraph and Telephone Corporation"; "NTT, Inc." row removed | confirmed | p.1 lists the Device Innovation Center and Device Technology Labs at 3-1 Morinosato Wakamiya, Atsugi. The canonical org note names the same two units and the same site. The paper notes record the printed name. |
| F6 | zhou2026 | foundry_or_fab | empty | confirmed | p.1 Sec. 2 and the acknowledgement name Liobate Technology but print no location. The notes say so. Per coordinator. |
| F7 | yamaguchi2026-a/-b/-c | tags | `results_from_prior_paper` appended | confirmed | Fig. 1 and Fig. 2 captions cite [5] and [6]. |
| F8 | yu2026-a, zhang2026b-c | bw3db_reference | unspecified | confirmed | Matches the evidence entries. |
| F9 | yamaguchi2026-c | evidence vpi_dc_v and extinction_ratio_db locator/note | "p.3, Sec. 3 and Sec. 4; Fig. 2(d)" | confirmed | p.3 Sec. 4: "The packaged module exhibited ... half-wave voltage of 2 V". |
| F10 | zhang2026b-a/-b/-c | integration | monolithic | confirmed | Canonical: 110 lithium_niobate rows are monolithic and none is foundry_native. The foundry aspect stays in the tags. |
| F11 | zhou2026-a | evidence drive_vpp_v note | AWG 1.3 to 2 Vppd; swing at the MZM not stated | confirmed | p.2: "differential signals (Vppd) are generated by AWG in the range of 1.3-2V"; p.1 "optional RF amplifier". |
| F12 | aihara2026-a | evidence max_baud note; row notes | text 9.3e-3, figure 9.7e-3 | confirmed | p.2 text "9.3 × 10⁻³"; the Fig. 3(a) label reads "9.7 × 10-3". |
| F13 | yu2026-a | notes | "Sec. 1 quotes up to 100 GHz ..." | confirmed | p.1 Sec. 1 "achieving up to 100 GHz bandwidth"; Sec. 2 "approximately 110 GHz". |
| F14 | org NSTIC | (rejected) | no change | rejection reason holds | p5_04 has an identical type, country and region (research_institute, SG, southeast_asia), and the merge compares only those. |
| CTX | all 5 evidence files | context_values.license_notice | footer notice | confirmed | The footer "Optical Fiber Communication Conference (OFC) © 2026 Optica Publishing Group" is printed on every page of all 5 PDFs (text.md). |

## Independent headline re-check (all 9 rows)

| Row | Headline cells | Result |
|---|---|---|
| yamaguchi2026-a | length 45 approx (3 x 15 mm; Fig. 1(a) 15+15+0.24+15); bw3db 110 gt with measured-to 110 (Fig. 1(c) EO-S21 about 0 to +1 dB up to the 110 GHz axis end); IL f2f 19.6 (8.2 dB/facet); ER 50 approx static (Fig. 1(d) min about -49 dB); gap 5 um; electrode 1.2 um; LN 800 nm; SiO2 500 um handle | correct |
| yamaguchi2026-b | length 40.5; bw3db 110 gt extracted_from_figure. My reading of the red chip trace: minimum about -1.6 dB near 105 GHz, end about -0.6 dB at 110 GHz, 1 dB crossing at about 99 GHz. x-cut | correct; see N2 |
| yamaguchi2026-c | Vpi 2 measured (semi-static), convention unspecified; bw3db 100 (stated) with measured-to 110; IL 9.2; ER 40 static (Fig. 2(d) min about -38 dB); length empty | correct; see N1 for the crossing frequency in the note |
| yu2026-a | wavelength 1310 (DFB); Vpi 2 lt design_target (p.1 "designed with low Vπ values (< 2V)"); bw3db 110 approx (stated); drive_vpp 2 gt (driver "exceeding 2 Vppd"); max baud 210, line rate 420 (Fig. 4(c)); TDECQ list matches Fig. 4 labels; SER 9.7e-3 matches text | correct |
| zhang2026b-a | Vpi 4.29 at 1310 nm (Fig. 3(a) label; span from minimum near -5.6 V to maximum near -1.3 V); length 5; VpiL 2.15 derived; prop loss 0.37 (passive 1.0 um waveguide, 1330 nm); RF loss 8.9 approx at 100 GHz (my Fig. 3(c) reading about 8.9); n_rf 2.2; ng 2.27 | correct |
| zhang2026b-b | VpiL 1.87 derived; length 5; wavelength empty (map wavelength not stated); Fig. 3(b) colour scale 2.0 to 3.2 saturates below 2.0 | correct |
| zhang2026b-c | bw3db 110, no qualifier, measured-to 110. Fig. 3(d): red crosses -3 dB at about 90-93 GHz; orange and blue stay above -3 dB until the drop at the ~110 GHz sweep end. Text gives the range 93 to 110 GHz. Convention (c): a claimed crossing at the instrument limit | correct |
| zhou2026-a | Vpi 2.7 lt (text 2.7 V, Fig. 1 header "Vpi < 2.7V"); bw3db 67 gt measured; eo_rolloff 1 dB at 67 GHz (stated); ER 2.4 approx dynamic (my Fig. 2 right-axis reading about 2.35 at 182.5 GBd, about 4.4 at 140 GBd); max baud 182.5; drive_vpp 2 (AWG); line rate empty | correct; see N3 for a text/figure difference in modulation_format |
| aihara2026-a | length 0.1; bw3db 103 at -1.5 V (stated; Fig. 2(c) smoothed trace near -3 dB at about 100-103 GHz); ER 3.8 static for 0-1 V (Fig. 2(b) point at 1.0 V about -3.8 dB); wavelength 1310 approx (Fig. 2(a) peak); drive_vpp 0.5; max baud 200; line rate 448 | correct |

## New findings (all minor)

**N1 (minor). yamaguchi2026-c: the evidence note puts the module -3 dB crossing at about 102 GHz; it is at about 100 GHz.**
- Location: bw3db_ghz evidence note "blue trace crosses -3 dB near 102 GHz, minimum about -3.4 dB near 105 GHz". The same "near 102 GHz" appears in BATCH_REPORT.md (yamaguchi2026 judgment calls).
- My pixel scan of Fig. 2(c) at 500 dpi:
  - Axis calibration: 63 px/dB from the 3/0/-3/-6 ticks; 9.64 px/GHz from the 0 and 110 ticks.
  - The blue trace reads -2.94 dB at 99.9 GHz and -3.06 dB at 100.4 GHz.
  - Its minimum is about -3.5 dB at 105 GHz.
- The audit's "101-102 GHz" reading is also slightly high. The cell value (100, stated) is unaffected.
- Proposed fix:
  - evidence/yamaguchi2026.yaml, yamaguchi2026-c bw3db_ghz note -> "Stated 100 GHz 3 dB bandwidth for the module; blue trace crosses -3 dB near 100 GHz, minimum about -3.5 dB near 105 GHz".
  - BATCH_REPORT.md: "crosses -3 dB near 102 GHz" -> "crosses -3 dB near 100 GHz".

**N2 (minor, optional). yamaguchi2026-b: the stated 1 dB bandwidth is only in the notes.**
- Source p.2 Sec. 3: "Using a 1-dB bandwidth metric, the device achieved 100 GHz". In context, "the device" is the chip; the module is introduced in the next sentence.
- My reading confirms it: the chip trace crosses -1 dB at about 99 GHz.
- The schema has a column for this stated point (convention (g)).
- Proposed fix:
  - devices.csv yamaguchi2026-b: eo_rolloff_db empty -> 1; eo_rolloff_freq_ghz empty -> 100.
  - Add an evidence entry for eo_rolloff_db: value 1, unit dB, basis measured, locator "p.2, Sec. 3; Fig. 2(c)", note "Authors' 1 dB bandwidth metric: 100 GHz for the chip; reference DC-normalized".
  - Add an evidence entry for eo_rolloff_freq_ghz: value 100, unit GHz, basis measured, locator "p.2, Sec. 3", note "Frequency of the stated 1 dB bandwidth".
- The row note "paper's own metric is 1 dB bandwidth 100 GHz" can stay.

**N3 (minor). zhou2026-a: the text and Fig. 2 differ on the 160 GBd KP4 TDECQ.**
- Text p.2 and Conclusion: "For 160Gbd PAM4 with KP4 FEC, the measured TDECQ is 3.7dB using 15 FFE taps".
- In Fig. 2 (right), at 160 GBd the KP4-15 taps point (green square) reads about 3.6 dB and the KP4-23 taps point (yellow star) about 3.7 dB. Left axis: 122.5 px per dB.
- The staged modulation_format follows the text, which is correct.
- Proposed fix (note only): append to the evidence/zhou2026.yaml modulation_format note "; Fig. 2 reads about 3.6 dB (15 taps) and 3.7 dB (23 taps) at 160 GBd, text value kept".

## Observations (no change proposed)

- Convention (c) wording versus F1. The schema text says that when "the paper states a bound that differs from the measurement range", bw3db_ghz carries the paper's bound with gt. Read literally, that would admit ">140 GHz". The applied decision (enter the 67 GHz measured end with gt and keep the extrapolation in notes) matches the arabjuneghani2022 and liu2025 precedents and the plotting rationale. The coordinator may want the convention text to say that bounds extrapolated beyond the measured range (from a model or simulation) are not entered.
- aihara2026-a has electrode_type and drive empty. A 100 um EAM driven through a GSG probe without termination resistors is lumped, but the paper does not say so. Leaving the cells empty is acceptable. If they are filled, the evidence basis should be derived.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_05` -> `merge counts: {'papers': 5, 'devices': 9, 'orgs': 7, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`. The org count is 7 after the "NTT, Inc." row was removed (F5).
