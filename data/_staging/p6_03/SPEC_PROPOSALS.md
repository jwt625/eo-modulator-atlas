# SPEC / schema proposals from batch p6_03 (2026-10-05)

Not applied; for the coordinator.

## devices.schema.yaml

- Optical passband width (nm) of slow-light / coupled-resonator MZMs (chen2023: about 8 nm, han2023: 8 nm flat window, 7 nm for Device B). Currently in notes only; a column `optical_passband_nm` (with the 3 dB wavelength-width definition) would let views compare operating windows.
- Passive test structures that share the modulator design (chen2023 slow-light waveguides: ng up to 7.5, IL 2.9 dB, 0.0101-0.0201 dB/um) have no home under convention (dd). A `row_kind: passive_reference` or a documented rule to enter them in notes only would remove the ambiguity.
- Nonlinear Vpi (han2023, plasma dispersion): Vpi 78 V is a sinusoidal extrapolation from a 10 percent transmission change; the authors use an efficiency factor (pi/V at a bias) instead. Convention (a)/(q) has no value for a bias-dependent efficiency; suggest a `vpi_convention` value `nonlinear_efficiency_extrapolated` or an optional `efficiency_pi_per_v` plus `bias_for_vpi_v` pairing.
- `tuning_nm_per_v` is documented for resonant devices; chen2023 reports an MZI fringe shift (15.7 pm/V) entered there. Clarify whether MZI fringe tuning belongs in that column.
- Several operating wavelengths spanning C and L with one measured outcome (chen2023 Fig. 7(b), three wavelengths) were entered as one row with band `cl_band` and empty wavelength; convention (l) allows it, but a note in (d) that identical-outcome wavelength sweeps do not make new rows would help.
- Convention (y) says a self-contradiction gives an empty cell; for length (chen2023: 370 vs 360 um) this empties the length used to derive Vpi. A sentence on whether a stated majority value (abstract + text + conclusions) outranks a single table cell would remove judgment calls.
- Fiber-to-fiber IL of an MZM measured at one output port (boynton2020, cross port) versus both ports is not distinguished; no column for port.
- A simulated or design-target Z0/n_RF in a measured device row (mao2022, boynton2020, chen2023) is entered with basis simulated/design_target; confirm that this is the intended treatment (han2023 canonical rows did the same for ng).

## sims/SPEC.md and engine

- Slow-light corrugated (fishbone) waveguides cannot be expressed in the cross-section contract: no way to declare a periodic sidewall corrugation or a fixed measured ng (`ng_fixed`) that also scales the EO overlap (Vpi*L enhancement by ng/ng0). chen2023 config therefore models the unperturbed rib and marks the Vpi*L target `comparable: false`.
- Target `source` objects accept free keys (`comparable`, `basis`, `note`); the schema declares only `type: object`. If these are to be machine-read, list them.
- Placeholder materials (`class: unknown` with a value) are used for LN tensors, RF permittivities and conductor conductivities as in qi2024; the contract says unknown values are left out, while the engine requires them. Same gap as in the earlier batches.
- Bonded face-down stacks (boynton2020: TFLN chip above the electrodes, handle on top) work with painter-order regions but y = 0 at the TFLN bottom face needed a note; a statement of the vertical-origin convention for inverted stacks would help.
