# Simulation config spec: `eo-atlas.sim/v1`

Contract between three parties: the distillation skill (writes configs), the browser engine in `engine/` (runs them), the app `/sim` route (shows them). Status: draft 1, 2026-10-01. The engine author may refine it; every change must be recorded in the Changelog at the bottom and mirrored in `engine/schema/sim.schema.json`.

**Implemented subset:** electrostatics, scalar optical modes, DC EO overlap with
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
  group_index_from: finite_difference_wavelength   # or: fixed
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
2. Optical mode (quasi-TE/TM on the window) -> n_eff, group index via wavelength finite difference, mode profile.
3. EO overlap: refractive-index change from the Pockels tensor with the static field, perturbation integral -> `Vpi*L`. Convention flag: differential vs per-arm; push-pull factor explicit.
4. RF line: conductor loss from skin-effect / incremental inductance, dielectric loss from tan_delta -> alpha(f), complex gamma(f), Z(f).
5. Loaded line (optional): ABCD cascade of loaded/unloaded unit cells -> effective gamma, Z, Bragg limit.
6. EO response: traveling-wave integral with velocity mismatch, loss, source/load mismatch -> `S21_EO(f)`, 3 dB / 6 dB bandwidth. Optical-group velocity from stage 2.

Known approximation labels (must appear in `limitations` or in engine output): `scalar_optical_not_full_vector`, `quasi_static_2d_rf`, `rectangular_or_polygon_sidewalls_only`, `no_3d_launch_pad_effects`.

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
  (default 0), and `group_index_from`. Fixed group index requires positive
  `ng_fixed`. Finite differences use ±min(0.01 µm, wavelength/100).
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
  time and `targets`. Physical field arrays are not serialized by this runner; the
  RF stage returns its frequency sweep (one value per sweep point).
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

## Changelog
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
