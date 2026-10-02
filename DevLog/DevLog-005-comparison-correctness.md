---
title: EO atlas - U2a comparison correctness
date: 2026-10-01
status: ready_for_review
owner: codex-main
tasks: [U2a]
---

# DevLog-005: Comparison correctness

User requested another approximately 20-minute work block. Baseline `09f3daa`;
clean worktree at start. E1/U1 remain ready for independent review. Ownership:
[codex-main claim](../coordination/claims/codex-main.md). Data lane still owns
canonical integration and generated views; no subagents launched.

## Plan and categories

| Tranche | Budget | Deliverable | Gate |
|---|---|---|---|
| U2a.1 audit | ~5 min | Trace source qualifiers through metrics, charts and CSV; reproduce concrete failures | Findings distinguish app defects from data-contract follow-ups |
| U2a.2 fixes | ~10 min | Axis-specific omission rules; honest derived bounds, frontier/statistic scope and export context | Targeted synthetic regressions plus actual integrated data |
| U2a.3 verification | ~5 min | Type/unit/build checks and focused browser interactions; handoff | No known regression in baseline smoke; explicit remaining work |

## Progress

- Started 17:23 local. Read current claims and committed data/implementation state.
- Found panel C uses an artificial x=0 then requires positive x and y, dropping
  all material-summary points. Every chart applies that positivity rule even on
  linear axes; toggling log/linear cannot restore valid zero values.
- Found Pareto construction includes bandwidth bounds as exact points. Group
  statistics likewise average bound thresholds as measured values.
- Derived metric qualifier presentation takes the first input qualifier. This
  does not invert denominator bounds for FOM or handle conflicting directions.
  CSV exports qualifiers but omit metric basis, source context and device IDs.

## Checks and handoff

Implementation was included in the initial public spin-off commit `3602290`.
Final standalone verification completed 2026-10-02:

- Fixed categorical x=0 exclusion and made nonpositive filtering depend on each
  axis scale; missing, invalid and unresolved-bound omissions are counted.
- Derived qualifiers propagate numerator/denominator bounds. Opposing directions
  or incompatible approximate/bounded inputs show as nominal/indeterminate and
  are omitted from comparisons needing a resolved bound.
- Nominal frontiers exclude qualified/modelled points and separate known voltage
  conventions and DC/RF contexts. Material statistics require one known context
  and eligible points; bound-only groups do not acquire fake zeros.
- Plot/tooltip basis follows the plotted fields. CSV includes device identity,
  filter-match status, voltage convention and per-field qualifier, basis and
  context. Expand-all ignores single-device papers.
- App unit tests: **15 passed**, including 10 comparison regressions. Svelte and
  TypeScript check: **0 errors, 0 warnings**. Engine tests: **20 passed**. Python
  tests: **28 passed**; canonical database validation: **0 errors**.
- Production builds and full browser smoke pass at `/` and `/eo-atlas`, including
  table expansion/search/empty state, qualified CSV download, restored material
  chart, worker execution/cancellation/error recovery and narrow viewport.
  Root production build restored after subdirectory verification.
- Visually inspected table/comparison screenshots in ignored `logs/u2a/`.
  Material chart has data and scoped statistics; table qualifiers remain visible.
  Wide-table scrolling is expected; mobile table/filter usability remains U2b.

An earlier browser run timed out waiting for the Chen optional-optical rejection,
after passing U2a checks. Both standalone deployment-path suites pass that case
without a source change. The failure is unreproduced; no root-cause fix is claimed.

U2a is **ready for independent review**, not independently accepted. Its app file
claim is released for a named U2b successor; coordinate any review corrections.
U2b covers representative ranking, measured-only semantics, URL/back and mobile
table/filter usability. Python-generated fields still use their existing
qualifier/ranking rules; reconcile that contract with D2 before editing
`build_views.py` or the atlas. The existing FOM formula was not redesigned here.
