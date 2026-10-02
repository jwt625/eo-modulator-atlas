import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildOpticalModel, solveModesAt, metalInWindow, METAL_POLICIES } from '../src/optics.mjs';
import { parseConfig, opticalOptions } from '../src/config.mjs';
import { CrossSection } from '../src/section.mjs';
import { geom, rect, mats, section, relErr } from './helpers.mjs';

// Optical-limit gates (E2). Illustrative analytic inputs only: n_core = 2.0, n_clad = 1.45, lambda = 1.55 um are chosen for the
// gates; they are not material data.
const LAMBDA = 1.55;

// ---- Metal between perfect-conductor-like plates (quasi-1D, Neumann left/right) -------------------------------
// Homogeneous core n between plates at y = +-d. Exact scalar results:
//   quasi-TE (E_x tangential, psi = 0 on the plate):   n_eff^2 = n^2 - (lambda / (4 d))^2   (k_y = pi / (2 d))
//   quasi-TM (H_x, natural zero normal derivative):    psi = const,  n_eff = n   (TEM-like parallel-plate mode)
const D = 0.4;
const T = 0.2; // plate thickness
function plateModel(pol, policy, { blockOnly = false } = {}) {
  const y = D + T;
  const g = geom({
    domain: { x: [0, 0.6], y: [-y, y] },
    regions: [{ name: 'bg', material: 'clad', poly: rect(0, 0.6, -y, y) }, { name: 'core', material: 'core', poly: rect(0, 0.6, -D, D) }],
    electrodes: blockOnly
      ? [{ name: 'top', weight: 1, poly: rect(0.2, 0.4, D, y) }, { name: 'bottom', weight: 0, poly: rect(0.2, 0.4, -y, -D) }]
      : [{ name: 'top', weight: 1, poly: rect(0, 0.6, D, y) }, { name: 'bottom', weight: 0, poly: rect(0, 0.6, -y, -D) }],
    optical_window: { x: [0, 0.6], y: [-y, y] },
  });
  return buildOpticalModel(section(g), mats({ clad: { n: 1.45, eps_r: 2 }, core: { n: 2, eps_r: 4 }, gold: { conductor: true } }), {
    polarization: pol, lambda0Um: LAMBDA, metal: policy, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.02, max_edge_um: 0.06 },
  });
}

test('metal policies are explicit: default rejects with an opt-in hint; unknown policies and polarizations are errors', () => {
  assert.deepEqual(METAL_POLICIES, ['reject', 'absent', 'pec_scalar']);
  const rejected = plateModel('TE', undefined);
  assert.throws(() => solveModesAt(rejected, LAMBDA), /metal optical modes are unsupported.*absent.*pec_scalar/);
  assert.throws(() => plateModel('TE', 'drude'), /metal policy must be one of/);
  assert.throws(() => plateModel('TX', 'reject'), /polarization must be TE or TM/);
});

test('pec_scalar quasi-TE between plates matches n_eff^2 = n^2 - (lambda/4d)^2 and reports the policy', () => {
  const model = plateModel('TE', 'pec_scalar');
  const r = solveModesAt(model, LAMBDA, { numModes: 1 });
  assert.ok(r.converged);
  const expected = Math.sqrt(4 - (LAMBDA / (4 * D)) ** 2);
  assert.ok(relErr(r.neff[0], expected) < 1e-3, `${r.neff[0]} vs ${expected}`);
  assert.ok(r.labels.includes('optical_metal_pec_scalar_approximation') && r.labels.includes('scalar_optical_not_full_vector'));
  assert.equal(r.metal.policy, 'pec_scalar');
  assert.deepEqual(r.metal.inMesh.sort(), ['electrode:bottom', 'electrode:top']);
  assert.ok(r.metal.excludedTriangles > 0);
  // only horizontal faces (normal along the film normal) exist: the scalar PEC condition is fully valid here
  assert.equal(r.metal.pecFaces.validFaceFraction, 1);
  assert.ok(relErr(r.metal.pecFaces.horizontalUm, 2 * 0.6) < 1e-9);
  // metal triangles carry no field
  for (let t = 0; t < model.mesh.nTris; t++) if (r.excluded[t]) assert.equal(r.n2[t], 0);
});

test('pec_scalar quasi-TM between plates is the TEM-like mode n_eff = n (natural boundary condition)', () => {
  const r = solveModesAt(plateModel('TM', 'pec_scalar'), LAMBDA, { numModes: 1 });
  assert.ok(r.converged);
  assert.ok(relErr(r.neff[0], 2) < 1e-6, `${r.neff[0]}`);
});

test('pec_scalar never uses a metal optical index: a user-supplied index on the metal is ignored', () => {
  const a = plateModel('TE', 'pec_scalar');
  const b = plateModel('TE', 'pec_scalar');
  b.mats.gold.nCfg = { n_o: 7, n_e: 7, comp: 'n' };
  assert.equal(solveModesAt(a, LAMBDA, { numModes: 1 }).neff[0], solveModesAt(b, LAMBDA, { numModes: 1 }).neff[0]);
});

test('pec_scalar reports the fraction of metal-face length where the scalar condition is exact (vertical faces are not)', () => {
  const r = solveModesAt(plateModel('TE', 'pec_scalar', { blockOnly: true }), LAMBDA, { numModes: 1 });
  assert.ok(r.converged);
  assert.ok(r.metal.pecFaces.verticalUm > 0);
  assert.ok(r.metal.pecFaces.validFaceFraction < 1 && r.metal.pecFaces.validFaceFraction > 0);
});

test("'absent' omits the metal footprint: identical to a model without that electrode", () => {
  const withMetal = solveModesAt(plateModel('TE', 'absent'), LAMBDA, { numModes: 1 });
  assert.equal(withMetal.metal.policy, 'absent');
  assert.deepEqual(withMetal.metal.omittedFromModel.sort(), ['electrode:bottom', 'electrode:top']);
  assert.deepEqual(withMetal.metal.inMesh, []);
  assert.ok(withMetal.labels.includes('optical_metal_absent_limit'));
  // reference: the same window with the plates replaced by the background dielectric (no electrodes at all)
  const y = D + T;
  const g = geom({ domain: { x: [0, 0.6], y: [-y, y] }, regions: [{ name: 'bg', material: 'clad', poly: rect(0, 0.6, -y, y) }, { name: 'core', material: 'core', poly: rect(0, 0.6, -D, D) }],
    electrodes: [{ name: 'far', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.6], y: [-y, y] } });
  const ref = buildOpticalModel(section(g), mats({ clad: { n: 1.45, eps_r: 2 }, core: { n: 2, eps_r: 4 }, gold: { conductor: true } }), { polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.02, max_edge_um: 0.06 } });
  assert.ok(relErr(withMetal.neff[0], solveModesAt(ref, LAMBDA, { numModes: 1 }).neff[0]) < 1e-6);
  // and the two limits differ for a mode that actually touches the plates
  const pec = solveModesAt(plateModel('TE', 'pec_scalar'), LAMBDA, { numModes: 1 });
  assert.ok(Math.abs(pec.neff[0] - withMetal.neff[0]) > 1e-3);
});

test('metalInWindow lists conductors by bounding box only as a pre-check', () => {
  const y = D + T;
  const g = geom({ domain: { x: [0, 0.6], y: [-y, y] }, regions: [{ name: 'bg', material: 'clad', poly: rect(0, 0.6, -y, y) }],
    electrodes: [{ name: 'near', weight: 1, poly: rect(0, 0.6, D, y) }, { name: 'far', weight: 0, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.6], y: [-y, y] } });
  assert.deepEqual(metalInWindow(section(g)), ['near']);
});

// ---- scalar-model guards -----------------------------------------------------------------------------------------
test('off-diagonal lab-frame permittivity (rotation not a multiple of 90 deg) is an error, not silently diagonalised', () => {
  const rotated = (deg) => {
    const g = geom({ domain: { x: [0, 0.3], y: [-1, 1] }, regions: [{ name: 'm', material: 'm', poly: rect(0, 0.3, -1, 1) }], electrodes: [{ name: 'far', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-1, 1] } });
    return buildOpticalModel(section(g), mats({ m: { crystal: { cut: 'x', propagation: 'y', rotation_deg: deg }, n_o: 2.2, n_e: 2.1, eps_r: { perp: 40, par: 30 } }, gold: { conductor: true } }), { polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' } });
  };
  assert.throws(() => solveModesAt(rotated(30), LAMBDA), /off-diagonal/);
  for (const deg of [0, 90, 180]) assert.doesNotThrow(() => solveModesAt(rotated(deg), LAMBDA, { numModes: 1 }));
});

test('library dispersion anchor wavelength outside the validity range is an error', () => {
  const g = geom({ domain: { x: [0, 0.3], y: [-1, 1] }, regions: [{ name: 'm', material: 'silica', poly: rect(0, 0.3, -1, 1) }], electrodes: [{ name: 'far', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-1, 1] } });
  const model = buildOpticalModel(section(g), mats({ silica: { n: 1.444, eps_r: 3.9 }, gold: { conductor: true } }), { polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' } });
  model.mats.silica.dispersionKey = 'silicon_dioxide';
  assert.doesNotThrow(() => solveModesAt(model, LAMBDA, { numModes: 1 }));
  model.lambda0Um = 0.1; // anchor outside 0.21-6.7 um even though the evaluation wavelength is valid
  assert.throws(() => solveModesAt(model, LAMBDA), /anchor wavelength .* outside the library validity range/);
});

// ---- Q2 F1 / F3: scalar-form limitation flags and the uniaxial quasi-TM equation ------------------------------------------
test('every solve carries machine-readable scalar limitation flags (TM adds the lateral-gradient approximation)', () => {
  const te = solveModesAt(plateModel('TE', 'absent'), LAMBDA, { numModes: 1 });
  const tm = solveModesAt(plateModel('TM', 'absent'), LAMBDA, { numModes: 1 });
  assert.deepEqual(te.limitations, ['scalar_forms_exact_only_at_horizontal_interfaces']);
  assert.deepEqual(tm.limitations, ['scalar_forms_exact_only_at_horizontal_interfaces', 'scalar_tm_lateral_gradient_uses_eps_zz_approximation']);
});

test('quasi-TM homogeneous uniaxial box follows beta^2 = eps_yy (k0^2 - k_y^2 / eps_zz) (eps_zz in the gradient term)', () => {
  // ILLUSTRATIVE: n_yy = 2.1 (crystal c axis along lab y, z-cut) and n_zz = 2.2 (propagation axis), box height H = 1 um, Dirichlet top/bottom.
  const H = 1.0, nyy = 2.1, nzz = 2.2;
  const g = geom({ domain: { x: [0, 0.3], y: [-H / 2, H / 2] }, regions: [{ name: 'm', material: 'm', poly: rect(0, 0.3, -H / 2, H / 2) }], electrodes: [{ name: 'far', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-H / 2, H / 2] } });
  const model = buildOpticalModel(section(g), mats({ m: { crystal: { cut: 'z', propagation: 'y' }, n_o: nzz, n_e: nyy, eps_r: { perp: 40, par: 30 } }, gold: { conductor: true } }), { polarization: 'TM', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.02, max_edge_um: 0.05 } });
  const r = solveModesAt(model, LAMBDA, { numModes: 1 });
  const k0 = (2 * Math.PI) / LAMBDA, ky = Math.PI / H;
  const exact = Math.sqrt(nyy ** 2 * (k0 * k0 - (ky * ky) / nzz ** 2)) / k0;
  assert.ok(relErr(r.neff[0], exact) < 1e-3, `${r.neff[0]} vs ${exact}`);
  // the previous equation (eps_yy in the gradient term) would give this, which differs measurably:
  const old = Math.sqrt(nyy ** 2 * (k0 * k0 - (ky * ky) / nyy ** 2)) / k0;
  assert.ok(Math.abs(exact - old) > 1e-3);
});

// ---- domain truncation diagnostic -----------------------------------------------------------------------------------
function slabHalfHeight(h) {
  const g = geom({ domain: { x: [0, 0.3], y: [-h, h] }, regions: [{ name: 'clad', material: 'clad', poly: rect(0, 0.3, -h, h) }, { name: 'core', material: 'core', poly: rect(0, 0.3, -0.3, 0.3) }],
    electrodes: [{ name: 'far', weight: 1, poly: rect(5, 6, 5, 6) }], optical_window: { x: [0, 0.3], y: [-h, h] } });
  return buildOpticalModel(section(g), mats({ clad: { n: 1.45, eps_r: 2 }, core: { n: 2, eps_r: 4 }, gold: { conductor: true } }), { polarization: 'TE', lambda0Um: LAMBDA, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.03, max_edge_um: 0.12 } });
}

test('Dirichlet-window truncation is quantified: margin power fraction shrinks with window size and n_eff converges', () => {
  const small = solveModesAt(slabHalfHeight(0.8), LAMBDA, { numModes: 1 });
  const mid = solveModesAt(slabHalfHeight(2), LAMBDA, { numModes: 1 });
  const big = solveModesAt(slabHalfHeight(4), LAMBDA, { numModes: 1 });
  const f = (r) => r.boundaryMarginFraction.perMode[0];
  assert.ok(f(small) > f(mid) && f(mid) > f(big), `${f(small)} ${f(mid)} ${f(big)}`);
  assert.ok(f(big) < 1e-6);
  assert.ok(small.boundaryMarginFraction.marginUm > 0);
  // truncation error in n_eff decreases with window size
  assert.ok(Math.abs(small.neff[0] - big.neff[0]) > Math.abs(mid.neff[0] - big.neff[0]));
});

// ---- Chen2022 optical window (sensitivity to the pads inside the window; model-option regression) --------------------
test('Chen2022 window: default rejects; absent and pec_scalar both solve and are labelled; no gold index is used', () => {
  const cfg = parseConfig(readFileSync(new URL('../../sims/chen2022/config.yaml', import.meta.url), 'utf8'));
  const sec = new CrossSection(cfg.geometries.geometry, 'chen');
  const o = opticalOptions(cfg.raw);
  assert.ok(metalInWindow(sec).length > 0, 'precondition: the configured window intersects gold');
  const rejected = buildOpticalModel(sec, cfg.materials, o);
  assert.throws(() => solveModesAt(rejected, o.lambda0Um), /metal optical modes are unsupported/);
  const out = {};
  for (const metal of ['absent', 'pec_scalar']) {
    const model = buildOpticalModel(sec, cfg.materials, { ...o, metal });
    out[metal] = solveModesAt(model, o.lambda0Um, { numModes: 1 });
    assert.ok(out[metal].converged);
    assert.ok(out[metal].labels.some((l) => l.startsWith('optical_metal_')));
  }
  // sensitivity of the real part of n_eff to the metal limits (not a bound for real gold, which also absorbs); loose structural bound
  assert.ok(Math.abs(out.absent.neff[0] - out.pec_scalar.neff[0]) < 1e-2);
  assert.ok(out.pec_scalar.metal.excludedTriangles > 0 && out.absent.metal.excludedTriangles === 0);
});

test('every conductor index must stay absent from the config used for the Chen sensitivity (gold n_complex stays null)', () => {
  const cfg = parseConfig(readFileSync(new URL('../../sims/chen2022/config.yaml', import.meta.url), 'utf8'));
  assert.equal(cfg.materials.gold.nCfg, null);
  assert.equal(cfg.materials.gold.nComplex, null);
});
