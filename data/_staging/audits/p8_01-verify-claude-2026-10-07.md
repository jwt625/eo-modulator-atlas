# p8_01 verification (claude, fresh context, 2026-10-07)

Inputs: `data/_staging/audits/p8_01-claude-audit-2026-10-07.md`, `data/_staging/p8_01/AUDIT_DISPOSITIONS.md`, staged `papers.csv` (5), `devices.csv` (8), `organizations.csv` (3), `evidence/*.yaml` (4), `BATCH_REPORT.md`; `CORRECT_PROMPT.md`, `DISTILL_PROMPT.md`; sources `references/<id>/text.md` and figures. No pre-correction copy of the staged files exists, so "unrecorded changes" is judged against the values the audit lists as checked.

Coordinator decisions applied as given: F1 keep 219 GHz with figure readings in notes; F2 clear IL (notes only); F3-F8 as recommended; F6 no change.

Result: 8 of 8 findings confirmed (F6 confirmed as "no change", with a note on its rationale, N2); corrector's extra wu2022 fix confirmed. New issues: 2 minor, plus the dry run not executed (blocked).

## Per finding

| id | verdict | evidence |
|---|---|---|
| F1 | confirmed | `behzadfar2026-a` bw3db_ghz 219 unchanged. Source: Table 1 p.9 (text.md l.735-737 "219 / 219 / 187"), p.1 l.115 "~ 219 GHz", p.9 l.691 "219 GHz and 0.84 V", l.758 "remains at 219 GHz", conclusion l.807 "~ 220 GHz". Figure re-read on `figures/page_08.png`: Fig. 6(b) 10 mm quartz/air/glycerol circle at about 207 GHz (y 200 at px 307, 250 at px 240, marker px about 298); Fig. 6(a) 10 mm solid curve crosses -3 dB near 205-207 GHz; Fig. 7(a) case 6 star at about 210 GHz (y 200 at px 1057, 250 at px 981, star px about 1041). Readings now in the -a row notes, the bw3db_ghz evidence note ("Fig. 6(a)/(b) about 207, Fig. 7(a) about 210 (read from figures)") and the papers notes; BATCH_REPORT judgment (7) says the same. Consistent across all four places. |
| F2 | confirmed | `ghavami2023-a`: il_onchip_db, il_onchip_scope, il_basis empty; qualifiers = `bw3db_ghz:approx` only; no il_onchip_db entry in `evidence/ghavami2023.yaml`. Source: the only loss value is the conclusion, text.md l.202 "optical losses below 0.1 dB"; Sec. 2.3/2.3.1/2.3.2 (l.163-185) give no loss number and cite Figure 3 / FDTD results not in the PDF. Row notes keep the sentence with the reason. BATCH_REPORT updated ("notes-only (audit F2)"). |
| F3 | confirmed | behzadfar2026 papers notes: "Author first names as printed in the p.1 affiliation footnote (byline prints initials)." Source text.md l.86 "Shiva Behzadfar, Fatemeh Karami, and Pooja Kulkarni are with CREOL", l.131 "Sasan Fathpour is with CREOL". Authors cell unchanged and correct. |
| F4 | confirmed | BATCH_REPORT judgment (6) now "Figs. 3 and 4 are swapped relative to the text citations; printed numbers used"; papers notes say the same. Source: text l.521 "Figure 3 plots Gamma" vs printed caption l.544 "Fig. 4. Field-optical overlap"; l.581/595 "Figure 4 ... Figure 4(b)" vs printed caption l.603 "Fig. 3. RF-engineered metrics"; Figs. 5, 6, 7 match. Locators (e.g. rf_loss "p.6 Fig. 3(b)") use the printed caption, as stated. No data change. |
| F5 | confirmed | ghavami2023 papers notes, -a row notes and the bw3db_ghz evidence note list the introduction wording. Source text.md l.83-84 "half wave voltage of 4.5V and can also support a bandwidth over 300 GHz" (p.2); abstract l.32-33 "up to 300GHz for a 5 mm-long device"; Sec. 2.1.2 l.129 "exceeding 200 GHz"; conclusion l.202-203 "over 300 GHz". Value 300 with approx unchanged. |
| F6 | confirmed (no change) | Staged title keeps "trade-off"; printed p.1 (text.md l.13) "trade off". No change applied, as decided. Rationale caveat in N2. |
| F7 | confirmed | yeh2026 papers notes: "the dc EO response appears only as drift-dependent plotted GHz/V splitting slopes (Fig. 1(b), 2, 4), not entered". Source: text.md l.55-57 defines EO response as change in splitting per volt; l.84-94 and Fig. 2 caption l.352-359 (EO response evolution, push-pull factor 4); l.183 Fig. 4 recovery. No device rows (papers-only) unchanged. |
| F8 | confirmed | wu2022-a row notes, bw3db_ghz evidence note and papers notes add the 50 GHz end point; bw3db_ghz 50 with gt and bw_measured_to_ghz 50 unchanged. Figure re-read on `figures/img_p06_1.png` (x: 0 GHz at px 103, 50 GHz at px 1097; y: -3 dB line at px 651): touches near 27.9 GHz, dips just below near 34.9 GHz, and the last points near 49.6 GHz reach the line. See N1 for one more touch. |
| extra (wu2022 bump) | confirmed | Corrected note "+1 dB bump near 1 GHz" (was "near 2 GHz"). Same figure, zoomed: the bump rises from 0 GHz to a peak of about +1.1 dB at about 0.6 GHz (px about 115) and falls back below 0 dB by about 2 GHz; a smaller secondary bump of about +0.4 dB sits near 2 GHz. "Near 1 GHz" is correct; "near 2 GHz" was wrong. The change is recorded in AUDIT_DISPOSITIONS (F8 line). |

## Unrecorded changes

None in data values. Every non-empty devices.csv value matches the audit's checked-value list (behzadfar geometry and Table 1 values, wu2022 values, bankwitz2026 3.4 V / 51 dB, ghavami2023 300 / 70 GHz / 5 mm) and the evidence entries (CSV value = evidence value for all fields with evidence). organizations.csv and bankwitz2026.yaml predate the audit (21:41) and were not touched.

Text-only edits not itemised in AUDIT_DISPOSITIONS but consistent with the findings: BATCH_REPORT behzadfar judgment (7) (219 kept vs figure readings, F1), ghavami2023 summary ("IL < 0.1 dB is notes-only (audit F2)"), wu2022 judgment line (touches near 28, 35 and 50 GHz, F8). No contradiction introduced.

## Coordinator rules across the batch

1. License: `license` empty for all five papers; `redistribution` restricted_local_only, matching each `source.json` (license "", license_verified false). Consistent with DISTILL_PROMPT (leave empty when neither source.json nor the paper states it; filled from the arXiv OAI record by refresh_metadata). No bare-token violation.
2. Organizations: Tarbiat Modares University, Heidelberg University, Pixel Photonics GmbH have empty name_source and ror_id; none of the five papers has crossref.json. Pass.
3. Sim configs: none; no `sims/` directory for any of the five ids. Rule not exercised.
4. discovered_via: all five ids are new (absent from `data/papers.csv` and `data/devices.csv`); value `web_search;author_group_followup` = batch CSV minus the non-vocabulary token `continuation_2026_10_02`. Pass.

## New issues

| id | severity | where | evidence | suggested fix |
|---|---|---|---|---|
| N1 | minor | wu2022-a notes, bw3db_ghz evidence note, papers notes, BATCH_REPORT | `img_p06_1.png` Fig. 6(c): a single-point downward spike at px about 865 (about 38.3 GHz) reaches the -3 dB line (clear on a 3x zoom of x 600-1110). The notes list touches near 28, 35 and 50 GHz only. | Add "and a single-point dip to -3 dB near 38 GHz" to the three notes; values unchanged. |
| N2 | minor | ghavami2023 title (F6 rationale) | `scripts/refresh_metadata.py` l.421-432 changes a title only when a Crossref record with a DOI exists (`if m and doi`), and compares titles after `norm_title` + space removal, so hyphen vs space is treated as typography and the existing title is kept. ghavami2023 has no DOI, so the refresh will not change "trade-off"; the arXiv path only sets license/redistribution. The disposition's expectation (title fixed at merge) will not happen. | Coordinator decision: either accept "trade-off" as a typography difference (consistent with the script's own rule), or set the printed "trade off" manually. No data impact either way. |

## Dry run

Not run. `uv run python scripts/merge_staging.py data/_staging/p8_01` (default dry run, no `--replace-paper-ids` needed: all five ids are new) was denied by the session permission classifier; the auditor reports the same block. The corrector's report (BATCH_REPORT) states 0 conflicts and 0 validation errors; not independently reproduced here. The coordinator should run it before merge.
