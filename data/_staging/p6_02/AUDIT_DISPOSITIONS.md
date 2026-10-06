# p6_02 audit dispositions (corrector, 2026-10-05)

Source: data/_staging/audits/p6_02-claude-audit-2026-10-05.md. Counts: applied 21, adjusted 3, rejected 1 (25 findings).

- F01 applied. sims/li2022b/config.yaml: LN eps_r, LN r_pm_per_v, SiO2 eps_r, Si eps_r, gold sigma_Sm -> provenance `class: unknown` (UNVERIFIED placeholder notes, unread citations dropped); values stay in `materials` so the electrostatic stage runs; `missing` reworded (all UNVERIFIED placeholders). Evidence: references/li2022b/text.md and arxiv/text.md state none of these constants (grep for permittivity/conductivity/Pockels).
- F02 applied. Same 5 constants in sims/murai2025/config.yaml; text.md has no LN/SiO2/Si permittivity, Pockels set or conductivity.
- F03 applied. Same 5 constants in sims/pan2021/config.yaml; the r set is noted as a 633 nm placeholder at a 1957 nm device; text.md has none of the values.
- F04 applied. 4 constants (no Si) in sims/xue2023/config.yaml; text.md mentions r33 only in the phase formula (p.1), no value. Total 19 constant entries converted (air left as is, definitional).
- F05 applied. papers.csv li2022b discovered_via = web_search;assigned (canonical; coordinator decision); the BATCH_REPORT difference list updated.
- F06 applied. papers.csv murai2025 discovered_via = drive_doc;tmp_eo_md (batch CSV value; coordinator decision).
- F07 applied. sims/murai2025/config.yaml geometry.electrodes.ground_r -> `class: unknown`, note "UNVERIFIED placeholder ... 60 um ... not from this paper"; already listed under `missing`.
- F08 adjusted. organizations.csv: names kept as printed (Furukawa FITEL Optical Components Co., Ltd.; Meta), ror_id/name_source empty per coordinator rule (crossref.json has no ROR for either; murai crossref prints "Furukawa FITEL Optical Components Co. Ltd."); notes reworded from "not checked (no network)" to "ror_id and name_source left empty (not printed in the paper or in crossref.json)".
- F09 applied. Verified in references/li2022b/text.md: (a) p.6-7 "microwave amplifier (Talent Microwave TLLA50K20G-30-30, 20 GHz) were subtracted" vs arXiv text "SHF S807"; (b) p.6 "1-h annealing process at 500 C in a nitrogen environment"; (c) p.6 CLTW "simulated 3-dB bandwidth ... can well exceed 120 GHz"; (d) p.6 "a certain deviation from the simulation value (2.73 V)". (a)-(d) added to li2022b-a notes ((a) with the caveat on the >25 GHz bound; no design row). (e) listed in the BATCH_REPORT REPLACE section (band evidence entry and previous_value history not carried; band is derived from wavelength_nm per (l)).
- F10 applied. li2022b-a notes: Fig. 6(d) transmission peak about -21 dB, normalization not stated; no value change.
- F11 applied. sims/li2022b/config.yaml geometry.electrodes.signal -> `class: project_inference`; note says the contested gap (5.5 um Fig. 4 caption vs 5.9 um text p.4) is the inference, t and ws are paper values.
- F12 adjusted. Re-read Fig. 5 (references/murai2025/figures/page_07.png): the Fig. 5(a) voltage axis does run 0 to -3 V (so the original wording was correct for 5(a)); Fig. 5(b) x-axis spans about -3 to +0.8 V with Vpi markers at about -2.45 and +0.2 V. Note now states both; bias_for_vpi_v stays empty.
- F13 applied. murai2025-a notes add: Sec. 3.3 "approximately 28 GHz", discussion p.8 "large bandwidths of > 28 GHz" (text.md line 222, 266); value 28 unchanged.
- F14 adjusted. 0.7 dB/cm left on murai2025-a only (no new entry on -b); both rows' notes now say it is entered on -a only and applies to the same process.
- F15 applied. murai2025-b notes and evidence note: Vpi 8.9 V is length-scaled from -a; derived VpiL (about 2.67 V cm) is not independent.
- F16 applied. Evidence basis measured -> derived for vpil_dc_vcm: murai2025-a, pan2021-a, xue2023-a/b/c (notes state the author arithmetic; murai p.6, pan p.6, xue p.2).
- F17 applied. pan2021-a z0_ohm evidence basis design_target -> simulated, locator p.3 Sec. 2; p.5 Fig. 4(a), note "calculated Re[Z0] curve, plateau about 50 ohm"; no approx qualifier added (optional).
- F18 applied. pan2021-a electrode_type tw_gsg evidence entry added: basis derived, locator "p.2 Fig. 1(a); p.5 Fig. 5(a); p.6 Sec. 3 (GSG probes)", note as recommended.
- F19 applied. sims/pan2021/config.yaml ln_rib_r -> `class: project_inference`; note says the sidewall reading is the inference (w, h paper_exact).
- F20 applied. pan2021-a tag first_tfln_mzm_at_2um removed; the authors' priority claim (abstract, text.md line 37) moved to notes.
- F21 applied. xue2023-a/b/c vpi_convention locator -> "p.1 text; p.1 Fig. 1(c) caption" (page marker check: Fig. 1 caption is on p.1).
- F22 applied. sims/xue2023/config.yaml ground_r note: inner edge 1.3 um = WEG 0.8 um + half the 1.0 um top width (rib top edge at 0.5 um; config polygon top x = +-0.5).
- F23 applied. Confirmed on references/xue2023/figures/img_p01_5.png (10 um bar = 87 px): outer strips about 165 px = 19.0 um, darker non-metal surface beyond both inside the frame. Config ground_r note and `missing` entry updated (about 19 um, figure_digitized, not clipped); not a devices column.
- F24 rejected (no change). pan2021 "NANOLN, China" and li2022b "NanoLN, Jinan" are the printed spellings; canonical papers.csv itself carries NanoLN (14) and NANOLN (5+) variants, so there is no single form to normalise to in this batch; left to the coordinator.
- F25 applied. license fields are bare tokens: Optica-OA-License-v2 (murai2025, xue2023, li2022b), Optica-OA-License-v1 (pan2021); values match crossref.json (OA_License_v1/v2).

Dry run: `uv run python scripts/merge_staging.py data/_staging/p6_02 --replace-paper-ids li2022b` -> papers 4, devices 8, orgs 2, evidence 4; conflicts 0; validation errors 0 (nothing written).
