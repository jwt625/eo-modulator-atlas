"""Physics sanity plots (PNG) for manual inspection: K1/K2/K3 TE0 |E|^2 and E components, K4 static potential and
E_x around one gap with the arm rib. Writes to the directory given by --outdir (session scratch, never the repo).

Run: uv run python scripts/plot_check.py --outdir /path/to/scratch
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import matplotlib.tri as mtri  # noqa: E402
import numpy as np  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from eoref import es as ES  # noqa: E402
from eoref import geom as G  # noqa: E402
from eoref import modecase as MC  # noqa: E402

BOX = {"K1": ((-0.6, 0.6), (-0.45, 0.45)), "K2": ((-1.2, 1.2), (-0.4, 0.9)), "K3": ((-1.2, 1.2), (-0.4, 0.9))}


def outline(ax, layout, shift=0.0, mirror=True):
    for p in layout.pieces:
        for poly in getattr(p.geom, "geoms", [p.geom]):
            x, y = poly.exterior.xy
            ax.plot(np.array(x) - shift, y, "w-", lw=0.4)
            if mirror:
                ax.plot(-(np.array(x) - shift), y, "w-", lw=0.4)


def mode_plot(cid: str, outdir: Path) -> None:
    case = G.load_case(ROOT / "cases" / f"{cid}.yaml")
    win = case["geometry"]["optical_window"]
    om = MC.optical_mesh(case, win, 0.06, BOX[cid], ("ln_slab",) if cid != "K1" else (), hmax=0.36)
    m, info = MC.solve_te0(om, 1.55, 3.0 if cid == "K1" else 2.2)
    f = m.fields_qp()
    comps = {k: (np.abs(f[k]) ** 2).mean(axis=1) for k in ("ex", "ey", "ez")}  # per-triangle mean
    p = om.mr.mesh.p
    t = om.mr.mesh.t
    tri = mtri.Triangulation(np.r_[p[0], -p[0]], np.r_[p[1], p[1]], np.r_[t.T, t.T + p.shape[1]])
    fig, axs = plt.subplots(1, 3, figsize=(15, 4))
    for ax, (k, v) in zip(axs, comps.items(), strict=True):
        ax.tripcolor(tri, facecolors=np.r_[v, v], cmap="inferno")
        lay = G.build_layout(case["geometry"], clip=G.window_polygon(win), electrodes="absent")
        outline(ax, lay, mirror=False)
        ax.set_aspect("equal")
        ax.set_xlim(-2.5, 2.5)
        ax.set_ylim(-1.5, 2.0)
        ax.set_title(f"{cid} |{k}|^2 n_eff={m.n_eff:.5f}")
    fig.tight_layout()
    fig.savefig(outdir / f"{cid}_mode.png", dpi=110)
    plt.close(fig)
    print(cid, "modes", info)


def es_plot(cid: str, outdir: Path) -> None:
    import ref_es_eo as R
    from skfem import Basis, ElementTriP2

    case = G.load_case(ROOT / "cases" / f"{cid}.yaml")
    layout = G.build_layout(case["geometry"], electrodes="area")
    rules, hmax = R.es_rules(case, 2.0)
    mr = G.mesh_layout(layout, rules, hmax=hmax)
    exx, eyy = R.rf_eps(case, mr.materials)
    basis = Basis(mr.mesh, ElementTriP2())
    d = {e["name"]: (R.electrode_dofs(basis, mr.labels, e["name"]), float(e["weight"])) for e in case["geometry"]["electrodes"]}
    r = ES.solve_es(mr.mesh, exx, eyy, d)
    bdg, gx, gy = ES.grad_dg(r)
    xs = np.linspace(8, 17, 361)
    ys = np.linspace(-1.0, 2.0, 241)
    X, Y = np.meshgrid(xs, ys)
    ex, ey = ES.static_field_at(bdg, gx, gy, np.vstack([X.ravel(), Y.ravel()]))
    phi = r.basis.probes(np.vstack([X.ravel()[:1], Y.ravel()[:1]]))  # smoke
    _ = phi
    fig, axs = plt.subplots(2, 1, figsize=(10, 7))
    im = axs[0].pcolormesh(X, Y, ex.reshape(X.shape), cmap="RdBu_r", vmin=-0.5, vmax=0.5)
    fig.colorbar(im, ax=axs[0], label="E_x (V/um per V)")
    im = axs[1].pcolormesh(X, Y, ey.reshape(X.shape), cmap="RdBu_r", vmin=-0.5, vmax=0.5)
    fig.colorbar(im, ax=axs[1], label="E_y (V/um per V)")
    for ax in axs:
        for p in layout.pieces:
            for poly in getattr(p.geom, "geoms", [p.geom]):
                x, y = poly.exterior.xy
                ax.plot(x, y, "k-", lw=0.5)
        ax.set_xlim(8, 17)
        ax.set_ylim(-1, 2)
        ax.set_aspect("equal")
    fig.tight_layout()
    fig.savefig(outdir / f"{cid}_static.png", dpi=110)
    plt.close(fig)
    # line cut through the rib centre height
    yc = 0.45
    xs2 = np.linspace(10.01, 14.99, 200)
    ex2, _ = ES.static_field_at(bdg, gx, gy, np.vstack([xs2, np.full_like(xs2, yc)]))
    print(cid, "E_x at rib mid-height x=12.5:", float(np.interp(12.5, xs2, ex2)), "V/um per V; 1/gap =", 1 / 5)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--outdir", required=True)
    a = ap.parse_args()
    out = Path(a.outdir)
    out.mkdir(parents=True, exist_ok=True)
    for cid in ("K1", "K2", "K3"):
        mode_plot(cid, out)
    es_plot("K4", out)


if __name__ == "__main__":
    main()
