# Session 2026-10-07 final audit (Claude, fresh context, read-only)

Date: 2026-10-08. Scope: working-tree diff against HEAD b0aa327 (nothing committed), session record
DevLog-022, WORKBOARD.md, coordination/claims/claude-continuation-2026-10-07.md. Only this file was written.

Result: 0 blocking, 2 data, 6 docs, 1 privacy, 7 minor. The canonical tables are consistent: no HEAD row was lost,
no line-ending churn, and the validator, pytest and engine tests pass. Every canonical change traces to a
DevLog-022 step, except the geo_12 merge and the 14-site append, which happened but are not yet recorded (F01).

## Findings

| id | severity | location | evidence | recommended fix |
|---|---|---|---|---|
| F01 | docs | DevLog/DevLog-022-continuation-2026-10-07.md (progress log end, TODO, front matter) | The log stops at "geo_12 (these 5 papers) extraction started". Not recorded: the geo_12 audit (`data/_staging/audits/geo_12-affil-claude-audit-2026-10-07.md`: 0 blocking, 1 metadata, 1 minor, 4 observations; dispositions in `data/_staging/geo_12/AUDIT_DISPOSITIONS.md`); the geo_12 merge (`logs/merge_affil_geo12_20261007T235807.log`: +80 rows, 1 new org; now 2880 rows, 231 papers, 284 orgs); the 14-site geocode `geocode-1007-d` with the KIST override `refine-d` (org_sites 296 -> 310); the final people/view rebuild (atlas.json 2026-10-07T23:59:24, after the last CSV write). All 9 TODO boxes are unchecked although B0, N1, N2, I1 p8_01..05, G1, D1 and E1 are done; status is `in_progress`. | Add a progress entry for geo_12 audit/merge, site batch d, final rebuild and checks; tick the finished TODOs; set the final status. |
| F02 | docs | WORKBOARD.md rows E2i.2 / E3i, U3, CONT; Q2 note | E2i.2/E3i = `in_progress`, "independent Q2 audit after"; U3 = "in_progress (after E2i.2/E3i gates)". But DevLog-012 front matter is `status: ready_for_review`, and the Q2 audit (`DevLog/audits/e2i2-e3i-u3-q2-claude-audit-2026-10-07.md`) and its corrections are done. README also calls them implemented "with independent Q2 audit and corrections". The CONT row says "affiliations for 71 papers"; the actual number is 96. The note "Q2 ... was not run separately ... the engine audit after E2i.2/E3i covers the shared runner" is now out of date. The canonical snapshot line (2026-10-05, 208/479/258/1385) is correct for b0aa327 but no current counts are given. | Set E2i.2/E3i/U3 to ready_for_review (Q2 audited, corrected). Update the CONT scope and the Q2 note. After the commit, update the snapshot line (233 / 519 / 284 / 1509). |
| F03 | docs | coordination/claims/claude-continuation-2026-10-07.md | The task line says "G1 (geo_06..geo_11)". Owned write paths list `data/_staging/geo_06..geo_11/` and do not list geo_12, `data/_staging/geo_sites_1007/`, `data/_staging/audits/box-proposals-verify-*` / `long-notes-verify-*`, `scripts/build_people.py`, `scripts/merge_affiliations.py`, `data/schema/devices.schema.yaml`, `data/_staging/conventions_2026_10_05/` (search caches, W1 plan, fetch logs) or `data/_staging/discovery_2026_10_02/RETRIEVAL_REQUESTS.md`, all of which the session wrote. Status is still "claimed 2026-10-07". | Extend the task and paths to what was written; set the status (ready_for_review or complete) at commit. |
| F04 | docs | DevLog-022 N2 entry ("p8_06 not created") | `data/_staging/p8_06/` exists (needs_download.md, prefetch_status.jsonl from 2026-10-08T04:37:48Z, no_open_source), and so does `data/_staging/batches/p8_06.csv` (zhang2025, yang2024). | Change the wording to "p8_06 batch prepared; no source obtained (prefetch status in data/_staging/p8_06/)". |
| F05 | docs | data/_staging/conventions_2026_10_05/W1_metadata_plan.json | The tracked 2026-10-05 plan (184 entries) is overwritten by `refresh_metadata.py` apply (233 entries; byte-identical to `ingest_2026_10_07/metadata_plan_after_p8_02.json`). Overwriting is how the script works and git history keeps the old file, but DevLog-022 records only the copies. | Add one sentence to DevLog-022 saying the W1 plan file now holds the 2026-10-07 plan (the 2026-10-05 version is in b0aa327). |
| F06 | docs | data/people.csv, data/paper_authors.csv | 15 HEAD person_ids are gone, every one a rename (no person lost; 21 paper_authors slots re-pointed). 14 name slugs became ORCID iDs because the new Crossref lists (p8 VOR papers) carry ORCIDs: david-barton, gaurang-r-bhatt, chi-hou-chan, aaron-danner, hanke-feng, andres-gilmolina, james-hone, yaowen-hu, honglin-lin, michal-lipson, annina-riedhauser, kamman-shum, min-wang, c-j-xin. The 15th is 0009-0007-1328-1082 (DUPLICATE_ORCID). The merges I spot-checked are sound: Min Wang is ECNU XXL on both papers, David R. Barton III is Harvard/Northwestern, Aaron J. Danner is NUS. DevLog-022 records only Fangchen Hu. | Record that person_id is not stable across rebuilds (slug -> ORCID when an iD appears) and list the 14 renames, or state that no consumer depends on them (the app does not use person_id). |
| F07 | data | data/evidence/{cai2025,lee2026,rahman2025,falcone2026}.yaml, buffer_oxide_um entries; data/_staging/ingest_2026_10_07/apply_box.py | The verifier's apply list (`box-proposals-verify-claude-2026-10-07.md`, "Rows to apply") includes "plus proposed notes for cai2025, rahman2025, lee2026" (and an optional falcone2026 note). The `keep` branch of apply_box.py applies basis and locator only and ignores `new_buffer_note`. Not applied: cai2025-a/b "thermal oxide under Si3N4; LTOI donor BOX removed", lee2026-a..e "wafer BOX; oxide released around the waveguide", rahman2025-1..3 "nominal; LNOI 2 um BOX removed". Values, bases and the remaining verified actions match exactly (all 17 non-keep rows, 25 + 2 basis changes, lee2020a-b and lee2026 locators, zhang2022 locator rejection, meng2023-a amended cladding, thiele2022/weigel2018 cladding entries). The current notes are not wrong, only shorter than the verified text. | Apply the 10 proposed notes (25-word limit) or record in DevLog-022 that keep-row notes were skipped on purpose. |
| F08 | data | data/org_sites.csv "Changchun University of Science and Technology, Changchun" | The point comes from Wikidata Q17499649, labelled "university in China (1951-2000)", a historical item. The site review rated it `weak` ("not the current Q1009991 ... cannot be confirmed offline"). The refinement returned only the locality centre, so the first-pass point was kept at precision `campus`. The row notes say only "1.5 km from locality centre". | Either downgrade to the city centre (precision city), or keep the point and add a note: historical Wikidata item, campus point unconfirmed. |
| F09 | privacy | new untracked files: data/_staging/conventions_2026_10_05/search/openalex/eltes2020.json, search/crossref/yeh2026.json, data/_staging/audits/geo_11-affil-claude-audit-2026-10-07.md | These files contain third-party author e-mail addresses taken from public metadata or print: two lumiphase.com addresses in the OpenAlex raw affiliation strings, one g.harvard.edu address as a Crossref "affiliation name", and one uni-muenster.de address quoted in the geo_11 audit. They are not the user's data, and at HEAD 1 tracked file of this kind already exists. No absolute local paths, user names, user e-mail, tokens, private repo names, Lambda/Luxretius or daily-notes references appear in the diff or in any of the 245 untracked files. | Optional before a public commit: in the geo_11 audit, replace the address with "e-mail in wolf2018a text.md line 41"; keep the raw API caches verbatim or leave them untracked. |
| F10 | minor | scripts/merge_affiliations.py lines 48-51 | Replacement is per paper. If a staged batch holds only some authors of a paper that already has canonical rows, the other authors' canonical rows are dropped without warning. The dry run reports totals only (staged / kept). A batch staged for an already-merged paper works correctly: the geo_12 dry run gives "staged rows 80, staged papers 5, kept canonical rows 2800; rows 2880 ... problems 0", which is idempotent. | Print, per replaced paper, the canonical row count and author set against the staged ones; flag any author that loses all rows. |
| F11 | minor | scripts/merge_affiliations.py `--sites-out` | With kept rows merged in, `--sites-out` now writes every site in the whole table (310), not just the staged batch's sites. geocode_sites.py does not re-fetch cached queries, but a site list fed to it now includes all existing sites. This session used hand-made `sites_new_*.csv` files. The docstring does not mention the change. | Restrict the output to sites not in data/org_sites.csv, or document the new behaviour. |
| F12 | minor | scripts/merge_affiliations.py organizations merge | Staged orgs are only appended (existing names are never updated). Rows are written with the canonical header and DictWriter's default `extrasaction="raise"`. A staged organizations.csv with extra columns would therefore raise after author_affiliations.csv has already been written: a partial apply. All seven staged headers (geo_06..geo_12) match the canonical header, so nothing is affected now. | Check staged org headers before writing anything. |
| F13 | minor | scripts/build_people.py DUPLICATE_ORCID | The mapping is correct and is applied only to Crossref iDs (the only iD source). The duplicate iD 0009-0007-1328-1082 no longer appears anywhere in data/ (people.csv merge_basis "exact_name+shared_org+shared_coauthor;orcid"). | Optionally add the duplicate iD to merge_basis or variants of 0000-0003-3859-1558. |
| F14 | minor | README.md header | "310 geolocated institution sites": 2 of the 310 rows are unresolved (Cetus Photonics, pre-existing; MultiLane Inc., new). atlas.json integrity has sites 308. The same wording convention was used at HEAD (212 incl. Cetus). | "310 institution sites (308 placed)" or leave as is. |
| F15 | minor | data/org_sites.csv | The University of Washington source_label starts with " (public research university ...)" (empty English label; noted as cosmetic in the review). MultiLane Inc. notes say only "unresolved", while the review and DevLog give the reason "no city printed". | Fill the label and the reason in the notes. |
| F16 | minor | references/*/source.json (25 files) | Each file gains a trailing newline (EOF churn) alongside the licence fields. Harmless. | None. |

## What was checked

### 1. Data integrity (HEAD vs working tree, keyed row sets)

| table | HEAD | now | lost | new | changed | explained by |
|---|---|---|---|---|---|---|
| papers.csv | 208 | 233 | 0 | 25 (p8_01..05) | 15 (wafer_supplier NANOLN/NanoLN Inc. -> NanoLN only) | apply_d1 |
| devices.csv | 479 | 519 | 0 | 40 (8+8+9+7+8, matches the staged devices.csv exactly) | 38 | see below |
| organizations.csv | 258 | 284 | 0 | 26 (staged 27; University of Ottawa staged in p8_02 and p8_05) | 0 | p8 merges, geo_11, geo_12 |
| org_sites.csv | 212 | 310 | 0 | 98 (71 assemble_sites + 13 batch c + 14 batch d) | 0 | G1 |
| author_affiliations.csv | 1723 | 2880 | 0 | 1157 = 200+172+172+195+151+187+80 (geo_06..12) | 0 | G1 |
| paper_authors.csv | 2097 | 2298 | 0 | 201 | 21 (person_id re-pointing only) | people rebuild |
| people.csv | 1385 | 1509 | 15 ids (all renames, F06) | 139 | - | people rebuild |

- The 38 device changes: chen2025-h wavelength 1568.5 -> 1569.4 plus its note; hu2026a-ch1..ch8 bw_basis -> extracted_from_figure and qualifier gt -> approx; kari2025-a..e and zhou2026-a integration -> foundry_native; 17 buffer_oxide_um / 16 cladding changes (thiele2022 x6, meng2023-a, valdez2023 x8 cleared; wang2022-a 0.65 -> 2.0; weigel2018-a 0.05 -> 3); notes only on eltes2020-a, li2026-a, lin2025-a, shen2025-a/d, xu2022-a (long-note overflow sentences). Nothing unexplained.
- Modified evidence files: all 46 belong to the apply_box, apply_notes or apply_d1 paper sets. None unexplained.
- Documented drops: gaier2025-c and liu2025d-b were never canonical, and no residue is left in devices.csv or evidence.
- Line endings: every canonical CSV is CRLF on every line, at HEAD and now. Evidence YAML is LF at HEAD and now. No churn.
- Long notes: all 66 evidence notes equal the verified text (60 as proposed, 6 corrected incl. chen2025-h with its value correction), and all 7 overflow sentences are in row notes. chen2025-h evidence is 1569.4, extracted_from_figure, p.5 Fig. 3(d).
- BOX re-read: see F07; everything else matches the verifier's apply list exactly.
- p8 papers vs staging: only metadata fields differ (licence 25, published_on 18, redistribution 7, VOR url/doi/venue/source_type 7, authors 4: yeh2026, bankwitz2026, zhang2024 +Yuansong Zeng, chaudhury2024 Fedorov). audit_status = audited for all 233.
- Affiliation coverage: 231 papers. Authors without rows that this session introduced: datta2024 Vivian Zhou and zhang2024 Yuansong Zeng (both documented). The rest are pre-existing (cai2025, gao2024, li2022b, ummethala2021, xu2022, yue2023). Kind rule: every primary row is aff_order 1, and every author has an aff_order 1 row.
- Sites: every (org, locality) in author_affiliations has an org_sites row and vice versa. Batches c and d match geocoded_c/d (and refined_d for KIST); the only differences are coordinator notes. Spot-checked the six review `wrong` sites and the shared Genuine Optics / Ligent building (same printed address).
- 13 second-wave papers: no papers.csv change (arXiv no_match); 13 search caches added.

### 2. Read-only runs (2026-10-08)

- `uv run python scripts/validate_db.py`: 0 error(s), 0 warning(s).
- `uv run pytest -q`: 30 passed, 5 warnings (SWIG deprecation).
- `uv run python scripts/merge_affiliations.py data/_staging/geo_12` (dry run): staged rows 80, staged papers 5, kept canonical rows 2800; rows 2880, papers 231, new orgs 0, sites 310, problems 0.
- `node --test tests/*.test.mjs` (engine): 134 tests, 133 pass, 0 fail, 1 todo (D5), as DevLog-022/012 state. The working-tree file count was unchanged after the run.
- `uv run ruff check` on both changed scripts and data/_staging/ingest_2026_10_07/*.py: all checks passed.
- app/static/data/atlas.json: 233 papers, 519 devices, 284 orgs listed (277 used), 40 sims, 308 sites, 3 printed-country warnings (aimone2026, sun2026, zhou2026, as documented). Built after the last CSV write.

### 3. Scripts

- build_people.py: the DUPLICATE_ORCID mapping is applied before union-find, so "never merge different ORCIDs" still holds. Fangchen Hu: one person across hu2023, hu2026, liu2026a. Mengyue Xu: split as documented (xu2026a/b slug). See F13.
- merge_affiliations.py: kept rows plus staged rows, with validation over the whole table (duplicates, author alignment, org existence, source), so a canonical problem blocks any apply (conservative). CRLF is preserved by the csv default terminator. A staged batch for an already-merged paper is idempotent. See F10-F12.

### 4. Docs

- README counts (233 / 519 / 284 / 2,880 rows over 231 papers / 310 sites / 1,509 people / 461 candidates / 40 sims unvalidated, all audited) match the files. "Affiliations and sites for 96 papers" = 71 + 20 + 5. The next-work items match RETRIEVAL_REQUESTS.md and the DevLog-012 limitations.
- DevLog-022 counts checked: 213/487 -> 218/494 -> 223/503 -> 228/511 -> 233/519; affiliations 2613 -> 2800 (+739, +151, +187); org_sites 212 -> 283 -> 296; people 1478 -> 1509; NanoLN 15 papers; BOX 15 cleared, 2 corrected; notes 60 + 5 + chen2025-h. All consistent. The gaps are in F01 and F04-F06.
- Edits to other DevLogs (000, 004, 008, 010, 014): +1 line each (insert only). RETRIEVAL_REQUESTS.md: +8 lines (insert only). Claim status lines: 10 updated as described.

### 5. Privacy and rights

- `git diff` added lines and all 245 untracked files grepped for /Users/, /private/tmp, /home/, the user name and e-mail, token patterns, Luxretius, Lambda and daily-notes: no hits. The only hit was the public repository URL in a User-Agent string, which also appears in tracked scripts at HEAD. Author e-mails: F09.
- No new PDF or other binary among the untracked files. The p8 source.pdf files were already tracked at HEAD, as arXiv copies (DevLog-020 decision 4: cached arXiv PDFs stay tracked). The 15 stamped subscription PDFs and the OFC PDFs stay git-ignored. `references/_inbox/*`, `logs/`, `__pycache__/` and `data/_staging/geo_cache/` are ignored (checked with git check-ignore). No local_source_path values in the p8 batch CSVs.
- Still open, outside this diff: stamped PDFs in git history (user decision 4; WORKBOARD R1).

### 6. Engine/app (light check)

- DevLog-012 is `ready_for_review` and has its Q2 corrections section. README describes the implemented stages and their limits consistently. WORKBOARD is stale (F02). The test counts reproduce.
