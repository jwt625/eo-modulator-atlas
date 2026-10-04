---
auditor: fresh-context subagent
task: Q1 audit of staged batch p4_01
date: 2026-10-04
scope: data/_staging/p4_01 (papers.csv, devices.csv, organizations.csv, evidence/*.yaml) for arabjuneghani2022, valdez2023a, liu2025, liu2025b; sims/arabjuneghani2022/config.yaml, sims/valdez2023a/config.yaml, sims/liu2025b/config.yaml (targets and provenance only, no engine run)
mode: read-only (only this file written; no edits, no git, no network)
verdict: arabjuneghani2022 fail (one blocking cell), valdez2023a, liu2025 and liu2025b pass after corrections
findings: {blocking: 1, numerical: 2, metadata: 1, minor: 7}
---

# Q1 audit (fresh context): p4_01

## Method and limits

Step 1 (before opening `BATCH_REPORT.md`):
- Read the rules: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), columns, enums), `data/_staging/BATCH_INSTRUCTIONS.md`, `sims/SPEC.md` (rules, target block). Skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- Dumped every populated cell of the 8 staged device rows, the 4 papers.csv rows, the 1 staged organization and the 4 evidence files.
- Read `references/<id>/text.md` in full for all 4 papers, plus `crossref.json` and `source.json` for each.
- Opened these renders, re-rendering from `source.pdf` at 3x to 14x where needed:
  - arabjuneghani2022: p.2 (Fig. 1(a) zoomed, Table 1, Fig. 2), p.3 (Fig. 3), p.4 (Fig. 4, Fig. 5(a) and 5(b) zoomed, Fig. 6), p.5 (Fig. 8).
  - valdez2023a: p.5 (Fig. 3), p.6 (Fig. 4(b) and 4(d) zoomed).
  - liu2025: p.3 (Fig. 1, Fig. 2), p.10 (Fig. 8).
  - liu2025b: p.2 (Fig. 1 zoomed), p.5 (Fig. 4), p.6 (Fig. 6, Table 1).
- All figure readings below are my own and approximate.
- Mechanical check (throwaway scratchpad script): every non-empty evidence-required cell in the 8 rows has an evidence entry (or `derived` item) with an equal value, and the units equal the schema units. Every qualifier sits on a populated field. No evidence entry exists for an empty cell; drive and vpi_convention entries are allowed. Every basis is in the enum. There are no duplicate (device_id, field) entries, and no evidence note exceeds 25 words. Result: 0 defects.
- `uv run python scripts/merge_staging.py data/_staging/p4_01` (dry run) output: `merge counts: {'papers': 4, 'devices': 8, 'orgs': 1, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- Checked how `scripts/build_views.py` uses the bandwidth basis (read only):
  - The evidence basis wins over the row column.
  - A headline bw3db basis in {simulated, predicted, design_target} sets `is_sim` for the whole device, so `measured_only` becomes false.

Step 2: after Step 1, I read `data/_staging/p4_01/BATCH_REPORT.md`. It raises no issue that changes the findings below. Its statement "R is not stated" for liu2025 is discussed in F7.

Limits:
- No network. I did not read these versions or files:
  - the Optica version of record of valdez2023a
  - the Laser & Photonics Reviews article of liu2025
  - the Supporting Information of arabjuneghani2022
- The arXiv id 2411.15037 for liu2025 cannot be checked against the cached file, which carries no arXiv stamp.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| arabjuneghani2022 | 2 | fail (pass after F1) | F1 (blocking), F5, F6 (minor) |
| valdez2023a | 2 | pass after corrections | F3 (numerical), F9 (minor) |
| liu2025 | 2 | pass after corrections | F2 (numerical), F4 (metadata), F7, F10 (minor) |
| liu2025b | 2 | pass after corrections | F8, F11 (minor) |

## Findings

### Blocking

**F1 (blocking). arabjuneghani2022-b `bw3db_ghz` = 170 is the authors' model extrapolation, and the row-level `bw_basis` labels it `measured`.**
- Cells:
  - `data/_staging/p4_01/devices.csv` row arabjuneghani2022-b: `bw3db_ghz` 170, `bw_basis` measured, `bw_measured_to_ghz` 100, no bw3db qualifier.
  - Evidence entry `bw3db_ghz`: value 170, basis predicted.
- Source:
  - p.4 Sec. 3.3: "the measured 3 dB EO bandwidth of modulator #2 is well beyond 100 GHz with a roll-off of 2 dB from low frequency to 100 GHz". The EO responses "are extrapolated beyond the measurement limit of 100 GHz" with the analytical model of ref. [26]. "The corresponding 3 dB bandwidth of this modulator is 170 GHz."
  - Fig. 5(b) (my reading): the measured VNA/OSA trace ends at 100 GHz. Its deepest point is about -2 dB near 95 GHz and the end point is about -1.3 dB. Only the dashed "Predicted Response" crosses -3 dB, near 170-175 GHz.
  - Abstract: "extrapolated 3 dB bandwidth of 170 GHz".
- Why it blocks:
  - The row column says measured for a model extrapolation (hard rule 2).
  - Storing the prediction in `bw3db_ghz` contradicts convention (c): no crossing was observed, so the cell is the measured-to value with gt.
  - It also contradicts repository precedent. kharel2021-b keeps its authors' 180 GHz extrapolation in notes only ("prediction, not a column"). The p4_02 Q1 audit F1 (lee2026-a) treats the same pattern the same way.
  - Through the evidence basis, the device would be flagged `is_sim`. Its measured Vpi, IL and ER would then drop out of measured-only views.
- Change:
  - devices.csv arabjuneghani2022-b: `bw3db_ghz` 170 -> 100. `qualifiers` -> `il_fiber_to_fiber_db:approx;prop_loss_db_per_cm:lt;vpil_rf_vcm:lt;bw3db_ghz:gt`. `bw_basis` stays measured (now correct).
  - Evidence `bw3db_ghz`: value 100, basis measured, locator "p.1 abstract; p.4 Sec. 3.3, Fig. 5(b)", note "measured 3 dB 'well beyond 100 GHz' (2 dB roll-off at 100 GHz); authors' model extrapolation 170 GHz not entered".
  - Notes, first sentence -> "Modulator #2 (wide gap, headline). Measured 3 dB bandwidth is a bound (2 dB roll-off at 100 GHz, text 'well beyond 100 GHz'); the authors' analytical-model extrapolation gives 170 GHz (Fig. 5(b) dashed curve, prediction, not a column)."
  - Sim config consequence: see F5.

### Numerical

**F2 (numerical). liu2025-a `bw3db_ghz` 220 and liu2025-b `bw3db_ghz` 218 are model extrapolations stored in the bandwidth column (basis predicted). The measured result is a bound.**
- Cells:
  - devices.csv liu2025-a: `bw3db_ghz` 220, `bw_basis` predicted, `bw_measured_to_ghz` 110, `qualifiers` eo_rolloff_db:lt.
  - devices.csv liu2025-b: `bw3db_ghz` 218, with the same pattern.
  - Evidence entries with basis predicted.
- Source:
  - p.10 Sec. 3.3: "the EO frequency response exhibits a 3-dB EO bandwidth far beyond 110 GHz". The response "is extrapolated beyond 110 GHz by using the analytical model". The O-band roll-off at 110 GHz is "only 0.83 dB".
  - Table II (p.12) gives "This work ... 3-dB BW > 110 (220a)" and "> 110 (218a)", with footnote "a: Extrapolated 3-dB EO bandwidth". The authors therefore present the measured result themselves as > 110 and the extrapolation as a separate quantity.
  - Fig. 8(c) (my reading): the measured traces end at 110 GHz between about -0.5 and -1.3 dB. Only the dashed calculated curves cross -3 dB, near 218-220 GHz.
- Why: the basis is honestly labelled, so this is not blocking. The storage still contradicts convention (c) and the precedent cited in F1. It also marks the measured 7 mm device as `is_sim`, which hides its measured Vpi of 1.9/1.54 V from measured-only views.
- Change:
  - liu2025-a: `bw3db_ghz` 220 -> 110, `bw_basis` predicted -> measured, `qualifiers` -> `eo_rolloff_db:lt;bw3db_ghz:gt`.
  - Evidence `bw3db_ghz` for -a: value 110, basis measured, locator "p.10 Sec. 3.3, Fig. 8(b); p.12 Table II", note "'far beyond 110 GHz'; Table II '> 110 (220a)'; extrapolated 220 GHz (analytical model) not entered".
  - liu2025-b: the same changes, with 218 in its note.
  - Notes: reword "Extrapolated 3 dB bandwidth 220 GHz is ..." (and "extrapolated from measurement 218 GHz" on -b) to state that the extrapolation is a prediction, not a column.

**F3 (numerical). valdez2023a-b `bw3db_ghz` = 100 with qualifier `gt`, while the measured EOR already dips below -3 dB below 100 GHz.**
- Cells: devices.csv valdez2023a-b, `bw3db_ghz` 100, `qualifiers` includes `bw3db_ghz:gt`, `bw_measured_to_ghz` 110, `bw_basis` measured.
- Source:
  - p.4: "The EOR response does not roll off below 3 dB (shown as a dashed line) except at the far edge of the measured RF range, above 100 GHz, which we therefore take as the 3-dB roll-off frequency."
  - Conclusion p.6: "drops off past the 3 dB line (referenced to 1 GHz) only beyond 100 GHz".
  - Fig. 4(d) (0.8 cm; my reading, approximate, x scale 14.8 px/GHz, y 65.5 px/dB):
    - Points first touch -3.0 dB at about 74 GHz (red band-edge point) and about 80-81 GHz.
    - Points lie below -3 dB at about 95-96 GHz (about -3.1 and -3.35 dB) and 101-103 GHz (about -3.1 to -3.35 dB).
    - They stay below -3 dB from about 106-107 GHz and end at about -4.2 dB at 110 GHz.
- Why: a `gt` bound draws the device as "no crossing up to 100 GHz", which the measured points do not support. The authors claim a crossing near the measurement edge, which is convention (c)'s third case: fill `bw3db_ghz` (approx when the paper says "around") and `bw_measured_to_ghz`.
  - valdez2023a-a is different and correct as staged. In Fig. 4(b) every point stays above -3 dB up to about 108 GHz, and only the last point (about 110 GHz, about -3.1 dB) is below it, so `gt` 100 is a true bound.
- Change:
  - valdez2023a-b `qualifiers`: replace `bw3db_ghz:gt` with `bw3db_ghz:approx`. Values and basis unchanged.
  - Evidence `bw3db_ghz` note for -b -> "authors take the edge roll-off above 100 GHz as f3dB; points scatter about -3 dB from about 80 GHz (approx. reading)".
  - Row notes: replace "so 100 is a bound with measurement range 110" with "so 100 is entered as an approximate crossing (authors' reading of a noisy trace), measurement range 110".
  - `sims/valdez2023a/config.yaml`: limitation "The 3 dB bandwidth is a bound (beyond 100 GHz) and is not a target" -> "The 3 dB bandwidth is an approximate, noisy crossing near 100 GHz and is not a target". The target-list comment changes the same way.

### Metadata

**F4 (metadata). liu2025 `doi` 10.1002/lpor.202570057 is a cover / front-matter record, not the research article.**
- Cell: papers.csv liu2025, `doi` 10.1002/lpor.202570057. `venue` reads "arXiv; associated journal: Laser & Photonics Reviews 19(14), 2025". `references/liu2025/crossref.json` and `source.json` point at the same DOI.
- Source (`references/liu2025/crossref.json`):
  - article-number 2570057
  - title ends "(Laser Photonics Rev. 19(14)/2025)"
  - reference-count 0, no abstract
  - license is the Wiley terms-and-conditions URL, not a CC licence
- This pattern (25700xx article numbers, issue-citation suffix, no references) is the Wiley issue-cover record for the article.
  - The cached manuscript's own title differs: "Ultra-High-Efficiency Dual-Band ... with 220 GHz Extrapolated Bandwidth for 390 Gbit/s PAM8 Transmission" (p.1).
  - The 11 authors match the Crossref list in the same order.
- The distiller flagged this as "may be" in notes and still filled the DOI. The papers row should not carry an identifier that resolves to a different work.
- Change:
  - papers.csv liu2025: `doi` -> empty.
  - `venue` -> "arXiv; associated journal: Laser & Photonics Reviews 19(14), 2025 (article DOI not verified)".
  - Notes IDENTITY CAVEAT sentence -> "Crossref 10.1002/lpor.202570057 (article number 2570057, title suffix 'Laser Photonics Rev. 19(14)/2025', no references) is the issue cover record, not the article; the article DOI is not verified."
- Coordinator item (network): fetch the article's own Crossref record and verify arXiv 2411.15037 against the manuscript. The `url` (arxiv.org/abs/2411.15037, unversioned) comes only from the batch CSV.

### Minor

**F5 (minor). `sims/arabjuneghani2022/config.yaml` target `bw3db_ghz` 170 cites the device field.**
- Current: `{metric: bw3db_ghz, value: 170, tol_rel: 0.2, source: {device_id: arabjuneghani2022-b, field: bw3db_ghz, ...}}`.
- After F1 the field holds 100 (gt), so the source no longer equals the target.
- Change: keep the target as a labelled prediction with `source: {paper_id: arabjuneghani2022, locator: "p.1 abstract; p.4 Sec. 3.3, Fig. 5(b)", basis: predicted, note: "authors' analytical-model extrapolation beyond the 100 GHz measurement limit"}`, or drop it. The limitation line already says it is not a measurement.
- The rest of the config is verified. It has 22 um signal, 40 um grounds, 10 um gap and D = 2.6 um from the gap centre (Fig. 1(a) zoom confirms that D runs from the gap centre to the rib centre). It also has Tb 0.2, Tc 0.8 and Tg 1 um. The vpil, n_rf, rf_loss, eo_rolloff (-2.0 dB at 100 GHz) and ng targets match the evidence.

**F6 (minor). arabjuneghani2022-a: 84 GHz and "3.6 dB at 100 GHz" are the authors' statements; the trace scatters around -3 dB.**
- Fig. 5(a) (my reading, approximate):
  - The measured trace first reaches -3 dB near 75 GHz and scatters about plus or minus 0.5 dB around -3 dB from about 75 to 100 GHz.
  - Its minimum is about -3.5 dB near 97 GHz, and it ends near -2.4 dB at 100 GHz.
  - The predicted curve crosses -3 dB near 95 GHz.
- The 3.6 dB "roll-off to 100 GHz" (p.4) therefore matches the trace minimum near 97 GHz rather than the 100 GHz end point.
- Values and basis can stay (the text states them explicitly). Change: append to the row notes "Fig. 5(a): trace scatters about -3 dB from about 75 to 100 GHz; deepest about -3.5 dB near 97 GHz (approx. reading)."

**F7 (minor). liu2025 energy per bit is in the evidence `derived` list although the paper states the values.**
- `evidence/liu2025.yaml` `derived` holds `energy_per_bit_fj` 4.42 (-a) and 0.69 (-b).
- The paper states both numbers (p.12): "can be estimated as We = Vrms^2/(BR) ... corresponding to an electrical energy consumption of 4.42 fJ/bit (0.69 fJ/bit)".
- SKILL rule 11 puts author-deduced values in `entries` (basis author_estimate or derived) and reserves `derived` for the distiller's own arithmetic. arabjuneghani2022 in the same batch uses `entries` with author_estimate.
- Change: move both to `entries` with basis author_estimate, locator "p.12 Sec. 4", note "Vrms 245.6 mV (97.6 mV), B = 390 Gbit/s; includes probe and cable".
- Optional note (my arithmetic, approximate): R = 35 ohm, the stated on-chip termination (p.10), reproduces both numbers (0.2456^2/(390e9 x 35) = 4.42e-15 J). The batch report's "R is not stated" is literally true.

**F8 (minor). liu2025b-a `vpi_dc_v` 2.92: the measurement frequency is stated inconsistently, and the row notes are silent on it.**
- p.4 text: "measured ... using a 500 kHz triangular voltage sweep". Fig. 4 caption: "Half-wave voltage at 1 GHz, 2.92 V". Conclusion p.7: "measured Vpi of 2.92 V at 1 GHz".
- The evidence note records the conflict. Keeping it in `vpi_dc_v` follows the Methods text and the Fig. 4(c) transmission-versus-voltage sweep, which is a defensible judgment.
- Change: append to the row notes "Vpi 2.92 V: Methods say 500 kHz triangular sweep; Fig. 4 caption and conclusion say 'at 1 GHz'; entered as DC per Methods."

**F9 (minor). valdez2023a note wording.**
- Row valdez2023a-a notes: "Vpi 2 V and 1 V given to one significant figure". p.4 gives "2.0 V and 1.0 V", and only the conclusion uses "2 V" and "1 V".
  - Change to "Vpi 2.0 V and 1.0 V (p.4; conclusion rounds to 2 V and 1 V)".
- papers.csv notes: "dated 23 Nov 2022 on p.1". p.1 carries the arXiv stamp "23 Nov 2022" and the line "(Dated: November 28, 2022)".
  - Change to "arXiv stamp 23 Nov 2022, 'Dated: November 28, 2022' on p.1".

**F10 (minor). liu2025 wording and labelling.**
- liu2025-b notes say "RF line parameters (n_rf, loss, Z0) are entered on liu2025-a only", but liu2025-a carries only `n_rf`, with no RF loss or Z0 cell.
  - Change to "RF index n_rf is entered on liu2025-a only; RF loss and Z0 are not entered".
- `epitaxy_or_stack` (both rows, evidence basis measured) includes "50 deg sidewall". That value is a design assumption ("taken to be", p.3) and is already basis design_target in `sidewall_angle_deg`.
  - Change to "50 deg design sidewall".

**F11 (minor, optional). liu2025b licence evidence and venue issue.**
- Convention (k) asks for the paper's own notice "quoted in the evidence note" when Crossref has no licence. The CC-BY 4.0 notice (p.1: "licensed under a Creative Commons Attribution 4.0 International License") is quoted only in papers.csv notes, which matches repository practice.
  - No change required. If the coordinator wants (k) literally, add the quote to the evidence file's `source_files` comment or a paper-level note.
- `venue` "Light: Advanced Manufacturing 6, 47" omits the issue that Crossref gives (issue 3).
  - Optional change to "Light: Advanced Manufacturing 6(3), 47".

## Verified clean

arabjuneghani2022:
- Identity:
  - Title, 9 authors in Crossref order, Advanced Photonics Research 4(1) 2200216.
  - published_on 2022-10-26 (Crossref published-online).
  - CC-BY-4.0, from Crossref am/vor and the p.1 notice, so open_license_ok is valid.
  - source_type journal, cached copy is the version of record.
- Organizations: University of Central Florida (new; university, US, north_america, Orlando) and Nokia Bell Labs (existing name, Murray Hill). countries US. foundry_or_fab and wafer_supplier empty (not stated).
- Table 1 (p.2):
  - #1: G 5, D 0.6, Wc 12, Wg 40, Tg 1, Tb 0.2, Tc 0.8, L 5000 um.
  - #2: G 10, D 2.6, Wc 22, with the other values identical.
- Text p.2: 500 nm x-cut LN, 200 nm etch, 800 nm rib, push-pull MZMs.
- Static measurements (p.3, Fig. 3(a),(b)):
  - Vpi 4.4 / 6.6 V (100 kHz), VpiL 2.2 / 3.3 V cm (author-stated, basis derived).
  - ER 23 / 20 dB, IL about 16 dB fiber-to-fiber (approx).
  - Optical loss below 0.02 dB/cm is simulated (lt, simulated).
- RF line (p.3-4, Fig. 4): n_m 2.2 and 3.6 dB/cm at 67 GHz, extracted from measured S-parameters (derived). Zm 49-52 ohm is not entered as one number. ng 2.23 (Fig. 1(a) inset, simulated).
- RF VpiL below 4.1 V cm to 100 GHz (lt, derived).
- Data demos on modulator #1 only (Sec. 3.4, Fig. 8(a) shows the DBI-DAC and RF amplifier):
  - OOK 100 Gbaud; PAM-4 53.125 and 100 Gbaud; PAM-8 80 Gbaud, 240 Gb/s.
  - BER values as noted.
  - 124 / 81 fJ/bit (author_estimate).
- repro_grade B is justified (BOX thickness and sidewall angle missing).

valdez2023a:
- Identity:
  - arXiv 2211.13348v1 (12 pp) is the numbers source; it matches the Optica 10(5) 578 Crossref record (3 authors, DOI).
  - license empty, restricted_local_only and published_on empty match the repository's arXiv-row pattern.
  - id rename from valdez2023 is justified.
- Organizations: University of California, San Diego and San Diego Nanotechnology Infrastructure (both existing). wafer_supplier NanoLN, Jinan Jingzheng Electronics Co., Ltd. (p.3).
- Geometry and setup:
  - 784 nm DFB, on-chip power about 0 dBm.
  - Lengths 0.4 / 0.8 cm; Vpi 2.0 / 1.0 V (cosine-squared fit to measured transmission, 100 kHz); VpiL 0.8 V cm.
  - ER about 31 dB (Fig. 3(e)).
  - G 4, h 2, L 20, t 15 um; 200 nm 5 mol% MgO x-cut LN, unetched; 180 nm SiN, 0.9 um wide; about 40 nm CMP oxide; 4000 nm SiO2 on HR Si; 20 nm Ti / 750 nm Au.
- Losses:
  - IL 12 dB (author_estimate, approx) includes MMIs, transitions and phase shifter, and excludes 3.4 dB/facet and about 4.2 mm feeders at 1.6 dB/cm.
  - Fiber-to-fiber about 20 dB.
- EOR referenced to 1 GHz (Fig. 4 caption), measured to 110 GHz.
- valdez2023a-a gt 100 confirmed (see F3).
- n_rf 2.24 simulated, ng 2.24 extracted/approx.
- Sim config:
  - Signal -57..-2 um and grounds 2..102 um, with a 4 um gap centred on each SiN rib.
  - Recessed section narrowed by h = 2 um per side.
  - The stack matches the text. Placeholders are flagged unknown, following the zhang2022/kharel2021 precedent.

liu2025:
- Authors and Tsinghua University (Department of Electronic Engineering, existing org), countries CN.
- Stack (p.3, p.7): 600 nm x-cut LN, 2 um BOX, 500 um quartz, 100 nm SiO2 buffer, 200 nm etch, 1 um ridge, 200 nm Cr/Au T-rails, 2 um BCB (eps 2.56), 1.7 um main CPW, NiCr terminator.
- Electrodes: GT 2.7 um, Ws 85 um.
- Efficiency (Fig. 8(a), 1 MHz): Vpi 1.9 V (1550 nm) and 1.54 V (1310 nm); VpiL 1.33 / 1.08 V cm (author-stated, derived).
- Roll-off 0.77 dB (C) and 0.83 dB (O) at 110 GHz with lt ("less than", conclusion).
- n_rf 2.22 at 110 GHz (extracted, derived); ng 2.221 / 2.225 (simulated).
- Transmission:
  - 130 Gbaud, PAM8 390 Gbit/s, eye diagrams only.
  - AWG M8199A and 67 GHz EA.
  - The Fig. 9 PAM8 "112Gbit/s" label typo is noted.
- repro_grade C justified: GCPW, ground width, T-rail dimensions and period are not given; Fig. 1(c) is a schematic. No sim config.
- One row per operating point (C, O band) of one device is correct under convention (d).

liu2025b:
- Identity:
  - Title (HTML escapes cleaned), 10 authors, DOI 10.37188/lam.2025.047.
  - Article 47 per the page header "(2025)6:47".
  - published_on 2025-05-23: "Accepted article preview online: 23 May 2025" (p.7) equals the Crossref created date. Published online 15 August 2025.
  - CC-BY-4.0 from the p.1 notice, so open_license_ok is valid.
- Organizations: National Information Optoelectronics Innovation Center and Peng Cheng Laboratory (existing names), universities empty, countries CN, foundry_or_fab empty (NOEIC appears only as a chip/package label).
- Chip (liu2025b-a):
  - 360 nm x-cut film, 180 nm rib and 180 nm slab, 2.5 um BOX, 500 um quartz, 3 um PECVD SiO2 etched 2 um, 180 nm NiCr, 1 um Au.
  - Wsig 80, Wg 200, t 2.3, h 10, s 2.3, g 3, r 50, c 5 um (Fig. 1 caption; the Fig. 1(a) zoom confirms the roles used in the sim config).
  - Simulated n_rf 2.22, 4.4 dB/cm at 110 GHz, 47 ohm (basis simulated).
  - 2.3 dB roll-off at 110 GHz, "larger than 110 GHz", so 110 gt with measured-to 110 is correct (Fig. 4(b) ends near -2.2 dB).
  - 0.2 dB/cm is one cut-back block on a 1 um test waveguide (noted).
  - VpiL 2.92 V cm, author-stated.
  - Wafer-map values in notes match Fig. 5.
- Packaged module (liu2025b-b):
  - 3.6 dB at 110 GHz and 95 GHz 3 dB bandwidth (Fig. 6(b): crossing near 95-98 GHz, my reading).
  - IL 6.5 dB fiber-to-fiber (UHNA, 2 dB/facet).
  - Dynamic ER 3.212 dB, TDECQ 3.14 dB, 190 Gbaud PAM4.
  - 380 Gb/s line rate in the `derived` list (baud x bits; the kohli2025 precedent permits this).
  - Laser about 10 dBm (approx).
- Sim config:
  - CPW gap 27.6 um = 2h + 2s + g, a coherent reading of Fig. 1(a).
  - Bars, windows and stack are consistent with p.2-3.
  - Targets are labelled as simulated or author-stated, and the bandwidth bound is correctly excluded.
