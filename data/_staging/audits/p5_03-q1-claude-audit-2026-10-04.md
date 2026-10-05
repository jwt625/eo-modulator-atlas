---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_03
date: 2026-10-04
scope: data/_staging/p5_03 (sobu2026, weckenmann2026, yang2026, yin2026, aimone2026); papers.csv, devices.csv (7 rows), organizations.csv (empty), evidence/*.yaml (4 files); no sim configs exist for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: no blocking defect; weckenmann2026 and aimone2026 pass after corrections (numerical), yang2026 pass after a metadata correction, sobu2026 and yin2026 pass (minor notes only)
findings: {blocking: 0, numerical: 3, metadata: 1, minor: 4}
---

# Q1 audit (fresh context): p5_03

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), column definitions, units, enums), `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- I dumped every populated cell of the 7 staged device rows, the 5 papers rows and the 4 evidence files. I read `references/<id>/text.md` in full for all 5 papers and `source.json` for all 5. No `crossref.json` exists for any of them (OFC 2026 3-page papers). Identity was checked against the PDF first page, the page footers (paper codes W3F.4, M1B.3, M2A.6, M2A.1, M4D.4) and `data/_staging/batches/p5_03.csv`.
- Renders opened: weckenmann2026 p.3 (Fig. 2(a)-(e)); yang2026 p.2 (Fig. 1, Fig. 2(a)-(e)) and p.3 (Fig. 3(b)-(f)); yin2026 p.1 (Fig. 1(b), 1(e)) and p.2 (Fig. 2(c), 2(d), Fig. 3(b)-(f)); aimone2026 p.2 (Fig. 1(b), 1(d)), with an enlarged crop of Fig. 1(b) from `img_p02_1.png`, and p.3 (Fig. 2(a), 2(b)). All figure readings below are my own and approximate.
- Mechanical check (throwaway scratchpad script) over the 7 rows and 80 evidence entries: every non-empty evidence-required cell has an entry with an equal value (0 missing, 0 mismatches). There is no evidence entry for an empty cell, no duplicate (device_id, field), no qualifier on an empty field, every basis is in the enum, entry units equal the schema units, and no note exceeds 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p5_03` (dry run) output: `merge counts: {'papers': 5, 'devices': 7, 'orgs': 0, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- `BATCH_REPORT.md` was read only after the steps above.
- Limits: there is no Crossref record, so license, published_on and venue cannot be checked against Crossref. The batch CSV venue/DOI strings agree with the footer paper codes. The cited earlier work for weckenmann2026 (ref. 11, arXiv 2509.20584) is not cached, so I could not check the quoted device metrics against it.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| sobu2026 | 0 (papers row only) | pass | F8 (minor) |
| weckenmann2026 | 1 | pass after corrections | F1, F2 (numerical) |
| yang2026 | 1 | pass after corrections | F4 (metadata) |
| yin2026 | 4 | pass | F6 (minor) |
| aimone2026 | 1 | pass after corrections | F3 (numerical), F5, F7 (minor) |

## Findings

### Blocking

None.

### Numerical

**F1. weckenmann2026-a: device metrics quoted from the authors' earlier work are entered as this paper's measurements.**
- Files and cells: `data/_staging/p5_03/devices.csv` row weckenmann2026-a, columns `q_loaded` = 5300, `extinction_ratio_db` = 10.7 (`er_type` static), `bw6db_ghz` = 54 (`bw_basis` measured). Evidence entries are in `evidence/weckenmann2026.yaml` with basis `measured` and notes "quoted from ref. 11".
- Source: p.1, Sec. 2: "Each modulator features a quality factor of 5,300, a 10.7-dB resonance depth, and a 54-GHz 6-dB EO bandwidth, within a 100-um footprint [11]". Ref. 11 is the same group's arXiv:2509.20584. This paper shows no spectrum, no EO response and no Q measurement. Its figures are BER, net rate, the super-channel spectrum and constellations only.
- Why it matters: rule 1 says a number comes from this paper's own results. With basis `measured`, the atlas plots 54 GHz, Q 5300 and ER 10.7 dB as weckenmann2026 measurements. If ref. 11 is ingested later, the same device is counted twice. The basis enum has no "cited" value, and the evidence note does not reach the plots.
- Proposed change: empty `q_loaded`, `extinction_ratio_db`, `er_type`, `bw6db_ghz` and `bw_basis` on weckenmann2026-a. Delete the three matching evidence entries. Keep the values in `notes`, which already say they come from ref. 11. Ref. 11 goes on the candidate list for its own paper row.

**F2. weckenmann2026-a: system symbol rate and net rate are two-modulator aggregates on a single-device row.**
- Cells: `max_baud_gbd` = 220 and `max_net_rate_gbps` = 612.9 (basis derived).
- Source: p.1, Sec. 2: "110 GBaud per subcarrier (220 GBaud total), two identical chips are combined off-chip". p.2, Sec. 3 and Fig. 2(b): 612.9 Gb/s at 190 GBd total for 16-QAM. My arithmetic is 190 x 4 / 1.24 = 612.9, so the net rate is the two-subcarrier total. Each I/Q modulator was driven at no more than 110 GBd.
- Why it matters: device-level plots such as baud vs bandwidth would show a single ring-assisted I/Q modulator at 220 GBd. That is twice the symbol rate any one device carried. The row label and notes disclose the aggregate, but the cells are what get plotted.
- Proposed change: set `max_baud_gbd` = 110 and change its evidence entry to value 110, locator "p.1, Sec. 2", note "per subcarrier per chip; 220 GBd super-channel total". Empty `max_net_rate_gbps` and delete its evidence entry. Keep "612.9 Gb/s per polarization, two-chip super-channel total" in `modulation_format`/`notes`. A per-modulator net rate is not stated, and 306.45 would be distiller arithmetic. Alternative, if the coordinator keeps the row as a "transmitter" record: keep both aggregates but add tag `aggregate_two_devices` so views can exclude it from per-device plots.

**F3. aimone2026-a: Vpi 3.26 V and VpiL 1.1 V cm in one row with different, unreconciled drive references.**
- Cells: `vpi_dc_v` = 3.26 (measured), `vpil_dc_vcm` = 1.1 (derived), `length_mm` = 7.5, `vpi_convention` = unspecified, `drive` = differential, `vpi_basis` = measured.
- Source: p.1, Sec. 2. The TWE "can be characterized stand-alone" in a standard GSG fashion. "The Vpi of the modulator is measured to be 3.26 V, which translates to a very low VpiL = 1.1 Vcm referenced to the single-ended signal thanks to the push-pull differential drive." The abstract headline is VpiL 1.1 V cm.
- Check: 3.26 V x 0.75 cm = 2.45 V cm. Halving it for the doubled differential voltage gives 1.22 V cm. 1.1 V cm would need Vpi = 1.47 V at 7.5 mm. Neither number follows from the other under any stated convention. The context implies that 3.26 V is a stand-alone (GSG, push-pull) measurement and that 1.1 V cm is a drive-scheme-referenced figure of the assembly. The row puts both under one `vpi_convention` (unspecified) with `drive` = differential, so a reader would take 3.26 V as the differential-drive Vpi. The notes disclose the inconsistency, but rule 4 ("never mix ... definitions silently") and convention (a) put one convention per row.
- Proposed change (recommended, single row): keep `vpi_dc_v` = 3.26 and set `vpi_convention` = mzm_push_pull. Add a `vpi_convention` evidence entry with basis derived, locator "p.1, Sec. 2", note "stand-alone GSG characterization implied; authors do not state the Vpi drive explicitly". Empty `vpil_dc_vcm` and delete its evidence entry, so build_views derives 2.45 V cm and flags it derived. Put "authors' VpiL 1.1 V cm referenced to single-ended signal under differential drive; not reproducible from 3.26 V and 7.5 mm" in notes. `drive` = differential can stay, since it describes the system demo, but add to the notes that the Vpi was not measured under that drive.
- Alternative: split the row. -a would be the stand-alone MZM (Vpi 3.26, mzm_push_pull, bw over 67 GHz). -b would be the IC-MZM assembly (`vpil_dc_vcm` 1.1, `vpi_convention` mzm_differential, `vpi_basis` derived, `drive` differential, plus the system columns). -b would then carry a value that cannot be tied to a measured Vpi, so I recommend the single-row fix.

### Metadata

**F4. yang2026-a: `il_onchip_excludes` is empty although the paper states the exclusion.**
- Cells: `il_onchip_db` = 2.4 (median, measured). `il_onchip_excludes` and `il_onchip_includes` are empty.
- Source: p.2, Fig. 2(b) caption, "Wafer-level measurement results of insertion loss (excluding grating coupler)"; p.2-3 text, "A median IL of 2.4 dB is obtained excluding the grating couplers".
- Proposed change: `il_onchip_excludes` = "Grating couplers (input and output); wafer median over dies, about 1.6-3.7 dB individually". The die range is my approximate reading of the Fig. 2(b) map.

### Minor

**F5. aimone2026-a: bandwidth reference and how close the trace comes to -3 dB.**
- Cells: `bw3db_ghz` = 67 with `bw3db_ghz:gt`, `bw_measured_to_ghz` = 67, `bw3db_reference` = unspecified.
- Source: Fig. 1(b) (p.2; enlarged crop of `img_p02_1.png`). The measured S21 is normalized to its peak near 4-5 GHz (0 dB). The lowest-frequency point sits at about -1.2 dB. The trace runs to about 66-67 GHz with noise dips to about -3 dB near 59-60 and 64 GHz, and the smoothed level is about -2.3 dB at 60-67 GHz (all approximate). The EM-simulated dashed curve continues to 110 GHz and is correctly not used. The authors state "exceeds 67 GHz, limit of the measurement equipment".
- Assessment: the gt bound follows the authors' statement and convention (c); with respect to the DC end, the drop is only about 1 dB. No change to cells.
- Proposed change: add to notes "S21 normalized to its ~5 GHz peak; noise dips reach about -3 dB near 60 GHz (Fig. 1(b), approx.)".

**F6. yin2026-a: the strong inductive peaking behind the bound is not noted.**
- Source: Fig. 2(d) (p.2). The with-inductor trace rises to about +4 dB near 50-55 GHz and returns to about 0 dB at 67 GHz (approximate). There is no -3 dB crossing, so `gt` 67 is correct.
- Proposed change: add to notes "Inductor response peaks about +4 dB near 55 GHz (Fig. 2(d), approx.)". No cell change.

**F7. aimone2026-a: energy note wording.**
- Evidence note on `energy_per_bit_fj` = 1400 says "includes driver power". 605 mW per channel / (140 GBd x 3 b) = 1.44 pJ/bit (my arithmetic), so the 1.4 pJ/bit is the driver IC power on the gross rate.
- Proposed change: reword the note to "Authors: IC-MZM assembly energy on gross rate; equals driver IC power 605 mW / 420 Gb/s".

**F8. sobu2026: notes wording on Table 1.**
- papers.csv `notes` says "Table 1 lists other groups' prior optical-DAC transmitters". Table 1 (p.2) includes refs. [6] and [7], which are PETRA/Fujitsu work by the same first author.
- Proposed change: "Table 1 lists prior optical-DAC transmitters (refs. 3-7, including the authors' own), not entered."

## Verified clean

- **sobu2026, no-device-rows decision.** The paper's only results are a post-layout Spectre simulation of the 4-way interleaved CMOS driver chain: a 100 Gb/s NRZ eye and 3.45 pJ/bit (345 mW at VDD 0.945 V, dominated by the driver and the data/clock paths). The modulator appears only as a PIN-RC equivalent circuit (Fig. 2(b)). There is no modulator Vpi, bandwidth, IL or geometry, so the energy figure belongs to the transmitter electronics and not to a modulator device. Leaving the paper with no device rows is consistent with the batch rule. The papers row (identity, authors, PETRA and 1FINITY Inc. as existing orgs, JP, publisher-copyright/restricted_local_only, empty published_on, repro_grade empty, needs_audit) is correct.
- **weckenmann2026, other cells.** `drive` push_pull: p.1, "single-drive push-pull configuration". `drive_vpp_v` 2 with approx: the about-4 Vpp amplifier output gives 2 Vpp per MRM. `optical_input_power_dbm` 15 is the SOA output per modulator input, as noted. `band` o_band: the text says "O-band net bit rate", and the Fig. 2(c) spectra sit near 1306.5-1308 nm (approximate reading). The `modulation_format` thresholds agree with Fig. 2(a), 2(b) and 2(d). `device_class` iq_mzm matches geravand2025-b. The papers row (Université Laval, CA, COPL and the ECE department as research groups, grade C) is correct.
- **yang2026.**
  - Headline values: `bw3db_ghz` 94.7 is a wafer median with a real crossing. Fig. 2(e) dies run about 89.8-100.1 GHz, and the Fig. 2(d) traces cross -3 dB inside the 110 GHz axis, so there is no qualifier and `bw_measured_to_ghz` 110 is extracted_from_figure. `il_onchip_db` 2.4 is the median.
  - Vpi*L: `vpil_dc_vcm` 0.66 is derived. My check: 6 V x (FSR/2 = 2.02 nm / 0.92 nm) = 13.2 V, and x 0.05 cm = 0.66 V cm, so the authors' value follows from the Fig. 2(a) 0 V/6 V traces. Vpi and bias are correctly empty and the convention is unspecified.
  - Eye results: ER 4.3 dB dynamic (Fig. 3(b)); `max_baud_gbd` 150 (Fig. 3(e)); `max_line_rate_gbps` 400 per the text, with Fig. 3(f) labelled 405, as noted.
  - Device description: ng 16.3 is simulated. Length 0.5 mm, the doping values and lattice constant/widths agree with p.1-2. `drive` differential matches the GSSG electrode and the "differential-drive" wording.
  - Papers row: Zhangjiang Laboratory, CN, no fab named, grade C.
- **yin2026.**
  - Row split: -a has the inductor; -b, -c and -d are the same ring without the inductor at the -9, -6 and -3 dB IL detuning points. This follows convention (d), since these are distinct measured IL/bandwidth operating points, and the inductor version is a separate physical device (Fig. 2(a) vs 2(b)).
  - Bandwidths, from Fig. 2(c): -c (62 GHz) and -b (40 GHz) cross -3 dB, and the -d trace stays above about -2 dB to 67 GHz, so `gt` is correct. -a's `gt` is confirmed by Fig. 2(d). `bw_measured_to_ghz` 67 matches the 67 GHz VNA/OCA.
  - Eye ERs: 1.5 dB at 140 Gb/s NRZ (Fig. 3(d)), 1.9 dB at 100 Gb/s with inductor (Fig. 3(c)) and 1.8 dB without (Fig. 3(b)).
  - Static values: Q 2000 and FSR 17.1 nm (Fig. 1(e) shows resonances near 1309 and 1326 nm, approximate reading). Etch 130 nm and slab 90 nm are printed labels in Fig. 1(b).
  - Drive setup: 2 Vpp, 0 dBm on chip and 6 dB per facet match p.3.
  - IL convention: the ring IL is a detuning-point value with includes/excludes stated, consistent with the hsu2024 convention in `data/devices.csv`.
  - Empty cells: `max_baud_gbd` is correctly left empty.
  - Papers row: AMF named as fab ("fabricated by a 220 nm SOI MPW provided by advanced micro foundry"), affiliations, CN.
- **aimone2026, other cells.**
  - Device: `length_mm` 7.5, film 350 nm LN on Si, `electrode_type` cl_twe ("periodic capacitive loading"), `wavelength_nm` 1550 (Fig. 2(a) laser label).
  - System results: `max_baud_gbd` 180 (Fig. 2(b): PAM-4 NGMI about 0.95 at 180 GBd, above 0.8714). PAM-8 is above threshold at 140 GBd and below it at 160 GBd. `max_net_rate_gbps` 347 is derived (420 x 0.8262 = 347). Energy 1400 fJ/bit is derived.
  - Notes: the assembly's about 60 GHz bandwidth (Fig. 1(d)), the 35 ohm terminations, the 50 ohm design statement and the simulated 2.8 V swing are kept in notes only, which is correct.
  - Papers row: Nokia Bell Labs reused, countries DE;US, no fab named, grade C.
- **Papers, all five.** Titles and author lists match the PDF first pages. DOIs match the footer paper codes. source_type is conference and access unknown. The license `publisher-copyright` / `restricted_local_only` comes from the on-page Optica footer ("(c) The Author(s)" lines are not licenses). published_on is empty because there is no crossref.json (convention (k)). audit_status is needs_audit for all five, and verified_on is 2026-10-04.
- **Organizations.** The staged `organizations.csv` is empty. Every referenced org (Université Laval, Photonics Electronics Technology Research Association, 1FINITY Inc., Zhangjiang Laboratory, Shanghai Jiao Tong University, Fudan University, "Institute of Physics, Chinese Academy of Sciences", Advanced Micro Foundry, Nokia Bell Labs) exists verbatim in `data/organizations.csv`.
- **Sim configs.** None exist and none are required. Four papers are silicon or circuit papers, and aimone2026 is grade C with no electrode geometry.
