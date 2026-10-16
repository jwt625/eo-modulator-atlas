"""Silicon device-physics inputs for the S8 references (DevLog-040): constants, Masetti mobility, doping helpers,
tensor-product grids. Units: cm, V, s, A, C, cm^-3 unless a name says otherwise.

Every coefficient carries its locator (read by lane T5 from the PDFs in references/_inbox/):
- n_i = 1.00e10 cm^-3 at 300 K: Sproul and Green, J. Appl. Phys. 70, 846 (1991), Introduction p. 846, Table II
  p. 852 (300 K, saturation-current method, 1.00(3) x 1e10), conclusions p. 853 (the abstract gives no number).
- Masetti, Severi, Solmi, IEEE TED 30, 764 (1983): electrons eq. (1) p. 765 with the phosphorus column of Table I
  p. 766; holes eq. (4) p. 767 with the boron column of Table I. Masetti p. 767 takes mu0, mumax, C_r, alpha, P_c at
  300 K from his ref. [13] (Thurber et al., J. Electrochem. Soc. 127, 2291 (1980), doi 10.1149/1.2129394, not read:
  paywalled); the same authors' NBS Special Publication 400-64 (1981), doi 10.6028/nbs.sp.400-64, Table 13 (report
  p. 40), 300 K, gives A 44.9, p_c 9.23e16, mu_max 470.5, p_ref 2.23e17, alpha 0.719 +- 0.013 (read from the page
  image 2026-10-16), confirming the partly lost glyph. beta 2.00 is Masetti's own fit (scan glyph partly lost).
  Evaluated at N = N_A + N_D (total doping).
- SRH: Shockley and Read, Phys. Rev. 87, 835 (1952), eq. (4.4) p. 837 divided by C_n C_p, with eq. (5.4) p. 838
  tau_p0 = 1/C_p, tau_n0 = 1/C_n (C already contains the trap density); midgap trap n1 = p1 = n_i.
- Caughey and Thomas, Proc. IEEE 55, 2192 (1967), Table II p. 2193 (field dependence; used only as a post-hoc check).
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

Q = 1.602176634e-19  # C (SI 2019 exact)
KB = 1.380649e-23  # J/K (SI 2019 exact)
EPS0_F_PER_CM = 8.8541878188e-14  # F/cm (CODATA 2022: 8.8541878188e-12 F/m)
T_K = 300.0
VT = KB * T_K / Q
NI = 1.00e10  # cm^-3, Sproul and Green 1991 Table II, 300 K

MASETTI = {
    "electron_phosphorus": {"mu0": 68.5, "mumax": 1414.0, "mu1": 56.1, "Cr": 9.20e16, "Cs": 3.41e20,
                            "alpha": 0.711, "beta": 1.98, "Pc": 0.0,
                            "locator": "Masetti 1983 eq. (1) p. 765, Table I p. 766 phosphorus column"},
    "hole_boron": {"mu0": 44.9, "mumax": 470.5, "mu1": 29.0, "Cr": 2.23e17, "Cs": 6.10e20,
                   "alpha": 0.719, "beta": 2.00, "Pc": 9.23e16,
                   "locator": "Masetti 1983 eq. (4) p. 767, Table I p. 766 boron column; alpha 0.719 (+-0.013), mu0, "
                              "mumax, C_r, P_c confirmed in Thurber et al. NBS SP 400-64 (1981) Table 13 p. 40, 300 K; "
                              "beta 2.00 read from a partly lost scan glyph"},
}

CAUGHEY_THOMAS = {
    "electron": {"vm_cm_s": 1.1e7, "Ec_V_cm": 8e3, "beta": 2.0},
    "hole": {"vm_cm_s": 9.5e6, "Ec_V_cm": 1.95e4, "beta": 1.0},
    "locator": "Caughey and Thomas 1967 Table II p. 2193, eq. (2) and the chord mobility mu = v/E",
}


def mu_electron(N):
    """Masetti eq. (1): mu_n = mu0 + (mumax - mu0)/(1 + (N/Cr)^alpha) - mu1/(1 + (Cs/N)^beta), cm^2/Vs."""
    p = MASETTI["electron_phosphorus"]
    N = np.maximum(np.asarray(N, dtype=float), 1.0)
    return p["mu0"] + (p["mumax"] - p["mu0"]) / (1 + (N / p["Cr"]) ** p["alpha"]) - p["mu1"] / (1 + (p["Cs"] / N) ** p["beta"])


def mu_hole(N):
    """Masetti eq. (4): mu_p = mu0 exp(-Pc/N) + mumax/(1 + (N/Cr)^alpha) - mu1/(1 + (Cs/N)^beta), cm^2/Vs."""
    p = MASETTI["hole_boron"]
    N = np.maximum(np.asarray(N, dtype=float), 1.0)
    return p["mu0"] * np.exp(-p["Pc"] / N) + p["mumax"] / (1 + (N / p["Cr"]) ** p["alpha"]) - p["mu1"] / (1 + (p["Cs"] / N) ** p["beta"])


def masetti_devsim_expr(carrier: str, ntot: str = "TotalDoping") -> str:
    """Same formulas as DEVSIM symbolic expressions (node model)."""
    if carrier == "n":
        p = MASETTI["electron_phosphorus"]
        return (f"({p['mu0']} + ({p['mumax']} - {p['mu0']})/(1 + pow({ntot}/{p['Cr']:.6e}, {p['alpha']}))"
                f" - {p['mu1']}/(1 + pow({p['Cs']:.6e}/{ntot}, {p['beta']})))")
    p = MASETTI["hole_boron"]
    return (f"({p['mu0']}*exp(-{p['Pc']:.6e}/{ntot}) + {p['mumax']}/(1 + pow({ntot}/{p['Cr']:.6e}, {p['alpha']}))"
            f" - {p['mu1']}/(1 + pow({p['Cs']:.6e}/{ntot}, {p['beta']})))")


def ct_factor(mu0, E, carrier: str):
    """Caughey-Thomas chord-mobility factor mu(E)/mu0 = 1/(1 + (mu0 E / vm)^beta)^(1/beta) (E in V/cm)."""
    c = CAUGHEY_THOMAS["electron" if carrier == "n" else "hole"]
    b = c["beta"]
    return 1.0 / (1.0 + (np.asarray(mu0) * np.abs(E) / c["vm_cm_s"]) ** b) ** (1.0 / b)


def equilibrium_carriers(net):
    """Charge-neutral equilibrium n, p for net doping N_D - N_A (Boltzmann, complete ionisation)."""
    net = np.asarray(net, dtype=float)
    s = np.sqrt(0.25 * net * net + NI * NI)
    pos = net >= 0
    n = np.empty_like(net)
    n[pos] = 0.5 * net[pos] + s[pos]
    n[~pos] = NI * NI / (s[~pos] - 0.5 * net[~pos])
    p = NI * NI / n
    return n, p


def builtin_voltage(NA: float, ND: float) -> float:
    return VT * math.log(NA * ND / NI**2)


def depletion_closed_form(NA: float, ND: float, eps_r: float, V: float, two_vt: bool = False) -> dict:
    """Abrupt-junction depletion approximation (V = V_pn, reverse < 0). Returns W (cm) and C' (F/cm^2)."""
    eps = eps_r * EPS0_F_PER_CM
    vbi = builtin_voltage(NA, ND)
    vj = vbi - V - (2 * VT if two_vt else 0.0)
    W = math.sqrt(2 * eps * vj / Q * (1 / NA + 1 / ND))
    return {"Vbi": vbi, "W_cm": W, "C_F_cm2": eps / W, "xp_cm": W * ND / (NA + ND), "xn_cm": W * NA / (NA + ND)}


# ---------------------------------------------------------------------------------------------------------------
# piecewise-constant doping and grids


@dataclass
class DopingBox:
    """Uniform doping box (cm). kind 'donor' or 'acceptor'."""
    kind: str
    N: float
    x0: float
    x1: float
    y0: float = -1e30
    y1: float = 1e30


def doping_at(boxes: list[DopingBox], x, y=None):
    """(N_D, N_A) at points (half-open boxes [x0, x1) x [y0, y1); the last box listed wins on overlaps)."""
    x = np.asarray(x, dtype=float)
    y = np.zeros_like(x) if y is None else np.asarray(y, dtype=float)
    nd = np.zeros_like(x)
    na = np.zeros_like(x)
    for b in boxes:
        m = (x >= b.x0) & (x < b.x1) & (y >= b.y0) & (y < b.y1)
        if b.kind == "donor":
            nd = np.where(m, b.N, nd)
            na = np.where(m, 0.0, na)
        else:
            na = np.where(m, b.N, na)
            nd = np.where(m, 0.0, nd)
    return nd, na


def cell_average_doping_1d(boxes: list[DopingBox], xn: np.ndarray, y: float = 0.0):
    """Exact average of N_D and N_A over each node's box-method control interval [x_i - h_l/2, x_i + h_r/2]
    (x-steps only; evaluated at height y). Nodes on a doping step then carry the exact control-volume charge."""
    xn = np.asarray(xn, dtype=float)
    lo = np.empty_like(xn)
    hi = np.empty_like(xn)
    lo[0] = xn[0]
    hi[-1] = xn[-1]
    mid = 0.5 * (xn[1:] + xn[:-1])
    lo[1:] = mid
    hi[:-1] = mid
    bps = sorted({b.x0 for b in boxes} | {b.x1 for b in boxes})
    nd = np.zeros_like(xn)
    na = np.zeros_like(xn)
    for i in range(len(xn)):
        pts = [lo[i]] + [p for p in bps if lo[i] < p < hi[i]] + [hi[i]]
        L = hi[i] - lo[i]
        if L <= 0:
            d, a = doping_at(boxes, [xn[i]], [y])
            nd[i], na[i] = d[0], a[0]
            continue
        for a0, a1 in zip(pts[:-1], pts[1:], strict=True):
            d, a = doping_at(boxes, [0.5 * (a0 + a1)], [y])
            nd[i] += d[0] * (a1 - a0) / L
            na[i] += a[0] * (a1 - a0) / L
    return nd, na


def graded_line(a: float, b: float, h_a: float, h_b: float, h_max: float, ratio: float = 1.25) -> np.ndarray:
    """Points from a to b (a < b): spacing h_a at a and h_b at b, growing geometrically (factor `ratio`) towards h_max,
    uniform middle part. A leftover shorter than the adjacent spacings is absorbed by stretching all spacings
    proportionally, so neighbouring spacings never differ by more than ~max(ratio, 1.5)."""
    L = b - a

    def run(h0):
        out = [h0]
        while out[-1] * ratio < h_max:
            out.append(out[-1] * ratio)
        return out

    la, lb = run(h_a), run(h_b)
    while la and lb and sum(la) + sum(lb) > L:
        (la if la[-1] >= lb[-1] else lb).pop()
    if not la or not lb:
        k = max(1, int(round(L / max(h_a, h_b))))
        return np.linspace(a, b, k + 1)
    gap = L - sum(la) - sum(lb)
    target = min(h_max, ratio * max(la[-1], lb[-1]))
    edge = max(la[-1], lb[-1])
    if gap < edge:
        sp = la + lb[::-1]
        f = L / sum(sp)
        sp = [v * f for v in sp]
    else:
        k = max(1, int(round(gap / target)))
        if gap / k > 1.5 * target:
            k += 1
        sp = la + [gap / k] * k + lb[::-1]
    pts = a + np.concatenate([[0.0], np.cumsum(sp)])
    pts[-1] = b
    return pts


def uniform_line(a: float, b: float, h: float) -> np.ndarray:
    k = max(1, int(round((b - a) / h)))
    return np.linspace(a, b, k + 1)


def join_lines(*segs: np.ndarray) -> np.ndarray:
    out = np.concatenate(segs)
    out = np.unique(np.round(out, 14))
    return out
