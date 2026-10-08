---
title: Continuation 2026-10-07 (claims, p8 ingestion, affiliations, network metadata, data rulings, engine)
date: 2026-10-07
status: ready_for_review
owner: claude-continuation-2026-10-07
---

# DevLog-022: continuation 2026-10-07

## User decisions (2026-10-07)

| # | Item | Answer |
|---|---|---|
| 1 | External network runs (arXiv preprint search for the 13 second-wave papers; Wikidata/OSM geocoding of new sites) | approved |
| 2 | codex-main | no longer active; claims not done or updated for more than 2 days (git history) are up for grabs |
| 3 | `ready_for_review` tranches | accepted as complete |
| 4 | Stamped PDFs in git history (ogiso2024, wang2025, gupta2023) | open (not answered) |
| 5 | `references/_inbox/` (40 processed originals, git-ignored) | kept; deleted only on request |

## Plan

Workstreams (max 5 subagents at once; network work by the coordinator only, rate-limited):

- **B0 bookkeeping**: claims older than 2 days (git) closed or released; accepted tranches -> complete; WORKBOARD
  rewritten to the current state; superseded DevLog checkboxes marked; README counts and next work.
- **N1 metadata (network)**: `refresh_metadata.py fetch --only <13 ids>` with arXiv (stop on HTTP 429), plan, apply.
- **N2 open-access sources (network)**: `prefetch_batch.py` for zhang2025 (Nanophotonics, CC-BY) and yang2024
  (MDPI Photonics); paywalled shen2023, zhou2024, zhang2021b stay on the retrieval list.
- **I1 ingestion p8** (Sonnet distill/correct, Opus audit/verify, fresh context each; briefs in
  `data/_staging/ingest_2026_10_07/`): 26 cached arXiv priority-2 candidates + N2 papers.
  - p8_01 TFLN MZMs: behzadfar2026, ghavami2023, wu2022, yeh2026, bankwitz2026
  - p8_02 LN mm-wave/THz/RF: gaier2025, liu2025d, xie2024, zhang2024, park2026
  - p8_03 transduction/quantum: zhu2022, axline2026, mohl2025, khalil2026, lin2026b
  - p8_04 BTO/STO materials, 2D, HZO: thureja2025, tian2026, datta2020, datta2024, taki2024
  - p8_05 Si / plasmonic: anjali2025, chaudhury2024, saxena2023, shawon2024, shabaninezhad2025
  - p8_06 open access fetched in N2: zhang2025, yang2024 (if obtained)
- **G1 affiliations**: DevLog-018 pipeline for the 71 papers without `author_affiliations` rows that have a source
  (li2026a, qiu2026 have none): extraction geo_06..geo_10 (Sonnet), Opus audit, corrections, merge; p8 papers in
  geo_11 after their merge; then one geocoding run for new sites (network, 1 req/s, pilot first) and an Opus site
  review.
- **D1 data rulings (coordinator)**: hu2026a per-channel bandwidth; kari2025 integration; `buffer_oxide_um`
  definition; wafer_supplier spelling (NanoLN); person merges needing evidence; long evidence notes.
- **E1 engine**: codex-main's E2i.2/E3i claim (no progress since 2026-10-02) taken over; one Opus subagent works the
  DevLog-012 sequence (E2i.2 then E3i), engine/sim-UI paths only, no canonical data.
- Checks after each merge: validator, build_views, pytest, ruff, vitest, svelte-check, build, smoke; final
  fresh-context audit of the whole session diff.

## TODO

- [x] B0 claims, WORKBOARD, DevLog checkboxes, README
- [x] N1 arXiv metadata for 13 papers (no preprints found) + 25 p8 papers
- [x] N2 open-access fetch (both blocked, HTTP 403; on the retrieval list)
- [x] I1 p8_01..p8_05 distill / audit / correct / verify / merge
- [ ] I1 p8_06: not distilled (zhang2025, yang2024 need a browser download)
- [x] G1 affiliations geo_06..geo_12, geocoding, site review
- [x] D1 rulings
- [x] E1 engine E2i.2, E3i, U3 (+ Q2 audit and corrections)
- [x] Final audit and checks
- [ ] Commit (on the user's request)

## Progress log

- 2026-10-07: decisions recorded; plan written; claim `coordination/claims/claude-continuation-2026-10-07.md`.
- 2026-10-07: p8 batch CSVs (`ingest_2026_10_07/make_p8.py`) and briefs (DISTILL/AUDIT/CORRECT/VERIFY, from the
  2026-10-05 briefs plus the coordinator rules learned there); Sonnet distillers p8_01..p8_04 and the Opus engine
  agent (E2i.2 -> E3i -> U3) started.
- 2026-10-07: N1: `refresh_metadata.py fetch --only eltes2020` stopped on export.arxiv.org HTTP 429 at the first
  request; one manual probe got HTTP 503 after 46 s (Varnish), a later probe HTTP 429 in 0.6 s. arXiv not contacted
  further this round. OpenAlex (`ingest_2026_10_07/openalex_arxiv.py`) has no arXiv location for eltes2020
  (its arXiv title differs), so OpenAlex cannot replace the title search; route dropped after one request.
- 2026-10-07: N2: zhang2025 (Wiley-hosted Nanophotonics PDF) and yang2024 (MDPI PDF) both HTTP 403 to the script
  (bot block); stopped, added to `RETRIEVAL_REQUESTS.md` "Start here" for a browser download. p8_06 was not
  distilled: only the batch CSV and the prefetch status folder (`data/_staging/p8_06/`) exist.
- 2026-10-07: D1 rulings applied (`ingest_2026_10_07/apply_d1.py`; CSVs written CRLF like the originals):
  - hu2026a-ch1..ch8: coordinator pixel reading of Fig. 7 (p.10): raw traces first dip below the drawn -3 dB line
    at about 39.2-39.7 GHz (ripple, 0.2-0.8 dB), text and abstract say "exceeding 40 GHz", undefined labels
    43.1-43.6 sit near the final crossings -> bw3db_ghz 40 qualifier gt -> approx, bw_basis extracted_from_figure,
    evidence note and row notes updated (old notes said 36-39 GHz).
  - kari2025-a..e integration monolithic -> foundry_native ("Samples were fabricated at Luxtelligence using their
    open-source process design kit", p.4; convention ee; precedent liu2026d). DB-wide check of rows whose
    foundry_or_fab names a foundry/company found one more: zhou2026-a ("designed and fabricated by Liobate
    Technology", p.1) monolithic -> foundry_native, stale note sentence replaced. bhasker2026 (Broadcom's own fab)
    and hsu2024 (Intel) stay monolithic (in-house).
  - wafer_supplier: NANOLN / NanoLN Inc. -> NanoLN in 15 papers rows (nanoln.com body text "NanoLN", legal name
    Jinan Jingzheng Electronics Co., Ltd.; navigation uses capitals); descriptors kept.
  - `buffer_oxide_um` defined in the schema as the buried/bottom (BOX or bonding) oxide; an oxide buffer or
    over-cladding between waveguide and electrodes goes to `cladding`. 121 of 188 filled rows already follow it;
    67 rows (27 papers) whose evidence wording is top-buffer or unclear are in `ingest_2026_10_07/box_worklist.csv`
    for a source re-read (subagent queued).
  - People: Fangchen Hu holds two ORCID iDs (0000-0003-3859-1558: hu2023 Fudan work, liu2026a Zhangjiang group;
    0009-0007-1328-1082: Fudan education, Zhangjiang Laboratory since 2023; both public ORCID records read, 2
    requests) -> `DUPLICATE_ORCID` in `scripts/build_people.py` maps the second to the first. Mengyue Xu stays split
    (he2019/xu2020/xu2022 Sun Yat-sen University vs xu2026a/b with no affiliation rows yet; revisit after G1).
  - Validator 0 errors, 65 pre-existing note warnings.
- 2026-10-07: B0: WORKBOARD rewritten (active / complete tables, takeover rule in the claim protocol); 10 claim
  status lines updated (complete per the user's acceptance; codex-main released, data-lane closed); dated status
  notes appended under the stale checklists of DevLog-000, 004, 008, 010, 014 (insert only).
- 2026-10-07: p8_01 distilled (5 papers, 8 rows: behzadfar2026 4 design rows, ghavami2023 2 design rows, wu2022 1,
  bankwitz2026 1, yeh2026 papers-only; 3 new orgs; dry run 0/0); Opus audit started. p8_04 distilled (5 papers,
  7 rows: datta2020 3, datta2024 3, taki2024 1; thureja2025 and tian2026 papers-only; 3 new orgs; dry run 0/0).
  p8_05 distiller started. Geo batches geo_06..geo_10 written (71 papers; li2026a, qiu2026 have no source) with
  `ingest_2026_10_07/GEO_EXTRACT_PROMPT.md`; queued for free slots.
- 2026-10-07: p8_02 distilled (5 papers, 10 rows, 11 new orgs, sims/zhang2024/config.yaml grade B), p8_03 (5 papers,
  9 rows incl. transducer rows axline2026 x6 and mohl2025, khalil2026 acousto-optic; lin2026b review papers-only),
  p8_05 (5 papers, 8 rows; chaudhury2024 papers-only; 6 new orgs); all dry runs 0/0; Opus audits started.
- 2026-10-07: p8_01 audit (Opus): 0 blocking, 2 numerical (behzadfar2026-a 219 GHz vs figure readings 207-210 GHz;
  ghavami2023-a IL from the conclusion only), 1 metadata, 5 minor. Coordinator: keep 219 (Table 1 and text four
  times) with readings in notes; clear the IL (y). Corrected (6 applied, 1 adjusted); verified 8/8 (Opus); verifier
  N1 (wu2022 single-point -3 dB touch near 38 GHz) added to the note by the coordinator; N2 ghavami2023 title keeps
  "trade-off" (arXiv listing title, identity version without DOI; print has "trade off", typography only);
  wafer_supplier NANOLN -> NanoLN in staging. Subagent dry runs were blocked by the permission classifier; the
  coordinator ran them (0/0). Merged (`logs/merge_p8_01_*.log`, all 5 set audited, backup of the tables in the
  session scratch): 213 papers / 487 device rows; validator 0 errors.
- 2026-10-07: p8_04 audit (Opus): 0 blocking, 1 numerical (datta2024-c IL 2.96 dB is consistent with IL_pi/2 4.7 =
  2.96 + 1.73 dB, not a conflict), 1 metadata (datta2020 eo_material graphene_2d), 5 minor; papers-only for
  thureja2025/tian2026 and the taki2024 row upheld. Corrected (7 applied); verifier started.
- 2026-10-07: p8_04 verified (7/7; N1 BATCH_REPORT enum wording fixed by the coordinator; side finding: substrate
  evidence basis is inconsistent DB-wide, 143 design_target / 142 measured / 12 extracted_from_figure, Methods
  statements recorded as measured in some rows -> follow-up sweep under convention bb). Merged
  (`logs/merge_p8_04_*.log`): 218 papers / 494 device rows.
- 2026-10-07: p8_03 audit (Opus): 0 blocking, 1 numerical (khalil2026-a length 0.2 vs the 0.4 mm the VpiL uses ->
  0.4, convention q), 10 minor; transducer rows (axline2026, mohl2025) and the acousto-optic khalil2026 row kept
  (convention dd is not a ban; witmer2020 and montifiore2026 precedents); lin2026b review papers-only. Corrected
  (11 applied), verified 11/11, verifier N1-N3 (report text, source_files, quote "2pi x 145 MHz/V") fixed by the
  coordinator. Merged (`logs/merge_p8_03_*.log`): 223 papers / 503 device rows; validator 0 errors (66 note
  warnings).
- 2026-10-07: p8_05 audit (Opus): 0 blocking, 2 numerical (anjali2025 BOX 2 um missed; saxena2023-a max line rate
  40 Gb/s PAM4 derived), 6 metadata (shabaninezhad2025 platform plasmonic_mim and electrode plasmonic_lumped;
  anjali2025-a electrode lumped; shawon2024-a bw_method link_eoe; Huawei Technologies Canada parent_org; outside-paper
  countries kept with a note as for CompoundTek/SMIC), 6 minor. Corrected (13 applied, 1 adjusted: chaudhury2024
  caption does say C-band); verifier started. geo_06 extracted (15 papers, 200 rows, 0 new orgs, dry run 0
  problems); geo_07, geo_08 started; `GEO_AUDIT_PROMPT.md` written.
- 2026-10-07: p8_05 verified (14/14; N1 shawon2024 link gain is absolute, N2 source_files, N3 anjali2025 drive_vpp_v
  basis simulated (simulation input), N4 saxena2023 locator: fixed by the coordinator). Merged
  (`logs/merge_p8_05_*.log`): 228 papers / 511 device rows; validator 0 errors.
- 2026-10-07: geo_06 kind fix: 40 aff_order >= 2 rows primary -> additional (canonical rule: 1362 primary all at
  aff_order 1, 362 additional, 11 present_address); rule added to GEO_EXTRACT_PROMPT.md. geo_07 (14 papers, 172
  rows), geo_08 (14, 172), geo_09 (14, 195) extracted, 0 new orgs, dry runs 0 problems; the harness refused the
  subagents' REPORT.md writes, so the coordinator saved each report from the final message. geo_10 extraction and
  the Opus audits geo_06+07 and geo_08+09 started.
- 2026-10-07: engine agent (Opus) delivered E2i.2, E3i, U3 and the Wheeler conductor-loss model; DevLog-012 is
  `ready_for_review` with results, limitations and proposed config changes (not applied: no paper config can run
  eo_overlap or rf_line until arm windows and loss declarations are added). Reported: engine 126 tests (125 pass,
  1 todo D5), app 35 tests, svelte-check 0, both builds and smokes pass, 0 metric changes on all 39 configs. Fresh
  Opus Q2 audit started.
- 2026-10-07: geo_06+07 audit: 1 blocking (eltes2020 Pascal Stark is IBM marker 1, staged as Bristol; coordinator
  confirmed from the PDF spans), 2 metadata (Atsugi / Kawasaki locality strings reuse the canonical sites), 1 minor
  (KIT IPQ/IMT unit join); all applied by the coordinator. geo_08+09 audit: 0 blocking, 0 metadata, 3 minor (report
  text). geo_10 audit: 1 metadata (liu2026d locator p.10), 2 minor; applied.
- 2026-10-07: INCIDENT: `merge_affiliations.py --apply` with only geo_06..09 rebuilt data/author_affiliations.csv
  from those batches alone (1723 canonical rows dropped; validator 288 errors). Restored at once from the zip taken
  just before (diff vs HEAD empty). Script changed: --apply now keeps canonical rows and replaces only the staged
  papers' rows; dry run prints staged / kept counts. Re-applied: geo_06..09 (+739 rows) and geo_10 (+151): 2613
  rows, 206 papers.
- 2026-10-07: geocoding of 71 new (org, locality) sites (`geo_sites_1007/`, logs `geocode-1007-*`; pilot 3 first;
  1.1 s spacing, cached): wikidata/campus 30, nominatim/campus 6, nominatim/city 34, unresolved 1. Opus site
  review started (overrides or same-site copies). BOX re-read delivered (67 rows: keep 50, move_to_cladding 7,
  correct_value 2, clear 8; basis-only proposals) and long-note rewrites (66 notes, 7 overflow sentences); Opus
  verifications started.
- 2026-10-07: engine Q2 audit (Opus, `DevLog/audits/e2i2-e3i-u3-q2-claude-audit-2026-10-07.md`): accept after
  corrections; 0 blocking, 1 numerical (N1 arm B field from the unrefined mesh, 0.45 % arm asymmetry, ~0.2 % VpiL),
  2 contract (C1 mzm_differential undefined in the data schema; C2 Wheeler recesses floating T-rail pads, chen2022
  loaded section fails at 110 GHz although readiness said ready), 8 minor; independent checks matched (rotation
  sense to 5e-16, fixture closed forms, Wheeler vs a round wire over ground +0.61 % / +0.34 %). C1 fixed in the
  schema by the coordinator: convention (q) defines mzm_differential = Vpi against the full terminal difference
  V+ - V- (johnson2025 "Vpi,diff" and the engine agree; qiu2026 cannot be rechecked: no cached source). Engine
  corrector (Opus) started for N1, C2, M1-M8.
- 2026-10-07: buffer_oxide_um applied (`ingest_2026_10_07/apply_box.py`, log `logs/apply_box_*.log`) after the Opus
  verification (`data/_staging/audits/box-proposals-verify-claude-2026-10-07.md`, 65/67 confirmed): cleared on 15
  rows (thiele2022 x6 and meng2023-a moved to cladding; valdez2023 x8 the 0 meant "no electrode buffer", BOX not
  numbered), wang2022-a 0.65 -> 2.0, weigel2018-a 0.05 -> 3 (+ cladding "SiO2 50 nm between the LN film and the Al
  electrodes"), meng2023-a cladding text per the verifier, basis measured -> design_target on 25 wafer/nominal rows
  (convention bb), valdez2023a-a/b extracted_from_figure, 6 locators; zhang2022 locator change rejected. Follow-ups
  from the verifier: valdez2023 cladding "none above LN" vs p.3 deposited oxide; wang2022-b BOX empty (same wafer).
- 2026-10-07: valdez2023 cladding (8 rows) -> "PECVD oxide cladding with an edge on the chip (p.3, Fig. 1(c)); Au
  electrodes patterned directly on the LN, no oxide between electrode and LN (p.15)". wang2022-b left: its whole stack
  is empty by the distiller's choice, not only the BOX.
- 2026-10-07: long notes applied (`ingest_2026_10_07/apply_notes.py`) after the Opus verification
  (`data/_staging/audits/long-notes-verify-claude-2026-10-07.md`): 60 as proposed, 5 corrected texts, 7 overflow
  sentences appended to row notes; chen2025-h wavelength 1568.5 -> 1569.4 nm (verifier's calibrated reading of
  Fig. 3(d) reproducing the stored N50/N60 peaks; the N80 trace has no peak near 1568.5; coordinator pixel check
  consistent), row notes sentence updated. Validator warnings 66 -> 0.
- 2026-10-07: sites: Opus review (`data/_staging/audits/geo_sites-1007-review-claude-audit-2026-10-07.md`): 30 ok,
  34 weak, 6 wrong (three Santa Clara county centroids, Laval at the Quebec province centroid, Chongqing University
  at the municipality centroid, Changchun University matched Changchun University of Technology), 1 unresolved;
  pipeline issue: a printed city resolving to a county/province/municipality breaks the 50 km check. Refinement
  pass (32 override queries, log `geocode-1007-refine-*`), assembled with `ingest_2026_10_07/assemble_sites.py`
  (5 same-site copies; 23 refined; printed-street-address hits relabelled building; Chongqing University placed at
  the metro station named after the campus, precision postcode, noted). org_sites.csv 212 -> 283 sites; MultiLane
  Inc. unresolved (no city printed). Validator 0 errors, 0 warnings.
- 2026-10-07: people rebuilt: 2248 slots -> 1478 people (Fangchen Hu merged across 3 papers via DUPLICATE_ORCID;
  Mengyue Xu stays split: xu2026a/b University of Michigan, no shared org or coauthor with the Sun Yat-sen papers).
  build_views: 228 papers, 511 devices, 267 orgs, 3 printed-country warnings (aimone2026 Nokia Stuttgart DE,
  sun2026 NVIDIA Yokneam IL, zhou2026 Liobate CN; rule e). geo_11 (20 merged p8 papers) extraction started.
- 2026-10-07 22:33 PDT: export.arxiv.org answered HTTP 200; `refresh_metadata.py fetch` (pilot eltes2020, then 32
  papers; logs `refresh_metadata_fetch_*`, no block): the 13 second-wave papers have no arXiv preprint (title +
  first-author search, no_match); 20 merged p8 papers got arXiv OAI records; Crossref title search found versions of
  record for bankwitz2026 (npj Nanophotonics), chaudhury2024 (IEEE PTL), thureja2025 (Nano Letters), wu2022
  (Micromachines), yeh2026 (Nano Letters). Applied (plan copy `ingest_2026_10_07/metadata_plan_after_p8.json`):
  20 papers: arXiv v1 published_on, cached-copy licences (axline2026, saxena2023, wu2022, bankwitz2026 CC-BY-4.0;
  behzadfar2026 CC0-1.0 -> open_license_ok; NC/ND/nonexclusive -> restricted_local_only), and for the 5 VOR papers
  url/doi/venue/source_type and Crossref author lists (chaudhury2024 VOR lists Vladimir Fedorov where the arXiv print
  has Chengkuan Gao). People rebuilt (1478); validator 0/0.
- 2026-10-07: engine Q2 corrections (Opus; DevLog-012 "Q2 corrections" section): N1 arm windows refine the
  electrostatic mesh (new symmetric push-pull gate: |balance+1| 1.26e-2 before, 1.7e-5 after), C2 rf_line blocked on
  the loaded cut of periodic_t_rail lines with identical readiness/run message, C1 wording cites convention (q), M2
  flagged Wheeler-spread targets (diagnostic + UI), M3-M8 applied, M1 partial (reference frequency ignores
  comparable:false targets; sweep-end dependence documented). Regression 40 configs x 2 stage sets: 0 metric,
  status or warning changes; 10 rf_line readiness messages on loaded cuts changed (blocked before and after).
  Coordinator re-ran: engine 134 tests, 133 pass, 0 fail, 1 todo (D5); app 35 tests; svelte-check 0 errors.
  geo_11 extracted (20 papers, 187 rows, 1 new org Infineon Technologies Austria AG; datta2024 Vivian Zhou without
  any source affiliation); Opus audit started.
- 2026-10-07: geo_11 audit: 0 blocking, 0 metadata, 2 minor (chaudhury2024 Fedorov locator "crossref.json author
  3"; anjali2025 "West Bengal" note), both applied; merged (+187 rows, 1 new org): author_affiliations 2800 rows,
  226 papers (no rows: li2026a, qiu2026 without source; p8_02 pending). 13 new sites geocoded (log
  `geocode-1007-c-*`): 9 resolved (IIT Kharagpur with an override query; the printed locality is the state),
  4 companies at city level (Huawei Technologies Canada, Miraex SA, NEXQT Institute, Pixel Photonics GmbH); coordinator
  review of all 13. org_sites 296; validator 0/0; people 1478; views rebuilt.
- 2026-10-07: p8_02 audit (Opus, 1 h 44 min): 0 blocking, 6 numerical (zhang2024-a RF Vpi 8 V stated vs Fig. 3(c)
  measured 9.6-11.7 V -> cleared (y); liu2025d band-pass widths and gaier2025-b detection flatness are not 3 dB EO
  bandwidths -> cleared; xie2024-a ER 19.3 dB contradicted by the plotted levels -> cleared; gaier2025 geometry
  resolvable from Fig. S1(b) -> filled; fsr moot), 1 metadata (gaier2025 grade B; sim config deferred), 8 minor
  (gaier2025-c dropped (dd), park2026 drive push_pull and PPLN geometry on both rows, zhang2024 RF loss basis
  measured, sim signal-electrode provenance project_inference, xie2024 cl_twe). Corrected (13 applied, 2 adjusted);
  coordinator dropped liu2025d-b (no in-scope metric left; dd). Dry run 0/0; Opus verifier started.
- 2026-10-07: p8_02 verified (18/18; I1-I4 stale liu2025d-b references and the Fig. 2(a) citation, I5 zhang2024-b
  smoothed reading 6.2-6.6 V: fixed by the coordinator). Merged (`logs/merge_p8_02_*.log`): 233 papers / 519 device
  rows, all 233 audited; validator 0/0. Metadata for the 5 papers (arXiv OAI + Crossref title search): versions of
  record found for xie2024 (Electromagnetic Science) and zhang2024 (Nature Communications); applied (plan copy
  `metadata_plan_after_p8_02.json`); people 2298 slots -> 1509. geo_12 (these 5 papers) extraction started.
- 2026-10-08: geo_12 (80 rows, 1 new org: Key Laboratory of Photonic-Electric Integration and Communication-Sensing
  Convergence (Ministry of Education), printed without host) audited (0 blocking, 1 metadata: liu2025d University of
  Ottawa locality "Ottawa" as printed, not the "Ottawa, ON" site of a different printed address; 1 minor), fixed and
  merged: author_affiliations 2880 rows, 231 papers (no rows: li2026a, qiu2026). 14 new sites geocoded (log
  `geocode-1007-d-*`); KIST first matched a different Wikidata item, re-run with a Korean-name Nominatim query;
  DRS Daylight Solutions placed by its printed street address. org_sites 310; organizations 284; people 1509;
  views 233 papers / 519 devices; validator 0/0.
- 2026-10-08: checks: pytest 30 passed; ruff and mypy findings all pre-existing (HEAD versions checked:
  merge_affiliations/build_map_labels/validate_db mypy errors, discovery/ingest_2026_10_05 ruff errors, 7 unformatted
  scripts); new `ingest_2026_10_07` scripts ruff clean and formatted; engine 134 tests (133 pass, 1 todo D5); app 35
  tests, svelte-check 0; `BASE_PATH=/eo-atlas` and root build + smoke pass; smoke screenshots of /sim (EO/RF stage
  panel) and /explore (map with the new KR/IR/IN sites; 215 of 233 papers under default filters) inspected (session
  scratch, not kept). README counts, engine status, sim count (40) and next work updated. Final fresh-context audit of
  the session diff running.
- 2026-10-08: final fresh-context audit (`DevLog/audits/session-2026-10-07-final-claude-audit.md`): 0 blocking,
  2 data, 6 docs, 1 privacy, 7 minor; no HEAD row lost in any table, line endings unchanged, every canonical change
  traced to this log, verified apply lists matched except F07. Dispositions: F07 applied (12 approved BOX notes of
  keep rows; falcone2026 keeps its original note, lee2026 note de-duplicated); F08 note on the Changchun University of
  Science and Technology site (historical Wikidata item, review weak); F09 the OpenAlex cache of the abandoned route
  deleted and the e-mail address quoted in the geo_11 audit redacted (Crossref caches keep public author metadata as
  the tracked caches already do); F01-F04 this log, WORKBOARD, claim, p8_06 wording; F05: `refresh_metadata.py apply`
  always rewrites `W1_metadata_plan.json` (the 2026-10-05 plan stays in git history and in W1_metadata_plan_from_HEAD
  .json); copies of today's plans are `ingest_2026_10_07/metadata_plan_after_p8*.json`; F06: 15 person_ids changed:
  14 name slugs became ORCID iDs because new Crossref records supplied an ORCID (person_id = ORCID when known), plus
  the Fangchen Hu duplicate iD; no person lost; F10 merge_affiliations reports a problem when a staged paper omits an
  author that has canonical rows; F11 docstring; F12/F13/F16 left (no impact); F14 README "310 sites (308 with
  coordinates)"; F15 University of Washington labels and the MultiLane note filled. Validator 0/0.

## Results

| Item | Before (HEAD b0aa327) | After |
|---|---|---|
| Papers / device rows | 208 / 479 | 233 / 519, all `audited` |
| Organizations | 258 | 284 |
| Author-affiliation rows (papers) | 1723 (135) | 2880 (231) |
| Institution sites | 212 | 310 (308 with coordinates) |
| People | 1385 | 1509 |
| Validator warnings | 65 | 0 |
| Engine stages | electrostatics, optical mode | + eo_overlap, rf_line (Wheeler), stage readiness, U3 UI |

## Open items

- User: retrieve zhang2025 and yang2024 (open access, blocked to scripts), zhang2021b, liu2026d SI,
  schwarzenberger2026a version of record; decide on the stamped PDFs in git history (ogiso2024, wang2025, gupta2023).
- Sim configs: arm windows, target vpi_convention and sourced loss declarations (DevLog-012 list) so eo_overlap and
  rf_line can run on paper configs; gaier2025 sim config (grade B) deferred; material constants from primary sources.
- Data: substrate evidence-basis sweep (convention bb; 142 measured vs 143 design_target); wang2022-b stack empty;
  Mengyue Xu person split (no linking evidence); Hartmann name variants (wolf2018a vs bankwitz2026); second
  University of Münster site ("Muenster" vs "Münster", both as printed); Chongqing University placed at the
  campus metro station.
- Engine: EO-response and periodic loaded-line stages; floating-conductor detection outside the declared loaded cut.
