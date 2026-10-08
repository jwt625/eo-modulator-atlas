# Long evidence notes: fresh-context verification (Claude, 2026-10-07)

Scope: the 66 proposals in `data/_staging/ingest_2026_10_07/long_notes_proposals.csv` (brief `NOTES_PROMPT.md`), checked against
`long_notes.csv`, `data/evidence/<paper_id>.yaml` (value, basis, locator), `data/devices.csv` row notes and, where wording of a fact
changed, the source text or figure under `references/`. Read-only; no data files edited.

Checks per note: new note at most 25 words (`str.split`, the same as `scripts/validate_db.py`); not wrong against the evidence entry
or source; no conflicting reading or caveat dropped unless it is in the row notes or `overflow_to_row_notes`; no new claim.

Mechanical results: all 66 rows align with `long_notes.csv` (same paper_id, device_id, field, order); all 66 YAML notes match the
input text exactly; all 66 `new_words` values are correct and at most 25. (The `words` column of the input reports 18 for
eltes2023-a vpi_convention; the note is actually 27 words. This does not affect the proposal.)

Result: 60 confirmed, 6 fixed (one of them, chen2025-h, depends on a value correction; see the ruling below).

## chen2025-h ruling (wavelength_nm, Fig. 3(d))

Measured from `references/chen2025/figures/img_p05_2.png` (2051 x 1569 px). x axis calibrated from the tick marks
(1540 nm at x = 161, 20 nm per 173.5 px, 8.667 px/nm). Validation: this calibration reproduces the N50 peak at 1566.7 nm and the
N60 peak at 1567.5 nm, the same as the chen2025-f and chen2025-g values.

| trace | color | apex read (nm) | evidence value (nm) |
|---|---|---|---|
| N50 | black | 1566.7 | 1566.7 (f) |
| N60 | red | 1567.5 | 1567.5 (g) |
| N70 | blue | 1568.3 | 1568 (a; read from Fig. 3(e),(f)) |
| N80 | green | 1569.4 to 1569.6, about -17 dB | 1568.5 (h) |
| N90 | purple | 1568.2 to 1568.3, about -25 dB | 1568.4 (i) |

- The N80 (green) trace rises from about 1568.7 nm and reaches its highest visible point at 1569.4 to 1569.6 nm. There it merges into
  the N50 (black) trace, so the very top may be hidden behind it. Between 1568.0 and 1568.7 nm the green trace sits at about -34 to
  -41 dB, so it has no peak near 1568.5 nm.
- Ruling: neither 0.5 nm nor 0.7 nm resolves the conflict. The 1568.5 nm value itself is about 0.9 nm off, beyond both
  uncertainties. It was probably confused with the N70 and N90 peaks near 1568.3 nm. The correct reading is about 1569.4 nm.
  Because the apex ends at the N50 trace, its position is bounded to about 1569.2 to 1569.6 nm, so an uncertainty of about 0.5 nm
  is enough when it carries the "partly hidden" caveat.
- Required data correction (outside this task; not applied): chen2025-h `wavelength_nm` 1568.5 -> 1569.4
  (extracted_from_figure, p.5 Fig. 3(d)). Also change the chen2025-h row-notes sentence "Resonance about 1568.5 nm ... (about 0.7 nm
  reading uncertainty (peak partly hidden behind other traces)" to 1569.4 nm and about 0.5 nm (apex partly hidden behind the N50
  trace). Check whether chen2025-h `band` or other wavelength-derived fields change; both values are in the C band.
- Note to apply together with that value correction (25 words):
  `N = 80 peak read from Fig. 3(d), about 0.5 nm uncertainty (apex partly hidden by N50); devices' gap not stated, assigned by N only.`
  Do not apply the proposed chen2025-h note on its own while the value stays 1568.5.
- Side observation: chen2025-i (N90) 1568.4 agrees with my 1568.2 to 1568.3 reading within its 0.5 nm.

## Per-note verdicts

| # | device_id | field | verdict | comment |
|---|---|---|---|---|
| 1 | chen2023-a | prop_loss_db_per_cm | confirmed | Only "itself" dropped. |
| 2 | chen2025-a | tuning_nm_per_v | confirmed | The magnitude number is redundant with the signed value. |
| 3 | chen2025-a | il_onchip_db | confirmed | |
| 4 | chen2025-b | tuning_nm_per_v | confirmed | |
| 5 | chen2025-c | tuning_nm_per_v | confirmed | |
| 6 | chen2025-d | tuning_nm_per_v | confirmed | |
| 7 | chen2025-e | tuning_nm_per_v | confirmed | |
| 8 | chen2025-f | wavelength_nm | confirmed | Value 1566.7 reproduced from the figure. |
| 9 | chen2025-g | wavelength_nm | confirmed | Value 1567.5 reproduced from the figure. |
| 10 | chen2025-h | wavelength_nm | fix (with value correction) | See the ruling. Corrected note: `N = 80 peak read from Fig. 3(d), about 0.5 nm uncertainty (apex partly hidden by N50); devices' gap not stated, assigned by N only.` (25) |
| 11 | chen2025-i | wavelength_nm | confirmed | |
| 12 | chen2026-a | bw_measured_to_ghz | confirmed | The row notes carry the dip depths. |
| 13 | eltes2020-a | r_eff_pm_per_v | fix | The proposal says "Fig. 1f caption gap (9.0 um)", but the caption states only 16.7 MV/m = 150 V; the 9.0 um gap is inferred from those. It also says only "Fig. S3" without the reason (a BaTiO3-SiN device). Corrected: `Hysteresis fit (SI Eq. 3), 45 deg; 300 K about 365. SiN design: Fig. 1f caption field/voltage implies 9.0 um gap; Fig. S3 is BaTiO3-SiN.` (25). Keep the proposed overflow sentence. The row notes carry 16.7 MV/m, 150 V, 321 pm/V and the 45 deg / 4 K detail. |
| 14 | eltes2020-b | bw6db_ghz | confirmed | The row notes use "setup limit" and say the marker is dashed. |
| 15 | eltes2023-a | vpi_convention | confirmed | |
| 16 | eltes2023-a | integration | confirmed | The shortened quote is an exact substring; the row notes carry the full quote. |
| 17 | han2023-a | vpi_dc_v | confirmed | The row notes say "transmission change of only about 10 percent". |
| 18 | han2023-c | bw3db_ghz | confirmed | The row notes carry "reverse bias" and the full quote. |
| 19 | hillier2025-1mm-q1 | il_onchip_db | confirmed | |
| 20 | hillier2025-2mm-data | max_baud_gbd | confirmed | |
| 21 | hu2023-a | drive_vpp_v | confirmed | |
| 22 | huang2026-b | bw3db_ghz | confirmed | The row notes carry the -2.6 to -3.7 dB, 82 to 110 GHz pixel reading. |
| 23 | huang2026-a | bw_measured_to_ghz | fix | The proposal changes "lowest about -2.8 dB" to "lowest -2.8 dB", which overstates the precision of a figure reading. Corrected: `Data end near 110 GHz at about -2.6 dB (lowest about -2.8 dB), no crossing; bw3db_ghz 110 is the paper's claimed crossing at instrument limit.` (25). The row notes identify the trace as "pre-packaging" (the "dashed" trace). |
| 24 | khalil2026-a | temperature_k | confirmed | |
| 25 | kohli2023-a | vpi_dc_v | confirmed | |
| 26 | kohli2023-a | vpi_convention | confirmed | |
| 27 | kohli2025-rt | bw_measured_to_ghz | confirmed | |
| 28 | li2024-c | vpi_convention | confirmed | The row notes carry "HSPS". |
| 29 | li2024-o | max_net_rate_gbps | confirmed | |
| 30 | li2026-a | bw_measured_to_ghz | confirmed | |
| 31 | li2026-a | electrode_gap_um | fix | The proposal changes "consistent with the SEM" to "matches li2026ba SEM", which strengthens the claim. It also drops the primary reading (gap between facing T-bars), and the li2026-a row notes do not carry it. Corrected note: `G of T-segment CPW, metal-to-metal gap across waveguide (Fig. 1(e), consistent with li2026ba SEM); caption: T-segments on grounds only; opposite element may be signal edge.` (25). Corrected overflow: `electrode_gap_um 6 is G of the T-segment CPW, the gap between facing T-bars where the waveguide sits, read from the Fig. 1(e) schematic.` |
| 32 | li2026a-a | etch_depth_nm | confirmed | |
| 33 | li2026a-b | etch_depth_nm | confirmed | |
| 34 | li2026b-a | bw3db_ghz | confirmed | The row notes carry "below -2 dB from about 45 to 48 GHz". |
| 35 | li2026ba-a | bw3db_ghz | confirmed | |
| 36 | lin2025-a | bw3db_ghz | confirmed | The overflow is needed; the row notes carry no bandwidth detail. |
| 37 | liu2026d-a | vpil_dc_vcm | confirmed | The row notes carry p.4, high-pass and f -> infinity (true for all of liu2026d-a..g). |
| 38 | liu2026d-b | vpil_dc_vcm | confirmed | |
| 39 | liu2026d-c | vpil_dc_vcm | confirmed | |
| 40 | liu2026d-c | vpi_dc_v | confirmed | The row notes carry the high-pass fit and the 7.64 V point. |
| 41 | liu2026d-d | vpil_dc_vcm | confirmed | |
| 42 | liu2026d-e | vpil_dc_vcm | confirmed | |
| 43 | liu2026d-f | vpil_dc_vcm | confirmed | |
| 44 | liu2026d-g | vpil_dc_vcm | confirmed | |
| 45 | liu2026d-h | drive_vpp_v | confirmed | "Stated" matches the row notes ("stated amplifier maximum"). |
| 46 | lotkov2024-a | bw6db_ghz | confirmed | |
| 47 | lu2020-a | r_eff_pm_per_v | confirmed | The row notes carry n 1.66, confinement 0.738, d_eo, d_c, eps and Supplementary Note 2. |
| 48 | niels2026-a | vpi_mzm_pushpull_dc_v | confirmed | |
| 49 | niels2026-a | bw3db_ghz | confirmed | |
| 50 | ogiso2020-a | drive | confirmed | |
| 51 | ogiso2020-a | vpi_convention | fix | The proposal says "paper never says 'series'", which is new and literally false: the source uses "series resistance" (text.md lines 93, 111). The original sentence was about the drive wording only. Corrected: `Vpi between the two differential signal lines; arms in series on common n-layer; paper says 'differential'/'push-pull drive', not 'series'; ogiso2024 (same CL-TWE) is series_push_pull.` (24). The row notes carry GSSG and the ogiso2016/2024 link. |
| 52 | ogiso2020-b | drive | confirmed | |
| 53 | rakowski2026-b | il_onchip_db | confirmed | |
| 54 | schwarzenberger2023a-a | drive_vpp_v | confirmed | The row notes carry the 1.4 Vpp PAM4 stated setting. |
| 55 | schwarzenberger2026a-a | max_net_rate_gbps | confirmed | The row notes carry 310.9 Gbit/s, 384 Gbit/s and the mixed operating points. |
| 56 | shen2025-a | il_onchip_db | confirmed | The overflow (image filename) is accepted. |
| 57 | shen2025-d | il_onchip_db | confirmed | The overflow is accepted (the row notes say only "supplement docx image"). |
| 58 | shen2026-a | bw3db_ghz | confirmed | |
| 59 | singer2025-a | il_onchip_db | confirmed | The row notes carry p.16. |
| 60 | wang2022-a | bw3db_ghz | confirmed | The overflow (52 GHz dip position) is needed. |
| 61 | wang2022-b | bw3db_ghz | confirmed | The row notes carry GGB 67A. |
| 62 | xu2022-a | buffer_oxide_um | confirmed | |
| 63 | xu2022-a | energy_per_bit_fj | fix | The source states 1.04 fJ/bit (text.md line 181; basis author_estimate). The proposal turns "consistent with four sub-MZMs into 50 ohm" into an assertion of scope and drops "(modulator vs driver)". Its overflow, "Auditor check of 1.04 fJ/bit (not stated by the authors)", reads as if the authors did not state the value. Corrected note: `Authors give no formula or scope (modulator vs driver); auditor check 4*(0.161 V)^2/50 ohm/(130 GBd*15.38 bit/symbol) = 1.04 fJ/bit fits four sub-MZM 50 ohm loads.` (25). Corrected overflow: `Auditor check (not from the authors): the stated 1.04 fJ/bit is consistent with RF power of the four sub-MZMs into 50 ohm only (modulator load, DAC excluded).` |
| 64 | xue2026-b | eo_rolloff_db | confirmed | The source (line 373) gives the impedance mismatch as the cause, so the parenthetical is faithful. |
| 65 | yang2022-a | vpi_dc_v | confirmed | |
| 66 | zwickel2020-gate300 | z0_ohm | confirmed | |

## Apply list

Apply the proposal unchanged (new_note, and overflow_to_row_notes where it is not empty) for these 60 rows:
1-9, 11, 12, 14-22, 24-30, 32-50, 52-62, 64-66 (row numbers as in the table; the overflow is used for 36, 56, 57, 60 and is empty for the others).

Apply the corrected text instead of the proposal:

```
eltes2020-a | r_eff_pm_per_v | Hysteresis fit (SI Eq. 3), 45 deg; 300 K about 365. SiN design: Fig. 1f caption field/voltage implies 9.0 um gap; Fig. S3 is BaTiO3-SiN.
  overflow (as proposed): r_eff is a hysteresis fit of Delta n vs E (SI Eq. 3).
huang2026-a | bw_measured_to_ghz | Data end near 110 GHz at about -2.6 dB (lowest about -2.8 dB), no crossing; bw3db_ghz 110 is the paper's claimed crossing at instrument limit.
li2026-a | electrode_gap_um | G of T-segment CPW, metal-to-metal gap across waveguide (Fig. 1(e), consistent with li2026ba SEM); caption: T-segments on grounds only; opposite element may be signal edge.
  overflow: electrode_gap_um 6 is G of the T-segment CPW, the gap between facing T-bars where the waveguide sits, read from the Fig. 1(e) schematic.
ogiso2020-a | vpi_convention | Vpi between the two differential signal lines; arms in series on common n-layer; paper says 'differential'/'push-pull drive', not 'series'; ogiso2024 (same CL-TWE) is series_push_pull.
xu2022-a | energy_per_bit_fj | Authors give no formula or scope (modulator vs driver); auditor check 4*(0.161 V)^2/50 ohm/(130 GBd*15.38 bit/symbol) = 1.04 fJ/bit fits four sub-MZM 50 ohm loads.
  overflow: Auditor check (not from the authors): the stated 1.04 fJ/bit is consistent with RF power of the four sub-MZMs into 50 ohm only (modulator load, DAC excluded).
```

Apply only together with the value correction (chen2025-h wavelength_nm 1568.5 -> 1569.4 in the evidence YAML and devices.csv, plus
the row-notes sentence changed to 1569.4 nm and about 0.5 nm, apex partly hidden behind the N50 trace):

```
chen2025-h | wavelength_nm | N = 80 peak read from Fig. 3(d), about 0.5 nm uncertainty (apex partly hidden by N50); devices' gap not stated, assigned by N only.
```
