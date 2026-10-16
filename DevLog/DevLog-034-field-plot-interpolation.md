---
title: Field plot interpolation - higher-order element rendering and COMSOL-style smoothing
date: 2026-10-15
status: implemented (gates below); fresh-context verification and commit pending
owner: orchestrator (Claude, at Wentao Jiang's request); implementation by a subagent
scope: engine/src/postproc (plot sampling), app/src/lib/sim (renderer, plot settings)
---

# DevLog-034: field plot interpolation

## Request (user, 2026-10-15)

"Improve the plot/visualization, e.g. the optical field plot is discrete across mesh elements. Do proper at least
quadratic interpolation. It should be quite standard."

## Diagnosis

- Vector optical fields come from Nedelec (edge) elements: only the tangential component is continuous between
  elements, and the plot path uses per-element (centroid or element-constant) values, so the display is piecewise
  constant: visibly faceted. The same applies to E = -grad(phi) of the P2 electrostatic potential (linear inside each
  element, discontinuous between elements) and to derived quantities (|E|^2, Sz, eo.integrand, Pockels dn).
- Only the P2 potential itself is drawn with its quadratic shape (4x subdivided parents, R-UI round 1).

## Plan (standard FEM postprocessing, as COMSOL does)

1. Element-local sampling of the true interpolation: each parent triangle is subdivided into a refinement pattern of
   sub-triangles (level r: (r+1)(r+2)/2 sample points, r^2 sub-triangles; r = 2 at least, i.e. the 6 P2 points,
   default chosen so that quadratic/cubic fields render smooth; COMSOL's "Resolution" setting). Values at every
   sample point are evaluated exactly from the element basis (Nedelec order 1/2 + Lagrange E_z for optics, P2
   gradient for electrostatics, any expression by evaluating its variables at those points). Values are stored per
   element-local sample point (not shared), so element discontinuities are represented faithfully.
2. COMSOL smoothing options, per plot feature: None (element-local, discontinuous), Inside material domains (default:
   average coincident sample points of elements in the same region; jumps preserved at material interfaces, where the
   normal field component is physically discontinuous), Everywhere (average across all elements). Smoothing on
   coincident points only (vertices and edge points), weighted by element area or plain average (document).
3. GPU path: upload the sub-triangle vertex arrays once per (dataset, mesh, resolution); per-expression value buffers;
   Gouraud shading inside sub-triangles; colormap texture as now. Contours computed on the refined sub-triangle set.
   Probe and cut line already evaluate exactly; make sure they agree with what is drawn (smoothing None) and state when
   smoothing makes the drawn value differ from the exact point value.
4. Quality settings in the plot feature (COMSOL Quality section): Resolution (Coarse, Normal, Fine, Finer, Extra fine
   -> r), Smoothing (None / Inside material domains / Everywhere), and an automatic cap on total sub-triangles to keep
   memory bounded (e.g. <= 2.5M sub-triangles; lower r automatically with a message).

## Gates

- Exactness: drawn sample values equal exact point evaluation at those points (smoothing None) to round-off;
  smoothing Inside material domains never averages across a region boundary.
- Visual: optical mode |E|^2, Ex, Ey, Ez and es.normE on renaud2023 and mao2022 show no element faceting at default
  resolution (screenshots inspected, light and dark, zoomed into the rib corner and the gap).
- Accuracy proxy: on a smooth analytic field (fixture) the rendered (interpolated) field error at random points
  decreases with resolution as expected.
- Performance: first plot after Compute < 100 ms for mao2022 P2 fine (Normal resolution), switching expression
  on the same dataset < 50 ms, 60 fps pan/zoom, no long tasks > 50 ms, memory within budget.
- Existing gates: engine suite, reference tests, app test/check/build/smoke.

## Plan refinements (implementation subagent, 2026-10-15 20:50 PDT, before implementation)

Engine (`engine/src/postproc/refine.mjs`, new; `store.mjs`, `evaluate.mjs`):
- Refinement pattern of level r: barycentric lattice L = (n0, n1, n2) / r, n0 + n1 + n2 = r, ordered n0 outer, n1
  inner (index n0 (r + 1) - n0 (n0 - 1) / 2 + n1); (r + 1)(r + 2) / 2 points and r^2 sub-triangles per element
  (up: (i, j), (i+1, j), (i, j+1); down: (i+1, j), (i+1, j+1), (i, j+1)). r = 1 is the element corners.
- `evaluatePlot(store, {location: 'refined', resolution, smoothing})` on mesh datasets: one value per element-local
  lattice point (layout element-major, length nTris x np). Every value comes from the existing store point
  evaluation with the element given (structured point set, no point location): Nedelec order 1/2 + Lagrange E_z,
  H from the curl, P1/P2 potential and P2 gradient, scalar P1 modes, region and material data of the element, EO and
  Pockels quantities (the static field is located in the es mesh as before), any expression of these. Points on an
  element edge or vertex therefore carry the value of that element's side (discontinuities kept).
- Resolution names (COMSOL Quality > Resolution): No refinement r = 1, Coarse 2, Normal 3 (default), Fine 4, Finer 6,
  Extra fine 8; an integer 1..16 is also accepted. Cap: nTris x r^2 <= 2.5M sub-triangles (option
  `maxSubTriangles`); above it r is lowered to the largest level that fits and the result says so (`resolution`,
  `requestedResolution`, `capped`). Normal = 3 is chosen so mao2022 P2 Fine (110,186 elements) stays near 1.0M
  sub-triangles; final choice confirmed by the measurements below.
- Smoothing (COMSOL Quality > Smoothing): `none` (element-local values, every element discontinuity drawn),
  `material` = Inside material domains (default), `everywhere`. Smoothing replaces the value at every coincident
  sample point (element vertices and edge lattice points) by the plain arithmetic mean of the finite element-side
  values there; interior points are unchanged. Inside material domains averages only elements whose regions have the
  same material name (a material entry carries its crystal orientation, so different orientations are different
  materials); jumps at material interfaces (normal D continuity, E discontinuous) stay sharp. COMSOL semantics: two
  adjacent regions of the same material are one material domain and are smoothed together; the gate "never averages
  across a region boundary" is tested as "never averages across a boundary between different materials" (and
  `none` never averages at all). Coincidence comes from mesh topology (edge neighbours), not coordinates. Smoothing is
  applied to the displayed real number (after unit conversion and real/imag/abs).
- Slot maps (coincident-point groups) cached per (mesh, r, mode) in the store; values of refined point sets cached
  by the byte-bounded LRU (entries larger than the cache are not kept).
- `p2nodes` location, `p2DofPointSet` and the area-weighted P2 smoothing are removed (covered by `refined`, r = 2
  holds the P2 nodes); the UI 4x subdivision (`session.p2Mesh`, `lib/sim/p2.ts`) is removed.
- Exported helpers shared by engine and UI (one implementation): `refinePattern(r)`, `refinedPoints(mesh, r)`
  (coordinates, same arithmetic as the store), `interpolateRefined(values, r, t, L)` (drawn value inside element t:
  linear on the containing sub-triangle), `RESOLUTIONS`, `MAX_SUBTRIANGLES`.

UI:
- Plot values are element-local lattice values on the parent display mesh ('es', 'opt', ...). The WebGL renderer
  draws every layer indexed (`drawElements`, Uint32) on a per-(mesh, r) buffer set: positions of the lattice points,
  parent barycentrics (wireframe draws parent element edges only, at every r), region; one value buffer per array.
  Gouraud shading inside sub-triangles; contours (fragment shader iso-lines) therefore run on the refined set. Mesh
  view and region layers use r = 1. Canvas 2D fallback draws sub-triangles (raster sampler over budget) and marches
  contours on sub-triangles.
- Quality section of Surface and Contour: Resolution (No refinement ... Extra fine, tooltip with r and counts),
  Smoothing (None / Inside material domains / Everywhere); a capped resolution is stated under the field.
- Probe: exact point value (unchanged); when the feature smooths and the drawn value differs from it by more than
  1e-3 of the color range, the probe line adds the drawn value ("drawn ..., smoothed").
- Export > Data writes the element-local sample points (x, y, value) of the plot (resolution and smoothing named).
- Arrows sample the drawn interpolation of their x / y plots (same path).

Tests and gates added: engine `postproc-refine.test.mjs` (pattern, exactness to round-off vs `evaluateAtPoints` at
element-interior sample points and, at edge points, vs exact evaluation 1e-7 inside the element (its own side) for
vector order 1 and 2, P2 es, scalar, EO (interior only for fields of another mesh); smoothing groups never mix materials; `none` returns raw values; cap; analytic convergence ~ r^-2), app unit
tests of the refined display and interpolation, smoke: resolution and smoothing switch, browser drawn values = Node
`evaluatePlot` at sample indices, faceting proxy (max |dv| over sub-triangle edges / color range) below a bound.

## TODO

- [x] Engine: refined sampling location (sub-triangle pattern, exact evaluation, element-local values) + smoothing
      helper + tests.
- [x] UI: renderer path for refined element-local data, Quality section (Resolution, Smoothing), contours on the
      refined set, probe consistency note, memory cap.
- [x] Fresh-context verification with screenshots and the gates above.
- [ ] Commit and push on request.

## Progress log

- 2026-10-15 Plan written; implementation delegated to one subagent owning engine/src/postproc and app/src/lib/sim
  (no other lane active).
- 2026-10-15 20:50 PDT Plan refinements written (section above) before implementation.
- 2026-10-15 21:00 PDT Engine: `postproc/refine.mjs` (pattern, `refinedPoints`, `interpolateRefined`, edge neighbours
  from the vertex-to-element adjacency, smoothing slot maps, `smoothValues`), `evaluatePlot` location `refined`
  (resolution names, cap, smoothing), store point sets `refine<r>` (cached up to 4M points under the 128 MiB LRU;
  entries larger than the cache are no longer kept), slot maps cached per (mesh, r, mode), `WalkLocator` takes the
  shared neighbour array. Removed: location `p2nodes`, `p2DofPointSet`, the area-weighted P2 smoothing, the `p2`
  pattern. Tests: new `engine/tests/postproc-refine.test.mjs` (6 tests); the round-2 test now checks refined r = 2
  corner values = node values and that `p2nodes` is rejected.
- 2026-10-15 21:05 PDT UI: `lib/sim/refined.ts` (refined display per (mesh, r): lattice coordinates from the engine,
  Uint32 sub-triangle indices, parent barycentrics; `drawnAt`), WebGL renderer indexed per (mesh, r) with a parent
  barycentric attribute (wireframe = parent elements at every r), Canvas 2D fallback on sub-triangles (raster sampler
  over budget, contours marched on sub-triangles), `PostSession.plot` returns refined values (min/max over the
  selection with lattice positions), Quality section (Resolution, Smoothing, capped-resolution notice), probe drawn
  note, Export > Data of the lattice points, arrows interpolate the refined x/y plots. Removed: `lib/sim/p2.ts`, the
  `es.p2` display mesh, `session.p2Mesh`, layers `smoothed` / `contourValues` / `atOf` / `sampleAt`,
  `fieldmath.triToNode`, renderer `deindex`. Note: one `git rm --cached` on `p2.ts` was run by mistake and undone
  at once with `git restore --staged` (index back to its prior state; the file is deleted in the working tree only).
- 2026-10-15 21:13 PDT Gates run (below); preview server (port 47631) stopped; no browser or server left running.
- 2026-10-15 21:47 PDT Fix round (audit `DevLog/audits/simulator-refined-plots-verification-2026-10-15.md`):
  - F1: Max/Min markers request smoothing None at the feature's own resolution (`requests.plotRequest`); the worker
    adds the exact point value at the extremum locations (`maxAtValue`, `minAtValue`, `evaluateAtPoints`, the probe's
    evaluation) and the marker shows it. Quality section now shown for Max/Min (Resolution; "Smoothing: None (exact
    extrema)") and Arrow Surface (Resolution, Smoothing). Audit case renaud2023 es.normE: marker max 1.0762017902959808
    V/um at (-1.5, 0.92) um = probe value (was 0.9183, the smoothed extremum). Smoke: marker position = Node lattice
    argmax (None), marker value = Node `evaluateAtPoints` = browser probe (1e-12); G-S-G optical |E|^2 marker
    2.885580e14 = lattice max, smoothed surface max 2.883360e14.
  - F2: `refinedDisplay` keeps the current and previous level per mesh (LRU of 2); GPU mesh entries keep only nT and np
    of the display. mao2022 Fine, potential, main JS heap after forced GC: 76.2 MB after Compute (Normal), 130.1 MB
    after Finer, 130.1 MB back at Normal (Finer is the previous level), 118.8 MB after Coarse then Normal (Finer
    released; the rest is the Coarse display and the plot value cache, bounded at 192 MB).
  - F3: Canvas 2D sub-triangles stroked 1 px in their own color (overdraw); zoomed renaud es.V crop shows no seams.
  - F4: `lineJoin = 'round'` for tick labels, domain labels and marker labels (crop: no miter spikes).
  - F5: Smoothing tooltip states that the color range follows the smoothed (drawn) values and the probe shows exact values.
  - Gates: engine 253 tests, 250 pass, 0 fail, 2 skipped, 1 todo; test:reference 11/11; app test 63/63; check 0/0
    (465 files); build OK; smoke exit 0, 46 PASS (the refined-plot step now includes the F1 checks).

## Results (2026-10-15 21:13 PDT, Apple M4 Pro, `nice -n 10`, Node `--max-old-space-size=1536`, one headless Chrome)

Exactness (smoothing None, renaud2023-3um-738 vector order 2 and order 1, P2 electrostatics; max |drawn - exact| /
max |value|; interior lattice points vs `evaluateAtPoints` at the same coordinates; edge lattice points vs a point
1e-7 of the way to the element centroid, i.e. the element's own side):

| Quantity (r) | interior points, max rel | edge points, max rel |
|---|---|---|
| opt.Ex, order 2 (3) | 5.8e-16 (7,534 pts) | 7.4e-9 (45,204 pts) |
| opt.Ey, order 2 (3) | 1.8e-15 | 2.0e-8 |
| imag(opt.Ez), order 2 (3) | 7.3e-16 | 1.0e-8 |
| opt.normE^2, order 2 (3) | 7.3e-16 | 8.1e-9 |
| es.V, P2 (3) | 6.2e-15 (29,838 pts) | 3.8e-9 (179,028 pts) |
| es.normE, P2 gradient (3) | 7.3e-14 | 2.4e-8 |
| eoA eo.integrand (3) | 7.6e-16 | n/a (static field of another mesh, located by coordinates) |
| opt.Ex / imag(opt.Ez) / opt.normE^2, order 1 (4) | 4.7e-16 / 7.3e-16 / 9.8e-16 (114,672 pts) | 1.7e-9 / 6.5e-9 / 1.8e-9 |

Edge residuals are the 1e-7 inward shift times the field gradient (the shifted point is not the lattice point), not an
evaluation difference. Scalar P1 mode, P1 electrostatics and the scalar EO integrand (G-S-G fixture) pass the same checks
(test bounds: interior 1e-11, edge 1e-5 of max |value|). Smoothing (renaud2023 opt.Ey, r = 3): `everywhere` = mean of all element sides at every coincident point,
`material` = mean over elements of the same material only, interface points keep the jump (Ey normal to the
horizontal LN / oxide / air interfaces), interior points unchanged (test, 1e-12 of max |value|).

Convergence of the drawn field (rms of drawn - exact over 3,000 random interior points / max |exact|, smoothing None,
renaud2023):

| Field | r = 1 | 2 | 3 | 4 | 8 |
|---|---|---|---|---|---|
| sin(x/0.4 um) cos(y/0.3 um) on the opt mesh | 2.03e-3 | 5.12e-4 | 2.29e-4 | 1.27e-4 | 3.33e-5 |
| opt.normE^2 | 7.31e-4 | 1.85e-4 | 8.36e-5 | 4.59e-5 | 1.15e-5 |
| es.V (P2) | 1.65e-4 | 4.18e-5 | 1.50e-5 | 9.84e-6 | 2.38e-6 |

Ratios 2 -> 4 and 4 -> 8 are 3.8 to 4.2 (r^-2, piecewise-linear interpolation of smooth element fields); the test
asserts 3 to 5.5.

Faceting proxy (smoke, synthetic G-S-G fixture with the vector solver, browser drawn arrays): largest value step
inside one sub-triangle / color range: optical |E|^2 0.0985 (r = 1) -> 0.0331 (Normal) -> 0.025 (Fine); potential
0.25 -> 0.0833 -> 0.0625. Largest jump between coincident points of same-material elements / range: 0 with Inside
material domains and Everywhere (drawn field continuous across element edges), 0.00194 with None for |E|^2 (the
element discontinuity of the Nedelec field), 0 for the continuous potential.

Screenshots (inspected; scratch only, deleted with the scratchpad):
- renaud2023 (vector order 2, 7,534 optical elements, 29,838 P2 electrostatic elements): optical |E|^2, Ex, Ey,
  imag(Ez) zoomed to the right rib corner (0.05..0.55 x 0..0.4 um) at Normal / Inside material domains: smooth inside
  every material, no element facets; the Ex and |E|^2 jump on the vertical rib sidewall and the Ey extrema at the rib
  top corner and foot are sharp (material interfaces); with wireframe only the parent elements are outlined.
  None + No refinement on the same view shows the per-element linear patches. es.normE in the gap (-1.8..1.8 um) and
  at the right electrode foot (1.35..1.75 x 0..0.3 um): smooth inside LN and cladding, the jump at the slab / cladding
  interface y = 0.12 um kept; None + No refinement shows visible element facets around the corner singularity; the
  largest drawn value (over all elements) is 1.0762 V/um with None and 0.9183 V/um with Inside material
  domains (Node, same plots): smoothing averages the element sides at the singular corner; the probe still gives the
  exact value.
  EO overlap arm A (eo.integrand with the |E|^2 contour) and light theme variants (|E|^2 corner, es.normE corner and
  gap): same rendering, legends and edges readable.
- mao2022-a at mesh level Fine (110,186 P2 electrostatic elements; optical 15,265 elements): optical |E|^2, Ex, Ey,
  imag(Ez) at the a-Si strip corner (0.25..0.75 x 0.55..0.9 um): smooth, the |E|^2 enhancement in the thin layer
  beside the strip sidewall and the Ey extrema at the strip corners are sharp; es.normE in the gap (-3.4..3.4 um) and
  at the electrode foot (2.8..3.2 x 0.55..0.9 um), dark and light: smooth with the slab interface jump; None + No
  refinement shows the element facets at the corner. Finer on the potential: capped to r = 4 (1,762,976
  sub-triangles) with the notice under Quality.
- Canvas 2D fallback (renaud2023, `?renderer=canvas`): sub-triangles drawn flat (mean of the three corners), finer
  facets than before but not Gouraud; over budget the raster sampler draws the interpolated values (smoke W4 gap-free).

Probe: exact value as before; with smoothing on, the drawn value is added when it differs by more than 1e-3 of the
color range, e.g. renaud2023 at (1.4973, 0.118) um next to the electrode corner: "es.normE 0.96276 V/um (drawn
0.71676, smoothed)"; with None the note is absent.

Performance (production build, headless Chrome, ANGLE Metal Apple M4 Pro, `?pool=2`):

| mao2022-a mesh Fine, P2, 110,186 elements, Normal (r = 3, 991,674 sub-triangles, 1,101,860 lattice values) | ms |
|---|---|
| First field paint after the result (Electric Potential, es.V surface + contour; app log) | 78.1 |
| Plot round trip es.V (first) | 44.6 |
| Electric Field first plot: round trip / draw incl. value upload | 35.2 / 8.1 |
| Expression switch es.Ex, es.Ey: round trip / draw incl. upload | 18.2 / 9.4, 19.5 / 9.2 |
| Switch back to a cached expression: draw | 0.2 |
| Finer (capped to r = 4, 1,762,976 sub-triangles): round trip | 58.1 |
| Pan/zoom 120 frames, potential: rAF median / p95, CPU draw median / p95 | 16.6 / 18.2, 0.7 / 0.9 |
| Pan/zoom, field with view-gridded arrows: rAF, CPU draw | 16.6 / 18.3, 10.5 / 11.5 |
| Long tasks > 50 ms (PerformanceObserver) during Compute, plots, switches, pan/zoom | none |

- renaud2023 (Normal): optical plots round trip 5 to 20 ms, EO integrand 23 to 32 ms, es.normE 8 to 12 ms.
- Engine alone (Node, mao2022 Fine, Normal): es.normE first 53 ms (incl. slot maps and the es bundle of 1.1M
  points), repeat 9.4 ms; es.V 8.5 ms; smoothing adds about 2 ms.
- The arrow CPU time is the existing grid locator (`fieldmath.locate`, about 16 us per arrow in the dense
  bins of this graded mesh, Node measurement 9.4 ms for 600 arrows); it was paid twice per arrow before (two
  `sampleAt` calls), once now. 60 fps holds.
- Memory: main-thread JS heap 80 to 116 MB at Normal, 175 MB after Finer (performance.memory); GPU buffers per
  (mesh, r) computed from their sizes: 33.9 MB at mao Fine / Normal (positions 8.8, barycentrics 8.8, region 4.4,
  indices 11.9) plus 4.4 MB per value array (at most 6 kept per mesh entry); worker value cache bounded by the 128 MiB
  LRU (99 MB after three expressions at Normal, Node); cap 2.5M sub-triangles.

Gates: engine suite 253 tests, 250 pass, 0 fail, 2 skipped, 1 todo (the known Q2 F1 todo); `npm run test:reference`
11/11; app `npm test` 63/63; `npm run check` 0 errors 0 warnings (465 files); `npm run build` OK; `npm run smoke` exit
0, 46 PASS lines, including the new step "refined field plots: Resolution and Smoothing switch, browser drawn values =
Node engine, interior points = exact evaluation, continuous within material domains". Smoke changes: the Chen field
view expects 9 x nTris drawn sub-triangles (Normal); Export > Data of a sweep point has one row per drawn lattice point.

Open items:
- Canvas 2D fallback shades sub-triangles flat (Canvas 2D has no Gouraud); the WebGL path is the reference.
- Arrow grid placement 'view' re-locates every arrow per frame (pre-existing cost, about 10 ms CPU per frame on
  mao2022 Fine with 600 arrows in the fine region); a per-view cache or a finer locator would cut it.
- Normal = r 3 is fixed for every mesh; a coarse optical mesh could afford a higher default within the gates.
- 2026-10-15 Orchestrator: fresh-context verification (`DevLog/audits/simulator-refined-plots-verification-2026-10-15.md`)
  reproduced all gates (engine 253: 250 pass, 0 fail, 2 skipped, 1 todo; reference 11/11; app 63/63; check 0/0;
  build; smoke 46/46), confirmed exactness with an independent polynomial reconstruction (<= 2.4e-14 interior) and
  smoothing never crossing materials, and found no WebGL faceting or artefacts at Normal + Inside material.
  Findings: F1 (medium) Max/Min marker shows the smoothed maximum (renaud es.normE 0.9183 vs exact 1.0762 V/um);
  F2 refined-mesh cache keeps every resolution; F3 Canvas fallback seams; F4 tick label outline spikes; F5 smoothing
  tooltip. Fix round sent to the implementer.
- 2026-10-15 Fix round done (F1 exact Max/Min value 1.0762017902959808 V/um equals the probe; F2 cache keeps current
  and previous resolution; F3, F4, F5). Orchestrator gate run on the final tree (sequential, nice): engine 253
  (250 pass, 0 fail, 2 skipped, 1 todo), reference 11/11, app 63/63, check 0 errors 0 warnings (465 files), build OK,
  smoke exit 0, 46 PASS. Nothing committed.
