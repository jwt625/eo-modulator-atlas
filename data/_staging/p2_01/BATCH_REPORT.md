# p2_01: SOH primary-source distillation

Owner: codex-main / D1.12. Updated 2026-10-02. **Ready for independent Q1 review;
not merged.** Author verification is not the independent audit. D2 canonical
integration remains with the existing data-lane owner.

## Delivered scope

- Two versioned arXiv manuscripts, acquired through serialized prefetch and read
  offline. DOI metadata titles and full author lists match both cached PDFs.
- Two paper rows, 24 device/measurement-condition rows, five new organizations,
  and two evidence files with 153 entries. These are **not 24 independently
  identified physical devices**: some rows separate measurements of one device,
  and Kieninger does not identify its headline devices within the 16 loss samples.
- Exact canonical CSV headers; no schema, canonical CSV, generated-view or
  simulation changes. Both SOH sources receive reproducibility grade C under the
  current simulator scope; no dielectric traveling-wave config is invented.
- Dry-run merge: 2 papers / 24 rows / 5 organizations / 2 evidence files;
  **0 conflicts, 0 validation errors**. Canonical remains 15 / 28 / 27.

## Source versions and rights

| Source | Cached version | Read / visually checked | Identity and metadata decisions |
|---|---|---|---|
| Kieninger 2020 | [2002.08176v1](https://arxiv.org/pdf/2002.08176v1), 12 pages | Entire pp.1–12; Figs.1–4 on pp.3–7; Table 1 on p.10; p.8 system conditions | Associated journal DOI 10.1364/oe.390315; Crossref year 2020 |
| Wolf 2018a | [1709.01793v1](https://arxiv.org/pdf/1709.01793v1), 18 pages | Entire pp.1–18; all Figs.1–5 on pp.14–18 | Associated journal DOI 10.1038/s41598-017-19061-8; journal year 2018 retained, metrics from the earlier preprint |

`published_on` is empty: candidate first-public dates were not verified from
primary metadata offline. The journal year remains explicit in `papers.csv` and
does not imply that the journal version was read. Crossref licenses refer to
journal versions; no license notice for these cached preprints was verified.
Their `license` is empty and packaging is `restricted_local_only` pending rights
verification. `source.json` now records the actual versioned download URL and
download origin; its SHA-256 remains the extracted PDF's hash.

Prefetch originally assigned DOI URLs and journal/candidate licenses to these
preprint caches. Corrected only these two owned reference directories, including
local text frontmatter. Removed publisher abstracts from both tracked Crossref
records, matching `references/README.md`. PDFs/text/figures remain Git-ignored.

## Kieninger 2020: 21 measurement rows

| Row(s) | Recorded measurements | Separation / judgment |
|---|---|---|
| `best-dc` | 0.28 mm, 1550 nm, 1.48 V, reported 0.041 V cm | Lowest measured Vpi; physical sample not identified; no population loss attached |
| `system-dc` | 0.28 mm, 1.50 V DC | System device; exact wavelength/gate state of this reading not restated |
| `system-loss-ungated` | 0.74 dB phase loss; 13.6 dB fiber loss | Phase loss is a wavelength average; total-loss wavelength not specified here |
| `open-ended` | 1560 nm, 100 GBd OOK/PAM4, 200 Gb/s line, reported 187 Gb/s net; effective 1.44 Vpp | Gate 0.1 V/nm; amplifier/load reference and device voltage kept distinct |
| `terminated` | 40 GHz 3 dB EO bandwidth | Gate 0.1 V/nm, 50-ohm termination; cannot borrow bandwidth for open-ended experiment |
| `die1-mzm1` … `die4-mzm4` | 16 individual Table 1 loss samples, 0.28 mm | Fiber loss at each listed wavelength; phase loss averaged over constructive wavelengths, 1510–1580 nm |

Conventions and omissions:

- MZM push-pull Vpi follows the stated maximum/minimum transmission method and
  opposite arm phase shifts. V mm products convert to V cm without changing the
  voltage convention; author-derived products use `derived` basis.
- The Table 1 central phase losses range from 0.01 to 1.83 dB. Their wavelength
  standard deviations, total-loss uncertainties and measurement uncertainties are
  retained in notes/evidence, rather than interpreted as bounds. Small central
  values with larger uncertainty are not claims of precisely resolved near-zero
  loss. Sixteen separate physical samples are tagged `statistical_replicate`.
- These on-chip fields contain **phase-shifter loss only**. Explicit exclusions
  cover gratings, access waveguides, MMIs and mode converters. De-embedding uses
  Eq. (1), so phase loss has `derived` basis; total transmission loss is measured.
- Population mean 0.6 ± 0.5 dB ungated, approximately 0.7 ± 0.5 dB gated, and
  derived 2.5 dB/mm propagation loss remain context here, not measurements attached
  to the best-Vpi or data device. The gate-induced phase loss is an author estimate
  of approximately 0.14 dB, based on equal added loss per length in access and
  active sections. Neither 14.4 dB total nor 0.88 dB phase loss is silently added
  to CSV cells.
- The effective 1.44 Vpp is an author-derived doubling of the 0.72 Vpp matched-load
  equivalent after probe loss (0.78 Vpp at amplifier output). It is not a measured
  voltage calibration at the open-ended device. This context is in the evidence.
- ER approximately 30 dB is stated as consistent for the loss samples. No
  per-sample Vpi, RF loss or bandwidth is assigned. The similar 0.74 dB values do
  not establish an identity between Table 1 Die 1 MZM 2 and the system device.
- Optical slot width is not the metal electrode gap. Geometry is stored as
  reported nominal design/author estimates. The laser's 11.5 dBm output is not
  assigned to the on-chip optical-input field.

Not reported for the staged conditions: metal electrode gap/width/thickness,
characteristic impedance, RF propagation loss/index, optical group index,
3 dB reference frequency or measurement range, open-ended bandwidth,
frequency-dependent Vpi, calibrated on-chip optical launch power, electrical
energy per bit, device-to-table identities. Bias and gate conditions are not
invented for the low-frequency Vpi records.

## Wolf 2018a: three measurement rows

| Row | Recorded measurements | Separation / judgment |
|---|---|---|
| `static` | 1.1 mm, 1550 nm, 0.9 V at bias >2 V; reported 0.1 V cm; phase loss approximately 8 dB; total loss at least 20 dB; static ER approximately 14 dB | Vpi is MZM push-pull. Loss describes the reported fabrication generation, not a fresh loss calibration for every system run |
| `gated` | Approximately 25 GHz **6 dB EOE** bandwidth, gate 0.1 V/nm; 1.4 Vpp drive; 100 Gb/s OOK; author-derived 98 fJ/bit | External 50-ohm load; gated data points at 100 Gb/s back-to-back and 80/100 Gb/s over 10 km |
| `ungated` | 100 Gb/s OOK with MICRAM DAC4 | Same modulator with no gate. Lower-rate ungated AWG points retained in modulation text; no additional row just for another driver |

Conventions and omissions:

- Keep `bw3db_ghz` empty. The paper explicitly uses a 6 dB EOE response drop and
  discusses the optical-power/detector convention. The approximately 25 GHz value
  belongs in `bw6db_ghz`; no conversion to a schema-wide 3 dB bandwidth is inferred.
- The 98 fJ/bit is calculated by the authors for 1.4 Vpp, 50 ohms and 100 Gb/s,
  assuming matched NRZ drive. It is load energy, not total transmitter electronics
  energy. A termination resistance is not a measured transmission-line impedance.
- The initial gated experiment estimates BER from Q (3.2e-4 back-to-back and
  3.0e-3 over 10 km at 100 Gb/s). The ungated DAC experiment directly measures
  4.2e-3 without and 6.6e-6 with post-equalization. Do not replace measured BER by
  the corresponding Q estimates, or assign gated bandwidth to the ungated run.
- Approximate 7.3 dB/mm phase propagation loss becomes 73 dB/cm with `derived`
  basis and `approx`. The schema has no inclusive bound; the total-loss statement
  “20 dB or more” uses `gt`, with its inclusive meaning retained in notes for Q1.
- Fig.1's caption says `hRail = 70 nm`, while the drawing labels the thin slab
  `hSlab`. No numeric slab/rail thickness is entered. Slot and rail widths remain
  in stack text, not in unrelated electrode-gap or rib-width fields.
- University of Muenster and Infinera are explicitly present-address affiliations.
  The named fabricator is Institute of Microelectronics, Singapore; Kieninger
  expands the unit name that Wolf abbreviates as IME. The parent organization
  acronym is retained in the organization note without an unsupported expansion.

Not reported: scalar 3 dB EOE bandwidth/reference, RF Vpi, whole-chip insertion
loss excluding gratings, directly calibrated DAC-case drive voltage, DAC-case
wavelength restatement, net rate, on-chip optical input power, RF loss/index,
measured Z0, complete metal dimensions and unambiguous silicon slab thickness.
The 5–7 dB dynamic-ER range remains text context (p.7); no midpoint is invented.
Referenced Supplementary Information is not included in the cached main PDF and
was not read. Its acquisition/review remains a follow-up; no supplementary-only
numbers are imported from other papers or the journal version.

## Review and integration queue

1. Independent reviewer writes `data/_staging/audits/p2_01-<reviewer>.md`; read
   actual cached PDFs/figures, not just this author report. Check sample identity,
   phase-loss scope, 6 dB convention, gate/termination separation, uncertainty,
   inclusive bound representation and the preprint/journal metadata distinction.
2. Author corrects accepted findings; repeat dry-run merge after changes.
3. D2 serially merges the accepted batch and regenerates views. Check that 16
   loss-only replicates do not acquire headline Vpi/BW by paper-level joins.
4. Subsequent ingestion: acquire Wolf's Supplementary Information through the
   coordinator, verify first-public dates and preprint rights, and audit version
   differences before substituting journal values.

Tooling follow-up for D0: preserve the fetched versioned URL and acquisition
origin during extraction; associate licenses with source versions; sanitize
publisher abstracts before public metadata export. No shared tooling changed here.
