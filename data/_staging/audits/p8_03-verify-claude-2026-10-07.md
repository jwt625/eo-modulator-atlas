# p8_03 verification (claude, fresh context, 2026-10-07)

Inputs: `data/_staging/audits/p8_03-claude-audit-2026-10-07.md`, `data/_staging/p8_03/{AUDIT_DISPOSITIONS.md,BATCH_REPORT.md,papers.csv,devices.csv,organizations.csv,evidence/*.yaml}`, `ingest_2026_10_07/{VERIFY,CORRECT}_PROMPT.md`, convention (ee) in `data/schema/devices.schema.yaml`, sources `references/{khalil2026,axline2026,mohl2025,zhu2022,lin2026b}/text.md` and figures `axline2026/figures/page_04.png`, `mohl2025/figures/page_05.png`, `mohl2025/figures/page_26.png` (opened). Coordinator decisions: F1-F11 applied, F1 length_mm 0.4, optional F6 fsr_nm 1.87 derived, khalil2026-a tag `acoustic_resonance`, F4 sign notes per device.

Result: 11 confirmed, 0 not confirmed. Unrecorded changes: none found. New issues: 3 minor. Dry run: `merge counts: {'papers': 5, 'devices': 9, 'orgs': 2, 'evidence': 5}; conflicts: 0; validation errors: 0` (dry run, nothing written).

Mechanical check (script in scratchpad, not in repo): every evidence entry and derived entry equals its CSV cell (0 mismatches over all five files); axline2026 conversions lambda^2/c x Table B.1 value reproduce all six tuning_nm_per_v (0.00256, 0.00146, 0.00245, 0.00203, 0.00296, 0.00274) and fsr_nm (0.504, 0.562, 0.594, 0.561, 0.593, 0.593); mohl2025 lambda^2/c x 218 GHz at 1603.5 nm = 1.8697 nm -> 1.87; khalil2026 0.781 nm x 0.235 V x 0.04 cm / 0.0084 nm = 0.8740 V cm; ng = lambda^2/(FSR x (2 pi 200 um + 400 um)) = 1.857.

## Per finding

| id | verdict | evidence |
|---|---|---|
| F1 | confirmed | khalil2026 text p.26 Eq. S31: "we extract VpiL = 0.874 +- 0.084 V cm for an interaction length of L = 2 x 200 um"; p.27: L = 2 pi R + Lc with straight length Lc/2, push-push because "the acoustic wavelength (8 um) is an integer divisor of the 400 um separation between the two arms"; Table S1 p.30 "Lc 400 um", "R 200 um". devices.csv length_mm 0.4; evidence entry value 0.4, locator "p.30, Table S1 (Lc); p.26 Eq. S31", note "two 200 um straights of one racetrack, both acoustically driven (push-push, p.26-27)"; vpil_dc_vcm 0.874 kept; the old "length_mm 0.2 = one arm" sentence is gone from the row note, replaced by "length_mm 0.4 = two 200 um straight sections ... (Table S1 Lc)". Tag `acoustic_resonance` present. BATCH_REPORT judgment call (1) now reads "length_mm 0.4 = Lc of Table S1 ... (corrected per audit F1; was 0.2 = one arm)", consistent. |
| F2 | confirmed | axline2026 text p.13 A.4: "rib waveguides about 200 nm deep ... about 200 nm of LT slab remains". All six rows carry `slab_thickness_nm:approx;etch_depth_nm:approx`; values 200/200 unchanged; evidence notes already say "about". |
| F3 | confirmed | Table B.1 p.16 labels kappa0(r), kappa0(b); page_04.png Fig. 2(b): kappa0(r) arrow on the 0 GHz dip, kappa0(b) on the dip near 5 GHz; p.4 text "pump ... on the red-detuned mode such that omega_S = omega_r. The optical signal thus passes through the mode omega_AS = omega_b". All six notes now read "kappa0(r) X MHz (red, pump supermode) and kappa0(b) Y MHz (blue, signal supermode)"; values checked against Table B.1: 203/138, 217/254, 164/194, 359/201, 290/286, 235/342 MHz, all match. No "bright resonator"/"dark resonator" kappa wording remains. |
| F4 | confirmed | page_04.png Fig. 2(a) (caption: "Device 1 near 1560 nm"): the tilted dark-resonance line runs from about +10 GHz at -30 V to about -8 GHz at +30 V, so frequency falls with bias, d(lambda)/dV > 0. d1 note: "sign not stated in the text, Fig. 2(a) (Device 1, p.4) consistent with positive d(lambda)/dV"; d2-d6 notes: "sign not stated or shown for this device (magnitude entered)", correct since Fig. 2(a) shows Device 1 only. Values unchanged. |
| F5 | confirmed | mohl2025 page_05.png Fig. 2(i) (75 mK): orange curve about 62 GHz at -100 V falling to about 15 GHz at +40 V; page_26.png Fig. 22: fit from about +2.6 GHz at -100 V to about -2.3 GHz at -65 V, magnitude about 140 MHz/V; text p.26 "dc-tuning efficiency is about 2pi x 395 MHz" with Fig. 23 x-axis labelled V_tune (0 to -100 V) and caption "tuning voltage". Row note carries all three statements; tuning_nm_per_v stays empty (convention y). |
| F6 | confirmed | mohl2025 text p.4 "free spectral range of 218 GHz"; Fig. 2(e) caption p.5 "measured in transmission at room temperature after optical packaging". fsr_nm 1.87 in CSV; derived entry formula "lambda^2/c * FSR; lambda = 1603.5 nm, FSR = 218 GHz (p.4; Fig. 2(e), p.5); room temperature, unbiased"; arithmetic 1.8697 nm. Row note: "FSR 218 GHz (Fig. 2e; fsr_nm 1.87 nm derived at 1603.5 nm) ... all at room temperature, no voltage". ("unbiased" rests on p.25 "no voltages were applied to the transducer device prior to cooling down"; acceptable.) |
| F7 | confirmed | zhu2022 text p.6 Acknowledgements "Device fabrication was performed at the Harvard University Center for Nanoscale Systems"; author contributions "L.H., C.R., and M.Z. fabricated the modulator" (affiliation 4 HyperLight). Convention (ee): in-house fabrication = monolithic. integration = monolithic; row note "Integration monolithic: modulator fabricated in house by the HyperLight authors at Harvard CNS (p.6)". integration is not an evidence column, so no evidence entry is needed. |
| F8 | confirmed | zhu2022 text p.3 Fig. 3 caption "driven at 27.5 GHz with an amplitude of 8.1 Vpi (Vpi approx 2.5 V)". Evidence vpi_rf_freq_ghz basis measured, locator "p.3, Fig. 3 caption; p.9, Fig. S1b", note matches. |
| F9 | confirmed | khalil2026 text p.9 Methods "cryostat at 5 K"; p.30 Fig. S8a colour scale "5.46 K" to "11.71 K" over 0-10 dBm; p.26 VpiL at 1 dBm. Qualifiers `prop_loss_db_per_cm:approx;temperature_k:approx`; value 5 unchanged; evidence note "cryostat setpoint; device 5.46 K at 0 dBm to 11.71 K at 10 dBm RF (p.30, Fig. S8a), not stated at the 1 dBm of the VpiL"; row note consistent. |
| F10 | confirmed | mohl2025 text p.10 "linear trend (Fig. 5c) corresponding to ... eta/Ppump = -73 dB/mW"; p.10-11 Conclusion "-60 dB (-72 dB per mW pump power)". Context note now ends "the p.10 linear trend line (Fig. 5c) gives -73 dB/mW"; per_mw_db -72 kept. |
| F11 | confirmed | lin2026b papers.csv notes: "Read at section level (abstract, Sec. I-VIII headings, Tables I-VIII captions and intro text); no value entered". Evidence file empty (entries [], derived []). |

## Unrecorded changes

No pre-correction copy exists in the repo (no git used), so the check compares the staged files with the audit's description of the distilled state and file timestamps. Files rewritten at 22:00 (papers.csv, devices.csv, evidence khalil2026/mohl2025/zhu2022) contain only the F1, F5-F11 edits plus the coordinator tag; axline2026.yaml, lin2026b.yaml and organizations.csv are untouched since 21:45 (distiller time), consistent with F2-F4 being CSV-only. All values the audit listed as matching the source (zhu2022, khalil2026, mohl2025, axline2026 geometry and Table B.1 numbers, orgs) are unchanged. YAML formatting is consistent across rewritten and untouched files. No unexplained change found.

## Coordinator rules

- Licence: empty for all five (cached arXiv copies, no licence in source.json or text); no token to normalise. Crossref CC-BY-4.0 of the zhu2022 and mohl2025 versions of record kept in notes, not in `license`. redistribution restricted_local_only for all five.
- New orgs Miraex SA and Xplore multiuser cleanroom: `ror_id` and `name_source` empty. Xplore country BE is stated in its org note as entered from outside the paper (auditor accepted).
- No sim configs (`sims/<id>` absent for all five), so no standard_reference constants.
- discovered_via `web_search;author_group_followup` for all five; none of the five paper_ids is in `data/papers.csv`, so no canonical value to preserve and no `--replace-paper-ids` needed.

## New issues

| # | severity | where | issue | suggested fix |
|---|---|---|---|---|
| N1 | minor | `p8_03/AUDIT_DISPOSITIONS.md` last line | "Left unedited: BATCH_REPORT.md (... still describes khalil2026-a length_mm 0.2 ...)" is stale: the coordinator reworded BATCH_REPORT judgment call (1) to length_mm 0.4. Also BATCH_REPORT mohl2025 "Row mohl2025-a carries only r_eff 13 pm/V ... plus geometry" omits the F6 fsr_nm 1.87. Report files only, no data effect. | Optional: update the disposition line; optionally add "and fsr_nm 1.87 (derived, F6)" to the BATCH_REPORT mohl2025 line. |
| N2 | minor | evidence `source_files` of mohl2025 and axline2026 | Figures now cited in row notes / derived entries are not listed: `references/mohl2025/figures/page_05.png` (Fig. 2(e) FSR, Fig. 2(i) sign) and `references/axline2026/figures/page_04.png` (Fig. 2(a) sign, Fig. 2(b) labels). Provenance completeness only; validator passes. | Optional: append the two paths to the respective `source_files`. |
| N3 | minor | mohl2025-a row note | "the text gives +145 MHz/V": the text (p.25 and Fig. 22 caption p.26) prints "dwa/dV = 2pi x 145 MHz/V" without an explicit plus sign; positive is implied, so the contradiction stands, but the "+" is not a literal quote. | Optional: "the text gives 2pi x 145 MHz/V (positive as written)". |

No blocking or numerical issue.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p8_03` ->
`merge counts: {'papers': 5, 'devices': 9, 'orgs': 2, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.

Not done: no network, no git; only this file written.
