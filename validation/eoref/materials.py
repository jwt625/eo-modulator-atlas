"""Optical constants from the Sellmeier fits stored in engine/data/materials.json (data file only).

Formulas (as documented in that file):
  sellmeier_c_squared: n^2 = 1 + sum B_i l^2 / (l^2 - C_i^2), l in um
  sellmeier_c:         n^2 = 1 + sum B_i l^2 / (l^2 - C_i),   l in um
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
MATERIALS_JSON = REPO / "engine" / "data" / "materials.json"

# Keys used by the cases: (library material, component)
KEYS = {
    "sio2": ("silicon_dioxide", "n"),
    "si": ("silicon", "n"),
    "ln_o": ("lithium_niobate", "n_o"),
    "ln_e": ("lithium_niobate", "n_e"),
}


def _load() -> dict:
    return json.loads(MATERIALS_JSON.read_text())


_LIB = _load()


def sellmeier_terms(key: str) -> list[tuple[float, float]]:
    """Return [(B_i, C_i_um2)] with n^2 = 1 + sum B l^2/(l^2 - C)."""
    mat, comp = KEYS[key]
    d = _LIB["materials"][mat]["optical"][comp]
    if d["model"] == "sellmeier_c_squared":
        return [(b, c * c) for b, c in zip(d["B"], d["C"], strict=True)]
    if d["model"] == "sellmeier_c":
        return [(b, c) for b, c in zip(d["B"], d["C"], strict=True)]
    raise ValueError(f"unsupported model {d['model']}")


def n_of(key: str, wavelength_um: float | np.ndarray) -> float | np.ndarray:
    lam2 = np.asarray(wavelength_um, dtype=float) ** 2
    n2 = 1.0 + sum(b * lam2 / (lam2 - c) for b, c in sellmeier_terms(key))
    return np.sqrt(n2)


def dn_dlambda(key: str, wavelength_um: float) -> float:
    """Analytic derivative d n / d lambda (1/um)."""
    lam = float(wavelength_um)
    n = float(n_of(key, lam))
    # d(n^2)/dl = sum B * (2 l (l^2 - C) - l^2 2 l) / (l^2 - C)^2 = sum -2 B l C / (l^2 - C)^2
    dn2 = sum(-2.0 * b * lam * c / (lam * lam - c) ** 2 for b, c in sellmeier_terms(key))
    return dn2 / (2.0 * n)


def citation(key: str) -> str:
    mat, comp = KEYS[key]
    return _LIB["materials"][mat]["optical"][comp]["citation"]


def table(wavelength_um: float = 1.55) -> dict[str, dict[str, float]]:
    out = {}
    for k in KEYS:
        n = float(n_of(k, wavelength_um))
        d = dn_dlambda(k, wavelength_um)
        out[k] = {"n": n, "dn_dlambda_per_um": d, "n_group_material": n - wavelength_um * d}
    return out


if __name__ == "__main__":
    for k, v in table().items():
        print(f"{k:5s} n={v['n']:.6f} dn/dl={v['dn_dlambda_per_um']:+.6f}/um ng_mat={v['n_group_material']:.6f}  {citation(k)}")
