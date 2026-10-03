# SPEC_PROPOSALS (p3_03)

## lin2026a
- SPEC says unknown values are left out and listed under `missing`, but the engine requires RF permittivity; followed the sims/lin2025 and sims/li2026ba convention (flagged UNVERIFIED placeholder with class `unknown`). A defined way to ship an inspectable draft without recalled values is still needed.
- Lumped (non-traveling-wave) electrodes: `line.loading.type: none` with `length_mm: 0.2` is the closest valid form; there is no flag stating that Z0/n_RF targets are not meaningful for a lumped structure.
- Optical indices of a named material at a UV wavelength (LT at 375 nm) are neither in the paper nor in engine/data/materials.json; optical stage cannot run. Propose a `missing` mechanism that the runner reports as `not_evaluated` instead of an error.
- Push-pull factor for the overlap integral is still open (arms in opposite-sign gap fields, drive single-ended); the config encodes it only through geometry.

## shen2024
- Superconducting electrodes (kinetic inductance, temperature-dependent line index) and meter-scale spiral jump-over electrodes have no representation in SPEC (`conductor_loss_model` has no superconductor option); no sim config written.
- `vpi_convention` for devices quoted by total two-arm modulation length (here 0.2/0.4/1.0 m total, per arm half): length_mm entered per arm; a schema note on this would help.

## Audit follow-ups (2026-10-03, not applied)
- lin2026a, F17 (deferred to coordinator): the unverified LT/SiO2 RF-permittivity placeholders in sims/lin2026a/config.yaml stay disclosed (provenance class unknown / project_inference, `missing`, `limitations`); decide whether to accept them, source them (the r33 reference Juvalta et al. 2006, ref. 20, is a candidate place to look), or drop them before any run.
- lin2026a, F21: SPEC does not say whether two targets may share a metric, nor how to record an author-simulated value (cross-solver reference) that is not a measurement; the `source` object was used ad hoc and the duplicate target was removed (value kept as a comment). Propose a `reference` target kind or a basis field on targets, and a statement on duplicate metrics.
- zhang2023: one row mixes quantities of different devices on the same chip (electrode-free Q 9066 / IL / ER cavity, Q 5400 S21 device, electrode tuning device). A per-field device reference or a separate row convention for same-chip sibling devices is not defined.
- Bandwidth limited by a detector in a link measurement (lin2026a, 922 MHz EOE with a 900 MHz APD) has no dedicated field; entered as bw3db_ghz with the gt qualifier. Propose a `bw_limit_source` note convention (detector | amplifier | instrument | device).
