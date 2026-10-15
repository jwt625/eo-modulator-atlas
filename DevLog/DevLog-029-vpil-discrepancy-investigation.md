---
title: VpiL discrepancy investigation (engine vs measured TFLN papers)
date: 2026-10-15
status: done (read-only investigation; no engine or config edits)
owner: fresh-context investigator
scope: sims/{mao2022,renaud2023,arabjuneghani2022,boynton2020,yang2022}/config.yaml, references/<paper>/, engine CLI runs on scratch copies
---

# DevLog-029: why engine VpiL overshoots measured values but matches paper simulations

Parent: `DevLog/DevLog-023-simulator-tfln-roadmap.md`. Inputs: DevLog-026 round 2 gate table, DevLog-028 (solver chain
validated against independent references), audit A14 (`DevLog/audits/simulator-l-param-audit-2026-10-14.md`).

## Question

Engine VpiL (V cm, scalar / vector) vs measured: mao2022 2.802 / 2.768 vs 1.9; renaud2023 0.628 / 0.638 vs 0.55;
arabjuneghani2022 3.985 / 4.022 vs 3.3; boynton2020 4.98 / 4.94 vs 6.67 (under, not over); yang2022 2.59 / 2.63 vs
2.37 (pass). Against papers' own simulations the engine agrees within about 4 %. Is the gap inputs/conventions or model
physics?

## Method

- Read each paper's text and the relevant figures (page renders and 400-900 dpi crops from `references/<paper>/source.pdf`);
  digitized figure values with pixel scans of tick marks and markers (scripts in the scratchpad, deleted after use).
- Ran `node engine/cli.mjs <config> --stages optical_mode,eo_overlap [--param ...] [--solver vector]` with `nice -n 10`,
  `--max-old-space-size=1536`, one process at a time, on unedited `sims/*/config.yaml` and on edited scratch copies
  (material overrides, polygon edits, optical window). Scalar for exploration, vector for final numbers. 87 recorded
  cross-section runs (plus 4 that failed to mesh or hit a metal-in-window error) and 4 sweeps (18 points), each 1-30 s.
- Material "low-frequency" test values (not in the engine library): unclamped LN eps11 = 85, eps33 = 28.7 ("unclamped
  (f < 500 kHz)") and r33 = 33 pm/V unclamped at 633 nm (clamped 31), from a vendor LN datasheet ("DC12_LN OptCrys_8/99",
  hosted at https://sphotonics.ru/LNmatProperties.pdf, read 2026-10-15; secondary, vendor, no primary cited). The engine
  library already carries Veithen Table I unclamped r33 = 32.2 (`alternatives.r_pm_per_v_unclamped`). So the r33 low-
  frequency correction is a range: 30.8 -> 32.2 (-4.3 %) to 30.8 -> 33 (-6.7 %).
- r33 dispersion: Grando et al. 2005 (Pavia, conference proceedings, abstract read at iris.unipv.it/handle/11571/128111)
  report "weak dispersion in the wavelength range 532-1550 nm"; no numbers read. No r33(lambda) value is used below.
- "s" = scalar, "v" = vector. Deltas are relative to the unedited config (scalar) unless stated.

Measurement conditions read from the papers:

| Paper | Vpi drive | Frequency | Voltage reading | Length used for VpiL |
|---|---|---|---|---|
| mao2022 | triangle 5.0 Vpp, single GSG ("conventional push-pull") | 10 kHz | oscilloscope records drive (p.5) | 6.0 mm phase shifter (Fig. 2(a)) |
| renaud2023 | triangle, GSG probe, 50 ohm termination (Fig. 2(a)) | 1 MHz | "as a function of applied voltage" (Methods) | 1 cm (straight narrow-gap region; see L_eff below) |
| arabjuneghani2022 | triangle sweep | 100 kHz | not stated | 5 mm (Fig. 1(b), Fig. 3) |
| boynton2020 | sawtooth | 50 kHz | not stated | 0.5 cm (bonded TFLN length, Fig. 4(b)) |
| yang2022 | triangle to modulator and scope "at the same time" | 5 MHz | oscilloscope | 5 mm active region (Fig. 2(a)) |

All are push-pull single-ended GSG MZMs, Vpi = full max-to-min swing of the terminal voltage (read from the transfer
curves: mao2022 Fig. 3 3.2 V; renaud2023 Fig. 1(b) 0.55 V; arabjuneghani2022 Fig. 3(a,b) 4.4 / 6.6 V). This matches the
engine convention (V_t, push-pull by geometry, no factor 2). No convention error found, consistent with A14.

## Per-paper results

### mao2022 (measured 1.9 V cm; engine 2.802 s / 2.768 v; +47 %)

| Cause | Evidence | Engine VpiL (s), delta | Closes the gap? |
|---|---|---|---|
| Paper's Vpi model is an idealisation | p.5 Eq. (2): r_eff = lambda g / (2 n^3 Gamma VpiL) "under the assumption of an ideal uniform electric-field distribution", Gamma = 73 % = Poynting fraction in LN (Eq. (1)). With g = 6 um, Gamma 0.73, VpiL 1.9: n = 2.211 gives r_eff = 31.02 pm/V (the paper's "around 31"); n = n_e 2.138 gives 34.3; n_eff 2.136 gives 34.4 (reader arithmetic). So the paper used the ordinary index for a TE x-cut r33 interaction. | engine LN power fraction 0.650 s / 0.668 v; field factor in LN about 0.84 of V/g (from dn/V) | explains why the paper calls 1.9 "consistent", not the measurement itself |
| Electrode gap in the paper's own simulation | Fig. 1(f) (RF field plot) digitized: inner electrode edges at Z = -2.41 and +2.41 um, gap 4.84 +- 0.1 um (34.6 px/um from tick labels); text p.4 and Fig. 2(b) label give 6.0 um | gap 4.84: 2.253 (-19.6 %); gap 5.4: 2.515 (-10.2 %) | partly; device label says 6.0 |
| Low-frequency LN constants (10 kHz, below the datasheet's 500 kHz) | vendor datasheet; Veithen Table I | eps 85/28.7: 2.739 (-2.3 %); r33 31 -> 33: 2.633 (-6.1 %); both: 2.573 (-8.2 %) | partly |
| Electrode thickness (Fig. 1(f) shows about 1.1 um) | Fig. 1(f) digitized; text 1.5 um | 1.1 um: 2.815 (+0.5 %) | no |
| Cladding reference surface | p.3 1.6 um; Fig. 1(f) cladding top 1.59 um above LN top (matches config) | 0.5 um: +1.0 %; 3.0 um: +0.4 % | no |
| BOX | 2.0 um stated (Fig. 1(f) digitizes about 1.7) | 1.7 um: +0.5 % | no |
| Film thickness | 700 nm stated (Fig. 1(f) about 0.62-0.7) | 0.65 um: +1.4 % | no |
| a-Si strip width | 1.0 um (p.4) | 0.9: -1.9 %; 1.1: +1.5 % | no |
| Optical window (needed for narrower gaps) | numerical | half width 2.9 -> 2.3: +0.01 % | n/a |
| a-Si conductivity at 10 kHz | not stated | not modelled; a conducting strip over the mode would short the lateral field under it (raises Vpi, wrong direction) | no |

Combined (gap 4.84 + low-f constants): 2.061 s / 2.038 v (+8 % / +7 % vs 1.9). Gap 6.0 + low-f: 2.573 s / 2.545 v
(+35 % / +34 %). Conclusion: not closed with the stated 6.0 um gap. The paper's 1.9 V cm agreement claim rests on Eq. (2)
(uniform V/g field, Poynting Gamma, n = n_o); the engine's field-resolved overlap is about 0.55 vs the 0.81 needed. The
remaining gap at 6.0 um is either an actual gap smaller than labelled (the paper's own field plot uses about 4.8 um) or an
unreported measurement factor. Inputs explain at most -27 % of the -32 % needed.

### renaud2023 (measured 0.55 V at 1 cm; engine 0.628 s / 0.638 v; +14 / +16 %)

| Cause | Evidence | Engine VpiL (s), delta | Closes? |
|---|---|---|---|
| Sidewall angle | Fig. 1(c) draws trapezoidal ribs (not quantified); Ar+ RIE (Methods); config uses 90 deg | 70 deg: 0.614 (-2.2 %); 60 deg: 0.606 (-3.5 %); 60 deg with top 0.45 um (bottom 0.66): 0.626 (-0.4 %) | partly |
| Low-frequency constants (1 MHz, between the datasheet's 500 kHz unclamped and 10 MHz clamped limits) | datasheet; Veithen | eps 85/28.7: -0.7 %; r33 33: -6.7 %; both: 0.582 (-7.4 %) | partly (upper bound) |
| Etch depth / slab | 180 nm etch, 120 nm slab (Fig. 1(c), Methods) | etch 0.16: -7.4 %; etch 0.20: +8.8 %; film 0.32: -4.5 % | sensitivity only (no evidence of deviation) |
| Fabricated gap | 3 um nominal | 2.7 um: -11.1 % | sensitivity only |
| Electrode thickness | 800 nm (Methods) | 0.6 um: +1.2 % | no |
| Cladding | about 1 um PECVD | 0.5: +0.4 %; 2.0: +1.0 % | no |
| Effective length (gap tapers in the contact region) | Fig. 1(d) (5 mm device) measured: straight narrow-gap region 5.3 mm (scale bar 103 px/mm), gap tapers about 0.8 mm each end; caption: "electrode gap taper along the probe contact region to the interaction region" | estimate (not engine): if Vpi scales with gap and the gap tapers linearly from 3 um to 10 / 20 / 50 um over 0.8 mm, the two tapers add 8.3 / 5.4 / 2.9 % effective length on a 1 cm device | partly (estimate) |
| r33 dispersion | Grando 2005: weak over 532-1550 nm | engine matches 532 nm (0.418 v vs 0.42) and overshoots 738 nm; a larger r33 at short wavelength would push 532 nm below the measurement and leave 738-938 nm unchanged or worse | no (wrong shape) |

Combined (low-f + 60 deg sidewall): 0.562 s / 0.573 v (+2.2 % / +4.1 %). Gap and wavelength studies with the same
inputs (scalar):

| Point | Engine as configured (v) | Engine low-f + 60 deg (s) | Paper theory (digitized) | Measured |
|---|---|---|---|---|
| gap 2.5 um | 0.520 | 0.456 | 0.444 | 0.47 (Fig. 2(b): 0.473) |
| gap 3.0 um | 0.638 | 0.562 | 0.552 | 0.55 |
| gap 4.0 um | 0.883 | 0.781 | 0.765 | 0.79 |
| gap 5.0 um | 1.141 | 1.012 | about 0.997 | 0.93 |
| 532 nm | 0.418 | 0.372 | 0.420 (extrapolated) | 0.42 |
| 638 nm | 0.530 | 0.469 | 0.505 | 0.45 |
| 738 nm | 0.638 | 0.562 | 0.587 | 0.55 |
| 838 nm | 0.752 | 0.659 | 0.687 | 0.85 |
| 938 nm | 0.875 | 0.762 | 0.757 | 0.80 |

Digitized "Theory" lines: Fig. 2(b) ticks 281.2 px/um and 831 px/V at 400 dpi; Fig. 2(a) 2.068 px/nm and 455 px/V.
Observations: (1) the engine as configured is a near-constant +14..+17 % above the paper's gap-theory line; low-f
constants plus a 60 deg sidewall remove it (+1.5..+2.7 %). (2) The paper's two theory curves disagree at their shared
point (3 um, 738 nm): 0.552 (Fig. 2(b)) vs 0.587 (Fig. 2(a)). (3) Fig. 2(a) theory is proportional to wavelength
(0.443 at 560 nm x 938/560 = 0.742 vs 0.757 read), i.e. it holds n^3 r33 Gamma constant; the engine's mode-resolved
curve is steeper. (4) The measured wavelength points are not monotonic in Vpi/lambda (838 nm 0.85 V > 938 nm 0.80 V
for one device), so +-10 % point scatter is in the data. (5) The measured gap slope 0.184 V/um (2.5 -> 5 um) is below the
engine slope (0.248 V/um as configured, vector; 0.222 with low-f + 60 deg); a constant gap offset cannot change a slope. Conclusion: explained by inputs to within the
measurement scatter at 2.5-4 um and 532-738 nm; the 5 um and 838 nm points stay outside +-10 %.

### arabjuneghani2022 (device #2 measured 3.3 V cm; engine 3.985 s / 4.022 v; +21 %)

| Cause | Evidence | Engine VpiL (s), delta | Closes? |
|---|---|---|---|
| Low-frequency constants (100 kHz) | datasheet; Veithen | eps 85/28.7: 0.0 %; eps + r33 33: 3.720 (-6.6 %), vector 3.777 | partly |
| BOX thickness (not stated; 2 um placeholder) | "insulator layer" (p.2) | 4.7 um: -2.3 %; 1.0 um: +5.6 % | no |
| Buffer Tb | Table 1: 0.2 um | 0.05: -6.6 %; 0.1: -4.1 % | no (stated value) |
| Cladding Tc reference | Fig. 1(a) arrow from slab top (config matches) | Tc 1.1: -0.7 % | no |
| Electrode thickness, sidewall | Tg 1 um; sidewall not stated | Tg 0.8: +0.2 %; 70 deg: -0.3 % | no |
| D definition (text: from gap centre; Fig. 3 caption: from signal edge) | p.2 text and Fig. 1(a) draw D from the gap centre; Fig. 3(c) optical loss is lowest at D = 0, so D = 0 is the gap centre | edge definition for device #2 (D_centre 2.4): 4.108 (+3.1 %) | no |
| Waveguide-position dependence | Fig. 3(c) measured Vpi (5 mm) digitized: D = 0 / 1 / 2.6 / 3.6 um -> 12.69 / 9.88 / 6.69 / 5.08 V, i.e. 6.35 / 4.94 / 3.35 / 2.54 V cm. Paper COMSOL (Fig. 2, L at fixed Vpi 6.6 V, with buffer) digitized: D = 0 / 0.5 / 1 / 1.5 / 2 / 2.5 -> 6.30 / 5.56 / 4.91 / 4.35 / 3.84 / 3.39 V cm | engine D = 0 / 1 / 2.6 / 3.6: 5.162 / 4.847 / 3.985 / 3.360 (s); 5.211 / - / - / 3.387 (v) | see below |

Engine / measured across D: 0.81, 0.98, 1.19, 1.32. The paper's COMSOL agrees with its own measurements within about
2 % over D = 0-2.6 (ratio D0/D2.5 = 1.86), while the engine gives D0/D2.6 = 1.30 and D0/D3.6 = 1.54 (vector 1.54).
None of the inputs changes this ratio materially: Tb 0.05 um 1.30 / 1.57; LN eps 85/28.7 1.29; LN isotropic eps 28
1.30; LN eps 3.9 (unphysical bound, removes the high-eps film) 1.46. A free-space thin-coplanar-strip estimate
(E proportional to 1/sqrt(a^2 - x^2), a = 5 um) gives 1.17 at x = 2.6 um and 1.44 at x = 3.6 um (reader estimate), i.e.
standard electrostatics of the stated geometry produces a weak position dependence, and the engine is already stronger
than that estimate. The measured and paper-simulated 1.9x / 2.5x need something not in the stated geometry (undisclosed
electrode or slab detail, or a different G or D in the fabricated and simulated devices).

Device #1 (G 5, D 0.6, Wc 12; measured 2.2 V cm): engine 2.311 s (+5.0 %); with low-f constants 2.156 s / 2.188 v
(-2.0 % / -0.6 %). With the edge D definition the rib edge sits 0.2 um from the signal electrode and the cropped optical
window changes the mode (n_eff 1.759 vs 1.853), so that run is not usable.

Conclusion: device #1 is explained by inputs; device #2 is not (+13 % s / +14 % v after low-f constants), and the
waveguide-position series shows a structural disagreement between the engine (for the stated geometry) and both the
paper's COMSOL and its measurements. This is the one case here that needs an independent reference with an off-centre
waveguide before blaming either side.

### boynton2020 (measured 6.67 V cm; engine 4.983 s / 4.941 v; -25 %; paper simulation 4.88)

| Cause | Evidence | Engine VpiL (s), delta | Closes? |
|---|---|---|---|
| Paper simulation inputs | p.7 Eq. (1a): VpiL = n_eff lambda G / (2 n_e^4 r33 Gamma), n_eff 1.757 (simulated), n_e "2.21 at 1550 nm" (the ordinary index value), r33 31, Gamma 19.03 %. Reader arithmetic: 3.870 V cm with n_e 2.21, 4.419 with 2.138, not the stated 4.88 (Gamma 0.151 would give 4.88) | engine with n_e 2.21: n_eff 1.736 (paper 1.757; engine with 2.138: 1.700), VpiL 4.071 (-18 %) | shows the engine's agreement with 4.88 is not a validation |
| SiO2 thickness above the SiNx core (CMP, 123 nm mean, varies) | p.4, p.9 Fig. 6 | 50 nm: -1.9 %; 200: -1.6 %; 300: -6.3 %; 400: -11.3 % (mode moves into the TFLN slab: SiNx fraction 0.19 -> 0.05) | no (wrong direction) |
| Bond voids (thin air layer between TFLN and SiO2) | p.7 (PDF page): fringes "due to variations in bond quality, where a thin layer of air is present" | 50 nm air: 5.264 (+5.6 %); 20 nm failed to mesh | small |
| Bottom Si-rich SiNx under the core | Fig. 4(a) cross-section shows both SiNx layers; p.4: bottom layer n 2.11 at 1546 nm; p.4: light transfers to the top layer through 250 um tapers (min width 0.2 um), so it is probably not under the core in the active region | if present (1.2 x 0.3 um, n 2.11): 6.280 (+26 %); with n 1.91: 5.363 (+7.6 %) | only if the bottom layer stays under the core (not supported by the text) |
| Effective length | p.4: two 250 um vertical tapers plus a 100 um top-layer taper per end; Fig. 4(b) draws them inside the 5 mm bonded region | estimate: full-overlap length 4.3-5.0 mm -> measured 6.67 corresponds to 5.7-6.67 V cm at full overlap | partly (estimate) |
| Low-frequency constants (50 kHz) | datasheet | eps 85/28.7: +1.5 %; with r33 33: 4.752 s / 4.711 v (-4.6 %) | wrong direction |
| LN constants are SPEC placeholders (eps 43/28) | config provenance | library 44/27.9 not run; eps change effects are about 1 % here | no |

Conclusion: not explained by any stated input. The engine sits below the measurement, the paper itself attributes the
disagreement to bonding non-uniformity along the device (p.11), and its own simulated 4.88 is not reproducible from the
stated Eq. (1) inputs.

### yang2022 (measured 2.37 V cm at 5 MHz; engine 2.594 s / 2.634 v; +9 / +11 %, passes 15 %)

| Cause | Evidence | Engine VpiL (s), delta | Closes? |
|---|---|---|---|
| Paper's own simulation | Fig. 3(d) colour at the star (G 7 um, ridge 0.2 um) mapped to the colour bar: about 2.3-2.5 V cm (contour neighbours 2.31 and 2.53) | engine +4..+12 % above | - |
| LN eps placeholder 38 (perp) | config | library 44/27.9: -0.3 %; 85/28.7: -1.4 % | no |
| r33 placeholder 30.9 -> 33 (5 MHz, between limits) | datasheet | eps 85 + r33 33: 2.394 s (+1.0 %) / 2.440 v (+3.0 %) | yes (within scatter) |
| Wet-etch sidewall (near 90 deg, about 20 deg foot on one side, p.3) | SEM text | 1.3 um bottom, 1.16 um top trapezoid: -0.004 % | no |

Conclusion: explained; already a pass.

## Conclusions

| Paper | Engine as configured (s / v) vs measured | After best-supported inputs (s / v) | Verdict |
|---|---|---|---|
| mao2022 | +47 % / +46 % | gap 6.0 + low-f: +35 % / +34 %; gap 4.84 (Fig. 1(f)) + low-f: +8 % / +7 % | not closed at the labelled gap; paper's agreement claim is an Eq. (2) idealisation with n = n_o |
| renaud2023 | +14 % / +16 % | low-f + 60 deg sidewall: +2 % / +4 %; gap series within -3..+9 % | explained by inputs within measurement scatter |
| arabjuneghani2022 #2 | +21 % / +22 % | low-f: +13 % / +14 % | not closed; D-dependence disagrees with paper COMSOL and measurement (structural) |
| arabjuneghani2022 #1 | +5 % (s) | low-f: -2 % / -0.6 % | explained |
| boynton2020 | -25 % / -26 % | low-f: -29 % | not closed; fabrication (paper's own attribution); paper sim not reproducible |
| yang2022 | +9 % / +11 % | low-f: +1 % / +3 % | explained |

Inputs vs physics:

- A common, convention-free contributor is the clamped LN r33 (30.8-31) used against kHz-MHz measurements: -4.3 % to
  -6.7 % if the unclamped value applies. A bonded thin film is mechanically constrained by its substrate, so the fully
  unclamped value is an upper bound on this correction, not a replacement. The unclamped eps tensor changes VpiL by
  -2.3 % to +1.5 % only.
- Two papers' "agreement" numbers use the ordinary index 2.21 where the TE x-cut interaction needs n_e (mao2022 Eq. (2)
  reproduces its r_eff 31.0 only with n = 2.211; boynton2020 states n_e = 2.21 and its simulated n_eff 1.757 is close to
  the engine's 1.736 with n_e = 2.21). The engine is not wrong to use n_e; the papers' own consistency checks are.
- Geometry inputs not stated or stated differently in figures matter at the 3-20 % level: sidewall angle (renaud2023),
  electrode gap in the simulated vs fabricated device (mao2022), effective modulated length including gap tapers and
  vertical transitions (renaud2023, boynton2020).
- Model physics: r33 dispersion is not the cause (renaud2023 shape is wrong for it; Grando 2005 reports weak dispersion).
  DC drift / photorefractive screening lowers low-frequency efficiency (raises Vpi), the opposite sign of the overshoot.
  The one open physics question is arabjuneghani2022's waveguide-position dependence, which no input reproduces.

## Proposed changes (for the config owner, L-PARAM; nothing applied here)

1. Library: add an `alternatives.eps_r_unclamped` (eps11 85, eps33 28.7, "unclamped, f < 500 kHz") and a second
   unclamped r33 source (33 pm/V at 633 nm, clamped 31) from the vendor datasheet above, labelled
   `secondary_vendor`, condition text verbatim; keep `library:` defaults clamped. Source to verify against a primary
   (Weis and Gaylord 1985, still unread).
2. For measured kHz-MHz Vpi targets (all five), add a bracketing study or a second evaluation with the unclamped r33
   (32.2 Veithen, 33 vendor) and report the measured target against the range; do not replace the clamped default.
3. mao2022: add to `missing`/`limitations`: "Fig. 1(f) simulated geometry has a 4.84 +- 0.1 um electrode gap
   (digitized), text and Fig. 2(b) say 6.0 um"; "paper Eq. (2) uses a uniform V/g field, Gamma = Poynting LN fraction
   0.73 and n = 2.211 (reproduces r_eff 31.0); the measured target is not expected to match a field-resolved overlap".
   Optionally an `alt_geometries` gap 4.84 case (class `figure_digitized`).
4. renaud2023: add a sidewall study (60-90 deg; paper Fig. 1(c) draws sloped walls, angle not stated) and a limitation
   for the electrode gap tapers (Fig. 1(d): about 0.8 mm per end on the 5 mm device; estimated +3..+8 % effective length
   on 1 cm). Record that the paper's two theory curves disagree by 6 % at 3 um / 738 nm (0.552 vs 0.587, digitized).
5. arabjuneghani2022: add a `D` study with sweep_targets from Fig. 3(c) (D 0 / 1 / 2.6 / 3.6 um -> 12.7 / 9.9 / 6.7 /
   5.1 V at 5 mm, +-0.1 V digitized) and a device #1 config (G 5, D 0.6, Wc 12; engine 2.31 V cm vs 2.2). Request L-REF
   (DevLog-028) an independent off-centre-waveguide case (K5-like geometry with the rib shifted toward the signal) to
   settle the engine vs COMSOL position dependence.
6. boynton2020: mark the paper-simulated 4.88 target `comparable: false` or annotate it: Eq. (1) with the stated inputs
   gives 3.87 V cm and uses n_e = 2.21 (ordinary index value). Replace the SPEC placeholder LN constants with the
   library. Add limitations: transition tapers (2 x 350 um per end inside the bonded 5 mm, Fig. 4(b), p.4) and the bottom
   Si-rich SiNx layer (n 2.11, Fig. 4(a)); if it were present under the core VpiL rises 26 %.
7. yang2022: replace the placeholder LN eps 38/28 with the library (effect -0.3 %); no target change.

## Limitations of this investigation

- Figure digitization: renaud2023 Fig. 2 +-0.01 V; arabjuneghani2022 Fig. 3(c) +-0.1 V, Fig. 2 +-0.05 mm; mao2022
  Fig. 1(f) gap +-0.1 um (antialiased edges, 34.6 px/um); yang2022 Fig. 3(d) colour mapping about +-0.1 V cm.
- The taper effective-length numbers are reader estimates (linear taper, Vpi proportional to gap), not engine runs.
- Unclamped constants come from a vendor datasheet (secondary); r33 dispersion has no numbers here.
- Vector runs used default vector meshing; scalar exploration deltas are assumed to carry over (checked: vector/scalar
  ratios of combined cases within 1-2 %).

## Progress log

- 2026-10-15 07:57 PDT started; read DevLog-026 round 2 tables, audit A14, SPEC EO section, five configs.
- 2026-10-15 08:00-08:10 PDT papers and figures read (mao2022 Figs. 1-3, renaud2023 Figs. 1-2 + Methods,
  arabjuneghani2022 Figs. 1-3, boynton2020 Fig. 4 + Eq. (1) + Sec. 3, yang2022 Fig. 3(d) + Sec. 3); vendor datasheet
  and Grando 2005 abstract read.
- 2026-10-15 08:00-08:15 PDT engine runs (87 cross-sections + 4 sweeps) (scalar exploration, vector confirmation), one at a time, niced.
- 2026-10-15 08:17 PDT digitization of renaud2023 theory curves; DevLog written.
