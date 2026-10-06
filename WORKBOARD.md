# Workboard

Updated 2026-10-02. Detailed scope, dependencies and acceptance checks:
[DevLog-002](DevLog/DevLog-002-work-plan-and-ownership.md).

Development continues in standalone `jwt625/eo-modulator-atlas`.
[DevLog-006](DevLog/DevLog-006-standalone-continuation.md) records cache migration
and the next ingestion tranche. Public cache policy: metadata tracked;
PDFs/text/figures local and ignored.

**Current claims:** `codex-main` holds coordination, D1.12 audit corrections,
U2c sample-comparison guards and E2i.1 optical runner integration. The new
`claude-wave-2026-10-02` handoff delivered E2/E3/U2b, p2_02 and independent
audits, then released implementation paths. See
[DevLog-011](DevLog/DevLog-011-audit-corrections-and-integration.md).
These three follow-ups are now `ready_for_review`; no canonical merge occurred.
`claude-data-lane` owns D0,
D1.01–D1.11, D2 and Q1. Progress: [E1/U1](DevLog/DevLog-003-cross-section-progress.md)
and [data lane](DevLog/DevLog-004-data-lane-progress.md). Current canonical snapshot
(2026-10-03, user-directed integration of every staged batch): 117 papers / 277 device
rows / 185 organizations; generated view matches. Each paper carries an `audit_status`;
after audit round 2 (2026-10-04) all 117 are `audited`; see DevLog-015. The 21 paused
priority-1 papers were then ingested and audited (p4_01..p4_05): 138 papers / 339 device rows,
all `audited`; see DevLog-016.
Other tranches remain unassigned. No implicit delegation.

| ID | Tranche | State | Owner | Dependency / handoff |
|---|---|---|---|---|
| C0 | Work plan, claims, current-state record | complete | codex-main | This board + detailed plan + claim file |
| R0 | Standalone checkout and local cache migration | complete | codex-main | 726 artifacts including 39 PDFs hash-verified and ignored; environment checks pass |
| D1.12 | Priority-2 batch p2_01 (Kieninger 2020, Wolf 2018a) | ready for reviewer recheck | codex-main | F1–F17 dispositions recorded; 157 entries + 3 conversions; joint dry-run clean |
| C1 | Continued literature collection (2026-10-02 pass 2) | ready_for_review | claude-ingest-2026-10-02 | 118 caches, 235 new candidates, 195 open requests; DevLog-014 |
| D1.15-D1.33 | Staged batches p3_01..p3_19 plus han2023 addendum | ready_for_review | claude-ingest-2026-10-02 | 88 papers / 192 device rows staged, 7 independent audits (180 findings, all dispositioned); merged into canonical 2026-10-03 with audit_status needs_recheck; DevLog-014 |
| D1.13 | p2_02 high-k SOH / slow-light silicon | ready_for_review; Han PDF pending | claude-wave-2026-10-02, files released | Ummethala staged and Q1 accepted after corrections; DevLog-010 |
| D1.14 | p2_03 silicon resonator / SOH IQ proposal | proposed, unclaimed | unassigned | Candidate pairing in DevLog-006; claim paths before prefetch |
| D0 | Ingestion tooling and policy alignment | implementation reported complete | claude-data-lane | DevLog-004 records lock/breaker tests; single prefetch owner retained |
| D1.01–D1.11 | Priority-1 paper batches, one claim per batch | paused by user 2026-10-01 ~20:50; p1_01/03/09 integrated; p1_02/04 distilled, unaudited; p1_05..08/10/11 prefetched | claude-data-lane | See DevLog-004 TODO; max 3 concurrent; Q1 corrections before D2 |
| D2 | Canonical data integration and view refresh | paused; canonical = 15 papers / 28 devices / 27 orgs | claude-data-lane | Serial merges; p1_02 and p1_04 await Q1 |
| E1 | Cross-section runner, config boundary, analytic baseline | ready_for_review | codex-main | Author gates pass; Q2 independent audit pending; DevLog-003 handoff |
| E2 | Optical model limits, EO tensor overlap and voltage conventions | ready_for_review | claude-wave-2026-10-02, files released | DevLog-007; audited corrections present; scalar/rotation limits open |
| E2i.1 | Shared optical policy and diagnostic integration | ready_for_review | codex-main | YAML/schema/runner/browser agree; 4 new runner tests; root/base-path smoke pass |
| E2i.2 / E3i | EO arm/voltage and RF loss/sweep runner contracts | in_progress | codex-main | DevLog-012: explicit inputs, runner/CLI/browser integration and target gates |
| E3 | Uniform RF line, conductor/dielectric loss | ready_for_review | claude-wave-2026-10-02, files released | DevLog-008; module audited, shared runner wiring remains |
| E4 | Periodic loaded line and traveling-wave EO response | waiting | unassigned | E2 + E3; loading/reference-plane contract |
| E5 | Paper regressions and convergence studies | waiting | unassigned | E2–E4 + reviewed paper inputs |
| U1 | Browser cross-section simulator and current app baseline | ready_for_review | codex-main | Root/base-path Chrome and narrow viewport pass; incomplete drafts preview safely |
| U2a | Comparison correctness: bounds, plot validity, export context | ready_for_review | codex-main | 15 unit tests/type check, root/base-path smoke pass; DevLog-005 handoff |
| U2b | Representative/filter/navigation and usability audit | ready_for_review | claude-wave-2026-10-02, files released | DevLog-009; 23 app tests; D2 ranking contract follow-ups remain |
| U2c | Statistical loss-sample comparison guards | ready_for_review | codex-main | 26 app tests and both browser paths pass; Python guard parity required before D2 merges samples |
| U3 | Full-chain results and reproduction scorecard | waiting | unassigned | U1 files released; still needs E4/E5 contract |
| Q1 | Independent pilot/batch evidence audit | claimed (fresh-context auditors, read-only) | claude-data-lane | Read-only inputs; write audit report only |
| Q1-p2_01 | Independent D1.12 evidence audit | delivered: accept after corrections | claude-wave-2026-10-02 | Author corrections/dispositions applied; reviewer recheck remains |
| Q1-p2_02 | Independent D1.13 evidence audit | accepted after corrections | claude-wave-2026-10-02 | Second pass recorded; D2 canonical merge remains |
| Q2-E2/E3 | Independent numerical module audit | corrections applied; limits open | claude-wave-2026-10-02 | DevLog/audits report; does not replace E1 independent audit |
| Q2 | Independent numerical review | review ready; final gate waits | unassigned | E1 diff; later E2–E5; separate audit files |
| Q1-r2 | Round-2 recheck of 94 papers, first audit of p1_02/p1_04, serial corrections, fresh verification | ready_for_review | claude-audit-2026-10-03 | 11 audits, 10 verifications; 117/117 audited; user decisions listed in DevLog-015 |
| D1.34-D1.38 | Ingest paused priority-1 papers as p4_01..p4_05 (Sonnet distill/correct, Opus audit/verify) | ready_for_review | claude-ingest-2026-10-04 | 21 papers, 62 rows merged as audited; DevLog-016 |
| GEO | Per-author affiliations, geocoded institution sites, clustered map | ready_for_review | claude-geo-2026-10-04 | 1723 affiliation rows, 212 sites; DevLog-018 |
| CONV | User data-convention decisions 2026-10-05 (identity, dates, Crossref authors, people dedup, licences, bands, 1 GHz Vpi, org names, schema proposals W2, Phase B re-read of 405 rows) | ready_for_review | claude-conventions-2026-10-05 | DevLog-020; verified per group by fresh Opus agents; final audit in data/_staging/conventions_2026_10_05/AUDIT_final.md |
| INBOX-1005 | Ingest user-retrieved papers 2026-10-05 (12 new, 2 first sources, han2023/li2022b VOR re-distill, lu2020 SI + correction) as p6_01..p6_05, plus a second wave p7_01..p7_04 (13 new, chelladurai2025 SI) | ready_for_review | claude-inbox-2026-10-05 | DevLog-021; 208 papers / 479 device rows, all audited |
| R1 | Release integration, second audit, public packaging | waiting | unassigned | Accepted D/E/U tranches; rights policy review |

## Claim protocol

1. Read this board, the detailed plan, and every active file under
   `coordination/claims/`. Existing active claims take precedence over a stale
   board row or an older DevLog TODO.
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

No agents have been spawned by this continuation. The user may assign the
unclaimed tranches to other conversations without overlapping this claim.
The [E1/U1 follow-up register](DevLog/DevLog-003-cross-section-progress.md#cross-agent-review-and-follow-up)
records outstanding p1_09 provenance corrections and batch interface proposals.
