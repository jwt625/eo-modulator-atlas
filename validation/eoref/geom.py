"""Case YAML -> disjoint labelled polygons (painter order) -> gmsh triangle mesh -> scikit-fem MeshTri.

Independent of the engine implementation: reads only the eo-atlas.sim/v1 YAML inputs.
Lengths in um throughout.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import gmsh
import numpy as np
import shapely
import yaml
from shapely.geometry import LineString, Polygon, box
from skfem import MeshTri


def load_case(path: str | Path) -> dict:
    return yaml.safe_load(Path(path).read_text())


def file_sha256(path: str | Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def shape_polygon(s: dict) -> Polygon:
    if "rect" in s:
        (x0, x1), (y0, y1) = s["rect"]["x_um"], s["rect"]["y_um"]
        return box(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
    return Polygon(s["polygon_um"])


def window_polygon(w: dict) -> Polygon:
    (x0, x1), (y0, y1) = w["x_um"], w["y_um"]
    return box(x0, y0, x1, y1)


@dataclass
class Piece:
    label: str  # region or electrode name
    material: str
    kind: str  # "region" | "electrode"
    geom: object  # shapely Polygon / MultiPolygon


@dataclass
class Layout:
    pieces: list[Piece]
    lines: list[tuple[str, LineString]] = field(default_factory=list)  # zero-thickness electrodes
    frame: Polygon | None = None


def build_layout(
    geometry: dict,
    clip: Polygon | None = None,
    electrodes: str = "area",  # "area" | "absent" | "line"
    shift_x: float = 0.0,
) -> Layout:
    """Painter-order resolution: later shapes win; electrodes are painted last.

    electrodes="absent" drops electrodes (underlying dielectric remains); "line" turns each electrode
    rectangle into its bottom edge (zero thickness) and keeps the dielectric underneath.
    shift_x translates the output so that x_local = x - shift_x.
    """
    frame = window_polygon(geometry["domain"]) if clip is None else clip
    shapes: list[tuple[str, str, str, Polygon]] = []
    for r in geometry["regions"]:
        shapes.append((r["name"], r["material"], "region", shape_polygon(r)))
    lines: list[tuple[str, LineString]] = []
    for e in geometry["electrodes"]:
        poly = shape_polygon(e)
        if electrodes == "area":
            shapes.append((e["name"], e["material"], "electrode", poly))
        elif electrodes == "line":
            x0, y0, x1, _ = poly.bounds
            ln = LineString([(x0, y0), (x1, y0)]).intersection(frame)
            if not ln.is_empty:
                lines.append((e["name"], ln))
    pieces: list[Piece] = []
    for i, (name, mat, kind, poly) in enumerate(shapes):
        g = poly.intersection(frame)
        for _, _, _, later in shapes[i + 1 :]:
            g = g.difference(later)
        g = shapely.make_valid(g)
        polys = [p for p in getattr(g, "geoms", [g]) if isinstance(p, Polygon) and p.area > 1e-12]
        if polys:
            pieces.append(Piece(name, mat, kind, shapely.MultiPolygon(polys) if len(polys) > 1 else polys[0]))
    if shift_x:
        for p in pieces:
            p.geom = shapely.affinity.translate(p.geom, xoff=-shift_x)
        lines = [(n, shapely.affinity.translate(ln, xoff=-shift_x)) for n, ln in lines]
        frame = shapely.affinity.translate(frame, xoff=-shift_x)
    return Layout(pieces, lines, frame)


@dataclass
class SizeRule:
    """Mesh size rule. kind: 'box' (x, y extents) or 'curves' (labels of pieces/lines whose boundary curves seed it).

    size = h inside (box) / on the curves, growing linearly with slope `grade` up to hmax.
    """

    kind: str
    h: float
    grade: float
    hmax: float
    x: tuple[float, float] | None = None
    y: tuple[float, float] | None = None
    labels: tuple[str, ...] = ()
    pts: tuple[tuple[float, float], ...] = ()


@dataclass
class MeshResult:
    mesh: MeshTri
    labels: list[str]  # label per element
    materials: list[str]
    kinds: list[str]
    n_nodes: int
    n_elems: int


def _poly_to_occ(poly: Polygon) -> int:
    """Add a polygon (with holes) to OCC; returns surface tag."""
    occ = gmsh.model.occ

    def loop(coords: list[tuple[float, float]]) -> int:
        pts = list(coords)[:-1]
        ptags = [occ.addPoint(x, y, 0.0) for x, y in pts]
        ltags = [occ.addLine(ptags[i], ptags[(i + 1) % len(ptags)]) for i in range(len(ptags))]
        return occ.addCurveLoop(ltags)

    loops = [loop(poly.exterior.coords)] + [loop(h.coords) for h in poly.interiors]
    return occ.addPlaneSurface(loops)


def mesh_layout(layout: Layout, rules: list[SizeRule], hmax: float, algo: int = 6, verbose: bool = False) -> MeshResult:
    gmsh.initialize()
    try:
        gmsh.option.setNumber("General.Terminal", 1 if verbose else 0)
        gmsh.model.add("m")
        occ = gmsh.model.occ
        surf_owner: list[tuple[int, int]] = []  # (surface tag, piece index)
        for ip, p in enumerate(layout.pieces):
            for poly in getattr(p.geom, "geoms", [p.geom]):
                surf_owner.append((_poly_to_occ(shapely.geometry.polygon.orient(poly)), ip))
        line_tags: list[tuple[int, int]] = []
        for il, (_, ln) in enumerate(layout.lines):
            for seg in getattr(ln, "geoms", [ln]):
                c = list(seg.coords)
                a = occ.addPoint(c[0][0], c[0][1], 0.0)
                b = occ.addPoint(c[-1][0], c[-1][1], 0.0)
                line_tags.append((occ.addLine(a, b), il))
        occ.synchronize()
        obj = [(2, t) for t, _ in surf_owner]
        tool = [(1, t) for t, _ in line_tags]
        occ.fragment(obj, tool)
        occ.synchronize()
        # curves for size rules
        fields: list[int] = []
        mf = gmsh.model.mesh.field
        all_curves = [t for _, t in gmsh.model.getEntities(1)]

        boundaries = {}
        for p in layout.pieces:
            boundaries.setdefault(p.label, []).append(p.geom.boundary)
        for name, ln in layout.lines:
            boundaries.setdefault(name, []).append(ln)
        curve_mid = {}
        for c in all_curves:
            lo, hi = gmsh.model.getParametrizationBounds(1, c)
            pts = gmsh.model.getValue(1, c, [0.5 * (float(lo[0]) + float(hi[0]))])
            curve_mid[c] = shapely.Point(pts[0], pts[1])

        def curves_of_labels(labels: tuple[str, ...]) -> list[int]:
            out: set[int] = set()
            for lab in labels:
                for bnd in boundaries.get(lab, []):
                    for c, pt in curve_mid.items():
                        if bnd.distance(pt) < 1e-9:
                            out.add(c)
            return sorted(out)

        for r in rules:
            if r.kind == "box":
                f = mf.add("Box")
                mf.setNumber(f, "VIn", r.h)
                mf.setNumber(f, "VOut", r.hmax)
                mf.setNumber(f, "XMin", r.x[0])
                mf.setNumber(f, "XMax", r.x[1])
                mf.setNumber(f, "YMin", r.y[0])
                mf.setNumber(f, "YMax", r.y[1])
                mf.setNumber(f, "Thickness", (r.hmax - r.h) / r.grade)
                fields.append(f)
            elif r.kind == "curves":
                cs = curves_of_labels(r.labels)
                if not cs:
                    raise RuntimeError(f"no curves for labels {r.labels}")
                d = mf.add("Distance")
                mf.setNumbers(d, "CurvesList", cs)
                mf.setNumber(d, "Sampling", 200)
                t = mf.add("Threshold")
                mf.setNumber(t, "InField", d)
                mf.setNumber(t, "SizeMin", r.h)
                mf.setNumber(t, "SizeMax", r.hmax)
                mf.setNumber(t, "DistMin", 0.0)
                mf.setNumber(t, "DistMax", (r.hmax - r.h) / r.grade)
                fields.append(t)
            elif r.kind == "points":
                ptags = [gmsh.model.occ.addPoint(px, py, 0.0) for px, py in r.pts]
                gmsh.model.occ.synchronize()
                d = mf.add("Distance")
                mf.setNumbers(d, "PointsList", ptags)
                t = mf.add("Threshold")
                mf.setNumber(t, "InField", d)
                mf.setNumber(t, "SizeMin", r.h)
                mf.setNumber(t, "SizeMax", r.hmax)
                mf.setNumber(t, "DistMin", 0.0)
                mf.setNumber(t, "DistMax", (r.hmax - r.h) / r.grade)
                fields.append(t)
        if fields:
            fmin = mf.add("Min")
            mf.setNumbers(fmin, "FieldsList", fields)
            mf.setAsBackgroundMesh(fmin)
        gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 0)
        gmsh.option.setNumber("Mesh.MeshSizeMax", hmax)
        gmsh.option.setNumber("Mesh.Algorithm", algo)
        gmsh.option.setNumber("General.NumThreads", 1)
        gmsh.model.mesh.generate(2)
        node_tags, coords, _ = gmsh.model.mesh.getNodes()
        node_tags = np.asarray(node_tags, dtype=np.int64)
        lut = -np.ones(int(node_tags.max()) + 1, dtype=np.int64)
        lut[node_tags] = np.arange(node_tags.size)
        xy = coords.reshape(-1, 3)[:, :2]
        et, _, en = gmsh.model.mesh.getElements(2)
        if list(et) != [2]:
            raise RuntimeError(f"unexpected element types {et}")
        t = lut[np.asarray(en[0], dtype=np.int64)].reshape(-1, 3)
    finally:
        gmsh.finalize()
    cx = xy[t, 0].mean(axis=1)
    cy = xy[t, 1].mean(axis=1)
    owner = -np.ones(t.shape[0], dtype=np.int64)
    for ip, pc in enumerate(layout.pieces):
        inside = shapely.contains_xy(pc.geom, cx, cy)
        owner[inside & (owner < 0)] = ip
    if (owner < 0).any():
        raise RuntimeError(f"{int((owner < 0).sum())} triangles not inside any piece")
    lab = [layout.pieces[i].label for i in owner]
    mat = [layout.pieces[i].material for i in owner]
    kinds = [layout.pieces[i].kind for i in owner]
    # compact nodes
    used = np.unique(t)
    remap = -np.ones(xy.shape[0], dtype=np.int64)
    remap[used] = np.arange(used.size)
    p = xy[used].T.copy()
    t = remap[t]
    # orient CCW
    a = p[:, t[:, 1]] - p[:, t[:, 0]]
    b = p[:, t[:, 2]] - p[:, t[:, 0]]
    neg = (a[0] * b[1] - a[1] * b[0]) < 0
    t[neg] = t[neg][:, [0, 2, 1]]
    mesh = MeshTri(p, t.T.copy())
    return MeshResult(mesh, lab, mat, kinds, p.shape[1], t.shape[0])
