---
title: L-PARAM audit - material library, configs, params, templates, sweeps, field export
date: 2026-10-14
auditor: fresh-context Claude subagent
scope: DevLog-026 claims; engine/src/{config,materials,run,stages,eo-overlap,rf-line,params,templates,sweep,fields}.mjs; engine/data/materials.json; engine/schema/sim.schema.json; engine/cli.mjs; new tests; changed sims/*/config.yaml (working tree vs HEAD 365519a)
---

# L-PARAM audit (DevLog-023 O5)

Read-only on code and data; only this file was written in the repo. All runs: Node 23.7.0, `nice -n 10`,
`--max-old-space-size=1536`, one process at a time. HEAD comparisons used `git archive HEAD engine sims` extracted to
the session scratchpad (no worktree, no git state change), plus a hybrid engine (working-tree L-PARAM files + HEAD
solver files) to separate L-PARAM from L-PERF effects.

Result: 0 blocking, 4 major, 9 minor, 6 notes. The headline claims reproduce: tests green, gate table, sweeps,
40-config regression split (17 / 18 / 5), template equivalence. The arm windows, Vpi conventions, the crystal-frame
mapping and the cache-invalidation logic are correct. The defects are in data provenance: one config has a false
"no loss tangent stated" note that lets an RF-loss target pass, one library locator could not be found in its cited
table, one target cites an empty devices field, and the DevLog progress timestamps are later than the files they
describe.

## Reproduction summary

| Claim (DevLog-026) | Audit result | Evidence |
|---|---|---|
| Test suite green | 184 tests, 183 pass, 0 fail, 1 todo (D5). The lane reported 174 because other lanes added tests since. | `node --test --test-concurrency=1 tests/*.test.mjs`, 15.95 s |
| Gate mao2022 | VpiL 2.797 V cm, Vpi 4.66 V, balance -1.0006, n_RF 2.354, Z0 41.98, n_eff 2.1361, ng 2.611, Wheeler spread 0.0155 | CLI, all 4 stages, 1.73 s wall |
| Gate renaud2023 | VpiL 0.6254, Vpi 0.6254, balance -1.0000, n_RF 2.394, Z0 34.22, n_eff 1.9724, ng 2.368 | 0.75 s wall |
| Gate arabjuneghani2022 | VpiL 3.978, Vpi 7.96, balance -0.9998, n_RF 2.160, Z0 51.55, ng 2.2307, rf_loss@67 GHz 4.316 dB/cm (pass, flagged spread 0.0173) | 1.64 s wall |
| renaud2023 gap sweep | Vpi 0.5097 / 0.6254 / 0.8661 / 1.1192 V at 2.5 / 3 / 4 / 5 um; 3 pass, 1 fail; every point remeshes | 2.61 s wall (lane: 2.66 s) |
| renaud2023 wavelength sweep | Vpi 0.4133 / 0.5215 / 0.6254 / 0.7341 / 0.8499 V at 532-938 nm; points 2-5 reuse mesh + ES (identical geometryHash/materialHash) | 2.27 s wall (lane: 2.25 s) |
| Other configs (spot check) | chen2026 2.6988, yang2022 2.5896, li2022b 0.86254, murai2025 2.5335, boynton2020 4.977, pan2021 4.204, zhang2022 2.1608 V cm: all equal to the DevLog table | CLI |
| 40-config regression | HEAD vs hybrid: 17 identical (metrics, errors, readiness), 18 with C' shifts (max relative 1.65e-3, lin2026a) and eo_overlap/rf_line readiness blocked -> ready, 5 newly parse (gao2024, meng2023, renaud2023, valdez2022, valdez2023; meng2023 then fails "electrodes 0 and 1 share an edge") | scratch `regress.mjs`, ES and ES+mode per config |
| Template rewrites reproduce old geometry | mao2022: every region/electrode polygon, domain, optical window, mesh hints identical to HEAD. arabjuneghani2022: identical except the substrate rectangle, HEAD y -252..-2 vs now -250..-2 (HEAD extended 2 um below the domain; clipped, metrics unaffected). Region names changed. | scratch `geomcmp.mjs` |
| Arm windows | All 19 two-arm configs: A = optical_window, A and B each enclose exactly the intended rib/strip polygon, no window intersects an electrode bbox, A and B disjoint, inside the domain | scratch `winchk.mjs` |
| vpi_convention vs devices.csv | All 19 cited rows match (mzm_push_pull, or no convention where the row is `unspecified` / `resonance_tuning_derived`: chen2023, qi2024, zhang2022) | python csv check |
| Crystal frame | x-cut/y-prop: lab eps diag [27.9, 44, 44], d(eps_xx)/E_x = -n_e^4 r33 exactly; z-cut/x-prop: lab eps [44, 27.9, 44], d(eps_yy)/E_y = -n_e^4 r33, d(eps_xx)/E_x = -n_o^4 r22. 3m Voigt fill matches the standard table. | node one-off |
| Cache reuse | wavelength-only: mesh+ES reused; RF-permittivity-only (scratch config with `eps_r: "=eps_ox"`): mesh reused, ES re-solved, C' 233.35 -> 248.05 -> 233.35 pF/m (returns bitwise); geometry: remesh | scratch sweep |
| Field export | ES: x, y, phi, nodeElectrode length nNodes (32768); tri 3 nTris; triRegion, ex, ey length nTris (63425); E = -grad phi on 654 sampled triangles, max relative error 2.3e-11; optical/arms psi length = optical nNodes; 23 transferable buffers (4.59 MB); after transfer the cache is intact; no `fields` key by default | scratch `fields.mjs` (renaud2023) |
| Expression parser | No eval/Function; `-2^2` = -4, `2^3^2` = 512, `2^-1` = 0.5, unknown names, `1/0`, `0^-1`, `sqrt(-1)`, `1e400`, `a.b`, `a[0]`, `%`, `**`, implicit multiplication, depth > 64 all rejected with positioned messages; cycles detected | scratch `expr.mjs` |

## Findings

### A1 major - zhang2022: "no loss tangent stated" is false; the rf_loss@250 GHz pass is not meaningful (owner L-PARAM)

Evidence: `sims/zhang2022/config.yaml` provenance `line.dielectric_loss_model: {note: "no loss tangent stated; dielectric
loss declared none ..."}` and limitation "dielectric_loss_model none is an assumption (no loss tangent stated)". The
paper text (`references/zhang2022/text.md` lines 488-502) fits alpha_c about 0.42 dB cm^-1 GHz^-1/2 and alpha_d about
0.025 dB cm^-1 GHz^-1, states an average dielectric loss tangent 0.012 for the line mode, and quotes 0.013 (Si), 0.008
(LN), 0.006 (SiO2). The pre-existing limitation in the same file already says "the dielectric loss tangent 0.012 the
authors extract is not an input". With the lane's edit rf_line became runnable and the target
`rf_loss_db_per_cm at_ghz 250, value 13` now passes with a conductor-only 12.27 dB/cm. From the paper's own fit the
conductor part at 250 GHz is about 0.42 x sqrt(250) = 6.6 dB/cm and the dielectric part about 0.025 x 250 = 6.3 dB/cm
(reader arithmetic). The engine's conductor-only value therefore lands near the total by about a factor 1.85 excess in
conductor loss, not by agreement.
Fix: correct the note; either declare `tan_delta_regions` with the paper's per-material values (paper_exact, p.4) or
mark the rf_loss target `comparable: false` while dielectric loss is declared none. Re-check the other 18 edited
configs for stated loss data. A grep of `references/<paper>/text.md` and `data/evidence/<paper>.yaml` for "loss
tangent / tan delta" found hits only in zhang2022.

### A2 major - materials.json `silicon.eps_r` locator not found in the cited table (owner L-PARAM)

Evidence: the library cites Zhu et al. 2021 (arXiv:2102.11956) "Table 1, Si row, column 'RF dielectric Constant'
(11.7)". The auditor downloaded the arXiv PDF and extracted the text with a stdlib zlib parser. The Table 1 rows
present are LiNbO3, LiTaO3, SiO2, alpha-quartz, SiNx, AlN, ZnO, GaAs/AlGaAs and Diamond. Neither "11.7" nor "3.48"
occurs anywhere in the extracted text, while the other rows' numbers do (Diamond 2.39 / 5.66, SiO2 1.44 / 3.9). The
extraction is lossy for symbol-font cells (the LN eps11,22 = 44 cell was not extracted either), so this is "not
found", not "proven absent".
Fix: open the PDF table by eye. If there is no Si row, cite a source that actually lists eps_r(Si), or keep 11.7 as a
per-config `standard_reference` with an honest locator. Until then, set `verification` to a value that does not
claim the table was read.

### A3 major - renaud2023 `z0_ohm` target cites an empty devices field (owner L-PARAM)

Evidence: the target `{metric: z0_ohm, value: 50, tol_abs: 5.0, source: {device_id: renaud2023-3um-738, field:
z0_ohm}}` cites `z0_ohm`, which is empty in data/devices.csv for every renaud2023 row. The paper says only "designed
with impedance close to 50 ohm" (p.2). The target evaluates to 34.2 ohm and fails, partly because the signal and
ground widths (50 um) are assumptions. DevLog-026 flags this for "the config owner", but L-PARAM owns `sims/*/config.yaml`
(DevLog-023 O4).
Fix: change the source to `{paper_id: renaud2023, locator: p.2, basis: design_intent}` and mark it `comparable: false`
(electrode widths not stated), or remove it.

### A4 major - DevLog-026 progress timestamps postdate the files they describe (owner L-PARAM)

Evidence: the progress log entries are stamped 2026-10-14 23:58, 2026-10-15 00:40, 01:05, 01:20 and 01:45 PDT, and the
gate table is headed "2026-10-15". The file's mtime is 2026-10-14 23:43 PDT, and the system clock read 2026-10-14
23:49:25 PDT during this audit. `engine/src/sweep.mjs` was saved at 23:19 and `sims/renaud2023/config.yaml` at 23:21.
DevLog-023 records the coordinator's hardware limits at 23:30, but DevLog-026 logs receiving them at "01:05". The
stamps are not real times. This breaks the project's rule against unsourced or invented values.
Fix: replace the stamps with real times, or mark them as approximate with the actual file times.

### A5 minor - Unit checker: false positive on unit conversion, false negative on mixed sums inside a quotient (owner L-PARAM)

Evidence (`params.mjs` `additiveUnits`): `x_um: "=w/1000"` with `w` in nm is rejected ("combines a parameter in nm
into a key in um"), even though it is a correct conversion. `"=0.001*w"` is rejected the same way. Meanwhile
`"=(g+w)/2"` with g in um and w in nm is accepted unchecked (`unitChecked: false`), although it is a genuine unit
error. Param `value` expressions are never unit-checked.
Fix: treat `ref/num` and `num*ref` as unit-preserving only when the number is 1. Otherwise mark the term unchecked or
allow a declared conversion. Recurse into parenthesised sums so that mixed units inside `( )` are caught.

### A6 minor - Template default optical window can cut the waveguide (owner L-PARAM)

Evidence: `expandTemplate` with gap = rib bottom width (1.346 um, 60 deg sidewall) is accepted. The default half width
min(gap/2 - 0.1, footprint + 2) = 0.573 um is narrower than the rib bottom half width 0.673 um, so the optical
window truncates the rib. The footprint check (`templates.mjs:125`) uses non-strict inequalities, so electrodes may
touch the rib corners.
Fix: fail when the default `hw <= halfFoot` (or `< halfFoot + margin`), and require a strict clearance between the
footprint and the electrodes.

### A7 minor - Template accepts an unetched film with no loading strip (no waveguide) (owner L-PARAM)

Evidence: `etch_depth_um: 0` without `loading_strip` and with `arms: push_pull` expands without error. The geometry
has no lateral guiding structure, so the "mode" is a slab mode confined by the window.
Fix: require `loading_strip` when `etch_depth_um` is 0, or label the case.

### A8 minor - Template `on_cladding`: the default window ignores the electrodes (owner L-PARAM)

Evidence: with `placement: on_cladding`, the clearance is Infinity (`templates.mjs:173`). A 0.5 um cladding from
film_top with a 5 um gap gives window x [-2.67, 2.67], y [-1.5, 1.6], while the signal electrode spans x [-22.5, -2.5],
y [1.1, 1.9]. The window therefore contains metal, and the error only appears later at the optical stage as a
metal-in-window rejection.
Fix: clip the default window height below `yE0`, or clip its width to the gap, for on_cladding.

### A9 minor - Template substrate polygon is not clipped to an explicit domain (owner L-PARAM)

Evidence: with an explicit `domain: {y_um: [-10, 10]}`, the substrate rect spans y -54.7..-4.7. arabjuneghani2022
previously (HEAD) extended 2 um below the domain. The downstream geometry clips, so there is no metric effect.
Fix: clip generated regions to the domain, or validate `-(box+sub) >= dom.y[0]`.

### A10 minor - LN eps locator overstates what the p.17 text says (owner L-PARAM)

Evidence: the library locator says "also p.17 text (eps_r,z = 28, eps_r,x/y = 44 for clamped, high-frequency
response)". The extracted p.17 sentence reads "...permittivity of LN, which is very high (eps_r,z = 28 and
eps_r,x/y = 44)" with no clamped label. The "(clamped, high-frequency response)" label appears in the Table 1 LN cell
next to eps33 = 27.9. Values confirmed: 27.9 (table), 28 and 44 (text). SiO2 3.9 is confirmed in Table 1. The LT
values listed under `missing` (38.3, 46.2; r 6.2, 0, 28.5, 8.4) and the mixed LN r set (9.6, 6.8, 30.9, 32.6) are
also confirmed.
Fix: drop "for clamped..." from the p.17 part of the locator.

### A11 minor - Library r51 = 28 pm/V "clamped": the cited source doubts it (owner L-PARAM)

Evidence: Veithen et al. arXiv:cond-mat/0311240v1, Table I (verified): clamped Exp. [22] r13 8.6, r33 30.8, r22 3.4,
r51 28; unclamped Exp. [22] 10.0, 32.2, 6.8, 32.6; [22] = Rauber 1978 (verified). The same page says the piezoelectric
contribution "was not entirely eliminated during the measurement of r51" and that the clamped value "might be closer
to the theoretical 14.94 pm/V". No effect on the scalar engine (r51 enters only off-diagonal terms, which are neglected).
It will matter for the L-VEC full-vector overlap.
Fix: add this caveat to the r51 `condition`.

### A12 minor - runSweepPoint silently lets swept values override fixed `params` (owner L-PARAM)

Evidence: `enumerateSweep` and `runSweep` reject a fixed param that is also swept (`sweep.mjs:137, 190`).
`runSweepPoint` does not: `{...params, ...values}` (`sweep.mjs:163`) drops the caller's value without an error. A
worker-pool caller (L-UI) gets a different result than `runSweep`.
Fix: apply the same check in `runSweepPoint`.

### A13 minor - Any free-text field starting with "=" becomes an expression (owner L-PARAM)

Evidence: `substituteExpressions` skips only `params, study, studies, provenance, missing, limitations` at the top
level. A `targets[].source.note`, `title` or `meta` string beginning with "=" throws a parse error (verified with
`meta.note: "=not an expression"`).
Fix: also skip `targets[].source`, `title`, `paper_id`, `device_id` and other free-text keys, or document the
restriction in the SPEC.

### A14 note - Vpi bias vs measured papers is not a convention error (physics sanity, item 6)

- The engine agrees with the papers' own simulated push-pull VpiL within about 4 %: boynton2020 4.977 vs 4.88
  (+2.0 %, paper Eq. (1) push-pull factor 2), pan2021 4.204 vs 4.06 (+3.5 %, paper VpiL = V lambda / (4 dn_eff)),
  murai2025 2.533 vs 2.5 (+1.3 %), li2022b 0.863 vs 0.90 (-4.2 %). A push-pull factor 2, per-arm length or voltage
  normalisation error would show as about 100 % or 50 % here.
- The engine's TE perturbation is d n_eff = int(d eps_xx psi^2) / (2 n_eff int psi^2), so d n_eff carries n_e^4 /
  n_eff rather than n_e^3. This makes the engine Vpi lower by about n_eff/n_e (0.87-0.90 here), the opposite sign of
  the observed bias.
- arabjuneghani2022: the auditor ran device #1 geometry by params (gap 5, D 0.6, Wc 12; window half width 1.7 to clear
  the signal edge; this window change moves device #2 VpiL from 3.9782 to 3.9792). Engine 2.307 V cm vs paper 2.2
  (+4.8 %); device #2 3.979 vs 3.3 (+20.6 %). Ratio engine 1.725 vs paper 1.50. The error is not uniform across the
  two gaps, which points to geometry inputs: the D definition ambiguity (already in limitations) and the 2 um BOX
  placeholder. A constant factor would affect both gaps equally.
- renaud2023: engine Vpi(5 um)/Vpi(2.5 um) = 2.196 vs paper 1.98 vs geometric 2.0; per-gap error +8.4 / +13.7 / +9.6 /
  +20.3 % (non-monotonic, consistent with measurement scatter plus geometry assumptions). Equivalent overlap at 3 um:
  Gamma = lambda g / (2 n_e^3 r33 VpiL) is about 0.55 (engine) vs 0.63 (paper) with n_e(738 nm) about 2.18, r33 30.8
  (reader arithmetic).
- mao2022: the paper's Eq. (2) assumes an "ideal uniform electric-field distribution" and uses Gamma = 73 % (fraction
  of optical power in LN, Eq. (1)) as the EO overlap. The engine's equivalent overlap is lambda g / (2 n_e^3 r33
  VpiL) = 0.549 (n_e 2.138, r33 31, g 6 um), against 0.81 implied by 1.9 V cm. Surface electrodes on a 700 nm unetched
  film do not give V/g through the film, so a large part of the +47 % is plausibly the paper's idealisation. This is
  an estimate, not a validation.
- Clamped library r33 (30.8) vs Vpi measured at 10 kHz to 1 MHz: the unclamped r33 32.2 (Veithen Table I) would lower
  Vpi by 4.3 %. This is already a recorded limitation.

### A15 note - Gold library value (owner L-PARAM)

1 / 2.214e-8 ohm m = 4.5167e7 S/m (arithmetic correct). The auditor could not re-read Matula 1979 Table 5: the NIST
PDF exceeds the 10 MB fetch limit, so the 2.214e-8 value is unverified here. "primary" is a fair label for an
evaluated reference compilation read directly.

### A16 note - renaud2023 rewrite faithful to the paper (owner L-PARAM)

Film 300 nm, etch 180 nm, slab 120 nm (generated), rib top 600 nm, Au 0.8 um, BOX 2 um and cladding about 1 um all
match `references/renaud2023/text.md` (p.2 text, Fig. 1(c) labels, Methods). The sweep_targets match data/devices.csv
exactly: gap 0.47 / 0.55 / 0.79 / 0.93 V; wavelength 0.42 / 0.45 / 0.55 / 0.85 / 0.80 V; all mzm_push_pull, 10 mm,
1 MHz. The rf_loss_law of 1.35 dB/cm/GHz^0.5 is confirmed on p.3. The gap sweep also widens the lateral domain
(margins are relative to the electrodes), a small confound already implicit in "grounds move with the gap".

### A17 note - Out-of-lane observations (owners as noted)

- `engine/node_modules/node_modules` is a self-referencing symlink created 2026-10-14 23:22 (engine dir mtime also
  23:22). It is untracked. The owner is unknown (some lane's work-copy setup). Remove it after confirming with the
  lanes.
- rf_line "vertex budget exceeded" for li2026aa, lin2025 and qi2024 (Wheeler recessed solves) was not re-run here
  (memory budget). Owner L-PERF.
- meng2023 "electrodes 0 and 1 share an edge" reproduced. It is a config geometry issue that the old parse failure
  hid. Owner L-PARAM, as config owner.
- The session scratchpad is shared by all lanes and auditors. During this audit another process deleted every file in
  it, and this auditor's HEAD extraction overwrote another agent's `scratchpad/head/` copy with HEAD content. Lanes
  should use uniquely named subfolders and never wipe the scratchpad root. Owner: coordinator.

### A18 note - Constants with the same name and different meaning

`config.mjs` `MAX_SWEEP_POINTS = 4001` (RF frequency sweep) vs `sweep.mjs` `MAX_SWEEP_POINTS = 2000` (parametric
points). Not a bug; rename one to avoid confusion (L-PARAM).

### A19 note - Canonical case K4 vs library

DevLog-023 O3 K4 uses r33 30.9, r13 9.6, r22 6.8, r51 32.6 (the Zhu Table 1 mixed set). The library uses Veithen's
clamped set (30.8, 8.6, 3.4, 28). Engine-vs-reference comparisons on K4 must pass the case inputs, not
`library: lithium_niobate_congruent` (L-REF / L-PARAM).

## Not checked

- Matula 1979 table page (fetch limit); Weis and Gaylord 1985 (not accessible).
- JSON-schema validation of every config. No validator is installed in the repo; the schema structure was read and
  contains `params`, `template`, `study`, `studies`, `library`, and the geometry-or-template rule.
- Heavy rf_line runs of li2026aa, lin2025, qi2024.

Scratch scripts and copies were kept in the scratchpad subfolder `lparam-audit/` and deleted at the end; no processes
were left running.
