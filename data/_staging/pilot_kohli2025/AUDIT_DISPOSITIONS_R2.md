# Audit dispositions, round 2: pilot kohli2025

- Audit: `data/_staging/audits/pilots-p2_01-han2023-r2-claude-audit-2026-10-03.md`
- Papers: kohli2025 (this file); see `data/_staging/pilot_ogiso2016/AUDIT_DISPOSITIONS_R2.md` for the scope of the whole audit.
- Date: 2026-10-04
- Source re-check: `references/kohli2025/` has only `source.pdf` (11 pages). Text regenerated with pymupdf; p.6 Fig. 4d (vector graphics) rendered at 500 dpi in a scratch area outside the repo.
- Files edited: `data/devices.csv` (kohli2025-rt, kohli2025-iq), `data/evidence/kohli2025.yaml`. Not edited: `sims/`, `references/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F3 | minor | applied-adjusted | Source: p.6 Fig. 4d render: ticks 30/50/70 GHz at 811/1024/1238 px (10.68 px/GHz); axis frame ends at 1290 px = about 74.9 GHz; data points continue to the frame on both sidebands (last points clipped at the frame), within about -2 to +2 dB. Methods p.9: 70-110 GHz via RF mixer, so 70 GHz is not the instrument limit. `devices.csv` kohli2025-rt `bw_measured_to_ghz` 70 -> 75; `qualifiers` += `;bw_measured_to_ghz:approx` (adjustment: figure read of an unlabelled axis end); `notes` "flat to the 70 GHz axis limit (Fig. 4d)" -> "flat to the axis end at about 75 GHz (Fig. 4d, figure read; last labelled tick 70 GHz)". Evidence `bw_measured_to_ghz` value 70 -> 75 (basis `extracted_from_figure`, locator unchanged); note "Axis spans +/-70 GHz, flat response; ..." -> "Data plotted to the axis end at about +/-75 GHz (figure read; last labelled tick 70 GHz), flat response; ...". |
| R2-F7 | minor | applied-adjusted | `devices.csv` kohli2025-iq `notes`: trailing duplicate sentence "3 dB bandwidth 70 GHz is the Fig. 3b caption statement (...); the text says the response starts to drop at ~70 GHz and the caption also gives a cutoff near 80 GHz." deleted; its only new fact merged into the first sentence: "(3 dB drop between 10 and 70 GHz; Fig. 3b caption also says cutoff around 80 GHz)" -> "(3 dB drop between 10 and 70 GHz; text: response starts to drop at ~70 GHz; Fig. 3b caption also says cutoff around 80 GHz)" (source p.5 text). Optional "data plotted to about 100 GHz" not added (not re-read). |

Counts: applied 0, applied-adjusted 2, rejected 0, deferred 0.

## Changed numerical or blocking cells

- kohli2025, kohli2025-rt, `bw_measured_to_ghz`, 70 -> 75 (new qualifier `bw_measured_to_ghz:approx`); source: p.6 Fig. 4d, axis end at about 74.9 GHz with data to the frame.

## Sim config follow-ups

None (no sim config for kohli2025).

## Deferred items needing decisions

None.
