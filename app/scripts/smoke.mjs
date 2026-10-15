// Runs against a production build with its own temporary preview server and Chrome profile.
// No results are saved unless SMOKE_SCREENSHOTS points to a local scratch directory.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { runCrossSection } from '../../engine/src/run.mjs';
import { parseConfig } from '../../engine/src/config.mjs';
import { setIn as yamlSetIn } from '../../engine/src/yaml-edit.mjs';

const appDir = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.BASE_PATH ?? '';
const chen = await readFile(new URL('../../sims/chen2022/config.yaml', import.meta.url), 'utf8');
const analytic = await readFile(new URL('../../engine/tests/fixtures/parallel-plates.yaml', import.meta.url), 'utf8');
const gsg = await readFile(new URL('../../engine/tests/fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
const expectedStages = runCrossSection(gsg, { stages: ['optical_mode', 'eo_overlap', 'rf_line'] });
const expected = runCrossSection(chen);
const expectedOptical = runCrossSection(analytic, { optical: true });
const chenFields = runCrossSection(chen, { fields: true }).fields.es;
const vectorText = yamlSetIn(analytic, 'optics.solver', 'vector'); // engine helper: replaces the pinned scalar solver
// Expected error of chen2022 + optical mode (gold in the optical window) from the engine itself, whatever solver is default.
let chenOpticalError = '';
try { runCrossSection(chen, { stages: ['optical_mode'] }); } catch (e) { chenOpticalError = e.message; }
if (!chenOpticalError) throw new Error('smoke precondition: chen2022 optical_mode is expected to stop on metal in the window');
const expectedVector = runCrossSection(vectorText, { optical: true });
const gsgFields = runCrossSection(gsg, { stages: ['optical_mode', 'eo_overlap'], fields: true }).fields;
const preview = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url)), 'preview', '--host', '127.0.0.1', '--port', '0'], { cwd: appDir, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
let serverOutput = '';

async function until(predicate, label, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await predicate()) return;
    await delay(50);
  }
  throw new Error(`Timed out: ${label}`);
}

try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Preview startup timed out: ${serverOutput}`)), 15000);
    const collect = chunk => {
      serverOutput += chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
      const match = serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    };
    preview.stdout.on('data', collect); preview.stderr.on('data', collect);
    preview.on('error', error => { clearTimeout(timer); reject(error); });
    preview.once('exit', code => { clearTimeout(timer); reject(new Error(`Preview exited ${code}: ${serverOutput}`)); });
  });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`); });
  const url = path => `${origin}${base}/${path}`;
  // /sim workbench helpers (DevLog-027): Compute in the toolbar, YAML in the Settings YAML tab, status in the bottom bar.
  const runButton = page.getByRole('button', { name: 'Compute', exact: true });
  const editor = page.getByLabel('Input YAML', { exact: true });
  const complete = () => page.locator('[data-status="Cross-section solve complete"]').waitFor();
  const node = async id => { await page.locator(`[data-node="${id}"]`).click(); };
  const yaml = async () => { await page.getByRole('tab', { name: 'YAML', exact: true }).click(); return editor; };
  const settingsTab = async () => { await page.getByRole('tab', { name: 'Settings', exact: true }).click(); };
  const bottom = async name => { await page.getByRole('tab', { name, exact: false }).filter({ hasText: name }).first().click(); };
  const metric = async key => { await node('results.derived'); await settingsTab(); return Number(await page.locator(`[data-metric="${key}"]`).getAttribute('data-value')); };
  const loadSim = async (query = 'id=chen2022-c') => {
    await page.goto(url(`sim?${query}${query.includes('pool=') ? '' : '&pool=2'}`));
    await until(() => runButton.isEnabled(), 'config loaded');
  };
  const screenshot = async name => {
    if (!process.env.SMOKE_SCREENSHOTS) return;
    await mkdir(process.env.SMOKE_SCREENSHOTS, { recursive: true });
    await page.screenshot({ path: join(process.env.SMOKE_SCREENSHOTS, `${name}.png`), fullPage: true });
  };

  for (const path of ['', 'table', 'explore', 'about']) {
    await page.goto(url(path));
    await page.waitForLoadState('networkidle');
    if (path === 'table') await page.locator('main table').first().waitFor();
    if (path === 'explore') await page.locator('.js-plotly-plot').first().waitFor();
    if (path === 'about') await page.getByRole('heading', { name: 'About the atlas' }).waitFor();
  }
  console.log('PASS dashboard/table/explore/about render');

  // Synthetic browser fixture for the all-sample state; canonical files remain untouched.
  const sampleAtlas = JSON.parse(await readFile(new URL('../static/data/atlas.json', import.meta.url), 'utf8'));
  const samplePaper = sampleAtlas.papers.find(p => p.paper_id === 'chen2022');
  const sample = sampleAtlas.devices.find(d => d.device_id === 'chen2022-a');
  sample.paper_id = samplePaper.paper_id = 'synthetic-loss-samples';
  sample.device_id = 'synthetic-loss-sample-a'; sample.device_label = 'Synthetic sample';
  samplePaper.label = 'Synthetic samples'; samplePaper.title = 'Synthetic loss sample fixture';
  samplePaper.n_devices = 1; samplePaper.device_ids = [sample.device_id];
  sample.tags = ['statistical_replicate', 'phase_only_loss'];
  sample.il_onchip_db = 0.01; sample.qualifiers = {}; sample.evidence = {};
  sampleAtlas.papers = [samplePaper]; sampleAtlas.devices = [sample];
  await page.route('**/data/atlas.json', route => route.fulfill({ json: sampleAtlas }));
  await page.goto(url('table'));
  await page.getByText('Synthetic samples · sample', { exact: true }).waitFor();
  await page.locator('main tbody tr').getByText('0.01', { exact: true }).waitFor();
  await page.goto(url('explore'));
  await page.getByText('Only statistical samples match; no headline device is selected.', { exact: true }).waitFor();
  assert.equal(await page.locator('.js-plotly-plot').count(), 0, 'no representative plot for sample-only records');
  await page.getByRole('button', { name: 'Show all records', exact: true }).click();
  const lossBadge = page.locator('[aria-label="Chart b"] .badge');
  await lossBadge.waitFor();
  assert.match(await lossBadge.getAttribute('title'), /Incomparable loss scope or samples: 1/);
  await page.unroute('**/data/atlas.json');
  console.log('PASS sample-only table preview without promoting a sample to a headline device');

  await page.goto(url('table'));
  const tableRows = page.locator('main tbody tr');
  await until(async () => await tableRows.count() > 0, 'table records loaded');
  const collapsedCount = await tableRows.count();
  await page.getByRole('button', { name: 'Expand all', exact: true }).click();
  await page.getByRole('button', { name: 'Collapse all', exact: true }).waitFor();
  assert.ok(await tableRows.count() > collapsedCount);
  await page.getByRole('button', { name: 'Collapse all', exact: true }).click();
  assert.equal(await tableRows.count(), collapsedCount);
  await page.getByPlaceholder('Search', { exact: true }).fill('chen2022');
  await until(async () => await tableRows.count() === 1, 'paper search applied');
  assert.ok((await tableRows.innerText()).includes('>67'), 'audited bandwidth bound is visible');
  await page.getByRole('button', { name: 'Columns', exact: true }).click();
  await page.getByLabel('FOM (GHz/V)', { exact: true }).check();
  await tableRows.getByText(/\(nominal\)/).waitFor();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString('utf8');
  assert.match(csv, /paper_id,device_id,matches_filters,vpi_convention/);
  assert.match(csv, /3 dB BW qualifier,3 dB BW basis,3 dB BW context/);
  assert.match(csv, /,67,gt,measured,/);
  assert.match(csv, /indeterminate,derived,/);
  await download.delete();
  await screenshot('table-qualified');
  await page.getByPlaceholder('Search', { exact: true }).fill('no-paper-matches-this');
  await page.getByText('No rows match the filters.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await until(async () => await tableRows.count() === collapsedCount, 'reset restores every paper');

  // URL state: a hash changed outside the app is adopted rather than overwritten; stale keys cannot break the table.
  await page.evaluate(() => { location.hash = 'q=chen2022&sort=vpil:asc'; });
  await until(async () => await tableRows.count() === 1, 'hash change applied to the filters');
  assert.equal(await page.getByPlaceholder('Search', { exact: true }).inputValue(), 'chen2022');
  assert.match(await page.evaluate(() => location.hash), /q=chen2022/);
  await page.goto(url('about'));
  await page.goto(url('table#sort=no-such-column:asc'));
  await until(async () => await tableRows.count() === collapsedCount, 'stale sort key ignored');
  await page.goto(url('about'));
  await page.goto(url('table#q=ogiso2024'));
  await until(async () => await tableRows.count() === 1, 'search from shared URL');
  await tableRows.first().click();
  await page.locator('.drawer').waitFor();
  assert.match(await page.locator('.drawer').innerText(), />29\.8/, 'drawer shows the propagated FOM lower bound, not an approximation');
  assert.doesNotMatch(await page.locator('.drawer').innerText(), /~29\.8/);
  await page.keyboard.press('Escape');
  await page.goto(url('about'));
  await page.goto(url('explore#q=no-paper-matches-this'));
  await page.getByText('No devices match the filters.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await page.locator('.js-plotly-plot').first().waitFor();
  console.log('PASS URL hash adoption, stale sort key, reset from empty states and drawer bound agreement');

  // Narrow viewport: filters collapse above the content and the drawer covers the page.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url('table'));
  await until(async () => await tableRows.count() > 0, 'narrow table loaded');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'table page overflows narrow viewport');
  assert.ok(await page.locator('main .scroller').evaluate(el => el.clientWidth >= 380), 'table is squeezed by the filter column');
  assert.equal(await page.locator('aside .scroll').isVisible(), false, 'filters start collapsed');
  await page.getByRole('button', { name: 'Filters', exact: false }).click();
  assert.ok(await page.locator('aside .scroll').isVisible());
  await page.getByPlaceholder('Search', { exact: true }).fill('ogiso2024');
  await until(async () => await tableRows.count() === 1, 'narrow search applied');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await screenshot('table-mobile');
  await tableRows.first().click();
  await page.locator('.drawer').waitFor();
  assert.ok(await page.locator('.drawer').evaluate(el => el.getBoundingClientRect().width >= 380), 'drawer unusably narrow');
  await screenshot('drawer-mobile');
  await page.goto(url('explore'));
  await page.locator('.js-plotly-plot').first().waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'explore overflows narrow viewport');
  assert.ok(await page.locator('main .main').evaluate(el => el.clientWidth >= 380), 'explore is squeezed by the filter column');
  await page.setViewportSize({ width: 1440, height: 1050 });
  console.log('PASS narrow-viewport table, filters, drawer and explore layout');

  await page.goto(url('explore'));
  const materialChart = page.locator('[aria-label="Chart c"] .js-plotly-plot');
  await until(() => materialChart.evaluate(el => (el.data ?? []).some(t => t.customdata?.length)), 'material summary has real points');
  assert.ok(await page.locator('[aria-label="Chart c"] .badge').innerText() !== '0/0');
  await screenshot('explore-comparisons');
  console.log('PASS table expansion/search/empty state, qualified CSV and restored material chart');

  await page.goto(url('sim?id=deng2026-a'));
  await page.getByRole('alert').filter({ hasText: 'Preview only. Solve blocked: materials.barium_titanate.eps_r' }).waitFor();
  await page.getByRole('application', { name: 'Cross-section graphics' }).waitFor();
  await page.getByRole('heading', { name: 'Missing or inferred inputs' }).waitFor();
  await page.getByText('Config validation status: unvalidated', { exact: true }).waitFor();
  assert.equal(await runButton.isEnabled(), false, 'incomplete physical inputs must not reach the worker');
  assert.equal(await page.locator('[data-metric]').count(), 0);
  assert.equal(page.workers().length, 0);
  // A draft still meshes (geometry only): Build mesh runs the mesher without physics.
  await page.getByRole('button', { name: 'Build mesh', exact: true }).click();
  await page.locator('[data-status="Mesh built"]').waitFor();
  await until(async () => Number(await page.locator('.gfx').getAttribute('data-ntris')) > 0, 'draft mesh drawn');
  assert.equal(await page.locator('.gfx').getAttribute('data-quantity'), 'mesh');
  await screenshot('sim-incomplete');
  console.log('PASS incomplete paper config previews geometry, disclosures and mesh with solve disabled');

  await loadSim();
  await delay(300);
  assert.doesNotMatch(page.url(), /#/, 'the table/explore hash is not written on /sim');
  // Stage readiness of a paper config: EO overlap needs explicit arm windows; RF line is blocked on the loaded T-rail cut
  // (Q2 C2) and needs an explicit dielectric loss model on the unloaded cut.
  await page.locator('[data-stage-blocked="eo_overlap"]').filter({ hasText: 'optics.eo' }).waitFor();
  await page.locator('[data-stage-blocked="rf_line"]').filter({ hasText: 'loaded cut of a periodic_t_rail line' }).waitFor();
  assert.equal(await page.getByLabel('EO overlap', { exact: true }).isDisabled(), true);
  assert.equal(await page.getByLabel('RF line', { exact: true }).isDisabled(), true);
  assert.equal(await page.getByLabel('Optical mode', { exact: true }).isDisabled(), false);
  const sectionSelect = page.getByLabel('Cross-section', { exact: true });
  await sectionSelect.selectOption('unloaded');
  await page.locator('[data-stage-blocked="rf_line"]').filter({ hasText: 'dielectric_loss_model' }).waitFor();
  await sectionSelect.selectOption('geometry');
  await page.locator('[data-stage-blocked="rf_line"]').filter({ hasText: 'loaded cut of a periodic_t_rail line' }).waitFor();
  console.log('PASS per-stage readiness of a paper config (loaded and unloaded cuts)');

  // Model Builder navigation: every node opens its settings; physics nodes carry the readiness reason.
  for (const [id, title] of [['params', 'Parameters'], ['materials', 'Materials'], ['mesh', 'Mesh'], ['physics.mode', 'Mode Analysis'], ['physics.eo', 'EO Coupling'], ['study.sweep', 'Parametric Sweep'], ['results.targets', 'Targets'], ['model', 'Model']]) {
    await node(id);
    await page.locator('.settings .title').filter({ hasText: title }).waitFor();
  }
  await node('physics.eo');
  await page.locator('[data-readiness="eo_overlap"]').filter({ hasText: 'optics.eo' }).waitFor();
  assert.equal(await page.locator('[data-node="physics.eo"] .tag').innerText(), 'blocked');
  await node('materials');
  await page.locator('.settings .body button.link').first().click();
  await page.locator('.settings .title').filter({ hasText: 'Material:' }).waitFor();
  console.log('PASS Model Builder tree navigation and per-node settings');

  const published = await page.request.get(url('sims/chen2022/config.yaml'));
  assert.equal(await published.text(), chen, 'published config must equal the tracked input');
  await runButton.click(); await complete();
  for (const [key, value] of Object.entries(expected.metrics)) {
    const actual = await metric(key);
    assert.ok(Math.abs(actual - value) <= Math.abs(value) * 1e-8, `browser/Node disagreement: ${key}`);
  }
  await node('results.targets');
  assert.match(await page.locator('.target-summary').innerText(), /0 of 11 targets evaluated/);
  // Field view: the solve switches the graphics to the potential; hovering probes value, region and material.
  const gfx = page.locator('.gfx');
  await until(async () => (await gfx.getAttribute('data-quantity')) === 'phi', 'potential shown after the solve');
  assert.ok(Number(await gfx.getAttribute('data-ntris')) > 1000);
  console.log(`INFO graphics renderer ${await gfx.getAttribute('data-renderer')}`);
  const stage = page.locator('.stage');
  const sb = await stage.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await until(async () => /Potential .* V/.test(await page.locator('.probe').getAttribute('data-probe') ?? ''), 'probe shows the potential');
  for (const q of ['enorm', 'ex', 'mesh', 'mesh_quality']) {
    await page.getByLabel('Plot quantity', { exact: true }).selectOption(q);
    await until(async () => (await gfx.getAttribute('data-quantity')) === q, `quantity ${q}`);
  }
  await page.getByLabel('Plot quantity', { exact: true }).selectOption('phi');
  await screenshot('sim-desktop');
  // Element order (U2): a P2 solution is drawn on elements split into 4 and labelled P2.
  if (chenFields.elementOrder === 2) {
    await page.getByLabel('Plot quantity', { exact: true }).selectOption('phi');
    assert.equal(Number(await gfx.getAttribute('data-ntris')), 4 * (chenFields.tri.length / 3), 'P2 refined display mesh');
    assert.match(await page.getByLabel('Plot quantity', { exact: true }).locator('option[value="phi"]').innerText(), /\(P2\)/);
    await node('results.derived'); await settingsTab();
    assert.match(await page.locator('[data-run-solver]').innerText(), /P2 electrostatics/);
  }
  console.log(`PASS real Chen worker run, browser/Node agreement, unsupported targets excluded, field view and probe (P${chenFields.elementOrder})`);

  // WebGL context loss (U1): restore re-uploads and repaints; no restore falls back to Canvas 2D; PNG never blank.
  if (await gfx.getAttribute('data-renderer') === 'webgl2') {
    await page.evaluate(() => { const c = document.querySelector('.stage canvas.gl'); window.__lose = c.getContext('webgl2').getExtension('WEBGL_lose_context'); window.__lose.loseContext(); });
    await page.locator('.bottom .row.msg').filter({ hasText: 'WebGL context lost' }).first().waitFor();
    const paintsBefore = Number(await gfx.getAttribute('data-paints'));
    await page.evaluate(() => window.__lose.restoreContext());
    await page.locator('.bottom .row.msg').filter({ hasText: 'WebGL context restored' }).first().waitFor();
    await until(async () => Number(await gfx.getAttribute('data-paints')) > paintsBefore, 'repaint after restore');
    assert.equal(await gfx.getAttribute('data-renderer'), 'webgl2');
    await page.evaluate(() => { const c = document.querySelector('.stage canvas.gl'); window.__lose2 = c.getContext('webgl2').getExtension('WEBGL_lose_context'); window.__lose2.loseContext(); });
    const pngWhileLost = page.waitForEvent('download');
    await page.locator('.gfx .bar button', { hasText: 'PNG' }).click();
    const lostPng = await pngWhileLost;
    await lostPng.delete();
    await bottom('Log');
    await page.locator('.bottom .row').filter({ hasText: 'PNG rendered with the Canvas 2D renderer' }).first().waitFor();
    await bottom('Messages');
    await page.locator('.bottom .row.msg').filter({ hasText: 'switched to the Canvas 2D renderer' }).first().waitFor();
    await until(async () => (await gfx.getAttribute('data-renderer')) === 'canvas2d', 'Canvas 2D fallback');
    await until(async () => Number(await gfx.getAttribute('data-paints')) > 0, 'fallback paints');
    // W5: a late restore of the detached GL canvas changes nothing.
    await page.evaluate(() => { try { window.__lose2.restoreContext(); } catch { /* already restored or not allowed */ } });
    await delay(400);
    assert.equal(await page.locator('.bottom .row.msg').filter({ hasText: 'could not be recreated' }).count(), 0, 'no second fallback');
    assert.equal(await gfx.getAttribute('data-renderer'), 'canvas2d');
    console.log('PASS WebGL context loss: restore and repaint, Canvas 2D fallback, PNG export while lost');
  } else console.log('SKIP WebGL context loss (renderer is not WebGL2 in this browser)');

  // Cut Line 2D: drag across the canvas; the sampled potential appears as a 1D plot.
  await page.getByRole('button', { name: 'Cut line', exact: true }).click();
  await page.mouse.move(sb.x + sb.width * 0.15, sb.y + sb.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.85, sb.y + sb.height * 0.55, { steps: 6 });
  await page.mouse.up();
  await page.locator('.settings .title').filter({ hasText: 'Cut Line 2D' }).waitFor();
  await page.getByRole('img', { name: 'Cut line plot' }).waitFor();
  assert.ok(Number(await page.locator('[data-cut-valid]').getAttribute('data-cut-valid')) > 50, 'cut line samples inside the mesh');
  console.log('PASS cut line sampling and 1D plot');

  await yaml();
  await editor.fill(`${chen}\n# Edited locally for smoke validation\n`);
  await bottom('Messages');
  await page.getByText('Inputs changed. These results belong to the previous run.').first().waitFor();
  assert.equal(await page.locator('.gfx .stale').count(), 1, 'stale marker on the graphics');
  await page.getByLabel('Cross-section', { exact: true }).selectOption('unloaded');
  await runButton.click(); await complete();
  await node('results.derived'); await settingsTab();
  await page.locator('[data-run-info]').filter({ hasText: 'chen2022-c · unloaded' }).waitFor();
  assert.equal(await page.getByText('Inputs changed. These results belong to the previous run.').count(), 0);
  console.log('PASS stale-result detection and alternate cross-section');

  await loadSim();
  await runButton.click();
  await page.locator('[data-status="Meshing and solving electrostatics"]').waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('[data-status="Cancelled"]').waitFor();
  await until(() => page.workers().length === 0, 'cancelled worker terminated');
  assert.equal(await page.locator('[data-metric]').count(), 0);
  assert.ok(await runButton.isEnabled());
  console.log('PASS cancellation clears the active worker and discards the run');

  await page.getByLabel('Optical mode', { exact: true }).check();
  await runButton.click();
  await page.getByRole('alert').filter({ hasText: chenOpticalError.slice(0, 80) }).waitFor(); // engine's own message
  await until(() => page.workers().length === 0, 'failed worker terminated');
  assert.equal(await page.locator('[data-metric]').count(), 0);
  await yaml();
  await editor.fill('schema: invalid');
  await page.getByRole('alert').filter({ hasText: 'expected eo-atlas.sim/v1' }).waitFor();
  assert.equal(await runButton.isEnabled(), false);
  console.log('PASS unsupported optical error and invalid-input guard');

  await editor.fill(analytic);
  await runButton.click(); await complete();
  const neff = await metric('n_eff');
  assert.ok(Math.abs(neff - expectedOptical.metrics.n_eff) < 1e-8);
  await node('results.targets');
  assert.match(await page.locator('.target-summary').innerText(), /1 of 2 targets evaluated · 1 passed · 0 failed/);
  await node('results.field:opt_int');
  await until(async () => (await gfx.getAttribute('data-quantity')) === 'opt_int', 'optical mode shown');
  const miss = parseConfig(analytic).raw;
  miss.targets[0].value = 20;
  await yaml();
  await editor.fill(JSON.stringify(miss));
  await runButton.click(); await complete();
  await node('results.targets');
  assert.match(await page.locator('.target-summary').innerText(), /1 of 2 targets evaluated · 0 passed · 1 failed/);
  console.log('PASS retry, optical browser/Node agreement, optical field view and failed-target display');

  // Vector optical solver (U2): selected through the Mode Analysis form; labels and components follow the solver.
  await yaml();
  await editor.fill(analytic);
  await node('physics.mode'); await settingsTab();
  await page.locator('.settings label.f').filter({ hasText: /^solver/ }).locator('select').selectOption('vector');
  await yaml();
  assert.match(await editor.inputValue(), /solver: vector/);
  await runButton.click(); await complete();
  assert.ok(Math.abs(await metric('n_eff') - expectedVector.metrics.n_eff) < 1e-8, 'vector n_eff browser/Node');
  assert.match(await page.locator('[data-run-solver]').innerText(), /vector optical solver/);
  await node('results.field:opt_int');
  assert.match(await page.getByLabel('Plot quantity', { exact: true }).locator('option[value="opt_int"]').innerText(), /vector/);
  await page.getByLabel('Plot quantity', { exact: true }).selectOption('opt:hy');
  await until(async () => (await gfx.getAttribute('data-quantity')) === 'opt:hy', 'vector H component shown');
  console.log('PASS vector optical solver selection, browser/Node n_eff, vector labels and H components');

  // W1: group-index choices come from the engine list (includes the default perturbation, re-selectable).
  await node('physics.mode'); await settingsTab();
  const giOptions = await page.locator('.settings label.f').filter({ hasText: /^group index/ }).locator('option').allInnerTexts();
  for (const m of ['perturbation', 'finite_difference_wavelength', 'fixed']) assert.ok(giOptions.includes(m), `group index option ${m}`);
  console.log('PASS group-index selector lists the engine methods');

  for (const policy of ['absent', 'pec_scalar']) {
    const input = parseConfig(analytic).raw;
    input.geometry.optical_window.x_um = [-1, 1]; // synthetic fixture: optical window includes plates
    input.optics.metal_in_window = policy;
    const text = JSON.stringify(input);
    const nodeResult = runCrossSection(text, { optical: true });
    await yaml();
    await editor.fill(text);
    await runButton.click(); await complete();
    await node('results.derived'); await settingsTab();
    await page.locator(`[data-optical-policy="${policy}"]`).waitFor();
    await page.getByText(/Window-edge diagnostic:/).waitFor();
    const actual = Number(await page.locator('[data-metric="n_eff"]').getAttribute('data-value'));
    assert.ok(Math.abs(actual - nodeResult.metrics.n_eff) < 1e-8);
    if (policy === 'pec_scalar') await page.getByText(/Scalar PEC is exact on horizontal faces only: 0%/).waitFor();
    await screenshot(`sim-optical-${policy}`);
  }
  console.log('PASS explicit optical policies, limitations and browser/Node diagnostics');

  // Synthetic analytic EO/RF fixture: all implemented stages in the worker, compared with Node.
  await yaml();
  await editor.fill(gsg);
  await page.getByLabel('EO overlap', { exact: true }).check();
  await page.getByLabel('RF line', { exact: true }).check();
  await runButton.click(); await complete();
  await node('results.derived'); await settingsTab();
  await page.locator('[data-stages="electrostatics optical_mode eo_overlap rf_line"]').waitFor();
  for (const key of ['vpi_l_dc_vcm', 'vpi_dc_v', 'n_eff', 'z0_ohm']) {
    const actual = Number(await page.locator(`[data-metric="${key}"]`).getAttribute('data-value'));
    assert.ok(Math.abs(actual - expectedStages.metrics[key]) <= Math.abs(expectedStages.metrics[key]) * 1e-9, `browser/Node disagreement: ${key}`);
  }
  for (const arm of ['A', 'B']) {
    const dn = Number(await page.locator(`[data-arm-dn="${arm}"]`).getAttribute('data-value'));
    assert.ok(Math.abs(dn - expectedStages.eo.arms[arm].dnEffPerV) <= Math.abs(dn) * 1e-9, `arm ${arm} dn`);
  }
  await page.locator('[data-eo-convention="mzm_push_pull"]').waitFor();
  await node('results.rf');
  const alpha = Number(await page.locator('[data-rf-alpha="50"]').getAttribute('data-value'));
  assert.ok(Math.abs(alpha - expectedStages.rf.atTargets[0].alphaDbPerCm) <= alpha * 1e-12);
  await page.locator('[aria-label="RF sweep"] canvas').first().waitFor();
  assert.equal(await page.locator('[aria-label="RF sweep"] canvas').count(), 3);
  await node('results.targets');
  assert.match(await page.locator('.target-summary').innerText(), /4 of 6 targets evaluated · 4 passed · 0 failed/);
  await screenshot('sim-eo-rf');
  // Q2 M5: an opposite-sign pair far from -1 stays comparable and shows the balance warning.
  const unbalanced = gsg.replace('{name: ground_l, role: ground, material: metal, weight: 0,', '{name: ground_l, role: ground, material: metal, weight: 0.5,');
  assert.notEqual(unbalanced, gsg);
  await yaml();
  await editor.fill(unbalanced);
  await runButton.click(); await complete();
  await node('results.derived'); await settingsTab();
  await page.locator('[data-balance-warning]').waitFor();
  await page.locator('[data-eo-convention="mzm_push_pull"]').waitFor();
  // Breaking an RF input blocks the selected stage before any worker starts.
  await yaml();
  await editor.fill(gsg.replace('  dielectric_loss_model: tan_delta_regions\n', ''));
  await bottom('Messages');
  await page.locator('[data-stage-blocked="rf_line"]').filter({ hasText: 'dielectric_loss_model' }).waitFor();
  assert.equal(await runButton.isEnabled(), false);
  await page.getByLabel('RF line', { exact: true }).uncheck();
  assert.equal(await runButton.isEnabled(), true);
  console.log('PASS EO overlap and RF line stages in the browser, Node agreement, convention gating, balance warning and blocked-stage guard');

  // Pockels delta n view (engine round 3): per-element values on the optical mesh, probed in the browser at Node
  // triangle centroids and compared with the Node export of the same tree.
  await loadSim('id=chen2022-c&debug=1');
  await yaml();
  await editor.fill(gsg);
  await page.getByLabel('Optical mode', { exact: true }).check();
  await page.getByLabel('EO overlap', { exact: true }).check();
  await runButton.click(); await complete();
  await node('results.field:pk:dnXX');
  await until(async () => (await gfx.getAttribute('data-quantity')) === 'pk:dnXX', 'Pockels view shown');
  assert.match(await page.getByLabel('Plot quantity', { exact: true }).locator('option[value="pk:dnXX"]').innerText(), /Pockels dn_xx \(per V\)/);
  const opt = gsgFields.optical;
  const probes = [];
  for (let t = 0; t < opt.tri.length / 3 && probes.length < 6; t += 997) {
    if (opt.pockels.dnXX[t] === 0) continue;
    const [a, b, c] = [opt.tri[3 * t], opt.tri[3 * t + 1], opt.tri[3 * t + 2]];
    probes.push({ t, x: (opt.x[a] + opt.x[b] + opt.x[c]) / 3, y: (opt.y[a] + opt.y[b] + opt.y[c]) / 3 });
  }
  assert.ok(probes.length >= 3, 'non-zero Pockels triangles found');
  for (const p of probes) {
    const got = await page.evaluate(([x, y]) => window.__simProbe(x, y), [p.x, p.y]);
    assert.ok(got && got.unit === '1/V' && /per element/.test(got.label), `probe label/unit at triangle ${p.t}`);
    assert.ok(Math.abs(got.value - opt.pockels.dnXX[p.t]) <= Math.abs(opt.pockels.dnXX[p.t]) * 1e-12, `dn_xx browser ${got.value} vs Node ${opt.pockels.dnXX[p.t]}`);
  }
  // W7: the dataset picker stays visible for Pockels quantities and the arm is named in the label.
  const picker = page.getByLabel('Optical mode index', { exact: true });
  await picker.waitFor();
  const armB = (await picker.locator('option').evaluateAll(os => os.map(o => o.value))).find(v => v.startsWith('B:'));
  assert.ok(armB, 'arm B dataset offered');
  await picker.selectOption(armB);
  const p0 = probes[0];
  const armBProbe = await page.evaluate(([x, y]) => window.__simProbe(x, y), [p0.x, p0.y]);
  assert.ok(armBProbe === null || /\[arm B\]/.test(armBProbe.label), 'arm B named in the label');
  await picker.selectOption((await picker.locator('option').evaluateAll(os => os.map(o => o.value)))[0]);
  console.log(`PASS Pockels delta n view: ${probes.length} probes equal the Node export, unit 1/V, per-element label, arm picker`);

  // W2: on a template config the element order is written to template.mesh (not to the generated geometry).
  await loadSim('id=renaud2023-3um-738');
  await node('mesh'); await settingsTab();
  const orderSel = page.locator('.settings label.f').filter({ hasText: /^element order/ }).locator('select');
  assert.equal(await orderSel.isDisabled(), false, 'element order editable on a template config');
  await orderSel.selectOption('1');
  await yaml();
  const tplText = await editor.inputValue();
  assert.match(tplText, /^template:[\s\S]*\n  mesh:[\s\S]*element_order: 1/m, 'element_order under template.mesh');
  assert.doesNotMatch(tplText, /^geometry:/m, 'no geometry block written into a template config');
  await page.locator('[data-readiness="electrostatics"]').count();
  console.log('PASS template config: element order edits template.mesh');

  // W4: Canvas 2D fallback with a P2 mesh above the triangle budget draws gap-free (raster sampling, no speckle).
  await loadSim('id=mao2022-a&renderer=canvas');
  await runButton.click(); await complete();
  await until(async () => (await gfx.getAttribute('data-renderer')) === 'canvas2d' && Number(await gfx.getAttribute('data-ntris')) > 60000, 'canvas fallback over budget');
  await page.locator('.gfx .bar button', { hasText: 'Window' }).click();
  await page.waitForTimeout(300);
  const holes = await page.evaluate(() => {
    const c = document.querySelector('.stage canvas.gl');
    const ctx = c.getContext('2d');
    const bg = getComputedStyle(document.querySelector('.gfx')).getPropertyValue('--bg').trim();
    const [r, g, b] = [1, 3, 5].map(i => parseInt(bg.slice(i, i + 2), 16));
    const w = c.width, h = c.height;
    const d = ctx.getImageData(Math.floor(w * 0.3), Math.floor(h * 0.3), Math.floor(w * 0.4), Math.floor(h * 0.4)).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === r && d[i + 1] === g && d[i + 2] === b) n++;
    return n / (d.length / 4);
  });
  assert.ok(holes < 0.005, `Canvas 2D fallback background fraction ${holes} inside the optical window`);
  console.log(`PASS Canvas 2D fallback at P2 is gap-free (background fraction ${holes.toFixed(4)})`);

  // Form edit round trip: a Settings field rewrites the canonical YAML (comments kept) and marks results stale.
  await yaml();
  await editor.fill(gsg);
  await page.getByLabel('EO overlap', { exact: true }).uncheck();
  await page.getByLabel('Optical mode', { exact: true }).uncheck();
  await node('material:eo_medium'); await settingsTab();
  const epsField = page.locator('.settings label.f').filter({ hasText: /^eps_r/ }).locator('input');
  await epsField.fill('20'); await epsField.press('Enter');
  await yaml();
  const edited = await editor.inputValue();
  assert.match(edited, /eps_r: 20\n/);
  assert.match(edited, /^# Analytic test input/, 'header comment kept');
  // Parametric sweep (custom path) on a 2-worker pool; each point agrees with Node.
  const sweepValues = [20, 30, 40];
  const sweepNode = sweepValues.map(v => runCrossSection(gsg.replace('    eps_r: 30\n', `    eps_r: ${v}\n`)).metrics.z0_ohm);
  await node('study.sweep'); await settingsTab();
  await page.getByLabel('Sweep parameter', { exact: true }).fill('materials.eo_medium.eps_r');
  await page.getByLabel('Sweep values', { exact: true }).fill(sweepValues.join(', '));
  await page.getByRole('button', { name: 'Run sweep', exact: true }).click();
  await page.locator('.settings .title').filter({ hasText: 'Sweep Plot' }).waitFor();
  await until(async () => await page.locator('[data-sweep-progress]').count() === 0 && !(await page.locator('[data-node="study.sweep"] .tag').count()), 'sweep finished', 60000);
  await page.getByLabel('Sweep metric', { exact: true }).selectOption('z0_ohm');
  await page.getByRole('img', { name: 'Sweep plot' }).waitFor();
  const rows = page.locator('.settings .scroll tbody tr');
  assert.equal(await rows.count(), 3);
  const header = await page.locator('.settings .scroll thead th').allInnerTexts();
  const z0Col = header.findIndex(h => h.startsWith('Z0'));
  for (let i = 0; i < 3; i++) {
    const shown = Number(await rows.nth(i).locator('td').nth(z0Col).innerText());
    assert.ok(Math.abs(shown - sweepNode[i]) <= Math.abs(sweepNode[i]) * 1e-3, `sweep point ${i} z0 ${shown} vs ${sweepNode[i]}`);
  }
  await screenshot('sim-sweep');
  // Sweep cancel: the pool is terminated, finished points stay, the rest are marked cancelled.
  await node('study.sweep');
  await page.getByLabel('Sweep values', { exact: true }).fill('10:2:40');
  await page.getByRole('button', { name: 'Run sweep', exact: true }).click();
  await until(async () => page.workers().length > 0, 'sweep workers started');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await until(() => page.workers().length === 0, 'sweep workers terminated');
  await node('study.sweep');
  assert.ok(await page.locator('[data-sweep-row="cancelled"]').count() > 0, 'cancelled points marked');
  console.log('PASS form edit YAML round trip, custom parametric sweep on a worker pool with Node agreement, sweep cancel');

  await page.goto(url('sim?id=unknown-config'));
  await page.getByText('The requested config is not in this atlas.').waitFor();
  assert.equal(await runButton.isEnabled(), false);
  await page.getByRole('tab', { name: 'YAML', exact: true }).click();
  assert.equal(await editor.inputValue(), '');
  await loadSim('config=sims/chen2022/config.yaml');
  await runButton.click();
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.getByRole('heading', { name: 'About the atlas' }).waitFor();
  await until(() => page.workers().length === 0, 'navigation terminated the worker');
  console.log('PASS unknown config, legacy config URL and navigation cleanup');

  // Shareable URL state: section, mesh level, stages and a form override are restored from the query.
  await loadSim('id=chen2022-c&section=unloaded&mesh=2&stages=optical_mode&set=optics.wavelength_nm=1310');
  assert.equal(await page.getByLabel('Cross-section', { exact: true }).inputValue(), 'unloaded');
  assert.equal(await page.getByLabel('Mesh resolution', { exact: true }).inputValue(), '2');
  assert.equal(await page.getByLabel('Optical mode', { exact: true }).isChecked(), true);
  await yaml();
  assert.match(await editor.inputValue(), /wavelength_nm: 1310/);
  console.log('PASS shareable URL state restores section, mesh, stages and overrides');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url('sim?id=deng2026-a'));
  await page.getByRole('alert').filter({ hasText: 'Preview only. Solve blocked:' }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'incomplete draft overflows narrow viewport');
  assert.ok(await page.locator('.sim-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'incomplete draft content overflows narrow viewport');
  await loadSim();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'app shell overflows narrow viewport');
  assert.ok(await page.locator('.sim-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'sim content overflows narrow viewport');
  await yaml();
  await editor.fill(analytic); await runButton.click(); await complete();
  assert.ok(await page.locator('.gfx').evaluate(el => el.getBoundingClientRect().height >= 300), 'graphics usable at 390 px');
  await page.locator('.sim-page').evaluate(el => el.scrollTop = 0);
  await screenshot('sim-mobile');
  console.log('PASS narrow-viewport controls and worker run');
  assert.deepEqual(errors, [], 'browser/network errors');
  console.log(`PASS smoke suite at base path ${base || '/'}`);
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
