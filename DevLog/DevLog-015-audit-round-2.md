---
title: Audit round 2 (needs_recheck) and first audit of p1_02 / p1_04
date: 2026-10-03
status: ready_for_review
owner: claude-audit-2026-10-03
tasks: [Q1-r2, Q1-p1_02, Q1-p1_04]
---

# DevLog-015: audit continuation

User request (2026-10-03): "continue with the auditing" after the canonical merge
recorded in [DevLog-014](DevLog-014-continued-collection-and-ingestion.md).
Starting state: 117 papers, `audit_status` audited 13 / needs_recheck 94 /
needs_audit 10. Validator 0 errors. Claim: `coordination/claims/claude-audit-2026-10-03.md`.

Canonical `data/*.csv` and `data/evidence/` are authoritative from 2026-10-03.
Staging batch directories are the historical record of distillation and round-1
corrections; round-2 corrections are applied to canonical files only.

## Plan

1. Round-2 audits (fresh-context subagents, read-only, one report each under
   `data/_staging/audits/<scope>-r2-claude-audit-2026-10-03.md`):
   - first full audit: p1_02 (5 papers, 10 rows), p1_04 (5 papers, 21 rows)
   - recheck of every needs_recheck paper, grouped as in round 1: pilots + p2_01 + han2023;
     p3_01-02; p3_03-04; p3_05-07; p3_08-10; p3_11-13; p3_14-15; p3_16-17; p3_18-19
   - each recheck first re-verifies every populated cell of the canonical rows against the
     cached source (text and page renders) without reading the round-1 audit, then checks
     every round-1 disposition against canonical data and the source
2. Corrections: one correction subagent per report, run serially (canonical tables are
   shared), each re-checks a finding against the source before acting and writes
   `AUDIT_DISPOSITIONS_R2.md` in the batch staging directory; validator after each.
3. Verification of corrections: a fresh subagent confirms every applied numerical or
   blocking change (value, basis, qualifier, evidence entry) against the source.
4. Status rule: a paper becomes `audited` when it has had at least one full independent
   audit, every finding is dispositioned, and the corrections to numerical/blocking
   findings were independently confirmed (step 3). Otherwise it stays `needs_recheck`
   (p1_02 / p1_04 papers move from `needs_audit` to `needs_recheck` if step 3 fails).
5. Rebuild view (`scripts/build_views.py`), Python tests, app tests; record counts here.

## TODO

- [x] Claim file
- [x] Round-2 audits (11 reports)
- [x] Serial corrections with dispositions
- [x] Fresh verification of applied numerical/blocking corrections
- [x] audit_status update, view rebuild, tests
- [x] Results and open items recorded here

## Progress log

- 2026-10-03: plan written; validator 0 errors before start.
- 2026-10-03: UI commit be87b87 pushed (dashboard bars sorted, mobile plot width). 11 fresh-context auditors launched in parallel (read-only): p1_02, p1_04, pilots+p2_01+han2023, p3_01-02, p3_03-04, p3_05-07, p3_08-10, p3_11-13, p3_14-15, p3_16-17, p3_18-19.
- 2026-10-03: p1_02 audit delivered (0 blocking, 1 numerical, 2 metadata, 6 minor; cache gap: tran2026, wang2018, weigel2018, he2019 have source.pdf but no text.md/figures). p1_02 corrector started. User cap: max 5 concurrent subagents (bandwidth). Stopped 6 recheck auditors (p3_05-07, p3_08-10, p3_11-13, p3_14-15, p3_16-17, p3_18-19) mid-run; queued to resume one at a time as slots free.
- 2026-10-03: p3_03-04 recheck delivered (0 blocking, 2 numerical, 3 metadata, 3 minor; disputes round-1 F25 lin2025a Vpi extrapolation). p1_02 corrections applied (11 dispositions: 8 applied, 2 adjusted, 1 rejected); coordinator git diff confirms only p1_02 rows changed; validator 0 errors. Follow-up outside claim: `sims/he2019/config.yaml` vpi_l_dc_vcm target locator -> "p.14, Supp. I; p.16, Supp. II".
- 2026-10-03: p1_04 audit delivered (0 blocking, 3 numerical, 3 metadata, 13 minor). Same cache gap as p1_02 (source.pdf only, no text.md/figures for 4 papers; auditors extracted into scratchpad). p3_08-10 report found complete although its agent was stopped (0 blocking, 1 numerical, 2 metadata, 4 minor). p3_03-04 corrector running; p3_11-13 auditor resumed.
- 2026-10-03: p3_01-02 recheck delivered: all 10 pass (0 blocking, 0 numerical, 1 metadata, 5 minor); all 21 round-1 dispositions confirmed in canonical. p3_14-15 auditor resumed. Correction queue: p1_04, p3_08-10, p3_01-02. Coordinator note for p3_01-02 corrector: R2-F7 (celik2022 note naming the repository owner as coauthor) is to be moved out of papers.csv into the audit record (privacy rule; disclosure stays in DevLog-014 and the audit reports).
- 2026-10-03: pilots+p2_01+han2023 recheck delivered: 1 blocking (ogiso2016-a eo_rolloff_db 2.7 from round-1 O2 vs about 2.0 dB in Fig. 4, pixel-measured), 1 metadata (han2023 arXiv identity normalization), 7 minor; kieninger2020 (21 rows) and wolf2018a pass clean; all p2_01 F1-F17 confirmed. Pilot sim-config notes S1-S5 remain open (outside claim). p3_16-17 auditor resumed. Correction queue: p1_04, p3_08-10, p3_01-02, pilots+p2_01+han2023.
- 2026-10-04: p3_14-15 recheck delivered: 0 blocking, 0 numerical, 3 metadata, 7 minor; 9 of 12 pass as is; no-device-row status of chen2024, sayem2026, huang2026a confirmed. Cross-batch decision surfaced: `year` follows journal year (hsu2024, hu2023) vs preprint year (shamsansari2021, shen2021, kawahara2025) for arXiv-sourced rows; joins the open `published_on`/`year` rule in DevLog-014. p3_18-19 auditor resumed (last queued auditor). Correction queue: p1_04, p3_08-10, p3_01-02, pilots+p2_01+han2023, p3_14-15.
- 2026-10-04: p3_03-04 corrections applied (7 applied, 1 partial; lin2025a-mzi Vpi 31 V cleared as batch extrapolation; mao2024-1550 bw basis measured -> derived; lin2026a power -1.5 -> -1.55 dBm; lin2026a companies += imec; li2020/shen2024 url -> arXiv). Coordinator diff check: only p1_02/p3_03/p3_04 rows changed; validator 0 errors. p1_04 corrector started.
- 2026-10-04: p3_16-17 recheck delivered: 0 blocking, 1 numerical (lotkov2024-a bw basis measured -> derived, fit-based), 1 metadata, 5 minor; 9 of 11 pass as is; all round-1 dispositions confirmed. Its reported validator error was a transient read during the p3_03-04 correction; re-run 0 errors. Verifier 1 (fresh context) started for p1_02 + p3_03-04 corrections. Correction queue: p3_08-10, p3_01-02, pilots+p2_01+han2023, p3_14-15, p3_16-17.
- 2026-10-04: p3_05-07 recheck delivered: 0 blocking, 1 numerical (zwickel2020 rf_loss read from model curve: gate0 17 -> about 21 dB/cm, gate300 59 -> about 63 from measured points), 3 metadata, 5 minor. Two round-1 dispositions contradicted by source: F7 (hu2026 wafer-map range 81.8-93.6 GHz; round-1 rejection wrong) and F19 (zwickel2020 Z0 note wording inverts the paper). lu2020 source.json redistribution value outside enum (references/ outside claim; listed for user). Correction queue: p3_08-10, p3_01-02, pilots+p2_01+han2023, p3_14-15, p3_16-17, p3_05-07. Corrections stay serial, so only 4 agents run while the corrector slot is busy.
- 2026-10-04: p3_18-19 recheck delivered: 0 blocking, 0 numerical, 0 metadata, 8 minor (basis labels, one qualifier, wording); round-1 dispositions confirmed except F13 residue (johnson2025 wavelength basis). Auditor reported one read-only `git log` call against its rules (no effect). Correction queue: p3_08-10, p3_01-02, pilots+p2_01+han2023, p3_14-15, p3_16-17, p3_05-07, p3_18-19.
- 2026-10-04: Verifier 1 (p1_02, p3_03, p3_04): 104 changed cells, 102 confirmed, 0 unrecorded changes; 2 not confirmed = he2019 bw3db_reference note wording ("a few GHz" -> "near 1 GHz"), coordinator re-read Fig. 3(b) and applied. These 15 papers now meet the `audited` rule (status update deferred to one final pass).
- 2026-10-04: p1_04 corrections applied (14 applied, 4 adjusted, 0 rejected; deferred F6 valdez2022 source.json version/license and F5 year). Numeric: valdez2022-a bw qualifier gt removed (110 GHz crossing); renaud2023-3um-738 z0 50 and rf_loss 7.99 cleared; meng2023-a ER 1.98 -> 5.34 (56 Gb/s OOK, Fig. 7a); valdez2023 published_on 2023-01-30 cleared; meng2023 license cleared. Coordinator diff check: only expected rows plus Sandia org note; validator 0 errors. Started p3_08-10 corrector and verifier 2 (p1_04). Sim follow-up outside claim: remove z0_ohm 50 target from sims/renaud2023/config.yaml.
- 2026-10-04: p3_11-13 recheck delivered: 0 blocking, 0 numerical, 3 metadata (empty `drive` with Vpi on gao2024/tan2024/wang2026b; nelan2022/nelan2022a push-pull convention; hou2024 vs gao2024 author-list source rule), 7 minor; no-device-row status of holzgrafe2020 and multani2025 confirmed. All 11 round-2 audit reports delivered. Totals: blocking 1, numerical 10, metadata 23, minor 70 (p1_02 0/1/2/6, p1_04 0/3/3/13, pilots+p2_01+han2023 1/0/1/7, p3_01-02 0/0/1/5, p3_03-04 0/2/3/3, p3_05-07 0/1/3/5, p3_08-10 0/1/2/4, p3_11-13 0/0/3/7, p3_14-15 0/0/3/7, p3_16-17 0/1/1/5, p3_18-19 0/0/0/8).
- 2026-10-04: p3_08-10 corrections applied (5 applied, 1 adjusted, 1 partly deferred; no numeric value changed; akazawa2026-a drive -> unspecified; ulrich2025-mzi vpil 1.04 kept with note that the measured-device arithmetic gives about 1.29 V cm; suceava2025 identity choice deferred to user). Diff scope and CRLF preserved; validator 0 errors. Started p3_01-02 corrector (celik2022 coauthor-disclosure sentence removed from papers.csv by coordinator decision, privacy rule) and verifier 3 (p3_08-10, with an explicit judgment request on ulrich2025 vpil).
- 2026-10-04: Verifier 2 (p1_04): 31 of 31 correction groups confirmed against the PDFs, 0 unrecorded changes, deferrals supported. p1_04 papers (5) meet the `audited` rule; with p1_02/p3_03/p3_04 that is 20 papers pending the final status pass. Count note: 80 arXiv-only rows use restricted_local_only, 2 use unknown.
- 2026-10-04: p3_01-02 corrections applied (6 applied; no numeric value changed; liu2023 published_on 2023-05-29 -> 2023-05-09 under "first public version" wording, revert if policy becomes version-of-record; VpiL evidence bases measured -> derived per convention (h); celik2022 coauthor-disclosure sentence removed). Diff scope checked; remaining name mentions are author lists only; validator 0 errors. Started pilots+p2_01+han2023 corrector and verifier 4 (p3_01-02).
- 2026-10-04: Verifier 3 (p3_08-10): 9 of 10 changed cells confirmed; ulrich2025 vpil 1.04 (author Eq. 22, derived) confirmed correct to keep. Coordinator applied akazawa2026 drive locator (p.4 Fig. 3) and shortened ulrich2025 note. PENDING coordinator edit once devices.csv is free: ulrich2025-mzi qualifiers += vpil_dc_vcm:approx (source "≈1.04 ± 0.08"). p3_08-10 papers (11) meet the `audited` rule after that edit.
- 2026-10-04: Verifier 4 (p3_01-02): 18 of 18 changed cells confirmed, 0 unrecorded changes; p3_01-02 papers (10) meet the `audited` rule. Verified so far: p1_02, p1_04, p3_01, p3_02, p3_03, p3_04 (30 papers) plus p3_08-10 (11, after the pending ulrich2025 qualifier).
- 2026-10-04: pilots+p2_01+han2023 corrections applied (3 applied, 3 adjusted, 2 deferred). Blocking fixed: ogiso2016-a eo_rolloff_db 2.7 -> 2.0 (approx; pixel measurement of Fig. 4 embedded image against tick positions gives -1.90 to -2.05 dB at 67 GHz). kohli2025-rt bw_measured_to_ghz 70 -> 75 (approx). Deferred: R2-F2 han2023 arXiv identity form (27 rows use the han2023 form, 2 use the kieninger/wolf form: database-wide choice for the user); R2-F6 chen2022 sim config notes (outside claim). Coordinator applied ulrich2025-mzi qualifiers += vpil_dc_vcm:approx (surgical line rewrite, validator 0 errors); p3_08-10 now meets the `audited` rule. Started p3_14-15 corrector and verifier 5 (pilots+p2_01+han2023, independent re-measurement of ogiso2016 Fig. 4).
- 2026-10-04: Verifier 5 (pilots+p2_01+han2023): all changes confirmed; ogiso2016-a 2.0 dB independently re-measured (-1.99 dB centre, -2.05 dB lowest pixel at 66.9 GHz); kohli2025-rt 75 GHz axis end confirmed from vector coordinates. One wrong sentence in the han2023 deferral reason corrected (15 papers carry `numbers_from_arxiv_v1`). These 6 papers meet the `audited` rule. Verified total: 47 papers.
- 2026-10-04: User request: creator footer added to the app layout (name, homepage outside5sigma.com, GitHub repo link) on every page; checked at 1440 px and 390 px.
- 2026-10-04: p3_14-15 corrections applied (5 applied, 2 adjusted, 1 rejected, deferred: year rule, round-1 F19 org names). shamsansari2021-a bw_measured_to_ghz 45 -> 50; hu2023 drive basis -> measured; new org National Information Optoelectronics Innovation Center. Diff scope checked; validator 0 errors. Started p3_16-17 corrector and verifier 6 (p3_14-15).
- 2026-10-04: Verifier 6 (p3_14-15): 23 of 23 changed cells confirmed, 0 unrecorded; rejection and deferrals supported. p3_14-15 papers (12) meet the `audited` rule; verified total 59. Optional wording items left as open minor notes: shamsansari2021-a note "below -3 dB beyond about 43 GHz" (verifier reads first dips near 39-40 GHz, approximate); BRNC org note names no paper.
- 2026-10-04: p3_16-17 corrections applied (3 applied, 2 adjusted, 1 deferred, 1 no-change). lotkov2024-a bw basis measured -> derived (fit); heidari2022-a extinction_ratio_db empty -> 13 (approx, static, Fig. 3a); luan2026-a vpi basis measured -> derived; tiberi2025 il_onchip_excludes filled. Deferred to user: a `soi_strip` waveguide_platform value for fully etched strips (tiberi2025, gui2022). Diff scope checked; validator 0 errors. Started p3_05-07 corrector and verifier 7 (p3_16-17).
- 2026-10-04: Verifier 7 (p3_16-17): 21 of 21 changed cells confirmed; heidari2022-a ER 13 independently read as about 12.9 dB. Coordinator applied lotkov2024 note wording after reading Fig. 4(d). p3_16-17 papers (11) meet the `audited` rule; verified total 70.
- 2026-10-04: p3_05-07 corrections applied (5 applied, 2 adjusted, 2 deferred: band edges need schema, published_on policy). zwickel2020 rf_loss read from measured points (alpha is amplitude coefficient, p.5; dB/cm = 86.86 x alpha[1/mm]): gate0 17 -> 22, gate300 59 -> 66 (approx); hu2026 wafer-map range 81.8-93.6 GHz (reverses round-1 F7); zwickel2020 Z0 note reworded to the paper's "rather insensitive to gate voltage"; li2025b electrode metal AuGe/Ni/Au. Diff scope checked; validator 0 errors. Started p3_18-19 corrector and verifier 8 (p3_05-07, independent re-read of zwickel2020 Fig. 4).
- 2026-10-04: p3_18-19 corrections applied (6 applied, 1 adjusted, 1 rejected: R2-F8 research_groups institute kept, column already holds institutes elsewhere). fukui2025-b wavelength 1547.4 -> 1550 (Table S1 numerical row, consistent with 0.24 dB, Q 930, 40 GHz); soma2025-b er_type static -> unspecified; witmer2020 tuning approx removed. Diff scope checked; validator 0 errors. Started last corrector (p3_11-13) and verifier 9 (p3_18-19).
- 2026-10-04: Verifier 8 (p3_05-07): 15 of 16 confirmed; zwickel2020 rf_loss 22/66 dB/cm independently confirmed (ranges 19-26 / 56-73); hu2026 93.6 GHz die confirmed. Coordinator fixed the zwickel2020-gate300 z0 evidence note after checking the Fig. 3 caption. p3_05-07 papers (10) meet the `audited` rule; verified total 80.
- 2026-10-04: Verifier 9 (p3_18-19): 17 of 17 confirmed; fukui2025-b row now from one Table S1 operating point. p3_18-19 papers (8) meet the `audited` rule; verified total 88. PENDING coordinator edit (devices.csv busy): fukui2025-b band other -> c_band (1550 nm). Advisory for the user: er_type convention for passive resonance-dip depth (kari2025-a/-b and tan2024-a use static, soma2025-b now unspecified; schema does not define er_type).
- 2026-10-04: p3_11-13 corrections applied (8 applied, 1 adjusted, 1 deferred: R2-F9 author-list rule). drive = unspecified on gao2024-a, tan2024-a, wang2026b-am/-pm; nelan2022-a/nelan2022a-a push_pull/mzm_push_pull (derived); hou2024-a wavelength 1561.36 (approx, Fig. 4c); kari2025-a bw basis -> measured with instrument contradiction kept in notes; tan2024-a electrode thickness 0.7 um. Sim follow-up outside claim: sims/nelan2022/config.yaml lines 8, 69, 70 convention wording. Coordinator applied fukui2025-b band other -> c_band. Diff scope checked; validator 0 errors. Final verifier 10 (p3_11-13) started; all correction runs complete.
- 2026-10-04: Verifier 10 (p3_11-13): 20 of 20 confirmed. All 10 verification reports delivered. 104 papers promoted to `audited` (94 needs_recheck + 10 needs_audit); `audited` definition text in schema, About and column tooltip changed from "accepted before integration" to "accepted (before integration or independently verified)". Checks: validator 0 errors; build_views 117 papers / 277 devices / 186 orgs / 0 warnings; 28 Python tests; 26 app tests; svelte-check 0 errors; browser smoke 15/15 PASS.

## Results

| Stage | Reports | Outcome |
|---|---|---|
| Round-2 audits | 11 (`data/_staging/audits/*-r2-claude-audit-2026-10-03.md`) | blocking 1, numerical 10, metadata 23, minor 70; no paper failed |
| Corrections | `AUDIT_DISPOSITIONS_R2.md` in each batch dir with findings | serial, one writer at a time; coordinator `git diff` row-scope check after each |
| Verification | 10 (`*-r2-verify-claude-audit-2026-10-04.md`) | every changed value/basis/qualifier re-checked against the source; 5 wording-level items not confirmed, all fixed by the coordinator after re-reading the source |

Final `audit_status`: audited 117 / needs_recheck 0 / needs_audit 0.

Notable value changes (all independently re-measured or re-read):
- ogiso2016-a eo_rolloff_db 2.7 -> 2.0 dB (approx; round-1 figure reading was wrong; blocking)
- zwickel2020 rf_loss_db_per_cm 17 -> 22 and 59 -> 66 (measured points instead of model curve; alpha is amplitude, 86.86 dB/cm per 1/mm)
- lin2025a-mzi vpi_dc_v 31 V cleared (batch extrapolation beyond measured range)
- renaud2023-3um-738 z0_ohm 50 (design target) and rf_loss 7.99 (distiller arithmetic) cleared
- meng2023-a extinction_ratio_db 1.98 -> 5.34 (56 Gb/s OOK, consistent with sibling rows)
- valdez2022-a bandwidth bound `gt` removed (110 GHz crossing)
- shamsansari2021-a bw_measured_to_ghz 45 -> 50; kohli2025-rt 70 -> 75 (approx)
- heidari2022-a extinction_ratio_db 13 (approx, static, Fig. 3a) newly entered
- several basis relabels (measured -> derived for fit-based bandwidths and resonance-shift Vpi; VpiL computed by authors -> derived per convention h)

## Open items

> 2026-10-05: decisions 1-6 below were resolved in [DevLog-020](DevLog-020-data-convention-decisions.md) (earliest year/published_on, Crossref author lists, DOI-first identity, arXiv licence from the OAI record with no unknown, soi_strip / ITU-T bands / resonance_dip, suceava2025 journal identity), and the valdez2022 / lu2020 source.json items were corrected. Still open: the sim-config follow-ups (engine owner) and the 23 missing local extracts.

Decisions for the user (cells left unchanged, deferrals recorded in the disposition files):
1. `year` / `published_on` rule for arXiv-sourced rows (journal vs preprint year; first public version vs version of record). liu2023 published_on was set to the accepted-preview date under the current wording.
2. Author-list source: Crossref vs cached version (gao2024 vs hou2024).
3. arXiv identity form in papers.csv (27 rows "arXiv; associated journal" + versioned id vs bare id + abs URL; `numbers_from_arxiv_v1` tag on 15 papers).
4. Redistribution for unverified-license arXiv rows: restricted_local_only (80 rows) vs unknown (2 rows).
5. Schema vocabulary: `soi_strip` waveguide_platform (tiberi2025, gui2022); `band` wavelength edges (steckler2025, gupta2023-e at 1570-1580 nm marked c_band); `er_type` for passive resonance-dip depth (kari2025, tan2024 static vs soma2025-b unspecified).
6. suceava2025 identity: journal (typeset file cached) vs arXiv.

Follow-ups outside this claim:
- `sims/renaud2023/config.yaml`: remove z0_ohm 50 target (cell cleared as design target).
- `sims/he2019/config.yaml`: vpi_l_dc_vcm target locator -> "p.14, Supp. I; p.16, Supp. II".
- `sims/nelan2022/config.yaml` lines 8, 69, 70: convention now mzm_push_pull (derived).
- `sims/chen2022/config.yaml`: S2/S3/S5 notes; 35 um undercut is the design optimum.
- `references/valdez2022/source.json` describes the journal version while the cached PDF is arXiv v1; `references/lu2020/source.json` redistribution value outside enum.
- 23 papers in papers.csv have references/<id>/source.pdf without text.md/figures (chen2022, deng2026, he2019, kharel2021, kieninger2020, kohli2025, li2026, li2026ba, lin2025, liu2021, meng2023, niels2026, ogiso2016, ogiso2024, porto2026, renaud2023, tanaka2026, tran2026, valdez2022, valdez2023, wang2018, weigel2018, wolf2018a; likely ignored local extracts lost in the cache migration); auditors extracted into scratch. Running `scripts/extract_source.py` would make future audits reproducible.
- Credibility caveat kept in notes, not encoded: kari2025-a 29 GHz measured bandwidth vs 7.5 GHz VNA / 12 GHz PD listed in Methods.

