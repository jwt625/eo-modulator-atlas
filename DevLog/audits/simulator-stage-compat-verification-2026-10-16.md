---
title: Fresh-context verification of DevLog-043 (stage compatibility, readiness, config-switch state, URL scoping)
date: 2026-10-16
auditor: fresh-context Claude subagent (did not write the DevLog-043 code)
scope: DevLog-043 requirements R1-R4 and progress claims; engine/src/stage-compat.mjs, config.mjs (stageErrors,
  semiconductorStageErrors, readiness additions), run.mjs (runSemiconductorOnly), semi-stage.mjs, stages.mjs;
  app/src/lib/sim/workbench.svelte.ts, urlState.ts, Settings.svelte, ModelTree.svelte, routes/sim/+page.svelte;
  Graphics.svelte / renderer.ts (black potential view, read only)
status: complete (2026-10-16 16:06-16:24 PDT); no code changed
---

# DevLog-043 verification

Method: production build of the working tree (`nice -n 10 npm run build`), `vite preview` on 127.0.0.1:47613 (checked
free), one headless Chrome (playwright-core, own temporary profile), `?pool=2&debug=1` (workbench read through
`window.__simWorkbench`, interaction through the DOM). HEAD comparison: `git worktree add --detach` in the session
scratchpad, built and previewed on 127.0.0.1:47619, removed afterwards (`git worktree list` shows only main). Scripts,
JSONL and logs in the session scratchpad (`ui-walk.mjs`, `engine-combos.mjs`, `black-race.mjs`, `black-repro2.mjs`,
`desync-probe.mjs`, `logs/*-20261016T16*.log`). Screenshots deleted. Both preview servers stopped; git status unchanged
(17 modified, 4 untracked, as at the start).

## Gates (re-run)

| Gate | Claimed | Result | Log (scratchpad) |
|---|---|---|---|
| engine `npm test` (sequential) | 333: 330 pass, 0 fail, 2 skipped, 1 todo | 333: 330 pass, 0 fail, 2 skipped, 1 todo (D5 todo) | `logs/engine-test-20261016T160812.log` |
| engine `test:reference` | 15/15 | 15/15 | `logs/engine-ref-20261016T161137.log` |
| app `npm test` | 75/75 | 75/75 (7 files) | `logs/app-test-20261016T161255.log` |
| app `npm run check` | 0 / 0 | 0 errors, 0 warnings (471 files) | `logs/app-check-20261016T161255.log` |
| app `npm run build` | OK | OK | `logs/app-build-20261016T161314.log` |
| app `npm run smoke` | exit 0, 50 PASS | exit 0, 50 PASS | `logs/app-smoke-20261016T161801.log` |

## 1. UI walk (9 configs)

Configs: yang2022-a, zhang2022-a, chen2022-c, han2023-a, anjali2025-c, renaud2023-3um-738, lin2026a-a, meng2023-a,
mao2022-a. Per config: fresh load; toolbar vs `wb.compat` (checked, disabled, tooltip reason) after every toggle;
Study page toggles, Bias Sweep page toggles and readiness text (semiconductor configs), Model Builder tags; programmatic
`toggleStage(id, true)` on every disabled stage; all enabled stages on; seeded set computed once. Checks over all four
phases (configs, YAML, links, switch): 1501, of which 42 failed (40 = finding F1 in the configs phase, 1 = test
artifact F6 in the YAML phase, 1 = finding F5 in the links phase).

Seeded stages (chain filtered by `sanitizeStages`) and the Compute of each seeded set:

| Config | Seeded | Dropped (reason) | Compute | Stages run |
|---|---|---|---|---|
| yang2022-a | optical_mode, eo_overlap, rf_line, eo_response | none | ok, 3204 ms | electrostatics, optical_mode, eo_overlap, rf_line, eo_response |
| zhang2022-a | same 4 | none | ok, 2804 ms | same 5 |
| chen2022-c | loaded_line | optical_mode, eo_response (metal in the optical window, reject policy); eo_overlap (optics.eo); rf_line (loaded T-rail cut) | ok, 1467 ms | electrostatics, loaded_line |
| han2023-a | semiconductor | none | ok, 5042 ms | semiconductor |
| anjali2025-c | semiconductor | none | ok, 23567 ms | semiconductor |
| renaud2023-3um-738 | same 4 as yang | none | ok, 1890 ms | same 5 |
| lin2026a-a | none | optical_mode, eo_overlap (lithium_tantalate dispersion invalid at 375 nm) | ok, 452 ms | electrostatics |
| meng2023-a | none | all (electrodes signal_au / signal_ito share a boundary segment) | Compute disabled; Electrostatics tooltip gives the reason | - |
| mao2022-a | same 4 as yang | none | ok, 3109 ms | same 5 |

Compute never failed for a readiness-passing selection (8/8 runnable configs). No selected blocked stage after any toggle,
YAML edit, link or switch while the input parses. Blocked stages: disabled on toolbar and Study; `toggleStage` on a
disabled stage refused (log entry, selection unchanged) on every config. Reasons identical on toolbar and Study; Bias
Sweep readiness text equals `semiReadiness`; tree tags (blocked / off) match `stageError` / selection. With the
semiconductor stage selected, eo_overlap, rf_line and loaded_line show the conflict reason on toolbar and Study, and
Electrostatics shows "own Poisson equation". No page errors.

YAML edits (YAML tab, `fill`): yang2022 without `line.dielectric_loss_model` deselects RF line and EO response with
"YAML edit: ... deselected (reason)" Messages entries; eo_overlap and optical_mode stay. Native textarea edit, undo and
redo (`execCommand`, `undo-probe.mjs`): undo restores the text and unblocks rf_line, redo blocks it again; the
deselected stages are not re-selected by undo (as designed; F4). An unparsable edit keeps the selection and disables
Compute (designed). chen2022: metal policy form `pec` unblocks optical_mode; selecting it and setting `reject` again
deselects it with a Messages entry. han2023: `optics.solver: scalar` deselects Semiconductor with the reason.

Crafted links (12): blocked (`id=chen2022-c&stages=optical_mode`), stage without block (`yang2022-a&stages=semiconductor`),
conflict (`han2023-a&stages=rf_line,semiconductor` -> semiconductor), readiness-blocked pair, duplicate + unknown
(`zhang2022-a&stages=optical_mode,optical_mode,bogus` -> optical_mode), touching electrodes (meng2023), `config=<path>`
scoping (applied), no id (`?stages=eo_overlap`: ignored with a warning, default config seeds its chain), section-scoped
readiness (`chen2022-c&section=unloaded&stages=rf_line` -> dropped, dielectric_loss_model), semiconductor + eo_response +
optical_mode on han2023 (eo_response dropped: line.rf_section), `stages=` (none), `stages=electrostatics`. Every dropped
stage has a Messages entry with its reason; the address bar is rewritten without it (F5 is the one exception).

Config switch (toolbar select, 9 transitions): zhang2022 with a result (9 plot groups, 7 datasets), mesh level 2, form
overrides (optics.solver, geometry.mesh.element_order 2, metal_in_window pec), a sweep definition, eoPoint, ruler,
highlight and a stage change -> han2023; han (dirty) -> chen; chen -> yang; yang (dirty) -> han -> yang; rapid
yang -> han -> chen before the first fetch finished; yang with Compute running -> zhang (busy cleared, 0 workers);
browser back to yang; chen with section `unloaded` -> zhang. After every switch the state equals a fresh load of the
target config on 25 fields (selection, mesh level, section, overrides, sweep path/spec/rows/metric/targets, result,
plot groups, selections, cut lines, datasets, derived, tables, page pickers, ruler, highlight, view, text = base text,
solver, metal policy, undo stack). Kept: wireframe toggle, `pool` and `debug` URL parameters (global, as specified).
No inheritance found.

## 2. Engine: stageCompatibility vs runner

`engine-combos.mjs`, 42 runs, prediction (invalid empty or not) agrees with the runner in 42/42 (`combos.jsonl`).

| Combination | Predicted | Runner | Notes |
|---|---|---|---|
| yang2022 [eo_response] | ok | ok, 1985 ms | run electrostatics, optical_mode, rf_line, eo_response (implied deps) |
| han2023 [semiconductor, optical_mode] mesh 2 | ok | ok, 1430 ms | 1 optical progress message; n_eff = semiconductor.optical.neff = 2.5278761299790022; optical.source semiconductor_stage |
| rib fixture [semiconductor, optical_mode, eo_response] | ok | ok, 1174 ms | 1 optical solve; response.ngOpt = semiconductor.optical.ng = 3.897464492450582 (no second solve) |
| rib fixture [semiconductor, eo_response] | ok | ok, 1059 ms | same ng; 1 optical solve |
| han2023 [semiconductor, electrostatics / eo_overlap / rf_line / loaded_line] | blocked | Stage selection error in 3-5 ms with the physics reason | before any solve |
| han2023 [semiconductor, eo_response] | blocked (line.rf_section) | error after 4176 ms (operating_bias_v) | F3 |
| chen2022 [optical_mode] | blocked (metal in window) | error (vector-mode: conductor intersects the optical window) | readiness = run-time rule |
| 31 blocked singletons on the 9 configs | blocked | error | lin2026a (dispersion), meng2023 (touching electrodes / rf loss) agree |

## 3. Black Electric Potential plot (chen2022, smoke `sim-desktop`)

Reproduced: the smoke screenshot's plot area is 100 % pure black (one colour bin) in both the working-tree smoke and the
HEAD smoke (HEAD worktree, 49 PASS, same result). It predates DevLog-043: Graphics.svelte, renderer.ts, layers.ts and
plots.svelte.ts have no diff against HEAD.

Not the data, colour range, NaN, mesh or a lost context: the probe reads es.V 0.3545 V, the colour bar is 0..1 V,
`isContextLost()` false, no lost-context notice, `data-ntris` 460314 (refined r = 3), and the same view is correct about
1 s later (paints counter advanced).

Cause (renderer / canvas resize ordering): switching between a view with a legend gutter (Electric Potential, Electric
Field) and one without (Mesh) changes the canvas CSS width (771 <-> 862 px). The ResizeObserver callback in
Graphics.svelte (onMount) calls `renderer.resize`, which sets `canvas.width`; that clears the WebGL drawing buffer (opaque black with `alpha: false`), and the redraw is only scheduled with `requestAnimationFrame`, i.e. in
the next frame. ResizeObserver callbacks run after the rAF callbacks of the same frame, so that frame is presented with
a black canvas. Instrumentation (an observer registered after the component's, `gl.readPixels` at the canvas centre):
`[0,0,0,255]` at the end of every resize step, the drawn colour (e.g. `[80,203,181,255]`) only in the next rAF; same at
HEAD. In headless Chrome with the pointer resting over the plot (as in the smoke, after the probe hover) no frame is
produced until the screenshot forces one, so the capture lands on that frame deterministically
(`black-repro2.mjs`: Mesh and Electric Potential screenshots black, 1.5 s later correct). In a headed browser it is a
one-frame black flash per legend-width change.

## Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| F1 | Medium (pre-existing, DevLog-036; also at HEAD) | Toolbar checkbox desync for implied stages: with EO response selected, unchecking Optical mode or RF line (both seeded explicitly from the chain) leaves the toolbar box unchecked + disabled although the stage still runs as a dependency (Study page shows checked + disabled; Run uses it). `checked={selected \|\| auto}` evaluates true before and after, so Svelte does not write the DOM property back. The stage can then not be re-selected explicitly while EO response is on. Same pattern in Settings `stageToggle`. | 40 walk failures on yang2022, zhang2022, renaud2023, mao2022; `desync-probe.mjs` on both builds | In the `onchange` handlers, after `wb.toggleStage(...)`, set `e.currentTarget.checked = wb.selected.includes(id) \|\| !!wb.stageAuto(id)` (toolbar and Study); or key the input on `wb.selected` |
| F2 | Low (pre-existing; smoke artifact) | Black plot on the smoke `sim-desktop` screenshot: one-frame cleared WebGL canvas after a resize (section 3). | instrumentation and repro above; HEAD smoke also black | Graphics.svelte: draw in the same task as the resize (in the ResizeObserver callback cancel the pending rAF and call `frame()` after `renderer.resize`), or apply the backing-store resize inside `frame()` right before `draw()`. Smoke: wait for a paint after the view change (`data-paints` increment and canvas width = clientWidth) before `screenshot('sim-desktop')` |
| F3 | Low | Runner path: `checkStageSelection` applies only the combination rules, so `runCrossSection(han2023, {stages: ['semiconductor', 'eo_response']})` runs the full semiconductor stage (4176 ms) before failing on a statically known missing key (UI blocks it). | `combos.jsonl` | Optional: in `runSemiconductorOnly`, check `semiconductorStageErrors(config, name).eo_response` (without the rfSection / biasV overrides) before the solve |
| F4 | Info (by design) | A deselection is not reversed: after a YAML edit deselects a stage, undoing the edit unblocks it but leaves it unselected; deselecting Semiconductor (checkbox or `optics.solver: scalar`) keeps Optical mode, which silently changes from the stage's own mode to a cross-section solve with Laplace electrostatics on the doped silicon (the case SEMICONDUCTOR_CONFLICTS calls physically wrong when paired with the stage, but allowed alone). | walk `han uncheck semiconductor`, `han scalar` | Consider a Messages entry when Optical mode changes path; consider a readiness note for Laplace electrostatics on a config with a semiconductor block |
| F5 | Info | `stages=electrostatics` is dropped silently (no Messages entry) and the address bar keeps it. | walk links | `sanitizeStages`: report electrostatics as dropped ("implicit") so the URL is rewritten |
| F6 | Info (test artifact) | Playwright `fill` is not one undo step in the textarea; native edits undo / redo correctly and re-evaluate the rules. | `undo-probe.mjs` | none |

DevLog-043 claims verified: R1 (one rule set; runner and UI agree on 42/42 combinations; semiconductor + optical_mode +
eo_response with one optical solve and n_g reused), R2 (blocked stages never selectable or runnable through toolbar,
Study, Bias Sweep, links, YAML edits, undo/redo, config switch), R3 (no per-config state survives a switch; global
preferences kept), R4 (same reasons on toolbar, Study, Bias Sweep, Model Builder), and all gate counts. F1 and F2 are
pre-existing and outside DevLog-043's diff; no DevLog-043 regression found.
