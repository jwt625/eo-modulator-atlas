---
title: EO modulator atlas - Q2 numerical audit of E2 (optical limits, EO overlap) and E3 (RF line)
auditor: claude-wave-2026-10-02
date: 2026-10-02
scope: E2+E3
verdict: accept after corrections
audited_base: 97ca0d1 plus uncommitted E2/E3 working tree
---

# Q2 audit: E2 + E3 (2026-10-02)

Fresh-context auditor; did not write the code under audit. Method: derive each quantity independently, then compare, then attack the author's tests with mutants.
Analytic correctness is judged here. No paper reproduction is claimed or evaluated; no `validation_status` is touched.
This audit does not replace review by a different owner chosen by the user.

Verdict: **accept after corrections**. The analytic cores (Pockels chain, mode weights, V_pi*L, RLGC, loss formulas, dB conversions) are correct against independent derivations. No high-severity numerical error was found. Four medium findings concern silent-acceptance paths and quantified scalar-model limits that must be fixed or disclosed before any E2 number is surfaced in a result or UI.

## Severity summary

| Severity | Count | IDs |
|---|---|---|
| high | 0 | none |
| medium | 4 | F1, F3, F4, F5 |
| low | 6 | F2, F6, F7, F8, F9, F10 |
| info | 2 | F11, F12 |

## Findings

### F1 (medium) Scalar forms are exact only at horizontal interfaces; the TE/TM identities swap at vertical walls; DevLog-007 O4 wording is inverted for TM
- Where: `engine/src/optics.mjs:177-197` (forms E and H), `DevLog/DevLog-007-e2-eo-overlap.md` O4.
- Derivation: for a laterally stratified slab (core |x| < d, uniform in y) the field component normal to the walls (E_x, quasi-TE in lab terms) obeys D-continuity (slab relation q = n_c^2/n_s^2) and the tangential one (E_y, quasi-TM) obeys E-continuity (q = 1). Form E (psi = E_x, continuous psi) solves the q = 1 problem; form H (psi = H_x, continuous n^-2 d_n psi) solves the q = n_c^2/n_s^2 problem. So at vertical walls the two labels are swapped. At horizontal interfaces both forms are exact (author's slab tests; also A2 below). DevLog O4 says the TM form is "the dual error on horizontal interfaces"; that is incorrect, the TM H-form error is at vertical interfaces.
- Evidence (n_core 2.2, n_clad 1.45, 0.6 um wide, lambda 1.55 um, scratch script and audit test D5): engine TE 2.02960 vs physical (E normal) 1.94848; engine TM 1.94839 vs physical (E tangential) 2.02969. |Delta n_eff| = 0.081 in the pure vertical-wall limit. This is an upper-limit illustration, not a rib number (ribs mix horizontal and vertical interfaces; not quantifiable here without a vector reference).
- Consequence for E2: the Pockels power weight psi^2 near rib sidewalls is not the physical |E_x|^2 (physical E_x jumps by the permittivity ratio). Overlap error is unquantified.
- Correction: fix the O4 text (TM error is at vertical walls); state the 0.08 illustration; keep the `scalar_optical_not_full_vector` label on every downstream number; quantify against a vector solver in E5 before using V_pi*L for a rib device.
- Test: `D5` (todo).

### F2 (low) Three author-suite gaps found by mutation (the suite passes under plausible bugs)
- Evidence (section "Mutation tests"): (a) M5b, sampled E_y unit error (x1e5 instead of x1e6) passes all author tests because every author end-to-end test uses a lateral field (E_x). (b) M24, `combineArms.phaseDifferencePerVPerM` using lambda in um instead of m passes: the author only checks the ratio to the single-arm value and `vpiLVm` is computed separately. (c) M22, `excluded` (PEC metal) triangles not skipped in the overlap passes: no author test drives `eoOverlapFromEngine` with `metal: 'pec_scalar'` (the mutant throws "no optical index" rather than returning a wrong number). (d) M20, E1 `symFactor` for `x_mirror_even` not doubled passes every E1/E2/E3 test: E1 tests cover only the odd half domain.
- Correction: add an E_y end-to-end gate, an absolute `phaseDifferencePerVPerM` gate, a pec_scalar chain gate, and an even half-domain gate (the audit tests A6, A6b, A3, A4 already catch all four mutants and may be adopted by the owner).

### F3 (medium) Quasi-TM equation uses eps_yy in the gradient term; exact uniaxial equation has eps_zz; n_eff bias -5e-3 to -9e-3 for LN-like indices
- Where: `engine/src/optics.mjs:187-196` (`cTri = 1/n2` with n2 = lab eps_yy), `n2Triangles` comp = 4.
- Derivation: uniaxial TM slab: d/dy(eps_zz^-1 dH/dy) + (k0^2 - beta^2/eps_yy) H = 0. Engine: eps_zz := eps_yy. The overlap weights themselves are consistent with the exact equation for a delta eps_yy perturbation (verified, A2), but the mode shape and n_eff that feed them are biased.
- Evidence (independent 1D slab root solve, n_e 2.138 along lab y, n_o 2.211 along propagation, SiO2 clad 1.444, lambda 1.55 um): engine-equation minus exact n_eff = -4.7e-3 (half-thickness 0.15 um), -9.0e-3 (0.30 um), -5.3e-3 (0.50 um). TE is unaffected in the slab limit (E_x equation has no eps_zz). Pre-existing E1 code, not part of the E2 diff, but E2 relies on it for TM.
- Correction: use eps_zz (lab) in the H-form gradient term and eps_yy in the n^-2 mass term; or label TM n_eff for anisotropic materials with the bias above.
- Test: `D4` (todo).

### F4 (medium) `eoOverlapFromEngine` silently accepts an unconverged mode
- Where: `engine/src/eo-overlap.mjs:289-310` (no check of `mode.converged`). `run.mjs` checks convergence; this wrapper does not.
- Evidence: `solveModesAt(..., {maxIter: 2})` returns `converged: false`; the wrapper returns a number differing by 0.7 % (2.688e-5 vs 2.669e-5 per V on a test plate) with no flag.
- Correction: throw (or return a flagged result) when `mode.converged !== true`.
- Test: `D1` (todo).

### F5 (medium) EO results drop the mode labels, metal policy and truncation diagnostic
- Where: `eoOverlapFromEngine` (lines 294-309) and `combineArms` (lines 256-268) return only `assumptions`/`convention`; `mode.labels` (`scalar_optical_not_full_vector`, `optical_metal_*`), `mode.metal` (policy, excluded triangles, PEC face fraction) and `mode.boundaryMarginFraction` are not carried. `assumptions` does not contain `scalar_optical_not_full_vector`.
- Risk: the Chen smoke (V_pi*L 1.969 V cm, reproduced below) is a number with no attached statement that it is a draft-input, scalar, PEC/absent-metal result. Anyone consuming `combineArms` output alone sees a bare V_pi*L.
- Correction: propagate labels, metal object, margin fraction and convergence flag into the arm result; have `combineArms` return the union of both arms' labels plus a fixed `unvalidated_analytic_only` note.
- Test: `D2` (todo).

### F6 (low) `rotation_deg` sense: documented as a CCW rotation of the lab frame, implemented as a CCW rotation of the crystal (lab frame CW)
- Where: `engine/src/materials.mjs:50,59-64`, DevLog-007 section 2. `A' = R(theta) A` with R = [[c,-s],[s,c]] gives row0' = c lx - s n; a CCW lab-frame rotation gives c lx + s n. For +90 deg the lab x axis is -n (code) instead of +n (documentation). For diagonal Pockels terms this flips the sign of the lab field mapped onto the crystal axis, hence the sign of dn for +-90 and 180 deg.
- Impact now: none; no `sims/*/config.yaml` sets `rotation_deg`, and the optical solver rejects non-multiples of 90 deg. The author's 90 deg test encodes the implemented sign.
- Correction: state the sense as implemented (crystal rotated CCW about the propagation axis) or flip the sign of s.
- Test: `D3` (todo).

### F7 (low) Perimeter model is labelled "lower bound" unconditionally
- Where: `engine/src/rf-line.mjs:177-189`, DevLog-008 section "Models".
- Derivation (independent, Cauchy-Schwarz on the signed surface current K with net current I over a surface of length S): integral K^2 >= I^2/S >= I^2/P whenever P >= S. For the loop, summing the two conductors gives R' >= R_s (1/P_s + 1/P_r), and for several return conductors the correct P_r is the sum of their perimeters. The inequality is correct. It fails the "lower bound" reading if the supplied polygon perimeters are smaller than the true carrying surfaces: electrodes truncated by the domain (ground planes extending beyond it), mirror-plane halves, or thin films (t < 3 delta, where the surface-impedance model itself fails).
- Evidence (audit test B3, E1 microstrip-like section, sigma 1e9 S/m, 10 GHz, strip 2 x 0.4 um on 1 um eps_r 4 over a ground plane in a 16 um wide domain): Wheeler R' = 2873 Ohm/m (two E1 solves, recess delta/2 = 0.08 um), perimeter estimate 1499 Ohm/m, ratio 1.92. The bound holds but is a factor 1.9 low on a plain microstrip, consistent with the author's "factor of order 2" statement.
- Correction: add the validity condition to the label text and to the SPEC proposal; never present the perimeter model as an estimate of R'.

### F8 (low) Dielectric `regions` rows: both `tanDelta` and `sigmaSm` silently resolve to `tanDelta`; validation of region loss is lazy
- Where: `engine/src/rf-line.mjs:207-217`. A row with both keys ignores `sigmaSm`/`epsR` without error; `tanDelta` is validated only inside the closure at evaluation (a NaN row builds a line and throws at the first `propagationAt`).
- Correction: reject rows with both keys; validate eagerly in `buildDielectric`.

### F9 (low) No documented mapping from engine V_pi outputs to the schema `vpi_convention` values
- Evidence: engine definition is V_t = full terminal difference (`normalizeWeights`), single-arm gives a per-phase-shifter V_pi, two-arm field-resolved with a single GSG feed gives the push-pull MZM value (factor 2 shown as `armGainVsArmA`; independently verified, A3). `data/schema/devices.schema.yaml` lists `per_arm_phase_shifter`, `mzm_push_pull`, `mzm_series_push_pull`, `mzm_differential`, `mzm_single_arm` without definitions, and SPEC `line.differential: true` says "Vpi quoted for differential (V+ - V-) drive", consistent with V_t but unrelated to arm factors.
- Risk: factor-of-2 comparisons against catalogue rows. Series push-pull and differential have no engine counterpart yet.
- Correction: add a table engine output -> schema enum (single_arm -> per_arm_phase_shifter or mzm_single_arm; two_arm_field_resolved with arms of opposite dn -> mzm_push_pull) to the SPEC tranche, and state that `terminalDrive` is a label only.

### F10 (low) Skin-effect resistance has no DC floor and the validity warning needs an optional input
- Where: `engine/src/rf-line.mjs:190-191`. `R'(f) ~ sqrt(f) -> 0` as f -> 0; the thin-film warning exists only if `thicknessM` is supplied. With `thicknessM` omitted there is no validity warning at any frequency.
- Correction: require `thicknessM` for the skin-effect models or emit a standing `thickness_not_checked` warning.

### F11 (info) Sign conflict `eo_rolloff_db`
SPEC/Chen config targets use negative values (-1.4, -0.76); the data schema defines `eo_rolloff_db` as a positive drop. E3 provides a positive `alphaDbPerCm` and a separate signed `matchedS21Db`, which is consistent with the schema `rf_loss_db_per_cm` and the Chen target 2.947. The conflict stays open for E1/E4 owners; `compareTargets` compares raw values.

### F12 (info) Wheeler rule from two solves is a small difference of large numbers
`wheelerRPrime` subtracts two L' values that differ by order delta/gap. Accuracy depends on equal mesh topology between nominal and recessed geometry; B3 (delta/2 = 0.08 um) and the author's plates test (2e-5) are fine, but no convergence guidance exists. No action required for E3 scope.

## Verified clean (independent derivation agrees)

| # | Item | Result |
|---|---|---|
| 1 | Pockels convention: delta(1/n^2)_I = r_Ij E_j, contracted order xx,yy,zz,yz,xz,xy; 6x3 matrix of `pockelsVoigt` (r42 = r51, r61 = -r22, r12 = -r22, r13 = r23 = r13, r33) is the standard 3m form; `deltaInvEpsCrystal` fills [d0,d5,d4;d5,d1,d3;d4,d3,d2] correctly | verified |
| 1 | `deltaEpsLab`: E_c = A^T E_lab, delta(eta)_lab = A delta(eta)_c A^T, delta(eps) = -eps delta(eta) eps. Rotating the impermeability (rank-2) tensor and inverting in the lab frame is the correct first-order index-ellipsoid change for an anisotropic crystal | verified |
| 1 | Sign and magnitude, all six (cut, propagation) pairs, TE (lab x) and TM (lab y), lab field along x and along y, vs explicit crystal-frame tensor algebra: x-cut y-prop TE uses r33/n_e; z-cut TE r13/n_o, TM r33/n_e; x-cut z-prop engages r22 (via lab x = -crystal y) | agree to 1e-10 (A1, A1b) |
| 2 | TE weights: delta n_eff = int d_eps psi^2 / (2 n_eff int psi^2) is the exact Hellmann-Feynman result for the E-form equation | verified |
| 2 | TM weights (1/n^4 field term, 1/n^2 power term): equal to first-order theory for delta eps_yy only, E_y = beta H_x/(omega eps0 n^2); checked against a finite difference of an independent exact anisotropic 1D slab solution (core 2.2, clad 1.45, Pockels in core only, eps_zz fixed) | agree to 1.3e-4 (A2) |
| 3 | combineArms: phi = k0 n L, delta_phi = phi_A - phi_B, |delta_phi| = pi at V_t gives V_pi L = lambda/(2|dnA - dnB|); push-pull factor 2 and single-arm 1 | verified (A3); absolute phase per V per m added as a gate |
| 4 | Field sampling: sampled E per optical triangle equals the analytic piecewise-uniform field of a two-dielectric capacitor (D continuity), including E_y and electrode-footprint zeroing; off-mesh centroid raises a readable error (also for a window on the discarded half of a mirror-cropped domain) | verified (A5, A6) |
| 5 | PEC scalar boundary: TE form E, psi = 0 on metal nodes, exact on horizontal faces (E_x tangential); TM form H natural condition, exact on horizontal faces (E_z = 0 at the metal); both wrong on vertical faces (E_x / H_x normal), which `pecFaces.validFaceFraction` reports | verified by derivation and by the author gates |
| 5 | Chen claims reproduced with the draft config (scratch script, right window x [-4,4], left x [-114.8,-106.8] um): n_eff absent 1.830131, pec_scalar 1.830115; V_pi L 1.9692 (absent) and 1.9687 (pec_scalar) V cm; margin fractions 1.9e-5 and 1.4e-5 | reproduced; these are draft-input scalar numbers, not validation (see F5) |
| 5 | Regression: runCrossSection (CLI path) on all 11 `sims/*/config.yaml`, electrostatics and optical, new tree vs git HEAD tree: 5 parse strictly (chen2022, kharel2021, li2026ba, lin2025, liu2021); 4 of them (all except Chen) produce bit-identical metrics before and after; Chen optical fails identically except for the longer error message naming the opt-in; the other 6 fail strict parsing for missing `eps_r` in both trees and were not exercised | no regression |
| 6 | gamma = sqrt(Z'Y'), Z0 = sqrt(Z'/Y') with principal roots, exp(+j omega t): alpha >= 0, beta > 0, Re Z0 > 0 over loss x frequency (1e6-1e12 Hz) in all four quadrants of Z'Y'; polar-form roots, gamma Z0 = Z', n_rf = c beta/omega, v = omega/beta | agree to 1e-12 (B1) |
| 7 | C' and normalisation: V_line = max - min (or 2 max abs for odd), C' = 2 W'/V^2 of the FULL structure (half-domain doubled). Independent closed form for a GSG (two parallel 0.8 um gaps, eps_r 4): full domain and even half domain agree to 1e-8; odd half domain is covered by E1. L' = 1/(c^2 C0'), Z0 = 1/(c sqrt(C'C0')) | verified (A4) |
| 8 | R_s = sqrt(pi f mu0/sigma); R' = 2 R_s/w for plates; Wheeler R' = omega (L'_recessed - L') with delta/2 recess: derived from dL' = mu0 (delta/2) closed-integral H^2/I^2 and R' = R_s closed-integral H^2/I^2; internal inductance L_int = R'/omega from Z_s = R_s (1+j) | verified |
| 8 | Perimeter model: Cauchy-Schwarz bound correct under the stated condition (F7) | verified, with caveat |
| 9 | G' = omega C' sum p_i tan(delta_i): P_diss = 2 omega sum tan(delta_i) W_i, W = C'|V|^2/4. Checked against the exact complex series capacitance of an anisotropic-LN-plus-dielectric two-slab capacitor (eps* = eps (1 - j tan d)): C' to 1e-4 relative, G' to 4.4e-5 relative; energy fractions use the full permittivity tensor and include air; alpha = (pi f / v) tan delta for homogeneous filling | verified (B2) |
| 10 | alpha_dB = 20/ln(10) alpha_Np = 8.685889638 per unit length; 1 Np/m = 0.0868589 dB/cm; /sqrt(GHz) scaling; signed `matchedS21Db` separate from the positive attenuation (F11) | verified (B4) |
| 11 | Failure behaviour: NaN, Infinity, zero or negative frequency, non-positive C', missing conductor/dielectric declaration, missing sigma, kPerM, perimeters, tanDelta, citation all throw readable errors with no default; out-of-range paper-table frequency throws. Extreme loss (R' up to 1e300, tan delta 1e10, f from 1e-3 Hz to 1e30 Hz) stays finite with alpha >= 0, beta > 0, Re Z0 > 0 (no NaN) | verified (B4, scratch run); see F8, F10 for the lazy-validation and thickness gaps |
| - | New validation errors in `optics.mjs` (off-diagonal lab permittivity, anchor wavelength, polarization, metal policy) fire as documented and do not change any strictly parsing config | verified |

## Mutation tests (test the tests)

46 distinct mutants applied to scratch copies of the implementation (copy of `engine/` in the session scratchpad; repository files untouched). Each mutant was run against the author's five relevant test files (eo-overlap, optics-limits, rf-line, optics, electrostatics) and separately against the audit file.

| Mutant | Author gates | Audit gates |
|---|---|---|
| TE normalisation 2 n_eff -> n_eff | 6 fail | 6 fail |
| TM field weight 1/n^4 -> 1/n^2; TM power weight 1/n^2 -> 1 | 2 fail each | 6+ fail |
| arm combination dnA - dnB -> dnA + dnB | 4 fail | 1 fail |
| V_pi L = lambda/(2|dn|) -> lambda/|dn| | 1 fail | 1 fail |
| sampled field sign flipped; E_x unit x1e5; gx/gy swapped | 2-4 fail | 1-3 fail |
| **sampled E_y unit x1e5 (M5b)** | **0 fail (escapes)** | 2 fail |
| deltaEpsLab overall sign; Ec = A E; tensor rotation A^T d A | 6, 11, 5 fail | 8, 5, 3 fail |
| Voigt shear index swap d4 <-> d5 | 1 fail (30 deg test only) | 0 (audit gates use diagonal lab terms) |
| PEC E-form metal nodes left free; off-diagonal guard removed; anchor check removed | 1 fail each | 0 (not targeted) |
| PEC TM natural condition replaced by Dirichlet; margin diagnostic left side only | 1 fail each | 0 (not targeted) |
| **excluded (PEC) triangles not skipped in the overlap (M22)** | **0 fail (escapes)** | 1 fail |
| electrode footprint not zeroed (M23) | 1 fail | 1 fail |
| **combineArms phase per V per m with lambda in um (M24)** | **0 fail (escapes)** | 1 fail (after adding the absolute-phase gate) |
| Z0 = sqrt(Y/Z); conjugate Z; csqrt branch -j on the negative axis; n_rf from alpha | 5-13 fail | 1 fail (B1) or 0 |
| Np -> dB with 10/ln10; /100 inverted; matched S21 sign; per-sqrt(GHz) divides by f | 1-3 fail | 1 fail or 0 |
| dielectric participation weights dropped; G' x 1/2; sigma-loss tan delta without 2 pi; low-loss G Z0/2 -> G Z0 | 1-6 fail | 1-2 fail or 0 |
| Wheeler factor 2 lost; R_s without factor; skin depth without pi; R' linear in f | 1-2 fail | 1 fail (B3) or 0 |
| paper-alpha equivalent R factor 2; paper_law sqrt(f) -> f; interpolation reversed; internal inductance sign; perimeter 1/(Ps+Pr) | 1-2 fail each | 0 |
| L' = 1/(c^2 C') instead of C0'; region energy fraction x1/2 | 5-7 fail | 1 fail |
| **E1 `symFactor` not doubled for x_mirror_even (M20)** | **0 fail (escapes)** | 1 fail (A4) |

Result: 42 of 46 mutants are killed by at least one author gate. Four plausible bugs pass the full author suite: M5b (E_y sampling unit), M22 (excluded triangles in the overlap; throws rather than returning a wrong number), M24 (phase per V per m unit), M20 (even half-domain energy doubling, E1 file). All four are killed by the audit tests. The E3 gates caught every rf-line.mjs and complex.mjs mutant tried (22 of 22 killed); the weaker area is the E2 end-to-end chain.

## Audit test file

`engine/tests/audit-claude-wave-2026-10-02.test.mjs`: 22 tests, 17 pass, 5 `todo` (D1-D5, each asserting the correct behaviour and currently failing; they document F4, F5, F6, F3, F1 respectively; `node:test` reports them as todo, suite stays green). Expected values come from explicit tensor algebra, 1D slab root solves, polar-form complex roots, complex series capacitance, closed-form capacitances; nothing is copied from the implementation. `AUDIT_VERBOSE=1` prints the comparison numbers.

Final run: `cd engine && npm test`: 90 tests, 85 pass, 0 fail, 5 todo.

## Limitations

- Scalar-vs-vector error for a real TFLN rib is not quantified (no vector reference in the repo). F1 and F3 quantify the slab limits only.
- The 6 configs that do not parse strictly (deng2026, he2019, meng2023, renaud2023, valdez2022, valdez2023) were not exercised.
- The Chen numbers were reproduced from the draft config and the author's arm windows; mesh convergence, window-size convergence and field-sampling error were not studied. No electrostatic/optical mesh convergence study was run by the auditor.
- First-order Pockels, neglected E_z and shear (r51, r42) terms, clamped/unclamped coefficient basis, and RF/traveling-wave factors (E4) are out of audit scope and unchanged from the author's disclosure.
- Dielectric-loss checks use scalar tan delta per region; anisotropic loss tensors and the Maxwell-Wagner regime are not tested (as disclosed).
- E1 modules (electrostatics, materials, section, fem, run) were read as context; only the behaviours E2/E3 depend on were checked. O8 (common-mode with outer Dirichlet boundaries) was not audited.
- Audit commands: scratch scripts and mutant runs live in the session scratchpad, not in the repository. No commit, install, network or port use.
