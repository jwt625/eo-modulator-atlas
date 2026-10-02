# Claim: codex-main

- Agent: Codex in the conversation that inspected the repository on 2026-10-01
- Task IDs: C0, E1, U1, U2a, R0, D1.12
- Status: R0 complete; E1/U1/U2a and D1.12 ready_for_review; coordination, shared E1 contract and D1.12 corrections retained
- Updated: 2026-10-02
- Active checkout: standalone `jwt625/eo-modulator-atlas`, baseline `3602290`
- Migration/ingestion progress: `DevLog/DevLog-006-standalone-continuation.md`
- Progress/handoff: `DevLog/DevLog-003-cross-section-progress.md`

## Implementation write paths

These describe the delivered scope. The explicit release list below takes
precedence for successor claims; do not assume all files remain reserved.

Coordination/documentation:

- `WORKBOARD.md`
- `coordination/claims/codex-main.md`
- `DevLog/DevLog-000-plan.md` (status/link updates)
- `DevLog/DevLog-001-survey-proposal-execution.md` (successor link only)
- `DevLog/DevLog-002-work-plan-and-ownership.md`
- `DevLog/DevLog-003-cross-section-progress.md`
- `README.md`
- `.gitignore` (generated app assets only)

E1 engine boundary and baseline:

- `engine/src/config.mjs`, `engine/src/config.d.mts`
- `engine/src/run.mjs`, `engine/src/run.d.mts`
- `engine/src/optics.mjs` (off-window material fix and baseline only)
- `engine/tests/config.test.mjs`, `engine/tests/electrostatics.test.mjs`, `engine/tests/optics.test.mjs`
- `engine/tests/fixtures/parallel-plates.yaml` (analytic input shared with browser smoke)
- `engine/cli.mjs`, `engine/package.json`
- `engine/schema/sim.schema.json`, `sims/SPEC.md` (cross-section contract addendum only)
- `engine/README.md`, `engine/LICENSE`

U1 app integration:

- `app/src/routes/sim/+page.svelte`, `app/src/routes/about/+page.svelte`
- `app/src/routes/+layout.svelte` (U1 narrow-viewport header fix only; claimed after visual QA exposed overflow)
- `app/src/lib/sim.worker.ts`, `app/src/lib/CrossSection.svelte`
- `app/src/lib/ScoreCard.svelte`, `app/src/lib/logic.test.ts`
- `app/scripts/sync-sims.mjs`, `app/scripts/smoke.mjs` (if added)
- `app/package.json`

Generated local verification outputs: `app/build/`, `app/.svelte-kit/`,
`app/static/sims/`, `logs/`. No solver output is to be committed.

## Explicit exclusions (except the D1.12 staging scope below)

- No paper distillation, candidate changes or edits to `data/*.csv`,
  `data/evidence/`, `data/schema/`, `data/_staging/p1_*/` or reference caches.
- No edits to `sims/<paper_id>/config.yaml`; draft inputs retain their current status.
- No claim on downloader/merge/extraction scripts or distillation skill policy work (D0).
- No claim on EO overlap, RF loss, loaded-line/EO response implementation (E2–E4).
- No claim on full-vector/metal optical modelling after E1's baseline handoff (E2).
- U2 work is limited to the U2a scope below; broader representatives/filter semantics remain a later tranche.
- No independent audit claim. The implementation author cannot satisfy Q1/Q2 by self-review.

## Current work

E1/U1 implementation and author checks are finished; see DevLog-003 for exact
commands, 20 engine / 5 app / 28 Python passing tests, both browser deployment
paths and the cross-agent follow-up register. Q2 remains unassigned and must
independently review the numerical baseline. U2a is ready for review with 15 app
tests and both browser deployment paths passing; final handoff in DevLog-005.
Standalone migration and p2_01 distillation are recorded in DevLog-006. No
independent audit is claimed.

## U2a claim: comparison correctness (2026-10-01)

Own `app/src/lib/logic.ts`, `charts.ts`, `columns.ts`, `ScatterChart.svelte`,
`DeviceTip.svelte`, `app/src/routes/explore/+page.svelte`,
`app/src/routes/table/+page.svelte`, new `app/src/lib/comparisons.test.ts`,
`app/scripts/smoke.mjs`, `DevLog/DevLog-005-comparison-correctness.md` and
coordination/README updates. The existing app integration test is reclaimed
for compatibility checks if needed. No change to the generated-data schema or
shared `types.ts`, `build_views.py`, canonical data, engine or paper inputs.

Scope: axis-specific plot validity, qualified derived values, bound-safe nominal
frontiers/statistics, export context and targeted interaction regression checks.
Record cross-language representative/derived-view drift for a coordinated D2
interface follow-up instead of overwriting that lane's generated view.

## Released for successor claims (2026-10-01)

- E2: `engine/src/optics.mjs`.
- U3 after its physics dependencies: `app/src/routes/sim/+page.svelte`,
  `app/src/lib/sim.worker.ts`, `CrossSection.svelte`, `ScoreCard.svelte`.
- U2: `app/src/lib/logic.test.ts` and the narrow header changes in
  `app/src/routes/+layout.svelte`.
- U2b (2026-10-02): all U2a app paths listed above, including comparison helpers,
  charts, tooltips, table/explore routes, comparison tests and browser smoke.
  Retain regression coverage and coordinate any U2a review corrections.

Release does not assign a successor or assert independent acceptance. Retain
existing tests and coordinate review fixes if a new owner has claimed a file.
Shared config/runner/schema/SPEC maintenance and coordination docs remain with
codex-main until a specific interface handoff is recorded.

## Standalone migration and D1.12 claim

User explicitly requested continuation in the standalone repository. R0 owns
local-only transfer into `references/*/{source.pdf,text.md,figures/}` without
overwriting public source metadata, and DevLog-006 plus coordination updates.

D1.12 owns `data/_staging/p2_01/`, its manifest
`data/_staging/batches/p2_01.csv`, and `references/kieninger2020/` and
`references/wolf2018a/` metadata/cache. These priority-2 papers are outside the
data lane's p1 batches. Acquisition uses serialized prefetch; rows/evidence stay
staged for independent review. No canonical data, schema or tooling writes.

R0 is complete. D1.12 is ready for review: 2 papers, 24 measurement-condition
rows, 5 organizations, 153 evidence entries; dry-run merge has zero conflicts and
errors. These rows do not imply 24 unique devices. Retain owned batch/reference
paths for review corrections and source-version/supplement follow-up. Proposed
D1.13–D1.14 batches remain unclaimed. The data lane's recorded pause is preserved.
