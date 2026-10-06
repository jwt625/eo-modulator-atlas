# SPEC proposals (batch p6_02)

## murai2025
- sims/SPEC.md has no conductivity or loss for dielectric/semiconductor regions other than `tan_delta_rf`; the paper attributes the 28 GHz roll-off of the 9.9 mm device to a 1 to 20 ohm cm Si substrate. A `sigma_Sm` (or resistivity) on a non-conductor material, with a quasi-TEM loss estimate, would be needed to represent it. The config uses lossless Si (eps_r 11.7) and lists the omission under `limitations`.

## xue2023
- Electrode-on-slab devices with a sub-micron waveguide-electrode gap need an optical window narrower than the electrode edge; the window is cropped to |x| < 1.25 um and the config says so in `limitations`/provenance. No SPEC change needed, noted for the engine author (mode truncation).

## all papers
- Ground-electrode width and arm spacing are not devices.csv columns; they are carried only in sim configs and notes.
