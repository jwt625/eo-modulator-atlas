# p5_09 batch report (verified_on 2026-10-04)

Papers: kotz2026, cai2026, li2026b, taghavi2026a, zhang2026a, qiu2026a (OFC 2026). Dry-run merge: 0 conflicts, 0 validation errors (6 papers, 7 device rows, 5 organizations, 6 evidence files; taghavi2026a has no device row after audit). All papers rows `audit_status: needs_audit`, `repro_grade` C (empty for taghavi2026a, no device row), no sim configs (SOH, Ge EAM, ring, slot hybrid, BTO package with no geometry). No `crossref.json` for any paper: identity from PDF page 1 and the batch row. License `publisher-copyright` from the page footer (c) 2026 Optica Publishing Group (quoted as `context_values.license_notice` in each evidence file), `restricted_local_only`, `published_on` empty. No cache repair.

## kotz2026
- Status: distilled. 1 row (1 mm SOH IQ modulator, SOXD123): Vpi 0.79 V (0.78 and 0.79 V for the two nested MZMs), drive below 1.1 Vpp (lt), fiber-to-fiber 17.7 dB, 200 GBd 16QAM and 144 GBd 64QAM over 85 km, AIR 712 / 743 Gbit/s (text only).
- Not reported: Vpi frequency, bandwidth, on-chip IL, net/line rate, foundry, rail width, electrode gap.
- Judgment calls: `drive` push_pull and `vpi_convention` mzm_push_pull (derived: single GSG feed with slot phase shifters in both gaps, Fig. 1(a); same-group convention; authors do not state it). Larger of the two Vpi values entered. "optical fiber-to-fiber transmission (17.7 dB)" read as loss (coupler type GC or EC not stated). Slab 90 nm and stack labels (220 nm, 160 nm) read from Fig. 1(b), approx via extracted_from_figure.

## cai2026
- Status: distilled. 2 rows: device 1 (40 um Ge: IL 1.5 dB at 1600 nm, bw3db above 110 GHz measured to 110, 1 dB drop at 110 GHz at 4 V, static ER 3 dB, 150 GBd PAM-4 / 300 Gbit/s eye, TDECQ 4.46 dB) and device 2 (100 um Ge, static only: IL below 6.3 dB, ER 7.5 dB).
- Not reported: driver, BER, Ge width/thickness, fab, DC bandwidth reference, bias for the IL value.
- Judgment calls: extrapolated 180 GHz is an RC fit (Fig. 3(b)), not entered; `bw3db_ghz` 110 `gt` with bw_measured_to 110 (authors state exceeds 110 GHz for 1 to 4 V; 1 V trace has a single-point spike to about -3.2 dB near 104 GHz, noted). `bw3db_reference` dc is derived. IL definition (couplers) not stated, recorded as such. Band l_band from the 1590-1610 nm window.

## li2026b
- Status: distilled. 1 row (imec ISIPP50G GeSi EAM, 1563 nm): IL 3.5 dB at 0 V (excl. grating couplers 4.5 dB each, self-heating 4 dB), static ER 3.1 dB at -2 V, bw3db above 67 GHz, 1.4 Vpp, 160 GBd PAM4 net 300 Gb/s, BER 4.22e-3 B2B and 4.36e-3 at 100 m.
- Not reported: EAM length and geometry, line rate, on-chip optical power.
- Judgment calls: Fig. 1(b) EAM trace has a notch to about -3.1 dB near 46.7 GHz (about 2.5 GHz wide) and ends near -2 dB at 67 GHz; kept the authors' bound (gt 67, schema convention (c), as in bhasker2026), flagged in notes. Static-ER bias -2 V (text) vs -1.4 V (link and EO response) both recorded. RoP 5 dBm (text) vs 4.8 dBm (Fig. 3(c) inset). PDF has 4 pages (poster as page 4); author list from page 1.

## taghavi2026a
- Status: no device row (audit F1). Same 40 um radius FN-LC semi-ridge microring and values as canonical taghavi2026-a (150 pm/V, VpiL about 0.33 V cm, f-6dB about 7.8 GHz measured to 11 GHz, 2.83 Vpp, slab about 90 nm), so the staged row was removed; the evidence file keeps only the license notice.
- Adds to the canonical record (papers.csv notes only): VDC about 0.5 V, Eext about 1.2 V/um. Table 1 "about 0.3 (0.03 at DC)" conflicts with text 0.33 V cm at DC.
- `repro_grade` empty (no device row).

## zhang2026a
- Status: distilled. 2 rows: 0.5 mm Si-FenGlass slot MZM (Vpi 6.7 V at 1 MHz, stored in `vpi_dc_v`, 2.4 Vpp, GSGSG push-pull, 224 GBd PAM4 net 358 Gb/s, 200 GBd PAM6 net 414 Gb/s, 168 GBd PAM8 net 403 Gb/s) and 1 mm device (Vpi about 3.2 V at 1 MHz from Fig. 2(b), stored in `vpi_dc_v`).
- Not reported: EO bandwidth, IL, slot dimensions, foundry, line rate.
- Judgment calls: 1 MHz Vpi entered as quasi-static `vpi_dc_v` (database practice for sweeps at or below 1 MHz; yu2024 precedent), frequency in notes; the build step then derives VpiL from `vpi_dc_v` and length (about 3.35 V mm for the 0.5 mm row, 3.2 V mm for the 1 mm row). Paper VpiL 3.4 V mm is not assigned to a device (device not stated; Fig. 2(a) slope about 3.8 V per pi matches neither); left in notes. 1 mm row Vpi is a figure reading (approx). Fig. 1(b) is a combined Tx/probe/PD spectrum, not entered as bandwidth.

## qiu2026a
- Status: distilled. 1 row (packaged 3 mm BTO DP-IQM with 23 dB differential drivers): bw6db about 25 GHz (package incl. drivers), fiber-to-fiber 14.5 dB per polarization, 125 GBd DP-32QAM and 105 GBd DP-64QAM net 1 Tb/s over 80 km ZR-modeled and 2 km coherent-lite.
- Not reported: device Vpi, bare-die bandwidth, wavelength, phase-shifter length, electrode geometry.
- Judgment calls: package Vpi 0.4 V at 1 GHz includes the driver, so not entered in a Vpi column (notes only). `length_mm` left empty: the 3 mm describes the DP-IQM die. `max_net_rate_gbps` 1000 approx from the stated "net 1 Tbps". Different paper from qiu2026.

## Conventions followed
No values from the authors' earlier work entered; no simulated, fitted or extrapolated bandwidths in `bw3db_ghz`; system totals only on the device measured. Organizations reuse existing names (Karlsruhe Institute of Technology, McGill University, Fudan University, Zhangjiang Laboratory, Technical University of Denmark, Zhejiang University, imec, Lumiphase AG, SilOriX GmbH, Polaris Electro-Optics, Inc., Dream Photonics Inc., University of British Columbia). New: KTH Royal Institute of Technology, University of Copenhagen, Keysight Technologies Deutschland GmbH (parent_org Keysight Technologies, staged in p5_04; merge p5_04 first or add the parent). Riga Technical University and RISE Research Institutes of Sweden are also staged in p5_07 (hess2026); rows copied identically so either merge order passes.
