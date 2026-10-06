# p6_02 verification (Claude, fresh context, 2026-10-05)

Batch: murai2025, pan2021, xue2023 (NEW); li2022b (REPLACE). Brief: `data/_staging/ingest_2026_10_05/VERIFY_PROMPT.md`.
Inputs: audit `p6_02-claude-audit-2026-10-05.md`, `data/_staging/p6_02/AUDIT_DISPOSITIONS.md`, `CORRECT_PROMPT.md`, staged
CSV/evidence, `sims/{murai2025,pan2021,xue2023,li2022b}/config.yaml`, sources (`references/<id>/text.md`, figures).
Pre-correction state: the corrector's snapshot `orig_p6_02/` (scratch) and its edit scripts; li2022b canonical state from HEAD.
Read-only; no network, no git; this file is the only file written. Scratch crops in a local scratch directory (not tracked).

Result: 25 findings; confirmed 24, not confirmed 1 (F12). New issues: 4 minor. Dry run: 0 conflicts, 0 validation errors.

## Per finding

| id | disposition | verdict | evidence |
|---|---|---|---|
| F01 | applied | confirmed | `sims/li2022b/config.yaml` provenance: LN eps_r, LN r_pm_per_v, SiO2 eps_r, Si eps_r, gold sigma_Sm all `class: unknown` with "UNVERIFIED placeholder" notes; no `citation` key left in any of the four configs (grep 0). `missing` says all are UNVERIFIED placeholders. Restores the HEAD (compliant) pattern. Source check: no permittivity, conductivity or Pockels value in `references/li2022b/text.md` or `arxiv/text.md` (grep). See N1 for the note wording. |
| F02 | applied | confirmed | murai2025 config lines 126-130: same 5 constants `unknown`; text.md mentions permittivity only for "high-permittivity cladding" (outlook, p.8), no value. |
| F03 | applied | confirmed | pan2021 config lines 122-126: 5 constants `unknown`; text.md has no constant. See N1 (633 nm wording). |
| F04 | applied | confirmed | xue2023 config lines 104-107: 4 constants `unknown` (no Si region); text.md lines 155-156 name r33 in the formula only, line 266 "r33 increases with decreased lambda [14]", no value. Air `{n: 1, eps_r: 1}` has no provenance entry in any config (definitional; acceptable). 19 entries total, as stated. |
| F05 | applied | confirmed | staged li2022b `discovered_via = web_search;assigned` = canonical `data/papers.csv`; snapshot had `web_search;author_group_followup`. BATCH_REPORT REPLACE list now says it was kept. |
| F06 | applied | confirmed | murai2025 `drive_doc;tmp_eo_md` = batch CSV `data/_staging/batches/p6_02.csv` row 2 (snapshot `local_corpus`). |
| F07 | applied | confirmed | murai2025 `geometry.electrodes.ground_r: {class: unknown, note: 'UNVERIFIED placeholder ... 60 um ... not from this paper'}`; `missing` lists "ground electrode width". |
| F08 | adjusted | confirmed | Coordinator rule (2) governs: `ror_id`/`name_source` empty. murai2025 crossref.json carries one ROR (`01703db54`) on the AIST authors only (Murai, Kou, Cong, Yamada), already canonical for AIST (organizations.csv line 130); the Furukawa authors (Imai, Takabayashi) have name-only affiliations. xue2023 crossref.json has no ROR. Notes reworded as stated. See N3 (comma). |
| F09 | applied | confirmed | li2022b text.md: p.7 line 262 "Talent Microwave TLLA50K20G-30-30, 20 GHz"; arXiv line 227 "SHF S807"; p.6 line 232 "1-h annealing process at 500 C in a nitrogen environment"; p.6 line 207 CLTW "can well exceed 120 GHz"; p.6 line 250 "a certain deviation from the simulation value (2.73 V)"; arXiv line 224 "agrees well". All four in li2022b-a notes; (e) listed in the BATCH_REPORT "Corrections applied" section. |
| F10 | applied | confirmed | Opened `references/li2022b/figures/img_p07_2.png`: Fig. 6(d) curve peak about -21 dB, minimum about -44.5 dB, "23 dB" arrow; note added, no value change. |
| F11 | applied | confirmed | li2022b `geometry.electrodes.signal` now `project_inference`, note names the contested gap (5.5 um Fig. 4 caption p.5, line 196; 5.9 um text p.4, line 150). See N2 for ground_r. |
| F12 | adjusted | NOT confirmed | Opened Fig. 5 (`references/murai2025/figures/img_p07_2.png`, page_07.png). Fig. 5(a) right (Voltage) axis: labelled ticks 0, -1, -2, -3 at rows 101.5 / 166.5 / - / 297.5 px (65.3 px/V); the plot frame top is at row 44 and the red triangle apexes touch it (red pixel extent rows 44-301), i.e. the applied voltage runs from about -3.05 V to about +0.9 V. The axis therefore does not run "0 to -3 V"; only its tick labels do. Fig. 5(b): x axis from -3 V (left frame) to about +0.8 V (right frame, 188 px/V), Vpi markers at about -2.46 and +0.21 V. The audit's reading (both panels about -3 to +0.8/+0.9 V) is right; the corrector's claim that the original wording "was correct for 5(a)" is wrong. Current murai2025-a note: "the Fig. 5(a) voltage axis runs 0 to -3 V" is factually wrong. Fix: "text gives +-2 V with a -3 V offset (i.e. -5 to -1 V), while the Fig. 5(a) triangle spans about -3 to +0.9 V (tick labels 0 to -3, apexes at the frame top) and the Fig. 5(b) axis about -3 to +0.8 V with Vpi markers at about -2.45 and +0.2 V". bias_for_vpi_v empty remains correct (the contradiction holds either way). Severity minor (note text; no cell value). |
| F13 | applied | confirmed | text.md line 222 "approximately 28 GHz" (p.6), line 266 "> 28 GHz" (p.8 discussion); note added, value 28 approx unchanged. |
| F14 | adjusted | confirmed | Audit marked it optional ("or leave and say so"); 0.7 dB/cm stays on -a (evidence p.5 Sec. 3.1, line 180), both rows' notes now say so. |
| F15 | applied | confirmed | murai2025-b note and evidence note: length-scaled from -a, derived VpiL not independent; Table 1 footnote a (line 370) "Vpi is estimated from the measurement result in Fig. 5(b)". |
| F16 | applied | confirmed | Evidence basis `derived` with author-arithmetic notes for murai2025-a (p.6 line 207), pan2021-a (p.6 line 226 "corresponding voltage-length product is VpiL = 3.67 V cm"), xue2023-a/b/c (p.2 line 274). |
| F17 | applied | confirmed | pan2021-a z0_ohm basis `simulated`, locator p.3 Sec. 2; p.5 Fig. 4(a); text p.3 line 144 "Re[Z0] of the designed electrodes is shown in Fig. 4(a)"; Fig. 4 caption p.5 line 206 "Calculated results". |
| F18 | applied | confirmed | pan2021 evidence electrode_type tw_gsg entry (basis derived, locator and note as recommended); GSG probes p.6 line 239. |
| F19 | applied | confirmed | pan2021 `ln_rib_r` now `project_inference`; polygon bottom half-width 0.7232 = 0.55 + 0.3 tan 30 deg; sidewall "~30 deg" text p.4 line 194. |
| F20 | applied | confirmed | Tag `first_tfln_mzm_at_2um` removed; claim quoted in notes (abstract line 37). |
| F21 | applied | confirmed | xue2023 text.md: Fig. 1 caption line 139, before the `<!-- page 2 -->` marker (line 170); locators now "p.1 Fig. 1(c) caption" for a/b/c. |
| F22 | applied | confirmed | xue2023 config: ground_r x = [1.3, 20.3], signal [-20.3, -1.3], rib top +-0.5 um; 1.3 = 0.8 + 0.5; spacing 2.6 um; note fixed. |
| F23 | applied | confirmed | Opened `references/xue2023/figures/img_p01_5.png`: scale bar about 88 px = 10 um; three strips about 165-169 px (about 19 um) each, darker non-metal surface above the top strip and below the bottom strip inside the frame. Config note and `missing` updated; no devices column. |
| F24 | rejected | confirmed (deferred) | Per the verify brief this is a known DB-wide follow-up, not a finding. Staged values are the printed spellings (pan2021 "NANOLN, China"; li2022b "NanoLN, Jinan"). |
| F25 | applied | confirmed | papers.csv license: Optica-OA-License-v2 (murai2025, xue2023, li2022b), Optica-OA-License-v1 (pan2021), bare tokens; crossref.json license URLs `OA_License_v1#VOR-OA` (pan2021) and `OA_License_v2#VOR-OA` (murai2025, xue2023, li2022b). redistribution `restricted_local_only` on all four. |

## Unrecorded changes

Field-level diff of staged `papers.csv`, `devices.csv`, `organizations.csv` and the four evidence files against the corrector's
pre-correction snapshot, plus the corrector's config edit scripts:

- papers.csv: only license (F25, 4 rows) and discovered_via (F05, F06). Explained.
- devices.csv: only notes of murai2025-a (F12, F13, F14), murai2025-b (F14, F15), pan2021-a (F20 tags and notes), li2022b-a (F09, F10). Explained.
- organizations.csv: notes only (F08). Explained.
- evidence: murai2025 (F16, F15), pan2021 (F16, F17, F18), xue2023 (F16, F21); li2022b unchanged. Explained.
- configs: 19 material provenance lines (F01-F04), `missing` wording (all four), li2022b signal (F11), murai2025 ground_r (F07), pan2021 ln_rib_r (F19), xue2023 ground_r note and `missing` ground-width entry (F22, F23). Explained. One wording change not described in the dispositions: li2022b `r_pm_per_v` note changed from the HEAD "(values at 532 nm differ)" to "the set is a 633 nm placeholder and the device is at 532 nm" (see N1).

No other change found.

## Coordinator rules across the batch

1. Licence: bare tokens on all four rows; Optica OA -> `restricted_local_only` on all four. Applied.
2. New organizations (Furukawa FITEL, Meta): `ror_id` and `name_source` empty; no unverified URL. Applied.
3. Sim configs: no `standard_reference` entry and no `citation` key in any of the four configs; every material constant is `class: unknown` and listed in `missing`; air definitional. Applied. (The values are kept in `materials` so the electrostatic stage runs; SPEC.md line 13 says unknown values should be left out, but rule (3) and the HEAD li2022b precedent allow the flagged placeholder. Not counted as an issue.)
4. Canonical discovered_via kept: li2022b `web_search;assigned`. Applied.

## New issues

| id | sev | where | issue | fix |
|---|---|---|---|---|
| N1 | minor | `sims/pan2021/config.yaml` and `sims/li2022b/config.yaml`, provenance `materials.lithium_niobate.r_pm_per_v` note | "the set is a 633 nm placeholder" is an unsourced attribution: SPEC.md (lines 39-40) gives the values with no wavelength, and no file in this repo that was read assigns them to 633 nm (it originates in the ingest generator's "633 nm literature set" remark, made from memory). For li2022b the corrector introduced it, replacing the HEAD wording. Same rule as F01-F04. | Replace with "wavelength of the placeholder set not stated in SPEC.md; the device is at 1957 nm / 532 nm". |
| N2 | minor | `sims/li2022b/config.yaml` `geometry.electrodes.ground_r` (and mirrored ground_l) | Class `paper_exact` (wg = 60 um), but its inner-edge position (2.75 um from the waveguide axis) follows the contested 5.5 um gap, the same inference F11 now flags on the signal. | Say in the ground_r note that the position follows the gap choice (or class `project_inference`). |
| N3 | minor | organizations.csv / papers.csv `companies` (murai2025) | org_name "Furukawa FITEL Optical Components Co., Ltd." adds a comma not in the printed form "Co. Ltd." (text.md line 24, crossref.json); the disposition calls it "kept as printed". The notes do record the printed form, and the preferred name is unverified (no name_source). | Either use the printed form or leave as is for the coordinator's name check; disposition wording only. |
| N4 | minor | devices.csv xue2023-a notes | Missing space: "...are not entered.IL 6.8 dB...". | Insert a space. |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p6_02 --replace-paper-ids li2022b`
-> `merge counts: {'papers': 4, 'devices': 8, 'orgs': 2, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
All four configs load with `yaml.safe_load` (provenance keys 25/25/23/26).
