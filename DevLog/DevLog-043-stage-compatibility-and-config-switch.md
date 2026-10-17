---
title: Stage compatibility (optical + semiconductor) and per-config UI state on config switch
date: 2026-10-16
status: implemented (gates passed); fresh-context verification and commit pending
owner: orchestrator (Claude, at Wentao Jiang's request); implementation and verification by subagents
scope: engine runner stage rules, /sim stage selection and per-config state
---

# DevLog-043: stage compatibility and config-switch state

## User report (2026-10-16)

1. "Why is the optical and semicond solver mutually exclusive?"
2. "When I changed solver config to one case, when I switch the config to another case, it inherits and could even
   enable the blocked solver. Make sure the UI/UX logic is consistent."

## Diagnosis (orchestrator, from code)

- Exclusivity is a runner rule, not physics: `engine/src/run.mjs:404` throws "the semiconductor stage runs alone"
  for any other stage; the UI mirrors it (`app/src/lib/sim/workbench.svelte.ts`, `SEMI_COMBINABLE = ['eo_response']`).
  The semiconductor stage already solves the vector optical mode internally (plasma-dispersion perturbation), so a
  separate `optical_mode` stage is redundant but should be selectable and should expose that same mode (no second
  solve). What is genuinely incompatible on a drift-diffusion device cut: the Laplace `electrostatics` stage on the
  same doped-silicon section (silicon is a semiconductor there, not a dielectric) and the Pockels `eo_overlap` stage
  (no Pockels material); the RF electrode line is a separate `line.rf_section` and is already handled by the
  junction-loaded `eo_response`.
- Config switch: the stage selection (and possibly other per-config UI settings) survives a config change, so a
  stage chosen for config A stays selected for config B even when B blocks it.

## Requirements

- R1 Engine: a single stage-compatibility function (exported, typed) that, for a parsed config and section, returns
  per stage: available / blocked (reason) / implied-by / conflicts-with, used by both runner and UI (one source of
  truth). Allowed combination with a semiconductor block: `semiconductor` + `optical_mode` (mode from the
  semiconductor stage's solve, reported as `result.optical` and dataset `opt`, no duplicate solve) + `eo_response`
  (+ implied `rf_line` on `line.rf_section` when the keys exist). `electrostatics` and `eo_overlap` on the device
  cut are rejected with a physics reason stated in the message.
- R2 UI: stage checkboxes, readiness and blocked reasons come only from that function; a blocked stage can never be
  selected or run (including via URL parameters, form edits, YAML edits, undo/redo, or config switch); changing
  YAML re-evaluates compatibility and deselects newly blocked stages with a log entry.
- R3 Config switch: all per-config UI state resets to the new config's defaults (stage selection = chain stages that
  are available, solver/element-order/metal-policy form state from the new YAML, parameter overrides, sweep
  definitions, selections, plot groups, results); only global preferences persist (theme, renderer, worker pool,
  panel layout). URL `stages=` applies only to the config it was created for.
- R4 Consistency: same rules for the toolbar, the Model Builder Study node, the Bias Sweep page and keyboard/URL paths.

## Gates

- Engine tests for the compatibility function and the runner on: a TFLN config, han2023, the semiconductor fixture
  with `line.rf_section` (semiconductor + optical_mode + eo_response), and rejected combinations with reasons.
- Smoke: toggle stages on config A, switch to B (where some are blocked) and back: no inheritance, blocked stages
  disabled and unselected; URL with a blocked stage is sanitized; semiconductor + optical_mode runs and the optical
  dataset equals the semiconductor stage's mode (Node).
- Full engine suite, test:reference, app test/check/build/smoke.

## Implementation plan (2026-10-16 15:29 PDT, implementing subagent)

Findings from the code (before edits):

- Inheritance on config switch: `+page.svelte` resets text/result/section, `Workbench.load` resets results, overrides
  and sweep rows, but `selected` is only replaced when the URL has `stages=` or when `seedStages()` succeeds; it returns
  early for a chain with a blocked stage (e.g. chen2022) or an empty chain, so the previous config's selection
  (including `semiconductor`) survives. `meshScale`, `sweepStudy` / `sweepPath` / `sweepSpec` / `sweepTargets` /
  `sweepMetric`, `node`, the per-page solution pickers (`eoPoint`, ...), ruler and highlights also survive.
- Solver / element order / metal policy forms are derived from the YAML (`wb.raw`), so they follow the loaded text; the
  inherited part is the session state above plus `overrides` written before the switch (cleared by `load`).
- The UI exclusivity is implemented twice (`SEMI_COMBINABLE` + `toggleStage` clearing) besides the runner rule;
  readiness ignores the semiconductor path (eo_response after the semiconductor stage is checked against the run
  section's rf_line, not `line.rf_section`), and `stageErrors.semiconductor` misses the run-time checks
  `optics.solver: vector` and the wavelength equality of `semiconductor.optics`.
- The semiconductor run already exposes its own vector mode (`result.optical`, store dataset `opt` with `keep`); the
  junction-loaded eo_response solves the mode once more for the group index (unchanged here; open item).

Design (one source of truth):

1. `engine/src/stage-compat.mjs` (+ `.d.mts`): pure, typed `stageCompatibility(selected, context)` returning per
   stage `{selected, runs, impliedBy, blocked, conflictsWith, note}` plus `path` ('cross_section' | 'semiconductor'),
   `run` (stage order) and `invalid` (selected stages that are blocked, with reasons); `sanitizeStages(candidates,
   context)` (deterministic priority: semiconductor first, then STAGES order; each candidate kept only when available
   given the kept set; dropped list with reasons); `checkStageSelection(stages, raw)` for the runner (combination
   rules only; readiness stays in the stage option functions so existing runner messages are unchanged).
   Context = `{hasSemiconductor, topology, readiness (stageErrors), semiReadiness}`; `config.mjs`
   `semiconductorStageErrors(config, section)` gives the readiness of `optical_mode` and `eo_response` on the
   semiconductor path, and `inspectConfig` returns `stageContext`.
2. Rules with a `semiconductor` block selected:
   - allowed: `optical_mode` (the semiconductor stage's own vector mode; needs `semiconductor.optics`; no second
     solve), `eo_response` (needs `line.rf_section`, `semiconductor.operating_bias_v`, `semiconductor.optics`, the line
     inputs on the electrode section; uniform line only), `rf_line` only as the implied dependency of `eo_response`
     (on `line.rf_section`).
   - rejected with a reason: `electrostatics` (Laplace solve with fixed permittivities; the doped silicon is a
     semiconductor whose free carriers screen the field, the stage solves its own Poisson equation), `eo_overlap`
     (needs the Laplace field and a Pockels tensor; the device cut modulates by plasma dispersion, reported by the
     stage as dn_eff(V)), `rf_line` without `eo_response` (the device cut's line would treat doped silicon as a
     dielectric; the junction-loaded line runs on `line.rf_section`), `loaded_line` (a junction-loaded periodic line is
     not implemented).
   - Conflicts are symmetric in the UI: a stage that conflicts with a selected stage is disabled with the reason
     (no silent clearing of other stages).
3. Runner: `runConfig` calls `checkStageSelection`; `runSemiconductorOnly` accepts `optical_mode` (stages
   `['semiconductor', 'optical_mode', 'rf_line', 'eo_response']` as run), sets `metrics.n_eff` from the stage's mode,
   `result.optical.source: semiconductor_stage`, compares config targets of computed metrics, and with
   `fields: true` exports the mode as `result.fields.optical`.
4. UI: `Workbench.compat` derived from `stageCompatibility(selected, stageContext)`; toolbar, Study, Bias Sweep and
   Model Builder tags read it; `toggleStage` only adds available stages; an effect re-evaluates on text / section /
   selection change and deselects newly blocked stages with a log entry naming the cause and reason (skipped while
   the whole input does not parse, so typing does not clear the selection); `resetConfigState()` on every config
   switch resets all per-config state; seeding = chain stages kept by `sanitizeStages` (dropped ones logged); URL
   `stages=` applied only when the URL's `id` (or `config`) names the loaded config, sanitized, and the address bar
   rewritten without the dropped stages.
   Global preferences kept: theme, renderer, worker pool, panel sizes, graphics display toggles (tool, wireframe,
   windows, domain labels, mesh color), tree collapse state, log.
5. Contract changes (tests adjusted only there): "the semiconductor stage runs alone" error text; smoke step
   "semiconductor stage runs alone" now asserts the optical mode stays selected; chain seeding keeps the available
   subset (chen2022 loads with loaded_line; optical_mode blocked by metal in the window since the follow-up), so smoke loads that need the electrostatics-only baseline
   pass `stages=`.

## TODO

- [x] Implementation (engine runner rule + compatibility function; UI state model and config-switch reset).
- [x] Fresh-context verification (scripted UI walk across configs; engine combinations).
- [ ] Commit on request.

## Progress log

- 2026-10-16 Plan written; implementation delegated to one subagent (no other lane active).
- 2026-10-16 15:29 PDT Implementation plan written (section above).
- 2026-10-16 15:46 PDT Implemented and gated (implementing subagent):
  - Engine: `engine/src/stage-compat.mjs` (+ `.d.mts`) `stageCompatibility`, `sanitizeStages`, `checkStageSelection`,
    `SEMICONDUCTOR_CONFLICTS` / `SEMICONDUCTOR_COMPANIONS` (reasons in sims/SPEC.md, Stage contract matrix);
    `config.mjs` `semiconductorStageErrors`, `inspectConfig().stageContext`, `stageErrors.semiconductor` now checks
    `optics.solver: vector`, the wavelength equality and the optical window of the stage's mode solve;
    `run.mjs` `runSemiconductorOnly` uses `checkStageSelection` (error `Stage selection: <stage>: conflicts with
    semiconductor: <reason>` before any solve), runs `optical_mode` as the stage's own mode (`metrics.n_eff`,
    `result.optical.source: semiconductor_stage`, warning `optical_mode_from_semiconductor_stage`, n_eff targets
    compared, `fields: true` exports the mode), stages `['semiconductor', 'optical_mode', 'rf_line', 'eo_response']`.
  - UI: `Workbench.compat` (engine rule set) drives toolbar, Study and Bias Sweep toggles (Bias Sweep: Optical mode and
    EO response with their semiconductor-path readiness) and Model Builder tags; `toggleStage` adds only unblocked
    stages (no silent clearing); `enforceCompatibility` (page effect on text / section / selection) deselects newly
    blocked stages with a Messages entry `YAML edit: <stage> deselected (<reason>)`; `resetConfigState` on every
    switch; chain seeding by `sanitizeStages`; link stages scoped by `urlStagesFor` (id or config path), sanitized,
    dropped ones in Messages, address bar rewritten (`replaceState`). Derived Values shows the semiconductor-stage mode
    and "no Laplace electrostatics" instead of the optical-stage / mode-only text for semiconductor results.
  - Contract changes: the "runs alone" rule and its smoke assertion; a YAML edit that blocks a selected stage now
    deselects it (smoke "blocked-stage guard" step updated); chen2022 seeds optical_mode + loaded_line (smoke loads
    of chen2022 pass `stages=` for their electrostatics-only baseline).
  - Gates: engine `npm test` 330 tests, 327 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5)
    (`engine-test-20261016T153408.log`, scratchpad); new `tests/stage-compat.test.mjs` 7/7 (yang2022, chen2022,
    han2023, semiconductor rib with `line.rf_section`, rejected combinations with reasons, one optical solve);
    `npm run test:reference` 15/15 (`engine-ref-20261016T154424.log`); app `npm test` 75/75 (new link-scoping test),
    `npm run check` 0 errors / 0 warnings, `npm run build` OK, `npm run smoke` exit 0 with 50 PASS
    (`app-smoke-20261016T154306.log`), new steps: yang2022-a -> han2023-a -> yang2022-a without inheritance (stages,
    mesh level), conflicting stages disabled with the reason on toolbar / Bias Sweep / Study, link
    `stages=semiconductor,eo_overlap,optical_mode,bogus` sanitized to `optical_mode,semiconductor` in the address bar
    with Messages entries; han2023 semiconductor + optical_mode: browser n_eff and dataset opt (Mode Analysis solved
    row) = Node semiconductor-stage mode. Screenshots inspected (session scratchpad, deleted).
  - Open: the junction-loaded eo_response still solves the mode a second time for n_g (config.materials, i.e. without
    the stage's explicit-index override); run-time-only failures (forward-bias operating point, optical metal in the
    window of chen2022's seeded optical_mode) are not readiness checks; a fresh-context UI walk is not yet run.
- 2026-10-16 15:48 PDT Follow-up plan (orchestrator request):
  1. eo_response after the semiconductor stage reuses the stage's own mode: `runSemiconductor` keeps the group index
     of its vector solve (perturbation n_g = `mode.ng` of the same solve, no extra eigen solve; finite difference only
     when eo_response asks for it), same materials (explicit-index override included); `runJunctionResponseStage` takes
     n_g from the stage result (`optics.ng_fixed` when `group_index_from: fixed`) instead of a second solve on plain
     materials. Tests: one optical solve in the progress log, response n_g = stage mode n_g.
  2. Readiness of statically detectable run-time failures: conductor (electrode or conductor region) overlapping the
     optical window or an EO arm window with positive area under `metal_in_window: reject` (optical_mode, eo_overlap,
     semiconductor optics); forward-bias `semiconductor.operating_bias_v` for eo_response (contact doping type from the
     doping at the contact boundary, same rule as the device: sign of the length-weighted net doping; forward bias =
     mean p-contact bias - mean n-contact bias at the operating point).
  3. Survey: every published config, its seeded stage set (sanitizeStages of the chain) run once in Node, sequential,
     nice; each run-time failure either moved into readiness or listed with the reason it cannot be static.
- 2026-10-16 16:05 PDT Follow-up implemented and gated:
  1. `runSemiconductor` reports the group index of its own vector solve (`optical.ng`, `optical.groupIndexMethod`;
     perturbation n_g = `mode.ng` of the same solve, no extra eigen solve; option `groupIndex` adds the finite
     difference when configured); `runJunctionResponseStage` uses it (`optics.ng_fixed` when fixed) and no longer
     solves the mode a second time on plain materials; with optical_mode `metrics.ng_opt` is reported. Tests: one
     optical progress message for semiconductor + optical_mode + eo_response, `response.ngOpt` = stage mode n_g;
     s7-semi-twe synthetic result now carries `optical.ng` (contract change).
  2. Readiness (config.mjs): conductor (electrode or conductor region) overlapping the optical window or an EO arm
     window with positive area under `metal_in_window: reject` (optical_mode, eo_overlap, semiconductor optics);
     library dispersion outside its validity range at the wavelength for a material meshed in a mode window (same
     rule as the solvers; the semiconductor stage's explicit-index override honoured); electrodes sharing a boundary
     segment (mesher rule; blocks every stage of the section, and the implicit electrostatics stage is now an
     `invalid` entry so Compute is disabled); forward-bias `semiconductor.operating_bias_v` for eo_response (contact
     doping type from the doping sampled along the contact boundary, forward = mean p - mean n bias).
  3. Survey (`survey-043.jsonl`, scratchpad; each config's seeded set plus every stage enabled on its own and each
     semiconductor companion, run once in Node, sequential, nice): before the readiness additions 2 failures in the
     seeded sets (lin2026a optical_mode / eo_overlap: lithium_tantalate dispersion invalid at 375 nm; meng2023
     electrostatics: electrodes signal_au and signal_ito share an edge), plus chen2022 optical_mode (metal in the
     window); after: 133 runs ok, 0 errors, 7 configs skipped (input boundary fails, solve blocked in the UI as
     before), meng2023 blocked by readiness. Static readiness agrees with the run in tests (chen2022, lin2026a,
     meng2023, forward-bias rib). Remaining run-time-only failures (not static): mesh vertex budget, mode convergence
     and mode selection, the lossy-metal surface-plasmon guard, Wheeler recess collapse, drift-diffusion Newton
     convergence, non-physical results; they need the mesh or a solve.
  - Seeds now: chen2022 loads with loaded_line only (optical_mode blocked), lin2026a and meng2023 with none.
  - Smoke changes: chen2022 Optical mode asserted disabled with the metal reason; the run-time error step uses a
    200-vertex mesh budget (mesh-dependent, engine message) instead of chen2022 optical_mode; the chen2022 EO response
    readiness reason is now the blocked optical mode.
  - Gates: engine `npm test` 333 tests, 330 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5)
    (`engine-test-20261016T155807.log`); `tests/stage-compat.test.mjs` 10/10; `test:reference` 15/15
    (`engine-ref-20261016T160013.log`); app test 75/75, check 0 / 0, build OK (`app-*-20261016T160056.log`); smoke exit
    0, 50 PASS (`app-smoke-20261016T160430.log`). Screenshots inspected and deleted.
- 2026-10-16 Orchestrator: fresh verification (`DevLog/audits/simulator-stage-compat-verification-2026-10-16.md`):
  gates reproduce (engine 333: 330/0/2/1; reference 15/15; app 75/75, check 0/0, build, smoke 50); UI walk on 9
  configs (1501 checks): no inheritance across 9 switch scenarios (25 fields equal a fresh load), blocked stages
  never selectable/runnable via any path; engine prediction = runner on 42/42; single optical solve with ng reuse.
  Black potential plot: predates DevLog-043; one black frame after a canvas resize (WebGL buffer cleared, redraw on
  next animation frame). Findings F1 (medium, implied-stage checkbox state), F2 (black frame), F3, F4 (deselecting
  semiconductor leaves optical_mode running Laplace electrostatics on doped Si), F5. Decision F4b: on sections with a
  semiconductor block, `electrostatics` is unavailable and `optical_mode` alone runs mode-only. Round 3 sent.
- 2026-10-16 16:27 PDT Round 3 plan (audit `DevLog/audits/simulator-stage-compat-verification-2026-10-16.md`):
  F1 an implied stage is reported implied whether or not it is also selected; toolbar and Study show it checked and
  disabled with the reason while implied, its explicit state when not, and every change handler writes the checkbox
  back from the rule set. F2 Graphics: the ResizeObserver callback draws in the same task (no cleared frame); smoke
  waits for a paint and the resized backing store before `sim-desktop`. F3 runner: readiness (`stageErrors`,
  `semiconductorStageErrors` with the rfSection / biasV overrides) of every stage that will run is checked before any
  solve on all paths. F4b a section whose regions use a `semiconductor` block material has no Laplace electrostatics
  (physics reason), with or without the semiconductor stage; eo_overlap, rf_line, loaded_line and the cross-section
  eo_response need it and are blocked there; optical_mode alone runs mode-only (runner dispatch to runModeOnly; path
  `mode_only`); with nothing runnable selected Compute is blocked. F4a a YAML-tab undo / redo is logged, naming the
  stages deselected by the edit that can run again (not re-selected, by design). F5 `stages=electrostatics` (implicit)
  is reported as dropped, so the link is rewritten with a Messages entry.
- 2026-10-16 16:43 PDT Round 3 implemented and gated:
  - F1: `stageCompatibility` reports `impliedBy` also for a selected stage; toolbar and Study show an implied stage
    checked and disabled with "dependency of EO response", the explicit state once not implied, and both change
    handlers write the checkbox back from `compat.stages[id].runs` (no DOM / state disagreement).
  - F2: Graphics.svelte ResizeObserver callback cancels the pending rAF and draws in the same task after the backing
    store resize; smoke waits for a paint and the resized canvas before `sim-desktop` (screenshot inspected: the
    potential is drawn, no black frame).
  - F3: `runConfig` checks `stageErrors` of every stage that will run before any solve (cross-section and mode-only
    paths); `runSemiconductorOnly` checks the semiconductor stage readiness and `semiconductorStageErrors` with the
    `rfSection` / `biasV` overrides (operating bias in the sweep, forward bias) before the drift-diffusion solve.
    Contract changes in tests: eo-rf-runner (no Pockels material: readiness message instead of the zero-phase error),
    optical-runner (metal in the window: readiness message; the solver message stays tested in optics.test.mjs).
  - F4b: `semiconductorSection(raw, geometry)` (a region uses a semiconductor-block material) -> context
    `semiSection`; there electrostatics is unavailable (`SEMICONDUCTOR_SECTION_REASON`), eo_overlap / rf_line /
    loaded_line / eo_response are blocked ("needs the Laplace electrostatics stage"), optical_mode alone runs
    mode-only (path `mode_only`, runner dispatch to runModeOnly), nothing runnable blocks Compute ("Nothing to run"
    Messages entry). Toolbar Electrostatics and the tree tag follow `compat.stages.electrostatics.runs`.
  - F4a: a YAML-tab undo / redo is logged; a Messages entry names the stages deselected by a YAML edit that can run
    again but stay deselected.
  - F5: `sanitizeStages` reports an explicit `electrostatics` as dropped (implicit), so the link is rewritten with a
    Messages entry.
  - Survey re-run (`survey-043-r3.jsonl`): 133 sets predicted runnable and run ok, meng2023 predicted blocked and
    rejected, 7 configs skipped (input boundary), 0 mismatches.
  - Gates: engine `npm test` 334 tests, 331 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5);
    `stage-compat.test.mjs` 11/11; `test:reference` 15/15; app test 75/75, check 0 / 0, build OK, smoke exit 0 with
    51 PASS (new steps: F1 toolbar and Study, F4b han2023 without the semiconductor stage incl. mode-only n_eff = Node,
    F5 link; F3 as a Node precondition). Logs (scratchpad): app-build-20261016T164037.log app-check-20261016T164037.log app-smoke-20261016T164146.log app-test-20261016T164037.log engine-ref-20261016T163612.log engine-test-20261016T163427.log survey-043-r3-20261016T163707.log survey-043-r3.jsonl 
- 2026-10-16 Round 3 done (F1 implied-stage checkbox state, F2 synchronous redraw on resize, F3 runner readiness
  before any solve, F4b no Laplace electrostatics on doped-silicon sections and mode-only optical_mode there, F4a undo
  logged, F5 link rewrite). Orchestrator gate run on the final tree (sequential, nice): engine 334 (331 pass, 0 fail,
  2 skipped, 1 todo); reference 15/15; app 75/75, check 0 errors 0 warnings (471 files), build OK, smoke 51 PASS.
  26 changed/untracked entries; nothing committed.
