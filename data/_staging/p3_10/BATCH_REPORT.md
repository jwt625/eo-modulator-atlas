# p3_10 batch report (verified_on 2026-10-02)

Papers: anderson2025, chelladurai2025, suceava2025, ulrich2025, yu2024. Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 5 device rows, 11 organizations, 2 evidence files). No sim configs (none is a dielectric traveling-wave device with grade A/B; three are material-only). Engine not run. Cache: `text.md` and `figures/` were present for all five; no repair needed; `source.pdf` and `source.json` untouched. `yu2024` has no `crossref.json` (no DOI), as expected.

## Version note (preprint vs journal) and licenses
| Paper | Numbers come from | License handling |
|---|---|---|
| anderson2025 | arXiv 2502.15164v1 (24 pp incl. SI, stamp 2025-02-21). Science 390(6771) 394-399 (issued 2025-10-23) not read | unverified: license and published_on empty, restricted_local_only (batch-hint CC-BY-4.0 not verifiable; Crossref has no license) |
| chelladurai2025 | version of record, Nature Materials 24(6) 868-875, 2025-03-17, 11 pp, no SI in cache | CC-BY-4.0 from Crossref (vor) and p.8 rights statement; open_license_ok; published_on 2025-03-17 |
| suceava2025 | cached "arXiv v1" 2510.13256v1 (44 pp incl. SI) which is the Wiley-typeset Adv. Mater. article (page-1 CC notice, Wiley watermark dated 2025-10-14); equals journal text | CC-BY-4.0 from p.1 notice and Crossref vor (start 2025-10-11); open_license_ok; published_on 2025-10-11. source.json still says unverified/restricted_local_only (not edited; coordinator may update) |
| ulrich2025 | arXiv 2502.14349v1 (31 pp incl. SI). Science 390(6771) 390-393 (issued 2025-10-23) not read, may differ | unverified: license and published_on empty, restricted_local_only |
| yu2024 | arXiv 2407.05349v1 (22 pp incl. supplement); no journal version or DOI located | unverified: empty, restricted_local_only |

## anderson2025
- Status: no_device_rows (material-only). Rows: 1 paper, 0 devices. repro_grade empty, sim config none.
- Bulk SrTiO3 chips in a free-space Mach-Zehnder, 1550 nm, 100 kHz, bias-induced Pockels; no waveguide device.
- Paper-reported material numbers (also in papers.csv notes; no column; T = 5 K or temperature of maximum, T < 10 K; Table I p.6):

| Quantity | STO | STO-28 | STO-33 | Locator |
|---|---|---|---|---|
| r33,max (pm/V) | 580(60) | 840(50) | 1150(30) | Table I p.6; Fig. 4a p.6 |
| d33,max (pC/N), lower bound | 91(6) | 150(9) | 435(25) | Table I p.6; p.8-9 |
| eps_r,max | 26.0(1.5) k | 42.0(3.7) k | 82.0(1.6) k | Table I; 100 kHz, 1 V (p.8) |
| E at max r33 (MV/m) | 0.080 | 0.036 | 0.008 | Table I |
| g11 (m^4/C^2) | 0.15(2) | 0.21(3) | 0.30(1) | Table I |
| k33,max | 0.15(1) | 0.21(2) | 0.46(3) | Table I |

  Also: index 2.284 at 1550 nm (p.3); r13 = 170(20) pm/V (SI S4 p.16); loss about 0.7 dB/cm at low T, 0.9 peak near 75 V, below 0.55 at 200 V (SI S8 p.18-19); EO bandwidth above 1 THz is predicted (LST relation, SI S6 p.18), measured RC cutoff 1-4 MHz.
- Not reported: any device geometry, wafer supplier, fabricator.
- Judgment calls: Stanford Nano Shared Facilities placed in `companies` (author affiliation, not a fab); University of Illinois org entered under its official name "University of Illinois at Urbana-Champaign" (paper writes "University of Illinois Urbana-Champaign") to match batch p3_04.
- CSV hints: platform strontium_titanate and class other fine; license CC-BY-4.0 hint not verifiable for the cached preprint.

## chelladurai2025
- Status: no_device_rows (material-only). Rows: 1 paper, 0 devices. repro_grade empty, sim config none.
- The 25 um BTO / 50 um LN hybrid-gap-plasmon-style phase shifters are characterization vehicles. Main text gives no measured Vpi, bandwidth or loss for them (IL about 0.2 dB is simulation-based, p.2; simulated VpiL is only a method, p.9, values would be in the absent SI).
- Paper-reported material numbers (1550 nm, 100 MHz to 330 GHz, BTO partially poled, temperature not stated):

| Quantity | Value | Locator |
|---|---|---|
| LN eps_a, eps_c | 45, 27 (literature mean, confirmed), constant over range | p.3, Fig. 2c |
| BTO Debye fit, this work (485 nm RF-sputtered) | gamma0 72.6 +/- 2.3 GHz, sigma 0.87 +/- 0.02, delta_eps 905 +/- 26, eps_inf 231 (fixed) | Table 1 p.4; Fig. 2d p.3 |
| BTO Debye fit, literature | gamma0 1.15 +/- 0.30 GHz, sigma 0.92 +/- 0.20, delta_eps 1862 +/- 149, eps_inf 231 +/- 79 | Table 1 p.4 |
| LN r33; 1/2(r13+2 r42) | 26.9 pm/V; 15.0 pm/V, flat | p.5; Fig. 4a p.6 |
| BTO r33 | 125 pm/V at 100 MHz; Debye gamma0 565 MHz, sigma 0.06, S_R 75, r_inf 60 pm/V (text p.6 attributes the Debye parameters to r33, the Fig. 4 caption to r42; text followed) | p.6; Fig. 4b, caption |
| BTO 1/2(r13+2 r42) | 481 pm/V at 100 MHz, 191 pm/V at 330 GHz; Miller delta 0.327 +/- 0.002 pm/V, n0 = 2.26 | p.6, Eq. 5 |

- Not reported (in cache): Supplementary Notes 1-5, sample temperature, measured Vpi values.
- Judgment calls: no device rows (see above). Foundry = Binnig and Rohrer Nanotechnology Center (acknowledgements, same convention as kohli2025). Equation 5 and 6 results are author-derived (Miller's rule), not direct measurements for the r42 dispersion curve model.
- CSV hints: fine (platform barium_titanate, class other, priority 3).

## suceava2025
- Status: no_device_rows (material-only). Rows: 1 paper, 0 devices. repro_grade empty, sim config none.
- About 36.5 nm MBE BTO on (110)o GdScO3 (-1.0% strain) with surface electrodes; PSCA at 1550 nm, 555 Hz; 5 to 295 K.
- Paper-reported material numbers (effective Pockels r_eff):

| Quantity | Value | Locator |
|---|---|---|
| r_eff at 5 K (abstract headline) | 2516 +/- 100 pm/V; Table S3 cycle 1 r(1),max 2516 +/- 90 | abstract p.1; Table S3 p.34 |
| peak r_eff | 2735 +/- 100 pm/V at 15 K | p.5; Fig. 1c p.3; Fig. 3b p.6 |
| r_eff at room temperature | 25 +/- 2 pm/V | p.5 |
| r51 at 15 K (author-derived, r_eff / about 1.7) | 4649 +/- 170 pm/V | p.7 |
| high-field slope r(1),hf | about 200 pm/V (text p.6) vs 132 +/- 4 (Table S3 cycle 1, 5 K fit of that cycle): not reconciled in the main text | p.6; p.34 |
| later thermal cycles 10-14, r(1),max | 1252 to 1619 pm/V | Table S3 p.34 |

- Not reported: any GHz response, waveguide loss, fabricator of the film (Cornell affiliations only).
- Judgment calls: abstract 5 K value and peak 15 K value both recorded; version labelling as above; source_type kept arxiv_preprint (cache label) while license/redistribution use the verified Wiley CC-BY notice; The Pennsylvania State University named as in the paper.
- CSV hints: fine.

## ulrich2025
- Status: distilled. Rows: 1 paper, 1 device (`ulrich2025-mzi`), 1 evidence block. repro_grade C, sim config none.
- Device: 15.37 mm (roughly) meandered single-arm MZI, 105 nm MBE SrTiO3 bonded on 2 um SiO2/Si, PMMA-loaded waveguides (1.7 um wide), Cr/Pt electrodes with 10 um gap, 4 K, around 1470 nm.
- Headline: VpiL 1.04 +/- 0.08 V cm (author-computed from r_eff 345 +/- 30 pm/V, quasi-static 20 Hz, remanent poled state; basis derived); bandwidth flat to 1 MHz by an indirect method (bound entered as 0.001 GHz with gt, reference unspecified); group index 1.84 (FSR-derived).
- Material numbers in papers.csv notes: r_eff 345 +/- 30 (zero-field remanent, meander-corrected) and 140 +/- 30 pm/V (1.6 V/um), 134 +/- 2 pm/V at 1 kHz; eps_r 2700 (100 kHz) to 2500 (1 GHz) at 5 K; Tc about 100 K; Ec 0.6 V/um; material loss below 5.5 dB/cm upper limit.
- Not reported: Vpi in volts, extinction ratio, insertion loss and propagation loss at 4 K, RF behaviour, electrode thickness as a single number (Cr 30 nm and Pt 140 nm approximate), fabricator named.
- Judgment calls: `device_class mzm`; `vpi_convention mzm_single_arm` and `drive single_ended` inferred from the Fig. 3b caption (basis derived, authors do not state); `electrode_type lumped` inferred (quasi-static wire-bonded drive); `waveguide_platform other` and `integration other`; wavelength and length qualified `approx` ("around", "roughly"); rib width entered as the PMMA strip width; no Vpi derived from VpiL/length (author states only a field change of 0.084 V/um); 3 dB bandwidth bound is at the measurement limit and an indirect time-averaged method.
- CSV hints: priority 3 and sim_candidate no fine; class other in the hint changed to mzm because a quantitative device metric exists.

## yu2024
- Status: distilled. Rows: 1 paper, 4 devices (`yu2024-s0` to `yu2024-s3`), 1 evidence block. repro_grade C, sim config none.
- Device: 4 mm X-cut TFLN MZM measured after four successive treatments of the same device; Vpi 4.95 / 4.25 / 1.74 / 1.57 V at 1550 nm, 1 MHz sweep (quasi-static, entered as `vpi_dc_v`); VpiL 1.98 and 0.63 V cm stated for S0 and S3 only (entered as reported, basis derived).
- Not reported: electrode thickness and widths, sidewall angle, slab and etch (Table 1 label Hc ambiguous), RF response, bandwidth, loss, ER, EO measurement temperature, fabricator, direct r measurement.
- Judgment calls: one row per treatment state (convention d: different measured operating point); Table 1 labels H, Wg, Gap, H1, H2 mapped to film thickness, ridge width, electrode gap, BOX, substrate by reading the Fig. 2 schematic (basis design_target, flagged in evidence notes); drive and convention inferred push_pull from Fig. 4(b) (derived); the paper attributes the change to a multiferroic-skyrmion Pockels enhancement and reports a single device with no control anneal; abstract says 101 pm/V, p.11 text says 69 pm/V, Fig. 4(d) shows about 100 pm/V for S3 (read from figure): all kept in notes only.
- CSV hints: batch note "no metric extraction" overridden (the full text reports measured device Vpi); priority 2 fine; platform lithium_niobate fine; sim_candidate unknown resolved to no.

## Organizations added (11; none in data/organizations.csv)
Stanford University, Stanford Nano Shared Facilities, University of Illinois at Urbana-Champaign (same rows as p3_02 and p3_04, identical type/country/region), University of Michigan, The Pennsylvania State University, Cornell University (same as p1_02), Platform for the Accelerated Realization, Analysis, and Discovery of Interface Materials (PARADIM), Cornell High Energy Synchrotron Source, Kavli Institute at Cornell for Nanoscale Science, Leibniz-Institut für Kristallzüchtung, KU Leuven. Existing and reused: ETH Zurich, Ghent University, imec, Zhejiang University, Binnig and Rohrer Nanotechnology Center.

## Blockers
None. Follow-ups: Science versions of anderson2025 and ulrich2025 and the Supplementary Information of chelladurai2025 are not cached and could change or extend numbers; source.json of suceava2025 should be updated by the coordinator (license verified, article is the Wiley-typeset text).

## Schema and skill gaps
- No column or table for material-level coefficients (r_eff/r33/r42 with temperature, frequency and bias conditions; permittivity; Debye parameters); only notes carry them.
- No column for measurement temperature in kelvin (temperature_class only), nor for operating state (poling, anneal treatment); yu2024 needs four rows to carry treatment states.
- No `waveguide_platform` value for PMMA-loaded oxide films (used `other`) and no `integration` value for epitaxy-on-Si plus layer transfer (used `other`).
- `discovered_via` tokens `web_search` and `author_group_followup` (batch hint) are outside the documented token list in the schema; kept as given because the validator does not check them.
- BATCH_INSTRUCTIONS says verified_on 2026-10-01; this batch used 2026-10-02 as instructed by the coordinator.
- Quasi-static kHz-MHz Vpi (yu2024 1 MHz, ulrich2025 20 Hz) goes to `vpi_dc_v` by precedent (mao2024); no rule states the frequency cutoff between dc and rf.
- Sub-MHz "bandwidth" from an indirect method (ulrich2025) has no convention; entered as a gt bound at the measurement limit.
- Extracted text drops micro signs (ulrich2025 coercive field "V/m" for V/um); figure was checked.

## Audit corrections (2026-10-03)
Fresh-context Q1 audit resolved; per-finding table in `AUDIT_DISPOSITIONS.md`. Summary: chelladurai2025 Debye-parameter attribution (text r33 vs caption r42) recorded; suceava2025 r(1),hf wording changed from "inconsistency" to "not reconciled" and the version note now states the license applies to the cached Wiley-typeset file while source_type/arxiv_id/url/access still describe the arXiv listing (coordinator to decide; source.json untouched); ulrich2025 Crossref-only author recorded, bandwidth bound tagged `bw_indirect_method`, locator corrected to p.6 Fig. 3(f) caption and p.7 text; yu2024 `access` set to `arxiv`. Cross-batch items (acknowledged-cleanroom rule, `discovered_via` tokens, dc/rf Vpi cutoff, published_on) listed in `AUDIT_DISPOSITIONS.md` for the coordinator; a new `SPEC_PROPOSALS.md` records the dated proposals. Dry-run merge with p3_08 and p3_09: 0 conflicts, 0 validation errors.
