# Batch p6_05 report (2026-10-05)

Validation: `uv run python scripts/merge_staging.py data/_staging/p6_05 --replace-paper-ids xu2022,lu2020` -> papers 2, devices 2, orgs 0, evidence 2; conflicts 0; validation errors 0 (dry run only). sims/xu2022/config.yaml additionally passes `inspectConfig` (empty solveError) and `parseConfig`; the engine was not run.

## xu2022 - distilled (FIRST SOURCE)
- Source: Optica version of record, 2-page Memorandum (cached PDF, manual download). Identity, date (published-online 2022-01-10), authors (14) and licence from crossref.json. Licence = Optica-OA-License-v2 (Optica Open Access Publishing Agreement), not CC: redistribution restricted_local_only.
- Rows: xu2022-a (one row for the four sub-MZMs XI/XQ/YI/YQ plus PRC; all stated to share Vpi 1 V and >110 GHz). repro_grade B. Sim config: sims/xu2022/config.yaml (uniform Fig. 1(c) cut, placeholders disclosed).
- Judgment calls:
  - bw3db 110 GHz with gt; bw_measured_to 110 GHz read from Fig. 1(g) (traces end near 110 GHz at about -3 dB); reference 1.5 GHz stored as `other` + 1.5; the fit-extrapolated crossing beyond 140 GHz is notes only.
  - drive push_pull and vpi_convention mzm_push_pull are inferred (basis derived, authors do not state them).
  - vpil_dc_vcm left empty (audit F1): the stated 2.4 V cm is the authors' simulated design efficiency, kept in notes and as a sim target only; vpi_dc_v 1 V is measured (Fig. 1(f)), frequency and wavelength not stated.
  - ER above 20 dB entered with gt and er_type unspecified (static or dynamic not stated); the Fig. 1(f) sweep minimum reads about 13-15 dB on one unspecified sub-MZM (noted, not used).
  - Fiber-to-fiber 6.8 dB entered; "optical loss 6.5 +/- 0.5 dB" (unqualified, chip-to-chip) in notes only.
  - drive_vpp 0.628 V (after cable/probe loss, author_estimate); 1.04 fJ/bit author_estimate (formula and scope not stated); net rate 1.96 Tb/s from a 10 percent FEC at 8.44 bit/symbol/pol, line rate not stated.
  - Fig. 1(b) ws = 80 um not entered as signal_width_um (ambiguous label); used only as a project_inference in the sim config.
  - Simulated RF loss 0.21 dB/cm/GHz^0.5 and "perfect velocity matching" are design statements, not entered.
- Not reported: wavelength (band empty), optical input power, sidewall angle, electrode signal/ground/finger widths, Z0, n_RF, ng, measured RF loss, temperature, fab facility (foundry_or_fab empty), per-channel numbers, supplement (none cited).
- Hints: batch hint platform lithium_niobate, class iq_mzm confirmed.

## lu2020 - distilled (RECHECK)
- Source: VoR (9 pages) + Supplementary Information (8 pages) + Author Correction (1 page). Row lu2020-a re-distilled in full (same device_id). grade C, no sim config (silicon-polymer hybrid; batch hint sim_candidate unknown, confirmed not applicable).
- What the Author Correction changes: the Fig. 1c label of the silicon core width was printed "4 mm" and is corrected to "4 um" (correction p.1). The cached VoR PDF already shows "4 um"; the main text (p.3) and Supplement Note 1 (p.3) both state 4 um. No database value changes: rib_width_nm 4000 stays, only its locator/note now cite the correction.
- Differences from canonical lu2020-a (value, basis, qualifier or locator), with the deciding source phrase:
  - bw3db_reference: dc -> low_freq_unstated (convention (t): Fig. 1f curve starts near 0 dB, normalisation frequency not stated by the authors; the earlier dc was a derived reading).
  - il_fiber_to_fiber_db: empty -> 10, qualifier approx, measured (supplement p.6 Note 5: "fiber-to-fiber insertion loss ... is found to be ~10 dB").
  - il_onchip_db: empty -> 2.6, qualifier approx, author_estimate, il_onchip_scope phase_section_only, includes/excludes filled (supplement p.6-7 Note 5: "on-chip optical loss is estimated to be approximately 2.6 dB"; 10 dB minus 2 x ~3 dB coupling minus ~1.4 dB Y-junctions; 12 mm total device length).
  - il_basis: empty -> measured (row-level, follows the fiber-to-fiber headline).
  - r_eff_pm_per_v: empty -> 223 pm/V, basis derived (supplement p.4 Note 2 Eq. 6 and p.5 Table 1: in-device r33 = 223 pm/V, n = 1.66, n^3 r33 = 1021 pm/V from the measured Vpi*L 1.44 V cm, Gamma 0.738, d_eo 1 um, d_c 6 um, eps about 3).
  - qualifiers: bw3db_ghz:approx -> bw3db_ghz:approx;il_fiber_to_fiber_db:approx;il_onchip_db:approx.
  - Locators extended (no value change): z0_ohm (supplement p.5-6 Note 3, CST FEM "close to 50 ohm", no value; stays design_target 50), electrode_thickness_um / signal_width_um (Note 3 confirms 3 um / 16 um), epitaxy_or_stack (Note 1), rib_width_nm (Note 1 and correction p.1).
  - 22 -> 27 evidence entries (new: il_fiber_to_fiber_db, il_onchip_db, il_onchip_scope, r_eff_pm_per_v, bw_method). Papers row: audit_status audited -> needs_audit, verified_on 2026-10-05, notes rewritten (supplement and correction now read).
  - Unchanged and re-verified: wavelength 1550, length 8, vpi_dc_v 1.8 (Table 1), vpil_dc_vcm 1.44, bw3db 68 approx, bw_measured_to 70, prop_loss 2.2 dB/cm (derived from 0.22 dB/mm; now supported by supplement Note 5), geometry fields, 120 GBd OOK, 200 Gb/s, 42 fJ/bit (derived), drive_vpp 1.3.
  - Added after audit: phase_only_loss tag (F2); source statements on the drive form added to notes, drive and vpi_convention still unspecified (F3); AWG 92 vs 96/120 GSa/s label inconsistency in notes (F9); device-row notes rewritten (arm spacing, single G-S-G feed, loss breakdown, r33 extraction; r33 dropped from "Not entered", confinement factor added) and evidence notes reworded for bw3db_reference, z0_ohm, rib_width_nm (F10).
- Source defects noted (notes only): loss-efficiency product 3.6 V dB (text p.6) vs 3.2 V dB (Table 1, p.7); polymer index 1.67 (main text p.3 modal calculation) vs 1.66 (supplement Table 1 in-device); device arm length 8 mm vs total device length 12 mm used for the loss figure.
- Not reported: insertion loss in the main text, ER, RF loss, n_RF, ng, optical input power, temperature of the static Vpi/bandwidth measurement, Vpi frequency, drive form (vpi_convention and drive stay unspecified).

## Schema / skill gaps
- None blocking. Worth a convention line: a Memorandum-type paper that gives one headline set for several identical sub-MZMs (DP-IQ) has no statistic value that fits "same value stated for all channels"; left empty.
- Sim SPEC: no way to represent a loaded cut when finger widths are not disclosed; the plain Fig. 1(c) cut was used with loading none (see limitations in the config).
