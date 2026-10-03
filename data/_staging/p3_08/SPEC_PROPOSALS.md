# Schema / skill proposals from batch p3_08 (not applied)

No sim configs written (no dielectric traveling-wave device), so no sims/SPEC.md proposals.

- `eo_material` has no value for carrier-effect III-V (InGaAsP hybrid MOS, akazawa2026); `other` used. Same mechanism gap as p3_05: an `eo_effect` enum (pockels, plasma_dispersion, band_filling, franz_keldysh, stress_optic, orientational_birefringence) would help; ferroelectric nematic LC (taghavi2026) has both Pockels and a slow orientational-birefringence response.
- `integration` has no value for liquid / post-process infiltration of an organic or liquid-crystal cladding on a foundry chip; `polymer_backfill` used for ferroelectric nematic LC. Propose `liquid_infiltration` or a rename to `organic_backfill`.
- Two phase-shift mechanisms on one device with different bandwidths (taghavi2026: 119 kHz and 7.8 GHz f-6dB; DC tuning 150 pm/V): one row, slow mechanism only in notes. Propose a second bandwidth pair or a row-per-mechanism convention.
- `bw6db_ghz` has no reference-frequency column (chiang2025 and taghavi2026 give f-6dB relative to a plateau, not DC). Propose `bw6db_reference` mirroring `bw3db_reference`.
- AC-measured Vpi (chiang2025: 25 MHz, to preclude slow LC response) entered in `vpi_rf_v`/`vpil_rf_vcm`, leaving `vpi_dc_v` empty; views that plot only `vpi_dc_v` will omit it. Same static-vs-RF measurement-frequency ambiguity as p3_04 (mao2024).
- Ring modulator V_pi L defined with ring circumference (taghavi2026, 3.33 V*mm) while `length_mm` is the phase-shifter length (not stated); no column for "length used in VpiL".
- Per-pi metrics (akazawa2026: static power fW/pi, switching energy pJ/pi, loss dB/pi, rise/fall time in ps) have no columns; `energy_per_bit_fj` is per bit and was not used. Propose `static_power_w_per_pi`, `switch_energy_j_per_pi`, `rise_time_ps`, `fall_time_ps`, `excess_loss_db_per_pi`.
- `drive_vpp_v` is documented as system-demo amplitude; measurement drive amplitudes (taghavi2026 2.83 Vpp S21, akazawa2026 2.0 Vpp on 3.0 V bias) were left in notes.
- Effective Pockels coefficient (chiang2025 r33 29.5 pm/V in-device) has no column (same as p3_04 proposal `r_eff_pm_per_v`).
- Cleanroom-only fabrication credit (akazawa2026: facility named in acknowledgements, not as the fabricator of the wafer) is entered in `foundry_or_fab` with a note; the skill could state whether partial-fab facilities belong there.
- Skill: when the batch CSV merges preprint and journal rows (taghavi2026), the skill should state that `doi` is kept while numbers, `arxiv_id` (with version), `url` (versioned PDF) and empty `license`/`published_on` follow the preprint (p3_01 and p3_05 convention).

## Addendum 2026-10-03 (audit corrections; proposals only, not applied)
- `drive` is defined by convention (f) for MZM arms; for rings and other single-electrode devices (taghavi2026) the value is now `unspecified`. Propose stating that `unspecified` is the value for non-MZM devices, or adding `not_applicable`.
- No written cutoff between `vpi_dc_*` and `vpi_rf_*` for quasi-static sweeps (chiang2025 25 MHz AC in `vpi_rf_*`; yu2024 1 MHz, falcone2026 100 kHz, ulrich2025 20 Hz in `vpi_dc_*`). Propose a rule (for example sweeps up to 1 MHz are dc; a stated RF-frequency measurement is rf).
- `published_on` is empty for arXiv-sourced rows although the PDF stamp gives the first-version date (taghavi2026 2026-02-23, akazawa2026 2026-09-21). Propose allowing the stamp date under convention (k) as "the paper's own notice".
- Acknowledged cleanrooms: the p3_08 to p3_10 audit applied one rule (a cleanroom the paper names as used for the devices, also when only in the acknowledgements, goes in `foundry_or_fab`, as for kohli2025 and the Binnig and Rohrer Nanotechnology Center entry). Propose stating this in the skill (rule 6).
