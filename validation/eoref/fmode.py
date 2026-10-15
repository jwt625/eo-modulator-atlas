"""Full-vector FEM waveguide modes with diagonal anisotropic permittivity (scikit-fem, Nedelec + Lagrange).

Formulation: the femwell `compute_modes` form (Vardapetyan-Demkowicz type, eigenvalue beta^2, e_z scaled by
i beta / k0^2), re-derived for a diagonal tensor eps = diag(exx, eyy, ezz):
  (1/k0^2) curl e_t curl v_t - eps_t e_t . v_t + grad e_z . v_t + eps_t e_t . grad v_z - k0^2 ezz e_z v_z
      = beta^2 (-(1/k0^2) e_t . v_t)
Row v_t is the transverse curl-curl equation; row v_z is Gauss's law div(eps E) = 0. For isotropic eps it is
identical to femwell 0.1.12 `compute_modes`, which is used as a cross-check (scripts/ref_modes_fem.py, gates.py).
Field convention exp(i (beta z - omega t)); lengths in um; H' = Z0 H = -i curl E / k0 (same length units).
Power P' = 1/2 Re int (E x H'*) . z dA, so that
  delta n_eff = int E* . delta eps_r . E dA / (4 P')   (equals (c eps0 / 4P) int E* . d eps . E dA in SI)
  n_g = int (eps_g |E|^2 + |H'|^2) dA / (4 P'),  eps_g = d(omega eps)/d omega  (energy velocity, lossless)
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import scipy.sparse.linalg as spla
from skfem import Basis, BilinearForm, ElementTriN1, ElementTriN2, ElementTriP0, ElementTriP1, ElementTriP2
from skfem.helpers import curl, dot, grad


@dataclass
class VMode:
    n_eff: float
    beta: float
    k0: float
    basis: Basis
    x: np.ndarray  # solution vector (e_t, e_z scaled back to true E_z)
    eps: tuple[np.ndarray, np.ndarray, np.ndarray]  # per-element exx, eyy, ezz
    power: float = 0.0  # P' before normalisation (normalised modes have P' = 1)

    def fields_qp(self) -> dict[str, np.ndarray]:
        """E and H' components at the quadrature points, shape (nelem, nqp)."""
        (et, ez) = self.basis.interpolate(self.x)
        ex, ey = et.value[0], et.value[1]
        ezv = ez.value
        dzx, dzy = ez.grad[0], ez.grad[1]
        ce = curl(et)
        b, k0 = self.beta, self.k0
        hx = (-1j * dzy - b * ey) / k0
        hy = (b * ex + 1j * dzx) / k0
        hz = -1j * ce / k0
        return {"ex": ex, "ey": ey, "ez": ezv, "hx": hx, "hy": hy, "hz": hz}


def _forms(k0: float):
    @BilinearForm
    def aform(e_t, e_z, v_t, v_z, w):
        gz = grad(v_z)
        return (
            curl(e_t) * curl(v_t) / k0**2
            - (w.exx * e_t[0] * v_t[0] + w.eyy * e_t[1] * v_t[1])
            + dot(grad(e_z), v_t)
            + (w.exx * e_t[0] * gz[0] + w.eyy * e_t[1] * gz[1])
            - w.ezz * e_z * v_z * k0**2
        )

    @BilinearForm
    def bform(e_t, e_z, v_t, v_z, w):
        return -dot(e_t, v_t) / k0**2

    return aform, bform


def p0(basis: Basis, values: np.ndarray) -> np.ndarray:
    """Interpolate per-element constants onto quadrature points."""
    b0 = basis.with_element(ElementTriP0())
    return b0.interpolate(values)


def solve_modes(
    mesh,
    exx: np.ndarray,
    eyy: np.ndarray,
    ezz: np.ndarray,
    wavelength_um: float,
    num_modes: int = 6,
    n_guess: float | None = None,
    order: int = 2,
    pec: bool | np.ndarray = True,
) -> list[VMode]:
    k0 = 2 * np.pi / wavelength_um
    elem = ElementTriN2() * ElementTriP2() if order == 2 else ElementTriN1() * ElementTriP1()
    basis = Basis(mesh, elem)
    b0 = basis.with_element(ElementTriP0())
    w = {"exx": b0.interpolate(exx), "eyy": b0.interpolate(eyy), "ezz": b0.interpolate(ezz)}
    aform, bform = _forms(k0)
    A = aform.assemble(basis, **w)
    B = bform.assemble(basis)
    if n_guess is None:
        n_guess = float(np.sqrt(max(exx.max(), eyy.max(), ezz.max())))
    sigma = k0**2 * n_guess**2
    if pec is True:
        D = basis.get_dofs()
    elif pec is False:
        D = np.array([], dtype=np.int64)
    else:
        D = pec
    D = np.asarray(D.flatten() if hasattr(D, "flatten") else D, dtype=np.int64)
    free = np.setdiff1d(np.arange(basis.N), D)
    Ai = (-A)[free][:, free].tocsc()
    Bi = (-B)[free][:, free].tocsc()
    del A, B
    # shift-invert with the MMD_AT_PLUS_A fill-reducing ordering (A is structurally symmetric but not symmetric:
    # grad e_z . v_t vs eps_t e_t . grad v_z); general eigs is used. Far less LU fill than the default ordering.
    lu = spla.splu((Ai - sigma * Bi).tocsc(), permc_spec="MMD_AT_PLUS_A")
    opinv = spla.LinearOperator(Ai.shape, matvec=lu.solve, dtype=float)
    lams, xs = spla.eigs(Ai, k=num_modes, M=Bi, sigma=sigma, which="LM", OPinv=opinv)
    del lu, Ai, Bi, opinv
    lams = np.real(lams)
    xs = np.real_if_close(xs)
    order_idx = np.argsort(-lams)
    out: list[VMode] = []
    iz = basis.split_indices()[1]
    for j in order_idx:
        lam = lams[j]
        if lam <= 0:
            continue
        beta = float(np.sqrt(lam))
        x = np.zeros(basis.N, dtype=complex)
        x[free] = xs[:, j]
        # undo e_z scaling: stored e_z = i beta E_z / k0^2
        x[iz] /= 1j * beta / k0**2
        m = VMode(n_eff=beta / k0, beta=beta, k0=k0, basis=basis, x=x, eps=(exx, eyy, ezz))
        P = power(m)
        if P < 0:
            x *= -1  # cannot flip power sign by scaling; keep for diagnostics
        m.power = P
        m.x = x / np.sqrt(abs(P))
        out.append(m)
    return out


def _integrate(basis: Basis, integrand: np.ndarray) -> complex:
    """Integrate an array given at quadrature points (nelem, nqp)."""
    return complex(np.sum(integrand * basis.dx))


def power(m: VMode) -> float:
    f = m.fields_qp()
    pz = f["ex"] * np.conj(f["hy"]) - f["ey"] * np.conj(f["hx"])
    return 0.5 * float(np.real(_integrate(m.basis, pz)))


def te_fraction(m: VMode) -> float:
    f = m.fields_qp()
    a = np.real(_integrate(m.basis, np.abs(f["ex"]) ** 2))
    b = np.real(_integrate(m.basis, np.abs(f["ey"]) ** 2))
    return float(a / (a + b))


def group_index_energy(m: VMode, epsg: tuple[np.ndarray, np.ndarray, np.ndarray]) -> float:
    """n_g = int (eps_g |E|^2 + |H'|^2) / (4 P'); epsg = per-element d(omega eps)/d omega (xx, yy, zz)."""
    f = m.fields_qp()
    b0 = m.basis.with_element(ElementTriP0())
    gx, gy, gz = (b0.interpolate(v).value for v in epsg)
    e2 = gx * np.abs(f["ex"]) ** 2 + gy * np.abs(f["ey"]) ** 2 + gz * np.abs(f["ez"]) ** 2
    h2 = np.abs(f["hx"]) ** 2 + np.abs(f["hy"]) ** 2 + np.abs(f["hz"]) ** 2
    num = np.real(_integrate(m.basis, e2 + h2))
    return float(num / (4.0 * power(m)))


def perturbation_dneff(m: VMode, deps: dict[str, np.ndarray]) -> float:
    """delta n_eff = int E* . d eps . E dA / (4 P'), d eps given at quadrature points by components
    'xx','yy','zz','xy','xz','yz' (symmetric, real)."""
    return perturbation_from_fields(m.fields_qp(), m.basis.dx, deps)


def perturbation_from_fields(f: dict[str, np.ndarray], dx: np.ndarray, deps: dict[str, np.ndarray]) -> float:
    ex, ey, ez = f["ex"], f["ey"], f["ez"]
    s = 0.0
    if "xx" in deps:
        s = s + deps["xx"] * np.abs(ex) ** 2
    if "yy" in deps:
        s = s + deps["yy"] * np.abs(ey) ** 2
    if "zz" in deps:
        s = s + deps["zz"] * np.abs(ez) ** 2
    if "xy" in deps:
        s = s + deps["xy"] * 2 * np.real(np.conj(ex) * ey)
    if "xz" in deps:
        s = s + deps["xz"] * 2 * np.real(np.conj(ex) * ez)
    if "yz" in deps:
        s = s + deps["yz"] * 2 * np.real(np.conj(ey) * ez)
    pz = 0.5 * np.real(np.sum((ex * np.conj(f["hy"]) - ey * np.conj(f["hx"])) * dx))
    return float(np.real(np.sum(s * dx)) / (4.0 * pz))


def quad_points(basis: Basis) -> np.ndarray:
    """Global coordinates of quadrature points, shape (2, nelem, nqp)."""
    return basis.mapping.F(basis.X)


def elem_mask_qp(basis: Basis, mask: np.ndarray) -> np.ndarray:
    return np.repeat(mask[:, None].astype(float), basis.X.shape[1], axis=1)
