---
title: L-REF audit - open-source reference numbers K1-K6 (validation/)
date: 2026-10-15
auditor: fresh-context Claude subagent
scope: DevLog-028 claims; DevLog-023 O2/O3 case definitions; validation/{pyproject.toml,uv.lock,eoref/*.py,scripts/*.py,cases/*.yaml,reference/*.json}; sims/SPEC.md conventions (engine/src not read)
---

# L-REF audit (DevLog-023 O5)

Read-only on the lane's files; only this file was written in the repo. Independent checks were written from scratch
in a private scratchpad subfolder (own gmsh geometry, own formulations, Sellmeier coefficients typed from the papers,
own Pockels mapping) and deleted afterwards. All runs: `nice -n 10`, OMP/MKL/OPENBLAS/VECLIB threads 1,
`uv run --project validation`, one process at a time. Peak RSS of the audit runs 1.55 GB (one K5-g3 run at ES scale
0.7; all others <= 1.47 GB). Two lane `--one-level` reruns wrote only to the scratchpad; their two log files in `logs/`
were removed. No process left running.

## Verdict per reference value

| Reference | Trustworthy for engine validation? | Evidence |
|---|---|---|
| K1 n_eff 2.4472257 +- 1.5e-6 | Yes at tolerance >= 5e-6; stated U too small (R1) | independent value 2.4472236-2.4472239 (-1.8 to -2.1e-6) |
| K2 n_eff 1.8941658 +- 1.9e-6 | Yes at >= 5e-6; value biased low by ~1.3e-6 (R1) | independent 1.8941671 +- ~1e-7 |
| K3 n_eff 1.9123755 +- 8e-8 | Yes (diff -4e-8); U below the input-rounding effect (R4) | independent 1.9123754 |
| K1-K3 TE fraction, ng | Yes | independent K2 TE 0.9906074-77, ng_fd10 2.290849; K3 TE 0.9939892, ng_fd10 2.2650275 |
| K1-K3 tidy3d values | Sanity only, not a cross-check at 1e-3 (R3) | K1 finest level 2.8e-2 off, U 3.6e-2 |
| K4/K5 C', C0', n_RF, Z0 | Yes (rel. 2e-4) | own P1 ES, K4: C' 146.49, C0' 36.943 (extrapolated) |
| K4/K5 VpiL full tensor | Yes (rel. <= 1e-3, all gaps tested) | own exact re-solve: g3 1.27737, g5 2.27799, g6 2.80544, g8 3.92036 V cm |
| VpiL r33-only (+4.5 %), scalar (+12.5 %) | Yes as stated; scalar is a definitional comparison, not an engine target (R7) | own ratio r33/full 1.0441-1.0448 |
| K5 dn_A, dn_B separately | Use VpiL or the mean of |dn_A|, |dn_B| (R5) | balance -0.99991 to -1.00006 is extrapolation noise |
| K6a closed form, FEM t = 0 | Yes | own AGM closed form identical; own FEM C0' 33.65803 vs exact 33.65778 |
| K6b FEM t = 0 (173.737) | Yes; PCM 1.1 % gap is the closed form's approximation (R6) | own FEM 173.741 (R 2000), 173.751 (R 8000, coarser) |
| K6a/K6b FEM t = 0.1 um, R 500 | Yes within stated U; extrapolation fragile (R2) | own K6a 214.2605 / n_RF 2.503114 vs 214.2454 +- 0.024 / 2.502995 +- 1.7e-4 |

## Findings

### R1 - major (for gates tighter than 1e-5): K1/K2 mode uncertainties are corner-limited and underestimated

Evidence:
- Lane K2 levels (h 0.08, 0.0566, 0.04, 0.0283): 1.89416800, 1.89416781, 1.89416759, 1.89416739; observed p = 0.34
  (`reference/K2-fem.json`), extrapolation 1.5e-6 below the finest level with the GCI factor 1.25.
- Lane K1 levels: 2.44723966, 2.44723330, 2.44722873, 2.44722691 (differences 6.4e-6, 4.6e-6, 1.8e-6): erratic,
  p from the last three = 2.65, from the first three ~0.95. U = 1.5e-6.
- Independent K2 (Lee-Sun-Cendes form: z row from the curl-curl equation, not Gauss's law; own gmsh mesh, half window,
  PEC; full-precision Sellmeier): at h = 0.04 the corner size matters: corner size h/5 -> 1.894167893, h/20 ->
  1.894166994, h/80 -> 1.894166891, h/320 -> 1.894166895. With h/80: 1.894165061, 1.894166478, 1.894166891,
  1.894167020 (h 0.08..0.028), monotone, p ~ 3.4, extrapolated 1.8941671 +- ~1e-7. At the lane-like corner size h/5 my
  solver shows the same slow drift (1.89416822, .789, .757; steps 3e-7), so the lane's p = 0.34 is a pre-asymptotic
  corner effect (`eoref/modecase.py:68`, corner size h_core/6 scales with h), not convergence.
- Independent K1 with corner size h/80: 2.447173810, .197960, .213446, .220841, .223055, .223724, .223871
  (h 0.08 .. 0.01), p 3.4-4.3 at the end, extrapolated 2.4472239; with the YAML Si index 3.477724 used here vs the
  library value 3.4777238 used by the lane (R4), the like-for-like value is ~2.4472236. Lane - independent:
  +1.8e-6 to +2.1e-6, outside the stated U 1.5e-6.
- Context (DevLog-023 progress): the engine L-VEC reported K1 -5.5e-6 and K2 +1.1e-6 vs L-REF. Against the
  independent values these become about -3.4e-6 to -3.7e-6 (K1) and about -0.2e-6 (K2).
- DevLog-028 "observed order 2-3.4 with corner refinement" does not hold for K2 n_eff (0.34) or K1 (erratic).

Suggested fix: corner refinement fixed at a small absolute size (or h/50-h/80) instead of h/6; re-run K1/K2 (memory
is not the limit: h/80 at h = 0.028 is 66k DOFs, 1.3 GB in my solver); use GCI factor 3 when the observed order is
outside [0.5, 1.5] x p_formal or levels are non-monotone. Until then, gate K1/K2 n_eff at >= 5e-6.

### R2 - minor: low observed orders accepted with the 1.25 factor elsewhere

Evidence: K6a FEM t = 0.1 um: C' p = 0.52, n_RF p = 0.32 (extrapolation 0.019 pF/m = 5x the last difference);
K5-g4 dn_A p = 0.60, K5-g6 dn_B p = 0.45, K5-g3 C0' p = 0.89. `eoref/util.py:69-75` accepts any monotone decreasing
sequence and applies U = 1.25 |f_ext - f_finest|. The independent K6a t = 0.1 um value (214.2605 at my finest
graded mesh, still decreasing) lies inside the lane's U, so no value is wrong here, but the U is not a safe bound
by construction. K6a line R500 n_RF p = 7.65 gives U 1.3e-8, which is meaningless (the R -> inf value has U 1.1e-6).
Suggested fix: as in R1 (factor 3 or p bounded to the formal order); report the finest level next to f_ext.

### R3 - minor: tidy3d is not a cross-check at the 1e-3 level

Evidence: finest levels K1 2.47508 (FEM 2.44723, 2.8e-2 off), K2 1.89756 (3.4e-3 off), K3 1.91541 (3.0e-3 off);
extrapolated U 3.6e-2 / 4.2e-3 / 3.7e-3. "All inside tidy3d's own U" (DevLog-028, Disagreements 1) is true but
vacuous for K1. tidy3d finest levels also exceeded the 1.5 GB cap (1.51-1.61 GB). The FEM primary values are now
independently confirmed (R1 table), so this does not invalidate anything.
Suggested fix: label tidy3d values "sanity only" in summary.json; do not use them in engine gates.

### R4 - minor: YAML optical constants are rounded to 6 decimals, references use full precision

Evidence: `scripts/make_cases.py:22-25` rounds; `eoref/modecase.py:22-26` evaluates the library Sellmeier instead of
the YAML values. Full precision at 1550 nm: SiO2 1.4440236217, Si 3.4777237562, LN n_o 2.2111110087, n_e
2.1375596498; YAML 1.444024, 3.477724, 2.211111, 2.13756 (offsets +3.8e-7, +2.4e-7, -9e-9, +3.5e-7). Estimated n_eff
offset for an engine that reads the YAML: ~+2.7e-7 (K1), ~+3e-7 (K2/K3). This exceeds the K3 n_eff U (8e-8) and is a
fifth of the K1/K2 U. The EO Delta-eps uses the YAML n_e, n_o (`ref_es_eo.py:188`), consistent with the engine.
Suggested fix: write 10 significant digits in the YAML (or have the references read the YAML values).

### R5 - minor: dn_A and dn_B are extrapolated independently

Evidence: by mirror symmetry dn_B = -dn_A exactly; level values agree to 1e-9 relative, but independent Richardson
with different observed orders gives |dn_A| - |dn_B| = -1.0e-8 (K5-g4) and +8.9e-9 (K5-g6), balance -0.99991 (g6).
VpiL itself is extrapolated per level and is unaffected.
Suggested fix: report dn = (|dn_A| + |dn_B|)/2 per level and extrapolate that; compare the engine's per-arm dn to it.

### R6 - note: K6b partial-capacitance gap confirmed as the closed form's approximation

Evidence: own AGM closed form reproduces the lane exactly (C0' 33.65778, K6a C' 213.7269, n_RF 2.519921, Z0 39.3285;
K6b k1 0.440190, q1 0.383663, C' 171.8296). Own FEM (half domain with mirror Neumann, graded tensor mesh down to
2 nm at the strip edges, P2, AMG-CG, zero-thickness strips): K6a R 2000 C' 213.72849, C0' 33.65803 (exact 33.65778);
K6b R 2000 C' 173.74134, n_RF 2.271994, Z0 43.61977; K6b R 8000 (coarser mesh) 173.75126 vs 173.75055 at R 2000 same
mesh (domain converged to 4e-6). Implied q = (C'/C0' - 1)/(eps_r - 1) = 0.38896 vs PCM 0.38366 (-1.4 %). The lane's
FEM reference 173.737 +- 0.013 is confirmed (diff 2.7e-5 rel.); DevLog-028 "not further verified" can be closed.

### R7 - note: scalar Gamma is a definitional comparison

Evidence: `ref_es_eo.py:204-208` Gamma = (g/V) int_LN E_x,static |E_x|^2 / int |E_x|^2 and dn = -n_e^3 r33 Gamma/(2g),
without the (n_e/n_eff) power-normalisation factor of the exact slab result (gate G5 closed form). The 12.5 % is
therefore model plus definition. Order-of-magnitude check: VpiL = lambda g / (2 n_e^3 r33 Gamma) with Gamma
0.53587/0.51564/0.50087/0.48814/0.46583 gives 1.43764/1.99206/2.56350/3.15642/4.41013 V cm, equal to the lane's
scalar column. The engine's own scalar overlap may be normalised differently; compare it only if the definitions
match.

### R8 - note: formulation, conventions and mappings checked, no defect

- `eoref/fmode.py` re-derived: transverse row from curl-curl, z row from Gauss's law div(eps E) = 0 with e_z = i beta
  E_z / k0^2; eps_t enters e_t.v_t and e_t.grad v_z, ezz enters e_z v_z; reduces to femwell for scalar eps. Gauss
  row plus transverse curl-curl implies the z curl-curl row for beta != 0, so the system is complete. H' = -i curl
  E / k0, P' = 1/2 Re int E x H'*, delta n_eff = int E*.d eps.E / (4 P') (= c eps0/(4P) in SI), n_g = int (eps_g
  |E|^2 + |H'|^2)/(4 P') with eps_g = n (2 n_g,mat - n): all correct. Docstring nits: "A, B symmetric"
  (`fmode.py:107`) is false for this form (grad e_z.v_t vs eps_t e_t.grad v_z; harmless, general `eigs` is used);
  `fmode.py:8` refers to a non-existent `scripts/ref_modes.py`.
- Pockels (`eoref/pockels.py`): 3m tensor with the mirror normal to crystal x; with E2 = 0 (no lab-z static field):
  d(1/eps)_11 = d(1/eps)_22 = r13 E3, _33 = r33 E3, _13 = r51 E1, _12 = -r22 E1, _23 = 0. Lab x = crystal z, lab y =
  crystal x, lab z = crystal y (right-handed): xx = r33 E3, yy = zz = r13 E3, xy = r51 E1, yz = -r22 E1, xz = 0.
  Matches. d eps = -eps d(1/eps) eps correct. r22 (yz) is in quadrature for a lossless mode (zero at first order);
  orientation flips change |dn_A - dn_B| by nothing (checked both 180 deg rotations).
- Mirror handling in `arm_overlap` (TE: E_x even, E_y, E_z odd; xy and xz products odd; power halved) correct.
- VpiL = lambda / (2 |dn_A - dn_B|), dn per volt of the full terminal difference, matches sims/SPEC.md
  `eo-atlas.eo-overlap/v2`; units (m -> x100 V cm) correct.
- Electrostatics: C' = eps0 int eps |grad phi|^2 at 1 V (= 2W'/V^2), C0' on the same mesh with eps = 1, n_RF =
  sqrt(C'/C0'), Z0 = 1/(c sqrt(C' C0')); LN lab (xx, yy) = (par 28, perp 44) for x-cut; AMG-CG tolerance 1e-13 with a
  1e-10 residual check is far below 1e-4 in C'. Static field is the exact DG projection of the P2 gradient, sampled on
  the LN side only.
- Case inputs vs O3: K1-K6 geometry, rib base half-width 0.5 + 0.3/tan 60 deg = 0.673205081, K4 electrodes (Au 0.8 on
  slab, gap 5, signal 20, grounds 100, BOX 4.7, Si), eps 44/28, r values, Zelmon/Malitson indices (recomputed:
  n_e 2.1375596, n_o 2.2111110, SiO2 1.4440236) all match. Fixed details (Si 500 um, air 500 um, Neumann box, rib
  centred in the gap, semi-infinite BOX in the optical window, t = 0.1 um for K6 in the engine format) are documented
  in each YAML header.

### R9 - note: independent EO/ES end-to-end check

Own half-domain K4/K5 geometry (gmsh), P1 electrostatics (AMG-CG), own Pockels mapping, own LSC mode solver on the
full arm window (no mirror parity), dn_A by exact re-solve at +-20 V (central difference; no power normalisation
involved), push-pull by symmetry dn_B = -dn_A:

| Gap | ES scale | C' | C0' | n_RF | rib-centre E_x (V/um/V) | VpiL full | VpiL r33 | Lane VpiL |
|---|---|---|---|---|---|---|---|---|
| 5 | 2 / 1 / 0.7 | 147.739 / 146.862 / 146.689 | 37.325 / 37.056 / 37.004 | 1.9895 / 1.9908 / 1.9910 | 0.10483 | 2.27799 | 2.38000 | 2.27861 +- 5.7e-4 |
| 3 | 1 / 0.7 | 181.570 / 181.354 | 43.935 / 43.877 | 2.0329 / 2.0330 | 0.18666 | 1.27737 | 1.33389 | 1.27842 +- 8.3e-4 |
| 6 | 1 | 137.755 | 34.889 | 1.98706 | 0.08514 | 2.80544 | 2.93074 | 2.80580 +- 8.3e-4 |
| 8 | 1 | 125.797 | 31.734 | 1.99100 | 0.06099 | 3.92036 | 4.09564 | 3.91970 +- 6.5e-4 |

K4 P1 three-level extrapolation (observed p ~ 1.75): C' 146.49, C0' 36.943 (lane 146.519 +- 0.012, 36.952 +- 6e-4).
My optical mesh (h 0.056 full window) is the limit of these checks (h 0.08 -> 0.056 moved VpiL by 2.3e-3 at g = 5),
so agreement at <= 1e-3 relative is all they establish; that excludes factor, sign, frame, normalisation and mirror
errors. The non-monotone n_RF vs gap (minimum near g = 6, then up at g = 8) is reproduced and is physical (LN slab
participation falls, Si substrate participation rises with gap). C' falls and Z0 rises monotonically with gap;
VpiL is close to linear in gap (slope 0.49-0.56 V cm/um, Gamma 0.536 -> 0.466).

### R10 - note: reproducibility and provenance

- Reruns (scratch output): `ref_modes_fem.py K2 --one-level 0.04` reproduces level 3 (n_eff diff -7e-16, ng, TE
  fraction identical); `ref_es_eo.py K4 --one-level 2.0` reproduces C', C0', n_RF, Z0 to 5e-12 pF/m.
- Every reference JSON's `case_sha256` matches the current case file; versions recorded (Python 3.12.11, numpy 2.4.6,
  scipy 1.18.1, scikit-fem 12.0.2, femwell 0.1.12, gmsh 4.15.2, shapely 2.2.0, tidy3d 2.12.0, pyamg 5.3.0) and pinned
  in `validation/uv.lock`. `validation/` is untracked in git as of this audit (not yet committed).
- `reference/gates.json` gates G1-G7 are sound (TE/anisotropic TM slab, Pockels slab vs exact derivative), but the
  off-diagonal xy (r51) perturbation term has no analytic gate; R9 covers it end to end.
