# Batch p7_01 report (distiller, 2026-10-05)

Dry run: `merge counts: {'papers': 4, 'devices': 10, 'orgs': 0, 'evidence': 4}; conflicts: 0; validation errors: 0`.
No new organizations (McGill University, LIGENTEC, Lumiphase, ETH Zurich, IBM Research - Zurich, University of Bristol, Binnig and Rohrer Nanotechnology Center all exist); organizations.csv is header-only. No sim configs (no grade A/B dielectric TWE device in the batch), so no sims/ files and no sim-config constants. No SPEC_PROPOSALS.md, no needs_download.md.

## eltes2020 - distilled (4 rows, grade C, no sim)
- Version of record (Nature Materials 19(11), published online 2020-07-06) plus Supplementary Information (supplement p.N locators). License publisher-copyright (Crossref only TDM links; paper prints exclusive licence to Springer Nature), restricted_local_only.
- Rows: -a SiN-BTO racetrack (r_eff about 200 pm/V at 4 K, 5.6 dB/cm), -b Si-BTO racetrack modulator (30 GHz, 20 Gb/s, 1.7 Vpp estimated, 45 fJ/bit estimated, Q about 6000), -c SiN-BTO MZI switch (VpiL 5 V cm, 500 um), -d low-Q ring EO S21 flat to 30 GHz (waveguide type not stated).
- Judgment calls: (1) -c vpi_dc_v empty: "about 50 V" is the per-polarity amplitude (+/-50 V, SI Note 7), VpiL 5 V cm at 0.5 mm implies about 100 V swing; both readings in notes. (2) r_eff attributed to the SiN row: the paper says the SiN design was used for the pure NLO study but does not label Fig. 2b/3 points per device. (3) -b bw3db 30 GHz approx: Fig. S9 dashed line is -6 dB EOE (= 3 dB EO), photon-lifetime-limited per authors; Methods say measurement beyond 30 GHz is impossible, so possibly setup-limited (note). (4) -b il 0.3 dB is the authors' computed off-resonance loss (scope undefined, derived). (5) energy for -c (about 30 pJ per switching event) not a per-bit number, left in notes.
- Not reported: electrode length of the racetracks, Vpi of rings, wavelength for 4 K NLO measurements, electrode width/thickness, cleanroom name, wafer supplier. Strong temperature dependence of r_eff (about 365 pm/V at 300 K, above 700 near 240 K) is in -a notes only.

## eltes2023 - distilled (2 rows, grade C, no sim)
- OFC 2023 Th4A.2 (3 pages). License publisher-copyright (footer "OFC 2023 (c) Optica Publishing Group"), restricted_local_only; published_on empty (Crossref year only). PDF footer has an institution-licensed-use stamp and "Preliminary paper" disclaimer: needs a .gitignore entry (not mine to edit).
- Rows: -a transmission MZM (Vpi 3.6 V at 10 MHz, IL about 2 dB excl. grating couplers, 0.83 Vpp, 9 fJ/bit derived, OOK 128 GBd, max net 262 Gb/s), -b 1.5 mm Vpi structure of Fig. 1c (3.2 V, VpiL 4.8 V mm = 0.48 V cm derived).
- Mixed drive amplitudes in -a (0.83 Vpp driver-less vs 3 Vpp driven for 262 Gb/s) disclosed in notes. HSPS length "<2 mm" entered 2 with lt. Waveguide material, integration, electrode type, fab not stated (left empty).

## li2024 - distilled (3 rows, grade C, no sim)
- JLT 42(3) 1143-1150. License publisher-copyright (IEEE notice), restricted_local_only (PDF carries a licence-use stamp: keep local, .gitignore entry needed). published_on 2024-02-01 (Crossref issued/print); the paper prints "Date of publication 5 December 2023" -> coordinator to rule under convention (n).
- Rows: -c C-band MZM (Vpi 3.6 V at 10 MHz, 6 dB BW above 40 GHz (range 40-50 across samples), IL about 2 dB, ER above 23 dB static, 0.83 Vpp, 9 fJ/bit, 128 GBd OOK, 300 Gb/s PCS-PAM-8), -o O-band MZM (1310 nm, max 124 GBd, 250 Gb/s net; Vpi and IL only stated as "applicable to both bands", left empty), -ps 1.5 mm Vpi structure (same as eltes2023-b).
- Source defects noted: "830 Vpp" typo; abstract vs conclusion/Table I wavelength ranges for 250 Gb/s over 2 km (1291-1321 vs 1291-1331 nm).

## kohli2023 - distilled (1 row, grade C, no sim)
- JLT 41(12) 3825-3831, CC-BY-NC-ND-4.0 (Crossref vor + paper notice), restricted_local_only. Batch-hint title mismatch resolved: Crossref/paper title used. published_on 2023-06-15 (Crossref print); paper prints "Date of publication 30 March 2023" (same coordinator question).
- Row: 15 um plasmonic BTO MZM on SiN: Vpi DC 3.2 V (VpiL 0.0048 V cm derived from 0.048 V mm), RF Vpi 9.6 V (0.0144 V cm from 0.144 V mm; frequency not stated), BW beyond 70 GHz (measured to 70, referenced to the 10 GHz start), fiber-to-fiber 29 dB, phase-section 20.5 dB, 216 GBd 2PAM / 128 GBd 4PAM, 3.6 Vpp.
- Not reported: ER, net rate, energy, capacitance, Vpi arm drive, RF-Vpi frequency, temperature, electrode thickness, substrate. SiN foundry not named (Ligentec authors only), so only BRNC in foundry_or_fab.

## Schema/skill gaps
- Convention (n) vs paper-printed online-first dates (li2024, kohli2023): Crossref only has the print date; no field for the earlier printed date.
- No column for temperature-dependent r_eff (eltes2020) or per-switching-event energy; both in notes.
- bw6db_ghz given as a range across samples (li2024) has no range representation; lower bound with gt used.
- electrode_type has no entry for a single-ended GS probe-fed on-chip terminated line (li2024, eltes2023): left empty.
- Single-source row for Vpi structures that duplicate across a conference and journal paper (eltes2023-b / li2024-ps) is a deliberate duplicate; the coordinator may merge via physical_device_id if desired.
