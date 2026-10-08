# Claim: claude-conventions-2026-10-05

- Agent: Claude Code session (coordinator); subagents read-only except their own staging outputs
- Task: apply the user's 2026-10-05 decisions on data conventions (DevLog-020)
- Status: complete (accepted by the user 2026-10-07); was ready_for_review 2026-10-05
- Plan and progress: `DevLog/DevLog-020-data-convention-decisions.md`

## Owned write paths

- `data/papers.csv`, `data/devices.csv`, `data/organizations.csv`, `data/author_affiliations.csv`,
  `data/org_sites.csv`, `data/evidence/`, `data/schema/devices.schema.yaml`
- `references/<paper_id>/crossref.json`, `references/<paper_id>/arxiv.json`, `references/<paper_id>/source.json`
- `data/_staging/conventions_2026_10_05/` (subagent outputs, audit reports)
- `scripts/refresh_metadata.py` (new), `scripts/validate_db.py`, `scripts/build_views.py`, related tests
- `app/src/lib/` enum/label consumers, `app/static/data/atlas.json` (generated)
- `data/_staging/BATCH_INSTRUCTIONS.md`, `.claude/skills/eo-modulator-distill/SKILL.md` (convention text)
- DevLog-020, this file, WORKBOARD rows, README counts

## Boundaries

- Engine and sim configs untouched. Historical staging batches untouched.
- Network: Crossref, arXiv, ROR only; one requester per host; >= 1 s spacing (arXiv 3 s).
