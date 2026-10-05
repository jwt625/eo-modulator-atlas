---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_06
date: 2026-10-04
scope: data/_staging/p5_06 (bhasker2026, oe2026, ohata2026, okuda2026, theurer2026); papers.csv, devices.csv (6 rows), organizations.csv (3 new), evidence/*.yaml; no sim configs exist (correct, InP EAM)
mode: read-only (only this file written; no edits, no git, no network)
verdict: merge after corrections; one blocking finding (ohata2026 device rows report results cited to the authors' earlier papers and must be removed); bhasker2026 needs a bandwidth note; oe2026 and okuda2026 clean
findings: {blocking: 1, numerical: 1, metadata: 1, minor: 3}
---

# Q1 audit (fresh context): p5_06

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), columns, enums), `data/_staging/BATCH_INSTRUCTIONS.md`. Format skimmed from `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md`.
- Batch conventions from the coordinator: values the paper quotes from the authors' earlier work are not this row's data; multi-device totals are not placed on a single-device row; `publisher-copyright` from the printed Optica footer is accepted (there is no crossref.json for these OFC 2026 papers).
- Sources: the full `references/<id>/text.md` for all five papers (3 pages each) and `source.json`. There is no `crossref.json` for any of the five. Identity was checked against the page-1 render and `data/_staging/batches/p5_06.csv`.
- Renders opened: bhasker2026 page_01, page_02, page_03 and img_p02_1 (Fig. 5, plus a 3x crop of 60-100 GHz); oe2026 page_02 and page_03 (Figs. 3, 4, 5); ohata2026 page_02 (Figs. 1(d), 2, 3(c)); okuda2026 page_02 and page_03 (Figs. 2, 3); theurer2026 page_02, plus a 400 dpi re-render of the PDF page 2 strip with Fig. 2(a)-(d) (pymupdf, local file, scratchpad output). All figure readings below are my own and approximate.
- Mechanical check (throwaway scratchpad script) over all 6 rows:
  - every evidence-required non-empty cell has an evidence entry with an equal value: 0 missing, 0 mismatches;
  - every qualifier sits on a populated field, and no evidence entry exists for an empty cell;
  - no duplicate (device_id, field) entries;
  - all evidence bases are in the enum and all evidence units equal the schema units;
  - no evidence note exceeds 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p5_06` (dry run) output: `merge counts: {'papers': 5, 'devices': 6, 'orgs': 3, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- `BATCH_REPORT.md` was read only after the verification above. Its judgment calls match what I found. On ohata2026 it explicitly left the keep-or-remove decision to the coordinator; F1 answers that question.
- Limits:
  - The Fig. 5 curves (bhasker2026) and the Fig. 2(c) curves (theurer2026) are noisy or rippled, so crossing frequencies read from them carry about +/-2 GHz uncertainty.
  - The cited earlier papers (ohata2026 refs 7, 8, 10) are not cached and were not read.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| bhasker2026 | 1 | pass after corrections | F3 (numerical) |
| oe2026 | 1 | pass | none |
| ohata2026 | 2 | pass after corrections (device rows removed; papers row only) | F1 (blocking), F2 (metadata), F6 (minor) |
| okuda2026 | 1 | pass | none |
| theurer2026 | 1 | pass after corrections | F4 (minor) |
| batch-wide | - | - | F5 (minor, advisory) |

## Findings

### Blocking

**F1 (blocking). ohata2026-a and ohata2026-b report results cited to the authors' earlier papers, not new results of this paper.**
- Cells: `data/_staging/p5_06/devices.csv` rows ohata2026-a (bw3db_ghz 106, modulation_format, max_line_rate_gbps 450, epitaxy_or_stack and the rest) and ohata2026-b (bw3db_ghz 110, bw_measured_to_ghz 110 and the rest). The evidence entries are the 8 entries in `data/_staging/p5_06/evidence/ohata2026.yaml`.
- What the source says:
  - p.1-2: "The EML 3-dB bandwidth achieved 106 GHz thanks to the narrow high-mesa waveguide structure [8]."
  - Ref [8] is S. Okuda et al., "High-speed 340 Gbps PAM4 and 450 Gbps PAM6 Operations of Narrow High-Mesa EML," OFC2025 Tu2J.7. That title is exactly the 340 Gb/s PAM4 / 450 Gb/s PAM6 eye result of Fig. 2, which follows in the same paragraph ("Since the good small signal characteristics were obtained, we measured optical waveforms for 340 Gb/s PAM4 and 450 Gb/s PAM6").
  - p.3: "The 3-dB bandwidth of 110 GHz was achieved for this configuration [10]." Ref [10] is K. Masuyama et al., "110 GHz Bandwidth Flip-Chip Bonded EML for High-Speed IM-DD Applications," ECOC2025 W.01.02.3.
  - The abstract is in the past tense ("We reported a high-speed EML and its assembly technology"). The introduction frames the paper as a report of "our EML and its assembly technology". bhasker2026 ref [7] (p.3) lists the same Okuda result as a JLT paper, doi 10.1109/JLT.2025.3588689.
- Decision (explicit): the 106 GHz bandwidth, the 340 Gb/s PAM4 (TDECQ 3.9 dB) and 450 Gb/s PAM6 eyes, and the 110 GHz flip-chip bandwidth are all cited to refs [8] and [10]. None is presented as new. Under the batch convention they are not this paper's data. Redrawing the earlier figures here does not make them new measurements.
- Proposed change:
  - Delete rows ohata2026-a and ohata2026-b from `devices.csv`.
  - Set `entries: []` in `evidence/ohata2026.yaml`. Keep the file with its header, as for other no-row papers, or drop it if the coordinator's convention prefers that.
  - The papers.csv edits are in F2.

### Numerical

**F3 (numerical). bhasker2026-a `bw3db_ghz` 83: the measured SSD21 first crosses -3 dB well below 83 GHz. The row does not say so.**
- Cells:
  - `devices.csv` bhasker2026-a: `bw3db_ghz` 83 with qualifier `bw3db_ghz:approx`, `bw_basis` measured, `notes`.
  - `evidence/bhasker2026.yaml` bw3db_ghz entry, note "Stated close to 83 GHz; measured mixed-mode SDD21 ...".
- Source:
  - p.2 says "3-dB and 6-dB EO BW are close to 83GHz and 99GHz respectively". Fig. 5 carries the label "3dB BW ~83GHz".
  - My reading of Fig. 5 (img_p02_1, approximate): the measured blue trace first falls through -3 dB near 70 GHz and reaches about -3.4 to -3.5 dB near 72-73 GHz. It climbs back above -3 dB from about 75 GHz to about 81 GHz, then crosses for the last time near 82-83 GHz.
  - The 6 dB value (about 99-100 GHz) is a clean single crossing.
- Why it matters: the authors' 83 GHz is the last -3 dB crossing of a rippled trace. A first-crossing definition gives about 70 GHz. Without a note, the row overstates the bandwidth by that definition. This is the same situation as the lotkov2024 round-2 finding (R2-F1), except that here no fit is involved. The value is the paper's stated number, so it stays, together with `approx` and basis measured.
- Proposed change:
  - Append to the `devices.csv` bhasker2026-a `notes`: "SSD21 ripple: first dips below -3 dB near 70 GHz (about -3.5 dB at 73 GHz, Fig. 5 reading); 83 GHz is the final crossing."
  - Set the evidence bw3db_ghz note to: "Stated close to 83 GHz (final -3 dB crossing); measured trace first dips to about -3.5 dB near 73 GHz, Fig. 5 reading". That is 23 words.

### Metadata

**F2 (metadata). The ohata2026 papers.csv row needs updating for papers-row-only status.**
- Cells: `data/_staging/p5_06/papers.csv` ohata2026: `repro_grade` C and `notes`.
- Current notes: "... Review-style: results are attributed to the authors earlier works (refs 8, 10); entered as shown in this paper. Two rows: wire-bonded EML, flip-chip EML. ..."
- Proposed change:
  - Set `repro_grade` to empty. The precedent is huang2026a, a review with no device rows and an empty `repro_grade`.
  - Replace the notes with: "No crossref.json: identity from PDF page 1 and the batch row. License from the page footer notice (c) 2026 Optica Publishing Group. published_on empty. NO DEVICE ROWS: invited review-style paper; 106 GHz and 340 Gb/s PAM4 / 450 Gb/s PAM6 results cited to ref 8 (Okuda et al., OFC 2025 Tu2J.7), 110 GHz flip-chip result cited to ref 10 (Masuyama et al., ECOC 2025 W.01.02.3)."
  - Keep `source_type` conference (an OFC paper; the review character goes in the notes), plus `companies`, `research_groups` and `countries`.

### Minor

**F4 (minor). theurer2026-a `extinction_ratio_db` 12 (static) is the end of the plotted bias range, not the operating point.**
- Cells: `devices.csv` theurer2026-a `extinction_ratio_db` 12, `er_type` static, `extinction_ratio_db:approx`; the evidence note reads "Static ER, maximum up to 12 dB over plotted bias range, 50 C".
- Source:
  - p.2 says "achieving a maximum extinction ratio up to 12 dB with an operational bias point at -2 V".
  - My reading of Fig. 2(b), 400 dpi re-render, approximate: about 12.5-12.7 dB at -3.5 V, which is the axis end, and about 3-3.5 dB at the -2 V operating bias.
- The value, approx qualifier and static type are correct as entered.
- Proposed change: append to the evidence note "at -3.5 V; about 3 dB at the -2 V operating bias (Fig. 2(b) reading)". That keeps it at 22 words or fewer, so shorten the existing words if needed. Optionally add the same to the row notes.

**F5 (minor, advisory, no change). er_type mix across EAM rows.**
- Here bhasker2026-a (3.8 dB), oe2026-a (5.2 dB) and okuda2026-a (about 4 dB) carry the dynamic modulation ER, which is each paper's abstract or headline number. Their static ERs go in the notes: over 30 dB for bhasker2026, 22 dB (0 to -3 V) for oe2026, none stated for okuda2026.
- theurer2026-a carries a static ER, the only one the paper gives. All 14 canonical EAM rows with an ER, and aihara2026-a in p5_05, are `static`.
- For bhasker2026 I agree with the dynamic choice. The abstract headline is "3.8dB ER" (RF ER at 160 GBd PAM4, p.3, Fig. 6). The static value is a bound (">30 dB", Fig. 2 reads about 31.5 dB at -6 V), and it is preserved in the notes.
- Any view that compares ER across EAM rows must filter or label by `er_type`. Recorded for the coordinator; no cell change.

**F6 (minor, informational). Primary sources behind ohata2026.**
- Okuda et al., OFC 2025 Tu2J.7, also published in JLT, doi 10.1109/JLT.2025.3588689 (cited in bhasker2026 ref [7]).
- Masuyama et al., ECOC 2025 W.01.02.3.
- Neither is in `data/papers.csv` or a staged batch (grep for okuda, masuyama and the titles). If the 106 GHz / 110 GHz EMLs belong in the atlas, these are the papers to queue.

## Verified clean

**bhasker2026**
- Title, author list (6), venue Tu3J.6 and DOI match page 1 and the batch CSV.
- `publisher-copyright` / `restricted_local_only` match the printed footer. The abstract line "(c) 2026 The Author(s)", present on all five papers, is not a licence grant, so the conservative reading stands. `published_on` is empty, which is correct under (k) with no crossref.json.
- `foundry_or_fab` Broadcom Inc.: accepted. The acknowledgement (p.3) thanks "Broadcom's Breinigsville, PA operations team for fab support". That is an explicit statement of the fabricating site, not a guess from the affiliation.
- 320 vs 360 Gb/s: the intro's "PAM-4 (360 Gbits/s)" is inconsistent with 160 GBd PAM4. The abstract, p.2, the Fig. 6 caption and the summary all say 320 Gb/s. Using 320 in `modulation_format`, with max_line_rate 413 from PAM6 at 160 GBd, is correct, and the papers notes record the discrepancy.
- wavelength 1314 approx: p.2 says "around 1314nm"; the Fig. 4 peak is about 1313.8 nm.
- bw6db 99 approx with a single crossing; `bw3db_reference` dc derived (trace starts at 0 dB). bw_measured_to empty is correct, since a crossing is observed and the VNA reaches 110 GHz.
- drive_vpp 1.5 (Vppd; the 0.75 Vpp SE equivalent is in the note); drive differential (stated); max_baud 160.
- substrate semi-insulating InP, epitaxy text, temperature 55 C elevated, band o_band.
- Simulated wire-bond and flip-chip SSD21 curves and the "beyond 100GHz" flip-chip projection are correctly not entered.

**oe2026**
- Identity (12 authors, Tu3J.4) matches. Licence and published_on are as for bhasker2026.
- bw3db 80: p.2 text. Fig. 4(a) trace crosses -3 dB near 80 GHz (approximate); reference dc derived.
- wavelength 1311.1 (p.2), drive_vpp 2.0 differential, ER 5.2 dynamic after FFE (p.3), max_baud 113.4375 (p.3).
- modulation_format: TDECQ 1.28 dB, OMA 8.6 dBm, SER 9.6e-3, 56.72 GHz filter.
- Static ER 22 dB (0 to -3 V, p.2; Fig. 3(c) reads about 12.5 to -9.5 dBm) is in the notes. Bias -1.7 V, return loss and CMRR to 60 GHz are in the notes.
- Line rate left empty, which is correct: no rate is stated beyond "200G/lane", and computing one would be distiller arithmetic. EA lengths are not given. electrode_type is empty because it is not stated.

**okuda2026**
- Identity (15 authors, Tu3J.5) matches.
- 100 GHz `gt` at the axis limit: the abstract and p.2 say ">100 GHz" and "exceeding 100 GHz". In Fig. 2(b) (page_02 render) the trace peaks near +2.5 dB at about 50 GHz, dips to about -2.3 dB near 98 GHz and ends at the 100 GHz axis edge at about -1.7 dB, with no -3 dB crossing. `bw3db_ghz` 100 with `gt`, plus `bw_measured_to_ghz` 100 (extracted_from_figure, axis end), is correct under convention (c), because the paper's bound equals the plotted range.
- ER 4 approx dynamic ("approximately 4 dB", p.2).
- max_baud 180, max_line_rate 360.
- modulation_format TDECQ points: BtB 3.3 dB and 2.1 dB, 500 m 3.1 dB and 5.4 dB per the Fig. 3(a) table; 2 km at 160 GBd below 3.4 dB (Fig. 3(b): about 3.35 dB at 160 GBd, about 3.8 dB at 170 GBd).
- drive_vpp 1.5 Vppd, wavelength 1310 ("1.31 um", no qualifier, which is correct), 55 C, bias +/-2.3 V, 100 ohm termination.

**theurer2026**
- Identity (9 authors as initials, Tu3J.3) matches.
- 65 GHz with no level stated: p.2 says "a high bandwidth of approximately 65 GHz", and the conclusion says "a modulation bandwidth of 65 GHz". Fig. 2(c), 400 dpi re-render: the four relative |S21|^2 traces lie at about -2.3 to -3.6 dB between about 60 and 67 GHz and touch -3 dB near 64-67 GHz. The traces end at about 67 GHz.
- So the stated 65 GHz is consistent with a 3 dB crossing at the end of the measured range. `bw3db_ghz` 65 approx plus `bw_measured_to_ghz` 67 approx follows convention (c) for a crossing claimed near the instrument limit, and the evidence note discloses that the level is not stated.
- length 0.08 mm, drive_vpp 1.2, max_baud 145, line rate 290 (p.3), and the BER below 3.8e-3 at 10 dBm Rx for all four channels (Fig. 3: EML#1 crosses near 7.5-8 dBm).
- Fiber reach 11 km and uncooled 25-85 C at 140 GBd.
- drive single_ended derived with a note (GSG described as the single-side-drive interface).
- The 770 Gb/s/mm array figure stays in the notes, not in a column, per the batch convention. The crosstalk numbers (-32.2 dB and -40.9 dB, Fig. 2(d)) and the 24 mW output are correct.
- Fab is empty, which is correct: the paper only says "fabricated EML array".

**Organizations**
- New: Broadcom Inc. (company, US, north_america); Sumitomo Electric Device Innovations, Inc. (company, JP, east_asia; parent left empty because the paper does not state it); Mitsubishi Electric Corporation (company, JP, east_asia). The names are the official forms as printed, the types are correct, and the countries come from the addresses (Breinigsville PA; Yokohama; Kamakura/Itami/Amagasaki).
- Reused exactly: Fraunhofer Heinrich Hertz Institute, Technical University Berlin.
- research_groups for ohata2026 and okuda2026 hold the Mitsubishi division names. That is consistent with the earlier R2-F8 disposition, which allows institutes in that column.

**All papers**
- `audit_status` needs_audit, `discovered_via` ofc2026;local_corpus, `cache_status` full_extract, `access` unknown (as in the batch CSV), `verified_on` 2026-10-04.
- No absolute or home-relative paths and no emoji in the staged files.
