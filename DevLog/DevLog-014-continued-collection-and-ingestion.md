---
title: Continued literature collection and parallel ingestion (batches p3_01..p3_19)
date: 2026-10-03
status: ready_for_review
owner: claude-ingest-2026-10-02
tasks: [C1, D1.15-D1.33, D1.13-addendum]
---

# DevLog-014: continued collection and ingestion

User request (2026-10-02): continue the new-references collection from
[DevLog-013](DevLog-013-literature-cache-expansion.md) and start ingesting in
parallel with subagents. Scope: source discovery and caching, staged
distillation, independent audits and author corrections. Until 2026-10-03 no
canonical table was changed; the later user-directed integration is recorded in
the section below. Claim: `coordination/claims/claude-ingest-2026-10-02.md`.

## TODO

- [x] Review latest commit and DevLog-013 state; inbox checked (empty)
- [x] arXiv title lookup for the 34 open requests (2 matches cached)
- [x] Three read-only search agents (LN/LT, silicon/Ge/CPO, BTO/polymer/III-V/2D)
- [x] Dedupe and cache open arXiv preprints (72 PDFs), identity check
- [x] Merge 235 new candidates into `data/candidates.csv`
- [x] 19 staged distillation batches plus han2023 addendum
- [x] 7 independent fresh-context audits, 0 unresolved blocking findings
- [x] Author corrections for every finding; dispositions per batch
- [ ] User: retrieve raw materials (see Open items)
- [x] Canonical merge of all staged batches with `audit_status` (user request 2026-10-03)
- [ ] Coordinator decisions listed below
- [ ] Second audit round on corrected batches (sampled) before any D2 merge

## Progress log (timestamps are session-local, 2026-10-02 to 2026-10-03)

- 2026-10-02: arXiv title lookup matched `han2023` (2302.03652v1) and
  `li2022b` (2202.13323v1); both cached with first-page identity check.
- 2026-10-02: search agents returned 68 (LN/LT), 94 (silicon) and 76 (other)
  records; after dedupe 235 new records (`candidates_continuation.csv`), 2
  cross-slice duplicates dropped. The silicon agent used the OpenAlex metadata
  API for abstracts/OA status (outside the stated source list; metadata only,
  logged in `search_log.json`).
- 2026-10-02: 72 arXiv PDFs cached through the serialized downloader
  (`queue_07.json` 47, `queue_08.json` 25), latest arXiv version each, source
  versions recorded; 72/72 passed a first-page title and first-author check.
- 2026-10-02..03: distillation p3_01..p3_19 (max 3 concurrent), then audits,
  then corrections. Final joint dry run of all p3 batches plus `p2_02`:
  90 papers, 194 device rows, 153 organization rows, 82 evidence files,
  0 conflicts, 0 validation errors. Canonical validator 0 errors, 28 Python
  tests pass.

## Canonical integration and audit status (2026-10-03, user request)

The dashboard showed 15 papers because staged batches had not been merged. On the
user's instruction every staged batch (p1_02, p1_04, p2_01, p2_02, p3_01..p3_19) was
merged into `data/*.csv` and `data/evidence/` with `scripts/merge_staging.py --apply`
(validator 0 errors, 0 conflicts), and the paper table gained a required
`audit_status` column (schema enum, shown in the app):

| Value | Meaning | Papers |
|---|---|---|
| `audited` | independent audit report plus corrections accepted before integration (p1_01, p1_03, p1_09, ummethala2021) | 13 |
| `needs_recheck` | independently audited once and corrected, corrections not re-audited (pilots, p2_01, han2023, all p3 batches) | 94 |
| `needs_audit` | no independent audit yet (p1_02, p1_04) | 10 |

Result: 117 papers (15 + 102), 277 device rows (28 + 249), 185 organizations in the
view, 20 sim configs. Papers with no device rows (material-only, no modulator
metrics, review) count in the paper total but do not appear in the table or plots.
App: Audit column (default on), audit filter and URL parameter `au`, audit line in
the paper drawer, audit counts on the dashboard, About explanation. Checks: 28
Python tests, 26 app tests, svelte-check 0 errors, browser smoke pass at the root
path. A pre-merge copy of `data/` is kept outside the repo. Rows of unaudited or
unrecheck papers, preprint-sourced numbers and simulated/projection rows are now
visible in the comparison plots; use the audit filter and Measured only to
restrict them.

## Collection

| Item | Count |
|---|---|
| Manifest records | 313 (78 before) |
| Cached PDFs from this pass | 118 (44 + 2 + 72) |
| New candidates merged into `data/candidates.csv` | 235 (199 -> 462 lines, existing rows unchanged) |
| Open raw-material requests | 195 (32 older + 163 new) |

Every new cache is an arXiv preprint (exact `source_version` in
`references/<id>/source.json`); journal versions of record are not cached and
no journal license is inferred. Files: `queue_06..08.json`,
`candidates_continuation.csv`, `manifest.csv`, `search_log.json` (batches 4-7),
`retrieval_requests_continuation.csv` and
`RETRIEVAL_REQUESTS_CONTINUATION.md` (ranked, top 40) in
`data/_staging/discovery_2026_10_02/`.

## Ingestion (staging only)

| Batch | Papers | Rows | Notes |
|---|---|---|---|
| p3_01 | xu2020 wang2022a zhang2022 qi2024 li2022b | 10 | TFLN MZM/IQ; 4 sim configs |
| p3_02 | churaev2023 vanackere2023 liu2023 wu2025 celik2022 | 10 | hybrid LN; 2 sim configs (not runnable) |
| p3_03 | zhang2023 li2020 shen2024 liu2025c lin2026a | 11 | resonators, SFQ link, TFLT; 1 sim config |
| p3_04 | sayem2026a sayem2026b lin2025a kim2025 mao2024 | 11 | TFLT, BTO, PLZT |
| p3_05 | li2025b montifiore2026 steckler2025 | 12 | AlGaAs, PZT, GeSi EAM |
| p3_06 | hu2026 geravand2025 zhong2026 gupta2023 | 10 | silicon ring, InP |
| p3_07 | lu2020 schwarzenberger2026 zwickel2020 | 6 | SOH |
| p3_08 | chiang2025 taghavi2026 akazawa2026 | 3 | FN-LC, InGaAsP/Si MOS |
| p3_09 | falcone2026 berman2026 nenezic2026 | 8 | BTO, workflow (simulated) |
| p3_10 | anderson2025 chelladurai2025 suceava2025 ulrich2025 yu2024 | 5 | 3 material-only, no device rows |
| p3_11 | powell2024a nelan2022 nelan2022a feng2022 gao2024 | 6 | 2 sim configs (not runnable) |
| p3_12 | chen2023a hu2026a niels2025a tan2024 wang2026b | 16 | micro-transfer-printed LN, arrays |
| p3_13 | larocque2024 kari2025 holzgrafe2020 thiele2022 hou2024 multani2025 | 14 | 2 transduction papers no rows |
| p3_14 | sabatti2024 chen2024 shamsansari2021 guo2026 sayem2026 | 5 | 2 no device rows |
| p3_15 | hsu2024 hu2023 shen2021 huang2026a yue2023 kawahara2025 sia2022 | 13 | silicon; huang2026a no rows |
| p3_16 | wu2023 luan2026 luan2026a lee2020 lee2020a | 13 | graphene |
| p3_17 | giambra2021 tiberi2025 heidari2022 navarro2026 gui2022 lotkov2024 | 17 | graphene, ITO; gui2022 and navarro2026 simulated |
| p3_18 | taghavi2022a johnson2025 taghavi2024 witmer2020 | 14 | SOH, FN-LC |
| p3_19 | soma2025 fukui2025 sun2026a prountzou2026 | 8 | free-space metasurfaces |

Plus `han2023` added to `data/_staging/p2_02/` (arXiv v1 numbers only; version
of record and Supplementary Materials remain a request). Total 88 new papers,
192 new device rows in p3 batches. 25 of the 72 new preprints were deliberately
not queued for distillation (off-scope or tangential: transduction/quantum,
fabrication-only, review, simulation-only design studies, wireless/mixer
demonstrations); they remain cached and in the candidate table.

## Independent audits and corrections

Seven fresh-context audits (`data/_staging/audits/p3_*-q1-claude-ingest-2026-10-03.md`)
verified every device row against the cached text and figure renders. Totals
(180 findings): 2 blocking, 38 numerical, 56 metadata, 84 minor; no paper
rejected. The two blocking findings: a 1000x capacitance unit error
(`akazawa2026-a`, 6480000 fF for 6.48 pF; fixed by the coordinator and
confirmed) and an abstract-derived VpiL bound contradicted by the paper's own
Fig. 11 arithmetic (`taghavi2022a-a`; cell cleared, contradiction kept in the
row notes). Separate correction authors re-verified each
finding against the source before acting; per-batch `AUDIT_DISPOSITIONS.md`
records applied / adjusted / rejected / deferred with reasons. In several cases
the audit value was not reproduced and the paper's own value was kept with the
conflict recorded (for example `zhang2022` Z0, `hu2026` wafer-map range,
`tiberi2025` bandwidth crossing). The independence note: `celik2022` lists the
repository owner as a co-author. Corrections are not independently re-audited
(second round pending, see TODO).

Unresolved source conflicts left visible in row notes: `kari2025-a` 29 GHz
bandwidth (Methods imply 7.5/12 GHz instruments), `thiele2022` wavelength table
vs figures (cells left empty), `taghavi2022a-a` VpiL abstract bound vs body
arithmetic (about 4x; cell cleared), `han2023` BER at 112 Gb/s above the FEC
line in Fig. 4(h) against the text.

## Decisions

Resolved by the user on 2026-10-03:

- Placeholder material constants in sim configs stay allowed, flagged `unknown`; a separate effort will establish verified physical properties (closes the p3_01 F21 and p3_03 F17 deferrals).
- Organization spelling duplicates deduplicated across staging (CSV columns only): `Fraunhofer Heinrich Hertz Institute` (p1_02 renamed), `Zhangjiang Laboratory` (p2_02 renamed), `The University of Texas at Austin` (p3_17 renamed). Joint dry run of all staged batches still 0 conflicts / 0 validation errors.

Still open (coordinator / user):

1. Rules to state before D2: `published_on` and `year` for preprint-sourced
   rows; dc/rf Vpi cutoff for quasi-static measurements; acknowledged-cleanroom
   rule (applied in p3_09/p3_14: a cleanroom the paper names as used goes in
   `foundry_or_fab`); `discovered_via` vocabulary (`web_search`,
   `author_group_followup`, `continuation_2026_10_02` are outside it);
   `verified_on` 2026-10-02 vs the 2026-10-01 in BATCH_INSTRUCTIONS.
2. Schema gaps collected in each batch `SPEC_PROPOSALS.md`; the recurring ones:
   `eo_effect` (Pockels, stress-optic, Franz-Keldysh, carrier), r_eff / r42,
   SFDR/linearity, EAM dB/V metrics, per-pi metrics, free-space/metasurface
   class, resonator `device_class` values, measurement temperature in K,
   `sidewall_angle_deg` reference direction, row kind for projections.
3. `suceava2025`: cached file is the Wiley-typeset article under an arXiv URL;
   `source.json` now records the verified CC-BY and a `content_note`, while
   `source_type` was left `arxiv_preprint` pending your call.
4. `giambra2021`: `source_type` journal with an arXiv v2 URL; decide whether the
   URL should point to the DOI.
5. `zhang2023` row mixes sibling devices on one chip; split is optional.
6. Remaining organization notes: Technical University Berlin is used
   consistently but the paper prints Technische Universitat Berlin; Nokia Bell Labs has no link to Nokia Corporation and carries an
   off-paper "Murray Hill" note; several expansions or countries entered from
   outside the papers (CompoundTek, SMIC, CNIT, INPHOTEC, GT IEN).

## Open items for the user (raw materials)

- Ranked continuation list:
  [RETRIEVAL_REQUESTS_CONTINUATION.md](../data/_staging/discovery_2026_10_02/RETRIEVAL_REQUESTS_CONTINUATION.md)
  (163 papers) and the older 32 in
  [RETRIEVAL_REQUESTS.md](../data/_staging/discovery_2026_10_02/RETRIEVAL_REQUESTS.md).
  Highest value: versions of record plus Supplementary Materials for papers
  whose staged numbers come from preprints (`han2023`, `xu2020`, `lu2020`
  correction notice 10.1038/s41467-020-18908-5, `hu2026`, `geravand2025`).
- Unexplored search branches: Lumentum, Infinera, HyperLight, Nokia, NTT,
  Huawei conference papers; Ayar Labs, Nvidia, Broadcom, Cisco, Lightmatter,
  Lipson/Bergman; foundry PDK papers (TSMC, Tower, ST, CEA-Leti, IHP, AIM);
  KTN and other Pockels oxides; Jen/Sun polymer groups; systematic citation
  chasing from Wang 2018, Xu 2020, Kharel 2021, He 2019, Weigel 2018.

## Rights and provenance

Source-specific rights are unchanged: PDFs, text and figures stay as recorded in
each `source.json`; arXiv-sourced rows have empty `license` and
`restricted_local_only` unless a verified license on the cached version exists
(`lu2020`, `suceava2025`, `giambra2021`, `chelladurai2025`). Search-agent
abstract-level numbers in `candidates.csv` notes are labelled unverified and are
not paper data.
