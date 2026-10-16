// S7 round 2 (DevLog-036): exact cascade response of a periodic line, finite-thickness conductor surface impedance,
// bandwidth bracket from the reference, and the K9 comparison with the independent T2 data file (values only; the
// T2 code is not read). Line parameters are ILLUSTRATIVE TEST INPUTS unless a source is named.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { cx, cadd, csub, cmul, cdiv, cabs, cexp, ccosh, csinh, cscale } from '../src/complex.mjs';
import { C_LIGHT, MU0, createRfLine, propagationAt, surfaceResistanceOhm, skinDepthM, slabSurfaceImpedance } from '../src/rf-line.mjs';
import { phaseIntegral, cascadePhaseIntegral, firstCrossing, responseAt, toDb } from '../src/eo-response.mjs';
import { createLoadedLine, cascadeSections, cascadeAt } from '../src/loaded-line.mjs';
import { runEoResponseStage } from '../src/stages.mjs';

const line = (cPul, lPul, r1 = 400) => createRfLine({ cPul, lPul, conductor: { model: 'rprime_reference', rPulRefOhmPerM: r1, fRefHz: 1e9, includeInternalInductance: false }, dielectric: { model: 'uniform', tanDelta: 2e-3 } });

test('cascade of identical sections equals the uniform closed form (open, short, mismatched; non-integer L/p)', () => {
  const u = line(1.6e-10, 4e-7);
  const ll = createLoadedLine({ periodM: 35e-6, loadedLengthM: 32e-6, unloaded: u, loaded: u });
  const L = 18e-3; // L/p = 514.29: partial last cell
  const secs = cascadeSections(ll, L);
  assert.ok(Math.abs(secs.reduce((a, s) => a + s.l, 0) - L) < 1e-15);
  for (const [zs, zl] of [[50, 50], [50, Infinity], [50, 0], [25, 75]]) {
    for (const f of [1e9, 3e10, 1.1e11]) {
      const p = propagationAt(u, f);
      const betaO = (2 * Math.PI * f * 2.2) / C_LIGHT;
      const ref = phaseIntegral({ gamma: p.gamma, z0: p.z0, zs, zl, betaO, lengthM: L }).phi;
      const got = cascadePhaseIntegral({ sections: cascadeAt(ll, secs, f), zs, zl, betaO });
      assert.ok(cabs(csub(got, ref)) < 1e-10 * cabs(ref), `zl ${zl} f ${f}: ${cabs(csub(got, ref)) / cabs(ref)}`);
    }
  }
});

// Independent check: V(z) from the load end by backward ABCD propagation through the sections (no input-impedance
// recursion), normalised by V_s = V(0) + Z_s I(0), integrated with composite Simpson per section.
function bruteForce(sections, zs, zl, betaO, n = 200) {
  let v = zl === 0 ? cx(0) : cx(1);
  let i = zl === Infinity ? cx(0) : zl === 0 ? cx(1) : cdiv(cx(1), cx(zl));
  const nodes = [];
  for (let k = sections.length - 1; k >= 0; k--) { nodes[k + 1] = { v, i }; const { gamma, z0, l } = sections[k]; const g = cscale(gamma, l);
    const nv = cadd(cmul(v, ccosh(g)), cmul(cmul(i, z0), csinh(g))); const ni = cadd(cdiv(cmul(v, csinh(g)), z0), cmul(i, ccosh(g))); v = nv; i = ni; }
  nodes[0] = { v, i };
  const vs = cadd(nodes[0].v, cscale(nodes[0].i, zs));
  let acc = cx(0), z = 0;
  sections.forEach(({ gamma, z0, l }, k) => {
    const end = nodes[k + 1];
    const h = l / n;
    for (let q = 0; q <= n; q++) {
      const s = q * h, g = cscale(gamma, l - s);
      const vz = cadd(cmul(end.v, ccosh(g)), cmul(cmul(end.i, z0), csinh(g)));
      acc = cadd(acc, cscale(cmul(vz, cexp(cx(0, betaO * (z + s)))), (h / 3) * (q === 0 || q === n ? 1 : q % 2 ? 4 : 2)));
    }
    z += l;
  });
  return cdiv(acc, vs);
}

test('loaded cascade agrees with a brute-force backward propagation and Simpson quadrature (incl. near and above Bragg)', () => {
  const ll = createLoadedLine({ periodM: 1000e-6, loadedLengthM: 720e-6, unloaded: line(8e-11, 3.77e-7), loaded: line(1.6e-10, 3.77e-7) });
  const secs = cascadeSections(ll, 5.5e-3);
  for (const f of [1e10, 0.97 * ll.bragg.fHz, 1.05 * ll.bragg.fHz]) {
    const s = cascadeAt(ll, secs, f);
    const betaO = (2 * Math.PI * f * 2.2) / C_LIGHT;
    for (const zl of [50, Infinity, 0]) {
      const got = cascadePhaseIntegral({ sections: s, zs: 50, zl, betaO });
      const ref = bruteForce(s, 50, zl, betaO);
      assert.ok(cabs(csub(got, ref)) < 1e-9 * cabs(ref), `f ${f} zl ${zl}`);
    }
  }
});

test('finite-thickness slab surface impedance: thick limit R_s (1+j), thin limit 1/(sigma t) + j omega mu0 t/3, symmetric = t/2', () => {
  const sigma = 4.1e7;
  for (const f of [1e8, 1e9, 1e10, 1e11]) {
    const d = skinDepthM(f, sigma), rs = surfaceResistanceOhm(f, sigma);
    const thick = slabSurfaceImpedance(f, sigma, 20 * d);
    assert.ok(Math.abs(thick.re / rs - 1) < 1e-15 && Math.abs(thick.im / rs - 1) < 1e-15, 'thick slab equals the semi-infinite surface impedance (Wheeler / R_s model)');
    const t = 1e-3 * d;
    const thin = slabSurfaceImpedance(f, sigma, t);
    assert.ok(Math.abs(thin.re * sigma * t - 1) < 1e-6, 'thin slab equals the DC sheet resistance');
    assert.ok(Math.abs(thin.im / (2 * Math.PI * f * MU0 * t / 3) - 1) < 1e-5, 'thin slab internal inductance mu0 t / 3');
    // continuity across the series switch (x = 1e-3)
    const a = slabSurfaceImpedance(f, sigma, 0.999999e-3 * d), b = slabSurfaceImpedance(f, sigma, 1.000001e-3 * d);
    assert.ok(Math.abs(a.re / b.re - 1) < 1e-5 && Math.abs(a.im / b.im - 1) < 1e-5);
    const sym = slabSurfaceImpedance(f, sigma, 2 * d, 'slab_symmetric'), one = slabSurfaceImpedance(f, sigma, d, 'slab_one_sided');
    assert.ok(Math.abs(sym.re - one.re) < 1e-12 * one.re && Math.abs(sym.im - one.im) < 1e-12 * one.im);
  }
  // R' = K Re Z_s on an rf line: low-frequency DC limit K / (sigma t_eff), high-frequency surface-resistance limit
  const k = 2e5, t = 1e-6;
  const slab = createRfLine({ cPul: 1.6e-10, lPul: 4e-7, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: sigma, kPerM: k, thicknessM: t, thicknessModel: 'slab_symmetric', includeInternalInductance: true }, dielectric: { model: 'none' } });
  const semi = createRfLine({ cPul: 1.6e-10, lPul: 4e-7, conductor: { model: 'surface_resistance_geometry_factor', sigmaSm: sigma, kPerM: k, thicknessM: t, includeInternalInductance: true }, dielectric: { model: 'none' } });
  const lo = propagationAt(slab, 1e6);
  assert.ok(Math.abs(lo.rOhmPerM / (k / (sigma * t / 2)) - 1) < 1e-4);
  const hiS = propagationAt(slab, 1e12), hiR = propagationAt(semi, 1e12);
  // t_eff / delta = 6.3 at 1 THz: the slab correction is of order exp(-2 t_eff / delta) ~ 3e-6
  assert.ok(Math.abs(hiS.rOhmPerM / hiR.rOhmPerM - 1) < 1e-4 && Math.abs(hiS.lHPerM / hiR.lHPerM - 1) < 1e-4);
  assert.ok(propagationAt(semi, 1e8).warnings.includes('conductor_thickness_below_3_skin_depths_surface_resistance_invalid'));
  assert.ok(!propagationAt(slab, 1e8).warnings.includes('conductor_thickness_below_3_skin_depths_surface_resistance_invalid'));
});

test('bandwidth bracket starts at the reference: a crossing below the first grid point is found (audit S7)', () => {
  const g = (f) => -1e-9 * f; // -3 dB at 3 GHz
  const c = firstCrossing(g, [5e9, 1e10], -3, null, { fHz: 0, valueDb: 0 });
  assert.ok(Math.abs(c.fHz / 3e9 - 1) < 1e-8);
  assert.equal(firstCrossing(g, [5e9, 1e10], -3).below, true);
});

const k9path = new URL('../../validation/reference/s7-K9.json', import.meta.url);
test('K9a / K9b / K9z: exact cascade and Bloch-homogenised responses equal the independent T2 reference data', { skip: !existsSync(k9path) && 'validation/reference/s7-K9.json not present' }, () => {
  const ref = JSON.parse(readFileSync(k9path, 'utf8'));
  const grid = ref.grid_ghz;
  for (const name of ['K9a', 'K9b', 'K9z']) {
    const cs = ref.cases[name];
    if (!cs) continue;
    const inp = cs.inputs;
    const mk = (k) => createRfLine({ cPul: inp.C_prime_F_per_m[k], lPul: inp.L_prime_H_per_m[k], conductor: { model: 'rprime_reference', rPulRefOhmPerM: inp.R_prime.r1_ohm_per_m, fRefHz: 1e9, includeInternalInductance: false }, dielectric: { model: 'none' } });
    const ll = createLoadedLine({ periodM: inp.period_um * 1e-6, loadedLengthM: inp.l_loaded_um * 1e-6, unloaded: mk('unloaded'), loaded: mk('loaded') });
    assert.ok(Math.abs(ll.bragg.fHz / 1e9 / cs.f_bragg_ghz - 1) < 1e-8, `${name} Bragg`);
    const opts = { lengthM: inp.L_mm * 1e-3, zs: inp.Z_S_ohm, zl: inp.Z_L_ohm, sweepGhz: grid };
    const casc = runEoResponseStage({ kind: 'periodic', line: ll, opts, ngOpt: inp.n_g, ngSource: 'fixed', fLimitHz: ll.bragg.fHz, responseModel: 'exact_cascade' }).result;
    const want = cs.responses.eta_uniform.series.S21_EO_el_dB;
    const dmax = Math.max(...want.map((w, i) => Math.abs(casc.sweep.s21EoDb[i] - w)));
    assert.ok(dmax < 1e-9, `${name} exact cascade vs reference: ${dmax} dB`);
    const hom = runEoResponseStage({ kind: 'periodic', line: ll, opts, ngOpt: inp.n_g, ngSource: 'fixed', fLimitHz: ll.bragg.fHz, responseModel: 'bloch_homogenised' }).result;
    const wh = cs.responses.bloch_homogenised.series;
    const hmax = Math.max(...wh.S21_EO_el_dB.map((w, i) => (hom.sweep.s21EoDb[i] == null || w == null ? 0 : Math.abs(hom.sweep.s21EoDb[i] - w))));
    assert.ok(hmax < 1e-9, `${name} homogenised vs reference: ${hmax} dB`);
    // bandwidths of the cascade on the reference scan range (0.5 GHz grid + bisection)
    const scan = Array.from({ length: Math.round(cs.responses.eta_uniform.scan_ghz[1] / 0.5) }, (_, i) => 0.5 * (i + 1));
    const bw = runEoResponseStage({ kind: 'periodic', line: ll, opts: { ...opts, sweepGhz: scan }, ngOpt: inp.n_g, ngSource: 'fixed', fLimitHz: ll.bragg.fHz, responseModel: 'exact_cascade' }).result;
    assert.ok(Math.abs(bw.bw3dbGhz - cs.responses.eta_uniform.bw3_el_ghz) < 1e-5, `${name} bw3 ${bw.bw3dbGhz} vs ${cs.responses.eta_uniform.bw3_el_ghz}`);
    assert.ok(Math.abs(bw.bw6dbGhz - cs.responses.eta_uniform.bw6_el_ghz) < 1e-5, `${name} bw6 ${bw.bw6dbGhz} vs ${cs.responses.eta_uniform.bw6_el_ghz}`);
  }
});

const k8path = new URL('../../validation/reference/s7-K8.json', import.meta.url);
test('K8 (uniform line): response and bandwidths equal the independent T2 reference data (primary, lossless, RLGC, matched)', { skip: !existsSync(k8path) && 'validation/reference/s7-K8.json not present' }, () => {
  const ref = JSON.parse(readFileSync(k8path, 'utf8'));
  const inp = ref.inputs;
  const npPerDb = 1 / ref.dB_per_neper;
  for (const [name, v] of Object.entries(ref.variants)) {
    const L = v.L_mm * 1e-3;
    const a0 = v.line === 'lossless' ? 0 : v.a0;
    let lineAt;
    if (v.line === 'rlgc') {
      const l = createRfLine({ cPul: inp.C_pF_per_m * 1e-12, lPul: inp.L_nH_per_m * 1e-9, conductor: { model: 'rprime_reference', rPulRefOhmPerM: 2 * inp.Z0_ohm * a0 * 100 * npPerDb, fRefHz: 1e9, includeInternalInductance: false }, dielectric: { model: 'none' } });
      lineAt = (f) => propagationAt(l, f);
    } else lineAt = (f) => ({ gamma: cx(a0 * Math.sqrt(f / 1e9) * 100 * npPerDb, (2 * Math.PI * f * inp.n_rf) / C_LIGHT), z0: cx(inp.Z0_ohm) });
    const h = (f) => { const p = lineAt(f); return responseAt({ fHz: f, gamma: p.gamma, z0: p.z0, zs: v.Z_S_ohm, zl: v.Z_L_ohm, ngOpt: inp.n_g, lengthM: L }); };
    const want = v.series.S21_EO_el_dB;
    const d = Math.max(...v.series.f_ghz.map((f, i) => Math.abs(toDb(h(f * 1e9)) - want[i])));
    assert.ok(d < 1e-9, `${name}: ${d} dB`);
    const scan = Array.from({ length: 800 }, (_, i) => 0.5e9 * (i + 1));
    for (const [key, thr] of [['bw3_el_ghz', -3], ['bw6_el_ghz', -6]]) {
      const c = firstCrossing((f) => toDb(h(f)), scan, thr, null, { fHz: 0, valueDb: 0 });
      assert.ok(Math.abs(c.fHz / 1e9 - v[key]) < 1e-5, `${name} ${key} ${c.fHz / 1e9} vs ${v[key]}`);
    }
  }
});
