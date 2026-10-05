# Batch p5_01 report (2026-10-04)

Validation: `uv run python scripts/merge_staging.py data/_staging/p5_01` -> papers 5, devices 10, orgs 1, evidence 5; conflicts 0; validation errors 0 (dry run only).
Common: all five sources are OFC 2026 3-page papers (bao2026b has a 4th poster-style page, no extra numbers); no crossref.json, identity from PDF first page and batch row. license publisher-copyright (page footer), redistribution restricted_local_only, published_on empty (batch date is a schedule date), audit_status needs_audit, repro_grade C for all, no sim configs (silicon only).

## bao2026a - distilled
- Rows: bao2026a-a (microring with T-coil), bao2026a-b (comparison ring without inductors, bandwidth only).
- Grade C, sim: none.
- Judgment: 1 dB bandwidth >110 GHz has no 3 dB crossing -> bw3db 110 with gt, measured-to 110 (figure read). 416 Gb/s (headline) used as max line rate; 448 Gb/s eye in format text. Baud (208 GBd) not entered, in notes.
- Not reported: on-chip IL, launch power, energy/bit, capacitances, fab, SOI thickness.

## bao2026b - distilled
- Rows: bao2026b-a (representative disk of the 16-channel array; array eyes on this row).
- Grade C, sim: none.
- Judgment: ER 16 dB read from Fig. 2(b) dip (extracted_from_figure, approx); capacitance 8 fF is the S11-extracted value, basis derived; baud (128 GBd) in notes only.
- Not reported: IL, energy/bit, fab, SOI thickness, launch power.

## deng2026a - distilled
- Rows: deng2026a-a (-3 V, with system results and driver), deng2026a-b (-6 V, bandwidth only).
- Grade C, sim: none.
- Judgment: VpiL 1.5 V cm stated without bias or definition (vpi_convention unspecified, drive series_push_pull from the text). z0 not entered (design 65 ohm; text also says 33 ohm). Simulated driver-extended E/O bandwidth >70 GHz not entered. Energy 2.47 pJ/b is whole transmitter with driver. Fig. 2(d) wafer-map inset median 38.0 GHz differs from the 40.8 GHz label; both noted.
- Not reported: wavelength, Vpi in V, on-chip IL, electrode metal, optical power.

## gong2026 - distilled
- Rows: gong2026-a (-1 V, system), gong2026-b (-2 V, bandwidth >67 GHz).
- Grade C, sim: none.
- Judgment: foundry_or_fab left empty (fab not named; title and sole affiliation only); new org GlobalFoundries added. ER 3.2 dB (measured, with 19% reflection) entered; the 3.7 dB "DC ER" has unclear basis and is not entered. VpiL and loss are 10-lot statistics. Max line rate 240 Gb/s (Fig. 4(d), TDECQ 3.1 dB, stated as achieved); 100 GBd stated, 120 GBd not.
- Not reported: length, wavelength, IL, SOI thickness, electrode dimensions.

## kawahara2026 - distilled
- Rows: kawahara2026-a (N=3 with equalizer), -b (N=3 without), -c (N=4 transmission device).
- Grade C, sim: none.
- Judgment: stated f3dB about 80 GHz is on the dashed extrapolation; measured trace ends near 66 GHz at about -0.4 dB, so bw3db 66 with gt. VpiL 0.32 V cm is cited from earlier work, not entered. ng about 30 entered as design_target; band c_band (derived) from the stated C-band design and EDFA. Fab described only as CMOS-compatible 300 mm SOI, not named.
- Not reported: length, wavelength, Vpi, IL, energy/bit.

## Blockers / gaps
- None. Convention question: ER/line-rate headline vs highest eye shown (paper headline for bao2026a; highest stated-success eye for gong2026 after audit F1 and for deng2026a).

Post-audit corrections: see AUDIT_DISPOSITIONS.md.
