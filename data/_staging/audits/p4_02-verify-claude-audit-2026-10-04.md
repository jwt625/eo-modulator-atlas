---
verifier: fresh-context subagent (independent verifier)
task: verify Q1 audit corrections of staged batch p4_02
date: 2026-10-04
scope: data/_staging/p4_02/ (papers.csv, devices.csv 22 rows, organizations.csv, evidence/*.yaml) for li2025a, didier2026, lee2026, li2026aa; sims/li2026aa/config.yaml provenance
mode: read-only (only this file written; no network, no git, no merge apply, no build_views)
verdict: all corrections confirmed; no blocking or numerical defects found; 4 minor observations
counts: {confirmed: 14, not_confirmed: 0, new_findings: 4 (all minor)}
---

# p4_02 verification of audit corrections

## Method

- I read the audit (`data/_staging/audits/p4_02-q1-claude-audit-2026-10-04.md`) and `data/_staging/p4_02/AUDIT_DISPOSITIONS.md`.
- I dumped all populated cells of the 22 staged device rows and the evidence for lee2026 and for didier2026-g/-h.
- Sources read:
  - lee2026: `text.md` p.1-11, including the abstract, p.2-3 main text, the Fig. 2/3 captions, Table 1 with notes a-d, Methods 2.3-2.5 and Ext. Data Table 1.
  - didier2026: `text.md` p.3-6.
  - li2025a: `text.md` p.8-10.
  - li2026aa: `text.md` p.2, p.4-5, p.7-8 and Methods p.8.
- Figures I examined myself (all readings approximate):
  - lee2026 Fig. 2 (`img_p05_1.png`) and Fig. 3 (`img_p06_1.png`).
  - didier2026 p.5, rendered at 500 dpi. I cropped Fig. 3(c) and Fig. 3(d) and calibrated each against its axis ticks. I also rendered p.6 for Fig. 4.
  - li2025a `page_08.png` (Fig. 3(e), 3(f)).
  - li2026aa p.5, rendered at 220 dpi (Fig. 3(a), 3(b)).
- Mechanical check (scratch script): each non-empty evidence-required cell has an evidence or derived entry with an equal value. Result over 482 entries: 0 missing, 0 mismatches, 0 orphans, 0 duplicates, 0 qualifiers on empty cells.
- Dry run: `uv run python scripts/merge_staging.py data/_staging/p4_02`.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| li2025a | 1 | corrections confirmed | F4 cleared cell confirmed; F5 rejection reasonable |
| didier2026 | 8 | corrections confirmed | New rows g/h and the marker-to-gap mapping confirmed; N1, N2 minor |
| lee2026 | 5 | corrections confirmed | bw3db 40 gt / author_estimate confirmed. bw_measured_to_ghz: 35 is right, 40 is not (see below). Last measured point 34 GHz |
| li2026aa | 8 + sim | corrections confirmed | F8/F9 notes moved and reworded; F10 provenance edit confirmed (N3 minor) |

## Disposition reflected in staged files

| ID | Disposition | Reflected | Check |
|---|---|---|---|
| F1 | applied | yes | lee2026-a: bw3db_ghz 40, qualifier `bw3db_ghz:gt`, bw_basis author_estimate, bw_measured_to_ghz 35. Notes carry the extrapolated 50 GHz and the FOM 17.4 GHz/V. The evidence values, bases and locators match |
| F2 | applied | yes | lee2026-a eo_rolloff_db and eo_rolloff_freq_ghz are empty, with no evidence entries. The note covers the simulated 2.7 dB at 40 GHz and the measured EO points at 27-34 GHz |
| F3 | applied-adjusted | yes | didier2026-g/-h exist with evidence for every filled field and derived slab entries; the papers.csv note is replaced |
| F4 | applied | yes | li2025a-a prop_loss_db_per_cm is empty, with no qualifier and no evidence entry; the note is appended |
| F5 | rejected | n/a | parent_org is empty, and the org note records that this is a separate entry from the Hong Kong campus. The affiliation text does not state the relation, so the rejection is reasonable |
| F6 | applied | yes | Notes appended to didier2026-e/-f |
| F7 | applied | yes | The didier2026-a driver text matches the Fig. 4(c) schematic (AWG -> Amplifier -> DUT) |
| F8 | applied | yes | The "1484 nm" sentence is removed from li2026aa-b and appears on -c. The text confirms that p.7 writes "1484" in the PAM-4 list |
| F9 | applied | yes | li2026aa-g note reads "SSC coupling loss 0.82 dB per facet at 1970 nm". The text gives 0.82 dB/facet at 1970 nm |
| F10 | applied-adjusted | yes | New key `geometry.electrode_vertical_position` with class project_inference; the signal note points to it. The locator is correct: Methods p.8 say the 1 um Au is deposited by EBE and lift-off before the 4.2 um SiON, and the cladding in the modulation section is later thinned to 2 um by ICP |
| F11 | rejected | n/a | Extra wavelength points are optional under convention (d). Fig. 2(b) labels match the four entered points (2.3/2.7/4.3/1.8 V) |

## Changed and cleared cells

| device_id | column | staged value | Verdict | My reading / source |
|---|---|---|---|---|
| lee2026-a | bw3db_ghz | 40, gt | confirmed | Conclusion p.3: "a broad EO bandwidth exceeding 40 GHz"; abstract: "2.7-dB EO bandwidth of 40 GHz (extracted 3-dB bandwidth of 50 GHz)"; Table 1: 40 GHz (note c) / 50 GHz (note d, "Extrapolated"). Under convention (c) the paper's own bound goes in this cell with gt. The 50 GHz value comes from the grey dotted fit: in Fig. 3(d) bottom it crosses -3 dB at about 50 GHz, far past the data |
| lee2026-a | bw_basis | author_estimate | confirmed | No 3 dB crossing was measured. The 40 GHz figure is the authors' statement, supported by the simulation computed from measured S-parameters |
| lee2026-a | bw_measured_to_ghz | 35 | confirmed (35 over 40). Strictly, the last measured point is 34 GHz | Fig. 3(d) axis calibration: bottom panel 10 GHz at x=238 px and 30 GHz at x=504 px; the rightmost measured circle sits at about 34.0 GHz. In the top panel the last Vpi,MW circle is also at about 34.0 GHz. The caption states "5.26 V at 34 GHz", and the abstract says "Vπ,MW of 4.5-6.5 V in the 25-35 GHz range". No EO point exists between 34 and 40 GHz; the red curve to 40 GHz is "Simulation". Using 40 would record an EO measurement range that does not exist, because 40 GHz is only the signal-generator limit (the electrical S21 and VNA span reaches 40 GHz, but the EO response does not). 35 is the authors' own stated range and is acceptable; 34 is the strict last measured point. Optional: change to 34 and use the locator "p.6 Fig. 3(d) caption (5.26 V at 34 GHz)". Not required |
| lee2026-a | eo_rolloff_db | empty (was 2.7) | confirmed | At 40 GHz only the simulation curve (about -2.4 dB) and the fit (about -2.6 dB) exist. The measured circles end near 34 GHz, at about -2.3 to -2.6 dB, with one outlier at about -3.5 dB near 33.5 GHz. The schema defines this cell as a measured drop |
| lee2026-a | eo_rolloff_freq_ghz | empty (was 40) | confirmed | Same as above |
| li2025a-a | prop_loss_db_per_cm | empty (was 6, approx) | confirmed | The Fig. 3(f) y axis is "Excessloss(dB)". The fit runs from about 0 dB at 0.3 mm to about 1.4 dB at 2.8 mm, a slope of about 0.56 dB/mm. p.9 says the results were "normalized with the straight waveguide fabricated on the same chip". The straight-waveguide loss is not given. See N4 |
| didier2026-g | vpil_dc_vcm | 18.4 (derived) | confirmed | p.3: "With the 1.5 μm film, a minimum of 18.4 V cm was obtained for the smallest-gap modulator". Fig. 3(c) bottom (10 V*cm at y=790 px, 40 at y=427, 12.1 px per V*cm): the 1.5 um point at G = 10 um reads about 18.7. This agrees with 18.4 within reading error |
| didier2026-g | electrode_gap_um | 10 | confirmed | Fig. 3(c) 1.5 um experimental points (x calibration 124.7 px/um) sit at G of about 10.0, 10.5, 11.0 and 12.0 um. The smallest is 10 um, consistent with p.3 "gaps between 10 and 12 μm" and the Fig. 3(d) legend "G = 10 μm" |
| didier2026-g | wavelength_nm | 4000 | confirmed (caption-based); see N1 | The Fig. 3(c) caption says "operating at a wavelength of 4 μm". In Fig. 3(d) top (9.2 px per V*cm), the G = 10 um marker reads about 18.7 at 3.95 um and about 21.1 at 4.0 um. The discrepancy is disclosed in the row notes and in the evidence |
| didier2026-h | vpil_dc_vcm | 31.4 (derived) | confirmed | p.3: "the 0.9 μm film yielded 31.4 V⋅cm" |
| didier2026-h | electrode_gap_um | 13.2 | confirmed | The orange markers sit at G of about 13.2 um (about 31.7 V*cm) and about 15.6 um (about 35.9 V*cm). 31.4 belongs to the lower marker, at 13.2 um, so the mapping is unambiguous. p.3: "gaps of 13.2 μm and 15.6 μm were used for the 0.9 μm thin film" |
| didier2026-h | wavelength_nm | 4000 | confirmed | Fig. 3(c) caption |
| didier2026-g/-h | geometry (film, etch, width, slab, sidewall, electrode thickness, metal, substrate, cladding, cut) | copied from -a / -c | confirmed | Identical to the existing per-film rows; evidence present; slab derived 580 / 500 nm |
| sims/li2026aa | provenance `geometry.electrode_vertical_position` | project_inference | confirmed | Methods p.8 process sequence as quoted above; geometry and targets unchanged |

## Independent headline re-check (all rows)

- li2025a-a: confirmed.
  - Vpi 4.4 V: Fig. 3(e) arrow from about -2.4 to 2.0 V; label "Vπ = 4.4V".
  - VpiL 1.23 (p.8) and L 2.8 mm.
  - bw3db 67 gt and measured_to 67: p.9 "limited to 67 GHz due to the LCA", flat without roll-off.
  - ER 4.5 dB dynamic at 2.0 Vpp, and the OOK 100 / PAM-4 200 / PAM-8 150 Gb/s rates: p.9.
  - 40 fJ/bit "estimated".
  - c_band: EO responses at 1550.5-1556.1 nm. The wavelength cell is empty because the Vpi wavelength is not stated, which is defensible.
- didier2026-a..-f: confirmed.
  - -a: Vpi 28 V and ER 17.1 dB (Fig. 3(b) labels); VpiL 22.4 with L 0.8 cm and G 10.5 um (p.3); f2f IL 14.1/17.5/about 24.0 dB and on-chip IL at most 4/5 dB (p.4).
  - Waveguide loss, my Fig. 3(d) bottom reads: about 1.3 at 4.0 um (text "roughly 1.1"; approx kept), about 4.4 at 4.3 um, about 5.3 at 4.5 um.
  - -e/-f VpiL from Fig. 3(d): teal at 4.3 um about 25 and at 4.5 um about 28.
  - Bandwidth: 20 gt / 20 for the 1.5 um film (p.4 "No roll-off was observed up to 20 GHz"); 16 approx and 14 extracted, measured to 20, for the 0.9 um film (Fig. 4(a)).
- lee2026-a..-e: confirmed.
  - Fig. 2(b) Vpi labels 2.3 (2.4 um), 2.7 (2.7 um), 4.3 (3.6 um), 1.8 V (1.55 um). The caption's 4.26 V is noted on -c.
  - VpiL 4.6 / 8.6 stated (p.2); push-pull (p.2); L 2 cm.
  - Vpi_RF 5 V at 27 GHz (Fig. 3(d) caption); reference 2 GHz.
  - RF loss 2.75 dB/cm at 40 GHz (p.2); ER 7.1 dB static (Methods 2.3).
  - Active loss 6.4 / 10.5 dB/cm (Methods 2.5).
  - Rates: OOK 1.5 GBd and PAM-4 at 1.5 GBd, giving max line rate 3 Gb/s.
  - -e: 4 cm double pass, 4 pi at 29.2 GHz and 4.2 pi at 27.2 GHz, 0.8 THz, 33 lines.
  - lee2026-a has no vpil_dc_vcm at 2.7 um (it would be 5.4 V*cm). The authors do not state that product. Empty is acceptable; this is not a defect.
- li2026aa-a..-h: confirmed.
  - The Fig. 3(b) inset labels 2.13 / 2.66 / 2.75 / 2.90 / 3.04 / 3.21 / 4.33 / 4.38 V match all eight vpi_dc_v cells.
  - VpiL equals Vpi x 0.9 cm in every case and matches the p.5 list.
  - Bandwidth:
    - About 100 approx, measured to 110 GHz, at 1310/1485/1550/1590 nm.
    - 67 gt at 1450/1653 nm (67 GHz VNA).
    - 50 gt / 50 at 1970/2000 nm. The traces end at about 50 GHz at about -2 to -2.5 dB, at the "PD Limited Region" marker. The simulated about 80 GHz is excluded.
  - ER about 17/15/18 dB static and on-chip IL 1.2/2.8/5.8 dB derived (p.4-5); drive about 2.4 Vpp (p.5).
  - PAM-4 260/260/260/280/280/240/170/150 Gb/s (p.7).

## New findings (all minor, none blocking)

**N1 (minor). didier2026-g wavelength vs value.** The 18.4 V*cm minimum matches the Fig. 3(d) G = 10 um marker at 3.95 um (about 18.7). The Fig. 3(c) G = 10 um point reads the same value, about 18.7. At 4.0 um the same device reads about 21.1. The Fig. 3(c) point may therefore have been taken at 3.95 um, even though the caption says 4 um. The staged cell follows the caption, and the discrepancy is disclosed in the notes and evidence. Proposed: no change required. Optional: add `wavelength_nm:approx` to didier2026-g qualifiers.

**N2 (minor). didier2026-g note attribution.**
- The paper does not say that the smallest-gap device had about 150 uW output. It says "The modulator with the lowest Vπ exhibited moderate output power of approximately 150 μW" (p.3).
- Lengths are not stated, so the lowest-Vpi device is not necessarily the lowest-VpiL (G = 10 um) device.
- Proposed note text: replace "About 150 uW output (electrode misalignment)." with "Paper: the lowest-Vpi modulator had about 150 uW output (electrode misalignment); likely but not stated to be this device."

**N3 (minor). sims/li2026aa provenance key is not a dotted config path.** `sims/SPEC.md` line 13 keys provenance "by the dotted parameter path". `geometry.electrode_vertical_position` has no matching path; the y-range lives inside `geometry.electrodes[*].rect.y_um`. The file already has a similar non-path key, `waveguide_position`, and `build_views.py` does not read provenance keys. Proposed: no change for this batch. If strict path keys are wanted, rename it to `geometry.electrodes.y_um`.

**N4 (minor, optional). li2025a-a note.** The authors call the 0.6 dB/mm "propagation loss" on p.9 and in the Discussion (p.10). They use it as α in "αVπL of 7.4 dB·V" (6 dB/cm x 1.23 V*cm = 7.4). Clearing the cell is still correct, because the data are normalized to a straight waveguide whose loss is not reported. Proposed: append to the li2025a-a notes: "Authors label it propagation loss and quote alpha*VpiL 7.4 dB*V from it."

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p4_02`:

```
merge counts: {'papers': 4, 'devices': 22, 'orgs': 13, 'evidence': 4}; conflicts: 0; validation errors: 0
dry run (nothing written)
```

Device count rose from 20 to 22 because of the new rows didier2026-g and didier2026-h.
