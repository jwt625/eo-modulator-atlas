---
verifier: fresh-context subagent (independent verification of audit corrections)
task: verify Q1 audit dispositions of staged batch p5_03
date: 2026-10-04
scope: data/_staging/p5_03 (sobu2026, weckenmann2026, yang2026, yin2026, aimone2026); papers.csv (5), devices.csv (7 rows), organizations.csv (empty), evidence/*.yaml (4 files, 76 entries)
mode: read-only (only this file written; no edits, no git, no network; scratch scripts in the session scratchpad)
verdict: all 8 dispositions confirmed and reflected in the staged files; 1 new minor finding (yang2026-a notes die IL range)
counts: {findings_checked: 8, changed_cells_checked: 11, confirmed: 19, not_confirmed: 0, new_findings: {blocking: 0, numerical: 0, metadata: 0, minor: 1}}
---

# p5_03 verification of audit corrections

## Method

- I read the audit (`data/_staging/audits/p5_03-q1-claude-audit-2026-10-04.md`), `AUDIT_DISPOSITIONS.md`, every populated cell of the 7 staged rows, the 5 papers rows, all 4 evidence files, and `references/<id>/text.md` in full for all 5 papers.
- I opened these renders: weckenmann2026 p.3 (Fig. 2(a)-(e)); aimone2026 p.2 and p.3, plus `img_p02_1.png` (Fig. 1(b), 1(d)); yang2026 p.2 and p.3, plus my own high-zoom crops of Fig. 2(a), 2(b), 2(d) and 2(e) rendered from `source.pdf`; yin2026 p.1 (Fig. 1(b), 1(e)) and p.2 (Fig. 2(c), 2(d), Fig. 3(b)-(f)). Figure readings are approximate unless they are printed labels.
- I ran my own mechanical check of CSV against evidence. Each evidence-required non-empty cell has exactly one entry with an equal value: 0 missing, 0 orphan, 0 mismatch, 0 duplicate across 76 entries. Since the audit, 80 - 3 (F1) - 1 (F2) - 1 (F3 VpiL) + 1 (F3 vpi_convention) = 76. Extra entries on `drive` (weckenmann2026, yang2026, aimone2026) and `vpi_convention` (aimone2026) are allowed by convention (f). There is no qualifier on an emptied field.
- Cross-check: ref. 11 of weckenmann2026 (arXiv 2509.20584, O-band) is not the existing `geravand2025` row, which is Nature Photonics 19, 740, C-band and ref. 10. So emptying the quoted metrics creates no duplicate and loses nothing already in the atlas.

## Per-paper verdicts

| Paper | Rows | Verdict | Notes |
|---|---|---|---|
| sobu2026 | 0 | corrections confirmed | F8 confirmed (refs. 6 and 7 are Y. Sobu et al.); no-device decision re-confirmed (results are post-layout Spectre simulation only) |
| weckenmann2026 | 1 | corrections confirmed | F1, F2 confirmed against p.1 Sec. 2 and Fig. 2(b) |
| yang2026 | 1 | issues (minor) | F4 confirmed; new N1 (notes die IL range) |
| yin2026 | 4 | corrections confirmed | F6 confirmed; headline cells re-checked clean |
| aimone2026 | 1 | corrections confirmed | F3, F5, F7 confirmed |

## Changed cells

| device_id | column | old -> new | Verdict | Check |
|---|---|---|---|---|
| weckenmann2026-a | q_loaded | 5300 -> empty | confirmed | p.1 Sec. 2: "quality factor of 5,300 ... [11]". This paper has no spectrum or Q figure. Its figures are BER, net rate, spectra and constellations only (p.3). |
| weckenmann2026-a | extinction_ratio_db | 10.7 -> empty | confirmed | Same sentence, "10.7-dB resonance depth ... [11]". |
| weckenmann2026-a | er_type | static -> empty | confirmed | Follows the ER cell. |
| weckenmann2026-a | bw6db_ghz | 54 -> empty | confirmed | Same sentence, "54-GHz 6-dB EO bandwidth ... [11]". There is no EO response in this paper. |
| weckenmann2026-a | bw_basis | measured -> empty | confirmed | No bandwidth cell remains. |
| weckenmann2026-a | max_baud_gbd | 220 -> 110 | confirmed | p.1 Sec. 2: "110 GBaud per subcarrier (220 GBaud total), two identical chips". p.2 Sec. 3: "60-110 GBaud per sub-channel". Fig. 2(a): QPSK points run to 220 (total). |
| weckenmann2026-a | max_net_rate_gbps | 612.9 -> empty | confirmed | Fig. 2(b): the top 16-QAM point is at 190 GBd (total), about 612 Gb/s, so it is a two-chip total. 190 x 4 / 1.24 = 612.9. The paper states no per-modulator net rate. |
| weckenmann2026-a | modulation_format | appended "net 612.9 Gb/s per polarization (16-QAM, 190 GBd total, two-chip super-channel)" | confirmed | p.2 Sec. 3. Fig. 2(b). The evidence value equals the CSV. |
| aimone2026-a | vpil_dc_vcm | 1.1 -> empty | confirmed | p.1 Sec. 2: "Vπ ... 3.26 V, which translates to a very low VπL = 1.1 Vcm referenced to the single-ended signal". 3.26 x 0.75 = 2.45 V cm, or 1.22 V cm if halved. Neither is 1.1, so the value cannot be reproduced from the stated Vpi and length. |
| aimone2026-a | vpi_convention | unspecified -> mzm_push_pull | confirmed | p.1 Sec. 2: the inner TWE "is identical to the one of a modulator to be driven in a standard GSG fashion and can be characterized stand-alone". Convention (f) counts a single GSG feed as push_pull. The evidence basis is derived and the note says it is implied. |
| yang2026-a | il_onchip_excludes | empty -> "Grating couplers (input and output); wafer median over dies" | confirmed | Fig. 2(b) caption: "insertion loss (excluding grating coupler)". p.2-3 text: "median IL of 2.4 dB is obtained excluding the grating couplers". The setup uses two grating couplers (p.2). |

## Other dispositions (no numerical cell change)

| ID | Verdict | Check |
|---|---|---|
| F5 (aimone2026 notes, S21 dips) | confirmed | `img_p02_1.png` Fig. 1(b): the measured trace is normalized at its peak near 4-5 GHz. It ends near 65-67 GHz with noise dips to about -3 dB near 58-63 GHz (approx.). The gt 67 bound follows the authors' statement. The dashed EM trace is not used. |
| F6 (yin2026-a notes, inductor peaking) | confirmed | Fig. 2(d): the with-inductor trace peaks about +4 to +4.5 dB near 55 GHz and ends near 0 dB at 67 GHz (approx.). |
| F7 (aimone2026 energy note) | confirmed | p.2: 605 mW per channel. p.3: "Considering the gross data rate ... 1.4 pJ/bit". 605 mW / (140 GBd x 3 b) = 1.44 pJ/bit. The CSV notes and the evidence note agree. |
| F8 (sobu2026 notes) | confirmed | p.3 refs. [6] and [7] are by Y. Sobu et al. Table 1 caption: "[3-7]". |

The disposition table has no rejected or deferred findings.

## Independent headline re-check (all rows)

- **weckenmann2026-a.**
  - Confirmed: band o_band (p.1, "O-band net bit rate"); drive push_pull ("single-drive push-pull"); drive_vpp_v 2 approx (about 4 Vpp, "2 Vpp per MRM"); optical_input_power_dbm 15 ("15 dBm per modulator input", SOA output).
  - Correctly empty: wavelength, Vpi, IL and energy. None of them is stated.
- **yang2026-a.**
  - Confirmed: length 0.5 mm; wavelength 1310 nm; drive_vpp_v 2.7.
  - Bandwidth: bw3db_ghz 94.7. The median of the 12 printed die values in Fig. 2(e) (89.8-100.1) is 94.75 GHz. In Fig. 2(d) the traces cross -3 dB near 93-108 GHz inside the 110 GHz axis, so bw_measured_to_ghz 110 is extracted_from_figure.
  - Insertion loss: il_onchip_db 2.4. The median of the 12 Fig. 2(b) die values is (2.29 + 2.44) / 2 = 2.37 dB.
  - Vpi*L: vpil_dc_vcm 0.66 derived. Fig. 2(a) gives Δλ 0.92 nm and FSR 4.04 nm at 6 V, so 6 x 2.02 / 0.92 x 0.05 = 0.659 V cm. vpi_convention is unspecified.
  - Eye and rate values: ER 4.3 dB is dynamic (Fig. 3(b) label). max_baud 150 (Fig. 3(e)). max_line_rate 400 (text; the Fig. 3(f) label reads 405, as noted).
  - Observation, not a defect: the Fig. 1(d) cross-section is the series push-pull layout, with a common N++ at the centre DC bias and P++ outer contacts on the GSSG S and S-bar lines. `drive` differential follows the authors' "differential-drive" wording, and the series junctions are in tags and notes.
- **yin2026-a..d.**
  - Bandwidths (Fig. 2(c), 2(d) and text): -d over 67 GHz (gt; trace above about -1.5 dB at 67 GHz); -c 62 GHz; -b 40 GHz; -a gt 67 (inductor).
  - IL points: 3, 6 and 9 dB from the off-resonance maximum.
  - Eye ERs (Fig. 3 labels): -a 1.5 dB at 140 Gb/s NRZ; -b 1.8 dB at 100 Gb/s NRZ. The -a notes give 1.9 dB at 100 Gb/s.
  - Static values: Q 2000 and FSR 17.1 nm (text; the Fig. 1(e) label reads 17.1 nm).
  - Cross-section: etch 130 and slab 90 nm are Fig. 1(b) labels.
  - Rates and setup: max_line_rate 256 (-a) and 100 (-b); 0 dBm on chip; 2 Vpp.
  - Correctly empty: wavelength and max_baud. Neither is stated.
- **aimone2026-a.**
  - Device: length 7.5 mm; Vpi 3.26 V; wavelength 1550 nm (Fig. 2(a)); film 350 nm on Si; cl_twe ("periodic capacitive loading").
  - Rates (Fig. 2(b)): max_baud 180, where PAM-4 NGMI is about 0.945, above 0.8714. PAM-8 is about 0.90 at 140 GBd and about 0.79 at 160 GBd, consistent with the 120-160 GBd text. max_net_rate 347 (text).
  - Other: energy 1400 fJ/bit; optical input 23 dBm (EDFA output).
  - Correctly empty: IL and ER. Neither is stated.
- **sobu2026.** No device rows. The only results are the post-layout Spectre simulation (100 Gb/s NRZ eye, 3.45 pJ/bit at VDD 0.945 V, 345 mW) driving a PIN-RC equivalent circuit.

## Issues and new findings

**N1 (minor, new). yang2026-a notes: the die IL range is misread.**
- Cell: devices.csv yang2026-a `notes`, "individual dies about 89.8-100.1 GHz and 1.6-3.7 dB IL".
- Source: Fig. 2(b) (p.2), checked at 12x zoom from `source.pdf`. The 12 printed die values are 3.71, 3.41, 2.00, 1.46, 3.32, 3.00, 2.61, 2.08, 2.44, 2.00, 2.29 and 1.64 dB. The minimum is 1.46 dB at the centre die, not 1.64. The F4 disposition text ("die values in the map run 1.64-3.71 dB") repeats the misreading. The `il_onchip_excludes` cell does not carry the range, so no cell is affected.
- Exact fix: in yang2026-a `notes`, replace "1.6-3.7 dB IL" with "1.46-3.71 dB IL". Optionally, correct the F4 row of `AUDIT_DISPOSITIONS.md` from "1.64-3.71 dB" to "1.46-3.71 dB".

No not-confirmed items.

## Dry run

`uv run python scripts/merge_staging.py data/_staging/p5_03`:
`merge counts: {'papers': 5, 'devices': 7, 'orgs': 0, 'evidence': 4}; conflicts: 0; validation errors: 0` / `dry run (nothing written)`.
