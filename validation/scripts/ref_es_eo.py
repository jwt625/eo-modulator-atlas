"""Electrostatics (scikit-fem P2 on gmsh) and full-vector EO overlap references for K4 and the K5 gap sweep.

Per ES mesh level: C' (dielectrics), C0' (all eps = 1), n_RF = sqrt(C'/C0'), Z0 = 1 / (c sqrt(C' C0')),
1 V terminal difference (signal 1 V, grounds 0 V), electrodes as field-free Dirichlet areas, outer boundary
zero normal flux (as in the case YAML). Per arm: TE0 of the arm window (electrodes absent), delta n_eff per volt by
first-order perturbation with the full Pockels tensor (eoref.pockels) and the full vector optical field
(eoref.fmode), VpiL = lambda / (2 |dn_A - dn_B|). Also r33-only and the scalar overlap Gamma.

Run: uv run python scripts/ref_es_eo.py K4 [--pilot] [--dry-run] [--domain-study]
"""

from __future__ import annotations

import argparse
import copy
import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eoref import es as ES  # noqa: E402
from eoref import fmode as FM  # noqa: E402
from eoref import geom as G  # noqa: E402
from eoref import modecase as MC  # noqa: E402
from eoref import pockels as PK  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, run_isolated, versions  # noqa: E402

LAM = 1.55
SCALES = [2.0, 2**0.5, 1.0]  # memory-limited (DevLog-028 limitations)
PILOT_SCALES = [2.0, 1.0]
H_OPT = 0.04  # optical core mesh size (K2 level 3); checked against 0.04/sqrt(2)
EPS_RF = {"air": 1.0, "silicon_dioxide": 3.9, "silicon": 11.7}


def rf_eps(case: dict, materials: list[str]) -> tuple[np.ndarray, np.ndarray]:
    mats = case["materials"]
    exx, eyy = [], []
    cache = {}
    for m in materials:
        if m not in cache:
            d = mats[m]
            if d.get("conductor"):
                cache[m] = (1.0, 1.0)  # inside conductors: field-free (Dirichlet), value irrelevant
            elif isinstance(d["eps_r"], dict):
                # x-cut: lab x = crystal z (par), lab y = crystal x (perp)
                cache[m] = (float(d["eps_r"]["par"]), float(d["eps_r"]["perp"]))
            else:
                cache[m] = (float(d["eps_r"]),) * 2
        exx.append(cache[m][0])
        eyy.append(cache[m][1])
    return np.array(exx), np.array(eyy)


def es_rules(case: dict, s: float) -> tuple[list[G.SizeRule], float]:
    geom = case["geometry"]
    el = {e["name"]: G.shape_polygon(e) for e in geom["electrodes"]}
    sig = el["signal"].bounds
    gr = el["ground_r"].bounds
    gl = el["ground_l"].bounds
    hmax = 40.0 * s
    rules = [
        # gaps (rib + field region), both sides
        G.SizeRule("box", 0.08 * s, 0.2, hmax, x=(sig[2] - 1.0, gr[0] + 1.0), y=(-0.6, 1.6)),
        G.SizeRule("box", 0.08 * s, 0.2, hmax, x=(gl[2] - 1.0, sig[0] + 1.0), y=(-0.6, 1.6)),
        # electrode surfaces
        G.SizeRule("curves", 0.15 * s, 0.2, hmax, labels=("signal", "ground_r", "ground_l")),
        # electrode corners (field singularities; otherwise first-order convergence of C')
        G.SizeRule("points", 0.01 * s, 0.2, hmax,
                   pts=tuple((x, y) for b in (sig, gr, gl) for x in (b[0], b[2]) for y in (b[1], b[3]))),
        # LN slab (thin layer everywhere)
        G.SizeRule("curves", 0.3 * s, 0.2, hmax, labels=("ln_slab",)),
    ]
    for r in geom["regions"]:
        if r["name"].startswith("ln_rib"):
            b = G.shape_polygon(r).bounds
            rules.append(G.SizeRule("box", 0.04 * s, 0.2, hmax, x=(b[0] - 0.3, b[2] + 0.3), y=(b[1] - 0.3, b[3] + 0.3)))
    return rules, hmax


def electrode_dofs(basis, labels: list[str], name: str) -> np.ndarray:
    el = np.where(np.array(labels) == name)[0]
    return np.unique(basis.element_dofs[:, el])


def solve_level(case: dict, s: float, log: Logger, arms: dict | None = None) -> tuple[dict, dict]:
    t0 = time.time()
    geom = case["geometry"]
    layout = G.build_layout(geom, electrodes="area")
    rules, hmax = es_rules(case, s)
    mr = G.mesh_layout(layout, rules, hmax=hmax)
    t_mesh = time.time() - t0
    exx, eyy = rf_eps(case, mr.materials)
    from skfem import Basis, ElementTriP2

    basis = Basis(mr.mesh, ElementTriP2())
    dmap = {}
    for e in geom["electrodes"]:
        dmap[e["name"]] = (electrode_dofs(basis, mr.labels, e["name"]), float(e["weight"]))
    del basis
    r = ES.solve_es(mr.mesh, exx, eyy, dmap)
    one = np.ones_like(exx)
    r0 = ES.solve_es(mr.mesh, one, one, dmap)
    lp = ES.line_params(r.c_pul, r0.c_pul)
    row = {"scale": s, "n_nodes": mr.n_nodes, "n_elems": mr.n_elems, "dofs_p2": int(r.basis.N), **lp}
    eo = {}
    if arms:
        bdg, gx, gy = ES.grad_dg(r)
        for arm, a in arms.items():
            eo[arm] = arm_overlap(case, a, bdg, gx, gy)
            row[f"dn_{arm}_per_V"] = eo[arm]["dn_full"]
            row[f"dn_{arm}_r33only_per_V"] = eo[arm]["dn_r33only"]
            row[f"gamma_{arm}"] = eo[arm]["gamma_scalar"]
        row.update(vpi_metrics(case, eo))
    row["time_s"] = time.time() - t0
    row["time_mesh_s"] = t_mesh
    row["max_rss_mb"] = max_rss_mb()
    log.info(f"{case['id']} ES s={s:.4f} nodes={mr.n_nodes} dofs={row['dofs_p2']} C'={lp['C_pF_per_m']:.6f} "
             f"C0'={lp['C0_pF_per_m']:.6f} n_rf={lp['n_rf']:.6f} Z0={lp['Z0_ohm']:.5f} "
             + (f"dnA={row['dn_A_per_V']:.6e} dnB={row['dn_B_per_V']:.6e} VpiL={row['vpil_vcm']:.6f} "
                f"VpiL_r33={row['vpil_r33only_vcm']:.6f} VpiL_scalar={row['vpil_scalar_vcm']:.6f} " if arms else "")
             + f"t={row['time_s']:.1f}s rss={row['max_rss_mb']:.0f}MB")
    return row, eo


def vpi_metrics(case: dict, eo: dict) -> dict:
    lam_m = LAM * 1e-6
    out = {}
    for key, name in (("dn_full", "vpil_vcm"), ("dn_r33only", "vpil_r33only_vcm"), ("dn_scalar", "vpil_scalar_vcm")):
        d = eo["A"][key] - eo["B"][key]
        out[name] = lam_m / (2 * abs(d)) * 100.0
    out["push_pull_balance"] = eo["B"]["dn_full"] / eo["A"]["dn_full"]
    # primary EO comparands (audit R5): VpiL and the arm-mean |dn| per level; per-arm values informational
    out["dn_mean_abs_per_V"] = 0.5 * (abs(eo["A"]["dn_full"]) + abs(eo["B"]["dn_full"]))
    out["gamma_mean_abs"] = 0.5 * (abs(eo["A"]["gamma_scalar"]) + abs(eo["B"]["gamma_scalar"]))
    return out


def arm_modes(case: dict, h: float, log: Logger) -> dict:
    """Solve each arm's TE0 on its half window; keep only quadrature-point arrays (small) for the overlap."""
    arms = {}
    for arm, win in case["optics"]["eo"]["arm_windows"].items():
        xc = 0.5 * (win["x_um"][0] + win["x_um"][1])
        om = MC.optical_mesh(case, win, h, ((-1.2, 1.2), (-0.4, 0.9)), ("ln_slab",), hmax=6 * h, shift_x=xc)
        labs = sorted(set(om.mr.labels))
        m, info = MC.solve_te0(om, LAM, 2.2)
        ln_mask = np.array([mt == "lithium_niobate" for mt in om.mr.materials])
        f = m.fields_qp()
        arms[arm] = {"xc": xc, "labels": labs, "n_eff": m.n_eff, "te_fraction": FM.te_fraction(m),
                     "power_fraction_ln": MC.power_fraction(m, ln_mask), "X": FM.quad_points(m.basis),
                     "dx": np.asarray(m.basis.dx), "q": FM.elem_mask_qp(m.basis, ln_mask),
                     **{k: f[k] for k in ("ex", "ey", "ez", "hx", "hy")}}
        log.info(f"arm {arm}: window centre x={xc} labels={labs} n_eff={m.n_eff:.8f} TE={arms[arm]['te_fraction']:.5f} "
                 f"modes={[(round(a, 5), round(b, 3)) for a, b in info]}")
    return arms


def save_arms(arms: dict, path: str) -> None:
    flat = {}
    for arm, d in arms.items():
        for k, v in d.items():
            flat[f"{arm}__{k}"] = np.asarray(v) if k != "labels" else np.array(v, dtype=object)
    np.savez(path, **flat)


def load_arms(path: str) -> dict:
    z = np.load(path, allow_pickle=True)
    arms: dict = {}
    for key in z.files:
        arm, k = key.split("__", 1)
        v = z[key]
        arms.setdefault(arm, {})[k] = list(v) if k == "labels" else (float(v) if v.ndim == 0 else v)
    return arms


PARITY = {"xx": 1.0, "yy": 1.0, "zz": 1.0, "xy": -1.0, "xz": -1.0, "yz": 1.0}  # TE: E_x even, E_y and E_z odd


def arm_overlap(case: dict, a: dict, bdg, gx, gy) -> dict:
    """The arm mode is solved on the half window x_local >= 0 (mirror plane through the rib centre).
    Full-window integrals = half-window integrals of (direct + mirrored) static field, with the TE parity of each
    optical-field product E_a* E_b; the full-window power is twice the half-window power."""
    X = a["X"]
    shape = X[0].shape
    q = a["q"]
    ln = case["materials"]["lithium_niobate"]
    r = ln["r_pm_per_v"]
    ne, no = float(ln["n_e"]), float(ln["n_o"])
    f = {k: a[k] for k in ("ex", "ey", "ez", "hx", "hy")}
    fields = []
    for sgn in (1.0, -1.0):
        pts = np.vstack([a["xc"] + sgn * X[0].ravel(), X[1].ravel()])
        ex_s, ey_s = ES.static_field_at(bdg, gx, gy, pts)  # V/um for 1 V
        fields.append((ex_s.reshape(shape) * 1e6 * q, ey_s.reshape(shape) * 1e6 * q))  # V/m, LN only
    out = {}
    for name, comp in (("dn_full", "full"), ("dn_r33only", "r33_only")):
        tot = 0.0
        for i, (exs, eys) in enumerate(fields):
            de = PK.delta_eps_lab(exs, eys, r, ne, no, comp)
            if i == 1:
                de = {k: v * PARITY[k] for k, v in de.items()}
            tot += FM.perturbation_from_fields(f, a["dx"], de)
        out[name] = 0.5 * tot
    w = np.abs(f["ex"]) ** 2 * a["dx"]
    gap_m = gap_um(case) * 1e-6
    gamma = float(np.sum((fields[0][0] + fields[1][0]) * w) / (2 * np.sum(w))) * gap_m
    out["gamma_scalar"] = gamma
    out["dn_scalar"] = -0.5 * ne**3 * r["r33"] * 1e-12 * gamma / gap_m
    out["n_eff"] = a["n_eff"]
    out["power_fraction_ln"] = a["power_fraction_ln"]
    return out


def gap_um(case: dict) -> float:
    el = {e["name"]: G.shape_polygon(e).bounds for e in case["geometry"]["electrodes"]}
    return el["ground_r"][0] - el["signal"][2]


def with_domain(case: dict, half: float) -> dict:
    """Same case with lateral half-width and air top changed to `half` (substrate thickness unchanged)."""
    c = copy.deepcopy(case)
    g = c["geometry"]
    old = g["domain"]["x_um"][1]
    g["domain"]["x_um"] = [-half, half]
    g["domain"]["y_um"] = [g["domain"]["y_um"][0], half]
    for r in g["regions"]:
        if "rect" in r:
            xs = r["rect"]["x_um"]
            if xs[0] == -old and xs[1] == old:
                r["rect"]["x_um"] = [-half, half]
            if r["rect"]["y_um"][1] == old:
                r["rect"]["y_um"] = [r["rect"]["y_um"][0], half]
    return c


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("case")
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--domain-study", action="store_true")
    ap.add_argument("--no-eo", action="store_true")
    ap.add_argument("--skip-optical-check", action="store_true", help="skip the finer-arm-mesh check (memory)")
    ap.add_argument("--scales", default=None, help="comma-separated ES mesh scales (coarse to fine), overrides SCALES")
    ap.add_argument("--one-level", type=float, default=None, help="internal: ES scale")
    ap.add_argument("--h-opt", type=float, default=H_OPT, help="internal: optical core mesh size")
    ap.add_argument("--domain-half", type=float, default=None, help="internal: domain half-width")
    ap.add_argument("--out", default=None)
    ap.add_argument("--arms-npz", default=None, help="internal: arm-mode arrays (written by --solve-arms)")
    ap.add_argument("--solve-arms", action="store_true", help="internal: solve arm modes, write --arms-npz")
    a = ap.parse_args()
    path = ROOT / "cases" / f"{a.case}.yaml"
    case = G.load_case(path)
    if a.solve_arms:
        save_arms(arm_modes(case, a.h_opt, Logger(f"{a.case}-arms")), a.arms_npz)
        Path(a.out).write_text(json.dumps({"max_rss_mb": max_rss_mb()}))
        return
    if a.one_level is not None:
        lg = Logger(f"{a.case}-es-eo-level")
        c = case
        if a.domain_half:
            c = with_domain(case, a.domain_half)
            c["id"] = f"{case['id']}-dom{a.domain_half:g}"
        arms_l = load_arms(a.arms_npz) if a.arms_npz else None
        row, _ = solve_level(c, a.one_level, lg, arms_l)
        if arms_l:
            row["arm_modes"] = {k: {"n_eff": v["n_eff"], "te_fraction": v["te_fraction"], "labels": v["labels"],
                                    "window_centre_x_um": v["xc"], "power_fraction_ln": v["power_fraction_ln"]}
                                for k, v in arms_l.items()}
            row["h_opt_um"] = a.h_opt
        if a.domain_half:
            row["domain_half_um"] = a.domain_half
        Path(a.out).write_text(json.dumps(row, default=float))
        return
    log = Logger(f"{a.case}-es-eo")
    scales = PILOT_SCALES if a.pilot else SCALES
    if a.scales:
        scales = [float(v) for v in a.scales.split(",")]
    log.info(f"case {path.name} sha256 {G.file_sha256(path)[:16]} scales {scales} gap {gap_um(case)} um")
    if a.dry_run:
        layout = G.build_layout(case["geometry"], electrodes="area")
        log.info(f"dry run: pieces {[p.label for p in layout.pieces]}")
        return
    t0 = time.time()
    import tempfile

    tmpdir = tempfile.mkdtemp(prefix="eoref-arms-")

    def arms_file(h: float) -> list[str]:
        if a.no_eo:
            return []
        f = str(Path(tmpdir) / f"arms-{h:.6f}.npz")
        if not Path(f).exists():
            rr = run_isolated(__file__, [a.case, "--solve-arms", "--h-opt", repr(h), "--arms-npz", f], a.case)
            log.info(f"arm modes h_opt={h:.5f} solved (max RSS {rr['max_rss_mb']:.0f} MB)")
        return ["--arms-npz", f, "--h-opt", repr(h)]

    rows = []
    for s in scales:
        rows.append(run_isolated(__file__, [a.case, "--one-level", repr(s), *arms_file(H_OPT)], a.case))
        log.info(f"level s={s:.4f} " + " ".join(f"{k}={v:.8g}" for k, v in rows[-1].items()
                                                if isinstance(v, float) and k != "scale"))
    arms = None if a.no_eo else rows[-1]["arm_modes"]
    res = {"case": a.case, "date": time.strftime("%Y-%m-%d"), "case_file": f"cases/{path.name}",
           "case_sha256": G.file_sha256(path), "versions": versions(), "pilot": a.pilot, "wavelength_um": LAM,
           "solver": "scikit-fem P2 electrostatics on gmsh; vector FEM N2/P2 arm modes; first-order Pockels perturbation",
           "conventions": {"voltage": "1 V terminal difference, signal 1 V, grounds 0 V",
                           "vpil": "lambda / (2 |dn_A - dn_B|), dn per volt of V_t; A = right arm (x > 0)",
                           "crystal_orientation": "crystal +z along lab +x, crystal +x along lab +y",
                           "gamma_scalar": "(g/V) int_LN E_x,static |E_x,opt|^2 dA / int_all |E_x,opt|^2 dA",
                           "optical_mesh_h_core_um": H_OPT},
           "levels": rows}
    keys = ["C_pF_per_m", "C0_pF_per_m", "n_rf", "Z0_ohm"]
    if arms:
        keys += ["vpil_vcm", "dn_mean_abs_per_V", "vpil_r33only_vcm", "vpil_scalar_vcm", "gamma_mean_abs",
                 "dn_A_per_V", "dn_B_per_V", "gamma_A", "gamma_B", "push_pull_balance"]
        res["comparands"] = {"primary": ["vpil_vcm", "dn_mean_abs_per_V", "C_pF_per_m", "C0_pF_per_m", "n_rf", "Z0_ohm"],
                             "informational": ["dn_A_per_V", "dn_B_per_V", "push_pull_balance", "gamma_A", "gamma_B",
                                               "vpil_r33only_vcm"],
                             "definitional_not_an_engine_target": ["vpil_scalar_vcm", "gamma_mean_abs"],
                             "note": "vpil_scalar uses Gamma without the n_e/n_eff power-normalisation factor; its "
                                     "+12.5 % vs the full-vector VpiL is a definitional comparison"}
        res["arm_modes"] = arms
    hs = [r["scale"] for r in rows]
    # p_formal 2: P2 with graded meshes at singular electrode corners (DevLog-028 round 2)
    res["extrapolated"] = {k: richardson(hs, [r[k] for r in rows], p_formal=2.0) for k in keys}
    for k in keys:
        e = res["extrapolated"][k]
        log.info(f"{a.case} {k}: ext={e['f_ext']:.8g} U={e['U']:.2e} p={e['p']} ({e['method']})")
    if arms and not a.pilot and not a.skip_optical_check:
        # optical-mesh sensitivity at the coarsest ES level (the finest ES level plus the finer arm mesh exceeds the
        # 1.5 GB per-process cap; round 2)
        row2 = run_isolated(__file__, [a.case, "--one-level", repr(scales[0]), *arms_file(H_OPT / 2**0.5)], a.case)
        res["optical_mesh_check"] = {"h_core_um": H_OPT / 2**0.5, "es_scale": scales[0], "row": row2,
                                     "d_vpil_vcm": row2["vpil_vcm"] - rows[0]["vpil_vcm"]}
        log.info(f"{a.case} optical-mesh check (ES scale {scales[0]}): VpiL {row2['vpil_vcm']:.6f} vs {rows[0]['vpil_vcm']:.6f}")
    if a.domain_study:
        dom = []
        for half in (250.0, 1000.0, 2000.0):
            row = run_isolated(__file__, [a.case, "--one-level", repr(scales[0]),
                                          "--domain-half", repr(half)], a.case)
            log.info(f"domain half {half:g}: C'={row['C_pF_per_m']:.6f} n_rf={row['n_rf']:.6f} Z0={row['Z0_ohm']:.5f}")
            dom.append(row)
        res["domain_study"] = {"scale": scales[0], "rows": dom,
                               "same_scale_yaml_domain": rows[0]}
    import shutil

    shutil.rmtree(tmpdir, ignore_errors=True)
    res["run_time_s"] = time.time() - t0
    out = ROOT / "reference" / f"{a.case}-es-eo{'-pilot' if a.pilot else ''}.json"
    out.write_text(json.dumps(res, indent=1, default=float))
    log.info(f"wrote {out}")


if __name__ == "__main__":
    main()
