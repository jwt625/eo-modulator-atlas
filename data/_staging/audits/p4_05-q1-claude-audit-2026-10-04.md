---
auditor: fresh-context subagent
task: Q1 audit of staged batch p4_05
date: 2026-10-04
scope: data/_staging/p4_05 (derose2012, dong2026, liu2026b, wang2026a, yue2025); papers.csv (5 rows), devices.csv (9 rows), organizations.csv (1 row), evidence/*.yaml (5 files); no sims/<paper_id>/ configs exist for these papers
mode: read-only (only this file written; no edits, no git, no network)
verdict: all 5 papers pass or pass after corrections; no blocking or numerical defect
findings: {blocking: 0, numerical: 0, metadata: 1, minor: 9}
---

# Q1 audit (fresh context): p4_05

## Method and limits

Step 1. I did this before opening `BATCH_REPORT.md`.
- Rules read: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), column units, enums), `data/_staging/BATCH_INSTRUCTIONS.md`. For format only, I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md`.
- Dumped every populated cell of the 9 staged device rows, the 5 papers rows, the 1 new organization and the 5 evidence files.
- Read the whole `references/<id>/text.md` for all five papers. For yue2025 that is the main text pp.1-16 (principle, Table 1, device characterization, Table 2, Discussion, Methods). I checked `crossref.json` (identity, venue, date, license) and `source.json` for all five, and `data/_staging/batches/p4_05.csv` for the hints and `discovered_via`.
- Renders opened. All figure readings below are mine and approximate.
  - derose2012: p.1 (Fig. 1 cross-section and drive schematic), p.2 (Fig. 2(a) magnified crop, Fig. 2(b)).
  - dong2026: Fig. 1 (img_p02_1, magnified crop) and p.3 (Fig. 3 table and eyes).
  - liu2026b: p.2 (Fig. 2(a)(b)) and img_p02_1.
  - wang2026a: p.1 (Fig. 1(d) magnified from the PDF at 500 dpi; Fig. 1(e) setup) and p.2 (Fig. 2(a) and 2(b) magnified). Table 1 on p.3 was rendered from the PDF, because the cache has no page_03.png.
  - yue2025: Fig. 5 (img_p12_1, Fig. 5(b) magnified). Table 2 (p.14) and the Methods values (p.16) are plain text in `text.md`.
- Mechanical check (throwaway scratchpad script):
  - Staged headers equal the `data/` headers for papers, devices and organizations.
  - Every non-empty evidence-required cell has an evidence entry with an equal value: 0 missing, 0 mismatches.
  - No evidence entry exists for an empty cell. There are no duplicate (device_id, field) entries.
  - Every basis is in the enum, every unit equals the schema unit, and every evidence note is at most 25 words.
  - Every qualifier sits on a populated field and uses a valid op.
  - Row-level `vpi_basis`/`bw_basis`/`il_basis` agree with the evidence basis of the headline field.
  - Every `derived` list item has a matching entry.
  - One orphan was found (F7).
- `uv run python scripts/merge_staging.py data/_staging/p4_05` (dry run) output: `merge counts: {'papers': 5, 'devices': 9, 'orgs': 1, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- Duplicate check: none of the five DOIs is already in `data/papers.csv` or in another staging batch. The only hit is the yue2023 notes, which reference yue2025 as a distinct work.
- Organizations: Sandia National Laboratories, Massachusetts Institute of Technology, University of Chinese Academy of Sciences, "Institute of Optics and Precision Mechanics, Chinese Academy of Sciences", Advanced Micro Foundry, Zhejiang University and Nanjing University of Aeronautics and Astronautics all exist in `data/organizations.csv` and are spelled exactly as there. Coherent Corp. is new: the affiliation is "Coherent Corp., 48800 Milmont Dr., Fremont, CA 94538, USA" (dong2026 p.1), so company/US/north_america is correct. There is no existing Coherent, II-VI or Finisar row.

Step 2. After Step 1, I read `BATCH_REPORT.md`. Its judgment calls match what I found independently. It already flags the dong2026 marginal >70 GHz (F2) and the yue2025 0 V points in notes (F8). It does not flag F1.

Limits:
- yue2025: the Supplementary Information (S1-S5: loss, grating couplers, modulation efficiency, microwave loss) is not cached. The Optica version of record was not read.
- derose2012: Fig. 2(a) overlays fit curves on the measured traces. Both cross -3 dB at nearly the same frequency, so which one the text values come from cannot be resolved.
- dong2026 has no page_01 render in the cache. Its page-1 content (affiliation, notice) was checked in `text.md`.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| derose2012 | 3 | pass after corrections | F1 (metadata), F9 (minor) |
| dong2026 | 1 | pass | F2, F3 (minor) |
| liu2026b | 1 | pass | F4, F5 (minor) |
| wang2026a | 2 | pass | F6 (minor) |
| yue2025 | 2 | pass | F7, F8, F10 (minor) |

## Findings

### Metadata

**F1 (metadata). derose2012-a, -b, -c `drive` is push_pull; the device is series push-pull.**
- Cells: `data/_staging/p4_05/devices.csv` rows derose2012-a, -b, -c, column `drive` = `push_pull`. Evidence entries `drive` (all three devices) have basis `design_target` and note "Described as push-pull design...". The `tags` include `push_pull`.
- Source: p.2 Sec. 2 says "The p-n junctions which were connected in series had a capacitance of 0.41 fF/um". The p.1 Fig. 1(b)(c) render shows a p+/p/n/n+/n/p/p+ cross-section. V_RF is applied between the two outer Al contacts and the centre n+ contact is tied to V_bias through a resistor. That is two back-to-back junctions driven in series by one RF signal. The authors' word is "push-pull", which is why the distiller entered push_pull.
- Convention (f) lists `series_push_pull` as its own value. yue2025 and liu2026b in this batch use it for the same topology.
- Proposed change:
  - Set `drive` = `series_push_pull` on derose2012-a, -b and -c.
  - In the three `drive` evidence entries, set basis `derived`, locator "p.1, Fig. 1(c); p.2, Sec. 2", and note "Authors say push-pull; Fig. 1(c) and p.2 show two series-connected junctions driven by one RF signal".
  - Optionally replace tag `push_pull` with `series_push_pull`. `vpi_convention` stays unspecified on derose2012-c.

### Minor

**F2 (minor). dong2026-a `bw3db_ghz` 70 `gt`: the plotted trace touches -3 dB at the axis end.**
- Cells: `bw3db_ghz` 70, qualifier `bw3db_ghz:gt`, `bw_measured_to_ghz` 70. The row note says "Fig. 1 trace ends near -3.6 dB at the 70 GHz axis end".
- Source: p.1 Sec. 2 says ">70 GHz 3-dB bandwidth in Fig. 1" and attributes the high-frequency oscillation to setup calibration.
- My reading of Fig. 1 (img_p02_1, approximate): the trace stays above about -2.5 dB up to about 69 GHz. It dips to about -3.6 dB at about 69.5-69.8 GHz and returns to about -2.9 dB at the last point (70 GHz). So a -3 dB crossing appears only in the final sub-GHz ripple.
- Keeping `gt` follows the authors' statement and is defensible, but the note should say exactly what the trace does.
- Proposed change: no value change. Row note: replace "Fig. 1 trace ends near -3.6 dB at the 70 GHz axis end with high-frequency ripple" with "Fig. 1 trace dips to about -3.6 dB near 69.5-70 GHz (ripple the authors attribute to setup calibration), last point about -2.9 dB". Mirror this in the `bw3db_ghz` evidence note (<= 25 words).

**F3 (minor). dong2026-a `bw3db_reference` unspecified, unlike the same situation elsewhere in the batch.**
- Cells: `bw3db_reference` = `unspecified`; evidence basis derived, note "Curve starts near 0 dB...".
- Source: the Fig. 1 trace starts at 0 GHz at about 0 dB. That is the same situation as wang2026a Fig. 1(d)/2(b), liu2026b Fig. 2(b) and yue2025 Fig. 5(b), which were all entered as `dc` (derived).
- derose2012 is different: its trace starts at about 0.6 GHz on a log axis, so unspecified is right there.
- Proposed change: `bw3db_reference` = `dc` on dong2026-a. Evidence basis stays derived; note "Sdd21 normalized to about 0 dB at the lowest frequency; reference not stated".

**F4 (minor). liu2026b-a `bw3db_ghz` evidence note "responses stay above -1.1 dB" is slightly off.**
- Source: my reading of Fig. 2(b) (img_p02_1, approximate) shows the Seg3 0 V trace reaching about -1.15 to -1.2 dB near 66 GHz. All -2 V traces stay at or above about -0.1 dB. The authors' "1 dB EO bandwidth exceeding 67 GHz" (p.2) is borderline for Seg3. There is no -3 dB crossing in any trace, so the `gt` treatment is correct.
- Proposed change: evidence note for liu2026b-a `bw3db_ghz`: "No -3 dB crossing within 67 GHz; lowest point about -1.2 dB (Seg3, 0 V, near 66 GHz)".

**F5 (minor). liu2026b-a `il_onchip_db` 9: the note should record that the Fig. 2(a) spectrum is on an absolute axis.**
- Cells: `il_onchip_db` 9, `il_onchip_excludes` "Not stated by the authors; spectra measured through grating couplers, coupler normalization not given".
- Source: p.2 says "revealing a measured insertion loss of 9 dB". The Fig. 2(a) render shows the transmission peak at about -9 dB on a "Transmission (dB)" axis. So 9 dB is the peak of the plotted spectrum, and it may include grating-coupler loss (GCs are named for the EO measurement).
- The scope cannot be resolved. Keeping the value in `il_onchip_db` with undefined scope follows the lotkov2024 precedent.
- Proposed change: no value change. Append to `il_onchip_excludes` (or the row note): "Fig. 2(a) peak about -9 dB on an absolute transmission axis; may include grating couplers".

**F6 (minor). wang2026a-a note understates the low-frequency peaking.**
- Cell: row note "with about +1.5 dB peaking at low frequency".
- Source: my reading of Fig. 1(d) (PDF p.1 at 500 dpi, approximate) puts the Ssd21 maximum at about +1.9 dB near 18 GHz. The -3 dB crossing is near 82 GHz on a trace to 110 GHz, which agrees with 81.82 GHz.
- Proposed change: "about +2 dB peaking near 18 GHz".

**F7 (minor). yue2025-b has `vpi_convention` filled with no Vpi value.**
- Cell: yue2025-b `vpi_convention` = `unspecified`. All Vpi/VpiL fields are empty, and the paper reports neither for m=0.
- Proposed change: clear `vpi_convention` on yue2025-b.

**F8 (minor, recommended). yue2025: the measured 0 V bias bandwidths exist only in notes.**
- Source: p.13 Sec. 2B and Fig. 5(b) give 3 dB bandwidths at 0 V bias of 43.1 GHz (m=0) and 81.9 GHz (m=1). Both are measured crossings. My reading of Fig. 5(b): blue (m=1, 0 V) crosses -3 dB near 78-82 GHz and black (m=0, 0 V) near 40-45 GHz.
- Skill rule 5 counts a bias point as an operating point, and sia2022-a..d in `data/devices.csv` set the precedent of one row per bias. The current rows keep the 6 V headline points only.
- This changes no existing cell.
- Proposed change: add two rows with the same device fields as -a/-b and no system-demo columns (the eyes used live-tuned bias), each with evidence entries:
  - yue2025-c "TFT MZM m=1, 0 V bias": `bw3db_ghz` 81.9, `bw3db_reference` dc, `bw_basis` measured, `length_mm` 0.9; locator "p.13, Sec. 2B; Fig. 5(b)".
  - yue2025-d "Conventional MZM m=0, 0 V bias": `bw3db_ghz` 43.1, `length_mm` 0.3, same locator.
- Alternatively, record the decision to keep notes-only as a judgment in the disposition.

**F9 (minor). derose2012 `epitaxy_or_stack` "(As and P implants)" repeats a source slip without flagging it.**
- Source: p.1 Sec. 2 says "Arsenic and Phosphorous implants were used to achieve an n-type and p-type doping level of ~5x10^18/cm3". Phosphorus is a donor, so the paper's dopant naming is internally inconsistent.
- Proposed change: no value change. Extend the evidence note on `epitaxy_or_stack` with "dopant species as written (As and P named for n- and p-type)".

**F10 (minor). yue2025 papers row: the arXiv v1 licence notice is not recorded.**
- Cells: `license` empty, `redistribution` restricted_local_only. That follows the repo's arXiv pattern (lee2020, gui2022) and is acceptable.
- Source: arXiv v1 p.1 carries "2024 Optica Publishing Group under the Optica Open Access Publishing Agreement". Crossref gives the version of record license as `https://doi.org/10.1364/OA_License_v2#VOR-OA` (2025-02-06).
- Proposed change: leave `license`/`redistribution` unchanged (no verified redistribution right for the version read). Append to the papers notes: "arXiv v1 p.1 states Optica Open Access Publishing Agreement; VoR license OA_License_v2 per Crossref".

## Verified clean

derose2012
- Identity matches Crossref and the p.1 header: title, four authors, 2012 OIC, pp.135-136, DOI.
- `published_on` empty is correct (Crossref gives 2012-05 only).
- License publisher-copyright comes from the p.1 "(c)2012 IEEE" notice; restricted. The organizations are correct, and `foundry_or_fab` is empty because no fab is named.
- Lengths 0.5/1.5 mm are "effective active lengths" (p.2) and 2 mm is the VpiL device. 24/14 GHz are stated in text.
  - Fig. 2(a) magnified: the 0.5 mm trace crosses -3 dB near 22-25 GHz and the 1.5 mm trace near 14-16 GHz. Both are inside the measured range (data to about 40 GHz), so measured basis is fine and the fit caveat is noted.
- `vpil_dc_vcm` 0.7 is "measured for a 2 mm long modulator" (p.2, conclusions), with convention unspecified and a DC caveat in the notes.
- `z0_ohm`/`n_rf` are correctly left empty (95 ohm and 2.3 are unloaded-line values).
- Geometry checked: 250 nm Si, 3 um BOX, 1 um metal1 stack, 0.41 fF/um, 50 um segments, fill factor 0.6.
- soi_rib and cl_twe agree with Fig. 1.
- Three rows are the right split.

dong2026
- Identity matches Crossref and p.1. Coherent Corp. is a correct new org. License comes from the paper's own Optica notice.
- `vpi_dc_v` 7 is derived and approx: the authors define effective Vpi as VpiL/length, "approximately 7 V".
- `drive_vpp_v` 2.5 is the driver's stated 2.5 V swing (p.1).
- Fig. 3 table checked: ER 4.71/4.22/3.71 dB, RLM 0.93/0.95/0.94, BER 3e-6/2e-2/8e-2. The FFE taps (15/31) are on p.3. `max_line_rate_gbps` 420 and dynamic ER 3.71 at 420 Gb/s are correct.
- Geometry checked: 220 nm Si, 3 um BOX, 2.8 um Al.
- The baud rate is correctly not entered, and the 75 ohm design target is correctly left out of `z0_ohm`.

liu2026b
- Identity matches Crossref and p.1. Organizations are under their existing names.
- Vpi 4 V at -2 V comes from the average of the two single-junction bypass measurements; it is measured.
- VpiL 1.14 is author-computed (derived). 1.14/4 = 2.85 mm = 3 x 950 um, consistent with the paper. Leaving `length_mm` empty is a conservative, documented choice.
- `vpi_convention` unspecified is acceptable, because the paper does not say whether 4 V is per-junction or MZM-level.
- The 67 GHz `gt` and `bw_measured_to_ghz` 67 match the 67 GHz PNA and probe.
- The ">100 GHz at -2 V" claim is correctly not entered (extrapolation beyond the measured range).
- Peaking in Fig. 2(b): about +1 dB (0 V) and about +2.1 dB (-2 V).
- Doping, junction offset, 220 x 380 nm rib, 150 nm etch, 2 um BOX, 40 ohm on 52 ohm, and the 100 um imbalance are all on p.2.
- The ER list 3.67-1.17 dB is on p.3, and 192 GBd OOK gives 192 Gb/s (derived).
- series_push_pull is stated, and o_band is stated.

wang2026a
- Identity matches Crossref and p.1. Advanced Micro Foundry is named as the fab ("fabricated at Advanced Micro Foundry (AMF)", p.1), and `process_name` comes from p.1-2.
- Values:
  - Length 2.25 mm effective (2.5 mm total), p.2.
  - VpiL 2.3 and 1.36 measured from spectra. Fig. 2(a) shows an about half-FSR shift between 0 V and 6 V, consistent with Vpi about 6 V.
  - Vpi 10.2 and 6 V are author-derived and approx.
  - Bandwidths 81.8 and 59.5 GHz: the Fig. 1(d)/2(b) labels read 81.82 and 59.5 GHz, and both traces run to the 110 GHz axis end.
  - Table 1 (rendered) gives IL 2.6/2.45 dB, length 2.5/2.5 mm, C/O bands and 300/336 Gb/s PAM8.
  - Fig. 1(e) labels 2.5 Vpp at the modulator input, which supports `drive_vpp_v` 2.5 approx.
  - PAM-4 100 GBd: SER 4.8e-4, ER 4.2 dB, TDECQ 2.6 dB.
- Leaving -b `length_mm` empty is a documented, acceptable judgment.

yue2025
- Identity matches Crossref (Optica 12(2) 203, 2025-02-06) and arXiv v1 p.1, following the existing arXiv-row pattern.
- Universities are correct, and `foundry_or_fab` Advanced Micro Foundry is stated (p.11, p.16).
- -a values:
  - Length 0.9 mm (Table 2).
  - VpiL 4.86 (Table 2, from DC phase vs voltage, derived).
  - Vpi about 54 V, "estimated" (p.15, p.16), so author_estimate.
  - `bw3db_ghz` 110 `gt`, measured to 110 GHz, -1 dB at 110 GHz (p.13, Table 2). Fig. 5(b) red trace minimum about -1.5 dB near 101 GHz and peak about +2.7 dB near 50 GHz, so there is no crossing.
- -b values: 70 GHz at 6 V. In Fig. 5(b) the purple trace crosses -3 dB near 68-70 GHz.
- Common values:
  - IL 4.3/2 dB, static ER 33.2/35.3 dB, FSR 9.6/9.3 nm, 4.2 dB/mm doped loss and 4.8 dB per GC (p.16).
  - Geometry: 220 nm Si, 2 um BOX, 500 nm width, 90 nm slab, 40 um width and 9 um gap, Al, 50 nm offset, 750 nm contacts, 77 um extra electrode (p.12, p.16).
- Eye data: ERs 2.94-2.08 dB (m=1) and 2.36/2.14 dB (m=0) from the Fig. 5(e)(f) labels, 5 Vpp drive, and the SHF chain (p.16).
- Series push-pull is stated for the TFT device and derived for m=0. `electrode_type` folded for m=1 is correct.

All papers
- `audit_status` = needs_audit, `verified_on` 2026-10-04, and ISO dates throughout.
- No sim configs exist, which is correct: all five are silicon devices, grade C.
- No absolute or home-relative paths in the staged files.
