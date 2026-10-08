# p8_02 verification (claude, fresh context, 2026-10-07)

Inputs: `audits/p8_02-claude-audit-2026-10-07.md`, `p8_02/AUDIT_DISPOSITIONS.md`, staged `papers.csv` (5), `devices.csv` (8), `organizations.csv` (11), 5 evidence files, `sims/zhang2024/config.yaml`, sources in `references/<id>/`. Figures re-read: gaier2025 Fig. S1(b) re-rendered at 9x from source.pdf p.22 and Fig. 4(c) (page_09.png); liu2025d Fig. 2(f) re-rendered at 8x from source.pdf p.5; xie2024 Fig. 2(a),(c) (img_p03_2.png, zoomed, nearest-neighbour); zhang2024 Fig. 3(c) re-rendered at 7x and 20x from source.pdf p.7, Fig. 2(c) (page_06.png), SI Table 2 (img_p16_2.png); park2026 Fig. 3(a) (page_26.png).

Mechanical cross-check (script over staged files): 0 evidence entries whose device_id is not a staged row (no orphans for gaier2025-c or liu2025d-b), 0 CSV/evidence value mismatches; every non-empty evidence:true cell on the 8 rows has an entry (cells without entries are enum/basis columns only).

Result: 18 dispositions checked, 18 confirmed, 0 not confirmed. New issues: 4 minor, 1 info.

## Per finding

| id | verdict | evidence |
|---|---|---|
| N1 | confirmed | Text p.6 l.250, abstract p.1, SI Table 2 say 8 V at 500 GHz. Fig. 3(c) (20x render; axis 68.6 px/V): measured points 490-500 GHz about 9.6-11.7 V (one point at about 490 GHz reads 9.1 V), smoothed line ends at about 10.0-10.7 V, Cal ends at about 8.3 V near 494 GHz. zhang2024-a vpi_rf_v / vpi_rf_freq_ghz empty, no evidence entries for them, label "...DC Vpi and bandwidth", readings in row and papers notes. -b keeps 6 V at 300 GHz (text p.6, SI Table 2). No 500 GHz target in the sim config. See I5 for the -b readback wording. |
| N1b | confirmed | p.8 (text.md page 8): 2.90e-6 / 4.13e-6 / 4.86e-6 /W at 300/400/500 GHz for 10 mm; -65 dBm at 8 dBm on-chip pump; abstract 4.8e-6 /W; electro-THz modulation up to 35 GHz (p.1, p.3). |
| N2 | confirmed | Fig. 2(f): arrows 1.5 / 1.6 GHz span the peak around 30.5 GHz about 3 dB below the dashed-fit maxima (peak about -42 dBm, arrow about -45 dBm); RF scanned 27-34 GHz; setup Fig. 2(c) AWG-LNA-horn. All bw fields empty on liu2025d-a; no bw evidence entries; widths in notes. |
| N3 | confirmed | p.9-10, Fig. 4(c): 278.1 GHz carrier, f_mod 10 MHz-6 GHz, "currently limited by the experimental setup", dashed +-3 dB bounds about the mean level. gaier2025-b bw3db_ghz, bw_measured_to_ghz, bw3db_reference, bw_method, bw_basis and qualifiers all empty; no bw evidence entries; statement in notes. |
| N4 | confirmed | p.3 l.248/266 "19.3 dB"; Fig. 2(c): legend blue = "MZM maximum point" carrier about -43 dBm, red = "MZM null point" about -34 dBm; caption assigns red = unsuppressed, blue = suppressed. xie2024-a extinction_ratio_db and er_type empty, no ER evidence entry, readings in notes and papers notes. |
| N5 | confirmed | p.13 Methods "600 nm of X-cut lithium niobate"; Table 1 p.22 h_TF 300 nm, h_wg 600 nm, theta_wg 60 deg, h_clad 1 um vs Methods 800 nm. Fig. S1(b) at 9x: the h_TF arrow pair brackets the blue LN layer under the left electrode (slab), h_wg spans ridge top to the LN/BOX interface, theta_wg is drawn at the ridge foot against a dashed horizontal (film plane). -a/-b: film 600 / slab 300 design_target, etch 300 derived (600 - 300), sidewall 60 design_target; cladding thickness empty with both values in the cladding evidence note and row notes; old contradiction text gone. |
| N6 | confirmed (moot) | gaier2025-c gone; no fsr_nm; designed FSR 30.79 GHz (p.10) in papers notes. |
| M1 | confirmed | papers.csv gaier2025 repro_grade B, sim_config empty, notes "Sim config deferred (DevLog-022)"; DevLog-022 l.218-221 records it. |
| m1 | confirmed | No gaier2025-c row or evidence. Papers notes carry FSR 30.79 GHz, 123.2/307.9 GHz = 4/10 FSR, 1.5 mm line, kappa/2pi 220 MHz (p.11), Q about 8.8e5 (193.4 THz / 220 MHz = 8.79e5), slope 0.05 dB/GHz over about 2 THz (p.11-12), g0/2pi 4.98 / 9.93 kHz (p.12), mmWave Q 5.96 / 11.61 (SI Table 2 p.33). Text "Two rows". |
| m2 | confirmed | p.7 l.355-365: eta "estimate[d] ... Using Eq. 1"; VpiL formula uses Z_TL, value not printed. Notes and both vpil_rf_vcm evidence notes say so; basis derived. |
| m3 | confirmed | Fig. 3(a): Ground / Signal / Ground with the two arms in the two gaps. drive push_pull on -a/-b with derived evidence entries stating the authors do not state it; vpi_convention unspecified. |
| m4 | confirmed | p.7 l.205-206: top width 2082 nm, etch 240 nm (PPLN ridge design, Fig. 2b). -a now has rib 2082 / etch 240 design_target and slab 60 derived (300 - 240), same as -b; notes on both rows say PPLN design, MZI geometry not stated. |
| m5 | confirmed | p.5 "14 dB/cm at 300 GHz"; Fig. 2(c): dots at sqrt(300) = 17.3 lie at about 13.7 dB/cm; fit 0.264 x 17.32 + 0.028 x 300 = 12.97. rf_loss_db_per_cm and rf_loss_freq_ghz evidence basis measured. |
| m6 | confirmed | config.yaml provenance `geometry.electrodes.signal` class project_inference, note: width/thickness paper_exact, x-position 6.75 um = G/2 + H + S from inferred roles. Geometry rect unchanged (x -56.75..-6.75, y 0.25..0.75). |
| m7 | confirmed | p.6 Methods: GSGSG probe GGB 50 GHz; Anritsu MG3697C 2-67 GHz. Notes and bw3db evidence note aligned. |
| m8 | confirmed (judgment) | p.3 l.262 "advanced slotted electrodes [56]"; ref. 56 = Kharel et al., "Breaking voltage-bandwidth limits ... using micro-structured electrodes" (Optica 8, 357), entered as cl_twe in data/devices.csv kharel2021-a/-b. Fig. 2(a) zoomed: five metal strips (G-S-G-S-G, consistent with the GSGSG probe), each waveguide in its own gap with a periodic row of features along it on both the PM and MZM sections. The figure is a low-resolution false-colour image, so it supports, but alone would not prove, capacitive loading; with the citation the cl_twe call meets the coordinator condition. Note on the row states the source of the type. |
| W | confirmed | wafer_supplier NanoLN on xie2024 and zhang2024; no "NANOLN" left in staged files or sims/zhang2024 (only in the disposition text). |
| liu2025d-b drop (coordinator) | confirmed, with stale residue | No liu2025d-b row or evidence; 15.2 dB sideband comparison in papers notes (p.6 l.115, Fig. 2e). Stale references remain: I1-I3. |

## Unrecorded changes

No pre-correction snapshot of p8_02 exists in the repo (staging is not versioned here and git was out of scope), so the staged files were compared with the values the audit describes. Every audited field is in the state the dispositions claim; the two "Other edits" (zhang2024-a z0 evidence note wording, zhang2024 bandwidth note) are present and consistent with the source (Fig. 3(d) Cal crosses -3 / -6 dB near 150 / 330 GHz on my read). Nothing unexplained found. The coordinator's liu2025d-b drop is recorded only as the last open-item line, not in the table or the "13 applied, 2 adjusted" count (info).

## Coordinator rules

- Licence: empty on all 5 (no crossref.json, arXiv copies; coordinator fills via refresh_metadata); redistribution restricted_local_only. Compliant.
- New organizations: ror_id and name_source empty on all 11. Compliant.
- Sim constants: standard_reference citations spot-checked: mao2022 text.md l.194 nSiO2 = 1.444, yang2022 l.138 SiO2 eps about 3.9, kharel2021 l.301 eps_Qz about 4.5, wang2024b img_p15_1.png present; metal sigma class unknown and listed under missing. Compliant.
- discovered_via `web_search;author_group_followup` (batch token continuation_2026_10_02 not in vocabulary); none of the 5 is an existing canonical paper (0 rows in data/papers.csv). Compliant.

## New issues

| id | severity | where | issue | fix |
|---|---|---|---|---|
| I1 | minor | papers.csv liu2025d notes | Still says "Two rows: -a ..., -b the same antenna with a straight waveguide and no ring", contradicting the last sentence ("has no device-level metric and no row") and the single staged row; "Batch CSV hint 'other' device class refined to ring / phase_shifter" (phase_shifter was -b). | "One row: -a ..."; "refined to ring". |
| I2 | minor | devices.csv liu2025d-a notes | "(w/o ring 1.6 GHz, row -b)" points to the dropped row. | "(w/o ring 1.6 GHz; no-ring configuration has no row)". |
| I3 | minor | papers.csv liu2025d notes | Locator "The no-ring reference configuration (Fig. 2b/e/f ...)": the Fig. 2 caption gives (a) without and (b) with the microring. | "Fig. 2(a),(e),(f)". |
| I4 | minor | BATCH_REPORT.md | Dry-run line says devices 9 (actual dry run: 8); liu2025d section says "2 rows" and lists "-b same antenna without ring". | Update to 8 devices, liu2025d 1 row, -b dropped (dd). |
| I5 | info | zhang2024-b notes and vpi_rf_v evidence note | "Fig. 3(c) smoothed about 6 V": at 20x the smoothed line steps from about 6.2 V to about 6.6 V at about 297-300 GHz; Cal about 5.9-6.0 V; measured points near 300 GHz 5.8-7.3 V. The 6 V value (text, SI Table 2) is unaffected. | Optional: "smoothed about 6.2-6.6 V (step near 297 GHz), calculated about 5.9-6.0 V". |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p8_02` ->
`merge counts: {'papers': 5, 'devices': 8, 'orgs': 10, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
