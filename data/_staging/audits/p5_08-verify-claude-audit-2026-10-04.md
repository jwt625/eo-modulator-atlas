---
verifier: fresh-context subagent (independent of auditor and distiller)
task: verify audit corrections for staged batch p5_08
date: 2026-10-04
scope: data/_staging/p5_08 (sun2026, tatarczak2026, tiberi2026, karakida2026, kholeif2026); papers.csv, devices.csv (7 rows after corrections), organizations.csv (2 orgs), evidence/*.yaml; audit data/_staging/audits/p5_08-q1-claude-audit-2026-10-04.md; dispositions data/_staging/p5_08/AUDIT_DISPOSITIONS.md
mode: read-only except this file; no edits to staged or canonical data, no git, no network; merge_staging.py dry run only
verdict: corrections confirmed for all five papers; one new minor finding (karakida2026-a er_type empty)
counts: {confirmed: 16, not_confirmed: 0, new_findings: 1}
---

# Verification of audit corrections: p5_08

## Method

- Read the audit (F1-F11) and the dispositions table, then every staged file.
- Sources read: `references/tiberi2026/text.md` (all), `references/tiberi2025/text.md` (Fig. 9 caption, p.14-15, Table IV, Ref. [103], affiliation 4), `references/tatarczak2026/text.md`, `references/kholeif2026/text.md` (all), `references/karakida2026/text.md`, `references/sun2026/text.md`, `references/patel2026/text.md` p.1.
- Figures opened: tiberi2026 `page_02.png` (Fig. 1(a), 2(a), 2(b)) and `page_03.png` (Fig. 3, Table 1); tiberi2025 `page_14.png` (Fig. 9(b), 9(c)); tatarczak2026 `page_01.png` (Fig. 1(a)); karakida2026 `page_02.png` (Fig. 2(c)-(e)); sun2026 `page_03.png` (Fig. 3(e)); kholeif2026 `page_02.png` (Fig. 1(c)-(i)). All figure readings below are mine and approximate.
- Scratch script (scratchpad only) over the staged rows: evidence present and equal for every non-empty `evidence: true` column, schema units, qualifiers on populated fields, row notes at most 25 words, orphan entries, `derived` lists, `license_notice` presence.
- `uv run python scripts/merge_staging.py data/_staging/p5_08` (dry run).

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| sun2026 | 2 | corrections confirmed | F11 notes present; tuning values re-read |
| tatarczak2026 | 1 | corrections confirmed | F5 applied; bandwidth re-read |
| tiberi2026 | 2 (c, d) | corrections confirmed | F1-F4 applied; duplication of tiberi2025 confirmed; no new C-band content lost |
| karakida2026 | 1 | issues (minor) | F10 applied; new finding N1 (er_type empty) |
| kholeif2026 | 1 | corrections confirmed | F8, F9 applied; arithmetic re-checked |
| organizations | 2 | corrections confirmed | F6 note, F7 note traceable |

## Priority checks

### (1) tiberi2026-a / -b removal

Confirmed justified.

- C 40 um rows: tiberi2026 Table 1 (p.3) SNR 5.17/4.02/2.38, BER 1.2e-7/2.9e-5/8.5e-3, ER 1.05/1.02/0.82 at 50/60/80 Gb/s equal the tiberi2025 Table IV (p.15) L = 40 um "Filtered" columns digit for digit. tiberi2026 marks them "a: with pre-emphasis and CTLE filtering", the same processing.
- C 100 um rows: 4.84/3.75/2.31; 6.6e-7/8.9e-5/1e-2; 1.89/1.74/1.41 equal tiberi2025 Table IV L = 100 um "Filtered" columns exactly.
- S21: tiberi2026 Fig. 2(b) and tiberi2025 Fig. 9(b) have the same point pattern: a low 1 GHz point (about -0.7 dB below the peak in Fig. 2(b), about -56.0 vs -55.3 dB in Fig. 9(b)), a peak near 5 GHz, a shoulder near 40-45 GHz, and the last points near 67 GHz at about -3.3 to -3.4 dB below peak. The 2026 plot is renormalized to 0 dB and adds an RC model instead of the envelope fit. Both papers assign it to a 40 um device.
- Eyes: tiberi2026 Fig. 3(a) 60 and 80 Gb/s C-band eyes match tiberi2025 Fig. 9(c) visually.
- tiberi2026 Ref. [8] is tiberi2025 (arXiv:2506.03281), so the 2026 short paper re-reports its own preprint.

C-band content in tiberi2026 that is not in tiberi2025, and where it now sits:

| Item | Source | Staged location |
|---|---|---|
| Static C-band ER about 3.5 dB, ideal bias about 3.5 V (40 um) | p.1 Sec. 2; Fig. 2(a) (my reading about 3.4 dB, -30 to +10 V) | context `static_er_c_band_40um` |
| About 3 Vpp at the EAM, under 100 fJ/bit | p.2 | context `drive_estimate` (with the tiberi2025 7 V / 58 fJ/bit conflict noted) |
| RC model, about 100 GHz 6 dB BW, C = 0.0015 F/m2, Rc about 400 ohm um | p.2; Fig. 2(b) | context `bw6db_simulated` |
| Simulated max static ER 4.8 dB (C) / 3.6 dB (O) | p.1; Fig. 1(b) | context `max_static_er_simulated` |
| C-band Table 1 SNR and eye ER | p.3 Table 1 | context `snr_table1`, `eye_er_db_table1` |
| C-band waveguide width 450 nm | Fig. 1(a) | already on tiberi2025-a (rib_width_nm 450) |

Not recorded, judged non-material: Pauli-blocking EF thresholds (0.4 / 0.475 eV, theory), O-band SOA output 3 dB lower and NF 5 dB (setup). Nothing measured and new at C-band was lost.

### (2) tiberi2026-c trimmed row

Confirmed.

- max_baud_gbd and max_line_rate_gbps are empty; their evidence entries are gone. The 40 Gb/s O-band 40 um eye (Fig. 3(a)) matches tiberi2025 Fig. 9(c) "40 Gbit/s O-band" visually; tiberi2025-c already carries 40 GBd / 40 Gb/s.
- Remaining cells and traceability:
  - wavelength_nm 1310: p.1 "at 1550 and 1310 nm"; Fig. 1 caption O-band 1310 nm.
  - length_mm 0.04: p.1 "40 um O-band EAM"; Table 1.
  - extinction_ratio_db 2 (approx, static): p.1 "ER ~ 2 dB in O"; Fig. 2(a) O-band trace about 0 dB (-25 V) to a -2.0 dB plateau (0 to +10 V), my reading 2.0 dB.
  - rib_width_nm 400: Fig. 1(a) O-band cross-section label "400 nm".
  - modulation_format "... BER 4.4e-2, eye ER 0.81 dB (Table 1)": Table 1 O/40/40 row (SNR 4.62, BER 4.4e-2, ER 0.81). These numbers are not in tiberi2025 (Table IV is C-band only).
  - electrode_metal, epitaxy_or_stack, driver: p.1-2 text; Fig. 1(a) legend (40 nm Al2O3, 3.5 nm hBN, 220 nm Si).
- Row notes ("Likely same 40 um device ...") are accurate. "Likely" is correct: tiberi2026 does not state the device identity.

### (3) tiberi2026-d rib_width_nm 400 and baud basis

Confirmed.

- rib_width_nm 400: Fig. 1(a) labels the O-band waveguide 400 nm (C-band 450 nm). The p.1 text says C- and O-band devices have "different WG widths". The 100 um O-band device is an O-band design; tiberi2025 p.15 also states that O-band devices use 400 nm. extracted_from_figure is the right basis.
- max_baud_gbd 40, basis measured, note "NRZ, one bit per symbol": Table 1 O/100/40 row (SNR 4.81, BER 4.1e-2, ER 0.81). This matches the tiberi2025-a/-c precedent (`measured`, same note). The device is new; tiberi2025 has no 100 um O-band result.

### (4) tatarczak2026-a drive moved to context

Confirmed. p.2 Sec. 2.1: "This modulator at T=20 C requires a driver voltage swing of 2.0 Vppd on 100 Ohm load." The only large-signal result is the simulated 426 Gb/s eye (Fig. 1(c) "Simulated Transmitter Eye"). The schema defines drive_vpp_v as "RF drive amplitude used in the system demo", so the cell is correctly emptied. Context `drive_requirement` holds the value with locator p.2 Sec. 2.1.

Bandwidth re-read (Fig. 1(a), page_01.png): the trace crosses the plotted -3 dB line near 100 GHz and ends near 109-110 GHz at about -5.4 dB. bw3db_ghz 100 approx (extracted_from_figure, reference dc) and bw_measured_to_ghz 110 approx are confirmed.

### (5) CORNERSTONE GB note

Confirmed traceable.

- tiberi2026 p.1: "220 nm silicon-on-insulator (SOI) platform fabricated at CORNERSTONE [8]". Ref. [8] is tiberi2025 (arXiv:2506.03281).
- tiberi2025 Ref. [103] (Littlejohns et al., Appl. Sci. 10, 2020) carries the URL `https://www.cornerstone.sotonfab.co.uk/`.
- tiberi2025 affiliation 4 is "Optoelectronics Research Centre, University of Southampton, SO17 1BJ, Southampton, UK".
- The note wording ("GB from the Southampton-hosted URL in tiberi2025 Ref. [103], cited as tiberi2026 Ref. [8]") matches these sources. Country GB, region europe and empty parent_org are consistent with the note.

NVIDIA Corporation note (F6): sun2026 p.1 prints "NVIDIA Corporation, Santa Clara, CA, USA" and "NVIDIA Corporation, Yokneam, Israel"; patel2026 p.1 prints "NVIDIA, 2788 San Tomas Expressway, Santa Clara". The note is accurate. The p5_02 alignment is left to the coordinator, as instructed.

### (6) Evidence coverage and license_notice

Confirmed.

- All 7 rows: every non-empty `evidence: true` cell has an entry with an equal value and the schema unit. There are 0 missing, 0 mismatches and 0 orphans; extra entries exist only for descriptive columns (il_onchip_includes/excludes, driver, er_type), and their values equal the cells.
- Every qualifier sits on a populated field.
- All row notes are at most 25 words.
- `derived: []` in all five files (kholeif2026 F9 applied).
- `context_values.license_notice` is present in all five evidence files ("Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group", locator p.1-3 page footer). This matches the page footers I saw on tiberi2026, tatarczak2026, karakida2026, kholeif2026 and sun2026 renders.

## Changed cells

| device_id | column | change | verdict | source check |
|---|---|---|---|---|
| tiberi2026-a | whole row | deleted | confirmed | Table 1 C 40 um = tiberi2025 Table IV filtered; Fig. 2(b) = Fig. 9(b) |
| tiberi2026-b | whole row | deleted | confirmed | Table 1 C 100 um = tiberi2025 Table IV L = 100 um filtered |
| tiberi2026-c | max_baud_gbd | 40 -> empty | confirmed | 40 Gb/s O-band 40 um eye already on tiberi2025-c |
| tiberi2026-c | max_line_rate_gbps | 40 -> empty | confirmed | same |
| tiberi2026-c | modulation_format | rewritten with BER 4.4e-2, eye ER 0.81 dB | confirmed | Table 1 O/40/40 |
| tiberi2026-c | extinction_ratio_db | 2 approx static (unchanged) | confirmed | p.1 "ER ~ 2 dB in O"; Fig. 2(a) about 2.0 dB |
| tiberi2026-c | wavelength_nm | 1310 (unchanged) | confirmed | p.1 |
| tiberi2026-d | rib_width_nm | empty -> 400 | confirmed | Fig. 1(a) O-band label 400 nm |
| tiberi2026-d | max_baud_gbd basis | derived -> measured | confirmed | Table 1; tiberi2025 precedent |
| tatarczak2026-a | drive_vpp_v | 2.0 -> empty (context) | confirmed | p.2 Sec. 2.1 requirement; eye simulated |
| tiberi2026 | papers.csv notes | cross-reference text | confirmed | accurate to Table 1, Fig. 2(b), tiberi2025 p.15 (about 7 V, 58 fJ/bit) |
| CORNERSTONE | org notes | traceable GB note | confirmed | tiberi2025 Ref. [103] URL, affiliation 4 |
| NVIDIA Corporation | org notes | sites note | confirmed | sun2026 p.1, patel2026 p.1 |
| kholeif2026-a | evidence locator/notes (F8) | energy locator p.1 Introduction; IL note 0.74 vs 0.75; swapped-voltage note | confirmed | Fig. 1(c) label "IL: 0.74 dB", caption 0.75; 20/72 x 18 fF x 0.11^2 = 60.5 aJ, 4/56 x 18 fF x 0.14^2 = 25.2 aJ |
| kholeif2026 | derived (F9) | -> [] | confirmed | 25.5 GHz/V and 279.5 GHz kept in context |
| karakida2026 / sun2026 | evidence notes (F10, F11) | wavelength note, loss_claim rename, "bias range not stated" | confirmed | karakida2026 p.1 Introduction "optical loss can be as small as 2 dB"; sun2026 Fig. 3(e) |

## Independent headline re-check (all rows)

| device_id | cells checked | result |
|---|---|---|
| sun2026-a / -b | tuning 0.0474 / 0.0426 nm/V | Fig. 3(e) diamond centres about 47.4 and 42.6 pm/V: OK. wavelength 1310 (design), 270 nm SOI, 200 nm etch: OK (p.1-2) |
| tatarczak2026-a | bw3db 100 approx, measured to 110 approx, 1310 nm | OK (Fig. 1(a), p.2) |
| tiberi2026-c | length 0.04, 1310 nm, ER 2 static, width 400 | OK |
| tiberi2026-d | length 0.1, 40 GBd / 40 Gb/s NRZ, BER 4.1e-2, width 400 | OK (Table 1, Fig. 1(a)) |
| karakida2026-a | bw3db 40 (fit, derived), measured to 70, IL 3.0, ER 2.0 at 1515 nm, 10 V swing, Q about 40, 0.30 nm/V, 30 um, 370 nm film | OK (Fig. 2(c)-(e): IL arrow at -5 V, 2.0 dB over -5 to +5 V, x-axis ends at 7 x 10^1 GHz, fit crosses -3 dB at 40 GHz; p.3 text). See N1 |
| kholeif2026-a | IL 0.74, ER 18.6 static, Q 12 900, 1563.1 nm, 86 um, 0.22 Vpp, 100 GBd / 200 Gb/s, NDR 152, 18 fF, 0.0128 fJ/bit, fiber-to-fiber 13.75 | OK (p.2-3 text, Fig. 1(c), 1(h)); 4/56 x 18 fF x 0.1^2 = 12.9 aJ |

## Issues and new findings

**N1 (minor, new). karakida2026-a has extinction_ratio_db 2.0 but er_type is empty.**
- All 127 canonical rows with an ER carry an er_type. The other ER rows in this batch (tiberi2026-c, kholeif2026-a) carry `static`.
- Source: karakida2026 Fig. 2(d) "Reflectance as a function of applied voltage at 1515 nm". The 2.0 dB ER and 3.0 dB IL are read off this DC sweep between -5 and +5 V (p.3 text; poster "at 10 Vpp"). No dynamic eye is reported.
- Proposed fix: `data/_staging/p5_08/devices.csv` row karakida2026-a, er_type empty -> `static`. Optionally add the evidence entry `{device_id: karakida2026-a, field: er_type, value: static, unit: '', basis: measured, locator: p.2 Fig. 2(d); p.3 Sec. 3, note: "DC reflectance sweep, -5 to +5 V"}`.

No not-confirmed items.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_08`:

```
merge counts: {'papers': 5, 'devices': 7, 'orgs': 2, 'evidence': 5}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
