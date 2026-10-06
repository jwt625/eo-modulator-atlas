# p6 correction brief (2026-10-05)

You apply an independent audit's findings to one staged batch. Read the audit report
(`data/_staging/audits/<batch>-claude-audit-2026-10-05.md`), the batch report, `DISTILL_PROMPT.md` and the
conventions (a)-(gg) in `data/schema/devices.schema.yaml`. Re-read the source passage for every finding before
changing anything (`references/<id>/text.md`, `figures/`, `supplement/`, `correction/`).

- Apply every finding you confirm in the source; if you disagree, do not apply it and give the source evidence.
- Coordinator rules for all p6 batches: (1) `license` holds a bare token (e.g. `Optica-OA-License-v2`,
  `CC-BY-4.0`); qualifiers go to notes; any NC/ND licence and Optica OA licences -> redistribution
  restricted_local_only, CC-BY / CC-BY-SA / CC0 -> open_license_ok. (2) `name_source` and `ror_id` of new
  organizations stay empty unless printed in the paper or present in crossref.json (no unverified URLs).
  (3) Sim configs: a constant may be labelled `standard_reference` only with a citation to a source in this repo
  that was actually read (give the file and page); otherwise mark it `unknown` (placeholder) and list it under
  `missing`. (4) A canonical paper's `discovered_via` is kept (how it was found), never replaced by a batch hint.
- Keep the staged files consistent: CSV value = evidence value; qualifiers; notes updated so they do not contradict
  values; locators per convention (i).
- Write `data/_staging/<batch>/AUDIT_DISPOSITIONS.md`: one line per finding (id, applied / adjusted / rejected,
  what changed, evidence).
- Run `uv run python scripts/merge_staging.py data/_staging/<batch> [--replace-paper-ids ...]` until 0 conflicts
  and 0 validation errors.
- Write only in `data/_staging/<batch>/` and `sims/<paper_id>/` of the batch. No network, no git, no emoji.
- Final message: counts applied/adjusted/rejected, the dry-run line, anything left open.
