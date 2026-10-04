---
auditor: fresh-context subagent (claude-audit-2026-10-03)
task: Q1-r2 recheck: pilots, p2_01, han2023
date: 2026-10-03
scope: chen2022, kohli2025, ogiso2016 (pilots); kieninger2020 (21 rows), wolf2018a (p2_01); han2023 (p2_02 addendum). Canonical data/papers.csv, data/devices.csv, data/organizations.csv, data/evidence/<id>.yaml, sims/chen2022/config.yaml targets
mode: read-only; only this file written; no git, no network, no build_views, no merge --apply
verdict: 5 of 6 papers pass or pass after minor corrections; ogiso2016 fails on one blocking cell (eo_rolloff_db) that the round-1 correction introduced
findings: {blocking: 1, numerical: 0, metadata: 1, minor: 7}
---

# Round-2 recheck (fresh context): pilots, p2_01, han2023

## Method and limits

Step 1 (independent, done before opening any round-1 audit, disposition record or DevLog): read SKILL.md, `devices.schema.yaml` conventions (a)-(k) and column list, BATCH_INSTRUCTIONS.md, and the p3_16-p3_19 audit for format only. Dumped every populated canonical cell of the 32 device rows (chen2022 3, kohli2025 3, ogiso2016 1, kieninger2020 21, wolf2018a 3, han2023 1), the six papers.csv rows, the referenced organizations rows, all six evidence files and the `targets` block of `sims/chen2022/config.yaml`, and checked them against the sources.

Source availability: `references/<id>/text.md` and `figures/` exist only for han2023. For chen2022, kohli2025, ogiso2016, kieninger2020 and wolf2018a the cache holds only `source.pdf`, `source.json` and `crossref.json` (text and figures are git-ignored and absent on this machine). I extracted text and rendered every page with pymupdf into the session scratchpad (outside the repo); my page numbers are PDF page indices, which is what convention (i) defines. Pages and figures looked at as images: chen2022 p.3 (Fig. 1), p.4 (Fig. 2), p.6 (Fig. 4 insets, Fig. 5 a-f); kohli2025 p.4 (Fig. 2c,d), p.5 (Fig. 3b,f), p.6 (Fig. 4b and a 500 dpi crop of Fig. 4d); ogiso2016 p.1 Fig. 2, Fig. 3 and Fig. 4 (300 dpi render plus pixel analysis of the embedded 331x145 px Fig. 4 image); kieninger2020 p.10 (Table 1); wolf2018a text pp.1-10 and captions pp.14-17 (Fig. 1-4); han2023 `img_p30_1.png` (Fig. 4 a-h). Crossref records of all six papers read for identity, dates and license.

Mechanical checks (scratchpad script, nothing written to the repo): for all 32 rows every non-empty evidence-required cell has an evidence entry with equal value, or (7 cells) a `derived` item with equal value: chen2022-c `max_baud_gbd` and `rf_loss_db_per_cm`, kohli2025-rt `max_line_rate_gbps`, ogiso2016-a `max_baud_gbd`, kieninger2020-best-dc `vpil_dc_vcm`, wolf2018a-static `vpil_dc_vcm` and `prop_loss_db_per_cm`. Every qualifier sits on a populated field with op in lt|gt|approx; every entry basis is in the enum; entry units equal schema units except one (R2-F8). No evidence entry for an empty cell, no orphan device ids.

Validator: `uv run python scripts/validate_db.py` output: `0 error(s)`.

Not available: Supplementary Information of kohli2025, wolf2018a, han2023; the journal versions of kieninger2020 (Optics Express), wolf2018a (Sci. Rep.) and han2023 (Sci. Adv.). Rows of those three papers are from the arXiv v1 PDFs, as their notes state. Figure readings below are my own and approximate.

## Per-paper verdicts

| Paper | Verdict | Findings |
|---|---|---|
| chen2022 | pass after corrections (minor only) | R2-F4, R2-F5, R2-F6 |
| kohli2025 | pass after corrections (minor only) | R2-F3, R2-F7 |
| ogiso2016 | fail until R2-F1 is applied; pass after that | R2-F1 |
| kieninger2020 | pass | none |
| wolf2018a | pass | none |
| han2023 | pass after corrections (metadata/minor) | R2-F2, R2-F8 |

## Round-1 disposition check

Round-1 reports: `pilots-q1-fresh.md` (C1-C12, S1-S5, K1-K7, O1-O8), `p2_01-claude-wave-2026-10-02.md` (F1-F17), `p3_05-p3_07-han2023-q1-claude-ingest-2026-10-03.md` (han2023 part: F22, F23, plus cross-batch F24(a), F26). Disposition records: DevLog-004 line 31 (pilots, summary only; no per-finding table exists for the pilots), `data/_staging/p2_01/BATCH_REPORT.md` F1-F17 table, `data/_staging/p2_02/BATCH_REPORT.md` "han2023 audit dispositions (2026-10-03)".

| Finding | Round-1 disposition | Reflected in canonical | Correct vs source | Comment |
|---|---|---|---|---|
| pilots C1 ER bound | gt qualifiers + er_type static on a/b/c | yes | yes | p.7 ">30, >25, >20 dB"; Fig. 4 insets confirm |
| C2 approx IL/prop loss, c basis derived | applied | yes | yes | il_onchip_db:approx (a,b,c), prop_loss approx, c evidence basis derived, a/b extracted_from_figure (inset "-0.2dB" on all three insets) |
| C3 eo_rolloff on c | 1.4 dB at 67 GHz filled | yes | yes | abstract, p.7, Table I; 0.76 dB at 50 GHz in notes |
| C4 drive / vpi_convention evidence | derived entries with "not stated" note | yes | yes | Fig. 1(c,d): G-S-G with one arm per gap; drive changed to push_pull per convention (f) |
| C5 RF-line values only on 10 mm row | applied | yes | yes | z0/n_rf/rf_loss only on chen2022-c; ng_opt (simulated, Fig. 2(d)) kept on all three, acceptable |
| C6 rf_loss approx + "fit" | applied | yes | yes | 0.36 x sqrt(67) = 2.947 in `derived`; notes say fit |
| C7 "(top)" | removed | yes | yes | |
| C8 locators (Fig. 4/5 on PDF p.6) | not applied | no | n/a | see R2-F5 (minor) |
| C9 "Fab: in-house" | reworded | yes | yes | "Fabricator/facility not named" |
| C10 HK code | HK | yes | yes | countries CN;HK, org row HK |
| C11 candidates.csv date | not in scope | n/a | n/a | not audited here |
| C12 / K5 / O8 crossref cache | crossref.json cached | yes | yes | all three crossref.json present; licenses and dates match (chen CC BY 4.0 vor 2022-02-02; kohli CC BY 4.0 vor 2025-12-16; ogiso Wiley terms only) |
| S1-S5 sim config notes | recorded as open in DevLog-004 | no | n/a | still open; see R2-F6 (minor). Targets checked: correct |
| K1 headline-convention note | note reworded | yes | yes | vpi_dc_v per-arm 3.6 / 4 V, push-pull 1.8 / 2 V in vpi_mzm_pushpull_dc_v, conforms to convention (a) as revised |
| K2 IQ approx | bw3db_ghz:approx added | yes | yes | Fig. 3b caption "3-dB drop between 10 and 70 GHz"; bw_measured_to left empty (acceptable) |
| K3 rt input power plane | note added | yes | yes | |
| K4 plasmonic_mzm | changed to mzm / iq_mzm + plasmonic tag | yes | yes | |
| K6 BRNC country | kept with note | yes | yes | |
| K7 integration empty | kept | yes | yes | |
| O1 bound on bw3db_ghz | 67 gt in bw3db_ghz, bw_measured_to 67 plain | yes | yes | |
| O2 eo_rolloff | filled 2.7 dB at 67 GHz | yes | **no** | Fig. 4 end of trace is about -2.0 dB, not -2.7; see R2-F1 (blocking). Round-1 reading was wrong and the correction copied it |
| O3 1540 nm ER inconsistency | note added | yes | yes | Fig. 2 green trace bottoms near -21 dB (my reading) |
| O4 il approx, il_basis author_estimate | applied | yes | yes | |
| O5 one row note | added | yes | yes | |
| O6, O7 | no change | n/a | yes | |
| p2_01 F1 sigma_meas | 0.18 / 0.12 / 0.10 | yes | yes | Table 1 p.10 |
| F2 6 dB EOE equivalence | note added, 25 GHz kept in bw6db_ghz | yes | yes | Fig. 3 caption p.16 |
| F3 drive plane notes | added both papers | yes | yes | |
| F4 replicated ER 30 dB | removed from all 16 rows | yes | yes | paper states it once ("around 30 dB ... consistent for all investigated devices", p.5) with no per-device values; papers.csv notes keep it. Acceptable |
| F5 design_target basis | retained pending policy | yes (unchanged) | judgment | same practice in 84 evidence files; not re-raised |
| F6 poled tag on replicates | dropped | yes | yes | |
| F7 electrode_type evidence | 24 derived entries | yes | yes | |
| F8 wolf bw3db_reference | cleared | yes | yes | |
| F9 kieninger electrode_metal | cleared; stack text scoped | yes | yes | |
| F10 inclusive bound | kept gt + note | yes | yes | |
| F11 unit conversions to `derived` | moved | yes | yes | consistent with skill rule 11 |
| F12 terminated tag on DAC row | removed | yes | yes | |
| F13 system loss = Die 1 MZM 2 numerically | notes added | yes | yes | |
| F14 8 dB remainder note | added | yes | yes | |
| F15 25 dB/cm not entered | rejected with reason | yes | yes | p.6: 2.5 dB/mm comes from the gated ~0.7 dB estimate, not the ungated 0.74 dB reading; rejection is right |
| F16 papers form | bare arxiv_id, abs URL, venue arXiv, tag | yes | yes | han2023 does not follow this form, see R2-F2 |
| F17 orgs | no change | yes | yes | |
| han2023 F22 FEC claim | modulation_format extended, notes | yes | yes | Fig. 4(h): 20 percent FEC line about 1.5e-2, best 112 Gb/s point about 1.7e-2 (my reading) |
| F23 bw_basis | measured -> derived | yes | yes | p.11 "read to be about 110 GHz from fitting"; author-fit value, (h) satisfied |
| F24(a) Zhang Jiang vs Zhangjiang | single canonical "Zhangjiang Laboratory" | yes | yes | only one org row exists |
| F26 published_on rule | empty for arXiv copy | yes | yes | |

## Findings

### Blocking

**R2-F1 (blocking). ogiso2016-a `eo_rolloff_db` = 2.7 dB at 67 GHz; Fig. 4 shows about 2.0 dB.**
- Cells: `data/devices.csv` ogiso2016-a `eo_rolloff_db` = 2.7 (qualifier `eo_rolloff_db:approx`, freq 67); `data/evidence/ogiso2016.yaml` entry ogiso2016-a `eo_rolloff_db` value 2.7, note "about -2.7 dB relative to 1.5 GHz"; `context_values` item `eo_response_at_end_of_trace` "approx -2.7".
- Source: p.1, Fig. 4 "Small-signal EO response", y axis 0 (top) to -3 dB (bottom), reference 1.5 GHz per text. Pixel analysis of the embedded figure image (axis frame y = 2 px at 0 dB to y = 138 px at -3 dB; trace ends at x = 315 px = 67.2 GHz on the 0-70 GHz axis) puts the last trace pixels at y = 89-95 px, i.e. -1.9 to -2.05 dB; an independent 300 dpi page render gives the same (0 dB tick at 275.5 px, -3 dB tick at 547.5 px, final trace pixels 450-463 px, -1.9 to -2.07 dB). The trace near 60 GHz is about -1.4 dB. All readings approximate (plus or minus 0.1 dB). The -2.7 dB value originates in round-1 O2 and is not supported by the figure.
- Correction: set `eo_rolloff_db` to 2.0 (keep `approx`, basis `extracted_from_figure`, freq 67) in devices.csv and the evidence entry; change the evidence note to "end of Fig. 4 trace about -2.0 dB relative to 1.5 GHz (figure read)"; change `context_values` `eo_response_at_end_of_trace` to "approx -2.0 (read from plot)". Re-read the figure before applying.

### Numerical

None.

### Metadata

**R2-F2 (metadata). han2023 papers.csv form differs from the normalization applied to the other arXiv-v1 rows (p2_01 F16).**
- Cells: `data/papers.csv` han2023 `venue` = "arXiv; associated journal: Science Advances 9(42) eadi5339", `arxiv_id` = "2302.03652v1", `url` = "https://arxiv.org/pdf/2302.03652v1".
- Reference: kieninger2020 and wolf2018a (same situation: numbers from arXiv v1, DOI of the journal version) were normalized to venue "arXiv", bare `arxiv_id`, abs URL, version kept in notes and in a `numbers_from_arxiv_v1` tag. han2023 notes already state the version.
- Correction: venue "arXiv"; arxiv_id "2302.03652"; url "https://arxiv.org/abs/2302.03652"; add `numbers_from_arxiv_v1` to han2023-a `tags`. Keep the journal reference in notes. (Or record a decision that both forms are allowed; no number changes.)

### Minor

**R2-F3 (minor). kohli2025-rt `bw_measured_to_ghz` = 70 and the row note "flat to the 70 GHz axis limit": Fig. 4d data extend to about 75 GHz.**
- Cells: devices.csv kohli2025-rt `bw_measured_to_ghz` 70 (`extracted_from_figure`), evidence note "Axis spans +/-70 GHz", row notes.
- Source: p.6 Fig. 4d (500 dpi crop): ticks at 30, 50, 70 GHz, the axis and the data continue past the 70 tick to about 74-75 GHz on both sidebands, still within about +2 dB of 0 (approximate reading). Methods p.9 says 70-110 GHz used a mixer, so the 70 GHz is not an instrument limit for this trace.
- Correction: either set 75 (`extracted_from_figure`, note "axis end about 75 GHz, figure read") or keep 70 and change the note to "data plotted to about 75 GHz; 70 GHz is the last labelled tick". The bound is conservative either way.

**R2-F4 (minor). chen2022 `substrate` states a 35 um undercut as fabricated; the paper gives 35 um as the optimal design value.**
- Cells: devices.csv chen2022-a/b/c `substrate` "silicon 725 um with 35 um isotropic undercut beneath the modulation section"; evidence note "35 um undercut stated optimal".
- Source: p.5 "a 35 um undercut etching of the silicon substrate is optimal" (design, Fig. 2(f,g) star); p.7 "Longer isotropic undercut etching ... should be done to further reduce the RF index" implies the fabricated undercut was not at or beyond the design point; the fabricated depth is not stated.
- Correction: "silicon 725 um, isotropically undercut beneath the modulation section (35 um design optimum; fabricated depth not stated)".

**R2-F5 (minor). chen2022 figure locators point Fig. 4 and Fig. 5 to p.7 (round-1 C8 not applied).**
- Cells: evidence locators such as "p.7 Sec. III; Fig. 4(a)", "p.7 Sec. III; Fig. 5", "Fig. 4(c) inset; p.7 Sec. III".
- Source: Fig. 4 and Fig. 5 are on PDF p.6; Sec. III text on p.7.
- Correction: "p.7 Sec. III; p.6 Fig. 4(a)" etc. Values unaffected.

**R2-F6 (minor). sims/chen2022/config.yaml round-1 notes S2, S3, S5 still open.**
- Items: `geometry.regions.ln_rib_r` note "sidewall ~68 deg from horizontal" while the polygon gives about 65.8 deg (S3); materials marked `standard_reference` with notes "not verified" (S2); title term "T-rail" (paper: T-segment) (S5).
- Targets themselves verified (see Verified clean). Correction: align the S3 note with the polygon, replace "T-rail" by "T-segment"; S2 waits for the material-constant sourcing task recorded in DevLog-004.

**R2-F7 (minor). kohli2025-iq `notes` repeat the 70 GHz bandwidth explanation twice.**
- Cell: devices.csv kohli2025-iq `notes`: "3 dB BW 70 GHz is the paper statement (3 dB drop between 10 and 70 GHz; ...)" and, at the end, "3 dB bandwidth 70 GHz is the Fig. 3b caption statement ...".
- Correction: delete the trailing duplicate sentence; optionally add "data plotted to about 100 GHz (Fig. 3b, figure read)".

**R2-F8 (minor). han2023 evidence unit for `ng_opt` is empty; schema unit is "1".**
- Cell: `data/evidence/han2023.yaml` entry han2023-a `ng_opt` unit ''.
- Correction: unit '1' (as in chen2022). The validator does not check this.

## Verified clean

chen2022: Vpi 4.45 / 3.22 / 2.20 V (Fig. 4 labels, p.7), VpiL 2.22 / 2.25 / 2.20 V cm reported (p.7), lengths 5 / 7 / 10 mm, ER >30 / >25 / >20 dB (Fig. 4 insets, gt, static), IL -0.2 dB inset label on all three (approx), 8.2 dB total with GCs, 0.15 dB/cm about (approx), roll-off 1.4 dB at 67 GHz and 0.76 dB at 50 GHz (Table I), bandwidth >67 GHz (gt, measured-to 67), EE S12 roll-off <1.7 / <2.4 / <3.5 dB in notes, alpha0 0.36 fit and 0.19 simulated, Z0 about 50 to 52 ohm noisy (50.5 band read, Fig. 5(d)), n_m about 2.35 flat vs ng 2.2 (Fig. 5(f), ~0.15 mismatch text), ng 2.2 simulated (Fig. 2(d) label), 400 nm x-cut film, 200 nm ridge and slab, 1.5 um width, 1.8 um gap, 75 um ws, 1.1 um Au (T-segments 0.2 um), 3 um BOX, 725 um Si, 900 nm PECVD SiO2, 100 Gb/s OOK, 56 GBd PAM-4 = 112 Gb/s, AWG ~35 GHz without driver amplifier, push-pull geometry from Fig. 1(c,d). papers.csv identity, 11 authors, venue, published_on 2022-02-02, CC-BY-4.0 vor, universities and HK code. Sim targets: VpiL 2.20 / n_rf 2.35 / Z0 50.5 / 2.947 dB/cm / -1.4 and -0.76 dB measured, and 2.10 V cm, ng 2.2, n_rf 2.16 (Fig. 2(d) plateau about 2.15-2.17), Z0 52.3 (Fig. 2(c) plateau about 52-52.5), 1.555 dB/cm simulated: all match.

kohli2025: MZ 15 um, 150 nm slot, 3.6 V per phase shifter and 1.8 V push-pull at DC, 6.4 V at 40 GHz, 110 GHz with 3 dB drop between 10 and 110 GHz (Fig. 2d: about +1 dB at 10 GHz, about -2 dB near 110 GHz), 20.3 dB fiber-to-fiber, 0.5 dB/um = 5000 dB/cm, ~20.3 dBm, 256 GBd 2PAM / 170 GBd 4PAM (340 Gb/s) / 96 GBd 8PAM, ~30 fF and ~10 fJ/bit author estimates; IQ 17.5 um, 100 nm slot, 4 V / 2 V, 70 GHz (approx, ref 10 GHz; Fig. 3b about -4 dB at 10 GHz, about -7 dB at 70 GHz), 23.9 dB at 1550 nm, ~0.7 dB/um, ~21 dBm, 224 GBd 4QAM = 448 Gb/s; RT 5 um, 1315.7 nm, ~13 dBm in fiber, Q 1931, FSR 1.79 nm, 0.3 nm/V, Vpi 3 V derived (1.79 / (2 x 0.3) = 2.98 V), IL <2 dB, ER >6 dB (Fig. 4b labels), 9.4 dB fiber-to-fiber, 200 GBd 2PAM; 1.13 Vpp for all modulators; SiN 800x800 / 600x800 nm, ~200 nm BTO, ~100 nm spacing, VDC 80 / 40 um. papers.csv identity, 16 authors, published_on 2025-12-16, CC BY 4.0 vor, ETH Zurich / Ligentec SA / Lumiphase AG / BRNC roles (author contributions, acknowledgements).

ogiso2016: 3 mm CL-TWE, Vpi 2.0 V differential at 1530-1560 nm (Fig. 2 arrow), ER >22 dB (27 dB at 1560 nm), 10 dB total with 4 dB/facet, on-chip ~2 dB estimate, 3 dB EO bandwidth >67 GHz referenced to 1.5 GHz, -5 V bias, S21 electrical 6 dB >67 GHz and S11 < -10 dB (Fig. 3) kept out of EO fields, 1550 nm / +13 dBm / 2.3 Vpp, 100 Gb/s NRZ-OOK, dynamic ER >18 / >10 dB, [011] stripe, n-i-p-n stack order, SI-InP, BCB. papers.csv identity, 7 authors, E-first 2016-09-30, Wiley terms (publisher-copyright, restricted).

kieninger2020: all 16 Table 1 rows (lambda_i, a_tot, a_PS, standard deviation, sigma_meas in notes) match p.10 image; 1.48 V, 0.41 V mm -> 0.041 V cm, 280 um, 1550 nm; 1.50 V DC system device; 0.74 dB and 13.6 dB ungated (p.8); 40 GHz terminated, 0.1 V/nm gate (p.7); 1560 nm; 0.78 / 0.72 / 1.44 Vpp chain (PAM4); 100 GBd, 200 Gb/s line, 187 Gb/s net; rails ~240 x 220 nm, slot ~130 nm, slab ~70 nm, 2 um BOX, 3 um top oxide, JRD1; A*Star IME fabrication (p.2). papers.csv identity, 11 authors, DOI, arXiv id, restricted license handling.

wolf2018a: 0.9 V at 1550 nm, 1.1 mm, 1 V mm -> 0.1 V cm, bias above 2 V (gt), "20 dB or more" (gt), ~8 dB slot section (approx), 7.3 dB/mm -> 73 dB/cm, ~14 dB static ER, ~25 GHz 6 dB EOE with gate 0.1 V/nm, 1.4 Vpp amplifier output, 98 fJ/bit from Eq. (10) (0.7^2 / 50 / 1e11 = 9.8e-14 J), gated/ungated split of the b2b and 10 km rates (Fig. 2 caption), DAC run without gate, BER values, rails 240 nm, slot 160 nm, SEO100, Al electrodes, 248 nm DUV at A*Star IME. papers.csv identity, 13 authors, DOI, arXiv id; Muenster and Infinera as present addresses.

han2023: 124 um, 455 nm core, 90 nm slab, 220 nm SOI, 2 um BOX, 5.0e17 doping, 6.4 um gap, 1.2 um Cu, GSGSG, period 300 nm, corrugation 190 nm, Np 20, Nr 10; ng 6.1 simulated; 6.8 dB on-chip with 5.4 dB phase shifter, ~10 dB coupling excluded; 110 GHz author fit with trace ending near -3 to -3.5 dB at 110 GHz and peaking about +1.3 to +1.5 dB near 20 GHz (Fig. 4c, my reading), reference dc; ER 2.15 dB at 112 Gb/s and 3.15 dB at 100 Gb/s (Fig. 4d caption); 8 nm passband; BER: 98 Gb/s best about 2e-3 below the 7 percent line, 112 Gb/s best about 1.7e-2 above the 20 percent line (Fig. 4h, my reading); CompoundTek Pte (p.14); identity and 17 authors vs Crossref; empty license and published_on correct for the arXiv copy.

Organizations referenced by these papers exist in `data/organizations.csv` with the names used in papers.csv (ETH Zurich, Ligentec SA, Lumiphase AG, Binnig and Rohrer Nanotechnology Center, Zhejiang University, South China Normal University, The Hong Kong Polytechnic University (HK), Nippon Telegraph and Telephone Corporation, Karlsruhe Institute of Technology, University of Washington, Institute of Microelectronics (SG), Micram Microelectronic GmbH, Peking University, Beijing Information Science and Technology University, Peng Cheng Laboratory, Zhangjiang Laboratory, Peking University Yangtze Delta Institute of Optoelectronics, CompoundTek Pte).
