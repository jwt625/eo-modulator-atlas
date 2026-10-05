---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_07
date: 2026-10-04
scope: data/_staging/p5_07 (hulyal2026, valdez2026, xu2026a, xu2026b, hess2026); papers.csv, devices.csv (6 rows), organizations.csv (3 new orgs), evidence/*.yaml; no sims/<id>/ exists for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: no blocking defect; 4 bandwidth cells conflict with the batch rule (a trace that touches or crosses -3 dB is a crossing) and 1 IL scope cell is misleading; merge after the numerical corrections
findings: {blocking: 0, numerical: 5, metadata: 0, minor: 8}
---

# Q1 audit (fresh context): p5_07

## Method and limits

- I read the rules first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), column definitions) and `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- I dumped every populated cell of the 6 staged device rows and the 5 papers rows, the 3 new organizations and the 5 evidence files.
- I read the full `references/<id>/text.md` for all 5 papers. I checked `crossref.json` for valdez2026, xu2026a and xu2026b: title, DOI and author list match; the records carry year only, with no license and no affiliations. hulyal2026 and hess2026 have no crossref.json, so their identity comes from PDF page 1. I checked `source.json` for all 5.
- I opened these figures myself:
  - hulyal2026: p.2 render and Fig. 2(d)/(g) crops from img_p02_1.
  - valdez2026: p.3 render, Fig. 2(a) crop, Fig. 2(b) (img_p03_3), and Fig. 2(c)/(d) (img_p03_2, img_p03_4, upscaled 3x, with dot centroids located by pixel analysis).
  - xu2026a: p.1 render, Fig. 2(b) (img_p02_1), Fig. 4(a) (img_p03_2) and Fig. 4(b) (img_p03_3, trace and dashed-line rows located by pixel analysis).
  - xu2026b: p.2 render, and Fig. 3(c) re-rendered from the cached PDF at 600 dpi in my scratchpad.
  - hess2026: p.2 and p.3 re-rendered from the cached PDF (Fig. 1(c)-(g), Fig. 2(a)-(d)), since no page_01 render exists and the embedded image has no text.
  - All figure readings below are my own and approximate.
- Mechanical check (throwaway scratchpad script):
  - Every populated evidence-required cell has an entry with an equal value: 0 missing, 0 mismatches.
  - No entry exists for an empty cell, there are no duplicate (device_id, field) pairs, and no qualifier sits on an empty field.
  - Every basis is in the enum, units equal the schema units, and every evidence note is at most 25 words.
  - Row `notes` run 37-42 words. That is CSV free text, which is not under the 25-word evidence-note limit and is consistent with canonical rows.
- Dry run `uv run python scripts/merge_staging.py data/_staging/p5_07`: `merge counts: {'papers': 5, 'devices': 6, 'orgs': 3, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after the steps above.
- Limits: OFC 3-page summaries only, with no supplementary material. Per the coordinator's conventions, `publisher-copyright` from the printed Optica footer plus the `license_notice` context value is accepted. `published_on` is empty in all rows, which is acceptable under (k).

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| hulyal2026 | 1 | pass | none |
| valdez2026 | 2 | pass after corrections | F3, F4, F5 (numerical); F6, F7, F13 (minor) |
| xu2026a | 1 | pass after corrections | F1 (numerical); F8 (minor) |
| xu2026b | 1 | pass after corrections | F2 (numerical) |
| hess2026 | 1 | pass | F9, F10, F11, F12 (minor) |

## Findings

### Blocking

None.

### Numerical

**F1. xu2026a-a: bw3db_ghz `gt` 110, but the trace touches -3 dB.**
- File/cells: `data/_staging/p5_07/devices.csv`, row xu2026a-a. `bw3db_ghz` = 110 with `bw3db_ghz:gt`, `bw_basis` = measured. Evidence `bw3db_ghz` value 110, basis measured.
- Source: p.3 Fig. 4(b) (img_p03_3).
  - The dashed -3 dB line sits at pixel rows 274-277. The blue trace's lower edge reaches row 275 at x of about 1072-1085, which is about 101-102 GHz on the 20 and 100 GHz tick calibration. The trace centre there is about -2.95 dB, on the line within the line width.
  - The trace also dips to about -2.85 dB near 91 GHz and ends near -2.7 dB at 110 GHz.
  - Text (p.2) and abstract say "beyond 110 GHz", referenced to 2 GHz.
  - Under the batch rule this is a crossing. The distiller's own note says "touches -3 dB near 102 GHz".
- Change:
  - `bw3db_ghz` 110 -> 102.
  - In `qualifiers`, replace `bw3db_ghz:gt` with `bw3db_ghz:approx` and keep `extinction_ratio_db:gt`.
  - `bw_basis` measured -> extracted_from_figure.
  - Keep `bw_measured_to_ghz` = 110 and the reference other/2 GHz.
  - Evidence `bw3db_ghz`: value 102, basis extracted_from_figure, note "Fig. 4(b) trace first touches -3 dB near 101-102 GHz; authors state beyond 110 GHz".
  - Row notes: replace the last sentence with "Authors state 3 dB bandwidth beyond 110 GHz; trace touches -3 dB near 102 GHz."

**F2. xu2026b-a: bw3db_ghz `gt` 110, but the trace touches -3 dB.**
- File/cells: row xu2026b-a. `bw3db_ghz` = 110 with `bw3db_ghz:gt`, `bw_basis` measured. Evidence basis measured.
- Source: p.2 Fig. 3(c), re-rendered at 600 dpi.
  - The dashed line sits at rows 375-380. The red trace centre reaches about row 377 at x of about 1300, which is about 103-104 GHz on the 20 and 100 GHz calibration. That is -3.0 dB within the line width.
  - The trace ends near -2.5 dB at about 110 GHz. Text p.2 says "exceeds 110 GHz".
- Change:
  - `bw3db_ghz` 110 -> 103.
  - `qualifiers`: replace `bw3db_ghz:gt` with `bw3db_ghz:approx`; keep the other three qualifiers.
  - `bw_basis` -> extracted_from_figure. Keep `bw_measured_to_ghz` 110 and reference unspecified.
  - Evidence `bw3db_ghz`: value 103, basis extracted_from_figure, note "Fig. 3(c) trace touches -3 dB near 103 GHz; authors state exceeds 110 GHz".
  - Update the row notes the same way as in F1.

**F3. valdez2026-a: bw3db_ghz `gt` 50, but one measured point lies below -3 dB.**
- File/cells: row valdez2026-a. `bw3db_ghz` = 50 with `bw3db_ghz:gt`, `bw_basis` measured.
- Source: p.3 Fig. 2(d) (img_p03_4). Dot centroids on the calibration 0 dB = row 64, -2 dB = row 102, -4 dB = row 140:
  - The 46 GHz point is at about -3.2 dB (row 125). The 45 and 47 GHz neighbours are about -2.4 and -2.0 dB. No other point is below -3 dB.
  - The red fit is about -1.8 dB at 50 GHz.
  - The authors claim "3-dB EO bandwidth over 50 GHz" (abstract, conclusions). That claim follows the fit, not the dots.
  - Under the batch rule as written ("a trace that touches or crosses -3 dB is a crossing"), the measured trace crosses near 46 GHz.
- Change:
  - `bw3db_ghz` 50 -> 46.
  - `qualifiers`: `bw3db_ghz:gt` -> `bw3db_ghz:approx`; keep `wavelength_nm:approx`.
  - `bw_basis` -> extracted_from_figure. Keep `bw_measured_to_ghz` 50.
  - Evidence `bw3db_ghz`: value 46, basis extracted_from_figure, note "Single measured point about -3.2 dB at 46 GHz (neighbours -2.4, -2.0 dB); fit about -1.8 dB at 50 GHz; authors state over 50 GHz".
- Coordinator note: this is an isolated sample within the trace's scatter of roughly +-0.8 dB. If the coordinator decides that one sub-threshold outlier does not count as a crossing, keeping `gt` 50 is the alternative. That would be an explicit exception to the rule, and the row note should say so.

**F4. valdez2026-b: bandwidth left empty, but the measured trace crosses -3 dB near 25 GHz.**
- File/cells: row valdez2026-b. `bw3db_ghz` empty, `bw_measured_to_ghz` = 50, `bw_basis` = measured (on a row whose only bandwidth cell is the measurement limit).
- Source: p.3 Fig. 2(c) (img_p03_2).
  - 24 GHz about -2.7 dB; 25 GHz about -3.0 dB; 26 GHz about -4.0 dB (row 140).
  - 28-30 GHz about -3.4 to -3.7 dB. Points stay between about -2.3 and -3.9 dB up to 50 GHz, with -3.9 dB at 50 GHz.
  - The blue fit lies on the -3 dB line from about 33 GHz and reaches about -3.1 dB at 50 GHz.
  - Text p.3 claims "3-dB bandwidths greater than 50 GHz" for both devices. The MZM's own plot contradicts that claim.
  - Under the batch rule the crossing is entered, not left empty. Entering the authors' >50 GHz is not supported by the figure.
- Change:
  - Set `bw3db_ghz` = 25 and add `bw3db_ghz:approx` to `qualifiers`.
  - Set `bw3db_reference` = unspecified and `bw_basis` = extracted_from_figure.
  - Add an evidence entry: {valdez2026-b, bw3db_ghz, 25, GHz, extracted_from_figure, "p.3 Fig. 2(c)", "First measured point at -3 dB near 25 GHz, -4.0 dB at 26 GHz; text claims over 50 GHz for both devices"}.
  - Row notes: replace "measured trace sits near -3 dB from about 25 GHz, so not entered" with "Fig. 2(c) data reach -3 dB near 25 GHz; fit about -3.1 dB at 50 GHz."

**F5. valdez2026-a: il_onchip_includes says edge coupling is included in an on-chip number.**
- File/cells: row valdez2026-a, `il_onchip_includes` = "total device loss; PDK edge coupling, routing and splitting components (conclusion wording)", `il_onchip_excludes` = "not stated by the authors".
- Source:
  - p.3 Conclusions: "LIGENTEC PDK components for edge-coupling, routing, and splitting to achieve an on-chip insertion loss of 1.75 dB". This credits those components for the low loss. It does not say coupling losses are included.
  - p.2: Fig. 2(a) is the "measured optical transmission (fiber-to-fiber)". On my reading of the p.3 render its envelope peaks at about -3.5 dB near 1551 nm, which is about 1.75 dB above the on-chip value. That is consistent with the edge couplers being excluded.
- Change:
  - `il_onchip_includes` -> "device insertion loss as stated (not itemised)".
  - `il_onchip_excludes` -> "not stated; Fig. 2(a) fiber-to-fiber peak about -3.5 dB implies edge coupling excluded".
  - Optional: add an `il_onchip_includes` evidence entry (basis derived) carrying this note.

### Metadata

None. Identity, venue, DOI and URL agree with crossref.json for valdez2026, xu2026a and xu2026b, and with PDF page 1 for hulyal2026 and hess2026. Every organization name reuses `data/organizations.csv` exactly. The 3 new organizations are correct:
- Polariton Technologies AG: company, CH, europe (Adliswil).
- Riga Technical University: university, LV, europe.
- RISE Research Institutes of Sweden: research_institute, SE, europe (Kista).

### Minor

**F6. valdez2026-a: Vpi/VpiL pairing note is incomplete.**
- Cells: `vpi_dc_v` 6.7 with `vpil_dc_vcm` 1.36. The evidence note says "6.7 V x 0.2 cm would be 1.34".
- Source: p.1 intro gives "Vπ of 6.8 V, corresponding to a VπL product of 1.36 V·cm" (6.8 x 0.2 = 1.36). p.2 Sec. 2 gives "6.7 V, corresponding to a VπL of 1.4 V·cm". Fig. 2(b) is labelled "Vπ = 6.7 V". The abstract and conclusions give 1.36 only.
- Keeping 6.7 (figure label) and 1.36 (headline) is acceptable. The note should say that 1.36 belongs to the intro's 6.8 V.
- The RAMZM "Vπ" is the voltage between minimum and maximum of a coupling-coefficient modulator biased at critical coupling. It is not an interferometric pi phase shift, so it is not directly comparable with MZM Vpi values. The row note and tag partly say this.
- Change: evidence `vpil_dc_vcm` note -> "Abstract/conclusions 1.36 V cm = intro Vpi 6.8 V x 0.2 cm; Sec. 2 gives 6.7 V with 1.4 V cm". Add to row notes: "RAMZM Vpi is an effective, bias-wavelength-dependent coupling-modulation value."

**F7. valdez2026-b: the Vpi fit extrapolates beyond the scan.**
- Cell: `vpi_dc_v` 20.9 (derived).
- Source: p.3 Fig. 2(b). The measured MZM data span -10 to +10 V (20 Vpp scan). The cyan cosine-squared fit and the 20.9 V arrow extend beyond +10 V. The derived basis is right.
- Change: evidence note -> "Cosine-squared fit of the 20 Vpp (+-10 V) scan; Vpi exceeds the scanned range, so it is a fit extrapolation".

**F8. xu2026a-a: Vpi average versus the 10 Hz value.**
- Cell: `vpi_dc_v` 1.089 (derived, average over 10 Hz-10 kHz).
- Source: p.3 Fig. 4(a) is labelled "Vπ (10 Hz) = 1.045 V". The authors' BW/Vπ² figure of merit of 100.7 GHz/V² equals 110/1.045², so it uses the 10 Hz value. 110/1.089² would be 92.8.
- Keeping the average is acceptable: it is the conclusion headline and consistent with xu2026b.
- Change: add to row notes "Authors' 100.7 GHz/V2 FOM uses 1.045 V and 110 GHz." No cell change required.

**F9. hess2026: the 2.2 dB vs 2.6 dB on-chip IL is not a conflict.**
- Source: p.2 Fig. 1(d) caption: "normalized to the lowest loss of 7.8 dB at 1303.3 nm". Grating couplers are "approximately 2.8 dB each". 7.8 - 2 x 2.8 = 2.2 dB, which is the abstract value at the lowest-loss wavelength. 2.6 dB is the value "at the operating wavelength" (p.2).
- Change:
  - Row notes and papers.csv notes: replace "Abstract says 2.2 dB on-chip loss; text 2.6 dB" with "Abstract 2.2 dB = 7.8 dB minimum total loss at 1303.3 nm minus 2 x 2.8 dB couplers; 2.6 dB at operating wavelength."
  - Update the evidence `il_onchip_db` note the same way.

**F10. hess2026-a: wavelength choice.**
- Cell: `wavelength_nm` 1317 (Setup B). IL 2.6 dB and ER 12.5 dB are "at the operating wavelength", which the paper does not give.
- Source: p.2 Fig. 1(d). The dip depths increase from about -12 dB (1302 nm) and -12.8 dB (about 1304.7 nm) to about -20 dB (about 1318.3 nm). The 12.5 dB static ER matches the dip near 1305 nm (Setup A laser 1305.2 nm), not the one near 1317-1318 nm.
- The row mixes setups in any case: 224 GBd comes from Setup A and 445 Gb/s from Setup B.
- Change, preferred: keep 1317 (the headline 445 Gb/s operating point). Extend the evidence note with "ER 12.5 dB matches the about -12.8 dB dip near 1305 nm (Setup A), so IL/ER likely refer to 1305.2 nm".
- Alternative: set 1305.2 nm with the same note.

**F11. hess2026-a: max_baud_gbd versus the figure.**
- Cell: `max_baud_gbd` 224 (text).
- Source: p.3 Fig. 2(a). Setup A PAM4 points continue past 224 GBd, to about 230-240 GBd depending on panel, at NDR about 355 Gb/s before the curve drops.
- Keeping 224, the highest symbol rate the text names, is acceptable.
- Change: add to the evidence note "Fig. 2(a) shows Setup A PAM4 points to about 230-240 GBd (NDR about 355 Gb/s)".

**F12. hess2026-a: small items.**
- The tag `athermal` overstates the paper. The authors report a normalized resonance shift of 0.048/K and 0.054/K and "lower temperature susceptibility". Replace the tag with `temperature_tolerant`.
- The evidence `bw3db_ghz` note "stays above about -0.5 dB" is inaccurate. Fig. 1(e) rises from 0 dB to about +2 dB and never falls below about 0 dB. Change it to "stays at or above about 0 dB to 100 GHz".
- `optical_input_power_dbm` was not entered. p.1 Sec. 2 gives the TLS power of 11 dBm in both setups. Optional: fill 11 with evidence locator "p.1 Sec. 2".

**F13. valdez2026: locator.**
- The evidence `wavelength_nm` locators for -a and -b read "p.3 Sec. 2". The "around 1550 nm" sentence is on p.2. Change the locator to "p.2 Sec. 2; p.3 Fig. 2 caption".

## Verified clean

- **hulyal2026-a:**
  - Vpi 4.71 V (Fig. 1(c) label, "Measured DC half-wave voltage") and length 7.6 mm (Fig. 1 caption, p.3).
  - max_baud 100 GBd PAM4. max_net 223 approx is the single-channel best: on my reading of Fig. 2(g), f4 is about 223 Gb/s and the 8 channels span about 196-223 Gb/s, summing to about 1694 Gb/s, consistent with the 1.6943 Tb/s caption. Fig. 2(d) PAM4 NDR is about 186-190 Gb/s.
  - Aggregate and AWG losses (10 dB on-chip, 4 dB coupling) are correctly kept out of the MZM cells. Recording the single-channel max_net plus the aggregate in modulation_format is the right split.
  - band c_band from 192.517-193.259 THz is correct.
  - drive and vpi_convention unspecified with derived entries are defensible: the layout is not shown, and only CPW and a GSGGSG probe are stated. push_pull (derived) would also have been acceptable under (f).
  - tw_cpw derived. Fab empty (not named).
  - papers: authors, affiliations, countries CH;DE;CN; SIMIT name reused exactly.
- **valdez2026:**
  - Geometry (300 nm LT, 5 um gap, 10 um signal, 1 um Al, 2 mm, 800/350 nm SiN, 5-30 ohm cm Si) matches p.2 and Fig. 1(b).
  - RAMZM 6.7 V is read directly from the measured Fig. 2(b). MZM 20.9 V and 4.2 V cm are correctly derived.
  - Push-pull is stated for the structure (p.1). The -b inheritance is derived with a note.
  - foundry_or_fab Ligentec SA is stated ("Fabricated within the established dual-SiN LIGENTEC PDK", "commercial multi-project wafer from the LIGENTEC platform").
  - crossref identity matches. Simulated and design statements (50 ohm, index matching) are not entered.
- **xu2026a-a:**
  - Vpi 1.089 / VpiL 1.63 (author average, derived), 1.045 V at 10 Hz on the Fig. 4(a) label.
  - IL 1.2 dB on-chip with grating couplers normalized out, and ER >35 dB: Fig. 2(b) dip at about -40.5 dB against the -1.2 dB level.
  - RF loss 4.8 dB/cm at 110 GHz (Fig. 3(b) label). Bandwidth reference 2 GHz is stated.
  - 400 nm x-cut LT, 3 um BOX, 200 nm trench, 1 um Au.
  - Gap and width are design_target. The simulated VpiL of 1.6 V cm is correctly not entered.
  - push_pull derived: Fig. 1(c) shows G-S-G with a waveguide in each gap.
- **xu2026b-a:**
  - Vpi 1.35 V average (derived). Fig. 3(b) points are about 1.31-1.42 V within the +-4% band.
  - IL 2.4 dB on-chip / about 12 dB fiber-to-fiber, ER about 42 dB, 0.1 dB/cm about, 76 deg sidewall, 1 um Au, 23 dBm EDFA launch.
  - 226 GBd, line 768 and net 536.6 (author formula, derived).
  - Film thickness, cut and gap are correctly left empty, since this paper does not state them.
- **hess2026-a:**
  - `bw3db_ghz` 100 `gt` with `bw_measured_to_ghz` 100 is correct under the batch rule. On my reading of Fig. 1(e) the trace never approaches -3 dB.
  - IL 2.6 dB excludes the GCs (2.8 dB each). ER 12.5 dB static. FSR about 2.7 nm (7 dips over 1302-1318.3 nm). Slot 6 um.
  - 445 Gb/s is the Setup B PAM8 point at about 168 GBd (Fig. 2(a) circle, derived via code rate).
  - eo_material eo_polymer is well supported: "plasmonic-organic section" (Sec. 3) plus the Perkinamine chromophore supplied by Lightwave Logic (acknowledgements).
  - foundry_or_fab: Polariton is stated ("fabricated and designed by Polariton"). BRNC comes from the acknowledgement, which follows the existing BRNC org-note precedent.
  - No sim, as required (plasmonic ring).
- **All rows:**
  - repro_grade C, audit_status needs_audit, verified_on 2026-10-04, discovered_via ofc2026;local_corpus.
  - License publisher-copyright / restricted_local_only with the footer quoted in the license_notice context value.
  - The hess2026 "(c) 2026 The Author(s)" line is not a verifiable open license, so restricted_local_only is correct.
