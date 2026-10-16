"""Independent EO overlap references (DevLog-033, R-VAL): full-tensor dn_eff/V split by Pockels coefficient and by
region, conventional overlap Gamma and the implied textbook VpiL, and electrostatic integral identities.

Same meshes, solvers and conventions as scripts/ref_es_eo.py (DevLog-028): scikit-fem P2 electrostatics (AMG-CG),
1 V terminal difference (signal 1 V, grounds 0 V); per arm the TE0 of the arm window (vector FEM N2/P2, electrodes
absent, half window with the TE mirror); first-order perturbation dn = int E* . d(eps_r) . E dA / (4 P').
Definitions are written into every output JSON (DEFINITIONS below).

Run: uv run python scripts/ref_eo_overlap.py K4 [--pilot] [--dry-run] [--scales 2.83,2,1.41,1] [--optical-check]
     uv run python scripts/ref_eo_overlap.py --summarize
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
from scipy.constants import epsilon_0 as EPS0

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ref_es_eo as R  # noqa: E402

from eoref import es as ES  # noqa: E402
from eoref import fmode as FM  # noqa: E402
from eoref import geom as G  # noqa: E402
from eoref import modecase as MC  # noqa: E402
from eoref import pockels as PK  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, run_isolated, versions  # noqa: E402

LAM = R.LAM
H_OPT = R.H_OPT
SCALES = [2.0 * 2**0.5, 2.0, 2**0.5, 1.0]
PILOT_SCALES = [2.0 * 2**0.5, 2.0]
COMPONENTS = {"r33": ("xx",), "r13": ("yy", "zz"), "r51": ("xy",), "r22": ("yz",)}
REGIONS = ("ln_slab", "ln_rib", "other")

DEFINITIONS = {
    "frame": "lab x lateral, y film normal (up), z propagation; x-cut LN, propagation crystal y; lab x = crystal z "
             "(n_e, eps par), lab y = crystal x, lab z = crystal y; crystal +z along lab +x",
    "voltage": "V = 1 V terminal difference (signal 1 V, grounds 0 V); every per-volt quantity is per volt of V",
    "arms": "A = right gap (x > 0), B = left gap (x < 0); each arm mode solved in its own window, electrodes absent",
    "dn_full": "dn_eff/V = int E* . d(eps_r)/dV . E dA / (4 P'), P' = (1/2) Re int (E x H'*) . z dA, H' = Z0 H; "
               "equals (omega eps0 / (4 P k0)) int E* . d eps . E dA in SI; full 3m Pockels tensor",
    "delta_eps": "d(eps_r)_ab = -eps_a eps_b d(1/eps)_ab, d(1/eps)_I = r_Ik E_k (crystal frame, contracted), "
                 "eps_x = n_e^2, eps_y = eps_z = n_o^2 (1550 nm optical indices), static field E_s from the ES solve",
    "split_component": "each lab d eps component is linear in exactly one r coefficient: r33 -> d eps_xx = "
                       "-n_e^4 r33 E_x,s (term d eps_xx |E_x|^2); r13 -> d eps_yy = d eps_zz = -n_o^4 r13 E_x,s "
                       "(terms d eps_yy |E_y|^2 + d eps_zz |E_z|^2); r51 -> d eps_xy = -n_e^2 n_o^2 r51 E_y,s (term "
                       "2 d eps_xy Re(E_x* E_y)); r22 -> d eps_yz = +n_o^4 r22 E_y,s (term 2 d eps_yz Re(E_y* E_z)); "
                       "contribution = integral of that coefficient's terms of E* . d eps . E divided by 4 P'; the "
                       "four contributions sum to dn_full",
    "split_region": "ln_slab = elements labelled ln_slab; ln_rib = elements labelled ln_rib*; other = all non-LN "
                    "elements (zero by construction: Pockels tensor non-zero only in LN)",
    "gamma_E2": "Gamma = (g / V) int_LN E_x,s |E_opt|^2 dA / int_window |E_opt|^2 dA, |E_opt|^2 = |E_x|^2 + |E_y|^2 + "
                "|E_z|^2 of the arm mode; g = edge-to-edge gap of that arm from the electrode rectangles; signed "
                "(A > 0, B < 0)",
    "gamma_Ex2": "as gamma_E2 with |E_x,opt|^2 in numerator and denominator (DevLog-028 gamma_scalar)",
    "vpil_textbook": "push-pull, V across each gap = terminal voltage: dn_tb,arm = -(1/2) n_e^3 r33 Gamma_arm / g_arm, "
                     "VpiL_tb = lambda / (2 |dn_tb,A - dn_tb,B|) = lambda g / (2 n_e^3 r33 Gamma_mean) for equal gaps "
                     "(the single-arm textbook lambda g / (n_e^3 r33 Gamma) halved); no n_e/n_eff factor",
    "vpil_textbook_neff": "VpiL_tb x n_eff / n_e (textbook with the effective-index factor: uniform-field limit "
                          "dn = -(1/2) n_e^3 r33 (n_e / n_eff) Gamma V / g)",
    "vpil_full": "lambda / (2 |dn_full,A - dn_full,B|) (engine eo-overlap/v2 convention)",
    "gamma_equiv": "2 g |dn_full,arm| / (n_e^3 r33): the Gamma that reproduces the full-tensor dn in the textbook "
                   "formula (informational)",
    "W": "W' = (eps0 / 2) int eps_rf |grad phi|^2 dA over the whole domain, J/m at V = 1 V (= C' V^2 / 2)",
    "lineint_slabmid": "int (-E) . dl along the straight segment at the LN slab mid-height (y = slab centre) from the "
                       "signal electrode edge x to the ground electrode edge x of that arm's gap, dl pointing from "
                       "signal to ground; = phi(ground end) - phi(signal end) (negative, |value| < 1 V because the "
                       "endpoints lie below the electrodes); exact quadrature with breakpoints at element edges",
    "lineint_electrode_bottom": "same at the electrode bottom height (endpoints are electrode corners): identity, "
                                "= -V = -1 V",
}


def arm_modes(case: dict, h: float, log: Logger) -> dict:
    """As ref_es_eo.arm_modes (same mesh and solve), plus quadrature-point masks for the LN slab and the LN rib."""
    arms = {}
    for arm, win in case["optics"]["eo"]["arm_windows"].items():
        xc = 0.5 * (win["x_um"][0] + win["x_um"][1])
        om = MC.optical_mesh(case, win, h, ((-1.2, 1.2), (-0.4, 0.9)), ("ln_slab",), hmax=6 * h, shift_x=xc)
        m, info = MC.solve_te0(om, LAM, 2.2)
        mats = np.array(om.mr.materials)
        labs = np.array(om.mr.labels)
        ln = mats == "lithium_niobate"
        slab = ln & (labs == "ln_slab")
        rib = ln & np.char.startswith(labs.astype(str), "ln_rib")
        if (slab | rib).sum() != ln.sum():
            raise RuntimeError("LN element not in slab or rib")
        f = m.fields_qp()
        arms[arm] = {"xc": xc, "labels": sorted(set(om.mr.labels)), "n_eff": m.n_eff, "te_fraction": FM.te_fraction(m),
                     "power_fraction_ln": MC.power_fraction(m, ln), "X": FM.quad_points(m.basis),
                     "dx": np.asarray(m.basis.dx), "q": FM.elem_mask_qp(m.basis, ln),
                     "q_slab": FM.elem_mask_qp(m.basis, slab), "q_rib": FM.elem_mask_qp(m.basis, rib),
                     **{k: f[k] for k in ("ex", "ey", "ez", "hx", "hy")}}
        log.info(f"arm {arm}: xc={xc} n_eff={m.n_eff:.8f} TE={arms[arm]['te_fraction']:.5f} "
                 f"elems LN slab/rib {int(slab.sum())}/{int(rib.sum())} of {len(mats)}")
    return arms


def terms(de: dict, f: dict) -> dict[str, np.ndarray]:
    ex, ey, ez = f["ex"], f["ey"], f["ez"]
    return {"xx": de["xx"] * np.abs(ex) ** 2, "yy": de["yy"] * np.abs(ey) ** 2, "zz": de["zz"] * np.abs(ez) ** 2,
            "xy": de["xy"] * 2 * np.real(np.conj(ex) * ey), "yz": de["yz"] * 2 * np.real(np.conj(ey) * ez)}


def arm_eval(case: dict, arm: str, a: dict, bdg, gx, gy) -> dict:
    X, dx = a["X"], a["dx"]
    shape = X[0].shape
    ln = case["materials"]["lithium_niobate"]
    r = ln["r_pm_per_v"]
    ne, no = float(ln["n_e"]), float(ln["n_o"])
    f = {k: a[k] for k in ("ex", "ey", "ez", "hx", "hy")}
    masks = {"ln_slab": a["q_slab"], "ln_rib": a["q_rib"], "other": 1.0 - a["q"]}
    p_half = 0.5 * float(np.real(np.sum((f["ex"] * np.conj(f["hy"]) - f["ey"] * np.conj(f["hx"])) * dx)))
    tab = {c: dict.fromkeys(REGIONS, 0.0) for c in COMPONENTS}
    exs_sum = np.zeros(shape)  # E_x,s (direct + mirrored), V/um, all elements (masked later)
    for i, sgn in enumerate((1.0, -1.0)):
        pts = np.vstack([a["xc"] + sgn * X[0].ravel(), X[1].ravel()])
        ex_s, ey_s = ES.static_field_at(bdg, gx, gy, pts)  # V/um for 1 V
        ex_s, ey_s = ex_s.reshape(shape), ey_s.reshape(shape)
        exs_sum += ex_s
        de = PK.delta_eps_lab(ex_s * 1e6 * a["q"], ey_s * 1e6 * a["q"], r, ne, no, "full")
        if i == 1:
            de = {k: v * R.PARITY[k] for k, v in de.items()}
        t = terms(de, f)
        for c, ks in COMPONENTS.items():
            dens = sum(t[k] for k in ks)
            for reg, mk in masks.items():
                tab[c][reg] += 0.5 * float(np.sum(dens * mk * dx)) / (4.0 * p_half)
    out: dict = {}
    for c in COMPONENTS:
        out[f"{arm}.dn.{c}"] = sum(tab[c].values())
        for reg in REGIONS:
            out[f"{arm}.dn.{c}.{reg}"] = tab[c][reg]
    for reg in REGIONS:
        out[f"{arm}.dn.{reg}"] = sum(tab[c][reg] for c in COMPONENTS)
    out[f"{arm}.dn.total"] = sum(out[f"{arm}.dn.{c}"] for c in COMPONENTS)
    # cross-check: DevLog-028 routine (perturbation_from_fields, same fields)
    old = R.arm_overlap(case, a, bdg, gx, gy)
    out[f"{arm}.dn.devlog028_routine"] = old["dn_full"]
    g = arm_gap_um(case, arm)
    e2 = np.abs(f["ex"]) ** 2 + np.abs(f["ey"]) ** 2 + np.abs(f["ez"]) ** 2
    x2 = np.abs(f["ex"]) ** 2
    for name, w in (("E2", e2), ("Ex2", x2)):
        den = 2.0 * float(np.sum(w * dx))
        for reg, mk in (("ln", a["q"]), ("ln_slab", a["q_slab"]), ("ln_rib", a["q_rib"])):
            v = g * float(np.sum(exs_sum * mk * w * dx)) / den
            out[f"{arm}.gamma_{name}" + ("" if reg == "ln" else f".{reg}")] = v
    out[f"{arm}.gamma_equiv"] = 2 * g * 1e-6 * abs(out[f"{arm}.dn.total"]) / (ne**3 * r["r33"] * 1e-12)
    out[f"{arm}.n_eff"] = a["n_eff"]
    return out


def arm_gap_um(case: dict, arm: str) -> float:
    el = {e["name"]: G.shape_polygon(e).bounds for e in case["geometry"]["electrodes"]}
    return el["ground_r"][0] - el["signal"][2] if arm == "A" else el["signal"][0] - el["ground_l"][2]


def arm_segment(case: dict, arm: str, y: float) -> tuple[np.ndarray, np.ndarray]:
    el = {e["name"]: G.shape_polygon(e).bounds for e in case["geometry"]["electrodes"]}
    if arm == "A":
        return np.array([el["signal"][2], y]), np.array([el["ground_r"][0], y])
    return np.array([el["signal"][0], y]), np.array([el["ground_l"][2], y])


def line_integral(res: ES.ESResult, bdg, gx, gy, p0: np.ndarray, p1: np.ndarray) -> tuple[float, float, int]:
    """int (-E) . dl from p0 to p1, exact for the P1-discontinuous field: breakpoints at every crossing with a mesh
    edge and at every mesh vertex on the segment, 3-point Gauss-Legendre per piece. Returns (integral,
    phi(p1) - phi(p0) from the P2 potential, number of pieces)."""
    mesh = res.basis.mesh
    d = p1 - p0
    fa, fb = mesh.p[:, mesh.facets[0]], mesh.p[:, mesh.facets[1]]
    e = fb - fa
    den = d[0] * e[1] - d[1] * e[0]
    w = fa - p0[:, None]
    nz = np.abs(den) > 1e-14 * np.linalg.norm(d) * np.linalg.norm(e, axis=0)
    with np.errstate(divide="ignore", invalid="ignore"):
        t = (w[0] * e[1] - w[1] * e[0]) / den
        s = (w[0] * d[1] - w[1] * d[0]) / den
    ok = nz & (t > 0) & (t < 1) & (s >= -1e-12) & (s <= 1 + 1e-12)
    L2 = float(d @ d)
    vp = mesh.p - p0[:, None]
    tv = (vp[0] * d[0] + vp[1] * d[1]) / L2
    dist = np.abs(vp[0] * d[1] - vp[1] * d[0]) / np.sqrt(L2)
    onv = (dist < 1e-9) & (tv > 0) & (tv < 1)
    ts = np.unique(np.concatenate([[0.0, 1.0], t[ok], tv[onv]]))
    ts = ts[np.concatenate([[True], np.diff(ts) > 1e-13])]
    xg, wg = np.polynomial.legendre.leggauss(3)
    a, b = ts[:-1], ts[1:]
    tq = (0.5 * (a[:, None] + b[:, None]) + 0.5 * (b - a)[:, None] * xg[None, :]).ravel()
    wq = (0.5 * (b - a)[:, None] * wg[None, :]).ravel()
    pts = p0[:, None] + d[:, None] * tq[None, :]
    ex, ey = ES.static_field_at(bdg, gx, gy, pts)
    val = float(np.sum(wq * (-(ex * d[0] + ey * d[1]))))
    ends = np.stack([p0, p1], axis=1)
    phi = ES.probe_matrix(res.basis, ends, ES.find_cells(mesh, ends)) @ res.phi
    return val, float(phi[1] - phi[0]), int(a.size)


def solve_level(case: dict, s: float, log: Logger, arms: dict) -> dict:
    t0 = time.time()
    geom = case["geometry"]
    layout = G.build_layout(geom, electrodes="area")
    rules, hmax = R.es_rules(case, s)
    mr = G.mesh_layout(layout, rules, hmax=hmax)
    exx, eyy = R.rf_eps(case, mr.materials)
    from skfem import Basis, ElementTriP2

    basis = Basis(mr.mesh, ElementTriP2())
    dmap = {e["name"]: (R.electrode_dofs(basis, mr.labels, e["name"]), float(e["weight"])) for e in geom["electrodes"]}
    del basis
    res = ES.solve_es(mr.mesh, exx, eyy, dmap)
    row: dict = {"scale": s, "n_nodes": mr.n_nodes, "n_elems": mr.n_elems, "dofs_p2": int(res.basis.N),
                 "C_pF_per_m": res.c_pul * 1e12, "W_J_per_m": 0.5 * EPS0 * res.energy_coeff}
    bdg, gx, gy = ES.grad_dg(res)
    slab = next(r for r in geom["regions"] if r["name"] == "ln_slab")["rect"]["y_um"]
    y_mid = 0.5 * (slab[0] + slab[1])
    y_el = G.shape_polygon(next(e for e in geom["electrodes"] if e["name"] == "signal")).bounds[1]
    for arm in arms:
        for tag, y in (("lineint_slabmid", y_mid), ("lineint_electrode_bottom", y_el)):
            p0, p1 = arm_segment(case, arm, y)
            v, dphi, npc = line_integral(res, bdg, gx, gy, p0, p1)
            row[f"{arm}.{tag}_V"] = v
            row[f"{arm}.{tag}_phidiff_V"] = dphi
            row[f"{arm}.{tag}_pieces"] = npc
        row.update(arm_eval(case, arm, arms[arm], bdg, gx, gy))
    ln = case["materials"]["lithium_niobate"]
    ne, r33 = float(ln["n_e"]), float(ln["r_pm_per_v"]["r33"]) * 1e-12
    lam_m = LAM * 1e-6
    row["vpil_full_vcm"] = lam_m / (2 * abs(row["A.dn.total"] - row["B.dn.total"])) * 100
    for name in ("E2", "Ex2"):
        dtb = {arm: -0.5 * ne**3 * r33 * row[f"{arm}.gamma_{name}"] / (arm_gap_um(case, arm) * 1e-6) for arm in arms}
        row[f"vpil_textbook_{name}_vcm"] = lam_m / (2 * abs(dtb["A"] - dtb["B"])) * 100
        neff = 0.5 * (row["A.n_eff"] + row["B.n_eff"])
        row[f"vpil_textbook_{name}_neff_vcm"] = row[f"vpil_textbook_{name}_vcm"] * neff / ne
        row[f"gamma_{name}_mean_abs"] = 0.5 * (abs(row[f"A.gamma_{name}"]) + abs(row[f"B.gamma_{name}"]))
    row["dn_mean_abs_per_V"] = 0.5 * (abs(row["A.dn.total"]) + abs(row["B.dn.total"]))
    row["time_s"] = time.time() - t0
    row["max_rss_mb"] = max_rss_mb()
    log.info(f"{case['id']} s={s:.4f} dofs={row['dofs_p2']} C'={row['C_pF_per_m']:.6f} W'={row['W_J_per_m']:.6e} "
             f"dnA={row['A.dn.total']:.6e} (r33 {row['A.dn.r33']:.4e} r13 {row['A.dn.r13']:.4e} r51 {row['A.dn.r51']:.4e} "
             f"r22 {row['A.dn.r22']:.2e}) GammaA E2/Ex2 {row['A.gamma_E2']:.5f}/{row['A.gamma_Ex2']:.5f} "
             f"VpiL {row['vpil_full_vcm']:.5f} tb {row['vpil_textbook_E2_vcm']:.5f} lineA {row['A.lineint_slabmid_V']:.6f} "
             f"t={row['time_s']:.1f}s rss={row['max_rss_mb']:.0f}MB")
    return row


def sanity(rows: list[dict], case: dict) -> dict:
    out: dict = {}
    for arm in ("A", "B"):
        rc, rr, rd, ri, rl = [], [], [], [], []
        for r in rows:
            tot = r[f"{arm}.dn.total"]
            rc.append(abs(sum(r[f"{arm}.dn.{c}"] for c in COMPONENTS) - tot) / abs(tot))
            rr.append(abs(sum(r[f"{arm}.dn.{g}"] for g in REGIONS) - tot) / abs(tot))
            rd.append(abs(r[f"{arm}.dn.devlog028_routine"] - tot) / abs(tot))
            ri.append(abs(r[f"{arm}.lineint_electrode_bottom_V"] + 1.0))
            rl.append(abs(r[f"{arm}.lineint_slabmid_V"] - r[f"{arm}.lineint_slabmid_phidiff_V"]))
        out[arm] = {"max_rel_component_sum_minus_total": max(rc), "max_rel_region_sum_minus_total": max(rr),
                    "max_rel_vs_devlog028_routine": max(rd), "max_abs_lineint_electrode_bottom_plus_1V": max(ri),
                    "max_abs_lineint_slabmid_minus_phidiff_V": max(rl),
                    "other_region_dn_max_abs": max(abs(r[f"{arm}.dn.other"]) for r in rows),
                    "gamma_E2_in_0.3_0.8": all(0.3 <= abs(r[f"{arm}.gamma_E2"]) <= 0.8 for r in rows)}
    old = ROOT / "reference" / f"{case['id']}-es-eo.json"
    if old.exists():
        lv = json.loads(old.read_text())["levels"]
        cmp = []
        for r in rows:
            for o in lv:
                if abs(o["scale"] - r["scale"]) < 1e-9:
                    cmp.append({"scale": r["scale"],
                                "rel_dn_A": (r["A.dn.total"] - o["dn_A_per_V"]) / abs(o["dn_A_per_V"]),
                                "rel_dn_B": (r["B.dn.total"] - o["dn_B_per_V"]) / abs(o["dn_B_per_V"]),
                                "rel_C": (r["C_pF_per_m"] - o["C_pF_per_m"]) / o["C_pF_per_m"],
                                "rel_gamma_Ex2_A": (r["A.gamma_Ex2"] - o["gamma_A"]) / abs(o["gamma_A"])})
        out["vs_devlog028_levels_same_scale"] = cmp
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("case", nargs="?")
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--scales", default=None)
    ap.add_argument("--optical-check", action="store_true", help="also one level at the coarsest scale, h_opt/sqrt2")
    ap.add_argument("--summarize", action="store_true")
    ap.add_argument("--one-level", type=float, default=None, help="internal")
    ap.add_argument("--h-opt", type=float, default=H_OPT, help="internal")
    ap.add_argument("--arms-npz", default=None, help="internal")
    ap.add_argument("--solve-arms", action="store_true", help="internal")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    if a.summarize:
        summarize()
        return
    path = ROOT / "cases" / f"{a.case}.yaml"
    case = G.load_case(path)
    if a.solve_arms:
        R.save_arms(arm_modes(case, a.h_opt, Logger(f"eo-{a.case}-arms")), a.arms_npz)
        Path(a.out).write_text(json.dumps({"max_rss_mb": max_rss_mb()}))
        return
    if a.one_level is not None:
        row = solve_level(case, a.one_level, Logger(f"eo-{a.case}-level"), R.load_arms(a.arms_npz))
        row["h_opt_um"] = a.h_opt
        Path(a.out).write_text(json.dumps(row, default=float))
        return
    log = Logger(f"eo-{a.case}")
    scales = PILOT_SCALES if a.pilot else SCALES
    if a.scales:
        scales = [float(v) for v in a.scales.split(",")]
    log.info(f"case {path.name} sha256 {G.file_sha256(path)[:16]} scales {scales} gaps A/B "
             f"{arm_gap_um(case, 'A')}/{arm_gap_um(case, 'B')} um TMPDIR {tempfile.gettempdir()}")
    if a.dry_run:
        return
    t0 = time.time()
    tmpdir = tempfile.mkdtemp(prefix="eo-arms-")

    def arms_file(h: float) -> list[str]:
        f = str(Path(tmpdir) / f"arms-{h:.6f}.npz")
        if not Path(f).exists():
            rr = run_isolated(__file__, [a.case, "--solve-arms", "--h-opt", repr(h), "--arms-npz", f], a.case)
            log.info(f"arm modes h_opt={h:.5f} solved (max RSS {rr['max_rss_mb']:.0f} MB)")
        return ["--arms-npz", f, "--h-opt", repr(h)]

    try:
        rows = []
        for s in scales:
            rows.append(run_isolated(__file__, [a.case, "--one-level", repr(s), *arms_file(H_OPT)], a.case))
        res: dict = {"case": a.case, "date": time.strftime("%Y-%m-%d"), "case_file": f"cases/{path.name}",
                     "case_sha256": G.file_sha256(path), "versions": versions(), "pilot": a.pilot,
                     "wavelength_um": LAM, "gap_um": {arm: arm_gap_um(case, arm) for arm in ("A", "B")},
                     "solver": "scikit-fem P2 electrostatics (AMG-CG) on gmsh; vector FEM N2/P2 arm modes "
                               "(eoref.fmode, h_core 40 nm, half window + TE mirror); first-order Pockels perturbation",
                     "definitions": DEFINITIONS,
                     "uncertainty": "U by the DevLog-028 round-2 rule (eoref.util.richardson, p_formal 2, three finest "
                                    "ES levels; optical mesh fixed at h_core 40 nm, see optical_mesh_check)",
                     "levels": rows}
        keys = [k for k, v in rows[-1].items() if isinstance(v, float) and k not in ("scale", "time_s", "max_rss_mb",
                                                                                      "h_opt_um")
                and not k.endswith("_pieces")]
        hs = [r["scale"] for r in rows]
        res["extrapolated"] = {k: richardson(hs, [r[k] for r in rows], p_formal=2.0) for k in keys}
        res["sanity"] = sanity(rows, case)
        if a.optical_check:
            row2 = run_isolated(__file__, [a.case, "--one-level", repr(scales[0]), *arms_file(H_OPT / 2**0.5)], a.case)
            res["optical_mesh_check"] = {"h_core_um": H_OPT / 2**0.5, "es_scale": scales[0], "row": row2,
                                         "delta_vs_h40": {k: row2[k] - rows[0][k] for k in keys}}
            log.info(f"optical check: dVpiL {row2['vpil_full_vcm'] - rows[0]['vpil_full_vcm']:.3e} "
                     f"dGammaA {row2['A.gamma_E2'] - rows[0]['A.gamma_E2']:.3e}")
        res["run_time_s"] = time.time() - t0
        for k in ("vpil_full_vcm", "vpil_textbook_E2_vcm", "A.gamma_E2", "A.dn.total", "A.lineint_slabmid_V",
                  "W_J_per_m"):
            e = res["extrapolated"][k]
            log.info(f"{a.case} {k}: ext={e['f_ext']:.8g} U={e['U']:.2e} ({e['method']})")
        log.info(f"sanity {json.dumps(res['sanity'], default=float)}")
        outdir = Path(tempfile.gettempdir()) if a.pilot else ROOT / "reference"
        out = outdir / f"eo-overlap-{a.case}{'-pilot' if a.pilot else ''}.json"
        out.write_text(json.dumps(res, indent=1, default=float))
        log.info(f"wrote {out}")
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


SUMMARY_KEYS = [
    "vpil_full_vcm", "dn_mean_abs_per_V",
    *[f"{arm}.{k}" for arm in ("A", "B") for k in
      ("dn.total", "dn.r33", "dn.r13", "dn.r51", "dn.r22", "dn.ln_slab", "dn.ln_rib", "dn.other",
       "gamma_E2", "gamma_Ex2", "gamma_E2.ln_slab", "gamma_E2.ln_rib", "gamma_equiv",
       "lineint_slabmid_V", "lineint_electrode_bottom_V")],
    "gamma_E2_mean_abs", "gamma_Ex2_mean_abs", "vpil_textbook_E2_vcm", "vpil_textbook_Ex2_vcm",
    "vpil_textbook_E2_neff_vcm", "vpil_textbook_Ex2_neff_vcm", "W_J_per_m", "C_pF_per_m",
]


def summarize() -> None:
    out: dict = {"date": time.strftime("%Y-%m-%d"), "source": "validation/scripts/ref_eo_overlap.py (DevLog-033)",
                 "note": "value = extrapolated (DevLog-028 round-2 rule), U = its uncertainty, f_finest = finest ES level; "
                         "per volt of the 1 V terminal difference; A = right arm",
                 "definitions": DEFINITIONS, "cases": {}}
    for p in sorted((ROOT / "reference").glob("eo-overlap-*.json")):
        d = json.loads(p.read_text())
        c = {"case_sha256": d["case_sha256"], "gap_um": d["gap_um"]}
        for k in SUMMARY_KEYS:
            e = d["extrapolated"][k]
            c[k] = {"value": e["f_ext"], "U": e["U"], "f_finest": e["f_finest"], "method": e["method"]}
        if "optical_mesh_check" in d:
            c["optical_mesh_check_delta"] = {k: d["optical_mesh_check"]["delta_vs_h40"][k] for k in SUMMARY_KEYS}
        c["sanity"] = d["sanity"]
        out["cases"][d["case"]] = c
    (ROOT / "reference" / "summary-eo.json").write_text(json.dumps(out, indent=1, default=float))
    print(f"summary-eo.json: {len(out['cases'])} cases")


if __name__ == "__main__":
    if os.environ.get("OMP_NUM_THREADS") != "1":
        print("warning: run through run.sh / run_guarded.sh (single-threaded BLAS, nice 10)", file=sys.stderr)
    main()
