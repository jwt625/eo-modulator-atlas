# Audit dispositions, batch p3_09 (2026-10-03)

Audit: `data/_staging/audits/p3_08-p3_10-q1-claude-ingest-2026-10-03.md`. Each finding was re-checked against the cached source (berman2026 page_03 and page_06 renders opened; nenezic2026 PDF byline in text.md; falcone2026 and berman2026 text). Papers: falcone2026, berman2026, nenezic2026.

Counts: applied 6 (F9, F10, F11, F12, F13, F21), applied-adjusted 0, rejected 0, deferred 2 (F22, F23).

| ID | Severity | Disposition | Change or reason |
|---|---|---|---|
| F10 | numerical | applied | Fig. 1(c) right panel is labelled 1534.14 nm (Q 605k loaded, about 1.2M intrinsic, 249 um-straight racetrack); the tuning racetrack of Fig. 1(f) is at about 1631.5 nm. berman2026-a `q_loaded` emptied and its evidence entry removed; the values stay in the row notes with the wavelength. `fsr_nm` 1.1 evidence and row note now say it is an Eq. (1) input ("see SI") with no stated wavelength. |
| F11 | minor | applied | Fig. 4(b) re-read: smoothed trace stays near -3 dB (about -2.6 to -3.1 dB) from about 7 to 15 GHz, crosses -6 dB near 21 GHz. Values (11, 21 GHz, `approx`) unchanged as the authors state them; evidence and row notes record the plateau and the unstated zero reference. |
| F12 | metadata | applied | PDF byline (text.md p.1) order: Nenezic, Vissers, Moerman, Bogaert, Atzeni, Zheng, Vanackere, Niels, Papadopoulou, Uvin, De Heyn, Saseendran, Billet, Kuyken (14 names; full first names kept from the batch CSV). papers.csv authors and notes updated; BATCH_REPORT statement corrected. |
| F13 | minor | applied | `il_onchip_excludes` emptied on nenezic2026-case1/2/3 (absence of mention is not an exclusion); the definition stays in `il_onchip_includes`. |
| F9 | minor | applied | p.6: "estimated losses were obtained by fitting the transmitted light through waveguides of different lengths". Evidence basis for `prop_loss_db_per_cm` (both rows) changed from `measured` to `derived`, matching row `il_basis` = `derived`; note says the authors estimate it from a length fit. |
| F21 | metadata (cross-batch) | applied | Rule adopted across p3_08 to p3_10: a cleanroom named as used for the devices, also from the acknowledgements, goes in `foundry_or_fab` (kohli2025 precedent). falcone2026: Binnig and Rohrer Nanotechnology Center (canonical entry reused) and FIRST cleanroom of ETH Zurich (new facility, parent ETH Zurich, CH; acronym not expanded in the paper). berman2026: NUFAB facility of the NUANCE Center (new facility, parent Northwestern University, US; the paper states the work "made use of" it). Notes updated; 2 organizations added. |
| F22 | minor (cross-batch) | deferred | falcone2026 100 kHz triangular sweep stays in `vpi_dc_*` (precedent mao2024); the dc/rf cutoff is a coordinator rule (proposal in the p3_08 SPEC_PROPOSALS.md addendum). |
| F23 | minor (cross-batch) | deferred | `published_on` for falcone2026 (2026-01-21), berman2026 (2026-07-04), nenezic2026 (2026-05-27) stays empty per the p3_01/p3_05 precedent; dates are in the BATCH_REPORT. Coordinator decision. |

## For the coordinator
- `discovered_via` tokens `web_search`, `author_group_followup` (and `continuation_2026_10_02`, `tmp_eo_md`) are used across p3_07 and p3_09 to p3_19 and are outside the documented token list; not renamed here (proposal in SPEC_PROPOSALS.md).
- New organizations "FIRST cleanroom of ETH Zurich" and "NUFAB facility of the NUANCE Center" use the paper's wording; rename if the coordinator prefers expanded names. No cross-batch duplicate of either exists in the staged organizations files.
