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
