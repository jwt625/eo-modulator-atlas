# Audit dispositions: p4_03

- Audit: `data/_staging/audits/p4_03-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Files touched: `data/_staging/p4_03/{papers.csv,devices.csv,evidence/*.yaml,BATCH_REPORT.md}`, `sims/cai2025/config.yaml`, `sims/sayem2026c/config.yaml` (provenance note only). `audit_status` stays needs_audit. Dry-run merge after changes: 0 conflicts, 0 validation errors.
- Every finding was re-checked against the figure renders (powell2024 p.3 Fig. 1(b); sayem2026c p.2 Fig. 1 and p.4 Fig. 3(d); zheng2026 img_p09_1 Fig. 4(h)) and the text of the paper.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | numerical | applied | devices.csv zheng2026-al1000 `bw_basis` measured -> author_estimate; evidence `bw3db_ghz` basis measured -> author_estimate, note replaced by "paper: 70 GHz+ (expects about 90 GHz); Fig. 4(h) ripple dips reach about -3.2 to -3.7 dB near 42 GHz"; row notes appended with the ripple-dip sentence. Value 70 (gt) unchanged. Dips confirmed in all four traces near 42 GHz. |
| F2 | metadata | applied | devices.csv powell2024-a `drive` unspecified -> push_pull, `vpi_convention` unspecified -> mzm_push_pull; evidence entries same values, basis derived, locator "p.3 Fig. 1(b); p.1 Sec. II", notes "authors do not state it; ...". Fig. 1(b) shows GSG with one waveguide in each gap on x-cut LT (convention (f)), as the coordinator condition required. |
| F3 | metadata | applied | devices.csv sayem2026c-a..d `drive` unspecified -> push_pull, `vpi_convention` unspecified -> mzm_push_pull; evidence entries same values, basis derived, locator "p.2 Fig. 1(a),(b)", note "authors do not state it; GSG with one rib in each gap; crystal cut not stated". Fig. 1(b) middle panel shows one rib in each gap. papers.csv sayem2026c notes and BATCH_REPORT updated; sims/sayem2026c line.differential provenance note reworded (no value change). |
| F4 | metadata | applied-adjusted | No DOI/venue/year/license change (no network; deferred per coordinator). papers.csv powell2024 notes: the sentence "A later APL Photonics ... not read" replaced by a statement that the cached arXiv v1 text is the AIP-format manuscript of the APL Photonics 10(9) 2025 article (Author Declarations and Data Availability, p.4; sayem2026c ref. 21), that the numbers come from this text, that the DOI shown is the related CLEO 2024 abstract, and that DOI, venue, year and license are to be replaced after a Crossref prefetch. BATCH_REPORT powell2024 judgment calls updated. |
| F5 | minor | applied | devices.csv sayem2026c-a `vpi_basis` extracted_from_figure -> measured (headline 2.4 V is measured; evidence basis already measured). |
| F6 | minor | applied | devices.csv sayem2026c-a notes appended: "Fig. 3(d) response peaks near +1.2 dB at about 15 GHz; the 2 dB roll-off is relative to the 0 dB normalisation." Peak and end values confirmed in the render. No value change. |
| F7 | minor | applied | devices.csv zheng2026-al1000 `bw_measured_to_ghz` 70 -> 67 (qualifier approx kept); evidence value 67, basis extracted_from_figure, note "last data point of Fig. 4(h); axis frame ends near 70 GHz". Traces end near 67 GHz (x-position read). bw3db_ghz 70 gt kept (paper bound, convention (c)). |
| F8 | minor | applied | evidence cai2025-b `electrode_gap_um`, `signal_width_um`, `electrode_thickness_um` basis measured -> derived, note "stated for the 6.8 mm MZM; IQ device described as MZMs such as Fig. 2(a)"; row notes appended "Band inferred from the IMDD setup." Text confirms p.6 "two 13.5 mm-long MZMs, such as the one shown in Fig. 2(a)" and the C-band ECL only in the IMDD setup. Cell values unchanged. |
| F9a | minor | applied | sims/cai2025/config.yaml `provenance.line.source_ohm` class paper_exact -> project_inference, note "50 ohm source assumed (AWG/VNA); the paper states only the load"; `line.load_ohm` locator extended with the termination sentence (class unchanged). |
| F9b | minor | applied-adjusted | sims/cai2025/config.yaml: `materials.lithium_tantalate.r_pm_per_v: {r33: 30.0}` and its provenance entry removed; header comment and `missing` bullet reworded (Pockels tensor not stated; r33 about 30 pm/V is a secondary citation via powell2024). Option "cite Casson directly" not possible: the source is not cached and no network. Matches sims/sayem2026c. |
| F10 | minor | applied | devices.csv rahman2025-3 `er_type` unspecified -> static (judgment call: ER from the 1 kHz quasi-static voltage sweep, Fig. 3(d); same treatment as powell2024-a). er_type has no evidence entry. |

## Counts

- applied: 9 (F1, F2, F3, F5, F6, F7, F8, F9a, F10)
- applied-adjusted: 2 (F4, F9b)
- rejected: 0
- deferred: 1 part of F4 (DOI/venue/year/license change, awaits a Crossref prefetch of the APL Photonics article)

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | source locator |
|---|---|---|---|
| zheng2026-al1000 | bw_measured_to_ghz | 70 -> 67 | p.9 Fig. 4(h) (img_p09_1), last data point |
| zheng2026-al1000 | bw3db_ghz basis (evidence) and bw_basis | measured -> author_estimate (value 70 gt unchanged) | p.1 abstract; p.10 Sec. V; Fig. 4(h) |
| powell2024-a | drive | unspecified -> push_pull | p.3 Fig. 1(b); p.1 Sec. II |
| powell2024-a | vpi_convention | unspecified -> mzm_push_pull | p.3 Fig. 1(b); p.1 Sec. II |
| sayem2026c-a, -b, -c, -d | drive | unspecified -> push_pull | p.2 Fig. 1(a),(b) |
| sayem2026c-a, -b, -c, -d | vpi_convention | unspecified -> mzm_push_pull | p.2 Fig. 1(a),(b) |
| sayem2026c-a | vpi_basis | extracted_from_figure -> measured | p.1 abstract; p.2 Fig. 1(f) |
| rahman2025-3 | er_type | unspecified -> static | p.5 Fig. 3(d) |
| cai2025-b | electrode_gap_um, signal_width_um, electrode_thickness_um (evidence basis) | measured -> derived (values 6, 23, 0.8 unchanged) | p.3 Sec. II; Fig. 2(c) inset; p.6 |

## Deferred items needing decisions

- powell2024 identity: replace `doi`, `venue`, `year`, `license` once a Crossref record for the APL Photonics 10(9) 2025 article is prefetched (coordinator action; notes already state which version the numbers come from).
- Optional: cite Casson et al. (J. Opt. Soc. Am. B 21, 1948 (2004)) directly for LiTaO3 r33 in sims/cai2025 after the source is cached; currently omitted.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p4_03-verify-claude-audit-2026-10-04.md`: 14 of 15 confirmed. F6 not confirmed: coordinator re-read Fig. 3(d) (p.4 render, 8.8 px/GHz): blue trace peaks near +1.2 dB at about 11 GHz, first point about -1.8 dB at 4 GHz; sayem2026c-a row note corrected. N1 applied: zheng2026-g4 vpi_dc_v locator -> Fig. 4(f), notes record raw Fig. 4(d),(e) traces suggesting about 5.5-6 V against the stated about 4 V (value kept). N2 applied: sayem2026c-a row note records Fig. 2(b) nulls implying VpiL 9-18% above Fig. 2(c) (values kept). No value changed.
