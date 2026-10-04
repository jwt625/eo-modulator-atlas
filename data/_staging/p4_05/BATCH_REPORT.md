# p4_05 batch report (verified_on 2026-10-04)

Papers: derose2012, dong2026, liu2026b, wang2026a, yue2025. All silicon plasma-dispersion MZMs: database rows only, no sim configs (repro_grade C for all). Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 11 device rows, 1 new organization, 5 evidence files). All papers rows `audit_status: needs_audit`. `crossref.json`, `text.md`, `figures/` present for all five; no cache repair.

Version note: yue2025 numbers come from arXiv v1 (2410.09816v1, no supplement cached); the Optica version of record (Optica 12(2) 203) was not read. The other four are the conference papers themselves.

## derose2012
- Status: distilled. 1 paper, 3 devices (`drive` series_push_pull, derived, after the audit; -a 0.5 mm 24 GHz, -b 1.5 mm 14 GHz, -c 2 mm Vpi*L 0.7 V cm), grade C, no sim.
- Not reported: wavelength, Vpi, IL, ER, electrode gap, fab name, doping beyond approx 5e18.
- Judgment calls: bandwidth values are stated in text; Fig. 2(a) overlays fit curves on measured traces and the paper does not say which the number is read from (basis measured, note). Vpi*L put in `vpil_dc_vcm` although DC vs RF and per-arm vs MZM-level are not stated; `vpi_convention` unspecified. 50 ohm match and velocity matching are design conditions, so `z0_ohm`/`n_rf` empty (95 ohm unloaded line, n 2.3, group index 4.5 in notes). `integration` monolithic (no foundry named), `waveguide_platform` soi_rib from the Fig. 1 cross-section.
- CSV hints: fine. `published_on` empty (Crossref gives 2012-05 only). License publisher-copyright from the p.1 notice.

## dong2026
- Status: distilled. 1 paper, 1 device, grade C, no sim. New organization: Coherent Corp.
- Not reported: length, VpiL, wavelength, IL, on-chip power, fab, platform detail, baud (PAM4 420 Gb/s = 210 GBd by arithmetic, in notes only).
- Judgment calls: Vpi 7 V is the authors' effective Vpi (VpiL / length, neither given): `derived`, approx, DC vs RF unstated. `bw3db_ghz` 70 `gt` with measured-to 70 read from the Fig. 1 axis end; the trace dips to about -3.6 dB near 69.5-70 GHz (last point about -2.9 dB), so >70 GHz is marginal (noted); `bw3db_reference` dc (derived). 420 Gb/s has BER 8e-2 (not FEC-compliant); ER 3.71 dB dynamic at 420 Gb/s. 75 ohm target differential impedance not entered (design target). `waveguide_platform`/`integration` left empty (not stated).
- CSV hints: fine.

## liu2026b
- Status: distilled. 1 paper, 1 device (serpentine segmented, 3 x 950 um, O-band), grade C, no sim. Existing organization name used for Xi'an Institute of Optics and Precision Mechanics.
- Not reported: total length, wavelength, electrode metal and dimensions, drive amplitude, optical power, BER.
- Judgment calls: `length_mm` left empty (total not stated; 3 x 0.95 = 2.85 mm is consistent with 1.14 V cm / 4 V; stated in the row notes only). Vpi 4 V `measured` (average of two single-junction bypass measurements, -2 V bias), VpiL 1.14 `derived`. Bandwidth: measured only to 67 GHz (67 GHz PNA/probe); `bw3db_ghz` 67 `gt` = measured-to value, no crossing. The authors' "3 dB bandwidth >100 GHz at -2 V" is an inference beyond the measured range and is not entered. IL 9 dB entered as `il_onchip_db` with exclusions stated as not given (paper only says measured insertion loss, spectra through grating couplers).
- CSV hints: fine.

## wang2026a
- Status: distilled. 1 paper, 2 devices (-a C-band 81.8 GHz, VpiL 2.3; -b O-band 59.5 GHz, VpiL 1.36), grade C, no sim. Existing organization name Advanced Micro Foundry used.
- Not reported: wavelength of -a, effective length of -b, ER of -a, doping, electrode dimensions, optical power, BER for any eye.
- Judgment calls: VpiL `measured` (extracted from phase shift vs bias in spectra), Vpi 10.2 V and 6 V `derived`, approx. `length_mm` 2.25 (effective) for -a; -b empty (Table I lists 2.5 mm, the total length). IL 2.6 / 2.45 dB from Table I entered as `il_onchip_db` with exclusions stated as not given. Bandwidths 81.8 and 59.5 GHz are crossings on traces measured to 110 GHz (axis end, extracted_from_figure); reference `dc` derived. 50 ohm is a design value, not entered. Eye-only results (PAM-8 100 and 112 GBd); drive 2.5 V approx from AWG, set by the setup.
- CSV hints: fine.

## yue2025
- Status: distilled. 1 paper, 4 rows (-a TFT m=1 at 6 V; -b conventional m=0 at 6 V; -c, -d the same two devices at 0 V bias), grade C (doping and electrode thickness not stated), no sim.
- Not reported: wavelength, optical power, doping, electrode thickness, Z0, RF loss, Vpi/VpiL for m=0, Vpi bias, supplement (S1-S5) content.
- Judgment calls: papers row follows the arXiv pattern (source_type arxiv_preprint, arxiv_id 2410.09816v1, year 2025 as the journal year, published_on empty, license empty, restricted). `bw3db_ghz` 110 `gt`, measured to 110 GHz (no crossing; response about -1 dB at 110 GHz, eo_rolloff 1 dB approx). m=0 bandwidth 70 GHz taken as stated; my reading of the Fig. 5(b) trace gives about 65 to 70 GHz (noted). 0 V bias bandwidths (43.1, 81.9 GHz) are separate operating-point rows -c and -d (stated as measured values on the same Fig. 5(b), same DC-normalized reference); IL, ER, loss left empty there because their bias is not stated. Vpi 54 V `author_estimate` (paper says estimated), Vpi*L 4.86 V cm `derived` from Table 2 (S4 not cached). Length 0.9 mm = Table 2 total. IL 4.3 and 2 dB entered as `il_onchip_db`; grating couplers (about 4.8 dB each) listed separately, so exclusion is inferred and flagged. Propagation loss 4.2 dB/mm converted to 42 dB/cm (derived entry). Series push-pull for m=0 inferred from NPN doping (derived).
- CSV hints: batch hint year/published_on 2025-02-06 is the journal issue date; row follows the arXiv convention. Access/license in the batch hint (open_access, Optica-OA-License) refer to the journal version.
