# Audit dispositions: p5_07

- Audit: `data/_staging/audits/p5_07-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Rules applied: schema convention (c) in `data/schema/devices.schema.yaml` (paper's stated bandwidth bound goes in `bw3db_ghz` with `gt`, measured range in `bw_measured_to_ghz`, trace behaviour in notes), as directed by the coordinator. `license_notice` context values kept. `audit_status` stays needs_audit.
- All findings re-checked against `references/<paper_id>/text.md` and the page renders (xu2026a Fig. 4(b), xu2026b Fig. 3(c), valdez2026 Fig. 2, hess2026 Fig. 1).

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | numerical | applied-adjusted | Auditor proposed `bw3db_ghz` 110 -> 102 approx. Not applied: convention (c) keeps the paper's bound (text p.2, Fig. 4(b) caption "beyond 110 GHz"). Cells unchanged (`bw3db_ghz` 110 gt, `bw_measured_to_ghz` 110, basis measured). Changed: devices.csv xu2026a-a `notes`, last sentence "Trace touches -3 dB near 102 GHz and ends near -2.7 dB." -> "Authors state 3 dB bandwidth beyond 110 GHz (text, Fig. 4(b) caption); trace touches -3 dB near 101-104 GHz, ends near -2.7 dB." (plus F8 sentence). evidence/xu2026a.yaml xu2026a-a `bw3db_ghz` note -> "Authors state beyond 110 GHz; Fig. 4(b) trace touches -3 dB near 101-104 GHz, ends near -2.7 dB". Figure re-read: trace reaches the dashed line near 101-104 GHz, ends about -2.7 dB. |
| F2 | numerical | applied-adjusted | Same treatment. `bw3db_ghz` 110 gt unchanged (text p.2 "exceeds 110 GHz"; Fig. 3(c) label "3-dB EO bandwidth > 110 GHz"). devices.csv xu2026b-a `notes` last sentence -> "Authors state exceeds 110 GHz (text, Fig. 3(c) label); trace touches -3 dB near 103-104 GHz, ends near -2.5 dB." evidence/xu2026b.yaml xu2026b-a `bw3db_ghz` note -> "Authors state exceeds 110 GHz; Fig. 3(c) trace touches -3 dB near 103-104 GHz, ends near -2.5 dB". |
| F3 | numerical | applied-adjusted | `bw3db_ghz` 50 gt kept (paper's bound, coordinator decision; auditor's alternative). devices.csv valdez2026-a `notes` "One 46 GHz point dips to -3.2 dB; fit stays above -2 dB." -> "Authors state over 50 GHz; isolated 46 GHz point at about -3.2 dB, fit about -1.8 dB at 50 GHz." evidence/valdez2026.yaml valdez2026-a `bw3db_ghz` note -> "Authors state over 50 GHz; isolated point about -3.2 dB at 46 GHz; fit about -1.8 dB at 50 GHz". |
| F4 | numerical | applied-adjusted | Auditor proposed `bw3db_ghz` 25 approx. Not applied (coordinator): the text's ">50 GHz for both" contradicts Fig. 2(c) (data at -3 dB near 25 GHz, fit about -3.1 dB at 50 GHz, confirmed on the render); `bw3db_ghz` stays empty. devices.csv valdez2026-b `notes` -> "...Paper says 3 dB bandwidth over 50 GHz for both devices, but Fig. 2(c) data reach -3 dB near 25 GHz (fit about -3.1 dB at 50 GHz); contradiction, no value entered." evidence/valdez2026.yaml valdez2026-b `bw_measured_to_ghz` note -> "Measured up to 50 GHz; text claims over 50 GHz but Fig. 2(c) data reach -3 dB near 25 GHz; no 3 dB value entered". |
| F5 | numerical | applied | devices.csv valdez2026-a `il_onchip_includes` "total device loss; PDK edge coupling, routing and splitting components (conclusion wording)" -> "device insertion loss as stated (not itemised)"; `il_onchip_excludes` "not stated by the authors" -> "not stated; Fig. 2(a) fiber-to-fiber peak about -3.5 dB suggests edge coupling excluded". evidence/valdez2026.yaml: two new entries valdez2026-a `il_onchip_includes` and `il_onchip_excludes` (basis derived, locators p.3 Conclusions; p.2 Sec. 2; p.3 Fig. 2(a)). Source: Conclusions credit PDK components for low loss, do not say couplers are included; Fig. 2(a) is fiber-to-fiber. |
| F6 | minor | applied | evidence/valdez2026.yaml valdez2026-a `vpil_dc_vcm` note -> "Abstract/conclusions 1.36 V cm = intro Vpi 6.8 V x 0.2 cm; Sec. 2 gives 6.7 V with 1.4 V cm". devices.csv valdez2026-a `notes` appended "RAMZM Vpi is an effective, bias-wavelength-dependent coupling-modulation value." (the second part is the auditor's reading of coupling-coefficient modulation; text p.2 describes a coupling-coefficient modulator). |
| F7 | minor | applied | evidence/valdez2026.yaml valdez2026-b `vpi_dc_v` note -> "Cosine-squared fit of the 20 Vpp (+-10 V) scan; Vpi exceeds the scanned range, so a fit extrapolation" (Fig. 2(b): data span -10 to +10 V, fit and 20.9 V arrow extend further). |
| F8 | minor | applied | devices.csv xu2026a-a `notes` appended "Authors' 100.7 GHz/V2 FOM uses 1.045 V and 110 GHz." (text p.1-2 gives 100.7 GHz/V2; 110/1.045^2 = 100.7). No cell change. |
| F9 | minor | applied | devices.csv hess2026-a `notes` "Abstract says 2.2 dB on-chip loss; text 2.6 dB." -> "Abstract 2.2 dB = 7.8 dB minimum total loss at 1303.3 nm minus 2 x 2.8 dB couplers; 2.6 dB at operating wavelength." papers.csv hess2026 `notes` -> "On-chip loss: abstract 2.2 dB is the minimum-loss wavelength, text 2.6 dB the operating wavelength." evidence/hess2026.yaml hess2026-a `il_onchip_db` note updated likewise. Source: Fig. 1 caption (7.8 dB at 1303.3 nm), p.2 text (2.8 dB per GC). |
| F10 | minor | applied | Preferred option: `wavelength_nm` 1317 kept. evidence/hess2026.yaml hess2026-a `wavelength_nm` note -> "Setup B laser 1317 nm gives 445 Gb/s; Setup A 1305.2 nm. IL/ER wavelength not stated; ER 12.5 dB matches dip near 1305 nm". |
| F11 | minor | applied | `max_baud_gbd` 224 kept. evidence/hess2026.yaml hess2026-a `max_baud_gbd` note -> "224 GBd PAM4 (text); Fig. 2(a) Setup A PAM4 points reach about 230-240 GBd (NDR about 355 Gb/s)". Taken from the auditor's reading of Fig. 2(a); the page_03 render was not re-measured by me (low-resolution), flagged as about. |
| F12 | minor | applied | (i) devices.csv hess2026-a `tags` "athermal" -> "temperature_tolerant". (ii) evidence hess2026-a `bw3db_ghz` note -> "Authors state exceeds 100 GHz; Fig. 1(e) normalized E/O response stays at or above about 0 dB to 100 GHz". (iii) devices.csv hess2026-a `optical_input_power_dbm` empty -> 11, new evidence entry (value 11 dBm, measured, p.1 Sec. 2, "TLS power feeding the ring in both setups; chip coupling loss not deducted"); text p.1 Sec. 2: TLS "with a power of 11 dBm" in both setups. |
| F13 | minor | applied | evidence/valdez2026.yaml valdez2026-a and valdez2026-b `wavelength_nm` locator "p.3 Sec. 2; Fig. 2 caption" -> "p.2 Sec. 2; p.3 Fig. 2 caption". |

BATCH_REPORT.md judgment-call lines for valdez2026, xu2026a, xu2026b, hess2026 updated to match.

## Counts

- applied: 9 (F5, F6, F7, F8, F9, F10, F11, F12, F13)
- applied-adjusted: 4 (F1, F2, F3, F4; coordinator schema convention (c) instead of the auditor's proposed value changes)
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells

| device_id | column | old -> new | source locator |
|---|---|---|---|
| hess2026-a | optical_input_power_dbm | empty -> 11 | p.1 Sec. 2 (TLS power 11 dBm, Setups A and B) |

No other numerical cell changed: bw3db_ghz of xu2026a-a (110 gt), xu2026b-a (110 gt) and valdez2026-a (50 gt) stay as staged and valdez2026-b stays empty by coordinator decision (convention (c)); only notes and evidence notes changed. Text cells changed: valdez2026-a `il_onchip_includes`, `il_onchip_excludes`; hess2026-a `tags`.

## Deferred items needing decisions

None. Note for the coordinator: the auditor's F1-F4 value proposals (102, 103, 46, 25 GHz) were not applied per the stated decisions; if the project later wants trace-crossing semantics in `bw3db_ghz`, convention (c) would need to change.
