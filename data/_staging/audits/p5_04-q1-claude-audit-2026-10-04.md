---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_04
date: 2026-10-04
scope: data/_staging/p5_04 (huang2026, shen2026, starnault2026, su2026, tobing2026); papers.csv, devices.csv (7 rows), organizations.csv (5 new orgs), evidence/*.yaml; no sims/<id>/ configs exist for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: no blocking defect; 4 papers pass after corrections, su2026 passes; 4 numerical corrections (huang2026 bandwidth bounds x2, tobing2026 ER attribution and buffer oxide)
findings: {blocking: 0, numerical: 4, metadata: 2, minor: 6}
---

# Q1 audit (fresh context): p5_04

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), column definitions), `data/_staging/BATCH_INSTRUCTIONS.md`. Format skimmed from `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md`.
- Dumped every populated cell of the 7 staged device rows, the 5 papers.csv rows, the 5 staged orgs and all 80 evidence entries.
- Read all of `references/<id>/text.md` for the five papers (3 pages each). Checked `source.json` for all five and `crossref.json` for su2026, the only paper that has one. Identity was checked against the PDF first page and `data/_staging/batches/p5_04.csv`.
- Opened these renders and images: huang2026 page_02 and img_p02_1 (Fig. 1(c)-(e)), img_p03_1 (Fig. 2(a)); shen2026 page_03 and img_p03_1 (Fig. 3(a)-(f)); starnault2026 page_03 (Fig. 2(a)-(j)); su2026 img_p02_1 (Fig. 2) and img_p03_1 (Fig. 3); tobing2026 page_03 and img_p03_2 (Fig. 3, Fig. 4). Curve readings for huang2026 Fig. 1(c) and shen2026 Fig. 3(c) used pixel colour tracing in a scratchpad script, calibrated on grid lines (huang: 0 dB frame and the -5/-10 dB grids; shen: 0 and -5 dB ticks plus the -3 dB dashed line). All figure readings below are mine and approximate (about +/-0.2 dB, +/-2 GHz).
- Mechanical check (scratchpad script): every populated evidence-required cell has an evidence entry with an equal value (0 missing, 0 mismatches). No evidence entry exists for an empty cell. There are no duplicate (device_id, field) keys. All bases are in the enum, every unit equals the schema unit, every qualifier sits on a populated field, enum cells are valid, and no evidence note exceeds 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p5_04` (dry run): `merge counts: {'papers': 5, 'devices': 7, 'orgs': 5, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after finishing my own verification.

Limits: these are 3-page OFC papers with no supplementary material. Crossref records are absent for huang2026, shen2026, starnault2026 and tobing2026 (see F7). Fig. 2(a) of huang2026 and Fig. 3(a) of shen2026 are schematics, not to scale.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| huang2026 | 2 | pass after corrections | F1, F2 (numerical); F7 (metadata); F8 (minor) |
| shen2026 | 1 | pass after corrections | F7 (metadata); F3, F9 (minor) |
| starnault2026 | 2 | pass after corrections | F6, F7 (metadata); F12 (minor) |
| su2026 | 1 | pass | F10 (minor) |
| tobing2026 | 1 | pass after corrections | F4, F5 (numerical); F7 (metadata); F11 (minor) |

## Findings

### Blocking

None.

### Numerical

**F1. huang2026-b `bw3db_ghz` qualifier `gt` is not supported by the plotted trace; `bw_measured_to_ghz` missing.**
- Current: `bw3db_ghz` 100, `qualifiers` `bw3db_ghz:gt;il_fiber_to_fiber_db:lt`, `bw_measured_to_ghz` empty. The evidence note says "S21 axis extent not read as a measurement limit".
- Source: p.2 Sec. 2 says "after packaging, the measured 3-dB electro-optic bandwidth consistently remains above 100 GHz". The abstract says "bandwidth over 100 GHz". But p.1 Sec. 1 says "we realize a 100-GHz TFLN-based CPO engine" and p.3 Sec. 4 says "a CPO engine with a bandwidth of 100 GHz".
- Fig. 1(c) (p.2, img_p02_1), my reading: the solid "S21 after packaging" trace first touches about -3.0 dB near 80-88 GHz. From about 88 GHz to the end of the data (about 110 GHz) it sits at about -2.9 to -3.5 dB, with ripple. At 90-98 GHz it reads about -3.1 to -3.5 dB, and at 110 GHz about -3.1 to -3.5 dB. The "consistently above 100 GHz" wording is not borne out within reading error. The trace hovers at -3 dB from about 88 GHz on.
- Proposed change:
  - Change `qualifiers` to `bw3db_ghz:approx;il_fiber_to_fiber_db:lt`. This uses the paper's own "100-GHz" / "bandwidth of 100 GHz" wording; keep `bw3db_ghz` 100 and `bw_basis` measured.
  - Set `bw_measured_to_ghz` = 110 with an evidence entry {basis: extracted_from_figure, locator: "p.2, Fig. 1(c)", note: "S21 data end at about 110 GHz (axis extent)"}.
  - Update the bw3db evidence note: "'above 100 GHz' (Sec. 2) vs '100 GHz' (Sec. 1, 4); Fig. 1(c) trace about -2.9 to -3.5 dB from 88 to 110 GHz".
  - Row note: replace "3 dB EO bandwidth above 100 GHz after packaging" with "3 dB about 100 GHz; Fig. 1(c) packaged trace near -3 dB from about 88 GHz (auditor reading); paper also says 'above 100 GHz'".

**F2. huang2026-a: a claimed crossing at the end of the measured range needs `bw_measured_to_ghz`.**
- Current: `bw3db_ghz` 110 with no qualifier, `bw_measured_to_ghz` empty.
- Source: p.2 Sec. 2 says "Before packaging, the EOM exhibits a 3-dB electro-optic bandwidth of 110 GHz"; p.1 says "Using a 110-GHz TFLN chip". In Fig. 1(c) the dashed "S21 before packaging" trace ends at about 110 GHz at about -2.3 to -2.6 dB (my reading), so no -3 dB crossing is visible.
- Convention (c): "A claimed crossing at the instrument limit fills bw3db_ghz ... and bw_measured_to_ghz."
- Proposed change: keep `bw3db_ghz` 110. Set `bw_measured_to_ghz` = 110 with an evidence entry {basis: extracted_from_figure, locator: "p.2, Fig. 1(c)", note: "data end at about 110 GHz; dashed trace about -2.5 dB there, no crossing visible"}. Append to the row note: "Fig. 1(c) pre-packaging trace ends near -2.5 dB at 110 GHz."

**F4. tobing2026-a `extinction_ratio_db` 40 / `er_type` static comes from a different, passive structure and is a best-case "up to" value.**
- Current: `extinction_ratio_db` 40, `er_type` static, `extinction_ratio_db:approx`, evidence locator "p.3, Sec. 3; Fig. 4(d)".
- Source, p.3: "Fig. 4(d) shows the spectral response of TFLN MZI with unbalanced arms in SiN layer, exhibiting up to ~40dB extinction ratio". The next sentences describe "the TFLN MZI modulator with 7 mm arm length and 4 um metal gap" (Fig. 4(e)) and "the same MZI modulator" (Fig. 4(f)). "Same" is used only to link (e) and (f), and the 7 mm modulator is not described as unbalanced.
- Fig. 4(d), my reading: fringe depth grows with wavelength, from about 25 dB at 1540-1550 nm to about 40-42 dB at 1620-1630 nm. "Up to ~40 dB" is therefore the best fringe of a wavelength-scanned passive interferometer, not a static (voltage-swept) ER of the 7 mm modulator.
- Proposed change: empty `extinction_ratio_db` and `er_type`, and remove `extinction_ratio_db:approx` from `qualifiers` (leaving `bw3db_ghz:approx`). Delete the two evidence entries. Keep the fact in the row note: "Passive unbalanced-arm TFLN MZI (Fig. 4(d)) shows fringe extinction up to ~40 dB; not the 7 mm modulator's ER."

**F5. tobing2026-a `buffer_oxide_um` 0.5 places the TFLN die's thermal oxide under the LN, which the paper does not state and the process flow argues against.**
- Current: `buffer_oxide_um` 0.5 (evidence "500 nm thermal oxide of the bonded TFLN die", p.2 Sec. 2.2). `epitaxy_or_stack` says "TFLN die (350 nm LN on 500 nm thermal oxide) die-to-wafer bonded, handle removed".
- In this project `buffer_oxide_um` is the oxide under the LN film (for example `data/evidence/chen2022.yaml`: "buried oxide (BOX) under the LN film").
- Source, p.2 Sec. 2.2: LNOI dies with a 725 um Si substrate are bonded, "Silicon substrate is then removed", and "350-nm thick TFLN with 500 nm-thick thermal oxide film have been successfully bonded". Fig. 3(f) TEM shows the LN WG directly over the SiN WG.
- Removing the Si handle after bonding implies the LN side faces the SiN wafer, which would put the 500 nm oxide above the LN. This is my inference; the paper states the oxide's position in neither direction. The oxide between LN and the SiN wafer is not given.
- Proposed change:
  - Empty `buffer_oxide_um` and delete its evidence entry.
  - Reword `epitaxy_or_stack` (CSV and evidence) to "... TFLN die (350 nm LN with 500 nm thermal oxide; oxide position after bonding not stated) die-to-wafer bonded, Si handle removed; ...".
  - Add to the notes: "Oxide thickness between LN and SiN not stated."

### Metadata

**F6. starnault2026-a/-b `vpi_convention` mzm_differential asserts an MZM-level meaning the paper does not give.**
- Current: `vpi_convention` mzm_differential (evidence basis derived, note "MZM-level meaning inferred"), `drive` dual_drive (derived), `vpi_dc_v` 2.2 (measured).
- Source, p.1 Sec. 2: the BW-MZM drives "the two MZM arms ... independently by different differential logic-level signals" with "a local differential electrode pair (S+/S-) per waveguide". The output amplitude "depends on (V1 - V2)/2", and in the push-pull comparison "V1 = -V2". p.2 Sec. 3 says "The BW oDACs have a simulated 6 dB bandwidth well exceeding 100 GHz and a low-MHz differential Vpi of 2.2V".
- "Differential Vpi" here can mean the differential voltage on one arm's S+/S- pair (per-arm) or an MZM-level value (push-pull, V1 = -V2). The paper does not say which, and the two differ by about 2x.
- `drive` dual_drive is a sound inference: arms are independently driven.
- Applying one sentence to both rows is supported by the plural "The BW oDACs".
- Treating Vpi as measured is defensible, because "low-MHz" implies a measurement and "simulated" grammatically attaches to the bandwidth.
- Proposed change: set `vpi_convention` to unspecified on both rows. Change both evidence entries' notes to "authors' 'differential Vpi'; per-arm S+/S- pair vs MZM-level (V1=-V2) not stated". Keep `drive` dual_drive.

**F7. Licence claims for four papers lack `crossref.json` and an evidence-file quote (convention (k)).**
- Current: huang2026, shen2026, starnault2026 and tobing2026 have `license` publisher-copyright and `redistribution` restricted_local_only. `references/<id>/` contains no `crossref.json` (only su2026 has one). The page notice is quoted only in papers.csv `notes`.
- Convention (k): "Every published_on, license and redistribution claim needs references/<id>/crossref.json (or the paper's own notice quoted in the evidence note)."
- Source: every page footer reads "Optical Fiber Communication Conference (OFC) (c) 2026 Optica Publishing Group". The starnault2026 and tobing2026 abstracts also carry "(c) 2026 The Author(s)".
- restricted_local_only is the correct outcome either way.
- Proposed change: preferred, the coordinator prefetches `crossref.json` for the four DOIs (`scripts/prefetch_batch.py`). Alternatively, add to each paper's evidence file a note entry quoting the footer notice (for example on the first device row, field `notes`, locator "p.1-3 footer"). Leave `published_on` empty (correct).

### Minor

**F3. shen2026-a: the bandwidth evidence note "curve not read as crossing" is wrong. The values themselves are justified.**
- Current: `bw3db_ghz` 100 `gt`, `bw_measured_to_ghz` 110, `bw_basis` measured. The evidence note says "3 dB bandwidth exceeding 100 GHz at 1064 nm; curve not read as crossing".
- Fig. 3(c) (p.3, img_p03_1), my reading:
  - The red "Fitted" curve crosses -3 dB at about 105-106 GHz and ends at about -3.9 dB at 110 GHz.
  - OSA points at 95-110 GHz scatter between about -2 and -3.5 dB, with the 110 GHz point at about -3.5 dB.
  - The "Simulated" line stays at about -2.4 dB.
- So a crossing does occur inside the measured range, but above 100 GHz. "Exceeding 100 GHz" (p.2 Sec. 4, abstract ">100 GHz") is a true lower bound, so `gt` 100 is justified under convention (c), with `bw_measured_to_ghz` 110 as the range.
- BATCH_REPORT's "fit ends near -3.5 dB" is within reading error of my numbers, but the row note does not carry it.
- Proposed change: evidence note to "'exceeding 100 GHz'; Fig. 3(c) fit crosses -3 dB near 105 GHz, VNA+OSA data to 110 GHz". Add to the row note: "Fit crosses -3 dB at about 105 GHz (auditor reading); the 110 GHz OSA point is about -3.5 dB."

**F8. huang2026-a/-b `device_class` other: the paper's own schematic shows a Mach-Zehnder.**
- Source: Fig. 2(a) (p.3, img_p03_1) draws the TFLN chip as a two-arm interferometer with input/output splitters and one RF electrode fed by the GaN PA. The text says only "TFLN EOM", alongside "V_pi of 4 V".
- Proposed change (judgment): `device_class` mzm on both rows. Add to the notes: "MZ layout from the Fig. 2(a) schematic; the text says only 'EOM'". Drop the "EOM type (MZM vs phase modulator) is not stated" sentence from the papers.csv note. If the coordinator prefers text-only evidence, keep other.

**F9. shen2026-a `integration` bonded_heterogeneous describes the laser, not the modulator.**
- The MZM is a monolithic TFLN rib device on LNOI (p.2 Sec. 2; Fig. 3(a)). GaAs gain layers are bonded onto the processed TFLN wafer for the lasers and SOA.
- Precedent: shamsansari2021-a (flip-chip DFB plus TFLN modulator) is `monolithic`, with the laser in tags.
- Proposed change: `integration` monolithic. Keep the tag gaas_on_tfln.

**F10. su2026-a: the on-chip loss arithmetic in the source does not close.**
- p.2 Sec. 3 gives "total insertion loss ... 11.81 dB, while the on-chip propagation loss is 0.86 dB ..., with each grating coupler contributing 5.45 dB". 11.81 - 2 x 5.45 = 0.91 dB, not 0.86 dB. The paper does not say how 0.86 dB was obtained.
- `il_onchip_includes` says "on-chip propagation loss of the 1 mm device"; the paper does not tie 0.86 dB to the 1 mm length.
- Proposed change: set `il_onchip_includes` to "not itemised; text calls it on-chip propagation loss". Add to the row note: "Source arithmetic: 11.81 - 2x5.45 = 0.91 dB vs stated 0.86 dB."
- The values, the il_onchip vs fiber-to-fiber split and the excludes text are otherwise correct.

**F11. tobing2026-a bandwidth note.**
- Fig. 4(f) (p.3), my reading: the normalized S21 starts at 0 dB, dips to about -3 dB near 2-3 GHz, recovers to about -0.7 dB near 10 GHz, then crosses -3 dB again at about 22-25 GHz. The data run to about 67 GHz (about -9 dB).
- `bw3db_ghz` 20 `approx` (text "~20 GHz") is acceptable.
- Proposed change: add to the row note "Fig. 4(f): low-frequency dip to about -3 dB near 2-3 GHz; trace to about 67 GHz (auditor reading)."

**F12. starnault2026-b `modulation_format` wording merges two reach/FEC pairs.**
- Current: "DP-16-QAM 125 GBd over 10 km (net 800 Gb/s, c-FEC/HD-FEC)".
- Source (p.2-3 Sec. 4): "800 Gbps (dual-polarization 125 Gbaud) under the 6.7% overhead HD-FEC (10 km) and c-FEC (20 km) BER limit".
- Proposed change (CSV and evidence): "DP-16-QAM 125 GBd (net 800 Gb/s; HD-FEC at 10 km, c-FEC at 20 km)".

## Verified clean

- **Identity.** Titles, author lists (as printed; "Daneil Lopez" as printed in shen2026), year, venue strings with OFC codes, DOIs and URLs match the PDF first pages and the batch CSV. su2026 matches `crossref.json` (title, 4 authors, 2026, proceedings-article, no license). `source_type` conference, `access` unknown, `cache_status` full_extract, `audit_status` needs_audit, `published_on` empty (schedule date not confirmed), all as per the existing OFC 2026 pattern.
- **Organizations:**
  - Reused names match `data/organizations.csv` exactly: Shanghai Jiao Tong University, Wuhan ANPI Optoelectronics Company Ltd, McGill University, HyperLight (printed "HyperLight Corporation"), Ciena Corporation, National University of Singapore, Institute of Microelectronics (printed "Institute of Microelectronics (IME), A*STAR").
  - The 5 new orgs are correct against p.1 affiliations:
    - Chongqing University (university, CN, east_asia).
    - Nexus Photonics (company, US; Goleta CA).
    - Northeastern University (university, US; affiliation address Oakland CA).
    - Keysight Technologies (company, US; Santa Clara CA address as printed).
    - National Semiconductor Translation and Innovation Centre (research_institute, SG, southeast_asia; 4 Fusionopolis Way). research_institute is a reasonable type; facility would also be defensible under (e).
  - Countries: CN, US, CA;US, CN, SG. `foundry_or_fab` is correctly empty for all five; tobing2026's "our in-house 200 mm BEOL fabrication facilities" names no facility.
- **repro_grade C and no sim config for all five.** Correct: none discloses electrode gap and width plus BOX for a TWE model. su2026 rib width could be digitized from the Fig. 2(f) AFM (top about 1.2-1.3 um), but the gap is not given.
- **huang2026-b:**
  - `vpi_dc_v` 4: p.2, "a V_pi of 4 V"; frequency not stated, as the note says.
  - `il_fiber_to_fiber_db` 4.2 `lt`: "less than 4.2 dB" for the packaged EOM after fibers are attached. The fiber-to-fiber mapping is reasonable and its definition caveat is in the evidence.
  - `wavelength_nm` 1550.12 and c_band: from the T/F demo.
  - The 94 GHz / 24 dBm RF tone is kept out of `drive_vpp_v`.
  - Simulated 200 GHz packaging bandwidth and 0.5 dB interconnect loss are not entered as device values. `drive`/`vpi_convention` unspecified carry derived entries.
- **shen2026-a:**
  - `vpi_dc_v` 3.1: Fig. 3(d) label "3.1 V", 2 MHz, null bias. 3.1 V x 0.58 cm = 1.80 V cm, which matches the stated `vpil_dc_vcm` 1.8 (authors' extraction, derived).
  - Geometry matches the text and the Fig. 3(a) labels: `length_mm` 5.8, film 360 nm, etch 180 nm, slab 180 nm label, sidewall ~62 deg `approx`, 900 nm Au, cl_twe ("capacitively loaded electrodes").
  - System results: `max_line_rate_gbps` 160 (PAM4), NRZ 100 Gb/s SNR 14.61 dB, TDECQ 0.04 dB, setup attenuation ~20 dB at 50 GHz.
  - Laser metrics are correctly not entered as modulator values.
- **starnault2026:**
  - `bw6db_ghz` 100 `gt` simulated ("simulated 6 dB bandwidth well exceeding 100 GHz"); no measured EO S21 is reported.
  - `wavelength_nm` 1310.
  - `extinction_ratio_db` 3.76 dynamic on the BW-MZM row: text and the Fig. 2(g) label (225 GBd PAM4, 2 km, BER 1.51e-3).
  - `max_baud_gbd` 225 (-a) and 187.5 (-b). Fig. 2(a) shows 16-QAM points to 200 GBd, but only 187.5 GBd is claimed under 25% SD-FEC.
  - `max_net_rate_gbps` 540 / 1200 with basis derived (authors' net-rate computation, per (h)).
  - The 448 Gbps headline is left out of `max_line_rate_gbps`. It is a class label: 225 GBd x 2 = 450 Gb/s and the paper states no line rate. This is acceptable.
  - Dual polarization is emulated, as noted.
- **su2026-a:**
  - `vpil_dc_vcm` 1.3 (100 kHz sawtooth, Fig. 3(c) label).
  - `bw3db_ghz` 110 `gt` with `bw_measured_to_ghz` 110: the LCA limit is stated, and in Fig. 3(d) S21 stays within about +/-1 dB to 110 GHz.
  - `il_fiber_to_fiber_db` 11.81 is the total with both gratings, and `il_onchip_excludes` names the gratings.
  - `prop_loss_db_per_cm` 8.2 derived ("calculated" from the ring Q).
  - Geometry from the text and Fig. 2(f) AFM: film 400 nm, etch 200 nm, sidewall 64.37 deg, Ti/Au 20/400 nm, x-cut, 300 nm PECVD CaTiO3 cladding.
  - `drive` push_pull: stated, "GSG electrode structure in a push-pull configuration". `vpi_convention` mzm_push_pull is derived with a note.
  - Vpi 13 V is kept in `derived` only, not in the CSV.
- **tobing2026-a:**
  - `vpi_dc_v` 4.14: Fig. 4(e) label, from response maximum at about -0.6 V to minimum at about 3.5 V. 4.14 V x 0.7 cm = 2.90 V cm, which matches the stated VpiL 2.9 (derived).
  - `length_mm` 7 ("7 mm arm length"), `electrode_gap_um` 4, `eo_film_thickness_nm` 350, and the Al with Ti/TiN metallization (evidence note flags that it is the via-fill scheme).
  - band cl_band, with wavelength left empty (not stated).
  - Wafer-level TFLN and SiN losses and the SSC 0.4 dB/transition are kept in notes, not in device loss columns.
- **Mechanical:** 0 missing or mismatched evidence values, units equal the schema, bases are in the enum, qualifiers sit on populated fields, and all evidence notes are 25 words or fewer. The merge dry run reports 0 conflicts and 0 validation errors.
