---
title: Solver performance (lane L-PERF, DevLog-023 S0 + S3)
date: 2026-10-14
status: ready_for_review (round 2)
owner: L-PERF
scope: engine/src/{sparse,mesh,fem,geometry,electrostatics,optics,recess}.mjs, engine/bench/, engine/tests/perf-*.test.mjs
---

# DevLog-024: solver performance (L-PERF)

Parent: DevLog-023 (roadmap; tasks S0 and S3; ownership O4). No git state changes by this lane.

## Plan (written before implementation, 2026-10-14 23:10 PDT)

Order (measure after each step; `cd engine && npm test` green after each step):

1. S0 timing. Every solver function attaches a `timing` object to what it returns (fields below). A module-level
   opt-in sink in `sparse.mjs` (`timingSink.records = []`) also collects each record, so the bench sees phases of
   solves started from `run.mjs`/`stages.mjs` without those files changing. No result value changes.
2. S0 bench. `engine/bench/bench.mjs` imports the engine from a selectable source directory (`--src`), runs a fixed
   case set N times, reports medians, writes `logs/bench-YYYYMMDDTHHMM.jsonl`, and compares every numeric result leaf
   with a stored baseline (relative 1e-9; per-metric tolerance only for documented method changes). The baseline is
   captured from a frozen copy of the pre-change engine and configs in the session scratchpad (other lanes edit
   `run/stages/config/materials` and `sims/*` concurrently; regression runs use the frozen copies of those files plus
   this lane's live files, so a difference is attributable to this lane).
3. Group index by first-order perturbation (Hellmann-Feynman on the discrete pencil, with material dispersion),
   one eigen solve instead of three. FD path stays (`groupIndex(..., {method: 'finite_difference'})`) as the oracle.
4. Mesh sizing acceleration (spatial index for distance-to-source), `buildPattern` by counting sort into typed arrays,
   `assemble` without per-entry binary search, no array-of-arrays or `Math.min(...big)` in hot paths.
5. Ordering study: coordinate-bisection ND (current) vs own AMD vs improved ND, nnz(L) and time at 10k-200k nodes.
6. Supernodal numeric Cholesky with dense kernels in typed arrays; symbolic analysis reused across factorizations.
7. Eigen solver: warm starts, subspace size, convergence criteria, no redundant factorizations.
8. Wheeler/recess: share work where topology allows.
9. P2 Lagrange elements: accuracy-per-time vs P1 on the analytic tests; option only if it wins.
10. WASM gate (DevLog-023 D4): micro-benchmark only; proposal, no toolchain without recorded justification.

### Timing object contract (S0)

All times in ms (`performance.now()` deltas). Fields present where they apply.

| Producer | Fields |
|---|---|
| `SparseCholesky` / numeric factor (`chol.timing`) | `n`, `nnzA` (lower incl. diagonal), `nnzL`, `fill` (= nnzL / nnzA), `flops`, `nsuper`, `symbolicReused`, `ordering_ms`, `symbolic_ms`, `factor_ms` (cumulative), `nFactor`, `solve_ms` (cumulative), `nSolve` |
| `solveElectrostatics(...).timing` | `mesh_ms`, `geometry_ms`, `pattern_ms`, `prep_ms`, `assemble_ms`, `restrict_ms`, `ordering_ms`, `symbolic_ms`, `factor_ms`, `nFactor`, `solve_ms`, `nSolve`, `post_ms`, `total_ms`, `nNodes`, `nTris`, `nFree`, `nDof`, `elementOrder`, `nnzA`, `nnzL`, `fill`, `flops`, `nsuper`, `mesh` (mesher sub-phases: `pslg_ms`, `insert_ms`, `segments_ms`, `refine_ms`, `classify_ms`, `extract_ms`; counters `nSizeAt`, `nClassify`, `nSources`, `nInsert`, `nSegSplits`) |
| `buildOpticalModel(...).timing` | `mesh_ms`, `geometry_ms`, `pattern_ms`, `total_ms`, `nNodes`, `nTris`, `mesh` |
| `solveModesAt(...).timing` | `coefficients_ms`, `assemble_ms`, `restrict_ms`, `ordering_ms`, `symbolicReused`, `symbolic_ms`, `factor_ms`, `nFactor`, `solve_ms`, `nSolve`, `matvec_ms`, `nMatVec`, `eigen_ms`, `rayleighRitz_ms`, `iterations`, `subspace`, `eigenMethod`, `nShift`, `residual` (per requested mode), `post_ms`, `total_ms`, `nFree`, `nnzA`, `nnzL`, `fill`, `flops`, `nsuper` |
| `groupIndex(...).timing` | `method`, `total_ms`, `nEigenSolves`, per-solve `solves: [timing]` |
| Wheeler (via `solveElectrostatics(..., {vacuumOnly})`) | same as electrostatics |

Sink records: `{kind: 'electrostatics' | 'electrostatics_vacuum' | 'optical_model' | 'modes' | 'group_index', ...timing}`.

### Sparse API (final, 2026-10-14; `engine/src/sparse.mjs`)

- `amdOrder(pat) -> perm` (new -> old): own approximate minimum degree (quotient graph, element absorption,
  aggressive absorption, supervariables, dense-row removal, assembly-tree postorder).
- `analyze(pat, {perm} | {ordering: 'amd' (default) | 'nd', x, y}, {relax = true}) -> sym`: pattern only, values
  never read. Fields: `n, perm, pinv` (perm = seed order followed by an etree postorder; same fill), `parent` (etree),
  `colCount`, `nnzL`, `nnzA` (lower incl. diagonal), `fill`, `flops` (sum colCount^2), `lowerP/lowerI/lowerSrc` (lower
  CSC of P A P^T with the CSR slot of each entry), `nsuper, superStart, colSuper, superParent, childHead/childNext`
  (children linked in decreasing order), `Sp/Si` (sorted supernode row structures; the first ncols rows are the
  supernode's own columns), `Lxp` (offset of each m x ncols column-major dense block), `nnzLStored`, `maxFront`,
  `timing {ordering_ms, symbolic_ms}`. Relaxed amalgamation (CHOLMOD-style thresholds) adds explicit zeros.
- `factorNumeric(sym, values, num?) -> num` (multifrontal LL^T; `num.ok`), `solveNumeric(num, b, out?)`,
  `solveNumericMulti(num, bs, outs?)`.
- `SparseCholesky(pat, perm?, {sym, ordering, x, y})` with `factor`, `solve`, `solveMany`, `nnzL`, `timing`, `sym`;
  `UpLookingCholesky(pat, perm)` = the pre-2026-10-14 class (oracle).
- `buildPattern(n, tri)`, `buildElementPattern(n, elem, k)`, `triangleSlots(pat, tri)`, `elementSlots(pat, elem, k)`.
- Unchanged: `ndOrder`, `entryIndex`, `matVec`, `jacobiEigen`, `cholesky(pat, val)` (now AMD + supernodal).

L-VEC (`vector-mode.mjs`, `ldlt.mjs`) already consumes `analyze` (supernodal fields) for its LDL^T.

## Round 2 plan (2026-10-15 00:11 PDT; orchestrator brief after audit `DevLog/audits/simulator-l-perf-audit-2026-10-14.md`)

1. Mesher conformity bug (DevLog-025 finding): reproduce, root-cause (segment recovery / encroachment / Steiner
   points / classification), fix in `mesh.mjs`, add a conformity check (region mesh area = clipped polygon area to
   round-off; no triangle straddles an interface) as a test and a cheap runtime check in `meshDomain`. Survey every
   `sims/*/config.yaml` and `validation/cases/*.yaml` before and after: worst relative region-area error per config,
   change in C', n_eff, VpiL. Meshes without the defect should stay bitwise identical.
2. Wheeler recess `vertex budget exceeded` (rf_line on li2026aa, lin2025, qi2024): root-cause, fix in my files or
   write the exact stages.mjs request.
3. Audit fixes P1 (pattern fingerprint in `sym`, checked by SparseCholesky / factorNumeric; solves require num.ok),
   P3 (per-mode residual convergence flags, no silent bypass; shift cap; S3.7 table), P4 (bench compares strings and
   booleans; ng exemption only for computed ng), P5 (analyze n = 0; nd needs x, y), P6 (sparse.mjs header, budget
   note, sign convention, baseline regeneration from HEAD via `git archive`).
4. Scalar optics P2 only if cheap; otherwise documented as skipped.

Baseline for round 2: HEAD engine + configs extracted read-only with `git archive HEAD engine sims` into a private
scratch folder (the round-1 scratch baseline is gone, audit P6).

## TODO

- [x] S0.1 timing objects + sink
- [x] S0.2 bench, frozen baseline, baseline numbers recorded here
- [x] S3.3 ng by perturbation (gate: FD agreement 1e-4 on slab and mao2022)
- [x] S3.4 mesh sizing bound, buildPattern counting sort, assemble without binary search
- [x] S3.5 ordering study (ND vs AMD vs improved ND): AMD
- [x] S3.6 supernodal numeric Cholesky + symbolic reuse (target >= 3x on factor phase)
- [x] S3.7 eigen solver: adaptive shift, block solves, no A products, residual criterion
- [x] S3.8 Wheeler/recess: no sharing possible without a topology-preserving recess (proposal below)
- [x] S3.9 P2 evaluation: P2 wins; `elementOrder: 2` option in `solveElectrostatics` (default unchanged)
- [x] S3.10 WASM gate measurement (proposal only, no WASM in the engine)
- [x] final before/after table
- [x] fresh-context audit (orchestrator, O5): `DevLog/audits/simulator-l-perf-audit-2026-10-14.md`, findings P1-P7
- [x] R2.1 mesher conformity fix + check + survey
- [x] R2.2 Wheeler recess vertex budget
- [x] R2.3 audit fixes P1, P3, P4, P5, P6
- [x] R2.4 scalar optics P2: skipped (reason in R2.4)

## Progress log

- 2026-10-14 23:04 PDT Frozen copies of the pre-change engine (`src`, `data`, `schema`, `cli.mjs`) and the five bench
  inputs (mao2022, arabjuneghani2022, chen2022, lin2025 configs, `gsg-eo-rf.yaml` fixture) saved to the session
  scratchpad. `npm test` before any change: 134 tests, 133 pass, 1 todo (D5), 4.7 s (Node 23.7.0, Apple M4 Pro, 12 cores).
- 2026-10-14 23:09 PDT S0 timing objects and sink in place (no result change: bench max rel 0 vs frozen baseline);
  `engine/bench/bench.mjs` written; frozen baseline results stored in the scratchpad (`baseline.json`).
- 2026-10-14 23:15 PDT S3.3 perturbation group index + `tests/perf-ng.test.mjs` (5 tests). npm test 139/138 pass/1 todo.
- 2026-10-14 23:18 PDT S3.4 mesh/pattern/assembly; regression identical.
- 2026-10-14 23:22 PDT S3.5 ordering study; own AMD implemented.
- 2026-10-14 23:24 PDT S3.6 supernodal multifrontal factor integrated (ES, vacuum, optics); npm test 139/138/1 todo;
  bench regression within 5e-12.
- 2026-10-14 23:30 PDT S3.7 eigen solver (shifted method, block solves, residual criterion); tests 174/173/1 todo
  (two L-VEC vector-mode tests failed transiently while L-VEC was editing its files; they pass in the later runs).
- 2026-10-14 23:36 PDT Mesher round 2 (grid of candidate sources, commit scratch arrays, subsegment prefilter): meshes
  identical, 2.4-2.7x vs frozen. Kernel round 2 (paired panel columns, paired Schur targets, solve with dense
  accumulators). Coordinator limits applied from here on: one `nice -n 10` Node process, 1.5 GB heap, meshes <= 150k.
- 2026-10-14 23:42 PDT S3.9 P2 study and `elementOrder: 2` option + `tests/perf-p2.test.mjs` (3 tests); S3.10 WASM gate.
- 2026-10-14 23:48 PDT Final bench (5 repeats, frozen inputs) and frozen-engine re-run under the same machine load;
  npm test (sequential) 187 tests, 186 pass, 0 fail, 1 todo (D5).
- 2026-10-15 00:11 PDT Round 2 started (audit P1-P7, DevLog-025 mesher finding); plan written; HEAD extracted with
  `git archive` into a private scratch folder.
- 2026-10-15 00:23 PDT R2.1-R2.3 done; survey, HEAD-baseline bench regression; npm test (sequential) 205 tests, 203 pass, 0 fail,
  1 todo (D5), plus the round 2 additions in perf-mesh / perf-ng / perf-sparse.
- 2026-10-15 08:43 PDT Round 3: bench F5 fixes (yaml-edit overrides, per-case error capture, pinned cases, renaud2023 vector case); one pinned run recorded.

## Results

### Baseline (frozen pre-change engine, 2026-10-14 23:09 PDT; median of 5 in-process runs, Node 23.7.0, Apple M4 Pro)

Wall time per `runCrossSection` call (bench JSONL `logs/bench-20261014T2309.jsonl`; phases from the S0 timing records,
which change no result). ES = electrostatics (two factorizations: dielectric and vacuum), opt = scalar optical mode with
FD group index (three eigen solves).

| Case | Wall ms | ES mesh | ES ordering | ES symbolic | ES factor (2x) | ES solve | Modes total | nNodes | nnz(L) | fill |
|---|---|---|---|---|---|---|---|---|---|---|
| mao2022-es | 614 | 224 | 68 | 29 | 234 | 6 | - | 33,034 | 1,757,424 | 13.7 |
| mao2022-es-opt | 834 | 218 | 67 | 28 | 216 | 6 | 231 (3 solves, 132 it) | 33,034 | 1,757,424 | 13.7 |
| arabjuneghani2022-es | 853 | 198 | 47 | 31 | 532 | 7 | - | 26,759 | 2,142,136 | 20.9 |
| arabjuneghani2022-es-opt | 1015 | 193 | 45 | 31 | 502 | 7 | 169 (3, 38 it) | 26,759 | 2,142,136 | 20.9 |
| chen2022-unloaded-es | 2025 | 366 | 97 | 63 | 1409 | 15 | - | 49,281 | 4,418,333 | 23.5 |
| lin2025-es | 625 | 273 | 61 | 30 | 195 | 6 | - | 39,405 | 1,848,453 | 12.5 |
| lin2025-es-opt | 968 | 276 | 60 | 31 | 186 | 6 | 309 (3, 31 it) | 39,405 | 1,848,453 | 12.5 |
| gsg-eo-rf (eo_overlap + rf_line) | 191 | 3 | 0.5 | 0.1 | 0.1 | 0 | 116 (2 arms, 16 it) | 350 | 3,744 | 3.4 |
| mao2022-wheeler (ES + rf_line, bench variant) | 2026 | 226 + 708 (3 recessed) | 68 + 111 | 28 + 45 | 223 + 457 | 6 + 10 | - | 33,034 | 1,757,424 | 13.7 |

Cold (first in-process run) is within 10 % of the median for every case. The CLI wall time quoted in DevLog-023
(2.62 s for mao2022 ES + optical) includes Node start-up, module load and JSON printing.

### S3.3 group index by perturbation (2026-10-14 23:15 PDT)

`groupIndex` default method `perturbation` (one eigen solve; `method: 'finite_difference'` keeps the old path).
Derivation in the `groupIndex` JSDoc: theta' = x^T (A' - theta B') x / x^T B x on the discrete pencil, ng =
-(lambda / k0) d(beta)/d(lambda); material slope by a +-1e-4 lambda central difference of the closed-form dispersion.
FD-vs-perturbation (same mesh) shows the expected O(delta^2) convergence of FD onto the perturbation value. Table
entries are (ng_perturbation - ng_FD) / ng_FD (sign defined after audit P6; the audit table uses the opposite sign):

| Config | ng (perturbation) | FD delta 20 nm | 10 nm (engine before) | 5 nm | 2.5 nm |
|---|---|---|---|---|---|
| mao2022 (TE) | 2.6113301 | -3.9e-5 rel | -9.7e-6 | -2.4e-6 | -6.1e-7 |
| arabjuneghani2022 (TE) | 2.2312369 | 1.0e-7 | 2.5e-8 | 6.4e-9 | 1.8e-9 |
| lin2025 (TE) | 2.2205582 | 1.9e-6 | 4.7e-7 | 1.2e-7 | 2.9e-8 |

Gate test `engine/tests/perf-ng.test.mjs` (TE/TM slab constant index, TE/TM slab with library LN dispersion, mao2022):
all agree with FD (delta 10 nm) within 1e-4 relative. The bench tolerance for `ng_opt` (and the ng target rows) is
1e-4 relative; every other leaf stays at 1e-9.

### S3.4 mesh sizing, pattern, assembly (2026-10-14 23:18 PDT)

- `sizeAt`: sources visited in ascending h0 with a bounding-box lower bound (skip a source that cannot beat the running
  minimum, relative margin 1e-9; break once h0 >= h); `classify` called once per triangle evaluation (it was called
  twice) and not at all inside `sizeAt` when no per-region max edge exists. Identical sizes, identical meshes.
- Heap swap without array destructuring (identical order).
- `buildPattern`: counting sort into one typed buffer, per-row insertion sort and in-place dedupe (no array of arrays).
- `assemble`: per-triangle CSR slots computed once per pattern (`triangleSlots`, cached on the pattern) instead of 9
  binary searches per triangle per assembly; same summation order.
- Result: mesher (mao2022 ES) 224 -> 131 ms; bench regression identical (max rel 0).

### S3.5 ordering study (2026-10-14 23:22 PDT)

Free-node ES stiffness matrices of the bench inputs at mesh scale 2, 1 and 0.5 (13k-133k unknowns). `flops` = sum of
squared column counts of L. Times are ordering only (ms, single run).

| Matrix | n | ND current (coordinate bisection, leaf 48) | AMD (own) | ND improved (4 directions, separator sweep, MD leaves) |
|---|---|---|---|---|
| mao2022 s2 | 13,200 | L 0.653M, 76M fl, 15 ms | L 0.312M, 19M fl, 22 ms | L 0.336M, 20M fl, 46 ms |
| arabjuneghani2022 s2 | 13,227 | 1.107M, 366M, 12 | 0.281M, 14M, 15 | 0.310M, 16M, 33 |
| arabjuneghani2022 s1 | 25,897 | 2.142M, 763M, 22 | 0.695M, 61M, 12 | 0.737M, 59M, 83 |
| mao2022 s1 | 32,315 | 1.757M, 279M, 37 | 0.976M, 106M, 17 | 0.996M, 96M, 100 |
| lin2025 s1 | 37,373 | 1.848M, 247M, 31 | 1.015M, 101M, 19 | 1.046M, 90M, 119 |
| chen2022 unloaded s1 | 47,513 | 4.418M, 2114M, 50 | 1.342M, 143M, 18 | 1.368M, 120M, 163 |
| mao2022 s0.5 | 122,317 | 7.839M, 2218M, 168 | 4.731M, 959M, 47 | 4.692M, 812M, 439 |
| lin2025 s0.5 | 132,630 | 7.662M, 1742M, 146 | 4.737M, 885M, 53 | 4.659M, 700M, 486 |

Decision: AMD for every size. It has the smallest nnz(L) up to ~40k unknowns and within 1 % above that; the improved
ND saves 10-20 % of the flops at >100k but its ordering time (0.4-0.5 s in JS) exceeds the factor time it saves (the
supernodal factor runs at ~2 G multiply-adds/s, see S3.6). The coordinate-bisection ND (`ndOrder`) stays exported
(L-VEC imports it) but no engine path uses it. Its fill came mostly from unordered 48-node leaves and from median
cuts through the finest mesh region.

### S3.6 supernodal multifrontal Cholesky (2026-10-14 23:24 PDT)

`analyze` (ordering, etree postorder, Gilbert-Ng-Peyton column counts, fundamental supernodes plus relaxed
amalgamation, supernode row structures) and `factorNumeric` (multifrontal over the supernodal tree, dense
column-major fronts, panel factorization left-looking within the panel, Schur update with 4-column unrolling,
update-matrix stack) and `solveNumeric`. `SparseCholesky` keeps its API (`new SparseCholesky(pat, perm?, {sym})`,
`factor`, `solve`, `nnzL`, `timing`); the up-looking class is kept as `UpLookingCholesky` (oracle). The electrostatic
vacuum solve reuses the dielectric solve's symbolic analysis; optical solves cache it on the model (keyed by the free-node
mask) and in `warm`.

Kernel comparison on the dumped matrices (single factorization, median of 3; old = ND + up-looking, new = AMD +
supernodal; residual ||Ax - b|| / ||b||; dx = max |x_new - x_old| / max |x_old|):

| Matrix | n | old factor ms | new factor ms | speedup | new analyze ms | old / new residual | dx |
|---|---|---|---|---|---|---|---|
| mao2022 s2 | 13,200 | 32.7 | 7.3-14.2 | 2.3-4.5x | 22.8 | 2.7e-13 / 1.2e-13 | 1.8e-13 |
| arabjuneghani2022 s2 | 13,227 | 246 | 7.2 | 34x | 15.1 | 4.6e-13 / 1.7e-13 | 2.3e-13 |
| arabjuneghani2022 s1 | 25,897 | 285 | 24.0 | 12x | 23.4 | 1.9e-12 / 7.7e-13 | 7.4e-13 |
| mao2022 s1 | 32,315 | 121 | 39.1 | 3.1x | 27.7 | 1.1e-12 / 5.6e-13 | 3.5e-13 |
| lin2025 s1 | 37,373 | 111 | 35.3 | 3.2x | 32.5 | 1.3e-12 / 6.7e-13 | 2.0e-13 |
| chen2022 unloaded s1 | 47,513 | 811 | 52.7 | 15x | 48.7 | 2.9e-11 / 7.7e-12 | 1.8e-11 |
| mao2022 s0.5 | 122,317 | 923 | 249 | 3.7x | 165 | 5.9e-12 / 2.5e-12 | 2.3e-12 |
| lin2025 s0.5 | 132,630 | 637 | 224 | 2.8x | 132 | 5.5e-12 / 2.8e-12 | 8.1e-13 |

Bench regression after S3.6 (frozen inputs and non-L-PERF files): every leaf within 5e-12 relative of the baseline
(largest: Wheeler step-check spread 4.8e-12) except `electrostatics.energyChargeRelativeError`, whose value is itself a
round-off quantity (1e-16 to 3e-12); the bench compares it with an absolute tolerance of 1e-10.

### S3.6 kernel round 2 (2026-10-14 23:36 PDT)

Panel columns are factored in pairs (shared 4-column groups) and the Schur update writes two target columns per pass
over the panel; per entry the operation sequence is unchanged (bitwise-identical factors). Triangular solves use a
dense accumulator for the rows below each supernode (forward) and one gather (backward), two-column / four-sum
unrolling. Same matrices as above, single factorization, under concurrent load from four other lanes:
mao2022 s1 39 -> 22-32 ms, chen2022 s1 53 -> 30 ms, lin2025 s0.5 224 -> 146-162 ms; one solve of mao2022 s1
2.7 -> 2.3 ms. Line profile of `factorNumeric` (lin2025 s0.5): dense kernels ~75 %, extend-add ~6 %, front zeroing
~5 %, update-matrix stack copy ~4 %.

### S3.7 eigen solver (2026-10-14 23:30 PDT)

`solveModesAt` option `eigenMethod`: `'shifted'` (default) or `'legacy'` (the previous loop, kept for comparison).
Shifted: Y = (A - sigma B)^-1 B X with one multi-RHS solve per iteration; Rayleigh-Ritz uses Y^T A Y = Y^T B X +
sigma Y^T B Y and B X_new = (B Y) V (no A or extra B products); from iteration 3, once the requested Ritz values
changed less than 1e-2, the shift moves to theta_0 - 0.15 (theta_0 - sigma) while that still matters (convergence
ratio of the slowest requested mode > 0.05), at most 8 times; a shift is accepted only when the Cholesky of
A - sigma B succeeds (Ritz values are upper bounds, so a successful factorization keeps sigma below the spectrum), the
previous factorization is kept in a second numeric object (no refactor on rejection; after a rejection the step grows
x3, at most 3 rejections). Convergence: the eigenvalue criterion as before plus eigenvector residual
||A x - theta B x|| / (|theta| ||B x||) < resTol = 1e-12 for the first `residualModes` modes (default all requested;
the FD group-index path checks only the target mode); eigenvalues stable for 10 iterations are accepted as before.
The perturbation group index solves only `modeIndex + 1` modes (the FD path tracked one more).

| Config (1 requested mode unless noted) | legacy iterations / residual | shifted iterations / residual (round 2 code, 2026-10-15) |
|---|---|---|
| mao2022 TE (2 modes) | 73 / 1.3e-14, 9.8e-7 | 68 / 1.0e-14, 6.4e-13 (2 shifts) |
| mao2022 TE | 53 / 1.2e-6 | 26 / 4.5e-13 |
| arabjuneghani2022 TE | 15 / 1.3e-8 | 14 / 3.3e-13 (2 modes: 27 / 2.1e-14, 8.5e-13) |
| lin2025 TE | 14 / 9.1e-9 | 12 / 5.0e-13 (2 modes: 16 / 2.2e-14, 2.2e-13) |
| wang2022 TE | - | 20 / 5.0e-13 (2 modes: 197 / 2.6e-14, 9.5e-13; 120 iterations, the former cap, were not enough) |

Round 1 rows (59 iterations for mao2022 2 modes) were measured before the 10-iteration fallback was in place and were
stale (audit P3); the round 2 code removes that fallback (see R2.3).

The legacy eigenvectors were converged only to ~1e-8 in some cases: lin2025's `boundaryMarginFraction` (an integral of
psi^2) differs by 3.6e-8 relative between the legacy default and a tol 1e-15, 400-iteration reference; the shifted
result differs from that reference by 2.5e-10. The bench therefore compares `boundaryMarginFraction` with a documented
tolerance of 1e-7 (method change); all EO overlap leaves (dn/V, phase/V/m, VpiL) of the gsg fixture stay within 2.2e-14.

### Mesher round 2 (2026-10-14 23:36 PDT)

- `sizeAt`: lazily built 48 x 48 grid of candidate sources per cell (a source is dropped from a cell when its lower
  bound over the cell exceeds the cell's upper bound of the minimum; relative margin 1e-9).
- `commit`: per-vertex stamped scratch arrays instead of two Maps per insertion (same last-write semantics).
- Subsegment lookups (`seg.has`, `seen` sets) skipped unless both edge endpoints are subsegment vertices (an edge can
  only be a subsegment then).
- A/B against the frozen mesher, same process, alternating runs: mao2022 287 -> 117 ms, lin2025 367 -> 137,
  chen2022 unloaded 511 -> 202, arabjuneghani2022 250 -> 106; every mesh bitwise identical (x, y, triangles).

### S3.8 Wheeler recessed solves

The three recessed sections (0.25, 0.5, 1 x delta/2) are new geometries: the recess moves electrode faces into the
metal, where the ES mesh has no triangles, so no pattern, ordering or symbolic analysis can be shared between them or
with the nominal mesh. They benefit from the mesher (2.5x) and factor speedups only: mao2022-wheeler vacuum solves
1423 -> 483 ms. Proposal (method change, not implemented): mesh the nominal section once with conductor triangles kept,
recess by moving the face nodes inward (same topology) so all four vacuum solves share one pattern and one symbolic
analysis; this also removes remeshing noise from the small difference L'_rec - L'_nom that the Wheeler rule takes.
Needs `stages.mjs` (L-PARAM) and an agreed validation against the remeshed result.

### S3.9 P2 Lagrange elements (2026-10-14 23:42 PDT)

`solveElectrostatics(section, {elementOrder: 2})` (default 1, unchanged): quadratic Lagrange on the same mesh
(`fem.mjs`: `p2Space`, `assembleP2`, P2 paths in `PoissonSolver` energy/gradient; edge-midpoint DOFs on electrode
boundary segments carry the electrode potential; terminal charges sum over vertex and midpoint DOFs). `es.phi` stays
per vertex; `es.phiDof`, `es.p2` hold the full solution; `gradientAt(es, t, x, y)` evaluates the linear P2 gradient at
a point (P1: the triangle gradient).

Accuracy per time (engine code, frozen inputs, `total_ms` of one `solveElectrostatics` call incl. meshing, warm JIT,
under concurrent load). The P1 scale 0.7 / 0.5 and P2 scale 1 rows need the vertex budget raised
(`geometry.mesh.max_vertices: 200000` in the study script); at the default 80,000 they fail with `mesh: vertex budget
exceeded` (audit P6). Reference C' from the P2 sequence (Richardson on the last three levels; the P1 sequence
extrapolates within 0.015 % of it): mao2022 186.48 pF/m, lin2025 ~192.05 pF/m (estimates, not analytic).

| Config | P1 scale 1 (default) | P1 scale 0.5 | P2 scale 4 | P2 scale 2.8 | P2 scale 2 |
|---|---|---|---|---|---|
| mao2022 C' (pF/m), error, ms | 186.973, 0.26 %, 236 | 186.639, 0.08 %, 857 | 186.743, 0.14 %, 147 | 186.621, 0.08 %, 179 | 186.578, 0.05 %, 262 |
| mao2022 Z0 (ohm) | 41.982 | 42.056 | 42.051 | 42.068 | 42.074 |
| lin2025 C' (pF/m), error, ms | 192.680, 0.33 %, 269 | 192.236, 0.10 %, 1049 | 192.367, 0.16 %, 184 | 192.213, 0.08 %, 225 | 192.153, 0.05 %, 306 |

Smooth manufactured problem (phi = e^(pi x) sin(pi y), unit square, Dirichlet, exact energy pi (e^(2 pi) - 1) / 2):
at 16,641 DOFs P1 energy error 5.0e-5, P2 2.8e-8; P2 converges as h^4, P1 as h^2 (study script in the scratchpad). Verdict: P2 wins clearly. At equal time P2 is
3-4x more accurate than the P1 default; at equal accuracy (0.08 %) P2 at scale 2.8 is 4.8x (mao2022) and 4.7x
(lin2025) faster than P1 at scale 0.5. Gates: `tests/perf-p2.test.mjs` (parallel plates exact for P1 and P2, energy =
charge; strip pair P2 error < 0.5 x P1 error at matched DOFs; `gradientAt` exact for a uniform field).
Not evaluated: P2 for the scalar optical mode (the eigen problem would need a P2 mass matrix and the EO overlap
interpolation of P2 psi; deferred, the vector solver is L-VEC's).

### S3.10 WASM gate (DevLog-023 D4; 2026-10-14 23:42 PDT)

Micro-benchmark (scratchpad script, not in the repo): the Schur-update inner kernel
`dst[i] -= s0[i] a0 + s1[i] a1 + s2[i] a2 + s3[i] a3` in JS (Float64Array) vs a hand-assembled WebAssembly module
(bytes written by a 60-line JS encoder; no toolchain), Node 23.7.0:

| Column length | JS (G multiply-add/s) | WASM scalar f64 | WASM SIMD f64x2 |
|---|---|---|---|
| 32 | 2.63 | 5.04 (1.9x) | 7.54 (2.9x) |
| 128 | 2.80 | 6.31 (2.3x) | 10.77 (3.8x) |
| 512 | 2.93 | 6.40 (2.2x) | 11.07 (3.8x) |

Scalar WASM results are bitwise identical to JS. The dense kernels are ~75 % of `factorNumeric` time, so the expected
whole-factorization speedup is 1 / (0.25 + 0.75 / 3.8) = 2.2x with SIMD and 1.7x with scalar WASM (estimate, not
measured end to end). Gate status: kernel > 2x (SIMD), whole factorization borderline (~2.2x estimated). Proposal for
the orchestrator / user: a SIMD kernel module (fronts allocated in WASM memory, panel + Schur loops in WASM, assembly
and extend-add in JS) generated from an in-repo JS byte encoder, so no external toolchain or dependency; worth it only if
factorization becomes the dominant phase again (after this lane it is 15-25 % of an ES run; meshing is 35-45 %).
Not implemented.

### Final before/after (2026-10-14 23:48 PDT)

Frozen inputs and frozen non-L-PERF files (hybrid tree), 5 repeats, median wall ms per `runCrossSection` call.
"Before" = the frozen engine re-run at 23:48 under the same machine load (other lanes running); log
`logs/bench-20261014T2348.jsonl`; "after" log `logs/bench-20261014T2347.jsonl`.

| Case | Before ms | After ms | Speedup | Regression vs baseline |
|---|---|---|---|---|
| mao2022-es | 668 | 266 | 2.5x | max rel 3.8e-14 |
| mao2022-es-opt | 889 | 292 | 3.0x | 3.8e-14 (ng 1e-4 tolerance: -9.7e-6) |
| arabjuneghani2022-es | 877 | 174 | 5.0x | 8.9e-15 |
| arabjuneghani2022-es-opt | 1070 | 238 | 4.5x | 8.9e-15 (ng: 2.5e-8) |
| chen2022-unloaded-es | 2097 | 323 | 6.5x | 1.4e-14 |
| lin2025-es | 703 | 232 | 3.0x | 1.3e-14 |
| lin2025-es-opt | 1008 | 346 | 2.9x | 1.3e-14 (ng: 4.7e-7; boundaryMarginFraction 3.6e-8, see S3.7) |
| gsg-eo-rf | 203 | 166 | 1.2x | 2.2e-14 |
| mao2022-wheeler | 2126 | 675 | 3.1x | 1.9e-11 (Wheeler step-check spread) |

Per phase, median ms (before = instrumented pre-optimization run 23:09, `logs/bench-20261014T2309.jsonl`; after = 23:47):

| Case | ES mesh | ES ordering | ES symbolic | ES factor (2x) | ES solve | optical model | modes total | group index, eigen iterations | Wheeler vacuum | nnz(L) |
|---|---|---|---|---|---|---|---|---|---|---|
| mao2022-es | 224 -> 97 | 68 -> 27 | 29 -> 35 (cold JIT) | 234 -> 55 | 6 -> 8 | - | - | - | - | 1,757,424 -> 976,007 |
| mao2022-es-opt | 218 -> 95 | 67 -> 14 | 28 -> 14 | 215 -> 57 | 6 -> 5 | 15 -> 11 | 231 -> 41 | FD 3 solves 132 it -> pert. 1 solve 30 it | - | same |
| arabjuneghani2022-es | 198 -> 84 | 47 -> 11 | 31 -> 8 | 532 -> 43 | 7 -> 4 | - | - | - | - | 2,142,136 -> 694,769 |
| arabjuneghani2022-es-opt | 193 -> 82 | 45 -> 11 | 31 -> 8 | 502 -> 38 | 7 -> 4 | 26 -> 18 | 169 -> 45 | 38 it -> 13 it | - | same |
| chen2022-unloaded-es | 366 -> 166 | 97 -> 20 | 63 -> 18 | 1409 -> 68 | 15 -> 7 | - | - | - | - | 4,418,333 -> 1,342,121 |
| lin2025-es | 273 -> 117 | 61 -> 16 | 30 -> 12 | 195 -> 51 | 6 -> 5 | - | - | - | - | 1,848,453 -> 1,014,590 |
| lin2025-es-opt | 276 -> 115 | 60 -> 15 | 31 -> 13 | 186 -> 50 | 6 -> 5 | 44 -> 29 | 309 -> 84 | 31 it -> 12 it | - | same |
| gsg-eo-rf | 3 -> 5 | 0.5 -> 0.1 | 0.1 -> 0.1 | 0.1 -> 0.1 | 0 | 56 -> 38 | 116 -> 105 | fixed ng; 16 it -> 20 it (2 arms) | - | 3,744 -> 2,203 |
| mao2022-wheeler | 226 -> 87 | 68 -> 13 | 28 -> 12 | 223 -> 47 | 6 -> 5 | - | - | - | 1423 -> 483 | same |

Factor phase speedup (target >= 3x): 3.7x (lin2025), 3.8x (mao2022), 13x (arabjuneghani2022), 21x (chen2022); from
AMD fill reduction (fill 12.5-23.5 -> 6.9-8.2 for these) times the supernodal kernel (2-4x on equal orderings).
The "before" phases were measured with less concurrent load than the "after" ones; the wall-time table above uses the
same-load re-run of the frozen engine.

### Round 2 (2026-10-15 00:23 PDT)

#### R2.1 mesher conformity (DevLog-025 finding; audit V1 of the L-VEC audit)

Root cause: Bowyer-Watson insertion uses the exact `incircle > 0` test for the cavity, while `encroaches()` uses a
strict test with a relative margin (`dot < -1e-12 (...)`). A point exactly on (or, by round-off, just inside) a
subsegment's diametral circle is "not encroaching", yet its cavity can contain both triangles adjacent to that
subsegment, so `commit` deletes the subsegment edge and nothing re-queues it. Reproduction: the DevLog-025 slab
(core 0.3 x 0.6 um, core_edge 0.05): subsegment (0.0427, -0.3)-(0.0854, -0.3) with circumcentres at
(0.0640, -0.3 +- 0.0213), exactly on its diametral circle; 6 triangles straddled y = +-0.3, core area 0.180547.

Fix (`mesh.mjs`):
- In the refinement-insertion cavity scan and in the segment-split cavity scan, a subsegment that is an interior edge
  of the cavity (both adjacent triangles in the cavity) is treated as encroached (split instead of deleted).
- Final conformity pass: after refinement every subsegment must be a triangulation edge; a missing one is force-split
  and refinement resumes (`stats.nRepair`; throws past 1e5 repairs). Over the 64 surveyed meshes this pass never had
  to repair (`nRepair` 0): the cavity rule alone fixes every case; the pass is the runtime assertion.
- Meshes in which no subsegment was ever deleted are bitwise identical (the new branch never fires there).
- Tests `engine/tests/perf-mesh.test.mjs`: both DevLog-025 reproductions (core area exact to 1e-12, `nRepair` 0) and a
  sweep of 3 core widths x 5 core sizes; both tests fail on the pre-fix mesher.

Survey: every `sims/*/config.yaml` (working tree, 2026-10-15 00:1x) and `validation/cases/*.yaml`, `runCrossSection`
with every ready stage (`optical_mode`, `eo_overlap`) and `fields: true`; before = the same engine snapshot with the
HEAD `mesh.mjs` (meshes identical to round 1), after = fixed `mesh.mjs`. Straddling triangles: triangles whose interior
is crossed by a region (or, for the ES mesh, electrode) polygon edge (exact orientation tests plus clipping). Worst
region-area error = |A_before - A_after| / A_after over regions and meshes (after is conforming: 0 straddles
everywhere). Metric columns: (before - after) / after.

| Config | stages | meshes non-conforming before (straddling triangles) | after | worst region-area error before (region, mesh) | dC' rel | dn_eff rel | dVpiL rel | ng rel |
|---|---|---|---|---|---|---|---|---|
| arabjuneghani2022 | electrostatics+optical_mode+eo_overlap | es 2; optical 2; armA 2; armB 7 | none | 0.250 % (rib_l, es) | 6.5e-6 | 6.0e-5 | -1.7e-4 | 4.9e-5 |
| boynton2020 | electrostatics+optical_mode+eo_overlap | none | none | 0 | 0 | 0 | 0 | 0 |
| chen2022 | electrostatics | es 2 | none | 0.000 % (sio2_cladding, es) | 1.1e-6 | - | - | - |
| chen2023 | electrostatics+optical_mode+eo_overlap | optical 4; armA 4 | none | 0.048 % (ln_slab, optical) | 0 | 4.0e-10 | -4.0e-9 | -3.4e-9 |
| chen2026 | electrostatics+optical_mode+eo_overlap | none | none | 0.000 % (lt_rib_r, optical) | 0 | 6.0e-7 | -9.2e-6 | 1.1e-6 |
| gao2024 | electrostatics+optical_mode | none | none | 0.000 % (ambient, optical) | 0 | -6.0e-7 | - | 3.1e-9 |
| kharel2021 | electrostatics+optical_mode | optical 4 | none | 0.003 % (sio2_cladding, optical) | 0 | 2.8e-12 | - | -2.5e-11 |
| li2022b | electrostatics+optical_mode+eo_overlap | optical 6; armA 6; armB 9 | none | 0.009 % (ln_slab, optical) | 0 | -5.9e-7 | 5.1e-6 | -5.4e-7 |
| li2026aa | electrostatics+optical_mode+eo_overlap | none | none | 0 | 0 | 0 | 0 | 0 |
| li2026ba | electrostatics+optical_mode | none | none | 0 | 0 | 0 | - | 0 |
| lin2025 | electrostatics+optical_mode+eo_overlap | es 2 | none | 0.031 % (lt_rib_l, es) | -5.3e-5 | -1.9e-9 | 1.4e-4 | -5.7e-8 |
| lin2026a | electrostatics | none | none | 0 | 0 | - | - | - |
| liu2021 | electrostatics+optical_mode | none | none | 0 | 0 | 0 | - | 0 |
| liu2025b | electrostatics+optical_mode | none | none | 0.000 % (ln_slab, optical) | 0 | 2.9e-7 | - | 2.0e-7 |
| mao2022 | electrostatics+optical_mode+eo_overlap | es 2; optical 2; armA 2; armB 2 | none | 0.571 % (strip_l, es) | 3.3e-6 | 5.5e-5 | -3.5e-5 | 3.8e-5 |
| murai2025 | electrostatics+optical_mode+eo_overlap | optical 2; armA 2; armB 4 | none | 0.047 % (ln_rib_l, armB) | 0 | -7.0e-6 | -4.0e-5 | 2.6e-6 |
| pan2021 | electrostatics+optical_mode+eo_overlap | armB 8 | none | 0.073 % (ln_slab, armB) | 0 | 0 | 5.9e-5 | 0 |
| qi2024 | electrostatics+optical_mode+eo_overlap | none | none | 0.000 % (ln_slab, optical) | 0 | 3.4e-7 | 9.9e-6 | 8.2e-7 |
| renaud2023 | electrostatics+optical_mode+eo_overlap | none | none | 0.000 % (box, armB) | 0 | -4.6e-7 | -2.2e-5 | -6.1e-7 |
| valdez2022 | electrostatics+optical_mode | none | none | 0 | 0 | 0 | - | 0 |
| valdez2023 | electrostatics+optical_mode | optical 7 | none | 0.024 % (si_wg_r, optical) | 0 | -5.5e-5 | - | -1.7e-4 |
| valdez2023a | electrostatics+optical_mode | none | none | 0.000 % (box, optical) | 0 | -5.1e-7 | - | 3.4e-6 |
| wang2022 | electrostatics+optical_mode | optical 8 | none | 0.205 % (si_wire_r, optical) | 0 | 3.9e-4 | - | 9.9e-5 |
| wang2022a | electrostatics+optical_mode+eo_overlap | optical 2; armA 2 | none | 0.020 % (ln_slab, optical) | 0 | -3.2e-12 | 1.4e-11 | 2.8e-11 |
| wang2024a | electrostatics+optical_mode+eo_overlap | optical 2; armA 2 | none | 0.003 % (lt_slab, optical) | 0 | 7.5e-7 | -3.6e-6 | 5.5e-7 |
| wang2025 | electrostatics+optical_mode | es 2 | none | 0.000 % (sio2_cladding, es) | 1.8e-7 | 3.2e-7 | - | 9.5e-7 |
| xu2022 | electrostatics+optical_mode+eo_overlap | none | none | 0 | 0 | 0 | 0 | 0 |
| xue2023 | electrostatics+optical_mode+eo_overlap | optical 4; armA 4 | none | 0.001 % (ln_slab, optical) | 0 | -7.0e-8 | -2.1e-5 | 1.2e-8 |
| xue2026 | electrostatics+optical_mode | optical 2 | none | 0.047 % (ln_slab, optical) | 0 | 3.3e-13 | - | -4.9e-12 |
| yang2022 | electrostatics+optical_mode+eo_overlap | none | none | 0 | 0 | 0 | 0 | 0 |
| zhang2022 | electrostatics+optical_mode+eo_overlap | none | none | 0 | 0 | 0 | 0 | 0 |
| zhang2024 | electrostatics+optical_mode | none | none | 0 | 0 | 0 | - | 0 |

Not run (input errors, same before and after): cai2025: parse: materials.lithium_tantalate.eps_r: RF permittivity is required;; case-K1: mesh: vertex budget exceeded (check hints / small input angles); case-K2: mesh: vertex budget exceeded (check hints / small input angles); case-K3: mesh: vertex budget exceeded (check hints / small input angles); case-K4: mesh: vertex budget exceeded (check hints / small input angles); case-K5-g3: mesh: vertex budget exceeded (check hints / small input angles); case-K5-g4: mesh: vertex budget exceeded (check hints / small input angles); case-K5-g5: mesh: vertex budget exceeded (check hints / small input angles); case-K5-g6: mesh: vertex budget exceeded (check hints / small input angles); case-K5-g8: mesh: vertex budget exceeded (check hints / small input angles); case-K6a: mesh: vertex budget exceeded (check hints / small input angles); case-K6b: mesh: vertex budget exceeded (check hints / small input angles); churaev2023: parse: materials.lithium_niobate.eps_r: RF permittivity is required; u; deng2026: parse: materials.barium_titanate.eps_r: RF permittivity is required; u; he2019: parse: materials.lithium_niobate.eps_r: RF permittivity is required; u; meng2023: electrodes 0 and 1 share an edge; nelan2022: parse: materials.lithium_niobate.eps_r: RF permittivity is required; u; sayem2026c: parse: materials.lithium_tantalate.eps_r: RF permittivity is required;; vanackere2023: parse: materials.lithium_niobate.eps_r: RF permittivity is required; u.
The validation cases K1-K6 stop in the electrostatic stage (`window_edge_um: 0.02` over a 4 x 4 um window exceeds the
80,000-vertex budget; also before the fix). Their optical meshes alone (`buildOpticalModel` + group index):
K2, K3, K4, K5-g5 had 0.0081 % ln_slab area error, K5-g3 0.0161 %; n_eff changed by at most 1.1e-6 (K2) and ng by at
most 2.5e-7; K1, K5-g4, K5-g6, K5-g8 unchanged; K6a/K6b have no optics block.

#### R2.2 Wheeler recess vertex budget (li2026aa, lin2025, qi2024)

Root cause: `recessGeometry` kept every material interface. Where an interface was flush with an electrode face (lin2025:
cladding y 0.28-2.08 and electrodes y 0.28-2.08, 100 um wide grounds), the recess leaves a sliver of thickness d
(0.027 um at 0.25 x delta/2) between the recessed face and the interface; the quality mesher resolves it with elements of
size ~d along the whole face: lin2025 needed 86,278 vertices (budget 80,000; 70,745 and 62,794 at 0.5 and 1 x delta/2).
mao2022 has no top-face interface and fitted.

Fix (`recess.mjs`, no stages.mjs change): `recessGeometry(geom, d, {regions: 'background'})` (new default) replaces the
regions by one background region covering the domain (plus regions named in `mesh.regions` size hints); `'keep'` gives
the former behaviour. Physically neutral (the recessed sections feed only the all-eps-1 vacuum solve). lin2025 recessed
meshes 58,711-59,020 vertices; recessed L' differs from the keep variant (budget raised) by 4e-6 relative. Wheeler
dL'/scale per scale: lin2025 keep 8.716 / 8.719 / 8.766 nH/m (spread 5.7e-3) vs background 8.711 / 8.714 / 8.752
(4.6e-3); mao2022 keep spread 1.47e-2 vs background 1.29e-2. rf_line now runs: li2026aa R' 7312 ohm/m (spread 1.16e-2),
lin2025 6047 (7.1e-3), qi2024 8449 (1.36e-2); spreads above 1e-2 still flag the evaluated RF targets (unchanged rule).

#### R2.3 audit fixes

- P1: `analyze` stores `patternKey` (n, nnz, FNV-1a hash of rowptr/colidx); `SparseCholesky(pat, null, {sym})` and
  `factorNumeric(sym, values, num, pat)` reject an analysis of another pattern; `factorNumeric` always checks the value
  count; `solveNumeric`/`solveNumericMulti` throw unless `num.ok`. Tests: one changed column index (same n, nnz) is
  rejected; solve after a failed factorization throws.
- P3: no 10-iteration fallback; `converged` requires the eigenvalue criterion and residual < resTol for the first
  `residualModes` modes; every result carries `residual[k]`, `modeConverged[k]` (residual < resTol and last eigenvalue
  change < tol) and `resTol`; default `maxIter` 300 (legacy 120); option `subspace`. Shifts only while the predicted
  convergence ratio of the slowest requested mode improves by >= 10 %: 2-mode solves now use 1-3 shifts (were 8).
- P4: the bench compares strings, booleans and null exactly (statuses, converged flags, warnings, labels, stages);
  the ng exemption covers only `metrics.ng_opt` and `targets.ng_opt#*.actual`.
- P5: `analyze` of an empty pattern returns an empty analysis (factor/solve work); `ordering: 'nd'` without x, y throws;
  a perm of the wrong length throws.
- P6: `sparse.mjs` header rewritten; S3.3 sign defined; S3.9 budget note; baseline regeneration from HEAD documented in
  the bench header (`git archive HEAD engine sims`, read-only) and used below.
- P2 (L-PARAM): `groupIndex(..., {method: 'finite_difference'})` stays selectable.

#### R2.4 scalar optics P2: skipped

Not cheap enough for its value now: it needs a P2 mass matrix and P2 eigenvectors in `optics.mjs`, plus P2 sampling of
psi in `eo-overlap.mjs` and P2 field export in `fields.mjs` (both L-PARAM files); the vector solver (L-VEC) is the main
optical path.

#### Bench regression against HEAD (2026-10-15 00:23 PDT)

Baseline: HEAD engine and HEAD inputs (`git archive`, scratch `l-perf-r2-work`); current: HEAD non-L-PERF files plus the
live L-PERF files; 3 repeats. Expected differences (every other leaf, numeric and non-numeric, within tolerance; largest
unchanged relative difference 3.8e-14):

| Case | Differences | Cause |
|---|---|---|
| mao2022-es, arabjuneghani2022-es, lin2025-es, gsg-eo-rf | none | ES meshes of the HEAD inputs had no deleted subsegment |
| mao2022-es-opt | n_eff 5.5e-5, boundaryMarginFraction 2.6e-3 | optical mesh was non-conforming (R2.1) |
| arabjuneghani2022-es-opt | n_eff 6.1e-5, optical nodes 5808 -> 5804, boundaryMarginFraction 1.6e-2 | R2.1 |
| lin2025-es-opt | n_eff 1.9e-9, optical nodes 10442 -> 10437, boundaryMarginFraction 6.0e-4 | R2.1 |
| chen2022-unloaded-es | C' 2.5e-6, C0' 1.7e-8, Z0 1.2e-6 | ES mesh was non-conforming (R2.1) |
| mao2022-wheeler | R' 1.0e-3 (per scale 1.5e-3, 1.5e-4, 1.0e-3), spread 0.0155 -> 0.0129, alpha 8e-4 to 1e-3, 566 leaves | R2.2 background-region recess |

Current medians (3 repeats, wall ms): mao2022-es 280, mao2022-es-opt 286, arabjuneghani2022-es 169,
arabjuneghani2022-es-opt 239, chen2022-unloaded-es 314, lin2025-es 231, lin2025-es-opt 343, gsg-eo-rf 166,
mao2022-wheeler 620. The HEAD baseline was a single run for leaves (printed: lin2025-es-opt 1106, gsg-eo-rf 233,
mao2022-wheeler 2126); speedups as in the round-1 final table.

### Round 3: bench fixes (final engine audit F5; 2026-10-15 08:43 PDT)

- `mao2022-wheeler` crashed (duplicate YAML keys: mao2022 now declares `dielectric_loss_model` and
  `include_internal_inductance`, and the bench inserted them again as text). Overrides now go through
  `engine/src/yaml-edit.mjs` `applyOverrides` (document API; existing keys are replaced).
- One failing case no longer aborts the run: its error is written to the JSONL (`{type: 'case', id, error}`), the
  run continues, and the exit status is 1.
- Every case pins its numerical choices explicitly, in the YAML (`mesh.element_order` under `geometry`, `template` or
  `alt_geometries.<section>`; `optics.solver`; `optics.vector_order: 2` for vector; `optics.group_index_from:
  perturbation`) and in the run options (`elementOrder`, `solver`, `meshScale: 1`). Medians therefore do not follow
  default changes; they still follow edits of the input configs themselves (the bench reads the working-tree files).
- Case set (ids carry the pins): mao2022 ES P1 and P2, mao2022 optical scalar/P1 and vector/P2, arabjuneghani2022 ES P1
  and optical scalar/P1, chen2022 unloaded ES P1 and P2, lin2025 ES P1 and optical scalar/P1, gsg-eo-rf
  (eo_overlap + rf_line, P1, scalar), mao2022 Wheeler P1, renaud2023 optical + eo_overlap vector/P2. K4 is not a case:
  its electrostatic mesh exceeds the 80,000-vertex maximum (`mesh: vertex budget exceeded`), so `runCrossSection`
  cannot run it.

Run 2026-10-15 08:42-08:43 PDT, `nice -n 10`, one process, 3 repeats, working-tree inputs, log
`logs/bench-20261015T0842.jsonl` (median wall ms; ES factor ms over both factorizations; nnz(L)):

| Case | Wall ms | ES mesh | ES factor | nnz(L) | Optical (scalar: factor / solve ms, iterations) |
|---|---|---|---|---|---|
| mao2022-es-p1 | 423 | 145 | 112 | 1,794,543 | - |
| mao2022-es-p2 | 1622 | 138 | 885 | 11,125,541 | - |
| mao2022-opt-scalar-p1 | 422 | 141 | 99 | 1,794,543 | 3.7 / 21.4, 26 it |
| mao2022-opt-vector-p2 | 2057 | 144 | 893 | 11,125,541 | vector (no scalar phases) |
| arabjuneghani2022-es-p1 | 234 | 106 | 57 | 1,129,627 | - |
| arabjuneghani2022-opt-scalar-p1 | 287 | 100 | 58 | 1,129,627 | 5.8 / 18.0, 13 it |
| chen2022-unloaded-es-p1 | 300 | 143 | 73 | 1,342,121 | - |
| chen2022-unloaded-es-p2 | 1107 | 144 | 570 | 8,310,949 | - |
| lin2025-es-p1 | 343 | 150 | 96 | 1,758,848 | - |
| lin2025-opt-scalar-p1 | 445 | 150 | 84 | 1,758,848 | 13.8 / 32.4, 12 it |
| gsg-eo-rf-p1-scalar | 165 | 5 | 0.1 | 2,203 | 13.5 / 41.1, 20 it (2 arms) |
| mao2022-wheeler-p1 | 998 | 131 | 88 | 1,794,543 | - |
| renaud2023-eo-vector-p2 | 1748 | 101 | 256 | 4,728,494 | vector |

The P2 rows use the config's own mesh hints at mesh scale 1 (no P2 coarsening factor), so they are the P2 cost at the
P1 mesh, not the accuracy-matched setting of S3.9. No baseline comparison in this run (case ids changed); write a new
baseline with `--write-baseline` before using `--baseline`.

## Limitations

- Bench medians are taken on a laptop shared with four other lanes; run-to-run spread under that load was ~10-20 %.
  The relative comparisons above use runs taken minutes apart under similar load.
- The P2 references for mao2022 and lin2025 are extrapolations of the engine's own sequences (singular corners limit
  the rate), not analytic values; the smooth manufactured problem is the only exact P2 check besides the uniform field.
- `ndOrder` (coordinate bisection) remains exported and is used by L-VEC; AMD gives 30-70 % less fill on these meshes.
- WASM numbers are a kernel micro-benchmark; the whole-factorization gain is an estimate.
- Not done: P2 for the scalar optical mode; mesh-morphing Wheeler (proposal); a faster classify (section.mjs is not
  this lane's file).
- R2.1 survey covers the `geometry` section of each config (plus chen2022 `unloaded` in the bench) and the meshes that
  `runCrossSection` exports (ES, optical, arm windows); alt sections were not surveyed. The straddle test uses polygon
  edges as given (clipped edges outside a mesh never match a triangle).

## Requests to other lanes

- L-PARAM (`run.mjs`, `stages.mjs`, `config.mjs`, `eo-overlap.mjs`):
  1. `timing` objects exist on `solveElectrostatics` (also vacuum-only), `buildOpticalModel`, `solveModesAt`,
     `groupIndex` results; `run.mjs` already passes them through (seen 2026-10-14). The opt-in `timingSink` in
     `sparse.mjs` needs no plumbing.
  2. Config key `mesh.element_order: 1 | 2` -> `solveElectrostatics(..., {elementOrder})`. Suggested default once
     validated: 2 with a coarser mesh scale (P2 at scale 2.8 is faster and ~3x more accurate than P1 at scale 1).
     With P2 the EO overlap should sample `gradientAt(es, t, x, y)` (exported from `electrostatics.mjs`) instead of
     `es.grad.gx[t]` (centroid value only); `fields.mjs` may export `es.phiDof` / `es.p2` for P2 rendering.
  3. `groupIndex` default is now the perturbation method (one eigen solve); `g.lo`/`g.hi` are the base solve for it
     and `g.converged` exists for both methods; `run.mjs` may check `g.converged` instead of `g.lo.converged &&
     g.hi.converged`. FD stays available with `{method: 'finite_difference'}`.
  4. Wheeler mesh-morphing proposal (S3.8) needs a decision before implementation.
- L-VEC: `analyze`/`amdOrder` are final (fields above); `factorNumeric` is LL^T only. `solveNumericMulti` shows the
  multi-RHS layout used here. AMD cuts fill 30-70 % vs `ndOrder` on ES meshes.
- L-UI: per-phase timings are in `result.timing` (via L-PARAM) for the log panel.
- Round 2 (2026-10-15):
  - L-PARAM: `solveModesAt` results now carry `residual[k]`, `modeConverged[k]`, `resTol`; a stage that uses mode k
    should require `modeConverged[k]` (run.mjs checks `converged`, which covers the first `residualModes` modes only).
    `recessGeometry` default `regions: 'background'` (R2.2); `stages.mjs` needs no change, but pass
    `{regions: 'keep'}` if the former behaviour is ever wanted. Wheeler R' moved by 1e-3 relative on mao2022.
  - L-REF: validation cases K1-K6 exceed the 80,000-vertex ES budget (`window_edge_um: 0.02` over the 4 x 4 um window
    meshes the electrostatic domain too finely); their optical meshes are conforming after R2.1 (changes listed above).

