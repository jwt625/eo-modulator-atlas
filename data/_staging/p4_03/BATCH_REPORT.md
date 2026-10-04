# p4_03 batch report (verified_on 2026-10-04)

Papers: rahman2025, powell2024, zheng2026, cai2025, sayem2026c. Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 16 device rows, 1 new organization, 5 evidence files). All papers.csv rows `audit_status: needs_audit`. Two sim configs written (cai2025, sayem2026c); the engine was not run (inspectConfig preview only parses them; solveError is the expected missing RF permittivity).

No `crossref.json` for rahman2025, zheng2026, sayem2026c: identity taken from the paper and source.json; no DOI; license and published_on empty; redistribution restricted_local_only. powell2024 and cai2025 have crossref.json (conference record SM2D.2 without license; Nature Communications 17(1) 3314, CC-BY-4.0 for the journal version). All five caches are arXiv versions (rahman2025 v2, powell2024 v1, zheng2026 v2, cai2025 v2, sayem2026c v1); journal/conference versions were not read.

## rahman2025
- Status: distilled. 3 device rows (Designs 1-3), repro_grade C, sim config none (signal/ground widths and T-rail dimensions not given).
- Not reported: lengths of Designs 1 and 2, Vpi of Designs 1 and 2, Z0, n_rf, RF loss, ER of Designs 1 and 2, journal DOI.
- Judgment calls: IL entered as supplement S2 means (2.95/6.43/3.77 dB) where main text p.3 gives 3.1/6.6/4.0; Design 3 length 6 mm is the S4 fit assumption (basis author_estimate); bandwidth bounds 100 (Design 2) and 111 GHz (Design 3) with measured-to; Design 1 about 20 GHz from text; reference `other` (3 GHz normalisation for Designs 1-2; 1-3 GHz mean for Design 3, frequency left empty).
- CSV hints: JLT item with a different title not merged (as in the batch note); sim_candidate yes not followed.

## powell2024
- Status: distilled. 1 device row, repro_grade C, sim config none (electrode gap and widths not stated).
- Not reported: electrode gap/widths, RF Vpi, Z0, n_rf. Drive is derived (push_pull; GSG with one waveguide in each gap, Fig. 1(b)).
- Judgment calls: source_type arxiv_preprint (qi2024 pattern) instead of conference; the cached text is the AIP-format manuscript of the APL Photonics 10(9) 2025 article while the DOI shown is the related CLEO 2024 abstract (DOI/venue/year/license update deferred to a Crossref prefetch); 3 dB EO roll-off about 5 GHz entered as bw3db, detector-limited 20 GHz as 6 dB bound plus measured-to; IL 5.3 dB basis author_estimate, excludes grating couplers; VpiL 0.65 derived.
- CSV hints: sim_candidate yes not followed (grade C).

## zheng2026
- Status: distilled. 6 device rows (pre-metallisation IL/ER statistic; Vpi at 4/5/6 um gap; EOE chips with 500 nm and 1 um Al), repro_grade C, sim config none (no film, SiN or electrode widths).
- Not reported: TFLN thickness, wavelength of Vpi and EOE measurements, gap of the EOE chips, Vpi per metal thickness, Z0, n_rf.
- Judgment calls: 5 and 6 um gap Vpi are Fig. 4(f) box-plot medians (approximate); 500 nm Al bandwidth entered as bound 30 GHz (lt) because the text gives 20-30 GHz; 1 um Al bandwidth 70 GHz gt (author_estimate: authors' envelope reading, Fig. 4(h) ripple dips reach -3.2 to -3.7 dB near 42 GHz) with measured-to 67 approx (last data point of Fig. 4(h)); IL below 2 dB is the pre-metallisation wafer mean.
- CSV hints: sim_candidate unknown resolved to no.

## cai2025
- Status: distilled. 2 device rows (6.8 mm MZM with PAM4 data; 13.5 mm IQ modulator with QPSK/16QAM data), repro_grade B, sim config `sims/cai2025/config.yaml` (not runnable: no RF permittivities).
- Not reported: IL of the device, ER, Z0, interlayer oxide thickness, cladding, ground width, IQ-device Vpi and bandwidth.
- Judgment calls: numbers from arXiv v2, row is the merged journal/arXiv identity (journal year 2026, published_on empty); bw3db 100 GHz approx with measured-to 110 and reference 25 MHz; RF loss 6.3 dB/cm read at the end of the Fig. S5(a) trace; n_rf and ng are simulated; simulated VpiL about 5.5 V cm kept out of the CSV (config target only).

## sayem2026c
- Status: distilled. 4 device rows (one 7 mm MZM at 1071, 984, 1311, 1551 nm), repro_grade B, sim config `sims/sayem2026c/config.yaml` (not runnable).
- Not reported: crystal cut (empty), IL, ground width, cladding thickness, sidewall angle. Drive is derived (push_pull; GSG with one rib in each gap, Fig. 1(a),(b)); the cut is unstated.
- Judgment calls: td (about 240 nm) read as slab thickness from the schematic (ambiguous); VpiL at four wavelengths read from Fig. 2(c); Vpi 2.4 V x 7 mm = 1.68 V cm differs from the 1.62 V cm read from the figure; bandwidth bound 50 GHz gt from the intro statement.
- CSV hints: sim_candidate unknown resolved to yes (config written as a disclosure record).

## Gaps and notes
- New organization: Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences (cai2025 affiliation 1).
- No SPEC proposals. The `bw3db_reference` enum has no slot for "mean of a frequency window" (rahman2025 Design 3); `other` with the frequency left empty was used.
