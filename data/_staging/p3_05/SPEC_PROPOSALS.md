# SPEC / schema proposals from p3_05 (not applied)

No sim configs were written in this batch (no dielectric traveling-wave device), so there are no sims/SPEC.md proposals.

## schema (devices.schema.yaml)
- `eo_material` has no pure-germanium value; steckler2025 pure-Ge EAMs use `germanium_silicon_eam` (tag `pure_ge`). Propose `germanium` or rename to `germanium_silicon_eam` family wording.
- `eo_material = pzt` is used for stress-optic (piezo-actuated) devices (montifiore2026); no `effect` column distinguishes Pockels, stress-optic, Franz-Keldysh, free-carrier. Propose an `eo_effect` enum (pockels, stress_optic, franz_keldysh, qcse, plasma_dispersion, kerr, other) since eo_material no longer implies the mechanism.
- `waveguide_platform` has no suspended-GaAs/III-V membrane value (li2025b used `algaas`); propose `suspended_gaas`.
- Resonance-tuning devices report tuning in GHz/V (montifiore2026: 0.92 and 1.01 GHz/V, also pm/V); only `tuning_nm_per_v` exists, so values were converted from the paper's pm/V figures. Same proposal as p3_02: `tuning_ghz_per_v` or wavelength-referenced storage.
- Bandwidth columns are in GHz; kHz-MHz devices (PZT, MEMS) give numbers like 0.0004. Acceptable but plots need a unit-aware axis; consider `bw3db_mhz` display handling in build_views.
- `bw3db_reference` has no value for "normalized to a stated low frequency other than 1 or 10 GHz" without also filling the numeric `bw3db_reference_freq_ghz`; used `other` plus 0.1 GHz for li2025b. No problem, just confirm views read `bw3db_reference_freq_ghz`.
- `capacitance_ff` for the PZT actuator (19 nF) is 19000000 fF; consider a unit-flexible capacitance column.
- Power consumption (nW-level actuator leakage, uW dark-current power) and residual amplitude modulation (RAM) have no columns; kept in notes.
- `il_basis` is one column for several loss definitions (li2025b row a: measured fiber-to-fiber plus derived propagation loss; evidence carries the per-field basis). Same note as p3_01.
- Static vs dynamic extinction ratio on the same row (steckler2025: static ER in `extinction_ratio_db`, dynamic ER at 120/140/160 Gbit/s only in notes). `er_type` holds one value; propose a second `dynamic_er_db` + `dynamic_er_rate_gbps` pair or one row per data rate.
- `drive` enum for single-port devices (EAM, ring, single-arm PZT) is `single_ended`; a `not_applicable` value would be cleaner for EAMs.

## skill / process notes
- When the cached version is an arXiv preprint and Crossref describes the journal version, `published_on` and `license` stay empty (p3_01 convention); the skill could state this explicitly.
- The skill says "p.N is the PDF page index of text.md"; for arXiv preprints with different journal pagination this matches the text.md markers, which is what was used.

## Added 2026-10-03 (after Q1 audit; not applied)
- `optical_input_power_dbm` is defined as the power used in the measurement; papers often quote power only for a broadband transmission scan or a fiber-tip value (li2025b, steckler2025). Proposal: state in the schema that scan-only or fiber-tip powers stay in notes.
- Basis for a Vpi obtained by model-fitting a lock-in or AM spectrum (li2025b): convention (h) covers formula-derived values but not fit-derived ones; `derived` was used.
