# p3_15 batch report (verified_on 2026-10-02)

Papers: hsu2024, hu2023, shen2021, huang2026a, yue2023, kawahara2025, sia2022. Dry-run merge: 0 conflicts, 0 validation errors (7 papers, 13 device rows, 20 new organizations, 6 evidence files). No sim configs (all silicon). `text.md` and `figures/` were present for all seven papers; no cache repair, no network, no git, nothing written outside this directory. `crossref.json` exists for hsu2024, hu2023, shen2021, kawahara2025; none for huang2026a, yue2023, sia2022 (arXiv-only).

## Version note (all numbers come from cached arXiv v1 preprints, not versions of record)
| Paper | Cached source | Version of record (not read) |
|---|---|---|
| hsu2024 | arXiv 2308.16255v1, 21 pp incl. SI | Nature Communications 15, 826 (Crossref issued 2024-01-27; CC BY 4.0 on the VoR) |
| hu2023 | arXiv 2111.05331v1, 15 pp, first-page title 'Beyond 300Gbps Silicon Microring Modulator with AI Acceleration' | Communications Engineering 2, 67 (issued 2023-09-23; CC BY 4.0) |
| shen2021 | arXiv 2104.01163v1, 5 pp, first-page title 'High-speed silicon microring modulator at 2-um waveband' | Photonics Research 10(3) A35 (issued 2022-02-10; no Crossref license) |
| huang2026a | arXiv 2609.36690v1, 56 pp (stamp 29 Sep 2026) | none located (no DOI) |
| yue2023 | arXiv 2312.14537v1, 19 pp | none located |
| kawahara2025 | arXiv 2506.04820v1, 10 pp | IEEE JSTQE 32(2) 1-11 (issued 2026-03; CC BY on the VoR) |
| sia2022 | arXiv 2210.06994v1, 9 pp | none located |

All rows: `license` and `published_on` empty, `redistribution = restricted_local_only`, `source_type = arxiv_preprint`, `access = arxiv`, `arxiv_id` versioned (v1), `discovered_via` as in the batch CSV (web_search;author_group_followup;continuation_2026_10_02).

## hsu2024
- Status: distilled. Rows: 1 paper, 2 devices (-a measured 8 um ITiO-gated MOSCAP ring; -b projected optimized outer-sidewall IHO ring, all simulated), evidence for both. repro_grade B, sim config none (silicon resonator).
- Confirmed from text: 117 pm/V (accumulation mode beyond -1.5 V; 87 pm/V in depletion mode), 0.8 Vpp (-1.5 to -2.3 V swing), 11 GHz bandwidth, 25 Gb/s at 53 fJ/bit (0.8 Vpp, no pre-emphasis); 35 Gb/s needs 1.75 Vpp plus pre-emphasis (not in the hint).
- Judgment calls: Vpi*L 0.12 V cm is a resonance-shift figure (`resonance_tuning_derived`, basis derived, formula and FSR not given so not re-derived); 3 dB BW 11 GHz referenced to the 500 MHz normalization point (`bw3db_reference = other`, 0.5 GHz), includes optical peaking, RC-limited by 500 fF; energy 53 fJ/bit = authors' CV^2/4 with 333 fF (checks to 53.3), capacitance 333 fF derived (500 fF minus slab parasitic); ER 6 dB is static from the transmission-vs-gate-voltage curve, not an eye ER; rib width 290 nm measured (design 300); IL 3 dB normalization not stated; row -b entirely simulated (Fig. 7), reference of the 52 GHz S21 not stated.
- Not reported: FSR, coupling gap, BOX and cladding thickness, on-chip power, fiber coupling loss, dynamic ER, temperature class.

## hu2023
- Status: distilled. Rows: 1 paper, 2 devices (-a -0.9 V / 1312 nm data point; -b the 'over 67 GHz' optical-peaking statement), evidence for both. repro_grade C, sim config none.
- Confirmed: 302 Gb/s back-to-back at 60 GBaud (BPL-DMT, Bi-GRU, BER under the 20% SD-FEC threshold 2e-2, SE about 5.20 bit/s/Hz), 300 Gb/s over 1 km SSMF, over 67 GHz at 32 GHz detuning.
- Judgment calls: Fig. 5(b) is the whole-link frequency response (42.5 GHz, text 'approximately', so `approx`); the over-67 GHz point has no figure in this preprint (deferred to the authors' ECOC 2020 paper), entered as bound `gt` with no measured-to value; Vpi*L 0.8 V cm 'remains as high as' with no bias or definition (`unspecified`); film thickness 220 derived from 150 nm etch + 70 nm slab (Fig. 1(b)); no net rate entered.
- Paper inconsistencies: Methods simulation uses ring radius 10 um versus the 8 um device; text 'etching a 220-nm width Si waveguide' (thickness read).
- CSV hints: title differs (preprint title vs journal title), 302 Gbps and 5.20 bit/s/Hz confirmed.
- Not reported: junction length, doping profile, Q, tuning efficiency, ER, IL, energy per bit, foundry.

## shen2021
- Status: distilled. Rows: 1 paper, 1 device (10 um L-shaped-junction ring at -2 V). repro_grade B, sim config none.
- Hint check (flagged): cached text says 15 GHz, 45 Gbps, '<1 V cm' (abstract) and 0.975 V cm, 52.5 pm/V (body); the journal-abstract values 18 GHz, 50 Gbps and 0.85 V cm are NOT in the cached text and were not used. Title differs from Crossref (preprint is shorter, no bistability analysis).
- Judgment calls: 3 dB BW 15 GHz with `gt` (text 'beyond 15 GHz'; Fig. 4(a) -2 V trace crosses about 15 to 16 GHz), reference `dc` (derived from the 0 GHz normalized plot); Vpi*L 0.975 derived (re-derived 0.974 = FSR 16.29 nm x 62.8 um / (2 x 52.5 pm/V), L = 2*pi*R); IL about 8 dB (`approx`, relation to 6 dB/facet coupling not stated); ER more than 15 dB static (`gt`); wavelength about 1960 nm.
- Not reported: Q, coupling gap, junction length, energy per bit, capacitance, bias for the 52.5 pm/V point.

## huang2026a
- Status: no_device_rows. Rows: 1 paper, 0 devices, no evidence file, repro_grade empty, sim config none.
- Reason: self-described review plus compact-model framework. Table I and the measured spectra, S11 fits and eyes reproduce other groups' rings (Yuan et al. Z-shaped two-segment ring, Xue et al. 256G lateral ring OFC 2025, Bu et al. 128G lateral ring OFC 2026, Xue et al. JLT 2025, and arXiv 2509.01555 = repo paper hu2026); the original content is calibrated model output (operating-point sweeps, self-heating and heater placement, PAM4 eyes and TDECQ-style penalties). Those numbers belong to the source papers and model outputs are not device characterizations. The Verilog-A translation is explicitly proposed and unverified (Fig. 15).
- CSV hints confirmed (above 200 Gb/s per lane, Verilog-A model; no numbers in the abstract). Author order differs from the CSV (Palermo last on the first page; paper order used).
- Follow-up: the cited primary papers above are candidate rows if they are not already in candidates.csv; if model-output rows are wanted, basis would be `simulated`.

## yue2023
- Status: distilled. Rows: 1 paper, 2 devices (-a 3 mm low-speed DDMZM from SMIC, 90 GBd OOK at EF 0.75; -b 1 mm high-speed DDMZM from Advanced Micro Foundry, 128 GBd OOK at EF 0.5), evidence for both. repro_grade C, sim config none.
- Relation to yue2025 (arXiv 2410.09816, Optica 2025; candidates.csv, no text.md cached, read from source.pdf only for this check): distinct paper. yue2025 reports a single-drive multi-region MZM with reversed-doping regions (tunable time-frequency equalization), 3 dB bandwidth over 110 GHz, 140 GBd OOK; yue2023 reports a dual-drive MZM with two drive amplitudes, no S21 measurement, 128 GBd limited by the test system. Same group (Tao Chu, Zhejiang University), later and different technique; yue2023 is not cited in the yue2025 text. Numbers kept separate.
- Judgment calls: ER values are dynamic eye ERs at the maximum open-eye baud rate (2.29 dB at 90 GBd; 1.89 dB at 128 GBd); IL excludes the grating couplers (4.1 / 3.8 dB each); `drive = dual_drive`; line rate = baud for OOK (derived); high-speed electrode dimensions taken from the low-speed device ('equivalent size'); the 60/20 GHz phase-shifter bandwidths in Figs. 2-3 are illustrative simulation assumptions and not entered.
- Not reported: Vpi, EO S21 or bandwidth, wavelength, doping levels, optical power.

## kawahara2025
- Status: distilled. Rows: 1 paper, 2 devices (-a nominal ng = 35 point with 64 Gbaud 0.78 pJ/bit; -b ng = 30 widest-bandwidth point), evidence for both. repro_grade C, sim config none (silicon).
- Confirmed: 0.78 pJ/bit at 64 Gbaud (50 mW), 0.66 mm^2. Caveats: 0.78 pJ/bit uses a receiver 5-tap FFE and excludes the laser (2.1 pJ/bit with laser and bias control); DSP-free best 1.0 pJ/bit.
- Judgment calls: bandwidths 50 and 55 GHz are labels on curves in Fig. 4(c) that extend beyond the 1 to 40 GHz measured sweep (basis `extracted_from_figure`, measured-to 40); wavelength 1537 nm is the reference wavelength of the stated ng spread (data-run laser wavelength not stated); energy 780 fJ/bit derived (50 mW / 64 Gb/s); ER 1.4 dB is the unprocessed 64 Gb/s eye at 50 mW; Z0 50 ohm simulated; laser 13 dBm is source output, not on-chip power; driver input amplitude 0.4 Vpp not entered as modulator drive.
- Not reported: Vpi, modulator-level swing, electrode and PCW dimensions (earlier Optica 2024 paper), doping, capacitance.

## sia2022
- Status: distilled (experimental linearity study, not design-only). Rows: 1 paper, 4 devices (reverse bias 1, 3, 5, 7 V), evidence for all. repro_grade C, sim config none.
- Confirmed: SFDR up to 95 dB Hz^(2/3) (at 5 V), bandwidth over 17.5 GHz (photodetector limit), Vpi*L 0.70 to 1.25 V cm (1 to 8 V).
- Judgment calls: one row per bias point; Vpi*L at 1 V (0.70) is the stated range end, at 3, 5, 7 V read from Fig. 4(d) (0.80, 0.93, 1.13, `approx`), 8 V endpoint 1.25 only in notes; bias entered negative (paper quotes magnitudes); 16.2 GHz is a real -3 dB crossing at 1 V, other rows are `gt` at 17.5 (5 and 7 V from the text statement, no spectrum shown); SFDR (75, 91, 95, 82) in notes only (no column); static ER 21.5 dB and FSR 7.7 nm are measured at 0 V and carried on the 1 V row with the note; Vpi*L convention `unspecified`, active length not stated; drive `single_ended` derived (only the racetrack shifter is driven).
- Not reported: IL, Vpi in volts, active length, energy, optical power, fabricator (CompoundTek affiliation of one author only).

## Organizations added (20; none exist in data/organizations.csv; Zhejiang University already exists and was reused)
Oregon State University; Baylor University; Intel Corporation; Fudan University; China Information and Communication Technologies Group Corporation; Peng Cheng Laboratory; Shanghai Jiao Tong University; Harbin Institute of Technology (Shenzhen); Advanced Micro Foundry; Hewlett Packard Enterprise; Texas A&M University; Semiconductor Manufacturing International Corporation (country entered from outside the paper); Yokohama National University; National Institute of Advanced Industrial Science and Technology; National Institute of Information and Communications Technology; IHP - Leibniz-Institut für innovative Mikroelektronik; Nanyang Technological University; University of Southampton; Hainan Normal University; CompoundTek Pte. Names, types, countries and regions match entries of the same organizations staged in other batches (Fudan, SJTU, AMF, NTU, CICT, Peng Cheng, AIST, IHP, CompoundTek): the coordinator should dedupe at merge (notes differ).

## Blockers
None. Follow-ups: version-of-record checks could change numbers for hsu2024, hu2023, shen2021 (journal abstract values differ) and kawahara2025; hu2023's over-67 GHz point depends on an uncached earlier ECOC paper; kawahara2025 geometry is in the authors' Optica 2024 paper.

## Audit corrections (2026-10-03)
Q1 audit (claude-ingest-2026-10-03) findings are resolved in `AUDIT_DISPOSITIONS.md` (8 applied, 5 applied-adjusted, 1 deferred, 2 confirmation-only). This section supersedes the earlier judgment-call text where they differ.
- hu2023: `vpil_dc_vcm` 0.8 basis `author_estimate` with `approx`, not tied to the -0.9 V point; hu2023-b 67 GHz basis `author_estimate` (optical, no data shown); `drive_vpp_v` 0.6 basis `derived`.
- kawahara2025: 50 and 55 GHz bandwidths are co-simulated-curve crossings beyond the 1-40 GHz sweep (basis `simulated`, at PDC 260 mW with peaking ON, not the 50 mW / 0.78 pJ/bit point); `wavelength_nm` basis `derived`; energy 780 fJ/bit entry `derived` without the 781.25 block; `bw3db_reference` 1ghz (derived).
- yue2023-b electrode gap and width basis `derived`; sia2022-c/-d bound basis `author_estimate`; shen2021-a IL definition reworded; huang2026a note corrected (Z-shaped ring is the authors' own earlier device; sim-only rule addressed).
- Added `derived` or `design_target` evidence entries for `drive`, `vpi_convention` and `bw3db_reference` cells that had none.
- No organization row edited; IHP, CompoundTek, SMIC/AMF and the cross-batch duplicates are listed for the coordinator in `AUDIT_DISPOSITIONS.md` (F19).
- Dry-run merge of p3_14 with p3_15: 0 conflicts, 0 validation errors.
