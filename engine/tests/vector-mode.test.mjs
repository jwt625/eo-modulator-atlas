// Gates for the full-vector mode solver (DevLog-025): closed forms and 1D transcendental equations solved here,
// independent of the implementation. Element orders 1 and 2 are both gated. Numbers printed with VECTOR_VERBOSE=1.
// G5b and G6 are self-consistency gates (perturbation formula vs finite difference of the same solver); independent
// evidence for ng and the tensor overlap is the K2/K3/K4 comparison with L-REF (DevLog-025).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVectorModel, solveVectorModes, vectorEoOverlap, vectorPerturbation, selectVectorMode, vectorOpticalFields } from '../src/vector-mode.mjs';
import { geom, rect, mats, section } from './helpers.mjs';
import { deltaEpsLab, epsOptLab } from '../src/materials.mjs';

const verbose = !!process.env.VECTOR_VERBOSE;
const log = (...a) => verbose && console.log(...a);

// ---- closed forms -------------------------------------------------------------------------------------------

/** PEC rectangular guide a x b filled with index n: theta = beta^2 list (TE_mn: m,n not both 0; TM_mn: m,n >= 1). */
function pecBoxSpectrum(a, b, n, k0, maxIdx = 8) {
  const out = [];
  for (let m = 0; m <= maxIdx; m++)
    for (let q = 0; q <= maxIdx; q++) {
      if (m === 0 && q === 0) continue;
      const th = k0 * k0 * n * n - (m * Math.PI / a) ** 2 - (q * Math.PI / b) ** 2;
      out.push({ th, m, q, kind: 'TE' });
      if (m > 0 && q > 0) out.push({ th, m, q, kind: 'TM' });
    }
  return out.sort((x, y) => y.th - x.th);
}

/**
 * Symmetric slab, half-width d, fundamental even mode: u tan u = q sqrt(V^2 - u^2), u = kappa d,
 * q = 1 (E parallel to the interfaces) or n_c^2 / n_s^2 (E normal to the interfaces). Bisection.
 */
function slabNeff({ nc, ns, d, lambda, q }) {
  const k0 = (2 * Math.PI) / lambda;
  const V = k0 * d * Math.sqrt(nc * nc - ns * ns);
  let lo = 0, hi = Math.min(V, Math.PI / 2 - 1e-12);
  for (let i = 0; i < 200; i++) {
    const u = 0.5 * (lo + hi);
    if (u * Math.tan(u) > q * Math.sqrt(V * V - u * u)) hi = u;
    else lo = u;
  }
  const u = 0.5 * (lo + hi);
  return Math.sqrt(nc * nc - (u / (k0 * d)) ** 2);
}

/**
 * Precondition: the mesh conforms to a region polygon (mesh area of the region equals the polygon area). A missed
 * interface segment in the mesher shows up here instead of as a solver error (seen 2026-10-15 for some hints).
 */
function assertConforming(model, name, area) {
  const ri = model.regions.findIndex((r) => r.name === name);
  let a = 0;
  for (let t = 0; t < model.mesh.nTris; t++) if (model.mesh.triRegion[t] === ri) a += model.area[t];
  assert.ok(Math.abs(a - area) < 1e-9 * Math.max(1, area), `mesh does not conform to region ${name}: area ${a} vs ${area}`);
}

const boxModel = (a, b, n, h, extra = {}) => {
  const g = geom({ domain: { x: [0, a], y: [0, b] }, regions: [{ name: 'core', material: 'core', poly: rect(0, a, 0, b) }], optical_window: { x: [0, a], y: [0, b] } });
  return buildVectorModel(section(g), mats({ core: { n, eps_r: 2 } }), { lambda0Um: 1, order: 1, sizing: 'scalar', hints: { core_edge_um: h, max_edge_um: h }, ...extra });
};

// ---- G1 PEC rectangular waveguide ------------------------------------------------------------------------------

for (const [order, hs, lo, hi, finest, factorization] of [[1, [0.1, 0.05, 0.025], 1.7, 2.4, 2e-4, 'uplooking'], [2, [0.4, 0.2, 0.1], 3.5, 4.6, 5e-6, 'supernodal']]) {
  test(`G1 order ${order}: PEC rectangular guide, first 8 beta^2 vs TE/TM closed forms, observed order ${order === 1 ? 2 : 4}`, () => {
    const a = 2, b = 1, n = 1.5, lam = 1, k0 = 2 * Math.PI;
    const exact = pecBoxSpectrum(a, b, n, k0);
    const errs = [];
    for (const h of hs) {
      const r = solveVectorModes(boxModel(a, b, n, h, { order, factorization, ordering: factorization === 'uplooking' ? 'nd' : 'amd' }), lam, { numModes: 8, blockSize: 2, fields: false });
      assert.ok(r.converged);
      for (const m of r.modes) assert.ok(m.residual < 1e-6, `residual ${m.residual}`);
      errs.push(r.modes.map((m, i) => (m.theta - exact[i].th) / exact[i].th));
      log(`G1 order ${order} h=${h} dof=${r.stats.dof}`, errs.at(-1).map((v) => v.toExponential(2)).join(' '));
    }
    for (let i = 0; i < 8; i++) {
      const p = Math.log2(Math.abs(errs[1][i]) / Math.abs(errs[2][i]));
      assert.ok(p > lo && p < hi, `mode ${i} observed order ${p}`);
      assert.ok(Math.abs(errs[2][i]) < finest, `mode ${i} finest rel. error ${errs[2][i]}`);
    }
  });
}

test('G1b mirror symmetry: PMC plane keeps m odd, PEC plane keeps m even (half of the PEC guide)', () => {
  const a = 2, b = 1, n = 1.5, lam = 1, k0 = 2 * Math.PI;
  const exact = pecBoxSpectrum(a, b, n, k0);
  for (const [condition, parity] of [['pmc', 1], ['pec', 0]]) {
    const r = solveVectorModes(boxModel(a, b, n, 0.1, { order: 2, mirror: { xUm: 1, keep: 'right', condition } }), lam, { numModes: 4, blockSize: 2, fields: false });
    const ex = exact.filter((m) => m.m % 2 === parity).slice(0, 4);
    r.modes.forEach((m, i) => assert.ok(Math.abs(m.theta - ex[i].th) / ex[i].th < 1e-5, `${condition} mode ${i}: ${m.theta} vs ${ex[i].th} (${ex[i].kind}${ex[i].m}${ex[i].q})`));
    log(`G1b ${condition}`, r.modes.map((m, i) => `${ex[i].kind}${ex[i].m}${ex[i].q} ${(m.theta / ex[i].th - 1).toExponential(2)}`).join(', '));
  }
});

// ---- G2 symmetric dielectric slab ----------------------------------------------------------------------------

function horizontalSlab(sides, order) {
  const g = geom({ domain: { x: [0, 0.2], y: [-4, 4] },
    regions: [{ name: 'clad', material: 'clad', poly: rect(0, 0.2, -4, 4) }, { name: 'core', material: 'core', poly: rect(0, 0.2, -0.3, 0.3) }],
    optical_window: { x: [0, 0.2], y: [-4, 4] } });
  const model = buildVectorModel(section(g), mats({ core: { n: 2, eps_r: 4 }, clad: { n: 1.45, eps_r: 2 } }), {
    lambda0Um: 1.55, order, boundary: { left: sides, right: sides, top: 'pec', bottom: 'pec' }, sizing: 'scalar', hints: { core_edge_um: order === 1 ? 0.02 : 0.05, max_edge_um: order === 1 ? 0.1 : 0.08 } });
  assertConforming(model, 'core', 0.2 * 0.6);
  return model;
}

for (const [order, tol] of [[1, 2e-4], [2, 2e-6]])
  test(`G2 order ${order}: symmetric slab TE0 (PEC side walls) and TM0 (PMC side walls) vs the slab dispersion relation`, () => {
    const ref = { TE: slabNeff({ nc: 2, ns: 1.45, d: 0.3, lambda: 1.55, q: 1 }), TM: slabNeff({ nc: 2, ns: 1.45, d: 0.3, lambda: 1.55, q: (2 * 2) / (1.45 * 1.45) }) };
    for (const [pol, sides] of [['TE', 'pec'], ['TM', 'pmc']]) {
      const r = solveVectorModes(horizontalSlab(sides, order), 1.55, { numModes: 1, fields: false });
      const m = r.modes[0];
      log(`G2 order ${order} ${pol}: vector ${m.neff.toFixed(7)} exact ${ref[pol].toFixed(7)} diff ${(m.neff - ref[pol]).toExponential(2)} TEfrac ${m.teFraction.toFixed(4)} dof ${r.stats.dof}`);
      assert.ok(Math.abs(m.neff - ref[pol]) < tol, `${pol} ${m.neff} vs ${ref[pol]}`);
      assert.ok(pol === 'TE' ? m.teFraction > 0.999 : m.teFraction < 1e-3);
    }
  });

// ---- G3 audit D5: laterally stratified slab ---------------------------------------------------------------------

function lateralSlab(topBottom, order) {
  const g = geom({ domain: { x: [-3, 3], y: [0, 0.3] }, regions: [{ name: 'clad', material: 'clad', poly: rect(-3, 3, 0, 0.3) }, { name: 'core', material: 'core', poly: rect(-0.3, 0.3, 0, 0.3) }],
    optical_window: { x: [-3, 3], y: [0, 0.3] } });
  const model = buildVectorModel(section(g), mats({ clad: { n: 1.45, eps_r: 2 }, core: { n: 2.2, eps_r: 4 } }), {
    lambda0Um: 1.55, order, boundary: { left: 'pec', right: 'pec', top: topBottom, bottom: topBottom }, sizing: 'scalar', hints: { core_edge_um: order === 1 ? 0.01 : 0.03, max_edge_um: 0.08 } });
  assertConforming(model, 'core', 0.6 * 0.3);
  return model;
}

for (const [order, tol] of [[1, 5e-4], [2, 1e-5]])
  test(`G3 order ${order}: audit D5 vertical-wall slab, E-normal 1.94848 (PMC top/bottom) and E-tangential 2.02969 (PEC top/bottom)`, () => {
    const nc = 2.2, ns = 1.45, d = 0.3;
    const normal = slabNeff({ nc, ns, d, lambda: 1.55, q: (nc * nc) / (ns * ns) });
    const tangential = slabNeff({ nc, ns, d, lambda: 1.55, q: 1 });
    // audit Q2 F1 text values (5 decimals)
    assert.ok(Math.abs(normal - 1.94848) < 1e-5 && Math.abs(tangential - 2.02969) < 1e-5);
    const en = solveVectorModes(lateralSlab('pmc', order), 1.55, { numModes: 1, fields: false }).modes[0];
    const et = solveVectorModes(lateralSlab('pec', order), 1.55, { numModes: 1, fields: false }).modes[0];
    log(`G3 order ${order} E-normal ${en.neff.toFixed(7)} exact ${normal.toFixed(7)} (${(en.neff - normal).toExponential(2)}), TEfrac ${en.teFraction.toFixed(4)}`);
    log(`G3 order ${order} E-tangential ${et.neff.toFixed(7)} exact ${tangential.toFixed(7)} (${(et.neff - tangential).toExponential(2)}), TEfrac ${et.teFraction.toFixed(4)}`);
    assert.ok(Math.abs(en.neff - normal) < tol, `E-normal ${en.neff} vs ${normal}`);
    assert.ok(Math.abs(et.neff - tangential) < tol, `E-tangential ${et.neff} vs ${tangential}`);
    assert.ok(en.teFraction > 0.999, 'E-normal mode is E_x (quasi-TE) dominated');
    assert.ok(et.teFraction < 1e-3, 'E-tangential mode is E_y dominated');
  });

// ---- G4 no spurious modes -------------------------------------------------------------------------------------

for (const [order, h] of [[1, 0.05], [2, 0.2]])
  test(`G4 order ${order}: no spurious modes, 14 PEC-guide eigenvalues match the analytic list one-to-one; Sylvester count agrees`, () => {
    const a = 2, b = 1, n = 1.5, lam = 1, k0 = 2 * Math.PI;
    const exact = pecBoxSpectrum(a, b, n, k0);
    const thCheck = 0.5 * (exact[13].th + exact[14].th); // check level inside a gap of the analytic list
    const r = solveVectorModes(boxModel(a, b, n, h, { order }), lam, { numModes: 14, blockSize: 2, fields: false, inertiaCheckN: Math.sqrt(thCheck) / k0 });
    r.modes.forEach((m, i) => {
      const near = exact.slice(0, 20).reduce((best, e) => (Math.abs(e.th - m.theta) < Math.abs(best.th - m.theta) ? e : best));
      assert.equal(near.th, exact[i].th, `mode ${i}: ${m.theta} nearest analytic ${near.th}, expected ${exact[i].th}`);
      assert.ok(Math.abs(m.theta - exact[i].th) / Math.abs(exact[i].th) < 5e-3);
    });
    assert.equal(r.inertia.eigenvaluesAboveShift, 0, 'no eigenvalue above the shift');
    assert.equal(r.inertia.check.eigenvaluesAbove, 14, 'Sylvester count of eigenvalues above the check level');
    log(`G4 order ${order} inertia: above shift ${r.inertia.eigenvaluesAboveShift}, above check ${r.inertia.check.eigenvaluesAbove} (analytic 14)`);
  });

test('G4b dielectric guide: Sylvester count of modes above n_clad equals the number of guided modes found', () => {
  // Si-like strip in silica (illustrative isotropic indices), small window
  const g = geom({ domain: { x: [-1.5, 1.5], y: [-1.5, 1.5] }, regions: [{ name: 'clad', material: 'clad', poly: rect(-1.5, 1.5, -1.5, 1.5) }, { name: 'core', material: 'core', poly: rect(-0.25, 0.25, -0.11, 0.11) }],
    optical_window: { x: [-1.5, 1.5], y: [-1.5, 1.5] } });
  const model = buildVectorModel(section(g), mats({ clad: { n: 1.444, eps_r: 4 }, core: { n: 3.4777, eps_r: 12 } }), { lambda0Um: 1.55, sizing: 'scalar', hints: { core_edge_um: 0.06, max_edge_um: 0.25 } });
  // check level 1.45: above the cladding index 1.444, below every guided mode (audit V2: not on a material index)
  const r = solveVectorModes(model, 1.55, { numModes: 6, fields: false, inertiaCheckN: 1.45 });
  const guided = r.modes.filter((m) => m.neff > 1.45).length;
  log(`G4b n_eff ${r.modes.map((m) => m.neff.toFixed(5)).join(' ')}; Sylvester above 1.45 ${r.inertia.check.eigenvaluesAbove}, perturbed pivots ${r.inertia.check.nPerturbed}`);
  assert.equal(r.inertia.check.nPerturbed, 0);
  assert.ok(r.inertia.check.reliable && r.inertia.reliable);
  assert.equal(r.inertia.check.eigenvaluesAbove, guided);
  assert.ok(guided >= 2);
  // a level exactly on a material index is moved off it by 1e-6 relative and stays reliable
  const r2 = solveVectorModes(model, 1.55, { numModes: 1, fields: false, inertiaCheckN: 1.444 });
  assert.ok(Math.abs(r2.inertia.check.nCheckUsed / 1.444 - 1 - 1e-6) < 1e-12);
  assert.ok(r2.inertia.check.reliable, `perturbed pivots ${r2.inertia.check.nPerturbed}`);
  assert.equal(r2.inertia.check.eigenvaluesAbove, r.modes.filter((m) => m.neff > 1.444 * (1 + 1e-6)).length);
});

test('G4c warm and adaptive shifts: same modes as the default shift; a wrong warm hint falls back via the inertia count', () => {
  const g = geom({ domain: { x: [-1.5, 1.5], y: [-1.5, 1.5] }, regions: [{ name: 'clad', material: 'clad', poly: rect(-1.5, 1.5, -1.5, 1.5) }, { name: 'core', material: 'core', poly: rect(-0.25, 0.25, -0.11, 0.11) }],
    optical_window: { x: [-1.5, 1.5], y: [-1.5, 1.5] } });
  const model = buildVectorModel(section(g), mats({ clad: { n: 1.444, eps_r: 4 }, core: { n: 3.4777, eps_r: 12 } }), { lambda0Um: 1.55, sizing: 'scalar', hints: { core_edge_um: 0.06, max_edge_um: 0.25 } });
  const cold = solveVectorModes(model, 1.56, { numModes: 2, fields: false, adaptiveShift: false });
  const adaptive = solveVectorModes(model, 1.56, { numModes: 2, fields: false }); // n_max 3.48 vs TE0 2.44: refactors
  const base = solveVectorModes(model, 1.55, { numModes: 2, fields: false });
  const warm = solveVectorModes(model, 1.56, { numModes: 2, fields: false, warm: base.warm });
  const bad = solveVectorModes(model, 1.56, { numModes: 2, fields: false, warm: { neffMax: 2.0 } }); // shift 2.04 < TE0 2.44
  log(`G4c cold ${cold.stats.operatorApplications} ops, adaptive ${adaptive.stats.operatorApplications} ops, warm ${warm.stats.operatorApplications} ops (${warm.shift.source}), bad hint ${bad.shift.source}`);
  assert.equal(cold.shift.source, 'default');
  assert.equal(warm.shift.source, 'warm');
  assert.equal(bad.shift.source, 'warm_rejected_default');
  assert.equal(adaptive.shift.source, 'adaptive');
  assert.ok(adaptive.shift.adaptive.accepted && adaptive.shift.factorizations === 2);
  for (const r of [warm, bad, adaptive]) r.modes.forEach((m, i) => assert.ok(Math.abs(m.neff - cold.modes[i].neff) < 1e-10, `${r.shift.source} mode ${i}: ${m.neff} vs ${cold.modes[i].neff}`));
  assert.ok(warm.stats.operatorApplications < cold.stats.operatorApplications);
});

test('G10 auto (vector-tuned) sizing on an x-cut LN rib: n_eff within 2e-5 and EO dn within 1e-3 of a fine explicit mesh, far fewer DOF', () => {
  const lam = 1.55;
  const g = geom({ domain: { x: [-2, 2], y: [-1.5, 1.8] }, regions: [
    { name: 'air', material: 'air', poly: rect(-2, 2, -1.5, 1.8) },
    { name: 'box', material: 'sio2', poly: rect(-2, 2, -1.5, 0) },
    { name: 'slab', material: 'ln', poly: rect(-2, 2, 0, 0.3) },
    { name: 'rib', material: 'ln', poly: [[-0.6, 0.3], [0.6, 0.3], [0.45, 0.6], [-0.45, 0.6]] }],
  optical_window: { x: [-2, 2], y: [-1.5, 1.8] } });
  const M = mats({ air: { n: 1, eps_r: 1 }, sio2: { n: 1.444, eps_r: 3.9 }, ln: LN });
  const fine = buildVectorModel(section(g), M, { lambda0Um: lam, refine: [{ x: [-1.2, 1.2], y: [-0.4, 0.9], h_um: 0.06 }], cornerRefine: { h_um: 0.004, grade: 0.2 }, hints: { max_edge_um: 0.2 } });
  const auto = buildVectorModel(section(g), M, { lambda0Um: lam });
  assert.equal(auto.sizing.mode, 'auto');
  assertConforming(auto, 'rib', 0.5 * (1.2 + 0.9) * 0.3);
  const field = (model) => {
    const nT = model.mesh.nTris, F = new Float64Array(3 * nT), tri = model.mesh.tri;
    for (let t = 0; t < nT; t++) {
      const cx = (model.mesh.x[tri[3 * t]] + model.mesh.x[tri[3 * t + 1]] + model.mesh.x[tri[3 * t + 2]]) / 3;
      F[3 * t] = 1e6 * Math.exp(-cx * cx); F[3 * t + 1] = 2e5 * cx; // smooth lateral + vertical static field
    }
    return F;
  };
  const rf = solveVectorModes(fine, lam, { numModes: 2, fields: false }), ra = solveVectorModes(auto, lam, { numModes: 2, fields: false });
  const mf = selectVectorMode(rf, 'TE'), ma = selectVectorMode(ra, 'TE');
  const dnf = vectorEoOverlap(fine, mf, field(fine), lam).dneffPerV, dna = vectorEoOverlap(auto, ma, field(auto), lam).dneffPerV;
  log(`G10 fine dof ${rf.stats.dof} n_eff ${mf.neff.toFixed(8)} dn ${dnf.toExponential(6)}; auto dof ${ra.stats.dof} n_eff ${ma.neff.toFixed(8)} (${(ma.neff - mf.neff).toExponential(2)}) dn ${dna.toExponential(6)} (${(dna / dnf - 1).toExponential(2)}) ng ${ma.ng.toFixed(6)} vs ${mf.ng.toFixed(6)}; margin ${ma.windowMargin.powerFraction.toExponential(1)}`);
  assert.ok(Math.abs(ma.neff - mf.neff) < 2e-5);
  assert.ok(Math.abs(dna / dnf - 1) < 1e-3);
  assert.ok(ra.stats.dof < 0.7 * rf.stats.dof);
  assert.ok(ma.windowMargin.powerFraction < 1e-3);
});

// ---- G5 Pockels -----------------------------------------------------------------------------------------------

// Illustrative constants for the gate (round numbers; not material claims).
const LN = { crystal: { cut: 'x', propagation: 'y' }, n_o: 2.21, n_e: 2.14, eps_r: { perp: 44, par: 28 }, r_pm_per_v: { r13: 9.6, r22: 6.8, r33: 30.9, r51: 32.6 } };

for (const [order, tol] of [[1, 1e-3], [2, 1e-5]])
  test(`G5 order ${order}: uniform-field Pockels slab, dn = -n_e^3 r33 E / 2 times the overlap fraction (analytic slab mode)`, () => {
    const ne = 2.14, ns = 1.45, d = 0.3, lam = 1.55, E0 = 1e6; // V/m per volt
    const g = geom({ domain: { x: [0, 0.2], y: [-4, 4] },
      regions: [{ name: 'clad', material: 'clad', poly: rect(0, 0.2, -4, 4) }, { name: 'core', material: 'ln', poly: rect(0, 0.2, -d, d) }], optical_window: { x: [0, 0.2], y: [-4, 4] } });
    const model = buildVectorModel(section(g), mats({ clad: { n: ns, eps_r: 2 }, ln: LN }), { lambda0Um: lam, order, boundary: { left: 'pec', right: 'pec' }, sizing: 'scalar', hints: { core_edge_um: order === 1 ? 0.02 : 0.05, max_edge_um: order === 1 ? 0.1 : 0.08 } });
    assertConforming(model, 'core', 0.2 * 2 * d);
    const mode = solveVectorModes(model, lam, { numModes: 1, fields: false }).modes[0];
    // static field along lab x (crystal z) in the LN only
    const nT = model.mesh.nTris, F = new Float64Array(3 * nT);
    for (let t = 0; t < nT; t++) if (model.regions[model.mesh.triRegion[t]].name === 'core') F[3 * t] = E0;
    const eo = vectorEoOverlap(model, mode, F, lam);
    // analytic TE slab mode: E_x = cos(kappa y) (|y| < d), cos(kappa d) exp(-gamma (|y| - d)) outside
    const k0 = (2 * Math.PI) / lam;
    const neff = slabNeff({ nc: ne, ns, d, lambda: lam, q: 1 });
    const kappa = k0 * Math.sqrt(ne * ne - neff * neff), gamma = k0 * Math.sqrt(neff * neff - ns * ns);
    const core = d + Math.sin(2 * kappa * d) / (2 * kappa), clad = Math.cos(kappa * d) ** 2 / gamma;
    const Gamma = (ne / neff) * core / (core + clad);
    const dnBulk = -0.5 * ne ** 3 * 30.9e-12 * E0;
    const expected = dnBulk * Gamma;
    // independent check: finite difference of the slab dispersion in n_core
    const h = 1e-5;
    const dndn = (slabNeff({ nc: ne + h, ns, d, lambda: lam, q: 1 }) - slabNeff({ nc: ne - h, ns, d, lambda: lam, q: 1 })) / (2 * h);
    log(`G5 order ${order} vector ${eo.dneffPerV.toExponential(7)} analytic ${expected.toExponential(7)} FD-slab ${(dndn * dnBulk).toExponential(7)} Gamma ${Gamma.toFixed(6)} n_eff ${mode.neff.toFixed(7)} vs ${neff.toFixed(7)}`);
    assert.ok(Math.abs(eo.dneffPerV / expected - 1) < tol, `${eo.dneffPerV} vs ${expected}`);
    assert.ok(Math.abs(dndn * dnBulk / expected - 1) < 1e-6, 'overlap fraction equals the dispersion slope');
  });

/** delta eps (xx, xy, yy, zz) per triangle from materials.deltaEpsLab, for the finite-difference check. */
function eoDeltaEps(model, F, lam) {
  const nT = model.mesh.nTris, out = new Float64Array(4 * nT);
  for (let t = 0; t < nT; t++) {
    const m = model.mats[model.regions[model.mesh.triRegion[t]].material];
    if (!m.r) continue;
    const d = deltaEpsLab(m.r, m.A, epsOptLab(m, lam, model.lambda0Um), [F[3 * t], F[3 * t + 1], F[3 * t + 2]]);
    out[4 * t] = d[0]; out[4 * t + 1] = 0.5 * (d[1] + d[3]); out[4 * t + 2] = d[4]; out[4 * t + 3] = d[8];
  }
  return out;
}

for (const order of [1, 2])
  test(`G5b order ${order}: shear term (r51 via vertical field on x-cut LN) and full tensor, overlap equals finite difference of the eigenvalue`, () => {
    const lam = 1.55;
    const g = geom({ domain: { x: [-2, 2], y: [-1.5, 1.8] }, regions: [
      { name: 'air', material: 'air', poly: rect(-2, 2, -1.5, 1.8) },
      { name: 'box', material: 'sio2', poly: rect(-2, 2, -1.5, 0) },
      { name: 'slab', material: 'ln', poly: rect(-2, 2, 0, 0.3) },
      { name: 'rib', material: 'ln', poly: [[-0.6, 0.3], [0.6, 0.3], [0.45, 0.6], [-0.45, 0.6]] }],
    optical_window: { x: [-2, 2], y: [-1.5, 1.8] } });
    const model = buildVectorModel(section(g), mats({ air: { n: 1, eps_r: 1 }, sio2: { n: 1.444, eps_r: 3.9 }, ln: LN }), { lambda0Um: lam, order, refine: [{ x: [-1.2, 1.2], y: [-0.4, 0.9], h_um: order === 1 ? 0.06 : 0.12 }], hints: { max_edge_um: 0.3 } });
    assertConforming(model, 'rib', 0.5 * (1.2 + 0.9) * 0.3);
    assertConforming(model, 'slab', 4 * 0.3);
    const base = solveVectorModes(model, lam, { numModes: 2, fields: false });
    const mode = selectVectorMode(base, 'TE');
    const nT = model.mesh.nTris, F = new Float64Array(3 * nT);
    // vertical (lab y = crystal x) plus lateral field on the right half only: exercises r51 shear, r13, r33
    const tri = model.mesh.tri;
    for (let t = 0; t < nT; t++) {
      const cx = (model.mesh.x[tri[3 * t]] + model.mesh.x[tri[3 * t + 1]] + model.mesh.x[tri[3 * t + 2]]) / 3;
      if (cx > 0) { F[3 * t] = 2e5; F[3 * t + 1] = 1e6; }
    }
    const eo = vectorEoOverlap(model, mode, F, lam);
    // finite difference: eps -> eps + s * delta eps (4 per triangle) from the same per-triangle field
    const dEps = eoDeltaEps(model, F, lam);
    const s = 0.2; // delta eps ~1e-4: linear regime, eigenvalue change far above solver round-off
    const plus = solveVectorModes(model, lam, { numModes: 2, fields: false, epsDelta: dEps, epsDeltaScale: s, warm: base.warm });
    const minus = solveVectorModes(model, lam, { numModes: 2, fields: false, epsDelta: dEps, epsDeltaScale: -s, warm: base.warm });
    const fd = (selectVectorMode(plus, 'TE').neff - selectVectorMode(minus, 'TE').neff) / (2 * s);
    const shearOnly = new Float64Array(4 * nT);
    for (let t = 0; t < nT; t++) shearOnly[4 * t + 1] = dEps[4 * t + 1];
    const shear = vectorPerturbation(model, mode, shearOnly, lam);
    log(`G5b order ${order} overlap ${eo.dneffPerV.toExponential(6)} FD ${fd.toExponential(6)} rel ${(eo.dneffPerV / fd - 1).toExponential(2)}; shear-only part ${shear.toExponential(3)}`);
    assert.ok(Math.abs(eo.dneffPerV / fd - 1) < 1e-4, `${eo.dneffPerV} vs FD ${fd}`);
    assert.ok(Math.abs(shear) > 1e-3 * Math.abs(eo.dneffPerV), 'shear (delta eps_xy) contributes');
  });

// ---- G6 group index ----------------------------------------------------------------------------------------------

for (const order of [1, 2])
  test(`G6 order ${order}: group index by first-order perturbation with material dispersion equals the finite difference in wavelength`, () => {
    // library dispersion (Salzberg/Tatian Si, Malitson SiO2) via material names; anchored at 1.55 um
    const g = geom({ domain: { x: [-1.5, 1.5], y: [-1.5, 1.5] }, regions: [{ name: 'clad', material: 'silicon_dioxide', poly: rect(-1.5, 1.5, -1.5, 1.5) }, { name: 'core', material: 'silicon', poly: rect(-0.25, 0.25, -0.11, 0.11) }],
      optical_window: { x: [-1.5, 1.5], y: [-1.5, 1.5] } });
    const model = buildVectorModel(section(g), mats({ silicon_dioxide: { eps_r: 3.9 }, silicon: { eps_r: 11.7 } }), { lambda0Um: 1.55, order, sizing: 'scalar', hints: { core_edge_um: order === 1 ? 0.03 : 0.06, max_edge_um: 0.2 } });
    assertConforming(model, 'core', 0.5 * 0.22);
    const r = solveVectorModes(model, 1.55, { numModes: 1, fields: false });
    const h = 0.002;
    const lo = solveVectorModes(model, 1.55 - h, { numModes: 1, fields: false, warm: r.warm }).modes[0].neff;
    const hi = solveVectorModes(model, 1.55 + h, { numModes: 1, fields: false, warm: r.warm }).modes[0].neff;
    const ngFd = r.modes[0].neff - 1.55 * (hi - lo) / (2 * h);
    log(`G6 order ${order} ng perturbation ${r.modes[0].ng.toFixed(7)} FD ${ngFd.toFixed(7)} rel ${(r.modes[0].ng / ngFd - 1).toExponential(2)} n_eff ${r.modes[0].neff.toFixed(7)}`);
    assert.ok(Math.abs(r.modes[0].ng / ngFd - 1) < 1e-4);
    assert.ok(r.modes[0].ng > r.modes[0].neff + 1, 'strongly dispersive Si strip');
  });

// ---- G7 / G8 lossy (complex permittivity) ------------------------------------------------------------------------

test('G7 lossy PEC guide (eps = 2.25 - 0.05 j): complex beta^2 = k0^2 eps - kc^2 for the first 4 modes, degenerate pair kept', () => {
  const a = 2, b = 1, lam = 1, k0 = 2 * Math.PI, er = 2.25, el = 0.05;
  const g = geom({ domain: { x: [0, a], y: [0, b] }, regions: [{ name: 'core', material: 'fill', poly: rect(0, a, 0, b) }], optical_window: { x: [0, a], y: [0, b] } });
  const model = buildVectorModel(section(g), mats({ fill: { conductor: true } }), { lambda0Um: lam, metal: 'lossy', order: 2, refine: [{ x: [0, a], y: [0, b], h_um: 0.1 }], hints: { max_edge_um: 0.1 } });
  const r = solveVectorModes(model, lam, { numModes: 4, nTarget: 1.6, blockSize: 2, metalPermittivity: { fill: [er, el] } });
  const exact = pecBoxSpectrum(a, b, Math.sqrt(er), k0);
  assert.equal(r.modes.length, 4);
  r.modes.forEach((m, i) => {
    log(`G7 ${m.theta.toFixed(6)} ${m.thetaIm.toFixed(6)} exact ${exact[i].th.toFixed(6)} ${(-k0 * k0 * el).toFixed(6)} loss ${m.lossDbPerCm.toFixed(2)} dB/cm`);
    assert.ok(Math.abs(m.theta - exact[i].th) / exact[i].th < 1e-6, `Re theta ${m.theta} vs ${exact[i].th}`);
    assert.ok(Math.abs(m.thetaIm + k0 * k0 * el) < 1e-6 * k0 * k0, `Im theta ${m.thetaIm}`);
    assert.ok(m.lossDbPerCm > 0 && m.residual < 1e-6, `loss ${m.lossDbPerCm}, residual ${m.residual}`);
  });
});

test('G9 perturbation of a lossy mode (complex Hellmann-Feynman): TE10 of the lossy guide, d beta = k0^2 d eps_yy / (2 beta)', () => {
  const a = 2, b = 1, lam = 1, k0 = 2 * Math.PI, er = 2.25, el = 0.05;
  const g = geom({ domain: { x: [0, a], y: [0, b] }, regions: [{ name: 'core', material: 'fill', poly: rect(0, a, 0, b) }], optical_window: { x: [0, a], y: [0, b] } });
  const model = buildVectorModel(section(g), mats({ fill: { conductor: true } }), { lambda0Um: lam, metal: 'lossy', order: 2, refine: [{ x: [0, a], y: [0, b], h_um: 0.2 }], hints: { max_edge_um: 0.2 } });
  const m = solveVectorModes(model, lam, { numModes: 1, nTarget: 1.6, metalPermittivity: { fill: [er, el] } }).modes[0];
  const dEps = new Float64Array(4 * model.mesh.nTris);
  for (let t = 0; t < model.mesh.nTris; t++) dEps[4 * t + 2] = 1e-4; // uniform delta eps_yy (TE10 has E_y only)
  const dn = vectorPerturbation(model, m, dEps, lam);
  // exact: theta = k0^2 eps_yy - (pi / a)^2, beta = sqrt(theta) complex; d beta = k0^2 d eps / (2 beta)
  const th = [k0 * k0 * er - (Math.PI / a) ** 2, -k0 * k0 * el];
  const mod = Math.hypot(...th), br = Math.sqrt(0.5 * (mod + th[0])), bi = -Math.sqrt(0.5 * (mod - th[0]));
  const dbr = (k0 * k0 * 1e-4 / 2) * br / (br * br + bi * bi);
  log(`G9 dn ${dn.toExponential(8)} exact ${(dbr / k0).toExponential(8)} beta ${m.beta.toFixed(6)} ${m.betaIm.toFixed(6)} vs ${br.toFixed(6)} ${bi.toFixed(6)}`);
  assert.ok(Math.abs(dn / (dbr / k0) - 1) < 1e-6, `${dn} vs ${dbr / k0}`);
});

for (const [order, h, top, reTol, imTol] of [[1, 0.005, 6, 5e-5, 3e-4], [2, 0.01, 10, 1e-6, 2e-5]])
  test(`G8 order ${order}: surface plasmon on a metal/dielectric interface, beta^2 = k0^2 eps_m eps_d / (eps_m + eps_d); Re and Im (loss) bounded separately; default shift above the SPP`, () => {
    // illustrative eps_m = -100 - 10 j (round numbers, not gold data), eps_d = 2.25, 1.55 um; PMC side walls (x-uniform TM)
    const lam = 1.55, k0 = 2 * Math.PI / lam, ed = 2.25, em = [-100, -10];
    const den = [em[0] + ed, em[1]], d2 = den[0] ** 2 + den[1] ** 2, num = [em[0] * ed, em[1] * ed];
    const th = [k0 * k0 * (num[0] * den[0] + num[1] * den[1]) / d2, k0 * k0 * (num[1] * den[0] - num[0] * den[1]) / d2];
    const g = geom({ domain: { x: [0, 0.1], y: [-0.3, top] }, regions: [{ name: 'diel', material: 'diel', poly: rect(0, 0.1, -0.3, top) }, { name: 'metal', material: 'au', poly: rect(0, 0.1, -0.3, 0) }],
      optical_window: { x: [0, 0.1], y: [-0.3, top] } });
    const model = buildVectorModel(section(g), mats({ diel: { n: 1.5, eps_r: 2 }, au: { conductor: true } }), { lambda0Um: lam, metal: 'lossy', order,
      boundary: { left: 'pmc', right: 'pmc' }, refine: [{ x: [0, 0.1], y: [-0.3, 0.3], h_um: h }], hints: { max_edge_um: 0.25, grade: 0.3 } });
    assertConforming(model, 'metal', 0.1 * 0.3);
    const r = solveVectorModes(model, lam, { numModes: 1, metalPermittivity: { au: [-100, 10] } }); // default shift
    const m = r.modes[0];
    const reRel = (m.theta - th[0]) / th[0], imRel = (m.thetaIm - th[1]) / th[1];
    const nSpp = Math.sqrt(th[0] + Math.hypot(...th)) / Math.SQRT2 / k0;
    log(`G8 order ${order} theta ${m.theta.toFixed(6)} ${m.thetaIm.toFixed(7)} exact ${th[0].toFixed(6)} ${th[1].toFixed(7)} Re rel ${reRel.toExponential(2)} Im rel ${imRel.toExponential(2)} loss ${m.lossDbPerCm.toFixed(3)} dB/cm nTarget ${r.nTarget.toFixed(6)} n_spp ${nSpp.toFixed(6)}`);
    assert.ok(Math.abs(reRel) < reTol, `Re rel ${reRel}`);
    assert.ok(Math.abs(imRel) < imTol, `Im rel (loss) ${imRel}`);
    assert.ok(r.nTarget > nSpp && r.spp.nSppMax > 0 && Math.abs(r.spp.nSppMax / nSpp - 1) < 1e-12, 'default shift above the planar SPP index');
    assert.ok(m.teFraction < 1e-3, 'TM (E_y) surface wave');
    assert.ok(!r.warnings.some((w) => /above the shift/.test(w)));
    if (order === 2) {
      // a user shift below the SPP index is flagged even when the SPP is not among the returned modes (audit V4)
      const low = solveVectorModes(model, lam, { numModes: 1, nTarget: 1.5005, metalPermittivity: { au: [-100, 10] }, fields: false });
      assert.ok(low.warnings.some((w) => /below the planar surface-plasmon index/.test(w)), low.warnings.join('; '));
      log(`G8 low shift 1.5005 returns n_eff ${low.modes[0].neff.toFixed(6)}; warnings: ${low.warnings.join('; ')}`);
    }
  });

// ---- contract checks ------------------------------------------------------------------------------------------

test('result contract: fields typed arrays, power identity, residual, labels; metal policies reject and lossy inputs', () => {
  const model = lateralSlab('pmc', 2);
  const r = solveVectorModes(model, 1.55, { numModes: 1 });
  const m = r.modes[0];
  const payload = vectorOpticalFields(model, r);
  assert.ok(payload.x instanceof Float64Array && payload.tri instanceof Int32Array && payload.modes[0].components.ex.length === model.mesh.nTris);
  for (const k of ['ex', 'ey', 'ez', 'hx', 'hy', 'hz', 'ezNode']) assert.ok(m.fields[k] instanceof Float64Array);
  assert.ok(m.powerW > 0 && m.residual < 1e-6 && m.effectiveAreaUm2 > 0);
  assert.ok(r.labels.includes('full_vector_optical') && r.labels.includes('nedelec1_deg2_p2'));
  assert.ok(m.powerIdentity < 1e-9, 'P from int e_t . e_t\' equals x^T B x');
  const g = geom({ domain: { x: [0, 2], y: [0, 1] }, regions: [{ name: 'core', material: 'core', poly: rect(0, 2, 0, 1) }], electrodes: [{ name: 'm', weight: 1, poly: rect(0.5, 1, 0.5, 0.7) }], optical_window: { x: [0, 2], y: [0, 1] } });
  assert.throws(() => buildVectorModel(section(g), mats({ core: { n: 1.5, eps_r: 2 }, gold: { conductor: true } }), { lambda0Um: 1 }), /conductor intersects the optical window/);
  const lossy = buildVectorModel(section(g), mats({ core: { n: 1.5, eps_r: 2 }, gold: { conductor: true } }), { lambda0Um: 1, metal: 'lossy', order: 1 });
  assert.throws(() => solveVectorModes(lossy, 1), /metalPermittivity\.gold/);
  // epsDelta without the matching group-tensor delta: ng undefined (NaN) with a warning (audit V10)
  const d = new Float64Array(4 * model.mesh.nTris).fill(1e-4);
  const pert = solveVectorModes(model, 1.55, { numModes: 1, fields: false, epsDelta: d });
  assert.ok(Number.isNaN(pert.modes[0].ng) && pert.warnings.some((w) => /epsDeltaGroup/.test(w)));
  const pertG = solveVectorModes(model, 1.55, { numModes: 1, fields: false, epsDelta: d, epsDeltaGroup: d });
  assert.ok(Number.isFinite(pertG.modes[0].ng));
});
