# p6_01 audit dispositions (2026-10-05)

Audit: data/_staging/audits/p6_01-claude-audit-2026-10-05.md. Counts: 20 applied, 2 adjusted, 0 rejected (22 findings). Coordinator decisions applied as given.

| id | disposition | what changed | evidence |
|---|---|---|---|
| B1 | applied | liu2021a folded into liu2021: paper_id/device ids renamed (liu2021-a), evidence/liu2021.yaml (liu2021a.yaml removed), papers row = journal identity (DOI, Crossref title/venue) + arxiv_id 2103.03684 + discovered_via local_corpus (canonical) + published_on 2021-02-04; sims/liu2021/config.yaml replaced by the liu2021a config (ids renamed), sims/liu2021a/ deleted; arXiv-supplement facts kept as context with arXiv locators | references/liu2021/text.md p.1-5, crossref.json, arxiv.json, arxiv/text.md p.6-7 |
| N1 | applied | chen2026-a bw3db_ghz cleared, qualifier and evidence entry removed; bw_measured_to 67, bw_method, bw3db_reference, bw_basis kept; notes give the authors' "exceeds 67 GHz" and the figure readings (below -3 dB near 57, 64, 66-67 GHz); claimed value in context_values | p.6 text; Fig. 4(a) re-rendered at 300 dpi |
| N2 | applied | xue2026 sim: all electrodes start at the slab top (y 0.1), main electrodes 0.1-1.2, rails 0.1-0.7, both cross-sections; 100 nm cladding stays as slab/ridge layer and is overridden by the metal (engine classifies electrodes over regions); provenance updated; cladding over rail tops/sidewalls listed as not modelled | p.3 process order; Fig. 1(b) shows Au on the LN slab |
| M1 | applied | printed Received/Accepted/Posted Online quote added to yang2022 and liu2021 evidence context_values and papers notes (liu2021 published_on is the earlier arXiv v1 date); override in refresh_metadata.py left to the coordinator | yang2022 text.md p.1; liu2021 text.md p.1 |
| M2 | applied | org renamed "Suzhou Institute of Nano-Tech and Nano-Bionics" (organizations.csv and chen2026 papers.companies); printed form in notes | chen2026 p.1 affiliation 3; precedent in data/organizations.csv |
| M3 | applied | Nanjing University ror_id and name_source = https://ror.org/01rxvg760 (coordinator: name_source is that ROR URL); other three orgs left empty, notes say no ROR in Crossref | references/chen2026/crossref.json (publisher-asserted ROR on affiliation-2 authors) |
| M4 | applied | yang2022 access unknown; notes reworded | audit; bare-token rule |
| M5 | applied | xue2026 and chen2026 license Optica-OA-License-v2; Crossref license URL moved to notes | crossref.json license entries |
| m1 | applied | liu2021-a electrode_metal gold, basis design_target, locator p.2 Fig. 1(a),(b) labels; config provenance and missing list corrected | liu2021 page_02.png: labels "gold" |
| m2 | applied | slab_thickness_nm moved to `derived` with formula and inputs for liu2021-a, yang2022-a, xue2026-a/b, chen2026-a | skill rule 11 |
| m3 | applied | yang2022-a vpi_dc_v locator/note cite the text typo and the Fig. 5(a) label "Vpi=4.74V"; row notes updated | yang2022 page 4 image |
| m4 | adjusted | no vpil_dc_vcm:approx: 2.37 is derived exactly (4.74 x 0.5); the abstract's "~" is noted in the row notes | yang2022 p.1, p.4 |
| m5 | applied | tension remark dropped from BATCH_REPORT; row note says 3.2e-3 lies below both threshold lines of Fig. 6(b) | yang2022 Fig. 6(b) |
| m6 | applied | chen2026-a vpil_dc_vcm:approx removed (qualifiers now empty) | abstract, Table 1: 2.4 |
| m7 | applied | chen2026-a ng_opt 2.2, basis author_estimate (origin not stated); liu2021-a keeps ng_opt 2.25 because the paper prints it (Fig. 4 caption, p.4), same rule in both | chen2026 p.5; liu2021 p.4 caption |
| m8 | applied | chen2026 papers notes record the 1.0 GHz/V normalization, TFLT 0.38-0.46 and TFLN 0.37-0.69 ranges, 2.4 um gap, 8 V; no rows; also in evidence context_values | chen2026 p.8 Fig. 5 (rendered) |
| m9 | applied | xue2026-b notes: EE S21 at 67 GHz about -4.4 dB vs text -6.4 dB (marker line); BER wording refined (80G PAM-4 above 2.4e-4 at -18..-15 dBm, about 2.4e-4 near -14 dBm; 64G OOK above it at -23..-21 dBm) | xue2026 p.6 text, p.8 Fig. 4(a), p.10 Fig. 6(f) |
| m10 | applied | reference ambiguity of the 1.3 dB roll-off added to xue2026-b notes and the eo_rolloff_db evidence note; bw3db_reference stays low_freq_unstated | xue2026 p.7 text |
| m11 | applied | alternative H/S reading recorded in provenance, missing and limitations; n_rf and VpiL targets annotated LOW CONFIDENCE | xue2026 Fig. 1(a) (audit 1200 dpi reading; schematic low resolution) |
| m12 | applied | xue2026 z0 target comparable: false with the authors' statement; yang2022 ng_opt target note "author simulation" | xue2026 p.7; yang2022 p.2 |
| m13 | adjusted | per coordinator rule 3: SiO2 n 1.444 and Si n 3.475 cited to references/mao2022/text.md p.3 (n 3.476 -> 3.475, outside the optical window); SiO2 eps 3.9 paper_exact for yang2022 (p.2), cited to yang2022 p.2 for the others; quartz eps 4.5 stays cited to kharel2021 p.3; chen2026 Si eps 11.7 -> 11.9 cited to yang2022 p.2; gold sigma 4.1e7 and quartz n 1.53 marked unknown (UNVERIFIED placeholders) and listed under missing. Project-level reference for Au/SiO2 constants left open | mao2022 line 194; yang2022 p.2; kharel2021 p.3 |
| m14 | applied | liu2021 loaded_length provenance cites the Fig. 3(a) inset labels (45, 3, 50, 15 um) and, for the 5 um stem, arXiv supplement Table S1 / SEM; Table S1 removed from the inline comment | liu2021 page_03.png; arxiv/text.md p.6 |

Left open: (1) refresh_metadata.py printed-date override (coordinator); (2) project-level source for gold conductivity and the RF permittivity of LN/LT at mm-wave; (3) the 4 mm xue2026-a device has no sim variant.
