# p2_01 interface proposals (not implemented)

Updated 2026-10-02. Coordinate with schema/D2/U2 owners before changes.

1. **Measurement-condition identity.** Gate field, termination and physical-device
   linkage currently live in tags/notes. Add an explicit shared physical-device
   identifier and typed conditions if comparisons are to join measurements.
   Kieninger's 40 GHz terminated device must not provide bandwidth to its
   open-ended signal experiment. Measurement-row counts are not device yields.
2. **Loss scope and wavelength aggregation.** Phase-only de-embedded loss and
   whole-MZM insertion loss need structured scope before ranking them together.
   Current includes/excludes text is preserved. Table 1 total loss has one
   wavelength; phase loss averages many wavelengths. One row-level wavelength
   cannot express both without evidence notes.
3. **Uncertainty and sample populations.** Kieninger reports 16 physical samples,
   per-wavelength standard deviations and propagated measurement uncertainty.
   Preserve these separately from `approx` and bounds. Near-zero means whose
   uncertainty exceeds the central value should not be ranked as exact minima.
4. **Inclusive bounds.** `gt`/`lt` cannot faithfully display >=/<=. Wolf's total
   loss is at least 20 dB, represented by the existing `gt` plus an explicit note.
   Add inclusive operators through CSV validation, generated views, charts and
   exports together; do not change the enum only.
5. **Bandwidth transfer convention.** Extend the response contract to distinguish
   EO/EOE field, optical power and detected RF power conventions. Keep Wolf's
   reported 6 dB EOE result in `bw6db_ghz` until a reviewed conversion rule exists.
6. **Drive reference plane and energy boundary.** Distinguish matched-load
   equivalent voltage from effective open-end voltage; distinguish terminating
   load energy from transmitter/driver energy. Kieninger 0.72/1.44 Vpp and Wolf
   98 fJ/bit illustrate why values cannot be compared without these contexts.

Current rows use existing fields and factual notes. These proposals do not claim
schema approval and do not authorize edits to another agent's owned files.
