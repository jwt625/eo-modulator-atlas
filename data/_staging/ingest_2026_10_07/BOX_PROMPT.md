# buffer_oxide_um re-read brief (2026-10-07, DevLog-022 D1)

New definition (data/schema/devices.schema.yaml): `buffer_oxide_um` = thickness of the buried/bottom oxide (BOX or
bonding oxide) between the substrate and the EO or waveguide film. An oxide buffer or over-cladding between the
waveguide and the electrodes is not this column; it goes to `cladding` (free text, evidence-backed, e.g.
"SiO2 over-cladding 0.65 um").

Input: `data/_staging/ingest_2026_10_07/box_worklist.csv` (67 rows whose evidence wording is top-buffer or
unclear). For each row re-read the source passage (`references/<paper_id>/text.md`, figure images for stack
drawings) and the current row (`data/devices.csv`: buffer_oxide_um, cladding, substrate, waveguide_platform,
notes) and its evidence entry (`data/evidence/<paper_id>.yaml`).

Output: `data/_staging/ingest_2026_10_07/box_proposals.csv` with columns device_id, current_value, verdict
(keep | move_to_cladding | correct_value | clear), new_buffer_oxide_um, new_buffer_basis, new_buffer_locator,
new_buffer_note, new_cladding (the full new cladding text when it changes, else empty), cladding_locator,
source_quote (short verbatim phrase), reason. Rules: a stated BOX thickness that the row lacks may be proposed as
correct_value only with its locator and quote; a stack drawn without numbers gives no value; never infer a
thickness from a wafer product name. One line per worklist row, plus a short `box_report.md` (counts, unclear
cases). No network, no git, no emoji; write only those two files.
