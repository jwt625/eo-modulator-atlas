# Audit dispositions: p5_01

Audit: `data/_staging/audits/p5_01-q1-claude-audit-2026-10-04.md`. Date: 2026-10-04. Each finding re-checked against `references/<paper_id>/text.md` and the figure renders (gong2026 Fig. 4, deng2026a Fig. 2(d) viewed).

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | Numerical | applied | devices.csv gong2026-a `max_line_rate_gbps` 200 -> 240; evidence gong2026-a max_line_rate_gbps value 200 -> 240, locator "p.1 abstract; p.3, Fig. 4(b)" -> "p.3, Sec. 3; Fig. 4(d)", note -> "240 Gb/s PAM4, TDECQ 3.1 dB at 1.92 Vppd, 7-tap FFE, -1 V bias"; row notes appended (240 Gb/s = 120 GBd by arithmetic; drive_vpp_v 3.2 refers to 160 and 200 Gb/s eyes). max_baud_gbd stays 100. Source: p.3 text and Fig. 4(d) label. BATCH_REPORT.md judgment updated. |
| F2 | Numerical | applied | evidence deng2026a-a energy_per_bit_fj basis measured -> derived; note -> "Authors: 831 mW total transmitter power (driver included) / 336 Gb/s = 2.47 pJ/b; not modulator-only." CSV value 2470 unchanged. |
| F3 | Metadata | applied | papers.csv gong2026 `foundry_or_fab` GlobalFoundries -> empty (companies, integration unchanged); papers notes "Foundry GlobalFoundries inferred ..." -> "Fab not named; title says 300-mm monolithic CMOS silicon photonics foundry and all authors are GlobalFoundries."; devices.csv gong2026-a notes: sentence "Foundry inferred from title and sole affiliation." removed; organizations.csv GlobalFoundries notes -> "Malta, NY; gong2026 p.1 sole affiliation". |
| F4 | Minor | applied-adjusted | devices.csv deng2026a-a notes: "median" sentence replaced with "40.8 GHz labels the plotted -3 V trace (also one wafer-map die); text calls it the median but the inset median is 38.0 GHz (max 43.0, bias unlabeled)."; evidence bw3db_ghz note reworded likewise. Adjusted: same fix applied to deng2026a-b (text also calls 52.9 GHz the median; Fig. 2(d) label is plain "3 dB Bandwidth = 52.9 GHz"): row notes and evidence bw3db_ghz note reworded. Values unchanged. |
| F5 | Minor | applied | deng2026a-a and -b evidence `drive` basis design_target -> measured (p.2: junctions serially connected to form push-pull). kawahara2026-a and -c evidence `drive` basis design_target -> derived, note -> "Equalizer principle assumes differential drive (p.1); drive used in the experiment not stated." CSV drive values unchanged. |
| F6 | Minor | applied | devices.csv kawahara2026-c notes prefixed "drive_vpp_v refers to 112 Gb/s OOK; the 200 Gb/s PAM4 max rate used 4.2-5.2 Vpp." drive_vpp_v 2 kept. |
| F7 | Minor | applied | devices.csv gong2026-a notes appended "Z0 70 ohm is the differential impedance."; evidence z0_ohm note now states "(differential)" (p.3: "around 70 ohm (differential)"). |
| F8 | Minor (optional) | applied-adjusted | The paper states the design band (p.1: "ng ~ 30 in the C-band") and an EDFA in the setup, but not a wavelength. devices.csv kawahara2026-a/-b/-c `band` empty -> c_band; new evidence entries (basis derived, locator "p.1, Sec. 2; p.2, Sec. 3", note "C-band design (ng about 30) and EDFA in setup; wavelength not stated"). optical_input_power_dbm left empty (13 dBm is laser light, not on-chip), as the auditor allowed. |
| F9 | Minor | rejected | Coordinator decision: publisher-copyright from the printed Optica footer recorded in papers.csv notes is the accepted convention for OFC rows. No change. |

Counts: applied 6 (F1, F2, F3, F5, F6, F7); applied-adjusted 2 (F4, F8); rejected 1 (F9); deferred 0.

## Changed numerical or blocking cells

| device_id | column | old -> new | Source locator |
|---|---|---|---|
| gong2026-a | max_line_rate_gbps | 200 -> 240 | p.3, Sec. 3 (TDECQ 3.1 dB at 240 Gbps); Fig. 4(d) label "240Gbps 1.92Vppd, 3.1 dB TDECQ" |
| kawahara2026-a | band | empty -> c_band (evidence basis derived) | p.1, Sec. 2 ("ng ~ 30 in the C-band"); p.2 EDFA |
| kawahara2026-b | band | empty -> c_band (evidence basis derived) | same |
| kawahara2026-c | band | empty -> c_band (evidence basis derived) | same |

Non-numerical changes: papers.csv gong2026 foundry_or_fab GlobalFoundries -> empty; evidence basis changes (deng2026a-a energy_per_bit_fj measured -> derived; deng2026a-a/-b drive design_target -> measured; kawahara2026-a/-c drive design_target -> derived); notes edits listed above.

## Deferred items needing decisions

None.


## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p5_01-verify-claude-audit-2026-10-04.md`: 14/14 confirmed. N1 applied: deng2026a-a/-b band o_band (derived; PDFA in the Fig. 4(a) setup, wavelength not stated), same inference as kawahara2026 F8. C1 not applied (cosmetic).
