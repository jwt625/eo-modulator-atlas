# p8 distillation brief (2026-10-07)

Follow `data/_staging/BATCH_INSTRUCTIONS.md` exactly (no network, no git, staging only), with these updates:

- Conventions: `data/schema/devices.schema.yaml` header (a)-(gg) is binding (the instructions' "a-e" is outdated):
  band per ITU-T/ISO 20473 from wavelength_nm (l); dc/rf Vpi split at 1 GHz with `vpi_dc_freq_ghz` (m); identity,
  dates, authors, licence (n); er_type (o); foundry_or_fab (p); (q)-(gg) Vpi definitions, drive_vpp, IL scope,
  bandwidth method/reference, sidewall, signs, optical power, ER, source defects, row granularity, figure reading,
  geometry basis, papers-only rule, class and integration definitions, flag tags. Required device columns include
  `row_kind` and `eo_effect`; `il_onchip_scope` is required with il_onchip_db and `bw_method` with any bandwidth
  field; set `statistic`, `temperature_k`, `r_eff_pm_per_v`, `physical_device_id` when the paper states them. Copy
  headers from `data/papers.csv`, `data/devices.csv`, `data/organizations.csv`.
- Sources: every paper in this wave is a cached arXiv copy (`references/<id>/text.md`, `figures/`, `source.json`
  records the version). Some have a version-of-record DOI (`crossref.json` present): then identity follows (n)
  (url = https://doi.org/<doi>, source_type/venue/title of the DOI version, authors from crossref.json) while every
  value and locator comes from the cached arXiv version; say so in the papers notes. Without crossref.json:
  url = https://arxiv.org/abs/<id> (unversioned), source_type arxiv_preprint, authors as printed. published_on: the
  arXiv v1 date if printed in the cached text (the arXiv stamp), else empty. `license` / `redistribution`: leave
  empty if neither source.json nor the paper states the licence (the coordinator fills them from the arXiv OAI
  record at merge with `scripts/refresh_metadata.py`); never guess.
- Scope: several papers in this wave may not be EO modulator device papers (materials, transduction, reviews,
  modeling, quantum optics). Apply the papers-only rule (convention ee / BATCH_INSTRUCTIONS step 3): write the papers
  row with notes and no device rows when there is no EO modulation device with quantitative metrics. A device used
  as an EO modulator inside a larger experiment (transducer, mixer, receiver, quantum-light control) gets rows only
  for the modulator metrics the paper reports for it. Simulation/design-only papers: row_kind design with basis
  simulated, per the conventions.
- Coordinator rules (from the 2026-10-05 waves, apply from the start): (1) `license` holds a bare token; NC/ND and
  arXiv-nonexclusive -> restricted_local_only, CC-BY/CC-BY-SA/CC0 -> open_license_ok. (2) `name_source` and `ror_id`
  of new organizations stay empty unless printed in the paper or present in crossref.json; org names as printed in
  the paper unless the org already exists in `data/organizations.csv` (then reuse that exact name). (3) Sim configs:
  a constant may be labelled `standard_reference` only with a citation to a source in this repo that you actually
  read (file and page); otherwise `unknown` placeholder listed under `missing`; air (eps_r = n = 1) is definitional.
  (4) `discovered_via` from the batch CSV.
- Dry run with `uv run python scripts/merge_staging.py data/_staging/<batch>` until 0 conflicts and 0 validation
  errors.
- Sim configs only per the instructions (grade A/B dielectric traveling-wave devices).
