"""Independent 1D steady-state drift-diffusion solver (lane T5, DevLog-040), written from the equations.

Box method on nodes x_0..x_N (cm); unknowns psi (V), u = ln(n/n_i), v = ln(p/n_i). Interior node i, cell
V_i = (h_{i-1} + h_i)/2:
  Poisson   eps [(psi_{i+1}-psi_i)/h_i - (psi_i-psi_{i-1})/h_{i-1}] + q (p_i - n_i + N_D,i - N_A,i) V_i = 0
  electrons J_n,i+1/2 - J_n,i-1/2 - q R_i V_i = 0          (dJ_n/dx = q R)
  holes     J_p,i+1/2 - J_p,i-1/2 + q R_i V_i = 0          (dJ_p/dx = -q R)
Scharfetter-Gummel fluxes, d = (psi_{i+1} - psi_i)/V_t, B(x) = x/(e^x - 1):
  J_n = q mu_n V_t / h (n_{i+1} B(d) - n_i B(-d)),  J_p = q mu_p V_t / h (p_i B(d) - p_{i+1} B(-d))
Edge mobility = mean of the two node values (Masetti of the node total doping). SRH as in eoref.semi.
Ohmic contacts at both ends: charge-neutral equilibrium n, p and psi = V_contact + V_t ln(n_eq/n_i).
Newton with update limiting, bias ramping with step halving.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla

from . import semi as S


def bern(x):
    x = np.asarray(x, dtype=float)
    out = np.empty_like(x)
    small = np.abs(x) < 1e-4
    xs = x[small]
    out[small] = 1 - xs / 2 + xs * xs / 12
    xl = x[~small]
    out[~small] = xl / np.expm1(xl)
    return out


def dbern(x):
    x = np.asarray(x, dtype=float)
    out = np.empty_like(x)
    small = np.abs(x) < 1e-4
    xs = x[small]
    out[small] = -0.5 + xs / 6
    xl = x[~small]
    em = np.expm1(xl)
    out[~small] = (em - xl * (em + 1)) / (em * em)
    return out


@dataclass
class Device1D:
    x: np.ndarray  # cm
    nd: np.ndarray  # cm^-3 (node / control-volume average)
    na: np.ndarray
    eps_r: float = 11.7
    tau_n: float = 1e-5
    tau_p: float = 1e-5
    mun: np.ndarray = field(init=False)
    mup: np.ndarray = field(init=False)

    def __post_init__(self):
        ntot = self.nd + self.na
        self.mun = 0.5 * (S.mu_electron(ntot)[1:] + S.mu_electron(ntot)[:-1])
        self.mup = 0.5 * (S.mu_hole(ntot)[1:] + S.mu_hole(ntot)[:-1])
        self.h = np.diff(self.x)
        self.vol = np.zeros_like(self.x)
        self.vol[1:] += 0.5 * self.h
        self.vol[:-1] += 0.5 * self.h
        self.net = self.nd - self.na
        self.neq, self.peq = S.equilibrium_carriers(self.net)
        self.eps = self.eps_r * S.EPS0_F_PER_CM


@dataclass
class State:
    psi: np.ndarray
    u: np.ndarray
    v: np.ndarray
    va: float  # anode (x_0) bias
    vc: float  # cathode (x_N) bias

    @property
    def n(self):
        return S.NI * np.exp(self.u)

    @property
    def p(self):
        return S.NI * np.exp(self.v)


def _residual_jacobian(d: Device1D, st: State, poisson_only: bool = False):
    N = len(d.x)
    psi, u, v = st.psi, st.u, st.v
    n, p = S.NI * np.exp(u), S.NI * np.exp(v)
    h = d.h
    dl = np.diff(psi) / S.VT
    Bp, Bm = bern(dl), bern(-dl)
    dBp, dBm = dbern(dl), dbern(-dl)
    Kn = S.Q * d.mun * S.VT / h
    Kp = S.Q * d.mup * S.VT / h
    Jn = Kn * (n[1:] * Bp - n[:-1] * Bm)
    Jp = Kp * (p[:-1] * Bp - p[1:] * Bm)
    D = d.tau_p * (n + S.NI) + d.tau_n * (p + S.NI)
    R = (n * p - S.NI**2) / D
    dR_dn = (p * D - (n * p - S.NI**2) * d.tau_p) / D**2
    dR_dp = (n * D - (n * p - S.NI**2) * d.tau_n) / D**2
    dR_du = dR_dn * n
    dR_dv = dR_dp * p

    rows, cols, vals = [], [], []

    def add(r, c, val):
        rows.append(r)
        cols.append(c)
        vals.append(val)

    I = np.arange(1, N - 1)  # noqa: E741
    iP, iU, iV = 0, N, 2 * N
    # Poisson
    flux = d.eps * np.diff(psi) / h  # edge flux eps dpsi/dx
    Fpsi = np.zeros(N)
    Fpsi[I] = flux[I] - flux[I - 1] + S.Q * (p[I] - n[I] + d.net[I]) * d.vol[I]
    add(iP + I, iP + I + 1, d.eps / h[I])
    add(iP + I, iP + I - 1, d.eps / h[I - 1])
    add(iP + I, iP + I, -d.eps / h[I] - d.eps / h[I - 1])
    if poisson_only:
        # Boltzmann with the quasi-Fermi levels fixed at 0: n = n_i exp(psi/Vt), p = n_i exp(-psi/Vt)
        add(iP + I, iP + I, -S.Q * (p[I] + n[I]) / S.VT * d.vol[I])
    else:
        add(iP + I, iU + I, -S.Q * n[I] * d.vol[I])
        add(iP + I, iV + I, S.Q * p[I] * d.vol[I])
    # contacts: psi fixed
    for k, vb in ((0, st.va), (N - 1, st.vc)):
        Fpsi[k] = psi[k] - (vb + S.VT * np.log(d.neq[k] / S.NI))
        add(iP + k, iP + k, 1.0)

    Fu = np.zeros(N)
    Fv = np.zeros(N)
    if poisson_only:
        Fu[:] = u - psi / S.VT
        Fv[:] = v + psi / S.VT
        add(iU + np.arange(N), iU + np.arange(N), np.ones(N))
        add(iU + np.arange(N), iP + np.arange(N), -np.ones(N) / S.VT)
        add(iV + np.arange(N), iV + np.arange(N), np.ones(N))
        add(iV + np.arange(N), iP + np.arange(N), np.ones(N) / S.VT)
    else:
        Fu[I] = Jn[I] - Jn[I - 1] - S.Q * R[I] * d.vol[I]
        Fv[I] = Jp[I] - Jp[I - 1] + S.Q * R[I] * d.vol[I]
        # dJn_e / d(u_i, u_i+1, psi_i, psi_i+1) for edge e = (i, i+1)
        e = np.arange(N - 1)
        dJn_du0 = -Kn * n[:-1] * Bm
        dJn_du1 = Kn * n[1:] * Bp
        dJn_dpsi1 = Kn * (n[1:] * dBp + n[:-1] * dBm) / S.VT
        dJp_dv0 = Kp * p[:-1] * Bp
        dJp_dv1 = -Kp * p[1:] * Bm
        dJp_dpsi1 = Kp * (p[:-1] * dBp + p[1:] * dBm) / S.VT
        for sign, eidx, node_rows in ((+1, I, I), (-1, I - 1, I)):
            # + J_{i+1/2} (edge i: nodes i, i+1); - J_{i-1/2} (edge i-1: nodes i-1, i)
            n0 = e[eidx]
            add(iU + node_rows, iU + n0, sign * dJn_du0[eidx])
            add(iU + node_rows, iU + n0 + 1, sign * dJn_du1[eidx])
            add(iU + node_rows, iP + n0 + 1, sign * dJn_dpsi1[eidx])
            add(iU + node_rows, iP + n0, -sign * dJn_dpsi1[eidx])
            add(iV + node_rows, iV + n0, sign * dJp_dv0[eidx])
            add(iV + node_rows, iV + n0 + 1, sign * dJp_dv1[eidx])
            add(iV + node_rows, iP + n0 + 1, sign * dJp_dpsi1[eidx])
            add(iV + node_rows, iP + n0, -sign * dJp_dpsi1[eidx])
        add(iU + I, iU + I, -S.Q * dR_du[I] * d.vol[I])
        add(iU + I, iV + I, -S.Q * dR_dv[I] * d.vol[I])
        add(iV + I, iU + I, S.Q * dR_du[I] * d.vol[I])
        add(iV + I, iV + I, S.Q * dR_dv[I] * d.vol[I])
        for k in (0, N - 1):
            Fu[k] = u[k] - np.log(d.neq[k] / S.NI)
            Fv[k] = v[k] - np.log(d.peq[k] / S.NI)
            add(iU + k, iU + k, 1.0)
            add(iV + k, iV + k, 1.0)
    F = np.concatenate([Fpsi, Fu, Fv])
    r = np.concatenate([np.atleast_1d(a).ravel() for a in rows])
    c = np.concatenate([np.atleast_1d(a).ravel() for a in cols])
    vv = np.concatenate([np.atleast_1d(a).ravel() for a in vals])
    Jm = sp.csc_matrix((vv, (r, c)), shape=(3 * N, 3 * N))
    return F, Jm, {"Jn": Jn, "Jp": Jp, "R": R}


def newton(d: Device1D, st: State, poisson_only=False, tol=1e-12, maxit=60, max_dpsi=0.5, max_du=5.0):
    N = len(d.x)
    for it in range(maxit):
        F, Jm, _ = _residual_jacobian(d, st, poisson_only)
        # row equilibration (does not change the Newton step in exact arithmetic)
        rs = np.asarray(abs(Jm).max(axis=1).todense()).ravel()
        rs[rs == 0] = 1.0
        Dr = sp.diags(1.0 / rs)
        dz = -spla.spsolve((Dr @ Jm).tocsc(), Dr @ F)
        dpsi, du, dv = dz[:N], dz[N:2 * N], dz[2 * N:]
        s = 1.0
        mp = np.max(np.abs(dpsi))
        mu_ = max(np.max(np.abs(du)), np.max(np.abs(dv)))
        if mp > max_dpsi:
            s = min(s, max_dpsi / mp)
        if mu_ > max_du:
            s = min(s, max_du / mu_)
        st.psi = st.psi + s * dpsi
        st.u = st.u + s * du
        st.v = st.v + s * dv
        if s == 1.0 and mp < tol and mu_ < tol * 1e2:
            return it + 1
    raise RuntimeError(f"Newton did not converge (|dpsi| {mp:.3e}, |du| {mu_:.3e})")


def equilibrium(d: Device1D) -> State:
    psi0 = S.VT * np.log(d.neq / S.NI)
    st = State(psi=psi0.copy(), u=psi0 / S.VT, v=-psi0 / S.VT, va=0.0, vc=0.0)
    newton(d, st, poisson_only=True, tol=1e-13)
    newton(d, st, poisson_only=False)
    return st


def ramp(d: Device1D, st: State, va_target: float, step: float = 0.05, min_step: float = 1e-4) -> State:
    """Ramp the anode bias to va_target (cathode at 0)."""
    va = st.va
    h = step
    while abs(va_target - va) > 1e-15:
        nxt = va + np.sign(va_target - va) * min(h, abs(va_target - va))
        trial = State(st.psi.copy(), st.u.copy(), st.v.copy(), nxt, st.vc)
        try:
            newton(d, trial)
        except (RuntimeError, FloatingPointError, ValueError):
            h *= 0.5
            if h < min_step:
                raise
            continue
        st, va = trial, nxt
        h = min(step, h * 1.5)
    return st


def observables(d: Device1D, st: State) -> dict:
    _, _, aux = _residual_jacobian(d, st)
    n, p = st.n, st.p
    return {
        "Ne_tot_cm2": float(np.sum(n * d.vol)),
        "Nh_tot_cm2": float(np.sum(p * d.vol)),
        "J_total_A_cm2": float(np.median(aux["Jn"] + aux["Jp"])),
        "J_spread_A_cm2": float(np.ptp(aux["Jn"] + aux["Jp"])),
        "Jn": aux["Jn"],
        "Jp": aux["Jp"],
        "R": aux["R"],
    }
