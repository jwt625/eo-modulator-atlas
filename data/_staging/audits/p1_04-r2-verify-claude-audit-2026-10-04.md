---
verifier: fresh-context subagent
task: independent verification of round-2 audit corrections, batch p1_04
date: 2026-10-04
scope: valdez2022, xu2022, meng2023, renaud2023, valdez2023; organizations.csv row "Sandia National Laboratories"
dispositions: data/_staging/p1_04/AUDIT_DISPOSITIONS_R2.md
audit: data/_staging/audits/p1_04-r2-claude-audit-2026-10-03.md
mode: read-only (this report is the only file written); git diff HEAD on data/; sources re-rendered from references/<id>/source.pdf with pymupdf into a scratch area outside the repo
verdict: corrections confirmed
counts: {changed_cell_groups: 31, confirmed: 31, not_confirmed: 0, unrecorded_changes: 0}
---

# p1_04 round-2 corrections: verification

## Method

- Cell-level diff of `data/papers.csv`, `data/devices.csv`, `data/organizations.csv` (in-scope rows only) and `data/evidence/{valdez2022,meng2023,renaud2023,valdez2023}.yaml` against `HEAD`. `xu2022` has no evidence file and no device rows.
- No `text.md` or `figures/` in `references/` for the four PDF papers. Page text and page renders were made from each `source.pdf` (page counts 13 / 16 / 7 / 21, so PDF page index = `p.N` locator). Page renders opened: valdez2022 p.8 (Fig. 5), valdez2023 p.11 (Fig. 7), meng2023 p.11 (Fig. 7), renaud2023 p.3 (Fig. 2, plus a 400 dpi crop of Fig. 2(a)). weigel2018 `source.pdf` text was read to check the R2-F19 note.
- PDF metadata: valdez2022 dvips/LaTeX 2022-10-28; valdez2023 dvips/LaTeX 2023-01-26; meng2023 Foxit PDF printer 2023-11-08; renaud2023 Springer/iText 2023-03-16.

## Per-paper summary

| Paper | Changed cell groups | Confirmed | Not confirmed | Verdict |
|---|---|---|---|---|
| valdez2022 | 6 | 6 | 0 | corrections confirmed |
| xu2022 | 1 | 1 | 0 | corrections confirmed |
| meng2023 | 6 | 6 | 0 | corrections confirmed |
| renaud2023 | 9 | 9 | 0 | corrections confirmed |
| valdez2023 | 8 | 8 | 0 | corrections confirmed |
| Sandia National Laboratories (organizations.csv) | 1 | 1 | 0 | corrections confirmed |

A cell group is one row of the table below: one column change (with its paired evidence edit) applied to one row, or the same change applied identically to several rows (for example the 8 valdez2023 `modulation_format` cells).

## Changed cells

| Paper / row | Column | Old -> new | Source locator (checked) | Verdict |
|---|---|---|---|---|
| valdez2022-a | qualifiers | `bw3db_ghz:gt;optical_power_handling_dbm:gt` -> empty | p.8 text and Fig. 5 caption "3-dB bandwidth of 110 GHz"; p.9 Table 1; p.10 Conclusion "110 GHz". Fig. 5 render (approx reading): OSA squares and cyan LCA trace reach the -3 dB line at about 105-110 GHz in (a), squares at about 107-110 GHz in (b). Body claims a crossing at the instrument limit, so convention (c) gives no `gt`. Abstract "greater than 110 GHz" retained in evidence note. | confirmed |
| valdez2022-a | qualifiers (power part, R2-F9) | `optical_power_handling_dbm:gt` removed | p.1 "can handle high optical power of 110 mW"; p.10 "power levels of up to 110 mW ... less than 1 dB at 20.4 dBm". No bound wording on the value. | confirmed |
| valdez2022-a | modulation_format | "none (small-signal ...)" -> empty; evidence entry deleted | No data-modulation experiment in the text (no OOK/PAM/eye/Gb/s hits); only EOR (OSA, LCA) and Vpi. | confirmed |
| valdez2022-a | evidence `bw3db_ghz` note | rewritten | as above | confirmed |
| valdez2022-a | evidence `optical_power_handling_dbm` note | appended "source says up to 110 mW, so no bound qualifier" | p.10 | confirmed |
| valdez2022-a | notes | appended LCA second-device sentence; "No data modulation reported ..." | p.8 "EO S21 of an identically designed hybrid bonded MZM on a different chip was independently verified ... (LCA)"; Fig. 5 caption cyan line | confirmed |
| xu2022 | notes | Crossref-abstract numbers dropped; affiliation sentence added; "needs_download.md" -> "data/manual_downloads.md" | `references/xu2022/crossref.json`: `abstract` is null; Sun Yat-Sen University on 6 authors, Zhejiang University on 2, 6 with none (8 of 14). `data/manual_downloads.md` lists xu2022. | confirmed |
| meng2023 (papers) | license | "arXiv-nonexclusive (...)" -> empty | No `references/meng2023/crossref.json`; no licence notice in the cached PDF text; PDF is a Foxit print copy (2023-11-08). Convention (k) not met, so empty is correct. `redistribution` stays `restricted_local_only` (consistent with the other arXiv-only rows with empty licence: 80 such rows carry `restricted_local_only`, 2 `unknown`, by my count; the disposition's "about 85" is approximate). | confirmed |
| meng2023 (papers) | notes | appended licence sentence | as above | confirmed |
| meng2023-a | extinction_ratio_db | 1.98 -> 5.34 | p.11 "(5.34, 4.15, 2.81, 2.32, 1.98) (dB) as shown in Figure 7(a)-(e)"; render: (a) labelled "56 Gbit/s OOK", (e) "224 Gbit/s PAM4". meng2023-b/-c are 56 Gb/s OOK rows. | confirmed |
| meng2023-a | evidence `extinction_ratio_db` | value 1.98 -> 5.34; locator Fig. 7(e) -> Fig. 7(a); note rewritten | p.11 | confirmed |
| meng2023-a | evidence `eo_film_thickness_nm` | `entries` item deleted; `derived` formula annotated | p.5 "ridge height (h) is 260 nm ... thickness (s) of the slab part is 240 nm"; film thickness not stated. CSV 500 is now backed by the `derived` item (validator accepts). | confirmed |
| meng2023-a | notes | ER sentence rewritten (5.34 entered, others listed incl. 1.98 at 224 Gb/s PAM4); "(not stated directly)" -> "(not stated; computed by the distiller)" | p.11; p.5 | confirmed |
| renaud2023-3um-738 | z0_ohm | 50 -> empty; `z0_ohm:approx` removed; evidence entry (design_target) deleted | p.2 "COMSOL simulations are used to design electrodes with impedance close to 50 Ω" (design intent only); p.3 "CPW impedence mismatch". No fabricated Z0 given. | confirmed |
| renaud2023-3um-738 | rf_loss_db_per_cm | 7.99 -> empty; `rf_loss_db_per_cm:approx` removed; evidence entry and `derived` item deleted (`derived: []`) | p.3 states only "1.35 dB cm-1 GHz-1/2"; 35 GHz evaluation point was the distiller's. | confirmed |
| renaud2023-3um-738 | rf_loss_freq_ghz | 35 -> empty; evidence entry deleted | p.3 | confirmed |
| renaud2023-3um-738 | bw_basis | extracted_from_figure -> measured | p.3 text "The extracted 3 dB bandwidth is approximately 35 GHz (w.r.t. to 3 GHz)" (authors' Bessel fit of measured sidebands). `approx` qualifier kept. | confirmed |
| renaud2023-3um-738 | evidence `bw3db_ghz` basis | extracted_from_figure -> measured; note appended | p.3 | confirmed |
| renaud2023-3um-738 | evidence `extinction_ratio_db` basis | extracted_from_figure -> measured; locator reordered | p.3 text "~ 21 dB for 3 μm gap devices (Fig. 2b, inset)"; inset label "21 dB" | confirmed |
| renaud2023-3um-738 | notes | RF-loss, Z0 and Discussion 0.7 dB sentences | p.2 "Y-splitters with excess losses of approximately 0.2 dB/splitter"; p.2 0.7 +- 0.2 dB/cm; p.5 "on-chip insertion loss as low as 0.7 dB" | confirmed |
| renaud2023-3um-638 | notes | appended "Fig. 2(a) point reads about 0.47 V (text 0.45 V)." | p.3 Fig. 2(a), 400 dpi crop, my approx reading 0.47 V at about 640 nm | confirmed |
| renaud2023-3um-838 | notes | appended "Fig. 2(a) point reads about 0.81 V (text 0.85 V)." | same crop, my approx reading 0.81 V at about 843 nm | confirmed |
| valdez2023 (papers) | published_on | 2023-01-30 -> empty | p.1 stamp "arXiv:2211.05208v2 ... 25 Jan 2023"; crossref.json published-online 2023-01-30 (journal). Schema: `published_on` = first public version; v1 (2211 id) predates it and is not in the cache. | confirmed |
| valdez2023 (papers) | notes | appended published_on sentence | as above | confirmed |
| valdez2023-cw1, -cw2, -cn1, -cn2, -ow1, -ow2, -on1, -on2 | modulation_format | "none (small-signal ...)" -> empty (8 cells); 8 evidence entries deleted | No data-modulation experiment in the text (no OOK/PAM/eye hits outside references). | confirmed |
| same 8 rows | notes | appended "No data modulation reported (small-signal EO S21 and Vpi only)." | as above | confirmed |
| valdez2023-cn1, -cn2 | il_onchip_excludes | "...; whether the 1.2 dB wide-Si feeder loss is included is not stated" -> "edge coupling (estimated 4.2 dB/edge, C-band) and wide-Si feeder sections (1.2 dB, attributed separately)" | p.7 "1.2 dB of the insertion loss is attributed to the feeder sections alone"; "edge coupling losses are then estimated to be 4.2 dB per edge ... C-band"; "insertion loss of the phase-shifter section, 3-dB MMI couplers, and LN transitions ... 1.6 dB and 2.1 dB" (CSV il_onchip_db 1.6 / 2.1 unchanged and matching). | confirmed |
| valdez2023-cn1, -cn2 | qualifiers | `prop_loss_db_per_cm:approx` removed | p.7 "Assuming all other losses are common, the loss from the phase-shifter would then be 1.5 dB/cm." No approximation word; evidence basis `derived` kept. | confirmed |
| valdez2023-on1 | notes | appended "Vpi x L = 2.6 V*cm (Fig. 7(d)) is above the p.12 text O-band range of 2.0-2.3 V*cm." | p.11 Fig. 7(d) render: ON1 L = 1.0 cm, Vpi = 2.6 V; p.12 "O-band modulators have a lower VπL of 2.0 V.cm to 2.3 V.cm" | confirmed |
| valdez2023-on2 | notes | appended "Vpi x L = 4.37 V x 0.54 cm = 2.36 V*cm ..." | Fig. 7(d): ON2 L = 0.54 cm, Vpi = 4.37 V; 4.37 x 0.54 = 2.36 | confirmed |
| Sandia National Laboratories | notes | "...; Si photonics foundry process (ref. 4 of the paper)" -> "...(author affiliation in valdez2022, weigel2018); Si photonics foundry process named in weigel2018 (its ref. 4); fabrication assistance acknowledged in valdez2023" | valdez2022 p.1 affiliation 2; weigel2018 affiliation 2 and "realized in a foundry Si photonics process [4]", ref. [4] "Radio frequency silicon photonics at Sandia National Laboratories"; valdez2023 p.16 Acknowledgments "(Sandia National Laboratories) for discussions and fabrication assistance" | confirmed |

## Rejected / deferred findings

| ID | Disposition | Check | Verdict |
|---|---|---|---|
| R2-F6 | deferred (out-of-scope `source.json`) | `references/valdez2022/source.json` has the doi.org URL and CC-BY-4.0; `source.pdf` p.1 stamp "arXiv:2210.14785v1 ... 26 Oct 2022", dvips 2022-10-28. papers.csv already states numbers are from arXiv v1 and labels the licence as the journal version's. | deferral supported |
| R2-F5 (year part) | deferred (policy) | valdez2023 `year` 2023 = journal year and cached v2 year; arXiv id 2211.05208 implies v1 in 2022-11. Policy question, not a source error. | deferral supported |
| R2-F4 (redistribution) | kept `restricted_local_only` | conservative default; consistent with peer rows | supported |

No findings were rejected.

## Metadata / notes check

All new notes text is accurate against the sources above. No absolute or home-relative paths (only the repo-relative `data/manual_downloads.md`), no emoji, no private information. Only non-ASCII character in the in-scope added lines is the pre-existing author name "Pittalà" in xu2022.

Cosmetic only (no fix required): renaud2023-3um-738 `notes` now reads "... are simulated; Electrodes designed for Z close to 50 ohm ..." (capital E after a semicolon, from the in-place replacement).

## Checks run

- `uv run python scripts/validate_db.py`: 0 error(s).
- Evidence vs CSV for every changed evidence-required cell: valdez2022-a bw3db_ghz 110 = entry 110; optical_power_handling_dbm 20.4 = 20.4; meng2023-a extinction_ratio_db 5.34 = entry 5.34; eo_film_thickness_nm 500 = derived 500 (no entry); renaud2023-3um-738 bw3db_ghz 35 = 35 (measured), extinction_ratio_db 21 = 21 (measured); z0_ohm, rf_loss_db_per_cm, rf_loss_freq_ghz empty with no entries; valdez2023-cn1/-cn2 prop_loss 1.5 = 1.5, il_onchip 2.1/1.6 = 2.1/1.6; all 9 cleared `modulation_format` cells empty with no entries. No qualifier remains on an empty field in the changed rows.

## Issues

None.

## Unrecorded changes

None. Every in-scope cell change in `papers.csv`, `devices.csv`, `organizations.csv` and the four evidence files maps to R2-F1..F5 and F7..F19 in the disposition file.
