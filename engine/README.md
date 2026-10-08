# Cross-section engine

The browser worker and Node CLI share `src/run.mjs`; YAML parsing and input
validation share `src/config.mjs`. The engine is GPL-3.0-or-later as declared in
its original module headers and package manifest; the license text is in
`LICENSE`. The design follows the `eo_fem` lineage recorded in the project
DevLogs. `robust-predicates` and `yaml` retain their upstream licenses.

Implemented stages:

- Conforming triangle meshing in JavaScript (not a WASM backend).
- Anisotropic P1 electrostatic FEM, terminal-charge and energy capacitance,
  vacuum capacitance and quasi-TEM section estimates of L′, nRF and Z₀.
- Scalar E/H optical FEM and finite-difference group index, with explicit metal
  sensitivity options and window-edge diagnostics.
- `eo_overlap` stage (`eo-overlap.mjs` via `stages.mjs`): first-order Pockels overlap
  of each explicit arm window's own scalar mode with the static field, push-pull only
  when the field-resolved arms give it, DC `VpiL` and `Vpi`. Vpi targets need a
  matching `vpi_convention`.
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
Q2 corrections of 2026-10-07 are listed in DevLog-012. Periodic-cell ABCD (`loaded_line`) and
traveling-wave EO response (`eo_response`) are not implemented and error when
requested. `chain` never causes a stage to execute.

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
