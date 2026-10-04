"""Convert the `countries` object of a quantized TopoJSON (Plotly geo assets) to a GeoJSON FeatureCollection.

Usage: uv run python scripts/topojson_to_geojson.py app/static/topojson/world_110m.json app/static/geo/countries_110m.geojson
Coordinates are rounded to 3 decimals (about 100 m), enough for an outline basemap. Rings crossing the
antimeridian are unwrapped (consecutive longitudes kept within 180 deg) so MapLibre does not draw edges across
the whole map; Antarctica (a ring around the pole, no affiliations) is omitted.
"""

import json
import sys
from pathlib import Path
from typing import Any


def decode_arcs(topo: dict[str, Any]) -> list[list[list[float]]]:
    t = topo.get("transform")
    out = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            if t:
                x, y = x + dx, y + dy
                pts.append([round(x * t["scale"][0] + t["translate"][0], 3), round(y * t["scale"][1] + t["translate"][1], 3)])
            else:
                pts.append([round(dx, 3), round(dy, 3)])
        out.append(pts)
    return out


def ring(arcs: list[list[list[float]]], idx: list[int]) -> list[list[float]]:
    pts: list[list[float]] = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


def unwrap(pts: list[list[float]]) -> list[list[float]]:
    out = [pts[0][:]] if pts else []
    for x, y in pts[1:]:
        px = out[-1][0]
        while x - px > 180:
            x -= 360
        while px - x > 180:
            x += 360
        out.append([round(x, 3), y])
    return out


def main() -> int:
    topo = json.loads(Path(sys.argv[1]).read_text())
    arcs = decode_arcs(topo)
    feats = []
    for g in topo["objects"]["countries"]["geometries"]:
        if g.get("id") == "ATA":
            continue
        if g["type"] == "Polygon":
            geom = {"type": "Polygon", "coordinates": [unwrap(ring(arcs, r)) for r in g["arcs"]]}
        elif g["type"] == "MultiPolygon":
            geom = {"type": "MultiPolygon", "coordinates": [[unwrap(ring(arcs, r)) for r in p] for p in g["arcs"]]}
        else:
            continue
        feats.append({"type": "Feature", "id": g.get("id"), "properties": {"id": g.get("id")}, "geometry": geom})
    out = Path(sys.argv[2])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"type": "FeatureCollection", "features": feats}, separators=(",", ":")))
    print(f"{len(feats)} features, {out.stat().st_size // 1024} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
