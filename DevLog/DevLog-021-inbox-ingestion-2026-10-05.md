---
title: Ingestion of user-retrieved papers (2026-10-05 inbox, batches p6_01..p6_05)
date: 2026-10-05
status: ready_for_review
owner: claude-inbox-2026-10-05
---

# DevLog-021: inbox ingestion 2026-10-05

User request (2026-10-05): check Downloads, move the retrieved papers into the inbox, update the retrieval
request, then start processing them with subagents.

## Retrieved (19 files, moved from Downloads to `references/_inbox/`)

| File | paper_id | Kind | Status before |
|---|---|---|---|
| boynton2020.pdf, xu2022.pdf | boynton2020, xu2022 | version of record | papers rows metadata-only (needs_download), no device rows |
| sciadv.adi5339.pdf + _sm.pdf -> han2023.pdf, han2023_supplement.pdf | han2023 | Science Advances VOR + Supplementary Materials | 1 row from the arXiv v1 preprint |
| li2022b.pdf | li2022b | Optics Express VOR | 1 row from the arXiv v1 preprint |
| lu2020_supplement.pdf, lu2020_correction.pdf | lu2020 | SI + Author Correction (10.1038/s41467-020-18908-5) | 1 row from the VOR |
| 126103_1_online.pdf -> mao2022.pdf | mao2022 | APL Photonics VOR (10.1063/5.0109251, identity from p.1) | candidate |
| chen2023, liu2021a, yang2022, xue2026, chen2026, murai2025, horst2025, pan2021, singer2025, xue2023, hillier2025 | same | VOR | candidates |

Every file's identity was checked on its first page (title, authors, DOI) against `data/candidates.csv` / `data/papers.csv`.

## Plan

1. Extract (`prep.py`): new papers and boynton2020/xu2022 -> `references/<id>/`; han2023/li2022b: VOR becomes the
   primary source, the previous arXiv cache moves to `references/<id>/arxiv/` (kept); supplements/corrections ->
   `references/<id>/supplement|correction/` (locator form `supplement p.N` / `correction p.N`). Extracts in
   subfolders are git-ignored like the top-level ones. Crossref records cached for the new DOIs.
2. Mark retrieved in `RETRIEVAL_REQUESTS.md` and `data/manual_downloads.md`.
3. Distill (Sonnet, one agent per batch, max 5): p6_01 liu2021a yang2022 xue2026 chen2026; p6_02 murai2025 pan2021
   xue2023 li2022b; p6_03 chen2023 mao2022 boynton2020 han2023; p6_04 singer2025 horst2025 hillier2025; p6_05 xu2022
   lu2020. REPLACE rows (han2023, li2022b, lu2020) list every value that differs from the canonical row.
4. Independent audit (Opus, fresh context) per batch -> corrections -> verification -> merge
   (`merge_staging.py --apply --replace-paper-ids` for han2023, li2022b, lu2020, boynton2020, xu2022) ->
   `refresh_metadata.py fetch/apply` (identity, earliest date, Crossref authors, licence) -> `build_people.py` ->
   validator, build_views, tests, smoke -> commit.

## TODO

- [x] Move files, identity check, extraction, Crossref
- [x] Retrieval request + manual download list updated
- [x] Distill p6_01..p6_05
- [x] Audits, corrections, verification
- [x] Merge, metadata refresh, people, views, checks
- [x] README counts, commit

## Progress log

- 2026-10-05: 19 files moved; prep.py extraction done (han2023 VOR 10 pp + SM 26 pp; li2022b VOR 9 pp; lu2020 SI 8 pp + correction 1 p; boynton2020 17 pp; xu2022 2 pp; 12 new papers); Crossref cached (2 fetched). Batch CSVs p6_01..p6_05 written.
- 2026-10-05: 5 Sonnet distillers launched (p6_01..p6_05) with the shared brief `data/_staging/ingest_2026_10_05/DISTILL_PROMPT.md` (conventions a-gg, new required columns, supplement/correction locators, REPLACE/RECHECK difference reports).
- 2026-10-05: p6_05 distilled (xu2022 1 row, grade B, sim config; lu2020 RECHECK: correction only fixes a Fig. 1c label already correct in the cached PDF; new il_fiber_to_fiber 10 dB approx, il_onchip 2.6 dB author_estimate phase_section_only, r_eff 223 pm/V derived, bw reference dc -> low_freq_unstated); dry run 0/0. Opus audit started (shared brief `AUDIT_PROMPT.md`).
- 2026-10-05: p6_04 distilled (singer2025 1 row, horst2025 3 rows, hillier2025 8 rows; 4 new orgs; distiller entered name_source URLs for 3 orgs without network: to verify or clear at merge). merge_staging now rebuilds people.csv/paper_authors.csv in its work copy before validating and copies them on apply (new papers no longer fail on person slots); p6_04 dry run 0/0. Opus audit started.
- 2026-10-05: p6_01 distilled (liu2021a, yang2022, xue2026 x2 rows, chen2026; 4 sim configs, grade B; 4 new orgs; dry run 0/0). Flag: liu2021a looks like the Chinese Optics Letters version of the canonical liu2021 (arXiv 2103.03684, different title); per decisions 2/3 (dedup, DOI first) the coordinator will fold it into liu2021 after the audit confirms identity. Engine note: the distiller cites LN eps_r 38/28 from wang2024b Extended Data Table 1 vs 43/28 in the older sims/liu2021 and sims/chen2022 configs. Opus audit started.
- 2026-10-05: p6_02 distilled (murai2025 2 rows, pan2021 1, xue2023 4, li2022b REPLACE 1 row; 4 sim configs; dry run 0/0). li2022b VOR changes: bw 30 -> 25 GHz (PD-limited), IL re-stated 15.9 dB on-chip device_total, ER 23 dB static added, electrode gap cleared (5.9 vs 5.5 um), simulated VpiL/indices updated. Coordinator flags: li2022b discovered_via keeps the canonical value; sim-config material constants labelled standard_reference without a checked citation must become unknown/placeholder (applies to every p6 config; checked at correction time). Opus audit started.
- 2026-10-05: p6_03 distilled (chen2023 1 row, mao2022 1, boynton2020 FIRST SOURCE 1 (SiNx-loaded TFLN, Sandia), han2023 REPLACE 2 rows; 3 sim configs; dry run 0/0). han2023 VOR + SM: Table S2 BERs (1.64e-2 at 112 Gb/s) contradict the text's FEC claim, so the ~93 Gb/s net rate is not entered; Vpi 78 V / VpiL 0.96 V cm derived from the S6 fit, energy, prop loss and capacitance added; licence CC-BY-NC-4.0 (restricted). All 5 distillations done; 5 Opus audits running.
- 2026-10-05: p6_04 audit (Opus): 0 blocking, 4 numerical (hillier2025 electrical S21 80 GHz out of bw6db; per-device VpiL 1.19/1.40 instead of the joint 1.3; max baud 192 GBd; ng_opt model input), 3 metadata (unverified org name_source URLs, licence token, locator), 7 minor; rulings: per-quadrature rows and (y) empties confirmed, horst2025 third row kept, singer2025 IL derived/device_total confirmed. Corrector started with shared brief `CORRECT_PROMPT.md` (coordinator rules: bare licence tokens, no unverified name_source, standard_reference only with a read citation, canonical discovered_via kept).
- 2026-10-05: p6_05 audit (Opus): 0 blocking, 1 numerical (xu2022 simulated VpiL 2.4 on a measured row blocks the derived 2.35), 2 metadata (lu2020 phase_only_loss tag; drive evidence), 7 minor; Author Correction handling and all lu2020 differences confirmed. Coordinator: lu2020 drive stays unspecified with both statements in notes. Corrector started. (Auditor's dry run was blocked by the permission classifier; coordinator re-runs it.)
- 2026-10-05: p6_04 corrected (13 applied, 1 adjusted, 0 rejected; dry run 0/0); Opus verifier started (shared brief `VERIFY_PROMPT.md`).
- 2026-10-05: p6_05 corrected (8 applied, 2 adjusted, 0 rejected; dry run 0/0; xu2022 sim arm pitch 83 um vs ~104 um from the scale bar left as a flagged conflict in the config); Opus verifier started.
- 2026-10-05: p6_05 verified (10/10 confirmed, 0 unrecorded; dry run 0/0). Coordinator: licence parentheticals in staged papers rows (xu2022, xue2026, chen2026, murai2025, pan2021, xue2023, li2022b) normalized to bare tokens in one pre-merge step; air (eps_r = n = 1) labelled standard_reference in sim configs is accepted as a definitional exception to rule 3.
- 2026-10-05: p6_04 verified (14/14 confirmed, 0 unrecorded, dry run 0/0; 3 informational: BATCH_REPORT predates corrections, one note page reference, boynton2020/xu2022 licence forms handled at merge).
- 2026-10-05: p6_02 audit (Opus): 4 blocking (all four sim configs cite unread references for material constants; li2022b regressed from HEAD placeholders), 0 numerical, 4 metadata (discovered_via li2022b/murai2025, a placeholder classed project_inference, new org names), 17 minor (vpil basis measured -> derived on 5 rows, notes); all li2022b VOR differences confirmed, unlisted ones listed (F09). Corrector started with coordinator decisions (placeholders unknown, air definitional, canonical/batch discovered_via, org names as printed, bare licence tokens). Follow-up (pre-existing, DB-wide): wafer_supplier spellings NanoLN x23 vs NANOLN x7 plus variants to normalize to one name.
- 2026-10-05: p6_03 audit (Opus): 0 blocking, 4 numerical (chen2023 vpi_convention resonance_tuning_derived; han2023 BER wording; missed han2023 4 V bias row with bw > 110 GHz; missed chen2023 prop loss 133 dB/cm derived), 1 metadata (slab_thickness on unetched films), 14 minor; han2023 BER/FEC handling, Vpi 78 V, capacitance, licence, boynton2020 platform and values confirmed. Corrector started (decisions: clear slab on unetched films; add the 4 V row; air definitional; placeholders unknown).
- 2026-10-05: p6_02 corrected (21 applied, 3 adjusted, 1 rejected = F24 DB-wide supplier spelling, kept as follow-up; 19 constants -> unknown placeholders; dry run 0/0); Opus verifier started.
- 2026-10-05: p6_03 corrected (15 applied, 4 adjusted, 0 rejected; new han2023-c 4 V row sharing han2023-deviceA; chen2023 resonance_tuning_derived + prop loss 133 dB/cm; dry run 0/0, 6 device rows); Opus verifier started.
- 2026-10-05: p6_02 verified (24/25 confirmed; F12 note wording on murai2025-a wrong per pixel measurement of Fig. 5(a), coordinator fixes at merge with N1-N4 minor wording/provenance items). p6_01 audit (Opus): 1 blocking (liu2021a = same work and device as canonical liu2021: fold), 2 numerical (chen2026 bw3db under y; xue2026 sim metal height), 5 metadata, 14 minor. Coordinator folded the cache: journal files moved into references/liu2021/, the old arXiv cache into references/liu2021/arxiv/, references/liu2021a removed. p6_01 corrector started (rename liu2021a -> liu2021 in staging and sims, chen2026 bw3db cleared, xue2026 geometry fixed, printed Posted Online dates quoted; Suzhou institute name kept as printed; Nanjing ROR from crossref.json).
- 2026-10-05: user request: inspect Downloads again. Second wave (19:48-20:33), 21 files identified by DOI/title and moved into the inbox: eltes2020 + SI, ogiso2020, kohli2023 (JLT VOR; the ETH Research Collection copy kept in the inbox only), schwarzenberger2026a (author-accepted manuscript, recorded in source.json), li2024, wang2022 + SI, liu2026d, eltes2023 (OFC 2023), schwarzenberger2023a (CLEO 2023), schwarzenberger2023 (IET conference 2023), chen2025 + SI, shen2025 + SI (docx, converted with python-docx; no page markers), zhang2026c, chelladurai2025 SI (main PDF byte-identical to the cached VOR). `prep2.py` extracted all; Crossref cached (5 fetched). RETRIEVAL_REQUESTS.md: 29 entries now marked retrieved; only zhang2021b open in "Start here". Batches p7_01 (eltes2020, eltes2023, li2024, kohli2023), p7_02 (schwarzenberger2026a, schwarzenberger2023a, schwarzenberger2023, ogiso2020), p7_03 (wang2022, liu2026d, chen2025), p7_04 (shen2025, zhang2026c, chelladurai2025 RECHECK with SI); distillers for p7_01..p7_03 started (coordinator rules applied from the start), p7_04 queued (5-agent cap).
- 2026-10-05: p6_03 verified (19/19 confirmed, 0 unrecorded, dry run 0/0; han2023-c checked on Fig. S11; minor at merge: han2023-c bw_method note, BATCH_REPORT wording, physical_device_id lowercase). p7_04 distiller started.
- 2026-10-05: coordinator fixes applied in staging: p6_02 (murai2025-a Fig. 5 note per the verifier's pixel measurement, xue2023-a spacing, pan2021/li2022b config 'wavelength not stated' wording, li2022b ground_r project_inference) and p6_03 (han2023-c bw_method note, physical_device_id han2023-device-a lowercase, BATCH_REPORT pointer); dry runs 0/0. refresh_metadata.py: printed 'Posted/Published online' dates on a cached version of record are date candidates (convention n updated; yang2022 2021-11-24; 0 canonical papers change).
- 2026-10-05: p6_01 corrected (20 applied, 2 adjusted, 0 rejected; liu2021a folded into liu2021 incl. evidence/sims; chen2026 bw3db cleared; xue2026 metal on slab; dry run 0/0). Corrector renamed the Suzhou institute against the coordinator decision: to revert after verification. Opus verifier started.
- 2026-10-05: p7_01 distilled (eltes2020 4 rows with SI, eltes2023 2, li2024 3, kohli2023 1; dry run 0/0); audit started. p7_04 distilled (shen2025 7 rows incl. sys + design rows; zhang2026c papers-only (HFSS/analytic + electrical S21); chelladurai2025 RECHECK: SI read, notes only, 5 new orgs; dry run 0/0); audit started. p7_02 distilled (schwarzenberger2026a AAM 1 row, schwarzenberger2023a 2 rows 11 K / RT, schwarzenberger2023 2 rows, ogiso2020 2 rows; no duplicate devices vs KIT/NTT canonical rows; dry run 0/0); audit started.
- 2026-10-05: privacy/rights: 12 of the new PDFs carry an institutional licensed-download stamp (IEEE "Authorized licensed use limited to: Stanford University", ACS/Wiley "Downloaded ... by Stanford University" with timestamps). Coordinator decision: such subscription copies stay local-only (git-ignored like the OFC PDFs); open-access copies without an institutional stamp stay tracked. A scan of all 159 previously tracked PDFs found 3 more (ogiso2024 and wang2025 with Stanford stamps, gupta2023 with an NTUA stamp): untracked going forward (`git rm --cached`, files kept locally, .gitignore block); they remain in earlier git history (rewriting published history is the user's call).
- 2026-10-05: printed-date candidates extended to IEEE 'Date of publication' (both date orders): li2024 2023-12-05, kohli2023 2023-03-30, ogiso2020 2019-06-24; 0 canonical papers change.
- 2026-10-05: p6_01 verified (21/22; M2 Suzhou rename against the coordinator decision: coordinator restored the printed name 'Suzhou Institute of Nano-Tech and Nano-Bionics, Chinese Academy of Sciences'; leftovers fixed: BATCH_REPORT pointer, liu2021 config comment, candidates.csv liu2021a marked FOLDED, xu2022 bare licence token).
- 2026-10-05: p6_01..p6_05 merged jointly (`merge_staging.py --apply --replace-paper-ids liu2021,yang2022,xue2026,chen2026,li2022b,boynton2020,han2023,xu2022,lu2020`; backup of the pre-merge tables in the session scratch): 17 papers, 33 device rows, 10 new organizations, 17 evidence files; canonical now 195 papers / 436 device rows. The 17 papers set to `audited` (independent audit + corrections + fresh verification). Metadata refresh: Crossref cached, arXiv searches no new matches; apply changed only 3 author-separator forms (plan record `data/_staging/ingest_2026_10_05/metadata_plan_after_p6.json`). People rebuilt: 1951 slots -> 1336 people. Validator 0 errors; build_views 3 pre-existing warnings.
- 2026-10-05: p7_03 distilled (wang2022 2 rows + sim config, liu2026d 8 rows, chen2025 9 rows; 2 new orgs; liu2026d SI missing (non-blocking); dry run 0/0); audit started.
- 2026-10-05: p7_04 audit (Opus): 0 blocking, 1 numerical (shen2025 on-chip IL readable from supplement Fig. S9 inside the docx; digitized 5.85/16.8/9.34 dB match the text), 1 metadata, 5 minor; shen2025 rows/sys/design, year 2024 (printed 'Published online: October 12, 2024'), zhang2026c papers-only and chelladurai2025 recheck confirmed (SI tensor fits are material parameters, not r_eff). Coordinator: IL only on rows a (12.4) and d (13.0) with approx, b/c readings to notes. Corrector started.
- 2026-10-05: p7_04 corrected (6 applied, 1 adjusted per decision; shen2025-a 12.4 / -d 13.0 dB IL approx; dry run 0/0); verifier started.
- 2026-10-05: p7_01 audit (Opus): 0 blocking, 6 numerical (eltes2020-b IL 0.3 dB self-contradiction (y); eltes2020-b 30 GHz is an EOE -6 dB marker at the 30 GHz setup limit -> bw6db approx; kohli2023 resonance_tuning_derived; eltes2023-b/li2024-ps unspecified; eltes2023-a/li2024-c mzm_push_pull; li2024-o 250 Gb/s PAM-6), 1 metadata (same devices in eltes2023 and li2024), 10 minor. Coordinator: bw6db + link_eoe for eltes2020-b; keep both papers' rows with cross-references, no cross-paper physical_device_id. Corrector started.
- 2026-10-05: p7_01 corrected (14 applied, 2 adjusted, 1 rejected (F14 li2024-c VpiL belongs to the 1.5 mm structure li2024-ps); dry run 0/0); verifier started.
- 2026-10-05: p7_02 audit (Opus): 0 blocking, 1 numerical (schwarzenberger2026a max net 323.5 Gb/s), 4 metadata (ogiso2020 series push-pull; schwarzenberger2023a push-pull; source_type conference protected; ogiso2020 eo_effect note), 4 minor; no duplicate devices. refresh_metadata.py no longer changes a conference row to journal from the Crossref type (IET/ECOC proceedings are registered as journal-article). Corrector started.
- 2026-10-05: p7_04 verified (7/7 confirmed, independent Fig. S9 reading 12.3 / 12.9 dB; N1 scan-range wording fixed by the coordinator); dry run 0/0.
- 2026-10-05: p7_02 corrected (8 applied, 1 adjusted: N1 323.5 Gb/s measured as stated; dry run 0/0); verifier started.
- 2026-10-05: p7_03 audit (Opus): 0 blocking, 3 numerical (wang2022-a >70 GHz beyond the 67 GHz trace -> 67 gt; liu2026d Vpi from <=100 kHz data -> DC columns; chen2025 signed tuning from reversed-axis figures), 1 metadata (liu2026d foundry_native), 13 minor (sim-config provenance upgrades from scale-bar measurements, CUMEC expansion cited via chen2025, chen2025 figure-read wavelengths). Corrector started. Follow-ups outside the batch: canonical kari2025 rows (Luxtelligence-fabricated) integration monolithic vs foundry_native rule; schema definition of buffer_oxide_um (BOX vs oxide above the waveguide).
- 2026-10-05: p7_01 verified (17/17 confirmed, 0 unrecorded; N1 li2024-o note sentence order and N2 eltes2023 integration locator fixed by the coordinator; N3/N4 informational, left); coordinator dry run 0/0 (the verifier's dry run was blocked by its permission classifier).
- 2026-10-05: p7_02 verified (9/9 confirmed, 0 unrecorded). Coordinator: V1 my 'measured' instruction for the 323.5 Gb/s net rate was wrong under convention (h) (computed from NGMI with FEC overheads) -> derived; V2 schwarzenberger2023-b wavelength 1550 nm / c_band repeated from p.1-2; V3 locator page fixed; dry run 0/0.
- 2026-10-05: p7_03 corrected (14 applied, 3 adjusted; dry run 0/0); verifier started.
- 2026-10-05: p7_01, p7_02, p7_04 merged (11 papers, 24 device rows, 6 new orgs; chelladurai2025 replaced; all 11 set audited; canonical 205 papers). Metadata fetch for them stopped by the circuit breaker on arXiv HTTP 429 at the first request; one retry scheduled after a 10 min backoff.
- 2026-10-05: p7_03 verified (17/17; coordinator applied N1 liu2026d note (simulation inset with scale bar, gap not entered), N2 chen2025-f/-i Q assignment note, N3 wang2022-b >70 GHz basis author_estimate, N5 N80 uncertainty 0.7 nm) and merged (3 papers, 19 device rows, 2 orgs; set audited). Canonical: 208 papers.
- 2026-10-05: metadata for the 13 second-wave papers: arXiv returned HTTP 429 on the first request and again after a 10 min backoff, so arXiv was not contacted further (rule: stop on anti-bot signals); `refresh_metadata.py fetch --no-arxiv` (new flag) used Crossref only; apply changed 2 papers via the printed IEEE dates (kohli2023 published_on 2023-03-30; li2024 year 2023, published_on 2023-12-05); plan record `metadata_plan_after_p7.json`. People rebuilt: 2097 slots -> 1385 people. Checks: validator 0 errors (65 note-length warnings), build_views 3 pre-existing warnings, pytest 30, ruff clean, vitest 35, svelte-check 0, build ok, smoke 15/15. README counts, WORKBOARD row INBOX-1005 and the claim updated.

## Results

| Wave | Batches | Papers | Device rows | Notes |
|---|---|---|---|---|
| 1 (19 files) | p6_01..p6_05 | 12 new + boynton2020, xu2022 (first source) + han2023, li2022b (re-distilled from the VOR) + lu2020 (SI + Author Correction); liu2021a folded into canonical liu2021 | 33 | 8 sim configs |
| 2 (21 files) | p7_01..p7_04 | 13 new + chelladurai2025 (SI recheck, notes only) | 46 | 1 sim config; zhang2026c and chelladurai2025 papers-only |

Canonical after both waves: 208 papers / 479 device rows / 258 organizations / 1385 people, every paper `audited` (independent Opus audit, Sonnet correction with dispositions, fresh Opus verification per batch; 9 audits, 9 corrections, 9 verifications). Notable source-level outcomes: han2023 BER/FEC claim contradicted by its own Table S2 (net rate not entered); li2022b VOR bandwidth 25 GHz (PD-limited) replaces the preprint 30 GHz; chen2026 and wang2022 bandwidth claims beyond the measured traces entered as bounds at the measurement limit; unread "standard reference" material constants in 4 configs reverted to placeholders.

## Open items

- arXiv preprint search (earliest date) for the 13 second-wave papers: rerun `scripts/refresh_metadata.py fetch` without `--no-arxiv` later.
- Per-author affiliations and geocoding for the 31 new/updated papers (DevLog-018 pipeline; external Wikidata/OSM requests need approval).
- liu2026d Supporting Information (electrode geometry) and the schwarzenberger2026a version of record (current copy is the accepted manuscript); OFC 2024 Th4B.6 and other conference versions named in the reports are not in the database.
- Follow-ups outside these batches: kari2025 integration (Luxtelligence-fabricated; foundry_native vs monolithic); schema definition of buffer_oxide_um (BOX vs oxide above the waveguide); wafer_supplier spelling normalization (NanoLN / NANOLN); project-level sources for LN/LT mm-wave permittivity and gold conductivity in sim configs; 65 evidence notes over 25 words.
- 15 subscription PDFs with institutional download stamps are local-only (git-ignored); ogiso2024, wang2025 and gupta2023 were untracked going forward but remain in earlier git history.
