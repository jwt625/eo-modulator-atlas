---
title: Fresh-context audit of lane L-VEC (full-vector optical mode solver)
date: 2026-10-15
auditor: fresh-context Claude subagent
scope: engine/src/vector-mode.mjs, engine/src/ldlt.mjs, engine/src/vector-dense.mjs, engine/tests/vector-mode.test.mjs, DevLog-025 claims (derivation, gates G1-G9, K1-K4 cross-solver, performance), plus the mesher interface finding (engine/src/mesh.mjs, L-PERF) and a conformity survey of every sims/*/config.yaml. Read-only on the repo; only this file was written. Scratch scripts in the session scratchpad (removed after the audit).
---

# L-VEC audit (2026-10-15)

Result: 0 blocking for L-VEC code, 1 major (mesher, owner L-PERF; affects every solver), 4 minor, 6 notes.
The solver itself checks out: element matrices, conformity of the edge/nodal spaces, spectrum completeness,
LDL^T, gates, field conventions, EO overlap and the K1-K3 numbers were reproduced independently.

Environment: Node 23.7.0, `nice -n 10`, `--max-old-space-size=1536`, one process at a time; Python checks with
`uv run --project validation` (numpy 2.4.6, scipy 1.18.1, shapely 2.2.0), BLAS/OMP threads 1. Load average 3.4-3.6
during the runs (machine in use), which affects timings.

## Findings

### V1 (major, owner L-PERF) Mesher drops region-interface subsegments; 8 of 45 electrostatic and 29 of 71 optical meshes of the current configs are non-conforming

- Reproduced the DevLog-025 case on the working tree and on HEAD (`git archive HEAD engine/src` copy): domain x [0, 0.3],
  y [-4, 4], core rect(0, 0.3, -0.3, 0.3), `core_edge_um 0.05`, `max_edge_um 0.1` gives core mesh area 0.180547 vs 0.18
  (rel +3.04e-3, 6 straddling triangles); the vertical variant gives 0.359498 vs 0.36 (rel -1.39e-3, 6 straddling).
  Width 0.2 and core_edge 0.03 conform. Identical numbers on both trees: pre-existing at HEAD, not introduced by L-PERF.
- Mechanism (instrumented scratch copy of mesh.mjs): at the end of `meshDomain` the `seg` map still holds subsegments that
  are not triangulation edges (`T.findEdge` fails): 2 in case A, 3 in case B; none is queued. Every missing subsegment
  has two vertices exactly on its diametral circle (d/r = 1.000000000000 to 12 digits) and, later, a refinement
  circumcentre exactly at its midpoint (case A: vertex 375 at (0.042697, -0.3) on subsegment (0, -0.3)-(0.085393, -0.3),
  inserted by the triangle-refinement loop, not by `splitSeg`). The encroachment test `encroaches()` (mesh.mjs:428-434)
  needs dot < -1e-12 * S (strictly inside, with a margin), while the Bowyer-Watson cavity uses the exact `incircle > 0`
  (mesh.mjs:241) plus the seed triangle. A vertex on or marginally inside the diametral circle is therefore "not
  encroaching" but can still remove the subsegment from the Delaunay triangulation; nothing re-checks lost subsegments
  (`afterInsert` and the cavity scan only look at existing triangle edges), so the loss is silent and later insertions
  cannot see the subsegment either.
- Survey (current tree, every sims/*/config.yaml that parses: 33 of 40; 7 fail on missing `eps_r`, meng2023 throws
  "electrodes 0 and 1 share an edge"): exact effective region areas with shapely (paint order last-wins, electrodes
  subtracted) vs mesh region areas.
  - Electrostatic mesh (`section.buildMesh`, scale 1), 45 sections: 8 non-conforming. Worst valdez2022 `protrusion`
    si_wg_r -0.97 % (0.04085 vs 0.04125 um^2), mao2022 strip_l +0.57 %, arabjuneghani2022 rib_l +0.25 %, lin2025
    lt_rib_l -0.031 %, chen2022 and wang2025 sio2_cladding ~1e-6 (both sections each). Each has 2 straddling triangles.
    HEAD engine on the same configs (37 sections parse there): the same 5 lin2025/chen2022/wang2025 sections fail
    (the other three configs do not parse at HEAD).
  - Optical window and arm-window meshes (`buildOpticalModel`, default sizing, the default path of both the scalar
    and the vector solver), 71 meshes: 29 with area error > 1e-9, 27 with straddling triangles, 15 configs. Worst
    wang2022 si_wire_r +0.21 %, mao2022 strip_r +0.12 %, arabjuneghani2022 rib_r +0.11 %; also pan2021, li2022b,
    murai2025 (gate configs with paper VpiL targets), chen2023, meng2023, lin2026a, wang2022a, wang2024a, xue2026,
    valdez2023, kharel2021, xue2023.
  - The K1-K3 vector meshes used for the cross-solver comparison (refine boxes + cornerRefine) conform exactly.
- Effect: interfaces displaced by one element over a short length; O(h) geometry error in n_eff, confinement, C' and
  the EO overlap. Magnitude on the gate configs is not quantified here (DevLog-025 measured 2.7e-4 in n_eff on the slab).
- Fix: (1) make the encroachment test consistent with the cavity (treat on-circle and within-tolerance points as
  encroaching, i.e. dot <= +tol), or re-queue any subsegment whose two adjacent triangles both enter a cavity;
  (2) final pass in `meshDomain`: every subsegment must be a triangulation edge, force-split the missing ones and
  re-run refinement; (3) a cheap conformity assertion (region area vs polygon area, or straddle test) in
  `extractMesh` or `buildMesh`, surfaced as an error or label.

### V2 (minor, owner L-VEC) Inertia check at a level equal to a material index runs on hundreds of static pivot perturbations, without a warning

- `solveVectorModes(..., {inertiaCheckN})` factorises K(s) with 1x1 pivots at an indefinite, non-quasi-definite shift
  (vector-mode.mjs:1065-1071). When s = k0^2 eps of a region (G4b uses `inertiaCheckN: 1.444` = n_clad exactly), the
  gradient-type edge DOFs of that region have zero diagonal. G4b geometry: check at 1.444 -> 1638 perturbed pivots;
  at 1.444 (1 + 1e-6), 1.45, 2.0, 1.4 -> 0 perturbed pivots. All counts were correct (3, 3, 3, 1, 4 = modes above the
  level); dense `eigvalsh` on a 1974-DOF order-2 matrix confirmed 7 above n = 1.444 while the engine had 106
  perturbations. Correct here, not guaranteed in general (growth 1/tau = 1e13 in the factor).
- Fix: warn or return `reliable: false` when `check.nPerturbed > 0`; offset the check level by a relative 1e-6 when
  it coincides with a material index; change G4b to a level off any material index.

### V3 (minor, owner L-VEC) Complex LDL^T path never refines after static pivot perturbation

- Real path switches to `solveRefined` when `nPerturbed > 0` (vector-mode.mjs:1026, 1032). The lossy path only
  warns (vector-mode.mjs:1100-1116, 1189); `ComplexLDLT`/`ComplexSupernodalLDLT` have no `solveRefined`. Synthetic
  test (real case): unrefined solve error 2.4e-3 / 1.5e-3 with 11-12 perturbed pivots, refined 1e-16. A user-chosen
  `nTarget` near a lossy eigenvalue or a material index can hit this.
- Fix: complex iterative refinement against (Kr, Ki), mirroring the real path.

### V4 (minor, owner L-VEC) Lossy policy: default shift sits below plasmonic modes, and there is no above-shift diagnostic

- Default `nTarget` = 1.0005 x max dielectric index (vector-mode.mjs:1001, 515-520 exclude eps' < 0 metals). For the
  G8 geometry the SPP has n_eff 1.516989 (closed form) above the default shift 1.50075. The solver still returned it
  (1.516988, 608.4 dB/cm; same result with `nTarget: 1.6`), because it is the nearest eigenvalue, but `inertia` is null
  for lossy solves and no warning says a returned Re n_eff exceeds the shift. With more requested modes or a denser
  spectrum, modes above the shift compete with those below by |mu| and the "highest n_eff first" reading can miss one.
- Fix: for `metal: 'lossy'` default the shift above max(n_dielectric, Re sqrt(eps_m eps_d / (eps_m + eps_d))) over
  metal/dielectric pairs present, or warn when max Re n_eff > nTarget.

### V5 (minor, owner L-VEC) Benchmark not reproducible from the repo record

- The vector bench script is not in the repo and `logs/vector-bench-20261015T0651.jsonl` records the refine boxes but
  not the hints. Reproduction needed a search: `hints.max_edge_um = 0.4` reproduces the logged K2 order-1 mesh exactly
  (18,264 edges, 24,158 DOF, nnz(L) 960,793, TE0 n_eff 1.8938020428 identical to 10 digits) and the order-2 h 0.12
  mesh (6,945 edges, 31,904 DOF, nnz(L) 1,419,790). Default hints give 25,037 edges.
- Timings reproduced on that mesh (median of 3, load ~3.5): order 1 model 115 + solve 189 = 304 ms (DevLog 310);
  order 2 h 0.12 148 + 242 = 390 ms (DevLog 361); order 2 + corners 0.01 (max_edge 0.5): 202 + 407 = 610 ms (DevLog
  580). Within machine-load noise. Process RSS after 3 solves 178 MB (order 1), 215 MB (order 2), 296 MB (53k DOF);
  K4 full chain (ES scale 2 + two arm models) peak RSS 507 MB, scale 1.5: 524 MB. DevLog "~0.5 GB" for a 56k-DOF
  order-2 process matches the bench-process RSS (cumulative), not a single solve.
- Fix: commit the bench driver (engine/bench/ or engine/tests/), log the full option object including hints.

### V6 (note, owner L-VEC docs) DevLog-025 K4 row quotes the pilot reference

- validation/reference/K4-es-eo.json is now final (`pilot: false`, case sha256 matches K4.yaml): dn_A f_ext
  -1.70057e-5 per V (U 4.5e-9), VpiL 2.27861 V cm (U 5.7e-4), VpiL r33-only 2.38076 V cm (full/r33-only = 0.957094).
  DevLog-025 still lists -1.7003e-5 (1.9e-8) and 2.2782 (pilot).
- Reproduced with the engine (order 2, rib box h 0.12 + corners 0.01, `metal: 'absent'`, P1 ES sampled per optical
  triangle): ES scale 2 dn_A -1.71408e-5 (+0.79 %), VpiL 2.26064; scale 1.5 dn_A -1.71100e-5 (+0.61 %), VpiL 2.26526.
  Assuming first-order ES convergence (P1 gradient sampling), the scale-0 estimate is about -1.7018e-5 (+0.07 %): an
  estimate, not a measurement. Signs (A negative, B positive) match L-REF and the scalar `combineArms` convention.
- r33-only/full: 0.95771 (scale 2), 0.95736 (scale 1.5) vs L-REF 0.95709. The ratio moves by 3.5e-4 with the ES mesh,
  so "isolates the tensor overlap" overstates it; it still converges toward L-REF.

### V7 (note, owner L-REF) K1 engine-reference gap exceeds the reference uncertainty; likely reference-side

- Engine order 2 with graded corners: 2.4472238 (box 0.1 / corners 0.01, 39.5k DOF), 2.4472207 (0.05 / 0.0025, 71.8k),
  2.4472197 (0.05 / 0.00125, 86.4k); monotone, still falling. Uniform box h 0.01 without corner grading (450k DOF):
  2.4472314. L-REF f_ext 2.4472257 (U 1.5e-6), finest level 2.4472269, from uniform core refinement with observed
  p 2.65. The engine's corner-graded values are already below L-REF's finest level, so the gap (~ -6e-6, 4x U) is most
  likely the reference extrapolation under-resolving the Si corner singularity. ng (4.196155 vs 4.196166 / 4.196160),
  TE fraction (0.983441 vs 0.983442) and core power (0.783242 vs 0.783245 finest) agree.
- Fix (L-REF): add a corner-graded mesh sequence for K1 or widen U.

### V8 (note, owner L-VEC) G5b and G6 are self-consistency gates

- Both compare the perturbation formula with a finite difference of the same solver (eigenvalue under eps + s d eps;
  wavelength FD). They verify the Hellmann-Feynman implementation, not the physics. Independent evidence for ng with
  dispersion comes from K2/K3 (ng 2.2908475 / 2.2650269 vs L-REF 2.2908498 / 2.2650284 energy) and for the tensor
  overlap from K4 (V6). Recommend saying so in the gate table.

### V9 (note, owner L-VEC) G8 metric does not bound the loss

- The gate uses |d theta| / |theta|, dominated by Re theta. Im theta errors: order 2 -0.086144 vs -0.086160 (1.9e-4
  rel; 608.385 vs 608.499 dB/cm), order 1 -0.086168 (9e-5 rel). Fine for the claim, but a separate tolerance on
  Im theta (loss) would make the gate meaningful for metal absorption.

### V10 (note, owner L-VEC) `epsDelta` perturbs eps but not eps_g

- vector-mode.mjs:996-1000 adds `epsDelta` to `mt.eps` only; `mode.ng` of a perturbed solve uses the unperturbed group
  tensor. Test-only API today; document or apply the same delta to `epsG`.

### V11 (note) Lossy and PEC metal paths checked

- `metal: 'pec'` (dielectric 2 x 1 um, n 1.5, in a conductor frame, order 2, h 0.1): first 6 theta match the PEC-guide
  closed form to -2.3e-10 .. -1.1e-6; inertia consistent (negative pivots = N_z). `pec` / `lossy` default meshing keeps
  the electrode triangles (area 0.100000 of 0.1), `absent` removes them and lists them as omitted.

## Verified (no finding)

1. Derivation. Independently derived the Lee-Sun-Cendes functional with e_t = beta E_t, e_z = -j E_z, mu = 1,
   eps = [[eps_t (2x2, eps_xy), 0], [0, eps_zz]], and the change e_t' = e_t + grad e_z with grad(L) = N D, S D = 0. The
   pencil A' x = -beta^2 B' x in DevLog-025 and vector-mode.mjs:16-22 is the one obtained (A' = [[S - k0^2 T_eps,
   k0^2 G_eps], [k0^2 G_eps^T, -k0^2 S_eps]], B' = diag(T_tt, -k0^2 T_zz)). Quasi-definiteness for sigma > k0^2 max eig
   eps follows (T_tt > 0, S_eps >= 0, T_zz > 0).
2. Element matrices. Independent Python implementation (barycentrics from vertex coordinates, finite-difference curls
   and gradients, 12 x 12 collapsed Gauss rule) vs the engine's `elementMatricesP1` and `elementMatricesQ` on 6 random
   triangles (both orientations, random edge signs, random eps with eps_xy, random k0): max relative difference
   2.4e-13 (A), 2.2e-13 (B), also for the eps-linear (loss) matrices. Order-2 transverse space: rank 8, contains
   grad P2 (least-squares residual 1e-13 .. 5e-13); analytically the face functions L_2 W_01, L_0 W_12 have quadratic
   parts l(x) (-y, x), so the space is R_2 (Nedelec first kind, degree 2). Degree-4 Dunavant rule (constants checked)
   is exact for every integrand with piecewise-constant eps.
3. Inter-element conformity. Random DOF vector on a rotated-LN rib (eps_xy up to 0.13, mixed PEC/PMC sides): tangential
   e_t' and e_z jumps across all 1791 shared edges <= 5.7e-15 (both orders); tangential E and E_z on PEC sides
   <= 2.2e-16. Edge orientation signs are consistent.
4. Spectrum completeness. Assembled A', B' exported and solved densely (scipy `eig(A, -B)`): order 2 (1974 DOF) and
   order 1 (2434 DOF). The solver's 8 modes are the 8 largest real theta, relative difference <= 1.1e-13; no spurious
   eigenvalue in the guided band; the remaining eigenvalues are the theta = 0 cluster (|theta| < 2e-12 k0^2) and
   evanescent modes. Inertia at the shift (negative pivots = N_z = 564 / 608) and at n = 1.444 (7) match `eigvalsh`.
5. LDL^T (`LDLT`, `SupernodalLDLT`, `ComplexLDLT`, `ComplexSupernodalLDLT`) on random sparse matrices (n 300) vs dense:
   quasi-definite rel. error 8e-16, inertia 120 = dense; indefinite (cond 656) 3e-14 (refined 5e-15), inertia
   151 = dense; complex-symmetric 5e-14; zero-pivot 2x2-block matrix: 11-12 static perturbations, refinement recovers
   1e-16, inertia 20 = dense. `solveMany` consistent. Symbolic reuse via `sparse.analyze` (AMD, postordered perm) valid.
6. Gates re-run (`node --test`, 21/21 pass, 4.0 s, peak RSS 384 MB); verbose numbers equal DevLog-025. Analytic
   references recomputed independently in Python (brentq): G2 TE 1.8375053 / TM 1.7728780; G3 E-normal 1.9484779 /
   E-tangential 2.0296910 (audit Q2 F1/D5 text 1.94848 / 2.02969); G5 -1.4683083e-4; G7 Im theta -1.9739209, TE10
   86.359039; G8 theta 37.814719 - 0.086160 j. None are copied from solver output.
7. Field conventions derived from Faraday/Ampere: E_t = e_t / beta, E_z = j e_z, H_t = z x e_t' / (k0 eta0),
   H_z = j curl(e_t) / (beta k0 eta0); P = x^T B' x / (2 k0 eta0 beta) (uses D^T T_tt e_t' = k0^2 T_zz e_z at an
   eigenpair); d beta = (k0^2 / 2 beta) [int e_t.d eps.e_t + beta^2 int d eps_zz e_z^2] / x^T B' x equals
   (omega eps0 / 4P) int E*.d eps.E; ng = (k0 / beta) [int e_t.eps_g.e_t + theta int eps_g,zz e_z^2] / x^T B' x with
   eps_g = eps - (lambda/2) d eps/d lambda (from d(k0^2 eps)/dk0). Code matches (modeFields, postProcess,
   pencilForm). Pockels: `pockelsVoigt` 3m layout, `deltaEpsLab` = -eps A d(1/eps) A^T eps with E_c = A^T E_lab, x-cut /
   y-propagation gives lab x = crystal z; same `deltaEpsLab` and sign as scalar eo-overlap.mjs, so `combineArms`
   receives consistent signs. TE fraction = int |E_x|^2 / int |E_t|^2 over the window (matches L-REF to 1e-6).
8. Cross-solver with my own driver (cases parsed from validation/cases/*.yaml, sha256 equal to the reference files;
   window, PEC boundary, wavelength 1.55 um, indices 3.477724 / 1.444024 / 2.211111 / 2.13756 from the case files;
   region areas conform exactly): K2 (117k DOF) n_eff 1.8941669, ng 2.2908475, TE 0.9906070, LN power 0.8885541 vs
   L-REF 1.8941658 / 2.2908498 / 0.9906076 / 0.8885563; K3 1.9123754 / 2.2650269 / 0.9939888 / 0.8688186 vs 1.9123755 /
   2.2650284 / 0.9939893 / 0.8688204. K1 see V7. All far inside the S4 gate (1e-3 vs Tidy3D).
