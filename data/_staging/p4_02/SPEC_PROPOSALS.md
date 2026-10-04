# SPEC_PROPOSALS (p4_02)

## didier2026
- waveguide_platform enum has no value for lithium niobate on sapphire (LNOS, rib on an insulating Al2O3 substrate); `other` used with substrate "sapphire". Proposal: add `lnos_rib`.

## li2026aa
- No contract changes needed; sims/li2026aa/config.yaml follows sims/chen2022/config.yaml with `line.loading.type: none` and a single uniform cross-section.
- Per-wavelength rows (1310 to 2000 nm) share one cross-section; SPEC still has no variants mechanism, so the config targets the 1550 nm row (li2026aa-d) only.
