# p3_13 batch report (verified_on 2026-10-02)

Cache state: all six papers had source.pdf, source.json, text.md and figures/ already; no repair needed. No network, no git. Crossref records exist for larocque2024, holzgrafe2020 and hou2024 (not for kari2025, thiele2022, multani2025). All six are arXiv preprints (source_version in source.json); numbers come from those versions, not the versions of record. license and published_on empty, redistribution restricted_local_only, arxiv_id versioned, url = versioned arXiv PDF, discovered_via copied from the batch CSV.

Validation: `uv run python scripts/merge_staging.py data/_staging/p3_13` -> papers 6, devices 14, orgs 21, evidence 4; conflicts 0; validation errors 0 (dry run). Sim configs: none written (see below).

| Paper | Status | Device rows | repro_grade | Sim config |
|---|---|---|---|---|
| larocque2024 | distilled | 1 (iq_mzm, resonant PhC IQ) | B | none (resonator) |
| kari2025 | distilled | 5 (a, b single etalons; c, d, e coherent MZIs) | C | none (resonator, geometry undisclosed) |
| holzgrafe2020 | no_device_rows | 0 | empty | none |
| thiele2022 | distilled | 6 (3 devices x 296 K / cryogenic) | C | none (bulk Ti:LN, not a listed dielectric TWE platform) |
| hou2024 | distilled | 2 (ring pair, single-ring reference) | B | none (resonator) |
| multani2025 | no_device_rows | 0 | empty | none |

## larocque2024
- 1 row. Version: arXiv v1, journal ACS Photonics 11(9) 3860-3869 (2024-08-20) not read. Crossref title lacks "for coherent communications"; authors match (16).
- Metrics: 3 dB cutoff about 1.5 GHz per cavity (Fig. 4a, p.3), ER above 30 dB static (p.3, Fig. 4b), Q about 70000 (6.6e4 / 7.4e4 fitted, Table I p.4), tuning 9.2 / 8.7 pm/V (Fig. 3b,c; fitted 1.15 / 1.09 GHz/V; calculated 1.0 GHz/V), 4-QAM at +-1 V per cavity (2 Vpp), 20 MHz to 1 GHz, EVM below 0.27, energy 25.8 fJ/bit (author estimate from simulated capacitances), footprint 40 x 200 um^2, 1548.66 nm, geometry (600 nm film, 400 nm etch, 800 nm wire, 35 deg sidewall, 500 nm Au).
- Judgment calls: device_class iq_mzm (IQ function; precedent geravand2025-b) with resonant/michelson tags; drive = dual_drive (derived, authors name none); bw3db reference entered dc (curve normalised at 0 GHz); the row carries cavity-1 tuning slope, cavity 2 in note; no baud rate entered (1 GHz is a modulation frequency, symbol rate not stated); 8.2 dB facet loss not entered (on-chip vs fiber-to-fiber not defined); slab thickness derived (600 - 400).
- Not reported: Vpi, insertion loss definition, electrode gap in text, temperature, optical power in dBm.

## kari2025
- 5 rows: a (W 0.55, L 100 etalon: Q 6232, 29 GHz), b (W 0.75, L 100: Q 26595, 4.4 GHz), c (MZI1, isolation 11.8 dB, detuning 0.2 nm), d (MZI2 L 80, isolation 26.7 dB, detuning 0.12 nm), e (MZI W 0.55 L 120, 10 Gbaud eye, Vpp 6.32 V, ER 6.2 dB dynamic). Version: arXiv v1 only; no DOI.
- CAVEAT: Methods (p.10-11) give a 7.5 GHz VNA and 12 GHz photodetector for the EO response, but Fig. 4c plots a normalised EO response to about 60 GHz with the 29 GHz crossing, and 29 GHz also matches the photon-lifetime limit for Q 6232 (Eqs. 1-3). Entered as measured (abstract, caption, Fig. 2e "VNA" label) with the conflict stated in the row note; bw3db reference unspecified. The auditor should treat 29 GHz as unresolved between S21 and Q-derived.
- Judgment calls: length_mm left empty on every row (the "80 um modulation region" is not tied to a specific (W, L) device: eye device is L 120); ER 2.5 / 10.2 dB are the resonance-dip depths in Fig. 2b,c (sign dropped); IL about 1 dB is general for the fabricated resonators, exclusions not stated; drive differential (derived from "differential modulation", VS1 / VS2); modelled pi/90 phase per resonator at +-10 V (simulated) and 16-QAM / Tb/s projections not entered.
- Not reported: wavelength (about 1566 nm region from axes), TFLN thickness (lnoi400 PDK named only), etch, electrode gap, Vpi, RF data, MZI loss.
- CSV hint ok (class iq_mzm for the MZIs; single resonators entered as ring); abstract claim "29 GHz" and "about 80 um" confirmed in text.

## holzgrafe2020 (no_device_rows)
- Microwave-to-optical quantum transducer (coupled LN racetrack photonic molecule + NbN LC resonator). Reports transduction efficiency, g0, 13 MHz conversion bandwidth, optical Q; no modulator metrics (no Vpi, EO bandwidth, IL, ER, tuning slope in text). All numbers kept in the papers.csv note with locators. Abstract claims (2.7e-5, 1.9e-6 per uW) confirmed on p.1 and p.8. arXiv v2 (stamp 2020-05-12); Optica version (7(12) 1714, 2020-12-07) not read. Supplement not cached.

## thiele2022
- 6 rows: phase modulator, directional coupler, polarisation converter, each at room temperature and cryogenic (8.5 K for PM, 5 K for DC and PC). Bulk Ti in-diffused z-cut LN, wire-bonded lumped electrodes.
- Vpi columns intentionally empty: the paper reports V_pi/2 (Senarmont min-to-max swing for the PM; full-transfer switching voltage for DC / PC), which is not a Vpi in any atlas convention. Values (23.3 to 40 V, 18 to 35 V, 11.1 to 16.1 V; +74 / +84 / +35 percent normalised) are in the row notes and papers.csv note with locators (Table 3 p.14).
- Paper inconsistencies recorded: coupler bar-state wavelength direction (text p.11 says 1545 nm ambient to 1460 nm cryogenic, Table 3 and the V_pi/2/(lambda L) column say the opposite; table used at first, superseded 2026-10-03: wavelength cells left empty); 85 nm (p.11, abstract) vs 84 nm (p.14); Table 1 gap unit printed mm (entered as um, assumed typo, flagged in evidence); Fig. 3c shows about 35 V near 1550 nm at 8.5 K versus 40 V in the table.
- prop loss "below 0.15 dB/cm" (p.5) entered with lt on all rows. Not reported: Ti thickness and diffusion conditions, wafer supplier, fabrication site, bandwidth, ER, optical power (1 mW laser, not on-chip), waveguide orientation. CSV hint ok (the paper has three device types; platform lithium_niobate, bulk Ti:LN not thin film).

## hou2024
- 2 rows: ring pair (ER 32 dB aligned, optical linewidth 22 GHz in note, geometry) and a single-ring reference (4.8 pm/V, resonance about 1567.8 nm). arXiv v2 (no arXiv stamp line in the extracted text; Crossref 2023-06-22 online, Adv. Photonics Res. 4(8) 2300169, not read).
- CSV hint corrections: year 2023 (Crossref online 2023-06-22, print 2023-08), not 2024 (paper_id kept); the cached preprint has a single author (Songyan Hou) and no affiliations, Crossref has six authors with affiliations (used for authors/universities/research_groups and flagged unverifiable in the cached text). Abstract claims "22 GHz" and "beyond 30 dB" confirmed; "22 GHz" is the optical -3 dB linewidth (0.1777 nm), not an EO bandwidth, so bw3db is empty.
- Judgment calls: tuning 4.8 pm/V entered on the single-ring row only (Fig. 4b is a single ring; Table 1 attributes it to "this work"); drive push_pull on the pair (derived from inverse fields); ER 32 dB (p.8; "around 32 dB" p.9; 13 and 19 dB for the individual rings in note); Fig. 2 simulated spectra give no entered metrics; electrode gap 4.5 um is a design value (design_target).
- Not reported: EO S21, Vpi, insertion loss, RF data, fabrication site, ring length.

## multani2025 (no_device_rows)
- Triply-resonant superconducting sub-THz-to-telecom transducer at about 4.9 K; reports efficiency 0.82e-6, g0/2pi about 0.7 kHz, conversion bandwidth 210 MHz (optical-linewidth limited). No modulator metrics. Numbers kept in the papers.csv note with locators (Extended Table 1 p.22). CSV hint "0.82e-6 at 107 GHz" is imprecise: peak conversion at 105.285 GHz, RF resonator 106.993 GHz. arXiv v1 only; Supplementary Information is in the cached file but contains no modulator metrics.

## Organizations added (21)
Massachusetts Institute of Technology, U.S. Army Combat Capabilities Development Command Army Research Laboratory, Centre Suisse d'Electronique et de Microtechnique, University of Illinois Chicago, Tulane University, Raytheon BBN Technologies, Technical University of Denmark, University of Pittsburgh, University of California Santa Barbara (written "University of California, Santa Barbara"), University of Cagliari, Cetus Photonics Inc., Harvard University, California Institute of Technology, Center for Nanoscale Systems, Paderborn University, Xidian University, Nanjing University of Aeronautics and Astronautics, Stanford University, SLAC National Accelerator Laboratory, Stanford Nano Shared Facilities, Stanford Nanofabrication Facility. Luxtelligence SA and HyperLight reused unchanged from data/. Several of these also appear in other staged batches (Army lab, Santa Barbara, Harvard, Caltech, CNS, Stanford entries): the coordinator should dedupe on merge.

## Not read
- Journal versions of larocque2024, holzgrafe2020, hou2024; holzgrafe2020 Supplement; larocque2024 Supp Fig. 12a image (electrode geometry) not digitized; hou2024 Fig. 2 simulated curves.

## Audit corrections (2026-10-03)
Q1 audit findings applied per AUDIT_DISPOSITIONS.md: kari2025-a 29 GHz basis set to author_estimate with the Methods conflict in evidence and row notes; thiele2022 directional-coupler `wavelength_nm` emptied (text, Table 3 and Fig. 4 conflict, figure supports the text); larocque2024 sidewall reference ("from the chip normal") and dB-convention notes; Methods-stated dimension basis relabelled `design_target` in larocque2024, hou2024 and thiele2022; kari2025 ER notes marked as passive dip depth. Rejected with reasons: thiele2022 gap-unit and `il_basis` changes. Deferred to the coordinator: preprint-versus-Crossref author rule (hou2024), `discovered_via` vocabulary. Dry-run merge of p3_11, p3_12, p3_13 together after the corrections: 0 conflicts, 0 validation errors (16 papers, 36 device rows, 35 organizations, 14 evidence files).
