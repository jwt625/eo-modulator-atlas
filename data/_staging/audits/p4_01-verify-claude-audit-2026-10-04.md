---
verifier: fresh-context subagent (independent of the Q1 auditor and the dispositioner)
task: verify the Q1 audit dispositions of staged batch p4_01 and re-check every headline cell
date: 2026-10-04
scope: data/_staging/p4_01 (arabjuneghani2022, valdez2023a, liu2025, liu2025b; papers.csv, devices.csv 8 rows, organizations.csv, evidence/*.yaml) plus sims/arabjuneghani2022/config.yaml and sims/valdez2023a/config.yaml (targets and wording only)
mode: read-only (only this file written; no edits to staged files, no git, no network; no engine run)
verdict: all 11 dispositions reflected in the staged files; all numerical, blocking and cleared-cell changes confirmed against the source; 0 not confirmed; 1 new minor note-level finding (liu2025 O-band roll-off text vs Fig. 8); merge-ready as is
counts: {confirmed: 11, not_confirmed: 0, new_findings: 1}
---

# Verification of the Q1 audit dispositions: p4_01

## Method

- Read the audit `data/_staging/audits/p4_01-q1-claude-audit-2026-10-04.md`, `data/_staging/p4_01/AUDIT_DISPOSITIONS.md`, every non-empty cell of the 8 device rows, 4 papers rows and 1 organization, all 4 evidence files, the relevant `BATCH_REPORT.md` lines, and both sim configs.
- Figures measured against axis ticks with pixel scripts (scratch only; all readings approximate):
  - arabjuneghani2022 Fig. 5(a), 5(b): re-rendered from `source.pdf` p.4 at 8x. Fig. 5(b) calibration 34.3 px/dB (-5/-10/-15 ticks, -3 dB dashed line at y 159), 3.64 px/GHz (50/100/150/200 labels). Fig. 6 checked on the 2x page render.
  - valdez2023a Fig. 4(d) `figures/img_p06_1.png` (y ticks 4/2/-2/-4/-6/-8 dB at 74/199/448/572/696/820 px, 62.2 px/dB; x ticks 20/40/60/80/100 GHz at 470/752/1034/1316/1598 px, 14.1 px/GHz) and Fig. 4(b) `figures/img_p06_13.png`; page render `page_06.png` to confirm the panel mapping.
  - liu2025 Fig. 8(b) and 8(c): re-rendered from `source.pdf` p.10 at 8x / 5x. Fig. 8(b) calibration: -5 dB tick at y 241.5, -3 dB dashed at y 186 (27.75 px/dB, 0 dB at y 102.75); x ticks 20 GHz apart at 12.67 px/GHz.
  - liu2025b Fig. 4(b), 4(c), 5, 6(b) and Table 1 on `page_05.png` / `page_06.png`.
- Text checks in `references/<id>/text.md`: arabjuneghani2022 p.1-5; valdez2023a p.2, p.4-6, S1; liu2025 p.2, p.4-5, p.9-12, conclusion p.13; liu2025b p.4-7. `references/liu2025/crossref.json` fields read directly.
- Mechanical check (scratch script): every evidence entry value equals its device cell (0 mismatches); every non-meta populated cell has an evidence entry or `derived` item (0 missing); no qualifier on an empty field.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| arabjuneghani2022 | 2 | corrections confirmed | F1, F5, F6 confirmed; headline re-check clean |
| valdez2023a | 2 | corrections confirmed | F3 confirmed by my own Fig. 4(d) point-by-point reading; Fig. 4(b) gt kept correctly; F9 confirmed |
| liu2025 | 2 | corrections confirmed; 1 new minor note-level finding | F2, F4, F7, F10 confirmed; N1 (Fig. 8 measured O-band roll-off deeper than the stated 0.83 dB) |
| liu2025b | 2 | corrections confirmed | F8, F11 confirmed; headline re-check clean |

## Changed cells and dispositions

| ID | device_id / file | Change | Source check (my reading) | Verdict |
|---|---|---|---|---|
| F1 | arabjuneghani2022-b `bw3db_ghz`, `qualifiers`, evidence `bw3db_ghz`, notes; papers.csv notes | 170 -> 100, `bw3db_ghz:gt` added, evidence 170/predicted -> 100/measured, `bw_basis` measured kept, 170 GHz in notes only | p.4: "well beyond 100 GHz with a roll-off of 2 dB from low frequency to 100 GHz"; responses "extrapolated beyond the measurement limit of 100 GHz"; Fig. 5 caption "well beyond 100 GHz". Fig. 5(b): measured (VNA violet + OSA orange) ends at x 528 = 100 GHz; end about -1.3 dB; deepest about -2.0 dB near 94 GHz; never reaches -3 dB. Dashed predicted curve is nearly tangent to -3 dB: -2.92 dB at about 175 GHz, -3.03 dB at about 186 GHz, so it crosses at about 180-185 GHz on the plot (authors state 170). Convention (c) first case: 100 gt, measured-to 100. | confirmed |
| F2 | liu2025-a, liu2025-b `bw3db_ghz`, `bw_basis`, `qualifiers`, evidence, notes | 220 / 218 -> 110; predicted -> measured; `bw3db_ghz:gt` added; extrapolations in notes only | p.10: "3-dB EO bandwidth far beyond 110 GHz", "extrapolated beyond 110 GHz by using the analytical model"; Table II (p.12) "> 110 (220a)", "> 110 (218a)", "a: Extrapolated 3-dB EO bandwidth". Fig. 8(b) (measured, LCA to 110 GHz): both traces end near -1 dB and never approach -3 dB; only the dashed calculated curves in Fig. 8(c) cross -3 dB (near 220 GHz). Locator "Fig. 8(b)" for the measured bound is right (the audit's "Fig. 8(c)" referred to the overlay panel). | confirmed |
| F3 | valdez2023a-b `qualifiers`, evidence note, row notes; papers.csv notes; sims/valdez2023a target comment and limitation | `bw3db_ghz:gt` -> `bw3db_ghz:approx`, value 100 and basis measured unchanged | p.4: "does not roll off below 3 dB ... except at the far edge of the measured RF range, above 100 GHz, which we therefore take as the 3-dB roll-off frequency". Fig. 4(d) points (approx): -2.95 dB at 74 GHz (red band edge), -2.98 / -2.94 dB at 80 / 81 GHz, -3.08 / -3.36 dB at 95 / 96 GHz, -2.1 to -2.8 dB at 97-100 GHz, -3.10 / -3.28 / -3.34 dB at 101 / 102 / 103 GHz, -2.4 to -2.95 dB at 104-106 GHz, then -3.27, -3.45, -3.82, -4.26 dB at 107-110 GHz. A gt bound at 100 is contradicted by the sub -3 dB points at 95-96 GHz; the authors' claimed crossing near the edge makes approx correct (convention (c) third case). Fig. 4(b) (0.4 cm): all points above -3 dB up to about 109 GHz (-2.2 dB), last point about -3.1 dB at 110 GHz, so valdez2023a-a gt 100 with range 110 stays correct. | confirmed |
| F4 | papers.csv liu2025 `doi`, `venue`, notes | DOI 10.1002/lpor.202570057 cleared; venue adds "(article DOI not verified)"; caveat rewritten | crossref.json: title ends "(Laser Photonics Rev. 19(14)/2025)", article-number 2570057, reference-count 0, no abstract, licence only the Wiley terms URL, 11 authors. Cover / front-matter record pattern; clearing is right. Dry run accepts the empty DOI. | confirmed |
| F5 | sims/arabjuneghani2022 target `bw3db_ghz` | source device cell -> `{paper_id, locator "p.1 abstract; p.4 Sec. 3.3, Fig. 5(b)", basis predicted, note}`; value 170 kept; limitation line updated | Locator and wording match the text (abstract "extrapolated 3 dB bandwidth of 170 GHz"). Matches the kharel2021 precedent (`source: {paper_id, basis: predicted}`); kharel2021 also carries `comparable: false`, not a SPEC-defined key, so its absence is not a defect. `bw3db_ghz` is not an implemented metric, so the target is never evaluated. | confirmed |
| F6 | arabjuneghani2022-a notes | appended Fig. 5(a) scatter sentence | Fig. 5(a) (0 dB at y 59, -3 dB at y 162, 34.3 px/dB; 3.65 px/GHz): trace centre first reaches about -3 dB near 74-75 GHz; OSA segment spans about -1.8 to -3.5 dB from 75 to 100 GHz; deepest about -3.5 dB near 95 GHz; end about -2.4 to -2.9 dB at 100 GHz. Sentence ("deepest about -3.5 dB near 97 GHz") is within reading error. 84 GHz and 3.6 dB are author statements (p.4). | confirmed |
| F7 | evidence/liu2025.yaml `energy_per_bit_fj` | derived list -> entries, basis author_estimate, locator p.12 Sec. 4; BATCH_REPORT wording | p.12: "can be estimated as We = Vrms^2/(BR) ... 4.42 fJ/bit (0.69 fJ/bit)", Vrms 245.6 / 97.6 mV, includes probe and RF cable. `derived: []`. CSV 4.42 / 0.69 unchanged. | confirmed |
| F8 | liu2025b-a notes | appended Vpi frequency conflict sentence | p.4 "500 kHz triangular voltage sweep"; Fig. 4 caption "Half-wave voltage at 1 GHz, 2.92 V"; p.7 "measured Vπ of 2.92 V at 1 GHz". Fig. 4(c) is a transmission-versus-voltage sweep (max near -0.9 V, min near 2.0 V, about 2.9 V). | confirmed |
| F9 | valdez2023a-a notes; papers.csv valdez2023a notes | "2.0 V and 1.0 V (p.4; conclusion rounds ...)"; "arXiv stamp 23 Nov 2022, 'Dated: November 28, 2022'" | p.4 "measured Vπ of 2.0 V and 1.0 V"; p.6 conclusion "Vπ = 2 V", "Vπ = 1 V". | confirmed |
| F10 | liu2025-b notes; `epitaxy_or_stack` (both rows, CSV and evidence) | RF sentence reworded; "50 deg design sidewall" | liu2025-a carries only `n_rf` of the line parameters; p.3 "sidewall angle of the waveguide is taken to be ... 50". Both CSV cells and both evidence values updated and equal (mechanical check). | confirmed |
| F11 | papers.csv liu2025b `venue` | "Light: Advanced Manufacturing 6(3), 47" | Page header "(2025)6:47"; issue 3 per the disposition's Crossref check. Licence-quote part not applied with a valid reason (CC-BY notice already quoted in papers.csv notes; audit said no change required). | confirmed |

Confirmed: F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11 = 11. Not confirmed: none. Rejected or deferred findings: none (the coordinator follow-up for the liu2025 article DOI and arXiv id is network work and correctly left open).

## Independent headline re-check (all 8 rows)

| Row(s) | Cells checked | Result |
|---|---|---|
| arabjuneghani2022-a | Vpi 4.4 V (100 kHz, Fig. 3(a)), VpiL 2.2 derived, L 5 mm (Table 1), 1550 nm (EO), push-pull stated (p.2); bw 84 measured, measured-to 100, roll-off 3.6 dB at 100 (p.4); IL 16 approx ("about 16 dB", fiber-to-fiber, facet dominated); ER 23 static; 100 Gbaud OOK/PAM-4, PAM-8 80 Gbaud 240 Gb/s, 124 fJ/bit author_estimate (p.5); geometry G 5, Wc 12, Tg 1 um, 500/200/800 nm | clean |
| arabjuneghani2022-b | Vpi 6.6 V, VpiL 3.3; bw 100 gt, measured-to 100, roll-off 2 dB at 100 (text; my Fig. 5(b) deepest about -2.0 dB, end about -1.3 dB); RF VpiL lt 4.1 V cm to 100 GHz (Fig. 6: G = 10 um RF Vpi up to about 8.2 V x 0.5 cm); n_m 2.2, 3.6 dB/cm at 67 GHz (derived from measured S-parameters); ng 2.23 simulated; prop loss lt 0.02 simulated; IL 16 approx; ER 20 | clean |
| valdez2023a-a | Vpi 2.0 V (100 kHz trapezoid, cos^2 fit), VpiL 0.8, 4 mm, 784 nm, push-pull stated (p.5); bw 100 gt, measured-to 110, reference 1 GHz (Fig. 4 caption); on-chip power about 0 dBm | clean |
| valdez2023a-b | Vpi 1.0 V, VpiL 0.8, 8 mm; bw 100 approx, measured-to 110 (see F3); IL on-chip 12 approx author_estimate (subtractive, p.4), fiber-to-fiber 20 approx; ER 31 approx (Fig. 3(e)); n_rf 2.24 simulated at 110 GHz, ng 2.24 (p.2, Fig. 1(b)); G 4, h 2, L 20, t 15 um | clean |
| liu2025-a | Vpi 1.9 V (1 MHz, Fig. 8(a): null-to-peak about -0.45 to 1.5 V), VpiL 1.33, 7 mm, 1550 nm; bw 110 gt measured, measured-to 110 (LCA N4372E); roll-off lt 0.77 at 110 (p.10, conclusion "less than"); n_rf 2.22 at 110 GHz; ng 2.221; 130 Gbaud PAM8 390 Gb/s; 4.42 fJ/bit | clean; see N1 (roll-off note) |
| liu2025-b | Vpi 1.54 V, VpiL 1.08, 1310 nm; bw 110 gt; roll-off lt 0.83 (conclusion "less than 0.77 dB (0.83 dB)"); ng 2.225; 0.69 fJ/bit | values clean; N1 |
| liu2025b-a | Vpi 2.92 V, VpiL 2.92 V cm, 10 mm, 1550 nm; bw 110 gt, measured-to 110, roll-off 2.3 dB at 110 (p.4; Fig. 4(b) end about -2.2 dB); prop loss 0.2 dB/cm (cut-back, p.4); n_rf 2.22, 4.4 dB/cm at 110 GHz, 47 ohm simulated (Fig. 1 caption) | clean |
| liu2025b-b | bw 95 measured (p.4; Fig. 6(b) first -3 dB crossing about 95-97 GHz), measured-to 110, roll-off 3.6 dB at 110 (Fig. 6(b) end about -3.6 dB); IL 6.5 dB fiber-to-fiber (2 dB/facet UHNA); ER 3.212 dB dynamic; 190 Gbaud PAM4, 380 Gb/s derived; laser about 10 dBm approx | clean |

Cross-check: liu2025b Table 1 lists the arabjuneghani2022 device as "16 dB, 6.6 V, 5 mm, 170 GHz, 80 Gbaud PAM8"; it repeats the extrapolated figure and does not affect the bound stored here.

## Issues and new findings with exact proposed fixes

**N1 (new, minor, note-level). liu2025: Fig. 8 measured traces roll off more at 110 GHz than the stated 0.77 / 0.83 dB, most clearly at 1310 nm.**
- Fig. 8(b) (calibration above; approx): 1310 nm trace about -1.1 dB at 110 GHz, minimum about -1.5 dB near 104-105 GHz. 1550 nm trace noisy, about -0.4 to -1.2 dB over 104-109 GHz. Fig. 8(c) agrees: measured 1310 nm ends about -1.3 dB (minimum about -1.5 dB near 104 GHz); measured 1550 nm ends about -0.8 to -1.1 dB. The dashed calculated curves sit at about -0.84 dB at 110 GHz in both panels, so the stated numbers track the model curve more closely than the raw traces.
- Values stay (author statements, p.2, p.10, conclusion "less than 0.77 dB (0.83 dB) up to 110 GHz"). The bandwidth bound 110 gt is unaffected (traces stay well above -3 dB).
- Proposed:
  - `data/_staging/p4_01/devices.csv` liu2025-b `notes`: append "Fig. 8(b),(c): measured 1310 nm trace reads about -1.1 to -1.3 dB at 110 GHz (minimum about -1.5 dB near 104 GHz), deeper than the stated 0.83 dB, which matches the calculated curve (approx. reading)."
  - liu2025-a `notes`: append "Fig. 8(b),(c): measured 1550 nm trace is noisy, about -0.4 to -1.2 dB over 104-110 GHz (approx. reading)."

**Observation (no change in staging).** `references/liu2025/text.md` frontmatter and `references/liu2025/source.json` still carry `doi: 10.1002/lpor.202570057` (the cover record). These are cache files outside the staged batch; update them together with papers.csv when the coordinator fetches the article's own Crossref record.

**Observation (optional).** `sims/arabjuneghani2022/config.yaml` bw3db target could carry `comparable: false` like `sims/kharel2021/config.yaml` for consistency; not a SPEC key, so no change is required.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p4_01`:

```
merge counts: {'papers': 4, 'devices': 8, 'orgs': 1, 'evidence': 4}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
