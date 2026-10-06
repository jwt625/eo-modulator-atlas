# W5 audit: fabrication sites (Task A) and zhang2023 row split (Task B)

Date: 2026-10-05. Auditor: read-only subagent. Inputs: data/papers.csv, data/devices.csv, data/organizations.csv, data/evidence/zhang2023.yaml, references/<id>/text.md (live working tree, which the coordinator was editing during the audit; every `current` value in W5_fab.csv was re-checked against the live papers.csv at the end). No repo file was written except this report and W5_fab.csv.

## Summary

| Item | Count |
|---|---|
| Papers in papers.csv | 184 |
| Papers checked against source text | 180 |
| Papers with no text.md and no source.pdf (only crossref.json): boynton2020, li2026a, qiu2026, xu2022 | 4 (not checked, N/A) |
| Current non-empty foundry_or_fab | 69 |
| Current values verified as supported (not in CSV) | 59 |
| W5_fab.csv rows | 38 (31 foundry_or_fab, 7 wafer_supplier) |
| foundry_or_fab additions to empty papers, strong/medium | 8 (anderson2025, chen2023a, liu2023, yu2024, wang2022a, prountzou2026, wu2025, zhou2026) |
| Additions to non-empty values | 2 (johnson2025 + NLM Photonics; weigel2018 + San Diego Nanotechnology Infrastructure) |
| Current values to fix | 3 (hsu2024 replace Oregon State University with the named facility; kawahara2025 remove IHP, which made the driver only; didier2026 IBM vs sabatti2024, inconsistent) |
| Consistency pair | valdez2023 / valdez2023a (same Sandia fabrication-assistance acknowledgment, treated differently) |
| Weak, needs a decision | rakowski2026, luan2026, luan2026a, kim2025, soma2025 (optional second facility) |
| Not proposed, listed for the record | gong2026, kharel2021, tobing2026, wu2023, theurer2026, taghavi2024, nenezic2026, wolf2018a, deng2026, shen2024; bhasker2026 listed as OK |
| wafer_supplier gaps | 7 (EO-material suppliers: karakida2026, soma2025, witmer2020, taghavi2024, taghavi2026, zhang2026a, taghavi2022a weak) |
| New organizations.csv rows needed if accepted | Zhejiang University Micro and Nano Processing Platform; Westlake Center for Micro/Nano Fabrication; Zhejiang University Micro-Nano Fabrication Center; Center of Micro-Fabrication and Characterization; Liobate Technology (country N/A in paper); Materials Synthesis and Characterization Facility; plus DTU Nanolab, Holonyak Micro & Nanotechnology Lab, Nanofabrication Platform Center of School of Engineering, the University of Tokyo if the weak ones are accepted |

## Task A notes

Verified as supported (quote found in the source, value consistent with rule p): akazawa2026, berman2026, cai2025, celik2022, chelladurai2025, chen2024, churaev2023, falcone2026, fukui2025, geravand2025, gupta2023, han2023, hess2026, holzgrafe2020, karakida2026, kari2025, kieninger2020, kohli2025, larocque2024, lee2020, lee2020a, lee2026, li2020, li2026, li2026aa, li2026b, li2026ba, lin2025, lin2026, liu2025c, lotkov2024, multani2025, niels2026, powell2024, powell2024a, qiu2026a, rahman2025, renaud2023, sabatti2024, shamsansari2021, shen2021, steckler2025, sun2026a, taghavi2022a, taghavi2026, tiberi2026, tran2026, valdez2026, wang2018, wang2024a, wang2024b, wang2026a, witmer2020, yin2026, yue2023, yue2025, zhang2023, zheng2026, zhong2026.

Fabricated in a foundry the paper does not name (foundry_or_fab stays empty, no candidate): aimone2026 (commercial foundry MPW, 350 nm LN on Si), chiang2025 (commercial foundry active SiPh MPW), hu2026 (12-inch CMOS foundry), sun2026 (commercial CMOS foundry), zhang2026a (standard commercial foundry process), kholeif2026, kotz2026, schwarzenberger2026 (commercial SiP foundry), sia2022 (own platform, available commercially; foundry not named), zhang2026b (back-end-of-line CMOS foundry, unnamed), deng2026a, cai2026, yang2026, liu2026a (300 mm SiPh platform, unnamed), valdez2022, valdez2023a (Si/SiN foundry process, unnamed), montifiore2026 (ref. [15] only), derose2012 (Sandia affiliation only), patel2026 (the TSMC COUPE mention refers to a third-party switch, not this device).

Wafer supplier stated only as commercial, no name (wafer_supplier stays empty): chen2022 p.5, guo2026 p.13 (blackened LTOI), hu2026a p.8, su2026 p.2, sabatti2024 p.4 (MgO-doped TFLN), anderson2025 p.8 (bulk STO chips). kim2025 BTO-on-insulator supplier not stated (La Luce Cristallina appears only in the acknowledgments).

Other observations, no change proposed by this audit:
- List separator: 13 foundry_or_fab values use `; ` with a space where others use `;` (celik2022, churaev2023, didier2026, lee2020, lee2020a, li2026, li2026ba, lin2025, sabatti2024, valdez2023, wang2024a, wang2024b, witmer2020).
- anderson2025 `companies` lists Stanford Nano Shared Facilities (author affiliation 4), a facility in the companies column.
- Org types: Luxtelligence SA is `company` in organizations.csv; wang2024b p.9 calls it "a foundry commercializing LiNbO3 PICs" and churaev2023 p.8 says it makes LiNbO3 chips "available via foundry service". Rule e would make it `foundry`. Chongqing United Microelectronics Center Co., Ltd is `company`; same question if wu2025 is accepted.
- karakida2026 writes "Takeda Clean Room", soma2025 "Takeda Cleanroom"; both map to Takeda Sentanchi Super Cleanroom (OK per the org note).
- wang2026b acknowledges SJTU-Pinghu Institute of Intelligent Optoelectronics for flip-chip bonding and packaging only (not fabrication, not proposed).

## Task B: zhang2023 split

Source: references/zhang2023/text.md p.4-9, Fig. 2 (page_05.png, re-rendered at 6x from source.pdf into the scratch directory to read Fig. 2d/2e), evidence file data/evidence/zhang2023.yaml.

The paper reports three physical devices on one chip, and Table 1 (p.8) merges them into one "this work" line (11 pm/V, 32 dB, 104 GHz, 2 V, 100 Gb/s, 5.4 fJ/bit):

| Proposed row | Physical device | Source | Values |
|---|---|---|---|
| zhang2023-a | TPC cavity with gold microelectrodes, DC tuning | p.5 "a topological cavity with gold microelectrodes is fabricated and characterized"; Fig. 2e-f | 11 pm/V; 0 V resonance about 1559.8 nm (Fig. 2e) |
| zhang2023-b | "another topological modulator device on the same chip with a lower Q factor of 5400" | p.6; Fig. 3d; Fig. 4 | Q 5400; 104 GHz at -8 dB detuning (37/67/87 GHz at -3/-4.5/-6.5 dB); data tests 100 GBd NRZ, PAM-4/6/8; 2 Vpp; 5.4 fJ/bit; C 5.4 fF |
| zhang2023-c | TPC cavity without microelectrodes | p.5; Fig. 2d | Q 9066, linewidth 0.172 nm, IL 1.3 dB, ER 32 dB; resonance about 1558 nm (Fig. 2d) |

Judgments to confirm:
1. Fig. 4 data tests do not name the device. They are assigned to row b because p.7 introduces them as "the large bandwidth and ultracompact topological modulator" and only that device has a measured bandwidth.
2. Row b has no stated wavelength, so wavelength_nm is empty and band is `other` per convention l. The alternative is c_band from the 1558-1560 nm sibling resonances and the C-band amplifier setup. That is inference, so it is not proposed.
3. Row c has no electrodes. It is kept as a `passive_reference` row so that its IL, ER and Q are not attached to the 104 GHz device. If the database should hold modulating devices only, drop row c and move its four numbers into the notes of row a.
4. Row c ER: Fig. 2d shows the resonance as a transmission peak inside the stopband (about -1.3 dB peak, about -33 dB stopband floor). It is not a notch, but `resonance_dip` is the closest er_type.
5. The design parameters on p.4 (width 1600 nm, period 420 nm, 170 cells, D1/D2/D3) are given for "the integrated TPC cavity", not per device. They are carried on all three rows with a note. Row b's lower Q may come from a different cell count, which the paper does not state.
6. The sideband test of Fig. 3b is on "the topological device", which is not identified. It has no column values, so nothing is lost.

Proposed devices.csv rows. They use the live header, which now includes vpi_dc_freq_ghz. They replace the current zhang2023-a.

```csv
device_id,paper_id,device_label,device_class,tags,eo_material,waveguide_platform,integration,electrode_type,drive,vpi_convention,temperature_class,band,wavelength_nm,length_mm,vpi_dc_v,vpi_dc_freq_ghz,vpi_rf_v,vpi_rf_freq_ghz,vpil_dc_vcm,vpil_rf_vcm,vpi_mzm_pushpull_dc_v,bias_for_vpi_v,drive_vpp_v,vpi_basis,bw3db_ghz,bw3db_reference,bw3db_reference_freq_ghz,bw6db_ghz,bw_measured_to_ghz,eo_rolloff_db,eo_rolloff_freq_ghz,bw_basis,il_onchip_db,il_onchip_includes,il_onchip_excludes,il_fiber_to_fiber_db,prop_loss_db_per_cm,extinction_ratio_db,er_type,optical_input_power_dbm,il_basis,rf_loss_db_per_cm,rf_loss_freq_ghz,z0_ohm,n_rf,ng_opt,optical_power_handling_dbm,eo_film_thickness_nm,etch_depth_nm,rib_width_nm,slab_thickness_nm,sidewall_angle_deg,electrode_gap_um,signal_width_um,electrode_thickness_um,electrode_metal,buffer_oxide_um,substrate,cladding,crystal_cut,waveguide_orientation,epitaxy_or_stack,max_baud_gbd,modulation_format,max_line_rate_gbps,max_net_rate_gbps,energy_per_bit_fj,capacitance_ff,q_loaded,fsr_nm,tuning_nm_per_v,driver,qualifiers,evidence_ref,notes
zhang2023-a,zhang2023,"Topological-cavity modulator with Ti/Au microelectrodes, DC tuning device (Fig. 2e-f)",ring,topological;ssh_lattice;photonic_crystal_cavity;resonant;lumped,lithium_niobate,lnoi_loaded_sin,monolithic,lumped,unspecified,,,c_band,1560,0.15,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,300,,1600,,,,,0.3,Ti/Au (10 nm / 300 nm),2,silicon,,x-cut,cavity along crystal y axis,"Si substrate / 2 um SiO2 / 300 nm x-cut LN / 300 nm PECVD SiN strip 1600 nm wide with rectangular air holes (period 420 nm, 170 unit cells, D1 150 nm, D2 80 nm, D3 674 nm) / Ti-Au coplanar electrodes beside the cavity",,,,,,,,,0.011,,wavelength_nm:approx,data/evidence/zhang2023.yaml,"Split 2026-10-05 from the former single zhang2023-a row (convention d). This row is the cavity with gold microelectrodes used for DC tuning: 11 pm/V linear over +-24 V (Fig. 2f), 0 V resonance about 1559.8 nm read from Fig. 2e. Whether it is also the sideband-test device of Fig. 3b is not stated. Its Q, IL and ER are not reported; the p.6 S21 device is described as another device on the same chip (row b) and the electrode-free cavity is row c. Electrode length 150 um is stated for the topological modulator design (p.5), not per device. Cavity parameters (1600 nm width, 420 nm period, 170 cells, D1/D2/D3 150/80/674 nm) are the design values of p.4; the paper does not give per-device values. Not reported: Vpi, bandwidth, electrode gap, SiN etch depth, optical power."
zhang2023-b,zhang2023,"Topological-cavity modulator, Q 5400, high-speed device on the same chip (Fig. 3d, Fig. 4)",ring,topological;ssh_lattice;photonic_crystal_cavity;resonant;lumped;peaking,lithium_niobate,lnoi_loaded_sin,monolithic,lumped,unspecified,,,other,,0.15,,,,,,,,,2,,104,dc,,,,,,measured,,,,,,,,,,,,,,,,300,,1600,,,,,0.3,Ti/Au (10 nm / 300 nm),2,silicon,,x-cut,cavity along crystal y axis,"Si substrate / 2 um SiO2 / 300 nm x-cut LN / 300 nm PECVD SiN strip 1600 nm wide with rectangular air holes (period 420 nm, 170 unit cells, D1 150 nm, D2 80 nm, D3 674 nm) / Ti-Au coplanar electrodes beside the cavity",100,"NRZ up to 100 GBd (BER below 7% HD-FEC threshold 3.8e-3, offline DSP); PAM-4 100 Gb/s (50 GBd) and 80 Gb/s (40 GBd); PAM-6 77 Gb/s (30 GBd); PAM-8 90 Gb/s (30 GBd)",100,,5.4,5.4,5400,,,"AWG (120 GS/s) with SHF S807C RF amplifier (55 GHz 3 dB bandwidth), GS probe",drive_vpp_v:approx;energy_per_bit_fj:approx,data/evidence/zhang2023.yaml,"Split 2026-10-05 from the former single zhang2023-a row (convention d). p.6: another topological modulator device on the same chip with a lower Q of 5400 (tau 4.5 ps, photon-lifetime limit 35 GHz, calculated) was used for the 110 GHz LCA S21 (Fig. 3d). Headline 104 GHz is at the -8 dB detuning point with optical peaking and reduced efficiency; 37, 67, 87 GHz at -3, -4.5, -6.5 dB detuning. The 3 dB drop in Fig. 3d is drawn from the low-frequency level, so reference entered as dc (judgment). Data tests (Fig. 4) do not name the device; assigned here because p.7 introduces them with the large-bandwidth modulator and only this device has a measured bandwidth (judgment). Wavelength of the S21 and data runs is not stated, so wavelength_nm is empty and band is other (convention l); sibling cavities on the chip resonate near 1558-1560 nm. Energy per bit is the authors C*Vpp^2/4 with C 5.4 fF calculated for the 150 um electrode design. RC-limited bandwidth stated beyond 1.1 THz (p.5, Supplementary Note S6 not read). Cavity parameters (1600 nm width, 420 nm period, 170 cells, D1/D2/D3 150/80/674 nm) are the design values of p.4; the paper does not give per-device values. Not reported: Vpi, IL and ER of this device, electrode gap, optical power."
zhang2023-c,zhang2023,"Topological cavity without electrodes, passive reference (Fig. 2d)",ring,topological;ssh_lattice;photonic_crystal_cavity;resonant;no_electrodes;passive_reference,lithium_niobate,lnoi_loaded_sin,monolithic,,unspecified,,,c_band,1558,,,,,,,,,,,,,,,,,,,,1.3,"definition not stated (cavity transmission maximum at resonance, Fig. 2d)",definition not stated; grating-coupler normalization not stated,,,32,resonance_dip,,measured,,,,,,,300,,1600,,,,,,,2,silicon,,x-cut,cavity along crystal y axis,"Si substrate / 2 um SiO2 / 300 nm x-cut LN / 300 nm PECVD SiN strip 1600 nm wide with rectangular air holes (period 420 nm, 170 unit cells, D1 150 nm, D2 80 nm, D3 674 nm); no electrodes",,,,,,,9066,,,,wavelength_nm:approx,data/evidence/zhang2023.yaml,"Split 2026-10-05 from the former single zhang2023-a row (convention d). Electrode-free TPC cavity on the same chip (p.5, Fig. 2d): 3 dB linewidth 0.172 nm, Q 9066, IL 1.3 dB, ER 32 dB. The ER is the contrast between the resonance transmission peak and the photonic-stopband floor, not a notch depth; er_type resonance_dip is the closest enum (judgment). Table 1 (p.8) quotes this 32 dB ER for the topological modulator alongside 11 pm/V and 104 GHz, which belong to rows a and b. Resonance about 1558 nm read from Fig. 2d. No electrodes, so no EO metrics. Cavity parameters (1600 nm width, 420 nm period, 170 cells, D1/D2/D3 150/80/674 nm) are the design values of p.4; the paper does not give per-device values."
```

Proposed evidence entries. They replace the entries list in data/evidence/zhang2023.yaml and reuse its locators. New or changed entries: b q_loaded 5400 (p.6 text), c wavelength_nm 1558 (p.5, Fig. 2d), c epitaxy_or_stack without electrodes, plus notes on a/b length_mm, b bw3db_ghz, b drive_vpp_v and b max_baud_gbd. source_files unchanged (page_05.png already listed).

```yaml
entries:
- device_id: zhang2023-a
  field: wavelength_nm
  value: 1560
  unit: nm
  basis: extracted_from_figure
  locator: p.5, Fig. 2e
  note: 0 V peak near 1559.8 nm between the 1559.18 and 1560.04 ticks; tuning device; not in text
- device_id: zhang2023-a
  field: length_mm
  value: 0.15
  unit: mm
  basis: measured
  locator: p.5 text
  note: Electrode length 150 um stated for the topological modulator design; not given per device
- device_id: zhang2023-a
  field: eo_film_thickness_nm
  value: 300
  unit: nm
  basis: measured
  locator: p.4 text; p.9 Methods
  note: X-cut LNOI film
- device_id: zhang2023-a
  field: rib_width_nm
  value: 1600
  unit: nm
  basis: measured
  locator: p.4 text
  note: SiN loading strip waveguide width; LN is not etched
- device_id: zhang2023-a
  field: electrode_thickness_um
  value: 0.3
  unit: um
  basis: measured
  locator: p.9 Methods
  note: 300 nm Au on 10 nm Ti adhesion layer
- device_id: zhang2023-a
  field: electrode_metal
  value: Ti/Au (10 nm / 300 nm)
  unit: ''
  basis: measured
  locator: p.9 Methods
- device_id: zhang2023-a
  field: buffer_oxide_um
  value: 2
  unit: um
  basis: measured
  locator: p.9 Methods
  note: Buried silica of the LNOI wafer
- device_id: zhang2023-a
  field: substrate
  value: silicon
  unit: ''
  basis: extracted_from_figure
  locator: p.3, Fig. 1f legend
  note: Si layer labelled in the schematic; not stated in text
- device_id: zhang2023-a
  field: crystal_cut
  value: x-cut
  unit: ''
  basis: measured
  locator: p.4 text; p.9 Methods
- device_id: zhang2023-a
  field: waveguide_orientation
  value: cavity along crystal y axis
  unit: ''
  basis: measured
  locator: p.4 text
  note: Oriented along y to use r33
- device_id: zhang2023-a
  field: epitaxy_or_stack
  value: Si substrate / 2 um SiO2 / 300 nm x-cut LN / 300 nm PECVD SiN strip 1600 nm wide with rectangular air holes
    (period 420 nm, 170 unit cells, D1 150 nm, D2 80 nm, D3 674 nm) / Ti-Au coplanar electrodes beside the cavity
  unit: ''
  basis: measured
  locator: p.4 text; p.9 Methods; Fig. 1f
- device_id: zhang2023-a
  field: tuning_nm_per_v
  value: 0.011
  unit: nm/V
  basis: measured
  locator: p.5 text; Fig. 2f
  note: 11 pm/V linear tuning, +-24 V
- device_id: zhang2023-b
  field: length_mm
  value: 0.15
  unit: mm
  basis: measured
  locator: p.5 text
  note: Electrode length 150 um stated for the topological modulator design; not given per device
- device_id: zhang2023-b
  field: drive_vpp_v
  value: 2
  unit: V
  basis: measured
  locator: p.9 Methods; Table 1 (p.8)
  note: Eye-diagram drive about 2 V; Fig. 4 device not named, assigned to the S21 device (judgment)
- device_id: zhang2023-b
  field: bw3db_ghz
  value: 104
  unit: GHz
  basis: measured
  locator: p.6 text; Fig. 3d
  note: -8 dB detuning point; 110 GHz LCA; 37, 67, 87 GHz at -3, -4.5, -6.5 dB; Q 5400 device (p.6)
- device_id: zhang2023-b
  field: eo_film_thickness_nm
  value: 300
  unit: nm
  basis: measured
  locator: p.4 text; p.9 Methods
  note: X-cut LNOI film
- device_id: zhang2023-b
  field: rib_width_nm
  value: 1600
  unit: nm
  basis: measured
  locator: p.4 text
  note: SiN loading strip waveguide width; LN is not etched
- device_id: zhang2023-b
  field: electrode_thickness_um
  value: 0.3
  unit: um
  basis: measured
  locator: p.9 Methods
  note: 300 nm Au on 10 nm Ti adhesion layer
- device_id: zhang2023-b
  field: electrode_metal
  value: Ti/Au (10 nm / 300 nm)
  unit: ''
  basis: measured
  locator: p.9 Methods
- device_id: zhang2023-b
  field: buffer_oxide_um
  value: 2
  unit: um
  basis: measured
  locator: p.9 Methods
  note: Buried silica of the LNOI wafer
- device_id: zhang2023-b
  field: substrate
  value: silicon
  unit: ''
  basis: extracted_from_figure
  locator: p.3, Fig. 1f legend
  note: Si layer labelled in the schematic; not stated in text
- device_id: zhang2023-b
  field: crystal_cut
  value: x-cut
  unit: ''
  basis: measured
  locator: p.4 text; p.9 Methods
- device_id: zhang2023-b
  field: waveguide_orientation
  value: cavity along crystal y axis
  unit: ''
  basis: measured
  locator: p.4 text
  note: Oriented along y to use r33
- device_id: zhang2023-b
  field: epitaxy_or_stack
  value: Si substrate / 2 um SiO2 / 300 nm x-cut LN / 300 nm PECVD SiN strip 1600 nm wide with rectangular air holes
    (period 420 nm, 170 unit cells, D1 150 nm, D2 80 nm, D3 674 nm) / Ti-Au coplanar electrodes beside the cavity
  unit: ''
  basis: measured
  locator: p.4 text; p.9 Methods; Fig. 1f
- device_id: zhang2023-b
  field: max_baud_gbd
  value: 100
  unit: GBd
  basis: measured
  locator: p.7-8 text; Fig. 4h
  note: NRZ 100 Gbaud, BER below 3.8e-3 after offline DSP; Fig. 4 device not named (judgment)
- device_id: zhang2023-b
  field: modulation_format
  value: NRZ up to 100 GBd (BER below 7% HD-FEC threshold 3.8e-3, offline DSP); PAM-4 100 Gb/s (50 GBd) and 80 Gb/s
    (40 GBd); PAM-6 77 Gb/s (30 GBd); PAM-8 90 Gb/s (30 GBd)
  unit: ''
  basis: measured
  locator: p.7-8; Fig. 4
- device_id: zhang2023-b
  field: max_line_rate_gbps
  value: 100
  unit: Gb/s
  basis: measured
  locator: p.8 text; Fig. 4d,h
  note: 100 Gb/s NRZ and 100 Gb/s PAM-4
- device_id: zhang2023-b
  field: energy_per_bit_fj
  value: 5.4
  unit: fJ/bit
  basis: derived
  locator: p.8 text; Table 1
  note: Author-computed C*Vpp^2/4 for NRZ, stated approximately
- device_id: zhang2023-b
  field: capacitance_ff
  value: 5.4
  unit: fF
  basis: simulated
  locator: p.4-5 text
  note: Calculated 36 fF/mm for the microelectrodes times 150 um; derivation in Supplementary Note S5 not read
- device_id: zhang2023-b
  field: q_loaded
  value: 5400
  unit: '1'
  basis: measured
  locator: p.6 text
  note: Another topological modulator device on the same chip with a lower Q of 5400; used for the Fig. 3d S21
- device_id: zhang2023-c
  field: wavelength_nm
  value: 1558
  unit: nm
  basis: extracted_from_figure
  locator: p.5, Fig. 2d
  note: Resonance peak inside the stopband, between the 1540 and 1560 nm ticks near 1558; not in text
- device_id: zhang2023-c
  field: il_onchip_db
  value: 1.3
  unit: dB
  basis: measured
  locator: p.5 text; Fig. 2d
  note: Electrode-free cavity at resonance; definition and grating-coupler normalization not stated
- device_id: zhang2023-c
  field: extinction_ratio_db
  value: 32
  unit: dB
  basis: measured
  locator: p.5 text; Fig. 2d; Table 1
  note: Resonance peak versus stopband floor of the electrode-free cavity; Table 1 attributes it to the modulator
- device_id: zhang2023-c
  field: eo_film_thickness_nm
  value: 300
  unit: nm
  basis: measured
  locator: p.4 text; p.9 Methods
  note: X-cut LNOI film
- device_id: zhang2023-c
  field: rib_width_nm
  value: 1600
  unit: nm
  basis: measured
  locator: p.4 text
  note: SiN loading strip waveguide width; LN is not etched
- device_id: zhang2023-c
  field: buffer_oxide_um
  value: 2
  unit: um
  basis: measured
  locator: p.9 Methods
  note: Buried silica of the LNOI wafer
- device_id: zhang2023-c
  field: substrate
  value: silicon
  unit: ''
  basis: extracted_from_figure
  locator: p.3, Fig. 1f legend
  note: Si layer labelled in the schematic; not stated in text
- device_id: zhang2023-c
  field: crystal_cut
  value: x-cut
  unit: ''
  basis: measured
  locator: p.4 text; p.9 Methods
- device_id: zhang2023-c
  field: waveguide_orientation
  value: cavity along crystal y axis
  unit: ''
  basis: measured
  locator: p.4 text
  note: Oriented along y to use r33
- device_id: zhang2023-c
  field: epitaxy_or_stack
  value: Si substrate / 2 um SiO2 / 300 nm x-cut LN / 300 nm PECVD SiN strip 1600 nm wide with rectangular air holes
    (period 420 nm, 170 unit cells, D1 150 nm, D2 80 nm, D3 674 nm); no electrodes
  unit: ''
  basis: measured
  locator: p.4 text; p.9 Methods; Fig. 2d caption
  note: Same stack and design as the modulators, without gold electrodes
- device_id: zhang2023-c
  field: q_loaded
  value: 9066
  unit: '1'
  basis: measured
  locator: p.5 text; Fig. 2d
  note: Electrode-free cavity; 3 dB linewidth 0.172 nm
```

## Task B: other rows whose notes signal mixed devices or operating points

Search: devices.csv notes for sibling, mix, different device, combined, same chip, other or second device, not necessarily.

| Row | Finding | Recommendation |
|---|---|---|
| kawahara2025-a | Note: "Row mixes these two operating points". The 50 GHz bandwidth is at PDC 260 mW with peaking ON (whole transmitter); ER 1.4 dB and 0.78 pJ/bit are at 50 mW. The note also gives ER 4.0 dB at 260 mW. | Split (convention d, operating point). Row -a: 260 mW point with bw3db 50 GHz (simulated basis as now) and ER 4.0 dB. New row: 50 mW point with ER 1.4 dB, energy 780 fJ/bit, 64 GBd, bandwidth empty. Low priority. |
| witmer2020-converter | Q 19,900 at about 7 mK and tuning 3.70 pm/V at room temperature on the same resonance; temperature_class left empty (mixed). | Same physical device, and neither value is Vpi, IL or bandwidth. Keep one row; optionally split by temperature if Q vs temperature matters for plots. |
| valdez2022-a | Headline 110 GHz is the stitched OSA response of the main device (p.8). The cyan LCA trace is an identically designed MZM on a different chip, used as verification. | No split needed. The row values come from one device. An optional row for the second chip would carry only the LCA bandwidth. |
| chen2023a-glycerol | Notes discuss a figure point that belongs to a different geometry. | Row values are from one device. No action. |
| weckenmann2026-a | Eight MRMs on two identical chips combined off-chip; per-modulator vs two-chip totals stated in the notes. | System-level row with explicit per-modulator values. No split. |
| liu2025b-b, shen2024-c/-d, li2020-b/-c, feng2022-b, liu2026c-b, wang2024b-b, xu2020-b, tiberi2025-c | Siblings already split into their own rows. | No action. |
| ogiso2024-a, vanackere2023-a, zhang2026a-a | "combined" refers to X+Y polarization IL, coupler totals, or the Tx/probe/PD response. | Not a device mix. No action. |
