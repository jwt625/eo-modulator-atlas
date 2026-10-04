# BATCH_REPORT p4_02 (2026-10-04)

Papers: li2025a, didier2026, lee2026, li2026aa. All four sources are cached with crossref.json and text.md; no network use; nothing written outside data/_staging/p4_02/ and sims/li2026aa/.

Validation: `uv run python scripts/merge_staging.py data/_staging/p4_02` -> papers 4, devices 20, orgs 13, evidence 4; conflicts 0; validation errors 0 (dry run).

## li2025a - distilled
- Rows: 1 (li2025a-a, 2.8 mm apodized-grating slow-light MZM). repro_grade C. No sim config.
- Version: cached file is the author manuscript (Word-made PDF, 2024-11-26), not the Laser & Photonics Reviews VoR. arxiv_id 2411.17480 and first-public date come from the batch CSV only; published_on left empty. Crossref license = Wiley TDM only, so the batch hint (CC0) is not used; redistribution restricted_local_only.
- Not reported in the main text: electrode gap/widths/thickness (Supp. Note IV), fabrication facility, Vpi sweep wavelength, IL on-chip or fiber-to-fiber, capacitance, Z0, n_RF, RF loss.
- Judgment calls: VpiL 1.23 entered as derived (Vpi 4.4 V x 2.8 mm); bw3db 67 with gt (flat, no crossing); prop loss left empty after audit (0.6 dB/mm is an excess loss over a straight reference waveguide; in notes); ER 4.5 dB is dynamic (100 Gb/s OOK, 2 Vpp); rib_width 600 nm = central width w0 (corrugation separate); max_baud 100 GBd derived; 320 GHz simulated bandwidth not entered. Abstract FOM 186 vs Table/Discussion 182.
- CSV hints: title/identity fine; hyphens normalised to ASCII.

## didier2026 - distilled
- Rows: 8 after audit corrections (g, h added: minimum VpiL 18.4 V*cm at G 10 um, 1.5 um film; 31.4 V*cm at G 13.2 um, 0.9 um film); originally 6 (a headline 1.5 um film, 8 mm, G 10.5 um at 4.0 um; b 6.6 mm bandwidth point; c, d 0.9 um film 4 and 5 mm bandwidth points; e, f wavelength points 4.3 and 4.5 um of the G 10.5 um modulator). repro_grade C. No sim config.
- Source: journal VoR (CC BY 4.0). Appendices B, C, E (RF electrode design, grating couplers) are not in the 9-page cache; signal/ground widths are therefore missing.
- Judgment calls: VpiL 22.4 derived (text) vs 22 (abstract/caption); drive push_pull and mzm_push_pull derived (authors write "differential field, antisymmetric phase"); on-chip IL "at most 4 dB" entered as 4 with lt, basis derived; bw3db 20 with gt (no roll-off, VNA/detector limit); waveguide_platform other (LNOS); 0.9 um bandwidth: text says 16 GHz, caption 15 GHz, figure crossings read about 16 (4 mm, entered as text value) and 14 (5 mm); rows e/f VpiL read from Fig. 3(d) teal markers, IL text not tied to a named device; slab thickness derived in the evidence list.
- Not reported: signal/ground widths, Z0, n_RF, RF loss, device capacitance, Vpi for the 0.9 um devices, energy per bit, drive amplitude.

## lee2026 - distilled
- Rows: 5 (a 2.7 um with RF/ER/comm data; b 2.4 um; c 3.6 um; d 1.55 um; e double-pass phase modulator, EO comb). repro_grade C. No sim config.
- Version: arXiv v1 (stamp 2026-01-24), journal version not read (Crossref issued 2026-09-17, no volume/article number). Pattern copied from existing arXiv-sourced rows (arxiv_preprint, access arxiv, url arXiv pdf v1, license empty, restricted_local_only).
- Judgment calls: Vpi at 2.7 um read from the Fig. 2(b) label (text gives only the endpoints); after audit: bw3db 40 with gt (authors: exceeding 40 GHz), basis author_estimate, measured to 35 GHz; the 50 GHz extrapolation and the 2.7 dB drop at 40 GHz (simulated, not measured) are in notes only, not in cells; reference 2 GHz; RF Vpi 5 V at 27 GHz from the Fig. 3 caption; max line rate 3 Gb/s is PAM-4 1.5 GBd x 2 (derived list); slab 300 nm (text) vs 0.25 um (caption), text used; Z0 and n_RF stated only as matched, left empty; active-region loss (6.4, 10.5 dB/cm) used for b, c and passive loss in notes; Vpi 4.3 V (text) vs 4.26 V (caption).
- Not reported: signal/ground widths, total insertion loss, drive amplitude, phase-modulator Vpi.

## li2026aa - distilled
- Rows: 8 (a to h: 1310, 1450, 1485, 1550, 1590, 1653, 1970, 2000 nm; 9 mm MZM). repro_grade B. Sim config: sims/li2026aa/config.yaml (device li2026aa-d, 1550 nm; no engine run).
- Source: journal VoR, CC BY-NC-ND 4.0 -> restricted_local_only. Crossref lists a Research Square preprint (not consulted). Supplementary Notes 1-10 not cached.
- Batch CSV hint resolved: VpiL 1.92 to 3.94 V*cm are in the main text (calculated from Vpi x 9 mm; entered as derived); Vpi values from Fig. 3(b) insets.
- Judgment calls: bandwidth about 100 GHz (a, c, d, e) entered approx with measured-to 110 GHz; 1450 and 1653 nm >67 GHz (VNA); 1970 and 2000 nm >50 GHz (PD limited region from 50 GHz, figure read); on-chip IL (1.2, 2.8, 5.8 dB) derived, coupling excluded by implication; ER (17, 15, 18 dB) approx static; max rates from Fig. 4(d) (2000 nm OOK about 140 Gb/s figure-read; text/eye diagrams show 160 and 130 Gb/s, 150 for the 2-um band); max_baud = OOK rate (derived, 1970 nm from Table 2); RF-line figures (Z0 42, n_RF 2.13, simulated) on the 1550 nm row only; wavelength rows for ng only where the paper labels it (1310, 1550, 2000).
- Sim config inferences: waveguide centred in the 6 um gap, sidewall angle taken from horizontal, cladding 2 um above ridge top, Au on the slab level, silicon thickness nominal; LN/SiO2/Si constants are standard-reference placeholders as in chen2022.
- Not reported: waveguide lateral position, measured Z0/RF loss, silicon thickness, fab details beyond the named facility.

## New organizations (13)
The Hong Kong University of Science and Technology (Guangzhou); ShanghaiTech University; University of California, Berkeley; University of Southern California; Tel Aviv University; TOPTICA Photonics Inc.; Lawrence Berkeley National Laboratory; John O'Brien Nanofabrication Laboratory; Institute of Semiconductors, Chinese Academy of Sciences; Wuhan ANPI Optoelectronics Company Ltd; Optics Valley Laboratory; Hubei Optical Fundamental Research Center; Center of Optoelectronic Micro and Nano Fabrication and Characterizing Facility. Reused: Zhejiang University, ETH Zurich, Binnig and Rohrer Nanotechnology Center, FIRST cleanroom of ETH Zurich, International Business Machines Corporation Research Zurich, Intel Corporation, Huazhong University of Science and Technology, Fudan University.

## Blockers
None. No needs_download.
