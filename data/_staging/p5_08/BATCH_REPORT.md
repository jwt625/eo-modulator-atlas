# Batch p5_08 report (2026-10-04)

All five papers: OFC 2026 conference papers, no crossref.json (identity from PDF page 1 and the batch row). license = publisher-copyright from the printed Optica footer (evidence context_values.license_notice), redistribution restricted_local_only, published_on empty, audit_status needs_audit, verified_on 2026-10-04. No sim configs (ring, EAM, SOH, polymer reflective, silicon: none eligible).

## sun2026 - distilled, 2 device rows, repro C, sim none
- Rows: sun2026-a (inverse-designed stable ring), sun2026-b (simple circular reference ring on the same wafer). Radii 5 and 10 um pooled.
- Entered: wavelength 1310 nm, 270 nm SOI and 200 nm etch (basis design_target), tuning_nm_per_v from Fig. 3(e) group means (0.0474 and 0.0426 nm/V, approx, labelled pm/V "phase efficiency" in the paper).
- Not entered: equivalent waveguide loss (differs by radius; evidence context only), the 2.5x/5x resonance-variation metric (no column), Q, FSR, circumference, IL, ER, bandwidth: not reported.
- Judgment: the reference row is included because it is a separately measured device.

## tatarczak2026 - distilled, 1 device row, repro C, sim none
- Review-style paper. Row tatarczak2026-a: 1310 nm InP diff-EML (Fig. 1a measured S21). bw3db about 100 GHz approx (trace crosses -3 dB near 100 GHz; text says "exceeding 100 GHz"), measured to about 110 GHz, reference DC. The 2.0 Vppd on 100 ohm is a stated requirement, kept as a context value (drive_vpp_v empty).
- Not entered: simulated 426 Gb/s eye (ER 4.9 dB, OMA 8.6 dBm, TDECQ 1.5 dB), link budget, driver and PD responses (not modulators). Fig. 1a is labelled measured; the paper does not say whether it was published earlier, so no results_from_prior_paper tag.

## tiberi2026 - distilled, 2 device rows, repro C, sim none (revised 2026-10-04 after audit)
- Rows: tiberi2026-c (40 um O-band) and tiberi2026-d (100 um O-band). The former C-band rows a and b were dropped: the 67 GHz S21 (Fig. 2(b)) and Table 1 C-band rows re-report tiberi2025 Fig. 9(b) and Table IV (filtered columns).
- tiberi2026-c keeps only new content (static O-band ER about 2 dB at 1310 nm, Table 1 BER and eye ER); the 40 Gb/s rate cells are empty because tiberi2025-c carries that point.
- Static C-band ER about 3.5 dB, about 3 Vpp and under 100 fJ/bit are context values (tiberi2025 states about 7 V and 58 fJ/bit for the same BERs).
- New org: CORNERSTONE (facility, GB from the Southampton-hosted URL in tiberi2025 Ref. [103]; no address printed in tiberi2026).
- Not reported: IL, Vpi, 100 um static/S21/wavelength.

## karakida2026 - distilled, 1 device row, repro C, sim none
- Row karakida2026-a: 30 um Au/OEO(JRD1)/Au Fabry-Perot surface-reflective modulator, device_class other. 4-page PDF (page 4 is the poster; its conference date is not entered as published_on).
- bw3db 40 GHz basis derived (authors derive it from a fit); the measured trace also crosses -3 dB near 40 GHz; measured to 70 GHz; reference dc (trace flat from 0.01 GHz). Wavelength 1515 nm (IL/ER); S21 at 1532 nm (noted).
- IL 3.0 dB entered as il_onchip_db with includes/excludes spelled out (reflection loss vs reference Au mirror; free-space optics excluded, inferred). ER 2.0 dB static at 10 V swing. tuning 0.30 nm/V and Q about 40 basis derived.
- Not entered: r13/r33 (context), 4.1 dB polarization-independent ER at 20 Vpp (poster, context), simulated bandwidth vs size.

## kholeif2026 - distilled, 1 device row, repro C, sim none
- Row kholeif2026-a: SOH racetrack, 2 x 86 um slot phase shifters, 200 Gb/s PAM4 at 220 mVpp. IL 0.74 dB on-chip (caption says 0.75), ER 18.6 dB, Q 12 900 (fit, derived), fiber-to-fiber about 13.75 dB in operation, 18 fF (author estimate), 0.0128 fJ/bit (12.8 aJ, derived; Sec. 3 text says 13 aJ).
- Text conflict: NDR 152 Gb/s (text, matches plot) vs 160 Gb/s (Fig. 1 caption); entered 152.
- Shifting efficiency 25.5 GHz/V and FSR 279.5 GHz are stated in GHz only; nm cells left empty, conversions removed (derived list empty). No EO bandwidth reported.
- OEO material not named; foundry not named.

## Other
- New orgs: NVIDIA Corporation (company, US), CORNERSTONE (facility, GB). All other orgs reused exactly (Coherent Corp., University of Cambridge, National Inter-University Consortium for Telecommunications, CamGraPhIC srl, The University of Tokyo, Takeda Sentanchi Super Cleanroom, Karlsruhe Institute of Technology, SilOriX GmbH).
- Validation: merge_staging dry run, 0 conflicts, 0 validation errors.
