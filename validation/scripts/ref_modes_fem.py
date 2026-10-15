"""Full-vector FEM mode references for K1, K2, K3 (and the K4 arm mode, which equals K2 by construction).

Solver: own diagonal-anisotropic Nedelec(2)+Lagrange(2) form (eoref.fmode, femwell formulation) on gmsh meshes;
for isotropic K1 also femwell 0.1.12 compute_modes(order=2) on the same mesh.
Outputs per level: n_eff, ng (central wavelength difference, +-10 nm and +-5 nm, Sellmeier in all materials),
ng from the energy-velocity integral, TE fraction, LN/core power fraction. Richardson over levels.

Run: uv run python scripts/ref_modes_fem.py K2 [--pilot] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eoref import fmode as FM  # noqa: E402
from eoref import geom as G  # noqa: E402
from eoref import modecase as MC  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, run_isolated, versions  # noqa: E402

LAM = 1.55

SETUP = {
    "K1": {"box": ((-0.6, 0.6), (-0.45, 0.45)), "slab": (), "n_guess": 3.0, "core_labels": ("core",)},
    "K2": {"box": ((-1.2, 1.2), (-0.4, 0.9)), "slab": ("ln_slab",), "n_guess": 2.2, "core_labels": ("ln_slab", "ln_rib")},
    "K3": {"box": ((-1.2, 1.2), (-0.4, 0.9)), "slab": ("ln_slab",), "n_guess": 2.2, "core_labels": ("ln_slab", "ln_rib")},
}
H_LEVELS = [0.08, 0.08 / 2**0.5, 0.04, 0.04 / 2**0.5]  # finer levels exceed the ~1.5 GB per-process cap
PILOT_LEVELS = [0.12, 0.08]


def solve_level(case: dict, cid: str, h: float, log: Logger, window: dict | None = None, femwell_check: bool = False) -> dict:
    s = SETUP[cid]
    win = window or case["geometry"]["optical_window"]
    t0 = time.time()
    om = MC.optical_mesh(case, win, h, s["box"], s["slab"], hmax=6 * h)
    t_mesh = time.time() - t0
    m, info = MC.solve_te0(om, LAM, s["n_guess"])
    out = {"h_core_um": h, "n_nodes": om.mr.n_nodes, "n_elems": om.mr.n_elems, "dofs": int(m.basis.N),
           "n_eff": m.n_eff, "te_fraction": FM.te_fraction(m), "modes_found": info}
    mask = np.isin(np.array(om.mr.labels), s["core_labels"])
    out["power_fraction_core"] = MC.power_fraction(m, mask)
    out["ng_energy"] = FM.group_index_energy(m, MC.eps_arrays(om, LAM, MC.epsg_diag))
    for dl in (0.010,):
        mp, _ = MC.solve_te0(om, LAM + dl, s["n_guess"])
        mm, _ = MC.solve_te0(om, LAM - dl, s["n_guess"])
        out[f"ng_fd_{int(dl * 1000)}nm"] = m.n_eff - LAM * (mp.n_eff - mm.n_eff) / (2 * dl)
    if femwell_check:
        from femwell.maxwell.waveguide import compute_modes
        from skfem import Basis, ElementTriP0

        exx, _, _ = MC.eps_arrays(om, LAM)
        fw = compute_modes(Basis(om.mr.mesh, ElementTriP0(), intorder=4), exx, wavelength=LAM, num_modes=4, order=2,
                           metallic_boundaries=True, n_guess=s["n_guess"])
        te = [x for x in fw.modes if x.te_fraction > 0.5]
        out["femwell_n_eff"] = float(np.real(te[0].n_eff))
        out["femwell_te_fraction"] = float(te[0].te_fraction)
    out["time_s"] = time.time() - t0
    out["max_rss_mb"] = max_rss_mb()
    out["time_mesh_s"] = t_mesh
    log.info(f"{cid} h={h:.5f} nodes={om.mr.n_nodes} dofs={out['dofs']} n_eff={m.n_eff:.8f} "
             f"ng_fd10={out['ng_fd_10nm']:.6f} ng_E={out['ng_energy']:.6f} "
             f"TE={out['te_fraction']:.5f} Pcore={out['power_fraction_core']:.4f} "
             + (f"femwell={out['femwell_n_eff']:.8f} " if femwell_check else "")
             + f"t={out['time_s']:.1f}s modes={[(round(a, 5), round(b, 3)) for a, b in info]}")
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("case", choices=list(SETUP))
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--levels", default=None, help="comma-separated h_core list (um), overrides the default levels")
    ap.add_argument("--one-level", type=float, default=None, help="internal: solve one level, write --out")
    ap.add_argument("--window-scale", type=float, default=1.0, help="internal: window scale for --one-level")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    path = ROOT / "cases" / f"{a.case}.yaml"
    case = G.load_case(path)
    if a.one_level is not None:
        lg = Logger(f"{a.case}-fem-level")
        win = None
        if a.window_scale != 1.0:
            w = case["geometry"]["optical_window"]
            dom = case["geometry"]["domain"]
            f = a.window_scale
            win = {"x_um": [max(f * w["x_um"][0], dom["x_um"][0]), min(f * w["x_um"][1], dom["x_um"][1])],
                   "y_um": [max(f * w["y_um"][0], dom["y_um"][0]), min(f * w["y_um"][1], dom["y_um"][1])]}
        row = solve_level(case, a.case, a.one_level, lg, window=win, femwell_check=(a.case == "K1" and win is None))
        if win:
            row["window"] = win
        Path(a.out).write_text(json.dumps(row, default=float))
        return
    levels = PILOT_LEVELS if a.pilot else H_LEVELS
    if a.levels:
        levels = [float(v) for v in a.levels.split(",")]
    log = Logger(f"{a.case}-fem")
    log.info(f"case {path.name} sha256 {G.file_sha256(path)[:16]} levels {levels}")
    if a.dry_run:
        om = MC.optical_mesh(case, case["geometry"]["optical_window"], levels[0], SETUP[a.case]["box"], SETUP[a.case]["slab"])
        log.info(f"dry run: coarse mesh {om.mr.n_nodes} nodes, labels {sorted(set(om.mr.labels))}")
        return
    t0 = time.time()
    rows = []
    for h in levels:
        rows.append(run_isolated(__file__, [a.case, "--one-level", repr(h)], a.case))
        r = rows[-1]
        log.info(f"level h={h:.5f} n_eff={r['n_eff']:.8f} ng_fd10={r['ng_fd_10nm']:.6f} ng_E={r['ng_energy']:.6f} "
                 f"TE={r['te_fraction']:.5f} max RSS {r['max_rss_mb']:.0f} MB")
    # window-size check at the second-finest level (1.5x window, clipped to the domain)
    wrow = run_isolated(__file__, [a.case, "--one-level", repr(levels[-2]), "--window-scale", "1.5"], a.case)

    hs = [r["h_core_um"] for r in rows]
    # p_formal: 4 for the N2/P2 eigenvalue and the variational energy-velocity ng (and FD ng built from
    # eigenvalues); 2 for field-ratio functionals (TE fraction, power fraction)
    pf = {"n_eff": 4.0, "ng_fd_10nm": 4.0, "ng_energy": 4.0, "te_fraction": 2.0, "power_fraction_core": 2.0}
    ext = {q: richardson(hs, [r[q] for r in rows], p_formal=pf[q]) for q in pf}
    win_shift = wrow["n_eff"] - rows[-2]["n_eff"]
    for q, e in ext.items():
        log.info(f"{a.case} {q}: ext={e['f_ext']:.8f} U={e['U']:.2e} p={e['p']} ({e['method']})")
    log.info(f"{a.case} window 1.5x shift in n_eff at level {levels[-2]:.4f}: {win_shift:+.2e}")
    res = {
        "case": a.case, "solver": "vector FEM N2/P2 (eoref.fmode, femwell formulation, diagonal anisotropy)",
        "date": time.strftime("%Y-%m-%d"), "case_file": f"cases/{path.name}", "case_sha256": G.file_sha256(path),
        "versions": versions(), "pilot": a.pilot, "wavelength_um": LAM,
        "boundary": "PEC (zero tangential E) on the optical window edge",
        "levels": rows, "extrapolated": ext, "window_check": {"row": wrow, "dn_eff_vs_same_level": win_shift},
        "run_time_s": time.time() - t0,
    }
    out = ROOT / "reference" / f"{a.case}-fem{'-pilot' if a.pilot else ''}.json"
    out.write_text(json.dumps(res, indent=1, default=float))
    log.info(f"wrote {out}")


if __name__ == "__main__":
    main()
