# p3_09 batch report (verified_on 2026-10-02)

Papers: falcone2026, berman2026, nenezic2026. Dry-run merge: 0 conflicts, 0 validation errors (3 papers, 8 device rows, 1 new organization, 3 evidence files). No sim configs written (none qualifies, see below). No needs_download.

All three sources are arXiv v1 preprints; no `crossref.json` exists for any of them, so `license` and `published_on` are empty and `redistribution = restricted_local_only` (batch instruction). Supplementary Information is not in any cache.

| Paper | Numbers come from | Pages read |
|---|---|---|
| falcone2026 | arXiv 2601.14938v1 (13 pp, dated 2026-01-21) | full text, Fig. 4 render (p.7) |
| berman2026 | arXiv 2607.03690v1 (12 pp, dated 2026-07-04) | full text, Figs. 1, 3, 4 renders (pp.3, 5, 6) |
| nenezic2026 | arXiv 2605.28765v1 (10 pp, dated 2026-05-27) | full text, Table I and Fig. 5 render (p.8) |

Cache repair: berman2026 `figures/page_05.png` was a blank render (MuPDF "overly large image" error on the Fig. 3 page); regenerated from the cached `source.pdf` with Ghostscript at 150 dpi. `source.pdf` (sha256 unchanged) and `source.json` untouched. falcone2026 and nenezic2026 caches were complete.

## falcone2026
- Status: distilled (platform paper with modulator metrics). Rows: 1 paper, 2 devices (700 C and 800 C anneal), 1 evidence block. repro_grade B, sim config none.
- Reported: VpiL 35 +-2 V*cm (700 C) and 52 +-2 V*cm (800 C) from several lengths (100 to 2000 um) at 1550 nm, 100 kHz triangular 360 Vpp after DC poling; propagation loss about 20 and about 50 dB/cm; electrode gap 9.7 um, Cr 5 nm / Au 300 nm, 2 um waveguide, 100 nm residual layer, 350 nm imprint height, 2 um SiO2.
- Not reported: Vpi per device, length of the VpiL devices, bandwidth (only 100 kHz), on-chip insertion loss (grating coupler about 10 dB each), extinction ratio, electrode width, 800 C poling voltage (190 kV/cm only), anything in Supplementary Information.
- Judgment calls: `device_class = phase_shifter` (single waveguide, off-chip fiber reference arm, Fig. 4(d)); `drive = single_ended` and `vpi_convention = per_arm_phase_shifter` are derived (authors do not state); VpiL entered as `vpil_dc_vcm` (quasi-static 100 kHz sweep after poling); poling bias 60 V entered in `bias_for_vpi_v` for 700 C only; 360 Vpp kept in notes, not `drive_vpp_v`; `electrode_thickness_um` 0.3 is the Au layer only; r_eff about 20 pm/V in notes (no column). `waveguide_platform = bto_on_oxide_substrate` (closest enum).
- Grade B, no sim: electrode width needs Fig. 4(a); device is lumped and partially poled polycrystalline, outside the traveling-wave dielectric scope.
- Paper inconsistencies: "two orders of magnitude" loss reduction in abstract/conclusion vs 50 to about 20 dB/cm in the text; Fig. 4(f) caption says the 800 C curve is green while the legend shows 800 C red.
- CSV hints: `device_class_guess = other` replaced by `phase_shifter`; `sim_candidate = unknown` resolved to no; note "no metric extraction" outdated (metrics extracted).

## berman2026
- Status: distilled (mainly platform/nanophotonics, three small device rows). Rows: 1 paper, 3 devices, 1 evidence block. repro_grade C, sim config none.
- Rows: (a) racetrack resonator (tuning 5.428 pm/V, FSR 1.1 nm, loaded Q 605k, loss 0.447 dB/cm); (b) 600 um Fabry-Perot cavity (tuning 29.4 pm/V); (c) photonic-crystal band-edge modulator (3 dB 11 GHz, 6 dB 21 GHz, S21 to 25 GHz).
- Not reported: Vpi, extinction ratio, energy per bit, DUT geometry of the PhC and Fabry-Perot devices (wafer thickness 330 or 400 nm unstated), racetrack width, reference frequency of the S21 normalization, anything in the Supplementary Information (Figs. S1 to S4).
- Judgment calls: racetrack Q (605k loaded, 1534.14 nm, Fig. 1(c)) is not stated to be the tuning device (about 1631.5 nm) and is left out of `q_loaded` (notes only); racetrack loss 0.447 dB/cm entered as `derived` (extrapolation of Qi-derived losses, Eq. 2); racetrack wavelength 1631.5 nm read from Fig. 1(f) (approx) while Eq. (1) uses 1550 nm; 11 and 21 GHz carry `approx` (text "approximately/about"), basis measured although the trace is LOESS-smoothed; `bw3db_reference = unspecified`; no `bw_measured_to_ghz` (crossing observed inside the 25 GHz sweep); Fabry-Perot best Q 230k and the Fig. 4(g) Q 7k/14k bandwidths in notes only; r_eff 154 and 145 pm/V in notes (no column); FP resonance wavelength 1570.6 nm read from Fig. 3(e) (approx). `device_class = other` for FP and PhC rows.
- CSV hints: `device_class_guess = other` kept for the PhC and FP rows, racetrack row set to `ring`; `sim_candidate = unknown` resolved to no.

## nenezic2026
- Status: distilled (simulation/design workflow paper that reports predicted modulator metrics). Rows: 1 paper, 3 devices (Table I Cases 1 to 3), 1 evidence block. repro_grade C, sim config none.
- Reported (all simulated, Monte Carlo means): 7 mm Vpi 1.78 V, loss 0.3 dB, 139 GHz; 5 mm 2.25 V, 0.38 dB, 150+ GHz; 12 mm 1.025 V, 0.82 dB, 95 GHz. Wavelength 1310 nm, copper GSGSG on X-cut LN, bottom-electrode micro-transfer-printed LN on SiN.
- Not reported: geometries of the optimized designs (electrode gap, etch depth, widths, SiN plus oxide thickness; Fig. 1 gives only parameter names), RF loss, n_RF, meaning of the +- values, Vpi frequency, any measured data.
- Judgment calls: basis `simulated` throughout (wavelength and length `design_target`); Vpi is push-pull per the text, entered in `vpi_dc_v` with `vpi_convention = mzm_push_pull`; "150+" entered as 150 with `gt`; insertion loss entered as `il_onchip_db` with the paper's definition (propagation loss times L plus two tapers); +- values only in evidence notes and device notes; Design A/B (Fig. 4, nominal Vpi 1.79 and 1.73 V) not entered; mapping of Cases to Design C not stated. Author order follows the PDF byline (corrected after audit).
- No sim config: the optimized geometries are not disclosed in the main text, grade C.
- CSV hints: `sim_candidate = yes` not followed; `published_on = 2026-05-27` hint left empty per batch instruction.

## Organizations added (3)
Northwestern University (US, north_america); FIRST cleanroom of ETH Zurich (facility, CH, parent ETH Zurich) and NUFAB facility of the NUANCE Center (facility, US, parent Northwestern University), the latter two added in the 2026-10-03 audit corrections. Reused unchanged: ETH Zurich, Ghent University, imec.

## Blockers
None. Follow-ups: Supplementary Information of all three (falcone2026 Supplementary Notes 4 and Fig. S5; berman2026 Figs. S1 to S4; nenezic2026 simulation parameter ranges) could upgrade nenezic2026 and berman2026 and add the 800 C poling voltage.

## Audit corrections (2026-10-03)
Fresh-context Q1 audit resolved; per-finding table in `AUDIT_DISPOSITIONS.md`. Summary: berman2026-a `q_loaded` removed (605k belongs to a 1534.14 nm resonance, row is the 1631.5 nm device; kept in notes) and Fig. 4(b) plateau note added to the 11 GHz entry; falcone2026 loss basis aligned to `derived` (length fit) in evidence and `il_basis`; nenezic2026 authors reordered to the PDF byline and `il_onchip_excludes` emptied on the three rows; one cleanroom rule applied across p3_08 to p3_10 (acknowledged cleanroom used for the devices goes in `foundry_or_fab`): falcone2026 now lists Binnig and Rohrer Nanotechnology Center and FIRST cleanroom of ETH Zurich, berman2026 lists the NUFAB facility of the NUANCE Center (2 organizations added: 3 in total for the batch). Dry-run merge with p3_08 and p3_10: 0 conflicts, 0 validation errors.
