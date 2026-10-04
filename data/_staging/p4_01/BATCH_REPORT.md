# p4_01 batch report (verified_on 2026-10-04)

Papers: arabjuneghani2022, valdez2023a, liu2025, liu2025b. Dry-run merge: 0 conflicts, 0 validation errors (4 papers, 8 device rows, 1 new organization, 4 evidence files). Three sim configs written (arabjuneghani2022, valdez2023a, liu2025b); the engine was not run. All papers.csv rows carry `audit_status: needs_audit`. No network access; nothing written into `references/`. Page renders were opened for every figure value used; Fig. 4(b),(d) of valdez2023a and Fig. 1(a) of arabjuneghani2022 / liu2025b were re-rendered at 300-400 dpi in the scratchpad for reading.

## Version note
| Paper | Numbers come from | Other version |
|---|---|---|
| arabjuneghani2022 | institutional copy of the version of record (6 pp, license CC-BY-4.0 per Crossref am/vor) | Supporting Information not cached |
| valdez2023a | arXiv 2211.13348v1 (12 pp incl. SI, dated 2022-11-23 on p.1; slightly different title) | Optica 10(5) 578, 2023-05-02: not read |
| liu2025 | local-corpus author manuscript (15 pp, no arXiv stamp, version unknown) | Crossref record 10.1002/lpor.202570057 may be a cover/front-matter record, not the article |
| liu2025b | Light: Advanced Manufacturing version of record (7 pp), CC-BY-4.0 from the paper's notice | none |

## arabjuneghani2022
- Status: distilled. Rows: 1 paper, 2 devices (modulator #1 G = 5 um; #2 G = 10 um, headline), evidence for both. repro_grade B, sim config `sims/arabjuneghani2022/config.yaml` (device #2).
- Not reported: BOX thickness, sidewall angle, wavelength of the Vpi sweep, polarization, Z0 as a single number (49-52 ohm range only), RF-line data for #1, optical loss for #1, fabricating site, wafer supplier.
- Judgment calls: Measured bandwidth of #2 is a bound: bw3db 100 with gt, bw_measured_to 100; the authors' 170 GHz model extrapolation is in notes only (audit F1). bw3db reference `unspecified` (curves normalised at "low frequencies"). VpiL 2.2 / 3.3 stored as author-stated, basis derived (Vpi x 0.5 cm). n_rf 2.2 and RF loss 3.6 dB/cm at 67 GHz are extracted from measured S-parameters, so basis derived. Optical loss below 0.02 dB/cm is simulated (basis simulated, lt). RF VpiL below 4.1 V cm up to 100 GHz entered as vpil_rf_vcm with lt and vpi_rf_freq 100. Energy 124 fJ/bit (PAM-8, 240 Gb/s) stored with 81 fJ/bit in the evidence note. Data demos assigned to #1 (Sec. 3.4, Fig. 8(a)) although the abstract says "these modulators".
- Paper inconsistencies: Fig. 3(c) caption words D from the signal edge, Sec. 2 and Fig. 1(a) define it from the gap centre (text definition used); the text calls Fig. 1(a) rib "800 nm wide" without top/bottom.
- CSV hints: none wrong.

## valdez2023a
- Status: distilled. Rows: 1 paper, 2 devices (0.4 cm, 0.8 cm), evidence for both. repro_grade B, sim config `sims/valdez2023a/config.yaml` (0.8 cm; 0.4 cm shares the cross-section).
- Not reported: signal and ground widths, T-rail w and c, ER and IL of the 0.4 cm device, RF loss and Z0 curves (only Fig. 1(b) simulated n_RF), propagation loss of the hybrid mode, bias, temperature.
- Judgment calls: bandwidth 100 GHz with bw_measured_to 110, following the paper ("beyond 100 GHz"): gt for the 0.4 cm row (trace first below -3 dB at the last point, about 110 GHz), approx for the 0.8 cm row (noisy trace dips below -3 dB near 95-103 GHz; audit F3, re-read in Fig. 4(d)). Reference 1 GHz (Fig. 4 caption). Vpi is a squared-cosine fit to measured transmission, kept `measured`; VpiL 0.8 stored basis derived. IL 12 dB is the authors' subtraction (author_estimate) and excludes edge couplers and 4.2 mm feeders. n_rf and ng_opt on the 0.8 cm row only (one Fig. 1(b) result for the shared design); ng read at the nRF intersection (extracted_from_figure, approx). T-head unit cell (L = 20, t = 15, h = 2 um) read as period / head length / recess in the sim config (project_inference).
- CSV hints: id renamed valdez2023a (valdez2023 is a different paper); venue and year follow the journal version, source is arXiv v1.

## liu2025
- Status: distilled. Rows: 1 paper, 2 devices (C-band and O-band operating points of one 7 mm device). repro_grade C, no sim config (main CPW gap, ground width, T-bar thickness, stem length and period not given; Fig. 1 is a schematic).
- Not reported: optical loss, ER, bias, Z0 as a number (Fig. 7(c) curve about 34-39 ohm, not entered), RF loss per cm (text gives about 3.4 dB total S21 up to 110 GHz for 7 mm; Fig. 7(d) about 4-5 dB/cm), BER, fabricator, wafer supplier.
- Judgment calls: DOI cleared: the cached Crossref record is the issue cover record, so the article DOI is unverified and needs a Crossref fetch (audit F4); arXiv id 2411.15037 comes from the batch CSV and cannot be seen in the PDF. License and published_on empty (preprint pattern). Drive/push-pull inferred from the layout, evidence basis derived. Measured bandwidth is a bound: bw3db 110 with gt (Table II '> 110'), basis measured; the extrapolations 220/218 GHz are in notes only (audit F2); roll-off 0.77/0.83 dB with lt (text says both "only" and "less than"). Energy 4.42/0.69 fJ/bit uses the paper's formula Vrms^2/(B R) with stated Vrms (basis author_estimate, entries); R is not stated in the formula, the 35 ohm termination is stated separately. n_rf 2.22 on the C-band row only (device-level property). Sidewall 50 deg is a design value (design_target).
- Paper inconsistencies: Fig. 9 label "PAM8 112Gbit/s (112Gbaud)" is likely 336 Gbit/s; Sec. 4 text cites Fig. 9(c),(d) while panels are (b),(c).
- CSV hints: year/venue per Crossref (2025, Laser Photonics Rev. 19(14)); title is the Crossref title without its issue suffix.

## liu2025b
- Status: distilled. Rows: 1 paper, 2 devices (10 mm chip; packaged module). repro_grade B, sim config `sims/liu2025b/config.yaml` (chip).
- Not reported: chip-level IL and ER, Vpi and length of the packaged module, wavelength of the packaged measurement, BER, fabricator, wafer supplier, modulator waveguide width (2.5 um top width in the process text vs 1 um test waveguide).
- Judgment calls: bw3db 110 with gt (2.3 dB roll-off at 110 GHz) and reference `unspecified`. Vpi text says 500 kHz triangular sweep, Fig. 4 caption says "at 1 GHz" (noted). RF numbers (n_rf 2.22, 4.4 dB/cm at 110 GHz, 47 ohm) are simulations of a 600 um unit (basis simulated). Propagation loss 0.2 dB/cm is one cut-back block on a 1 um test waveguide (wafer-wide below 0.4 dB/cm). Packaged row kept sparse because Table 1 merges chip and module data. Max line rate 380 Gb/s is 2 x 190 GBd (derived list); the authors state only the 400 Gb/s outlook.
- Sim config: waveguide width (1 um), flat SiO2 top 3 um above the rib, window footprints, CPW gap 27.6 um (= 2h + 2s + g from the labelled top view) are project inferences.
- CSV hints: venue page "1" replaced by article number 47; published_on follows the accepted-article-preview date (liu2023 pattern); year 2025.

## Sim configs (shared caveats)
All three follow the zhang2022 / chen2022 / valdez2023 precedent: material constants (LN indices, RF permittivities, Pockels tensor, SiO2/Si/quartz/SiN constants, gold conductivity) are UNVERIFIED placeholders under class `unknown`, so none is a literature comparison yet. Placeholders beyond constants: arabjuneghani2022 BOX thickness (2 um); valdez2023a signal and ground widths (55 and 100 um, inherited from sims/valdez2023); liu2025b waveguide width and SiO2 profile.

## Blockers and gaps
- None blocking. SPEC gap: no way to express bound-type targets (bw3db "over 100 GHz") or the T-bar stems; handled by omission and `limitations`. No SPEC_PROPOSALS.md written.
- Open decisions copied from the dominant pattern: arXiv-row year = journal year, published_on empty, license empty, `restricted_local_only`.
