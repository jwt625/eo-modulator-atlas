---
auditor: fresh-context subagent
task: Q1-p1_02 (first independent audit)
date: 2026-10-03
scope: batch p1_02 canonical rows - tran2026 (1 row), wang2018 (6 rows), weigel2018 (1 row), he2019 (2 rows), boynton2020 (paper row only, no device rows); data/papers.csv, data/devices.csv, data/organizations.csv, data/evidence/<id>.yaml, sims/he2019/config.yaml targets
mode: read-only (only this file written; no git, no network, no build_views, no merge --apply)
verdict: pass after corrections (0 blocking, 1 numerical, 2 metadata, 6 minor)
findings: {blocking: 0, numerical: 1, metadata: 2, minor: 6}
---

# Audit Q1-p1_02 (first independent audit, fresh context)

## Method and limits

Read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), papers and devices columns), `data/_staging/BATCH_INSTRUCTIONS.md`, the head of `data/_staging/audits/p3_16-p3_19-q1-claude-ingest-2026-10-03.md` (format only).

Source cache state: `references/<id>/text.md` and `references/<id>/figures/` are NOT present for tran2026, wang2018, weigel2018 or he2019 (only `source.pdf`, `source.json`, `crossref.json`); boynton2020 has only `crossref.json`. I therefore regenerated page-delimited text and 150 dpi page renders from each cached `source.pdf` into my scratchpad with the same pymupdf calls as `scripts/extract_source.py` (nothing written to `references/`). The sha256 of every cached PDF equals the value in its `source.json`, and the page counts match (3, 6, 19, 21), so page indices below are the same `p.N` indices the evidence files use. Additional 400 dpi crop: tran2026 Fig. 1 center.

Read in full: tran2026 (3 pp.), wang2018 (6 pp., arXiv v1), weigel2018 (19 pp. author manuscript), he2019 (21 pp. manuscript plus Supplementary Information). Page renders opened for every figure-sourced value: tran2026 p.2 (Fig. 1, 2), p.3 (Fig. 3); wang2018 p.2 (Fig. 1, 2), p.3 (Fig. 3), p.4 (Fig. 4); weigel2018 p.17 (Fig. 1), p.18 (Fig. 2, 3), p.19 (Fig. 4); he2019 p.3 (Fig. 1), p.4 (Fig. 2), p.5 (Fig. 3), p.14 (Fig. S2), p.17 (Fig. S4). `crossref.json` read for all five papers. Versions of record (Optics Express for wang2018/weigel2018, Nature Photonics for he2019) and the boynton2020 paper were not available. My figure readings are approximate and labelled as such.

Mechanical checks (scratchpad script, canonical files only): for all 10 device rows every non-empty evidence-required cell has an `entries` item with an equal value, except two cells that exist only in the `derived` list (R2-F6); every qualifier sits on a populated field; every entry unit equals the schema unit; every entry basis is in the `basis` enum; no evidence note exceeds 25 words; no absolute/home paths or private names; no characters above U+2000 in the evidence files or the sim config.

Validator: `uv run python scripts/validate_db.py` output: `0 error(s)`.

After Step 1 I read `data/_staging/p1_02/BATCH_REPORT.md` and `SPEC_PROPOSALS.md` for context; they did not change any finding except to confirm the provenance in R2-F2.

## Per-paper verdicts

| Paper | Verdict | Findings |
|---|---|---|
| tran2026 | pass after corrections | R2-F1 |
| wang2018 | pass (minor only) | R2-F6, R2-F7 |
| weigel2018 | pass (minor only) | R2-F8, R2-F9 |
| he2019 | pass after corrections | R2-F3, R2-F4, R2-F5 |
| boynton2020 | pass after corrections (no device rows is correct) | R2-F2 |

boynton2020 device rows: correctly absent. There is no `source.pdf` or `text.md` (prefetch status `no_open_source`), no evidence file, and the paper is listed in `data/manual_downloads.md`. The paper row identity matches `crossref.json` (title, 12 authors in order, Optics Express 28(2) 1868, online 2020-01-14, OA_License_v1 VOR-OA). Its only defect is in `notes` (R2-F2).

## Findings

### Blocking

None.

### Numerical

**R2-F1 (numerical). tran2026-a `vpi_dc_v` 3.1 is attributed to the static transfer curve, but that curve is labelled 3.4 V.**
- Cells: `data/devices.csv` tran2026-a `vpi_dc_v` = 3.1, `vpi_basis` = measured, `notes` sentence "Vpi column is DC: static transfer function at 5 V bias."; `data/evidence/tran2026.yaml` entry tran2026-a `vpi_dc_v` (locator "p.2, Sec. 3; p.3, Conclusion; Fig. 1 center", basis measured).
- Source: p.2, Fig. 1 center is the only DC (static) transfer function in the paper: optical power vs applied voltage at 5 V bias, with the arrow annotated "Vπ=3.4 V". My approximate reading of a 400 dpi crop puts it from the minimum at about -1.4 V to the maximum at about +2.0 V, consistent with the 3.4 V label. The text gives 3.1 V twice: p.2 "normalizing the response beyond the dip (~10 GHz) is justified and yields an estimated 3 dB-bandwidth of 76 GHz and a Vπ = 3.1 V at 5 V bias voltage", and p.3 Conclusion "Vπ = 3.1 V". The paper does not say how 3.1 V was obtained. That sentence ties it to the EO-response normalization, not to the static curve.
- Why numerical: the row note and the evidence locator present 3.1 V as the reading of the static DC curve, but that curve shows a value about 10 % higher. 3.1 V is the paper's headline and can stay, but its attribution and basis are wrong.
- Proposed change: keep `vpi_dc_v` 3.1 (text and conclusion headline). Evidence entry: locator "p.2, Sec. 3 text; p.3, Conclusion"; basis `author_estimate` (the sentence calls the outputs "estimated"; method not stated); note "Text value; the static transfer curve in Fig. 1 center is labelled 3.4 V; method for 3.1 V not stated". Row: `vpi_basis` author_estimate. Replace the notes sentence "Vpi column is DC: static transfer function at 5 V bias." with "Vpi 3.1 V is the text/conclusion value at 5 V bias (method not stated); the static DC transfer curve (Fig. 1 center) is labelled 3.4 V." The existing context_values item for 3.4 V stays.

### Metadata

**R2-F2 (metadata). boynton2020 `notes` attributes the numbers 30.6 GHz and 6.7 V*cm to a Crossref abstract that does not exist.**
- Cell: `data/papers.csv` boynton2020 `notes`: "The Crossref abstract mentions 3 dB EO bandwidths of 30.6 GHz and half-wave voltage-length products of 6.7 V*cm; these are not entered (abstract-only, no locator into the paper)."
- Source: `references/boynton2020/crossref.json` has no `abstract` field (`message.abstract` is null). The only occurrence of "abstract" is the publisher landing-page URL. Neither 30.6 nor 6.7 appears anywhere in the file. The numbers come from the batch CSV hint `data/_staging/batches/p1_02.csv` row boynton2020, column notes: "Heterogeneous Si-photonic/TFLN modulator made in CMOS facilities: 30.6 GHz, 6.7 V cm. Surfaced via Crossref title search". That is a secondary hint, not a primary source. The same wrong attribution is in `data/_staging/p1_02/BATCH_REPORT.md` and `needs_download.md` (staging, historical).
- Proposed change: replace that sentence with "The batch CSV hint (title-search note, not a primary source) quotes 30.6 GHz and 6.7 V*cm; the Crossref record carries no abstract; nothing entered until the full text is read." No other change to the row. `redistribution: unknown` is acceptable for a metadata-only row (the other Optica rows in this batch use restricted_local_only; optional to harmonise).

**R2-F3 (metadata). he2019: the cached manuscript is later than arXiv v1, and `notes` does not say so.**
- Cell: `data/papers.csv` he2019 `notes` ("Cached source is the arXiv-style manuscript (arXiv:1807.10362 per the batch CSV; no arXiv stamp in the cached file)"); devices he2019-a/-b `notes` ("Numbers from the arXiv-style manuscript...").
- Source: the cached text cites material that postdates a July 2018 (arXiv 1807.*) submission. It cites Wang et al., Nature 562, 101-104 (2018) (main reference list p.11 and [S3] p.21). It cites Weigel et al., Opt. Express 26, 23728-23739 (2018) (p.11), which Crossref dates online 2018-08-29. It cites a QSFP-DD rev 4.0 specification whose URL carries 2018-09 / "9-12-18" (p.11, ref. 45). The cached file is therefore a later revision (a later arXiv version or the accepted manuscript), not v1. Which version it is cannot be determined offline.
- Proposed change: add to the papers.csv note: "the cached manuscript cites September 2018 sources (Nature 562; Opt. Express 26, 23728; QSFP-DD rev 4.0), so it is a later revision than arXiv v1; exact version unknown." Optionally append "(later revision than arXiv v1)" to the device-row notes.

### Minor

**R2-F4 (minor). he2019-a `il_onchip_db` 2.5: basis `author_estimate` does not match the source wording.**
- Cells: `data/devices.csv` he2019-a `il_basis` = author_estimate; evidence entry he2019-a `il_onchip_db` basis author_estimate.
- Source: p.1 abstract "The presented device exhibits an insertion loss of 2.5 dB"; p.2 "low on-chip insertion loss"; p.7 "the insertion loss of the present device is much lower than that of all others"; p.8 Table 1 "This Work 2.5 dB | 5.1 V | >70 GHz | 100 Gb/s | 5mm". None of these says the value is estimated. Per convention (h), author_estimate means the paper says estimated. The method is not stated.
- Proposed change: basis `measured` in the evidence entry and `il_basis`, keeping the note "method and excluded items not stated". Keeping the cell on the 3 mm row is a defensible judgment call that the row note discloses. Table 1 pairs 2.5 dB with the 5 mm device (Vπ 5.1 V, 5 mm), and the abstract pairs it with 2.2 V*cm (3 mm). No change is proposed to row placement.

**R2-F5 (minor). he2019 evidence wording and locators.**
- (a) evidence he2019-a and he2019-b `bw3db_reference` note "trace starts near 10 GHz". In Fig. 3b (p.5) both traces start at the left axis edge, below the 10 GHz tick (my approximate reading: about 2-5 GHz). Proposed note: "0 dB reference not stated; traces start at a few GHz (approximate figure reading); PD response de-embedded (p.9 Methods)".
- (b) evidence he2019-a `drive_vpp_v` 4 basis `author_estimate`. Source p.16 Supp. II: "Vpp of 4 V is obtained after the RF amplifier"; p.9 Methods: amplifier "with output saturation Vpp of 4 V". This is a setup value, not an estimate. Proposed basis: `measured`.
- (c) `sims/he2019/config.yaml` target `vpi_l_dc_vcm` 2.46 (simulated) has locator "p.16, Supp. II". The value is first stated on p.14, Supp. I ("the calculated Vπ·L = 2.46 V·cm" with h = 180 nm, g = 2.75 um). Proposed locator: "p.14, Supp. I; p.16, Supp. II".

**R2-F6 (minor). wang2018 `max_baud_gbd` cells exist only in the evidence `derived` list.**
- Cells: `data/devices.csv` wang2018-mzi `max_baud_gbd` 22 and wang2018-rt-eye `max_baud_gbd` 40. `data/evidence/wang2018.yaml` has no `entries` item for either, only `derived` items. he2019-a has both an entry and a derived item for the same situation. The validator accepts this.
- Source: p.4 Fig. 4 caption "All eye diagrams are measured with 2^7-1 PRBS in a non-return-to-zero scheme"; p.5 "40 Gbps and 22 Gbps for the racetrack and MZI devices". NRZ at 22 and 40 Gb/s gives 22 and 40 GBd.
- Proposed change: add `entries` items (basis derived, locator "p.4, Fig. 4 caption; p.5", note "NRZ, one bit per symbol") so that every evidence-required cell has an entry, as SKILL.md step 5 requires.

**R2-F7 (minor). wang2018 racetrack rows omit platform facts the paper states for all its devices.**
- Cells: wang2018-rt-q50k, -rt-q8k, -rt-q5p7k, -rt-q18k and -rt-eye have empty `crystal_cut`, `cladding`, `electrode_metal`, `rib_width_nm`, `etch_depth_nm` and `slab_thickness_nm`. These are populated only on wang2018-mzi.
- Source: p.3 "Our devices make use of an x-cut LN configuration"; "gold micro-RF electrodes"; "SiO2 cladding layer"; "The optical waveguides have a top width w = 900 nm, rib height h = 400 nm, and a slab thickness s = 300 nm". These sentences are about the platform, not the MZI only. The gap g = 3.5 um is MZI-specific: p.4 says the racetrack Q is engineered by the electrode-waveguide distance, so g must stay off the ring rows.
- Proposed change (optional completeness): add `crystal_cut` x-cut, `cladding` SiO2 and `electrode_metal` gold to the five racetrack rows with evidence entries at the same locators. Adding the waveguide geometry is optional, with the note that it is stated for the platform's optical waveguides.

**R2-F8 (minor). weigel2018-a `il_basis` measured vs evidence basis derived for the headline on-chip loss.**
- Cells: `data/devices.csv` weigel2018-a `il_basis` = measured; evidence `il_onchip_db` 7.6 basis derived. `il_fiber_to_fiber_db` 13.6 is measured.
- Source: p.6 "the total fiber-to-fiber insertion loss was -13.6 dB"; "edge coupling loss was about -3 dB per edge"; "the actual insertion loss was around -7.6 dB" (in the sentence on intrinsic loss "not including edge couplers").
- Proposed change: none required, because the evidence basis wins per (h). For consistency the row summary could be `il_basis` derived, since `il_onchip_db` is the first-listed IL field. Judgment call.

**R2-F9 (minor, no change proposed). weigel2018 `foundry_or_fab` = Sandia National Laboratories is named only through a citation.**
- Source: p.2 "realized in a foundry Si photonics process [4]", where ref. [4] (p.12) is "Radio frequency silicon photonics at Sandia National Laboratories". Sandia co-authors belong to "Applied Microphotonic Systems". The funding statement (p.16) lists the UCSD Nano3 cleanroom without assigning steps. The paper never says in so many words that Sandia fabricated the device.
- Disposition suggestion: acceptable as entered, because the papers.csv note and the organizations.csv note both record "ref. 4". Flagged only because SKILL.md rule 6 says not to guess a fab. A correction author may choose to empty it.

## Verified clean

tran2026 (p.1-3, Fig. 1-3):
- Identity matches Crossref: title, 13 authors in order, OFC 2026 W3E.6, DOI. Crossref has year only and no license; the page footer reads "(c) 2026 Optica Publishing Group", so publisher-copyright / restricted_local_only is correct, and empty `published_on` is correct.
- Affiliations: HHI Berlin, TU Berlin, MACOM Santa Clara. Fab "fabricated on HHI's InP platform" (p.1).
- Device values: 76 GHz estimated with the measured trace normalized at 10 GHz (Fig. 1 left legend "Measurement (norm. at 10 GHz)"; text "~10 GHz"), basis author_estimate and reference 10ghz. VpiL 0.62 V*cm (p.1). 5 V bias. DC ER 18 dB (Fig. 1 center; my reading about 210 uW / about 3 uW). 1310 nm carrier. 15 dBm input. Differential drive, with TWE and 85 ohm termination optimized for differential operation.
- System values: 180 GBd PAM4 below the 20 % HD-FEC 1.4e-2 line (Fig. 3 left, my reading about 1.1e-2 at 8 dBm); the 200 GBd curve stays above it. 360 Gb/s (Tab. 1). 1.45 pJ/bit with 525 mW (driver + MZM + RF; DSP, laser and TEC excluded). 0.4 Vppd driver input. Driver annotations: > 2 Vppd, 3.5 V, 0.42 W.
- Unreported fields correctly left empty: length, IL, Z0, n_RF and layer stack.

wang2018 (arXiv v1 stamp "arXiv:1701.06470v1 [physics.optics] 23 Jan 2017", dated January 24, 2017):
- MZI: Vpi 9 V (Fig. 3c; my reading max near -4 V, min near +5 V). ER 10 dB (my reading about 0.97/0.09, about 10.3 dB). VpiL 1.8 V*cm. 2 mm (text and caption; the Fig. 2b SEM annotation "Length 1 mm" is disclosed). Push-pull description (p.3).
- MZI bandwidth and system: about 15 GHz (Fig. 4c, crossing visible) with approx qualifier. About 0.2 pF. NRZ 5/12.5/22 Gb/s at 5.66 Vpp. CV^2/4 values 1.6 pJ/bit and 240 fJ/bit (1.6 pJ also checks as 0.2 pF x 5.66^2 / 4). Dynamic ER 3 / 8 dB.
- MZI loss and geometry: on-chip IL about 2 dB (MZI) and about 1 dB (racetrack), with about 5 dB/facet coupling. About 3 dB/cm. w 900, h 400, s 300 nm, g 3.5 um, x-cut, Au, SiO2. In Fig. 2(c), h is drawn from slab top to rib top, so `etch_depth_nm` 400 is correct.
- Racetracks: Q about 50,000 loaded with resonance near 1576 nm (Fig. 3a axis 1575.8-1576.1, approx qualifier). 7.0 pm/V (Fig. 3b; my reading about 107 pm at 15 V). Q 8,000 / 5,700 / 18,000 with 30 / 40 / 11 GHz ("respectively", p.4). Splitting off the separate rt-eye row is a sound judgment, since the paper does not name the eye-diagram racetrack.
- Identity vs Crossref: Optics Express 26(2) 1547, online 2018-01-16, OA_License_v1, authors including Lončar. Fab is the Center for Nanoscale Systems, Harvard (acknowledgements).
- Note: in the arXiv render the panels labelled "c" and "d" in Fig. 2 are swapped relative to the caption. The evidence follows the caption, which is fine.

weigel2018 (author manuscript):
- Wavelength, length and VpiL: 1560 nm (p.9 and Fig. 3a caption). L 0.5 cm (p.7; Fig. 1d "5 mm" hybrid-region scale bar). VpiL 6.7 V*cm fitted at DC. Fig. 3a nulls at my reading of about -11 V and +15.5 V, i.e. about 13 V Vpi, consistent with the note's 13.4 V; that value is correctly not entered.
- Bandwidth: sideband method 2-106 GHz, "well beyond 106 GHz", entered as gt 106 with measured-to 106. Fig. 4 shows both sidebands flat within about +-1 dB to about 106 GHz.
- Loss: 13.6 dB fiber-to-fiber; about 3 dB per edge; 7.6 dB approx; 2.9 dB calculated intrinsic; 0.6 dB/cm hybrid and 1.3 dB/cm Si. ER > 20 dB.
- RF line: n_m 2.25; alpha_m 7.7 dB/cm at 100 GHz (Fig. 3c dashed curve, my reading about 7.6-7.8 at 100 GHz); Z_c 53.4-55.1 ohm, correctly left out of `z0_ohm`.
- Stack: Al 1.6 um; 50 nm SiO2 under the electrodes; SOI 220 nm Si thinned to 150 nm with 3 um oxide; handle about 6x10^3 ohm cm; Si widths 650 / 320 nm; x-cut NanoLN (Jinan Jingzheng Electronics Co. Ltd.); push-pull test electrodes on one EOM (Fig. 1c caption).
- Identity vs Crossref: Optics Express 26(18) 23728, online 2018-08-29, 14 authors, OA_License_v1.

he2019 (manuscript plus Supplementary Information):
- Vpi: 7.4 V for 3 mm. The Fig. 2a arrow reads 7.4 V (my reading max near -3.4 V, min near +4 V), and the caption's "4.5 V" is disclosed. 5.1 V for 5 mm (Fig. 2a). VpiL 2.2 / 2.5 V*cm. Push-pull is stated (p.4), and Supp. I defines VpiL with pi/2 per arm.
- Bandwidth and ER: > 70 GHz with VNA limit 70 GHz (Fig. 3b: both traces above -3 dB to 70 GHz, by my reading about -2 to -2.5 dB at 70 GHz). ER > 40 dB from the Fig. 2a inset.
- Geometry: w 1 um, s 420 nm, h 180 nm, 60 degrees (Fig. 1c "θ = 60°"). Gap: Supp. II gives w + 2g = 6.5 um, with g = 2.75 um. Signal 19.5 um, ground 30 um, t 0.6 um, Au (Fig. 1b legend). BCB about 300 nm, hSiO 3 um. Fig. S2 shows hLN as the slab thickness, consistent with s = 420 nm.
- Losses: 0.98 dB/cm from Supp. III cut-back. VAC loss 0.19 vs 0.13 dB, which is context only and correct.
- System: OOK 56/72/84/100 Gb/s with ER 11.8/6.0/5.5/5.0 dB; PAM-4 28/56 GBd; 4 Vpp SHF 807; 714 fJ/bit (Supp. II, 4 V, 112 Gb/s) vs "about 700 fJ/bit" in the main text.
- Sim config targets match the evidence and figure: 2.2, 7.4, 2.46, ng 2.21. My readings of the Fig. S4 dashed curves are about 2.16 (n_m plateau), about 48 ohm at 40-60 GHz (Re Z0) and about 7.3 dB/cm at 100 GHz (alpha_m). The simulated ng 2.21 is labelled simulated in evidence and in the row note.
- Identity vs Crossref: Nature Photonics 13(5) 359-364, online 2019-03-04, 16 authors, only the Springer TDM link, so publisher-copyright / restricted_local_only is correct. Organizations: Sun Yat-sen University and South China Normal University (CN, Guangzhou) as in the affiliations.

boynton2020:
- Identity, authors, venue, online date and the Crossref license record are verified as described under per-paper verdicts. Affiliations are absent in Crossref (author affiliation arrays empty), so the empty org fields are correct.
