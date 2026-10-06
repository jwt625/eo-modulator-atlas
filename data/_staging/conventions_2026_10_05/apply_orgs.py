"""Apply W3a/W3b organization research (DevLog-020 decision 9): renames to the organization's own preferred English
name, merges, country/type fixes, and new columns ror_id + name_source in organizations.csv. Renames propagate to
papers.csv (universities, companies, foundry_or_fab), author_affiliations.csv, org_sites.csv and parent_org.

Usage: uv run python data/_staging/conventions_2026_10_05/apply_orgs.py [--apply]
"""

import csv
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = ROOT / "data"
APPLY = "--apply" in sys.argv
# Coordinator decisions on judgement calls (DevLog-020): current name -> action.
# IKZ: its own English pages keep the German name (same rule as Technische Universitat Berlin).
OVERRIDE: dict[str, str] = {"Leibniz-Institut für Kristallzüchtung": "keep"}
PARENTS = {  # child (final name) -> parent (final name), only where the parent row exists
    "Nokia Bell Labs": "Nokia Corporation",
    "Infinera Corporation": "Nokia Corporation",
    "Institute of Microelectronics": "Agency for Science, Technology and Research",
    "National Semiconductor Translation and Innovation Centre": "Agency for Science, Technology and Research",
    "Optics Valley Laboratory": "Huazhong University of Science and Technology",
}
NEW_ORGS = [
    {"org_name": "Liobate", "org_type": "company", "country": "CN", "region": "east_asia", "parent_org": "",
     "notes": "Nanjing (registry profiles; site phone area code 025); legal name 'Liobate Technologies Limited' (site copyright); "
     "the paper (zhou2026) writes 'Liobate Technology' and gives no address",
     "ror_id": "", "name_source": "https://en.liobate.com/"},
]
EXTRA_RENAMES = {"Liobate Technology": "Liobate"}  # names used in papers.csv that have no organizations row yet


def read(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def write(path: Path, header: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    research: list[dict[str, str]] = []
    for name in ("W3a_orgs.csv", "W3b_orgs.csv"):
        if (HERE / name).exists():
            research += read(HERE / name)[1]
    o_header, orgs = read(DATA / "organizations.csv")
    by_name = {o["org_name"]: o for o in orgs}
    rename: dict[str, str] = {}
    for r in research:
        cur = r["org_name_current"]
        if cur not in by_name:
            print(f"SKIP research row for unknown org {cur!r}")
            continue
        o = by_name[cur]
        action = OVERRIDE.get(cur, r["action"])
        o["ror_id"] = r.get("ror_id", "")
        o["name_source"] = r.get("name_source_url", "")
        if action == "rename":
            rename[cur] = r["preferred_name"]
        elif action.startswith("merge_into:"):
            rename[cur] = action.split(":", 1)[1]
        elif action == "fix_country":
            m = re.search(r"country_target=([A-Z]{2})", r.get("note", ""))
            new_c = m.group(1) if m else (r.get("country_ror") or r.get("country_source") or "")
            if len(new_c) == 2:
                print(f"country {cur}: {o['country']} -> {new_c}")
                o["country"] = new_c
        elif action.startswith("fix_type:"):
            print(f"type {cur}: {o['org_type']} -> {action.split(':', 1)[1]}")
            o["org_type"] = action.split(":", 1)[1]
    rename.update(EXTRA_RENAMES)
    for o in NEW_ORGS:
        if o["org_name"] not in by_name:
            orgs.append(dict(o))
            print(f"org + {o['org_name']}")
    for a, b in rename.items():
        print(f"rename {a!r} -> {b!r}")
    # organizations: rename, merge (keep the surviving row, append the old name to notes)
    out: dict[str, dict[str, str]] = {}
    for o in orgs:
        n = rename.get(o["org_name"], o["org_name"])
        o["parent_org"] = rename.get(o["parent_org"], o["parent_org"])
        if n != o["org_name"]:
            o["notes"] = (o["notes"] + f"; formerly listed as {o['org_name']!r} (renamed 2026-10-05, own preferred name)").lstrip("; ")
        o["org_name"] = n
        if n in out:
            keep = out[n]
            keep["notes"] = (keep["notes"] + "; merged duplicate: " + o["notes"]).strip("; ")
            keep["ror_id"] = keep.get("ror_id") or o.get("ror_id", "")
            keep["name_source"] = keep.get("name_source") or o.get("name_source", "")
            print(f"merge row into {n!r}")
        else:
            out[n] = o
    for child, parent in PARENTS.items():
        if child in out and parent in out and out[child]["parent_org"] != parent:
            print(f"parent {child!r}: {out[child]['parent_org']!r} -> {parent!r}")
            out[child]["parent_org"] = parent
    new_header = o_header + [c for c in ("ror_id", "name_source") if c not in o_header]
    new_orgs = sorted(out.values(), key=lambda o: o["org_name"])
    # papers lists
    p_header, papers = read(DATA / "papers.csv")
    n_p = 0
    for p in papers:
        for col in ("universities", "companies", "foundry_or_fab"):
            items = [x.strip() for x in p[col].split(";") if x.strip()]
            new = list(dict.fromkeys(rename.get(x, x) for x in items))
            if new != items:
                p[col] = ";".join(new)
                n_p += 1
    # affiliations and sites
    a_header, affil = read(DATA / "author_affiliations.csv")
    n_a = 0
    for r in affil:
        if r["org_name"] in rename:
            r["org_name"] = rename[r["org_name"]]
            n_a += 1
    s_header, sites = read(DATA / "org_sites.csv")
    seen: dict[tuple[str, str], dict[str, str]] = {}
    for r in sites:
        r["org_name"] = rename.get(r["org_name"], r["org_name"])
        k = (r["org_name"], r["locality"])
        if k in seen:
            print(f"site duplicate after merge {k}; kept first")
            continue
        seen[k] = r
    print(f"papers cells {n_p}; affiliation rows {n_a}; sites {len(sites)} -> {len(seen)}")
    if APPLY:
        write(DATA / "organizations.csv", new_header, new_orgs)
        write(DATA / "papers.csv", p_header, papers)
        write(DATA / "author_affiliations.csv", a_header, affil)
        write(DATA / "org_sites.csv", s_header, sorted(seen.values(), key=lambda r: (r["org_name"], r["locality"])))


if __name__ == "__main__":
    main()
