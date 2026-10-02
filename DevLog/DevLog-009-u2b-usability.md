---
title: EO atlas - U2b representative, filter, navigation and usability audit
date: 2026-10-02
status: ready_for_review
owner: claude-wave-2026-10-02
tasks: [U2b]
---

# DevLog-009: U2b representative / filter / navigation / usability

Claim: [claude-wave-2026-10-02](../coordination/claims/claude-wave-2026-10-02.md). Plan:
[DevLog-002](DevLog-002-work-plan-and-ownership.md) section U2; predecessor handoff:
[DevLog-005](DevLog-005-comparison-correctness.md). Baseline `97ca0d1`; app tests 15 at start.
Scope: Table/Explore app only. `types.ts`, `scripts/build_views.py`, `atlas.json`, `data/`,
`engine/`, `sims/`, the sim route/worker/ScoreCard and the global layout were read, not edited.
Status is `ready_for_review`, not independently accepted. No commits or pushes.

Method: real data (`atlas.json`, 15 papers / 28 devices) through the app logic, synthetic devices
for cases the data does not contain, and a production-build browser session (Chrome, 1440 px and
390 px). Findings were reproduced before fixing; the "before" measurements below are from the
pre-fix build.

## Audit findings

Severity: H = wrong or unusable result for a normal action; M = misleading or lossy; L = polish or
latent. Class: APP = defect in files owned here; D2 = data/Python contract; DEP = deliberate
departure (documented, unchanged); LAYOUT = needs the global layout owner.

| # | Finding (reproduced) | Sev | Class | Disposition |
|---|---|---|---|---|
| 1 | Mobile 390 px: filter column fixed at 220 px, table scroller 170 px wide, filter panel 771 px tall, drawer 102 px wide (60% of 170). Table and drawer unusable on a phone | H | APP | Fixed |
| 2 | URL hash changed outside the app (pasted share link in the same tab, edited address bar, history entry) was reverted to the previous state and the filters were not applied; the layout write-back overwrote the user's URL | H | APP | Fixed (listener in `FilterPanel`) |
| 3 | `#sort=<unknown key>` (stale or edited share link) rendered a table with 0 rows: `sortValue` fell through to `metricCell`, which called an undefined metric function | M | APP | Fixed |
| 4 | Detail drawer derived rows used the generated first-input qualifier: ogiso2024-a FOM shows `~29.8` in the drawer but `>29.8` in the table (BW lower bound and IL upper bound both make FOM a lower bound). The approximate marker understated a bound and contradicted the table | M | APP | Fixed (`derivedDisplay` shares `derivedMetric`) |
| 5 | Empty states: Table said "No rows match the filters." with no action; Explore with no matches drew 10 empty panels (`0/0` badges) | L | APP | Fixed (message plus Reset filters) |
| 6 | RF frequency context disclosed only when present. RF-sourced Vpi/Vpi*L and RF loss with no stated frequency showed no caveat. Current data: every RF-loss row has a frequency; `porto2026-a` has `vpi_rf_v` with no frequency and convention `unspecified` | L | APP | Fixed (tooltips state "frequency not stated"; RF Vpi marked as RF value) |
| 7 | Measured-only filter tooltip over-stated coverage ("loss"). Actual rule is the Python `is_sim`: headline basis of Vpi, Vpi*L, 3 dB BW, on-chip IL and fiber IL only; RF loss and rate bases are not checked; figure-extracted and author-estimated values pass (kharel2021-b and ogiso2016-a on-chip IL are `author_estimate`). The filter is device-level, not field-level | M | APP (text) + D2 (rule) | Tooltip corrected; rule is a D2 follow-up |
| 8 | Representative default ranks completeness, then FOM, then lowest Vpi*L, then id (same in Python and TS). Real failure: `kohli2025` representative is the ring (`resonance_tuning_derived`, Vpi*L 0.0015 V*cm = 3 V x 5 um) because the three devices tie at 2/7 and no FOM is defined. In representative-device charts Kohli then drops out of panel a (13 papers have a device with both BW and Vpi*L, 12 plotted) and a resonance-tuning Vpi*L tops a Vpi*L sort | M | D2 | Not changed: TS must equal Python (existing parity test); see D2 follow-ups |
| 9 | Representative ignores basis and qualifiers: a more complete simulated/design-target device outranks a measured one unless Measured only removes it (synthetic test; no such paper in the current 15); FOM, Vpi*L, BW used as exact values when they are bounds. The other selector modes (lowest Vpi*L, highest BW) have the same nominal treatment | L | DEP / D2 | Documented; not in the original rule (DevLog-000: completeness, then FOM) |
| 10 | Back/forward: filter, search and sort changes use `replaceState`, so they create no history entries and Back leaves the page. Hash entries created by outside navigation now apply (finding 2) | L | DEP | Kept; avoids a history entry per keystroke/click |
| 11 | Not in the URL: plot state (log/linear per chart, median/mean, org/fab toggle), expanded rows, column choice (localStorage), open drawer, All devices is in the URL (`all=1`). Dashboard has no `FilterPanel`, so hash edits there are not adopted | L | LAYOUT | Follow-up: layout applies only `filters` and `sort` from the hash |
| 12 | Voltage comparability: frontiers and material statistics use `vpi_convention` plus DC / RF-at-frequency context; unspecified or missing-frequency RF values are excluded from them (U2a). Table sort, representative modes and the CSV do not partition by convention (the CSV exports `vpi_convention`); the `resonance_tuning_derived` ring is its own context | - | verified | No change; BW reference (1 GHz / 10 GHz / unspecified) is not part of the context |
| 13 | Pareto treatment of bounds, per-axis log omission, derived-bound propagation, CSV context: re-checked on real data after U2a, no regression (tests below) | - | verified | No change |
| 14 | Original plot options vs implementation (details below): Vpi*L*alpha implemented as Vpi*IL; no BW/Vpi alternative; selector adds highest BW | M | DEP | Recorded; formula not changed |
| 15 | Wide table at 390 px scrolls horizontally with no frozen Paper column | L | APP | Not done (needs sticky-cell handling for dimmed rows; separate tranche) |

## Fixes

All in the claimed paths.

- `logic.ts`: `derivedDisplay(d, key)` (text, bound wording, note from `derivedMetric`);
  `stateFromHashChange(hash, filters, sort)` returns the state to adopt, or null when the hash
  already equals the current state (no write-back loop; a hash without sort keeps the sort).
- `columns.ts`: `sortValue` ignores keys not in `COLS` (returns null); RF-loss tooltip says
  "frequency not stated" when absent; RF-sourced Vpi / Vpi*L tooltip says "RF value at X GHz" or
  "RF value; frequency not stated".
- `Drawer.svelte`: derived rows from `derivedDisplay` (bound direction, "(nominal)" when inputs do
  not determine one bound); row tooltip includes the bound wording; at <=720 px the drawer is full
  width.
- `FilterPanel.svelte`: `hashchange` listener adopts external hash changes. It reads
  `event.newURL` because the router and the layout's write-back effect (a microtask) have already
  restored the old hash when a later listener reads `location.hash`. At <=720 px the panel is a
  collapsed bar with a Filters toggle (marked `*` when filters are active) and Reset; Measured only
  tooltip corrected.
- `routes/table/+page.svelte`, `routes/explore/+page.svelte`: single-column grid at <=720 px;
  empty-state message with Reset filters; table toolbar buttons no longer wrap.
- Transient effect: on an external hash change the layout may rewrite the old hash for one
  microtask before the new state is applied; the final URL equals the new state. Not visible in
  practice; it would disappear if the listener lived in the layout.

## Tests

| Command | Outcome |
|---|---|
| `cd app && npm test` | 2 files, **23 passed** (15 existing + 8 new in `comparisons.test.ts`) |
| `cd app && npm run check` | **0 errors, 0 warnings**, 360 files |
| `cd app && npm run build` then `SMOKE_SCREENSHOTS=../logs/u2b npm run smoke` | **PASS** at `/`; screenshots inspected (mobile table with filters collapsed and open, mobile drawer), then deleted |
| `cd app && BASE_PATH=/eo-atlas npm run build && BASE_PATH=/eo-atlas npm run smoke` | **PASS** at `/eo-atlas`; root build rebuilt afterwards (`build/index.html` references `/_app`) |
| `cd engine && npm test` | 67 passed, 0 failed (other agents' new engine tests included; not mine) |
| `uv run pytest -q` | 28 passed, 5 PyMuPDF/SWIG deprecation warnings |

New unit tests (`comparisons.test.ts`): drawer/table agree on `>29.8` for ogiso2024-a and on
Vpi*IL; chen2022-c FOM stays "(nominal)" and absent derived values are null; hash adoption (differs
from state, keeps sort, applies sort when given); idempotence for the app's own hash and for an empty
hash; unknown sort key cannot throw; completeness-before-basis representative and Measured only
restoring the measured device (documents finding 9); RF loss / RF Vpi frequency disclosure.
Fail-before check: with `columns.ts` restored to `HEAD`, the sort-key and both RF-context tests fail
(`TypeError: fn is not a function`, missing tooltip text). `derivedDisplay` and
`stateFromHashChange` did not exist before.

Smoke additions (`app/scripts/smoke.mjs`): reset from the table empty state; same-tab
`location.hash` change applied; stale sort key; shared-URL search; drawer shows `>29.8` and not
`~29.8`; Explore empty state and reset; at 390 px: no horizontal overflow on Table and Explore,
filters start collapsed and toggle open, table at least 380 px wide, drawer at least 380 px wide.
The existing empty-state assertion is unchanged (text is in a `span`).

Pre-fix measurements used as the reproduction: 390 px table scroller 170 px, side 220 px, drawer
102 px; hash `#m=barium_titanate` typed into a table tab left 4 rows and was rewritten to the old
hash; `#sort=bogus:asc` gave 0 rows.

## Deliberate departures (documented, unchanged)

Original decisions: [DevLog-000](DevLog-000-plan.md) (Decision 3, Representative device),
[DevLog-001](DevLog-001-survey-proposal-execution.md) (visualization shortlist).

| Original | Implemented | Note |
|---|---|---|
| FOM = f3dB / (Vpi_eff * 10^(IL_onchip/10)), Vpi_eff = Vpi * 10^(RF_loss_total/20) | Same formula in `build_views.py` and the column tooltip; defined for mzm, iq_mzm, phase_shifter, plasmonic_mzm with BW, Vpi and on-chip IL | Matches. 9 of 28 devices have a FOM |
| Shortlist: "Vpi*L*alpha FOM"; rep alternative "VpiL*alpha" | "Vpi*IL" = Vpi[V] x on-chip IL[dB] (V*dB), chart c, column, rep mode | Equal to Vpi*L*alpha only if on-chip IL = alpha x L (no coupler/taper/bend loss). Coverage: Vpi*IL defined for 11 of 28 devices; reported propagation loss `prop_loss_db_per_cm` exists for 4 (chen2022-c, kohli2025-iq, kohli2025-mzm, niels2026-a) with plasmonic values near 5000 dB/cm, so a Vpi*L*alpha chart would currently have 4 points of mixed meaning. Kept; the user should decide whether a separate Vpi*L*alpha FOM is wanted |
| Rep alternatives: VpiL*alpha, BW/Vpi, lowest VpiL | Lowest Vpi*L, highest BW, highest FOM, lowest Vpi*IL | BW/Vpi not offered; highest BW added |
| Default rep: completeness, then FOM | Adds lowest Vpi*L, then device id | Documented in the selector tooltip; the extra tie-break causes finding 8 |
| Rep for charts | Charts use the same per-paper representative as the table (or All devices) | A paper whose representative lacks a plotted metric is omitted from that chart and counted in the omitted badge |
| Table filters / navigation | Filter state in the URL hash with `replaceState` | No history entry per change; Back leaves the page |

## D2 follow-ups (not edited here)

1. Representative rule (`rep_order_key` in `build_views.py` and `repKey` in `logic.ts` must change
   together, plus the parity test in `logic.test.ts`): decide whether the Vpi*L tie-break may rank
   across device classes and Vpi conventions (ring `resonance_tuning_derived` vs MZM); options are
   restricting the tie-break to one convention or class, or dropping it per DevLog-000. Also decide
   whether basis (measured over simulated/design target) and qualifiers (bounds) should enter the
   rank. Today kohli2025 is represented by its ring.
2. `measured_only` / `SIM_BASES`: decide whether `author_estimate` (and `extracted_from_figure`)
   count as measured, and whether RF loss and rate bases should be included in `is_sim`. A
   field-level measured flag would let the filter keep a device whose only modelled value is
   unrelated to the plotted metric.
3. Generated `derived.*.qualifier` still takes the first input qualifier and `fom` carries none;
   TS recomputes direction (U2a). Emit a propagated direction in `build_views.py` so the Drawer,
   CSV consumers and any external reader agree without recomputation.
4. Missing `vpi_rf_freq_ghz` for `porto2026-a` (design target, convention `unspecified`); and
   `bw3db_reference` is not part of any comparison context: consider a context field.
5. Optional: add a true Vpi*L*alpha derived field if the user wants it (needs the wavelength and
   section the loss refers to).

## Remaining work

- Layout owner: apply more than `filters` and `sort` from the hash (log/linear toggles, median/mean,
  expanded rows) and move the `hashchange` listener from `FilterPanel` into the layout so it also
  covers the dashboard and has no transient rewrite.
- Frozen Paper column for the wide table at narrow widths (finding 15).
- Drawer stays open when its device drops out of the filtered view (not changed).
- Search tokens are substring AND; a token such as `&` matches nothing (not changed).
- Independent review of this tranche.

## Files released

Write paths claimed for U2b are released with this handoff: `app/src/lib/logic.ts`, `charts.ts`
(read, unchanged), `columns.ts`, `ScatterChart.svelte` (unchanged), `DeviceTip.svelte` (unchanged),
`FilterPanel.svelte`, `Drawer.svelte`, `app/src/routes/explore/+page.svelte`,
`app/src/routes/table/+page.svelte`, `app/src/lib/comparisons.test.ts`, `logic.test.ts`
(unchanged), `app/scripts/smoke.mjs`, and this file. Changed files: `smoke.mjs`, `Drawer.svelte`,
`FilterPanel.svelte`, `columns.ts`, `comparisons.test.ts`, `logic.ts`, `explore/+page.svelte`,
`table/+page.svelte`.
