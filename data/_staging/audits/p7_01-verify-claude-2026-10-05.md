# p7_01 verification (claude, 2026-10-05)

Batch: eltes2020 (with Supplementary Information), eltes2023, li2024, kohli2023; all NEW (no id, DOI or evidence file in `data/`), no `--replace-paper-ids`.
Inputs: `data/_staging/audits/p7_01-claude-audit-2026-10-05.md`, `data/_staging/p7_01/AUDIT_DISPOSITIONS.md`, the staged files, `CORRECT_PROMPT.md`, conventions in `data/schema/devices.schema.yaml`, and the sources in `references/<id>/`. The corrector's pre-correction backup (a local scratch directory (not tracked)) was diffed field by field against the staged files. BATCH_REPORT.md is stale by design and not checked.

Result: confirmed 17 / not confirmed 0. Unrecorded changes: none. New issues: 2 minor, 2 informational. Dry run: not run (the permission classifier blocked it twice, see the last section).

## Per finding

| id | disposition | verdict | evidence (re-read) |
|---|---|---|---|
| F1 | applied | confirmed | supplement p.7 "alpha, t = 0.92"; p.8 "(alpha+t)^2/(1+alpha t)^2 = 0.993 = -0.3 dB". Recomputed 3.3856/3.40919 = 0.99308, which is -0.030 dB. On eltes2020-b, il_onchip_db, scope, includes and il_basis are empty. The il evidence entry is removed, and the note gives both readings. |
| F2 | adjusted (coordinator) | confirmed | Fig. S9 (supplement img_p17_1, opened): y-axis "EOE \|S21\| (dB)", dashed line at -6 dB, a dip to about -4.7 dB near 3.5-3.7 GHz, and a cliff from about 0 dB to below -8 dB at 29-31 GHz. Methods p.6: "impossible to measure the bandwidth beyond 30 GHz". On the row, bw3db_ghz is empty and bw6db_ghz = 30 with bw6db_ghz:approx. bw_measured_to_ghz = 30 has a new evidence entry (p.6, Methods). bw_method = link_eoe per the coordinator, also supported by the main-text Fig. 4c caption ("electro-optic-electric (EOE) frequency response"). bw3db_reference low_freq_unstated is kept and covers bw6db per convention (t). The tag is removed. The note marks the setup-limit reading as the curator's. The CSV and evidence values match. |
| F3 | applied | confirmed | kohli2023 p.5 Sec. IV-B, "the resonance of the MZM is shifted due to the phase difference between the two arms ... Vpi,DC = 3.2 V"; p.2, "asymmetry in the path length between the two arms of 200 um". Convention (q) lists the unbalanced MZI under resonance_tuning_derived. The vpi_convention evidence entry (derived) is present, and the note separates the RF Vpi (Eq. 3 sideband ratio, p.5). |
| F4 | applied | confirmed | eltes2023 page_01.png Fig. 1c (opened): y-axis "Avg. rel. transmission" against Vpp (V), with "Fit (Vpi = 3.2 V)". The caption reads "Vpi measurement on 1.5 mm high-speed phase shifter at 10 MHz", and the arm drive is not stated. eltes2023-b and li2024-ps now have vpi_convention = unspecified, with notes as recommended. |
| F5 | applied | confirmed | li2024 p.2-3: "The HSPS adopts a single-ended drive scheme enabling standard push-pull driving with a Vpi of 3.6 V". eltes2023 p.2 has the same wording with "a Vpi of 3.6 V". eltes2023-a and li2024-c now have mzm_push_pull, each with a derived evidence entry quoting the sentence. The vpi_dc_v evidence notes are updated, the old li2024-c "not stated to be per arm or MZM-level" text is gone, and drive push_pull is unchanged. |
| F6 | adjusted | confirmed | li2024 page_05.png Table I (opened): 10 km, 250 Gb/s, 106 GBd PAM-6, 6.7% OH, [1311,1321] nm. The modulation_format and max_net_rate_gbps evidence note now include this point, and the value 250 is unchanged. The "6.7% FEC OH" wording is accurate (the table prints only the OH). The row note has a wording defect: see N1. |
| F7 | applied (keep both) | confirmed (matches coordinator decision) | physical_device_id is empty on all 10 rows. Cross-reference notes are on eltes2023-a/li2024-c and eltes2023-b/li2024-ps ("both papers keep their own rows, no shared physical_device_id"). |
| F8 | applied | confirmed | li2024 p.2: "the parameters discussed subsequently are applicable to both C-band and O-band MZMs ... HSPSs length of less than 2 mm"; p.3: "characteristic impedance and the termination resistance are designed to be 50 Ohm". li2024-o now has length_mm = 2 with length_mm:lt and z0_ohm = 50, both design_target with evidence entries. Vpi and IL stay empty. |
| F9 | applied | confirmed | eltes2020 p.2 Fig. 1f caption: "16.7 MV m-1 ... corresponds to 150 V", which gives an 8.98 um gap. Methods p.6 gives 9 um for SiN and 2.3 um for Si. Supplement p.10: "Figure S3. NLO hysteresis measured in a BaTiO3-SiN device at 300 K"; Table S1 gives r_eff 321. The row note and the r_eff evidence note and locator are updated. |
| F10 | applied | confirmed | Supplement p.19: "Using an estimated device capacitance of 62 fF" (no approximate wording). capacitance_ff:approx is removed from eltes2020-b, and -c keeps it ("~11 fF", supplement p.15). |
| F11 | applied | confirmed | eltes2020 p.2: "(5.6 dB cm-1, SiN device)". Supplement Fig. S1 caption: "Cut-back loss-measurements of ... waveguides". The evidence note says this is a straight-waveguide cut-back, not the racetrack. |
| F12 | applied | confirmed | kohli2023 p.6: "soft-decision FEC (SD-FEC) limit with 20% overhead". The note is updated. |
| F13 | applied | confirmed | kohli2023 p.4: "With the cutback measurement method, the plasmonic propagation losses are found to be 0.5 dB/um". A derived-list entry (0.5 dB/um x 1e4 um/cm = 5000) is added, and the evidence note points to it. |
| F14 | rejected | confirmed (rejection acceptable) | The 0.48 V cm does belong to the 1.5 mm structure. eltes2023 p.1 Sec. 2 ties it directly to that figure: "reaching a VpiL of 4.8 Vmm (Figure 1c)". Fig. 1c is the 1.5 mm HSPS with a 3.2 V fit, and 3.2 x 1.5 = 4.8. li2024-ps and eltes2023-b already carry vpil_dc_vcm 0.48 with derived-list entries. li2024 p.7 ("designed the BTO MZMs with a VpiL of 4.8 Vmm") is a design-level restatement. Entering 0.48 on li2024-c (3.6 V, length < 2 mm) would put a VpiL measured on another structure onto that row. |
| F15 | applied | confirmed | eltes2023 p.3 Conclusions: "the manufacturing process we have established at a 200 mm SiPh-compatible line"; p.1: "manufactured in a SiPh-compatible process flow scalable to 200 mm wafers (Figure 1a)". Convention (ee): foundry_native covers a line process the paper states, named or not. eltes2023-a now matches li2024-c, but the evidence locator is wrong: see N2. |
| F16 | applied | confirmed | eltes2023 p.2: "a swing of 3 Vpp applied to the modulator"; li2024 p.4: "the optimum driving swing is 3.3 Vpp". The cross-paper note is on both rows. |
| F17 | applied | confirmed | The eltes2020-b tags are now `racetrack;cryogenic;si_strip`, and the attribution is kept in the note. |

Coordinator decisions also re-checked:
- eltes2020-c vpi_dc_v empty: holds. p.3: "6 x 10^6 V m-1 ... ~50 V, and ... VpiL, of 5 V cm". Supplement p.15 Note 7: "For a full pi phase shift +/-50 V are applied". vpil_dc_vcm 5, mzm_single_arm and single_ended are unchanged.
- eltes2020-b 30 GHz moved to bw6db_ghz approx with bw_measured_to_ghz 30 and link_eoe: applied exactly.
- The eltes2023/li2024 duplicates are kept with cross-reference notes and no physical_device_id: applied exactly.

## Unrecorded changes

None. Every field-level difference between the backup and the staged `devices.csv` traces to a finding in AUDIT_DISPOSITIONS.md, and so does every hunk of the four evidence diffs. `papers.csv` and `organizations.csv` are byte-identical to the backup.

## Consistency and coordinator rules

- CSV vs evidence: a script check of all 10 rows against the `entries` and `derived` sections of all 4 YAML files found no value mismatches. Every non-empty numeric field has an evidence entry. All basis values are in the enum. The new enum values (link_eoe, mzm_push_pull, resonance_tuning_derived, foundry_native, design_target) are valid in `devices.schema.yaml`.
- Rule 1 (licence): eltes2020, eltes2023 and li2024 are publisher-copyright with restricted_local_only. kohli2023 is CC-BY-NC-ND-4.0 (a bare token) with restricted_local_only. The rule is applied.
- Rule 2 (name_source / ror_id): no new organizations; organizations.csv has only the header.
- Rule 3 (standard_reference): there are no sim configs and no `sims/<id>/` directories for these four papers.
- Rule 4 (discovered_via): eltes2020 and eltes2023 are `landmark`; li2024 and kohli2023 are `local_corpus`. All four match `data/_staging/batches/p7_01.csv`, and none of the papers is in `data/papers.csv`.

## New issues

| id | severity | where | issue | fix |
|---|---|---|---|---|
| N1 | minor | li2024-o notes | The F6 text was inserted in the middle of an existing comparison. The note now reads "... 250 Gb/s over 2 km below HD-FEC at 1291-1321 nm (abstract), 250 Gb/s over 10 km also reached with 106 GBd PAM-6, 6.7% FEC OH, 1311-1321 nm (Table I only) vs 1291-1331 nm (conclusion, ...)". The "vs 1291-1331 nm (conclusion)" contrast, which belongs to the 2 km abstract range, now reads as if it contrasts with the 10 km point. | Move the 10 km sentence after the closing parenthesis of the abstract-vs-conclusion comparison. |
| N2 | minor | evidence/eltes2023.yaml, eltes2023-a integration locator | "p.3, Section 4". The quoted sentence is in "5. Conclusions" (p.3); Section 4 is "Related work". | Change the locator to "p.3, Section 5; p.1, Section 1 and Fig. 1a" (p.1 also says "manufactured in a SiPh-compatible process flow scalable to 200 mm wafers"). |
| N3 | info | eltes2023-b, li2024-ps integration | Empty, while their sibling MZM rows are foundry_native. These are test structures on the same platform. Not a defect: the audit did not raise it and convention (ee) does not require a value. | Optional: align these rows with the sibling rows. |
| N4 | info | eltes2020-b bw_method link_eoe vs eltes2020-d eo_s21 | Methods p.6 describes one VNA setup for the EO S21 with "the response of the photodetector was compensated". -b (Fig. S9, "EOE \|S21\|"; Fig. 4c "EOE frequency response") and -d (Fig. 2c, "EO S21 parameter") come from that setup but carry different methods, following the figure labels. Coordinator decision; recorded for transparency only. | None required. Optionally add "p.4, Fig. 4c caption" to the -b bw6db_ghz locator. |

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p7_01` (no `--apply`) was attempted twice. Both attempts were denied by the auto-mode permission classifier ("Irreversible Local Destruction"). A read of the script shows that, without `--apply`, it writes only to a `tempfile.TemporaryDirectory` copy of `data/`. The command was not retried any other way. The only available dry-run line is the corrector's, quoted unverified: `merge counts: {'papers': 4, 'devices': 10, 'orgs': 0, 'evidence': 4}; conflicts: 0; validation errors: 0`. The coordinator should run the dry run before merging.
