# p3_04 batch report (verified_on 2026-10-02)

Papers: sayem2026a, sayem2026b, lin2025a, kim2025, mao2024. Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 11 device rows, 4 new organizations, 5 evidence files). No sim configs written (all five are repro_grade C or not TWE-characterized); engine not run.

Cache repair: all five had `source.pdf` and `source.json` but no `text.md` or `figures/`. Text and figures were regenerated locally from the cached PDFs with `scripts/extract_source.py` (no network, run on scratch copies of the PDFs). `source.pdf` and `source.json` are byte-identical to the originals (the script rewrites `source.json`; the original was restored). The `source_url` and `doi` header lines of four `text.md` files were filled by hand after extraction.

## Version note (preprint vs journal)
| Paper | Numbers come from | Other version |
|---|---|---|
| sayem2026a | arXiv 2604.27285v1 (6 pp, stamped 2026-04-30) | none located |
| sayem2026b | arXiv 2602.00922v2 (6 pp, stamped 2026-04-05; v2 title differs from batch CSV v1 title) | v1 not cached; none located |
| lin2025a | arXiv 2505.21927v2 (12 pp, no Supplementary Material) | none located |
| kim2025 | arXiv 2507.17150v1 (16 pp incl. Supplementary, stamped 2025-07-23) | Optics Letters 51(14) 3984 (issued 2026-07-13, Optica OA licence v2 per Crossref): not read, may differ |
| mao2024 | version of record, Communications Materials 5, 114 (2024-07-01, CC-BY-4.0, 8 pp, no Supplementary Information) | none |

Licenses: preprint-only rows (sayem2026a/b, lin2025a, kim2025) have empty `license`, `published_on` empty, `redistribution = restricted_local_only` (the kim2025 Crossref licence belongs to the version of record). mao2024: CC-BY-4.0 verified from Crossref and the PDF rights statement, `open_license_ok` (source.json had restricted_local_only as a default).

## sayem2026a
- Status: distilled. Rows: 1 paper, 6 devices (7 mm MZM at 25, 91, 120 C; 1.5 mm coupling modulator at 25, 95, 125 C), 1 evidence block. repro_grade C, sim config none.
- Not reported: LT film thickness, etch, rib width, slab, electrode width/thickness, cladding, BOX, crystal cut, wavelength of the MZM measurements, IL, ER, RF Vpi, Z0, n_rf, drive amplitude, fabricator; for the coupling modulator Vpi, wavelength, Q, bandwidth.
- Judgment calls: one MZM row per hot-plate temperature (Vpi 3.8/3.6/3.4 V, text p.3). Bandwidth "beyond 50 GHz" (OSA sideband measurement, 3 to 50 GHz, no crossing) entered as 50 GHz with `gt` and measured-to 50 on all three rows, reference `unspecified` (normalization not stated); Fig. 3(b) temperatures 28/92/119 C differ from Fig. 2(c). Drive and Vpi convention entered as push-pull with basis derived (not stated; GSG layout in Fig. 2(a)). Coupling-modulator tuning efficiency (0.00054, 0.00137, 0.0014 nm/V, approx) is my arithmetic from the Fig. 4(e) end points at 25 V, in the derived list; the authors give no number and the elevated-temperature curves are nonlinear. Microring Q data (Fig. 1) not entered as device rows (passive temperature test).
- CSV hints: platform lithium_tantalate, class mzm, priority 2 fine; sim_candidate unknown resolved to no (grade C).

## sayem2026b
- Status: distilled. Rows: 1 paper, 1 device (2 mm resonant coupling modulator), 1 evidence block. repro_grade C, sim config none.
- Not reported: LT film thickness, etch, rib width of the coupling modulator, electrode type, wavelength, Q, bandwidth, loss, RF behavior (deferred to a separate work).
- Judgment calls: Vpi 3 V and VpiL 0.6 V cm as stated (abstract, p.1, p.4); the 3 V is the bias that takes the resonator from critical coupling to no coupling, so `vpi_convention = unspecified`; paper gives an equivalent straight-waveguide Vpi of 14 V (notes only). ER "more than 15 dB" entered as 15 with `gt`, type static. Ring power-handling results (about 4 W intracavity, shift about 1 GHz; about 160 MHz at 1 W after anneal; Q after anneal) are in the notes only, because `optical_power_handling_dbm` has no intracavity convention. Device class `ring` kept from the CSV hint.
- CSV hints: title is the v1 title; cached v2 title used. published_on 2026-01-31 (v1) not verifiable from the cache.

## lin2025a
- Status: distilled (material/platform paper, one device row for the unbalanced MZI phase tuning). Rows: 1 paper, 1 device, 1 evidence block. repro_grade C, sim config none.
- Not reported: measurement wavelength (axis spans about 1545 to 1555 nm in Fig. 2(c)), electrode metal/thickness/width, electrode type, cladding, ER, loss, RF response, any Vpi, bandwidth. Supplementary Material (r42 extraction) not in the cache.
- Judgment calls: `device_class = phase_shifter` (unbalanced MZI used only for DC resonance tuning; batch hint mzm). Vpi 31.0 V is my derived value = (FSR/2) / tuning slope = 1.2815 nm / 0.0413 nm/V, basis derived; single 5 V point gives 57.6 pm/V versus the fit slope 41.3 pm/V. r42 = 1268 pm/V and 74.3 percent confinement stay in notes (no column). Drive entered single-ended (inferred from Fig. 1(e), only the straight arm between electrodes).
- CSV hints: license arXiv-nonexclusive not verifiable from the cache; sim_candidate yes not followed (grade C, DC only, electrode metal/thickness absent).

## kim2025
- Status: distilled (material/platform paper, one MZM device row). Rows: 1 paper, 1 device, 1 evidence block. repro_grade C, sim config none.
- Not reported: MZM measurement wavelength, electrode thickness/widths, cladding, electrode type, ER, loss, bandwidth, RF Vpi. Resonator Q/propagation loss (Qi 1.35e6, 0.32 dB/cm best, about 0.3 dB/cm straight) are for resonators and are in the notes only.
- Judgment calls: single-arm MZM, Vpi 1.44 V, VpiL 0.54 V cm measured (quasi-static, after poling at 120 V for 30 min); r_eff about 162 pm/V is the authors' estimate (notes only). Text cites Fig. 3(b)/(c) while the caption calls the curve Fig. 3(d); locator uses panel 3(c). Year 2026 from Crossref (journal); first public version 2025-07-23.
- CSV hints: batch row merges preprint and Optics Letters; numbers read from preprint v1 only.

## mao2024
- Status: distilled. Rows: 1 paper, 2 devices (2.5 mm PLZT MZM at 1550 and 1310 nm), 1 evidence block. repro_grade C, sim config none.
- Not reported: electrode gap, PLZT permittivity/index, RF Z0/n_rf, ER, RF Vpi, per-wavelength bandwidth and loss, energy per bit, net rate, fabricator, wavelength of the S21 and loss data.
- Judgment calls: Vpi 2.8 V (1550) and 2.3 V (1310) at 14 kHz; VpiL 0.70 and 0.58 V cm (Results/Table 1), Introduction says 5.6 V mm at 1310. Bandwidth "larger than 70 GHz" entered as 70 with `gt` and measured-to 70; reference `unspecified` (authors compensated the 1 to 8 GHz response); wavelength not stated, so entered on the 1550 nm row only, as are the 5.6 dB on-chip loss (author_estimate: 1.7 dB phase shifter plus 3.9 dB passive) and propagation loss 0.66 dB/mm (6.6 dB/cm, my unit conversion, derived list). System results (OOK 172 Gbit/s, PAM4 304 Gbit/s, 200 mVpp, AWG plus SHF linear driver) are on both rows because the paper states performance at both wavelengths. Push-pull stated by the authors (p.2); Vpi convention entered as MZM push-pull with basis derived. Waveguide platform `other` (PLZT ridge on SiO2/Si). Temperature results (85 C 2000 h Vpi stable, OOK BER stable 25 to 70 C) in notes only.
- CSV hints: batch device_class_guess other and platform note corrected to mzm / plzt; priority 2 fine.

## Organizations added (4, none present in data/organizations.csv; three also staged in other batches, see Audit corrections)
Nokia Bell Labs (US, company; distinct from existing Nokia Corporation, Sunnyvale); National University of Singapore (SG); University of Illinois at Urbana-Champaign (US); Kyushu University (JP). Facilities named only in acknowledgements (Holonyak Micro and Nanotechnology Lab, AFRL, La Luce Cristallina) not added and not entered as foundry_or_fab.

## Blockers
None. Follow-ups: Optics Letters version of kim2025 could change numbers; Supplementary Material of lin2025a and mao2024 not cached (r42 extraction, PLZT waveguide loss, Supplementary Fig. 7 VpiL vs wavelength).

## Audit corrections (2026-10-03)
Audit Q1-p3_03-p3_04 findings resolved; per-finding table in AUDIT_DISPOSITIONS.md. Statements above that this section supersedes:
- Organizations: the statement that the 4 new organizations appear in no other staging batch was incorrect. Nokia Bell Labs is also staged in p3_14, University of Illinois at Urbana-Champaign in p3_10, Kyushu University in p3_07 (identical type/country/region, notes differ; the merge keeps the first row); National University of Singapore appears in no other batch. Left for the coordinator.
- sayem2026a: the coupling-modulator tuning values are labelled batch secants at 25 V (nonlinear at 95 and 125 C) and the first-person wording is removed; the 50 GHz bandwidth bound is described as the authors expectation over a measured 3-50 GHz range. The roll-off at 50 GHz was not entered.
- lin2025a: Vpi about 31 V is a batch-derived value (not reported) and now carries the approx qualifier with the 22-31 V range in the notes; drive and Vpi convention have derived evidence entries; sidewall angle basis author_estimate.
- kim2025: drive and Vpi convention have derived evidence entries; id/year pairing noted in papers.csv.
- mao2024: Table 1 phase-shifter loss 0.6 dB/mm noted; Methods locators for electrodes, cladding, loss and stack corrected from p.7 to p.6 (page markers); wavelength non-attribution recorded in the bandwidth, on-chip loss and propagation-loss evidence entries.
- Validation after corrections: `uv run python scripts/merge_staging.py data/_staging/p3_04` -> papers 5, devices 11, orgs 4, evidence 5; conflicts 0; validation errors 0 (dry run).

