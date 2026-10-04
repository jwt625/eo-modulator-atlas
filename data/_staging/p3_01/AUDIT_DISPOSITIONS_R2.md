# Audit dispositions, round 2: batch p3_01

- Audit: `data/_staging/audits/p3_01-p3_02-r2-claude-audit-2026-10-03.md`
- Papers: xu2020, wang2022a, zhang2022, qi2024, li2022b
- Date: 2026-10-04
- Companion file for the p3_02 papers of the same audit: `data/_staging/p3_02/AUDIT_DISPOSITIONS_R2.md`
- Source re-check: `references/<id>/text.md` for xu2020 (p.4-5), wang2022a (p.2-3) and qi2024 (p.6); page render `references/xu2020/figures/page_04.png` opened (Fig. 3(a)-(c) and the start of its caption are on p.4).
- Files edited: `data/devices.csv` (wang2022a-a, `cladding` only), `data/evidence/xu2020.yaml`, `data/evidence/wang2022a.yaml`, `data/evidence/qi2024.yaml`. Not edited: `data/papers.csv` rows of this batch, `data/organizations.csv`, `sims/`, `references/`, `audit_status`.
- zhang2022 and li2022b: no findings in this audit; unchanged.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 (xu2020, wang2022a, qi2024 part) | minor | applied | Source: xu2020 p.5 "measured Vpi for the 7.5 and 13 mm devices are 3.1 and 1.9 V, corresponding to VpiL of 2.3 and 2.4 V cm"; wang2022a p.3 "half-wave voltage is 2.18 V, corresponding to the half-wave voltage length product of 2.6 V.cm"; qi2024 p.6 "measured Vpi of a 12.917-mm modulator is 1.96 V, corresponding to a voltage-length product (VpiL) of 2.53 V cm". Convention (h): author-computed values are `derived`. Evidence `vpil_dc_vcm` basis `measured` -> `derived` on xu2020-a (2.4), xu2020-b (2.3), wang2022a-a (2.6), qi2024-d (2.53). Notes: xu2020-a "as reported; 1.9 V x 1.3 cm = 2.47" -> "stated by authors from Vpi and length; 1.9 V x 1.3 cm = 2.47"; xu2020-b "as reported; 3.1 V x 0.75 cm = 2.33" -> "stated by authors from Vpi and length; 3.1 V x 0.75 cm = 2.33"; wang2022a-a "as reported; 2.18 V x 1.2 cm = 2.62" -> "stated by authors from Vpi and length; 2.18 V x 1.2 cm = 2.62"; qi2024-d "1.96 V x 1.2917 cm = 2.53" -> "stated by authors from Vpi and length; 1.96 V x 1.2917 cm = 2.53". CSV values and row `vpi_basis` (`measured`, headline Vpi) unchanged. |
| R2-F4 | minor | applied | Source: wang2022a p.2 step (ix) "the whole chip is cladded by 2-um-thick SiO2 for the velocity matching condition"; PECVD is named only for the 900 nm SiO2 of step (vi) and the 3.2 um SiON. `devices.csv` wang2022a-a `cladding`: "SiO2 2 um (PECVD, whole chip)" -> "SiO2 2 um (whole chip)"; evidence `cladding` value changed identically; evidence note "also 900 nm PECVD SiO2 earlier; 3.2 um SiON for the SSC; modulation-section stack not drawn" -> "deposition method of the 2 um layer not stated; 900 nm PECVD SiO2 earlier; 3.2 um PECVD SiON for the SSC; modulation-section stack not drawn" (25 words). |
| R2-F6 | minor | applied | Source: page render p.4 shows Fig. 3(a) with the "ER > 25 dB" inset and Fig. 3(c) (1530/1550/1570 nm traces); the ER text ("> 25 dB", "24 to 28 dB") and "whole C-band" sentence are on p.5. `data/evidence/xu2020.yaml`: xu2020-a `extinction_ratio_db` locator "p.5 Fig. 3(a) inset" -> "p.4 Fig. 3(a) inset; p.5 text"; xu2020-a `band` and xu2020-b `band` locator "p.5 Fig. 3(c)" -> "p.4 Fig. 3(c); p.5 text". |

## Counts

- Findings for p3_01 papers: 3 (R2-F1 counted once for its three papers)
- applied: 3 (R2-F1, R2-F4, R2-F6)
- applied-adjusted: 0
- rejected: 0
- deferred: 0

## Changed numerical or blocking cells

No numerical value changed. Basis-only and text changes for the verifier:

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| xu2020 | xu2020-a | evidence `vpil_dc_vcm` basis (value 2.4) | measured -> derived | p.5 text |
| xu2020 | xu2020-b | evidence `vpil_dc_vcm` basis (value 2.3) | measured -> derived | p.5 text |
| wang2022a | wang2022a-a | evidence `vpil_dc_vcm` basis (value 2.6) | measured -> derived | p.3 Sec. 2 |
| qi2024 | qi2024-d | evidence `vpil_dc_vcm` basis (value 2.53) | measured -> derived | p.6 Sec. 3 |
| wang2022a | wang2022a-a | cladding (CSV and evidence) | SiO2 2 um (PECVD, whole chip) -> SiO2 2 um (whole chip) | p.2 step (ix) |

## Sim config follow-ups

- None. `sims/wang2022a/config.yaml` target 2.6 V cm and `sims/qi2024/config.yaml` target 2.53 V cm are unchanged in value; the wang2022a cladding provenance note already describes the 2 um SiO2 without a deposition method.

## Deferred items needing decisions

- None.
