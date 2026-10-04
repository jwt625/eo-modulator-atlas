---
verifier: fresh-context subagent
task: independent verification of the Q1 audit corrections for staged batch p4_04
date: 2026-10-04
scope: data/_staging/p4_04 (papers.csv, devices.csv, organizations.csv, evidence/wang2024a|wang2024b|wang2025.yaml, AUDIT_DISPOSITIONS.md, BATCH_REPORT.md); sims/wang2024a/config.yaml; sims/wang2025/config.yaml; audit data/_staging/audits/p4_04-q1-claude-audit-2026-10-04.md
mode: read-only (only this file written; no edits, no git writes, no network; merge_staging dry run only)
verdict: all 16 dispositions are reflected in the staged files; every applied or adjusted change confirmed against the source; one new convention finding on the wang2024b bandwidth cell (non-blocking, coordinator decision), three minor
counts: {confirmed: 21, not_confirmed: 0, new_findings: 4 (numerical-convention 1, minor 3)}
---

# Verification: p4_04 (wang2024a, wang2024b, wang2025)

## Method

- Rules read: `.claude/skills/eo-modulator-distill/SKILL.md`, conventions (a)-(k) in `data/schema/devices.schema.yaml`, `sims/SPEC.md` (target semantics), `engine/schema/sim.schema.json` (target `source` is a free object).
- Bandwidth figures were digitized, not eyeballed, where the PDF allowed it:
  - wang2024a Fig. 2(c) (p.3) and wang2024b Fig. 3(f) (p.4) are vector graphics in `references/<id>/source.pdf`. I extracted the trace paths with PyMuPDF and calibrated against the axis tick marks drawn in the same PDF. wang2024a: 20-100 GHz ticks, 0 and -10 dB ticks; the -3 dB dashed line lands at -3.00 dB. wang2024b: 0-50 GHz ticks, 0/-5/-10 dB ticks; the drawn -3 dB line lands at -3.04 dB. The readings are exact to the vector data. The wang2024b trace is drawn as a filled outline, so its values carry the line width, about 0.1-0.2 dB.
  - wang2025 Fig. 4(c) is raster (`figures/img_p04_1.png`). I calibrated against the plot frame (0 and 70 GHz, +1 and -5 dB; the drawn -3 dB line lands at -3.0) and extracted the blue and orange pixels per column. The orange trace is drawn over the blue, so the blue is partly hidden. These readings are approximate, about +-0.3 GHz and +-0.05 dB.
- Re-read the source text for every changed cell, and every headline cell of all 5 rows (`references/<id>/text.md`, page markers).
- Mechanical re-check (scratch script) after the dispositions: every non-empty evidence-required cell has an equal evidence value, no evidence entry sits on an empty cell, and every qualifier is on a populated field. 0 defects.
- Both configs parse with `engine/src/config.mjs` `parseConfig`. The solver was not run.
- `uv run python scripts/merge_staging.py data/_staging/p4_04` (dry run): `merge counts: {'papers': 3, 'devices': 5, 'orgs': 1, 'evidence': 3}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| wang2024a | 1 | corrections confirmed | The 110 GHz approx measured cell is consistent with convention (c) and project precedent (see the bandwidth section). N3a is wording only. |
| wang2024b | 3 | corrections confirmed; issue N1 | The F2/F8 note changes are confirmed. The bandwidth cell itself departs from conventions (b)/(c) and from precedent (N1, coordinator decision). |
| wang2025 | 1 | corrections confirmed; minor N2, N3b | The F3-F7 changes are confirmed. The optical_power_handling locator misses the page that states the deduction (N2). |

## Bandwidth cells (coordinator priority)

### wang2024a-a: 110 approx, measured. Consistent with the rules; keep it.

Vector extraction of the measured S21, Fig. 2(c):
- The plot starts at 1.19 GHz at +0.13 dB.
- The trace is first below -3 dB at 89.3-89.7 GHz (min -3.12 dB).
- It is below again at 94.9-96.7 GHz (min -3.43), 104.0-108.3 GHz (min -3.72) and 109.5-110.0 GHz. It ends at -3.29 dB at 110.0 GHz.
- 5 GHz bin means reach -3 dB only in 101-111 GHz (-3.05 and -3.04).

The dashed simulated (EE-derived) curve is monotonic and reaches -2.97 dB at the 110.0 GHz plot edge.

Source:
- p.2: "measured electro-optic 3 dB bandwidth of approximately 110 GHz".
- Fig. 2 caption: "3-dB bandwidth at around 110 GHz".
- p.4: "roll-off around 3 dB from 10 MHz to 110 GHz".
- p.6: "3 dB bandwidth of 110 GHz".

The trace ends at 110 GHz (110 GHz probes).

Rule check:
- Convention (c), last sentence: "A claimed crossing at the instrument limit fills bw3db_ghz (with approx if the paper says 'around') and bw_measured_to_ghz." This is exactly the case: the authors claim about 110 GHz, and the data end at 110 GHz.
- `gt` would be wrong: the trace does go below -3 dB inside the range, and the paper states no bound.
- `extracted_from_figure` would be wrong: the authors state the number (convention (h) reserves it for values read from a plot).
- `derived` would be wrong: the authors call it measured, not a fit (unlike han2023 and lee2020).
- Canonical precedent: rows that carry the authors' stated value, basis measured, with the earlier figure dip recorded in the note:
  - wu2025-a (100 approx measured; "trace first reaches the -3 dB line near 90 GHz");
  - shamsansari2021-a (50 approx; below -3 dB beyond about 43 GHz);
  - sabatti2024-sh (40; SH trace dips to -3.9 dB near 36 GHz).
- The 0.12 dB excursion at 89 GHz is within the ripple of the trace (about +-0.5 dB).

The cells should be exactly what is staged:

| Column | Value |
|---|---|
| bw3db_ghz | 110 |
| qualifiers | bw3db_ghz:approx |
| bw_basis / evidence basis | measured |
| bw_measured_to_ghz | 110 (no qualifier) |
| bw3db_reference | other |
| bw3db_reference_freq_ghz | 0.01 |

The evidence note ("measured trace first below -3 dB near 90 GHz; EE-derived simulated curve crosses near 110") is confirmed. See N3a for an optional precision edit.

### wang2024b-a: 41 approx, extracted_from_figure. The figure reading is confirmed, but the cell departs from conventions (b)/(c) (N1).

Vector extraction of Fig. 3(f) (values include the line width):
- The trace starts at about 0 dB and touches -3 dB once at 34.25-34.5 GHz (low edge -3.09 dB). It recovers to about -1.7 dB near 37 GHz.
- It is first below -3 dB at 39.75-40.0 GHz (low edge -3.29) and hovers at -2.9 to -3.3 dB through 42.25 GHz.
- It is entirely below -3 dB from about 42.5 GHz, with minima about -4.1 dB near 46-48 GHz. It ends at -3.0 to -3.2 dB at 49.8 GHz.

The staged note ("touches -3 dB near 33-35 GHz, crosses near 41, below from about 43") and the value 41 are within reading error, so the figure reading is confirmed.

Source:
- p.5: "The measured 3 dB electro-optic bandwidth was more than 40 GHz (Fig. 3(f))".
- Abstract p.1: "an electro-optic bandwidth of up to 40 GHz".

See N1 for the rule question.

### wang2025-a: 55 approx, measured. Confirmed.

Raster extraction of Fig. 4(c):
- 35 dBm (orange): first pixel below -3 dB at 49.6 GHz; the whole line is below at 50.7 GHz (-4.3 dB near 50.5). Over 50-63 GHz it oscillates between about -2.0 and -4.5 dB (minimum near 60-62 GHz). It recovers to about -1.6 dB near 66 GHz and ends near -3.0 dB at 67.2 GHz.
- 0 dBm (blue):
  - reaches about -2.9 dB near 51 GHz, which touches -3 dB within the line width;
  - is first clearly below -3 dB near 59 GHz (about -3.5 dB), although it may be hidden under the orange trace earlier;
  - ends at -3.26 dB at 67.2 GHz.

Source:
- p.3: "The 3 dB EO bandwidth was around 55 GHz for both optical power levels".
- p.5: "exceeding 55 GHz".

The authors' value with `approx` (body wording), basis measured and bw_measured_to_ghz 67 matches the wang2024a and wu2025 treatment. The staged note ("traces first reach -3 dB near 50-51 GHz, oscillate about -3 dB to 63 GHz") is confirmed; for the blue trace it is at the generous end (N3b). The config target `{bw3db_ghz, 55, tol_rel 0.15, comparable: false}` equals the evidence value.

## Changed cells and dispositions

| ID | File / cell | Change | Verdict | Check |
|---|---|---|---|---|
| F1 | EA wang2024a-a bw3db_ghz note | new note (authors approx 110; first below -3 near 90; simulated near 110) | confirmed | Vector: 89.3 GHz first excursion (-3.12); simulated -2.97 at 110.0 |
| F1 | P wang2024a notes; D wang2024a-a notes; CA bw3db target note | same statement | confirmed | Present in all three; value, approx, measured, bw_measured_to 110 unchanged |
| F1-opt | eo_rolloff 3.2 at 110 not added (rejected) | - | reason confirmed | End value -3.29 dB (vector); optional field; leaving it in notes is acceptable under (g) |
| F2 | EB wang2024b-a bw3db_ghz note; P and D notes | touch near 33-35, cross near 41, below from about 43 | confirmed | Vector: touch 34.3-34.5, first below 39.8-40, wholly below from 42.5 (within approx) |
| F3 | EC wang2025-a bw3db_ghz note; P and D notes; CC target note | first -3 dB near 50-51, oscillation to 63 GHz | confirmed | Raster: orange 49.6-50.7 GHz; blue about -2.9 near 51 (N3b) |
| F4 | EC wang2025-a optical_power_handling_dbm basis measured -> derived, note | value 28, gt unchanged | confirmed | p.3 "35 dBm optical input power (equivalent to -7 dBm and 28 dBm within the modulator)"; p.2 6 dB per GC; p.3 1 dB front-end loss; 35-6-1 = 28; author deduction = derived per (h). Locator incomplete (N2) |
| F4 | D wang2025-a notes "28 dBm is author-deduced" | appended | confirmed | - |
| F5 | P wang2025 notes (ASAP PDF) | wording | confirmed | Cached text has "ACS Photonics XXXX, XXX, XXX-XXX" footers and lettered pages (B, C) |
| F6a | CC targets rf_loss_db_per_cm at_ghz 67 = 1.588 | removed | confirmed | Absent from config; at_ghz targets are not evaluated (SPEC) |
| F6b | CC vpi_l_dc_vcm 2.67 note | new wording | confirmed | 2.67 stated p.3; 0.83 factor p.2; 3.22 x 0.83 = 2.67; basis derived acceptable |
| F6c | CC provenance line.source_ohm locator and note | Fig. 3(h) caption p.4; Fig. 2 caption p.3 | confirmed | Both captions say "source/load impedance 50 Ohm"; page assignment matches the text.md markers |
| F6d | CC provenance hole_r, hole_l class figure_digitized -> project_inference | class + note | confirmed | Fig. 1(c) is a schematic; note added in both |
| F6e | CC new target bw3db_ghz 55, comparable false | added | confirmed | Equals evidence; config parses; periodic line, not evaluated anyway |
| F7a | CA ng_opt 2.25 and CC ng_opt 2.19 source basis simulated | added | confirmed | wang2024a Fig. 1(b) caption "simulated group index ng = 2.25"; wang2025 2.19 simulated (Fig. 3(g) label, p.2) |
| F7b | CA line.load_ohm note | added | confirmed | p.4 50 Ohm termination is in the data-transmission setup; S21 setup not described |
| F8 | D wang2024b-a, -b notes "2.5 um each side" | appended | confirmed | p.5 "2.5 um on each side"; electrode_gap_um empty |
| F9a | references/wang2024a license (deferred) | - | reason confirmed | source.json and text.md header still say CC-BY-4.0; crossref.json lists Optica OA_License_v2 VOR-OA only; references/ is out of batch scope |
| F9b | duplicate SIMIT org (deferred) | - | reason confirmed | Present in p4_03 and p4_04 staged orgs only; not in p3_06 (the audit was wrong on p3_06) and not yet in data/organizations.csv |

Confirmed: 18 changed-cell rows above plus 3 rejected or deferred reasons = 21. Not confirmed: 0.

## Independent headline re-check (task 4)

**wang2024a-a: all clean.**

| Cell | Staged | Source |
|---|---|---|
| length | 6 mm | p.2, Fig. 2(a) caption |
| vpi_dc_v | 4.8 | p.4; Fig. 2(a) label |
| vpil_dc_vcm | 2.8, derived | p.4 "corresponding to VpiL of 2.8 V cm" |
| convention | mzm_push_pull, derived | Not stated by the authors |
| wavelength | 1550 | p.4 |
| n_rf | 2.22, measured | p.3, at 50 GHz |
| ng_opt | 2.25, simulated | Fig. 1(b) caption |
| max_baud_gbd | 208 | p.4, PAM2 |
| max_line_rate_gbps | 528 | Fig. 3 label "176 GBd PAM8 (528 Gbit/s)" |
| max_net_rate_gbps | 405, derived | p.6 |
| IL, ER | empty | IL not stated; Fig. 2(a) shows extinction but the authors give no number, so leaving ER empty is correct |

**wang2024b**
- -a and -b:
  - length 2.5 mm (p.5, Fig. 3(d) caption);
  - V_pi 7.6 V at 1550 nm and 6.4 V at 1310 nm, V_pi L 1.9 and 1.6 V cm (p.5; Fig. 3(g) labels);
  - push-pull pair (p.5);
  - S21 at 1550 nm only (Fig. 3(f) caption);
  - ER 15 dB without a wavelength (Methods p.8), correctly not entered.
- -c: 255 and 510 MHz/V in notes only. Clean.
- Bandwidth: N1.

**wang2025-a**

| Cell | Staged | Source |
|---|---|---|
| length | 7 mm | p.2 "L = 0.7 cm" |
| vpi_dc_v | 4.6 | p.5, Fig. 4(a),(b) |
| vpil_dc_vcm | 3.22, derived | p.3 "calculated" |
| il_onchip_db | 2, approx | p.3, Fig. 4 insets "-2 dB" |
| extinction_ratio_db | 22, approx, static | p.3, inset "22 dB" |
| n_rf | 2.25, approx, extracted_from_figure | Fig. 3(g) plateau |
| max_baud_gbd | 100 | OOK 100 Gb/s |
| max_line_rate_gbps | 112 | PAM-4 56 GBd |
| wavelength | empty | Not stated |

All clean. The optical_power_handling locator is N2.

**Configs.** Both parse. The wang2024a bw3db target note and the wang2025 targets match the evidence values. Provenance classes after F6d are coherent. No other issue found beyond the audit.

## Issues and new findings

**N1 (numerical-convention, non-blocking; coordinator decision). wang2024b-a `bw3db_ghz` 41 approx extracted_from_figure substitutes a figure reading for an explicit author bound.**
- The paper states a number with a bound word: p.5 "more than 40 GHz (Fig. 3(f))". Convention (b) is binding: "any source wording such as over, above ... produces a number plus a qualifiers entry".
- Convention (c), second clause, covers a paper bound that differs from the measured range: bw3db_ghz takes the paper's bound with gt, and bw_measured_to_ghz takes the actual range.
- Canonical rows keep the author statement and put the figure behaviour in the note: sabatti2024-sh, wu2025-a, shamsansari2021-a, lin2025-a.
- The batch's own wang2024a and wang2025 rows follow that precedent; wang2024b is the only row here that replaces the text with a figure reading.
- The audit's objection, that `gt` "misstates a crossing", applies equally to sabatti2024-sh. The note carries the crossing.
- Numerically the difference is small. The vector data show the first excursion below -3 dB at about 40 GHz and the trace wholly below from 42.5 GHz, so "more than 40" holds if the 34.5 GHz touch is ignored.
- Proposed exact fix:
  - D wang2024b-a: `bw3db_ghz` 41 -> 40; `qualifiers` `bw3db_ghz:approx;n_rf:approx;ng_opt:approx` -> `bw3db_ghz:gt;n_rf:approx;ng_opt:approx`; `bw_basis` extracted_from_figure -> measured. `bw_measured_to_ghz` 50 and `bw3db_reference` unspecified stay unchanged.
  - EB wang2024b-a bw3db_ghz entry: value 41 -> 40; basis extracted_from_figure -> measured; locator "p.5 text; p.4 Fig. 3(f)" -> "p.5 text; p.1 abstract; p.4 Fig. 3(f)".
  - EB note -> "paper: more than 40 GHz (abstract: up to 40); Fig. 3(f) trace touches -3 dB near 34.5 GHz, first below near 40, wholly below from about 42.5 (approx. reading)".
  - P wang2024b notes, D notes and the BATCH_REPORT judgment sentence: replace "bandwidth entered as 41 GHz approx (extracted_from_figure) rather than a bound" with "bandwidth entered as the paper's bound 40 GHz gt (measured, convention (b)/(c)); figure crossing about 40-42.5 GHz in notes".
- If the coordinator keeps 41 approx, record it as a deliberate deviation from (b)/(c) in DevLog, so later batches do not diverge.

**N2 (minor). wang2025-a `optical_power_handling_dbm` evidence locator omits the pages that state the deduction.**
- Staged locator: "p.1 abstract; p.5 text; p.4 Fig. 4(b)".
- The "equivalent to ... 28 dBm within the modulator" statement and the 1 dB front-end loss are on p.3; the 6 dB grating-coupler loss is on p.2.
- Proposed locator: "p.1 abstract; p.3 Measurement text (35 dBm input equivalent to 28 dBm in the modulator; 1 dB front-end loss); p.2 (6 dB per grating coupler); p.5 Conclusions; p.4 Fig. 4(b)".
- Related record-only slip: AUDIT_DISPOSITIONS F4 cites the 1 dB front-end loss as p.4. It is p.3 (text.md line 267, inside the page 3 block).

**N3 (minor, wording only; optional).**
- (a) wang2024a: the simulated curve does not cross inside the plot; it reaches -2.97 dB at the 110 GHz edge. Optional precision in EA note, P, D and the CA target: "EE-derived simulated curve reaches -3 dB at the 110 GHz plot edge". The current "crosses near 110" is within approximation and need not change.
- (b) wang2025: "traces first reach -3 dB near 50-51 GHz" fits the 35 dBm trace (below at 49.6-50.7 GHz). The 0 dBm trace only reaches about -2.9 dB near 51 GHz and is first clearly below near 59 GHz, although it is partly hidden by the orange trace. Optional: "35 dBm trace below -3 dB from about 50 GHz, 0 dBm trace near -3 dB from about 51 GHz".

No blocking defect. No not-confirmed disposition.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p4_04`: merge counts {'papers': 3, 'devices': 5, 'orgs': 1, 'evidence': 3}; conflicts 0; validation errors 0; dry run (nothing written).
