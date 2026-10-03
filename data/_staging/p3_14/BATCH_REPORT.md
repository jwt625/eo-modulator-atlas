# p3_14 batch report (verified_on 2026-10-02)

Papers: sabatti2024, chen2024, shamsansari2021, guo2026, sayem2026. Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 5 device rows, 7 organizations, 3 evidence files). No sim configs written (all five repro_grade C); engine not run. No cache repair needed (text.md and figures/ present for all five; source.pdf and source.json untouched). No needs_download. No evidence file for chen2024 and sayem2026 (no device rows).

## Version note (preprint vs version of record)
| Paper | Numbers come from | Other version |
|---|---|---|
| sabatti2024 | arXiv 2404.09787v1 (4 pp, compiled 2024-04-16) | Optics Letters 49(14) 3870, Crossref issued 2024-07-03: not read, may differ |
| chen2024 | arXiv 2411.17070v1 (13 pp) | none located (no DOI); Supplement 1 not cached |
| shamsansari2021 | arXiv 2111.08473v2 (4 pp, dated 2021-11-29) | Optica 9(4) 408, Crossref issued 2022-04-06, different title: not read, may differ |
| guo2026 | arXiv 2603.14346v2 (16 pp) | none located; Supplemental Notes 1-3 not cached |
| sayem2026 | arXiv 2609.21830v1 (8 pp, dated 2026-09-21) | none located; supplementary info not cached |

All five: license and published_on empty, redistribution restricted_local_only, arxiv_id versioned, source_type arxiv_preprint, discovered_via verbatim from the batch CSV. The Crossref OA licenses of sabatti2024 and shamsansari2021 belong to the versions of record and are not recorded.

## sabatti2024
- Status: distilled. Rows: 1 paper, 2 devices (FH 1536 nm and SH 768 nm outputs of the same 7.3 mm push-pull MZM + 7 mm PPLN chip), 1 evidence block. repro_grade C, sim config none.
- Not reported: MZM insertion loss, optical input power, Z0, RF loss, crystal cut, propagation direction, cladding, ground-electrode width, sidewall angle (no MZM cross-section shown).
- Judgment calls: Vpi 2.5 V (unterminated, low frequency) for both rows; ER 23 dB FH and 46 dB SH static (Fig. 3(b)); FH bandwidth 60 GHz = measurement range, bound (gt); SH bandwidth 40 GHz entered as a bound (gt) because the authors say the VNA noise floor limits it (the conclusion says photodiode range instead; Fig. 3(c) SH trace dips to about -3/-4 dB near 36-40 GHz). n_RF 2.17 and ng 2.19 are FEM design values (simulated). Film nominal 300 nm (measured 304-312 nm). Etch depth 235 nm is stated with the PPLN waveguide design and assumed to be the single etch of the optical layer (flagged in evidence note).
- CSV hints: 40 GHz and 46 dB verified. CSV author list truncated (8 authors on the PDF, match Crossref). DOI matches Crossref; title identical.

## chen2024
- Status: no_device_rows. Rows: 1 paper, 0 devices. repro_grade C, sim config none.
- Why: SSB-generation scheme (mono-drive MZM with optical delay lines; FC-SSB and CS-SSB); reports no Vpi, EO bandwidth, IL, ER or data rate. Sideband suppression, sideband-to-carrier suppression and the 3 dB SSB working bandwidth (6.75 GHz at 27 GHz; 5.75 GHz at 23 GHz; ratio of suppression, not EO bandwidth) have no columns; all recorded in the papers.csv notes with locators.
- Inconsistency: the abstract/conclusion give 22.5 dB sideband suppression and 16.9 dB sideband-to-carrier for the 50 GHz CS-SSB, while the p.10 body text gives them the other way round; Fig. 4(f) arrows look consistent with the abstract (read at page-render resolution).
- Not read: Supplement 1 (delay-line design and theory). Geometry in notes (500 nm film, 250 nm rib and slab, 500 nm Cu / 50 nm Au, 1.2 um waveguide quoted only as a loss-mitigation example).
- CSV hints (22.1 dB FC-SSB at 50 GHz, 22.5 dB CS-SSB) verified from the abstract. CSV author list truncated (8 authors). No DOI in the CSV or cache.

## shamsansari2021
- Status: distilled. Rows: 1 paper, 1 device (5 mm segmented traveling-wave MZM on the laser-integrated chip), 1 evidence block. repro_grade C, sim config none.
- Not reported: laser/operating wavelength, per-device IL, ER, optical input power at the modulator, electrode widths and metal, segment geometry (refers to Kharel et al.), RF Z0/n_RF/loss, drive amplitude, drive arrangement.
- Judgment calls: Vpi 4.3 V is the Fig. 4(c) fit, convention unspecified (drive left empty); bandwidth about 50 GHz is the Fig. 4(d) caption claim, entered approx with VNA limit 50 GHz as measured-to (photodiode limits beyond 45 GHz); etch depth 300 nm derived (600 - 300 slab); gap about 4 um approximate. Laser metrics (60 +- 7 mW on-chip passive, about 25 mW after the MZI, 5 dB laser-to-TFLN loss, 4.8 +- 0.5 dB out-coupling loss, linewidth below 1 MHz) are in notes only.
- CSV hints: 60 mW and 50 GHz verified. Title mismatch: PDF "Electrically pumped high power laser transmitter ..." vs CSV hyphenated "high-power" vs Crossref "Electrically pumped laser transmitter ...". CSV year 2021 is the preprint year; Crossref issued 2022-04-06 (journal_ref year hint was wrong).

## guo2026
- Status: distilled. Rows: 1 paper, 2 devices (3 mm push-pull CLTW MZM at 532 nm; 3 mm dual-drive MZM for OSSB and EO comb), 1 evidence block. repro_grade C, sim config none.
- Why C: substrate and propagation direction not stated; CLTW letters (g, r, c, s, t, h) = (3.5, 45, 5, 2, 2, 3.5) um are not defined in the text and the Fig. 2(a) sketch leaves g vs h ambiguous, so the loaded cross-section cannot be built without guessing; the simulation inputs would be project inference throughout.
- Not reported: substrate, wafer supplier, foundry, optical power during the Vpi/bandwidth measurement, drive amplitude of the UWOC runs, energy per bit; dual-drive row has no Vpi/BW/IL.
- Judgment calls: Vpi 2.6 V and Vpi*L 0.78 V cm (simulated 0.77) with approx. Bandwidth about 50 GHz entered gt (intro: exceeds 50 GHz); the Fig. 5(d) trace spans about 3-57 GHz (end read from plot), ripples about 5 dB and touches -3 dB near 33, 36, 48, 56 GHz; photodiode-limited per authors. ER >35 dB static (text and Fig. 5(c) label; caption says ~32 dB: inconsistent). IL: 12 dB fiber-to-fiber, 2.7 dB on-chip is the authors subtraction (12 - 2 x 4.5 = 3.0, so the implied coupler loss is about 4.65 dB). Propagation loss about 1.7 read from Fig. 4(b) at 1.5 um width (axis labeled dB). Optical handling about 11.5 dBm on-chip (1 h stable, 18 dBm in / >5 dBm out); TFLN comparison fluctuates above 10 dBm input. RF loss about 5.5 dB/cm at 100 GHz, n_RF about 2.48, Z0 about 49 ohm, ng about 2.45 are simulated CLTW values (text/Fig. 3). max_baud 100 GBd derived from 100 Gb/s OOK; PAM-4 is 56 GBd, 112 Gb/s over 3 m; 64 Gb/s OOK over 9 m.
- CSV hints (flat to about 50 GHz, 112 Gb/s over 3 m, 64 Gb/s over 9 m) verified. Author list truncated in CSV (12 authors). Platform lithium_tantalate and class mzm fine.

## sayem2026
- Status: no_device_rows. Rows: 1 paper, 0 devices. repro_grade C, sim config none.
- Why: RF electrode test structures (conventional CPW and capacitively loaded slow-wave electrodes, 1 um Au, 10 mm) on thermal SiO2 on high-resistivity Si; no waveguide, no EO material, no Vpi/bandwidth; `eo_material` is required and the loss unit is dB/cm/sqrt(GHz). Results (measured, not simulated; Fig. 1 is a calculated bandwidth map for motivation): lowest alpha about 0.23 dB/cm/sqrt(GHz) (Fig. 5, s = 7 um, h = 12 um, t = 3 um), range about 0.23-0.46 across Fig. 5; BOX 4, 10, 15 um; n_eff trends in Figs. 4 and 6. All in papers.csv notes.
- CSV hints: the 0.23 value verified; the CSV calls it a simulation/measurement study, the paper states measured only. First author is "Ayed Al Sayem" on the PDF (CSV "Ayed Sayem"); CSV author list truncated and omits Rose Kopf (6 authors). Not read: supplementary information (loss extraction).
- Distinct from sayem2026a/sayem2026b in p3_04 (different arXiv ids).

## Organizations
New: The Hong Kong University of Science and Technology (parent of the facility; HKUST expanded, not an author affiliation), Nanosystem Fabrication Facility (chen2024 acknowledgements), Freedom Photonics. Identical copies of sibling-staged rows (merge-safe): City University of Hong Kong (p3_01/p3_11/p3_12), Harvard University and Center for Nanoscale Systems (p3_11), Nokia Bell Labs (p3_04). Existing in data/: ETH Zurich, Binnig and Rohrer Nanotechnology Center, HyperLight, South China Normal University, Zhejiang University. IBM Rueschlikon, FIRST cleanroom and ScopeM named in sabatti2024 acknowledgements are not added.

## Blockers
None. Follow-ups: versions of record of sabatti2024 and shamsansari2021 not read; supplements of chen2024, guo2026, sayem2026 not cached. Further schema gaps are in SPEC_PROPOSALS.md.

## Audit corrections (2026-10-03)
Q1 audit (claude-ingest-2026-10-03) findings are resolved in `AUDIT_DISPOSITIONS.md` (8 applied, 5 applied-adjusted, 1 deferred, 2 confirmation-only). This section supersedes the earlier judgment-call text where they differ.
- sabatti2024-sh: `bw_measured_to_ghz` 40 (the SH trace ends at 40 GHz); `bw3db_ghz` 40 is the authors' claim without `gt`, with the Fig. 3(c) dips (about -3.9 dB near 35-36 GHz) stated in the notes; both rows now `bw3db_reference` other, 0.02 GHz (derived); `foundry_or_fab` lists BRNC and FIRST (organization row for FIRST added, identical to the p3_09 copy).
- shamsansari2021: title now the Crossref title (year stays 2021); `bw_measured_to_ghz` 45 (photodiode limit), trace below -3 dB beyond about 43 GHz stated.
- guo2026-a: `optical_power_handling_dbm` basis `author_estimate`, `vpil_dc_vcm` basis `derived`, `electrode_gap_um` dropped (letter g undefined), `il_onchip_includes` states the paper gives no scope.
- chen2024: wording fixes and two extra recorded values (notes only). sayem2026: no change.
- Dry-run merge of p3_14 with p3_15: 0 conflicts, 0 validation errors.
- For the coordinator: Nokia Bell Labs organization note ("Murray Hill, NJ" is not in the paper; identical row in p3_04) and the missing `parent_org` link to Nokia Corporation; dedupe of the sibling-identical organization copies; year policy for preprint-sourced rows whose version of record is later.
