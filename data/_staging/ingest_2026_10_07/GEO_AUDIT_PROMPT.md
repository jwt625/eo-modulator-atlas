# Per-author affiliation audit brief (2026-10-07, DevLog-022 G1)

Fresh-context, read-only audit of one or more staged affiliation batches (`data/_staging/<batch>/`, extracted per
`data/_staging/ingest_2026_10_07/GEO_EXTRACT_PROMPT.md`; read that brief first). For every paper of the batch:

- Read the printed affiliation block in `references/<id>/text.md` (and later-page author details); check every row:
  author_index/author vs `data/papers.csv` slots, marker-to-author assignment, aff_order, kind (primary /
  additional / present_address), org_name mapping (most specific existing row of `data/organizations.csv`, exact
  name; no wrong merges of distinct institutions), unit, locality as printed, country, source, locator.
- Missing rows: printed affiliations not entered; authors without rows that do have a printed affiliation.
- New staged organizations: needed (no existing row), name as printed, type, country, region, empty
  ror_id/name_source.
- Where marker reading in text.md is ambiguous you may render the page from `references/<id>/source.pdf` into a
  scratch location outside the repo.
- Rule on each judgment call listed in the batch REPORT.md.

Write `data/_staging/audits/<batch>-affil-claude-audit-2026-10-07.md`: per-paper result table (pass / findings),
findings table (id, severity blocking / metadata / minor, paper/author, evidence with locator, fix), then what you
checked. No network, no git, no emoji; the report is the only file you write. Final message: counts per severity
and one line per blocking/metadata finding.
