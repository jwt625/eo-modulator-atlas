# Audit dispositions, round 2: batch p3_08

- Audit: `data/_staging/audits/p3_08-p3_10-r2-claude-audit-2026-10-03.md` (covers p3_08, p3_09, p3_10; this file holds the p3_08 findings)
- Papers: chiang2025, taghavi2026, akazawa2026
- Date: 2026-10-04
- Source re-check: `references/akazawa2026/text.md` p.3 (AMZI, VpiL), p.4 ("Vpi = 2.2 V"), p.5 (Fig. 3(b) caption and text on push-pull pairs; "bias voltage of 2.3 V, approximately corresponding to Vpi for a 600-um-long phase shifter"); `references/taghavi2026/text.md` p.6 ("10 ~50 um material on top protects the ~500 nm underneath"), p.8 ("electrode-to-core distance (d1)"), p.15 Fig. 4(d) caption ("10~50 nm thick FN-LC"); page render `references/taghavi2026/figures/page_13.png` opened (Fig. 2(a) label "d1=6", Si-N++ ohmic contact on the far side).
- Files edited: `data/devices.csv` (rows akazawa2026-a, taghavi2026-a), `data/evidence/akazawa2026.yaml`, `data/evidence/taghavi2026.yaml`. Not edited: chiang2025 (no findings), `papers.csv`, `organizations.csv`, `sims/`, `references/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F2 | metadata | applied | SKILL rule 3 makes `drive` mandatory when Vpi/VpiL is filled; enum has `unspecified`. Source: p.3 characterizes single 500/1000 um phase shifters in AMZIs without stating drive; push-pull is stated only for the circuit MZI phase-shifter pairs (p.5, Fig. 3(b) caption). `devices.csv` akazawa2026-a `drive`: `` -> `unspecified`. Evidence entry added: {field: drive, value: unspecified, basis: derived, locator: "p.3 Fig. 2(d); p.5 Fig. 3(b) caption", note: "single phase shifter drive not stated; circuit MZI pairs operated push-pull"}. |
| R2-F5 | minor | applied | Source: p.6 text "10 ~50 um material on top" vs p.15 Fig. 4(d) caption "10~50 nm thick FN-LC". Evidence taghavi2026-a `cladding` note: "FN-LC layer thickness 10 to 50 nm per Fig. 4 caption" -> "FN-LC overlayer 10-50 um (p.6 text) vs 10-50 nm (Fig. 4(d) caption, p.15); not reconciled". Cell value unchanged. |
| R2-F6 | minor | applied | Source: Fig. 2(a) render label "d1=6"; p.8 "electrode-to-core distance (d1)"; Fig. 2 caption: Si-N++ ohmic contact on the other side of the slab. Appended to `devices.csv` taghavi2026-a `notes`: "electrode_gap_um = d1, metal electrode to waveguide core distance (Fig. 2(a), p.8); counter-contact is through the doped Si slab." `electrode_gap_um` 6 unchanged. |
| R2-F7 | minor | applied | Source: p.5 "a bias voltage of 2.3 V, approximately corresponding to Vpi for a 600-um-long phase shifter". Appended to `devices.csv` akazawa2026-a `notes` after the 2.17 V consistency check: "p.5 also gives 2.3 V as approximately Vpi for 600 um." `vpi_dc_v` 2.2 (p.4) unchanged. |

Counts: applied 4, applied-adjusted 0, rejected 0, deferred 0.

## Changed numerical or blocking cells

- akazawa2026 / akazawa2026-a / `drive`: `` -> `unspecified` (convention field; source p.3 Fig. 2(d), p.5 Fig. 3(b) caption). No numerical cell changed in this batch.

## Sim config follow-ups

None (no sim configs exist for chiang2025, taghavi2026, akazawa2026).

## Deferred items needing decisions

None from this batch. Cross-batch round-1 F22 (dc/rf Vpi cutoff) and F23 (`published_on` for arXiv rows) remain with the coordinator; rows unchanged.
