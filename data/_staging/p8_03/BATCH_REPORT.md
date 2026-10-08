# Batch p8_03 report (distiller, 2026-10-07)

Dry run: `merge counts: {'papers': 5, 'devices': 9, 'orgs': 2, 'evidence': 5}; conflicts: 0; validation errors: 0`.
No sim configs (no grade A/B dielectric traveling-wave device in the batch), so no `sims/` files and no sim constants. No SPEC_PROPOSALS.md, no needs_download.md. All five sources are cached arXiv copies; none was truncated or wrong.
New organizations (2): Miraex SA (company, CH, name as printed), Xplore multiuser cleanroom (facility, BE, name as printed, host not stated in the paper). `ror_id` and `name_source` empty. All other orgs reused exactly from `data/organizations.csv`.
`discovered_via`: the batch token `continuation_2026_10_02` is not in the validator vocabulary, so only `web_search;author_group_followup` is written (same outcome as earlier waves).

## zhu2022 - distilled (1 row, grade C, no sim)
- Cached arXiv v1 (stamp 2021-12-18 = published_on, year 2021 under convention n). Identity from the version of record (Light Sci Appl 11(1), 327; Crossref title has "pulses", the arXiv title does not). Licence empty.
- Row zhu2022-a: double-pass TFLN phase modulator, Vpi about 2.5 V at 27.5 GHz (Fig. 3 caption; 2.3-2.8 V at phase-matched 10-40 GHz, Fig. S1b), fiber-to-fiber 11 dB (Methods), 1550 nm.
- Judgment calls: (1) length_mm empty (active area 2 cm x 600 um; per-pass vs total electrode length not stated), so no VpiL. (2) Vpi frequency pairing 2.5 V with 27.5 GHz is from the Fig. 3 caption, not from reading Fig. S1b at 27.5 GHz. (3) waveguide_platform lnoi_rib, electrode metal Au and substrate Si are read from the Fig. S1a schematic only. (4) Fig. S2a title says 8.2 Vpi while the text says 8.1 (both in notes). (5) fab = Harvard CNS only; the modulator was made by the HyperLight authors but HyperLight is not named as fab.
- Not reported: electrode length, film/rib/electrode dimensions, EO bandwidth, loss per length, cut. Hints corrected: title, year, class (phase modulator, not ring).

## khalil2026 - distilled (1 row, grade C, no sim)
- Cached arXiv v2 (stamp 2026-03-18 is v2; v1 date not printed so published_on empty). No Crossref. Licence empty.
- Row khalil2026-a: SrTiO3-on-oxide acousto-optic (stress_optic) racetrack, VpiL 0.874 +- 0.084 V cm at 504 MHz (derived, Eq. S31, L = 2 x 200 um), 5 K, Qi 70k, 4.68 dB/cm, modulation depth 2.21 dB.
- Judgment calls: (1) a row is written although the device is acousto-optic, not Pockels (class ring, vpi_convention resonance_tuning_derived, length_mm 0.4 = Lc of Table S1, the length the VpiL uses (corrected per audit F1; was 0.2 = one arm)). (2) temperature_k 5 is the cryostat setting; the device is 5.46-11.71 K depending on RF power (Fig. S8a). (3) The "Q ~ 70k" is labelled Qi (intrinsic) in Fig. 3d, so q_loaded is empty. (4) drive_vpp 0.47 V = 2 x the authors' computed 0.235 V peak (derived). (5) The 2.21 dB modulation depth (labelled ER in Fig. 3e) is entered as dynamic ER. (6) wavelength 1550.1 nm from Table S1 (text says 1550). (7) Xplore multiuser cleanroom entered as foundry_or_fab (Acknowledgements).
- Material numbers (d15, d33, e15, e33, p_eff, coercive field) are in context_values only. Not reported: Pockels r_eff in this paper, EO bandwidth, fiber-to-fiber loss, on-chip launch power.

## mohl2025 - distilled (1 row, grade C, no sim)
- Cached arXiv v2 (stamp 2025-01-26 is v2; published_on empty). Identity from PRX 15(4), 041044 (Crossref, CC-BY-4.0 on the version of record). Licence empty (cached copy is arXiv).
- Transducer; not operated as a modulator. Row mohl2025-a carries only r_eff 13 pm/V (authors' deduction from g0/2pi = 406 Hz) plus geometry; transduction numbers are in context_values.
- Judgment calls for the auditor: (1) whether this transducer deserves a row at all (convention dd lists transducers as papers-only; r_eff is the one in-device EO quantity). (2) tuning_nm_per_v deliberately empty: the text states +145 MHz/V near Vbias = -100 V but the Fig. 22 fit slopes negative (convention y); both readings in notes. (3) temperature_k empty (Fig. 22 temperature not stated; base 8 mK, Fig. 2i at 75 mK). (4) class resonator (coupled rings), integration bonded_heterogeneous (BTO film bonded onto SiO2/Si), platform bto_on_oxide_substrate. (5) buffer oxide 3 um from Appendix C. (6) etch_depth 125 nm = ridge height over the 100 nm slab.
- Not reported in text: ring radius, waveguide width, electrode gap, Nb thickness.

## axline2026 - distilled (6 rows, grade C, no sim)
- Cached arXiv v1 (stamp 2026-06-10 = published_on). No Crossref. Licence empty.
- Transducer (TFLT, six devices). One row per device (same-chip siblings) for the Table B.1 cold tunability (GHz/V converted to nm/V at the table wavelength, derived entries) and FSR (nm, derived); warm tunability, g0, kappa0, geometry gaps, coupler loss, device temperature are in each row's notes.
- Judgment calls: (1) rows for a transducer, justified only by the per-device tunability numbers (cold only; warm not a separate row). (2) Sign of tunability is not stated in the paper; magnitudes entered. (3) temperature_k empty (Table B.1 gives the operating device temperature 2.8 K / below 1 K, but the tunability measurement temperature is only "below 4 K" in the text). (4) length_mm empty (straight length L is resonator geometry, electrode length not stated). (5) integration monolithic (in-house DUV process, no foundry named; film from NanoLN wafer supplier).
- Not entered: transduction efficiency, g0, loss statistics, added noise (context_values).

## lin2026b - no_device_rows (0 rows, no grade)
- Review (source_type review). Tables I-VIII reproduce cited work, nothing original. Identity from Applied Physics Reviews 13(3), 031330; published_on = Crossref published-online 2026-09-08 (arXiv v1 stamp is 2026-09-15). Licence empty; no licence record in Crossref.
- Read at section level (abstract, headings, Tables I-VII/VIII intro text); not every paragraph read, since no value is entered.

## Schema/skill gaps
- No column for GHz/V resonance tuning or for transducer figures (efficiency, g0, cooperativity); kept in context_values.
- Batch tag `continuation_2026_10_02` is not in the discovered_via vocabulary.
