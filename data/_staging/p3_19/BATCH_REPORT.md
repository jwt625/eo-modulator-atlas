# p3_19 batch report (verified_on 2026-10-02)

Papers: soma2025, fukui2025, sun2026a, prountzou2026 (free-space / metasurface EO modulators, auxiliary scope, not directly comparable to waveguide Vpi). Dry-run merge: `uv run python scripts/merge_staging.py data/_staging/p3_19` -> papers 4, devices 8, orgs 11, evidence 4; conflicts 0; validation errors 0 (nothing written). No sim configs (free-space resonant devices, none is a dielectric traveling-wave device). Engine not run. Cache: `text.md` and `figures/` were present for all four; no repair needed; `source.pdf` and `source.json` untouched. `crossref.json` present for soma2025 and prountzou2026 only (no DOI for fukui2025 and sun2026a).

All batch-CSV `notes` claims were treated as unverified hints; every number below was read from the cached text/figures (Figs. 3-5 and Table pages rendered and checked for soma2025, fukui2025, sun2026a, prountzou2026).

## Versions and rights
| Paper | Numbers come from | License handling |
|---|---|---|
| soma2025 | arXiv 2503.17986v1 (13 pp, stamp 2025-03-23); Supplementary Sections/Table/Figs not in cache. Journal: Nature Nanotechnology 20(11) 1625-1632, issued 2025-09-10 (Crossref), not read | license and published_on empty, restricted_local_only (Crossref has no open license) |
| fukui2025 | arXiv 2505.07072v1 (23 pp incl. Supplementary Notes 1-8, Table S1); no journal version or DOI in the file | license and published_on empty, restricted_local_only |
| sun2026a | arXiv 2608.00286v1 (48 pp incl. SI, stamp 2026-07-31); no DOI in the file | doi left blank on purpose (the DOI in the arXiv listing metadata belongs to an unrelated paper); license and published_on empty, restricted_local_only |
| prountzou2026 | arXiv 2601.20434v1 (24 pp, stamp 2026-01-28); SI sections 1-6 not in cache. Journal: ACS Photonics 13(10) 2928-2936, online 2026-05-05 (Crossref) not read | license and published_on empty, restricted_local_only; Crossref lists CC-BY-4.0 for the version of record only |

## soma2025
- Status: distilled. Rows: 1 paper, 2 devices (a 60 um square, 1563 nm; b 10 um square with 20-layer DBR). repro_grade C, sim config none.
- Headline: Vreq 2.5 V (voltage for one-linewidth resonance shift), eta = dR/Vreq 0.25 1/V, dR 0.63 at 3.3 V, ER 11 dB, IL 2 dB, Q about 2400, S 0.26 nm/V, 46 MHz, 50 Mbps NRZ at 0.2 V and 100 Mbps PAM4 at 0.8 V (row a); 10 um device 0.38 GHz, Q 665, S 0.18 nm/V, 20 dB passive extinction, 1.0 Gbps NRZ and 1.6 Gbps PAM4 at Vpp 1 V (row b). Vreq, eta, dR and r33 58 pm/V (author estimate) are in notes (no column).
- Not reported: Vpi (not applicable), IL for the 10 um device, optical input power, capacitance, temperature, wafer supplier; Supplementary Table 1 (full parameter list) not cached.
- Judgment calls and discrepancies:
  - Q of row b: Fig. 4d label says 665, Extended Data Table I and sun2026a Table 1 say 655; entered 665 (figure) and flagged.
  - Vreq 11.2 V for row b is not reproduced by lambda/Q/S from the rounded S and Q (about 13 V); recorded in notes, not resolved.
  - Fig. 4g: 1.6 Gbps PAM4 (0.8 GBd, with DSP) sits at BER about 1e-2, between the 7% HD-FEC and 20% SD-FEC lines, while the text says BERs below the FEC threshold; noted. 1.0 Gbps NRZ without DSP is below the HD-FEC line.
  - The 2 dB insertion loss is used for il_onchip_db with the definition caveat in il_onchip_includes/excludes (reflectance normalized to an on-chip aluminium mirror).
  - Foundry: paper writes "Takeda Cleanroom"; org name matched to the sibling batch spelling "Takeda Sentanchi Super Cleanroom" (p3_08).
- CSV hints: all verified (0.2 V/50 Mbps, 1 V/1.6 Gbps). Platform guess eo_polymer is the EO material; waveguide_platform is `other`.

## fukui2025
- Status: distilled. Rows: 1 paper, 2 devices (a measured 40x40 um InP-membrane HCG; b the authors' numerical projection at ND 1e19 cm-3, r33 200 pm/V). repro_grade C, sim config none.
- Headline (a): 17.5 GHz 3 dB EO bandwidth (VNA, crossing observed), Q 102, loss at most 0.56 dB (R+T above 0.88; entered with lt), 18 pm/V, capacitance 227 fF, dR/R 3.1% and dT/T 3.35% at 20 Vpp 200 Hz (notes), r33 about 20 pm/V (author estimate).
- Row b (all simulated/predicted, basis labeled): bw above 40 GHz, Q 930, 0.24 dB, 0.18 nm/V; 5.6 Vpp for 5 dB is predicted and is in notes only (audit F17).
- Not reported: optical input power, extinction ratio, data transmission, temperature, EO polymer thickness; wafer supplier.
- Judgment calls: electrode gap 0.345 um is derived (period 750 nm minus bar width 405 nm) and listed under `derived`; electrode metal order Ni/Ti/Au (Methods, Fig. S2) vs Ti/Ni/Au (p.3 text) noted; National Institute of Information and Communications Technology placed in companies (non-university affiliation); d.lab entered as facility under The University of Tokyo.
- CSV hints: all verified (17.5 GHz, Q 102, 0.56 dB). Band: 1510 nm entered as `other`.

## sun2026a
- Status: distilled. Rows: 1 paper, 2 devices (a 2 mm x 2 mm DC characterization; b 0.3 mm x 0.3 mm GHz response). repro_grade C, sim config none.
- Headline (b): eta_mod about 0.020 1/V (calculated by the authors, Supp. Note 6), -3 dB EO bandwidth about 0.8 GHz, Q about 1320, r_eff about 151 pm/V (author estimate, notes), S 0.071 nm/V (at 100 V; 0.065 nm/V over 0-20 V in notes), capacitance 4.33 pF (author estimate). Row a: eta_mod about 0.014 1/V, Q about 1370, S 0.057 nm/V, r_eff 118/126 pm/V (notes), coercive voltage about 20 V.
- Not reported: operating wavelength of row b (not stated numerically), optical input power, insertion loss, extinction, temperature, EO bandwidth of the 2 mm device.
- Judgment calls: doi blank (see above); band 1579 nm as l_band; geometry values labeled design_target (nominal), BTO thickness 280 nm measured by ellipsometry; capacitance entered with basis author_estimate and approx qualifier; Soitec as wafer_supplier (SOI substrates for BTO growth); Irvine Materials Research Institute entered as facility under the University of California, Irvine and listed in companies.
- CSV hints: all verified (Q above 1300, 0.020 1/V, 0.8 GHz, 151 pm/V); arXiv DOI flag confirmed (file gives no DOI).

## prountzou2026
- Status: distilled. Rows: 1 paper, 2 devices (a embedded; b conformal). repro_grade C, sim config none.
- Headline: |dT/T| 0.08% (embedded) and 0.12% (conformal) at 1.5 V, 400 kHz (notes, no column); Q 200 and about 115; 3 dB drop near 1 MHz (bw3db 0.001 GHz approx), measured to 5 MHz, RC-limited; conformal poling 10 V DC (33 MV/m) for 100 min gives up to 25% more modulation, stable about one hour after bias removal.
- Not reported (in cache): SI sections 1-6 (FEM details, Fano fits, AC/RC data, embedded-device poling), optical input power, loss, extinction, temperature.
- Judgment calls: authors per Crossref (six, including Morgan Trassin; arXiv v1 lists five); 1.5 V entered as drive_vpp_v with a note (paper writes amplitude and Vpp interchangeably); 3 dB reference level is not stated (response peaks near 0.1-0.2 MHz); foundry_or_fab empty (BRNC/FIRST/ScopeM thanked for assistance only); band `visible_nir`; Fig. 1 caption SEM (p 500 nm, d 200 nm) differs from the text-stated embedded device (radius 125 nm, period 500 nm), text values used.
- CSV hints: author list incomplete (Trassin missing); abstract claims verified (Q up to 200, 5 MHz, up to 25% poling gain; "up to 75% over previous work" is cumulative, not entered).

## Organizations
11 new orgs (National Institute of Information and Communications Technology, d.lab, Takeda Sentanchi Super Cleanroom, Harvard University, Center for Nanoscale Systems, La Luce Cristallina, Inc., Graz University of Technology, University of California, Irvine, Irvine Materials Research Institute, The University of Texas at Austin, Monarch Quantum). Several (NICT, Harvard, CNS, Takeda) also appear in sibling staging batches with identical type/country/region, so the merge will not conflict. Existing orgs reused: The University of Tokyo, Karlsruhe Institute of Technology, ETH Zurich.

## Audit corrections (2026-10-03)
Applied against `data/_staging/audits/p3_16-p3_19-q1-claude-ingest-2026-10-03.md`; per-finding dispositions in `AUDIT_DISPOSITIONS.md`. Each finding was re-checked against the cached text and page renders before applying.
- F8: soma2025 and prountzou2026 `source_type` arxiv_preprint and `url` the versioned arXiv PDF; the journal citation stays in `venue` and `doi`.
- F14c: soma2025-a `er_type` static. F17: row notes state that `length_mm` is the aperture and that `il_onchip_db` is a free-space loss; fukui2025-b `drive_vpp_v` emptied (predicted 5.6 Vpp stays in notes), evidence entry removed.
- F9 (UT Austin duplicate across p3_17/p3_19): not renamed here, listed for the coordinator.
- Dry-run merge of p3_16 + p3_17 + p3_18 + p3_19 after the corrections: `merge counts: papers 19, devices 52, orgs 52, evidence 19; conflicts: 0; validation errors: 0`.
