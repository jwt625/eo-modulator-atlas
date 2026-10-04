# Claim: claude-geo-2026-10-04

- Agent: Claude Code session (coordinator); Sonnet subagents extract/correct, Opus subagents audit/review
- Task: per-author affiliations, institution coordinates, clustered map (user request 2026-10-04)
- Status: ready_for_review (2026-10-04); results in DevLog-018
- Plan and progress: `DevLog/DevLog-018-author-affiliation-geolocation.md`

## Owned write paths

- `data/_staging/batches/geo_*.txt`, `data/_staging/geo_*/`, `data/_staging/audits/geo_*`
- new canonical tables `data/author_affiliations.csv`, `data/org_sites.csv`; `data/organizations.csv` (new orgs only)
- `scripts/validate_db.py`, `scripts/build_views.py`, `scripts/geocode_sites.py`, `tests/` (new-table checks)
- `app/src/lib/GeoPanel.svelte`, geo helpers, `app/static/geo/`, `app/static/data/atlas.json` (via build_views)
- local git-ignored extracts under `references/<paper_id>/` (text.md, figures/)
- `DevLog/DevLog-018-*`, this file, WORKBOARD.md row

## Boundaries

- Network only in the coordinator's geocoding script (Wikidata, Nominatim; 1 req/s; pilot first). Subagents make no network requests.
- At most 5 subagents at once. No edits to device metrics or evidence.
