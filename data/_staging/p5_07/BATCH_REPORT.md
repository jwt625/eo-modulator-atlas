# p5_07 batch report (verified_on 2026-10-04)

Papers: hulyal2026, valdez2026, xu2026a, xu2026b, hess2026 (OFC 2026, 3 pages each). Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 6 device rows, 3 new organizations, 5 evidence files). All papers `audit_status: needs_audit`, `repro_grade` C, no sim configs. `crossref.json` exists for valdez2026, xu2026a, xu2026b (year only, no license, no affiliations, authors match); hulyal2026 and hess2026 have none (identity from PDF page 1 and batch row). License `publisher-copyright` from the printed Optica footer (quoted in each evidence file as `context_values` license_notice), `restricted_local_only`, `published_on` empty.

## hulyal2026
- Status: distilled. 1 row: 7.6 mm MZM of the 8-channel AWG-modulator-AWG LTOI transmitter. Grade C, no sim.
- Not reported: modulator geometry, wavelength of Vpi, EO S21/bandwidth, modulator loss, fab, drive amplitude.
- Judgment calls: Vpi 4.71 V (Fig. 1(c) label, DC); `drive`/`vpi_convention` unspecified (derived entries). Eight-channel aggregate 1.6943 Tb/s and AWG-pair losses not entered on the row (notes only). `max_net_rate_gbps` 223 approx is the best single channel (f4, 80 GBd PAM8, Fig. 2(g)); line rates are not stated (240 Gb/s PAM8 arithmetic in evidence `derived`). `band` c_band derived from carrier frequencies. `electrode_type` tw_cpw derived (CPW stated, traveling-wave not).
- CSV hints: fine.

## valdez2026
- Status: distilled. 2 rows: -a ring-assisted push-pull MZM (RAMZM, headline), -b conventional MZM of the same cross-section (comparison). Grade C (SiN2 width, oxide thicknesses, ground width missing), no sim.
- Judgment calls: RAMZM Vpi 6.7 V (Fig. 2(b), Sec. 2; intro says 6.8 V); VpiL 1.36 V cm (abstract) `derived`, Sec. 2 says 1.4, and 6.7 V x 0.2 cm is 1.34. MZM Vpi 20.9 V and VpiL 4.2 are `derived` (cosine-squared fit). `bw3db_ghz` 50 gt for the RAMZM (paper's bound; fit about -1.8 dB at 50 GHz; one isolated point near -3.2 dB at 46 GHz, noted). MZM-b `bw3db_ghz` left empty: Fig. 2(c) data reach -3 dB near 25 GHz although the text claims over 50 GHz for both (contradiction recorded in row notes, no value entered). `il_onchip_includes` is the device loss as stated (not itemised); `il_onchip_excludes` notes that the Fig. 2(a) fiber-to-fiber peak (about -3.5 dB) suggests edge coupling is excluded (derived). `device_class` mzm with ring_assisted_mzm tag (feng2022 precedent). Push-pull stated for the RAMZM structure; row -b inherits it (derived). 50 ohm and RF/optical index matching are design statements, not entered.
- CSV hints: fine.

## xu2026a
- Status: distilled. 1 row: 15 mm O-band CL-TWE TFLT MZM with local Si removal. Grade C (signal/ground width, undercut, via geometry, sidewall not given), no sim.
- Judgment calls: `vpi_dc_v` 1.089 V is the authors' average over 10 Hz-10 kHz (`derived`; 1.045 V at 10 Hz in notes); VpiL 1.63 `derived`. Bandwidth `gt` 110 with measured-to 110, reference 2 GHz (stated); the paper states beyond 110 GHz (convention (c)); the Fig. 4(b) trace touches -3 dB near 101-104 GHz and ends near -2.7 dB (noted). ER 35 gt (caption). Gap 4 um and rib width 2 um are stated as design (`design_target` basis). Slab 200 nm by arithmetic in evidence `derived` only. Simulated VpiL 1.6 V cm and 0.01 dB/cm not entered. Drive/convention push-pull derived (GSG with a waveguide in each gap, Fig. 1(c)).
- Title typo "Litihum" kept as printed.

## xu2026b
- Status: distilled. 1 row: 18 mm C-band CL-TWE TFLT MZM, 226 GBd PS-PAM16 demo. Grade C, no sim.
- Judgment calls: Vpi 1.35 V average over 1 Hz-10 kHz `derived`; VpiL not stated (empty). Bandwidth `gt` 110 / measured-to 110, reference not stated (`unspecified`); the paper states exceeds 110 GHz (convention (c)); the Fig. 3(c) trace touches -3 dB near 103-104 GHz, ends near -2.5 dB. `il_onchip_db` 2.4 with excludes "fiber-to-chip coupling" (inferred, derived entry); fiber-to-fiber about 12 dB. `max_net_rate_gbps` 536.6 `derived` (paper formula; abstract 536); line rate 768 as stated. ER about 42 dB approx static. Launch power 23 dBm is the EDFA output. 25 um Si undercut depth in notes (no column).
- Not reported: gap, widths, film and BOX thickness, rib width, fab.

## hess2026
- Status: distilled. 1 row: silicon-plasmonic organic ring modulator (6 um slot). Grade C, no sim (plasmonic ring).
- Judgment calls: `eo_material` eo_polymer inferred from the acknowledgement (Perkinamine chromophore from Lightwave Logic) and "plasmonic-organic section" in Sec. 3; abstract does not name it. `wavelength_nm` 1317 is the Setup B laser that gives the 445 Gb/s result; Setup A used 1305.2 nm; IL/ER/EO-response wavelength not stated. `il_onchip_db` 2.6 (operating wavelength); the abstract 2.2 dB is 7.8 dB minimum total loss at 1303.3 nm minus 2 x 2.8 dB couplers (notes). `optical_input_power_dbm` 11 (TLS power). Tag `temperature_tolerant` replaces `athermal`. `bw3db_ghz` 100 gt (E/O trace stays at or above about 0 dB to 100 GHz; authors say exceeds 100 GHz), reference unspecified. FSR 2.7 nm approx from Fig. 1(d) dip spacing. `max_net_rate_gbps` 445 `derived` (NGMI-threshold code rate times line rate). `foundry_or_fab` Polariton Technologies AG plus Binnig and Rohrer Nanotechnology Center (cleanroom team thanked). `waveguide_platform` plasmonic_mim, `electrode_type` plasmonic_lumped. Heater bandwidth 25 kHz and resonance drift per K not entered (no column).
- Not reported: Vpi/VpiL, Q, tuning efficiency, energy per bit, drive amplitude, integration type.
- New orgs: Polariton Technologies AG, Riga Technical University, RISE Research Institutes of Sweden.
