# p6_04 verification (claude, 2026-10-05)

Batch: `data/_staging/p6_04/` (singer2025, horst2025, hillier2025; all NEW, no `--replace-paper-ids`).
Inputs: audit `data/_staging/audits/p6_04-claude-audit-2026-10-05.md`, `data/_staging/p6_04/AUDIT_DISPOSITIONS.md`, `CORRECT_PROMPT.md`, staged files, sources.
Method: fresh context, read-only (no network, no git). Field-level diff of the staged files against the corrector's pre-correction copy (a local scratch directory (not tracked), read only). CSV vs evidence value check on all 116 evidence entries (0 mismatches). Source passages re-read for every changed value. Figures opened: hillier2025 `img_p06_2.png` (Fig. 2(a)/(b)), `img_p06_3.png` (Fig. 2(c)/(d)), `img_p10_2.png` and `page_10.png` (Fig. 5(a)); horst2025 `img_p02_2.png` (Fig. 1(b)/(c)).

Result: 14 of 14 findings confirmed, 0 not confirmed. 0 unrecorded changes. 0 blocking, 0 numerical and 0 metadata new issues; 3 informational (I1-I3).

## Per finding

| id | disposition | verdict | evidence |
|---|---|---|---|
| N1 | applied | confirmed | p.7 (text.md): "The extracted EE bandwidth, BWEE, of 80 ± 8 GHz for a 1 mm long MZM"; p.8 Fig. 3 caption: "(a) Port-1 to port-2 transmitted electrical power, S21,EE(ν) (dB) ... horizontal line at 6 dB". This is an electrical line response, so it does not belong in an EO bandwidth field. Diff: 1mm-ee bw6db_ghz, bw_method, bw3db_reference, bw_measured_to_ghz and bw_basis are all empty. The bw6db_ghz and bw_measured_to_ghz evidence entries are deleted. The label is now "zero-bias RF line characterization (electrical S21, Z0)". z0_ohm 50 (approx) and its evidence entry are kept. The notes carry 80 +/- 8 GHz, zero bias, VNA 1.7-110 GHz and data above about 80 GHz excluded (p.6-p.7 text). The papers.csv note is reworded to match. |
| N2 | applied | confirmed | p.6: "Vπ were 11.9 V and 7 V (VπL = 1.3 ± 0.1 Vcm)". Fig. 2(d) (img_p06_3) plots squares at about 1.40 (3.6 V), 1.19 (6 V), 0.80 (9 V), 0.56 (12.5 V) and 0.31 (13.4 V). These equal Vpi x L for every row (11.9 x 0.1, 7.0 x 0.2, 4.0 x 0.2, 2.8 x 0.2, 3.1 x 0.1), so 1.3 is the two-device mean. Diff: vpil_dc_vcm is empty on both Q1 rows and both evidence entries are deleted. The notes state the joint 1.3 +/- 0.1 (not entered) and the per-row 1.19 and 1.40. |
| N3 | applied | confirmed | p.10: "crossing the 25 % overhead HD-FEC threshold [52] between 192 GBd and 200 GBd. For PAM-4, the BER remained under the HD-FEC threshold up to 160 GBd." In Fig. 5(a) the x axis is Bit Rate (Gbit/s), so OOK Gbit/s = GBd. The 2 mm OOK squares are at about 160 (1.6e-6), 176 (4e-4), 192 (1.1e-2, below the dashed line) and 200 (3e-2, above). Convention (d) puts the extreme over formats in max_*. Diff: max_baud_gbd 160 -> 192 in both the CSV and the evidence (locator "p.10 text; Fig. 5(a)", basis measured). max_line_rate 320 and max_net_rate 256 are unchanged. |
| N4 | applied | confirmed | p.2: "group index of the waveguide (≈5 vs 3.7) [25]"; p.8 Fig. 3 caption: "horizontal line at 3.7 indicates the effective optical index"; p.11: "optical effective group index of 3.7" (model input). Diff: ng_opt is empty on 1mm-ee and its evidence entry is deleted; the value is in the notes. The design row keeps ng_opt 3.7 (design_target). |
| M1 | applied | confirmed | The three name_source URLs are gone and ror_id is empty. The papers do not print them. crossref.json carries only the names: hillier2025 has "SMART Photonics" and "University College London", singer2025 has "MultiLane Inc.", none with a ROR id. Eindhoven ROR 02c2kyt77 appears 7 times in `references/hillier2025/crossref.json`, so ror_id and name_source are kept. Name, type, country and region are unchanged. |
| M2 | applied | confirmed | singer2025 license is now `Optica-OA-License-v2`. The crossref licence URL is `https://doi.org/10.1364/OA_License_v2#VOR-OA`. redistribution stays restricted_local_only, as rule (1) requires. The provenance (URL and p.1 notice) has moved to the papers.csv notes. |
| M3 | applied | confirmed | The papers.csv hillier2025 note now reads "ER at 1 mm Q2 (17.0 text vs 15.4 Fig. 2(a))". img_p06_2 confirms that the 1 mm Q2 label "ER = 15.4" is in panel (a). The "(Vpi, ER; VpiL from the build)" and EE phrases were reworded consistently with N1/N2. |
| m1 | applied | confirmed | Fig. 2(c) (img_p06_3) shows ER about 20 at about 3.6 V and about 16 at 6 V. The labels are 1 mm Q1 20.1 at 6 V and 2 mm Q1 16.1 at about 3.6 V (img_p06_2), so the Q1 values appear swapped. In Fig. 2(d) the points sit at the labelled biases. The Fig. 2(a) trace runs from about -4.3 to about -24.4 dBm, which supports 20.1. The 1mm-q1 note records the discrepancy and the 2mm-q1 note records the Fig. 2(d) point at about 3.6 V. The bias cell stays empty. |
| m2 | applied | confirmed | Fig. 5(a), 1 mm circles: PAM-4 at 288 Gbit/s is about 1.1e-2 (below the line) and at 320 Gbit/s about 2.5e-2 (above). OOK at 192 Gbit/s is about 1.5e-2, just below. The 2mm-data note now states these reads, and the wrong "about the threshold" wording is gone. No 1 mm data row was added. |
| m3 | applied | confirmed | p.5: "The insertion losses for the full 1 mm device were estimated to be 9.1 ± 0.8 dB". This sentence precedes the "optimized devices" sentence and names no geometry. The caveat is in both the CSV note and the evidence note. il_onchip_db 9.1, author_estimate and device_total are unchanged. |
| m4 | applied | confirmed | p.11 Sec. 3.3 describes the result as an equivalent-circuit model optimization, not a VNA/LCA response (convention (t)). Diff: hillier2025-design bw_method eo_s21 -> indirect, and the note says so. bw_basis simulated, row_kind design and bw3db_reference dc are unchanged. |
| m5 | adjusted | confirmed | p.10: "no bit errors were detected up to 160 GBd. However, bit errors appeared at 160 GBd". modulation_format (CSV = evidence) reads "OOK below the 25 % OH HD-FEC threshold to 192 GBd (no bit errors detected below 160 GBd; threshold crossed between 192 and 200 GBd); PAM4 below the threshold to 160 GBd (320 Gbit/s line rate); ...". "Error-free to 160 GBd" is gone. The wording fits the source, since the 160 GBd point has about 1.6e-6 BER in Fig. 5(a). |
| m6 | applied | confirmed | In Fig. 1(c) (img_p02_2) the Device 2 (blue) trace starts at about 490-500 GHz. Fig. 1(b) shows only Device 1 (orange, 10 MHz-100 GHz). p.2 states no normalization frequency. Diff: d2 bw3db_reference low_freq_unstated -> unspecified, and the note explains why. d1 is unchanged. No evidence entry carries the reference (the horst2025.yaml diff is empty). |
| m7 | applied | confirmed | p.6 (text.md line 296-297) and p.8 (line 399-400): "the optical on-chip excess loss is 4.2 dB". p.16: "approximately 3.3 dB per PWB"; Table 2 is on p.17. The row note and the il_onchip_db evidence note are reworded as recommended. Value 4.2, basis derived and scope device_total are unchanged. |

Rulings 1-4 of the audit (no-fix items) are left unchanged in the staged files: horst2025-pm is its own row with scope undefined; the hillier2025 2 mm Q1 bias, 1 mm Q2 ER, 2 mm Q1 ER and data-run bias cells are still empty; the per-quadrature split is kept.

## Unrecorded changes

None. Every field changed relative to the pre-correction copy maps to a recorded disposition:
- papers.csv: hillier2025.notes (N1, N2, M3), singer2025.license and singer2025.notes (M2).
- devices.csv:
  - hillier2025-1mm-ee: label, 5 bw fields, ng_opt, notes (N1, N4).
  - hillier2025-1mm-q1: vpil_dc_vcm, notes (N2, m1, m3).
  - hillier2025-2mm-q1: vpil_dc_vcm, notes (N2, m1).
  - hillier2025-2mm-data: max_baud_gbd, modulation_format, notes (N3, m5, m2).
  - hillier2025-design: bw_method, notes (m4).
  - horst2025-d2: bw3db_reference, notes (m6).
  - singer2025-a: notes (m7).
- organizations.csv: 3 name_source cleared (M1).
- evidence:
  - hillier2025.yaml: 5 entries deleted (2x vpil, bw6db, bw_measured_to, ng_opt); max_baud value and note; modulation_format value; il note.
  - singer2025.yaml: il note.
  - horst2025.yaml: unchanged.

No rows were added or removed, and the column order is unchanged.

## Coordinator rules

1. Licence tokens are bare: singer2025 `Optica-OA-License-v2` -> restricted_local_only; horst2025 and hillier2025 `CC-BY-4.0` (crossref `creativecommons.org/licenses/by/4.0/`) -> open_license_ok. Correct.
2. No unverified name_source or ror_id: only Eindhoven University of Technology carries ROR 02c2kyt77 (present in crossref.json). Correct.
3. standard_reference constants: not applicable. No sim configs were written (no `sims/singer2025`, `sims/horst2025` or `sims/hillier2025`), and none are needed (SOH, plasmonic, InP).
4. discovered_via: not applicable to canonical rows (all three papers are NEW; none is in `data/papers.csv`). The staged values use existing tokens (drive_doc, tmp_eo_md, local_corpus).

## New issues

| id | severity | where | issue | suggestion |
|---|---|---|---|---|
| I1 | info | `data/_staging/p6_04/BATCH_REPORT.md` | Not updated after correction. It still says bw6db 80 is entered on 1mm-ee, VpiL 1.3 on both Q1 rows, OOK "error-free", and that the name_source URLs were entered. AUDIT_DISPOSITIONS.md supersedes it, and the brief does not require an update. | Optional: add one line pointing to AUDIT_DISPOSITIONS.md. |
| I2 | info | hillier2025-1mm-ee notes | "(absolute transmitted electrical power, Fig. 3(a), p.7)" can be read as Fig. 3(a) being on p.7. The BWEE statement is on p.7 but Fig. 3 is on p.8. | Optional: "p.7 text; Fig. 3(a) p.8". |
| I3 | info | outside this batch: `data/papers.csv` boynton2020 | Canonical (working tree) has `Optica-OA-License-v1` with redistribution `unknown`. Rule (1) maps Optica OA licences to restricted_local_only. xu2022 still carries the parenthetical licence form (the audit already noted this under M2). | Coordinator: apply rule (1) to boynton2020 and xu2022 in a separate pass. |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p6_04` (no `--apply`; merge and validation run in a temp copy of data/):

```
merge counts: {'papers': 3, 'devices': 12, 'orgs': 4, 'evidence': 3}; conflicts: 0; validation errors: 0
dry run (nothing written)
```
