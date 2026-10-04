---
auditor: fresh-context subagent
task: Q1 audit of staged batch p4_03
date: 2026-10-04
scope: data/_staging/p4_03 (rahman2025, powell2024, zheng2026, cai2025, sayem2026c; papers.csv, devices.csv 16 rows, organizations.csv 1 row, evidence/*.yaml 5 files) plus sims/cai2025/config.yaml and sims/sayem2026c/config.yaml
mode: read-only (only this file written; no edits, no git, no network, no engine run)
verdict: no blocking defect; 2 papers pass, 3 pass after corrections; merge after F1-F4 are applied or explicitly dispositioned
findings: {blocking: 0, numerical: 1, metadata: 3, minor: 6}
---

# Q1 audit (fresh context): p4_03

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), columns, enums), `data/_staging/BATCH_INSTRUCTIONS.md`, `sims/SPEC.md` (target and provenance contract) and the target definition in `engine/schema/sim.schema.json`. The format follows `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md`.
- Dumped every populated cell of the 16 staged device rows, the 5 papers rows, the new organization and all 237 evidence entries.
- Read `references/<id>/text.md` in full for all five papers: abstract, body, captions, acknowledgements and every cached supplement (rahman2025 S1-S4, cai2025 S1-S5). Checked `crossref.json` for powell2024 and cai2025 and `source.json` for all five. rahman2025, zheng2026 and sayem2026c have no `crossref.json`.
- Opened these renders and read the numbers myself (all readings approximate):
  - rahman2025 p.4 (Fig. 2), p.5 (Fig. 3), p.7 (Fig. 4), p.13 (Figs. S2, S3)
  - powell2024 p.3 (Fig. 1(d),(e), Fig. 2)
  - zheng2026 p.9 and img_p09_1 (Fig. 4(f)-(h))
  - cai2025 p.4 (Fig. 2(c),(d)) and p.16 (Fig. S5)
  - sayem2026c p.2 (Fig. 1), p.3 (Fig. 2), p.4 (Fig. 3)
- Mechanical check (throwaway scratchpad script): every non-empty evidence-required cell has an evidence entry with an equal value (0 missing, 0 mismatch). There are no orphan entries and no duplicates. Every basis is in the enum, units match the schema, and every qualifier sits on a populated field. No evidence note exceeds 25 words. Every Vpi row has vpi_convention and drive.
- `uv run python scripts/merge_staging.py data/_staging/p4_03` (dry run) output: `merge counts: {'papers': 5, 'devices': 16, 'orgs': 1, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after finishing the checks above. It raises no point that changes the findings.

Limits:
- All five caches are arXiv versions. The versions of record were not read: cai2025 (Nature Communications), powell2024 (CLEO record and APL Photonics) and rahman2025 (JLT candidate).
- Licences of the three papers without Crossref records could not be verified offline.
- The sim configs were reviewed as text only (no engine run).

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| rahman2025 | 3 | pass | F10 (minor) |
| powell2024 | 1 | pass after corrections | F2, F4 (metadata) |
| zheng2026 | 6 | pass after corrections | F1 (numerical), F7 (minor) |
| cai2025 | 2 | pass | F8, F9 (minor) |
| sayem2026c | 4 | pass after corrections | F3 (metadata), F5, F6 (minor) |

## Findings

### Numerical

**F1. zheng2026-al1000 `bw3db_ghz` 70 (gt): the raw traces dip below -3 dB inside the plotted range.**
- Cells: `data/_staging/p4_03/devices.csv` zheng2026-al1000 `bw3db_ghz` 70, qualifier `bw3db_ghz:gt`, `bw_basis` measured. The evidence entry (basis measured) carries the note "no -3 dB crossing in the plotted range".
- Source: p.10 says "the BW is extended to 70 GHz+ for the option with 1 µm Al. The exact BW is expected to be around 90 GHz, but the current experiment is limited by the measurement tools."
- My reading of Fig. 4(h) (img_p09_1, approximate): all four EOE traces have narrow ripple dips near 42 GHz that reach about -3.7, -3.2, -3.4 and -3.3 dB (top to bottom), below the red -3 dB line. Elsewhere the envelope stays above -3 dB to the end of the data at about 67 GHz.
- Why it matters: the evidence note is wrong as worded. The "70 GHz+" is the authors' reading of the envelope, not a trace that never crosses -3 dB.
- Proposed change:
  - Keep 70 with `gt`; the paper's bound is the right value.
  - Change the evidence `bw3db_ghz` basis to `author_estimate` and `bw_basis` to `author_estimate`.
  - Replace the evidence note with: "paper: 70 GHz+ (expects about 90 GHz); Fig. 4(h) ripple dips reach about -3.2 to -3.7 dB near 42 GHz".
  - Append to the row notes: "Ripple dips below -3 dB near 42 GHz in Fig. 4(h); 70 GHz+ is the authors' envelope reading."

### Metadata

**F2. powell2024-a `drive` and `vpi_convention` are `unspecified`, against convention (f) and the powell2024a precedent.**
- Cells: devices.csv powell2024-a `drive` unspecified, `vpi_convention` unspecified (evidence basis derived).
- Source: Fig. 1(b) (p.3 render) shows G-S-G electrodes on x-cut TFLT with one waveguide in each gap. The text (p.1) says "a L = 5 mm long electrode in the ground-signal-ground configuration".
- Convention (f) defines `push_pull` as "opposite fields in the arms, also for a single GSG feed", with a derived evidence entry when the authors do not state it. The canonical row powell2024a-a (same group, same GSG TFLT layout) has `push_pull` / `mzm_push_pull`. Its derived note reads "authors do not state it; GSG with one waveguide in each gap of x-cut LT gives opposite fields". `unspecified` makes the 0.65 V cm row drop out of convention-aware comparisons for no source reason.
- Proposed change:
  - Set `drive` = push_pull and `vpi_convention` = mzm_push_pull, both with basis derived and locator "p.3 Fig. 1(b); p.1 Sec. II".
  - Use the note "authors do not state it; GSG with one waveguide in each gap of x-cut LT".

**F3. sayem2026c-a..d `drive` and `vpi_convention` are `unspecified`, against convention (f) and the sayem2026a precedent.**
- Cells: devices.csv sayem2026c-a, -b, -c, -d `drive` unspecified and `vpi_convention` unspecified (evidence basis derived, note "G-S-G line with two arms in the schematic").
- Source: Fig. 1(a),(b) (p.2 render) shows G-S-G over the 7 mm MZI with one rib in each gap. The device has an on-chip 50 ohm termination (p.2).
- The canonical sayem2026a 7 mm TFLT MZM rows from the same group (`data/evidence/sayem2026a.yaml`) carry push_pull / mzm_push_pull with basis derived. The crystal cut is not stated here, which is the only real uncertainty. The cell can still follow the precedent if the note says so.
- Proposed change:
  - Set `drive` = push_pull and `vpi_convention` = mzm_push_pull on all four rows, basis derived, locator "p.2 Fig. 1(a),(b)".
  - Use the note "authors do not state it; GSG with one rib in each gap; crystal cut not stated".
  - If the coordinator prefers to keep `unspecified` because the cut is unstated, record that as a deliberate exception to the sayem2026a precedent in the DevLog.

**F4. powell2024 identity: the cached arXiv text is the APL Photonics manuscript, but `doi`, `year` and `venue` point to the CLEO 2024 abstract.**
- Cells: papers.csv powell2024 `doi` 10.1364/cleo_si.2024.sm2d.2, `year` 2024, `venue` "arXiv; associated conference: CLEO 2024 (SM2D.2)", `source_type` arxiv_preprint.
- Source:
  - The cached arXiv v1 (2505.00906v1, dated 5 May 2025) is a full 5-page AIP-template manuscript with "Author Declarations" and "Data Availability Statement" (p.4).
  - sayem2026c ref. [21] cites the same title and author list as "APL Photonics, 10(9), 2025".
  - crossref.json is the CLEO proceedings record (type proceedings-article, no abstract, no licence).
- Why it matters: the numbers come from the journal-style manuscript. The attached DOI is a related abstract, not this text's version of record. The qi2024 pattern used by the distiller fits an arXiv text that matches a conference paper, and it is less clear-cut here.
- Proposed change: no cell change until a Crossref record for the APL Photonics article is prefetched. Then:
  - Set `doi` to the APL Photonics DOI and `venue` to "arXiv; associated journal: APL Photonics 10(9)".
  - Set `year` and `license` from that record.
  - Keep `paper_id` powell2024.
  - Until then, add to the papers.csv notes: "arXiv text is the AIP-format manuscript of the APL Photonics 10(9) 2025 article; DOI shown is the related CLEO 2024 abstract."

### Minor

**F5. sayem2026c-a `vpi_basis` is extracted_from_figure while the headline `vpi_dc_v` 2.4 V is measured.**
- Cells: devices.csv sayem2026c-a `vpi_basis` extracted_from_figure. The evidence `vpi_dc_v` entry has basis measured (abstract; Fig. 1(f) label "Vπ = 2.4 V").
- The row-level basis summarises the headline field (convention (h)).
- Proposed change: set `vpi_basis` = measured on sayem2026c-a. The -b, -c and -d rows stay extracted_from_figure.

**F6. sayem2026c-a `eo_rolloff_db` 2 (lt) at 50 GHz: the in-band response peaks above 0 dB.**
- Cells: `eo_rolloff_db` 2, `eo_rolloff_freq_ghz` 50, `bw3db_ghz` 50 gt, `bw3db_reference` unspecified.
- My reading of Fig. 3(d) (p.4 render, approximate):
  - The data start near 4 GHz at about -0.5 to -1 dB.
  - They peak at about +1.2 dB near 15 GHz.
  - At 50 GHz they end at about -1.8 dB (1071 nm) and about -2.1 dB (1551 nm).
- The "less than 2 dB" is relative to the 0 dB normalisation; peak-to-50-GHz is about 3 dB. The values follow the authors' statement, so no value change.
- Proposed change: append to the sayem2026c-a notes: "Fig. 3(d) response peaks near +1.2 dB at about 15 GHz; the 2 dB roll-off is relative to the 0 dB normalisation."

**F7. zheng2026-al1000 `bw_measured_to_ghz` 70 (approx) is the axis end; the data end near 67 GHz.**
- My reading of Fig. 4(h): the axis has ticks at 0/20/40/60 and its frame ends near 70 GHz. The traces end at about 66-67 GHz.
- Proposed change: either set `bw_measured_to_ghz` = 67 (approx, extracted_from_figure, note "last data point of Fig. 4(h); axis frame ends near 70 GHz"), or keep 70 and change the evidence note to "axis frame end; data end near 67 GHz". The `bw3db_ghz` 70 gt stays (paper bound, convention (c)).

**F8. cai2025-b CPW and stack cells are labelled measured but are inferred for the IQ device.**
- Cells: cai2025-b `electrode_gap_um` 6, `signal_width_um` 23, `electrode_thickness_um` 0.8, `eo_film_thickness_nm` 300, `rib_width_nm` 1000, `buffer_oxide_um` 4, `substrate`, `crystal_cut`, `electrode_metal`, `epitaxy_or_stack`, all with basis measured. `band` is c_band.
- Source: p.6 says only "two 13.5 mm-long MZMs, such as the one shown in Fig. 2(a)". The CPW dimensions are stated for the 6.8 mm device (p.3, Fig. 2(c) inset). The film and stack are platform-wide (p.2), so those are fine. The coherent-experiment wavelength is not stated; only the IMDD ECL is "operating in the C-band" (p.5).
- Proposed change:
  - Set basis derived on cai2025-b `electrode_gap_um`, `signal_width_um` and `electrode_thickness_um`, with the note "stated for the 6.8 mm MZM; IQ device described as MZMs such as Fig. 2(a)".
  - Append "band inferred from the IMDD setup" to the row notes.

**F9. sims/cai2025/config.yaml provenance: two class or citation slips.**
- `line.source_ohm` is class paper_exact with locator "p.5 Sec. II (second probe terminates with a 50 ohm coaxial termination)". That sentence is about the load. The source impedance is not stated. Proposed: class project_inference, note "50 ohm source assumed (AWG/VNA)", as in sims/sayem2026c.
- `materials.lithium_tantalate.r_pm_per_v` (r33 30.0) is class standard_reference, with a citation to powell2024's introduction quoting Casson et al. That is a secondary citation. sims/sayem2026c omits the Pockels tensor for the same material. Proposed: either cite Casson et al., J. Opt. Soc. Am. B 21, 1948 (2004) directly as the standard reference (after checking the value in that source), or omit r33 and list it under `missing`, matching sayem2026c.
- Observation, not a finding: the two vpi_l_dc_vcm targets (4.08 measured, tol 0.15; 5.5 paper simulation, tol 0.10) cannot both pass. This is disclosed in `limitations` and follows the churaev2023 precedent.

**F10. rahman2025-3 `er_type` unspecified for a quasi-static voltage sweep.**
- Source: p.5 and the Fig. 3 caption: ER > 34 dB from the 1 kHz voltage sweep plotted on a log scale.
- powell2024-a enters its Hz-rate sweep ER as static.
- Proposed change: set `er_type` = static on rahman2025-3 (judgment call; consistent with powell2024-a).

## Verified clean

rahman2025
- Identity matches the PDF page 1 and `source.json` (arXiv 2504.00311v2, dated 2025-04-03). Six authors. Ligentec SA (existing org, foundry) is named for the SiN layers (p.3). NanoLN is the LNOI supplier (p.3).
- VpiL 4.29, 3.40 and 3.83 are four-chip means (p.5 and p.7), basis derived. Vpi 6.4 V (Fig. 3(c) label 6.36 V; same at 1 kHz and 1 MHz). ER 34 gt (Fig. 3(d) caption "ER > 34 dB").
- IL 2.95, 6.43 and 3.77 match S2 (p.11). Main text p.3 gives 3.1, 6.6 and 4.0; the difference is disclosed.
- Length 6 mm is the S4 fit assumption Lps = 0.6 cm, basis author_estimate. ng 2.0854 is the S4 measured fit input.
- Design 1 bw "around 20 GHz" (S3 text). Fig. 4(b) and Fig. S3 cross -3 dB at about 18-25 GHz, normalised to 3 GHz.
- Design 2: 100 gt with measured-to 111. Paper: "greater than 100 GHz". Fig. S3 chip 1 Design 2 reaches about -3.4 dB only at the last point near 111 GHz, which is consistent with the bound.
- Design 3: 111 gt with reference `other`. The text defines the reference as the 1-3 GHz mean, and Fig. 4(c) data stay above that line minus 3 dB to 111 GHz.
- Geometry matches the Fig. 2(b),(e) labels: SiN1 800 nm, 200 nm oxide, SiN2 350 nm, 100 nm oxide, LN 300 nm, Al 1000 nm, BOX 4000 nm.
- Push-pull is stated (p.2) and the Eq. (2) factor of 2 supports mzm_push_pull. Simulated VpiL values stay in the notes only.

powell2024
- Vpi 1.3 V and ER 29.6 dB (Fig. 1(d) labels; minimum near 0.8 V, maximum near 2.1 V). VpiL 0.65 is author-computed (derived). L = 5 mm.
- Fig. 1(e): S21 falls to about -5 dB by about 5-7 GHz and then stays between about -5 and -6 dB to 20 GHz. So bw3db 5 approx and 6 dB > 20 GHz (detector limit) are correct as entered.
- IL 5.3 dB is an author estimate excluding the grating couplers (p.2). On-chip power 4.3 dBm.
- Stack: 200 nm x-cut, 100 nm etch, 600 nm design width, 2 um SiO2, 800 nm PECVD cladding, 800 nm Au on 15 nm Ti. Harvard CNS is named in the acknowledgements. Company ties appear only in the conflict-of-interest statement and are correctly not entered.

zheng2026
- Identity, 24 authors (including "Günther Roelkens" as printed), affiliations Ghent University and imec, and arXiv v2 dated 2026-06-16 all verified on p.1.
- imec as fab: acknowledgements (Si/SiN circuits from imec-Leuven) and the imec-Ghent University pilot line (p.6).
- IL < 2 dB over about 300 MZMs (abstract; p.8). ER > 30 dB for the representative device (p.8). 1310 nm spectrum (p.7).
- Vpi: about 4 V at 4 um (p.10). Fig. 4(f) medians read about 3.95, 5.55 and 7.05 V, consistent with 4, 5.5 and 7.0 approx. 100 kHz triangular drive.
- Al thicknesses 500 nm and 1 um, 100 nm oxide spacer and high-resistivity Si (p.9-10).
- al500 30 lt: Fig. 4(g) first -3 dB crossings read at about 19-26 GHz, consistent with the text "20-30 GHz" and the bound. The gap and wavelength of the EOE chips are correctly left empty.

cai2025
- Crossref: Nature Communications 17(1) 3314, 2026-02-28, CC-BY-4.0, 12 authors. The arXiv v2 text lists 10 authors; the row uses the Crossref list and says so.
- New org "Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences" (research_institute, CN, east_asia) is correct. EPFL CMi and the NSIT/SIMIT LTOI supply are confirmed in the acknowledgements (p.12).
- Vpi 6 V at 100 Hz, push-pull, 6.8 mm, VpiL 4.08 stated (p.3; Fig. 2(c) label). Fig. S5(c) mean 6.1 V (in notes).
- Fig. 2(d): S21 reaches the -3 dB line near about 100-105 GHz and sits at about -4 dB at 110 GHz, consistent with the label "~100 GHz" and approx. Measured-to 110 and reference 25 MHz match the p.4 text.
- RF loss: Fig. S5(a) trace ends at sqrt(f) = 8 (64 GHz) at about 6.2-6.4 dB/cm. n_rf 2.19 and ng 2.185 are Fig. S3 simulated labels (basis simulated; the chen2022 precedent allows simulated ng).
- System results: PAM4 144-200 GBd, 400 Gb/s line, 333 Gb/s net at 192 GBd (p.6). QPSK to 204 GBd, 16QAM 176 GBd at 704 Gb/s line, 581 Gb/s net (p.6). These sit on the device they were measured with. AWG M8199B; amplifier only in the coherent setup (Fig. 4(b)).
- Sim config: coordinates are consistent (23 um signal, 6 um gaps, strips centred at x = 0 and -29 um). Damascene oxide geometry is consistent with S1. Missing items and limitations are complete. Target sources are valid under the schema (source is a free object; churaev2023 and chen2022 precedents).

sayem2026c
- Identity from p.1 (Nokia Bell Labs, 7 authors, arXiv v1 dated 2026-04-14). NanoLN wafer (p.2). Fabricator not named (author contributions only), so foundry_or_fab is correctly empty.
- Fig. 1(b) caption: L = 7 mm, tf = 600 nm, td about 240 nm, tm = 1 um, ws = 17 um, w = 1.6 um. 4.7 um oxide and G = 5 um (p.2-3).
- Fig. 2(c) VpiL read about 1.45, 1.62, 2.07 and 2.58 V cm at 984, 1071, 1311 and 1551 nm, matching the cells.
- Fig. 1(f) Vpi 2.4 V at 100 Hz, 1071 nm. ER "close to 30 dB" (approx, static, heater sweep).
- n_rf: Fig. 3(b) n_m plateau about 2.25-2.26 at 50-65 GHz, from a separate unterminated device (noted). ng: Fig. 3(c) simulated about 2.25 at 1.07 um.
- No IL is reported, so the IL cells are correctly empty. crystal_cut is empty because the paper does not state it.
- Sim config: geometry consistent (17 um signal, 5 um gaps, ribs at x = 0 and -22 um, rib height 0.36 um from 600 - 240 nm). The td interpretation, cut, cladding, ground width and polarization are all listed under `missing`. The source_ohm class is project_inference.

All five papers
- `audit_status` needs_audit. `verified_on` 2026-10-04. `discovered_via` matches the batch CSV.
- `license` is empty and `redistribution` is restricted_local_only wherever no licence is verifiable. cai2025 is restricted although the journal VoR is CC-BY-4.0, because the cached text is arXiv v2; this is within precedent.
- No absolute paths, private names or emoji in the staged files.
