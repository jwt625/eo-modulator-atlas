# p5_05 batch report (verified_on 2026-10-04)

Papers: yamaguchi2026, yu2026, zhang2026b, zhou2026, aihara2026 (OFC 2026, 3 pages each). Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 9 device rows, 7 new organizations, 5 evidence files). All papers rows `audit_status: needs_audit`, `repro_grade` C, no sim configs. `crossref.json` exists only for zhang2026b (year only, no license, no affiliations); identity for the other four from PDF page 1 and the batch row. No cache repair. `published_on` empty for all (PDFs print no date; batch dates are schedule dates). License `publisher-copyright` from the page footer notice, `restricted_local_only` (pattern of existing OFC rows).

## yamaguchi2026
- Status: distilled. 3 rows: -a waveguide-crossing chip (45 mm, bw >110 GHz, ER about 50 dB, fiber-to-fiber 19.6 dB), -b folded chip (40.5 mm, trace above -3 dB to 110 GHz), -c folded packaged module (Vpi 2 V, ER 40 dB, bw 100 GHz, 9.2 dB loss; length_mm empty, see judgment calls).
- Not reported: wavelength, material cut for -a, electrode metal, signal width, etch, fab, wafer supplier, Vpi for the chips, Z0/n_rf values.
- Judgment calls: Review paper of two earlier designs, numbers taken from this paper only. Chip -b has no stated 3 dB value (authors use 1 dB bandwidth 100 GHz); `bw3db_ghz` 110 `gt` is my figure reading (basis extracted_from_figure, note). Module bw 100 GHz as stated (blue trace crosses -3 dB near 100 GHz). Vpi 2 V and ER 40 dB assigned to the module row because the text places them in the module paragraph and the Conclusion attributes 2 V to the packaged module; chip/module not distinguished by the authors. `drive` push_pull and `bw3db_reference` dc are derived entries (not stated). 9.2 dB module loss entered as fiber-to-fiber (definition not detailed). 800 nm LN and 500 um SiO2 are cross-section label readings. 2 um label in Fig. 1(b) not entered (meaning not defined). No length on the module row and no derived VpiL: the equalizer sections cancel at low frequency, so Vpi x 40.5 mm is not a DC efficiency (audit F2); tagged results_from_prior_paper (audit F7).
- CSV hint: published_on (schedule date) not used; hint class mzm confirmed.

## yu2026
- Status: distilled. 1 row (TFLN differential MZM in the TOSA; 210 GBd PAM4, 420 Gb/s, 23-tap equalizer, SER 9.7e-3; four assembly/driver samples in `modulation_format`).
- Not reported: modulator geometry, fab, length, electrode, on-chip power, IL, BER, any measured modulator trace.
- Judgment calls: Modulator numbers (bw about 110 GHz, Vpi < 2 V) are stated without data: Vpi entered as `lt` with basis design_target; bw3db `approx` basis measured with a note that no trace is shown. Figs. 2-3 S21 curves are simulations and not entered. `drive_vpp_v` 2 `gt` is the driver output swing, not an AWG value.
- CSV hint: fine.

## zhang2026b
- Status: distilled. 3 rows: -a typical 5 mm device (Vpi 4.29 V at 1310 nm, VpiL 2.15 derived, RF/optical index, RF loss approx 8.9 dB/cm at 100 GHz from Fig. 3(c)); -b wafer-best VpiL 1.87 V cm; -c best-bandwidth device 110 GHz (range 93 to 110 GHz).
- Not reported: modulator waveguide width, signal and ground width, sidewall angle, wavelength for -b/-c, length for -c, IL, ER of the modulator (the >25 dB is an unbalanced passive MZI).
- Judgment calls: Grade C, no sim config: film, rib/slab, BOX, cladding, Al thickness and gap are stated, but signal width is not in text and cannot be read from the low-resolution XSEM or microscope image. Bandwidth, Vpi and wafer-best VpiL are not linked to common devices by the paper, hence three rows. VpiL 2.15 and the wafer-best 1.87 are `derived` (author Vpi x L; audit F3); `integration` monolithic (audit F10). `etch_depth_nm` 200 is derived (350 - 150 slab; paper states 200 nm rib thickness). n_rf 2.2 and ng_opt 2.27 `derived` (extracted from S-parameters/MZI; text calls 2.27 phase index, legend ng). Propagation loss 0.37 dB/cm is from 1.0 um passive waveguides at 1330 nm. `drive` unspecified (derived). Fab not named (authors at IME), so `foundry_or_fab` empty; NanoLN as wafer supplier.
- CSV hint: fine.

## zhou2026
- Status: distilled. 1 row (GSSG differential MZM; Vpi 2.7 V, PAM4 up to 182.5 GBd, TDECQ values in `modulation_format`).
- Not reported: wavelength, length, geometry, IL, line rate (365 Gb/s only in derived list), fab location.
- Judgment calls: Measured EO S21 ends near 67 GHz (1 dB roll-off); bw3db 67 `gt` basis measured (end of measured trace, 1 dB roll-off); the authors' extrapolated >140 GHz (simulation curve) is in notes only (audit F1); `bw_measured_to_ghz` 67. Vpi: text says 2.7 V, figure header says < 2.7 V; entered 2.7 with `lt`. ER 2.4 dB `approx` read from the right axis of Fig. 2 at 182.5 GBd. Liobate Technology (designer and fabricator per acknowledgement) is not in `foundry_or_fab` because the paper prints no country (coordinator decision F6). Linear-driver/CTLE results are VPI simulations, not entered.
- CSV hint: fine. Abstract prints (c) 2024 The Author(s), footer 2026 Optica; license recorded from the footer.

## aihara2026
- Status: distilled. 1 row (100 um membrane InGaAlAs EAM: bw 103 GHz at -1.5 V, static ER 3.8 dB, 0.5 V swing, 200 GBd TDECQ 4.7 dB, 448 Gbps PAM4 eyes).
- Not reported: IL, fab, geometry beyond 230 nm InP membrane and 100 um length, optical input power, Vpi (EAM).
- Judgment calls: `max_baud_gbd` 200 (stated) with `max_line_rate_gbps` 448 (eyes only, baud for it not stated; both stated maxima kept per coordinator decision F4). Wavelength 1310 nm approx from the lasing spectrum peak (Fig. 2(a)). Mixed temperatures (55 C system and static, 25 C EO response) left in notes, `temperature_class` empty. `integration` other, `waveguide_platform` inp (membrane on Si, bonding method not stated). Laser energy 0.12 pJ/bit not entered (laser only). Paper prints "NTT, Inc."; mapped to the existing Nippon Telegraph and Telephone Corporation organization (coordinator decision F5), staged "NTT, Inc." row removed.
- CSV hint: platform inp_mqw and class eam confirmed.

Audit corrections: see AUDIT_DISPOSITIONS.md. Each evidence YAML carries a context_values license_notice with the printed Optica footer.
