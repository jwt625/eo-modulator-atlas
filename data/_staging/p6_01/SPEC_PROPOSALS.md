# SPEC proposals (p6_01)

## All four papers
- Bound-type targets: 3 dB EO bandwidth "over 67 GHz" / "over 110 GHz" (xue2026, chen2026, yang2022, liu2021) cannot be expressed as a target with value and tolerance; proposal: `{metric: bw3db_ghz, bound: gt, value: 67}` evaluated pass when the predicted bandwidth exceeds the value.
- Variants: xue2026-a (4 mm) shares the cross-section of xue2026-b; no mechanism for per-device `line.length_mm` overrides.

## xue2026
- Rail topology (head, slot, stem) reuses the liu2021 / chen2022 periodic_t_rail form with stems lumped into the unloaded cut; symbol roles H, S, T were read from the Fig. 1(a) schematic and are not defined in the paper.
