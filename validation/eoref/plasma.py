"""Free-carrier plasma dispersion in silicon (independent implementation, lane T5, DevLog-040).

Fit form (both models): dn = -(a_e N_e^b_e + a_h N_h^b_h), d alpha = c_e N_e^d_e + c_h N_h^d_h
(N in cm^-3, alpha in cm^-1, changes relative to carrier-free Si).

- soref_bennett_1550: coefficients as printed by Reed et al., Nat. Photonics 4, 518 (2010), p. 519, attributed to
  Soref and Bennett, IEEE JQE 23, 123 (1987). The 1987 paper gives the curves (Figs. 11, 14, 15) and the fitted dn slopes
  at 1.55 um, 0.818 (holes) and 1.04 (electrons), p. 126; the numeric coefficients are not printed in its text.
- nedeljkovic_1550: Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171 (2011), eqs. (4)-(5) p. 1175 and
  Table 1 p. 1178 (1.55 um row). The paper's fit-validity limits (p. 1174-1175) concern lambda >= 8-11 um only.
  Mapping of the paper's letters to the keys here: p, q -> a_e, b_e; r, s -> a_h, b_h; a, b -> c_e, d_e; c, d -> c_h, d_h.

Complex relative-permittivity change, first order: d eps_r = 2 n (dn + i kappa), kappa = lambda d alpha / (4 pi).
"""

from __future__ import annotations

import math

import numpy as np

MODELS: dict[str, dict] = {
    "soref_bennett_1550": {
        "wavelength_nm": 1550.0,
        "a_e": 8.8e-22, "b_e": 1.0, "a_h": 8.5e-18, "b_h": 0.8,
        "c_e": 8.5e-18, "d_e": 1.0, "c_h": 6.0e-18, "d_h": 1.0,
        "locator": "Reed et al., Nat. Photonics 4, 518 (2010), p. 519 (1.55 um expressions, attributed to Soref and "
                   "Bennett 1987); Soref and Bennett, IEEE JQE 23, 123 (1987) Figs. 11, 14, 15, slopes p. 126",
        "available": True,
    },
    "nedeljkovic_1550": {
        "wavelength_nm": 1550.0,
        # paper notation: d alpha = a N_e^b + c N_h^d (eq. 4), -dn = p N_e^q + r N_h^s (eq. 5)
        "a_e": 5.40e-22, "b_e": 1.011, "a_h": 1.53e-18, "b_h": 0.838,
        "c_e": 8.88e-21, "d_e": 1.167, "c_h": 5.84e-20, "d_h": 1.109,
        "locator": "Nedeljkovic, Soref, Mashanovich, IEEE Photonics J. 3, 1171 (2011): eqs. (4), (5) p. 1175, "
                   "Table 1 p. 1178, row 1.55 um (a 8.88E-21, b 1.167, c 5.84E-20, d 1.109, p 5.40E-22, q 1.011, "
                   "r 1.53E-18, s 0.838); read from the rendered page image 2026-10-15 (references/_inbox/nedeljkovic2011.pdf)",
        "available": True,
    },
}


def dn_dalpha(model: str, Ne, Nh):
    """(dn, d alpha [cm^-1]) for absolute carrier densities Ne, Nh (cm^-3)."""
    m = MODELS[model]
    if not m["available"]:
        raise RuntimeError(f"{model}: coefficients not available")
    Ne = np.maximum(np.asarray(Ne, dtype=float), 0.0)
    Nh = np.maximum(np.asarray(Nh, dtype=float), 0.0)
    dn = -(m["a_e"] * Ne ** m["b_e"] + m["a_h"] * Nh ** m["b_h"])
    da = m["c_e"] * Ne ** m["d_e"] + m["c_h"] * Nh ** m["d_h"]
    return dn, da


def dn_dalpha_signed_change(model: str, dNe, dNh):
    """Secondary definition: the fit applied to density changes, sign-preserving: -a sign(dN) |dN|^b."""
    m = MODELS[model]
    dNe = np.asarray(dNe, dtype=float)
    dNh = np.asarray(dNh, dtype=float)

    def sp(x, b):
        return np.sign(x) * np.abs(x) ** b

    dn = -(m["a_e"] * sp(dNe, m["b_e"]) + m["a_h"] * sp(dNh, m["b_h"]))
    da = m["c_e"] * sp(dNe, m["d_e"]) + m["c_h"] * sp(dNh, m["d_h"])
    return dn, da


def deps_complex(n_si: float, dn, dalpha_cm, wavelength_um: float):
    """d eps_r = 2 n (dn + i kappa), kappa = lambda d alpha / (4 pi); alpha in cm^-1, lambda in um."""
    kappa = (wavelength_um * 1e-4) * np.asarray(dalpha_cm) / (4 * math.pi)
    return 2.0 * n_si * (np.asarray(dn) + 1j * kappa)


def check_reed_example() -> float:
    """Reed 2010 p. 519: 'a change in carrier density of the order of 5e17 cm^-3 results in a dn of -1.66e-3 at
    1.55 um' (electrons and holes each 5e17). Returns the value of this implementation."""
    dn, _ = dn_dalpha("soref_bennett_1550", 5e17, 5e17)
    return float(dn)
