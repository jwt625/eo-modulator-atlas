# p6 distillation brief (2026-10-05)

Follow `data/_staging/BATCH_INSTRUCTIONS.md` exactly (no network, no git, staging only), with these updates:

- Conventions: `data/schema/devices.schema.yaml` header (a)-(gg) is binding (the instructions' "a-e" is outdated).
  New since 2026-10-05: band per ITU-T/ISO 20473 derived from wavelength_nm (l); dc/rf Vpi split at 1 GHz with
  `vpi_dc_freq_ghz` (m); identity/dates/authors/licence (n) (url = https://doi.org/<doi>, arxiv_id unversioned,
  authors from crossref.json, licence of the cached copy); er_type resonance_dip (o); cleanroom/foundry in
  foundry_or_fab (p); (q)-(gg) Vpi definitions, drive_vpp, IL scope, bandwidth method/reference, sidewall, signs,
  optical power, ER, source defects, row granularity, figure reading, geometry basis, papers-only rule, class and
  integration definitions, flag tags. Required device columns now include `row_kind` and `eo_effect`;
  `il_onchip_scope` is required with il_onchip_db and `bw_method` with any bandwidth field; set `statistic`,
  `temperature_k`, `r_eff_pm_per_v`, `physical_device_id` when the paper states them. Copy headers from
  `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` (organizations now has ror_id and name_source;
  org names follow convention (e): reuse the exact names in data/organizations.csv).
- Sources: `references/<paper_id>/text.md` + `figures/` is the version of record. Supplementary material and
  corrections are in `references/<paper_id>/supplement/` and `references/<paper_id>/correction/` (same layout);
  cite them as `supplement p.N, Fig. S3` / `correction p.1`. A superseded arXiv cache, where present, is in
  `references/<paper_id>/arxiv/` (read-only, for the comparison only).
- `source_state` column of your batch CSV:
  - NEW: normal distillation.
  - FIRST SOURCE: the papers row exists as metadata only; write the complete papers row (cache_status
    full_extract) and all device rows.
  - REPLACE / RECHECK: the canonical rows in `data/devices.csv` / `data/evidence/<id>.yaml` were distilled from an
    older source. Re-distill the whole paper from the current sources into staging (reuse device_ids for the same
    devices), and in BATCH_REPORT.md list every field whose value, basis, qualifier or locator differs from the
    canonical row, with the source phrase that decides it. For lu2020 apply the Author Correction.
- Dry run with `uv run python scripts/merge_staging.py data/_staging/<batch> --replace-paper-ids <comma list of
  the batch's FIRST SOURCE / REPLACE / RECHECK ids>` until 0 conflicts and 0 validation errors.
- Sim configs only per the instructions (grade A/B dielectric traveling-wave devices).
