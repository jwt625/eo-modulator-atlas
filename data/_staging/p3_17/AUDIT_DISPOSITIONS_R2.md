# Audit dispositions round 2, batch p3_17 (2026-10-04)

Audit: `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` (R2, fresh context). Papers: giambra2021, tiberi2025, heidari2022, navarro2026, gui2022, lotkov2024. Date: 2026-10-04. Each finding was re-checked against `references/<paper_id>/text.md` and the figure renders (lotkov2024 img_p04_1 Fig. 4(d); heidari2022 img_p04_1 Fig. 3(a)) before the disposition was set. Edits are in the canonical tables.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | numerical | applied | `data/devices.csv` lotkov2024-a `bw_basis` measured -> derived. `data/evidence/lotkov2024.yaml` `bw3db_ghz` 1.05 basis measured -> derived, note += "raw trace noisy, first reaches -3 dB near 0.95 GHz (approx. reading)"; `bw6db_ghz` 2.3 basis measured -> derived, note += "raw trace noisy, reaches about -6 dB near 1.5 GHz, recovers above -3 dB near 2.2 GHz (approx. reading)". Row note: "Measured S21 fit: ..." -> "S21 fit: ... ; fit-defined, so bw_basis derived (audit R2-F1)." Source: p.4 "Fitting the response at 1550 nm indicate 3dB bandwidth limitation of 1.05 GHz and 6dB ... 2.3 GHz"; my reading of Fig. 4(d) confirms a non-monotonic raw trace with only dashed markers. Values unchanged. |
| R2-F2 | metadata | applied-adjusted | `data/devices.csv` tiberi2025-a and tiberi2025-b `il_onchip_excludes` empty -> "grating couplers (about 6 dB each, extracted from reference waveguides, p.11); transmission normalized to device optical loss before fabrication (Fig. 8 caption)". Adjusted: uses the authors' wording "device optical loss before fabrication" instead of the auditor's "passive waveguide loss before graphene integration" (interpretation). Optional `il_onchip_includes` not filled (would add inference). Not an evidence-required field; no evidence entry added. Source: p.11 "insertion loss ~6dB per coupler, extracted from straight reference WGs"; Fig. 8 caption p.13. |
| R2-F3 | minor | applied-adjusted | `data/devices.csv` tiberi2025-b notes: "... so these cells carry basis author_estimate (...), not measured (audit F2, 2026-10-03). Energy per bit 26 fJ/bit is derived. Energy per bit is the authors' CVpp^2/4 figure; C and Vpp not stated." -> "... so the bandwidth, rate and format cells carry basis author_estimate (...), not measured (audit F2, 2026-10-03); 26 fJ/bit is the authors' CVpp^2/4 figure (basis derived), C and Vpp not stated." `data/evidence/tiberi2025.yaml` tiberi2025-b `modulation_format` NRZ basis measured -> author_estimate, note added "Table I and p.3 text; no eye diagram shown for this device". Adjusted: also removed the duplicated energy sentence. |
| R2-F4 | minor | applied | `data/devices.csv` heidari2022-a `extinction_ratio_db` empty -> 13; `er_type` empty -> static; `qualifiers` "bw3db_ghz:approx" -> "bw3db_ghz:approx;extinction_ratio_db:approx"; row note "..., not entered." -> "..., entered as extinction_ratio_db 13 (approx, figure reading; audit R2-F4)." New evidence entry heidari2022-a `extinction_ratio_db` 13 dB, basis extracted_from_figure, locator Fig. 3(a) p.4, note "static, 1550 nm, about -3 dB at -4 V to about -16 dB at 0 V; approximate reading". Fig. 3(a) render: 1550 nm curve about -3.2 dB at -4 V, about -16 dB at 0 V. Conclusion ">5 dB" not entered (no voltage attached). |
| R2-F5 | minor | deferred | `waveguide_platform` soi_rib on fully etched strip waveguides (tiberi2025-a..c, gui2022-a..b). The enum has no strip value; no existing value fits exactly. Needs coordinator/schema decision (e.g. an `soi_strip` enum value). No change, no note added. |

Counts: applied 2 (R2-F1, R2-F4), applied-adjusted 2 (R2-F2, R2-F3), rejected 0, deferred 1 (R2-F5). giambra2021, navarro2026: no findings.

## Changed numerical or blocking cells

- lotkov2024 / lotkov2024-a / `bw_basis`: measured -> derived (evidence `bw3db_ghz` 1.05 and `bw6db_ghz` 2.3 basis -> derived; values unchanged). Locator: p.4; Fig. 4(d).
- heidari2022 / heidari2022-a / `extinction_ratio_db`: empty -> 13 (approx, extracted_from_figure; `er_type` static). Locator: Fig. 3(a) p.4.
- tiberi2025 / tiberi2025-a, tiberi2025-b / `il_onchip_excludes`: empty -> text above (IL values unchanged). Locator: p.11; Fig. 8 caption p.13.
- tiberi2025 / tiberi2025-b / evidence `modulation_format` basis: measured -> author_estimate. Locator: Table I p.3.

## Sim config follow-ups

None (no sim configs for these papers).

## Deferred items needing decisions

- R2-F5: whether to add an `soi_strip` (fully etched) value to the `waveguide_platform` enum, then re-tag tiberi2025-a..c and gui2022-a..b. Schema change; coordinator decision.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p3_16-p3_17-r2-verify-claude-audit-2026-10-04.md` confirmed all 21 changed cells (heidari2022-a ER independently read as about 12.9 dB). Optional wording fix applied after the coordinator read Fig. 4(d) (img_p04_1.png, 505 px/GHz): lotkov2024-a `bw6db_ghz` evidence note now says the raw trace is briefly back above -3 dB near 1.8, 1.9 and 2.1 GHz (approx. reading). No value changed.
