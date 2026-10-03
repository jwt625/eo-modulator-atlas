# p3_18 batch report (taghavi2022a, johnson2025, taghavi2024, witmer2020)

Updated 2026-10-03, verified_on 2026-10-02. Author verification only; not independently audited; not merged.
Dry-run merge: 4 papers / 14 device rows / 13 organizations / 4 evidence files; 0 conflicts, 0 validation errors.
No network, no git, no edits outside `data/_staging/p3_18/`. `text.md` and `figures/` were present for all four papers (no cache repair). Page renders were opened for every figure/table that supplies a number. All four sources are arXiv preprints cached on 2026-10-02 (not versions of record); the batch CSV `notes` hints were treated as unverified and every number comes from the cached text or figures. License and `published_on` are empty and redistribution is `restricted_local_only` for all four; `arxiv_id` carries the versioned id.

## Status

| Paper | Status | Version the numbers come from | Rows | repro_grade | Sim config |
|---|---|---|---|---|---|
| taghavi2022a | distilled | arXiv v2 (2203.04756v2, 16 pp.); journal DOI 10.1364/oe.460830 (Optics Express 30(15) 27841, issued 2022-07-15) not read | 1 paper, 2 devices (1 measured, 1 simulated projection) | C | none (SOH slot) |
| johnson2025 | distilled | arXiv v1 (2509.24825v1, 4 pp.); no DOI, no Crossref | 1 paper, 8 devices (5 measured PICs, best channel, 2 design rows) | C | none (SOH) |
| taghavi2024 | distilled | arXiv v3 (2405.08833v3, 27 pp., 2025-02-08); no journal DOI found | 1 paper, 1 device (DC and AC operating points in one row) | C | none (SOH, FN-LC) |
| witmer2020 | distilled (platform paper; device rows for the EO-tuned cavities only) | arXiv v1 (1912.10346v1, 31 pp.); journal DOI 10.1088/2058-9565/ab7eed (Quantum Sci. Technol. 5(3) 034004, issued 2020-04-27) not read | 1 paper, 3 devices | C | none |

No `needs_download.md`: all four sources are cached and readable.

## taghavi2022a (device ids -a measured, -sim projection)

Ledger: 1 mm arm, 40 nm slot, 5 nm TiO2, SEO125B (p.12, Fig. 11): spectral shift 120 pm for 1 V, FSR about 1.15 nm, ER > 20 dB, wavelength about 1620 nm read from the Fig. 11 axis (not stated in text). Abstract (p.1): VpiL below 1.2 V.mm "indicated by measurement" originally entered as `vpil_dc_vcm` 0.12 with `lt`; removed after audit F1 (see Audit corrections). Peak poling current 206 nA (below one third of the untreated slot), poling at least 100 V/um; these have no columns and are in notes. Projection row: VpiL about 0.35 V.mm and 39 GHz (COMSOL, doped Si), basis `simulated`, p.14.

Flags and judgment calls:
- Hint says the published abstract reads 1.2 and the arXiv v2 abstract 1.19 V.mm; the cached v2 text reads "below 1.2 V.mm" and contains no 1.19. Only the cached text is used.
- The body has no measured Vpi. Fig. 11 arithmetic (Vpi = FSR / (2 x 0.12 nm/V) = 4.79 V, about 4.8 V.mm at 1 mm) is about four times the abstract's bound; not reconciled and not entered in the CSV (it is in the evidence `derived` list). The abstract-derived `vpil_dc_vcm` was dropped after the audit (F1).
- Arm length: 1 mm (Fig. 11 caption), 0.5 mm (Table 1 model), and a 3 mm area implied by the current-density arithmetic on p.12.
- Page-1 affiliation labels are swapped relative to Crossref and the author-contribution paragraph; affiliations follow Crossref. Crossref spells "Ali. A. Efterkhar" (references: Eftekhar).
- Facility: "Georgia Tech IEN" entered as Institute for Electronics and Nanotechnology (acronym expansion from outside the paper, flagged in the org note).
- Not reported: Vpi, electrode type, drive, IL, bandwidth (measured), temperature of measurement, optical power, pedestal/electrode dimensions, doping. Fig. 12 values (about 0.46 to 0.23 V.mm for 0 to 10 nm TiO2, 40 nm slot) read by eye, not entered.

## johnson2025

Ledger (all p.1-3): PIC on Advanced Micro Foundry O-band GP v4.5, 8 GSGSG differential MZMs per PIC, slot 160 nm, rail 240 nm, 400 um phase shifter (200G design); Table 1 (p.2) Vpi,diff and 3 dB BW per PIC: 200G-A 2.13 V / not measured; 200G-B 2.33 V / 84.7 GHz; 200G-C 2.46 V / 84.6 GHz; 400G-A 6.74 V / 109 GHz; 400G-B 7.5 V / > 110 GHz (spreads in evidence notes); best single channel 1.57 V; design 2.08 V, 80.3 GHz, IL 2.4 dB at 1310 nm (IL scope undefined, notes only), 400G design 5.52 V; static ER typically >= 25 dB; 224 Gb/s (112 GBd PAM4) link at 1310 nm on 200G-A and 200G-B with 1.8 Vppd driver (1.29 Vppd at the modulator), SER about 1e-2.

Flags and judgment calls:
- Rows are PIC/channel summaries, not 8 independent devices; 400G phase-shifter length not stated (empty).
- S21 reference is "relative to 1 GHz" (Fig. 2 y-axis); applied to Table 1 values with an evidence note. S21 measured on a single arm with a 2-port analyser (notch artefact per the authors).
- SEPP-equivalent efficiencies (0.31 V.mm best, about 0.5 V.mm typical) and r33 values (343 pm/V; 200-250 pm/V) are the authors' conversions and are not entered as vpil (different convention from the differential Vpi); they are in notes.
- Table 2 row "200--Tx0" read as 200G-A Tx0 (matches Figs. 4, 5 values). Wavelength 1310 nm is the link-test wavelength; the Vpi measurement wavelength is not stated; the best-channel row uses 1290 nm, the authors' stated "measurement wavelength" in Eq. (1).
- Hint platform, class (`other` resolved to mzm) and priority fine; hint quotes are consistent with the text (abstract "Vpi L < 0.5 V-mm" matches the SEPP-equivalent values).
- Not reported: IL (measured), propagation loss, RF loss, n_RF, ng, optical power handling, 6 dB BW, EO bandwidth reference beyond Fig. 2, temperature.

## taghavi2024

Ledger: 0.5 mm push-pull FLS MZM, FN-LC PM-158 (p.2, p.7-8, p.11, Table 2 p.22, Figs. 3-4): Vpi,DC about 0.5 V, VpiL DC about 0.25 V.mm; AC (Pockels) VpiL about 25.7 V.mm (Vpi 51.4 V, r33 about 24 pm/V, estimated from S21); f-6dB > 4.18 GHz; ER about 26 dB; IL about 2.6 dB (author estimate; measured 2.1 dB); propagation loss about 4.2 dB/mm (42 dB/cm, unit conversion); ng about 3.9; lumped electrodes.

Flags and judgment calls:
- Hint class `iq_mzm` is wrong; one push-pull MZM.
- Frequency of the AC estimate: text p.11 says "f = 4.18 MHz", while f-6dB > 4.18 GHz; `vpi_rf_freq_ghz` left empty.
- `bw_measured_to_ghz` 4.18 is read from the end of the FLS trace in Fig. 4(d) (the paper does not state a measurement limit; the VNA is 18 GHz); basis `extracted_from_figure`.
- Operating wavelength is not stated numerically (Fig. 3(d) spans 1566-1574 nm, hence band l_band after audit F12); `wavelength_nm` empty.
- Fabrication facility not named (SiEPICfab appears only as a funder); `foundry_or_fab` empty. Supplementary Notes 1-3 referenced and not cached.
- Not reported: wavelength, optical input power for the Vpi data, finger length/period/duty cycle/doping value in the main text, RF loss, n_RF.

## witmer2020

Ledger: quantum microwave-to-optical transducer (Stanford, Safavi-Naeini group). Converter cavity (unslotted fishbone, SEO100C): EO tuning 3.70 pm/V room temperature (Fig. 7(d), p.12; 2-6 pm/V over 9 devices; 1.1 pm/V after UV fiber gluing), total Q 19,900 at about 7 mK (Fig. 7(b)), FSR 2.3 nm, wavelength 1558 nm (abstract), electrode gap 2.7 um, length 450 um. Slotted test cavity: about 80 pm/V, 3 dB roll-off about 20 kHz (p.7-8). Unslotted test cavity: 3.9 pm/V at 6 Vpp, 3 um gap (Fig. 4(h)). Transduction results (efficiency 2.2e-9, conversion bandwidth 20.3 MHz, g0/2pi 330 +/- 60 Hz inferred, 400 Hz predicted, microwave Q, 9.5 dB sideband selectivity) are in notes only.

Flags and judgment calls:
- Cached abstract and body state 330 Hz; the 590 Hz of the published abstract (batch hint) is not in the cached text and is not used.
- Device rows were written because tuning rate, loaded Q and FSR are modulator-type metrics for a resonant EO device; `device_class` `other` (no cavity class). Temperature class left empty on the converter (Q at 7 mK, tuning at room temperature).
- Wavelength inconsistency inside the preprint: abstract 193 THz (1558 nm) vs Table 1 192.6 THz (about 1556.6 nm) vs Fig. 7(b) about 1557.9 nm; the abstract value is entered with `approx`.
- Crossref carries no affiliations; they come from page 1. Nine authors match Crossref.
- Not reported: Vpi, length of the slotted/unslotted test cavities, operating wavelength of the test cavities (read only from axes, not entered), RF loss/n_RF (resonant device), IL.

## Organizations (13 in this staging file)

Georgia Institute of Technology, Institute for Electronics and Nanotechnology (facility, parent Georgia Tech), NLM Photonics, Enosemi Inc, City University of Hong Kong, plus rows identical in type/country/region to other staged batches: University of British Columbia, Dream Photonics Inc., Polaris Electro-Optics, Inc., Advanced Micro Foundry, Stanford University, Stanford Nano Shared Facilities, Stanford Nanofabrication Facility, University of Washington. Notes differ from the other batches; the merge check compares only type/country/region.

## What could not be read or verified

- Version-of-record numbers for taghavi2022a, witmer2020 (journal versions not cached); taghavi2024 Supplementary Notes; johnson2025 plotted traces beyond Table 1/2 (Fig. 2 notch and exact crossings not digitized; Fig. 5 values read only at the table points).
- taghavi2022a Fig. 10 current curves and Fig. 12-13 simulation curves were not digitized beyond the numbers in the text.

## Audit corrections (2026-10-03)
Applied against `data/_staging/audits/p3_16-p3_19-q1-claude-ingest-2026-10-03.md`; per-finding dispositions in `AUDIT_DISPOSITIONS.md`. Each finding was re-checked against the cached text and page renders before applying.
- F1: taghavi2022a-a `vpil_dc_vcm`, `vpi_basis`, `vpi_convention` and the `lt` qualifier cleared, evidence entry removed; the abstract claim, the Fig. 11 arithmetic (4.8 V.mm, factor 4.0; about 5.4 V.mm from the render's null spacing of about 1.3 nm) and the unreconciled contradiction are in the row notes. taghavi2022a-sim unchanged.
- F5: johnson2025-200g-a `extinction_ratio_db`, `er_type` and `gt` cleared (family-level statement); it is in the notes of 200g-a/-b/-c.
- F12: taghavi2024-a band l_band. F13: Vpi-wavelength caveat in notes and evidence, `approx` dropped on 200g-best. F23: `bw_measured_to_ghz` 110 on johnson2025-400g-a plus note.
- F16: nine evidence notes above 25 words shortened (audit counted eleven; no other batch has any). F25: witmer2020 wavelength note extended.
- Dry-run merge of p3_16 + p3_17 + p3_18 + p3_19 after the corrections: `merge counts: papers 19, devices 52, orgs 52, evidence 19; conflicts: 0; validation errors: 0`.
