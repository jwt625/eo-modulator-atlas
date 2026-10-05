---
title: OFC 2026 papers retrieved from the NAS archive and ingested (p5_01..p5_09)
date: 2026-10-04
status: in_progress
owner: claude-ofc-2026-10-04
---

# DevLog-019: OFC 2026 retrieval and ingestion

User request (2026-10-04): find the note on the cached OFC PDF backup, locate the PDFs on the NAS,
copy the relevant papers, mark them retrieved in the DevLogs, and ingest and audit them with
subagents in parallel (max 5).

## Retrieval

- Backup note: `PlayGround/20260320_OFC/NAS_BACKUP_NOTE.md` (archived 2026-07-09 to the NAS as
  `PlayGround_archives/2026-07-09/20260320_OFC.tar`, 23.5 GB, 677 OFC 2026 paper PDFs under
  `.cache/ofc/pdfs/`, named `<paper code>-<uuid>.pdf`).
- Selection: every candidate in `data/candidates.csv` that carries an OFC 2026 paper code and is not
  ingested (55); 46 have a PDF in the archive whose first-heading title matches the candidate title
  (similarity 0.95-1.00, code match); not in the archive: dai2026 (Tu3C.6, invited), leuthold2026
  (Th1H.5, tutorial); the other 7 codes belong to other OFC years (asakura2022, chelladurai2023,
  kohli2024, kulmer2024, schwarzenberger2022, theurer2023, yokoyama2025). The 108 further OFC 2026
  papers listed in the local OFC materials note are lasers, switching, transmission or system papers
  and were not added.
- Extraction: `tar -xf` of the 46 members only (NAS read-only); copied into `references/<paper_id>/`.
- Rights: OFC papers are Optica conference papers obtained through conference access. The repository
  is public, so these PDFs stay local: their `source.pdf` paths are git-ignored by name and the rows
  carry `redistribution: restricted_local_only`.

## Ingestion plan

9 batches (p5_01..p5_09, grouped by platform): Sonnet distill -> Opus audit -> Sonnet correct ->
Opus verify -> serial merge with `audit_status: audited` -> build_views, tests, smoke. Max 5 agents.

## TODO

- [x] PDFs extracted and cached (46)
- [x] Mark retrieved (this DevLog, DevLog-014 retrieval list pointer)
- [x] Distill, audit, correct, verify (9 batches)
- [x] Merge, rebuild, checks

## Retrieved 2026-10-04 (46 papers)

| paper_id | OFC 2026 code | batch | status |
|---|---|---|---|
| aihara2026 | Th4A.1 | p5_05 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| aimone2026 | M4D.4 | p5_03 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| bao2026a | M2A.2 | p5_01 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| bao2026b | W2A.12 | p5_01 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| bhasker2026 | Tu3J.6 | p5_06 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| cai2026 | Tu3J.2 | p5_09 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| deng2026a | M2B.3 | p5_01 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| gong2026 | W1A.2 | p5_01 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| hess2026 | M2B.5 | p5_07 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| huang2026 | Th4A.6 | p5_04 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| hulyal2026 | W1A.7 | p5_07 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| karakida2026 | W2A.5 | p5_08 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| kawahara2026 | M2A.5 | p5_01 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| kholeif2026 | Th1H.2 | p5_08 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| kotz2026 | Th3J.5 | p5_09 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| li2026b | W2A.42 | p5_09 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| lin2026 | Th2A.14 | p5_02 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| liu2026a | M2B.2 | p5_02 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| liu2026c | Th2A.11 | p5_02 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| oe2026 | Tu3J.4 | p5_06 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| ohata2026 | Tu3J.1 | p5_06 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| okuda2026 | Tu3J.5 | p5_06 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| patel2026 | M2A.7 | p5_02 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| qiu2026a | Th3J.4 | p5_09 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| rakowski2026 | M2A.3 | p5_02 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| shen2026 | Th4A.5 | p5_04 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| sobu2026 | W3F.4 | p5_03 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| starnault2026 | Th4B.2 | p5_04 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| su2026 | Th1H.4 | p5_04 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| sun2026 | Tu2J.3 | p5_08 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| taghavi2026a | Th1H.3 | p5_09 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| tatarczak2026 | M2B.6 | p5_08 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| theurer2026 | Tu3J.3 | p5_06 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| tiberi2026 | Th2A.12 | p5_08 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| tobing2026 | Th1D.1 | p5_04 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| valdez2026 | W1A.6 | p5_07 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| weckenmann2026 | M1B.3 | p5_03 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| xu2026a | W1A.4 | p5_07 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| xu2026b | Th4A.2 | p5_07 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| yamaguchi2026 | W1A.1 | p5_05 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| yang2026 | M2A.6 | p5_03 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| yin2026 | M2A.1 | p5_03 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| yu2026 | W4J.4 | p5_05 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| zhang2026a | M2B.4 | p5_09 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| zhang2026b | W1A.3 | p5_05 | retrieved 2026-10-04 (NAS OFC archive), cached locally |
| zhou2026 | Th1C.3 | p5_05 | retrieved 2026-10-04 (NAS OFC archive), cached locally |

## Progress log

- 2026-10-04: 46 PDFs extracted from the archive (log `logs/ofc-extract-*.log`) and cached with `scripts/extract_source.py` (log `logs/extract-ofc-*.log`); `.gitignore` lists the 46 `source.pdf` paths (verified ignored; only `source.json` is tracked). None of the 46 was on the retrieval request lists (they were discovery-only candidates).
- 2026-10-04: distilled p5_01 (5 papers, 10 rows), p5_02 (5 papers, 7 rows; patel2026 review, no rows), p5_03 (5 papers, 7 rows; sobu2026 simulation-only, no rows), p5_04 (5 papers, 7 rows); all dry runs clean, all repro C, no sim configs. Coordinator decision: license `publisher-copyright` from the printed Optica footer (matches existing OFC rows), redistribution restricted_local_only. Opus audits started for p5_01..p5_04.
- 2026-10-04: p5_05 distilled (5 papers, 9 rows, 8 new orgs). p5_03 audit (Opus): 0 blocking, 3 numerical (weckenmann2026 values quoted from ref. 11 entered as measured; two-chip totals on a single-device row; aimone2026 VpiL not reconcilable with Vpi and length), 1 metadata; corrections applied (8/8). Conventions added for later batches: values quoted from earlier work stay in notes; multi-device totals not entered on a single-device row. p5_06 distillation started.
- 2026-10-04: p5_01 audit (Opus): 0 blocking, 2 numerical (gong2026 max rate 240 not 200; deng2026a energy basis derived), 1 metadata (gong2026 fab inferred from the company: empty), 6 minor; corrector started (license-from-footer convention kept). p5_06 distilled (5 papers, 6 rows, 3 new orgs); open question for its audit: ohata2026 is review-style (results cited to earlier work). p5_03 verification started.
- 2026-10-04: p5_01 corrections applied (6 applied, 2 adjusted, 1 rejected per decision): gong2026-a max line rate 200 -> 240 Gb/s; gong2026 fab cleared; kawahara2026 band c_band (derived); dry run clean. p5_06 audit started.
- 2026-10-04: p5_04 audit (Opus): 0 blocking, 4 numerical (huang2026 bounds vs packaged trace; tobing2026 ER from passive MZI, buffer oxide inference), 2 metadata (starnault2026 vpi_convention unspecified; license quote missing from evidence), 6 minor. Decision (all p5 batches): quote the printed Optica copyright notice as an evidence context value (convention k); p5_01/p5_03 to be filled mechanically before merge. Corrector started.
- 2026-10-04: p5_02 audit (Opus): 0 blocking, 3 numerical (lin2026 ER 34 -> about 36 dB from the measured dip; liu2026c-b 65 -> about 60 GHz; rakowski2026 IL basis derived), 2 metadata (GlobalFoundries company vs foundry across batches -> foundry; liu2026c-b drive entry), 6 minor. Corrector started. Network check on user request: this session about 3 Mbit/s up (subagent API traffic), Chrome about 5 Mbit/s down; NAS archive read was LAN traffic and finished earlier.
- 2026-10-04: p5_04 corrections applied (10 applied, 2 adjusted): huang2026 measured-to 110 and packaged bound gt -> approx, device_class mzm; tobing2026 ER (passive MZI) and buffer oxide cleared; starnault2026 vpi_convention unspecified; shen2026 integration monolithic; license_notice context values added. p5_07 distillation started.
- 2026-10-04: p5_02 corrections applied (8 applied, 2 rejected, 1 deferred): lin2026-a ER 34 -> 36 dB; liu2026c-b bw 65 -> 60 GHz; rakowski2026 IL basis derived; GlobalFoundries foundry. Coordinator decisions: context_values license_notice normalized to the dict form (existing files) across all p5 batches before merge, added mechanically for p5_01/p5_03; detuned-ring wavelength_nm = the printed operating/resonance wavelength when stated, else empty. p5_01 verification started.
- 2026-10-04: p5_03 verified (Opus): 11/11 changed cells confirmed; coordinator applied N1 note fix. p5_05 audit (Opus): 1 blocking (zhou2026 140 GHz simulation extrapolation stored as the bandwidth; measured trace ends at 67 GHz near -1 dB), 3 numerical (yamaguchi2026-c derived VpiL 8.1 V cm from module Vpi and 40.5 mm; zhang2026b-b VpiL basis; aihara2026 baud/rate pairing), 2 metadata (NTT, Inc. duplicates the existing NTT row; Liobate fab country unknown), 8 minor. Decisions: 67 gt measured; clear yamaguchi2026-c length (no inferred 13.5 mm); keep stated maxima; reuse the NTT row. Corrector started; p5_02 verification started.
- 2026-10-04: p5_05 corrections applied (12 applied, 2 adjusted, 1 rejected): zhou2026-a bw 140 -> 67 gt measured; yamaguchi2026-c length cleared; zhang2026b-b basis derived, integration monolithic; aihara2026 mapped to the existing NTT org. TODO at merge: append the NTT, Inc. print note to the canonical NTT org row. p5_08 distillation started.
- 2026-10-04: p5_07 distilled (5 papers, 6 rows, 3 new orgs, no sim configs; open: gt bounds where traces touch -3 dB). Audit started.
- 2026-10-04: p5_06 audit (Opus): 1 blocking (ohata2026 results all cited to earlier papers: Okuda et al. OFC 2025 / JLT 10.1109/JLT.2025.3588689, Masuyama et al. ECOC 2025 -> papers row only), 1 numerical (bhasker2026 83 GHz is the last -3 dB crossing; first dip near 70 GHz -> note), 1 metadata, 3 minor. Follow-up candidates: the two ohata2026 source papers. Corrector started.
- 2026-10-04: p5_01 verified (Opus): 14/14 confirmed; coordinator applied N1 (deng2026a band o_band derived from the PDFA). p5_09 distillation started (last batch).
- 2026-10-04: p5_06 corrections applied: ohata2026 rows removed (papers row only, sources cited), bhasker2026 last-crossing note, theurer2026 ER note, license_notice added; 4 device rows. p5_04 verification started.
- 2026-10-04: p5_08 distilled (5 papers, 9 rows, 2 new orgs). Open for audit: NVIDIA vs NVIDIA Corporation naming across batches; CORNERSTONE country not from the paper; tiberi2026 Table 1 repeats tiberi2025 (already canonical) -> no duplicate rows. Audit started.
- 2026-10-04: p5_09 distilled (6 papers, 8 rows; distillation complete for all 9 batches). Open for audit: taghavi2026a duplicates canonical taghavi2026 (same device) -> papers row only; li2026b notch vs gt 67; cai2026 touch near 104 GHz. Audit started.
- 2026-10-04: p5_02 verified (Opus): 14/14 confirmed (lin2026 ER about 35.6-35.9 dB, liu2026c-b -3.0 dB at 60.0 GHz by pixel extraction); coordinator applied N1 note. Verified so far: p5_01, p5_02, p5_03. p5_05 verification started.
- 2026-10-04: p5_07 audit (Opus): 0 blocking, 5 numerical, 8 minor. Coordinator ruling: schema convention (c) governs bandwidth bounds (paper's stated bound with gt; measured-to range; trace behaviour in notes), overriding the stricter batch wording given to agents; a paper whose own data contradict its stated bound gets an empty cell plus a conflict note (valdez2026-b). Applied to p5_07 (xu2026a/b gt 110 kept, valdez2026-a gt 50 kept) and to be applied consistently in p5_09. Corrector started.
- 2026-10-04: p5_04 verified (Opus): 10 confirmed, 1 not confirmed (huang2026-b value), 6 new findings. Rulings per convention (c): huang2026-b keeps the authors' 100 GHz approx with the trace behaviour in notes (as wu2025-a); shen2026-a keeps gt 100; huang2026-a unchanged; N3-N6 applied by a Sonnet follow-up agent.
- 2026-10-04: p5_04 follow-ups applied (huang2026-b 100 approx kept with trace note; shen2026-a gt 100 kept; tobing2026 measured-to 67; Crossref wording). p5_07 corrections applied per convention (c): xu2026a/b gt 110 (stated in text and captions), valdez2026-a gt 50, valdez2026-b empty with conflict note; valdez2026-a IL scope fixed; hess2026 input power 11 dBm. p5_06 and p5_07 verification started.
- 2026-10-04: p5_05 verified (Opus): 15/15 confirmed (zhou2026 measured trace ends near -0.6 dB at 67 GHz); coordinator applied N1/N3 notes. Verified: p5_01, p5_02, p5_03, p5_04, p5_05.
- 2026-10-04: p5_08 audit (Opus): 2 blocking (tiberi2026-a/-b repeat tiberi2025 Fig. 9(b) / Table IV -> rows dropped, cross-reference), tiberi2026-c trimmed to new O-band content, tatarczak2026-a 2.0 Vppd is a stated requirement -> context, org name "NVIDIA Corporation" (as printed), CORNERSTONE GB with traceable note (tiberi2025 Ref. [103], University of Southampton). Corrections applied (9 applied, 2 adjusted, 0 rejected; 7 rows). Verification started.
- 2026-10-04: p5_07 verified (Opus): 13/13 confirmed; coordinator applied N1-N4 (valdez2026-a fiber-to-fiber peak about -3.3 dB, IL-includes locator; hess2026-a Fig. 2(a) baud note and text/figure rate discrepancy note). Dry run clean.
- 2026-10-04: pre-merge fixes: license_notice context values added to p5_01 and p5_03 evidence (sobu2026 papers-only evidence file created); p5_02 org "NVIDIA" removed and patel2026 companies set to "NVIDIA Corporation" (p5_08 org row). p5_04 list-form context_values left as is (canonical already uses both forms).
- 2026-10-04: p5_06 verified (Opus): 7/7 confirmed, 0 new findings (bhasker2026 first -3 dB crossing about 71 GHz, last about 81-83 GHz; ohata2026 citations confirmed). Verified: p5_01-p5_07.
- 2026-10-04: p5_09 audit (Opus): 1 blocking (taghavi2026a-a same device and values as canonical taghavi2026-a -> papers row only, cross-reference), 1 numerical (li2026b-a Fig. 1(b) notch about -3.1 dB near 46.7 GHz), 2 metadata (kotz2026-a push_pull derived; zhang2026a 1 MHz Vpi -> vpi_dc_v), 5 minor. Coordinator ruling on li2026b-a per convention (c) and the bhasker2026 precedent: keep gt 67 (measured to 67) with the notch in notes; the auditor's 46.5 approx proposal not adopted. Corrector started.
- 2026-10-04: p5_09 corrections applied (8 applied, 1 adjusted per coordinator ruling, 0 rejected; 7 rows): taghavi2026a papers row only; li2026b-a gt 67 kept with notch note; kotz2026-a push_pull derived; zhang2026a Vpi at 1 MHz moved to vpi_dc_v; Keysight Technologies Deutschland GmbH parent_org Keysight Technologies (p5_04). Verification started.
- 2026-10-04: p5_08 verified (Opus): 16/16 confirmed (tiberi2026 Table 1 C-band values match tiberi2025 Table IV filtered columns digit for digit); coordinator applied N1 (karakida2026-a er_type static with evidence). Verified: p5_01-p5_08.
- 2026-10-04: p5_09 verified (Opus): 9/9 confirmed; coordinator applied N1-N3 note wording (li2026b-a notch about -3.2 dB near 46.6 GHz; qiu2026a -6 dB crossing 18.5-19.5 GHz; taghavi2026a f-6dB wording). All 9 batches verified.
- 2026-10-04: merged. Pre-merge backup of data/ (zip, scratchpad). All 46 papers set to `audited`; one `merge_staging.py --apply` over p5_01..p5_09 (46 papers, 64 device rows, 26 new orgs after cross-batch dedup; 0 conflicts). Canonical NTT org note appended: aihara2026 writes 'NTT, Inc.'. Checks: validator 0 errors; build_views 184 papers / 403 devices / 228 orgs / 3 warnings; 30 Python tests; ruff clean (UP017 fixed in scripts/geocode_sites.py); 33 app tests; svelte-check 0 errors; build; smoke suite PASS.

## Results (2026-10-04)

- 46 OFC 2026 papers ingested and audited; 42 grade C, 4 papers rows only (ohata2026, patel2026, sobu2026, taghavi2026a). No sim configs.
- 64 device rows: silicon plasma dispersion 25, LN 16, InP MQW 6, LT 5, EO polymer 4, GeSi EAM 3, graphene 2, FN-LC 2, BTO 1; MZM 32, ring 16, EAM 11, IQ-MZM 4, other 1.
- Rows dropped as duplicates of canonical papers: tiberi2026 C-band (tiberi2025), taghavi2026a-a (taghavi2026), ohata2026 (cited earlier work).

## Open items

- build_views warnings (3): aimone2026 (DE, US), sun2026 (US, IL), zhou2026 (US, CN) print company sites in two countries; papers.countries kept as printed, org rows hold one country. Per-author sites would resolve this on the map.
- The 46 OFC papers have no rows in data/author_affiliations.csv yet (DevLog-018 pipeline: per-author affiliations, then geocoding with external Wikidata/OSM requests); they count in the country views but not on the author-level map.
- Retrieval candidates: ohata2026 sources (Okuda et al. OFC 2025 Tu2J.7; JLT 10.1109/JLT.2025.3588689; Masuyama et al. ECOC 2025 W.01.02.3); weckenmann2026 Ref. 11 (arXiv 2509.20584).
- Liobate Technology fab country not stated in zhou2026 (not entered as foundry).
- dai2026 and leuthold2026 were not in the NAS archive.
