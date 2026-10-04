# Audit dispositions, round 2: batch p3_18

- Audit: `data/_staging/audits/p3_18-p3_19-r2-claude-audit-2026-10-03.md`
- Papers: taghavi2022a, johnson2025, taghavi2024, witmer2020 (p3_19 findings are in `data/_staging/p3_19/AUDIT_DISPOSITIONS_R2.md`)
- Date: 2026-10-04
- Source re-check: `references/<id>/text.md` for all four papers; page render `references/taghavi2022a/figures/page_13.png` opened (Fig. 12, Fig. 13).
- Files edited: `data/devices.csv` (rows taghavi2022a-sim, witmer2020-unslotted), `data/evidence/johnson2025.yaml`, `data/evidence/taghavi2024.yaml`. Not edited: `data/papers.csv`, `sims/`, `references/`, `audit_status`. CRLF line endings of the CSV files and LF of the YAML files preserved.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | minor | applied | Source p.2 below Eq. (1): "measurement wavelength lambda0 = 1290 nm" is a stated measurement condition, not an estimate. `data/evidence/johnson2025.yaml` johnson2025-200g-best / wavelength_nm `basis` author_estimate -> measured. Value 1290 and note unchanged; no CSV change. |
| R2-F2 | minor | applied | Source p.11: "we achieved a DC modulation efficiency of VpiL ~0.25 V.mm" (Vpi,DC 0.5 V x 0.5 mm, convention (h): computed from measured numbers = derived); p.15: "we have recorded a total propagation loss of ~4.2 dB/mm" (measured; dB/cm is a unit conversion). `data/evidence/taghavi2024.yaml` taghavi2024-a / vpil_dc_vcm `basis` author_estimate -> derived; note "DC modulation efficiency about 0.25 V.mm for 500 um ..." -> "DC modulation efficiency about 0.25 V.mm stated as achieved for 500 um ...". taghavi2024-a / prop_loss_db_per_cm `basis` derived -> measured; note "Stated about 4.2 dB/mm for the FLS waveguide; ..." -> "about 4.2 dB/mm recorded for the FLS waveguide; ...". Values 0.025 and 42 and their `approx` qualifiers unchanged. Row `vpi_basis` (measured) describes the headline vpi_dc_v 0.5 V and stays. |
| R2-F3 | minor | applied | Source p.8 Fig. 4(h) annotation "3.9 pm/V" (Vpp = 6 V), no about/approximately wording; the "2-6 pm/V" text range (p.8) is already in the evidence note. `data/devices.csv` witmer2020-unslotted `qualifiers` "tuning_nm_per_v:approx" -> "" (empty). Value 0.0039 unchanged. |
| R2-F4 | minor | applied | Render p.13: Fig. 12 has no panel letters; the VpiL (V.mm) panel is on the left, the caption calls it (b). 40 nm slot reads about 0.46 / 0.37 / 0.23 V.mm at 0 / 5 / 10 nm TiO2 (by eye). `data/devices.csv` taghavi2022a-sim `notes` "Fig. 12(a) reads about 0.36 V.mm at 5 nm TiO2" -> "Fig. 12 VpiL panel (left in the render; the caption labels it (b)) reads about 0.36-0.37 V.mm at 5 nm TiO2". taghavi2022a-a notes say "Fig. 12 (simulation)" with no panel letter; left unchanged. |
| R2-F8 | minor | rejected | `papers.csv` taghavi2024 `research_groups` "Quantum Matter Institute" kept. The name is stated in the paper (p.1, affiliation 3, a UBC unit) and the canonical column is filled with sub-university institutes, centres and departments as stated in affiliations across the database (for example heidari2022 "Microelectronics Research Center", chelladurai2025 "Institute of Electromagnetic Fields (IEF)", churaev2023 "Institute of Physics"); the papers.csv note already says it is a University of British Columbia unit. |

Counts for p3_18: applied 4 (R2-F1, R2-F2, R2-F3, R2-F4), applied-adjusted 0, rejected 1 (R2-F8), deferred 0.

## Changed numerical or blocking cells

- witmer2020 / witmer2020-unslotted / `qualifiers`: "tuning_nm_per_v:approx" -> "" (value 0.0039 nm/V unchanged); source p.8, Fig. 4(h) annotation "3.9 pm/V".
- Evidence basis only (no cell value change): johnson2025-200g-best wavelength_nm author_estimate -> measured (p.2, below Eq. (1)); taghavi2024-a vpil_dc_vcm author_estimate -> derived (p.11); taghavi2024-a prop_loss_db_per_cm derived -> measured (p.15).

## Sim config follow-ups

None: no `sims/` config exists for taghavi2022a, johnson2025, taghavi2024 or witmer2020.

## Deferred items needing decisions

None.
