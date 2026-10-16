# Simulation config spec: `eo-atlas.sim/v1`

Contract between three parties: the distillation skill (writes configs), the browser engine in `engine/` (runs them), the app `/sim` route (shows them). Status: draft 1, 2026-10-01. The engine author may refine it; every change must be recorded in the Changelog at the bottom and mirrored in `engine/schema/sim.schema.json`.

**Implemented subset:** electrostatics (P2 default), full-vector optical modes (default; scalar selectable), DC EO overlap with
explicit arm windows (`eo_overlap`) and the uniform RF line with explicit loss
declarations (`rf_line`); see "Stage contract (E2i.2, E3i, U3)" below. Loaded-line
cascades and the EO response are recognised but not implemented. The example uses
placeholder coordinates and is not itself a runnable config.

Rules
- A config holds inputs only: geometry, materials, line and optical settings, and the paper-reported targets with tolerances. Solver outputs are never stored.
- Lengths use explicit unit suffixes in keys (`_um`, `_nm`, `_mm`), frequencies `_ghz`, impedance `_ohm`, conductivity `_Sm`. The engine converts to SI.
- Every parameter that came from a paper carries a provenance entry under `provenance`, keyed by the dotted parameter path, with `class` in `paper_exact | figure_digitized | project_inference | standard_reference | unknown` and a `locator` (page / figure / table of `references/<paper_id>/text.md` pages) or a citation key for `standard_reference`. `unknown` values may not be silently defaulted: leave them out and list them under `missing`.
- File is YAML 1.2 (parsed in the browser with a real YAML parser) and also valid as JSON after parsing.

```yaml
schema: eo-atlas.sim/v1
id: chen2022-a                    # = device_id in data/devices.csv
paper_id: chen2022
device_id: chen2022-a
title: short human title            # not a claim of reproduction
repro_grade: A                      # A | B (C has no config)
validation_status: unvalidated      # unvalidated | analytic_gates_pass | literature_regression | cross_solver
chain: [electrostatics, optical_mode, eo_overlap, rf_line, loaded_line, eo_response]   # subset allowed

optics:
  wavelength_nm: 1550
  polarization: TE                  # quasi-TE | quasi-TM
  mode_index: 0
  group_index_from: perturbation    # default; or finite_difference_wavelength, fixed
  ng_fixed: null
  eo_axis: auto                     # engine derives the Pockels contraction from crystal + cut

materials:                          # name -> properties (tensors in the crystal frame)
  lithium_niobate:
    crystal: {cut: x, propagation: y}     # lab frame: x lateral, y film normal (up), z propagation
    n_o: 2.211
    n_e: 2.138
    eps_r: {perp: 43.0, par: 28.0}        # RF relative permittivity
    r_pm_per_v: {r13: 8.6, r22: 3.4, r33: 30.8, r51: 28.0}
    # tan_delta_rf: only when a source gives it; absent = unknown, never zero
  silicon_dioxide: {n: 1.444, eps_r: 3.9}
  gold: {conductor: true, sigma_Sm: 4.1e7, n_complex: null}
  air: {n: 1.0, eps_r: 1.0}

geometry:                           # cross-section; origin on the optical axis; symmetry optional
  symmetry: none                    # none | x_mirror_odd (differential/push-pull half-domain)
  domain: {x_um: [-100, 100], y_um: [-50, 40]}
  regions:                          # painter order: later wins
    - {name: substrate, material: silicon, polygon_um: [[-100,-50],[100,-50],[100,-3],[-100,-3]]}
    - {name: box, material: silicon_dioxide, rect: {x_um: [-100,100], y_um: [-3,0]}}
    - {name: ln_slab, material: lithium_niobate, rect: {x_um: [-100,100], y_um: [0,0.25]}}
    - {name: ln_rib, material: lithium_niobate, polygon_um: [[-0.7,0.25],[0.7,0.25],[0.5,0.6],[-0.5,0.6]]}
  electrodes:
    - {name: signal, role: signal, weight: 1.0, rect: {x_um: [..], y_um: [..]}, material: gold}
    - {name: ground_l, role: ground, weight: 0.0, rect: {x_um: [..], y_um: [..]}, material: gold}
  optical_window: {x_um: [-3, 3], y_um: [-1, 1.5]}   # crop for mode solve
  mesh: {max_edge_um: 0.1, electrode_edge_um: 0.05}  # hints; engine refines near thin features

line:
  length_mm: 10
  conductor_loss_model: skin_effect_wheeler    # see "Stage contract": none | rprime_reference | skin_effect_* | from_paper_alpha
  rf_loss_table: null                          # [{f_ghz: .., alpha_db_per_cm: ..}] only when taken from the paper
  source_ohm: 50
  load_ohm: 50
  differential: true                           # voltage convention: Vpi quoted for differential (V+ - V-) drive
  loading:                                     # optional capacitively loaded electrode (T-rail) unit cell
    type: none                                 # none | periodic_t_rail
    period_um: null
    loaded_length_um: null
    unloaded_cross_section: null               # name of an alternate geometry block below, or null
    loaded_cross_section: null
sweep: {f_start_ghz: 0.1, f_stop_ghz: 110, n_points: 220}

alt_geometries: {}                  # name -> geometry block (same keys as `geometry`) for loaded / unloaded cuts

targets:                            # paper-reported values the sim is compared against (nothing else is stored)
  - {metric: vpi_l_dc_vcm, value: 2.2, tol_rel: 0.15, source: {device_id: chen2022-a, field: vpil_dc_vcm}}
  - {metric: n_rf, value: 2.2, tol_rel: 0.1, source: {device_id: chen2022-a, field: n_rf}}
  - {metric: z0_ohm, value: 50, tol_rel: 0.1, source: {device_id: chen2022-a, field: z0_ohm}}
  - {metric: eo_rolloff_db, at_ghz: 67, value: -1.4, tol_abs: 0.5, source: {...}}
  - {metric: bw3db_ghz, value: 110, tol_rel: 0.15, source: {...}}
reported_curves: []                 # optional [{name, x: f_ghz[], y: S21_dB[], provenance: figure_digitized, locator: ..}]
provenance: {}                      # dotted.path -> {class, locator|citation, note}
missing: []                         # parameters the paper does not disclose (never defaulted)
limitations: []                     # e.g. sidewall angle, scalar optical approximation, 2D quasi-static
```

Recognized target `metric` names: `vpi_l_dc_vcm`, `vpi_dc_v`, `n_eff`, `ng_opt`, `n_rf`, `z0_ohm`, `c_pul_pf_per_m`, `c0_pul_pf_per_m`, `l_pul_nh_per_m`, `rf_loss_db_per_cm` (with `at_ghz`), `eo_rolloff_db` (with `at_ghz`), `bw3db_ghz`, `bw6db_ghz`, `optical_confinement_in_region`. Recognition does not imply the metric is implemented.

Planned physics chain (each implemented stage reports its assumptions)
1. Electrostatics 2D (anisotropic eps tensor) -> C' (with dielectrics) and C0' (all eps = 1) -> `n_rf = sqrt(C'/C0')`, `Z0 = 1/(c sqrt(C' C0'))`.
2. Optical mode (full-vector by default, scalar selectable; quasi-TE/TM on the window) -> n_eff, group index by first-order perturbation (default) or wavelength finite difference, mode fields.
3. EO overlap: refractive-index change from the Pockels tensor with the static field, perturbation integral -> `Vpi*L`. Convention flag: differential vs per-arm; push-pull factor explicit.
4. RF line: conductor loss from skin-effect / incremental inductance, dielectric loss from tan_delta -> alpha(f), complex gamma(f), Z(f).
5. Loaded line (optional): ABCD cascade of loaded/unloaded unit cells -> effective gamma, Z, Bragg limit.
6. EO response: traveling-wave integral with velocity mismatch, loss, source/load mismatch -> `S21_EO(f)`, 3 dB / 6 dB bandwidth. Optical-group velocity from stage 2.

Known approximation labels (must appear in `limitations` or in engine output): `quasi_static_2d_rf`, `rectangular_or_polygon_sidewalls_only`, `no_3d_launch_pad_effects`; `scalar_optical_not_full_vector` and `scalar_optical_approximate` are added by the engine to scalar-solver results only (since 2026-10-15 the configs no longer list the scalar label statically, round-6 audit G8).

## E1 cross-section execution contract

`runCrossSection(yaml, {section, stages, optical, meshScale, onProgress})` is shared
by the Node CLI and browser worker. It always solves electrostatics. `stages` selects
further implemented stages; `optical: true` is the legacy form of adding
`optical_mode`. `chain` records the intended device pipeline and does not cause any
stage to execute.

`inspectConfig(yaml)` is a separate, display-only path returning `{preview,
solveError}`. It validates YAML, metadata, material declarations and geometry,
then reports the strict input validator's first error without hiding the geometry
or disclosures. The preview contains only `raw` and `geometries`; no resolved
solver materials or default physical constants. Malformed metadata/geometry still
throws. A nonempty `solveError` disables Run. An empty one means the input boundary
passed, not that meshing, an optional optical stage or literature validation will
succeed. The worker and CLI always reparse through the strict solver boundary.
This allows geometry records with omitted `eps_r` to be inspected without making
them valid solver inputs or changing the JSON input schema. No `unknown` sentinel
or additional validation-status enum is introduced.

Inputs and numerical controls:

- Required: `schema`, non-empty `id`, material definitions, and a covered domain
  with regions and electrode shapes. Geometry uses painter order. Regions may
  extend beyond the domain and are clipped by the mesher. Shapes must be valid
  simple polygons/rectangles; arbitrary CAD validation is outside this contract.
- Dielectrics require positive `eps_r`, either scalar, `{perp, par}` or diagonal
  `{xx, yy, zz}` in the crystal frame. Anisotropy requires crystal orientation.
  Missing RF permittivity is an error, not vacuum. Conductors must be electrodes.
  Optical inputs use either `n` or both `n_o` and `n_e`; do not mix them.
- Electrode `weight` is the potential pattern, normalized to one volt of full
  terminal difference. For odd mirror symmetry this is twice the largest absolute
  weight; half-domain energy is doubled. `line.differential` does not add a second
  capacitance/voltage factor. Optical arm and push-pull factors are defined only by
  the `optics.eo` block of the EO stage (below).
- `symmetry` defaults to `none`; supported mirror values are `x_mirror_odd` and
  `x_mirror_even`, with `mirror_x_um` defaulting to 0. Symmetry is a user-supplied
  geometry assumption, not inferred or independently verified by the runner.
- Outer electrostatic `boundary` sides (`left`, `right`, `top`, `bottom`) default
  to zero-normal-flux `neumann`; `dirichlet` means zero potential. Electrodes
  impose their normalized values. These finite-domain conditions require convergence
  studies before interpreting a device result.
- `meshScale` is 0.5–4, default 1; it scales local refinement hints, not physical
  geometry. Coarse/configured/fine UI choices are 2/1/0.5. Refinement is graded, so
  a single scale is not a uniform multiplier for every triangle.
- `mesh.max_vertices` is an integer from 4 to 80,000, default 80,000, for each
  electrostatic/optical mesh. Exceeding the budget errors instead of silently
  coarsening. The limit is a mesher stopping budget, not a memory guarantee.
- Mesh hints: positive `max_edge_um`, `electrode_edge_um`, `electrode_face_um`,
  `window_edge_um`, `far_edge_um`, `min_edge_um`, `grade`, `grade_far`, `grade_corner`,
  plus `min_angle_bound >= 1` and per-region positive edge sizes in `regions`.
  Unknown mesh/boundary/geometry keys are rejected. Defaults remain in
  `section.mjs`: max local edge = domain diagonal/40, electrode corner edge =
  min(max edge, thickness/6), face edge = min(max edge, 8×corner), optical-window
  refinement = min(max edge, 0.05 µm), far edge = max(local edge, diagonal/12).
  Every `optics.eo.arm_windows` entry that meets the solved domain gets the same
  window refinement whenever `optics.eo` is declared (independent of the stages
  requested), so both arms sample a refined field (2026-10-07, Q2 N1).
- Optical mode solving requires `optical_window` within the domain and an `optics`
  block with positive `wavelength_nm`, TE/TM (or quasi-TE/quasi-TM), mode index 0–4
  (default 0), and optionally `group_index_from` (`perturbation` default: first-order
  d n_eff / d lambda from the same eigen solve; `finite_difference_wavelength`: central
  difference with ±min(0.01 µm, wavelength/100), extra eigen solves; `fixed`: requires
  positive `ng_fixed`). Before 2026-10-15 `finite_difference_wavelength` was required
  wording for the engine's only method; it now selects the finite-difference path.
- Optical boundaries are zero-field Dirichlet on the window; scalar slab tests
  use lower-level APIs with Neumann side boundaries. Optical mesh defaults use
  core edge λ/(22 nmax), far edge λ/8 and grading 0.25, scaled by `meshScale`.
  `optics.metal_in_window` explicitly chooses `reject` (default), `absent`, or
  `pec_scalar`. Reject errors on conductors inside the optical mesh; an off-window
  conductor needs no optical index. Absent removes the electrode from the optical
  model, leaving the underlying dielectric. PEC removes conductor triangles and
  applies scalar E-form Dirichlet / H-form natural boundary conditions. The PEC
  condition is physically exact only on horizontal faces; the result discloses
  the valid-face fraction. These are sensitivity limits, not bounds on real-metal
  behaviour; neither computes absorption or plasmonic modes. No metal index is
  invented or used for these limits. The RF electrostatic geometry is unchanged.
- Named library materials supply dispersion slopes anchored to configured indices,
  or library indices if omitted. Out-of-range library evaluation errors in the
  optical solve. Custom constant indices have no material dispersion. This
  scalar model is not a vector/real-metal solver. Its forms are exact only at
  horizontal interfaces; TM's lateral gradient uses eps_zz as an approximation.
- `line.loading.type` may be `none` or `periodic_t_rail`. Periodic inputs require
  positive period and loaded length (no greater than period), an existing
  unloaded section and an existing loaded section; null/absent loaded section
  means top-level `geometry`. `--section` explicitly chooses which static slice
  to solve. Periodic settings never imply a cascade has been computed.
- The JSON schema describes input structure; runtime additionally checks numerical
  finiteness, intervals, references and solver constraints. Provenance completeness,
  physical geometry validity and literature accuracy still require review.

Result and target semantics:

- Outputs include `scope: cross_section`, completed `stages`, declared
  `pendingStages`, unit-labelled `metrics`, mesh diagnostics, warnings, elapsed
  time and `targets`. Physical field arrays are returned only with `fields: true`
  (section "Parameters, templates, studies, material library"); the RF stage returns
  its frequency sweep (one value per sweep point).
- Electrostatic metrics: C′ and C₀′ in pF/m, L′ in nH/m, static section nRF and Z₀.
  The optional optical stage adds scalar effective index and group index.
- Optical diagnostics report selected `modeIndex`, `converged`, E/H `form`,
  `labels`, `limitations`, `metal` (policy, in-mesh/omitted electrodes, excluded
  triangle count, PEC face lengths/fraction), and `boundaryMarginFraction`
  (`marginUm`, selected-mode `value`). The latter is the fraction of squared
  scalar mode amplitude in triangles near Dirichlet window sides; default margin
  is 10% of the shorter window side. It is not a power-confinement metric or a
  convergence proof. No universal pass threshold is imposed: compare expanded
  windows for truncation convergence. Labels and limitations also enter top-level
  `warnings`, including when a metal option is explicitly chosen with no metal in
  the window. Physical field arrays are not included in the runner result.
- `targetSummary` reports total/evaluated/passed/failed separately, plus `flagged`
  (evaluated targets with a numerical `diagnostic`). Missing predictions are
  `actual: null`, `status: not_evaluated`, with an explicit reason.
- A target needs finite `value` and nonnegative `tol_abs` and/or `tol_rel`.
  When both are present, the tolerance is max(tol_abs, |value|×tol_rel). Comparison
  is inclusive. Future metric names are accepted only from the recognized list.
- Alternate-section targets, `source.comparable: false` targets and unimplemented
  metrics are not evaluated; `at_ghz` targets follow the RF stage rules below.
  Static RF targets require explicitly uniform topology
  (`line.loading.type: none`); periodic or unspecified topology is not comparable.
  A configured fixed group index is never tested against a target as a prediction.
- Requested-stage failure aborts the run with an error; no partial success result
  is returned. Worker cancellation terminates the worker and discards that run.
  No inputs or validation statuses are modified and no result files are created.
- CLI exit codes: 0 = requested stages ran (even if every target is unevaluated),
  1 = input/solver error, 2 = one or more evaluated targets failed. A zero exit
  code is not evidence of literature reproduction.

## Stage contract (E2i.2, E3i, U3; 2026-10-07)

Stage selection. `stages` is a subset of `electrostatics, optical_mode, eo_overlap,
rf_line` (run in that order; electrostatics always). `loaded_line` and `eo_response`
error as not implemented. Every requested stage's inputs are checked before any solve.
`inspectConfig` returns `stageErrors` (per stage: `null` or the blocking input
message); the CLI prints it with `--check` and runs stages with `--stages a,b`. A
`null` readiness means the input boundary passed, not that meshing, metal handling,
mode convergence or a Wheeler recess will succeed. Readiness and the run share the same
input checks (cross-section construction, arm windows against the selected section and
its mirror-cropped half, `rf_line` on a loaded T-rail cut), so a stage reported ready is
never rejected by them at run time.

Strict keys. Material keys are `conductor, eps_r, n, n_o, n_e, sigma_Sm, crystal,
r_pm_per_v, tan_delta_rf, dispersion, thickness_um, n_complex` (`n_complex` and
`thickness_um` are accepted but not used by the solver); target keys are `metric, value,
tol_abs, tol_rel, at_ghz, vpi_convention, source` (`source` stays open). Any other key is
an error at the solver boundary (Q2 M4: a typo such as `at_GHz` or `r_pm_per_V` would
otherwise change the meaning silently).

Crystal frame. `materials.<m>.crystal` takes `cut`, `propagation` and optional
`rotation_deg`: a CCW rotation of the LAB frame about the propagation axis seen from
+z, `x' = cos t x + sin t y`, `y' = -sin t x + cos t y` (y = film normal). Before
2026-10-07 the code applied the opposite sense (Q2 F6); no config used it. The optical
solver still rejects rotations that make the lab permittivity non-diagonal.
`r_pm_per_v` takes named `r13, r22, r33, r51` (3m with c = crystal z) or a 6x3
`voigt` matrix (pm/V); other keys are errors, not ignored.

EO overlap (`eo_overlap`). Required block:

```yaml
optics:
  eo:
    arm_drive: two_arm_field_resolved   # or single_arm (arm A only)
    terminal_drive: single_ended        # or differential; label only, must agree with line.differential
    arm_windows:
      A: {x_um: [..], y_um: [..]}
      B: {x_um: [..], y_um: [..]}       # two_arm_field_resolved only
```

- Arm windows are explicit (never inferred), inside the domain, non-overlapping, and
  inside the domain and solved half of the selected cross-section when a mirror symmetry
  crops the electrostatics (checked by readiness and before any solve). They refine the
  electrostatic mesh like `optical_window` (see the mesh defaults above). Each arm gets
  its own scalar mode (same polarization, mode index, metal policy as `optics`); an
  unconverged arm mode is an error. The arm A mode equal to `optical_window` reuses the
  `optical_mode` solve.
- Conventions (`eo-atlas.eo-overlap/v2`, see `engine/src/eo-overlap.mjs`): first-order
  Pockels, `dn = -(1/2) n^3 r E` sign, static field per volt of the full terminal
  difference V_t, `delta_phi = phi_A - phi_B`, `VpiL = lambda / (2 |dn_A - dn_B|)`
  (DC, lossless, no RF mismatch). Push-pull is never assumed; it shows as
  `pushPullBalance = dn_B / dn_A` near -1. Any negative balance is push-pull comparable
  (the V_pi is the field-resolved value for any balance); `|balance + 1| > 0.1` adds the
  warning `push_pull_balance_deviates_from_-1_by_more_than_0.1` and
  `result.eo.pushPullBalanceDeviates`.
- Metrics: `vpi_l_dc_vcm`; `vpi_dc_v = VpiL / line.length_mm` (electrode length per arm)
  when `length_mm` is set. `result.eo` carries per-arm window, n_eff, signed dn/V,
  phase/V/m, convergence, window-margin fraction, metal policy, per-region power
  fraction and dn, the balance, gain, labels, limitations and assumptions.
- Vpi targets are evaluated only with a target-level `vpi_convention` (data-schema
  enum) the engine result matches: `single_arm` matches `per_arm_phase_shifter` and
  `mzm_single_arm`; two arms of opposite sign match `mzm_push_pull` (single-ended) or
  `mzm_differential` (differential). `mzm_differential` follows data schema convention (q)
  (`data/schema/devices.schema.yaml`, 2026-10-07): MZM V_pi against the full terminal
  difference V+ - V-, which is the engine V_t; a per-side amplitude is half of that and is
  never converted. Same-sign arms and `mzm_series_push_pull` match nothing. There is no
  implicit factor-of-2 conversion.

RF line (`rf_line`). Uniform quasi-TEM line from the section C', C0' (L' = 1/(c^2 C0')).
No loss is ever defaulted; unknown is not zero.

| Input | Meaning |
|---|---|
| `materials.<m>.tan_delta_rf` | finite >= 0; absent = unknown (dielectrics only) |
| `materials.<m>.sigma_Sm` on a dielectric | conduction loss `tan d = sigma / (omega eps0 eps_r)`; scalar `eps_r` only; excludes `tan_delta_rf` |
| `line.conductor_loss_model` | `none` (declared lossless), `rprime_reference` (`r_pul_ref_ohm_per_m` at `r_pul_ref_ghz`, scaled sqrt f), `skin_effect_geometry_factor` (`R' = R_s conductor_k_per_m`), `skin_effect_perimeter` (`R' = R_s (1/P_signal + 1/P_ground)` from electrode polygons, roles signal/ground only, `perimeters_cover_carrying_surfaces` labels the bound condition), `skin_effect_wheeler` (Wheeler incremental inductance: every electrode surface recessed by delta/2, faces on the domain boundary or mirror plane kept, L' = 1/(c^2 C0') from recessed solves at 0.25/0.5/1 x delta/2; the scale-1 value at the highest sweep/target frequency is scaled with R_s; step-check spread reported, warning above 1e-2; a recess that collapses a conductor edge is an error), `from_paper_alpha` (`rf_loss_table` or `rf_loss_law`, with a provenance locator) |
| `line.include_internal_inductance` | required boolean for `rprime_reference` and `skin_effect_*` |
| `line.dielectric_loss_model` | `none` or `tan_delta_regions` (G' = omega C' sum p_i tan d_i with E1 region energy fractions; every region material needs a loss entry); required unless `from_paper_alpha`, rejected with it |
| `sweep` | `f_start_ghz`, `f_stop_ghz`, `n_points` (1-4001, inclusive linear grid) |

- `rf_line` is an input error on the loaded cut of a `periodic_t_rail` line
  (`line.loading.loaded_cross_section`, default `geometry`): its T-rail conductors carry no
  line current in a 2D section, so a uniform-line L', R' and loss of that cut are not
  meaningful and the Wheeler recess would treat the pads as current-carrying surfaces.
  Run it on the unloaded cut; the loaded line needs `loaded_line` (Q2 C2).
- Wheeler details: the reference frequency ignores `source.comparable: false` targets but
  still depends on the sweep end (R' at a fixed frequency moves by about the step-check
  spread, Q2 M1); recessed solves are vacuum-only and keep the nominal section's
  electrode-thickness mesh hint and refinement windows (Q2 M8). A step-check spread above
  1e-2 keeps every frequency target evaluated but sets its `diagnostic` and counts it in
  `targetSummary.flagged` (Q2 M2).
- A `dirichlet` outer side acts as a grounded return conductor whose surface the
  `skin_effect_wheeler` and `skin_effect_perimeter` models omit; such a run carries the
  warning `dirichlet_outer_boundary_acts_as_return_conductor_its_loss_not_included` (Q2 M3).
- Skin-effect models take the common `sigma_Sm` of all electrode materials (mixed
  values are an error) and check `thickness >= 3 delta` using the smallest electrode
  bounding-box dimension (labelled). A model-specific field under another model, and
  unknown `line`/`sweep` keys, are errors.
- `result.rf`: loss source, `independentPrediction`, labels, per-region energy
  fraction and loss, sweep arrays (alpha dB/cm, n_rf, Re/Im Z0) and the values at every
  RF target frequency. Attenuation is positive: dB/cm = 8.686 x alpha [Np/cm] with
  alpha the field-amplitude constant, which equals the power loss in dB (data
  convention (cc)); `eo_rolloff_db` targets keep the signed S21 convention of this
  file (data convention (g) notes the difference) and are not evaluated.
- `at_ghz` targets of `rf_loss_db_per_cm`, `n_rf`, `z0_ohm` (Re Z0) are evaluated at
  exactly that frequency when `rf_line` ran on the configured section with
  `line.loading.type: none` and the loss is an independent model (not
  `from_paper_alpha`, not `rprime_reference`); `rf_loss_db_per_cm` additionally needs a
  conductor model other than `none`. Response metrics (`eo_rolloff_db`, `bw3db_ghz`,
  `bw6db_ghz`, RF Vpi) stay `not_evaluated` until `eo_response` exists.

## Parameters, templates, studies, material library (DevLog-026, 2026-10-14)

Expansion order before the strict input boundary: `params` -> `=` expressions -> `template` -> `materials.<m>.library`.
`config.raw` is the expanded document; the original is kept as `source`. Readiness, the run and `inspectConfig` see the
same expansion. Field export and sweep APIs are listed in `DevLog/DevLog-026-params-templates-sweeps.md` (APIs section).

Parameters and expressions:

```yaml
params:
  gap_um: {value: 3.0, unit: um, description: electrode gap}
  half_gap_um: {value: "=gap_um / 2", unit: um}      # params may reference params (cycles are errors)
geometry:
  electrodes:
    - {name: signal, rect: {x_um: ["=-half_gap_um - 50", "=-half_gap_um"], y_um: [0, 0.8]}, ...}
```

- A string value starting with `=` is an expression; every other string keeps its literal meaning. Grammar (own
  recursive-descent parser in `engine/src/params.mjs`, no `eval`): numbers (incl. exponents), param names, `+ - * / ^`
  (`^` right associative, binds tighter than unary minus: `-2^2 = -4`), parentheses, unary minus/plus, `min max sqrt
  abs sin cos tan` (radians), `pi`. Division by zero and non-finite results are errors. At most 500 characters, nesting
  depth 64. Expressions are allowed anywhere in the config except `params` keys/units, `study`/`studies`, `provenance`,
  `missing`, `limitations`.
- Units: the key-suffix convention stays authoritative (values are in the unit of the key). Param `unit` is for
  display and checking: when an expression is a sum of numbers, params and number*param terms, every param with a
  unit must have the key-suffix unit (`_um`, `_nm`, `_mm`, `_ghz`, `_ohm`, `_deg`, `_Sm`); other shapes are not checked.
- Param overrides (`runCrossSection(text, {params})`, CLI `--param name=value`) replace values before expansion.

Template `tfln_rib_gsg` (`engine/src/templates.mjs`) replaces `geometry` (giving both is an error) and fills
`optics.eo.arm_windows` when `optics.eo` omits them (arm_drive must match `arms`). Frame as in the hand-written
configs: y = 0 at the BOX top, x = 0 at arm A (right waveguide), signal electrode left of arm A, arm B (push-pull) and
`ground_l` mirrored about the signal centre. Keys (physical inputs required, never defaulted):
`materials {film, box, substrate, ambient, electrode, cladding?, strip?}`, `film_thickness_um`, `etch_depth_um`
(0 = unetched), `rib_top_width_um` and `sidewall_angle_deg` (from horizontal, 90 = vertical; etched only),
`loading_strip {width_um, thickness_um}` (unetched only), `box_thickness_um`, `substrate_thickness_um` (truncated),
`cladding {thickness_um, from: slab_top | film_top}` or `none`, `electrodes {placement: on_slab | on_buffer |
on_cladding, buffer_thickness_um, gap_um (edge to edge), signal_width_um, ground_width_um, thickness_um,
waveguide_offset_um (from the gap centre toward the signal, default 0), layout: gsg | gs}`, `arms: push_pull | single`,
`domain {margin_x_um, air_above_um}` or `{x_um, y_um}`, optional `optical_window {half_width_um, y_um}`, `mesh`,
`boundary`, `symmetry: none`. Numerical defaults: optical window half width = min(distance to the nearest electrode
edge - 0.1 um, waveguide footprint half width + 2 um), y from -min(BOX, 1.5 um) to the film (strip) top + 1 um. Region
names: `ambient, substrate, box, slab | film, cladding, rib_r, rib_l | strip_r, strip_l`; electrodes `signal,
ground_r, ground_l`. Generated geometry passes the ordinary validators.

Studies (`engine/src/sweep.mjs`):

```yaml
studies:                 # or a single `study:` block (named "study")
  gap:
    type: parametric
    stages: [electrostatics, optical_mode, eo_overlap]   # optional; caller may override
    sweep: [{param: gap_um, values: [2.5, 3, 4, 5]}]     # or range: {start, stop, n}; several axes nest
    outputs: [vpi_dc_v, n_eff]                           # optional subset reported per point
    sweep_targets:
      - {at: {gap_um: 2.5}, metric: vpi_dc_v, value: 0.47, tol_rel: 0.15, vpi_convention: mzm_push_pull, source: {device_id: ...}}
```

- Sweeps act on `params` only. Points are row-major over the axes (first axis outermost, last fastest), at most 2000.
- At a sweep point the base `targets` are not compared (the point is not the configured device); `sweep_targets` whose
  `at` matches the point's param values (relative 1e-9) are compared with the ordinary target rules.
- Reuse: the electrostatic solution is reused when the geometry hash and the RF-material hash are unchanged (a
  wavelength-only sweep solves electrostatics once); the mesh alone is reused when only RF permittivities change. The
  optical mesh is rebuilt per point (its sizing scales with the wavelength). `result.geometryHash`, `materialHash`,
  `reused` report this.
- A failing point records `error` and the sweep continues (unless `stopOnError`); cancellation via AbortSignal is
  checked between points. CLI: `--sweep [STUDY]`, `--list-points`.

Material library (`materials.<m>.library: <key>`, keys in `engine/data/materials.json` `library`): supplies
`eps_r`, `r_pm_per_v`, `sigma_Sm`, `conductor`, `dispersion`. Config keys override; `eps_r {perp, par}` and named
`r_pm_per_v` coefficients merge one level deep (a partial `eps_r: {par: 28}` is allowed only with a library). Each
library value records the source actually read, locator, condition (clamped/unclamped, temperature) and verification
level (`primary` or `secondary_open_access`); `result.materialSources` reports which fields came from the library and
their citations, and runs using it carry the warning `library_material_constants_used`. Provenance class of library
values is `standard_reference`.

Field export (`runCrossSection(text, {fields: true})`, DevLog-023 O4): `result.fields = {es, optical, arms}` with
typed-array copies: `es {x, y, tri, triRegion, regionNames, regionMaterials, electrodeNames, nodeElectrode, phi (V per
V_t, nodal), ex, ey (V/m per V_t, per triangle), rect}`, `optical` and `arms.A/B {x, y, tri, triRegion, regionNames,
window, solver, polarization, form, lambdaUm, modes: [{n_eff, components: {psi}}]}` (scalar psi = E_x for form E, H_x
for form H, max |psi| = 1). Absent unless requested. `result.timing` passes the solver timing objects through
(DevLog-024 contract). `optics.solver: scalar | vector` (superseded: `vector` was an input error until the DevLog-025 solver was
integrated).

## Round 2 additions (DevLog-026, 2026-10-15)

- `optics.solver: scalar | vector` (run option `solver` overrides it; default scalar in round 2, vector since round 5, see below). The vector path uses the
  full-vector FEM of `engine/src/vector-mode.mjs` (DevLog-025): Nedelec/Lagrange order `optics.vector_order` (default
  2), PEC window walls, mode chosen by TE fraction (`TE`: TE fraction >= 0.5) and `mode_index` within that family,
  group index from the same solve (perturbation) or by finite difference, EO overlap with the full Pockels tensor
  (shear terms included) and the static field at 6 quadrature points per optical triangle (P2-aware). Scalar limitation
  codes are not attached to vector results; `full_vector_optical` and the element label are. Metal policies: scalar
  `reject | absent | pec_scalar`; vector `reject | absent | pec | lossy` (`pec_scalar` maps to `pec`); `lossy` needs
  `optics.metal_permittivity: {<metal>: [eps', eps'']}` (eps = eps' - j eps'') with a provenance entry per metal.
- `mesh.element_order: 1 | 2` (electrostatics, also the Wheeler recessed solves; run option `elementOrder`). Default
  2 since 2026-10-15: on the reference cases K4/K6 P2 is 5-10x closer to the scikit-fem references than P1 on the
  same mesh for about 2.3x the solve time (DevLog-026 round 2, Reference tests). Field export adds
  `fields.es.elementOrder` and, for P2, `fields.es.p2 {phiDof, elem}`; `ex, ey` stay centroid values.
- `group_index_from: perturbation` is the default (above).
- Pockels field export (round 3): with `fields: true`, `fields.optical.pockels` and `fields.arms.A/B.pockels` hold
  per optical-mesh triangle `dnXX, dnYY, dnZZ` (index change of the lab x, y, z principal axes, 1/V per volt of
  terminal voltage) and `dEpsXY` (in-plane shear of the relative permittivity, 1/V), from the static field at the
  triangle centroid (P2-aware) and the lab-frame Pockels tensor: d eps = -eps d(1/eps) eps (full 3m Voigt matrix,
  crystal rotation), dn_ii = d eps_ii / (2 n_ii) at the solved wavelength; a positive r E lowers the index (engine
  sign convention). Materials without Pockels coefficients, conductors and PEC-excluded triangles carry 0. Same
  definition for the scalar and vector solvers.
- `engine/src/yaml-edit.mjs` prints flow collections without inner padding (`{a: 1}`).
- Free text is never expanded as an expression: top-level `schema, id, title, paper_id, device_id, repro_grade,
  validation_status, chain, params, study, studies, provenance, missing, limitations, reported_curves` and keys
  `source, note, notes, description, locator, citation, name, material, role` at any depth.
- Unit check of expressions: exact-unit expressions (a param, +- a param, 1 * param, sums of those) must carry the
  key-suffix unit; a param scaled by another number may be a unit conversion and is not checked; exact params in
  different units inside any sum, min, max or abs are rejected at any depth, also in param value expressions.
- Template `tfln_rib_gsg`: the waveguide footprint must clear the electrodes strictly; the default optical window must
  contain the footprint; an unetched film requires `loading_strip`; with `on_cladding` electrodes the default window
  stops at the electrode bottom; generated regions are clipped to the domain.
- Engine helpers: `buildSectionMesh(text, {section, meshScale, params})` (`engine/src/mesh-entry.mjs`) and YAML
  round-trip edits `getIn / setIn / deleteIn / applyOverrides` (`engine/src/yaml-edit.mjs`), both typed.

## Round 5 changes (DevLog-026, 2026-10-15)

- Default optical solver is `vector` (audit F1: the scalar forms return non-physical modes on hybrid Si/LN sections).
  `optics.solver: scalar` stays available; its results carry `scalar_optical_approximate`. `eo_overlap` with
  `polarization: TM` requires the vector solver (audit F3: the scalar TM overlap omits E_z and shear terms).
- Vector mode selection: `optics.mode_select: {by: te_fraction | confinement, region}`; the mode count doubles up to 4
  times until the family index is found; `result.optical.windowMarginPowerFraction` (warning label above 1e-2).
- Lossy metal (`metal_in_window: lossy`): the solve is anchored on the same window with the metal absent (shift just
  above that mode, nearest family mode selected); the run fails when the selected mode carries more than
  `optics.max_metal_power_fraction` (default 0.05) of its power in metal or lies closer to a planar surface-plasmon
  index than to the reference. `result.optical.lossy` reports the metal fraction, reference n_eff and SPP indices.
- Electrostatics: P2 runs on a mesh coarsened by `mesh.p2_mesh_factor` (default 2; run option `p2MeshFactor`);
  `result.electrostaticMeshScale`, `result.p2MeshFactor`. Optical meshes are not affected.
- Run option `modeOnly` (CLI `--mode-only`): `optical_mode` without electrostatics (mode-only cases).
- Warm-start data between runs are an LRU of at most 4 entries and 64 MB.
- Measured kHz-MHz Vpi targets may carry `source.drive_frequency_hz` (with a locator); the result then reports
  `target.lowFrequencyRange`, an r33-scaled VpiL range from the clamped value used to the unclamped library alternatives
  (diagnostic only; pass/fail unchanged).

## Postprocessing and EO analysis (DevLog-031, 2026-10-15)

- `optics.num_modes` (integer 1..24; run option `numModes`, CLI `--num-modes`): every optical solve computes at least
  this many modes (mode table). The selected mode and its selection rule are unchanged.
- `runCrossSection(text, {keep: true})` attaches the solver internals as the non-enumerable `result.internals`; the
  enumerable result, its JSON and its structured clone are unchanged. `engine/src/postproc/index.mjs`
  (`createSolutionStore`, `evaluatePlot`, `evaluateDerived`, `modeTable`, `createSweepStore`, `evaluateGlobals`,
  `runGlobals`) evaluates expressions with units on datasets `es`, `opt[:k]`, `armA[:k]`, `armB[:k]`, `eoA`, `eoB`,
  cut lines and cut points; API and namespace in DevLog-031 (types `postproc/index.d.mts`). Exact point evaluation
  (P1/P2 electrostatics, vector Nedelec/Lagrange or scalar P1 modes); optical fields power-normalised to 1 W;
  electrostatic fields per volt of terminal voltage; points outside a mesh are NaN (electrostatics inside an electrode:
  V = electrode potential, E = 0). Surface integrals use the solver 6-point rule; line integrals split at element
  crossings (3-point Gauss per piece).
- `result.eo.arms.<A|B>.breakdown`: the engine dn_eff/V split by Pockels coefficient (`byComponent`: r33, r13, r22, r51,
  other; Voigt-entry masks, any orientation), by lab tensor term (`byTensorTerm`: xx, yy, zz, xy) and by region
  (`byRegion`), computed with the overlap's own quadrature and static-field sampling (`relativeDifferenceVsEngine`).
- `result.eo.arms.<A|B>.conventional`: electrode gap of the arm from the geometry (`gapUm`, rule in
  `result.eo.formulas.gap`; null with `gapReason` when an electrode spans the arm centre or a side has none), signed
  `gamma` = (g / V_gap) int_EO E_c |E|^2 / int |E|^2, `gammaEx` (|E_x|^2 variant), `gammaByRegion`, `gammaEquiv`,
  `ebarVPerMPerV`, n_e and r33 of the dominant EO material. `result.eo.conventional`: implied textbook push-pull VpiL
  lambda / (n_e^3 r33 |Ebar_A - Ebar_B|) (`vpiLVcmTextbook`, `vpiLVcmTextbookEx`) and the variant times n_eff,A / n_e,
  next to the engine value. The perturbation result stays primary; `result.eo.formulas` holds every definition.
- Sweep points carry `globals` (SI values of the run globals); `runSweepPoint(..., {keep: true})` adds non-enumerable
  internals for `createSweepStore` (bounded LRU of retained stores, default 2 and 512 MiB).
- CLI: `--eval EXPR` (repeatable; `--eval=-...` for a leading minus) with `--dataset`, `--kind`, `--over REGION,...`,
  `--point X,Y` (repeatable), `--line X0,Y0,X1,Y1[,...]`, `--unit` (repeatable, one per `--eval`); `--list-vars`;
  `--modes DATASET`. A failing expression is reported as `{expr, error}` and the exit status is 1.
- Round 2 (audit 2026-10-15): point location is deterministic and equals the engine sampling (ties on element edges go
  to the engine grid locator, lowest triangle index); run-time complex operands of comparisons, min, max, atan2 and if
  are errors; `evaluateAtPoints`, dataset `rf` (`rf.alpha_dB` in dB/m, `dB`/`Np` are unit labels
  with factor 1), `aliasOf`, `storeForSweepPoint`; the gap ignores electrodes outside the arm window height
  (`gapIgnoredElectrodes`); `result.eo.accuracyNote`. (`location: 'p2nodes'` of round 2 was removed by DevLog-034;
  `location: 'refined'` with resolution 2 holds the P2 nodes.)
- Refined field plots (DevLog-034, 2026-10-15): `evaluatePlot(store, {location: 'refined', resolution, smoothing})` on
  mesh datasets returns one value per element-local lattice point (barycentric (n0, n1, n2) / r, n0 outer, n1 inner;
  (r+1)(r+2)/2 points and r^2 sub-triangles per element; layout element-major), each evaluated exactly from that
  element's own basis (no point location for fields of the dataset mesh; fields of another mesh are located there as
  for any point). `resolution`: `none` 1, `coarse` 2, `normal` 3 (default), `fine` 4, `finer` 6, `extra` 8, or an
  integer 1..16; lowered to fit `maxSubTriangles` (default 2.5M, nTris r^2), reported as `resolution`,
  `requestedResolution`, `capped`. `smoothing`: `none` (element-local values), `material` (default; coincident vertex
  and edge lattice points of elements whose regions share a material name get the arithmetic mean of the finite
  element-side values), `everywhere`; applied to the displayed real value. Helpers `refinePattern`, `latticeIndex`,
  `refinedPoints`, `interpolateRefined` (drawn value: linear on the sub-triangle) are shared with the UI.

## Changelog
- 2026-10-15 DevLog-034: `evaluatePlot` location `refined` (resolution, smoothing, sub-triangle cap) and the refine
  helpers; location `p2nodes` removed.
- 2026-10-15 DevLog-031: `optics.num_modes`; `keep` internals; postprocessing engine (`engine/src/postproc/`);
  `result.eo` breakdown, conventional Gamma, implied textbook VpiL and formulas; sweep `globals`; CLI `--eval`,
  `--list-vars`, `--modes`, `--num-modes`. Schema mirrored (`optics.num_modes`).
- 2026-10-15 DevLog-026 round 5: vector solver default; scalar TM EO rejected; mode_select, lossy anchoring and
  surface-plasmon guard; `mesh.p2_mesh_factor` (default 2); `modeOnly`; bounded warm cache; low-frequency Vpi range
  diagnostic; schema mirrored.
- 2026-10-15 DevLog-026 round 3: `fields.*.pockels` (dnXX, dnYY, dnZZ, dEpsXY per optical triangle, 1/V); YAML
  helpers print unpadded flow collections; `run.d.mts` vector optical result types.
- 2026-10-15 DevLog-026 round 2: optics.solver vector wired; `group_index_from: perturbation` (default) and
  finite-difference selection; `mesh.element_order` with P2 default; vector metal policies and `metal_permittivity`;
  free-text keys never expanded; unit-check rules; template guards; mesh-only and YAML helper entry points. Schema mirrored
  (`optics.group_index_from` no longer required).
- 2026-10-14 DevLog-026 (L-PARAM): `params` with `=` expressions (own parser, unit check against key suffixes),
  `template: tfln_rib_gsg` generating `geometry` and EO arm windows, `study`/`studies` parametric sweeps with
  `sweep_targets`, `materials.<m>.library` (engine/data/materials.json `library`, sourced RF/EO/conductor constants),
  `optics.solver` switch, field export (`fields: true`), `result.timing`, `params`, `materialSources`, `geometryHash`,
  `materialHash`, `reused`. Schema mirrored in `engine/schema/sim.schema.json` (numbers accept `=` expressions;
  `geometry` or `template` required).
- 2026-10-07 Q2 corrections (audit `DevLog/audits/e2i2-e3i-u3-q2-claude-audit-2026-10-07.md`):
  EO arm windows refine the electrostatic mesh (N1); `rf_line` blocked on the loaded
  T-rail cut (C2); `mzm_differential` cites data convention (q) (C1); strict material and
  target keys (M4); push-pull balance warning (M5); readiness checks arm windows against
  the selected section (M6); Wheeler spread flags targets (`diagnostic`,
  `targetSummary.flagged`) (M2); Wheeler reference frequency ignores non-comparable
  targets (M1); dirichlet-side warning (M3); vacuum-only recessed solves with the nominal
  thickness hint (M8). Schema mirrored in `engine/schema/sim.schema.json`.
- 2026-10-07 E2i.2/E3i/U3: stage selection (`stages`, CLI `--stages`, `--check`,
  `inspectConfig().stageErrors`); `optics.eo` arm windows/drive and the `eo_overlap`
  stage with convention-gated Vpi targets; `skin_effect_wheeler` implemented with
  recessed-geometry solves; `rotation_deg` sense fixed to the documented
  CCW lab-frame rotation (Q2 F6); crystal and Pockels keys validated; `tan_delta_rf`
  absent = unknown (was 0), dielectric `sigma_Sm`, line loss models, `rf_loss_law`,
  `sweep` validation and the `rf_line` stage with frequency targets;
  `source.comparable: false` honoured; unknown `optics`, `line`, `sweep` keys rejected.
  Schema mirrored in `engine/schema/sim.schema.json`.
- 2026-10-02 E2i.1: YAML/schema/runner support for explicit scalar optical metal
  policies and selected-mode diagnostics, carrying all E2 limitations to the
  browser/CLI. Default rejection unchanged. EO-overlap and RF-line modules remain
  separate APIs; neither stage is automatically executed by `runCrossSection`.
- 2026-10-01 draft 0
- 2026-10-01 draft 1 (E1/U1): documented the implemented cross-section subset,
  validation/resource controls, loading semantics and honest target eligibility;
  added C₀′ diagnostic metric. Full-chain roadmap and paper inputs remain unchanged.
- 2026-10-01 draft 1 follow-up: documented the separate geometry/disclosure preview
  for incomplete drafts from p1_01/p1_02; strict input schema and physical-input
  requirements unchanged. YAML 1.2 remains required for schema checks.
