---
title: Open-source reference numbers for the TFLN simulator (Tier B, lane L-REF)
date: 2026-10-14
status: round 2 done (2026-10-15), audit R1-R5 applied
owner: L-REF (fresh-context validation subagent; never reads engine sources)
scope: validation/ (isolated uv project), canonical cases K1-K6 (DevLog-023 O3), reference JSON fixtures
---

# DevLog-028: open-source reference numbers (L-REF)

Parent: `DevLog/DevLog-023-simulator-tfln-roadmap.md` (O2, O3, O4). Independence rule: the reference scripts are
written from the physics and from the open-source packages' documentation only. Allowed engine reads: `engine/README.md`,
`sims/SPEC.md`, `engine/schema/sim.schema.json`, `engine/data/materials.json` (to write inputs in the engine format).

## Plan (written 2026-10-14 23:05 PDT, before any run)

1. `validation/` uv project, Python 3.12: femwell, scikit-fem, gmsh (wheel), shapely, tidy3d (local `ModeSolver`
   only; no cloud, no key), numpy, scipy, pyyaml. Package failures are recorded, not worked around silently.
2. Cases `validation/cases/K1..K6.yaml` in `eo-atlas.sim/v1`. Fixed details are written in each YAML header.
   Optical constants at 1550 nm from the Sellmeier fits in `engine/data/materials.json` (Zelmon LN o/e, Malitson SiO2,
   Salzberg/Tatian Si), computed by `validation/eoref/materials.py` and stated in the headers.
   Frame (x-cut LN, propagation crystal y, TE): lab x = crystal z (n_e, eps par), lab y = film normal = crystal x
   (n_o, eps perp), lab z = propagation = crystal y (n_o).
3. Modes (K1, K2, K3, K4 arm): femwell full-vector FEM (Nedelec + Lagrange, order 2 if available) and tidy3d local
   FD mode solver (subpixel averaging). n_eff; ng by central wavelength difference (material dispersion included)
   and the solver's own group index where offered; TE fraction. Three or more resolutions per solver, Richardson
   extrapolation with an uncertainty estimate. Agreement target |dn_eff| < 1e-3 after extrapolation, else investigate.
4. Electrostatics K4, K5, K6: scikit-fem (P2) on gmsh meshes; electrodes as Dirichlet subdomains; C' by energy and by
   terminal charge, C0' with all eps = 1, n_RF = sqrt(C'/C0'), Z0 = 1/(c sqrt(C' C0')); 1 V terminal difference
   (signal 1 V, grounds 0 V). Mesh and domain-size convergence. K6 also by conformal mapping (zero-thickness CPW).
5. EO K4, K5: first-order perturbation with the full-vector optical field (femwell) and the static field (scikit-fem):
   delta(1/eps)_I = r_Ik E_k (3m, contracted indices, crystal frame) mapped to the lab frame,
   delta eps = -eps delta(1/eps) eps, delta n_eff = (c eps0 / (4 P)) int E* . delta eps . E dA,
   P = (1/2) Re int (E x H*) . z dA. Push-pull VpiL = lambda / (2 |dn_A - dn_B|) per volt of terminal voltage.
   Gates: uniform-field Pockels slab (closed form), finite-difference d n_eff / d eps of the femwell solver.
   Scalar-weighted overlap Gamma reported for comparison.
6. Analytic gates for the scripts: slab TE/TM dispersion (femwell + tidy3d), parallel plate (scikit-fem),
   uniform-field Pockels slab.
7. Outputs: `validation/reference/<case>.json` (small; inputs hash, versions, levels, raw, extrapolated, uncertainty,
   run time, ISO date). Logs `logs/ref-<case>-YYYYMMDDTHHMM.log`.

## TODO

- [x] uv project and package checks (femwell, scikit-fem, gmsh, tidy3d local)
- [x] material constants at 1550 nm
- [x] cases K1-K6 YAML
- [x] analytic gates (slab TE/TM, parallel plate, uniform Pockels slab)
- [x] modes K1-K3 femwell + tidy3d, convergence, agreement
- [x] electrostatics K4, K5, K6 (+ conformal map)
- [x] EO K4, K5
- [x] reference JSON, results table, physics sanity (field plots inspected, deleted)
- [x] fresh-context audit of this lane (O5): DevLog/audits/simulator-l-ref-audit-2026-10-15.md; R1-R5 applied in round 2
- [ ] tidy3d slab TE/TM gate (planned, not run; tidy3d is checked against the gated FEM on K1-K3 instead)

## Progress log

- 2026-10-14 23:05 PDT Read DevLog-023, SPEC, schema, mao2022 config, gsg fixture, engine README, materials.json.
  Plan above written.
- 23:08 uv project `validation/` (Python 3.12.11): femwell 0.1.12, scikit-fem 12.0.2, gmsh 4.15.2 (wheel), shapely
  2.2.0, tidy3d 2.12.0, numpy 2.4.6, scipy 1.18.1, pyyaml 6.0.3; pyamg 5.3.0 added 23:37 (AMG-CG for electrostatics).
- 23:09 Material constants at 1550 nm (Sellmeier fits of engine/data/materials.json, evaluated by
  `eoref/materials.py`): LN n_o 2.211111, n_e 2.137560 (Zelmon 1997); SiO2 1.444024 (Malitson); Si 3.477724
  (Salzberg/Tatian). Cases K1, K2, K3, K4, K5-g{3,4,5,6,8}, K6a, K6b written by `scripts/make_cases.py`;
  `node engine/cli.mjs <case> --check` reports every stage of each case's `chain` ready (no solve run).
- 23:12 Finding: femwell `compute_modes` takes a scalar permittivity (`epsilon * dot(e_t, v_t)`); anisotropic LN is
  not supported. Wrote `eoref/fmode.py`: the same Nedelec(2)+Lagrange(2) formulation re-derived for
  eps = diag(exx, eyy, ezz) (eps_t in the e_t.v_t and e_t.grad v_z terms, ezz in the e_z v_z term). Identical to
  femwell for isotropic eps (checked, below).
- 23:15 Gates pass (pilot), full gates 23:26 (`reference/gates.json`): TE slab err -7.3e-8, anisotropic TM slab
  +8.2e-8 (h = 10 nm); femwell vs own form 4.6e-8; parallel plates (series layers, lateral eps_xx) 1e-14;
  uniform-field Pockels TE slab dn_pert vs exact d n_eff rel -7.8e-8 (closed form -n_e^3 r33 E/2 (n_e/n_eff)
  Gamma_E identical to exact); TM d eps_zz -6.2e-7, d eps_yy +1.1e-7 (validates the E_z normalisation);
  uniform d eps everywhere = d eps / (2 n_eff) to 1e-11; energy-velocity ng (no material dispersion)
  2.18693171 vs closed form 2.18693176.
- 23:17 Bug found and fixed in own mesher: surface-to-region mapping by OCC centre of mass fails for a region with a
  hole (cladding around the core took the core label). Now every triangle is labelled by its centroid
  (shapely `contains_xy`).
- 23:18 Finding: femwell's own `te_fraction`/modes with a P0 basis at the default quadrature (intorder 0,
  one point) under-integrates the N2/P2 forms: K1 n_eff differs from the own form by 3e-5 at h = 60 nm. With
  `Basis(mesh, ElementTriP0(), intorder=4)` femwell equals the own form to all printed digits. References use intorder 4.
- 23:20 Finding: the tidy3d LOCAL ModeSolver has no subpixel averaging (needs the licensed `tidy3d-extras`;
  `tidy3d/packaging.py supports_local_subpixel`). Staircased FD converges at first order: K1 2.557, 2.503, 2.475,
  2.461 at dx 25, 12.5, 6.25, 3.125 nm. AutoGrid also did not align grid lines with interfaces; switched to explicit
  `CustomGridBoundaries` with interfaces on grid lines (K1 anchors x = -0.25, y = -0.11; K2/K3 y = 0, 0.3, 0.6,
  x = +-0.5) and Richardson with the observed order.
- 23:26 First K1 results (4 levels each, full window): FEM n_eff 2.447217 +- 3.5e-5, ng 4.19616 +- 7e-5;
  tidy3d n_eff 2.447099 +- 1.8e-2 (p 0.99), ng 4.19609 +- 7e-4. Agreement 1.2e-4 in n_eff, 7e-5 in ng.
- 23:28 skfem `MeshTri.element_finder` builds a dense (candidates x points) array: the K4 EO run was killed
  (exit 137) when probing ~1e5 optical quadrature points in the ES mesh. Replaced by `eoref.es.find_cells`
  (KD-tree + barycentric test) and a probe matrix built the same way as skfem `probes`; unit test on a quadratic
  potential: gradient error 7e-13.
- 23:30 Coordinator resource limits (one CPU-heavy process, nice 10, single-threaded BLAS, ~1.5 GB RSS cap).
  Measures: `run.sh` wrapper (nice 10, OMP/MKL/OPENBLAS/VECLIB threads 1, `/usr/bin/time -l` max RSS), gmsh 1
  thread; TE mirror symmetry (half window, PEC on the mirror plane) for the FEM modes and tidy3d (`symmetry=(-1,0,0)`,
  checked: reproduces the full-window TE0 n_eff to all digits; `+1` gives the odd TM-like family);
  shift-invert with a symmetric MMD ordering; electrostatics by AMG-preconditioned CG (pyamg) instead of SuperLU
  (2.7 GB -> 0.96 GB at 295k P2 DOFs; MMD ordering made SuperLU worse, 8.2 GB, run once for 4 min before the
  switch). Resolution levels reduced so that each process stays near or below the cap (Limitations).
- 23:41 Full serial run started: `validation/run_all.sh` (log `logs/ref-run_all-*.log`).
- 23:44 Corner refinement added to the optical meshes (size h/6 at core/rib polygon vertices): K1 convergence went
  from non-monotone (p ~ 1.1, corner-limited) to monotone p = 2.65; result 2.4472257 +- 1.5e-6, consistent with the
  pre-cap run without corner refinement and finer meshes (2.4472167 +- 3.5e-5, log `ref-K1-fem-20261014T2320.log`).
  Each resolution level now runs in a fresh subprocess (`eoref.util.run_isolated`) because native solver workspaces
  are not returned to the OS between solves (RSS grew 461 -> 641 MB over three identical solves).
- 23:47 K1-K3 tidy3d done (3 levels, finest dx/dy 6.25/5.5 nm for K1, 6.25/7.5 nm for K2/K3).
- 23:48 Electrode-corner refinement added to the K4/K5 electrostatic meshes (C' convergence order ~1.0 -> 1.1-1.7).
  K6b first attempt killed by the lane watchdog (RSS > 1.8 GB at domain 2000 um): the substrate-boundary size rule
  ran along the whole 4000 um layer; replaced by a box near the line.
- 23:49 Arm modes moved to their own subprocess (quadrature-point arrays passed by npz in a temp dir, removed
  after the run): K4 level peak 1.72 -> 1.22-1.33 GB.
- 23:56 Full run done: K6a, K6b, K4 (+ optical-mesh check + domain study), K5 g3/g4/g5/g6/g8. Gates re-run on the
  final code at 23:58 (identical numbers). Field plots (K1/K2/K3 |E_x|^2, |E_y|^2, |E_z|^2; K4 static E_x, E_y
  around the right gap) inspected in the session scratchpad and deleted.
- 2026-10-15 00:00 PDT Results, disagreements, limitations written. `engine/data/materials.json` was modified by
  another lane during this session; regenerating the cases from it (into scratch) gives byte-identical YAML, so
  the four Sellmeier entries used here are unchanged. No reference process left running; temp files removed.

## Results (2026-10-14)

All values at 1550 nm; U = extrapolation uncertainty (1.25 x |f_ext - f_finest|, Richardson with the observed
order from the three finest levels; formal order where the differences were non-monotone). Machine-readable:
`validation/reference/<case>*.json` and `validation/reference/summary.json` (engine metric names).

### Modes (TE0; PEC on the optical-window edge; window 1.5x changes n_eff by <= 3.3e-7)

| Case | Quantity | Vector FEM N2/P2 (primary) | tidy3d local FD (staircase) | FEM - tidy3d |
|---|---|---|---|---|
| K1 | n_eff | 2.4472257 +- 1.5e-6 | 2.44655 +- 3.6e-2 | 6.8e-4 |
| K1 | ng (energy velocity; FD +-10 nm differs by 5e-6) | 4.196166 +- 1.8e-5 | 4.19588 +- 1.5e-3 (tidy3d group_index_step) | 2.9e-4 |
| K1 | TE fraction | 0.9834418 +- 3.6e-6 | 0.98285 +- 3.2e-3 | 5.9e-4 |
| K2 | n_eff | 1.8941658 +- 1.9e-6 | 1.89424 +- 4.2e-3 | -7.3e-5 |
| K2 | ng | 2.2908498 +- 4e-7 | 2.29092 +- 6.0e-4 | -7.0e-5 |
| K2 | TE fraction | 0.9906076 +- 1.1e-7 | 0.99039 +- 4.3e-4 | 2.1e-4 |
| K3 | n_eff | 1.9123755 +- 8e-8 | 1.91248 +- 3.7e-3 | -1.1e-4 |
| K3 | ng | 2.2650284 +- 1.4e-7 | 2.26502 +- 4.5e-5 | 9.9e-6 |
| K3 | TE fraction | 0.9939893 +- 5.5e-8 | 0.99396 +- 1.6e-4 | 2.8e-5 |

Power fraction in the core/LN: K1 0.783249, K2 0.888556, K3 0.868820. K1 femwell `compute_modes(order=2)` with an
intorder-4 P0 permittivity basis equals the own form at every level (e.g. 2.4472396635 at h = 80 nm).
TE fraction = int |E_x|^2 / int (|E_x|^2 + |E_y|^2) over the window (same definition as tidy3d `pol_fraction`).

### Electrostatics and EO (K4 = K5 gap 5 um; 1 V terminal difference; dn per volt; A = right arm)

| Gap (um) | C' (pF/m) | C0' (pF/m) | n_RF | Z0 (ohm) | dn_A (1e-5 /V) | VpiL full tensor (V cm) | VpiL r33 only | VpiL scalar Gamma | Gamma_A |
|---|---|---|---|---|---|---|---|---|---|
| 3 | 181.126 +- 0.046 | 43.8173 +- 0.0018 | 2.03314 +- 2.2e-4 | 37.4426 +- 0.0054 | -3.03084 +- 0.0023 | 1.27842 +- 8.3e-4 | 1.33511 | 1.43758 | 0.53587 |
| 4 | 159.699 +- 0.034 | 39.7940 +- 0.0016 | 2.00328 +- 1.8e-4 | 41.8426 +- 0.0052 | -2.18797 +- 0.0023 | 1.77050 +- 1.2e-3 | 1.84959 | 1.99155 | 0.51564 |
| 5 | 146.519 +- 0.012 | 36.9521 +- 0.0006 | 1.99125 +- 6.7e-5 | 45.3329 +- 0.0022 | -1.70057 +- 0.0005 | 2.27861 +- 5.7e-4 | 2.38076 | 2.56348 | 0.50087 |
| 6 | 137.427 +- 0.014 | 34.7893 +- 0.0006 | 1.98753 +- 8.2e-5 | 48.2415 +- 0.0028 | -1.38125 +- 0.0002 | 2.80580 +- 8.3e-4 | 2.93182 | 3.15685 | 0.48814 |
| 8 | 125.496 +- 0.008 | 31.6425 +- 0.0004 | 1.99150 +- 5.1e-5 | 52.9333 +- 0.0020 | -0.98863 +- 0.0001 | 3.91970 +- 6.5e-4 | 4.09585 | 4.41021 | 0.46583 |

- Push-pull balance dn_B/dn_A = -1.00000 to -1.00006 (mesh asymmetry only). The two arm modes are the K2 mode
  (n_eff 1.89416759 at the h = 40 nm optical mesh used for the overlap; LN power fraction 0.888556).
- Optical-mesh check (arm mesh 40 -> 28 nm at the finest ES level): VpiL changes by 1.6e-6 to 1.0e-5 V cm.
- Domain (K4, ES scale 1.41): half-width 250 / 500 (YAML) / 1000 / 2000 um -> C' 146.5258 / 146.5360 / 146.5367 /
  146.5367 pF/m; Z0 45.3331 / 45.3297 / 45.3296 / 45.3295 ohm. The YAML domain is within 5e-6 of the open limit.
- Full tensor vs r33 only: adding the r13 (optical E_y, E_z with static E_x) and r51 (static E_y with the optical
  E_x E_y cross term) terms lowers VpiL by 4.2-4.3 %; the r22 term (optical E_y E_z product, in quadrature for a
  lossless mode) does not contribute at first order. The scalar overlap (Gamma = (g/V) int_LN E_x |E_x|^2 /
  int |E_x|^2, dn = -n_e^3 r33 Gamma / (2g)) gives VpiL 12.5 % above the full-vector value at every gap; the
  vector r33-only value is 4.5 % above it.
- Rib-centre static field: E_x = 0.1048 V/um per volt (gap 5 um, 1/g = 0.2), consistent with Gamma ~ 0.50.

### K6 coplanar waveguide (S 20 um, W 5 um, eps_r 11.7)

| Case | Quantity | Closed form (t = 0, infinite) | FEM t = 0, R -> inf | FEM t = 0, R = 500 (YAML) | FEM t = 0.1 um, R = 500 (YAML, engine like-for-like) |
|---|---|---|---|---|---|
| K6a half-space | C' (pF/m) | 213.7269 | 213.729 +- 0.014 | 213.654 +- 0.012 | 214.245 +- 0.024 |
| K6a | n_RF | 2.519921 | 2.519922 +- 1.1e-6 | 2.519919 | 2.502995 +- 1.7e-4 |
| K6a | Z0 (ohm) | 39.3285 | 39.3282 +- 0.0026 | 39.3421 +- 0.0024 | 38.9702 +- 0.0023 |
| K6b h = 10 um | C' (pF/m) | 171.830 (partial capacitance) | 173.737 +- 0.013 | 173.724 +- 0.013 | 174.321 +- 0.006 |
| K6b | n_RF | 2.259468 | 2.271960 +- 3e-5 | 2.272287 +- 1.4e-5 | 2.257793 +- 3.3e-5 |
| K6b | Z0 (ohm) | 43.8619 | 43.6204 +- 0.0031 | 43.6296 +- 0.0030 | 43.2030 +- 0.0009 |

C0' closed form 33.65778 pF/m; FEM t = 0, R -> inf 33.65785 (K6a) / 33.65799 (K6b). R -> inf: 1/R Richardson over
R = 500, 1000, 2000 um at mesh scale 1.41 (observed order ~2), corrected by that scale's mesh error at R = 500.

## Disagreements and their resolution

1. tidy3d vs FEM before grid alignment: 2.4692 vs 2.4473 (K1, AutoGrid, interfaces between grid lines, no subpixel
   averaging). Resolved by interface-aligned custom grids and extrapolation (first order, p 0.98-1.02 for n_eff);
   residual |FEM - tidy3d| <= 6.8e-4 (K1), 1.1e-4 (K2, K3), all inside tidy3d's own U. FEM is the primary
   reference (gated to 1e-7 against closed forms, observed order 2-3.4 with corner refinement).
2. femwell vs own form 3e-5 at coarse meshes: femwell's P0 basis default quadrature (one point); fixed by
   `intorder=4` (identical afterwards).
3. K6b: the Ghione-Naldi partial-capacitance formula gives C' 1.1 % lower and n_RF 0.55 % lower than the FEM. The
   same FEM reproduces the exact conformal map on the half-space (K6a) to 1e-5 relative, and K6b differs from K6a
   only by the dielectric region, so the difference is attributed to the partial-capacitance approximation
   (magnetic-wall assumption on the slot boundaries) at h/(S+2W) = 0.33. Not further verified; the FEM value is the
   reference, the closed form is listed as an approximate check only.

## Limitations

- Resource caps (coordinator, 2026-10-14): one process, ~1.5 GB RSS. Levels were reduced: modes to h_core >= 28 nm
  (FEM) and dx >= 6.25 nm (tidy3d, 3 levels); electrostatics to ES scale >= 1 (~70k nodes, 278k P2 DOFs). Peaks
  above 1.5 GB that did occur: tidy3d K1/K3 1.51 GB, K2 1.61 GB; FEM K2 1.46 GB; K4 domain study (2000 um)
  1.72 GB; one SuperLU MMD test 8.2 GB (before the AMG switch, about 4 min).
- tidy3d local ModeSolver: no subpixel averaging (licensed extras only), so its uncertainties are 1e-3 to 4e-2 and
  it serves as a cross-check, not as the primary value.
- Electrostatics: quasi-static, perfect conductors, lossless dielectrics, Si substrate as eps 11.7 (no
  conduction), zero-flux outer boundary as in the YAML. The K4/K5 references are for the YAML domain (500 um,
  shown to equal the open limit within 5e-6).
- EO: first-order perturbation, DC, case-input Pockels and RF permittivity values (DevLog-023 O3, not material
  claims); optical constants n_e, n_o in delta eps are the 1550 nm Zelmon values; electrodes absent from the optical
  problem (metal_in_window: absent), so no metal loading or absorption of the optical mode.
- Crystal orientation: crystal +z along lab +x, +x along lab +y. A 180 deg rotation about the film normal flips
  r13, r22, r33, r51 together, so |dn_A - dn_B| and every number above are unchanged.
- Mirror symmetry of each optical window (TE, PEC mirror plane) is used for memory; checked against the full
  window (K2 tidy3d to all digits, K1 FEM 2e-6 at h = 40 nm, K4 VpiL 7e-6 V cm).

## Literature numbers (DevLog-023 validation table) these scripts could reproduce later

Not run here; each needs a config-specific input step (geometry from the paper's config, constants).
- mao2022 simulated n_RF 2.34, Z0 44, ng 2.62: ES and modes directly (unetched LN film with an a-Si strip; needs a
  constant-index material entry for a-Si in `eoref.modecase.OPTICAL`).
- chen2022 simulated VpiL 2.10 V cm: ES yes; the optical window intersects gold, so the mode needs a metal model
  (complex permittivity, not implemented in `eoref.fmode`, which uses a real shift-invert solve).
- li2022b simulated VpiL 0.90 V cm, rahman2025 simulated VpiL 2.75 / 3.33 V cm: ES + full-vector EO, after the
  geometry is fixed (li2022b gap 5.5 vs 5.9 um is contested; rahman2025 substrate undercut is a new geometry).
- renaud2023 measured Vpi vs gap (738 nm) and vs wavelength (532-938 nm): the scripts take any wavelength inside the
  Sellmeier ranges (LN 0.4-5 um, SiO2 0.21-6.7 um); comparison to measured values needs the convergence and
  model-limit checks of DevLog-023.
- arabjuneghani2022 VpiL vs gap 5/10 um: same as the K5 sweep with that paper's geometry.

## Files

- `validation/pyproject.toml`, `validation/uv.lock` (isolated uv project; Python 3.12).
- `validation/cases/K1, K2, K3, K4, K5-g3..g8, K6a, K6b .yaml` (generated by `scripts/make_cases.py`; every
  fixed detail in the header comments).
- `validation/eoref/`: `materials.py` (Sellmeier from engine/data/materials.json), `geom.py` (YAML -> painter-order
  polygons -> gmsh -> skfem), `fmode.py` (anisotropic vector FEM modes, power, energy ng, perturbation), `es.py`
  (P2 electrostatics, AMG-CG, point location), `pockels.py`, `modecase.py`, `util.py`.
- `validation/scripts/`: `gates.py`, `ref_modes_fem.py`, `ref_modes_tidy3d.py`, `ref_es_eo.py`, `ref_cpw.py`,
  `make_cases.py`, `summarize.py`, `plot_check.py` (PNG to a given scratch dir).
- `validation/run.sh` (nice 10, single-threaded BLAS, max RSS), `validation/run_all.sh` (serial chain with a
  1.8 GB RSS watchdog). Every script has `--dry-run` and `--pilot`.
- `validation/reference/*.json` (inputs hash, versions, levels, raw, extrapolated, U, run time, date) and
  `summary.json`. Logs: `logs/ref-<case>-YYYYMMDDTHHMM.log` (gitignored).

Versions: Python 3.12.11, numpy 2.4.6, scipy 1.18.1, scikit-fem 12.0.2, femwell 0.1.12, gmsh 4.15.2,
shapely 2.2.0, tidy3d 2.12.0 (local ModeSolver only; no web call, no API key), pyyaml 6.0.3, pyamg 5.3.0.

## Round 2 plan (written 2026-10-15 00:32 PDT, before any change; audit `DevLog/audits/simulator-l-ref-audit-2026-10-15.md`)

- R1 Optical meshes: corner element size fixed at 0.5 nm absolute (= h/80 at h = 40 nm) instead of h/6, so the
  corner error no longer changes between levels; re-run K1, K2, K3 FEM (same 4 levels, half window).
- R2 `eoref.util.richardson`: accept the observed order only when the three finest levels are monotone and
  p_obs is within [0.5, 1.5] x p_formal; then U = 1.25 |f_ext - f_1|. Otherwise extrapolate with p_formal and use
  U = max(3 |f_ext - f_1|, largest difference among the three finest levels). p_formal: 4 for N2/P2 mode
  eigenvalues, 2 for P2 electrostatics with singular corners, 1 for staircased tidy3d and for the 1/R domain series.
  Every extrapolated entry also carries the finest-level value `f_finest`.
- R3 tidy3d: `role: sanity_only_not_a_gate` in its JSON and in summary.json; extrapolation recomputed from the
  stored levels with the R2 rule (no re-solve: tidy3d builds its media from the library Sellmeier, which the
  10-digit YAML now equals to 1e-10, and a re-solve would exceed the memory cap again).
- R4 Case YAML optical indices written with 10 significant digits. This changes the sha256 of K1, K2, K3, K4,
  K5-* (K6a/K6b have no optical indices and keep their hashes). All reference JSONs get the new hashes; K1-K5 are
  re-run, tidy3d re-extrapolated (R3), K6 re-run for the R2 rule.
- R5 EO: per level dn_mean = (|dn_A| + |dn_B|)/2 is extrapolated; VpiL and dn_mean are the primary EO comparands,
  per-arm dn and the balance informational only. Note: the +12.5 % scalar-overlap figure is a definitional
  comparison (Gamma without the n_e/n_eff power-normalisation factor), not an engine target.
- Docstring nits from R8 (fmode "A, B symmetric", stale script name). R6 (K6b partial-capacitance gap) closed by
  the audit's independent FEM.
- Hardware: one process at a time, nice 10, 1 thread, RSS < 1.5 GB, AMG-CG for every electrostatic solve.

### Round 2 progress

- 2026-10-15 07:53 PDT Coordinator reported an API session-limit interruption of round 2. State re-checked: the round-2 edits
  were complete and consistent (make_cases 10-digit indices, cases regenerated, fixed 0.5 nm corner size,
  richardson R2 rule, R5 dn_mean, tidy3d role / re-extrapolation option, fmode docstrings; ruff clean); no process
  running. K2 and K1 FEM had already been re-run (below). Continuing.
- 00:34 K2 FEM (fixed corners, levels 80/57/40/28 nm): 1.89416624, .672, .694, .702; observed p 2.89 ->
  1.89416707 +- 5.8e-8 (audit independent value 1.8941671 +- 1e-7). Peak RSS 1.72 GB at the 28 nm level, over the
  1.5 GB cap (corner refinement raised the element count); no further run at that level for K2/K3.
- 00:35 K1 FEM (same levels): 2.44722182, .194, .237, .260 (non-monotone) -> formal-order fallback
  2.44722268 +- 4.3e-7; peak RSS 1.12 GB.
- 07:53 K1 FEM re-run with a finer set (57/40/28/20 nm, guarded at 1.5 GB, peak 1.37 GB): 2.44722197, .237, .260,
  .318 (non-monotone, steps 4e-7/2e-7/6e-7) -> formal-order fallback 2.44722338 +- 5.9e-7 (audit 2.4472236-39).
  This replaces the 00:35 run.
- 07:55 K3 FEM (113/80/57/40 nm; the 28 nm level would exceed the cap): 1.91237549 +- 1.9e-7, observed p 2.38.
- 07:55 tidy3d K1-K3 re-extrapolated from the stored levels (no re-solve), `role: sanity_only_not_a_gate`, new
  case hashes, previous hash kept in `reextrapolated.previous_case_sha256`.
- 07:55-08:02 K6a, K6b, K4 (+ domain study, now at ES scale 2), K5 g3/g4/g5/g6/g8 re-run with the R2 rule, R5
  comparands and the 10-digit inputs (`run_r2.sh`, every process under `run_guarded.sh`, 1.5 GB RSS watchdog,
  1 s sampling). The K5-g8 optical-mesh check (finest ES level + 28 nm arm mesh) was killed by the watchdog at
  1.60 GB; the check now runs at the coarsest ES level (K5-g8 re-run 08:01). Peaks that still exceeded 1.5 GB
  between watchdog samples: K5-g3 1.62 GB, K5-g4 1.58 GB (finest-ES optical-mesh checks, old placement), K5-g8
  re-run 1.55 GB. All other processes <= 1.47 GB.
- 2026-10-15 08:02 PDT Round 2 results below; summary.json regenerated; every reference JSON's case_sha256 equals the
  current case file.

## Round 2 results (2026-10-15) - these supersede the round-1 tables above

### R4: case hashes changed (engine reference tests must use the new files)

Optical indices are now written with 10 significant digits (n_o 2.211111009, n_e 2.13755965, SiO2 1.444023622,
Si 3.477723756; the references use the library Sellmeier, equal to these to 1e-10). sha256 prefixes old -> new:
K1 dceb19323c94d406 -> 8e4c4fe291933511, K2 d17dbc41cbea4d94 -> 10e2b3543627506e, K3 aaf9ea5d05c44eb5 ->
efecaaaea0103649, K4 da8d929a5c1f09a2 -> 50288924a7876ed8, K5-g3 f59984b619b0cc5c -> bab7cdecdbeb7806,
K5-g4 ecb10a2da5969a8f -> 4ace998543caee8d, K5-g5 70ec7965de693377 -> e02f79f9b4e9604c, K5-g6 cb3bbc23fb1473a1
-> 90cd03b3a045c862, K5-g8 695b9762aa369ae7 -> 95efdcbd399b1a1b. K6a, K6b unchanged (no optical indices).
Nothing else in the case files changed (geometry, RF constants, Pockels values identical).

### Modes (vector FEM N2/P2, fixed 0.5 nm corner elements; tidy3d is sanity only, not a gate)

| Case | Quantity | Reference | Finest level | Rule | Round 1 |
|---|---|---|---|---|---|
| K1 | n_eff | 2.44722338 +- 5.9e-7 | 2.44722318 (20 nm) | formal p 4, safety 3 | 2.4472257 +- 1.5e-6 |
| K1 | ng (energy) | 4.19616697 +- 8.6e-7 | 4.19616669 | formal, safety 3 | 4.196166 |
| K1 | ng (FD +-10 nm) | 4.19616154 +- 8.6e-7 | 4.19616125 | formal, safety 3 | 4.196160 |
| K1 | TE fraction | 0.98344242 +- 9.1e-7 | 0.98344211 | formal, safety 3 | 0.9834418 |
| K2 | n_eff | 1.89416707 +- 5.8e-8 | 1.89416702 (28 nm) | observed p 2.89 | 1.8941658 +- 1.9e-6 |
| K2 | ng (energy) | 2.29084988 +- 2.0e-7 | 2.29084972 | observed p 2.77 | 2.2908498 |
| K2 | TE fraction | 0.99060744 +- 6.0e-8 | 0.99060739 | observed | 0.9906076 |
| K3 | n_eff | 1.91237549 +- 1.9e-7 | 1.91237534 (40 nm) | observed p 2.38 | 1.9123755 +- 8e-8 |
| K3 | ng (energy) | 2.26502861 +- 6.3e-7 | 2.26502811 | observed | 2.2650284 |
| K3 | TE fraction | 0.99398954 +- 4.8e-7 | 0.99398915 | observed | 0.9939893 |

Agreement with the audit's independent solver: K1 2.4472236-2.4472239 (this reference is lower by 2.2e-7 to
5.2e-7, inside U 5.9e-7), K2 1.8941671 +- 1e-7 (diff 0), K3 1.9123754 (diff 1e-7). ng by FD and by the energy integral differ by
5.4e-6 (K1), 1.1e-6 (K2), 8e-7 (K3); the energy value is primary (no wavelength-step error). tidy3d (sanity only):
K1 2.44655 +- 3.6e-2, K2 1.89424 +- 4.2e-3, K3 1.91248 +- 3.7e-3.

### K4 / K5 (primary comparands VpiL and dn_mean = (|dn_A| + |dn_B|)/2; per-arm dn and the balance informational)

| Gap (um) | C' (pF/m) | C0' (pF/m) | n_RF | Z0 (ohm) | VpiL (V cm) | dn_mean (1e-5 /V) |
|---|---|---|---|---|---|---|
| 3 | 181.126 +- 0.046 | 43.8182 +- 0.0016 | 2.03314 +- 2.2e-4 | 37.4426 +- 0.0054 | 1.27832 +- 7.0e-4 | 3.031327 +- 0.0016 |
| 4 | 159.699 +- 0.034 | 39.7949 +- 0.0012 | 2.00328 +- 1.8e-4 | 41.8426 +- 0.0052 | 1.76990 +- 9.5e-4 | 2.189387 +- 0.0012 |
| 5 (K4) | 146.519 +- 0.012 | 36.9521 +- 0.0006 | 1.99126 +- 6.7e-5 | 45.3329 +- 0.0022 | 2.27860 +- 5.4e-4 | 1.700603 +- 0.0004 |
| 6 | 137.427 +- 0.014 | 34.7893 +- 0.0006 | 1.98753 +- 8.2e-5 | 48.2415 +- 0.0028 | 2.80581 +- 8.1e-4 | 1.381065 +- 0.0004 |
| 8 | 125.496 +- 0.008 | 31.6425 +- 0.0004 | 1.99150 +- 5.1e-5 | 52.9333 +- 0.0020 | 3.91962 +- 5.3e-4 | 0.988615 +- 0.0001 |

- Informational: VpiL r33 only 1.33503 / 1.84906 / 2.38079 / 2.93186 / 4.09583 V cm.
- Definitional comparison, NOT an engine target: scalar-overlap VpiL 1.43750 / 1.99098 / 2.56352 / 3.15689 /
  4.41019 V cm (+12.5 % vs full vector) uses Gamma = (g/V) int_LN E_x |E_x|^2 / int |E_x|^2 without the n_e/n_eff
  power-normalisation factor; compare an engine's scalar overlap only if its definition is identical.
- Audit's independent re-solve (R9): g3 1.27737, g5 2.27799, g6 2.80544, g8 3.92036 V cm (<= 1e-3 relative).
- Optical-mesh check (arm mesh 40 -> 28 nm): |dVpiL| <= 2.3e-5 V cm. Domain (ES scale 2): 250 / 500 / 1000 / 2000 um
  -> C' 146.5396 / 146.5493 / 146.5492 / 146.5496 pF/m.

### K6 (S 20 / W 5 um, eps_r 11.7)

| Case | Quantity | Closed form | FEM t = 0, R -> inf | FEM t = 0, R = 500 | FEM t = 0.1 um, R = 500 (engine like-for-like) |
|---|---|---|---|---|---|
| K6a | C' | 213.7269 | 213.729 +- 0.014 | 213.654 +- 0.012 | 214.261 +- 0.011 |
| K6a | n_RF | 2.519921 | 2.519921 +- 2.2e-6 | 2.519919 +- 1.8e-6 | 2.503115 +- 4.8e-5 |
| K6a | Z0 | 39.3285 | 39.3282 +- 0.0026 | 39.3421 +- 0.0024 | 38.9688 +- 0.0013 |
| K6b | C' | 171.830 (approx.) | 173.737 +- 0.013 | 173.725 +- 0.013 | 174.321 +- 0.006 |
| K6b | n_RF | 2.259468 (approx.) | 2.271964 +- 2.9e-5 | 2.272287 +- 1.4e-5 | 2.257793 +- 3.3e-5 |
| K6b | Z0 | 43.8619 (approx.) | 43.6204 +- 0.0031 | 43.6296 +- 0.0030 | 43.2030 +- 0.0009 |

R2: K6a R = 500 n_RF U is now 1.8e-6 (round 1: 1.3e-8 from an observed order of 7.65); K6a t = 0.1 um C' moved
214.245 -> 214.261 (audit independent 214.2605). R6 closed: the audit's independent FEM gives K6b C' 173.741
(R 2000), so the 1.1 % gap to the partial-capacitance formula is that formula's approximation.

### Round 2 limitations

- K1 levels remain non-monotone at the 2e-7 to 6e-7 level (unstructured remeshing noise); U comes from the safety
  rule, not from an asymptotic fit. K3 finest level 40 nm, K2 28 nm (one 1.72 GB run, 00:34).
- Optical-mesh checks: K4, K5-g3..g6 at the finest ES level (round-2 code before 08:00), K5-g8 at the coarsest.

## Round 3 plan (written 2026-10-15 08:22 PDT, before any change): K7 off-centre waveguide family (DevLog-029 question)

Question: for arabjuneghani2022 device #2, measured Vpi falls 2.5x from D = 0 to 3.6 um (paper COMSOL tracks it);
the engine gives VpiL(D0)/VpiL(D3.6) = 1.54. Independent answer with this lane's pipeline.
- K7-D{0,1,2.6,3.6}: device #2 cross-section from `sims/arabjuneghani2022/config.yaml` and the paper (Sec. 2, Table 1,
  Fig. 1(a)): 500 nm x-cut LN, 200 nm etch (300 nm slab), rib 0.8 um wide with vertical walls (angle not stated),
  BOX 2 um (config placeholder, not stated), Si substrate, SiO2 cladding flat to slab top + Tc = 1.1 um, buffer
  Tb = 0.2 um (electrode bottom at 0.5 um), Au Tg = 1 um, G = 10, Wc = 22, Wg = 40 um; D measured from the gap centre
  toward the signal (paper text p.2 and Fig. 1(a)); push-pull mirror arms; D values of Fig. 3(c) (0, 1, 2.6, 3.6).
  LN constants as the config's library entry (eps 44 / 27.9 clamped; r13 8.6, r22 3.4, r33 30.8, r51 28.0, Veithen
  Table I clamped); SiO2 eps 3.9, Si 11.7. K4 conventions: domain +-500 um, Si 500 um, air to 500 um, Neumann box,
  1 V terminal difference, metal absent in the optical problem. Optical window per arm x +-4 um, y -1.9..2.5 um
  (inside the 2 um BOX: substrate leakage neglected).
- K7K4-D{0,0.9,1.8}: K4 geometry (gap 5 um) with both ribs moved toward the signal, as a sanity check of the ratio.
- Scripts unchanged except: `make_cases.py` (new families; K1-K6 output byte-identical), `ref_es_eo.py`
  `--scales` option, `run_guarded.sh` limit from `RSS_LIMIT_KB` (1.4 GB here). ES scales 2.83 / 2 / 1.41
  (coarser than K4 to stay below 1.4 GB), arm mesh h 40 nm, round-2 extrapolation rule; output VpiL, dn_mean,
  per-arm dn, ratio VpiL(D = 0) / VpiL(D max) with propagated U.

### Round 3 progress and results

- 08:20 Read the inputs: `sims/arabjuneghani2022/config.yaml`, DevLog-029, paper text Sec. 2-3.1 and Fig. 1(a)
  / Table 1 (page render inspected in the scratchpad, deleted). D is defined from the gap centre (text p.2, Fig. 1(a)).
  LN RF/EO constants copied from `engine/data/materials.json` library entry `lithium_niobate_congruent` (data file).
- 08:21 `make_cases.py`: K7-D0/1/2.6/3.6 and K7K4-D0/0.9/1.8 written; K1-K6 outputs byte-identical (sha256 checked).
  Engine `--check`: K7-D3.6 electrostatics, optical_mode, eo_overlap ready.
- 08:22-08:25 `run_r3.sh` (watchdog 1.4 GB, nice 10, 1 thread): ES scales 2.83 / 2 / 1.41, arm mesh 40 nm, optical-mesh
  check skipped (arm problem is identical for every D: n_eff 1.845666 for K7, 1.894167 for K7K4). Peak RSS 0.97-1.16 GB;
  no watchdog kill. JSON: `reference/K7-D*-es-eo.json`, `reference/K7K4-D*-es-eo.json`; ratios in summary.json.
- 2026-10-15 08:26 PDT results written.

| Case | D (um) | VpiL (V cm) | dn_mean (1e-6 /V) | dn_A / dn_B (1e-6 /V) | Gamma_mean | C' (pF/m) | n_RF | Z0 (ohm) |
|---|---|---|---|---|---|---|---|---|
| K7-D0 | 0 | 5.21301 +- 2.2e-4 | 7.43333 | -7.43329 / 7.43336 | 0.4316 | 139.486 | 2.15661 | 51.573 |
| K7-D1 | 1.0 | 4.89458 +- 3.6e-4 | 7.91692 | -7.91675 / 7.91705 | 0.4597 | 139.514 | 2.15682 | 51.568 |
| K7-D2.6 | 2.6 | 4.02453 +- 2.6e-4 | 9.62844 | -9.62839 / 9.62848 | 0.5592 | 139.626 | 2.15769 | 51.547 |
| K7-D3.6 | 3.6 | 3.40355 +- 3.0e-4 | 11.38518 | -11.38503 / 11.38530 | 0.6618 | 139.787 | 2.15894 | 51.517 |
| K7K4-D0 | 0 | 2.27837 +- 1.5e-3 | 17.0078 | -17.0081 / 17.0075 | 0.5009 | 146.523 | 1.99127 | 45.332 |
| K7K4-D0.9 | 0.9 | 2.10226 +- 1.4e-3 | 18.4326 | -18.4327 / 18.4324 | 0.5430 | 146.999 | 1.99451 | 45.259 |
| K7K4-D1.8 | 1.8 | 1.77859 +- 8.5e-4 | 21.7869 | -21.7880 / 21.7859 | 0.6469 | 148.726 | 2.00619 | 44.995 |

Ratios VpiL(D = 0) / VpiL(D): K7 D1 1.0651 +- 9e-5, D2.6 1.2953 +- 1.0e-4, D3.6 1.5316 +- 1.5e-4; K7K4 D0.9 1.0838 +-
1.0e-3, D1.8 1.2810 +- 1.0e-3. K7K4-D0 reproduces K4 (2.27837 vs 2.27860 +- 5.4e-4).

Comparison (VpiL in V cm at D = 0 / 1 / 2.6 / 3.6; ratio D0/D3.6):
- This lane (independent FEM, vector, full tensor): 5.213 / 4.895 / 4.025 / 3.404; 1.532.
- Engine (DevLog-029): scalar 5.162 / 4.847 / 3.985 / 3.360, 1.536; vector 5.211 / - / - / 3.387, 1.539.
- Paper measured (DevLog-029 digitization of Fig. 3(c)): 6.35 / 4.94 / 3.35 / 2.54; 2.50. Paper COMSOL (Fig. 2, with
  buffer): D0/D2.5 = 1.86 vs this lane D0/D2.6 = 1.295.
Verdict: for the stated cross-section the independent pipeline agrees with the engine (within 0.5 % per point and in the
ratio) and not with the paper (measured or simulated). The disagreement is on both ends (this lane is 18 % below the
measured Vpi at D = 0 and 34 % above it at D = 3.6), so a single scale factor (r33, eps, length) cannot close it; it
needs a geometry or field difference not in the stated inputs (the undisclosed BOX thickness and sidewall, the
electrode/buffer details, or different G or D in the fabricated and simulated devices), as DevLog-029 concluded.
Limits: BOX 2 um is the config placeholder; vertical sidewalls; metal absent in the optical problem; LN constants
clamped library values; no optical-mesh check (round-2 checks moved VpiL by <= 2.3e-5 V cm on K4/K5).
