# p3_12 batch report (verified_on 2026-10-02)

Papers: chen2023a, hu2026a, niels2025a, tan2024, wang2026b. Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 16 device rows, 8 organizations, 5 evidence files). No sim configs written (all five repro_grade C; tan2024 is a ring); engine not run. No cache repair needed: all five had `text.md` and `figures/`; `source.pdf` and `source.json` untouched. Two papers (chen2023a, tan2024) do have a `crossref.json` (journal records); the other three do not.

## Version note (preprint vs version of record)
| Paper | Numbers come from | Other version |
|---|---|---|
| chen2023a | arXiv 2304.06946v1 (10 pp) | Laser & Photonics Reviews 17(11), 2200927 (Crossref issued 2023-10-02): not read, may differ |
| hu2026a | arXiv 2605.21073v1 (14 pp) | none located |
| niels2025a | arXiv 2412.15157v2 (10 pp) | batch CSV metadata cites Opt. Mater. Express 15, 531-540 (2025), DOI not retrieved, not in cache: not read |
| tan2024 | arXiv 2311.15387v1 (10 pp, Supplement 1 not cached) | ACS Photonics 11(5), 1920-1927 (Crossref issued 2024-04-12): not read, may differ |
| wang2026b | arXiv 2606.15391v1 (12 pp, Supplementary data not cached) | none located |

All five: `license` empty, `published_on` empty, `redistribution = restricted_local_only`, `arxiv_id` versioned, `source_type = arxiv_preprint`, `discovered_via` verbatim from the batch CSV (`web_search;author_group_followup;continuation_2026_10_02`). The Crossref licences of chen2023a/tan2024 belong to the version of record and are not recorded.

## chen2023a
- Status: distilled. Rows: 1 paper, 2 devices (4 mm glycerol-clad MZM, headline; 4 mm air-clad reference read from Fig. 6(d)), 1 evidence block. repro_grade C, sim config none.
- Not reported: gap, waveguide width, SiO2 cladding width of the fabricated headline device; extinction ratio; RF loss, Z0, n_RF; electrode widths; substrate; propagation direction; an explicit push-pull statement.
- Judgment calls: Vpi 3.52 V and VpiL 1.41 V cm measured (1 MHz triangular sweep, 1550 nm). Bandwidth ">40 GHz" is the VNA limit (Fig. 6(f), no crossing): bw3db 40 with gt, measured-to 40, reference unspecified. IL 0.5 dB entered as on-chip with approx (abstract calls it excess loss, Table 1 "Loss", Methods say fiber-waveguide and straight-waveguide loss are normalized out); no loss figure. Drive/convention push-pull inferred from GSG layout (derived entries in evidence; authors never say it). Slab 400 nm derived (600 minus 200). Air reference VpiL about 2.22 V cm read from the plot (+-0.02).
- Paper inconsistencies: simulation parameters (w = 4 um top width, wSiO2 = 3.2 um, gap 5 um) contradict Fig. 2(c), where the SiO2 cladding is wider than the waveguide, and the proportion formula P = (gap - wSiO2)/(gap - w) gives P > 1 with them; rib width and gap therefore left empty. Methods call the 500 nm upper layer e-beam evaporated while text and figures name glycerol. Fig. 6(f) caption says "both devices", one curve shown.
- CSV hints: title, authors, DOI, 1.41 V cm / ~0.5 dB / >40 GHz verified. CSV priority and platform fine.

## hu2026a
- Status: distilled. Rows: 1 paper, 8 devices (one per array channel; Vpi 3.60-3.83 V read from the Fig. 7 insets, consistent with the text range), 1 evidence block. repro_grade C, sim config none.
- Not reported: rib etch depth/height, rib width, signal-electrode width, Au thickness, BOX thickness, fabricated cladding thickness, measurement-limit frequency, per-channel IL, RF Z0/n_RF/loss numbers in text, optical power.
- Judgment calls: channel numbering follows Fig. 7 panel reading order (paper does not number them). Bandwidth is a bound (>40 GHz, gt, reference unspecified, measured-to left empty because the VNA limit is not stated); the unexplained 43.1-43.6 labels beside each trace in Fig. 7 are not entered. VpiL 2.52-2.68 V cm is left to the build step. ER about 25 dB, approx, static. Push-pull inferred (derived entries) from Fig. 3(a): one ridge in each gap. Gap 6.5 um and cladding 2.5 um are design values (design_target). Array-level fiber-to-fiber IL 15.19-16.55 dB (bare) and 20.19-21.55 dB (DFB bonded, about 5 dB added), 1 x 8 splitter uniformity 9.7 percent, simulated MMI 0.026 dB / cascade 0.084 dB are in notes only (no per-channel assignment possible).
- CSV hints: title/author list verified (13 authors); claims 3 dB BW > 40 GHz and 3.60-3.83 V verified.

## niels2025a
- Status: distilled. Rows: 1 paper, 1 device (1 cm micro-transfer-printed LN-on-SiN unbalanced push-pull MZM), 1 evidence block. repro_grade C, sim config none.
- Not reported: electrode widths, BOX thickness, substrate, electrode type (lumped vs traveling-wave), on-chip IL of the MZM, any 3 dB bandwidth, RF Vpi.
- Judgment calls: Vpi 3.2 V is MZM-level (push-pull; authors state 6.4 V for one phase modulator), measured at 100 Hz, 4 Vpp; VpiL 3.2 V cm is the authors' own equation Vpi x 1 cm (derived basis); simulated 3.2 V cm with overlap 0.42 in the evidence note. ER 31 dB with gt ("at least", Fig. 7(c) shows 31.1). Frequency response measured to 35 GHz (bw_measured_to 35, no bw3db): Fig. 8(b) falls to about -4.5 dB by 3 GHz and then sits near -6 to -7 dB, and the paper claims a "rather flat" response, so no 3 dB number is entered. Propagation loss 0.9 +- 0.8 dB/cm (approx) is from separate coupon cut-back structures, flagged in the evidence note; transition loss 1.8 +- 0.2 dB per facet in notes only. Platform lnoi_loaded_sin, integration micro_transfer_printed (same convention as vanackere2023).
- Overlap: same Ghent/imec micro-transfer-printing line and authors as tan2024 (ring on SOI) and the 2 mm MZM vanackere2023 (p3_02); distinct devices, no shared numbers. niels2025a cites Vpi 14.8 V for vanackere2023.
- CSV hints: source_type journal corrected to arxiv_preprint (v2 cached); authors (8) complete; hint numbers verified (0.9 dB/cm is 0.9 +- 0.8).

## tan2024
- Status: distilled. Rows: 1 paper, 1 device (TFLN-on-Si racetrack ring modulator), 1 evidence block. repro_grade C, sim config none (resonant ring).
- Not reported: Vpi voltage, electrode type, optical power, FSR, loaded vs intrinsic Q, energy per bit, wavelength in text.
- Judgment calls: IL about 1.5 dB entered as on-chip (normalized to an LN-covered straight waveguide; excludes grating couplers), approx. ER 37 dB is the best of 20-37 dB across resonances. Q about 1.118e4 in q_loaded (paper says "quality factor of the ring"; flagged). Tuning 3.89 pm/V = 0.00389 nm/V (sign negative in Fig. 6(c)); simulation 3.81 pm/V in notes. EO BW 16 GHz measured (Fig. 8(a), reference unspecified), photon-lifetime limited (8.4 ps, 17 GHz estimate). Data 45 Gbit/s NRZ PRBS7 at 2.6 Vpp (BER < 1e-6 to 36, < 1e-4 to 40 Gbit/s per text). VpiL 7 V cm is simulated (per hybrid phase shifter, vpi_convention per_arm_phase_shifter). Wavelength about 1566 nm read from Fig. 6 (extracted_from_figure). length_mm 0.8 is derived (two 400 um straights; f = 0.8946 matches the stated 0.894).
- CSV hints: verified; the "-1.5 dB / -37 dB" signs are formatting. Crossref lists an NB Photonics affiliation absent from the preprint header; not entered.

## wang2026b
- Status: distilled (packaging/system paper that nevertheless reports modulator metrics). Rows: 1 paper, 4 devices, 1 evidence block. repro_grade C, sim config none.
- Rows: AM unit (DC Vpi 2.2 V measured, VpiL 2.4 V cm authors' product, chip-level EO BW about 30 GHz, RF Vpi about 3.7 V at 50 GHz derived by the authors); comb PM (RF Vpi about 3.9 V at 50 GHz, author estimate); 2x8 switch (on-chip IL about 3 dB excluding about 5 dB per facet); AM 2 of the transmitter (OOK 5/10/20 Gbaud, oscilloscope-limited, entered as gt).
- Not reported: wavelength of the Vpi/bandwidth measurements, rib etch depth/width, gap, electrode widths, BOX, crystal cut, per-modulator IL/ER, packaged EO bandwidth value (only "similar roll-off"), drive voltage of AM 2.
- Judgment calls: Fig. 2(f) AM and Fig. 3(c) AM 3-1 treated as the same design because the 3.7 V RF Vpi uses the DC Vpi with that EO S21; stated in the row notes. Packaging metrics (13 HS + 32 LS channels, 94 percent bond yield, FC bond loss below 1 dB average DC-53 GHz, crosstalk below -22 dB, switch rise/fall 33/34 ps, optical crosstalk below -20 dB, comb flatness 2.8 dB) have no columns; kept in the paper notes and row notes. Switch row uses device_class other and il_onchip_db only.
- CSV hint mismatches: "bandwidth up to 50 GHz" is the packaging interface (EE S21/crosstalk to 53 GHz), not an EO modulator bandwidth; "20 Gbit/s" is scope-limited; "~3 dB" and "< -20 dB" belong to the 2x8 switch circuit. Platform and priority fine.

## Organizations added (8)
Identical copies of sibling-staged rows (so a later merge cannot conflict): East China Normal University (p3_03), Universite Libre de Bruxelles with accent (p3_02), City University of Hong Kong (p3_01), Fudan University (p3_06). New: Shanxi University (Taiyuan), Hefei National Laboratory (national_lab), Shanghai Research Center for Quantum Sciences (research_institute), Rhinopix Technology Limited (HK company). Existing in data/: Zhejiang University, Ghent University, imec. If those sibling batches are applied first, the duplicates must stay identical or be dropped here. Facilities named only in acknowledgements (Zhejiang University Micro and Nano Processing Platform; SJTU-Pinghu Institute of Intelligent Optoelectronics) are not added and not entered as foundry_or_fab.

## Blockers
None. Follow-ups: journal versions of chen2023a, tan2024, niels2025a not read (numbers may differ); supplementary documents of tan2024 and wang2026b not cached.

## Audit corrections (2026-10-03)
Q1 audit findings applied per AUDIT_DISPOSITIONS.md: chen2023a air row relabelled to its wSiO2 = 3.2 um geometry with the matched 1.92 / 2.22 V cm pair stated and P corrected to about 83 percent; hu2026a `bw_measured_to_ghz` about 47 GHz added on all eight rows with the Fig. 7 excursion note and array-level ER statement; tan2024 `il_onchip_excludes` filled and ER and BER-at-45 caveats added; niels2025a wavelength note. wang2026b unchanged. Deferred to the coordinator: `discovered_via` vocabulary, whether the chen2023a glycerol 1.92 V cm device becomes a row. Dry-run merge of p3_11, p3_12, p3_13 together after the corrections: 0 conflicts, 0 validation errors (16 papers, 36 device rows, 35 organizations, 14 evidence files).
