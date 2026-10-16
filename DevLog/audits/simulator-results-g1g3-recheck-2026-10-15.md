---
title: Recheck of G1-G3 and N1 (solution selection and labelling of every dataset-consuming view), loop check, commit hygiene
date: 2026-10-15
verifier: fresh-context Claude subagent
scope: working tree on HEAD 656c487 after DevLog-032 round 4 (17:11 PDT); built app, renaud2023-3um-738, gap study; all gates once
---

# G1-G3 recheck (2026-10-15 17:12-17:25 PDT)

No code was changed. `nice -n 10`, one heavy process at a time, Node 23.7 with `--max-old-space-size=1536`.
`npm run build`, then `vite preview --host 127.0.0.1 --port 47933 --strictPort` (47933 and 47934 checked free before,
free again after). Headless Chrome via playwright-core (`channel: chrome`, temporary profile, deleted), 1440x1050,
`/sim?id=renaud2023-3um-738&pool=2&debug=1`. Compute with all stages (electrostatics, optical mode, EO overlap, RF line;
gap 3, study default), then the `config: gap` sweep (2.5, 3, 4, 5 um; 4/4 done in 4.1 s), gap 4 = sweep point 3 (index 2).
Node references: `runCrossSection(text, {section: 'geometry', stages: [optical_mode, eo_overlap, rf_line], keep: true})`
for Compute and `storeForSweepPoint(text, 2, {study: 'gap', section: 'geometry', meshScale: 1, stages: null})` for gap 4
(the worker's job message, read from `__simWorkbench.sweepJobs`), evaluated with `evaluateDerived`, `evaluatePlot`,
`evaluateAtPoints`, `modeTable`, `addCutLine`. Node peak RSS 763 MB. Scratch in the session scratchpad only, deleted.

## 1. Gates (once, sequential)

| Gate | Claimed | Measured | Result |
|---|---|---|---|
| `engine: npm test` | 247: 244 pass, 0 fail, 2 skipped, 1 todo | tests 247, pass 244, fail 0, cancelled 0, skipped 2, todo 1; exit 0; 54 s | pass |
| `engine: npm run test:reference` | 11/11 | tests 11, pass 11, fail 0; exit 0; 24 s | pass |
| `app: npm test` | 62/62 | 6 files, 62 passed | pass |
| `app: npm run check` | 0/0 | 464 files, 0 errors, 0 warnings | pass |
| `app: npm run build` | OK | "Wrote site to build" | pass |
| `app: npm run smoke` | 43 PASS | exit 0, 43 PASS lines, 37 s | pass |
| `uv run python scripts/validate_db.py` | - | 0 error(s), 0 warning(s) | pass |
| `uv run pytest -q` | - | 30 passed, 5 warnings | pass |

## 2. Views at gap_um = 4 (rows of the previous view table)

Electric Field group (pg6) set to `Sweep point 3 (gap_um = 4 µm)`; Electric Potential group (pg3) left on Compute.

| View | Solution label shown | Browser | Node (same solution) | Result |
|---|---|---|---|---|
| 2D Electric Field group | settings `Solution: Sweep point 3 (gap_um = 4 µm)`; graphics chip same; title `Dataset: Electrostatics (geometry) (gap_um = 4) ...` | `__simProbe(0.19969, -0.051724)` es.normE 0.16974671910670938 V/um, `sol` `sweep:2` | 0.16974671910670938 | pass (bit-identical) |
| Cut line drawn on the gap 4 view, Line Graph | cut line settings `Solution: Sweep point 3 (gap_um = 4 µm)`, `point: 2` inherited; Line Graph group header `Solution: Sweep point 3 (gap_um = 4 µm)`; series `es.normE (V/µm)` (N1: unit copied) | 500 samples, y = -0.051724, x -18 to 18 (CSV export) | same cut-line route: max rel diff 0 over 500; independent `evaluateAtPoints` at the CSV x: max rel 1.08e-14. Mid-line reference x 0.16336, y -0.05172: 0.16177444973075703 (previous audit: 0.16177) | pass |
| Point Evaluation on a cut point placed on the gap 4 view | cut point `Solution: Sweep point 3 (gap_um = 4 µm)`, `point: 2`; Point Evaluation text `Solution: Sweep point 3 (gap_um = 4 µm) (of the cut point; ...)`; table row Solution `Sweep point 3 (gap_um = 4 µm)`, gap_um 4 | (0.19969, -0.051724): 0.16974671910670938 V/um | 0.16974671910670938 | pass |
| Mode Analysis | `Solution: Sweep point 3 (gap_um = 4 µm)`; table `data-mode-point="2"` | opt: k=0 (TM0) 1.97288 / 2.5608, k=1 (TE0) solved 1.96574 / 2.3803 / TE 0.9971; arm B the same | opt k=0 1.9728763748702074 / 2.560805540290421, k=1 1.9657414366463322 / 2.3803306007723233 / 0.9970953; armB k=1 1.9657415220709542 | pass (to the shown digits) |
| Mode Analysis text (G3) | "Selecting a row sets the mode of that dataset in the plot groups showing this same solution (Sweep point 3 (gap_um = 4 µm)) and in their derived values." | - | - | pass |
| EO Coupling page | `Solution: Sweep point 3 (gap_um = 4 µm)`; footnote names the point | VpiL 0.8819537364212485 V·cm; dn_A - dn_B -4.1839e-5; balance -1; textbook 0.9673; arm A/B n_eff 1.96574, dn/dV -2.0919e-5 / 2.092e-5, Γ 0.4761 / -0.4761, gap 4 / 4, k=1 (TE0); slab -9.163e-6 / 9.162e-6, rib_r -1.176e-5, rib_l 1.176e-5, r33 slab -8.93e-6, rib_r -1.15e-5 | VpiL 0.88195373655163 (fresh) / 0.8819537364212485 (shared reuse cache, see H5); dneffA -2.0919187e-5, dneffB 2.0919743e-5, balance -1.0000266, VpiLtextbook 0.96730429, GammaA 0.47606830, GammaB -0.47608283, gapA/B 4; eo.integrand slab -9.1631e-6 / 9.1625e-6, rib_r -1.17561e-5, rib_l 1.17573e-5, r33 slab -8.9303e-6, rib_r -1.15477e-5 | pass |
| EO Coupling page on Compute | `Solution: Compute (gap_um = 3 µm)` | VpiL 0.6373167527131322 | 0.6373167527131322 | pass |
| Derived Values summary | `Solution: Sweep point 3 (gap_um = 4 µm)`; "Section values of the sweep point (computed by the sweep)" | C' 213.17021663907215, C0' 36.29018628781442, L' 306.59805580199685, n_RF 2.4236430859553377, Z0 37.92463721227787, n_g 2.380330600188011, n_eff 1.9657414366463242, VpiL = Vpi 0.8819537364212491 | `runSweepPoint` metrics: C', C0', L', n_RF, Z0 identical; n_g 2.3803306007723233 (2.5e-10 rel), n_eff 1.9657414366463322 (4e-15), VpiL 0.88195373655163 (1.5e-10) | pass (within 1e-9; H5) |
| Global Evaluation (VpiL, V*cm) | table columns `solution`, `gap_um (µm)`, `dataset`, value; rows `Compute (gap_um = 3 µm)` / 3 and `Sweep point 3 (gap_um = 4 µm)` / 4 | Compute 0.6373167527131322; gap 4 0.8819537364212485 | Compute 0.6373167527131322; gap 4 0.8819537364212485 (shared cache) | pass |
| RF Line results page | `Solution: Sweep point 3 (gap_um = 4 µm)` | "No RF line in Sweep point 3 (gap_um = 4 µm). The sweep ran without the RF line stage." | correct: study `gap` stages are electrostatics, optical_mode, eo_overlap (`sims/renaud2023/config.yaml` line 88) | pass |
| RF Line 1D group | header `Solution: Sweep point 3 (gap_um = 4 µm)`; "Attenuation: no RF frequency sweep in Sweep point 3 (gap_um = 4 µm)" | - | - | pass |
| RF Line 1D group on Compute | header `Solution: Compute (gap_um = 3 µm)` | CSV 100 rows rf.alpha_dB, rf.nRF | max rel diff 0 for f, alpha, nRF | pass |
| 2D optical group (Mode, optical) | chip and settings `Sweep point 3 (gap_um = 4 µm)`; title `Dataset: Optical mode, k=1 (TE0), n_eff 1.96574 (gap_um = 4)   Surface: opt.normE^2 (V²/m²)`; Mode selector shown `k=1 (TE0), n_eff 1.96574` | `__simProbe(0, 0.1)` 3604898179879804, `sol` `sweep:2` | 3604898183261327 (fresh, 9.4e-10 rel) / 3604898179879804 (shared cache) | pass (G3 title) |

Views left on Compute (requirement: still Compute values, and stated):

| View | Label | Browser | Node Compute | Result |
|---|---|---|---|---|
| Electric Potential group (never changed) | chip `Compute (gap_um = 3 µm)`, settings `Solution: Compute (gap_um = 3 µm)`; title has no parameter suffix | `__simProbe(0.19969, -0.051724)` es.V 0.45273151593315886, `sol` `main` | 0.45273151593315886 | pass |
| Cut Line 2D 2 drawn on the Compute view, Line Graph es.V | cut line `point: -1`, `Solution: Compute (gap_um = 3 µm)`; group header same | 500 samples | max rel diff 0 | pass |
| Cut Point 2D 2 on the Compute view, Point Evaluation es.normE | `Solution: Compute (gap_um = 3 µm) (of the cut point; ...)`; row `Compute (gap_um = 3 µm)`, 3 | 0.2324466624885062 V/um | 0.2324466624885062 | pass (after retargeting, see H1) |
| Global Evaluation row before switching to gap 4 | `Compute (gap_um = 3 µm)`, 3 | 0.6373167527131322 | 0.6373167527131322 | pass |

### Findings

- H1 (minor-major: evaluates a different dataset than the page it was created from; labelled). The `+ Line Integration`,
  `+ Line Average` and `+ Point Evaluation` buttons on a cut line / cut point page create a derived node targeting the
  first cut line / cut point, not the shown one: `ResultsPages.svelte` `addDerived` (lines 78-81) uses
  `R.cutLines[0]` / `R.cutPoints[0]`. Observed: `+ Point Evaluation` on Cut Point 2D 2 (Compute) created Point
  Evaluation 2 with target `cp27` (Cut Point 2D 1, gap 4); Evaluate gave the row `Sweep point 3 (gap_um = 4 µm) |
  0.16974671910670938`. Not silent (the Solution line and column name the point), but the user gets the other point's
  solution. Fix: pass `cl.id` / `cp.id` as `target` from those pages. Smoke G1 passes because it has one cut line.
- H2 (minor: two solution statements for one group). A Line Graph 1D group's settings show `Parameter value (RF)` with
  `Solution: Compute (gap_um = 3 µm)` while the graphics header of the same group says `Solution: Sweep point 3
  (gap_um = 4 µm)` (the line graph uses its cut line's point). The helper sentence explains the scope, but the settings
  `Solution:` line contradicts the graphics header for this group.
- H3 (minor: CSV). Multi-series 1D CSV header names the second y column after the first series:
  `rf.nRF (1) y (rf.alpha_dB (dB/cm))` (RF Line group). The Line Graph CSV file name and header do not name the
  solution (`renaud2023-3um-738-Line_Graph_Cut_Line_2D_1.csv`), unlike 2D Export > Data (`-p3-gap_um=4`).
- H4 (note). The status bar keeps `Sweep point 3 fields: Combining arm overlaps` after the point is ready (seen from
  17:16 to the end of the session).
- H5 (note: reproducibility at 1e-10 to 1e-9). Optical/EO values of a sweep point depend on the worker's reuse cache.
  Node with the same sequence (Compute, then `storeForSweepPoint` with the same `cache` object) reproduces the browser
  bit for bit (VpiL 0.8819537364212485, opt.normE^2 3604898179879804); a fresh Node run gives VpiL 0.88195373655163
  (1.5e-10 rel) and opt.normE^2 3604898183261327 (9.4e-10 rel). Electrostatic values are bit-identical either way.
  The smoke tolerance is 1e-9; the optical probe is close to it.
- H6 (note). The sweep-point EO page is a reduced form of the Compute page: no per-arm VπL, region power fractions,
  coefficient `total` rows, lab-tensor sum check, Γ (E_x) / Γ equiv. columns or formulas; `Vπ at L` omits L (Compute
  page: `Vπ at L = 10 mm`). Values shown are correct.

G1: pass (cut lines and cut points inherit the view's solution; Line Graph and Point Evaluation equal Node at that
point). G2: pass (every page names its solution; Global/Point tables carry Solution and gap_um columns, also for
Compute rows). G3: pass (Mode Analysis text; optical title carries mode label and n_eff). N1: pass (Line Graph in
V/µm).

## 3. Repaint / request loop check

Counters injected after settle: `requestAnimationFrame` calls and `Worker.prototype.postMessage` calls on the main
thread, plus Playwright network request count. Counters validated: a view switch gave 2 rAF, a wheel zoom 4 rAF and
1 worker message.

| Graphics view + settings page (after settle) | rAF in 10 s | worker messages in 10 s | network requests in 10 s |
|---|---|---|---|
| Electric Field (gap 4) + EO Coupling (gap 4) | 0 | 0 | 0 (24 before, 24 after) |
| Line Graph: Cut Line 2D 1 + Mode Analysis | 0 | 0 | 0 |
| Mode, optical (gap 4) + RF Line results | 0 | 0 | 0 |
| RF Line group + Derived Values | 0 | 0 | 0 |
| Electric Field (gap 4, after zoom) | 0 | 0 | 0 |

Chrome processes of the temporary profile: `ps` %CPU sum 0 in three samples over 10 s. No page errors, no console
errors or warnings.

## 4. Commit hygiene

- `git status --short`: 87 entries (modified, 4 deleted: `CutLinePanel.svelte`, `PlotSettings.svelte`,
  `fieldsView.ts`, `synthetic.ts`; untracked: DevLog-030 to 033, 4 audits plus this one, new `app/src/lib/sim/*`,
  `engine/src/postproc/`, `engine/tests/postproc.test.mjs`, `engine/bench/postproc-bench.mjs`,
  `validation/reference/eo-overlap-*.json`, `validation/run_eo.sh`, `validation/scripts/ref_eo_overlap.py`).
  No repo file changed during this verification (none newer than 17:12).
- Grep of the 98 changed and untracked files for `/Users/`, the local user name, `/private/tmp`, `/home/`, secret patterns
  (api key, secret, token, password, private key, ghp_, sk-, AKIA), `daily-notes`, `luxretius`, `jwt625`, `@gmail`:
  - flag: `DevLog/audits/simulator-results-final-verification-2026-10-15.md` line 133 quotes an absolute
    local home path (user name included). Reword before commit if local paths must not appear.
  - `app/src/routes/+layout.svelte` line 81: the public GitHub repo link (`github.com/jwt625/eo-modulator-atlas`);
    intended footer link.
  - `token` hits are code identifiers (`ExprInput.svelte`, `expr.mjs` tokenizer) and DevLog prose. No secrets.
- No in-repo `scratchpad/` (the one flagged in the final-verification audit is gone). `logs/`, `app/build/`,
  `app/.svelte-kit/`, `app/static/sims/`, caches and `references/` sources are ignored.

After the run: no vite preview, driver or headless Chrome process left; ports 47933 and 47934 free; session scratch
deleted.

## Summary

All gates match the claims (engine 247/244/0/2/1, reference 11/11, app 62/62, check 0/0, build OK, smoke 43 PASS,
validate_db 0/0, pytest 30 passed). Every view at gap 4 names its solution and equals Node for that solution; views
left on Compute show Compute values and say so. No repaint or request loop. New: H1 (cut-page `+` buttons target the
first cut dataset), H2-H3 minor labelling, H4-H6 notes. One hygiene flag (absolute-path text in the final-verification
audit).
