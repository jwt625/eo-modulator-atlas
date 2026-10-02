---
title: EO modulator atlas - E2 optical limits, EO tensor overlap, voltage and arm conventions
date: 2026-10-02
status: ready_for_review
owner: claude-wave-2026-10-02
tasks: [E2]
---

# DevLog-007: E2 optical limits and EO overlap

Claim: [claude-wave-2026-10-02](../coordination/claims/claude-wave-2026-10-02.md). Plan: [DevLog-002 section E2](DevLog-002-work-plan-and-ownership.md).
Analytic gates only. No `validation_status` is changed anywhere, no target is tuned, and no paper is claimed reproduced.
Author-written tests are not an independent audit; Q2 should still review the items listed under unresolved limitations.

## 1. Scope

- Review `engine/src/optics.mjs` limits (metal in the window, truncation, boundary conditions, scalar validity, dispersion).
- Resolve the Chen2022 metal-in-optical-window problem with an opt-in, explicit, reported model option; no metal index is ever supplied.
- Freeze voltage / arm / sign / Pockels-frame / normalisation conventions in code and here.
- Implement `engine/src/eo-overlap.mjs` and analytic gates.
- Not done: wiring into `run.mjs`, config fields, schema, SPEC (proposals in section 7), mesh convergence of any paper device, vector solver.

## 2. Conventions frozen

Authoritative text is the header comment and the exported `EO_CONVENTIONS` object of `engine/src/eo-overlap.mjs` (echoed in every result object as `convention`). Summary:

| Item | Convention |
|---|---|
| Lab frame | x lateral, y film normal (up), z propagation (as `materials.mjs`) |
| Crystal to lab | `v_lab = A v_crystal`; rows of `A` are the lab axes in crystal coordinates; `T_lab = A T A^T`; lab field to crystal `E_c = A^T E_lab`. Verified by reading `labFromCrystal`/`deltaEpsLab` and by independent tests. `rotation_deg` AS IMPLEMENTED (`labFromCrystal`: `A' = R(theta) A`, lab x' = c lx - s n, lab y' = s lx + c n) rotates the CRYSTAL CCW about the propagation axis, i.e. the lab axes move clockwise in the crystal frame; the `materials.mjs` comment says CCW lab-frame rotation, which is the opposite sense (Q2 F6, proposal P9). This module takes the implemented sense as the contract. Only multiples of 90 deg keep the lab permittivity diagonal. |
| Pockels | `delta(1/n^2)_I = sum_j r_Ij E_j`; I = xx,yy,zz,yz,xz,xy (1..6), j = crystal x,y,z; `r` in m/V from pm/V; coefficients used as supplied (no clamped/unclamped distinction in the engine). Named coefficients (`r13, r22, r33, r51`) fill point group 3m with c = z; 4mm needs `r22 = 0`; mm2 (r42 != r51) needs explicit `voigt`. |
| Sign | First order `delta_eps = -eps delta(1/eps) eps`, so `delta n = -(1/2) n^3 r E`: a positive `r E` LOWERS the index. The magnitude `(1/2) n^3 r E` is the textbook result; the sign is frozen, not left implicit. |
| Static field | `E = -grad(phi)` in V/m per volt of terminal voltage; 2D so `E_z = 0`; electrostatic gradient is V/um (x1e6). |
| Terminal voltage `V_t` | The engine's normalised full terminal difference (`normalizeWeights`: max(w) - min(w), or 2 max abs(w) for `x_mirror_odd`). Single-ended (V_t, 0) and differential (+V_t/2, -V_t/2) share `V_t`. "Differential" adds NO optical factor; `terminalDrive` is an echo-only field. |
| Optical phase | `phi = k0 n_eff L`, `k0 = 2 pi / lambda_vacuum`; positive = longer optical path. `dn_eff` is `d n_eff / d V_t` for the arm's own mode in the arm's own field. |
| Arm combination | `delta_phi = phi_A - phi_B`; `armB = null` is single-arm drive. `d(delta_phi)/dV_t = k0 L (dn_A - dn_B)`. Push-pull is NOT assumed: it emerges when the field-resolved arms give `dn_B = -dn_A`; the gain over arm A alone is reported as `armGainVsArmA`, the balance as `pushPullBalance` (-1 ideal). `idealPushPullArmB` is an explicitly labelled idealisation. |
| V_pi | Terminal voltage `V_t` with `abs(delta_phi) = pi`, DC, lossless, no RF mismatch: `V_pi L = lambda / (2 abs(dn_A - dn_B))` [V m]; also reported in V cm. Unsigned; arm swap flips only the sign of the phase. |
| Mode normalisation | Power weighted, scalar. TE (form E, psi = E_x): `dn_eff = int d_eps_xx psi^2 / (2 n_eff int psi^2)`. TM (form H, psi = H_x): `dn_eff = (n_eff/2) int (d_eps_yy / n_yy^4) psi^2 / int (psi^2 / n_yy^2)`. Independent of psi amplitude and sign. |

Derivation: `delta_beta = (omega eps0 / 4P) int E* . d_eps . E dA`, `P = (1/2) int Re(E x H*)_z dA`; TE uses `H_y = beta E_x / (omega mu0)` so the power weight is uniform in n; TM uses `E_y = beta H_x / (omega eps0 n_yy^2)`. Uniform check: TE `d beta^2 = k0^2 d_eps`, hence `dn_eff = d_eps / (2 n_eff)`; TM uniaxial dispersion `beta^2 = eps_yy (k0^2 - k_y^2/eps_zz)` gives `d n_eff/d eps_yy = n_eff / (2 eps_yy)`, matching the TM formula. Both are used as test gates.

Existing exposure reused, not duplicated: `materials.deltaEpsLab` (rotated Pockels chain), `epsOptLab`, `pockelsVoigt`, `electrostatics.TriLocator` and the per-triangle `es.grad`. No change to those modules was needed.

## 3. Optical-limits findings (`optics.mjs`)

| ID | Finding | Disposition |
|---|---|---|
| O1 | Metal in the window: the solver rejects any conductor present in the optical mesh, even with a supplied index. Chen2022 `geometry` has two gold T-bar pads (x in [-2.9,-0.9] and [0.9,2.9], y in [1.1,1.3] um) inside the window (y up to 1.5 um), 0.7 um above the rib top (0.4 um). Of the 11 configs under `sims/`, 5 parse strictly (Chen, Kharel, Li2026ba, Lin2025, Liu2021); only Chen has a conductor in its window by bounding box. The other 6 (Deng, He, Meng, Renaud, Valdez2022, Valdez2023) fail strict parsing for missing inputs and were not checked. | Resolved by opt-in options, section 3.1. Default unchanged (reject). |
| O2 | Truncation: every window side is Dirichlet by default; the config cannot choose (`run.mjs` passes no `boundary`). No leakage/truncation diagnostic existed. | Added `boundaryMarginFraction` (psi^2 fraction within a margin of Dirichlet sides; margin printed, default 10% of the shorter side). Truncation convergence gate on a synthetic slab. Chen: margin fraction 1.9e-5 / 1.4e-5 at 0.3 um. No window-size convergence study of Chen was run. |
| O3 | A Dirichlet box can return slab/radiation modes; `neff` ordering selects `mode_index`. A max-index guidance criterion is wrong for ribs (the LN slab at the window edge has the highest index), so none was added; margin fraction is only a proxy. | Documented; no guided-mode classifier. |
| O4 | Scalar validity (corrected 2026-10-02 after Q2 F1). Both forms are exact at horizontal interfaces (normal = film normal y). At VERTICAL walls the roles are swapped: form E (psi = E_x, continuous psi) enforces continuity of the field component that is NORMAL to such a wall (physical D_x continuity makes E_x jump by the permittivity ratio), so it reproduces the physical tangential-field result; form H (psi = H_x, continuous n^-2 d_n psi) reproduces the physical normal-field result. Pure vertical-wall illustration (laterally stratified slab, core 2.2 / clad 1.45, 0.6 um wide, 1.55 um): engine TE 2.02960 vs physical E-normal 1.94848; engine TM 1.94839 vs physical E-tangential 2.02969; |dn_eff| = 0.081. This is an upper-limit illustration, not a rib number. The Pockels power weight psi^2 near rib sidewalls is not the physical |E_x|^2. TE ignores E_y,E_z; TM ignores E_x,E_z. An earlier version of this row wrongly placed the TM error at horizontal interfaces. | Not fixable within E2 (needs a semi-/full-vector formulation). Disclosed in the `optics.mjs` header and carried as the machine-readable result flag `limitations: scalar_forms_exact_only_at_horizontal_interfaces` (also in every EO arm/combined result). Quantification against a vector solver belongs to E5. Audit test D5 stays `todo`. |
| O5 | Off-diagonal lab permittivity (rotation not a multiple of 90 deg) was silently dropped by the scalar solver. | Now an explicit error (`off-diagonal lab-frame permittivity`), relative tolerance 1e-9. |
| O6 | Dispersion: library evaluation is range-checked at the evaluation wavelength only; the anchor wavelength (lambda0) used by `library_anchored` was unchecked. Anchoring is a constant offset `n = n_cfg + (n_lib(lambda) - n_lib(lambda0))` (slope only, no absolute dispersion). Library ranges: SiO2 0.21-6.7, Si 1.357-11.04 um, LN 0.4-5.0 um; LT is tabulated (3-point interpolation). No temperature or composition dependence. | Anchor range now checked (error `anchor wavelength ... outside the library validity range`). Rest documented. |
| O7 | Window not covering the mode, mesh sizing uses bounding-box intersection for region selection (cheap, can over-include), conductor membership is by mesh. | Documented; `metalInWindow` is explicitly a bounding-box pre-check. |
| O8 | Electrostatics (read-only observation, not my file): potentials are `w / vline` with no common-mode removal, so `[0,1]` and `[-0.5,0.5]` are identical only when no outer Dirichlet boundary exists. | Proposal P6. |

### 3.1 Chen2022 optical-window resolution

Problem: gold intersects the window and no verified optical index for the deposited film exists in the repo; inventing one (or silently treating metal as PEC) is prohibited.

Model option (opt-in, `buildOpticalModel(..., {metal})`, exported `METAL_POLICIES`):

- `reject` (default, unchanged behaviour; the error message now names the opt-in).
- `absent`: electrodes are left out of the optical model; their footprint takes the underlying dielectric. Limit "metal optically absent". Label `optical_metal_absent_limit`.
- `pec_scalar`: metal triangles are removed from the equation; the metal boundary is an ideal conductor in the scalar equation (form E: Dirichlet on the metal boundary nodes; form H: natural zero-normal-derivative). Exact only on horizontal faces; `metal.pecFaces` reports `horizontalUm`, `verticalUm`, `obliqueUm` and `validFaceFraction`. Label `optical_metal_pec_scalar_approximation`. No metal index is used or accepted (test with a user index of 7 gives an identical result).

Both are reported in the result (`labels`, `metal` object with policy, omitted/in-mesh conductor names, excluded triangle count, PEC face summary). They are two limits that give a sensitivity of the REAL part of n_eff to the metal; they are not a bound on real gold (absorption/plasmonic effects are not computed; the metal loss is zero in both).

Draft Chen config (unverified constants, TE, right waveguide, 1550 nm project inference), run 2026-10-02 with a scratch script outside the repo:

| Policy | n_eff (mode 0) | psi^2 margin fraction | PEC valid-face fraction |
|---|---|---|---|
| absent | 1.830131 | 1.9e-5 | n/a |
| pec_scalar | 1.830115 | 1.4e-5 | 0.909 (8.0 um horizontal, 0.8 um vertical) |

Difference 1.7e-5 in n_eff: the pads, 0.7 um above the rib top, perturb the mode weakly in the scalar model, so the choice of limit is immaterial at this level for the real part. This is a sensitivity statement on a draft input, not a validation. Gates: parallel-plate PEC analytic (TE `n_eff^2 = n^2 - (lambda/4d)^2`, relative error 3e-5 observed; TM TEM-like `n_eff = n`), `absent` equals a model without that electrode, face-orientation report, structural Chen regression (default rejects, both options converge and are labelled; loose bound 1e-2 so a corrected Chen config does not break it).

Pipeline smoke only (same scratch script, draft inputs, no target comparison, no claim): both arm windows (right x in [-4,4], left x in [-114.8,-106.8] um), field per volt from `es.grad` sampled at optical centroids, `dn_eff/V` = -1.962e-5 (right) and +1.973e-5 (left), `armGainVsArmA` 2.005, `V_pi L` 1.969 V cm (absent) / 1.969 V cm (pec_scalar). Electrostatic/optical mesh convergence, sampling error and input verification are all open, so these numbers must not be quoted.

## 4. Implementation summary

- `engine/src/optics.mjs`: `metal` policy (`METAL_POLICIES`), `metalInWindow`, anchor-range check, off-diagonal guard, polarization validation, `boundaryMarginFraction` (option `marginUm`), `excluded` triangles and `metal` info in `solveModesAt` results, extra labels. Default behaviour and all 20 original tests unchanged.
- `engine/src/eo-overlap.mjs` (new, pure): `EO_CONVENTIONS`, `eoOverlapArm` (rotated-tensor first-order Pockels overlap with power-weighted mode normalisation, per-region breakdown, assumptions echoed), `combineArms` (phase difference, V_pi L), `idealPushPullArmB`, `vpiAtLength`, `uniformTriField`, `sampleFieldOnOpticalMesh` (centroid sampling of `es.grad`; E = 0 inside electrode footprints, readable error outside the electrostatic mesh), `materialsPerTriangle`, `eoOverlapFromEngine`. Missing/inconsistent inputs throw `eo-overlap: ...`; no physical constant is defaulted (wavelength, anchor wavelength, neff, fields, materials all explicit).
- Tests: `eo-overlap.test.mjs` (19), `optics-limits.test.mjs` (14). `optics.test.mjs` not changed. After the Q2 audit: `optics.mjs` TM gradient term uses `eps_zz`, results carry `limitations`; `eo-overlap.mjs` refuses unconverged modes and carries labels/metal/margin/convergence/status through arm and combined results (section 9).

Analytic gates (illustrative round inputs n_o 2.20, n_e 2.10, r13 10, r22 4, r33 30, r51 25 pm/V, lambda 1.55 um, labelled in the test as non-reference):

1. x-cut lateral field TE: `dn = -n_e^4 r33 E / (2 n_eff)`, `n/n_eff` plane-wave-limit factor; vertical field gives zero.
2. z-cut vertical field: TM `r33/n_e`, TE `r13/n_o`; TM also against a finite difference of the analytic uniaxial dispersion.
3. Flip field flips sign; arm swap flips `delta_phi`; push-pull = 2x single arm, `V_pi L` halves; common-mode arms make V_pi undefined and error.
4. 90 deg frame rotation swaps r33/r13 and TE/TM roles (hand-derived axis mapping in the test comment).
5. Independent anisotropic case: z-cut rotated 30 deg, field at an angle; engine `delta_eps_xx` vs exact crystal-frame matrix inverse (no linearisation, no `materials.mjs` helper), relative 1e-5.
6. Amplitude/sign invariance; half-filled Pockels region vs an independent node-quadrature power fraction (1e-9) and ~0.5 by symmetry (TE and TM).
7. Sub-region TE overlap vs central finite difference of re-solved `n_eff` (agreement 1e-9, tolerance 1e-6).
8. End-to-end through electrostatics + optical + overlap: G-S-G homogeneous medium, arm fields equal and opposite (`E = V_t / gap`), push-pull gain 2, identical `V_pi L` for differential/single-ended weights and arbitrary offsets/scales (Neumann outer boundaries).

## 5. Exact commands and outcomes (2026-10-02)

| Command | Outcome |
|---|---|
| `cd engine && npm test` (before Q2 corrections) | 68 pass, 0 fail (20 original + 16 eo-overlap + 12 optics-limits + 20 rf-line from E3, concurrent) |
| `cd engine && node --test tests/eo-overlap.test.mjs tests/optics-limits.test.mjs tests/optics.test.mjs` | 35 pass, 0 fail |
| `uv run pytest -q` (repo root) | 28 passed, 5 PyMuPDF/SWIG deprecation warnings |
| `cd app && npm test` | 23 passed (2 files), 0 failed (another agent edits `app/`; not touched here) |
| Scratch scripts (session scratchpad, not in repo) | Chen sensitivity and arm smoke as in section 3.1 |

No commit, push, install, port binding or process kill. One accidental stdin-blocked shell command of mine was stopped.

## 6. Unresolved limitations

- Scalar vs vector error for the TFLN rib (O4) is unquantified; needs an independent vector reference (Q2/E5).
- TM overlap uses the `E_y` component only; `E_z` (and `delta_eps_zz` from Pockels) are neglected. The TM mode equation now uses `eps_zz` in the gradient term (Q2 F3, fixed 2026-10-02); the lateral (x) gradient term also uses `eps_zz` as a scalar approximation (flag `scalar_tm_lateral_gradient_uses_eps_zz_approximation`). A TM finite-difference gate on the non-uniform slab stays in the audit file (A2) rather than here because the isotropic scalar solve perturbs both `eps_yy` and `eps_zz`.
- First-order perturbation: off-diagonal `delta_eps` (r51/r42 shear terms) couple TE/TM and are neglected; second order and saturation not included.
- `pec_scalar` is exact only on horizontal faces; neither metal limit includes metal loss or plasmonic modes; real gold loss is not computed; no verified gold optical index exists in the repo.
- Field sampling: electrostatic and optical meshes differ; centroid sampling of a piecewise-constant P1 gradient has O(h) error near interfaces and electrodes; no convergence study.
- Static `E` is quasi-DC per volt; RF/traveling-wave factors belong to E4. Pockels coefficients are used as supplied (clamped vs unclamped basis unrecorded in configs).
- Dirichlet window truncation not converged for any paper device; margin fraction is a proxy.
- Common-mode sensitivity with outer Dirichlet electrostatic boundaries (O8) not handled in `electrostatics.mjs`.
- `mode_index` picks by `n_eff` order, not by polarization purity or symmetry.

## 7. Proposed shared-interface changes (not applied)

Owners: codex-main (config/run/schema/SPEC), data owners for config fields. All additive.

| # | File | Proposal |
|---|---|---|
| P1 | `engine/src/config.mjs` `opticalOptions` | Accept optional `optics.metal_in_window` in `reject | absent | pec_scalar` (default `reject`); return `{..., metal}`. `run.mjs` already spreads `opts` into `buildOpticalModel`, so no further runner change is needed for the solve. |
| P2 | `engine/src/run.mjs` | Add `optical.metal = base.metal` and `optical.boundaryMarginFraction` to the result; push the `base.labels` entries (`optical_metal_absent_limit` / `optical_metal_pec_scalar_approximation`) into `warnings`; fail or warn if the margin fraction is above a documented threshold (threshold is a policy decision, not set here). |
| P3 | `engine/src/config.mjs`, schema | New optional block `optics.eo` with `arm_drive` (`single_arm | two_arm_field_resolved`), `terminal_drive` (`single_ended | differential`), `arm_windows` (`A`, `B`: `{x_um, y_um}`; `B` omitted for single arm), `length_mm` (needed for `vpi_dc_v`). Without `arm_windows`, `eo_overlap` is not evaluated. `line.differential` is documented as echo only (no optical factor), consistent with the existing E1 voltage statement. |
| P4 | `run.mjs` stage `eo_overlap` | After `optical_mode`: for each arm solve the mode, call `eoOverlapFromEngine`, then `combineArms`; metrics `vpi_l_dc_vcm` (= `vpiLVcm`), `vpi_dc_v` (= `vpiAtLength`), plus `dn_eff_per_v_A`, `dn_eff_per_v_B`; warnings `scalar_optical_not_full_vector`, `first_order_pockels`, `field_sampled_across_meshes`. `optical_confinement_in_region` can come from `byRegion[...].powerFraction` (TE power weight psi^2; TM psi^2/n^2). A fixed `ng` and DC targets stay independent of each other. |
| P5 | `sims/SPEC.md`, `engine/README.md` | Add the section 2 convention table; update the sentence that metal in the optical window "is unsupported" to the three policies; Changelog entry; note E2 limits O1-O8. |
| P6 | `engine/src/electrostatics.mjs` | Decide whether potentials should be common-mode referenced (subtract mean or reference electrode) when any outer boundary is `dirichlet`, or document the requirement; current normalisation is `w / vline` without offset removal. |
| P7 | `engine/src/materials.mjs` | None required. Optional: record the Pockels coefficient basis (clamped/unclamped) and point group in `r_pm_per_v` provenance; add an explicit `r42` for mm2. |
| P8 | `engine/schema/sim.schema.json` | Mirror P1 and P3 in the same tranche as the runtime change (per DevLog-002 section 5). |
| P9 | `engine/src/materials.mjs` (Q2 F6) | `rotation_deg` sense: either (a) change the comment of `labFromCrystal` to "rotates the crystal CCW about the propagation axis (lab axes move clockwise in the crystal frame)", or (b) flip the sign of `s` in the rotation (`[c, s, 0, -s, c, 0, 0, 0, 1]`) so the implemented sense is the documented CCW lab-frame rotation. Option (b) changes dn by a sign for +-90 and 180 deg; no `sims/*/config.yaml` sets `rotation_deg` and the optical solver rejects non-multiples of 90 deg, so no current number moves. If (b) is taken, the E2 test `rotation_deg = 90 ...` and audit test D3 change together (D3 asserts (b)). Until then D3 stays `todo`. |
| P10 | SPEC / result contract (Q2 F9) | Add a documented engine-to-schema map for V_pi, see the table below. Proposed result field `vpi_convention` computed from `drive` and arm balance; `terminalDrive` stays a label only. |

Engine V_pi output convention to `data/schema/devices.schema.yaml` `vpi_convention` (proposal; none of it is wired):

| Engine output (`combineArms`) | Schema `vpi_convention` | Notes |
|---|---|---|
| `drive: single_arm`, `armB: null` | `per_arm_phase_shifter` (row is a single phase shifter) or `mzm_single_arm` (MZM with only one arm driven) | Same number; the device context decides the enum. Needs a config input; not inferable from the field solve. |
| `drive: two_arm_field_resolved` with `pushPullBalance` near -1 (e.g. one GSG feed with arms in the two gaps) | `mzm_push_pull` | V_pi*L is the MZM-level value; `armGainVsArmA` near 2 relative to a per-arm value. Comparison to a `per_arm_phase_shifter` row needs the explicit factor, never a silent conversion. |
| `terminalDrive: differential` | `mzm_differential` only if the paper quotes V_pi against the full terminal difference V+ - V- (this is the engine's `V_t`, no extra factor); if the paper quotes the per-side amplitude, the engine value is 2x the paper's | The engine has no per-side-amplitude output; do not convert implicitly. |
| series push-pull (two arms in series across the same `V_t`) | `mzm_series_push_pull` | No engine counterpart verified; target stays `not_evaluated` until a series-drive electrostatic model is reviewed. |
| anything else | `resonance_tuning_derived`, `unspecified` | Never engine outputs; not compared. |

## 8. Q2 audit disposition (2026-10-02)

Source: `DevLog/audits/e2-e3-claude-wave-2026-10-02-q2.md` (verdict accept after corrections). Only findings relevant to E2 are listed; F7, F8, F10 (E3 `rf-line.mjs`) and F12 (Wheeler rule) are outside E2 paths.

| Finding | Disposition | What was done / why |
|---|---|---|
| F1 (medium) scalar forms swapped at vertical walls; O4 text inverted | Doc corrected; OPEN LIMITATION | O4 rewritten (TM H-form error is at vertical walls). Limitation stated in the `optics.mjs` header and DevLog; machine-readable flag `limitations: scalar_forms_exact_only_at_horizontal_interfaces` in every `solveModesAt` result and carried into arm and combined EO results. A fix needs a semi-/full-vector formulation (not small, would break the E1 scalar contract); quantification belongs to E5. Audit test D5 remains `todo`. |
| F2 (low) author-suite gaps (M5b, M24, M22, M20) | Partly applied; E1 part open | Added absolute `phaseDifferencePerVPerM` gate (M24) and a combined-result gate that `V_pi L * phase = pi`. The E_y sampling chain (M5b) and `pec_scalar` chain (M22) gates exist as audit tests A6 and A6b and are adopted by reference rather than duplicated. M20 (`symFactor` for `x_mirror_even`) is an E1 file: proposal to the E1 owner to add an even half-domain test and keep audit test A4. |
| F3 (medium) TM gradient term uses `eps_yy`, exact uniaxial equation has `eps_zz`; n_eff bias -4.7e-3 to -9.0e-3 | APPLIED | `optics.mjs`: TM form H now uses `eps_zz` (lab index 8) for the gradient coefficient (both x and y derivatives; the x term is a scalar approximation, flagged) and `eps_yy` for the mass term; `n2Triangles(model, lambda, compOverride)` added (default unchanged). Isotropic and `n_yy = n_zz` materials are unchanged; TE is unchanged. Before/after (z-cut, n_e 2.138 along lab y, n_o 2.211 along z, SiO2 1.444, 1.55 um, slab): half-thickness 0.15 um TM n_eff 1.616855 -> 1.621591 (+4.74e-3); 0.30 um 1.890648 -> 1.899605 (+8.96e-3); 0.50 um 2.030023 -> 2.035289 (+5.27e-3); TE 1.838280 / 2.039981 / 2.129243 unchanged. The shifts equal the audit's quantified bias. Gates: audit D4 (exact anisotropic slab, tolerance 1e-3) now passes and is un-todoed; new homogeneous uniaxial-box gate `beta^2 = eps_yy (k0^2 - k_y^2/eps_zz)` (tolerance 1e-3 = FEM discretisation, with a check that the old equation differs by more than that); the z-cut test in `eo-overlap.test.mjs` now also checks the mode against the exact dispersion. Regression against git HEAD (tree extracted with `git archive`): `runCrossSection(..., {optical: true})` on kharel2021, li2026ba, lin2025, liu2021 gives bit-identical metrics (all configs under `sims/` are TE, so no paper config moves). Pre-existing 20 engine tests unchanged and green. |
| F4 (medium) unconverged mode accepted | APPLIED | `eoOverlapFromEngine` throws `eo-overlap: mode did not converge ... acceptUnconverged` unless `acceptUnconverged: true`; the accepted result echoes `converged: false` and label `mode_not_converged`, propagated by `combineArms` (`converged.all = false`). Audit D1 un-todoed. |
| F5 (medium) labels, metal policy, margin dropped | APPLIED | `eoOverlapArm` takes `modeInfo`; arm results carry `status: unvalidated_analytic_only`, `labels` (always `scalar_optical_not_full_vector`, plus `optical_metal_*`, `mode_not_converged`), `limitations`, `converged` (null when the caller supplied no mode info, never true by default), `metal` (policy, excluded triangles, PEC face summary) and `boundaryMarginFraction`. `combineArms` returns the label/limitation union, per-arm metal, margin and convergence, and the fixed status. Audit D2 un-todoed. |
| F6 (low) `rotation_deg` sense | PROPOSAL (shared file) | Lives in `materials.mjs` (not an E2 path). Documented the implemented sense in `eo-overlap.mjs` header and section 2; proposal P9 with both options. The E2 test is retitled to the implemented sense. Audit D3 remains `todo`. |
| F9 (low) V_pi to `vpi_convention` map | PROPOSAL | Table under section 7 (P10). |
| F11 (info) sign of `eo_rolloff_db` | Not an E2 item | Open for E1/E4 interface owners; E2 outputs no roll-off. |
| F12 (info) Wheeler difference of large numbers | Not an E2 item | E3. |
| Verified clean items (Pockels chain, TE/TM weights, V_pi*L, field sampling, PEC boundary, Chen reproduction, no HEAD regression) | No action | Chen numbers remain draft-input scalar results (F5 markers now attached). |

Test outcomes after corrections (2026-10-02):

| Command | Outcome |
|---|---|
| `cd engine && npm test` | 100 tests: 98 pass, 0 fail, 2 todo (audit D3 `rotation_deg` sense, D5 vertical-wall scalar forms). D1, D2, D4 flipped with an inline `fixed 2026-10-02 by E2 author` comment, assertions unchanged. |
| `cd engine && node --test tests/eo-overlap.test.mjs tests/optics-limits.test.mjs tests/optics.test.mjs` | 40 pass, 0 fail |
| `uv run pytest -q` | 28 passed, 5 PyMuPDF/SWIG deprecation warnings |
| `cd app && npm test` | 23 passed (2 files) |
| HEAD comparison (4 TE configs, optical + electrostatics) | bit-identical |

## 9. Files released

All E2 write paths are released from 2026-10-02 (end of this handoff): `engine/src/eo-overlap.mjs`, `engine/src/optics.mjs`, `engine/tests/eo-overlap.test.mjs`, `engine/tests/optics-limits.test.mjs`, `engine/tests/optics.test.mjs` (untouched), this DevLog. Changed: `optics.mjs` (additive plus the F3 TM gradient-term correction), new `eo-overlap.mjs` and the two new test files, this DevLog, and (by coordinator instruction) the `todo` markers of audit tests D1, D2, D4 in `engine/tests/audit-claude-wave-2026-10-02.test.mjs` (no assertion changed; D3 and D5 stay `todo`). Nothing outside these paths was edited; no commit made. Status `ready_for_review`; not `complete`. Next: codex-main to take P1-P5/P8 as one coordinated tranche, Q2 for an independent check of sign/frame/normalisation factors and the scalar-vs-vector error, E5 for convergence of the Chen window and field sampling.
