# Audit dispositions: p4_04 (wang2024a, wang2024b, wang2025)

- Audit: `data/_staging/audits/p4_04-q1-claude-audit-2026-10-04.md`
- Date: 2026-10-04
- Each finding was re-checked against `references/<paper_id>/text.md` and the page renders (Fig. 2(c) of wang2024a, Fig. 3(f) of wang2024b, Fig. 1 and Fig. 4(c) of wang2025 viewed at zoom).
- `audit_status` stays needs_audit. No file outside `data/_staging/p4_04/` and `sims/wang2024a|wang2025/` was edited.
- Files: P = `data/_staging/p4_04/papers.csv`, D = `data/_staging/p4_04/devices.csv`, EA/EB/EC = `data/_staging/p4_04/evidence/wang2024a|wang2024b|wang2025.yaml`, CA/CC = `sims/wang2024a/config.yaml` / `sims/wang2025/config.yaml`, R = `data/_staging/p4_04/BATCH_REPORT.md`.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | numerical | applied-adjusted | Fig. 2(c) re-read: abstract/p.2 "measured electro-optic 3 dB bandwidth of approximately 110 GHz" and p.4 "roll-off around 3 dB from 10 MHz to 110 GHz" make 110 GHz the authors' stated 3 dB bandwidth, so value 110, approx, basis measured are kept. Measured trace first dips below -3 dB near 90 GHz (about -3.1), again near 96 and 105 GHz, ends near -3.3 dB at 110 GHz; dashed simulated (EE-derived) curve crosses -3 dB near 110 GHz. Adjusted: the note keeps the authors' wording and states the 90 GHz dip and the simulated crossing as an approximate reading. EA wang2024a-a bw3db_ghz note: "authors: roll-off around 3 dB from 10 MHz to 110 GHz; trace ends near -3.3 dB" -> "authors: approximately 110 GHz; measured trace first below -3 dB near 90 GHz; EE-derived simulated curve crosses near 110 (approx. reading)". P wang2024a notes: "claimed crossing at the measurement limit (trace ends near -3.3 dB)" -> stated-bandwidth sentence with the 90 GHz dip, -3.3 dB end and simulated crossing. D wang2024a-a notes: appended "Measured S21 first dips below -3 dB near 90 GHz (Fig. 2(c), approx. reading); 110 GHz matches the EE-derived simulated curve." CA bw3db target note: appended the same sentence after "authors' stated approximate 110 GHz, claimed crossing at the measurement limit; referenced to 10 MHz". R: judgment-call sentence updated. Values, qualifier, bw_basis, bw_measured_to_ghz unchanged. |
| F1-opt | numerical (optional) | rejected | Optional eo_rolloff_db 3.2 at 110 GHz not added: the trace end reads -3.2 to -3.3 dB within trace noise, and the single-point convention (g) would pin a figure-read value the authors do not state. The end value stays in notes only. |
| F2 | minor | applied-adjusted | Fig. 3(f) re-read: trace touches -3 dB near 33-35 GHz (not a single point at 34.5), recovers to about -1.7 dB near 37, crosses near 40-41 and is below -3 dB from about 43 GHz, ends near -3.2 dB at 50 GHz. Value 41, approx, extracted_from_figure kept. EB wang2024b-a bw3db_ghz note: "paper says more than 40 GHz; trace read crossing -3 dB near 41 GHz" -> "paper: more than 40 GHz (abstract: up to 40); trace touches -3 dB near 33-35 GHz, crosses near 41, below from about 43". P wang2024b and D wang2024b-a notes: "crosses -3 dB near 41 GHz" -> touch near 33-35, recovery near 37, crossing near 41, below from about 43 (approx. reading). R: judgment-call sentence updated. |
| F3 | minor | applied-adjusted | Fig. 4(c) re-read: 35 dBm trace first reaches -3 dB near 50 GHz (about -4.3 at 50.5), 0 dBm trace near 51-52; between 50 and 63 GHz both traces oscillate about -3 dB (up to about -2.2, minima about -4.5 near 61 GHz), recover to about -1.7 near 66 GHz, end near -3 at 67 GHz. The audit's "mostly below to 63 GHz" overstates the 50-57 GHz span, so the wording is "oscillate about -3 dB to 63 GHz". Value 55, approx, measured kept. EC wang2025-a bw3db_ghz note: "authors: around 55 GHz; first -3 dB touch near 51 GHz; conclusion says exceeding 55" -> "authors: around 55 GHz (conclusion: exceeding 55); traces first reach -3 dB near 50-51 GHz, oscillate about -3 dB to 63 GHz". P wang2025 notes and D wang2025-a notes: same statement added (replacing "first touch of -3 dB near 51 GHz" in P). R updated. |
| F4 | minor | applied | p.3: "35 dBm optical input power (equivalent to -7 dBm and 28 dBm within the modulator)", with 6 dB per grating coupler (p.2) and a 1 dB front-end loss (p.4). The 28 dBm is the authors' deduction. EC wang2025-a optical_power_handling_dbm basis: measured -> derived; note: "stable up to 28 dBm in the waveguide; limited by source, so a lower bound" -> "35 dBm fiber input minus 6 dB grating coupler and 1 dB front-end loss (authors); source-limited lower bound". Value 28 and qualifier gt unchanged. D wang2025-a notes and R: added "28 dBm is author-deduced". |
| F5 | metadata | applied | Cached PDF has lettered pages A-E, "ACS Photonics XXXX, XXX, XXX-XXX" footer and no volume. P wang2025 notes: "Numbers from the ACS Photonics article PDF (received 2025-01-18, ..." -> "Numbers from the ACS Photonics ASAP PDF (lettered pages A-E, no volume or pages; venue and pages from Crossref; issue version not read; received 2025-01-18, ...". R wang2025 Source line updated to match. |
| F6a | minor | applied | CC targets: removed `rf_loss_db_per_cm` at_ghz 67 value 1.588 (project arithmetic 0.194 x sqrt(67) on a simulated alpha0; at_ghz targets are not evaluated). |
| F6b | minor | applied-adjusted | CC target vpi_l_dc_vcm 2.67 note: "authors state the measured V_pi L equivalent for propagation exactly along Y; no derivation shown" -> "authors state 2.67 V cm for propagation exactly along Y (p.3); equals their measured 3.22 V cm x the 0.83 orientation factor (p.2); derivation not shown by the authors". Adjusted: 3.22 x 0.83 = 2.67 is arithmetic by the project; the paper states the 0.83 factor (p.2) and the 2.67 value (p.3) but not the link, and the note says so. |
| F6c | minor | applied-adjusted | The 50 ohm statement is not on p.3 text. CC provenance line.source_ohm locator: "p.3 text (EE measurement, 50 ohm system); p.5 Methods (probes, 50 ohm termination)" -> "p.4 Fig. 3(h) caption (source/load impedance 50 ohm); p.3 Fig. 2 caption (simulation); p.5 Methods (off-chip 50 ohm termination)"; note -> "captions state source/load impedance 50 ohm; RF amplifier output impedance not stated". Adjusted: the audit named the Fig. 2(c) caption; the Fig. 2 caption (p.3) refers to the simulated Zc, so it is cited as simulation, with the measured-device statement from the Fig. 3(h) caption (p.4, not p.3). |
| F6d | minor | applied | Fig. 1(c) viewed: schematic is not to scale and draws the central Si pillar as wide as Ws. CC provenance geometry.regions.hole_r and hole_l: class figure_digitized -> project_inference; notes extended with "Fig. 1(c) also draws the pillar as wide as Ws; centring under the waveguide chosen". |
| F6e | minor (optional) | applied | CC targets: added `{metric: bw3db_ghz, value: 55, tol_rel: 0.15, source: {device_id: wang2025-a, field: bw3db_ghz, comparable: false, note: <F3 wording; not an engine-evaluated crossing>}}`. Value is the authors' stated 55 GHz, equal to the evidence entry. |
| F7a | minor | applied | CA target ng_opt 2.25 and CC target ng_opt 2.19: source gains `basis: simulated, note: "paper's own simulated group index"` (matches the simulated evidence basis). |
| F7b | minor | applied | CA provenance line.load_ohm: note added "termination stated for the data-transmission setup; S21 measurement setup not described". Class paper_exact and locator unchanged. |
| F8 | minor | applied | p.5 "2.5 um on each side" confirmed. D wang2024b-a and wang2024b-b notes: appended "Waveguide sidewall to electrode 2.5 um each side (p.5); electrode_gap not entered." electrode_gap_um stays empty. |
| F9a | metadata | deferred (coordinator) | `references/wang2024a/source.json` and the `text.md` header carry `license: CC-BY-4.0` (batch-CSV hint). `references/` is tracked metadata outside this task's write scope. Staged papers.csv already records the Crossref-based license and restricted_local_only. Coordinator follow-up: correct or annotate the cache license as "unverified (arXiv v2; journal VOR Optica OA License v2 per Crossref)". |
| F9b | metadata | deferred (coordinator) | Duplicate org "Shanghai Institute of Microsystem and Information Technology, Chinese Academy of Sciences": no action in p4_04, per the coordinator, who de-duplicates at merge (staged in p4_03 and p4_04 only, not p3_06). |

## Counts

- Findings addressed: 16 rows (F1 .. F9b, with F1-opt, F6a-e, F7a-b and F9a-b split).
- applied: 8 (F4, F5, F6a, F6d, F6e, F7a, F7b, F8)
- applied-adjusted: 5 (F1, F2, F3, F6b, F6c)
- rejected: 1 (F1-opt)
- deferred: 2 (F9a, F9b; both coordinator actions)

## Changed numerical or blocking cells (for the independent verifier)

No CSV numeric value changed and no blocking cell existed. Cells touched in value-bearing records:

| device_id / target | column | old -> new | source locator |
|---|---|---|---|
| wang2025-a | optical_power_handling_dbm (evidence basis) | measured -> derived (value 28, qualifier gt unchanged) | p.3 text; p.2 (6 dB grating coupler); p.4 (1 dB front-end loss); Fig. 4(a),(b) captions |
| wang2024a-a | bw3db_ghz (evidence note, P/D notes, CA target note) | value 110 approx basis measured unchanged; note now records first -3 dB dip near 90 GHz and simulated crossing near 110 GHz | p.1 abstract; p.2 text; p.4 text; Fig. 2(c) |
| wang2024b-a | bw3db_ghz (evidence note, P/D notes) | value 41 approx basis extracted_from_figure unchanged; note adds touch near 33-35 GHz and below -3 dB from about 43 GHz | p.5 text; Fig. 3(f) |
| wang2025-a | bw3db_ghz (evidence note, P/D notes) | value 55 approx basis measured unchanged; note adds first -3 dB near 50-51 GHz and oscillation to 63 GHz | p.3 text; p.5 Conclusions; Fig. 4(c) |
| wang2025 config | targets rf_loss_db_per_cm at_ghz 67 | 1.588 -> removed | project arithmetic, not paper-reported |
| wang2025 config | targets bw3db_ghz | absent -> 55 (comparable false) | p.3 text; Fig. 4(c) |
| wang2025 config | provenance hole_r, hole_l | figure_digitized -> project_inference | Fig. 1(c) (schematic, not to scale) |

## Deferred items needing decisions

- F9a: coordinator to correct or annotate `license` in `references/wang2024a/source.json` and the `text.md` header.
- F9b: coordinator to de-duplicate the SIMIT organization row at merge (p4_03 and p4_04).

## Validation

`uv run python scripts/merge_staging.py data/_staging/p4_04` (dry run): papers 3, devices 5, orgs 1, evidence 3; conflicts 0; validation errors 0.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p4_04-verify-claude-audit-2026-10-04.md`: 21 of 21 confirmed; wang2024a 110 GHz approx measured confirmed under convention (c) (claimed crossing at the instrument limit). N1 applied (convention c, coordinator decision between conflicting auditor/verifier readings): wang2024b-a bw3db_ghz 41 approx extracted_from_figure -> 40 gt measured (p.5 "more than 40 GHz"), bw_measured_to_ghz 50 unchanged, evidence and row notes updated. N2 applied: wang2025-a optical_power_handling_dbm locator -> p.2 (6 dB per grating coupler) and p.3 (28 dBm equivalent, 1 dB front-end loss); the 1 dB loss is on p.3, not p.4 as written above. N3a/N3b wording: not applied (optional).
