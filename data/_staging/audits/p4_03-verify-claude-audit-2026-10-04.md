---
verifier: fresh-context subagent (independent of the Q1 auditor and the dispositioner)
task: verify the Q1 audit dispositions of staged batch p4_03 and re-check every headline cell
date: 2026-10-04
scope: data/_staging/p4_03 (rahman2025, powell2024, zheng2026, cai2025, sayem2026c; papers.csv, devices.csv 16 rows, organizations.csv, evidence/*.yaml) plus sims/cai2025/config.yaml and sims/sayem2026c/config.yaml
mode: read-only (only this file written; no edits to staged files, no git, no network; no engine solve, configs only parsed)
verdict: all dispositions reflected in the staged files; all numerical and blocking changes confirmed; 1 disposition note not confirmed (F6 peak frequency); 2 new minor note-level findings; no blocking defect; merge-ready after the three note fixes below (or as is, since none changes a value)
counts: {confirmed: 14, not_confirmed: 1, new_findings: 2}
---

# Verification of the Q1 audit dispositions: p4_03

## Method

- Read the audit `data/_staging/audits/p4_03-q1-claude-audit-2026-10-04.md`, `data/_staging/p4_03/AUDIT_DISPOSITIONS.md`, all staged device rows (dumped every non-empty cell), the evidence files of all five papers, the powell2024 and sayem2026c papers.csv notes, `BATCH_REPORT.md`, and both sim configs.
- Opened and measured against axis ticks (crops at native resolution; all readings approximate):
  - zheng2026 `img_p09_1.png`: Fig. 4(d), (e), (f), (g), (h).
  - powell2024 `page_03.png`: Fig. 1(a), (b), (d), (e).
  - sayem2026c `img_p02_1.png` Fig. 1(b); `page_02.png` Fig. 1(f); `img_p03_1.png` Fig. 2(b), (c); `img_p04_1.png` / `page_04.png` Fig. 3(b), (c), (d).
- Text checks in `references/<id>/text.md`: zheng2026 p.1, p.3, p.8-10; powell2024 p.1-3; sayem2026c p.1-4; cai2025 p.2-6; rahman2025 p.1, p.5-7, S2-S3.
- Mechanical check (scratch script): every non-empty evidence-required cell plus drive and vpi_convention has an evidence entry with an equal value: 0 missing, 0 mismatch.
- Sim configs parsed with the engine's `inspectConfig` (no solve): both parse; both report the expected `materials.lithium_tantalate.eps_r: RF permittivity is required` (not runnable by design).

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| rahman2025 | 3 | corrections confirmed | F10 confirmed; headline re-check clean |
| powell2024 | 1 | corrections confirmed | F2 confirmed in Fig. 1(b); F4 notes applied, DOI change deferred (correct) |
| zheng2026 | 6 | corrections confirmed; 1 new minor finding | F1, F7 confirmed by my own Fig. 4(h) measurement; N1 (Fig. 4(d),(e) imply a larger Vpi than the 4 V text) |
| cai2025 | 2 | corrections confirmed | F8, F9a, F9b confirmed in files and text |
| sayem2026c | 4 | issues (note-level only) | F3, F5 confirmed; F6 note frequency wrong (11 GHz, not 15 GHz); N2 (Fig. 2(b) vs Fig. 2(c) VpiL) |

## Changed cells and dispositions

| ID | device_id / file | Change | Source check (my reading) | Verdict |
|---|---|---|---|---|
| F1 | zheng2026-al1000 `bw_basis` and evidence `bw3db_ghz` basis | measured -> author_estimate; value 70 gt kept; note replaced; row note appended | p.10: "BW is extended to 70 GHz+ ... expected to be around 90 GHz, but the current experiment is limited by the measurement tools". Fig. 4(h) top panel (0 dB at y 75, -5 dB at y 360 px, -3 dB line at y 246): dip near 43 GHz reaches about -3.8 dB; a second dip near 35 GHz about -3.1 dB. Second panel dip near 43 GHz about -3.2 dB. Lower two panels about -3.4 to -3.7 dB (low-resolution reading). Traces end near 67 GHz, so the 70 GHz bound lies beyond the measured range and cannot be a measurement: author_estimate is the right basis. Stated dip range "-3.2 to -3.7 dB" is within my reading error (top trace about -3.8). | confirmed |
| F7 | zheng2026-al1000 `bw_measured_to_ghz` | 70 -> 67 (approx), evidence extracted_from_figure | Fig. 4(h) ticks 0/20/40/60 GHz at x 287/567/849/1131 px (14.08 px/GHz); last data point x 1228 -> 66.8 GHz; frame edge x 1278 -> 70.4 GHz. | confirmed |
| F2 | powell2024-a `drive`, `vpi_convention` | unspecified -> push_pull / mzm_push_pull, basis derived | Fig. 1(b): G-S-G with one LiTaO3 rib in each gap, x-cut film (x out of plane); Fig. 1(a) GSG over both arms; p.1 "L = 5 mm long electrode in the ground-signal-ground configuration". Convention (f) applies. (Fig. 1(b) labels the in-plane axis y while Fig. 1(a) shows z across the waveguide; a paper labelling slip that does not affect push-pull.) | confirmed |
| F3 | sayem2026c-a..d `drive`, `vpi_convention` | unspecified -> push_pull / mzm_push_pull, basis derived, note includes "crystal cut not stated" | Fig. 1(b) middle panel (native crop): ground, rib, signal, rib, ground, one rib in each gap G; Fig. 1(a) GSG over both arms. Opposite fields in the two gaps hold for either cut, so push_pull is geometry-supported; the unstated cut affects only which r coefficient, which the note discloses. | confirmed |
| F5 | sayem2026c-a `vpi_basis` | extracted_from_figure -> measured | Abstract (p.1) and p.2 text "Vπ of 2.4 V"; Fig. 1(f) label "Vπ = 2.4 V" (100 Hz triangle, 1071 nm). Evidence basis measured. Convention (h): row basis follows the headline field. | confirmed |
| F6 | sayem2026c-a notes | appended "Fig. 3(d) response peaks near +1.2 dB at about 15 GHz; ..." | Fig. 3(d) native crop: x ticks 10/20/50 GHz at 517/836/1790 px (31.8 px/GHz); y 2/0/-2 dB at 172/355/538 px. Peak of both traces at x about 548 -> about 11 GHz, about +1.15 to +1.2 dB. First points at about 4 GHz: about -1.8 dB (1071 nm), about -1.4 dB (1551 nm). End at 50 GHz: about -1.8 dB (1071 nm), about -2.0 dB (1551 nm; lowest about -2.1 dB near 49 GHz). Peak value right, frequency wrong. | not confirmed (fix below) |
| F8 | cai2025-b evidence `electrode_gap_um`, `signal_width_um`, `electrode_thickness_um` | basis measured -> derived, note; row note "Band inferred from the IMDD setup." | p.6 "two 13.5 mm-long MZMs, such as the one shown in Fig. 2(a)"; CPW 23/6 um stated for the 6.8 mm device (Fig. 2(c) caption); C-band ECL only in the IMDD setup. Values 6, 23, 0.8 unchanged. | confirmed |
| F9a | sims/cai2025 `provenance.line.source_ohm` | paper_exact -> project_inference, note "50 ohm source assumed (AWG/VNA); the paper states only the load" | Text p.5: AWG M8199B via 20 cm cables and "a first impedance-matched probe"; "A second probe terminates the transmission line with a 50 Ω coaxial termination". Source impedance not stated. `load_ohm` stays paper_exact with that locator. | confirmed |
| F9b | sims/cai2025 `materials.lithium_tantalate.r_pm_per_v` | r33 30.0 and its provenance entry removed; header and `missing` bullet reworded | `grep` finds no `r_pm_per_v` or numeric r33 in either config; header line 2 says "no Pockels tensor"; `missing` bullet names the secondary-citation r33; matches sims/sayem2026c. Config parses (inspectConfig). | confirmed |
| F9 (sayem2026c) | sims/sayem2026c `provenance.line.source_ohm`, `line.differential` | source_ohm project_inference ("50 ohm assumed for the source"); differential note reworded to "push-pull drive is inferred (devices.csv drive derived), not stated" | p.2 states only the on-chip 50 Ω termination (load_ohm paper_exact). Geometry checked: signal x -19.5..-2.5 (17 um), gaps 5 um on both sides, ribs centred at x 0 and -22, rib height 0.36 um, td as slab (Fig. 1(b) arrows bracket the slab). | confirmed |
| F10 | rahman2025-3 `er_type` | unspecified -> static | p.5: ER > 34 dB from the 1 kHz voltage sweep on a log scale (Fig. 3(d) caption). Quasi-static; consistent with powell2024-a. | confirmed |
| F4 | powell2024 papers.csv notes | notes rewritten; DOI/venue/year/license unchanged (deferred) | Notes now state the arXiv v1 is the AIP-format manuscript of the APL Photonics 10(9) 2025 article and that the DOI shown is the CLEO 2024 abstract. Deferral reason (no Crossref record cached, no network) is valid. | confirmed (deferred part correctly deferred) |

Confirmed count: F1, F2, F3, F4, F5, F7, F8, F9a, F9b, F9 (sayem2026c provenance), F10, plus the three re-read values in the next section that the audit relied on (zheng2026 Fig. 4(f) medians, sayem2026c Fig. 2(c) points, sayem2026c n_rf/ng) = 14. Not confirmed: F6 (frequency only).

## Independent headline re-check (all 16 rows)

| Row(s) | Cells checked | Result |
|---|---|---|
| rahman2025-1..3 | VpiL 4.29/3.40/3.83 (p.5 four-chip means); Vpi 6.4 V (p.5, 1 kHz and 1 MHz); L 6 mm author_estimate (6.4 V x 0.6 cm = 3.84 V cm); IL 2.95/6.43/3.77 (S2); ER 34 gt (Fig. 3(d)); bw 20 approx (S3 "around 20 GHz", 3 GHz normalisation), 100 gt / 111 (S3 "greater than 100 GHz", limit 111), 111 gt (p.6 "greater than 111 GHz"); wavelength 1550 approx | clean |
| powell2024-a | Vpi 1.3 V, ER 29.6 dB (Fig. 1(d) labels); VpiL 0.65 derived; L 5 mm; IL 5.3 dB author_estimate excl. grating couplers (p.2); bw3db about 5 GHz, 6 dB beyond 20 GHz detector limit (p.2, Fig. 1(e)); 737 nm; 200 nm x-cut, 100 nm etch, 600 nm width | clean |
| zheng2026-pre | IL < 2 dB (abstract), ER > 30 dB (p.8), 1310 nm approx (p.7), 7 mm | clean |
| zheng2026-g4/g5/g6 | Vpi 4 / 5.5 / 7.0 V approx; my Fig. 4(f) reading (7 V at y 728, 4 V at y 1023 px): medians about 3.93, 5.54, 7.07 V | values clean; see N1 for Fig. 4(e) |
| zheng2026-al500 | 30 lt; Fig. 4(g) first -3 dB crossings about 19-24 GHz; text "20-30 GHz" | clean |
| zheng2026-al1000 | 70 gt author_estimate, measured-to 67 approx | clean (F1, F7) |
| cai2025-a | Vpi 6 V, VpiL 4.08 V cm, 6.8 mm, push-pull (p.3); bw "close to 100 GHz" approx, 25 MHz to 110 GHz (p.4); PAM4 200 GBd 400 Gb/s line, 333 Gb/s net (p.5-6) | clean |
| cai2025-b | 204 GBd QPSK; 16QAM 176 GBd 704 Gb/s line, 581 Gb/s net (p.6); 13.5 mm | clean |
| sayem2026c-a..d | VpiL from Fig. 2(c) (1.2 at y 1210, 2.6 at y 562 px): 1.45, 1.62, 2.07, 2.58 V cm vs cells 1.45, 1.62, 2.07, 2.57 (within reading error); Vpi 2.4 V; L 7 mm; ER about 30 dB; bw 50 gt, roll-off 2 lt at 50 GHz; n_rf about 2.26 at 50-65 GHz (Fig. 3(b)); ng about 2.25 at 1.07 um (Fig. 3(c), simulated) | values clean; see N2 |

## Issues and new findings with exact proposed fixes

**F6 (not confirmed, minor, note text only).** The Fig. 3(d) peak is at about 11 GHz, not about 15 GHz.
- File: `data/_staging/p4_03/devices.csv`, row sayem2026c-a, column `notes`.
- Replace "Fig. 3(d) response peaks near +1.2 dB at about 15 GHz; the 2 dB roll-off is relative to the 0 dB normalisation." with "Fig. 3(d) response peaks near +1.2 dB at about 11 GHz (first point about -1.4 to -1.8 dB at 4 GHz); the 2 dB roll-off is relative to the 0 dB normalisation."
- Also correct the same sentence in AUDIT_DISPOSITIONS.md F6 if the dispositioner wants the record consistent.

**N1 (new, minor, note-level). zheng2026 Fig. 4(d),(e) imply Vpi about 5.5-6.1 V, while the text attached to Fig. 4(e) says "around 4 V".**
- Fig. 4(e) (input ticks -5/0/5 V at x 1478/1688/1898 px of a 2400 px crop): transmission maximum to minimum spans about 5.6 V (MZM1, -2.6 to +3.0 V), 5.8 V (MZM2), 6.1 V (MZM3), 5.5 V (MZM4). Fig. 4(d) gives the same independently: the ±5.7 V triangle ramps about 2.3 V/us and the output goes from null to peak in about 2.5 us (about 5.7 V).
- p.10 says "The analysis of the data from Fig. 4 d) is presented in Fig. 4 e). In this case, the Vπ is around 4 V and corresponds to an electrode gap of 4 µm." Fig. 4(f) supports 4 V as the 4 um median. The paper is internally inconsistent (possibly an input-voltage scaling such as generator setting versus delivered voltage; not stated).
- Value stays 4 V (authors' statement, convention: no reinterpretation). Proposed:
  - `data/_staging/p4_03/evidence/zheng2026.yaml`, zheng2026-g4 `vpi_dc_v`: locator "p.1 abstract; p.10 Sec. V; Fig. 4(e),(f)" -> "p.1 abstract; p.10 Sec. V; Fig. 4(f)"; note -> "Vpi around 4 V at 4 um gap (text, Fig. 4(f) median); Fig. 4(d),(e) traces read about 5.5-6.1 V on the plotted input axis".
  - `devices.csv` zheng2026-g4 `notes`: append "Fig. 4(d),(e) raw traces read about 5.5-6.1 V max-to-min on the plotted input axis, inconsistent with the 4 V text; 4 V matches the Fig. 4(f) 4 um median."

**N2 (new, minor, note-level). sayem2026c Fig. 2(b) transfer curves imply VpiL about 9-18% above the Fig. 2(c) points, and a 1071 nm Vpi of about 2.7 V versus 2.4 V in Fig. 1(f).**
- Fig. 2(b) (voltage ticks -1/0/5 V at x 172/300/940 px, 128 px/V): maxima near 0 V; first nulls near 2.4 V (984 nm), 2.7 V (1071 nm), 3.2 V (1311 nm), 4.0 V (1551 nm). At L = 0.7 cm that is about 1.7, 1.9, 2.3, 2.8 V cm, versus Fig. 2(c) 1.45, 1.62, 2.07, 2.58 V cm. The Fig. 2(c) points correspond to an effective length of about 0.6 cm against these Vpi values; the paper gives no explanation.
- Values stay as read from Fig. 2(c) (the paper's own VpiL plot). Proposed:
  - `devices.csv` sayem2026c-a `notes`: append "Fig. 2(b) nulls read about 2.4, 2.7, 3.2 and 4.0 V at 984, 1071, 1311 and 1551 nm (about 1.7-2.8 V cm at 7 mm), 9-18% above Fig. 2(c); the 1071 nm curve (about 2.7 V) differs from Fig. 1(f) (2.4 V)."
  - Optionally mirror one sentence in `sims/sayem2026c/config.yaml` `limitations` next to the existing 1.62 vs 1.68 bullet: "Fig. 2(b) 1071 nm transfer curve reads about 2.7 V (about 1.9 V cm at 7 mm), so the paper's three Vpi figures at 1071 nm span about 1.6-1.9 V cm."

**Observation (no change).** zheng2026-al1000 carries `bw3db_ghz` 70 gt above `bw_measured_to_ghz` 67; this is the convention (c) "paper bound differs from range" case and is now flagged by basis author_estimate and the row note. The merge validator accepts it.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p4_03`:

```
merge counts: {'papers': 5, 'devices': 16, 'orgs': 1, 'evidence': 5}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
