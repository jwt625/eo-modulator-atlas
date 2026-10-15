---
title: Simulator roadmap - TFLN-first browser solver (electrostatics + eigenmode), validation, performance, COMSOL-style UI
date: 2026-10-14
status: plan (no implementation yet)
owner: unassigned (written by Claude at Wentao Jiang's request)
scope: engine/, app/src/routes/sim/ and sim UI components, sims/ TFLN configs, validation suite
---

# DevLog-023: simulator roadmap (TFLN first)

## Requirements (user, 2026-10-14)

1. Runs in the browser, no server. As native as possible; minimize dependencies unless absolutely necessary.
2. Ruthlessly optimize for performance.
3. UI/UX follows COMSOL (model tree, settings, graphics, results) while staying clean, simple, straightforward.
4. Start with TFLN modulators: one quasi-static electrostatics (QSE) solve and one optical eigenmode solve per cross-section.
5. Parametric sweeps where papers report them (e.g. electrode-gap sweep).
6. Validate against existing reference numbers. Track progress in DevLogs.

## Review of the current state (2026-10-14)

### Engine (`engine/src`, ~4.5k lines ES modules, deps `yaml`, `robust-predicates`)

| Piece | State |
|---|---|
| Mesh | Own conforming Delaunay-refinement mesher (`mesh.mjs`), polygon PSLG, graded sizing from sources, 80k-vertex budget |
| Electrostatics | P1 anisotropic FEM, terminal-charge and energy C', vacuum C0', quasi-TEM n_RF, Z0, L' (`electrostatics.mjs`, `fem.mjs`) |
| Linear algebra | JS up-looking sparse Cholesky, nested dissection by coordinate bisection (`sparse.mjs`) |
| Optics | **Scalar** P1 FEM only (forms E/H), shift-invert subspace iteration; group index by finite difference in wavelength (2 extra eigen solves) |
| EO | First-order Pockels overlap with explicit arm windows, Vpi convention gating (`eo-overlap.mjs`, `stages.mjs`) |
| RF | Uniform quasi-TEM line, tan delta region participation, Wheeler R' via recessed solves (`rf-line.mjs`, `recess.mjs`) |
| Not implemented | Full-vector optical modes, periodic loaded line, EO response (S21_EO, bandwidth), parametric geometry, sweeps |
| Tests | `cd engine && npm test`: 134 tests (133 pass, 1 todo = audit D5 scalar vertical-wall error) per DevLog-012 |

Known physics limit that matters most for TFLN: the scalar forms are exact only at horizontal interfaces. Audit D5
(`DevLog/audits/e2-e3-claude-wave-2026-10-02-q2.md`) shows |delta n_eff| = 0.081 in the pure vertical-wall limit;
the error on real ribs is unquantified. The EO overlap inherits it through the mode weight. A full-vector mode
solver is the main missing piece for credible VpiL.

### Measured baseline (this session, Node 23.7.0, local machine)

- `node engine/cli.mjs sims/mao2022/config.yaml --stages optical_mode`: 2.62 s wall, 33,034 electrostatic nodes.
  Result n_RF 2.3532, Z0 41.98 ohm, ng 2.6114, n_eff 2.1361. Paper's own simulated values: n_RF 2.34, Z0 44, ng 2.62.
- CPU profile of the same run (975 ms sampled): numeric Cholesky `factor` 228 ms, `solveModesAt` 86, triangular
  `solve` 79, mesh `sizeAt` 75, ND ordering `rec` 64, `meshDomain` 55, `SparseCholesky` setup 34, `matVec` 32,
  `assemble` 23, `distPointSegment` 23, `buildPattern` 19.
- `chen2022 --stages optical_mode`: stops (gold intersects the optical window; metal policy `reject`). Electrostatics
  alone: 51,643 nodes, n_RF 1.605, Z0 37.8 ohm on the loaded cut (not comparable to the line values).
- `renaud2023`: fails at parse, `materials.lithium_niobate.eps_r: RF permittivity is required`.
- `mao2022 --check`: `eo_overlap` blocked (no `optics.eo` arm windows), `rf_line` blocked (no `dielectric_loss_model`).
  The same blocks apply to every paper config. **No paper config can run the EO overlap today.**

### Configs (`sims/`, 40 files, all `unvalidated`)

- 39 of 40 are LN or LT (deng2026 is BTO). 12 use `periodic_t_rail` loading. `reported_curves` is empty in all 40.
- Geometry is hand-written absolute polygons. There is no parameter layer, so a gap sweep means editing every
  coordinate by hand.
- Constants (LN eps_r, r_ij, Au sigma) are per-config, several labelled as unverified placeholders. The material
  library (`engine/data/materials.json`) holds optical dispersion only (Zelmon LN, Malitson SiO2, Luke SiN, Si).

### App (`/sim`)

- Two-column page: YAML textarea, SVG geometry preview (fixed color map, no mesh view), stage checkboxes, metrics
  cards, target table, RF sweep plot (Plotly).
- No field visualization (potential, E, optical mode), no mesh view, no probe or cut lines, no sweeps, no model tree.
- Plotly chunk is 4.6 MB (`app/build/_app/immutable/chunks`). `app.css` uses a global `border-radius: 0 !important`.

## Related projects outside this repo (surveyed 2026-10-14, read-only)

### `PlayGround/20260614_2d_eo_fem_solver` (eo_fem, GPL, the engine's origin)

- Browser UI: vanilla ES modules, no build, no deps. COMSOL-like Model Builder tree (Study, Geometry, Mesh,
  Results), YAML textarea, log panel, draggable splitter, view modes geometry/mesh/results, quantity and mode
  selectors, linear/symmetric/log scale, colorbar, pan/zoom, hover probe with a spatial-bin index, mesh LOD
  (viewport culling plus stride, 30k budget, `web/core/mesh_view.js`), MSH 4.1 parser in a worker
  (`web/core/workspace_io.js`; 86,480 nodes parsed in ~165 ms). **Reuse the UI patterns.** All rendering there is
  Canvas 2D flat-shaded per triangle; no Gouraud shading, contours or arrows.
- Solvers: structured grid, electrodes by node pinning (not conforming), Jacobi PCG; scalar FD mode by power
  iteration (not target-centred). Its "vector" mode solver is two decoupled scalar solves plus a post-hoc Ez. That is
  not a vector solver; do not port it.
- No EO overlap, no VpiL, no Tidy3D or COMSOL reference numbers stored (artifacts are gitignored).
- Open bugs there: differential-drive capacitance normalisation (C_charge 2x, C_energy 4x with +-0.5 V; fixed in this
  engine), LN RF tensor in `examples/tfln_partial_etched_mzm.yaml` looks swapped for x-cut (eps_xx should be ~eps33).
- Design worth carrying (DevLog-003, DevLog-006 there): vector-mode validation ladder (PEC box, slab TE/TM, Si strip
  within 1-3 % of Tidy3D, then TFLN); per-mode result contract (n_eff, beta, E/H components, TE fraction, mode area,
  overlap, residual); backend-neutral `MeshSequences` (size, distance threshold, box size, curvature, refine); typed
  arrays with transferables for large meshes; Model Builder node set (Size, Proximity, Statistics, Warnings; Build
  Selected / Up To Here / All); color mesh by size or quality.

### `agentic-multiphysics-harness` (GPL-3.0-or-later)

- Three TFLN decks with scikit-fem P1 scalar mode + anisotropic electrostatics + EO overlap
  (`examples/<deck>/{solver,evidence}.json`, `src/amh/eo_examples/solver.py`). All use LN eps_xx/eps_yy 28/43,
  r33 30.9 pm/V, push-pull factor 2, 1 V differential.
  - Chen 2022: computed n_eff 1.82468, ng 2.2092, VpiL 2.009 V cm; paper simulated VpiL 2.10, measured 2.20-2.25.
    RF fails (single T-segment cut: n 1.793, Z 148 ohm vs paper 2.15-2.24, 50-54 ohm).
  - Lee 2026 (mid-IR, suspended): ng 2.2863; VpiL 6.185 V cm at 3 um vs interpolated 6.6.
  - Shen 2024 (Nb): ng 2.2486, VpiL 2.674 V cm vs 2.2; RF normalisation ambiguity unresolved.
  These are cross-solver numbers (same physics class, different code), useful as secondary checks.
- `src/amh/eo_examples/transmission_line.py`: exact distributed Bloch cell (half line, shunt jwC_T, half line),
  Bloch group velocity, traveling-wave response |(1 - e^-x)/x| with x = (alpha + j 2 pi f (n_RF - ng)/c) L. Synthetic
  tests only. Port the formulas (clean re-derivation keeps the license question moot; both repos are GPL anyway).
- COMSOL corpus (`docs/research/COMSOL_VALIDATION_100.md`): relevant hooks are 132561 coax TL parameters, 100581
  CPW resonator, 15061 Mach-Zehnder modulator (lambda 1.55 um, n_core 2.22, n_clad 2.2, r13 30 pm/V, eps_r 35,
  w 2 um). Raw files are local-only, for the user's licensed manual comparison.

### `InP-Modulator` (no LICENSE file; co-owned; use formulas only, clean-room)

- Closed forms worth a JS port: CPW/CPS conformal maps (K(k)/K(k'), `ellipk` takes m = k^2), Ghione-Naldi multilayer
  eps_eff, finite-thickness R_s coth(t/delta), Hammerstad roughness, Wheeler alpha_c = R/(2 Z0), Floquet ABCD, Bragg
  frequency, `eo_transfer` with forward + reflected terms (sign: gamma - j beta_o).
- Pitfalls recorded: Re gamma >= 0 branch; Y_L per period vs per length; Np to dB and /m to /cm; Z_diff = 2 Z_odd;
  TEM identity needs the same conductor set; domain truncation ~20 (S + 2W) (smaller cost 13 % on C); analytic T-rail
  capacitance unreliable (x23 fudge in its Shin regression). No T-rail line closed against a paper in either repo.

## Validation reference set (TFLN), by tier

Rule: compare like with like. A paper's own simulated values (basis `simulated`, 205 evidence entries in the
database) remove fabrication spread and are the first literature tier. Measured values come after convergence and
model-limit checks.

| Tier | Reference | Quantities | Source |
|---|---|---|---|
| A analytic | parallel plates, half/full domain, anisotropic rotation, slab TE/TM, group index (exist) | C', n_eff, ng | engine tests |
| A analytic (new) | CPW / CPS on zero-thickness strips by conformal map; two-layer Ghione-Naldi CPW | C', Z0, n_RF | closed form, own AGM `K(k)` |
| A analytic (new) | uniform-field Pockels gate (exists in the EO fixture) plus vector-solver slab and PEC box | dn, VpiL, n_eff | closed form |
| B cross-solver | Tidy3D free mode solver on 3 canonical TFLN ribs; COMSOL by the user; harness decks above | n_eff, ng, mode overlap, VpiL | external runs |
| C paper simulated | mao2022 n_RF 2.34, Z0 44, ng 2.62; rahman2025 simulated VpiL 2.75 (CPW) and 3.33 V cm; li2022b simulated VpiL 0.90 V cm; chen2022 simulated VpiL 2.10 V cm | as listed | `data/devices.csv`, evidence yaml |
| D paper sweeps (measured) | renaud2023 Vpi vs gap at 738 nm, L = 10 mm: 2.5/3/4/5 um -> 0.47/0.55/0.79/0.93 V; Vpi vs wavelength at 3 um gap: 532/638/738/838/938 nm -> 0.42/0.45/0.55/0.85/0.80 V | Vpi | devices rows `renaud2023-*` |
| D paper sweeps (measured) | arabjuneghani2022 gap 5/10 um -> VpiL 2.2/3.3 V cm (L 5 mm); rahman2025 gap 4/5/6 um -> VpiL 3.4/3.83/4.29 V cm (mixed CPW/CL, check comparability) | VpiL | devices rows |
| D figure curves | digitized sweep figures (VpiL vs gap, Z0/n_RF vs signal width) into `reported_curves` with locators | curves | to do per paper |

Before using any row above: re-read the evidence entry and the paper locator. Several configs carry
`source.comparable: false` or contested inputs (li2022b gap 5.5 vs 5.9 um; renaud2023 signal/ground widths not stated,
which matters for RF, not for DC VpiL).

## Architecture decisions (proposed; record changes here)

- D1 Engine stays dependency-free ES modules running in a Web Worker. No server. Node runs the same code for CLI/tests.
- D2 Full-vector optical solver = FEM on the existing conforming mesh: Nedelec (H(curl)) edge elements for E_t plus
  Lagrange nodal for E_z (Lee-Sun-Cendes beta^2 formulation), first order then second order. Reason: conformal
  sloped sidewalls and thin electrodes (staircase-free), same mesh as electrostatics, COMSOL's own formulation for
  "Mode Analysis". FD (Yee) stays out; Tidy3D serves as the FD cross-check.
- D3 Linear algebra: one symbolic analysis per mesh (ordering, elimination tree, column counts) shared by every
  numeric factorization on that mesh (electrostatics, Wheeler, wavelength steps, material sweeps). Add symmetric
  indefinite LDL^T for the vector shift-invert operator, then complex-symmetric LDL^T for lossy metal.
- D4 WASM only behind a benchmark gate: if a supernodal JS factorization is still > 2x slower than a hand-written
  WASM kernel (C or Rust, built from source in repo, zero runtime deps), adopt the kernel for numeric factorization
  only. No SharedArrayBuffer (GitHub Pages cannot set COOP/COEP); use transferable ArrayBuffers.
- D5 Parameters and templates: configs gain a `params:` block (name, value, unit) and an optional
  `template:` that generates the existing polygon geometry. Downstream engine code keeps consuming polygons.
  Expressions use an own tiny parser (+ - * / ^, parentheses, min, max, sqrt, abs), never `eval`.
- D6 YAML remains the single serialization. UI forms edit the parsed model and write YAML back; the YAML tab stays.
- D7 Plots on `/sim` drop Plotly: own Canvas/SVG 1D plot component (axes, log toggle, hover, overlay of paper
  points). Plotly stays (lazy-loaded) on `/explore` until replaced separately.
- D8 Field rendering: WebGL2, per-vertex values with a 1D colormap texture (Gouraud), mesh wireframe pass,
  contours in the fragment shader, arrows as instanced quads; Canvas 2D fallback.

## TODO

Each phase: write its plan into this DevLog first, implement, run gates, log timestamped progress, fresh-context
audit after S4 and S5. Benchmarks and logs go to `logs/` with timestamped filenames; solver outputs are never committed.

### S0 Baseline and instrumentation

- [x] Per-phase timers in the result (`timing`: mesh, pattern, ordering, symbolic, numeric factor, solves, eigen
      iterations, per stage) and nnz(L), fill ratio, DOF counts; show in the UI log.
- [x] `engine/bench/bench.mjs`: fixed set (mao2022, renaud2023 once runnable, arabjuneghani2022, chen2022 unloaded,
      synthetic GSG fixture), N repeats, median, JSONL output `logs/bench-YYYYMMDDTHHMM.jsonl`.
- [x] Record baseline numbers in this DevLog (starting point above: mao2022 ES + scalar mode 975 ms CPU).

### S1 Unblock TFLN runs (minimal data plumbing)

- [x] Sourced RF/EO constants library for congruent LN (and LT next): eps_r tensor (clamped/unclamped choice stated),
      r13, r22, r33, r51, with primary citations (candidate to verify: Weis and Gaylord, Appl. Phys. A 37, 191 (1985));
      configs reference `library:` keys; per-config override remains. Fixes renaud2023-type parse failures.
- [x] Apply DevLog-012 proposals 1 and 3 to the TFLN configs: `optics.eo` arm windows, target `vpi_convention` from
      the devices row. Template-generated configs (S2) emit arm windows automatically from the geometry.
- [x] `rf_line` readiness: explicit `dielectric_loss_model` per config (sourced tan delta, or `none` recorded as an
      assumption) so RF stage runs on uniform-line TFLN configs.
- [x] Gate: mao2022, renaud2023, arabjuneghani2022 run electrostatics + optical + eo_overlap end to end in Node and
      browser.

### S2 Parameters, TFLN templates, parametric sweep

- [x] `params:` block plus expression parser (D5); any numeric field may reference a param.
- [x] Template `tfln_rib_gsg` (x-cut): film thickness, etch depth, rib top width, sidewall angle, BOX, substrate,
      optional cladding/buffer, electrodes on slab or on cladding, gap, signal width, ground width, metal thickness,
      push-pull (two arms) or single arm; emits regions, electrodes, arm windows, optical window, mesh hints.
- [x] Template variants after the first passes gates: unetched film with loading strip (mao2022), single-arm phase
      shifter, CPW with substrate undercut (rahman2025). z-cut later.
- [x] Sweep study: `study: {type: parametric, sweep: [{param: gap_um, values: [...]}]}` (list or range, nested
      sweeps), run on a worker pool (`hardwareConcurrency - 1`), stream results, cancel.
- [x] Reuse across sweep steps: material-only or wavelength sweeps reuse mesh + symbolic factorization; geometry
      sweeps remesh, warm-start the eigen solve from the previous step's n_eff.
- [x] Gate: renaud2023 gap sweep (4 points) and wavelength sweep (5 points) run in the browser; results table and
      plot with the paper points overlaid.

### S3 Performance (profile-driven; targets refined after S0)

- [x] Group index from the eigenvector (first-order perturbation including material dispersion) instead of two
      extra eigen solves; keep FD as a test oracle.
- [x] Mesh sizing: spatial grid or BVH for distance-to-source queries (`sizeAt`, `distPointSegment`).
- [x] `buildPattern`: counting sort into typed arrays (no array-of-arrays).
- [x] Ordering: compare coordinate-bisection ND vs AMD vs graph ND on nnz(L) and time; keep the best per mesh size.
- [x] Supernodal (or multifrontal) numeric Cholesky/LDL^T with dense blocked kernels; reuse symbolic analysis (D3).
- [x] Wheeler: 3 recessed vacuum solves share one pattern where topology allows; otherwise run in parallel workers.
- [x] P2 elements for electrostatics and optics; benchmark error vs DOF vs time against P1 on the same gates.
- [x] D4 benchmark gate for a WASM numeric kernel.
- [ ] Targets to confirm after S0 (proposed): single TFLN section ES + vector mode + EO overlap < 0.5 s at default
      accuracy; 10-point gap sweep < 3 s wall on an 8-core laptop; first paint of results < 100 ms after solve.

### S4 Full-vector optical eigenmode solver

- [x] Nedelec-Lagrange (E_t, E_z) formulation, anisotropic diagonal and rotated in-plane tensors, PEC/PMC and mirror
      symmetry boundaries; spurious-mode filtering; shift-invert around (k0 n_target)^2 with LDL^T.
- [x] Mode results: n_eff, ng (perturbation), E and H components, TE fraction, mode area, confinement per region,
      residual ||A u - beta^2 B u||.
- [x] Vector EO overlap: delta beta = (omega eps0 / 4P) integral E* . delta eps . E dA with delta eps from the full
      Pockels tensor and the full static field (includes the shear terms the scalar path drops).
- [x] Lossy metal in the optical window (complex Au permittivity, complex-symmetric solve): unblocks chen2022-type
      narrow gaps and gives metal absorption. After the lossless version passes.
- [x] Gates: PEC rectangular waveguide (closed form), slab TE/TM, audit D5 laterally stratified slab (should resolve
      the todo), Si strip and 3 TFLN ribs vs Tidy3D within 1e-3 in n_eff, scalar vs vector difference reported.

### S5 Validation suite (TFLN)

- [x] Tier A new analytic gates: conformal-map CPW/CPS (own AGM elliptic integral), two-layer CPW.
- [ ] Automated convergence study per run option: 3 mesh levels, Richardson estimate, domain-size check; reported
      as error bars in the UI.
- [x] Tier B: export a canonical TFLN rib set (3 geometries) to a Tidy3D script and a COMSOL parameter/geometry
      table; record returned numbers in `engine/tests/fixtures/` with their provenance (user runs COMSOL).
- [ ] Tier C: paper-simulated targets (table above) as regression tests, tolerance from the paper's own stated
      precision; enumerate remaining LN/LT `simulated` evidence entries by script.
- [ ] Tier D: `reported_curves` for papers with sweep figures (digitized, with locator); sweep studies compare
      curve-to-curve.
- [ ] Promote `validation_status` only when its gates pass (`analytic_gates_pass`, `cross_solver`,
      `literature_regression`), recorded here.

### S6 UI/UX (COMSOL-style, clean)

- [x] Layout: left Model Builder tree (Parameters, Materials, Geometry, Mesh, Physics: Electrostatics, Mode Analysis,
      EO Coupling, RF Line; Study: Stationary, Mode, Parametric Sweep; Results: plot groups, Derived Values, Tables),
      center Settings form for the selected node (units, tooltips), right Graphics canvas, bottom Messages / Progress /
      Log (timestamped rows) / Table tabs. Resizable splitters, stable layout while solving.
- [x] Graphics (D8): geometry with selection highlight; mesh view colored by size or quality; fields: potential,
      |E|, E_x, E_y, Pockels delta n, optical |E|^2 and components, H; colorbar with range lock and log; arrows;
      contours; pan/zoom/zoom-extents/zoom-to-window; hover probe (x, y, value, region, material).
- [x] Cut Line 2D tool: field along a drawn line as a 1D plot (e.g. E_x across the gap through the rib).
- [x] Results: mode table with mode picker, derived values (C', L', Z0, n_RF, Gamma, VpiL per arm), targets table,
      sweep 1D plot group with paper overlay, CSV/PNG export.
- [ ] Build controls: Build Selected / Up To Here / All for geometry and mesh; Compute for study; downstream results
      invalidated on upstream edits.
- [x] Shareable URL state: config id + param overrides + study.
- [x] Remove Plotly from `/sim` (D7); replace the global `border-radius: 0 !important` with per-component rules.
- [x] Reuse from eo_fem: tree, splitter, hover spatial index, mesh LOD, colormaps, log scale.
- [x] Gate: screenshot review at 1440 px and 390 px; smoke covers tree navigation, sweep run, field view, cancel.

### S7 RF and EO response (after S4/S5)

- [ ] `eo_response` for uniform TWE: closed-form traveling-wave response with loss, velocity mismatch, source/load
      mismatch (forward + reflected), bandwidth and roll-off targets.
- [ ] `loaded_line` for T-rail: per-period ABCD from loaded and unloaded cuts (exact distributed Bloch cell), Bloch
      impedance and index; T-segment capacitance from 2D cuts first, with a stated limit (no analytic C_T).
- [ ] Gates: harness Chen replay (-1.46 dB at 67 GHz from measured loss) as a formula check; chen2022, kharel2021
      line values as literature checks.

## Open questions for the user

1. COMSOL cross-check: will you run the Tier B canonical TFLN set (3 ribs, ES + mode) in COMSOL when the export is
   ready? Without it, Tier B is Tidy3D plus the harness only.
2. Home of the simulator UI: keep it as the atlas `/sim` route (current), or spin off a standalone simulator page
   that shares `engine/` and loads atlas configs?

## User answers (2026-10-14)

1. No COMSOL runs. Cross-checks use open-source packages as much as possible.
2. Simulator home: no preference, left to the orchestrator.
3. "Go ahead": implement. The orchestrator delegates all coding to subagents and does not code. Validation tasks use
   fresh-context subagents (never the implementer).

## Orchestration decisions (2026-10-14)

- O1 Simulator home: stays the atlas `/sim` route (shares `engine/`, config list, deployment), rebuilt as a
  full-viewport workbench. No separate app.
- O2 Tier B references from open-source solvers in an isolated uv project `validation/` (own `pyproject.toml`, not the
  root one): femwell (FEM vector modes and electrostatics on scikit-fem + gmsh), tidy3d local `ModeSolver` (FD, runs
  locally without the cloud), scikit-fem electrostatics, closed-form conformal maps. Reference JSON fixtures (inputs,
  package versions, outputs) are tracked; they are references, not atlas solver outputs (decision 8 unchanged).
- O3 Canonical cases (inputs only; identical YAML for the engine and the reference scripts, authored by the validation
  lane in `validation/cases/`):

  | Case | Description | Outputs |
  |---|---|---|
  | K1 | Si strip 500 x 220 nm in SiO2, 1550 nm, TE0 | n_eff, ng |
  | K2 | x-cut LN rib, air clad: film 600 nm, etch 300 nm, top width 1.0 um, sidewall 60 deg from horizontal, SiO2 below, 1550 nm, TE0 (n_e lateral) | n_eff, ng, TE fraction |
  | K3 | K2 with SiO2 cladding | same |
  | K4 | K2 rib pair in a G-S-G line: Au 0.8 um on the slab, gap 5 um, signal 20 um, grounds 100 um, BOX 4.7 um, Si substrate; LN eps_r perp/par 44/28; r33 30.9, r13 9.6, r22 6.8, r51 32.6 pm/V (case inputs, not material claims) | C', C0', Z0, n_RF, per-arm dn_eff/V, push-pull VpiL |
  | K5 | K4 gap sweep 3, 4, 5, 6, 8 um | same, vs gap |
  | K6 | zero-thickness CPW on a dielectric half-space and on a finite substrate (conformal map) | C', Z0, n_RF |

- O4 Lanes, write ownership (no two lanes edit the same file; each lane keeps its own DevLog; no git by subagents):

  | Lane | Scope | Owns | DevLog |
  |---|---|---|---|
  | L-PERF | S0 + S3 solver performance | `engine/src/{sparse,mesh,fem,geometry,electrostatics,optics,recess}.mjs`, `engine/bench/` | DevLog-024 |
  | L-VEC | S4 full-vector mode solver | new `engine/src/vector-mode.mjs`, `engine/src/ldlt.mjs`, `engine/tests/vector-*.test.mjs` | DevLog-025 |
  | L-PARAM | S1 + S2 params, templates, sweeps, material library, field export | `engine/src/{config,materials,run,stages,eo-overlap,rf-line}.mjs`, new `engine/src/{params,templates,sweep}.mjs`, `engine/data/`, `engine/schema/`, `sims/SPEC.md`, `sims/*/config.yaml`, `engine/README.md` | DevLog-026 |
  | L-UI | S6 workbench UI | `app/src/routes/sim/`, `app/src/lib/sim/` (new), `app/src/lib/{sim.worker.ts,CrossSection.svelte,SimStageResults.svelte}`, sim steps of `app/scripts/smoke.mjs` | DevLog-027 |
  | L-REF | Tier B references (fresh context, validation) | `validation/` | DevLog-028 |

  Cross-lane contract (L-PARAM implements, L-UI consumes, L-VEC extends):
  `runCrossSection(text, {..., fields: true})` adds `result.fields = {es: {x, y: Float64Array, tri: Int32Array,
  triRegion: Int32Array, regionNames, phi: Float64Array, ex, ey: Float64Array (per triangle)}, optical: {x, y, tri,
  triRegion, modes: [{n_eff, components: {psi | ex, ey, ez, hx, hy, hz}}]}}`. Typed arrays only (transferable).
  L-PERF exposes `timing` objects from the solver functions; L-PARAM passes them through as `result.timing`.
- O5 After each lane reports done: a fresh-context audit subagent (not the implementer) checks gates and numbers;
  corrections go to the lane DevLog. At most 5 subagents at once.

## Progress log

- 2026-10-14 22:45 PDT Review: read README, WORKBOARD, DevLog-000/003/012, engine README and sources, sim route,
  40 configs; profiled mao2022; ran chen2022/renaud2023/mao2022 readiness. External repos surveyed read-only by two
  subagents (eo_fem; harness + InP-Modulator). This DevLog written; no code changed.
- 2026-10-14 23:05 PDT User answers recorded; orchestration decisions O1-O5; claim
  `coordination/claims/claude-simulator-2026-10-14.md`. Wave 1 launched (5 subagents, background): L-REF (fresh
  context), L-PERF, L-VEC, L-PARAM, L-UI. Lane DevLogs 024-028 are written by the lanes.
- 2026-10-14 23:30 PDT User: be mindful of hardware, do not crash the machine (in use). Machine 12 cores / 24 GB;
  load average 3.96 at the time. Sent to all lanes: one CPU-heavy process per lane, `nice -n 10`, Node heap cap
  1.5 GB, Python BLAS/OMP threads 1-2, gmsh 1 thread, about 2 GB per lane, one headless Chrome and one preview server
  at most, pilot RSS before escalating, kill own runaways.
- 2026-10-15 L-PARAM reported done (DevLog-026): S1/S2, params, `tfln_rib_gsg` template, sweeps, field export,
  timing pass-through; engine 174 tests (173 pass, 1 todo D5). Gate configs run end to end; VpiL high vs papers
  (mao2022 2.797 vs 1.9, arabjuneghani2022 3.978 vs 3.3, renaud2023 0.625 vs 0.55 V cm); paper-simulated VpiL
  targets pass for li2022b, murai2025, pan2021, boynton2020. LN RF/EO constants from secondary open-access sources
  (primary Weis and Gaylord 1985 not accessible). Fresh-context audit launched:
  `DevLog/audits/simulator-l-param-audit-2026-10-14.md`.
- 2026-10-15 L-PERF reported done (DevLog-024): own AMD ordering, supernodal multifrontal Cholesky with symbolic
  reuse, ng by perturbation (one eigen solve), mesher 2.4-2.7x (bitwise identical meshes), P2 electrostatics option
  (4.7-4.8x faster than P1 at equal 0.08 % accuracy). Bench medians 2.5-6.5x faster wall (mao2022 ES+optical 889 ->
  292 ms), factor phase 3.7-21x; engine 187 tests (186 pass, 1 todo D5). Fresh-context audit launched:
  `DevLog/audits/simulator-l-perf-audit-2026-10-14.md`.
- Orchestrator decisions on L-PERF proposals: (a) WASM numeric kernel (hand-assembled, no toolchain, estimated 2.2x on
  factorization) deferred until S4/S5 correctness lands, then revisited as S3b; (b) Wheeler mesh morphing deferred;
  the recess vertex-budget failure (li2026aa, lin2025, qi2024 `rf_line`) is a round-2 fix; (c) P2 becomes the
  default for electrostatics only after the L-REF references confirm it (config key `mesh.element_order`, EO overlap
  sampling via `gradientAt`), round 2 for L-PARAM.
- 2026-10-15 L-VEC reported done (DevLog-025): Lee-Sun-Cendes vector FEM (order 1 Whitney+P1, order 2 hierarchical
  Nedelec+P2, default 2), quasi-definite LDL^T (real and complex) on the shared symbolic analysis, inertia check,
  lossy metal, vector EO overlap with full Pockels tensor. Gates G1-G9 pass (audit D5 slab now matched to ~1e-7 at
  order 2). Vs L-REF: K1 n_eff -5.5e-6, K2 +1.1e-6, K3 -1e-7; K4 arm dn/V +0.6 % (engine ES mesh budget-limited).
  K2 timing 310 ms (order 1) / 361 ms (order 2). Reported a pre-existing mesher bug (interface edges not always
  preserved, O(h) geometry error) in `mesh.mjs` -> round-2 fix for L-PERF. Fresh-context audit launched:
  `DevLog/audits/simulator-l-vec-audit-2026-10-15.md`.
- 2026-10-15 L-REF reported done (DevLog-028): `validation/` uv project; femwell is scalar-eps only, so an own
  anisotropic N2/P2 form (`eoref/fmode.py`, matches femwell on isotropic K1); tidy3d local ModeSolver as staircased
  cross-check (no subpixel averaging without licensed extras); scikit-fem P2 + AMG electrostatics; full-tensor
  Pockels EO. Key references: K2 n_eff 1.8941658 +- 1.9e-6, K3 1.9123755 +- 8e-8, K4 C' 146.519 pF/m, Z0 45.333 ohm,
  VpiL 2.27861 V cm (r33-only +4.5 %, scalar overlap +12.5 %); K5 VpiL 1.278/1.771/2.279/2.806/3.920 V cm at gap
  3/4/5/6/8 um. Resource note: one early SuperLU test reached 8.2 GB RSS for about 4 min before the lane switched to
  AMG; tidy3d levels 1.5-1.6 GB. Fresh-context audit launched: `DevLog/audits/simulator-l-ref-audit-2026-10-15.md`.
- 2026-10-15 L-PARAM audit done (`DevLog/audits/simulator-l-param-audit-2026-10-14.md`): 0 blocking, 4 major
  (A1 zhang2022 tan delta stated in the paper but recorded as absent, so its RF-loss pass is not real; A2 Si eps 11.7
  citation not found in the cited table; A3 renaud2023 z0 target cites an empty field; A4 DevLog-026 timestamps were
  not real clock times), 9 minor, 6 notes. Headline numbers, regression, configs, frame mapping and parser safety
  reproduce. A14: engine within ~4 % of papers' own simulated push-pull VpiL, so no factor-2 convention error; the
  high VpiL vs measured is geometry inputs and model idealisation per paper. Process issues: a shared-scratchpad
  root wipe by an unidentified agent (rule sent to all agents: own uniquely named subfolders only); a self-referencing
  symlink `engine/node_modules/node_modules` (agent-created 2026-10-14 23:22) removed by the orchestrator.
- 2026-10-15 L-UI reported done (DevLog-027): workbench (tree / settings with YAML tab / WebGL2 graphics / messages,
  log, table), cut line, native 1D plots, worker-pool sweeps with paper overlay, URL state; /sim loads 456 KB, no
  Plotly; app tests 46/46, check 0/0, build, smoke 21/21; 110k-200k triangles at 60 Hz, first paint 8-18 ms.
  Fresh-context audit launched: `DevLog/audits/simulator-l-ui-audit-2026-10-15.md`.
- 2026-10-15 Round 2 started for L-PARAM (same agent): audit fixes A1-A13, vector solver wiring
  (`optics.solver`), engine reference tests against `validation/reference/summary.json`, `mesh.element_order`,
  L-UI requests (mesh-only entry, YAML round-trip helper), scalar vs vector paper VpiL table.
- 2026-10-15 L-PERF audit done (`DevLog/audits/simulator-l-perf-audit-2026-10-14.md`): 0 blocking, 0 major, 5 minor
  (P1 symbolic reuse not fingerprinted, P2 `finite_difference_wavelength` now runs perturbation, P3 non-target mode
  residual criterion skipped, P4 bench regression too narrow, P5 n = 0 crash), 2 notes. Verified: AMD and
  multifrontal factor vs dense to 3.4e-14, shift acceptance safe, ng formula derived independently, P2 h^4 energy
  convergence, 28/28 meshes bitwise identical to HEAD, peak memory 27-42 % lower, no leaks over a 36-point sweep.
- 2026-10-15 Round 2 started for L-PERF (same agent): mesher interface-conformity bug (priority) with a survey of all
  configs, Wheeler recess vertex-budget failures, audit fixes P1/P3-P6. P2/P7 passed to L-PARAM round 2.
- 2026-10-15 L-VEC audit done (`DevLog/audits/simulator-l-vec-audit-2026-10-15.md`): vector solver sound (formulation
  re-derived, element matrices match an independent implementation to 2.4e-13, dense eigensolve agrees to 1e-13,
  all 21 gates pass, K2/K3 match L-REF). 1 major for L-PERF: V1 mesher drops interface subsegments (non-inclusive
  encroachment test vs exact incircle cavity test, no final conformity pass), present at HEAD; non-conforming meshes
  in 8/45 electrostatic (worst -0.97 % region area) and 29/71 optical meshes. Root cause forwarded to L-PERF round 2.
  4 minor (V2 inertia check at a material index, V3 complex refinement, V4 lossy shift below SPP, V5 bench script
  missing), 6 notes (V7: K1 reference likely under-resolves the Si corner, owner L-REF). Round 2 started for L-VEC.
- 2026-10-15 L-VEC round 2 done (DevLog-025): V2-V6, V8-V10 addressed; engine 205 tests (203 pass, 0 fail, 1 todo).
  K4 with P2 electrostatics sampled at optical quadrature points: dn_A +0.148 % vs L-REF at ES scale 1.5 (P1 +0.54 %),
  VpiL 2.27514 vs 2.27861. Warm shift for sweeps: K2 order-2 sweep step 25 -> 10 Krylov steps, 264 -> 141 ms.
  Root cause of the earlier scratchpad wipe: L-VEC itself ran `rm -rf` on the shared scratchpad root at the end of
  round 1 (about 23:52 PDT); recorded in DevLog-025. Repo files were not affected (scratchpad only).
- 2026-10-15 L-PERF round 2 done (DevLog-024 "Round 2"): mesher conformity fixed (cavity scans treat an interior
  subsegment as encroached; final conformity pass with repair count, never fired in 64 meshes); 0 straddling
  triangles in all runnable configs after the fix; largest metric changes n_eff 3.9e-4 (wang2022), VpiL 1.7e-4
  (arabjuneghani2022). Wheeler recess uses one background region for the vacuum solves: rf_line now runs on
  li2026aa, lin2025, qi2024. Audit P1, P3-P6 fixed; scalar-optics P2 skipped (vector solver is the main optical path).
  Engine 205 tests (203 pass, 0 fail, 1 todo). Open: K1-K6 engine runs exceed the 80k vertex budget at mesh scale 1
  (passed to L-PARAM: P2 at coarser scale in the reference tests).
- 2026-10-15 L-UI audit done (`DevLog/audits/simulator-l-ui-audit-2026-10-15.md`): 0 blocking, 2 major (U1 WebGL
  context loss unhandled; U2 UI not yet adapted to the engine's round-2 P2/vector/metal-policy changes), 9 minor,
  7 notes. Probe (18 hovers) and cut line (500 samples, max rel 1.4e-7) match Node; renaud2023 sweep bit-identical
  to the CLI; no Plotly on /sim; heap flat over 6 runs. Round 2 started for L-UI (audit fixes, global border-radius
  rule replaced per component, default sweep pool min(4, cores - 1); U2 after L-PARAM round 2 lands).
- 2026-10-15 L-REF audit done (`DevLog/audits/simulator-l-ref-audit-2026-10-15.md`): no factor/sign/frame/
  normalisation error; independent solvers reproduce K4/K5 C' and VpiL within 1e-3. 1 major (R1: K1/K2 n_eff
  uncertainties too small because corners under-resolved; K1 reference ~2e-6 high), 4 minor (R2 uncertainty rule,
  R3 tidy3d sanity-only, R4 case indices rounded to 6 digits, R5 per-arm extrapolation), 5 notes (K6b closed form
  is itself 1.1 % low; scalar +12.5 % is definitional). Round 2 started for L-REF; guidance passed to L-PARAM.
- 2026-10-15 ~02:00 PDT API session limit stopped L-PARAM, L-REF and L-UI mid round 2. 07:53 PDT user: reset done,
  keep going. No orphan processes found (load average 2.26). All three resumed with instructions to re-check
  interrupted edits and log the interruption.
- 2026-10-15 L-PARAM round 2 done (DevLog-026): audit fixes (A1 zhang2022 now uses the paper's tan delta and its
  250 GHz loss fails honestly, 16.61 vs 13 dB/cm; A2 Si 11.7 confirmed in the rendered table; A10 disputed with
  locator), `optics.solver: vector` wired (default scalar), `group_index_from: perturbation` default,
  `mesh.element_order` with **P2 default for electrostatics** (5-10x closer to references; all C' drop 0.25-0.9 %),
  mesh-only entry and YAML edit helpers for L-UI, engine reference tests K1-K6 (pass; re-run pending L-REF round 2).
  Engine 213 tests (211 pass, 0 fail, 1 skipped, 1 todo). Scalar vs vector VpiL differ by only 0.3-2.5 %, so the
  scalar model does not explain the misses vs measured VpiL (mao2022 2.77 vs 1.9, arabjuneghani2022 4.02 vs 3.3,
  renaud2023 0.638 vs 0.55). Vector sweeps are slow (renaud2023 gap 32.5 s vs scalar 5.9 s; ~136k unknowns per arm).
- 2026-10-15 Started: L-VEC round 3 (vector-tuned mesh sizing and window trimming with a convergence study) and a
  fresh-context VpiL discrepancy investigation (DevLog-029; read-only on engine and configs).
- 2026-10-15 L-REF round 2 done (DevLog-028): R1-R5 applied. Corrected references: K1 n_eff 2.44722338 +- 5.9e-7,
  K2 1.89416707 +- 5.8e-8, K3 1.91237549 +- 1.9e-7 (all match the auditor's independent values); K4 VpiL
  2.27860 +- 5.4e-4; K6a C' 214.261, K6b 174.321 pF/m (YAML cases). Case YAMLs K1-K5 rewritten with 10-digit
  indices (new hashes). Memory: several runs reached 1.55-1.72 GB, slightly over the 1.5 GB cap, despite a watchdog.
  L-PARAM asked to re-run the engine reference tests on the new files.
- 2026-10-15 08:05 PDT Engine reference tests vs L-REF round 2: 8/8 pass (K5 with `ENGINE_REFERENCE_FULL=1`).
  Engine vs reference: n_eff K1 +4.7e-6, K2 -1.1e-6, K3 -3.9e-6; ng -2.5e-5 to -6.2e-5; K4 C' +7.9e-4 rel (P2,
  scale 2); VpiL -1.4e-3 to -3.5e-3 rel over the K5 gaps; K6a/K6b C' +2.3e-4/+3.3e-4 rel. Four tolerances widened
  to about 2.5x the measured difference plus reference U (ng 1e-4, TE fraction 1.5e-5, K5 VpiL/dn 9e-3). Note: these
  tolerances are regression bounds derived from measured differences, not independent accuracy requirements; the
  accuracy statement is the difference column. Re-run needed after L-VEC round 3 changes vector mesh defaults.
- 2026-10-15 L-UI round 2 done (DevLog-027): U1, U3-U17 fixed; U2 implemented against the current L-PARAM API (P2
  potential on 4x-subdivided elements with exact quadratic probe/cut line, vector mode components and H, solver /
  element order / metal-policy selectors from engine lists, engine mesh and YAML helpers). Global
  `border-radius: 0 !important` removed; computed-style scan of all routes in both themes: 0 rounded elements except
  the spinner. App tests 48/48, check 0/0, build, smoke 23/23. mao2022 at P2: 440,744 display triangles at 60 Hz,
  first paint 63 ms. L-PARAM round 3 started for its three requests (YAML flow padding, vector result types,
  Pockels delta-n field export).
- 2026-10-15 08:12 PDT L-PARAM round 3 done: YAML flow printing without padding, vector result types in
  `run.d.mts` (engine .d.mts pass `tsc --strict`), Pockels delta-n field export (`fields.*.pockels`, per triangle,
  1/V per volt; closed-form fixture test < 1e-6 for scalar and vector). Engine 216 tests (214 pass, 0 fail,
  1 skipped, 1 todo). L-UI round 3 started (U2 re-check on final types, delta-n view).
- 2026-10-15 L-VEC round 3 done (DevLog-025): `sizing: 'auto'` (local-wavelength element size with corner grading)
  and an inertia-guarded adaptive shift are the new defaults; renaud2023 vector single run 7.2 -> 3.1 s, gap sweep
  32.3 -> 12.8 s, wavelength sweep 34.9 -> 11.6 s; results moved <= 3.5e-6 n_eff, <= 4.4e-5 rel Vpi. Convergence vs
  meshScale 0.5: n_eff within 6.3e-6, EO dn within 3.4e-5 rel at default scale. Window trimming not needed (edge
  power 1.5e-7). Engine 214 tests (212 pass, 0 fail, 1 skipped, 1 todo).
- Orchestrator decisions on L-VEC requests: (1) adopt numModes = 2*(modeIndex+1) start in `solveVectorFamily`;
  (2) configs that set `group_index_from: finite_difference_wavelength` (written when it was the only computed
  option) migrate to `perturbation`; FD stays selectable and honoured literally. L-PARAM round 4 started for these
  plus reference-test and paper-table re-runs.
- 2026-10-15 L-UI round 3 done (DevLog-027): U2 verified on the final engine types (no casts except raw YAML and the
  worker `self`), engine `PRINT` options used, Pockels delta-n view (dn_xx/dn_yy/dn_zz/d eps_xy per V, per element,
  symmetric colorbar; browser probes match Node export to 1e-12). App tests 48/48, check 0/0, build, smoke 24/24.
- 2026-10-15 08:16 PDT L-PARAM round 4 done (DevLog-026): vector numModes start 2*(modeIndex+1) (TE0 n_eff unchanged
  to 5e-15, 30-48 % faster); all 40 configs migrated to `group_index_from: perturbation` with provenance notes.
  Reference tests 8/8 on the current tree; engine 216 tests (214 pass, 0 fail, 1 skipped, 1 todo). Paper VpiL
  (scalar / vector / paper, V cm): mao2022 2.802 / 2.768 / 1.9; renaud2023 0.628 / 0.638 / 0.55; arabjuneghani2022
  3.985 / 4.022 / 3.3; li2022b 0.865 / 0.867 / 0.90 sim; murai2025 2.545 / 2.566 / 2.5 sim; pan2021 4.216 / 4.254 /
  4.06 sim; boynton2020 4.983 / 4.940 / 4.88 sim (6.67 measured); yang2022 2.594 / 2.634 / 2.37 (pass). renaud2023
  vector sweeps 8.6 s (gap) and 6.8 s (wavelength), down from 32.5 / 33.3 s.
- 2026-10-15 Final fresh-context audits launched: engine (`simulator-final-engine-audit-2026-10-15.md`) and UI
  (`simulator-final-ui-audit-2026-10-15.md`). VpiL investigation (DevLog-029) still running.
- 2026-10-15 VpiL investigation done (DevLog-029; 87 runs, no code/config edits). No Vpi convention error (all five
  papers: full swing, single-ended push-pull GSG). Explained by inputs: renaud2023 (+2 to +4 % with low-frequency
  constants and 60 deg sidewall), yang2022, arabjuneghani2022 #1. mao2022: paper's Eq. 2 uses a uniform field and
  n_o instead of n_e; its own Fig. 1(f) shows a 4.84 um gap (with it: +7 to +8 %). boynton2020: engine below the
  measurement (-25 %); paper's own Eq. 1 with its inputs gives 3.87, not its stated 4.88, so the engine's match to
  4.88 is not evidence. Open: arabjuneghani2022 #2 waveguide-offset series (measured and paper COMSOL fall 2.5x
  from D = 0 to 3.6 um; engine 1.54x) -> needs an independent reference. L-REF round 3 started: K7 off-centre
  waveguide family with its independent pipeline. Config proposals 1-7 of DevLog-029 queued for L-PARAM after the
  final audits.
- 2026-10-15 L-REF round 3 done (DevLog-028): K7 off-centre waveguide family (arabjuneghani2022 #2 cross-section,
  D = 0 / 1 / 2.6 / 3.6 um) with the independent pipeline: VpiL 5.213 / 4.895 / 4.025 / 3.404 V cm, ratio
  D0/D3.6 = 1.5316 +- 1.5e-4. Engine (vector 1.54, scalar 1.54) agrees within 0.5 % per point; paper measured ratio
  2.50. Independent reference is 18 % low at D = 0 and 34 % high at D = 3.6 vs measured, so no single constant
  closes it: the fabricated devices differ from the stated cross-section. The open engine question from DevLog-029
  is closed in the engine's favour. Peak RSS 0.97-1.16 GB (under the 1.4 GB watchdog).
- 2026-10-15 Final UI audit done (`DevLog/audits/simulator-final-ui-audit-2026-10-15.md`): 0 blocking, 0 major,
  8 minor (W1 group-index selector lacks `perturbation`, W2 template-config mesh fields disabled, W3 YAML key
  insertion rewrites the document, W4 Canvas fallback speckled at P2, W5 restore after fallback, W6 RF plot axis
  labels, W7 arm not shown for Pockels view, W12 Plotly modebar tooltip radius on /explore), 6 notes. Verified exact:
  P2 probe vs Node (3e-16 potential, 6e-12 E), cut line 1e-11, vector derived values, Pockels view, vector gap sweep
  vs CLI 3.7e-10, worker cap, flat heap. L-UI round 4 started (W1-W14 except W3, which goes to L-PARAM).
- 2026-10-15 Final engine audit done (`DevLog/audits/simulator-final-engine-audit-2026-10-15.md`): 0 blocking,
  4 major, 5 minor, 3 notes. Confirmed: suite reproduces; engine-vs-reference gaps shrink with refinement
  (discretisation, not bias); mesher fix holds (0 defects in 203 meshes vs 172 straddling triangles at HEAD);
  sweep caching correct; earlier fixes verified. Major: F1 scalar solver returns non-physical modes on hybrid Si/LN
  configs (wang2022, valdez2022, valdez2023); F2 lossy-metal TM silently returns a surface plasmon; F3 scalar TM EO
  overlap 35 % low (omits E_z; no config uses TM); F4 P2 electrostatics default costs 2.7-3.9x unreported.
- Orchestrator decisions: (F1) vector solver becomes the default, scalar labelled approximate; (F2) explicit mode
  selection and an SPP/metal-power guard; (F3) scalar + TM + eo_overlap is an error; (F4) P2 stays default with a
  coarsened electrostatic base mesh (factor 2: about P1 cost, within 3.9e-4 of P2 at scale 1); F6-F10 and W3 plus
  DevLog-029 config proposals 1-7 assigned to L-PARAM round 5; F5 bench fix to L-PERF round 3.
- 2026-10-15 L-UI round 4 done (DevLog-027): W1, W2, W4-W10, W12, W13 fixed (form lists from engine exports and
  schema; template mesh fields; gap-free Canvas fallback at P2; arm labels for Pockels; exact P2 |E|; P2 refinement
  in the worker, first paint 16-23 ms, 0 long tasks; radius scan incl. pseudo-elements: 0 rounded on all routes).
  App tests 48/48, check 0/0, build, smoke 27/27. W14 (stray `#sort` hash from the app shell layout) approved as a
  narrow fix in `app/src/routes/+layout.svelte`.
- 2026-10-15 08:43 PDT L-PERF round 3 done (DevLog-024): bench F5 fixed (yaml-edit overrides, per-case error
  records, every case pins element order, solver, vector order, group-index method and mesh scale); 13 cases, no
  errors, log `logs/bench-20261015T0842.jsonl`. Medians: mao2022 ES P1 423 ms / P2 (scale 1) 1622 ms; mao2022 vector
  optical 2057 ms; renaud2023 vector EO 1748 ms. New baseline still to be written (`--write-baseline`) after
  L-PARAM round 5 lands; a P2 case at the coarsened default scale to be added then.
- 2026-10-15 L-UI W14 done: table hash written only on /table and /explore (smoke 27/27).
- 2026-10-15 08:59 PDT L-PARAM round 5 done (DevLog-026): vector solver default (scalar labelled
  `scalar_optical_approximate`; ng flips fail -> pass on wang2022, valdez2022, valdez2023, no other status change in
  30 runnable configs); `optics.mode_select` + metal-power/SPP guard (K4 lossy TM now returns the dielectric mode,
  n_eff 1.860373, 0.0116 dB/cm); scalar+TM+eo_overlap is an error; `mesh.p2_mesh_factor` default 2 (mao2022 ES
  1521 -> 387 ms, 6-8x closer to the best estimate than P1 at equal cost; K4/K6 now run at scale 1); bounded warm
  cache (4 entries / 64 MB); `--mode-only`; W3 YAML splice; docs. DevLog-029 proposals 1-7 applied (unclamped LN
  alternatives from a vendor datasheet, low-frequency range diagnostic, mao2022 4.84 um study 2.223 V cm,
  renaud2023 sidewall study, arabjuneghani2022 D study and device #1 2.331 vs 2.2 V cm pass, boynton2020 4.88 target
  not comparable). Engine 222 tests (219 pass, 0 fail, 2 skipped, 1 todo); reference tests 11/11 incl. K7 (ratio
  1.53187 vs 1.53164). Final fresh-context verification launched
  (`DevLog/audits/simulator-round5-verification-2026-10-15.md`).
- 2026-10-15 09:15 PDT Round-5 verification done: engine 222 (219 pass, 0 fail, 2 skipped, 1 todo), reference
  11/11, app test 48/48, build OK, validate_db 0/0, pytest 30 passed; BUT app check 3 errors (G1, blocking:
  `electrostatics` nullable since `modeOnly`) and smoke crashes at startup (G2, blocking: two stale test lines; app
  behaviour correct, 27/27 after patching a scratch copy). Major: G3 app YAML edits bypass the engine splice helper;
  G4 library merge silently added r13/r22 to yang2022 (explains 72 % of its -1.09 % VpiL change; permittivity 22 %,
  mesh factor 6 %). Minor G5-G8, notes G9-G13. Engine-side round-5 claims verified. Bench baseline
  `logs/bench-baseline-20261015T0915.json` (mao2022 ES P2 422 ms, vector optical 775 ms, renaud2023 vector EO
  1201 ms). Fix rounds started: L-UI round 5 (G1-G3), L-PARAM round 6 (G4-G12).
- 2026-10-15 L-UI round 5 done (DevLog-027): G1 mode-only results handled; G2 smoke uses the engine `setIn` and the
  engine's own error text; G3 app YAML edits delegate to `engine/src/yaml-edit.mjs` (insert changes one line, delete
  restores byte-for-byte on chen2022-c and renaud2023). App test 51/51, check 0/0, build OK, smoke 27/27. G9 picked
  up automatically once L-PARAM lands it.
- 2026-10-15 09:30 PDT L-PARAM round 6 done (DevLog-026): G4 library-merge survey (r13/r22/r51 added next to a
  paper r33 in yang2022, meng2023, valdez2023; placeholders replaced in arabjuneghani2022, boynton2020, mao2022;
  absent eps/r filled in gao2024, renaud2023, valdez2022; Au sigma 4.1e7 -> 4.5167e7), all documented, merged keys
  reported in `materialSources.*.addedFromLibrary`; G5 bench pins P2 mesh factor, `--extra-cases`, baseline
  `logs/bench-baseline-20261015T0926.json` (mao2022 ES P1 375, P2 f1 1430, P2 f2 407 ms; vector optical 785 ms;
  renaud2023 vector EO 1226 ms); G6 unsigned metal-fraction guard + end-to-end SPP rejection test; G7 tests; G8
  solver-aware limitation labels; G9 deleteIn prunes empty parents; G10 renaud2023 drive locators; G11 datasheet URL,
  date, sha256 recorded (no local copy, rights unknown); G12 K4 lossy TM loss not converged at default mesh (0.0116 /
  0.0194 / 0.0220 dB/cm at scales 2 / 1.41 / 1; extrapolated ~0.023), flagged by a warning on every lossy result.
  Engine 226 tests (223 pass, 0 fail, 2 skipped, 1 todo); reference 11/11; 40-config survey unchanged. Final gate
  run launched (`DevLog/audits/simulator-final-gates-2026-10-15.md`).
- 2026-10-15 Final gates (fresh-context verifier, `DevLog/audits/simulator-final-gates-2026-10-15.md`): engine
  226 (223 pass, 0 fail, 2 skipped, 1 todo), reference 11/11, app test 51/51, check 0/0 (443 files), build OK,
  smoke 27/27, validate_db 0/0, pytest 30 passed. G1-G12 spot checks hold. Commit hygiene: no local paths, secrets,
  emoji, PDFs or binaries in changed/untracked files; build output, logs and `validation/.venv` ignored. H1: the
  unreferenced agent pilot output `validation/reference/K7-D3.6-es-eo-pilot.json` removed by the orchestrator.
  H2 (latent, not changed): `.gitignore` has `!*.json`, so a future `.claude/settings.local.json` would not be
  ignored. TODO checkboxes S0-S6 updated; claim set to ready_for_review. Nothing committed.

## Status and remaining work (2026-10-15)

Done: S0, S1, S2, S3 (except the stated time targets), S4, S6 (except Build Selected / Up To Here), S5 Tier A/B.
Caveats on ticked items: LN RF/EO constants are secondary open-access values (primary Weis and Gaylord 1985 not
accessible; unclamped alternatives from a vendor datasheet, single reading); LiTaO3 RF/EO constants missing;
Wheeler recess solves cannot share a pattern (background-region recess instead); P2 not added to the scalar optics
(vector solver is the default); Tier B uses open-source solvers only (no COMSOL, per user); lossy-metal loss not
converged at the default mesh (warning on every lossy result).

Open:
- S3 time targets: renaud2023 vector single run 1.4 s and 4-point gap sweep 5.8 s (CLI, sequential) vs proposed
  < 0.5 s and < 3 s for 10 points; WASM numeric kernel (estimated 2.2x on factorization) deferred.
- S5: per-run automated convergence study in the UI; paper-simulated targets as engine regression tests; digitized
  `reported_curves`; `validation_status` promotion.
- S6: Build Selected / Up To Here.
- S7: `eo_response` (uniform TWE bandwidth) and `loaded_line` (T-rail Bloch cell); 12 periodic configs wait on it.
- Measured VpiL misses (mao2022, renaud2023, arabjuneghani2022 #2, boynton2020): attributed to inputs and fabrication
  (DevLog-029, K7 independent reference); not solver errors.
- 10 configs blocked by missing inputs (LiTaO3, SiN, BCB, BTO RF permittivity) or geometry faults (chen2022 metal in
  window, meng2023 shared electrode edge, lin2026a wavelength outside the LiTaO3 data range).
