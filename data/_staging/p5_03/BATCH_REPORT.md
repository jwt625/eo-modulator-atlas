# p5_03 batch report (verified_on 2026-10-04)

Papers: sobu2026, weckenmann2026, yang2026, yin2026, aimone2026. All OFC 2026 3-page papers (PDF, text, page renders cached; no crossref.json, identity from PDF first page and batch CSV). Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 7 device rows, 0 new organizations, 4 evidence files). All papers rows `audit_status: needs_audit`. No sim configs (silicon, resonator and hybrid-assembly papers; aimone2026 is TFLN but grade C). No cache repair.

## sobu2026
- Status: no_device_rows. Papers row only, repro_grade empty. Circuit paper (4-way time-interleaved optical DAC); only a post-layout Spectre simulation (100 Gb/s NRZ, 3.45 pJ/bit) with the modulator as a PIN-RC equivalent circuit (Fig. 2(b)); no fabricated or measured modulator. Table 1 lists prior optical-DAC transmitters (refs. 3-7, including the authors' own), not entered. No evidence file (no cells).

## weckenmann2026
- Status: distilled. 1 device (-a, ring-assisted I/Q MZM, two-chip super-channel), grade C, no sim.
- Not reported: platform, fab, wavelength, Vpi, IL, energy per bit.
- Judgment calls: Q 5300, resonance depth 10.7 dB and 54 GHz 6 dB EO bandwidth are quoted from the authors' earlier work (ref. 11); after audit they are not cells and stay in notes with the citation (ref. 11 is a candidate for its own row). max_baud 110 GBd is per subcarrier per modulator (220 GBd two-chip total in modulation_format/notes); the 612.9 Gb/s two-chip net rate (16-QAM, 190 GBd total) is in modulation_format/notes, not a cell. drive_vpp 2 V per MRM (about 4 Vpp amplifier output), approx. device_class iq_mzm following geravand2025-b. Wavelength empty (Fig. 2(c) spectra near 1307 nm only).
- CSV hints: fine.

## yang2026
- Status: distilled. 1 device (slow-light PhC Si MZM, 2 x 500 um), grade C, no sim.
- Not reported: electrode metal/gap/impedance, Vpi (only Vpi*L), bias for Vpi, fab name, energy per bit, BER.
- Judgment calls: all headline numbers are wafer medians (94.7 GHz, 2.4 dB); Vpi*L 0.66 V cm `derived` (authors say it follows from the static spectra; bias and convention not stated, Vpi empty). drive `differential` (authors: differential GSSG, series junctions give push-pull). bw3db is a crossing (die values about 90-100 GHz); measured-to 110 GHz read from the Fig. 2(d) axis end. ng 16.3 entered as `simulated` (Fig. 1(a) labelled simulated; 1(c) not explicitly). Line rate 400 Gb/s from text; Fig. 3(f) label reads 405 (noted). Eyes only, no BER.
- CSV hints: title matches the PDF; the numbers 94.7 GHz and 2.4 dB match the abstract (batch CSV note about a different title in another local list is not reflected in the PDF).

## yin2026
- Status: distilled. 4 rows by convention (d): -a with inductor (headline, -9 dB IL, 256 Gb/s PAM4), -b no inductor -9 dB IL (40 GHz, 100 Gb/s NRZ eye), -c no inductor -6 dB IL (62 GHz), -d no inductor -3 dB IL (over 67 GHz). Grade C, no sim.
- Not reported: wavelength, circumference, doping levels, Vpi, baud of the PAM4 points, energy per bit.
- Judgment calls: bw3db -a and -d are bounds (67 GHz VNA limit, no crossing); -a text gives "over 27 GHz" improvement. IL entered as detuning point relative to off-resonance maximum with exclusions stated. etch 130 nm and slab 90 nm are printed labels in Fig. 1(b) (extracted_from_figure). FSR 17.1 nm and Q 2000 on -a only (inductor status of the Fig. 1(e) ring not stated). max_baud left empty (256 Gb/s PAM4 baud not stated; would be arithmetic). ER from NRZ eyes (dynamic). Eye power/drive on -b applied by inference from the setup paragraph (noted in evidence).
- CSV hints: fine.

## aimone2026
- Status: distilled. 1 device (TFLN TWE-MZM with codesigned SiGe differential driver), grade C, no sim (electrode gap, widths, metal, rib geometry absent).
- Not reported: electrode geometry, IL, measured Z0 (50 ohm is a design statement), drive amplitude (2.8 V swing is simulated).
- Judgment calls: Vpi 3.26 V measured (stand-alone GSG implied, convention mzm_push_pull, derived basis). After audit the authors' Vpi*L 1.1 V cm is not entered (not reproducible from 3.26 V and 7.5 mm: 2.45 V cm) and stays in notes; views derive 2.45 V cm. bw3db 67 GHz `gt` at the equipment limit for the stand-alone modulator; assembly 60 GHz in notes. max_baud 180 GBd (PAM-4, NGMI above threshold); net 347 Gb/s and energy 1.4 pJ/bit (1400 fJ/bit, equals driver IC power on gross rate) `derived`; gross line rate 420 Gb/s is arithmetic, kept in the evidence derived list only. Affiliations Stuttgart (DE) and New Providence (US) under existing Nokia Bell Labs; countries DE;US.
- CSV hints: fine.

## Cross-batch notes
- license `publisher-copyright` for all five, from the on-page OFC 2026 Optica footer (yang2026 abstract and aimone2026 abstract also print a "(c) The Author(s)" line); published_on empty for all (batch dates are schedule dates).
- No new organizations; all names reused exactly from data/organizations.csv.
