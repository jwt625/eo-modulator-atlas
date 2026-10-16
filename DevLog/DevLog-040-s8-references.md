---
title: S8 independent references for silicon PN/PIN phase shifters (DEVSIM + own 1D drift-diffusion + plasma dispersion + vector FEM)
date: 2026-10-15
status: round 2 done (2026-10-16 00:41 PDT), audit Q1-Q9 applied; values in the Round 2 section supersede round 1
owner: T5 S8-REF (fresh-context validation subagent; never reads engine/src or the T4 lane's work)
scope: validation/ (new files only; devsim added to pyproject/uv.lock), cases K10, K11, K12, reference JSONs s8-*.json
---

# DevLog-040: S8 references (T5 S8-REF)

Parent: `DevLog/DevLog-035-s7-s8-tranche-plan.md` (row T5, rules). Conventions: `DevLog/DevLog-028-open-source-references.md`
(round-2 uncertainty rule, `eoref.util.richardson`), `DevLog/DevLog-033-eo-overlap-references.md` (`run_guarded.sh`,
1.4 GiB watchdog). Independence: no read of `engine/src` or of the T4 lane's files (DevLog-039, `engine/src/semi/`).
Allowed engine read: `engine/data/materials.json` (static eps of Si and SiO2, Si/SiO2 Sellmeier via `eoref.materials`).

## Plan (written 2026-10-15 23:31 PDT, before any code or run)

### Tools

- DEVSIM 2.11.0 (PyPI wheel cp39-abi3 macOS arm64, uploaded 2026-08-15). License checked in the installed
  dist-info: Apache-2.0 (`licenses/LICENSE`, `NOTICE`: Copyright 2013-2023 DEVSIM LLC); the wheel bundles UMFPACK 5.1 / AMD
  under LGPL-2.1 (dynamically loaded `libumfpack_lgpl.dylib`), BLAS/LAPACK from the system (Accelerate liblapack).
  Docs read: the API docstrings of the installed module and the bundled `python_packages/simple_physics.py`,
  `simple_dd.py`, `model_create.py` (Scharfetter-Gummel edge currents `B(vdiff)`, ohmic contact equations, SRH form,
  continuous potential interface). Those modules hard-code their own constants (q = 1.6e-19, eps_si = 11.1, constant
  mobility), so the physics is written here as own DEVSIM node/edge models (`eoref/semi_devsim.py`) with the constants
  below; only `model_create` helpers and the DEVSIM `B()` / `dBdx()` functions are reused.
- Own independent 1D drift-diffusion solver (`eoref/dd1d.py`, numpy/scipy): box method, Scharfetter-Gummel fluxes,
  Newton on (psi, ln n, ln p) with damping and bias ramping. Same discretisation family as DEVSIM, written from the
  equations; at equal grids the two must agree to solver tolerance (implementation check), and both are extrapolated.
- gmsh (via `eoref.geom`) for the optical meshes; vector FEM N2/P2 `eoref.fmode` for the TE0 mode. The DEVSIM 2D meshes use
  the DEVSIM tensor-product mesher (`create_2d_mesh`): every region is a rectangle, the mesh lines contain all region
  edges and doping steps, and the right-triangle split makes the box-method control volumes the dual rectangles,
  so doping steps can be placed exactly. Stated deviation from "gmsh for meshes": gmsh is used for the optics only.

### Models and constants (every coefficient with a locator; read by this lane from the PDFs)

- Constants: SI 2019 exact q = 1.602176634e-19 C, k_B = 1.380649e-23 J/K; eps0 = 8.8541878188e-12 F/m (CODATA 2022).
  T = 300 K, V_t = k_B T / q.
- Static permittivity: Si 11.7, SiO2 3.9, from `engine/data/materials.json` (`eps_r`, secondary source Zhu et al.,
  Adv. Opt. Photon. 13, 242 (2021), Table 1), stated in the case files as inputs.
- n_i = 1.00e10 cm^-3 at 300 K: Sproul and Green, J. Appl. Phys. 70, 846 (1991), Introduction p. 846, Table II p. 852
  ("1.00(3)" x 10^10 cm^-3, saturation-current method), conclusions p. 853 (the abstract gives no number); used as a
  constant (no temperature model needed at 300 K).
- Statistics: Boltzmann; complete ionisation; no bandgap narrowing; no Auger; no carrier-carrier scattering.
- Mobility: Masetti, Severi, Solmi, IEEE TED 30, 764 (1983). Electrons eq. (1) p. 765, phosphorus column of Table I
  p. 766: mu_0 68.5, mu_max 1414, mu_1 56.1 cm^2/Vs, C_r 9.20e16, C_s 3.41e20 cm^-3, alpha 0.711, beta 1.98.
  Holes eq. (4) p. 767 (mu_p = mu_0 exp(-P_c/N) + mu_max/(1+(N/C_r)^alpha) - mu_1/(1+(C_s/N)^beta)), boron column of
  Table I: mu_0 44.9, mu_max 470.5, mu_1 29.0 cm^2/Vs, C_r 2.23e17, C_s 6.10e20, P_c 9.23e16 cm^-3, alpha 0.719, beta 2.00
  (in the scan the boron alpha middle digit and the last digit of beta are partly lost; the visible glyphs are read
  as 0.719 and 2.00). N = N_A + N_D (total doping, standard TCAD use; the paper's footnote 1 p. 767 notes the fits are in
  carrier density and warns about compensation). Low-field only; Caughey and Thomas, Proc. IEEE 55, 2192 (1967),
  Table II p. 2193 (v_m 1.1e7 / 9.5e6 cm/s, E_c 8e3 / 1.95e4 V/cm, beta 2 / 1 for electrons / holes) is used only as a
  post-hoc check of the field-reduction factor in K12. Edge mobility = mean of the two node values.
- SRH: Shockley and Read, Phys. Rev. 87, 835 (1952), eq. (4.4) p. 837 divided by C_n C_p, with tau_p0 = 1/C_p,
  tau_n0 = 1/C_n eq. (5.4) p. 838 (C already contains the trap density): U = (n p - n_i^2) / (tau_p (n + n_1) + tau_n (p + p_1)), midgap trap n_1 = p_1 = n_i. Lifetimes
  are case inputs (illustrative).
- Plasma dispersion at 1550 nm:
  a. Soref-Bennett coefficients as quoted by Reed et al., Nat. Photonics 4, 518 (2010), p. 519:
     dn = -(8.8e-22 N_e + 8.5e-18 N_h^0.8), d alpha = 8.5e-18 N_e + 6.0e-18 N_h (cm^-3, cm^-1). Soref and Bennett,
     IEEE JQE 23, 123 (1987), give the underlying curves (Figs. 11, 14, 15) and fitted slopes at 1.55 um of 0.818 (holes)
     and 1.04 (electrons) on p. 126; the numeric coefficients are not printed in the 1987 text, so the locator is Reed 2010.
  b. Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171 (2011), 1550 nm fits: PDF needed. Fetch attempts on
     2026-10-15 (>= 5 s apart): IEEE stamp page -> "Unable to Load Page", IEEE document page -> empty body,
     eprints.soton.ac.uk -> "Ensuring the security of your connection" (anti-bot), web.archive.org -> "Temporarily
     Offline"; stopped per the anti-bot rule. The code takes the coefficients from a table that stays empty until the PDF
     is read; the column is reported as pending otherwise. `references/_inbox/` is re-checked before the final run.
     Update 23:54: another lane placed `references/_inbox/nedeljkovic2011.pdf` (identity checked: title, authors, DOI on
     p. 1); coefficients read from the rendered Table 1 p. 1178, row 1.55 um: d alpha = 8.88e-21 N_e^1.167 +
     5.84e-20 N_h^1.109, -dn = 5.40e-22 N_e^1.011 + 1.53e-18 N_h^0.838 (eqs. (4), (5) p. 1175). Fit-validity limits in the
     paper (p. 1174-1175) apply only at lambda >= 8-11 um.
  Material change: d eps_r = 2 n_Si (dn + i kappa), kappa = lambda d alpha / (4 pi) (first order in dn, kappa).

### Definitions

- Plasma index change at bias V: dn_Si(x, y; V) = f(N_e(V), N_h(V)) - f(N_e(0), N_h(0)) with f the absolute-density fit
  (primary). Secondary: f applied to the density changes (sign-preserving |dN|^p), reported for comparison only.
- Modal: complex dn_eff = int E* . d eps_r . E dA / (4 P') (first-order, `eoref.fmode`), d alpha_mode =
  (4 pi / lambda) Im(dn_eff); absolute free-carrier modal loss alpha(V) from f(N(V)) alone; dB/cm = 10 log10(e) alpha.
- VpiL(V) = |V| lambda / (2 |Re dn_eff(V)|), single arm, V = applied junction voltage (V_pn = V_p - V_n <= 0).
- C'(V): quasi-static small-signal junction capacitance per unit length (2D) or area (1D):
  C' = q |d N_e,tot / dV|, N_e,tot = integral of n over the device (electron charge supplied by the n contact;
  equals the hole integral by neutrality), central difference dV = 2 mV (check 4 mV; plan value 5 mV changed in the
  pilots, see 23:45).
- K10 closed forms: V_bi = V_t ln(N_A N_D / n_i^2); depletion approximation W = sqrt(2 eps (V_bi - V) / q (1/N_A + 1/N_D)),
  C' = eps / W; and the variant with V_bi - V - 2 V_t.

### Cases (validation/cases/K10.yaml, K11.yaml, K12.yaml; schema `eo-atlas.validation.semi/v1`, stated in each header)

- K10: 1D abrupt Si PN, N_A = 1e17 (p side), N_D = 5e17 cm^-3 (n side), 1 um each side, ohmic contacts at both ends,
  300 K; V_pn = 0 to -4 V in 0.5 V steps. Outputs V_bi, W, C'(V) closed form; DEVSIM and own 1D DD C'(V).
- K11: lateral PN rib in SOI (illustrative case inputs): Si rib 500 nm wide, 220 nm total height, slab 90 nm, BOX 2 um,
  SiO2 cladding 2 um above the rib top; p (x < 0) 5e17, n (x > 0) 5e17 cm^-3 uniform, junction at the rib centre x = 0;
  p+ for x <= -1.25 um and n+ for x >= +1.25 um (1.0 um from the rib edges), 1e20 cm^-3; ohmic contacts on the slab end
  faces at x = -2.5 / +2.5 um; oxide is a Poisson-only dielectric with zero-flux outer boundaries (substrate not modelled).
  1550 nm TE0. V_pn = 0 to -4 V in 0.5 V steps: C'(V) (with oxide; Si-only variant), carrier densities (cuts and
  integrals), dn_eff(V), d alpha(V), alpha(V), VpiL(V) with the Soref-Bennett (Reed 2010) column and the Nedeljkovic 2011
  column (if the PDF is available).
- K12: 1D PIN: p+ 1e19 (0.5 um) / i (p-type 1e15, 1.0 um) / n+ 1e19 (0.5 um), tau_n = tau_p = 1 ns (illustrative),
  forward V_pn = 0.5 to 1.0 V in 0.1 V steps: J (A/cm^2), mean and centre n, p in the i region; DEVSIM and own 1D DD;
  post-hoc Caughey-Thomas field factor in the i region.

### Convergence and uncertainty

- DEVSIM / dd1d mesh levels: 4 levels with h ratio ~1.41 in the junction zones; round-2 rule on the three finest
  (p_formal 2 for the box method with exact doping steps). K11 optical part: refined optical box over the junction zone
  (h_j 10 / 7 / 5 nm) at the finest DEVSIM level, plus an h_core 40 -> 28 nm check; U_total = U_devsim + U_optical
  (linear sum, conservative). Every extrapolated entry also carries `f_finest`.
- Gates: K10 DEVSIM vs dd1d on identical grids (agreement to solver tolerance); K10 DD vs closed forms (expect the
  2 V_t variant within ~1 %); equilibrium V_bi from DEVSIM contacts equals the closed form; K12 current continuity and
  sum J_n + J_p constant; plasma functions reproduce Reed's worked number (5e17 cm^-3 -> -1.66e-3 at 1.55 um, p. 519).

### Outputs

- `validation/reference/s8-K10.json`, `s8-K11.json`, `s8-K12.json`: inputs (case sha256), models with locators,
  definitions, levels, values, extrapolated values with U, versions, run time, ISO date.
- Logs `logs/ref-s8-<case>-YYYYMMDDTHHMM.log`. Scratch: session scratchpad `t5-s8ref/` only.
- Hardware: one process at a time, `run_guarded.sh` (scripts named `scripts/ref_s8_*.py` so the watchdog matches),
  RSS_LIMIT_KB 1468006, nice 10, BLAS threads 1; fresh process per mesh level.

## TODO

- [x] read DevLog-035/028/033, Soref 1987, Masetti 1983, Caughey 1967, Shockley 1952, Sproul 1991, Reed 2010
- [x] Nedeljkovic 2011 PDF (own fetch blocked; read from `references/_inbox/nedeljkovic2011.pdf` placed by another lane)
- [x] devsim 2.11.0 added (license checked)
- [x] cases K10-K12 (YAML)
- [x] eoref/semi.py, eoref/plasma.py, eoref/dd1d.py, eoref/semi_devsim.py; scripts/ref_s8_1d.py, scripts/ref_s8_k11.py, run_s8.sh
- [x] gates (dd1d vs DEVSIM, closed forms, Reed worked number) in pilots
- [x] K10 run, K12 run, K11 run (pilot first), convergence
- [x] reference JSONs, results tables, sanity checks
- [x] scratch cleaned, no process left
- [x] fresh-context audit of this lane (O5): DevLog/audits/simulator-s8-ref-audit-2026-10-16.md
- [x] round 2: audit Q1, Q2, Q3, Q8, Q9 and the Masetti [13] check
- [ ] user download: Thurber et al., J. Electrochem. Soc. 127, 2291 (1980), doi 10.1149/1.2129394 (paywalled)
- [ ] engine (T4) vs these references

## Progress log

- 2026-10-15 23:20 PDT Read DevLog-035 (row T5), DevLog-028 (round-2 rule), DevLog-033 (watchdog), validation code.
- 23:21-23:25 Nedeljkovic 2011 fetch attempts (IEEE, Southampton eprints, Wayback) blocked; stopped (see plan b).
- 23:26 `uv add devsim==2.11.0` in validation/ (pyproject +1 line, uv.lock +13 lines; no other lock entry changed).
- 2026-10-15 23:31 PDT Plan above.
- 23:32-23:41 Wrote `eoref/semi.py` (constants, Masetti, doping, grids), `eoref/plasma.py`, `eoref/dd1d.py` (own 1D DD),
  `eoref/semi_devsim.py`. Gate: `plasma.check_reed_example()` = -1.666e-3 (Reed p. 519: -1.66e-3). Masetti at 5e17:
  mu_n 379.1, mu_p 206.2 cm^2/Vs. dd1d K10 pilot: C'(V) within 4e-5 of the 2 V_t depletion formula.
- 23:38 Finding: in the (n, p) formulation the flux has a floor of ~1e-10..1e-8 A/cm^2 (cancellation of ~4e6 A/cm^2
  SG terms); the reverse generation current (~2e-9 A/cm^2 for K10) is below it, so no reverse currents are reported.
  C' (from carrier integrals) and the forward K12 currents (>= 0.4 A/cm^2) are unaffected.
- 23:40 DEVSIM 2D mesher test: a region name added twice keeps only the first box, and nodes shared by three regions
  are tied by one interface only (the oxide node at a rib corner would float). Switched to an own tensor-grid
  triangulation passed to `create_gmsh_mesh` (one L-shaped silicon region, one oxide region, one interface).
- 23:41 DEVSIM vs dd1d, K10 identical grid (501 nodes): max relative n difference 4e-14, N_e,tot equal to 11 digits.
- 23:43 PyYAML reads `1.0e17` as a string (YAML 1.1 needs a signed exponent): case files use `e+NN`.
- 23:45 K10/K12 pilots: C' central-difference error at dV 5 mV ~5e-6 relative -> dV 2 mV and U_dV added; K12
  i-region mean redefined over the central 0.8 um (the step nodes carry O(h) charge); Caughey-Thomas check uses the
  quasi-Fermi gradient (the built-in junction field is not a driving force).
- 23:47 K11 2D: DEVSIM per-equation relative error is ill-defined at psi ~ 0 V (symmetric junction): a constant 10 V
  gauge offset on all contacts (`semi_devsim.POT_OFFSET`); carrier updates floor at ~1.6e-12 relative in 2D ->
  rel 1e-10 (C' with rel 1e-10 equals the |x| <= 1 um integral to 5e-10).
- 23:48 Bug found and fixed before any reference run: region callback received cm, rectangles in um (all y > 0 cells
  were silicon). Oxide/silicon potential continuity verified at all 352 interface pairs except the 4 oxide nodes at the
  contact corners (DEVSIM keeps contact nodes out of interfaces): 4.6 mV offset, 2.5 um from the junction.
- 23:51 K11 pilot (2 ES levels, 2 optical levels, 3 biases, 30 s): C'(0) 4.38 pF/cm with oxide, 3.42 Si-only;
  n_eff 2.56909; VpiL(-2 V) 1.264 V cm (Soref-Bennett); first-order dn_eff vs direct re-solve at -4 V: -1.3e-4 relative.
- 23:52 First K=71 ES run killed by the watchdog (1.52 GB): oxide grading coarsened (ratio 1.3, h <= min(60 h_A,
  0.25 um)), outer slab ratio 1.25 to 8 h_A; `graded_line` rewritten (old version left a short interval next to
  h_max ones, spacing jumps up to 10x; now <= 1.25 x / 1.3 y). K=71: 36.4k nodes, 1.32e9 B peak, 31 s for 2 biases.
- 23:55 Full serial run started (`run_s8.sh`, TMPDIR = session scratchpad `t5-s8ref/tmp`).
- 23:55-23:59 `run_s8.sh` (serial, `run_guarded.sh`, RSS_LIMIT_KB 1468006, nice 10, 1 thread, TMPDIR = session
  scratchpad): K10 33 s (peak 362 MB), K12 12 s, K11 167 s (ES peaks 0.42-1.36e9 B, optics 0.56-1.43e9 B). No watchdog kill.
- 23:59 Nedeljkovic coefficients were active in this run. Post-run fixes: K12 Caughey-Thomas check restricted to the
  central i region (the device-wide max of the quasi-Fermi gradient, ~8e6 V/cm, came from minority carriers in p+/n+
  and the contact pinning); K11 cut arrays wrote NaN for the 10 + 10 rib-height cut points that lie in oxide (not strict
  JSON) -> null; all writers use `allow_nan=False`; masked-interpolation counts recorded (all 0).
- 2026-10-16 00:00-00:03 Re-run K12 and K11 (`run_guarded.sh`, same settings; K11 values identical to the 23:59 run,
  deterministic). Peaks: ES 1.29e9 B, optics 1.44e9 B (1.34 GiB, below the 1.468e6 KiB watchdog limit).
- 00:04 Results below. Logs: `logs/ref-s8-K10-20261015T2355.log`, `logs/ref-s8-K12-20261016T0000.log`,
  `logs/ref-s8-K11-20261016T0000.log` (earlier `ref-s8-*` logs are pilots and the superseded 23:56 runs).

## Results round 1 (2026-10-16 00:04; superseded by Round 2 below for K11 C' with oxide, K12 means, all U)

Machine-readable: `validation/reference/s8-K10.json`, `s8-K11.json`, `s8-K12.json` (case sha256 prefixes K10
8724d8b574e122a1, K11 e1c44fdd80496468, K12 88f76ed46f7c3c3c, equal to the current case files).

### K10 1D abrupt PN (N_A 1e17, N_D 5e17 cm^-3), DEVSIM primary, dd1d identical to round-off

K10 V_bi closed form 0.874977199 V, DEVSIM contact psi difference 0.874977199 V
| V_pn (V) | C' DD (fF/um^2) | depletion | depletion - 2 V_t | DD / (dep - 2V_t) - 1 | W_dep (um) | DEVSIM vs dd1d |
|---|---|---|---|---|---|---|
| 0.0 | 0.91656982 +- 2.7e-05 | 0.889034 | 0.916526 | 4.8e-05 | 0.11652 | 3e-12 |
| -0.5 | 0.72292392 +- 1.4e-05 | 0.709201 | 0.722923 | 1.1e-06 | 0.14607 | 4e-12 |
| -1.0 | 0.61587278 +- 8.5e-06 | 0.607322 | 0.615873 | 2.1e-08 | 0.17058 | 1e-11 |
| -1.5 | 0.5455904 +- 6e-06 | 0.539619 | 0.545590 | -3.1e-08 | 0.19198 | 6e-12 |
| -2.0 | 0.49492615 +- 4.5e-06 | 0.490456 | 0.494926 | -3.9e-08 | 0.21122 | 6e-12 |
| -2.5 | 0.45617747 +- 3.6e-06 | 0.452670 | 0.456177 | -4.2e-08 | 0.22885 | 7e-12 |
| -3.0 | 0.42530373 +- 3e-06 | 0.422457 | 0.425304 | -4.1e-08 | 0.24522 | 7e-12 |
| -3.5 | 0.39995443 +- 2.5e-06 | 0.397584 | 0.399954 | -4.0e-08 | 0.26056 | 2e-11 |
| -4.0 | 0.37865694 +- 2.1e-06 | 0.376644 | 0.378657 | -3.8e-08 | 0.27505 | 8e-12 |

C' in fF/um^2 (= 1e-7 F/cm^2 x 1e7). Levels h = 5.62 ... 1.00 nm (6 grids), observed order 2.02-2.03 on every bias.
The drift-diffusion C' equals the 2 V_t-corrected depletion formula to 4.8e-5 at 0 V, 1.1e-6 at -0.5 V and <= 4e-8 for
V <= -1 V (inside U); the plain depletion formula is 3.1 % low at 0 V, 0.5 % at -4 V. dV check: |C(4 mV) - C(2 mV)|/3
<= 7.4e-7 relative (in U). Electron- and hole-integral C' agree to <= 3.4e-12.

### K12 1D PIN forward bias (p+ 1e19 / i p-1e15 1 um / n+ 1e19, tau 1 ns), DEVSIM primary

| V_pn (V) | J (A/cm^2) | n centre (cm^-3) | p centre | n mean central i | p mean central i | DEVSIM vs dd1d J | CT min factor n/p |
|---|---|---|---|---|---|---|---|
| 0.5 | 0.4476298 +- 4.9e-05 | 3.09335e+13 +- 3.8e+09 | 7.913077e+14 +- 9e+10 | 1.460346e+14 +- 1.8e+12 | 9.270221e+14 +- 4.2e+12 | 6e-07 | 1.00000 / 0.99950 |
| 0.6 | 6.208362 +- 0.00086 | 6.668364e+14 +- 1.7e+10 | 1.650668e+15 +- 6.8e+09 | 7.877225e+14 +- 3.2e+12 | 1.697437e+15 +- 5e+12 | 2e-07 | 0.99999 / 0.99826 |
| 0.7 | 52.08479 +- 0.0056 | 6.514822e+15 +- 1.5e+11 | 7.512626e+15 +- 1.5e+11 | 6.58229e+15 +- 1.4e+13 | 7.566358e+15 +- 1.6e+13 | 2e-08 | 0.99999 / 0.99631 |
| 0.8 | 378.6735 +- 0.031 | 4.690357e+16 +- 1e+12 | 4.790141e+16 +- 1e+12 | 4.729178e+16 +- 1e+14 | 4.828984e+16 +- 1e+14 | 2e-09 | 0.99999 / 0.99557 |
| 0.9 | 2756.317 +- 0.1 | 3.141099e+17 +- 1.8e+12 | 3.151077e+17 +- 1.8e+12 | 3.166963e+17 +- 6.8e+14 | 3.176949e+17 +- 6.8e+14 | 5e-10 | 0.99999 / 0.99534 |
| 1.0 | 21117.08 +- 0.46 | 1.723489e+18 +- 1.2e+14 | 1.724487e+18 +- 1.2e+14 | 1.737647e+18 +- 4e+15 | 1.738646e+18 +- 4e+15 | 3e-11 | 0.99998 / 0.99458 |

Means and sheet densities over the central i region x in [-0.4, 0.4] um (0.1 um from the steps); centre = x = 0 node.
Observed order 1.96-2.08 for J at 0.5-0.9 V, 1.17 at 1.0 V. Terminal-current consistency (anode vs cathode) <= 2.5e-7.
Caughey-Thomas factor (quasi-Fermi gradient, central i region, post-hoc): >= 0.9946, so the low-field-mobility
assumption changes the i-region mobility by <= 0.55 % here. Isothermal, no Auger: at 1 V, J = 2.1e4 A/cm^2 (not a
physical operating point for a real device; kept as a numerical reference).

### K11 lateral PN rib, 1550 nm TE0 (n_eff 2.5690949, TE fraction 0.98615; n_Si 3.477723756, n_SiO2 1.444023622)

C'(V) per unit length (oxide = Poisson dielectric with zero-flux outer boundary at x = +-2.5, y = -2 / +2.22 um;
Si-only = oxide removed):

| V_pn (V) | C' oxide (pF/cm) | C' Si only (pF/cm) |
|---|---|---|
| 0.0 | 4.378909 +- 0.0011 | 3.407145 +- 0.0017 |
| -0.5 | 3.636615 +- 0.00049 | 2.712383 +- 0.00098 |
| -1.0 | 3.211595 +- 0.0002 | 2.320451 +- 0.00061 |
| -1.5 | 2.926346 +- 0.00036 | 2.060544 +- 0.00035 |
| -2.0 | 2.717203 +- 0.00023 | 1.87212 +- 0.00026 |
| -2.5 | 2.555047 +- 7.9e-05 | 1.727548 +- 0.00033 |
| -3.0 | 2.424319 +- 0.00011 | 1.611882 +- 0.00021 |
| -3.5 | 2.315857 +- 0.00017 | 1.516716 +- 0.00013 |
| -4.0 | 2.223864 +- 0.00021 | 1.436761 +- 0.00023 |

Soref-Bennett 1550 nm (Reed 2010 p. 519), primary plasma definition f(N(V)) - f(N(0)):

| V_pn (V) | dn_eff | d alpha (dB/cm) | alpha (dB/cm) | VpiL (V cm) | VpiL secondary def. |
|---|---|---|---|---|---|
| 0.0 | 0 +- 0 | 0 +- 0 | 13.038 +- 0.016 | - | - |
| -0.5 | 3.84435e-05 +- 1.1e-08 | -0.72954 +- 0.0005 | 12.309 +- 0.016 | 1.008 +- 0.0003 | 0.79033 |
| -1.0 | 7.02363e-05 +- 3.8e-08 | -1.3324 +- 0.00064 | 11.706 +- 0.016 | 1.1034 +- 0.0006 | 0.93759 |
| -1.5 | 9.78743e-05 +- 4e-08 | -1.8563 +- 0.00062 | 11.182 +- 0.016 | 1.1877 +- 0.00049 | 1.0471 |
| -2.0 | 0.000122585 +- 4.1e-08 | -2.3243 +- 0.00064 | 10.714 +- 0.016 | 1.2644 +- 0.00042 | 1.1389 |
| -2.5 | 0.000145075 +- 4.4e-08 | -2.7501 +- 0.00066 | 10.288 +- 0.016 | 1.3355 +- 0.0004 | 1.2202 |
| -3.0 | 0.000165798 +- 4.6e-08 | -3.1422 +- 0.00068 | 9.8964 +- 0.016 | 1.4023 +- 0.00039 | 1.2943 |
| -3.5 | 0.000185068 +- 4.8e-08 | -3.5065 +- 0.0007 | 9.5321 +- 0.016 | 1.4657 +- 0.00038 | 1.3634 |
| -4.0 | 0.000203109 +- 5.2e-08 | -3.8475 +- 0.00075 | 9.1912 +- 0.016 | 1.5263 +- 0.00039 | 1.4285 |

Nedeljkovic 2011 1550 nm (Table 1 p. 1178):

| V_pn (V) | dn_eff | d alpha (dB/cm) | alpha (dB/cm) | VpiL (V cm) | VpiL secondary def. |
|---|---|---|---|---|---|
| 0.0 | 0 +- 0 | 0 +- 0 | 11.6 +- 0.015 | - | - |
| -0.5 | 3.37477e-05 +- 9.9e-09 | -0.65563 +- 0.00043 | 10.945 +- 0.015 | 1.1482 +- 0.00034 | 0.95624 |
| -1.0 | 6.16534e-05 +- 3.3e-08 | -1.1972 +- 0.00052 | 10.403 +- 0.015 | 1.257 +- 0.00068 | 1.1128 |
| -1.5 | 8.59088e-05 +- 3.4e-08 | -1.6674 +- 0.00048 | 9.9329 +- 0.015 | 1.3532 +- 0.00054 | 1.2318 |
| -2.0 | 0.000107592 +- 3.5e-08 | -2.0874 +- 0.00051 | 9.513 +- 0.015 | 1.4406 +- 0.00047 | 1.3328 |
| -2.5 | 0.000127323 +- 3.7e-08 | -2.4691 +- 0.00051 | 9.1313 +- 0.015 | 1.5217 +- 0.00045 | 1.4229 |
| -3.0 | 0.000145503 +- 3.9e-08 | -2.8205 +- 0.00051 | 8.78 +- 0.015 | 1.5979 +- 0.00043 | 1.5056 |
| -3.5 | 0.000162404 +- 4.1e-08 | -3.1469 +- 0.00053 | 8.4537 +- 0.016 | 1.6702 +- 0.00042 | 1.5829 |
| -4.0 | 0.000178226 +- 4.4e-08 | -3.4521 +- 0.00056 | 8.1485 +- 0.016 | 1.7394 +- 0.00043 | 1.6561 |

d alpha and alpha are modal power loss changes / absolute free-carrier modal loss (dB/cm); VpiL single arm, V cm.
Secondary definition (fit applied to the density changes) gives 6-22 % lower VpiL (largest at -0.5 V): the choice of
definition matters at this level and must be matched by the engine.
Convergence: ES levels h_A = 10 / 7.14 / 5 / 3.52 nm (Si nodes 2073-14390); optical junction box h_j = 10 / 7.07 / 5 /
3.54 nm; h_core 40 nm (28 nm check: |d dn_eff| <= 1.0e-9). dn_eff U is dominated by the ES series (formal-order
fallback, U_es ~4.9e-8 at -4 V vs U_hj 2.3e-9). C' with oxide converges non-monotonically at some biases (formal
fallback, U <= 2.6e-4 relative); Si-only observed order everywhere.
Sanity: first-order dn_eff vs direct re-solve with element-averaged Re d eps at -4 V: -1.4e-4 relative (second order);
half-density depletion edges in the slab and rib cuts at +-0.03 / 0.06 / 0.08 um for 0 / -2 / -4 V vs 1D x_n (2 V_t)
0.033 / 0.061 / 0.079 um; Si-only C'(0) 3.407 pF/cm vs 1D C'(0) x 0.22 um = 3.408 pF/cm (vertical junction plane);
the oxide adds 0.97 pF/cm at 0 V and 0.79 pF/cm at -4 V (fringe through cladding and BOX, logarithmic in the gap,
domain-dependent: the outer boundary and the missing substrate are case inputs). alpha(0) Soref-Bennett 13.04 dB/cm
vs the hand estimate (8.5e-18 + 6.0e-18) / 2 x 5e17 x Gamma ~ 0.8 -> 12.6 dB/cm.

## Limitations and open items

- Reverse leakage currents are not resolved (flux floor of the (n, p) formulation, see 23:38); none reported.
- 4 oxide nodes at the K11 contact corners are not tied to silicon (4.6 mV offset, 2.5 um from the junction).
- K11 p+/n+ regions at 1e20 with Boltzmann statistics and no bandgap narrowing (stated); they affect only alpha(V) through
  the mode tail and the oxide-fringe part of C'.
- Masetti boron alpha / beta read from a partly damaged scan glyph (0.719, 2.00); mobility does not enter K10/K11
  results (no current at reverse bias), only K12 currents.
- Soref-Bennett coefficients are those printed by Reed 2010 (secondary quotation); the 1987 paper's own 1.55 um slopes
  (0.818, 1.04) differ from the quoted exponents (0.8, 1.0).
- Not done: fresh-context audit of this lane; mapping of the K10-K12 cases to the engine `semiconductor` schema (T4).

## Round 2 (audit DevLog/audits/simulator-s8-ref-audit-2026-10-16.md; orchestrator request 2026-10-16 00:23 PDT)

Plan (00:23-00:27, recorded here after the first diagnostics; no reference file was rewritten before the full run):
Q1 oxide mesh scales with the level and an oxide-halving check enters U; Q2 the zero-flux domain and the gate roles in
K11.yaml, s8-K11.json and a new summary-s8.json, Si-only C' primary; Q3 node-aligned K12 window; Q8 contact placement
and contact-loss fraction in the JSON; Q9 document fixes; Masetti ref. [13] via Crossref; re-run K10, K12, K11.

### Progress

- 00:24 Masetti ref. [13] read from the rendered reference list p. 769: W. R. Thurber, R. L. Mattis, Y. M. Liu,
  J. J. Filliben, "Resistivity-dopant density relationship for boron-doped silicon", J. Electrochem. Soc. 127, 2291-2294
  (1980). Crossref (generic User-Agent, no contact details): doi 10.1149/1.2129394; the IOP PDF link returns an HTML
  page (paywalled) -> listed for the user to download (TODO). The same authors' NBS Special Publication 400-64 (1981),
  Masetti ref. [8], doi 10.6028/nbs.sp.400-64, is open (nvlpubs.nist.gov; fetched to the session scratchpad, deleted
  afterwards): Table 13 (report p. 40), fit of mu_h versus p with eq. (5) mu = A exp(-p_c/p) + mu_max/(1+(p/p_ref)^alpha),
  300 K: A 44.9 +- 1.2, p_c 9.23e16 +- 2.3e16, mu_max 470.5 +- 1.8, p_ref 2.23e17 +- 0.10e17, alpha 0.719 +- 0.013
  (read from the page image). This confirms Masetti's boron mu0, mumax, C_r, P_c and alpha = 0.719. beta 2.00 is
  Masetti's own fit (with mu_1, C_s) and stays a reading of a partly lost glyph; the audit's sensitivity note (Q4: J at
  1.0 V moves 2.7e-3 for alpha +-0.010, <= 6e-6 for beta 2.09) stands.
- 00:27-00:31 Q1 diagnostics (K = 35, biases 0 / -4 V, guarded): oxide far-field spacing 0.343 / 0.171 / 0.086 /
  0.043 um changed C'(-4 V) by -7.2e-16, -5.7e-16, -6.2e-16 F/cm per halving (no convergence). Cause: the geometric
  grading kept a fixed ratio (1.3 in y, 1.25 in x) under refinement, so the graded zones keep h ~ (r - 1) d and never
  refine; a cap change only shifts where they end. Fix: every grading excess scales with the level,
  ratio = 1 + r0 h_A / 10 nm (r0 0.30 y, 0.25 x), oxide far field 32 h_A (no cap), slab outside the rib <= 16 h_A.
  K = 71 then has 52950 nodes; peak 1.40e9 B (an intermediate variant with 61k nodes was killed by the watchdog at
  1.57 GB). Oxide-halving check (U_ox) at K = 50 (the halved oxide at K = 71 would exceed the cap).
- 00:31 Q2: K11.yaml `electrostatics` block (domain x +-2.5, y -2 / 2.22 um, zero normal flux on all edges, no
  substrate, no metal, contacts only on the slab end faces, gate roles); s8-K11.json `comparison_conditions`,
  `gate_roles`, `grid`, `oxide_mesh_check`; new `scripts/summarize_s8.py` -> `reference/summary-s8.json`.
  Q3: 1D levels N = 360/500/720/1000/1420/2000 (multiples of 20: steps and window ends are nodes; asserted).
  Q8: `contact_loss_fraction` = 1 - q int U_SRH dx / J and the contact placement in s8-K10/K12 `definitions.contacts`.
  Q9: Sproul-Green locator (Introduction p. 846, Table II p. 852, conclusions p. 853), Shockley-Read notation
  (tau_p0 = 1/C_p), dV 2 mV in the plan definitions, K11.yaml Nedeljkovic note, Masetti provenance in semi.py and the
  case files. Case sha256 of K10/K11/K12 changed (provenance text and the K11 electrostatics block; no input value).
- 00:34-00:39 `run_s8.sh` (serial, guarded 1.4 GiB, nice 10, 1 thread): K10 37 s, K12 14 s, K11 218 s, summary.
  Peaks: ES 1.336e9 B (K = 71 oxide), optics 1.433e9 B (h_j 3.54 nm), below the 1.468e6 KiB limit; no watchdog kill.
  Logs `logs/ref-s8-K10-20261016T0034.log`, `logs/ref-s8-K12-20261016T0035.log`, `logs/ref-s8-K11-20261016T0035.log`.

### Round 2 results (2026-10-16; value +- U; supersede round 1)

Case sha256 prefixes (round 2): K10 83c735ceba7e1802, K11 043e1f725b44f7d0, K12 f53335d5b7880c6c (equal to the
current case files and recorded in every s8-*.json).

K10 (fF/um^2 = 1e-7 F/cm^2):

| V_pn (V) | C' DD | U | depletion - 2 V_t | DD / (dep - 2 V_t) - 1 |
|---|---|---|---|---|
| 0.0 | 0.91656913 | 2.6e-05 | 0.916526 | 4.7e-05 |
| -0.5 | 0.72292358 | 1.3e-05 | 0.722923 | 6.4e-07 |
| -1.0 | 0.61587257 | 8.2e-06 | 0.615873 | -3.2e-07 |
| -1.5 | 0.54559025 | 5.8e-06 | 0.545590 | -3.0e-07 |
| -2.0 | 0.49492604 | 4.4e-06 | 0.494926 | -2.6e-07 |
| -2.5 | 0.45617738 | 3.5e-06 | 0.456177 | -2.3e-07 |
| -3.0 | 0.42530366 | 2.9e-06 | 0.425304 | -2.0e-07 |
| -3.5 | 0.39995438 | 2.4e-06 | 0.399954 | -1.8e-07 |
| -4.0 | 0.37865689 | 2.1e-06 | 0.378657 | -1.7e-07 |

K12:

| V_pn (V) | J (A/cm^2) | n centre | p centre | n mean central i | p mean central i | contact-loss fraction |
|---|---|---|---|---|---|---|
| 0.5 | 0.4476294 +- 4.9e-05 | 3.093360e+13 +- 3.7e+09 | 7.913053e+14 +- 8.7e+10 | 1.453166e+14 +- 1.6e+11 | 9.254826e+14 +- 1.9e+11 | 0.0001 |
| 0.6 | 6.208341 +- 0.00084 | 6.668368e+14 +- 1.6e+10 | 1.650668e+15 +- 6.6e+09 | 7.865292e+14 +- 1.7e+11 | 1.695646e+15 +- 1.5e+11 | 0.0002 |
| 0.7 | 52.08464 +- 0.0055 | 6.514826e+15 +- 1.5e+11 | 7.512630e+15 +- 1.5e+11 | 6.577423e+15 +- 1.8e+11 | 7.560875e+15 +- 1.6e+11 | 0.0013 |
| 0.8 | 378.6727 +- 0.03 | 4.690360e+16 +- 9.9e+11 | 4.790143e+16 +- 9.9e+11 | 4.725775e+16 +- 1.0e+12 | 4.825511e+16 +- 9.9e+11 | 0.0085 |
| 0.9 | 2756.315 +- 0.098 | 3.141099e+17 +- 1.7e+12 | 3.151078e+17 +- 1.7e+12 | 3.164688e+17 +- 1.7e+12 | 3.174667e+17 +- 1.7e+12 | 0.0528 |
| 1.0 | 21117.09 +- 0.44 | 1.723486e+18 +- 1.1e+14 | 1.724483e+18 +- 1.1e+14 | 1.736420e+18 +- 1.1e+14 | 1.737418e+18 +- 1.1e+14 | 0.2277 |

K11 C' (pF/cm; Si-only = primary gate, oxide = secondary, identical domain only):

| V_pn (V) | C' Si only | C' with oxide | U_mesh / U_dV / U_ox (oxide) |
|---|---|---|---|
| 0.0 | 3.407145 +- 0.0017 | 4.376257 +- 0.0011 | 0.0009 / 3e-06 / 0.0002 |
| -0.5 | 2.712383 +- 0.00098 | 3.634208 +- 0.00045 | 0.0003 / 2e-06 / 0.0002 |
| -1.0 | 2.320451 +- 0.00061 | 3.209338 +- 0.00016 | 2e-06 / 2e-06 / 0.0002 |
| -1.5 | 2.060544 +- 0.00035 | 2.924074 +- 0.00038 | 0.0002 / 2e-06 / 0.0002 |
| -2.0 | 1.872120 +- 0.00026 | 2.715009 +- 0.00048 | 0.0003 / 2e-06 / 0.0002 |
| -2.5 | 1.727548 +- 0.00033 | 2.553023 +- 0.00041 | 0.0003 / 2e-06 / 0.0002 |
| -3.0 | 1.611882 +- 0.00021 | 2.422382 +- 0.00041 | 0.0003 / 2e-06 / 0.0002 |
| -3.5 | 1.516716 +- 0.00013 | 2.313937 +- 0.00048 | 0.0003 / 2e-06 / 0.0002 |
| -4.0 | 1.436761 +- 0.00023 | 2.222042 +- 0.00044 | 0.0003 / 1e-06 / 0.0002 |

K11 optics, Soref-Bennett (Reed 2010 p. 519), primary dn_Si definition:

| V_pn (V) | dn_eff | VpiL (V cm) | d alpha (dB/cm) | alpha (dB/cm) |
|---|---|---|---|---|
| 0.0 | 0.000000e+00 +- 0.0e+00 | - | 0.0000 +- 0.0e+00 | 13.064 +- 0.066 |
| -0.5 | 3.844753e-05 +- 4.9e-08 | 1.00787 +- 1.3e-03 | -0.7295 +- 7.7e-04 | 12.334 +- 0.066 |
| -1.0 | 7.022716e-05 +- 6.0e-08 | 1.10356 +- 9.5e-04 | -1.3321 +- 8.3e-04 | 11.732 +- 0.066 |
| -1.5 | 9.785354e-05 +- 6.0e-08 | 1.18800 +- 7.3e-04 | -1.8557 +- 6.9e-04 | 11.208 +- 0.066 |
| -2.0 | 1.225516e-04 +- 5.5e-08 | 1.26477 +- 5.6e-04 | -2.3235 +- 4.7e-04 | 10.741 +- 0.066 |
| -2.5 | 1.450291e-04 +- 4.9e-08 | 1.33594 +- 4.5e-04 | -2.7489 +- 4.3e-04 | 10.315 +- 0.067 |
| -3.0 | 1.657410e-04 +- 4.4e-08 | 1.40279 +- 3.7e-04 | -3.1407 +- 5.5e-04 | 9.924 +- 0.067 |
| -3.5 | 1.849992e-04 +- 3.8e-08 | 1.46622 +- 3.0e-04 | -3.5049 +- 7.6e-04 | 9.559 +- 0.067 |
| -4.0 | 2.030301e-04 +- 3.5e-08 | 1.52687 +- 2.6e-04 | -3.8456 +- 1.0e-03 | 9.219 +- 0.068 |

K11 optics, Nedeljkovic 2011 Table 1, primary dn_Si definition:

| V_pn (V) | dn_eff | VpiL (V cm) | d alpha (dB/cm) | alpha (dB/cm) |
|---|---|---|---|---|
| 0.0 | 0.000000e+00 +- 0.0e+00 | - | 0.0000 +- 0.0e+00 | 11.624 +- 0.062 |
| -0.5 | 3.375070e-05 +- 4.2e-08 | 1.14812 +- 1.4e-03 | -0.6555 +- 6.0e-04 | 10.969 +- 0.062 |
| -1.0 | 6.164440e-05 +- 5.1e-08 | 1.25721 +- 1.0e-03 | -1.1968 +- 5.8e-04 | 10.428 +- 0.062 |
| -1.5 | 8.588927e-05 +- 4.9e-08 | 1.35349 +- 7.8e-04 | -1.6668 +- 3.9e-04 | 9.958 +- 0.063 |
| -2.0 | 1.075610e-04 +- 4.4e-08 | 1.44104 +- 5.9e-04 | -2.0865 +- 3.8e-04 | 9.538 +- 0.063 |
| -2.5 | 1.272815e-04 +- 3.9e-08 | 1.52222 +- 4.6e-04 | -2.4679 +- 5.9e-04 | 9.157 +- 0.063 |
| -3.0 | 1.454502e-04 +- 3.4e-08 | 1.59848 +- 3.7e-04 | -2.8191 +- 8.9e-04 | 8.806 +- 0.064 |
| -3.5 | 1.623415e-04 +- 2.8e-08 | 1.67086 +- 2.9e-04 | -3.1452 +- 1.2e-03 | 8.480 +- 0.064 |
| -4.0 | 1.781542e-04 +- 2.4e-08 | 1.74007 +- 2.4e-04 | -3.4502 +- 1.4e-03 | 8.175 +- 0.064 |


Changes against round 1: K11 C' with oxide moved by -6.1e-4 (0 V) to -8.2e-4 (-4 V) relative (round-1 U was 0.9-2.6e-4:
understated, audit Q1); its series now has observed order at 8 of 9 biases, U = 1.2-2.4e-4 relative incl. U_ox
3.5-6.8e-5. At -1 V the three finest levels cross (formal fallback, U_mesh 2e-6 pF/cm), so U = 4.9e-5 relative there
is accidentally small; the neighbouring biases indicate about 1.5e-4, which the engine gate should use at -1 V.
Si-only C' unchanged (no oxide; the slab grading change is invisible there). K11 dn_eff moved by <= 3.9e-4
relative (Soref-Bennett, -4 V), inside the new U (U_ox <= 1e-9). Absolute alpha: U now 0.066 dB/cm (round 1 0.016), dominated by the h_j
series (optical sampling of the n/n+ and p/p+ accumulation layers at x = +-1.25 um, outside the junction box); alpha(0)
13.064 vs round-1 13.038 dB/cm (Soref-Bennett). K12 means and sheet densities: node-aligned, observed order, U about 2e-5
relative (round 1: 2e-3 to 1.2e-2, biased +7e-4 to +4e-3); J and centre values unchanged within U. K12 contact-loss
fraction 1e-4 (0.5 V), 8.5e-3 (0.8 V), 0.053 (0.9 V), 0.228 (1.0 V): gate J at 1.0 V only with identical ideal ohmic
contacts at x = +-1 um. K10 unchanged within U (new grids).
First-order dn_eff vs direct re-solve at -4 V: -1.36e-4 relative (audit Q6: allow this term if the engine re-solves).

### Gate roles for the engine (also in reference/summary-s8.json)

- K10: C'(V) and V_bi primary.
- K11: Si-only C' primary; C' with oxide secondary and only on the identical domain (zero-flux box x +-2.5,
  y -2 / 2.22 um, no substrate, no metal, contacts on the slab end faces); dn_eff, d alpha, alpha, VpiL primary with the
  primary dn_Si definition f(N(V)) - f(N(0)); the secondary definition is informational only.
- K12: J at 0.5-0.9 V, centre and central-i means primary; J at 1.0 V with identical contacts only.

