---
title: Fresh-context audit of the postprocessing engine (lane R-ENG, DevLog-031) against the DevLog-033 references
date: 2026-10-15
auditor: fresh-context Claude subagent
scope: engine/src/postproc/* (units, expr, store, evaluate, eo-analysis, sweep-store), engine/src/run.mjs keep/internals, engine/src/stages.mjs EO breakdown wiring, engine/cli.mjs --eval/--list-vars/--modes, sims/SPEC.md postprocessing section, engine/tests/postproc.test.mjs; comparison with validation/reference/eo-overlap-<case>.json and summary-eo.json (K4, K5-g3..g8, K7-D0..D3.6, K7K4-D0..D1.8)
---

# R-ENG audit (2026-10-15)

No engine code was changed. All runs: `nice -n 10`, Node 23.7 `--max-old-space-size=1536`, one heavy process at a
time (peak RSS 1.26 GB, K4 level L2). Scratch scripts, per-run JSON and logs: `scratchpad/audit-r-eng-cmp/`
(356 KB; kept as evidence, safe to delete).

## Verdict

- Definitions in `eo-analysis.mjs` match DevLog-033 term by term (check 2). Every engine quantity (dn_eff/V, the r33 /
  r13 / r51 / r22 split, slab / rib split, Gamma |E|^2 and |E_x|^2, Gamma per region, Gamma_equiv, the three textbook
  VpiL variants, W', line integrals) agrees with the independent references to 0.1-3.5e-3 relative at the default
  mesh. The difference has the same sign and size in every quantity, shrinks with electrostatic refinement, does not
  change with optical refinement, and a two-level extrapolation puts most cases within about 2 U. This is
  electrostatic discretization of the engine mesh, not a definition mismatch.
- Gates: engine suite 239 tests (236 pass, 0 fail, 2 skipped, 1 todo); `npm run test:reference` 11/11. Both match
  the claims.
- One gate claim is false on realistic meshes (E1). The integral of `eo.integrand` equals the engine dn_eff/V only
  to 7e-9 .. 3.8e-6 relative, not 1e-9. The cause is the point locator's choice of triangle at electrostatic element
  edges.
- No blocking defect. One major finding (E1, a missed acceptance gate that is numerically small), six minor, seven
  notes.

## Method

- `cmp.mjs CASE meshScale p2MeshFactor`: `runCrossSection(case, {stages: ['eo_overlap'], solver: 'vector', keep: true,
  ...})` followed by `createSolutionStore`. W' = `surface_int es.We` (symmetry none). Line integrals use
  `line_int -(es.Ex*t1x+es.Ey*t1y)` from the signal edge to the ground edge, at y = 0.15 um and at the electrode bottom
  (0.3 um for K4/K5/K7K4, 0.5 um for K7). EO values come from `result.eo.arms.X.breakdown` / `.conventional` /
  `result.eo.conventional`, plus `surface_int eo.integrand` on `eoA` / `eoB`.
- Levels. L0 = engine defaults (meshScale 1, P2, p2_mesh_factor 2, so ES scale 2). L1 = ES scale 1.41 (p2MeshFactor
  1.41), with optical meshScale 1. L2 = optical meshScale 0.71, ES scale 1.42. For K5-g6 and K5-g8, ES scale 1.41 at
  meshScale 1 exceeds the 80,000-vertex budget, so L1 uses scales 1.6 and 1.7, and K5-g8 L2 uses 1.704. K5-g6 L2 ran at ES scale 1.42, which is finer than its L1, so its L2 column mixes ES and optical refinement.
- Reference value = `extrapolated.<key>.f_ext` and U. The case YAML sha256 of all 13 reference JSONs matches the
  current `validation/cases`. K5-g5 and K7K4-D0 differ from K4 only in id/title, so the K4 runs are reused for them.
- Log `scratchpad/audit-r-eng-cmp/runall-20261015T1512.log`; tables from `table.mjs`, `analyze.mjs` and `analyze2.mjs`.

## 1. Engine vs independent references

Relative difference (engine - ref) / |ref| in units of 1e-3, levels L0 / L1 / L2. The last column is the largest
|L0 - ref| / U in the row. Arm A unless noted. The B arm mirrors A in every case (`analysis.txt`). r22 = 0 exactly in
both the engine and the reference for all cases.

| case (ES scale L0/L1) | dn A | dn B | r33 | r13 | r51 | slab | rib | max abs (L0-ref)/U |
|---|---|---|---|---|---|---|---|---|
| K4 = K5-g5 = K7K4-D0 (2/1.41) | -2.12 / -1.55 / -1.50 | 2.12 / 1.51 / 1.46 | -2.14 / -1.56 / -1.50 | -2.56 / -1.98 / -1.87 | -0.12 / 0.17 / -0.66 | -1.83 / -1.31 / -1.25 | -2.34 / -1.70 / -1.68 | 11.9 |
| K5-g3 (2/1.41) | -3.48 / -2.62 / -2.77 | 3.46 / 2.51 / 2.75 | -3.51 / -2.60 / -2.75 | -3.88 / -2.91 / -3.12 | -0.24 / -1.70 / -1.40 | -3.03 / -2.29 / -2.41 | -3.84 / -2.79 / -2.97 | 7.0 |
| K5-g4 (2/1.41) | -2.64 / -1.82 / -1.84 | 2.78 / 1.88 / 1.99 | -2.69 / -1.85 / -1.87 | -3.32 / -2.36 / -2.47 | 0.48 / -0.21 / 0.31 | -2.46 / -1.68 / -1.68 | -2.94 / -2.06 / -2.10 | 7.0 |
| K5-g6 (2/1.6) | -1.51 / -1.38 / -1.16 | 1.64 / 1.35 / 1.06 | -1.60 / -1.41 / -1.21 | -2.18 / -2.14 / -1.75 | 1.78 / -0.78 / -0.06 | -1.25 / -1.21 / -1.02 | -2.10 / -1.82 / -1.56 | 18.6 |
| K5-g8 (2/1.7) | -1.38 / -1.09 / -1.20 | 1.33 / 1.30 / 1.19 | -1.49 / -1.14 / -1.27 | -2.15 / -1.76 / -2.16 | 2.46 / 0.38 / 0.95 | -1.11 / -0.87 / -0.95 | -2.10 / -1.73 / -1.89 | 25.5 |
| K7-D0 (2/1.41) | -0.27 / -0.22 / -0.20 | 0.30 / 0.20 / 0.24 | -0.26 / -0.22 / -0.20 | -0.98 / -0.95 / -0.93 | -0.37 / 0.40 / 0.40 | 0.10 / 0.01 / 0.04 | -1.91 / -1.33 / -1.32 | 3.5 |
| K7-D1 (2/1.41) | -0.28 / -0.26 / -0.21 | 0.31 / 0.28 / 0.21 | -0.29 / -0.24 / -0.22 | -0.84 / -0.74 / -0.66 | 1.02 / -1.44 / 1.04 | 0.10 / -0.08 / 0.01 | -1.82 / -1.00 / -1.13 | 6.8 |
| K7-D2.6 (2/1.41) | -0.32 / -0.21 / -0.24 | 0.29 / 0.21 / 0.23 | -0.31 / -0.20 / -0.24 | -0.92 / -0.60 / -0.79 | -0.52 / -1.05 / -0.33 | -0.00 / 0.01 / -0.04 | -1.62 / -1.11 / -1.11 | 7.1 |
| K7-D3.6 (2/1.41) | -0.41 / -0.29 / -0.31 | 0.35 / 0.28 / 0.26 | -0.37 / -0.26 / -0.27 | -1.20 / -0.86 / -0.77 | -0.83 / -0.86 / -1.42 | -0.01 / -0.05 / -0.09 | -1.85 / -1.15 / -1.09 | 8.2 |
| K7K4-D0.9 (2/1.41) | -2.40 / -1.62 / -1.60 | 2.32 / 1.61 / 1.64 | -2.47 / -1.65 / -1.62 | -2.98 / -2.10 / -2.09 | 1.21 / 0.36 / 0.06 | -2.10 / -1.41 / -1.39 | -2.90 / -1.97 / -1.95 | 13.9 |
| K7K4-D1.8 (2/1.41) | -1.73 / -1.50 / -1.67 | 1.85 / 1.66 / 1.44 | -1.95 / -1.69 / -1.93 | -2.47 / -2.07 / -2.24 | 12.77 / 10.29 / 14.62 | -0.86 / -0.84 / -0.73 | -3.10 / -2.56 / -3.17 | 4.7 |

| case | Gamma E2 A | Gamma Ex2 A | Gamma slab | Gamma rib | Gamma_equiv | VpiL full | VpiL tb | VpiL tb Ex2 | VpiL tb x n_eff/n_e | max abs (L0-ref)/U |
|---|---|---|---|---|---|---|---|---|---|---|
| K4 | 2.17 / 1.59 / 1.52 | 2.14 / 1.57 / 1.50 | 1.89 / 1.38 / 1.29 | 2.42 / 1.75 / 1.71 | 2.12 / 1.55 / 1.50 | -2.10 / -1.51 / -1.47 | -2.17 / -1.57 / -1.51 | -2.15 / -1.55 / -1.49 | -2.17 / -1.57 / -1.51 | 8.9 |
| K5-g3 | 3.54 / 2.62 / 2.78 | 3.52 / 2.60 / 2.76 | 3.31 / 2.52 / 2.65 | 3.94 / 2.81 / 3.01 | 3.48 / 2.62 / 2.77 | -3.46 / -2.56 / -2.75 | -3.54 / -2.58 / -2.78 | -3.52 / -2.56 / -2.76 | -3.54 / -2.58 / -2.78 | 6.9 |
| K5-g4 | 2.72 / 1.87 / 1.90 | 2.70 / 1.85 / 1.88 | 2.55 / 1.74 / 1.75 | 3.49 / 2.55 / 2.61 | 2.64 / 1.82 / 1.84 | -2.63 / -1.77 / -1.83 | -2.99 / -2.08 / -2.16 | -2.70 / -1.80 / -1.87 | -2.99 / -2.08 / -2.16 | 6.1 |
| K5-g6 | 1.64 / 1.45 / 1.24 | 1.61 / 1.41 / 1.21 | 1.33 / 1.24 / 1.06 | 2.25 / 1.88 / 1.62 | 1.51 / 1.38 / 1.16 | -1.69 / -1.47 / -1.22 | -1.82 / -1.56 / -1.31 | -1.79 / -1.52 / -1.28 | -1.82 / -1.56 / -1.31 | 35.5 |
| K5-g8 | 1.53 / 1.18 / 1.32 | 1.50 / 1.15 / 1.27 | 1.22 / 0.92 / 1.03 | 2.27 / 1.83 / 2.02 | 1.38 / 1.09 / 1.20 | -1.35 / -1.19 / -1.19 | -1.49 / -1.29 / -1.30 | -1.46 / -1.26 / -1.26 | -1.49 / -1.29 / -1.30 | 22.0 |
| K7-D0 | 0.35 / 0.30 / 0.28 | 0.27 / 0.23 / 0.21 | -0.08 / 0.00 / -0.04 | 1.94 / 1.40 / 1.45 | 0.27 / 0.22 / 0.20 | -0.29 / -0.21 / -0.22 | -0.37 / -0.28 / -0.31 | -0.29 / -0.21 / -0.23 | -0.36 / -0.28 / -0.30 | 3.2 |
| K7-D1 | 0.32 / 0.28 / 0.25 | 0.30 / 0.26 / 0.23 | -0.09 / 0.08 / -0.00 | 1.94 / 1.04 / 1.22 | 0.28 / 0.26 / 0.21 | -0.30 / -0.27 / -0.21 | -0.36 / -0.30 / -0.26 | -0.33 / -0.28 / -0.25 | -0.35 / -0.30 / -0.26 | 7.1 |
| K7-D2.6 | 0.35 / 0.22 / 0.27 | 0.32 / 0.21 / 0.24 | 0.00 / 0.00 / 0.03 | 1.70 / 1.08 / 1.17 | 0.32 / 0.21 / 0.24 | -0.30 / -0.21 / -0.24 | -0.33 / -0.23 / -0.27 | -0.31 / -0.21 / -0.24 | -0.33 / -0.23 / -0.27 | 7.3 |
| K7-D3.6 | 0.41 / 0.29 / 0.30 | 0.38 / 0.27 / 0.28 | 0.01 / 0.04 / 0.10 | 1.96 / 1.24 / 1.07 | 0.41 / 0.29 / 0.31 | -0.41 / -0.32 / -0.31 | -0.42 / -0.31 / -0.32 | -0.39 / -0.29 / -0.30 | -0.42 / -0.31 / -0.32 | 8.4 |
| K7K4-D0.9 | 2.51 / 1.69 / 1.65 | 2.48 / 1.66 / 1.63 | 2.20 / 1.49 / 1.45 | 3.02 / 2.03 / 2.01 | 2.40 / 1.62 / 1.60 | -2.35 / -1.61 / -1.62 | -2.48 / -1.68 / -1.69 | -2.44 / -1.65 / -1.66 | -2.48 / -1.68 / -1.69 | 11.5 |
| K7K4-D1.8 | 1.99 / 1.71 / 1.95 | 1.96 / 1.69 / 1.93 | 1.26 / 1.16 / 1.14 | 3.18 / 2.61 / 3.26 | 1.73 / 1.50 / 1.67 | -1.79 / -1.58 / -1.55 | -2.05 / -1.80 / -1.80 | -2.02 / -1.77 / -1.78 | -2.05 / -1.80 / -1.80 | 4.0 |

| case | W' | line slab-mid A | line slab-mid B | electrode-bottom A / B (V) | max abs (L0-ref)/U |
|---|---|---|---|---|---|
| K4 | 0.79 / 0.57 / 0.55 | -1.85 / -1.35 / -1.33 | -1.97 / -1.39 / -1.38 | -0.9999999999999981 / -0.9999999999999987 | 16.4 |
| K5-g3 | 1.55 / 1.11 / 1.19 | -3.07 / -2.25 / -2.39 | -2.91 / -2.13 / -2.40 | -1 to <= 6e-15 | 7.2 |
| K5-g4 | 1.16 / 0.80 / 0.82 | -2.38 / -1.68 / -1.65 | -2.63 / -1.69 / -1.79 | -1 to <= 6e-15 | 7.7 |
| K5-g6 | 0.63 / 0.52 / 0.44 | -1.51 / -1.31 / -1.14 | -1.68 / -1.32 / -1.06 | -1 to <= 1.8e-14 | 11.2 |
| K5-g8 | 0.52 / 0.44 / 0.44 | -1.56 / -1.18 / -1.28 | -1.49 / -1.36 / -1.25 | -1 to <= 1.4e-14 | 12.4 |
| K7-D0 | 0.10 / 0.06 / 0.06 | -0.28 / -0.19 / -0.16 | -0.30 / -0.21 / -0.21 | -0.9999999999999822 / -0.999999999999984 | 7.7 |
| K7-D1 | 0.09 / 0.06 / 0.06 | -0.31 / -0.21 / -0.22 | -0.26 / -0.17 / -0.17 | -1 to <= 2.7e-14 | 34.0 |
| K7-D2.6 | 0.10 / 0.06 / 0.06 | -0.30 / -0.16 / -0.18 | -0.27 / -0.18 / -0.18 | -1 to <= 6.7e-14 | 10.6 |
| K7-D3.6 | 0.11 / 0.07 / 0.07 | -0.30 / -0.21 / -0.19 | -0.30 / -0.22 / -0.20 | -1 to <= 2.7e-14 | 6.6 |
| K7K4-D0.9 | 0.88 / 0.59 / 0.59 | -2.16 / -1.45 / -1.46 | -2.08 / -1.41 / -1.45 | -1 to <= 7.4e-15 | 10.0 |
| K7K4-D1.8 | 0.76 / 0.64 / 0.68 | -1.61 / -1.36 / -1.62 | -1.66 / -1.46 / -1.36 | -1 to <= 9.3e-15 | 4.7 |

Other checks of the comparison:

- Gap. The engine gap equals the reference `gap_um` in all 13 cases: K4/K5/K7K4 5, 3, 4, 6, 8 um and K7 10 um (on
  the 0.2 um buffer, edge to edge). The gap electrodes are (signal, ground_r) for A and (ground_l, signal) for B.
- The tensor-term split equals the coefficient split: (yy + zz) / r13 - 1 <= 1e-14 and xx = r33 exactly, in every case.
- The internal identities hold on every case and level. `int es.We` = C'/2 to <= 1e-12 (K4 8.3e-13, K7-D0 5.5e-13).
  The electrode-bottom line integral is -1 V to <= 7e-14. Line integrals report nSkipped 0.
- Discretization vs definition. All quantities in a row move together: dn, Gamma, Gamma_equiv and the three textbook
  variants all carry the same offset. The pure electrostatic quantities (W', slab-mid line integral) have the same sign
  and order, so the static field is the source. L0 -> L1 (ES 2 -> 1.41) reduces the dn, Gamma, VpiL, W' and line offsets by 25-35 % for K4, K5-g3, K5-g4 and K7K4-D0.9, and by 5-50 % in the other cases (K5-g6 and K5-g8 used L1 scales 1.6 and 1.7). The K7 slab entries, already below 1e-4, scatter around zero. L1 -> L2
  (optical 1 -> 0.71 at fixed ES) changes them by typically less than 0.2e-3 and at most 0.6e-3 (K7K4-D1.8 rib); r51 moves more, because it is small and its U is large. A two-level Richardson extrapolation of the engine (L0, L1, assumed p = 1, `analyze2.mjs`) gives these
  differences from the reference: dn_A -2.0e-4 (K4), -5.7e-4 (K5-g3), -1.0e-4 .. 6.5e-5 (K7), -9.6e-4 (K7K4-D1.8).
  Most are within 2 U. K5-g6 and K5-g8 reach 5-8 U, because their L1 used scales 1.6 and 1.7 and the engine meshes
  are not nested. The engine converges at about first order in the ES scale. For comparison, the reference K4 JSON reports p_observed 0.96-1.93 depending on the quantity.
- Default-mesh accuracy of the conventional outputs: 1.4-3.5e-3 (K4, K5, K7K4) and 0.3-0.4e-3 (K7). That is 3-35 U, so
  the default engine mesh is coarser than the reference uncertainty. This is consistent with the existing per-case
  budgets in `tests/reference-cases.test.mjs`.
- K7K4-D1.8 r51: +1.28e-2 (2.7 U). r51 is a 2 % contribution and is shear-sensitive. The reference U for r51 is wide.

## 2. Definitions (eo-analysis.mjs vs DevLog-033), term by term

| item | DevLog-033 | engine | status |
|---|---|---|---|
| r33 | d eps_xx = -n_e^4 r33 E_x,s, term d eps_xx \|E_x\|^2 | `VOIGT_GROUP` (3,3) = r33 (eo-analysis.mjs:17-20); map entry xx (:57) | match; values above |
| r13 | d eps_yy, d eps_zz from r13 E_x,s | Voigt (1,3), (2,3) | match; yy + zz = r13 to 1e-14 |
| r51 | d eps_xy = -n_e^2 n_o^2 r51 E_y,s, term 2 d eps_xy Re(E_x* E_y) | Voigt (4,2), (5,1); xy map is the symmetrised 0.5 (dx[1] + dx[3]) (:57), multiplied by 2 in both the breakdown (:160) and the integrand (store.mjs:729) | match (factor 2 present once) |
| r22 | d eps_yz only; zero at first order (E_z in quadrature) | Voigt (1,2), (2,2), (6,1); the xz / yz entries are dropped from the map (:57) | match for x-cut, propagation y, in-plane field (r22 = 0 in both). The xz / yz terms are not modelled for other orientations or lossy modes; that is an engine-wide limit, not specific to postproc |
| normalisation | int E* . d eps . E / (4 P') | Re[k0 form / (2 beta x^T B x)] (:177-181) = solver pencil form; integrand C = k0 beta / (2 s^2 x^T B x) (store.mjs:882-895) | match (totals, splits) |
| sign | A < 0, B > 0 for dn; Gamma A > 0, B < 0 | same | match |
| region split | ln_slab, ln_rib*, other | per region name (`byRegion`), Pockels regions only | match after grouping ln_rib*; other = 0 |
| Gamma | (g / V) int_LN E_x,s \|E\|^2 / int_window \|E\|^2 | (g / V_gap) int_EO E_c \|E\|^2 / int_window \|E\|^2, E_c along the in-plane c axis (= E_x for x-cut); \|E\|^2 = \|e_t\|^2 / \|beta\|^2 + \|e_z\|^2 (:140) | match; Ex2 variant numerator and denominator (:141-143) |
| gap | edge to edge from the electrode rectangles | bounding boxes, nearest electrode each side of the window centre, mirrors included (:77-98) | match on all cases (K7 buffer case included); null cases E9 |
| textbook VpiL | lambda / (2 \|dn_tb,A - dn_tb,B\|), dn_tb = -(1/2) n_e^3 r33 Gamma / g | lambda / (n_e^3 r33 \|Ebar_A - Ebar_B\|) (:296) | algebraically identical; values match |
| n_eff variant | VpiL_tb x n_eff / n_e | x n_eff,A / n_e (:299) | match |
| Gamma_equiv | 2 g \|dn_full\| / (n_e^3 r33) | / V_gap as well (:278); V_gap = 1 here | match |

## 3. Expression language

Evidence: `check3.mjs` plus inline probes, on a non-uniform variant of the gsg-eo-rf fixture (`nonuni.yaml`:
electrodes y -0.2..0.2, and a cap layer eps 5 for y 0.5..1).

- Safety. There is no eval, `Function` or dynamic property access in `engine/src/postproc` (grep). Name lookups go
  through `Object.hasOwn`, `Array.find` and `Map`. `x.constructor`, `constructor`, `__proto__`, `es.__proto__`,
  `armA.constructor`, `eoA.constructor`, `hasOwnProperty`, `es.V.toString`, `globalThis`, `process`, `x['a']`, `x{`,
  `x=1`, `x;1`, `#` and `A` are all rejected with an ExpressionError. `evaluateGlobals('__proto__')` is rejected.
  Length (2000) and nesting (64) limits are tested in the suite.
- Units, all correct:

| expression | result |
|---|---|
| `2[um]^2`, unit um^2 | 4 um^2 |
| `sqrt(4[um^2])` | 2 um |
| `(8[m^3])^(1/3)` | 2 m |
| `1[V]/1[um]`, unit V/um | 1 V/um |
| `3[pF/m]*2[cm]` | 0.06 pF |
| `1[mm] + 1[um]` | 1001 um |
| `1[Mohm]*1[pF]` | 1e-6 s |
| `eps0*1[V/m]^2/2` | 4.427e-12 J/m^3 |
| `c_const/lambda0` | 193.414 THz |
| `1[V^0.5]^2` | 1 V |
| `sqrt(2[V])` | 1.414, unit printed `m*kg^0.5/(s^1.5*A^0.5)` |
| `1[V] + 1[m]` | error "'+' of incompatible units V and m at position 6" |

- Complex values are correct: `i*i` = -1, `sqrt(-1)` = i, `exp(i*pi/2)` = i, `log(-1)` = i pi, `(-8)^(1/3)` = 1 + 1.732i
  (principal branch), and `conj`, `real`, `imag` behave as expected. On the vector arm mode (lossless),
  `armA.Ez` = 0 - 4.78i V/m, and `armA.Ez*conj(armA.Ez) - abs(armA.Ez)^2` = 0.
  `real(Ex conj(Hy) - Ey conj(Hx))/2 - armA.Sz` = 0. `armA.Ez > 0[V/m]` is rejected.
- Error positions are 1-based in the message and 0-based in `e.pos`, and are correct for every probe. Cosmetic issues
  are in E6.

## 4. Evaluation correctness

Evidence: `check4.mjs` (P2 electrostatics, 298 triangles). The independent reference is a quadratic fitted per triangle
from the six P2 DOF coordinates and values, integrated with a Dunavant degree-5 seven-point rule.

- Surface integrals per region (cap, medium), relative error. Area <= 6.5e-16, int V <= 9.3e-16, int V^2 <= 1.0e-15,
  int |E|^2 <= 1.4e-15, avg V <= 1.6e-15. int x V shows 2.7e-11 and 1.6e-10. That is cancellation in an integral that
  is nearly zero by symmetry, combined with my metre-scaled fit, so it is not an engine error.
- surface_max / surface_min of es.V give 1 at (0.5, 0.2) um, an electrode corner, and 0. These are the exact extrema.
  Sampling is limited to element corners and quadrature points (E10).
- Line integrals. `int x ds` along a horizontal segment matches the analytic value to 1.0e-15. `int x y ds` along a
  diagonal matches to 2.5e-11, which is the error of my midpoint-rule analytic value. The gradient theorem
  int -E . dl = phi(end) - phi(start) holds to <= 1.0e-15 V at five heights, across the interface at y = 0.5 and on a
  4-vertex bent polyline.
- Point evaluation. es.V at the P2 vertex DOFs matches to 1.7e-18 and at the mid-edge DOFs to 3.3e-16 (54 points):
  P2 interpolation is exact. Outside the domain ((6, 0), (0, 1.5), (5 + 1e-9, 0.5), (5 + 1e-4, 0.5)) the result is
  NaN. Inside the signal electrode: V = 1, Ex = 0, We = 0, region = NaN, epsxx = 0. Outside the arm window,
  `armA.Ex`, `armA.normE` and `eoA.integrand` are NaN.
- Vector interpolation. 0 of 1648 arm triangles have a constant Ex over their 6 quadrature points, so the field is not
  a centroid constant. int armA.Sz = 1 W to 2e-15.
- Discontinuous variables on element edges depend on query order (E2).

## 5. Store lifecycle and memory

Evidence: `check5.mjs` and `check5b.mjs` on renaud2023 (vector, P2), and the sweep fixture.

- keep. JSON with timing keys stripped is byte-identical for keep false and true. Run time over 3 alternated pairs:
  keep false 1556 / 1304 / 1339 ms, keep true 1429 / 1309 / 1244 ms, so no material cost. The breakdown runs on every
  EO run, keep or not (6.3 and 8.4 ms per arm, under 1 % of 1.33 s). numModes 6 vs default: VpiL changes by -6.2e-10
  relative and n_eff by 3e-15. The mode table has 6 rows, one selected (TE0 at k = 1, n_eff 1.96574).
- No leak across 20 evaluation rounds (line_int on new polylines, quad plots of new expressions, eo integrals,
  surface_max): ArrayBuffer memory 37.6 -> 37.9 MB, heap 12.5 -> 12.9 MB, cache 22.9 -> 23.3 MB. Cache entries grow
  (18 -> 94) because each xy point set gets a new id; total bytes stay bounded by the 128 MiB LRU.
- dispose. `memory()` returns 0 / 0 / 0. After an awaited GC, ArrayBuffers fall from 20.0 MB (live) to 0.2 MB, the
  same as a run without a store. Using a disposed store throws "dataset es: no electrostatic solution in this run",
  which is misleading (note in E12).
- Transfer. A plot `values` buffer transferred with structuredClone detaches only the result; re-evaluation returns
  identical values. `store.mesh()` returns the store's own arrays (documented "copy before transferring"). The R-UI
  worker does not transfer them (read-only check of `app/src/lib/sim.worker.ts`).
- Sweep store. With maxStores 2 and 5 points: 2 stores retained (points 3 and 4) and rows for all 5 (C 531.25 ->
  177.08 pF/m). With maxBytes 1: 0 stores. With maxStores 0: 0 stores. Re-adding index 4 replaces its store (still 2).

## 6. Performance

Measured with `perf.mjs` in a fresh process per config; times are ms, first call / second call.

| case | es tris | plot es.normE element | int es.We | max es.normE | line_int 2-pt | int eoA integrand | plot eoA integrand |
|---|---|---|---|---|---|---|---|
| mao2022 P2 vector | 38,280 | 3.3 / 0.2 | 9.2 / 2.5 | 7.5 / 1.5 | 23.1 / 2.8 | 16.0 / 0.2 | 8.2 / 0.1 |
| mao2022 P1 vector | 110,186 | 7.0 / 0.3 | 23.8 / 4.7 | 17.5 / 2.4 | 65.2 / 6.7 | 22.1 / 0.2 | 12.6 / 0.1 |
| renaud2023 P2 vector | 29,838 | 3.0 / 0.2 | 7.7 / 2.0 | 5.0 / 2.4 | 17.9 / 1.5 | 13.1 / 0.3 | 4.4 / 0.1 |

- The DevLog-031 numbers are reproduced within about 2x (e.g. mao2022 P1 int es.We 20.5 / 6.8 claimed vs 23.8 / 4.7
  measured). The 400k-element first-integral target (30 ms) is missed as stated: 23.8 ms at 110k scales linearly to
  about 86 ms at 400k. The 80,000-vertex ES budget caps real meshes near 160k triangles (about 35 ms by the same
  scaling).
- Line integrals cost about 0.5 ms per polyline segment at 110k triangles (1 / 10 / 50 / 200 segments: 67 (first
  call) / 15 / 27 / 101 ms; E11).
- Value cache after the mao2022 P1 bench: 91.6 MB in 50 entries, against a 128 MiB default per store (E12).

## 7. CLI and suites

- `--eval es.We` on the fixture: surface_int 2.6563e-10 J/m with regions [medium]; `--eval='-(es.Ex*t1x+es.Ey*t1y)'
  --line 1,0,3,0` gives -0.9999999999999998 V; `--dataset eoA --eval eo.integrand` gives -7.3477e-5 /V;
  `--list-vars --dataset eoB` lists 7 datasets and 104 variables; `--modes armA` returns the mode table. Errors (unit
  mismatch, unknown region, polyline missing for line_int, leading minus without `=`) give exit 1 and a clear message.
  Defects are in E5.
- `npm test` (sequential): 239 tests, 236 pass, 0 fail, 2 skipped, 1 todo, 43.4 s
  (`scratchpad/audit-r-eng-cmp/engine-test-20261015T1519.log`). `npm run test:reference`: 11/11 pass, 24.6 s
  (`reference-test-20261015T1519.log`).

## Findings

### E1 (major: acceptance-gate miss, numerically small): eo.integrand integral differs from the engine dn_eff/V beyond 1e-9

- Gate. DevLog-030 P1 sets "integral of the EO integrand equals the engine dn_eff/V to <= 1e-9 relative". DevLog-031
  reports 2.7e-15 .. 3.3e-15 and states that the locator uses "the same containment rule" as the engine.
- Measured |int eo.integrand / dnEffPerV - 1| (`cmp.mjs`, L0):

  | case | A | B |
  |---|---|---|
  | K4 / K5-g5 / K7K4-D0 | 9.8e-15 | 7.9e-8 |
  | K5-g6 | 4.2e-15 | 8.5e-8 |
  | K5-g8 | 1.1e-14 | 9.5e-8 |
  | K7-D0 | 3.7e-7 | 8.1e-7 |
  | K7-D2.6 | 1.2e-6 | 2.3e-6 |
  | K7-D3.6 | 1.7e-6 | 1.8e-6 |
  | K7K4-D0.9 | 1.2e-14 | 6.8e-9 |
  | renaud2023 (check5) | 3.8e-6 | not checked |

  K5-g3, K5-g4, K7-D1 and K7K4-D1.8 are at round-off.
- Cause (`diffq.mjs`). Engine `sampleStaticFieldQ` (TriLocator, first containing triangle in bucket order) and the
  store's WalkLocator (first containing triangle reached by the walk) choose different triangles for quadrature points
  that lie on electrostatic element edges. The P2 gradient is discontinuous there:
  - K4 arm B: 2 of 62,502 points differ, max 5.0e-4 relative in E.
  - K7-D2.6: 5 and 6 points per arm, up to 40 % in E (rib-corner refinement).
- Why the suite misses it. The suite fixture has a uniform gap field, so the choice of triangle does not matter there.
- Impact. Up to 4e-6 relative on the integral, against 1e-4 .. 3.5e-3 discretization. Individual integrand map values
  at those points are the other one-sided limit.
- Fix:
  - Sample the static field for the `eo:*` bundles on quadrature point sets with the engine's own routine (reuse
    `sampleStaticFieldQ` output for `armX/quad`), or give both locators one deterministic tie-break, e.g. the lowest
    triangle index among all triangles with min barycentric >= -1e-12.
  - Add a gate test on a non-uniform case (K4 at scale 2, or the cap-layer fixture variant) for both arms.

### E2 (minor): point values of discontinuous variables on element edges depend on query history

- Evidence (`pathdep.mjs`). es.Ey at (2.0, 0.5) um, on the medium/cap interface:
  - -2.986e-4 V/um when the previous query came from above or the store is cold;
  - -1.239e-4 V/um when the previous query came from below;
  - both values are returned for the same point within one `points` request ([above, target, below, target]).
- Along a cut line on the interface the walk stays on one side (`cutiface.mjs`: epsyy 30 for all 39 samples at
  y = 0.5). Which side is used is therefore set by the first point and is not reported.
- Fix: a deterministic side rule (E1 tie-break, or an explicit up/down or average option, as in COMSOL), documented in
  DevLog-031.

### E3 (minor): complex values that appear at run time bypass the real-operand checks

- The compile-time check rejects complex operands of `< <= > >= == !=`, `min`, `max`, `atan2` and the `if` condition.
  Values that become complex at run time (sqrt, log, or a non-integer power of a negative real field) are typed real,
  so their imaginary part is silently dropped.
- At (2.9, 0.9) um, where `sqrt(es.V/1[V] - 0.5)` = 0 + 0.591i:

  | expression | result |
  |---|---|
  | `... > -1` | 1 |
  | `max(..., -1)` | 0 |
  | `atan2(..., 1)` | 0 |
  | `if(1, ..., 0)` | keeps the imaginary part |

- `compiled.complex` is false while `evaluatePlot(...).complex` is true.
- Fix: mark sqrt/log/pow (non-integer exponent) as possibly complex, or check `im` at run time in these kernels and
  return an error or NaN.

### E4 (minor): sweep global expressions lack constants available elsewhere

- `evaluateGlobals('C*i', ...)` and `'VpiL/lambda0'` fail with "unknown variable" (`evaluate.mjs:350`, which only has
  pi, eps0, mu0, c_const). Store global evaluations accept i, j, lambda0, k0 and f0.
- Fix: share one constant resolver, with lambda0 from each point's globals.

### E5 (minor): CLI option handling

- `--point` is not repeatable. `--point 2,0 --point 2.5,0` evaluated only (2.5, 0), with no warning. The multi-pair
  form `--point 2,0,2.5,0` works.
- One `--unit` applies to every `--eval`. `--eval es.We --eval C --unit pF/m` printed nothing on stdout and exited 1
  (unit mismatch on the first expression).
- Fix: either make `--point` multiple or reject repeats, and use per-expression units (e.g. repeatable `--unit` aligned
  with `--eval`) or report a per-result error.

### E6 (minor, cosmetic): error-message details

- Unit errors carry two positions: `1[min]` gives "unit "min": unknown unit 'min' at position 1 at position 2".
- Token kinds leak into messages: `1e` gives "unexpected 'name'", `1 2` gives "unexpected 'num'".
- Fix: strip the inner position or label it "in the unit"; print the token text.

### E7 (note): a unit literal binds to the exponent operand

- `1[V]^2[1/V^2]` parses as 1[V]^(2[1/V^2]) and fails with "exponent must be dimensionless". `x^2[um]` behaves the
  same way. This follows the documented grammar (`power := postfix ('^' unary)`) but is easy to misread.
- Fix: state it in the expression help, or bind the postfix unit after the power.

### E8 (note): prefix parsing

- `1[Tm]` is a terametre (1e12 m), not tesla-metre. `1[min]` is rejected, which is good.
- Fix: document that a prefix is tried before compound symbols, and that `*` or a space is needed for a product.

### E9 (minor): the gap rule nulls Gamma whenever any electrode spans the arm centre

- An electrode above or below the arm nulls Gamma even when lateral electrodes exist (`gapcases.mjs`). Conductor-backed
  CPW with a backside plane gives gap null; so does a heater above the arm.
- The rule is documented in `formulas.gap`. A scan of the 19 sims configs with valid EO windows found every gap
  determined (all signal/ground_r and ground_l/signal), so no current config is affected.
- Fix: ignore spanning electrodes outside the window's y range when both lateral neighbours exist, or report Gamma
  with a note.

### E10 (note): surface_max / surface_min sample only corners and quadrature points

- Extrema between the samples are missed, e.g. optical intensity peaks or P2 interior extrema of |E|^2 products. This
  is not stated in DevLog-031 or SPEC.
- Fix: document it, or add the P2 edge midpoints and a local refinement at the best element.

### E11 (note): line-integral crossings scan every triangle per segment

- `crossings` (evaluate.mjs:207-228) is O(nTris) per polyline segment and per mesh: about 0.5 ms per segment at 110k
  triangles, and 101 ms for a 200-segment polyline. UI cut lines (2 points) are fast after the first call.
- Fix: walk the segment through the neighbour table (WalkLocator.nb).

### E12 (note): cache footprint and post-dispose message

- The default value cache is 128 MiB per store (91.6 MB reached on mao2022 P1 after 14 evaluations). Sweep stores add
  32 MiB each. Memory is bounded and does not leak (section 5), but a browser worker may want a smaller default.
- After `dispose()`, calls fail with "dataset es: no electrostatic solution in this run"; "store disposed" would be
  clearer.
- es.epsxx/epsyy/epsxy are 0 inside electrodes. That is a convention and should be documented next to "E = 0".

### E13 (note): definitions are aligned; the default-mesh accuracy should travel with the conventional outputs

- Gamma, Gamma_equiv and the textbook VpiL inherit the electrostatic discretization of the default mesh: 1.4-3.5e-3
  relative for K4, K5 and K7K4, and 0.3-0.4e-3 for K7 (section 1).
- `result.eo.formulas` states definitions only. A one-line mesh-accuracy statement, or a pointer to the reference
  budgets, would keep users from reading 4-5 significant digits.

### E14 (note): the 400k performance target remains unmet, as stated in DevLog-031

- At 110k triangles the first surface integral takes 23.8 ms, so roughly 86 ms at 400k by linear scaling.
- Real meshes are capped near 160k triangles by the 80,000-vertex budget. Cached integrals meet the target.

## Commands (reproduction)

```
cd scratchpad/audit-r-eng-cmp
nice -n 10 node --max-old-space-size=1536 cmp.mjs K4 1 default     # L0; also "1 1.41" (L1), "0.71 2" (L2)
./runall.sh                                                          # all cases, serial
node analyze.mjs; node analyze2.mjs 1; node table.mjs
nice -n 10 node --max-old-space-size=1536 diffq.mjs K7-D2.6           # E1 cause
node check3.mjs; node check4.mjs; node --expose-gc check5.mjs; node --expose-gc check5b.mjs; node pathdep.mjs
node perf.mjs ../../sims/mao2022/config.yaml 2 1 ; node lineperf.mjs ; node nmodes.mjs ; node gapscan.mjs ; node gapcases.mjs
cd engine && nice -n 10 npm test && nice -n 10 npm run test:reference
```
