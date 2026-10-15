"""K6: coplanar waveguide references, closed-form conformal mapping and scikit-fem P2 electrostatics.

Closed form (zero thickness, infinitely wide grounds, infinite lateral extent):
  k0 = S / (S + 2W), C0' = 4 eps0 K(k0) / K(k0'), k' = sqrt(1 - k^2)
  K6a half-space:      eps_eff = (eps_r + 1) / 2
  K6b layer h, air below (Ghione and Naldi, Electron. Lett. 20, 179 (1984); Gupta et al., Microstrip Lines and
  Slotlines, 2nd ed., Artech House 1996, Ch. 7; Simons, Coplanar Waveguide Circuits, Wiley 2001, Sec. 2.2):
      k1 = sinh(pi S / 4h) / sinh(pi (S + 2W) / 4h), q1 = (1/2) [K(k1)/K(k1')] / [K(k0)/K(k0')],
      eps_eff = 1 + q1 (eps_r - 1)
  C' = eps_eff C0', n_RF = sqrt(eps_eff), Z0 = 1 / (c sqrt(C' C0')) = 30 pi K(k0') / (sqrt(eps_eff) K(k0)).
scipy.special.ellipk takes the parameter m = k^2.
FEM: electrodes as zero-thickness embedded lines (t = 0) and as the 0.1 um areas of the YAML; domain sizes 250, 500
(YAML), 1000, 2000 um with grounds to the domain edge and zero-flux outer boundary.

Run: uv run python scripts/ref_cpw.py K6a [--pilot] [--dry-run]
"""

from __future__ import annotations

import argparse
import copy
import gc
import json
import sys
import time
from pathlib import Path

import numpy as np
from scipy.constants import epsilon_0 as EPS0
from scipy.special import ellipk

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eoref import es as ES  # noqa: E402
from eoref import geom as G  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, versions  # noqa: E402

SCALES = [2.0, 2**0.5, 1.0]
PILOT = [4.0, 2.0]


def kratio(k: float) -> float:
    return float(ellipk(k * k) / ellipk(1 - k * k))


def closed_form(S: float, W: float, eps_r: float, h: float | None) -> dict:
    k0 = S / (S + 2 * W)
    c0 = 4 * EPS0 * kratio(k0)
    if h is None:
        eps_eff = (eps_r + 1) / 2
        q1 = 0.5
    else:
        k1 = np.sinh(np.pi * S / (4 * h)) / np.sinh(np.pi * (S + 2 * W) / (4 * h))
        q1 = 0.5 * kratio(k1) / kratio(k0)
        eps_eff = 1 + q1 * (eps_r - 1)
    c = eps_eff * c0
    return {"k0": k0, "q1": float(q1), "eps_eff": float(eps_eff), **ES.line_params(c, c0)}


def params(case: dict) -> tuple[float, float, float, float | None, float]:
    el = {e["name"]: G.shape_polygon(e).bounds for e in case["geometry"]["electrodes"]}
    S = el["signal"][2] - el["signal"][0]
    W = el["ground_r"][0] - el["signal"][2]
    eps_r = float(case["materials"]["dielectric"]["eps_r"])
    sub = [r for r in case["geometry"]["regions"] if r["name"] == "substrate"][0]["rect"]["y_um"]
    dom = case["geometry"]["domain"]["y_um"]
    h = None if abs(sub[0] - dom[0]) < 1e-9 else sub[1] - sub[0]
    t = el["signal"][3] - el["signal"][1]
    return S, W, eps_r, h, t


def with_domain(case: dict, R: float) -> dict:
    c = copy.deepcopy(case)
    g = c["geometry"]
    old = g["domain"]["x_um"][1]
    g["domain"] = {"x_um": [-R, R], "y_um": [-R, R]}

    def fix(v):
        return [(-R if x == -old else (R if x == old else x)) for x in v]

    for r in g["regions"] + g["electrodes"]:
        r["rect"]["x_um"] = fix(r["rect"]["x_um"])
        r["rect"]["y_um"] = fix(r["rect"]["y_um"])
    return c


def solve(case: dict, s: float, mode: str, log: Logger) -> dict:
    t0 = time.time()
    S, W, eps_r, h, t = params(case)
    geom = case["geometry"]
    layout = G.build_layout(geom, electrodes=mode)
    edges = [(-S / 2 - W, 0.0), (-S / 2, 0.0), (S / 2, 0.0), (S / 2 + W, 0.0)]
    if mode == "area":
        edges += [(x, t) for x, _ in edges]
    hmax = 40.0 * s
    rules = [G.SizeRule("points", 0.004 * s, 0.15, hmax, pts=tuple(edges)),
             G.SizeRule("box", 0.25 * s, 0.15, hmax, x=(-S / 2 - W - 2, S / 2 + W + 2), y=(-3.0, 3.0))]
    if h is not None:
        rules.append(G.SizeRule("box", 0.5 * s, 0.15, hmax, x=(-S / 2 - W - 20, S / 2 + W + 20), y=(-h - 2, 1.0)))
    mr = G.mesh_layout(layout, rules, hmax=hmax)
    from skfem import Basis, ElementTriP2

    basis = Basis(mr.mesh, ElementTriP2())
    lab = np.array(mr.labels)
    eps = np.array([1.0 if m in ("air", "gold") else eps_r for m in mr.materials])
    dmap = {}
    for e in geom["electrodes"]:
        if mode == "area":
            dofs = np.unique(basis.element_dofs[:, np.where(lab == e["name"])[0]])
        else:
            x0, _, x1, _ = G.shape_polygon(e).bounds
            mid = mr.mesh.p[:, mr.mesh.facets].mean(axis=1)
            fac = np.where((np.abs(mid[1]) < 1e-9) & (mid[0] > x0 - 1e-9) & (mid[0] < x1 + 1e-9))[0]
            dofs = basis.get_dofs(facets=fac).flatten()
        dmap[e["name"]] = (dofs, float(e["weight"]))
    del basis
    r = ES.solve_es(mr.mesh, eps, eps, dmap)
    one = np.ones_like(eps)
    r0 = ES.solve_es(mr.mesh, one, one, dmap)
    row = {"scale": s, "electrodes": mode, "n_nodes": mr.n_nodes, "dofs_p2": int(r.basis.N),
           **ES.line_params(r.c_pul, r0.c_pul), "time_s": time.time() - t0, "max_rss_mb": max_rss_mb()}
    log.info(f"{case['id']} {mode} s={s:.4f} R={geom['domain']['x_um'][1]:g} nodes={mr.n_nodes} C'={row['C_pF_per_m']:.6f} "
             f"C0'={row['C0_pF_per_m']:.6f} n_rf={row['n_rf']:.6f} Z0={row['Z0_ohm']:.5f} t={row['time_s']:.1f}s")
    gc.collect()
    return row


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("case", choices=["K6a", "K6b"])
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    path = ROOT / "cases" / f"{a.case}.yaml"
    case = G.load_case(path)
    log = Logger(f"{a.case}-cpw")
    S, W, eps_r, h, t = params(case)
    cf = closed_form(S, W, eps_r, h)
    log.info(f"case {path.name} sha256 {G.file_sha256(path)[:16]} S={S} W={W} eps_r={eps_r} h={h} t={t}")
    log.info(f"closed form: {cf}")
    if a.dry_run:
        return
    t0 = time.time()
    scales = PILOT if a.pilot else SCALES
    keys = ["C_pF_per_m", "C0_pF_per_m", "n_rf", "Z0_ohm"]
    res = {"case": a.case, "date": time.strftime("%Y-%m-%d"), "case_file": f"cases/{path.name}",
           "case_sha256": G.file_sha256(path), "versions": versions(), "pilot": a.pilot,
           "closed_form_t0_infinite": cf, "fem": {}}
    for mode in ("line", "area"):
        rows = [solve(case, s, mode, log) for s in scales]
        ext = {k: richardson([r["scale"] for r in rows], [r[k] for r in rows], p_formal=2.0) for k in keys}
        res["fem"][f"{mode}_R500"] = {"levels": rows, "extrapolated": ext}
        for k in keys:
            log.info(f"{a.case} {mode} R=500 {k}: ext={ext[k]['f_ext']:.8g} U={ext[k]['U']:.2e} ({ext[k]['method']})")
    # domain study with zero-thickness lines at the middle scale
    sd = scales[min(1, len(scales) - 1)]
    dom = []
    for R in (250.0, 500.0, 1000.0, 2000.0):
        c2 = with_domain(case, R)
        row = solve(c2, sd, "line", log)
        row["R_um"] = R
        dom.append(row)
    # extrapolate in 1/R; formal order 2 (field outside R ~ 1/r^2 for a line with zero net charge); checked by the observed order
    inv = [1 / r["R_um"] for r in dom[1:]]
    dext = {k: richardson(inv, [r[k] for r in dom[1:]], p_formal=2.0) for k in keys}
    res["domain_study"] = {"scale": sd, "rows": dom, "extrapolated_R_inf": dext}
    for k in keys:
        log.info(f"{a.case} line R->inf (scale {sd:.3f}) {k}: ext={dext[k]['f_ext']:.8g} U={dext[k]['U']:.2e} p={dext[k]['p']} "
                 f"closed form {cf[k]:.8g}")
    res["run_time_s"] = time.time() - t0
    out = ROOT / "reference" / f"{a.case}{'-pilot' if a.pilot else ''}.json"
    out.write_text(json.dumps(res, indent=1, default=float))
    log.info(f"wrote {out}")


if __name__ == "__main__":
    main()
