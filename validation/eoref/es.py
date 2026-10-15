"""2D electrostatics with diagonal anisotropic permittivity on scikit-fem (P1 or P2 Lagrange).

Conductors are Dirichlet sets: every DOF of an electrode area (field-free interior) or every DOF on a
zero-thickness electrode line. Outer boundary: natural (zero normal flux) unless dirichlet sides are given.
Per-unit-length energy with coordinates in um: W' = (eps0 / 2) int eps |grad phi|^2 dA (um factors cancel in 2D),
so C' = 2 W' / V^2 in F/m with V = 1 V terminal difference (signal 1 V, grounds 0 V).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.constants import c as C_LIGHT
from scipy.constants import epsilon_0 as EPS0
from skfem import Basis, BilinearForm, ElementTriDG, ElementTriP0, ElementTriP1, ElementTriP2, condense
from skfem.helpers import grad


@dataclass
class ESResult:
    basis: Basis
    phi: np.ndarray
    energy_coeff: float  # int eps |grad phi|^2 dA (dimensionless, V = 1)

    @property
    def c_pul(self) -> float:
        return EPS0 * self.energy_coeff


@BilinearForm
def _lap(u, v, w):
    gu, gv = grad(u), grad(v)
    return w.exx * gu[0] * gv[0] + w.eyy * gu[1] * gv[1]


def solve_es(mesh, exx: np.ndarray, eyy: np.ndarray, dirichlet: dict[str, tuple[np.ndarray, float]], order: int = 2) -> ESResult:
    """dirichlet: name -> (dof array, potential)."""
    basis = Basis(mesh, ElementTriP2() if order == 2 else ElementTriP1())
    b0 = basis.with_element(ElementTriP0())
    K = _lap.assemble(basis, exx=b0.interpolate(exx), eyy=b0.interpolate(eyy)).tocsr()
    x = np.zeros(basis.N)
    D_all = []
    for dofs, val in dirichlet.values():
        x[dofs] = val
        D_all.append(np.asarray(dofs, dtype=np.int64))
    D = np.unique(np.concatenate(D_all))
    Kc, fc, xc, free = condense(K, np.zeros(basis.N), x=x, D=D)
    # CG with smoothed-aggregation AMG (pyamg): low memory; converged to a tight residual and checked below
    import pyamg

    Kc = Kc.tocsr()
    ml = pyamg.smoothed_aggregation_solver(Kc, symmetry="symmetric", max_coarse=2000)
    resid: list[float] = []
    xi = ml.solve(fc, tol=1e-13, accel="cg", maxiter=2000, residuals=resid)
    rel = float(np.linalg.norm(fc - Kc @ xi) / np.linalg.norm(fc))
    if rel > 1e-10:
        raise RuntimeError(f"AMG-CG did not converge: relative residual {rel:.2e} after {len(resid)} iterations")
    phi = x.copy()
    phi[free] = xi
    energy = float(phi @ (K @ phi))
    return ESResult(basis, phi, energy)


def line_params(c: float, c0: float) -> dict[str, float]:
    return {
        "C_pF_per_m": c * 1e12,
        "C0_pF_per_m": c0 * 1e12,
        "n_rf": float(np.sqrt(c / c0)),
        "Z0_ohm": float(1.0 / (C_LIGHT * np.sqrt(c * c0))),
    }


def grad_dg(res: ESResult) -> tuple[Basis, np.ndarray, np.ndarray]:
    """Exact gradient of the P2 (P1) potential as a discontinuous P1 (P0) field: returns (basis_dg, dphi/dx, dphi/dy)."""
    deg = 1 if isinstance(res.basis.elem, ElementTriP2) else 0
    bdg = res.basis.with_element(ElementTriDG(ElementTriP1()) if deg == 1 else ElementTriP0())
    g = res.basis.interpolate(res.phi).grad
    gx = bdg.project(g[0])
    gy = bdg.project(g[1])
    return bdg, gx, gy


def find_cells(mesh, pts: np.ndarray, k: int = 12) -> np.ndarray:
    """Containing triangle for each point (2, N): KD-tree on centroids, barycentric test on k candidates.

    (skfem's MeshTri.element_finder evaluates all candidates against all points at once, O(N^2) memory.)
    """
    from scipy.spatial import cKDTree

    p, t = mesh.p, mesh.t
    tree = cKDTree(p[:, t].mean(axis=1).T)
    out = -np.ones(pts.shape[1], dtype=np.int64)
    todo = np.arange(pts.shape[1])
    kk = k
    while todo.size and kk <= 512:
        _, cand = tree.query(pts[:, todo].T, kk)
        a, b, c = p[:, t[0, cand]], p[:, t[1, cand]], p[:, t[2, cand]]  # (2, n, kk)
        x = pts[:, todo][:, :, None]
        det = (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])
        l1 = ((x[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (x[1] - a[1])) / det
        l2 = ((b[0] - a[0]) * (x[1] - a[1]) - (x[0] - a[0]) * (b[1] - a[1])) / det
        tol = -1e-10
        inside = (l1 >= tol) & (l2 >= tol) & (1 - l1 - l2 >= tol)
        ok = inside.any(axis=1)
        out[todo[ok]] = cand[ok, inside[ok].argmax(axis=1)]
        todo = todo[~ok]
        kk *= 4
    if todo.size:
        raise ValueError(f"{todo.size} points outside the mesh")
    return out


def probe_matrix(basis: Basis, pts: np.ndarray, cells: np.ndarray):
    """Same construction as skfem CellBasis.probes, with externally located cells."""
    from scipy.sparse import coo_matrix

    loc = basis.mapping.invF(pts[:, :, np.newaxis], tind=cells)
    phis = np.array([basis.elem.gbasis(basis.mapping, loc, j, tind=cells)[0] for j in range(basis.Nbfun)]).flatten()
    rows = np.tile(np.arange(pts.shape[1], dtype=np.int64), basis.Nbfun)
    cols = basis.element_dofs[:, cells].flatten()
    return coo_matrix((phis, (rows, cols)), shape=(pts.shape[1], basis.N)).tocsr()


def static_field_at(bdg: Basis, gx: np.ndarray, gy: np.ndarray, pts: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """E = -grad phi at points pts (2, N), in V/um for 1 V."""
    cells = find_cells(bdg.mesh, pts)
    P = probe_matrix(bdg, pts, cells)
    return -(P @ gx), -(P @ gy)
