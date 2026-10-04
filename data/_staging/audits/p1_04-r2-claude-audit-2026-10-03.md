---
auditor: fresh-context subagent
task: Q1-p1_04 (first independent audit)
date: 2026-10-03
scope: batch p1_04 canonical rows (valdez2022, xu2022, meng2023, renaud2023, valdez2023); data/papers.csv, data/devices.csv (21 rows), data/organizations.csv (orgs referenced), data/evidence/<id>.yaml, sims/<id>/config.yaml targets
mode: read-only; only this file written; no network, no git, no build_views, no merge --apply
verdict: pass after corrections (0 blocking, 3 numerical, 3 metadata, 13 minor)
findings: {blocking: 0, numerical: 3, metadata: 3, minor: 13}
---

# Audit Q1-p1_04 (first independent audit)

## Method and limits

Read first: `.claude/skills/eo-modulator-distill/SKILL.md`, `data/schema/devices.schema.yaml` (conventions (a)-(k), column definitions, papers columns), `data/_staging/BATCH_INSTRUCTIONS.md`, and the p3_16-p3_19 audit for format only.

Source access: `references/<id>/text.md` and `references/<id>/figures/` do NOT exist locally for any of the four cached papers (only `source.pdf`, `source.json`, `crossref.json` are present; text and figures are git-ignored and were not regenerated). I did not write into `references/`. Instead I verified that each tracked `source.pdf` matches the sha256 in its `source.json` (all four match), then extracted page-delimited text and 150 dpi page renders with pymupdf into the scratchpad. The page index is the PDF page index, identical to the `<!-- page N -->` convention, so the canonical locators can be checked one to one. Zoomed renders (400-500 dpi) were made for valdez2022 Fig. 5, valdez2023 Fig. 9(b), renaud2023 Fig. 2(a,b); bar heights and data points were measured by pixel on the renders (my readings are approximate and labelled so).

Read in full: valdez2022 (arXiv v1 manuscript, 13 pp.), valdez2023 (arXiv v2 manuscript, 21 pp.; references skimmed), meng2023 (16 pp. manuscript; references skimmed), renaud2023 (journal article, 7 pp.). Page renders opened: valdez2022 p.2, 7, 8, 10; valdez2023 p.3, 11, 13; meng2023 p.6, 9, 10, 11; renaud2023 p.3. `crossref.json` read for valdez2022, renaud2023, valdez2023, xu2022 (meng2023 has none). Not available: Supplementary Information of renaud2023 (Supp. Fig. 1 loss cutback, Supp. Tables 1-2), journal versions of valdez2022 and valdez2023, any full text of xu2022 (only `crossref.json`; its abstract field has been stripped).

Order: Step 1 (all checks above) was completed before reading `data/_staging/p1_04/BATCH_REPORT.md` and `SPEC_PROPOSALS.md`; those were read afterwards for context only. No round-1 audit exists (Step 2 skipped).

Mechanical checks (scratchpad script, read-only): 21 device rows (valdez2022 1, meng2023 3, renaud2023 9, valdez2023 8). Every non-empty evidence-required cell has an evidence entry with an equal value (0 missing, 0 mismatches); no evidence entry points at an empty cell or unknown device; entry units equal schema units; entry bases are all in the `basis` enum; every `qualifiers` item sits on a populated field with op in lt|gt|approx; no non-ASCII characters and no absolute or home paths in the four evidence files or the four sim configs.

Validator: `uv run python scripts/validate_db.py` printed `0 error(s)`.

## Per-paper verdicts

| Paper | Verdict | Findings |
|---|---|---|
| valdez2022 | pass after corrections | R2-F1, R2-F6, R2-F9, R2-F10, R2-F11 |
| xu2022 | pass (no device rows is correct; minor note/org items only) | R2-F7, R2-F8 |
| meng2023 | pass after corrections | R2-F4, R2-F15, R2-F16 |
| renaud2023 | pass after corrections | R2-F2, R2-F3, R2-F17, R2-F18 |
| valdez2023 | pass after corrections | R2-F5, R2-F11, R2-F12, R2-F13, R2-F14 |
| cross-paper (organizations.csv) | minor | R2-F19 |

xu2022 check requested by the task: correct that it has no device rows. `references/xu2022/` holds only `crossref.json`; `prefetch_status.jsonl` records `no_open_source`; the paper is on `data/manual_downloads.md` (publisher PDF blocked to scripted download). Paper row identity matches Crossref: title, 14 authors in order (including Fabio Pittala with grave accent), Optica 9(1) p.61, DOI 10.1364/optica.449691, published-online 2022-01-10, license URL OA_License_v2 (VOR), source_type journal, cache_status needs_download, redistribution restricted_local_only (conservative; Optica OA License v2 is not a CC licence). Only R2-F7 and R2-F8 remain.

## Findings

### Blocking

None.

### Numerical

**R2-F1 (numerical). valdez2022-a `bw3db_ghz` carries qualifier `gt`, but the body and the figure show a 3 dB crossing at the 110 GHz limit.**
- Cells: `data/devices.csv` valdez2022-a `qualifiers` = `bw3db_ghz:gt;optical_power_handling_dbm:gt` (the `bw3db_ghz:gt` part); `bw3db_ghz` = 110, `bw_measured_to_ghz` = 110.
- Source: p.1 abstract "3-dB bandwidth greater than 110 GHz"; p.8 Fig. 5 caption "resulting in a measured 3-dB bandwidth of 110 GHz for both (a) ... and (b)"; p.8 text "In both cases, the measured EOR has a 3-dB bandwidth of 110 GHz"; p.9 Table 1 "This Work: 110" (no >, while other Table 1 rows use > where they mean a bound); p.9-10 Conclusion "bandwidths of 110 GHz". My reading of the 400 dpi crop of Fig. 5 (approximate): in (a) OSA squares at about 108-110 GHz and the LCA trace from about 100 GHz sit at or slightly below the -3 dB dash-dot line; in (b) squares at about 107-109 GHz touch or cross -3 dB. The data reach -3 dB near the instrument limit; they do not stay above it.
- Rule: convention (c), "A claimed crossing at the instrument limit fills bw3db_ghz (with approx if the paper says around) and bw_measured_to_ghz" with no `gt`. The row note already says "the 3 dB level is reached at the 110 GHz limit", which contradicts the `gt`.
- Change: `qualifiers` -> `optical_power_handling_dbm:gt` (drop `bw3db_ghz:gt`; see R2-F9 for the remaining qualifier). Keep 110 / 110. Add to the evidence note of `bw3db_ghz`: "abstract says greater than 110 GHz; body, Fig. 5 caption and Table 1 give 110 GHz; data cross -3 dB at about 108-110 GHz". No sim target is affected (sims/valdez2022 has no bandwidth target).

**R2-F2 (numerical). renaud2023-3um-738 `z0_ohm` = 50 (approx) is a design target that the paper's own measurement discussion contradicts, and it is used as a sim validation target.**
- Cells: `data/devices.csv` renaud2023-3um-738 `z0_ohm` 50 with `z0_ohm:approx`; evidence entry basis `design_target`, locator p.2; `sims/renaud2023/config.yaml` target `z0_ohm` 50, tol_abs 5.
- Source: p.2 "Finite element method (COMSOL) simulations are used to design electrodes with impedance close to 50 Ohm" (design intent). p.3 "A non-DC reference is chosen due to both the rapid roll-off originating from the CPW impedance mismatch ..." (the fabricated line is mismatched to the 50 Ohm source/load). No measured or simulated Z0 number of the fabricated device is given in the main text.
- Why numerical: the row has no per-field basis column, so a consumer reads 50 ohm (approx) as the device impedance next to measured Vpi/BW/IL values, while the paper says the fabricated CPW is impedance mismatched. As a sim target it would validate the engine against a design aim, not against the device.
- Change: clear `z0_ohm` and `z0_ohm:approx` on renaud2023-3um-738 and delete its evidence entry; add to row notes "electrodes designed for Z close to 50 ohm (COMSOL, p.2); authors attribute the low-frequency roll-off to a CPW impedance mismatch (p.3); fabricated Z0 not reported". Remove the `z0_ohm` target from `sims/renaud2023/config.yaml` (or keep it only under a non-validating design-intent heading, if SPEC.md allows one).

**R2-F3 (numerical). renaud2023-3um-738 `rf_loss_db_per_cm` = 7.99 at `rf_loss_freq_ghz` = 35 is the distiller's own arithmetic labelled as an evidence entry.**
- Cells: `data/devices.csv` renaud2023-3um-738 `rf_loss_db_per_cm` 7.99, `rf_loss_freq_ghz` 35, `rf_loss_db_per_cm:approx`; evidence entries basis `derived` (note "value at 35 GHz computed here") plus a `derived` list item `1.35 * sqrt(35)`.
- Source: p.3 "limited by RF loss of the CPW (1.35 dB cm-1 GHz-1/2)". The paper states only the coefficient; it never states a loss at 35 GHz, and 35 GHz is a choice made by the distiller.
- Rule: SKILL rule 11 / convention (h): `entries` hold values the paper states (`derived` there means the authors deduced it); the evidence `derived` list holds the distiller's own arithmetic. Rule 4 (by analogy for VpiL) keeps own arithmetic out of the CSV. The arithmetic is right (1.35 x 5.916 = 7.99), but the cell presents a computed point value at an arbitrary frequency as a paper value.
- Change: clear `rf_loss_db_per_cm`, `rf_loss_freq_ghz` and the `rf_loss_db_per_cm:approx` qualifier and their two evidence entries; keep the `derived` list item; keep the coefficient "1.35 dB/cm/GHz^0.5 (p.3)" in row notes (already there). If the coordinator prefers to keep a point value, change the note to say explicitly "computed by the distiller from the stated coefficient, not a paper value".

### Metadata

**R2-F4 (metadata). meng2023 `license` asserts "arXiv-nonexclusive" without a Crossref record or a notice in the cached file.**
- Cells: `data/papers.csv` meng2023 `license` = "arXiv-nonexclusive (arXiv default licence from prefetch metadata; no notice in the cached text)", `redistribution` = restricted_local_only.
- Source: no `references/meng2023/crossref.json` (prefetch `crossref: missing`); the cached PDF carries no arXiv stamp and no licence notice (PDF metadata: Foxit print, created 2023-11-08, i.e. a local-corpus copy, not the arXiv-served file).
- Rule: convention (k), every licence and redistribution claim needs `crossref.json` or the paper's own notice quoted in evidence.
- Change: `license` -> empty (or the literal "unverified"), with the note "arXiv licence not verifiable offline; cached copy is not the arXiv-served PDF"; `redistribution` -> `unknown` (keeping `restricted_local_only` is acceptable only if the coordinator treats it as the conservative default rather than a verified claim; say so in notes either way).

**R2-F5 (metadata). valdez2023 `published_on` = 2023-01-30 is later than the cached arXiv v2 date, so it is not the first public version.**
- Cells: `data/papers.csv` valdez2023 `published_on` 2023-01-30.
- Source: cached p.1 stamp "arXiv:2211.05208v2 [physics.optics] 25 Jan 2023"; Crossref published-online 2023-01-30. Schema: `published_on` = "ISO date of first public version if known". The v1 date is not in the cache, but v2 already predates 2023-01-30. valdez2022 in the same batch uses the arXiv stamp date (2022-10-26), so the two sister rows follow different rules.
- Change: either clear `published_on` and add to notes "journal 2023-01-30 (Crossref); arXiv v2 2023-01-25 (p.1); v1 earlier, date not verifiable offline", or set it to 2023-01-25 with a note that it is the v2 date and an upper bound of the first version. Do not keep 2023-01-30.

**R2-F6 (metadata). valdez2022 tracked `references/valdez2022/source.json` describes the journal version, but the cached `source.pdf` is the arXiv v1 manuscript.**
- Cells: `references/valdez2022/source.json` `url` = https://doi.org/10.1038/s41598-022-23403-6, `license` = CC-BY-4.0, `local_origin` empty.
- Source: cached p.1 stamp "arXiv:2210.14785v1 [physics.optics] 26 Oct 2022"; PDF metadata "LaTeX with hyperref / dvips + Ghostscript", created 2022-10-28 (not the Springer Nature typeset PDF). sha256 matches `source.json`, so the record and the file are paired, but the record mislabels what the file is. `data/papers.csv` notes already state correctly that numbers come from arXiv v1.
- Change (coordinator, cache metadata): set `source.json` url to https://arxiv.org/abs/2210.14785v1 (or add a `version` field), and license to the arXiv licence if verified, else "unverified"; the `papers.csv` row needs no change beyond what it already says.

### Minor

**R2-F7 (minor). xu2022 `universities`, `companies`, `countries` are empty although `crossref.json` lists partial affiliations.**
- Crossref author affiliations: Sun Yat-Sen University (Xu, Zhu, He, Wang, Yu, Cai), Zhejiang University (Ruan, Liu); six authors have no affiliation in the record. Leaving all three empty is defensible under rule 6 (affiliations from the paper) because the record is incomplete and companies cannot be determined. Suggested: add to notes "Crossref lists Sun Yat-sen University and Zhejiang University for 8 of 14 authors; remaining affiliations unknown until the PDF is obtained" rather than filling partial columns.

**R2-F8 (minor). xu2022 `notes` quote abstract metrics ("sub-1 V drive, 110 GHz bandwidth, 1.96 Tb/s net") from a Crossref abstract that is no longer in the tracked `crossref.json` (abstract stripped), and say "Listed in needs_download.md".**
- Change: either drop the three numbers from the note or mark them "from the Crossref abstract at prefetch time, not retained in the tracked record; unverified"; change "needs_download.md" to `data/manual_downloads.md`.

**R2-F9 (minor). valdez2022-a `optical_power_handling_dbm:gt` is not backed by source wording about 110 mW.**
- Source: p.1 "can handle high optical power of 110 mW"; p.10 "at power levels of up to 110 mW, we did not observe degradation"; p.10 "less than 1 dB at 20.4 dBm". The only "greater than" is "greater than 100 mW" (p.8, about 100 not 110). The evidence note correctly says "maximum on-chip peak power tested ... not a damage limit".
- Suggested: drop the `gt` (value 20.4 = maximum tested peak power, quasi-CW 1 us / 100 us) or keep it and add to the evidence note "gt encodes 'tested up to, no degradation'; not source wording". Judgment call; either is acceptable if stated.

**R2-F10 (minor). valdez2022-a notes omit the second, identically designed MZM on a different chip measured with the LCA (cyan trace, Fig. 5(a)).**
- Source: p.8 "the EO S21 of an identically designed hybrid bonded MZM on a different chip was independently verified at low CW optical power using a lightwave component analyzer". Not a separate row (only an S21 trace, no number), but the note should say the 110 GHz statement covers the OSA data of device -a and the LCA trace of a second device.

**R2-F11 (minor). `modulation_format` = "none (small-signal EO S21 and Vpi characterization only)" in valdez2022-a and all 8 valdez2023 rows.**
- These 9 rows are the only ones in `data/devices.csv` that put a sentence into an evidence-required value column to say "not reported". Empty = not reported (schema rule); a non-empty string can be picked up by views as a format.
- Change: clear `modulation_format` on these 9 rows and delete the 9 evidence entries; the phrase can stay in `notes`.

**R2-F12 (minor). valdez2023-cn1/-cn2 `il_onchip_excludes` says it is "not stated" whether the 1.2 dB feeder loss is included; the paper defines the number by its components.**
- Source: p.7 "The insertion loss of the phase-shifter section, 3-dB MMI couplers, and LN transitions are thus calculated to be 1.6 dB and 2.1 dB"; p.7 "1.2 dB of the insertion loss is attributed to the feeder sections alone" (separate item).
- Suggested `il_onchip_excludes`: "edge coupling (estimated 4.2 dB/edge, C-band) and wide-Si feeder sections (1.2 dB, attributed separately)". Keep the row-note remark that 2.1 dB conflicts with "less than 2 dB" (p.2) and that (2.1-1.6)/0.46 cm = 1.1 dB/cm differs from the stated 1.5 dB/cm.

**R2-F13 (minor). valdez2023-cn1/-cn2 `prop_loss_db_per_cm:approx` has no approximation word in the source.**
- Source: p.7 "Assuming all other losses are common, the loss from the phase-shifter would then be 1.5 dB/cm." Basis `derived` already captures the assumption.
- Change: drop `prop_loss_db_per_cm:approx` from both rows (or keep and add an evidence note that approx encodes the stated assumption, not wording).

**R2-F14 (minor). valdez2023-on1 (Vpi 2.6 V, 1.0 cm, VpiL 2.6 V cm) and -on2 (4.37 V x 0.54 cm = 2.36 V cm) fall outside the text's "O-band VpiL of 2.0 V.cm to 2.3 V.cm" (p.12); not noted.**
- Fig. 7(d) legend and labels (p.11): ON1 L = 1.0 cm Vpi 2.6 V, ON2 L = 0.54 cm Vpi 4.37 V; Fig. 9(a) bars (p.13, my reading) about 2.65 and 2.36 V cm. The rows follow Fig. 7 correctly; add one sentence to the ON1/ON2 notes that the p.12 text range understates the ON devices.

**R2-F15 (minor). meng2023-a `eo_film_thickness_nm` 500 is distiller arithmetic (h + s) entered as an evidence entry with basis `derived`.**
- Source: p.5 ridge height h = 260 nm, slab s = 240 nm; Fig. 2(a) (p.6) shows h measured from the slab top, so 500 nm is geometrically sound, but the paper never states a film thickness. Same class as R2-F3 but low impact (pure geometric identity). Suggested: keep the cell only if the coordinator accepts geometric identities; otherwise clear it and keep the `derived` list item. Either way the entry note should read "not stated; h + s computed by the distiller".

**R2-F16 (minor). meng2023-a headline `extinction_ratio_db` = 1.98 dB is the PAM4 224 Gb/s eye ER, the least comparable of the five eye ERs.**
- Source: p.11 "(5.34, 4.15, 2.81, 2.32, 1.98) (dB) as shown in Figure 7(a)-(e)" (56/80/112 Gb/s OOK, 112/224 Gb/s PAM4). meng2023-b/-c carry the 56 Gb/s OOK ER (6.0 / 1.3 dB). Suggested: use 5.34 dB (56 Gb/s OOK, Fig. 7(a)) as the headline for comparability with -b/-c and with other rows, and keep the full list in notes (already there). Judgment call; the current value is correctly transcribed.

**R2-F17 (minor). renaud2023-3um-738 `bw3db_ghz` 35 and `extinction_ratio_db` 21 carry evidence basis `extracted_from_figure` although the text states both numbers.**
- Source: p.3 "The extracted 3 dB bandwidth is approximately 35 GHz (w.r.t. to 3 GHz)"; p.3 "~ 21 dB for 3 um gap devices (Fig. 2b, inset)". Change both evidence bases to `measured` (authors' extraction of their own measurement) and `bw_basis` to `measured`; keep `approx` qualifiers.

**R2-F18 (minor). renaud2023 notes: text vs figure Vpi differences and the Discussion's "0.7 dB" wording are only in BATCH_REPORT, not in canonical notes.**
- Fig. 2(a) (p.3), my pixel reading of the measured points (approximate): about 0.43 V at about 532 nm, 0.47 at about 640, 0.56 at about 745, 0.81 at about 843, 0.80 at about 935 nm; text gives 0.42, 0.45, 0.55, 0.85 V at 532/638/738/838 nm. Rows correctly use the text values; add to renaud2023-3um-638 and -3um-838 notes "Fig. 2(a) point about 0.47 / 0.81 V". The 938 nm row (0.8, approx, extracted) matches my reading.
- p.5 Discussion "on-chip insertion loss as low as 0.7 dB" restates the 0.7 dB/cm cutback figure for a 1 cm device; mention it in the -3um-738 note so `il_onchip_db` staying empty reads as a deliberate choice (Y-splitters add about 0.2 dB each, p.2).

**R2-F19 (minor, cross-paper). `data/organizations.csv` Sandia National Laboratories note "Si photonics foundry process (ref. 4 of the paper)" does not say which paper.**
- Referenced by valdez2022 (`companies`) and valdez2023 (`foundry_or_fab`). Suggested note: "Albuquerque, NM; Applied Microphotonic Systems (valdez2022 affiliation 2); acknowledged for fabrication assistance in valdez2023". valdez2023 `foundry_or_fab` (SDNI; Sandia) is supported by the acknowledgements (p.16: "Sandia National Laboratories ... for discussions and fabrication assistance"; "Part of this work was performed at the San Diego Nanotechnology Infrastructure"), and the papers note says so; acceptable.

## Verified clean

valdez2022 (arXiv v1): 5 mm (Lps = 0.5 cm, p.7 and Fig. 4(b)); 1550 nm (abstract); VpiL 3.1 V cm average over 0.1-10 MHz (p.7; Fig. 4(b) points about 3.1, 3.1, 3.13, 3.0); fiber-to-fiber IL 12.2 dB, mean ER 28 dB over 50 nm, max 31 dB at 1560 nm, FSR 2.3 nm (p.7, Fig. 4(a)); on-chip IL 1.8 dB = 12.2 - 2 x 5.2 dB with 0.44/0.14/0.4/0.34/0.44 dB section losses and 0.1 dB per LN edge (p.10 Fig. 6, Methods), basis derived and includes/excludes text correct; 110 mW = 20.41 dBm, 20.4 dBm stated (p.10); ng 2.32 and RF index 2.34 at 110 GHz simulated (p.6); gap 9 um, signal 55 um, slot 5 x 4 um period 25 um (p.6); Ti/Au 20/750 nm (p.5); SOI 150 nm Si / 3 um SiO2 / 725 um HR Si, CMP oxide about 40 nm (p.5-6); x-cut 600 nm LN from NanoLN (p.5); air above LN (Fig. 1(c,d) p.2); push-pull geometry one arm per gap (Fig. 1(a)), labelled derived; theory about 156 GHz (p.8) and Z0 42 ohm (p.8) correctly kept out of measured cells; sim targets 3.1 / 2.32 / 2.34 at 110 GHz / 42 (p.8, basis unspecified) match. papers.csv identity, authors, venue (Sci. Rep. 12, 18611), DOI, arXiv id, CC-BY-4.0 journal licence (Crossref vor) and published_on = arXiv v1 date 2022-10-26 are consistent; affiliations UCSD and Sandia (p.1) correct; foundry_or_fab empty is right (no fab named).

valdez2023 (arXiv v2): device labels and lengths from Fig. 7 legends (p.11): CW2/CN2/OW1/ON2 = 0.54 cm, CW1/CN1/OW2/ON1 = 1.0 cm, matching all 8 rows; Vpi 5.59/2.93, 5.78/3.11, 3.78/2.01, 4.37/2.6 V (Fig. 7; OW values also p.10 text); 1 kHz cosine-squared fit, no DC bias (p.9-10, p.15); push-pull stated with Eq. (2) (p.10); gaps CW 7, CN 8, OW 6, ON 8 um (Fig. 7, p.12); Si widths 300/275/250/225 nm (p.4); ng simulated 2.38/2.31/2.43/2.30 (p.4); Fig. 9(b) bars by my pixel measurement (approximate): CW1 54.3, CW2 79.5, CN1 69.1, CN2 109.4, OW1 94.4, OW2 54.3, ON1 66.2, ON2 101.7 GHz, matching the rows 54/79/69/109/94/54/66/102 within 1 GHz; EO S21 normalized to 1 GHz (p.7, abstract); LCA 100 MHz to 110 GHz (p.7, p.15); RF loss less than 9 dB/cm at 110 GHz and Zc about 40 ohm, measured, all structures (p.6); Au 0.75 um (p.6), electrodes directly on LN, no buffer (p.15); TFLN about 580 nm (p.3); HR Si substrate (Fig. 1(b) p.3); laser +9 dBm C-band / +12 dBm O-band, no amplifier (p.6); IL 1.6/2.1 dB and 1.5 dB/cm (p.7), basis derived. Sim targets (CN1: 3.11 V, ng 2.31, Z0 40, BW 69) match the rows. papers.csv identity vs Crossref (title, 4 authors, Opt. Express 31(4) 5273, DOI) correct; UCSD affiliation; no company.

meng2023: 5 mm, Vpi 2.04 V and VpiL 1.02 V cm at 100 kHz sawtooth with an O-band laser (p.9 text, Fig. 5(a) labels "Vpi = 2.04 V, VpiL = 1.02 V cm"); 1.024 in p.3 and Table 1 (p.13) noted; EO S21 -3 dB at 108 GHz (abstract, p.10, conclusion), trace to about 110 GHz with a +2 dB peak near 5 GHz (Fig. 6 p.10), reference unspecified; dynamic ERs 5.34/4.15/2.81/2.32/1.98 dB (p.11, Fig. 7(a)-(e)); 112 GBd / 224 Gb/s PAM4 and OOK 56/80/112 Gb/s (Fig. 7 caption); SHF S804B 22 dB, M8199A 70 GHz AWG (p.10); 23 ohm termination (p.8); ridge h 260 nm, w 2 um, slab 240 nm, 100 nm SiO2 buffer (p.5); Au gap 5 um, ITO gap 3 um, tAu 1.4 um, tTCO 180 nm (p.6); ng about 2.29 (Fig. 2(b) label, simulated); Si substrate and SiO2 cladding from Fig. 2(a) legend; x-cut (p.3); push-pull GSG stated (p.4-5); 8 mm devices ER 1.3 / 6.0 dB at 56 Gb/s OOK (p.12, Fig. 8). IL 2.9 dB at 1310 nm correctly left out of both IL columns (undefined, grating couplers). Sim targets 1.02 / 2.29 / 108 match. papers.csv authors (13), affiliations (Huazhong University of Science and Technology; Huawei Technologies, B & P Laboratory) and CN correct.

renaud2023: Vpi 0.42/0.45/0.55/0.85 V at 532/638/738/838 nm for a 1 cm, 3 um gap MZM at 1 MHz (p.2, Fig. 2(a) caption, Methods p.5); VpiL 0.55 V cm at 738 nm (abstract, Fig. 1(b)); gap series 2.5/4/5 um at 738 nm: my pixel reading of Fig. 2(b) about 0.47, 0.79, 0.92 V (rows 0.47, 0.79, 0.93, all approx, extracted); ER over 25 dB for 5 um, about 21 dB for 3 um (p.3); 3 dB BW about 35 GHz w.r.t. 3 GHz, theory about 36 GHz, data to about 40 GHz (p.3, Fig. 2(c)); on-chip loss about 0.7 +- 0.2 dB/cm, about 7 dB/facet, total about 15 dB (p.2); RF index 2.22 at 50 GHz simulated, optical group index about 2.38, mismatch about 0.17 (p.2); 300 nm x-cut TFLN on 2 um thermal oxide on Si (NanoLN), 180 nm etch, 600 nm width in electrode region, 120 nm slab, about 1 um PECVD cladding, Ti/Au about 10/800 nm (p.2, Fig. 1(c), Methods p.5); push-pull CPW stated (p.2); phase modulator Vpi about 1 V at 100 MHz, 1 cm, 3 um gap, 737 nm (p.4). papers.csv: Nat. Commun. 14, 1496, published 2023-03-27, CC-BY-4.0 (Crossref vor and tdm), open_license_ok justified; affiliations Harvard (SEAS, Physics), IMRE A*STAR (SG), Caltech; foundry_or_fab Center for Nanoscale Systems supported by the Acknowledgements (p.6); wafer supplier NanoLN (p.2). Sim targets 0.55 / 2.22 at 50 GHz / 2.38 / 35 match (z0 see R2-F2; the 3 GHz bandwidth reference is listed under limitations).
