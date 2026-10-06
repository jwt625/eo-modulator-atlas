# W7 verification (fresh context, read-only)

You independently verify Phase B proposals (`W7_g<N>.csv`) against the primary sources before the coordinator
applies them. Read `W7_INSTRUCTIONS.md` (task definitions) and the header conventions (m), (o), (q)-(gg) of
`data/schema/devices.schema.yaml`. Sources: `references/<paper_id>/text.md` (`<!-- page N -->` = locator page)
and `figures/page_NN.png`; if text.md is missing, extract `source.pdf` with `uv run --with pymupdf python ...` into
your scratch directory (never under `references/`). No network. No emoji. Read-only except your output file.

## What to check

For every line where `proposed` differs from `current`, and for every numeric proposal (temperature_k,
r_eff_pm_per_v, sidewall_angle_deg, bias_for_vpi_v, tuning_nm_per_v, optical_power_handling_dbm,
extinction_ratio_db), and every physical_device_id / statistic proposal:

1. Does the quote exist at the locator (verbatim or near-verbatim)?
2. Does the quote support the proposed value under the stated convention (not just plausibly)?
3. For numbers: value, unit conversion, sign, basis label (convention h/bb).
4. For physical_device_id: does the paper identify the rows as the same physical device?

For lines where proposed equals current (confirmations), spot-check at least 20% chosen across papers.
Also check coverage: every worklist task of the group's papers (`W7_worklist.csv`) has an output line.

## Output

CSV at the path given in your prompt: `device_id,field,proposed,verdict,correct_value,evidence,note`
with verdict one of `confirm`, `reject`, `correct` (give `correct_value` and the source phrase in `evidence`),
`unverifiable` (no source). Then a short summary in your final message: counts per verdict and field, coverage
gaps, and systematic errors (e.g. a convention misread across many rows).
