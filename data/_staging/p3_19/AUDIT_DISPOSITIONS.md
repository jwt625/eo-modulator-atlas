# Audit dispositions, batch p3_19 (2026-10-03)

Audit: `data/_staging/audits/p3_16-p3_19-q1-claude-ingest-2026-10-03.md`. Papers: soma2025, fukui2025, sun2026a, prountzou2026. Each finding was re-checked against `references/<paper_id>/` before the disposition was set. Findings for other batches are omitted. The audit verdict for sun2026a is "accept" (only F17 applies, in the same way as for the other free-space rows).

| ID | Severity | Disposition | Exact change or reason |
|---|---|---|---|
| F8 | metadata | applied | soma2025 and prountzou2026 papers.csv: `source_type` journal -> arxiv_preprint; `url` doi.org -> versioned arXiv PDF (matches `references/<id>/source.json`: 2503.17986v1, 2601.20434v1); `venue` "arXiv; associated journal: Nature Nanotechnology 20(11), 1625-1632 (2025)" and "arXiv; associated journal: ACS Photonics 13(10), 2928-2936 (2026)"; `doi` kept; notes say the structured fields follow the cached version. `license` stays empty for both (preprint; Crossref CC-BY-4.0 for prountzou2026 remains a note). |
| F9 | metadata | deferred | Not renamed (cross-batch, coordinator's call). `The University of Texas at Austin` (this batch, organizations.csv and sun2026a `universities`) vs `University of Texas at Austin` (p3_17, heidari2022). The audit proposes the longer spelling in both. |
| F14 (c) | metadata | applied | soma2025-a `er_type` static (the 11 dB is from the Fig. 3(d) voltage sweep, p.5; verified in text.md); row note added. Parts (a) and (b) of F14 are in p3_16. |
| F17 | metadata | applied | All eight row notes now say `length_mm` is the lateral aperture, not an interaction length; the three rows with `il_onchip_db` (soma2025-a, fukui2025-a, fukui2025-b) also say it is a free-space reflection or excess loss, not a waveguide insertion loss. fukui2025-b `drive_vpp_v` 5.6 emptied (p.3-4: required Vpp for 5 dB modulation in a parallel-plate model, predicted) and its evidence entry removed; the value stays in the row note as a predicted required voltage, not a demonstrated drive. No Vpi, VpiL or `vpi_basis` cell exists on any p3_19 row (re-checked), all rows tagged free_space;metasurface. |

Appended dated proposals to `SPEC_PROPOSALS.md` (including the UT Austin spelling for the coordinator); appended an "Audit corrections" section to `BATCH_REPORT.md`.

Counts for p3_19: applied 3 (F8, F14c, F17), applied-adjusted 0, rejected 0, deferred 1 (F9).
