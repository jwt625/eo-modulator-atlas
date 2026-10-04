# Audit dispositions, round 2: batch p3_19

- Audit: `data/_staging/audits/p3_18-p3_19-r2-claude-audit-2026-10-03.md`
- Papers: soma2025, fukui2025, sun2026a, prountzou2026 (p3_18 findings are in `data/_staging/p3_18/AUDIT_DISPOSITIONS_R2.md`)
- Date: 2026-10-04
- Source re-check: `references/fukui2025/text.md` p.2-4 (Numerical analysis, Methods) and p.22 (Supplementary Note 8, Table S1); `references/soma2025/text.md` p.6 (Fig. 4d text) and the acknowledgements (p.12); `references/akazawa2026/text.md` acknowledgements for the full cleanroom name.
- Files edited: `data/devices.csv` (rows fukui2025-b, soma2025-b), `data/organizations.csv` (row Takeda Sentanchi Super Cleanroom, notes only), `data/evidence/fukui2025.yaml`, `data/evidence/soma2025.yaml`. Not edited: `data/papers.csv`, `sims/`, `references/`, `audit_status`. CRLF line endings of the CSV files and LF of the YAML files preserved. sun2026a and prountzou2026: no findings, not touched.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F5 | minor | applied (option a) | Source: p.2-3 "the optical loss is as small as 0.24 dB" at ND 1e19 cm-3 (Fig. 2c; Methods p.4: largest value over the simulated wavelength range); p.3 "operating wavelength is selected to be 1547.4 nm for IM-HCG ... insertion loss of 0.21 dB" (Fig. 2f); Table S1 (p.22) numerical row: 1550 nm, Q 930, 40 GHz, 0.24 dB, 180 pm/V. Option (a) chosen: q_loaded 930, bw3db_ghz 40, tuning 0.18 nm/V and il 0.24 dB all come from that Table S1 row, and fukui2025-a (1510 nm, 0.56 dB) mirrors the Table S1 experiment row with the same loss definition. `data/devices.csv` fukui2025-b `wavelength_nm` 1547.4 -> 1550; `notes` "0.21 dB loss at the 1547.4 nm operating point (Fig. 2f)." -> "wavelength_nm 1550 and il_onchip_db 0.24 follow Table S1 (p.22); at the 1547.4 nm operating point (Fig. 2f, p.3) the insertion loss is 0.21 dB.". Evidence fukui2025-b / wavelength_nm: value 1547.4 -> 1550, locator "p.3; Fig. 2f (p.10)" -> "Table S1 (p.22)", note -> "Table S1 numerical case, paired there with 0.24 dB loss; Fig. 2f operating point is 1547.4 nm with 0.21 dB (p.3)"; basis simulated unchanged. Evidence fukui2025-b / il_onchip_db note "as small as 0.24 dB at ND 1e19 cm-3" -> "...; largest value over the simulated range (Methods p.4); Table S1 pairs it with 1550 nm". `band` other unchanged. |
| R2-F6 | minor | applied | Source p.6: "we also plot the reflection spectrum in a logarithmic scale for the unbiased case, indicating that 20-dB extinction is obtained at the resonant wavelength"; this is a 0 V notch depth, neither a DC voltage-switched ratio nor a dynamic eye ER. Value 20 kept (paper's wording). `data/devices.csv` soma2025-b `er_type` static -> unspecified; `notes` "Extinction 20 dB is the passive 0 V reflection dip (Fig. 4d inset)." -> "Extinction 20 dB is the passive 0 V reflection dip (Fig. 4d inset), not a voltage-switched ratio, so er_type is unspecified.". Evidence soma2025-b / extinction_ratio_db note "passive reflection at 0 V in dB scale" -> "0 V notch depth of the passive reflection spectrum in dB scale, not a voltage-switched ratio". |
| R2-F7 | minor | applied-adjusted | Source: soma2025 acknowledgements (text.md line 1526) "fabricated in part at Takeda Cleanroom"; the full name "Takeda Sentanchi super cleanroom, The University of Tokyo" is written in akazawa2026 (text.md line 890), the other paper using this org row. Adjusted: the note cites akazawa2026 instead of "from outside the paper". `data/organizations.csv` Takeda Sentanchi Super Cleanroom `notes` "Cleanroom named in acknowledgements; country from host institution" -> "Cleanroom named in acknowledgements; country from host institution; full name as written in akazawa2026; soma2025 writes 'Takeda Cleanroom'". No rename. |

Counts for p3_19: applied 2 (R2-F5, R2-F6), applied-adjusted 1 (R2-F7), rejected 0, deferred 0.

## Changed numerical or blocking cells

- fukui2025 / fukui2025-b / `wavelength_nm`: 1547.4 -> 1550; source Table S1 (p.22), numerical row (1550 nm, Q 930, 40 GHz, 0.24 dB, 180 pm/V). `il_onchip_db` 0.24 unchanged.
- soma2025 / soma2025-b / `er_type`: static -> unspecified; source p.6, Fig. 4d inset (0 V spectrum only). `extinction_ratio_db` 20 unchanged.

## Sim config follow-ups

None: no `sims/` config exists for soma2025, fukui2025, sun2026a or prountzou2026.

## Deferred items needing decisions

None.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p3_18-p3_19-r2-verify-claude-audit-2026-10-04.md` confirmed all 17 changed cells. Advisory A2 applied by the coordinator: fukui2025-b `band` other -> c_band (row wavelength 1550 nm, Table S1 p.22; schema enum includes c_band). Advisory A1 (1550 nm is the nominal label of the simulated row; resonance near 1548 nm) and A3 (er_type convention for passive dip depth across kari2025, tan2024, soma2025) left for the user.
