"""Merge staged per-author affiliation batches into data/author_affiliations.csv.

Usage: uv run python scripts/merge_affiliations.py data/_staging/geo_01 ... [--apply] [--sites-out PATH]
Dry run by default: prints counts and problems. With --apply, writes data/author_affiliations.csv
(sorted by paper_id, author_index, aff_order): canonical rows are kept, and the rows of every paper present
in the staged batches replace that paper's canonical rows (2026-10-07; earlier versions rebuilt the table
from the given batches only). A staged paper must cover every author that has canonical rows (else a
problem is reported). Staged new organizations are appended to data/organizations.csv (skipping
names already present). --sites-out writes the unique (org_name, locality, country) site list of the
whole merged table (canonical + staged) for scripts/geocode_sites.py.
"""

import argparse
import csv
from pathlib import Path

COLS = ["paper_id", "author_index", "author", "aff_order", "kind", "org_name", "unit", "locality", "country", "source", "locator", "note"]


def read(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", nargs="+")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--sites-out")
    a = ap.parse_args()
    data = Path("data")
    o_header, orgs = read(data / "organizations.csv")
    names = {o["org_name"] for o in orgs}
    new_orgs: list[dict[str, str]] = []
    rows: list[dict[str, str]] = []
    problems: list[str] = []
    for d in map(Path, a.dirs):
        h, rr = read(d / "author_affiliations.csv")
        if h != COLS:
            problems.append(f"{d}: header {h}")
            continue
        rows += [{k: (v or "").strip() for k, v in r.items()} for r in rr]
        if (d / "organizations.csv").exists():
            for o in read(d / "organizations.csv")[1]:
                if o["org_name"] not in names:
                    names.add(o["org_name"])
                    new_orgs.append(o)
    staged_papers = {r["paper_id"] for r in rows}
    canonical = read(data / "author_affiliations.csv")[1]
    staged_authors = {(r["paper_id"], r["author_index"]) for r in rows}
    for r in canonical:  # a partial batch must not silently drop the other authors' canonical rows
        if r["paper_id"] in staged_papers and (r["paper_id"], r["author_index"]) not in staged_authors:
            problems.append(f"canonical author not in batch {(r['paper_id'], r['author_index'], r['author'])}")
    kept = [r for r in canonical if r["paper_id"] not in staged_papers]
    n_staged = len(rows)
    rows = kept + rows
    papers = {p["paper_id"]: [x.strip() for x in p["authors"].split(";") if x.strip()] for p in read(data / "papers.csv")[1]}
    seen = set()
    for r in rows:
        k = (r["paper_id"], r["author_index"], r["aff_order"])
        if k in seen:
            problems.append(f"duplicate {k}")
        seen.add(k)
        auth = papers.get(r["paper_id"])
        if auth is None or not (1 <= int(r["author_index"]) <= len(auth)) or auth[int(r["author_index"]) - 1] != r["author"]:
            problems.append(f"author mismatch {k} {r['author']!r}")
        if r["org_name"] not in names:
            problems.append(f"unknown org {r['org_name']!r} {k}")
        if r["source"] not in ("paper", "crossref"):
            problems.append(f"source {r['source']!r} {k}")
    rows.sort(key=lambda r: (r["paper_id"], int(r["author_index"]), int(r["aff_order"])))
    sites = sorted({(r["org_name"], r["locality"], r["country"]) for r in rows})
    print(
        f"staged rows {n_staged}, staged papers {len(staged_papers)}, kept canonical rows {len(kept)}; "
        f"rows {len(rows)}, papers {len({r['paper_id'] for r in rows})}, new orgs {len(new_orgs)}, "
        f"sites {len(sites)}, problems {len(problems)}"
    )
    for p in problems[:30]:
        print("PROBLEM", p)
    if a.sites_out:
        with open(a.sites_out, "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["org_name", "locality", "country"])
            w.writerows(sites)
    if a.apply and not problems:
        with (data / "author_affiliations.csv").open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=COLS)
            w.writeheader()
            w.writerows(rows)
        if new_orgs:
            allo = sorted(orgs + new_orgs, key=lambda o: o["org_name"])
            with (data / "organizations.csv").open("w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=o_header)
                w.writeheader()
                w.writerows(allo)
        print("applied")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
