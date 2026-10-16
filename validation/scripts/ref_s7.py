"""S7 references: traveling-wave EO response (uniform line) and the periodic T-rail (two-section) Bloch cell.

Independent of the engine (lane T2 S7-REF, DevLog-037). Derivation and equation tags S7.n: DevLog-037.
Sources: Alferness, IEEE TMTT 30, 1121 (1982), Sec. VI.B eqs. (18)-(22) (+ corrections TMTT 31, 315 (1983));
Shin, Sakamoto, Dagli, JLT 29, 48 (2011), eqs. (1)-(5), (8), (12).

Outputs: reference/s7-limits.json, reference/s7-K8.json, reference/s7-K9.json; log logs/ref-s7-YYYYMMDDTHHMM.log.
Run: ./run.sh scripts/ref_s7.py [--dry-run]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
import time
from pathlib import Path

import numpy as np
from scipy.constants import c as C0
from scipy.optimize import brentq, minimize_scalar

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eoref.util import Logger, max_rss_mb, versions  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference"
DB_PER_NP = 20.0 / math.log(10.0)  # 8.685889638 dB per neper (field amplitude)
H3 = 10.0 ** (-3.0 / 20.0)
H6 = 10.0 ** (-6.0 / 20.0)
GRID_GHZ = [0.1, 0.5] + [float(k) for k in range(1, 111)]

DEFINITIONS = {
    "convention": "phasor e^{+j omega t}; z = 0 at the RF input (source side), z = L at the load",
    "m": "m(f) = (1/(L V_s)) int_0^L eta(z) V(z) e^{j omega n_g z / c} dz / mean(eta) (V/V), V_s = open-circuit source voltage (S7.4, S7.5, S7.14)",
    "H": "H(f) = |m(f)| / m0, m0 = Z_L/(Z_S + Z_L) (DC limit with R'(0) = G'(0) = 0, S7.6)",
    "S21_EO_el_dB": "20 log10 H (electrical dB; detected RF power ~ |m|^2; signed, negative = drop; SPEC eo_rolloff_db sign convention)",
    "S21_EO_opt_dB": "10 log10 H (optical dB)",
    "bw3_el_ghz": "lowest f with H = 10^(-3/20) (first downward crossing; brentq on a 0.01 GHz bracket scan)",
    "bw6_el_ghz": "lowest f with H = 10^(-6/20) = 10^(-0.3); identical to the optical-dB 3 dB bandwidth",
    "alpha_db_per_cm": "8.686 x Re(gamma) [Np/cm] (field-amplitude attenuation, SPEC convention (cc))",
    "n_B": "Bloch index c Im(gamma_B)/omega, branch rule S7.11 (Re gamma_B >= 0, Im(gamma_B p) continuous from 0+)",
    "Z_B": "forward-wave Bloch impedance B/(e^{gamma_B p} - A) of the stated reference cell (S7.12); symmetric cell: B/sinh(gamma_B p)",
    "f_bragg_ghz": "lowest f > 0 with (A + D)/2 = -1 for the lossless cell (R' = G' = 0), lower edge of the first stopband (S7.13)",
    "cell": "symmetric reference cell T_u(l_u/2) T_l(l_l) T_u(l_u/2) unless stated; variant 'loaded_centred' = T_l(l_l/2) T_u(l_u) T_l(l_l/2)",
    "eo_cascade": "exact section-by-section integration over N = L/p cells with source/load terminations (S7.14), no Bloch homogenisation",
    "bloch_homogenised": "S7.5 evaluated with gamma_B, Z_B (symmetric cell) and n_g; comparison only",
    "U": "no discretisation: values are closed forms or exact cascades; reported U = max difference between independent evaluations (closed form vs cascade, two cell splits) plus brentq xtol",
}


# ---------------------------------------------------------------- uniform-line response (S7.5)


def phi(x: np.ndarray) -> np.ndarray:
    """(1 - e^{-x})/x with a series for small |x|."""
    x = np.asarray(x, dtype=complex)
    out = np.empty_like(x)
    small = np.abs(x) < 1e-4
    xs = x[small]
    out[small] = 1 - xs / 2 + xs**2 / 6 - xs**3 / 24
    xl = x[~small]
    out[~small] = -np.expm1(-xl) / xl
    return out


def refl(Z: complex | float, Zc: np.ndarray) -> np.ndarray:
    if np.isinf(Z):
        return np.ones_like(Zc, dtype=complex)
    return (Z - Zc) / (Z + Zc)


def m_uniform(f_ghz, gamma, Zc, Zs, Zl, ng, L):
    """Closed form S7.5. gamma [1/m], Zc [ohm] arrays over f; L [m]. Returns complex m (V/V)."""
    w = 2 * np.pi * np.asarray(f_ghz) * 1e9
    bo = w * ng / C0
    gs, gl = refl(Zs, Zc), refl(Zl, Zc)
    vp = Zc / (Zc + Zs) / (1 - gs * gl * np.exp(-2 * gamma * L))
    fwd = phi((gamma - 1j * bo) * L)
    bwd = gl * np.exp(-gamma * L + 1j * bo * L) * phi((gamma + 1j * bo) * L)
    return vp * (fwd + bwd)


def m0_dc(Zs, Zl) -> float:
    return 1.0 if np.isinf(Zl) else Zl / (Zs + Zl)


# ---------------------------------------------------------------- per-length models


def alpha_np_per_m(a0_db_cm_rtghz: float, f_ghz) -> np.ndarray:
    return a0_db_cm_rtghz * np.sqrt(np.asarray(f_ghz, dtype=float)) / DB_PER_NP * 100.0


def rlgc(f_ghz, Lp, Cp, r1, g_tan=0.0):
    """gamma, Zc of a uniform RLGC line: R'(f) = r1 sqrt(f/GHz) ohm/m, G' = omega C' tan_d."""
    f = np.asarray(f_ghz, dtype=float)
    w = 2 * np.pi * f * 1e9
    Zs = r1 * np.sqrt(f) + 1j * w * Lp
    Ys = w * Cp * g_tan + 1j * w * Cp
    gam = np.sqrt(Zs * Ys)
    gam = np.where(gam.real < 0, -gam, gam)
    Zc = np.sqrt(Zs / Ys)
    Zc = np.where(Zc.real < 0, -Zc, Zc)
    return gam, Zc


# ---------------------------------------------------------------- ABCD, Bloch (S7.8-S7.13)


def abcd(gam, Z, seg):
    ch, sh = np.cosh(gam * seg), np.sinh(gam * seg)
    return np.array([[ch, Z * sh], [sh / Z, ch]])  # shape (2, 2, nf)


def matmul(a, b):
    return np.einsum("ijf,jkf->ikf", a, b)


def cell_matrix(sec_u, sec_l, lu, ll, split="unloaded_centred"):
    (gu, Zu), (gl, Zl) = sec_u, sec_l
    if split == "unloaded_centred":
        return matmul(matmul(abcd(gu, Zu, lu / 2), abcd(gl, Zl, ll)), abcd(gu, Zu, lu / 2))
    return matmul(matmul(abcd(gl, Zl, ll / 2), abcd(gu, Zu, lu)), abcd(gl, Zl, ll / 2))


def bloch(T, p):
    """Bloch gamma (S7.10, S7.11) and Z_B (S7.12) of a symmetric cell (A = D). Frequencies ascending from low f.
    Small |w|: w = asinh(sqrt(B C)) (A^2 - B C = 1 for A = D), avoiding the arccosh(1 + eps) cancellation."""
    A, B, Cm, D = T[0, 0], T[0, 1], T[1, 0], T[1, 1]
    asym = float(np.max(np.abs(A - D) / np.abs(A)))
    if asym > 1e-9:
        raise ValueError(f"cell not symmetric (|A - D|/|A| = {asym:.2e})")
    w = np.arccosh((A + D) / 2 + 0j)
    ws = np.arcsinh(np.sqrt(B * Cm + 0j))
    small = np.abs(w) < 0.5
    w = np.where(small, ws, w)
    out = np.empty_like(w)
    prev = 0.0
    for i, wi in enumerate(w):
        if abs(wi.real) > 1e-12 * max(abs(wi), 1e-300):
            v = wi if wi.real > 0 else -wi  # attenuating (or lossy) wave: Re gamma_B > 0
        else:
            # lossless passband: forward wave carries positive power, Re Z_B = Re(B / sinh(v)) > 0
            v = complex(0.0, wi.imag)
            if (B[i] / np.sinh(v)).real < 0:
                v = -v
        m = round((prev - v.imag) / (2 * np.pi))
        best = v + 2j * np.pi * m
        out[i] = complex(max(best.real, 0.0), best.imag)
        prev = best.imag
    gB = out / p
    ZB = B / np.sinh(out)
    return gB, ZB


def bloch_on_grid(f_ghz, fn_sections, lu, ll, split="unloaded_centred", dense=0.05):
    """Evaluate Bloch on a dense ascending grid (branch continuity), return values at f_ghz."""
    fmax = max(f_ghz)
    fd = np.unique(np.concatenate([np.arange(dense, fmax + dense, dense), np.asarray(f_ghz, float)]))
    su, sl = fn_sections(fd)
    gB, ZB = bloch(cell_matrix(su, sl, lu, ll, split), lu + ll)
    idx = np.searchsorted(fd, f_ghz)
    return gB[idx], ZB[idx]


def bragg_lossless(nu, Zu, nl, Zl, lu, ll, fmax_ghz=5000.0, step=0.05):
    """Lowest f with cos t_u cos t_l - rho' sin t_u sin t_l = -1 (S7.13), rho' = (Zu/Zl + Zl/Zu)/2.
    A sign change gives the lower stopband edge; for identical sections the trace only touches -1 (no stopband),
    detected as a local minimum of g below 1e-9 and refined by bounded minimisation."""
    rho = 0.5 * (Zu / Zl + Zl / Zu)

    def g(f):
        w = 2 * np.pi * f * 1e9
        tu, tl = w * nu * lu / C0, w * nl * ll / C0
        return np.cos(tu) * np.cos(tl) - rho * np.sin(tu) * np.sin(tl) + 1.0

    f = np.arange(step, fmax_ghz, step)
    v = g(f)
    neg = np.nonzero(v <= 0)[0]
    loc = np.nonzero((v[1:-1] <= v[:-2]) & (v[1:-1] <= v[2:]) & (v[1:-1] < 1e-6))[0] + 1
    kn = neg[0] if len(neg) else None
    km = loc[0] if len(loc) else None
    if km is not None and (kn is None or km < kn - 1):
        r = minimize_scalar(g, bounds=(f[km - 1], f[km + 1]), method="bounded", options={"xatol": 1e-10})
        return float(r.x) if r.fun < 1e-9 else None
    if kn is None:
        return None
    if v[kn] == 0:
        return float(f[kn])
    return float(brentq(g, f[kn - 1], f[kn], xtol=1e-10, rtol=1e-14))


# ---------------------------------------------------------------- cascade EO response (S7.14)


def m_cascade(f_ghz, sections, Zs, Zl, ng, chunk=2000):
    """sections: list of (gamma[nf], Z[nf], l, eta) (arrays may be shared between sections). Exact integration with
    terminations (S7.14). Section matrices are computed once per distinct (gamma, Z, l) object triple; frequencies
    are processed in chunks to bound memory. Returns m (V/V)."""
    f = np.asarray(f_ghz, dtype=float)
    out = np.empty(len(f), dtype=complex)
    for i0 in range(0, len(f), chunk):
        sl = slice(i0, i0 + chunk)
        sec = [(g[sl], Z[sl], seg, eta) for g, Z, seg, eta in sections]
        out[sl] = _m_cascade(f[sl], sec, [(id(g), id(Z)) for g, Z, _, _ in sections], Zs, Zl, ng)
    return out


def _m_cascade(f, sections, keys, Zs, Zl, ng):
    bo = 2 * np.pi * f * 1e9 * ng / C0
    nf = len(f)
    cache: dict = {}
    mats = []
    for (g, Z, seg, _), key in zip(sections, keys, strict=True):
        k = (key, seg)
        if k not in cache:
            cache[k] = abcd(g, Z, seg)
        mats.append(cache[k])
    Znode = [None] * (len(sections) + 1)
    Znode[-1] = np.full(nf, np.inf) if np.isinf(Zl) else np.full(nf, Zl, dtype=complex)
    for k in range(len(sections) - 1, -1, -1):
        T = mats[k]
        Zn = Znode[k + 1]
        if np.all(np.isinf(Zn)):
            Znode[k] = T[0, 0] / T[1, 0]
        else:
            Znode[k] = (T[0, 0] * Zn + T[0, 1]) / (T[1, 0] * Zn + T[1, 1])
    V = Znode[0] / (Zs + Znode[0]) + 0j
    Iv = V / Znode[0]
    acc = np.zeros(nf, dtype=complex)
    z = 0.0
    eta_len = 0.0
    for k, (g, Z, seg, eta) in enumerate(sections):
        a = (V + Z * Iv) / 2
        b = (V - Z * Iv) / 2
        wp = (g + 1j * bo) * seg
        integ = seg * (a * phi((g - 1j * bo) * seg) + b * np.exp(wp) * phi(wp))
        acc += eta * np.exp(1j * bo * z) * integ
        eta_len += eta * seg
        T = mats[k]
        Vn = T[1, 1] * V - T[0, 1] * Iv
        In = -T[1, 0] * V + T[0, 0] * Iv
        Zn = Znode[k + 1]
        if not np.all(np.isinf(Zn)):
            In = Vn / Zn
        V, Iv = Vn, In
        z += seg
    return acc / eta_len


def m_bruteforce(f1, sections, Zs, Zl, ng, npts=401):
    """Independent check of S7.14 at one frequency: node values by backward propagation from the load
    (I_N = 1, V_N = Z_L I_N, then [V_k; I_k] = T_k [V_{k+1}; I_{k+1}], rescaled to V_s = V_0 + Z_S I_0 = 1),
    V(s) inside each section from T(s)^-1 [V_k; I_k], Simpson quadrature of V e^{j beta_o z}."""
    from scipy.integrate import simpson

    bo = 2 * np.pi * f1 * 1e9 * ng / C0
    V, Iv = complex(Zl), 1.0 + 0j
    nodes = [(V, Iv)]
    for g, Z, seg, _ in reversed(sections):
        ch, sh = np.cosh(g * seg), np.sinh(g * seg)
        V, Iv = ch * V + Z * sh * Iv, sh / Z * V + ch * Iv
        nodes.append((V, Iv))
    nodes = nodes[::-1]
    scale = 1.0 / (nodes[0][0] + Zs * nodes[0][1])
    acc, z, el = 0j, 0.0, 0.0
    for (g, Z, seg, eta), (Vk, Ik) in zip(sections, nodes[:-1], strict=True):
        s_ = np.linspace(0.0, seg, npts)
        Vs = (np.cosh(g * s_) * Vk - Z * np.sinh(g * s_) * Ik) * scale
        acc += eta * simpson(Vs * np.exp(1j * bo * (z + s_)), x=s_)
        el += eta * seg
        z += seg
    return acc / el


# ---------------------------------------------------------------- bandwidths


def bandwidths(Hfun, fmax=400.0, step=0.01):
    f = np.arange(step, fmax + step / 2, step)
    h = Hfun(f)
    out = {"H_max": float(h.max()), "f_at_H_max_ghz": float(f[np.argmax(h)]), "scan_ghz": [step, fmax]}
    for key, thr in (("bw3_el_ghz", H3), ("bw6_el_ghz", H6)):
        i = np.nonzero(h < thr)[0]
        if len(i) == 0:
            out[key] = None
            out[key + "_bound"] = f"> {fmax}"
            continue
        k = i[0]
        lo = f[k - 1] if k > 0 else 1e-9
        out[key] = float(brentq(lambda x, thr=thr: float(Hfun(np.array([x]))[0]) - thr, lo, f[k], xtol=1e-9, rtol=1e-15))
    return out


def db(h):
    return 20 * np.log10(np.asarray(h))


def series(f, m, m0):
    H = np.abs(m) / m0
    return {"f_ghz": list(map(float, f)), "H": H.tolist(), "S21_EO_el_dB": db(H).tolist(),
            "S21_EO_opt_dB": (10 * np.log10(H)).tolist(), "m_re": m.real.tolist(), "m_im": m.imag.tolist()}


def at(f, vals, fq):
    return float(np.asarray(vals)[list(f).index(fq)])


# ---------------------------------------------------------------- limit checks


def limits(log) -> dict:
    out: dict = {}
    f = np.array(GRID_GHZ)
    L = 0.01
    Z = 50.0
    w = 2 * np.pi * f * 1e9

    # L1 lossless matched velocity matched
    n = 2.2
    m = m_uniform(f, 1j * w * n / C0, np.full(len(f), Z + 0j), Z, Z, n, L)
    out["L1_flat"] = {"max_abs_H_minus_1": float(np.max(np.abs(np.abs(m) / m0_dc(Z, Z) - 1)))}

    # L2 pure mismatch sinc
    nrf, ng = 2.0, 2.3
    m = m_uniform(f, 1j * w * nrf / C0, np.full(len(f), Z + 0j), Z, Z, ng, L)
    x = np.pi * f * 1e9 * L * (nrf - ng) / C0
    sinc = np.abs(np.sin(x) / x)
    bw = bandwidths(lambda ff: np.abs(m_uniform(ff, 2j * np.pi * ff * 1e9 * nrf / C0, np.full(len(ff), Z + 0j), Z, Z, ng, L)) / 0.5)
    x3 = brentq(lambda t: np.sin(t) / t - H3, 0.5, 2.0, xtol=1e-14)
    x6 = brentq(lambda t: np.sin(t) / t - H6, 1.0, 2.5, xtol=1e-14)
    fac = C0 / (np.pi * L * abs(nrf - ng)) / 1e9
    out["L2_sinc"] = {"inputs": {"n_rf": nrf, "n_g": ng, "L_m": L, "Z_ohm": Z},
                      "max_abs_H_minus_sinc": float(np.max(np.abs(np.abs(m) / 0.5 - sinc))),
                      "x3_el": x3, "x6_el": x6, "bw3_el_closed_ghz": x3 * fac, "bw6_el_closed_ghz": x6 * fac,
                      "bw3_el_numeric_ghz": bw["bw3_el_ghz"], "bw6_el_numeric_ghz": bw["bw6_el_ghz"],
                      "alferness_eq21_x": 2.0, "sinc_at_x2": float(np.sin(2.0) / 2.0)}

    # L3 pure loss
    a0 = 0.5
    al = alpha_np_per_m(a0, f)
    m = m_uniform(f, al + 1j * w * n / C0, np.full(len(f), Z + 0j), Z, Z, n, L)
    ref = (1 - np.exp(-al * L)) / (al * L)
    out["L3_loss"] = {"inputs": {"a0_db_cm_rtghz": a0, "n": n, "L_m": L},
                      "max_abs_H_minus_closed": float(np.max(np.abs(np.abs(m) / 0.5 - ref)))}
    x3l = brentq(lambda t: -np.expm1(-t) / t - H3, 1e-3, 5, xtol=1e-14)
    f3 = (x3l / L / 100 * DB_PER_NP / a0) ** 2
    bwl = bandwidths(lambda ff: np.abs(m_uniform(ff, alpha_np_per_m(a0, ff) + 2j * np.pi * ff * 1e9 * n / C0,
                                                  np.full(len(ff), Z + 0j), Z, Z, n, L)) / 0.5)
    out["L3_loss"].update({"alphaL3_np": x3l, "bw3_el_closed_ghz": f3, "bw3_el_numeric_ghz": bwl["bw3_el_ghz"]})

    # L4 open / short with matched source, lossless, velocity matched
    bL = w * n * L / C0
    for name, Zl, gl in (("open", np.inf, 1.0), ("short", 0.0, -1.0)):
        m = m_uniform(f, 1j * w * n / C0, np.full(len(f), Z + 0j), Z, Zl, n, L)
        ref = 0.5 * (1 + gl * np.exp(-1j * bL) * np.sin(bL) / bL)
        out[f"L4_{name}"] = {"max_abs_m_minus_closed": float(np.max(np.abs(m - ref))),
                             "m_abs_at_1ghz": float(abs(m[GRID_GHZ.index(1.0)]))}

    # Z0 zero loading: identical sections = uniform line (Bloch and cascade), lossy RLGC line, mismatched terminations
    Lp, Cp, r1 = 3.7e-7, 1.4e-10, 400.0
    lu, ll, p = 14e-6, 36e-6, 50e-6

    def secs(ff):
        s = rlgc(ff, Lp, Cp, r1)
        return s, s

    gB, ZB = bloch_on_grid(f, secs, lu, ll)
    g0, Z0 = rlgc(f, Lp, Cp, r1)
    N = 200
    su, sl = secs(f)
    sections = []
    for _ in range(N):
        sections += [(su[0], su[1], lu / 2, 1.0), (sl[0], sl[1], ll, 1.0), (su[0], su[1], lu / 2, 1.0)]
    mc = m_cascade(f, sections, 50.0, 50.0, 2.2)
    mu = m_uniform(f, g0, Z0, 50.0, 50.0, 2.2, N * p)
    out["Z0_zero_loading"] = {"max_rel_gammaB_minus_gamma": float(np.max(np.abs(gB - g0) / np.abs(g0))),
                              "max_rel_ZB_minus_Zc": float(np.max(np.abs(ZB - Z0) / np.abs(Z0))),
                              "max_abs_m_cascade_minus_closed": float(np.max(np.abs(mc - mu)))}
    # open-load cascade vs closed form
    mco = m_cascade(f, sections, 50.0, np.inf, 2.2)
    muo = m_uniform(f, g0, Z0, 50.0, np.inf, 2.2, N * p)
    out["Z0_zero_loading"]["max_abs_m_cascade_minus_closed_open_load"] = float(np.max(np.abs(mco - muo)))

    # B1-B3 Bragg
    fb1 = bragg_lossless(2.2, 50.0, 2.2, 50.0, lu, ll)
    out["B1_uniform_cell"] = {"f_bragg_numeric_ghz": fb1, "f_bragg_closed_ghz": C0 / (2 * 2.2 * p) / 1e9}
    nu, Zu, nl, Zl = 1.6, 70.0, 2.4, 45.0
    lu2, ll2 = 300e-6, 300e-6 * nu / nl  # equal electrical lengths
    rho = 0.5 * (Zu / Zl + Zl / Zu)
    t_edge = math.asin(math.sqrt(2 / (1 + rho)))
    fb2c = t_edge * C0 / (2 * np.pi * nu * lu2) / 1e9
    fb2 = bragg_lossless(nu, Zu, nl, Zl, lu2, ll2)

    # same edge from the ABCD trace of the lossless sections (independent of the trace formula)
    def secs2(ff):
        w2 = 2 * np.pi * np.asarray(ff) * 1e9
        return (1j * w2 * nu / C0, np.full(len(ff), Zu + 0j)), (1j * w2 * nl / C0, np.full(len(ff), Zl + 0j))

    def tr(ff):
        su2, sl2 = secs2(np.array([ff]))
        T = cell_matrix(su2, sl2, lu2, ll2)
        return float(((T[0, 0] + T[1, 1]) / 2).real[0]) + 1.0

    fs = np.arange(0.05, 2 * fb2, 0.05)
    k = next(i for i, x in enumerate(fs) if tr(x) <= 0)
    fb2_abcd = brentq(tr, fs[k - 1], fs[k], xtol=1e-10)
    out["B2_equal_electrical_length"] = {"inputs": {"n_u": nu, "Z_u": Zu, "n_l": nl, "Z_l": Zl, "l_u_m": lu2, "l_l_m": ll2},
                                         "f_bragg_closed_ghz": fb2c, "f_bragg_trace_formula_ghz": fb2,
                                         "f_bragg_abcd_ghz": fb2_abcd}
    # B3 long-wave limit
    Lu = Zu * nu / C0
    Cu = nu / (Zu * C0)
    Ll = Zl * nl / C0
    Cl = nl / (Zl * C0)
    Lb = (Lu * lu2 + Ll * ll2) / (lu2 + ll2)
    Cb = (Cu * lu2 + Cl * ll2) / (lu2 + ll2)
    gBl, ZBl = bloch_on_grid([0.01], secs2, lu2, ll2, dense=0.01)
    out["B3_long_wave"] = {"n_B_at_10MHz": float(C0 * gBl.imag[0] / (2 * np.pi * 1e7)), "n_homog": float(C0 * math.sqrt(Lb * Cb)),
                           "Z_B_at_10MHz": float(ZBl.real[0]), "Z_homog": float(math.sqrt(Lb / Cb))}

    # Alferness 1982 numerical statements re-evaluated
    nmd = 2.0  # Table I (1983 typeset), N_m |1 - N_0/N_m| for LiNbO3
    xh = brentq(lambda t: np.sin(t) / t - 0.5, 1.0, 2.5, xtol=1e-14)
    out["alferness1982"] = {
        "eq21_fL_ghz_cm": 2 * C0 / (np.pi * nmd) / 1e9 * 100,
        "x_half": xh, "exact_50pct_fL_ghz_cm": xh * C0 / (np.pi * nmd) / 1e9 * 100,
        "paper_value_ghz_cm": 9, "paper_locator": "p.1127, text after eq. (21); Table I (1983 corrections)",
        "eq21_1p5cm_ghz": 2 * C0 / (np.pi * nmd) / 1e9 * 100 / 1.5,
        "exact_50pct_1p5cm_ghz": xh * C0 / (np.pi * nmd) / 1e9 * 100 / 1.5, "paper_1p5cm_ghz": "~7",
    }
    x50 = brentq(lambda t: -np.expm1(-t) / t - 0.5, 1e-3, 5, xtol=1e-14)
    out["alferness1982"]["loss_example"] = {
        "inputs": {"a0_db_cm_rtghz": 1.0, "L_cm": 1.5}, "paper_ghz": "~10 (p.1127, after eq. (22))",
        "f50_alpha_a_over_4p3_ghz": (x50 * 4.3 / 1.5) ** 2,
        "f50_alpha_a_over_8p686_ghz": (x50 * DB_PER_NP / 1.5) ** 2,
        "note": "50 % of the low-frequency integrated delta-beta; neither reading reproduces ~10 GHz; recorded, not used",
    }

    # harness replay (task 4)
    a0, nrf, ng, L = 0.36, 2.18, 2.2, 0.01
    fq = np.array([67.0])
    wq = 2 * np.pi * fq * 1e9
    m = m_uniform(fq, alpha_np_per_m(a0, fq) + 1j * wq * nrf / C0, np.array([50.0 + 0j]), 50.0, 50.0, ng, L)
    x = alpha_np_per_m(a0, fq)[0] * L
    hl = -np.expm1(-x) / x
    Lp = 50.0 * nrf / C0
    Cp = nrf / (50.0 * C0)
    gq, Zq = rlgc(fq, Lp, Cp, 2 * 50.0 * alpha_np_per_m(a0, 1.0))
    mr = m_uniform(fq, gq, Zq, 50.0, 50.0, ng, L)
    out["harness_replay"] = {
        "inputs": {"a0_db_cm_rtghz": a0, "f_ghz": 67.0, "n_rf": nrf, "n_g": ng, "L_m": L, "Z_S=Z_L=Zc_ohm": 50.0},
        "S21_EO_el_dB": float(db(abs(m[0]) / 0.5)), "loss_only_el_dB": float(db(hl)),
        "rlgc_variant_S21_EO_el_dB": float(db(abs(mr[0]) / 0.5)),
        "rlgc_variant_note": "R'(f) = 2 x 50 ohm x alpha(f), L' = 50 n/c, C' = n/(50 c), G' = 0: complex Zc; alpha = beta (x/2 - x^3/16 + ...), x = R'/(omega L'), i.e. slightly below the law",
        "expected_about_dB": -1.46,
    }
    for k_, v_ in out.items():
        log.info(f"limit {k_}: {json.dumps(v_)}")
    return out


# ---------------------------------------------------------------- K8 uniform GSG line


def k8_variants(Cp, C0p, ng, a0, log=None, full=True) -> dict:
    nrf = math.sqrt(Cp / C0p)
    Z0 = 1 / (C0 * math.sqrt(Cp * C0p))
    Lp = 1 / (C0**2 * C0p)
    f = np.array(GRID_GHZ)
    out: dict = {}

    def line(kind, ff, a0_):
        ff = np.asarray(ff, float)
        w = 2 * np.pi * ff * 1e9
        if kind == "primary":
            return alpha_np_per_m(a0_, ff) + 1j * w * nrf / C0, np.full(len(ff), Z0 + 0j)
        return rlgc(ff, Lp, Cp, 2 * Z0 * alpha_np_per_m(a0_, 1.0))

    for Lmm in (5.0, 10.0):
        L = Lmm * 1e-3
        for kind, a0_ in (("primary", a0), ("lossless", 0.0), ("rlgc", a0), ("matched_primary", a0)):
            k_line = "primary" if kind in ("primary", "lossless", "matched_primary") else "rlgc"
            Zs = Zl = Z0 if kind == "matched_primary" else 50.0
            g, Zc = line(k_line, f, a0_)
            m = m_uniform(f, g, Zc, Zs, Zl, ng, L)
            m0 = m0_dc(Zs, Zl)

            def Hf(ff, k_line=k_line, a0_=a0_, Zs=Zs, Zl=Zl, L=L, m0=m0):
                gg, zz = line(k_line, ff, a0_)
                return np.abs(m_uniform(ff, gg, zz, Zs, Zl, ng, L)) / m0

            bw = bandwidths(Hf)
            s = series(f, m, m0)
            key = f"L{int(Lmm)}mm_{kind}"
            entry = {"L_mm": Lmm, "line": k_line, "a0": a0_, "Z_S_ohm": Zs, "Z_L_ohm": Zl, **bw,
                     "S21_EO_el_dB_at_50": at(f, s["S21_EO_el_dB"], 50.0),
                     "S21_EO_el_dB_at_67": at(f, s["S21_EO_el_dB"], 67.0),
                     "S21_EO_el_dB_at_110": at(f, s["S21_EO_el_dB"], 110.0)}
            if full:
                entry.update({"alpha_db_per_cm": (np.real(g) / 100 * DB_PER_NP).tolist(),
                              "n_rf_f": (C0 * np.imag(g) / (2 * np.pi * f * 1e9)).tolist(),
                              "Zc_re": np.real(Zc).tolist(), "Zc_im": np.imag(Zc).tolist(), "series": s})
            out[key] = entry
            if log is not None:
                log.info(f"K8 {key}: bw3 {bw['bw3_el_ghz']} bw6 {bw['bw6_el_ghz']} Hmax {bw['H_max']:.6f} "
                         f"@67 {entry['S21_EO_el_dB_at_67']:.5f} dB")
    return out


def k8(log) -> dict:
    k4 = json.loads((REF / "K4-es-eo.json").read_text())
    k2 = json.loads((REF / "K2-fem.json").read_text())
    Cp = k4["extrapolated"]["C_pF_per_m"]["f_ext"] * 1e-12
    C0p = k4["extrapolated"]["C0_pF_per_m"]["f_ext"] * 1e-12
    ng = k2["extrapolated"]["ng_fd_10nm"]["f_ext"]
    nrf = math.sqrt(Cp / C0p)
    Z0 = 1 / (C0 * math.sqrt(Cp * C0p))
    Lp = 1 / (C0**2 * C0p)
    a0 = 0.36
    inputs = {
        "C_pF_per_m": Cp * 1e12, "C0_pF_per_m": C0p * 1e12,
        "C_source": "validation/reference/K4-es-eo.json extrapolated.C_pF_per_m.f_ext (U 0.0121 pF/m)",
        "C0_source": "validation/reference/K4-es-eo.json extrapolated.C0_pF_per_m.f_ext (U 0.00061 pF/m)",
        "n_rf": nrf, "Z0_ohm": Z0, "L_nH_per_m": Lp * 1e9,
        "derived": "n_rf = sqrt(C'/C0'), Z0 = 1/(c sqrt(C' C0')), L' = 1/(c^2 C0') (quasi-TEM, K4 section is lossless)",
        "K4_individually_extrapolated": {"n_rf": k4["extrapolated"]["n_rf"]["f_ext"], "Z0_ohm": k4["extrapolated"]["Z0_ohm"]["f_ext"]},
        "n_g": ng, "n_g_source": "validation/reference/K2-fem.json extrapolated.ng_fd_10nm.f_ext (U 2.0e-7); K4 arm mode = K2 mode (K4 YAML header)",
        "a0_db_per_cm_per_sqrt_ghz": a0,
        "a0_class": "case input (illustrative); numerically equal to the chen2022 measured alpha0 (sims/chen2022 target 2.947 dB/cm at 67 GHz = 0.36 sqrt(67)); not a property of the K4 geometry",
        "loss_law": "alpha(f) = a0 sqrt(f/GHz) dB/cm (field amplitude); primary: gamma = alpha + j omega n_rf/c, Zc = Z0 (real, frequency independent)",
        "rlgc_variant": "R'(f) = 2 Z0 alpha(f) [ohm/m], L', C' as above, G' = 0: gamma = sqrt((R' + j w L') j w C'), complex Zc",
        "Z_S_ohm": 50.0, "Z_L_ohm": 50.0, "L_mm": [5.0, 10.0],
    }
    f = np.array(GRID_GHZ)
    out: dict = {"inputs": inputs, "variants": k8_variants(Cp, C0p, ng, a0, log=log)}
    # input-uncertainty propagation: one-at-a-time +U perturbation of C', C0' (K4) and n_g (K2), RSS of the changes
    uC = k4["extrapolated"]["C_pF_per_m"]["U"] * 1e-12
    uC0 = k4["extrapolated"]["C0_pF_per_m"]["U"] * 1e-12
    ung = k2["extrapolated"]["ng_fd_10nm"]["U"]
    pert = [k8_variants(Cp + uC, C0p, ng, a0, full=False), k8_variants(Cp, C0p + uC0, ng, a0, full=False),
            k8_variants(Cp, C0p, ng + ung, a0, full=False)]
    for key, e in out["variants"].items():
        e["U_from_inputs"] = {q: float(math.sqrt(sum((pp[key][q] - e[q]) ** 2 for pp in pert)))
                              for q in ("bw3_el_ghz", "bw6_el_ghz", "S21_EO_el_dB_at_50", "S21_EO_el_dB_at_67",
                                        "S21_EO_el_dB_at_110")}
    out["U_rule"] = ("U_from_inputs = RSS of one-at-a-time +U changes of C' (U 0.0121 pF/m), C0' (U 0.00061 pF/m), "
                     "n_g (U 2.0e-7); numerical error (closed form vs cascade, brentq xtol 1e-9 GHz) is below 1e-8")
    nrf = math.sqrt(Cp / C0p)
    Z0 = 1 / (C0 * math.sqrt(Cp * C0p))
    g = alpha_np_per_m(a0, f) + 1j * 2 * np.pi * f * 1e9 * nrf / C0
    Zc = np.full(len(f), Z0 + 0j)
    # cross-check: closed form vs cascade of 1000 identical sections (primary, 10 mm)
    secs = [(g, Zc, 1e-5, 1.0)] * 1000
    mc = m_cascade(f, secs, 50.0, 50.0, ng)
    mu = m_uniform(f, g, Zc, 50.0, 50.0, ng, 0.01)
    out["check_closed_vs_cascade_10mm_max_abs_dm"] = float(np.max(np.abs(mc - mu)))
    log.info(f"K8 closed vs cascade max |dm| {out['check_closed_vs_cascade_10mm_max_abs_dm']:.3e}")
    return out


# ---------------------------------------------------------------- K9 T-rail cell


def k9_inputs(name: str) -> dict:
    n_t, Z_t = 2.16, 52.3
    Lp = Z_t * n_t / C0
    Cavg = n_t / (Z_t * C0)
    ratio = 1.0 if name == "K9z" else 2.0
    p, lu = (1000e-6, 280e-6) if name == "K9b" else (50e-6, 14e-6)
    ll = p - lu
    Cu = Cavg * p / (lu + ratio * ll)
    Cl = ratio * Cu
    r1 = 2 * Z_t * alpha_np_per_m(0.36, 1.0)
    return {
        "name": name, "period_um": p * 1e6, "l_unloaded_um": lu * 1e6, "l_loaded_um": ll * 1e6,
        "L_mm": 10.0, "N_cells": int(round(0.01 / p)), "Z_S_ohm": 50.0, "Z_L_ohm": 50.0, "n_g": 2.2,
        "L_prime_H_per_m": {"unloaded": Lp, "loaded": Lp},
        "C_prime_F_per_m": {"unloaded": Cu, "loaded": Cl},
        "R_prime": {"law": "R'(f) = r1 sqrt(f/GHz), both sections", "r1_ohm_per_m": r1},
        "G_prime": 0.0,
        "eta": {"loaded": 1.0, "unloaded_primary": 1.0, "unloaded_variant": 0.0},
        "provenance": {
            "period, loaded length, L, Z_S, Z_L": ("sims/chen2022/config.yaml line.loading (period 50 um, loaded 36 um; "
                                                    "class project_inference there), line.length_mm 10, source/load 50 ohm"
                                                    if name != "K9b" else
                                                    "illustrative: period 1000 um, loaded 720 um (same 72 % fill as chen2022) "
                                                    "to place the Bragg edge below 110 GHz; L, Z_S, Z_L as chen2022"),
            "n_g": "sims/chen2022/config.yaml target ng_opt 2.2 (paper Fig. 2(d))",
            "L', C'_avg": ("illustrative, derived: L' = Z n / c, C'_avg = n /(Z c) with n = 2.16, Z = 52.3 ohm "
                           "(sims/chen2022/config.yaml targets n_rf and z0_ohm, Fig. 2(c),(d) plateaus); L' equal in both "
                           "sections (Shin 2011 p.48: loaded-line inductance almost identical to the unloaded value)"),
            "C'_loaded / C'_unloaded": ("1 (zero-loading control)" if name == "K9z" else
                                         "2, illustrative (no per-section value in any repo input)"),
            "r1": ("derived-illustrative: r1 = 2 x 52.3 ohm x alpha0, alpha0 = 0.36 dB/cm/sqrt(GHz) (chen2022 measured, "
                   "sims/chen2022 rf_loss target), via Shin 2011 eq. (8) alpha = R0/(2 Z_L); R' same in both sections "
                   "(T-rail resistance neglected, Shin eqs. (9)-(11))"),
            "G'": "0 (loss tangents missing in sims/chen2022/config.yaml)",
            "eta": "relative EO efficiency per volt per length; primary uniform (1, 1), variant (loaded 1, unloaded 0); illustrative",
        },
    }


def k9_case(name: str, log) -> dict:
    inp = k9_inputs(name)
    Lp = inp["L_prime_H_per_m"]["loaded"]
    Cu, Cl = inp["C_prime_F_per_m"]["unloaded"], inp["C_prime_F_per_m"]["loaded"]
    r1 = inp["R_prime"]["r1_ohm_per_m"]
    lu, ll = inp["l_unloaded_um"] * 1e-6, inp["l_loaded_um"] * 1e-6
    p = lu + ll
    N = inp["N_cells"]
    ng = inp["n_g"]
    f = np.array(GRID_GHZ)

    def secs(ff, r=r1):
        return rlgc(ff, Lp, Cu, r), rlgc(ff, Lp, Cl, r)

    gB, ZB = bloch_on_grid(f, secs, lu, ll)
    gB2, ZB2 = bloch_on_grid(f, secs, lu, ll, split="loaded_centred")
    gB0, ZB0 = bloch_on_grid(f, lambda ff: secs(ff, 0.0), lu, ll)
    nu, nl = C0 * math.sqrt(Lp * Cu), C0 * math.sqrt(Lp * Cl)
    Zu, Zl_ = math.sqrt(Lp / Cu), math.sqrt(Lp / Cl)
    fB = bragg_lossless(nu, Zu, nl, Zl_, lu, ll)
    Cb = (Cu * lu + Cl * ll) / p
    fB_homog = C0 / (2 * p * C0 * math.sqrt(Lp * Cb)) / 1e9
    w = 2 * np.pi * f * 1e9
    out: dict = {"inputs": inp, "section_derived": {"n_u": nu, "n_l": nl, "Z_u_ohm": Zu, "Z_l_ohm": Zl_,
                                                    "n_homog": C0 * math.sqrt(Lp * Cb), "Z_homog_ohm": math.sqrt(Lp / Cb)},
                 "f_bragg_ghz": fB, "f_bragg_homogenised_c_over_2np_ghz": fB_homog,
                 "bloch": {"f_ghz": list(map(float, f)),
                           "n_B": (C0 * gB.imag / w).tolist(),
                           "alpha_B_db_per_cm": (gB.real / 100 * DB_PER_NP).tolist(),
                           "beta_B_p_over_pi": (gB.imag * p / np.pi).tolist(),
                           "Z_B_re": ZB.real.tolist(), "Z_B_im": ZB.imag.tolist(),
                           "Z_B_loaded_centred_re": ZB2.real.tolist(), "Z_B_loaded_centred_im": ZB2.imag.tolist(),
                           "n_B_lossless": (C0 * gB0.imag / w).tolist(),
                           "alpha_B_lossless_db_per_cm": (gB0.real / 100 * DB_PER_NP).tolist()},
                 "checks": {"max_rel_gammaB_split_difference": float(np.max(np.abs(gB - gB2) / np.abs(gB)))}}
    # Shin eq. (8) cross-check at 67 GHz
    i67 = GRID_GHZ.index(67.0)
    shin = r1 * math.sqrt(67.0) / (2 * math.sqrt(Lp / Cb)) / 100 * DB_PER_NP
    out["checks"]["shin_eq8_alpha_67_db_per_cm"] = shin
    if fB is not None:
        fb = np.array([fB])
        wb = 2 * np.pi * fb * 1e9
        Tb = cell_matrix((1j * wb * nu / C0, np.array([Zu + 0j])), (1j * wb * nl / C0, np.array([Zl_ + 0j])), lu, ll)
        out["checks"]["abcd_half_trace_at_f_bragg_plus_1"] = float(abs((Tb[0, 0, 0] + Tb[1, 1, 0]) / 2 + 1))
    out["checks"]["exact_alpha_B_67_db_per_cm"] = float(gB.real[i67] / 100 * DB_PER_NP)

    su, sl = secs(f)
    responses = {}
    for label, eta_u in (("eta_uniform", 1.0), ("eta_loaded_only", 0.0)):
        sections = []
        for _ in range(N):
            sections += [(su[0], su[1], lu / 2, eta_u), (sl[0], sl[1], ll, 1.0), (su[0], su[1], lu / 2, eta_u)]
        m = m_cascade(f, sections, 50.0, 50.0, ng)
        m0 = m0_dc(50.0, 50.0)

        def Hf(ff, eta_u=eta_u, m0=m0):
            a, b = secs(ff)
            sc = []
            for _ in range(N):
                sc += [(a[0], a[1], lu / 2, eta_u), (b[0], b[1], ll, 1.0), (a[0], a[1], lu / 2, eta_u)]
            return np.abs(m_cascade(ff, sc, 50.0, 50.0, ng)) / m0

        fmax = 400.0 if name != "K9b" else 150.0
        bw = bandwidths(Hf, fmax=fmax, step=0.01 if name != "K9a" else 0.05)
        s = series(f, m, m0)
        responses[label] = {**bw, "S21_EO_el_dB_at_50": at(f, s["S21_EO_el_dB"], 50.0),
                            "S21_EO_el_dB_at_67": at(f, s["S21_EO_el_dB"], 67.0),
                            "S21_EO_el_dB_at_110": at(f, s["S21_EO_el_dB"], 110.0), "series": s}
        log.info(f"{name} {label}: bw3 {bw['bw3_el_ghz']} bw6 {bw['bw6_el_ghz']} Hmax {bw['H_max']:.6f} "
                 f"@67 {responses[label]['S21_EO_el_dB_at_67']:.5f} dB")
    # homogenised comparison (uniform eta)
    mh = m_uniform(f, gB, ZB, 50.0, 50.0, ng, N * p)
    sh = series(f, mh, 0.5)
    responses["bloch_homogenised"] = {"S21_EO_el_dB_at_67": at(f, sh["S21_EO_el_dB"], 67.0), "series": sh}
    d = np.abs(np.array(sh["S21_EO_el_dB"]) - np.array(responses["eta_uniform"]["series"]["S21_EO_el_dB"]))
    out["checks"]["max_abs_dB_cascade_minus_homogenised"] = float(d.max())
    out["checks"]["f_of_max_dB_difference_ghz"] = float(f[np.argmax(d)])
    # cascade with the other cell split must give the same m (same physical line, different section grouping)
    sections = [(sl[0], sl[1], ll / 2, 1.0)] + [(su[0], su[1], lu, 1.0), (sl[0], sl[1], ll, 1.0)] * (N - 1) + \
               [(su[0], su[1], lu, 1.0), (sl[0], sl[1], ll / 2, 1.0)]
    # this line starts and ends with half loaded sections: compare to an explicit regrouping of the same line
    sections_ref = []
    for _ in range(N):
        sections_ref += [(sl[0], sl[1], ll / 2, 1.0), (su[0], su[1], lu, 1.0), (sl[0], sl[1], ll / 2, 1.0)]
    mA = m_cascade(f, sections, 50.0, 50.0, ng)
    mB = m_cascade(f, sections_ref, 50.0, 50.0, ng)
    out["checks"]["max_abs_dm_regrouping"] = float(np.max(np.abs(mA - mB)))
    # brute-force (backward propagation + Simpson) at selected grid frequencies, primary eta
    fq = [10.0, 50.0, 63.0, 67.0, 100.0]
    secs_q = []
    for _ in range(N):
        secs_q += [(su[0], su[1], lu / 2, 1.0), (sl[0], sl[1], ll, 1.0), (su[0], su[1], lu / 2, 1.0)]
    mq = np.array(responses["eta_uniform"]["series"]["m_re"]) + 1j * np.array(responses["eta_uniform"]["series"]["m_im"])
    dmax = 0.0
    for fv in fq:
        i = GRID_GHZ.index(fv)
        one = [(g[i:i + 1][0], Z[i:i + 1][0], seg, eta) for g, Z, seg, eta in secs_q]
        dmax = max(dmax, abs(m_bruteforce(fv, one, 50.0, 50.0, ng) - mq[i]))
    out["checks"]["max_abs_dm_bruteforce_simpson"] = float(dmax)
    out["checks"]["bruteforce_f_ghz"] = fq
    out["responses"] = responses
    log.info(f"{name}: f_bragg {fB} GHz (homog c/2np {fB_homog:.4f}); n_B(1 GHz) {out['bloch']['n_B'][2]:.6f} "
             f"Z_B(1 GHz) {out['bloch']['Z_B_re'][2]:.4f}; checks {json.dumps(out['checks'])}")
    return out


# ---------------------------------------------------------------- main


def write(name: str, payload: dict, log) -> None:
    path = REF / f"s7-{name}.json"
    txt = json.dumps(payload, separators=(",", ":"))
    path.write_text(txt + "\n")
    log.info(f"wrote {path.relative_to(ROOT.parent)} ({len(txt) / 1e3:.1f} kB)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="compute and log, write nothing")
    args = ap.parse_args()
    log = Logger("s7")
    t0 = time.time()
    script_sha = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    meta = {"date": time.strftime("%Y-%m-%d"), "script": "validation/scripts/ref_s7.py", "script_sha256": script_sha,
            "versions": {k: v for k, v in versions().items() if k in ("python", "numpy", "scipy")},
            "devlog": "DevLog/DevLog-037-s7-references.md", "definitions": DEFINITIONS, "grid_ghz": GRID_GHZ,
            "c_m_per_s": C0, "dB_per_neper": DB_PER_NP}
    lim = limits(log)
    k8r = k8(log)
    k9r = {n: k9_case(n, log) for n in ("K9a", "K9b", "K9z")}
    z = k9r["K9z"]
    # zero-loading K9z vs the uniform RLGC line with the same L', C', R'
    lz = z["inputs"]
    g0, Z0 = rlgc(np.array(GRID_GHZ), lz["L_prime_H_per_m"]["loaded"], lz["C_prime_F_per_m"]["loaded"], lz["R_prime"]["r1_ohm_per_m"])
    mu = m_uniform(np.array(GRID_GHZ), g0, Z0, 50.0, 50.0, 2.2, 0.01)
    dz = np.max(np.abs(np.array(z["responses"]["eta_uniform"]["series"]["m_re"]) + 1j *
                       np.array(z["responses"]["eta_uniform"]["series"]["m_im"]) - mu))
    z["checks"]["max_abs_dm_vs_uniform_closed_form"] = float(dz)
    log.info(f"K9z vs uniform closed form max |dm| {dz:.3e}")
    log.info(f"run time {time.time() - t0:.1f} s, max RSS {max_rss_mb():.0f} MB")
    if args.dry_run:
        log.info("dry run: nothing written")
        return
    write("limits", {**meta, "checks": lim}, log)
    write("K8", {**meta, "case": "K8", **k8r}, log)
    write("K9", {**meta, "case": "K9", "cases": k9r}, log)


if __name__ == "__main__":
    main()
