---
title: Fresh-context audit of lane T5 (S8 silicon PN/PIN references K10-K12, DevLog-040)
date: 2026-10-16
auditor: fresh-context Claude subagent (did not read engine/src or the T4 lane's files)
scope: DevLog-035 (T5 row), DevLog-040, validation/eoref/{semi,plasma,dd1d,semi_devsim}.py, validation/scripts/ref_s8_*.py, validation/cases/K10-K12.yaml, validation/reference/s8-K10..K12.json, primary references in references/_inbox/
---

# S8 reference audit (2026-10-16 00:07-00:40 PDT)

No repository file was changed except this report. All runs: `validation/run_guarded.sh` (RSS_LIMIT_KB 1468006,
nice 10, BLAS threads 1), one process at a time, TMPDIR and scripts in the session scratchpad, no repo logs written,
no process left running (checked with `ps`). PDF pages rendered with PyMuPDF (`uv run --offline --project validation
--with pymupdf`, ephemeral, project files unchanged). One web search plus one fetch (allpix-squared.docs.cern.ch,
no personal data) for a secondary Masetti corroboration.

## Verdict

The references are sound and fit for validating the engine. Every model coefficient matches its source. The
reproductions and the independent checks agree with the reference values within the stated U. Two uncertainty
statements need correcting before the references gate the engine: Q1 (the oxide-mesh error in K11 C' is larger
than its stated U) and Q3 (the K12 i-region means are biased and their U is inflated). Q2 and Q8 are comparison
conditions that the engine must match.

## Coefficient check (every value read from the rendered source page)

| Model | Lane value | Source (page, item) | Status |
|---|---|---|---|
| Masetti eq. (1) electrons | mu0 + (mumax-mu0)/(1+(N/Cr)^a) - mu1/(1+(Cs/N)^b) | p. 765 eq. (1) | match |
| Masetti eq. (4) holes | mu0 exp(-Pc/N) + mumax/(1+(N/Cr)^a) - mu1/(1+(Cs/N)^b) | p. 767 eq. (4) | match |
| Masetti phosphorus | 68.5, 1414, 56.1, 9.20e16, 3.41e20, 0.711, 1.98, Pc none | p. 766 Table I | match (all legible) |
| Masetti boron | 44.9, 470.5, 29.0, 2.23e17, 6.10e20, Pc 9.23e16 | p. 766 Table I | match (exponent digits partly lost, read from context) |
| Masetti boron alpha, beta | 0.719, 2.00 | p. 766 Table I | glyphs partly lost (see Q4); visible strokes consistent; secondary corroboration 0.719 / 2.0 |
| n_i | 1.00e10 cm^-3, 300 K | Sproul-Green p. 846 (Introduction, "1.00(3)"), Table II p. 852 (300 K, saturation current 1.00(3) x 1e10), p. 853 conclusions | match; locator "abstract" wrong (Q9) |
| SRH | U = (np - n_i^2)/(tau_p(n+n1) + tau_n(p+p1)) | Shockley-Read eq. (4.4) p. 837 divided by C_n C_p, eq. (5.4) p. 838 tau_p0 = 1/C_p, tau_n0 = 1/C_n | match (DevLog notation 1/(C_n N_t) differs, Q9) |
| Soref-Bennett 1550 (Reed 2010) | dn = -(8.8e-22 Ne + 8.5e-18 Nh^0.8), da = 8.5e-18 Ne + 6.0e-18 Nh | Reed et al. p. 519 | match; worked number recomputed 1.6663e-3 (Reed: 1.66e-3) |
| Soref 1987 slopes | 0.818 holes, 1.04 electrons at 1.55 um | p. 126 text; coefficients not printed on pp. 126-127 | match (the paper says "Fig. 14", plot is Fig. 11; paper typo) |
| Nedeljkovic 2011, 1.55 um | a 8.88E-21, b 1.167, c 5.84E-20, d 1.109, p 5.40E-22, q 1.011, r 1.53E-18, s 0.838 | Table 1 p. 1178 (text-layer PDF, unambiguous); eqs. (4), (5) p. 1175 with -dn on the left | match, sign mapping correct |
| Nedeljkovic validity caveats | only at lambda >= 8-11 um | Table 1 caption p. 1178 | match |
| Caughey-Thomas | holes v_m 9.5e6, E_c 1.95e4, beta 1; electrons 1.1e7, 8e3, 2; chord mu0/(1+(E/E_c)^b)^(1/b), E_c = v_m/mu0 | Table II and eqs. (2), (3) p. 2193 | match |
| Constants | q, k_B SI 2019; eps0 8.8541878188e-12 F/m; eps_r Si 11.7, SiO2 3.9 (case inputs) | - | match |

## Independent recomputation and reproduction

| Check | Auditor result | Reference | Agreement |
|---|---|---|---|
| K10 V_bi | 0.874977199 V (V_t 0.025852000 V) | 0.874977199 V | exact |
| K10 W, C' depletion, 0 / -2 / -4 V | W 0.116524 / 0.211220 / 0.275045 um; C' 0.889034 / 0.490456 / 0.376644 fF/um^2 | DevLog table | match |
| K10 C' with 2 V_t, 0 / -2 / -4 V | 0.916526 / 0.494926 / 0.378657 fF/um^2 | DevLog table | match |
| K10 own solver: 1D nonlinear Poisson with flat quasi-Fermi levels (phi_n = 0, phi_p = V), box method, N = 1000/2000/4000, Richardson p_obs 2.00 | C' 9.165702e-8 / 4.949262e-8 / 3.786570e-8 F/cm^2 | 9.165698e-8 +- 2.7e-12 / 4.949262e-8 +- 4.5e-13 / 3.786569e-8 +- 2.1e-13 | <= 4e-7 relative, inside U |
| K10 pilot (lane code, levels 356/500/708) | C'(0) 9.165790e-8 +- 2.27e-11; C'(-4) 3.786576e-8 +- 1.6e-12 | final values above | differences 9.2e-13 and 6.2e-14, inside both U |
| K11 pilot (lane stages, ES K = 25/35, h_j 10/7.07 nm, biases 0/-2/-4) at -2 V | C' 2.718699e-12 +- 5.4e-15 F/cm; dn_eff SB 1.226319e-4 +- 3.6e-7; Ned 1.076329e-4 +- 3.1e-7; VpiL SB 1.26395 V cm; n_eff 2.5690946 | 2.717203e-12; 1.225847e-4; 1.075917e-4; 1.26443; 2.5690949 | inside the pilot U (diffs 1.5e-15, 4.7e-8, 4.1e-8) |
| K11 Si-only C' vs 1D (5e17/5e17, 2 V_t) x 0.22 um | 3.4074 / 1.8722 / 1.4367 pF/cm | 3.4071 / 1.8721 / 1.4368 | <= 1e-4 relative |
| K11 depletion half-width x_n (2 V_t) | 0.0334 / 0.0609 / 0.0793 um | DevLog 0.033 / 0.061 / 0.079 | match |
| K12 high-injection estimate J = q W_i n_mean/(2 tau) | 378.8 A/cm^2 at 0.8 V | 378.67 | 0.05 % (2537 vs 2756 at 0.9 V, 13920 vs 21117 at 1.0 V: end-region and contact recombination, Q8) |
| K12 ideality from J(V) steps | 1.47, 1.82, 1.95, 1.95, 1.90 (0.5-1.0 V) | - | ideal-diode to high-injection transition as expected for a 1 um i region with L_a ~ 1.3 um |

## Findings

### Q1 (medium) K11 C' with oxide: the stated U does not cover the oxide-mesh error

- Evidence: `grid_lines` caps the oxide spacing at `hox = min(60 h_A, 0.25 um)`. That is 0.25 um at K = 25, 35 and 50
  and 0.211 um at K = 71, so the far-field oxide mesh is almost the same across the ES series. The C' series is
  non-monotone for V <= -1.5 V, so the rule falls back to the formal order. Auditor test at K = 35 with the cap
  halved to 0.125 um (12 more y lines, silicon unchanged): C' changes by -1.48e-4, -2.36e-4 and -2.85e-4 relative at
  0, -2 and -4 V. The stated U is 2.6e-4, 8.5e-5 and 9.3e-5. At the finest level the remaining error is probably
  2e-4 to 4e-4, which is about 3x U for V <= -1 V. dn_eff changes by -2.5e-5 relative (inside its U). Si-only C' has
  no oxide, so it is unaffected.
- Fix: refine the oxide with the level (drop the cap, or make it a fixed multiple of h_A), or add an oxide-mesh
  series and include it in U. Then re-run K11.

### Q2 (medium, comparison condition) K11 C' with oxide depends on the domain

- Evidence: auditor variant at K = 35 with the BOX bottom at -4 um and the cladding top at 4.22 um, both still
  zero-flux: C' +1.30 %, +2.09 %, +2.55 % (0, -2, -4 V). That is about 0.057 pF/cm, roughly 6 % of the fringe term.
  dn_eff changes by +2.3e-4 to +2.9e-4 relative, which at -4 V just exceeds its U of 2.6e-4. DevLog-040 already
  says the fringe term depends on the domain. The size of the effect was not measured before.
- Fix: the engine comparison must use the identical domain: oxide box x +-2.5 um, y -2 to 2.22 um, zero normal
  flux, no substrate, contacts only on the slab end faces. Use Si-only C' as the primary C' gate, and the oxide C'
  as a gate only on a matched domain. Neither value represents a real device, which has a substrate and metal.

### Q3 (low-medium) K12 i-region means and sheet densities: window not on nodes

- Evidence: the window [-0.4, 0.4] um lies on nodes only for N = 500, 1000 and 2000. For N = 356, 708 and 1416 it
  covers 0.99719, 0.99576 and 0.99929 of 0.8 um, but the result is still divided by 0.8 um. The series therefore
  saw-tooths, the rule falls back to the formal order, and U is 2.1e-3 to 1.2e-2 relative (versus about 1e-4 for
  J). The reported value is biased by +7e-4 to +4e-3 against the aligned levels. Example at 0.8 V: the aligned
  levels give n_mean 4.726939, 4.726098 and 4.725855e16, and the reported 4.729178e16 is above all three. The bias
  is inside U. J and the centre values are unaffected.
- Fix: choose N so that 0.6 um / h is an integer (N a multiple of 10, for example 360/500/710/1000/1420/2000), or
  integrate exactly over the window. Then re-run K12.

### Q4 (low) Masetti boron alpha and beta: the scan is ambiguous, the impact is bounded

- Evidence: the rendered Table I (CCITT 1-bit scan, about 300 dpi) shows "0.7?9" and "2.0?". The lost glyphs leave
  a thin vertical stroke (consistent with "1") and a partial "0". Masetti p. 767 states that mu0, mumax, C_r, alpha
  and P_c are the 300 K values of ref. [13] (Thurber et al.), so [13] is the primary place to confirm alpha.
  Secondary corroboration: the Allpix Squared documentation (allpix-squared.docs.cern.ch, carrier mobility, Masetti)
  lists alpha_h 0.719 and beta_h 2.0.
- Sensitivity (auditor, dd1d N = 1000): alpha +-0.010 changes mu_p(1e19) by +-1.4 % and K12 J by -+2.7e-3 at 1.0 V
  (about 12x the J U) but by <= 3e-5 at <= 0.8 V. beta 2.09 instead of 2.00 changes J by <= 6e-6. K10 and K11 are
  unaffected (no reverse current enters).
- Fix: have the user fetch Thurber et al. [13] (boron resistivity-dopant relationship, NBS/J. Electrochem. Soc.,
  1980) and record the confirmed value. Until then, treat 0.719 / 2.00 as a convention shared by the engine and the
  reference.

### Q5 (info, confirms) dn_Si definition: the primary definition is correct and standard

- Nedeljkovic 2011 p. 1172: the fits are versus the carrier concentration N "introduced through doping", with
  Delta alpha(omega, N) = alpha(omega, N) - alpha(omega, 0), eq. (2), and "equivalence is assumed between
  charge-carrier absorption introduced through injection and through doping". Soref and Bennett 1987: Delta N is
  the free-carrier concentration of doped samples relative to undoped Si (Figs. 5, 7, 10-15). Reed 2010 p. 519
  writes "changes in ... carrier concentrations", which is ambiguous, but the expressions are referenced to
  carrier-free Si.
- So for depletion of a doped background, dn(V) = f(N(V)) - f(N(0)) is the consistent use. This is also what a
  TCAD + mode-solver flow does when it uses absolute densities and then n_eff(V) - n_eff(0).
- The secondary form, f applied to Delta N, overestimates |dn| wherever the depletion is partial, because N^0.8 is
  concave. For Soref-Bennett only the hole term differs (b_e = 1); for Nedeljkovic all exponents differ from 1.
  This is the 6-22 % VpiL gap. Keep the secondary form informational only. The engine must use the primary form.

### Q6 (low) First-order dn_eff versus a direct re-solve

- Evidence: re-solve minus first-order (same element-averaged P0 perturbation) is -1.36e-4 relative at -4 V. The
  dn_eff U at -4 V is 2.6e-4 relative, so this term uses about half of it. The check confirms the normalisation and
  the second-order size. The first-order definition is appropriate.
- Fix: if the engine re-solves the perturbed mode, the gate must allow this term, or the reference should also
  report the re-solved value at every bias.

### Q7 (info, benign) The known oxide corner-node defect (4.6 mV)

- Evidence: auditor variant at K = 35 with the contact shrunk to y in [h_A, 0.09 um - h_A], so the 4 corner nodes
  become interface-tied: C' +0.8e-5 to +1.6e-5 relative, dn_eff -3e-7, alpha <= 2e-7. All are below U, so the
  defect has no measurable effect on the reference values. A fix is optional.

### Q8 (low, comparison condition) K12 current includes recombination at the ohmic contacts

- Evidence (dd1d N = 1000): q integral of R over the device divided by J is 0.9999 at 0.5 V, 0.991 at 0.8 V and
  0.772 at 1.0 V. The rest is minority-carrier flow into the infinite-recombination ohmic contacts 0.5 um from the
  i-region edges. Doubling tau gives J ratios of 0.504, 0.528 and 0.741 (0.5, 0.8, 1.0 V), so J follows 1/tau
  where i-region SRH dominates.
- Fix: state the contact recombination in DevLog-040. The engine must use the same ideal ohmic contacts at
  x = +-1 um. Gate J at 1.0 V only together with this condition (the case is already flagged as non-physical).

### Q9 (low, documentation)

- Sproul-Green: the abstract gives no number. The 1.00(3)e10 value is in the Introduction (p. 846), Table II
  (p. 852) and the conclusions. Change the locator.
- Shockley-Read (5.4) is tau_p0 = 1/C_p and tau_n0 = 1/C_n, because C already contains the trap density. DevLog-040
  writes 1/(C_n N_t), which is a notation slip; the code is correct.
- DevLog-040 "Definitions" still says dV 5 mV (10 mV check). The runs and the JSON use 2 mV (4 mV check).
- K11.yaml `plasma_dispersion` still says "pending the PDF" for Nedeljkovic. Editing it changes the case sha256,
  so update it together with the Q1 re-run.

### Q10 (info, confirms) DEVSIM licence

- Installed `devsim-2.11.0.dist-info`: `License: Apache License, Version 2.0`, `licenses/LICENSE` (Apache-2.0),
  `NOTICE` ("Copyright 2013--2023 DEVSIM LLC").
- The bundled `devsim/libumfpack_lgpl.dylib` (also present under `devsim/umfpack/`) embeds "UMFPACK: Copyright (c)
  2005-2006 by Timothy A. Davis" and the GNU LGPL "version 2.1 of the License, or (at your option) any later
  version". The wheel ships no separate LGPL text file.
- The repository only names devsim in `validation/pyproject.toml` and `uv.lock`. `validation/.venv` is
  git-ignored, nothing is vendored, and the repository has no LICENSE file.
- Implication: while validation/ stays a development tool and no DEVSIM binary is redistributed, the repository
  has no redistribution obligations. Shipping a container or bundle with the wheel would require the Apache NOTICE
  and the LGPL-2.1 terms for UMFPACK (source availability, allow relinking).
- The browser engine must not contain DEVSIM-derived code. Not verified here, because engine/src was out of scope
  by rule.

### Q11 (info) Convergence rule application

- `eoref.util.richardson` is applied as coded:
  - K10: observed order 2.02-2.03 at every bias.
  - K12 J: observed order 1.96-2.08, and 1.17 at 1.0 V (accepted, inside [1, 3]).
  - K11 dn_eff ES series: observed order 2.9-4.15, so the formal order with safety factor 3 is used for
    V <= -1 V (conservative; U is the spread of about 3e-8).
  - h_j series: non-monotone at the 1e-8 level, small.
- The exceptions are Q1 (a mesh dimension missing from the series) and Q3 (a non-smooth observable).
- U_dV and the h_core term are included. The linear sum of U terms is conservative.

## Trust table

| Reference value | Trust | Basis | Condition |
|---|---|---|---|
| K10 V_bi | high | closed form = DEVSIM contacts to 1e-15 V | - |
| K10 C'(V), all biases | high | independent Poisson solver within 4e-7; pilot inside U; DEVSIM = dd1d to 1e-11 | - |
| K10 W, depletion C' (both variants) | high | recomputed | - |
| K12 J(V) 0.5-0.9 V | high | DEVSIM = dd1d to 6e-7; high-injection estimate; 1/tau scaling | same ohmic contacts (Q8); boron alpha convention (Q4, <= 3e-5 at <= 0.8 V) |
| K12 J(1.0 V) | medium | numerically converged; 23 % contact recombination; boron alpha sensitivity 12x U | Q4, Q8 |
| K12 centre n, p | high | smooth series, U <= 1.2e-4 | - |
| K12 i-region means and sheet densities | medium | biased +7e-4 to +4e-3, inside an inflated U | Q3 re-run |
| K12 Caughey-Thomas factors | high (as a post-hoc check) | formula and Table II verified | - |
| K11 C' Si-only | high | 1D estimate within 1e-4; pilot consistent; observed order | - |
| K11 C' with oxide | medium | values within about 3e-4 of converged; U understated about 3x; domain-specific | Q1 re-run; Q2 matched domain |
| K11 n_eff, TE fraction | high | h_core and h_j checks | - |
| K11 dn_eff, d alpha, VpiL (Soref-Bennett, Nedeljkovic) | high | coefficients verified, primary definition correct (Q5), pilot inside U | engine uses the primary definition; Q6 term if it re-solves; domain per Q2 at the 3e-4 level |
| K11 absolute alpha(V) | high | consistent with the hand estimate (12.6 vs 13.04 dB/cm) | includes the p+/n+ tails (Boltzmann, no BGN, stated) |
| K11 secondary VpiL (fit on Delta N) | do not gate | definition inconsistent with the sources (Q5) | informational only |
| K11 carrier cuts | high | depletion edges match 1D x_n | - |

## Files

- This report: `DevLog/audits/simulator-s8-ref-audit-2026-10-16.md`.
- Auditor scripts and outputs (session scratchpad only, not in the repo): `ref_audit_k10.py` (independent
  Poisson), `ref_audit_1d.py` (K10 pilot, K12 tau and Masetti sensitivity), `ref_audit_k11.py` with
  `ref_audit_k11var.py` (K11 pilot and the corner / oxide-mesh / domain variants).
