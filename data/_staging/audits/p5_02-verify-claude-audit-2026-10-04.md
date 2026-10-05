---
verifier: fresh-context subagent (independent verifier)
task: verify the Q1 audit dispositions of staged batch p5_02 and re-check every headline cell
date: 2026-10-04
scope: data/_staging/p5_02 (papers.csv, devices.csv, organizations.csv, evidence/*.yaml, AUDIT_DISPOSITIONS.md, BATCH_REPORT.md); papers lin2026, liu2026a, liu2026c, patel2026, rakowski2026
mode: read-only (only this report written; scratch scripts and renders in the session scratchpad; no git, no network, no --apply)
verdict: corrections confirmed for all five papers; no blocking or numerical defect; 2 new minor findings (optional)
counts: {confirmed: 14, not_confirmed: 0, new_findings: 2 (minor)}
---

# p5_02 verification

## Method

- Read the Q1 audit, AUDIT_DISPOSITIONS.md, all staged CSV rows (every populated cell), all 5 evidence files and the full `text.md` of all 5 papers.
- Figures checked against axis ticks with my own pixel extraction (readings approximate):
  - lin2026 Fig. 2(a): 900 dpi page render of the embedded 1430x760 raster. Calibrated on the left-axis ticks (-5 dB at y 260.5, -40 dB at y 1252; 28.3 px/dB).
  - lin2026 Fig. 2(d): 600 dpi render (dotted -3 dB guide and vertical marker).
  - liu2026c Fig. 2(b), 2(c), Fig. 3(a): native embedded raster `figures/img_p02_1.png` (1102x425). Fig. 2(c) frame calibrated at x 680 (0 GHz) to 1087.5 (70 GHz) and y 29 (+3 dB) to 349 (-9 dB); blue and orange traces extracted by color mask, column by column.
  - rakowski2026 Fig. 2 and Fig. 3(a)/(b): page render and native raster `figures/img_p02_2.png` upscaled 3x.
- Mechanical check (scratch script): every evidence entry equals its CSV cell (0 mismatches); every populated non-categorical CSV cell has an evidence entry (0 missing).
- Merge dry runs (see Validation).

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| lin2026 | 1 | corrections confirmed | F1 (ER 36) and F6 confirmed against Fig. 2(a) ticks |
| liu2026a | 2 | corrections confirmed | no applied changes; F7 rejection holds |
| liu2026c | 2 | corrections confirmed | F2 (bw 60) confirmed by trace extraction; F5 applied; F8 rejection holds; N2 optional |
| patel2026 | 0 | corrections confirmed | review paper, no own device; license_notice evidence file present |
| rakowski2026 | 2 | corrections confirmed | F3 IL basis derived confirmed; F4, F9, F10 applied; F3-opt rejection acceptable; N1 optional |

## Disposition reflected in staged files

| ID | Disposition | Reflected in staged files | Check |
|---|---|---|---|
| F1 | applied | yes: devices.csv lin2026-a ER 36, `extinction_ratio_db:approx`; evidence 36 with new note; row note rewritten | confirmed (below) |
| F2 | applied (a) | yes: liu2026c-b bw3db 60, approx, extracted_from_figure; evidence note and row note rewritten | confirmed (below) |
| F3 | applied | yes: il_basis derived on rakowski2026-a/-b; evidence basis derived, locators "p.2, Table 1; Fig. 3(a)/(b)", note as specified | confirmed (below) |
| F3-opt | rejected | ER row a stays measured | reason acceptable (below) |
| F4 | applied | yes: organizations.csv GlobalFoundries `foundry`, US, north_america, notes as specified | confirmed: equals p5_01 on org_type/country/region (the fields `merge_staging.py` compares); joint dry run p5_01+p5_02 has 0 conflicts |
| F5 | applied (option 1) | yes: liu2026c-b evidence `drive` series_push_pull basis derived, locator "p.2, Sec. 2; Sec. 3"; epitaxy note extended; row note sentence added | confirmed against text (series push-pull and termination stated only for "the proposed MZM", p.2 Sec. 2) |
| F6 | applied | yes: "1556.3 nm" in lin2026-a notes and BATCH_REPORT | confirmed: dip minimum at about 1556.33 nm |
| F7 | rejected | unchanged | reason holds: both values match the source (Fig. 1(b) "ER~34dB" static; Fig. 3(b) "ER 3.50dB" dynamic) with correct er_type |
| F8 | rejected | unchanged | reason holds: the paper gives only "GS pad layout" and "conventional traveling-wave electrode", no electrode geometry |
| F9 | applied | yes: il_onchip_excludes on both rakowski rows; new evidence entries basis derived, locator "p.2, Fig. 2(b)", equal to CSV | confirmed: Fig. 2(b) IL trace goes to about 0 dB at -1000 and +1000 pm detuning |
| F10 | applied | yes: row b bw evidence note extended; `bw3db_reference` dc evidence on both rows | confirmed: Fig. 2(c) title "3dB Bandwidth =53.4GHz @ max DC Gain"; legend BW 72.3 and 73.5 GHz exceed the 67 GHz LCA range |
| F11 | deferred | unchanged | policy decision; each row documents its choice |
| license_notice | coordinator | present in all 5 evidence files (patel2026.yaml new, entries empty) | confirmed: footer "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group" on every page; abstract notices "(c) 2026 The Author(s)" (liu2026a) and "(c) 2025 The Author(s)" (patel2026) quoted correctly |

## Changed cells

| device_id | column | old -> new | My reading (approximate) | Verdict |
|---|---|---|---|---|
| lin2026-a | extinction_ratio_db | 34 -> 36 | Black measured line bottoms at about -36.4 dB (lowest dark pixel; line centre about -36.3 dB) near 1556.33 nm. Off-resonance level about -0.7 dB at 1555.6 nm and about -0.6 dB near 1557.0 nm, so ER is about 35.6-35.9 dB. Lowest simulation circle about -33.9 dB. | confirmed (36, approx) |
| lin2026-a | notes / evidence note | 34 dB sentence -> 36 dB, sim marker near 34 dB; 1556.4 -> 1556.3 nm | as above | confirmed |
| liu2026c-b | bw3db_ghz | 65 -> 60 | Blue "Conventional MZM -3V" trace: -2.7 dB at 57.5 GHz, back to -2.2 dB at 58.6 GHz, -3.0 dB at 60.0 GHz, -3.2 dB at 60.6 GHz, -3.0 to -3.1 dB from 61.3 to 63 GHz, -3.4 dB at 64.4 GHz, -3.5 dB at 66 GHz, -3.6 dB at 66.8 GHz (trace end). Low-frequency start is about -0.2 dB (dip to -0.4 dB at 1.2 GHz). First -3 dB crossing is about 60 GHz, or about 60.5 GHz if referenced to the -0.2 dB start. Calibration check: authors' dashed 1 dB line sits at -0.92 dB, and the orange trace reaches about -1.0 dB at 66 GHz, matching the stated 66 GHz. | confirmed (60, approx) |
| liu2026c-b | evidence `drive` (new) | none -> series_push_pull, derived | text p.2 Sec. 2 states series push-pull only for the proposed device; Sec. 3 says the devices differ only in the electrode | confirmed |
| rakowski2026-a | il_basis (and evidence basis) | measured -> derived; il_onchip_db 3 unchanged | Fig. 3(a): scatter with fitted trend and confidence band; dashed marker at about 56.5 GHz; red IL reference line at about 3.1 dB; rOMA line about 5.7 dB. Table 1 lists 55 GHz, 3 dB, 5.5 dB. | confirmed |
| rakowski2026-b | il_basis (and evidence basis) | measured -> derived; il_onchip_db 1.8 unchanged | Fig. 3(b): dashed marker at about 72 GHz; red IL reference line at about 2.0 dB; rOMA line about 4.5 dB. Table 1 lists 70 GHz, 1.8 dB, 4.5 dB. | confirmed (see N1) |
| rakowski2026-a, -b | il_onchip_excludes | hedged -> off-resonance normalization | Fig. 2(b) IL about 0 dB at +-1000 pm | confirmed |
| rakowski2026-a, -b | evidence bw3db_reference (new) | none -> dc | Fig. 2(c) title "@ max DC Gain"; Fig. 3 caption "EO bandwidth taken at DC=-1V" | confirmed |
| rakowski2026-b | evidence bw3db_ghz note | extended | Fig. 2(c) legend 72.3G, 73.5G with traces ending at 67 GHz | confirmed |
| (org) GlobalFoundries | org_type | company -> foundry | equals p5_01 staged row | confirmed |

Rejected or deferred numerical items:
- F3-opt (rakowski2026-a ER 3.5 basis measured): acceptable. The text states "the device exhibits an average ER of 3.5 dB" (p.2), so it is an authors' stated value. Strictly it is the selection level of the same Fig. 3(a) trend read-out (green trend crosses the 3.5 dB reference at the marker), so `derived` would also be defensible. Not a defect.

## Independent re-check of headline cells

| Row | Cells checked | Result |
|---|---|---|
| lin2026-a | bw3db 90 approx measured (text "approximately 90 GHz"; Fig. 2(d) dotted guide meets -3 dB near 91 GHz; trace normalized near 0 dB at low frequency, reference `unspecified` defensible); bw_measured_to 100 (axis end, 110 GHz VNA in Fig. 2(e)); ER 36; FSR 19.5 nm; ng 3.95; Cj 19.3 fF derived; 220 nm; band c_band (1556 nm); 224 Gb/s; TDECQ 1.58/2.94 dB; Vpi/IL/length correctly empty | clean. Note: the Fig. 2 caption describes panel (d) as "extracted equivalent-circuit parameters", but the panel and p.3 text show measured vs simulated EO response; the locator follows the panel and text, no change needed. |
| liu2026a-a | bw3db 83 (text p.2, 6 dB point at 0 V); measured_to 110; VpiL 0.538 derived, resonance_tuning_derived (26.7 pm/V, 0 to -4 V); tuning 0.0267 nm/V; Q 1630; FSR 6.97; ER 34 static approx; wavelength 1313 approx; Vpp 1.2 V; 140 GBd NRZ, 140 Gb/s max (64 GBd PAM4 = 128 Gb/s) | clean |
| liu2026a-b | bw3db 110 gt, measured_to 110 (all > 110 GHz at -3 V); ER 3.5 dynamic (eye label 3.50 dB); Vpp 2.7 V; 160 GBd NRZ; 280 Gb/s (140 GBd PAM4, 32-tap FFE) | clean |
| liu2026c-a | Vpi 4.5 V (Fig. 2(b) orange null at about 4.5 V); VpiL 0.9 derived; length 2 mm; 1 dB at 66 GHz (confirmed by trace); bw3db 80 gt author_estimate; measured_to 67; wavelength 1310 (Fig. 3(a) "1310nm Laser"); ER 2.21 dynamic (128 Gbps NRZ eye); Vpp 1.8 approx; 128 GBd; 280 Gb/s PAM6; geometry 220/380/150 nm, 2 um BOX | clean |
| liu2026c-b | Vpi 5.9 V (Fig. 2(b) blue null at about 5.9-6.0 V; text 5.9 V); VpiL 1.18; 1 dB at 39 GHz (blue trace first reaches the -0.92 dB line at about 39 GHz); bw3db 60 approx | clean; see N2 (band) |
| rakowski2026-a | bw 55 derived; measured_to 67; IL 3 derived; ER 3.5 static; Vpp 2; wavelength 1314.385 (Fig. 2(b) "Resonance@0V=1314.385"); Q 3900 approx (Table 1 "~3900"); FSR 9.2 nm (1.6 THz at 1314 nm is 9.2 nm, consistent); C 50 fF derived; 6 dBm approx; 120 GBd; 240 Gb/s | clean; see N1 |
| rakowski2026-b | bw 70 derived; IL 1.8 derived; ER 3.5 gt; Vpp 3; Q, FSR, C as row a | clean; see N1 |
| patel2026 | no rows; text is a review ("The progression ... is reviewed"); no own device data | clean |

Identity and metadata: titles, author lists and order, DOIs, venues and paper codes match the PDFs and `data/_staging/batches/p5_02.csv`. published_on empty on all five (batch CSV schedule date not printed in the PDF) is consistent with the batch convention. License publisher-copyright with redistribution restricted_local_only is supported by the printed Optica footer on every page.

## New findings

**N1 (minor, optional). rakowski2026: Fig. 3 read-outs differ slightly from the Table 1 values entered.**
- Fig. 3(a): marker about 56.5 GHz, IL reference line about 3.1 dB (Table 1: 55 GHz, 3 dB).
- Fig. 3(b): marker about 72 GHz, IL reference line about 2.0 dB (Table 1: 70 GHz, 1.8 dB).
- The CSV values (Table 1, authors' stated) are correct to keep. The row-b IL difference (2.0 vs 1.8 dB) is larger than plot-reading error and is not noted anywhere.
- Proposed fix: append to the evidence note of rakowski2026-b `il_onchip_db`: "; Fig. 3(b) IL reference line reads about 2.0 dB at the about 72 GHz marker, Table 1 value entered". Optionally, for row a: "; Fig. 3(a) reads about 3.1 dB at about 56.5 GHz". No value change.

**N2 (minor, optional). liu2026c-b `band` empty while liu2026c-a is o_band.**
- Both devices share the optical design and grating couplers (p.2, Sec. 3). Row a's band comes from the 1310 nm laser in the large-signal setup (Fig. 3(a)), which applies only to the tabbed device. The DC and S21 wavelengths are not stated for either device.
- Leaving it empty is conservative and not an error. Proposed fix if a band is wanted for filtering: set liu2026c-b `band` = o_band and add to the row note "band inferred from the shared optical design and the 1310 nm setup of the tabbed device; test wavelength not stated".

## Validation

- `uv run python scripts/merge_staging.py data/_staging/p5_02` (dry run): `merge counts: {'papers': 5, 'devices': 7, 'orgs': 5, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- Joint dry run `uv run python scripts/merge_staging.py data/_staging/p5_01 data/_staging/p5_02`: `merge counts: {'papers': 10, 'devices': 17, 'orgs': 5, 'evidence': 10}; conflicts: 0; validation errors: 0`.
  - GlobalFoundries now matches on org_type, country and region. The notes still differ between the batches ("gong2026 p.1 sole affiliation" vs "rakowski2026 affiliations 1-3"). The merge script does not compare notes, so the first batch merged keeps its notes. This is informational only.
