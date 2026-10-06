# p7_04 verification (claude, 2026-10-05)

Batch: shen2025 (NEW), zhang2026c (NEW, papers-only), chelladurai2025 (RECHECK, papers-only, `--replace-paper-ids chelladurai2025`). Fresh-context, read-only check of the corrected staging against `p7_04-claude-audit-2026-10-05.md`, `data/_staging/p7_04/AUDIT_DISPOSITIONS.md`, `CORRECT_PROMPT.md` and the sources. Coordinator decision on A1: il_onchip_db only on shen2025-a and -d (approx, from supplement Fig. S9), b and c readings in notes. Scratch (outside the repo): a local scratch directory (not tracked) (docx unzipped, Fig. S9 digitized). Only this file was written.

Dry run: `uv run python scripts/merge_staging.py data/_staging/p7_04 --replace-paper-ids chelladurai2025` -> `merge counts: {'papers': 3, 'devices': 7, 'orgs': 5, 'evidence': 3}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.

Counts: confirmed 7 of 7 (A1-A7), not confirmed 0. New issues: 0 blocking, 0 numerical, 1 minor, 1 info.

## Independent read of Fig. S9 (for A1)

- Figure identity: `references/shen2025/supplement/source.docx`, blip order in `word/document.xml` maps rId72 -> `word/media/image36.jpeg`, followed by the caption "Figure S9. Transmission at the operating wavelength slow-light wavelength region." (607 x 384 px, raster). Section 7 text: "These losses range from a maximum of 16.9 dB to a minimum insertion loss of 5.8 dB, as illustrated in Figure S9. The average insertion loss is calculated to be 9.3 dB." Main p.4: "on-chip grating couplers are fabricated to couple light into the device ... the on-chip losses of the device are wavelength-dependent (Section S7)".
- Calibration (own pixel search, not the audit's): frame x 77-593, y 15-310; y ticks at rows 15, 74, 133, 192, 251, 310 = -5 ... -30 dB (11.8 px/dB); x ticks at 217.5, 335, 452, 569 = 1545.5 ... 1547.0 nm (234.25 px/nm, 1545.0 tick hidden by its label, extrapolated 100.5). Trace (green-pixel column centroid) spans 1544.903-1547.097 nm, i.e. the stated 1544.9-1547.1 nm.
- Text cross-check: maximum transmission -5.85 dB at 1545.19 nm (text 5.8), minimum -16.6 dB (stroke -16.3 to -16.9) at 1546.72 nm (text 16.9), x-averaged mean -9.30 dB (text 9.3). Calibration reproduces all three.
- Row wavelengths (centroid, stroke extent):
  - 1547.1 nm (a): -12.3 dB (-12.1 to -12.5) at the last trace column (1547.097 nm); staged 12.4 -> within the reading. The final segment is steep (about -9.2 dB at 1547.04 to -12.3 at 1547.10, about 55 dB/nm); the value is still well defined because 1547.1 nm is the trace end and the axis limit (vertex spacing about 0.07 nm: 1546.96, about 1547.03, 1547.10).
  - 1546.1 nm (d): -12.9 dB (-12.8 to -13.0); local vertex -13.05 dB at about 1546.08-1546.09 nm; staged 13.0 -> within +/-0.3 dB.
  - 1546.92 nm (b): -10.0 to -10.2 dB on a segment from -11.2 (1546.90) to -9.2 (1546.94); notes "about 10.2" -> consistent.
  - 1546.7 nm (c): -15.3 to -15.5 dB on a segment from -13.7 (1546.68) to -16.7 (1546.72); notes "about 15.3" -> consistent.
  - 1535 nm (e): outside the plotted range -> correctly empty.

## Per finding

| id | disposition | verdict | evidence |
|---|---|---|---|
| A1 | adjusted (a, d only) | confirmed | CSV: shen2025-a il_onchip_db 12.4, shen2025-d 13.0, both il_onchip_scope undefined, il_basis extracted_from_figure, qualifiers `bw3db_ghz:gt;il_onchip_db:approx`; b, c, e loss cells empty. Evidence: il_onchip_db (basis extracted_from_figure, locator "supplement Section 7, Fig. S9", note names image36.jpeg and coupler treatment not stated) and il_onchip_scope (undefined, derived) entries on a and d; context_values keep min 5.8 / max 16.9 / mean 9.3 plus a new item "on_chip_loss_db_fig_s9_readings_not_entered" with b about 10.2, c about 15.3, e out of range. Both entered values independently reproduced (above). Convention (s) scope undefined is correct: the paper calls it on-chip/insertion loss, measured through on-chip grating couplers (p.4), with no statement whether couplers are removed. Row a notes, b and c notes, papers notes and BATCH_REPORT judgment call (5) all updated and consistent with the cells; no stale "no loss cell is filled" / "Not reported: on-chip loss per wavelength" text remains (grep). |
| A2 | applied | confirmed | `word/media`: S9 image36.jpeg, S12 image40.jpeg, S14 image43.tiff are raster; S8 image35.emf and S11 image39.emf are EMF (blip-to-caption map from document.xml). Row a notes, papers notes and BATCH_REPORT now carry the corrected statement; "not extractable" survives only as a quotation in AUDIT_DISPOSITIONS. source.docx is in the evidence source_files. |
| A3 | applied | confirmed | shen2025-design physical_device_id empty; a-e and -sys keep shen2025-slowlight-1mm. Row a notes: "physical device shared with shen2025-sys; shen2025-design is the simulation of the same design"; design-row notes say "not a separate physical device". |
| A4 | applied | confirmed | shen2025-design length_mm 1; evidence basis design_target, locator "p.4 Fig. 1(h) caption; p.5 Sec. 4". Source: Fig. 1(h) caption (text.md page 4) "Simulated EO S21 curve showing that the 3 dB bandwidth of the device is 235 GHz"; page 5 "The 3 dB bandwidth of our device is predicted to be 235 GHz in the simulation (Figure 1h)". Design note now "wavelength not stated" and "length not restated". |
| A5 | applied | confirmed | Evidence entry shen2025-sys band c_band, basis derived, locator "p.7 Fig. 4(l); p.6 Sec. 4"; CSV band c_band unchanged. Source: page 6 "100 Gbps NRZ eye diagrams exhibit low BERs (<4 x 10-2) within an operational bandwidth of 2.2 nm (Figure 4l)"; Fig. 4(l) on p.7 (img_p07_1.png opened) is a C-band wavelength axis. See N1 for the scan-range wording. |
| A6 | applied | confirmed | Fig. 2(e) (img_p05_2.png opened) labels the regular-region trace "1535.1" on the wavelength axis; row e notes record it; wavelength_nm 1535 kept (caption p.5 and supplement Section 8 say 1535 nm). |
| A7 | applied | confirmed | zhang2026c text.md page 5: "Note from Figure 5c that at WE = 20 um, all the four S21 functions ..." while the WE = 20 um S21 panel is Fig. 4(c); the source-defect list in the zhang2026c papers notes now includes it. No value change. |

## Unrecorded changes

None found.
- File times: corrector wrote devices.csv, papers.csv, evidence/shen2025.yaml, BATCH_REPORT.md, AUDIT_DISPOSITIONS.md (21:05, after the 21:03 audit); organizations.csv, evidence/zhang2026c.yaml and evidence/chelladurai2025.yaml are untouched since 20:47 (pre-audit).
- devices.csv: changes limited to A1 (a, d loss cells, qualifiers, il_basis, notes a-e), A3, A4, A6 as described. All 118 evidence entries and 5 derived entries equal their CSV cells (script check, 0 mismatches).
- papers.csv: shen2025 notes (A1, A2) and zhang2026c notes (A7) only. chelladurai2025 vs canonical differs only in notes (canonical text kept; "not in the cache" replaced and "SUPPLEMENT ADDITIONS" appended, as the audit verified), audit_status and verified_on; discovered_via `drive_doc;local_corpus` kept.

## Coordinator rules

- Licence: bare tokens. shen2025 and zhang2026c `publisher-copyright` -> restricted_local_only (same pair as 59 canonical rows); chelladurai2025 `CC-BY-4.0` -> open_license_ok.
- New organizations (5): name_source and ror_id empty. All org names in the shen2025 and zhang2026c papers rows resolve to canonical or staged organizations. The CAS institute sits in `companies`, as canonical deng2026a / li2026aa / deng2026 / yin2026 do for CAS institutes.
- standard_reference constants: not applicable (no sim configs; no sims/shen2025, sims/zhang2026c or sims/chelladurai2025 directory).
- discovered_via: canonical value kept for chelladurai2025; the NEW rows carry the batch hint `web_search;author_group_followup`.

## New issues

| id | severity | where | issue | suggested fix |
|---|---|---|---|---|
| N1 | minor | shen2025-sys notes; evidence shen2025-sys band note; context item operating_wavelength_range | The scan is written as "1545.0-1547.1 nm". In Fig. 4(l) (img_p07_1.png) the axis starts about 0.09 nm below the 1545.0 tick (about 1544.9 nm), the data start at the left frame, and the text gives "operational bandwidth of 2.2 nm", so the scan is about 1544.9-1547.1 nm. | Optional wording fix to "about 1544.9-1547.1 nm". No value is affected; band c_band stands. |
| N2 | info | shen2025-a il_onchip_db note "+/-0.3 dB" | The 1547.1 nm reading sits at the end of a steep segment (about 55 dB/nm), as steep as the b/c segments. The +/-0.3 dB holds only because 1547.1 nm is the trace end and axis limit, so no wavelength interpolation is needed. My independent reading is 12.3 dB (stroke 12.1-12.5). | None required; 12.4 approx stands. |

## What was checked

- Read: VERIFY_PROMPT.md, CORRECT_PROMPT.md, the audit, AUDIT_DISPOSITIONS.md, BATCH_REPORT.md, the batch CSV, all staged CSV rows (non-empty fields), evidence/shen2025.yaml in full, schema convention (s) and the il_onchip_scope enum.
- Sources: shen2025 text.md p.4-6 (fabrication, grating couplers, loss pointer, Fig. 1(h) caption, 235 GHz statement, Fig. 4(l) text); supplement text.md Sections 7-8 (loss and ER per wavelength: 22 / 23.2 / 23.8 / 23 / 27.5 dB at 1535 / 1546.1 / 1546.7 / 1546.92 / 1547.1 nm, matching rows e / d / c / b / a); source.docx unzipped and image36.jpeg digitized; img_p05_2.png (Fig. 2) and img_p07_1.png (Fig. 4) opened; zhang2026c text.md page 5.
- Not re-checked: values the audit confirmed and the corrector did not touch (chelladurai2025 supplement additions, zhang2026c context_values, the organization rows), apart from the file-time and canonical-diff checks above.
