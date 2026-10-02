---
title: Audit corrections and shared optical integration
date: 2026-10-02
status: ready_for_review
owner: codex-main
tasks: [C0, D1.12, U2c, E2i.1]
---

# DevLog-011: Audit corrections and integration

User requested review of new updates, claims on pending tasks and sequential
implementation. Fast-forwarded a clean standalone checkout from `97ca0d1` to
`73f8439`. The new wave delivers E2/E3 modules, U2b fixes, p2_02, and Q1/Q2 reports;
its claim explicitly releases implementation paths. No previous work was reset.

## Sequential plan and claims

| Tranche | Scope | Acceptance |
|---|---|---|
| D1.12 corrections | Review F1–F17 against sources; correct batch and record dispositions | Evidence consistency; joint p2_01/p2_02 dry-run; unresolved policy stated |
| U2c | Keep statistical loss samples out of headline selection and loss comparisons | Targeted representative/sort/chart regressions; visible sample records retained |
| E2i.1 | Expose explicit optical metal policy and returned diagnostics through YAML/schema/runner/browser | Default rejection preserved; both opt-in limits and diagnostics tested; browser smoke |

Exact file boundaries are in the [claim](../coordination/claims/codex-main.md).
Canonical data/D2, acquisition tooling, paper simulation inputs, EO/RF stage
wiring, rotation convention and vector-solver work remain outside these claims.

## Progress

- Reviewed new claims and handoffs. p2_01 Q1: accept after corrections (0 high,
  4 medium, 13 low). p2_02 has an accepted corrected audit; Han source is still
  unavailable. E2/E3 audited corrections are present, with rotation-sense and
  scalar vertical-wall todo cases remaining. U2b has 23 app tests and reports
  root/subdirectory smoke passes.
- Applied p2_01 author corrections: three uncertainty-note transcriptions fixed;
  repeated sample ER and unsupported metal/poling/termination assertions removed;
  bandwidth/drive contexts clarified; unit conversions moved to `derived`;
  metadata normalized without changing actual cached-version URLs. Updated batch
  counts: 24 rows, 157 evidence entries plus three conversions. Full F1–F17
  dispositions are in BATCH_REPORT, including the reason not to attach a gated
  population propagation loss to an ungated individual device (F15).
- Joint p2_01/p2_02 dry-run: **3 papers / 25 measurement rows / 5 organizations /
  3 evidence files; 0 conflicts, 0 validation errors**. All 16 sigma_meas notes
  match the rendered table; evidence keys/values and short-note limits pass.
- U2c implemented: `statistical_replicate` rows cannot become representatives.
  A filter leaving only samples shows an explicit table preview, exports it as
  such, and offers all-records mode in Explore instead of an empty headline plot.
  Sample numeric sorting and statistical/`phase_only_loss` loss comparisons are
  excluded, with separate omission counts and tooltip/CSV context. Values remain
  inspectable and exportable. Added `phase_only_loss` to the 18 applicable staged
  rows. Python ranking remains unchanged and **must adopt the same guards before
  D2 integrates these samples**; current canonical parity tests still pass.
- E2i.1 implemented: validated optional `optics.metal_in_window`, default reject,
  explicit absent/PEC sensitivity choices. Runner propagates selected-mode margin,
  metal details, convergence and all scalar labels/limitations. Type declarations,
  input schema, SPEC and browser disclosures agree. No heuristic threshold turns
  the window-margin proxy into a convergence or literature-acceptance claim.
- Four new runner tests exercise invalid/default policies, analytic scalar boxes,
  each metal limit, serializable diagnostics, selected TM mode and finite-difference
  group index. Existing module/independent audit assertions remain unchanged.
- Checks so far: **102 engine tests pass, 2 existing todo cases** (rotation sense
  and vertical-wall scalar error); **26 app tests pass**; Svelte/TypeScript **0
  errors / 0 warnings**; **28 Python tests pass** with five existing SWIG warnings;
  canonical validator **0 errors**. One app omission-counter expectation was
  updated for the new counter after its first run failed. CSV CRLFs were normalized
  in the two edited staging files after `git diff --check` caught them.
- Root production build and full browser smoke **pass**, including a synthetic
  sample-only atlas, both optical policies and browser/Node agreement. Visually
  inspected the ignored optical-result screenshots: policy, margin indicator and
  PEC face validity are visible and wrap correctly. Subdirectory build and full
  smoke at `/eo-atlas` also **pass**. Final root build restored after that check.
  No physical solver arrays/results are tracked.

All three claimed tranches are **ready for review**. Implementation author checks
are complete; reviewer acceptance and serial canonical integration are separate.

## Remaining integration work

- Reviewer recheck of D1.12 corrections, architecture-basis policy and D2's
  generated representative/uncertainty/measurement-scope contract. Neither batch
  was canonically merged here. Han PDF and Wolf supplement remain unavailable.
- E2i.2: arm windows, lengths, Vpi convention and EO-overlap runner/schema contract
  (DevLog-007 P3/P4/P10). E3i: explicit loss-model/sweep contract and runner wiring.
  These are unclaimed next tranches; do not treat module presence as a runnable
  full-chain simulator.
- Rotation sense (Q2 D3), scalar vertical-wall accuracy (D5), convergence studies,
  periodic-line/EO response, and independent review of this integration remain.

Independent audit files were not edited. No canonical CSV, generated atlas or
paper simulation config changed. No commits/pushes were made by this agent.
