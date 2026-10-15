---
title: Final fresh-context audit of the simulator engine (after L-PERF R2, L-VEC R2-R3, L-PARAM R2-R4, L-REF R2)
date: 2026-10-15
auditor: fresh-context Claude subagent
scope: engine/ (src, tests, bench, schema, data, README, cli), sims/SPEC.md, sims/*/config.yaml vs HEAD 365519a (read-only git show/diff), validation/cases and validation/reference/summary.json; closure of first-round audit findings A1-A19, P1-P7, V1-V11, R1-R10
---

# Final engine audit (2026-10-15)

Read-only on the repo. The only file written is this one. HEAD comparisons use `git show HEAD:<path>`. There was no
worktree and no state-changing git command. The hybrid engine is the current `engine/src` with the HEAD `mesh.mjs`,
built in a private scratch folder.

All runs used Node 23.7.0, `nice -n 10`, `--max-old-space-size=1536`, one process at a time. The machine was shared,
with load average 2.3-4.0, so wall times are indicative only. Scratch scripts were in
`scratchpad/final-audit-engine-r1/` and were removed afterwards.

Result: 0 blocking, 4 major, 5 minor, 3 notes. The main question for this round was the mesher conformity fix. It
holds: 0 straddling or misclassified triangles in 203 meshes. The test suite and reference numbers reproduce exactly.
The engine-vs-reference differences shrink under mesh refinement. The config migrations change no physical input
beyond what DevLog-026 documents.

The defects are in the paths that the paper configs and the reference tests do not exercise:

- The default scalar solver on hybrid Si/LN configs.
- Lossy metal through a config.
- TM EO overlap with the scalar solver.
- The cost of P2 by default, which went unreported.

## Findings

### F1 (major; owner L-PARAM, orchestrator decision) Default scalar solver returns a non-physical mode on the three hybrid Si/LN configs; their ng targets fail by 35-50 % while the vector solver passes

Evidence: `runCrossSection(..., {stages: ['optical_mode']})` on the current tree, scalar is the default.

| Config | n_eff scalar / vector | ng scalar / vector | ng target | status scalar / vector |
|---|---|---|---|---|
| wang2022 | 2.34639 / 1.95158 | 3.7552 / 2.4579 | 2.5 | fail / pass |
| valdez2022 | 2.12800 / 1.97053 | 3.1264 / 2.3106 | 2.32 | fail / pass |
| valdez2023 | 2.12730 / 1.96384 | 3.1343 / 2.3184 | 2.31 | fail / pass |

- wang2022 has a 280 x 220 nm Si wire under an unetched LN film. The vector top mode is a TE-like hybrid with TE
  fraction 0.987, LN 67 %, Si 9 %, and no vector mode lies above it.
- The scalar value 2.346 / ng 3.76 is the vertical-wall error of the scalar form, at about 5x the audit D5 slab case.
- On every TFLN rib config, scalar and vector n_eff differ by less than 0.034 (chen2023 has the largest difference),
  and VpiL differs by 0.1-3.1 %, with xu2022 the largest at +3.1 %. So the DevLog-026 conclusion "scalar is not the
  cause" holds for ribs only.
- DevLog-026's scalar-vs-vector table does not include the hybrid configs.

Fix:
- Set `optics.solver: vector` in wang2022, valdez2022 and valdez2023, with a provenance note. Alternatively make
  vector the default.
- Extend the scalar/vector comparison table to every runnable config. 30 configs run `optical_mode`; the survey
  numbers are in this audit's run logs and can be regenerated with a short script.
- Consider a readiness warning when a high-index core (index contrast > 1.5) has vertical walls in the window.

### F2 (major; owner L-PARAM `optical-stage.mjs`, L-VEC) Lossy metal from a config: TM silently returns a surface plasmon; TE fails

Evidence: a scratch K4 variant with `solver: vector`, `metal_in_window: lossy`, `metal_permittivity: {gold: [-95, 10]}`
(illustrative value plus a provenance entry), at mesh scale 2. The window x 7.5-17.5 um contains the ground electrode,
which sits on LN.

- **TM run.** It returns "TM0" with n_eff 2.115697, TE fraction 0.044, 4408 dB/cm, 93 % of the power in the LN slab
  under the gold, and VpiL 10.09 V cm.
  - `compatibleVpiConventions` = [mzm_push_pull].
  - Arm dn -4.149e-6 vs +3.530e-6, so the balance is -0.85.
  - `solverWarnings` is empty.
- **The returned mode is the gold/LN surface plasmon.** All 4 top modes are SPPs (2.1157, 2.1152, 2.0709, 2.0693;
  4408-4514 dB/cm). The dielectric TM0 is about 1.8604 (the `absent` and `pec` runs). There is no warning.
- **TE run.** It throws "found no TE mode with index 0", because the 2 and then 4 computed modes are all SPPs.
- **Cause.** `solveVectorFamily` uses the default lossy shift, which is above n_spp (round-2 V4). It selects by TE
  fraction only. The config schema has no way to pass `nTarget`, select by confinement, or cap the loss. DevLog-025
  documents the manual recipe (nTarget near the dielectric mode, more modes, select by confinement), but the config
  path cannot express it.

Fix:
- For `metal: lossy` in the config path, shift to just above the `absent` (or `pec`) solution of the same window.
- Select the mode whose confinement in dielectric regions is largest, or the one closest to that reference mode.
- Warn or fail when the selected mode has more than X % power in metal-adjacent regions or loss above a threshold.
- Alternatively, block `lossy` in configs until this exists.

### F3 (major; owner L-PARAM `eo-overlap.mjs`, default-solver policy) Scalar TM EO overlap is 35 % low in |dn| (VpiL +55 %) against the vector overlap; nothing flags it

Evidence: K4 geometry with `polarization: TM`, P2 ES at scale 2, push-pull.

| Run | dn_A (1/V) | VpiL (V cm) |
|---|---|---|
| scalar, full tensor | -4.274e-6 | 9.066 |
| vector, full tensor | -6.629e-6 | 5.846 |

Decomposition (vector; contributions add linearly to -6.63e-6):

| Coefficients kept | dn_A vector | dn_A scalar |
|---|---|---|
| r13 only | -5.43e-6 | -4.27e-6 |
| r33 only | -6.46e-7 | 0 (V_pi undefined) |
| r51 only | -5.56e-7 | 0 (V_pi undefined) |

- The r13-only gap (-21 %) comes from the E_z component, which sees d eps_zz = r13 E. The scalar form keeps only H_x
  / d eps_yy.
- The r33 and r51 terms come from the hybrid E_x content (TE fraction 0.038), which the scalar form drops.
- The eo-overlap.mjs header documents the neglect. The emitted labels (`scalar_optical_not_full_vector`,
  `scalar_tm_lateral_gradient_uses_eps_zz_approximation`) do not state that E_z and off-diagonal Pockels terms are
  missing, and the stage gives no warning.
- No current config uses TM, so the impact is latent. It becomes real for z-cut or any TM device.
- For the TE ribs the scalar EO is within 0.1-3.1 % of vector, so TE is fine.

Fix:
- For `polarization: TM` with `eo_overlap`, require `optics.solver: vector`, or emit a specific warning such as
  `scalar_tm_eo_neglects_ez_and_shear` with the magnitude caveat.
- Add a test that pins the scalar/vector TM ratio on a fixture.

### F4 (major, performance; owners L-PARAM default, L-PERF bench) P2 electrostatics by default on the unchanged mesh costs 2.7-3.9x electrostatics time on the paper configs; not reported

Electrostatics only, median of 3:

| Config | P1 scale 1 | P2 scale 1 (current default) | P2 scale 2 |
|---|---|---|---|
| mao2022 time | 390 ms | 1527 ms | 429 ms |
| mao2022 C' (pF/m) | 187.0522 | 186.6324 | 186.7045 |
| mao2022 vertices | 55,500 | 55,500 | 19,478 |
| renaud2023 time | 263 ms | 711 ms | 257 ms |
| renaud2023 C' (pF/m) | 233.3537 | 232.7871 | 232.8576 |

- P2 at scale 2 is within 3.9e-4 (mao2022) and 3.0e-4 (renaud2023) of P2 at scale 1, at P1 cost. P1 at scale 1 is
  2.2e-3 off.
- Bench (`bench.mjs --repeats 3`): mao2022-es median 1600 ms and mao2022-es-opt 1622 ms, against DevLog-024 round 2
  values of 280 ms and 286 ms. The factor time is 885 ms with nnz(L) 11.1 M.
- DevLog-026 chose P2 on K4/K6 evidence at scale 2 and gives the K4 cost (0.42 vs 1.06 s). It does not report the
  4-6x regression on the bench or paper configs.
- L-PERF's recommendation (DevLog-024 request 2) was P2 with a coarser mesh. That half was not adopted.
- `meshScale` scales both the ES and the optical meshes, so there is no separate knob.

Fix:
- Add an ES-only mesh scale, defaulting to about 2 for P2.
- Or record the cost and an explicit decision in DevLog-026/023.
- Re-baseline the bench with a pinned element order.

### F5 (minor; owner L-PERF) `bench.mjs` crashes on `mao2022-wheeler`; bench is not order-pinned

- `withDielectricNone` inserts `dielectric_loss_model: none` and `include_internal_inductance: false`. mao2022 now
  carries both keys, so YAML reports "Map keys must be unique at line 69". The case and the rest of the run abort.
  This audit's run stopped after 2 of 3 cases.
- The bench inherits the config's element order, so a baseline taken at P1 (DevLog-024) compares against P2 runs.

Fix: rewrite the transform to set the keys with the YAML helpers instead of a text replace, and pin
`elementOrder` per case.

### F6 (minor; owner L-PARAM `tests/reference-cases.test.mjs`) n_eff budgets are 13-53x the measured differences, not the stated ~2.5x

Evidence (`ENGINE_REFERENCE_FULL=1 REF_VERBOSE=1`):

| Quantity | Tolerance | Measured difference | Ratio |
|---|---|---|---|
| K1 n_eff | 6.06e-5 | +4.7e-6 | 12.8x |
| K2 n_eff | 6.01e-5 | -1.1e-6 | 53x |
| K3 n_eff | 6.02e-5 | -3.9e-6 | 15x |
| K1 TE fraction | 5.1e-5 | 7.4e-6 | 6.9x |
| K6a P2 n_RF | 1.30e-3 | 1.9e-4 | 6.8x |
| K5-g8 VpiL (9e-3 relative applied to every gap) | 3.58e-2 | 5.6e-3 | 6.4x |

- The header comment says "about 2.5x".
- The n_eff budgets date from round 2, when the vector default sizing gave K2 +2.2e-5. Round-3 auto sizing improved
  the engine about 20x and the budgets were not tightened.
- The four widened tolerances that DevLog-023 lists (ng 1e-4, TE 1.5e-5, K5 9e-3) are 2.6-3.2x and are justified.
- A K2/K3 n_eff regression of up to about 5e-5 would pass unnoticed.

Fix: set the n_eff budgets to about 1e-5 (K1 2e-5), use per-gap K5 budgets, and correct the header.

### F7 (minor; owner L-PARAM `optical-stage.mjs`) Vector family selection: one doubling only, a misleading error, and no window-margin diagnostic

Evidence on K4-type windows (10 x 6 um with a continuous slab):

| Case | Scalar | Vector |
|---|---|---|
| x-cut TM, mode_index 1 | n_eff 1.6245 | throws "no TM mode with index 1 (TE fraction >= 0.5 for TE)" |
| z-cut LN, propagation x, TM0 | n_eff 1.789 | throws "no TM mode with index 0" |

- In both vector failures, slab TE box modes fill the 2 to 4 (or 4 to 8) computed modes.
- The error text quotes the TE criterion for a TM request.
- For TE mode_index 1, the vector solver returns 1.75086 (rib 14 %, slab 63 %). This is 0.014 above the slab box
  modes (1.7364).
- The scalar solver gives 1.7625 for the same request.
- The vector result has `mode.windowMargin`, but `solveOptical` neither copies it into diagnostics nor warns on it.
  The scalar path exposes `boundaryMarginFraction`.

Fix:
- Retry until the family index is found up to a cap (for example 16 modes), or use a family-specific shift.
- Fix the message for TM.
- Expose `windowMargin.powerFraction` in diagnostics and warn above a threshold.

### F8 (minor; owner L-PARAM `run.mjs` / `stages.mjs`) `cache.opticalWarm` grows without bound

- One entry is added per distinct arm window, keyed by the window JSON, and entries are never evicted. Each vector
  entry holds `numModes` eigenvectors.
- 12-point vector gap sweep (renaud2023, shared cache): 13 entries holding 13.4 MB.
- The app worker keeps one cache for its whole lifetime (`app/src/lib/sim.worker.ts:10`), so entries accumulate
  across runs and configs. A 2000-point study (`MAX_STUDY_POINTS`) could hold about 2 GB.
- Warm data from unrelated configs is harmless for correctness, because the shift is inertia-guarded and X0 needs an
  equal n. It costs an extra factorisation when rejected.

Fix: keep only the last entry per key prefix (optical_window, arm A, arm B), or bound the map (LRU of a few
entries).

### F9 (minor; owner L-PARAM docs, L-PERF package) Stale documentation

- `engine/README.md:12-17` says "Anisotropic P1 electrostatic FEM", "Scalar E/H optical FEM and finite-difference group
  index" and "each explicit arm window's own scalar mode". Its own paragraph at lines 40-45 contradicts this: P2 default,
  perturbation default, vector solver.
- `sims/SPEC.md:5` says "Implemented subset: electrostatics, scalar optical modes ...".
- `sims/SPEC.md:94` says "group index via wavelength finite difference". The L-PERF audit (P2) listed this line, and
  only line 31 was fixed.
- `engine/package.json` description says "scalar optical mode".
- The `npm test` script runs at the default concurrency. The project's hardware rule and every DevLog use
  `--test-concurrency=1`.
- `run.d.mts:68-69` lists `groupIndexMethod: 'fixed'`, which `optical-stage.mjs` never emits (null for fixed).

### F10 (note; owner L-REF / L-PARAM) K2 and K3 case files cannot run end to end

`runCrossSection` on K2.yaml and K3.yaml throws "mesh: vertex budget exceeded" at mesh scales 1 and 2. This is the
electrostatic stage, because `window_edge_um: 0.02` covers the 10 x 6 um window.

The reference test bypasses it with `solveOptical`, but anyone loading these cases in /sim or the CLI hits the error.
K1 and K4-K7 run at scale 2. Possible fixes: give the cases a coarser `window_edge_um`, or add an optical-only entry.

### F11 (note) Memory

Peak RSS, measured with `/usr/bin/time -l`:

| Run | Peak RSS |
|---|---|
| full test suite (sequential, 28.3 s) | 906 MB |
| reference tests with K5 (17.8 s) | 1.20 GB |
| renaud2023 scalar single | 450 MB |
| renaud2023 vector single | 597 MB |
| renaud2023 gap sweep, scalar | 1.32 GB |
| renaud2023 gap sweep, vector | 1.39 GB |
| renaud2023 wavelength sweep, scalar | 622 MB |
| renaud2023 wavelength sweep, vector | 918 MB |
| 40-config survey in one process | 1.47-1.48 GB |

- **No leak.** In a synchronous loop of `runSweepPoint` calls (no event-loop yield), `arrayBuffers` grows by
  20-40 MB per vector point: 301 -> 450 MB over 8 points, even with a fresh cache each time. After one idle
  event-loop turn it drops to 0, so this is deferred release, not a leak.
- **Caller requirement.** `runSweep` yields between points. A worker-pool caller that runs points back to back must
  also yield.
- **This audit exceeded the 1.5 GB guideline once.** The synchronous 12-point measurement loop peaked at 1.72 GB RSS.

### F12 (note) Checks that found no defect but were worth recording

- Wheeler R' uses L' nominal from the full-region mesh and recessed L' from background-only meshes (R2.2). Replacing
  the nominal L' with an unrecessed background-mesh solve changes R' by at most 0.07 %:

  | Config | R' per scale, current (ohm/m) | R' per scale, same-mesh L' (ohm/m) |
  |---|---|---|
  | mao2022 | 7187.9 / 7219.0 / 7287.5 | 7189.1 / 7219.6 / 7287.8 |
  | lin2025 | 6051.3 / 6061.2 / 6076.8 | 6055.7 / 6063.4 / 6077.9 |

  The relative difference in L' nominal is -2.2e-6 and -5.8e-6. The mismatch is negligible.
- In the run path, vector wavelength sweeps rebuild the optical model at every point (`timing.opticalModel` non-null
  at every point). Only the warm shift carries over. This is correct, because auto sizing depends on lambda0. DevLog-025's
  "wavelength sweeps reuse the model" applies to direct API use only.

## Item-by-item verification

### 1. First-round findings marked fixed

| ID | Verified | Evidence |
|---|---|---|
| A1 | yes | zhang2022 `tan_delta_rf` Si 0.013 / LN 0.008 / SiO2 0.006, air 0, `dielectric_loss_model: tan_delta_regions` (resolved materials diff vs HEAD) |
| A2 | yes | locator "read from the rendered page image 2026-10-15" (materials.json:176). Not re-read here. |
| A3 | yes | renaud2023 z0 target cites paper p.2, `basis: design_intent`, `comparable: false` |
| A4 | yes | DevLog-026 correction note plus reconstructed times |
| A5 | yes | test "unit rules of audit A5" |
| A6-A9 | yes | template tests: loading_strip required, on_cladding, domain clip `[-10, -4.7]` |
| A10 | disputed by the lane with a two-page locator | accepted |
| A11 | yes | r51 caveat in the library `condition` |
| A12 | yes | `rejectSweptOverrides` in `runSweepPoint` plus test (sweep-enumeration.test.mjs:131) |
| A13 | yes | `FREE_TEXT_TOP_LEVEL`/`FREE_TEXT_KEYS` plus test |
| A18 | yes | `MAX_STUDY_POINTS` |
| P1 | yes | `patternKey` checked in SparseCholesky / factorNumeric; test |
| P2 | partly | code honours FD (optical-stage.mjs:46, 72); schema/SPEC:31 updated; SPEC:94 and README:14 still stale (F9) |
| P3 | yes | `residual`/`modeConverged`/`resTol`; per-mode check in optical-stage |
| P4 | yes | bench compares strings, booleans and null; ng regex limited (bench.mjs:68). F5 is a separate breakage. |
| P5 | yes | test "empty pattern, nd without coordinates ..." |
| P6 | yes | sparse.mjs header rewritten |
| P7 | yes | `gradientAt` sampling (eo-overlap.mjs:124, `sampleStaticFieldQ`) |
| V1 | yes | item 4 below |
| V2 | yes | `nCheckUsed`, `reliable` |
| V3 | yes | `ComplexLDLT.prototype.solveRefined` (ldlt.mjs:826-827); used when `nPerturbed > 0` |
| V4 | yes | `nDefault` includes `nSppMax`. F2 is the config-path consequence. |
| V5 | yes | `bench/vector-bench.mjs` |
| V6 | yes | DevLog-025 K4 row uses the final reference |
| V8-V10 | yes | gate table text, G8 Im bound, `epsDeltaGroup` / NaN ng |
| V7, R1 | yes | fixed 0.5 nm corners; K1 2.44722338 +- 5.9e-7, K2 1.89416707 +- 5.8e-8 |
| R2 | yes | `util.richardson` rule (monotone, 0.5-1.5 p_formal, else safety 3) |
| R3 | yes | `role: sanity_only_not_a_gate` on K1-K3 tidy3d |
| R4 | yes | 10-digit indices in the case files |
| R5 | yes | `dn_mean_abs_per_V` in summary.json; used by the tests |

### 2. Test suite

| Run | Tests | Pass | Fail | Skipped | Todo | Time | Peak RSS |
|---|---|---|---|---|---|---|---|
| full suite, `--test-concurrency=1` | 216 | 214 | 0 | 1 (K5) | 1 (scalar D5, expected) | 28.3 s | 906 MB |
| `ENGINE_REFERENCE_FULL=1`, reference file | 8 | 8 | 0 | - | - | 17.8 s | 1.20 GB |

These are the reported counts. Engine values equal the DevLog-026 08:04 table to all printed digits:

- K1 n_eff 2.4472281
- K4 C' 146.63515, VpiL 2.27377
- K5 VpiL 1.27381 / 1.76515 / 2.27377 / 2.80102 / 3.91407
- K6a/K6b C' 214.311 / 174.379

### 3. Engine vs reference: discretisation, not bias

Mode cases, vector order 2, mesh scale = engine `meshScale`. Differences are engine minus reference.

| Case | Scale | DOF | d n_eff | d ng | d TE fraction |
|---|---|---|---|---|---|
| K2 | 2 | 28,572 | -1.13e-6 | -3.40e-5 | -3.8e-6 |
| K2 | 1 | 72,814 | +2.5e-7 | -9.4e-6 | -6.6e-7 |
| K2 | 0.5 | 228,911 | +3.6e-7 | -1.9e-6 | +2.0e-7 |
| K1 | 1 | 31,581 | +4.73e-6 | -6.19e-5 | +7.4e-6 |
| K1 | 0.5 | 74,571 | +2.37e-6 | -1.80e-5 | +4.0e-6 |
| K3 | 1 | 79,697 | -1.17e-6 | -7.2e-6 | -1.5e-6 |

- The ng differences shrink toward 0 as about h^2. K1 n_eff halves as h halves, which is first order and fits the Si
  corner singularity.
- All three ng differences are negative at coarse scale, about -1.1e-5 to -1.5e-5 relative. They vanish under
  refinement, so this is discretisation, not a formula bias.
- Vector FD ng (K2, scale 1) differs from perturbation ng by 1.1e-6, consistent with O(delta^2).

K4, P2 electrostatics plus vector arms:

| Scale | ES vertices | d C' | d VpiL | d mean dn |
|---|---|---|---|---|
| 2 | 48,275 | +7.95e-4 | -2.12e-3 | +2.13e-3 |
| 1.5 | 71,458 | +5.65e-4 | -1.54e-3 | +1.55e-3 |
| 1.25 | - | - | - | - |

- Scale 1.25 exceeds the 80,000-vertex budget.
- Both differences fall with refinement at about first order (corner-limited). A p = 1 Richardson estimate from the
  two levels puts VpiL within about 2e-4 of the reference (estimate, two levels only).
- No bias is indicated.
- K5 differences follow the gap trend of the ES error: -3.5e-3 at g3, -1.4e-3 at g8.
- K6 C' +2.3e-4 / +3.3e-4 was not re-run at a finer scale.

### 4. Mesher conformity

Independent checker, no engine code used:

- **Straddle test.** Every region and electrode polygon edge is clipped against each triangle's open interior
  (tolerance 1e-9 h).
- **Centroid test.** Each triangle's centroid is classified with my own crossing-number test in painter order and
  compared with `triRegion`. ES triangles inside electrodes are counted separately.
- **Meshes checked.** The ES, optical and arm-B meshes exported by `runCrossSection(..., {fields: true})`.

| Survey | Meshes | Current tree: straddling / misclassified | HEAD `mesh.mjs` hybrid: straddling triangles |
|---|---|---|---|
| 40 configs, default (scalar) solver, scale 1 | 80 | 0 / 0 | 85 (arabjuneghani2022, chen2022, chen2023, kharel2021, li2022b, lin2025, mao2022, murai2025, pan2021, valdez2023, wang2022, wang2022a, wang2024a, wang2025, xue2023, xue2026) |
| 40 configs, vector solver (auto sizing) | 80 | 0 / 0 | 73 |
| validation/cases, scale 2 | 43 | 0 / 0 | 14 |

- **Not meshed.** The same 8 configs fail at parse or on meng2023 geometry in both engines (unchanged inputs).
- **Meshes that changed although clean at HEAD.** Meshes with no defect at HEAD and a changed hash: 14 (scalar
  survey), 9 (vector), 6 (cases). DevLog-024 says only meshes in which a subsegment was deleted change. A subsegment
  that was deleted and later re-created by Delaunay flips would leave a conforming HEAD mesh that still changes under
  the fix. That is consistent with the claim, but I did not instrument it.
- **Every other mesh is bitwise identical to HEAD.**

### 5. New defaults: edge cases

| Default | Edge case | Result |
|---|---|---|
| P2 electrostatics | Mirror symmetry: K4 even-mirror (half domain) vs full domain, single arm, scale 2 | C' 146.645 vs 146.671 (1.8e-4, mesh); VpiL 4.5508 vs 4.5507 (scalar) |
| P2 electrostatics | K4 odd-mirror (split signal +-0.5) vs full | C' 106.524 vs 106.530; vector VpiL 9.1508 vs 9.1507 |
| P2 electrostatics | Cost | F4 |
| vector auto sizing | TFLN ribs, scalar-vs-vector VpiL | 0.1-3.1 % (table under F1) |
| vector auto sizing | Hybrids | F1 |
| adaptive shift | wang2022 and valdez2022 (shift source "adaptive") | Top 6 modes listed; inertia guard sound by code reading; no mode above the shift was missed |
| perturbation group index | K2 FD vs perturbation (above) | Agrees; configs migrated |
| numModes = 2(modeIndex+1) | TE0 found in all 30 configs that reach optical_mode | ok |
| numModes = 2(modeIndex+1) | TM1, z-cut TM0 | Fail loudly (F7) |
| numModes = 2(modeIndex+1) | Lossy TM | Fails silently (F2) |
| numModes = 2(modeIndex+1) | TM EO | Scalar inconsistent (F3) |
| numModes = 2(modeIndex+1) | z-cut TE (K4 geometry), scalar / vector VpiL | 9.618 / 10.452 V cm (weak r22/r13 case, 8.7 %) |

### 6. Config migrations

I compared YAML trees (HEAD vs current), ignoring provenance, notes and limitations, and compared the resolved
geometry and materials via `parseConfig`.

- **group_index_from.** All 40 configs change `group_index_from` to `perturbation`.
- **Other physical-input changes.** They are limited to the ones listed in DevLog-026:
  - optics.eo blocks, vpi_convention, `dielectric_loss_model`, `include_internal_inductance` (19 configs).
  - Library materials on gao2024, meng2023, valdez2022 and valdez2023 (these did not parse at HEAD).
  - zhang2022 tan delta (A1).
  - mao2022: LN eps perp 43 -> 44; Au 4.1e7 -> 4.5167e7 S/m; substrate Si n 3.476 -> library dispersion. The a-Si
    strip keeps n 3.475.
  - arabjuneghani2022: LN eps 43/28 -> 44/27.9; LN, SiO2 and Si indices -> library; Au as mao2022.
  - renaud2023 rewrite.
- **Geometry.** mao2022 polygons, domain, window and mesh hints are identical to HEAD. arabjuneghani2022 is identical
  except the substrate y -252 -> -250 (clipped to the domain, A9). The other 25 HEAD-parsable configs have identical
  normalised geometry.
- **Unjustified changes.** None found.

### 7. Fields, timing, sweep caching

- **Field export.** Field and Pockels exports had valid shapes in all 203 survey meshes. The closed-form Pockels test
  (both solvers) passes in the suite.
- **Timing pass-through.** Vector sweep points carry electrostatics (null when reused), opticalModel, modes,
  groupIndex, eo.A/B and total_ms.
- **Sweep caching.** Checked on renaud2023 with params added for LN eps par and r33, scalar:

  | Sweep | Reuse | Result |
  |---|---|---|
  | eps 27.9 -> 30 | ES re-solved (new materialHash; mesh reused) | C' 232.7871 -> 234.3628 |
  | eps 30 -> 27.9 | ES re-solved | back to 232.7871, VpiL 0.62836 (identical to print) |
  | r33 30.8 -> 25 | ES reused | VpiL 0.62836 -> 0.77414 (= x 30.8/25 exactly) |
  | wavelength 738 -> 838 | ES reused, optics re-solved | n_eff 1.9724331 -> 1.9214698 |

### 8. Performance (renaud2023 via `cli.mjs`, wall time; DevLog-026 round 4 in parentheses)

| Run | Scalar | Vector |
|---|---|---|
| single, eo_overlap | 1.24 s (1.0) | 2.07 s (1.8) |
| gap sweep | 4.89 s (5.0) | 7.97 s (8.6) |
| wavelength sweep | 2.70 s (2.8) | 6.58 s (6.8) |

- Sweep Vpi values equal DevLog-026 to 3-4 digits: scalar gap 0.5124 / 0.6284 / 0.8694 / 1.1233; vector wavelength
  0.4178 / 0.5300 / 0.6383 / 0.7524 / 0.8753.
- mao2022 bench: F4 and F5.
- Caches: F8. Memory: F11.

### 9. Documentation

F9. The schema enums (`solver`, `group_index_from`, `metal_in_window`, `vector_order`, `element_order`,
`max_vertices`) match `config.mjs`.

## Not checked

- Browser execution (the other auditor covers app/).
- WASM.
- Periodic T-rail configs.
- K6 at finer scale.
- Re-reading the cited PDFs (A2, A10).
- Instrumenting the mesher to confirm the subsegment-recreation explanation in item 4.
