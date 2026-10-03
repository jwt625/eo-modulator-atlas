# p3_16 batch report (verified_on 2026-10-02)

Papers: wu2023, luan2026, luan2026a, lee2020, lee2020a. Dry-run merge: `merge counts: papers 5, devices 13, orgs 7, evidence 5; conflicts: 0; validation errors: 0`. No sim configs (graphene EAMs/rings, not dielectric traveling-wave). `text.md`, `figures/`, `source.pdf`, `source.json` present for all five; nothing in `references/` was modified or regenerated. `crossref.json` exists only for luan2026 and lee2020.

## Version note (all numbers are from arXiv v1 preprints, not the version of record)
| Paper | Numbers come from | Other version |
|---|---|---|
| wu2023 | arXiv 2304.02646v1 (13 pp, 28 Mar 2023) | none identified (page headers show Wiley-VCH typesetting but no journal/DOI); batch hint "check for journal version" unresolved offline |
| luan2026 | arXiv 2604.08472v1 (9 pp, 9 Apr 2026, no Supplementary) | Laser & Photonics Reviews e71349, issued 2026-05-27, CC-BY-NC-ND-4.0 vor (Crossref): not read, may differ |
| luan2026a | arXiv 2604.03153v1 (8 pp, 3 Apr 2026) | none identified |
| lee2020 | arXiv 2007.00955v1 (21 pp incl. SI, 2 Jul 2020) | Nanophotonics 10(1) 99-104, issued 2020-09-25, CC-BY-4.0 (Crossref): not read |
| lee2020a | arXiv 2011.08832v1 (21 pp incl. SI, 12 Nov 2020) | none identified |

`license` and `published_on` empty for all five; `redistribution = restricted_local_only`; `arxiv_id` versioned; `url` = versioned arXiv PDF; DOI kept for luan2026 and lee2020; `source_type = arxiv_preprint`; `discovered_via` as in the batch CSV; `repro_grade` B for all (no sim config).

## Identity checks
- Luan DOI: Crossref 10.1002/lpor.71349 resolves to luan2026 (title "High-Efficiency Graphene-Silicon Slot-Waveguide Microring Modulator at 1.5 and 2 um Wavelength Bands", the same five authors; Wiley, e71349, issued 2026-05-27). luan2026a (4 authors, non-resonant EAM, 2604.03153) has no DOI and is a distinct paper. Confirmed: luan2026 = ring, luan2026a = EAM. Crossref department name differs from the arXiv text (Electrical and Photonics Engineering vs Photonics Engineering); Chao Luan's current address is MIT RLE (MIT added to universities).
- lee2020: Crossref publisher "Wiley" for a 10.1515 DOI (title and eight authors match; odd, not resolved offline).
- Author lists completed from the paper text (batch CSV truncated them for wu2023, lee2020, lee2020a).

## Per paper
### wu2023
- Status: distilled. Rows: 1 paper, 4 devices (wafer D, 25/50/75/100 um graphene-oxide-silicon EAMs from a 300 mm CMOS pilot line; imec as fab is not stated by the paper, see Audit corrections), 1 evidence block. repro_grade B.
- Reported (Table 2, Table 3, Fig. 4-5): IL 2.1/4.4/6.8/8.8 dB, ER 1.2/2.5/3.7/5.0 dB at 6 Vpp, 1550 nm, EO BW 15.1/14.1/12.6/11.2 GHz (1 V bias), C_gos 26.7/62.1/102.8/139.2 fF; modulation depth 50 +- 4 dB/mm, yield above 95%. CSV hints (50 +- 4 dB/mm over 400 devices, 15.1 +- 1.8 GHz) confirmed.
- Not reported: capping Al2O3 thickness, Si doping levels and type, temperature, optical power, contact/metal dimensions, V_pi (not applicable).
- Judgment calls: one row per length (convention d); Table values are means +- std (text gives medians); IL/ER from Table 2 (wafer D row, 400 devices); `bw3db_reference = unspecified`; `bw_measured_to_ghz` left empty (3 dB crossing observed within 30 GHz); wafers A-C not entered; `integration = foundry_native`; rib width 500 nm is nominal (`design_target`); `prop_loss_db_per_cm` not used (normalized IL 87 dB/mm is in notes).
### luan2026
- Status: distilled. Rows: 1 paper, 3 devices (-a 1.5 um ring, -b 2 um ring, -c 10-device statistics), 1 evidence block. repro_grade B.
- Reported: V_pi L 220 V um (22 V for 10 um, entered V*cm 0.022), BW over 70 GHz (VNA-limited), ER 9.21 dB, IL 1.41 dB, Q 3226, 50 Gbit/s eye at 2 Vpp, 10.5 fJ/bit, OMA -1.97 dBm; 2 um: BW over 20 GHz (15 GHz photodetector), 0.46 pi phase, OMA -3.36 dBm, 20 Gbit/s eye; statistics: mean ER 26.4 dB, IL 5.2 dB, BW above 40 GHz.
- Not reported: FSR, numeric ring operating point of ER/IL, IL definition, optical power, fabrication facility, Supplementary content (cavity/graphene capacitance, fabrication data).
- Judgment calls: `vpi_convention = resonance_tuning_derived` (method not stated); wavelength 1549.023 nm = BW measurement wavelength (abstract says 1550); band `other` for 2 um; row -c for the statistics because IL/ER differ strongly from -a; ER type unspecified.
- Paper inconsistencies: 10.5 fJ/bit (CV^2/4 at 2 Vpp implies about 10.5 fF) vs capacitance about 2.5 fF (both entered as stated); coupling length 5 um (text, Fig. 5) vs 10 um (Fig. 3 caption); statistics "10 devices" vs 9 bars in Fig. 5.
- CSV hints confirmed (V_pi L, 70 GHz, 50 Gbit/s); the "arXiv version assumed same work" for the journal DOI holds on identity, numbers unverified.
### luan2026a
- Status: distilled. Rows: 1 paper, 2 devices (-a Device A 2 um band, 6 um graphene; -b Device B 1.55 um band), 1 evidence block. repro_grade B.
- Reported: BW over 40 GHz at 2 um (setup limited) and over 70 GHz at 1.55 um (VNA limited), modulation efficiency 0.22 and 0.2 dB/um (notes), IL 0.6 dB (2 um), 25 Gbit/s (2 um) and 50 Gbit/s (1.55 um) NRZ eyes, calculated BW up to 150 GHz (simulation, notes). Batch CSV said no numbers: wrong (numbers extracted).
- Not reported: ER for a stated length, insertion loss for Device B, device-specific lengths (6 um is the stated compact footprint), capacitance value, wavelength for Device B, per-device drive amplitude for the 25 Gbit/s eye.
- Judgment calls: ~10 fJ/bit (CV^2/4) is stated once for "this configuration"; left out of columns (ambiguous device), in notes; 2 um BW entered 40 GHz bound per text, not 22 GHz in the Fig. 3 caption; dielectric thickness 50 nm (design) vs 35 nm (Methods) noted; stack recorded with 35 nm (Methods).
### lee2020
- Status: distilled. Rows: 1 paper, 2 devices (-a 4.9 K, -b 293 K, same graphene-SiN ring), 1 evidence block. repro_grade B.
- Reported: 3 dB BW 14.7 GHz (4.9 K) and 12.6 GHz (293 K) from single-pole fits (normalized at 1 MHz), Vpp 3 V, -9 V bias, ER over 7 dB over 9 V (293 K), Q_L about 3500 to 3700, capacitance about 9 fF, 5 um capacitor, eye diagrams 5 to 20 Gb/s at 293 K (BER 7.4e-4 at 20 Gb/s), intrinsic RC BW 200 GHz at 4.9 K (notes), mobility 1420 to 1650 cm2/Vs.
- Not reported: IL or ER at 4.9 K, resonance wavelength at 4.9 K, FSR, on-chip optical power for the S21 run, eye diagrams at 4.9 K.
- Judgment calls: `device_class = ring` (batch hint eam); Q 3700 entered with approx; ER entered 7 with `gt`; wavelength 1586.2 nm only on the 293 K row; `band = l_band` there.
- CSV hints confirmed (14.7 GHz at 4.9 K, 12.6 GHz at room temperature, 200 GHz intrinsic).
### lee2020a
- Status: distilled. Rows: 1 paper, 2 devices (-a fabricated 100 um EAM, 32-device statistics; -b simulated optimized HfO2 design), 1 evidence block. repro_grade B.
- Reported: mean 3 dB BW 3.92 GHz, dV3dB 4.50 V (notes), 7 Gbit/s NRZ at Vpp 6 V, 94% yield (30 of 32), aggregate 210 Gbit/s, ER 5 dB with IL 7 dB, 1.6 pJ/bit (CV^2/4, entered 1600 fJ/bit derived), C about 180 fF; simulated design 15 dB ER with 1 dB IL (HfO2 45 nm gate), more than 80% simulated yield at up to 20 Gbit/s.
- Not reported: operating wavelength (empty), IL definition, length of the optimized design, extinction ratio statistics across devices.
- Judgment calls: simulated design as its own row with basis `simulated` (tag `simulated_design`); ER/IL of the current device taken from the author statement (model curve in close agreement with data, p.7), basis measured with note; platform is Si3N4 (batch abstract did not say).
- Paper inconsistency: top Al2O3 30 nm (text) vs 40 nm label in Fig. 5(b).

## Organizations added (7)
Columbia University; University of Campinas (BR, region other); Technical University of Denmark; Massachusetts Institute of Technology (identical to an entry staged elsewhere); Graphenea Semiconductor SLU (ES); City University of New York Advanced Science Research Center NanoFabrication Facility (facility, US); Columbia Nano Initiative (facility, US). Columbia University is also staged by p1_02/p3_13 with identical type/country/region. Ghent University and imec already exist in `data/organizations.csv`.

## Blockers
None. Follow-ups: Laser & Photonics Reviews and Nanophotonics versions of record (luan2026, lee2020) not read; luan2026 Supplementary Information (capacitance, fabrication) not cached; wu2023 journal version unresolved.

## Audit corrections (2026-10-03)
Applied against `data/_staging/audits/p3_16-p3_19-q1-claude-ingest-2026-10-03.md`; per-finding dispositions in `AUDIT_DISPOSITIONS.md`. Each finding was re-checked against the cached text and page renders before applying.
- F6: `bw_basis` = derived for lee2020-a, lee2020-b, lee2020a-a (3 dB point of a single-pole fit); Fig. 3 re-read: at 4.9 K the raw trace crosses -3 dB near 12-13 GHz (approximate), at 293 K data and fit agree at 12.6 GHz.
- F11: wu2023 `foundry_or_fab` emptied and `process_name` no longer names imec (fab not stated by the paper).
- F14: `il_basis` cleared on luan2026-b and luan2026a-b (no IL value); lee2020a-b geometry evidence basis set to design_target. (soma2025 part is in p3_19.)
- F15: `wavelength_nm:approx` added on lee2020-b.
- F18, F20, F24: row-note and evidence-note wording (wu2023 device counts, wafer C range, IL wavelength; lee2020a-a static-sweep context for ER/IL; luan2026 locator and "2-V" wording). The optional wu2023 `published_on` (arXiv stamp) was not applied.
- Dry-run merge of p3_16 + p3_17 + p3_18 + p3_19 after the corrections: `merge counts: papers 19, devices 52, orgs 52, evidence 19; conflicts: 0; validation errors: 0`.
