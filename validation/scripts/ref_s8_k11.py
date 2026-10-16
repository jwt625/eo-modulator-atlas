"""S8 2D reference K11: lateral PN rib phase shifter in SOI (DevLog-040).

Stages (each heavy stage in a fresh process via eoref.util.run_isolated):
  --es K [--si-only] --npz F --out J   DEVSIM 2D drift-diffusion on tensor grid level K (junction-zone spacing
                                       h_A = 0.25 um / K): C'(V), carrier cuts and integrals; carriers saved to F.
  --optics --hj H --hcore H --npz ...  TE0 vector mode (half window, PEC) on a gmsh mesh with a junction box of size
                                       H_j; first-order complex dn_eff(V) for every npz (plasma dispersion, eoref.plasma).
  (default)                             orchestrate, extrapolate (round-2 rule), write reference/s8-K11.json.
Usage: ./run_guarded.sh scripts/ref_s8_k11.py [--pilot] [--dry-run] [--out PATH]
"""

from __future__ import annotations

import argparse
import importlib.metadata as md
import json
import math
import os
import sys
import tempfile
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from eoref import geom as G  # noqa: E402
from eoref import plasma as PL  # noqa: E402
from eoref import semi as S  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, run_isolated, versions  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
CASE = ROOT / "cases" / "K11.yaml"
ES_LEVELS = [25, 35, 50, 71]  # h_A = 10, 7.14, 5, 3.52 nm
HJ_LEVELS = [0.010, 0.00707, 0.005, 0.00354]  # um, optical junction-box element size
HCORE = 0.040  # um
HCORE_CHECK = 0.028
DV = 0.002  # V
CUT_X_UM = np.round(np.arange(-0.30, 0.30001, 0.01), 4)
CUT_Y_UM = (0.045, 0.155)


def all_versions() -> dict:
    v = versions()
    for p in ("devsim", "matplotlib"):
        try:
            v[p] = md.version(p)
        except md.PackageNotFoundError:
            v[p] = "absent"
    return v


# ---------------------------------------------------------------------------------------------------- geometry


def rects(case):
    return case["geometry_2d"]["regions"]


def is_si(case, x_um, y_um):
    hit = None
    for r in rects(case):
        (x0, x1), (y0, y1) = r["x_um"], r["y_um"]
        if x0 <= x_um <= x1 and y0 <= y_um <= y1:
            hit = r["material"]
    return hit


def doping_boxes(case) -> list[S.DopingBox]:
    out = []
    for d in case["geometry_2d"]["doping"]:
        x0, x1 = (v * 1e-4 for v in d["x_um"])
        if d is case["geometry_2d"]["doping"][-1]:
            x1 += 1e-12
        if float(d.get("donor_cm3", 0.0)) > 0:
            out.append(S.DopingBox("donor", float(d["donor_cm3"]), x0, x1))
        else:
            out.append(S.DopingBox("acceptor", float(d["acceptor_cm3"]), x0, x1))
    return out


HOX_MULT = 32.0  # oxide far-field spacing = HOX_MULT x h_A (scales with the level; audit Q1)
XMAX_MULT = 16.0  # max x spacing outside the rib = XMAX_MULT x h_A
H_REF_UM = 0.010  # h_A of the coarsest level (K = 25)
RX0, RY0 = 0.25, 0.30  # grading excess (ratio - 1) at the coarsest level, x (slab outside the rib) and y (oxide)


def grid_lines(K: int, si_only: bool, hox_scale: float = 1.0):
    """Tensor grid lines (um). Junction zone |x| <= 0.25 uniform h_A = 0.25/K (nodes at 0 and +-0.25).
    Every spacing scales with h_A, including the oxide far field (HOX_MULT h_A x hox_scale, no cap)."""
    hA = 0.25 / K
    sc = hA / H_REF_UM  # refinement scale: every spacing AND every grading excess (ratio - 1) scales with h_A, so
    #                     the size function h(d) ~ sc (h0 + g d) refines uniformly (fixed-ratio grading does not)
    rx = 1 + RX0 * sc
    ry = 1 + RY0 * sc
    xa = np.linspace(0.0, 0.25, K + 1)
    xb = S.graded_line(0.25, 1.25, hA, hA, XMAX_MULT * hA, rx)
    xc = S.graded_line(1.25, 2.5, hA, XMAX_MULT * hA, XMAX_MULT * hA, rx)
    xp = S.join_lines(xa, xb, xc)
    xs = S.join_lines(-xp[::-1], xp)
    ysi = S.join_lines(S.uniform_line(0.0, 0.09, hA), S.uniform_line(0.09, 0.22, hA))
    if si_only:
        ys = ysi
    else:
        hox = HOX_MULT * hA * hox_scale
        ybox = S.graded_line(-2.0, 0.0, hox, hA, hox, ry)
        ycl = S.graded_line(0.22, 2.22, hA, hox, hox, ry)
        ys = S.join_lines(ybox, ysi, ycl)
    return xs, ys, hA


# ---------------------------------------------------------------------------------------------------- ES stage


def stage_es(case, K: int, si_only: bool, npz: str, out: str, biases: list[float], hox_scale: float = 1.0):
    from eoref import semi_devsim as SD

    t0 = time.time()
    xs, ys, hA = grid_lines(K, si_only, hox_scale)

    def reg(xc, yc):
        m = is_si(case, xc * 1e4, yc * 1e4)  # cell centres arrive in cm
        if m == "silicon":
            return "silicon"
        if m == "silicon_dioxide" and not si_only:
            return "oxide"
        return None

    cts = [(c["name"], "silicon", c["x_um"][0] * 1e-4, c["x_um"][1] * 1e-4, c["y_um"][0] * 1e-4, c["y_um"][1] * 1e-4)
           for c in case["geometry_2d"]["contacts"]]
    coords, els, names, _ = SD.tensor_mesh_lists(xs * 1e-4, ys * 1e-4, reg, cts)
    nd_x, na_x = S.cell_average_doping_1d(doping_boxes(case), xs * 1e-4)

    def dop(xx, _yy):
        idx = np.searchsorted(xs * 1e-4, np.asarray(xx) - 1e-13)
        idx = np.clip(idx, 0, len(xs) - 1)
        ok = np.abs(xs[idx] * 1e-4 - xx) < 1e-12
        if not ok.all():
            raise RuntimeError("node x not on a grid line")
        return nd_x[idx], na_x[idx]

    rec = case["models"]["recombination"]
    eps_si = case["materials"]["silicon"]["eps_r"]
    eps_ox = case["materials"]["silicon_dioxide"]["eps_r"]
    with SD.quiet():
        dev = SD.DevsimDevice(f"k11_{K}_{int(si_only)}", coords, els, names, ["anode", "cathode"], not si_only,
                              eps_si, eps_ox, rec["tau_n_s"], rec["tau_p_s"], dop)
        dev.rel = 1e-10  # carrier update floor ~1.6e-12 in 2D (DevLog-040)
        info = dev.solve(maxit=100)
    if not info.get("converged", False):
        raise RuntimeError("equilibrium did not converge")
    import matplotlib.tri as mtri

    xu, yu = dev.x * 1e4, dev.y * 1e4
    tri = dev.triangles()
    T = mtri.Triangulation(xu, yu, tri)
    cx = np.concatenate([CUT_X_UM for _ in CUT_Y_UM])
    cy = np.concatenate([np.full_like(CUT_X_UM, y) for y in CUT_Y_UM])
    rows, ns, ps = [], [], []
    n_dv_checks = []
    for V in biases:
        with SD.quiet():
            dev.ramp("anode", V, step=0.25)
        ne, nh = [], []
        for s in (+1, -1):
            with SD.quiet():
                dev.ramp("anode", V + s * DV, step=0.01)
            ne.append(dev.integral("Electrons"))
            nh.append(dev.integral("Holes"))
        if V in (biases[0], biases[-1]):
            ne2 = []
            for s in (+1, -1):
                with SD.quiet():
                    dev.ramp("anode", V + 2 * s * DV, step=0.01)
                ne2.append(dev.integral("Electrons"))
            c1 = S.Q * abs(ne[0] - ne[1]) / (2 * DV)
            c2 = S.Q * abs(ne2[0] - ne2[1]) / (4 * DV)
            n_dv_checks.append({"V": V, "C_dV": c1, "C_2dV": c2, "rel_err_dV_est": abs(c2 / c1 - 1) / 3})
        with SD.quiet():
            dev.ramp("anode", V, step=0.01)
        n = dev.values("Electrons")
        p = dev.values("Holes")
        ns.append(n)
        ps.append(p)
        ln_n = mtri.LinearTriInterpolator(T, np.log(n))(cx, cy)
        ln_p = mtri.LinearTriInterpolator(T, np.log(p))(cx, cy)
        J = dev.contact_current("cathode")
        rows.append({
            "V": V,
            "C_F_cm": S.Q * abs(ne[0] - ne[1]) / (2 * DV),
            "C_holes_F_cm": S.Q * abs(nh[0] - nh[1]) / (2 * DV),
            "Ne_tot_per_cm": dev.integral("Electrons"),
            "Nh_tot_per_cm": dev.integral("Holes"),
            "cut_n_cm3": [None if not np.isfinite(v) else float(v) for v in np.exp(np.ma.filled(ln_n, np.nan))],
            "cut_p_cm3": [None if not np.isfinite(v) else float(v) for v in np.exp(np.ma.filled(ln_p, np.nan))],
            "I_cathode_A_per_cm": J,
        })
    np.savez(npz, x_um=xu, y_um=yu, tri=tri, n=np.array(ns), p=np.array(ps), biases=np.array(biases))
    res = {"K": K, "h_A_nm": hA * 1e3, "si_only": si_only, "hox_um": HOX_MULT * hA * hox_scale, "n_x_lines": len(xs), "n_y_lines": len(ys),
           "n_si_nodes": int(len(xu)), "rows": rows, "dV_checks": n_dv_checks, "seconds": time.time() - t0,
           "max_rss_MB": max_rss_mb()}
    Path(out).write_text(json.dumps(res, default=float))


# ---------------------------------------------------------------------------------------------------- optics


def optical_layout(case, half=True):
    o = case["optics"]
    win = {"x_um": [0.0 if half else o["window_x_um"][0], o["window_x_um"][1]], "y_um": o["window_y_um"]}
    regs = []
    for r in rects(case):
        regs.append({"name": r["name"], "material": r["material"], "rect": {"x_um": r["x_um"], "y_um": r["y_um"]}})
    # split silicon pieces at the doping steps so the optical mesh conforms to them
    cuts = sorted({v for d in case["geometry_2d"]["doping"] for v in d["x_um"]})
    out = []
    for r in regs:
        if r["material"] != "silicon":
            out.append(r)
            continue
        x0, x1 = r["rect"]["x_um"]
        pts = [x0] + [c for c in cuts if x0 < c < x1] + [x1]
        for k, (a, b) in enumerate(zip(pts[:-1], pts[1:], strict=True)):
            out.append({"name": f"{r['name']}_{k}", "material": "silicon", "rect": {"x_um": [a, b], "y_um": r["rect"]["y_um"]}})
    geom = {"domain": win, "regions": out, "electrodes": []}
    return geom, win


def stage_optics(case, hj: float, hcore: float, npzs: list[str], out: str, resolve_check: bool):
    from skfem import ElementTriP0

    from eoref import fmode as FM
    from eoref import materials as M

    t0 = time.time()
    lam_um = case["optics"]["wavelength_nm"] * 1e-3
    geom, win = optical_layout(case, half=True)
    layout = G.build_layout(geom, clip=G.window_polygon(win), electrodes="absent")
    rules = [G.SizeRule("box", hcore, 0.2, 0.3, x=(0.0, 0.45), y=(-0.15, 0.37)),
             G.SizeRule("box", hj, 0.2, 0.3, x=(0.0, 0.20), y=(0.0, 0.22)),
             G.SizeRule("curves", 2.5 * hcore, 0.2, 0.3, labels=tuple(p.label for p in layout.pieces
                                                                      if p.label.startswith("slab")))]
    corners = [(0.25, 0.09), (0.25, 0.22)]
    rules.append(G.SizeRule("points", 0.0005, 0.2, 0.3, pts=tuple(corners)))
    mr = G.mesh_layout(layout, rules, hmax=0.3)
    n_si = float(M.n_of("si", lam_um))
    n_ox = float(M.n_of("sio2", lam_um))
    eps_mat = {"silicon": n_si**2, "silicon_dioxide": n_ox**2}
    e = np.array([eps_mat[m] for m in mr.materials])
    ms = FM.solve_modes(mr.mesh, e, e, e, lam_um, num_modes=4, n_guess=3.0, order=2, pec=True)
    te = [m for m in ms if FM.te_fraction(m) > 0.5]
    m = te[0]
    f = m.fields_qp()
    dx = m.basis.dx
    qx, qy = FM.quad_points(m.basis)
    si_el = np.array([mat == "silicon" for mat in mr.materials])
    si_qp = np.repeat(si_el[:, None], qx.shape[1], axis=1)
    px, py = qx[si_qp], qy[si_qp]
    import matplotlib.tri as mtri

    models = [k for k, v in PL.MODELS.items() if v["available"]]
    res = {"hj_um": hj, "hcore_um": hcore, "n_elements": int(mr.n_elems), "n_eff": m.n_eff, "te_fraction":
           FM.te_fraction(m), "n_si": n_si, "n_sio2": n_ox, "modes": [(mm.n_eff, FM.te_fraction(mm)) for mm in ms],
           "per_npz": []}

    def dneff(deps_qp_complex):
        re = FM.perturbation_from_fields(f, dx, {"xx": deps_qp_complex.real, "yy": deps_qp_complex.real,
                                                 "zz": deps_qp_complex.real})
        im = FM.perturbation_from_fields(f, dx, {"xx": deps_qp_complex.imag, "yy": deps_qp_complex.imag,
                                                 "zz": deps_qp_complex.imag})
        return complex(re, im)

    for npz in npzs:
        z = np.load(npz)
        T = mtri.Triangulation(z["x_um"], z["y_um"], z["tri"])
        biases = [float(b) for b in z["biases"]]
        NE, NH = [], []
        n_masked = 0
        for k in range(len(biases)):
            vals = []
            for arr in (z["n"][k], z["p"][k]):
                it = mtri.LinearTriInterpolator(T, np.log(arr))
                a = it(px, py)
                b = it(-px, py)
                n_masked += int(np.ma.count_masked(a) + np.ma.count_masked(b))
                vals.append((np.exp(np.ma.filled(a, np.nan)), np.exp(np.ma.filled(b, np.nan))))
            NE.append(vals[0])
            NH.append(vals[1])
        per = {"npz": Path(npz).name, "n_masked_points": n_masked, "models": {}}
        for model in models:
            rows = []
            for k, V in enumerate(biases):
                out_v = {"V": V}
                # primary: f(N(V)) - f(N(0)), mirrored average of the two half-plane samples
                d_now = [PL.dn_dalpha(model, NE[k][s], NH[k][s]) for s in (0, 1)]
                d_ref = [PL.dn_dalpha(model, NE[0][s], NH[0][s]) for s in (0, 1)]
                q = np.zeros_like(qx, dtype=complex)
                q[si_qp] = 0.5 * sum(PL.deps_complex(n_si, d_now[s][0] - d_ref[s][0], d_now[s][1] - d_ref[s][1], lam_um)
                                     for s in (0, 1))
                dn = dneff(q)
                qa = np.zeros_like(qx, dtype=complex)
                qa[si_qp] = 0.5 * sum(PL.deps_complex(n_si, 0.0 * d_now[s][0], d_now[s][1], lam_um) for s in (0, 1))
                a_abs = dneff(qa)
                # secondary: fit applied to the density changes
                d2 = [PL.dn_dalpha_signed_change(model, NE[k][s] - NE[0][s], NH[k][s] - NH[0][s]) for s in (0, 1)]
                q2 = np.zeros_like(qx, dtype=complex)
                q2[si_qp] = 0.5 * sum(PL.deps_complex(n_si, d2[s][0], d2[s][1], lam_um) for s in (0, 1))
                dn2 = dneff(q2)
                k0cm = 2 * math.pi / (lam_um * 1e-4)
                out_v.update({
                    "dneff_re": dn.real, "dneff_im": dn.imag,
                    "dalpha_mode_cm": 2 * k0cm * dn.imag,
                    "alpha_mode_cm": 2 * k0cm * a_abs.imag,
                    "dneff_re_secondary": dn2.real, "dalpha_mode_cm_secondary": 2 * k0cm * dn2.imag,
                })
                rows.append(out_v)
            per["models"][model] = rows
        if resolve_check and npz == npzs[-1]:
            # direct re-solve with element-averaged Re d eps at the last bias vs first-order with the same P0 field
            model = models[0]
            k = len(biases) - 1
            d_now = [PL.dn_dalpha(model, NE[k][s], NH[k][s]) for s in (0, 1)]
            d_ref = [PL.dn_dalpha(model, NE[0][s], NH[0][s]) for s in (0, 1)]
            q = np.zeros_like(qx)
            q[si_qp] = 0.5 * sum(2 * n_si * (d_now[s][0] - d_ref[s][0]) for s in (0, 1))
            w = dx / dx.sum(axis=1, keepdims=True)
            q_el = (q * w).sum(axis=1)
            e2 = e + q_el
            ms2 = FM.solve_modes(mr.mesh, e2, e2, e2, lam_um, num_modes=4, n_guess=3.0, order=2, pec=True)
            m2 = [mm for mm in ms2 if FM.te_fraction(mm) > 0.5][0]
            b0 = m.basis.with_element(ElementTriP0())
            qp0 = b0.interpolate(q_el).value
            pert = FM.perturbation_from_fields(f, dx, {"xx": qp0, "yy": qp0, "zz": qp0})
            res["resolve_check"] = {"model": model, "V": biases[k], "dneff_resolve": m2.n_eff - m.n_eff,
                                    "dneff_first_order_P0": pert, "rel_diff": (m2.n_eff - m.n_eff) / pert - 1}
        res["per_npz"].append(per)
    res["seconds"] = time.time() - t0
    res["max_rss_MB"] = max_rss_mb()
    Path(out).write_text(json.dumps(res, default=float))


# ---------------------------------------------------------------------------------------------------- orchestration


def ext(hs, fs, p=2.0):
    r = richardson(hs, fs, p)
    return {"value": r["f_ext"], "U": r["U"], "f_finest": r["f_finest"], "method": r["method"], "p": r["p"],
            "levels": r}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--es", type=int)
    ap.add_argument("--si-only", action="store_true")
    ap.add_argument("--hox-scale", type=float, default=1.0)
    ap.add_argument("--npz")
    ap.add_argument("--optics", action="store_true")
    ap.add_argument("--hj", type=float)
    ap.add_argument("--hcore", type=float, default=HCORE)
    ap.add_argument("--npzs", nargs="*")
    ap.add_argument("--resolve-check", action="store_true")
    ap.add_argument("--biases", nargs="*", type=float)
    ap.add_argument("--out")
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    case = G.load_case(CASE)
    biases = a.biases if a.biases else case["bias"]["values_V"]
    if a.es is not None:
        stage_es(case, a.es, a.si_only, a.npz, a.out, biases, a.hox_scale)
        return
    if a.optics:
        stage_optics(case, a.hj, a.hcore, a.npzs, a.out, a.resolve_check)
        return
    es_levels = ES_LEVELS[:2] if a.pilot else ES_LEVELS
    hj_levels = HJ_LEVELS[:2] if a.pilot else HJ_LEVELS
    if a.pilot:
        biases = [biases[0], biases[4], biases[-1]]
    out = Path(a.out) if a.out else ROOT / "reference" / "s8-K11.json"
    plan = {"es_levels": es_levels, "hj_levels": hj_levels, "biases": biases, "out": str(out),
            "tmpdir": tempfile.gettempdir()}
    if a.dry_run:
        print(json.dumps(plan, indent=1))
        return
    log = Logger("s8-K11")
    log.info(f"plan {plan}")
    t0 = time.time()
    script = str(Path(__file__).resolve())
    tmp = Path(tempfile.mkdtemp(prefix="s8k11-"))
    bargs = ["--biases", *[str(b) for b in biases]]
    es, es_si = [], []
    try:
        for K in es_levels:
            for si_only, store in ((False, es), (True, es_si)):
                npz = str(tmp / f"es_{K}_{int(si_only)}.npz")
                r = run_isolated(script, ["--es", str(K), "--npz", npz, *bargs] + (["--si-only"] if si_only else []),
                                 f"es{K}{int(si_only)}")
                r["npz"] = npz
                store.append(r)
                log.info(f"ES K={K} si_only={si_only} h_A {r['h_A_nm']:.3f} nm nodes(Si) {r['n_si_nodes']} "
                         f"C'(0) {r['rows'][0]['C_F_cm']:.9e} F/cm ({r['seconds']:.1f} s, {r['max_rss_MB']:.0f} MB)")
        # oxide-mesh check (audit Q1): oxide far-field spacing halved at the second-finest level (the finest level
        # with a halved oxide exceeds the 1.4 GiB cap)
        k_chk = es_levels[-2]
        npz_chk = str(tmp / f"es_{k_chk}_oxhalf.npz")
        ox_chk = run_isolated(script, ["--es", str(k_chk), "--hox-scale", "0.5", "--npz", npz_chk, *bargs], "esox")
        log.info(f"ES oxide check K={k_chk} hox {ox_chk['hox_um']:.4f} um C'(0) {ox_chk['rows'][0]['C_F_cm']:.9e} "
                 f"({ox_chk['seconds']:.1f} s, {ox_chk['max_rss_MB']:.0f} MB)")
        npz_all = [r["npz"] for r in es]
        opt = []
        hj_main = hj_levels[-2] if not a.pilot else hj_levels[-1]
        for hj in hj_levels:
            npzs = npz_all + [npz_chk] if hj == hj_main else [npz_all[-1]]
            r = run_isolated(script, ["--optics", "--hj", str(hj), "--hcore", str(HCORE), "--npzs", *npzs]
                             + (["--resolve-check"] if hj == hj_levels[0] else []), f"opt{hj}")
            opt.append(r)
            log.info(f"optics hj {hj} n_eff {r['n_eff']:.9f} elems {r['n_elements']} ({r['seconds']:.1f} s, "
                     f"{r['max_rss_MB']:.0f} MB)")
        rc = run_isolated(script, ["--optics", "--hj", str(hj_main), "--hcore", str(HCORE_CHECK), "--npzs",
                                   npz_all[-1]], "optcore")
        log.info(f"optics core check hcore {HCORE_CHECK} n_eff {rc['n_eff']:.9f} ({rc['seconds']:.1f} s)")
    finally:
        for fpath in tmp.glob("*.npz"):
            fpath.unlink()
        tmp.rmdir()
    doc = assemble(case, es, es_si, opt, rc, hj_main, biases, a.pilot, ox_chk, k_chk)
    doc["seconds"] = time.time() - t0
    out.write_text(json.dumps(doc, indent=1, default=float, allow_nan=False) + "\n")
    log.info(f"wrote {out} ({doc['seconds']:.1f} s)")


def assemble(case, es, es_si, opt, rc, hj_main, biases, pilot, ox_chk, k_chk):
    lam_cm = case["optics"]["wavelength_nm"] * 1e-7
    hs = [r["h_A_nm"] for r in es]
    rel_dv = max(c["rel_err_dV_est"] for r in (es[-1], es_si[-1]) for c in r["dV_checks"])
    rows = []
    o_main = [o for o in opt if o["hj_um"] == hj_main][0]
    models = list(o_main["per_npz"][0]["models"].keys())
    i_chk = [r["K"] for r in es].index(k_chk)
    n_es = len(es)
    for k, V in enumerate(biases):
        row = {"V_pn": V}
        for key, src in (("C_F_cm", es), ("C_si_only_F_cm", es_si)):
            e = ext(hs, [r["rows"][k]["C_F_cm"] for r in src])
            e["U_mesh"] = e["U"]
            e["U_dV"] = rel_dv * abs(e["value"])
            # oxide-mesh term: |C(hox/2) - C(hox)| at level k_chk (oxide variant only; Si-only has no oxide)
            e["U_ox"] = abs(ox_chk["rows"][k]["C_F_cm"] - src[i_chk]["rows"][k]["C_F_cm"]) if key == "C_F_cm" else 0.0
            e["U"] = e["U_mesh"] + e["U_dV"] + e["U_ox"]
            row[key] = e
            row[key.replace("F_cm", "pF_cm")] = e["value"] * 1e12
        row["C_holes_vs_electrons_rel_finest"] = es[-1]["rows"][k]["C_holes_F_cm"] / es[-1]["rows"][k]["C_F_cm"] - 1
        row["Ne_tot_per_cm_finest"] = es[-1]["rows"][k]["Ne_tot_per_cm"]
        row["Nh_tot_per_cm_finest"] = es[-1]["rows"][k]["Nh_tot_per_cm"]
        row["carrier_cuts_finest"] = {"x_um": CUT_X_UM.tolist(), "y_um": list(CUT_Y_UM),
                                      "n_cm3": es[-1]["rows"][k]["cut_n_cm3"], "p_cm3": es[-1]["rows"][k]["cut_p_cm3"],
                                      "layout": "n_cm3 and p_cm3 are the y = 0.045 um cut followed by the y = 0.155 um cut; "
                                                "null = point outside silicon"}
        row["optics"] = {}
        for model in models:
            om = {}
            for qk in ("dneff_re", "dalpha_mode_cm", "alpha_mode_cm", "dneff_re_secondary", "dalpha_mode_cm_secondary"):
                es_series = [p["models"][model][k][qk] for p in o_main["per_npz"][:n_es]]
                u_ox = abs(o_main["per_npz"][n_es]["models"][model][k][qk] - o_main["per_npz"][i_chk]["models"][model][k][qk])
                e_es = ext(hs, es_series)
                hj_series = [o["per_npz"][-1]["models"][model][k][qk] for o in opt]
                e_hj = ext([o["hj_um"] * 1e3 for o in opt], hj_series)
                core = rc["per_npz"][-1]["models"][model][k][qk]
                main_finest = o_main["per_npz"][-1]["models"][model][k][qk]
                u_core = abs(core - main_finest)
                # reference: ES-extrapolated value at the main optical mesh, shifted by the optical-mesh extrapolation
                val = e_es["value"] + (e_hj["value"] - main_finest)
                om[qk] = {"value": val, "U": e_es["U"] + e_hj["U"] + u_core + u_ox, "U_es": e_es["U"], "U_hj": e_hj["U"],
                          "U_hcore": u_core, "U_ox": u_ox, "finest_es_main_optics": main_finest, "es_levels": e_es["levels"],
                          "hj_levels": e_hj["levels"]}
            dnr = om["dneff_re"]
            if V != 0.0:
                vpil = abs(V) * lam_cm / (2 * abs(dnr["value"]))
                om["VpiL_V_cm"] = {"value": vpil, "U": vpil * dnr["U"] / abs(dnr["value"])}
                vs = abs(V) * lam_cm / (2 * abs(om["dneff_re_secondary"]["value"]))
                om["VpiL_V_cm_secondary"] = {"value": vs}
            else:
                om["VpiL_V_cm"] = None
                om["VpiL_V_cm_secondary"] = None
            om["dalpha_mode_dB_cm"] = om["dalpha_mode_cm"]["value"] * 10 / math.log(10)
            om["alpha_mode_dB_cm"] = om["alpha_mode_cm"]["value"] * 10 / math.log(10)
            row["optics"][model] = om
        for model, v in PL.MODELS.items():
            if not v["available"]:
                row["optics"][model] = "pending: coefficients not read (PDF not available to lane T5)"
        rows.append(row)
    return {
        "case": "K11", "case_file": "validation/cases/K11.yaml", "case_sha256": G.file_sha256(CASE),
        "date": time.strftime("%Y-%m-%d"), "lane": "T5 S8-REF (DevLog-040)", "pilot": pilot,
        "tools": {"devsim": "DEVSIM 2.11.0 (Apache-2.0), own models via the DEVSIM model API, own tensor grid",
                  "optics": "eoref.fmode vector FEM N2/P2, gmsh mesh (half window, TE mirror, PEC)",
                  "plasma": "eoref.plasma (own implementation)"},
        "models": {"n_i_cm3": S.NI, "T_K": S.T_K, "mobility": S.MASETTI,
                   "srh": "Shockley and Read 1952 eq. (4.4), (5.4); n1 = p1 = n_i",
                   "statistics": "Boltzmann, complete ionisation, no bandgap narrowing, no Auger",
                   "plasma_dispersion": {k: {kk: vv for kk, vv in v.items()} for k, v in PL.MODELS.items()}},
        "definitions": {
            "V_pn": "V(anode, p contact) - V(cathode, n contact); reverse bias < 0",
            "C_F_cm": "q |d N_e,tot / dV| per unit length (F/cm), N_e,tot = integral of n over the silicon, "
                      "central difference dV = 2 mV; oxide included as Poisson-only dielectric (zero-flux outer boundary)",
            "C_si_only_F_cm": "same with the oxide removed (zero normal flux on all silicon surfaces)",
            "U": "U_mesh (round-2 rule, p_formal 2, three finest ES levels in h_A; every grid spacing and grading excess "
                 "scales with h_A) + U_dV (|C(2dV)-C(dV)|/3) + U_ox (|C(oxide spacing / 2) - C| at the second-finest level, "
                 "oxide variant only)",
            "dn_Si": "f(N_e(V), N_h(V)) - f(N_e(0), N_h(0)) with f the absolute-density fit (primary); "
                     "secondary: f applied to the density changes, sign-preserving",
            "d_eps": "2 n_Si (dn + i lambda d alpha / (4 pi)), Si only, mirrored half-window average",
            "dneff_re": "Re of int E* . d eps . E dA / (4 P'), first order, unperturbed TE0",
            "dalpha_mode_cm": "4 pi Im(dn_eff) / lambda, cm^-1 (power), change relative to 0 V",
            "alpha_mode_cm": "absolute free-carrier modal loss at V from f_alpha(N(V)) (doping-induced, incl. contacts)",
            "VpiL_V_cm": "|V| lambda / (2 |dneff_re(V)|), single arm",
            "optics_value": f"ES-extrapolated value at the main optical mesh (h_j = {hj_main:g} um) + (h_j-extrapolated - "
                            "h_j finest at the finest ES level)",
            "optics_U": "U_es + U_hj + |h_core 28 nm - 40 nm| at the finest ES level + U_ox (oxide-halving check)",
        },
        "gate_roles": {
            "C_si_only_F_cm": "primary C' gate (no oxide; insensitive to the electrostatic domain)",
            "C_F_cm": "secondary C' gate, valid only on the identical electrostatic domain (comparison_conditions); "
                      "+1.3 % (0 V) to +2.6 % (-4 V) for BOX bottom -4 um / cladding top 4.22 um (audit Q2, K = 35)",
            "dneff_re, dalpha_mode_cm, alpha_mode_cm, VpiL_V_cm": "primary optical gates (primary dn_Si definition); "
                      "domain sensitivity ~2-3e-4 relative (audit Q2)",
            "secondary definition (fit on density changes)": "informational only, do not gate",
        },
        "comparison_conditions": {
            "electrostatic_domain_um": {"x": [-2.5, 2.5], "y": [-2.0, 2.22]},
            "outer_boundary": "zero normal flux (homogeneous Neumann) on all four outer edges, oxide and silicon",
            "substrate": "not modelled (no silicon below the BOX, no ground plane)",
            "metal": "none; ohmic contacts only",
            "contacts": "anode on the silicon slab end face x = -2.5 um, y in [0, 0.09] um (p+); cathode on x = +2.5 um, "
                        "y in [0, 0.09] um (n+); ideal ohmic (charge-neutral equilibrium n, p; psi = V + V_t ln(n_eq/n_i)); "
                        "1.25 um of p+ / n+ between each contact and the p / n edge (x = -+1.25 um)",
            "contact_corner_nodes": "the 4 oxide nodes at the contact corners are not tied to silicon (DEVSIM keeps "
                                    "contact nodes out of interfaces); effect <= 1.6e-5 relative on C' (audit Q7)",
            "bias": "anode swept, cathode at the 0 V reference (plus the constant gauge offset), V_pn = V_anode",
            "optics": "same geometry, PEC window x in [-2.5, 2.5], y in [-1.5, 1.72] um, half window with TE mirror",
        },
        "rows": rows,
        "es_levels": [{k: v for k, v in r.items() if k not in ("rows", "npz")} | {"C_F_cm": [x["C_F_cm"] for x in r["rows"]]}
                      for r in es],
        "es_si_only_levels": [{k: v for k, v in r.items() if k not in ("rows", "npz")}
                              | {"C_F_cm": [x["C_F_cm"] for x in r["rows"]]} for r in es_si],
        "optics_levels": [{k: v for k, v in o.items() if k != "per_npz"}
                          | {"n_masked_points_per_npz": [p["n_masked_points"] for p in o["per_npz"]]} for o in opt],
        "optics_core_check": {k: v for k, v in rc.items() if k != "per_npz"},
        "oxide_mesh_check": {k: v for k, v in ox_chk.items() if k not in ("rows", "npz")}
        | {"C_F_cm": [x["C_F_cm"] for x in ox_chk["rows"]], "reference_level_C_F_cm":
           [x["C_F_cm"] for x in es[i_chk]["rows"]]},
        "grid": {"HOX_MULT": HOX_MULT, "XMAX_MULT": XMAX_MULT, "H_REF_UM": H_REF_UM, "RX0": RX0, "RY0": RY0,
                 "rule": "h_A = 0.25 um / K; ratio_x = 1 + RX0 h_A/H_REF, ratio_y = 1 + RY0 h_A/H_REF; oxide far field "
                         "HOX_MULT h_A; slab outside the rib <= XMAX_MULT h_A"},
        "versions": all_versions(),
        "env": {"OMP_NUM_THREADS": os.environ.get("OMP_NUM_THREADS")},
    }


if __name__ == "__main__":
    main()
