# Audit dispositions: p5_09

- Audit: `data/_staging/audits/p5_09-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Rules applied: schema convention (c) in `data/schema/devices.schema.yaml` (paper's stated bound with `gt`, measured range in `bw_measured_to_ghz`, trace behaviour in notes), per coordinator ruling for F2. `license_notice` context values kept in every evidence file. `audit_status` stays needs_audit.
- All findings re-checked against `references/<paper_id>/text.md` and figure renders (kotz2026 Fig. 1(a)-(b), cai2026 Fig. 3(a), li2026b Fig. 1(b), zhang2026a Fig. 2(a)-(b)).

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | blocking | applied | Source confirms OFC Sec. 2 repeats canonical taghavi2026-a values (R 40 um, 150 pm/V, 4.77 nW/pi, VpiL 0.33 V cm, 2.83 Vpp, 30 kHz to 11 GHz, f-6dB at least 7.8 GHz). devices.csv: row taghavi2026a-a deleted. evidence/taghavi2026a.yaml: `entries` 10 -> `[]`, `context_values.license_notice` kept. papers.csv taghavi2026a: `repro_grade` C -> empty; `notes` replaced (cross-reference to canonical taghavi2026 / taghavi2026-a in data/papers.csv, data/devices.csv, data/evidence/taghavi2026.yaml; OFC adds VDC about 0.5 V and Eext about 1.2 V/um; Table 1 "about 0.3 (0.03 at DC)" vs text 0.33 V cm conflict). |
| F2 | numerical | applied-adjusted | Auditor proposed `bw3db_ghz` 67 -> 46.5 approx. Not applied (coordinator ruling, convention (c); precedent bhasker2026). Cells unchanged: li2026b-a `bw3db_ghz` 67, `qualifiers` bw3db_ghz:gt, `bw_measured_to_ghz` 67. Notch re-read on the Fig. 1(b) render: dips toward -3 dB near 47 GHz, trace ends near -2 dB. devices.csv li2026b-a `notes` bandwidth sentence -> "Authors state above 67 GHz (abstract, p.2); Fig. 1(b) EAM trace has a notch to about -3.1 dB near 46.7 GHz (about 2.5 GHz wide) and ends near -2 dB at 67 GHz." evidence/li2026b.yaml `bw3db_ghz` note -> "Authors state above 67 GHz; Fig. 1(b) notch about -3.1 dB near 46.7 GHz (2.5 GHz wide), trace ends near -2 dB at 67 GHz". BATCH_REPORT updated (-3.2 -> -3.1 dB, 46.7 GHz). |
| F3 | metadata | applied | Source: p.2 Sec. 2 GSG CPW with slot phase shifters between S and each G; Fig. 1(a) confirms. devices.csv kotz2026-a `drive` unspecified -> push_pull; `vpi_convention` unspecified -> mzm_push_pull. evidence/kotz2026.yaml: both entries value updated, basis derived, locator "p.2, Sec. 2; Fig. 1(a)", notes state the authors do not give the convention and cite the same-group GSG convention. |
| F4 | metadata | applied | devices.csv zhang2026a-a: `vpi_rf_v` 6.7 -> empty, `vpi_dc_v` empty -> 6.7, `vpi_rf_freq_ghz` 0.001 -> empty. zhang2026a-b: `vpi_rf_v` 3.2 -> empty, `vpi_dc_v` empty -> 3.2, `vpi_rf_freq_ghz` 0.001 -> empty, `qualifiers` vpi_rf_v:approx -> vpi_dc_v:approx; `notes` rewritten (about 2.84 to 3.21 V, 1 MHz value entered as quasi-static; Fig. 2(b) re-read: 2.84 V at 50 mHz, about 3.03 V flat, 3.21 V at 1 MHz). evidence/zhang2026a.yaml: field `vpi_rf_v` renamed `vpi_dc_v` in both entries with notes "Vpi measured with a 1 MHz sinusoidal driving signal; entered as quasi-static" and "1 MHz point of Fig. 2(b); about 2.84 to 3.21 V from 50 mHz to 1 MHz"; both `vpi_rf_freq_ghz` entries deleted. BATCH_REPORT zhang2026a judgment-call corrected: build step derives VpiL from `vpi_dc_v` and length, not from a `vpi_rf` cell. |
| F5 | minor | applied | Note-only, confirmed on Fig. 3(a): one spike on the 1 V trace to about -3.2 dB near 104 GHz, 2 to 4 V traces stay above -3 dB. devices.csv cai2026-a `notes` and evidence/cai2026.yaml cai2026-a `bw3db_ghz` note reworded to "single-point spike ... 2 to 4 V traces stay above -3 dB". `bw3db_ghz` 110 gt unchanged. |
| F6 | minor | applied | Fig. 2(a) re-read: about 5.3 pi at 20 V, about 3.8 V per pi. devices.csv zhang2026a-a `notes` appended "Fig. 2(a) slope (about 3.8 V per pi at 1 MHz, approximate reading) matches neither device; VpiL not assigned." |
| F7 | minor | applied | devices.csv qiu2026a-a `notes` appended "Fig. 1(b): 30 C trace first touches -6 dB near 19-20 GHz, below from about 25 GHz; S21 reference not stated." evidence/qiu2026a.yaml `bw6db_ghz` note -> "Package S21 incl. drivers, about 25 GHz at 30 and 85 C; 30 C trace first touches -6 dB near 19-20 GHz". Cell 25 approx unchanged. |
| F8 | minor | applied | p.2 says "Grating couplers (GC) or edge couplers (EC)". devices.csv kotz2026-a `notes` appended "Coupler type (GC or EC) for the 17.7 dB not stated."; evidence/kotz2026.yaml `il_fiber_to_fiber_db` note appended the same. |
| F9 | minor | applied | organizations.csv has a `parent_org` column and "Keysight Technologies" exists in `data/_staging/p5_04/organizations.csv` (not yet in `data/organizations.csv`). organizations.csv Keysight Technologies Deutschland GmbH `parent_org` empty -> "Keysight Technologies". Dry run passes. |

BATCH_REPORT.md updated for F1, F2, F3, F4, F5, F8, F9 (counts now 7 device rows).

## Counts

- applied: 8 (F1, F3, F4, F5, F6, F7, F8, F9)
- applied-adjusted: 1 (F2, coordinator ruling under convention (c))
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells

| device_id | column | old -> new | source locator |
|---|---|---|---|
| taghavi2026a-a | (whole row) | row deleted; evidence `entries` -> [] | p.2 Sec. 2 duplicates canonical taghavi2026-a |
| kotz2026-a | drive | unspecified -> push_pull | p.2 Sec. 2; Fig. 1(a) (derived) |
| kotz2026-a | vpi_convention | unspecified -> mzm_push_pull | p.2 Sec. 2; Fig. 1(a) (derived) |
| zhang2026a-a | vpi_rf_v / vpi_dc_v | 6.7 / empty -> empty / 6.7 | p.1 Sec. 2 (1 MHz sinusoid) |
| zhang2026a-a | vpi_rf_freq_ghz | 0.001 -> empty | p.1 Sec. 2 |
| zhang2026a-b | vpi_rf_v / vpi_dc_v | 3.2 / empty -> empty / 3.2 (approx) | p.2 Fig. 2(b), 1 MHz point |
| zhang2026a-b | vpi_rf_freq_ghz | 0.001 -> empty | p.2 Fig. 2(b) |
| zhang2026a-b | qualifiers | vpi_rf_v:approx -> vpi_dc_v:approx | p.2 Fig. 2(b) |

No other numerical cell changed: li2026b-a `bw3db_ghz` 67 gt and cai2026-a `bw3db_ghz` 110 gt stay as staged; qiu2026a-a `bw6db_ghz` 25 approx unchanged. Organizations: Keysight Technologies Deutschland GmbH `parent_org` (text cell).

## Deferred items needing decisions

None. Note for the merge: Keysight Technologies Deutschland GmbH `parent_org` refers to "Keysight Technologies", which is staged in p5_04 only; merge p5_04 first or otherwise ensure the parent row exists. Optional F1 item 4 (appending a note to canonical taghavi2026 papers notes) not done: `data/papers.csv` is outside this task's write scope.
