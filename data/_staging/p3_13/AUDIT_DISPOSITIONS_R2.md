# Audit dispositions, round 2: batch p3_13

- Audit: `data/_staging/audits/p3_11-p3_13-r2-claude-audit-2026-10-03.md`
- Papers: larocque2024, kari2025, holzgrafe2020, thiele2022, hou2024, multani2025
- Date: 2026-10-04
- Source re-check: `references/kari2025/text.md` p.1, p.4, p.6, p.8, p.9, p.11, p.13 and `figures/img_p05_1.png` (Fig. 2), `img_p08_1.png` (Fig. 4); `references/holzgrafe2020/text.md` p.9, p.12-19; `references/hou2024/text.md` p.9 and `figures/page_10.png` (Fig. 4(c)).
- Files edited: `data/devices.csv` (rows kari2025-a, hou2024-a), `data/papers.csv` (rows holzgrafe2020, kari2025), `data/evidence/kari2025.yaml`, `hou2024.yaml`. Not edited: `organizations.csv`, `sims/`, `references/`, `audit_status`. CSV line endings (CRLF) and YAML line endings (LF) unchanged.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F3 | minor | applied (option a, measured) | Source: abstract p.1 "Experimental results demonstrate a modulation bandwidth of 29 GHz"; Fig. 4c (p.8) is a noisy measured trace, SR 1 crossing -3 dB near 30 GHz, caption "f3dB = 29 GHz"; Fig. 2e (p.5) marks "29 GHz (VNA)"; p.6 "Experimental validation was performed using a VNA" on (W 0.55, L 100). Convention (h): the paper does not call this value estimated. Contradiction kept visible: Methods p.11 VNA 100 kHz-7.5 GHz, PD 12 GHz. `devices.csv` kari2025-a `bw_basis` author_estimate -> measured; `notes` sentence "Basis author_estimate: Fig. 2e ... closely align, but" -> "Basis measured: the abstract calls 29 GHz experimental, Fig. 4c plots a measured trace and Fig. 2e marks it "29 GHz (VNA)" beside Q-calculated curves; however" (rest of the caveat unchanged). Evidence `bw3db_ghz`: basis author_estimate -> measured; locator + "; p.1 abstract"; note -> "Presented as experimental (abstract, Fig. 4c, Fig. 2e VNA marker), but Methods give a 7.5 GHz VNA and 12 GHz photodetector; equals Q-limited estimate". `papers.csv` kari2025 `notes`: the "Entered with basis author_estimate for kari2025-a ..." sentence now says basis measured with the conflict kept. Value 29 unchanged. |
| R2-F5 | minor | applied | Source: text.md p.12-19 hold "Supplement 1" (theory 1.1-1.4, 120 fF capacitance p.16, drive-power limits); no Vpi, EO bandwidth or tuning slope. `papers.csv` holzgrafe2020 `notes`: "Supplement Section 1-5 not in the cached file." -> "Supplement 1 (pp.12-19 of the cached arXiv v2) read; no modulator column applies." |
| R2-F8 | minor | applied-adjusted | Source: p.9 "At 0 V, the resonant wavelengths of the two rings are 1561.33 nm and 1561.39 nm"; Fig. 4(c) (p.10) 0 V ring-pair dip at about 1561.36 nm. Adjustment: basis extracted_from_figure (the audit proposed measured; 1561.36 is not stated in the text, it is read from the plot), locator "p.10 Fig. 4(c); p.9". `devices.csv` hou2024-a `wavelength_nm` `` -> 1561.36; `qualifiers` `` -> `wavelength_nm:approx`; `notes` "...(p.9); wavelength_nm left empty." -> "...(p.9); wavelength_nm is the 0 V ring-pair dip read from Fig. 4(c)." New evidence entry with note "0 V ring-pair dip; single-ring resonances 1561.33 and 1561.39 nm stated (p.9)". |
| R2-F9 (hou2024 part) | metadata | deferred | Open user decision (coordinator note): hou2024 authors/orgs follow Crossref (6 authors) while the cached arXiv v2 p.1 lists Songyan Hou only. `papers.csv` hou2024 and organizations rows unchanged. |
| R2-F10 | minor | applied | Source: p.4 "fabricated at Luxtelligence using their open-source process design kit (PDK)27"; ref. 27 "lnoi400" on p.13. `papers.csv` kari2025 `process_name`: "Luxtelligence lnoi400 open-source PDK (named p.4)" -> "Luxtelligence lnoi400 open-source PDK (PDK p.4; name lnoi400 from ref. 27, p.13)". |

## Counts

- Findings for this batch: 5 (R2-F9 shared with p3_11)
- applied: 3 (F3, F5, F10)
- applied-adjusted: 1 (F8)
- rejected: 0
- deferred: 1 (F9 hou2024 part)

## Changed numerical or blocking cells

| Paper | device_id | Column | Old -> new | Source locator |
|---|---|---|---|---|
| kari2025 | kari2025-a | bw_basis (and evidence bw3db_ghz basis) | author_estimate -> measured | p.1 abstract; p.8 Fig. 4c; p.5 Fig. 2e; conflict p.11 Methods |
| hou2024 | hou2024-a | wavelength_nm | (empty) -> 1561.36 | p.10 Fig. 4(c); p.9 |
| hou2024 | hou2024-a | qualifiers | (empty) -> wavelength_nm:approx | p.10 Fig. 4(c) |

## Sim config follow-ups

- None: kari2025, hou2024 and holzgrafe2020 have no sim config.

## Deferred items needing decisions

- R2-F9 (user decision): one author-list rule for hou2024 and gao2024 (cached source vs Crossref).
