# p3_06 batch report (verified_on 2026-10-02)

Papers: hu2026, geravand2025, zhong2026, gupta2023. Dry-run merge: 0 conflicts, 0 validation errors (4 papers, 10 device rows, 10 new organizations, 4 evidence files). No sim configs (all silicon or InP). `text.md` and `figures/` were present for all four papers; no cache repair needed.

## Version note
| Paper | Numbers come from | Other version |
|---|---|---|
| hu2026 | arXiv 2509.01555v1 (55 pp incl. SI) | Laser & Photonics Reviews 20(13) e02840, issued 2026-03-06 (Crossref): not read |
| geravand2025 | arXiv 2412.17986v1 (stamp 23 Dec 2024, 34 pp incl. Supplementary Notes) | Nature Photonics 19(7) 740-750, issued 2025-06-03: not read |
| zhong2026 | version of record, Nat. Commun. 17:1069 (8 pp; CC-BY-NC-ND-4.0 verified in PDF and Crossref) | Supplementary Information not cached |
| gupta2023 | accepted manuscript (author's version, IEEE notice, 7 pp) | JLT 41(11) 3498-3504 version of record: not read, numbers may differ |

Licenses: hu2026, geravand2025, gupta2023 have `license` empty and `restricted_local_only`. zhong2026 has `CC-BY-NC-ND-4.0` but kept `restricted_local_only` (NC/ND terms; same as source.json).

## hu2026
- Status: distilled. Rows: 1 paper, 2 devices (one physical 8 um radius ring split by operating point: -a 0 V self-biasing, -b -3 V depletion), 2 evidence blocks. repro_grade C, sim config none (silicon resonator).
- Not reported: doping levels, BOX thickness, cladding, fabricator name ("12-inch CMOS foundry"), single-bias Vpi, RF Vpi, BER for the 360/400 Gb/s and 180 GBd eyes, on-chip power for data runs, net rate.
- Judgment calls: static spectral values (Q 1500, FSR 7 nm, ER 49 dB, IL 1 dB, 24.5 pm/V, Vpi*L 0.57) only on -a; Vpi*L is resonance-shift derived (formula checks: 7 nm x 40 um / (2 x 24.5 pm/V) = 0.57), so `vpi_convention = resonance_tuning_derived`. 3 dB BW is operating-point dependent: 83 GHz at 0 V (6 dB IL point, die 5), more than 110 GHz at -3 V (110 with `gt`, measured-to 110). `bw3db_reference = unspecified` (normalized S21, reference not stated). Wavelength 1315 nm approx is read from Fig. 3(b) (S21 wavelength not stated). Energies (0.97, 2.89 fJ/bit) are the authors' formula (basis derived; I checked 0.97, 0.78, 16, 2.89 against the formula with Cj 21/16 fF). Capacitance basis `simulated` (SI p.39 Sentaurus; main text says estimated). Optical power -3.01 dBm (`lt`) is the 500 uW limit converted.
- Paper inconsistencies: Fig. 5 caption says 1 Vpp while text and Fig. 5(b) say 2 Vpp (2 entered); p.16 quotes PCIe Ebit as 0.97/0.49/0.78 pJ/bit while abstract and Methods use fJ/bit.
- CSV hints: `published_on` 2025-09-01 not verifiable from the cache (left empty); Crossref title uses U+2010 hyphens, ASCII used; priority/platform/device_class fine.

## geravand2025
- Status: distilled (device rows only for measured modulator metrics). Rows: 1 paper, 2 devices (-a stand-alone over-coupled add-drop MRM; -b MRA-MZM I/Q modulator with four MRMs), 2 evidence blocks. repro_grade C, sim config none.
- Not entered: all simulated small-signal bandwidths and BPSK time-domain results (Figs. 2-3, Extended Data Figs. 1-2), nonlinear modeling, stabilization loop details.
- Not reported: MRA-MZM-level Vpi and length, rib width/slab/etch, BOX, cladding, on-chip optical power for data, temperature, a 3 dB bandwidth for the single MRM (only a more-than-10 dB peak near 35 GHz).
- Judgment calls: row -a Vpi 6.28 V (phase vs voltage, `per_arm_phase_shifter`, approx) and Vpi*L 0.96 V cm (resonance-shift formula, 0.5 V reverse bias) use different conventions; both entered with a note, `bias_for_vpi_v` -0.5 applies to the Vpi*L only. 4 GHz/V converted to 0.032 nm/V at 1550 nm (derived). Row -b: 3 dB BW 35 GHz approx (text; figure label reads about 36), 6 dB BW 60 GHz `gt`, measured-to 67 GHz (67 GHz VNA, p.32; Fig. 5(i) axis), reference `dc` derived, S21 measured on a single MRA-MZM at quadrature through a balun, not on the full I/Q chip. ER 30 dB `gt` static (MRA-MZM spectra). `il_onchip_db` 1 dB = on-chip routing only; `il_fiber_to_fiber_db` 6 dB is the authors' packaged passive loss (per-facet vs total coupling not stated). Net rate 1000 Gb/s `gt` (DP 32QAM, 80 km, "surpassing 1 Tb/s"; 125 GBd x 5 x 2 / 1.24 = 1008 by my arithmetic, not entered); single-polarization maximum 524.19 Gb/s/pol in the evidence note. Energy 10.4 fJ/bit is the authors' number (formula needs Vpp, which is not stated explicitly), capacitance 18 fF `author_estimate` from the S11 fit (which structure was measured is not stated). `published_on` 2024-12-23 from the arXiv stamp visible in the cached file.
- CSV hints: platform/device_class fine (ring plus iq_mzm used); priority fine.

## zhong2026
- Status: distilled. Rows: 1 paper, 1 device (PCNC modulator, -3 V), 1 evidence block. repro_grade C (geometry in the uncached SI), sim config none.
- Not reported in the main text: Vpi in volts, PCNC period/hole dimensions, doping levels, BOX, cladding, on-chip optical power, RF loss, temperature.
- Judgment calls: `device_class = other` (resonant cavity, no matching class). 3 dB BW 110 GHz `gt` at the -3 dB detuning point (59 and 97 GHz at -1/-2 dB detuning in the note), measured-to 110 GHz, `eo_rolloff_db` 1.84 at 110 GHz (author figure; relative to the low-frequency level of the same trace, read from Fig. 3(b) annotation), reference `dc` derived. Vpi*L 0.38 V cm and 80 pm/V at -3 V (bias_for_vpi_v -3, the center of the -2 to -4 V interval, basis derived). Energy 5.9 fJ/bit = C*Vpp^2/4 with the designed 5.9 fF and about 2 Vpp (the 5.9 fF is a design value, `design_target`). Dynamic ER 0.6 dB is the 110 Gb/s eye (Table 1 says less than 1 dB). Q 2930 (text) vs 2920 (Table 1). IL 2.8 dB: normalization not stated.
- CSV hints: batch notes said "no metric extraction" and `sim_candidate unknown`; metrics were extracted, no sim (silicon resonator). `year` 2026 follows the volume citation; Crossref issued 2025-12-18 is in `published_on`.

## gupta2023
- Status: distilled. Rows: 1 paper, 5 devices (5 mm headline at 1550 nm; 4 mm and 3 mm bandwidth rows; 5 mm at 1530 nm and 1570 nm Vpi-only rows), 1 evidence block. repro_grade C, sim config none (InP).
- Not reported: Z0 and n_RF values (50 ohm is a design target, not entered), RF Vpi, RF loss, group index, optical input power, per-length Vpi/IL/ER for 3 and 4 mm, MQW and electrode dimensions, bias for the 1530/1570 nm Vpi values.
- Judgment calls: Vpi 1.4 V at -10 V bias, push-pull (authors state antiphase division over the two diodes with a single-ended 50 ohm feed, so `drive = push_pull`); Vpi*L 0.7 V cm entered as the authors' conversion (basis derived). IL 12.5 dB is entered as fiber-to-fiber (includes 4 dB SSC coupling referenced to fiber-fiber, 4 dB MQW propagation, 3 dB butt joints, about 1.5 dB passive); no on-chip number. Static ER 31 dB (fiber and external PD) with the 20 dB integrated-PD figure in the note. EO S21 at 8 V bias, eyes at 10 V bias with 1.4 Vpp; 80 Gb/s NRZ and 24 GBd PAM4 are eye diagrams without BER. `bw3db_reference = unspecified`. Wavelength rows follow convention (d) (wavelength is an operating point).
- CSV hints: `access_guess paywalled` kept; cached copy is the accepted manuscript from the project site (source_type journal). Batch note "Unverified: Fraunhofer HHI generic platform" is confirmed (Fraunhofer HHI, JePPIX open-access MPW).

## Organizations added (10; none exist in data/organizations.csv)
Zhangjiang Laboratory (CN); Fudan University (CN); Université Laval (CA); Advanced Micro Foundry (SG, foundry); CMC Microsystems (CA, other; MPW service provider); Shanghai Jiao Tong University (CN); Nanyang Technological University (SG); Fraunhofer Heinrich Hertz Institute (DE); Technical University Berlin (DE); KEEQuant GmbH (DE). Shanghai Jiao Tong University also appears in staged p3_03 (same type/country/region, different notes); the coordinator should merge the duplicate. Country for CMC Microsystems and Advanced Micro Foundry is not stated in the paper text (entered from outside the paper, noted in each row).

## Blockers
None. Follow-ups: version-of-record checks for hu2026, geravand2025 and gupta2023 could change numbers; zhong2026 SI (Notes 1-7) would raise it toward grade B (PCNC geometry, doping, uniformity data).

## Audit corrections (2026-10-03)
Q1 audit findings F6-F15 and F25 resolved; details in `AUDIT_DISPOSITIONS.md` (7 applied, 4 applied-adjusted, 0 rejected, 0 deferred; cross-batch F24 and F26 left to the coordinator). Row counts unchanged (10 rows, 4 evidence files). Changes: hu2026-b eye-only caveat for the 400 Gb/s headline; hu2026 wafer-map minimum 81.8 GHz; `drive_vpp_v` basis author_estimate (hu2026-a, -b); geravand2025-a Vpi basis derived (fit extrapolation); geravand2025-b net rate basis derived, fiber-to-fiber loss caveat and S21 bias note; zhong2026-a 59/97 GHz reference caveat; gupta2023 Vpi defined as the diagonal length in the two-port voltage plane, IL caveat, `published_on` emptied; three evidence notes shortened to 25 words or fewer. Dry-run merge: 0 conflicts, 0 validation errors.
