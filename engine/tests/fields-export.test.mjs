// Field export (DevLog-023 O4 contract): typed arrays with consistent sizes, absent unless requested; timing pass-through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runCrossSection } from '../src/run.mjs';
import { fieldTransferables } from '../src/fields.mjs';

const fixture = readFileSync(new URL('./fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');

test('fields: absent by default, result otherwise unchanged', () => {
  const a = runCrossSection(fixture, { stages: ['eo_overlap'] });
  const b = runCrossSection(fixture, { stages: ['eo_overlap'], fields: true });
  assert.equal('fields' in a, false);
  assert.deepEqual(a.metrics, b.metrics);
  assert.equal(a.geometryHash, b.geometryHash);
  assert.ok(JSON.stringify(a).length < 50000);
  assert.throws(() => runCrossSection(fixture, { fields: 'yes' }), /fields must be a boolean/);
});

test('fields: electrostatic and optical arrays are consistent typed arrays', () => {
  const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap'], fields: true });
  const { es, optical, arms } = r.fields;
  const nN = es.x.length, nT = es.tri.length / 3;
  assert.equal(nN, r.electrostatics.nNodes);
  assert.equal(nT, r.electrostatics.nTris);
  for (const [k, a, n, T] of [['y', es.y, nN, Float64Array], ['phi', es.phi, nN, Float64Array], ['nodeElectrode', es.nodeElectrode, nN, Int32Array],
    ['triRegion', es.triRegion, nT, Int32Array], ['ex', es.ex, nT, Float64Array], ['ey', es.ey, nT, Float64Array]]) {
    assert.ok(a instanceof T, k);
    assert.equal(a.length, n, k);
  }
  assert.ok(es.tri instanceof Int32Array);
  assert.ok(es.tri.every((i) => i >= 0 && i < nN));
  assert.ok(es.triRegion.every((i) => i >= 0 && i < es.regionNames.length));
  // Electrode nodes carry their normalised potential (signal 1 V, grounds 0 V per V_t).
  for (let i = 0; i < nN; i++) if (es.nodeElectrode[i] >= 0) assert.equal(es.phi[i], es.electrodeNames[es.nodeElectrode[i]] === 'signal' ? 1 : 0);
  // Uniform gap field of the fixture: E_x = +V_t / 2 um = 5e5 V/m in the right gap (arm A).
  let sum = 0, n = 0;
  for (let t = 0; t < nT; t++) {
    const cx = (es.x[es.tri[3 * t]] + es.x[es.tri[3 * t + 1]] + es.x[es.tri[3 * t + 2]]) / 3;
    if (cx > 1.3 && cx < 2.7) { sum += es.ex[t]; n++; }
  }
  assert.ok(Math.abs(sum / n / 5e5 - 1) < 1e-6, String(sum / n));
  // Optical: arm A reuses the optical stage model; arm B is its own mesh.
  assert.equal(optical.modes.length >= 1, true);
  assert.equal(optical.modes[0].n_eff, r.metrics.n_eff);
  const psi = optical.modes[0].components.psi;
  assert.ok(psi instanceof Float64Array && psi.length === optical.x.length);
  assert.ok(Math.abs(Math.max(...psi.map(Math.abs)) - 1) < 1e-12);
  assert.equal(optical.tri.length / 3, r.optical.nTris);
  assert.equal(arms.A.x.length, optical.x.length);
  assert.equal(arms.B.x.length, r.eo.arms.B.nNodes);
  assert.ok(arms.B.window.x[1] < 0);
  assert.equal(optical.form, 'E');
  // Transferables are distinct buffers and transferring them leaves the engine result reusable.
  const bufs = fieldTransferables(r.fields);
  assert.equal(new Set(bufs).size, bufs.length);
  assert.ok(bufs.length >= 10);
});

test('fields: timing objects are passed through', () => {
  const r = runCrossSection(fixture, { stages: ['optical_mode', 'eo_overlap', 'rf_line'] });
  assert.ok(r.timing.total_ms > 0);
  assert.ok(r.timing.eo && r.timing.eo.A && r.timing.eo.B);
  assert.deepEqual(r.timing.eo.A, { reusedOpticalStage: true });
  assert.equal(r.reused.electrostatics, false);
  assert.match(r.geometryHash, /^[0-9a-f]{16}$/);
});
