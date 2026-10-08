# p8_04 verification (claude, 2026-10-07)

Scope: fresh-context, read-only check of `data/_staging/p8_04/` after corrections, against `p8_04-claude-audit-2026-10-07.md`, `p8_04/AUDIT_DISPOSITIONS.md` (applied 7, adjusted 0, rejected 0), `CORRECT_PROMPT.md`, `DISTILL_PROMPT.md`, conventions (a)-(gg) in `data/schema/devices.schema.yaml`, and the sources `references/<id>/text.md` + `figures/` (no supplement or correction folders exist for these five papers). Coordinator decision: apply F1-F7 as recommended.

Result: 7 of 7 findings confirmed, 0 not confirmed. New issues: 1 minor (report text only). Dry run: `merge counts: {'papers': 5, 'devices': 7, 'orgs': 3, 'evidence': 5}; conflicts: 0; validation errors: 0`.

## Per finding

| id | verdict | evidence |
|---|---|---|
| F1 | confirmed | Source p.5 (text.md l.141-143): device II "(0.50 +/- 0.05) pi ... comparatively lower IL of 2.96 +/- 0.34 dB and low Delta T_Ring of 1.73 +/- 0.20 dB"; Fig. 2(a) caption p.12 repeats it; IL_pi/2 4.7 dB on p.1 abstract and p.7. 2.96 + 1.73 = 4.69 dB. Staged: datta2024-c il_onchip_db 2.96, il_onchip_scope undefined, il_basis measured; evidence entry value 2.96, basis measured, locator "p.5-6; Fig. 2(a) caption p.12", note as recommended. "source conflict" wording absent from papers.csv, devices.csv and BATCH_REPORT (grep); papers notes, -c notes and BATCH_REPORT judgment (2) carry the recommended IL_pi/2 sentence. Treatment now matches row a (IL 4.78, same quantity, p.4). |
| F2 | confirmed | `scripts/build_views.py` l.136 maps `graphene_2d` to "Graphene / 2D". datta2020-a/-b/-c eo_material graphene_2d, eo_effect other, tag tmd_monolayer kept. Row-a note reads "eo_material graphene_2d (the 2D-material class)"; rows b and c never carried the sentence; BATCH_REPORT judgment (2) updated. No "eo_material other" remains for the TMD rows. |
| F3 | confirmed | p.4 (l.108): "designed to achieve critical-coupling with a Q_L of ~ 20,870 at 8 V"; p.5 (l.126-128): device I critical at 8 V; Fig. 2 caption p.12 (l.256-257): both rings "critically-coupled at 8.5 V". Staged: q_loaded 20870 kept (basis measured, q_loaded:approx); evidence note adds "paper words it as 'designed to achieve'"; -a notes add the 8 V / 8.5 V discrepancy. Papers notes also carry it (recorded in the disposition, beyond the audit's ask, consistent). |
| F4 | confirmed | Abstract p.1 (l.33-36): the 14.9 GHz sentence names no device and follows the 25 um sentence; p.5 (l.131-133) and Fig. 2(b) caption p.12: device I. -b notes, papers notes and BATCH_REPORT judgment (3) use the recommended wording. No data change. |
| F5 | confirmed | p.7 (l.161-162): 210 V on the 4.5 mm shifter "within the longer AMZI arm" (Fig. 3(b)); l.170: Fig. 3(c) "bias voltage was applied to the shorter AMZI arm"; p.8 (l.191-193): text cites "Figure 4d" for retention, data are Fig. 3(d) (caption p.20-21). Figure read (page_20.png, Fig. 3(d)): 120 V trace at about -0.2 x 1e-4, 160 V trace at about -1.55 to -1.57 x 1e-4, flat to 10,000 s. taki2024-a notes and papers notes carry all three items. |
| F6 | confirmed | p.11 Methods (l.273-275): "330-nm-thick SiN layer was deposited on a thermally oxidized Si wafer ... thermally oxidized SiO2 layer was 4 um"; Fig. 1(b) p.18 (l.475) label "Si substrate". Staged: taki2024-a substrate "Si"; evidence entry value Si, basis design_target, locator "p.11 Methods; Fig. 1(b) p.18". BATCH_REPORT judgment (0) added. |
| F7 | confirmed | Abstract p.1 (l.40) "projections up to 1980 pm/V for r42"; bulk r42 1300, r33 105 pm/V on p.2 (l.73-74); p.9 projection 680 pm/V from 55 pm/V (55 x 1300/105 = 681). 160 x 1300/105 = 1981. Papers notes and BATCH_REPORT carry the appended sentence; no row. Evidence context note ("abstract 1980 pm/V not in body") was not changed and does not contradict. |

## Substrate basis for taki2024-a (requested check)

Convention (bb): "dimensions stated in the text are design_target unless the paper says measured (SEM/AFM/profilometer)". The substrate is stated in the Methods text (p.11) with no measurement, so `design_target` conforms; it also matches the basis of the other stack/material cells of the same row (buffer_oxide_um, cladding, electrode_metal, epitaxy_or_stack) and of datta2020/datta2024 in this batch. The figure label (Fig. 1(b)) is corroboration only, so `extracted_from_figure` is not needed.

Context, outside this batch: across `data/evidence/*.yaml` the substrate field is split 143 design_target / 142 measured / 12 extracted_from_figure; several `measured` entries are plain Methods statements (e.g. lotkov2024 "Methods p.4-5", taghavi2024 "p.12, Methods"), which by (bb) would be design_target. Not a p8_04 issue; noted for a future convention sweep.

Consistency check on the same point: datta2020 and datta2024 leave substrate empty. Their Methods print only "4 um / 4.2 um thermally oxidized SiO2" (datta2020 p.15 l.433, datta2024 p.21 l.512) and never name the Si wafer for the photonic chip (datta2020 l.400 is the TMD growth substrate), so leaving those cells empty is correct and F6 does not apply to them.

## Unrecorded changes

No pre-correction snapshot is available (no git by brief), so the check compares the staged files with the audit's description and the dispositions:
- Counts unchanged from the audit scope: papers 5, devices 7, orgs 3, evidence 5.
- File times: devices.csv, papers.csv, datta2024.yaml, taki2024.yaml, BATCH_REPORT.md, AUDIT_DISPOSITIONS.md modified at correction time; datta2020.yaml, thureja2025.yaml, tian2026.yaml, organizations.csv untouched. Consistent with F1-F7 (F2 needs no evidence change; F7 none).
- Every value the audit lists as checked (wavelengths, lengths 0.5/0.04/0.025/4.5 mm, VpiL 1.33/0.8/1.7, BW 0.3/14.9 GHz, IL 4.78, Q 20870/12000/18730, rib widths, buffer oxides 4/4.2/4 um, HZO 30 nm, 6.1 dB/cm) is unchanged.
- Programmatic CSV/evidence check: 59 evidence-required non-empty cells, 59 entries, 0 missing, 0 value mismatches, 0 orphans.
- Changes not named in a disposition line but explained by the audit: BATCH_REPORT taki2024 judgment (0) "substrate Si filled" (follows F6); papers notes 8 V / 8.5 V (named in F3 disposition). Nothing unexplained.

## Coordinator rules

- (1) Licence: all five `license` empty, `redistribution` restricted_local_only, matching each `references/<id>/source.json` (license '', restricted_local_only); Crossref VoR licences (Optica OA v2 for datta2024, CC-BY-4.0 for taki2024) kept in notes only, correct since the cached copies are arXiv. Per DISTILL_PROMPT the coordinator fills licence at merge.
- (2) New orgs (North Carolina State University, University of Chicago, National Center for Nanoscience and Technology): ror_id and name_source empty; none already present in `data/organizations.csv`; every name in universities/companies/foundry_or_fab resolves to an existing or new org.
- (3) No sim configs in the batch; not applicable.
- (4) discovered_via `web_search;author_group_followup` for all five (batch CSV token continuation_2026_10_02 dropped as not in the vocabulary, as the coordinator brief allows); no canonical paper replaced.

## New issues

| id | severity | location | issue | suggested fix |
|---|---|---|---|---|
| N1 | minor (report only, not merged) | `p8_04/BATCH_REPORT.md` "Schema/skill gaps", last bullet | Still says "eo_material enum has no transition-metal-dichalcogenide or ferroelectric hafnia entry (other used)"; after F2 the TMD rows use graphene_2d, only HZO uses other. | Reword to "no ferroelectric hafnia entry (other used for taki2024); monolayer TMDs filed under graphene_2d ('Graphene / 2D')". |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p8_04` -> `merge counts: {'papers': 5, 'devices': 7, 'orgs': 3, 'evidence': 5}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
