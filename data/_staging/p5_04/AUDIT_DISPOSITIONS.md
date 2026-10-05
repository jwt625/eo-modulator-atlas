# p5_04 audit dispositions

Audit: `data/_staging/audits/p5_04-q1-claude-audit-2026-10-04.md`
Date: 2026-10-04
Scope: huang2026, shen2026, starnault2026, su2026, tobing2026. Each finding was re-checked against `references/<id>/text.md` and the figure renders (huang2026 Fig. 1(c) and Fig. 2(a); shen2026 Fig. 3(c); tobing2026 text for Fig. 4(d)-(f); starnault2026 and su2026 text). `audit_status` stays needs_audit.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | numerical | applied | devices.csv huang2026-b: `qualifiers` `bw3db_ghz:gt;il_fiber_to_fiber_db:lt` -> `bw3db_ghz:approx;il_fiber_to_fiber_db:lt`; `bw_measured_to_ghz` empty -> 110; row note reworded (3 dB about 100 GHz, trace near -3 dB from about 80 GHz, paper also says "above 100 GHz"). evidence/huang2026.yaml: new `bw_measured_to_ghz` entry (extracted_from_figure, p.2, Fig. 1(c)); `bw3db_ghz` note rewritten. Re-check: Sec. 1 and 4 say "100-GHz"/"bandwidth of 100 GHz", Sec. 2 "above 100 GHz"; the solid packaged S21 first reaches -3 dB near 80 GHz and stays at about -2.4 to -3.8 dB to the 110 GHz axis end. |
| F2 | numerical | applied | devices.csv huang2026-a: `bw_measured_to_ghz` empty -> 110; note appended (pre-packaging trace ends near -2.6 dB at 110 GHz). evidence/huang2026.yaml: new `bw_measured_to_ghz` entry. Re-check: dashed trace ends at about -2.6 dB (auditor: -2.5), no crossing visible; axis ends at 110 GHz. |
| F3 | minor | applied | evidence/shen2026.yaml shen2026-a `bw3db_ghz` note -> "'exceeding 100 GHz'; Fig. 3(c) fit crosses -3 dB near 105 GHz, VNA+OSA data to 110 GHz". devices.csv note appended (fit crosses -3 dB at about 105 GHz; 110 GHz OSA point about -3.5 dB). Values unchanged. Re-check: red fit crosses the dashed -3 dB line near 105 GHz, ends near -3.7 dB. |
| F4 | numerical | applied | devices.csv tobing2026-a: `extinction_ratio_db` 40 -> empty; `er_type` static -> empty; `qualifiers` `bw3db_ghz:approx;extinction_ratio_db:approx` -> `bw3db_ghz:approx`; note: ER sentence replaced by "Passive unbalanced-arm TFLN MZI (Fig. 4(d)) shows fringe extinction up to ~40 dB; not the 7 mm modulator's ER." evidence/tobing2026.yaml: both entries removed. Re-check: text p.3 ties the "up to ~40 dB" to the unbalanced-arm TFLN MZI spectrum, and the 7 mm modulator is introduced in the next sentence; no voltage-swept ER is stated. |
| F5 | numerical | applied | devices.csv tobing2026-a: `buffer_oxide_um` 0.5 -> empty; `epitaxy_or_stack` "350 nm LN on 500 nm thermal oxide ... handle removed" -> "350 nm LN with 500 nm thermal oxide; oxide position after bonding not stated ... Si handle removed"; note appended "Oxide thickness between LN and SiN not stated." evidence/tobing2026.yaml: `buffer_oxide_um` entry removed; stack value and note updated. Coordinator decision: empty the cell because the paper does not state where the oxide sits (p.2 Sec. 2.2 only says "TFLN with 500 nm-thick thermal oxide film have been successfully bonded" and mentions a "TFLN-SiO2" bonding interface). |
| F6 | metadata | applied | devices.csv starnault2026-a and -b: `vpi_convention` mzm_differential -> unspecified. evidence/starnault2026.yaml both `vpi_convention` entries: value -> unspecified, note -> "authors' 'differential Vpi'; per-arm S+/S- pair vs MZM-level (V1=-V2) not stated". `drive` dual_drive kept. Re-check: p.2 Sec. 3 "low-MHz differential Vpi of 2.2V"; the paper does not say per-arm or MZM-level. |
| F7 | metadata | applied-adjusted | Coordinator decision (no Crossref prefetch). evidence/{huang2026,shen2026,starnault2026,su2026,tobing2026}.yaml: new top-level `context_values` item `license_notice` quoting the footer "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group", locator "p.1-3, page footer" (the footer is on all three pages of each paper, confirmed in text.md). starnault2026, su2026 and tobing2026 notes also record the abstract's "(c) 2026 The Author(s)". Adjusted: applied to su2026 as well, because its Crossref record lists no license. `published_on` stays empty. |
| F8 | minor | applied-adjusted | devices.csv huang2026-a and -b: `device_class` other -> mzm; notes: "MZ layout from the Fig. 2(a) schematic; the text says only 'EOM'" (row -a). papers.csv huang2026 note: "EOM type ... not stated, so device_class is other" -> "Text says only 'EOM'; device_class mzm from the Fig. 2(a) schematic (Mach-Zehnder layout)." evidence/huang2026.yaml: two `device_class` entries (extracted_from_figure, p.3, Fig. 2(a)). Adjusted: added evidence entries so the schematic-based choice has a locator. Re-check: Fig. 2(a) draws input and output splitters, two arms and a central RF electrode. |
| F9 | minor | applied | devices.csv shen2026-a: `integration` bonded_heterogeneous -> monolithic; note appended "Laser is GaAs bonded onto TFLN; the MZM itself is monolithic TFLN." Tag gaas_on_tfln kept. Re-check: text p.2 Sec. 4 describes the MZM as a rib on the LN film; GaAs is bonded for the laser and SOA only. Precedent shamsansari2021-a is monolithic. |
| F10 | minor | applied | devices.csv su2026-a: `il_onchip_includes` "not itemised; text calls it the on-chip propagation loss of the 1 mm device" -> "not itemised; text calls it on-chip propagation loss"; note appended "Source arithmetic: 11.81 - 2x5.45 = 0.91 dB vs stated 0.86 dB." Re-check: p.2 Sec. 3 text confirms the three numbers. |
| F11 | minor | applied | devices.csv tobing2026-a note appended "Fig. 4(f): low-frequency dip to about -3 dB near 2-3 GHz; trace to about 67 GHz (reading)." Value 20 GHz approx unchanged. Not independently re-read from the figure; added as auditor reading, labelled as such. |
| F12 | minor | applied | devices.csv and evidence/starnault2026.yaml starnault2026-b `modulation_format`: "DP-16-QAM 125 GBd over 10 km (net 800 Gb/s, c-FEC/HD-FEC)" -> "DP-16-QAM 125 GBd (net 800 Gb/s; HD-FEC at 10 km, c-FEC at 20 km)". Re-check: p.2-3 "6.7% overhead HD-FEC (10 km) and c-FEC (20 km)". |

## Counts

- Findings: 12 (numerical 4, metadata 2, minor 6; blocking 0)
- applied: 10 (F1, F2, F3, F4, F5, F6, F9, F10, F11, F12)
- applied-adjusted: 2 (F7, F8)
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| huang2026-a | bw_measured_to_ghz | empty -> 110 | p.2, Fig. 1(c) (axis end) |
| huang2026-b | bw_measured_to_ghz | empty -> 110 | p.2, Fig. 1(c) (axis end) |
| huang2026-b | qualifiers (bw3db_ghz) | gt -> approx | p.1 Sec. 1, p.3 Sec. 4 ("100-GHz", "bandwidth of 100 GHz"); p.2 Sec. 2; Fig. 1(c) |
| tobing2026-a | extinction_ratio_db | 40 -> empty | p.3, Sec. 3 (Fig. 4(d) is an unbalanced-arm MZI spectrum) |
| tobing2026-a | er_type | static -> empty | p.3, Sec. 3 |
| tobing2026-a | qualifiers | extinction_ratio_db:approx removed | p.3, Sec. 3 |
| tobing2026-a | buffer_oxide_um | 0.5 -> empty | p.2, Sec. 2.2 (oxide position not stated) |
| starnault2026-a, -b | vpi_convention | mzm_differential -> unspecified | p.2, Sec. 3 |
| huang2026-a, -b | device_class | other -> mzm | p.3, Fig. 2(a) |
| shen2026-a | integration | bonded_heterogeneous -> monolithic | p.2, Sec. 4; Fig. 3(a) |

Text-only changes (not numerical): notes in huang2026-a/-b, shen2026-a, su2026-a, tobing2026-a; su2026-a `il_onchip_includes`; starnault2026-b `modulation_format`; tobing2026-a `epitaxy_or_stack`; papers.csv huang2026 note; evidence `license_notice` context_values for all five papers; evidence notes for shen2026-a and huang2026-b `bw3db_ghz`.

## Deferred items needing decisions

None. F7 follows the coordinator decision (footer quote in evidence, no Crossref prefetch); the coordinator may still prefetch Crossref later.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_04`: conflicts 0, validation errors 0 (dry run, nothing written).

## Verification follow-up (2026-10-04)

Source: data/_staging/audits/p5_04-verify-claude-audit-2026-10-04.md (verdict: issues, no blocking defect). Coordinator decisions applied per schema convention (c): a paper's stated bound or claimed crossing is kept; trace behaviour goes to notes.

| Item | Disposition | Change |
|---|---|---|
| V1 huang2026-b bw3db_ghz | applied-adjusted (value kept) | bw3db_ghz 100 approx and bw_basis measured kept (authors' stated "bandwidth of 100 GHz"). Row note and evidence note now state: packaged trace first touches -3 dB near 72 GHz and runs at about -2.6 to -3.7 dB from 82 to 110 GHz (verifier pixel reading, approximate). The verifier's proposed 80 GHz not adopted. |
| N1 shen2026-a bw3db_ghz | applied-adjusted (value kept) | gt 100 kept (paper's stated bound). Row note and evidence note now state that the Fig. 3(c) fit crosses -3 dB near 105 GHz, above the bound. |
| N2 huang2026-a | no value change | bw3db_ghz 110 with no qualifier kept (claimed crossing at the 110 GHz instrument limit). Row and evidence notes now say trace lowest about -2.8 dB, ends near -2.6 dB, and 110 GHz is the claimed crossing, not an observed one. |
| N3 tobing2026-a | applied | bw_measured_to_ghz empty -> 67, with evidence entry (extracted_from_figure, p.3, Fig. 4(f), data end about 67 GHz at about -9 dB). |
| N4 papers.csv | applied | huang2026, shen2026, starnault2026, tobing2026 notes: "Crossref lists no license." -> "Crossref record not cached."; "that Crossref (year only) and the paper do not confirm" -> "that the paper does not confirm". su2026 unchanged (crossref.json present). |
| N5 tobing2026-a note | applied | "Passive unbalanced-arm TFLN MZI ... not the 7 mm modulator's ER" -> "Unbalanced-arm TFLN MZI (Fig. 4(d), wavelength sweep) shows fringe extinction up to ~40 dB; not stated to be the 7 mm modulator." |
| N6 huang2026-a note | applied | "chip type, length and geometry are not given" -> "length and geometry are not given; chip type from the Fig. 2(a) schematic only"; redundant "MZ layout from the Fig. 2(a) schematic" sentence removed. |

Dry run after follow-up: `uv run python scripts/merge_staging.py data/_staging/p5_04` -> conflicts 0, validation errors 0 (dry run, nothing written).
