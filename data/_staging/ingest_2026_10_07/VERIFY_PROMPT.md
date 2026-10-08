# p8 verification brief (2026-10-07)

Fresh-context, read-only check of one batch after corrections. Inputs: the audit
(`data/_staging/audits/<batch>-claude-audit-2026-10-07.md`), `data/_staging/<batch>/AUDIT_DISPOSITIONS.md`, the
staged files, `CORRECT_PROMPT.md` (coordinator rules) and the sources (`references/<id>/text.md`, `figures/`,
`supplement/`, `correction/`).

1. For every finding: is the disposition right and correctly applied (CSV, evidence, qualifiers, notes, sim
   config)? Re-read the source for each changed value; open the figure for figure-read values.
2. Unrecorded changes: compare staged files with the audit's description; list any change not explained.
3. Coordinator rules applied across the batch (bare licence tokens and redistribution mapping, no unverified
   name_source/ror_id, standard_reference constants only with a read citation, canonical discovered_via kept).
4. Run `uv run python scripts/merge_staging.py data/_staging/<batch> [--replace-paper-ids ...]` and report the line.

Write `data/_staging/audits/<batch>-verify-claude-2026-10-07.md` (per finding: confirmed / not confirmed + evidence;
then unrecorded changes; then new issues with severity). No network, no git, no emoji; only that file.
Final message: counts confirmed / not confirmed, new issues, dry-run line.
