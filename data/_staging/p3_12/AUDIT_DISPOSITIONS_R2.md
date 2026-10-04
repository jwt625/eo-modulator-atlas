# Audit dispositions, round 2: batch p3_12

- Audit: `data/_staging/audits/p3_11-p3_13-r2-claude-audit-2026-10-03.md`
- Papers: chen2023a, hu2026a, niels2025a, tan2024, wang2026b
- Date: 2026-10-04
- Source re-check: `references/tan2024/text.md` p.3-5 and `figures/page_03.png` (Fig. 1(b)); `references/wang2026b/text.md` p.1-7.
- Files edited: `data/devices.csv` (rows tan2024-a, wang2026b-am, wang2026b-pm, wang2026b-am2), `data/evidence/tan2024.yaml`, `wang2026b.yaml`. Not edited: `papers.csv`, `organizations.csv`, `sims/`, `references/`, `audit_status`. CSV line endings (CRLF) and YAML line endings (LF) unchanged.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 (tan2024, wang2026b part) | metadata | applied | Source: tan2024 states no drive (ring; p.3 says the fields in both straights point the same way). wang2026b states no drive (p.3 "impedance-engineered GSG transmission lines feeding amplitude modulators"). Per coordinator, `unspecified` without inferring push_pull for wang2026b-am. `devices.csv` `drive` `` -> `unspecified` on tan2024-a, wang2026b-am, wang2026b-pm. Evidence: new `drive` entries, basis derived, locators to the Vpi source: tan2024-a "p.4 Sec. 2; Fig. 2(a)"; wang2026b-am "p.5 Sec. 2x8 switch; Fig. 3(c)"; wang2026b-pm "p.6 Sec. EO comb transmitter; Fig. 4(b)"; notes say the authors do not state the drive. |
| R2-F4 | minor | applied | Source: p.2 "up to 20 Gbit/s (limited by the oscilloscope)"; p.6-7 "currently limited by the 13 GHz bandwidth of the oscilloscope". No bound wording on the value (convention (b)). `devices.csv` wang2026b-am2 `qualifiers`: `length_mm:approx;max_baud_gbd:gt;max_line_rate_gbps:gt` -> `length_mm:approx`. `notes`: "Rate is oscilloscope-limited, so entered as a lower bound;" -> "Rate is oscilloscope-limited (demonstrated maximum, entered without a bound qualifier);". Evidence notes for `max_baud_gbd` and `max_line_rate_gbps` get "; demonstrated maximum, no bound qualifier". Values 20 / 20 unchanged. |
| R2-F6 | minor | applied | Source: p.5 "bottom electrodes, composed of 10 nm titanium and 700 nm gold"; top electrodes 10 nm Ti + 1500 nm Au; Fig. 1(b) (p.3 render) labels the bottom electrode beside the waveguide "700nm". `devices.csv` tan2024-a `electrode_thickness_um`: `` -> `0.7`. Evidence: new entry value 0.7, unit um, basis design_target, locator "p.5; Fig. 1(b)", note "bottom (field-defining) electrodes 10 nm Ti + 700 nm Au; top routing layer 1.5 um Au". |

## Counts

- Findings for this batch: 3 (R2-F1 shared with p3_11)
- applied: 3 (F1 tan2024/wang2026b part, F4, F6)
- applied-adjusted: 0
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| tan2024 | tan2024-a | drive | (empty) -> unspecified | p.4 Sec. 2; Fig. 2(a) |
| tan2024 | tan2024-a | electrode_thickness_um | (empty) -> 0.7 | p.5; Fig. 1(b) |
| wang2026b | wang2026b-am | drive | (empty) -> unspecified | p.5 Sec. 2x8 switch; Fig. 3(c) |
| wang2026b | wang2026b-pm | drive | (empty) -> unspecified | p.6 Sec. EO comb transmitter; Fig. 4(b) |
| wang2026b | wang2026b-am2 | qualifiers | removed max_baud_gbd:gt and max_line_rate_gbps:gt | p.2; p.6-7 |

## Sim config follow-ups

- None: tan2024 and wang2026b have no sim config.

## Deferred items needing decisions

- Optional (coordinator): wang2026b-am could take `push_pull` (derived) if the Fig. 3(b) layout shows one arm per gap; not checked, left `unspecified` per coordinator note.
