# p2_02: ummethala2021 distillation (D1.13)

Owner: claude-wave-2026-10-02 (batch owner subagent). Updated 2026-10-02.
**Q1 passed after corrections (independent audit and verification pass, 2026-10-02); not merged.**
D2 canonical integration remains with the data lane; the author does not self-approve.

## Status per paper

| Paper | Status | Rows | Notes |
|---|---|---|---|
| ummethala2021 | distilled | 1 paper, 1 device row, 24 evidence entries + 3 derived-list items | repro_grade C; no sim config (SOH, not a dielectric TWE; paper also lacks electrode-gap geometry) |
| han2023 | needs_download | 0 | No open-access or local source retrievable by prefetch; manual download pending (`needs_download.md`, untouched). Out of scope for this owner. |

## Source version and rights

- Cached source: arXiv PDF `2011.09931` taken as v1 (15 pages: pp.1-6 main text, pp.7-8 reference list,
  pp.9-15 Supplementary Information, bound into one PDF). The PDF carries no arXiv stamp, so the version is
  not confirmed from the file; `arxiv_id` is entered as `2011.09931v1` as in p2_01. Optica VOR
  differences are not verifiable offline.
- Metrics come from this preprint only. Crossref (journal, Optica 8(4) 511, issued
  2021-04-09, print 2021-04-20) lists **14 authors including Artem Kuzmin, who is not on the
  preprint**. `authors` uses the 13 names printed on the cached PDF; the Crossref extra
  author is in the paper notes. Title is the PDF's capitalization; wording matches Crossref.
- `published_on` empty (judgment call, see below). `license` empty and
  `redistribution = restricted_local_only`: Crossref's Optica license is for the VOR, not for
  the cached preprint, handled as in p2_01.
- Pages read: all 15 PDF pages from `text.md`; page renders of pp.4, 6, 9, 12, 13, 15
  viewed (Figs. 2, 3, S1, S5, S6, S8). Equation text is garbled in extraction; the
  Eq. (S13) crop (1550 nm, slot width) and Eq. (S21) text (zero-frequency normalization) were
  checked on the page images and are used for the wavelength and bandwidth-reference cells only.

## ummethala2021 per-row ledger (device `ummethala2021-a`)

| Metric | Value | Basis | Locator | Conventions / scope |
|---|---|---|---|---|
| Length | 1 mm | design_target | p.4 Fig. 2 caption; p.3 | Phase shifter per arm |
| Vpi (DC column) | 1.3 V | measured | p.3 Sec. 3; p.4 Fig. 2(c) | MZM, min-to-max transmission on a low-frequency triangular drive; push-pull poling; wavelength not stated; no bias stated |
| Vpi*L | 0.13 V cm | derived | p.1 abstract; p.3 | Authors give 1.3 V mm; unit conversion only |
| 3 dB EO bandwidth | 76 GHz (approx) | measured | p.1; p.4 Fig. 2(d); p.13 | Authors define it as phase-modulation index down by 1/sqrt2, i.e. 3 dB of detected RF power (detected-electrical 3 dB); `bw3db_reference = dc` (normalized to zero frequency, Eq. S21, p.14; basis derived); also stated in the row note; 50 ohm terminated; PD, probes, cables de-embedded; true crossing read on a noisy plateau near -3 dB, not a limit |
| 6 dB EO bandwidth | 110 GHz (approx) | measured | p.4 | Authors state about 110 GHz, equal to the VNA upper limit; trace reaches about -6 dB at the sweep end within noise; stored in `bw6db_ghz` and `bw_measured_to_ghz = 110` |
| Measurement range | 0.01 to 110 GHz | measured | p.3; p.13 | VNA PNA-X, 1 mm connector calibration |
| Fiber-to-fiber loss | 19 dB (approx) | derived | p.9 Sec. S1 | Authors' sum: 2 x about 5 dB grating coupler + 6 dB phase shifter + 3 dB other passive; no on-chip-only number stated, so `il_onchip_db` stays empty |
| Phase-shifter optical loss | 60 dB/cm (approx) | measured | p.5; p.9 | Authors give 6 dB/mm |
| RF loss | 45 dB/cm at 50 GHz | measured | p.5; p.15 Fig. S8 | Authors give 4.5 dB/mm (stored through the derived list as x10 unit conversion); 150 nm gold line; extracted from S-parameters; attributed to the modulator through the Fig. S8 measured MZM curve (about 4.5 dB/mm at 50 GHz) |
| RF effective index | 2.2 | derived | p.5; p.14 | Averaged over 0.01-110 GHz, from S-parameters |
| Optical group index | 2.8 | simulated | p.5; p.14 | Mode solver, at 1550 nm |
| Electrode | gold, 0.15 um (approx) | design_target | p.3; p.4 | GSG coplanar line; qualifier `electrode_thickness_um:approx` (p.4 says approximately 150 nm) |
| Buffer / substrate / cladding | 2 um BOX; SOI (220 nm Si); YLD124 polymer | design_target | p.3; p.9 | |
| Wavelength | 1550 nm (approx) | design_target | p.12 Eq. S13; p.5 | Nominal: Eq. S13 lambda and 'near 1550 nm' for the data run; wavelength of the Vpi and EO-response measurements not stated; qualifier `wavelength_nm:approx`; band c_band derived |
| Data | 100 GBd max; 200 Gb/s line rate (PAM4) | measured | p.5; p.6 Fig. 3(b) | OOK and PAM4 at 64 and 100 GBd; BERs in row notes (<1e-6, 4e-6, 5e-5, 9e-3); 100 GBd PAM4 below 20 percent SD-FEC limit |
| Drive Vpp | 1 V (approx) | author_estimate | p.5 | Peak-to-peak at 100 GBd; reference plane (amplifier output vs device) not stated, now said in the row note |

Entered as text only (no column): BTO film eps_r about 18 and tan delta about 0.05 at 60 GHz,
n_BTO 1.85, dielectric loss 0.58 dB/mm at 50 GHz, r33 about 34 pm/V, Gamma_s 0.32, grating
coupler about 5 dB. Not entered as device metrics: velocity-mismatch bandwidth about 220 GHz
(derived), predicted bandwidth with 1 um gold line "far beyond 100 GHz" (simulated, no number).

Not reported: extinction ratio, on-chip optical power, Z0 value, metal electrode gap and
signal width, etch depth as a separate number, energy per bit, net rate, RF Vpi,
temperature, bias at which Vpi was measured, fabricator.

## Judgment calls (flag for Q1)

1. **One row, system results included.** The paper presents a single 1 mm device and its
   Summary ties the 76 GHz result to the data demonstration, but Sec. 4 does not restate
   the length or that the chip is the Fig. 2 chip. By convention (d)/rule 5 it is one row;
   if Q1 prefers, the data fields can be split into a second row with identity unresolved
   as done for p2_01.
2. **published_on empty.** The coordinator reports arXiv v1 submitted 2020-10-20 (abstract
   page, also in `source.json` notes), but arXiv id 2011.09931 implies a November 2020
   announcement, so the submission date was not equated with the first-public date. The
   cached PDF has no arXiv stamp. Q1 or D2 can fill 2020-10-20 or the announcement date
   once verified.
3. **Authors/identity.** Preprint author list (13) vs Crossref (14, extra Artem Kuzmin);
   the preprint list is kept because numbers come from the preprint.
4. **bw3db reference = dc, basis derived.** The authors normalize to zero frequency and
   sweep from 0.01 GHz; they do not use the word reference. The 3 dB is on detected RF
   power, unlike the optical-power convention some other papers use. After Q1 (F1) the CSV
   cell `bw3db_reference = dc` is filled and the row note states the convention; the
   evidence entry carries the locator.
5. **bw6db and 110 GHz coincide with the instrument limit.** Entered as bw6db approx plus
   `bw_measured_to_ghz`; the curve ends near -6 dB with noise, so no stricter claim.
6. **drive and vpi_convention.** Push-pull is stated by the authors (antiparallel poling,
   single GSG feed); the Vpi convention is the min-to-max MZM swing, inferred, basis derived.
7. **Fiber-to-fiber 19 dB basis derived** (sum of authors' components) and approx; no
   on-chip insertion loss derived by this owner (would be 9 dB by arithmetic; not entered).
8. **RF loss 4.5 dB/mm.** Text (p.5, p.15) can be read as test-structure or modulator
   loss; Fig. S8 labels the measured curve as the CC-SOH MZM, and it reads about 4.5 dB/mm
   at 50 GHz, so it is attached to the device with a note.
9. **verified_on = 2026-10-02** (actual date; the shared contract text says 2026-10-01).
10. **University of Washington** is staged here with the same type/country/region as the
    p2_01 row; it is new relative to canonical data but not new across staged batches.
    Merge logic treats an identical row as no conflict (checked by dry-running p2_01 and
    p2_02 together: 0 conflicts). The p2_01 row is the one that survives a merge; the notes
    differ. **D2 must unify the two organization rows into one** (p2_01 is codex-main's batch;
    this row is kept as is). KIT reused exactly from canonical. The paper lists four KIT
    institutes (IPQ, IMT, INT, IHE) under the one organization.
11. **Fabricator empty.** KNMF is only in the Funding paragraph; no cleanroom is named as
    fabricating the device.
12. **CSV hint check.** Batch CSV said access_guess open_access and license
    arXiv-nonexclusive (not verified from the cached file, not used); it lists 14 authors
    (the journal list); priority 2, device_class mzm and platform_guess eo_polymer (an EO
    material, not a waveguide platform; the platform is SOH slot on SOI) are consistent with
    the paper; "UpiL 1.3 V mm, 200 Gbit/s PAM4" lead confirmed from the paper itself.

## Validation (staged only)

- `uv run python scripts/merge_staging.py data/_staging/p2_02`: counts {papers 1, devices 1,
  orgs 1, evidence 1}; **0 conflicts, 0 validation errors**; dry run, nothing written.
- Combined dry run p2_01 + p2_02: papers 3, devices 25, orgs 5, evidence 3; 0 conflicts,
  0 validation errors.
- `uv run python scripts/validate_db.py`: 0 errors. `uv run pytest -q`: 28 passed (all re-run after the Q1 corrections).
- Canonical files byte-identical (hash-compared before and after); canonical remains 15 papers /
  28 devices / 27 organizations.
- Self-checks: 24 entries + 3 derived items, no duplicate evidence keys; every non-empty evidence-required cell has an
  entry with the same value; every evidence note at most 25 words; no qualifier on an empty
  field; no emoji, non-ASCII or absolute/home paths in the staged files.

## Blockers and queue

1. han2023 awaits manual download (`needs_download.md`); no scraping of the publisher.
2. Independent Q1 audit and verification pass done (verdict accept); see the audit disposition below.
3. D2 serial merge (data lane); it must unify the University of Washington rows with p2_01.
4. Optica VOR vs preprint differences (including the extra author) not verifiable offline.

## Audit disposition (Q1: data/_staging/audits/p2_02-claude-wave-2026-10-02-q1.md, verdict accept after corrections)

| ID | Severity | Disposition | One line |
|---|---|---|---|
| F1 | medium | applied | `bw3db_reference = dc` filled; row note states detected-RF-power convention, zero-frequency reference, termination, de-embedding; report wording fixed |
| F2 | medium | applied | `wavelength_nm:approx` and `electrode_thickness_um:approx` added; wavelength note says nominal and measurement wavelength unstated; basis left design_target (see F7) and `band` kept c_band |
| F3 | low | applied | Notes on 3 dB (noisy plateau) and 6 dB (about -6 dB at sweep end within noise, authors state about 110 GHz) reworded; representation unchanged |
| F4 | low | applied | Evidence note anchors the 4.5 dB/mm to the Fig. S8 measured MZM curve; "power/amplitude not stated" dropped from evidence, row and report |
| F5 | low | applied | Row note says the 1 Vpp reference plane is not stated and not to be ranked across rows without a plane tag; plane tag itself is a coordinator gap (G4) |
| F6 | low | applied | vpil (0.13 V cm), prop loss (60 dB/cm), RF loss (45 dB/cm) moved from entries to the `derived` list with formula and inputs; CSV cells unchanged |
| F7 | low | follow-up | `design_target` for stated architecture/geometry kept as in p2_01; coordinator to settle X6; no change here |
| F8 | low | applied | Page split (pp.1-6 / 7-8 / 9-15), Eq. S13/S21 usage and the CSV-hint wording corrected in this report and DevLog-010 |
| F9 | low | follow-up | Versioned `arxiv_id`, versioned PDF url, `venue` string, journal `year` mirror p2_01; left for the schema owner to normalize both batches together; version-not-confirmed-from-PDF caveat already in paper notes |
| F10 | low | applied (note) | University of Washington row kept; D2 must unify with the p2_01 row (see judgment call 10) |
| F11 | low | follow-up | `repro_grade` kept C as in p2_01 (SOH, no sim eligibility either way); auditor notes B is arguable by the skill definition (metal widths need figure digitization); no data impact; I do not dispute the arguability, coordinator to settle for both SOH batches |
| F12 | low | applied | Tag `device_identity_unresolved` (vocabulary already used in p2_01) added; row note keeps the identity statement |
| F13 | low | not editable | han2023 `needs_download.md` is the prefetch tool's auto-generated file; not edited; template mismatch (`why_needed`) noted for the coordinator |

Gaps G1-G4 in the audit (dB-scale field, validator check for evidence entries on empty cells,
unit-conversion/`design_target` rules, drive plane tag) are coordinator items, not actions here.

---

# han2023 section (appended 2026-10-02)

Owner: han2023 distiller subagent for claude-wave-2026-10-02. Existing ummethala2021 rows, evidence,
audit disposition and the independent audit were not touched; this section only adds han2023.
Not audited, not merged; D2 integration and Q1 for han2023 remain with the data lane.

## Status

| Paper | Status | Rows | Notes |
|---|---|---|---|
| han2023 | distilled from the arXiv v1 preprint only (VoR and Supplement still needs_download) | 1 paper, 1 device row (`han2023-a`), 22 evidence entries, derived list empty | repro_grade B; no sim config (silicon pn-depletion CROW, not a dielectric TWE) |

The earlier table row (han2023 needs_download, 0 rows) reflects the state before the preprint was cached
and is left unedited above; this section supersedes it.

## Source version

- Cached source: arXiv `2302.03652v1` (31 pages, stamp 7 Feb 2023), title 'Slow light silicon modulator
  beyond 110 GHz bandwidth'. This is NOT the Science Advances version of record
  (Sci. Adv. 9(42) eadi5339, Crossref issued 2023-10-20, title 'Slow-light silicon modulator with 110-GHz
  bandwidth'). All numbers are from the cached preprint text and Fig. 2(a), 3, 4; none from the VoR.
- Supplementary Materials (Sections 1-7 cited for design theory, loss, S21 and data measurements) are not
  in the cached PDF. VoR and Supplement stay on `needs_download.md` as a version-check follow-up (block
  rewritten 2026-10-02 to say the preprint is cached and what the VoR check is for).
- `title` and `doi` carry the VoR identity (Crossref); `arxiv_id`, `url` and `source_type` point to the
  preprint, as in ummethala2021. Authors: 17 names, identical on preprint and Crossref.
- `published_on` empty (preprint stamp 2023-02-07 not equated with first-public date; 2023-10-20 is the VoR).
  `license` empty, `redistribution = restricted_local_only` (cached-version license unverified; Crossref lists none).
- Pages read: all 31 pages of `text.md`; viewed the Fig. 4 image (p.30, caption p.31), Fig. 2 image (p.28) and
  Fig. 3 image (p.29). Fig. 1 read from text and caption only (p.26-27).

## han2023-a per-row ledger

| Metric | Value | Basis | Locator | Conventions / scope |
|---|---|---|---|---|
| Length | 124 um (0.124 mm) | design_target | abstract; p.29 Fig. 3(a) | Per-arm CROW modulation region; two arms |
| Wavelength | 1550 nm (approx) | design_target | p.3; p.11; Fig. 4(b) | Nominal passband centre, passband about 8 nm; S21 measurement wavelength not stated |
| 3 dB EO bandwidth | 110 GHz (approx) | measured | p.11; Fig. 4(c) | Read by authors from a fit to S21; trace spans 0-110 GHz and ends at about -3 to -4 dB, so the crossing sits at the instrument limit; `bw_measured_to_ghz = 110`; `bw3db_reference = dc` (derived from the curve starting at 0 dB; about +1.5 dB peaking near 20 GHz read from figure); probe loss said to degrade slightly, de-embedding and S21 dB convention not stated |
| On-chip insertion loss | 6.8 dB | measured | p.15 Methods | Includes 5.4 dB phase shifter plus couplers, routing; excludes unoptimized coupling loss about 10 dB (per coupler or per pair not stated) |
| Extinction ratio | 2.15 dB (dynamic) | measured | p.31 Fig. 4(d) caption | 112 Gb/s eye; 3.15 dB at 100 Gb/s in the evidence note |
| Group index | 6.1 | simulated | p.6; Fig. 1(f) | Calculated, not measured |
| Geometry | rib 455 nm, slab 90 nm, Cu 1.2 um, gap 6.4 um, BOX 2 um, 220 nm SOI, SiO2 cladding | design_target (cladding extracted_from_figure) | p.14-15 Methods; Fig. 2(a) | Grating period 300 nm, corrugation 190 nm, Np 20, Nr 10, doping 5.0e17 cm^-3 in epitaxy_or_stack text |
| Data | 112 GBd OOK, 112 Gb/s | derived (baud), measured (rate) | p.11-12; Fig. 4(d,g,h) | OOK so baud equals bit rate; eyes without pre-equalization; BER with offline FFE and MLSE |
| Drive | push_pull | design_target | p.15 | GSGSG electrode, designed for push-pull; electrode_type set to `other` (GSGSG, not in enum) |

Not reported in the preprint: Vpi and Vpi*L (so `vpi_convention` empty), measured modulation efficiency,
drive amplitude, bias, optical input power, Z0, n_RF, RF loss, energy per bit, capacitance, temperature,
per-length propagation loss (no value entered). Design-stage simulated numbers (efficiency factor
0.013 pi/V, optical bandwidth about 140 GHz, electrical bandwidth about 200 GHz at 4 V, Q_propagating about 5000)
are in the row notes only.

## Judgment calls and flags

1. **Version.** Preprint only; the VoR may carry different numbers, a Supplement, and different wording. No VoR claims.
2. **FEC discrepancy.** Text says BER below SD-FEC (2e-3) at 112 Gb/s, but Fig. 4(h) shows the 20 percent FEC line at about
   1.5e-2 and the best 112 Gb/s point at about 1.7e-2 (figure reading), i.e. near that line, not below 2e-3. Flagged in the
   row notes and the evidence note; no net rate entered.
3. **Bandwidth at the limit.** Authors' about-110 GHz is a fitted-curve reading at the 110 GHz limit; stored as 110 with `approx`
   and `bw_measured_to_ghz = 110`. Not a free-running crossing.
4. **ER headline.** 2.15 dB at 112 Gb/s (max rate), 3.15 dB at 100 Gb/s noted; ER is low (OOK, short device) and is not a static ER.
5. **Insertion-loss exclusion.** The Methods wording about the unoptimized 10 dB coupling loss is ambiguous; entered as on-chip
   6.8 dB with the exclusion described verbatim in substance.
6. **electrode_type = other.** GSGSG with impedance match; the paper does not call it traveling-wave explicitly.
7. **Organizations.** Six new orgs staged: Peking University, Beijing Information Science and Technology University, Peng Cheng Laboratory,
   Zhang Jiang Laboratory, Peking University Yangtze Delta Institute of Optoelectronics (parent Peking University), CompoundTek Pte
   (foundry, country SG entered from outside the paper, noted). None exist in canonical data or in other staged batches (grepped);
   research institutes sit in `companies` per the existing convention in canonical rows. Frontiers Science Center for
   Nano-optoelectronics is recorded in the Peking University note only.
8. **repro_grade B** (not C): geometry largely disclosed with Fig. 2(a) dimensions; contact doping, layout and Supplement missing. No sim config (silicon).
9. **CSV hint check.** Batch CSV says journal source, access unknown, published_on 2023-10-20, platform silicon_plasma_dispersion
   (an EO material, not a platform; the platform is soi_rib), priority 2: consistent with the paper except the version/source facts above.
10. **verified_on = 2026-10-02.**

## Validation (staged only, han2023 added)

- `uv run python scripts/merge_staging.py data/_staging/p2_02`: counts {papers 2, devices 2, orgs 7, evidence 2};
  0 conflicts, 0 validation errors; dry run, nothing written.
- Self-checks: every evidence note at most 25 words; no non-ASCII characters or absolute paths in the added content; ummethala2021 rows
  and evidence untouched (additions append-only).

## Blockers and queue (han2023)

1. Science Advances VoR and Supplementary Materials: manual download (`needs_download.md`); then version-check every han2023-a number.
2. Q1 audit of han2023 (fresh context) not yet run.
3. D2 merge must carry the six new organization rows.

## han2023 audit dispositions (2026-10-03)

Source: Q1 audit `data/_staging/audits/p3_05-p3_07-han2023-q1-claude-ingest-2026-10-03.md` (findings F22, F23). ummethala2021 rows, the existing independent p2_02 audit and all other p2_02 content were not touched. Both findings re-checked against `references/han2023/text.md` (p.12) and the Fig. 4 image (img_p30_1). Counts: 0 applied, 2 applied-adjusted, 0 rejected, 0 deferred. Row and evidence counts unchanged (1 row, 22 entries). Dry-run merge of p3_05, p3_06, p3_07 and p2_02: 0 conflicts, 0 validation errors. Item 2 of the blockers list above (Q1 not yet run) is superseded by this section.

| ID | Severity | Disposition | Exact change or reason |
|---|---|---|---|
| F22 | numerical | applied-adjusted | Fig. 4(h) confirmed: 7 percent FEC line at about 3.8e-3, 20 percent FEC line at about 1.5e-2; the 98 Gb/s series reaches about 2e-3 (below the 7 percent line), the 112 Gb/s series has its lowest BER at about -17.1 dBm, about 1.7e-2 by my reading (the audit says 1.6-1.7e-2), marginally above the 20 percent line; the text claim of below 2e-3 SD-FEC at 112 Gb/s is not supported by its own figure. `modulation_format` (CSV and evidence value, kept equal) now appends "BER below the 7 percent HD-FEC line (3.8e-3) up to 98 Gb/s; at 112 Gb/s best BER about 1.7e-2 (Fig. 4(h), figure read), marginally above the 20 percent FEC line (about 1.5e-2), unlike the text claim of below 2e-3". `max_line_rate_gbps` 112 and `max_baud_gbd` 112 kept as the demonstrated rate (eyes and BER measured) with the evidence note and row notes stating it is not an FEC-compliant rate; `max_net_rate_gbps` stays empty (no net rate invented). |
| F23 | minor | applied-adjusted | Fig. 4(c) and p.11 confirmed: the 110 GHz is the crossing of the authors' fit; the measured trace is noisy and reaches about -3 to -4 dB at the end. `bw_basis` (CSV) and the `bw3db_ghz` evidence basis measured -> derived (author fit; chosen over the audit's extracted_from_figure because the authors state the value from their own fit, convention (h)); evidence note and row notes reworded. `bw_measured_to_ghz` 110 stays measured; qualifier bw3db_ghz:approx and reference dc unchanged. |

Cross-batch (listed for the coordinator, not renamed here): F24(a) "Zhang Jiang Laboratory" (this batch, as printed on han2023 p.1) vs "Zhangjiang Laboratory" (p3_06); F26 `published_on` and `license` stay empty for this arXiv v1 copy, consistent with the p3_05 to p3_07 rule.
