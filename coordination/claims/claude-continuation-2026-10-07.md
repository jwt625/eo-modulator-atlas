# Claim: claude-continuation-2026-10-07

- Agent: Claude Code session (coordinator); Sonnet subagents distill/correct/extract, Opus subagents audit/verify/engine
- Task: DevLog-022 workstreams B0, N1, N2, I1 (p8_*), G1 (geo_06..geo_12), D1, E1 (E2i.2, E3i, U3 taken over from codex-main)
- Status: claimed 2026-10-07; ready_for_review 2026-10-08 (all workstreams done except p8_06, which waits on downloads; final audit dispositions in DevLog-022)
- Plan and progress: `DevLog/DevLog-022-continuation-2026-10-07.md`

## Owned write paths

- `WORKBOARD.md`, `README.md`, `coordination/claims/*` (status lines of stale claims), DevLog checkbox notes
- `data/_staging/batches/p8_*.csv`, `data/_staging/p8_*/`, `data/_staging/geo_06..geo_12/`, `data/_staging/geo_sites_1007/`, `data/_staging/audits/p8_*`,
  `data/_staging/audits/*2026-10-07*`, `data/_staging/ingest_2026_10_07/`, `data/_staging/batches/geo_06..geo_12.txt`
- `references/<paper_id>/` for the p8 papers; `sims/<paper_id>/` for p8 papers (grade A/B dielectric TWE only)
- `scripts/build_people.py` (DUPLICATE_ORCID), `scripts/merge_affiliations.py` (apply keeps canonical rows), `data/schema/devices.schema.yaml` (buffer_oxide_um desc, convention q), `data/_staging/discovery_2026_10_02/RETRIEVAL_REQUESTS.md`, `data/_staging/conventions_2026_10_05/search/` (metadata caches)
- canonical tables via `scripts/merge_staging.py --apply`, `scripts/merge_affiliations.py --apply`,
  `scripts/refresh_metadata.py`, `scripts/build_people.py`, `scripts/geocode_sites.py`; `app/static/data/` via build_views
- `DevLog/DevLog-000/004/008/010/014` (dated status notes), `DevLog/audits/` (Q2 and final audits)
- E1: `engine/`, `app/src/routes/sim/`, sim UI components, `sims/SPEC.md` (contract addenda), DevLog-012

## Boundaries

- Subagents make no network requests and no git. Max 5 subagents at once. Network calls by the coordinator only,
  rate-limited, stop on anti-bot signals.
