# Audit dispositions round 2: p3_05 (li2025b, montifiore2026, steckler2025)

Audit: `data/_staging/audits/p3_05-p3_07-r2-claude-audit-2026-10-03.md`. Papers: li2025b, montifiore2026, steckler2025. Date: 2026-10-04. Each finding re-checked against `references/<id>/text.md` and page renders before acting; edits made in the canonical tables and evidence files.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| R2-F2 | metadata | applied | Confirmed p.8 App. A step (f) "A 45/15/400 nm AuGe/Ni/Au metal layer is then deposited by electron-beam evaporation", p.3 "annealed AuGe/Ni/Au metal stack"; 45+15+400 = 460 nm = t_elec (Fig. 1 caption). `data/devices.csv` li2025b-a, li2025b-b `electrode_metal` '' -> 'AuGe/Ni/Au (45/15/400 nm)'. `data/evidence/li2025b.yaml`: new electrode_metal entries for a and b (basis design_target, locator "p.8 App. A step (f); p.3 Sec. II"); electrode_thickness_um notes "electrode metal not stated separately" -> "equals the 45/15/400 nm AuGe/Ni/Au stack sum (App. A step (f))". `data/papers.csv` li2025b notes "fabricated sidewall angle and top-electrode metal are not stated" -> "the fabricated sidewall angle is not stated and the paper describes one AuGe/Ni/Au metallization (App. A) without a separate top-electrode stack". Rows c, d not changed (their cross-section is not restated; electrode_thickness also empty there). |
| R2-F3 | metadata | deferred | steckler2025-a/-b `band` c_band at 1580 nm. `data/schema/devices.schema.yaml` defines only the `band` enum, no band edges in nm; per coordinator instruction, deferred until the schema states edges. |
| R2-F4 | metadata | deferred | li2025b `published_on` (empty) vs geravand2025 (arXiv stamp 2024-12-23). Open user decision on the `published_on` rule for arXiv copies (round-1 F26); no change. |
| R2-F7 | minor | applied | Confirmed p.5 "We extract the two Vpi to be, respectively 86 V ... and 93 V"; Fig. 4 DC sweep spans 0-32 V (p.5 text), so a direct half-wave read-out is impossible. `data/devices.csv` li2025b-c, li2025b-d `vpi_basis` measured -> derived; `data/evidence/li2025b.yaml` vpi_dc_v entries for c and d basis measured -> derived, note -> "extracted value (86 V device (i), 93 V device (ii)); method not stated, direct read-out excluded by the 0-32 V sweep (Fig. 4)". Values unchanged. |
| R2-F9 | minor | applied | p.4: "the large area of the PZT actuator leads to a relatively high capacitance on the PZT of 19nF"; no measurement stated. `data/evidence/montifiore2026.yaml` montifiore2026-a capacitance_ff basis measured -> author_estimate, note -> "19 nF stated PZT actuator capacitance; measurement method not given". Cell unchanged (19000000 fF). |

Counts: applied 3, applied-adjusted 0, rejected 0, deferred 2.

## Changed numerical or blocking cells

- li2025b, li2025b-a, electrode_metal, '' -> 'AuGe/Ni/Au (45/15/400 nm)', p.8 App. A step (f); p.3 Sec. II
- li2025b, li2025b-b, electrode_metal, '' -> 'AuGe/Ni/Au (45/15/400 nm)', p.8 App. A step (f); p.3 Sec. II
- li2025b, li2025b-c, vpi_basis, measured -> derived, p.5 Sec. III
- li2025b, li2025b-d, vpi_basis, measured -> derived, p.5 Sec. III
- montifiore2026, montifiore2026-a, capacitance_ff evidence basis, measured -> author_estimate (value 19000000 unchanged), p.4 Sec. 2

## Sim config follow-ups

None (no `sims/<id>/config.yaml` for these papers).

## Deferred items needing decisions

- R2-F3 (schema): define `band` edges in nm in `data/schema/devices.schema.yaml` (e.g. whether 1565-1625 nm is l_band and how mixed-wavelength rows map to cl_band); then re-map steckler2025-a (1555-1580 nm data), steckler2025-b (1575-1580 nm) and gupta2023-e (1570 nm, see p3_06).
- R2-F4 (user): `published_on` for arXiv copies. Either set li2025b `published_on` = 2025-04-15 (arXiv v1 stamp in the cached file) or empty geravand2025 `published_on` (see p3_06).
