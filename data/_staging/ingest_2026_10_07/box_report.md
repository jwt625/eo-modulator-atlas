# buffer_oxide_um re-read report (2026-10-07)

Input: box_worklist.csv (67 rows, 27 papers). Output: box_proposals.csv (67 rows, one per worklist row). Sources re-read: references/<paper_id>/text.md, plus figure images for meng2023 Fig. 2(a), valdez2023 Fig. 1(b), valdez2023a Fig. 2 (page 3), lee2020a Fig. 5(a), tan2024 Fig. 1(b).

## Counts per verdict

| verdict | rows | papers |
|---|---|---|
| keep | 50 | berman2026 (3), cai2025 (2), falcone2026 (2), hou2024 (2), lee2020 (2), lee2020a (2), lee2026 (5), li2022b (1), li2026aa (8), lin2025 (3), mao2024 (2), pan2021 (1), powell2024 (1), rahman2025 (3), sabatti2024 (2), shen2021 (1), tan2024 (1), ulrich2025 (1), valdez2023a (2), wang2024b (3), wang2025 (1), zhang2022 (2) |
| move_to_cladding | 7 | meng2023 (1; 100 nm buffer), thiele2022 (6; 400 nm SiO2 buffer on bulk Ti:LN, no BOX) |
| correct_value | 2 | wang2022-a (0.65 -> 2.0), weigel2018-a (0.05 -> 3; 50 nm SiO2 moved to cladding) |
| clear | 8 | valdez2023 (all 8 rows; 0 was the absent electrode buffer, BOX thickness not stated) |

## Basis-only changes on kept rows (convention (bb))

Convention (bb): text-stated dimensions are design_target unless the paper says measured. 27 kept rows currently carry basis measured for a text-stated BOX; new_buffer_basis proposes design_target for: cai2025-a/b, lee2020-a/b, lee2020a-a, lee2026-a..e, li2026aa-a..h, lin2025-a..c, powell2024-a, rahman2025-1..3 (nominal thickness). valdez2023a-a/b: measured -> extracted_from_figure (value is a schematic label only). weigel2018-a is design_target on the corrected value. Apply or ignore as a separate decision; none changes a value.

## Unclear or judgement cases

- lee2020a-b (simulated HfO2 design): Fig. 5(a) draws SiO2 in the blue "unchanged" colour with no thickness; 4.3 um is inherited from the fabricated device (p.3). Kept as design_target; drop it if a stricter reading is wanted.
- valdez2023a-a/b: 4000 nm is a label on the Fig. 2(b) process schematic (SiN chip); the arrow may span the 180 nm SiN plus 40 nm CMP oxide as well (difference at most 0.22 um). No text statement. Kept 4 with basis extracted_from_figure. The LNOI 2 um BOX in the same figure is etched away.
- falcone2026-a/b: 2 um is the oxide of the simulated stack (p.9); the fabricated SiO2 thickness is not stated. Kept as design_target.
- lee2026-a..e: wafer BOX 4.7 um is stated (p.2), but the oxide is released around the waveguide, so the gap is air (h_air 4.7 um). Value kept as wafer BOX; cladding air unchanged.
- cai2025-a/b and rahman2025-1..3: LNOI donor BOX (2 um) is removed in the process; the retained 4 um oxide is under the Si3N4 / SiN1 waveguide on the Si wafer, which is what is kept.
- zhang2022-a/b: the 2 um buried oxide is stated in the p.3 velocity-matching text ("this set of parameters is used for the actual devices"); the existing locator p.4 Sec. 3.A does not hold it (locator corrected in new_buffer_locator).
- valdez2023: the paper says oxide cladding was deposited by PECVD on the SOI chip (p.3) while also saying Au sits directly on the LN (p.15); the existing cladding "none above LN" is kept unchanged (not in scope).
- tan2024-a: 2 um is a numeric label in the Fig. 1(b) schematic, no text statement; kept with extracted_from_figure.

No row remains undecided. Rows needing a stack drawn without numbers gave no value: meng2023-a and valdez2023 (8 rows) have empty buffer_oxide_um.
