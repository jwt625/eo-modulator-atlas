---
title: Ingest the 21 cached papers from the paused priority-1 batches (p4_01..p4_05)
date: 2026-10-04
status: ready_for_review
owner: claude-ingest-2026-10-04
tasks: [D1.34-D1.38]
---

# DevLog-016: ingest paused priority-1 papers

User request (2026-10-04): ingest the cached papers still waiting (Sonnet subagents),
review/audit with Opus subagents, then commit and push. Max 5 concurrent subagents.
Claim: `coordination/claims/claude-ingest-2026-10-04.md`.

## Scope

21 papers whose PDFs are cached but which were never distilled. 20 sat in the priority-1
batches p1_05..p1_11 paused on 2026-10-01; arabjuneghani2022 was `needs_download` in p1_03
and is cached now. New batch files (rows copied from the p1 batch CSVs, unchanged):

| Batch | Papers | Theme |
|---|---|---|
| p4_01 | arabjuneghani2022, valdez2023a, liu2025, liu2025b | TFLN / hybrid LN MZM |
| p4_02 | li2025a, didier2026, lee2026, li2026aa | slow-light and mid-IR TFLN |
| p4_03 | rahman2025, powell2024, zheng2026, cai2025, sayem2026c | hybrid LN/LT, transfer printing, 1 um |
| p4_04 | wang2024a, wang2024b, wang2025 | thin-film lithium tantalate |
| p4_05 | derose2012, dong2026, liu2026b, wang2026a, yue2025 | silicon MZM |

The 25 papers deliberately skipped in DevLog-014 stay out of scope.

## Plan

1. Regenerate local `text.md` and `figures/` from cached `source.pdf` (git-ignored extracts were
   not migrated); restore tracked `source.json` afterwards.
2. Distill (Sonnet, one subagent per batch, staging only, `merge_staging.py` dry run clean).
3. Independent audit (Opus, fresh context, read-only, one report per batch).
4. Corrections (Sonnet, the batch's distiller role, staging only, `AUDIT_DISPOSITIONS.md`).
5. Verification of applied numerical/blocking corrections (Opus, fresh context).
6. Serial `merge_staging.py --apply` with `audit_status: audited` for papers that pass steps 3-5;
   `build_views.py`, Python tests, app tests, smoke; commit and push.

## TODO

- [x] Local extracts regenerated (21/21; sha256 and page counts match tracked source.json)
- [x] Batch CSVs p4_01..p4_05
- [x] Distillation (5 batches)
- [x] Independent audits
- [x] Corrections
- [x] Verification
- [x] Merge, view rebuild, tests, commit, push

## Progress log

- 2026-10-04: extracts regenerated (log `logs/extract-p4-*.log`); tracked source.json files restored unchanged.
- 2026-10-04: 5 Sonnet distillers launched (one per batch). p4_05 distilled: 5 papers, 9 device rows, 1 new org (Coherent Corp.), dry run 0 conflicts / 0 errors; all repro C, no sim configs. Opus audit of p4_05 started.
- 2026-10-04: p4_03 distilled: 5 papers, 16 device rows, 1 new org (SIMIT, CAS), sim configs sims/cai2025 and sims/sayem2026c (grade B, not runnable: no RF permittivities stated); dry run clean. Opus audit of p4_03 started.
- 2026-10-04: p4_04 distilled: 3 papers, 5 device rows, sims/wang2024a and sims/wang2025 (grade B; LT constants from wang2024b Extended Data Table 1; wang2025 rotated cut not expressible, SPEC_PROPOSALS.md). p4_03 and p4_04 both add the SIMIT org row: check identity at merge. Opus audit of p4_04 started.
- 2026-10-04: p4_02 distilled: 4 papers, 20 device rows, 13 new orgs, sims/li2026aa (grade B); SPEC proposal `lnos_rib` waveguide_platform (didier2026 LN on sapphire, entered as other). Opus audit of p4_02 started.
- 2026-10-04: p4_01 distilled: 4 papers, 8 device rows, 1 new org (University of Central Florida), sims/arabjuneghani2022, sims/valdez2023a, sims/liu2025b (grade B, placeholder constants flagged). Distillation complete: 21 papers, 58 device rows. Opus audit of p4_01 started (5 audits running).
- 2026-10-04: p4_05 audit (Opus): 0 blocking, 0 numerical, 1 metadata (derose2012 drive -> series_push_pull), 9 minor; all 5 pass or pass after corrections. Sonnet corrector started (staging dirs are per batch, so corrections run in parallel).
- 2026-10-04: p4_03 audit (Opus): 0 blocking, 1 numerical (zheng2026-al1000 >70 GHz labelled measured while the trace dips below -3 dB near 42 GHz), 3 metadata (powell2024/sayem2026c push-pull convention; powell2024 identity: cached arXiv is the APL Photonics manuscript, row points at CLEO record), 6 minor. Sonnet corrector started.
- 2026-10-04: p4_05 corrections (Sonnet): 9 applied, 1 adjusted; new rows yue2025-c (81.9 GHz, 0 V, m=1) and yue2025-d (43.1 GHz, 0 V, m=0) from p.13; derose2012 drive series_push_pull; 11 device rows; dry run clean. Opus verifier started.
- 2026-10-04: p4_03 corrections (Sonnet): 9 applied, 2 adjusted; zheng2026-al1000 bw basis -> author_estimate, measured-to 67; powell2024/sayem2026c push_pull (derived); cai2025 config r33 removed (secondary citation). Deferred: powell2024 DOI/venue/year/licence to the APL Photonics record (needs a Crossref prefetch). Opus verifier started.
- 2026-10-04: p4_04 audit (Opus): 0 blocking, 1 numerical (wang2024a 110 GHz: measured trace first below -3 dB near 90 GHz; 110 matches the simulated-curve crossing), 2 metadata (wang2025 early-access version; wang2024a cached source.json/text.md header licence CC-BY-4.0 vs Optica OA v2: references/ follow-up), 6 minor; LT constants and SPEC proposal confirmed. SIMIT org staged identically in name by p4_03 and p4_04 (not in canonical or p3_06): dedupe at merge. Sonnet corrector started.
- 2026-10-04: p4_02 audit (Opus): 1 blocking (lee2026-a bw 50 GHz is labelled "Extrapolated" in Table 1; measured EO points only to about 35 GHz), 3 numerical (lee2026-a 2.7 dB roll-off at 40 GHz not measured; didier2026 missing 18.4 V cm and 31.4 V cm device rows; li2025a 6 dB/cm is slow-light excess loss), 1 metadata, 6 minor; 13 new orgs confirmed, no near-duplicates. Sonnet corrector started.
- 2026-10-04: p4_05 verified (Opus): 17 of 17 corrections confirmed incl. new 0 V rows; coordinator applied N1 locator and N2 wording. p4_05 ready to merge as audited.
- 2026-10-04: p4_01 audit (Opus): 1 blocking (arabjuneghani2022-b bw 170 GHz model extrapolation; measured trace ends at 100 GHz near -1.3 dB), 2 numerical (liu2025 predicted 220/218 GHz in bw cell where Table II states >110; valdez2023a-b `gt` contradicted by points below -3 dB near 95-103 GHz), 1 metadata (liu2025 DOI is an issue-cover record), 7 minor. All 5 audits delivered: blocking 2, numerical 7, metadata 8, minor 34. Sonnet corrector started.
- 2026-10-04: p4_04 corrections (Sonnet): 8 applied, 5 adjusted, 1 rejected, 2 deferred (F9a wang2024a cached source.json licence, references/ follow-up; F9b SIMIT dedupe at merge). No CSV value changed; bandwidth trace behaviour recorded in notes; wang2025 sim RF-loss target (project arithmetic) removed. Opus verifier started.
- 2026-10-04: p4_02 corrections (Sonnet): 7 applied, 2 adjusted, 2 rejected. Blocking fixed: lee2026-a bw 50 -> 40 gt (author_estimate, measured to 35), extrapolated 50 in notes; roll-off cells cleared; li2025a excess loss cleared; new rows didier2026-g (18.4 V cm, G 10 um) and -h (31.4 V cm, G 13.2 um); 22 device rows. Opus verifier started.
- 2026-10-04: p4_03 verified (Opus): 14 of 15 confirmed; coordinator re-read sayem2026c Fig. 3(d) (peak about 11 GHz) and applied F6/N1/N2 note fixes; dry run clean. p4_03 ready to merge as audited.
- 2026-10-04: p4_03 note fixes re-applied line-scoped after a first script stopped on an assertion (it wrote nothing) and a second introduced an unquoted comma (caught by the dry run, repaired via csv writer); dry run clean.
- 2026-10-04: p4_01 corrections (Sonnet): 9 applied, 2 adjusted. Blocking fixed: arabjuneghani2022-b bw 170 -> 100 gt measured (extrapolation in notes); liu2025-a/-b 220/218 -> 110 gt measured; valdez2023a-b gt -> approx; liu2025 issue-cover DOI cleared (article DOI needs Crossref fetch); sims/arabjuneghani2022 target cites the paper as predicted. Corrector reported and removed stray copies it had made in the system temp directory (confirmed none left). Opus verifier started. All corrections complete.
- 2026-10-04: p4_02 verified (Opus): 14 of 14 confirmed; coordinator applied N2/N4 note fixes after checking the text; dry run clean. p4_02 ready to merge as audited.
- 2026-10-04: p4_04 verified (Opus): 21 of 21 confirmed. Coordinator applied N1 (wang2024b-a 41 approx -> 40 gt measured per convention c; the auditor had preferred 41 approx, the verifier 40 gt; schema text decides) and N2 locator. Dry run clean. p4_04 ready to merge. Verifier reported a scratch script briefly copied into engine/ and removed (git status clean).
- 2026-10-04: p4_01 verified (Opus): 11 of 11 confirmed; coordinator applied N1 roll-off notes. All five batches set to audited and merged in one serial `merge_staging.py --apply` (order p4_01..p4_05; duplicate SIMIT org row deduplicated, p4_03 copy kept). Checks: validator 0 errors; build_views 138 papers / 339 devices / 202 orgs / 0 warnings; 28 Python tests; 26 app tests; svelte-check 0 errors; build; smoke 15/15.

## Results

| Batch | Papers | Device rows | Audit (blocking/numerical/metadata/minor) | Verification |
|---|---|---|---|---|
| p4_01 | 4 | 8 | 1/2/1/7 | 11/11 confirmed |
| p4_02 | 4 | 22 | 1/3/1/6 | 14/14 confirmed |
| p4_03 | 5 | 16 | 0/1/3/6 | 14/15 confirmed, 1 note fixed by coordinator |
| p4_04 | 3 | 5 | 0/1/2/6 | 21/21 confirmed |
| p4_05 | 5 | 11 | 0/0/1/9 | 17/17 confirmed |

Canonical after merge: 138 papers (all `audited`), 339 device rows, 202 organizations. New sim configs: arabjuneghani2022, valdez2023a, liu2025b, li2026aa, cai2025, sayem2026c, wang2024a, wang2025 (material constants placeholders or flagged; cai2025 and sayem2026c not runnable without RF permittivities).

Both blocking findings were extrapolated bandwidths stored as measured: arabjuneghani2022-b 170 GHz (now 100 gt, measurement limit) and lee2026-a 50 GHz (now 40 gt, author_estimate, measured to 35). liu2025 220/218 GHz predictions were also replaced by the paper's ">110" bound.

## Open items

> 2026-10-05: lnos_rib adopted (didier2026); liu2025 Crossref record still not adopted (title differs); powell2024 year 2024 / published_on 2025-05-01 under the earliest rule; wang2024a licence from the arXiv OAI record; see [DevLog-020](DevLog-020-data-convention-decisions.md). Rotated-cut sim support stays with the engine owner.

- Network follow-ups (no requests were made): liu2025 article Crossref record (cached record is the issue cover; DOI cleared); powell2024 APL Photonics 10(9) 2025 record (row still points at the CLEO 2024 abstract DOI); wang2024a cached source.json/text.md header licence (CC-BY-4.0 from a batch hint vs Optica OA License v2).
- Schema proposals: `lnos_rib` waveguide_platform (didier2026 LN on sapphire, entered as other); rotated-cut support in the sim contract (wang2025).
- The DevLog-015 user decisions still apply to these rows (year/published_on, arXiv identity form, licence default).

