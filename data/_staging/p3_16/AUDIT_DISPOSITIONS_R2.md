# Audit dispositions round 2, batch p3_16 (2026-10-04)

Audit: `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` (R2, fresh context). Papers: wu2023, luan2026, luan2026a, lee2020, lee2020a. Date: 2026-10-04. Findings for p3_17 papers are in `data/_staging/p3_17/AUDIT_DISPOSITIONS_R2.md`. Each finding was re-checked against `references/<paper_id>/text.md` before the disposition was set. Edits are in the canonical tables.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F6 | minor | applied | `data/devices.csv` luan2026-a `vpi_basis` measured -> derived. `data/evidence/luan2026.yaml` luan2026-a `vpi_dc_v` basis measured -> derived (note: "pi phase between 20 V and -2 V (22 V swing), 10 um graphene; deduced from ring resonance shift (SI V, not cached)"); `vpil_dc_vcm` basis measured -> derived. Row note: "how the phase was extracted is not stated (resonance shift inferred, ...)" -> "pi phase deduced from ring transmission spectra; p.5 cites resonance shifts (SI V, not cached), hence resonance_tuning_derived and vpi_basis derived." Source: p.5 "the microring modulators exhibit large resonance shifts ... (supplementary information V) ... achieves a full pi phase change ... under a 22-V voltage swing (Fig. 3)"; Fig. 3(a) caption. A ring phase is deduced from spectra, convention (h); 8 of 10 other resonance_tuning_derived rows already use derived. Values unchanged. |
| R2-F7 | minor | no change (none requested) | lee2020a-a IL 7 dB / ER 5 dB basis measured kept; agrees with round-1 F20. |

Counts: applied 1, applied-adjusted 0, rejected 0, deferred 0, no change 1. wu2023, luan2026a, lee2020: no findings.

## Changed numerical or blocking cells

- luan2026 / luan2026-a / `vpi_basis`: measured -> derived (evidence `vpi_dc_v` 22 and `vpil_dc_vcm` 0.022 basis measured -> derived; values unchanged). Locator: p.5; Fig. 3(a) caption; abstract p.1.

## Sim config follow-ups

None (no sim configs for these papers).

## Deferred items needing decisions

None.
