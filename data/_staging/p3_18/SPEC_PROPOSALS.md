# Schema / skill proposals from batch p3_18 (not applied)

No simulation configs were written (SOH, FN-LC and resonant transducer papers), so there are no `sims/SPEC.md` proposals.

## Schema (devices.schema.yaml)
- `waveguide_platform` has no value for a finger-loaded strip waveguide (taghavi2024) or a plain 220 nm SOI strip core with side electrodes (witmer2020 converter and unslotted test cavity); both used `other`. Proposal: `soi_strip` and `soi_finger_loaded`.
- `device_class` has no value for an EO-tuned resonant cavity that is not a ring (witmer2020 fishbone photonic-crystal cavity used `other`). Proposal: `resonator` (or `cavity`) next to `ring`.
- Quantum-transducer metrics have no columns: EO coupling rate g0/2pi (Hz), conversion efficiency, conversion bandwidth (MHz), microwave resonance frequency and Q, sideband selectivity. They stay in the witmer2020 notes. Proposal: a small optional block (`g0_hz`, `conversion_efficiency`, `mw_resonance_ghz`, `q_microwave`) or a separate transducer table; same family as the `r_eff_pm_per_v` proposal from p3_04/p3_07.
- Sub-MHz bandwidth: witmer2020 slot test device rolls off at about 20 kHz; `bw3db_ghz` stores 0.00002. A `bw3db_khz` unit or a convention for sub-GHz values would avoid 5-decimal GHz entries.
- Multi-operating-point mechanism in one row (taghavi2024): DC (liquid-crystal reorientation, Vpi 0.5 V) and AC (Pockels, Vpi 51.4 V) share `vpi_dc_v`/`vpi_rf_v`, but `vpi_rf_freq_ghz` cannot be filled when the paper's frequency is ambiguous (text 4.18 MHz vs 4.18 GHz). The convention that `*_rf_*` means "at a stated frequency" leaves an RF value without a frequency; propose allowing `vpi_rf_v` with a note-only frequency, or a `vpi_ac_*` pair for estimated (non-measured) AC efficiencies.
- PIC-level rows (johnson2025): the paper reports channel-mean Vpi and bandwidth with plus-minus spreads per PIC, plus a single best channel. There is no column for the spread (`vpi_dc_v_sigma`) or channel count, and no `row_kind` to separate design-value rows from measured PICs (same as the p3_07 `row_kind` proposal). Design-value rows were written with basis `design_target`.
- Single-ended push-pull (SEPP) equivalent efficiency (johnson2025: 0.31 V.mm from a 1.57 V differential Vpi) is a third Vpi convention alongside `mzm_differential`; the schema has only `vpi_mzm_pushpull_dc_v` in volts. Proposal: `vpil_sepp_equiv_vcm` or convention note, so authors' conversions are enterable without breaking the row's convention.
- Dynamic ER per channel and driver swing (johnson2025 Table 2) is a (channel, drive voltage) table; only static ER fits `extinction_ratio_db`. Dynamic values stay in notes.
- Drive reference plane: johnson2025 gives driver swing (1.8 Vppd) and effective voltage at the modulator (1.29 Vppd after 2.88 dB probe/cable loss); `drive_vpp_v` holds the effective value with basis `derived` (same issue as the p2_01 proposal 6).
- `bw3db_reference` has no value for S21 plotted "relative to 1 GHz" with the table values presumably on the same basis other than `1ghz`; used `1ghz` with a note that the Table 1 reference is presumed from Fig. 2.
- Design-study and projection rows (taghavi2022a doped-Si projection, johnson2025 design rows) sit beside measured rows and differ only by basis and tags (same as p3_07).

## Skill / contract
- Preprint-vs-version-of-record: the contract asks to state the version, but not how to handle a batch hint that quotes the published abstract (taghavi2022a 1.19/1.2 V.mm hint, witmer2020 590 vs 330 Hz). Handled by using only the cached text and flagging the mismatch in `papers.csv` notes; a documented rule (hint values never override the cached text) would help.
- An abstract claim that the body does not support (taghavi2022a: abstract VpiL below 1.2 V.mm vs about 4.8 V.mm from Fig. 11 arithmetic) has no stated convention. Entered the abstract value with basis `author_estimate` and the arithmetic in the `derived` list, not the CSV; the audit may prefer to drop the CSV value.
- `discovered_via` tokens `web_search`, `author_group_followup` and `continuation_2026_10_02` are not in the documented vocabulary (same as p3_02 and p3_07); entered verbatim from the batch CSV.
- Affiliation labels swapped on page 1 of taghavi2022a (arXiv text vs Crossref): the contract says identity comes from Crossref, but the affiliation-to-author mapping for `universities` only needs the set; a note on resolving label conflicts would help.
- Org acronym expansion: "Georgia Tech IEN" (taghavi2022a) is expanded from outside the paper (convention (e) says expand pure acronyms); flagged in the organizations note.

## Audit follow-up (2026-10-03)
- taghavi2022a-a: the abstract bound (VpiL below 1.2 V.mm) contradicted by the paper's own Fig. 11 arithmetic (about 4.8 V.mm) is no longer entered as a cell; both numbers are in the row notes. A rule for abstract claims that the body does not support would help: enter only values with a measurement behind them, keep the claim in notes.
- johnson2025: "typically >= 25 dB static ER" is a family-level statement and has no row to attach to; it is kept in the notes of 200g-a/-b/-c only. A `family` or paper-level metrics table would hold such statements.
- `bw_measured_to_ghz` is now also set on johnson2025-400g-a (mean 109 GHz at a 110 GHz analyser range, convention (c)).
- Evidence-note length: nine notes were over 25 words and were shortened; a validator warning for notes above 25 words would catch this at write time.
