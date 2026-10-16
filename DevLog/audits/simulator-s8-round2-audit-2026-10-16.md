---
title: Fresh-context audit of lane T4 round 2 (S8 drift-diffusion fixes D1-D11 and S8 integration, DevLog-039 Round 2)
date: 2026-10-16
auditor: fresh-context Claude subagent (did not write the T4 code)
scope: DevLog/audits/simulator-s8-engine-audit-2026-10-16.md (D1-D11), DevLog-039 Round 2 plan/progress, engine/src/semi/*,
  engine/src/semi-stage.mjs, run.mjs / config.mjs / cli.mjs semiconductor dispatch, postproc/store.mjs semi datasets,
  section.mjs (farScale), engine/tests/semi-* and reference-cases (S8), engine/schema/sim.schema.json; DevLog-040 Round 2,
  validation/reference/summary-s8.json, validation/cases/K10-K12.yaml; references/_inbox/nedeljkovic2011.pdf
status: complete (2026-10-16 01:10-01:35 PDT)
---

# S8 round-2 audit

No repository file was changed except this report; no git command that changes state was run. Engine runs: Node 23.7,
`nice -n 10`, `--max-old-space-size=1536`, one process at a time, none left running. Scripts, configs and outputs are in
the session scratchpad folder `t4r2audit/` (not in the repo): `scripts/{k11c,k12c,d11,wheeler}.mjs`, `scripts/tab.py`,
`head/section.mjs` (HEAD copy, `git show HEAD:engine/src/section.mjs`, sha256 prefix cde3a4e02aeaccfd), `out/*.json`,
logs `engine-test-20261016T011612.log`, `engine-ref-*.log`. T1 (S7) files were not touched or attributed: no failure
occurred in any suite.

## Verdict

D1-D11 are implemented and, except D4 and D11, complete. D1 is right for two-terminal devices: the stage C' equals an
independent P1 integral q dN/dV to 3e-6 on K12 forward bias, K10 C'(0 V) is now -1.43e-4 vs the reference (it stalled at
-2.1e-3 before). Suites reproduce the claims: `npm test` 310 / 307 pass / 0 fail / 2 skipped / 1 todo; `test:reference`
15/15 including K11 (it already sets ENGINE_REFERENCE_FULL=1). The open K11 oxide C' gap (+1e-3) is the engine's oxide
mesh, not the reference: with a 0.035 um oxide far field and the silicon at meshScale 0.5 the engine q dN/dV agrees with
the reference to -6.6e-5..+3.2e-5 at all nine biases (U/ref 0.5-2.4e-4). The cause is that the default oxide mesh is graded
from the silicon with a fixed grade (h ~ 0.4 d), which meshScale does not refine; D11 only scaled the cap. Nedeljkovic
Table 1: 27/27 rows match the rendered page. Main open items: the oxide gate (2e-3) is set above the observed gap rather
than derived (R2); the 1.5x budget factor assumes third-order convergence for a 0.7 refinement (R2); forward-bias
`perLength` lacks the junction conductance G' (R3); push-pull VpiL is still reported at a 0 V DC bias (R4).

## Checks

### (1) D1 contact charge, derived independently

Two contacts, zero-flux box. Gauss over the box: sum_k Q_m,k + q int (p - n + N_D - N_A) dA = 0, where Q_m,k is the
electrode's surface charge, i.e. the flux leaving it into every adjacent medium, oxide faces included. Charge supplied
through terminal k = Q_m,k + the carrier charge entering the semiconductor through k. At reverse or zero bias the
minority exchange with the far contact is negligible (n = n_i^2/N_A at the anode, about 1e3 cm^-3 for K10). So electron
changes enter through the cathode and hole changes through the anode: Q_c = Q_m,c - q int n, Q_a = Q_m,a + q int p. The
box identity then gives dQ_c/dV = -dQ_a/dV and q d(int p)/dV - q d(int n)/dV = -d(Q_m,a + Q_m,c)/dV; the two carrier
integrals are equal only when no metal flux changes. `terminals()` (solver.mjs:779-795) implements exactly this:
metal = Poisson residual of the contact nodes (includes oxide edges at those nodes), carrier = -q int n (n-type contact) or
+q int p (p-type contact).

| Case | Check | Result |
|---|---|---|
| K10 (1e17/5e17) | C'(V) vs reference, 4 nm mesh (test) | -1.43e-4 (0 V) .. -9.4e-6; tol/ref 1.66-1.89e-4; was -2.6e-3 (round-1 audit) |
| K12 PIN 0.6 V | stage C' vs independent P1 q dN/dV from dataset n of fully ramped states at V +- 1 mV | 2.53389e-11 vs 2.53388e-11 F/m (+3.2e-6); q dP/dV equal |
| K12 PIN 0.8 V | same | 1.44639e-9 vs 1.44638e-9 F/m (+2.9e-6); 1.446e-5 F/cm^2 |
| K12 | C'/G with G = dI/dV (central, 2 mV) | 1.74 ns (0.6 V), 1.94 ns (0.8 V); high-injection SRH lifetime tau_n + tau_p = 2 ns: charge-control diffusion capacitance |
| K12 vs reference | crude q n_mean,i (d ln n / dV) x 1 um from summary-s8 (0.7/0.8/0.9 V) | 1.467e-5 F/cm^2 vs engine 1.446e-5 (-1.4 %, estimate; the window mean is not the full i-region integral) |
| K11 with oxide | metal part / C', (C_h - C_e) / C' | 0.74-1.46e-4 and 2.5-4.9e-5 (oxide flux at the bare-contact corner nodes); the reference uses q dN_e/dV only |
| han2023 (vias in oxide) | metal part | 2.23e-3 pF/mm at every bias (via-to-via flux through oxide), C' 0.4345 .. 0.2044 pF/mm, C'(3.5 V) 0.2285 as claimed |

Forward bias: q d(int n)/dV is the quasi-static (charge-control) stored charge, correctly flagged
`capacitance_includes_diffusion_charge`. It is not the small-signal Im(Y)/omega of a distributed diffusion region. Short
base: from j omega dn = D d2n/dx2, J(0) = qD k coth(kW) dn(0) gives C = (2/3) dQ/dV; long diode: C = (1/2) G tau. For the
K12 i-region the lumped value is the right low-frequency limit only when the region is short against the ambipolar
diffusion length; this was not verified by a small-signal solve.

### (2) Push-pull convention

- Engine (semi-stage.mjs:230-250): `vpilVcm` single-arm secant from V0; `vpilDifferentialVcm` = lambda / (2 |dn/dV|);
  `vpilPushPullVcm` = lambda / (4 |dn/dV|), i.e. both arms at V_DC with +-v and Vpi = the per-arm amplitude v. Data
  schema (devices.schema.yaml (a), (f), (q)): `mzm_push_pull` = MZM Vpi of a push-pull drive (opposite fields in the arms),
  `mzm_series_push_pull` separate, `mzm_differential` = full V+ - V-, no implicit factor of 2. The engine's push-pull is
  the per-arm-amplitude reading of `mzm_push_pull`, small signal at V_DC. `mzm_series_push_pull` and `mzm_differential`
  are not_evaluated (correct: no conversion is implied).
- anjali2025-c (`per_arm_phase_shifter`, drive single_ended): the config uses `drive: single_arm`, so the target uses the
  single-arm secant (`engineConvention: single_arm_secant_from_reference`). CLI: dn_eff(5 V) 8.979e-5 vs 1.1e-4 (fail),
  VpiL 4.316 vs 3.17 V cm (fail), 43981 nodes, 21.4 s, exit 2, as claimed.
- han2023-a (`unspecified`, drive push_pull): every target has comparable: false, so all three are not_evaluated;
  `drive: single_arm` in the config is consistent with not comparing.
- Residual D4 defect: R4.

### (3) D7 signs

`modalResponse` (optics.mjs:84-108): Re delta eps = 2 n_Si dn, Im delta eps = 2 n_Si dk with dk = d alpha lambda / (4 pi) >= 0
(d alpha from the fit, power absorption, cm^-1 -> m^-1); both parts go through the same real-weighted first-order
functional; alpha_mode = 4 pi dk_eff / lambda (power); dB = 10 log10(e) alpha. Plasma dn = -(p N_e^q + r N_h^s) < 0.
Depletion therefore gives dn_eff > 0 and d alpha < 0, the reference signs; K11 dn_eff / d alpha / alpha pass for both
models. `exact` gives 2 n dn + dn^2 - dk^2 and 2 (n + dn) dk (consistent). No sign defect.

### (4) D11 regression

- Bitwise mesh identity, working-tree CrossSection with farScale 1 (what runConfig / runModeOnly / runSemiconductor set at
  meshScale 1) vs the HEAD section.mjs copy, on the same parsed geometry, build scale 1 and 2 (the P2 default): 35
  configs, 96 meshes, 0 differences (x, y, tri, triRegion, nodeElectrode compared with Object.is). Not parseable for
  unrelated reasons: 7 configs (RF eps_r unknown) + meng2023 (shared electrode edge), as stated in DevLog-039. Sensitivity:
  farScale 2 changes 21 of the 48 scale-1 meshes, so the comparison would have detected a change.
- Wheeler: at meshScale 1 the recessed sections (`new CrossSection`, farScale unset -> 1) are bitwise unchanged. At
  meshScale 2 the nominal section uses farScale 2 and the recessed ones farScale 1; effect on R' (mao2022 / chen2023):
  working tree vs recessed also at farScale 2: 7e-8 / 1.4e-8 relative; vs HEAD behaviour (all farScale 1): 4e-7 / 9e-5.
  Negligible here, but see R7.

### (5) S8 gates and the K11 oxide C'

Budget formula (reference-cases.test.mjs comment): 1.5 x the largest change between the test mesh and a refined mesh.
Applied as stated: K10 1.03e-4 -> 1.6e-4; K12 J 2.0e-4 -> 3.2e-4, centres 1.7 / 1.5e-4 -> 2.5 / 2.3e-4, means 1.54e-3 /
3.3e-4 -> 2.3e-3 / 5e-4; K11 Si-only and dn_eff / VpiL 8.8e-4 -> 1.3e-3, d alpha 9.6e-4 -> 1.5e-3, alpha 3.4e-4 -> 5e-4.
I reproduced the K11 Si-only change between meshScale 1 and 0.7 (max 8.8e-4 at -0.5 V). Margins (|diff| / tol) from the
verbose run: K10 <= 0.76, K12 <= 0.62, K11 Si-only C' <= 0.96 (-0.5 V), oxide C' <= 0.68, optics <= 0.67. The oxide budget
2e-3 does not follow the formula (R2).

K11 C' with oxide, rel = engine / reference - 1, stage definition ("st") and the reference definition q |dN_e/dV|
("ne", engine `electronIntegralCFPerM`); far = explicit `max_edge_um` / `far_edge_um`:

| V_pn | default s1 st / ne | s0.7 ne | s0.5 ne | far 0.05, s1 ne | far 0.035, s0.7 ne | far 0.035, s0.5 st / ne | U/ref |
|---|---|---|---|---|---|---|---|
| nodes | 20625 | 37472 | 69826 | 38568 | 74765 | 134399 | |
| 0 | +2.2e-4 / +1.2e-4 | +4.6e-4 | +5.9e-4 | -1.2e-3 | +3.7e-5 | +8.2e-5 / +3.2e-5 | 2.4e-4 |
| -0.5 | +1.2e-4 / +4.5e-6 | +4.1e-4 | +5.8e-4 | -6.9e-5 | -7.5e-5 | +3.3e-5 / -2.7e-5 | 1.2e-4 |
| -1 | +7.9e-4 / +6.5e-4 | +7.2e-4 | +5.3e-4 | -1.6e-4 | -5.9e-5 | +7.5e-5 / +6.2e-6 | 4.9e-5 |
| -1.5 | +9.9e-4 / +8.5e-4 | +7.8e-4 | +7.1e-4 | -1.9e-4 | +1.3e-5 | +9.7e-5 / +2.2e-5 | 1.3e-4 |
| -2 | +9.0e-4 / +7.4e-4 | +9.0e-4 | +7.3e-4 | +1.2e-4 | +1.3e-4 | +1.1e-4 / +2.7e-5 | 1.8e-4 |
| -2.5 | +1.1e-3 / +8.8e-4 | +8.9e-4 | +7.0e-4 | -8.7e-5 | +1.1e-4 | +5.7e-5 / -2.9e-5 | 1.6e-4 |
| -3 | +1.1e-3 / +9.0e-4 | +8.2e-4 | +6.8e-4 | -1.3e-4 | +6.4e-5 | +8.2e-5 / -8.4e-6 | 1.7e-4 |
| -3.5 | +1.3e-3 / +1.1e-3 | +7.8e-4 | +6.7e-4 | +2.8e-5 | +5.9e-5 | +9.4e-5 / -1.3e-6 | 2.1e-4 |
| -4 | +1.5e-3 / +1.3e-3 | +7.6e-4 | +6.6e-4 | +8.3e-5 | +5.4e-6 | +3.3e-5 / -6.6e-5 | 2.0e-4 |

Si-only C' (same mapping, rel): meshScale 1 -1.2e-4..-1.6e-3, 0.7 -1.0e-4..-7.1e-4, 0.5 -5.7e-5..-3.0e-4 (U/ref
0.9-4.9e-4); converges onto the reference.

Cause, by elimination:
- Domain mapping: identical box (x +-2.5, y -2 / 2.22, zero flux, no metal) from K11.yaml `electrostatics`; eps 11.7 /
  3.9 in both (library values equal the case values).
- Contact segment and oxide BC: the corner nodes add the metal term (st - ne = 0.5-1.9e-4), a definition offset of at most
  about 1 U; it does not explain 1e-3.
- Poisson domain: Si-only converges, so the silicon discretisation is not the cause.
- Far-field cap and grading: with the oxide resolved explicitly the gap disappears (columns far 0.035). Under meshScale
  alone it stalls at +5..7e-4 (s0.5). The size field is h = min(maxEdge, min_k h0_k + g_k d_k) (mesh.mjs:476, 505-520):
  h0 scales with meshScale but the grade g = `geometry.mesh.grade` (default 0.4, section.mjs:112) does not (only
  `grade_corner` is multiplied by min(1, scale), section.mjs:121). So beyond about 0.05 um from the silicon the oxide size
  is about 0.4 d at every meshScale: the failure mode of ref-audit Q1, now in the engine.
- Conclusion: the reference oxide C' is correct; the engine default oxide mesh is the cause.

### (6) Nedeljkovic Table 1

All 27 rows (1.3-14 um, 8 coefficients each) of models.mjs:113-139 match the page image rendered at 4x (journal p.
1178, PDF page 9; crops `t4r2audit/pdf/t1a.png`, `t1b.png`). This includes the 2.0 um row: 3.22e-20, 1.149, 6.21e-20,
1.119, 1.91e-21, 0.992, 2.28e-18, 0.841. The caption limits (c, d at >= 11 um for dN_h <= 1.2e19; p, q at >= 9 um for
dN_e <= 1e19; r, s at >= 8 um for dN_h <= 1.2e19) match `validity`. Row tolerance semantics: nearest tabulated row with
|lambda - row| <= 0.05 um, no interpolation, `mismatchUm` reported and the label
`plasma_dispersion_row_wavelength_mismatch` set; 1.31 -> 1.3, 1.97 -> 2.0, 1.8 rejected (tested). See R8.

### (7) Integration

- `runConfig` dispatch (run.mjs:184, 401-425): `stages: [semiconductor]` runs alone (eo_response / rf_line may follow,
  T1); config targets are not_evaluated with a reason. CLI `--stages semiconductor`: han2023 7 biases, 4.6 s, 0.41 GB;
  `--section cut2` honoured (section cut2 in the result, 24148 nodes, dn_eff(5 V) 1.656e-4). Sweeps go through runConfig.
- Postproc: datasets `semi`, `semi:<k>`, 13 `semi.*` variables. Units checked in dataset.mjs: densities x C0 x 1e6 ->
  m^-3, rho C/m^3, delta_alpha 1/m; display units cm. Covered by the semi-rib test (surface integral of semi.dN < 0).
- Targets: `comparable: false` -> not_evaluated (han2023 3/3); `vpi_convention` -> engineConvention (anjali2025);
  `reference` used for f_rc_ghz only.
- `perLength`: biasV, C' (D1 definition), R', flags, note. G' is missing (R3).

### (8) Suites

| Item | Claimed | Measured (2026-10-16) |
|---|---|---|
| `npm test` | 310: 307 pass, 0 fail, 2 skipped, 1 todo | 310: 307 pass, 0 fail, 2 skipped, 1 todo (todo = pre-existing vector D5); 87.7 s; log engine-test-20261016T011612.log |
| `npm run test:reference` | 15/15 | 15/15 in 36.0 s (script already sets ENGINE_REFERENCE_FULL=1, so K11 ran); peak RSS of the largest child 1.36e9 B |
| K11 FULL | pass | pass, both plasma models, 9 biases; per-row margins in (5) |

## Findings

### R1 (medium) Oxide fields do not converge under meshScale: fixed grading (D11 incomplete)

- Evidence: table (5). The default K11 oxide C' gap stalls at +5.3e-4..+7.3e-4 (q dN_e/dV, meshScale 0.5). With
  `max_edge_um` / `far_edge_um` 0.035-0.05 it drops to within U. Code: grade 0.4 and grade_far 0.6 are not scaled
  (section.mjs:112-113, 123, 134), and an explicit `far_edge_um` is not scaled either (section.mjs:117).
- Impact: any meshScale convergence claim for a field in a graded far region (oxide fringe C', RF C' of electrodes in
  cladding) under-reports the error. This is the shared-code part of round-1 D11; the cap fix alone does not close it.
- Fix: scale the grading with the refinement, as already done for grade_corner (e.g. g x min(1, meshScale)), with
  meshScale 1 unchanged; or document that convergence studies must set explicit sizes. For the K11 gate, add `max_edge_um:
  0.05, far_edge_um: 0.05` to `k11()` (38.6k nodes, about 5 s without optics).

### R2 (medium) S8 gate budgets: the oxide budget is not derived; the 1.5x factor is optimistic for a 0.7 refinement

- The K11 oxide C' gate uses 2e-3 relative, chosen above the observed +0.9..1.5e-3 gap (test comment). The stated
  formula would give 1.5 x 6e-4 + U and fail. The comment calls it secondary and not converged, but it is tuned to pass.
- 1.5 x (change to a mesh refined by r) equals the coarse-mesh error only if 1/(1 - r^p) = 1.5, i.e. p = 3.1 for r = 0.7
  (K11) and p = 1.6 for r = 0.5 (K10, K12). For second order and r = 0.7 the factor is 1.96. Observed: K11 Si-only C' at
  -0.5 V, engine error -1.59e-3 vs budget 1.32e-3; it passes at 0.96 of the tolerance only because of the reference U
  (3.6e-4). K10 and K12 budgets are adequate.
- Fix: budget = 1/(1 - r^p) x change with p measured from three levels (the meshScale 1 / 0.7 / 0.5 data are cheap for
  Si-only: 20k / 37k / 70k nodes, 2-9 s), or run the K11 gate at meshScale 0.7. After R1, gate the oxide C' by the same
  formula on the refined oxide mesh, against `electronIntegralCFPerM` (the reference definition), or add the measured
  metal-charge offset (0.5-1.9e-4) to the budget.

### R3 (medium) Forward bias: `perLength` lacks the junction conductance; quasi-static C'

- Evidence: K12 at 0.8 V, G = dI/dV = 7.46e3 S/cm^2 and C'/G = 1.94 ns. Every forward point has a large shunt G'. The
  export (semi-stage.mjs:192) and T1's junction branch (stages.mjs:540-545, "Y'_j = j w C'_j / (1 + j w R'_j C'_j)")
  carry only C' and R'. T1 accepts forward points and only warns that flags are present.
- Impact: with G' the branch is Y' = (G' + j w C') / (1 + R' (G' + j w C')). Omitting G' drops the DC division
  1/(1 + R'G') and moves the pole from (1 + R'G') / (2 pi R'C') to 1 / (2 pi R'C'). The q dN/dV C' is the charge-control
  value, not Im(Y)/omega of a distributed diffusion region (derivation in (1)). No forward-biased sims config exists
  yet, so nothing current is wrong.
- Fix: export G'(V) = dI/dV from the +-dv/2 states already solved for C'. Use the full branch, or have the semiconductor
  TWE path reject forward-bias points until a small-signal (j omega) solve exists. Keep the quasi-static label.

### R4 (low) D4 residual: push-pull VpiL reported at a 0 V DC bias; one-sided end stencils

- `addVpiL` accepts a stencil when both neighbours have forwardBiasV <= 0, so V_DC = 0 V passes, although the -v arm is
  then forward biased. Measured: han2023 vpilPushPullVcm(0 V) 0.621 V cm, anjali2025 1.210 V cm. At the first and last
  sweep points the "differential" slope is one-sided (first order) and unlabelled.
- The D4 test checks only pp = differential/2 at interior points; there is no rejection test.
- Fix: require forwardBiasV < 0 at the DC point and |swing| <= |V_DC| (or report the forward-going arm); label or omit
  end-point derivatives; add a test.

### R5 (low) Small-signal dn_eff/dV from the bias grid

- `dneffPerV`, `vpilDifferentialVcm` and `vpilPushPullVcm` (and T1's Vpi_DC) use finite differences over the user's bias
  list (0.5-1 V spacing in both sims configs). Estimate from the han2023 dn_eff(V) differences: central difference at
  1 V over +-1 V has an error of about 2 % (third difference); the one-sided value at 0 V is about 11 % low (second
  difference). Both are estimates, not measured against an exact derivative.
- Fix: evaluate the modal response at the +-dv/2 states of the C' step (exact small-signal derivative at every bias, one
  modal evaluation each); keep the grid secant for the large-signal VpiL.

### R6 (low) D1 definition is two-terminal only

- `terminals()` gives every n-type contact -q int n and every p-type contact +q int p (solver.mjs:794). With three
  contacts, or two of one type (p+/n/p+ push-pull pairs, GSG Si sections), the swept contact's C' would include carriers
  supplied by the other same-type contact. Nothing rejects nC > 2. Code reading; no such config exists.
- Fix: reject more than two contacts (or same-type pairs) for C', or compute C_kl from a small-signal solve.

### R7 (low) D11 consistency at meshScale != 1

- The mesh preview (`mesh-entry.mjs:31`, app "Build mesh") does not set farScale, so at meshScale != 1 it differs from
  the solved mesh.
- The Wheeler recessed sections (stages.mjs:35) and the S7 loaded-line cuts (stages.mjs:272-273, T1 file) use
  farScale 1 while the run section uses meshScale. Measured R' effect at meshScale 2 is <= 7e-8 relative on two configs.
  It is still an inconsistency for a differential (L' recessed - L' nominal) quantity.
- Fix: pass farScale through (copy `section.farScale` into the recessed and cut sections, set it in buildSectionMesh).

### R8 (low) Plasma row tolerance semantics

- 0.05 um maps any wavelength within +-0.05 um to a row without an error estimate. Adjacent rows differ by tens of percent
  (e.g. p 1.91e-21 at 2.0 um vs 5.70e-21 at 2.5 um). The label carries `mismatchUm` but no magnitude. The validity check
  uses the maximum density over all silicon (contact regions included), not the mode region; this is consistent with the
  absolute basis but conservative.
- Fix: document the semantics and the expected size, or tighten to 0.01 um except for named bands (1310 -> 1.3).

### R9 (info) Documentation drift

- DevLog-039 Numerics (lines 172-175) still describes `linearResponseCFPerM` as a reported cross-check and an open item;
  the code removed it (D2) and line 307 closes it.
- sims/han2023 c_pf_per_mm target note says "the semiconductor stage does not read comparable"; it does now (T6 file).
  The han2023 provenance "push-pull MZM VpiL = half" should say half the differential VpiL at a reverse DC bias.
- SPEC changelog says schema mirroring is pending; the schema has the semiconductor keys, but `$defs/geometry.electrodes`
  still has minItems 1, so the K10-K12 engine configs (`electrodes: []`) are schema-invalid.

### R10 (info) `checks.continuityRel` magnitudes

- In reverse bias it is 6e7..1.4e21 (han2023), because the derived current is at the residual floor. It is flagged
  (`contact_current_below_residual_floor`), but the number is meaningless; report null when unresolved.

### R11 (info) Test coverage of the fixes

- No test exercises D2 (unconverged tangent -> flag and plain-ramp fallback), D5 (residual rejection, `gmres_unconverged_*`
  flags), the D6 flag semantics, or the D4 rejection. The 1D G6 test keeps an escape (`err < 2e-4`,
  semi-1d-pn.test.mjs:96).

## D-fix status

| Item | Status | Evidence |
|---|---|---|
| D1 | fixed (two-terminal) | (1); R3, R6 |
| D2 | fixed, untested | semi-stage.mjs:104-120; no linear-response output |
| D3 | fixed | 15/15; budgets R2 |
| D4 | partial | R4 |
| D5 | fixed, untested | solver.mjs:582-596, 537; DevLog Numerics aligned (line 176-179) |
| D6 | fixed | `currentDirectAPerM`, `continuityRel`, flag; R10 |
| D7 | fixed | (3); test semi-rib D7 |
| D8 | fixed | `meshCheck` option, rib G6 escape removed |
| D9 | unchanged (info) | documented choice |
| D10 | fixed | semi/config.mjs:163; tested |
| D11 | partial | bitwise identity at meshScale 1 confirmed; grading not scaled (R1); consistency R7 |

## Not checked

- A small-signal (j omega) solve for forward-bias C' (only the quasi-static identity and C/G were checked).
- `density_basis: change`, Gaussian / erfc profiles, 1310 nm rows in a run, sweep outputs of the semiconductor stage,
  T1's S7 x S8 response numbers (T1 lane).
