---
title: S8 silicon PN/PIN phase shifters - 2D drift-diffusion, plasma dispersion, EO coupling
date: 2026-10-15
status: implemented; gates G1-G10 and P1 pass (numbers below); fresh-context audit pending
owner: orchestrator (Claude, at Wentao Jiang's request); implementation by lane T4 (subagent)
scope: engine/src/semi/ (new), engine/src/semi-stage.mjs (new), engine/tests/semi-*.test.mjs, sims/SPEC.md S8 section,
  engine/schema/sim.schema.json ($defs/semiconductor and one property line only)
---

# DevLog-039: S8 silicon drift-diffusion (lane T4)

Parent plan: DevLog-035 row T4. Independent references (DEVSIM, lane T5) are in `validation/` and DevLog-040; this lane
does not read them.

## Requirements (DevLog-035, orchestrator brief 2026-10-15)

1. 2D steady-state drift-diffusion (Poisson + electron and hole continuity) on the engine's conforming triangle mesh,
   plain JavaScript (browser worker and Node), no new dependencies.
2. Scharfetter-Gummel edge fluxes, coupled Newton with damping, Gummel warm start, bias ramping, equilibrium, reverse
   and forward bias, ohmic contacts, insulator regions (Poisson only), scaling.
3. Physics from read references only: intrinsic density (Sproul-Green), mobility (Masetti doping, Caughey-Thomas field),
   SRH with configured lifetimes. No Auger, no bandgap narrowing, no incomplete ionisation (no source read).
4. Small signal: C(V) by finite difference of contact charge, series resistance from the conductivity path, RC estimate;
   per-length C' and R' exported for the later TWE line (T1).
5. Optics: delta n, delta alpha per element (Nedeljkovic 2011 at 1.3/1.55 um; Soref-Bennett alternative) ->
   complex delta eps -> first-order perturbation of the vector mode -> dn_eff(V), d alpha(V), VpiL(V) (single arm and
   push-pull), loss at bias.
6. Postprocessing dataset `semi` (n, p, potential, quasi-Fermi levels, net doping, dN, dP, delta n, delta alpha) with
   units; bias sweeps (internal bias list and the parametric study machinery).
7. Performance: one bias point < 1 s for a 20k-node device mesh in Node.

## Physics model

Lab frame and units as the rest of the engine: x lateral, y up, lengths um in geometry; physics in SI internally.

### Equations (steady state)

- Poisson: div(eps0 eps_r grad psi) = -q (p - n + N_D - N_A) in semiconductor; div(eps0 eps_r grad psi) = 0 in
  insulators. eps_r is the region material's RF permittivity (`materials.<m>.eps_r`, or its `library` entry; silicon
  11.7 and SiO2 3.9 in `engine/data/materials.json`, sources recorded there).
- Continuity: div J_n = q U, div J_p = -q U, with J_n = q mu_n n E + q D_n grad n, J_p = q mu_p p E - q D_p grad p,
  D = mu kT/q (Einstein relation, non-degenerate statistics), E = -grad psi.
- Carrier statistics (Boltzmann): n = n_i exp((psi - phi_n)/V_t), p = n_i exp((phi_p - psi)/V_t); psi is measured
  from the equilibrium Fermi level (psi = 0 in intrinsic material at equilibrium). V_t = k_B T / q with the exact SI
  constants (k_B = 1.380649e-23 J/K, q = 1.602176634e-19 C, SI 2019 definitions).
- Scharfetter-Gummel flux (Scharfetter and Gummel, IEEE TED 16, 64 (1969), eqs. (28), (29), p. 73: current density
  between mesh points with J, mu, E constant on the interval): along an edge i -> j of length h with
  Delta = (psi_j - psi_i)/V_t, B(x) = x / (exp(x) - 1):
  electron particle flux F_n = (D_n/h) [B(-Delta) n_i - B(Delta) n_j], hole flux F_p = (D_p/h) [B(Delta) p_i - B(-Delta) p_j].
- SRH (Shockley and Read, Phys. Rev. 87, 835 (1952), eq. (4.4) with (4.5), p. 837; Hall, Phys. Rev. 87, 387 (1952);
  same form as Scharfetter-Gummel eq. (19), p. 73):
  U = (n p - n_i^2) / (tau_p (n + n_1) + tau_n (p + p_1)), n_1 = n_i exp(E_t'/kT), p_1 = n_i exp(-E_t'/kT),
  E_t' = E_t - E_i (config `trap_level_ev`). tau_n, tau_p are config inputs (no default value).
- Intrinsic density (Sproul and Green, J. Appl. Phys. 70, 846 (1991), eq. (14), p. 852):
  n_i = 9.15e19 (T/300)^2 exp(-6880/T) cm^-3, measured range 275-375 K (temperatures outside are rejected).
  n_i(300 K) = 1.0017e10 cm^-3 (their Table II: 1.00(3)e10).
- Doping-dependent mobility (Masetti, Severi, Solmi, IEEE TED 30, 764 (1983), eq. (1) electrons, eq. (4) holes,
  Table I p. 766, 300 K): mu_n = mu0 + (mumax - mu0)/(1 + (N/C_r)^alpha) - mu1/(1 + (C_s/N)^beta),
  mu_p = mu0 exp(-p_c/N) + mumax/(1 + (N/C_r)^alpha) - mu1/(1 + (C_s/N)^beta). Table I (cm^2/Vs, cm^-3):
  As: 52.2, 1417, 43.4, 9.68e16, 3.43e20, 0.680, 2.00; P: 68.5, 1414, 56.1, 9.20e16, 3.41e20, 0.711, 1.98;
  B: 44.9, 470.5, 29.0, 2.23e17, 6.10e20, 0.719, 2.00, p_c 9.23e16 (B alpha and beta: middle/last digit partly
  damaged in the scan, read as 0.719 and 2.00 at 10x zoom). N = N_D + N_A (total ionised impurity; the paper fits
  mobility against carrier concentration and its footnote 1 warns about compensation; using N_total is the engine's
  stated choice, label `masetti_total_impurity_density`). The fits are 300 K data; T != 300 K adds the label
  `mobility_parameters_300k`.
- Alternative doping model (Caughey and Thomas, Proc. IEEE 55, 2192 (1967), eq. (1), Table I p. 2192): holes 495,
  47.7, 0.76, 6.3e16; electrons 1330, 65, 0.72, 8.5e16 (mumax, mumin, alpha, N_ref).
- Field dependence (Caughey-Thomas eq. (3) chord mobility, p. 2193, Table II): mu = mu0 / (1 + (mu0 F / v_m)^beta)^(1/beta);
  holes v_m 9.5e6 cm/s, beta 1; electrons v_m 1.1e7 cm/s, beta 2. Driving force F: electric field component along
  the edge, |psi_j - psi_i| / h (the Caughey-Thomas fit is drift velocity vs electric field), lagged by one Newton
  iteration; converged when the field factors change by less than 1e-5. (The first implementation used the quasi-Fermi
  gradient; it is undefined for negligible carriers and made the lag oscillate on a 1 V forward to reverse ramp.)
- Contacts (ohmic, ideal): charge neutrality and equilibrium at the contact, n0 p0 = n_i^2, n0 - p0 = N_D - N_A,
  psi = V_c + V_t asinh((N_D - N_A)/(2 n_i)), phi_n = phi_p = V_c. Metal faces of the same electrode that touch an
  insulator carry the same psi (metal equipotential). Only electrodes listed in `semiconductor.contacts` are allowed;
  every listed contact must touch semiconductor (gate / Schottky contacts are not implemented).
- Outer domain boundaries and semiconductor-insulator interfaces: zero normal D (natural) and zero normal current;
  no interface charge, no surface recombination.
- Plasma dispersion: Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171 (2011), eqs. (4), (5) p. 1175 and
  Table 1 p. 1178: delta alpha = a N_e^b + c N_h^d (cm^-1), -delta n = p N_e^q + r N_h^s; rows
  1.3 um: a 3.48e-22, b 1.229, c 1.02e-19, d 1.089, p 2.98e-22, q 1.016, r 1.25e-18, s 0.835;
  1.55 um: a 8.88e-21, b 1.167, c 5.84e-20, d 1.109, p 5.40e-22, q 1.011, r 1.53e-18, s 0.838.
  Alternative Soref-Bennett (Soref and Bennett, IEEE JQE 23, 123 (1987), fits of Figs. 10-15; closed forms as quoted in
  Reed et al., Nat. Photon. 4, 518 (2010), p. 519 eqs. for 1.55 and 1.3 um): 1.55 um delta n = -(8.8e-22 dN + 8.5e-18 dP^0.8),
  delta alpha = 8.5e-18 dN + 6.0e-18 dP; 1.3 um delta n = -(6.2e-22 dN + 6.0e-18 dP^0.8), delta alpha = 6.0e-18 dN + 4.0e-18 dP.
  N_e, N_h are the free carrier densities (cm^-3) relative to undoped silicon. Definition (selectable,
  `semiconductor.optics.density_basis`): `absolute` (default) dn_Si(V) = f(N(V), P(V)) - f(N(V0), P(V0)), the fit
  applied to the absolute densities at each bias and dn_eff(V) the difference to the reference bias V0
  (`bias.reference_v`, default the first bias value); `change`: f applied to |N(V) - N(V0)|, |P(V) - P(V0)| with the
  sign of each change (on the canonical rib it gives 5-17 % lower VpiL, as the orchestrator noted for the independent
  references). The loss at bias (`lossDbPerCm`) is always the absolute free-carrier loss vs undoped silicon. These
  match the definitions of the independent references (orchestrator note 2026-10-16: absolute basis, Nedeljkovic
  Table 1 at 1550 nm, Soref-Bennett as printed by Reed, Boltzmann, complete ionisation, no BGN, Masetti); their n_i
  is 1.00e10 cm^-3, the engine's Sproul-Green eq. (14) gives 1.0017e10 at 300 K (configurable as `ni_cm3`).
- Optical coupling: per node complex index change dn + i dkappa, dkappa = d alpha lambda / (4 pi) (alpha: intensity
  absorption), delta eps = (n_Si + dn + i dkappa)^2 - n_Si^2 (isotropic), interpolated linearly to the 6 quadrature
  points of every silicon optical triangle; first-order vector perturbation (`vector-mode.vectorPerturbation`, real
  and imaginary parts separately, valid for the lossless reference mode): dn_eff = P(Re delta eps),
  dkappa_eff = P(Im delta eps), mode power loss alpha = 4 pi dkappa_eff / lambda, dB/cm = 10 log10(e) alpha.
- VpiL: single arm, secant from the reference bias V0: VpiL(V) = |V - V0| lambda / (2 |dn_eff(V) - dn_eff(V0)|);
  differential VpiL = lambda / (2 |d n_eff / dV|) (central difference over the bias list). Push-pull (both arms, same
  voltage magnitude, opposite sign of the index change): VpiL_pp = VpiL_single / 2 (convention label
  `push_pull_equal_and_opposite_arms`).

### Derived closed forms used by the 1D gate (derived here from the model above)

Abrupt junction, N_A (p side) and N_D (n side), quasi-Fermi levels flat on each side (low current), minority carriers
neglected. First integral of Poisson on the n side with n = N_D exp(-u/V_t), u = psi_n - psi:
E^2/2 = (q N_D / eps) [u - V_t (1 - exp(-u/V_t))], so at the junction (u_n >> V_t) eps E_j^2 / (2 q N_D) = u_n - V_t;
same on the p side. With u_n + u_p = V_bi - V and Q = eps E_j:
Q = sqrt(2 q eps (V_bi - V - 2 V_t) N_A N_D / (N_A + N_D)), C = dQ/dV = sqrt(q eps N_A N_D / (2 (N_A + N_D) (V_bi - V - 2 V_t))),
charge-equivalent depletion width W_Q = Q (1/N_A + 1/N_D) / q = sqrt(2 eps (V_bi - V - 2 V_t)(N_A + N_D)/(q N_A N_D)),
V_bi = V_t ln(N_A N_D / n_i^2). The 2 V_t term is the majority-carrier tail correction to the depletion approximation.
SRH generation in a fully depleted layer (n, p << n_i, n_1 = p_1 = n_i, tau_n = tau_p = tau): U = -n_i / (2 tau).
Both carriers are below n_i where phi_p < psi < phi_n, i.e. 0 < psi < V for anode at 0 and reverse bias V on the
cathode. With the symmetric parabolic depletion potential (N_A = N_D, total swing V_bi + V, half on each side) that
zone has width W_gen = W (1 - sqrt(V_bi / (V_bi + V))), W = sqrt(4 eps (V_bi + V) / (q N)), so
I_gen ~ q n_i W_gen / (2 tau) per unit area (G7 sanity band 0.95-1.25: the tails where n or p ~ n_i add).
Short-base diode without recombination: minority electrons in the p neutral region of width W_p between the depletion
edge (n = n_i^2/N_A exp(V_f/V_t)) and the ohmic contact (n = n_i^2/N_A) have a linear profile, so
J = q n_i^2 (D_n / (N_A W_p) + D_p / (N_D W_n)) (exp(V_f/V_t) - 1), D from the Masetti mobility of the minority carrier
at the local total impurity density (gate: reverse 1, 2, 5 V, 2 %).

## Numerics

- Mesh: `CrossSection.buildMesh` with extra size sources: `semiconductor.mesh.semiconductor_edge_um` on every
  semiconductor region and optional `junction_edge_um` near N_D = N_A crossings found on a first mesh (two-pass).
  Conforming Delaunay (Ruppert) mesh: no encroached segments, so the cotangent edge weights are non-negative; any
  negative edge weight is clamped to zero and counted (`stats.negativeEdgeWeights`).
- Discretisation: box method consistent with P1 FEM. Poisson: P1 stiffness with region eps (exact across interfaces),
  charge and recombination with lumped control volumes (A_t / 3 per vertex, semiconductor triangles only). Continuity:
  edge couplings w_ij = sum over semiconductor triangles of (cot of the opposite angle)/2; SG fluxes per edge. Doping per
  node: control-volume average, sampled at the centroid of each vertex kite (barycentric (11/18, 7/36, 7/36)) of each
  semiconductor triangle (exact for piecewise-constant doping aligned with region boundaries and for linear profiles).
  Mobility per edge: arithmetic mean of the nodal low-field values, then the field factor.
- Scaling: psi / V_t, n and p / C0 (C0 = max |N_D - N_A|), lengths in um, flux rows / (mu0 V_t C0).
- Variables and Newton: residuals in (psi, n, p); Jacobian in (psi, phi_n, phi_p); the carrier update is applied in
  Slotboom form u = exp(-phi_n), v = exp(phi_p): u <- u (1 - t dphi_n), v <- v (1 + t dphi_p), i.e. Newton in
  (psi, u, v), exact for the linear continuity blocks and positive whenever the linearised density stays positive
  (otherwise a density falls by at most 1e-4 per step). (The first form, phi <- phi + dphi, moved overestimated
  minority densities by about one V_t per iteration.) The psi step is shortened as a whole above 10 V_t; backtracking
  line search on the row-scaled residual norm; quadratic termination (a full step below 1e-5 V_t that squared the
  previous one ends the iteration without a verification step). Densities are floored at n_i exp(-500) (quasi-Fermi level
  pinned there; affects only negligible carriers).
- Linear solve: right-preconditioned restarted GMRES (30) on the row-scaled Jacobian. Preconditioner: block upper
  triangular, carrier blocks first (exact in phi variables), then psi with S = K + lambda^2 M (n + p) (the exact
  Poisson Jacobian at fixed quasi-Fermi levels). The carrier blocks are symmetric M-matrices after a diagonal change
  of variables: J_nn = -diag(1/u) H_n with H_n = diag(u) (-J_nn) symmetric (identity B(-D) = B(D) exp(D)), same for
  holes with v; all three are factorised by the engine's sparse Cholesky (`sparse.mjs`, one symbolic analysis per
  mesh) with symmetric Jacobi scaling. Factors are reused across Newton iterations and bias steps (GMRES absorbs the
  staleness; refactor when GMRES needs more than 6 iterations or the state moved more than 1 V_t). A block symmetric
  Gauss-Seidel variant (second carrier sweep) is available (`setPrecondSymmetric`), off by default (same GMRES counts,
  more triangular solves). Measured GMRES iterations per Newton step: 1-2 with fresh factors.
- Terminal currents: the majority-carrier residual at a contact cancels large drift and diffusion terms (it is exactly
  0 in floating point for the reverse-biased 1D diode); with one contact per majority type it is replaced by particle
  conservation (sum over contacts = total recombination, minority residuals of the other contacts), and the direct
  value is kept as a continuity check (`checks.majorityDerivation`).
- Terminal charge for C(V): metal charge (eps0 V_t times the Poisson residual of the contact nodes) plus the space
  charge of the contact's doping-type side, split at kite level inside each control volume (fixed charge of the kites
  with the contact's doping sign, free-carrier charge by the same area fraction, half of compensated kites). Without
  the kite split the junction control volume lost +-q N h/2 (2 % offset of Q at 5 nm mesh; C unaffected).
- Gummel: nonlinear Poisson at fixed quasi-Fermi levels (chord Newton on S, refreshed when the update stops
  shrinking), then one Slotboom-form block solve each for electrons and holes (SRH linearised). Warm start before
  Newton for every bias step above 4 V_t (max 12 iterations, stops at 1e-3 V_t, or when an iteration reduces the update
  by less than 0.3, i.e. high injection). In reverse bias Gummel reaches 1e-12 in 3-6 iterations from the side-shift
  predictor; Newton then needs 1-3 iterations.
- Equilibrium: nonlinear Poisson with phi_n = phi_p = 0 from the charge-neutral guess; continuity is satisfied exactly.
- Bias: ramp by at most `numerics.ramp_step_v` (default 1.0 V) or `forward_ramp_step_v` (default 0.1 V) while the
  forward bias (mean p-contact minus mean n-contact bias) is positive and rising; a failed step is retried with Gummel,
  then halved (minimum 1e-3 V). Predictor: side shift (psi, phi_n, phi_p of each contact's doping-type side move with
  its bias). A secant predictor was tried and dropped (it extrapolated minority quasi-Fermi levels badly).
- Small signal (as of round 3): the +-dv/2 states of the swept contact start from the tangent dx/dV (one linear solve
  J z = -dF/dV at the converged state; an unconverged tangent is not used and flags the point) and are converged by
  Newton. From them, by central difference (truncation O(dv^2), dv default 10 mV): C' (terminal charge, round 2 D1),
  G' = dI/dV (null and flagged when the contact current is below the residual floor), dn_eff/dV and d alpha/dV (modal
  response at both states). The round-1 linear-response C cross-check was removed in round 2 (audit D2: an artefact of
  evaluating the nonlinear Slotboom map at a tiny step).
- Convergence (round 2, audit D5): max |d psi| and max |d phi_n|, |d phi_p| below `numerics.update_tol_vt` (default
  1e-8 V_t), counted at nodes where that carrier exceeds 1e-6 of the equilibrium minority density n_i^2 / max(|N|, n_i)
  (`significant()`), or the quadratic termination; then the row-scaled residual max |F_i / J_ii| over psi rows and the
  significant carrier rows must be below 1e-6 (`RESIDUAL_TOL`), else the solve counts as not converged. At most
  `numerics.max_newton` (default 40) iterations. GMRES solves that stay unconverged after a refactorisation are
  counted (`solverStats.gmresFailures`) and flag the bias point (`gmres_unconverged_<count>`).
- Terminal quantities: electron and hole particle residuals of the contact control volumes give the contact current
  I_c = q (R_p - R_n) per unit length (A/m, into the device); contact charge Q_c = eps0 (K psi)_c - q (control-volume
  charge) summed over the contact nodes (C/m). Checks: sum of contact currents (current continuity), sum of contact
  charges + space charge (charge neutrality).
- Small signal: C'(V) = dQ_c/dV_c by central difference (bias +- dv/2, default dv = 10 mV) at each bias point;
  series resistance R' by a linear conduction solve: sigma = q (mu_n n + mu_p p) per node from the DD state at that
  bias, depleted nodes (|p - n + N_D - N_A| > 0.5 |N_D - N_A|, includes the metallurgical junction) shorted
  (sigma x 1e6), unit voltage between the two contacts, R' = 1 / (int sigma |grad phi|^2) (ohm m); f_RC = 1/(2 pi R' C').
  This is the quasi-neutral access resistance of both sides in series with the depletion capacitance (method label
  `quasi_neutral_conduction_depletion_shorted`). Exported per length for the T1 TWE line: C' (F/m), R' (ohm m),
  shunt admittance Y'(omega) = j omega C' / (1 + j omega R' C').

## Config schema (published for T6; also `engine/schema/sim.schema.json` `$defs/semiconductor`)

All keys optional unless marked required. Numbers accept `=expr` params. Illustrative values are labelled as such in
configs (`provenance.<path>.class: project_inference` or the paper locator).

```yaml
semiconductor:
  temperature_k: 300                      # 275-375 K (Sproul-Green range); default 300
  materials:                              # required: geometry material names solved as semiconductor
    silicon:
      semiconductor: silicon              # required; only silicon
      intrinsic_density: sproul_green_1991   # default; or {ni_cm3: 1.0e10} (config input, needs provenance)
      mobility:
        doping: masetti_1983              # masetti_1983 (default) | caughey_thomas_1967 | constant
        donor: phosphorus                 # phosphorus (default) | arsenic (Masetti Table I electron column)
        field: caughey_thomas_1967        # caughey_thomas_1967 (default) | none
        mu_n_cm2_per_vs: 1400             # only with doping: constant (config inputs)
        mu_p_cm2_per_vs: 450
      recombination:
        srh: {tau_n_s: 1.0e-6, tau_p_s: 1.0e-6, trap_level_ev: 0.0}   # inputs; omit srh = no recombination
  doping:                                 # required, list; contributions add per species
    - name: p_well                        # free text
      species: acceptor                   # acceptor | donor
      profile: uniform                    # uniform | gaussian | erfc
      concentration_cm3: 5.0e17           # uniform
      within: {regions: [si_rib_left, si_slab_left]}    # clip: regions [names] | rect {x_um, y_um} | polygon_um
    - name: n_implant
      species: donor
      profile: gaussian                   # N = peak exp(-(d - range)^2 / (2 straggle^2)) x lateral(x), d = surface_y - y
      peak_cm3: 1.0e18
      vertical: {surface_y_um: 0.22, range_um: 0.08, straggle_um: 0.04}
      lateral: {x_um: [0.0, 5.0], straggle_um: 0.03}     # mask window, erf edges; straggle 0 = hard edges
      within: {material: silicon}         # default: all semiconductor
    - name: drive_in
      species: donor
      profile: erfc                       # N = peak erfc(d / depth)
      peak_cm3: 1.0e19
      vertical: {surface_y_um: 0.22, depth_um: 0.05}
  contacts:                               # required; every listed electrode must touch semiconductor
    - {electrode: anode, type: ohmic, bias_v: 0}
    - {electrode: cathode, type: ohmic, bias_v: 0}
  bias:                                   # optional bias sweep of one contact (others stay at bias_v)
    contact: cathode
    values_v: [0, 1, 2, 3, 4]             # or {start_v, stop_v, step_v}
    reference_v: 0                        # reference for delta n_eff and the secant VpiL (default first value)
  numerics: {ramp_step_v: 0.5, update_tol_vt: 1.0e-8, max_newton: 40}
  small_signal: {dv_v: 0.01, capacitance: true, series_resistance: true}
  mesh: {semiconductor_edge_um: 0.01, junction_edge_um: 0.005}
  optics:                                 # optional; needs the optics block (vector solver) of the config
    plasma_dispersion: nedeljkovic_2011   # nedeljkovic_2011 (default) | soref_bennett_1987
    wavelength_nm: 1550                   # default optics.wavelength_nm; rows 1300/1310 -> 1.3 um, 1550 -> 1.55 um
    drive: single_arm                     # single_arm | push_pull (equal and opposite arms)
  targets:                                # paper values compared at a bias (own validation; not config.targets)
    - {metric: vpil_vcm, at_bias_v: 2, value: 1.8, tol_rel: 0.1, source: {locator: "Fig. 3"}}
      # metrics: vpil_vcm, dneff, dalpha_db_per_cm, loss_db_per_cm, c_pf_per_mm, r_ohm_mm, f_rc_ghz
```

Voltage convention: positive `bias_v` on a contact raises its potential; a PN diode is forward biased when the anode
(p contact) is positive relative to the cathode. Reverse bias of a lateral PN: positive cathode bias (or negative anode).

## Outputs

`runSemiconductor(text | config, options)` (engine/src/semi-stage.mjs) returns per bias point: contact biases,
currents (A/m), charges (C/m), C' (pF/mm), R' (ohm mm), f_RC (GHz), dn_eff, d alpha (dB/cm), mode loss (dB/cm),
VpiL secant and differential (V cm), Newton/GMRES statistics, checks (current continuity, charge neutrality), timing;
plus the `semi` dataset (see below) for the selected or every bias point. Units are explicit in every key.

Dataset `semi` (`engine/src/semi/dataset.mjs`): device mesh (x, y in um, tri, triRegion, region names) and nodal
fields with SI units: psi (V), phi_n, phi_p (V), n, p (1/m^3), N_D, N_A, N_net (1/m^3), dN, dP (vs reference bias,
1/m^3), delta_n (1), delta_alpha (1/m). Postproc store integration (DevLog-031 `createSolutionStore` dataset list) is a
hook in `engine/src/postproc/` outside this lane's write paths; `semiDataset()` provides the arrays and the variable
registry in the store's `{name, unit, description, location}` form for that hook (T7/integration).

## Hooks needed outside T4 write paths (announced; not edited by T4)

- `engine/src/run.mjs` / `stages.mjs` / `config.mjs` (T1 this round): none required. The stage is self-contained
  (`runSemiconductor`); a later one-line dispatch from `runConfig` (`stages: ['semiconductor']`) and `STAGES` entry are
  optional. `config.mjs` passes the `semiconductor` block through unchanged (top-level keys are not strict); its
  numbers are expression-expanded by `expandConfig`.
- `engine/src/postproc/store.mjs`: register `semi` datasets from `result.internals.semi` (later lane).
- `engine/cli.mjs`: `--semiconductor` flag (later); meanwhile `node engine/src/semi/run-cli.mjs CONFIG.yaml`.

## Gates

| Gate | Criterion |
|---|---|
| G1 1D abrupt PN: V_bi | neutral-region potential difference vs V_t ln(N_A N_D/n_i^2), < 1 % |
| G2 1D: depletion charge / width vs bias | W_Q from the computed space charge vs closed form (with 2 V_t), < 1 % at 0 to -5 V |
| G3 1D: junction capacitance | C'(V) (contact charge, central difference) vs closed form, < 1 % |
| G4 charge neutrality and current continuity | |sum Q_c + Q_space| / |Q_c| < 1e-6; |sum I_c| / max |I_c| < 1e-6 (forward) |
| G5 equilibrium zero current | |I_c| at V = 0 below 1e-12 of the forward current scale |
| G6 mesh convergence | C' and dn_eff change decreasing with mesh refinement (h, h/2, h/4) |
| G7 reverse leakage sanity | generation-dominated diode: I_rev within [0.5, 1.1] q n_i W / (2 tau) |
| G8 plasma dispersion | implementation vs Nedeljkovic Table 2 (1.55 um, N_h 1e17: -dn 2.70e-4, d alpha 0.416 cm^-1, L_pi 0.287 cm) < 1 %; Soref-Bennett vs Reed p. 519 example (5e17 -> dn -1.66e-3) < 1 % |
| G9 canonical lateral PN rib (SOI 220 nm rib, 90 nm slab; doping illustrative) | end to end: C(V), R', f_RC, dn_eff(V), d alpha(V), VpiL(V), loss; timings |
| G10 suites | `npm test` (sequential) green; `npm run test:reference` green |
| P1 performance | one bias point < 1 s on a 20k-node device mesh (Node) |

## TODO

- [x] Plan, schema and references (this file)
- [x] semi/models.mjs (n_i, mobility, SRH, plasma dispersion) with locators; G8 test
- [x] semi/config.mjs (validation of the block), doping profiles (uniform, gaussian, erfc, lateral erf window)
- [x] semi/device.mjs (mesh, edge weights, control volumes, kite doping, contacts, side split)
- [x] semi/solver.mjs equilibrium, Gummel, Newton-GMRES, bias ramp, tangent; G1-G5, G7 tests
- [x] semi/smallsignal.mjs C(V), R', f_RC
- [x] semi/optics.mjs (vector perturbation), VpiL, loss, density basis option
- [x] semi/dataset.mjs `semi`, bias sweep, `runSemiconductorSweepPoint`
- [x] canonical rib case G9, mesh convergence G6, performance P1
- [x] sims/SPEC.md S8 section, schema `$defs/semiconductor`
- [x] engine suite sequential + test:reference
- [ ] fresh-context audit (orchestrator)
- [x] runConfig / CLI dispatch and postproc `semi` datasets (round 2); [ ] T1 TWE use of C', R' (next)
- [x] closed (audit D2): the linear-response C was an artefact of its own diagnostic (nonlinear Slotboom map at a tiny step); removed

## Progress log

- 2026-10-15 23:32 PDT Read DevLog-035/023, engine README, SPEC, engine APIs (mesh, fem, sparse, electrostatics,
  vector-mode perturbation, optical-stage, stages, run, config, postproc store). References read from the PDFs:
  Scharfetter-Gummel eqs. (19), (28), (29) p. 73; Shockley-Read eqs. (4.4)-(4.5) p. 837; Sproul-Green eq. (14)
  p. 852 and Table II; Masetti Table I p. 766 (rendered at 4x and 10x); Caughey-Thomas eqs. (1), (3), Tables I, II;
  Soref-Bennett pp. 126-128 (fit slopes; no closed-form coefficients in the paper itself); Reed 2010 p. 519 closed
  forms. Nedeljkovic 2011 fetched rate-limited from IEEE Xplore (open access stamp PDF, one request after the DOI
  resolution, >= 5 s apart) into references/_inbox/nedeljkovic2011.pdf (git-ignored; sha256 ae47c92d...0af0d260);
  Table 1 rows 1.3 and 1.55 um read at 5x zoom; Table 2 used as G8. Klaassen 1992 not used (optional); no Auger or BGN.
- Design decision: direct sparse LU of the coupled 3N system estimated at ~1e9 multiply-adds per factorisation for 20k
  nodes (AMD fill of DevLog-024 x 27), above the 1 s budget; chosen Newton with GMRES and a Cholesky-based block
  preconditioner (three node-size factorisations per Newton step).
- 2026-10-16 00:16 PDT Implementation and gates (since the 2026-10-15 23:32 entry). Files: `engine/src/semi/{models,config,device,linear,solver,
  smallsignal,optics,dataset,run-cli}.mjs`, `engine/src/semi-stage.mjs`, tests `engine/tests/semi-{models,1d-pn,rib}
  .test.mjs` with inputs in `engine/tests/semi-fixtures.mjs` (analytic and illustrative only). Schema
  `$defs/semiconductor` (+ `forward_ramp_step_v`, `density_basis`), SPEC S8 section and changelog line.
- Gate results (1D strip N_A = N_D = 1e17 cm^-3, h 20 nm, 5 nm mesh, 4600 nodes; field mobility off):
  G1 V_bi relative error 2e-16; G2 W_Q vs closed form (with 2 V_t) 9.6e-5 / 4.6e-5 / 3.0e-5 / 1.2e-5 at 0 / 1 / 2 / 5 V
  reverse; G3 C 1.1e-4 / 3.7e-5 / 3.3e-5 / 1.0e-5 (linear-response C the same to 1e-6); short-base saturation current
  5.6e-5 to 5.8e-5 (1, 2, 5 V); G4 charge neutrality 1e-13 relative, forward 0.6 V (SRH 1 us) majority residual
  direct vs conservation 2.3e-9 (n), 3.2e-9 (p); G5 I(0)/I(0.6 V) 1.2e-24; G7 reverse leakage / generation-zone estimate
  1.081 (1 V), 1.040 (3 V); G6 C(2 V) error 5.8e-4 / 5.9e-5 / 3.3e-5 at 20 / 10 / 5 nm (403 / 1288 / 4600 nodes).
  G8 Nedeljkovic Table 2 (1.55 um, N_h 1e17): -dn, d alpha, L_pi within 1 %; Soref-Bennett (Reed p. 519 example)
  -1.672e-3 vs -1.66e-3 (0.7 %). Note: Nedeljkovic Table 2 lists 0.552 dB absorption over L_pi while
  10 log10(e) x 0.416 cm^-1 x 0.287 cm = 0.518 dB; not used as a gate.
- G9 canonical rib (illustrative: 220 nm rib, 90 nm slab, 500 nm wide, 5e17 body, 1e20 contact strips from 1.6 um,
  tau 1 us, metal contacts 2.5-3.5 um from the centre, 1550 nm TE vector mode n_eff 2.56916): 30,306 device nodes
  (21,316 semiconductor), optical 2,413 nodes. 0 / 1 / 2 / 4 V reverse: C 0.4290 / 0.3124 / 0.2633 / 0.2138 pF/mm,
  R' 15.48 / 15.43 / 15.39 / 15.20 ohm mm, f_RC 24.0 / 33.0 / 39.3 / 49.0 GHz, dn_eff 0 / 6.156e-5 / 1.075e-4 /
  1.780e-4, loss 11.59 / 10.39 / 9.50 / 8.14 dB/cm, VpiL (secant, single arm) - / 1.259 / 1.442 / 1.741 V cm (change
  basis 1.11 / 1.33 / 1.66 at 1 / 2 / 4 V). Mesh study at 2 V (semiconductor edge 20 / 14 / 10 nm, 10.6k / 18.1k /
  30.3k nodes): dn_eff 1.07287e-4 / 1.07463e-4 / 1.07485e-4, C' 262.33 / 263.05 / 263.30 pF/m (changes shrink).
- P1 performance (Node 23.7, nice 10, machine shared): rib DD solve per 1 V reverse step 375-560 ms (2 V step 751 ms),
  C' by tangent-predicted central difference 225-245 ms, R' 7-16 ms, optics per bias 4-9 ms; equilibrium 172 ms,
  vector mode 521 ms; run of 4 biases 4.0 s. Component times on that mesh: three block factorisations 33 ms, one
  preconditioner application 6 ms, Jacobian assembly 3 ms. Forward 1D (10.5k nodes, SRH): 0.2-0.6 s per point up to
  1 V. Suites: `npm test` 297 tests, 294 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5); `npm run test:reference`
  11/11 pass. Logs: session scratchpad `t4semi/engine-test-*.log`, `engine-ref-*.log` (not in the repo).
- Orchestrator note (2026-10-16): definitions of the independent references recorded under Physics model
  (plasma-dispersion basis); the engine default matches them, `density_basis: change` is the selectable alternative.

## Round 2 plan (2026-10-16 00:50 PDT): audit fixes and S8 integration

Inputs: `DevLog/audits/simulator-s8-engine-audit-2026-10-16.md` (D1-D11), DevLog-035 progress (T5 round 2, T6 rounds
1-2), `validation/reference/summary-s8.json` and `validation/cases/K10-K12.yaml` (now readable for the gates).
Write paths: `engine/src/semi/`, `semi-stage.mjs`, `run.mjs`, `config.mjs`, `cli.mjs`, `postproc/store.mjs` (semi
dataset registration only), `section.mjs` (D11 only), `tests/semi-*`, `tests/reference-cases.test.mjs` (S8 cases),
`sims/SPEC.md` S8, this file.

- [x] D1 C' = d(terminal charge)/dV with the charge that flows through the contact: Q_k = metal charge of contact k
  (Poisson residual of its nodes, includes oxide faces) - q int n dA for an n-type contact (+ q int p dA for p-type).
  Same definition in reverse and forward bias (forward includes the stored diffusion charge; labelled
  `includes_diffusion_charge`). Checks: hole/electron integrals agree (two-contact devices); gates on K10 (asymmetric,
  0 V and +0.3 V) and K12 forward. The doping-side space charge stays as the depletion diagnostic.
- [x] D2 drop the linear-response C cross-check; tangent only as predictor, its GMRES convergence propagated
  (fallback to a plain ramp and a flag when it fails).
- [x] D3 S8 cases in `test:reference`: engine configs for K10, K11 (Si-only C' primary, dn_eff / d alpha / alpha /
  VpiL both plasma models; oxide C' only on the recorded domain, secondary), K12 (J, centre and mean i-region
  densities). Needs two schema additions: contacts on a bare semiconductor boundary segment (the references pin the
  end nodes; no metal) and `poisson_domain: semiconductor` (Si-only C'). Tolerance per row = reference U + engine
  discretisation budget measured by refinement (two mesh levels, recorded here).
- [x] D4 push-pull VpiL: only the differential VpiL about a reverse DC bias, halved (both arms reverse biased,
  +-v swing); the secant VpiL is single arm only.
- [x] D5 scaled-residual convergence check implemented (not only the update); `significant()` comment and DevLog
  aligned; GMRES failures counted and flagged per point.
- [x] D6 continuity check reports the direct (unsubstituted) majority residual; currents flagged unresolved when the
  free-node residual sum exceeds 1e-3 of the derived current.
- [x] D7 first-order delta eps = 2 n_Si (dn + i dkappa) by default (consistent with the first-order perturbation and
  the reference definition); `delta_eps: exact` keeps the previous form.
- [x] D8 optional mesh-uncertainty estimate (`meshCheck` run option: second run at a finer meshScale, per-point
  relative differences); G6 escape clause removed or justified by the measurement.
- [x] D10 non-Neumann `geometry.boundary` rejected by the semiconductor stage.
- [x] D11 section.mjs: the default far-field size cap diag/12 scales with the user meshScale (section `farScale`,
  set by the runners; 1 when unset) so meshScale = 1 is bitwise unchanged; regression over all configs at meshScale 1.
- [x] Integration: `semiconductor` in STAGES/IMPLEMENTED_STAGES, `runConfig` dispatch (stages: [semiconductor],
  `--section`), CLI `--stages semiconductor`; postproc store datasets `semi` (reference bias) and `semi:<k>` per bias
  point, nodal P1 variables with SI units; semiconductor targets honour `source.comparable: false`, `vpi_convention`
  (push-pull -> differential/2, single arm / per arm -> secant) and `reference` (accepted values as config targets);
  Nedeljkovic Table 1: all rows 1.3-14 um with the locator; `result.perLength` C'(V), R' (D1 definition) for T1.
- [x] Gates: engine suite sequential, test:reference incl. S8 cases, han2023 and anjali2025 via the CLI, P1 timing.

## Round 2 progress (2026-10-16 01:09 PDT)

- D1: terminal charge = metal charge + -q int n (n contact) / +q int p (p contact) (`terminals()`, stage
  `capacitance`); the doping-side space charge is kept as `depletionCFPerM`. K10 C'(0 V) now -1.4e-4 / -4.0e-5 at 4 / 2
  nm (was -2.6e-3 / -2.1e-3 in the audit); K12 forward C' = q d(int n)/dV, e.g. 2.534e-11 F/m (0.6 V), 1.446e-9 F/m
  (0.8 V), electron vs hole integrals within 2e-6; forward points flagged `capacitance_includes_diffusion_charge`.
  Symmetric rib and han2023 unchanged (han2023 C'(3.5 V) 0.2285 pF/mm).
- D2: linear-response cross-check removed; the tangent is only the predictor, an unconverged tangent solve is not used
  and flags the point. D4: `vpilVcm` single-arm secant, `vpilDifferentialVcm`, `vpilPushPullVcm` = differential / 2
  where the stencil is reverse biased; targets choose by `vpi_convention`. D5: residual check (RESIDUAL_TOL 1e-6,
  row-scaled, significant rows) and GMRES failure flags. D6: `checks.continuityRel` (direct vs conservation),
  `contact_current_below_residual_floor` flag (all reverse-bias points without strong generation; K12 forward
  continuity 1e-12..5e-8). D7: `delta_eps: first_order` default, `exact` option (rib dn_eff difference ~1e-4
  relative). D8: `meshCheck` run option; rib G6 escape clause removed (C change 7.2e-13 then 2.6e-13 F/m). D10:
  non-Neumann boundaries rejected.
- D11: `CrossSection.farScale` (set to the user meshScale by runConfig, runModeOnly and runSemiconductor; 1 when unset):
  default far-field cap (diag / 12) x farScale. Regression: 96 meshes (all parseable configs and alt geometries at
  build scale 1 and 2, i.e. the P2 default) bitwise identical to the HEAD section.mjs at meshScale 1 (8 configs do
  not parse for unrelated missing RF permittivity or shared electrode edges). meshScale != 1 runs now coarsen / refine
  the default far field too (K2-K6 at meshScale 2 still within their reference budgets). Wheeler recess sections
  (stages.mjs, not in this lane) keep farScale 1.
- Schema mapping for the references: bare-face segment contacts (`contacts[].name + segment`), geometries without
  metal (`electrodes: []` accepted when a semiconductor block is present), `poisson_domain: semiconductor` (Si-only
  C'). Engine configs of K10-K12 are generated from the case files (`engine/tests/semi-cases.mjs`).
- D3 gates in `test:reference` (15/15): K10 V_bi (1e-15) and C'(V) (budget 1.6e-4); K10 forward 0.3 V D1 identity;
  K12 J, centre and i-mean densities at 0.5-1.0 V (budgets 3.2e-4, 2.5e-4 / 2.3e-4, 2.3e-3 / 5e-4); K11 (FULL) Si-only
  C' (1.3e-3), oxide C' secondary (2e-3), alpha (5e-4), dn_eff / VpiL (1.3e-3), d alpha (1.5e-3), both plasma
  models. Measured at the test meshes: K11 Si-only C' -1.2e-4..-1.6e-3 (meshScale 1), -1.0e-4..-7.1e-4 (0.7); dn_eff
  -1.0e-3..+1.1e-4 (1), -1.1e-3..+1.9e-4 (0.7); alpha -2.4e-3..-3.9e-3 (U 5-8e-3); oxide C' +1.2e-4..+1.5e-3 (1),
  +5e-4..+1.0e-3 (0.7) not converging toward the reference (open). K12 at meshScale 0.5 within U everywhere.
- Integration: `semiconductor` in STAGES / IMPLEMENTED_STAGES / schema chain enum, stageErrors check; runConfig
  dispatch (runs alone, config targets not_evaluated, `--section` honoured); store datasets `semi`, `semi:<k>` with
  13 `semi.*` variables (SI units, P1); semiconductor targets honour `comparable`, `vpi_convention`, `reference`;
  Nedeljkovic Table 1 all 27 rows (1.3-14 um, read at 4x) with the caption density limits as flags; row tolerance
  0.05 um (1.97 um -> 2.0 um row, labelled). `perLength` C', R', flags per bias.
- CLI: `node engine/cli.mjs sims/han2023/config.yaml --stages semiconductor` (7 biases, 3 targets not_evaluated as
  comparable: false), `sims/anjali2025/config.yaml` (dn_eff(5 V) 8.98e-5 vs 1.1e-4 fail, VpiL 4.32 vs 3.17 fail;
  20.2 s, 44k nodes; exit 2 = failing targets).
- Suites: `npm test` 310 tests, 307 pass, 0 fail, 2 skipped, 1 todo (D5 pre-existing); log
  `t4semi/engine-test-20261016T010717.log` (scratchpad). P1: rib (21.3k semiconductor / 30.3k nodes) DD solve per 1 V
  step 396-588 ms (758 ms for a 2 V step), with C' and R' ~1.0 s.
- Edits outside the listed round-2 paths: `engine/schema/sim.schema.json` chain enum + `$defs/semiconductor` (needed
  for the schema contract test after adding the stage; my own def block). Not mirrored in the shared schema
  `$defs/geometry`: `electrodes: []` for semiconductor configs.

## Round 3 plan (2026-10-16 01:40 PDT): round-2 audit R1-R11, config keys for the S7 x S8 response

Input: `DevLog/audits/simulator-s8-round2-audit-2026-10-16.md`. Write paths as round 2 plus
`engine/schema/sim.schema.json` (semiconductor keys, `geometry.electrodes` minItems only without a semiconductor block)
and, for R7, single atomic edits in `engine/src/stages.mjs` (Wheeler recess and loaded-line cut sections inherit
`farScale`) and `engine/src/mesh-entry.mjs` (preview), recorded here.

- [x] R1 grading: `grade`, `grade_far` (and the explicit `far_edge_um` cap) scale with min(1, farScale) / farScale as
  `grade_corner` already does; meshScale 1 bitwise unchanged (regression over all configs); K11 gate mapping with
  explicit oxide sizes (`max_edge_um`, `far_edge_um` 0.05).
- [x] R2 gate tolerances: tol = U + F * |x(s1) - x(s2)|, F = 1 / (1 - r^p) (Richardson: error of the s1 value from the
  change to the mesh refined by r = s2/s1), p = observed order from three mesh levels (minimum over the quantity's
  rows, floored at 1); margins |diff| / tol reported per gate.
- [x] R3 junction conductance G'(V) = dI/dV from the +-dv/2 states, in the point and in `perLength` (null and flagged
  where the current is below the residual floor).
- [x] R4/R5 small-signal dn_eff/dV and d alpha/dV by central difference over the +-dv/2 states (O(dv^2)); differential
  VpiL from it; push-pull VpiL = lambda / (4 |dn_eff/dV|) only at a reverse DC bias (forward bias < 0), null at 0 V with
  the reason; the grid secant stays the large-signal single-arm VpiL.
- [x] R6 C' only for two contacts of opposite type (error otherwise when `small_signal.capacitance` is on).
- [x] R7 farScale through the mesh preview, Wheeler recessed sections and S7 loaded-line cuts.
- [x] R8 plasma rows: nearest row kept; mismatch bound reported: relative change of dn and d alpha to the neighbouring
  row at N = P = 1e18 cm^-3, scaled by mismatch / row spacing (stated estimate), with the label.
- [x] R9-R11 docs, `continuityRel` null when unresolved, tests for D2 (forced tangent failure), D4 rejection, D5
  (residual rejection), D6 flag semantics; 1D G6 escape removed.
- [x] Orchestrator decision: `line.rf_section` (electrode cross-section of the TWE) and `semiconductor.operating_bias_v`
  (one of the bias values) read by runConfig for eo_response after the semiconductor stage; run options rfSection / biasV
  override.
- [x] Gates: engine suite sequential, test:reference with derived tolerances and margins, han2023 / anjali2025 CLI.

## Round 3 progress (2026-10-16 01:52 PDT)

- R1: `CrossSection` grading `grade`, `grade_far` x min(1, farScale) and the explicit `far_edge_um` x farScale (the
  default cap diag/12 already scaled since round 2). Regression: 96 meshes of all parseable configs at build scale 1
  and 2 bitwise identical to HEAD at meshScale 1. K11 mapping: explicit oxide sizes 0.05 um (`max_edge_um`,
  `far_edge_um`), 38.6k / 52.6k / 77.1k nodes at meshScale 1 / 0.85 / 0.7.
- R2: budgets derived from three-level studies (formula and table in `tests/reference-cases.test.mjs`; data in the
  scratchpad `t4semi/r2/budgets-*.json`): K10 C' 1.9e-4 (p 1.16), K12 J 2.9e-4 (p 1.65), K12 densities 3.0e-4..3.1e-3
  (p 1), K11 Si-only C' 3.9e-3 (p 1.78), oxide C' (electron-integral definition) 3.1e-3, dn_eff / VpiL 4.4e-3 and
  d alpha 5.0e-3 (p 1: the K11 silicon changes are not monotone, so F = 1/(1 - 0.7) = 3.33), alpha 1.0e-3 (p capped at
  2). Margins (max |diff| / tol): K10 C 0.66, K12 J 0.64, K12 densities 0.50-0.51, K11 Si-only C 0.55, oxide C 0.35,
  alpha 0.43, dn_eff 0.40, d alpha 0.36, VpiL 0.40. The K11 silicon quantities change non-monotonically by up to
  2.2e-3 between meshScale 1 / 0.85 / 0.7 (unstructured mesh noise of the junction resolution; finest-level errors
  Si-only C' <= 5.8e-4, dn_eff <= 8.9e-4, oxide C' <= 2.5e-4 vs U 0.5-4.9e-4): an open item (junction-aligned or
  structured refinement would tighten these gates).
- R3: `conductance` {gSPerM, resolved} per point (central dI/dV over +-dv/2; null + `conductance_below_residual_floor`
  when the contact current is not resolved), `perLength.gSPerM`, `perLength.dneffPerV`, branch formula in the note.
  K10 at 0.6 V forward resolved; at 0.3 V the hole current is still below the floor (flagged).
- R4/R5: dn_eff/dV and d alpha/dV from the +-dv/2 states (central, O(dv^2)); differential VpiL from it; push-pull
  lambda / (4 |dn_eff/dV|) only where the DC point is reverse biased (forward bias < 0), null with the reason at 0 V;
  no grid-end stencils remain (the derivative is local). han2023 push-pull at 3.5 V 1.176 V cm (differential 2.352).
- R6: C' requires exactly two contacts of opposite type (error otherwise); test with a third electrode.
- R7: farScale set on the mesh preview (mesh-entry.mjs), the Wheeler recessed sections (constructor option, stages.mjs)
  and the S7 loaded-line cuts and junction-response sections (stages.mjs); single atomic edits, T1 idle.
- R8: nearest row kept; `models.plasmaDispersion.mismatchEstimate` gives the relative change of dn and d alpha to the
  neighbouring row at N = P = 1e18 cm^-3 scaled by |mismatch| / spacing (1.31 um: 1.6 % / 2.6 %; 1.97 um: 2.7 % / 2.7 %).
- R9-R11: stale numerics notes fixed; `continuityRel` null when the current is not resolved; tests for D2 (forced
  tangent failure via `testHooks.tangentFail`: same C' to 1e-6 and the flag), D4 / R4 (push-pull null at 0 V), D5
  (`newton({residualTol: 0})` rejects a converged update), D6 (reverse null / forward resolved), R6, config keys;
  1D G6 escape removed.
- Config keys: `line.rf_section` (validated against the geometries) and `semiconductor.operating_bias_v` (one of the bias
  values) used by `runSemiconductorOnly` for eo_response; run options override. Schema: `$defs/semiconductor`
  (+operating_bias_v), line `rf_section`, `geometry.electrodes` minItems moved to a top-level allOf rule that applies
  without a semiconductor block.
- Gates: `npm test` 317 tests, 314 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5), log
  `t4semi/engine-test-20261016T014909.log`; `npm run test:reference` 15/15 (`engine-ref-20261016T015109.log`). CLI:
  han2023 7 biases 4.5 s (23k nodes; 3 targets not_evaluated, comparable: false); anjali2025 20.9 s (44k nodes;
  dn_eff 8.98e-5 vs 1.1e-4 fail, VpiL 4.32 vs 3.17 fail; exit 2). P1 rib (21.3k semiconductor nodes): DD solve 801 ms
  worst (2 V step), about 1.05 s per point with C', G', R' and the small-signal optics.
- Not in this lane: the han2023 target note ("the semiconductor stage does not read comparable") and its provenance
  wording on push-pull are T6 files (sims/han2023).

## Round 4 (2026-10-16 02:05 PDT): UI audit F1, F13 (`DevLog/audits/simulator-s8-ui-audit-2026-10-16.md`)

- [x] Nodal fields `semi.dn_bias` (1) = delta_n(V) - delta_n(V0) and `semi.dalpha_bias` (1/m) = delta_alpha(V) -
  delta_alpha(V0), V0 = `bias.reference_v`, in the basis the dn_eff / d alpha perturbation integrates (absolute basis:
  difference of the nodal fit values; `density_basis: change`: the fit applied to the density change). Zero on the
  reference dataset (to round-off, 1e-19..2e-18 vs core values of 1e-3; final audit A9) and in the oxide. `engine/src/semi/dataset.mjs` (registry with descriptions), stage builders.
- [x] Per-bias-point globals `semi.dn_eff_per_v` (1/V, small-signal central over +-dv/2), `semi.G` (S/m, junction
  conductance per length; NaN below the residual floor, i.e. reverse bias), `semi.operating_bias` (V, DC bias of the
  swept contact at the point). `SEMI_GLOBALS` in dataset.mjs; store registration (`semi.*`, location global; the
  reference dataset `semi` uses the bias point at reference_v); `internals.semi.globalsAt(k)`.
- [x] Tests: semi-rib (units, locations, globals vs stage values, dn_bias = delta_n(V) - delta_n(V0) to 1e-9 on the
  rib, 0 at the reference, dalpha_bias < 0 under depletion), semi-1d-pn (semi.G at 0.6 V forward = stage G').
- Gates: `npm test` 321 tests, 318 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5), log
  `t4semi/engine-test-20261016T020240.log`; `npm run test:reference` 15/15 (`engine-ref-20261016T020422.log`).

## Final cleanup plan (2026-10-16 02:48 PDT): `DevLog/audits/simulator-s7-s8-final-audit-2026-10-16.md` A1-A8

- [x] A1 target `engineConvention` uses the round-3 names (`single_arm_secant_from_reference`,
  `single_arm_small_signal_central_dv`, `push_pull_small_signal_both_arms_reverse_biased`).
- [x] A2 junction G': the terminal dI/dV (G'_t) contains the series path R'; the line model places G'_j || C'_j
  behind R'_j, so the exported junction value is de-embedded, G'_j = G'_t / (1 - R' G'_t) (1/G'_t = R' + 1/G'_j for a
  series R' and shunt G'_j at DC), null + flag when R' G'_t >= 1; G'_t kept as `gTerminalSPerM`. Test: the branch DC
  admittance G'_j / (1 + R' G'_j) reproduces G'_t.
- [x] A3 han2023 / anjali2025 `chain: [semiconductor]`, stale header run comment.
- [x] A4 labels.ts: `metricDiagnostics` code strings go into the code set, not the Diag list.
- [x] A5 engine/README.md semiconductor + S7 stage section; package.json description.
- [x] A6 reference-cases margin comment from the printed run line. A9 wording "zero to round-off".
- [x] A8 explicit `n` with a provenance entry (`provenance.materials.<m>.n`, locator or citation) replaces the library
  dispersion for the semiconductor stage's optical solve (materials.mjs is outside this round's paths, so other stages
  are unchanged); Si index source candidates for 1.3 um listed below for the user.
- [x] Gates: engine suite, test:reference, app test / check / build / smoke.

## Final cleanup progress (2026-10-16 02:52 PDT)

- A1: `compareSemiTargets` reports `engineConvention` from the point's `vpilConventions` (round-3 names); the UI keeps
  its aliases for older results.
- A2: physically correct choice: de-embed. The contact current of the full DD solve contains the access path whose
  resistance is R' (quasi-neutral conduction, depletion shorted); the line model places G'_j || C'_j behind R'_j, so
  at DC 1/G'_t = R' + 1/G'_j. `conductance.gSPerM` = G'_j = G'_t / (1 - R' G'_t) (exported in `perLength.gSPerM` and the
  store global `semi.G`), `gTerminalSPerM` = G'_t, `rTimesGTerminal`; R' G'_t >= 1 gives null and the flag
  `junction_conductance_not_deembeddable`. Test: G'_j / (1 + R' G'_j) = G'_t to 1e-12 (1D forward 0.6 V). C' needs no
  de-embedding at the quasi-static limit (the series R' carries no charge).
- A3: han2023 and anjali2025 `chain: [semiconductor]`; header run lines now `node engine/cli.mjs ... --stages
  semiconductor` (T6 files, edited at the orchestrator's request).
- A4: labels.ts collects the `metricDiagnostics` code strings into the code set (no Diag entries without a code).
- A5: engine/README.md S8 paragraph (stage, CLI, config keys, perLength, datasets, references); package.json description.
- A6: margin column of the reference-cases budget table from the printed run line (K12 J 0.64, K11 d alpha 0.36,
  alpha 0.43). A9: dn_bias "zero to round-off" wording.
- A8: in the semiconductor stage an explicit `materials.<m>.n` with a provenance entry (`provenance.materials.<m>.n` or
  `provenance.materials.<m>`, locator or citation) replaces the library dispersion for the optical solve (result
  `optical.explicitIndexOverridesDispersion`); without provenance it is an error. Other stages keep the library-anchored
  behaviour (materials.mjs outside this round). anjali2025 (n 3.475 with provenance, 1550 nm): unchanged numbers at
  its single wavelength. Test: rib at 1310 nm with an explicit test-input n runs (1.3 um row, mismatch label).
- A8 source candidates for a silicon dispersion entry covering 1.26-1.36 um (identity checked on Crossref
  2026-10-16 with a generic User-Agent; the wavelength coverage and the tabulated form must be confirmed from the
  papers; not read, not used): H. H. Li, "Refractive index of silicon and germanium and its wavelength and temperature
  derivatives", J. Phys. Chem. Ref. Data 9, 561-658 (1980), doi 10.1063/1.555624; B. J. Frey, D. B. Leviton,
  T. J. Madison, "Temperature-dependent refractive index of silicon and germanium", Proc. SPIE 6273, 62732J (2006), doi
  10.1117/12.672850. For the user to download.
- Gates: engine `npm test` 323 tests, 320 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5), log
  `t4semi/engine-test-20261016T024831.log`; `npm run test:reference` 15/15 with unchanged margins
  (`engine-ref-20261016T025010.log`); app `npm test` 74/74, `npm run check` 0 errors / 0 warnings, `npm run build`
  OK, `npm run smoke` exit 0 with 49 PASS (`app-*-20261016T02*.log`). Nothing left running.
