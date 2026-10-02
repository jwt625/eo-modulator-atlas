import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseConfig, opticalOptions } from '../src/config.mjs';
import { runCrossSection } from '../src/run.mjs';

const fixture = readFileSync(new URL('./fixtures/parallel-plates.yaml', import.meta.url), 'utf8');
function withMetal(policy) {
  const raw = structuredClone(parseConfig(fixture).raw);
  raw.geometry.optical_window.x_um = [-1, 1]; // include both plates
  if (policy !== undefined) raw.optics.metal_in_window = policy;
  return raw;
}

test('YAML/runtime/schema optical policy agrees and defaults to explicit rejection', () => {
  const schema = JSON.parse(readFileSync(new URL('../schema/sim.schema.json', import.meta.url), 'utf8'));
  assert.deepEqual(schema.properties.optics.properties.metal_in_window.enum, ['reject', 'absent', 'pec_scalar']);
  assert.equal(schema.properties.optics.properties.metal_in_window.default, 'reject');
  assert.equal(opticalOptions(withMetal()).metal, 'reject');
  for (const policy of ['absent', 'pec_scalar', 'reject']) {
    assert.equal(opticalOptions(parseConfig(JSON.stringify(withMetal(policy))).raw).metal, policy);
  }
  for (const bad of [null, true, 0, 'gold', 'PEC']) {
    assert.throws(() => parseConfig(JSON.stringify(withMetal(bad))), /optics.metal_in_window/);
  }
  assert.throws(() => runCrossSection(JSON.stringify(withMetal()), { optical: true }), /metal optical modes are unsupported/);
});

for (const policy of ['absent', 'pec_scalar']) {
  test(`runner carries ${policy} diagnostics and solves the expected scalar box without changing inputs`, () => {
    const raw = withMetal(policy);
    raw.validation_status = 'unvalidated';
    raw.chain.push('eo_overlap', 'rf_line');
    const input = JSON.stringify(raw);
    const result = runCrossSection(input, { optical: true });
    assert.equal(JSON.stringify(raw), input);
    assert.deepEqual(result.stages, ['electrostatics', 'optical_mode']);
    assert.deepEqual(result.pendingStages, ['eo_overlap', 'rf_line']);
    const optical = result.optical;
    assert.equal(optical.metal.policy, policy);
    assert.equal(optical.converged, true);
    assert.equal(optical.modeIndex, 0);
    assert.equal(optical.form, 'E');
    assert.ok(optical.boundaryMarginFraction.value >= 0 && optical.boundaryMarginFraction.value <= 1);
    assert.ok(optical.boundaryMarginFraction.marginUm > 0);
    for (const warning of [...optical.labels, ...optical.limitations]) assert.ok(result.warnings.includes(warning));
    assert.ok(result.warnings.includes('scalar_forms_exact_only_at_horizontal_interfaces'));
    const width = policy === 'absent' ? 2 : 1.8;
    const expected = Math.sqrt(4 - (1.55 / (2 * width)) ** 2 - (1.55 / (2 * 1.6)) ** 2);
    assert.ok(Math.abs(result.metrics.n_eff - expected) < 0.002, `${result.metrics.n_eff} vs scalar box ${expected}`);
    if (policy === 'absent') {
      assert.equal(optical.metal.excludedTriangles, 0);
      assert.equal(optical.metal.omittedFromModel.length, 2);
      assert.equal(optical.metal.pecFaces, null);
    } else {
      assert.ok(optical.metal.excludedTriangles > 0);
      assert.equal(optical.metal.inMesh.length, 2);
      // These faces are vertical: scalar-box agreement is not a full-vector gate.
      assert.equal(optical.metal.pecFaces.validFaceFraction, 0);
    }
    assert.equal(result.targets.find(t => t.metric === 'ng_opt').status, 'not_evaluated');
    assert.deepEqual(JSON.parse(JSON.stringify(result)).optical, optical);
    assert.ok(!Object.hasOwn(optical, 'psi') && !Object.hasOwn(optical, 'n2'));
  });
}

test('TM and selected higher-mode diagnostics survive the finite-difference runner path', () => {
  const raw = withMetal('absent');
  raw.optics.polarization = 'TM';
  raw.optics.mode_index = 1;
  raw.optics.group_index_from = 'finite_difference_wavelength';
  delete raw.optics.ng_fixed;
  const r = runCrossSection(JSON.stringify(raw), { optical: true });
  assert.equal(r.optical.form, 'H');
  assert.equal(r.optical.modeIndex, 1);
  assert.ok(r.warnings.includes('scalar_tm_lateral_gradient_uses_eps_zz_approximation'));
  assert.ok(Number.isFinite(r.optical.boundaryMarginFraction.value));
  assert.equal(r.targets.find(t => t.metric === 'ng_opt').reason, null);
});
