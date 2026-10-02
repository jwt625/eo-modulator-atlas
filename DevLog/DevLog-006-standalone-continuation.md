---
title: Standalone migration and next ingestion tranche
date: 2026-10-02
status: ready_for_review
owner: codex-main
tasks: [C0, R0, U2a, D1.12]
---

# DevLog-006: Standalone continuation

The user moved development to `jwt625/eo-modulator-atlas` and requested a local
clone, cache transfer, continued planning and more reference ingestion. The new
checkout starts at public spin-off commit `3602290`. Future work in this
conversation uses this repository; the former checkout is preserved.

## Migration and verification

- Clone completed. Source/app/engine implementation files match the preceding
  checkout, including committed U2a work; no implementation patch was lost.
- Copied and SHA-256 verified 39 PDFs, 47 extracted texts and 640 figure/index
  files (468,546,516 bytes). Existing public `source.json` and sanitized
  `crossref.json` were preserved. File/hash manifest is local scratch at
  `logs/cache-transfer.json`; no private paths are added to tracked records.
- Standalone `.gitignore` and `references/README.md` govern local cache handling.
  PDFs/text/figures remain ignored. Older batch/DevLog statements that those
  assets are tracked do not apply here.
- Fresh Python/Node environments installed from declared dependencies; no
  symlink to the former checkout is used.

## Next tranches and ownership

| Task | Owner / boundary | Deliverable / exit gate |
|---|---|---|
| R0 local migration | codex-main | Hash-verified cache, ignored-file check, environment/source checks |
| U2a final verification | codex-main, existing app claim | Author gates pass; ready for review; app paths released for U2b |
| D1.12 / p2_01 | codex-main, separate from p1_01-11 | Acquire/read Kieninger 2020 and Wolf 2018a; stage rows/evidence and dry-run validation |
| Q1 for p2_01 | unassigned independent reviewer | Source/variant/convention audit, author corrections, then D2 integration |
| D1 priority-1 / D2 | existing claude-data-lane claim retained | Existing batches and serial canonical merges; avoid this new batch |
| E2/E3/Q2 | unassigned | Numerical models and independent review per DevLog-002 |

The new batch is disjoint from active priority-1 ownership. The coordinator
performs serialized prefetch; distillation then uses local primary sources. New
metrics remain staged until independent Q1 review and D2 integration. No
canonical CSV or generated atlas edits are part of D1.12.

## Live progress

- R0 complete: all 726 copied artifacts verified by SHA-256 and all ignored by
  Git. New Python environment and frozen-lockfile Node installs are independent
  of the former checkout. Existing public metadata was preserved during transfer.
- Standalone checks: canonical validator **0 errors**, **28 Python tests**,
  **20 engine tests**, **15 app tests**, type check **0 errors / 0 warnings**.
  Python reports five PyMuPDF/SWIG deprecation warnings, no test failures.
- Root and `/eo-atlas` production builds and full browser smoke **pass**. The
  earlier Chen optical-error timeout did not reproduce on either run; no code
  change or root-cause repair is claimed. Restored root build and visually
  checked the table/comparison screenshots.
- U2a final implementation and remaining scope recorded in
  [DevLog-005](DevLog-005-comparison-correctness.md). Independent acceptance still
  pending; app files released for U2b.
- D1.12 serialized prefetch fetched/extracted both new papers successfully.
  Local PDF cache now has **41 PDFs** (39 transferred plus two acquired here).
  Read all 12 Kieninger pages and all 18 Wolf main-manuscript pages; inspected
  numerical figures and the 16-sample Kieninger table visually.
- D1.12 contains **2 papers, 24 measurement rows, 5 new organizations and
  153 evidence entries**. These are condition records, not 24 unique physical
  devices. Dry-run merge: **0 conflicts / 0 validation errors**. Additional author
  checks found no duplicate evidence keys, CSV/evidence mismatches or evidence
  notes over 25 words. No canonical data or generated atlas changed.
- Preserved Wolf's 6 dB EOE convention, separated gate/termination conditions,
  kept Kieninger's loss samples independent of its unidentified headline devices,
  and retained reported uncertainties and phase-only loss scope.
- Corrected source URL/origin and unverified preprint-license fields for the two
  new caches. Removed publisher abstracts from their Crossref metadata. Existing
  metadata was not rewritten. Primary-version dates/rights and Wolf's unavailable
  supplement are explicit follow-ups.
- Rechecked canonical and generated view counts: **15 papers / 28 device rows /
  27 organizations**, with **0 generated warnings**. They agree; only README and
  introductory workboard counts needed correction. p1_01/03/09 are integrated;
  the data lane's recorded pause and file ownership are retained.

Batch handoff: [p2_01 report](../data/_staging/p2_01/BATCH_REPORT.md),
[schema proposals](../data/_staging/p2_01/SPEC_PROPOSALS.md), and
[evidence](../data/_staging/p2_01/evidence/). Q1 review and D2 integration remain
outstanding; this author did not self-approve or merge the batch.

## Next work queue

| Category / task | Scope and next bounded tranche | Owner / dependency | Exit gate |
|---|---|---|---|
| Evidence Q1-p2_01 | Review PDFs, sample identities, loss scope/uncertainty, 6 dB EOE and drive reference planes | Unassigned independent reviewer; write only an audit report | Findings resolved, dry-run clean |
| Evidence D1.12 follow-up | Acquire Wolf supplement through serialized coordinator; verify version dates/rights before journal substitution | codex-main retains batch/reference paths | Version-specific additions with evidence |
| Data D2 | Integrate accepted p2_01; refresh views and inspect selection with loss-only samples | Existing data-lane owner; review and resumption required | Serial merge, validator, tests and generated warnings checked |
| Ingestion D1.13 proposal | `ummethala2021` (SOH high-k RF coupling) and `han2023` (slow-light silicon) | Unassigned; neither ID is in an existing batch | Claim p2_02 paths, prefetch, full-source review, staged validation |
| Ingestion D1.14 proposal | `xu2005` (silicon resonator) and `wolf2018b` (SOH coherent/IQ) | Unassigned; candidate metadata, not verified metrics | Separate batch and source-version audit; no p2_01 metrics borrowed |
| App U2b | Next ~20-minute tranche: ~5 min ranking/qualifier contract audit, ~10 min one bounded fix, ~5 min focused validation | Ready for named successor; coordinate Python contract with D2 | Representative/filter semantics documented and checked |
| Tooling D0 public cache policy | Preserve versioned URL/origin and source license; sanitize abstracts; update stale batch instructions | Existing D0 owner | Prefetch preserves actual source identity and public cache policy |
| Numerics Q2 / E2 | Independent E1 audit first; then optical limits/overlap contract | Unassigned; implementation author cannot give independent acceptance | Analytic gates and conventions reviewed before reproduction claims |

The ingestion proposals are unclaimed candidate selections, not instructions to
restart the paused data lane. Successors must claim exact paths before writing.
The author retains D1.12 corrections and coordination/shared E1 contract
maintenance. No subagents, commits or pushes were made by this continuation.
