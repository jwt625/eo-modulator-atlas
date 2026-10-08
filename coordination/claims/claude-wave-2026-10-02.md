# Claim: claude-wave-2026-10-02

- Agent: Claude Code session in the standalone checkout (coordinator) plus fresh-context subagents it launches, one per task below
- Task IDs: E2, E3, U2b, Q1-p2_01, D1.13 (stretch)
- Status: complete (accepted by the user 2026-10-07): E2, E3, U2b, D1.13, Q1-p2_01, Q1-p2_02, Q2-E2/E3; files released
- Updated: 2026-10-02
- Base revision: `97ca0d1` (clean worktree; baseline engine 20, app 15, Python 28 tests pass)
- Commits/pushes: none. The user commits.

WORKBOARD.md rows are not edited here; they belong to codex-main as board coordinator. Per claim protocol step 1, this file takes precedence over the stale board rows for these task IDs. Status and handoffs are in the DevLogs listed per task.

## E2 - optical limits, EO tensor overlap, voltage/arm conventions

Owned write paths:
- `engine/src/eo-overlap.mjs` (new), `engine/src/optics.mjs`
- `engine/tests/eo-overlap.test.mjs` (new), `engine/tests/optics-limits.test.mjs` (new); `engine/tests/optics.test.mjs` may be extended
- `DevLog/DevLog-007-e2-eo-overlap.md` (handoff, convention freeze, interface proposals)

Shared interfaces (`engine/src/materials.mjs`, `config.mjs`, `run.mjs`, `engine/schema/sim.schema.json`, `sims/SPEC.md`, `engine/README.md`): proposals only, written in DevLog-007; not edited. If a minimal additive change is unavoidable, record it here first with the exact lines and keep existing tests green.

## E3 - uniform RF line, conductor/dielectric loss

Owned write paths:
- `engine/src/rf-line.mjs` (new), `engine/src/complex.mjs` (new, only if needed)
- `engine/tests/rf-line.test.mjs` (new)
- `DevLog/DevLog-008-e3-rf-line.md`

Shared interfaces as for E2: proposals only. The module consumes the E1 section result (C', C0', L' or equivalents) through a documented input contract; wiring into `run.mjs` is a proposal.

## U2b - representative/filter/navigation and usability audit

Owned write paths (released by codex-main 2026-10-02):
- `app/src/lib/logic.ts`, `charts.ts`, `columns.ts`, `ScatterChart.svelte`, `DeviceTip.svelte`
- `app/src/routes/explore/+page.svelte`, `app/src/routes/table/+page.svelte`
- `app/src/lib/comparisons.test.ts`, `app/src/lib/logic.test.ts`, `app/scripts/smoke.mjs`
- Additionally claimed for filter/drawer usability within the original U2 scope: `app/src/lib/FilterPanel.svelte`, `app/src/lib/Drawer.svelte`
- `DevLog/DevLog-009-u2b-usability.md`

Exclusions: `app/src/lib/types.ts`, `scripts/build_views.py`, `app/static/data/atlas.json` and all canonical data (D2 lane). Python-side representative/derived-field drift is recorded as a follow-up for D2, not edited. Global layout/CSS beyond the narrow header, and sim route/worker/ScoreCard (U3), are not touched.

## Q1-p2_01 - independent evidence audit of D1.12

Owned write paths:
- `data/_staging/audits/p2_01-claude-wave-2026-10-02.md` (new, only file written)

Read-only inputs: `data/_staging/p2_01/`, `references/kieninger2020/`, `references/wolf2018a/` (local ignored PDFs/text/figures), `data/schema/`, `data/_staging/BATCH_INSTRUCTIONS.md`. Fresh-context auditor that did not write the batch. No canonical, staging or reference edits; the author (codex-main) applies corrections.

## D1.13 - p2_02 prefetch (stretch)

Owned write paths:
- `data/_staging/p2_02/`, `data/_staging/batches/p2_02.csv`
- `references/ummethala2021/`, `references/han2023/` (public metadata tracked; PDF/text/figures stay ignored)
- `DevLog/DevLog-010-d1-13-p2_02.md`

Staged validation only: no canonical CSV, evidence, schema, generated-view, tooling or sim-config edits; no merge `--apply`. Sole download owner for this window (data lane paused, codex-main not fetching); fetches are serialized, rate-limited, tiny test first, stop on anti-bot signals. Rows stay pending Q1 and D2.

## Added 2026-10-02: fresh-context audits of this wave's own work (read-only auditors)

- Q1-p2_02: `data/_staging/audits/p2_02-claude-wave-2026-10-02-q1.md` (auditor reads data/_staging/p2_02/ and references/ummethala2021/; no other writes).
- Q2-E2/E3: `DevLog/audits/e2-e3-claude-wave-2026-10-02-q2.md` and, if needed, `engine/tests/audit-claude-wave-2026-10-02.test.mjs`; read-only on engine implementation files. These do not replace review by a different owner chosen by the user.

## Explicit exclusions (all tasks)

claude-data-lane: D0, D1.01-D1.11, D2, Q1 for p1 batches. codex-main: C0, E1 contract (`config.mjs`, `run.mjs`, schema, SPEC), U1/U2a review corrections, D1.12 batch and reference paths. `WORKBOARD.md`, other claims, `DevLog-000..006`. No solver outputs, PDFs, text or figures tracked. No commits or pushes. No emoji, no private paths in tracked files.

## Acceptance checks

After each change: `uv run pytest -q` (28 expected), `cd engine && npm test` (20 + new), `cd app && npm test` and `npm run check`. U2b additionally: production build and browser smoke at `/` and `/eo-atlas` if the environment supports it. `uv run python scripts/validate_db.py` for D1.13. Per-task status reported as `ready_for_review`, never `complete`.

## Handoff report paths

DevLog-007 (E2), DevLog-008 (E3), DevLog-009 (U2b), `data/_staging/audits/p2_01-claude-wave-2026-10-02.md` (Q1-p2_01), DevLog-010 (D1.13).

## Release (2026-10-02)

All owned write paths above are released. Open items for other owners: codex-main applies the p2_01 audit corrections (F1-F17) and takes the E2/E3 shared-interface proposals (DevLog-007 P1-P10, DevLog-008); the data lane (D2) merges p2_01/p2_02 only after unifying the University of Washington org rows and settling the versioned arXiv fields and design_target usage; the Kohli representative defect and the U2b follow-ups (DevLog-009) go to D2/layout owner. han2023 awaits a manual PDF drop. E2 audit items D3 (rotation_deg sense, shared materials.mjs) and D5 (scalar vertical-wall error) remain as todo tests.
