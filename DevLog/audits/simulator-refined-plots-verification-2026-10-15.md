---
title: Fresh-context verification of DevLog-034 (refined element-local field plots, Resolution and Smoothing)
date: 2026-10-15 (started 21:15 PDT, written 21:40 PDT)
auditor: fresh-context Claude subagent (did not write DevLog-034)
scope: gates; independent exactness and smoothing checks; visual inspection (renaud2023-3um-738, mao2022-a mesh Fine; dark and light; WebGL and Canvas 2D); performance (mao2022-a Fine, 3 repeats); regressions of contours, arrows, Max/Min, cut lines, export
---

# DevLog-034 verification (2026-10-15)

Read-only on code. Only file written in the repo: this report. No git state changes. Scratch scripts and logs in the
session scratchpad (outside the repo); all screenshots and browser profiles deleted. Preview server (port 48217, checked
free) stopped; no browser or server left running. Machine: Apple M4 Pro, headless Chrome (playwright-core, own temp
profiles), `nice -n 10`, Node `--max-old-space-size=1536`, one heavy task at a time.

## 1. Gates (re-run on the working tree)

| Gate | Claimed | Measured |
|---|---|---|
| engine `npm test` | 253 tests, 250 pass, 0 fail, 2 skipped, 1 todo | 253 tests, 250 pass, 0 fail, 2 skipped, 1 todo (the todo is the known Q2 F1 D5 test), 58.2 s |
| engine `npm run test:reference` | 11/11 | 11/11, 24.1 s |
| app `npm test` | 63/63 | 63/63 (6 files) |
| app `npm run check` | 0 errors 0 warnings (465 files) | 0 errors 0 warnings 0 files with problems (465 files) |
| app `npm run build` | OK | OK (chunk size warning only, pre-existing) |
| app `npm run smoke` | exit 0, 46 PASS | exit 0, 46 PASS, incl. the DevLog-034 refined-plot step; faceting proxies reproduce the DevLog numbers (optical r1 none 0.0985, Normal material 0.0331, Fine none 0.025; same-material jump 0 with smoothing, 0.00194 with None) |

All gates reproduce exactly.

## 2. Independent exactness (own script, not the repo tests)

Method, renaud2023 and mao2022 (configured mesh; electrostatics + vector optical mode, keep), 20 random elements per
quantity (seeded LCG), `smoothing: 'none'`:

- (a) Polynomial reconstruction: inside an element, Nedelec order 2 + Lagrange P2 E_z gives degree-2 components,
  |E|^2 is degree 4, P2 potential degree 2, its gradient degree 1. The degree-k Lagrange interpolant built from the
  refined values at r = k was evaluated at 5 random interior points per element (min barycentric > 0.02, not lattice
  points) and compared with `evaluateAtPoints` (point location by coordinates).
- (b) Direct at Normal (r = 3): interior lattice points vs `evaluateAtPoints` at the same coordinates; edge and vertex
  lattice points vs a point moved 1e-9 of the way towards the element centroid (own side).

Max |difference| / max |value| of the plot:

| Quantity | renaud (a) 100 pts | renaud (b) interior / edge | mao (a) | mao (b) interior / edge |
|---|---|---|---|---|
| real(opt.Ex) | 3.5e-16 | 2.3e-16 / 6.2e-11 | 5.8e-16 | 1.9e-16 / 1.1e-10 |
| real(opt.Ey) | 9.9e-16 | 1.4e-15 / 1.1e-10 | 8.7e-16 | 6.2e-16 / 6.9e-11 |
| imag(opt.Ez) | 2.5e-16 | 2.5e-16 / 5.6e-11 | 8.3e-16 | 1.2e-15 / 7.0e-11 |
| opt.normE^2 (k = 4) | 1.1e-16 | 2.7e-17 / 3.1e-11 | 1.6e-15 | 2.0e-16 / 2.4e-10 |
| es.V (k = 2) | 1.2e-15 | 6.7e-16 / 2.6e-11 | 4.4e-16 | 4.4e-16 / 2.6e-11 |
| es.Ex (k = 1) | 1.1e-14 | 2.3e-15 / 1.4e-11 | 8.6e-15 | 8.8e-15 / 1.3e-11 |
| es.Ey (k = 1) | 2.4e-14 | 7.2e-15 / 2.0e-10 | 1.9e-14 | 6.0e-15 / 8.7e-12 |
| es.normE (non-polynomial) | n/a | 2.8e-15 / 6.0e-12 | n/a | 5.2e-15 / 7.2e-12 |

imag(opt.Ex) and real(opt.Ez) are identically 0 (phasor convention) and match exactly. Edge residuals are the 1e-9
shift times the gradient. Verdict: refined values are the exact element-local interpolation to round-off, and the
lattice values determine the element polynomial as expected (the renderer receives the true field, not an
approximation of it).

Smoothing (r = 3), coincident points grouped by rounded coordinates (1e-6 um), i.e. independent of the engine's
topology-based slot maps; material from `regionMaterials[triRegion]`:

| Mesh / expr | lattice pts | shared groups | interface groups | material vs coord mean | everywhere vs coord mean | interior changed | largest kept jump / max abs | cross-material mixing |
|---|---|---|---|---|---|---|---|---|
| renaud opt Ex, Ey, normE^2 | 75,340 | 26,280 | 866 | 0 | 0 | 0 | 0.29 / 0.42 / 0.23 | 0 |
| renaud es normE, Ey | 298,380 | 103,598 | 9,151 | 0 | 0 | 0 | 0.40 / 0.53 | 0 |
| mao opt Ex, Ey, normE^2 | 53,660 | 18,712 | 706 | 0 | 0 | 0 | 0.65 / 0.52 / 0.62 | 0 |
| mao es normE, Ey | 382,800 | 133,636 | 5,183 | 0 | 0 | 0 | 0.23 / 0.57 | 0 |

Inside material domains equals the same-material mean exactly, Everywhere equals the full mean, interior points are
untouched, and jumps at material interfaces are kept (never averaged across materials). Material identity is the
material name; crystal orientation is part of the material entry (`materials.<name>.crystal`), so the DevLog statement
holds. Physics spot check: renaud opt.normE^2 at y = 0.2 um across the rib sidewall x = 0.3 um: 3.41e14 inside,
8.44e14 outside (normal Ex jump), visible as a sharp edge in the Normal + Inside material plot.

## 3. Visual (WebGL, `?pool=2&debug=1`, viewport 1600 x 1000)

Shots: renaud2023-3um-738 and mao2022-a (`mesh=0.5`, 110,186 es elements); optical |E|^2, Ex, Ey, imag(Ez) at the
rib / a-Si strip corner (renaud 0.05..0.55 x 0..0.4 um and tight 0.18..0.36 x 0.08..0.32; mao 0.25..0.75 x
0.55..0.9); es.normE in the gap and at the electrode foot (renaud 1.35..1.75 x 0..0.3 and tight 1.42..1.56 x
0.06..0.16; mao 2.8..3.2 x 0.55..0.9); es.V with contours; EO overlap arm A; Resolution None / Normal / Fine;
Smoothing None / Inside material / Everywhere; wireframe; dark and light; Canvas 2D fallback.

- Normal + Inside material: no element faceting visible in any optical component or es.normE at the window scales
  above. None + No refinement shows the expected per-element patches around the singular corners (Ey star at the rib
  foot, es.normE triangles at the electrode foot); Normal + None shows element discontinuities of the gradient field
  (correct for None).
- At element scale near the electrode corner (renaud tight foot window, about 3 es elements across), Normal + Inside
  material still shows creases along element edges (C0 but not C1 shading of a piecewise-linear gradient at a
  singularity); Fine changes little. This is the solution itself, not a rendering defect.
- Interfaces: jumps sharp and correctly placed at the rib / strip sidewalls and slab tops; geometry outlines and the
  wireframe (parent elements only, at r = 3) coincide with mesh edges; no seams or wrong colours seen in WebGL.
  Everywhere smears a one-element band with small irregularities along interfaces with a field jump (expected for
  that option).
- Contours: es.V contours continuous, smooth at Normal, slightly kinked at r = 1, refracted at dielectric interfaces;
  |E|^2 contours on the EO view break at the rib sidewall where |E|^2 jumps (physical).
- Light theme: dark wireframe and arrows, legends and labels readable; same field rendering.
- Arrows (es.Ex, es.Ey) on refined data: correct directions in gap, slab and cladding; none over electrodes.
- Canvas 2D fallback: flat sub-triangle shading (documented open item) and faint dark dotted seams along sub-triangle
  edges (finding F3).
- Probe: exact value always; drawn-value note only with smoothing and only where they differ. renaud at
  (1.4973, 0.118): "es.normE 0.96298 V/um (drawn 0.7167, smoothed)" (Inside material), "(drawn 0.77314, smoothed)"
  (Everywhere), no note with None; at (1.45, 0.06) no note in any mode. mao at (2.997, 0.698): 0.98382 V/um, drawn
  0.78815 (material) / 0.81062 (everywhere). DevLog quotes 0.96276 / 0.71676 for renaud; the difference is the probe
  position quantised to pixels in a different view, not a discrepancy in method.

## 4. Performance (mao2022-a mesh Fine, Normal r = 3: 991,674 sub-triangles; 3 runs each, fresh profile per run)

Timing harness: in-page `performance.now()` from the state change until the drawn data match, `data-pending` is false
and a new paint happened (second set of runs; the first set used 50 ms Node polling and is not used for switch times).

| Metric | run 1 | run 2 | run 3 |
|---|---|---|---|
| First field paint after the result (app `paintInfo`, Electric Potential) ms | 77.2 | 86.6 | 80.3 |
| Electric Field first plot, worker eval ms | 21.8 | 25.9 | 24.9 |
| Switch to es.Ex: wall / worker ms | 17.0 / 12.1 | 15.6 / 12.4 | 15.9 / 12.5 |
| Switch to es.Ey: wall / worker ms | 14.1 / 11.3 | 12.9 / 12.3 | 14.5 / 11.3 |
| Back to es.normE (cached) wall ms | 12.8 | 9.7 | 9.1 |
| Finer (capped to r = 4, confirmed) wall / worker ms | 76.7 / 71.6 | 75.1 / 70.9 | 74.4 / 73.8 |
| Back to Normal (cached) wall ms | 3.3 | 3.4 | 6.9 |
| Pan/zoom (60 drag moves + 60 wheel steps, 183 frames), rAF median / p95 ms: potential, field + arrows, optical | 16.7 / 16.7-16.8 in all 9 runs | | |
| CPU draw median / p95 ms: potential, field + arrows, optical | 0.9/1.2, 2.0/4.1, 0.7/1.0 | 0.9/1.3, 2.1/4.2, 0.7/1.0 | 0.9/1.2, 2.0/4.3, 0.8/1.0 |
| Long tasks > 50 ms (PerformanceObserver, whole session incl. Compute) | none | none | none |
| Main JS heap after Compute / after Finer / end, MB | 80.2 / 125.8 / 135.9 | 80.2 / 121.4 / 137.7 | 80.2 / 207.7 / 224.5 |

One first frame after Finer took 30.4 ms CPU (run 3; buffer upload of the r = 4 display), below the 50 ms long-task
bound. Compute wall time 5.3 to 5.4 s. Gates met: first paint < 100 ms, switch < 50 ms, 60 fps, no long tasks.
Heap after Finer varies with GC timing (121 to 218 MB); see F2. The pan test started from the extents view, so the
arrow cost is lower than the DevLog's view of the fine region (10.5 ms); not re-measured there.

## 5. Regressions

- Contours, arrows: inspected (section 3). Cut line dataset / Line Graph / Line Integration, Export > Data of the plot,
  table and image, sweep-point export, Canvas 2D gap-free raster, WebGL context loss: covered by smoke PASS lines.
- Max/Min marker on refined data: drawn at the right place, but see F1.

## Findings

| # | Severity | Finding | Evidence | Fix |
|---|---|---|---|---|
| F1 | Medium | Max/Min Marker reports the smoothed extremum, with no Quality control shown for it. Its plot request carries the feature's hidden defaults (resolution normal, smoothing material; the Quality section is rendered only for Surface and Contour). | renaud Electric Field + Max/Min es.normE: marker "max 0.9183 V/um" at the left electrode foot; Node `evaluatePlot` max of the same lattice: none 1.0762e6 V/m, material 9.1832e5, everywhere 8.8446e5. The probe at the corner gives the exact (larger) value, so marker and probe disagree by 15 %. | Request Max/Min with `smoothing: 'none'` (exact element-local extremum at lattice points) or show the Quality section for Max/Min; state the smoothing in the marker label if smoothed. Arrows also carry hidden defaults (harmless; document or expose). |
| F2 | Low | Refined display memo keeps every level ever drawn for the life of the mesh (`refined.ts` WeakMap per mesh -> Map per r, no eviction); after one Finer view on mao Fine the main heap stays at 136 to 225 MB vs 80 MB before. | Heap numbers in section 4 (end of session, after switching back to Normal). | Keep only the current and previous level per mesh, or drop non-current levels on resolution change; the GPU side already has an LRU of 4 entries. |
| F3 | Low | Canvas 2D fallback: faint dark dotted seams along sub-triangle edges (anti-aliasing conflation; the refined path draws 9x more edges at Normal than before). | `?renderer=canvas` renaud es.V gap view, inspected at 3x crop. | Stroke with a slightly wider line (1 px) or disable smoothing edges by drawing each sub-triangle slightly expanded; fallback only. |
| F4 | Low, pre-existing (DevLog-032, not DevLog-034) | Axis tick labels show miter spikes from the 3 px text halo (`strokeText` with the default miter join), e.g. on '2' glyphs. | Graphics.svelte `label()` around line 519; visible on every plot. | `ctx.lineJoin = 'round'` (or `miterLimit = 2`) inside `label()` and the other `strokeText` calls (domain labels, markers). |
| F5 | Info | Color range follows the drawn (smoothed) data, so the legend max drops with smoothing at singular corners (mao optical |E|^2: about 2e15 None, 1.7e15 Inside material, 1.4e15 Everywhere). Expected COMSOL-like behaviour; worth one sentence in the Smoothing tooltip. | Section 3 shots. | Tooltip text. |

No artefacts found in the WebGL path: no seams, no wrong colours at interfaces, wireframe aligned, contours unbroken
inside materials. Exactness and smoothing claims of DevLog-034 confirmed independently; all gates reproduce.
