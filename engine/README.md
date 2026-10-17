# Cross-section engine

The browser worker and Node CLI share `src/run.mjs`; YAML parsing and input
validation share `src/config.mjs`. The engine is GPL-3.0-or-later as declared in
its original module headers and package manifest; the license text is in
`LICENSE`. The design follows the `eo_fem` lineage recorded in the project
DevLogs. `robust-predicates` and `yaml` retain their upstream licenses.

Implemented stages:

- Conforming triangle meshing in JavaScript (not a WASM backend).
- Anisotropic electrostatic FEM, P2 by default on a mesh coarsened by
  `mesh.p2_mesh_factor` (default 2; P1 with `mesh.element_order: 1`), terminal-charge and
  energy capacitance, vacuum capacitance and quasi-TEM section estimates of L′, nRF and Z₀.
- Optical modes: full-vector FEM by default (`src/vector-mode.mjs`, Nedelec/Lagrange order 2),
  group index by first-order perturbation (default) or finite difference; the scalar E/H FEM
  stays selectable (`optics.solver: scalar`, labelled approximate). Metal policies, window-edge
  diagnostics, lossy metal anchored on the metal-absent mode with a surface-plasmon guard.
- `eo_overlap` stage (`eo-overlap.mjs` / `optical-stage.mjs` via `stages.mjs`): first-order
  Pockels overlap of each explicit arm window's own mode with the static field (vector: full
  tensor including shear), push-pull only when the field-resolved arms give it, DC `VpiL` and
  `Vpi`. Vpi targets need a matching `vpi_convention`. Scalar TM is rejected for EO runs.
- `rf_line` stage (`rf-line.mjs` via `stages.mjs`): uniform quasi-TEM line with
  explicit conductor and region-weighted dielectric loss, frequency sweep and
  frequency-specific RF targets. Paper attenuation and configured R' are inputs and
  never evaluated as predictions.

Stages are selected explicitly: `runCrossSection(text, {stages: ['eo_overlap',
'rf_line']})` or `node cli.mjs CONFIG.yaml --stages eo_overlap,rf_line`;
electrostatics always runs and `--optical` still adds `optical_mode`. `--check`
prints the per-stage input readiness (`inspectConfig().stageErrors`) without solving.
`skin_effect_wheeler` recesses every electrode surface by delta/2 (`recess.mjs`;
faces on the domain boundary or mirror plane stay) and takes R' from three extra
vacuum-only solves with a step check (spread above 1e-2 flags the evaluated RF targets).
`rf_line` is blocked on the loaded cut of a `periodic_t_rail` line (its T-rail pads carry
no line current in 2D); run it on the unloaded cut. EO arm windows refine the
electrostatic mesh like `optical_window`. `mzm_differential` targets follow data schema
convention (q): V_pi against V+ - V-, the engine V_t. Material and target keys are strict.
Q2 corrections of 2026-10-07 are listed in DevLog-012. Since 2026-10-15 (DevLog-036) the
periodic loaded line (`loaded_line`: exact distributed Bloch cell of the loaded and unloaded
cuts, Bragg frequency, quasi-static limits; `src/loaded-line.mjs`) and the traveling-wave EO
response (`eo_response`: forward and reflected waves, source and load, optical group index,
S21_EO, 3 dB / 6 dB bandwidths, RF Vpi; exact section cascade on periodic lines;
`src/eo-response.mjs`) are implemented; `eo_response` adds `optical_mode` and `rf_line` or
`loaded_line` to the run. Conventions: sims/SPEC.md section S7. `chain` never causes a stage
to execute.

Stage rules (DevLog-043): `src/stage-compat.mjs` `stageCompatibility(selected, inspectConfig(text).stageContext)` is
the one rule set of the runner and the /sim UI (per stage: runs, implied by, blocked reason, conflicts). With the
semiconductor stage, `optical_mode` and `eo_response` (rf_line on `line.rf_section` implied) are allowed;
`electrostatics`, `eo_overlap`, `loaded_line` and `rf_line` without `eo_response` are rejected with the reason (matrix
in sims/SPEC.md, Stage contract).

Silicon PN/PIN phase shifters (DevLog-039; conventions sims/SPEC.md section S8): the `semiconductor` stage
(`src/semi-stage.mjs`, `src/semi/`) solves 2D steady-state drift-diffusion (Scharfetter-Gummel box method, Newton with
a Cholesky-preconditioned GMRES, Gummel warm start, bias ramp; Sproul-Green n_i, Masetti / Caughey-Thomas mobility,
SRH) on its own device mesh, then C'(V), G'(V), R', f_RC, and with `semiconductor.optics` the plasma-dispersion
response of the vector mode (Nedeljkovic 2011 or Soref-Bennett): dn_eff(V), d alpha(V), loss, VpiL (single-arm secant,
small-signal, push-pull at a reverse DC bias). It runs without electrostatics: `runCrossSection(text, {stages:
['semiconductor'], section})` or `node cli.mjs CONFIG.yaml --stages semiconductor [--section NAME]`; `optical_mode` may
be added and reports the stage's own vector mode (no second solve); with `eo_response` added it drives
the junction-loaded traveling-wave response on the electrode cross-section `line.rf_section` at
`semiconductor.operating_bias_v` (run options rfSection / biasV override). Inputs: the `semiconductor` block
(materials, doping profiles, ohmic contacts on electrodes or bare-face segments, bias sweep, numerics, small signal,
mesh, optics, targets). `result.semiconductor.perLength` exports C', R', G' and dn_eff/dV per bias for the line model;
`keep: true` adds the postproc datasets `semi` / `semi:<k>` (nodal `semi.*` fields and per-point globals). References:
the S8 cases K10-K12 in `npm run test:reference`.

Optical solver (DevLog-026 round 2): `optics.solver: vector` (or the run option `solver`) routes the optical and EO
stages through the full-vector FEM of `src/vector-mode.mjs` (`src/optical-stage.mjs` dispatches; default scalar).
`group_index_from: perturbation` is the default (one eigen solve); `finite_difference_wavelength` selects the
finite-difference path. Electrostatics default to P2 (`mesh.element_order: 2`; option `elementOrder`), chosen from the
reference tests `tests/reference-cases.test.mjs` (validation/cases K1-K6 against validation/reference/summary.json;
`ENGINE_REFERENCE_FULL=1` adds K5). `src/mesh-entry.mjs` (`buildSectionMesh`) and `src/yaml-edit.mjs` serve the
workbench.

Parameters, templates and sweeps (DevLog-026): a config may declare `params` and use
`"=expr"` strings anywhere a number goes (`src/params.mjs`, own parser, no `eval`);
`template: {type: tfln_rib_gsg, ...}` generates the cross-section and the EO arm windows
(`src/templates.mjs`); `studies` run parametric sweeps (`src/sweep.mjs`: `enumerateSweep`,
`runSweepPoint` by index for worker pools, async `runSweep` with cancellation; CLI
`--sweep STUDY`, `--list-points`, `--param name=value`). Wavelength-only sweeps reuse the
electrostatic solution (content hashes in `src/fields.mjs`). `materials.<m>.library: <key>`
pulls sourced RF/EO/conductor constants from `data/materials.json` (`library`; each value
names the source actually read, its locator, condition and verification level). Field export:
`runCrossSection(text, {fields: true})` adds typed-array meshes, potential, per-triangle E and
optical mode fields; `result.timing` passes the solver timing objects through.

Postprocessing (DevLog-031): `runCrossSection(text, {keep: true})` keeps the solver internals (non-enumerable
`result.internals`; JSON and structured clone unchanged) for `src/postproc/index.mjs`: `createSolutionStore`,
`evaluatePlot` (node / element / corner / quadrature values, cut lines and points), `evaluateDerived` (global, surface
integral / average / max / min over regions, line integral / average, point), `modeTable`, `createSweepStore` and
`evaluateGlobals`. Expressions (`es.normE`, `abs(opt.Ex)^2`, `eo.integrand`, `2[um]`, ...) are parsed by an own
recursive-descent parser with SI units and complex values (no eval). `result.eo` adds the integrand split by Pockels
coefficient, tensor term and region, the conventional Gamma with the electrode gap from the geometry and the implied
textbook VpiL, with formula strings. `optics.num_modes` / `numModes` sets the mode count. CLI `--eval`, `--list-vars`,
`--modes`, `--num-modes`; `bench/postproc-bench.mjs` times the evaluations.

`rotation_deg` is a CCW rotation of the lab frame about the propagation axis
(`x' = cos t x + sin t y`); the code applied the opposite sense before 2026-10-07
(audit Q2 F6). `tests/fixtures/gsg-eo-rf.yaml` is a synthetic analytic input for the
EO and RF stages (illustrative constants, closed forms in its header).

Metal in the optical window is rejected by default, including for the unchanged
Chen config. Explicit YAML `optics.metal_in_window: absent` or `pec_scalar`
enables an E2 sensitivity model. These do not model real-metal absorption or
bound a real-metal solution. The browser/CLI result carries the policy, omitted
or excluded metal, PEC face validity, scalar limitations and selected-mode
window-margin diagnostic. Expand the window to check convergence; a small
margin fraction alone does not establish it. See `sims/SPEC.md` for the contract.

Capacitance uses **one volt of full terminal voltage difference**. The solved
half-domain energy is doubled for mirror symmetry, then C′ = 2W′/V²; no separate
drive factor is applied from `line.differential`. Charge and energy agreement is
a consistency diagnostic, not a substitute for convergence testing.

Run `npm test`. The independent analytic references are:

- [MIT 8.02, Capacitance, §§5.2–5.4](https://ocw.mit.edu/courses/8-02t-electricity-and-magnetism-spring-2005/99407b81a217613e8ddec21dc3da07de_chap5capacitance.pdf):
  parallel plates and electrostatic energy.
- [MIT 6.974, Optical Waveguides and Integrated Optics](https://www.ocw.mit.edu/courses/6-974-fundamentals-of-photonics-quantum-electronics-spring-2006/7ce86803e5d51ad749a86c37f5d72ce6_wavegude_int_opt.pdf):
  symmetric dielectric slab dispersion.

The Chen electrostatic input runs at its configured mesh, but a single static
section cannot validate its periodic transmission line. The analytic tests do
not establish accuracy for that device. Neither a passing test run nor opening
the UI changes `validation_status` in any input file.

The callable contract is documented in `../sims/SPEC.md` (E1 subsection).
`targetSummary` reports evaluated coverage separately from passing comparisons.
Static RF comparisons require explicitly uniform topology. Frequency-specific,
alternate-section and configured-input targets are excluded. A stage error aborts
the run; there is no partially successful serialized result. Each mesh inherits
the configured vertex budget (default/maximum 80,000) and fails rather than
silently reducing resolution. Browser cancellation terminates the worker.

`inspectConfig` provides a geometry/disclosure preview for incomplete drafts,
including those missing RF permittivity. It returns the strict validation error
and no resolved solver materials. The UI disables Run while that error is present;
the CLI and worker always use `parseConfig`, which still requires physical inputs.
The preview never supplies constants or promotes a config's validation status.

`tests/fixtures/parallel-plates.yaml` is a synthetic analytic test input, not a
literature config. Tests create transient CLI files under the OS temporary
directory and remove them. `../app/scripts/smoke.mjs` runs the same input in Chrome
and Node; its optional screenshots belong in ignored scratch paths.
