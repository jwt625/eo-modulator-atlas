# EO Modulator Atlas

A traceable literature database and static browser explorer for electro-optic
modulators. The integrated atlas contains **15 papers, 28 device rows and 27 organizations**
after p1_01/03/09 (checked 2026-10-02); the candidate index contains 198 records and distillation
is continuing. Each reported metric has an evidence
locator and basis. Missing values stay empty.

## Run the app

Use Node 22.12+ (tested with Node 25.9) and pnpm 10.12.4:

```sh
cd engine
npx pnpm@10.12.4 install --frozen-lockfile
cd ../app
npx pnpm@10.12.4 install --frozen-lockfile
npm run dev
```

Open the local URL printed by Vite. Routes:

- `/table`: expandable paper/device table, filters, representative selection,
  evidence details and CSV export.
- `/explore`: metric comparisons, disclosure and organization views.
- `/sim?id=chen2022-c`: editable YAML, geometry preview and cancellable browser
  cross-section solver. The legacy `?config=sims/chen2022/config.yaml` URL also works.
- `/about`: metric conventions, evidence and current model limitations.

`npm run build` produces `app/build/`; `npm run preview` serves it locally.
`BASE_PATH=/eo-atlas npm run build` supports a subdirectory deployment. Dev/build
copy input YAML into ignored `app/static/sims/`; source PDFs are not copied to the
website. Install the engine dependencies before building the app.

## Database workflow

With Python 3.12+ and uv:

```sh
uv sync --extra dev --extra extract
uv run python scripts/validate_db.py
uv run pytest -q
uv run python scripts/build_views.py
```

Without uv, create a virtual environment and install the script dependencies:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install pydantic pyyaml requests pytest pymupdf
.venv/bin/python scripts/validate_db.py
.venv/bin/python -m pytest -q
.venv/bin/python scripts/build_views.py
```

The CSVs and `data/evidence/` are authoritative; `app/static/data/atlas.json` is
a generated view, not a second database. Refresh it after accepted data changes.
The [distillation skill](.claude/skills/eo-modulator-distill/SKILL.md),
[batch contract](data/_staging/BATCH_INSTRUCTIONS.md) and
[manual download list](data/manual_downloads.md) describe ingestion.
Reference PDFs are tracked in this repo; extracted text and figures are not; see
[references/README.md](references/README.md). Rights remain source-specific.

## Simulation status and checks

```sh
cd engine
npm test
cd ..
node engine/cli.mjs sims/chen2022/config.yaml
node engine/cli.mjs sims/chen2022/config.yaml --section unloaded
cd app
npm test
npm run check
npm run build
npm run smoke
```

The smoke suite requires an installed Google Chrome. It starts/stops its own
local preview server and temporary browser profile, tests the built site and
compares browser/Node calculations. For a subdirectory build, use the same
`BASE_PATH=/eo-atlas` for both `npm run build` and `npm run smoke`.
Optional `SMOKE_SCREENSHOTS=../logs/ui` keeps screenshots in ignored local scratch.

The engine runs **electrostatics and optional scalar optical modes**. Analytic
gates cover parallel plates, differential/half-domain capacitance, anisotropic
rotation, TE/TM slab modes and waveguide group index. CLI results go to stdout;
browser results stay in memory. Do not commit solver outputs.

EO overlap and uniform RF loss now have separate tested modules; their shared
runner integration remains pending. Periodic loaded-line and EO-response stages
remain unimplemented.
A cross-section's RF index and impedance are not the effective values of a
periodically loaded device. Such targets are reported as `not_evaluated`.
The Chen config remains `unvalidated`. Its optical window intersects gold, so
`--optical` stops by default with an explicit unsupported-material error. Session
YAML may explicitly select `optics.metal_in_window: absent` or `pec_scalar` to
explore scalar sensitivity limits. Outputs disclose the policy, scalar limits,
PEC face validity and window-edge diagnostic. Neither limit predicts real-metal
absorption or establishes literature reproduction.

Incomplete drafts such as Deng 2026 can display their geometry, missing inputs
and provenance while Run stays disabled. Previewing a draft does not supply
physical constants or validate the device. New configs and their audit findings
are tracked in [DevLog-004](DevLog/DevLog-004-data-lane-progress.md).

CLI exit codes: 0 = requested stages completed (not a literature pass), 1 = input
or solver error, 2 = an evaluated target missed its tolerance. Mesh scale changes
numerical resolution only. Results need mesh/domain convergence checks before
physical interpretation. See [sims/SPEC.md](sims/SPEC.md) and
[engine/README.md](engine/README.md).

The shared runner reports target coverage separately from pass/fail. Unspecified
line topology, frequency-specific targets, alternate-section targets and configured
fixed group index are excluded from prediction comparisons. Each mesh has an
80,000-vertex default budget; exceeding it produces an explicit error.

## Next work

1. Integrate explicit EO arm/voltage and RF loss/sweep contracts into the shared runner.
2. Implement periodic-cell/EO-response stages and quantify scalar/vector limitations.
3. Reconcile generated rankings with sample/loss-scope guards before merging reviewed batches.
4. Continue ingestion, literature convergence studies and independent audits.

Current work and remaining phases are recorded in [DevLog-000](DevLog/DevLog-000-plan.md)
and [DevLog-002](DevLog/DevLog-002-work-plan-and-ownership.md).
E1/U1 progress, final checks and handoff: [DevLog-003](DevLog/DevLog-003-cross-section-progress.md).
Standalone cache migration, staged SOH references and next task ownership:
[DevLog-006](DevLog/DevLog-006-standalone-continuation.md).
Latest audit corrections, sample guards and optical runner integration:
[DevLog-011](DevLog/DevLog-011-audit-corrections-and-integration.md).
Read [WORKBOARD.md](WORKBOARD.md) and the active claims under
`coordination/claims/` before starting concurrent work.
