---
verifier: fresh-context subagent
task: verify round-2 audit corrections for p3_16 and p3_17
date: 2026-10-04
scope: p3_16 (wu2023, luan2026, luan2026a, lee2020, lee2020a), p3_17 (giambra2021, tiberi2025, heidari2022, navarro2026, gui2022, lotkov2024)
inputs: data/_staging/p3_16/AUDIT_DISPOSITIONS_R2.md, data/_staging/p3_17/AUDIT_DISPOSITIONS_R2.md, data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md
mode: read-only except this file; git diff HEAD / git show HEAD on data/ only; no network
verdict: corrections confirmed for all 11 papers; no unrecorded change; one optional wording refinement (lotkov2024 bw6db evidence note)
counts: {changed_cells: 21, confirmed: 21, not_confirmed: 0}
validator: "uv run python scripts/validate_db.py -> 0 error(s)"
---

# Verification of R2 corrections: p3_16 and p3_17

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` against `git show HEAD:` (throwaway script in the scratchpad), plus `git diff HEAD` on the 11 evidence files. Changes for papers outside scope (other correction authors, including p3_05..p3_07) were ignored.
- In-scope changes exist only in luan2026, tiberi2025, heidari2022 and lotkov2024. No change in papers.csv for any of the 11 papers. The three changed organizations.csv rows (Binnig and Rohrer Nanotechnology Center, National Information Optoelectronics Innovation Center, Sandia National Laboratories) are not referenced by any of the 11 papers.
- Sources: `references/<id>/text.md`; figure readings from the cached embedded images. heidari2022 Fig. 3(a) was re-extracted from `source.pdf` page 4 at native resolution (406 x 328 px, xref 70) and read by pixel position against the detected axis ticks. All figure readings are approximate.

## Priority check: heidari2022-a `extinction_ratio_db` 13

Independent pixel reading of Fig. 3(a) (p.4, native embedded image):
- Plot frame: x 68..387 px, y 17..275 px. Y ticks detected at y = 17, 68, 120, 171.5, 223, 275 px = 0, -4, -8, -12, -16, -20 dB (about 12.9 px/dB). X ticks at x = 68, 149.5, 231, 313 px = -4, -3, -2, -1 V; the 0 V tick sits on the right frame (about 387 px, slightly short of uniform spacing; does not affect the reading since the curve is flat there).
- 1550 nm (blue circles) marker centroids: first point at x about 69 px (-4.0 V), y about 55 px -> about -3.0 dB; last point at x about 385.5 px (0 V), y about 222.5 px -> about -15.9 dB. Plateau from about -1.25 V to 0 V at -15.6 to -15.9 dB. The steep part runs from about -3.7 V (-4.0 dB) to about -1.5 V (-15.3 dB), slope about 5 dB/V, consistent with the caption's 5.2 dB/V.
- Swing: about 12.9 dB over -4 V to 0 V. 13 dB with `approx` is confirmed.
- er_type static: confirmed. Fig. 3(a) is a DC drive-voltage sweep of transmission ("Electro-optical response of the device at different drive voltage"); the RF data are Fig. 3(c).
- Wavelength: 1550 nm curve used; the row's `wavelength_nm` is 1550 (the S21 laser wavelength, p.3). Consistent.
- Voltage span 0 to -4 V: confirmed (full x-axis range; the note gives the endpoint levels).
- Basis `extracted_from_figure`: correct under convention (h). Locator "Fig. 3(a) p.4": Fig. 3 image and caption are on PDF page 4 (`<!-- page 4 -->`). Correct.
- The conclusion's ">5 dB" (p.4) has no voltage attached and was correctly not used.
- Side observation (no change needed): row `il_basis` stays `simulated` (IL 0.7 dB); it summarizes the IL headline only, and the ER evidence basis governs the ER cell.

## Per-paper table

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| wu2023 | 0 | 0 | 0 | no changes (none required) |
| luan2026 | 5 | 5 | 0 | corrections confirmed |
| luan2026a | 0 | 0 | 0 | no changes (none required) |
| lee2020 | 0 | 0 | 0 | no changes (none required) |
| lee2020a | 0 | 0 | 0 | no changes (R2-F7 no change; agreed) |
| giambra2021 | 0 | 0 | 0 | no changes (none required) |
| tiberi2025 | 5 | 5 | 0 | corrections confirmed |
| heidari2022 | 5 | 5 | 0 | corrections confirmed |
| navarro2026 | 0 | 0 | 0 | no changes (none required) |
| gui2022 | 0 | 0 | 0 | no changes (R2-F5 deferred; deferral supported) |
| lotkov2024 | 6 | 6 | 0 | corrections confirmed (optional note refinement) |

## Every changed cell

| Paper / row | File / field | Old -> new | Source locator | Verdict |
|---|---|---|---|---|
| heidari2022-a | devices `extinction_ratio_db` | empty -> 13 | Fig. 3(a) p.4 | confirmed (my reading about 12.9 dB, -3.0 dB at -4 V to -15.9 dB at 0 V, 1550 nm) |
| heidari2022-a | devices `er_type` | empty -> static | Fig. 3(a) p.4, caption | confirmed (DC voltage sweep) |
| heidari2022-a | devices `qualifiers` | bw3db_ghz:approx -> bw3db_ghz:approx;extinction_ratio_db:approx | figure reading | confirmed |
| heidari2022-a | devices `notes` | "... (about 13 dB over 4 V), not entered." -> "... entered as extinction_ratio_db 13 (approx, figure reading; audit R2-F4)." | Fig. 3(a) | confirmed |
| heidari2022-a | evidence new entry `extinction_ratio_db` | none -> 13 dB, extracted_from_figure, Fig. 3(a) p.4, note "static, 1550 nm, about -3 dB at -4 V to about -16 dB at 0 V; approximate reading" | Fig. 3(a) p.4 | confirmed; equals CSV 13 |
| lotkov2024-a | devices `bw_basis` | measured -> derived | p.4 "Fitting the response at 1550 nm indicate 3dB bandwidth limitation of 1.05 GHz and 6dB ... 2.3 GHz"; Fig. 4(d) | confirmed (fit-defined; Fig. 4(d) shows only the raw noisy trace and dashed markers) |
| lotkov2024-a | evidence `bw3db_ghz` basis | measured -> derived | p.4; Fig. 4(d) | confirmed; value 1.05 unchanged, equals CSV |
| lotkov2024-a | evidence `bw3db_ghz` note | += "raw trace noisy, first reaches -3 dB near 0.95 GHz (approx. reading)" | Fig. 4(d) | confirmed (my reading: about -2.9 dB near 0.92 GHz, first below -3 dB near 1.1 GHz) |
| lotkov2024-a | evidence `bw6db_ghz` basis | measured -> derived | p.4; Fig. 4(d) | confirmed; value 2.3 unchanged, equals CSV |
| lotkov2024-a | evidence `bw6db_ghz` note | += "raw trace noisy, reaches about -6 dB near 1.5 GHz, recovers above -3 dB near 2.2 GHz (approx. reading)" | Fig. 4(d) | confirmed with refinement: minimum about -5.7 to -6 dB near 1.5 GHz agrees; the trace first comes back above -3 dB near 1.8 GHz and again near 2.1-2.15 GHz (see Issues, optional) |
| lotkov2024-a | devices `notes` | "Measured S21 fit: ..." -> "S21 fit: ...; fit-defined, so bw_basis derived (audit R2-F1)." | p.4 | confirmed |
| luan2026-a | devices `vpi_basis` | measured -> derived | p.5 "large resonance shifts ... (supplementary information V) ... full pi phase change ... 22-V voltage swing (Fig. 3) (a)"; Fig. 3(a) caption p.4 | confirmed: Fig. 3(a) shows the 20 V and -2 V spectra shifted by about 0.6 nm against an FSR of about 1.28 nm (about half an FSR, i.e. about pi); the phase is deduced from the resonance shift, convention (h) |
| luan2026-a | evidence `vpi_dc_v` basis | measured -> derived | p.5; Fig. 3(a) caption | confirmed; value 22 unchanged, equals CSV |
| luan2026-a | evidence `vpi_dc_v` note | "... extraction method not stated" -> "pi phase between 20 V and -2 V (22 V swing), 10 um graphene; deduced from ring resonance shift (SI V, not cached)" | p.5; Fig. 3(a) | confirmed (23 words, under the 25-word limit) |
| luan2026-a | evidence `vpil_dc_vcm` basis | measured -> derived | abstract p.1 (220 V um) | confirmed; value 0.022 unchanged, equals CSV |
| luan2026-a | devices `notes` | "how the phase was extracted is not stated (resonance shift inferred, ...)" -> "pi phase deduced from ring transmission spectra; p.5 cites resonance shifts (SI V, not cached), hence resonance_tuning_derived and vpi_basis derived." | p.5 | confirmed; consistent with 9 of 10 other resonance_tuning_derived rows (derived; taghavi2026-a is author_estimate) |
| tiberi2025-a | devices `il_onchip_excludes` | empty -> "grating couplers (about 6 dB each, extracted from reference waveguides, p.11); transmission normalized to device optical loss before fabrication (Fig. 8 caption)" | p.11 "insertion loss~6dB per coupler, extracted from straight reference WGs without active devices"; Fig. 8 caption p.13 "normalized to device optical loss before fabrication" | confirmed (authors' wording) |
| tiberi2025-b | devices `il_onchip_excludes` | empty -> same text | same | confirmed |
| tiberi2025-b | devices `notes` | "... so these cells carry basis author_estimate ...; Energy per bit 26 fJ/bit is derived. Energy per bit is the authors' CVpp^2/4 figure; C and Vpp not stated." -> "... so the bandwidth, rate and format cells carry basis author_estimate ...; 26 fJ/bit is the authors' CVpp^2/4 figure (basis derived), C and Vpp not stated." | Table I p.3; p.3 intro | confirmed; matches evidence bases (energy derived; bw/rate/format author_estimate) |
| tiberi2025-b | evidence `modulation_format` basis | measured -> author_estimate | Table I p.3 ("NRZ rate [Gbit/s]" column, 20); p.3 intro "20Gbit/s NRZ data rate" | confirmed; consistent with max_baud_gbd and max_line_rate_gbps author_estimate from the same cell |
| tiberi2025-b | evidence `modulation_format` note | none -> "Table I and p.3 text; no eye diagram shown for this device" | Fig. 9(c) eyes are the 40 um / 40 nm device | confirmed |

Not counted as cells: evidence-required equality was checked for every changed numeric cell (heidari2022-a ER 13, lotkov2024-a 1.05 and 2.3, luan2026-a 22 and 0.022): all equal. `il_onchip_excludes` is not an evidence field in the schema (line 111, no `evidence: true`), so no evidence entry is required.

## Rejected and deferred findings

- R2-F5 (deferred, `waveguide_platform` soi_rib on fully etched strips, tiberi2025-a..c and gui2022-a..b): supported. tiberi2025 p.9 "Fully etched Si WGs are fabricated"; gui2022 Fig. 1 caption "Si waveguide (width: 500nm; height: 220nm)" with no slab. The schema enum (`data/schema/devices.schema.yaml` line 24) has soi_slot and soi_rib but no strip value, so a schema decision is genuinely needed.
- R2-F7 (no change, lee2020a-a IL/ER basis measured): no change was requested by the audit; no edit made. Agreed.
- No findings were rejected.

## Metadata and notes

- All changed notes and evidence notes are accurate against the source (see table). No absolute or home-relative paths, emoji or private information in the in-scope diff (grep of the diff for path patterns: none).
- Dispositions record every in-scope change, with old -> new values that match the diff text exactly.

## Validator

`uv run python scripts/validate_db.py` -> `0 error(s)`.

## Issues

No corrections to revert or fix. One optional refinement:

1. lotkov2024-a evidence `bw6db_ghz` note (`data/evidence/lotkov2024.yaml`): "recovers above -3 dB near 2.2 GHz" omits the earlier recovery near 1.8 GHz (my reading of Fig. 4(d): about -2 to -2.9 dB near 1.78 GHz, about -1.8 dB near 2.13 GHz). Optional replacement for that clause: "recovers above -3 dB near 1.8 and 2.1 GHz (approx. reading)". Basis and value unaffected.

## Unrecorded changes

None. All in-scope changes (devices.csv: 11 cells across heidari2022-a, lotkov2024-a, luan2026-a, tiberi2025-a, tiberi2025-b; evidence: 10 field changes across heidari2022, lotkov2024, luan2026, tiberi2025) appear in the two disposition files.
