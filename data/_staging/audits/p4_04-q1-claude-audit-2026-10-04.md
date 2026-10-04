---
auditor: fresh-context subagent
task: Q1 audit of staged batch p4_04
date: 2026-10-04
scope: data/_staging/p4_04 (papers.csv, devices.csv, organizations.csv, evidence/wang2024a.yaml, evidence/wang2024b.yaml, evidence/wang2025.yaml, SPEC_PROPOSALS.md); sims/wang2024a/config.yaml; sims/wang2025/config.yaml
mode: read-only (only this file written; no edits, no git, no network)
verdict: no blocking defect; wang2024b pass; wang2024a and wang2025 pass after corrections
findings: {blocking: 0, numerical: 1, metadata: 2, minor: 6}
---

# Q1 audit (fresh context): p4_04 (wang2024a, wang2024b, wang2025)

## Method and limits

- Read the rules first: `.claude/skills/eo-modulator-distill/SKILL.md`, conventions (a)-(k) and the column definitions in `data/schema/devices.schema.yaml`, `data/_staging/BATCH_INSTRUCTIONS.md`, and `sims/SPEC.md` (config contract, target semantics). I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- Dumped every populated cell of the 5 staged device rows, the 3 papers.csv rows, the 1 staged org and all 3 evidence files.
- Read `references/<id>/text.md` in full for wang2024a (7 pages) and wang2025 (5 text pages). For wang2024b I read pp.1-5 (abstract, platform, Electro-optical modulation), Methods pp.8-9, and the Extended Data captions pp.11-15. Checked `crossref.json` and `source.json` for all three.
- Opened these renders and images. All figure readings are mine and approximate.
  - wang2024a: p.2 (Fig. 1, plus the embedded cross-section SEM img_p02_6 and top-view SEM img_p02_1), p.3 (Fig. 2, with Fig. 2(c) zoomed), p.5 (Fig. 3).
  - wang2024b: p.4 (Fig. 3, with Fig. 3(f) zoomed twice); Extended Data Table 1 (img_p15_1).
  - wang2025: p.2 (Fig. 1(a) and 1(c) zoomed), p.4 (Fig. 3(f)-(h), Fig. 4(a) inset and Fig. 4(c) zoomed).
- Mechanical check (throwaway scratchpad script) on all 5 rows:
  - Every non-empty evidence-required cell has an evidence entry with an equal value: 0 missing, 0 mismatches.
  - No evidence entry exists for an empty cell, and there are no duplicate (device_id, field) entries.
  - Every qualifier sits on a populated field, with op in lt|gt|approx.
  - Every evidence unit equals the schema unit, and every basis is in the enum.
  - All enum cells are valid. No evidence note exceeds 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p4_04` (dry run) output: `merge counts: {'papers': 3, 'devices': 5, 'orgs': 1, 'evidence': 3}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- Sim configs: I did not run the engine. I checked geometry arithmetic, provenance classes, targets, the LT constants against wang2024b Extended Data Table 1, and the `missing` lists. I grepped the engine for `crystal.rotation_deg` and the `lithium_tantalate` library entry to fact-check SPEC_PROPOSALS.
- I read `BATCH_REPORT.md` only after finishing the above.
- Limits:
  - The Optica version of record of wang2024a was not read; it is not cached, and the cache holds arXiv v2.
  - The supplementary material of wang2024b and wang2025 is not cached.
  - wang2024b pp.6-7 (solitons, discussion) were skimmed only; they hold no modulator numbers.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| wang2024a | 1 | pass after corrections | F1 (numerical), F7 (minor), F9 (metadata) |
| wang2024b | 3 | pass | F2, F8 (minor) |
| wang2025 | 1 | pass after corrections | F3, F4, F6, F7 (minor), F5 (metadata) |

Bandwidth choices the coordinator asked about:
- **wang2024b, 41 GHz approx, from the figure:** I agree with the choice. The trace does cross -3 dB inside the plotted range, so convention (c) for a bandwidth with no crossing (`gt`) does not apply. A bare `40:gt` would misstate a crossing that the data show. The note needs one addition (F2).
- **wang2025, 55 GHz approx, the authors' wording:** I agree with keeping the authors' point value with `approx` and basis measured. The existing note already gives the earlier -3 dB touch; F3 refines it.
- **wang2024a, 110 GHz approx (consistency check):** wang2024a needs the same treatment as wang2025 but did not get it. Its note hides an earlier -3 dB touch of about 20 GHz (F1).

## Findings

### Numerical

**F1 (numerical). wang2024a-a `bw3db_ghz` 110 approx: the measured trace first falls below -3 dB near 90 GHz; the note says only "trace ends near -3.3 dB".**
- Cells:
  - `data/_staging/p4_04/devices.csv` wang2024a-a: `bw3db_ghz` 110, `bw_basis` measured, qualifier `bw3db_ghz:approx`.
  - `evidence/wang2024a.yaml` `bw3db_ghz` note: "authors: roll-off around 3 dB from 10 MHz to 110 GHz; trace ends near -3.3 dB".
  - `sims/wang2024a/config.yaml` bw3db target note: "claimed crossing at the 110 GHz measurement limit".
- Source:
  - p.2: "measured electro-optic 3 dB bandwidth of approximately 110 GHz".
  - Fig. 2 caption: "a high 3-dB bandwidth at around 110 GHz. The simulated EO response is calculated from the electro-electro measurement".
  - p.4: "roll-off around 3 dB from 10 MHz to 110 GHz".
- My reading of Fig. 2(c) (p.3 render, zoomed; approximate). The measured (blue) trace:
  - first dips below -3 dB near 89-90 GHz (about -3.1 dB);
  - dips again near 96 GHz (about -3.4 dB) and near 105 GHz (about -3.7 dB);
  - ends near -3.2 dB at about 110 GHz.
- The dashed simulated S21 (EE-derived) crosses -3 dB at about 110 GHz.
- Why it matters: the 110 GHz value is the authors' claim, and it coincides with the EE-derived model curve. The measured data first reach -3 dB about 20 GHz lower. wang2025 already records its earlier -3 dB touch (51 vs 55 GHz); wang2024a does not, so the two rows are inconsistent and the wang2024a row reads as a clean crossing at 110.
- Change:
  - Keep the value 110, `approx` and basis measured (the authors' wording).
  - Evidence note: "authors: approximately 110 GHz; measured trace first below -3 dB near 90 GHz; EE-derived simulated curve crosses near 110 (approx. reading)".
  - Row notes: add "Measured S21 first dips below -3 dB near 90 GHz (Fig. 2(c), approx. reading); 110 GHz matches the EE-derived simulated curve."
  - Config bw3db target note: the same sentence.
  - Optional: `eo_rolloff_db` 3.2 at `eo_rolloff_freq_ghz` 110, basis extracted_from_figure, `eo_rolloff_db:approx`, reference as in bw3db_reference.

### Metadata

**F5 (metadata). wang2025 papers.csv: the numbers come from the ASAP (pre-issue) PDF, but the notes do not say so.**
- The cached PDF has lettered pages A-E, "ACS Photonics XXXX, XXX, XXX-XXX" footers and "Cite This: https://doi.org/..." with no volume. `venue` "ACS Photonics 12(10), 5345-5351" is the Crossref issue record (2025-10-15).
- Change: in wang2025 `notes`, replace "Numbers from the ACS Photonics article PDF" with "Numbers from the ACS Photonics ASAP PDF (lettered pages A-E, no volume/pages); venue and pages from Crossref; issue version not read".

**F9 (metadata, cache/coordination, not a staged cell).**
- (a) `references/wang2024a/source.json` and the `text.md` header carry `license: CC-BY-4.0`. That is the batch-CSV hint. The staged papers.csv correctly rejects it: Crossref gives Optica OA License v2 (VOR-OA) for the journal version, and the arXiv v2 page shows no licence. Change: correct the cache metadata to "unverified (arXiv v2; journal VOR Optica OA License v2 per Crossref)" or annotate it, so no later step reads CC-BY-4.0 from the cache.
- (b) The org row "Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences" is also staged in p3_06 and p4_03 with an identical name, type, country and region. The coordinator should de-duplicate at merge. The name is consistent, so no change is needed in p4_04.

### Minor

**F2 (minor). wang2024b-a `bw3db_ghz` 41 approx: the note omits the earlier -3 dB touch.**
- Source:
  - p.5: "more than 40 GHz (Fig. 3(f))".
  - Abstract: "up to 40 GHz".
  - Methods: 50 GHz photodiode, 67 GHz VNA.
- My reading of Fig. 3(f) (p.4 render, zoomed; approximate):
  - the trace touches -3 dB once near 34.5 GHz and recovers to about -1.7 dB near 37 GHz;
  - it first dips below -3 dB near 40 GHz and stays at or below -3 dB from about 42 GHz;
  - it ends near -3.2 dB at 50 GHz.
- 41 GHz is within reading error of my reading. extracted_from_figure plus `approx` is the right basis, because the number appears nowhere in the paper. `gt` would be wrong because a crossing is observed.
- Change (note only):
  - Evidence note: "paper: more than 40 GHz (abstract: up to 40); trace touches -3 dB near 34.5 GHz, below from about 40-42 GHz".
  - Row notes: add the 34.5 GHz touch.

**F3 (minor). wang2025-a `bw3db_ghz` 55 approx: refine the crossing note.**
- My reading of Fig. 4(c) (p.4 render, zoomed; approximate):
  - The 35 dBm (orange) trace first goes below -3 dB near 50 GHz, reaching about -4.3 dB near 50.5 GHz.
  - The 0 dBm (blue) trace first touches -3 dB near 51-52 GHz.
  - Both traces sit at or below -3 dB over much of 50-63 GHz, with minima about -4.5 dB near 61 GHz. They recover to about -1.7 dB near 66 GHz and end near -3 dB at about 67 GHz.
- Source:
  - p.3: "around 55 GHz for both optical power levels".
  - Conclusions p.5: "exceeding 55 GHz".
- The value, `approx` and basis are acceptable.
- Change: evidence note "authors: around 55 GHz (conclusion: exceeding 55); traces first below -3 dB near 50-51 GHz, mostly below to 63 GHz". Mirror it in the row notes. Add the same to the config if a bw3db target is added (F6e).

**F4 (minor). wang2025-a `optical_power_handling_dbm` 28 has basis measured. It is an author-deduced in-modulator power.**
- Source:
  - p.3: "35 dBm optical input power (equivalent to ... 28 dBm within the modulator)".
  - p.2-3: GC loss 6 dB, and "a 1 dB front-end loss was introduced by the polarization controller and transmission fibers".
- The 28 dBm is the measured 35 dBm input minus the stated 6 + 1 dB losses. Under convention (h) that is `derived`.
- Change: set evidence basis = derived, with the note "35 dBm fiber input minus 6 dB GC and 1 dB front-end loss (authors); source-limited lower bound". The value and `gt` are unchanged.

**F6 (minor). sims/wang2025/config.yaml target and provenance details.**
- (a) The target `rf_loss_db_per_cm` at_ghz 67 = 1.588 is project arithmetic (0.194 x sqrt(67)) on a simulated alpha0. It is not a paper-reported value, and `at_ghz` targets are not evaluated. Change: remove it, or keep it only with `comparable: false` and basis simulated plus project arithmetic, stated in the note.
- (b) The target `vpi_l_dc_vcm` 2.67 note says "no derivation shown". The paper gives the factor on p.2: EO efficiency "about 0.83 times" the optimum, and 3.22 x 0.83 = 2.67. Change the note to "authors' measured 3.22 V cm x 0.83 orientation factor (p.2)".
- (c) The `line.source_ohm` locator "p.3 text (EE measurement, 50 ohm system)" is not supported by p.3. The 50 ohm source/load statement is in the Fig. 2(c) and Fig. 3(h) captions ("source/load impedance 50 ohm"). Change the locator to those captions.
- (d) `geometry.regions.hole_r` and `hole_l` are classed `figure_digitized` from Fig. 1(c), which is a not-to-scale schematic.
  - The same sketch draws the central Si pillar as wide as the Ws signal electrode. That alternative placement (hole edges aligned with the signal edges) is incompatible with holes centred under the waveguides for these dimensions, and the config does not mention it.
  - Change: class `project_inference`, and add to the note "Fig. 1(c) also draws the pillar as wide as Ws; centring under the waveguide chosen".
- (e) Optional: there is no measured bw3db target. If one is added: `{metric: bw3db_ghz, value: 55, tol_rel: 0.15, comparable: false}`, with the F3 note.

**F7 (minor). ng_opt targets and one locator in both configs.**
- `sims/wang2024a/config.yaml` target ng_opt 2.25 and `sims/wang2025/config.yaml` target ng_opt 2.19 cite device fields whose evidence basis is simulated. Unlike the other simulated targets in wang2025, they do not say so. Change: add `basis: simulated, note: "paper's own simulated group index"` to both sources.
- `sims/wang2024a/config.yaml` `line.load_ohm` is `paper_exact` with the p.4 locator. That locator describes the data-transmission termination (bias-T plus 50 ohm). The S21 measurement termination is not described. Change: add the note "termination stated for the transmission setup; S21 setup not described".

**F8 (minor). wang2024b-a and wang2024b-b row notes: the stated 2.5 um sidewall-to-electrode gap is not recorded.**
- p.5: "the gap between the LiTaO3 waveguide sidewalls and the gold electrode was 2.5 um on each side".
- Leaving `electrode_gap_um` empty is correct, because 6.2 um would be distiller arithmetic. However, the stated number appears only in the papers.csv notes, and only indirectly.
- Change: add to both row notes "waveguide sidewall to electrode 2.5 um each side (p.5); electrode_gap not entered".

## SPEC_PROPOSALS.md and LT constants (fact check)

- **Rotated cut (wang2025): accurate.** The engine supports `crystal.rotation_deg`, which rotates about the propagation axis only (`engine/src/materials.mjs` labFromCrystal). A rotation about the film normal cannot be expressed.
  - The proposal describes the cut as "propagation 22 deg from Y toward Z". This is consistent with the authors' "electric field along the 22 deg Z axis" and the 0.83 efficiency factor (p.2).
  - The SAW-style reading of "X-112 deg Y" (112 deg from Y) would instead put the field about 22 deg from Y. The config follows the authors' field statement, which is the defensible choice.
- **LT library entry: accurate.** `engine/data/materials.json` `lithium_tantalate` holds Bond tabulated indices only. The interpolated n_o at 1.55 um is about 2.119, consistent with the table.
- **LT constants versus wang2024b Extended Data Table 1 (img_p15_1, p.15): all match.** n_o 2.119 and n_e 2.123 (1550 nm); eps_11,22 = 54 and eps_33 = 43 (100 kHz); r33 30.5 and r51 20 pm/V (1550 nm, cited there from its ref. 1).
  - The configs map these correctly: `eps_r {perp: 54, par: 43}`, `r_pm_per_v {r33: 30.5, r51: 20}`.
  - The configs list r13 and r22 under `missing` (they are not in the table).
  - The 100 kHz caveat is in `limitations`.
  - wang2025 p.2 independently quotes r33 = 30.5 pm/V; its provenance cites that.
- **Class `standard_reference` for constants from a companion paper:** acceptable as recorded, since each citation names the paper and table explicitly.

## Verified clean

wang2024a (arXiv v2 numbers):
- 6 mm push-pull pair (p.2).
- V_pi 4.8 V at 1550 nm with a 100 Hz triangular sweep. V_pi L 2.8 V cm is author-stated (4.8 x 0.6 = 2.88), so `derived` is correct.
- n_eff 2.22 at 50 GHz is measured; ng 2.25 is simulated (Fig. 1(b) caption).
- Fig. 1(b) caption values: 800 nm electrode, 1.4 um cladding, 600 nm half-etched LT, 4.7 um BOX, 6 um gap, 1.2 um waveguide, 19 um signal. The text's 2.4 um per side plus 1.2 um = 6.0 um, consistent.
- Wafer stack: 600 nm / 4.7 um / 525 um high-resistivity Si; x-cut; optical-grade bulk.
- Propagation along y read from the Fig. 1(a) axes.
- Silver 800 nm. alpha_RF 0.58 vs 0.77 (the figure label says 0.7). Coupling about 7 dB per facet.
- Drift about 3 dB (SiO2/Ag) and about 1 dB (air/Au) vs 8 dB for LNOI.
- IMDD:
  - 176 GBd PAM8 at BER 3.8e-2 (below 25% SD-FEC); 200 GBd PAM4 and 208 GBd PAM2 below the 15% and 7% limits.
  - Fig. 3(f) label "176 GBd PAM8 (528 Gbit/s)"; Fig. 3(c) "Net: 405 Gbit/s"; AIR 432 Gb/s. The 405 is `derived` (NGMI code rate x baud).
  - Driver chain: M8199B, 20 cm cable, 110 GHz probe, MMSE predistortion; no amplifier stated.
- Cross-section SEM (img_p02_6, approximate):
  - top width about 2.0 um and base about 2.2 um, confirming the flagged conflict with 1.2 um;
  - rib height about 280 nm and slab about 265 nm, consistent within reading error with the config note's 280/270 (reversed order);
  - sidewall about 70-75 deg vs the config's 68 deg, within reading error for an inferred value.
- Config:
  - rib polygon 1.2 um top with a 68 deg sidewall (0.1212 / 0.3);
  - electrodes at a 6 um gap with the waveguides centred; Ag sigma 1/(1.55e-6 ohm cm) = 6.45e7 S/m;
  - BOX and substrate per text; `missing` and `limitations` complete.
- papers.csv identity matches Crossref: title, 11 authors, Optica 11(12) 1614, online 2024-11-26.
- `license` and `redistribution` are correctly conservative. `published_on` is left empty (arXiv v1 date not in cache), which is acceptable. foundry_or_fab is CMi plus the IPHYS cleanroom (acknowledgements p.6); the existing org names are reused exactly.

wang2024b (Nature VOR, CC-BY-4.0 in Crossref for both vor and tdm, "Open access" on p.1, published 2024-05-08; `open_license_ok` justified):
- MZM: 2.5 mm, 1.2 um waveguide, 220 nm etch / 400 nm slab, gold.
- V_pi 7.6 V (1550 nm) and 6.4 V (1310 nm), confirmed on the Fig. 3(g) labels. V_pi L 1.9 and 1.6 are author-stated, so `derived` is correct.
- ng about 2.25 for "both microwave and optics" is a design statement, so `author_estimate` plus `approx` is correct.
- Extended Data Fig. 2 spiral group index 2.25 confirmed.
- Methods: 600 nm film, 4.7 um thermal SiO2, 525 um high-resistivity Si, x-cut; 10 kHz sweep; ER 15 dB with no wavelength stated (not entering it is a correct judgment).
- S21 "ratio of powers", 50 GHz PD, 67 GHz ZNA67, 50 ohm load. Fig. 3(f) plotted to 50 GHz; `bw3db_reference` unspecified.
- Racetrack: 2 um width, 100 um apex radius, 400 um straight section, 255 and 510 MHz/V, 0-40 V, C and O band (Methods). Leaving `tuning_nm_per_v` empty is correct, because no wavelength is given for Fig. 3(c).
- Platform 5.6 dB/m from 26.8 MHz; the spiral is about 9 dB/m.
- Wafers from NSIT and SIMIT-CAS (acknowledgements); fab at CMi plus the IPHYS cleanroom.
- Authors and venue match Crossref. repro_grade C with no config is justified (no signal width, electrode thickness or MZM cladding).

wang2025:
- Identity matches Crossref: 7 authors, affiliations, received 2025-01-18, accepted 2025-06-23, online 2025-06-26. Crossref gives STM-ASF policy URLs only, so `restricted_local_only` is correct.
- Acoustic-grade LTOI from Novel Si Integration Technology: 400 nm X-112 deg Y film, 4.7 um BOX.
- Ridge: 200 nm height, 1.5 um width, 60 deg sidewall.
- Electrodes: Ws 80 um, j 1.8 um, l 0.2 um, k 1.1 um; 900 nm SiO2; holes r = 90 um; (a,b,c,d,e) = (15.3, 3, 2, 47, 5) um. The letter roles are confirmed on Fig. 1(a): a = stem length, b = T-bar spacing, c = bar width, d = bar length, e = stem width, so period d+b = 50 um is consistent. Au label on Fig. 1(c).
- L = 0.7 cm and V_pi 4.6 V, so V_pi L 3.22 is `derived`.
- Simulated values in notes only: V_pi L 2.41 along Y, alpha0 0.194, Zc 50 ohm (design), roll-off under 1 dB at 100 GHz.
- n_m plateau about 2.25 from 15-67 GHz (Fig. 3(g)); Zc oscillating about 47-60 ohm (Fig. 3(h)); EE S21 roll-off 5.7 dB at 67 GHz (text).
- Fig. 4(a) inset: "-2 dB" and "22 dB" from a wavelength sweep; static ER per the authors.
- 70 GHz PD; trace to about 67 GHz.
- OOK 80/100 Gb/s and PAM-4 80/112 Gb/s (40/56 GBd); BER below KP4 for 80 Gb/s OOK. `max_baud_gbd` 100 from OOK is definitional and recorded in `derived`, which is acceptable.
- Driver: Micram DAC10004, SHF 807c, GGB 67A, off-chip 50 ohm termination.
- No DC bias; the operating point is set by wavelength. Wavelength and band are not stated, so leaving them empty is correct.
- foundry_or_fab is empty: no facility is named (only EVG620 contact lithography).
- Config geometry:
  - rib polygon 1.5 um top with a 60 deg sidewall (bottom 1.731 um); slab 200 nm; flat 0.9 um cladding;
  - T-bars 2 um wide either side of the 1.8 um gap; signal inner edge at 18.2 um = 2.9 + 15.3;
  - mirror at -58.2 um; ground mirror arithmetic correct; holes 90 um wide leaving a 26.4 um pillar.
  - `limitations` disclose the rotated cut, stems, cladding, window crop and lossless Si.
- The chen2022 "same group" remark is correct: shared authors K. Chen, Z. Ruan, C. Guo and L. Liu.
