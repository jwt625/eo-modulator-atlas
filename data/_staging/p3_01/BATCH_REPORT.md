# p3_01 batch report (verified_on 2026-10-02)

Papers: xu2020, wang2022a, zhang2022, qi2024, li2022b. Dry-run merge: 0 conflicts, 0 validation errors (5 papers, 10 device rows, 9 new organizations, 5 evidence files). Four sim configs written (wang2022a, zhang2022, qi2024, li2022b); the engine was not run.

Cache repair: xu2020, wang2022a, zhang2022 and qi2024 had `source.pdf` and `source.json` but no `text.md` or `figures/` (source.json claimed an earlier extraction). Text and figures were regenerated locally from the cached PDFs with `scripts/extract_source.py` (no network); `source.pdf` is byte-identical and `source.json` was restored to its original content. li2022b was complete.

## Version note (preprint vs journal)
| Paper | Numbers come from | Journal / other version |
|---|---|---|
| xu2020 | arXiv 2006.15536v1 (10 pp, no Supplementary Information) | Nature Communications 11, 3911 (2020-08-06, CC-BY-4.0 per Crossref): not read |
| wang2022a | arXiv 2201.09730v1 (4 pp) | no journal DOI located; none recorded |
| zhang2022 | version of record (institutional copy; printed publication date 2022-09-28) | same |
| qi2024 | arXiv 2308.03073v4 (dated 2023-11-24, 9 pp full paper) | CLEO 2024 AM4J.4 (Crossref identity): not read, may differ |
| li2022b | arXiv 2202.13323v1 (7 pp, 7 authors) | Optics Express 30(20) 36394 (2022-09-21, 10 authors per Crossref): not read |

Licenses: no preprint-version license is verifiable (source.json empty), so `license` is empty and `redistribution = restricted_local_only` for xu2020, wang2022a, qi2024, li2022b (Crossref licenses belong to the versions of record). zhang2022: `publisher-copyright` from the page-1 notice, `paywalled`, restricted.

## xu2020
- Status: distilled. Rows: 1 paper, 2 devices (13 mm and 7.5 mm nested IQ MZMs), 2 evidence blocks. repro_grade C, sim config none (buried-oxide thickness, cladding and substrate not stated in v1; Supplementary Notes absent).
- Not reported (v1): BOX thickness, cladding, Z0, n_rf, ng, optical power handling, RF Vpi, wavelength of the Vpi sweep, ER of the 7.5 mm device, fabricator.
- Judgment calls: bw3db for 13 mm = 48 GHz with `approx` only (text: "greater than 48 GHz"; Fig. 4(a) marks the crossing at about 48 GHz and Table 1 gives "~48"; see Audit corrections); reference frequency 1.5 GHz in `bw3db_reference_freq_ghz`. EO roll-off at 67 GHz (about 5 dB for 13 mm, about 2 dB for 7.5 mm) is read from Fig. 4(a), basis `extracted_from_figure`, approx. On-chip loss 1.8 / 1.45 dB is the authors' subtraction of 2 x 3.4 dB grating coupler loss (basis derived). Energy 61 fJ/bit is the authors' formula (basis derived). 4 um waveguide loss 0.15 dB/cm taken from the text (Supplementary Fig. 4 not available). Data demo entered on the 13 mm row only.
- Paper inconsistencies: text cites Fig. 4(a) for the 7.5 mm device while the caption names the 13 mm device (figure shows both traces); text refers to "Fig. 3b" for wavelength scans that are panel c.
- CSV hints: batch CSV `device_class=iq_mzm`, `platform=lithium_niobate`, `priority 2` fine; `sim_candidate=yes` not followed (grade C).

## wang2022a
- Status: distilled. Rows: 1 paper, 1 device (1.2 cm DP-IQ, GSGSG), 1 evidence block. repro_grade B, sim config `sims/wang2022a/config.yaml`.
- Not reported: 3 dB EO bandwidth (only 6 dB > 67 GHz and about 5 dB roll-off at 67 GHz; trace passes -3 dB below 67 GHz per Fig. 3(c), not entered), reference frequency of the S21 curves, wavelength of the Vpi sweep, which MZM Fig. 3(b) shows, DAC drive amplitude, on-chip loss, Z0, n_rf.
- Judgment calls: Vpi convention entered as push-pull MZM with basis derived (authors state only "push-pull mode" and a Vpi); ER 24 dB flagged approx although the Fig. 3(b) trace shows less contrast than that; S11/S21 include RF probes; net rate 1.6 Tb/s stored as 1600 Gb/s (open FEC 15 percent, pilot 3.5 percent per the paper); foundry empty (facilities only in acknowledgements). Slab 240 nm is my subtraction (derived list).
- CSV hints: `device_class_guess=other` replaced by `iq_mzm`; `sim_candidate=unknown` resolved to yes (config written). Batch note says no metric extraction; metrics were extracted.

## zhang2022
- Status: distilled. Rows: 1 paper, 2 devices (5.8 mm, 10.8 mm), 1 evidence block. repro_grade B, sim config `sims/zhang2022/config.yaml` (headline 5.8 mm; the 10.8 mm variant shares the cross-section).
- Not reported: Vpi at DC per device (only Vpi*L 2.3 V cm DC and 2.67 V cm at 1 GHz, stated for both lengths together), rib sidewall angle, ground width, measurement wavelength (laser 1500-1630 nm), IL, ER, fabricator, Vpi convention.
- Judgment calls: 3 dB BW of the 5.8 mm device = 170 GHz (abstract, Sec. 3.C, Fig. 5(d)); Sec. 1 text says 175 GHz, treated as an internal inconsistency. 3 dB / 6 dB BW referenced to 1 GHz (`1ghz`). EO measurement reaches 325 GHz with a crossing, so `bw_measured_to_ghz` is empty. RF loss 13 dB/cm at 250 GHz is my unit conversion of the authors' 1.3 dB/mm (derived list); RF loss, Z0 (41.5 ohm at 250 GHz), ng (2.26, simulated) describe the common cross-section and are entered on both rows. Drive entered as push-pull with basis derived (arms in both gaps of an x-cut GSG line; not stated). RF Vpi values are the figures' dotted-line values quoted in the text (7.3 V for 10.8 mm, 8.3 V for 5.8 mm).
- CSV hints: `device_class_guess=mzm`, platform fine; `access_guess=paywalled` kept; source_type journal (cache is an institutional copy of the version of record).

## qi2024
- Status: distilled. Rows: 1 paper, 4 devices (3, 5, 8, 12.917 mm), 1 evidence block. repro_grade B, sim config `sims/qi2024/config.yaml` (12.917 mm, Vpi*L target only).
- Not reported: per-length Vpi except 12.917 mm, IL and ER definitions/per-device values, drive convention, propagation loss, Z0/n_rf numbers (design plots only in Fig. 3), data-demo device length, fabricator.
- Judgment calls: 3 mm bw3db = 110 GHz with `gt` and `bw_measured_to_ghz` = 110 (text: sweep to 110 GHz; Fig. 4(c) axis extends to about 120 GHz); 5 and 8 mm values (94.171, 80.661 GHz) as quoted to 3 decimals; best ER 10.73 dB and best IL 18.3 dB are over all devices and stay in notes; the NRZ/PAM-4 demonstration is not attributed to any length and is in the paper notes only. `waveguide_platform = other` (silica rib on unetched LN). Wavelength entered as 1550 nm approx ("near 1550 nm").
- CSV hints: batch CSV published_on 2023-08-06 (arXiv v1) not entered; year 2024 from Crossref; `license CC-BY-4.0` hint not verifiable from the cache, left empty.

## li2022b
- Status: distilled. Rows: 1 paper, 1 device (3.3 mm, 532 nm), 1 evidence block. repro_grade B, sim config `sims/li2022b/config.yaml` (optical indices at 532 nm missing; optical stage cannot run).
- Not reported: ER, on-chip insertion loss (GC 5 dB and MMI 0.8 dB are components), Z0/n_rf measured, bandwidth beyond 30 GHz (PD-limited), fabricated electrode dimensions (g, ws, wg, t are designed values), cladding, silicon thickness, fabricator.
- Judgment calls: Vpi*L 1.1 V cm entered from the abstract with basis derived (3.3 V x 3.3 mm = 1.09; paper's simulated value 0.96); total loss 18.8 dB entered as `il_fiber_to_fiber_db` with basis derived because the paper does not define it (consistent with 2 x 5 dB + 2 x 0.8 dB + 3.3 mm x 2.2 dB/mm); 22 dB/cm propagation loss is unit conversion of 2.2 dB/mm (Fig. 5(b) slope 2.214 dB/mm), flagged approx; `bw3db` 30 GHz with `gt` and measured-to 30 GHz; intro sentence "insertion and propagation loss of about 3.05 dB" is the simulated MMI loss, not the device loss.
- CSV hints: `cache_status` hint in the batch notes (needs_retrieval) is outdated: the arXiv v1 is cached. Batch CSV author list (10) is the journal version; the cached preprint has 7 authors, used here.

## Organizations added (9, all new relative to data/organizations.csv)
Sun Yat-sen University; China Information and Communication Technologies Group Corporation; Huazhong University of Science and Technology; Huawei Technologies; City University of Hong Kong (HK); Harvard University; Virginia Tech; Agency for Science, Technology and Research (SG); Advanced Fiber Resources (Zhuhai), Ltd. Five of these names are also in other staged batches with identical type/country/region. Existing orgs reused unchanged: Tsinghua University, South China Normal University, Zhejiang University.

## Blockers
None. Follow-ups: version-of-record checks for xu2020 (with Supplementary Information), li2022b and qi2024 (CLEO) could change numbers; xu2020 would move to grade B with the BOX thickness from the supplement.

## Audit corrections (2026-10-03)
Applied after the fresh-context audit Q1 (p3_01 and p3_02); per-finding table in `AUDIT_DISPOSITIONS.md`. Dry-run merge after the corrections: 0 conflicts, 0 validation errors.
- xu2020: contradictory `bw3db_ghz:gt;bw3db_ghz:approx` reduced to `approx` for the 13 mm row and `bw_measured_to_ghz = 67` added with its evidence entry; `vpi_convention` evidence basis changed to `derived`; `il_onchip_includes` reworded to what the authors do (fibre-to-fibre loss minus 2 x 3.4 dB); 1.5 GHz reference caveat added to the 7.5 mm row.
- wang2022a: 12 dB loss noted as per polarization in the row notes; sim `line.load_ohm` set to the stated 38 ohm (class paper_exact) and its limitation line reworded; the engine still loads the config (electrostatic stage runs). F20 (optional 3 dB crossing) not entered.
- zhang2022: bandwidth evidence notes now say the crossings are read on the EO S21 curve calculated from measured s-parameters (raw sideband scatter is large); Z0 41.5 ohm kept as the text value with the Fig. 2(b) reading of about 43.4 ohm recorded in the evidence and row notes; sim: wavelength 1579 nm read from the Fig. 4(a) inset (class figure_digitized), sidewall angle and ground width placeholders reclassed `unknown`; the engine still loads the config.
- li2022b: Vpi 3.3 V kept as the authors' stated value with the Fig. 6(a) marker span (about 2.75 V, about 0.91 V cm) recorded; loss and VpiL evidence notes reworded (25-word limit, no derivation by the authors); wavelength locator corrected to p.4; `vpi_convention` basis `derived`.
- Open for the coordinator: placeholder material constants with class `unknown` in the four p3_01 configs (SPEC says omit); cross-batch organization duplicates (see AUDIT_DISPOSITIONS.md).
