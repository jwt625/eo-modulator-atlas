---
title: Fresh-context audit of lane T4 (S8 2D silicon drift-diffusion and plasma-dispersion EO coupling, DevLog-039)
date: 2026-10-16
auditor: fresh-context Claude subagent (did not write the T4 code)
scope: DevLog-035 (T4 row), DevLog-039, engine/src/semi/*, engine/src/semi-stage.mjs, engine/tests/semi-*, sims/SPEC.md S8; compared with DevLog-040, validation/cases/K10-K12.yaml, validation/reference/s8-K10..K12.json, DevLog/audits/simulator-s8-ref-audit-2026-10-16.md; primary PDFs in references/_inbox/
status: complete; compared against the round-2 references (T5, 2026-10-16 00:34-00:39 PDT)
---

# S8 engine audit (2026-10-16 00:18-00:45 PDT)

No repository file was changed except this report. No git command was run. All engine runs: Node with
`--max-old-space-size=1536`, `nice -n 10`, one process at a time. Configs, driver scripts and outputs are in the
session scratchpad folder `t4audit/` (not in the repo): `cfg/K10.yaml`, `cfg/K11-{ned,sb,sionly,oxB}.yaml`,
`cfg/K11-farA.yaml`, `cfg/K12.yaml`, `scripts/{run,cdef,tangent,linfd,linh,firstorder}.mjs`, `scripts/cmp_k1{0,1,2}.py`, `out/*.json`.
PDF pages were rendered with a small PDFKit helper (macOS system frameworks; no package installed). No process left
running by this audit.

## Verdict

The drift-diffusion core, the plasma-dispersion chain and the coefficients are correct: mapped exactly onto the K10-K12
cases, the engine reproduces V_bi, reverse-bias C'(V) (K10, K11 Si-only), PIN J(V) and carrier densities, dn_eff(V),
d alpha(V), alpha(V) and VpiL(V) for both plasma models within about 1-3x the reference U on the refined mesh,
with differences that mostly shrink under refinement. K11 C' with oxide is 0.4-1.5e-3 high (default mesh), partly from an
unrefined oxide far-field mesh (D11). One defect is serious: the terminal-charge definition of C' (D1) is not the charge that
flows through the contact. It is exact for the symmetric reverse-biased rib, but it is 0.2 % low at 0 V for an
asymmetric junction, 1.6 % low at 0.3 V forward, and a factor 270-550 low for a forward-biased PIN (diffusion
capacitance missing). The "unexplained" 1.4e-4..4.3e-4 linear-response vs finite-difference gap is an artefact of
the diagnostic itself (D2); the finite-difference C' is right. Independence (item 2): no leak found.

## Reference versions

All tables use the round-2 references (DevLog-040 Round 2, written 00:34-00:39 PDT): file sha256 prefixes K10
`5202e41251a85e87`, K11 `7317bab8211cd355`, K12 `5dd3f2bb2b101e14` (case sha256 K10 83c735ce, K11 043e1f72, K12
f53335d5). A first comparison against round 1 (K11 file `e886ea7a0a88dc61`) is superseded; round 2 changed K11 C'
with oxide by -6e-4..-8e-4 (now secondary), dn_eff by <= 3.9e-4, alpha by about +2e-3, and the K12 means.
Re-run: `python3 t4audit/scripts/cmp_k11.py <scratch>/t4audit K11-ned-s07 K11-sb-s0.7 K11-sionly-s0.7` (engine
outputs are saved).

## Case mapping onto the engine `semiconductor` schema

| Item | K10 | K11 | K12 |
|---|---|---|---|
| Geometry | 2D strip x in [-1, 1] um, height 0.02 um, metal electrodes x in [-1.05, -1] and [1, 1.05] | regions as K11 (oxide x +-2.5 (see deviations), y -2 to 2.22; slab 0-0.09; rib +-0.25, 0.09-0.22), slab and rib split at x = 0, +-1.25 so all doping steps lie on mesh lines | strip x in [-1, 1] um, height 0.01 um, regions split at +-0.5 |
| Doping | N_A 1e17 (x < 0), N_D 5e17 (x > 0), uniform `within: regions` | p+ 1e20 / p 5e17 / n 5e17 / n+ 1e20 at x steps -1.25, 0, 1.25 | p+ 1e19 / p 1e15 / n+ 1e19 |
| Models | `intrinsic_density: {ni_cm3: 1.0e10}`, Masetti (phosphorus / boron, N_D + N_A), `field: none`, SRH tau 1e-5 s, midgap | same, tau 1e-6 s | same, tau 1e-9 s |
| Bias | cathode 0..4 V step 0.5 (V_pn = -V_cathode), `dv_v: 0.002` | cathode 0..4 V step 0.5, reference 0 V, `dv_v: 0.002` | anode 0.5..1.0 V step 0.1 |
| Optics | - | vector TE0 1550 nm, window x +-2.5, y -1.5..1.72 (PEC sides, engine vector default), library Si/SiO2 Sellmeier; `density_basis: absolute`, Nedeljkovic or Soref-Bennett | - |
| Mesh | `semiconductor_edge_um` 0.004, meshScale 1 / 0.5 | `semiconductor_edge_um` 0.01, `window_edge_um` 0.03, meshScale 1 / 0.7 | 0.0025, meshScale 1 / 0.5 |

Deviations (the schema cannot express a contact on a bare silicon face): K11 contacts are 10 nm metal blocks beyond
x = +-2.5 (silicon and oxide extended to +-2.51, so each electrode touches oxide on 10 nm top and bottom faces);
variant B (`cfg/K11-oxB.yaml`, metal inset x in [2.49, 2.5], domain +-2.5) bounds the effect: C' differs between
the two mappings by <= 4.5e-4 at meshScale 1 and <= 2.1e-4 at 0.7. K11 Si-only: the oxide is kept with eps_r 1e-6
(Poisson flux through it ~1e-7 of silicon). C' compared for the engine definition (stage output) and, where stated,
for q |d integral(n) / dV| from the same engine states.

## Comparison (rel = engine / reference - 1)

### K10 1D abrupt PN

V_bi (neutral-region potential difference at equilibrium): 0.874977199 V vs 0.874977199 V, rel 6e-15.

| V_pn (V) | C' ref (F/cm^2) | U/ref | engine C' (stage) 4 nm | 2 nm | engine q d(int n)/dV 4 nm | 2 nm |
|---|---|---|---|---|---|---|
| 0 | 9.165691e-08 | 2.9e-05 | -2.6e-03 | -2.1e-03 | -2.8e-04 | -3.6e-05 |
| -0.5 | 7.229236e-08 | 1.8e-05 | -2.4e-04 | -1.1e-04 | -1.4e-04 | -3.1e-05 |
| -2 | 4.949260e-08 | 8.9e-06 | -4.7e-05 | -1.2e-05 | (= stage to 7e-9) | |
| -4 | 3.786569e-08 | 5.5e-06 | -2.8e-05 | -3.0e-06 | (= stage to 3e-10) | |

The stage C' stalls at -2.1e-3 at 0 V; with the electron-integral definition the engine converges at O(h^2) to the
reference (D1). Nodes 7176 / 27119; 0 negative edge weights.

### K12 1D PIN, forward bias (field mobility off, as the reference)

| V_pn (V) | J ref (A/cm^2) | U/ref | J rel 2.5 / 1.25 nm | n centre rel 2.5 / 1.25 nm (U/ref) | p centre rel 2.5 / 1.25 nm (U/ref) |
|---|---|---|---|---|---|
| 0.5 | 0.447629 | 1.1e-04 | -2.2e-04 / -5.2e-05 | +2.6e-04 / +5.5e-05 (1.2e-04) | -2.4e-04 / -5.1e-05 (1.1e-04) |
| 0.6 | 6.20834 | 1.4e-04 | -2.7e-04 / -6.4e-05 | +5.2e-05 / +1.2e-05 (2.5e-05) | +6.0e-06 / +1.9e-06 (4.0e-06) |
| 0.7 | 52.0846 | 1.0e-04 | -2.1e-04 / -4.9e-05 | +4.6e-05 / +1.1e-05 (2.3e-05) | +4.0e-05 / +9.3e-06 (2.0e-05) |
| 0.8 | 378.673 | 7.9e-05 | -1.6e-04 / -3.8e-05 | +4.3e-05 / +9.8e-06 (2.1e-05) | +4.2e-05 / +9.6e-06 (2.1e-05) |
| 0.9 | 2756.31 | 3.6e-05 | -7.9e-05 / -1.8e-05 | +1.5e-05 / +2.3e-06 (5.5e-06) | +1.5e-05 / +2.3e-06 (5.5e-06) |
| 1.0 | 21117.1 | 2.1e-05 | +2.6e-05 / +7.6e-06 | -1.0e-04 / -3.5e-05 (6.5e-05) | -1.0e-04 / -3.4e-05 (6.5e-05) |

i-region means over [-0.4, 0.4] um (round-2 reference after ref-audit Q3), 2.5 / 1.25 nm: n +2.2e-3 / +4.8e-4 (U
1.1e-3) at 0.5 V, +4.7e-4 / +9.9e-5 (2.2e-4) at 0.6 V, <= 6e-5 / 1.3e-5 at 0.7-0.9 V, -1.0e-4 / -3.4e-5 (6.5e-5) at
1.0 V; p within the same pattern. All within U at 1.25 nm and shrinking about 4x per halving. Nodes 9176 / 32688.
Field factor on (`field: caughey_thomas_1967`, engine driving force |E| along the edge): J lower by 0.07 % (0.5 V)
to 0.36 % (1.0 V) (D9).

### K11 lateral PN rib (round-2 reference, file sha256 7317bab8211cd355, case 043e1f72)

Device 21001 / 38763 nodes (semiconductor 13497 / 27092), optical 4166 / 6280 nodes at meshScale 1 / 0.7; 0
negative edge weights. n_eff 2.5691515 / 2.5691284 vs 2.5690951. Mapping A = metal blocks outside x = +-2.5
(`cfg/K11-ned.yaml`), B = metal inset (`cfg/K11-oxB.yaml`).

| V_pn (V) | C' oxide ref (pF/cm) | rel A 1 / 0.7 | rel B 1 / 0.7 | U/ref | C' Si-only ref (pF/cm) | rel 1 / 0.7 | U/ref |
|---|---|---|---|---|---|---|---|
| 0 | 4.37626 | +4.4e-04 / +7.0e-04 | -5.5e-05 / +6.3e-04 | 2.4e-04 | 3.40715 | -1.3e-03 / -4.4e-04 | 4.9e-04 |
| -0.5 | 3.63421 | +4.5e-04 / +7.0e-04 | +5.5e-04 / +4.9e-04 | 1.2e-04 | 2.71238 | -1.2e-03 / -5.0e-04 | 3.6e-04 |
| -1 | 3.20934 | +9.2e-04 / +8.4e-04 | +7.6e-04 / +7.9e-04 | 4.9e-05 | 2.32045 | -9.7e-04 / -4.5e-04 | 2.6e-04 |
| -1.5 | 2.92407 | +1.0e-03 / +9.5e-04 | +7.3e-04 / +9.5e-04 | 1.3e-04 | 2.06054 | -4.6e-04 / -3.4e-04 | 1.7e-04 |
| -2 | 2.71501 | +1.2e-03 / +1.1e-03 | +1.1e-03 / +9.2e-04 | 1.8e-04 | 1.87212 | -5.9e-04 / -1.8e-04 | 1.4e-04 |
| -2.5 | 2.55302 | +1.2e-03 / +1.1e-03 | +1.3e-03 / +9.4e-04 | 1.6e-04 | 1.72755 | -6.4e-04 / -2.3e-04 | 1.9e-04 |
| -3 | 2.42238 | +1.2e-03 / +1.1e-03 | +1.3e-03 / +9.7e-04 | 1.7e-04 | 1.61188 | -4.0e-04 / -1.5e-04 | 1.3e-04 |
| -3.5 | 2.31394 | +1.5e-03 / +1.1e-03 | +1.1e-03 / +1.1e-03 | 2.1e-04 | 1.51672 | -3.4e-05 / -4.0e-05 | 8.7e-05 |
| -4 | 2.22204 | +1.5e-03 / +1.1e-03 | +1.2e-03 / +1.0e-03 | 2.0e-04 | 1.43676 | -5.5e-05 / -2.1e-04 | 1.6e-04 |

- Si-only C' (primary gate): differences shrink with refinement to <= 5.0e-4 (1-1.8x U) except -3.5 / -4 V
  (non-monotone at the 1e-4 level, D8).
- C' with oxide (secondary, domain-specific): engine +4e-4..+1.1e-3 high, 2-17x U. Part of it is the engine oxide
  far-field mesh, which meshScale does not refine (D11): with `far_edge_um: 0.1` (`cfg/K11-farA.yaml`, 24373 /
  44711 nodes) the gap drops to +2.8e-4..+9.4e-4 (meshScale 1) / +2.8e-4..+8.2e-4 (0.7). The rest is within the
  contact-mapping spread (A vs B up to 4.5e-4 at meshScale 1). Not gateable until D11 is fixed and the contact
  representation is matched (ref-audit Q2).

Nedeljkovic 2011, 1550 nm, absolute basis:

| V_pn (V) | dn_eff ref | rel 1 / 0.7 | U/ref | d alpha ref (dB/cm) | rel 1 / 0.7 | U/ref | alpha ref (dB/cm) | rel 1 / 0.7 | VpiL ref (V cm) | engine 0.7 | rel 1 / 0.7 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | - | - | 0 | - | - | 11.6244 | -2.8e-03 / -2.6e-03 | - | - | - |
| -0.5 | 3.37507e-05 | -1.7e-03 / +5.4e-05 | 1.2e-03 | -0.65554 | -2.5e-03 / -2.4e-04 | 9.1e-04 | 10.9689 | -2.8e-03 / -2.7e-03 | 1.14812 | 1.14806 | +1.7e-03 / -5.4e-05 |
| -1 | 6.16444e-05 | -6.1e-04 / +8.3e-05 | 8.2e-04 | -1.19681 | -9.0e-04 / -1.0e-04 | 4.8e-04 | 10.4278 | -3.0e-03 / -2.9e-03 | 1.25721 | 1.25711 | +6.2e-04 / -8.3e-05 |
| -1.5 | 8.58893e-05 | +2.5e-04 / +5.5e-05 | 5.8e-04 | -1.66679 | -5.4e-05 / -6.4e-05 | 2.3e-04 | 9.9578 | -3.3e-03 / -3.0e-03 | 1.35349 | 1.35341 | -2.5e-04 / -5.5e-05 |
| -2 | 1.07561e-04 | +2.4e-04 / +1.0e-04 | 4.1e-04 | -2.08646 | -8.2e-05 / +2.7e-05 | 1.8e-04 | 9.5382 | -3.4e-03 / -3.2e-03 | 1.44104 | 1.44089 | -2.4e-04 / -1.0e-04 |
| -2.5 | 1.27281e-04 | +1.7e-04 / +1.7e-04 | 3.0e-04 | -2.46795 | -2.4e-04 / +7.6e-05 | 2.4e-04 | 9.1568 | -3.5e-03 / -3.3e-03 | 1.52222 | 1.52195 | -1.7e-04 / -1.7e-04 |
| -3 | 1.45450e-04 | +3.0e-04 / +2.8e-04 | 2.3e-04 | -2.81907 | -3.1e-06 / +2.7e-04 | 3.2e-04 | 8.8057 | -3.7e-03 / -3.5e-03 | 1.59848 | 1.59803 | -3.0e-04 / -2.8e-04 |
| -3.5 | 1.62342e-04 | +5.9e-04 / +4.3e-04 | 1.7e-04 | -3.14520 | +3.9e-04 / +4.6e-04 | 3.8e-04 | 8.4796 | -4.0e-03 / -3.7e-03 | 1.67086 | 1.67014 | -5.9e-04 / -4.3e-04 |
| -4 | 1.78154e-04 | +7.2e-04 / +4.6e-04 | 1.4e-04 | -3.45023 | +4.2e-04 / +4.6e-04 | 4.2e-04 | 8.1746 | -4.2e-03 / -3.9e-03 | 1.74007 | 1.73926 | -7.2e-04 / -4.6e-04 |

Soref-Bennett (Reed 2010), 1550 nm, absolute basis:

| V_pn (V) | dn_eff ref | rel 1 / 0.7 | U/ref | d alpha ref (dB/cm) | rel 1 / 0.7 | U/ref | alpha ref (dB/cm) | rel 1 / 0.7 | VpiL ref (V cm) | engine 0.7 | rel 1 / 0.7 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0 | 0 | - | - | 0 | - | - | 13.0638 | -2.6e-03 / -2.4e-03 | - | - | - |
| -0.5 | 3.84475e-05 | -1.6e-03 / +6.4e-05 | 1.3e-03 | -0.72948 | -2.3e-03 / -2.0e-04 | 1.1e-03 | 12.3345 | -2.6e-03 / -2.5e-03 | 1.00787 | 1.00780 | +1.6e-03 / -6.4e-05 |
| -1 | 7.02272e-05 | -6.4e-04 / +7.4e-05 | 8.6e-04 | -1.33211 | -1.0e-03 / -9.0e-05 | 6.2e-04 | 11.7319 | -2.8e-03 / -2.7e-03 | 1.10356 | 1.10348 | +6.4e-04 / -7.4e-05 |
| -1.5 | 9.78535e-05 | +2.5e-04 / +4.0e-05 | 6.1e-04 | -1.85568 | -1.1e-04 / -6.8e-05 | 3.7e-04 | 11.2084 | -3.0e-03 / -2.8e-03 | 1.18800 | 1.18795 | -2.5e-04 / -4.0e-05 |
| -2 | 1.22552e-04 | +2.5e-04 / +8.4e-05 | 4.5e-04 | -2.32346 | -1.2e-05 / +5.3e-06 | 2.0e-04 | 10.7407 | -3.2e-03 / -3.0e-03 | 1.26477 | 1.26467 | -2.5e-04 / -8.4e-05 |
| -2.5 | 1.45029e-04 | +1.7e-04 / +1.6e-04 | 3.4e-04 | -2.74893 | -1.4e-04 / +6.5e-05 | 1.6e-04 | 10.3153 | -3.3e-03 / -3.1e-03 | 1.33594 | 1.33573 | -1.7e-04 / -1.6e-04 |
| -3 | 1.65741e-04 | +2.9e-04 / +2.6e-04 | 2.7e-04 | -3.14074 | -5.4e-06 / +2.2e-04 | 1.8e-04 | 9.9235 | -3.5e-03 / -3.3e-03 | 1.40279 | 1.40243 | -2.9e-04 / -2.6e-04 |
| -3.5 | 1.84999e-04 | +5.7e-04 / +4.1e-04 | 2.1e-04 | -3.50486 | +3.5e-04 / +4.2e-04 | 2.2e-04 | 9.5594 | -3.7e-03 / -3.5e-03 | 1.46622 | 1.46563 | -5.7e-04 / -4.1e-04 |
| -4 | 2.03030e-04 | +7.2e-04 / +4.4e-04 | 1.7e-04 | -3.84558 | +4.7e-04 / +4.7e-04 | 2.6e-04 | 9.2188 | -3.9e-03 / -3.7e-03 | 1.52687 | 1.52619 | -7.2e-04 / -4.4e-04 |


dn_eff and VpiL agree inside U at meshScale 0.7 for -0.5..-2.5 V (both models); at -3..-4 V the engine is +2.6e-4
..+4.6e-4 high vs U 1.4e-4..2.7e-4 (1.0-3.3x U; the round-2 U shrank). d alpha within U except +4.6e-4 at -3.5 / -4
V (about 1.1-2x U). alpha(V) -2.4e-3..-3.9e-3, inside the round-2 alpha U (alpha(0) U/ref 5.4e-3, dominated by the
reference h_j series). R' (no reference): 11.86 / 11.74 / 11.50 ohm mm at 0 / -2 / -4 V (meshScale 0.7),
consistent with a hand estimate from Masetti resistivities and the slab geometry of about 11 ohm mm; f_RC 30.6 /
49.9 / 62.2 GHz.

Engine-internal decomposition on the K11 state (meshScale 0.7, `scripts/firstorder.mjs`): replacing the engine's
(n_Si + dn + i dk)^2 - n_Si^2 by the reference's 2 n_Si (dn + i dk) raises dn_eff(-2 V) and dn_eff(-4 V) by
1.25e-4 relative and alpha(0), d alpha(-2 / -4 V) by 1.9e-4 (D7). With the reference's definition the engine
dn_eff is +2.3e-4 (-2 V) and +5.9e-4 (-4 V) vs round 2, i.e. the high-bias excess is not the delta-eps definition;
it shrinks with refinement (-4 V: +7.2e-4 -> +4.6e-4) and is attributed to the engine mesh (no engine-side U, D8).
Round 1 vs round 2 of the reference moved dn_eff(-4 V) by -4.0e-4, the same size as the remaining gap.

## Independence (item 2)

- `grep` of `engine/src/semi/`, `engine/src/semi-stage.mjs`, `engine/tests/semi-*` for `validation`, `s8-K`,
  `K10`, `K11`, `K12`, `devsim`, `eoref`: no hit (only the word "validation" in a test title,
  semi-rib.test.mjs:92). `grep` of all of `engine/src` and `engine/tests` for the reference numbers 1.257, 1.441,
  1.739, 1.264, 2.717, 0.91657, 0.874977, 21117, 2.5690949, 1.07592: no hit. The three engine tests that read
  `validation/` (reference-cases, postproc, fields-solver-options) are pre-existing and read K1-K7 only.
- The T4 fixture (`tests/semi-fixtures.mjs` `rib()`) is not K11: domain x +-4 vs +-2.5; metal pads on the slab top
  at |x| 2.5-3.5 um vs contacts on the slab end faces at +-2.5; p+/n+ from |x| 1.6 vs 1.25; cladding 1.2 vs 2.22 um,
  BOX 1.5 vs 2 um; optical window +-1.6 x (-0.9, 1.1) vs +-2.5 x (-1.5, 1.72); n_i Sproul-Green 1.0017e10 vs
  1.00e10; Caughey-Thomas field factor on vs off. Shared: 220 / 90 / 500 nm rib, 5e17 / 5e17 body with the junction
  at the centre, 1e20 contacts, tau 1 us, Nedeljkovic 1550, absolute basis. Its C'(-2 V) is 2.633 pF/cm vs K11
  2.717 (different oxide and contacts), so nothing was tuned to K11.
- Why the VpiL agrees: in reverse bias the quasi-neutral regions do not change with bias and cancel in
  f(N(V)) - f(N(0)), so dn_eff depends only on the junction doping and the waveguide. The exactly mapped K11 run
  gives 1.2571 / 1.4409 / 1.7393 V cm (meshScale 0.7) vs the fixture 1.259 / 1.442 / 1.741 and the reference
  1.2572 / 1.4410 / 1.7401 (round 2). The fixture-to-K11 gap (1e-3) is the expected size of the geometry, n_i and mesh
  differences.
- Coupling that does exist (not a leak): the plasma-dispersion basis (absolute) was aligned by the orchestrator
  note of 2026-10-16 after T5 reported (DevLog-039 Physics model; `config.mjs` and `optics.mjs` modified 00:08,
  after the K11 reference of 00:03). Both lanes read the damaged Masetti boron glyphs as 0.719 / 2.00 (shared
  convention, ref-audit Q4). These are shared definitions, not shared numbers.

## Coefficient spot-checks (rendered source pages)

| Model | Engine (models.mjs) | Source | Status |
|---|---|---|---|
| Masetti Table I As / P / B | 52.2, 1417, 43.4, 9.68e16, 3.43e20, 0.680, 2.00 / 68.5, 1414, 56.1, 9.20e16, 3.41e20, 0.711, 1.98 / 44.9, 470.5, 29.0, 2.23e17, 6.10e20, 0.719, 2.00, P_c 9.23e16 | p. 766 Table I (boron alpha "0.7?9", beta "2.0?" partly lost) | match |
| Masetti eq. (4) holes | mu0 exp(-P_c/N) + mumax/(1+(N/C_r)^a) - mu1/(1+(C_s/N)^b) (models.mjs:47-48) | p. 767 eq. (4) | match |
| Nedeljkovic Table 1, 1.3 and 1.55 um rows | 3.48e-22, 1.229, 1.02e-19, 1.089, 2.98e-22, 1.016, 1.25e-18, 0.835 / 8.88e-21, 1.167, 5.84e-20, 1.109, 5.40e-22, 1.011, 1.53e-18, 0.838 | p. 1178 Table 1 (text layer) | match |
| Sproul-Green eq. (14) | 9.15e19 (T/300)^2 exp(-6880/T) | p. 852 eq. (14) | match |
| Caughey-Thomas Tables I, II | holes 495, 47.7, 0.76, 6.3e16; electrons 1330, 65, 0.72, 8.5e16; v_m 9.5e6 / 1.1e7, beta 1 / 2 | pp. 2192-2193 | match |
| Soref-Bennett (Reed p. 519) | 8.8e-22, 8.5e-18 (^0.8), 8.5e-18, 6.0e-18 | ref-audit coefficient table | match |

## Physics and numerics review (item 3), no defect found

- Scaling and units: Poisson lambda^2 = q C0 L0^2 / (eps0 V_t), SRH factor kappa = L0^2 / (mu_ref V_t), terminal
  current unit q mu_ref V_t C0 (A/m), metal charge eps0 V_t (K psi)_c (solver.mjs:203, 732, 754; device.mjs:202-203)
  checked dimensionally; the K10/K12 agreement confirms them.
- SG fluxes and Jacobian (solver.mjs:217-242): signs and the fixed-quasi-Fermi derivatives are consistent; Newton
  converges in 1-8 iterations on all mapped cases. Box method: cot (Voronoi-dual) edge weights with A/3 lumped
  control volumes, i.e. mass-lumped P1; 0 negative semiconductor edge weights on every mesh used here (clamping is
  counted and labelled). K10 C' (electron-integral definition) and K12 J converge at about O(h^2).
- Slotboom update (solver.mjs:585-594): positive by construction (factor floored at 1e-4).
- Contacts: psi = V + V_t asinh(N/(2 n_i)), phi_n = phi_p = V on the contact control-volume doping; metal on
  insulator at the contact mean psi. K10 V_bi exact.
- SRH (models.mjs:87-92) with n_1 = n_i exp(E_t/kT): matches Shockley-Read eq. (4.4); K12 J agrees to <= 7e-5 at 1.25 nm.
- Masetti at N_D + N_A: same convention as the reference (Masetti fits are vs carrier density; labelled).
- Plasma dispersion: dn negative for carriers, dkappa = d alpha lambda / (4 pi) > 0 is loss, Im delta eps > 0,
  alpha = 4 pi dkappa_eff / lambda; depletion raises n_eff and lowers loss, same signs as the reference. Tensor
  layout [xx, xy, yy, zz] of `vectorPerturbation` (vector-mode.mjs:1710) matches optics.mjs:100-101.
- VpiL single arm |V - V0| lambda / (2 |dn_eff|), lambda in cm; d alpha = loss(V) - loss(V0) in dB/cm.
- R' (smallsignal.mjs): conduction solve with depleted nodes shorted, R' = 1/integral(sigma |grad phi|^2), ohm m;
  f_RC = 1/(2 pi R' C'); plausible against the hand estimate (no reference value exists).

## Findings

### D1 (high) C' terminal-charge definition misses carriers that crossed the metallurgical junction

- Code: `terminals()` (solver.mjs:755-765) sets Q_c = metal charge + space charge of the contact's doping-type side
  (kite split); the stage differentiates it (semi-stage.mjs:111). For a two-terminal device the charge that flows
  through the cathode is -q integral(n) (electrons enter only there), not the n-side space charge: electrons that
  spill into the p side (and holes into the n side, and injected minority charge in forward bias) are excluded.
- Evidence (same engine states, `scripts/cdef.mjs`, central difference 2 mV):
  - K10 (1e17 / 5e17): stage C' vs q d(int n)/dV: -1.65e-2 at +0.3 V forward, -2.36e-3 at 0 V, -4.8e-4 at 0.25 V
    reverse, -9.8e-5 at 0.5 V, -4.1e-6 at 1 V, 7e-9 at 2 V. Against the reference at 0 V the stage C' stalls at
    -2.6e-3 / -2.1e-3 (4 / 2 nm) while q d(int n)/dV converges -2.8e-4 / -3.6e-5. q d(int n)/dV equals
    q d(int p)/dV to 5e-11.
  - K12 PIN: stage C' 9.29e-14 F/m (0.6 V) and 2.65e-12 F/m (0.8 V) vs q |d(int n)/dV| 2.53e-11 and 1.45e-9 F/m
    (factor 270 and 545 low): the stored (diffusion) charge of forward-biased PIN shifters is missing, so C', f_RC
    and the per-length C' exported for the TWE line are wrong for PIN and forward-bias operation.
  - K11 (symmetric 5e17): -1.3e-7 at 0 V, -9e-10 at 1 V, so the rib results above are unaffected.
- The DevLog G3 gate did not catch it: symmetric doping (smaller spillover) and a 1 % tolerance.
- Fix: for two contacts use C' = q |d integral(n) dA / dV| (check against the hole integral) plus the derivative of
  the metal charge on insulator faces; for more contacts compute C_kl from a small-signal (j omega) solve or from the
  contact-current charge partition. Add a gate: asymmetric 1D junction at 0 V and +0.3 V vs K10, and PIN diffusion
  capacitance vs q d(int n)/dV; label forward-bias C' as diffusion capacitance.

### D2 (medium) Linear-response C' diagnostic is wrong; the "open item" is an artefact; tangent failures are silent

- Code: semi-stage.mjs:97-113 evaluates the tangent by central difference of the nonlinear Slotboom map
  (`moveAlong`) at hl = 1e-4 dv; `tg.converged` is never checked.
- Evidence:
  - K11 Si-only, -2 V (`scripts/linfd.mjs`): Newton-converged finite-difference C' for dv = 0.5, 1, 2, 5, 10, 20 mV
    agree to 2e-6 and equal q d(int n)/dV to 4e-8, so the finite difference is right.
  - Same state, tangent C' vs step h (`scripts/linh.mjs`): h = 1e-7: -6.9e-4; 2e-7: +3.4e-4 (the stage value);
    1e-6: +1.4e-4; 1e-5: +1.9e-2; 1e-4: +1.87; 1e-3: x187. The error grows as h^2 above 1e-6 V (nonlinear map with
    very large tangent components) and is round-off dominated below (charge sums of order q 1e20 cm^-3 x area).
  - K10 with bias list 0, 2, 4 V (`scripts/tangent.mjs`): tangent GMRES at 2 V did not converge (150 iterations,
    after a refactor); the stage reports linearResponseCFPerM -1.55e-10 F/m (fdVsLinearRel -1.06) with no flag.
- Fix: compute the linear response as the exact linear functional (dQ_c/dx) . z, or drop it; propagate
  `tg.converged` and the GMRES residual into the point; close the DevLog open item as a diagnostic artefact.

### D3 (medium) No automated engine gate against K10-K12

- `npm run test:reference` has 11 tests, none for S8; `reference-cases.test.mjs` reads K1-K7 only. The mapping above
  exists only in the audit scratchpad.
- Fix: add the K10-K12 engine configs (from this mapping, once T4/T5 agree on the contact representation) and a
  reference test with tolerances (K10 C' at 0 V after D1, K11 Si-only C', dn_eff, VpiL for both models, K12 J and
  centre densities); use the round-2 files, Si-only C' as the primary C' gate and oxide C' only on the recorded
  zero-flux domain with matched contacts (after D11).

### D4 (low) Push-pull halving of the secant VpiL

- semi-stage.mjs:185-190 halves the secant VpiL from V0. With V0 = 0 V this implies the second arm swings from 0 to
  +V (forward), which a depletion shifter does not do, and the response is not odd in V. The halving is only
  meaningful for the differential VpiL about a reverse DC bias (both arms at V_DC -+ v).
- Fix: apply `push_pull` only to the differential VpiL, or compute the push-pull secant from the two actual arm
  biases (V_DC + v, V_DC - v, both reverse) and reject V_DC = V0 = 0.

### D5 (low) Convergence documentation vs code; unflagged GMRES failures

- DevLog-039 Numerics claims a scaled-residual criterion "below 1e-6 relative to the first residual"; `newton()`
  (solver.mjs:504-578) has only the update criterion and the quadratic termination.
- `significant()` comment (solver.mjs:596) says "1e-6 of the local |net doping| (or n_i)"; the code (602) uses
  1e-6 n_i^2 / max(|N|, n_i) (1e-6 of the equilibrium minority density). DevLog repeats the comment's version.
- A GMRES solve that fails after the refactor (solver.mjs:528-533) is used as the Newton step without a flag.
- Fix: implement or delete the residual claim; align the comment and DevLog; count GMRES failures in `stats`.

### D6 (low) "Current continuity" check is tautological; reverse currents are at the residual floor

- With one majority contact per carrier type, the majority residual is replaced by conservation (solver.mjs:741-753),
  so `checks.currentSumAPerM` is zero by construction (K12: 0 and -2e-16 of the maximum).
- In reverse bias the free-node residual sum equals the derived current: K11 -4 V (meshScale 0.7) derived -4.2e-16,
  free-residual sum -4.2e-16 (scaled), direct-vs-derived differences O(1) at every reverse bias of K10 and K11. The
  reported reverse currents (A/m) are therefore not resolved outside the 1D G7 case, and carry no flag (the K11 value is only of the same order as a hand estimate q n_i A_dep/(2 tau)).
- Fix: report the direct (unsubstituted) sum as the continuity check; flag currents whose |free residual sum| exceeds
  1e-3 of the derived value.

### D7 (low) Second-order material term inside a first-order perturbation

- optics.mjs:99 uses delta eps = (n_Si + dn + i dk)^2 - n_Si^2; the reference uses 2 n_Si (dn + i dk). The dn^2 term
  is second order while the second-order mode change is not included (the reference's direct re-solve shows
  -1.36e-4 at -4 V, ref-audit Q6). Effect: dn_eff -1.25e-4, alpha and d alpha -1.9e-4 relative on K11 (above).
- Fix: use the consistent first-order form (or state the choice and allow it in the gates).

### D8 (low) C' mesh behaviour and the G6 gate

- On the unstructured mesh C' changes non-monotonically at the 1e-4 level (K11 Si-only -4 V: -5.5e-5 at
  meshScale 1, -2.1e-4 at 0.7; the two contact mappings differ by up to 4.5e-4 at meshScale 1). The engine reports
  no mesh uncertainty. The rib G6 test passes C' with the escape `c2 < 1e-3 * c` (semi-rib.test.mjs:79).
- Fix: report C' with a 3-mesh spread or Richardson estimate; tighten or remove the escape.

### D9 (info) Caughey-Thomas driving force |E| along the edge

- Built-in fields at the p+/i and i/n+ steps reduce mobility where large drift and diffusion currents cancel; K12 J is
  0.07-0.36 % lower with the field model on. Documented choice (DevLog-039, `drivingForce` in the result); the
  reference's quasi-Fermi-gradient factor is >= 0.9946 in the central i region. Revisit if PIN results are gated
  at the 1e-3 level.

### D10 (low) `geometry.boundary` is ignored by the semiconductor stage

- `config.mjs:141-143` accepts `dirichlet` outer boundaries; the semi stage fixes psi only at electrode nodes
  (solver.mjs:57) and never reads `boundary`, so a Dirichlet box is silently treated as zero-flux.
- Fix: reject non-Neumann boundaries in `semiconductorOptions` or implement them.

### D11 (low-medium, shared code) meshScale does not refine the far-field mesh

- section.mjs `buildMesh`: `farEdge = Math.max(maxEdge, h.far_edge_um ?? diag / 12)`; `maxEdge` is scaled by
  `scale`, the `diag / 12` default is not. On K11 (diag 6.6 um) the far-field cap stays 0.55 um at every meshScale,
  so a meshScale study cannot converge fields that live in the oxide (the same failure mode as ref-audit Q1). K11 C'
  with oxide: +1.2e-3 / +1.1e-3 at meshScale 1 / 0.7 (-2 V) with the default, +4.5e-4 / +7.7e-4 with
  `far_edge_um: 0.1`. Affects every stage that uses meshScale for convergence (electrostatics, RF C'), not only S8.
- Fix: scale the default far-field cap with `scale` (and the grading), or require `far_edge_um` in convergence
  studies; re-check the existing meshScale convergence claims that involve far-field quantities.

## Suites and performance (item 5)

| Item | Claimed | Measured (2026-10-16 00:32-00:35 PDT) |
|---|---|---|
| `npm test` (sequential) | 297: 294 pass, 0 fail, 2 skipped, 1 todo | 304: 301 pass, 0 fail, 2 skipped, 1 todo (pre-existing D5); 82 s. The 7 extra tests come from other lanes; all S8 tests pass |
| `npm run test:reference` | 11/11 | 11/11 (no S8 test, D3) |
| G9 rib numbers | C 0.4290 / 0.3124 / 0.2633 / 0.2138 pF/mm, VpiL 1.259 / 1.442 / 1.741 V cm, dn_eff(2 V) mesh study 1.07287 / 1.07463 / 1.07485e-4 | identical in the suite log |
| P1 one bias point < 1 s (20k-node mesh) | 375-751 ms DD solve | DD solve 613 / 447 / 881 ms (1, 2, 4 V; the 4 V point is a 2 V step), 1158 ms with C' and R'; 21316 semiconductor / 30306 total nodes. Holds for the DD solve on a shared machine; not with C' included |
| K11 mapped run (9 biases, optics) | - | 3.9 s at 21k nodes, 8.4 s at 39k nodes, peak RSS 0.39 / 0.58 GB |

Logs: session scratchpad `t4audit/engine-test-20261016T003255.log`, `t4audit/engine-ref-*.log` (not in the repo).

## Not checked

- Gaussian / erfc implant profiles, lateral erf windows, 1310 nm rows, `density_basis: change`, the parametric
  sweep path and the `semi` dataset contents beyond what the suite asserts.
- Direct optical re-solve with the perturbed permittivity (the reference covers it, ref-audit Q6).
- K11 against the round-2 reference (in progress at audit time; command above).
