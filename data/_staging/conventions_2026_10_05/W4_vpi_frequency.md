# W4: Vpi measurement-frequency audit (1 GHz dc/rf split)

Date: 2026-10-05. Read-only audit of `data/devices.csv` against the primary sources (`references/<paper_id>/text.md`, evidence locators). Detail per cell: `W4_vpi_frequency.csv`.

Rule (user decision 2026-10-05): a Vpi measured below 1 GHz goes in `vpi_dc_v` / `vpil_dc_vcm`; at or above 1 GHz it goes in `vpi_rf_v` + `vpi_rf_freq_ghz` / `vpil_rf_vcm`. The planned `vpi_dc_freq_ghz` column records the stated quasi-static frequency (empty for true DC or unstated).

## Coverage
- 226 rows, 120 papers, 337 non-empty Vpi-type cells (`vpi_dc_v` 176, `vpil_dc_vcm` 142, `vpi_rf_v` 13, `vpil_rf_vcm` 3, `vpi_mzm_pushpull_dc_v` 3).
- CSV rows: 337, one per cell. A script check confirmed no missing, extra or duplicate cells, and every value matches the CSV.

## Counts per class
| class | cells | meaning |
|---|---|---|
| FREQ | 167 | right column; a quasi-static frequency is stated and should go in `vpi_dc_freq_ghz` |
| UNSTATED | 86 | frequency not stated (includes 16 simulated or design-target cells); notes say when the context implies DC |
| OK | 81 | right column; true DC (stated DC, static bias spectra, constant voltage) or RF at or above 1 GHz |
| MOVE | 3 | wrong column under the 1 GHz rule |

FREQ values (GHz): 1e-4 (100 kHz) 76; 1e-3 (1 MHz) 35; 1e-7 (100 Hz) 19; 1e-6 (1 kHz) 12; 1e-5 4; 1.4e-5 4; others 2 each or fewer. In 4 cells the paper gives an average over a frequency band, not one frequency. These are written as `low;high`: valdez2022-a (0.1 to 10 MHz), xu2026a-a x2 (10 Hz to 10 kHz), xu2026b-a (1 Hz to 10 kHz). They need a single-value convention before they can be ingested.

## MOVE
| device_id | from | to | value | freq (GHz) | locator | source |
|---|---|---|---|---|---|---|
| chiang2025-a | vpi_rf_v | vpi_dc_v | 3 | 0.025 | p.2, Fig. 3(a) | "AC characterization with a 25 MHz sinusoidal driving signal was used to measure the half-wave voltage" |
| chiang2025-a | vpil_rf_vcm | vpil_dc_vcm | 0.3 | 0.025 | abstract; p.2 | "VπL(AC) of 0.3 V∙cm at 25 MHz" |
| renaud2023-pm | vpi_rf_v | vpi_dc_v | 1 | 0.1 | p.4 | "phase modulator with a Vπ ~ 1 V at 100 MHz" |

On the same rows, move `vpi_rf_freq_ghz` (0.025 and 0.1) to `vpi_dc_freq_ghz` and clear it.

## Flags (beyond classification)
- liu2025b-a: the method text (p.4) says Vpi was measured with a 500 kHz triangular sweep, but the Fig. 4(c) caption says "Half-wave voltage at 1 GHz, 2.92 V". I classified it FREQ 5e-4 from the method text. If the caption is right, it becomes a MOVE to RF at 1 GHz.
- kharel2021-b `vpi_dc_v` 1.35: the text calls it "DC Vπ", but the Fig. 3(a) label reads "Vπ,20-mm, 1MHz = 1.35 V". I classified it FREQ 1e-3 from the figure label.
- kharel2021-a/-b `vpi_rf_v` at exactly 1 GHz: OK under "at or above 1 GHz" (boundary case).
- taghavi2024-a `vpi_rf_v` 51.4 / `vpil_rf_vcm` 2.57: p.11 says "at f = 4.18 MHz". The rest of the paper gives f-6dB > 4.18 GHz and evaluates the field at 4.18 GHz (Fig. 2h), so this is likely a GHz typo, and `vpi_rf_freq_ghz` is empty. Classified UNSTATED. If 4.18 MHz is literal, the value cannot move because the dc columns already hold the 0.5 V DC (liquid-crystal) value, so it would need its own row.
- tran2026-a `vpi_dc_v` 3.1: this comes from the LCA EO-response analysis (normalized beyond about 10 GHz). The static transfer curve in Fig. 1 reads "Vp=3.4 V". The 3.1 V figure may be an RF-derived value; its frequency is not stated.
- li2026a and qiu2026: `references/<id>/` holds only crossref.json (text-only local corpus, no text.md or source.pdf). li2026a is classified FREQ 1e-7 from the audited evidence note ("100 Hz drive"), which I could not re-verify. qiu2026 is UNSTATED.
- he2019-a: the caption says 4.5 V while the text and figure say 7.4 V. The evidence file already notes this, and the row keeps 7.4 V.
- shen2024-c: the main text gives 230 mV for the 0.2 m device, and Fig. S5 gives 220 mV at 300 K for a 0.2 m device. This is a minor inconsistency in the source.
- li2025b-c/-d (86 V, 93 V): the extraction method is not stated. The adjacent Fig. 5(a) shows SeM-MZM AM spectra at 1 MHz, which suggests 1 MHz but does not say so. Classified UNSTATED.

## Conventions used
- OK for true DC: the paper says DC or static, or the value comes from transmission spectra at fixed bias voltages, constant-voltage power-meter readings, or a resonance shift per volt from static bias spectra.
- UNSTATED: "low-frequency triangle" or "slowly varying" with no number, "low-MHz", "semi-static", or a plain "transmission vs applied voltage" with no rate. Notes say "implies DC" where that reading is reasonable.
- If a paper gives one Vpi-measurement frequency for the whole study, it also applies to wafer-map and gap-sweep points from the same section. Each such case says so in its note.
- VpiL cells derived from a quasi-static Vpi inherit that Vpi's frequency.
