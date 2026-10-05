---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_09
date: 2026-10-04
scope: data/_staging/p5_09 (kotz2026, cai2026, li2026b, taghavi2026a, zhang2026a, qiu2026a; OFC 2026); papers.csv, devices.csv (8 rows), organizations.csv (5 rows), evidence/*.yaml; no sim configs exist for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: no paper merges unchanged except cai2026 and qiu2026a (minor notes only); taghavi2026a duplicates canonical taghavi2026-a (blocking); li2026b bandwidth bound conflicts with the batch gt rule
findings: {blocking: 1, numerical: 1, metadata: 2, minor: 5}
---

# Q1 audit (fresh context): p5_09

## Method and limits

- I read the rules first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), columns, enums) and `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- I dumped every populated cell of the 8 staged device rows, the 6 papers rows, the 5 staged organizations and the 6 evidence files.
- I read `references/<id>/text.md` in full for all 6 papers. None of the 6 has a `crossref.json`. I checked identity against `source.json`, the PDF page 1 text and the batch row `data/_staging/batches/p5_09.csv`.
- I opened these figures myself. All readings are approximate.
  - kotz2026: p.2 render, plus a crop of Fig. 1(b).
  - cai2026: Fig. 2 (img_p02_2) and Fig. 3 (img_p03_1), with a pixel trace of the 1 V curve near 100-110 GHz.
  - li2026b: p.2 render, plus a 600 dpi vector render of Fig. 1(b) from the PDF, with a pixel trace of the green EAM curve. Gridlines were calibrated at 0/-2/-4 dB and 20/40/60/80 GHz.
  - taghavi2026a: Fig. 2(c) (img_p02_1).
  - zhang2026a: p.2 render, Fig. 2(a) (img_p02_5) and Fig. 2(b) (img_p02_6).
  - qiu2026a: a 500 dpi vector render of Fig. 1(b).
- I compared taghavi2026a against canonical `data/devices.csv` taghavi2026-a and `data/papers.csv` taghavi2026. I compared zhang2026a Vpi placement against canonical yu2024 and chiang2025 and the earlier audit notes A3 and F22. I compared kotz2026 conventions against canonical schwarzenberger2026-a, ummethala2021-a and wolf2018a. I compared the organizations against `data/organizations.csv`, `data/_staging/p5_07/organizations.csv` and `data/_staging/p5_04/organizations.csv`.
- Mechanical check (throwaway scratchpad script) covered all 8 rows:
  - Every populated evidence-required cell has an entry with an equal value: 0 missing, 0 mismatches, 0 orphan entries.
  - Units equal the schema units. All bases and enums are valid.
  - Every qualifier sits on a populated field, and drive/vpi_convention are present wherever a Vpi is filled.
  - No evidence note exceeds 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p5_09` (dry run) output: `merge counts: {'papers': 6, 'devices': 8, 'orgs': 5, 'evidence': 6}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after the steps above.
- Limits:
  - There is no Crossref record for any paper. The license comes from the printed footer notice (quoted in each evidence file's `context_values.license_notice`). The page-1 "(c) 2025/2026 The Author(s)" line is not a licence grant, so `publisher-copyright` / `restricted_local_only` is right.
  - The batch CSV carries presentation dates as published_on. They were correctly left empty under (k), consistent with the other p5 batches.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| kotz2026 | 1 | pass after corrections | F3 (metadata), F8 (minor) |
| cai2026 | 2 | pass | F5 (minor, optional) |
| li2026b | 1 | pass after corrections | F2 (numerical), F9 (minor) |
| taghavi2026a | 1 | pass after corrections (fails as staged) | F1 (blocking) |
| zhang2026a | 2 | pass after corrections | F4 (metadata), F6 (minor) |
| qiu2026a | 1 | pass | F7 (minor) |

## Findings

### Blocking

**F1 (blocking). taghavi2026a-a duplicates canonical taghavi2026-a: same device, same values.**
- Files: `data/_staging/p5_09/devices.csv` row taghavi2026a-a; `evidence/taghavi2026a.yaml` (10 entries); `papers.csv` taghavi2026a notes ("row kept because this OFC paper states them itself").
- Source (OFC p.2, Sec. 2) vs canonical:

  | Quantity | OFC paper | canonical taghavi2026-a |
  |---|---|---|
  | Ring radius | R = 40 um | 40 um |
  | Slab thickness | about 90 nm | 90 approx |
  | DC detuning | about 150 pm/V | tuning 0.15 approx |
  | Static power | 4.77 nW/pi | 4.77 nW/pi (notes) |
  | VpiL | about 0.33 V cm | 0.333 approx |
  | Drive | about 2.83 Vpp | 2.83 Vpp (notes) |
  | Sweep range | 30 kHz to 11 GHz | bw_measured_to 11 |
  | f-6dB | at least about 7.8 GHz | 7.8 approx |

- Fig. 2(c) is the same trace (undoped MRM): it first dips below -6 dB at about 6-8 GHz (my reading).
- What the OFC paper adds: VDC about 0.5 V and Eext about 1.2 V/um. The Isat 0.36 nA is already implicit in the canonical notes.
- The batch rule says results already in the database must not be duplicated as new rows.
- Proposed change:
  1. Delete the taghavi2026a-a row from `devices.csv`.
  2. In `evidence/taghavi2026a.yaml` set `entries: []` and keep `context_values.license_notice`, which is needed under (k).
  3. Replace the `papers.csv` taghavi2026a notes with:
     "No crossref.json: identity from PDF page 1 and the batch row. License from the page footer (c) 2026 Optica Publishing Group. published_on empty. No device row: same 40 um FN-LC microring and values as taghavi2026-a (150 pm/V, VpiL about 0.33 V cm, f-6dB about 7.8 GHz to 11 GHz, 2.83 Vpp). Adds VDC about 0.5 V, Eext about 1.2 V/um. Table 1 'about 0.3 (0.03 at DC)' conflicts with text 0.33 V cm at DC. Grade C."
  4. Optional: append "OFC 2026 summary: taghavi2026a" to the canonical taghavi2026 papers notes.

### Numerical

**F2 (numerical). li2026b-a `bw3db_ghz` 67 `gt`: the measured EAM trace does reach -3 dB inside the measured range.**
- Cells: `devices.csv` li2026b-a `bw3db_ghz` 67, qualifier `bw3db_ghz:gt`, `bw_basis` measured. The evidence entry for `bw3db_ghz` has basis measured, note "trace ends near 67 GHz without a final 3 dB crossing".
- Source: the abstract and p.2 say ">67-GHz 3-dB EO bandwidth" at 1.4 V reverse bias, Fig. 1(b).
- My reading of Fig. 1(b) (600 dpi vector render, curve centre line, approximate):
  - The trace starts at 0 dB, dips to -2.0 dB near 21 GHz and sits at -1.1 to -1.5 dB from 25 to 44 GHz.
  - It falls through -2.1 (45.5 GHz) and -2.8 (46.3 GHz) to about -3.1 dB at 46.7 GHz (lower line edge about -3.3). It recovers to -2.9 (47.1 GHz), -2.1 (48 GHz) and -1.3 dB (50.5 GHz).
  - It ends at about -2.0 dB at 67.3 GHz.
- Judgment: this is not single-sample noise. The notch is a smooth feature resolved over roughly 10 points, about 2.5 GHz wide (below -2 dB from about 45.5 to 48 GHz), in an otherwise low-ripple trace. Its minimum reaches -3 dB within reading error. Its cause (RF resonance or calibration artefact vs device) cannot be determined from the paper.
- Under the batch rule ("gt only when the measured trace never reaches -3 dB in range, otherwise the crossing (approx)"), the bound is not allowed. The BATCH_REPORT cites bhasker2026, but that precedent is an author-stated crossing value (83 GHz), not an author bound.
- Proposed change:
  - `bw3db_ghz` 67 -> 46.5. In `qualifiers`, replace `bw3db_ghz:gt` with `bw3db_ghz:approx`. `bw_basis` measured -> extracted_from_figure.
  - Evidence `bw3db_ghz` entry: value 46.5, basis extracted_from_figure, locator "p.2, Fig. 1(b)", note "First -3 dB touch in a narrow notch near 46.5-47 GHz; authors state >67 GHz; trace recovers, ends about -2 dB at 67 GHz".
  - Keep `bw_measured_to_ghz` 67.
  - Row notes: replace the bandwidth sentence with "Authors state >67 GHz (abstract, p.2). Fig. 1(b) EAM trace touches about -3.1 dB in a narrow notch at about 46.5-47 GHz, recovers to about -1.3 dB and ends near -2 dB at 67 GHz; first touch entered."
  - If the coordinator rules the notch an artefact, keeping `gt 67` needs an explicit rule exception recorded in the evidence note.

### Metadata

**F3 (metadata). kotz2026-a `drive` and `vpi_convention` are `unspecified`, against convention (f) and same-group precedent.**
- Cells: `devices.csv` kotz2026-a `drive` unspecified, `vpi_convention` unspecified; evidence entries are basis derived.
- Source: p.2 Sec. 2 says "Each MZM comprises a coplanar waveguide (CPW) in a ground-signal-ground (GSG) configuration ... In-between the signal and the ground electrodes, 1 mm long SOH slot waveguide phase shifters". Fig. 1(a) shows G-S-G with one slot phase shifter in each gap. The Vpi is "the half-wave voltage of the nested MZM" (MZM-level).
- Convention (f) gives push_pull "also for a single GSG feed". Canonical KIT SOH GSG rows (schwarzenberger2026-a, ummethala2021-a, wolf2018a-static, kieninger2020-*) use push_pull / mzm_push_pull.
- Proposed change:
  - `drive` -> push_pull. Evidence: basis derived, note "Single GSG feed with slot phase shifters in both gaps (Fig. 1(a)); authors do not state push-pull".
  - `vpi_convention` -> mzm_push_pull. Evidence: basis derived, note "MZM-level half-wave voltage under single GSG feed; convention not stated by authors".

**F4 (metadata). zhang2026a-a and -b: 1 MHz Vpi stored as `vpi_rf_v` with `vpi_rf_freq_ghz` 0.001, against the database practice for sweeps at or below 1 MHz.**
- Cells:
  - zhang2026a-a: `vpi_rf_v` 6.7, `vpi_rf_freq_ghz` 0.001.
  - zhang2026a-b: `vpi_rf_v` 3.2 (approx), `vpi_rf_freq_ghz` 0.001.
- Source: p.1 says "measured using a 1 MHz sinusoidal driving signal and is 6.7 V". In Fig. 2(b) (my reading), the 1 mm device Vpi is 2.84 V at 50 mHz, about 3.03 V from 1 Hz to 5 kHz, and 3.21 V at 1 MHz. The authors call it flat within about 10% over 7 decades.
- Precedent:
  - Canonical yu2024 (1 MHz sweep), kharel2021 (1 MHz label) and liu2021 (100 kHz) are in `vpi_dc_v` with a frequency note (audit note A3). The only `vpi_rf` row below 50 MHz is chiang2025-a (25 MHz, labelled "AC" by its authors).
  - The paper's VpiL 3.4 V mm and r33 are quasi-static numbers.
  - Keeping `vpi_rf` also stops build_views from deriving a VpiL (it derives from `vpi_dc_v` and length), so the 0.5 mm device would show no VpiL. The BATCH_REPORT's "build step derives 3.35 V mm" does not hold for a `vpi_rf` cell.
- Proposed change, both rows:
  - Move the value to `vpi_dc_v` (6.7; 3.2) and empty `vpi_rf_v` and `vpi_rf_freq_ghz`.
  - Evidence: rename the field to `vpi_dc_v` and delete the `vpi_rf_freq_ghz` entries. Notes: -a "1 MHz sinusoid, quasi-static"; -b "1 MHz point of Fig. 2(b); about 2.84-3.21 V from 50 mHz to 1 MHz".
  - `qualifiers` on -b: `vpi_rf_v:approx` -> `vpi_dc_v:approx`.

### Minor

**F5 (minor, optional). cai2026-a: keep `bw3db_ghz` 110 `gt`; sharpen the note on the 1 V touch.**
- My pixel trace of Fig. 3(a), using -3 dB gridline row 295 and 0 dB row 192, shows one vertical spike on the 1 V trace at about 103.7-104.1 GHz. Its lower edge is about -3.2 dB. The trace is at about -2.5 dB one sample before and about -0.3 dB one sample after.
- Above 80 GHz all traces ripple by about +/-2 dB. The 2, 3 and 4 V traces never reach -3 dB.
- Judgment: this is single-point measurement noise, not a crossing. The `gt` is consistent with the batch rule, and the authors state "exceeds 110 GHz ... for 1 V to 4 V".
- RC-fit 180 GHz (Fig. 3(b)): correctly not entered.
- Optional note wording: "1 V trace has a single-point noise spike to about -3.2 dB near 104 GHz (Fig. 3(a)); 2-4 V traces stay above -3 dB".

**F6 (minor). zhang2026a: VpiL 3.4 V mm left unassigned (accepted); the note's attribution argument is incomplete.**
- The row note says the VpiL "equals 6.7 V x 0.5 mm within rounding".
- My reading of Fig. 2(a) ("@ 1MHz", the phase-extraction data behind the VpiL) gives about 5.3 pi at 20 V, so about 3.8 V per pi. That matches neither 6.7 V (0.5 mm) nor about 3.2 V at 1 MHz (1 mm, Fig. 2(b)).
- Which device the VpiL belongs to is therefore genuinely unresolved, and leaving `vpil_*` empty is correct.
- Proposed: append to the zhang2026a-a notes "Fig. 2(a) slope (about 3.8 V per pi at 1 MHz, approx reading) matches neither device; VpiL not assigned."

**F7 (minor). qiu2026a-a `bw6db_ghz` 25 approx: accepted; the notes should record the trace shape.**
- Fig. 1(b) (500 dpi render, approximate):
  - The 30 C trace starts at about +0.7 dB near 2 GHz (the reference is not stated). It dips to about -6.4 dB near 19-20 GHz, recovers to about -5.5 dB near 22 GHz, and is below -6 dB from about 25-26 GHz.
  - The 85 C trace stays above -6 dB until about 26-27 GHz.
  - Both traces fall 3 dB below their start by about 7-9 GHz. That number is not stated by the authors and not entered.
- Package-level values (driver-inclusive 0.4 V Vpi at 1 GHz in notes only, S21 including drivers and wire bonds) are handled correctly.
- Proposed: append to the notes "Fig. 1(b): 30 C trace first touches -6 dB near 19-20 GHz, below from about 25 GHz; S21 reference not stated."

**F8 (minor). kotz2026-a `il_fiber_to_fiber_db` 17.7: the coupler type is not recorded.**
- p.2 says "Grating couplers (GC) or edge couplers (EC) are used". The 17.7 dB "optical fiber-to-fiber transmission" does not say which.
- Reading it as loss is correct, and `il_fiber_to_fiber_db` is the right column.
- Proposed: append to the notes "Coupler type (GC or EC) for the 17.7 dB not stated."

**F9 (minor). Keysight Technologies Deutschland GmbH (new org): accepted as written; parent link optional.**
- The affiliation (li2026b p.1) is "Keysight Technologies Deutschland GmbH, 71034 Böblingen, Germany". It is a distinct legal entity, so convention (e) supports the name as printed. Type company, DE, europe: correct.
- "Keysight Technologies" (US) exists only in staging (p5_04), not in `data/organizations.csv`.
- Optional: set `parent_org` to "Keysight Technologies" after p5_04 merges.

## Verified clean

- **kotz2026**
  - Vpi 0.79 V (780/790 mV for the two nested MZMs, larger entered, frequency unstated, noted).
  - `drive_vpp_v` 1.1 lt ("below 1.1 V", p.3); length 1 mm; wavelength 1550.
  - From Fig. 1(b) crop: slab 90 nm (arrows bracket the slab), rail 220 nm, slot 160 nm.
  - Si substrate/BOX; Al electrodes; SOXD123 cladding; max_baud 200.
  - Formats: NGMI 0.857; AIR 712 Gbit/s at 192 GBd and 743 Gbit/s at 144 GBd; CSNR 17.2 to 11.5 dB; 0.7 dB penalty.
  - AIR correctly not entered as net rate. Foundry correctly empty ("industry-standard silicon photonic foundry process"). Org reuse (KIT, SilOriX GmbH) correct.
- **cai2026**
  - IL 1.5 dB at 1600 nm (Fig. 2(a): about -1.4 to -1.5 dB at 1600 nm; about -2.3 dB at 1590 nm, matching "below 2.3 dB").
  - Device 2: IL below 6.3 dB (lt; Fig. 2(b) about -6.3 dB at 1590 nm). ER 3 dB and 7.5 dB static at 7 V (Fig. 2: about 3.1 and about 7.4).
  - 1 dB drop at 110 GHz at 4 V; 110 GHz LCA; bw3db_reference dc derived (traces start at 0 dB).
  - -1 dBm input; 150 GBd / 300 Gb/s PAM-4 (TDECQ 4.46 dB); NRZ 120 Gb/s with SNR 5.44-5.70; -1.8 V bias.
  - Rows split by Ge length; fab empty; Zhangjiang Laboratory and Fudan University reuse.
- **li2026b**
  - 1563 nm; IL 3.5 dB at 0 V on-chip (grating couplers 4.5 dB each and 4 dB self-heating excluded, p.2); static ER 3.1 dB at -2 V.
  - 1.4 Vpp: Fig. 1(a) places the 1.4 Vpp marker after the electrical amplifier "EA" (legend on poster p.4), so the driver note is right.
  - 160 GBd, net 300 Gb/s; BER 4.22e-3 / 4.36e-3; bw_measured_to 67 (trace ends about 67.3 GHz).
  - foundry imec ("fabricated using imec's ISIPP50G PDK", acknowledgement); 14-author list from p.1 (poster adds Toms Salgals, noted).
  - Countries SE;DK;LV;DE;BE;CN. New orgs KTH Royal Institute of Technology and University of Copenhagen correct. Riga Technical University and RISE rows are content-identical to p5_07 staging (p5_09 file has CRLF line endings like the canonical tables; p5_07 has LF; fields identical).
- **taghavi2026a**: identity, affiliations and license are correct. The values themselves are correct (see F1); only their duplication is the defect.
- **zhang2026a**
  - 0.5 mm and 1 mm rows correctly split. GSGSG push-pull stated (drive push_pull measured). 2.4 Vpp differential AWG, no RF amplifier shown.
  - Net rates 330/330/358/414/403 Gb/s with stated FEC; max_baud 224; max_net 414.
  - Fig. 1(b) combined Tx/probe/PD spectrum correctly not entered as EO bandwidth.
  - HTOL details; wavelength 1550 approx; Polaris Electro-Optics, Inc. and McGill University reuse; foundry empty ("standard commercial foundry process").
- **qiu2026a**
  - IL 14.5 dB fiber-to-fiber per polarization; drive differential ("true differential push-pull RF interface").
  - 125 GBd DP-32QAM / 105 GBd DP-64QAM, net 1 Tb/s approx; 120 GBd DP-16QAM BER 6e-3 and 6.3e-3; 85 C.
  - length_mm correctly empty (3 mm is the die). foundry_or_fab Lumiphase AG ("fabricated by Lumiphase", p.1).
  - A different paper from qiu2026 (Th4B.3, DR4 MZM), so not a duplicate.
- **All papers**
  - Titles, author lists, DOIs, venues and paper codes match PDF page 1 and the batch row.
  - source_type conference; access unknown; license publisher-copyright with license_notice context value; redistribution restricted_local_only.
  - repro_grade C (no sim-eligible geometry); audit_status needs_audit; verified_on 2026-10-04.
  - No sim configs (correct for SOH, Ge EAM, ring, FenGlass slot, and BTO package without geometry).
