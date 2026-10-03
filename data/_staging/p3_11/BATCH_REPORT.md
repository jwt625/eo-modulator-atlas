# p3_11 batch report (verified_on 2026-10-02)

Papers: powell2024a, nelan2022, nelan2022a, feng2022, gao2024. Dry-run merge of this staging directory: 0 conflicts, 0 validation errors (5 papers, 6 device rows, 12 organizations, 5 evidence files). Two sim configs written (nelan2022, gao2024); the engine was not run. No cache repair was needed (text.md and figures/ present for all five; source.pdf and source.json untouched). No network requests, no git.

## Version note (preprint vs journal)
All numbers come from the cached arXiv v1 preprints; none of the versions of record were read. License empty, published_on empty, redistribution restricted_local_only for all five (the Crossref licenses in the cache belong to the versions of record).
| Paper | arXiv version read | Journal / other |
|---|---|---|
| powell2024a | 2405.05169v1 (3 pp, stamp 2024-05-08) | Optics Express 32(25) 44115, 2024-11-19; title differs ('DC-' added) |
| nelan2022 | 2207.02608v1 (11 pp, stamp 2022-07-06) | none known; no DOI, no Crossref record |
| nelan2022a | 2207.02934v1 (5 pp) | IEEE Photonics Technology Letters 34(18) 981-984, 2022-09-15 |
| feng2022 | 2202.12739v1 (16 pp) | Photonics Research 10(10) 2366, 2022-09-27 |
| gao2024 | 2406.08744v1 (4 pp) | Optics Letters 49(20) 5783, 2024-10-03; Crossref lists 11 authors, preprint 10 |

Cache note: the batch brief said no crossref.json exists; crossref.json is in fact present for powell2024a, nelan2022a, feng2022 and gao2024 (not nelan2022, which has no DOI). It was used for identity and venue only.

## Distinctness of nelan2022 and nelan2022a
Confirmed distinct works (different arXiv ids, abstracts and results): nelan2022 = folded 11 mm SiNx-loaded MZM with UV15-clad plain CPW, Vpi 2.98 V, ER above 45 dB, about 30 GHz; nelan2022a = 10 mm segmented slow-wave electrode MZM on a Si handle, Vpi 3.75 V, about 95 GHz. Same group and same material stack (300 nm LN, 100 nm x 2 um SiNx, 4.7 um BOX), so geometry fields overlap by design, not by duplication.

## powell2024a
- Status: distilled. Rows: 1 paper, 1 device (7.5 mm cladded TFLT MZM), 1 evidence block. repro_grade C, sim config none (signal and ground widths not stated; Fig. 1(b) schematic not to scale, so not digitizable).
- Not reported: Vpi voltage (only VpiL 3.4 V cm), signal/ground widths, n_RF, n_g, 3 dB bandwidth (flat to 50 GHz after 3 GHz, VNA limited), fiber-to-fiber loss, optical power handling.
- Judgment calls: drive push_pull and vpi_convention mzm_push_pull entered with basis derived (GSG, one arm per gap; authors do not say). On-chip loss 0.35 dB entered as author_estimate (the text mixes a 0.13 dB scattering part, a 0.7 dB electrode-misalignment loss on the second port and 0.35 dB total). Z0 39 ohm basis author_estimate (method unstated). prop_loss 0.09 dB/cm was a unit conversion of 9 dB/m from the uncladded racetrack, not the cladded MZM waveguide (cell emptied in the 2026-10-03 audit correction). DC-stability (headline) recorded in device notes: no column. EO bandwidth: bw3db empty, bw_measured_to_ghz 50.
- CSV hints: title in the CSV is the journal title; the cached v1 title lacks 'DC-'. All abstract-level claims confirmed.

## nelan2022
- Status: distilled. Rows: 1 paper, 1 device, 1 evidence block. repro_grade B, sim config `sims/nelan2022/config.yaml` (uniform GSG cross-section, UV15 not modelled, RF permittivities omitted per the churaev2023 convention).
- Not reported: DC and RF Vpi on a stated convention, Z0 as a number (curve only), optical power for the EO measurement, electrode length for the S21 loss, fabricator.
- Judgment calls: Vpi 2.98 V from the Fig. 7(f) caption (text and abstract say 3.0 V / below 3.0 V); VpiL 3.3 V cm is the abstract value, basis derived; ER 45 dB with gt (OSA peak/null in Fig. 8 gives 45.5 / 45.4 dB; reverse operation about 33 dB not entered); bw3db 30 GHz approx, reference unspecified (sidebands only 3-40 GHz); n_rf 2.10 is the UV15-clad value (air-clad 1.85 is a sim target only); loss 12.0 dB fiber-to-fiber and 1.1 dB on-chip as stated, with the author's accounting in the notes; folded layout (two 5.5 mm sections) entered as length 11 mm.
- CSV hints: author list truncated (nine authors in the PDF); no DOI (arXiv-only). All abstract-level claims confirmed.

## nelan2022a
- Status: distilled. Rows: 1 paper, 1 device, 1 evidence block. repro_grade C, sim config none (segmented-electrode topology ambiguous in Fig. 1(c); ground width and segment period unstated).
- Not reported: operating wavelength, Vpi*L, Z0 (varies +-10 ohm), RF loss as a number, optical power, fabricator.
- Judgment calls: Vpi 3.75 V approx, ER 45 gt, bw3db 95 GHz approx referenced to 1 GHz (stated in text; crossing observed within the 120 GHz sweep so bw_measured_to_ghz empty), fiber-to-fiber 7.47 dB approx (author accounting uses a 30 mm reference waveguide), n_rf 2.134 at 120 GHz (the value the design was tuned to; basis measured with note), n_og 2.138 basis author_estimate.
- CSV hints: author list truncated (seven in the PDF, matching Crossref); cached PDF is formatted as an Optics Letters letter although the journal is IEEE PTL.

## feng2022
- Status: distilled. Rows: 1 paper, 2 devices (RAMZI, reference MZI), 1 evidence block. repro_grade C, sim config none (resonator-assisted device; BOX, electrode dimensions and length not stated).
- Not reported: Vpi, electrode length, EO bandwidth, BOX thickness, electrode width/thickness/metal thickness, fabricator. Headline SFDR has no column and is stored as text in `modulation_format` on both rows.
- Judgment calls: il_onchip 2.5 dB basis derived (authors' partition 2.2 + 0.3 of the measured 10.5 dB total; fiber-to-chip 8 dB for both facets); wavelength 1594.9 nm (L-band) from Methods; fsr_nm 0.4 approx; Q 1.1e6 is intrinsic and the column is loaded Q, so not entered; on-chip power 125 mW (ambiguous wording) not entered; reference MZI row carries only SFDR.
- CSV hints: DOI (from arXiv metadata) consistent with the Crossref record in the cache. SFDR claim confirmed.

## gao2024
- Status: distilled. Rows: 1 paper, 1 device (dual-arm phase modulator, 1 cm total electrode), 1 evidence block. repro_grade B, sim config `sims/gao2024/config.yaml` (single-pass cross-section; ground width assumed 100 um, project_inference; one non-comparable target).
- Not reported: DC Vpi, bandwidth, ground width, per-pass electrode length, wavelength of the Vpi-versus-frequency sweep, definition of the 2.8 dB insertion loss, fabricator.
- Judgment calls: vpi_rf_v 3 V approx at 12 GHz (first of the minima near 12, 16, 22, 26 GHz); single-arm 5.5 V (text) versus about 5.2 V (plotted) in notes only; insertion loss entered as il_fiber_to_fiber 2.8 dB with a definition caveat; slab 290 nm and sidewall 6.3 deg are derived values (formulas in the evidence derived list); wavelength left empty, band cl_band from 1510-1600 nm; vpi_convention unspecified.
- CSV hints: author mismatch (preprint 10 authors, Crossref 11, adds Zhiwei Fang). Abstract-level claims confirmed ('approximately 3 V', 2.8 dB).

## Organizations added (12 rows in staging organizations.csv)
New relative to data/organizations.csv: Harvard University, Center for Nanoscale Systems, University of Delaware, Phase Sensitive Innovations, City University of Hong Kong (HK), Institute of Optics and Precision Mechanics Chinese Academy of Sciences, University of Chinese Academy of Sciences, Shanghai Institute of Optics and Fine Mechanics Chinese Academy of Sciences, East China Normal University, Shanxi University, Shandong Normal University, Hefei National Laboratory. Harvard University, Center for Nanoscale Systems, City University of Hong Kong, East China Normal University and Shanxi University are also staged by other batches with identical type/country/region.

## Blockers
None. Follow-ups: version-of-record checks (journal numbers could differ for all five, especially gao2024 with the extra author); nelan2022a could reach grade B if the segmented-electrode mapping is settled (see SPEC_PROPOSALS.md); powell2024a could reach B with the electrode widths from the journal version.

## Audit corrections (2026-10-03)
Q1 audit findings applied per AUDIT_DISPOSITIONS.md: powell2024a prop loss emptied and EO roll-off 3 dB at 3 GHz re 1 GHz added; nelan2022 bandwidth basis set to derived, n_rf and S21 notes corrected, sim config text and r33 provenance fixed; nelan2022a il basis derived and ng_opt qualifier dropped; feng2022-b inference evidence added; gao2024 frequency qualifier and minima note, sim config target removed. Deferred to the coordinator: author-list rule (gao2024), `discovered_via` vocabulary, optional extra gao2024 rows. Dry-run merge of p3_11, p3_12, p3_13 together after the corrections: 0 conflicts, 0 validation errors (16 papers, 36 device rows, 35 organizations, 14 evidence files). Both sim configs still load and stop at the missing RF permittivity in the engine load check; no solver results stored.
