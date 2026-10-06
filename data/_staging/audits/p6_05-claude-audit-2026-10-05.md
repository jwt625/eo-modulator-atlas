# p6_05 independent audit (Claude, 2026-10-05)

Batch: `data/_staging/p6_05` (xu2022 FIRST SOURCE, lu2020 RECHECK) plus `sims/xu2022/config.yaml`.
Brief: `data/_staging/ingest_2026_10_05/AUDIT_PROMPT.md`. Auditor was fresh-context and read-only; this report is the only file written.

Counts: blocking 0, numerical 1, metadata 2, minor 7.

## Findings

| id | severity | paper / device / field | evidence (source quote, locator) | recommended fix |
|---|---|---|---|---|
| F1 | numerical | xu2022 / xu2022-a / vpil_dc_vcm = 2.4 (basis simulated) | p.2: "high modulation efficiency (simulated result of 2.4 Vcm)". The row is `row_kind device`, `vpi_basis measured`, vpi_dc_v 1 V measured (p.2, Fig. 1(f)), length 23.5 mm. `scripts/build_views.py` l.442 and l.516 use a filled vpil_dc_vcm as `reported_dc` and suppress `vpil_dc_vcm_derived`, so the views would plot the authors' simulated design efficiency as the device's reported Vpi*L. The measured equivalent would be 1 V x 2.35 cm = 2.35 V cm (auditor arithmetic, which the build step derives). Precedent: kharel2021 keeps its Table I simulated 2.1 V cm out of devices.csv and only as a `paper_id`-sourced sim target. | Clear vpil_dc_vcm on xu2022-a and remove its evidence entry. Keep "simulated 2.4 V cm (p.2)" in the row notes. In `sims/xu2022/config.yaml`, change the vpi_l_dc_vcm target source to `{paper_id: xu2022, locator: "p.2", basis: simulated, comparable: false, ...}`. |
| F2 | metadata | lu2020 / lu2020-a / tags (il_onchip_scope phase_section_only) | Supplement p.6-7 Note 5: the ~10 dB fiber-to-fiber loss "is attributed to the scattering losses in the active phase shifter, ... Y-junctions (~1.4 dB in total), and the edge coupling losses of lensed fibers (~3 dB per facet). Thus, the on-chip optical loss is estimated to be approximately 2.6 dB". So scope phase_section_only is defensible because the authors attribute the 2.6 dB to the phase shifter. Convention (ff) names `phase_only_loss` as a flag tag the views rely on: `app/src/lib/logic.ts` l.209 uses only that tag (not il_onchip_scope) to keep phase-shifter-only loss out of whole-modulator comparisons. Without the tag, 2.6 dB is compared as a whole-modulator on-chip IL. Precedent: kieninger2020 and wolf2018a phase_section_only rows carry the tag. | Add `phase_only_loss` to lu2020-a tags. |
| F3 | metadata | lu2020 / lu2020-a / drive, vpi_convention (notes) | Two source statements bear on the drive form, and neither is cited in the row or the report. (1) p.7 Methods, Energy consumption: "Note that with dual-drive configuration, the energy consumption could be further reduced", which implies that the measured device was not dual-drive. (2) Supplement p.3-4 Note 2: "a voltage producing a phase shift of pi is defined as the half-wave voltage of the modulator", and Eq. 5.b uses a single phase-shifter length L with no push-pull factor of 2, so the authors' 1021 pm/V (and r33 = 223 pm/V) extraction assumes the full pi phase is produced over one 8 mm length. With Fig. 1b (two strip lines), Fig. 1d (one G-S-G probe) and vertical poling against a common bottom electrode, these statements point toward single-arm operation, but the authors never state it. | Keep `unspecified` (conservative, consistent with convention (f)), and add both statements to the lu2020-a notes and to the r_eff_pm_per_v evidence note ("authors' Eq. 5-6 treat 1.44 V cm as a single-length pi shift"). The alternative, mzm_single_arm / single_ended with basis derived and a note, is a coordinator decision. |
| F4 | minor | xu2022 / sims/xu2022/config.yaml / geometry (arm pitch, signal width) | The config puts the waveguides at x = 0 and -83 um (an 80 um signal conductor reaching to 1.5 um from each waveguide). Fig. 1(b), measured against its 50 um scale bar (186 px = 50 um on a 900 dpi render): the w_s arrow spans the light region between the two segment rows (about 79 um), each row's electrode segments are about 8.6 um wide, and each waveguide lies about 12.4 um outside the w_s edge. The arm pitch is therefore about 104 um, not 83 um. The devices.csv notes also read w_s as "the width between the two arm rows; not entered as signal width", while the config reads it as "the signal-conductor width". The two readings disagree. | Make the two readings consistent. In the config, either set the arm pitch from the Fig. 1(b) scale (figure_digitized, about 104 um) or state in the electrodes.signal provenance that the 83 um pitch conflicts with the Fig. 1(b) scale. No DB value change. |
| F5 | minor | xu2022 / buffer_oxide_um 0.7, sim sio2_cladding and electrode height | Text p.2: "The 0.9-um-thick CL-TWE was fabricated on a 0.7-um-thick SiO2 cladding". In Fig. 1(c) (1200 dpi render), the 0.7 um dimension arrows end at the electrode bottom and at the lowest white line (LN bottom / quartz top). That reading gives 0.7 um from the quartz to the electrode, or about 0.52 um of SiO2 over the slab. The config assumes "flat top 0.7 um above the slab top" and says this placement "follows Fig. 1(c)". | Keep buffer_oxide_um 0.7 (text value). In the config provenance (sio2_cladding, electrodes.signal) and in `missing`, record that the Fig. 1(c) dimension spans electrode bottom to quartz top, as an alternative reading. |
| F6 | minor | xu2022 / xu2022-a / energy_per_bit_fj evidence note | p.2 gives Vrms 161 mV at the sub-MZMs. Auditor arithmetic: 4 x (0.161 V)^2 / 50 ohm / (130 GBd x 15.38 bit/symbol) = 2.074 mW / 1.999 Tb/s = 1.04 fJ/bit, which matches the stated 1.04 fJ/bit. Using the 1.96 Tb/s net rate gives 1.06. | Optional: append to the note "consistent with RF power of four sub-MZMs into 50 ohm at 130 GBd x 15.38 bit/symbol (auditor check, not stated)". Keep basis author_estimate. Under convention (r), the scope then reads as modulator load only, excluding the DAC. |
| F7 | minor | xu2022 / xu2022-a / notes wording | p.2: "We have fabricated more than five DP-IQ modulators on the same chip." The row notes say "More than five DP-IQ chips on the same chip". | Change to "More than five DP-IQ modulators on the same chip". |
| F8 | minor | lu2020 / lu2020-a / derived prop_loss_db_per_cm inputs | The derived entry cites "0.22 dB/mm (p.3, p.7 Table 1)". The value is computed in supplement p.7 Note 5 ("on-chip optical loss ... approximately 2.6 dB, resulting in a waveguide propagation loss of 0.22 dB mm-1 by considering the total length of the device of 12 mm"). BATCH_REPORT says it is "now supported by supplement Note 5", but the locator was not extended. | Add "supplement p.6-7 Note 5" to the derived inputs. Consider qualifier context: 0.22 is the authors' estimate (2.6 dB / 12 mm), not a cut-back measurement. |
| F9 | minor | lu2020 / lu2020-a / driver (pre-existing, unchanged) | The text (p.3 and p.8 Methods) says the M8196A AWG ran at 92 GSa/s, but the Fig. 3a setup label (p.5) reads "96 or 120 GSa s-1". Source inconsistency. | Optional: add to notes under convention (y). The driver text (92 GSa/s) follows the body. |
| F10 | minor | lu2020 / RECHECK difference list | These differences from canonical are not listed in BATCH_REPORT, and all are benign: the device-row notes were fully rewritten (now include arm spacing 200 um, a single G-S-G feed, the loss breakdown and the r33 extraction, and "Not entered" now omits r33 and adds the confinement factor); evidence notes were reworded for bw3db_reference, z0_ohm and rib_width_nm. All other listed differences were verified (see below). | None, beyond recording them. |

## What was checked

Read: `data/_staging/BATCH_INSTRUCTIONS.md`, `data/_staging/ingest_2026_10_05/DISTILL_PROMPT.md`, `.claude/skills/eo-modulator-distill/SKILL.md`, conventions (a)-(gg) and enums in `data/schema/devices.schema.yaml`, `data/_staging/batches/p6_05.csv`, all staged files (papers.csv, devices.csv, organizations.csv header-only, evidence/xu2022.yaml, evidence/lu2020.yaml), `sims/xu2022/config.yaml`, canonical `data/devices.csv` / `data/papers.csv` / `data/evidence/lu2020.yaml` (field-by-field diff), `data/organizations.csv`.

### xu2022 (FIRST SOURCE)
- Source: `references/xu2022/text.md` (2 pages, all read); page renders plus fresh high-dpi crops of Fig. 1(b), (c), (f), (g), Fig. 2 and Fig. 3, opened and read.
- Identity vs crossref.json: the title matches; the 14 authors match in order and spelling (Pittalà kept); published-online 2022-01-10 (print 2022-01-20), so published_on and year are correct; venue Optica 9(1) 61; VOR licence `OA_License_v2`, so `Optica-OA-License-v2` with restricted_local_only is correct (the printed page also says "Optica Open Access Publishing Agreement", not CC). url is the doi.org form.
- Orgs: Sun Yat-sen University, Zhejiang University and "Huawei Technologies Co., Ltd." exist verbatim in `data/organizations.csv`; no new orgs needed. countries CN. foundry_or_fab empty is correct (no facility named).
- Values verified against the source:
  - length 23.5 mm (Fig. 1 caption; p.2).
  - Vpi 1 V. Fig. 1(f) arrow from about -1.15 V to -0.15 V spans minimum to maximum; the DC sweep and the dc column follow convention (m); frequency is unstated, so vpi_dc_freq_ghz is empty.
  - drive push_pull and mzm_push_pull, basis derived with a note (convention (f); same as the kharel2021 precedent).
  - bw3db 110 gt with bw_measured_to 110. All four traces end at about 110 GHz near -2.7 to -3.0 dB (pixel scale 6.56 px/GHz). The text says ">110 GHz for all channels". This follows convention (c).
  - bw reference other / 1.5 GHz (caption (g)). bw_method eo_s21 (VNA R&S ZNA, 100 GHz PD). The fit beyond 140 GHz is in notes only (convention (aa)).
  - il_fiber_to_fiber 6.8 measured; the 1.9 dB/facet couplers and the PRC <0.3 dB / >=20.5 dB values are correct; 6.5 +/- 0.5 dB is in notes only.
  - ER 20 gt, er_type unspecified. The Fig. 1(f) trough reads about 0.02-0.03 of the maximum (about 15 dB); this is notes-only, and the distiller's 13-15 dB is consistent.
  - Film 360 nm; slab 180 nm; rib height 180 nm; top width 2.5 um; g = 3 um; Au t = 0.9 um; SiO2 0.7 um; quartz 500 um; x-cut. All values and the design_target basis are correct (convention (bb)).
  - drive_vpp 0.628 V after cable and probe loss (convention (r)); Vrms 161 mV in the note. Fig. 2(a) shows DACs feeding the RF probe array directly, so the driver field "no driver amplifier stated" is correct.
  - max_baud 130; net rate 1.96 Tb/s with 10 percent FEC; entropy 8.14-8.54 (Fig. 2(c)); pre-FEC BER 1.91e-2; SNR 23.4 dB; 15.38 bit/symbol. All correct.
  - Band empty (no modulator wavelength stated; convention (l)); temperature empty; statistic empty with a note (convention (z)); class iq_mzm, cl_twe, lnoi_rib, and monolithic on quartz are consistent with the kharel2021 and liu2021 quartz rows; tags include traveling_wave.
- Missed values: none found. The paper reports no wavelength, Z0, n_RF, ng, measured RF loss, ER type, line rate or per-channel numbers. The simulated 0.21 dB/cm/GHz^0.5 is correctly not entered.
- Sim config:
  - Every geometry number traces to the text or Fig. 1(c), except the disclosed project inferences (F4, F5).
  - Material constants are UNVERIFIED placeholders with class unknown, the same pattern as 12 other configs (kharel2021 among them).
  - Targets are the paper values with comparable false; no tuned constants were found and no solver outputs are stored.
  - loading none is disclosed as a limitation.

### lu2020 (RECHECK)
- Sources: `text.md` (9 pages; pages 1-8 read, including Methods and Table 1), `supplement/text.md` (8 pages, Notes 1-5 and Suppl. Table 1, all read), `correction/text.md` (1 page). The page_02 render was opened: in the cached VoR, Fig. 1c already reads "4 µm", and Fig. 1f starts at about 0 dB at low frequency with a ripple of about +1 dB and crosses -3 dB near 68 GHz.
- Correction applied correctly: it changes only the Fig. 1c label (4 mm to 4 um); rib_width_nm 4000 is unchanged, and the locator and note cite correction p.1.
- Listed differences verified:
  - bw3db_reference dc to low_freq_unstated, correct under convention (t): no normalisation frequency is stated, and the VNA starts at 10 MHz.
  - il_fiber_to_fiber 10 approx, measured ("found to be ~10 dB", supplement p.6).
  - il_onchip 2.6 approx, author_estimate ("estimated to be approximately 2.6 dB", supplement p.7); scope phase_section_only (authors attribute it to the active phase shifter; see F2 for the tag); includes and excludes match Note 5.
  - il_basis measured.
  - r_eff 223 pm/V derived: Suppl. Table 1 "Side-chain [This work] 223, n 1.66, 1021"; check 1021 / 1.66^3 = 223.2. Eq. 6 inputs re-computed: 1.55 x (1 + 6) / (1.44e4 x 0.738) = 1.021e-3 um/V, which matches.
  - Qualifiers; locator extensions for z0 (Note 3 CST, "close to 50 ohm", no value; design_target 50 kept), electrode 3 um / 16 um (Note 3), epitaxy (Note 1) and rib_width; evidence count 22 to 27 plus 1 derived entry.
  - Papers row: audit_status, verified_on and notes.
- Unchanged fields re-verified:
  - wavelength 1550; length 8; Vpi 1.8 (Table 1); VpiL 1.44 (p.3).
  - bw 68 approx; measured_to 70 (Methods: VNA and O/E module to 70 GHz).
  - prop_loss 2.2 derived; geometry and stack from p.3, Methods and Fig. 1c.
  - 120 GBd OOK; 200 Gb/s Nyquist PAM4 (Fig. 3g, below HD-FEC only); 42 fJ/bit derived with formula (Vpp/2)^2/(B R) at 1.3 Vpp; drive_vpp 1.3 (Fig. 3a inset).
  - Temperature tests in notes only; temperature_k and temperature_class empty (the static Vpi and BW temperature is not stated).
- Identity vs crossref.json: the 9 authors match in order; published-online 2020-08-24; CC-BY 4.0, so open_license_ok is correct. Orgs Kyushu University, The University of Aizu, Tokai University and Nissan Chemical Corporation exist verbatim.
- Source defects confirmed as recorded in notes: 3.6 vs 3.2 V dB (text p.6 vs Table 1 p.7); polymer index 1.67 (p.3) vs 1.66 (Suppl. Table 1); 8 mm arms vs 12 mm total length.
- Not missed: the main text gives no IL, ER, RF loss, n_RF or ng; BVR 38 GHz/V and the loss-efficiency product are correctly not entered.

### Not done
- `scripts/merge_staging.py` dry run was not re-run by the auditor; the permission classifier denied the command. The distiller's report states 0 conflicts and 0 validation errors.
