"""Mode solve of a case's optical window with the vector FEM (eoref.fmode)."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from . import fmode as FM
from . import geom as G
from . import materials as M

# library key per material name for the dispersion, and how to fill the lab-frame diagonal
# x-cut LN, propagation along crystal y, lab x = crystal z: exx = n_e^2, eyy = ezz = n_o^2
OPTICAL = {
    "silicon": ("si", "si", "si"),
    "silicon_dioxide": ("sio2", "sio2", "sio2"),
    "lithium_niobate": ("ln_e", "ln_o", "ln_o"),
}


def eps_diag(material: str, lam_um: float) -> tuple[float, float, float]:
    if material == "air":
        return (1.0, 1.0, 1.0)
    keys = OPTICAL[material]
    return tuple(float(M.n_of(k, lam_um)) ** 2 for k in keys)  # type: ignore[return-value]


def epsg_diag(material: str, lam_um: float) -> tuple[float, float, float]:
    """d(omega eps)/d omega = n (2 n_g,mat - n) per component."""
    if material == "air":
        return (1.0, 1.0, 1.0)
    out = []
    for k in OPTICAL[material]:
        n = float(M.n_of(k, lam_um))
        ngm = n - lam_um * M.dn_dlambda(k, lam_um)
        out.append(n * (2 * ngm - n))
    return tuple(out)  # type: ignore[return-value]


CORNER_H_UM = 0.0005  # 0.5 nm = h/80 at h = 40 nm (audit R1: h/80 and h/320 differ by 4e-9 in K2 n_eff)


@dataclass
class OptMesh:
    mr: G.MeshResult
    shift_x: float


def optical_mesh(case: dict, window: dict, h_core: float, core_box: tuple, slab_labels: tuple[str, ...] = (),
                 hmax: float = 0.3, grade: float = 0.2, shift_x: float = 0.0, half: bool = True,
                 corner_labels: tuple[str, ...] = ("core", "ln_rib", "ln_rib_a", "ln_rib_b")) -> OptMesh:
    """half=True: mesh only x >= shift_x (mirror plane through the rib/core centre). With PEC on every
    boundary this is the exact TE (E_x even, E_y and E_z odd) symmetric sub-problem; it halves memory."""
    geom = case["geometry"]
    w = dict(window)
    if half:
        w = {"x_um": [shift_x, window["x_um"][1]], "y_um": window["y_um"]}
    layout = G.build_layout(geom, clip=G.window_polygon(w), electrodes="absent", shift_x=shift_x)
    bx, by = core_box
    rules = [G.SizeRule("box", h_core, grade, hmax, x=bx, y=by)]
    if slab_labels:
        rules.append(G.SizeRule("curves", 2.5 * h_core, grade, hmax, labels=slab_labels))
    # corner refinement (field singularities at the core/rib corners limit the convergence order otherwise).
    # Fixed absolute corner size (audit R1): the corner error stays constant across levels instead of scaling with h.
    corners = []
    for p in layout.pieces:
        if p.label in corner_labels:
            for poly in getattr(p.geom, "geoms", [p.geom]):
                corners += [c for c in list(poly.exterior.coords)[:-1]]
    if corners:
        rules.append(G.SizeRule("points", CORNER_H_UM, grade, hmax, pts=tuple(corners)))
    mr = G.mesh_layout(layout, rules, hmax=hmax)
    return OptMesh(mr, shift_x)


def eps_arrays(om: OptMesh, lam_um: float, fn=eps_diag) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    cache = {m: fn(m, lam_um) for m in set(om.mr.materials)}
    arr = np.array([cache[m] for m in om.mr.materials])
    return arr[:, 0].copy(), arr[:, 1].copy(), arr[:, 2].copy()


def solve_te0(om: OptMesh, lam_um: float, n_guess: float, num_modes: int = 6, order: int = 2):
    exx, eyy, ezz = eps_arrays(om, lam_um)
    ms = FM.solve_modes(om.mr.mesh, exx, eyy, ezz, lam_um, num_modes=num_modes, n_guess=n_guess, order=order, pec=True)
    info = [(m.n_eff, FM.te_fraction(m)) for m in ms]
    te = [m for m in ms if FM.te_fraction(m) > 0.5]
    if not te:
        raise RuntimeError(f"no TE mode found: {info}")
    return te[0], info


def power_fraction(m: FM.VMode, elem_mask: np.ndarray) -> float:
    f = m.fields_qp()
    pz = np.real(f["ex"] * np.conj(f["hy"]) - f["ey"] * np.conj(f["hx"]))
    q = FM.elem_mask_qp(m.basis, elem_mask)
    return float(np.sum(pz * q * m.basis.dx) / np.sum(pz * m.basis.dx))
