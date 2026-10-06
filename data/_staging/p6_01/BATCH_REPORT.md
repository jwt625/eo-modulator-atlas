# Batch p6_01 report (2026-10-05)

Validation: `uv run python scripts/merge_staging.py data/_staging/p6_01 --replace-paper-ids liu2021,yang2022,xue2026,chen2026` -> papers 4, devices 5, orgs 4, evidence 4; conflicts 0; validation errors 0 (dry run only, after the 2026-10-05 audit corrections, see AUDIT_DISPOSITIONS.md). liu2021 is a REPLACE (journal copy folded into the canonical arXiv row); yang2022, xue2026, chen2026 are NEW. Sources: version-of-record PDFs, no supplements cached; engine not run (config structure checked with inspectConfig only: no solveError for all four).

Common: audit_status needs_audit, repro_grade B for all, sim configs for all four (dielectric TWE). LN/LT constants in the configs are standard_reference values read from the Extended Data Table 1 image of references/wang2024b (LN eps 38/28, n 2.21/2.14, r33 30.9, r51 32.6; LT eps 54/43, n 2.119/2.123, r33 30.5, r51 20). Note: older configs (liu2021, chen2022) use eps 43/28 for LN, which that table does not support (38/28).

## liu2021 - distilled (folded from candidate liu2021a, coordinator decision 2026-10-05)
- Rows: liu2021-a (5 mm CL-TWE on quartz). Grade B; sim sims/liu2021/config.yaml (replaces the canonical config; constants now cited or marked unknown).
- Same work and same device as the canonical arXiv row (arXiv 2103.03684). Journal version of record is now the primary source (references/liu2021/), the arXiv cache is in references/liu2021/arxiv/. Papers row: journal identity (DOI, Crossref title and venue), arxiv_id kept, published_on 2021-02-04 (arXiv v1), discovered_via local_corpus (canonical value).
- Changes versus the canonical row: electrode_metal gold (journal Fig. 1(a),(b) labels p.2, basis design_target); geometry bases design_target (convention bb); ER 17 dB gt with journal Fig. 4(c) inset label (resolves the arXiv 15 vs 17 dB remark); license publisher-copyright, access unknown; bw_basis derived (preparer inference of the gt bound, as before); evidence locators now journal pages; slab as derived.
- Judgment unchanged: bw3db 67 gt (derived), vpil 1.7 derived, drive and vpi_convention push-pull by geometry (derived); ng_opt 2.25 is printed by the authors (Fig. 4 caption), basis author_estimate.
- Not reported: on-chip IL, Z0, RF loss, optical power, ridge width, rail thickness, temperature.

## yang2022 - distilled
- Rows: yang2022-a (5 mm). Grade B (ground width and cladding profile not stated); sim sims/yang2022/config.yaml.
- Judgment: text calls 4.74 V "VpiL"; entered Vpi 4.74 V (5 MHz, so vpi_dc with freq 0.005 GHz), VpiL 2.37 derived. bw3db 110 with gt (paper "exceeding 110 GHz"), measured to 110, eo_rolloff 2.5 dB referenced to 10 MHz (bw3db_reference other, 0.01 GHz). wavelength_nm 1549.93 is the transmission-experiment ECL line (Vpi/EO wavelength unstated). max_baud 100 GBd from Fig. 6 (baud of the 250 Gb/s point not stated). year 2021 / published_on 2021-11-24 from the printed notice (Crossref: print 2022); paper_id kept.
- BER: 3.2e-3 lies below both threshold lines of Fig. 6(b) (2.4e-2 and 3.8e-3); no tension (audit m5). Access unknown; Vpi 4.74 V confirmed by the Fig. 5(a) label.
- Not reported: drive swing, net rate, energy, temperature, waveguide propagation direction, fab facility.

## xue2026 - distilled
- Rows: xue2026-a (4 mm, static only), xue2026-b (7 mm headline). Grade B (Fig. 1 symbols H, S, T not defined in the text); sim sims/xue2026/config.yaml (7 mm row, 4 mm shares the cross-section).
- Judgment: vpil 1.25 approx (authors' joint value, derived) on both rows; IL 1.0 dB (device_total scope, MMIs plus propagation) and prop loss 0.3 dB/cm are given once for "the MZM" and entered on the 7 mm row; sidewall 60 deg left empty (reference plane not stated); ER about 30 dB static; max baud 112 (OOK, text says 112 GBaud NRZ); n_rf 2.26, Z0 46 ohm (authors say includes cables/probes), ng 2.26 simulated.
- Source tensions: text says BERs of 64G OOK and 80G PAM-4 below KP4 2.4e-4, Fig. 6(f) shows 80G PAM-4 above it from -18 to -15 dBm (and 64G OOK at -23 to -21 dBm); text -6.4 dB EE roll-off at 67 GHz vs about -4.4 dB in Fig. 4(a); "extrapolated bandwidth exceeding 120 GHz" not entered; EE 3 dB bandwidth about 35 GHz in the Fig. 4 caption.
- Not reported: optical launch power, drive swing, amplifier model, wavelength of EO/data measurements, temperature.

## chen2026 - distilled
- Rows: chen2026-a (7.5 mm TFLT MZM). Grade B (ground width, substrate thickness, cladding not stated); sim sims/chen2026/config.yaml.
- Judgment: Vpi 3.2 V at 5 kHz (vpi_dc_freq 5e-6 GHz), VpiL 2.4 derived; bw3db_ghz left empty (convention y): text claims exceeds 67 GHz, but the Fig. 4(a) trace dips below -3 dB near 57, 64 and 66-67 GHz; bw_measured_to 67 kept; FoM 6.8 GHz/V^2 vs 67/3.2^2 = 6.5 (noted); no RF loss entered (alpha0 0.74 matches the simulated curve, measured curve reaches about 9 dB/cm at 67 GHz); ring loss 0.5 dB/cm belongs to the 1 um ring waveguide, not entered; cascaded dual-ring DC-drift structures have no device rows (EO response normalized to 1.0 GHz/V, ranges recorded in notes, convention dd). Drive/convention push-pull inferred (derived). Sidewall 69 deg left empty (reference plane).
- Not reported: IL, ER, optical power, fab facility, wafer supplier, electrode-gap alignment tolerance.
- New orgs: Nanjing University (ROR from Crossref), Suzhou Polytechnic University, Suzhou Institute of Nano-Tech and Nano-Bionics (name as printed minus the Academy suffix), Nanzhi Institute of Advanced Optoelectronic Integration.

## Blockers / gaps
- None blocking. Gaps: sim bound-type targets (see SPEC_PROPOSALS.md); ror_id/name_source empty for the 4 new orgs (no network).

- Coordinator 2026-10-05 after verification: Suzhou institute restored to the printed name 'Suzhou Institute of Nano-Tech and Nano-Bionics, Chinese Academy of Sciences'; Nanjing University carries its ROR from Crossref; the liu2021 arXiv supplement is cached; liu2021 config uses LN eps 38/28 (wang2024b); printed online dates are handled by refresh_metadata.printed_online(). AUDIT_DISPOSITIONS.md is authoritative.
