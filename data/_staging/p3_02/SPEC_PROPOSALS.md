# SPEC / schema proposals from p3_02 (not applied)

## churaev2023 and vanackere2023 (hybrid LN-on-SiN configs)
- Target `optical_confinement_in_region` has no way to name the region. Propose `{metric: optical_confinement_in_region, region: <region name>, value: 0.38, ...}`. churaev2023 reports 38 percent (Fig. 1h/1i) and 52 percent LN participation, vanackere2023 shows only the mode inset; the 38 percent target was left out of `targets` for this reason.
- Per-phase-section vs MZM push-pull targets. Both papers quote a per-phase-section simulated VpiL (8.2 and 6.0 V cm) and an MZM/device number. SPEC says arm/push-pull factors are not yet defined; propose an explicit `target.convention: per_phase_section | mzm_push_pull | mzm_differential` so measured MZM numbers can be compared without silent factor-of-2 errors. Used: single-section model with 1 V across the gap, target is the per-section value only.
- Configs cannot run without sourced RF permittivity and Pockels constants (the optical library covers only refractive indices). Propose a verified RF-permittivity/Pockels companion to `engine/data/materials.json` (LN, SiN, SiO2, Si with citations) so that papers that state no constants (all three LN-on-SiN papers in this batch family) yield runnable configs. Used: constants omitted, config marked NOT RUNNABLE, as in he2019/valdez2022.
- GSSG differential line (vanackere2023) has no cross-section representation: propose electrode roles for two signal lines with opposite weights (`weight: +0.5 / -0.5`) and a spacing parameter; the paper does not dimension the S+/S- gap, so only one phase section is modelled.
- Interlayer ambiguity: churaev2023's Methods give a 100 nm SiO2 interlayer between Si3N4 and LN but the FEM drawing shows none. No SPEC change needed; recorded in `missing` and `limitations`.

## schema (devices.schema.yaml)
- `electrode_type` has no GSSG/differential-coplanar value (vanackere2023 used `other`); propose `tw_gssg`.
- Resonator tuning is only available in nm/V (`tuning_nm_per_v`); churaev2023 reports 30 MHz/V (dimer) and liu2023 9.6 pm/V. Propose `tuning_ghz_per_v` or accept either with the reference wavelength stored.
- No column for modulation index / phase-modulation amplitude at a stated microwave power (churaev2023: 0.14 pi at 40 dBm, EO comb) or for resonator FSR in GHz.
- `device_class` has no Fabry-Perot / grating-cavity value (liu2023 used `other` with tags); propose `resonator` or `fp_cavity`.
- `waveguide_platform` has no LN-on-sapphire value (celik2022 used `other`); propose `lnos_rib`.
- `source_type` enum lacks `institutional_copy` used in vanackere2023's source.json (the cached file is the version of record, entered as `journal`), and `redistribution` in source.json uses `allowed_with_attribution` for liu2023, which is not in the schema enum (papers.csv uses `open_license_ok`).
- `discovered_via` tokens `web_search` and `author_group_followup` (from the batch CSV) are not in the documented vocabulary (`web`, `assigned`, ...); entered verbatim for vanackere2023 and liu2023.
- Photon-lifetime bandwidth estimates (BW = f0/Q, liu2023) have no distinct `bw_reference`; entered as `unspecified` with basis `derived`.

## Audit follow-up (2026-10-03)
- `sidewall_angle_deg` has no stated reference axis in the schema. Staged rows use the angle from the substrate plane (60 to 75 deg, 90 = vertical); liu2023 states 30 deg from the vertical and celik2022 states 12 deg with no axis. Proposal: add to the conventions block "sidewall_angle_deg is measured from the substrate plane (90 = vertical wall); angles given from the vertical are converted with a derived evidence entry; an unstated axis leaves the cell empty". In this batch liu2023 was converted (60, derived) and celik2022 was left empty.
- `discovered_via`: batch-CSV tokens `web_search` and `author_group_followup` were mapped to the documented `web` and `assigned` (as in p3_01) for vanackere2023 and liu2023; the earlier proposal to extend the vocabulary is withdrawn.
- A facility named only in the acknowledgements as "facility support" (liu2023: Westlake Center for Micro/Nano Fabrication; wang2022a in p3_01) is not a `foundry_or_fab` entry and creates no organization row; facilities named as the place work was performed (celik2022, churaev2023) do.
- Excess loss (liu2023: filter-plus-modulator path, normalization unstated) has no column distinct from `il_onchip_db`; entered in `il_onchip_db` with the definition in the includes/excludes text and notes.
- The Fig. 1i drawing of churaev2023 has a 1 um scale bar that contradicts the stated 6 um gap and 600 nm Si3N4 thickness; no SPEC change, recorded in the sim provenance and `missing`.
