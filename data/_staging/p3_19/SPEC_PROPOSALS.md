# SPEC / schema proposals from batch p3_19 (not applied)

## Schema
- Free-space metasurface modulators have no Vpi. Their native efficiency metrics have no column and sit in notes: required voltage Vreq = lambda_res / (Q * S) and efficiency eta = dR / Vreq (soma2025), transmittance modulation efficiency eta_mod in 1/V (sun2026a), relative modulation dT/T at a stated Vpp and frequency (prountzou2026). Proposal: `eta_mod_per_v` (+ `eta_mod_basis`, operating-point note) and `vreq_v`, or accept `vpi_convention = resonance_tuning_derived` only with a defined formula.
- No column for the effective Pockels coefficient r_eff (soma2025 58 pm/V; fukui2025 about 20 pm/V; sun2026a 118-151 pm/V; prountzou2026 27 pm/V assumed from earlier work). Same proposal as p3_09 (`r_eff_pm_per_v` with basis).
- `device_class` has no value for free-space/surface-normal modulators; `other` plus tags `free_space;metasurface` used (same as liu2025c). Proposal: `free_space_modulator` or a `free_space` tag convention.
- `waveguide_platform` and `electrode_type` have no value for free-space metasurfaces or for interdigitated/sandwich electrodes; `other` and `lumped` used. `drive` left empty (MZM-arm concept does not apply).
- `bw3db_reference`: all four papers plot EO S21 or relative modulation normalized to a low-frequency level that is not tied to a stated frequency; `unspecified` used. Same issue as p3_09.
- `il_onchip_db` is the closest column for free-space excess loss (-10log10(R+T), fukui2025) and reflection insertion loss (soma2025); the on-chip/fiber-to-fiber split does not fit. Proposal: a `loss_free_space_db` column with its definition in `il_onchip_includes`.
- `band` has no value for 1510 nm (S/E band) or 770-790 nm; `other` and `visible_nir` used. 1579 nm entered as `l_band`.
- `drive_vpp_v` is defined for system demos; prountzou2026 uses a 1.5 V amplitude/Vpp (not distinguished by the authors) for every modulation-depth measurement, fukui2025 a 20 Vpp 200 Hz sinusoid. Entered there with a note.
- Rows that are the authors' own numerical projections inside a measured paper (fukui2025-b) are entered as a separate simulated row; basis columns carry `simulated`/`predicted`. A flag column for projection rows would let views exclude them from measured-only plots.
- Author list conflict between preprint and Crossref when a preprint lacks an author added in review (prountzou2026): Crossref list used and noted.

## Simulation configs
- None written (free-space resonant structures, outside the traveling-wave contract; no engine representation of normal-incidence guided-mode, quasi-BIC or HCG resonances).

## Audit follow-up (2026-10-03)
- source_type/url policy: soma2025 and prountzou2026 now use `arxiv_preprint` and the versioned arXiv PDF like the other preprint-based papers, with the journal citation in `venue` and `doi`. The skill should state that `source_type`/`url` follow the cached version the numbers come from.
- Free-space rows: `length_mm` holds the lateral aperture, `il_onchip_db` a free-space reflection or excess loss, and (fukui2025-b) a predicted required Vpp was in `drive_vpp_v`; the last is now empty and only in notes. Proposal: `aperture_um` (or `active_area_um2`) and `free_space_loss_db` columns, and a documented rule that `drive_vpp_v` is for demonstrated drives only.
- `er_type` is set whenever `extinction_ratio_db` is set (soma2025-a was missing it).
- Cross-batch: "The University of Texas at Austin" (this batch, sun2026a) and "University of Texas at Austin" (p3_17, heidari2022) are one institution; the coordinator should pick one spelling in both organizations.csv files and both papers.csv `universities` cells before merging (not changed here).
