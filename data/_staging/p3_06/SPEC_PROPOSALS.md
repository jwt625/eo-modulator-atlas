# SPEC / schema proposals from batch p3_06 (not applied)

- device_class has no value for non-ring resonant modulators (photonic crystal nanobeam cavity, coupled-resonator cavities). zhong2026-a uses `other`; proposal: add `resonator` (or `cavity`) or define `ring` as any resonant modulator.
- Resonant modulators (hu2026, geravand2025-a, zhong2026-a): the headline "Vpi*L" is a resonance-shift figure (`resonance_tuning_derived`) while some papers also report a true phase-shifter Vpi (geravand2025-a: 6.28 V). One `vpi_convention` cell cannot label both; proposal: a second convention column or a rule that Vpi*L-derived values go in vpil_* only with the convention noted in evidence.
- `drive` is defined for MZM arms; rings and cavities leave it empty. Proposal: add an explicit `not_applicable` value or document that empty means not applicable for resonators.
- Operating-point-dependent resonant bandwidth (optical peaking via detuning: hu2026 83/97/more than 110 GHz, zhong2026 59/97/more than 110 GHz): convention (d) allows rows per operating point but the detuning/IL point has no column. Proposal: `detuning_il_db` (or an operating-point text column) so rows can be compared; currently kept in notes with one headline row.
- `bias_for_vpi_v` sign: earlier batches use signed voltages (ogiso2024 -10). Used negative for reverse bias here; confirm the convention is documented.
- Test-structure rows (geravand2025-a: stand-alone MRM that shares the design of the headline device): no tag vocabulary is defined for "characterization structure, not a delivered device"; `test_structure` used as a free tag.
- `il_fiber_to_fiber_db` vs `il_onchip_db` for edge-coupled packaged chips where the paper gives "passive loss of the packaged chip" (geravand2025-b): chosen fiber_to_fiber with a note; per-facet or total coupling loss often not stated.
- Redistribution for CC-BY-NC-ND VoR (zhong2026): enum has only open_license_ok / restricted_local_only / unknown; NC-ND permits unmodified non-commercial sharing. Kept restricted_local_only; the rule for NC and ND licenses should be written down.
- Skill wording: the BATCH_INSTRUCTIONS text says verified_on 2026-10-01 while the task for this batch said 2026-10-02 (used).

## Added 2026-10-03 (after Q1 audit; not applied)
- `vpi_convention` has no value for a Vpi read as the diagonal length in a two-port (I, U) voltage map (gupta2023): it is neither per-arm nor line-differential. Used `mzm_push_pull` as the authors' label plus a note; propose an explicit value or a documented rule.
- `bw3db_reference` has no way to record that quoted bandwidths of one resonator at several detuning points use different normalizations (zhong2026 59/97 GHz vs 110 GHz); only the headline reference is stored.
- `drive_vpp_v` basis for swings estimated through a cable attenuation factor (hu2026): `author_estimate` used; propose stating that rule in convention (h).
