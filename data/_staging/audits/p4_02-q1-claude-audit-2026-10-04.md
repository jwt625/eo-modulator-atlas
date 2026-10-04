---
auditor: fresh-context subagent
task: Q1 audit of staged batch p4_02
date: 2026-10-04
scope: data/_staging/p4_02/ (papers.csv 4 rows, devices.csv 20 rows, organizations.csv 13 rows, evidence/*.yaml 4 files) for li2025a, didier2026, lee2026, li2026aa; sims/li2026aa/config.yaml
mode: read-only (only this file written; no edits, no git, no network)
verdict: li2025a pass after corrections; didier2026 pass after corrections; lee2026 pass after corrections (F1 is blocking and must be applied before merge); li2026aa pass
findings: {blocking: 1, numerical: 3, metadata: 1, minor: 6}
---

# Q1 audit (fresh context): p4_02

## Method and limits

- I read the rules first: `.claude/skills/eo-modulator-distill/SKILL.md`, the conventions (a)-(k) and the column definitions in `data/schema/devices.schema.yaml`, and `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- I dumped every populated cell of the 20 device rows (li2025a 1, didier2026 6, lee2026 5, li2026aa 8), the 4 papers rows, the 13 staged organizations and all 4 evidence files.
- I read `references/<id>/text.md` in full for li2025a, didier2026 and lee2026 (main text, Methods, Table 1, Extended Data, acknowledgements, licence notices). For li2026aa I read pages 1-8 (all body text, Methods, Table 2, acknowledgements, licence). I compared `crossref.json` (title, author list and count, issued/published dates, volume/article, licence, relation) for all four papers, and `source.json` for li2025a and lee2026.
- I opened these renders: li2025a p.8 (Fig. 3(e), 3(f)) and p.10 (Fig. 4); didier2026 p.5 (Fig. 3; 400 dpi crops of 3(c) and 3(d)) and p.6 (Fig. 4; 400 dpi crop of 4(a)); lee2026 Fig. 2 (img_p05_1), Fig. 3 (img_p06_1; 450 dpi crops of 3(d) top and bottom) and Fig. 5 (img_p07_2); li2026aa p.5 (Fig. 3; 330 dpi crops of both rows of 3(b)) and p.6 (Fig. 4). I made the crops with pymupdf into the scratchpad. All figure readings below are my own and approximate.
- Mechanical check (throwaway scratchpad script): every non-empty evidence-required cell has an evidence or derived entry with an equal value. Results: 0 missing, 0 mismatches, no duplicate (device_id, field) entries, all bases in the enum, all units equal to the schema units, no qualifier on an empty field, no evidence entry for an empty cell, no evidence note over 25 words.
- `uv run python scripts/merge_staging.py data/_staging/p4_02` (dry run) output: `merge counts: {'papers': 4, 'devices': 20, 'orgs': 13, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` and `SPEC_PROPOSALS.md` only after finishing the above.
- Limits:
  - No supplementary material is cached for any paper: li2025a Notes I-VII, didier2026 Appendices B/C/E, li2026aa Notes 1-10, lee2026 SI.
  - For lee2026 the Nature Communications version was not read; all numbers come from arXiv v1.
  - For li2025a the cached file is an author manuscript, not the VoR.
  - No engine run for the sim config.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| li2025a | 1 | pass after corrections | F4 (numerical), F5 (metadata, org) |
| didier2026 | 6 | pass after corrections | F3 (numerical), F6, F7 (minor) |
| lee2026 | 5 | pass after corrections (F1 must be applied before merge) | F1 (blocking), F2 (numerical), F11 (minor) |
| li2026aa | 8 + sim | pass | F8, F9, F10 (minor) |

## Organizations (13 new)

For each new org I checked `data/organizations.csv` for near-duplicates using these substring searches: hong kong, shanghai, berkeley, southern cal, california, tel aviv, toptica, lawrence, o'brien, semiconductor, anpi, optics valley, hubei, optoelectronic, wuhan, micro and nano. I also checked the staged org lists of p4_01, p4_03, p4_04 and p4_05. No same-institution duplicate exists. Every name, type, country and region matches the affiliation text:

| New org | Affiliation text | Type / country / region | Check |
|---|---|---|---|
| The Hong Kong University of Science and Technology (Guangzhou) | li2025a aff. 2 "Microelectronics Thrust, The Hong Kong University of Science and Technology (Guangzhou), China" | university / CN / east_asia | Not a duplicate of the existing "The Hong Kong University of Science and Technology" (HK). That is the Hong Kong campus, a separate entity. CN is correct for Guangzhou. parent_org: see F5. |
| ShanghaiTech University | didier2026 aff. 3 | university / CN / east_asia | ok |
| University of California, Berkeley | lee2026 aff. 1 | university / US / north_america | ok. Comma style matches the existing UC Irvine/San Diego entries. |
| University of Southern California | lee2026 aff. 2 | university / US / north_america | ok |
| Tel Aviv University | lee2026 aff. 5 (Ramat Aviv) | university / IL / middle_east | ok |
| TOPTICA Photonics Inc. | lee2026 aff. 4 "TOPTICA Photonics Inc., Pittsford, NY" | company / US / north_america | ok. This is the US entity as written; no TOPTICA entry exists. |
| Lawrence Berkeley National Laboratory | lee2026 aff. 6 | national_lab / US / north_america | ok |
| John O'Brien Nanofabrication Laboratory | lee2026 ack. "Device fabrication was performed at the John O'Brien Nanofabrication Laboratory at University of Southern California" | facility / US, parent USC | ok |
| Institute of Semiconductors, Chinese Academy of Sciences | li2026aa aff. 3 (Beijing) | research_institute / CN | ok. Naming matches the existing "Shanghai Institute of Optics and Fine Mechanics, Chinese Academy of Sciences". |
| Wuhan ANPI Optoelectronics Company Ltd | li2026aa aff. 4 | company / CN | ok |
| Optics Valley Laboratory | li2026aa aff. 5 | research_institute / CN | ok |
| Hubei Optical Fundamental Research Center | li2026aa aff. 6 | research_institute / CN | ok |
| Center of Optoelectronic Micro and Nano Fabrication and Characterizing Facility | li2026aa ack. "...Facility, Wuhan National Laboratory for Optoelectronics of Huazhong University of Science and Technology for the support in device fabrication" | facility / CN, parent HUST | ok |

These reused names exist verbatim in `data/organizations.csv`: Zhejiang University, ETH Zurich, Binnig and Rohrer Nanotechnology Center, FIRST cleanroom of ETH Zurich, International Business Machines Corporation Research Zurich, Intel Corporation, Huazhong University of Science and Technology and Fudan University.

## Findings

### Blocking

**F1 (blocking). lee2026-a `bw3db_ghz` = 50 is the authors' extrapolation beyond all measured data. It is entered as a plain value with basis `derived` and no bound.**
- Cells:
  - `data/_staging/p4_02/devices.csv` lee2026-a: `bw3db_ghz` 50, `bw_basis` derived, `bw_measured_to_ghz` 40, `qualifiers` empty.
  - `evidence/lee2026.yaml` lee2026-a: bw3db_ghz (50, derived), bw_measured_to_ghz (40, measured).
- Source:
  - Table 1 (p.8) lists "40 GHz^c / 50 GHz^d", with footnote c "2.7 dB EO BW. Limited by the VNA performance" and footnote d "Extrapolated".
  - p.3 and the Fig. 3(d) caption (p.6) say "the fitted/extracted 3-dB EO BW is 50 GHz (dashed line)".
  - Conclusion (p.3): "a broad EO bandwidth exceeding 40 GHz".
- My reading of Fig. 3(d), lower panel (approximate):
  - The measured EO points (circles) lie only between about 27 and 34 GHz, at about -1.3 to -2.6 dB, plus one outlier at about 33.5 GHz and -3.5 dB.
  - The red curve that runs to 40 GHz is the simulation computed from the measured S-parameters.
  - The grey dotted fit line crosses -3 dB near 50 GHz, about 16 GHz past the last measured point.
  - The abstract matches this range: "Vpi,MW of 4.5-6.5 V in the 25-35 GHz range".
- Why blocking:
  - Convention (c) applies when no 3 dB crossing was measured. bw3db_ghz then carries the measured-to value, or the paper's own bound, with `gt`.
  - Convention (h) and SKILL rule 2 also apply.
  - A model extrapolation in `bw3db_ghz` would plot as a measured 3 dB crossing at 50 GHz, and the authors themselves label it "Extrapolated".
- Proposed change:
  - devices.csv lee2026-a: `bw3db_ghz` 40, add `bw3db_ghz:gt` to `qualifiers`, `bw_basis` author_estimate, `bw_measured_to_ghz` 35.
  - Append to notes: "Authors' extrapolated 3 dB bandwidth 50 GHz (fit line, Table 1 note d) and FOM 17.4 GHz/V not entered".
  - Evidence bw3db_ghz: value 40, basis author_estimate, locator "p.3 conclusion; p.8 Table 1 note c", note "authors' bound; measured EO points end near 34 GHz; 50 GHz is extrapolated (Table 1 note d)".
  - Evidence bw_measured_to_ghz: value 35, basis measured, locator "p.1 abstract; p.6 Fig. 3(d)", note "Vpi,MW and EO response measured 25-35 GHz; 40 GHz is the signal generator and VNA limit".
  - If the coordinator prefers to keep 40 as the measured-to value (the authors call 40 GHz their instrument limit), keep `bw3db_ghz` 40 gt in any case. Do not keep 50.

### Numerical

**F2 (numerical). lee2026-a `eo_rolloff_db` 2.7 at `eo_rolloff_freq_ghz` 40 has basis `measured`, but no EO point was measured at 40 GHz.**
- Cells: devices.csv lee2026-a `eo_rolloff_db` 2.7 and `eo_rolloff_freq_ghz` 40; evidence entries for both (basis measured).
- Source:
  - p.3 says "The EO response drops 2.7 dB at 40 GHz MW frequency which is the frequency limit of our signal generator".
  - In Fig. 3(d), lower panel, the measured circles stop near 34 GHz. At 40 GHz only the simulation curve (about -2.4 dB) and the dotted fit (about -2.6 dB) exist. Readings are approximate.
  - The schema defines `eo_rolloff_db` as the "measured EO response drop".
- Proposed change: clear `eo_rolloff_db` and `eo_rolloff_freq_ghz` and delete their evidence entries. Put "authors state a 2.7 dB drop at 40 GHz (simulated from measured S-parameters; measured EO points 27-34 GHz)" in the row notes. Minimum alternative: keep both cells with basis `author_estimate` and that note in the evidence entry.

**F3 (numerical). didier2026 is missing the paper's lowest-VpiL device, and the 0.9 um-film counterpart is wrongly called unidentifiable.**
- Cells: there are no rows for these devices. papers.csv didier2026 notes: "0.9 um film family: minimum VpiL 31.4 V*cm quoted without a device identity (Fig. 3(c)); not entered as a row". The 1.5 um-film minimum is not mentioned anywhere in the staged files.
- Source, 1.5 um film:
  - p.3: "With the 1.5 μm film, a minimum of 18.4 V cm was obtained for the smallest-gap modulator, while the 0.9 μm film yielded 31.4 V⋅cm".
  - p.3: "gaps between 10 and 12 μm were selected for the 1.5 μm thin film".
  - Fig. 3(c), bottom panel: the 1.5 um experimental points sit at G = 10, 10.5, 11 and 12 um. The G = 10 um point reads about 18.5 V*cm (approximate). The caption says "operating at a wavelength of 4 μm".
  - Discussion p.6: "achieving a VπL below 20 V cm".
  - p.3: this device had about 150 uW output due to electrode misalignment.
  - The smallest-gap device is therefore identifiable (G = 10 um).
- Source, 0.9 um film: p.3 gives "gaps of 13.2 μm and 15.6 μm were used for the 0.9 μm thin film". Fig. 3(c) shows orange points at 13.2 um (about 31.7) and 15.6 um (about 36), so 31.4 belongs to G = 13.2 um.
- Proposed change: add two rows. Both: mzm, lithium_niobate, other (LNOS), monolithic, tw_gsg, push_pull / mzm_push_pull (derived, as for -a), mid_ir, length_mm empty (not stated).
  - didier2026-g "1.5 um film, gap 10 um (lowest VpiL)":
    - `wavelength_nm` 4000 (Fig. 3(c) caption).
    - `vpil_dc_vcm` 18.4, basis derived (authors' VpiL, consistent with -a), locator "p.3; p.5 Fig. 3(c)".
    - `electrode_gap_um` 10, basis extracted_from_figure, locator "p.5 Fig. 3(c); p.3".
    - Film and etch geometry as in rows -a/-b.
    - Notes: "Output about 150 uW (electrode misalignment). Fig. 3(d) blue G = 10 um marker reads about 21 at 4.0 um and about 18.5 at 3.95 um".
  - didier2026-h "0.9 um film, gap 13.2 um": `vpil_dc_vcm` 31.4 (derived), `electrode_gap_um` 13.2, wavelength 4000, 0.9 um geometry as rows -c/-d.
  - Replace the papers.csv note sentence about 31.4 accordingly.

**F4 (numerical). li2025a-a `prop_loss_db_per_cm` = 6 is the slow-light section's excess loss over a straight waveguide, not its propagation loss.**
- Cells: devices.csv li2025a-a `prop_loss_db_per_cm` 6 with `prop_loss_db_per_cm:approx`; evidence entry basis measured. The evidence note says "excess loss normalised to a straight waveguide", but the row notes are silent.
- Source:
  - Abstract (p.1): "excess losses as low as 0.6 dB/mm".
  - p.9: "The results were normalized with the straight waveguide fabricated on the same chip".
  - The Fig. 3(f) y axis (p.8) is "Excess loss (dB)". My approximate reading is about 1.4 dB at 2.8 mm, with a fitted slope of about 0.5-0.6 dB/mm.
  - The straight-waveguide loss is not reported in the main text.
- Why: the column is used to compare waveguide propagation loss across devices. An excess loss over a reference waveguide understates the total by the unreported straight-waveguide loss.
- Proposed change (preferred): clear `prop_loss_db_per_cm`, the `prop_loss_db_per_cm:approx` qualifier and the evidence entry. Add to notes: "Slow-light excess loss about 0.6 dB/mm over a straight reference waveguide (Fig. 3(f)); total propagation loss not reported". Minimum alternative: keep the cell and put that sentence in the row notes.

### Metadata

**F5 (metadata). The Hong Kong University of Science and Technology (Guangzhou): `parent_org` is empty.**
- Cell: staged organizations.csv row "The Hong Kong University of Science and Technology (Guangzhou)", parent_org empty.
- Source: li2025a affiliation 2. The entry is correct as a separate CN university, not a duplicate.
- Proposed change (judgment): set `parent_org` to "The Hong Kong University of Science and Technology" so that views can group the two campuses, or record in the notes why it is left empty. Leave country CN and the name unchanged.

### Minor

**F6 (minor). didier2026-e/-f: the identity of the swept device can be narrowed.** In Fig. 3(d) top (approximate), the teal G = 10.5 um marker reads about 22.5 V*cm at 4.0 um, which matches -a (22.4 V*cm, G = 10.5 um, 8 mm). So -e/-f are consistent with wavelength operating points of the -a device. That is a legitimate split under convention (d). However, Fig. 3(c) shows a G = 10.5 um point at about 20.4 V*cm, so more than one G = 10.5 um device may exist, and the paper never says which one was swept. Proposed: keep both rows and keep `length_mm` empty. Append to the notes of -e and -f: "4.0 um teal marker (about 22.5) matches -a; same device likely but not stated".

**F7 (minor). didier2026-a `driver` text is inaccurate.** Current value: "arbitrary waveform generator (20 GS/s); amplifier not stated for the transmission experiment". The Fig. 4(c) schematic (p.6) shows AWG -> Amplifier -> DUT. Proposed: "20 GS/s arbitrary waveform generator followed by an amplifier (Fig. 4(c) schematic; model and gain not stated)".

**F8 (minor). li2026aa-b note is on the wrong row.** The li2026aa-b (1450 nm) notes say "Text writes 1484 nm once for the S-band point". The 1484 nm typo (p.7) concerns the S-band row li2026aa-c (1485 nm). Proposed: move the sentence to li2026aa-c.

**F9 (minor). li2026aa-g note wording.** "Total 2-um coupling loss 0.82 dB per facet" should read "SSC coupling loss 0.82 dB per facet at 1970 nm (p.4, Fig. 3(a))". The value is per facet at one wavelength, not a total.

**F10 (minor). sims/li2026aa/config.yaml provenance class of the electrode y-placement.**
- The provenance entries `geometry.electrodes.signal`, `ground_r` and `ground_l` have class paper_exact. Their y-range [0.12, 1.12] (Au on the LN slab level, overlapping the full-width `sio2_cladding` region) is an inference from the Methods etch sequence, which the note admits.
- Proposed: keep widths, gap and thickness as paper_exact. Add a separate provenance key (for example `geometry.electrode_vertical_position`) with class project_inference.
- Everything else in the config checks out against the paper:
  - Geometry: 300/180/120 nm film/etch/slab; top width 3.5 um and bottom width 3.708 um (60 deg from horizontal, inference noted); BOX 4.7 um; WS 25 and WG 150 um; G = 6 um on both sides; waveguides centred at x = 0 and -31 um; domain symmetric about the signal centre at -15.5 um.
  - Line: length 9 mm; ZL 38 ohm.
  - Targets cite existing evidence fields. Z0, nRF and ng are labelled as the authors' simulation outputs.
  - The bw3db target (100 GHz, tol 0.2) carries a bound-like-reading limitation.
  - The missing list and the limitations are honest.

**F11 (minor, judgment). lee2026 enters 4 of the 12 Vpi wavelength points in Fig. 2(b).** Fig. 2(b) labels Vpi at 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5 and 3.6 um and at 1.55 um. The batch entered 2.4, 2.7, 3.6 and 1.55 um (rows -b/-a/-c/-d). li2026aa in the same batch entered every wavelength. Under convention (d) the extra wavelength points are optional. No change is required; if the coordinator wants consistency, add rows for the remaining 8 points (Vpi from the Fig. 2(b) labels, basis extracted_from_figure).

## Verified clean

li2025a:
- Identity: 12 authors in Crossref order, title, LPR 19(19) e01998, DOI.
- Licence: Wiley TDM only in Crossref; CC0 hint not verifiable; restricted_local_only.
- Version note: the author manuscript is honestly declared. arxiv_id is unverifiable from the cache (no stamp) and is declared as such. Leaving published_on empty is a defensible call.
- `length_mm` 2.8.
- `vpi_dc_v` 4.4: Fig. 3(e) label; 50 kHz sweep.
- `vpil_dc_vcm` 1.23 as derived; equals 4.4 x 0.28 and is stated p.8.
- `vpi_convention` and `drive` push-pull: p.4 Eq. (1); p.6.
- Bandwidth: bw3db 67 gt and measured_to 67. My reading of Fig. 4(a): all three traces stay within about 1.5 dB of 0 up to the 67 GHz LCA limit. Reference unspecified. The simulated 320 GHz is correctly excluded.
- Modulation: ER 4.5 dynamic, drive 2.0 Vpp, OOK/PAM-4/PAM-8 rates (Fig. 4(b-d) labels), max line rate 200, max baud 100 (derived list).
- `energy_per_bit_fj` 40 as author_estimate.
- ng 3.8 simulated with approx.
- Geometry: 400 nm x-cut, 200 nm design etch, w0 600 nm, 3 um BOX, air cladding, Au and Si from the Fig. 1(a) inset.
- Organizations: Zhejiang University and HKUST(GZ); countries CN.

didier2026:
- Identity: 11 authors, Nat. Commun. 17:3050, published 2026-02-21, CC BY 4.0 in Crossref (tdm and vor) and in the article notice; open_license_ok is justified.
- Row -a, static performance:
  - Vpi 28 V and ER 17.1 dB static: Fig. 3(b) labels.
  - VpiL 22.4 derived (p.3), at 4 um, G 10.5 um, L 0.8 cm (Fig. 3(b) legend).
- Row -a, losses:
  - IL f2f 14.1, 17.5 and about 24.0 dB at 4/4.3/4.5 um (p.4).
  - On-chip IL at most 4 and 5 dB (lt, derived).
  - Waveguide loss: 1.1 dB/cm at 4 um is roughly per the text (my Fig. 3(d) reading is about 1.3; approx is kept). 5.3 dB/cm at 4.5 um per the text and figure. 4.4 dB/cm at 4.3 um figure-read; I read about 4.4.
- Row -a, system: 10 Gbaud, -log10(BER) 4.3 (Fig. 4(c)).
- Rows -e/-f VpiL: my Fig. 3(d) teal reads are about 25 at 4.3 um and about 28 at 4.5 um.
- Bandwidth:
  - 1.5 um film (-a, -b): 20 gt, measured_to 20. Fig. 4(b) is flat to 20 GHz, about -2 dB at the end.
  - 0.9 um film, Fig. 4(a): the 0.40 cm trace crosses -3 dB near 16 GHz and the 0.50 cm trace near 14 GHz (approximate), matching -c 16 approx and -d 14 approx.
- Geometry: 1.5/0.92/2.5 um and 0.9/0.4/4 um film/etch/width; sidewall about 65 deg; 0.9 um Au electrodes; x-cut NGK wafer.
- Fabrication: BRNC, FIRST and IBM Rüschlikon named in the acknowledgements for fabrication support. The ShanghaiTech lab fabricated only the photodetector and is correctly not listed.

lee2026:
- Identity and version: 15 authors; arXiv v1 stamp 24 Jan 2026 equals published_on; journal DOI with Crossref 2026-09-17. License empty and restricted_local_only, consistent with the 80 existing arxiv_preprint rows.
- Vpi: 2.3 / 2.7 / 4.3 / 1.8 V at 2.4 / 2.7 / 3.6 / 1.55 um (Fig. 2(b) labels; the caption gives 4.26). VpiL 4.6 and 8.6 are authors' values (derived). push_pull: p.2 "push-pull configuration".
- RF: Vpi_RF 5 V at 27 GHz (Fig. 3(d) caption). bw3db reference 2 GHz (caption). RF loss 2.75 dB/cm at 40 GHz (measured S21). ng 2.29 as simulated.
- ER: 7.1 dB static (Methods 2.3; Ext. Data Fig. 2 at 2.7 um).
- Loss: active loss 6.4 and 10.5 dB/cm (Methods 2.5). Passive suspended losses 2.2/1.2/2.8 dB/cm in the notes match Ext. Data Table 1.
- Geometry: 800/500/300 nm, 4 um width, gap 6.5 um, 0.8 um Au, 4.7 um air gap; slab conflict (0.25 vs 300 nm) disclosed.
- Communications: Fig. 5 labels 1.5 GBd OOK, 0.5 and 1.5 GBd PAM-4, 0.5 GBd PAM-8. Table 1's "PAM8@1.5 Gbaud" contradicts Fig. 5(f); the batch correctly followed the figure. Max line rate 3 Gb/s (derived list).
- Row -e: 4 cm double-pass PM, 4 pi / 4.2 pi comb, 0.8 THz.
- Organizations: the Intel affiliation correctly maps to the existing Intel Corporation. Fabrication site from the acknowledgements. Opticore is only a competing interest, correctly not an affiliation.

li2026aa:
- Identity and licence: 18 authors; Nat. Commun. 17:1138, issued 2026-01-08; CC BY-NC-ND 4.0 in the notice and Crossref, so restricted_local_only is correct. A Research Square preprint relation exists and is disclosed.
- Vpi: all eight Vpi values match the Fig. 3(b) inset labels. All eight VpiL values match the p.5 text ("calculated", entered as derived).
- Bandwidth (my Fig. 3(b) reads):
  - 1310/1485/1550/1590 nm traces reach -3 dB at about 100-108 GHz inside the 110 GHz range, so approx 100 with measured_to 110 is right.
  - 1450/1653 nm traces end at 67 GHz above -3 dB: 67 gt.
  - 1970/2000 nm traces end at 50 GHz at about -2.3 to -2.5 dB, where the PD-limited region begins: 50 gt, measured_to 50. The simulated about 80 GHz is correctly kept out of the cells.
- On-chip IL 1.2/2.8/5.8 dB derived (p.4). ER about 17/15/18 dB static (p.5). Drive about 2.4 Vpp.
- Max rates: OOK 170/170/170/180/180/170/150 and PAM-4 260/260/260/280/280/240/170/150 Gb/s match the p.2 and p.7 text and Fig. 4(d). The 2000 nm OOK of about 140 Gb/s also matches my Fig. 4(c)/(d) reads. 150 GBd OOK at 1970 nm comes from Table 2.
- Z0 about 42 ohm, nRF 2.13 and ng 2.18/2.13/2.04 are labelled simulated.
- Geometry: 300/180/120 nm, 60 deg, W 3.5 um, G 6 um, WS 25 um, 1 um Au, 4.7 um BOX, 2 um PECVD SiO2. Fabrication facility from the acknowledgements. NanoLN as the stated TFLN platform.
