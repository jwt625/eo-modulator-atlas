"""tidy3d LOCAL ModeSolver references for K1, K2, K3 (FD on the Yee grid; no cloud, no API key).

Local solves in tidy3d 2.12 have NO subpixel averaging unless the licensed `tidy3d-extras` package is present
(tidy3d/packaging.py `supports_local_subpixel`), so material interfaces are staircased. Convergence is therefore
studied on a sequence of non-uniform grids (core override step dl, far step scaled with it), extrapolated with the
observed order.
Media: dispersive Sellmeier models built from engine/data/materials.json coefficients (td.Sellmeier), LN as
td.AnisotropicMedium(xx = n_e, yy = zz = n_o). Boundary: PEC at the mode-plane edge (tidy3d default).
Outputs per level: n_eff, ng from tidy3d's own group_index_step, ng by +-10 nm central difference, TE fraction.

Run: uv run python scripts/ref_modes_tidy3d.py K2 [--pilot] [--dry-run]
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np
import shapely

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from eoref import geom as G  # noqa: E402
from eoref import materials as M  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, run_isolated, versions  # noqa: E402

LAM = 1.55
CORE_BOX = {"K1": ((-0.6, 0.6), (-0.45, 0.45)), "K2": ((-1.2, 1.2), (-0.4, 0.9)), "K3": ((-1.2, 1.2), (-0.4, 0.9))}
N_GUESS = {"K1": 2.6, "K2": 2.0, "K3": 2.0}
# Grid anchors: interface coordinates that must be grid lines; base steps divide the interface spacings exactly
# (K1: 0.5 x 0.22 um core -> dx | 0.25, dy | 0.22; K2/K3: y interfaces 0, 0.3, 0.6 -> dy | 0.3, rib top edges +-0.5).
ANCHOR = {"K1": (-0.25, -0.11), "K2": (-0.5, 0.0), "K3": (-0.5, 0.0)}
BASE = {"K1": (0.025, 0.022), "K2": (0.025, 0.03), "K3": (0.025, 0.03)}
DL_LEVELS = [1.0, 0.5, 0.25]  # refinement factor on BASE; 0.125 exceeds the 1.5 GB per-process cap
PILOT = [1.0, 0.5]
GROWTH = 1.15
ROLE = "sanity_only_not_a_gate"  # audit R3: staircase FD, U 4e-3..4e-2; never use in engine gates
# Mirror symmetry about x = 0 (windows are centred on the core): halves memory. Value fixed by the check in
# DevLog-028 (the symmetric run must reproduce the full-window TE0 n_eff).
SYM = -1


def axis_coords(lo, hi, blo, bhi, anchor, d, dmax):
    """Grid lines: uniform step d on [blo, bhi] snapped to anchor + k d, geometric growth to the window edges."""
    k0 = int(np.ceil((blo - anchor) / d - 1e-9))
    k1 = int(np.floor((bhi - anchor) / d + 1e-9))
    core = anchor + d * np.arange(k0, k1 + 1)
    right = [core[-1]]
    step = d
    while right[-1] < hi - 1e-12:
        step = min(step * GROWTH, dmax)
        right.append(min(right[-1] + step, hi))
    if len(right) > 2 and right[-1] - right[-2] < 0.3 * step:
        right.pop(-2)
    left = [core[0]]
    step = d
    while left[-1] > lo + 1e-12:
        step = min(step * GROWTH, dmax)
        left.append(max(left[-1] - step, lo))
    if len(left) > 2 and left[-2] - left[-1] < 0.3 * step:
        left.pop(-2)
    return np.concatenate([left[::-1][:-1], core, right[1:]])


def media():
    import tidy3d as td

    def sell(key):
        return td.Sellmeier(coeffs=[(b, c) for b, c in M.sellmeier_terms(key)])

    return {
        "air": td.Medium(permittivity=1.0),
        "silicon_dioxide": sell("sio2"),
        "silicon": sell("si"),
        "lithium_niobate": td.AnisotropicMedium(xx=sell("ln_e"), yy=sell("ln_o"), zz=sell("ln_o")),
    }


def build(case: dict, cid: str, dl: float, sym: int = SYM):
    import tidy3d as td

    geom = case["geometry"]
    win = geom["optical_window"]
    wpoly = G.window_polygon(win)
    med = media()
    structs = []
    for r in geom["regions"]:
        poly = G.shape_polygon(r).intersection(wpoly)
        if poly.is_empty:
            continue
        for p in getattr(poly, "geoms", [poly]):
            p = shapely.geometry.polygon.orient(p)
            verts = list(p.exterior.coords)[:-1]
            structs.append(td.Structure(geometry=td.PolySlab(vertices=verts, axis=2, slab_bounds=(-1, 1)),
                                        medium=med[r["material"]]))
    (x0, x1), (y0, y1) = win["x_um"], win["y_um"]
    (bx0, bx1), (by0, by1) = CORE_BOX[cid]
    dx, dy = BASE[cid][0] * dl, BASE[cid][1] * dl
    dmax = 8 * max(dx, dy)
    gx = axis_coords(x0, x1, bx0, bx1, ANCHOR[cid][0], dx, dmax)
    gy = axis_coords(y0, y1, by0, by1, ANCHOR[cid][1], dy, dmax)
    grid = td.GridSpec(grid_x=td.CustomGridBoundaries(coords=list(gx)), grid_y=td.CustomGridBoundaries(coords=list(gy)),
                       grid_z=td.UniformGrid(dl=0.1))
    sim = td.Simulation(
        size=((x1 - x0), (y1 - y0), 0), center=((x0 + x1) / 2, (y0 + y1) / 2, 0), structures=structs,
        medium=med["air"], grid_spec=grid, run_time=1e-12, symmetry=(sym, 0, 0),
        boundary_spec=td.BoundarySpec(x=td.Boundary.pec(), y=td.Boundary.pec(), z=td.Boundary.periodic()))
    plane = td.Box(center=((x0 + x1) / 2, (y0 + y1) / 2, 0), size=((x1 - x0), (y1 - y0), 0))
    return sim, plane


def solve(case, cid, dl, log, freqs, group_step):
    import tidy3d as td
    from tidy3d.plugins.mode import ModeSolver

    sim, plane = build(case, cid, dl)
    spec = td.ModeSpec(num_modes=4, target_neff=N_GUESS[cid], precision="double", group_index_step=group_step)
    ms = ModeSolver(simulation=sim, plane=plane, mode_spec=spec, freqs=freqs)
    data = ms.solve()
    neff = np.asarray(data.n_eff.values)  # (f, mode)
    te = np.asarray(data.pol_fraction["te"].values)
    ng = np.asarray(data.n_group.values) if group_step else None
    nx, ny = (len(ms._solver_grid.boundaries.x) - 1, len(ms._solver_grid.boundaries.y) - 1)
    return neff, te, ng, (nx, ny)


def level(case, cid, dl, log):
    import tidy3d as td

    t0 = time.time()
    f0 = td.C_0 / LAM
    neff, te, ng, shape = solve(case, cid, dl, log, [f0], True)
    j = int(np.argmax(te[0] > 0.5))
    if te[0, j] <= 0.5:
        raise RuntimeError(f"no TE mode: {neff} {te}")
    row = {"dl_core_um": dl * BASE[cid][0], "dx_dy_core_um": [dl * BASE[cid][0], dl * BASE[cid][1]], "grid": shape, "n_eff": float(neff[0, j]), "te_fraction": float(te[0, j]),
           "ng_tidy3d": float(ng[0, j]), "modes": [(float(a), float(b)) for a, b in zip(neff[0], te[0], strict=True)]}
    fp, fm = td.C_0 / (LAM + 0.010), td.C_0 / (LAM - 0.010)
    n2, t2, _, _ = solve(case, cid, dl, log, [fp, fm], False)
    jp = int(np.argmax(t2[0] > 0.5))
    jm = int(np.argmax(t2[1] > 0.5))
    row["ng_fd_10nm"] = row["n_eff"] - LAM * (float(n2[0, jp]) - float(n2[1, jm])) / 0.020
    row["time_s"] = time.time() - t0
    row["max_rss_mb"] = max_rss_mb()
    log.info(f"{cid} tidy3d refine={dl:.4f} grid={shape} n_eff={row['n_eff']:.8f} ng_td={row['ng_tidy3d']:.6f} "
             f"ng_fd10={row['ng_fd_10nm']:.6f} TE={row['te_fraction']:.5f} t={row['time_s']:.1f}s modes={row['modes']}")
    return row


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("case", choices=list(CORE_BOX))
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--one-level", type=float, default=None)
    ap.add_argument("--reextrapolate", action="store_true",
                    help="recompute extrapolation, role label and case hash from the stored levels (no solve)")
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    path = ROOT / "cases" / f"{a.case}.yaml"
    case = G.load_case(path)
    if a.reextrapolate:
        out = ROOT / "reference" / f"{a.case}-tidy3d.json"
        res = json.loads(out.read_text())
        hs = [r["dl_core_um"] for r in res["levels"]]
        res["extrapolated"] = {q: richardson(hs, [r[q] for r in res["levels"]], p_formal=1.0)
                               for q in ("n_eff", "ng_tidy3d", "ng_fd_10nm", "te_fraction")}
        res["role"] = ROLE
        old = res.get("case_sha256")
        res["case_sha256"] = G.file_sha256(path)
        res["reextrapolated"] = {"date": time.strftime("%Y-%m-%d"), "previous_case_sha256": old,
                                 "reason": "DevLog-028 round 2: R2 rule; R4 case YAML now 10-digit indices (tidy3d media "
                                           "are built from the library Sellmeier, equal to the YAML to 1e-10); no re-solve"}
        out.write_text(json.dumps(res, indent=1, default=float))
        print(f"rewrote {out}")
        return
    if a.one_level is not None:
        row = level(case, a.case, a.one_level, Logger(f"{a.case}-tidy3d-level"))
        Path(a.out).write_text(json.dumps(row, default=float))
        return
    log = Logger(f"{a.case}-tidy3d")
    levels = PILOT if a.pilot else DL_LEVELS
    log.info(f"case {path.name} sha256 {G.file_sha256(path)[:16]} levels {levels}")
    if a.dry_run:
        sim, _ = build(case, a.case, levels[0])
        log.info(f"dry run: {len(sim.structures)} structures, grid {sim.grid.num_cells}")
        return
    t0 = time.time()
    rows = []
    for dl in levels:
        rows.append(run_isolated(__file__, [a.case, "--one-level", repr(dl)], a.case))
        r = rows[-1]
        log.info(f"level refine={dl} n_eff={r['n_eff']:.8f} ng_td={r['ng_tidy3d']:.6f} TE={r['te_fraction']:.5f} "
                 f"max RSS {r['max_rss_mb']:.0f} MB")
    hs = [r["dl_core_um"] for r in rows]
    ext = {q: richardson(hs, [r[q] for r in rows], p_formal=1.0) for q in ("n_eff", "ng_tidy3d", "ng_fd_10nm", "te_fraction")}
    for q, e in ext.items():
        log.info(f"{a.case} tidy3d {q}: ext={e['f_ext']:.8f} U={e['U']:.2e} p={e['p']} ({e['method']})")
    res = {"case": a.case, "role": ROLE, "solver": "tidy3d local ModeSolver (FD, staircase, no subpixel)", "date": time.strftime("%Y-%m-%d"),
           "case_file": f"cases/{path.name}", "case_sha256": G.file_sha256(path), "versions": versions(), "pilot": a.pilot,
           "wavelength_um": LAM, "boundary": "PEC on the mode-plane edge (tidy3d default)", "levels": rows,
           "extrapolated": ext, "run_time_s": time.time() - t0}
    out = ROOT / "reference" / f"{a.case}-tidy3d{'-pilot' if a.pilot else ''}.json"
    out.write_text(json.dumps(res, indent=1, default=float))
    log.info(f"wrote {out}")


if __name__ == "__main__":
    main()
