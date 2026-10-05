# p5_04 batch report (verified_on 2026-10-04)

Papers: huang2026, shen2026, starnault2026, su2026, tobing2026 (OFC 2026, 3-page papers). 7 device rows, 5 new organizations, all papers `audit_status: needs_audit`. Dry-run merge: 0 conflicts, 0 validation errors. All five are TFLN papers but none discloses enough electrode geometry (gap, width, BOX, rib width) for a sim config: repro_grade C for all, no `sims/` configs. `crossref.json` exists only for su2026 (year only, no license, no affiliations); identity for the others from the PDF first page and batch CSV. License entered as `publisher-copyright` (Optica notice on every page), `restricted_local_only`, `published_on` empty (schedule date not confirmed), following the existing OFC 2026 pattern.

## huang2026
- Status: distilled. 2 rows: -a bare TFLN EOM chip (3 dB 110 GHz), -b packaged CPO engine (3 dB above 100 GHz, Vpi 4 V, loss under 4.2 dB, 94 GHz tone demo). Grade C, no sim.
- Not reported: chip type (MZM vs phase), length, geometry, S21 wavelength, fab, Vpi frequency.
- Judgment calls: `device_class` other (EOM type not stated). `il_fiber_to_fiber_db` 4.2 lt for the packaged module although the paper only says "optical insertion loss" (fibers attached; definition not stated, flagged in evidence note). Bandwidth `gt` 100 with no `bw_measured_to_ghz` (axis extent not a stated limit). 24 dBm is RF power, so `drive_vpp_v` empty. Simulated 200 GHz packaging bandwidth not entered. Wavelength 1550.12 nm is the T/F demo laser.
- CSV hints: fine.

## shen2026
- Status: distilled. 1 row: 5.8 mm TFLN MZM at 1064 nm in a GaAs-on-TFLN transmitter. Grade C, no sim. New orgs: Nexus Photonics, Northeastern University, Keysight Technologies.
- Not reported: electrode gap/width, rib width, BOX, cut, IL, ER, baud, driver models.
- Judgment calls: Vpi 3.1 V is the Fig. 3(d) label (`extracted_from_figure`); VpiL 1.8 V cm `derived` (authors' extraction from modulation depth, 2 MHz). Bandwidth: paper says "exceeding 100 GHz", S21 shown to 110 GHz; entered `bw3db_ghz` 100 gt, measured-to 110; the fit curve ends near -3.5 dB at 110 GHz and the data mixes VNA and OSA points (noted). Slab 180 nm read from the Fig. 3(a) label. `integration` bonded_heterogeneous (GaAs bonded onto the TFLN wafer). Laser results (DFB, tunable) not rows.
- CSV hints: fine.

## starnault2026
- Status: distilled. 2 rows: -a binary-weighted MZM oDAC (IM/DD), -b binary-weighted IQM oDAC (coherent-lite). Grade C, no sim. HyperLight reused under its existing org name (paper: HyperLight Corporation).
- Not reported: geometry, length, fab, on-chip power, measured EO S21 (only a simulated 6 dB bandwidth).
- Judgment calls: Vpi 2.2 V (differential, low MHz) and simulated 6 dB bandwidth are one sentence about "the BW oDACs"; applied to both rows. `bw6db_ghz` 100 gt, basis simulated. `drive` dual_drive and `vpi_convention` mzm_differential are inferences (derived evidence entries). `drive_vpp_v` 0.6 from "600 mV differential" (peak-to-peak not stated). Line rate 448 Gbps not entered (qiu2026 precedent); net rates 540 and 1200 Gb/s `derived`. Dual polarization is emulated.
- CSV hints: fine.

## su2026
- Status: distilled. 1 row: 1 mm CaTiO3-clad push-pull MZM. Grade C, no sim. New org: Chongqing University.
- Not reported: Vpi (only VpiL; about 13 V at 1 mm by arithmetic, in evidence `derived` only), electrode gap/width, BOX, rib width, slab (200 nm by arithmetic, not entered), drive amplitude, system data.
- Judgment calls: bandwidth 110 gt = instrument limit. `il_onchip_db` 0.86 (paper's "on-chip propagation loss", abstract calls it insertion loss; includes not itemised) with the two 5.45 dB gratings excluded; 11.81 dB total entered in `il_fiber_to_fiber_db`. `prop_loss_db_per_cm` 8.2 `derived` from ring Q. `vpi_convention` mzm_push_pull is derived (push-pull stated, convention not). Sidewall 64.37 deg and etch 200 nm from AFM. Efficiency units in the extracted text were garbled; confirmed as V cm on the page renders.
- CSV hints: fine.

## tobing2026
- Status: distilled. 1 row: 7 mm TFLN MZI modulator on SiN passives. Grade C, no sim. New org: National Semiconductor Translation and Innovation Centre.
- Not reported: wavelength (C/L band), electrode width/type, rib width, etch depth, modulator IL, drive.
- Judgment calls: Vpi 4.14 V is the Fig. 4(e) label; VpiL 2.9 V cm `derived`. Bandwidth 20 GHz approx (preliminary RF; normalized S21 does cross -3 dB). ER about 40 dB is from the passive unbalanced-arm MZI spectrum (Fig. 4(d)), not a modulator DC ER (noted). Waveguide loss numbers are wafer-level ring/SiN data, not entered as device `prop_loss`. `waveguide_platform` lnoi_rib (rib/slab TFLN in TEM). Fab left empty (in-house 200 mm line, not named); IME entered under existing name, A*STAR parent not added.
- CSV hints: fine.

## Post-audit corrections (2026-10-04)

Superseded statements above: huang2026 `device_class` is now mzm (Fig. 2(a) schematic), huang2026-b `bw3db_ghz` is 100 approx with `bw_measured_to_ghz` 110 (and -a has `bw_measured_to_ghz` 110); shen2026 `integration` is monolithic; starnault2026 `vpi_convention` is unspecified; tobing2026 `extinction_ratio_db`, `er_type` and `buffer_oxide_um` are empty. License footer quotes added to each evidence file as `context_values` `license_notice`. Full list in `AUDIT_DISPOSITIONS.md`.
