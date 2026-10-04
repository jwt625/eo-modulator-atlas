# Claim: claude-ingest-2026-10-04

- Agent: Claude Code session (coordinator); Sonnet subagents distill and correct, Opus subagents audit and verify
- Task IDs: D1.34-D1.38 (batches p4_01..p4_05)
- Status: ready_for_review (2026-10-04); 21 papers merged as audited; open items in DevLog-016. Claimed 2026-10-04 on direct user instruction ("go on ingest them")
- Plan and progress: `DevLog/DevLog-016-ingest-paused-priority-1.md`

The 21 papers come from the paused data-lane batches p1_03 and p1_05..p1_11 (paused by the user
on 2026-10-01); the user directed this ingestion. The paused lane's `data/_staging/p1_*` directories
are not edited.

## Owned write paths

- `data/_staging/batches/p4_01.csv` .. `p4_05.csv`, `data/_staging/p4_01/` .. `p4_05/`
- `sims/<paper_id>/` for papers in these batches (dielectric traveling-wave grade A/B only)
- `data/_staging/audits/p4_*-claude-audit-2026-10-04.md`
- local git-ignored extracts `references/<paper_id>/text.md`, `figures/` for these papers
- canonical `data/*.csv`, `data/evidence/` via `scripts/merge_staging.py --apply` only; `app/static/data/atlas.json` via `scripts/build_views.py`
- `DevLog/DevLog-016-*`, this file, WORKBOARD.md rows for these tasks

## Boundaries

- No network requests. No edits to `data/schema/`, `engine/`, `app/src/`, `sims/SPEC.md`, other batches or earlier audits.
- At most 5 subagents at once.
