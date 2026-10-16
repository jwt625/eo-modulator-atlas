---
title: Fresh-context audit of lane T7 (S8 silicon views and S7 polish in the /sim workbench, DevLog-042)
date: 2026-10-16
auditor: fresh-context Claude subagent (did not write the T7 code)
scope: DevLog-042 claims; app/src/lib/sim (semi.ts, semiOverlay.ts, BiasSelect.svelte, SemiResults.svelte, results.svelte.ts,
  requests.ts, derived.ts, labels.ts, Plot1D.svelte, Graphics.svelte, PlotGroupSettings.svelte, ResultsPages.svelte),
  app/src/lib/SimStageResults.svelte, app/scripts/smoke.mjs S8 step; engine semi-stage.mjs / semi/dataset.mjs (read only)
status: complete (2026-10-16 01:45-02:00 PDT)
---

# S8 UI audit (lane T7)

Report only: no repository file was changed except this report, no git command that changes state was run. All runs used
`nice -n 10`, one heavy task at a time, one headless Chrome (playwright-core, own temporary profile), preview on port 47833
(checked free before, free after). Scripts, JSON outputs, logs and screenshots were in the session scratchpad folder
`t7audit/`. The screenshots were deleted at the end. Nothing is left running.

Build time and concurrent engine edits (T4 round 3): `npm run build` ran 01:46:13-01:46:16 PDT. `engine/src/semi-stage.mjs`
then changed at 01:46:24, after the bundle was built. The Node reference runs (01:47-01:55) used the newer engine. The
browser and Node still agree to 1e-10 or better on every compared value, and both report the same VpiL convention strings.
`sims/han2023/config.yaml` changed on disk at 01:58:03, after all runs. This audit used the version read at 01:45.

## Gates (re-run)

| Gate | Result | Log (scratchpad `t7audit/`) |
|---|---|---|
| app `npm test` (vitest) | 72/72 pass (claim 72/72) | `test-20261016T014551.log` |
| `npm run check` | 0 errors, 0 warnings, 470 files (claim 0/0) | `check-20261016T014557.log` |
| `npm run build` | OK | `build-20261016T014613.log` |
| smoke | exit 0, 48 PASS (claim 48) | `smoke-20261016T014621.log` |

## Checks that pass (evidence)

- (1) han2023 was pasted with mesh level Coarse (2x edge), and the Semiconductor stage ran alone. Toolbar state:
  Optical mode unchecked, Electrostatics unchecked and disabled. In the worker the solve took 1.82 s wall time, with
  7,824 nodes and 7 bias points.
  - 2D probes against the Node store (`evaluateDerived` point, `semi:6` and `semi:0`). Probes at 8 points, (-0.1, 0.11),
    (-0.02, 0.15), (0.03, 0.05), (0.3, 0.11), (0, 0.155), (-1.5, 0.05), (1.5, 0.05), (0.1, 0.2) µm, match to a maximum
    relative difference of 6.6e-14 for: semi.Nnet, semi.n, semi.p, semi.psi, semi.delta_n (1) and semi.delta_alpha
    (1/cm).
  - Net doping sign: P++ -4e20, N++ +4e20, core -5e17 / +5e17 cm^-3. The Wave table puts blue on the acceptor side
    and red on the donor side, and the legend reads 1e20 ... -1e20. The junction contour is drawn at 0.
  - The n and p plots use a log scale (legend 4e12 to 4e20 cm^-3, 8-decade clamp).
  - The 1D CSVs equal the Node stage values at all 7 biases (relative difference 3e-11 or better): C', R', f_RC,
    dn_eff, d alpha, and the three VpiL series. Example at 5 V:
    - C' 0.204273 pF/mm, R' 5.46435 ohm mm, f_RC 142.584 GHz, dn_eff 2.08845e-4, d alpha -4.04105 dB/cm.
    - VpiL secant 1.85544, differential 2.81861, push-pull 1.40930 V cm.
    - At 0 V: secant null, differential 1.02337, push-pull null. This matches the engine (`vpilPushPullVcm` is null
      without a reverse DC bias).
  - Series names: "single arm, secant", "single arm, differential", "push-pull". The VpiL values sit on the right
    engine fields.
  - Paper target: c_pf_per_mm 0.15 at 3.5 V is drawn on C'(V). Its CSV label is "han2023-a (comparable: false)",
    and the engine status is not_evaluated.
- (2) Bias selection is per view.
  - Hole Density was switched to bias point 0. Its title became "Dataset: Semiconductor, cathode = 0 V ...", and its
    probes equal Node `semi:0`.
  - Electron Density stayed at "cathode = 5 V" (probes equal `semi:6`). Delta n at bias 0 equals Node.
  - Options: "last (cathode = 5 V)" plus 0-5 V. No reference entry is listed because 0 V is a bias point (D1).
  - Derived values: Surface Average of semi.n over the Semiconductor selection has a "cathode bias (V)" column. Values
    equal Node: 1.2702662115068659e26 (5 V) and 1.2703413307519642e26 (2 V) 1/m^3.
- (3) Semiconductor page:
  - The per-bias table matches the Node stage values and the units are in the headers.
  - Models are listed with locators: Sproul-Green n_i 1.0037e10 cm^-3, Masetti / Caughey-Thomas, Nedeljkovic 1.55 µm
    row with coefficients.
  - Density basis and delta-eps order are shown. The VpiL convention tooltips come from the engine `vpilConventions`.
  - Mesh and optical statistics are shown. The target is shown as "not evaluated (comparable: false)", followed by the
    model limitations.
- (4) S7 notices on yang2022-a and zhang2022-a match the engine result fields: reference / normalization, DC series R
  25.7 / 21.9 ohm, f_lat 0.372 / 0.273 GHz, and the slab model limits.
  - Dielectric loss none: only yang2022 (engine `rf.dielectricModel` none). zhang2022 is tan_delta_regions and shows
    no such notice.
  - Thin conductor: not shown, which is correct because `thinConductorBelowGhz` is null for both.
  - The same strip appears on the EO Response plot and on the RF Line page.
- (6) User taste checks:
  - Dark theme by default (`data-theme="dark"`, body rgb(13, 13, 13)).
  - Radius scan of elements and ::before/::after: 0 rounded, on Derived Values, the Semiconductor page, the Physics
    Semiconductor page, Net Doping with a hovered legend, and both S7 runs.
  - No emoji (Extended_Pictographic scan) and no page or console errors.
  - Units are absolute (1/cm^3, V, 1/cm, pF/mm, ohm mm, GHz, V cm). Every 1D plot has log x / log y toggles.
- (7) Performance (production build, `?pool=2`, Coarse):
  - First plot (Net Doping) painted 26.7 ms after the result; the worker plot took 17.1 ms. Other views plot in
    3-4 ms.
  - A bias switch repaints in 32 ms.
  - Zero long tasks over 50 ms during the solve, every view switch, the bias switches, the 1D CSVs and the S7 runs.
    PerformanceObserver longtask was used. Sanity check: the same observer in the same headless Chrome caught a
    120 ms busy task.

## Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| F1 | Medium | The Delta n and Delta alpha default colour ranges are set by the 4e20 cm^-3 contact regions, so the core, where the mode is, renders as one colour. | han2023 at 5 V: the displayed range is -0.364 to -1.5e-22 (Delta n) and 4e-25 to 9795 1/cm (Delta alpha, linear scale). The core values are -1.04e-3 to 0 and up to 4.0 1/cm. The screenshot shows the core and the mode contour on a flat red. | Proposal below. |
| F2 | Medium | The label of `semi.VpiL_diff` is out of date against the engine. The UI says "central difference of dn_eff over the bias list". The engine (round 3, `addVpiL`) uses the small-signal derivative from the +-dv/2 states, convention `single_arm_small_signal_central_dv`. The push-pull description does not say that the value is null at zero or forward DC bias, and the engine reason (`vpilPushPullReason`) is not shown anywhere. The plot and CSV show only an empty cell at 0 V. | `app/src/lib/sim/semi.ts:125-126`, `engine/src/semi-stage.mjs:248-266`. | Take the descriptions from `optics.vpilConventions`, or restate them as "small-signal, +-dv/2 at the bias" and "lambda / (4 \|dn_eff/dV\|), reverse DC bias only". Show `vpilPushPullReason` in the table tooltip and the 1D hover for null points. |
| F3 | Low | A comparable: false target looks the same as a comparable one: the same diamond and legend "paper". The flag appears only in the hover label and the CSV. | C'(V): the 0.15 pF/mm marker at 3.5 V is drawn like the S7 comparable targets. | Use a hollow or grey marker and a legend entry "paper (comparable: false)". |
| F4 | Low | The top-level `vpi_l_dc_vcm` 0.96 V cm (comparable: false, vpi_convention unspecified) is not on VpiL(V) and not on the Semiconductor page. Only semiconductor-block targets are overlaid. | `biasTargetPoints` reads only `semiconductor.targets`. | Optional. List it on the Semiconductor page under "config targets (convention unspecified, not overlaid)". Do not plot it on any one variant. |
| F5 | Low | The S7 lateral-relaxation notice is the same warning for both configs, but the engine flags only yang2022. yang2022's target band (from 0.01 GHz) reaches below f_lat; zhang2022's reference is 1 GHz, above f_lat 0.273 GHz. The yang2022 target diagnostic `wheeler_step_check_spread_above_1e-2` is not in the EO Response strip (it appears only as RF-page text). The unstated-reference notice shows the DC / 1 / 3 GHz values only in the tooltip. | Node `response.byTarget[].diagnostics`: yang2022 has slab_model_limits and band_below_lateral_current_relaxation_estimate; zhang2022 has slab_model_limits only. | Split the notice by engine code: "target band below f_lat" (warn) versus "curve below f_lat only" (info). Add the Wheeler step-check spread notice. Put the reference-sensitivity values in the visible text. |
| F6 | Low | The Net Doping legend tooltip gives the \|v\| range only: "symlog scale, range 4.37e14 to 4e20". The signed range is not stated. | legend `data-tip`. | Write "-4e20 to 4e20 1/cm^3 (\|v\| from 4.37e14)". |
| F7 | Low | Electron and Hole Density titles and legends use the raw names "semi.n" / "\|semi.n\|". Net Doping and Delta n use descriptions. | Titles: "Surface: semi.n (1/cm^3)". | Add the descriptions "electron density" / "hole density". |
| F8 | Low | Hovering in the oxide shows 0 for n, p, N_net, delta_n and delta_alpha, for example at (0.3, 0.11) µm, outside the Semiconductor selection. The engine stores 0 there and Node returns the same, so the value is computed, not undefined. | probe results. | Probe the feature's selection. Outside it, show "outside selection" (COMSOL shows no value) instead of 0. |
| F9 | Low | Derived values on semi.* default to the SI unit (avg(semi.n) in 1/m^3). Plots use the variable's display unit (1/cm^3). | Derived table column "avg(semi.n) [Semiconductor] (1/m^3)". | Default the unit to the engine `displayUnit`. |
| F10 | Low | Several labels are hard-coded or inconsistent. Semiconductor page headers use "ohm mm" while plots use Ω·mm. The dn_eff column tooltip and the `semi.dneff` description say "first-order" whatever `delta_eps` is: they would be wrong for `exact`. | `SemiResults.svelte` COLS / tip, `semi.ts` BIAS_DEFS. | Use Ω, and take the order from `models.plasmaDispersion.deltaEps`. |
| F11 | Low | Physics > Semiconductor overlay labels overlap at 1440 px: "anode ohmic 0 V" is drawn over "p_plusplus N_A 4e20 cm^-3". The same happens at the cathode. | screenshot of Physics > Semiconductor. | Offset contact labels above the electrode, or skip a doping label that collides with one. |
| F12 | Info | A Semiconductor-only run lists 4 "blocked" messages for stages that were not selected (EO overlap, RF line, Loaded line, EO response). The Config dropdown still reads "chen2022-c" while the pasted han2023-a YAML is loaded (DevLog-042 open item; atlas.json predates the config). | Messages panel. | Limit blocked messages to selected stages. Regenerate atlas data (outside this lane). |
| F13 | Info | Round-3 engine fields are not shown and are not in `SemiResult`: `perLength.gSPerM` (G'), `optics.dneffPerV`, `optics.dalphaDbPerCmPerV`, `operatingBiasV`, `vpilPushPullReason`. `semiconductor.operating_bias_v` (now a schema key) is not on the Bias Sweep page. | `noderef` JSON keys; `engine/schema/sim.schema.json` `$defs/semiconductor`. | Follow-up after T4 round 3 lands: add G'(V), d dn_eff/dV and operating bias to the Bias sweep dataset and the table. |
| F14 | Info | The n and p log scale clamps 8 decades (4e12 to 4e20) while the data reach 1.1e-5 cm^-3. The whole depletion region renders at the floor colour. Acceptable, but the legend tooltip does not say "clamped". | `__simDrawn` min 1.1e-5. | Add "values below 4e12 at the floor colour" to the tooltip. |

## F1 proposal: default range for Delta n (Node numbers, han2023, meshScale 2, 5 V, 4,146 silicon nodes)

| Candidate default | Delta n range | Effect |
|---|---|---|
| current (all silicon) | -0.364 to -1.5e-22 | core invisible |
| optical window (\|x\| <= 1.6 µm) | -0.364 to -1.5e-22 | no help: the window includes P++/N++ beyond 0.85 µm |
| region selection (core_p, core_n) | -1.04e-3 to 0 | works for han2023 only because the rib is a region. The slab regions run into the contacts, so this does not generalise. |
| percentile clip (1/99 %) | -0.364 to -3.4e-22 | no help: contacts are most of the nodes (median -0.281) |
| mode region, \|E\|^2 >= e^-2 max (801 nodes) | -1.04e-3 to 0; Delta alpha up to 4.01 1/cm | shows the core, independent of the geometry |
| mode region, \|E\|^2 >= 1e-2 max (1,139 nodes) | -3.29e-3 to 0; Delta alpha up to 20.2 1/cm | includes the P+/N+ tails |
| bias-induced change, delta_n(V) - delta_n(V0) | 0 to 1.03e-3 over all silicon; contacts below 2.6e-15 | exactly the integrand of dn_eff under density_basis absolute |

Recommendation:

1. Make the default "Delta n" group the bias-induced change. It is what the engine perturbs for dn_eff:
   f(N(V), P(V)) - f(N(V0), P(V0)). It is zero in the bias-independent contact regions, so the plain data range is
   right on any geometry, the way COMSOL users plot `withsol` differences. This needs an engine store variable next
   to the existing `semi.dN` / `semi.dP` (for example `semi.ddelta_n`, `semi.ddelta_alpha`, vs the reference bias).
   That is an engine-lane request; the UI cannot form cross-dataset differences today. Do the same for Delta alpha.
2. Keep the absolute "vs undoped Si" plots as secondary groups. Give them an automatic range from the optical-mode
   region (nodes with \|E\|^2 >= e^-2 of the peak). Values outside are clamped, as in a COMSOL manual range with
   out-of-range colours. State the range rule in the legend tooltip so the probe stays exact and the units absolute.
   Default Delta alpha (always positive, about 28 decades: 4e-25 to 9.8e3 1/cm) to a log scale.

## Other observations (not T7)

- yang2022-a and zhang2022-a load with "EO response" unchecked, although their `chain` includes eo_response. The toolbar
  does not seed the stages from `chain`. This predates T7 and is not caused by it.
