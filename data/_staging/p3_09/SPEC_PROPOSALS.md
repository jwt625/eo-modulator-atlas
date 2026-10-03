# SPEC / schema proposals from batch p3_09 (not applied)

## Schema
- `waveguide_platform` has no value for polycrystalline sol-gel BTO imprinted on SiO2/Si (falcone2026); `bto_on_oxide_substrate` used. Proposal: keep as is, add tag `sol_gel` (used in tags) or an explicit `bto_polycrystalline_on_oxide`.
- No column for the effective Pockels coefficient (falcone2026 r_eff about 20 pm/V; berman2026 154 and 145 pm/V). It is the headline material-level metric of both papers and sits only in notes. Proposal: `r_eff_pm_per_v` with `r_eff_basis`.
- `band` enum has no value for 1631 nm (berman2026 racetrack, used `other`; neither L nor C band).
- `device_class` has no value for Fabry-Perot cavities or photonic-crystal band-edge modulators (berman2026, used `other` with tags).
- `bw3db_reference`: berman2026 plots S21 as "zeroed" (normalized to an unstated low-frequency point); entered `unspecified`. Proposal: allow `normalized_unstated` or a note-only convention.
- Phase-shifter rows measured with an off-chip fiber interferometer (falcone2026): no field distinguishes this from an on-chip MZM; `drive` and `vpi_convention` entries are derived and flagged in evidence.
- `drive_vpp_v` is described as "system demo" amplitude; falcone2026 uses a 360 Vpp 100 kHz triangular sweep that defines the Vpi measurement. Left in notes. Clarify whether Vpi-measurement drive amplitude belongs there.

## Simulation configs
- None written. falcone2026 is a lumped, partially poled polycrystalline phase modulator (not a traveling-wave electrode device) and the engine has no polycrystalline or poling-fraction model: an `r_eff` or isotropic-effective-coefficient material mode would be needed. nenezic2026 does not disclose the optimized geometries in the main text (Supplementary Material absent).

## Addendum 2026-10-03 (audit corrections; proposals only, not applied)
- `discovered_via` tokens `web_search` and `author_group_followup` (and `continuation_2026_10_02`, `tmp_eo_md`) are used by p3_07, p3_09 to p3_19 but are outside the documented token list in the schema (drive_doc | tmp_eo_md | blog:<post-id> | local_corpus | ofc2026 | landmark | web | assigned). Propose extending the documented list (or mapping `web_search` to `web`); not renamed in this batch because the tokens are used across batches.
- Acknowledged cleanrooms (falcone2026, berman2026): entered in `foundry_or_fab` under the p3_08 to p3_10 audit rule; propose stating the rule in the skill (rule 6). New facility organizations use the paper's wording because the acronyms (FIRST, NUFAB, NUANCE) are not expanded in the source.
