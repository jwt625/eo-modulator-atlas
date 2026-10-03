---
title: Literature cache expansion 2020 through 2026-10-02
date: 2026-10-02
status: ready_for_review
owner: codex-main
tasks: [C0]
---

# DevLog-013: literature cache expansion

The user requested continued caching of electro-optic modulator papers published
from 2020 through 2026-10-02, searching by topic and by authors, groups and
organizations already present in the repository, plus a list of raw materials
that require user retrieval. This DevLog records that discovery and acquisition
pass. It is not a systematic review and does not validate device measurements.

## Scope

- Discovery and source acquisition only. No canonical `data/*.csv`,
  `data/evidence/`, batch record or paper simulation input was modified.
- Existing caches were preserved; new or missing `references/<paper_id>/` source
  caches were added for the recorded manifest.
- Codex was the sole serialized download coordinator for the run.

## Deliverables

- `data/_staging/discovery_2026_10_02/` holds the pass outputs: `manifest.csv`
  (78 records), `candidates.csv` (28 new candidates), `validation.json`,
  `acquisition_status.jsonl`, `search_log.json`, the retrieval lists, and
  [`REPORT.md`](../../data/_staging/discovery_2026_10_02/REPORT.md).
- `data/_staging/discovery_2026_10_02/RESEARCH_ROUTES.md` records the author,
  group and organization routes followed.
- `data/_staging/discovery_2026_10_02/RETRIEVAL_REQUESTS.md` and the
  `references/_inbox/` workflow cover the 34 remaining main-paper requests.
- `data/manual_downloads.md`, `references/README.md` and
  `references/_inbox/README.md` were updated to point at the current lists.

## Result

44 main-paper PDFs were added (41 before, 85 now), all re-checked for SHA-256
match and first-page identity. 5 earlier manual requests were recovered
(`arabjuneghani2022`, `gupta2023`, `valdez2023a`, `yue2025`, `zhang2022`).
34 main-paper requests remain open.

## Rights and provenance

Actual fetched URLs, hashes, source versions and source-specific rights are
preserved in each `references/<paper_id>/source.json` and in `manifest.csv`.
Journal licenses are not inferred from a cached preprint. PDFs and their
extracted text/figures retain source-specific rights; see the
[reference cache policy](../../references/README.md).

## Open items

- Continued in [DevLog-014](DevLog-014-continued-collection-and-ingestion.md) (2026-10-03): 72 further preprints cached, `han2023` and `li2022b` recovered, 235 candidates merged, staged distillation and audits. Counts below are as of this pass.

- 34 retrieval requests remain; the retrieval inbox workflow is ready.
- New candidates in `candidates.csv` are staged and not distilled.
- Independent evidence and numerical audits are unaffected by this pass.
