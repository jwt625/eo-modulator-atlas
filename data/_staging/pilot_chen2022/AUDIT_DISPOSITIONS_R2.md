# Audit dispositions, round 2: pilot chen2022

- Audit: `data/_staging/audits/pilots-p2_01-han2023-r2-claude-audit-2026-10-03.md`
- Papers: chen2022 (this file); see `data/_staging/pilot_ogiso2016/AUDIT_DISPOSITIONS_R2.md` for the scope of the whole audit.
- Date: 2026-10-04
- Source re-check: `references/chen2022/` has only `source.pdf` (9 pages). Page text regenerated with pymupdf in a scratch area outside the repo. Page placement from the extracted text: Fig. 1 p.3, Fig. 2 p.4, Fig. 3 and the 35 um sentence p.5, process flow p.6, Fig. 4 and Fig. 5 captions p.6, Sec. III text and Fig. 6 p.7, Table I and Fig. 6(e) text p.8.
- Files edited: `data/devices.csv` (chen2022-a/b/c), `data/evidence/chen2022.yaml`. Not edited: `sims/`, `references/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F4 | minor | applied | Source: p.5 "a 35 um undercut etching of the silicon substrate is optimal" (design); p.6 isotropic ICP-RIE silicon dry etch, no depth; p.7 "Longer isotropic undercut etching ... should be done to further reduce the RF index". `devices.csv` chen2022-a, -b, -c `substrate`: "silicon 725 um with 35 um isotropic undercut beneath the modulation section" -> "silicon 725 um, isotropically undercut beneath the modulation section (35 um design optimum; fabricated depth not stated)". Evidence (3 entries) value changed identically; locator "p.6 Sec. II; p.5" -> "p.6 Sec. II; p.5 Sec. II; p.7 Sec. III"; note "725 um Si; 35 um undercut stated optimal" -> "725 um Si (p.6); 35 um undercut is the design optimum (p.5); p.7 calls for longer undercut; fabricated depth not stated". |
| R2-F5 | minor | applied-adjusted | Fig. 4 and Fig. 5 are on PDF p.6. Evidence locators (values unchanged): "p.7 Sec. III; Fig. 4(a)/(b)/(c)" -> "p.7 Sec. III; p.6 Fig. 4(a)/(b)/(c)" (6); "... Fig. 4(a)/(b)/(c) inset" -> "... p.6 Fig. 4(...) inset" (3); "Fig. 4(a)/(b)/(c) inset; p.7 Sec. III" -> "p.6 Fig. 4(...) inset; p.7 Sec. III" (3); "p.7 Sec. III; Fig. 5" -> "p.7 Sec. III; p.6 Fig. 5" (3); "p.7 Sec. III; Fig. 5(e)" -> "... p.6 Fig. 5(e)" (1); "Fig. 5(d)" -> "p.6 Fig. 5(d)" (1); "Fig. 5(f); p.7 text" -> "p.6 Fig. 5(f); p.7 text" (1); "Fig. 1(c,d); Fig. 4" -> "Fig. 1(c,d); p.6 Fig. 4" (3). Adjustment (same fix applied where it also applies): "p.6-7 Fig. 6" -> "p.7 Fig. 6; p.7-8 text" (1) and "p.6-7 Fig. 6(d); abstract" -> "p.7 Fig. 6(d); p.8 text; abstract" (1), since Fig. 6 is on p.7 and its BER text on p.8; "Abstract; p.7; Table I" -> "Abstract; p.7; p.8 Table I" (2). |
| R2-F6 | minor | deferred (out of write scope) | `sims/chen2022/config.yaml` notes S2, S3, S5 are sim-config items; listed under Sim config follow-ups. |

Counts: applied 1, applied-adjusted 1, rejected 0, deferred 1.

## Changed numerical or blocking cells

None (R2-F4 is a text cell, R2-F5 locators only).

## Sim config follow-ups

- S3: `geometry.regions.ln_rib_r` note says sidewall ~68 deg from horizontal; the polygon gives about 65.8 deg. Align the note with the polygon (or the polygon with the source).
- S5: `title` uses "T-rail"; the paper says "T-segment".
- S2: materials marked `standard_reference` with "not verified" notes; waits for the material-constant sourcing task in DevLog-004.
- New (from R2-F4): the config draws a 35 um undercut (polygons bottom at -38.0 um from -3.0 um). That is the paper's design optimum; the fabricated depth is not stated and p.7 implies the fabricated undercut was shallower than needed. A config note should say the undercut is the design value, not the as-fabricated one.

## Deferred items needing decisions

- R2-F6: sim config edits (coordinator or sim owner).
