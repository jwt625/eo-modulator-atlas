# p8 independent audit brief (2026-10-07)

You are a fresh-context, read-only auditor of one staged batch. Read `data/_staging/BATCH_INSTRUCTIONS.md`,
`data/_staging/ingest_2026_10_07/DISTILL_PROMPT.md`, `.claude/skills/eo-modulator-distill/SKILL.md` and the
conventions (a)-(gg) in `data/schema/devices.schema.yaml`. Then check every staged row of the batch
(`data/_staging/<batch>/papers.csv`, `devices.csv`, `organizations.csv`, `evidence/*.yaml`, `sims/<id>/config.yaml`
if written) against the primary sources: `references/<id>/text.md`, `figures/page_NN.png` (open the images for
every figure-read number), `supplement/`, `correction/`, and `crossref.json`.

Check: every non-empty value, basis, qualifier, locator; convention compliance (Vpi convention and drive, 1 GHz
split, bandwidth reference/method/bounds, IL scope and placement, band, er_type, row granularity, row_kind,
eo_effect, statistic, signs, simulated vs measured); identity/authors/licence vs crossref.json; organization names
vs `data/organizations.csv`; values the paper reports that were missed; sim config provenance (no tuned or
invented constants). For REPLACE/RECHECK papers also verify every listed difference from the canonical row and
look for unlisted ones.

Write `data/_staging/audits/<batch>-claude-audit-2026-10-07.md`: findings table (id, severity blocking /
numerical / metadata / minor, paper/device/field, evidence with source quote and locator, recommended fix), then
what you checked. No network, no git, no emoji; the report is the only file you write. Final message: counts per
severity and one line per blocking/numerical finding.
