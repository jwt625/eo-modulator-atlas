# Audit dispositions, round 2: batch p3_14

- Audit: `data/_staging/audits/p3_14-p3_15-r2-claude-audit-2026-10-03.md` (shared with p3_15; p3_15 items are in `data/_staging/p3_15/AUDIT_DISPOSITIONS_R2.md`)
- Papers: sabatti2024, chen2024, shamsansari2021, guo2026, sayem2026
- Date: 2026-10-04
- Source re-check: `references/shamsansari2021/text.md` p.3 and `figures/img_p03_1.png` (Fig. 4(d)); `references/sabatti2024/text.md` p.4 acknowledgements; `data/_staging/p1_04/AUDIT_DISPOSITIONS_R2.md` R2-F15 for the derived-only evidence convention.
- Files edited: `data/devices.csv` (row shamsansari2021-a), `data/evidence/shamsansari2021.yaml`, `data/organizations.csv` (row Binnig and Rohrer Nanotechnology Center, notes only). Not edited: `papers.csv` rows of this batch, `sims/`, `references/`, `audit_status`. CRLF line endings of the CSVs and LF of the YAML preserved.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | metadata | deferred | `year` rule (journal vs preprint year) is an open user decision per the coordinator. shamsansari2021 `year` 2021 unchanged (cached v2 stamp 25 Nov 2021; Crossref VoR 2022-04-06). The optional sabatti2024 `published_on` fill is deferred with it. |
| R2-F5 | minor | applied | Source: p.3 "50 GHz Vector Network Analyzer ... 45 GHz fast photo-diode ... detector response are subtracted from the measured frequency response. The response fluctuation beyond 45 GHz is due to the limited bandwidth of the photodiode." Fig. 4(d) render: trace runs 0 to 50 GHz. The detector is de-embedded, so the measurement range is the 50 GHz sweep; convention (c) third sentence (claimed crossing ~50 GHz at the instrument limit) gives the same number. `devices.csv` shamsansari2021-a `bw_measured_to_ghz` 45 -> 50; `notes` appended " bw_measured_to_ghz 50 = VNA sweep and plotted trace end; photodiode response is de-embedded (p.3)." Evidence `bw_measured_to_ghz`: value 45 -> 50; locator "p.3 Fig. 4(d) and text" -> "p.3 text (50 GHz VNA); Fig. 4(d)"; note -> "VNA sweep and plotted trace end at 50 GHz; 45 GHz photodiode response de-embedded; authors attribute fluctuation beyond 45 GHz to the photodiode." Existing sub-3 dB description in notes kept. |
| R2-F7 | minor | applied | Source: sabatti2024 p.4 "cleanroom facilities FIRST and BRNC of ETH Zurich and IBM Ruschlikon". `organizations.csv` Binnig and Rohrer Nanotechnology Center `notes`: appended "; sabatti2024 p.4 names it 'BRNC of ETH Zurich and IBM Ruschlikon'". The existing clause (host not stated) belongs to other papers using this row and is kept; `parent_org` stays empty (two hosts named). |
| R2-F8 | minor | rejected | `derived`-only coverage of a distiller geometric identity is the repo convention (about 50 canonical cells; `p1_04` R2-F15 moved an equivalent cell to derived-only), and `validate_db.py` accepts it. The `derived` item (600 nm - 300 nm, inputs eo_film_thickness_nm and slab_thickness_nm) and the row note "Etch depth 300 nm derived" already document it. No change. |
| R2-F10 | minor | deferred | sayem2026 part: `organizations.csv` Nokia Bell Labs note "Murray Hill, NJ" vs sayem2026 p.1 "Nokia Bell Labs, NJ, USA". The note comes from another paper and the org name itself is not in question; sayem2026's affiliation text does not decide round-1 F19. Left to the coordinator. |

## Counts

- Findings for this batch: 5 (R2-F1 shamsansari2021 part, R2-F5, R2-F7, R2-F8, R2-F10 sayem2026 part)
- applied: 2 (R2-F5, R2-F7)
- applied-adjusted: 0
- rejected: 1 (R2-F8)
- deferred: 2 (R2-F1, R2-F10)
- No finding for chen2024 or guo2026.

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| shamsansari2021 | shamsansari2021-a | bw_measured_to_ghz | 45 -> 50 | p.3 text (50 GHz VNA, detector response subtracted); Fig. 4(d) |

Non-numerical changes: shamsansari2021-a `notes`; organizations.csv Binnig and Rohrer Nanotechnology Center `notes`.

## Sim config follow-ups

- None. No `sims/<id>/config.yaml` exists for the five papers.

## Deferred items needing decisions

- R2-F1 (user): one `year` rule for preprint-sourced rows. Under the VoR rule shamsansari2021 2021 -> 2022; under the preprint rule no change in this batch. Optional sabatti2024 `published_on` from the arXiv stamp "15 Apr 2024" (p.1) needs a decision whether a cached-version stamp may fill it (convention (k)).
- R2-F10 (coordinator): round-1 F19 organization items; for this batch only the Nokia Bell Labs note "Murray Hill, NJ" (not in sayem2026).
