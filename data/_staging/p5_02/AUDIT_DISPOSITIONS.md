# AUDIT_DISPOSITIONS p5_02

- Audit: `data/_staging/audits/p5_02-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Coordinator decisions applied: F4 (GlobalFoundries org_type foundry, same country/region as p5_01); `license_notice` context value added to every evidence file (lin2026, liu2026a, liu2026c, rakowski2026, and a new patel2026.yaml with empty entries since that paper has no device rows).
- Figures re-checked from higher-resolution renders of the source PDFs: lin2026 Fig. 2(a), liu2026c Fig. 2(c), rakowski2026 Table 1, Fig. 2 and Fig. 3.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | numerical | applied | devices.csv lin2026-a extinction_ratio_db 34 -> 36 (qualifier approx kept). Evidence value 34 -> 36, note rewritten (measured dip minimum about -36.4 dB; simulation marker about -34 dB). Row note: static ER sentence rewritten to 36 dB with the simulation marker near 34 dB. Re-check: black measured line bottoms near -36.4 dB, the lowest simulation circle sits near -34 dB. |
| F2 | numerical | applied (option a) | devices.csv liu2026c-b bw3db_ghz 65 -> 60 (approx, extracted_from_figure kept). Evidence value 65 -> 60, note rewritten. Row note: crossing statement now "first reach -3 dB near 60 GHz (about -3.0 to -3.2 dB to 63 GHz, -3.5 dB at 66 GHz), noisy". Re-check: blue trace reaches about -3 dB near 58-60 GHz and ends near -3.5 dB at 67 GHz; 65 GHz was past the crossing. |
| F3 | numerical | applied | devices.csv rakowski2026-a and -b il_basis measured -> derived (values 3 and 1.8 unchanged). Evidence il_onchip_db basis measured -> derived; locator "p.2, Table 1; Fig. 3(a)" (a) and "p.2, Table 1; Fig. 3(b)" (b); note "IL at ER=3.5 dB from the authors' static-IL regression trend vs BW". Optional part (row-a extinction_ratio_db basis to derived): not applied, see F3-opt below. |
| F3-opt | numerical (optional) | rejected | rakowski2026-a extinction_ratio_db 3.5 stays measured: p.2 states "average ER of 3.5 dB" at about -80 pm detuning for the 2 Vpp drive, a stated static-response value (Fig. 2b), consistent with row b which carries the same stated 3.5 dB. |
| F4 | metadata | applied (coordinator decision) | organizations.csv GlobalFoundries org_type company -> foundry; country US and region north_america unchanged (equal to p5_01). Notes -> "Malta, NY; also Essex Junction, VT and Santa Clara, CA (rakowski2026 affiliations 1-3)". papers.csv companies unchanged. |
| F5 | metadata | applied (option 1) | Evidence liu2026c-b: new entry field drive, value series_push_pull, basis derived, locator "p.2, Sec. 2; Sec. 3", note that the authors do not state the conventional device's drive. epitaxy_or_stack evidence note extended ("termination and heaters stated for the tabbed device only"); value unchanged. devices.csv liu2026c-b notes: sentence added that series push-pull drive, termination and heaters are inferred from the tabbed device. CSV drive and tags unchanged. |
| F6 | minor | applied | devices.csv lin2026-a notes and BATCH_REPORT: "1556.4 nm" -> "1556.3 nm" (dip at about 1556.33 nm in Fig. 2a). No cell impact. |
| F7 | minor | rejected | liu2026a-a (34, static) and liu2026a-b (3.5, dynamic) both match the source and carry the correct er_type; each row's dynamic ERs are already in modulation_format. Changing one type across rows is a presentation choice, not a source error. |
| F8 | minor | rejected | electrode_type stays other for liu2026c-b: the paper gives only "GS pad layout" (probe pads) for the conventional TWE-MZM and no electrode geometry, so tw_cps cannot be confirmed. |
| F9 | minor | applied | devices.csv rakowski2026-a and -b il_onchip_excludes -> "Grating couplers, routing and off-resonance waveguide loss (IL is relative to off-resonance transmission, Fig. 2b)". New evidence entries il_onchip_excludes (basis derived, locator "p.2, Fig. 2(b)") equal to the CSV on both rows. il_onchip_includes unchanged (already states the off-resonance reference). Re-check: Fig. 2(b) IL goes to about 0 dB at +-1000 pm detuning. |
| F10 | minor | applied | Evidence rakowski2026-b bw3db_ghz note extended: above the 67 GHz range, as are fitted BWs in the Fig. 2(c) legend (72.3 and 73.5 GHz). New evidence entries bw3db_reference (value dc, basis measured, locator "p.2, Fig. 2(c) title; Fig. 3 caption") on rows a and b; CSV unchanged. |
| F11 | minor | deferred | Batch-wide rule for wavelength_nm of detuned rings (empty vs resonance with approx) is a coordinator policy decision across p5 batches; each row already documents its choice. No change. |

## Counts

- Findings (11): applied 8 (F1, F2, F3, F4, F5, F6, F9, F10), applied-adjusted 0, rejected 2 (F7, F8), deferred 1 (F11).
- Optional sub-item F3-opt: rejected.
- Coordinator-requested license_notice context values: added to all 5 evidence files (patel2026.yaml is new).

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | Source locator |
|---|---|---|---|
| lin2026-a | extinction_ratio_db | 34 -> 36 | p.2, Fig. 2(a), measured dip minimum about -36.4 dB |
| liu2026c-b | bw3db_ghz | 65 -> 60 | p.2, Fig. 2(c), blue Conventional MZM -3V trace first reaches -3 dB near 60 GHz |
| rakowski2026-a | il_basis | measured -> derived (il_onchip_db 3 unchanged) | p.2, Table 1; Fig. 3(a) |
| rakowski2026-b | il_basis | measured -> derived (il_onchip_db 1.8 unchanged) | p.2, Table 1; Fig. 3(b) |
| rakowski2026-a, -b | il_onchip_excludes | hedged wording -> off-resonance normalization wording | p.2, Fig. 2(b) |
| (organization) GlobalFoundries | org_type | company -> foundry | coordinator decision; equals p5_01 |

## Deferred items needing decisions

- F11: one rule for wavelength_nm of detuned rings across the p5 batches (currently lin2026 empty, liu2026a resonance approx, rakowski2026 0 V resonance).
- Optional: whether the license_notice context_values dict form (as in kharel2021) or the list form with `item:` (used in the p5_04 staged files) is the project standard; this batch uses the dict form per the coordinator instruction.

## Validation

`uv run python scripts/merge_staging.py data/_staging/p5_02` (dry run): merge counts papers 5, devices 7, orgs 5, evidence 5; conflicts 0; validation errors 0.


## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p5_02-verify-claude-audit-2026-10-04.md`: 14/14 confirmed. N1 applied (rakowski2026-b IL evidence note: Fig. 3(b) about 2.0 dB vs Table 1 1.8 dB; value kept). N2 not applied (band left empty for liu2026c-b; not stated).
