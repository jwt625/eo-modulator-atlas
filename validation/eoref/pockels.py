"""Linear EO (Pockels) permittivity change for x-cut LN, propagation along crystal y.

Crystal frame (1, 2, 3) = (x, y, z), 3m point group, mirror plane normal to crystal x (standard form, e.g.
Weis and Gaylord, Appl. Phys. A 37, 191 (1985); Yariv and Yeh, Optical Waves in Crystals, Table 7.2):
  r = [[0, -r22, r13], [0, r22, r13], [0, 0, r33], [0, r51, 0], [r51, 0, 0], [-r22, 0, 0]]
  delta(1/eps)_I = sum_k r_Ik E_k, I = 1..6 = (11, 22, 33, 23, 13, 12)
Lab frame used by the cases: lab x = crystal z, lab y = crystal x, lab z = crystal y (right-handed);
crystal +z along lab +x and crystal +x along lab +y (film normal up). The static field has no lab-z component.
delta eps_ab (relative) = -eps_a eps_b delta(1/eps)_ab (diagonal unperturbed eps, lab frame).
"""

from __future__ import annotations

import numpy as np


def delta_eps_lab(ex_static: np.ndarray, ey_static: np.ndarray, r_pm: dict, n_e: float, n_o: float,
                  components: str = "full") -> dict[str, np.ndarray]:
    """Static field in V/m (lab x, y); r in pm/V. Returns relative delta eps components in the lab frame."""
    r13, r22, r33, r51 = (r_pm[k] * 1e-12 for k in ("r13", "r22", "r33", "r51"))
    E3 = ex_static  # crystal z
    E1 = ey_static  # crystal x
    ex2, ey2, ez2 = n_e**2, n_o**2, n_o**2
    if components == "r33_only":
        return {"xx": -ex2 * ex2 * r33 * E3}
    B = {
        "xx": r33 * E3,
        "yy": r13 * E3,
        "zz": r13 * E3,
        "xy": r51 * E1,
        "yz": -r22 * E1,
    }
    eps = {"x": ex2, "y": ey2, "z": ez2}
    return {ab: -eps[ab[0]] * eps[ab[1]] * v for ab, v in B.items()}
