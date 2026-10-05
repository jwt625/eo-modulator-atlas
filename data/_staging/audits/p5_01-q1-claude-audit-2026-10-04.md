---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_01
date: 2026-10-04
scope: data/_staging/p5_01 (bao2026a, bao2026b, deng2026a, gong2026, kawahara2026); papers.csv, devices.csv (10 rows), organizations.csv (1 row), evidence/*.yaml; no sims/<id>/ exist for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: no blocking defect; bao2026a and bao2026b pass; deng2026a, gong2026 and kawahara2026 pass after corrections
findings: {blocking: 0, numerical: 2, metadata: 1, minor: 6}
---

# Q1 audit (fresh context): p5_01

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), columns, enums), `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- Batch row identity: `data/_staging/batches/p5_01.csv`. None of the five papers has a `crossref.json`. `source.json` gives DOI and URL only, with an empty license. I checked identity (title, author list and order, affiliations) against the PDF first page (`figures/page_01.png` text and `text.md`). Each page carries the footer "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group" and the file code (M2A.2, W2A.12, M2B.3, W1A.2, M2A.5). The code matches the DOI suffix.
- Full `text.md` read for all five papers, including page 4 of bao2026b (a poster-style restatement with no new numbers).
- Renders and figures I opened and read myself. All readings are approximate.
  - bao2026a: p.2 (Fig. 2, plus zoomed crops of 2(a) and 2(d)) and Fig. 3 eyes (img_p03_1).
  - bao2026b: Fig. 2(a)-(d) (img_p02_1).
  - deng2026a: Fig. 2(a)-(d) (img_p02_1) and Fig. 4(a)-(e) (img_p03_1).
  - gong2026: p.1 (Fig. 1, affiliation), Fig. 2(a)-(b) (img_p02_1), Fig. 3(a)-(c) (img_p02_2) and Fig. 4(a)-(f) (img_p03_1).
  - kawahara2026: p.3 (Fig. 2, Fig. 3), plus a zoomed crop of Fig. 2(b).
- Mechanical check (throwaway scratchpad script) found 0 issues:
  - every non-empty evidence-required cell has an evidence entry whose value equals the CSV cell, and no evidence entry exists for an empty cell;
  - no duplicate (device_id, field) entries;
  - every evidence basis is in the enum;
  - units equal the schema units;
  - every qualifier sits on a populated field and uses lt, gt or approx;
  - no evidence note exceeds 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p5_01` (dry run) printed `merge counts: {'papers': 5, 'devices': 10, 'orgs': 1, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after finishing the checks above.
- Limits:
  - No Crossref records exist. For these OFC papers, identity, license and published_on rest on the PDF alone (see F9).
  - No Supplementary material exists for any of the five papers.
  - All figure readings are by eye on the cached renders.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| bao2026a | 2 | pass | F9 (batch-level minor); 448 Gb/s judgment noted under Verified clean |
| bao2026b | 1 | pass | F9 (batch-level minor) |
| deng2026a | 2 | pass after corrections | F2 (numerical), F4, F5, F9 (minor) |
| gong2026 | 2 | pass after corrections | F1 (numerical), F3 (metadata), F7, F9 (minor) |
| kawahara2026 | 3 | pass after corrections | F5, F6, F8, F9 (minor) |

## Findings

### Blocking

None.

### Numerical

**F1 (gong2026-a, max_line_rate_gbps): the highest demonstrated rate is not in the max column.**
- Current value: `200`. Evidence locator: "p.1 abstract; p.3, Fig. 4(b)".
- Source: p.3, Sec. 3 says that with cleaner, lower-swing drive "TDECQ values of 1.6 dB at 200 Gbps and 3.1 dB at 240 Gbps" were achieved. The Fig. 4(d) label reads "240Gbps 1.92Vppd, 3.1 dB TDECQ". The authors present 240 Gb/s PAM4 as a successful result, with TDECQ below their 200 Gb/s 3.2 Vppd case (2.9 dB is the abstract value).
- Convention (d) puts the extreme demonstrated point in the max_* columns. Here the extreme is a stated success, not a closed eye.
- Proposed change:
  - devices.csv gong2026-a `max_line_rate_gbps` 200 -> 240.
  - Evidence entry: value 240, locator "p.3, Sec. 3; Fig. 4(d)", note "240 Gb/s PAM4, TDECQ 3.1 dB at 1.92 Vppd, 7-tap FFE, -1 V bias".
  - Keep `max_baud_gbd` 100, because 100 GBaud is stated and 120 GBd for 240 Gb/s is not.
  - Append to the row notes: "240 Gb/s PAM4 is 120 GBd by arithmetic, not stated; drive_vpp_v 3.2 refers to the 160/200 Gb/s eyes."
  - BATCH_REPORT's "headline 200 Gb/s" judgment is reversed.

**F2 (deng2026a-a, energy_per_bit_fj evidence basis): an author-computed value is labelled measured.**
- Current evidence entry: value 2470, basis `measured`.
- Source:
  - p.3, Sec. 6: "a maximum data rate of 336Gb/s with a total power dissipation of 831mW, corresponding to an energy efficiency of 2.47pJ/b".
  - p.3, Sec. 5: "The total power consumption of the transmitter in this test is 831mW."
- The authors divide measured power by rate. Under convention (h) that is `derived`, which is also the canonical precedent: kawahara2025 0.78 pJ/bit = 50 mW / 64 Gb/s.
- The scope is right and already disclosed: the whole transmitter including the SiGe driver, at 336 Gb/s, one lane (831 / 336 = 2.47).
- Proposed change: evidence deng2026a-a `energy_per_bit_fj` basis `measured` -> `derived`, note "Authors: 831 mW total transmitter power (driver included) / 336 Gb/s = 2.47 pJ/b; not modulator-only." The CSV value 2470 is unchanged.

### Metadata

**F3 (papers.csv gong2026, foundry_or_fab; organizations.csv GlobalFoundries notes): the foundry is inferred from the company.**
- Current `foundry_or_fab`: `GlobalFoundries`. The paper notes say "inferred from the title ... and the sole affiliation".
- Source:
  - The title and abstract say "in 300-mm (Monolithic) CMOS Silicon Photonics Foundry".
  - The sole affiliation is "GlobalFoundries, 400 Stone Break Rd Extension, Malta, NY".
  - No sentence says where the device was fabricated, and no process or foundry name is given (p.1-3 read; Fig. 1 checked).
- SKILL rule 6: "if a fab or foundry is not named, leave foundry_or_fab empty (do not guess from the company)". This case is stronger than wu2023 (all authors work at a foundry), but the rule is explicit and wu2023 was emptied on the same basis.
- Proposed change:
  - papers.csv gong2026 `foundry_or_fab` -> empty (keep `companies` = GlobalFoundries and `integration` foundry_native).
  - In the papers notes, replace "Foundry GlobalFoundries inferred from the title ... no site stated" with "Fab not named; title says 300-mm monolithic CMOS silicon photonics foundry and all authors are GlobalFoundries."
  - In the devices notes for gong2026-a, drop "Foundry inferred from title and sole affiliation."
  - organizations.csv GlobalFoundries notes -> "Malta, NY; gong2026 p.1 sole affiliation". The org row itself (foundry, US, north_america) is correct.

### Minor

**F4 (deng2026a-a, notes and bw3db_ghz evidence note): the "median" wording does not match the figure.**
- Current row note: "Bandwidth is the median EO bandwidth label of Fig. 2(d) ... the wafer-map inset lists median 38.0 GHz, max 43.0 GHz."
- Source:
  - p.2 text: "median EO bandwidths of 40.8GHz (~41GHz) and 52.9GHz".
  - The Fig. 2(d) label reads only "EO 3 dB Bandwidth = 40.8 GHz", with an arrow to the -3 V experimental trace. My reading puts that trace's -3 dB crossing at about 40 GHz.
  - The wafer-map inset reads "Median = 38.0 GHz", "Max = 43.0 GHz", and one die cell reads 40.8. The inset's bias is not labelled.
- So 40.8 GHz is the plotted die. The text's "median" contradicts the inset. The value 40.8 is the right cell value for the plotted device.
- Proposed change: row note -> "40.8 GHz labels the plotted -3 V trace (also one wafer-map die); text calls it the median but the inset median is 38.0 GHz (max 43.0, bias unlabeled)." Use the same wording, trimmed to 25 words or fewer, in the evidence note.

**F5 (drive evidence basis `design_target`: deng2026a-a, deng2026a-b, kawahara2026-a, kawahara2026-c).**
- `design_target` marks an unrealized design value. It is the wrong label for the drive scheme.
- deng2026a: p.2 states "These two p-n junctions are serially connected to form a push-pull configuration". The driver delivers 3.2 Vppd through a GSSG probe (Fig. 4(a)).
  - Proposed: basis `measured` (stated configuration). Keep the notes.
- kawahara2026: p.1 explains the equalizer "when driven by differential signals". The experiment (p.2) only says the signal was "amplified by a broadband amplifier before being fed into the device via a probe". The authors do not state the drive used in the experiment.
  - Proposed, per convention (f): basis `derived`, note "Equalizer principle assumes differential drive (p.1); drive used in the experiment not stated."

**F6 (kawahara2026-c, drive_vpp_v vs max_line_rate_gbps pairing).**
- Current values: `drive_vpp_v` 2 (approx) and `max_line_rate_gbps` 200.
- The 2 V belongs to DSP-free 112 Gb/s OOK (Fig. 3(a)). The 200 Gb/s PAM4 eye was taken at Vpp 4.2-5.2 V (Fig. 3 caption, rate-to-Vpp mapping not given).
- The row notes already say this, but a rate-vs-Vpp view would pair 200 Gb/s with 2 V.
- Proposed (no value change): start the row notes with "drive_vpp_v refers to 112 Gb/s OOK; the 200 Gb/s PAM4 max rate used 4.2-5.2 Vpp." The coordinator may instead prefer to leave drive_vpp_v empty. Keeping 2 matches the paper's low-voltage headline.

**F7 (gong2026-a, z0_ohm convention).**
- Current: `z0_ohm` 70 (approx), evidence note "Differential line and termination impedance".
- Source p.3: "around 70 ohm (differential)".
- The row notes do not say differential, and most z0 values in the database are single-ended.
- Proposed: append "Z0 70 ohm is the differential impedance" to the gong2026-a notes.

**F8 (kawahara2026-a/-b/-c, band empty).**
- Source: p.1 says the lattice was designed for "ng ~ 30 in the C-band". p.2 says "Optical losses in the measurement setup were compensated by an EDFA".
- Optional: `band` = c_band with an evidence entry basis `derived`, note "C-band design and EDFA in the setup; wavelength not stated". If not filled, add "band not stated (C-band design, EDFA)" to the notes.
- Also optional: the paper states "Laser light of 13 dBm was coupled into the device through a lensed fiber". That is a laser/launch figure, not on-chip power. Leaving `optical_input_power_dbm` empty is defensible, since the row notes record it.

**F9 (batch-wide, papers.csv license and convention (k)).**
- No `crossref.json` exists for any of the five papers.
- `license` = publisher-copyright rests on the page footer "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group". I verified that footer on every page of all five PDFs. `redistribution` = restricted_local_only is correct.
- Convention (k) asks for the notice to be quoted in the evidence note. Here it is quoted only in papers.csv notes, as in the canonical OFC rows (dong2026, liu2026b, wang2026a), but those rows also had a crossref.json.
- Proposed: either accept the papers.csv note as the quotation (coordinator decision), or add one sentence to each evidence file header comment or `source_files` context.
- `published_on` empty is correct: the batch dates are conference schedule dates, not printed in the PDFs.

## Verified clean

bao2026a
- Identity (title, 7 authors in order, both affiliations) matches p.1.
- Orgs reuse existing names exactly: "Institute of Optics and Precision Mechanics, Chinese Academy of Sciences" and "University of Chinese Academy of Sciences". CN; grade C; no sim (silicon ring).
- bao2026a-a bandwidth: `bw3db_ghz` 110 gt with `bw_measured_to_ghz` 110 approx is correct. In Fig. 2(d) the red trace starts at about +0.2 dB, peaks at about +2 dB, has its lowest point at about -1.3 to -1.4 dB near 102 GHz (the evidence note says about -1.2; within reading error), and ends at about 110 GHz without reaching -3 dB. The paper's claim is a 1 dB bound of >110 GHz.
- bao2026a-a other values:
  - wavelength 1310.8 approx: the 0 V dip in Fig. 2(a) is at about 1310.79 nm.
  - ER 18 gt static: "exceeding 18 dB"; the dips sit at about -18 to -18.5 dB.
  - Q 2300 approx, FSR 11 approx, 37 pm/V -> 0.037 nm/V (unit conversion only).
  - drive_vpp 1 and single_ended are stated (p.3).
  - modulation_format numbers match Fig. 3: SNR 3.12 dB, TDECQ 0.16, 2.88 and 4.96 dB. 128 Gbaud for 256 Gb/s is stated.
- max_line_rate 416 (TDECQ 2.88 dB, the paper's headline), not 448 (TDECQ 4.96 dB; the text says the eye "gradually closes"). I accept this. Unlike F1, the authors do not present 448 as achieved.
- bao2026a-b 64 GHz is stated. In Fig. 2(d) the blue trace crosses -3 dB at about 63-64 GHz.

bao2026b
- Identity and orgs as for bao2026a.
- One representative-disk row is acceptable. Fig. 2(b)-(d) show one disk. The array statistics (Q 3200-3700, 1.14 nm spacing, TDECQ 2.68-3.24 dB, 16 x 256 Gb/s) are in the text fields only.
- bw3db 65 with approx: the Fig. 2(d) label reads "3 dB EO Bandwidth ~ 65 GHz". The trace first touches -3 dB at about 62-64 GHz, briefly recovers near 68-70 GHz, and drops below past about 72 GHz. bw_measured_to 100 approx is the axis end of the trace.
- ER 16 approx (extracted_from_figure, static): the 0 V dip in Fig. 2(b) is at about -15.6 to -15.8 dB below the 0 dB baseline. Rounding to 16 with approx is acceptable, and the method is disclosed in the notes.
- wavelength 1326.3 approx: 0 V dip at about 1326.32 nm.
- Also checked: Q 3500 approx, FSR 19.6, 25 pm/V, 8 fF (basis derived, S11-extracted), 2 Vpp single-ended (stated), M8199B.

deng2026a
- Identity (15 authors) and affiliations match p.1. Org names exist exactly.
- VpiL handling is correct: `vpil_dc_vcm` 1.5 with `vpi_convention` unspecified. The paper gives "modulation efficiency of 1.5V*cm" with no bias, definition or measurement figure; the notes say so. No per-arm vs MZM conversion was made.
- drive series_push_pull follows from the stated series-connected junctions.
- Bandwidths: -6 V 52.9 GHz; my reading puts the blue experimental crossing at about 52 GHz. The simulated >70 GHz overall E/O bandwidth (Fig. 3(e)) is correctly excluded. The design Z0 values (65 ohm and 33 ohm) are correctly not entered.
- Fig. 4: NRZ ER 4.05 dB, PAM4 ER 3.38 dB, RLM 94.4% and TDECQ 1.25 dB all confirmed on the image. The 112 GBaud eyes give PAM8 336 Gb/s.
- Choosing ER 3.38 (PAM4) over 4.05 (NRZ) is a judgment call, and the notes give both.
- Two rows by bias, with system results on the -3 V row, follow convention (d).

gong2026
- Identity (19 authors) matches p.1.
- VpiL 1.80 V*cm: Fig. 2(a) lot means are about 1.79-1.83. Loss 10.3 dB/cm: Fig. 2(b) is plotted as negative values, about -10.0 to -10.5. Both are DC (Fig. 2 is titled DC performance). vpi_convention unspecified is correct.
- Bandwidths:
  - -1 V: in Fig. 3(a) the traces cross -3 dB at about 58-66 GHz, consistent with the stated average of 61 GHz. Fig. 3(c) lot medians are about 59-64 GHz.
  - -2 V: in Fig. 3(b) the lowest point is about -2.9 dB near 60 GHz and the traces end at about 66 GHz without crossing. 67 gt matches the stated ">67 GHz" and the 67 GHz LCA; bw_measured_to 67 as the instrument limit is acceptable.
- ER 3.2 dynamic (Fig. 4(f) blue, flat at about 3.2 dB) is correctly preferred over the 3.7 dB "DC ER ... corresponding to a desired driver's impedance matching", which is a conditional figure.
- 3.2 Vppd with 19% reflection and the 7-tap FFE are confirmed.

kawahara2026
- Identity (7 authors) and four affiliations match p.1. All org names exist exactly.
- kawahara2026-a bw3db 66 gt with bw_measured_to 66 approx is correct. In Fig. 2(b) the solid red trace ends at about 66 GHz at about -0.3 to -0.4 dB. "f3dB ~ 80 GHz" is the dotted extrapolation, which the caption describes as "fitted from the last 10 GHz region". The 80 GHz value is correctly kept out of the cell and recorded in the notes. The +6 dB peaking at about 40-45 GHz is noted.
- kawahara2026-b 35 GHz is stated. My plot crossing is about 36-37 GHz, as the evidence note says.
- ng 30 approx carries basis design_target ("designed to achieve slow-light propagation with ng ~ 30"), so it is not presented as measured.
- VpiL 0.32 V*cm is cited from ref. [3] and correctly not entered.
- kawahara2026-c modulation_format TDEC/TDECQ values and voltages match Fig. 3: 1.8/2.3 V, 2.7/2.0 V, 2.5/1.8 V, and 1.6, 2.2, 1.5 dB.
- The row split is correct: the N = 3 rows carry the EO responses, and the N = 4 row carries the transmission results.

Batch-wide
- source_type conference, access unknown, audit_status needs_audit, verified_on 2026-10-04, discovered_via ofc2026;local_corpus (from the batch CSV).
- repro_grade C for all five. No sims, which is correct for silicon devices.
- No absolute or home paths in the staged files. No emoji.
