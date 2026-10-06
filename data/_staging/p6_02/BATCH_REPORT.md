# Batch p6_02 report (2026-10-05)

Validation: `uv run python scripts/merge_staging.py data/_staging/p6_02 --replace-paper-ids li2022b` -> papers 4, devices 8, orgs 2, evidence 4; conflicts 0; validation errors 0 (dry run only, nothing written).
Sim configs (murai2025, pan2021, xue2023, li2022b): parsed and checked with the engine's display-only `inspectConfig` (no solver run, no solveError); engine was not run.
Common: all four sources are the Optics Express / Optica versions of record retrieved 2026-10-05; licence token from the Crossref VOR record (Optica-OA-License-v1/v2), redistribution restricted_local_only, audit_status needs_audit, verified_on 2026-10-05. No network, no git. Figures were read from the page renders and embedded images.

## murai2025 - distilled
- Rows: murai2025-a (9.9 mm, 11 mm coupon: Vpi 2.7 V, VpiL 2.7 V cm, 28 GHz, IL 0.97 dB), murai2025-b (3.0 mm coupon of 4 mm: Vpi 8.9 V author estimate, >50 GHz, 50 Gb/s NRZ eye at 3.0 Vpp).
- repro_grade B; sim: sims/murai2025/config.yaml (row -a; electrostatics only, optical indices missing).
- Judgment: bw3db 28 GHz is the paper's "approximately 28 GHz" (Fig. 6(b) trace sits around -3 dB from about 12 to 35 GHz); IL 0.97 listed parts sum to 0.87 dB (0.1 dB gap, probably two MMIs; not stated); 3 mm Vpi 8.9 V is an author estimate (Table 1 footnote), equals 2.7 V x 9.9/3.0; sweep text (+-2 V, -3 V offset) contradicts the Fig. 5(a) voltage axis (0 to -3 V) so bias_for_vpi_v empty; rib width 2400 nm / etch 400 nm / slab 200 nm read from the Fig. 5(c) simulation sketch (extracted_from_figure, approx); n_rf 2.1, ng 2.2, Z0 40 ohm entered as author_estimate (method not stated); electrode_type tw_gsg stated; new orgs: Furukawa FITEL Optical Components Co., Ltd.
- Not reported: ER, optical power, temperature, ground width, cladding, Si thickness, wafer supplier, fab facility.
- CSV hint corrected: batch note about an access challenge is obsolete.

## pan2021 - distilled
- Row: pan2021-a (5 mm, 1957 nm: Vpi 7.34 V, VpiL 3.67 V cm, >22 GHz detector-limited, ER >20 dB, 6 dB on-chip / 16 dB total, 25 and 32 Gb/s OOK eyes).
- repro_grade A; sim: sims/pan2021/config.yaml (electrostatics only; no indices at 1957 nm).
- Judgment: sidewall "about 30 deg" is drawn from the vertical in Fig. 1(b) -> 60 deg to the film plane (derived entry); on-chip 6 dB entered as author_estimate (deduced from 16 dB total and 5 dB per facet), 16 dB as measured, both approx; energy 11 pJ/bit (32 Gb/s) author_estimate, 14 pJ/bit at 25 Gb/s in the evidence note, scope not stated; drive 6 V stated without pp/amplitude definition (approx); max rate 32 Gb/s eye (paper says quality lower than 25 Gb/s, 14 dB SNR); simulated bound rf_loss <9 dB/cm at 100 GHz, ng 2.276 and Z0 50 ohm (design) entered with simulated/design_target basis; electrode S21 >40 GHz (VNA limit) and predicted 100 GHz not entered; Fig. 7(a) falls off at 22 GHz because of PD de-embedding range (bw_measured_to 22).
- Not reported: optical power, temperature, fab facility, electrode metal in the text (Au from Fig. 1(b) legend only).

## xue2023 - distilled
- Rows: xue2023-a/b/c (630/520/450 nm: Vpi 0.60/0.31/0.21 V, VpiL 0.48/0.25/0.17 V cm, ER 16/7/12 dB; IL 6.8 dB at 630 nm), xue2023-d (EO bandwidth >20 GHz; wavelength of the S21 measurement not stated, so no wavelength/band).
- repro_grade B; sim: sims/xue2023/config.yaml (row -a; electrostatics only).
- Judgment: bw3db 20 gt after detector deconvolution (raw 16 GHz in notes), measured_to 20 GHz (axis end); IL scope undefined (convention s); ER at 520/450 nm is laser-polarization-limited per the paper; physical_device_id xue2023-eom shared by the four rows (paper reports one device); electrode_type tw_gsg read from the SEM (derived); electrode thickness about 0.7 um (Fig. 1(d) inset) and signal width about 19 um (Fig. 1(a) SEM, 10 um bar) are extracted_from_figure; 2-page Memorandum, Fig. 2(d) WEG dependence not entered; drive vpp, energy, optical power not reported.
- Not reported: sweep frequency of Vpi, BOX/substrate, ground widths (SEM frame), wafer supplier, fab, optical power, temperature.
- CSV hint corrected: device_class mzm (batch 'other' was a placeholder); priority/sim_candidate 'unknown' -> grade B, config written.
- New org: Meta (Reality Labs Research).

## li2022b - REPLACE, distilled (row li2022b-a kept)
- Rows: 1 (li2022b-a). repro_grade B; sim: sims/li2022b/config.yaml rewritten for the version of record (SiO2 over-cladding, VoR targets, alt_geometries.gap_5p9).
- Papers row differences (canonical -> VoR): access arxiv -> open_access; license arXiv-nonexclusive-1.0 -> Optica-OA-License-v2 (bare token; Crossref VOR license record); research_groups reworded to the VoR affiliations (arXiv had Centre for Optical and Electromagnetic Research and Zhejiang Provincial Key Laboratory for Sensing Technologies; VoR adds South China Academy of Advanced Optoelectronics and College of Optical Science and Engineering); wafer_supplier 'NanoLN, Jinan (commercial LNOI)' -> 'NanoLN, Jinan'; process_name '' -> EBL/dry etch/e-beam Au lift-off (p.2); discovered_via kept as web_search;assigned (canonical; how the paper was found); audit_status audited -> needs_audit; verified_on 2026-10-02 -> 2026-10-05; notes rewritten. Unchanged: title, authors (10, Crossref), year 2022, published_on 2022-02-27 (arXiv v1), venue, doi, arxiv_id 2202.13323, url.
- Device row differences (canonical li2022b-a -> VoR), decisive phrase in the source:
  - bw3db_ghz 30 -> 25 (qualifier gt kept) and bw_measured_to_ghz 30 -> 25: "the measured 3-dB EO bandwidth (S21) is beyond 25 GHz, limited by the bandwidth of the photodetector" (p.7); Fig. 6(e) measured trace ends near 25 GHz (arXiv: beyond 30 GHz).
  - eo_rolloff_db empty -> 1.59 at eo_rolloff_freq_ghz 25: abstract "a roll-off of -1.59 dB at 25 GHz".
  - il_fiber_to_fiber_db 18.8 (derived by reader arithmetic from the arXiv "loss of 18.8 dB") -> empty; il_onchip_db empty -> 15.9 with scope device_total: "The total loss of the modulator is 15.9 dB, including 1.6 dB from MMI and 7.3 dB from the modulated waveguide. The metal electrode absorption loss is around 7 dB" (p.6); 1.6 + 7.3 + 7 = 15.9 so gratings are not included; il_basis derived -> measured. Fibre-to-fibre not stated.
  - extinction_ratio_db empty -> 23 (er_type static): "The extinction ratio of the modulator is 23 dB" (p.6, Fig. 6(d)); not in arXiv.
  - vpi_dc_freq_ghz empty -> 0.0001: "sawtooth waves with a frequency of 100 kHz and 20 Vpp" (p.6; arXiv: triangular, frequency not stated). vpi_dc_v 3.3 and vpil_dc_vcm 1.1 unchanged (Fig. 6(c) markers still span about 2.8 V, 0.9 V cm).
  - electrode_gap_um 5.5 -> empty: VoR text p.4 "designed as 5.9 um, 13.8 um, 60 um" vs Fig. 4 caption "g = 5.5 um" (self-contradiction, convention y); arXiv gave 5.5 consistently.
  - cladding empty -> "SiO2, 315 nm" (measured): "SiO2 layers with a practically measured thickness of 315 nm" (p.6), designed 300 nm (p.4); arXiv drew no cladding.
  - ng_opt empty -> 2.514 (simulated, Fig. 4(b)/(h) label n_o; arXiv Fig. 4(b) label was 2.164).
  - rf_loss_db_per_cm empty -> 9 with lt at 120 GHz (simulated; arXiv: below 10 dB/cm).
  - tags add traveling_wave;grating_coupler;sio2_overcladding; qualifiers: bw3db_ghz:gt kept, add rf_loss_db_per_cm:lt, prop_loss and vpi approx kept.
  - Simulated numbers in notes: VpiL 0.90 V cm / Vpi 2.73 V (arXiv 0.96 V cm); Z0 about 52 ohm (arXiv about 50 ohm); n_m about 1.98 vs 2.514, i.e. not matched (arXiv: nearly matched, 2.07 vs 2.164); simulated EO response beyond 66 GHz.
  - Unchanged: wavelength 532, length 3.3, vpil 1.1, prop_loss 22 dB/cm (2.2 dB/mm), film 200/etch 100/slab 100 nm, rib width 1500 nm, sidewall 60 deg, signal width 13.8 um, electrode 1.1 um gold, BOX 2 um, silicon, x-cut, push_pull / mzm_push_pull / tw_cpw, band visible, bw3db_reference low_freq_unstated, platform/integration.
- Evidence file: all locators moved to the VoR pages; basis changes: il basis derived -> measured (il_onchip_db), cladding added as measured, ng_opt/rf_loss added as simulated; fiber-to-fiber entry dropped.
- Not reported: optical power, temperature, fab facility, Si thickness, fibre-to-fibre loss.

## Corrections applied 2026-10-05 (see AUDIT_DISPOSITIONS.md)
- Applied the p6_02 audit; li2022b REPLACE list additionally: (e) the canonical evidence entry for `band` and the `previous_value` history on `bw3db_reference`/`band` are not carried (band is derived from wavelength_nm per convention (l); previous_value is canonical migration history); (a)-(d) of audit F09 are in the row notes.

## Blockers / gaps
- None blocking. All four sources readable (text and figures). Optical indices, LN constants and metal conductivity are not in any of the papers, so every sim config is electrostatics-ready only (listed under `missing`; the LN/SiO2/Si permittivities, Pockels set and gold conductivity are `class: unknown` UNVERIFIED placeholders, none read from a source in this repo).
- paper_authors/people tables: the dry run shows 0 errors with the coordinator's current merge_staging.py; before that update it listed 26 paper_authors rows for the three new papers (to be generated by build_people.py after the merge).
- Judgment calls worth an audit: xue2023-d separate bandwidth row; electrode_type tw_gsg for xue2023 and pan2021 (layout inferred from image/probes); murai rib dimensions from a simulation sketch; pan2021 sidewall reference; li2022b il scope and the exclusion of gratings.
