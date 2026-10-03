# Schema / skill proposals from batch p3_10 (not applied)

## Addendum 2026-10-03 (audit corrections)
- Sub-MHz "bandwidth" from an indirect, time-averaged method (ulrich2025: flat to 1 MHz, no 3 dB crossing): entered under convention (c) as `bw3db_ghz` 0.001 with `gt` plus `bw_measured_to_ghz`, tagged `bw_indirect_method`. Propose a convention or column that distinguishes an indirect-method measurement limit from a direct 3 dB bandwidth bound so views do not draw it as a bandwidth.
- Quasi-static dc/rf Vpi cutoff (yu2024 1 MHz and ulrich2025 20 Hz in `vpi_dc_*`, chiang2025 25 MHz in `vpi_rf_*` in p3_08): no written rule; see the p3_08 addendum.
- `discovered_via` tokens `web_search` and `author_group_followup` are outside the documented list (see the p3_09 addendum).
- A cached file whose content is the publisher version of record under an arXiv label (suceava2025): the schema has no field for "retrieved via" versus "content version". Propose allowing `source_type`/`url`/`access` to follow the content version and keeping the retrieval origin in `source.json` only.
- `published_on` for arXiv-sourced rows (anderson2025 2025-02-21 from the PDF stamp): see the p3_08 addendum.
