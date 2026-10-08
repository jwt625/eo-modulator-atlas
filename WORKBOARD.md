# Workboard

Updated 2026-10-07 (claude-continuation-2026-10-07, coordinator). Detailed history:
[DevLog-002](DevLog/DevLog-002-work-plan-and-ownership.md) (original plan) and the DevLogs linked per row.

Canonical snapshot (2026-10-08, working tree after DevLog-022): 233 papers / 519 device rows / 284
organizations / 1509 people / 2880 affiliation rows / 310 sites, every paper `audited`. Public cache policy: metadata tracked; PDFs, text and figures local
and ignored except open copies already tracked; subscription copies with institutional stamps local-only
(DevLog-021).

User decisions 2026-10-07 ([DevLog-022](DevLog/DevLog-022-continuation-2026-10-07.md)): every tranche
that was `ready_for_review` is accepted as `complete`; codex-main is inactive; a claim not done or
updated for more than 2 days (git history) may be taken over.

## Active

| ID | Tranche | State | Owner | Dependency / handoff |
|---|---|---|---|---|
| CONT | Continuation 2026-10-07: bookkeeping, p8 ingestion (25 papers), affiliations and sites for 96 papers, arXiv/Crossref metadata, data rulings, final audit | ready_for_review | claude-continuation-2026-10-07 | DevLog-022 |
| E2i.2 / E3i | EO arm/voltage and RF loss/sweep runner contracts, Wheeler conductor loss (taken over from codex-main) | ready_for_review | claude-continuation-2026-10-07 | DevLog-012; Q2 audit and corrections done (DevLog/audits/e2i2-e3i-u3-q2-*) |
| U3 | Stage selection and diagnostics in CLI/browser | ready_for_review | claude-continuation-2026-10-07 | DevLog-012 item 3; covered by the same Q2 audit |
| E1c | Paper sim configs: arm windows, target vpi_convention, sourced loss declarations | waiting | unassigned | DevLog-012 proposed config changes; needed before eo_overlap/rf_line run on papers |
| E4 | Periodic loaded line and traveling-wave EO response | waiting | unassigned | E2i.2 + E3i; loading/reference-plane contract |
| E5 | Paper regressions and convergence studies | waiting | unassigned | E2-E4 + material constants from primary sources |
| R1 | Release integration, second audit, public packaging | waiting | unassigned | Open user decision: stamped PDFs in git history (DevLog-021/022) |

## Complete (accepted 2026-10-07 unless dated otherwise)

| ID | Tranche | Owner | Record |
|---|---|---|---|
| C0 | Work plan, claims, current-state record | codex-main | DevLog-002 |
| R0 | Standalone checkout and local cache migration | codex-main | DevLog-006 |
| D0 | Ingestion tooling and policy alignment | claude-data-lane | DevLog-004 |
| D1.01-D1.11 | Priority-1 batches p1_01..p1_11 (paused 2026-10-01, finished as p4_01..p4_05) | claude-data-lane, claude-ingest-2026-10-04 | DevLog-004, DevLog-016 |
| D1.12 | Priority-2 batch p2_01 | codex-main | DevLog-011 |
| D1.13 | p2_02 high-k SOH / slow-light silicon (han2023 re-distilled from the VOR in p6_03) | claude-wave-2026-10-02 | DevLog-010, DevLog-021 |
| D1.14 | p2_03 silicon resonator / SOH IQ proposal | none | superseded by the p3 collection pass (DevLog-014) |
| C1 | Continued literature collection (2026-10-02 pass 2) | claude-ingest-2026-10-02 | DevLog-014 |
| D1.15-D1.33 | Staged batches p3_01..p3_19 | claude-ingest-2026-10-02 | DevLog-014, DevLog-015 |
| D1.34-D1.38 | Paused priority-1 papers as p4_01..p4_05 | claude-ingest-2026-10-04 | DevLog-016 |
| OFC | 46 OFC 2026 papers p5_01..p5_09 (completed 2026-10-04) | claude-ofc-2026-10-04 | DevLog-019 |
| D2 | Canonical integration and view refresh | coordinators | superseded by per-wave merges (DevLog-014..021) |
| Q1, Q1-p2_01, Q1-p2_02, Q1-r2 | Independent evidence audits, round 2 (all papers audited) | claude-data-lane, claude-wave-2026-10-02, claude-audit-2026-10-03 | DevLog-004, 010, 011, 015 |
| E1 | Cross-section runner, config boundary, analytic baseline | codex-main | DevLog-003 |
| E2 | Optical model limits, EO tensor overlap, voltage conventions | claude-wave-2026-10-02 | DevLog-007 |
| E2i.1 | Shared optical policy and diagnostic integration | codex-main | DevLog-011 |
| E3 | Uniform RF line, conductor/dielectric loss | claude-wave-2026-10-02 | DevLog-008 |
| Q2-E2/E3 | Independent numerical module audit (scalar/rotation limits recorded) | claude-wave-2026-10-02 | DevLog/audits |
| U1 | Browser cross-section simulator | codex-main | DevLog-003 |
| U2a | Comparison correctness: bounds, plot validity, export context | codex-main | DevLog-005 |
| U2b | Representative/filter/navigation and usability audit | claude-wave-2026-10-02 | DevLog-009 |
| U2c | Statistical loss-sample comparison guards | codex-main | DevLog-011 |
| GEO | Per-author affiliations, geocoded sites, clustered map | claude-geo-2026-10-04 | DevLog-017, DevLog-018 |
| CONV | Data-convention decisions 2026-10-05 | claude-conventions-2026-10-05 | DevLog-020 |
| INBOX-1005 | User-retrieved papers 2026-10-05 (p6, p7) | claude-inbox-2026-10-05 | DevLog-021 |

Q2 (independent numerical review of E1) was not run separately; E1 is accepted by the user, and the
engine audit after E2i.2/E3i covers the shared runner.

## Claim protocol

1. Read this board, the detailed plan, and every active file under
   `coordination/claims/`. Existing active claims take precedence over a stale
   board row or an older DevLog TODO. A claim not done or updated for more than
   2 days (git history) may be taken over; record the takeover in both claims.
2. Claim an unassigned task in `coordination/claims/<agent-id>.md`, using the
   template in the plan. Name exact write paths and exclusions; announce the
   claim to the coordinating conversation. This is task coordination, not a
   request for new user authorization.
3. Work only within those paths. If another active claim overlaps, resolve the
   ownership conflict before editing the contested files. Do not quietly expand
   scope into shared files.
4. Keep your claim and handoff report current. The coordinator updates this
   board; avoid simultaneous whole-file rewrites by multiple agents.
5. Report `ready_for_review` before `complete`. Completion requires the stated
   acceptance checks and review, not just files on disk or a zero CLI exit code.
