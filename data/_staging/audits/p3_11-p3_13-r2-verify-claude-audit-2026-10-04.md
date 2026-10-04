---
verifier: fresh-context subagent
task: verify round-2 audit corrections for p3_11, p3_12, p3_13
date: 2026-10-04
scope: p3_11 (powell2024a, nelan2022, nelan2022a, feng2022, gao2024), p3_12 (chen2023a, hu2026a, niels2025a, tan2024, wang2026b), p3_13 (larocque2024, kari2025, holzgrafe2020, thiele2022, hou2024, multani2025); dispositions data/_staging/p3_11|p3_12|p3_13/AUDIT_DISPOSITIONS_R2.md; audit data/_staging/audits/p3_11-p3_13-r2-claude-audit-2026-10-03.md
mode: read-only except this report; git diff HEAD on data/ only; no build_views, no merge scripts, no network
verdict: corrections confirmed; 0 issues; 0 unrecorded changes
counts: {changed_cells: 20, confirmed: 20, not_confirmed: 0, evidence_only_edits: 3, deferred_checked: 1, rejected: 0}
validator: "uv run python scripts/validate_db.py -> 0 error(s)"
---

# Verification: round-2 corrections, p3_11 to p3_13

## Method

- Diff: `git diff HEAD` on `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` (parsed cell by cell with a scratchpad script, CSV keyed on paper_id / device_id) and on `data/evidence/<id>.yaml` for all 16 papers. Only gao2024, nelan2022, nelan2022a, tan2024, wang2026b, kari2025 and hou2024 evidence files changed.
- Out-of-scope changes ignored: organizations.csv edits (Binnig and Rohrer Nanotechnology Center, Sandia National Laboratories, Takeda Sentanchi Super Cleanroom notes; new row National Information Optoelectronics Innovation Center). None of the 16 papers in scope references these organizations.
- Sources: `references/<id>/text.md` with `<!-- page N -->` markers, cached page renders and embedded images. Re-renders from `source.pdf` (pymupdf, scratchpad only): nelan2022 p.3 Fig. 1(a) at 8x; hou2024 p.10 Fig. 4(c) at 5x. All figure readings below are approximate.
- Line endings: CR count of devices.csv (278) and papers.csv (118) equals HEAD, so CRLF is preserved.

## Per-paper verdicts

| Paper | Changed cells | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| powell2024a | 0 | 0 | 0 | no change |
| nelan2022 | 3 (drive, vpi_convention, cladding) | 3 | 0 | corrections confirmed |
| nelan2022a | 2 (drive, vpi_convention) | 2 | 0 | corrections confirmed |
| feng2022 | 0 | 0 | 0 | no change |
| gao2024 | 1 (drive) | 1 | 0 | corrections confirmed (F9 deferred) |
| chen2023a | 0 | 0 | 0 | no change |
| hu2026a | 0 | 0 | 0 | no change |
| niels2025a | 0 | 0 | 0 | no change |
| tan2024 | 2 (drive, electrode_thickness_um) | 2 | 0 | corrections confirmed |
| wang2026b | 4 (am drive, pm drive, am2 qualifiers, am2 notes) | 4 | 0 | corrections confirmed |
| larocque2024 | 0 | 0 | 0 | no change |
| kari2025 | 4 (a bw_basis, a notes; papers notes, process_name) | 4 | 0 | corrections confirmed |
| holzgrafe2020 | 1 (papers notes) | 1 | 0 | corrections confirmed |
| thiele2022 | 0 | 0 | 0 | no change |
| hou2024 | 3 (a wavelength_nm, qualifiers, notes) | 3 | 0 | corrections confirmed (F9 deferred) |
| multani2025 | 0 | 0 | 0 | no change |

## Changed cells

| # | File / row / column | Old -> new | Source locator checked | Verdict |
|---|---|---|---|---|
| 1 | devices gao2024-a drive (+ evidence, derived) | (empty) -> unspecified | p.1-3: dual-arm phase modulator on one GSG line (p.1 l.79-83, Fig. 2); no MZM drive convention stated; not an MZM, so no enum value fits better | confirmed |
| 2 | devices nelan2022-a drive (+ evidence, derived) | unspecified -> push_pull | p.6 Sec. IV-C "the center electrode is active, while the outer electrodes are grounded"; Fig. 1(a) 8x crop: three Au traces (wide outer ground, narrow centre signal, wide inner ground), one white waveguide line in each of the two gaps on both straights, arms cross at the fold. Single GSG feed with one arm per gap = push_pull under convention (f) | confirmed |
| 3 | devices nelan2022-a vpi_convention (+ evidence, derived) | unspecified -> mzm_push_pull | same as #2; Vpi 2.98 V is the MZM-level DC value (p.6, Fig. 7(f)) | confirmed |
| 4 | devices nelan2022a-a drive (+ evidence, derived) | unspecified -> push_pull | Fig. 1(c) (p.2): ground / W_GAP with waveguide / W_SIG / W_GAP with waveguide / ground; Fig. 1(a),(f) same layout; text p.2 "between the signal and ground electrodes" | confirmed |
| 5 | devices nelan2022a-a vpi_convention (+ evidence, derived) | unspecified -> mzm_push_pull | same as #4; 3.75 V over 10 mm is consistent with the 3.5-4 V cm design map (Fig. 2(a)) for an MZM-level push-pull value | confirmed |
| 6 | devices nelan2022-a cladding (+ evidence value) | "(thicker over the waveguide)" -> "(thicker only where Au crosses over the waveguide)" | p.5 Sec. III: thicker oxide only "where an increased thickness of the SiO2 buffer layer will protect the optical mode from interacting with an overhead Au electrode. The rest ... reduced to 450 nm" | confirmed |
| 7 | devices tan2024-a drive (+ evidence, derived) | (empty) -> unspecified | ring; p.3 "Electric fields are applied in the same direction" in both straights, no MZM drive enum applies | confirmed |
| 8 | devices tan2024-a electrode_thickness_um (+ evidence, design_target, um) | (empty) -> 0.7 | p.5 "bottom electrodes, composed of 10 nm titanium and 700 nm gold"; top 10 nm Ti + 1500 nm Au; Fig. 1(b) (img_p03_1) labels "700nm" on the bottom electrode beside the waveguide | confirmed |
| 9 | devices wang2026b-am drive (+ evidence, derived) | (empty) -> unspecified | p.3 "impedance-engineered GSG transmission lines feeding amplitude modulators (AMs) or phase modulators (PMs)"; p.5 Vpi 2.2 V / 2.4 V cm; no drive stated (no "push" in the text) | confirmed |
| 10 | devices wang2026b-pm drive (+ evidence, derived) | (empty) -> unspecified | p.6 RF Vpi about 3.9 V at 50 GHz; no drive stated | confirmed |
| 11 | devices wang2026b-am2 qualifiers | length_mm:approx;max_baud_gbd:gt;max_line_rate_gbps:gt -> length_mm:approx | p.2 "up to 20 Gbit/s (limited by the oscilloscope)"; p.6-7 eyes at 5/10/20 Gbaud "currently limited by the 13 GHz bandwidth of the oscilloscope". No bound wording from convention (b) list; values 20/20 unchanged | confirmed |
| 12 | devices wang2026b-am2 notes (+ 2 evidence notes) | "so entered as a lower bound" -> "(demonstrated maximum, entered without a bound qualifier)" | as #11 | confirmed |
| 13 | devices kari2025-a bw_basis (+ evidence bw3db_ghz basis) | author_estimate -> measured | see "kari2025 judgment" below | confirmed |
| 14 | devices kari2025-a notes | "Basis author_estimate: ... call the bandwidths estimated ..." -> "Basis measured: the abstract calls 29 GHz experimental, Fig. 4c plots a measured trace and Fig. 2e marks it "29 GHz (VNA)" ...; however ..." | p.1 abstract; p.8 Fig. 4c caption; p.5 Fig. 2e; p.11 Methods (VNA 100 kHz-7.5 GHz, PD 12 GHz); conflict caveat retained | confirmed |
| 15 | papers kari2025 notes | "Entered with basis author_estimate ..." -> "Entered with basis measured ... (presented as experimental in the abstract and Fig. 4c ...), conflict stated ..." | as #13-14 | confirmed |
| 16 | papers kari2025 process_name | "(named p.4)" -> "(PDK p.4; name lnoi400 from ref. 27, p.13)" | p.4 (text l.114) "fabricated at Luxtelligence26 using their open-source process design kit (PDK)27"; ref. 27 "lnoi400" at text l.541, page 13 | confirmed |
| 17 | papers holzgrafe2020 notes | "Supplement Section 1-5 not in the cached file." -> "Supplement 1 (pp.12-19 of the cached arXiv v2) read; no modulator column applies." | text.md p.12 header "Supplement 1"; Sections 1 (theory), 2 (piezoelectric loss), 3 (setup, calibration), 4 (microwave nonlinearity), 5 (interventions) all present on p.12-19; 120 fF on p.16; no Vpi, EO bandwidth or nm/V | confirmed |
| 18 | devices hou2024-a wavelength_nm (+ evidence, extracted_from_figure, nm) | (empty) -> 1561.36 | p.9 "At 0 V, the resonant wavelengths of the two rings are 1561.33 nm and 1561.39 nm"; Fig. 4(c) 5x render: the "ΔV 0.0V" (dark grey) dip sits at about 1561.36 nm on the main axis (1561.0 / 1561.5 / 1562.0 ticks) and about 1561.36 nm on the inset axis (1561.3 / 1561.4 ticks); equals the midpoint of the two stated resonances | confirmed (approx) |
| 19 | devices hou2024-a qualifiers | (empty) -> wavelength_nm:approx | figure reading, as #18 | confirmed |
| 20 | devices hou2024-a notes | "wavelength_nm left empty." -> "wavelength_nm is the 0 V ring-pair dip read from Fig. 4(c)." | as #18 | confirmed |

Evidence-only edits (no CSV cell): kari2025-a bw3db_ghz locator (+ "; p.1 abstract") and note; wang2026b-am2 max_baud_gbd and max_line_rate_gbps notes. All accurate against the sources above.

### kari2025 judgment (priority item)

- Paper's own statements: abstract p.1 "Experimental results demonstrate a modulation bandwidth of 29 GHz"; p.9 "We have demonstrated more than 20x improvement in bandwidth, achieving 29 GHz"; p.9 "a modulation bandwidth of 29 GHz observed in the device"; Fig. 4c caption gives "f3dB = 29 GHz" for SR 1 (W 0.55, L 100); Fig. 2e marks "▲29 GHz (VNA)" on the Q-calculated curve; p.6 "Experimental validation was performed using a VNA ... on devices with configurations of (W=0.75, L=100) and (W=0.55, L=100)".
- Fig. 4c (img_p08_1, log axis): the SR 1 trace is flat within about -2 dB to about 15-20 GHz, crosses -3 dB at roughly 27-30 GHz and the trace runs to about 60 GHz. It is drawn as measured data, not a model curve.
- Contradiction: Methods p.11 list a 12 GHz photodetector (Newport 1544-A) and a 100 kHz-7.5 GHz VNA (Siglent SVA1075X) as the EO-bandwidth equipment. With that equipment a 29 GHz crossing could not be measured. The paper does not resolve this.
- Label: convention (h) assigns `author_estimate` only when the paper calls the value estimated. The paper calls the Fig. 2e curves estimated (p.6), but it presents the 29 GHz point itself as experimental and VNA-measured. `extracted_from_figure` does not fit either, because the number is stated in the caption and abstract. So `measured` is the correct schema label for what the paper reports. The equipment contradiction is a credibility problem, not a basis problem, and the row note, evidence note and papers.csv note all state it explicitly. Confirmed.
- Residual caveat: plots will draw 29 GHz as a measured point. The only flag is the note text. If the atlas wants such conflicts visible in views, that needs a tag or flag rule; none exists in the schema today, so nothing is proposed as a fix here.

### nelan2022 / nelan2022a judgment (priority item)

- Convention (f): "push_pull (opposite fields in the arms, also for a single GSG feed)". Both devices are single GSG feeds with the signal on the centre electrode (nelan2022 p.6 states this explicitly; nelan2022a Fig. 1(c) labels W_SIG in the centre) and one arm in each gap (nelan2022 Fig. 1(a); nelan2022a Fig. 1(a),(c),(f)). In nelan2022 the waveguide crossing at the fold keeps the field sign per arm consistent across both 5.5 mm sections (p.2), so the arms still see opposite fields. push_pull / mzm_push_pull with basis derived and a "not stated" note follows (f). Confirmed.

## Deferred and rejected findings

- Rejected: none.
- R2-F9 (deferred, user decision; sampled): the factual basis holds. gao2024 cached preprint p.1 lists 10 authors (no Zhiwei Fang); Crossref lists 11 including Zhiwei Fang; papers.csv has the 10. hou2024 cached arXiv p.1 lists "Songyan Hou" only; Crossref and papers.csv list 6. The two papers still follow opposite rules, as the dispositions state.

## Metadata and notes

- All changed notes are accurate against the sources (rows #12, #14-17, #20). No emoji, no absolute or home paths, no private information in the changed cells or the disposition files.
- Optional wording nit (no fix needed): tan2024-a drive evidence note "authors do not state the drive". The authors do state that the fields in both straights point the same way (p.3). That is not an MZM drive enum, so `unspecified` is still right. A more exact note would be "ring; fields in both straights same direction (p.3), no MZM drive enum applies".

## Validator and evidence equality

- `uv run python scripts/validate_db.py`: `0 error(s)`.
- Evidence vs CSV for every changed evidence-backed cell: gao2024-a drive; nelan2022-a drive, vpi_convention, cladding; nelan2022a-a drive, vpi_convention; tan2024-a drive, electrode_thickness_um; wang2026b-am drive; wang2026b-pm drive; wang2026b-am2 max_baud_gbd, max_line_rate_gbps; kari2025-a bw3db_ghz (basis measured = row bw_basis measured); hou2024-a wavelength_nm. All have exactly one entry, the value equals the CSV cell, units match the column, and bases are in the enum.

## Issues

None. Open follow-up that is already recorded in the p3_11 dispositions (not a defect of this correction set): `sims/nelan2022/config.yaml` line 8 ("vpi_convention unspecified") and line 69 ("convention of the paper is unspecified") now disagree with `vpi_convention` = mzm_push_pull (derived). Use the suggested wording from the disposition file. `comparable: false` may stay.

## Unrecorded changes

None. Every changed cell in papers.csv, devices.csv and evidence for the 16 papers in scope is listed in a disposition file. The organizations.csv changes belong to other batches (hu2023, xu2020, sabatti2024, valdez2022/2023, akazawa2026, soma2025) and do not touch this scope.
