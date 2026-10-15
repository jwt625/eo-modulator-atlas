// Group index by eigenvector perturbation vs the finite-difference oracle (DevLog-024 S3 step 3).
// Gate: relative agreement 1e-4 on the analytic slab (TE, TM, dispersive) and on the mao2022 cross-section.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildOpticalModel, groupIndex, solveModesAt } from '../src/optics.mjs';
import { parseConfig, crossSectionOf, opticalOptions } from '../src/config.mjs';
import { geom, rect, mats, section, relErr } from './helpers.mjs';

const GATE = 1e-4;

function slab(pol, core) {
  const g = geom({ domain: { x: [0, 0.3], y: [-4, 4] },
    regions: [{ name: 'cladding', material: 'clad', poly: rect(0, 0.3, -4, 4) }, { name: 'core', material: 'core', poly: rect(0, 0.3, -0.3, 0.3) }],
    optical_window: { x: [0, 0.3], y: [-4, 4] },
  });
  return buildOpticalModel(section(g), mats({ core, clad: { n: 1.45, eps_r: 2 } }), {
    polarization: pol, lambda0Um: 1.55, boundary: { left: 'neumann', right: 'neumann' }, hints: { core_edge_um: 0.025, max_edge_um: 0.12 },
  });
}

function both(model, lambda, k = 0) {
  const p = groupIndex(model, lambda, k);
  const f = groupIndex(model, lambda, k, { method: 'finite_difference', delta: Math.min(0.01, lambda / 100) });
  assert.ok(p.converged && f.converged);
  assert.equal(p.method, 'perturbation');
  assert.equal(p.timing.nEigenSolves, 1);
  assert.ok(relErr(p.base.neff[k], f.base.neff[k]) < 1e-12); // same discrete eigenvalue (the FD path also converges mode k + 1)
  return { p, f };
}

for (const pol of ['TE', 'TM']) test(`${pol} slab: perturbation ng agrees with finite difference within 1e-4`, () => {
  const { p, f } = both(slab(pol, { n: 2, eps_r: 4 }), 1.55);
  assert.ok(relErr(p.ng, f.ng) < GATE, `${p.ng} vs ${f.ng}`);
});

for (const pol of ['TE', 'TM']) test(`${pol} slab with library LN dispersion (x-cut): perturbation ng agrees with finite difference within 1e-4`, () => {
  const { p, f } = both(slab(pol, { crystal: { cut: 'x', propagation: 'y' }, n_o: 2.211, n_e: 2.138, eps_r: { perp: 43, par: 28 }, dispersion: 'lithium_niobate' }), 1.55);
  assert.ok(Math.abs(p.ng - p.base.neff[0]) > 0.05, 'material plus waveguide dispersion must be visible');
  assert.ok(relErr(p.ng, f.ng) < GATE, `${p.ng} vs ${f.ng}`);
});

test('mao2022 cross-section: perturbation ng agrees with finite difference within 1e-4', () => {
  const config = parseConfig(readFileSync(new URL('../../sims/mao2022/config.yaml', import.meta.url), 'utf8'));
  const opts = opticalOptions(config.raw);
  const model = buildOpticalModel(crossSectionOf(config, 'geometry'), config.materials, opts);
  const { p, f } = both(model, opts.lambda0Um, opts.modeIndex);
  assert.ok(relErr(p.ng, f.ng) < GATE, `${p.ng} vs ${f.ng}`);
});

test('eigen result carries per-mode residuals and convergence flags consistent with converged (audit P3)', () => {
  const model = slab('TE', { n: 2, eps_r: 4 });
  const ok = solveModesAt(model, 1.55, { numModes: 2 });
  assert.equal(ok.residual.length, 2);
  assert.equal(ok.modeConverged.length, 2);
  if (ok.converged) assert.ok(ok.residual.every((r) => r < ok.resTol) && ok.modeConverged.every(Boolean));
  const short = solveModesAt(model, 1.55, { numModes: 2, maxIter: 3 });
  assert.equal(short.converged, false);
  assert.ok(short.modeConverged.some((c) => !c));
});
