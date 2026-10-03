# Audit dispositions, batch p3_10 (2026-10-03)

Audit: `data/_staging/audits/p3_08-p3_10-q1-claude-ingest-2026-10-03.md`. Each finding was re-checked against the cached source (chelladurai2025 text and Fig. 4 caption; suceava2025 text p.6; ulrich2025 text pages and the Crossref record). anderson2025 had no findings.

Counts: applied 4 (F14, F16, F19, F21), applied-adjusted 4 (F15, F17, F18, F20), rejected 0 whole findings (one sub-item of F20 rejected), deferred 2 (F22, F23).

| ID | Severity | Disposition | Change or reason |
|---|---|---|---|
| F14 | metadata | applied | Text p.6 ("For r33, the data are fitted with ...") and Fig. 4 caption ("The r42 data are fit to a Debye model ...") confirmed to disagree. papers.csv notes and BATCH_REPORT now say the text (r33) is followed and the caption says r42. |
| F15 | metadata | applied-adjusted | papers.csv notes now state: Creative Commons Attribution License named in the PDF notice (no version), 4.0 and start 2025-10-11 from Crossref vor, license applies to the cached file, which is the Wiley-typeset version of record; identity with the arXiv v1 object not verifiable offline. Adjusted: `source_type`, `arxiv_id`, `url`, `access` left unchanged on purpose (coordinator decision), `references/suceava2025/source.json` not edited. Mismatch for the coordinator: source.json says `license_verified: false`, `redistribution: restricted_local_only`, `source_type: arxiv_preprint`, while papers.csv says CC-BY-4.0, `open_license_ok`; the file content is the journal article (Adv. Mater. 38(3), e07564, DOI 10.1002/adma.202507564). Coordinator to update source.json and decide whether the row should be `source_type = journal` with a DOI URL and `access = open_access` (as for chelladurai2025). |
| F16 | minor | applied | "internal inconsistency" replaced by "not reconciled in the main text"; p.6 gives a converged high-field slope about 200 pm/V (Fig. 3b), Table S3 gives per-cycle 5 K fits (132 +/- 4 in cycle 1). papers.csv notes and BATCH_REPORT updated. |
| F17 | metadata | applied-adjusted | Crossref (present in the cache) lists Ahmed Khalil at position 5; the arXiv v1 byline has 16 names. Kept the 17-name Crossref list (identity per BATCH_INSTRUCTIONS) and added the difference to papers.csv notes, as the audit's first option. |
| F18 | minor | applied-adjusted | Convention (c) is binding: no 3 dB crossing, so `bw3db_ghz` = measured-to value with `gt` plus `bw_measured_to_ghz`; both kept. Added tag `bw_indirect_method` and a row note that it is a bound at the measurement limit, not a measured 3 dB bandwidth. Proposal for a distinguishing convention in the new SPEC_PROPOSALS.md. |
| F19 | minor | applied | "constant modulation up to 1 MHz" is on p.7 (page marker check). Locators of `bw3db_ghz` and `bw_measured_to_ghz` now "p.6 Fig. 3(f) caption; p.7 text; ...". |
| F20 | minor | applied-adjusted | (a) yu2024 `access` set to `arxiv` (arXiv-sourced rows elsewhere in the batch use `arxiv`): applied. (a, tokens) `discovered_via` tokens `web_search`, `author_group_followup` are used in 40+ rows across p3_07, p3_09 to p3_19: deferred to the coordinator, not renamed. (b) Table 1 Hc 0.4 um and Ht 0.2 um: rejected; their meaning rests on a reading of the Fig. 2 schematic, so the conservative omission stays (etch depth and slab thickness remain empty, consistent with the note). |
| F21 | metadata (cross-batch) | applied | Rule adopted across p3_08 to p3_10 (acknowledged cleanroom used for the devices goes in `foundry_or_fab`). chelladurai2025 already lists the Binnig and Rohrer Nanotechnology Center; no change. |
| F22 | minor (cross-batch) | deferred | yu2024 (1 MHz) and ulrich2025 (20 Hz) quasi-static values stay in `vpi_dc_*`/`vpil_dc_*`; dc/rf cutoff is a coordinator rule (proposal in the p3_08 and p3_10 SPEC_PROPOSALS.md). |
| F23 | minor (cross-batch) | deferred | `published_on` stays empty for anderson2025 (stamp 2025-02-21), ulrich2025 and yu2024 per the p3_01/p3_05 precedent; coordinator decision. |

## For the coordinator
- Cross-batch organization duplicates (identical type, country, region, parent; notes differ; merge keeps the first): Stanford University and Stanford Nano Shared Facilities (p3_10 with p3_02, p3_13, p3_18); University of Illinois at Urbana-Champaign (p3_10 and p3_04); Cornell University (p3_10 and p1_02). Not renamed here.
- suceava2025 metadata mismatch: see F15.
- `discovered_via` tokens: see F20.
