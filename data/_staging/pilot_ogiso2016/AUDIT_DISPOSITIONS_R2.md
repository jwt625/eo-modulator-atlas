# Audit dispositions, round 2: pilot ogiso2016

- Audit: `data/_staging/audits/pilots-p2_01-han2023-r2-claude-audit-2026-10-03.md`
- Papers: ogiso2016 (this file). The same audit covers chen2022, kohli2025 (dispositions in `data/_staging/pilot_chen2022/` and `data/_staging/pilot_kohli2025/`), han2023 (`data/_staging/p2_02/`), kieninger2020 and wolf2018a (no findings, no file).
- Date: 2026-10-04
- Source re-check: `references/ogiso2016/` has only `source.pdf`. Page text and renders were regenerated with pymupdf in a scratch area outside the repo. Fig. 4 is an embedded 331 x 145 px JPEG placed at x 346.0-504.8 pt, y 570.1-639.6 pt on p.1; the axis labels are vector text.
- Files edited: `data/devices.csv` (ogiso2016-a), `data/evidence/ogiso2016.yaml`. Not edited: `sims/`, `references/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | blocking | applied | Re-measured on p.1 Fig. 4. Pixel analysis of the embedded image: y ticks at row 2 px and row 138 px, which coincide with the vector labels "0" (centre 571.3 pt -> 2.4 px) and "-3" (636.5 pt -> 138.4 px); x ticks every 46 px from 6 px (0 GHz) to 329 px (70 GHz, label centre 503.9 pt -> 329.1 px). The trace ends at column 315 px = 67.2 GHz with red pixels at rows 88-95 px = -1.90 to -2.05 dB (centre -1.97 dB); column 314 reads -1.8 to -1.9 dB; trace near 60 GHz about -1.4 to -1.5 dB. Reading about -2.0 dB (+/- 0.1 dB); 2.7 is not supported. `devices.csv` ogiso2016-a `eo_rolloff_db` 2.7 -> 2.0 (qualifier `eo_rolloff_db:approx` and `eo_rolloff_freq_ghz` 67 unchanged). Evidence entry `eo_rolloff_db` value 2.7 -> 2.0; note "... about -2.7 dB relative to 1.5 GHz" -> "... about -2.0 dB relative to 1.5 GHz (figure read, pixel analysis against axis ticks)"; basis `extracted_from_figure` and locator unchanged. `context_values` item `eo_response_at_end_of_trace` value "approx -2.7 (read from plot)" -> "approx -2.0 (read from plot)"; its note "visual read only, not entered in CSV" (stale since round-1 O2 entered the value) -> "figure read; same reading as CSV eo_rolloff_db 2.0 at 67 GHz". |

Counts: applied 1, applied-adjusted 0, rejected 0, deferred 0.

## Changed numerical or blocking cells

- ogiso2016, ogiso2016-a, `eo_rolloff_db`, 2.7 -> 2.0 (approx, at 67 GHz, reference 1.5 GHz); source: p.1 Fig. 4, end of trace (67.2 GHz) at -1.90 to -2.05 dB.

## Sim config follow-ups

None (no sim config for ogiso2016).

## Deferred items needing decisions

None.
