# p8_03 audit dispositions (2026-10-07)

Audit: `data/_staging/audits/p8_03-claude-audit-2026-10-07.md`. Coordinator decisions applied. Each source passage re-read before the change.

- F1 applied: khalil2026-a length_mm 0.2 -> 0.4 (Table S1 p.30 Lc = 400 um; Eq. S31 p.26 "L = 2 x 200 um"; push-push, p.26-27); VpiL 0.874 kept; evidence entry (value, locator, note) and row note updated.
- F2 applied: axline2026-d1..d6 qualifiers `slab_thickness_nm:approx;etch_depth_nm:approx` (A.4 p.13: "rib waveguides about 200 nm deep ... about 200 nm of LT slab remains", one sentence governs both).
- F3 applied: axline2026-d1..d6 notes now "kappa0(r) X MHz (red, pump supermode) and kappa0(b) Y MHz (blue, signal supermode)" (Table B.1 p.16 labels; Fig. 2(b) p.4; p.4 text omega_S = omega_r). Values unchanged, matched against Table B.1 per device.
- F4 applied (per device): Device 1 note says sign not stated in text, Fig. 2(a) (p.4) consistent with positive d(lambda)/dV (dark resonance frequency falls as bias rises). Fig. 2(a) shows Device 1 only, so Devices 2-6 note "sign not stated or shown for this device (magnitude entered)". Values unchanged.
- F5 applied: mohl2025-a tuning_nm_per_v stays empty (convention y). Note adds that Fig. 2(i) (p.5, orange curve about 62 GHz at -100 V to about 15 GHz at +40 V) has the same sign as Fig. 22 and that the Fig. 22 slope (about 140 MHz/V) agrees with 145 MHz/V; room-temperature 2pi x 395 MHz/V is versus Vtune (dc-tuning port), 0 to -100 V (p.26, Fig. 23; text "tuning voltage").
- F6 applied: mohl2025-a fsr_nm 1.87 with a derived entry (lambda^2/c x 218 GHz at 1603.5 nm = 1.870 nm; 218 GHz from p.4 text and Fig. 2(e) caption p.5, room temperature, unbiased); row note updated. Optional khalil2026-a tag `acoustic_resonance` added.
- F7 applied: zhu2022-a integration = monolithic (author contributions p.6: modulator fabricated by the HyperLight authors; Acknowledgements p.6: Harvard CNS); row note added.
- F8 applied: zhu2022-a vpi_rf_freq_ghz evidence basis design_target -> measured; locator extended with p.9 Fig. S1b (drive frequency at which the measured Vpi about 2.5 V is quoted, Fig. 3 caption p.3).
- F9 applied: khalil2026-a qualifiers add `temperature_k:approx` (5 K cryostat setpoint; device 5.46 K at 0 dBm, 11.71 K at 10 dBm, Fig. S8a p.30; not stated at 1 dBm); evidence and row notes updated; value 5 unchanged.
- F10 applied: mohl2025 evidence context_values offchip_transduction_efficiency_pulsed note adds "-73 dB/mW" from the p.10 trend line (Fig. 5c); per_mw_db -72 (Conclusion) kept.
- F11 applied: lin2026b papers.csv notes reworded to "Read at section level (abstract, Sec. I-VIII headings, Tables I-VIII captions and intro text); no value entered".

Counts: 11 applied, 0 adjusted, 0 rejected.

Dry run: `merge counts: {'papers': 5, 'devices': 9, 'orgs': 2, 'evidence': 5}; conflicts: 0; validation errors: 0`.

BATCH_REPORT.md: the khalil2026-a length line was reworded by the coordinator to the corrected 0.4 mm (F1); verifier N1-N3 fixed by the coordinator (mohl2025 quote "2pi x 145 MHz/V", figure files added to source_files).
