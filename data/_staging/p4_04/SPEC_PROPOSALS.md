# SPEC proposals (p4_04)

## wang2025
- Rotated crystal cuts. The device is X-112 deg Y LiTaO3 (propagation 22 deg from Y toward Z about the film normal). `crystal: {cut, propagation, rotation_deg}` only rotates about the propagation axis, so a rotation about the film normal cannot be expressed; the config uses x-cut/y-propagation and lists the mismatch under `limitations`. Proposal: allow an in-plane propagation angle `propagation_angle_deg` about the film normal (rotating both the RF permittivity tensor in the cross-section and the Pockels contraction), or Euler angles in the crystal frame.

## wang2024a, wang2025
- Material constants for LiTaO3 (eps_r perp/par, n_o/n_e, r33/r51) are entered as `standard_reference` citing the companion Nature paper wang2024b (Extended Data Table 1). The engine library has tabulated Bond indices for `lithium_tantalate` but no RF or EO coefficients; a verified reference set for LT (including r13, r22) would remove the `missing` entries.
