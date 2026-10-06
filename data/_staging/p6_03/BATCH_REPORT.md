# Batch p6_03 report (2026-10-05)

Papers: chen2023 (NEW), mao2022 (NEW), boynton2020 (FIRST SOURCE), han2023 (REPLACE, VoR + Supplementary Materials).
Dry run (after audit corrections, see AUDIT_DISPOSITIONS.md): `uv run python scripts/merge_staging.py data/_staging/p6_03 --replace-paper-ids boynton2020,han2023` -> counts papers 4, devices 6, orgs 0, evidence 4; conflicts 0; validation errors 0.
All four papers have `audit_status: needs_audit`. No new organizations (all affiliations and facilities exist in data/organizations.csv). `organizations.csv` in staging is header-only.

## Per paper

| paper | status | rows | repro_grade | sim config |
|---|---|---|---|---|
| chen2023 | distilled | 1 (chen2023-a) | B | sims/chen2023/config.yaml |
| mao2022 | distilled | 1 (mao2022-a) | B | sims/mao2022/config.yaml |
| boynton2020 | distilled (first source, cache_status full_extract) | 1 (boynton2020-a) | B | sims/boynton2020/config.yaml |
| han2023 | distilled (REPLACE) | 3 (han2023-a reused id, han2023-b and han2023-c new) | B | none (silicon) |

### chen2023 (Nanophotonics 12(18) 3603, CC-BY-4.0 from crossref.json + paper notice)
- Row: slow-light coupled-Bragg-resonator TFLN MZM (N 20, P 20, W 0.4 um, delta 0.24 um). vpil_dc 1.29 V cm (approx, derived by the authors from 15.7 pm/V fringe shift, DC 0-40 V), EO bandwidth >50 GHz (bw3db 50 with gt; measured to 50 GHz; three wavelengths 1557.43-1565.24 nm entered as one cl_band row), dynamic ER about 2 dB, 8.5 Vpp drive, OOK 64 and 80 Gbit/s with BER thresholds, ng about 4.0 (derived from FP FSR), n_RF 2.18 (simulated).
- length_mm empty: about 370 um (abstract, p.4, p.8 conclusions) versus 360 um (Table 1, p.8), per convention (y).
- Not entered: passive slow-light waveguide results (IL 2.9 dB, ng 7.5; the fitted 0.0133 dB/um at ng 4.00, same design as the MZM, is entered as prop_loss_db_per_cm 133 after audit N4), simulated VpiL about 1.25 V cm and about 160 GHz bandwidth (design stage).
- Not reported: Vpi in volts, MZM insertion loss, static ER, optical input power, temperature, operating wavelength of the DC and data measurements, ground width, fabrication facility.
- Judgment calls: Vpi convention `resonance_tuning_derived` (VpiL computed from the 15.7 pm/V fringe shift, convention q; corrected after audit N1); tuning_nm_per_v 0.0157 entered for the MZI fringe shift; electrode gap 5.3 um and width 16 um are simulation settings (design_target), fabricated values not stated.
- CSV hints: platform lithium_niobate confirmed; device_class guess `other` corrected to mzm; sim_candidate `unknown` resolved to B with a limited config (uniform rib cross-section only).

### mao2022 (APL Photonics 7, 126103, CC-BY-4.0)
- Row: 6.0 mm a-Si-loaded unetched TFLN push-pull MZM. Vpi 3.2 V (10 kHz triangle, 5 Vpp), VpiL 1.9 V cm (derived, Vpi x 6.0 mm), static ER 17.9 dB, bw3db 60 GHz (VNA to 70 GHz), on-chip IL 2.7 dB (author estimate, device_total, fiber coupling about 4 dB/facet excluded), propagation loss 1.5 dB/cm (cut-back), r_eff about 31 pm/V (derived, Eq. 2), 1.8 Vpp drive, OOK 84/100 and PAM4 168/200 Gbit/s with BERs, simulated Z0 about 44 ohm, n_RF about 2.34, ng 2.62.
- published_on 2022-12-02 (Crossref published-online).
- Judgment calls: orientation entered from Fig. 1 axes (text p.3 says lateral confinement along Y); "width of 16 um and spacing of 6.0 um" read as signal width and gap; max_baud 100 GBd derived from 100 Gbit/s OOK.
- Not reported: optical input power, bias point of the Vpi sweep, temperature, fab site, RF loss, energy per bit, ground widths.

### boynton2020 (Optics Express 28(2) 1868; license record Optica-OA-License-v1, redistribution restricted_local_only)
- Row: 5 mm bonded x-cut TFLN over SiNx/SiO2/Al CPW (Sandia MESA CMOS fab), push-pull MZM, 4 um gap. Vpi 13.34 V (Fig. 7(b)) and VpiL 6.67 V cm at 50 kHz, 1551.64 nm; bw3db 30.55 GHz (VNA, crossing observed); fiber-to-fiber IL 13.4 dB (Table 2; text says 13 dB); static ER above 20 dB (1500-1600 nm); simulated ng 2.051; Z0 50 ohm design.
- Affiliation from the paper (p.1): Sandia National Laboratories, Albuquerque, USA (Crossref has none).
- Not entered: simulated VpiL 4.88 V cm, overlap 19.03 percent, neff 1.757, Fig. 10 predictions; SFDR (no column; text 94.162 versus Tables 3/4 96.65 / 96.7 dB Hz^2/3).
- Not reported: chip-level optical power, on-chip IL, temperature, bias of the Vpi sweep, propagation direction in the crystal.
- CSV hint: title says silicon photonic; the waveguides are SiNx (paper Table 1 'Hybrid SiNx/TFLN'), so platform entered as lnoi_loaded_sin. Hint values 30.6 GHz and 6.7 V cm agree with abstract rounding.

### han2023 (Science Advances 9(42) eadi5339 VoR + Supplementary Materials; CC-BY-NC-4.0 from the paper's notice; restricted_local_only)
- han2023-a (Device A, Np 20, Nr 10, 124 um) re-distilled; han2023-b (Device B, Np 20, Nr 20, 249 um) added with only IL 10.5 dB (supplement S5), scope undefined. Devices C and D have no EO or IL metric (spectra, electrical S21 only): no rows.
- published_on stays 2023-02-07 (arXiv v1, earliest); access changed arxiv -> open_access (VoR is CC BY-NC).

#### REPLACE differences versus canonical han2023-a (arXiv-based, 2026-10-02)

BER/FEC statement (the field the brief asks about)
- Source phrase, VoR p.6: BERs "can drop well below the hard-decision forward error coding (HD-FEC) threshold (3.8e-3) under the data rate of 98 Gbps and below the soft-decision forward error coding (SD-FEC) threshold (2e-3) when up to 112 Gbps (~93-Gbps net rate)". The arXiv text had the same two sentences without the net rate.
- New VoR evidence: Table S2 (supplement p.15) gives exact BERs at 1550 nm: 1.86e-5 (70), 9.85e-5 (84), 2.17e-3 (98), 1.64e-2 (112 Gb/s); other wavelengths at 98 Gb/s are 7.14e-3 to 4.07e-2 and at 112 Gb/s 2.99e-2 to 8.47e-2. Fig. 4(I) and Fig. S17(D) legends read "7% FEC" and "20% FEC" (about 3.8e-3 and about 1.5e-2).
- Result: the text claim is NOT supported. 98 Gb/s is below 3.8e-3 only at 1550 nm (2.17e-3, not "well below"); 112 Gb/s best BER 1.64e-2 is above the quoted 2e-3 SD-FEC value and marginally above the 20 percent FEC line. The "~93 Gb/s net rate" is therefore not entered (max_net_rate_gbps empty, claim recorded in notes and the modulation_format text); max_line_rate_gbps 112 stays the demonstrated rate, not an FEC-compliant one.
- modulation_format: canonical "best BER about 1.7e-2 (Fig. 4(h), figure read)" -> exact 1.64e-2 from Table S2 at 1550 nm; HD-FEC compliance statement now reads: at 1550 nm 70, 84 and 98 Gb/s are below 3.8e-3, and at 98 Gb/s no other wavelength is (7.14e-3 to 4.07e-2) (reworded after audit N2).

Other fields whose value, basis, qualifier or locator differs
| field | canonical | now | deciding source |
|---|---|---|---|
| vpi_dc_v | empty ("not reported") | 78 V, basis derived | supplement p.8 S6: "half-wave voltage of 78 V based on a length of 124 um" (sinusoidal fit, Fig. S4) |
| vpil_dc_vcm | empty | 0.96 V cm, derived | supplement p.8 S6: "modulation efficiency is obtained as 0.96 V*cm" |
| vpi_basis, vpi_convention | empty | derived, unspecified | S6 gives no arm convention; efficiency factor is bias dependent |
| drive_vpp_v | empty ("not reported") | 5 V, measured | VoR p.8: "amplified by a commercial driver (SHF S807C) to obtain a 5-V Vpp"; supplement p.13 "differential signals Vpp of 5 V" |
| driver | "no electrical amplifier stated" | SHF S807C added | VoR p.8 |
| bw3db_reference | dc (derived) | low_freq_unstated | convention (t): normalization point not stated (Fig. 4(D) curve starts near 0 dB) |
| il_onchip_scope | undefined | device_total | VoR p.5: loss extracted against the coupling fibers, grating-coupler pair (5 dB each, about 10 dB) excluded |
| il_onchip_excludes | "per coupler or per pair not stated" | pair, 5 dB each | VoR p.5 |
| il_onchip_includes | "3 dB couplers" | "directional couplers" | VoR p.5 wording |
| prop_loss_db_per_cm | empty | 298 (29.8 dB/mm, derived conversion) | supplement p.7 S5: devices A 6.8 dB and B 10.5 dB |
| energy_per_bit_fj | empty | 232.5, derived | supplement p.13 S9: Eb = 2 x 1/4 C Vpp^2, 1.5 pF/cm, 124 um, 5 Vpp |
| capacitance_ff | empty | 18.6, derived (1.5 pF/cm x 124 um) | supplement p.13 S9 |
| eo_film_thickness_nm | empty | 220, design_target | VoR p.7 Methods |
| epitaxy_or_stack | contact doping levels "not stated" | P+ N+ 2.0e18, P++ N++ 4.0e20 cm^-3 | VoR p.7 Methods |
| device B | none | han2023-b IL 10.5 dB | supplement p.7 S5 |
| 4 V operating point | in notes only | row han2023-c (bw3db gt 110, measured to 110 GHz), physical_device_id han2023-device-a shared with han2023-a | supplement p.11-12 S8, Fig. S11 (audit N3) |
| drive evidence | design_target | measured (VoR p.8 'working under the push-pull configuration') | audit m1 |
| n_rf | empty | 2.1 approx, author_estimate | supplement p.6 S4 (audit m13) |
| locators | arXiv page numbers (p.14-15, p.28-31 ...) | VoR/supplement page numbers | all entries re-pointed |
| papers.csv | access arxiv, licence arXiv-nonexclusive-1.0, audit audited, verified 2026-10-02 | open_access, CC-BY-NC-4.0, needs_audit, 2026-10-05 | VoR p.1 licence notice |

Unchanged values (checked against the VoR): wavelength 1550 (approx), length 0.124 mm, bw3db 110 (approx, derived from the fit), bw_measured_to 110, IL 6.8 dB, dynamic ER 2.15 dB, ng 6.1 (simulated), rib width 455 nm, slab 90 nm, gap 6.4 um, Cu 1.2 um, BOX 2 um, max baud/line rate 112.
Differences in VoR text worth knowing: out-of-band rejection about 55 dB (arXiv >60 dB); VoR cites "Supplementary Sections S1-S9" (arXiv 5-7); the title changed from "beyond 110 GHz".
Internal inconsistencies inside the VoR + supplement (recorded in notes): phase-shifter loss 5.4 dB (main p.5) versus 3.7 dB implied by 29.8 dB/mm x 124 um (S5); Device A length 124 um everywhere except 127 um in the Fig. S9 caption; Device C 244 um (S8 text) versus 249 um (Fig. S9 caption); Device B written "Nr = 120" in the Fig. S9 caption; supplement S8 cites "Fig. 3D" for the EO response (it is Fig. 4D).

## Cache repairs
None needed in references/<id>/. Text extraction read cleanly; figures read from page renders (chen2023 p.7, mao2022 p.3-6, boynton2020 p.6/10/12, han2023 p.4/6/7 and supplement p.18/22/26).

## Coordinator follow-ups
- After merge, author_affiliations / org_sites / people tables (scripts/build_people.py and the affiliation tables) need rows for chen2023, mao2022, boynton2020 (Crossref has no affiliations for boynton2020; printed affiliation is Sandia National Laboratories only).
- data/manual_downloads.md already marks boynton2020 as retrieved; no change from this batch.
- Schema/contract gaps: see SPEC_PROPOSALS.md.
- p6_03 BATCH_REPORT.md predates the corrections; AUDIT_DISPOSITIONS.md is authoritative (han2023-b il_onchip_scope device_total).
