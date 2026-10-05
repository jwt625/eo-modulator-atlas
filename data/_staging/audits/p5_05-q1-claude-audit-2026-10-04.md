---
auditor: fresh-context subagent
task: Q1 audit of staged batch p5_05
date: 2026-10-04
scope: data/_staging/p5_05 (papers.csv, devices.csv, organizations.csv, evidence/*.yaml) for yamaguchi2026, yu2026, zhang2026b, zhou2026, aihara2026; no sims/<paper_id>/ exists for any of them
mode: read-only (only this file written; no edits, no git, no network)
verdict: zhou2026 fails as staged (one blocking bandwidth cell); the other four pass after corrections; no identity or license defect
findings: {blocking: 1, numerical: 3, metadata: 2, minor: 8}
---

# Q1 audit (fresh context): p5_05

## Method and limits

- Rules read first: `.claude/skills/eo-modulator-distill/SKILL.md`, the conventions (a)-(k) and column definitions in `data/schema/devices.schema.yaml`, and `data/_staging/BATCH_INSTRUCTIONS.md`. I skimmed `data/_staging/audits/p3_16-p3_17-r2-claude-audit-2026-10-03.md` for format only.
- I dumped every populated cell of the 9 staged device rows, the 5 papers rows, the 8 staged orgs and the 5 evidence files.
- I read `references/<id>/text.md` in full for all 5 papers (3 pages each). Identity checks: batch CSV, `source.json` (all 5) and PDF page 1. `crossref.json` exists only for zhang2026b, and its title and 12 authors match the staged row exactly.
- I opened these page renders and images. yamaguchi2026: page_02 (Fig. 1), page_03 (Fig. 2) and img_p03_3 (Fig. 2(c), enlarged). yu2026: page_02 (Figs. 1-3) and page_03 (Fig. 4 eyes). zhang2026b: page_02 (Figs. 1-2), page_03 (Fig. 3, Table 1), plus a 400 dpi re-render of Fig. 3(c)-(d). zhou2026: page_02, plus 500/400 dpi re-renders of Fig. 1 (left panels) and Fig. 2 (right panel). aihara2026: page_02 (Figs. 2-3). All my figure readings are approximate.
- Mechanical check (throwaway scratchpad script): I compared each evidence entry with its CSV cell (value, unit vs schema unit, basis in enum, note <= 25 words, duplicates). I also checked that every populated evidence-required cell has an entry and that every qualifier sits on a populated field. Result: 0 duplicates, 0 unit or basis errors, 0 notes over 25 words, 0 missing entries, 0 qualifiers on empty fields. There were 2 value mismatches (F8). Derived-list entries for cells that stay empty: yamaguchi2026-c vpil_dc_vcm 8.1 (F2) and zhou2026-a max_line_rate_gbps 365.
- `uv run python scripts/merge_staging.py data/_staging/p5_05` (dry run) output: `merge counts: {'papers': 5, 'devices': 9, 'orgs': 8, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
- I read `BATCH_REPORT.md` only after finishing the checks above.
- Limits: there is no Crossref record for 4 of the 5 papers. Licence comes from the printed Optica footer (the accepted convention). The earlier papers that yamaguchi2026 reviews (OFC 2024 M3K.4, OFC 2025 Th4D.4) are not cached and were not read. The Liobate Technology location and the NTT rename (F5, F6) cannot be verified offline.

## Per-paper verdicts

| Paper | Rows | Verdict | Findings |
|---|---|---|---|
| yamaguchi2026 | 3 | pass after corrections | F2 (numerical), F7, F9 (minor) |
| yu2026 | 1 | pass after corrections | F8, F13 (minor) |
| zhang2026b | 3 | pass after corrections | F3 (numerical), F8, F10 (minor) |
| zhou2026 | 1 | fail as staged; passes once F1 is applied | F1 (blocking), F6 (metadata), F11 (minor) |
| aihara2026 | 1 | pass after corrections | F4 (numerical), F5 (metadata), F12 (minor) |
| cross-batch | - | - | F14 (minor) |

## Findings

### Blocking

**F1. zhou2026-a bandwidth is a simulation-based extrapolation far beyond the measured range.**
- File: `data/_staging/p5_05/devices.csv`, row zhou2026-a. Columns: `bw3db_ghz` = 140, `bw_basis` = author_estimate, `qualifiers` contains `bw3db_ghz:gt` and `bw_measured_to_ghz:approx`, `bw_measured_to_ghz` = 67.
- Evidence: `evidence/zhou2026.yaml`, bw3db_ghz entry (value 140, basis author_estimate).
- What the source says (p.1, Sec. 2): "merely 1dB roll-off at 67GHz (S21 parameter) and an extrapolated 3dB bandwidth exceeding 140GHz".
- What the figure shows (Fig. 1 left, p.2): the blue "Measurement" trace ends at about 67 GHz, at about -0.5 to -1 dB. The only curve that reaches -3 dB near 140 GHz is the red dotted "Simulation" curve. The panel header reads "EO bandwidth > 140GHz".
- Why it blocks: the 140 GHz bound is a model extrapolation to twice the measured range. The app's MODEL_BASES (`app/src/lib/charts.ts`) contain only simulated, predicted and design_target, so author_estimate is plotted as data, and this row would plot as a >140 GHz device. Precedent: arabjuneghani2022 (model 170 GHz) and liu2025 (analytical 218/220 GHz) did not enter the extrapolation. Each entered the measured-to value with gt.
- Proposed exact change:
  - devices.csv zhou2026-a: `bw3db_ghz` 140 -> 67; `bw_basis` author_estimate -> measured; `qualifiers` -> `vpi_dc_v:lt;bw3db_ghz:gt;extinction_ratio_db:approx`, which removes `bw_measured_to_ghz:approx` per convention (c) (the measured-to value carries no qualifier). Keep `bw_measured_to_ghz` 67.
  - evidence bw3db_ghz entry: value 67, basis measured, locator "p.1, Sec. 2; Fig. 1", note "1 dB roll-off at 67 GHz, end of measured trace; authors' extrapolated >140 GHz follows the simulated curve, not entered".
  - Row notes: replace "3 dB bandwidth is an extrapolation" wording (papers.csv notes too) with "authors' extrapolated >140 GHz (simulation curve) not entered".

### Numerical

**F2. yamaguchi2026-c: Vpi 2 V combined with length 40.5 mm makes build_views derive VpiL 8.1 V cm, which is about 3x the low-frequency efficiency.**
- File: `devices.csv`, row yamaguchi2026-c: `vpi_dc_v` 2, `length_mm` 40.5, `vpil_dc_vcm` empty. Evidence `derived:` list: vpil_dc_vcm 8.1. Row notes: "Vpi x 4.05 cm = 8.1 V cm (arithmetic, evidence derived list)".
- Source:
  - p.2, Sec. 3: "integrates same-sign and opposite-sign modulation sections in series with the fundamental modulation section"; "total operating length ... 40.5 mm".
  - p.1, Sec. 1: the equalizer "increases the active length ... while maintaining sensitivity in the low-frequency band".
  - Fig. 2(a): the fundamental modulation section is labelled 13.5 mm, so 40.5 mm = 3 x 13.5 mm.
- Consequence: at low frequency the same-sign and opposite-sign sections cancel, so the semi-static Vpi of 2 V is set by the 13.5 mm fundamental section. `scripts/build_views.py` computes vpil_dc_vcm_derived = vpi_dc_v * length_mm / 10 = 8.1 V cm whenever vpil_dc_vcm is empty. That number would place the device among the least efficient TFLN MZMs. The cancellation argument is my reading of the paper's own description of the design. The paper does not state a VpiL.
- Proposed change (coordinator choice):
  - Required in either case: delete the 8.1 entry from the evidence `derived:` list. Replace the note sentence with "Vpi x total length is not a DC efficiency: equalizer same/opposite-sign sections cancel at low frequency; fundamental section 13.5 mm (Fig. 2(a))."
  - Option (i), preferred for honest plots: set `length_mm` on yamaguchi2026-c to 13.5 (evidence basis extracted_from_figure, locator "p.3, Fig. 2(a)", note "fundamental section; total operating length incl. equalizer sections 40.5 mm"). Keep 40.5 on -b, which has no Vpi.
  - Option (ii): keep 40.5 and suppress the derived VpiL for rows tagged `eo_equalizer` on the views side.

**F3. zhang2026b-b VpiL 1.87 V cm is author-computed but labelled measured.**
- File: `devices.csv` row zhang2026b-b `vpi_basis` = measured. Evidence vpil_dc_vcm entry (1.87): basis measured.
- Source: p.2, Sec. 3 says Vpi is measured with a 1 kHz signal and "corresponds to a VpiL of 2.15 V cm". Fig. 3(b) is a wafer map of that same VpiL product for 5 mm devices (best 1.87). The staged row -a already labels 2.15 as derived for this reason.
- Convention (h): author-computed values are `derived`.
- Proposed: in evidence zhang2026b-b vpil_dc_vcm, change basis measured -> derived and append to the note "VpiL computed by the authors from measured Vpi x 0.5 cm". In devices.csv zhang2026b-b, change `vpi_basis` measured -> derived. The value 1.87 is unchanged.

**F4. aihara2026-a: max_baud_gbd 200 does not match max_line_rate_gbps 448 PAM4 on the same row.**
- File: `devices.csv` row aihara2026-a: `max_baud_gbd` 200, `max_line_rate_gbps` 448. The row notes say "448 Gbps PAM4 implies 224 GBd by arithmetic".
- Source: p.2, Sec. 3 / Fig. 3(f-i) show 448 Gbps PAM4 eyes on all 4 channels; the abstract claims 448 Gbps PAM4. Fig. 3(a) TDECQ points run to 200 GBd.
- As staged, the row implies 2.24 bit/symbol for PAM4. Canonical precedent derives baud from a stated bit rate with basis derived (han2023, he2019, mao2024).
- Proposed: `max_baud_gbd` 200 -> 224. Evidence max_baud_gbd entry: value 224, basis derived, locator "p.1, abstract; p.2, Sec. 3; Fig. 3(f-i)", note "448 Gbps PAM4 at 2 bit/symbol; highest TDECQ-evaluated rate 200 GBd (4.7 dB)". Row notes: replace the "448 Gbps PAM4 implies ... holds the stated 200 GBd" sentence with "224 GBd derived from 448 Gbps PAM4; TDECQ evaluated to 200 GBd". If the coordinator prefers no derived baud, keep 200 and leave the row as is. In that case the inconsistency stays documented only in notes.

### Metadata

**F5. aihara2026: "NTT, Inc." duplicates the existing org "Nippon Telegraph and Telephone Corporation".**
- Files: `data/_staging/p5_05/organizations.csv` row "NTT, Inc."; `papers.csv` aihara2026 `companies` = "NTT, Inc.".
- Source p.1: "Device Innovation Center, NTT, Inc., 3-1, Morinosato Wakamiya, Atsugi-shi, Kanagawa" and "Device Technology Labs, NTT, Inc.", same address.
- Existing `data/organizations.csv` row "Nippon Telegraph and Telephone Corporation" has the note "(NTT Device Innovation Center; NTT Device Technology Laboratories), Atsugi-shi, Kanagawa". ogiso2016 uses it with exactly these two units.
- Same units, same site: as staged, one entity would appear twice in org and country statistics and on the map.
- The 2025 English trade-name change of NTT Corporation to "NTT, Inc." is auditor background knowledge, not verified offline.
- Proposed:
  - Drop the "NTT, Inc." row from staging organizations.csv.
  - Set aihara2026 `companies` = "Nippon Telegraph and Telephone Corporation".
  - Coordinator appends to the canonical org note: "aihara2026 (2026) prints NTT, Inc. for the same Atsugi units".
  - Alternative: rename the canonical org to the current name and update ogiso2016. That is a canonical edit, outside this batch.

**F6. zhou2026: the paper names the fabricator, but foundry_or_fab is empty.**
- File: `papers.csv` zhou2026 `foundry_or_fab` empty.
- Source: p.1, Sec. 2: "The TFLN MZM is designed and fabricated by Liobate Technology"; acknowledgement p.3.
- Skill rule 6 puts a fab that is named as fabricating the device in `foundry_or_fab` and in organizations. The distiller left it empty because the paper gives no location and `validate_db.py` requires an ISO country. The gap is documented in the papers notes.
- Proposed: the coordinator verifies the company's country from a primary source and then adds org "Liobate Technology" (name as printed, org_type company) and sets `foundry_or_fab` = "Liobate Technology". Until then the status quo is acceptable.

### Minor

**F7. yamaguchi2026 rows are this paper's reproduction of earlier results.**
- The Fig. 1 caption cites [5] (OFC 2024 M3K.4); the Fig. 2 caption cites [6] (OFC 2025 Th4D.4), including the module photo and the Vpi curve.
- The numbers are printed in this paper, by the same authors. Taking them from this paper is acceptable, and the row and paper notes already say "Device of OFC 2024 M3K.4 / OFC 2025 Th4D.4". `data/papers.csv` has no row for either earlier paper, so nothing is duplicated today.
- Proposed: add tag `results_from_prior_paper` to yamaguchi2026-a/-b/-c, so later ingestion of M3K.4 or Th4D.4 can supersede or dedupe these rows. Keep `source_type` conference (OFC proceedings). `review` is the alternative if the coordinator prefers to mark the self-described "We review" nature.

**F8. Evidence and CSV disagree on bw3db_reference.**
- `evidence/yu2026.yaml` (yu2026-a) and `evidence/zhang2026b.yaml` (zhang2026b-c) have a `bw3db_reference` entry with value unspecified, but the CSV cell is empty in both rows. The merge validator does not flag this.
- Proposed: set `bw3db_reference` = unspecified in devices.csv for yu2026-a and zhang2026b-c.

**F9. yamaguchi2026-c vpi_dc_v evidence note understates the attribution.**
- Current note: "paper does not say chip or module". The row notes say the value is "assigned here".
- p.3, Sec. 4 (Conclusion): "The packaged module exhibited 100-GHz-class operation, with a half-wave voltage of 2 V and a high extinction ratio". This supports the module row directly.
- Proposed: locator -> "p.3, Sec. 3 and Sec. 4; Fig. 2(d)"; note -> "Semi-static curve; Conclusion attributes 2 V to the packaged module; DC bias and convention not stated". Apply the same locator to the extinction_ratio_db entry.

**F10. zhang2026b-a/-b/-c `integration` = foundry_native.**
- All 110 canonical monolithic TFLN rows use `monolithic`. The foundry aspect is already in the tags (foundry_8inch; beol_cmos).
- Proposed: `integration` -> monolithic on all three rows.

**F11. zhou2026-a drive_vpp_v 2: the note should say it is the AWG output.**
- p.2: "differential signals (Vppd) are generated by AWG in the range of 1.3-2V"; p.1: the signal reaches the MZM "through RF cables, optional RF amplifier and RF probe". The swing at the MZM is not stated when the amplifier is used.
- Proposed note: "AWG differential output range 1.3 to 2 Vppd; optional RF amplifier, swing at MZM not stated". The value stays.

**F12. aihara2026-a target SER differs between text and figure.**
- The text (p.2) gives a target SER of 9.3e-3; the Fig. 3(a) label reads 9.7e-3. The max_baud_gbd evidence note and the row cite only 9.3e-3.
- Proposed: append "(Fig. 3(a) label 9.7e-3)" to that evidence note.

**F13. yu2026-a: the 110 GHz bandwidth is stated, never shown, and the paper also gives 100 GHz.**
- Basis measured with approx is defensible: Sec. 2 says the MZMs "exhibit" about 110 GHz.
- However, Sec. 1 says the co-optimized design achieves "up to 100 GHz bandwidth". Sec. 3 uses "a 110 GHz-bandwidth TFLN modulator" as a simulation input.
- Proposed: add to the row notes "Sec. 1 quotes up to 100 GHz for the co-designed TOSA". The value stays. Vpi <2 V as design_target with lt is correct: the paper says the MZMs "are designed with low Vpi values (< 2V)", and no Vpi measurement is shown.

**F14. "National Semiconductor Translation and Innovation Centre" is staged in both p5_04 and p5_05.**
- Both batches give it identical type, country and region (research_institute, SG, southeast_asia); only the notes differ.
- `merge_staging.py` compares only type, country and region, so there is no conflict, and the first-merged note is kept.
- Proposed: none required. The coordinator may merge the two notes (tobing2026 and zhang2026b, same Fusionopolis address).

## Verified clean

- Identity: titles, author lists (including "Li huang" as printed in yu2026), venue strings, DOIs and URLs match PDF page 1, the batch CSV and `source.json`. zhang2026b also matches `crossref.json`.
- Publication and rights fields: `published_on` is empty for all 5, correct under (k) because the batch dates are schedule dates. source_type is conference and access unknown. license is publisher-copyright from the Optica footer, which is on every page of all 5 PDFs. redistribution is restricted_local_only. cache_status is full_extract, audit_status needs_audit, verified_on 2026-10-04. repro_grade is C for all 5 with `sim_config` empty and no `sims/<id>/`. That is correct for zhang2026b too: signal width and waveguide width are not given, and the XSEM (Fig. 1(d)) shows one arm only.
- Organizations: "Wuhan HGGenuine Optics Tech Co., Ltd" (Wuhan, CN) and "Genuine Optics" (San Jose, US) are separate printed affiliations with different addresses and countries. The paper states no relation (the shared email domain is not a statement). Keeping two rows matches the per-printed-affiliation practice and is not a duplicate.
- "Ligent Technologies, Inc.": the paper prints one name with two addresses, so one row (US) with countries US;CN is consistent.
- "Sumitomo Osaka Cement Co., Ltd.", "Nagoya Institute of Technology", "Waseda University": new rows, type, country and region correct.
- Reused names exist verbatim in `data/organizations.csv`: National Institute of Information and Communications Technology, Institute of Microelectronics, and "Agency for Science, Technology and Research".
- zhang2026b `foundry_or_fab` empty: the foundry is unnamed. wafer_supplier is NanoLN (p.1).
- yamaguchi2026-a:
  - Length 45 approx: "approximately 45 mm", 3 x 15 mm.
  - Bandwidth 110 gt with measured-to 110: "exceeded 110 GHz"; the Fig. 1(c) EO-S21 stays at about 0 to +1 dB to 110 GHz.
  - IL: fiber-to-fiber 19.6 dB (8.2 dB per GC facet).
  - ER 50 approx static: the Fig. 1(d) minimum is about -49 dB.
  - Gap 5 um and electrode thickness 1.2 um from the text. LN 800 nm and SiO2 500 um handle from the Fig. 1(b) labels.
  - drive push_pull derived with note; electrode_type cl_twe.
- yamaguchi2026-b: 40.5 mm stated. My Fig. 2(c) reading: the chip trace has its minimum at about -1.7 dB near 105 GHz and ends at about -0.5 dB at 110 GHz, so bw3db 110 gt extracted_from_figure is correct. x-cut is from the Fig. 2(a) label.
- yamaguchi2026-c: bandwidth 100 GHz as stated; the module trace crosses -3 dB at about 101-102 GHz and reaches its minimum of about -3.4 dB near 105 GHz. IL 9.2 dB PM-fiber pigtailed module entered as fiber-to-fiber. ER 40 static, Fig. 2(d) minimum about -38 dB. vpi_convention unspecified.
- yu2026-a: wavelength 1310 nm (DFB); drive differential (stated); drive_vpp 2 gt (driver output "exceeding 2 Vppd"). Baud, line rate and TDECQ values in modulation_format match the Fig. 4 labels (185/370/2.97, 200/400/3.83, 210/420/NA, 180/360/2.76). The Fig. 2-3 simulations are not entered.
- zhang2026b-a:
  - Vpi 4.29 V at 1310 nm (Fig. 3(a) label 4.29 V); VpiL 2.15 derived (4.29 x 0.5 = 2.145).
  - RF loss about 8.9 dB/cm at 100 GHz approx. My reading of the 400 dpi re-render is about 8.8-9.1.
  - n_rf 2.2 (legend "CPW n_eff: 2.2 @ 100 GHz") and ng_opt 2.27 (legend "LN n_g: 2.27"), both derived.
  - Propagation loss 0.37 dB/cm, with the passive-waveguide caveat in notes.
  - Geometry (350/150 nm, etch 200 nm derived, Al 1.5 um, gap 5 um, BOX 4.7 um, 725 um HR-Si, 1 um SiO2, x-cut) matches p.1 and p.2.
- zhang2026b-c: My Fig. 3(d) reading: red crosses -3 dB at about 93 GHz and green at about 96-97 GHz; orange and blue stay above -3 dB until the drop at the 110 GHz sweep end. The paper claims 110, not >110, so per convention (c) bw3db 110 without qualifier plus measured-to 110 is right. The three-row split (typical Vpi, wafer-best VpiL, best bandwidth) follows (d), and the notes state that the paper does not link the devices.
- zhou2026-a:
  - Vpi 2.7 with lt: the text gives 2.7 V and the Fig. 1 header "Vpi < 2.7V"; triangle sweep, low frequency.
  - eo_rolloff 1 dB at 67 GHz as stated.
  - ER 2.4 approx dynamic at 182.5 GBd. My Fig. 2 reading is about 2.35-2.4 dB (4.4 dB at 140 GBd).
  - TDECQ list matches the text. The linear-driver, CTLE and bump-to-bump VPI simulations are not entered. Line rate is left empty (not stated).
- aihara2026-a:
  - 100 um length; bandwidth 103 GHz at -1.5 V (Fig. 2(c) smoothed trace crosses near 100-103 GHz); static ER 3.8 dB for a 0-1 V swing (Fig. 2(b) point at 1.0 V about -3.8 dB).
  - Wavelength 1310 approx (Fig. 2(a) peak); drive 0.5 V at 400 Gbps.
  - ER ranges in modulation_format match Fig. 3(b-i) (3.5/3.6/3.0/3.3 and 3.0/3.2/2.8/2.7).
  - Laser-only 0.12 pJ/bit is correctly not entered as energy_per_bit.
- Mechanical: all populated evidence-required cells have entries; units, bases and qualifiers are valid. The merge dry run shows 0 conflicts and 0 validation errors.
