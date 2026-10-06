"""Deduplicate people across papers (DevLog-020, decision 2): data/people.csv and data/paper_authors.csv.

Merge rules, in order (two groups with different ORCIDs are never merged):
  1. same ORCID (Crossref author record, only when the Crossref list matches papers.csv by family name);
  2. same normalized full name (accents, case, punctuation folded); for very common family names this also needs
     shared evidence: a shared organization (author affiliation, else the paper's organization lists) or a shared coauthor;
  3. compatible given names (initials vs full names, missing middle names) with the same family name and shared evidence
     (for very common family names both a shared organization and a shared coauthor).
person_id = ORCID iD when one is known, else a name slug (suffix -2, -3 on collision).

Usage: uv run python scripts/build_people.py [--check]
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PEOPLE_COLS = ["person_id", "name", "orcid", "variants", "n_papers", "merge_basis"]
PA_COLS = ["paper_id", "author_index", "author", "person_id"]
# Family names too common for a name match alone (top surnames in China, Korea, Vietnam, India; ad hoc).
COMMON = set(
    """zhang wang li liu chen yang huang zhao wu zhou xu sun ma zhu hu guo he lin gao luo zheng liang xie song tang han
    feng deng cao peng zeng xiao tian dong pan yuan cai jiang yu du ye cheng wei su lu ding ren shen yao jin
    kim lee park choi jung kang cho yoon jang lim nguyen tran le pham singh kumar sharma patel""".split()
)


SUFFIXES = {"jr", "sr", "ii", "iii", "iv"}


def fold(s: str) -> str:
    """ASCII, lower case; hyphenated names stay one token (Safavi-Naeini -> safavinaeini); K.-Y. and K-Y -> k y."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"(?<=[a-z]{2})-(?=[a-z]{2})", "", s)  # hyphen inside a name joins; between initials it separates
    return re.sub(r"[^a-z\s]", " ", s)


def tokens(name: str) -> tuple[list[str], str]:
    t = [x for x in fold(name).split() if x not in SUFFIXES]
    return (t[:-1], t[-1]) if t else ([], "")


def given_compatible(a: list[str], b: list[str]) -> bool:
    """First given names agree (equal, or one is the other's initial); middle names agree where both present."""
    if not a or not b:
        return False
    for x, y in zip(a, b, strict=False):
        if x == y or (len(x) == 1 and y.startswith(x)) or (len(y) == 1 and x.startswith(y)):
            continue
        return False
    return True


class UF:
    def __init__(self, n: int) -> None:
        self.p = list(range(n))
        self.orcid: dict[int, str] = {}

    def find(self, x: int) -> int:
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a: int, b: int) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        oa, ob = self.orcid.get(ra), self.orcid.get(rb)
        if oa and ob and oa != ob:
            return False
        self.p[rb] = ra
        if ob and not oa:
            self.orcid[ra] = ob
        return True


def read(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def build() -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    papers = read(DATA / "papers.csv")
    affil = read(DATA / "author_affiliations.csv") if (DATA / "author_affiliations.csv").exists() else []
    slot_orgs: dict[tuple[str, int], set[str]] = defaultdict(set)
    for r in affil:
        slot_orgs[(r["paper_id"], int(r["author_index"]))].add(r["org_name"])
    slots: list[dict[str, object]] = []
    for p in papers:
        names = [a.strip() for a in p["authors"].split(";") if a.strip()]
        cr_auth: list[dict[str, object]] = []
        crp = ROOT / "references" / p["paper_id"] / "crossref.json"
        if crp.exists():
            m = json.loads(crp.read_text())
            cr_auth = (m.get("message", m).get("author") or []) if isinstance(m, dict) else []
        paper_orgs = {o.strip() for c in ("universities", "companies") for o in p[c].split(";") if o.strip()}
        for i, n in enumerate(names, 1):
            orcid = ""
            if len(cr_auth) == len(names):
                a = cr_auth[i - 1]
                if tokens(str(a.get("family", "")))[1] == tokens(n)[1] and a.get("ORCID"):
                    orcid = str(a["ORCID"]).rsplit("/", 1)[-1]
            g, fam = tokens(n)
            slots.append(
                {
                    "pid": p["paper_id"],
                    "i": i,
                    "name": n,
                    "given": g,
                    "fam": fam,
                    "orcid": orcid,
                    "orgs": slot_orgs.get((p["paper_id"], i)) or paper_orgs,
                }
            )
    uf = UF(len(slots))
    basis: dict[int, set[str]] = defaultdict(set)
    for k, s in enumerate(slots):
        if s["orcid"]:
            uf.orcid[k] = str(s["orcid"])
    by_orcid: dict[str, list[int]] = defaultdict(list)
    by_fam: dict[str, list[int]] = defaultdict(list)
    for k, s in enumerate(slots):
        if s["orcid"]:
            by_orcid[str(s["orcid"])].append(k)
        by_fam[str(s["fam"])].append(k)
    for ks in by_orcid.values():
        for k in ks[1:]:
            if uf.union(ks[0], k):
                basis[k].add("orcid")
    coauth: dict[str, set[str]] = defaultdict(set)  # paper -> folded names of all its authors
    for s in slots:
        coauth[str(s["pid"])].add(" ".join(s["given"]) + " " + str(s["fam"]))  # type: ignore[arg-type]

    def evidence(a: dict[str, object], b: dict[str, object]) -> list[str]:
        out = []
        if set(a["orgs"]) & set(b["orgs"]):  # type: ignore[call-overload]
            out.append("shared_org")
        me = {" ".join(a["given"]) + " " + str(a["fam"]), " ".join(b["given"]) + " " + str(b["fam"])}  # type: ignore[arg-type]
        if (coauth[str(a["pid"])] & coauth[str(b["pid"])]) - me:
            out.append("shared_coauthor")
        return out

    for fam, ks in by_fam.items():
        for x in range(len(ks)):
            for y in range(x + 1, len(ks)):
                a, b = slots[ks[x]], slots[ks[y]]
                if a["pid"] == b["pid"]:
                    continue
                exact = a["given"] == b["given"]
                if exact and fam not in COMMON:
                    if uf.union(ks[x], ks[y]):
                        basis[ks[y]].add("exact_name")
                    continue
                if exact or given_compatible(a["given"], b["given"]):  # type: ignore[arg-type]
                    ev = evidence(a, b)
                    # common family name with initials only: both kinds of evidence required
                    enough = len(ev) == 2 if (fam in COMMON and not exact) else bool(ev)
                    if enough and uf.union(ks[x], ks[y]):
                        basis[ks[y]].add(("exact_name+" if exact else "compatible_name+") + "+".join(ev))
    groups: dict[int, list[int]] = defaultdict(list)
    for k in range(len(slots)):
        groups[uf.find(k)].append(k)
    people: list[dict[str, str]] = []
    pa: list[dict[str, str]] = []
    used: Counter[str] = Counter()
    for root, ks in sorted(groups.items(), key=lambda kv: (str(slots[kv[1][0]]["fam"]), str(slots[kv[1][0]]["name"]))):
        spell = Counter(str(slots[k]["name"]) for k in ks)
        name = max(spell, key=lambda n: (sum(len(t) > 1 for t in fold(n).split()), spell[n], len(n)))
        orcid = uf.orcid.get(root, "")
        if orcid:
            pid = orcid
        else:
            base = re.sub(r"\s+", "-", fold(name).strip())
            used[base] += 1
            pid = base if used[base] == 1 else f"{base}-{used[base]}"
        bases = sorted({x for k in ks for x in basis[k]})
        people.append(
            {
                "person_id": pid,
                "name": name,
                "orcid": orcid,
                "variants": ";".join(sorted(spell)),
                "n_papers": str(len({slots[k]["pid"] for k in ks})),
                "merge_basis": ";".join(bases),
            }
        )
        for k in ks:
            pa.append(
                {
                    "paper_id": str(slots[k]["pid"]),
                    "author_index": str(slots[k]["i"]),
                    "author": str(slots[k]["name"]),
                    "person_id": pid,
                }
            )
    order = {p["paper_id"]: n for n, p in enumerate(papers)}
    pa.sort(key=lambda r: (order[r["paper_id"]], int(r["author_index"])))
    return people, pa


def write(path: Path, cols: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report only; do not write")
    a = ap.parse_args()
    people, pa = build()
    merged = [p for p in people if int(p["n_papers"]) > 1]
    print(f"{len(pa)} author slots -> {len(people)} people; {len(merged)} people on more than one paper")
    print("merge basis:", dict(Counter(x for p in people for x in p["merge_basis"].split(";") if x)))
    if not a.check:
        write(DATA / "people.csv", PEOPLE_COLS, people)
        write(DATA / "paper_authors.csv", PA_COLS, pa)
    return 0


if __name__ == "__main__":
    sys.exit(main())
