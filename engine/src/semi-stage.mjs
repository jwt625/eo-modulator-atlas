// S8 semiconductor stage (DevLog-039): silicon PN/PIN phase-shifter cross-section by 2D drift-diffusion, small-signal
// C(V) and series R, plasma-dispersion coupling to the vector optical mode. Self-contained entry: the runner
// (run.mjs) does not dispatch it yet; call runSemiconductor(text | parsedConfig, options).
// License: GPL-3.0-or-later.

import { parseConfig, crossSectionOf, opticalOptions } from './config.mjs';
import { solveOptical } from './optical-stage.mjs';
import { semiconductorOptions } from './semi/config.mjs';
import { buildDeviceMesh, buildDevice } from './semi/device.mjs';
import { DriftDiffusion } from './semi/solver.mjs';
import { seriesResistance, rcCornerHz } from './semi/smallsignal.mjs';
import { plasmaRow, SPROUL_GREEN_1991, MASETTI_1983, CAUGHEY_THOMAS_1967 } from './semi/models.mjs';
import { prepareOpticalCoupling, nodalPlasma, modalResponse } from './semi/optics.mjs';
import { semiDataset } from './semi/dataset.mjs';
import { enumerateSweep } from './sweep.mjs';

export const SEMI_LABELS = Object.freeze(['drift_diffusion_2d_steady_state', 'boltzmann_statistics', 'full_ionisation', 'no_bandgap_narrowing', 'no_auger', 'ohmic_contacts_ideal', 'no_interface_charge']);

/**
 * Run the semiconductor stage.
 * @param {string|any} input YAML text or a parseConfig() result
 * @param {{section?:string, meshScale?:number, params?:Record<string,number>, optics?:boolean,
 *   datasets?:'none'|'reference'|'all', onProgress?:(m:string)=>void, keep?:boolean, meshCheck?:number|null}} [options]
 *   datasets: which bias points carry the `semi` dataset (typed arrays); keep: attach the solver (non-enumerable,
 *   `internals.semi.datasetAt(k)` builds the dataset of bias point k, -1 = reference); meshCheck: run the stage again
 *   at meshScale * meshCheck and report the per-point relative differences (mesh-uncertainty estimate, audit D8).
 *   testHooks: test-only switches ({tangentFail: true} treats the tangent predictor as unconverged, audit R11).
 */
export function runSemiconductor(input, { section: name = 'geometry', meshScale = 1, params = {}, optics: withOptics = true, datasets = 'none', onProgress = () => {}, keep = false, meshCheck = null, testHooks = {} } = {}) {
  const t0 = performance.now();
  const config = typeof input === 'string' ? parseConfig(input, { params }) : input;
  if (!Object.hasOwn(config.geometries, name)) throw new Error(`Unknown cross-section: ${name}`);
  if (!['none', 'reference', 'all'].includes(datasets)) throw new Error('datasets must be none, reference or all');
  if (meshCheck != null && !(typeof meshCheck === 'number' && meshCheck > 0.3 && meshCheck < 1)) throw new Error('meshCheck must be a refinement factor between 0.3 and 1 (e.g. 0.7)');
  const opts = semiconductorOptions(config.raw, config.geometries[name], config.materials);
  const section = crossSectionOf(config, name);
  section.farScale = meshScale; // D11: the default far-field size cap follows the user mesh scale
  const timing = {};
  let tt = performance.now();
  onProgress('Meshing the device');
  const mesh = buildDeviceMesh(section, opts, { meshScale });
  timing.mesh_ms = performance.now() - tt;
  tt = performance.now();
  const dev = buildDevice(section, config.materials, opts, mesh);
  // audit R6: the terminal-charge C' (one carrier type enters per contact) holds for two contacts of opposite type only
  if (opts.smallSignal.capacitance && (dev.contactType.length !== 2 || dev.contactType[0] === dev.contactType[1])) throw new Error(`semiconductor.small_signal.capacitance: the two-terminal C' definition needs exactly two contacts of opposite doping type (got ${dev.contactType.length}: ${dev.contactType.join(', ')}); set capacitance: false (the multi-terminal capacitance matrix is not implemented)`);
  const dd = new DriftDiffusion(dev, opts.numerics);
  timing.setup_ms = performance.now() - tt;
  tt = performance.now();
  onProgress('Solving equilibrium');
  const eq = dd.solveEquilibrium();
  timing.equilibrium_ms = performance.now() - tt;
  // optical reference mode (bias independent; first-order perturbation per bias)
  let coupling = null, row = null, opticalDiag = null, solved = null, oo = null, opticalOverrides = [];
  if (withOptics && opts.optics) {
    tt = performance.now();
    onProgress('Solving the optical mode');
    oo = opticalOptions(config.raw);
    if (oo.solver !== 'vector') throw new Error('semiconductor optics needs optics.solver: vector');
    if (Math.abs(oo.lambda0Um - opts.optics.lambdaUm) > 1e-9) throw new Error('semiconductor.optics.wavelength_nm must equal optics.wavelength_nm (one mode solve per run)');
    const om = opticalMaterials(config);
    solved = solveOptical(section, om.materials, oo, { meshScale });
    opticalOverrides = om.overridden;
    coupling = prepareOpticalCoupling(dev, solved, opts.materialName);
    row = plasmaRow(opts.optics.model, opts.optics.lambdaUm);
    opticalDiag = { neff: solved.neff, teFraction: solved.diagnostics.teFraction, nNodes: solved.diagnostics.nNodes, nTris: solved.diagnostics.nTris, nDof: solved.diagnostics.nDof, window: solved.window, nSiliconQuadraturePoints: coupling.nPoints, nSilicon: coupling.nSi, labels: solved.labels };
    timing.optical_ms = performance.now() - tt;
  }
  const base = opts.contacts.map((c) => c.biasV);
  const swept = opts.bias?.contact ?? null;
  const values = opts.bias ? opts.bias.values : [null];
  const biasVec = (v) => base.map((b, k) => (k === swept && v != null ? v : b));
  const rampOpts = { maxStep: opts.numerics.rampStepV, forwardStep: opts.numerics.forwardRampStepV };
  const deltaEps = opts.optics?.deltaEps ?? 'first_order';
  // reference state (dN, dP, delta n_eff)
  const refV = opts.bias ? opts.bias.reference : null;
  const solvePoint = (v) => {
    const ts = performance.now();
    const steps = dd.rampTo(biasVec(v), rampOpts);
    const solve_ms = performance.now() - ts;
    const term = dd.terminals();
    return { steps, solve_ms, term };
  };
  tt = performance.now();
  onProgress('Ramping to the reference bias');
  const refSolve = solvePoint(refV);
  const reference = { n: Float64Array.from(dd.n), p: Float64Array.from(dd.p), state: dd.snapshot(), biasV: biasVec(refV) };
  const refPlasma = row ? nodalPlasma(dd, row) : null;
  const refModal = coupling ? modalResponse(coupling, refPlasma.dn, refPlasma.da, deltaEps) : null;
  // bias-induced material change vs the reference bias, in the basis the dn_eff perturbation integrates (round 4)
  const biasPlasmaOf = (pl) => {
    if (!pl || !refPlasma) return null;
    if (opts.optics.densityBasis === 'change') return nodalPlasma(dd, row, reference);
    return { dn: Float64Array.from(pl.dn, (x, i) => x - refPlasma.dn[i]), da: Float64Array.from(pl.da, (x, i) => x - refPlasma.da[i]) };
  };
  timing.reference_ms = performance.now() - tt;
  const points = [];
  const states = [];
  const datasetList = [];
  for (const v of values) {
    const tp = performance.now();
    onProgress(`Bias ${v == null ? 'base' : v.toFixed(3) + ' V'}`);
    const gmresFail0 = dd.stats.gmresFailures ?? 0;
    const { steps, solve_ms, term } = solvePoint(v);
    const state = dd.snapshot();
    states.push(state);
    const bv = biasVec(v);
    const flags = [];
    if (!term.currentResolved) flags.push('contact_current_below_residual_floor');
    const pt = { biasV: bv, sweptBiasV: v, forwardBiasV: dd.forwardBias(bv), contacts: opts.contacts.map((c, k) => ({ electrode: c.electrode, biasV: bv[k], currentAPerM: term.contacts[k].currentAPerM, currentDirectAPerM: term.contacts[k].currentDirectAPerM, electronAPerM: term.contacts[k].electronAPerM, holeAPerM: term.contacts[k].holeAPerM, chargeCPerM: term.contacts[k].chargeCPerM, metalChargeCPerM: term.contacts[k].metalChargeCPerM, carrierChargeCPerM: term.contacts[k].carrierChargeCPerM, depletionChargeCPerM: term.contacts[k].depletionChargeCPerM })),
      checks: checksOf(term), newton: { rampSteps: steps.length, iterations: steps.reduce((a, s) => a + s.iterations, 0), gmres: steps.reduce((a, s) => a + (s.gmres ?? 0), 0), residualInf: steps.length ? steps[steps.length - 1].residualInf ?? null : null }, flags, timing: { solve_ms } };
    // small signal at this bias (audit D1, R3, R5): the +-dv/2 states of the swept contact give C' (terminal charge),
    // G' (contact current) and the small-signal dn_eff/dV, d alpha/dV (modal response), all by central difference
    const kC = swept ?? 0;
    if (opts.smallSignal.capacitance || coupling) {
      const ts = performance.now();
      const dv = opts.smallSignal.dv;
      // tangent dx/dV (one linear solve at the converged state) as the predictor of the +-dv/2 states; an unconverged
      // tangent solve is not used (plain bias step instead) and is flagged (audit D2)
      const tg = dd.tangent(kC);
      const tangentOk = tg.converged && !testHooks.tangentFail;
      if (!tangentOk) flags.push('tangent_predictor_unconverged');
      const at = (h) => {
        dd.restore(state);
        let ok = false;
        if (tangentOk) { dd.moveAlong(tg.z, kC, h); ok = dd.newton({ maxIt: 12 }).converged; }
        if (!ok) { dd.restore(state); const b = biasVec(v); b[kC] += h; dd.rampTo(b, { maxStep: Math.abs(h) * 1.01 }); }
        const t = dd.terminals();
        if (coupling) { const pl = nodalPlasma(dd, row); t.modal = modalResponse(coupling, pl.dn, pl.da, deltaEps); }
        return t;
      };
      const hi = at(0.5 * dv), lo = at(-0.5 * dv);
      dd.restore(state);
      const d = (f) => (f(hi) - f(lo)) / dv;
      if (opts.smallSignal.capacitance) {
        const c = d((t) => t.contacts[kC].chargeCPerM);
        const cs = d((t) => t.contacts[kC].depletionChargeCPerM);
        const cn = d((t) => t.electronChargeCPerM), cp = d((t) => t.holeChargeCPerM);
        if (pt.forwardBiasV > 0) flags.push('capacitance_includes_diffusion_charge');
        pt.capacitance = { cFPerM: c, cPfPerMm: c * 1e9, depletionCFPerM: cs, depletionCPfPerMm: cs * 1e9, metalCFPerM: d((t) => t.contacts[kC].metalChargeCPerM),
          // two-terminal check: q |d int n / dV| and q |d int p / dV| (equal without metal charge)
          electronIntegralCFPerM: Math.abs(cn), holeIntegralCFPerM: Math.abs(cp), dvV: dv, contact: opts.contacts[kC].electrode, contactType: dev.contactType[kC],
          method: 'central_difference of the terminal charge: metal (Poisson residual) charge of the contact + free carriers entering only through it (-q int n for an n-type contact, +q int p for p-type); quasi-static (charge-control) value in forward bias' };
        // audit R3: junction conductance G' = dI/dV of the swept contact (into the device), resolved only when the
        // contact currents of both states are above the residual floor
        const resolved = hi.currentResolved && lo.currentResolved;
        const g = d((t) => t.contacts[kC].currentAPerM);
        pt.conductance = { gSPerM: null, gTerminalSPerM: resolved ? g : null, resolved, rawGSPerM: g, method: 'G\'_t: central difference of the contact current over +-dv/2; G\'_j = G\'_t / (1 - R\' G\'_t) de-embeds the series path R\' (final audit A2)', ...(resolved ? {} : { reason: 'contact current below the Newton residual floor (reverse-bias leakage not resolved); G\' ~ 0 for the line model' }) };
        if (!resolved) flags.push('conductance_below_residual_floor');
      }
      if (coupling) {
        // audit R5: small-signal derivative at this bias, central difference over dv (truncation O(dv^2))
        const dn = d((t) => t.modal.dneff), da = d((t) => t.modal.lossDbPerCm);
        pt.smallSignalOptics = { dneffPerV: dn, dalphaDbPerCmPerV: da, dvV: dv, method: 'central difference of the modal response over the +-dv/2 states (truncation O(dv^2))' };
      }
      pt.timing.capacitance_ms = performance.now() - ts;
    }
    if (opts.smallSignal.seriesResistance && opts.contacts.length >= 2) {
      const ts = performance.now();
      const r = seriesResistance(dd, kC);
      pt.resistance = { rOhmM: r.rOhmM, rOhmMm: r.rOhmM * 1e3, rOhmCm: r.rOhmM * 1e2, method: r.method, nDepletedNodes: r.nDepleted };
      if (pt.capacitance) pt.rc = { fRcHz: rcCornerHz(r.rOhmM, pt.capacitance.cFPerM), fRcGhz: rcCornerHz(r.rOhmM, pt.capacitance.cFPerM) / 1e9, tauS: r.rOhmM * pt.capacitance.cFPerM };
      // final audit A2: the terminal G'_t contains the series path R'; the line model puts the junction G'_j || C'_j
      // behind R'_j, so at DC 1 / G'_t = R' + 1 / G'_j and G'_j = G'_t / (1 - R' G'_t)
      const gt = pt.conductance?.gTerminalSPerM;
      if (gt != null) {
        const x = r.rOhmM * gt;
        pt.conductance.rTimesGTerminal = x;
        if (x < 1) pt.conductance.gSPerM = gt / (1 - x);
        else { flags.push('junction_conductance_not_deembeddable'); pt.conductance.reason = "R' G'_t >= 1: the terminal conductance is limited by the series path; G'_j undefined"; }
      }
      pt.timing.resistance_ms = performance.now() - ts;
    }
    let plasma = null;
    if (coupling) {
      const ts = performance.now();
      plasma = nodalPlasma(dd, row);
      const m = modalResponse(coupling, plasma.dn, plasma.da, deltaEps);
      pt.optics = { dneffVsUndoped: m.dneff, dneff: m.dneff - refModal.dneff, lossDbPerCm: m.lossDbPerCm, dalphaDbPerCm: m.lossDbPerCm - refModal.lossDbPerCm, alphaPerM: m.alphaPerM, densityBasis: opts.optics.densityBasis, deltaEps };
      if (opts.optics.densityBasis === 'change') {
        const ch = nodalPlasma(dd, row, reference);
        const mc = modalResponse(coupling, ch.dn, ch.da, deltaEps);
        pt.optics.dneffAbsoluteBasis = pt.optics.dneff;
        pt.optics.dalphaDbPerCmAbsoluteBasis = pt.optics.dalphaDbPerCm;
        pt.optics.dneff = mc.dneff;
        pt.optics.dalphaDbPerCm = mc.lossDbPerCm;
      }
      // Nedeljkovic Table 1 caption density limits of the long-wavelength rows
      for (const lim of row.validity ?? []) {
        let mx = 0;
        for (let i = 0; i < dd.nN; i++) if (dev.isSemi[i]) mx = Math.max(mx, (lim.carrier === 'e' ? dd.n[i] : dd.p[i]) * dev.scale.C0);
        if (mx > lim.maxCm3) flags.push(`plasma_fit_${lim.coeff.join('')}_outside_${lim.carrier === 'e' ? 'electron' : 'hole'}_density_limit`);
      }
      pt.timing.optics_ms = performance.now() - ts;
    }
    if ((dd.stats.gmresFailures ?? 0) > gmresFail0) flags.push(`gmres_unconverged_${(dd.stats.gmresFailures ?? 0) - gmresFail0}`);
    if (datasets === 'all') datasetList.push(semiDataset(dd, { reference, plasma, biasV: pt.biasV, biasPlasma: biasPlasmaOf(plasma) }));
    pt.timing.total_ms = performance.now() - tp;
    points.push(pt);
  }
  if (datasets === 'reference') {
    dd.restore(reference.state);
    datasetList.push(semiDataset(dd, { reference, plasma: refPlasma, biasV: reference.biasV, biasPlasma: biasPlasmaOf(refPlasma) }));
  }
  if (coupling) addVpiL(points, opts, coupling.lambdaUm, refV);
  let check = null;
  if (meshCheck != null) {
    onProgress(`Mesh check at meshScale ${meshScale * meshCheck}`);
    const fine = runSemiconductor(config, { section: name, meshScale: meshScale * meshCheck, optics: withOptics, datasets: 'none' });
    check = meshCheckOf(points, fine.points, meshScale, meshScale * meshCheck, fine.mesh.nNodes, refV);
  }
  const targets = compareSemiTargets(opts.targets, points, opts);
  const result = {
    stage: 'semiconductor', id: config.raw.id, section: name, labels: [...SEMI_LABELS, ...(opts.temperatureK !== 300 && opts.material.mobility.doping !== 'constant' ? ['mobility_parameters_300k'] : []), ...(opts.material.mobility.doping === 'masetti_1983' ? ['masetti_total_impurity_density'] : []), ...(opts.mesh.semiEdgeUm ? [] : ['semiconductor_mesh_from_geometry_hints_check_debye_length']), ...(dev.stats.negativeEdgeWeights ? ['negative_box_edge_weights_clamped'] : []), ...(opts.poissonDomain === 'semiconductor' ? ['poisson_semiconductor_only_insulators_removed'] : []), ...(row && row.mismatchUm !== 0 ? ['plasma_dispersion_row_wavelength_mismatch'] : [])],
    models: modelSummary(opts, row),
    temperatureK: opts.temperatureK, niCm3: dev.scale.niCm3, thermalVoltageV: dev.scale.Vt,
    mesh: { ...dev.stats, meshScale },
    equilibrium: { iterations: eq.iterations, maxUpdateVt: eq.maxUpdate },
    reference: { biasV: reference.biasV, ...(refModal ? { lossDbPerCm: refModal.lossDbPerCm, dneffVsUndoped: refModal.dneff } : {}), newtonIterations: refSolve.steps.reduce((a, s) => a + s.iterations, 0) },
    optical: opticalDiag ? { ...opticalDiag, explicitIndexOverridesDispersion: opticalOverrides } : null, drive: opts.optics?.drive ?? null,
    sweep: opts.bias ? { contact: opts.bias.electrode, valuesV: opts.bias.values, referenceV: refV } : null,
    points, targets,
    targetSummary: { total: targets.length, evaluated: targets.filter((t) => t.status !== 'not_evaluated').length, passed: targets.filter((t) => t.status === 'pass').length, failed: targets.filter((t) => t.status === 'fail').length },
    meshCheck: check,
    solverStats: { ...dd.stats },
    timing: { ...timing, total_ms: performance.now() - t0 },
    ...(datasets !== 'none' ? { datasets: datasetList } : {}),
    // for the TWE line (T1): per-length C'(V) (D1 terminal-charge definition) and R'(V) of the swept contact
    perLength: points.map((p) => ({ biasV: p.sweptBiasV, forwardBiasV: p.forwardBiasV, cFPerM: p.capacitance?.cFPerM ?? null, rOhmM: p.resistance?.rOhmM ?? null, gSPerM: p.conductance?.gSPerM ?? null, dneffPerV: p.optics?.dneffPerV ?? null, flags: p.flags,
      note: "junction branch per length Y'(w) = (G' + j w C') / (1 + R' (G' + j w C')) (series R' with the shunt G' || C'); G' null = below the residual floor (reverse bias, take 0); forward-bias C' is the quasi-static (charge-control) value including the stored diffusion charge" })),
    operatingBiasV: opts.operatingBiasV,
  };
  if (keep) {
    // per-point globals (round 4): reference = the bias point at reference_v when it is in the sweep
    const globalsAt = (k) => {
      const p = k < 0 ? points.find((q) => q.sweptBiasV === refV) : points[k];
      const sw = swept ?? 0;
      return { dn_eff_per_v: p?.optics?.dneffPerV ?? NaN, G: p?.conductance?.gSPerM ?? NaN, operating_bias: p ? p.biasV[sw] : reference.biasV[sw] };
    };
    const datasetAt = (k) => {
      const saved = dd.snapshot();
      dd.restore(k < 0 ? reference.state : states[k]);
      const pl = row ? nodalPlasma(dd, row) : null;
      const ds = semiDataset(dd, { reference, plasma: pl, biasV: k < 0 ? reference.biasV : points[k].biasV, biasPlasma: biasPlasmaOf(pl) });
      dd.restore(saved);
      return ds;
    };
    Object.defineProperty(result, 'internals', { value: { dd, dev, coupling, opts, config, section, solved, opticalOpts: oo, semi: { datasetAt, globalsAt, nPoints: points.length, biasV: points.map((p) => p.biasV), referenceBiasV: reference.biasV, mesh: dev.mesh, geo: dev.geo, regionNames: dev.section.regions.map((r) => r.name), regionMaterials: dev.section.regions.map((r) => r.material) } }, enumerable: false, configurable: true });
  }
  return result;
}

/**
 * Materials of the stage's optical solve (final audit A8): a material whose config sets an explicit `n` uses that
 * constant index instead of its library dispersion (whose validity range may not cover the wavelength, e.g. the
 * Salzberg silicon Sellmeier from 1.357 um), provided the config gives a provenance entry `materials.<m>.n` or
 * `materials.<m>` with a locator or citation. Other stages keep the library-anchored behaviour (materials.mjs).
 */
function opticalMaterials(config) {
  const out = { ...config.materials };
  const overridden = [];
  for (const [name, m] of Object.entries(config.materials)) {
    const raw = config.raw.materials?.[name];
    if (raw?.n == null || !m.dispersionKey) continue;
    const pr = config.raw.provenance?.[`materials.${name}.n`] ?? config.raw.provenance?.[`materials.${name}`];
    if (!pr || !(pr.locator || pr.citation)) throw new Error(`materials.${name}.n: an explicit optical index replaces the library dispersion '${m.dispersionKey}' in the semiconductor stage and needs a provenance entry (provenance.materials.${name}.n or provenance.materials.${name}) with a locator or citation`);
    out[name] = { ...m, dispersionKey: null };
    overridden.push({ material: name, n: raw.n, replacedDispersion: m.dispersionKey });
  }
  return { materials: out, overridden };
}

function checksOf(term) {
  const I = term.contacts.map((c) => c.currentAPerM);
  const Q = term.contacts.map((c) => c.metalChargeCPerM);
  const iMax = Math.max(...I.map(Math.abs));
  const qSum = Q.reduce((a, v) => a + v, 0) + term.spaceChargeCPerM;
  const qMax = Math.max(...Q.map(Math.abs), Math.abs(term.spaceChargeCPerM), ...term.contacts.map((c) => Math.abs(c.depletionChargeCPerM)));
  const md = term.majorityDerivation;
  // audit D6 / R10: the continuity check is the direct (unsubstituted) majority-carrier residual vs conservation; it is
  // meaningful only when the derived current is resolved (forward bias), otherwise null
  const cont = term.currentResolved ? ['n', 'p'].map((c) => md[c]).filter(Boolean) : [];
  return {
    currentMaxAPerM: iMax, currentDirectSumAPerM: term.contacts.reduce((a, c) => a + c.currentDirectAPerM, 0),
    continuityRel: cont.length ? Math.max(...cont.map((d) => Math.abs(d.directVsDerivedRel ?? 0))) : null, currentResolved: term.currentResolved,
    chargeSumCPerM: qSum, chargeMaxCPerM: qMax, spaceChargeCPerM: term.spaceChargeCPerM, majorityDerivation: md,
  };
}

/**
 * VpiL (audits D4, R4, R5). Single arm, large signal: secant from the reference bias V0,
 * |V - V0| lambda / (2 |dn_eff(V) - dn_eff(V0)|). Single arm, small signal: lambda / (2 |d n_eff / dV|) with the
 * derivative at the bias from the +-dv/2 states (central, O(dv^2)). Push-pull (both arms reverse biased at the DC
 * point V_DC, +-v in opposite arms, Vpi = per-arm amplitude): lambda / (4 |d n_eff / dV|), only where V_DC is reverse
 * biased (forward bias < 0); at 0 V DC one arm would be forward biased, so it is null with the reason.
 */
function addVpiL(points, opts, lambdaUm, refV) {
  const lamCm = lambdaUm * 1e-4;
  for (const p of points) {
    if (!p.optics) continue;
    const dV = p.sweptBiasV == null ? 0 : Math.abs(p.sweptBiasV - refV);
    p.optics.vpilVcm = dV > 0 && p.optics.dneff !== 0 ? (dV * lamCm) / (2 * Math.abs(p.optics.dneff)) : null;
    const slope = p.smallSignalOptics?.dneffPerV ?? null;
    p.optics.dneffPerV = slope;
    p.optics.dalphaDbPerCmPerV = p.smallSignalOptics?.dalphaDbPerCmPerV ?? null;
    p.optics.vpilDifferentialVcm = slope ? lamCm / (2 * Math.abs(slope)) : null;
    if (slope && p.forwardBiasV < 0) p.optics.vpilPushPullVcm = lamCm / (4 * Math.abs(slope));
    else { p.optics.vpilPushPullVcm = null; p.optics.vpilPushPullReason = slope ? 'push-pull needs a reverse DC bias (forward bias < 0): at this DC point one arm would swing into forward bias' : 'no small-signal derivative'; }
    p.optics.vpilConventions = { vpilVcm: 'single_arm_secant_from_reference', vpilDifferentialVcm: 'single_arm_small_signal_central_dv', vpilPushPullVcm: 'push_pull_small_signal_both_arms_reverse_biased' };
  }
}

const METRIC_VALUE = {
  vpil_vcm: (p) => p.optics?.vpilVcm, vpil_differential_vcm: (p) => p.optics?.vpilDifferentialVcm, dneff: (p) => p.optics?.dneff,
  dalpha_db_per_cm: (p) => p.optics?.dalphaDbPerCm, loss_db_per_cm: (p) => p.optics?.lossDbPerCm, c_pf_per_mm: (p) => p.capacitance?.cPfPerMm,
  r_ohm_mm: (p) => p.resistance?.rOhmMm, f_rc_ghz: (p) => p.rc?.fRcGhz,
};

const PUSH_PULL = ['mzm_push_pull'];
const SINGLE = ['per_arm_phase_shifter', 'mzm_single_arm'];

/** Semiconductor targets: comparable, vpi_convention and reference handled as for config targets. */
function compareSemiTargets(targets, points, opts) {
  return targets.map((t) => {
    const nev = (reason) => ({ ...t, computed: null, status: 'not_evaluated', reason });
    if (t.source?.comparable === false) return nev('The config marks this target comparable: false (source.comparable).');
    if (t.metric === 'f_rc_ghz' && (t.reference === 'low_freq_unstated' || t.reference === 'unspecified')) return nev('Bandwidth reference unstated; f_RC is a single-pole RC corner.');
    const p = points.find((q) => q.sweptBiasV != null && Math.abs(q.sweptBiasV - t.at_bias_v) < 1e-9);
    if (!p) return nev('bias not in the sweep');
    let value;
    let convention = null;
    if (t.metric === 'vpil_vcm' || t.metric === 'vpil_differential_vcm') {
      const vc = t.vpi_convention ?? (opts.optics?.drive === 'push_pull' ? 'mzm_push_pull' : 'per_arm_phase_shifter');
      if (PUSH_PULL.includes(vc)) { value = p.optics?.vpilPushPullVcm; convention = p.optics?.vpilConventions?.vpilPushPullVcm ?? 'push_pull_small_signal_both_arms_reverse_biased'; }
      else if (SINGLE.includes(vc)) { value = METRIC_VALUE[t.metric](p); convention = t.metric === 'vpil_vcm' ? 'single_arm_secant_from_reference' : 'single_arm_small_signal_central_dv'; }
      else return nev(`vpi_convention ${vc} is not computed by the semiconductor stage (per_arm_phase_shifter, mzm_single_arm, mzm_push_pull are)`);
    } else value = METRIC_VALUE[t.metric](p);
    if (value == null || !Number.isFinite(value)) return nev('metric not computed at this bias');
    const tol = Math.max(t.tol_abs ?? 0, Math.abs(t.value) * (t.tol_rel ?? 0));
    return { ...t, computed: value, ...(convention ? { engineConvention: convention } : {}), error: value - t.value, relError: t.value !== 0 ? (value - t.value) / t.value : null, status: Math.abs(value - t.value) <= tol ? 'pass' : 'fail' };
  });
}

/** Per-point relative differences between two mesh levels (audit D8 mesh-uncertainty estimate). */
function meshCheckOf(coarse, fine, s0, s1, nFine, refV) {
  const rel = (a, b) => (a == null || b == null || !Number.isFinite(a) || !Number.isFinite(b) || b === 0 ? null : (a - b) / Math.abs(b));
  const rows = coarse.map((p, k) => {
    const f = fine[k];
    const isRef = p.sweptBiasV === refV; // dn_eff is identically zero at the reference bias (no relative value)
    return { biasV: p.sweptBiasV, cRel: rel(p.capacitance?.cFPerM, f?.capacitance?.cFPerM), rRel: rel(p.resistance?.rOhmM, f?.resistance?.rOhmM), dneffRel: isRef ? null : rel(p.optics?.dneff, f?.optics?.dneff), lossRel: rel(p.optics?.lossDbPerCm, f?.optics?.lossDbPerCm), vpilRel: rel(p.optics?.vpilVcm, f?.optics?.vpilVcm) };
  });
  const maxAbs = (k) => { const v = rows.map((r) => r[k]).filter((x) => x != null).map(Math.abs); return v.length ? Math.max(...v) : null; };
  return { meshScale: s0, refinedMeshScale: s1, refinedNodes: nFine, rows, maxRel: { c: maxAbs('cRel'), r: maxAbs('rRel'), dneff: maxAbs('dneffRel'), loss: maxAbs('lossRel'), vpil: maxAbs('vpilRel') }, note: 'difference to the refined run; an estimate of the discretisation error of the coarser run, not a bound' };
}

function modelSummary(opts, row) {
  const m = opts.material;
  return {
    intrinsicDensity: m.ni.model === 'configured' ? { model: 'configured', niCm3: m.ni.niCm3 } : { model: 'sproul_green_1991', locator: SPROUL_GREEN_1991.locator },
    mobility: { ...m.mobility, locator: m.mobility.doping === 'masetti_1983' ? MASETTI_1983.locator : m.mobility.doping === 'caughey_thomas_1967' ? CAUGHEY_THOMAS_1967.locator : 'configured constants', fieldLocator: m.mobility.field === 'caughey_thomas_1967' ? CAUGHEY_THOMAS_1967.locator : null, drivingForce: 'electric field component along the edge (lagged by one Newton iteration)' },
    recombination: m.srh ? { model: 'srh', tauNS: m.srh.tauN, tauPS: m.srh.tauP, trapLevelEv: m.srh.trapEv, locator: 'Shockley and Read, Phys. Rev. 87, 835 (1952), eq. (4.4)' } : { model: 'none' },
    plasmaDispersion: row ? { model: row.model, rowUm: row.rowUm, mismatchUm: row.mismatchUm, mismatchEstimate: row.mismatchEstimate ?? null, locator: row.locator, densityBasis: opts.optics.densityBasis, deltaEps: opts.optics.deltaEps, definition: opts.optics.densityBasis === 'absolute' ? 'dn(V) = f(N(V), P(V)) - f(N(V0), P(V0)), fit applied to absolute free-carrier densities' : 'dn(V) = f(|N(V) - N(V0)|, |P(V) - P(V0)|) with the sign of each change' } : null,
    discretisation: 'Scharfetter-Gummel edge fluxes (IEEE TED 16, 64 (1969), eqs. (28), (29)) on the P1 box method',
  };
}

/**
 * Run the semiconductor stage at one point of a parametric study (study / studies blocks, sweep.mjs enumeration).
 * Errors are returned in the point, as sweep.runSweepPoint does.
 */
export function runSemiconductorSweepPoint(text, index, { study = null, params = {}, ...options } = {}) {
  const sw = enumerateSweep(text, { study, params });
  const pt = sw.points[index];
  if (!pt) throw new Error(`sweep point ${index} outside 0..${sw.nPoints - 1}`);
  const t0 = performance.now();
  try {
    const result = runSemiconductor(text, { ...options, params: { ...params, ...pt.values } });
    return { index, values: pt.values, result, error: null, elapsed_ms: performance.now() - t0 };
  } catch (e) {
    return { index, values: pt.values, result: null, error: e instanceof Error ? e.message : String(e), elapsed_ms: performance.now() - t0 };
  }
}
