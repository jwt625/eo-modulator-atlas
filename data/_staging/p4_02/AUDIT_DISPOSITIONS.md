# AUDIT_DISPOSITIONS p4_02

Audit: `data/_staging/audits/p4_02-q1-claude-audit-2026-10-04.md`
Date: 2026-10-04
Scope: `data/_staging/p4_02/` (papers.csv, devices.csv, evidence/*.yaml, BATCH_REPORT.md) and `sims/li2026aa/config.yaml`. audit_status left as needs_audit. Every finding re-checked against `references/<paper_id>/text.md` and the page renders.

| ID | Severity | Disposition | Exact change (file, row, column, old -> new) or reason |
|---|---|---|---|
| F1 | blocking | applied | Re-read Table 1 note d ("Extrapolated"), abstract, p.3 text, Fig. 3(d): measured EO circles span about 27-34 GHz; red curve to 40 GHz is simulation; the 50 GHz crossing is a dotted fit. devices.csv lee2026-a: `bw3db_ghz` 50 -> 40; `qualifiers` '' -> `bw3db_ghz:gt`; `bw_basis` derived -> author_estimate; `bw_measured_to_ghz` 40 -> 35; notes appended with the extrapolated 50 GHz and FOM 17.4 GHz/V not entered. evidence/lee2026.yaml: bw3db_ghz (50, derived) -> (40, author_estimate, p.3 conclusion "exceeding 40 GHz"; p.8 Table 1 notes c, d); bw_measured_to_ghz (40) -> (35, measured, p.1 abstract "25-35 GHz"; p.6 Fig. 3(d)). |
| F2 | numerical | applied | The 2.7 dB drop at 40 GHz has no measured point (EO circles end near 34 GHz; the paper says it is the signal-generator limit and the response is simulated from measured S-parameters). devices.csv lee2026-a: `eo_rolloff_db` 2.7 -> empty; `eo_rolloff_freq_ghz` 40 -> empty; statement moved to notes. evidence/lee2026.yaml: both entries deleted. |
| F3 | numerical | applied-adjusted | Source: p.3 gives 18.4 V*cm "for the smallest-gap modulator" (1.5 um film, gaps 10-12 um; Fig. 3(c)/(d) legend G = 10 um) and 31.4 V*cm for the 0.9 um film (gaps 13.2 and 15.6 um; Fig. 3(c) marker at 13.2 um reads about 31.7, at 15.6 um about 36). Added devices.csv rows didier2026-g and didier2026-h (copied geometry from -e and -c; length, Vpi, IL empty because not stated). Adjusted: `wavelength_nm` 4000 taken from the Fig. 3(c) caption although the Fig. 3(d) G = 10 um marker reads about 18.5 at 3.95 um and 21 at 4.0 um; discrepancy in row notes and evidence note. `vpil_dc_vcm` basis derived (authors' quoted product). Evidence entries added for wavelength_nm, vpil_dc_vcm, electrode_gap_um (extracted_from_figure) and the geometry fields, plus derived slab_thickness_nm. papers.csv didier2026 notes: "31.4 ... not entered as a row" sentence replaced by one describing rows g and h. |
| F4 | numerical | applied | Abstract and p.9: 0.6 dB/mm is excess loss normalised to a straight waveguide whose loss is not reported. devices.csv li2025a-a: `prop_loss_db_per_cm` 6 -> empty; qualifier `prop_loss_db_per_cm:approx` removed; notes appended. evidence/li2025a.yaml: prop_loss_db_per_cm entry deleted. |
| F5 | metadata | rejected | The affiliation reads "The Hong Kong University of Science and Technology (Guangzhou)" and the paper states no relation to the Hong Kong campus; per coordinator rule parent_org stays empty. organizations.csv unchanged (notes already say separate entry). |
| F6 | minor | applied | Re-read Fig. 3(d): teal G = 10.5 um marker at 4.0 um reads about 22.5, matching -a (22.4). devices.csv didier2026-e and -f notes appended: "4.0 um teal marker (about 22.5) matches -a; same device likely but not stated." length_mm stays empty. |
| F7 | minor | applied | Fig. 4(c) schematic shows AWG -> Amplifier -> DUT. devices.csv didier2026-a `driver`: "arbitrary waveform generator (20 GS/s); amplifier not stated for the transmission experiment" -> "20 GS/s arbitrary waveform generator followed by an amplifier (Fig. 4(c) schematic; model and gain not stated)". |
| F8 | minor | applied | "1484 nm" occurs once in the PAM-4 sentence (p.7) for the S-band point (1485 nm). devices.csv li2026aa-b notes: sentence removed; li2026aa-c notes: "Text writes 1484 nm once for this S-band point." appended. |
| F9 | minor | applied | p.4: 0.82 dB/facet at 1970 nm. devices.csv li2026aa-g notes: "Total 2-um coupling loss 0.82 dB per facet." -> "SSC coupling loss 0.82 dB per facet at 1970 nm (p.4, Fig. 3(a))." |
| F10 | minor | applied-adjusted | sims/li2026aa/config.yaml provenance: `geometry.electrodes.signal` note no longer carries the vertical-placement inference (width, gap, thickness stay paper_exact); new key `geometry.electrode_vertical_position` class project_inference. Adjusted locator: Methods (p.8) say Au is deposited before the SiON and the cladding is later thinned to 2 um (not that silica is etched away in the electrode regions). Geometry and targets unchanged; no engine run. |
| F11 | minor | rejected | Optional per the auditor (convention (d) allows extra wavelength points); coordinator instruction is to skip. No change. |

Counts: applied 7 (F1, F2, F4, F6, F7, F8, F9), applied-adjusted 2 (F3, F10), rejected 2 (F5, F11), deferred 0. Total 11 findings, 11 dispositioned.

## Changed numerical or blocking cells (for the independent verifier)

| device_id | column | old -> new | Source locator |
|---|---|---|---|
| lee2026-a | bw3db_ghz | 50 -> 40 (qualifier gt added) | p.3 conclusion "exceeding 40 GHz"; p.8 Table 1 note d; p.6 Fig. 3(d) |
| lee2026-a | bw_basis | derived -> author_estimate | same |
| lee2026-a | bw_measured_to_ghz | 40 -> 35 | p.1 abstract (25-35 GHz); p.6 Fig. 3(d) circles end near 34 GHz |
| lee2026-a | eo_rolloff_db | 2.7 -> empty | p.3; p.6 Fig. 3(d) caption (not a measured point) |
| lee2026-a | eo_rolloff_freq_ghz | 40 -> empty | p.3 |
| li2025a-a | prop_loss_db_per_cm | 6 (approx) -> empty | p.1 abstract; p.9; Fig. 3(f) y axis "Excess loss" |
| didier2026-g (new) | vpil_dc_vcm | empty -> 18.4 | p.3; p.5 Fig. 3(c) |
| didier2026-g (new) | electrode_gap_um | empty -> 10 | p.3; p.5 Fig. 3(c), 3(d) legend |
| didier2026-g (new) | wavelength_nm | empty -> 4000 | p.5 Fig. 3(c) caption (Fig. 3(d) suggests 3.95 um) |
| didier2026-h (new) | vpil_dc_vcm | empty -> 31.4 | p.3; p.5 Fig. 3(c) |
| didier2026-h (new) | electrode_gap_um | empty -> 13.2 | p.3; p.5 Fig. 3(c) |
| didier2026-h (new) | wavelength_nm | empty -> 4000 | p.5 Fig. 3(c) caption |

## Deferred items needing decisions

None. Open note for the coordinator: lee2026 `bw_measured_to_ghz` = 35 follows the abstract range of the measured Vpi,MW and EO points; if the policy prefers the instrument limit (40 GHz, stated as signal generator and VNA limit) it is a one-cell change, with bw3db_ghz unchanged.

## Verification follow-up (coordinator, 2026-10-04)

Verifier `data/_staging/audits/p4_02-verify-claude-audit-2026-10-04.md`: 14 of 14 confirmed (lee2026-a measured-to 35 confirmed: last measured points at about 34 GHz). New minor N2 applied: didier2026-g note now says the paper attributes the about 150 uW output to "the modulator with the lowest Vpi" (text p.5), likely but not stated to be this device. N4 applied: li2025a-a note records that the authors label the 0.6 dB/mm as propagation loss and quote alpha*VpiL 7.4 dB*V (p.1, p.3). N1 (didier2026-g wavelength 3.95 vs 4.0 um) already disclosed; N3 (sim key naming) no change. No value changed.
