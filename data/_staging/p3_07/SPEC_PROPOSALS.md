# Schema / skill proposals from batch p3_07 (not applied)

No simulation configs were written (SOH and silicon-polymer papers), so there are no `sims/SPEC.md` proposals.

## Schema (devices.schema.yaml)
- `waveguide_platform` and `electrode_type` have no value for a silicon-polymer hybrid with a 40 nm silicon strip core and a bottom-electrode strip line (lu2020 used `other` for both). Proposal: `silicon_strip_polymer` and `tw_stripline`.
- Gate voltage is an operating-point dimension for SOH devices (zwickel2020: 0 V and 300 V change the bandwidth from about 3 to about 20 GHz) but has no column; it is encoded in the row label and tags. Proposal: `gate_voltage_v`.
- Design-study and projected rows (zwickel2020 design rows) sit in the same table as measured devices and differ only by basis and tags. Proposal: a `row_kind` enum (measured_device | simulated_design | projection) so plots and views can filter without parsing tags.
- `bw3db_reference` has no clean value for responses normalized to a low but non-zero frequency (70 kHz in schwarzenberger2026, 40 MHz in zwickel2020). `other` plus `bw3db_reference_freq_ghz` was used; a documented threshold for treating this as `dc` would remove the ambiguity.
- RF loss is quoted as an amplitude coefficient (1/mm) in zwickel2020 and converted to dB/cm through the derived list; a `rf_loss_definition` note convention (amplitude or power) would make the conversion auditable.
- In-device Pockels coefficient (lu2020 n^3 r33 = 1021 pm/V; schwarzenberger2026 r33 = 158 pm/V) has no column (same as the p3_04 proposal for `r_eff_pm_per_v`).
- Link-test temperature (lu2020: Q and BER from 25 to 110 C, burn-in at 90 C) has no row dimension or column; same as the p3_04 `temperature_c` proposal.
- `il_basis` is one column, but schwarzenberger2026 has a measured total on-chip loss and a phase-shifter loss obtained by subtraction (basis derived) stored in `prop_loss_db_per_cm`; per-field basis lives only in the evidence file.
- `source_type` has no `institutional_copy` (schwarzenberger2026 source.json) and `source.json` redistribution for lu2020 says `restricted_local_only` although a CC-BY-4.0 notice is verified; papers.csv follows the verified license. A rule for which of the two wins in the cache metadata would help.

## Skill / contract
- The contract says "mark simulated values as simulated" but not how to treat model-vs-measurement overlays (zwickel2020 Fig. 5): model curves were left out of device cells and mentioned in notes only.
- Reading values from scatter markers (three repeats per gate voltage) has no stated convention for choosing the entered value; the median was used with the spread in the note.
- `discovered_via` tokens `web_search` and `author_group_followup` from the batch CSV are not in the documented vocabulary (same as p3_02); entered verbatim.

## Added 2026-10-03 (after Q1 audit; not applied)
- `eo_material` is required, but model-only or platform-level papers (zwickel2020) do not name the EO material for the measured devices; the value was inferred from the platform and documented in an evidence entry with basis `derived`. Propose an `unspecified` enum value or a rule that allows empty.
- An RF characteristic impedance stated as an analytic high-frequency limit (not a measurement at a frequency) has no dedicated representation; entered as `z0_ohm` with basis `derived` and a note. Propose a convention for asymptotic or design-formula Z0.
