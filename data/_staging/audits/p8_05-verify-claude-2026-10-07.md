# p8_05 verification (claude, fresh context, 2026-10-07)

Inputs: `data/_staging/audits/p8_05-claude-audit-2026-10-07.md`, `data/_staging/p8_05/AUDIT_DISPOSITIONS.md`, staged files (papers, devices, organizations, 4 evidence yamls, BATCH_REPORT), `CORRECT_PROMPT.md`, schema conventions, cached sources in `references/<id>/`. Coordinator decision: apply every finding as recommended; `buffer_oxide_um` = buried/bottom oxide (schema desc dated 2026-10-07).

Pre-correction baseline: regenerated from the distiller's scratch generator (`gen_p8_05.py`, session scratchpad, output redirected to the scratchpad, nothing written in the repo). The regenerated baseline matches the audit's description of the original state (soi_strip, max_line_rate 28, eo_s21, "strongly closed", "not linked", slab approx), so it was used for the cell-by-cell diff below.

Result: 14 findings checked, 14 confirmed (13 applied as recommended, F8 adjustment confirmed correct), 0 not confirmed. Optional item (anjali2025 drive_vpp_v basis): see N3.

## Per finding

| id | verdict | evidence |
|---|---|---|
| F1 | confirmed | p.3 render Fig. 2(a) and 2(b): both cross-sections print "2 µm BOX layer" over "Silicon". buffer_oxide_um = 2 and substrate = Silicon on -a/-b/-c, basis design_target, locator "p.3 Fig. 2(a),(b)"; consistent with the buried-oxide meaning of buffer_oxide_um. page_03.png added to source_files. "BOX thickness" removed from papers notes (repro sentence and Not reported) and BATCH_REPORT. |
| F2 | confirmed | text p.6-7 and p.7 render Fig. 11: "2Vpp PAM4 data pattern at 20 GSps symbol rate", measured eye shows three open (dispersed) eye openings. max_line_rate_gbps 28 -> 40, evidence derived, locator p.7 Fig. 11; max_baud_gbd 28 kept; "strongly closed" replaced in the row note. |
| F3 | confirmed | text p.2-3 Sec. 2 ("pair of MIM stacks ... on top of a planarized Si waveguide"), p.3 render Fig. 1(b) (Si 300 x 500 nm fully embedded in SiO2); "SOI" absent. waveguide_platform = plasmonic_mim on all three rows (precedent horst2025, hess2026); notes reworded. |
| F4 | confirmed | p.15 Sec. 4.5: "The modulator being very short (~ 6 µm) is considered as a lumped element". electrode_type = plasmonic_lumped, evidence basis derived, locator p.15 Sec. 4.5. |
| F5 | confirmed | p.1 affiliation 4 "Huawei Technologies Canada, Canada, Kanata, ON K2K 3J1"; funding "Huawei Canada". parent_org = "Huawei Technologies Co., Ltd." equals the existing org_name (data/organizations.csv line 74). AIM Photonics / Applied Nanotools notes reworded as recommended; ror_id and name_source empty. |
| F6 | confirmed | p.10 Sec. 2.3.2: "lumped electrode configurations for substrates I ... for substrates II and III, a traveling-wave electrode configuration". -a electrode_type = lumped (basis simulated, locator p.10 Sec. 2.3.2); -b/-c empty with "TW type CPW/GSG not stated" in notes; BATCH_REPORT judgment (5) updated. |
| F7 | confirmed | p.8-9 Sec. VII-A (PNA, EDFA, 50GHz photodetector, balun); p.10 render Fig. 21(c) axis "Link Gain, S21 (dB)", about -29 dB at low frequency. bw_method eo_s21 -> link_eoe; bw3db evidence note updated; value 2.5 approx unchanged; papers and row notes updated. |
| F8 | confirmed (adjustment correct) | p.4 render: the Fig. 5 caption reads "C-band passive RTMs fabricated by Applied Nanotools Inc."; Fig. 5(a) axis 1574.9 to 1575.9 nm. The audit premise "the text never says C-band" was wrong; the corrector's wording (authors' C-band label plus the axis range, l_band under (l)) is accurate. Papers-only row, no value affected. |
| F9 | confirmed (approx drop correct) | text p.6 "∼110nm etched silicon"; Fig. 11 text layer (pymupdf, page 6) gives the vertical label "110 nm" with no tilde, and a 600 dpi crop shows the double arrow spanning the slab beside the P region. slab_thickness_nm 110, basis design_target, locator p.6 Fig. 11, approx dropped; etch_depth keeps approx; row note reworded. |
| F10 | confirmed | p.16 render Fig. 9 (flat band): TM0 transmittance about 0.23 / 0.35 / 0.47 at 340 / 400 / 415 nm = 6.4 / 4.6 / 3.3 dB, matching Table 1 IL_total. Notes on all three rows updated. |
| F11 | confirmed | p.3 render Fig. 1(b): Si in SiO2, label "W_Slab = 175 nm". cladding = SiO2 (design_target, p.3 Fig. 1(b)); "W_slab 175 nm (Fig. 1(b))" appended to epitaxy_or_stack; CSV and evidence values equal. |
| F12 | confirmed | p.9 Fig. 18 schematic text: "1550nm Wavelength / 14.123 dBm Power" (tunable laser setting). Row note added; optical_input_power_dbm empty (convention w). |
| F13 | confirmed | p.12 Conclusion: < 1.8 / < 1.5 / < 2 dB/cm; p.4 "< 2 dB/cm as shown in Figure 9(a)". Bounds added to the three row notes and the papers notes; prop_loss_db_per_cm not entered (acceptable per audit). |
| F14 | confirmed | p.4: "220-nm silicon-on-insulator (SOI) SiPh process technology", "can only produce the passive RTMs". process_name = "220 nm SOI SiPh process (passive racetrack test chip)"; "(no fabrication)" now in the papers notes. |

## Unrecorded changes

Cell-by-cell diff of the regenerated baseline vs the staged files: every changed cell and every added/changed evidence entry maps to F1-F14 (devices: 22 value/qualifier cells plus 8 notes; evidence: 13 added, 6 changed entries; papers: process_name plus 3 notes; organizations: 1 parent_org plus 3 notes; source_files: page_03.png for anjali2025, page_16.png for shabaninezhad2025). Note changes, checked sentence by sentence, are limited to the finding texts. No unexplained change found.

## Coordinator rules

- (1) license empty on all five rows (source.json license empty, license_verified false); redistribution restricted_local_only. No non-bare token present; refresh_metadata sets the arXiv licence per (n).
- (2) ror_id and name_source empty on all six new organizations; no unverified URL.
- (3) No sim configs for these papers (sims/ has none); nothing to check.
- (4) No paper of the batch exists in data/papers.csv (ids, DOIs and arXiv ids absent); discovered_via = web_search;author_group_followup.
- Programmatic: staged headers equal data/ headers; every non-empty evidence-required device cell has an evidence entry with an equal value (0 missing, 0 mismatches, 0 orphan entries).

## New issues

| id | severity | item | evidence | suggested fix |
|---|---|---|---|---|
| N1 | minor | shawon2024-a row note "Fig. 21(c) link-gain S21 ... normalised to low frequency" (unchanged sentence) | p.10 render Fig. 21(c): absolute link gain, about -29 dB at low frequency, not normalised. | "3 dB drop relative to the low-frequency level (about -29 dB link gain, Fig. 21(c)); plot not normalised". bw3db_reference low_freq_unstated stays. |
| N2 | minor | shawon2024 evidence source_files | F7 and F12 rest on the p.9 setup (Fig. 18-19); page_09.png is not listed. | Add references/shawon2024/figures/page_09.png. |
| N3 | minor (optional) | anjali2025-a/-b/-c drive_vpp_v basis design_target | p.11 captions "RF signal of X V" are simulation inputs ("chose a suitable VRF below 5 V", p.11). The only design-row drive_vpp_v precedent in data/evidence (hsu2024) uses simulated; (bb) reserves design_target for geometry. | Change basis to simulated for consistency; value and note unchanged. Not blocking. |
| N4 | minor | saxena2023-a modulation_format evidence locator "p.6 Figs. 10-11" (pre-existing) | Fig. 10 is on p.6, Fig. 11 on p.7 (render). | "p.6 Fig. 10; p.7 Fig. 11". |

No blocking or numerical issue found.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p8_05` was denied by the permission classifier (Modify Shared Resources); not re-run. The corrector's recorded line: merge counts papers 5, devices 8, orgs 6, evidence 4; conflicts 0; validation errors 0 (not independently reproduced).
