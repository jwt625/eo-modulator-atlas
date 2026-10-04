# BATCH_REPORT p4_04 (2026-10-04)

Validation: `uv run python scripts/merge_staging.py data/_staging/p4_04` gives 3 papers, 5 devices, 1 org, 3 evidence files, 0 conflicts, 0 validation errors. All papers `audit_status: needs_audit`. All three have `crossref.json`; no downloads needed.

## wang2024a - distilled
- Source: cached arXiv v2 preprint (2407.16324v2, 28 Oct 2024); Optica journal version (Crossref online 2024-11-26) not read.
- Rows: wang2024a-a (6 mm Ag-electrode push-pull MZM, 1550 nm). repro_grade B. Sim config: sims/wang2024a/config.yaml.
- Not reported: on-chip or fiber-to-fiber IL (only about 7 dB per facet coupling), ER, Z0, numerical etch depth (only half-etched), sidewall angle, ground widths, optical input power, RF loss at a frequency (only alpha coefficients on test CPWs, kept in notes).
- Judgment calls: V_pi L 2.8 V cm is derived (authors from 4.8 V x 6 mm); 3 dB bandwidth 110 GHz approx is the authors' stated value (claimed crossing at the measurement limit, referenced to 10 MHz; bw3db_reference other, 0.01 GHz), while the measured trace first dips below -3 dB near 90 GHz and the EE-derived simulated curve crosses near 110 GHz; max_line_rate 528 Gb/s read from the Fig. 3 label; net 405 Gb/s derived (authors: code rate x baud); n_rf measured at 50 GHz; ng simulated; cladding of the V_pi/EO device not stated (inset shows SiO2 1.4 um, air-clad Au variant exists); waveguide_orientation y read from the Fig. 1(a) axis labels.
- CSV hints wrong or unverified: license CC-BY-4.0 (Crossref: Optica OA License v2 for the VOR; arXiv licence not shown), so redistribution restricted_local_only; published_on 2024-07-23 not verifiable (left empty); "VpiL 2.8 V cm snippet" now verified in the full text. Paper text typos: "600 mm long" device, gold alpha 0.77 in text vs 0.7 on the plot.
- Geometry conflict: SEM inset rib looks about 2 um wide vs stated 1.2 um; flagged in notes and sim `missing`.

## wang2024b - distilled
- Source: Nature version of record (CC-BY-4.0 from Crossref and the article notice), 15 pages.
- Rows: wang2024b-a (2.5 mm MZM, 1550 nm), wang2024b-b (same chip, 1310 nm), wang2024b-c (2 um racetrack with EO tuning). repro_grade C, no sim config.
- Not reported: IL, RF loss, Z0, signal width, electrode thickness, cladding of the MZM, ground widths; ER 15 dB is quoted without wavelength (not entered); tuning only in MHz/V (no nm/V column fill, wavelength of Fig. 3(c) not stated).
- Judgment calls: bandwidth entered as 41 GHz approx (extracted_from_figure) rather than a bound, because the plotted trace (to 50 GHz) touches -3 dB near 33-35 GHz, crosses near 41 GHz and the paper says "more than 40 GHz" (abstract "up to 40 GHz"); V_pi L values derived (authors); n_rf and ng 2.25 are author design statements (author_estimate); 5.6 dB/m platform loss is from a different (2 um wide) resonator and kept in paper notes; film 600 nm vs 220 nm etch + 400 nm slab is inconsistent (both entered as stated); SEM Fig. 3(e) suggests a narrower electrode gap than the stated 2.5 um per side; electrode_type tw_gsg and lumped (racetrack) are my reading of the SEM (derived entries).
- CSV hints: confirmed (no arXiv id; license CC-BY-4.0 verified). "VpiL truncated" resolved: 1.9 V cm at 1550 nm, 1.6 V cm at 1310 nm.

## wang2025 - distilled
- Source: ACS Photonics ASAP PDF (lettered pages A-E, no volume or pages; issue version not read); Crossref gives only STM-ASF policy URLs, no open license.
- Rows: wang2025-a (7 mm CLTW MZM with backside holes, up to 28 dBm on-chip). repro_grade B. Sim config: sims/wang2025/config.yaml.
- Not reported: measurement wavelength, Z0 as one number (Fig. 3(h) oscillates about 47-60 ohm), RF loss as dB/cm (only EE S21 roll-off 5.7 dB at 67 GHz and simulated alpha0 0.194), fab facility, ground widths.
- Judgment calls: one row for both optical powers (0 and 35 dBm fiber input give the same V_pi, IL, ER, bandwidth), optical_power_handling 28 dBm as a lower bound (source-limited); optical_input_power_dbm left empty; bandwidth 55 GHz approx (authors "around 55 GHz", traces first reach -3 dB near 50-51 GHz and oscillate about -3 dB to 63 GHz); optical_power_handling 28 dBm is derived (35 dBm input minus 7 dB, authors); V_pi L 3.22 derived; IL 2 dB with unknown normalization; n_rf 2.25 read from Fig. 3(g) plateau; drive/convention push_pull/mzm_push_pull derived from layout; max_baud 100 GBd derived from 100 Gb/s OOK.
- Sim limitation: X-112 deg Y cut cannot be represented (SPEC_PROPOSALS.md); config uses x-cut/y and targets the authors' simulated 2.41 V cm along Y, measured 3.22 marked non-comparable.
- CSV hints: confirmed (platform TFLT, class MZM); local_source_path not recorded.

## Organizations
- New: Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences (research_institute, CN). Wafer suppliers (Novel Si Integration Technology) kept in `wafer_supplier` text, not added as organizations.

## Not read
- Optica version of wang2024a; Supplementary material of wang2024b/wang2025 (not cached); Fig. 5-6 numeric ER/SNR/BER values of wang2025 (not entered).

Update (coordinator, 2026-10-04): the wang2024b-a judgment call above is superseded. Per convention (c) ("when the paper states a bound that differs from the measurement range, bw3db_ghz carries the paper's bound with gt"), the row now stores bw3db_ghz 40 with gt, basis measured, bw_measured_to_ghz 50; the figure behaviour stays in the notes.
