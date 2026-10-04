# Audit dispositions round 2: p3_06 (hu2026, geravand2025, zhong2026, gupta2023)

Audit: `data/_staging/audits/p3_05-p3_07-r2-claude-audit-2026-10-03.md`. Papers: hu2026, geravand2025, zhong2026, gupta2023. Date: 2026-10-04. Each finding re-checked against `references/<id>/text.md` and figure images before acting; edits made in the canonical tables. zhong2026: no findings.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F5 | minor | applied | Re-read Fig. 3(e) on `references/hu2026/figures/img_p31_1.png` (8x crop of the top-right red die): the cell reads 93.6 GHz (red, top of the 80-95 GHz colour bar); round-1 "83.8" was a misreading. Nine dies: 82.6, 82.9, 93.6, 84.8, 83.6, 88.2, 81.8, 82, 82.7 GHz; consistent with "variation within ~10 GHz" (text). `data/devices.csv` hu2026-a `notes` "reads 81.8 to 88.2 GHz at 0 V" -> "reads 81.8 to 93.6 GHz at 0 V". Reverses round-1 F7 disposition. |
| R2-F8 | minor | applied | Methods p.13: "a laser ... with a center wavelength of 1550.5 nm", no approximation wording. `data/devices.csv` geravand2025-b `qualifiers` 'wavelength_nm:approx;bw3db_ghz:approx;...' -> 'bw3db_ghz:approx;...' (only wavelength_nm:approx removed). Evidence entry (basis measured, p.13 Methods) unchanged. geravand2025-a keeps its approx (figure reading). |
| R2-F3 | metadata | deferred | gupta2023-e `band` c_band at 1570 nm (authors: "over the C-band"). Schema defines no band edges; deferred per coordinator instruction (see p3_05 file). |
| R2-F4 | metadata | deferred | geravand2025 `published_on` 2024-12-23 (arXiv stamp) vs li2025b empty. Open user decision; no change. |

Counts: applied 2, applied-adjusted 0, rejected 0, deferred 2.

## Changed numerical or blocking cells

- geravand2025, geravand2025-b, qualifiers, wavelength_nm:approx removed (wavelength_nm 1550.5 unchanged), p.13 Methods
- hu2026, hu2026-a, notes, wafer-map range 81.8-88.2 GHz -> 81.8-93.6 GHz, p.31 Fig. 3(e) (img_p31_1)

## Sim config follow-ups

None (no `sims/<id>/config.yaml` for these papers).

## Deferred items needing decisions

- R2-F3 (schema): band edges; gupta2023-e (1570 nm) would become l_band under a 1565 nm C/L edge.
- R2-F4 (user): `published_on` rule for arXiv copies; affects geravand2025 (2024-12-23) and li2025b (empty).
