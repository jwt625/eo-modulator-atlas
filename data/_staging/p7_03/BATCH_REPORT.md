# Batch p7_03 report (2026-10-05)

Validation: `uv run python scripts/merge_staging.py data/_staging/p7_03` -> merge counts papers 3, devices 19, orgs 2, evidence 3; conflicts 0; validation errors 0 (dry run only, all three papers NEW so no --replace-paper-ids). sims/wang2022/config.yaml passes `parseConfig` and `inspectConfig` (empty solveError); the engine was not run.

Coordinator rules applied: bare licence tokens (publisher-copyright for ACS and Wiley VoR with no open licence; CC-BY-4.0 for liu2026d) with redistribution derived from them; new organizations have empty ror_id and name_source (not printed in the papers, not in crossref.json); sim-config constants are standard_reference only with a repo source that was read (file and page given in the config), otherwise class unknown placeholder listed under `missing`; air is definitional.

## wang2022 - distilled
- Source: ACS Photonics version of record (8 pp.) plus Supporting Information (6 pp.), both read in full; figures read from the page renders (Figs. 1-6, Table 1, Figs. S1-S4). Identity, authors (11), venue, date (2022-07-21) from crossref.json. Licence: only ACS STM-ASF policy URLs in Crossref, so publisher-copyright, restricted_local_only; access paywalled.
- Rows: wang2022-a (12.5 mm intensity MZM), wang2022-b (7.5 mm DP-IQ chip, four MZIs). repro_grade B; sim config sims/wang2022/config.yaml for row a (hybrid Si/LN, CLTW, undercut).
- Judgment calls:
  - bw3db 70 GHz with gt is the paper's bound; the plotted measured EO S21 (Fig. 4(e)) ends near 67 GHz at about -2.3 dB, so bw_measured_to_ghz 67 (extracted_from_figure). The abstract/body claim ">70 GHz" is therefore not shown by the measured trace; the simulated 3 dB point (100 GHz) is not entered.
  - il_onchip_db 3 (derived, stated in conclusion and Table 1 and equal to 10.2 dB chip loss minus 7.2 dB for two grating couplers), scope device_total; il_fiber_to_fiber_db 10.2. The 2 dB / 25 dB measured before electrode deposition (Fig. 3(b)): ER 25 dB static entered, 2 dB in notes only.
  - vpi_dc 1.7 V at 100 kHz triangular (convention m); vpil 2.13 V cm basis derived (authors' product).
  - drive push_pull and vpi_convention mzm_push_pull rest on supplement p.3 ("push-pull configuration of the device"), basis derived; for the IQ row both stay unspecified.
  - rf_loss 4.01 dB/cm at 67 GHz derived from fitted alpha0 0.49 dB/cm/GHz^0.5; n_rf about 2.6 read from the Fig. 4(c) plateau; ng 2.5 simulated; measured Z0 ripples 48-55 ohm, no single value.
  - Row b: 96 Gbaud (abstract, p.5, conclusions) vs "90-Gbaud" (supplement p.5) -> max_baud_gbd empty (convention y); Vpi 3 V and bandwidth >70 GHz come from one sentence, so drive, convention and bw_method are unspecified.
  - max_baud_gbd 100 for row a is the 100 Gbit/s OOK line rate (derived).
  - CUMEC in the supplement ("CMOS SOI foundry (CUMEC, China)") is matched to the existing organization Chongqing United Microelectronics Center Co., Ltd by abbreviation only; flagged in the paper notes.
- Not reported: measurement wavelength, optical input power, sidewall angle, Si substrate thickness, energy per bit, a single measured Z0, geometry of the IQ chip.

### Overlap with canonical chen2022
- chen2022 (APL Photonics 7, 026103; rows chen2022-a/b/c) is monolithic rib TFLN on a Si substrate with a CLTW electrode (400 nm film, 200 nm etch, 5/7/10 mm, Vpi 4.45/3.22/2.20 V). wang2022 is a Si-wire/LN hybrid with unetched 500 nm LN, 12.5 mm and 7.5 mm, Vpi 1.7 and 3 V. Different devices, no duplicate rows; wang2022 cites chen2022 only for the undercut technique (ref 36). The author lists largely overlap (G. Chen, K. Chen, R. Gan, Z. Ruan, Z. Wang, P. Huang, C. Guo, L. Liu) but the printed affiliations are South China Normal University and Zhejiang University, not Sun Yat-sen University as the brief assumed.
- The wang2022 sim config reuses the chen2022 layout conventions (slot width, 3 um islands, pad placement) by analogy, flagged project_inference throughout.

## liu2026d - distilled
- Source: ACS Photonics version of record (12 pp.), CC-BY-4.0 (page-1 notice and Crossref). The Supporting Information is not cached (needs_download.md, not blocking). Published 2026-06-26.
- Rows: liu2026d-a..g (445, 461, 488, 520, 594, 640, 940 nm from Table 1) and liu2026d-h (875 nm pulse generation and 10 Gbit/s eye). repro_grade C, no sim config (electrode gap and widths are only in the uncached SI Section S1).
- Judgment calls:
  - Headline VpiL (Table 1) is the asymptote of a high-pass-filter fit to 10-100 kHz data (dielectric relaxation tau 0.85-6 us), so it goes in vpil_rf_vcm with basis derived and no frequency; the 488 nm row also carries the 100 kHz point (vpi_dc 7.64 V, Fig. 2(a)) and the fitted asymptote Vpi 6.71 V (Fig. 2(c)).
  - EO bandwidth >26.5 GHz (VNA limit) per Table 1 for 461-940 nm; the text names measurements at 461, 640, 940 nm only (noted on the other rows). 445 nm is N/D.
  - Loss: 940 nm fiber-to-fiber 8.6 dB and on-chip 2.6 dB (derived, 3.0 dB per facet); 488 nm about 10 dB and 640 nm about 4 dB on-chip with per-facet coupling 19 and 16 dB (no fiber-to-fiber stated).
  - optical_input_power_dbm from the Table 1 on-chip power estimates (10-113 uW), converted with derived entries and approx.
  - Row h: ER 25 dB dynamic (median over 93 min), drive 7.0 Vpp = stated amplifier maximum; 940 nm pulse-picking ER 18.8 dB sits on row g.
  - physical_device_id left empty (paper does not say one chip per design).
  - TO P_pi, TO bandwidth, relaxation tau and bias-stability numbers have no schema column; they are in the row/paper notes.
- Not reported in the main text: electrode gap/widths, static ER, drive voltage of the EO tests (up to 50 Vpp low-frequency), temperature of the headline values.
- New organizations: Max Planck Institute of Microstructure Physics, University of Toronto. Foundry Luxtelligence (existing org).

## chen2025 - distilled
- Source: Laser & Photonics Reviews version of record (9 pp.) plus Supporting Information (8 pp.), both read in full. Crossref lists only the Wiley TDM terms (no open licence; the PDF footer "OA articles are governed by..." is boilerplate) so publisher-copyright, restricted_local_only. Title hyphens normalised per refresh_metadata convention.
- Rows (9): chen2025-a (N70, 3.5 um gap, headline: 110 GHz LCA, 220 Gb/s, 24.33 pm/V, 0.2 fJ/bit), b-e (N70 at 3.7, 4.0, 4.2, 4.5 um gap: tuning efficiency and IL read from supplement Fig. S1(a)), f-i (3.5 um gap, N = 50, 60, 80, 90: tuning efficiency; Q ends 1118 and 3848 assigned to N50 and N90). Class resonator, repro_grade C, no sim config (resonator).
- Judgment calls:
  - bw3db >110 GHz = LCA limit (Fig. 3(h) traces end at 110 GHz above the -3 dB line, with peaking); the calculated >200 GHz (Eq. 5) is not entered; the gap of the Fig. 3(h) device is not stated (assigned to the headline device).
  - Resonance near 1568 nm read from Fig. 3(e),(f), i.e. L band although the design is near 1559 nm; band l_band on all rows (all peaks above 1565 nm).
  - tuning_nm_per_v entered as magnitude; polarity convention is not defined in the paper (sign not stated).
  - il_onchip_db values (about 12.3-14.6 dB, scope undefined) are figure readings of the peak transmission; the authors do not say whether grating couplers are included.
  - Energy 0.2 fJ/bit is the authors' CV^2pp/4 with 3 Vpp (amplifier output); capacitance not stated and not entered.
  - Q 2200 (p.2) entered with note "type not stated" on row a.
- Not reported: ER, Vpi, optical input power, temperature, fabrication facility (foundry_or_fab empty although two authors are at CUMEC).
- Hint check: batch hint "Chen2023 slow-light topic" is related to zhang2023 (topological cavity, already in the database); no device overlap.

## Schema / skill gaps
- No column for TO phase-shifter metrics (P_pi, bandwidth), dielectric-relaxation time constant, or "asymptotic Vpi from a low-frequency relaxation fit" (convention m has no home for it; used vpil_rf_vcm with no frequency).
- Resonator tuning efficiency polarity: convention (v) covers "direction not stated" only; chen2025 shows the direction on a reversed axis but defines no electrode polarity.
- Sim SPEC: no way to express a bond layer whose thickness reference (above/around the Si wire) is unstated; a hybrid Si-wire-under-LN cross-section is representable but scalar optics is a weak approximation (stated in limitations).

## Corrections after the independent audit (2026-10-05)
See AUDIT_DISPOSITIONS.md. Where the text above differs, this section governs: wang2022-a bw3db_ghz is 67 gt (extracted_from_figure; the paper's '>70 GHz' and the simulated 100 GHz are in notes only); wang2022-a il_basis derived; liu2026d VpiL values are in vpil_dc_vcm (vpi_dc_freq_ghz empty), row c vpi_dc_v 6.71 V, integration foundry_native; chen2025-a..e tuning efficiency is signed negative, chen2025-b..i carry a figure-read wavelength_nm; the wang2022 sim config now has the BCB layer digitized from Fig. 2(a) (the 'above or around' gap is closed) and loaded_length_um 33. Schema gap list: the 'asymptotic Vpi' and 'polarity' items are resolved by conventions (m) and the signed-value precedent.
