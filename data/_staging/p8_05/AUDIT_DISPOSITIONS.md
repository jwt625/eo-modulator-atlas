# p8_05 audit dispositions (correction pass, 2026-10-07)

Audit: `data/_staging/audits/p8_05-claude-audit-2026-10-07.md`. Every finding re-read in the cached source (text.md and page renders) before changing.

- F1 applied: anjali2025-a/-b/-c `buffer_oxide_um` = 2 and `substrate` = Silicon (design_target, p.3 Fig. 2(a),(b), both cross-sections label "2 um BOX layer" above "Silicon"); evidence entries added (page_03.png added to source_files); "BOX thickness" removed from papers notes and BATCH_REPORT not-reported lists.
- F2 applied: saxena2023-a `max_line_rate_gbps` 28 -> 40 (derived, 20 GSps x 2 bit/symbol PAM4, p.7 Fig. 11); max_baud_gbd stays 28; row note "strongly closed" replaced by "dispersed eye openings (Fig. 11), no eye metric stated". Evidence entry updated to match.
- F3 applied: shabaninezhad2025-a/-b/-c `waveguide_platform` soi_strip -> plasmonic_mim (p.2-3 Sec. 2, Fig. 1(b): MIM stacks on a planarized Si strip in SiO2, SOI never stated); row notes reworded.
- F4 applied: shabaninezhad2025-a/-b/-c `electrode_type` = plasmonic_lumped (derived, p.15 Sec. 4.5 "very short (~6 um) ... lumped element"); evidence entries added.
- F5 applied: Huawei Technologies Canada `parent_org` = "Huawei Technologies Co., Ltd." (exact existing org_name), note reworded; AIM Photonics and Applied Nanotools Inc. notes now read "country from the organization's own address (not printed in the paper)"; ror_id and name_source stay empty.
- F6 applied: anjali2025-a `electrode_type` = lumped (simulated, p.10 Sec. 2.3.2 "lumped electrode configurations for substrates I"); -b/-c left empty (TW type not stated; noted in row notes); BATCH_REPORT judgment (5) updated.
- F7 applied: shawon2024-a `bw_method` eo_s21 -> link_eoe (Fig. 18-19 setup, Fig. 21(c) axis "Link Gain, S21", 50 GHz PD, no de-embedding stated; authors' term EOS21); evidence note on bw3db_ghz and row/papers notes updated; value 2.5 approx unchanged.
- F8 adjusted: the audit premise "the text never says C-band" is wrong. The Fig. 5 caption of chaudhury2024 (p.4) says "C-band passive RTMs fabricated by Applied Nanotools Inc.". Papers notes now state the authors' C-band label together with the Fig. 5 axis (1574.9 to 1575.9 nm, l_band under convention (l)); no value changed (papers-only row).
- F9 applied: shawon2024-a `slab_thickness_nm` evidence basis design_target, locator p.6 Fig. 11, note "Fig. 11 labels the slab 110 nm"; slab approx qualifier dropped (Fig. 11 prints no tilde; etch keeps approx from the text "~110nm"); row note reworded to etch about 110 nm (text), slab 110 nm (Fig. 11), consistent for a 220 nm film.
- F10 applied: shabaninezhad2025-a/-b/-c notes: IL_total is at flat band for all rows (Sec. 4.2 for 340 nm; Table 1 matches the Fig. 9 flat-band TM0 transmittance within figure-reading precision for all three gaps).
- F11 applied: shabaninezhad2025-a/-b/-c `cladding` = SiO2 (design_target, p.3 Fig. 1(b)) and "W_slab 175 nm (Fig. 1(b))" added to epitaxy_or_stack (CSV and evidence value equal).
- F12 applied: shawon2024-a note "laser set to 14.123 dBm at 1550 nm (Fig. 18); power at the device not stated"; optical_input_power_dbm stays empty.
- F13 applied: anjali2025 row notes carry the stated loss bounds (< 1.8 / < 1.5 / < 2 dB/cm, p.12 Conclusion; p.4 for -c) beside the Fig. 9(a) readings; papers notes mention the bounds; prop_loss_db_per_cm not entered (bias-dependent carrier loss, distiller choice kept).
- F14 applied: chaudhury2024 `process_name` = "220 nm SOI SiPh process (passive racetrack test chip)"; GF45SPCLO simulation remark ("no fabrication") moved to the papers notes.

Rulings section of the audit: no change required. Optional item left as is: anjali2025 `drive_vpp_v` basis stays design_target.

Counts: applied 13, adjusted 1 (F8), rejected 0.
Dry run: `uv run python scripts/merge_staging.py data/_staging/p8_05` -> merge counts: papers 5, devices 8, orgs 6, evidence 4; conflicts 0; validation errors 0.
