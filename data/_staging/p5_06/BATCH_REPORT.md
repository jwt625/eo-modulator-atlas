# p5_06 batch report (verified_on 2026-10-04)

Papers: bhasker2026, oe2026, ohata2026, okuda2026, theurer2026 (OFC 2026, 3 pages each, EML / EAM). Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 4 device rows after audit corrections, 3 new organizations, 5 evidence files). All papers rows `audit_status: needs_audit`, `repro_grade` C (ohata2026 empty), no sim configs (InP EAM). No `crossref.json` for any paper: identity from PDF page 1 and the batch row. License `publisher-copyright` from the page footer (c) 2026 Optica Publishing Group, `restricted_local_only`, `published_on` empty (no date printed). No cache repair.

## bhasker2026
- Status: distilled. 1 row (differential-drive lumped-electrode EML, wire-bonded CoC, 55 C): bw3db about 83 GHz, bw6db about 99 GHz, dynamic RF ER 3.8 dB, 160 GBd PAM4 (320 Gb/s) and PAM6 (413 Gb/s), 1.5 Vppd, wavelength about 1314 nm.
- Not reported: modulator length, MQW design, geometry, IL, optical input power.
- Judgment calls: static ER over 30 dB (Fig. 2) kept in notes because one ER column holds the dynamic headline. Intro says PAM4 360 Gbit/s; abstract, body and figure say 320 (160 GBd); 320 used. `foundry_or_fab` = Broadcom Inc. from the acknowledgement (Breinigsville PA operations team, fab support). Simulated flip-chip/wire-bond S21 curves not entered.

## oe2026
- Status: distilled. 1 row (tandem dual-EAM differential EML): bw3db 80 GHz at -1.7 V bias, 113.4375 GBd PAM4, 2.0 Vpp differential, ER 5.2 dB, TDECQ 1.28 dB, 1311.1 nm.
- Not reported: modulator lengths (EA1 stated longer than EA2), geometry, fab, IL, line rate.
- Judgment calls: 150 ohm differential termination, static ER 22 dB, CMRR and return loss in notes. Line rate left empty (stated only as 113 Gbd PAM4).

## ohata2026
- Status: papers row only, NO DEVICE ROWS (audit F1, coordinator decision). Invited review-style paper: 106 GHz bandwidth and 340 Gb/s PAM4 / 450 Gb/s PAM6 eyes are cited to ref 8 (Okuda et al., OFC 2025 Tu2J.7); 110 GHz flip-chip bandwidth to ref 10 (Masuyama et al., ECOC 2025 W.01.02.3). `repro_grade` empty (audit F2).
- Primary papers (refs 8, 10) are not in the atlas; candidates to queue.

## okuda2026
- Status: distilled. 1 row (dual series-connected high-mesa EAMs, differential drive, 55 C CoC): bw3db above 100 GHz (no crossing), 180 GBd PAM4 360 Gb/s BtB TDECQ 3.3 dB, 1.5 Vppd, 1.31 um.
- Not reported: EAM length, geometry, MQW, substrate, fab.
- Judgment calls: `bw3db_ghz` 100 `gt` with `bw_measured_to_ghz` 100 (trace ends at the axis limit near -1.7 dB); ER approximately 4 dB from text (Fig. 3(a)); TDECQ points for 170 GBd and 500 m / 2 km in `modulation_format`.

## theurer2026
- Status: distilled. 1 row (80 um EAM of one channel of the 4-channel uncooled EML array): bw about 65 GHz, static ER up to 12 dB, 145 GBd PAM4 (290 Gb/s) BER below 3.8e-3, 140 GBd over 11 km, 25 to 85 C uncooled, 1.2 Vpp.
- Not reported: wavelength (O-band only), fab, EAM geometry beyond length, IL.
- Judgment calls: text says "bandwidth approximately 65 GHz" without stating the 3 dB level; entered as bw3db `approx` with `bw_measured_to_ghz` 67 `approx` (Fig. 2(c), |S21|^2 relative). Static ER 12 dB is the maximum of the plotted range (approx). `drive` single_ended is a derived entry (GSG for single-side drive). 770 Gb/s/mm, crosstalk, SOA and DFB lengths in notes.

## Conventions followed
Values from the authors' earlier work (e.g. 20 GHz improvement vs previous work, 200 Gb/s/mm and 312 Gb/s/mm prior arrays, single-ended EML comparisons) are not entered; system totals not placed on single-device rows. CSV hints (platform inp_mqw, class eam) confirmed; Fraunhofer Heinrich Hertz Institute and Technical University Berlin reuse existing organization names.
