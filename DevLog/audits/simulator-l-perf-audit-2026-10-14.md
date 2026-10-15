---
title: Fresh-context audit of lane L-PERF (solver performance, DevLog-024)
date: 2026-10-14
auditor: fresh-context Claude subagent
scope: engine/src/{sparse,mesh,fem,electrostatics,optics}.mjs, engine/bench/bench.mjs, engine/tests/perf-{ng,sparse,p2}.test.mjs, DevLog-024 claims (DevLog-023 S0/S3, O5)
---

# L-PERF audit (2026-10-14, runs finished 2026-10-15 00:2x PDT)

## Method

- Three engines, all run from a private scratch folder (removed afterwards):
  - HEAD = `git worktree` of 365519a (engine + sims at HEAD).
  - HYB = HEAD engine with the five current L-PERF files copied in (sparse, mesh, fem, electrostatics, optics). Any
    HEAD-vs-HYB difference is attributable to L-PERF alone.
  - CUR = snapshot of the whole current working tree engine + sims (for cross-lane checks).
  - The L-PERF files were hashed at snapshot time and were unchanged through the audit.
- Inputs: HEAD `sims/*/config.yaml` (40 configs) unless stated otherwise.
- Constraints: one `nice -n 10` Node 23.7.0 process at a time, `--max-old-space-size=1536`. Other lanes were running
  on the machine (load average 3.3-4.1), so wall times are indicative only.
- Independent oracles: dense Gaussian elimination, a Sylvester-inertia bisection for lambda_min, a 7-point
  Dunavant quadrature with finite-difference basis gradients, exact polynomial and exponential solutions, and the
  engine's own FD group index at 5 step sizes.

## Findings

### P1 (minor; owner L-PERF): a symbolic analysis from a different pattern is accepted and can return a wrong solution

- `SparseCholesky` (sparse.mjs:1188) checks only `sym.n === pat.n`. `factorNumeric` checks nothing. `PoissonSolver`
  (fem.mjs:257) checks only `sym.n === nf`. `solveNumeric`/`solveNumericMulti` do not check `num.ok`.
- Evidence: I took a 12x10 triangulated grid and made 363 variants by swapping two edges (same n = 120, same nnz).
  Each variant was factored with the original grid's `sym`. Results:
  - 315 returned `factor() === false`.
  - 48 returned `true` with a wrong solution. Worst ||Ax - b||/||b|| was 3.87e-1.
  - Two simpler variants (other diagonal split; one flipped cell) returned `false`.
- Current engine paths cannot reach this:
  - The ES vacuum solve shares `pat` and `isDof` with the dielectric solve.
  - Optics keys the cache by `freeKey(isFree)` on one `model.pat`.
  - `warm` is never passed across models. I checked run.mjs, stages.mjs and groupIndex.
  - It is still an API hazard. The audit brief requires reuse on a different pattern to be "rejected or impossible", and this is neither.
- Fix:
  - Store a pattern fingerprint in `sym`: the pattern object reference, or nnz plus a hash of rowptr/colidx.
  - Check the fingerprint in `SparseCholesky` and `factorNumeric`.
  - Make `solveNumeric*` throw when `num.ok` is false.

### P2 (minor; owners L-PERF + L-PARAM + L-UI): the config value `finite_difference_wavelength` now runs the perturbation method

- `config.mjs:351` accepts only `fixed | finite_difference_wavelength`. `run.mjs:140-145` calls `groupIndex` with the
  default `method: 'perturbation'`, and the `delta` it passes is unused.
- Stale docs still describe finite differences:
  - engine/README.md:14 says "finite-difference group index".
  - sims/SPEC.md:31 and :94 say "group index via wavelength finite difference".
  - The schema enum and the UI option list (app/src/lib/sim/Settings.svelte:47) still offer only `finite_difference_wavelength`.
- The numerical effect is small:
  - Perturbation vs HEAD FD over 26 configs: |rel| <= 2.68e-5 (li2022b).
  - xue2023 -1.48e-5, valdez2023a -1.21e-5, mao2022 -9.70e-6.
  - FD-new vs FD-HEAD agree to <= 3.3e-13, so the FD path itself is unchanged.
- The issue is a label/contract mismatch, not an accuracy problem.
- Fix:
  - Add a `perturbation` enum value (default) and keep FD selectable through config, schema, SPEC, README and UI.
  - Or rename the method and record it in the result.

### P3 (minor; owner L-PERF): the residual criterion is bypassed for non-target modes; S3.7 table is stale; 2-mode solves always use 8 shifts

- `optics.mjs` accepts a solve when `stable >= 10`, so `converged: true` can be returned with the residual criterion
  (resTol 1e-12) unmet.
- `numModes: 2`, default options (HYB, HEAD configs):

  | Config | Iterations | Mode 0 residual | Mode 1 residual |
  |---|---|---|---|
  | mao2022 | 45 | 9.8e-15 | 3.6e-9 |
  | wang2022 | 77 | 2.6e-14 | 2.2e-7 |
  | valdez2023a | 27 | 1.4e-14 | 1.2e-11 |

  - With the eigenvalue criterion only, the same runs stop at 37/69/19 iterations. The defaults add exactly 8
    iterations, which is the fallback firing.
  - The residual target is reachable. With `tol: 1e-20` the runs converge at 70 iterations (mao2022, residual
    3.1e-15) and 231 iterations (wang2022, residual 1.6e-15).
- DevLog-024 S3.7 table row "mao2022 TE (2 modes) 59 it / 1.2e-14, 8.5e-13" does not match the current code
  (45 it / 9.8e-15, 3.6e-9).
- Every 2-mode solve reached the `nShift` cap of 8 (mao2022, lin2025, wang2022, valdez2023a), which costs 8 extra
  numeric factorizations. The `rho > 0.05` test stays true because the limiting ratio
  (lambda1 - lambda0)/(lambda_p - lambda0) exceeds 0.05.
- Impact:
  - No regression vs HEAD, which used an eigenvalue-only criterion.
  - The engine run path solves `modeIndex + 1` modes. Its target-mode residual was <= 2.6e-14 in every case I ran.
  - A config with `mode_index >= 1`, or a UI/API consumer of mode >= 1 vectors, can get a vector at 1e-7 residual
    flagged as converged.
- Fix:
  - Expose a per-mode `residualConverged` flag in the result (today the residual is only in `timing`).
  - Remove or lengthen the fallback for `residualModes`.
  - Stop shifting once the predicted gain in rho is small.
  - Update the S3.7 table.

### P4 (minor; owner L-PERF): bench regression check misses non-numeric leaves; ng exemption too broad

- `flatten` keeps numbers only. Target `status` (pass/fail), `converged` booleans, `warnings`, `labels`,
  `limitations` and `stages` are never compared.
- The regex `^targets\.ng_opt#\d+\.` also gives 1e-4 tolerance to config inputs `value`, `tol_abs` and `tolerance`.
  Only `actual` and `metrics.ng_opt` are method outputs.
- The 1e-4 ng tolerance is 3.7x the largest observed config difference (2.68e-5) and 10x the bench maximum (9.70e-6).
  This is acceptable only because check 3 below verifies the formula to < 1e-8.
- The other tolerances are justified by the observed data (my HEAD baseline vs HYB):
  - Unchanged leaves are <= 3.8e-14, except `rf.wheeler.maxRelativeSpread` at 1.86e-11 (a difference quantity). 1e-9 is safe.
  - `boundaryMarginFraction` differs by up to 3.57e-8 (lin2025). Check 2 shows HYB is the more accurate value, so 1e-7 holds.
  - `energyChargeRelativeError` values are 3e-14 to 3e-12, so an absolute 1e-10 is appropriate.
- Fix:
  - Compare strings and booleans exactly.
  - Restrict the ng exemption to `metrics.ng_opt` and `targets.ng_opt#*.actual`.

### P5 (minor; owner L-PERF): `analyze` crashes on n = 0; `ordering: 'nd'` without coordinates

- `analyze({n: 0, ...})` throws `TypeError: Cannot read properties of undefined (reading 'length')` at
  sparse.mjs:768. `new SparseCholesky(emptyPattern)` throws the same error.
- This is only reachable if every DOF is Dirichlet.
- `analyze(pat, {ordering: 'nd'})` with no x/y calls `ndOrder(pat, undefined, undefined)`. This is by inspection only; I did not run it.
- Fix: return an empty sym for n = 0, and validate x/y for 'nd'.

### P6 (note; owner L-PERF): documentation and reproducibility

- The header comment in sparse.mjs (lines 1-4) still describes coordinate ND plus up-looking Cholesky.
- DevLog-024 S3.9 rows "P1 scale 0.5" (mao2022, lin2025) need a vertex-budget override. With HEAD configs at the
  default budget, both fail with `mesh: vertex budget exceeded` (HEAD and HYB alike). DevLog-024 does not say so.
- S3.3 table sign: the values equal (perturbation - FD)/FD. I reproduced mao2022 and lin2025 at 20/10/5/2.5 nm with
  the opposite sign under (FD - pert)/pert. Define the sign in the header.
- The frozen engine, configs and `baseline.json` cited in DevLog-024 lived in the shared session scratchpad and no
  longer exist. Regenerate a baseline with `bench.mjs --src <HEAD worktree>/engine/src --configs <HEAD copies>
  --write-baseline`, as done here.

### P7 (note; owner L-PARAM): P2 consumers

- The P2 path is opt-in only; no config key reaches it.
- For P2, `es.grad` is the centroid gradient. Once wired, the EO overlap must sample `gradientAt` (already requested in DevLog-024).
- The P2 charge/energy agreement (1.2e-13 to 2.9e-13 on mao2022/lin2025) is a Galerkin identity, not an accuracy check.

## Checks that passed (evidence)

### 1. Linear algebra (HYB / live sparse.mjs)

- **AMD permutations.** `amdOrder` returned a valid permutation on all 31 patterns:
  - n = 0, 1, 2, three isolated nodes, a 50-node path, two disconnected 20-node paths, a 400-node star (dense row);
  - 300 nodes with 3 dense rows, complete K30, 20 random graphs (n = 14-253), and a 15x12 triangle-mesh pattern.
- **Factor and solve.** For relax true and false, the factor and solve were tested on weighted Laplacian + diagonal
  matrices (SPD) against dense Gaussian elimination.
  - Worst ||Ax - b||/||b|| was 3.0e-14 (complete30, relax false).
  - Worst max|x - x_dense|/max|x_dense| was 3.4e-14.
- **Indefinite input.** Four matrices (femgrid, rand3, path50, star400) were shifted by lambda_min(1 +/- d), with
  d = 1e-2 ... 1e-12 and lambda_min from inertia bisection.
  - Every shift above lambda_min returned `ok = false`.
  - Every shift below returned `ok = true`.
  - `solve` after a failure throws.
- **Symbolic reuse on the same pattern.** With new values: relres 5.1e-16, bitwise equal to a fresh analysis.
- **Multi-RHS.** `solveNumericMulti` (q = 5) is bitwise equal to 5 single solves, and `outs` is honoured.
- **Real meshes.** The bench solves 9 cases on real meshes (33k-49k ES nodes) with every unchanged numeric leaf
  within 3.8e-14 of the up-looking/ND HEAD engine.

### 2. Eigen solver

- **Mode ordering vs HEAD.** HEAD vs HYB, `numModes: 2`, on all 26 HEAD configs whose optical stage runs:
  - Mode 0 n_eff max rel diff 4.2e-15. Mode 1 max 1.1e-11 (wang2022).
  - All converged and mode ordering is identical.
- **Configs that do not solve.** They fail identically in both engines:
  - 12 fail at parse ("RF permittivity is required").
  - chen2022 rejects metal in the optical window.
  - lin2026a has its dispersion anchor out of range.
- **Shift safety.** `factor()` of A - sigma B at sigma = theta0(1 -/+ d), d = 1e-4 ... 1e-13, on 6 real operators
  (mao2022, lin2025, wang2022, li2022b, xue2026 in form E; lin2025 TM in form H; nf 2,026-30,864):
  - It always succeeds below theta0 and always fails above it.
  - Accepted shifts therefore stay below the spectrum; the shift rule keeps sigma strictly inside (sigma_old, theta0).
- **Eigenvector accuracy.** Max |psi - psi_ref| against a HEAD reference at tol 1e-16 and 600 iterations, single-mode
  solves:

  | Config | HEAD | new |
  |---|---|---|
  | mao2022 | 1.35e-6 | 2.3e-13 |
  | lin2025 | 8.3e-8 | 1.7e-12 |
  | valdez2023a | 4.1e-7 | 2.4e-12 |

  - The new solver is more accurate.
  - Its `boundaryMarginFraction` matches the reference to 9 significant digits.
  - This justifies the documented 1e-7 bench tolerance.

### 3. Group index by perturbation

- **Derivation.** I derived theta' = x^T(A' - theta B')x / x^T B x independently, with theta = -beta^2,
  ng = -(lambda/k0) dbeta/dlambda and dneff/dlambda = (neff - ng)/lambda.
  - Form E: A' = -(d(k0^2)/dlambda n^2 + k0^2 dn^2/dlambda) M, B' = 0.
  - Form H: A' = S[d(1/n_z^2)/dlambda] - d(k0^2)/dlambda M, B' = M[d(1/n_y^2)/dlambda].
  - The code (optics.mjs `modeLambdaDerivative`) matches term by term, including excluded triangles and the eps_zz term.
- **Numerical check.** (FD - pert)/pert on the same mesh, FD with tol 1e-14:

  | Case | form | ng (pert) | 20 nm | 10 nm | 5 nm | 2.5 nm | 1.25 nm |
  |---|---|---|---|---|---|---|---|
  | slab TE const n | E | 2.033845484 | -1.94e-6 | -4.85e-7 | -1.21e-7 | -3.03e-8 | -7.58e-9 |
  | slab TM const n | H | 2.069556764 | -7.29e-6 | -1.82e-6 | -4.56e-7 | -1.14e-7 | -2.85e-8 |
  | slab TE LN x-cut (Zelmon) | E | 2.230239838 | 7.23e-7 | 1.81e-7 | 4.50e-8 | 1.11e-8 | 2.64e-9 |
  | slab TM LN z-cut (n_y = n_e, n_z = n_o, both dispersive) | H | 2.297583785 | -6.66e-6 | -1.67e-6 | -4.17e-7 | -1.04e-7 | -2.62e-8 |
  | mao2022 TE | E | 2.611330091 | 3.88e-5 | 9.70e-6 | 2.42e-6 | 6.06e-7 | 1.51e-7 |
  | mao2022 TM | H | 2.413298120 | 5.11e-7 | 1.27e-7 | 3.17e-8 | 7.76e-9 | 1.79e-9 |
  | lin2025 TE | E | 2.220558180 | -1.88e-6 | -4.69e-7 | -1.17e-7 | -2.93e-8 | -7.34e-9 |
  | lin2025 TM | H | 2.283453717 | -8.95e-6 | -2.24e-6 | -5.59e-7 | -1.40e-7 | -3.50e-8 |

  - Successive ratios are 3.98-4.08 in every case, plus two last steps at 4.21 and 4.33 near the noise floor.
  - So FD converges as delta^2 onto the perturbation value, including the anisotropic dispersive eps_zz case.

### 4. P2 electrostatics

- **Single triangle.** Anisotropic C with cxy = -0.7: max |K - K_ref|/max|K| = 8.5e-12 against an independent
  7-point quadrature with FD basis gradients (the residual is the FD step). Row sums are 1.2e-15.
- **Anisotropic exactness.** Off-diagonal C = [[2, 0.5], [0.5, 1]], exact quadratic solution, P2 on a jittered mesh:
  - Nodal error 2.9e-15.
  - Energy rel error 2.0e-15.
  - `gradientAt` error 3.7e-14 at off-centroid points.
- **Convergence.** Smooth anisotropic problem, phi = exp(pi x/sqrt a) sin(pi y/sqrt b), a = 2, b = 0.5, unit square,
  m = 8/16/32/64:
  - P2 energy error rates 3.75, 3.94, 3.99 (h^4); P2 field L2 rates 1.98, 1.99, 2.00 (h^2).
  - P1 energy 2.22, 2.06, 1.94; P1 field 1.00.
- **DevLog values.** mao2022/lin2025 C' and Z0 at P1 s1 and P2 s4/s2.8/s2 reproduce the DevLog S3.9 values to all
  printed digits.
  - Example: mao2022 P2 s2.8 gives 186.621 pF/m, 42.068 ohm.

### 5. Mesher identity

- 28/28 ES meshes and 28/28 optical meshes are bitwise identical HEAD vs HYB (sha256 of x, y, tri).
- These were all HEAD configs that mesh, for example arabjuneghani2022 26,759 nodes, chen2022 51,643 and liu2025b 55,892.
- ES mesh time on the 28 configs: 143-886 ms (HEAD) vs 55-261 ms (HYB).

### 6. Bench

- My own HEAD baseline (3 repeats) vs HYB (3 repeats), same HEAD inputs: regression "ok" on all 9 cases (largest
  unchanged-leaf differences under P4).
- Median wall ms (HEAD -> HYB):

  | Case | HEAD | HYB | Speedup |
  |---|---|---|---|
  | mao2022-es | 731 | 302 | 2.4x |
  | mao2022-es-opt | 902 | 297 | 3.0x |
  | arabjuneghani2022-es | 875 | 167 | 5.2x |
  | arabjuneghani2022-es-opt | 1095 | 231 | 4.7x |
  | chen2022-unloaded-es | 2077 | 314 | 6.6x |
  | lin2025-es | 656 | 234 | 2.8x |
  | lin2025-es-opt | 1060 | 349 | 3.0x |
  | gsg-eo-rf | 207 | 166 | 1.2x |
  | mao2022-wheeler | 2117 | 685 | 3.1x |

- These match the DevLog-024 final table within about 10 %.
- nnz(L) matches the DevLog values (976,007; 694,769; 1,342,121; 1,014,590; 2,203).
- `npm test` equivalent on the CUR snapshot (`node --test --test-concurrency=1 tests/*.test.mjs`): 188 tests, 187 pass,
  0 fail, 1 todo (D5). The three perf test files alone: 13/13 pass.

### 7. State and portability

- **Run order.** In CUR, mao2022 (optical_mode), lin2025 (optical_mode) and gsg-eo-rf (eo_overlap, rf_line) were run
  in order ABC with the timing sink on, in order CBA, and each in its own process.
  - All 225 numeric leaves were bitwise identical, and the non-numeric JSON was identical.
- **Bench repeats.** Bench repeats were deterministic (no NONDETERMINISTIC flag).
- **No Node-only APIs.** The five lane files contain no `node:` imports, `process`, `Buffer` or `require`.
- **Module-level state.** The only mutable module state is the opt-in `timingSink` (null by default).

### 8. Memory

- Peak RSS (`/usr/bin/time -l`), HEAD -> HYB:

  | Case | HEAD | HYB |
  |---|---|---|
  | chen2022 unloaded ES, scale 1 (49,281 nodes) | 274 MB | 199 MB |
  | chen2022 unloaded ES, scale 0.8 (70,463 nodes) | 356 MB | 259 MB |
  | mao2022 ES + optical, scale 0.7 (65,070 nodes) | 403 MB | 286 MB |
  | liu2025b ES + optical (55,892 nodes) | 410 MB | 238 MB |

  - The multifrontal factor uses less memory than HEAD because AMD reduces fill.
- **Long sweep.** I ran renaud2023 `gap` + `wavelength` sweep points 36 times in one process with one shared cache and
  forced GC after each point.
  - heapUsed + arrayBuffers cycled 51-79 MB with no growth.
  - The caches are bounded: `model._sym` lives on each model, `cache.es` holds one solution, and `pat._triSlots`
    lives on each pattern.

## Not checked

- WASM micro-benchmark (S3.10).
- The DevLog S3.5 ordering-study and S3.6 kernel tables at mesh scale 0.5. They need a budget override and their
  inputs are gone.
- Browser execution of the engine. I inspected for Node-only APIs only.
