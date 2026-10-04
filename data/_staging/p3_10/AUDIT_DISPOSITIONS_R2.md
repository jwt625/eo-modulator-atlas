# Audit dispositions, round 2: batch p3_10

- Audit: `data/_staging/audits/p3_08-p3_10-r2-claude-audit-2026-10-03.md` (covers p3_08, p3_09, p3_10; this file holds the p3_10 findings)
- Papers: anderson2025, chelladurai2025, suceava2025, ulrich2025, yu2024
- Date: 2026-10-04
- Source re-check: `references/ulrich2025/text.md` p.6 ("a voltage change of 0.084 V/um results in a pi phase shift - this corresponds to a VpiL about 1.04 +/- 0.08 Vcm"), p.22 Supplement Eq. 19-22 (r_eff,meas about 0.81 r_eff; r_eff = r_eff,meas / 0.81 about 345 pm/V; r_eff,meas about 280 pm/V is the phase shift divided by the full length; Eq. 22 VpiL about E_AC d L = lambda d / (Gamma n_o^2 n_g r_eff) about 1.04 V cm, d = 10 um), p.24 Supplementary Fig. 10 caption ("Bandwidth measurement ... up to 20 MHz", resonance at 5 MHz; setup S11 resonances after 1 MHz); `references/suceava2025/source.json` (license CC-BY-4.0, license_verified true, content_note "Coordinator decision pending on source_type").
- Files edited: `data/devices.csv` (row ulrich2025-mzi), `data/papers.csv` (row suceava2025), `data/evidence/ulrich2025.yaml`. Not edited: anderson2025, chelladurai2025, yu2024 (no findings), `organizations.csv`, `sims/`, `references/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | numerical | applied-adjusted | Confirmed: 1.04 V cm uses the meander-compensated r_eff 345 pm/V; 0.084 V/um x 10 um x 1.537 cm = 1.29 V cm (equivalently 1.04 x 345/280 = 1.28). `vpil_dc_vcm` 1.04 kept (reported value, SKILL rule 4). Appended to `devices.csv` ulrich2025-mzi `notes`: "VpiL 1.04 uses meander-corrected r_eff 345 pm/V (280 pm/V measured / 0.81, Supplement Eq. 20-22); measured device: 0.084 V/um x 10 um x 1.537 cm = about 1.29 V cm." Evidence `vpil_dc_vcm`: locator "p.6 text; p.22 Eq. 22" -> "p.6 text; p.22 Eq. 20-22"; note appended "; uses meander-corrected r_eff 345 pm/V; device as measured about 1.29 V cm (0.084 V/um x 10 um x 1.537 cm)". Adjustment: no `derived` list item for vpil_dc_vcm with value 1.29, because the `derived` list backs the CSV cell value (validate_db compares it to the cell) and the cell holds 1.04; the 1.29 arithmetic is in the notes instead. Optional tag `meander_corrected_vpil` not added. |
| R2-F3 | metadata | applied (a); (b) deferred | Confirmed: `source.json` now has CC-BY-4.0, license_verified true, and a pending source_type note. `papers.csv` suceava2025 `notes`: "source.json still shows license unverified and restricted_local_only (not edited)." -> "source.json updated by the coordinator (CC-BY-4.0, license verified); source_type decision pending." Part (b) (journal vs arXiv identity: `source_type`, `url`, `access`) deferred to the coordinator (round-1 F15 open decision). `license` and `redistribution` unchanged (correct). |
| R2-F4 | minor | applied | Source: p.24 Supplementary Fig. 10(a) "up to 20 MHz", 5 MHz resonance; Fig. 10(b) setup resonances after 1 MHz. Kept `bw_measured_to_ghz` 0.001 (auditor's first option; data above 1 MHz are setup-limited). Evidence ulrich2025-mzi `bw_measured_to_ghz` note: "1 MHz upper limit; setup resonance at 5 MHz" -> "1 MHz upper limit; setup resonance at 5 MHz; data recorded to 20 MHz (Fig. S10a), setup resonances above 1 MHz (Fig. S10b)". |

Counts: applied 2 (R2-F3 part (a), R2-F4), applied-adjusted 1, rejected 0, deferred 1 (R2-F3 part (b)).

## Changed numerical or blocking cells

None. No numerical cell value changed; ulrich2025-mzi `vpil_dc_vcm` stays 1.04 with a note (as-measured device about 1.29 V cm, p.6 text, p.22 Supplement Eq. 20-22).

## Sim config follow-ups

None (no sim configs exist for these papers).

## Deferred items needing decisions

- R2-F3(b) / round-1 F15, suceava2025 identity: either set `source_type` = journal, `url` = https://doi.org/10.1002/adma.202507564, `access` = open_access (keeping `arxiv_id`), or keep the arXiv identity with the note that the license applies because the cached file is the Wiley version of record. Coordinator decision; `references/suceava2025/source.json` `source_type` would need the matching change (out of scope here).
- Cross-batch round-1 F22 (dc/rf Vpi cutoff) and F23 (`published_on` for arXiv rows) remain with the coordinator.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p3_08-p3_10-r2-verify-claude-audit-2026-10-04.md`: 9 of 10 changed cells confirmed; keeping ulrich2025-mzi `vpil_dc_vcm` 1.04 (basis derived, author Eq. 22) confirmed as consistent with rule 4 and convention (h). Applied by coordinator after re-checking the source: akazawa2026-a `drive` evidence locator -> "p.3 Fig. 2(d); p.4 Fig. 3(b) caption; p.5 text" (Fig. 3 caption is on p.4 of text.md); ulrich2025-mzi `vpil_dc_vcm` evidence note shortened to 24 words. Pending (devices.csv busy with another serial corrector): ulrich2025-mzi qualifiers += `vpil_dc_vcm:approx` (text p.6 and Supplement Eq. 22 read "≈1.04 ± 0.08 V cm", convention (b)).
