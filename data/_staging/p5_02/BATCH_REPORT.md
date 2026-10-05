# BATCH_REPORT p5_02 (2026-10-04)

Validation: `uv run python scripts/merge_staging.py data/_staging/p5_02` (dry run) -> 5 papers, 7 devices, 5 orgs, 5 evidence files; 0 conflicts, 0 validation errors.
All papers.csv rows: `audit_status: needs_audit`, `verified_on: 2026-10-04`. No sim configs (silicon rings and silicon MZM). No SPEC_PROPOSALS, no needs_download.

## lin2026 - distilled
- Rows: lin2026-a (one ring, 90 GHz EO bandwidth, 224 Gb/s PAM4). repro_grade C, sim config none.
- Not reported: Vpi/VpiL, IL, bias and drive amplitude, loaded Q, ring length, baud, energy per bit, junction doping, heater geometry.
- Judgment calls: bw3db 90 GHz approx, basis measured (noisy black trace of Fig. 2d crosses -3 dB near 90 GHz; the red/blue curves are model, not used); reference left `unspecified`; bw_measured_to 100 GHz read from the plot axis. Static ER 36 dB approx read from the measured Fig. 2a dip (not stated in text; the simulation marker is near 34 dB). Cj 19.3 fF entered as `derived` (fitted circuit parameter). wavelength_nm empty (operating point is detuned from the 1556.3 nm dip in Fig. 2a; band c_band from that figure). Baud not stated, so max_baud empty.
- Orgs added: National Tsing Hua University, National Institutes of Applied Research, Taiwan Semiconductor Research Institute (child of NIAR). imec reused (fab: iSiPP200).
- CSV hint check: identity, platform, class correct.

## liu2026a - distilled
- Rows: liu2026a-a (MRM at 0 V), liu2026a-b (same MRM at -3 V). Grade C, no sim.
- Two rows because the bandwidth and system results differ by bias (convention d); Q, FSR and wavelength repeated on both, VpiL (0.538 V cm, `derived`, convention resonance_tuning_derived, drive `unspecified`) and 26.7 pm/V tuning on row a only.
- Ge photodetector is not a modulator: no row. Link results sit on the MRM row they were measured with. Dynamic ER differs per row (row a static 34 dB; row b 3.50 dB dynamic, 280 Gb/s eye).
- Not reported: device IL (the "IL 4/5/6 dB" are detuning levels; 13.5 dB is three grating couplers), ring radius, doping levels, energy per bit, BER.
- Foundry not named ("300 mm silicon photonic platform"): foundry_or_fab empty. Existing orgs reused (Fudan University, Zhangjiang Laboratory).

## liu2026c - distilled
- Rows: liu2026c-a (tabbed-electrode MZM), liu2026c-b (conventional TWE-MZM reference on the same chip). Grade C, no sim (silicon).
- Note: a `crossref.json` exists for this paper (the addendum said none); it gives year only, no license, no affiliations, so nothing changes (published_on empty).
- Judgment calls: Vpi 4.5 V / 5.9 V `measured` (Fig. 2b null); VpiL 0.9 / 1.18 `derived` (author Vpi x 2 mm). vpi_convention `unspecified` (authors never define it; same choice as the audited liu2026b), drive `series_push_pull` (stated for the tabbed device; inferred for the conventional one, evidence basis derived). 3 dB bandwidth of the tabbed device: >80 GHz with basis `author_estimate` (authors' curve fit; 3 dB not measured), bw_measured_to 67 GHz; the 66 GHz 1 dB bandwidth is in eo_rolloff (1 dB at 66 GHz, reference DC level read from the plot). Conventional device 3 dB value 60 GHz approx is my reading of the noisy measured trace (first -3 dB crossing; corrected from 65 GHz after audit) (not stated by the authors), basis `extracted_from_figure`. electrode_type: cl_twe for the tabbed device (authors: tab pairs act as capacitive elements), `other` for the conventional one. ER 2.21 dB (128 GBd NRZ, highest baud) with 5.08 dB at 64 GBd in the format text. Drive 1.8 Vpp approx at 128 GBd.
- Not reported: PAM6 baud, drive for PAM6, equalization, IL, electrode metal/dimensions, termination value, optical power, wavelength of the EO test (1310 nm is the laser label in the eye setup, Fig. 3a).
- Orgs reused (liu2026b set).

## patel2026 - no_device_rows
- papers.csv row only. Review/tutorial on silicon MRM modeling and trade-offs (NVIDIA); no device of its own is characterized. Table 1 and Fig. 3 reproduce other groups' rings by DOI (not entered here; they belong to their own papers). Grade empty. Org added: NVIDIA.
- source_type kept `conference` per the addendum (the paper calls itself a review).

## rakowski2026 - distilled
- Rows: rakowski2026-a (2 Vpp, 0 V to -2 V), rakowski2026-b (3 Vpp, +0.5 V to -2.5 V); one MRM, row granularity by drive swing (Table 1). Grade C, no sim.
- Judgment calls: 55 and 70 GHz entered as basis `derived`: they are read by the authors from regression trends at ER=3.5 dB (Fig. 3); the nearest measured trace is 53.4 GHz (1314.305 nm, Fig. 2c), and 70 GHz exceeds the 67 GHz S21 range. bw3db_reference `dc` (Fig. 2c titles "@ max DC gain"). IL 3 / 1.8 dB are static-response values at the detuning, read by the authors from the same regression trend as the bandwidths (il_basis derived; il_onchip_excludes: normalization is the off-resonance level, Fig. 2b). ER 3.5 dB `static` (from static response), `gt` on row b (text: greater than 3.5 dB). wavelength_nm = 0 V resonance 1314.385 nm printed in Fig. 2b (operating wavelength is detuned). tuning_nm_per_v left empty (80 pm/2 V, 125 pm/3 V stated; conversion is in the evidence `derived` list). Cj 50 fF (S11 fit) `derived`. Q about 3900 (Table 1) vs Q 3574.9 label in Fig. 2a noted. Eye-diagram system results (120 GBd NRZ/PAM4, 240 Gb/s) on row a only; PAM4 bias 0.85 V (text) vs -0.86 V (caption) noted. fsr_nm 9.2 read from the Fig. 1c label (1.6 THz stated in text).
- Not reported: Vpi/VpiL, junction doping, ring length, energy per bit, any 3 Vpp eye. Fab not stated explicitly: foundry_or_fab empty. Org added: GlobalFoundries (org_type foundry, matching p5_01).

## Cross-batch notes
- License: all five rows `publisher-copyright` from the Optica footer printed on every page (liu2026a and patel2026 also print "(c) The Author(s)"); the printed footer is also recorded as a license_notice context value in each evidence file; this follows the dominant pattern of audited OFC 2026 rows. The addendum says empty unless the paper prints one; the footer is a printed notice, flag if you prefer empty.
- New orgs may collide with other p5 batches (NVIDIA, GlobalFoundries) if they add the same names with different notes.
