# p3_03 batch report (verified_on 2026-10-02)

Cache repair: references/<id>/ held only source.pdf, source.json and (where applicable) crossref.json, with no text.md or figures/. text.md and figures were regenerated locally from the cached PDFs with the same extraction logic as scripts/extract_source.py (source.json untouched; no network). All numbers read from text.md and from page-render/embedded PNGs.

Validation: `uv run python scripts/merge_staging.py data/_staging/p3_03` -> papers 5, devices 11, orgs 11, evidence 5; conflicts 0; validation errors 0 (dry run). Sim config schema check was not run (no jsonschema in the environment; engine not run per contract).

| Paper | Status | Device rows | repro_grade | Sim config |
|---|---|---|---|---|
| zhang2023 | distilled | 1 (resonator, ring class) | C | none (resonator) |
| li2020 | distilled | 3 (resonators a/b/c) | C | none (resonator) |
| shen2024 | distilled | 5 (a-c room temperature Vpi, d cryogenic bandwidth, e RSFQ link) | B | none (superconducting, outside SPEC; auxiliary SFQ scope) |
| liu2025c | distilled | 1 (free-space, class other) | C | none (free-space) |
| lin2026a | distilled | 1 | B | sims/lin2026a/config.yaml |

## Versions and rights
- zhang2023: version of record, CC-BY-4.0 (Crossref VOR record and article notice p.1). Supplementary Notes S1-S9 not cached.
- li2020: numbers from arXiv v3 (stamp 2020-06-10, no supplement); journal Nat. Commun. 11, 4123 (Crossref 2020-08-17, CC-BY-4.0 for VOR). license left empty and redistribution restricted_local_only because the cached file is the preprint; published_on empty (batch hint 2020-02-18 not verifiable).
- shen2024: numbers from arXiv v1 (stamp 2023-09-06; SI pp.10-25 included); journal Nat. Photon. 18(4) 371 (Crossref 2024-01-16, publisher TDM terms only). published_on = v1 stamp. license empty, restricted_local_only.
- liu2025c, lin2026a: arXiv v1 only, no Crossref, no license notice in the file; license empty, restricted_local_only; published_on = arXiv stamp date printed on page 1 (2025-11-04, 2026-05-04).

## Per paper
### zhang2023 (1 row, zhang2023-a)
- Headline 104 GHz EO bandwidth at -8 dB detuning with optical peaking (other detuning points 37/67/87 GHz in the note); IL 1.3 dB, ER 32 dB, Q 9066 are for the passive cavity without electrodes (Fig. 2d); tuning 11 pm/V; C 5.4 fF (calculated), 5.4 fJ/bit (CVpp^2/4, Vpp about 2 V); 100 GBd NRZ, 100 Gb/s PAM-4.
- Judgment calls: bw3db_reference = dc (Fig. 3d 3 dB arrow drawn from low-frequency level); wavelength 1560 nm approx read from Fig. 2e (not in text); substrate "silicon" from the Fig. 1f legend; Q of the S21 device not stated.
- Not reported: Vpi, electrode gap, SiN etch depth, optical power. CSV hint ok (platform lithium_niobate; class other changed to ring; resonant cavity).
### li2020 (3 rows)
- a: tuning device (16 pm/V = 1.98 GHz/V, Q 1.34e5, IL about 2.2 dB, ER 11.5 dB, 1554.47 nm, geometry); b: Q about 14000, 17.5 GHz, NRZ 9/11 Gb/s, 22 fJ/bit (C about 22 fF simulated); c: Q about 20000, 12.5 GHz.
- Judgment calls: the device used for the NRZ switching is not identified; entered on row b. Geometry only on row a (b, c are "similar" devices). bw3db_reference unspecified (S21 normalization not stated).
- CSV hint corrections: published_on, license (preprint cached), source discussion; class ring correct; platform entered as suspended_lnoi.
### shen2024 (5 rows)
- Vpi 42/110/230 mV at 1.0/0.4/0.2 m total (0.5/0.2/0.1 m per arm), room temperature; 17.5 GHz 3 dB bandwidth at 5.6 K on a 0.2 m device (derived from fitted S21; 13.5/16.8/11.0 GHz at 4.8/6.4/6.8 K in note); packaged 0.2 m module Vpi 380 mV at 4 K (220 mV at 300 K), 20 dB total optical loss (12 coupling + 8 on-chip), propagation about 0.8 dB/cm, 17 dBm laser, RSFQ 5 mV Vpp 1 Gb/s NRZ readout (SNR 3.1 dB, BER 2.2e-2 calculated), 125 aJ/bit electrical.
- Judgment calls: push-pull convention/drive inferred (authors never say push-pull; CSV enums set to mzm_push_pull/push_pull and the inference is stated in every row note; no separate evidence entry for these enum cells); length per arm; VpiL (about 2.2 V cm) not entered per row; the 0.2 m devices of Fig. 2d (230 mV) and the packaged module (220 mV) differ; identity of the bandwidth device with the eye-diagram and packaged devices not stated; electrode geometry on row d is design_target (Fig. 3a modelling).
- repro_grade B but no sim: superconducting kinetic-inductance line not in SPEC; ground width and jump-over geometry not disclosed.
- Not reported: wavelength, band, RF Vpi, Z0/n_RF numbers (only plots), energy of optical part per bit beyond the 50 pJ/bit text.
### liu2025c (1 row)
- Free-space LN vertical cavity: 43% modulation depth at 787 nm, +-50 V, bandwidth about 5 MHz (amplifier-limited), Q 611. No Vpi, no loss. Supporting Information not cached.
### lin2026a (1 row)
- Vpi 4.2 V push-pull at 375 nm, VpiL 85 mV cm (electrode 200 um), ER 22.7 dB, IL 1.3 dB (author combination, derived), prop loss 7.2 dB/cm, 922 MHz EOE link bandwidth (detector-limited; not a modulator bandwidth), 1 dB roll-off at 67 GHz an author estimate, Z0 23 ohm, n_RF 2.3.
- Sim config: electrostatics-ready only; LT RF permittivity and SiO2 permittivity are flagged placeholders (class unknown/project_inference), BOX/substrate, electrode widths, arm spacing missing or digitized from a low-resolution optical image; LT optical indices at 375 nm unavailable.
- Paper inconsistencies: text swaps Fig. 4(d)/(e); Vpi 4.2 V vs 4.25 V.

## Organizations added (11)
Shanghai Jiao Tong University, Lanzhou University, Sun Yat-sen University, Center for Advanced Electronic Materials and Devices, University of Rochester, Cornell NanoScale Facility, Yale University, Nankai University, East China Normal University, Shanxi University, Nanofabrication Platform of Nankai University. Cross-batch duplicates left for the coordinator (identical type/country/region, notes differ; the merge keeps the first row): Sun Yat-sen University (p1_02, p3_01, p3_02), Shanghai Jiao Tong University (p3_06, p3_15), East China Normal University and Shanxi University (p3_11, p3_12). Ghent University reused unchanged.

## Audit corrections (2026-10-03)
Audit Q1-p3_03-p3_04 findings resolved; per-finding table in AUDIT_DISPOSITIONS.md. Statements above that this section supersedes:
- zhang2023: S21 device is most likely the Q 5400 device (p.6), not the Q 9066 cavity; Q 9066 / IL 1.3 dB / ER 32 dB are kept as electrode-free cavity values with that caveat in the row note and evidence notes; il_onchip includes/excludes now read "definition not stated".
- li2020: source_type arxiv_preprint, access arxiv (numbers from arXiv v3); Fig. 5 tuning resonance near 1555.8 nm noted (identity with the Fig. 4b resonance not stated).
- shen2024: vpil_dc_vcm entered (2.2 approx on a-c, derived; 3.8 on e, derived); drive and vpi_convention now have derived evidence entries on all five rows; rib width 2 um and gap 5.2 um applied to all rows (design_target; signal width and Nb thickness stay on row d only); ng_opt 2.25 (simulated, approx) entered on row d; discovered_via local_corpus; source_type arxiv_preprint, access arxiv.
- liu2025c: drive left empty (not stated); stack basis design_target; Fig. 4 locators moved to p.3.
- lin2026a: bw3db_ghz 0.922 now carries the gt qualifier (detector-limited link response); n_rf plateau and the 448 nm VpiL 0.12 V cm noted; optical_power_handling_dbm -1.5 (gt, derived from 700 uW guided) added; il_onchip derived-list entry removed (author-stated 1.3 dB; check arithmetic 1.34 dB in the evidence note). Config: duplicate vpi_l_dc_vcm target removed, provenance arithmetic and ground-width class fixed. The config is accepted as an electrostatics-only draft (grade B for waveguide geometry; BOX, substrate, LT permittivity and 375 nm indices missing). F17 (unverified LT/SiO2 RF permittivity placeholders) deferred to the coordinator; disclosure unchanged.
- Organizations: cross-batch duplicates listed above; none changed.
- Validation after corrections: `uv run python scripts/merge_staging.py data/_staging/p3_03` -> papers 5, devices 11, orgs 11, evidence 5; conflicts 0; validation errors 0 (dry run). `node engine/cli.mjs sims/lin2026a/config.yaml` still loads (electrostatics only; exit status 2 as before the edit because targets are not evaluated).

