# buffer_oxide_um proposals: fresh-context verification (2026-10-07)

Scope: `data/_staging/ingest_2026_10_07/box_proposals.csv` (67 rows) and `box_report.md`, checked against
`references/<paper_id>/text.md`, figure images, current `data/devices.csv` cells (buffer_oxide_um, cladding,
substrate, epitaxy_or_stack, notes) and `data/evidence/<paper_id>.yaml` entries (buffer_oxide_um, cladding).
Column definition: schema desc of buffer_oxide_um (2026-10-07); basis convention (bb) and (h); locator convention (i).
Read-only: no data files edited.

## Summary

| item | checked | confirmed | not confirmed |
|---|---|---|---|
| non-keep verdicts (move_to_cladding 7, correct_value 2, clear 8) | 17 | 17 | 0 |
| new cladding texts (meng2023-a, thiele2022-a..f, weigel2018-a) | 8 | 7 | 1 (meng2023-a: text needs amendment) |
| keep verdicts (all 50 checked; every keep paper's source passage re-read) | 50 | 50 | 0 |
| basis-only changes (25 measured -> design_target, 2 measured -> extracted_from_figure) | 27 | 27 | 0 |
| locator changes (zhang2022-a/b, lee2020a-b, lee2026-a..e) | 8 | 6 | 2 (zhang2022-a/b) |

## Non-keep rows

### meng2023-a: move_to_cladding (0.1 -> empty). Verdict CONFIRMED; new cladding text NOT CONFIRMED as written
- p.5 Sec. 2.2 (Sec. 2.2 heading on p.4, sentence on p.5): "The TCO loaded composite electrode is positioned on a 100 nm thick silicon oxide buffer." Also p.13 conclusion "thanks to a 100nm buffer layer". This is the LN-to-electrode buffer, not a BOX.
- Fig. 2(a) (p.6, image checked): stack Si / SiO2 / LN / ITO+Au with SiO2 surrounding; no thickness on the SiO2 under the LN. No BOX thickness in the text. buffer_oxide_um empty is correct; note "BOX thickness not stated; stack drawn without numbers" is correct and matches the row's notes ("Not reported: ... BOX and cladding thickness").
- Cladding text problem: current cell "SiO2 (Fig. 2(a)); thickness not stated" -> proposed "SiO2 (Fig. 2(a)); 100 nm SiO2 buffer between the LN and the ITO/Au electrodes" drops "thickness not stated" for the drawn SiO2 over-cladding, so the cell could be read as a 100 nm cladding. Amended text to apply:
  `SiO2 (Fig. 2(a)), over-cladding thickness not stated; 100 nm SiO2 buffer between the LN and the ITO/Au electrodes`
  Locator "p.5 Sec. 2.2; p.6 Fig. 2(a)" correct. The cladding evidence entry is currently basis extracted_from_figure; with the text-stated 100 nm added it should be design_target (bb), note that the SiO2 presence is from Fig. 2(a).

### thiele2022-a..f: move_to_cladding (0.4 -> empty). CONFIRMED (6 rows), cladding text CONFIRMED
- p.5: z-cut congruent bulk LN, Ti in-diffused waveguides; no buried oxide exists.
- p.6: "Afterwards the electrode material is sputtered with a buffer layer of SiO2 to reduce waveguide losses, a Cr layer for adhesion and an Au layer for the electrodes"; lift-off follows, so the SiO2 is under the electrodes.
- p.6 Table 1 SiO2 column = 400 nm for all three types: phase modulator (rows a, b), directional coupler (c, d), polarisation converter (e, f); Cr 10 nm; Au 300/100/100 nm.
- Current cladding cells empty, no cladding evidence entries: nothing lost. Proposed text "SiO2 buffer 400 nm under the Cr/Au electrodes (bulk Ti:LN, no buried oxide)" is exact. New cladding evidence entries: basis design_target, locator p.6, Table 1.

### valdez2023 (cw1, cw2, cn1, cn2, ow1, ow2, on1, on2): clear (0 -> empty). CONFIRMED (8 rows)
- p.15 Sec. 4.2: "There is no such oxide layer in our devices since the gold (Au) electrodes are patterned directly on the LN surface" - the 0 described the absent top buffer.
- Fig. 1(b) (p.3, image checked): h_BOx drawn as a dashed arrow with no number; h_cmp is the Si-to-LN oxide (about 40 nm, p.2). No BOX thickness anywhere in the text (searched all um values and "BOx"/"buried").
- Information kept elsewhere: cladding "none above LN (Au electrodes patterned directly on LN)", epitaxy_or_stack "... / 0.75 um Au electrodes directly on LN", substrate "BOX thickness not stated". Nothing lost. Remove the 8 buffer_oxide_um evidence entries.
- Out of scope, flagged only: p.3 says "An oxide cladding was deposited using a plasma-enhanced chemical vapor deposition (PECVD) process" (Fig. 1(c) "Top Oxide Edge"), while the cladding cell says "none above LN"; whether the PECVD oxide covers the phase-shifter region is not stated. Not part of this change.

### wang2022-a: correct_value 0.65 -> 2.0. CONFIRMED
- p.2: "silicon-on-insulator (SOI) wafer of a 220 nm top silicon layer and a 2 μm buried oxide (BOX) layer" (quote exact).
- p.3: 650 nm SiO2 over-cladding on the TFLN; already in the cladding cell ("650 nm PECVD SiO2 over-cladding on the LN") with its own evidence entry, so moving 0.65 out loses nothing. substrate and epitaxy_or_stack already say 2 um BOX. basis design_target, locator p.2 correct.
- Out of scope, flagged only: wang2022-b (same SOI platform, p.2 "All the passive structures are built on" this SOI) has buffer_oxide_um empty.

### weigel2018-a: correct_value 0.05 -> 3, 50 nm SiO2 to cladding. CONFIRMED (value and cladding text)
- p.3: "silicon-on-insulator wafers (220 nm Si thickness, 3 μm oxide thickness)" (quote exact; text renders the unit as "3 m" from a dropped mu glyph). Wafer spec -> design_target, locator p.3 text correct.
- p.17 Fig. 1 caption: "Aluminum electrodes were deposited on a 50 nm SiO2 layer over the LN film." Proposed cladding "SiO2 50 nm between the LN film and the Al electrodes" is exact. Current cladding empty: nothing lost. New cladding evidence entry: basis design_target, locator p.17, Fig. 1 caption (the old buffer entry's basis measured is not carried over).

## Keep rows (all 50 values confirmed)

Every keep paper's passage re-read; page locators checked against the `<!-- page N -->` markers.

| rows | value | source (locator, quote) | result |
|---|---|---|---|
| berman2026-a/b/c | 3 | p.4 "a 330 nm thick BTO layer, a 3 µm thick silica layer, and a 500 µm thick silicon substrate" | confirmed |
| cai2025-a/b | 4 | p.2 "100 mm-diameter silicon wafer with 4 µm thick wet thermal oxide"; supplement p.13 "4 µm SiO2 /525 µm Silicon"; LTOI 2 um BOX eliminated by BHF (p.2) | confirmed; basis -> design_target confirmed |
| falcone2026-a/b | 2 | p.9 "The simulated geometry reproduced the final device stack: ... on a SiO2(2 µm)/Si substrate" | confirmed (design_target) |
| hou2024-a/b | 2.0 | p.11 Methods "600 nm thin film LN sits on top of a 2 um silicon dioxide on a silicon wafer"; 1.5 um PECVD SiO2 is cladding | confirmed |
| lee2020-a/b | 4.3 | p.12 "4.3 µm-thick thermally grown SiO2 on silicon substrate" | confirmed; basis -> design_target confirmed |
| lee2020a-a | 4.3 | p.3 "330 nm of LPCVD Si3N4 on 4.3 µm-thick thermal silicon oxide" | confirmed; basis -> design_target confirmed |
| lee2020a-b | 4.3 | p.3 fabricated stack; p.7 Fig. 5(a) (image checked): SiO2 label in blue = unchanged between designs, no thickness drawn | confirmed as a judgement (inherited unchanged layer, design_target); new locator "p.3 (fabricated stack); p.7 Fig. 5(a)" confirmed |
| lee2026-a..e | 4.7 | p.2 "800-nm X-cut LN on 4.7-µm oxide on Si substrate wafer"; p.4 Fig. 1(f) caption lists h_air = 4.7 um among design parameters; oxide released only around the waveguide | confirmed; basis -> design_target and locator "p.2 (wafer); p.4 Fig. 1(f) caption" confirmed |
| li2022b-a | 2 | p.2 "Between the thin-film LN and the silicon substrate is a 2-µm thick thermal oxide" | confirmed |
| li2026aa-a..h | 4.7 | p.2 "bonded to a 4.7-μm thermally grown silicon dioxide substrate with a silicon base"; called SiO2 BOX on p.2 | confirmed; basis -> design_target confirmed |
| lin2025-a/b/c | 4.7 | p.5 wafer spec "600 nm of lithium tantalate ..., 4.7 µm of SiO2, and a 525 µm-thick high-resistivity silicon substrate" (reflectometry on p.13 refers to the SiO2 cladding windows, not the BOX) | confirmed; basis -> design_target confirmed |
| mao2024-1550/1310 | 2.0 | p.2 "The thickness of the thermally oxidized SiO2 was 2.0 μm" | confirmed |
| pan2021-a | 2 | p.4 "a 600-nm LN thin film is bonded on top of a 2-µm-thick silica layer and a 0.4-mm-thick Si substrate" | confirmed |
| powell2024-a | 2 | p.2 "The SiO2 layer is 2 µm-thick and is on a Si substrate" | confirmed; basis -> design_target confirmed |
| rahman2025-1/2/3 | 4 | p.3 "The buffer oxide below SiN1 has a nominal thickness of 4 µm"; LNOI handle and oxide removed (p.3) | confirmed; basis -> design_target confirmed ("nominal") |
| sabatti2024-fh/sh | 2 | p.4 "a 2 µm thick silicon dioxide insulation layer on a silicon handle" | confirmed |
| shen2021-a | 2 | p.2 "a 2-μm-thick buried oxide layer" | confirmed |
| tan2024-a | 2 | p.3 Fig. 1(b) (image checked): "2μm" arrow on the SiO2 between the 220 nm Si and the Si substrate; no text value; 1 um SiO2 is cladding | confirmed (extracted_from_figure) |
| ulrich2025-mzi | 2 | p.10 "105 nm SrTiO3 on top of 2 μm SiO2 on a Si substrate" (CVD + bonded SiO2) | confirmed |
| valdez2023a-a/b | 4 | p.3 Fig. 2(b) (image checked): "4000 nm" label on the SiO2 of the HR-Si SiN chip, schematic "not to scale"; LNOI 2 um BOX etched away (p.3 text) | confirmed; basis -> extracted_from_figure confirmed |
| wang2024b-a/b/c | 4.7 | p.8 Methods "high-resistivity silicon carrier wafer covered with 4.7-μm-thick thermal silicon dioxide" | confirmed |
| wang2025-a | 4.7 | p.2 "a 4.7 μm thick buried oxide (BOX) layer" | confirmed |
| zhang2022-a/b | 2 | p.4 Sec. 3.A "600-nm-thick X-cut LN bonded on top of thermal oxide (2-μm-thick) on a 500-μm-thick silicon substrate"; also p.3 "a buried oxide thickness of 2 μm ... used for the actual devices" | value confirmed; locator change NOT confirmed (below) |

## Basis-only changes (convention (bb), (h))

- 25 rows measured -> design_target: cai2025-a/b, lee2020-a/b, lee2020a-a, lee2026-a..e, li2026aa-a..h, lin2025-a..c, powell2024-a, rahman2025-1..3. In every source the thickness is a wafer/stack specification or "nominal"; none says SEM/AFM/profilometer/ellipsometry for the BOX. CONFIRMED.
- valdez2023a-a/b measured -> extracted_from_figure: the only source is a numeric label on a process schematic; consistent with tan2024-a. CONFIRMED.
- Count check: the report's "27 kept rows" = these 25 + 2. weigel2018-a (measured -> design_target) is part of its correct_value change.

## zhang2022 locator fix (p.4 -> p.3): NOT CONFIRMED

The proposal's reason ("existing locator p.4 Sec. 3.A does not hold the statement") is wrong: p.4 Sec. 3.A Device Fabrication reads "consisting of a 600-nm-thick X-cut LN bonded on top of thermal oxide (2-μm-thick) on a 500-μm-thick silicon substrate". That is the fabricated-device statement and matches the existing note "thermal oxide". Keep locator `p.4 Sec. 3.A` for zhang2022-a/b (adding "; p.3" is optional and not needed).

## Rows to apply

buffer_oxide_um cell and evidence entry:

| device_id | buffer_oxide_um | evidence action |
|---|---|---|
| meng2023-a | empty | delete buffer_oxide_um entry |
| thiele2022-a..f (6) | empty | delete buffer_oxide_um entries |
| valdez2023-cw1, cw2, cn1, cn2, ow1, ow2, on1, on2 (8) | empty | delete buffer_oxide_um entries |
| wang2022-a | 2.0 | value 2.0, basis design_target, locator p.2, note "SOI wafer BOX" |
| weigel2018-a | 3 | value 3, basis design_target, locator p.3 text, note "SOI wafer oxide under the Si waveguides" |
| cai2025-a/b, lee2020-a/b, lee2020a-a, lee2026-a..e, li2026aa-a..h, lin2025-a..c, powell2024-a, rahman2025-1..3 (25) | unchanged | basis -> design_target (plus proposed notes for cai2025, rahman2025, lee2026; lee2026 locator "p.2 (wafer); p.4 Fig. 1(f) caption") |
| valdez2023a-a/b | unchanged | basis -> extracted_from_figure |
| lee2020a-b | unchanged | locator -> "p.3 (fabricated stack); p.7 Fig. 5(a)" |
| falcone2026-a/b | unchanged | note "simulated stack value" (optional) |
| zhang2022-a/b | unchanged | no change (reject locator fix) |

cladding cell and evidence entry:

| device_id | new cladding | evidence |
|---|---|---|
| meng2023-a | `SiO2 (Fig. 2(a)), over-cladding thickness not stated; 100 nm SiO2 buffer between the LN and the ITO/Au electrodes` (amended) | update entry: basis design_target, locator p.5 Sec. 2.2; p.6 Fig. 2(a) |
| thiele2022-a..f | `SiO2 buffer 400 nm under the Cr/Au electrodes (bulk Ti:LN, no buried oxide)` | new entries: basis design_target, locator p.6, Table 1 |
| weigel2018-a | `SiO2 50 nm between the LN film and the Al electrodes` | new entry: basis design_target, locator p.17, Fig. 1 caption |

All other worklist rows: no change. Out-of-scope follow-ups (not to apply here): valdez2023 cladding vs p.3 PECVD oxide; wang2022-b empty BOX on the same 2 um SOI.
