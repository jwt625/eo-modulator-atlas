# SPEC proposals from batch p3_01 (not applied)

## qi2024 (sims/qi2024/config.yaml)
- waveguide_platform enum has no value for an unetched LN slab loaded with a low-index oxide rib (silica rib on TFLN, no LN etch). `lnoi_loaded_sin` and `lnoi_loaded_si` do not fit. `other` used in devices.csv. Proposal: add `lnoi_loaded_oxide` (or a generic `lnoi_loaded_other`).
- No material in the config distinguishes the PECVD silica rib from the thermal BOX; both use `silicon_dioxide`. Proposal: allow per-region material overrides or named variants (for RF eps_r of PECVD oxide, e.g. zhang2022 infers 5.5).

## li2022b (sims/li2022b/config.yaml)
- Visible-wavelength optics: LN, SiO2 and Si indices at 532 nm are not in the paper and the 1550 nm placeholders in earlier configs are physically wrong at 532 nm. The config omits `n_o`, `n_e` and `n`, so it cannot run the optical stage. Proposal: as already proposed by p1_01 (deng2026), allow an explicit incomplete-draft status so the app can load the geometry and refuse only the optical solve; and let `standard_reference` materials come from `engine/data` with wavelength dispersion when the library has them.

## zhang2022 and wang2022a
- Cladding reference surface: both papers give a PECVD cladding thickness (0.6 um, 2 um) without saying whether it is measured from the LN surface, the electrode top or conformal. The configs use a flat layer to electrode top plus the stated thickness (project_inference). A `cladding: {type: flat|conformal, thickness_um, reference: electrode_top|film_top}` input would remove this guess.
- Frequency-dependent Vpi targets: zhang2022 reports RF Vpi at 250 GHz and EO S21 to 325 GHz; the target list can express `bw3db_ghz` but not `vpi_rf_v at_ghz`. Proposal: recognize `vpi_rf_v` with `at_ghz` as a target metric.
- GSGSG (shared middle ground, two MZMs) for IQ chips: wang2022a uses a single G-S-G cut; no way to express the second signal line sharing a ground in one cross-section config.

## Schema / skill notes (no change applied)
- `il_basis` is one column for both loss definitions; xu2020 has measured fibre-to-fibre loss and author-derived on-chip loss in the same row (il_basis = measured, on-chip basis only in the evidence file).
- Several papers state a bound in prose and show the crossing in a figure (xu2020: "greater than 48 GHz" in text, crossing marked at ~48 GHz in Fig. 4(a)). Both `gt` and `approx` qualifiers were entered on the same field; confirm that duplicate field entries in `qualifiers` are acceptable to build_views.
- Papers with a family of lengths where the headline metric is measured on only one length (qi2024: Vpi only on 12.917 mm) leave Vpi empty on the other rows; there is no column for "shared across lengths, stated once".

## Audit follow-up (2026-10-03)
- Duplicate or contradictory qualifier operators on one field (xu2020: `bw3db_ghz:gt;bw3db_ghz:approx`): audit answer is no. The row now carries one operator. Proposal: `validate_db.py` should reject two different operators for the same field in `qualifiers`.
- `validate_db.py` does not flag an evidence `derived` entry whose CSV cell is empty (the audit found such orphans in p3_02). Proposal: check that every `derived` and `entries` value has a non-empty, equal CSV cell.
- Placeholder constants with provenance class `unknown` (LN indices, permittivities, Pockels tensor, SiO2/Si, conductor conductivity) in the wang2022a, zhang2022, qi2024 and li2022b configs follow the sims/liu2021 precedent, whereas SPEC.md says `unknown` values are left out and listed in `missing`. Coordinator decision needed: record the placeholder precedent explicitly in SPEC.md or standardize on omission (which makes those configs not runnable until verified constants exist). Not changed in this batch.
- Geometry values that the paper does not state but the polygon needs (zhang2022 sidewall angle 70 deg and ground width 100 um) are now class `unknown` with an UNVERIFIED note, consistent with the previous bullet.
