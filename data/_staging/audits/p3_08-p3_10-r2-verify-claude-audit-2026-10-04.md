---
verifier: fresh-context subagent
task: verify round-2 audit corrections for p3_08, p3_09, p3_10
date: 2026-10-04
scope: p3_08 (chiang2025, taghavi2026, akazawa2026), p3_09 (falcone2026, berman2026, nenezic2026), p3_10 (anderson2025, chelladurai2025, suceava2025, ulrich2025, yu2024); dispositions data/_staging/p3_08/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_10/AUDIT_DISPOSITIONS_R2.md; audit data/_staging/audits/p3_08-p3_10-r2-claude-audit-2026-10-03.md
mode: read-only (only this file written; git diff/show read-only; no build_views, no merge, no network)
verdict: corrections confirmed with minor issues (1 locator error, 1 evidence note over the 25-word limit, 1 pre-existing missing qualifier on ulrich2025-mzi vpil_dc_vcm)
counts: {changed_cells: 10, confirmed: 9, not_confirmed: 1, unrecorded_changes: 0}
---

# Verification of round-2 corrections: p3_08, p3_09, p3_10

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` against `HEAD` (scratchpad script, rows keyed by paper_id/device_id, filtered to the 11 in-scope papers) and `git diff HEAD` of the 11 evidence files.
- Out-of-scope changes seen and ignored: papers/devices rows of boynton2020, he2019, li2020, lin2025a, lin2026a, mao2024, meng2023, renaud2023, shen2024, tran2026, valdez2022, valdez2023, wang2018, weigel2018, xu2022; organizations.csv row "Sandia National Laboratories" (notes now cite valdez2022/valdez2023/weigel2018; no in-scope paper references it).
- No changes in chiang2025, falcone2026, berman2026, nenezic2026, anderson2025, chelladurai2025, yu2024 (CSV rows and evidence files identical to HEAD).
- Sources: `references/akazawa2026/text.md` p.3-5 and `figures/page_04.png` (opened); `references/taghavi2026/text.md` p.6, p.8, p.13, p.15 and `figures/page_13.png` (opened); `references/ulrich2025/text.md` p.6, p.18-22, p.23-24; `references/suceava2025/source.json`. Rules: `.claude/skills/eo-modulator-distill/SKILL.md`, conventions (a)-(k) in `data/schema/devices.schema.yaml`, `scripts/validate_db.py`, `scripts/build_views.py` (`load_evidence`).

## Per-paper summary

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| chiang2025 | 0 | - | - | no changes |
| taghavi2026 | 2 | 2 | 0 | corrections confirmed |
| akazawa2026 | 3 | 2 | 1 | issues (evidence locator page) |
| falcone2026 | 0 | - | - | no changes |
| berman2026 | 0 | - | - | no changes |
| nenezic2026 | 0 | - | - | no changes |
| anderson2025 | 0 | - | - | no changes |
| chelladurai2025 | 0 | - | - | no changes |
| suceava2025 | 1 | 1 | 0 | corrections confirmed |
| ulrich2025 | 4 | 4 | 0 | corrections confirmed; minor follow-ups (evidence note length, pre-existing missing `vpil_dc_vcm:approx`) |
| yu2024 | 0 | - | - | no changes |

## Changed cells

| # | File / row / field | Old -> new | Source locator | Disposition | Verdict |
|---|---|---|---|---|---|
| 1 | devices.csv / akazawa2026-a / `drive` | `` -> `unspecified` | p.3 (AMZI characterization of 500/1000 um phase shifters, no drive stated); p.4 Fig. 3 caption and p.5 text (push-pull only for circuit MZI pairs) | R2-F2 | confirmed (SKILL rule 3 requires `drive` when Vpi/VpiL filled; enum value `unspecified` is correct for a single phase shifter, same as taghavi2026-a) |
| 2 | evidence/akazawa2026 / new entry `drive` | none -> {value unspecified, basis derived, locator "p.3 Fig. 2(d); p.5 Fig. 3(b) caption", note "single phase shifter drive not stated; circuit MZI pairs operated push-pull"} | Fig. 3 caption is on PDF p.4 (text.md marker `page 4`, lines 402-410; page_04.png shows Fig. 3 and its caption); the push-pull sentence in running text is on p.5 | R2-F2 | not confirmed (locator only): value, basis and note are right; "p.5 Fig. 3(b) caption" should be "p.4 Fig. 3(b) caption; p.5 text" |
| 3 | devices.csv / akazawa2026-a / `notes` | appended "p.5 also gives 2.3 V as approximately Vpi for 600 um." | p.5: "a bias voltage of 2.3 V, approximately corresponding to Vpi for a 600-um-long phase shifter"; p.4 "Vpi = 2.2 V" | R2-F7 | confirmed |
| 4 | evidence/taghavi2026 / taghavi2026-a `cladding` note | "FN-LC layer thickness 10 to 50 nm per Fig. 4 caption" -> "FN-LC overlayer 10-50 um (p.6 text) vs 10-50 nm (Fig. 4(d) caption, p.15); not reconciled" | p.6 "10 ~50 um material on top protects the ~500 nm underneath"; p.15 Fig. 4(d) caption "10~50 nm thick FN-LC" | R2-F5 | confirmed (cell value unchanged) |
| 5 | devices.csv / taghavi2026-a / `notes` | appended "electrode_gap_um = d1, metal electrode to waveguide core distance (Fig. 2(a), p.8); counter-contact is through the doped Si slab." | p.8 "electrode-to-core distance (d1)"; p.8 Eq. 5 "dFN-LC (i.e., about d1 in Fig. 2(a))"; p.13 Fig. 2(a) label "d1=6" (render opened); caption: Si-N slab to Si-N++ ohmic contact on the other side | R2-F6 | confirmed |
| 6 | papers.csv / suceava2025 / `notes` | "source.json still shows license unverified and restricted_local_only (not edited)." -> "source.json updated by the coordinator (CC-BY-4.0, license verified); source_type decision pending." | `references/suceava2025/source.json`: license CC-BY-4.0, license_verified true, redistribution allowed_with_attribution, content_note "Coordinator decision pending on source_type" (committed in d3482a5) | R2-F3(a) | confirmed |
| 7 | devices.csv / ulrich2025-mzi / `notes` | appended "VpiL 1.04 uses meander-corrected r_eff 345 pm/V (280 pm/V measured / 0.81, Supplement Eq. 20-22); measured device: 0.084 V/um x 10 um x 1.537 cm = about 1.29 V cm." | p.6 "0.084 V/um results in a pi phase shift - this corresponds to VpiL about 1.04 +/- 0.08 Vcm"; p.22 Eq. 20 (r_eff,meas about 0.81 r_eff), Eq. 21 (r_eff = r_eff,meas/0.81 about 345 pm/V; r_eff,meas about 280 pm/V = phase shift divided by the full length), Eq. 22 (VpiL = lambda d/(Gamma n_o^2 n_g r_eff) about 1.04, d = 10 um); p.18 length "roughly 15.37 mm" | R2-F1 | confirmed (my arithmetic: 0.084 x 10 x 1.537 = 1.29 V cm; 1.04 x 345/280 = 1.28 V cm; Eq. 22 with lambda 1.47 um, Gamma 0.43, n_o about 2.28, n_g 1.84, r_eff 345 gives 1.04, with 280 gives 1.28) |
| 8 | evidence/ulrich2025 / vpil_dc_vcm `locator` | "p.6 text; p.22 Eq. 22" -> "p.6 text; p.22 Eq. 20-22" | Eq. 19-22 all under the `page 22` marker | R2-F1 | confirmed |
| 9 | evidence/ulrich2025 / vpil_dc_vcm `note` | appended "; uses meander-corrected r_eff 345 pm/V; device as measured about 1.29 V cm (0.084 V/um x 10 um x 1.537 cm)" | as row 7 | R2-F1 | confirmed in content; note is now 32 words, over the 25-word limit of SKILL rule 8 (see Issues) |
| 10 | evidence/ulrich2025 / bw_measured_to_ghz `note` | "1 MHz upper limit; setup resonance at 5 MHz" -> "...; data recorded to 20 MHz (Fig. S10a), setup resonances above 1 MHz (Fig. S10b)" | p.24 Supplementary Fig. 10 caption: "(a) Bandwidth measurement ... up to 20 MHz ... resonance peak at 5 MHz"; "(b) ... after 1 MHz the system itself seems to have some intrinsic resonances"; p.23 text "from 1 MHz onwards" | R2-F4 | confirmed (cell 0.001 unchanged; keeping it is the auditor's first option and is defensible) |

Evidence-vs-CSV equality for changed cells: akazawa2026-a `drive` = `unspecified` in CSV and entry; no other changed cell is evidence-backed by value (notes only). `uv run python scripts/validate_db.py`: `0 error(s)`.

## R2-F1 independent judgment (ulrich2025-mzi `vpil_dc_vcm`)

Keeping 1.04 in the cell is consistent with the rules.

- SKILL rule 4 and the schema column description ("as reported") put the reported VpiL in `vpil_dc_vcm`. The paper reports exactly one VpiL, 1.04 +/- 0.08 V cm, and attributes it to this device (p.6 "this corresponds to", Eq. 22). 1.29 V cm is not stated anywhere in the paper; it is auditor arithmetic (0.084 V/um x d x L), so per rule 1 and rule 4 it must not replace the reported cell.
- Convention (a) (headline-Vpi rule) governs per-arm vs MZM conventions; it does not ask for re-normalization of a reported value. The row already has `vpi_convention` = mzm_single_arm and `drive` = single_ended (only the bottom arm is modulated, Fig. 3(b) caption), which is right.
- Convention (h): 1.04 is computed by the authors from the measured, meander-compensated r_eff with the formula of Eq. 22, so `derived` (cell `vpi_basis` and evidence basis) is correct; `measured` would be wrong. No `vpi_dc_v` is filled, so `vpi_basis` summarizes this field.
- Not adding a `derived` list item with 1.29 is correct, but the disposition's reason is inaccurate. `validate_db.py` (lines 175-180) checks an `entries` item first and compares a `derived` item to the cell only when no entry exists, so a 1.29 item would not fail validation. The real reasons: `build_views.py` `load_evidence` (lines 385-394) lets a `derived` item overwrite the paper-stated entry for the same (device, field), so the view would show the 1.04 cell with locator "derived", an empty note and the 1.29 formula; and rule 11 reserves the `derived` list for cells filled by our own arithmetic.
- Filling `vpi_dc_v` = 0.84 V (0.084 V/um x 10 um) as a derived value is not recommended. The paper gives a field, not a voltage, and the row note says that no Vpi in volts is derived; it would also make the row internally inconsistent with 1.04.

What the row should be:
- `vpil_dc_vcm` = 1.04 (unchanged).
- `vpi_basis` = derived (unchanged); evidence basis derived (unchanged); locator "p.6 text; p.22 Eq. 20-22" (as now).
- `qualifiers`: add `vpil_dc_vcm:approx`. The paper writes "VpiL ≈ 1.04 ± 0.08 Vcm" on p.6 and in Eq. 22, and convention (b) turns approximate wording into an approx qualifier. This omission predates round 2 and neither audit flagged it. Current qualifiers: `wavelength_nm:approx;length_mm:approx;bw3db_ghz:gt`; proposed: `wavelength_nm:approx;length_mm:approx;bw3db_ghz:gt;vpil_dc_vcm:approx`.
- Row `notes`: keep the appended sentence (accurate). An optional addition: "(the 0.81 factor assumes full poling in the bends, which the authors say overestimates the bend contribution, p.21)".
- Evidence note, cut to 24 words (the full arithmetic stays in the row note): "Eq. 22 with meander-corrected r_eff 345 pm/V (280/0.81); +/- 0.08; 20 Hz; as-measured device about 1.29 V cm (0.084 V/um x d x L)".
- Optional: tag `meander_corrected_vpil` so that VpiL views can flag that the plotted value is normalized for crystal orientation.

## Rejected and deferred findings

- R2-F3(b) (suceava2025 source_type/url/access, journal vs arXiv identity): deferred to the coordinator. Supported: `source.json` content_note itself says "Coordinator decision pending on source_type", and the license/redistribution cells are already correct. No rejections in either disposition file.
- p3_09: no findings, no changes (confirmed by diff).

## Metadata and notes check

All changed notes are factual and contain no paths, emoji or private information. The disposition files contain repo-relative paths only.

## Issues and exact proposed fixes

1. akazawa2026 evidence, entry (akazawa2026-a, drive): `locator` "p.3 Fig. 2(d); p.5 Fig. 3(b) caption" -> "p.3 Fig. 2(d); p.4 Fig. 3(b) caption; p.5 text". The same p.5 attribution of the caption appears in R2-F2 of the audit and the disposition.
2. ulrich2025 evidence, entry (ulrich2025-mzi, vpil_dc_vcm): `note` (32 words, SKILL rule 8 limit 25) -> "Eq. 22 with meander-corrected r_eff 345 pm/V (280/0.81); +/- 0.08; 20 Hz; as-measured device about 1.29 V cm (0.084 V/um x d x L)".
3. devices.csv ulrich2025-mzi `qualifiers` (pre-existing): append `;vpil_dc_vcm:approx` (p.6 and p.22 Eq. 22 "≈ 1.04 ± 0.08"; convention (b)).
4. Disposition text R2-F1 (record only): the stated reason for omitting the `derived` item should read "a derived item would override the paper-stated entry in build_views (load_evidence) and the derived list is reserved for our own arithmetic in a cell". The current reason ("validate_db compares it to the cell") is not what the code does when an entry exists.

## Unrecorded changes

None. All 10 in-scope changed cells are recorded in the R2 dispositions (R2-F1, F2, F3(a), F4, F5, F6, F7).
