"""Analytic gates for the reference scripts (DevLog-028).

G1 TE slab (anisotropic core, E_x only; eps_xx matters)        : vector FEM vs closed-form dispersion
G2 TM slab (anisotropic core, eps_yy and eps_zz matter)        : vector FEM vs closed form
G3 femwell 0.1.12 compute_modes (isotropic) vs own form         : same slab, isotropic
G4 parallel plates, anisotropic, two-layer series               : scikit-fem P2 vs closed form
G5 uniform-field Pockels slab: perturbation dn vs exact d n_eff from the closed form (TE: eps_xx; TM: eps_zz, eps_yy)
G6 normalisation: homogeneous medium dn = d eps / (2 n)

Run: uv run python scripts/gates.py [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.optimize import brentq
from skfem import MeshTri

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eoref import es as ES  # noqa: E402
from eoref import fmode as FM  # noqa: E402
from eoref.util import Logger, versions  # noqa: E402

LAM = 1.55
K0 = 2 * np.pi / LAM
NE, NO, NC = 2.137560, 2.211111, 1.444024
D = 0.6


def slab_te(exx_core: float, eps_clad: float, d: float) -> float:
    def f(b):
        kap = np.sqrt(K0**2 * exx_core - b**2)
        gam = np.sqrt(b**2 - K0**2 * eps_clad)
        return kap * np.tan(kap * d / 2) - gam

    lo, hi = K0 * np.sqrt(eps_clad) * (1 + 1e-12), K0 * np.sqrt(exx_core) * (1 - 1e-12)
    # fundamental: kap d/2 < pi/2
    bmin = np.sqrt(max(K0**2 * exx_core - (np.pi / d) ** 2 * 0.999999, lo**2))
    return brentq(f, max(lo, bmin), hi, xtol=1e-15) / K0


def slab_tm(eyy: float, ezz: float, eps_clad: float, d: float) -> float:
    def f(b):
        kap = np.sqrt(ezz / eyy * (K0**2 * eyy - b**2))
        gam = np.sqrt(b**2 - K0**2 * eps_clad)
        return kap / ezz * np.tan(kap * d / 2) - gam / eps_clad

    hi = K0 * np.sqrt(eyy) * (1 - 1e-12)
    lo = K0 * np.sqrt(eps_clad) * (1 + 1e-12)
    # fundamental branch: kap d/2 in (0, pi/2)
    bmin2 = eyy * K0**2 - (np.pi / d) ** 2 * eyy / ezz * 0.999999
    lo = max(lo, np.sqrt(max(bmin2, 0)))
    return brentq(f, lo, hi, xtol=1e-15) / K0


def slab_te_confinement(exx_core: float, eps_clad: float, d: float) -> tuple[float, float]:
    """Return (n_eff, Gamma_E = int_core |E|^2 / int |E|^2) for TE0."""
    n = slab_te(exx_core, eps_clad, d)
    b = n * K0
    kap = np.sqrt(K0**2 * exx_core - b**2)
    gam = np.sqrt(b**2 - K0**2 * eps_clad)
    a = d / 2
    core = a + np.sin(2 * kap * a) / (2 * kap)  # int_{-a}^{a} cos^2 = a + sin(2ka)/(2k)
    clad = 2 * np.cos(kap * a) ** 2 / (2 * gam)
    return n, core / (core + clad)


def slab_mesh(lx: float, ly: float, d: float, h_core: float, h_clad_max: float) -> MeshTri:
    ys = [-d / 2 + i * (d / max(1, round(d / h_core))) for i in range(int(max(1, round(d / h_core))) + 1)]
    y = list(ys)
    h = h_core
    yy = d / 2
    while yy < ly:
        h = min(h * 1.15, h_clad_max)
        yy = min(yy + h, ly)
        y.append(yy)
        y.insert(0, -yy)
    y = np.unique(np.round(np.array(y), 12))
    nx = max(2, int(round(lx / (2 * h_core))))
    x = np.linspace(-lx / 2, lx / 2, nx + 1)
    return MeshTri.init_tensor(x, y)


def eps_layers(mesh: MeshTri, core: tuple[float, float, float], clad: float, d: float):
    yc = mesh.p[1, mesh.t].mean(axis=0)
    inc = np.abs(yc) < d / 2
    exx = np.where(inc, core[0], clad)
    eyy = np.where(inc, core[1], clad)
    ezz = np.where(inc, core[2], clad)
    return exx, eyy, ezz, inc


def side_dofs(basis, which: str):
    if which == "all":
        return basis.get_dofs().flatten()
    ymax = basis.mesh.p[1].max()
    return basis.get_dofs(lambda x: np.isclose(np.abs(x[1]), ymax)).flatten()


def run_slab(mode: str, core, clad, mesh, order=2):
    from skfem import Basis, ElementTriN2, ElementTriP2

    exx, eyy, ezz, inc = eps_layers(mesh, core, clad, D)
    basis = Basis(mesh, ElementTriN2() * ElementTriP2())
    pec = side_dofs(basis, "all" if mode == "TE" else "tb")
    ms = FM.solve_modes(mesh, exx, eyy, ezz, LAM, num_modes=4, n_guess=np.sqrt(max(core)), order=order, pec=pec)
    ms = [m for m in ms if (FM.te_fraction(m) > 0.5) == (mode == "TE")]
    return ms[0], inc


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--pilot", action="store_true", help="coarse meshes only")
    a = ap.parse_args()
    log = Logger("gates")
    if a.dry_run:
        log.info("dry run: gates G1-G6 would run; no solves")
        return
    t0 = time.time()
    res: dict = {"date": time.strftime("%Y-%m-%d"), "versions": versions(), "gates": {}}
    core = (NE**2, NO**2, NO**2)
    clad = NC**2
    hs = [0.04, 0.02] if a.pilot else [0.04, 0.02, 0.01]
    # G1/G2
    n_te = slab_te(core[0], clad, D)
    n_tm = slab_tm(core[1], core[2], clad, D)
    for h in hs:
        mesh = slab_mesh(0.2, 3.0, D, h, 0.15)
        mte, _ = run_slab("TE", core, clad, mesh)
        mtm, _ = run_slab("TM", core, clad, mesh)
        log.info(f"G1 TE h={h}: n_fem={mte.n_eff:.10f} n_exact={n_te:.10f} err={mte.n_eff - n_te:+.2e} TEfrac={FM.te_fraction(mte):.6f}")
        log.info(f"G2 TM h={h}: n_fem={mtm.n_eff:.10f} n_exact={n_tm:.10f} err={mtm.n_eff - n_tm:+.2e}")
    res["gates"]["G1_te_slab"] = {"n_exact": n_te, "n_fem_finest": mte.n_eff, "err": mte.n_eff - n_te}
    res["gates"]["G2_tm_slab_aniso"] = {"n_exact": n_tm, "n_fem_finest": mtm.n_eff, "err": mtm.n_eff - n_tm}
    # G3 femwell isotropic vs own
    from femwell.maxwell.waveguide import compute_modes
    from skfem import Basis, ElementTriP0

    mesh = slab_mesh(0.2, 3.0, D, hs[-1], 0.15)
    exx, eyy, ezz, inc = eps_layers(mesh, (NE**2,) * 3, clad, D)
    b0 = Basis(mesh, ElementTriP0())
    fw = compute_modes(b0, exx.astype(float), wavelength=LAM, num_modes=2, order=2, metallic_boundaries=True,
                       n_guess=NE)
    fw_te = [m for m in fw.modes if m.te_fraction > 0.5][0]
    own = FM.solve_modes(mesh, exx, exx, exx, LAM, num_modes=2, n_guess=NE, pec=True)
    own_te = [m for m in own if FM.te_fraction(m) > 0.5][0]
    n_iso = slab_te(NE**2, clad, D)
    log.info(f"G3 femwell={fw_te.n_eff.real:.12f} own={own_te.n_eff:.12f} diff={fw_te.n_eff.real - own_te.n_eff:+.2e} exact={n_iso:.12f}")
    res["gates"]["G3_femwell_vs_own_iso"] = {"femwell": float(fw_te.n_eff.real), "own": own_te.n_eff, "exact": n_iso}
    # G4 parallel plates: two layers in series between y=0 and y=2 (eps_yy 44 for y<1, 3.9 above), Neumann sides
    w_pl, d1, d2 = 3.0, 1.0, 1.0
    for order in (1, 2):
        m = MeshTri.init_tensor(np.linspace(0, w_pl, 7), np.linspace(0, d1 + d2, 9))
        yc = m.p[1, m.t].mean(axis=0)
        exx_p = np.where(yc < d1, 28.0, 3.9)
        eyy_p = np.where(yc < d1, 44.0, 3.9)
        from skfem import ElementTriP1, ElementTriP2

        bb = Basis(m, ElementTriP2() if order == 2 else ElementTriP1())
        bot = bb.get_dofs(lambda x: np.isclose(x[1], 0)).flatten()
        top = bb.get_dofs(lambda x: np.isclose(x[1], d1 + d2)).flatten()
        r = ES.solve_es(m, exx_p, eyy_p, {"s": (top, 1.0), "g": (bot, 0.0)}, order=order)
        c_exact = ES.EPS0 * w_pl / (d1 / 44.0 + d2 / 3.9)
        log.info(f"G4 plates P{order}: C'={r.c_pul:.12e} exact={c_exact:.12e} rel={r.c_pul / c_exact - 1:+.2e}")
    # lateral field: plates at x=0 and x=w (uses eps_xx)
    m = MeshTri.init_tensor(np.linspace(0, 2.0, 9), np.linspace(0, 1.0, 5))
    bb = Basis(m, ElementTriP2())
    lft = bb.get_dofs(lambda x: np.isclose(x[0], 0)).flatten()
    rgt = bb.get_dofs(lambda x: np.isclose(x[0], 2.0)).flatten()
    nel = m.t.shape[1]
    r = ES.solve_es(m, np.full(nel, 28.0), np.full(nel, 44.0), {"s": (rgt, 1.0), "g": (lft, 0.0)})
    c_exact = ES.EPS0 * 28.0 * 1.0 / 2.0
    log.info(f"G4 lateral plates eps_xx: C'={r.c_pul:.12e} exact={c_exact:.12e} rel={r.c_pul / c_exact - 1:+.2e}")
    res["gates"]["G4_plates"] = {"lateral_rel_err": r.c_pul / c_exact - 1}
    # G5 uniform-field Pockels slab (TE; delta eps_xx in core) and TM (delta eps_zz, eps_yy separately)
    mesh = slab_mesh(0.2, 3.0, D, hs[-1], 0.15)
    mte, inc = run_slab("TE", core, clad, mesh)
    r33, E0 = 30.9e-12, 1e7  # V/m (0.1 V/um), illustrative
    dexx = -(NE**4) * r33 * E0
    qmask = FM.elem_mask_qp(mte.basis, inc)
    dn_pert = FM.perturbation_dneff(mte, {"xx": dexx * qmask})
    hstep = 1e-4
    dn_fd = (slab_te(core[0] + hstep, clad, D) - slab_te(core[0] - hstep, clad, D)) / (2 * hstep) * dexx
    n0, gam = slab_te_confinement(core[0], clad, D)
    dn_closed = -0.5 * NE**3 * r33 * E0 * (NE / n0) * gam
    log.info(f"G5 TE Pockels slab: dn_pert={dn_pert:.10e} dn_exact_fd={dn_fd:.10e} closed={dn_closed:.10e} "
             f"rel={dn_pert / dn_fd - 1:+.2e} Gamma_E={gam:.6f}")
    res["gates"]["G5_pockels_te"] = {"dn_pert": dn_pert, "dn_exact": dn_fd, "dn_closed_form": dn_closed,
                                     "gamma_E": gam, "E0_V_per_m": E0, "r33_m_per_V": r33}
    mtm, inc = run_slab("TM", core, clad, mesh)
    qmask = FM.elem_mask_qp(mtm.basis, inc)
    for comp, idx in (("zz", 2), ("yy", 1)):
        de = 1e-3
        dn_p = FM.perturbation_dneff(mtm, {comp: de * qmask})
        cp = list(core)
        cm = list(core)
        cp[idx] += hstep
        cm[idx] -= hstep
        dn_f = (slab_tm(cp[1], cp[2], clad, D) - slab_tm(cm[1], cm[2], clad, D)) / (2 * hstep) * de
        log.info(f"G5 TM d eps_{comp}: dn_pert={dn_p:.10e} dn_exact={dn_f:.10e} rel={dn_p / dn_f - 1:+.2e}")
        res["gates"][f"G5_tm_{comp}"] = {"dn_pert": dn_p, "dn_exact": dn_f}
    # G6 homogeneous: dn = deps/(2n), use TE mode of a slab with all-region perturbation equal -> d n_eff/d eps
    # exact for uniform scaling: n_eff^2 shifts by deps exactly (all eps + deps) -> dn = deps / (2 n_eff)
    allmask = np.ones_like(qmask)
    de = 1e-3
    dn_p = FM.perturbation_dneff(mte, {"xx": de * allmask, "yy": de * allmask, "zz": de * allmask})
    log.info(f"G6 uniform d eps everywhere: dn_pert={dn_p:.10e} expected d eps/(2 n_eff)={de / (2 * mte.n_eff):.10e}")
    res["gates"]["G6_uniform"] = {"dn_pert": dn_p, "expected": de / (2 * mte.n_eff)}
    # energy group index without dispersion = c / v_g ; compare to slab analytic FD in wavelength (no material disp.)
    ng_e = FM.group_index_energy(mte, (np.full(mesh.t.shape[1], 0.0) + np.where(inc, core[0], clad),
                                       np.where(inc, core[1], clad), np.where(inc, core[2], clad)))
    dl = 1e-4

    def n_at(lam):
        global K0
        k_save = K0
        K0 = 2 * np.pi / lam
        try:
            return slab_te(core[0], clad, D)
        finally:
            K0 = k_save

    ng_fd = mte.n_eff - LAM * (n_at(LAM + dl) - n_at(LAM - dl)) / (2 * dl)
    ng_exact = slab_te(core[0], clad, D) - LAM * (n_at(LAM + dl) - n_at(LAM - dl)) / (2 * dl)
    log.info(f"G7 energy ng (no material dispersion) = {ng_e:.8f}; closed-form slab ng = {ng_exact:.8f}; (FEM n + exact slope {ng_fd:.8f})")
    res["gates"]["G7_energy_ng"] = {"ng_energy": ng_e, "ng_exact": ng_exact}
    res["run_time_s"] = time.time() - t0
    out = ROOT / "reference" / "gates.json"
    out.write_text(json.dumps(res, indent=1, default=float))
    log.info(f"wrote {out}")


if __name__ == "__main__":
    main()
