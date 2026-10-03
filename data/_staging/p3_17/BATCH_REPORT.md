# p3_17 batch report (verified_on 2026-10-02)

Papers: giambra2021, tiberi2025, heidari2022, navarro2026, gui2022, lotkov2024. Dry-run merge: `merge counts: papers 6, devices 17, orgs 22, evidence 6; conflicts: 0; validation errors: 0` (also 0/0 when merged together with p3_15 and p3_16). No sim configs (graphene, ITO and carrier-effect devices; none is a dielectric traveling-wave device). Engine not run. Cache: `text.md`, `figures/`, `source.pdf`, `source.json` present for all six; nothing in `references/` was modified. No `needs_download.md`.

## Version note (all numbers come from arXiv preprints, not versions of record)
| Paper | Numbers come from | Other version |
|---|---|---|
| giambra2021 | arXiv 2012.05816v2 (17 pp); page-1 footer is the ACS Nano typeset article (received 2020-11-20, accepted 2021-01-21) with a CC-BY notice | ACS Nano 15(2) 3171-3187, issued 2021-02-01, Crossref CC-BY-4.0 (vor); text appears identical in form, not compared line by line |
| tiberi2025 | arXiv 2506.03281v1 (21 pp, 3 Jun 2025); no DOI, no Crossref | none found (batch notes an OFC 2026 paper Th2A.12, not read) |
| heidari2022 | arXiv 2109.07476v2 (5 pp) | Nanophotonics 11(17) 4011-4016, issued 2022-03-17, Crossref CC-BY-4.0 (vor): not read |
| navarro2026 | arXiv 2605.00112v1 (29 pp, 30 Apr 2026); no DOI | none found |
| gui2022 | arXiv 2112.10926v2 (14 pp incl. SI) | Nanophotonics 11(17) 4001-4009, issued 2022-04-08, Crossref CC-BY-4.0 (vor): not read |
| lotkov2024 | arXiv 2412.19306v2 (6 pp); no DOI | none found |

`license`, `redistribution` and `published_on` are filled for giambra2021 only (CC-BY-4.0, open_license_ok, 2021-02-01; audit F7); the other five keep `license` and `published_on` empty and `redistribution = restricted_local_only`; `arxiv_id` carries the versioned id; `url` is the versioned arXiv PDF; journal DOIs kept where the batch CSV had them. The coordinator may upgrade heidari2022 and gui2022 after checking the version of record.

## giambra2021
- Status: distilled. Rows: 1 paper, 4 devices (30, 60, 90, 120 um DSLG EAMs on a 260 nm Si3N4 / 1500 nm wide platform), 1 evidence file. repro_grade B. Sim config none.
- Reported: modulation efficiency about 0.25, 0.45, 0.75, 1 dB/V (abstract, Fig. 7(a); no column, in notes); 3 dB EO bandwidth about 11.5, 6.5, 7.0, 4 GHz (Fig. 7(b)); data rate up to 20 Gbps (eye diagrams at 10, 15, 20 Gbps; Fig. 7(c)); wafer-scale material metrics (mobility about 5000 cm2/Vs, contact resistance about 500 Ohm um, about 80% coverage, uniformity +/-10% over 30 devices).
- Not reported: IL and ER of the devices, drive swing, energy per bit, capacitance, optical power, device temperature, fab of the Si3N4 wafer, which device(s) the eye diagrams belong to (so no line rate entered on any row).
- Judgment calls: bandwidth for 30 and 60 um from the text (about 11.5 and 6.5 GHz; `measured`, approx); for 90 and 120 um read from Fig. 7(b) (7.0 and 4.0 GHz, `extracted_from_figure`). The p.11 text lists 11.5, 6.5, 7.4 GHz for 30, 60, 120 um, which contradicts Fig. 7(b) (120 um about 4 GHz) and the intro (p.2: about 4 GHz for 120 um, about 12 GHz for 30 um); figure plus intro used. Wavelength 1550 nm is the design wavelength (basis `design_target`). `integration = other` (semi-dry transfer of CVD graphene). `bw3db_reference = unspecified`.
- CSV hints: confirmed (20 Gbps, about 5000 cm2/Vs, about 80% coverage). Platform 'other' is Si3N4 (`waveguide_platform = sin`).

## tiberi2025
- Status: distilled. Rows: 1 paper, 3 devices, 1 evidence file. repro_grade B. Sim config none.
- Measured vs projected check: static transmission (Fig. 8), S21 (Fig. 9(b)) and eye diagrams (Fig. 9(c), Table IV) are measured. Energy per bit 58 and 26 fJ/bit is the authors' CVpp^2/4 figure with C and Vpp not stated, entered `derived`. The EO-BW of 70 to 90 GHz (Fig. 2(e), p.16) is simulated and not entered. The 17 GHz and 20 Gbit/s of the 20 nm device exist only in Table I / intro text with no trace: entered with basis author_estimate (audit F2).
- Rows: a = 40 um, 40 nm Al2O3 gate, C-band (f3dB 67 GHz, NRZ 80 Gbit/s at Vpp about 7 V, IL about 0.9 dB, static ER 4 dB, 58 fJ/bit); b = 20 um, 20 nm gate (0.037 dB/V/um, IL about 1.1 dB, ER about 3 dB, 26 fJ/bit, 17 GHz and 20 Gbit/s from Table I); c = 40 um O-band (400 nm Si width, 32 and 40 Gbit/s).
- Not reported: the O-band device's dielectric, IL, ER, bandwidth, wavelength; capacitance and Vpp behind the energy figures; fab of the wafer (process cited to Ref. [103], whose entry carries a CORNERSTONE URL; `foundry_or_fab` left empty because the text does not name it).
- Judgment calls: `bw3db_ghz = 67` with `bw_measured_to_ghz = 67` (the 3 dB point is extrapolated from -55.5 to -58.5 dB on an envelope fit, RF probe and bias tee rated 67 GHz; basis derived with `approx` after audit F3); reference left `unspecified` (plateau, not DC). Static ER for row a is 4 dB (Table I, Fig. 8(d)) vs about 4.5 dB in the p.12 text; IL 0.9 dB (Table I, Fig. 8(b), conclusion) vs the p.12 text "-0.1 dB". Dynamic ER 1.2 dB (Table IV) kept in notes. `waveguide_platform = soi_rib` for a fully etched 450 nm channel waveguide (closest enum).
- CSV hints: numbers confirmed; 0.037 dB/V/um belongs to the 20 nm device, 67 GHz, 80 Gbit/s and 58 fJ/bit to the 40 nm device.

## heidari2022
- Status: distilled. Rows: 1 paper, 1 device (DSLG EAM in a vertical DBR cavity with a-Si waveguide on InP-substrate DBR). repro_grade C. Sim config none.
- Measured vs projected check: S21 bandwidth about 60 GHz and transmission versus voltage (Fig. 3) are measured. IL 0.7 dB is a simulation; modulation depth above 4 dB/um is a simulation (FIMMWAVE); C = 27 fF, R about 100 Ohm and the 0.57 V swing are assumed; 2.25 fJ/bit = 0.25 C V^2 (the stated inputs give about 2.19 fJ/bit), entered `derived`.
- Not reported: active length (only footprint about 6 um2), measured IL, ER, Vpi, drive amplitude, fab. Modulation depth 5.2 dB/V (no column) in notes. The 40x lower voltage claim is relative to a reference design and not entered.
- Inconsistencies: DBR counts (text 33 pairs and 20 layers vs Fig. 1(d) 16.5 and 10 pairs); 0.7 dB IL vs about -3 dB ON-state transmission in Fig. 3(a).
- Judgment calls: `bw3db_ghz = 60` approx; "optical 3 dB (electrical 6 dB)" and normalized response, reference `unspecified`; no `bw_measured_to_ghz` (the trace shows the roll-off). `waveguide_platform = other`.
- CSV hints: confirmed; 'Silicon photonics platform' in the abstract is loose (PECVD a-Si on a Nb2O5/SiO2 DBR over InP).

## navarro2026
- Status: distilled (theory only). Rows: 1 paper, 6 devices (HfO2 and Al2O3 spacers x 300 K / 10 K x single-arm / push-pull, Table 1 p.15), 1 evidence file. repro_grade B. Sim config none.
- All values `simulated`: VpiL 0.0887, 0.0704, 0.0704, 0.1348, 0.1004, 0.1004 V cm; IL 0.84, 0.55, 0.28, 2.3, 0.94, 0.47 dB; L 143, 96, 48, 383, 164, 82 um; RC speed 6.5 (HfO2) and 15.2 GHz (Al2O3), identical at 300 K and 10 K because mobility is held at 10000 cm2/Vs.
- Not reported: Vpi alone, capacitance, resistance, energy per bit (formula only), phase-shifter drive amplitude (11 V window limit only).
- Inconsistency: the conclusion (p.19) pairs L = 82 um with HfO2 and 48 um with Al2O3 (VpiL 0.10 and 0.07 V cm), reversed relative to Table 1 and the Fig. 4 caption; Table 1 used. Abstract 'IL below 0.3 dB and below 50 um at 10 K' matches only the HfO2 push-pull row.
- Judgment calls: `device_class = phase_shifter` (title; Table 1 'Phase MZM'); `vpi_convention = mzm_single_arm` / `mzm_push_pull` and `drive` from the Table 1 SA/PP labels; bandwidth `bw3db_reference = dc` (first-order RC model); `temperature_class` cryogenic for 10 K rows. IL is defined as MPA x L (p.5-6); stated in the evidence note, `il_onchip_includes` left empty.
- CSV hints: confirmed.

## gui2022
- Status: distilled; the flagged question is answered: the result is SIMULATED, not measured. Evidence: FEM eigenmode analysis, COMSOL RC extraction (62 fF, 25 Ohm), 3D FDTD, an RC formula for speed; Table I marks ER, IL, speed and energy as calculated; the only measurement is ellipsometry of the ITO film (Fig. 2(a)). Rows: 1 paper, 2 devices (a: 4.7 um headline design; b: 9.1 um 91:9 maximum-ER design). repro_grade B. Sim config none.
- Row a (all simulated): VpiL 108 V um (0.0108 V cm; abstract rounds to 0.1 V mm), ER 3 dB, IL 2.9 dB, 102 GHz, 380 fJ/bit, 62 fF, phase shift 0.33 pi at +/-3.5 V. Row b: 53 dB ER, 10 dB IL, 71 GHz, 9.1 um.
- Inconsistencies: speed 100 (Table I), 102 (Fig. 4 caption; equals 1/(2 pi 25 Ohm 62 fF)) and 108 GHz (p.7 text, conclusion); 102 entered. Energy printed as 380 pJ on p.6 vs 380 fJ/bit elsewhere; 380 fJ equals 0.5 C V^2 with 62 fF and 3.5 V (own check in `derived`).
- Judgment calls: `eo_material = other` (ITO; no enum value), `integration = monolithic` (paper title), `electrode_type = plasmonic_lumped`, `vpi_convention = per_arm_phase_shifter` and `drive = single_ended` inferred (evidence basis `derived`, authors do not state them; gui2022-b evidence entry added in audit F10), `waveguide_platform = soi_rib` for a 500 x 220 nm Si channel waveguide. The SI photonic-mode (doped-Si contact) variant has only a transmission difference of 19% and an anticipated 108 GHz; not entered.
- CSV hints: confirmed ('treat as design study').

## lotkov2024
- Status: distilled. Rows: 1 paper, 1 device (9.3 um TM hybrid plasmonic ITO EAM on 300 nm Si3N4). repro_grade B. Sim config none.
- Measured: IL 5.7 dB (abstract, conclusion; at -7 V), static ER 1.5 dB at +/-12 V (0.85 dB at +/-7 V in notes), plasmonic propagation loss 0.64 dB/um (entered as 6400 dB/cm), 3 dB bandwidth 1.05 GHz and 6 dB 2.3 GHz (S21 fit), capacitance 400 fF. Simulated, not entered as measured: ER 3.7 and 1.9 dB, IL 9.4 dB, electrical bandwidth 1.36 GHz, beyond 260 GHz expectation.
- Not reported: Ti/Al thicknesses, optical input power, Vpi, any data-rate demonstration, drive beyond DC.
- Judgment call (flag): p.3 text says "6.3 dB (on-chip IL = 14.6 dB)" for the same device; 14.6 dB matches the 9.3 um point of the cutback fit (Fig. 3(b)), so it likely includes fiber facets (3.5 dB each) and passive waveguide; the abstract and conclusion value 5.7 dB entered, with the scope of 5.7, 6.3 and 14.6 dB documented as not defined by the authors (audit F4).
- Fabrication facility: BMSTU Nanofabrication Facility (acknowledgements) entered as `foundry_or_fab`.
- CSV hints: confirmed; the hint omits the 6.3 and 14.6 dB statements.

## Organizations added (22)
National Inter-University Consortium for Telecommunications (IT, consortium; paper writes CNIT, expansion from outside the paper); INPHOTEC (IT, type other, name as written); Istituto Italiano di Tecnologia; Istituto Nanoscienze, Consiglio Nazionale delle Ricerche; Scuola Normale Superiore; Scuola Superiore Sant'Anna; University of Cambridge; CamGraPhIC srl; AIXTRON Ltd; University of Southampton (also staged by p3_15 and p3_16, identical type/country/region); University of Texas at Austin; George Washington University; Johns Hopkins University; University of Campinas (also staged by p3_15 and p3_16, identical); Brazilian Center for Research in Energy and Materials; Brazilian Nanotechnology National Laboratory; Federal University of Mato Grosso; Bauman Moscow State Technical University; Dukhov Automatics Research Institute; Institute for Theoretical and Applied Electromagnetics of the Russian Academy of Sciences; Lomonosov Moscow State University; Bauman Moscow State Technical University Nanofabrication Facility (facility).

## Could not read / not verified
- Journal versions of giambra2021, heidari2022 and gui2022 were not read (no network, not cached); numbers may differ from the versions of record.
- tiberi2025 20 nm device: f3dB 17 GHz and 20 Gbit/s have no trace or description in the cached text.
- gui2022 SI Section i-iii read; the Y-junction layout and electrode layout are not in the text (repro_grade B).

## Blockers
None. Follow-ups: version-of-record check for giambra2021, heidari2022, gui2022; locate the CORNERSTONE identification of tiberi2025 from Ref. [103] if a fab entry is wanted; check lotkov2024 for a published version.

## Audit corrections (2026-10-03)
Applied against `data/_staging/audits/p3_16-p3_19-q1-claude-ingest-2026-10-03.md`; per-finding dispositions in `AUDIT_DISPOSITIONS.md`. Each finding was re-checked against the cached text and page renders before applying.
- F7: giambra2021 `license` CC-BY-4.0, `redistribution` open_license_ok, `published_on` 2021-02-01, `source_type` journal, venue ACS Nano 15(2) 3171-3187 (2021), from the page-1 CC-BY notice and `crossref.json` (vor, CC-BY-4.0); `url` and `arxiv_id` stay the cached arXiv v2 file; the notes say the cached text is the ACS Nano typeset article and that a line-by-line comparison with the final issue was not made.
- F2: tiberi2025-b Table-I-only cells (bw3db 17 GHz, 20 GBd, 20 Gbit/s) now basis author_estimate (were measured); energy 26 fJ/bit stays derived.
- F3: tiberi2025-a `bw_basis` derived, `bw3db_ghz:approx` added; Fig. 9(b) re-read at 3x: envelope fit meets the -58.5 dB line near 66 GHz and the trace ends near 67 GHz, so the audit's 60-62 GHz crossing was not reproduced; `bw_measured_to_ghz` 67 stays (probe rating).
- F4: lotkov2024-a keeps 5.7 dB; includes/excludes now say the scope is not defined by the authors and that the paper calls 14.6 dB the on-chip IL.
- F10: `drive` emptied on the nine EAM rows; derived evidence entries added for gui2022-b and navarro2026-a..f.
- F19, F21, F22: note additions (giambra2021-c 7.4 GHz, tiberi2025-a energy and dielectric wording, heidari2022 dB scale and static transmission).
- F9 (UT Austin duplicate across p3_17/p3_19): not renamed here, listed for the coordinator.
- Dry-run merge of p3_16 + p3_17 + p3_18 + p3_19 after the corrections: `merge counts: papers 19, devices 52, orgs 52, evidence 19; conflicts: 0; validation errors: 0`.
