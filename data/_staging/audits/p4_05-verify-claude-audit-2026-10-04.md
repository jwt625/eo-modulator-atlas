---
verifier: fresh-context subagent (independent verifier)
task: verify Q1 audit corrections of staged batch p4_05
date: 2026-10-04
scope: data/_staging/p4_05 (derose2012, dong2026, liu2026b, wang2026a, yue2025); papers.csv 5 rows, devices.csv 11 rows, organizations.csv 1 row, evidence/*.yaml 5 files; audit p4_05-q1-claude-audit-2026-10-04.md; AUDIT_DISPOSITIONS.md
mode: read-only (only this file written; scratch scripts in the session scratchpad; no network, no git, merge dry run only)
verdict: all corrections confirmed; 2 new minor findings (locator and note wording), no numerical or blocking defect
counts: {confirmed: 17, not_confirmed: 0, new_findings: 2}
---

# p4_05 verification of audit corrections

## Method

- Read the audit, the dispositions, every populated cell of the 11 staged device rows and the 5 papers rows, and the evidence entries for every changed cell.
- Sources: `references/<paper_id>/text.md` (relevant sections in full for all five papers), figure renders and embedded images.
- Figure readings below are mine and approximate. They come from pixel traces calibrated on the axis frame, ticks and gridlines:
  - yue2025 Fig. 5(b): embedded raster img_p12_1, 1048 x 1108, the native resolution in the PDF. Calibration 3.58 px/GHz and 6.24 px/dB, from the frame and the 3 dB gridlines.
  - dong2026 Fig. 1: img_p02_1. Calibration from the 20/40/60 GHz and -2/-4/-6 dB gridlines.
  - derose2012 Fig. 2(a): img_p02_2. Calibration from the log-axis frame (0.1-100 GHz) and the 2 dB ticks.
  - wang2026a Fig. 1(d): rendered from the PDF at 600 dpi.
- Mechanical check (scratch script):
  - Every non-empty evidence-required device cell has an evidence entry with an equal value: 0 missing, 0 mismatched, 0 orphan. 155 entries in total.
- Dry run: `uv run python scripts/merge_staging.py data/_staging/p4_05` gives `merge counts: {'papers': 5, 'devices': 11, 'orgs': 1, 'evidence': 5}; conflicts: 0; validation errors: 0` and `dry run (nothing written)`.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| derose2012 | 3 | corrections confirmed | F1 series_push_pull confirmed from Fig. 1(c); F9 note present |
| dong2026 | 1 | corrections confirmed | F2 note matches my trace; F3 dc reference confirmed |
| liu2026b | 1 | corrections confirmed | F4, F5 notes present; headline cells re-checked clean |
| wang2026a | 2 | corrections confirmed | F6: peak about +1.9 dB near 19-20 GHz, inside the stated 15-20 GHz range |
| yue2025 | 4 | corrections confirmed; 2 minor new findings | yue2025-c/-d values, lengths, mapping and reference confirmed; N1 locator page, N2 note range |

## Changed cells

| device_id | column | old -> new | verdict | basis of my check |
|---|---|---|---|---|
| yue2025-c | bw3db_ghz (new row) | -> 81.9 | confirmed | See Evidence 1 below. |
| yue2025-c | length_mm (new row) | -> 0.9 | confirmed | See Evidence 2 below. |
| yue2025-d | bw3db_ghz (new row) | -> 43.1 | confirmed | See Evidence 3 below. |
| yue2025-d | length_mm (new row) | -> 0.3 | confirmed (locator off by one page, N1) | See Evidence 4 below. |
| yue2025-c | bw3db_reference (new row) | -> dc (derived) | confirmed | See Evidence 5 below. |
| yue2025-d | bw3db_reference (new row) | -> dc (derived) | confirmed | Same as yue2025-c. Black trace starts at about 0 dB. |
| dong2026-a | bw3db_reference | unspecified -> dc | confirmed | Fig. 1 Sdd21 starts at 0 GHz at about 0 dB on a linear axis. |
| derose2012-a | drive | push_pull -> series_push_pull | confirmed | See Evidence 6 below. |
| derose2012-b | drive | push_pull -> series_push_pull | confirmed | Same as -a. |
| derose2012-c | drive | push_pull -> series_push_pull | confirmed | Same as -a. `vpi_convention` stays unspecified, which is correct. |
| yue2025-b | vpi_convention | unspecified -> empty | confirmed | No Vpi or VpiL on the row. The paper gives neither for m=0. |

Evidence for the changed cells:

1. **yue2025-c `bw3db_ghz` 81.9.**
   - p.13 Sec. 2B: "At a 0 V bias, the 3 dB bandwidth of the silicon modulators with m = 0 and m = 1 are 43.1 and 81.9 GHz, respectively".
   - The Fig. 5(b) legend gives blue = "m = 1, Vbias = 0 V". The blue trace first reaches -3 dB at about 82 GHz (-2.6 dB at 80 GHz, -3.5 dB at 85 GHz).
   - All regions are at the same bias (p.13).
2. **yue2025-c `length_mm` 0.9.**
   - Table 2 (p.14), row "This work": "Length (mm) 0.9".
   - p.12: "The lengths of the main, forward, and reverse modulation regions were all 0.3 mm, corresponding to a design with m = 1".
3. **yue2025-d `bw3db_ghz` 43.1.**
   - Same p.13 sentence as for yue2025-c.
   - The Fig. 5(b) legend gives black = "m = 0, Vbias = 0 V". The black trace sits at -2.4 to -2.7 dB over 30-42 GHz and first reaches -3 dB at about 43 GHz. It hovers near -3 dB to about 48 GHz, then falls (-4.3 dB at 55 GHz).
4. **yue2025-d `length_mm` 0.3.**
   - Fig. 4 caption: "(b) ... silicon modulator with m = 0. The length of all modulation regions is 0.3 mm".
   - p.12: the m=0 device has "only the main modulation region".
   - The caption is on p.11, not p.12 (see N1).
5. **yue2025-c `bw3db_reference` dc.**
   - In Fig. 5(b) all four traces start at 0 to +0.6 dB at the lowest frequency.
   - p.13 states DC-power normalization for Fig. 5(c). For 5(b) it is not stated, so derived is the correct basis.
6. **derose2012-a `drive` series_push_pull.**
   - Fig. 1(c) render: p+/p/n/n+/n/p/p+ cross-section with V_RF across the two outer Al contacts and the centre n+ contact tied to V_bias through a resistor.
   - p.2: "The p-n junctions which were connected in series".
   - The tags were updated as well.

Applied note-only dispositions, all reflected in the staged files and checked against the source:

| ID | Check | Verdict |
|---|---|---|
| F2 | dong2026 note and evidence. Trace: about -2.0 to -2.4 dB at 66-68 GHz, dipping to about -3.6 dB at the last pixels (about 69.3-69.7 GHz, axis end 70 GHz), with the final segment rising toward about -2.9 dB. | confirmed |
| F4 | liu2026b `bw3db_ghz` evidence note | confirmed (present) |
| F5 | liu2026b `il_onchip_excludes` and evidence note. p.2: "measured insertion loss of 9 dB"; grating couplers named for the RF measurement. | confirmed |
| F6 | wang2026a-a note "+2 dB near 15-20 GHz". 600 dpi crop: maximum about +1.9 dB at about 19-20 GHz; -3 dB crossing about 82 GHz. | confirmed |
| F9 | derose2012 `epitaxy_or_stack` evidence notes (a, b, c). p.1: "Arsenic and Phosphorous implants ... n-type and p-type". | confirmed |
| F10 | yue2025 papers note appended; license and redistribution unchanged | confirmed |

There were no rejected or deferred findings.

## Independent re-check of headline cells (all rows)

**derose2012-a/-b/-c**
- 24 and 14 GHz are stated on p.2 and in the conclusions. Fig. 2(a) trace:
  - 0.5 mm (navy) crosses -3 dB at about 23 GHz; its fit at about 23 GHz.
  - 1.5 mm (gray) crosses at about 14 GHz.
  - Data run to about 40 GHz.
- Lengths 0.5/1.5 mm are "effective active lengths". VpiL 0.7 V cm is for a 2 mm device. Convention unspecified is correct.
- Clean.

**dong2026-a**
- Vpi about 7 V: "effective Vpi ... approximately 7 V", derived/approx.
- Drive 2.5 V swing. ER 3.71 dB at 420 Gb/s. BER list and 31-tap FFE checked.
- 220 nm / 3 um BOX / 2.8 um Al.
- Clean.

**liu2026b-a**
- Vpi 4 V at -2 V bias; VpiL 1.14 V cm; IL 9 dB.
- 1 dB bandwidth >67 GHz at 0 V; 67 GHz PNA and probe.
- ER 3.67-1.17 dB at 64-192 GBd.
- 220 x 380 nm rib, 150 nm etch, 2 um BOX, series push-pull, O-band.
- Clean.

**wang2026a-a**
- From the text and Table 1 (text.md):
  - C-band (p.1).
  - Length 2.25 mm effective (2.5 mm total).
  - VpiL 2.3 V cm, Vpi about 10.2 V "under DC test condition".
  - 81.8 GHz.
  - IL 2.6 dB.
  - 300 Gb/s PAM8.
  - About 2.5 V drive.
- Clean.

**wang2026a-b**
- Fig. 2(a) is O-band. VpiL 1.36 V cm, Vpi about 6 V.
- 59.5 GHz from the Fig. 2(b) label.
- Table 1: IL 2.45 dB, 336 Gb/s PAM8.
- PAM-4 100 GBd: ER 4.2 dB, SER 4.8e-4.
- Clean.

**yue2025-a**
- From Table 2, p.13 and p.16:
  - 0.9 mm.
  - VpiL 4.86 V cm. 4.86 / 0.09 cm = 54 V, the p.15-16 "estimated half-wave voltage ... 54 V".
  - -1 dB at 110 GHz.
  - IL 4.3 dB. Static ER 33.2 dB.
  - 4.2 dB/mm, so 42 dB/cm.
  - 5 Vpp, 140 GBd, ER 2.08 dB.
- Fig. 5(b) red: minimum about -1.6 dB near 95-100 GHz, peak about +2.5 dB near 50 GHz, no -3 dB crossing.
- C-band from the TSL550 C-band source (p.16).
- Clean.

**yue2025-b**
- 70 GHz at 6 V (p.13); 0.3 mm.
- IL 2 dB, static ER 35.3 dB, 110 GBd, ER 2.36/2.14 dB.
- Fig. 5(b) purple first reaches -3 dB at about 70 GHz (-2.7 dB at 65 GHz, -4.2 dB at 75 GHz).
- Values clean; see N2 for the note wording.

**yue2025-c/-d**
- See the changed-cells table.
- Mapping confirmed: -c carries the m=1 device fields (folded electrode, TFT tags, two-bias stack, 0.9 mm), and -d carries the m=0 device fields (main region only, 0.3 mm, single bias).
- IL, ER, propagation loss, Vpi, eye and driver data are correctly left empty on the 0 V rows.

## New findings

**N1 (minor, locator). yue2025-b and yue2025-d `length_mm` evidence locator says "p.12, Fig. 4 caption"; the Fig. 4 caption is on p.11.**
- Source:
  - In `references/yue2025/text.md` the Fig. 4 caption (line 865) comes before the `<!-- page 12 -->` marker (line 876).
  - figures.json places Fig. 4 on page 11 (page_11.png, img_p11_1.png).
- The value 0.3 mm is unaffected.
- Proposed fix: in `data/_staging/p4_05/evidence/yue2025.yaml`, change the locator of the `length_mm` entries for yue2025-b and yue2025-d to "p.11, Fig. 4(b) caption; p.12, Sec. 2B".
- Optionally, change the `epitaxy_or_stack` locator "p.12; p.16" to "p.11-12; p.16" for yue2025-b and yue2025-d. Both entries cite the Fig. 4(b) caption as the source of the m=0 structure.

**N2 (minor, note wording). yue2025-b: the row note and the `bw3db_ghz` evidence note say the Fig. 5(b) purple trace reaches -3 dB "near 65 to 70 GHz" ("near 65-70 GHz" in the evidence note).**
- My trace reads -2.7 dB at 65 GHz with the first -3 dB point at about 70 GHz, consistent with the stated 70 GHz. The Q1 auditor read 68-70 GHz.
- No value change.
- Proposed fix (optional): change "near 65 to 70 GHz" to "near 68-70 GHz" in the devices.csv yue2025-b `notes`, and "near 65-70 GHz" to "near 68-70 GHz" in the evidence note.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p4_05`: merge counts papers 5, devices 11, orgs 1, evidence 5; conflicts 0; validation errors 0; dry run (nothing written).
