---
title: Final gates, G1-G12 spot checks and commit hygiene for the simulator tree (after round 6 / UI round 5)
date: 2026-10-15 (started 09:31:46 PDT, written 09:38 PDT)
verifier: fresh-context Claude subagent
scope: all gates on the working tree; one concrete check per round-5 verification finding G1-G12; git status grouping and commit-hygiene review
---

# Final gates (2026-10-15)

Read-only on code, configs and git. The only file written in the repo is this report. Scratch script and logs were in
`scratchpad/final-gates-1/` (outside the repo) and were removed afterwards. No state-changing git commands were run.
Nothing was left running (no `vite preview` or headless Chrome after smoke).

Setup: Node 23.7.0, `nice -n 10`, `--max-old-space-size=1536` (via `NODE_OPTIONS` for npm scripts), one heavy process
at a time. Load average 2.6-2.8 from other work, so wall times are indicative only.

Result: all 8 gates green. All 12 spot checks hold. No secrets, absolute local paths or emoji in the changed or
untracked files. Two hygiene items to decide (H1, H2), both minor.

## Gates

| Gate | Claimed | Measured | Wall / peak RSS |
|---|---|---|---|
| `engine: npm test` | 226 / 223 pass / 0 fail / 2 skipped / 1 todo | 226 tests, 223 pass, 0 fail, 0 cancelled, 2 skipped, 1 todo (D5), exit 0 | 39.2 s / 1.04 GB |
| `engine: npm run test:reference` | 11/11 | 11 pass, 0 fail, exit 0 | 24.0 s / 1.36 GB |
| `app: npm test` | 51/51 | 51 passed (5 files), exit 0 | 0.8 s |
| `app: npm run check` | 0/0 | 443 files, 0 errors, 0 warnings, exit 0 | |
| `app: npm run build` | OK | OK, "Wrote site to build" (chunk-size warning only), exit 0 | |
| `app: npm run smoke` | 27 PASS | 27 PASS lines, exit 0 (one INFO line: graphics renderer webgl2) | 27.2 s |
| `uv run python scripts/validate_db.py` | unchanged | 0 errors, 0 warnings, exit 0 | |
| `uv run pytest -q` | unchanged | 30 passed, 5 warnings, exit 0 | 10.3 s |

The node test runner prints the D5 todo under "failing tests"; it is the expected todo (Q2 finding F1), not a failure.

## Spot checks (G1-G12)

Engine and app modules were imported directly (`node --experimental-strip-types` for `app/src/lib/sim/yamlEdit.ts`).
Runs were `modeOnly` or electrostatics-only at mesh scale 2 unless stated. Peak RSS of the spot-check script 0.53 GB.

| Finding | Check | Result |
|---|---|---|
| G1 nullable `electrostatics` | `app/src/lib/sim/DerivedValues.svelte:44` guards the nodes line with `{#if r.electrostatics}`; run label reads "no electrostatics" when null (line 37); `npm run check` 0/0 | holds |
| G2 smoke | `app/scripts/smoke.mjs:23` builds the vector variant with the engine `setIn` (replaces the pinned `solver: scalar`); smoke 27 PASS | holds |
| G3 app YAML path | App `setIn`/`deleteIn` on chen2022-c `geometry.mesh.element_order: 1`: 1 line changed (`  mesh: {max_edge_um: 2.0, electrode_edge_um: 0.05, element_order: 1}`), `4.1e7` kept, delete restores the text byte for byte. renaud2023 `optics.solver: vector`: 1 line added (`  solver: vector`), 0 removed, delete restores byte for byte | holds (round 5 measured 15 and 17 lines) |
| G4 library merge | yang2022 `result.materialSources.lithium_niobate`: library `lithium_niobate_congruent`, `addedFromLibrary` = `{dispersion: lithium_niobate, eps_r: {perp 44, par 27.9}, r_pm_per_v.r13: 8.6, r_pm_per_v.r22: 3.4}`, `overridden` = `[r_pm_per_v.r33, r_pm_per_v.r51]`. Provenance note for `materials.lithium_niobate.r_pm_per_v` now states the r13/r22 merge and the -0.78 % vector VpiL effect | holds. Nit: the note cites "round-6 audit G4"; the finding is in the round-5 verification |
| G5 bench pins | `engine/bench/bench.mjs:63-76` cases carry `p2`; `mao2022-es-p2f1` / `-p2f2` exist; `--extra-cases FILE` option (line 194). Baseline `logs/bench-baseline-20261015T0926.json`: p2f1 leaves `p2MeshFactor` 1 / `electrostaticMeshScale` 1, p2f2 leaves 2 / 2 | holds (bench not re-run) |
| G6 lossy guard | 0.2 um glass on gold (eps -95 - 10j, TM, vector): rejected with cap 0.02 and also with the default cap 0.05 ("n_eff 1.033277, 5.20 % of \|power\| or \|electric energy\| in metal ... reference n_eff 1.009094"). K4 lossy TM (scale 2): passes, n_eff 1.8603727 vs metal-absent reference 1.8603724, `metalFraction` 2.56e-7 (= electric-energy fraction; \|power\| fraction 9.07e-9, now unsigned) | holds. Note: the default-cap rejection margin is small (5.20 % vs 5 %); the SPP-proximity test is the other safeguard |
| G7 untested behaviours | Tests "round 6: low-frequency range, window-edge label, solver-aware scalar label" and "round 6: vector retry ... confinement selection end to end" pass in this suite run | holds |
| G8 scalar label | yang2022 `optical_mode`, scale 2: scalar run carries `scalar_optical_not_full_vector` (warnings and optical labels) and `scalar_optical_approximate`; vector run carries neither. `grep` finds the label in 0 of 40 `sims/*/config.yaml`. `sims/SPEC.md:421-426` marked superseded | holds |
| G9 `deleteIn` pruning | Engine `deleteIn(setIn(mao2022, optics.mode_select.by, te_fraction), optics.mode_select.by)`: restores the original text byte for byte, no `mode_select: {}` left, `parseConfig` succeeds | holds |
| G10 renaud2023 locator | 11 `drive_frequency_hz` and 11 `drive_locator` in the config; locator "p.5 Methods (1 MHz triangle waveform); Fig. 2 caption p.3 (1 MHz)" matches `references/renaud2023/text.md` (line 479 on page 5; lines 274-276 on page 3) | holds |
| G11 vendor sheet | `engine/data/materials.json` `source_copy`: URL, accessed 2026-10-15, sha256 a83393d0...e384d, 50,022 bytes, "no local copy kept"; no file matching `*LNmatProperties*` in the repo. Values still not independently read (stated in the entry) | holds (as a record; the values remain single-reader) |
| G12 lossy loss convergence | K4 lossy TM result carries `lossy_metal_loss_mesh_sensitive_check_convergence` and a `lossMeshSensitivity` note quoting 0.0220 vs 0.0116 dB/cm (scale 1 vs 2) | holds |

## Commit hygiene

`git status --short`: 117 entries (68 modified or deleted tracked files, 5,671 insertions / 1,218 deletions; 49
untracked entries, 144 files with `-uall`).

### Modified or deleted (tracked)

| Area | Files |
|---|---|
| app | `scripts/smoke.mjs`, `src/app.css`, `src/lib/SimStageResults.svelte`, `src/lib/sim.worker.ts`, `src/routes/+layout.svelte`, `src/routes/sim/+page.svelte`; deleted `src/lib/CrossSection.svelte` (no remaining import; check and build pass) |
| engine | `README.md`, `cli.mjs`, `package.json`, `data/materials.json`, `schema/sim.schema.json`, `src/{config,run}.{mjs,d.mts}`, `src/{electrostatics,eo-overlap,fem,mesh,optics,recess,sparse,stages}.mjs`, `tests/fixtures/{gsg-eo-rf,parallel-plates}.yaml`, `tests/optical-runner.test.mjs` |
| sims | `SPEC.md`; 40 `sims/*/config.yaml` |

### Untracked

| Area | Files |
|---|---|
| DevLog | `DevLog-023` .. `DevLog-029` (7 files); `audits/simulator-*` (8 files before this report, plus this report) |
| app | `src/lib/sim/` (31 files, 280 KB: Svelte components, TS helpers, `sim.test.ts`) |
| engine | `bench/{bench,vector-bench}.mjs`; `src/` 17 files (10 `.mjs`: fields, ldlt, mesh-entry, optical-stage, params, sweep, templates, vector-dense, vector-mode, yaml-edit; 7 `.d.mts`); 13 test files |
| validation | `cases/` (18 YAML), `eoref/` (8 py), `scripts/` (8 py), `reference/` (24 JSON), `run*.sh` (5), `pyproject.toml`, `uv.lock` (242 KB) |
| coordination | `claims/claude-simulator-2026-10-14.md` (same pattern as the 10 tracked claim files) |

### Scans

| Scan (changed + untracked text files) | Result |
|---|---|
| `/Users/`, the local user name, `/home/<user>`, `/private/tmp`, `/var/folders` | 0 hits (untracked files; added lines of the tracked diff) |
| Keys and tokens (`api_key`, `secret`, `token`, `password`, `bearer`, `sk-`, `ghp_`, `AKIA`, private-key headers, `xox`, `AIza`, `hf_`, `@gmail.com`) | 0 real hits; false positives only: `tokenize`/`tokens` in `engine/src/params.mjs`, the `secretstorage` package in `validation/uv.lock` |
| Remote hosts, IPs, `ssh`/`scp`/`rsync`, private-project names | 0 hits (two "no API key" statements about the local tidy3d mode solver) |
| Emoji | 0 hits |
| Large binaries, PDFs, build output, logs | none untracked. `app/build/`, `app/.svelte-kit/`, `app/static/sims/`, `logs/` (bench baselines), `validation/.venv/` (1.6 GB), `node_modules/` and `references/_inbox/*` are ignored. The vendor datasheet PDF is not in the repo |
| `.claude/settings.local.json` | does not exist (`.claude/` holds only the tracked `skills/`) |

### Flags

- **H1 (decide).** `validation/reference/K7-D3.6-es-eo-pilot.json` is a pilot output (`--pilot` run). Nothing in
  `engine/`, `DevLog/`, `validation/scripts/` or `summary.json` references it, and the full `K7-D3.6-es-eo.json` sits
  next to it. Leave it out of the commit unless the pilot is meant as a record.
- **H2 (latent).** The repo `.gitignore` re-includes `*.json` and `*.pdf` (`!*.json`, `!*.pdf`) to override the parent
  PlayGround ignore, and nothing in it ignores `.claude/settings.local.json`. `git check-ignore` reports the `!*.json`
  rule for that path. If the file is ever created, it would show up as untracked and could be staged by `git add -A`.
  Adding `.claude/settings.local.json` after the negations would close this. Not present today.
- Everything else in the lists above is source, tests, inputs, reference data or DevLog, and is fit to commit. The
  claim file follows the existing `coordination/claims/` convention.
