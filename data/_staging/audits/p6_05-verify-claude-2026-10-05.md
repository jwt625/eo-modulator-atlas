# p6_05 verification (Claude, fresh context, 2026-10-05)

Batch: `data/_staging/p6_05` (xu2022 FIRST SOURCE, lu2020 RECHECK) plus `sims/xu2022/config.yaml`.
Brief: `data/_staging/ingest_2026_10_05/VERIFY_PROMPT.md`. Inputs read: `audits/p6_05-claude-audit-2026-10-05.md`,
`p6_05/AUDIT_DISPOSITIONS.md`, `p6_05/BATCH_REPORT.md`, `ingest_2026_10_05/CORRECT_PROMPT.md`, all staged files,
`sims/xu2022/config.yaml`, canonical `data/papers.csv`, `data/devices.csv`, `references/xu2022/{text.md,crossref.json,source.pdf}`,
`references/lu2020/{text.md,supplement/text.md}`. Fig. 1(b) and Fig. 1(c) of xu2022 were re-rendered from `source.pdf`
(900 and 1200 dpi, scratch only) and measured in pixels.

Result: 10 of 10 findings confirmed, 0 not confirmed. Unrecorded changes: none found. New issues: 2 (1 metadata, 1 minor).

## Per finding

| id | disposition | verdict | evidence |
|---|---|---|---|
| F1 | applied | confirmed | `references/xu2022/text.md` p.2: "high modulation efficiency (simulated result of 2.4 Vcm)". Staged xu2022-a `vpil_dc_vcm` is empty; `evidence/xu2022.yaml` has no `vpil_dc_vcm` entry (28 entries, 0 derived); row notes state the 2.4 V cm is simulated, not entered, and 1 V x 2.35 cm = 2.35 V cm is left to the build step. Config target `vpi_l_dc_vcm` source is `{paper_id: xu2022, locator: "p.2", comparable: false, basis: simulated, note: ...}`, same form as the kharel2021 l.98 precedent; YAML parses. |
| F2 | applied | confirmed | Supplement p.6-7 Note 5: "~10 dB ... attributed to the scattering losses in the active phase shifter, ... Y-junctions (~1.4 dB in total), ... (~3 dB per facet). Thus, the on-chip optical loss is estimated to be approximately 2.6 dB". lu2020-a tags now end in `phase_only_loss`; `app/src/lib/logic.ts` l.209 uses this tag to exclude il_onchip_db / vpi_il_vdb / fom from whole-modulator comparisons, as intended. |
| F3 | adjusted | confirmed | `text.md` p.7 Methods (l.823-824): "Note that with dual-drive configuration, the energy consumption could be further reduced." Supplement p.3 Note 2: "a voltage producing a phase shift of pi is defined as the half-wave voltage of the modulator". Re-check of the authors' extraction: 1.55 um x (1 + 6) / (1.44e4 um V x 0.738) = 1.021e-3 um/V = 1021 pm/V, equal to the Table value, so no push-pull factor of 2 is applied. drive and vpi_convention stay `unspecified`; both statements are in the lu2020-a notes and the Eq. 5-6 remark is in the `r_eff_pm_per_v` evidence note. Keeping `unspecified` is the conservative option the audit offered. |
| F4 | adjusted | confirmed | Fig. 1(b) at 900 dpi: 50 um scale bar = 187 px (3.74 px/um); waveguide (purple line) centres at y = 225 and 614 px, so the pitch is 389 px = 104 um; light region between the inner row edges 273 to 568 px = 295 px = 79 um (the ws = 80 um arrow). The auditor's reading holds. The config geometry is unchanged (waveguides at 0 and -83 um), which matches the "adjusted" disposition. `electrodes.signal` provenance and `missing` now state the 104 vs 83 um conflict and that ws is the gap between the segment rows. The devices.csv notes give the same reading. The two readings are now consistent. |
| F5 | applied | confirmed | Text p.2: "The 0.9-um-thick CL-TWE was fabricated on a 0.7-um- thick SiO2 cladding." Fig. 1(c) at 1200 dpi: the upper 0.7 um arrow ends on the electrode-bottom line and the lower arrow ends on the lowest white line (below the slab line), so the arrows span from the electrode bottom to the quartz top. `buffer_oxide_um` stays 0.7. The alternative reading (about 0.52 um over the slab = 0.7 - 0.18) is recorded in the evidence note, the devices.csv notes, the config provenance (`sio2_cladding`, `electrodes.signal`) and `missing`. |
| F6 | applied | confirmed | p.2: "The root-mean-square voltage was 161 mV"; conclusion: "(1.04 fJ/bit)"; Fig. 3(a)/text: 15.38 bit/symbol, 130 GBd. Recomputed 4 x 0.161^2 / 50 = 2.074 mW; 130e9 x 15.38 = 1.999e12 b/s; 2.074e-3 / 1.999e12 = 1.04 fJ/bit. The evidence note labels this as a check that the authors do not state. The basis stays `author_estimate`. |
| F7 | applied | confirmed | p.2: "We have fabricated more than five DP-IQ modulators on the same chip." The xu2022-a notes now read "More than five DP-IQ modulators on the same chip". |
| F8 | applied | confirmed | Supplement p.7 Note 5: "propagation loss of 0.22 dB mm-1 by considering the total length of the device of 12 mm". The derived `prop_loss_db_per_cm` inputs now cite "supplement p.6-7 Note 5" and state that this is the authors' 2.6 dB / 12 mm estimate, not a cut-back measurement. The main-text locators are also correct: "0.22 dB mm-1" is on p.3 (l.287) and in Table 1 on p.7. No qualifier was added; that is acceptable for a derived value. |
| F9 | applied | confirmed | p.3 (l.318): "at a sampling rate of 92 GSa s-1"; p.8 Methods (l.1015): "M8196A ... at a 92 GSa s-1 sampling rate"; p.5 Fig. 3a label (l.537): "96 or 120 GSa s-1". The lu2020-a notes record this inconsistency, and `driver` keeps 92 GSa/s. |
| F10 | applied (record) | confirmed | The BATCH_REPORT lu2020 section ("Added after audit") lists the rewritten device notes (arm spacing, single G-S-G feed, loss breakdown, r33 extraction), r33 dropped from "Not entered", confinement factor added, and the reworded evidence notes for bw3db_reference, z0_ohm and rib_width_nm. |

## Unrecorded changes

- lu2020: a field-by-field diff of staged vs canonical `lu2020-a` (all fields except notes) shows only these changes: tags (+phase_only_loss), r_eff_pm_per_v, bw3db_reference, il_onchip_db/scope/includes/excludes, il_fiber_to_fiber_db, il_basis and qualifiers. All of them are listed in BATCH_REPORT or the dispositions. On the papers row, only audit_status, verified_on and notes differ; these are listed too. Evidence has 27 entries plus 1 derived, as the report states.
- xu2022: the canonical row was metadata-only, so the staged values were compared with the audit's "values verified" list. Every staged value matches that list, and no value outside the findings changed. `papers.csv` and `organizations.csv` are dated 19:56, before the correction pass (20:14), so neither was touched during correction. No paper-level finding required a change to them.
- Nothing unexplained found.

## Coordinator rules

- Rule 1 (bare licence token): lu2020 `CC-BY-4.0` / `open_license_ok` passes. **xu2022 fails:** `license` = `Optica-OA-License-v2 (Crossref VOR license record)` (staged papers.csv, and the canonical row carries the same string). Redistribution `restricted_local_only` is correct.
- Rule 2 (name_source / ror_id): staged `organizations.csv` is header-only, so no new orgs. Passes.
- Rule 3 (standard_reference): every material constant in `sims/xu2022/config.yaml` is `unknown` and listed in `missing`, except `materials.air: {class: standard_reference, citation: "vacuum-like ambient n = 1, eps_r = 1"}`. That citation names no repo file or page (see N2).
- Rule 4 (discovered_via): canonical values are kept. lu2020 has `web_search;author_group_followup`; xu2022 has `landmark`.

## New issues

| id | severity | item | evidence | suggested fix |
|---|---|---|---|---|
| N1 | metadata | xu2022 papers.license | `Optica-OA-License-v2 (Crossref VOR license record)`; crossref.json license URL `https://doi.org/10.1364/OA_License_v2#VOR-OA`. Coordinator rule 1 requires a bare token, with the qualifier in notes. The papers notes already say "Crossref VOR licence is the Optica Open Access Publishing Agreement (Optica-OA-License-v2)". | Set `license` to `Optica-OA-License-v2` in `data/_staging/p6_05/papers.csv`. No notes change is needed. For context, staged p6_01 (xue2026, chen2026) and p6_02 (murai2025, pan2021, xue2023, li2022b) show the same parenthetical form. |
| N2 | minor | sims/xu2022 `materials.air` provenance | `class: standard_reference` with the citation "vacuum-like ambient n = 1, eps_r = 1", which gives no repo file or page. Rule 3 strictly requires one. The same line appears in 12 other configs, including p6 chen2023 and mao2022, so this is a project-wide pattern rather than a p6_05 regression. | Coordinator decision: either accept air n = 1, eps_r = 1 as a definitional exception to rule 3, or relabel it `unknown` (placeholder) and list it under `missing`, applied uniformly across configs. |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p6_05 --replace-paper-ids xu2022,lu2020`
-> `merge counts: {'papers': 2, 'devices': 2, 'orgs': 0, 'evidence': 2}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
