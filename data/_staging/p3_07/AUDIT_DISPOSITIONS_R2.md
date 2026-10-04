# Audit dispositions round 2: p3_07 (lu2020, schwarzenberger2026, zwickel2020)

Audit: `data/_staging/audits/p3_05-p3_07-r2-claude-audit-2026-10-03.md`. Papers: lu2020, schwarzenberger2026, zwickel2020. Date: 2026-10-04. Figures re-read on 400 dpi renders of `references/zwickel2020/source.pdf` p.8 and p.11 with pixel positions calibrated against the axis frame and gridlines. lu2020, schwarzenberger2026: no findings.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | numerical | applied-adjusted | Unit check: p.5 "alpha denotes an amplitude attenuation coefficient" (power coefficient 2 alpha), so dB/cm = 20 log10(e) x alpha[1/mm] x 10 = 8.686 x 10 x alpha. Pixel reading at 49-51 GHz of the measured (blue) points: Fig. 4(a) gate 0 V, points span 0.22-0.30 /mm, centre about 0.25 (red/black model 0.19); Fig. 2(f) de-embedded (black, gate 0 V) about 0.23-0.35, median 0.29. Fig. 4(c) gate 300 V, points span 0.68-0.84 /mm, centre about 0.76 (model 0.70). Values differ from the auditor's proposal (21, 63): auditor read 0.24 and 0.72; my pixel centres are 0.25 and 0.76. `data/devices.csv` zwickel2020-gate0 `rf_loss_db_per_cm` 17 -> 22; zwickel2020-gate300 59 -> 66 (approx qualifiers kept). `data/evidence/zwickel2020.yaml`: the two `derived` items replaced by `entries` items (basis extracted_from_figure, unit dB/cm, locators "p.11 Fig. 4(a); p.8 Fig. 2(f)" and "p.11 Fig. 4(c)", notes state alpha, scatter, model value and conversion); `derived` now []. Row notes: RF-loss method sentence now says measured points, not the model curve, amplitude convention p.5; per-row sentences now give measured alpha, scatter range (19-26 and 59-73 dB/cm) and model value. |
| R2-F6 | minor | applied-adjusted | p.7 (Fig. 2 measured at Ugate = 0 V), p.8 "Our results indicated that Z0 ... amounts to approximately 50 ohm - except for the low-frequency region"; Fig. 2(d) de-embedded Re{Z0} reads about 55 ohm at 5-30 GHz, about 51 at 50 GHz, about 47-48 at 60 GHz; p.9 "Z0 ... rather insensitive to the gate voltage". Round-1 "clear gate dependence" wording is contradicted by the text. `data/evidence/zwickel2020.yaml` gate0 z0_ohm basis derived -> measured, locator -> "p.7-8 Sec. 3; Fig. 2(d)", note -> de-embedded 51-55 ohm, authors approximately 50 ohm. gate300 z0_ohm basis kept derived (no gate-300 statement of the value itself), locator -> "p.9 Sec. 3; Fig. 3(a); p.8 Fig. 2(d)", note -> insensitivity statement plus analytic limit. Both row notes: the "falls steeply ... clear gate dependence ... not a measured value" sentence replaced by the measured-plus-insensitive statement. Cells unchanged (50, approx). Reverses round-1 F19 in part. |

Counts: applied 0, applied-adjusted 2, rejected 0, deferred 0.

## Changed numerical or blocking cells

- zwickel2020, zwickel2020-gate0, rf_loss_db_per_cm, 17 -> 22 (approx), p.11 Fig. 4(a) measured points at 50 GHz (alpha about 0.25 /mm amplitude, p.5), cross-check p.8 Fig. 2(f)
- zwickel2020, zwickel2020-gate300, rf_loss_db_per_cm, 59 -> 66 (approx), p.11 Fig. 4(c) measured points at 50 GHz (alpha about 0.76 /mm)
- zwickel2020, zwickel2020-gate0, z0_ohm evidence basis, derived -> measured (value 50 unchanged), p.7-8 Sec. 3; Fig. 2(d)

## Sim config follow-ups

None (no `sims/<id>/config.yaml` for these papers).

## Deferred items needing decisions

None.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p3_05-p3_07-r2-verify-claude-audit-2026-10-04.md`: 15 of 16 items confirmed; zwickel2020 rf_loss independently re-read as 22 (19-26) and 66 (56-73) dB/cm with alpha as amplitude coefficient (p.5). Not confirmed: zwickel2020-gate300 `z0_ohm` evidence note claimed measured Z0 is shown only at 0 V; the Fig. 3 caption (p.9) states measured Re{Z0} is plotted versus frequency and gate voltage. Coordinator replaced the note: "Authors state Z0 is rather insensitive to gate voltage (p.9); measured Re Z0 at 300 V only in 3D Fig. 3(a), not read; limit about 50 ohm." Value and basis unchanged.
