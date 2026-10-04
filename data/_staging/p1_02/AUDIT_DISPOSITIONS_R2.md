# Audit dispositions, round 2: batch p1_02

- Audit: `data/_staging/audits/p1_02-r2-claude-audit-2026-10-03.md`
- Papers: tran2026, wang2018, weigel2018, he2019, boynton2020
- Date: 2026-10-03
- Source re-check: no `text.md` or `figures/` exist in `references/` for tran2026, wang2018, weigel2018 or he2019. Page text and 150 dpi page renders were regenerated from each cached `source.pdf` (pymupdf) into a scratch area outside the repo. Page counts are 3, 6, 19 and 21, so the page indices match the `p.N` locators. boynton2020 was checked against `crossref.json` and the batch CSV only.
- Files edited: `data/papers.csv` (2 rows), `data/devices.csv` (9 rows), `data/evidence/tran2026.yaml`, `data/evidence/he2019.yaml`, `data/evidence/wang2018.yaml`. Not edited: `data/organizations.csv`, `data/evidence/weigel2018.yaml`, `sims/`, `audit_status`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F1 | numerical | applied | Source: p.2 Fig. 1 center is labelled "Vπ=3.4 V". The p.2 text says "yields an estimated 3 dB-bandwidth of 76 GHz and a Vπ = 3.1 V at 5 V bias", and p.3 Conclusion says 3.1 V. Changes: `devices.csv` tran2026-a `vpi_basis` measured -> author_estimate. `devices.csv` tran2026-a `notes`: sentence "Vpi column is DC: static transfer function at 5 V bias." -> "Vpi 3.1 V is the text/conclusion value at 5 V bias (method not stated); the static DC transfer curve (Fig. 1 center) is labelled 3.4 V." Evidence tran2026-a `vpi_dc_v` (value 3.1 unchanged): basis measured -> author_estimate; locator "p.2, Sec. 3; p.3, Conclusion; Fig. 1 center" -> "p.2, Sec. 3 text; p.3, Conclusion"; note -> "Text value; the static transfer curve in Fig. 1 center is labelled 3.4 V; method for 3.1 V not stated". The context_values item for 3.4 V is kept. |
| R2-F2 | metadata | applied | Source: `references/boynton2020/crossref.json` has `abstract` null and contains neither 30.6 nor 6.7. Both numbers come from the notes column of `data/_staging/batches/p1_02.csv`. Change: `papers.csv` boynton2020 `notes`: sentence "The Crossref abstract mentions ... (abstract-only, no locator into the paper)." -> "The batch CSV hint (title-search note, not a primary source) quotes 30.6 GHz and 6.7 V*cm; the Crossref record carries no abstract; nothing entered until the full text is read." `redistribution` was left as unknown (the auditor marked harmonising it optional, and the row is metadata-only). |
| R2-F3 | metadata | applied | Source: the cached manuscript cites Nature 562, 101-104 (2018) (p.11), Opt. Express 26, 23728-23739 (2018) (p.11), and the QSFP-DD rev 4.0 URL ".../2018/09/...rev4p0-9-12-18" (p.11). Changes: `papers.csv` he2019 `notes`: appended after the version-of-record sentence: "The cached manuscript cites September 2018 sources (Nature 562; Opt. Express 26, 23728; QSFP-DD rev 4.0), so it is a later revision than arXiv v1; exact version unknown." `devices.csv` he2019-a and he2019-b `notes`: "Numbers from the arXiv-style manuscript with" -> "Numbers from the arXiv-style manuscript (a later revision than arXiv v1) with". |
| R2-F4 | minor | applied | Source: p.1 abstract "exhibits an insertion loss of 2.5 dB" and p.8 Table 1 "2.5 dB". Neither says "estimated". `devices.csv` he2019-a `il_basis` author_estimate -> measured. Evidence he2019-a `il_onchip_db` basis author_estimate -> measured; the note ("Method and excluded items not stated; ...") is kept. Row placement is unchanged. |
| R2-F5a | minor | applied | Source: in p.5 Fig. 3b, both traces start at the left axis edge, below the 10 GHz tick. p.9 Methods: "the frequency response of the PD (XPDV4120R) is deducted from the measured S21 response". Evidence he2019-a and he2019-b `bw3db_reference` note "0 dB level at low frequency not stated; trace starts near 10 GHz" -> "0 dB reference not stated; traces start at a few GHz (approximate figure reading); PD response de-embedded (p.9 Methods)". The value (unspecified) is unchanged. |
| R2-F5b | minor | applied | Source: p.9 Methods "SHF 807 with output saturation Vpp of 4 V"; p.16 Supp. II "Vpp of 4 V is obtained after the RF amplifier". This is a setup value, not an estimate. Evidence he2019-a `drive_vpp_v` (value 4) basis author_estimate -> measured. There is no row-level basis column for drive. |
| R2-F5c | minor | applied-adjusted | Source: p.14, Supp. I reads "the calculated Vπ·L = 2.46 V·cm" (confirmed on the page render); p.16 restates it. `sims/` is out of scope, so the sim config locator is listed under follow-ups. Applied to the matching evidence item instead: `he2019.yaml` context_values `simulated_vpil_experimental_structure` locator "p.16, Supp. II" -> "p.14, Supp. I; p.16, Supp. II". |
| R2-F6 | minor | applied | Source: p.4 Fig. 4 caption "non-return-to-zero"; p.5 "40 Gbps and 22 Gbps for the racetrack and MZI devices". Added `entries` in `wang2018.yaml`: wang2018-mzi `max_baud_gbd` 22 GBd, basis derived, locator "p.4, Fig. 4 caption; p.5", note "NRZ, one bit per symbol"; wang2018-rt-eye `max_baud_gbd` 40 GBd, same basis, locator and note. The existing `derived` items are kept (as in he2019-a). The CSV cells are unchanged. |
| R2-F7 | minor | applied-adjusted | Source: p.3 "Our devices make use of an x-cut LN configuration"; "placing gold micro-RF electrodes"; "A SiO2 cladding layer is used"; "The optical waveguides have a top width w = 900 nm, rib height h = 400 nm, and a slab thickness s = 300 nm". These are stated for the platform. Added the three material fields the audit proposed, plus the optional waveguide geometry, which the source states for all optical waveguides and which the MZI row already treats as platform values. On each of wang2018-rt-q50k, -rt-q8k, -rt-q5p7k, -rt-q18k and -rt-eye in `devices.csv`: `crystal_cut` '' -> x-cut, `cladding` '' -> SiO2, `electrode_metal` '' -> gold, `rib_width_nm` '' -> 900, `etch_depth_nm` '' -> 400, `slab_thickness_nm` '' -> 300. Each `notes` gets "Cut, cladding, electrode metal and waveguide w/h/s from the p.3 platform statement; electrode gap not entered (Q set by electrode distance, p.4)." Thirty evidence entries were added (basis measured, locator "p.3, Sec. text"). The electrode gap of 3.5 um is not added: p.4 says the racetrack Q is set by the electrode-waveguide distance. |
| R2-F8 | minor | applied | Source: p.6 "actual insertion loss was around -7.6 dB" (on-chip, the first-listed IL field), deduced from the 13.6 dB fiber-to-fiber loss with about 3 dB per edge. The evidence basis is derived. `devices.csv` weigel2018-a `il_basis` measured -> derived, so the row summary matches the evidence basis of the headline field (convention h). |
| R2-F9 | minor | rejected (keep as entered) | The auditor proposed no change. p.2 "realized in a foundry Si photonics process [4]", where ref. [4] is "Radio frequency silicon photonics at Sandia National Laboratories". Sandia co-authors are listed (Applied Microphotonic Systems). The papers.csv notes already say the fab is named through ref. 4. `foundry_or_fab` Sandia National Laboratories stays. |

## Counts

- Findings: 9 (R2-F5 split into a, b and c, so 11 dispositions)
- applied: 8 (F1, F2, F3, F4, F5a, F5b, F6, F8)
- applied-adjusted: 2 (F5c, F7)
- rejected: 1 (F9; no change proposed by the auditor either)
- deferred: 0

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| tran2026 | tran2026-a | vpi_basis | measured -> author_estimate | p.2, Sec. 3 text; p.3, Conclusion; p.2 Fig. 1 center (3.4 V label) |
| he2019 | he2019-a | il_basis | author_estimate -> measured | p.1, abstract; p.8, Tab. 1 |
| weigel2018 | weigel2018-a | il_basis | measured -> derived | p.6, Sec. text |
| wang2018 | wang2018-rt-q50k, -rt-q8k, -rt-q5p7k, -rt-q18k, -rt-eye | rib_width_nm | '' -> 900 | p.3, Sec. text (Fig. 2c) |
| wang2018 | same five rows | etch_depth_nm | '' -> 400 | p.3, Sec. text (Fig. 2c) |
| wang2018 | same five rows | slab_thickness_nm | '' -> 300 | p.3, Sec. text (Fig. 2c) |
| wang2018 | same five rows | crystal_cut | '' -> x-cut | p.3, Sec. text |
| wang2018 | same five rows | cladding | '' -> SiO2 | p.3, Sec. text |
| wang2018 | same five rows | electrode_metal | '' -> gold | p.3, Sec. text |

Evidence-only basis changes (CSV value unchanged): tran2026-a `vpi_dc_v` 3.1 measured -> author_estimate; he2019-a `il_onchip_db` 2.5 author_estimate -> measured; he2019-a `drive_vpp_v` 4 author_estimate -> measured. No numerical CSV value changed for existing populated cells.

## Sim config follow-ups

- `sims/he2019/config.yaml` target `vpi_l_dc_vcm` 2.46 (simulated): change the locator "p.16, Supp. II" to "p.14, Supp. I; p.16, Supp. II" (R2-F5c). The value is unchanged.
- No sim target value conflicts with a corrected value. he2019 targets 2.2, 7.4, 2.46 and 2.21 are unchanged. tran2026, wang2018 and weigel2018 have no sim config.

## Deferred items needing decisions

None. Optional coordinator choice left untouched: boynton2020 `redistribution` unknown vs restricted_local_only (R2-F2 remark).

## Checks run

- `uv run python scripts/validate_db.py`: 0 error(s).
- Evidence equality (scratch script): every non-empty evidence-required cell of tran2026, wang2018, weigel2018 and he2019 has an `entries` item with an equal value. 0 missing, 0 orphan entries.
- Cell-level diff against pre-edit copies: only the cells listed above, plus the stated `notes` cells, changed. `organizations.csv` and `weigel2018.yaml` are byte-identical. All other rows are byte-identical (CSV QUOTE_MINIMAL with CRLF line endings round-trips exactly).

## Verification follow-up (coordinator, 2026-10-04)

Fresh verifier (`data/_staging/audits/p1_02-p3_03-p3_04-r2-verify-claude-audit-2026-10-04.md`) confirmed 102 of 104 changed cells in p1_02/p3_03/p3_04; the two not confirmed were the he2019-a/-b `bw3db_reference` evidence notes ("traces start at a few GHz"). Coordinator re-read Fig. 3(b) (p.5 render): frequency axis begins near 0 GHz and both traces start at the left edge. Note changed to "traces start near 1 GHz (approximate figure reading)" in both entries. No value changed.
