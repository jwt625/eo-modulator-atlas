---
verifier: fresh-context subagent
task: independent verification of the Q1 audit corrections for staged batch p5_09
date: 2026-10-04
scope: data/_staging/p5_09 (kotz2026, cai2026, li2026b, taghavi2026a, zhang2026a, qiu2026a); papers.csv (6), devices.csv (7), organizations.csv (5), evidence/*.yaml (6); audit p5_09-q1-claude-audit-2026-10-04.md; AUDIT_DISPOSITIONS.md
mode: read-only (only this file written; scratch scripts in the session scratchpad; no network, no git, no apply)
verdict: all dispositions applied faithfully and all changed cells confirmed; 3 new minor (note-wording) findings, none blocking; ready to merge (with p5_04, for the Keysight parent_org)
counts: {dispositions_checked: 9, changed_cells_confirmed: 9, not_confirmed: 0, new_findings: {blocking: 0, numerical: 0, metadata: 0, minor: 3}}
---

# Verification: p5_09 audit corrections

## Method

- Read the audit, the dispositions, every populated cell of the staged papers/devices/organizations rows and all 6 evidence files.
- Read `references/<id>/text.md` for all 6 papers. I opened these figures myself:
  - kotz2026 Fig. 1(a)-(b) (img_p02_1).
  - cai2026 Fig. 2(a)-(b) (img_p02_2) and Fig. 3(a)-(b) (img_p03_1).
  - zhang2026a Fig. 2(a) (img_p02_5) and Fig. 2(b) (img_p02_6).
  - li2026b Fig. 1(a) at 300 dpi, plus Fig. 1(b) read from the PDF vector paths (green "GeSi EAM" path; gridlines located at 0/-2/-4/-6 dB and 20/40/60/80 GHz on a 600 dpi render).
  - qiu2026a Fig. 1(b) read from the PDF vector paths (30 C and 85 C paths identified by legend colour; gridlines calibrated the same way).
- Compared taghavi2026a against canonical `data/devices.csv` taghavi2026-a, `data/papers.csv` taghavi2026 and `data/evidence/taghavi2026.yaml`. Compared kotz2026 against the canonical KIT SOH GSG rows, and zhang2026a against chiang2025-a (same group, GSGSG).
- Mechanical check (scratch script) on all 7 rows:
  - Every populated `evidence: true` cell has an entry with an equal value and the schema unit: 0 missing, 0 mismatches, 0 unit errors.
  - 0 orphan entries, 0 qualifiers on empty fields, and drive/vpi_convention present wherever a Vpi is filled.
  - No note exceeds 25 words.
  - All 6 evidence files carry `context_values.license_notice`.
  - No `vpi_rf_v` or `vpi_rf_freq_ghz` remains anywhere in zhang2026a (CSV or YAML).
- Figure readings are approximate.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| kotz2026 | 1 | corrections confirmed | F3, F8 applied; headline cells re-checked clean |
| cai2026 | 2 | corrections confirmed | F5 note confirmed on Fig. 3(a); gt 110 correct |
| li2026b | 1 | corrections confirmed | F2 handled per coordinator ruling; N1 (optional wording) |
| taghavi2026a | 0 | corrections confirmed | F1 applied; papers notes accurate; N3 (optional wording) |
| zhang2026a | 2 | corrections confirmed | F4, F6 applied; values re-read on Fig. 2(a)-(b) |
| qiu2026a | 1 | corrections confirmed | F7 applied; N2 (optional wording) |

## Dispositions vs staged files

| ID | Disposition | Reflected in staged files | Source check |
|---|---|---|---|
| F1 | applied | yes. Row taghavi2026a-a absent. Evidence has `entries: []` and keeps license_notice. `repro_grade` empty. Notes replaced. | confirmed (see below) |
| F2 | applied-adjusted (coordinator ruling) | yes. `bw3db_ghz` 67, `bw3db_ghz:gt`, `bw_measured_to_ghz` 67 unchanged. Notch recorded in row notes and evidence note. | ruling applied faithfully; notch confirmed (depth N1) |
| F3 | applied | yes. drive push_pull, vpi_convention mzm_push_pull. Evidence entries basis derived, locator p.2 Sec. 2 / Fig. 1(a), notes say "authors do not state". | confirmed |
| F4 | applied | yes. -a: `vpi_dc_v` 6.7. -b: `vpi_dc_v` 3.2 with `vpi_dc_v:approx`. `vpi_rf_*` empty on both rows and both evidence entries renamed. | confirmed |
| F5 | applied (note only) | yes. Row notes and evidence note mention the single-point spike to about -3.2 dB near 104 GHz. | confirmed |
| F6 | applied (note only) | yes. zhang2026a-a notes carry the 3.8 V per pi sentence. | confirmed |
| F7 | applied (note only) | yes. Row notes and evidence note updated; cell 25 approx unchanged. | confirmed (wording N2) |
| F8 | applied (note only) | yes. Row notes and evidence note say the coupler type is not stated. | confirmed (p.2 "GC or EC") |
| F9 | applied | yes. Keysight Technologies Deutschland GmbH `parent_org` = Keysight Technologies (staged in p5_04; not flagged per coordinator). | n/a |

## Changed cells

| device_id | column | old -> new | Verdict | Evidence checked |
|---|---|---|---|---|
| taghavi2026a-a | whole row | deleted; evidence entries -> [] | confirmed | OFC p.2 Sec. 2 repeats canonical taghavi2026-a: R 40 um, t_slab about 90 nm, 150 pm/V (canonical tuning 0.15), 4.77 nW/pi, VpiL about 0.33 V cm (canonical 0.333), Isat 0.36 nA, 2.83 Vpp, 30 kHz to 11 GHz, f-6dB at least about 7.8 GHz. The OFC paper adds only VDC about 0.5 V and Eext about 1.2 V/um. The papers notes state both, and the Table 1 "about 0.3 (0.03 at DC)" vs text 0.33 V cm conflict, verbatim correct. |
| kotz2026-a | drive | unspecified -> push_pull (derived) | confirmed | Fig. 1(a) shows each MZM as G-S-G with a phase-shifter waveguide in both S-G gaps. p.2: "In-between the signal and the ground electrodes, 1 mm long SOH slot waveguide phase shifters". Convention (f): "push_pull ... also for a single GSG feed". Same-group canonical rows (schwarzenberger2026-a, ummethala2021-a, wolf2018a-static, kieninger2020-best-dc/system-dc) are all tw_gsg / push_pull / mzm_push_pull. |
| kotz2026-a | vpi_convention | unspecified -> mzm_push_pull (derived) | confirmed | p.2: "the half-wave voltage of the nested MZM ... 780 mV and 790 mV for the two arms" (MZM-level). |
| zhang2026a-a | vpi_rf_v / vpi_dc_v | 6.7 / empty -> empty / 6.7 | confirmed | p.1 Sec. 2: "measured using a 1 MHz sinusoidal driving signal and is 6.7 V". Note "1 MHz sinusoid, entered as quasi-static" is correct. |
| zhang2026a-a | vpi_rf_freq_ghz | 0.001 -> empty | confirmed | No stale entry left in the CSV or the YAML. |
| zhang2026a-b | vpi_rf_v / vpi_dc_v | 3.2 / empty -> empty / 3.2 approx | confirmed | Fig. 2(b), approximate: 2.84 V at 50 mHz; 2.89 V at 0.1 Hz; about 3.03 V flat from 0.2 Hz to 5 kHz (one 2.92 V point at 0.5 Hz); rising to 3.21 V at 1 MHz. The 1 MHz point reads 3.21, so 3.2 approx is right; the notes "about 2.84 to 3.21 V" are right. |
| zhang2026a-b | vpi_rf_freq_ghz | 0.001 -> empty | confirmed | as above |
| zhang2026a-b | qualifiers | vpi_rf_v:approx -> vpi_dc_v:approx | confirmed | as above |
| Keysight Technologies Deutschland GmbH | parent_org | empty -> Keysight Technologies | confirmed (text cell) | li2026b p.1 affiliation 5; the parent row is in p5_04 |

Note-only checks:

- **F6.** Fig. 2(a): 5.3 pi at 20 V, so about 3.8 V per pi. Confirmed.
- **F5.** Fig. 3(a):
  - The 1 V trace has one spike to about -3.2 dB near 104 GHz.
  - The 4 V trace dips to about -2.8 dB near 101 GHz but stays above -3 dB.
  - p.2: "the 3-dB EO bandwidth exceeds 110 GHz ... for reverse bias voltages ranging from 1 V to 4 V".
  - Result: `gt 110` and the spike note are confirmed.

## Coordinator-ruled item (li2026b-a, F2)

- **Applied.** `bw3db_ghz` 67 gt, `bw_measured_to_ghz` 67, `bw_basis` measured. The notch is in the row notes and in the evidence note.
- **Sources.**
  - Abstract: ">67-GHz GeSi electro-absorption modulator".
  - p.2: "the GeSi EAM exhibits a >67-GHz 3-dB EO bandwidth".
- **My vector-path reading of the Fig. 1(b) green trace** (approximate):
  - Starts at +0.16 dB at 0.5 GHz.
  - Dips to -2.0 dB near 21.8 GHz, then sits at -1.05 to -1.6 dB from 25 to 44 GHz.
  - Below -2 dB from 45.2 to 48.0 GHz. Minimum about -3.25 dB at 46.6 GHz (centre line); below -3 dB only from 46.4 to 47.0 GHz.
  - Second dip to about -2.5 dB near 65.3 GHz.
  - Ends at about -2.0 dB at 67.0 GHz.
- **Verdict.**
  - The ruling is faithfully applied.
  - The notch position (46.7 GHz) is confirmed. Width: about 2.5 GHz stated vs 2.8 GHz below -2 dB.
  - Depth: about -3.1 dB stated vs about -3.25 dB from the path. That is within "about" (see N1).
  - The bound and the measured range of 67 GHz are confirmed.

## Independent headline re-check (all rows)

| Row | Cells re-checked against source | Result |
|---|---|---|
| kotz2026-a | Vpi 0.79 V (780/790 mV, p.2; frequency unstated, vpi_dc_v); length 1 mm; 1550 nm; IL fiber-to-fiber 17.7 dB; drive_vpp 1.1 lt (p.3 "below 1.1 V"); max_baud 200; slab 90 nm (Fig. 1(b)); no bandwidth reported, none entered; AIR not entered as net rate | clean |
| cai2026-a | 1600 nm; 0.04 mm; IL 1.5 dB (Fig. 2(a) right axis about -1.46 dB at 1600 nm, about -2.3 dB at 1590 nm); ER 3 dB static (Fig. 2(a) 7 V about 3.1); bw3db 110 gt, measured to 110, ref dc derived; roll-off 1 dB at 110 GHz (4 V); -1 dBm; 150 GBd; line rate 300 Gb/s; 180 GHz RC fit not entered | clean |
| cai2026-b | 0.1 mm; IL 6.3 lt (Fig. 2(b) about -6.3 dB at 1590 nm, rising toward 1610 nm); ER 7.5 dB static (Fig. 2(b) 7 V max about 7.4) | clean |
| li2026b-a | 1563 nm; drive 1.4 Vpp (AWG with EA inside the AWG box in Fig. 1(a), so the driver note is right); bandwidth as above; IL 3.5 dB at 0 V on-chip (couplers 4.5 dB each and self-heating 4 dB excluded); ER 3.1 dB static at -2 V; 160 GBd; net 300 Gb/s; no length or Vpi, none entered | clean |
| zhang2026a-a | 0.5 mm; Vpi 6.7 V (vpi_dc_v); drive_vpp 2.4 V (differential AWG channel); push_pull measured ("GSGSG traveling-wave electrode configured for push-pull drive"); vpi_convention unspecified (same as chiang2025-a); 1550 approx; max_baud 224; net 330/330/358/414/403 Gb/s; max_net 414; Fig. 1(b) combined spectrum not entered as EO bandwidth | clean |
| zhang2026a-b | 1 mm; Vpi 3.2 approx (Fig. 2(b)); drive and convention unspecified (not stated for this device) | clean |
| qiu2026a-a | bw6db 25 approx ("~25 GHz", package incl. drivers); IL fiber-to-fiber 14.5 dB per polarization; drive differential; max_baud 125; net 1000 approx; 0.4 V package Vpi only in notes; length empty (3 mm is the die) | clean |

Papers rows: identity, licence, countries and orgs are unchanged from the audit's verified-clean state. taghavi2026a `repro_grade` empty is valid (the column is not required; 8 canonical papers already have it empty).

## New findings (all minor, optional, note wording only)

**N1 (minor). li2026b-a notch depth.**
- The vector path gives about -3.25 dB at 46.6 GHz, below -3 dB from 46.4 to 47.0 GHz. The trace starts at +0.16 dB.
- The staged text says "about -3.1 dB near 46.7 GHz (about 2.5 GHz wide)". This is acceptable as an approximate reading.
- Optional exact fix, in both the row notes and the evidence `bw3db_ghz` note: replace "about -3.1 dB near 46.7 GHz (about 2.5 GHz wide)" with "about -3.2 dB near 46.6 GHz (below -2 dB from about 45 to 48 GHz)".
- No cell change. The ruling stands.

**N2 (minor). qiu2026a-a 30 C trace description.**
- The vector path for the 30 C trace, in absolute dB:
  - It first crosses -6 dB at about 18.4 GHz and reaches its minimum of -6.4 dB near 19.3 GHz.
  - It recovers to about -5.5 dB near 21-23 GHz and stays below -6 dB from about 24 GHz.
- The staged "first touches -6 dB near 19-20 GHz, below from about 25 GHz" is approximately right.
- Optional exact fix, in the row notes and the evidence note: "30 C trace first touches -6 dB near 18.5-19.5 GHz, below from about 24 GHz".
- No cell change.

**N3 (minor). taghavi2026a papers notes phrasing.**
- "f-6dB about 7.8 GHz to 11 GHz" can be misread as a range of f-6dB values.
- Optional exact fix: replace it with "f-6dB at least about 7.8 GHz (swept 30 kHz to 11 GHz)". The same phrase appears in BATCH_REPORT line 21 as "f-6dB about 7.8 GHz measured to 11 GHz", which is fine.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_09`:

```
merge counts: {'papers': 6, 'devices': 7, 'orgs': 5, 'evidence': 6}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
