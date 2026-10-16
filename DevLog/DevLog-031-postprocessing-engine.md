---
title: Postprocessing engine (solution store, variables with units, expressions, plot/derived evaluation, EO analysis)
date: 2026-10-15
status: round 3 done (mode identity X3, line quadrature X11; gates green)
owner: lane R-ENG (Claude subagent, orchestrated per DevLog-030)
scope: engine/src/postproc/*, engine/src/run.mjs (keep, numModes), engine/src/stages.mjs (EO breakdown and conventional Gamma), engine/src/sweep.mjs (globals, keep), engine/cli.mjs (--eval, --list-vars), sims/SPEC.md
---

# DevLog-031: postprocessing engine (lane R-ENG)

Parent spec: `DevLog/DevLog-030-results-postprocessing-comsol-spec.md` (decisions P1-P7, namespace P3, R-ENG/R-UI
contract). Context: `DevLog/DevLog-023-simulator-tfln-roadmap.md`. Consumer: lane R-UI (DevLog-032), which builds
against the API section below. Any change to that section is announced in the progress log with a timestamp.

## Plan (written before implementation)

Phase 1
1. `runCrossSection(text, {keep: true})`: the result is unchanged (same enumerable keys, same JSON) plus a
   non-enumerable `result.internals` (electrostatic solution, section, parsed config, optical models and solved modes,
   arm models). Structured clone and JSON skip non-enumerable properties, so a worker can post the result unchanged.
2. `engine/src/postproc/`: `units.mjs` (SI dimension vectors, unit parser, display conversion), `expr.mjs` (parser,
   unit/complex inference, compiler to array closures), `store.mjs` (datasets, meshes, variable registry, point sets,
   exact field evaluation, LRU value cache), `evaluate.mjs` (evaluatePlot, evaluateDerived, modeTable),
   `eo-analysis.mjs` (EO integrand, tensor-component and region breakdown, electrode gap, conventional Gamma),
   `sweep-store.mjs` (globals per sweep point, bounded LRU of stores), `index.mjs` (public entry).
3. Exact evaluation: electrostatics P1/P2 from the element DOFs at any barycentric point; vector modes from the
   Nedelec/Lagrange element interpolation (the solver's own basis, exported from vector-mode.mjs without behaviour
   change); scalar modes from the P1 nodal field. Quadrature: the solver's 6-point degree-4 rule (exact for every
   product used by the solver integrals). Points outside a mesh evaluate to NaN, except electrostatic variables inside
   an electrode (V = electrode potential, E = 0, as the engine's EO sampling).
4. Expressions compile to closures over typed arrays (array-at-a-time, constant folding, no per-point allocation, no
   eval/Function). Units are dimension vectors over (m, kg, s, A); `+ - min max if comparisons` require equal units;
   display units are parsed (`V/um`, `pF/m`, `1/V`, `V*cm`, ...).

Phase 2
5. EO: `eo.integrand` per point whose quadrature integral equals the engine dn_eff/V (vector: Hellmann-Feynman pencil
   form of vectorEoOverlap; scalar: eoOverlapArm weights), split by Pockels coefficient (r33, r13, r22, r51, other) and
   region; conventional Gamma with the electrode gap from the geometry; implied textbook VpiL. Reported in
   `result.eo.arms.X.breakdown`, `result.eo.arms.X.conventional`, `result.eo.conventional` with formula strings.
6. Multi-mode: `optics.num_modes` / run option `numModes`; mode table from the solved mode set; the EO / optical mode
   selection rule is unchanged.
7. Sweeps: `globals` (SI values of the run globals) on every sweep point; `keep` on sweep points; `createSweepStore`
   (globals of all points, bounded LRU of full stores); global expressions over all points -> table rows.
8. CLI `--eval EXPR [--dataset ID] [--over REGION,...] [--kind KIND] [--unit U] [--point X,Y] [--line X0,Y0,X1,Y1]` and
   `--list-vars`.

Gates: identities (es.We integral = C'/2 x symmetry; line integral of -E . t from the signal edge to the ground edge = -1 V
(t pointing signal -> ground; equals phi(end) - phi(start)); eo.integrand integral =
dn_eff/V to 1e-9 relative, scalar and vector; optical power = 1 W; es.V at an electrode = its normalised potential),
parser tests (precedence, units, complex, errors, no eval), performance (mao2022 P2, renaud2023 vector; DevLog-030 P6
targets), full engine suite sequential green, `npm run test:reference` green.

## TODO

- [x] Phase 1.1 keep internals (run.mjs, run.d.mts)
- [x] Phase 1.2 units + expression language + tests
- [x] Phase 1.3 solution store, registry, exact evaluation
- [x] Phase 1.4 evaluatePlot / evaluateDerived / selections / cut lines and points
- [x] Phase 2.5 EO integrand, breakdown, gap, conventional Gamma (stages.mjs, result.eo)
- [x] Phase 2.6 multi-mode, mode table
- [x] Phase 2.7 sweep globals, keep, sweep store
- [x] Phase 2.8 CLI --eval / --list-vars
- [x] Gates: identities, parser, performance, full suite, reference suite
- [x] SPEC.md and engine/README.md sections; final report

## API (R-ENG -> R-UI contract, v1, 2026-10-15)

All functions are plain ES modules, importable in the worker and in Node:
`import { createSolutionStore, evaluatePlot, evaluateDerived, modeTable, ... } from 'engine/src/postproc/index.mjs'`.
Types: `engine/src/postproc/index.d.mts`. Coordinates passed in and returned by the API are um (mesh units);
expression values are SI (`x`, `y` are metres inside expressions).

```ts
// run with internals kept (non-enumerable; result JSON and structured clone unchanged)
const result = runCrossSection(text, { stages, keep: true, numModes?: number /* also optics.num_modes */ });
const store = createSolutionStore(result, { cacheBytes?: number /* default 128 MiB */ });

store.datasets(): DatasetInfo[]
// DatasetInfo = { id, kind: 'es'|'opt'|'arm'|'eo'|'cutline'|'cutpoint'|'sweep', label, section, mesh: MeshId|null,
//   mode?: number /* index into the model's mode list */, selected?: boolean, arm?: 'A'|'B', point?: number,
//   parent?: string, nModes?: number }
// ids: 'es'; 'opt' (selected mode), 'opt:k'; 'armA', 'armA:k', 'armB', 'armB:k'; 'eoA', 'eoB'; 'cutline:N'; 'cutpoint:N'
store.variables(datasetId): VariableInfo[]
// VariableInfo = { name, unit /* SI unit string */, displayUnit /* suggested */, dim: number[4] /* m kg s A */,
//   description, location: 'node'|'element'|'point'|'global', complex: boolean, continuous: boolean, group }
store.mesh(meshId): { id, x: Float64Array /* um */, y, tri: Int32Array, triRegion: Int32Array, regionNames: string[],
  regionMaterials: string[], nNodes, nTris }            // shared arrays: copy before transferring
store.addCutLine({ points: [x_um, y_um][], parent?: string, n?: number /* samples, default 1000 */, label? }): DatasetInfo
store.addCutPoints({ points: [x_um, y_um][], parent?: string, label? }): DatasetInfo
store.removeDataset(id): void
store.memory(): { cacheBytes, cacheEntries, storeBytes }
store.dispose(): void

evaluatePlot(store, { dataset, expr, unit?, location?: 'auto'|'node'|'element'|'corner'|'quad', part?: 'real'|'imag'|'abs' })
 -> { values: Float64Array /* fresh, transferable */, location, mesh: MeshId|null, n, unit, siUnit, dim, min, max,
      complex, nNaN, ms,
      // cutline datasets: s (um, arc length), x, y (um) per sample; cutpoint datasets: x, y
      s?, x?, y? }
// location layouts: node -> nNodes (mesh vertices); element -> nTris (centroid); corner -> 3*nTris (tri vertex order);
// quad -> 6*nTris (solver quadrature order). auto -> node when every variable is continuous in space, else element.
// node with discontinuous variables: area-weighted average of the corner values (smoothing).

evaluateDerived(store, { kind, dataset, expr, selection?, unit?, part? })
// kind: 'global' | 'surface_int' | 'surface_avg' | 'surface_max' | 'surface_min' | 'line_int' | 'line_avg' | 'point'
// selection: { regions: (string|number)[] } (surface kinds; default all regions of the dataset mesh)
//          | { polyline: [x_um, y_um][] }   (line kinds; or a cutline dataset)
//          | { point: [x_um, y_um] } | { points: [x_um, y_um][] }   (point; or a cutpoint dataset)
 -> { kind, dataset, expr, value: number, valueIm?: number, values?: number[] /* several points */, unit, siUnit, dim,
      at?: [x_um, y_um] /* max/min location */, measure?: { value, unit } /* area m^2 or covered length m */,
      length?: number /* polyline length, m */, nSkipped?: number /* NaN points skipped */, ms }
// line kinds: line tangent t1x, t1y (unit vector) and arc length s (m) are variables; sub-segments split at the
// element crossings of every referenced mesh, 3-point Gauss each (exact for the solver interpolation along the line).

modeTable(store, datasetId): ModeRow[]
// ModeRow = { k, neff, ng, lossDbPerCm, teFraction, aeffUm2, confinement: Record<region, number>, selected, residual }

// globals and sweeps
runGlobals(result): Record<string, number>                 // SI values of the run globals (small, serializable)
GLOBAL_VARIABLES: VariableInfo[]                           // static registry of run globals
evaluateGlobals(expr, globalsList: Record<string, number>[], { unit? }) -> { values: number[], unit, siUnit, dim }
createSweepStore({ maxStores?: number /* default 2 */, maxBytes?: number /* default 512 MiB */ }) -> {
  addPoint(point /* runSweepPoint result; with keep: true its internals */), store(index) -> SolutionStore|null,
  points(), rows(expr, { unit? }) -> [{ index, values /* params */, value }], datasets(), memory() }
// runSweepPoint / runSweep points carry `globals` (always) and non-enumerable `internals` with options.keep.

// expressions (also usable standalone)
compileExpression(src, scope) / parseExpression(src) / parseUnit(u) -> { dim, factor } / formatUnit(dim)
```

Expression language: numbers (`1.5e-3`), unit literals `2[um]`, `+ - * / ^` (`^` right associative, binds tighter
than unary minus), comparisons `< <= > >= == !=`, logical `&& || !`, functions `abs real imag conj sqrt exp log log10
sin cos tan atan2 min max if`, constants `pi eps0 mu0 c_const lambda0 k0 f0 i j`, coordinates `x y` (m).

Variable namespace (P3): `es.*` everywhere (located on the electrostatic mesh); `opt.*`, `armA.*`, `armB.*` optical
fields of the dataset's mode when the evaluation dataset is that family (`opt:2` -> mode 2), else of the selected
mode; `eoA.*`, `eoB.*` everywhere, `eo.*` on arm and eo datasets (the dataset's arm); unprefixed run globals
`C C0 L Z0 nRF neff ng dneffA dneffB VpiL Vpi GammaA GammaB balance gapA gapB t_total`.

Recommended worker messages (R-UI owns the worker; shapes only):

```ts
{ type: 'run', ..., keep: true }            -> worker: store = createSolutionStore(result); post result as today
{ type: 'datasets' }                        -> { type: 'datasets', datasets, variables: Record<id, VariableInfo[]> }
{ type: 'mesh', meshId }                    -> { type: 'mesh', mesh } (copies, transferred)
{ type: 'plot', reqId, request }            -> { type: 'plot', reqId, result }   transfer result.values.buffer (+ s, x, y)
{ type: 'derived', reqId, request }         -> { type: 'derived', reqId, result }
{ type: 'modes', dataset }                  -> { type: 'modes', rows }
{ type: 'cutline' | 'cutpoints', spec }     -> { type: 'dataset', dataset }
errors                                      -> { type: 'eval-error', reqId, message } (message names the position)
```

## Progress log

- 2026-10-15 14:43 PDT Plan and API v1 written before implementation (read DevLog-030, DevLog-023, engine README,
  run/optical-stage/vector-mode/eo-overlap/electrostatics/fem/fields/params/sweep/stages/config/templates/cli).
- 2026-10-15 14:57 PDT EO analysis in (`postproc/eo-analysis.mjs`, wired in `stages.mjs`): `result.eo.arms.X.breakdown`
  (byComponent r33/r13/r22/r51/other, byTensorTerm xx/yy/zz/xy, byRegion, relativeDifferenceVsEngine) and
  `result.eo.arms.X.conventional`, `result.eo.conventional`, `result.eo.formulas`. Fixture gsg-eo-rf: breakdown vs
  engine 0 (scalar) and 2.8e-15 / 5.5e-15 (vector, arms A/B); Gamma = +1.000000 / -1.000000 (uniform gap field);
  scalar VpiL_neff 0.5273736 = engine 0.5273736. `keep` and `numModes` / `optics.num_modes` added to run.mjs/config.mjs.
- 2026-10-15 14:57 PDT Definitions aligned with the independent references of DevLog-033 (orchestrator note):
  - Tensor split: DevLog-033 splits by lab tensor term (xx |E_x|^2 -> r33; yy |E_y|^2 + zz |E_z|^2 -> r13;
    2 xy Re(E_x* E_y) -> r51; 2 yz Re(E_y* E_z) -> r22). The engine reports both: `byComponent` (mask of the Voigt
    entries of one coefficient, valid for any orientation) and `byTensorTerm` (xx, yy, zz, xy). For x-cut LN with
    propagation along crystal y and an in-plane static field the two are identical term by term (checked on the
    fixture: xx = r33, yy + zz = r13); r22 = 0 in both (its only lab term is d eps_yz, which has no first-order effect).
  - Region split: per region name (`byRegion`); the DevLog-033 ln_slab / ln_rib / other groups are sums of these.
  - Gamma: signed, g = edge-to-edge electrode gap of that arm (bounding boxes, works for electrodes on a buffer),
    numerator over Pockels regions with E_c (= E_x for x-cut), denominator over the whole arm window; `gammaEx`
    (|E_x|^2 variant), `gammaByRegion`, `gammaEquiv` = 2 g |dn| / (n_e^3 r33) as DevLog-033.
  - Textbook VpiL: lambda / (2 |dn_tb,A - dn_tb,B|), dn_tb = -(1/2) n_e^3 r33 Gamma / g = lambda g / (2 n_e^3 r33
    Gamma_mean) for equal gaps; variant `vpiLVcmNeffFactor` = VpiL_tb x n_eff,A / n_e (DevLog-033 definition;
    changed from the per-arm n_e^4 / n_eff weighting, which differs only when the arm indices differ).
  - Line identity sign: int (-E) . dl from signal to ground = phi(ground) - phi(signal) = -1 V.
- 2026-10-15 15:08 PDT API v1 unchanged in shape; additions (no removals) relative to the 14:43 entry: plot locations `corner`
  and `quad` (beyond the contract's node/element), `part` option, `evaluateDerived` returns `values` for several points,
  `regions`, `nPoints`; `DerivedResult.measure`; `breakdown.ms`; `SweepPoint.globals`. Types:
  `engine/src/postproc/index.d.mts`, `run.d.mts` (EoBreakdown, EoArmConventional, EoResult.conventional/formulas),
  `sweep.d.mts` (keep, numModes, globals). Declarations type-check with `tsc --strict`.
- 2026-10-15 15:08 PDT Implementation notes. The store keeps slim copies (meshes, DOF tables, mode vectors, P2 potential DOFs); no
  factorisation, CSR pattern or solver object is retained. Point location: walk across triangle neighbours from the
  last hit, with the engine grid locator (TriLocator) as start and fallback (same containment rule); this cut the first
  EO integral on mao2022 from 62 ms to 14-35 ms. Value cache: byte-bounded LRU (default 128 MiB); quadrature sets above
  2^20 points run in element chunks. Optical fields are power-normalised (scale = amplitudeScale / sqrt(powerW)); the
  vector EO integrand is Re[C (E_t . d_eps . E_t - d_zz E_z^2)] with C = k0 beta / (2 s^2 x^T B x), algebraically the
  solver pencil form; the scalar integrand uses the engine's centroid static-field sampling. Electrostatic variables at
  points inside an electrode: V = potential, E = 0 (as the EO sampling); other variables are NaN outside their mesh;
  integrals skip NaN points and report `nSkipped` and the measure.
- 2026-10-15 15:08 PDT Gates (all green):
  - Identities (`tests/postproc.test.mjs`, fixture gsg-eo-rf, scalar and vector): int es.We = C'/2 to 7e-15 relative
    (mao2022 P2 6.3e-13, renaud2023 P2 1.7e-13, mao2022 P1 110k triangles 1.6e-14); int -E . t from the signal face to
    the ground face = -1 V to 1e-15 at three heights; int eo.integrand = engine dn_eff/V: fixture 1.3e-14 / 1.5e-15
    (scalar A/B), 2.7e-15 / 3.8e-16 (vector A/B), mao2022 vector 4.8e-16 / 3.3e-15; coefficient parts sum to the total
    to 1e-12; result.eo breakdown vs engine <= 5.5e-15; int opt.Sz = 1 W to 5e-15; es.V on and inside electrodes = 1 and
    0 exactly; uniform gap field gives Gamma = +1 / -1 with gap 2 um; scalar VpiL_tb x n_eff/n_e = engine VpiL to 1e-6.
  - Expression tests: precedence (-2^2 = -4, 2^3^2 = 512), complex (i^2, sqrt(-4), exp(i pi)), unit inference and
    errors with positions, unit literals, host-code strings rejected (`x.constructor`, `__proto__`, quotes, `;`).
  - `npm test` sequential: 239 tests, 236 pass, 0 fail, 2 skipped, 1 todo (226 before + 13 new);
    `logs/r-eng-engine-test-20261015T1506.log`. Two regressions found and fixed on the way: EO timing shape (breakdown
    time moved to `breakdown.ms`) and the word "psi" in a formula string (a test guards against field arrays in result.eo).
  - `npm run test:reference`: 11/11 pass (`logs/r-eng-reference-test-20261015T1506.log`).
- 2026-10-15 15:08 PDT Performance (Node 23.7, `nice -n 10`; first call builds caches / second call cached; `bench/postproc-bench.mjs`):

  | Case | elements | plot first / cached (ms) | derived first / cached (ms) |
  |---|---|---|---|
  | mao2022 es P2, es.normE element | 38,280 | 3.0 / 0.3 | int es.We 8.7 / 0.9 |
  | mao2022 es P1 | 110,186 | es.normE 5.3 / 0.2; corner (330k values) 9.8 / 2.4 | int es.We 20.5 / 6.8; max es.normE 18.2 / 4.3 |
  | renaud2023 es P2 | 29,838 | es.normE 3.3 / 0.3 | int es.We 8.3 / 1.9 |
  | renaud2023 vector opt | 7,534 | opt.normE 3.5 / 0.1 | int opt.Sz 5.4 / 0.1 |
  | renaud2023 eoA / eoB (incl. locating 45k quadrature points in the ES mesh) | 7,534 | eo.integrand 4.4 / 0.02 | int 30.6 / 0.09; 16.8 / 0.08 |

  DevLog-030 P6 (plot < 50 ms, surface integral < 30 ms at 400k elements): plots scale to about 20 ms at 400k by linear
  extrapolation; cached integrals meet the target; a first (uncached) surface integral scales to about 75 ms at 400k
  (not met at that size). The engine's 80,000-vertex budget caps electrostatic meshes near 160k triangles (about 30 ms
  first call). The first EO integral per store includes building the electrostatic walk locator (about 15-20 ms once).
- 2026-10-15 15:08 PDT Open items / notes for R-UI and R-VAL:
  - Comparison with the DevLog-033 references (K4, K5, K7, K7K4) is left to R-VAL; definitions are aligned (14:57 entry).
  - `eo.*` integrand on scalar datasets uses the centroid static field (engine scalar sampling); `eo.dn*` uses the field
    at the point.
  - Scalar datasets have no Ez/Hz/Ey(TE)/Ex(TM) variables (not modelled); `ng` only for the selected scalar mode.
  - `lossDbPerCm` is null for lossless solves (no loss computed), a number for lossy-metal vector modes.
  - CLI: an expression with a leading minus needs `--eval=-...` (node parseArgs).
  - `runSweep(..., {keep: true})` keeps the internals of every point in its returned array; use `runSweepPoint` with
    `createSweepStore` for bounded retention.
  - P2 electrostatic `node` plots return vertex values only (edge-midpoint DOFs are not part of the plot result; the
    UI's own P2 display path is unaffected).

## Round 2 plan (audit simulator-r-eng-audit-2026-10-15, written 2026-10-15 15:28 PDT before implementation)

API stays backward compatible; additions are announced in the progress log.

- [x] E1/E2 deterministic point location shared with the engine sampling: walk to a candidate; when the candidate's
      smallest barycentric coordinate is below 1e-9 (point on or within 1e-9 of an element edge) use the engine grid
      locator (`electrostatics.TriLocator.find`), whose rule is the lowest triangle index among triangles with smallest
      barycentric >= -1e-12. Interior points have a unique triangle, so the store's choice equals the engine's for every
      point and does not depend on query history. Gate tests: K4 arms A and B, K7-D2.6, renaud2023 (1e-9).
- [x] E3 run-time check of complex operands for comparisons, logical operators, min, max, atan2 and the if condition
      (ExpressionError with the operator position; the compile-time check stays).
- [x] E4 one constant set for store and sweep globals: i, j, pi, eps0, mu0, c_const, and lambda0, k0, f0 from the
      point's wavelength (`globals.lambda0`, added by runGlobals when the wavelength is known).
- [x] E5 CLI: `--point` repeatable (all pairs concatenated); `--unit` repeatable and aligned with `--eval` (one unit
      for one eval, or one per eval; else an error); per-expression errors are reported in the JSON, exit 1 with the
      message on stderr.
- [x] E6 one position per message (unit errors point into the bracket); token text instead of token kinds.
- [x] E7 `a^b[unit]` without parentheses is an error with a hint; E8 prefix rules documented.
- [x] E9 gap: electrodes spanning the arm centre laterally but outside the arm window's y range are ignored (listed in
      `ignoredElectrodes`); a spanning electrode that overlaps the window's y range still makes g undefined. Test.
- [x] E10 surface max/min sample corners, edge midpoints and quadrature points, then a barycentric lattice (order 8)
      in the best element; documented.
- [x] E11 line crossings via the locator grid cells along each segment instead of a scan of every triangle.
- [x] E12 "solution store disposed" error after dispose; electrode-interior conventions documented.
- [x] E13 `result.eo.accuracyNote` with the measured default-mesh offsets vs DevLog-033.
- [x] Gates: new E1 tests, engine suite sequential, test:reference.
- [x] R-UI requests (orchestrator, during round 2): public `evaluateAtPoints`; location `p2nodes`; `rf` dataset with
      `rf.alpha_dB`; `aliasOf` on arm datasets that share the opt model; `storeForSweepPoint`.

## Round 2 progress

- 2026-10-15 15:39 PDT API additions (backward compatible; nothing removed or renamed; types in `postproc/index.d.mts`):
  - `evaluateAtPoints(store, {dataset, expr, points | x, y, unit?, part?})` -> `{values, n, unit, siUnit, dim, min, max,
    nNaN, complex, part, ms}`: public point sampling (the UI no longer needs `store.compile/dataset/run`).
  - `evaluatePlot(..., {location: 'p2nodes'})` on `es` (P2 only): values at all P2 DOFs (vertices first, then edge
    midpoints, fem.p2Space order) plus `x`, `y` (DOF coordinates, um) and `elem` (6 per triangle). Continuous expressions
    are exact at the DOFs; discontinuous ones are the area-weighted mean of the element-side values.
  - Dataset `rf` (when `rf_line` ran with a sweep): `evaluatePlot` returns one value per sweep frequency, `location:
    'sweep'`, `fGhz`. Variables `rf.f` (Hz), `rf.alpha` (field attenuation, Np/m), `rf.alpha_dB` (dB/m), `rf.nRF`,
    `rf.Z0` (complex ohm). dB convention: `dB` and `Np` are unit labels with factor 1 and dimension 1, so `dB/cm`
    rescales only the length (rf.alpha_dB in `dB/cm` gives dB per cm); a unit string never converts between dB and
    nepers (rf.alpha = rf.alpha_dB ln(10) / 20). `rf.*` names are rejected on other datasets.
  - `datasets()`: arm datasets that share the optical-stage model carry `aliasOf: 'opt'` (`'armA:k'` -> `'opt:k'`).
  - `storeForSweepPoint(text, index, {sweepStore, study?, params?, stages?, section?, meshScale?, solver?, numModes?,
    cache?, onProgress?})` -> `{store, point, reused}`: returns the retained store of that point or runs the point
    with keep and adds it to the bounded sweep store; a different text or option set clears the sweep store first.
    Sweep store gains `point(index)` and `context`.
  - `surface_max/min` results add `element`; `evaluateGlobals` adds `valuesIm` for complex rows; `runGlobals(result,
    {lambdaUm})` adds `lambda0` (m) to the globals record; exports `CONSTANT_NAMES`, `TIE_BARYCENTRIC`;
    `result.eo.accuracyNote`; `conventional.gapIgnoredElectrodes`.
- 2026-10-15 15:39 PDT Audit findings:
  - E1/E2 fixed: the walk locator returns its triangle only when the smallest barycentric is >= 1e-9; any tie or miss
    goes to the engine grid locator (TriLocator: lowest triangle index among triangles with smallest barycentric
    >= -1e-12). Interior points have a unique triangle, so the store and the engine sampling choose the same triangle
    for every point, independent of query order. int eo.integrand vs engine: K4 A/B 9.8e-15 / 1.2e-14, K7-D2.6
    8.9e-16 / 3.2e-15, renaud2023 2.7e-15 / 2.2e-16, K7-D0 5.0e-15 / 6.8e-15 (were up to 3.8e-6). Gate tests on K4,
    K7-D2.6 and renaud2023 (both arms, 1e-9) and a query-order test at element vertices. Discontinuous variables on an
    element edge take the side of that triangle; one-sided values are available through `location: 'corner'` or
    `'p2nodes'`-style element sampling (not as a point option).
  - E3 fixed: comparisons, `&& || !`, min, max, atan2 and the if condition check for complex values at run time and
    raise an ExpressionError at the operator ("complex at run time ... use real() or abs()"). `compiled.complex` means
    "complex variables involved"; the plot's `complex` flag is the run-time fact.
  - E4 fixed: one constant resolver (`resolveConstant`): pi, eps0, mu0, c_const, i, j, lambda0, k0, f0 in store and
    sweep global expressions (lambda0 from each point's globals; NaN for a point without it).
  - E5 fixed: `--point` and `--unit` repeatable; units align with `--eval` in order (one unit for several evals is an
    error); a failing expression is reported as `{expr, error}` in the JSON and on stderr, exit status 1.
  - E6 fixed: one position per message (unit errors point into the bracket, e.g. `unit [min]: unknown unit 'min' at
    position 3`); token text instead of token kinds (`unexpected '2'`).
  - E7 fixed: `a^b[unit]` without parentheses is an error with a hint; `(x^2)[um]` and `x^(2[1])` are explicit.
    E8 documented: a unit symbol is tried as written first, then as an SI prefix (p n u m c k M G T) plus symbol, so
    `Tm` is terametre and `min` is unknown; a product needs `*` or a space (`T*m`).
  - E9 fixed: electrodes spanning the arm centre laterally but entirely above or below the arm window are ignored for g
    (`gapIgnoredElectrodes`); a spanning electrode that overlaps the window height still leaves g undefined. Test.
  - E10 fixed: surface max/min sample corners, edge midpoints and quadrature points of every selected element, then a
    45-point barycentric lattice (order 8) in the best element; extrema between samples of other elements can still be
    missed (documented in the code).
  - E11 fixed: segment crossings take candidate triangles from the locator grid cells along the segment. mao2022 P1
    (110,186 triangles): 1 / 10 / 200 segments 63.9 (first call, incl. building the locators) / 2.6 / 20.6 ms
    (audit: 67 / 15 / 101 ms). surface_max first call 43.9 ms (now 12 samples per element + lattice).
  - E12: `solution store disposed` after dispose (datasets, dataset, mesh, expression scope). Conventions inside an
    electrode (documented here): es.V = electrode potential, E, D, We and the RF permittivities = 0, region = NaN. The
    default value cache stays 128 MiB (`cacheBytes` option; a worker may pass less).
  - E13 fixed: `result.eo.accuracyNote` states the measured default-mesh offsets (1.4e-3 to 3.5e-3 K4/K5/K7K4,
    0.3e-3 to 0.4e-3 K7) and the advice to quote about three significant digits.
  - E14 unchanged (performance target at 400k elements for a first uncached integral; mesh budget caps near 160k).
- 2026-10-15 15:39 PDT Gates: `tests/postproc.test.mjs` 20/20; `npm test` sequential 246 tests, 243 pass, 0 fail, 2 skipped, 1 todo
  (`logs/r-eng-r2-engine-test-20261015T1537.log`); `npm run test:reference` 11/11
  (`logs/r-eng-r2-reference-test-20261015T1538.log`); declarations type-check with `tsc --strict`.

## Round 3 (UX review DevLog/audits/simulator-results-ux-review-2026-10-15.md X3, X11)

- 2026-10-15 15:48 PDT X3, one mode index space (additions only):
  - `result.optical.mode` and `result.eo.arms.<A|B>.mode` = `{k, family, familyIndex, label, selected: true}`: `k` is the
    raw index in the solved mode list (n_eff descending, the mode-table order), `family` 'TE' when the TE fraction
    >= 0.5 (scalar: the configured polarisation), `familyIndex` the index within that family (equals the config
    `mode_index` for the default te_fraction selection), `label` e.g. 'k=2 (TE0)'. `modeIndex` keeps its meaning (config
    mode_index). Helper `modeIdentity` in `optical-stage.mjs`.
  - `modeTable` rows add `family`, `familyIndex`, `label`; optical `datasets()` entries add `modeLabel`, `family`,
    `familyIndex`, and labels read 'Optical mode k=2 (TE0), solved (n_eff ...)'.
- 2026-10-15 15:48 PDT X11: line integrals use 3-point Gauss on every piece between element crossings of each mesh the expression
  reads (exact for the solver interpolation along the line); the cut line `n` sets Line Graph sampling only. Line results
  carry `quadrature: 'gauss3_per_element_crossing'` and `nPoints`; a request with `resolution` or `n` is rejected
  with that explanation (not silently ignored).
- 2026-10-15 15:48 PDT Gates: new test (fixture, vector, numModes 4: solved k = 2, family TE0, mode identity equal across mode table,
  result.optical, result.eo, datasets; scalar k=0 (TE0); resolution rejected). `npm test` sequential 247 tests, 244 pass,
  0 fail, 2 skipped, 1 todo (`logs/r-eng-r3-engine-test-20261015T1547.log`); `npm run test:reference` 11/11
  (`logs/r-eng-r3-reference-test-20261015T1548.log`).
