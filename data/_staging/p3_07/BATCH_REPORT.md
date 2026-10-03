# p3_07 batch report (lu2020, schwarzenberger2026, zwickel2020)

Updated 2026-10-02, verified_on 2026-10-02. Author verification only; not independently audited; not merged.
Dry-run merge: 3 papers / 6 device rows / 7 organizations / 3 evidence files; 0 conflicts, 0 validation errors.
No network, no git, no edits outside `data/_staging/p3_07/`. `text.md` and `figures/` were present for all three papers (no cache repair needed). A few page renders and figure crops were made in a scratch directory for reading only and are not stored.

## Status

| Paper | Status | Rows | repro_grade | Sim config |
|---|---|---|---|---|
| lu2020 | distilled | 1 paper, 1 device | C | none (silicon-polymer hybrid on a 40 nm silicon strip) |
| schwarzenberger2026 | distilled | 1 paper, 1 device | C | none (SOH) |
| zwickel2020 | distilled | 1 paper, 4 device rows (2 measured, 2 simulated/predicted) | C | none (SOH) |

No `needs_download.md`: all three sources are cached and readable.

## Source versions and rights

| Paper | Version the numbers come from | License / redistribution |
|---|---|---|
| lu2020 | Nature Communications version of record (9 PDF pages, published online 2020-08-24); Supplementary Information and the related correction (10.1038/s41467-020-18908-5) not cached and not read | CC-BY-4.0, verified in the cached PDF notice (p.9) and in Crossref (vor and tdm); `open_license_ok`. Note: `source.json` still says `restricted_local_only` (cache-policy default); the papers.csv value follows the verified license |
| schwarzenberger2026 | Publisher-formatted KIT repository copy of the JLT article (17 pages, IEEE 2026 notice); title and 22 authors match Crossref | License empty: Crossref lists only IEEE terms, no open license verifiable for this copy; `restricted_local_only`. `published_on` empty (Crossref 2026-02-01 is the print issue date of vol. 44 no. 3; early-access date not verified) |
| zwickel2020 | arXiv v1 (2001.02642v1, 27 pages); the Optics Express version of record (28(9) 12951, issued 2020-04-16) is not cached, so VoR numbers are not claimed and may differ. Preprint title begins "A verified ..." | License empty (unverified for the preprint), `restricted_local_only`; `published_on` empty |

## lu2020 ledger (device `lu2020-a`)

| Metric | Value | Basis | Locator | Convention / scope |
|---|---|---|---|---|
| Length | 8 mm | design_target | p.3; p.7 Table 1 | two 8 mm arms, 8 mm gold electrodes |
| Vpi | 1.8 V | measured | p.7 Table 1 | convention, frequency and drive not stated (`unspecified`); equals 1.44 V cm / 8 mm |
| Vpi*L | 1.44 V cm | measured | p.3 | at 1.55 um |
| 3 dB EO bandwidth | 68 GHz (approx) | measured | p.3; p.2 Fig. 1f | VNA limited to 70 GHz (`bw_measured_to_ghz` 70); curve starts near 0 dB, reference `dc` (derived); the 6 dB bandwidth is only "presumed over 70 GHz" and is not entered |
| Propagation loss | 2.2 dB/cm | derived (unit conversion of 0.22 dB/mm) | p.3; p.7 Table 1 | cited from Supplementary Note 5 |
| Z0 | 50 ohm | design_target | p.7 Methods | matched by design, not measured |
| Geometry | EO polymer 1 um; Si core 4 um x 40 nm; Au electrode 3 um x 16 um; sol-gel SiO2 3 um top and bottom | design_target | p.3; p.2 Fig. 1c; p.7 | Si thickness only in stack text |
| Data | 120 GBd OOK; 200 Gbit/s Nyquist PAM4 (100 GBd) | measured | p.3-5 Figs. 2, 3 | 200 Gbit/s below pre-HD-FEC only |
| Drive / energy | 1.3 Vpp; 42 fJ/bit | measured / derived | p.5-6; p.7 Methods | authors' (Vpp/2)^2/(B R) at 200 Gbit/s, 50 ohm; load energy only |

Judgment calls:
- One row. The 25-110 C data are link tests (Q factor, BER), not Vpi/IL/bandwidth points, so by convention (d) they stay in the notes; `temperature_class` is empty because the static measurement temperature is not stated.
- `electrode_type` is `other` (strip line over the arms with a bottom aluminum electrode and G-S-G probe pads); `waveguide_platform` is `other` (40 nm PECVD silicon strip).
- Internal inconsistency recorded: loss-efficiency product 3.6 V dB in the text (p.6) versus 3.2 V dB in Table 1 (p.7); 0.22 dB/mm x 14.4 V mm gives about 3.2. Neither is entered. The correction notice may address this; it is not cached.
- Not reported in the main text: insertion loss, extinction ratio, RF loss, n_RF, optical group index, 6 dB bandwidth, optical input power, Vpi measurement frequency, electrode gap.

## schwarzenberger2026 ledger (device `schwarzenberger2026-a`)

| Metric | Value | Basis | Locator | Convention / scope |
|---|---|---|---|---|
| Length | 0.28 mm | design_target | p.1; p.2 | phase-shifter sections; RF line 320 um |
| Vpi | 2.4 V | measured | p.6 | MZM push-pull (appendix p.15); measurement frequency/wavelength not stated |
| Vpi*L | 0.067 V cm | derived (unit conversion of reported 0.67 V mm) | p.1; p.6 | |
| 3 dB EO bandwidth | 74 GHz | measured | p.8; p.6 Fig. 3(c) | normalized to 70 kHz (`other`, 7e-5 GHz); 10 GHz moving average; 110 GHz photodiode, probe and cable removed; 50 ohm terminated |
| 6 dB EO bandwidth | 110 GHz, `gt` | measured | p.1; p.8 | beyond the 110 GHz range; `bw_measured_to_ghz` 110 |
| On-chip IL | 2.7 dB | measured | p.6 Fig. 3(a); p.7 Table I | includes 2 MMI, 2 converters, 3 mm access strip, 0.28 mm slot PS; excludes grating couplers (removed by a reference structure) and edge-coupler loss (about 3 dB per interface in the data run) |
| Phase-shifter loss | 32 dB/cm (3.2 dB/mm) | derived | p.7 Table I | 0.9 dB by subtraction over 0.28 mm; stored as propagation loss |
| ER | 38 dB static | measured | p.6 Fig. 3(a) | from fringes of the 40 um imbalanced MZM |
| Z0 | 49.2 ohm (approx) | simulated | p.6 | real part of the simulated line impedance, frequency not stated |
| Geometry | rail 240 nm (design), slab 75 nm and sidewall about 10 deg (TEM of a raw device), gap about 15 um, Al GSG | mixed | p.2; p.4-5 | other TEM values (rail 250 nm at the base, about 230 nm in caption, rail height 205 nm, slot 130/160 nm) in the stack text |
| Data | PAM4 204 GBd / 408 Gbit/s; PAM8 176 GBd / 528 Gbit/s; max net 412.5 Gbit/s (PAM8 160 GBd) | measured / derived | p.8-9; Fig. 5 | BER below the 20 percent SD-FEC limit; net rates are author calculations from FEC overheads (ref. 59) |

Judgment calls:
- Inconsistency in the paper: PAM6 maximum symbol rate is 180 GBd (465 Gbit/s) in the abstract/summary and 184 GBd (476 Gbit/s) in Sec. IV; both are quoted in `modulation_format`, `max_baud_gbd` uses the PAM4 value.
- The 3 um BOX appears only in the generic platform schematic Fig. 1(c), so `buffer_oxide_um` is empty. Foundry is "a commercial foundry", so `foundry_or_fab` is empty.
- The 13 dBm laser is not an on-chip power; drive amplitude and energy per bit are not reported. The simulated EO response and the interaction factor (0.185), in-device r33 (158 pm/V) are notes only.
- Not reported: RF Vpi, n_RF, group index, energy per bit, drive voltage, signal-electrode width/thickness, doping levels, foundry.

## zwickel2020 ledger

Equivalent-circuit modelling paper (distributed-element model of SOH slot-waveguide modulators). Device rows only where it reports measured or modelled modulator metrics.

| Row | Content | Basis | Locator |
|---|---|---|---|
| `zwickel2020-gate0` | 750 um MZM at Ugate 0 V: 3 dB BW about 3 GHz, 6 dB BW about 5 GHz, Z0 about 50 ohm, RF loss about 17 dB/cm at 50 GHz, ng 3.2 | extracted_from_figure (BW, loss); measured (Z0); simulated (ng) | p.13 Fig. 5(b); p.11 Fig. 4; p.9 Fig. 3; p.12 |
| `zwickel2020-gate300` | same device at Ugate 300 V: 3 dB BW about 20 GHz, 6 dB BW about 50 GHz, RF loss about 59 dB/cm at 50 GHz | extracted_from_figure | same |
| `zwickel2020-design-1mm` | design example: 1 mm, G'S 102 S/m, slot 200 nm, predicted f6dB 114 GHz | simulated | p.19 |
| `zwickel2020-design-0p5mm` | projected 0.5 mm design: f6dB above 100 GHz (`gt`), Vpi below 1 V (`lt`) | predicted | p.21; p.22-23 |

Judgment calls:
- Bandwidths are read from marker positions of Fig. 5(b) (three repeats each); the central values and the spread are in the notes. Reference is `other` with 0.04 GHz (the 40 MHz normalization, p.13). The red model curves are not entered as measurements.
- RF loss: the paper plots the amplitude coefficient alpha (1/mm) (power attenuation 2 alpha); converted with 8.686 x alpha x 10 mm/cm (derived list). The 50 GHz reading point was chosen here, reading uncertainty about 10 percent.
- Only the two extreme gate voltages (of 11 measured) are rows; the 500 um device was used only for electrical de-embedding.
- The 0.5 mm row is a projection from Figs. 11-12 and the summary; its Vpi bound rests on an external material assumption (ref. 16), which the paper states. Drop it if the audit prefers no non-computed projections.
- The paper text gives rail height 240 nm (p.19) but the Fig. 10 caption gives 220 nm; both recorded in the stack text.
- Not stated for the measured devices in this version: EO material, wavelength, Vpi, insertion loss, extinction ratio, electrode metal and dimensions, fabricator (AMO GmbH is an affiliation; KNMF appears only in funding). `foundry_or_fab` and `cladding` are empty.
- Not entered: circuit-fit parameters (Table 1 values are in the row notes only), design-map values in Figs. 6-9, 11-12, optical excess-loss bound.

## Organizations (7 new)

Kyushu University (identical to the row staged by p3_04, so the two batches merge without conflict), The University of Aizu, Tokai University, Nissan Chemical Corporation, SilOriX GmbH, AMO GmbH, University of Freiburg (present address, printed "University Freiburg"). Karlsruhe Institute of Technology already exists. Check at merge time that p3_04 is merged first or that the Kyushu University rows stay identical.

## CSV hint corrections

- lu2020: `device_class_guess other` is an MZM; `license` blank in the batch CSV, CC-BY-4.0 verified; `sim_candidate unknown` resolves to none.
- schwarzenberger2026: `published_on 2026-02-01` is only the Crossref print-issue date; left empty. `access open_access` kept (public repository copy).
- zwickel2020: `source_type journal` hint vs cached arXiv v1; the row follows the cached version (`arxiv_preprint`).

## What could not be read

- lu2020: Supplementary Notes 1-5 and Table 1, the correction notice; the plotted BER and Q curves were not digitized.
- schwarzenberger2026: no supplement referenced; plotted BER/AIR/NDR points (Fig. 5) not digitized beyond the numbers in the text.
- zwickel2020: the Optics Express VoR; Fig. 5(b) markers and Fig. 4 curves were read by eye from enlarged renders (uncertainty stated in the notes).

## Audit corrections (2026-10-03)
Q1 audit findings F16-F21 resolved; details in `AUDIT_DISPOSITIONS.md` (2 applied, 1 applied-adjusted, 1 rejected, 2 deferred to the coordinator: lu2020 correction notice, `source.json` redistribution sync). Row counts unchanged (6 rows, 3 evidence files). Changes: zwickel2020 `z0_ohm` basis derived (analytic asymptote) with corrected notes; zwickel2020-design-0p5mm `vpi_dc_v` (bound from an external material assumption) removed with its basis, convention, qualifier and evidence entry; `eo_material` evidence entries added on the four zwickel2020 rows (inferred from the SOH platform); bandwidth selection rule stated in notes. Dry-run merge: 0 conflicts, 0 validation errors.
