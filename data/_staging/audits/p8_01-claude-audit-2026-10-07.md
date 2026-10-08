# p8_01 independent audit (claude, 2026-10-07)

Scope: `data/_staging/p8_01/` (papers.csv 5 rows, devices.csv 8 rows, organizations.csv 3 rows, evidence/*.yaml 4 files; no sims). Papers: behzadfar2026, ghavami2023, wu2022, yeh2026, bankwitz2026. Sources: cached arXiv v1 copies (`references/<id>/text.md`, `figures/`, `source.json`); no crossref.json, no arxiv.json, no supplement/correction folders.

Counts: blocking 0, numerical 2, metadata 1, minor 5.

## Findings

| id | severity | paper / device / field | evidence (source, locator) | recommended fix |
|---|---|---|---|---|
| F1 | numerical | behzadfar2026-a / bw3db_ghz (219) | Table 1 (p.9), p.1 ("~ 219 GHz"), p.9 text ("219 GHz and 0.84 V") and conclusion p.9 ("~ 220 GHz") give 219. The figures of the same design disagree: Fig. 6(a) (p.8) L = 10 mm solid curve crosses -3 dB near 207 GHz; Fig. 6(b) (p.8, img_p08_1.png) 10 mm quartz/air/glycerol circle at Vpi about 0.84 V sits at about 207 GHz; Fig. 7(a) case 6 star at about 210 GHz. Text p.7 says Fig. 6 is G = 5.0 um quartz/air/glycerol with DC VpiL 0.84 V cm, i.e. the design #1 operating point. Not mentioned in the staged notes. | Keep 219 (stated four times incl. the table; the figure gap is about 6 percent, unlike the -d case). Add to the -a row notes and the bw3db_ghz evidence note: "Fig. 6(a)/(b) show about 207 GHz and Fig. 7(a) about 210 GHz for the same 10 mm design (read from the figures)". Coordinator may instead apply (y) for symmetry with -d; auditor prefers keep + note. |
| F2 | numerical | ghavami2023-a / il_onchip_db (0.1, lt), il_onchip_scope, il_basis | Only source is the conclusion, p.6: "this proposed modulator has optical losses below 0.1 dB". The body reports no optical-loss result; Sec. 2.3/2.3.2 (p.5-6) cite Figure 3 and an FDTD result that are not in the PDF, and the quantity (crossing, whole device, per what length) is never defined. Convention (y): a summary claim unsupported by the body goes to notes only. | Empty il_onchip_db, il_onchip_scope, il_basis, remove `il_onchip_db:lt` from qualifiers and the il_onchip_db evidence entry; keep the sentence in the row notes (already there). |
| F3 | metadata | behzadfar2026 / papers notes ("Author first names from the batch CSV (the PDF prints initials)") | p.1 footnote prints the full names: "Shiva Behzadfar, Fatemeh Karami, and Pooja Kulkarni are with CREOL ..." and "Sasan Fathpour is with CREOL ...". The authors cell is correct; its stated provenance is wrong. | Reword to "Author first names as printed in the p.1 affiliation footnote (byline prints initials)." |
| F4 | minor | behzadfar2026 / BATCH_REPORT judgment (6) | Report says "printed figure numbers are one lower than the text citations". Only Figs. 3 and 4 are swapped (text p.5 "Figure 3 plots Gamma", printed caption Fig. 4 p.6; text p.6 "Figure 4 reports the index mismatch", printed caption Fig. 3 p.6); Figs. 5, 6, 7 match. The papers notes state this correctly. | Correct the BATCH_REPORT wording to "Figs. 3 and 4 swapped"; no data change. |
| F5 | minor | ghavami2023 / papers notes and -a notes (bandwidth wordings) | The introduction p.2 also says "can also support a bandwidth over 300 GHz" (together with "half wave voltage of 4.5V"). Notes list abstract, Sec. 2.1.2 and conclusion only. | Add "introduction p.2 'over 300 GHz'" to the wording list. Value 300 approx stays (Fig. 1(c), p.3, img_p03_1.png: purple curve crosses -3 dB at about 298 GHz; blue reference reaches -3 dB at about 70 GHz, both verified). |
| F6 | minor | ghavami2023 / title | Staged title "trade-off"; cached PDF p.1 prints "trade off" (no hyphen). No crossref.json or arxiv.json in the cache to arbitrate. | Let `scripts/refresh_metadata.py` set the title from the arXiv record at merge; no manual change. |
| F7 | minor | yeh2026 / papers notes (papers-only call) | Plotted, figure-only dc EO responses exist: Fig. 1(b) (p.10) single-drive EO response peaks about 0.24 GHz/V and decays to about 0.05 GHz/V over 30 h; Fig. 4(a) (p.13) push-pull initial EO-V reaches about 45 GHz splitting change at 25 V. These are drift-dependent splitting slopes of a coupled-resonator probe, never stated in text, not a resonance-wavelength tuning or any Vpi/BW/IL/ER. | Papers-only ruling upheld (see below). Optional: add one clause to the notes that the dc EO response appears only as drift-dependent plotted GHz/V values (Fig. 1(b), 2, 4) and is not entered. |
| F8 | minor | wu2022-a / notes (Fig. 6(c)) | Fig. 6(c) (p.6, img_p06_1.png): the trace touches -3 dB near 28 GHz, near 35 GHz and again at the last points near 50 GHz. Notes mention 28 and 35 only. | Add "and at the 50 GHz end point" to the note; bw3db_ghz 50 gt + bw_measured_to_ghz 50 stays (authors' explicit claim p.6 and abstract). |

No blocking findings. Every other staged value matched the source (list below).

## Rulings on the distiller's judgment calls (BATCH_REPORT)

behzadfar2026
1. -d bandwidth empty: upheld. Text p.7 "almost 100 GHz ... 20-mm-long MZMs with Vpi = 0.63V" and p.9 "~ 100 ... GHz" vs Fig. 6(b) 20 mm Si/SiO2/air square at about 128 GHz (verified). Self-contradiction per (y).
2. 357 GHz at 3.36 V not entered: upheld. Fig. 6(b) 2.5 mm quartz/air/glycerol circle at Vpi about 3.36 V is about 292 GHz; length not stated in text.
3. waveguide_platform suspended_lnoi (-a/-b/-c), lnoi_rib (-d): upheld (4 um air undercut under the film, p.6; benchmark Si/SiO2/air, p.5).
4. drive push_pull / mzm_push_pull: upheld (Eq. (1) "for the push-pull configuration and X-cut wafers", p.2; GSG for push-pull, p.3).
5. Fig. 6(b) / Fig. 7 plotted points not entered: upheld (design sweep, plotted only); see F1 for the figure value of the headline design.
6. Figure numbering: data locators correct, report wording wrong (F4).
Grade C / no sim: upheld (wavelength, cladding thicknesses, undercut lateral extent unstated; 3D T-rail and grating).

ghavami2023
- Vpi empty: upheld (4.5 V intro p.2 vs "efficiency of 4.5 V.cm" abstract p.1 and conclusion p.6).
- bw3db 300 approx: upheld (figure crossing about 298 GHz; F5 adds the intro wording).
- waveguide_platform lnoi_rib from the Fig. 2 inset: acceptable but weak; the inset (p.5) is a low-resolution cross-section labelled Au/LN/SiO2 and the text never says rib. Keep with the existing note, or empty if the coordinator prefers text-only platform calls.
- IL < 0.1 dB entered: overruled (F2).
- Source gaps (Figure 3 missing, all dimensions "x"): confirmed in text.md p.4-6.

wu2022
- bw3db_reference low_freq_unstated: upheld (Fig. 6(c) normalized, plateau about -1.3 dB after a +1 dB bump near 1 GHz; no reference frequency stated).
- Fig. 6(c) touches -3 dB: upheld with F8 addition.
- drive / vpi_convention push_pull inferred, evidence basis derived: upheld (Fig. 2(b) p.3 shows one arm in each G-S gap; authors do not state push-pull).
- Figure citation mismatch: confirmed (text p.6 cites "Figure 5(a) and (b)" and "Figure 6(c)"; drawn panels are Fig. 6(a),(b),(c); caption lists only (a),(b)).
- EE roll-off, RF index, Z0 not entered: upheld (EE 4.9 dB at 50 GHz is electrical; Fig. 2(c) simulated 2.24 / 50 ohm; Fig. 5(b) extracted curves without a stated single value).
- il_onchip 0.6 approx, device_total, author_estimate: upheld (p.4: "~2.6 dB, including a coupling loss of 1.0 dB/facet and an on-chip propagation loss of ~0.6 dB"; coupling from a 1 mm straight-waveguide reference "estimated").

yeh2026 (papers-only)
- Upheld. The full text (p.1-13) reports no Vpi, VpiL, bandwidth, insertion loss, extinction ratio, Q, FSR or a stated tuning efficiency; the only quantitative device statements are zero-bias splitting about 28 GHz (Fig. 2 caption p.11), 30 V / 25 V probe voltages, 36 h init, -60 V reset over 1 h, "degraded by 4.5x" (p.3), push-pull factor 4 in amplitude (p.3). The plotted GHz/V EO responses are drift-dependent physics observables, not modulator figures of merit (F7). Supporting Information not cached; it is described as model comparisons and electrode-geometry hysteresis (p.9), not FOMs.
- Northwestern University as present address in universities: consistent with existing practice (University of Münster row notes "present address"). HyperLight excluded (competing interests only): upheld. foundry_or_fab Center for Nanoscale Systems: matches `data/organizations.csv` exactly.

bankwitz2026
- ER 51 dB with gt: upheld (p.8 Fig. 3 caption "equals 51 dB extinction, equal to the noise floor"; p.19 "static extinction ratio of 51 dB"; abstract ">50 dB"); er_type static correct.
- Vpi 3.4 approx: upheld with its note. Methods p.18 states "approximately 3.4 V at 1550 nm, as shown in Figure 3"; Fig. 3(b) top axis (verified on page_08.png) places pi at about 5.2 V for modulator 2, and Eq. (5)/(6) printed "V/rad" read as rad/V give 3.6 V (EOM1) and 5.2 V (EOM2). The stated value is close to the EOM1 fit and carries approx; the discrepancy is already in notes. Not escalated.
- Fitted slopes in notes only, foundry_native with empty foundry_or_fab, platform and electrode_type empty: upheld (p.18 "foundry-based processes", "foundry's photonic design kit", foundry unnamed; electrode type described only as push-pull traveling-wave).
- Linq Photonics excluded (competing interests only, p.23-24): upheld. Pixel Photonics GmbH is affiliation 3 (p.1): correct as a company.

## What was checked

- Read in full: text.md of all five papers. Opened figures: behzadfar2026 page_07, page_08, img_p08_1 (Fig. 5, 6, 7); ghavami2023 img_p03_1 (Fig. 1), page_05 (Fig. 2); wu2022 page_03 (Fig. 2), page_04 (Fig. 3), page_05 (Fig. 4, 5), page_06 and img_p06_1 (Fig. 6); yeh2026 img_p10_1, img_p11_1, img_p13_1 (Fig. 1, 2, 4); bankwitz2026 page_08 (Fig. 3).
- Every non-empty devices.csv cell of the 8 rows against the source and its evidence entry: values, basis, qualifiers, locators. Behzadfar geometry (600 nm x-cut film, 220 nm etch, 950 nm rib, 150 nm buffer, 1.0 um Au T2, 120 um signal width, 500 um quartz, 4 um undercut, glycerol eps 44, ng 4.3/3.7, G 5.0/4.0, Table 1 Vpi 0.84/0.91/0.64 V and 219/219/187 GHz, VpiL 0.84 and 1.25 V cm, RF loss 4.7 and 6.8 dB/cm at 219 GHz, Vpi 0.63 V at 20 mm): all match. Wu2022 (500 nm film, 0.21 um etch, 5.5 um gap, 7 mm, Vpi 3.1 V at 100 kHz -> 0.0001 GHz, VpiL 2.16, ER 18 dB, 2.6/0.6/1.0 dB losses, 1550 nm, VNA 10 MHz-50 GHz): all match. Bankwitz (1550 nm, x-cut, 51 dB, 3.4 V): match. Ghavami (300, 70 GHz, 5 mm, gold, silicon, SiO2, x-cut): match; F2 for IL.
- Conventions: Vpi convention and drive (a, f, q), DC Vpi frequency split (m: wu2022 100 kHz in vpi_dc_freq_ghz; design rows DC), bandwidth reference/method/bounds (c, t), IL scope and placement (s), band from wavelength (l: 1550 -> c_band; empty where no wavelength), er_type (o, x), row granularity and row_kind design for simulated rows (d, z), basis labels (h, bb: geometry design_target, simulated metrics simulated, vpil derived for wu2022), integration empty for design rows (ee), eo_effect pockels, papers-only rule (dd), source defects (y).
- Identity: titles, author lists and order against the printed bylines (batch CSV truncations for wu2022, yeh2026, bankwitz2026 correctly expanded), arxiv_id, url (unversioned abs), source_type arxiv_preprint, year, published_on (only ghavami2023, matching the printed stamp "arXiv:2311.16679v1 ... 28 Nov 2023"), license empty and redistribution restricted_local_only consistent with source.json and the p8 brief (filled at merge), discovered_via from the batch CSV minus the non-vocabulary token.
- Organizations: all reused names match `data/organizations.csv` exactly; Tarbiat Modares University, Heidelberg University and Pixel Photonics GmbH are absent from it (no variant spelling found), with country/region from the printed addresses; name_source and ror_id empty as required.
- Missed values: none that belong in a column beyond those noted (F1, F7, F8 are note additions).
- Not done: the merge dry run was not re-run by the auditor (the command was blocked in this session); the distiller reports 0 conflicts and 0 validation errors. A grep of bankwitz2026 for optical power figures was also blocked; the Methods passages read (p.18-19) state only the EDFA output (~30 mW, notes-only per (w)).
