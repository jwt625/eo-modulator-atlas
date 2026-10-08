"""Assemble the 71 new org_sites rows (DevLog-022 G1) from the first geocoding pass, the Opus site review and the
refinement pass, then append them to data/org_sites.csv.

Rules: review ok / keep city -> first-pass row; same_as -> coordinates copied from that existing site; override ->
refined row when it resolved an object (not a locality centre), else the first-pass row, except where the first
pass was judged wrong (then the refined locality centre). A refined hit on the printed street address (label starts
with a house number from the query) is relabelled precision building. Chongqing University: the cached Nominatim hit is
the metro station named after the campus (OSM node 10180144507), rejected by the distance check against the
municipality centroid; used at precision postcode with a note.

Usage: uv run python data/_staging/ingest_2026_10_07/assemble_sites.py [--apply]
"""

import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
G = ROOT / "data" / "_staging" / "geo_sites_1007"
APPLY = "--apply" in sys.argv
COLS = [
    "org_name",
    "locality",
    "country",
    "lat",
    "lon",
    "precision",
    "source",
    "source_ref",
    "source_label",
    "verified_on",
    "notes",
]


def read(p: Path) -> list[dict[str, str]]:
    with p.open(newline="") as f:
        return list(csv.DictReader(f))


def main() -> None:
    first = {(r["org_name"], r["locality"]): r for f in ("geocoded_a.csv", "geocoded_b.csv") for r in read(G / f)}
    review = {(r["org_name"], r["locality"]): r for r in read(G / "site_review.csv")}
    refined = {(r["org_name"], r["locality"]): r for r in read(G / "refined.csv")}
    canon_path = ROOT / "data" / "org_sites.csv"
    canon = read(canon_path)
    existing = {f"{r['org_name']}|{r['locality']}": r for r in canon}
    out = []
    for key, fr in first.items():
        rv = review[key]
        row = {c: fr.get(c, "") for c in COLS}
        how = "first pass"
        if rv["same_as"]:
            src = existing[rv["same_as"]]
            row.update({c: src[c] for c in ("lat", "lon", "precision", "source", "source_ref", "source_label")})
            row["notes"] = f"same site as {rv['same_as']} (coordinates copied, site review 2026-10-07)"
            how = "same_as"
        elif rv["wikidata_search"] or rv["nominatim_query"]:
            rf = refined[key]
            resolved = (
                rf["source"]
                and not rf["source_label"].startswith("locality centre")
                and rf["precision"] != "unresolved"
            )
            if resolved or rv["verdict"] == "wrong":
                row = {c: rf.get(c, "") for c in COLS}
                how = "refined"
                q = rv["nominatim_query"]
                m = re.search(r"(?<![\w-])(\d[\d-]*)(?![\w-])", q)
                if resolved and m and rf["source_label"].startswith(m.group(1)) and row["precision"] == "city":
                    row["precision"] = "building"
                    row["notes"] = (
                        row["notes"] + "; " if row["notes"] else ""
                    ) + "printed street address matched (precision building)"
        if key == ("Chongqing University", "Chongqing"):
            row.update(
                lat="29.56995",
                lon="106.45961",
                precision="postcode",
                source="nominatim",
                source_ref="osm:node/10180144507",
                source_label="重庆大学 (metro station), 沙坪坝区, 重庆市, 400030",
                notes="station named after the campus; institution object not resolved; the distance check "
                "against the municipality centroid (about 140 km) rejected it; accepted by the coordinator",
            )
            how = "coordinator"
        out.append(row)
        print(f"{how:11s} {row['precision']:10s} {key[0][:40]:40s} | {key[1]}")
    assert not ({f"{r['org_name']}|{r['locality']}" for r in out} & set(existing)), "duplicate site"
    if APPLY:
        raw = canon_path.read_bytes()
        term = "\r\n" if b"\r\n" in raw[:4096] else "\n"
        rows = sorted(canon + out, key=lambda r: (r["org_name"], r["locality"]))
        with canon_path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=COLS, lineterminator=term)
            w.writeheader()
            w.writerows(rows)
    print(len(out), "sites", "(applied)" if APPLY else "(dry run)")


if __name__ == "__main__":
    main()
