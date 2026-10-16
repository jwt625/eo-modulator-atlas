---
title: Independent EO overlap references (tensor/region split, conventional Gamma, integral identities)
date: 2026-10-15
status: part 1 done (2026-10-15 14:49 PDT)
owner: R-VAL (fresh-context validation subagent; never reads engine/src)
scope: validation/ (new script and new reference JSONs only), cases K4, K5-g3..g8, K7-D*, K7K4-D*
---

# DevLog-033: EO overlap references (R-VAL part 1)

Parent: `DevLog/DevLog-030-results-postprocessing-comsol-spec.md` (P5 EO definitions, P7 validation). Pipeline and
conventions: `DevLog/DevLog-028-open-source-references.md` (rounds 1-3). Independence: no read of `engine/src`.

## Plan (written 2026-10-15 14:38 PDT, before any code or run)

New script `validation/scripts/ref_eo_overlap.py` (reuses `eoref` and helpers of `scripts/ref_es_eo.py`; existing
case YAMLs and reference JSONs untouched). Per case, per ES mesh level (fresh subprocess per level, as before):

1. Electrostatics (scikit-fem P2, AMG-CG, 1 V terminal difference: signal 1 V, grounds 0 V) on the same meshes as
   DevLog-028. Arm modes: TE0 per arm window, vector FEM N2/P2, h_core 40 nm, half window with the TE mirror.
2. Per arm (A = right gap, B = left gap):
   a. Full-tensor first-order dn_eff per volt, dn = int E* . d(eps_r) . E dA / (4 P'), split
      - by tensor component: each lab-frame d(eps) component is linear in exactly one r coefficient
        (x-cut, propagation crystal y, static field in the lab x-y plane):
        r33 -> d eps_xx = -n_e^4 r33 E_x,s (term d eps_xx |E_x|^2);
        r13 -> d eps_yy = -n_o^4 r13 E_x,s and d eps_zz = -n_o^4 r13 E_x,s (terms |E_y|^2, |E_z|^2);
        r51 -> d eps_xy = -n_e^2 n_o^2 r51 E_y,s (term 2 d eps_xy Re(E_x* E_y));
        r22 -> d eps_yz = +n_o^4 r22 E_y,s (term 2 d eps_yz Re(E_y* E_z)).
        Contribution of a coefficient = its terms of E* . d eps . E integrated and divided by 4 P'. Sum = total.
      - by region: LN slab (label ln_slab), LN rib (labels ln_rib*), other (all non-LN elements; zero by
        construction because the Pockels tensor is non-zero only in LN). Also the region x component table.
   b. Conventional overlap Gamma = (g / V) int_LN E_x,rf |E_opt|^2 dA / int_all |E_opt|^2 dA, g = edge-to-edge gap of
      that arm (A: ground_r left edge - signal right edge; B: signal left edge - ground_l right edge),
      |E_opt|^2 = |E_x|^2 + |E_y|^2 + |E_z|^2 of the mode; variant with |E_x,opt|^2 only (numerator and denominator).
      Signed (A > 0, B < 0 for this orientation) and region split (slab, rib).
      Implied textbook VpiL (push-pull, engine convention V = terminal voltage across each gap):
      dn_tb,arm = -(1/2) n_e^3 r33 Gamma_arm / g_arm, VpiL_tb = lambda / (2 |dn_tb,A - dn_tb,B|)
      = lambda g / (2 n_e^3 r33 Gamma_mean) for equal gaps (single-arm textbook lambda g / (n_e^3 r33 Gamma) halved).
      No n_e/n_eff factor in VpiL_tb; the variant with it (VpiL_tb x n_eff / n_e) is listed separately, and
      Gamma_equiv = 2 g |dn_full| / (n_e^3 r33) (the Gamma that reproduces the full-tensor dn in the textbook formula).
   c. Integral identities: W' = (eps0/2) int eps_rf |grad phi|^2 dA (J/m, V = 1, = C'/2); line integral of -E
      from the signal edge to the ground edge along the horizontal segment at the LN slab mid-height through the
      gap centre (exact quadrature with breakpoints at element edges, checked against phi(end) - phi(start));
      same at the electrode bottom height (endpoints on the electrodes: must equal -1 V exactly).
3. Levels: ES scales 2.83 / 2 / 1.41 / 1 where memory allows (1.4 GB watchdog), extrapolation by the round-2 rule
   (`eoref.util.richardson`, p_formal 2, three finest levels). Optical-mesh check (h 40 -> 28 nm at the coarsest ES
   level) on K4 and K7-D0.
4. Outputs: `validation/reference/eo-overlap-<case>.json` (definitions as strings), `validation/reference/summary-eo.json`
   (summary.json unchanged). Logs `logs/ref-eo-<case>-YYYYMMDDTHHMM.log`. Temp files in the session scratchpad
   `r-val-eo/` (TMPDIR), removed after the run.
5. Sanity: Gamma in 0.3-0.8 (investigate otherwise); component sum and region sum equal the total to round-off;
   dn total equals the DevLog-028 reference per level where the levels coincide (K7, K7K4 scales 2.83/2/1.41).
Hardware: one process at a time, nice 10, BLAS/OMP threads 1, `run_guarded.sh` with RSS_LIMIT_KB 1.4 GB, AMG.

## TODO

- [x] script `scripts/ref_eo_overlap.py` (+ dry run, pilot)
- [x] pilot on K4 (2 levels)
- [x] full serial run: K4, K5-g3/g4/g5/g6/g8, K7-D0/D1/D2.6/D3.6, K7K4-D0/D0.9/D1.8
- [x] optical-mesh check K4, K7-D0
- [x] summary-eo.json, results tables, sanity checks
- [x] scratch cleaned, no process left
- [ ] R-VAL part 2 (after R-ENG/R-UI report): engine vs these references, browser vs Node, COMSOL-UX review

## Progress log

- 2026-10-15 14:38 PDT Read DevLog-030, DevLog-028, validation/ code and cases. Plan above.
- 14:41 `scripts/ref_eo_overlap.py` written (ruff clean); dry run and K4 pilot (ES scales 2.83/2, temp output in the
  scratchpad, deleted): every sanity check at round-off; same-scale dn and C' equal the DevLog-028 K4 levels to 3e-14.
- 14:42-14:49 `run_eo.sh` (serial, `run_guarded.sh`, RSS_LIMIT_KB 1468006, nice 10, 1 thread, TMPDIR = session
  scratchpad `r-val-eo/`): 13 cases, ES scales 2.83/2/1.41/1 (extrapolation from 2/1.41/1), arm mesh 40 nm; optical
  check on K4 and K7-D0. ES level peaks 0.64-1.17 GB; arm solves 0.93-1.12 GB; the two optical-check processes
  (28 nm arm mesh) peaked at 1.459e9 / 1.481e9 B (1.36 / 1.38 GiB), below the watchdog threshold (1468006 KiB =
  1.503e9 B) but above 1.4e9 B decimal; no watchdog kill. Log `logs/ref-eo-run_eo-20261015T1441.log` (+ per-process
  `logs/ref-eo-<case>*-20261015T14*.log`). No process left; scratch dir holds only the uv lock file.
- 2026-10-15 14:49 PDT Results below.

## Results (2026-10-15; per volt of the 1 V terminal difference; A = right arm; value +- U, round-2 rule)

B arm mirrors A to <= 3e-4 relative (mesh asymmetry); B values are in the JSONs. Definitions: the `definitions`
block of every JSON (same text as the plan above).

### Full-tensor dn_eff/V, arm A (1e-6 /V): split by Pockels coefficient and by region

| Case | total | r33 | r13 | r51 | r22 | LN slab | LN rib | other |
|---|---|---|---|---|---|---|---|---|
| K4 = K5-g5 = K7K4-D0 (g 5) | -17.0048 +- 0.0055 | -16.2753 | -0.3310 | -0.3989 | 0 | -10.6698 | -6.3367 | 0 |
| K5-g3 | -30.3119 +- 0.018 | -29.0247 | -0.5935 | -0.6948 | 0 | -19.0237 | -11.2926 | 0 |
| K5-g4 | -21.8935 +- 0.012 | -20.9563 | -0.4271 | -0.5103 | 0 | -13.7379 | -8.1557 | 0 |
| K5-g6 | -13.8123 +- 0.0020 | -13.2185 | -0.2683 | -0.3252 | 0 | -8.6644 | -5.1471 | 0 |
| K5-g8 | -9.8864 +- 0.0011 | -9.4610 | -0.1917 | -0.2334 | 0 | -6.2002 | -3.6853 | 0 |
| K7-D0 | -7.4331 +- 0.0007 | -7.2708 | -0.0917 | -0.0706 | 0 | -5.9246 | -1.5083 | 0 |
| K7-D1 | -7.9169 +- 0.0006 | -7.7442 | -0.0977 | -0.0750 | 0 | -6.3101 | -1.6068 | 0 |
| K7-D2.6 | -9.6284 +- 0.0009 | -9.4206 | -0.1189 | -0.0889 | 0 | -7.6707 | -1.9576 | 0 |
| K7-D3.6 | -11.3850 +- 0.0008 | -11.1500 | -0.1399 | -0.0953 | 0 | -9.0360 | -2.3492 | 0 |
| K7K4-D0.9 | -18.4293 +- 0.0060 | -17.6416 | -0.3594 | -0.4284 | 0 | -11.5629 | -6.8664 | 0 |
| K7K4-D1.8 | -21.7811 +- 0.012 | -21.0158 | -0.4207 | -0.3446 | 0 | -13.3444 | -8.4367 | 0 |

r22 is exactly 0: its term is 2 d eps_yz Re(E_y* E_z), and E_z is in quadrature with E_t for a lossless mode.
"other" is 0 by construction (Pockels only in LN). Region x component tables: keys `A.dn.<r>.<region>` in the JSONs.

### Conventional overlap Gamma (signed; B < 0) and implied textbook VpiL

| Case | g (um) | Gamma_A E2 | Gamma_A Ex2 | Gamma_B E2 | Gamma_A E2 slab / rib | Gamma_equiv A | VpiL full | VpiL tb E2 | VpiL tb Ex2 | VpiL tb E2 x n_eff/n_e | tb/full |
|---|---|---|---|---|---|---|---|---|---|---|---|
| K4 (g 5) | 5 | 0.50086 +- 1.7e-4 | 0.50084 | -0.50091 | 0.31643 / 0.18447 | 0.56345 | 2.27860 +- 5.4e-4 | 2.56340 +- 6.8e-4 | 2.56352 | 2.27152 | 1.1250 |
| K5-g3 | 3 | 0.53609 +- 3.1e-4 | 0.53591 | -0.53612 | 0.33877 / 0.19732 | 0.60263 | 1.27832 +- 7.0e-4 | 1.43700 +- 7.9e-4 | 1.43750 | 1.27338 | 1.1241 |
| K5-g4 | 4 | 0.51600 +- 3.3e-4 | 0.51591 | -0.51593 | 0.32605 / 0.18987 | 0.58035 | 1.76990 +- 9.5e-4 | 1.99118 +- 1.2e-3 | 1.99098 | 1.76445 | 1.1250 |
| K5-g6 | 6 | 0.48811 +- 1.1e-4 | 0.48813 | -0.48811 | 0.30830 / 0.17980 | 0.54921 | 2.80581 +- 8.1e-4 | 3.15704 +- 1.2e-3 | 3.15689 | 2.79757 | 1.1252 |
| K5-g8 | 8 | 0.46576 +- 9.1e-5 | 0.46583 | -0.46575 | 0.29408 / 0.17164 | 0.52414 | 3.91962 +- 5.3e-4 | 4.41085 +- 9.3e-4 | 4.41019 | 3.90861 | 1.1253 |
| K7-D0 | 10 | 0.43003 +- 5.0e-5 | 0.43158 | -0.43003 | 0.34349 / 0.08655 | 0.49419 | 5.21315 +- 4.7e-4 | 5.99094 +- 6.8e-4 | 5.96941 | 5.17285 | 1.1492 |
| K7-D1 | 10 | 0.45806 +- 2.3e-5 | 0.45969 | -0.45804 | 0.36586 / 0.09220 | 0.52636 | 4.89458 +- 4.3e-4 | 5.62445 +- 4.1e-4 | 5.60459 | 4.85641 | 1.1491 |
| K7-D2.6 | 10 | 0.55722 +- 3.1e-5 | 0.55919 | -0.55721 | 0.44485 / 0.11237 | 0.64015 | 4.02456 +- 3.5e-4 | 4.62353 +- 2.7e-4 | 4.60720 | 3.99216 | 1.1488 |
| K7-D3.6 | 10 | 0.65937 +- 3.7e-5 | 0.66185 | -0.65933 | 0.52438 / 0.13500 | 0.75693 | 3.40368 +- 3.2e-4 | 3.90729 +- 3.1e-4 | 3.89264 | 3.37373 | 1.1480 |
| K7K4-D0.9 | 5 | 0.54296 +- 2.0e-4 | 0.54289 | -0.54296 | 0.34304 / 0.19992 | 0.61065 | 2.10260 +- 6.4e-4 | 2.36477 +- 8.6e-4 | 2.36510 | 2.09550 | 1.1247 |
| K7K4-D1.8 | 5 | 0.64620 +- 4.2e-4 | 0.64672 | -0.64625 | 0.39974 / 0.24647 | 0.72172 | 1.77901 +- 8.6e-4 | 1.98689 +- 1.1e-3 | 1.98530 | 1.76065 | 1.1169 |

VpiL in V cm. tb = textbook push-pull lambda g / (2 n_e^3 r33 Gamma_mean) (V across each gap = terminal voltage).
The textbook value is 11.7-12.5 % (K4/K5/K7K4; 11.7 % at K7K4-D1.8) and 14.8-14.9 % (K7) above the full-tensor value; with the n_eff/n_e
factor it is 0.3-1.0 % below. Gamma_equiv = 2 g |dn_full| / (n_e^3 r33).

### Integral identities (engine targets)

| Case | W' (pJ/m at 1 V) | C' (pF/m) | int -E . dl, slab mid-height, A (V) | same, B (V) | electrode-bottom segment (V) |
|---|---|---|---|---|---|
| K4 (g 5) | 73.2594 +- 0.0061 | 146.5187 | -0.935287 +- 1.4e-4 | -0.935306 +- 1.1e-4 | -1 (|err| <= 5e-15) |
| K5-g3 | 90.5631 +- 0.023 | 181.1262 | -0.899787 +- 4.4e-4 | -0.899861 +- 3.6e-4 | -1 |
| K5-g4 | 79.8495 +- 0.017 | 159.6989 | -0.922390 +- 4.4e-4 | -0.922293 +- 3.1e-4 | -1 |
| K5-g6 | 68.7134 +- 0.0069 | 137.4269 | -0.943619 +- 1.3e-4 | -0.943597 +- 3.5e-4 | -1 |
| K5-g8 | 62.7480 +- 0.0039 | 125.4959 | -0.953718 +- 1.2e-4 | -0.953683 +- 1.6e-4 | -1 |
| K7-D0 | 69.7429 +- 0.0009 | 139.4859 | -0.819828 +- 3.9e-5 | -0.819814 +- 3.4e-5 | -1 |
| K7-D1 | 69.7568 +- 0.0006 | 139.5135 | -0.819734 +- 3.3e-5 | -0.819758 +- 6.2e-6 | -1 |
| K7-D2.6 | 69.8129 +- 0.0006 | 139.6257 | -0.819286 +- 3.8e-5 | -0.819288 +- 3.3e-5 | -1 |
| K7-D3.6 | 69.8935 +- 0.0012 | 139.7870 | -0.818596 +- 3.7e-5 | -0.818574 +- 3.9e-5 | -1 |
| K7K4-D0.9 | 73.4952 +- 0.0085 | 146.9904 | -0.934603 +- 2.2e-4 | -0.934620 +- 2.0e-4 | -1 |
| K7K4-D1.8 | 74.3559 +- 0.016 | 148.7118 | -0.934961 +- 4.8e-4 | -0.935037 +- 3.3e-4 | -1 |

Segments: y = slab centre (0.15 um in every case), x from the signal edge to the ground edge of that gap; dl from
signal to ground, so the value is phi(ground end) - phi(signal end). W' = C'/2 at 1 V (C' here from the same solve;
the C' values equal DevLog-028 round 2/3 within their U).

### Sanity checks (all cases, all levels)

- Coefficient split vs an independent summation of the full E* . d eps . E (DevLog-028 `perturbation_from_fields`
  on the same fields): max relative difference 2e-16. Region split (slab + rib + other) vs total: <= 2.1e-16.
- Same-scale levels vs the existing DevLog-028 reference JSONs (dn_A, dn_B, C', gamma_scalar): <= 1.7e-13 relative
  (same meshes, deterministic). K4 VpiL 2.27860 +- 5.4e-4 equals the round-2 reference (same three finest levels).
- Line integral by exact piecewise quadrature vs phi(end) - phi(start): <= 2.1e-15 V; electrode-bottom identity -1 V
  to <= 5.3e-15.
- Gamma_E2 in 0.43-0.66 for every case and level (inside the expected 0.3-0.8). Gamma rises as the gap narrows and as
  the rib moves toward the signal; the rib carries 37 % of dn (K4) but only 20 % for K7 (shallower 0.2 um rib).
- Optical-mesh check (arm mesh 40 -> 28 nm, coarsest ES level): K4 dVpiL 3.1e-5 V cm, dGamma_A -8.0e-6; K7-D0
  dVpiL 9.3e-6 V cm, dGamma_A -3.0e-6, dVpiL_tb 5.1e-5 V cm (all below U).
- Extrapolation methods (JSON `extrapolated.<key>.method`): K7K4-D1.8 every key, K5-g4 / K7-D0 / K7-D2.6 VpiL and
  several r51 entries use the formal-order fallback (U = max(3 |f_ext - f_finest|, spread)); others observed order.

## Limitations

- Same model limits as DevLog-028 (quasi-static ES, perfect conductors, metal absent in the optical problem, case-input
  RF/EO constants, crystal-orientation sign convention; a 180 deg flip changes every sign together, not the split).
- U covers ES mesh discretisation only; the optical mesh is fixed (40 nm), checked once per family (above).
- Gamma uses the case's edge-to-edge gap g for both variants; K7 electrodes sit on a 0.2 um buffer, so g is the
  electrode gap, not the gap at the LN surface.

## Files

- `validation/scripts/ref_eo_overlap.py` (new; imports helpers of `scripts/ref_es_eo.py`, unchanged),
  `validation/run_eo.sh` (serial guarded chain).
- `validation/reference/eo-overlap-<case>.json` (13 cases: levels, extrapolated, sanity, definitions, optical check
  for K4 / K7-D0) and `validation/reference/summary-eo.json` (summary.json unchanged).
