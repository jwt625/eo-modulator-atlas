# p3_08 batch report (verified_on 2026-10-02)

Papers: chiang2025, taghavi2026, akazawa2026. Dry-run merge: `merge counts: papers 3, devices 3, orgs 8, evidence 3; conflicts: 0; validation errors: 0`. No sim configs (none is a dielectric traveling-wave device). `text.md`, `figures/`, `source.pdf`, `source.json` were present for all three; nothing in `references/` was regenerated or modified.

## Version note
| Paper | Numbers come from | Other version |
|---|---|---|
| chiang2025 | arXiv 2507.14724v1 (4 pp); no Crossref record, no journal version found | page-1 footer reads (c)2024 The Author(s); venue not stated |
| taghavi2026 | arXiv 2602.20406v1 (16 pp, 23 Feb 2026) | Optica 13(7) 1368, issued 2026-07-15 (print 2026-07-20), Optica OA License v2 (Crossref): not read, may differ |
| akazawa2026 | arXiv 2609.24611v1 (10 pp, 21 Sep 2026); no journal version found | none |

`license` and `published_on` empty for all three; `redistribution = restricted_local_only`.

## chiang2025
- Status: distilled. Rows: 1 paper, 1 device (1 mm Si-FNLC GSGSG MZM), 1 evidence block. repro_grade C, sim config none (silicon slot SOH).
- Reported: Vpi(AC) 3 V and VpiL(AC) 0.3 V*cm at 25 MHz with 3.5 V bias; f6dB > 67 GHz (VNA-limited, no roll-off); ER 21.8 dB; propagation loss approx 6.5 dB/mm; 51 GBd PAM-4 / 102 Gbit/s at 1.9 Vpp differential.
- Not reported: DC Vpi, 3 dB bandwidth, insertion loss (only propagation loss), numeric wavelength (C-band only), foundry, driver, silicon dimensions other than slot width approx 125 nm and length, BOX thickness.
- Judgment calls: Vpi entered in `vpi_rf_v` at 0.025 GHz (25 MHz AC, not DC); `vpi_convention = unspecified`; drive `push_pull` from the eye-diagram experiment (stated), AC-measurement drive not stated; 6 dB bandwidth entered as `bw6db_ghz` 67 with `gt`; propagation loss converted 6.5 dB/mm to 65 dB/cm with `approx`; `integration = polymer_backfill` for FNLC (closest enum); r33 29.5 pm/V, TDECQ 2.56 dB, equalizer taps in notes.
- CSV hints: platform, class, priority, sim_candidate all confirmed. Batch CSV lists no DOI; none exists in the source.

## taghavi2026
- Status: distilled. Rows: 1 paper, 1 device (40 um radius FN-LC semi-ridge microring), 1 evidence block. repro_grade B (Fig. 2(a) dimensions and doses; phase-shifter length and etch depth not stated), sim config none (ring on SOI).
- Reported: f-6dB approx 7.8 GHz (fast Pockels response) and 119 kHz (slow); Vpi approx 13.25 V, V_pi L_ring approx 3.33 V*mm; DC tuning approx 150 pm/V; on-chip IL approx 0.78 dB; Q approx 15340; static ER approx 10 dB (figure annotation); E_dyn approx 1.65 fJ/bit (estimate); C approx 0.63 fF; static power approx 4.77 nW/pi.
- Not reported: 3 dB bandwidth, dynamic ER at 7.8 GHz (called modest), operating wavelength (resonance near 1534.5 nm in Fig. 3(c)), phase-shifter length, etch depth, FSR value, loss definition.
- Judgment calls: Vpi basis `author_estimate` (caption: estimated), convention `resonance_tuning_derived`; V_pi L converted 3.33 V*mm to 0.333 V*cm using the ring circumference; `drive` left unspecified (convention (f) is defined for MZM arms; single signal electrode noted in the row notes); `electrode_gap_um = 6` is d1 (electrode-to-core, Fig. 2(a)), extracted_from_figure; bandwidth reference left empty (not DC: the 6 dB point is relative to the mid-frequency plateau); `bw_measured_to_ghz = 11` (drive sweep 30 kHz to 11 GHz).
- Paper inconsistencies: DC tuning 150 pm/V (abstract, text, Fig. 3(e)) vs 250 pm/V (Fig. 3(c) caption; entered 150, 250 in notes); Fig. 3(c) graphic annotates about 0.65 dB IL and FWHM about 150 pm (Q about 10k) vs 0.78 dB and Q 15340 in caption/abstract; static power 4.5 nW/pi (abstract) vs 4.77 nW/pi (text); Fig. 6 caption "experimentally obtained" Vpp 368 V, eta_ps 0.69e-5 /V and f-3dB 2.1 GHz do not match the main text (not used); Dream Photonics Inc. and Polaris Electro-Optics (no Inc.) written differently from chiang2025.
- CSV hints: confirmed. The CSV merges preprint and journal; numbers are preprint v1, DOI kept.

## akazawa2026
- Status: distilled (decision: the full text reports phase-shifter modulator metrics, so device rows were written rather than no_device_rows). Rows: 1 paper, 1 device (600 um n-InGaAsP/Si hybrid MOS phase shifter), 1 evidence block. repro_grade C, sim config none (carrier-effect hybrid MOS; Supplementary not cached).
- Reported: VpiL 0.13 V*cm (500 and 1000 um AMZIs), Vpi 2.2 V at 600 um, section IL 0.56 dB at pi (0.20 dB carrier excess + 2 x 0.18 dB tapers), 6.48 pF capacitance, rise/fall 555/417 ps, static power 28.9 fW/pi, switching energy 15.3 pJ/pi, wavelength 1550 nm, 4x4 mesh results.
- Not reported: bandwidth (S21), ER, drive mode of the characterized shifter, rib width, the length of the device in the dynamic test, Supplementary Sections I-IX (loss extraction, leakage, capacitance).
- Judgment calls: `eo_material = other` (carrier effect, not Pockels); `il_onchip_db` 0.56 basis `derived` (sum of authors' parts), with includes/excludes filled; Vpi 2.2 V basis `derived` (quoted without method; consistent with VpiL / L); rise/fall time, per-pi power and energy kept in notes (no columns); `foundry_or_fab = Takeda Sentanchi Super Cleanroom` (named only as where part of the work was done); `vpi_convention = per_arm_phase_shifter` derived.
- CSV hints: confirmed (platform other, class phase_shifter).

## Organizations added (8)
National Sun Yat-sen University (TW); Polaris Electro-Optics, Inc. (US); University of British Columbia (CA); Dream Photonics Inc. (CA); Advanced Micro Foundry (SG; duplicates, with identical type/country/region, an entry staged by p3_06); Tohoku University (JP); National Institute of Advanced Industrial Science and Technology (JP, research_institute); Takeda Sentanchi Super Cleanroom (JP facility, parent The University of Tokyo). The University of Tokyo already exists.

## Blockers
None. Follow-ups: Optica version of record for taghavi2026 (numbers, 150 vs 250 pm/V); akazawa2026 Supplementary Information.

## Audit corrections (2026-10-03)
Fresh-context Q1 audit (`data/_staging/audits/p3_08-p3_10-q1-claude-ingest-2026-10-03.md`) resolved; per-finding table in `AUDIT_DISPOSITIONS.md`. Summary: F6 (akazawa2026 capacitance 6480 fF) applied by the coordinator and confirmed; taghavi2026 notes and evidence now record the Fig. 3(c) IL and FWHM/Q annotation conflict and that Vpi, V_pi L and tuning efficiency are DC/slow birefringence values (tag `dual_mechanism_dc_vpi`); Optica issue date corrected to 2026-07-15 (print 2026-07-20); taghavi2026 `drive` set to `unspecified` (drive evidence entry removed); akazawa2026 Vpi basis `derived` and `il_onchip_includes`/`il_onchip_excludes` filled. Dry-run merge with p3_09 and p3_10: 0 conflicts, 0 validation errors.
