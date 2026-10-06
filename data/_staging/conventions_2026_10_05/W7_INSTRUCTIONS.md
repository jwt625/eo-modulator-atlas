# W7: Phase B source re-read for the 2026-10-05 conventions

You fill new or re-defined fields for existing device rows by re-reading each paper. Read-only on the repo
except your one output file. No network. No emoji. Never guess: if the source does not state it, leave the
proposal empty (or the field's "not stated" value where one exists) and say so in the note.

## Inputs

- `data/_staging/conventions_2026_10_05/W7_worklist.csv`: per device row, the task codes (only your group's papers).
- `data/devices.csv`, `data/papers.csv`, `data/evidence/<paper_id>.yaml` (current values, locators).
- Binding definitions: header conventions (a)-(gg) and enums in `data/schema/devices.schema.yaml`.
  Read conventions (m), (o), (q)-(gg) carefully; they are new.
- Sources: `references/<paper_id>/text.md` (`<!-- page N -->` markers = locator page), `figures/page_NN.png`
  (open the image when a figure decides the value). If text.md is missing, extract `references/<id>/source.pdf`
  with `uv run --with pymupdf python ...` into your scratch directory (given in your prompt); never write
  under `references/`. If no source exists locally, mark every task for that paper `NO_SOURCE`.

## Tasks (codes in the worklist)

| Code | Field | What to decide |
|---|---|---|
| EO_EFFECT | eo_effect | primary mechanism: pockels, plasma_dispersion, qcse, franz_keldysh, pauli_blocking, stress_optic, orientational, other. InP MQW: qcse unless the paper says otherwise (e.g. carrier/plasma or Pockels-dominated); FN-LC: pockels vs orientational from the paper's own description of the fast response used for the metrics |
| BW_METHOD | bw_method | how bw3db/bw6db/eo_rolloff of the row were obtained: eo_s21 (VNA/LCA small-signal EO response with a photodetector), sideband (optical spectrum sideband ratio), link_eoe (electrical-optical-electrical link response where the modulator is not de-embedded), photon_lifetime_estimate, optical_linewidth, indirect (other inference), unspecified (not stated) |
| BW_REF | bw3db_reference (+ bw3db_reference_freq_ghz) | dc, 1ghz, 10ghz, other + frequency, low_freq_unstated (normalized to the low-frequency plateau / "normalized" / "zeroed" with no stated frequency; read the figure axis/caption), unspecified (truly nothing). The reference applies to bw3db, bw6db and eo_rolloff of the row |
| IL_SCOPE | il_onchip_scope | device_total (whole modulator incl. splitters/combiners, excl. couplers), phase_section_only (phase shifter / active section only), excess_over_reference (relative to a reference waveguide), free_space, undefined (paper does not define). Use il_onchip_includes/excludes plus the source |
| DRIVE_CHECK | drive | non-MZM device (EAM, ring, resonator, free-space) currently with a drive value: not_applicable unless the paper states a differential electrical drive, then keep differential |
| DRIVE_OTHER | drive | row whose class is not MZM/EAM/ring: MZM-like arm topology -> convention (f) value from the paper (unspecified if not stated); stand-alone phase shifter or no arms -> not_applicable |
| INTEGRATION | integration | apply convention (ee) definitions to integration other/empty: polymer_backfill, monolithic (+ tag suggestion), bonded_heterogeneous, transferred_2d, foundry_native, wafer_bonded_iii_v, micro_transfer_printed, epitaxial_on_silicon; other only if none fits (say why) |
| ELECTRODE | electrode_type | tw_gssg = unloaded traveling-wave line with two signal conductors (GSSG, differential GSGSG); loaded lines keep cl_twe/slow_wave |
| ROW_KIND | row_kind | device (fabricated, measured) or design |
| SIDEWALL | sidewall_angle_deg | convention (u): angle to the film plane, 90 = vertical; convert from-normal statements (give formula) |
| BIAS_SIGN | bias_for_vpi_v | convention (v): reverse bias negative; quote the paper's sign wording |
| TUNING_SIGN | tuning_nm_per_v | convention (v): sign as in the source (shift per positive volt); if the paper shows a red shift for positive voltage keep positive, blue shift negative; unstated direction -> keep value, note "sign not stated" |
| POWER_HANDLING | optical_power_handling_dbm (+qualifier) | convention (w) |
| ER_DYNAMIC | extinction_ratio_db, er_type | convention (x): if a static ER is also stated, propose the static value (er_type static) and keep the dynamic one for notes |
| ARRAY_ER | extinction_ratio_db | convention (z): an array-level ER copied to channel rows -> keep only where the paper attributes it; propose statistic accordingly |
| ORPHAN_DERIVED:<field> | (evidence `derived` entry with no CSV value) | propose either filling the CSV cell (if the paper itself states the value: give locator) or `move_to_context` (coordinator moves it) |
| GENERAL | statistic, temperature_k, r_eff_pm_per_v, physical_device_id | for every row: statistic only when the paper states the headline numbers are best/mean/median/single (N and spread in the note); temperature_k only when the paper states the measurement temperature (C -> K: give formula); r_eff_pm_per_v only an in-device effective Pockels coefficient the authors extract from their own measurement (component in the note; not assumed/literature values); physical_device_id only when several rows are operating points (wavelength, temperature, bias) of one physical device the paper identifies as the same: use `<paper_id>-<slug>` shared by those rows |

## Output

One CSV, path given in your prompt, columns:

`device_id,field,current,proposed,basis,locator,quote,note`

- One line per field you decide (also when `proposed` equals `current`, so the coordinator knows it was checked;
  for GENERAL write lines only for fields you fill).
- `basis` (evidence enum) for numeric fields; for enum fields write `n/a`.
- `locator` per convention (i), e.g. `p.4, Fig. 3(b)`; `quote` = the deciding source phrase, <= 25 words, verbatim;
  for a figure-based decision describe what the figure shows.
- `note` <= 25 words. `NO_SOURCE` in `proposed` when the source is not available locally.

Work paper by paper, reading each paper once. At the end, check that every worklist task of your group has at
least one output line, and report counts per field and the lines you were unsure about.
