---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_08
date: 2026-10-04
scope: data/_staging/p5_08 (sun2026, tatarczak2026, tiberi2026, karakida2026, kholeif2026); papers.csv, devices.csv (9 rows), organizations.csv (2 new orgs), evidence/*.yaml; no sim configs exist for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: tiberi2026 must not merge as staged (rows a and b duplicate tiberi2025 results); the other four papers pass or pass after small corrections
findings: {blocking: 2, numerical: 2, metadata: 2, minor: 5}
---

# Q1 audit (fresh context): p5_08

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), column definitions), `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- Read all of `references/<id>/text.md` for the five papers, including the 4-page karakida2026 PDF (page 4 is the poster). Checked `source.json` for each. No paper has a `crossref.json`. Identity was checked against the PDF page 1 and `data/_staging/batches/p5_08.csv`.
- For tiberi2026 I compared against the canonical tiberi2025 rows in `data/devices.csv`, `data/papers.csv` and `data/evidence/tiberi2025.yaml`, and against `references/tiberi2025/text.md` (Table IV, p.15) and Fig. 9 (`img_p14_1.png`).
- Figures opened, re-rendered from `source.pdf` at 400-800 dpi in a scratchpad:
  - tiberi2026 Fig. 2(a), 2(b), Fig. 3 and Table 1 (p.2-3)
  - tatarczak2026 Fig. 1(a) (p.1)
  - sun2026 Fig. 3(a)-(e) (p.3)
  - karakida2026 Fig. 2(c)-(e) (p.2)
  - kholeif2026 Fig. 1(a)-(i) (p.2)

  All figure readings below are mine and approximate.
- Mechanical check (throwaway scratchpad script) over all 9 rows:
  - Every non-empty evidence-required cell has an equal evidence entry: 0 missing, 0 mismatches.
  - Units equal the schema units, and every basis is in the enum.
  - Every qualifier sits on a populated field.
  - No evidence note and no row note exceeds 25 words (row notes run 18-25 words).
  - The only orphan entries are the two kholeif2026 `derived` entries (F9).
- `uv run python scripts/merge_staging.py data/_staging/p5_08` (dry run) printed:
  `merge counts: {'papers': 5, 'devices': 9, 'orgs': 2, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after my own verification. Its statements match the staged files.
- Limits:
  - These are OFC short papers with no supplementary material and no Crossref record.
  - The tiberi2026/tiberi2025 identity of eye diagrams and the S21 trace is based on visual comparison of the plotted shapes, not on pixel comparison.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| sun2026 | 2 | pass | F11 (minor) |
| tatarczak2026 | 1 | pass after corrections | F5 (numerical) |
| tiberi2026 | 4 | fail as staged; pass after F1-F4 and F7 | F1, F2 (blocking), F3 (numerical), F4 (minor), F7 (metadata) |
| karakida2026 | 1 | pass | F10 (minor) |
| kholeif2026 | 1 | pass | F8, F9 (minor) |
| organizations | 2 new | pass after corrections | F6, F7 (metadata) |

## tiberi2026 vs tiberi2025: what is new

| tiberi2026 item | Same as tiberi2025? | Evidence |
|---|---|---|
| 67 GHz S21, 40 um C-band (Fig. 2(b)) | yes | Same trace shape as tiberi2025 Fig. 9(b), renormalized to 0 dB at the peak. Both show a 1 GHz point about 0.7 dB below the 5 GHz maximum, a shoulder near 40-45 GHz and data ending near 67 GHz at about -3.4 dB. tiberi2025 states it is the 40 um, 40 nm gate device. |
| Table 1, C 40 um 50/60/80 Gb/s (SNR 5.17/4.02/2.38, BER 1.2e-7/2.9e-5/8.5e-3, ER 1.05/1.02/0.82) | yes | Identical to the "Filtered" columns of tiberi2025 Table IV (p.15). The 60 and 80 Gb/s eyes in Fig. 3(a) match tiberi2025 Fig. 9(c). |
| Table 1, C 100 um 50/60/80 Gb/s (4.84/3.75/2.31; 6.6e-7/8.9e-5/1e-2; 1.89/1.74/1.41) | yes | Identical to the tiberi2025 Table IV L = 100 um filtered rows. The DB holds them only as a sentence in the tiberi2025-a notes, not as a row. |
| O 40 um, 40 Gb/s eye | yes (demo); no (numbers) | The 40 Gb/s O-band eye matches the tiberi2025 Fig. 9(c) 40 Gbit/s O-band eye, which is tiberi2025-c. SNR 4.62, BER 4.4e-2 and eye ER 0.81 dB are not in tiberi2025: Table IV is C-band only. |
| Static O-band ER about 2 dB at 1310 nm, ideal bias about -6 V (Fig. 2(a), p.1) | no | tiberi2025-c notes say ER and wavelength are not stated for the O-band device. |
| Static C-band ER about 3.5 dB, 40 um (Fig. 2(a)) | conflicting | tiberi2025-a has a 4 dB static ER (Table I; 4.5 dB in a 20 V sweep). Fig. 2(a) reads about 3.4 dB over -30 to +10 V (my reading). |
| Drive about 3 Vpp at the EAM, <100 fJ/bit (p.2) | conflicting | For the same eye measurements (same BER values) tiberi2025 p.15 states Vpp about 7 V and 58 fJ/bit. |
| O 100 um, 40 Gb/s (SNR 4.81, BER 4.1e-2, ER 0.81) | no | Not in tiberi2025 (Table IV is C-band only; Fig. 9(c) shows only the 40 um O-band device). |

## Findings

### Blocking

**F1 (blocking). tiberi2026-a duplicates tiberi2025-a.**
- Rows/files:
  - `data/_staging/p5_08/devices.csv` row tiberi2026-a: bw3db_ghz 67, bw_measured_to_ghz 67, max_baud_gbd 80, max_line_rate_gbps 80, modulation_format with the 50/60/80 Gb/s BERs, extinction_ratio_db 3.5, drive_vpp_v 3, energy_per_bit_fj 100 (lt).
  - The matching entries in `evidence/tiberi2026.yaml`.
- Source: tiberi2026 p.2 Fig. 2(b) and p.3 Table 1, compared with tiberi2025 Fig. 9(b)-(c) and Table IV (p.15). See the table above: the bandwidth trace, BER/SNR/ER values and eye diagrams are the earlier paper's results.
- Two further problems if the row were kept:
  - bw_basis is `measured`, while canonical tiberi2025-a carries the same 67 GHz as `derived` + approx. tiberi2025 p.15: "f3dB is extrapolated from -55.5 to -58.5 dB".
  - The 3 Vpp / <100 fJ/bit estimate contradicts the 7 V / 58 fJ/bit tiberi2025 states for the same eye measurements.
- Proposed change:
  - Drop tiberi2026-a and its evidence entries. Keep the bandwidth and system results only on tiberi2025-a.
  - Record a cross-reference in the tiberi2026 papers.csv `notes`, for example: "40 um C-band 67 GHz S21 and Table 1 C-band BERs re-report tiberi2025-a (Table IV); new here: static ER about 3.5 dB, Vpp about 3 V, <100 fJ/bit estimate."
  - Keep static ER 3.5 dB, 3 Vpp and <100 fJ/bit as `context_values` in `evidence/tiberi2026.yaml`.
  - Optionally (coordinator decision, canonical file), add one sentence to the tiberi2025-a notes pointing to tiberi2026.

**F2 (blocking). tiberi2026-b (100 um C-band) re-reports tiberi2025 Table IV.**
- Rows/files: `devices.csv` row tiberi2026-b (length_mm 0.1, max_baud_gbd 80, max_line_rate_gbps 80, modulation_format BER 6.6e-7, 8.9e-5, 1e-2) and its evidence entries.
- Source: tiberi2026 Table 1 C/100 rows equal the tiberi2025 Table IV L = 100 um "Filtered" rows exactly (SNR, BER and ER at 50, 60 and 80 Gbit/s).
- Proposed change:
  - Drop tiberi2026-b and its evidence entries. Mention it in the cross-reference note of F1 ("Table 1 C-band 100 um rows equal tiberi2025 Table IV").
  - Optionally, the coordinator may later add a tiberi2025 100 um C-band row sourced from tiberi2025 Table IV, the earlier primary source. It is not added from this batch.

### Numerical

**F3 (numerical). tiberi2026-c repeats the tiberi2025-c 40 Gb/s headline; only the static data and BER are new.**
- Cells: `devices.csv` tiberi2026-c max_baud_gbd 40, max_line_rate_gbps 40, modulation_format "NRZ 2^7-1 PRBS at 40 Gb/s; BER 4.4e-2", driver.
- Source:
  - tiberi2026 Fig. 3(a) shows the 40 Gb/s O-band 40 um eye, which visually matches tiberi2025 Fig. 9(c). tiberi2025-c already carries max_line_rate_gbps 40 for the 40 um, 400 nm-wide O-band device.
  - New in tiberi2026: static ER about 2 dB at 1310 nm (Fig. 2(a), p.1 text; my reading about 2.0 dB from 0 V to +10 V), ideal bias about -6 V, SNR 4.62, BER 4.4e-2 and eye ER 0.81 dB (Table 1).
- Proposed change:
  - Keep tiberi2026-c with wavelength_nm 1310, extinction_ratio_db 2 (approx, static) and rib_width_nm 400.
  - Empty max_baud_gbd and max_line_rate_gbps (and remove their evidence entries) so the 40 Gb/s point is not plotted twice.
  - Set modulation_format to "NRZ 2^7-1 PRBS, 40 Gb/s demo as tiberi2025-c; BER 4.4e-2, eye ER 0.81 dB (Table 1)".
  - Set the row notes to: "Same 40 um O-band device and 40 Gb/s eye as tiberi2025-c (likely); new: static ER about 2 dB at 1310 nm, ideal bias about -6 V, Table 1 BER."
  - Alternative if the coordinator prefers no partial row: drop -c as well and keep static ER, bias and BER as context_values with the same cross-reference.

**F5 (numerical). tatarczak2026-a drive_vpp_v 2.0 is a stated drive requirement, not a measured demo swing; its basis is mislabelled.**
- Cell: `devices.csv` tatarczak2026-a drive_vpp_v 2.0. In `evidence/tatarczak2026.yaml` it has basis `measured` with the note "not stated as a measurement result". The basis and note contradict each other.
- Source: p.2 Sec. 2.1, "This modulator at T=20 C requires a driver voltage swing of 2.0 Vppd on 100 Ohm load." The only system result in the paper is the simulated 426 Gb/s eye (Fig. 1(c)). The schema defines drive_vpp_v as "RF drive amplitude used in the system demo".
- Proposed change (preferred): empty drive_vpp_v, remove its evidence entry, and move it to a context value: `drive_requirement: {value: "2.0 Vppd on 100 ohm, T = 20 C", locator: "p.2 Sec. 2.1", note: "Requirement stated by authors; differential; feeds simulated eye"}`.
- Alternative: keep 2.0 with evidence basis `author_estimate` and a note "required differential swing (Vppd, 100 ohm); no measured transmission".

### Metadata

**F6 (metadata). Use "NVIDIA Corporation" for the NVIDIA org.**
- Current:
  - `data/_staging/p5_08/organizations.csv` stages "NVIDIA Corporation" (sun2026).
  - `data/_staging/p5_02/organizations.csv` stages "NVIDIA" (patel2026 companies).
  - `data/organizations.csv` has no NVIDIA row.
- Source:
  - sun2026 p.1 prints "NVIDIA Corporation, Santa Clara, CA, USA" and "NVIDIA Corporation, Yokneam, Israel".
  - patel2026 p.1 prints "NVIDIA, 2788 San Tomas Expressway, Santa Clara".
  - Convention (e) asks for the official English name, and the DB precedent is "Intel Corporation".
- Proposed change:
  - Keep the p5_08 row `NVIDIA Corporation,company,US,north_america,,...`. Extend its note: "Santa Clara, CA (sun2026, patel2026 p.1, written NVIDIA in patel2026); Yokneam, Israel site (sun2026)".
  - In p5_02, delete the "NVIDIA" org row and change patel2026 `companies` from "NVIDIA" to "NVIDIA Corporation".
  - Merge order does not matter once both batches use the same name.

**F7 (metadata). CORNERSTONE country is not printed in the paper.**
- Current: `organizations.csv` row `CORNERSTONE,facility,GB,europe,,"Named as the SOI fab in tiberi2026 p.1; host institution not stated in the paper, country from outside the paper"`. tiberi2026 papers.csv lists foundry_or_fab CORNERSTONE.
- Source: tiberi2026 p.1, "selectively planarized 220 nm silicon-on-insulator (SOI) platform fabricated at CORNERSTONE [8]". No address and no host institution are printed. CORNERSTONE is a named fab, not an author affiliation, so it has no printed affiliation address.
- Proposed change: keep the org, because the paper names it as the fabricating facility. The validator requires an ISO country, and the DB precedent for named fabs without an address is the same (CompoundTek Pte, Semiconductor Manufacturing International Corporation, Binnig and Rohrer Nanotechnology Center). Make the country traceable to a primary source already in the DB. New notes:
  "SOI fab named in tiberi2026 p.1, no address printed; GB from the CORNERSTONE URL (University of Southampton) in tiberi2025 Ref. [103], cited as tiberi2026 Ref. [8]".
- Leave parent_org empty, since the host is not printed in either paper's affiliation list as CORNERSTONE's host.
- Stricter alternative if the coordinator applies the rule literally: drop CORNERSTONE from foundry_or_fab and organizations, and keep "SOI fabricated at CORNERSTONE (p.1)" in process_name only.

### Minor

**F4 (minor). tiberi2026-d (kept) and the paper row need consistency edits.**
- tiberi2026-d is genuinely new (100 um O-band, Table 1 only). Keep it.
- Add rib_width_nm 400, basis extracted_from_figure, locator "p.2 Fig. 1(a)", note "O-band cross-section label". This matches -c, since Fig. 1(a) gives the per-band width.
- max_baud_gbd evidence basis is `derived` on -d (and on -c if kept). The DB precedent (tiberi2025) uses `measured` with the note "NRZ, one bit per symbol". Change to measured.
- tiberi2026 papers.csv notes:
  - Replace "Four rows (C/O band x 40/100 um). Table 1 BER values coincide with tiberi2025 Table IV ... S21 band and length not stated: assigned to 40 um C-band row" with the outcome of F1-F3.
  - Example: "Two rows (O-band 40 and 100 um). C-band 67 GHz S21 and Table 1 C-band rows re-report tiberi2025 (Fig. 9(b), Table IV): not duplicated. 40 Gb/s O-band 40 um eye as tiberi2025-c."

**F8 (minor). kholeif2026 locator and paper-internal inconsistencies.**
- The energy_per_bit_fj evidence locator "p.1 abstract; p.3 Sec. 4" is wrong in part. The abstract does not give 12.8 aJ/bit; it is in the p.1 Introduction and the p.3 Summary. Proposed locator: "p.1 Introduction; p.3 Sec. 4". The value 0.0128 is fine: 4/56 x 18 fF x (0.1 V)^2 = 12.9 aJ (my arithmetic). The 13 aJ in Sec. 3 is rounding.
- The 60 GBd PAM4 and 20 GBd PAM8 energies do not match the voltages the paper pairs with them. My arithmetic with the paper's own formulas and C = 18 fF:
  - 20/72 x 18 fF x (0.14 V)^2 = 98 aJ, not 60.5.
  - 4/56 x 18 fF x (0.11 V)^2 = 15.6 aJ, not 25.
  - The printed energies instead fit PAM4 at 110 mVpp and PAM8 at 140 mVpp.

  The modulation_format cell quotes the text (PAM4 60 GBd at 140 mVpp, PAM8 20 GBd at 110 mVpp) faithfully. Proposed: add to the `other_points` context note "energies imply swapped voltages (60.5 aJ fits 110 mVpp, 25 aJ fits 140 mVpp)". No cell change.
- IL: Fig. 1(c) label reads "IL: 0.74 dB" (my reading of the p.2 render), matching the text. Only the caption says 0.75. Add "Fig. 1(c) label 0.74" to the il_onchip_db evidence note.
- NDR: the Fig. 1(g) star at 100 GBd PAM4 reads about 150 Gb/s (AIR diamond about 162). This supports 152 over the caption's 160. The cell is correct.

**F9 (minor, mechanical). kholeif2026 `derived` entries for empty cells.**
- `evidence/kholeif2026.yaml` `derived` holds tuning_nm_per_v 0.208 and fsr_nm 2.28, but both CSV cells are empty (by design, notes "FSR and tuning not entered in nm").
- Proposed change: remove both `derived` entries (`derived: []`). The paper's 25.5 GHz/V and 279.5 GHz already sit in `context_values`. Keeping distiller conversions for empty cells invites a later fill with distiller arithmetic.

**F10 (minor). karakida2026 band, context label, static drive.**
- band `c_band`, but wavelength_nm is 1515 nm (IL/ER, Fig. 2(d)), which lies below the C-band; only the S21 at 1532 nm is in the C-band. Keep c_band, and add "1515 nm is below C-band" to the wavelength evidence note. Alternatively set band `other`. Judgment call.
- `context_values.abstract_loss` is labelled "abstract", but the 2 dB claim is in p.1 Introduction and p.3 Conclusion ("low-loss (2 dB)"). Rename it `loss_claim` and set the locator to "p.1 Sec. 1; p.3 Sec. 4". Fig. 2(d) supports the claim as the reflectance at -10 V, about -2.2 dB (my reading).
- drive_vpp_v 10 is a static swing (Fig. 2(d), -5 to +5 V); there is no data transmission. It is consistent with the DB precedent for surface-normal devices (soma2025, fukui2025). Keep it, with the note already saying "static drive".

**F11 (minor). sun2026 tuning notes.**
- Values verified (my reading of p.3 Fig. 3(e), mean-diamond centres): simple about 42.6 pm/V and stable about 47.4 pm/V, which match 0.0426 and 0.0474 nm/V with approx and basis extracted_from_figure.
- The paper gives neither the bias range nor the polarity behind "phase efficiency (pm/V)". Add "bias range not stated" to both tuning evidence notes.
- The plot means differ by about 11 percent against the text's "~15%". This is already recorded in context.

## Verified clean

- sun2026:
  - Identity, authors, venue and DOI match the PDF p.1 and the batch row. Affiliations (NVIDIA Corporation, Santa Clara US and Yokneam IL) give countries US;IL.
  - foundry_or_fab is correctly empty ("commercial CMOS foundry", not named).
  - 270 nm SOI / 200 nm etch / 93 nm junction offset, the 75 dies and the 31-of-40 designs all match the text.
  - Two rows (stable vs reference ring) is a valid device split. Pooling 5 and 10 um radii is defensible because the text says efficiency has little radius dependence; the radius-dependent loss stays in context.
- tatarczak2026:
  - Identity and Coherent Corp. reuse are correct.
  - Fig. 1(a) (my reading at 600 dpi): the 0 GHz to 100 GHz axis spans x 160-877 px. The trace crosses the authors' -3 dB line at about 99-100 GHz and ends at about 109-110 GHz near -5.4 dB.
  - The bandwidth is therefore correctly entered as a crossing: bw3db_ghz 100 approx, extracted_from_figure, reference dc (trace normalized at 0 GHz), bw_measured_to_ghz 110 approx. A `gt` qualifier would be wrong because the trace does reach -3 dB in range.
  - The simulated eye and link budget are kept out of the cells.
- tiberi2026:
  - Identity, affiliations (University of Cambridge, National Inter-University Consortium for Telecommunications, CamGraPhIC srl) and countries GB;IT are correct.
  - Fig. 2(b) (my reading): measured points reach -3 dB near 60-66 GHz and end near 67 GHz at about -3.4 dB. A `gt` qualifier would be wrong; this is moot after F1.
  - The RC-model 100 GHz 6 dB bandwidth and the Fig. 1(b) simulated ERs are correctly kept out of the cells.
  - Static ER readings: O-band about 2.0 dB and C-band about 3.4 dB.
- karakida2026:
  - Identity and affiliation (The University of Tokyo) are correct. "Takeda Sentanchi Super Cleanroom" reuses the existing org for "Takeda Clean Room, the University of Tokyo" ("fabricated in part").
  - Fig. 2(e) (my reading at 800 dpi): the measured trace first reaches -3 dB near 37-40 GHz and the fit crosses at about 40 GHz. bw3db_ghz 40 with basis derived (the authors' fit) is correct, the note that the trace also crosses is accurate, and no gt applies.
  - bw_measured_to_ghz 70 approx: the axis and trace end near 69-70 GHz.
  - IL wording is correct. Fig. 2(d) marks "insertion loss = 3.0 dB" at -5 V and ER 2.0 dB over the -5 to +5 V (10 V) swing at 1515 nm. il_onchip_includes ("low-loss bias state (-5 V) relative to a reference Au mirror") matches. The excludes entry is correctly labelled derived/not stated.
  - Fig. 2(c): the 6 nm arrow spans the -10 V and +10 V minima, consistent with the authors' 0.30 nm/V (basis derived). Q about 40 is correct.
  - The stack (130 nm Au / 370 nm JRD1 / 30 nm Au, upside down on quartz) is correct, and r33 and the simulated values are kept in context.
- kholeif2026:
  - Identity and orgs (Karlsruhe Institute of Technology, SilOriX GmbH) are correct.
  - Correct values: IL 0.74 dB on-chip, ER 18.6 dB static, Q 12 900 (Lorentzian fit, derived, approx), wavelength 1563.1 nm, 2 x 86 um phase shifters, 160 nm rails, 7.5 um coupler with 220 nm gap.
  - il_fiber_to_fiber_db 13.75 approx "in operation" includes the 2 dB modulation loss and 11 dB of grating couplers (0.74 + 2 + 11 = 13.74, consistent).
  - Other system values: 220 mVpp (50 ohm-load convention, noted), 100 GBd PAM4 200 Gb/s, BER 3.8e-2, NDR 152 (derived), C 18 fF (author_estimate), 12.8 aJ/bit (derived).
- All papers:
  - source_type conference, access unknown, license publisher-copyright with a `license_notice` context value quoting the Optica footer, redistribution restricted_local_only, audit_status needs_audit, published_on empty (no crossref.json), repro_grade C.
  - No sim config, which is correct: none is a dielectric TWE device.
- The paper_id sun2026 coexists with the canonical sun2026a (a different paper: Zhongpeng Sun, BTO metasurface). This is allowed under the suffix rule; no collision.
