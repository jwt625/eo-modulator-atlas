# Audit dispositions, batch p3_08 (2026-10-03)

Audit: `data/_staging/audits/p3_08-p3_10-q1-claude-ingest-2026-10-03.md`. Each finding was re-checked against the cached source (text.md; Fig. 3(c) of taghavi2026 opened as an image) before acting. Papers: chiang2025 (no findings; F22 cross-batch only), taghavi2026, akazawa2026.

Counts: applied 7 (F1, F2, F3, F4, F5, F6, F21), applied-adjusted 2 (F7, F8), rejected 0, deferred 2 (F22, F23).

| ID | Severity | Disposition | Change or reason |
|---|---|---|---|
| F6 | blocking | applied (by coordinator; confirmed) | akazawa2026-a `capacitance_ff` is 6480 in devices.csv and evidence/akazawa2026.yaml (unit fF); p.4 text "6.48 pF" re-read; 0.5 x 6.48 pF x (2.2 V)^2 = 15.7 pJ vs 15.3 pJ/pi stated. |
| F1 | numerical | applied | Re-read Fig. 3(c) (img_p14_1): graphic annotates about 0.65 dB, FWHM about 150 pm, lambda_off-res about 230 pm at 1534.5 nm (Q about 10k by arithmetic); caption/abstract 0.78 dB, Q 15340, 250 pm/V. Values unchanged. Row notes and the `il_onchip_db` and `q_loaded` evidence notes now state the conflict. |
| F2 | metadata | applied | Text p.5 and Fig. 4(e) caption confirm DC/slow birefringence response vs 7.8 GHz Pockels response. `vpi_dc_v`, `vpil_dc_vcm`, `tuning_nm_per_v` evidence notes and row notes say so; tag `dual_mechanism_dc_vpi` added. |
| F3 | minor | applied | Crossref: issued/published-online 2026-07-15, print 2026-07-20. papers.csv notes, devices.csv notes and BATCH_REPORT now read "issued 2026-07-15 (print 2026-07-20)". |
| F4 | minor | applied | taghavi2026-a `drive` set to `unspecified` (convention (f) is defined for MZM arms; kohli2025-rt precedent). The `drive` evidence entry removed (no claim left to support); single signal electrode kept in row notes. |
| F5 | minor | applied | Row note rephrased: coupling loss reported separately for the PIC (about 12 dB per photonic-wire-bond channel, about 10.5 dB per grating coupler, p.7); definition of the 0.78 dB not stated. |
| F7 | metadata | applied-adjusted | p.4 says "Vpi = 2.2 V for a 600-um-long phase shifter" and p.5 "approximately corresponding to Vpi"; no measurement described. `vpi_basis` and evidence basis set to `derived`; note says authors give no method and 0.13 V cm / 0.6 mm = 2.17 V is consistent. Adjusted: no entry added to the `derived` list (the authors' value is what is entered; the 2.17 V figure is only a consistency note). |
| F8 | metadata | applied-adjusted | `il_onchip_includes` = carrier-induced excess loss at pi (0.20 dB) plus two Si-to-hybrid tapers (0.18 dB each). `il_onchip_excludes` = fiber and edge-coupler loss (section total only); baseline normalization defined in Supplementary Sections IV-V (not read). Adjusted: dropped the audit's "unbiased propagation loss" exclusion, which the paper does not state. |
| F21 | metadata (cross-batch) | applied | One rule adopted across p3_08 to p3_10: a cleanroom the paper names as used for the devices, also when only in the acknowledgements, goes in `foundry_or_fab` (canonical precedent: kohli2025, the Binnig and Rohrer Nanotechnology Center and EPFL IPHYS cleanroom entries). akazawa2026 (Takeda Sentanchi Super Cleanroom) already conforms; no change here. falcone2026 and berman2026 (p3_09) were filled; chelladurai2025 (p3_10) already conforms. |
| F22 | minor (cross-batch) | deferred | chiang2025 25 MHz AC Vpi stays in `vpi_rf_*` at 0.025 GHz (defensible, documented). The dc/rf cutoff is a coordinator rule; proposal appended to SPEC_PROPOSALS.md. |
| F23 | minor (cross-batch) | deferred | `published_on` for arXiv rows (taghavi2026 2026-02-23, akazawa2026 2026-09-21 from PDF stamps) stays empty per the p3_01/p3_05 precedent; coordinator decision, proposal appended. |

## For the coordinator
- Cross-batch organization duplicates (identical type, country, region, parent; notes differ; merge keeps the first): Polaris Electro-Optics, Inc., University of British Columbia, Dream Photonics Inc. (p3_08 and p3_18); Advanced Micro Foundry (p3_08, p3_06, p3_15, p3_18); National Institute of Advanced Industrial Science and Technology (p3_08 and p3_15); Takeda Sentanchi Super Cleanroom (p3_08 and p3_19). Not renamed here.
- Optional later check: the Optica version of record of taghavi2026 (150 vs 250 pm/V, 0.78 vs 0.65 dB, Q) and the akazawa2026 Supplementary Information.
