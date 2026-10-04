# Audit dispositions R2: p3_04

- Audit: `data/_staging/audits/p3_03-p3_04-r2-claude-audit-2026-10-03.md`
- Papers: sayem2026a, sayem2026b, lin2025a, kim2025, mao2024
- Date: 2026-10-04
- Files edited (canonical): `data/devices.csv`, `data/evidence/lin2025a.yaml`, `data/evidence/mao2024.yaml`. `data/papers.csv` rows of this batch and `data/organizations.csv` unchanged. `audit_status` untouched.

Each finding was re-checked against `references/<paper_id>/text.md` and the figure images before editing.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | numerical | applied | text.md has no Vpi or VpiL for the device (only FSR 2.563 nm, 0.288 nm at 5 V, 41.3 pm/V over 0-20 V, r42 1268 pm/V; p.3). 31 V is batch arithmetic extrapolated beyond 20 V (SKILL rule 1); it also fed a derived VpiL in build_views. devices.csv lin2025a-mzi: `vpi_dc_v` 31.0 -> ''; `vpi_basis` derived -> ''; `qualifiers` vpi_dc_v:approx -> ''; `vpi_convention` per_arm_phase_shifter -> '' (no Vpi left to qualify; its evidence note said "Authors report no Vpi"); `notes`: the 31 V sentence replaced by "No Vpi reported, none entered: (FSR/2)/tuning gives about 31 V (41.3 pm/V) or 22 V (5 V point, 57.6 pm/V), extrapolated beyond the 20 V measured range, assuming one FSR = 2 pi on the driven arm." Evidence: `derived` item vpi_dc_v and `entries` item vpi_convention removed. `drive` single_ended, `fsr_nm`, `tuning_nm_per_v` kept. |
| R2-F2 | numerical | applied | p.4 text: raw response changes sharply 1-8 GHz (blue, substrate surface conduction); "by compensating for the electrical properties in the low-frequency region, a broad frequency response from 1 to 70 GHz" (red); Fig. 3(b) caption "bandwidth larger than 70 GHz". Embedded image img_p04_1.png: blue peaks about +6 dB near 3 GHz; red touches about -3 dB near 55-56 GHz. devices.csv mao2024-1550 `bw_basis` measured -> derived; evidence bw3db_ghz basis measured -> derived, note -> "Bound on the authors' low-frequency-compensated S21 (red trace); compensation method not given; wavelength not stated"; row note appended "70 GHz bound is on the authors' low-frequency-compensated S21 (red, Fig. 3(b)); raw trace peaks at 1-8 GHz; red touches about -3 dB near 55 GHz (visual)." `bw3db_ghz` 70 gt and `bw_measured_to_ghz` 70 unchanged (convention (c)). |
| R2-F5 | metadata | deferred | sayem2026a (v1 stamp "30 Apr 2026", text.md p.1) and kim2025 (v1 stamp "23 Jul 2025", p.1) have empty published_on; convention (k) does not require filling an empty cell, so nothing applied. sayem2026b (v2 only) correctly empty. Rule for arXiv rows is a coordinator decision (see p3_03 R2 dispositions). |
| R2-F8 | minor | applied | p.6 Methods: "on-chip loss ... estimated to be 5.6 dB, comprising a phase-shifter loss of 1.7 dB and other passive component losses of 3.9 dB"; coupling not mentioned (text.md lines 533-535). devices.csv mao2024-1550 `il_onchip_excludes` '' -> "not stated by the authors (fiber-to-chip coupling not mentioned)". |

Findings for sayem2026b: none. Round-1 F25 (lin2025a Vpi kept) is superseded by R2-F1.

## Counts

applied 3, applied-adjusted 0, rejected 0, deferred 1 (R2-F5, cross-batch).

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| lin2025a | lin2025a-mzi | vpi_dc_v | 31.0 -> '' | p.3 text, p.4 Fig. 2(d): no Vpi reported |
| lin2025a | lin2025a-mzi | vpi_basis | derived -> '' | same |
| lin2025a | lin2025a-mzi | qualifiers | vpi_dc_v:approx -> '' | same |
| lin2025a | lin2025a-mzi | vpi_convention | per_arm_phase_shifter -> '' | same |
| mao2024 | mao2024-1550 | bw_basis (and evidence bw3db_ghz basis) | measured -> derived | p.4 text; Fig. 3(b) |
| mao2024 | mao2024-1550 | il_onchip_excludes | '' -> not stated by the authors (fiber-to-chip coupling not mentioned) | p.6 Methods |

## Sim config follow-ups

None (no sim configs for p3_04 papers).

## Deferred items needing decisions

1. R2-F5 (coordinator, cross-batch): `published_on` rule for arXiv-sourced rows; option (a) would fill sayem2026a 2026-04-30 and kim2025 2025-07-23 (stamps verified in the cached v1 files), option (b) clears the filled p3_03 rows. See `data/_staging/p3_03/AUDIT_DISPOSITIONS_R2.md`.
