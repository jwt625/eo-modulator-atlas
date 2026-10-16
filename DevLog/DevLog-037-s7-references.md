---
title: Independent S7 references (traveling-wave EO response, periodic T-rail Bloch cell), cases K8 and K9
date: 2026-10-15
status: done (2026-10-15 23:35 PDT)
owner: T2 S7-REF (fresh-context validation subagent; never reads engine/src or the T1 lane's work)
scope: validation/ (new files only), cases K8 (uniform GSG line response) and K9 (T-rail cell)
---

# DevLog-037: S7 references (T2 S7-REF)

Parent: `DevLog/DevLog-035-s7-s8-tranche-plan.md` (row T2). Conventions: DevLog-028 (reference JSON layout,
logs), DevLog-033 (definitions as strings), `sims/SPEC.md` (line, loading, target conventions only).
Independence: no read of `engine/src`, `engine/tests/s7-*`, DevLog-036.

## Plan (written 2026-10-15 23:24 PDT, before any code or run)

1. Derivation (section "Derivation" below, equation numbers S7.n) from transmission-line theory and the
   Alferness 1982 traveling-wave treatment (IEEE TMTT 30, 1121, Sec. VI.B, eqs. (18)-(22); corrections TMTT 31,
   315 (1983)), and the periodic loaded line of Shin, Sakamoto, Dagli, JLT 29, 48 (2011), eqs. (1)-(5), (8), (12).
2. `validation/scripts/ref_s7.py` (numpy/scipy only, no FEM, no mesh):
   a. uniform TWE response: closed form for gamma(f), Zc(f), Z_S, Z_L, n_g, L (forward + reflected wave);
   b. exact distributed cell ABCD (unloaded and loaded uniform sections), Bloch gamma (branch rule) and symmetric-cell
      Bloch impedance, Bragg frequency of the lossless cell (root of trace = -2);
   c. loaded-line EO response by exact section-by-section integration over the cascade with terminations
      (no Bloch homogenisation), plus the Bloch-homogenised uniform-line estimate for comparison;
   d. bandwidths by root bracketing + brentq on the continuous response (not grid interpolation).
3. Closed-form limit checks, written to `validation/reference/s7-limits.json`: lossless matched velocity-matched
   (flat); pure mismatch (|sinc|); pure loss ((1 - e^-aL)/(aL)); open and short load; zero loading = uniform line
   (Bloch and cascade); Bragg frequency of a lossless cell (uniform cell c/(2 n p); equal-electrical-length cell edge
   in closed form; two-section trace formula vs ABCD); Alferness eq. (21) and the Sec. VI.B loss example re-evaluated.
4. Cases (inputs in the JSON, every number labelled with its class):
   - K8: uniform line with the K4 section (C', C0' from `validation/reference/K4-es-eo.json`), n_g from
     `K2-fem.json` (K4 arm mode = K2 mode per the K4 YAML), conductor loss law alpha = a0 sqrt(f) with a0 a stated
     case input, L = 5 and 10 mm, Z_S = Z_L = 50 ohm. Primary: gamma = alpha(f) + j omega n_RF / c, Zc = Z0 (real);
     variant: RLGC with R'(f) = 2 Z0 alpha(f), G' = 0 (complex Zc).
   - K9: T-rail cell, chen2022-like where `sims/chen2022/config.yaml` has inputs (period, loaded length, L, Z_S, Z_L,
     n_g, alpha0 target); per-length section values are illustrative (labelled), K9a period 50 um; K9b
     illustrative 1000 um period (Bragg inside 0-110 GHz); K9z zero-loading control.
   Outputs `validation/reference/s7-K8.json`, `s7-K9.json` (inputs, definitions, |S21_EO|(f) on a fixed grid,
   bandwidths, Bloch n(f), Z(f), alpha(f), Bragg frequency).
5. Harness replay: a0 = 0.36 dB/cm/sqrt(GHz) at 67 GHz, n_RF 2.18, n_g 2.2, 10 mm, matched; expectation about -1.46 dB.
6. Hardware: one process, nice 10, 1 thread (`validation/run.sh`), seconds of CPU, no server; log
   `logs/ref-s7-YYYYMMDDTHHMM.log`; nothing left running; no scratch files expected.

## TODO

- [x] derivation written (below)
- [x] `scripts/ref_s7.py` + ruff (root venv ruff 0.16.9 with the validation config: clean)
- [x] limit checks -> `reference/s7-limits.json`
- [x] K8 -> `reference/s7-K8.json`
- [x] K9 -> `reference/s7-K9.json`
- [x] harness replay
- [x] results tables, sanity (physics) review (curves plotted in the scratchpad, inspected, deleted)
- [ ] engine (T1) vs these references: after T1 reports; not part of this lane's run

## Progress log

- 2026-10-15 23:24 PDT Read DevLog-035 (T2 row, rules), DevLog-033, DevLog-028 (layout, uncertainty rule), SPEC
  line/loading/target sections, Alferness 1982 (full) + 1983 corrections, Shin 2011 (full), K4/K2 YAML and reference
  JSONs, `sims/chen2022/config.yaml` (inputs only). Plan above.
- 23:26 Derivation written (section below). `validation/scripts/ref_s7.py` written.
- 23:29-23:31 Dry runs (`./run.sh`, nice 10, 1 thread, ~5 s, RSS < 0.25 GB). Fixes found by the checks/probes:
  B1 returned no Bragg for identical sections (trace only touches -1: tangency now detected); Bloch gamma relative
  error 1.5e-9 at low f from arccosh(1 + eps) (now arcsinh(sqrt(B C)), 6e-16); lossless branch folded back above
  the K9b stopband (beta_B p 1 -> 0.87, Re Z_B < 0; rule now Re Z_B > 0); Alferness 1.5 cm unit slip; 50 % point.
  Added a brute-force check (backward propagation from the load + Simpson quadrature of V(z), 401 points/section).
- 23:33 Input-uncertainty propagation for K8 (C', C0', n_g one-at-a-time +U, RSS).
- 23:34 Final run, log `logs/ref-s7-20261015T2334.log` (dry-run and superseded logs removed). Outputs written.
  No process left; scratch subfolder removed. `validation/pyproject.toml` / `uv.lock` show modifications from
  another lane (not this one); `./run.sh` (uv run) uses the project env as found.

## Derivation (independent; equation tags S7.n; sources cited per step)

Phasor convention e^{+j omega t}; z along the electrode, 0 at the RF input, L at the load. Per-length series
impedance Z' = R'(f) + j omega L', shunt admittance Y' = G'(f) + j omega C'.

- S7.1 Telegrapher equations dV/dz = -Z' I, dI/dz = -Y' V; gamma = sqrt(Z' Y') with Re gamma >= 0,
  Zc = sqrt(Z'/Y') with Re Zc >= 0 (Shin 2011 eqs. (1)-(5) for the loaded/unloaded line in this form).
- S7.2 V(z) = V+ [e^{-gamma z} + Gamma_L e^{-2 gamma L} e^{gamma z}], I(z) = (V+/Zc) [e^{-gamma z} - Gamma_L
  e^{-2 gamma L} e^{gamma z}], Gamma_L = (Z_L - Zc)/(Z_L + Zc), Gamma_S = (Z_S - Zc)/(Z_S + Zc).
- S7.3 Source V_s with Z_S: V_s = V(0) + Z_S I(0) gives V+ = V_s [Zc/(Zc + Z_S)] / (1 - Gamma_S Gamma_L e^{-2 gamma L})
  (multiple reflections summed exactly).
- S7.4 A photon entering at t0 is at z at time t0 + n_g z / c. Small-signal phase (linear EO, efficiency kappa per
  volt per length, frequency independent): dphi(t0) = kappa Re{ e^{j omega t0} int_0^L V(z) e^{j beta_o z} dz },
  beta_o = omega n_g / c. This is Alferness 1982 eq. (19)-(20) generalised to a lossy line with a reflected wave.
  Frequency dependence: m(f) = (1/(L V_s)) int_0^L V(z) e^{j beta_o z} dz (dimensionless, V/V). For an MZM in
  push-pull both arms see the same V(z) (sign in kappa); at quadrature bias and small signal the intensity
  modulation is linear in dphi (Alferness 1982 p. 1131, last paragraph of Sec. VII), so |m| is the EO response.
  Neglected: optical loss, RC/carrier dynamics inside the EO material, dispersion of kappa, pad/launch parasitics.
- S7.5 Closed form: phi(x) = (1 - e^{-x})/x (phi(0) = 1), u+ = gamma - j beta_o, u- = gamma + j beta_o:
  m = [Zc/(Zc + Z_S)] / (1 - Gamma_S Gamma_L e^{-2 gamma L}) x [phi(u+ L) + Gamma_L e^{-gamma L} e^{j beta_o L} phi(u- L)].
  First term: co-propagating wave (walk-off (beta - beta_o) and loss); second: reflected wave (walk-off beta + beta_o).
- S7.6 DC normalisation (R'(0) = G'(0) = 0, true for the sqrt(f) laws used here): V(z) = V_s Z_L/(Z_S + Z_L)
  uniformly, m0 = Z_L/(Z_S + Z_L); H(f) = |m(f)| / m0.
- S7.7 dB convention: electrical S21_EO(f) = 20 log10 H (detected RF power proportional to |m|^2; the VNA/LCA
  convention; this is the signed `eo_rolloff_db` target convention of SPEC, negative = drop); optical dB = 10 log10 H.
  bw3_el: first downward crossing of H = 10^(-3/20) = 0.707946; bw6_el: H = 10^(-6/20) = 0.501187, identical to the
  optical 3 dB point (10^(-3/10)). Bandwidths by bracketing on a 0.01 GHz scan and brentq (xtol 1e-9 GHz).
  Attenuation in dB/cm = 20 log10(e) x alpha [Np/cm] = 8.686 alpha (field amplitude; SPEC convention (cc)).

Closed-form limits of S7.5 (checked numerically in `s7-limits.json`):

- L1 alpha = 0, Z_S = Z_L = Zc (real), n_RF = n_g: u+ = 0, H = 1 at every f.
- L2 alpha = 0, matched, n_RF != n_g: H = |phi(2 j x)| = |sin x / x|, x = pi f L (n_RF - n_g)/c (Alferness (20),
  N_m delta = N_m - N_0). bw3_el at x = 1.389349 (H = 0.707946), bw6_el at x = 1.892746 (H = 0.501187); |sin x/x| =
  0.5 at x = 1.895494. Alferness (21) (f L = 2c/(pi N_m delta), "reduced by 50 percent") is x = 2, where
  |sin x/x| = 0.4546, i.e. an approximation of the x = 1.8955 point.
- L3 matched, n_RF = n_g, Zc real, alpha > 0: H = (1 - e^{-alpha L})/(alpha L) (Alferness (22); Alferness writes
  alpha_m = a/4.3, i.e. treats the dB/cm figure with 10 log10(e); this reference uses 20 log10(e), the field-amplitude
  convention of SPEC (cc); the factor-2 difference is stated, not mixed).
- L4 Z_S = Zc, alpha = 0, n_RF = n_g, Gamma_L = +1 (open) / -1 (short): m = (1/2)[1 + Gamma_L e^{-j beta L}
  sin(beta L)/(beta L)]; open: m0 = 1; short: m0 = 0, so only |m| (unnormalised) is defined.

Periodic cell (two uniform sections; exact distributed, no lumped approximation):

- S7.8 Section ABCD: T(gamma, Z, l) = [[cosh gamma l, Z sinh gamma l], [sinh(gamma l)/Z, cosh gamma l]], det T = 1.
- S7.9 Reference cell (symmetric): T_cell = T_u(l_u/2) T_l(l_l) T_u(l_u/2), period p = l_u + l_l, A = D.
  Variant cell T_l(l_l/2) T_u(l_u) T_l(l_l/2) (same gamma_B, different Z_B: Bloch impedance depends on the
  reference plane, the propagation constant does not, since the trace is invariant under cyclic permutation).
- S7.10 Bloch: a forward Bloch wave has [V_n; I_n] = T_cell [V_{n+1}; I_{n+1}] and V_{n+1} = e^{-gamma_B p} V_n, so
  e^{gamma_B p} is an eigenvalue of T_cell; det = 1 gives lambda + 1/lambda = A + D, i.e.
  cosh(gamma_B p) = (A + D)/2.
- S7.11 Branch rule: gamma_B p in {+w, -w} + j 2 pi m, w = arccosh((A + D)/2) (numpy principal value; for |w| < 0.5
  w = arcsinh(sqrt(B C)), exact for A = D since A^2 - B C = 1, avoiding the arccosh(1 + eps) cancellation). Sign: if
  |Re w| > 1e-12 |w| take Re gamma_B > 0 (forward wave decays towards the load); else (lossless passband) take the
  sign with Re Z_B > 0 (forward wave carries positive power; a continuity-only rule is ambiguous at the upper stopband
  edge, where both signs are equidistant from beta_B p = pi - found and fixed during the K9b probe, 2026-10-15 23:31).
  m: Im(gamma_B p) continuous in f from 0+ (ascending frequencies, internal 0.05 GHz grid).
  First passband: beta_B p in [0, pi); first stopband: beta_B p = pi, alpha_B > 0 (lossless).
  n_B = c Im(gamma_B)/omega; alpha_B in dB/cm = 8.686 Re(gamma_B) [Np/cm].
- S7.12 Bloch impedance of the forward wave from the first row of the eigen-equation: A V + B I = e^{gamma_B p} V,
  Z_B = V/I = B / (e^{gamma_B p} - A); for the symmetric cell Z_B = B / sinh(gamma_B p) (sign fixed by S7.11).
- S7.13 Lossless trace (from S7.8 product): cos(beta_B p) = cos t_u cos t_l - (1/2)(Z_u/Z_l + Z_l/Z_u) sin t_u sin t_l,
  t = omega n l / c. Bragg frequency f_B = lowest f > 0 with (A + D)/2 = -1 (lower edge of the first stopband,
  beta_B p = pi), lossless sections, root by brentq on a 0.05 GHz scan.
  B1 identical sections: f_B = c/(2 n p). B2 equal electrical lengths (n_u l_u = n_l l_l), rho = (Z_u/Z_l + Z_l/Z_u)/2:
  cos(beta_B p) = 1 - (1 + rho) sin^2 t, so the edge is at sin^2 t = 2/(1 + rho). B3 long-wave limit (second-order
  expansion of S7.13): n_B(0)^2 = c^2 Lbar' Cbar', Z_B(0) = sqrt(Lbar'/Cbar'), bars = length-weighted averages over
  the period (the homogenised line of Shin eqs. (4)-(5), C_tot = C0 + 2 dC).
- S7.14 Loaded-line EO response (exact cascade): section k with start node (V_k, I_k) at z_k:
  V(s) = a_k e^{-gamma_k s} + b_k e^{gamma_k s}, a_k = (V_k + Z_k I_k)/2, b_k = (V_k - Z_k I_k)/2, and
  int_0^{l_k} V(s) e^{j beta_o (z_k + s)} ds = e^{j beta_o z_k} l_k [a_k phi((gamma_k - j beta_o) l_k)
  + b_k e^{(gamma_k + j beta_o) l_k} phi((gamma_k + j beta_o) l_k)].
  m = sum_k eta_k (integral_k) / (V_s sum_k eta_k l_k), eta_k = relative EO efficiency per volt per length of the
  section (case input). Node impedances by backward recursion Z_k = (A_k Z_{k+1} + B_k)/(C_k Z_{k+1} + D_k),
  Z_N = Z_L; V_0 = V_s Z_0/(Z_S + Z_0); forward [V_{k+1}; I_{k+1}] = [[D, -B], [-C, A]] [V_k; I_k], then
  I_{k+1} := V_{k+1}/Z_{k+1} (keeps the backward-wave content exact; stable in stopbands).
  Comparison estimate: S7.5 with gamma_B, Z_B (homogenised), labelled `bloch_homogenised`.
- S7.15 Shin eq. (8)/(12) cross-check: alpha ~ R'/(2 Z_L) with Z_L = sqrt(L'/C_tot) (low-loss, fine period) vs the exact
  Re gamma_B.

## Results (2026-10-15; electrical dB = 20 log10 H, H normalised to DC m0 = Z_L/(Z_S + Z_L))

### Limit checks (`s7-limits.json`; all at round-off)

| Check | Result |
|---|---|
| L1 lossless, matched, velocity matched | max abs(H - 1) = 0 |
| L2 pure mismatch (n_RF 2.0, n_g 2.3, 10 mm) | max abs(H - abs(sinc)) 1.6e-15; bw3_el 44.193744 GHz, bw6_el 60.206303 GHz (closed form = numeric to 1e-12 GHz) |
| L3 pure loss (a0 0.5 dB/cm/sqrt(GHz), 10 mm) | max abs(H - (1 - e^-aL)/(aL)) 2.4e-15; bw3_el 163.328145 GHz (alpha L = 0.735675 Np) both ways |
| L4 open / short load, Z_S = Zc | max abs(m - closed form) 2.3e-15 / 2.3e-15 |
| Zero loading (identical sections, lossy RLGC, 50 ohm terminations, open load) | gamma_B, Z_B rel. 6.6e-16 / 5.5e-16; cascade vs closed form 2.3e-14 (2.4e-14 open) |
| B1 uniform cell c/(2 n p) | 1362.692990910 vs 1362.692990910 GHz (4e-13 rel.) |
| B2 equal electrical lengths (closed-form edge) | 134.35862123 GHz closed form = trace formula = ABCD |
| B3 long-wave limit | n_B(10 MHz) 1.96704274 vs homogenised 1.96704274 (8e-11 rel.); Z_B 56.124861 vs 56.124861 |
| Harness replay (0.36 dB/cm/sqrt(GHz), 67 GHz, n_RF 2.18, n_g 2.2, 10 mm, matched) | **-1.46015 dB** (loss only -1.43175 dB; RLGC variant with complex Zc -1.45840 dB) |
| Alferness (21) for LN (N_m delta = 2, Table I) | 9.543 GHz cm by (21) (x = 2, H = 0.455); exact 50 % point 9.044 GHz cm; paper "9 GHz cm"; 1.5 cm: 6.36 / 6.03 GHz, paper "~7 GHz" |
| Alferness loss example (a0 1 dB/cm/sqrt(GHz), 1.5 cm, 50 %) | 20.87 GHz with a/4.3, 85.16 GHz with a/8.686; paper "~10 GHz": not reproduced by either reading (recorded only) |

### K8: uniform GSG line (K4 section), `s7-K8.json`

Inputs: C' 146.51872 pF/m, C0' 36.95208 pF/m (K4 extrapolated), n_RF 1.991256, Z0 45.33288 ohm, L' 301.106 nH/m,
n_g 2.290849 (K2), a0 0.36 dB/cm/sqrt(GHz) (case input), Z_S = Z_L = 50 ohm. U = RSS of input U (K4 C', C0', K2 n_g).

| Variant | L (mm) | bw3_el (GHz) | bw6_el (GHz) | S21 at 50 GHz (dB) | at 67 GHz (dB) | at 110 GHz (dB) |
|---|---|---|---|---|---|---|
| primary (gamma = alpha + j w n/c, Zc = Z0) | 5 | 69.893 +- 0.017 | 108.303 +- 0.025 | -1.9609 | -2.8331 +- 0.0008 | -6.1912 |
| lossless (a0 = 0) | 5 | 81.996 | 116.967 | -1.3339 | -2.1173 | -5.2862 |
| RLGC (R' = 2 Z0 alpha) | 5 | 69.898 | 108.365 | -1.9503 | -2.8270 | -6.1843 |
| matched (Z_S = Z_L = Z0) | 5 | 76.970 | 112.284 | -1.5384 | -2.3884 | -5.7591 |
| primary | 10 | 32.576 +- 0.005 | 52.441 +- 0.013 | -5.5714 | -9.4956 +- 0.005 | -21.613 |
| lossless | 10 | 40.998 | 58.483 | -4.3601 | -8.1411 | -21.505 |
| RLGC | 10 | 32.669 | 52.471 | -5.5680 | -9.4886 | -21.626 |
| matched | 10 | 36.114 | 54.447 | -5.1342 | -9.0888 | -21.143 |

Per-variant U for every quantity: `variants.<key>.U_from_inputs` (bw3 U 0.005-0.020 GHz, dB at 67 GHz U <= 0.0053 dB).
Closed form vs 1000-section cascade (10 mm, primary): max abs dm 8.6e-14. Velocity mismatch (n_g - n_RF = 0.2996)
dominates: first null of the 10 mm response at f = c/(L dn) = 100.1 GHz.

### K9: T-rail cell, `s7-K9.json`

Inputs (every value labelled in `inputs.provenance`): L' 376.821 nH/m (both sections), C'_u 80.0945 pF/m,
C'_l 160.1891 pF/m (ratio 2, illustrative; C'_avg = 2.16/(52.3 c) from the chen2022 n_RF/Z0 targets),
R' = 433.531 sqrt(f/GHz) ohm/m (both sections, from alpha0 0.36 via Shin eq. (8)), G' = 0, n_g 2.2, L 10 mm,
Z_S = Z_L = 50 ohm. Section lines: n_u 1.646985 / Z_u 68.5908 ohm, n_l 2.329188 / Z_l 48.5010 ohm;
homogenised n 2.16, Z 52.3 ohm.

| Case | p / l_l (um) | f_Bragg lossless (GHz) | c/(2 n p) (GHz) | n_B 67 GHz | alpha_B 67 GHz (dB/cm) | Z_B 67 GHz (ohm) | bw3_el (GHz) | bw6_el (GHz) | S21 at 67 GHz (dB) | at 110 GHz (dB) |
|---|---|---|---|---|---|---|---|---|---|---|
| K9a (chen2022-like) | 50 / 36 | 1298.1716 | 1387.928 | 2.160164 | 2.94666 | 52.2823 - 0.5842j | 184.790 | 347.361 | -1.34926 | -1.92935 |
| K9a, eta_u = 0 | | | | | | | 185.086 | 348.064 | -1.34871 | -1.92786 |
| K9b (illustrative) | 1000 / 720 | 64.90858 | 69.396 | 2.221080 | 16.0427 (stopband) | 6.923 + 29.388j | 63.757 | 66.369 | -6.49641 | -2.01413 |
| K9b, eta_u = 0 | | | | | | | 64.725 | 67.463 | -5.57001 | -2.12616 |
| K9z (zero loading) | 50 / 36 | 1387.92805 | 1387.928 | 2.160135 | 2.94654 | 52.3033 - 0.5849j | 184.164 | 341.648 | -1.34936 | -1.93024 |

Z_B for the unloaded-centred symmetric cell; loaded-centred values in `bloch.Z_B_loaded_centred_*` (K9a 67 GHz:
52.3177 - 0.5854j). K9a/K9z bandwidths lie above 110 GHz and use the sqrt(f) law extrapolated to the 400 GHz scan
limit (model statement, not a device claim). H peaks at 1.00293 near 2.1 GHz (Z_B about 52.5 ohm vs 50 ohm
terminations). Lossless K9b first stopband 64.909 to 74.566 GHz (upper edge from the same trace formula, computed once at 23:35, not stored in the JSON) (beta_B p = pi; Z_B -> 0 at the lower edge for the
unloaded-centred cell); response collapses there and recovers in the second passband.

Checks (all cases): split-independence of gamma_B 7e-16-9e-16 rel.; cascade regrouping 2e-14; brute-force
(backward propagation + Simpson) vs cascade at 10/50/63/67/100 GHz <= 3.5e-12; ABCD half-trace + 1 at f_Bragg = 0;
K9z cascade vs uniform closed form 2.2e-14; Shin eq. (8) alpha 2.94673 vs exact Re gamma_B 2.94666 dB/cm at 67 GHz
(K9a, 2.3e-5 rel.); Bloch-homogenised response vs exact cascade: 0.0045 dB max to 110 GHz (K9a), 4.9 dB at 64 GHz
(K9b: homogenisation fails near Bragg, as expected).

Comparison caveat: K9a lands near the chen2022 measured -1.4 dB at 67 GHz by construction (alpha0, n_RF, Z0 and n_g
were taken from that config's targets); it is not a reproduction of chen2022.

## Limitations

- Model (stated, not tested here): quasi-TEM line, frequency-independent L', C', EO efficiency and n_g; no optical
  loss, no pad/launch parasitics, no RC dynamics in the EO material; small signal, quadrature bias.
- K8 loss law alpha = a0 sqrt(f) is a case input; the primary keeps Zc real (Z0); the RLGC variant shows the size of
  that choice (<= 0.007 dB at 67 GHz, <= 0.10 GHz in bw3).
- K9 per-section values are illustrative (C' ratio 2, equal L', equal R'), anchored to chen2022 targets only through
  the homogenised n_RF, Z0 and alpha0; the K9b period is illustrative. eta weights are illustrative.
- T-rail stem/pad resistance and inductance are not in the cell (Shin eqs. (9)-(11) show the T-rail term is small for
  narrow rails; not quantified here).
- U: no discretisation; numerical agreement between independent evaluations <= 3.5e-12 in m, brentq xtol 1e-9 GHz;
  K8 carries the propagated K4/K2 input U. K9 inputs are exact by definition (no U).

## Files

- `validation/scripts/ref_s7.py` (new): closed form (S7.5), ABCD/Bloch (S7.8-S7.13), cascade (S7.14), brute-force
  check, bandwidths, cases; `./run.sh scripts/ref_s7.py [--dry-run]`.
- `validation/reference/s7-limits.json`, `s7-K8.json`, `s7-K9.json` (new): definitions, inputs with provenance,
  |S21_EO| (H, el/opt dB, complex m) on the fixed grid 0.1, 0.5, 1..110 GHz (1 GHz step), bandwidths, Bloch n_B,
  alpha_B, beta_B p, Z_B (two cell references), lossless n_B/alpha_B, Bragg frequency, checks.
- `logs/ref-s7-20261015T2334.log`.
