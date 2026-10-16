---
title: S8 silicon carrier-depletion configs from papers (lane T6 S8-CFG)
date: 2026-10-16
status: round 2 done (han2023 C' target non-comparable; 26 more papers screened; anjali2025 built and run); awaiting audit
owner: orchestrator (Claude, at Wentao Jiang's request); configs by lane T6 (subagent)
scope: sims/<paper>/config.yaml (new files only) for silicon PN depletion papers; this DevLog
---

# DevLog-041: S8 Si paper configs (T6 S8-CFG)

Parent: DevLog-035 row T6. Engine and schema: DevLog-039 (`semiconductor` block, `runSemiconductor`), `sims/SPEC.md`
S8, `engine/schema/sim.schema.json` `$defs/semiconductor`. Candidate papers (brief): derose2012, sia2022, han2023,
hu2026, zhong2026 (stop at 5).

## Plan

1. Per paper read `references/<paper>/` (text, supplement, figures as images when numbers are only in figures),
   `data/devices.csv` rows and `data/evidence/<paper>.yaml` (read-only).
2. Disclosure check: waveguide geometry (Si thickness, rib width, slab), doping concentrations and their lateral
   placement (or implant conditions), heavy-doping / contact placement, electrode geometry, wavelength, length, bias.
   Missing items that set the result (doping levels, rib/slab, heavy-doping offsets) -> skip with a note here; no
   invented values.
3. Build `sims/<paper>/config.yaml` (new file only) for papers that pass: explicit geometry (SOI, BOX, cladding,
   rib, slab, metal contacts on the contact doping), Si/SiO2 from the engine library, `semiconductor` block (doping
   regions, contacts, reverse-bias sweep, small signal, optics), `optics` (vector, wavelength), `line` inputs only
   when the paper gives them, `semiconductor.targets` from the devices rows with source, comparability and
   convention notes, `provenance` for every parameter, `missing` and `limitations`.
4. Run each config with `node engine/src/semi/run-cli.mjs` (the runner/CLI dispatch is not wired, DevLog-039),
   `nice -n 10`, `--max-old-space-size=1536`, one process at a time; output in the session scratchpad only.
5. Record results vs targets below. Inputs are never tuned to targets.

## TODO

- [x] Read rules, schema, SPEC S8, example config, distill skill
- [x] Disclosure check for the 5 papers
- [x] han2023 config (cut 1 and cut 2 of the corrugated waveguide)
- [x] Run, results vs targets
- [x] Report
- [ ] Fresh-context audit (orchestrator)
- [x] Round 2 (orchestrator 2026-10-16): han2023 C' target comparable: false; screen the other 26 Si papers; build up to 6 more

## Disclosure check (2026-10-16)

| Paper | Decision | Reason |
|---|---|---|
| derose2012 | skip | 2-page conference abstract. Given: 250 nm SOI, 3 um BOX, n and p about 5e18 cm^-3 (As/P), 1 um metal1, 50 um segments, fill 0.6, C 0.41 fF/um at 0 V. Missing: rib width, etch depth / slab thickness, junction position, p+/n+ concentrations and offsets (Fig. 1(b) is an unscaled schematic), contact positions, wavelength, bias of the VpiL (0.7 V cm). |
| sia2022 | skip | 1970 nm operation: the engine plasma-dispersion rows cover 1.3 and 1.55 um only (`PLASMA_ROW_TOLERANCE_UM` 0.02), so the stage throws; using a 1.55 um row would be an invented model. Also missing: BOX thickness, P++/N++ concentration, contact positions, the slab vs "rib height 0.09 um" reading, active length and VpiL definition (racetrack, resonance-shift derived). Given: 220 nm SOI, 600 nm rib, P and N about 5e17, P++/N++ 1.0 um from the centre. |
| han2023 | build | Methods p.7 and Fig. 2(A): 220 nm SOI, 2 um BOX, 90 nm slab, 455 nm core, 190 nm sidewall corrugation (835 nm across fingers), P/N 5.0e17, P+/N+ 2.0e18, P++/N++ 4.0e20 cm^-3, 1550 nm, Cu 1.2 um, G-S gap 6.4 um; doping-band widths digitized from the Fig. 2(A) top view (500 nm scale bar). |
| hu2026 | skip | Doping concentrations not stated (Fig. S2(a) is a Sentaurus-process colour map without a colour scale); trench width and P+/P++ offsets not given numerically; BOX not stated. Given: 420 nm rib, 220 nm, 70 nm slab, 220 nm outer slabs, 8 um ring radius, 40 um doped length, simulated C and R per length (Fig. S2(b)). |
| zhong2026 | skip | Doping concentrations not stated (foundry default, "eight implantations"); rib width and P++/N++ offsets not given (Fig. 1(h) is an unscaled schematic; cell dimensions in the uncached Supplementary Note 3); BOX not stated. Given: 220 nm SOI, 90 nm slab, P region wider than N, 10 um PN length, designed 150 ohm / 5.9 fF. |

## Progress log

- 2026-10-16 00:22 PDT Read DevLog-035/039, SPEC S8, schema, mao2022 config, distill skill, semi-stage and fixtures.
  Disclosure check done (table above); only han2023 passes.
- 2026-10-16 00:25 PDT han2023 config written (cut 1, cut 2); YAML flow-mapping commas in param descriptions broke
  the first parse (quoted); schema validation fixed `ng_fixed`/`group_index_from` and YAML 1.1 exponent form.
- 2026-10-16 00:28 PDT Final runs of both cuts (identical to the pre-fix runs) and the cut 1 mesh check; results
  above. Nothing left running.
- 2026-10-16 00:29 PDT Round 2 started (orchestrator message): han2023 C' target set comparable: false (no input
  change); screening of the 26 remaining Si papers.
- 2026-10-16 00:36 PDT Screening done (table in Round 2); only anjali2025 substrate III discloses enough. Config
  written, run, mesh, heavy-doping and plasma-model sensitivity runs done; results in Round 2. Nothing left running.

## han2023 config (sims/han2023/config.yaml)

- Geometry: 2D straight cuts of the corrugated arm. `geometry` = cut 1 (455 nm core between fingers),
  `alt_geometries.cut2` = cut 2 (835 nm across a finger pair). 220 nm Si, 90 nm slab, 2 um BOX, SiO2 cladding
  truncated at 1.5 um, handle Si omitted. Junction at the core centre.
- Doping (paper_exact concentrations, Methods p.7): P/N 5.0e17, P+/N+ 2.0e18, P++/N++ 4.0e20 cm^-3, uniform boxes.
- Digitization (Fig. 2(A), page 4 image `img_p04_1.png`, 2100 x 1909 px):
  - Top view: 500 nm scale bar 43 px (x 1443-1485, rows 101-111); core 39 px (rows 167-206) = 455 nm, so
    11.65 nm/px; colour-band edges in gap and tooth columns (median of 250-280 columns): P++/P+ 114, P+/P 140,
    P core 167, P/N 186, N core end 206, N/N+ 231.5, N+/N++ 258; core centre 186.5. Edges from the core
    centre: P+ 0.542, P++ 0.845, N+ 0.524, N++ 0.833 um (used 0.54 / 0.85 / 0.52 / 0.83), reading +-1 px = +-12 nm.
    Fingers 17 px = 198 nm (190 nm stated). Tooth pitch 25.7 px = 300 nm (stated period).
  - Cross section 1 (schematic): along the slab row y = 210 px, P++ 82-243, P+ 244-267, P 268-310, N 311-353,
    N+ 354-378, N++ 379-540; scale from the P+ ... N+ span 135 px = 1.678 um (top view) -> 12.4 nm/px; P+ and N+
    widths agree with the top view within about 5 percent. Slab ends +-229 px = +-2.84 um; via centres 198 /
    197.5 px = 2.46 um, via foot 13 px = 0.16 um. Low confidence (schematic).
- Contacts: ideal ohmic at the via feet; reverse bias by positive cathode bias, 0-5 V.
- Optics: vector TE, 1550 nm; Nedeljkovic 2011 1.55 um row, absolute-density basis; single arm.
- Targets: `semiconductor.targets` C' 0.15 pF/mm at 3.5 V (authors' "PN junction model", supplement p.13, basis
  simulated). `targets` (comparable: false): VpiL 0.96 V cm (slow-light device, Vpi 78 V sinusoidal fit,
  convention unspecified) and bw3db 110 GHz (CROW optical bandwidth + electrode, not modelled). Propagation loss
  29.8 dB/mm (slow-light, includes scattering) only noted in `limitations`. No `line` block: signal/ground widths and
  metal height not stated (gap 6.4 um and Cu 1.2 um only).
- Schema: validates against `engine/schema/sim.schema.json` (jsonschema Draft 2020-12, 0 errors; exponents written
  as `5.0e+17` so YAML 1.1 readers also parse numbers). `parseConfig` passes.

## Results (2026-10-16, Node 23.7, nice 10, --max-old-space-size=1536)

Run: `node engine/src/semi/run-cli.mjs sims/han2023/config.yaml` (cut 1) and a scratch runner calling
`runSemiconductor(text, {section: 'cut2'})` (cut 2; the CLI has no section option). Outputs in the session scratchpad
only. Cut 1: 23,058 device nodes (15,428 semiconductor), optical 2,344 nodes, n_eff 2.52771 (TE fraction 0.983),
4.98 s total, RSS 347 MB. Cut 2: 24,148 nodes, n_eff 2.72940 (TE 0.996), 5.11 s. Checks: charge neutrality
<= 5e-11 relative, 0 negative edge weights, Newton 3 iterations per bias step.

| Bias (V reverse) | C' cut1 (pF/mm) | C' cut2 | R' cut1 (ohm mm) | R' cut2 | f_RC cut1 (GHz) | f_RC cut2 | dn_eff cut1 | dn_eff cut2 | VpiL cut1 (V cm, single arm, secant) | VpiL cut2 | loss cut1 (dB/cm) | loss cut2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0.4345 | 0.4355 | 5.910 | 4.732 | 62.0 | 77.2 | 0 | 0 | - | - | 15.29 | 14.41 |
| 1 | 0.3181 | 0.3190 | 5.835 | 4.653 | 85.7 | 107.2 | 6.242e-5 | 4.823e-5 | 1.242 | 1.607 | 14.08 | 13.47 |
| 2 | 0.2687 | 0.2696 | 5.759 | 4.563 | 102.9 | 129.4 | 1.088e-4 | 8.464e-5 | 1.424 | 1.831 | 13.18 | 12.76 |
| 3 | 0.2394 | 0.2404 | 5.650 | 4.448 | 117.6 | 148.8 | 1.472e-4 | 1.151e-4 | 1.580 | 2.020 | 12.44 | 12.17 |
| 3.5 | 0.2285 | 0.2296 | 5.566 | 4.403 | 125.1 | 157.5 | 1.642e-4 | 1.288e-4 | 1.652 | 2.106 | 12.11 | 11.91 |
| 4 | 0.2193 | 0.2204 | 5.488 | 4.329 | 132.2 | 166.8 | 1.802e-4 | 1.417e-4 | 1.721 | 2.188 | 11.81 | 11.66 |
| 5 | 0.2044 | 0.2055 | 5.365 | 4.203 | 145.1 | 184.3 | 2.093e-4 | 1.656e-4 | 1.852 | 2.340 | 11.25 | 11.20 |

Targets vs results:

| Target | Paper | Basis / comparable | Cut 1 | Cut 2 | Status |
|---|---|---|---|---|---|
| C' at 3.5 V | 0.15 pF/mm (1.5 pF/cm), supplement p.13 | authors' junction model (simulated); comparable | 0.2285 (+52 %) | 0.2296 (+53 %) | fail (tol 15 %) |
| VpiL | 0.96 V cm, supplement p.8 | measured, slow-light ng 6.1, Vpi fit over 0-5 V; comparable: false | 1.65 at 3.5 V (single arm), 0.83 push-pull | 2.11 / 1.05 | not evaluated |
| bw3db | 110 GHz at 3.5 V, Fig. 4(D) | measured; comparable: false | f_RC 125 GHz (RC only) | 158 GHz | not evaluated |

Notes (facts from the runs; interpretation labelled):
- Mesh check (cut 1, meshScale 0.7, 42,449 nodes): C' changes <= 2e-4 relative, dn_eff <= 1.4e-4, R' up to 1.9 %
  at 5 V (0.03 % at 0-3.5 V). The C' gap to the target is not a discretisation effect.
- C' finite difference vs linear response 4.8e-4 to 1.5e-3 (the open DevLog-039 item, larger here than on the
  canonical rib). Depletion-side space-charge C' is 0.0022 pF/mm below the terminal C' (metal fringe of the vias).
- Derived check (own arithmetic, DevLog-039 closed form with 2 V_t, N_A = N_D = 5e17, n_i 1.0017e10, eps 11.7,
  junction height 0.22 um, 1D): C' = 0.341 / 0.152 / 0.131 pF/mm at 0 / 3.5 / 5 V, depletion width 67 / 150 /
  174 nm (stays inside the 455 nm core). The paper's 1.5 pF/cm at 3.5 V equals this 1D parallel-plate value within
  1 %. Interpretation (not verified against the authors' model, which is not described): the authors' "PN junction
  model" is likely 1D, and the 2D excess of about 0.077 pF/mm (0.094 at 0 V) is the fringe field through the SiO2
  above and below the core and the slab. Cut 1 and cut 2 differ by 0.5 % in C' (the junction is the same; fingers
  sit in the 5e17 bands outside the depletion region).
- Context only (not a target, not in devices.csv): the paper's design value BW_E = 1/(2 pi R_j C_j) about 200 GHz at
  4 V (p.5, Fig. 2(F)); engine f_RC at 4 V is 132 (cut 1) / 167 (cut 2) GHz with R' from the quasi-neutral
  conduction solve and the digitized via position (low confidence).
- dn_eff and VpiL are straight-waveguide values; the slow-light device is enhanced by roughly ng ratio (paper
  ng 6.1 vs straight-cut ng not computed here); no comparison is made.

## Open items

- C' target fails by +52 %: likely a definition difference (1D model vs 2D terminal charge with oxide fringe);
  needs the authors' model definition or an independent 2D reference (T5 K11-style DEVSIM run on this geometry)
  before reading it as an engine error. Inputs were not tuned.
- Runner: `run-cli.mjs` has no `--section`; cut 2 needs `runSemiconductor(..., {section})` (or `runConfig`
  dispatch, DevLog-039 hook list).
- Engine coverage: sia2022 needs a 2 um plasma-dispersion row (Nedeljkovic 2011 Table 1 rows beyond 1.55 um are not
  implemented; to be read from the PDF by an engine lane, not inferred here).
- Corrugated cut averaging (fill factor of cut 2 along z) is unresolved: the Fig. 2(A) "250 nm" dimension is not
  identified in the text; the digitized finger is about 105 nm of the 300 nm period.
- 26 further silicon plasma-dispersion papers in data/devices.csv not screened in this lane (brief: stop at 5).

## Round 2 (orchestrator request 2026-10-16)

### Plan

1. han2023: mark the C' target `comparable: false` (definition mismatch: authors' 1D depletion value vs the engine's
   2D terminal C' with fringing), add a limitation, keep the engine value reported; no input change.
2. Screen the remaining 26 `silicon_plasma_dispersion` papers in data/devices.csv (text, then figures where the
   numbers might only be drawn); one row per paper; build configs for papers that disclose enough (up to 6;
   priority: measured VpiL(V) or C(V) at 1.31 / 1.55 um); run; record results.
3. List papers that need plasma-dispersion rows the engine does not have.

### han2023 change

`semiconductor.targets[0].source.comparable: false` with the reason in the note, plus a limitation line. Inputs are
unchanged, so the han2023 results above still hold. The semiconductor stage does not read `comparable`
(`compareSemiTargets` in `engine/src/semi-stage.mjs` evaluates every target), so its target list still shows `fail`
for this entry. An engine hook is needed to honour the flag the way `config.targets` does (`run.mjs`).

### Screening (2026-10-16; read: devices rows, text.md, figures where noted)

| Paper | Device | lambda (nm) | Disclosed | Missing / blocker | Decision |
|---|---|---|---|---|---|
| anjali2025 | MZM design study (3 substrates, simulated) | 1550 | Table 1 geometry; substrate III: entire layer 1e17 p/n on a 1e15 p background, p++/n++ 1e20, gap 6 um, BOX 2 um (Fig. 2(b)), dn_eff 1.1e-4 and VpiL 3.17 at 5 V | w_low / w_high not given (digitized from an unscaled schematic; dn_eff insensitive, p.6); substrates I/II: the chosen doping depth d is not stated | build substrate III (anjali2025-c) |
| bao2026a | 6 um ring, T-coil | 1310.8 | N 1.06e20 / 1.02e19, P 7.14e19 / 5.34e18, 380 nm width | slab, BOX, junction and region offsets, lighter doping levels; ring (pm/V only) | skip |
| bao2026b | 4.1 um microdisk | 1326.3 | N 1.0e20 / 1.0e19 / 3.8e17, P 7.1e19 / 5.3e18 / 2.1e17 | region radii and offsets, slab; disk geometry (not a straight cut); 1326 nm is 0.026 um outside the 1.3 um row tolerance | skip |
| deng2026a | CL-TWE MZM | n/s | 220 nm SOI, 2 um BOX, VpiL 1.5 | doping ("customized"), rib, slab, offsets, wavelength | skip |
| dong2026 | MZM | n/s | 220 nm, 3 um BOX | doping, rib, offsets | skip |
| geravand2025 | racetrack MRM | 1549.9 | six doping layers about 2-7e18 cm^-3 | per-layer concentrations and positions, rib, slab | skip |
| gong2026 | S-junction MZM | n/s | "low rib doping" | all concentrations, geometry | skip |
| hsu2024 | HfO2/ITiO MOS ring | 1317.5 | Si p 1e17 / 3e18 / 1e20, ITiO 1.23e20 | MOS gate (HfO2, ITiO): the engine has no gate contact or TCO material | skip (engine) |
| hu2023 | racetrack MRM | 1312 | 220 / 150 nm etch, 420 nm, 2 um BOX, about 3e18 | P+/N+ concentrations and offsets, contacts; VpiL bias | skip |
| kawahara2025 | PCW MZM | 1537 | segments, electrode | doping, PCW geometry | skip |
| kawahara2026 | hole PCW MZM | n/s | NA 9.5e17, ND 1.0e18, a 404 nm, holes 230 nm | heavy doping, offsets; hole lattice has no 2D cross-section; slow light (ng about 30) | skip |
| lin2026 | ring | n/s | 220 nm, C 19.3 fF | doping, geometry | skip |
| liu2026a | narrow-trench MRM | 1313 | 220 nm, 2 um BOX | doping levels not given | skip |
| liu2026b | serpentine segmented MZM | O-band (value n/s) | 220 nm, 150 nm etch, 380 nm, 2 um BOX; P 6e17, N 1e18, P+/N+ 1e19, P++/N++ 1e20; 100 nm junction offset; VpiL 1.14 at -2 V | P+/P++ offsets and contacts (Fig. 1(b) unscaled schematic), junction offset direction, exact wavelength | skip |
| liu2026c | tabbed-electrode MZM | 1310 | 220 / 150 nm etch, 380 nm, 2 um BOX; p+ 5.3e18, n+ 1.0e19, p++ 7.4e19, n++ 1.1e20; VpiL 0.9 / 1.18 | P and N body (core) doping not stated; offsets not given | skip |
| rakowski2026 | S-junction ring | 1314.4 | 160 nm rib, 400 nm, 55 nm slab, C 50 fF | doping levels, junction shape | skip |
| saxena2023 | microdisk | 1566.7 | 220 nm, about 5 um disk | doping, geometry | skip |
| shawon2024 | ring-assisted MZM | 1550 | 450 nm, 110 nm slab; region offsets 0.6 / 1 / 1.225 / 2 um (Fig. 11) | concentrations (back-calculated from PDK sheet resistance, not disclosed) | skip |
| shen2021 | L-junction ring | 1960 | 600 nm rib, 90 nm slab, 2 um BOX; n 4e18, p 1.5e18, n++/p++ 1e20, heavy 0.5 um from the waveguide; VpiL 0.975 | 2 um plasma-dispersion row missing in the engine (L-shaped junction also needs a 2D doping polygon) | skip (engine row) |
| sun2026 | vertical-PN ring | 1310 | 270 nm SOI, 200 nm etch, junction 93 nm from the inner edge | concentrations (the 1.8e18 figure is a variation estimate) | skip |
| wang2026a | MZM | n/s | 2.25 mm, VpiL 2.3 / 1.36 | doping "optimized", no numbers; geometry | skip |
| weckenmann2026 | IQ MZM | n/s | none for the junction | doping, geometry | skip |
| yang2026 | 1D PhC slow-light MZM | 1310 | P 3.8e17, N 7.1e17, intermediate 2.8e18 at 400 nm, P++/N++ 1.9e20, 220 nm, 2 um BOX | slab thickness, junction position, P++ offset, waveguide-width definitions (W1-W3 in lattice units); slow light ng 16.3 makes VpiL 0.66 non-comparable | skip |
| yin2026 | Euler-bend ring | n/s | 220 nm, 90 nm slab | doping levels not stated | skip |
| yue2023 | DDMZM (two foundries) | n/s | 450 / 500 nm, 70 nm slab, junction offset 50 nm, heavy 750 / 700 nm from the edge | doping concentrations not stated | skip |
| yue2025 | NPN/PNP equalized MZM | n/s | 500 nm, 90 nm slab, 2 um BOX, junction offset 50 nm, heavy 750 nm from the centre | doping concentrations not stated | skip |

n/s = not stated in the devices row or text.

### Plasma-dispersion rows the engine lacks (for the engine lane)

- 2 um band: sia2022 (1970 nm), shen2021 (1960 nm); shen2021 also discloses enough doping and geometry to build
  once the row exists (L-shaped junction as polygons).
- Outside the 1.3 um row tolerance (0.02 um): bao2026b (1326.3 nm, not buildable for other reasons).

### anjali2025-c config (sims/anjali2025/config.yaml)

- Substrate III of a simulation design study: 220 nm Si, 500 nm rib, 130 nm etch (90 nm slab), 2 um BOX,
  n_Si 3.475 and n_SiO2 1.4447 (paper values), p/n 1e17 over the whole device layer on a 1e15 p background,
  junction at the rib centre, p++/n++ 1e20, vias 6 um apart (inner edges).
- Fig. 2(b) digitization (img_p03_1.png, 1151 x 427 px): along the slab row y = 290 px: slab 628-1145, P++ 670-784,
  N++ 986-1109; vias 701-756 and 1021-1076; scale from g = 264 px = 6 um (22.7 nm/px), centre 888 px. P++ inner
  2.36 um, N++ inner 2.23 um, outer 4.95 / 5.02 um, slab ends 5.91 / 5.84 um, via width 1.25 um. The schematic is
  not to scale near the rib (the 500 nm rib spans about 54 px = 1.2 um at this scale), so these are low confidence.
- Targets (semiconductor stage, simulated, comparable): dn_eff 1.1e-4 at 5 V (p.6), VpiL 3.17 V cm (Table 2).
  `targets`: bw3db 9.5 GHz (INTERCONNECT), comparable: false.
- Schema: 0 errors (jsonschema); `parseConfig` passes (silicon n override 3.475, eps_r 11.7 from the library).

### anjali2025-c results (2026-10-16, Node 23.7, nice 10)

43,981 device nodes (30,138 semiconductor), optical 2,398 nodes, n_eff 2.56654 (paper MODE 2.5675), TE fraction
0.986. 21.9 s, RSS 471 MB. Charge neutrality <= 1e-11 relative; Newton 12-16 iterations per 1 V step.

| Bias (V reverse) | C' (pF/mm) | R' (ohm mm) | f_RC (GHz) | dn_eff | loss (dB/cm) | VpiL secant (V cm) | VpiL differential |
|---|---|---|---|---|---|---|---|
| 0 | 0.2378 | 68.02 | 9.8 | 0 | 1.37 | - | 2.421 |
| 1 | 0.1749 | 68.06 | 13.4 | 3.201e-5 | 0.97 | 2.421 | 2.916 |
| 2 | 0.1486 | 67.55 | 15.9 | 5.316e-5 | 0.70 | 2.916 | 4.234 |
| 3 | 0.1327 | 65.94 | 18.2 | 6.863e-5 | 0.51 | 3.388 | 5.678 |
| 4 | 0.1211 | 63.97 | 20.5 | 8.046e-5 | 0.37 | 3.853 | 7.326 |
| 5 | 0.1108 | 61.82 | 23.2 | 8.978e-5 | 0.26 | 4.316 | 8.310 |

| Target | Paper (simulated) | Engine | Status |
|---|---|---|---|
| dn_eff at 5 V | 1.1e-4 (p.6) | 8.978e-5 (-18.4 %) | fail (tol 15 %) |
| VpiL at 5 V | 3.17 V cm (Table 2) | 4.316 (+36.1 %) | fail |
| bw3db | 9.5 GHz | not modelled (f_RC 23 GHz at 5 V, RC only) | comparable: false |

Checks and sensitivities (reported, not used to change the config):
- Mesh (meshScale 0.75, 71,697 nodes): dn_eff and VpiL change < 1e-5 relative, C' < 1e-3, R' < 0.2 %.
- P++/N++ inner edges moved to 3.0 um (under the via inner edges): dn_eff, VpiL, C' and loss unchanged to 1e-6;
  R' 68 -> 89 ohm mm at 0 V. Consistent with the authors' statement that dn_eff of substrate III barely depends on
  the electrode placement (p.6).
- Plasma-dispersion model swapped to Soref-Bennett 1987 (scratch copy of the config, not in the repo): dn_eff(5 V)
  1.0893e-4 (-1.0 % vs 1.1e-4), VpiL 3.557 V cm (+12 % vs 3.17; +1 % vs the 3.52 V cm implied by the paper's own
  dn_eff), loss at 0 V 1.96 dB/cm. Interpretation (not stated by the authors): their CHARGE/MODE run most likely used
  the Soref-Bennett coefficients, and the Nedeljkovic-vs-Soref-Bennett difference (about 18 % in dn_eff here) explains
  the default-run miss. The config keeps the engine default (Nedeljkovic) because the authors' model is not stated.
- Context: the paper keeps the carrier-induced loss < 2 dB/cm (p.5, Fig. 9(a)); engine 1.37 dB/cm at 0 V
  (Nedeljkovic), 1.96 (Soref-Bennett). Paper TE n_eff 2.5675 vs engine 2.56654 (same indices, -0.04 %).

### Open items (round 2)

- Engine: `compareSemiTargets` ignores `source.comparable` (han2023 C' still shows fail in the stage output).
- Engine rows: 2 um Nedeljkovic rows (sia2022, shen2021).
- anjali2025: substrates I/II need the chosen doping depth d; w_low / w_high not stated for any substrate.
- liu2026b would be buildable with the P+/P++ offsets, junction-offset direction and exact wavelength
  (author contact or a fuller version).
