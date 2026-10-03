# p3_02 batch report (distiller, 2026-10-02)

Papers: churaev2023, vanackere2023, liu2023, wu2025, celik2022. Totals: 5 papers rows, 10 device rows, 10 new organizations, 5 evidence files, 2 sim configs.
Validation: `uv run python scripts/merge_staging.py data/_staging/p3_02` reports 0 conflicts, 0 validation errors (merge counts: papers 5, devices 10, orgs 10, evidence 5). Dry run only; nothing applied.

## Cache repair (references/<id>/)
`text.md` and `figures/` were missing for all five papers (git-ignored local artifacts; only `source.pdf`, `source.json`, `crossref.json` were present). They were regenerated from the existing `source.pdf` with the repo's own extraction function (no network). `source.json` was restored to its original content afterwards (the extractor would have overwritten the tracked version metadata). No re-fetching.

## Per paper

| Paper | Status | Rows | Grade | Sim config | Version used |
|---|---|---|---|---|---|
| churaev2023 | distilled | 3 devices (a: 4 mm PM 38 percent, b: 4 mm PM 52 percent, c: 21 GHz ring EO comb) | B | sims/churaev2023/config.yaml (device a; not runnable, constants missing) | Nature Communications version of record |
| vanackere2023 | distilled | 1 device (2 mm micro-transfer-printed MZM) | B | sims/vanackere2023/config.yaml (one phase section; not runnable) | APL Photonics version of record (Ghent copy of the published article) |
| liu2023 | distilled | 4 devices (one per WDM channel, FP-cavity resonators) | C | none (resonator) | Light: Advanced Manufacturing version of record |
| wu2025 | distilled | 1 device (6.4 mm Si-TFLN BEOL MZM) | C | none (grade C) | arXiv v1 (2512.07196v1), NOT the journal version |
| celik2022 | distilled | 1 device (3 mm MZI, LN on sapphire, 780 nm) | B | none (lumped RC electrode, not traveling-wave) | arXiv v1 (2204.03138v1), NOT the Optics Express version |

### churaev2023
- Pages read: all 9 (text.md); Fig. 1 page render and the embedded Fig. 1 image viewed (Fig. 1h curves and labels, Fig. 1i FEM drawing used to digitize the Si3N4 width 1.5 um and electrode thickness 0.6 um).
- Entered: Vpi 22 V and VpiL 8.8 V cm (approx, derived by authors) for the 38 percent device; VpiL 5.6 V cm (figure label; text says approximately 6) for the 52 percent device; geometry (LN 300 nm, gap 6 / 5.5 um, x-cut, stack). Ring row: 1552 nm comb center, 8.5 dB/m (0.085 dB/cm, best-case Q 4.5e6, derived).
- Not reported (empty): measurement wavelength, electrode width/thickness/length, RF behaviour, Si3N4 width of the EO devices (range 1.0-2.0 um only), loaded Q and ring length, device b Vpi.
- Judgment calls: row b left without `vpi_dc_v` (Vpi is only inferable as 14 V); `electrode_metal` kept as "tungsten or gold (not stated per device)" because the text and Methods disagree with Fig. 1g; photonic-dimer tuning 30 MHz/V and EO-comb phase modulation 0.14 pi go to notes (no columns); passive platform results (8.5 dB/m, taper < 0.1 dB, splitter) not rows. Supplementary Information (SI sections IV, VII) not available.
- CSV hint check: identity, platform and year correct; the CSV note "abstract reports no EO metrics" is right (EO numbers are in the body).

### vanackere2023
- Pages read: all 8 (cover page 1 plus article pages 2-8); page renders of Figs. 1-5 viewed.
- Entered: Vpi 14.8 V (MZM push-pull), IL 3.3 dB with includes/excludes, ER 39 dB static, 3 dB bandwidth > 50 GHz (measured to about 55 GHz, noise floor), Z0 about 100 ohm (differential), RF loss about 2 dB/mm, geometry, 70 Gb/s NRZ, 4.4 Vpp at 56 Gb/s.
- Not reported: on-chip optical power (laser output 20 mW only), n_RF and ng numeric values (plotted only), fiber-to-fiber loss as a single number, fabricating facility, S+/S- gap and ground widths of the GSSG line, active electrode length separate from the 2 mm coupon.
- Judgment calls: `drive` = push_pull as stated by authors (high-speed drive is differential via GSSG; low-speed sweep polarity not stated); VpiL left empty because the authors give only simulated 6.0 / 3.0 V cm (the build step derives 2.96 V cm); `rf_loss_freq_ghz` left empty ("over 10 GHz" is a plateau, not a point).
- CSV hint check: `platform lithium_niobate`, `device_class other` -> actual class is an MZM; license blank in CSV, CC-BY-4.0 verified in Crossref and the article notice; priority/sim_candidate unknown -> grade B with a (non-runnable) sim config.

### liu2023
- Pages read: all 10; page renders of Figs. 3-5 viewed (Fig. 4 spectra, Fig. 5 eye diagrams).
- Entered per channel: design wavelengths 1531/1551/1571/1591 nm (3D-FDTD, basis simulated), Q 5450/6160/6180/6450, FSR about 7 nm, ER > 20 dB (static), photon-lifetime bandwidth 36/31/31/29 GHz (basis derived, f0/Q), tuning 9.6 pm/V, C approx 21.1 fF, 11.9 fJ/bit at 1.5 Vpp, excess loss 0.4 dB (ch 1) and 0.8 dB (ch 4), rates (80 Gb/s OOK; 100 Gb/s PAM4 for channels 1-3).
- Not reported: measured EO bandwidth (only the Q-limited estimate), Vpi, per-channel loss for channels 2 and 3, electrode length/width, operating wavelength offsets, which channel the 9.6 pm/V applies to, on-chip power.
- Judgment calls: one row per channel (Q, bandwidth, loss, eye quality differ); 9.6 pm/V assigned to all four rows (single value in the paper); channel-4 line rate entered as 80 Gb/s because its PAM4 eye is described as worse, although the abstract claims 4 x 100 Gb/s; dynamic ER at 40 Gb/s (about 3 dB) kept in notes because `extinction_ratio_db` holds the static > 20 dB; `device_class` other (Fabry-Perot cavity); `rib_width_nm` = effective MWG width W (2 um), top width not stated.
- CSV hints: `device_class other` correct; license blank in CSV -> CC-BY-4.0 from the paper's own notice (Crossref has none); `published_on` 2023 -> 2023-05-29 (paper p.9).

### wu2025 (arXiv v1 numbers)
- Pages read: all 15 (main text pp.1-12, references; no Supplementary Information in the PDF); page renders of Fig. 1 and Fig. 3 viewed. Figures 4-6 (Ge PD, link) read from text/captions only.
- Entered: 6.4 mm, Vpi 4.4 V, VpiL 2.8 V cm (authors), 3 dB EO bandwidth about 100 GHz (measured to 110 GHz), IL 4 dB, ER > 25 dB, 128 GBd OOK / 100 GBd PAM4 link results, TFLN 500 nm, ridge width 2.5 um, stack.
- Not reported in the cached version: ridge etch depth, electrode gap/widths/thickness, Z0, n_RF, RF loss, wavelength of the measurements, on-chip power, energy per bit, drive amplitude at the modulator (AWG Vpp only). Supplementary Sections I and II are referenced but absent.
- Judgment calls: grade C and no sim (dimensions only in the missing SI); `max_line_rate_gbps` left empty (200 Gb/s PAM4 is not stated by the authors; the earlier orphan derived entry was removed, see Audit corrections); `foundry_or_fab` empty (CUMEC supplied the PDK; fabricator of the device not named); `published_on` empty (arXiv posting date unverifiable offline; Crossref journal date 2026-05-25); `year` 2026 follows the CSV/Crossref although paper_id is wu2025; authors in the preprint order.
- CSV hints: `published_on 2025-12-08` not verifiable (PDF creation date only); `license` hint "journal=Wiley VoR; arxiv=nonexclusive" not transferred to the cached preprint.

### celik2022 (arXiv v1 numbers)
- Pages read: all 10; page renders of Fig. 2 and Fig. 4 viewed.
- Entered: 3 mm MZI at 780 nm, Vpi 4.2 V, VpiL 1.26 V cm (authors), 3 dB bandwidth 2.7 GHz (DC plateau reference), ER 27 dB static, propagation loss 1.6 dB/cm (derived from ring Qi by authors), 1 mW (0 dBm) optical power in the waveguides (derived unit conversion; CSV cell filled in the audit corrections), geometry (200 nm LN, 100 nm slab, 100 nm etch depth derived, 800 nm top width, 750 nm SiO2, 200 nm Al, sapphire); the 12 deg etch angle is not entered (axis unstated).
- Not reported: insertion loss, electrode-electrode gap (only a 1 um waveguide-to-electrode gap), signal width, energy per bit, system data rate, fabricator names beyond the Stanford facilities.
- Judgment calls: `electrode_type` lumped as derived (authors use an RC model); no sim config because the electrode is lumped, not traveling-wave, even though geometry grade is B; sidewall angle reference axis unstated (12 deg not entered after the audit). The co-author list includes Wentao Jiang.
- CSV hints: `published_on 2022-04-07` confirmed from the arXiv stamp; CSV note "2.7 GHz lumped-type response" confirmed.

## Cross-cutting
- No needs_download entries (all five sources had a PDF).
- See SPEC_PROPOSALS.md for schema/SPEC gaps.
- Wentao Jiang is a coauthor of celik2022: flag for any independence rule in audits.

## Audit corrections (2026-10-03)
Applied after the fresh-context audit Q1 (p3_01 and p3_02); per-finding table in `AUDIT_DISPOSITIONS.md`. Dry-run merge after the corrections: 0 conflicts, 0 validation errors.
- liu2023: `foundry_or_fab` emptied and the Westlake Center for Micro/Nano Fabrication organization row dropped (facility thanked only; 9 organizations now); `sidewall_angle_deg` entered as 60 deg from the substrate plane (derived from the stated 30 deg from vertical); `slab_thickness_nm = 200` written to the CSV (derived); `il_onchip_*` notes now say the 0.4 / 0.8 dB are excess losses of the filter-plus-modulator path with the Fig. 4(b) normalization unstated; `discovered_via` set to `web;assigned`.
- celik2022: `sidewall_angle_deg` (12 deg, reference axis not stated) removed from the CSV and evidence; `etch_depth_nm = 100` and `optical_input_power_dbm = 0` written to the CSV (both derived, so the report claim about the 0 dBm entry is now true).
- wu2025: orphan derived `max_line_rate_gbps = 200` removed; the CSV cell stays empty.
- churaev2023: row c notes state that 8.5 dB/m is the best resonance with unstated wavelength (1552 nm is the comb centre); row b `vpil_dc_vcm` basis changed from `derived` to `extracted_from_figure`; sim provenance records the Fig. 1i scale-bar conflict and the electrode classes are now `project_inference`. Config not re-run (declared not runnable; edits are provenance text only).
- vanackere2023: `discovered_via` set to `web;assigned`; row notes add the coupon-length meaning of `length_mm` and the frequency dependence of Z0 and attenuation in Fig. 3(a).
- Cross-batch organization duplicates are listed in `AUDIT_DISPOSITIONS.md` for the coordinator.
