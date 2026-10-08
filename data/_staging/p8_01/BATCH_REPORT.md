# Batch p8_01 report (distiller, 2026-10-07)

Dry run: see final line of the last `uv run python scripts/merge_staging.py data/_staging/p8_01` (5 papers, 8 devices, 3 orgs, 4 evidence files; 0 conflicts, 0 validation errors).
No sim configs (no paper reaches grade A/B for a 2D-reproducible dielectric TWE device), so no `sims/` files. No SPEC_PROPOSALS.md, no needs_download.md. All five sources are cached arXiv v1 copies without crossref.json: url = arXiv abs, published_on only where the arXiv stamp is printed (ghavami2023: 2023-11-28), license empty, redistribution restricted_local_only (source.json), audit_status needs_audit.
`discovered_via` = web_search;author_group_followup (the batch token `continuation_2026_10_02` is not in the validator vocabulary and was dropped).

## behzadfar2026 - distilled (4 rows, grade C, no sim)
- Simulation-only design study (CST + Lumerical). Rows -a/-b/-c = Table 1 designs #1-#3 (10 mm quartz/air/glycerol: 0.84 V/219 GHz, 0.91 V/219 GHz, 0.64 V/187 GHz), -d = Si/SiO2/air benchmark 20 mm (Vpi 0.63 V, VpiL 1.25 V cm). All row_kind design, basis simulated, DC Vpi, bw reference DC.
- Judgment calls: (1) -d bandwidth left empty: text says "almost 100 GHz" at 20 mm, Fig. 6(b) marker is about 128 GHz. (2) 357 GHz at 3.36 V (text p.7) not entered: Fig. 6(b) shows about 290 GHz at 3.36 V and the length is unstated. (3) waveguide_platform suspended_lnoi for -a/-b/-c (air bottom cladding), lnoi_rib for -d. (4) drive push_pull / mzm_push_pull from Eq. (1) "push-pull configuration" and GSG-for-push-pull text (p.2-3). (5) Fig. 6(b) and Fig. 7 plotted points not entered. (6) Figs. 3 and 4 are swapped relative to the text citations; printed numbers used. (7) 219 GHz kept for design #1 although Figs. 6 and 7 read about 207 and 210 GHz (noted).
- Grade C rationale: wavelength, SiO2/glycerol thicknesses, undercut extent not stated; slow-light grating and interdigitated T-rail are 3D models.
- Not reported: wavelength, temperature, optical power, any measurement.

## ghavami2023 - distilled (2 design rows, grade C, no sim)
- -a proposed equalizer MZM: bw3db 300 approx (abstract; Fig. 1(c) crossing near 300 GHz), length 5 mm (abstract only); the conclusion's IL < 0.1 dB is notes-only (audit F2). -b regular COMSOL reference, 70 GHz.
- Judgment calls: Vpi left empty (4.5 V intro vs 4.5 V cm abstract/conclusion); 300 GHz vs "exceeding 200" vs "over 300" resolved to 300 approx with the figure crossing, other wordings in notes; waveguide_platform lnoi_rib from the Fig. 2 inset (not stated in text). Cached PDF lacks Fig. 3 and the equalizer-gain equation; all dimensions printed as "x".

## wu2022 - distilled (1 row, grade C, no sim)
- 7 mm PLACE MZM: Vpi 3.1 V at 100 kHz (vpi_dc_freq 0.0001 GHz), VpiL 2.16 V cm (derived basis, as stated), bw3db > 50 GHz (VNA limit), fiber-to-fiber about 2.6 dB, on-chip about 0.6 dB (author_estimate, device_total, SSC-fiber coupling excluded), static ER 18 dB.
- Judgment calls: bw3db_reference low_freq_unstated; Fig. 6(c) trace touches -3 dB near 28, 35 and 50 GHz (noted, authors' claim kept); drive/convention push-pull inferred from GSG layout (derived); text figure citations mismatch drawn panels (drawn panels used); EE roll-off and RF index/Z0 not entered.
- Not reported: rib width, BOX, electrode width/thickness, SiON thickness, optical power.

## yeh2026 - no_device_rows (papers row only, grade C)
- Hysteresis/trap-emission physics on coupled-resonator TFLN devices; no Vpi, bandwidth, IL or ER. Supporting Information not in cache. Northwestern added as present address of D. R. Barton III; HyperLight not an affiliation.

## bankwitz2026 - distilled (1 row, grade C, no sim)
- Cascaded dual-MZI TFLN amplitude modulator inside a photon-statistics experiment: static ER 51 dB (gt, equals noise floor), Vpi about 3.4 V at 1550 nm (approx, stage unspecified). System results not entered.
- Judgment calls: ER qualifier gt because the value equals the measurement noise floor; fitted slopes (printed "V/rad") imply 3.6 V / 5.2 V and are in notes only; integration foundry_native (foundry unnamed, foundry_or_fab empty); platform and electrode_type left empty.

## Organizations
New (name_source and ror_id empty): Tarbiat Modares University (IR), Heidelberg University (DE), Pixel Photonics GmbH (DE). Reused existing: University of Central Florida, Harvard University, Northwestern University, Center for Nanoscale Systems, East China Normal University, University of Chinese Academy of Sciences, Shandong Normal University, Shanghai Institute of Optics and Fine Mechanics, Shanghai Research Center for Quantum Sciences, University of Münster.

## CSV hints
Batch hints were abstract-level; all confirmed as simulated (behzadfar2026, ghavami2023) or measured (wu2022). yeh2026 and bankwitz2026 have no device figure of merit beyond bankwitz's ER/Vpi.
