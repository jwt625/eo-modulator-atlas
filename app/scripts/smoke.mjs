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

const appDir = fileURLToPath(new URL('../', import.meta.url));
const base = process.env.BASE_PATH ?? '';
const chen = await readFile(new URL('../../sims/chen2022/config.yaml', import.meta.url), 'utf8');
const analytic = await readFile(new URL('../../engine/tests/fixtures/parallel-plates.yaml', import.meta.url), 'utf8');
const gsg = await readFile(new URL('../../engine/tests/fixtures/gsg-eo-rf.yaml', import.meta.url), 'utf8');
const expectedStages = runCrossSection(gsg, { stages: ['optical_mode', 'eo_overlap', 'rf_line'] });
const expected = runCrossSection(chen);
const expectedOptical = runCrossSection(analytic, { optical: true });
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
  const runButton = page.getByRole('button', { name: 'Run cross-section', exact: true });
  const editor = page.getByLabel('Input YAML · edits apply to this session');
  const complete = () => page.getByText('Cross-section solve complete', { exact: true }).waitFor();
  const loadSim = async (query = 'id=chen2022-c') => {
    await page.goto(url(`sim?${query}`));
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
  await page.getByRole('img', { name: 'Configured cross-section geometry' }).waitFor();
  await page.getByRole('heading', { name: 'Missing or inferred inputs' }).waitFor();
  await page.getByText('Config validation status: unvalidated', { exact: true }).waitFor();
  assert.equal(await runButton.isEnabled(), false, 'incomplete physical inputs must not reach the worker');
  assert.equal(await page.locator('[data-metric]').count(), 0);
  assert.equal(page.workers().length, 0);
  await screenshot('sim-incomplete');
  console.log('PASS incomplete paper config previews geometry and disclosures with solve disabled');

  await loadSim();
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
  const published = await page.request.get(url('sims/chen2022/config.yaml'));
  assert.equal(await published.text(), chen, 'published config must equal the tracked input');
  await runButton.click(); await complete();
  for (const [metric, value] of Object.entries(expected.metrics)) {
    const actual = Number(await page.locator(`[data-metric="${metric}"]`).getAttribute('data-value'));
    assert.ok(Math.abs(actual - value) <= Math.abs(value) * 1e-8, `browser/Node disagreement: ${metric}`);
  }
  assert.match(await page.locator('.target-summary').innerText(), /0 of 11 targets evaluated/);
  await screenshot('sim-desktop');
  console.log('PASS real Chen worker run, browser/Node agreement, unsupported targets excluded');

  await editor.fill(`${chen}\n# Edited locally for smoke validation\n`);
  await page.getByText('Inputs changed. These results belong to the previous run.').waitFor();
  await page.getByLabel('Cross-section', { exact: true }).selectOption('unloaded');
  await runButton.click(); await complete();
  await page.getByText(/chen2022-c · unloaded/).waitFor();
  assert.equal(await page.locator('.notice').count(), 0);
  console.log('PASS stale-result detection and alternate cross-section');

  await loadSim();
  await runButton.click();
  await page.getByText('Meshing and solving electrostatics', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByText('Cancelled', { exact: true }).waitFor();
  await until(() => page.workers().length === 0, 'cancelled worker terminated');
  assert.equal(await page.locator('[data-metric]').count(), 0);
  assert.ok(await runButton.isEnabled());
  console.log('PASS cancellation clears the active worker and discards the run');

  await page.getByLabel('Optical mode', { exact: true }).check();
  await runButton.click();
  await page.getByRole('alert').filter({ hasText: 'metal optical modes are unsupported' }).waitFor();
  await until(() => page.workers().length === 0, 'failed worker terminated');
  assert.equal(await page.locator('[data-metric]').count(), 0);
  await editor.fill('schema: invalid');
  await page.getByRole('alert').filter({ hasText: 'expected eo-atlas.sim/v1' }).waitFor();
  assert.equal(await runButton.isEnabled(), false);
  console.log('PASS unsupported optical error and invalid-input guard');

  await editor.fill(analytic);
  await runButton.click(); await complete();
  const neff = Number(await page.locator('[data-metric="n_eff"]').getAttribute('data-value'));
  assert.ok(Math.abs(neff - expectedOptical.metrics.n_eff) < 1e-8);
  assert.match(await page.locator('.target-summary').innerText(), /1 of 2 targets evaluated · 1 passed · 0 failed/);
  const miss = parseConfig(analytic).raw;
  miss.targets[0].value = 20;
  await editor.fill(JSON.stringify(miss));
  await runButton.click(); await complete();
  assert.match(await page.locator('.target-summary').innerText(), /1 of 2 targets evaluated · 0 passed · 1 failed/);
  console.log('PASS retry, optical browser/Node agreement and failed-target display');

  for (const policy of ['absent', 'pec_scalar']) {
    const input = parseConfig(analytic).raw;
    input.geometry.optical_window.x_um = [-1, 1]; // synthetic fixture: optical window includes plates
    input.optics.metal_in_window = policy;
    const yaml = JSON.stringify(input);
    const nodeResult = runCrossSection(yaml, { optical: true });
    await editor.fill(yaml);
    await runButton.click(); await complete();
    await page.locator(`[data-optical-policy="${policy}"]`).waitFor();
    await page.getByText(/Window-edge diagnostic:/).waitFor();
    const actual = Number(await page.locator('[data-metric="n_eff"]').getAttribute('data-value'));
    assert.ok(Math.abs(actual - nodeResult.metrics.n_eff) < 1e-8);
    if (policy === 'pec_scalar') await page.getByText(/Scalar PEC is exact on horizontal faces only: 0%/).waitFor();
    await screenshot(`sim-optical-${policy}`);
  }
  console.log('PASS explicit optical policies, limitations and browser/Node diagnostics');

  // Synthetic analytic EO/RF fixture: all implemented stages in the worker, compared with Node.
  await editor.fill(gsg);
  await page.getByLabel('EO overlap', { exact: true }).check();
  await page.getByLabel('RF line', { exact: true }).check();
  await runButton.click(); await complete();
  await page.locator('[data-stages="electrostatics optical_mode eo_overlap rf_line"]').waitFor();
  for (const metric of ['vpi_l_dc_vcm', 'vpi_dc_v', 'n_eff', 'z0_ohm']) {
    const actual = Number(await page.locator(`[data-metric="${metric}"]`).getAttribute('data-value'));
    assert.ok(Math.abs(actual - expectedStages.metrics[metric]) <= Math.abs(expectedStages.metrics[metric]) * 1e-9, `browser/Node disagreement: ${metric}`);
  }
  for (const arm of ['A', 'B']) {
    const dn = Number(await page.locator(`[data-arm-dn="${arm}"]`).getAttribute('data-value'));
    assert.ok(Math.abs(dn - expectedStages.eo.arms[arm].dnEffPerV) <= Math.abs(dn) * 1e-9, `arm ${arm} dn`);
  }
  const alpha = Number(await page.locator('[data-rf-alpha="50"]').getAttribute('data-value'));
  assert.ok(Math.abs(alpha - expectedStages.rf.atTargets[0].alphaDbPerCm) <= alpha * 1e-12);
  await page.locator('[data-eo-convention="mzm_push_pull"]').waitFor();
  await page.locator('[aria-label="RF sweep"] .js-plotly-plot').waitFor();
  assert.match(await page.locator('.target-summary').innerText(), /4 of 6 targets evaluated · 4 passed · 0 failed/);
  await screenshot('sim-eo-rf');
  // Q2 M5: an opposite-sign pair far from -1 stays comparable and shows the balance warning.
  const unbalanced = gsg.replace('{name: ground_l, role: ground, material: metal, weight: 0,', '{name: ground_l, role: ground, material: metal, weight: 0.5,');
  assert.notEqual(unbalanced, gsg);
  await editor.fill(unbalanced);
  await runButton.click(); await complete();
  await page.locator('[data-balance-warning]').waitFor();
  await page.locator('[data-eo-convention="mzm_push_pull"]').waitFor();
  // Breaking an RF input blocks the selected stage before any worker starts.
  await editor.fill(gsg.replace('  dielectric_loss_model: tan_delta_regions\n', ''));
  await page.locator('[data-stage-blocked="rf_line"]').filter({ hasText: 'dielectric_loss_model' }).waitFor();
  assert.equal(await runButton.isEnabled(), false);
  await page.getByLabel('RF line', { exact: true }).uncheck();
  assert.equal(await runButton.isEnabled(), true);
  console.log('PASS EO overlap and RF line stages in the browser, Node agreement, convention gating, balance warning and blocked-stage guard');

  await page.goto(url('sim?id=unknown-config'));
  await page.getByText('The requested config is not in this atlas.').waitFor();
  assert.equal(await runButton.isEnabled(), false);
  assert.equal(await editor.inputValue(), '');
  await loadSim('config=sims/chen2022/config.yaml');
  await runButton.click();
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await page.getByRole('heading', { name: 'About the atlas' }).waitFor();
  await until(() => page.workers().length === 0, 'navigation terminated the worker');
  console.log('PASS unknown config, legacy config URL and navigation cleanup');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(url('sim?id=deng2026-a'));
  await page.getByRole('alert').filter({ hasText: 'Preview only. Solve blocked:' }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'incomplete draft overflows narrow viewport');
  assert.ok(await page.locator('.sim-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'incomplete draft content overflows narrow viewport');
  await loadSim();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'app shell overflows narrow viewport');
  assert.ok(await page.locator('.sim-page').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'sim content overflows narrow viewport');
  await editor.fill(analytic); await runButton.click(); await complete();
  await page.locator('.sim-page').evaluate(el => el.scrollTop = 0);
  await screenshot('sim-mobile');
  console.log('PASS narrow-viewport controls and worker run');
  assert.deepEqual(errors, [], 'browser/network errors');
  console.log(`PASS smoke suite at base path ${base || '/'}`);
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
