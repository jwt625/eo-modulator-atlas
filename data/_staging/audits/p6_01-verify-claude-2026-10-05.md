# p6_01 verification (Claude, fresh context, 2026-10-05)

Batch: liu2021 (REPLACE; candidate liu2021a folded into the canonical paper), yang2022, xue2026, chen2026 (NEW). Inputs: `data/_staging/audits/p6_01-claude-audit-2026-10-05.md`, `data/_staging/p6_01/AUDIT_DISPOSITIONS.md`, `BATCH_REPORT.md`, staged CSV/evidence, `sims/{liu2021,yang2022,xue2026,chen2026}/config.yaml`, `CORRECT_PROMPT.md`, conventions (a)-(gg), sources under `references/`. Read-only; this file is the only output. Figure renders (200-500 dpi) are in the scratch directory only.

Result: 22 findings; 21 confirmed, 1 not confirmed (M2, against the coordinator decision). New issues: 1 metadata (M2 revert), 4 minor.

Dry run: `uv run python scripts/merge_staging.py data/_staging/p6_01 --replace-paper-ids liu2021,yang2022,xue2026,chen2026` -> `merge counts: {'papers': 4, 'devices': 5, 'orgs': 4, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.

## 1. Per finding

| id | verdict | evidence |
|---|---|---|
| B1 | confirmed | Journal text (references/liu2021/text.md p.1-5) has the same authors, process ("partially etched by 300 nm and then covered with a 100-nm-thick SiO2 layer", "thickened to 1.4 um by electroplating"), 3.4 V, 1.7 V cm, 1.3 dB at 67 GHz, ng ~2.25 as the arXiv cache. Fold applied per coordinator: references/liu2021/ holds the VOR (source.json role primary, version_of_record, DOI 10.3788/col202119.060016), arXiv cache in references/liu2021/arxiv/ (source.json, source.pdf, text.md, figures), arxiv.json at the paper root; references/liu2021a/ and sims/liu2021a/ no longer exist; sims/liu2021/config.yaml is the folded config with ids liu2021-a. Papers row: Crossref title/authors/venue "Chinese Optics Letters 19(6), 060016" (Crossref vol 19, issue 6, page 060016), url https://doi.org/..., arxiv_id 2103.03684, published_on 2021-02-04 = arxiv.json v1 "Thu, 04 Feb 2021" (convention n), discovered_via local_corpus (canonical kept, rule 4), publisher-copyright / restricted_local_only / access unknown. Field-by-field comparison in section 2. |
| N1 | confirmed | p.6 text "the 3-dB BW ... exceeds 67 GHz"; Fig. 4(a) re-rendered at 500 dpi: blue trace dips just below the -3 dB line near 57 GHz, deepest near 64 GHz (about -3.5 dB) and again at 66-67 GHz. chen2026-a bw3db_ghz empty, no gt qualifier, no bw3db evidence entry; bw_measured_to 67, bw_method eo_s21, bw3db_reference, bw_basis kept; claim and readings in notes and context_values (claimed_bw3db_ghz). Matches coordinator decision (y). |
| N2 | confirmed | xue2026 p.3 process order: T-rails, main electrodes, then 100 nm PECVD cladding, then ICP-RIE "exposes the main electrodes"; Fig. 1(b). Config: all 7 electrode rects (both cross-sections) start at y = 0.1 (slab top); mains 0.1-1.2, rails 0.1-0.7; silica_buffer 0.1-0.2 is overlapped by the metal (SPEC.md: painter order, conductors are electrodes), provenance cites p.3 and Fig. 1(b), un-modelled cladding over rail tops listed. Matches coordinator decision. |
| M1 | confirmed | yang2022 text.md p.1 "Received September 11, 2021 \| Accepted November 2, 2021 \| Posted Online November 24, 2021"; quote in evidence context_values (printed_dates) and papers notes; published_on 2021-11-24, year 2021 (convention n now lists the printed Posted Online date as a candidate). liu2021 also carries the journal notice in context_values. The "left open" refresh override is already implemented in the working tree: scripts/refresh_metadata.py `printed_online()` (lines 261-270, used at 397-399). |
| M2 | NOT confirmed | Corrector renamed the org to "Suzhou Institute of Nano-Tech and Nano-Bionics" (organizations.csv and chen2026 papers.companies). Coordinator decision: keep the name as printed. Printed p.1 affiliation 3: "i-Lab, Suzhou Institute of Nano-Tech and Nano-Bionics, Chinese Academy of Sciences"; Crossref affiliation name: "Suzhou Institute of Nano-Tech and Nano-Bionics, Chinese Academy of Sciences". The precedent renames (SIMIT, SIOM, XIOPM) carry a verified own-name name_source; this row has none, so convention (e) gives no basis for the rename. See new issue 1. |
| M3 | confirmed | references/chen2026/crossref.json: all 8 authors carry `{'id': 'https://ror.org/01rxvg760', 'id-type': 'ROR', 'asserted-by': 'publisher'}` (the affiliation-2 entry). ror_id and name_source = that URL (rule 2 allows crossref.json; same form as the existing "University of Chinese Academy of Sciences" row). Other three orgs empty with "no ROR in Crossref" notes: correct (no ROR on their Crossref affiliation entries). |
| M4 | confirmed | yang2022 access unknown; notes "access not verifiable offline (unknown)". |
| M5 | confirmed | xue2026 and chen2026 license `Optica-OA-License-v2` (bare token), redistribution restricted_local_only; Crossref VOR licence URL https://doi.org/10.1364/OA_License_v2#VOR-OA in notes (crossref.json license entries). |
| m1 | confirmed | Journal p.2 Fig. 1(a),(b) render: electrodes labelled "gold". liu2021-a electrode_metal gold, basis design_target, locator "p.2 Fig. 1(a),(b) labels"; config provenance (gold.sigma note) and missing list updated. |
| m2 | confirmed | slab_thickness_nm in `derived` with formula and inputs for liu2021-a (600-300), yang2022-a (600-200), xue2026-a/b (360-260), chen2026-a (600-300); no slab entry remains in `entries` (scripted check). |
| m3 | confirmed | yang2022 text.md line 482 "The measured VpiL at 5 MHz is 4.74 V for our 5 mm long device"; Fig. 5(a) label "Vpi=4.74V" (text.md line 645). Evidence locator and note cite both; row note updated. |
| m4 | confirmed (adjusted) | Abstract "~2.37 V cm" (line 24); intro/conclusion "2.37 V cm" without "~" (lines 69, 701); 4.74 x 0.5 = 2.37 exactly. No approx qualifier, the "~" is recorded in notes and evidence. Defensible under (b) since the row value is the derived product. |
| m5 | confirmed | BATCH_REPORT has no tension remark; yang2022-a notes and context_values say 3.2e-3 lies below both Fig. 6(b) lines (2.4e-2, 3.8e-3). |
| m6 | confirmed | chen2026 abstract "VpiL of 2.4 V cm", p.5 "VpiL of 2.4 V cm", Table 1 "2.4"; qualifiers empty. |
| m7 | confirmed | chen2026 p.5 "group index of the optical mode (ng = 2.2)"; ng_opt 2.2, basis author_estimate, note "without a source or method". liu2021-a ng 2.25 from Fig. 4 caption p.4 "(ng ~2.25)", author_estimate, approx: same rule. |
| m8 | confirmed | chen2026 p.8 Fig. 5 caption "normalized using the same reference point of 1.0 GHz/V", "input voltage applied to the microring modulator is 8 V"; p.7 "gap between the metal electrode and the waveguide is 2.4 um", "+-4%", p.8 "5.8%", "32%". All in papers notes and context_values; no rows. |
| m9 | confirmed | xue2026 text p.6 (text.md line 275) "-6.4 dB roll-off at 67 GHz"; Fig. 4(a) on p.8 (vector figure, rendered): EE S21 ends near -4.3 to -4.4 dB, -6.4 dB is a dashed marker; caption "3-dB bandwidth of approximately 35 GHz and a 6-dB bandwidth exceeding 67 GHz". Fig. 6(f) p.10 (rendered): 80G PAM-4 about 2e-2, 2.5e-3, 5e-4, 3e-4 at -18..-15 dBm (above 2.4e-4), about 1.6e-4 at -14 dBm; 64G OOK above 2.4e-4 at -23..-21 dBm. Row note matches. |
| m10 | confirmed | p.7 "rapid 1-dB roll-off at low frequency range below 2 GHz ... only 1.3 dB roll-off"; reference ambiguity in xue2026-b notes and the eo_rolloff_db evidence note; bw3db_reference low_freq_unstated. |
| m11 | confirmed | Alternative H/S reading in rail provenance, `missing` and `limitations`; vpi_l_dc_vcm and n_rf targets annotated LOW CONFIDENCE. Fig. 1 caption only lists "W, g, H, S, T, R, and C are 50, 5, 5.2, 2, 5, 45, and 5 um"; Fig. 5(b),(c) vary H (1-6 um) against n_m but do not define the role. |
| m12 | confirmed | xue2026 z0 target `comparable: false` with the p.7 statement; yang2022 ng_opt target note "author simulation (Lumerical mode solution, p.2)". |
| m13 | confirmed (adjusted) | Every cited constant was checked at its locator: mao2022 text.md p.3 (line 194) "nSi = 3.475, nSiO2 = 1.444" (APL Photonics 7, 126103); yang2022 text.md p.2 "SiO2 (eps ~3.9) cladding and the Si (eps ~11.9) substrate" (supports both the chen2026 Si eps 11.9 and the SiO2 eps 3.9 citations in liu2021/xue2026/chen2026, and paper_exact in yang2022); xue2026 p.4 "low relative permittivity (~11.9) of silicon" (paper_exact); kharel2021 text.md p.3 "low permittivity (eps_Qz ~4.5)" (liu2021 quartz eps); wang2024b img_p15_1.png Extended Data Table 1: LN eps 38/28 @ 100 kHz, n 2.21/2.14, r33 30.9, r51 32.6; LT eps 54/43, n 2.119/2.123, r33 30.5, r51 20 (all exact). Gold sigma 4.1e7 (all four) and quartz n 1.53 (liu2021) are class unknown, marked UNVERIFIED and listed under `missing`. No constant is cited to a locator that does not state it. |
| m14 | confirmed (one leftover, new issue 3) | Journal p.3 Fig. 3(a) inset (rendered): labels 45 um, 3 um, 50 um, 15 um. loaded_length provenance cites the inset plus arXiv Table S1 (references/liu2021/arxiv/text.md p.6) for the 5 um stem; the loaded_length inline comment is corrected. The period_um inline comment still reads "Lp, Table S1 (paper_exact)". |

## 2. liu2021: staged vs canonical, field by field

Device row liu2021-a (data/_staging/p6_01/devices.csv vs data/devices.csv; same column set): all values identical except the three fields below. electrode_metal is gold in both.

| field | staged | canonical | justification | verdict |
|---|---|---|---|---|
| bw_basis | derived | measured | bw3db_ghz evidence basis is derived in both files (67 gt is a preparer inference from 1.3 dB at the 67 GHz system limit, p.5); staged makes CSV agree with evidence | justified |
| cladding | "...; BCB 1 um under the CPW feed bends only" | "...; BCB 1 um under the feedline bends only, removed in the modulation region" | journal p.5: "The CPW electrodes with 90 deg bend are formed on a 1-um-thick BCB cladding layer"; "removed in the modulation region" is arXiv supplement p.5 only; Fig. 4(a) shows BCB under the feed | justified |
| notes | journal locators; ER "beyond 17 dB" plus Fig. 4(c) inset label 17 dB; 17.8 dB read for the 3 um gap; gold from Fig. 1(a),(b); supplement-only facts tagged as arXiv cache; journal notice quoted | arXiv/supplement locators; "Fig. 4(c) minimum about 0.03 (about 15 dB)" | journal Fig. 4(c) inset (rendered) labels "17dB", resolving the 15-vs-17 remark; Fig. 4(b) 3 um point about 17.8 dB (rendered); journal p.5 keeps "a 3 dB modulation bandwidth over 110 GHz is predicted (see Supplementary Material)" | justified |

Papers row liu2021: title, venue, doi, url, source_type (journal), access (unknown), license (publisher-copyright), process_name (now filled from p.4), audit_status (audited -> needs_audit), verified_on (2026-10-05), notes differ; authors, year 2021, published_on 2021-02-04, arxiv_id, redistribution, groups, universities, wafer_supplier NanoLN, countries, discovered_via local_corpus, cache_status, repro_grade, sim_config identical. All differences follow (n)/(gg) for a DOI-first identity of the cached VOR (Crossref title "Wideband thin-film lithium niobate modulator with low half-wave-voltage length product"; Crossref has no licence record; footer "(c) 2021 Chinese Optics Letters"). The stale canonical note ("Batch CSV published_on 2021-02-04 not entered ... indicates a March 2021 submission") is replaced; arxiv.json v1 is 2021-02-04 (datestamp 2021-03-08), so the new note is correct.

Evidence data/evidence/liu2021.yaml vs staged:

| item | staged | canonical | justification | verdict |
|---|---|---|---|---|
| source_files, verified_on | journal pages 2-5 + arxiv/text.md; 2026-10-05 | arXiv pages and images; 2026-10-01 | primary source changed | justified |
| locators (all entries) | journal pages (fab p.4, test p.5, Fig. 4 p.4, Fig. 3 p.3) | arXiv pages (p.3-4, Supp. p.5-8) | (i): p.N indexes the cached text.md, now the VOR | justified |
| basis length_mm, eo_film_thickness_nm, etch_depth_nm, electrode_gap_um, signal_width_um, electrode_thickness_um, buffer_oxide_um, substrate, cladding, crystal_cut, electrode_metal | design_target | measured | (bb): text-stated dimensions with no measurement claim; gold is a schematic label | justified |
| extinction_ratio_db locator/note | p.5 "beyond 17 dB"; Fig. 4(c) inset 17 dB; arXiv DC scan | p.4; Supp. p.7 | journal adds the inset label | justified |
| n_rf note, unit | "text says slightly above ng about 2.25"; unit '1' | "close to"; unit unitless | journal p.5 wording "slightly higher than the optical group index"; '1' is the repo-wide unit token (128 uses vs 2) | justified |
| vpi_convention locator/note | p.5 text; "not stated; Vpi read as the MZM transmission swing" | p.3 Fig. 3(a); p.2 Fig. 2(b); cross-check 2.4e-5/V -> about 1.6 V cm | cross-check dropped, not wrong; journal Fig. 2(b) is the same plot (peak about 2.4e-5) and could carry it | acceptable (information loss, optional restore) |
| drive locator | p.3 Fig. 3(a); p.4 Fig. 4(a) | p.3 Fig. 3(a) | journal pages | justified |
| context_values | predicted_bw3db (journal p.5 + arXiv Fig. S7), electrode S21, 6 dB EE BW (journal Fig. 5), ridge 1 um sim, sim loss, tr_rail_design, printed_dates, T-rail Table S1 (arXiv locator), 3.7 dB at 104 GHz (arXiv locator), licence basis | same facts with arXiv locators plus s11_db item | s11 "below -18 dB" moved to row notes (journal p.5); supplement facts keep arXiv locators | justified |
| derived slab | same formula | same | - | identical |

Sim sims/liu2021/config.yaml: LN constants now wang2024b ED Table 1 (38/28, 2.21/2.14, r33 30.9, r51 32.6) instead of the canonical unverified placeholders (43/28 etc.); SiO2/quartz/gold per m13; geometry locators journal pages. Consistent with the fold decision.

## 3. Unrecorded changes

- chen2026 papers notes and organizations notes describe the rename ("Academy suffix dropped per the 2026-10-05 own-name precedent"); covered by M2 but contrary to the coordinator decision.
- liu2021 papers notes credit "Prof. Xinlun Cai (Sun Yat-sen University) thanked for help with the high-frequency EO measurement"; not in the audit, harmless (acknowledgement, not an affiliation; no org row created).
- No other change outside the audit's description was found; CSV values equal evidence values for every evidence entry in all four files (scripted check, 0 mismatches, every populated numeric field has an evidence entry).

## 4. Coordinator rules across the batch

- (1) Licence tokens bare: publisher-copyright (liu2021, yang2022), Optica-OA-License-v2 (xue2026, chen2026); redistribution restricted_local_only for all four. Correct.
- (2) name_source/ror_id: only Nanjing University filled, from crossref.json publisher-asserted ROR. Correct.
- (3) standard_reference constants: every one has a citation to a repo source that states the value at the given page (m13 row). Placeholders are `unknown` and in `missing`. Correct.
- (4) Canonical discovered_via kept for liu2021 (local_corpus). Correct.

## 5. New issues

| # | severity | item | evidence | fix |
|---|---|---|---|---|
| 1 | metadata | chen2026 org name (M2) | Coordinator decision: keep the printed name. Printed p.1 and Crossref: "Suzhou Institute of Nano-Tech and Nano-Bionics, Chinese Academy of Sciences" | organizations.csv org_name -> "Suzhou Institute of Nano-Tech and Nano-Bionics, Chinese Academy of Sciences"; same string in chen2026 papers.companies (keep the field quoting); reword both notes (remove "Academy suffix dropped"); BATCH_REPORT chen2026 line "name as printed minus the Academy suffix" |
| 2 | minor | BATCH_REPORT.md stale lines | "ror_id/name_source empty for the 4 new orgs" (Nanjing University now filled, M3); "no supplements cached" (liu2021 arXiv supplement cached in references/liu2021/arxiv/); "older configs (liu2021, chen2022) use eps 43/28" (liu2021 config replaced, now 38/28); AUDIT_DISPOSITIONS "Left open (1) refresh_metadata.py printed-date override" (already implemented: printed_online() in scripts/refresh_metadata.py) | update the report lines |
| 3 | minor | sims/liu2021/config.yaml line 68 | inline comment "period_um: 50 # Lp, Table S1 (paper_exact)" cites the arXiv-only Table S1; provenance cites journal p.3 text, Fig. 3(a) inset (50 um) and Fig. 4 caption | comment -> "p.3 text; Fig. 3(a) inset (paper_exact)" |
| 4 | minor (outside batch scope) | data/candidates.csv line 231 still lists liu2021a as a candidate | folded into liu2021 by the coordinator | coordinator: mark it folded/duplicate there |

Observation outside this batch: data/papers.csv row xu2022 has the non-bare licence value "Optica-OA-License-v2 (Crossref VOR license record)" (rule 1).

## What was checked

All staged cells of papers.csv (4), devices.csv (5), organizations.csv (4), evidence (4), the four sim configs; canonical data/devices.csv, data/papers.csv and data/evidence/liu2021.yaml for liu2021; crossref.json for all four, arxiv.json and both source.json for liu2021. Figures rendered from source.pdf and opened: liu2021 p.2 (Fig. 1, Fig. 2), p.3 Fig. 3(a), p.4 (Fig. 4(a)-(e)); chen2026 Fig. 4(a) (500 dpi); xue2026 p.6 (Fig. 3), p.8 (Fig. 4, Fig. 5), p.10 Fig. 6(f); wang2024b img_p15_1.png. Not checked: yang2022 figures other than via the text labels (Fig. 5(a) label in text.md); xue2026 Fig. 1(a) symbol roles beyond the audit's reading. No network, no git writes, no engine runs.
