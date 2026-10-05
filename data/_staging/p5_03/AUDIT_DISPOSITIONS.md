# p5_03 audit dispositions

Audit: `data/_staging/audits/p5_03-q1-claude-audit-2026-10-04.md`
Date: 2026-10-04
Coordinator decisions applied: F1 apply; F2 per-device option; F3 single-row fix (no split) after re-read.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | numerical | applied | devices.csv weckenmann2026-a: q_loaded 5300 -> empty; extinction_ratio_db 10.7 -> empty; er_type static -> empty; bw6db_ghz 54 -> empty; bw_basis measured -> empty. evidence/weckenmann2026.yaml: removed entries q_loaded, extinction_ratio_db, bw6db_ghz. notes: values kept with the ref. 11 citation. Re-check: p.1 Sec. 2 quotes them with [11]; the paper shows no Q, spectrum or EO response. |
| F2 | numerical | applied (per-device option) | devices.csv weckenmann2026-a: max_baud_gbd 220 -> 110; max_net_rate_gbps 612.9 -> empty; modulation_format appended "; net 612.9 Gb/s per polarization (16-QAM, 190 GBd total, two-chip super-channel)"; notes reworded (220 GBd total, 612.9 two-chip total, per-modulator net not stated). evidence/weckenmann2026.yaml: max_baud_gbd value 110, locator "p.1, Sec. 2; p.2, Sec. 3", note "Per subcarrier per chip; 220 GBd super-channel total over two chips"; max_net_rate_gbps entry removed; modulation_format value updated equal to the CSV. Re-check: p.1 "110 GBaud per subcarrier (220 GBaud total), two identical chips". |
| F3 | numerical | applied (single-row fix) | devices.csv aimone2026-a: vpi_convention unspecified -> mzm_push_pull; vpil_dc_vcm 1.1 -> empty; notes rewritten (1.1 V cm kept in notes; not reproducible; Vpi not measured under the differential driver). evidence/aimone2026.yaml: vpil_dc_vcm entry removed; vpi_convention entry added (basis derived, p.1 Sec. 2); vpi_dc_v note reworded. Re-check: p.1 Sec. 2 states 3.26 V as the modulator's own stand-alone-capable measurement and 1.1 V cm only as "referenced to the single-ended signal thanks to the push-pull differential drive"; no measured drive condition ties 1.1 V cm to a Vpi, so no row split. drive stays differential (system demo). |
| F4 | metadata | applied | devices.csv yang2026-a: il_onchip_excludes empty -> "Grating couplers (input and output); wafer median over dies". Re-check: Fig. 2(b) caption "excluding grating coupler"; die values in the map run 1.46-3.71 dB (matches the existing note). No evidence entry (column is not evidence-required). |
| F5 | minor | applied | devices.csv aimone2026-a notes: added "S21 normalized to its peak near 5 GHz, noise dips reach about -3 dB near 60 GHz (Fig. 1(b), approx.)". Checked against the enlarged Fig. 1(b). No cell change. |
| F6 | minor | applied | devices.csv yin2026-a notes: added "Inductor response peaks about +4 dB near 55 GHz (Fig. 2(d), approx.)". Checked in the p.2 render. No cell change. |
| F7 | minor | applied | evidence/aimone2026.yaml aimone2026-a energy_per_bit_fj note -> "Authors: IC-MZM assembly energy on gross rate; equals driver IC power 605 mW / 420 Gb/s"; devices.csv notes reworded to match. 605 mW / 420 Gb/s = 1.44 pJ/bit. |
| F8 | minor | applied | papers.csv sobu2026 notes: "Table 1 lists other groups' prior optical-DAC transmitters, not entered." -> "Table 1 lists prior optical-DAC transmitters (refs. 3-7, including the authors' own), not entered." Re-check: refs. 6 and 7 are by Sobu et al. BATCH_REPORT.md updated for F1-F3, F7, F8. |

Counts: applied 8 (F1, F2 per-device option, F3 single-row, F4, F5, F6, F7, F8), applied-adjusted 0, rejected 0, deferred 0.

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| weckenmann2026-a | q_loaded | 5300 -> empty | p.1, Sec. 2 (quoted from ref. 11) |
| weckenmann2026-a | extinction_ratio_db | 10.7 -> empty | p.1, Sec. 2 (quoted from ref. 11) |
| weckenmann2026-a | er_type | static -> empty | follows extinction_ratio_db |
| weckenmann2026-a | bw6db_ghz | 54 -> empty | p.1, Sec. 2 (quoted from ref. 11) |
| weckenmann2026-a | bw_basis | measured -> empty | follows bw6db_ghz |
| weckenmann2026-a | max_baud_gbd | 220 -> 110 | p.1, Sec. 2; p.2, Sec. 3 |
| weckenmann2026-a | max_net_rate_gbps | 612.9 -> empty | p.2, Sec. 3; Fig. 2(b) (two-chip total, kept in modulation_format) |
| weckenmann2026-a | modulation_format | appended net 612.9 Gb/s text | p.2, Sec. 3; Fig. 2(b) |
| aimone2026-a | vpil_dc_vcm | 1.1 -> empty | p.1 abstract; p.1, Sec. 2 |
| aimone2026-a | vpi_convention | unspecified -> mzm_push_pull | p.1, Sec. 2 |
| yang2026-a | il_onchip_excludes | empty -> Grating couplers (input and output); wafer median over dies | p.2, Fig. 2(b) caption |

## Deferred items needing decisions

None. Follow-up (not a correction): ref. 11 (arXiv 2509.20584) is a candidate for its own paper row holding Q 5300, 10.7 dB depth and 54 GHz.

Dry run: `merge counts: {'papers': 5, 'devices': 7, 'orgs': 0, 'evidence': 4}; conflicts: 0; validation errors: 0`.


## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p5_03-verify-claude-audit-2026-10-04.md`: all 11 changed cells confirmed. N1 applied: yang2026-a note per-die IL range 1.46-3.71 dB (Fig. 2(b)). No value changed.
