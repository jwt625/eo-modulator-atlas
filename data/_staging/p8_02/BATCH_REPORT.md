# Batch p8_02 report (distiller, 2026-10-07; corrected after the independent audit, see AUDIT_DISPOSITIONS.md)

Dry run (after audit corrections): `merge counts: {'papers': 5, 'devices': 8, 'orgs': 10, 'evidence': 5}; conflicts: 0; validation errors: 0` (University of Ottawa already exists in data/organizations.csv, so orgs counts 10).
All five sources are cached arXiv copies without crossref.json: url = arXiv abstract page, source_type arxiv_preprint, authors as printed, license empty (coordinator fills with `scripts/refresh_metadata.py`), redistribution restricted_local_only (arXiv default). published_on is empty except park2026 (v1 stamp 2026-03-23); the other cached texts print no v1 date (gaier2025 cached v2 stamp 2025-06-30 not used). `discovered_via` is `web_search;author_group_followup`: the batch token `continuation_2026_10_02` is not in the validator vocabulary. No needs_download.md, no SPEC_PROPOSALS.md.

New organizations (11 staged, 10 new at merge): Delft University of Technology, Southwest Jiaotong University, Tianfu Xinglong Lake Laboratory, Jinan University, University of Ottawa, Korea Institute of Science and Technology, Korea University, Sejong University, Korea University of Science and Technology, Kyung Hee University, Korea Advanced Institute of Science and Technology. ror_id and name_source empty. Reused: EPFL, Harvard University, DRS Daylight Solutions, City University of Hong Kong, Nankai University, Nanosystem Fabrication Facility.

## gaier2025 - distilled (2 rows, grade B after audit, sim config deferred)
- Rows: -a WR9.0 and -b WR2.8 antenna-coupled 2 mm phase modulator (VpiL 3.4 / 3.65 V cm, authors' derived values with an Eq. 1 coupling-efficiency estimate, per-arm convention, no single frequency). The racetrack row -c was dropped by the audit (m1, convention dd); its comb/Q facts are in the papers notes. The 6 GHz IF detection flatness (+-3 dB, 278.1 GHz carrier) is not a bandwidth entry (N3).
- Audit corrections: film 600 nm, slab 300 nm, etch 300 nm (derived), sidewall 60 deg from the film plane filled from Methods p.13, Table 1 and Fig. S1(b) (N5); only the cladding thickness (800 nm vs 1 um) stays empty. repro_grade B (M1). Sim config deferred (DevLog-022).
- Judgment calls kept: 1 dB/mm optical loss as 10 dB/cm via a derived entry; 9 dB/facet coupling in notes only; fit-curve RF loss and mmWave index (Fig. 3e,f) in notes (convention aa); physical_device_id empty on -a/-b.
- Not reported: DC Vpi, device insertion loss, Z0, ER, foundry.

## liu2025d - distilled (1 row after the coordinator dropped -b, grade C, no sim)
- Rows: -a antenna + racetrack ring (Q_L 4.4e5 from the Fig. 2d inset, FSR 30.5 GHz, 1 GBd QPSK link 2 Gb/s); -b same antenna without ring (reference configuration, no device-level metric).
- Audit correction (N2): the 1.5 / 1.6 GHz widths are RF band-pass 3 dB full widths around 30.5 GHz, not EO bandwidths; all bandwidth fields cleared, widths in notes.
- Judgment calls: wavelength 1554.4 nm read from the Fig. 2d/e axes (approx qualifier, extracted_from_figure); fsr_nm 0.2458 derived from it; FOM 3.88 W^-1/2 notes only; waveguide_platform empty.
- Not reported: all geometry, fabrication, optical power, Vpi, IL, ER.

## xie2024 - distilled (1 row, grade C, no sim)
- Row: -a push-pull slotted-electrode MZM (Vpi about 3 V, BW above 67 GHz, NanoLN stack 500 nm film / 250 nm etch / 250 nm slab / 4.7 um BOX); electrode_type cl_twe from the cited micro-structured design [56] and Fig. 2(a) (audit m8).
- Audit correction (N4): the 19.3 dB carrier suppression is not entered (Fig. 2(c) carriers differ by about 9 dB, legend and caption conflict); er_type empty.
- Judgment calls: Vpi in vpi_dc_v (frequency unstated, quasi-static default); mzm_push_pull inferred; BW > 67 GHz is a text claim without EO S21 (method unspecified, bw_measured_to empty; 67 GHz is the source limit, probe rated 50 GHz); no rows for the double-pass phase modulator or the thermally tuned ring; NFF in foundry_or_fab.
- Not reported: MZM length, wavelength, electrode metal/gap/widths, cladding, optical loss.

## zhang2024 - distilled (2 rows, grade B, sim config sims/zhang2024/config.yaml)
- Rows: -a 8 mm capacitively loaded GSG MZM on quartz (DC Vpi 3.04 V, VpiL 2.43 V cm, BW 145 / 310 GHz, loss 14 dB/cm at 300 GHz, Z0 about 46 ohm, n_rf about 2.26), -b the 6 V RF Vpi point at 300 GHz (shared physical_device_id).
- Audit correction (N1): the RF Vpi 8 V at 500 GHz is not entered (self-contradiction: Fig. 3(c) measured 9.6-11.7 V, smoothed about 10.5 V, calculated about 8.3 V); all readings in notes. rf_loss basis measured (m5).
- Judgment calls: electrode_metal empty (Cu in Fig. 1(g) vs gold in SI Table 1); 3 / 6 dB bandwidths basis derived (processed OSA S21, reference dc); Z0 46 ohm approx derived; vpi_dc_freq empty (kHz sweep); THz generator (4.86e-6 /W at 500 GHz, 10 mm) and electro-THz modulation kept in notes; slab 250 nm derived; band c_band with empty wavelength.
- Sim config: follows the xue2026 T-rail precedent. Constants from wang2024b p.15 (LN), mao2022 p.3 (SiO2 n), yang2022 p.2 (SiO2 eps), kharel2021 p.3 (quartz eps), all read; metal sigma is an `unknown` placeholder under missing. The signal-electrode provenance is project_inference (m6). Targets marked low confidence; engine not run.

## park2026 - distilled (2 rows, grade C, no sim)
- Rows: -a EO MZI at 1064 nm (Vpi 3.98 V DC sweep, static ER 23.2 dB, fiber-to-fiber 14.3 dB); -b the cascaded MZI + PPLN read at 532 nm (Vpi 3.98 V from the SH curve, ER 42.2 dB), same physical_device_id.
- Audit corrections: drive push_pull inferred from Fig. 3(a) (derived entry, m3); PPLN ridge design values (rib 2082 nm, etch 240 nm, slab 60 nm derived) now on both rows (m4).
- Judgment calls: the 42.2 dB is an SHG-squared, noise-floor-limited contrast kept as a separate 532 nm row; no bandwidth (rise/fall 0.612/0.669 ns are PD-limited at 1.2 GHz); waveguide_platform lnoi_rib from the stated ridge in TFLN; whether the 14.3 dB includes the PPLN section is not stated.
- Not reported: MZI length, electrode gap, optical power, wafer, facility.

## Schema/skill gaps
- discovered_via vocabulary lacks `continuation_2026_10_02`.
- No columns for SHG efficiency, g0, comb slope, antenna coupling efficiency or receiver FOM (all in notes).
- No representation for band-pass widths around a resonance or antenna peak (liu2025d, gaier2025 IF flatness): kept in notes, no bandwidth fields.
