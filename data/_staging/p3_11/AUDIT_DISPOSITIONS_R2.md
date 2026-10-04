# Audit dispositions, round 2: batch p3_11

- Audit: `data/_staging/audits/p3_11-p3_13-r2-claude-audit-2026-10-03.md`
- Papers: powell2024a, nelan2022, nelan2022a, feng2022, gao2024
- Date: 2026-10-04
- Source re-check: `references/nelan2022/text.md` p.5-6 and Fig. 1(a) (page_03.png plus an 8x crop of the source PDF), `references/nelan2022a/figures/page_02.png` (Fig. 1(c),(f)), `references/gao2024/text.md` p.1-3.
- Files edited: `data/devices.csv` (rows gao2024-a, nelan2022-a, nelan2022a-a), `data/evidence/gao2024.yaml`, `nelan2022.yaml`, `nelan2022a.yaml`. Not edited: `papers.csv`, `organizations.csv`, `sims/`, `references/`, `audit_status`. CSV line endings (CRLF) and YAML line endings (LF) unchanged.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 (gao2024 part) | metadata | applied | Source: p.1-3 give no drive convention (single GSG feed, dual-arm phase modulator). `devices.csv` gao2024-a `drive`: `` -> `unspecified`. Evidence gao2024-a: new entry `drive` = unspecified, basis derived, locator "p.1 abstract; p.3 Fig. 4(a)" (the Vpi source), note "authors do not state a drive convention; dual-arm phase modulator on one GSG line". |
| R2-F2 | metadata | applied | Source: nelan2022 p.6 Sec. IV-C "the center electrode is active, while the outer electrodes are grounded"; Fig. 1(a) (8x crop) shows three gold traces with one waveguide in each gap. nelan2022a Fig. 1(c),(f) (p.2) show the two waveguides in the two W_GAP gaps of the single GSG line. Convention (f). `devices.csv` nelan2022-a and nelan2022a-a: `drive` unspecified -> push_pull; `vpi_convention` unspecified -> mzm_push_pull. Evidence: two new entries per row (drive, vpi_convention), basis derived; locator "p.6 Sec. IV-C; Fig. 1(a)" (nelan2022-a) and "Fig. 1(c),(f)" (nelan2022a-a); note "authors do not state the convention; single GSG feed ... one arm in each gap". The sim note is listed under follow-ups. |
| R2-F7 | minor | applied | Source: p.5 Sec. III, the thicker oxide is kept only "where an increased thickness of the SiO2 buffer layer will protect the optical mode from interacting with an overhead Au electrode"; the rest is reduced to 450 nm. `devices.csv` nelan2022-a `cladding` and evidence value: "(thicker over the waveguide)" -> "(thicker only where Au crosses over the waveguide)". |
| R2-F9 (gao2024 part) | metadata | deferred | Open user decision (coordinator note): author list from Crossref (11, adds Zhiwei Fang) vs the cached preprint (10). `papers.csv` gao2024 `authors` unchanged. |

## Counts

- Findings for this batch: 4 (R2-F1 shared with p3_12; R2-F9 shared with p3_13)
- applied: 3 (F1 gao2024 part, F2, F7)
- applied-adjusted: 0
- rejected: 0
- deferred: 1 (F9 gao2024 part)

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| gao2024 | gao2024-a | drive | (empty) -> unspecified | p.1 abstract; p.3 Fig. 4(a) |
| nelan2022 | nelan2022-a | drive | unspecified -> push_pull | p.6 Sec. IV-C; Fig. 1(a) |
| nelan2022 | nelan2022-a | vpi_convention | unspecified -> mzm_push_pull | p.6 Sec. IV-C; Fig. 1(a) |
| nelan2022a | nelan2022a-a | drive | unspecified -> push_pull | Fig. 1(c),(f) |
| nelan2022a | nelan2022a-a | vpi_convention | unspecified -> mzm_push_pull | Fig. 1(c),(f) |

No numerical value changed. Text-only change: nelan2022-a `cladding` (F7).

## Sim config follow-ups

- `sims/nelan2022/config.yaml` line 8 ("Vpi convention of the paper is not stated (devices.csv vpi_convention unspecified)"), line 69 ("convention of the paper is unspecified") and the line 70 target note ("Vpi convention not stated by the paper") now disagree with `vpi_convention` = mzm_push_pull (derived). Suggested wording: "convention inferred as mzm_push_pull (derived, single GSG feed, one arm per gap); not stated by the authors". `comparable: false` may stay. Target values (3.3, 2.14, 1.85) unaffected.
- `sims/gao2024/config.yaml`: no target affected.

## Deferred items needing decisions

- R2-F9 (user decision): one author-list rule for gao2024 and hou2024 (cached source vs Crossref).
