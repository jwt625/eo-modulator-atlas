# Audit dispositions, batch p3_01 (2026-10-03)

Audit: Q1 fresh-context audit of p3_01 and p3_02 (report in `data/_staging/audits/`). Papers: xu2020, wang2022a, zhang2022, qi2024, li2022b. Every finding was re-checked against `references/<id>/text.md` and the cached or re-rendered figures (li2022b Fig. 6(a); zhang2022 Figs. 2(b), 4(a) inset, 5; xu2020 Fig. 4(a); wang2022a Fig. 3(b,c)) before acting. Findings that touch only p3_02 (F4, F5, F7, F8, F10, F11, F13, F16, F18, F19) are in the p3_02 file.

Counts for p3_01: applied 7, applied-adjusted 2, rejected 1, deferred 1 (11 findings).

| ID | Severity | Disposition | Change or reason |
|---|---|---|---|
| F1 | numerical | applied | Re-measured Fig. 6(a): dashed markers at about 0.95 V and 3.7 V (span about 2.75 V), arrow label 3.3 V. `li2022b-a.vpi_dc_v = 3.3` (approx) kept as the authors' stated value; evidence locator now "p.5 Sec. 3 text; Fig. 6(a) arrow label" with a note giving the marker span; row notes add the 2.75 V span and about 0.91 V cm versus the simulated 0.96 V cm. `vpil_dc_vcm` evidence note reworded: stated in abstract without derivation, 3.3 V x 3.3 mm = 1.09, basis `derived` kept. |
| F2 | numerical | applied-adjusted | Re-read Fig. 2(b): measured markers about 43.4 ohm at 250 GHz, simulated about 40.6; text says 41.5 (measured) and 40.5 (simulated). Value 41.5 and basis `measured` kept (text value); evidence locator changed to "p.5 Sec. 3.B text (Fig. 2(b) markers differ)" and the note records the 43.4 ohm reading (both zhang2022 rows); row notes updated. Not switched to a figure value because the authors' stated number is the primary one. Sim target 41.5 +/- 2.0 unchanged (still covers 43.4); the target source note records the figure reading. |
| F3 | numerical | applied | Fig. 5(c,d) legends confirm raw circles plus a red "calculated values" curve only (dashed smoothed lines exist only in panels a,b). Evidence notes for `bw3db_ghz` and `bw6db_ghz` (both rows) now say the crossing is read on the EO S21 curve calculated from measured s-parameters and that raw sideband data scatter strongly. Row notes replace "values read from smoothed trace". Values and basis `measured` kept (authors' claim, abstract says measured). No scatter magnitude quoted (not measured here). |
| F6 | numerical | applied | `xu2020-a.qualifiers`: removed `bw3db_ghz:gt`, kept `bw3db_ghz:approx` (Fig. 4(a) marks the crossing at about 48 GHz, Table 1 "~48"; the 13 mm trace crosses -3 dB there). Added `bw_measured_to_ghz = 67` with a new evidence entry (p.5 Fig. 4(a), VNA sweep end). `bw3db_ghz` evidence note reworded; row note added. xu2020-b unchanged (`gt`, 67). |
| F9 | metadata | applied | `li2022b-a.il_fiber_to_fiber_db` evidence note shortened to 24 words ("definition not given by authors; GC included by arithmetic: ..."), row notes state the 18.8 dB is undefined in the paper and entered by arithmetic inference. VpiL note reworded (see F1). Value and `derived` basis unchanged. |
| F12 | metadata | applied | `vpi_convention` evidence basis changed from `design_target` to `derived` for xu2020-a, xu2020-b and li2022b-a, note "authors state single-drive push-pull; convention of Vpi not named". |
| F14 | minor | applied | Verified the single-longitudinal-mode 532 nm laser sentence is on p.4 (Optical loss measurement). `li2022b-a.wavelength_nm` locator now "p.1 abstract; p.4 Optical loss measurement". |
| F15 | minor | applied | xu2020-a/b `il_onchip_includes` = "fibre-to-fibre loss minus 2 x 3.4 dB grating-coupler loss" (excludes text unchanged). xu2020-b `bw3db_reference_freq_ghz` evidence note and row notes state the 1.5 GHz comes from the Fig. 4 caption naming the 13 mm device, while the same panel plots the 7.5 mm trace. wang2022a-a row notes: the 12 dB is fibre-to-fibre, per polarization. |
| F17 | minor | applied-adjusted | zhang2022 sim: rib sidewall 70 deg and ground width 100 um reclassed `unknown` with UNVERIFIED notes (project_inference kept only for the waveguide-centred assumption in the note). Wavelength: read the Fig. 4(a) inset myself, carrier at about 1579 nm (sidebands about 2 nm away, consistent with 250 GHz); `optics.wavelength_nm` changed 1550 to 1579, class `figure_digitized`, note says it is one example spectrum and not a stated measurement wavelength; `missing` reworded. wang2022a sim: `load_ohm` 50 changed to the stated 38 (class `paper_exact`, locator p.3 Sec. 2), limitation line reworded; source impedance 50 ohm stays `project_inference`. Engine run (`node engine/cli.mjs sims/<id>/config.yaml --mesh-scale 2`): both configs still load and run the electrostatic stage (exit 0); no value tuned, no output stored. qi2024 and li2022b configs untouched. |
| F20 | minor | rejected | Optional 3 dB crossing for wang2022a Fig. 3(c) not entered: the paper states only "6 dB bandwidth > 67 GHz" and "about 5 dB roll-off at 67 GHz"; the traces are noisy, include probes, have no stated reference frequency and the crossing would be a figure reading with large uncertainty (the audit's 35-40 GHz is a by-eye estimate; at 35-40 GHz the traces read about -3.5 to -4 dB). The existing note "3 dB point not stated" stays. |
| F21 | minor | deferred | Policy question for the coordinator (placeholder `unknown` material constants versus SPEC "leave out and list in missing"). Not changed; proposal text appended to `SPEC_PROPOSALS.md`. |

Not applicable to this batch: F13 (organization rows are p3_02 only; the p3_01 organization rows need no change per the audit).

## Cross-batch organization duplicates (for the coordinator; not edited)
Rows in `data/_staging/p3_01/organizations.csv` whose org_name also appears, with identical type/country/region/parent, in another staged batch (none is in `data/organizations.csv`):
- Harvard University: p1_02, p1_04, p3_11, p3_13, p3_14, p3_19
- City University of Hong Kong: p3_11, p3_12, p3_14, p3_18
- Huazhong University of Science and Technology: p1_04
- Huawei Technologies: p1_04
- Agency for Science, Technology and Research: p1_04
- China Information and Communication Technologies Group Corporation: p3_15
- Sun Yat-sen University: p1_02, p3_02, p3_03

## Validation after corrections
`uv run python scripts/merge_staging.py data/_staging/p3_01 data/_staging/p3_02` (dry run): merge counts papers 10, devices 20, orgs 17, evidence 10; conflicts 0; validation errors 0. Extra mechanical check: every evidence value equals its CSV cell, no evidence entry for an empty cell, no duplicate qualifier field, every qualifier on a populated cell, notes at most 25 words.
