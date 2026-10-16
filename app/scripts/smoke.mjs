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
import { createSolutionStore, evaluateAtPoints, evaluateDerived, evaluatePlot, latticeIndex, modeTable, refinedPoints, refinePattern } from '../../engine/src/postproc/index.mjs';

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
// Engine store in Node (DevLog-031) for browser/Node agreement of Results evaluations (R-UI, DevLog-032).
const gsgKept = runCrossSection(gsg, { stages: ['optical_mode', 'eo_overlap'], keep: true });
const gsgStore = createSolutionStore(gsgKept);
const gsgModes2 = yamlSetIn(gsg, 'optics.num_modes', 2);
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
  page.on('pageerror', error => { errors.push(error.message); if (process.env.SMOKE_TRACE) console.log(`PAGEERROR ${error.message}`); });
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
  // Results (DevLog-032): graphics view = plot group; wait for its evaluations; select a view by label prefix.
  const viewSelect = page.getByLabel('Graphics view', { exact: true });
  const settled = () => until(async () => (await page.locator('.gfx').getAttribute('data-pending')) === 'false', 'plot evaluations settled');
  const showView = async prefix => {
    const v = (await viewSelect.locator('option').evaluateAll(os => os.map(o => [o.value, o.textContent]))).find(([, l]) => l.startsWith(prefix));
    assert.ok(v, `view ${prefix}`);
    await viewSelect.selectOption(v[0]);
    await until(async () => (await page.locator('.gfx').getAttribute('data-view')) === v[0], `view ${prefix}`);
    await settled();
    return v[0];
  };
  const workersBesidesSolution = async () => page.workers().length - Number(await page.locator('.sim-page').getAttribute('data-solution') ?? 0);
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
  assert.equal(await page.locator('.gfx').getAttribute('data-view'), 'mesh');
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
  // Field view: the solve creates the default plot groups and shows Electric Potential; hovering probes value and region.
  const gfx = page.locator('.gfx');
  await until(async () => /^pg/.test(await gfx.getAttribute('data-view') ?? '') && Number(await gfx.getAttribute('data-layers')) > 0, 'default plot group shown after the solve');
  await settled();
  assert.match(await page.locator('.stage .title').getAttribute('data-title'), /Surface: es\.V \(V\)\s+Contour: es\.V/);
  assert.ok(Number(await gfx.getAttribute('data-ntris')) > 1000);
  console.log(`INFO graphics renderer ${await gfx.getAttribute('data-renderer')}`);
  const stage = page.locator('.stage');
  const sb = await stage.boundingBox();
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
  await page.mouse.move(sb.x + sb.width / 2 + 3, sb.y + sb.height / 2 + 2);
  await until(async () => /es\.V -?[\d.e-]+ V/.test(await page.locator('.probe').getAttribute('data-probe') ?? ''), 'probe shows the potential');
  for (const v of ['Electric Field', 'Mesh', 'Electric Potential']) await showView(v);
  await page.getByLabel('Mesh coloring').waitFor({ state: 'detached' });
  await screenshot('sim-desktop');
  // Refined display (DevLog-034): the default Normal resolution splits every element into 3 x 3 sub-triangles.
  assert.equal(Number(await gfx.getAttribute('data-ntris')), 9 * (chenFields.tri.length / 3), 'refined display (Normal, r = 3)');
  if (chenFields.elementOrder === 2) {
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
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
    const lostPng = await pngWhileLost;
    await lostPng.delete();
    await bottom('Log');
    await page.locator('.bottom .row').filter({ hasText: 'Image rendered with the Canvas 2D renderer' }).first().waitFor();
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

  // Cut Line 2D dataset: drag across the canvas; Line Graph of the potential in a new 1D plot group.
  await page.getByRole('button', { name: 'Cut line', exact: true }).click();
  await page.mouse.move(sb.x + sb.width * 0.15, sb.y + sb.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(sb.x + sb.width * 0.85, sb.y + sb.height * 0.55, { steps: 6 });
  await page.mouse.up();
  await page.locator('.settings .title').filter({ hasText: 'Cut Line 2D' }).waitFor();
  await page.getByRole('button', { name: 'Line Graph', exact: true }).click();
  await until(async () => Number(await page.locator('.p1').getAttribute('data-series')) === 1, 'line graph series');
  await page.getByRole('img', { name: /1D plot group Line Graph/ }).waitFor();
  console.log('PASS cut line dataset and Line Graph');

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
  await showView('Mode, optical');
  assert.ok(Number(await gfx.getAttribute('data-layers')) > 0, 'optical mode shown');
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
  // Vector components through the expression of the Optical Mode surface (registry of the vector solver).
  const optView = await showView('Mode, optical');
  await node(`pg:${optView}`);
  await page.locator('.settings button.link', { hasText: 'Surface' }).click();
  const optExpr = page.getByLabel('Expression', { exact: true });
  await optExpr.fill('abs(opt.Hy)'); await optExpr.press('Enter');
  await settled();
  await until(async () => (await page.locator('.stage .title').getAttribute('data-title')).includes('abs(opt.Hy)'), 'vector H component shown');
  assert.equal(await page.locator('.stage .errs').count(), 0, 'no evaluation error for opt.Hy');
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
  await node('res.eo');
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
  await node('res.eo'); await settingsTab();
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
  const pkView = await showView('Pockels dn');
  const pkDs = (await page.locator('.stage .title').getAttribute('data-title'));
  assert.match(pkDs, /Surface: eo\.dnxx \(1\/V\)/);
  const opt = gsgFields.optical;
  const probes = [];
  for (let t = 0; t < opt.tri.length / 3 && probes.length < 6; t += 997) {
    if (opt.pockels.dnXX[t] === 0) continue;
    const [a, b, c] = [opt.tri[3 * t], opt.tri[3 * t + 1], opt.tri[3 * t + 2]];
    probes.push({ t, x: (opt.x[a] + opt.x[b] + opt.x[c]) / 3, y: (opt.y[a] + opt.y[b] + opt.y[c]) / 3 });
  }
  assert.ok(probes.length >= 3, 'non-zero Pockels points found');
  for (const p of probes) {
    const got = await page.evaluate(([x, y]) => window.__simProbe(x, y), [p.x, p.y]);
    const want = evaluateDerived(gsgStore, { kind: 'point', dataset: got.dataset, expr: 'eo.dnxx', unit: '1/V', selection: { point: [p.x, p.y] } }).value;
    assert.ok(got && got.unit === '1/V' && /eo\.dnxx/.test(got.label), `probe label/unit at point ${p.t}`);
    assert.ok(Math.abs(got.value - want) <= Math.abs(want) * 1e-12, `dn_xx browser ${got.value} vs Node store ${want}`);
  }
  // The plot group dataset picker switches the arm; the dataset is named in the title.
  await node(`pg:${pkView}`);
  await page.getByLabel('Plot group dataset').selectOption('armB');
  await settled();
  assert.match(await page.locator('.stage .title').getAttribute('data-title'), /Dataset: Arm B mode/);
  console.log(`PASS Pockels dn plot: ${probes.length} browser probes equal the Node engine store, unit 1/V, arm dataset picker`);

  // Results UI (DevLog-032): plot groups from the context menu, layered features of two datasets, expression units
  // and errors, selection by click + Surface Integration (= Node engine store), EO page values, export.
  const selNode = async () => page.locator('.tree .row.sel [data-node]').getAttribute('data-node');
  const nViews = async () => viewSelect.locator('option').count();
  const v0 = await nViews();
  await page.locator('[data-node="results"]').click({ button: 'right' });
  await page.locator('.menu [data-action="pg2d"]').click();
  await until(async () => (await nViews()) === v0 + 1, 'plot group added');
  const gid = (await selNode()).slice(3);
  await page.getByRole('button', { name: '+ Surface', exact: true }).click();
  const fExpr = () => page.getByLabel('Expression', { exact: true });
  await fExpr().fill('es.Ex'); await fExpr().press('Enter');
  await page.getByLabel('Unit', { exact: true }).fill('V/um'); await page.getByLabel('Unit', { exact: true }).press('Enter');
  await page.locator('[data-expr-check="ok"]').filter({ hasText: 'V/µm' }).waitFor();
  await node(`pg:${gid}`);
  await page.getByRole('button', { name: '+ Contour', exact: true }).click();
  await page.getByLabel('Feature dataset').selectOption('opt');
  await fExpr().fill('opt.normE^2'); await fExpr().press('Enter');
  await until(async () => (await page.getByLabel('Unit', { exact: true }).inputValue()) === '', 'incompatible unit cleared');
  await settled();
  assert.equal(Number(await gfx.getAttribute('data-layers')), 2, 'surface and contour layers');
  assert.match(await page.locator('.stage .title').getAttribute('data-title'), /Dataset: Electrostatics.*; Optical mode, k=\d.*Surface: es\.Ex \(V\/µm\).*Contour: opt\.normE\^2/);
  await screenshot('sim-layered');
  await fExpr().fill('opt.normE^2 + es.V');
  await page.locator('[data-expr-check="error"]').filter({ hasText: 'incompatible units' }).waitFor();
  await fExpr().fill('opt.normE^2'); await fExpr().press('Enter');
  await page.locator(`[data-node="pg:${gid}"]`).click({ button: 'right' });
  await page.locator('.menu [data-action="dup"]').click();
  await until(async () => (await nViews()) === v0 + 2, 'plot group duplicated');
  const dupNode = await selNode();
  assert.notEqual(dupNode, `pg:${gid}`);
  await page.locator(`[data-node="${dupNode}"]`).click({ button: 'right' });
  await page.locator('.menu [data-action="delete"]').click();
  await until(async () => (await nViews()) === v0 + 1, 'plot group deleted');
  console.log('PASS plot groups: add, duplicate, delete; layered surface and contour of two datasets; expression unit check and error');

  // Selection by clicking a domain, then Surface Integration over it equals the Node engine store.
  await showView('Electric Potential');
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  const vw = await page.evaluate(() => window.__simView());
  const sbx = await stage.boundingBox();
  await page.mouse.click(sbx.x + vw.W / 2 + (2 - vw.cx) * vw.scale, sbx.y + vw.H / 2 - (0 - vw.cy) * vw.scale);
  await until(async () => (await page.locator('[data-selection-regions]').getAttribute('data-selection-regions')) === 'medium', 'domain selected by click');
  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  await node('results.derived'); await settingsTab();
  await page.getByRole('button', { name: '+ Surface Integration', exact: true }).click();
  const dExpr = page.getByLabel('Derived expression');
  await dExpr.fill('es.We'); await dExpr.press('Enter');
  await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
  await page.locator('[data-eval-msg]').filter({ hasText: 'Evaluated' }).waitFor();
  const wantWe = evaluateDerived(gsgStore, { kind: 'surface_int', dataset: 'es', expr: 'es.We', selection: { regions: ['medium'] } }).value;
  const bottomCell = page.locator('[data-bottom-table] td[data-value]').last();
  await bottomCell.waitFor();
  const gotWe = Number(await bottomCell.getAttribute('data-value'));
  assert.ok(Math.abs(gotWe - wantWe) <= Math.abs(wantWe) * 1e-12, `surface integral browser ${gotWe} vs Node ${wantWe}`);
  console.log('PASS selection by click and Surface Integration over it (browser = Node engine store), table window');

  // EO Coupling page: engine values and conventional Gamma equal Node; quick plots.
  await node('res.eo');
  assert.ok(Math.abs(Number(await page.locator('[data-eo-vpil]').getAttribute('data-eo-vpil')) - gsgKept.eo.vpiLVcm) <= gsgKept.eo.vpiLVcm * 1e-9, 'EO VpiL');
  const gA = gsgKept.eo.arms.A.conventional.gamma;
  assert.ok(Math.abs(Number(await page.locator('[data-gamma="A"]').innerText()) - gA) <= 1e-3, `Gamma A ${gA}`);
  await page.locator('[data-eo-breakdown="A"]').waitFor();
  await page.getByRole('button', { name: 'Integrand across arm', exact: true }).click();
  await until(async () => Number(await page.locator('.p1').getAttribute('data-series')) === 1, 'integrand line graph');
  await node('res.eo');
  await page.getByRole('button', { name: 'EO overlap plot', exact: true }).click();
  await settled();
  assert.match(await page.locator('.stage .title').getAttribute('data-title'), /Surface: eo\.integrand/);
  console.log('PASS EO Coupling page equals the Node engine (VpiL, Gamma), breakdown table, integrand line graph and overlap plot');

  // Export: plotted data CSV, table CSV, image at a chosen size.
  await node('res.export');
  let dl = page.waitForEvent('download');
  await page.locator('.settings button.link').first().click();
  assert.match((await dl).suggestedFilename(), /\.csv$/);
  dl = page.waitForEvent('download');
  await page.locator('.settings button.link', { hasText: 'rows)' }).first().click();
  assert.match((await dl).suggestedFilename(), /Surface_Integration_1\.csv$/);
  await page.getByRole('button', { name: 'Image', exact: true }).click();
  await page.getByLabel('Image width (px)').fill('800');
  await page.getByLabel('Image height (px)').fill('500');
  dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG', exact: true }).click();
  assert.match((await dl).suggestedFilename(), /-800x500\.png$/);
  console.log('PASS export of plotted data, table and image at a chosen size');

  // Mode Analysis: two modes; selecting a row re-plots the dataset at that mode (browser = Node store).
  await yaml();
  await editor.fill(gsgModes2);
  await runButton.click(); await complete();
  // F3: a delete right after Compute is its own undo step; Undo never removes the defaults of the new solution.
  await page.locator('.sim-page[data-registry="1"]').waitFor();
  const firstPg = page.locator('[data-node^="pg:"]').first();
  const nDefaults = await page.locator('[data-node^="pg:"]').count();
  await firstPg.click({ button: 'right' });
  await page.locator('.menu [data-action="delete"]').click();
  await until(async () => (await page.locator('[data-node^="pg:"]').count()) === nDefaults - 1, 'group deleted right after Compute');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await until(async () => (await page.locator('[data-node^="pg:"]').count()) === nDefaults, 'undo restores the deleted group only');
  assert.equal(await page.getByRole('button', { name: 'Undo', exact: true }).isDisabled(), true, 'no undo step removes the defaults');
  console.log(`PASS undo after Compute: delete then Undo restores ${nDefaults} default groups, defaults are not an undo step (F3)`);
  await node('res.modes');
  const optRows = page.locator('[data-mode-table="opt"] [data-mode-row]');
  await until(async () => (await optRows.count()) === 2, 'two modes listed');
  const other = await page.locator('[data-mode-table="opt"] [data-mode-row][aria-selected="false"]').getAttribute('data-mode-row');
  await page.locator(`[data-mode-table="opt"] [data-mode-row="${other}"]`).click();
  await until(async () => (await page.locator(`[data-mode-table="opt"] [data-mode-row="${other}"]`).getAttribute('aria-selected')) === 'true', 'mode row selected');
  await showView('Mode, optical');
  const store2 = createSolutionStore(runCrossSection(gsgModes2, { stages: ['optical_mode', 'eo_overlap'], keep: true }));
  const pm = await page.evaluate(() => window.__simProbe(2, 0.1));
  const wantMode = evaluateDerived(store2, { kind: 'point', dataset: `opt:${other}`, expr: pm.label.split(' [')[0], selection: { point: [2, 0.1] } }).value;
  assert.ok(Math.abs(pm.value - wantMode) <= Math.abs(wantMode) * 1e-9, `mode ${other} probe ${pm.value} vs Node ${wantMode}`);
  console.log(`PASS Mode Analysis table: mode ${other} selected, plot equals the Node store at that mode`);

  // X3: one mode labelling: the table labels (k and family) and the EO page name the solved mode the same way.
  await node('res.modes');
  const labels = await page.locator('[data-mode-table="opt"] [data-mode-label]').allInnerTexts();
  assert.ok(labels.every(l => /^k=\d/.test(l)), `mode labels ${labels.join(', ')}`);
  const solvedLabel = await page.locator('[data-mode-table="opt"] tr', { hasText: 'solved' }).locator('[data-mode-label]').innerText();
  await node('res.eo');
  assert.ok((await page.locator('[data-arm-mode="A"]').innerText()).startsWith(solvedLabel), 'EO page names the solved mode as the mode table');
  // X8: the title states the mode of an optical dataset.
  await showView('Mode, optical');
  assert.match(await page.locator('.stage .title').getAttribute('data-title'), /Optical mode, k=\d.*n_eff/);
  console.log('PASS mode labels (X3) on the mode table, EO page and plot titles (X8)');

  // X2: Enter keeps the typed name (no silent completion to a longer name).
  await node('results.derived'); await settingsTab();
  await page.getByRole('button', { name: '+ Global Evaluation', exact: true }).click();
  const g2 = page.getByLabel('Derived expression');
  await g2.click(); await g2.pressSequentially('Vpi'); await g2.press('Enter');
  await delay(200);
  assert.equal(await g2.inputValue(), 'Vpi', 'typed name kept on Enter');
  console.log('PASS expression input keeps the typed name on Enter (X2)');

  // X4: the Select tool never changes a feature filter; it edits or creates a Selection node (logged).
  const potView = await showView('Electric Potential');
  await node(`pg:${potView}`);
  await page.locator('.settings button.link', { hasText: 'Surface' }).first().click();
  const featSel = await page.getByLabel('Feature selection').inputValue();
  await page.getByRole('button', { name: 'Select', exact: true }).click();
  const vw2 = await page.evaluate(() => window.__simView());
  const sb2 = await stage.boundingBox();
  await page.mouse.click(sb2.x + vw2.W / 2 + (2 - vw2.cx) * vw2.scale, sb2.y + vw2.H / 2 - (0 - vw2.cy) * vw2.scale);
  await page.locator('.settings .title').filter({ hasText: 'Selection:' }).waitFor();
  await page.getByRole('button', { name: 'Pan', exact: true }).click();
  await page.locator(`[data-node="pg:${potView}"]`).click();
  await page.locator('.settings button.link', { hasText: 'Surface' }).first().click();
  assert.equal(await page.getByLabel('Feature selection').inputValue(), featSel, 'feature filter unchanged by the Select tool');
  await bottom('Log');
  await page.locator('.bottom .row').filter({ hasText: 'created by the Select tool' }).first().waitFor();
  console.log('PASS Select tool edits only Selection nodes and logs the change (X4)');

  // Undo / redo of tree operations.
  const nv = await nViews();
  await page.locator(`[data-node="pg:${potView}"]`).click({ button: 'right' });
  await page.locator('.menu [data-action="delete"]').click();
  await until(async () => (await nViews()) === nv - 1, 'group deleted');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await until(async () => (await nViews()) === nv, 'group restored by undo');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await until(async () => (await nViews()) === nv - 1, 'deletion redone');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await until(async () => (await nViews()) === nv, 'group restored again');
  console.log('PASS undo and redo of tree operations');

  // Custom sharp-cornered tooltip instead of native titles.
  await page.getByRole('button', { name: 'Zoom box', exact: true }).hover();
  await page.locator('.tip-pop').filter({ hasText: 'Zoom box' }).waitFor();
  assert.equal(await page.locator('.tip-pop').evaluate(el => getComputedStyle(el).borderTopLeftRadius), '0px');
  assert.equal(await page.locator('.sim-page [title]').count(), 0, 'no native title tooltips in the sim UI');
  assert.equal(await page.locator('header [title]').count(), 0, 'no native title tooltips in the app shell');
  console.log('PASS custom tooltip (no native title attributes in the sim UI)');

  // DevLog-034 refined field plots: Resolution and Smoothing switch; every drawn lattice value equals the Node engine
  // (vector optical mode and P2 potential); interior lattice values equal exact point evaluation; no faceting: with
  // smoothing inside material domains the drawn field is continuous across element edges, and the largest color step
  // inside one sub-triangle shrinks with the resolution.
  {
    const gsgVec = yamlSetIn(gsg, 'optics.solver', 'vector');
    const vecStore = createSolutionStore(runCrossSection(gsgVec, { stages: ['optical_mode', 'eo_overlap'], keep: true }));
    await loadSim('id=chen2022-c&debug=1');
    await yaml();
    await editor.fill(gsgVec);
    await page.getByLabel('Optical mode', { exact: true }).check();
    await page.getByLabel('EO overlap', { exact: true }).check();
    await runButton.click(); await complete();
    const facets = {};
    for (const view of ['Mode, optical', 'Electric Potential']) {
      const gid = await showView(view);
      await page.locator(`[data-node^="pf:${gid}:"]`).first().click();
      await settingsTab();
      for (const [res, sm, r] of [['normal', 'material', 3], ['fine', 'none', 4], ['coarse', 'everywhere', 2], ['none', 'none', 1], ['normal', 'none', 3]]) {
        await page.getByLabel('Resolution', { exact: true }).selectOption(res);
        await page.getByLabel('Smoothing', { exact: true }).selectOption(sm);
        await until(async () => { const d = await page.evaluate(() => window.__simDrawn([])); return d && d.r === r && d.smoothing === sm; }, `${view} ${res} ${sm}`);
        await settled();
        const d = await page.evaluate(() => window.__simDrawn(null));
        const want = evaluatePlot(vecStore, { dataset: d.dataset, expr: d.expr, unit: d.unit, location: 'refined', resolution: res, smoothing: sm });
        const m = vecStore.mesh(want.mesh);
        assert.equal(d.n, want.values.length);
        assert.equal(Number(await gfx.getAttribute('data-ntris')), m.nTris * r * r, `${view} drawn sub-triangles at r = ${r}`);
        const scale = Math.max(Math.abs(want.min), Math.abs(want.max)) || 1;
        let worst = 0;
        for (let i = 0; i < d.n; i++) worst = Math.max(worst, Math.abs(d.values[i] - want.values[i]));
        assert.ok(worst <= 1e-12 * scale, `${view} ${res}/${sm}: browser drawn values vs Node max diff ${worst}`);
        const { np, sub, nSub } = refinePattern(r);
        // interior lattice points (r >= 3): drawn value = exact point evaluation
        if (r >= 3 && sm === 'none') {
          const pts = refinedPoints(m, r);
          const idx = [];
          for (let t = 0; t < m.nTris; t += Math.max(1, Math.floor(m.nTris / 50))) idx.push(t * np + latticeIndex(r, 1, 1));
          const ex = evaluateAtPoints(vecStore, { dataset: d.dataset, expr: d.expr, unit: d.unit, x: idx.map((i) => pts.x[i]), y: idx.map((i) => pts.y[i]) }).values;
          idx.forEach((i, k) => assert.ok(Math.abs(d.values[i] - ex[k]) <= 1e-9 * scale, `${view}: drawn ${d.values[i]} vs exact ${ex[k]} at lattice point ${i}`));
        }
        // faceting proxies: largest value step inside one sub-triangle (fraction of the color range) and the largest
        // jump between coincident points of elements of the same material (0 when smoothed inside material domains)
        let step = 0;
        for (let t = 0; t < m.nTris; t++) for (let q = 0; q < nSub; q++) {
          const a = d.values[t * np + sub[3 * q]], b = d.values[t * np + sub[3 * q + 1]], c = d.values[t * np + sub[3 * q + 2]];
          step = Math.max(step, (Math.max(a, b, c) - Math.min(a, b, c)) / (d.max - d.min));
        }
        const pts = refinedPoints(m, r), seen = new Map();
        let jump = 0;
        for (let i = 0; i < d.n; i++) {
          const key = `${pts.x[i]},${pts.y[i]},${m.regionMaterials[m.triRegion[Math.floor(i / np)]]}`;
          if (seen.has(key)) jump = Math.max(jump, Math.abs(d.values[i] - seen.get(key)) / (d.max - d.min)); else seen.set(key, d.values[i]);
        }
        if (sm !== 'none') assert.ok(jump <= 1e-12, `${view} ${res}/${sm}: drawn field continuous across element edges (jump ${jump})`);
        facets[`${view} r${r} ${sm}`] = { step: Number(step.toPrecision(3)), jump: Number(jump.toPrecision(3)) };
      }
      // the largest color step of one sub-triangle at Normal is at most half of the unrefined (per-element) one
      assert.ok(facets[`${view} r3 material`].step <= 0.5 * facets[`${view} r1 none`].step, `${view}: faceting proxy ${JSON.stringify(facets)}`);
    }
    assert.ok(facets['Mode, optical r3 material'].step < 0.05, `optical mode faceting proxy ${facets['Mode, optical r3 material'].step}`);
    // F1 (audit 2026-10-15): a Max/Min Marker is the unsmoothed lattice extremum, labelled with the exact point value at
    // its location (= the probe there), whatever the smoothing of the surface.
    const optView = await showView('Mode, optical');
    await page.locator(`[data-node^="pf:${optView}:"]`).first().click();
    await page.getByLabel('Smoothing', { exact: true }).selectOption('material');
    await node(`pg:${optView}`); await settingsTab();
    await page.getByRole('button', { name: '+ Max/Min Marker', exact: true }).click();
    await page.getByText('Smoothing: None (exact extrema)').waitFor();
    await settled();
    await until(async () => (await page.evaluate(() => window.__simMarkers())).length === 2, 'max and min markers');
    const marks = await page.evaluate(() => window.__simMarkers());
    const dOpt = await page.evaluate(() => window.__simDrawn([]));
    const raw = evaluatePlot(vecStore, { dataset: dOpt.dataset, expr: dOpt.expr, unit: dOpt.unit, location: 'refined', resolution: 'normal', smoothing: 'none' });
    const mOpt = vecStore.mesh(raw.mesh), ptsOpt = refinedPoints(mOpt, 3);
    let iMax = 0;
    for (let i = 1; i < raw.values.length; i++) if (raw.values[i] > raw.values[iMax]) iMax = i;
    const mk = marks.find((q) => q.kind === 'max');
    assert.ok(Math.abs(mk.x - ptsOpt.x[iMax]) <= 1e-12 && Math.abs(mk.y - ptsOpt.y[iMax]) <= 1e-12, `max marker at (${mk.x}, ${mk.y}) vs Node lattice argmax (${ptsOpt.x[iMax]}, ${ptsOpt.y[iMax]})`);
    const exactAt = evaluateAtPoints(vecStore, { dataset: dOpt.dataset, expr: dOpt.expr, unit: dOpt.unit, points: [[mk.x, mk.y]] }).values[0];
    assert.ok(Math.abs(mk.value - exactAt) <= 1e-12 * Math.abs(exactAt), `max marker ${mk.value} vs exact ${exactAt}`);
    const probeAt = await page.evaluate(([x, y]) => window.__simProbe(x, y), [mk.x, mk.y]);
    assert.ok(Math.abs(probeAt.value - mk.value) <= 1e-12 * Math.abs(mk.value), `max marker ${mk.value} vs probe ${probeAt.value}`);
    const smoothedMax = evaluatePlot(vecStore, { dataset: dOpt.dataset, expr: dOpt.expr, unit: dOpt.unit, location: 'refined', resolution: 'normal', smoothing: 'material' }).max;
    console.log(`INFO Max/Min marker ${mk.value} = exact = probe; lattice max (None) ${raw.values[iMax]}, smoothed surface max ${smoothedMax}`);
    console.log(`INFO refined display faceting proxies (max step per sub-triangle / range, max same-material jump / range): ${JSON.stringify(facets)}`);
    console.log('PASS refined field plots: Resolution and Smoothing switch, browser drawn values = Node engine, interior points = exact evaluation, continuous within material domains, Max/Min marker = exact value = probe at its point (DevLog-034, audit F1)');
  }

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
  await loadSim('id=mao2022-a&renderer=canvas&debug=1');
  await runButton.click(); await complete();
  await until(async () => (await gfx.getAttribute('data-renderer')) === 'canvas2d' && Number(await gfx.getAttribute('data-ntris')) > 60000, 'canvas fallback over budget');
  await page.getByRole('button', { name: 'Window', exact: true }).click();
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
  await page.locator('.settings .title').filter({ hasText: 'Parametric Sweep (dataset)' }).waitFor();
  await until(async () => await page.locator('[data-sweep-progress]').count() === 0 && !(await page.locator('[data-node="study.sweep"] .tag').count()), 'sweep finished', 60000);
  const rows = page.locator('.settings .scroll tbody tr');
  assert.equal(await rows.count(), 3);
  const header = await page.locator('.settings .scroll thead th').allInnerTexts();
  const z0Col = header.findIndex(h => h.startsWith('Z0'));
  for (let i = 0; i < 3; i++) {
    const shown = Number(await rows.nth(i).locator('td').nth(z0Col).innerText());
    assert.ok(Math.abs(shown - sweepNode[i]) <= Math.abs(sweepNode[i]) * 1e-3, `sweep point ${i} z0 ${shown} vs ${sweepNode[i]}`);
  }
  await screenshot('sim-sweep');
  // Global Evaluation over the sweep points into a table, and the default 1D Sweep plot group.
  await node('results.derived'); await settingsTab();
  await page.getByRole('button', { name: '+ Global Evaluation', exact: true }).click();
  const gExpr = page.getByLabel('Derived expression');
  await gExpr.fill('Z0'); await gExpr.press('Enter');
  await page.getByLabel('Derived unit').fill('ohm'); await page.getByLabel('Derived unit').press('Enter');
  await page.getByRole('button', { name: 'Evaluate over sweep', exact: true }).click();
  // X1: wide table, one numeric column per swept parameter and one per evaluated quantity.
  const bt = page.locator('[data-bottom-table]');
  await until(async () => (await bt.locator('tbody tr').count()) === 3, 'three sweep rows');
  const bHead = await bt.locator('thead th').allInnerTexts();
  const pCol = bHead.findIndex(h => h.startsWith('materials.eo_medium.eps_r')), vCol = bHead.findIndex(h => h.startsWith('Z0 ('));
  assert.ok(pCol >= 0 && vCol >= 0, `parameter and value columns: ${bHead.join(' | ')}`);
  for (let i = 0; i < 3; i++) {
    const cells = bt.locator('tbody tr').nth(i).locator('td');
    assert.equal(Number(await cells.nth(pCol).getAttribute('data-value')), sweepValues[i], 'numeric parameter column');
    const v = Number(await cells.nth(vCol).getAttribute('data-value'));
    assert.ok(Math.abs(v - sweepNode[i]) <= Math.abs(sweepNode[i]) * 1e-3, `sweep Global Evaluation ${i}: ${v} vs ${sweepNode[i]}`);
  }
  // Table Graph of the table: x = the parameter column.
  await node(`tbl:${await bt.getAttribute('data-bottom-table')}`);
  await page.getByRole('button', { name: 'Table Graph', exact: true }).click();
  await until(async () => Number(await page.locator('.p1').getAttribute('data-series')) === 1, 'table graph series');
  await showView('Sweep');
  assert.equal(Number(await page.locator('.p1').getAttribute('data-series')), 1, 'Sweep 1D plot group');
  // X5: comma-separated Global expressions are accepted without an error.
  const swGroup = await page.locator('.gfx').getAttribute('data-view');
  await node(`pg:${swGroup}`);
  await page.locator('.settings button.link', { hasText: 'Global' }).first().click();
  const gl = page.getByLabel('Global expressions');
  await gl.fill('Z0, Z0/2'); await gl.press('Enter');
  await delay(500);
  assert.equal(await page.locator('[data-expr-check="error"]').count(), 0, 'no false error for a list of Global expressions');
  await until(async () => Number(await page.locator('.p1').getAttribute('data-series')) === 2, 'two Global series');
  // Parametric dataset: a 2D plot group shows the fields of sweep point 3 (recomputed on demand).
  const pot = await showView('Electric Potential');
  await node(`pg:${pot}`);
  await page.getByLabel('Parameter value').selectOption('2');
  await page.locator('[data-point-status="ready"]').waitFor({ timeout: 60000 });
  await settled();
  assert.ok(Number(await page.locator('.gfx').getAttribute('data-layers')) > 0, 'sweep point fields plotted');
  assert.match(await page.locator('.stage .title').getAttribute('data-title'), /eps_r = 40/);
  // F1: the probe and __simProbe evaluate the shown sweep point (browser = Node keep-run of that point).
  const store40 = createSolutionStore(runCrossSection(gsg.replace('    eps_r: 30\n', '    eps_r: 40\n'), { keep: true }));
  const pp = await page.evaluate(() => window.__simProbe(2, 0.3));
  const want40 = evaluateDerived(store40, { kind: 'point', dataset: 'es', expr: 'es.V', unit: 'V', selection: { point: [2, 0.3] } }).value;
  assert.equal(pp.sol, 'sweep:2', 'probe addresses the sweep point');
  assert.ok(Math.abs(pp.value - want40) <= Math.abs(want40) * 1e-9, `sweep-point probe ${pp.value} vs Node ${want40}`);
  // F2: Export > Data writes the shown point's values and names it.
  await node('res.export');
  const dlp = page.waitForEvent('download');
  await page.locator('.settings button.link').first().click();
  const dl3 = await dlp;
  assert.match(dl3.suggestedFilename(), /-p3-materials\.eo_medium\.eps_r=40\.csv$/);
  const csv3 = await readFile(await dl3.path(), 'utf8');
  assert.match(csv3.split('\n')[0], /sweep point 3 \(materials\.eo_medium\.eps_r = 40\)/);
  const nDrawn = evaluatePlot(store40, { dataset: 'es', expr: 'es.V', unit: 'V', location: 'refined' }).values.length;
  assert.equal(csv3.trim().split('\n').length - 2, nDrawn, 'one row per drawn lattice point of the sweep point solution');
  await dl3.delete();
  console.log('PASS sweep-point probe equals Node (F1) and Export > Data of the sweep point (F2)');
  // G1: a cut line drawn on the sweep-point view samples that point; Line Integration there equals Node; tables carry the solution.
  await showView('Electric Potential');
  await page.getByRole('button', { name: 'Cut line', exact: true }).click();
  const vw3 = await page.evaluate(() => window.__simView());
  const sb3 = await stage.boundingBox();
  const sx = x => sb3.x + vw3.W / 2 + (x - vw3.cx) * vw3.scale, sy = y => sb3.y + vw3.H / 2 - (y - vw3.cy) * vw3.scale;
  await page.mouse.move(sx(1.3), sy(0.2)); await page.mouse.down(); await page.mouse.move(sx(2.7), sy(0.2), { steps: 5 }); await page.mouse.up();
  await page.locator('.settings .title').filter({ hasText: 'Cut Line 2D' }).waitFor();
  await page.locator('[data-solution-label^="Sweep point 3"]').first().waitFor();
  await page.getByRole('button', { name: '+ Line Integration', exact: true }).click();
  const liExpr = page.getByLabel('Derived expression');
  await liExpr.fill('-es.Ex'); await liExpr.press('Enter');
  await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
  await page.locator('[data-eval-msg]').filter({ hasText: 'Evaluated' }).waitFor();
  const cl3 = await page.evaluate(() => { const c = window.__simWorkbench.results.cutLines.at(-1); return { ax: c.ax, ay: c.ay, bx: c.bx, by: c.by, point: c.point }; });
  assert.equal(cl3.point, 2, 'cut line inherits the sweep point of the view');
  const wantLi = evaluateDerived(store40, { kind: 'line_int', dataset: 'es', expr: '-es.Ex', selection: { polyline: [[cl3.ax, cl3.ay], [cl3.bx, cl3.by]] } }).value;
  const liRow = page.locator('[data-bottom-table] tbody tr').last();
  assert.match(await liRow.locator('td').first().innerText(), /^Sweep point 3 \(/, 'Solution column names the sweep point');
  const gotLi = Number(await liRow.locator('td[data-value]').last().getAttribute('data-value'));
  assert.ok(Math.abs(gotLi - wantLi) <= Math.abs(wantLi) * 1e-9, `line integral on the sweep point ${gotLi} vs Node ${wantLi}`);
  console.log('PASS cut line on a sweep-point view: Line Integration equals Node at that point, table Solution column (G1)');
  // H1: two cut lines and two cut points on different solutions; + Line Integration / + Line Average / + Point Evaluation
  // target the one shown (and its solution). H2/H3: the Line Graph group names the same solution in settings, header and CSV.
  const cl3id = await page.evaluate(() => window.__simWorkbench.results.cutLines.at(-1).id);
  const store20 = createSolutionStore(runCrossSection(gsg.replace('    eps_r: 30\n', '    eps_r: 20\n'), { keep: true }));
  const onPoint = async (opt, label) => {
    await node(`pg:${pot}`);
    await page.getByLabel('Parameter value').selectOption(opt);
    await page.locator(`[data-solution-label^="${label}"][data-point-status="ready"]`).first().waitFor({ timeout: 60000 });
    await settled();
  };
  // Screen mapping taken right before the mouse action (the layout can shift when the tool or node changes).
  const mapper = async () => {
    const vw = await page.evaluate(() => window.__simView());
    const sb = await stage.boundingBox();
    return { X: x => sb.x + vw.W / 2 + (x - vw.cx) * vw.scale, Y: y => sb.y + vw.H / 2 - (y - vw.cy) * vw.scale };
  };
  const evalDerived = async (button, expr) => {
    await page.getByRole('button', { name: button, exact: true }).click();
    const de = page.getByLabel('Derived expression');
    await de.fill(expr); await de.press('Enter');
    await page.getByRole('button', { name: 'Evaluate', exact: true }).click();
    await page.locator('[data-eval-msg]').filter({ hasText: 'Evaluated' }).waitFor();
    const d = await page.evaluate(() => { const x = window.__simWorkbench.results.derived.at(-1); return { target: x.target }; });
    const row = page.locator('[data-bottom-table] tbody tr').last();
    return { target: d.target, sol: await row.locator('td').first().innerText(), value: Number(await row.locator('td[data-value]').last().getAttribute('data-value')) };
  };
  const relOk = (a, b, tol, what) => assert.ok(Math.abs(a - b) <= Math.abs(b) * tol, `${what}: ${a} vs ${b}`);
  await onPoint('0', 'Sweep point 1');
  await page.getByRole('button', { name: 'Cut line', exact: true }).click();
  let m = await mapper();
  await page.mouse.move(m.X(1.1), m.Y(0.5)); await page.mouse.down(); await page.mouse.move(m.X(2.9), m.Y(0.5), { steps: 5 }); await page.mouse.up();
  await page.locator('.settings [data-solution-label^="Sweep point 1"]').first().waitFor();
  const cl1 = await page.evaluate(() => { const c = window.__simWorkbench.results.cutLines.at(-1); return { id: c.id, ax: c.ax, ay: c.ay, bx: c.bx, by: c.by, point: c.point }; });
  assert.equal(cl1.point, 0, 'second cut line on sweep point 1');
  let r = await evalDerived('+ Line Integration', '-es.Ex');
  assert.equal(r.target, cl1.id, '+ Line Integration targets the shown cut line');
  assert.match(r.sol, /^Sweep point 1 \(/);
  relOk(r.value, evaluateDerived(store20, { kind: 'line_int', dataset: 'es', expr: '-es.Ex', selection: { polyline: [[cl1.ax, cl1.ay], [cl1.bx, cl1.by]] } }).value, 1e-9, 'line integral on sweep point 1');
  await node(`ds:${cl3id}`);
  await page.locator('.settings [data-solution-label^="Sweep point 3"]').first().waitFor();
  r = await evalDerived('+ Line Average', 'es.V');
  const cl3b = await page.evaluate(id => { const c = window.__simWorkbench.results.cutLines.find(x => x.id === id); return [[c.ax, c.ay], [c.bx, c.by]]; }, cl3id);
  assert.equal(r.target, cl3id, '+ Line Average targets the shown cut line');
  assert.match(r.sol, /^Sweep point 3 \(/);
  relOk(r.value, evaluateDerived(store40, { kind: 'line_avg', dataset: 'es', expr: 'es.V', selection: { polyline: cl3b } }).value, 1e-9, 'line average on sweep point 3');
  const cps = [];
  for (const [opt, label, store, y] of [['0', 'Sweep point 1', store20, 0.3], ['2', 'Sweep point 3', store40, 0.6]]) {
    await onPoint(opt, label);
    await page.getByRole('button', { name: 'Cut point', exact: true }).click();
    m = await mapper();
    await page.mouse.click(m.X(2.05), m.Y(y));
    await page.locator(`.settings [data-solution-label^="${label}"]`).first().waitFor();
    const cp = await page.evaluate(() => { const c = window.__simWorkbench.results.cutPoints.at(-1); return { id: c.id, x: c.x, y: c.y, point: c.point }; });
    assert.ok(Math.abs(cp.x - 2.05) < 0.05 && Math.abs(cp.y - y) < 0.05, `cut point placed at (${cp.x}, ${cp.y})`);
    cps.push(cp.id);
    r = await evalDerived('+ Point Evaluation', 'es.V');
    assert.equal(r.target, cp.id, '+ Point Evaluation targets the shown cut point');
    assert.ok(r.sol.startsWith(label), `point evaluation Solution column ${r.sol}`);
    relOk(r.value, evaluateDerived(store, { kind: 'point', dataset: 'es', expr: 'es.V', selection: { point: [cp.x, cp.y] } }).value, 1e-9, `point evaluation on ${label} at (${cp.x}, ${cp.y})`);
  }
  assert.notEqual(cps[0], cps[1]);
  console.log('PASS two cut lines and two cut points on different solutions: + Line Integration / Line Average / Point Evaluation target the shown one and equal Node (H1)');
  await node(`ds:${cl1.id}`);
  await page.getByRole('button', { name: 'Line Graph', exact: true }).click();
  await until(async () => Number(await page.locator('.p1').getAttribute('data-series')) === 1, 'line graph series');
  const solSettings = await page.locator('.settings [data-solution-label]').first().getAttribute('data-solution-label');
  const solHeader = await page.locator('.p1 [data-solution-label]').first().getAttribute('data-solution-label');
  assert.equal(solSettings, solHeader, 'Line Graph settings and header name the same solution');
  assert.match(solHeader, /^Sweep point 1 \(/);
  assert.equal(await page.locator('.settings').getByText('(RF', { exact: false }).count(), 0, 'no RF wording without RF features');
  const dlg = page.waitForEvent('download');
  await page.locator('.p1 button', { hasText: 'CSV' }).click();
  const dlG = await dlg;
  assert.match(dlG.suggestedFilename(), /-p1-materials\.eo_medium\.eps_r=20\.csv$/, `Line Graph CSV filename ${dlG.suggestedFilename()}`);
  const csvG = (await readFile(await dlG.path(), 'utf8')).split('\n');
  assert.equal(csvG[0], `# Solution: ${solHeader}`);
  const hG = csvG[1].split(',').map(c => c.replace(/^"|"$/g, ''));
  assert.equal(hG.length, 2);
  assert.match(hG[1], /\(V\) \[Cut Line/, `y column names its series and unit: ${hG[1]}`);
  await dlG.delete();
  console.log('PASS Line Graph names its solution in settings, header and CSV; CSV y column carries the series and unit (H2, H3)');
  await node(`pg:${pot}`);
  await page.getByLabel('Parameter value').selectOption('-1');
  console.log('PASS wide sweep table and Table Graph (X1), Global expression list (X5), Parametric dataset point fields on demand');
  // Sweep cancel: the pool is terminated, finished points stay, the rest are marked cancelled.
  await node('study.sweep');
  await page.getByLabel('Sweep values', { exact: true }).fill('10:2:40');
  await page.getByRole('button', { name: 'Run sweep', exact: true }).click();
  await until(async () => page.workers().length > 0, 'sweep workers started');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await until(async () => (await workersBesidesSolution()) === 0, 'sweep workers terminated');
  await node('study.sweep');
  assert.ok(await page.locator('[data-sweep-row="cancelled"]').count() > 0, 'cancelled points marked');
  console.log('PASS form edit YAML round trip, custom parametric sweep on a worker pool with Node agreement, sweep cancel');

  // G2: EO page and Mode Analysis of a selected sweep point (optical + EO sweep of n_e) equal Node at that point.
  await page.getByLabel('Optical mode', { exact: true }).check();
  await page.getByLabel('EO overlap', { exact: true }).check();
  await node('study.sweep'); await settingsTab();
  await page.getByLabel('Sweep parameter', { exact: true }).fill('materials.eo_medium.n_e');
  await page.getByLabel('Sweep values', { exact: true }).fill('2.1, 2.2');
  await page.getByRole('button', { name: 'Run sweep', exact: true }).click();
  await until(async () => await page.locator('[data-sweep-progress]').count() === 0 && !(await page.locator('[data-node="study.sweep"] .tag').count()), 'n_e sweep finished', 90000);
  const textNow = await page.evaluate(() => window.__simWorkbench.text);
  const nodeNe = runCrossSection(yamlSetIn(textNow, 'materials.eo_medium.n_e', 2.2), { stages: ['optical_mode', 'eo_overlap'], keep: true });
  await node('res.eo');
  await page.getByLabel('Parameter value', { exact: true }).selectOption('1');
  await page.locator('[data-solution-label^="Sweep point 2"]').first().waitFor();
  await until(async () => Number(await page.locator('[data-eo-vpil]').getAttribute('data-eo-vpil').catch(() => 'NaN')) > 0, 'EO values of the sweep point', 60000);
  const vpilPoint = Number(await page.locator('[data-eo-vpil]').getAttribute('data-eo-vpil'));
  assert.ok(Math.abs(vpilPoint - nodeNe.eo.vpiLVcm) <= nodeNe.eo.vpiLVcm * 1e-6, `EO VpiL on sweep point 2 ${vpilPoint} vs Node ${nodeNe.eo.vpiLVcm}`);
  // H6: the sweep-point EO page carries the Compute page content (warm-start tolerance 1e-6, DevLog-032 H5).
  const nA = nodeNe.eo.arms.A, numAttr = async sel => Number((await page.locator(sel).first().getAttribute('data-value')) ?? NaN);
  const eoSels = ['[data-arm-vpil="A"]', '[data-component-sum="A"]', '[data-gamma-ex="A"]', '[data-gamma-equiv="A"]', '[data-arm-vpil-tb="A"]', ...Object.keys(nA.byRegion).map(k => `[data-power-fraction="${k}"]`)];
  await until(async () => (await Promise.all(eoSels.map(q => numAttr(q).catch(() => NaN)))).every(Number.isFinite), 'sweep-point EO breakdown', 60000);
  relOk(await numAttr('[data-arm-vpil="A"]'), 1.55e-6 / (2 * Math.abs(nA.dnEffPerV)) * 100, 1e-6, 'arm A VpiL');
  relOk(await numAttr('[data-component-sum="A"]'), nA.breakdown.componentSum, 1e-6, 'component sum A');
  relOk(await numAttr('[data-gamma-ex="A"]'), nA.conventional.gammaEx, 1e-6, 'Gamma(E_x) A');
  relOk(await numAttr('[data-gamma-equiv="A"]'), nA.conventional.gammaEquiv, 1e-6, 'Gamma equiv A');
  relOk(await numAttr('[data-arm-vpil-tb="A"]'), nA.conventional.vpiLVcmTextbook, 1e-6, 'arm A textbook VpiL');
  for (const [reg, v] of Object.entries(nA.byRegion)) if (v.powerFraction != null) assert.ok(Math.abs(await numAttr(`[data-power-fraction="${reg}"]`) - v.powerFraction) <= 1e-6, `power fraction ${reg}`);
  relOk(Number(await page.locator('[data-eo-length]').getAttribute('data-eo-length')), nodeNe.eo.lengthMm, 1e-9, 'L of Vpi at L');
  assert.match(await page.locator('[data-eo-length]').innerText(), /Vπ at L = 10 mm/);
  assert.ok(await page.locator('details summary', { hasText: 'Formulas' }).count() > 0, 'formulas on the sweep-point EO page');
  // H4: the status bar shows the point's fields as ready, not a stale progress message.
  assert.match(await page.locator('[role=status]').getAttribute('data-status'), /^Sweep point 2 field solution (ready|reused)/);
  await node('res.modes');
  await page.getByLabel('Parameter value', { exact: true }).selectOption('1');
  const mrow = page.locator('[data-mode-table="opt"][data-mode-point="1"] [data-mode-row]').first();
  await mrow.waitFor({ timeout: 60000 });
  const neffShown = Number((await mrow.locator('td').nth(2).innerText()));
  const neffNode = createSolutionStore(nodeNe);
  const wantNeff = modeTable(neffNode, 'opt')[0].neff;
  assert.ok(Math.abs(neffShown - wantNeff) <= 1e-5, `mode table n_eff on sweep point 2 ${neffShown} vs Node ${wantNeff}`);
  assert.match(await page.locator('[data-mode-help]').innerText(), /plot groups showing this same solution/);
  console.log('PASS EO Coupling page and Mode Analysis of a selected sweep point equal Node at that point (G2, G3 text)');
  // Every dataset-consuming view states its solution.
  const viewsToScan = ['res.modes', 'res.eo', 'results.derived', 'results.rf', 'results.targets'];
  for (const id of viewsToScan) {
    await node(id);
    assert.ok(await page.locator('.settings [data-solution-label]').count() > 0, `solution label on ${id}`);
  }
  const pgIds = await page.locator('[data-node^="pg:"]').evaluateAll(els => els.map(e => e.getAttribute('data-node')));
  for (const id of pgIds) {
    await node(id);
    await until(async () => (await page.locator('.gfx [data-solution-label], .p1 [data-solution-label]').count()) > 0, `solution label on ${id}`, 10000);
  }
  console.log(`PASS solution label on every dataset-consuming view (${viewsToScan.length} pages, ${pgIds.length} plot groups)`);

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
