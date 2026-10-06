# Batch p6_04 report (2026-10-05)

Dry run: `uv run python scripts/merge_staging.py data/_staging/p6_04` -> merge counts papers 3, devices 12, orgs 4, evidence 3; conflicts 0; validation errors 42. All 42 are `paper_authors.csv` slots for the three new papers (singer2025 16, horst2025 17, hillier2025 9: "run build_people.py"); no other error. No `--replace-paper-ids` needed (all three are NEW; no canonical rows exist).

Sources: all three are version-of-record PDFs cached 2026-10-05 with text and figures. No supplements are cached (horst2025 and hillier2025 cite Supplement 1).

## singer2025 - distilled
- Rows: 1 (singer2025-a, packaged 1 mm SOH MZM). Grade C, sim none (SOH).
- License: Optica OA License v2 (Crossref VOR record, p.1 notice) -> `Optica-OA-License-v2 (Crossref VOR license record)`, restricted_local_only (as xu2022).
- Judgment: Vpi 1 V and UpiL 1 V mm (stored 0.1 V cm, derived) measured at an unstated frequency -> vpi_dc_v, frequency empty. On-chip 4.2 dB = stated "on-chip excess loss", equals the sum of Table 2 elements without the two 3.3 dB photonic wire bonds (scope device_total, basis derived); 10.8 dB fiber-to-fiber. Slot loss 2.8 dB/mm (cutback, un-poled material) stored as 28 dB/cm (derived). Drive 265 mVpp = balun output at 56 GBd. max_baud 56 GBd, line rate 112 Gbit/s; KP4 compliance is explicitly stated for 54 GBd (Fig. 4 caption), noted. Wavelength 1550 nm with approx ("around 1550 nm").
- Not reported: bandwidth, ER, Z0, n_RF, RF loss, energy per bit, temperature, electrode metal, GSG line dimensions. EO material not named. Optical power sweep (fiber 8.0-16.3 dBm; 0.2-8.5 dBm per phase shifter) in notes only.
- CSV hints: platform eo_polymer and class mzm confirmed.

## horst2025 - distilled
- Rows: 3 (horst2025-d1, -d2, -pm). Grade C, sim none (plasmonic).
- CSV hints corrected: platform `other` -> organic EO (Perkinamine chromophore series 3, named in acknowledgements), eo_polymer, plasmonic_mim; device_class `plasmonic_mzm` (legacy) -> phase_shifter (optical path through one arm, Fig. 1 caption).
- Judgment: 3 dB EO bandwidths 880 GHz (Device 1) and 997 GHz (Device 2), sideband method, tested to 1140 GHz, reference frequency not stated (low_freq_unstated; the Device 2 trace in Fig. 1(c) starts near 500 GHz). IL 5.6 dB and VpiL 234 V um (stored 0.0234 V cm, derived) are stated for "the 10 um phase modulator" with no device assignment -> own row without bandwidth; IL scope undefined. Length 0.01 mm: slots stated 10-15 um, the THz-experiment device is 10 um (p.3). Wavelength left empty: Fig. 1(a) 1545 nm vs caption approx 1550 nm (convention y); band c_band from the text. Slot capacitance 1.6 fF not entered (2Cslot in text vs Cslot in Fig. 2 caption).
- Not reported: Vpi in V, wavelength, temperature, device optical power, per-device IL. Not entered: model/FEM predictions (1.4, 1.9, 2.4 THz), reference-device capacitances.

## hillier2025 - distilled
- Rows: 8 (hillier2025-1mm-q1, -1mm-q2, -1mm-ee, -2mm-q1, -2mm-q2, -2mm-q3, -2mm-data; hillier2025-design). Grade B, sim none (InP).
- Granularity: Vpi, ER and bias differ per quadrature point (convention d), so one row per point; physical_device_id hillier2025-1mm / -2mm. Zero-bias EE bandwidth and the large-signal data are separate operating points. No 1 mm data row (its 320 Gbit/s point sits at the HD-FEC threshold in Fig. 5(a); no 1 mm rate is stated).
- Source defects (convention y), readings in notes: (1) 2 mm Q1 bias: text 7 V, Fig. 2(b) line near 3.6 V -> empty. (2) ER at 1 mm Q2: text 17.0 dB vs Fig. 2(a) 15.4 dB -> empty. (3) ER at 2 mm Q1: text 15.4 dB vs Fig. 2(b) 16.1 dB -> empty. (4) Q* (data bias) about 13 V in text vs 7-12 V regions in Fig. 2 -> data-row bias empty. Biases for 2 mm Q2 (about 9 V) and Q3 (about 12.5 V) are figure reads (extracted_from_figure).
- Bandwidth: the "about 90 GHz" EO value is from the Fig. 3(a) inset adapted from a thesis (ref. 25); its measured trace ends near 50 GHz with no 3 dB crossing -> not entered. The 80 +/- 8 GHz value is the -6 dB electrical-electrical S21 (zero bias, VNA to 110 GHz, data above about 80 GHz unreliable) -> bw6db 80, bw_method indirect, bw3db empty. Design row: predicted EO bandwidth about 120 GHz (simulated, row_kind design). Z0 about 50 ohm (abstract; Fig. 3(c) input impedance); ng 3.7 is a model input (design_target).
- IL 9.1 +/- 0.8 dB (estimated, 1 mm, excludes 2.5 dB per facet) on 1mm-q1 only, bias not stated. VpiL 1.3 +/- 0.1 V cm is stated jointly for both lengths at Q1 (entered on both Q1 rows); Q2/Q3 VpiL left to the build.
- Not reported: wavelength (only the 1.39 um active-layer bandgap), electrode metal, MQW well design, temperature, drive arrangement and Vpi convention (both `unspecified`), driver and optical power of the data run (Supplement 1), 2 mm EE bandwidth of the best geometry.
- CSV hints: platform inp_mqw, class mzm confirmed (eo_effect qcse per introduction).

## Organizations added (4)
Eindhoven University of Technology (ROR from crossref.json), SMART Photonics (foundry), University College London, MultiLane Inc. (LB, middle_east). The name_source URLs for the last three are the organizations' own sites, entered without network access (no ROR in crossref.json); not verified here.

## Schema / convention gaps
- bw_method has no value for an electrical-electrical (line S21, no optics) bandwidth: used `indirect` with a note (hillier2025-1mm-ee).
- Vpi that varies with reverse bias is handled as one row per quadrature point; no column for the bias dependence.
- `paper_authors.csv` / `people.csv` need `scripts/build_people.py` after merge (the 42 dry-run errors).
