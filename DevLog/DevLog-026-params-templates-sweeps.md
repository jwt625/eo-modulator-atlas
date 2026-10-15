---
title: L-PARAM - material library, runnable TFLN configs, params, templates, parametric sweeps, field export
date: 2026-10-14
status: round 2 ready for review
owner: L-PARAM (Claude subagent, DevLog-023 lane)
scope: engine/src/{config,materials,run,stages,eo-overlap,rf-line,params,templates,sweep}.mjs, engine/data/, engine/schema/, engine/cli.mjs, engine/tests/{params,templates,sweep,fields,library}-*.test.mjs, sims/SPEC.md, sims/*/config.yaml, engine/README.md
---

# DevLog-026: params, templates, sweeps (lane L-PARAM)

Roadmap: `DevLog/DevLog-023-simulator-tfln-roadmap.md` (S1, S2, D5, D6, O4). No `data/` edits, no git.

## Plan (written before implementation, 2026-10-14, between 23:04 and 23:12 PDT; see the timestamp correction in the progress log)

S1 unblock

1. Library (`engine/data/materials.json`): add RF/EO/conductor blocks with the source actually read, its locator, the
   condition (clamped/unclamped, temperature) and the primary reference the read source cites. Config syntax
   `materials.<name>.library: <key>`; config keys override library keys, one level deep for `eps_r` (`perp`/`par`)
   and named `r_pm_per_v` coefficients. Resolved provenance is reported per material (`result.materialSources`).
   Values that could not be read in an accessible source stay out and are listed under `missing`.
2. Config edits (DevLog-012 proposals 1, 3, 4, 5, 6) for mao2022, renaud2023, arabjuneghani2022 first: `optics.eo`
   arm windows from the rib polygons, target `vpi_convention` from `data/devices.csv`, explicit
   `dielectric_loss_model: none` (assumption, in `limitations`) where no tan delta is stated,
   `include_internal_inductance`, renaud2023 `rf_loss_law` (p.3). Then other TFLN uniform-line configs where the
   same edits are supported by their own provenance. `validation_status` never promoted.
3. Gate: the three configs run electrostatics + optical_mode + eo_overlap (+ rf_line where declared) in Node.

S2

4. `params:` block `{name: {value, unit, description}}` and `params.mjs`: own recursive-descent parser (numbers,
   names, `+ - * / ^`, parentheses, unary minus, `min max sqrt abs sin cos tan`, `pi`); no `eval`/`Function`.
   Expression strings are marked by a leading `=` (`x_um: ["=-gap_um/2", 3]`), so plain strings (names,
   materials, enums) never change meaning. Param values may themselves be expressions of other params (cycle
   error). Unit check: when an expression is a sum of terms that are params, numbers or number*param, every param
   unit must equal the unit implied by the key suffix (`_um`, `_nm`, `_mm`, `_ghz`, `_ohm`, `_deg`, `_Sm`).
5. `template: {type: tfln_rib_gsg, ...}` (`templates.mjs`) generating `geometry` and `optics.eo.arm_windows`;
   variants: etched rib (push-pull GSG or single arm), unetched film with loading strip (mao2022). Rewrite
   renaud2023, arabjuneghani2022, mao2022 with params + template, compare against the old polygons and metrics.
6. `study: {type: parametric, sweep: [...], outputs: [...], sweep_targets: [...]}` and `sweep.mjs`:
   `enumerateSweep`, `runSweepPoint` (by index, for a worker pool), `runSweep` (async, `onPoint`, AbortSignal);
   electrostatics reused when the geometry hash is unchanged; CLI `--sweep`. renaud2023 gap and wavelength series as
   `sweep_targets`.
7. Field export (`fields: true`, O4 contract), typed arrays only, absent by default.
8. `result.timing` pass-through of L-PERF timing objects; `optics.solver: scalar | vector` switch (vector errors until
   L-VEC's integration API passes its gates); `mesh.element_order` only if L-PERF ships P2.

Gates: `npm test` green plus new tests; 40-config regression against the pre-edit snapshot (scratchpad
`pre/`, taken 2026-10-14 23:04 PDT, engine identical to HEAD); schema and SPEC changelog in sync.

## Round 2 plan (2026-10-15 00:11 PDT, before implementation)

Inputs: audit `DevLog/audits/simulator-l-param-audit-2026-10-14.md` (A1-A19), DevLog-025 integration API, DevLog-024
and DevLog-027 requests, DevLog-028 and `validation/reference/summary.json`. Same write paths as round 1. Hardware:
one heavy Node process at a time, `nice -n 10`, `--max-old-space-size=1536`; scratch in `scratchpad/l-param-r2-*/` only.

1. Audit fixes. A1 zhang2022: read the paper's tan delta statements, declare `tan_delta_regions` with the stated
   per-material values (locators) or mark the RF-loss target not comparable, re-run and report honestly; re-check the
   other edited configs for stated loss data. A2: render Zhu 2021 Table 1 as an image and read the Si row; keep 11.7
   only if seen, else find a source or move to `missing`. A3: renaud2023 z0 target -> paper source, `comparable:
   false` with the reason. A4: done above. A5: unit checker re-derived (exact-unit vs scaled terms, recursion into
   parenthesised sums, mixed exact units in any sum rejected, param value expressions checked). A6-A9 template
   (default window must clear the footprint, strict electrode clearance, unetched film needs a loading strip,
   on_cladding window clipped below the electrodes, regions clipped to the domain). A10/A11 library locator and r51
   caveat. A12 runSweepPoint fixed/swept check. A13 free-text keys never parsed as expressions. A18 rename the study
   point limit. Tests for each code fix.
2. Vector solver: `optics.solver: vector` (and a run option `solver` that overrides the config) through
   buildVectorModel / solveVectorModes / selectVectorMode / vectorEoOverlap / vectorOpticalFields; ng from the vector
   perturbation; per-arm model reuse (arm A = optical stage); metal policy mapping reject/absent/pec_scalar->pec, lossy
   only with `optics.metal_permittivity` given and a provenance entry; scalar labels not attached to vector results;
   per-stage timing. Default stays scalar.
3. `engine/tests/reference-*.test.mjs`: K1-K6 case files unchanged through the engine (vector modes, P1/P2
   electrostatics), compared with summary.json; tolerance = reference U + a stated engine discretisation budget measured
   here; each test < ~5 s, heavier checks behind `ENGINE_REFERENCE_FULL=1`.
4. `mesh.element_order` (1 | 2) -> solveElectrostatics elementOrder (also Wheeler solves); EO sampling with
   `gradientAt` for P2; `run.mjs` uses `g.converged`. Default order decided from the reference tests (evidence logged).
5. L-UI: typed `buildSectionMesh(text, {section, meshScale, params})` and YAML helpers (`parseYamlDocument`, `getIn`,
   `setIn`, `applyOverrides`, comments preserved) with `.d.mts`.
6. Gate table scalar vs vector for mao2022, renaud2023 (+ both sweeps), arabjuneghani2022, li2022b, murai2025,
   pan2021, boynton2020, chen2023, yang2022, zhang2022. Nothing tuned to papers.

## TODO

- [x] DevLog plan and API section (this file)
- [x] material library entries with verified citations (LN entries secondary_open_access; Weis and Gaylord not readable)
- [x] config library resolution + per-key override + `materialSources`
- [x] S1 config edits (mao2022, renaud2023, arabjuneghani2022) and gate table
- [x] params + expression parser + unit check + tests
- [x] template tfln_rib_gsg (+ unetched loading strip, single arm, buffer, on-cladding) + tests
- [x] rewrite renaud2023, arabjuneghani2022, mao2022 with params + template, equivalence check (bitwise identical)
- [x] sweep study + API + CLI + sweep_targets + tests; renaud2023 sweeps
- [x] field export + tests
- [x] timing pass-through, optics.solver switch (vector errors until L-VEC integration)
- [x] JSON schema, SPEC, README, .d.mts
- [x] 40-config regression vs pre-edit snapshot
- [x] other TFLN uniform-line configs made eo_overlap/rf_line ready where provenance allows (16 more)
- [x] `mesh.element_order` (round 2; default 2 from the reference evidence)
- [x] wire `optics.solver: vector` (round 2)
- [x] round 2: audit fixes A1-A13, A18 (A10 disputed with evidence), reference tests, group-index enum, mesh/YAML helpers,
      scalar vs vector gate
- [x] re-run the reference tests against L-REF round 2 (2026-10-15 08:04 PDT, 8/8 pass)
- [ ] periodic T-rail configs: arm windows (chen2022, kharel2021, li2026ba, liu2021, ...) left for the loaded_line work

## APIs for other lanes (published 2026-10-14 about 23:23 PDT; stable unless noted here)

All functions are synchronous unless marked async; arrays in `fields` are typed-array copies (safe to transfer).

```ts
// engine/src/run.mjs
runCrossSection(text: string, options?: {
  section?: string; stages?: string[] | null; optical?: boolean; meshScale?: number;   // unchanged
  onProgress?: (m: string) => void;
  params?: Record<string, number>;   // overrides of `params` values (before expressions and templates expand)
  fields?: boolean;                  // default false: no `fields` key, result size unchanged
  cache?: object;                    // caller-owned; reuses the ES mesh/solution across runs with equal hashes
}): SimulationResult & {
  params: Record<string, number>;               // resolved param values
  materialSources: Record<string, { library: string; provenanceClass: 'standard_reference'; fromLibrary: string[];
    overridden: string[]; citations: Record<string, { source: string; locator: string; condition: string;
    verification: 'primary' | 'secondary_open_access'; primaryCited: string | null }> }>;
  geometryHash: string;              // mesh-input hash (geometry, windows, hints, meshScale)
  materialHash: string;              // + electrode potentials, boundaries, RF eps per region
  reused: { mesh: boolean; electrostatics: boolean };
  timing: { electrostatics: object | null; opticalModel: object | null; modes: object | null; groupIndex: object | null;
    eo: { A?: object; B?: object } | null; rf: { wheelerSolves: object[] } | null; total_ms: number };  // L-PERF objects, passed through
  fields?: {
    es: { x: Float64Array; y: Float64Array; tri: Int32Array; triRegion: Int32Array; regionNames: string[];
      regionMaterials: string[]; electrodeNames: string[]; nodeElectrode: Int32Array;
      phi: Float64Array;                          // nodal, V per volt of terminal voltage V_t
      ex: Float64Array; ey: Float64Array;         // per triangle, V/m per V_t (E = -grad phi)
      units: object; rect: { x0: number; x1: number; y0: number; y1: number } };
    optical: OpticalFields | null;               // optical_mode stage (window = optical_window)
    arms: { A: OpticalFields; B: OpticalFields | null } | null;   // eo_overlap stage (A may equal `optical`)
  };
}
interface OpticalFields { x: Float64Array; y: Float64Array; tri: Int32Array; triRegion: Int32Array; regionNames: string[];
  regionMaterials: string[]; window: { x: number[]; y: number[] }; solver: 'scalar' | 'vector'; polarization: 'TE' | 'TM';
  form: 'E' | 'H'; lambdaUm: number;
  modes: { n_eff: number; components: { psi: Float64Array } }[];   // scalar: psi = E_x (form E) or H_x (form H), max |psi| = 1
  units: object }                                                    // vector (L-VEC, later): components {ex, ey, ez, hx, hy, hz}
runConfig(config: ParsedConfig, options & { targets?: Target[] }): same result   // parsed-config entry used by sweeps

// engine/src/config.mjs
parseConfig(text, { params?: Record<string, number> }): ParsedConfig & { source, params: {values, defs}, substitutions, template, materialSources }
inspectConfig(text, section?, { params? }): { preview (raw = expanded config, plus params/template/materialSources), solveError, stageErrors }
expandConfig(rawDoc, { params? }): { raw, meta }   // params -> expressions -> template -> library

// engine/src/sweep.mjs
enumerateSweep(text, { study?: string | null; params?: Record<string, number> }):
  { study: string; axes: { param: string; values: number[] }[]; nPoints: number; stages: string[] | null;
    outputs: string[] | null; section: string | null; points: { index: number; values: Record<string, number> }[];
    sweepTargets: (Target & { at: Record<string, number> })[] }
runSweepPoint(text, index: number, { study?, params?, stages?, section?, meshScale?, fields?, cache?, onProgress? }):
  SweepPoint   // worker pool: one `cache` object per worker, reused across its points
async runSweep(text, { study?, params?, stages?, section?, meshScale?, fields?, signal?: AbortSignal, stopOnError?, onProgress? },
  onPoint?: (p: SweepPoint, done: number, total: number) => void):
  { study; axes; nPoints; completed; cancelled: boolean; points: SweepPoint[]; targetSummary; errors: number; elapsed_ms }
interface SweepPoint { index: number; values: Record<string, number>; params: Record<string, number> | undefined;
  metrics: Record<string, number> | null; outputs: Record<string, number | null> | null; targets: TargetResult[];
  targetSummary: object | null; warnings: string[]; timing: object | null; geometryHash: string | null;
  materialHash: string | null; reused: { mesh: boolean; electrostatics: boolean } | null;
  eo: { pushPullBalance: number | null; armNeff: { A: number; B: number | null } } | null;
  elapsed_ms: number; error: string | null; fields?: object }

// engine/src/params.mjs
parseExpression(src) / evaluateExpression(src, values) / resolveParams(block, overrides) / substituteExpressions(...)
// engine/src/templates.mjs
expandTemplate(block): { geometry, armWindows: { A, B | null }, arms, summary }
// engine/src/fields.mjs
fieldTransferables(fields): ArrayBuffer[]   // for postMessage(result, transferables)
```

Round 2 additions (2026-10-15 00:34 PDT): `runCrossSection`/`runSweep`/`runSweepPoint` options `solver` and `elementOrder`;
results `opticalSolver`, `elementOrder`, `optical.solver` (`scalar` | `vector` diagnostics: vector adds order, nDof,
teFraction, residual, effectiveAreaUm2, solverWarnings); `fields.optical`/`fields.arms` for vector: `form: 'vector'`,
`order`, `location: 'triangle_centroid'`, `convention`, `selectedMode`, `modes[].te_fraction`, `components {{ex, ey, ez,
hx, hy, hz}}` per triangle (ez, hz imaginary parts); `fields.es.elementOrder` and P2 `fields.es.p2 {{phiDof, elem}}`;
`buildSectionMesh(text, {{section, meshScale, params}})` (`src/mesh-entry.mjs`); `getIn/setIn/deleteIn/applyOverrides`
(`src/yaml-edit.mjs`); `stageErrors(config, section, {{solver}})`, `inspectConfig(text, section, {{params, solver}})`.

Config syntax (SPEC "Parameters, templates, studies"): `params: {name: {value, unit, description}}`; any value
`"=expr"` (leading `=`) is an expression of params; `template: {type: tfln_rib_gsg, ...}` replaces `geometry`;
`study:` or `studies: {name: {type: parametric, sweep: [{param, values | range: {start, stop, n}}], stages, outputs,
sweep_targets: [{at: {param: value}, metric, value, tol_*, vpi_convention, source}]}}`; `materials.<m>.library: <key>`.
Sweep point order: row-major over `sweep` (first axis outermost, last fastest).

## Progress log

Timestamp correction (2026-10-15 00:10 PDT, audit A4): the round-1 entries were written with invented clock times
(23:58 to 01:45). They are replaced by times reconstructed from file modification times (`stat`: materials.json 23:12,
params.mjs 23:13, sweep.mjs 23:19, cli.mjs 23:22, new tests 23:24-23:28, configs 23:31, SPEC/README 23:39, this file
23:43) and the coordinator's 23:30 limits message (DevLog-023); "about" marks a reconstruction. From round 2 every
stamp is taken from `date` at the moment of writing.

- 2026-10-14 23:04 PDT Pre-edit snapshot of `engine/` and `sims/` in the session scratchpad; baseline regression of
  40 configs x {electrostatics, +optical_mode} recorded (`pre-regress.jsonl`): 23 configs run, 17 fail at parse
  (missing RF permittivity: LN 11, LT 3, BTO 1; chen2022 optical metal in window; lin2026a LT dispersion range).
- 2026-10-14 23:04-23:12 PDT (corrected; was 23:20) Read DevLog-023/012, SPEC, engine README and sources, the three gate configs, devices rows and
  renaud2023 evidence and text (RF loss law 1.35 dB/cm/GHz^0.5 confirmed on p.3). Plan above.
- 2026-10-14 about 23:23 PDT (corrected; was 23:58) Library entries (LN congruent clamped eps and r, SiO2 and Si RF eps, bulk Au at 293 K) with the
  sources actually read; Weis and Gaylord 1985 not accessible (publisher login), so the LN entries are labelled
  `secondary_open_access`. params.mjs, templates.mjs, fields.mjs, sweep.mjs written; config expansion pipeline;
  run.mjs split into runCrossSection/runConfig with cache, timing pass-through and field export. mao2022 and
  arabjuneghani2022 S1 edits; renaud2023 rewritten as a push-pull G-S-G template config; arabjuneghani2022 and
  mao2022 rewritten with params + template: every metric bitwise identical to the S1 hand-written polygons. API
  section published above. L-PERF's sparse.mjs was mid-edit (missing export), so runs use a scratch work copy with
  the HEAD solver files until the tree is consistent.
- 2026-10-14 about 23:31 PDT (corrected; was 2026-10-15 00:40) Tests: params (5), templates (5), library (3), sweep (4), fields (3) = 20 new. Template rewrites
  of arabjuneghani2022 and mao2022 reproduce every polygon and every metric bitwise (only region names changed).
  renaud2023 gap and wavelength studies run. 16 more uniform two-arm configs got S1 edits by a script (dry run reviewed,
  then applied); 4 LN configs missing RF permittivity got library materials.
- 2026-10-14 about 23:32 PDT (corrected; was 2026-10-15 01:05) Coordinator limits received (one CPU-heavy Node process at a time, `nice -n 10`,
  `--max-old-space-size=1536`); all later runs comply, the test suite runs with `--test-concurrency=1`. Two earlier
  `npm test` runs (before the message) used the default runner concurrency.
- 2026-10-14 about 23:39 PDT (corrected; was 2026-10-15 01:20) Real tree consistent again after L-PERF edits: `node --test --test-concurrency=1 tests/*.test.mjs`
  174 tests, 173 pass, 0 fail, 1 todo (D5). Regression on the real tree and on the work copy (HEAD solver files + this
  lane's files) recorded below. SPEC, schema, README updated.

## Round 2 results (written 2026-10-15 00:34 PDT)

### Audit dispositions (`DevLog/audits/simulator-l-param-audit-2026-10-14.md`)

| ID | Disposition | Change / evidence |
|---|---|---|
| A1 | applied | zhang2022: `dielectric_loss_model: tan_delta_regions` with the paper's stated values (p.5 Sec. 3.B: Si 0.013, LN 0.008, deposited SiO2 0.006, cited by the authors from their refs. [30]-[32]); air lossless (assumption, project_inference); false "no loss tangent stated" note and limitation replaced. Re-evaluated (P2, 2026-10-15): rf_loss@250 GHz 16.61 dB/cm vs 13 (tol 20 %) -> fail (+28 %); Z0@250 40.35 vs 41.5 pass. Region energy fractions: substrate 0.342, BOX 0.295, LN slab 0.162, cladding 0.104. A grep of the 20 edited papers' `references/*/text.md` for loss tangent / tan delta found only zhang2022. |
| A2 | verified, kept | Zhu 2021 Table 1 rendered as an image (arXiv PDF p.5 via `sips`, transparency flattened) and read: Si row RF dielectric constant 11.7, SiO2 3.9, LiNbO3 eps11,22 = 44, eps33 = 27.9 "(clamped, high-frequency response)". Locators now say "read from the rendered page image 2026-10-15". The auditor's text extraction missed the Si row; round 1 pypdf extraction had it. |
| A3 | applied | renaud2023 z0 target: source `paper_id renaud2023, p.2, basis design_intent, comparable: false` with the reason. |
| A4 | applied | round-1 timestamps replaced (see the correction note in the progress log); round-2 stamps from `date`. |
| A5 | applied | unit checker re-derived (`expressionUnit`): exact vs scaled vs unknown terms; `w_nm / 1000` into `_um` accepted unchecked; `(g_um + w_nm)/2`, `max(g_um, w_nm)` rejected at any depth, also under unit-less keys; param value expressions checked against the param unit. Tests added. |
| A6 | applied | strict footprint-electrode clearance; default window must contain the footprint (error names the half widths). Tests. |
| A7 | applied | unetched film requires `loading_strip`. Test. |
| A8 | applied | on_cladding default window top clipped to the electrode bottom. Test. |
| A9 | applied | substrate clipped to the domain; waveguides must lie inside an explicit domain. Test. |
| A10 | disputed (locator clarified) | the p.17 text does carry the label: pypdf page 17 "eps_r,z = 28 and eps_r,x/y = 44 for clamped, high-frequency response"; the unlabeled sentence the auditor quoted is on p.19 ("which is very high (eps_r,z = 28 and eps_r,x/y = 44)"). Locator now names both pages. |
| A11 | applied | r51 condition carries the source's caveat (piezoelectric contribution not eliminated; clamped value possibly near the theoretical 14.94 pm/V). |
| A12 | applied | `runSweepPoint` rejects a fixed override of a swept param. Test. |
| A13 | applied | free-text keys never expanded (`FREE_TEXT_TOP_LEVEL`, `FREE_TEXT_KEYS` in config.mjs; SPEC). Test. |
| A14-A16 | noted | no change (physics notes, gold value, renaud fidelity). |
| A17 | noted | `engine/node_modules/node_modules` symlink: no longer present at round-2 start (checked 00:10). Probably created by this lane's round-1 work-copy script (`ln -sfn` into an existing directory); removed by someone before round 2. |
| A18 | applied | `sweep.mjs` limit renamed `MAX_STUDY_POINTS`. |
| A19 | applied | reference tests run the K-case files as written (case r33 30.9 set), never the library. |

### Vector solver wiring

`engine/src/optical-stage.mjs` (`solveOptical`, `armOverlap`, `solvedFields`, `scalarModeConverged`) dispatches the
optical and EO stages: vector = `buildVectorModel` (order `optics.vector_order`, default 2; metal policy mapped),
`solveVectorModes` (numModes max(4, 2 (mode_index + 1) + 2), one retry with twice the count), `selectVectorMode` by TE
fraction, ng = `mode.ng` (perturbation) or a central difference over two warm-started solves, EO = `vectorEoOverlap`
with `sampleStaticFieldQ` (6 points per optical triangle, P2-aware), fields = `vectorOpticalFields` copied to typed
arrays. Arm A reuses the optical stage; warm data pass between sweep points through the run cache. Scalar results keep
their labels; vector results carry `full_vector_optical` + element label only. Per-mode convergence (`modeConverged[k]`,
DevLog-024 round 2) is required for every mode a stage uses. Default solver stays scalar.

Per-stage timing example (mao2022, vector, P2, FD ng): electrostatics 475 ms of 4.5 s total; each vector arm model +
solve about 1 s (41,928 DOF, order 2). `result.timing` carries `opticalModel`, `modes`, `groupIndex`, `eo.{A,B}`.

### Electrostatic element order: default P2 (evidence)

| Case (reference: scikit-fem P2, Richardson) | P1 scale 2 | P2 scale 2 | P1 time | P2 time |
|---|---|---|---|---|
| K4 C' (146.5187 +- 0.012 pF/m) | +4.3e-3 | +7.9e-4 | 0.42 s | 1.06 s |
| K4 Z0 | -3.5e-3 | -4.7e-4 | | |
| K4 VpiL, vector arms (2.27861) | -7.2e-3 | -1.9e-3 | 2.8 s | 4.0 s |
| K6a C' (214.245, t 0.1 um) | +3.7e-3 | +3.1e-4 | 0.44 s | 0.86 s |
| K6b C' (174.321) | +3.6e-3 | +3.3e-4 | 0.38 s | 0.96 s |

P1 at scale 1.5 on K4 is still +3.5e-3 on C'; P1 and P2 at scale 1 exceed the 80,000-vertex budget on K4/K6 (no budget
change proposed: scale 2 with P2 already meets the reference within 1e-3). Decision: `DEFAULT_ELEMENT_ORDER = 2`
(config `mesh.element_order: 1` restores P1). Consequence for the 40 configs: C' moves by -2.5e-3 to -9.1e-3 relative
(P1 overestimated C').

### Reference tests (`engine/tests/reference-cases.test.mjs`, live tree 2026-10-15 00:34 PDT)

| Case | Quantity | Engine | Reference (U) | Difference | Test tolerance |
|---|---|---|---|---|---|
| K1 (vector o2, scale 1) | n_eff / ng / TE fr. | 2.4472500 / 4.196089 / 0.983457 | 2.4472257 (1.5e-6) / 4.196166 (1.8e-5) / 0.983442 | +2.4e-5 / -7.6e-5 / +1.6e-5 | U + 6e-5 / 2e-4 / 5e-5 |
| K2 (scale 2) | n_eff / ng / TE fr. | 1.8941883 / 2.290833 / 0.990610 | 1.8941658 (1.9e-6) / 2.290850 / 0.990608 | +2.2e-5 / -1.7e-5 / +2.5e-6 | U + 6e-5 / 5e-5 / 1e-5 |
| K3 (scale 2) | n_eff / ng / TE fr. | 1.9123836 / 2.265024 / 0.993989 | 1.9123755 (8e-8) / 2.265028 / 0.993989 | +8.1e-6 / -4.8e-6 / -6e-7 | same |
| K4 P2 scale 2 | C', C0', Z0, n_RF | 146.635, -, 45.312, - | 146.519, 36.952, 45.333, 1.99125 | +7.9e-4, +1.5e-4, -4.7e-4, +3.3e-4 (rel) | U + 2e-3, 5e-4, 1.2e-3, 8e-4 |
| K4 vector EO | VpiL / mean dn | 2.27435 | 2.27861 (5.7e-4) | -1.9e-3 (rel) | U + 5e-3 |
| K5 g3..g8 (flag) | VpiL | 1.27408 / 1.76562 / 2.27435 / 2.80106 / 3.91459 | 1.27842 / 1.77050 / 2.27861 / 2.80580 / 3.91970 | -3.4e-3 .. -1.3e-3 | U + 6e-3 |
| K6a / K6b P2 scale 2 | C' | 214.311 / 174.379 | 214.245 / 174.321 | +3.1e-4 / +3.3e-4 | U + 1e-3 |

All 7 default tests pass (K5 with ENGINE_REFERENCE_FULL=1 also passes, 18.8 s). Each default test 1.2-5.0 s. Not
gated, per the L-REF audit notes of 2026-10-15: Tidy3D values, per-arm dn (mean |dn| used), K4 `vpil_scalar_vcm` (a
textbook Gamma estimate, not the engine's scalar FEM: engine scalar K4 VpiL 2.27575 vs vector 2.27435, the reference
"scalar Gamma" 2.5635), the K6b closed form. To re-run after L-REF round 2 rewrites the case indices (tests read cases
and summary.json at run time; no hashes).

### TFLN paper gate, scalar vs vector (live tree 2026-10-15 00:34 PDT: P2 electrostatics, L-PERF mesher fix, configured mesh)

VpiL in V cm; targets marked [nc] are `comparable: false` (not evaluated); "simulated" = the paper's own simulation.

| Config | Scalar | Vector | Vector / scalar | Paper VpiL | Status scalar / vector | n_eff s / v | ng s / v | Time s / v (s) |
|---|---|---|---|---|---|---|---|---|
| mao2022 | 2.802 | 2.768 | -1.2 % | 1.9 | fail / fail | 2.1360 / 2.1232 | 2.611 / 2.609 | 2.2 / 4.9 |
| renaud2023 | 0.628 | 0.638 | +1.6 % | 0.55 | fail / fail | 1.9724 / 1.9657 | 2.368 / 2.380 | 1.3 / 6.7 |
| arabjuneghani2022 | 3.985 | 4.022 | +0.9 % | 3.3 | fail / fail | 1.8535 / 1.8458 | 2.231 / 2.232 | 1.3 / 4.7 |
| li2022b | 0.865 | 0.867 | +0.3 % | 1.1 [nc]; 0.90 simulated | -, pass / -, pass | 2.0506 / 2.0510 | 2.515 / 2.516 | 3.6 / 27.4 |
| murai2025 | 2.545 | 2.566 | +0.8 % | 2.7 [nc]; 2.5 simulated | -, pass / -, pass | 1.9363 / 1.9349 | 2.262 / 2.267 | 1.6 / 6.2 |
| pan2021 | 4.216 | 4.253 | +0.9 % | 3.67 [nc]; 4.06 simulated | -, pass / -, pass | 1.8126 / 1.8006 | 2.262 / 2.280 | 1.8 / 5.8 |
| boynton2020 | 4.983 | 4.941 | -0.9 % | 6.67; 4.88 simulated | fail, pass / fail, pass | 1.7001 / 1.7007 | 1.980 / 1.979 | 1.0 / 3.1 |
| chen2023 | 2.761 | 2.692 | -2.5 % | 1.29 [nc] (slow light) | - / - | 1.6608 / 1.6274 | 2.140 / 2.081 | 1.4 / 4.7 |
| yang2022 | 2.594 | 2.634 | +1.5 % | 2.37 | pass / pass | 1.9346 / 1.9324 | 2.250 / 2.254 | 2.5 / 10.2 |
| zhang2022 | 2.167 | 2.195 | +1.3 % | 2.3 [nc] | - / - | 1.9191 / 1.9147 | 2.255 / 2.264 | 1.7 / 6.8 |

All push-pull balances within 2e-4 of -1. Vector TE fractions 0.990-0.999.

renaud2023 sweeps (Vpi, V; paper in parentheses; tol 15 %):

| Point | Scalar | Vector | Paper |
|---|---|---|---|
| gap 2.5 um | 0.512 pass | 0.520 pass | 0.47 |
| gap 3 um | 0.628 pass | 0.638 fail (+16 %) | 0.55 |
| gap 4 um | 0.869 pass | 0.883 pass | 0.79 |
| gap 5 um | 1.123 fail | 1.141 fail | 0.93 |
| 532 nm | 0.415 pass | 0.418 pass | 0.42 |
| 638 nm | 0.524 fail | 0.530 fail | 0.45 |
| 738 nm | 0.628 pass | 0.638 fail (+16 %) | 0.55 |
| 838 nm | 0.738 pass | 0.752 pass | 0.85 |
| 938 nm | 0.854 pass | 0.875 pass | 0.80 |

Wall time: scalar 5.9 s (gap) / 3.9 s (wavelength); vector 32.5 s / 33.3 s (default optical meshing refines the whole
slab across the window at lambda/(22 n): 135,725 DOF per arm at 738 nm). Nothing tuned to papers.

### Regression, 40 configs x {ES, ES + mode}, HEAD (git archive) vs live tree (2026-10-15 00:34 PDT)

16 rows unchanged (configs that fail identically before and after). 10 rows change error status (gao2024, renaud2023,
valdez2022, valdez2023 now run; meng2023 now meshes and fails "electrodes 0 and 1 share an edge", a config geometry
fault). Every other row: C' -2.5e-3 to -9.1e-3 relative (P2 default; plus arm-window refinement where optics.eo was
added), n_eff and ng unchanged to 1e-6 except mao2022 (-5.5e-5, library constants + mesher fix), arabjuneghani2022
(-2.8e-4, library indices), wang2022 (-3.9e-4, L-PERF mesher conformity fix). `group_index_from:
finite_difference_wavelength` configs again use finite differences (ng identical to HEAD to 1e-12 where the mesh is
unchanged).

### Open items (round 2)

- Re-run the reference tests after L-REF round 2 (new case indices); budgets may need re-measurement.
- Vector default optical meshing is heavy for wide-slab windows (renaud2023 135k DOF per arm); a vector-specific
  sizing (refine boxes around the rib, `cornerRefine`) would cut it; not done (no tuning without a convergence study).
- mao2022 / renaud2023 / arabjuneghani2022 VpiL remain 15-47 % above the measured values with either solver;
  vector vs scalar differs by 1-3 %, so the scalar approximation is not the cause.
- zhang2022 RF loss with the stated tan delta now 28 % above the measured 13 dB/cm at 250 GHz (fail).
- meng2023 geometry fault; he2019 BCB permittivity; LT library entries; periodic T-rail arm windows.
- rf_line of li2026aa, lin2025, qi2024 runs after L-PERF's Wheeler change (re-run 07:55, P2): Wheeler spread 0.0099 /
  0.0042 / 0.0145; lin2025 rf_loss@67 GHz 5.309 vs 5.3 dB/cm (pass; the target is the paper's test CPW, not the MZM).
- Lossy-metal vector runs need a sourced metal permittivity per config; none is configured.

## Material library (engine/data/materials.json `library`)

| Key | Field | Value | Condition | Source read (locator) | Verification |
|---|---|---|---|---|---|
| lithium_niobate_congruent | eps_r | perp 44.0, par 27.9 | clamped, high-frequency (as labelled); T, f not stated | Zhu et al., Adv. Opt. Photon. 13, 242 (2021), arXiv:2102.11956, Table 1 (p.5), also p.17 text | secondary_open_access (no primary cited for the table) |
| lithium_niobate_congruent | r_pm_per_v | r13 8.6, r22 3.4, r33 30.8, r51 28.0 | clamped experimental; wavelength not stated | Veithen, Gonze, Ghosez, arXiv:cond-mat/0311240v1, Table I row "Clamped Exp. [22]" (p.3) | secondary_open_access (primary: Rauber 1978, not read) |
| lithium_niobate_congruent | alternatives.r_pm_per_v_unclamped | r13 10.0, r22 6.8, r33 32.2, r51 32.6 | unclamped experimental | same table, row "Unclamped Exp. [22]" | secondary_open_access; documentation only, not applied |
| silicon_dioxide | eps_r | 3.9 | as tabulated | Zhu et al. 2021 Table 1 | secondary_open_access |
| silicon | eps_r | 11.7 | as tabulated | Zhu et al. 2021 Table 1 | secondary_open_access |
| gold_bulk_293k | sigma_Sm | 4.5167e7 (= 1 / 2.214e-8 ohm m) | annealed 99.999 % bulk, 293 K | Matula, J. Phys. Chem. Ref. Data 8, 1147 (1979), Table 5 p.1209 (NIST SRD scan, page image read) | primary |

Missing (listed in the file): LiTaO3 RF permittivity and Pockels tensor (the only accessible table, Zhu Table 1, gives
no condition and no primary; values look inconsistent with other LT data, so not entered); LN unclamped eps;
Weis and Gaylord 1985 itself (publisher login, 2026-10-14); loss tangents; thin-film gold. Zhu Table 1 lists LN
r13 9.6, r22 6.8, r33 30.9, r51 32.6 without a condition: these mix the clamped/unclamped sets of Veithen Table I and
were not used. Web access: 4 web searches, arXiv (2 PDFs), NIST SRD (1 PDF), Springer (login redirect, not
followed), one vendor PDF (unreadable, not used); a few seconds between requests.

## Config change list (sims/*/config.yaml, simulation inputs only; validation_status unchanged everywhere)

| Config | Change | Reason |
|---|---|---|
| mao2022 | LN `library` (eps perp 44.0, r13/r22/r51 from library; paper eps par 28 and r33 31 kept as overrides); `silicon: {library}`; `gold: {library: gold_bulk_293k}` (4.5167e7, was placeholder 4.1e7); `optics.eo` two-arm single-ended; target vpi_convention mzm_push_pull; `include_internal_inductance: true`; `dielectric_loss_model: none` + limitation; then `params` + `template` (unetched film + a-Si strip) replacing `geometry` | S1 items 1-2, placeholders replaced by sourced values; S2 template |
| arabjuneghani2022 | LN, SiO2, Si fully from library (were unverified placeholders incl. n 2.211/2.138); gold library; `optics.eo`; vpi_convention; loss declarations + limitation; then `params` + `template` (on_buffer electrodes, waveguide offset D) | same |
| renaud2023 | rewritten: push-pull G-S-G template (was one gap, signal on +x), `params` incl. `wavelength_nm`; LN/SiO2/Si/Au library; `rf_loss_law` 1.35 dB/cm/GHz^0.5 (p.3, verified in references/renaud2023/text.md); vpi_convention on the VpiL target, new `vpi_dc_v` target (devices row vpi_dc_v 0.55); `studies.gap` and `studies.wavelength` with `sweep_targets` from the renaud2023-* rows; optical window now the template default (old window |x| < 2 um overlapped the electrodes at 1.5 um) | S1 item 2 (parse fix), S2 items 5-6 |
| boynton2020, chen2023, chen2026, he2019, li2022b, li2026aa, lin2025, lin2026a, murai2025, pan2021, qi2024, wang2022a, wang2024a, xu2022, xue2023, yang2022, zhang2022 | `optics.eo` (two_arm_field_resolved, terminal drive from line.differential, A = optical_window, B = A mirrored onto the `_l` waveguide; B checked inside the domain and clear of every electrode); `vpi_convention` from the cited devices row (not added where the row says unspecified or resonance_tuning_derived: chen2023, qi2024, zhang2022); `include_internal_inductance: true` for skin-effect models; `dielectric_loss_model: none` + limitation; provenance entries | DevLog-012 proposals 1, 3, 4, 5 |
| boynton2020, lin2025, murai2025, pan2021, li2022b, xu2022 | `vpi_convention: mzm_push_pull` on the paper-simulated VpiL target (source cites the paper, not a device row) | the paper's only Vpi-bearing devices row(s) are mzm_push_pull; Tier C targets become evaluable |
| gao2024, meng2023, valdez2022, valdez2023 | LN `library`, `silicon_dioxide: {library}`, `silicon: {library}` + provenance | parse failure (missing RF permittivity) |

Not changed: he2019 stays blocked (BCB permittivity not stated); churaev2023, nelan2022, vanackere2023 (silicon
nitride permittivity, no library entry); cai2025, sayem2026c (LT, no library entry); deng2026 (BTO); gao2024
eo_overlap (single-pass dual-arm drive needs the config owner's reading, DevLog-012 item 2); periodic T-rail configs.
renaud2023 `z0_ohm` target cites devices field z0_ohm, which is empty in data/devices.csv (the paper only states a
50 ohm design intent, p.2): left as written, flagged for the config owner.

## Results

### S1 gate (real tree, Node 23.7.0, configured mesh, 2026-10-14)

| Config | Stages | VpiL V cm (target) | Vpi V | balance | n_RF (target) | Z0 ohm (target) | n_eff | ng (target) | RF |
|---|---|---|---|---|---|---|---|---|---|
| mao2022 | ES, mode, EO, RF | 2.797 (1.9, fail +47 %) | 4.66 | -1.0006 | 2.354 (2.34 sim, pass) | 41.98 (44 sim, pass) | 2.1361 | 2.611 (2.62 sim, pass) | Wheeler, spread 0.0155 (flag level 0.01); no at_ghz target |
| renaud2023 | ES, mode, EO, RF | 0.625 (0.55, fail +13.7 %) | 0.625 (0.55, fail) | -1.0000 | 2.394 static | 34.2 (50, fail; widths assumed) | 1.9724 | 2.368 (2.38, pass) | paper loss law (input); n_RF@50 not evaluated |
| arabjuneghani2022 | ES, mode, EO, RF | 3.978 (3.3, fail +20.5 %) | 7.96 | -0.9998 | 2.160 (2.2, pass) | 51.55 (50.5, pass) | 1.8536 | 2.231 (2.23 sim, pass) | rf_loss@67 GHz 4.316 dB/cm (3.6 +-20 %, pass, flagged: spread 0.0173) |

### Other uniform-line TFLN configs now running eo_overlap + rf_line

| Config | VpiL V cm | balance | evaluated targets |
|---|---|---|---|
| boynton2020 | 4.977 | -1.0000 | VpiL 6.67 measured fail; VpiL 4.88 paper-simulated pass; Z0 pass; ng pass; n_eff 1.700 vs 1.757 fail |
| chen2023 | 2.751 | -0.9983 | n_RF fail (VpiL target comparable: false, slow-light) |
| chen2026 (LT) | 2.699 | -1.0004 | VpiL 2.4 pass; n_RF@47 pass |
| li2022b (532 nm) | 0.863 | -1.0001 | VpiL 0.90 paper-simulated pass; ng, n_RF, Z0 pass |
| murai2025 | 2.533 | -1.0000 | VpiL 2.5 paper-simulated pass; ng, n_RF, Z0 pass |
| pan2021 (1957 nm) | 4.204 | -0.9997 | VpiL paper-simulated 4.06 pass; ng, Z0 pass |
| wang2022a, xu2022, xue2023 | 2.097, 2.038, 0.451 | about -1 | none evaluated (Vpi targets comparable: false) |
| wang2024a (LT) | 2.730 | -0.9999 | ng pass |
| yang2022 | 2.590 | -1.0000 | VpiL 2.37 pass; n_RF fail; Z0, ng pass |
| zhang2022 | 2.161 | -1.0000 | Z0@250 and loss@250 pass (Vpi row unspecified) |
| li2026aa, lin2025, qi2024 | 2.681, 2.243, 2.854 (EO only) | about -1 | EO: li2026aa VpiL/Vpi pass, lin2025 VpiL 2.7 and 2.64 fail; rf_line fails: "mesh: vertex budget exceeded" in the first Wheeler recessed solve (0.25 delta/2) |
| lin2026a (LT) | - | - | optical fails as before (LT dispersion table starts at 0.45 um, config at 375 nm) |

### renaud2023 sweeps (real tree; 1 cm, push-pull, scalar mode, clamped library r)

| Gap um (738 nm) | Vpi engine V | Vpi paper V | diff | status (tol 15 %) |
|---|---|---|---|---|
| 2.5 | 0.510 | 0.47 | +8.4 % | pass |
| 3.0 | 0.625 | 0.55 | +13.7 % | pass |
| 4.0 | 0.866 | 0.79 | +9.6 % | pass |
| 5.0 | 1.119 | 0.93 | +20.3 % | fail |

| Wavelength nm (3 um gap) | Vpi engine V | Vpi paper V | diff | n_eff | ng |
|---|---|---|---|---|---|
| 532 | 0.413 | 0.42 | -1.6 % | 2.1035 | 2.530 |
| 638 | 0.521 | 0.45 | +15.9 % (fail) | 2.0297 | 2.424 |
| 738 | 0.625 | 0.55 | +13.7 % | 1.9724 | 2.368 |
| 838 | 0.734 | 0.85 | -13.6 % | 1.9214 | 2.328 |
| 938 | 0.850 | 0.80 | +6.2 % | 1.8748 | 2.295 |

Wall time (real tree, after L-PERF changes): gap study 2.66 s (4 points, each remeshes), wavelength study 2.25 s
(electrostatics solved once, points 2-5 reuse mesh and solution: 449, 336, 260, 212 ms). The engine curve is monotonic
in wavelength while the paper's 838/938 nm points are not (0.85 then 0.80 V); the paper notes higher-order modes at
short wavelengths; Pockels dispersion with wavelength is not modelled.

### Regression (40 configs x {ES, ES+mode, all ready stages}; pre-edit snapshot = HEAD)

Work copy (this lane's files with the HEAD solver files) vs pre-edit: 17 configs unchanged bitwise (metrics, errors,
warnings, readiness), 18 with changed electrostatic metrics, 5 that newly parse. Differences:
- arm windows added (18 runnable configs incl. mao2022, arabjuneghani2022): C' changes 2e-4 to 1.7e-3, C0' about 1e-4 (the arm B
  window is an electrostatic refinement source since Q2 N1, so the mesh changes; an indication of the discretisation
  error at the configured meshes). n_eff, ng unchanged where materials are unchanged.
- mao2022, arabjuneghani2022: library constants (eps perp 43 -> 44; arab LN indices from Zelmon and SiO2 from Malitson):
  n_eff 1.85399 -> 1.85359, ng 2.23124 -> 2.23069 (arab); warning `library_material_constants_used` added.
- readiness: eo_overlap and rf_line blocked -> ready for 19 configs (the 18 above and renaud2023); renaud2023, gao2024, valdez2022, valdez2023 parse
  (ES + mode run); meng2023 parses but meshing fails: "electrodes 0 and 1 share an edge" (pre-existing geometry
  issue of that config, previously hidden by the parse failure).
Real tree vs work copy: only L-PERF's group-index method (perturbation) differences, ng <= 2.7e-5 relative, VpiL
<= 4e-8; no error or status change.

## Limitations

- LN RF and EO library constants are from secondary open-access compilations (primary not read); clamped values are
  compared with Vpi measured at 10 kHz - 1 MHz; Pockels dispersion with wavelength is not modelled.
- `dielectric_loss_model: none` is an assumption in every edited config (conductor-only attenuation).
- Arm B windows are mirrors of arm A; window size convergence was not re-studied.
- Unit check covers sums of params and number*param terms only; products/quotients of params are unchecked.
- Sweep reuse covers electrostatics only; optical meshes are rebuilt per point.
- The template covers x-cut push-pull/single-arm GSG ribs and the loaded unetched film; no CPW with substrate undercut,
  no z-cut, no sloped loading strip.

## Requests to other lanes

- L-PERF: Wheeler recessed solves of li2026aa, lin2025, qi2024 hit "mesh: vertex budget exceeded" at the 0.25 delta/2
  recess (rf_line fails there); meng2023 "electrodes 0 and 1 share an edge" is a config geometry issue (config owner).
- L-VEC: `optics.solver: vector` is parsed and rejected with a clear message; flip `VECTOR_SOLVER_AVAILABLE` in
  config.mjs and route `buildOpticalModel/solveModesAt` through the vector API when DevLog-025 publishes it;
  `fields.optical.modes[].components` takes `{ex, ey, ez, hx, hy, hz}`.
- L-UI: APIs above; `fieldTransferables(result.fields)` for postMessage; one `cache` object per worker for
  `runSweepPoint`.
- 2026-10-14 23:43 PDT (corrected; was 2026-10-15 01:45) Lane done; ready for the fresh-context audit (DevLog-023 O5). Scratch files (pre-edit snapshot,
  work copy, downloaded PDFs, regression JSONL) deleted from the session scratchpad; the pre-edit state is HEAD
  (`git show HEAD:engine/...`), so the regression can be re-run from git. No background processes left.
- 2026-10-15 00:25 PDT Round 2 in progress. Audit fixes A1-A3, A5-A13, A18 applied with tests (A10 disputed, see "Audit
  dispositions"). Vector solver wired (`optical-stage.mjs`), `group_index_from: perturbation` default, `mesh.element_order`
  with P2 default (evidence below), P2-aware sampling (scalar: gradientAt at centroids; vector: L-VEC
  `sampleStaticFieldQ`), per-mode convergence, warm starts through the sweep cache, `buildSectionMesh`, `yaml-edit.mjs`.
  `tests/reference-cases.test.mjs` (K1-K4, K6; K5 behind ENGINE_REFERENCE_FULL=1) and
  `tests/fields-solver-options.test.mjs`. Full suite on the live tree: 213 tests, 211 pass, 0 fail, 1 skipped (K5), 1 todo.
- 2026-10-15 00:34 PDT Round 2 results section written (audit dispositions, vector wiring, element order evidence,
  reference tests, scalar/vector gate, sweeps, regression, open items). Session then interrupted by an API session limit
  (coordinator message); last state: all round-2 code, tests and DevLog sections on disk.
- 2026-10-15 07:55 PDT Resumed after the interruption. State check: files intact; sequential suite showed 1 failure,
  `tests/optical-runner.test.mjs` "YAML/runtime/schema optical policy" (it pinned the old 3-value `metal_in_window`
  enum; my 00:25 schema edit added the vector policies). Updated that existing test to the new enum plus a check that
  `pec` / `lossy` are rejected for the scalar solver (an existing engine test outside the new-test names, edited because
  it encodes the config/schema contract this lane owns). Reference tests re-run on the L-REF round-2 case files
  (rewritten 00:32, references not yet regenerated per DevLog-028): 7 pass.
- 2026-10-15 08:05 PDT Reference tests re-run against L-REF round 2 (summary.json saved 08:02; K1-K5 case YAMLs with 10-digit
  indices). Test reads `dn_mean_abs_per_V` (primary EO comparand) and also gates it for K5; budgets re-measured and set to
  about 2.5x the new differences (K2/K3 ng 5e-5 -> 1e-4, TE fraction 1e-5 -> 1.5e-5, K5 VpiL 6e-3 -> 9e-3; others
  unchanged). Tree state: L-VEC round 3 was editing `vector-mode.mjs` (saved 08:01, 08:04:08, 08:04:21); two runs (08:03:59
  with the 08:01 version, 08:04:43 with the 08:04:21 version) gave identical engine values. Result: 8/8 pass
  (K5 with ENGINE_REFERENCE_FULL=1, 12.0 s; other tests 0.5-2.5 s).

  | Case | Engine | Reference (U) | Difference |
  |---|---|---|---|
  | K1 n_eff / ng / TE fr. (vector o2, scale 1) | 2.4472281 / 4.196105 / 0.983450 | 2.4472234 (5.9e-7) / 4.196167 (8.6e-7) / 0.983442 | +4.7e-6 / -6.2e-5 / +7.4e-6 |
  | K2 (scale 2) | 1.8941659 / 2.290816 / 0.990604 | 1.8941671 (5.8e-8) / 2.290850 / 0.990607 | -1.1e-6 / -3.4e-5 / -3.8e-6 |
  | K3 (scale 2) | 1.9123716 / 2.265003 / 0.993985 | 1.9123755 (1.9e-7) / 2.265029 / 0.993990 | -3.9e-6 / -2.5e-5 / -4.8e-6 |
  | K4 P2 scale 2: C' / Z0 | 146.635 / 45.312 | 146.519 (0.012) / 45.333 | +7.9e-4 / -4.7e-4 rel |
  | K4 vector EO: VpiL / mean dn | 2.27377 / 1.70422e-5 | 2.27860 (5.4e-4) / 1.70060e-5 | -2.1e-3 / +2.1e-3 rel |
  | K5 VpiL g3 / g4 / g5 / g6 / g8 | 1.27381 / 1.76515 / 2.27377 / 2.80102 / 3.91407 | 1.27832 / 1.76990 / 2.27860 / 2.80581 / 3.91962 | -3.5e-3 .. -1.4e-3 rel |
  | K6a / K6b P2 C' | 214.311 / 174.379 | 214.261 (0.011) / 174.321 (0.006) | +2.3e-4 / +3.3e-4 rel |
- 2026-10-15 08:11 PDT Round 3 plan (orchestrator brief, L-UI requests): (1) `yaml-edit.mjs` prints flow collections without
  padding (`{a: 1}`), comments preserved, tests; (2) `run.d.mts` gains the vector optical result fields (solver, order,
  DOF, TE fraction, residual, effective area, solver warnings, group-index method, element order labels; field component
  keys including H) so the app type-checks without casts; (3) Pockels delta-n field export per optical-mesh triangle
  (`fields.optical.pockels`, `fields.arms.A/B.pockels`): dn_xx, dn_yy, dn_zz and d eps_xy per volt of terminal voltage
  from the sampled static field and the lab-frame Pockels tensor (`materials.deltaEpsLab`), same for scalar and vector
  paths; L-VEC files read only; SPEC and this DevLog document units and sign; fields test.
- 2026-10-15 08:13 PDT Round 3 done. (1) `yaml-edit.mjs` prints with `PRINT = {lineWidth: 0, flowCollectionPadding: false}`
  (exported); test: `{length_mm: 5, differential: false}` stays unpadded, comments kept. (2) `run.d.mts`:
  `OpticalDiagnostics` (shared + scalar-only + vector-only fields: solver, order, nDof, polarizationFamily, teFraction,
  residual, effectiveAreaUm2, solverWarnings, nModesComputed, lossDbPerCm, groupIndexMethod), `OpticalMetal` (all five
  policies), `ModeComponents` (psi or ex, ey, ez, hx, hy, hz, ezNode, lossy *Im), `EoArm.solver/order/nDof/teFraction/
  residual`, `EoResult.solver`, `PockelsField`; all engine .d.mts files compile with `tsc --strict` (exit 0). (3) Pockels
  field: `fields.optical.pockels` and `fields.arms.{A,B}.pockels` = `{dnXX, dnYY, dnZZ, dEpsXY: Float64Array (one per
  optical triangle), location: 'triangle_centroid', lambdaUm, units, sign}`; dn in 1/V per volt of terminal voltage,
  dn_ii = d eps_ii / (2 n_ii) with d eps = -eps d(1/eps) eps (`materials.deltaEpsLab`), positive r E lowers n; field
  sampled with `sampleFieldOnOpticalMesh` (P2-aware), so scalar and vector paths share one definition; vector-mode.mjs not
  touched. Test against the fixture closed forms (dn_xx = -n_e^3 r33 E / 2, dn_yy = dn_zz = -n_o^3 r13 E / 2, max relative
  error < 1e-6, arm B opposite sign) for both solvers. Full suite: 216 tests, 214 pass, 0 fail, 1 skipped (K5), 1 todo.
- 2026-10-15 08:17 PDT Round 4 (orchestrator decisions on DevLog-025 round 3). (1) `solveVectorFamily` starts with
  numModes = 2 (mode_index + 1), doubling retry kept. Check on the same vector models (order 2, default sizing):
  TE0 n_eff with 2 vs 4 modes equal to 5e-15 (mao2022, renaud2023, yang2022, K2), ng to 1.5e-9; solve time -30 to -48 %.
  (2) All 40 `sims/*/config.yaml` move from `group_index_from: finite_difference_wavelength` to `perturbation` (the
  default). Reason, appended to each config's `provenance.optics.group_index_from` note: the FD value was written when it
  was the only computed group-index option and meant "computed by the model, not fixed". `finite_difference_wavelength`
  stays selectable and is honoured literally (test `group index: perturbation ... and finite_difference_wavelength`).
  All 40 configs re-parse with `perturbation` (inspectConfig, 0 failures). (3) Reference tests on the current tree
  (vector-mode.mjs 08:10:14, summary.json 08:02:13), incl. ENGINE_REFERENCE_FULL=1: 8/8 pass, engine values identical to
  the 08:04 run (K4 VpiL 2.27377 vs 2.27860; K1 n_eff +4.7e-6; K5 VpiL -3.5e-3 .. -1.4e-3); test times 0.3-2.3 s, K5 10.3 s.
  Full suite: 216 tests, 214 pass, 0 fail, 1 skipped, 1 todo. (4) Gate table and renaud2023 sweeps re-run (below).

  VpiL, V cm (configured mesh, P2 electrostatics, group index by perturbation; wall time per run):

  | Config | Scalar | Vector | V/S | Paper | Status S / V | Time S / V (s) | Vector DOF |
  |---|---|---|---|---|---|---|---|
  | mao2022 | 2.80236 | 2.76814 | -1.2 % | 1.9 | fail / fail | 2.0 / 3.1 | 37,291 |
  | renaud2023 | 0.62836 | 0.63827 | +1.6 % | 0.55 | fail / fail | 1.0 / 1.8 | 52,391 |
  | arabjuneghani2022 | 3.98534 | 4.02222 | +0.9 % | 3.3 | fail / fail | 1.3 / 2.0 | 27,871 |
  | li2022b | 0.86450 | 0.86703 | +0.3 % | 0.90 sim (1.1 nc) | pass / pass | 3.1 / 6.7 | 141,824 |
  | murai2025 | 2.54507 | 2.56638 | +0.8 % | 2.5 sim (2.7 nc) | pass / pass | 1.5 / 2.1 | 35,427 |
  | pan2021 | 4.21618 | 4.25352 | +0.9 % | 4.06 sim (3.67 nc) | pass / pass | 1.7 / 2.4 | 28,636 |
  | boynton2020 | 4.98343 | 4.94046 | -0.9 % | 6.67 meas; 4.88 sim | fail, pass / fail, pass | 0.9 / 1.4 | 23,677 |
  | chen2023 | 2.76075 | 2.69249 | -2.5 % | 1.29 nc | - / - | 1.3 / 1.7 | 28,175 |
  | yang2022 | 2.59435 | 2.63362 | +1.5 % | 2.37 | pass / pass | 2.0 / 2.7 | 39,277 |
  | zhang2022 | 2.16690 | 2.19506 | +1.3 % | 2.3 nc | - / - | 1.7 / 2.5 | 32,839 |

  Against round 2 (00:26): vector VpiL moved by at most 3e-5 relative (L-VEC auto sizing) while vector wall time fell
  2-4x (renaud2023 6.7 -> 1.8 s, li2022b 27.4 -> 6.7 s); scalar VpiL unchanged; ng (now perturbation) equal to 3 decimals.

  renaud2023 sweeps, Vpi in V (paper; tol 15 %), per-point wall time:

  | Point | Scalar | Vector | Paper |
  |---|---|---|---|
  | gap 2.5 um | 0.512 pass (1.1 s) | 0.520 pass (1.9 s) | 0.47 |
  | gap 3 um | 0.628 pass (1.1 s) | 0.638 fail (1.8 s) | 0.55 |
  | gap 4 um | 0.869 pass (1.3 s) | 0.883 pass (2.3 s) | 0.79 |
  | gap 5 um | 1.123 fail (1.5 s) | 1.141 fail (2.6 s) | 0.93 |
  | 532 nm | 0.415 pass (1.6 s) | 0.418 pass (2.9 s) | 0.42 |
  | 638 nm | 0.524 fail (0.5 s) | 0.530 fail (1.4 s) | 0.45 |
  | 738 nm | 0.628 pass (0.3 s) | 0.638 fail (1.0 s) | 0.55 |
  | 838 nm | 0.738 pass (0.3 s) | 0.752 pass (0.8 s) | 0.85 |
  | 938 nm | 0.854 pass (0.2 s) | 0.875 pass (0.7 s) | 0.80 |

  Study totals: scalar gap 5.0 s, wavelength 2.8 s; vector gap 8.6 s, wavelength 6.8 s (round 2: 32.5 / 33.3 s).
  Wavelength points 2-5 reuse the electrostatic solution.

## Round 5 plan (2026-10-15 08:43 PDT, before implementation)

Inputs: `DevLog/audits/simulator-final-engine-audit-2026-10-15.md` (F1-F12), `DevLog/DevLog-029-vpil-discrepancy-investigation.md`
(proposals 1-7), `DevLog/audits/simulator-final-ui-audit-2026-10-15.md` W3, DevLog-028 round 3 (K7). Extra write path:
`engine/package.json`.

1. F1: `optics.solver` default `vector`; scalar selectable, results labelled `scalar_optical_approximate`; tests that
   exercise scalar behaviour pin `solver: 'scalar'`; schema/SPEC/README; 40-config regression with status changes.
2. F2: `optics.mode_select: {by: te_fraction | confinement, region}`; lossy runs anchored on the same-window `absent`
   solution (shift just above it, nearest family mode), guard `optics.max_metal_power_fraction` (default 0.05) and an
   SPP check (`res.spp`); error, never a silent SPP.
3. F3: scalar + TM + eo_overlap -> input error pointing to the vector solver; test.
4. F4: `mesh.p2_mesh_factor` (default 2) multiplies the electrostatic mesh scale when element_order is 2 (Wheeler
   solves too; optical meshes unaffected); run option `p2MeshFactor`; before/after timing and accuracy on mao2022,
   renaud2023, K4, K6; reference tests pin the previous meshes.
5. F6: per-case budgets of about 2.5x the measured differences (floor 5e-6 on K2 n_eff per the L-REF note), per-gap K5.
6. F7: doubling retry up to 4 times, TM-correct message, `windowMarginPowerFraction` in diagnostics with a warning.
7. F8: bounded LRU warm cache (count and bytes); memory after a 12-point vector sweep.
8. F9: README, SPEC lines 5 and 94, package.json description and `npm test` with `--test-concurrency=1`,
   `groupIndexMethod: fixed` emitted.
9. F10: run option `modeOnly` (optical_mode without electrostatics) and CLI `--mode-only`, if cheap.
10. W3: yaml-edit source splice for scalar replacement, key insertion (block and flow parents, nested creation) and
    deletion, verified by re-parse with a re-print fallback; tests on chen2022 and renaud2023 (number formats, comments,
    flow spacing preserved).
11. DevLog-029 proposals 1-7: library unclamped alternatives after reading the vendor datasheet myself; low-frequency
    Vpi range diagnostic (`source.drive_frequency_hz`, r33 scaling, pass/fail unchanged); mao2022 gap 4.84 study and
    Eq. (2) limitation; renaud2023 sidewall study and taper limitation; arabjuneghani2022 D study with Fig. 3(c)
    targets, device #1 as a one-point study, K7 reference; boynton2020 4.88 target comparable: false, library LN,
    limitations; yang2022 library permittivity.
12. Final: sequential suite, reference tests with ENGINE_REFERENCE_FULL=1, paper VpiL table (vector default, scalar
    column), renaud2023 sweep timings.

## Round 5 results (written 2026-10-15 09:00 PDT)

### Changes

| Item | Change |
|---|---|
| F1 | `optics.solver` default `vector` (`DEFAULT_OPTICAL_SOLVER`); scalar results add `scalar_optical_approximate`. Closed-form scalar fixtures (`tests/fixtures/gsg-eo-rf.yaml`, `parallel-plates.yaml`, the sweep test config) pin `solver: scalar` with a comment. |
| F2 | `optics.mode_select {by: te_fraction | confinement, region}`; lossy runs solve the same window with the metal absent first, shift to 1.002 x that n_eff and take the nearest family mode; `lossyModeGuard` fails the run when the mode has more than `optics.max_metal_power_fraction` (default 0.05) of its power in metal or is closer to a planar SPP index than to the reference. Check on the audit's K4 lossy case (gold [-95, 10], illustrative): TM now returns the dielectric mode, n_eff 1.860373 (absent 1.860372), 0.0116 dB/cm, VpiL 5.833 (absent 5.834), metal power fraction ~1e-8; TE 1.894166, 0.0104 dB/cm. Before: TM returned the SPP (2.1157, 4408 dB/cm), TE threw. |
| F3 | `checkEoSolver`: `eo_overlap` + scalar + TM is an input error (readiness and run). |
| F4 | `mesh.p2_mesh_factor` (default 2) and run option `p2MeshFactor`; `result.electrostaticMeshScale`, `p2MeshFactor`. Wheeler solves use the same scale. Evidence below. |
| F6 | per-case budgets of about 2.5x the measured differences (header table in `tests/reference-cases.test.mjs`); electrostatic runs pin `p2MeshFactor: 1`. |
| F7 | up to 4 doublings (`VECTOR_MAX_DOUBLINGS`), family-specific message (TE fraction >= 0.5 / < 0.5), `optical.windowMarginPowerFraction` and `windowMarginUm`, label `vector_mode_power_near_window_edge_above_1e-2` above 1e-2. |
| F8 | warm cache = LRU Map, at most 4 entries and 64 MB (`warmGet/warmSet/warmCacheStats`). 12-point renaud2023 vector gap sweep (2.5-5.25 um, one cache): 16.3 s, cache 4 entries / 4.7 MB (audit: 13 entries / 13.4 MB unbounded), process RSS 1.18 GB at the end, peak 1.26 GB, arrayBuffers 127 MB after an idle turn. |
| F9 | README stage list, SPEC lines 5 and 94, package.json description; `npm test` = `node --test --test-concurrency=1 tests/*.test.mjs`, `npm run test:reference` adds K5/K7; `groupIndexMethod` now also reports `fixed`. |
| F10 | run option `modeOnly` (CLI `--mode-only`): K2.yaml runs end to end through `runCrossSection` (n_eff 1.8941659, 0.4 s). |
| W3 | `yaml-edit.mjs` splices the source (scalar replace, key insert into block or flow maps incl. nested creation, delete), verified by re-parse, printer fallback otherwise. chen2022 `geometry.mesh.element_order: 1` changes 1 line (`4.1e7` kept), renaud2023 `optics.solver` / `metal_in_window` add 1 line each; delete restores the original text byte for byte. |
| 029-1 | library `alternatives.eps_r_unclamped_vendor` {85, 28.7} and `r_pm_per_v_unclamped_vendor` {10, 7, 33, 33}, read from the Crystal Technology data sheet DC-12 8/99 p.2 (rendered page image, 2026-10-15; condition "unclamped (v < 500 kHz)", r at 633 nm; the same sheet lists clamped eps 44 / 27.9 and r 9 / 3 / 31 / 28), verification `secondary_vendor`; clamped default unchanged; the clamped eps now records the sheet as corroboration. |
| 029-2 | `source.drive_frequency_hz` (with locator) on the measured Vpi targets of mao2022 (10 kHz, p.5), renaud2023 (1 MHz, Methods p.5; 11 targets), arabjuneghani2022 (100 kHz, p.3), boynton2020 (50 kHz, p.11), yang2022 (5 MHz, p.4): `target.lowFrequencyRange` reports the r33-scaled unclamped estimate (max library unclamped r33 33); status unchanged. |
| 029-3 | mao2022: study `gap_fig1f` (6.0 vs 4.84 um, figure_digitized in DevLog-029), missing/limitation entries (Fig. 1(f) gap; paper Eq. (2) idealisation), window half width `min(2.9, gap/2 - 0.1)` (2.9 at 6.0 um, unchanged). |
| 029-4 | renaud2023: study `sidewall` (60/70/80/90 deg), limitations (gap tapers, theory curves 6 % apart). |
| 029-5 | arabjuneghani2022: study `offset_D` with Fig. 3(c) targets (12.69 / 9.88 / 6.69 / 5.08 V, digitized in DevLog-029), study `device_a` (G 5, D 0.6, Wc 12; target 2.2 V cm, devices row arabjuneghani2022-a), window `min(2.0, G/2 - D - 0.1)` (2.0 at the nominal D, unchanged), K7 limitation. |
| 029-6 | boynton2020: 4.88 simulated target `comparable: false` with the Eq. (1) reason; LN constants from the library (paper r33 31 kept); limitations (tapers, bottom SiNx). |
| 029-7 | yang2022: LN eps from the library (was Wang 2024 Extended Data Table 1, 38 / 28 at 100 kHz), provenance updated. |

### F4 evidence (electrostatics only, median of 3, 2026-10-15 08:51 PDT)

| Case | P1 scale 1 | P2 scale 1 (rounds 2-4 default) | P2 x factor 2 (round 5 default) | P1 scale 2 |
|---|---|---|---|---|
| mao2022 C' / vs P2 s1 / nodes / ms | 187.0522 / +2.25e-3 / 55,500 / 398 | 186.6324 / 0 / 55,500 / 1521 | 186.7045 / +3.86e-4 / 19,478 / 387 | 187.3224 / +3.70e-3 / 19,478 / 128 |
| renaud2023 | 233.3537 / +2.43e-3 / 32,768 / 190 | 232.7871 / 0 / 32,768 / 604 | 232.8576 / +3.03e-4 / 15,750 / 253 | 233.6556 / +3.73e-3 / 15,750 / 94 |
| K4 (vs reference 146.5187) | vertex budget exceeded | vertex budget exceeded | 146.6352 / +7.95e-4 / 48,275 / 874 | 147.1498 / +4.31e-3 / 48,275 / 262 |
| K6a (vs 214.2608) | budget exceeded | budget exceeded | 214.3109 / +2.34e-4 / 56,625 / 722 | 215.0315 / +3.60e-3 / 56,625 / 298 |
| K6b (vs 174.3207) | budget exceeded | budget exceeded | 174.3789 / +3.34e-4 / 56,676 / 715 | 174.9533 / +3.63e-3 / 56,676 / 293 |

P2 at factor 2 costs about P1 at scale 1 (mao2022 387 vs 398 ms; renaud2023 253 vs 190 ms), is 6-8x closer than P1
at scale 1, and the K4/K6 cases now run at the default scale 1.

### Regression (40 configs, ES + optical_mode + eo_overlap where ready, vector default vs scalar, 2026-10-15 08:55 PDT)

30 of 40 configs run (unchanged set: cai2025, sayem2026c LT permittivity; churaev2023, nelan2022, vanackere2023 SiN
permittivity; he2019 BCB; deng2026 BTO; chen2022 metal in window; lin2026a LT dispersion range; meng2023 shared
electrode edge). Target statuses that change from scalar to vector: 3, all ng_opt fail -> pass: valdez2022 3.126 ->
2.311 (2.32), valdez2023 3.134 -> 2.318 (2.31), wang2022 3.755 -> 2.458 (2.5). No other status changes.

### Reference tests (2026-10-15 08:59 PDT)

`ENGINE_REFERENCE_FULL=1`: 11/11 pass (K1-K4, K5 five gaps, K6a/b, K7 D0/D3.6 + ratio, K7 D1/D2.6, K2 modeOnly).
K7 VpiL vs the independent reference: -2.6e-4 / -3.3e-4 / -2.0e-4 / -4.1e-4 (D 0 / 1 / 2.6 / 3.6); ratio D0/D3.6
1.53187 vs 1.53164 +- 1.5e-4. Full suite: 222 tests, 219 pass, 0 fail, 2 skipped (FULL-only), 1 todo (D5).

### Paper VpiL (V cm), vector default vs scalar (2026-10-15 08:57 PDT; P2 factor 2; nothing tuned)

| Config | Vector | Scalar | V/S | Paper | Status V / S | Low-f r33 estimate (vector) | Time V / S (s) |
|---|---|---|---|---|---|---|---|
| mao2022 | 2.7661 | 2.8003 | -1.2 % | 1.9 | fail / fail | 2.598 (10 kHz) | 1.6 / 0.6 |
| renaud2023 | 0.6373 | 0.6273 | +1.6 % | 0.55 | fail / fail | 0.595 (1 MHz) | 1.4 / 0.5 |
| arabjuneghani2022 | 4.0214 | 3.9841 | +0.9 % | 3.3 | fail / fail | 3.753 (100 kHz) | 1.1 / 0.5 |
| li2022b | 0.8664 | 0.8639 | +0.3 % | 0.90 sim (1.1 nc) | pass / pass | - | 4.5 / 1.6 |
| murai2025 | 2.5624 | 2.5410 | +0.8 % | 2.5 sim (2.7 nc) | pass / pass | - | 1.1 / 0.6 |
| pan2021 | 4.2489 | 4.2110 | +0.9 % | 4.06 sim (3.67 nc) | pass / pass | - | 1.0 / 0.6 |
| boynton2020 | 4.9463 | 4.9894 | -0.9 % | 6.67 (4.88 sim, now nc) | fail / fail | 4.647 (50 kHz) | 0.8 / 0.4 |
| chen2023 | 2.6909 | 2.7582 | -2.4 % | 1.29 nc | - / - | - | 1.0 / 0.5 |
| yang2022 | 2.6050 | 2.5842 | +0.8 % | 2.37 | pass / pass | 2.439 (5 MHz) | 1.5 / 0.8 |
| zhang2022 | 2.1930 | 2.1647 | +1.3 % | 2.3 nc | - / - | - | 1.2 / 0.7 |

Against round 4 (P2 at scale 1): vector VpiL moved by -1.6e-3 to +2e-4 relative from the electrostatic mesh factor 2
alone (mao2022 -7.4e-4, renaud2023 -1.5e-3, arabjuneghani2022 -2.0e-4, murai2025 -1.6e-3); boynton2020 +1.2e-3 and
yang2022 -1.09e-2 also include the library constant changes (not separated from the mesh-factor change here; DevLog-029
estimated -0.3 % for the yang2022 eps change in a scalar run, so most of the -1.09e-2 is not explained by that estimate
and was not investigated). Wall time fell about 2x.

renaud2023 sweeps, Vpi (V), vector default / scalar, per point (s):

| Point | Vector | Scalar | Paper |
|---|---|---|---|
| gap 2.5 / 3 / 4 / 5 um | 0.520 / 0.637 / 0.882 / 1.140 (1.4 / 1.3 / 1.5 / 1.6 s) | 0.511 / 0.627 / 0.868 / 1.122 (0.7 / 0.6 / 0.6 / 0.8 s) | 0.47 / 0.55 / 0.79 / 0.93 |
| 532 / 638 / 738 / 838 / 938 nm | 0.417 / 0.529 / 0.637 / 0.751 / 0.874 (2.2 / 1.2 / 0.9 / 0.7 / 0.6 s) | 0.414 / 0.523 / 0.627 / 0.736 / 0.853 (1.0 / 0.4 / 0.3 / 0.2 / 0.2 s) | 0.42 / 0.45 / 0.55 / 0.85 / 0.80 |

Totals: vector gap 5.8 s (2 pass, 2 fail), wavelength 5.6 s (3 pass, 2 fail); scalar 2.7 s (3/1), 2.1 s (4/1).

New studies (vector): mao2022 `gap_fig1f` 6.0 um 2.766 (target 1.9 fail) / 4.84 um 2.223 V cm; renaud2023 `sidewall`
60 / 70 / 80 / 90 deg -> 0.613 / 0.622 / 0.630 / 0.637 V; arabjuneghani2022 `offset_D` Vpi 10.42 / 9.78 / 8.04 / 6.77 V
vs 12.69 / 9.88 / 6.69 / 5.08 (1 pass, 3 fail; the measured D dependence is steeper, as K7 found); `device_a` 2.331 vs
2.2 V cm (pass).

## Round 6 plan (2026-10-15 09:22 PDT, before implementation)

Input: `DevLog/audits/simulator-round5-verification-2026-10-15.md` (G1-G3 are L-UI's). Extra write path: `engine/bench/bench.mjs`.

- G4: survey every config's library merge against HEAD (keys added or changed by `library:`), list per config here, fix
  stale provenance (yang2022 r13/r22), and report merged values in `result.materialSources` (`addedFromLibrary` with the
  values).
- G5: bench case pins `p2` (run option `p2MeshFactor`), explicit `mao2022-es-p2-f1` / `-f2`; new baseline in `logs/`.
- G6: lossy cap on an unsigned measure (max of |power| and |electric energy| fractions in conductor regions); SPP
  proximity check kept; end-to-end rejection test (mode_select by confinement in the metal region).
- G7: tests for `lowFrequencyRange`, the window-edge label, the 4-doubling retry, confinement selection end to end.
- G8: SPEC remnants; `scalar_optical_not_full_vector` removed from the configs' static limitations (the engine adds it
  on scalar runs only).
- G9: `deleteIn` prunes emptied parent maps; tests.
- G10: renaud2023 `drive_locator` on the 11 targets.
- G11: vendor sheet URL, access date and sha256 recorded in the library; no copy kept (redistribution not established).
- G12: lossy-metal loss convergence label; 3-level K4 lossy TM convergence.
- Final: suite, reference tests, 30-config status survey.

## Round 6 results (written 2026-10-15 09:30 PDT)

### G4: library merge vs HEAD, every config with `library:` (09:22 PDT survey; HEAD = git show, read only)

"dispersion" was implicit at HEAD for materials named like a library optical entry (same index model); an explicit
`n` / `n_o, n_e` removed in favour of the library makes the index follow the library fit (Malitson, Salzberg, Zelmon).

| Config | Material (library key) | Keys added or changed by the merge (HEAD -> now) |
|---|---|---|
| arabjuneghani2022 | lithium_niobate (lithium_niobate_congruent) | n_o 2.211, n_e 2.138 -> library Zelmon; eps_r 43/28 -> 44/27.9; r unchanged values (8.6/3.4/30.8/28) |
| arabjuneghani2022 | silicon_dioxide, silicon | n 1.444 / 3.476 -> library fits |
| arabjuneghani2022 | gold (gold_bulk_293k) | sigma 4.1e7 -> 4.5167e7 |
| boynton2020 | lithium_niobate | n_o/n_e -> Zelmon; eps_r 43/28 -> 44/27.9 (r13/r22/r51 values equal the old placeholders) |
| gao2024 | lithium_niobate | eps_r absent -> 44/27.9; r13 8.6, r22 3.4, r33 30.8, r51 28 absent -> library |
| gao2024 | silicon_dioxide, silicon | eps_r absent -> 3.9 / 11.7 |
| mao2022 | lithium_niobate | eps_r.perp 43 -> 44 (par 28 and r33 31 stay paper values) |
| mao2022 | silicon; gold | n 3.476 -> Salzberg fit; sigma 4.1e7 -> 4.5167e7 |
| meng2023 | lithium_niobate | eps_r absent -> 44/27.9; r13 8.6, r22 3.4, r51 28 added next to the paper r33 31 (provenance now says so) |
| meng2023 | silicon_dioxide, silicon | eps_r absent -> 3.9 / 11.7 |
| renaud2023 | lithium_niobate | eps_r and r13/r22/r33/r51 absent -> library |
| renaud2023 | silicon_dioxide, silicon; gold | eps_r absent -> 3.9 / 11.7; sigma absent -> 4.5167e7 (unused by from_paper_alpha) |
| valdez2022 | lithium_niobate; silicon_dioxide, silicon | eps_r and r13/r22/r33/r51 absent -> library; eps_r 3.9 / 11.7 |
| valdez2023 | lithium_niobate; silicon_dioxide, silicon | eps_r absent -> library; r13, r22, r51 added next to the paper r33 30.8 (provenance now says so); eps_r 3.9 / 11.7 |
| yang2022 | lithium_niobate | eps_r 38/28 -> 44/27.9 (documented round 5); r13 8.6, r22 3.4 added (undocumented in round 5; provenance fixed: -0.78 % vector VpiL, no scalar effect, per the round-5 verification) |

Engine: `result.materialSources.<m>.addedFromLibrary` now lists every merged field with its value (for example
yang2022 `{dispersion, eps_r: {perp 44, par 27.9}, r_pm_per_v.r13: 8.6, r_pm_per_v.r22: 3.4}`).

### Other items

| Item | Change / evidence |
|---|---|
| G5 | bench cases pin `p2` (YAML `mesh.p2_mesh_factor` + run option `p2MeshFactor`); new `mao2022-es-p2f1` / `-p2f2`; `--extra-cases FILE` adds cases without code changes. Baseline `logs/bench-baseline-20261015T0926.json`, log `logs/bench-20261015T0926.jsonl` (5 repeats, 15 cases, no errors). Medians (ms): mao2022-es-p1 375.1, -es-p2 406.6, -es-p2f1 1430.1, -es-p2f2 407.0, -opt-scalar-p1 358.0, -opt-vector-p2 785.4, -wheeler-p1 977.8; arabjuneghani2022-es-p1 215.2, -opt-scalar-p1 272.3; chen2022-unloaded-es-p1 282.9, -es-p2 406.8; lin2025-es-p1 312.9, -opt-scalar-p1 427.3; gsg-eo-rf-p1-scalar 155.9; renaud2023-eo-vector-p2 1226.2. |
| G6 | guard measure = max(|P_z| fraction, |W_e| fraction) in conductor regions (`metalFractions`); SPP index check restricted to TM-like modes (TE fraction < 0.5). End-to-end test: 0.2 um glass on gold (illustrative eps -95 - 10j), TM: selected mode 5.2 % in metal > cap 0.02 -> rejected; K4 lossy TM passes with metal fraction 2.6e-7 (scale 2; signed Poynting fraction was -9.1e-9). |
| G7 | tests: `lowFrequencyRange` (fixture, 100 kHz: estimate = VpiL x 30/33), window-edge label (fixture vector box mode), retry (K4 TM mode_index 1: found with 16 modes computed), confinement selection (K4 rib, equals the default TE0). |
| G8 | SPEC remnants marked superseded; `scalar_optical_not_full_vector` removed from the static limitations of all 40 configs (33 block, 7 flow lists); the engine adds it to scalar results only (checked in the survey: present on every scalar run, absent on every vector run). |
| G9 | `deleteIn` prunes maps it empties, up to the first non-empty ancestor; tests (mao2022 `optics.mode_select.by` restores the text byte for byte). |
| G10 | renaud2023: `drive_locator: "p.5 Methods (1 MHz triangle waveform); Fig. 2 caption p.3 (1 MHz)"` on the 11 targets (verified in references/renaud2023/text.md, pages 2, 3 and 5). |
| G11 | vendor sheet: URL https://sphotonics.ru/LNmatProperties.pdf, accessed 2026-10-15, 50,022 bytes, sha256 a83393d0ef69c9a92133668b5a9b1a47fe6a83f80300156ece57cfe6338e384d (server last-modified 2026-08-10) recorded in the library entries (`source_copy`); no copy kept (redistribution rights not established); verification stays `secondary_vendor` with a note that it is a single reading by the library author. |
| G12 | label `lossy_metal_loss_mesh_sensitive_check_convergence` on every lossy result and a `lossMeshSensitivity` note. K4 lossy TM (gold [-95, 10], illustrative; mode only): mesh scale 2 / 1.41 / 1 -> 0.011577 / 0.019371 / 0.021965 dB/cm (n_eff 1.860373 / 1.860374 / 1.860375; 44,525 / 66,590 / 103,522 DOF; 2.3 / 3.4 / 5.5 s). Successive differences 7.8e-3, 2.6e-3 (ratio 3.0): not converged at the default scale; Richardson with that ratio gives about 0.023 dB/cm (estimate). No metal-surface refinement default was added. |

### Final checks (2026-10-15 09:30 PDT)

- Engine suite (`npm test`, sequential, re-run 09:30 PDT): 226 tests, 223 pass, 0 fail, 1 todo (D5), 2 skipped (FULL-only),
  after the guard-message test update (first run 09:27: 1 failure, the round-5 test still matched the old message text).
  Engine `.d.mts` files type-check (`tsc --strict`, exit 0).
- Reference tests with `ENGINE_REFERENCE_FULL=1`: 11/11 pass.
- 40-config status survey (vector default and scalar, ES + optical_mode + eo_overlap where ready): 30 run, the same 10
  blocked as in round 5; target statuses identical to round 5; scalar -> vector changes are the same 3 (valdez2022,
  valdez2023, wang2022 ng fail -> pass); vector VpiL identical to round 5 to the printed digits (mao2022 2.7661,
  renaud2023 0.6373, arabjuneghani2022 4.0214, boynton2020 4.9463, yang2022 2.6050).

