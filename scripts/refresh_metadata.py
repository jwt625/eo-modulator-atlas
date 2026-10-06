"""Fetch and cache bibliographic metadata used by the 2026-10-05 identity/date/author/licence rules (DevLog-020).

Sources (one request at a time per host, cached, never re-fetched; circuit breaker on 403/429/5xx):
  Crossref work by DOI        -> references/<id>/crossref.json              (>= 2 s spacing)
  Crossref title search       -> data/_staging/conventions_2026_10_05/search/crossref/<id>.json
  arXiv OAI-PMH arXivRaw      -> references/<id>/arxiv.json (parsed fields + raw XML; >= 3 s spacing)
  arXiv API title search      -> data/_staging/conventions_2026_10_05/search/arxiv/<id>.json
A search hit is accepted only on an exact normalized-title match plus a first-author family-name match.

Usage:
  uv run python scripts/refresh_metadata.py fetch [--only ID ...] [--limit N] [--dry-run]
"""

from __future__ import annotations

import argparse
import csv
import html
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "references"
SEARCH = ROOT / "data" / "_staging" / "conventions_2026_10_05" / "search"
UA = "eo-modulator-atlas/0.1 (research dataset metadata; https://github.com/jwt625/eo-modulator-atlas)"
SPACING = {"api.crossref.org": 2.0, "export.arxiv.org": 3.1}
_last: dict[str, float] = {}
ARXIV_DOI_PREFIX = "10.48550/"


class Blocked(RuntimeError):
    pass


def get(url: str) -> requests.Response:
    host = urllib.parse.urlparse(url).netloc
    wait = SPACING[host] - (time.time() - _last.get(host, 0.0))
    if wait > 0:
        time.sleep(wait)
    for attempt in range(3):
        try:
            r = requests.get(url, headers={"User-Agent": UA}, timeout=60)
            break
        except (requests.Timeout, requests.ConnectionError) as e:
            if attempt == 2:
                raise Blocked(f"{host} unreachable after 3 attempts: {e}") from e
            time.sleep(20 * (attempt + 1))
        finally:
            _last[host] = time.time()
    if r.status_code in (403, 429) or r.status_code >= 500:
        raise Blocked(f"{host} HTTP {r.status_code}; stop and wait")
    return r


def norm_title(s: str) -> str:
    s = unicodedata.normalize("NFKD", re.sub(r"<[^>]+>", "", s)).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv"}


def family(name: str) -> str:
    parts = [t for t in norm_title(name).split() if t not in NAME_SUFFIXES]
    return parts[-1] if parts else ""


def bare_arxiv(aid: str) -> str:
    return re.sub(r"v\d+$", "", aid.strip())


# ---------------------------------------------------------------- Crossref


def crossref_by_doi(pid: str, doi: str, dry: bool) -> str:
    path = REFS / pid / "crossref.json"
    if path.exists():
        return "cached"
    if dry:
        return "would_fetch"
    r = get(f"https://api.crossref.org/works/{urllib.parse.quote(doi)}")
    if r.status_code != 200:
        return f"http_{r.status_code}"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(r.json(), indent=1, ensure_ascii=False))
    return "fetched"


def crossref_search(pid: str, title: str, first_author: str, dry: bool) -> str:
    path = SEARCH / "crossref" / f"{pid}.json"
    if not path.exists():
        if dry:
            return "would_search"
        q = urllib.parse.urlencode(
            {
                "query.bibliographic": title,
                "query.author": family(first_author),
                "rows": 5,
                "select": "DOI,title,author,type,issued",
            }
        )
        r = get(f"https://api.crossref.org/works?{q}")
        if r.status_code != 200:
            return f"http_{r.status_code}"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(r.json(), indent=1, ensure_ascii=False))
    items = json.loads(path.read_text())["message"]["items"]
    want, fam = norm_title(title), family(first_author)
    for it in items:
        t = norm_title((it.get("title") or [""])[0])
        a = it.get("author") or []
        if (
            t == want
            and a
            and family(a[0].get("family", "")) == fam
            and not it["DOI"].lower().startswith(ARXIV_DOI_PREFIX)
        ):
            return "match:" + str(it["DOI"]).lower()
    return "no_match"


# ---------------------------------------------------------------- arXiv

OAI_NS = {"o": "http://www.openarchives.org/OAI/2.0/", "r": "http://arxiv.org/OAI/arXivRaw/"}
ATOM_NS = {"a": "http://www.w3.org/2005/Atom", "x": "http://arxiv.org/schemas/atom"}


def arxiv_oai(pid: str, aid: str, dry: bool) -> str:
    path = REFS / pid / "arxiv.json"
    if path.exists():
        return "cached"
    if dry:
        return "would_fetch"
    ident = bare_arxiv(aid)
    r = get(
        "https://export.arxiv.org/oai2?"
        + urllib.parse.urlencode(
            {"verb": "GetRecord", "identifier": f"oai:arXiv.org:{ident}", "metadataPrefix": "arXivRaw"}
        )
    )
    if r.status_code != 200:
        return f"http_{r.status_code}"
    root = ET.fromstring(r.text)
    raw = root.find(".//r:arXivRaw", OAI_NS)
    if raw is None:
        return "no_record"

    def txt(tag: str) -> str:
        e = raw.find(f"r:{tag}", OAI_NS)
        return (e.text or "").strip() if e is not None else ""

    versions = [
        {"version": v.get("version"), "date": (v.findtext("r:date", "", OAI_NS) or "").strip()}
        for v in raw.findall("r:version", OAI_NS)
    ]
    rec = {
        "arxiv_id": ident,
        "title": " ".join(txt("title").split()),
        "authors": " ".join(txt("authors").split()),
        "doi": txt("doi"),
        "journal_ref": txt("journal-ref"),
        "license": txt("license"),
        "versions": versions,
        "fetched_from": "https://export.arxiv.org/oai2 (GetRecord, arXivRaw)",
        "fetched_on": time.strftime("%Y-%m-%d"),
        "raw_xml": r.text,
    }
    path.write_text(json.dumps(rec, indent=1, ensure_ascii=False))
    return "fetched"


def arxiv_search(pid: str, title: str, first_author: str, dry: bool) -> str:
    path = SEARCH / "arxiv" / f"{pid}.json"
    if not path.exists():
        if dry:
            return "would_search"
        words = [w for w in norm_title(title).split() if len(w) > 3][:8]
        q = " AND ".join(f"ti:{w}" for w in words)
        fam = family(first_author)
        if fam:
            q += f" AND au:{fam}"
        r = get("https://export.arxiv.org/api/query?" + urllib.parse.urlencode({"search_query": q, "max_results": 5}))
        if r.status_code != 200:
            return f"http_{r.status_code}"
        root = ET.fromstring(r.text)
        hits = []
        for e in root.findall("a:entry", ATOM_NS):
            hits.append(
                {
                    "id": (e.findtext("a:id", "", ATOM_NS) or "").rsplit("/", 1)[-1],
                    "title": " ".join((e.findtext("a:title", "", ATOM_NS) or "").split()),
                    "authors": [a.findtext("a:name", "", ATOM_NS) for a in e.findall("a:author", ATOM_NS)],
                    "published": e.findtext("a:published", "", ATOM_NS),
                }
            )
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps({"query": q, "hits": hits}, indent=1, ensure_ascii=False))
    hits = json.loads(path.read_text())["hits"]
    want, fam = norm_title(title), family(first_author)
    for h in hits:
        if norm_title(h["title"]) == want and h["authors"] and family(h["authors"][0]) == fam:
            return "match:" + bare_arxiv(str(h["id"]))
    return "no_match"


# ---------------------------------------------------------------- plan / apply (offline, from the caches)

MONTHS = {m: i for i, m in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
# Public-availability dates first; print-issue cover dates only when no online/preprint date exists.
CR_ONLINE_KEYS = ("published-online", "posted")
CR_FALLBACK_KEYS = ("published-print", "issued", "published")
CR_TYPES = {"journal-article": "journal", "proceedings-article": "conference"}  # posted-content: keep the row value
LICENSES = [
    ("arxiv.org/licenses/nonexclusive-distrib/1.0", "arXiv-nonexclusive-1.0", "restricted_local_only"),
    ("creativecommons.org/licenses/by/4.0", "CC-BY-4.0", "open_license_ok"),
    ("creativecommons.org/licenses/by/3.0", "CC-BY-3.0", "open_license_ok"),
    ("creativecommons.org/licenses/by-sa/4.0", "CC-BY-SA-4.0", "open_license_ok"),
    # NC or ND terms: restricted_local_only (convention gg; same rule for arXiv and version-of-record copies)
    ("creativecommons.org/licenses/by-nc-sa/4.0", "CC-BY-NC-SA-4.0", "restricted_local_only"),
    ("creativecommons.org/licenses/by-nc-nd/4.0", "CC-BY-NC-ND-4.0", "restricted_local_only"),
    ("creativecommons.org/licenses/by-nc/4.0", "CC-BY-NC-4.0", "restricted_local_only"),
    ("creativecommons.org/publicdomain/zero/1.0", "CC0-1.0", "open_license_ok"),
]


def load_json(path: Path) -> dict[str, Any] | None:
    return json.loads(path.read_text()) if path.exists() else None


def crossref_msg(pid: str) -> dict[str, Any] | None:
    j = load_json(REFS / pid / "crossref.json")
    return j.get("message", j) if j else None


def cr_dates(m: dict[str, Any], keys: tuple[str, ...]) -> list[tuple[str, tuple[int, ...]]]:
    out = []
    for k in keys:
        dp = ((m.get(k) or {}).get("date-parts") or [[None]])[0]
        if dp and dp[0]:
            out.append((f"crossref:{k}", tuple(int(x) for x in dp if x)))
    return out


MONTH_NAMES = {
    m: i
    for i, m in enumerate(
        "january february march april may june july august september october november december".split(), 1
    )
}


def printed_online(pid: str) -> tuple[int, ...] | None:
    """'Posted Online June 25, 2021', 'Date of publication December 5, 2023' (IEEE) or 'Published online: 13 July 2020'
    printed on a cached version of record."""
    t = REFS / pid / "text.md"
    if not t.exists() or arxiv_stamp(pid):
        return None
    head = t.read_text(errors="ignore")[:15000]
    lead = r"(?:(?:Posted|Published)\s+[Oo]nline:?|Date\s+of\s+publication)"
    m = re.search(lead + r"\s+([A-Z][a-z]+)\s+(\d{1,2}),\s+(\d{4})", head)
    if m and m.group(1).lower() in MONTH_NAMES:
        return (int(m.group(3)), MONTH_NAMES[m.group(1).lower()], int(m.group(2)))
    m = re.search(lead + r"\s+(\d{1,2})\s+([A-Z][a-z]+)\s+(\d{4})", head)
    if m and m.group(2).lower() in MONTH_NAMES:
        return (int(m.group(3)), MONTH_NAMES[m.group(2).lower()], int(m.group(1)))
    return None


def ax_v1(ax: dict[str, Any]) -> tuple[int, ...] | None:
    for v in ax.get("versions", []):
        if v["version"] == "v1":
            d = v["date"].split()  # "Mon, 21 Sep 2026 14:00:00 GMT"
            return (int(d[3]), MONTHS[d[2]], int(d[1]))
    return None


def iso(t: tuple[int, ...]) -> str:
    return "-".join(f"{x:02d}" if i else str(x) for i, x in enumerate(t))


def is_initials(given: str) -> bool:
    return all(len(t.rstrip(".")) <= 1 for t in re.split(r"[\s\-]+", given.strip()) if t)


# Crossref records that truncate a printed name (paper p.1 is the reference); keyed by (paper_id, Crossref family).
AUTHOR_SPELLING = {
    ("navarro2026", "Assis"): "Pierre-Louis de Assis",
    ("larocque2024", "Soltani"): "Moe Soltani",
}


def cr_authors(m: dict[str, Any], current: list[str], pid: str = "") -> tuple[list[str], list[str]]:
    """Crossref author list (membership and order). The cached spelling is kept when Crossref gives only
    initials or a truncated given name of the same person (matched by family name). Returns (names, flags)."""
    names, flags = [], []
    by_fam: dict[str, list[str]] = {}
    for c in current:
        by_fam.setdefault(family(c), []).append(c)
    for a in m.get("author") or []:
        given = " ".join((a.get("given") or "").replace("\u2010", "-").replace("\u2011", "-").split())
        fam = " ".join((a.get("family") or "").replace("\u2010", "-").replace("\u2011", "-").split())
        if not fam and a.get("name"):
            names.append(" ".join(a["name"].split()))
            continue
        if fam.isupper() and len(fam) >= 2:
            fam = fam.title()
        if given.isupper() and len(given) > 3:
            given = given.title()
        suffix = (a.get("suffix") or "").strip()
        if suffix in ("Jr", "Sr"):
            suffix += "."
        name = " ".join(f"{given} {fam} {suffix}".split())
        if (pid, fam) in AUTHOR_SPELLING:
            name = AUTHOR_SPELLING[(pid, fam)]
            flags.append(f"printed spelling {name!r} kept over the truncated Crossref record")
        else:
            cands = by_fam.get(family(name), [])
            if len(cands) == 1:
                cached_given = " ".join(cands[0].split()[:-1])
                truncated = cached_given.lower().startswith(given.lower()) and len(cached_given) > len(given)
                if cands[0] != name and ((is_initials(given) and not is_initials(cached_given)) or truncated):
                    flags.append(f"kept cached spelling {cands[0]!r} for Crossref {name!r}")
                    name = cands[0]
        names.append(name)
    return names, flags


def venue_from_cr(m: dict[str, Any]) -> str:
    ct = html.unescape(str((m.get("container-title") or [""])[0]))
    vol, iss = m.get("volume", ""), str(m.get("issue", "")).split(":")[0].strip()  # drop issue titles
    page = m.get("page") or m.get("article-number") or ""
    s = ct + (f" {vol}" if vol else "") + (f"({iss})" if iss and vol else "")
    return s + (f", {page}" if page else "")


def arxiv_stamp(pid: str) -> str:
    """arXiv identifier stamped on the cached text (first pages), e.g. '2011.13422v1'; '' when absent."""
    t = REFS / pid / "text.md"
    if not t.exists():
        return ""
    m = re.search(r"arXiv:(\d{4}\.\d{4,5}v\d+)", t.read_text(errors="ignore")[:20000])
    return m.group(1) if m else ""


def source_is_arxiv(pid: str, row: dict[str, str]) -> bool:
    s = load_json(REFS / pid / "source.json") or {}
    u = str(s.get("url", "")) + str(s.get("identity_url", "")) + str(s.get("source_version", ""))
    stamp = arxiv_stamp(pid)
    stamp_ok = bool(stamp) and bare_arxiv(stamp) == bare_arxiv(row.get("arxiv_id", "") or stamp)
    return "arxiv" in u.lower() or s.get("source_type") == "arxiv_preprint" or stamp_ok


def plan_row(p: dict[str, str]) -> tuple[dict[str, str], list[str]]:
    pid = p["paper_id"]
    new, notes = dict(p), []
    m, ax = crossref_msg(pid), load_json(REFS / pid / "arxiv.json")
    doi = p["doi"].strip().lower()
    if m and not doi and norm_title((m.get("title") or [""])[0]) != norm_title(p["title"]):
        notes.append(f"FLAG Crossref record {m['DOI']} title differs from papers.csv title; not adopted")
        m = None
    if m and not doi:
        doi = str(m["DOI"]).lower()
        notes.append(
            "doi from accepted Crossref title search" if not (ax and ax.get("doi")) else "doi from arXiv record"
        )
    if m and doi and str(m["DOI"]).lower() != doi:
        notes.append(f"FLAG crossref.json DOI {m['DOI']} != papers.csv DOI {doi}")
    if doi.startswith(ARXIV_DOI_PREFIX):
        doi = ""
    new["doi"] = doi
    # 3/6: identity
    bare = bare_arxiv(p["arxiv_id"]) or (ax or {}).get("arxiv_id", "")
    if doi:
        new["url"] = f"https://doi.org/{doi}"
        if m:
            t = CR_TYPES.get(m.get("type", ""))
            if t and p["source_type"] not in ("review", "conference"):  # proceedings registered as journal-article
                new["source_type"] = t
            if (p["venue"].strip() in ("", "arXiv") or "arXiv" in p["venue"]) and venue_from_cr(m):
                new["venue"] = venue_from_cr(m)
    elif bare:
        new["url"] = f"https://arxiv.org/abs/{bare}"
        new["source_type"] = "arxiv_preprint" if p["source_type"] != "review" else "review"
    if bare:
        new["arxiv_id"] = bare
    # 1: earliest public date
    cands: list[tuple[str, tuple[int, ...]]] = cr_dates(m, CR_ONLINE_KEYS) if m else []
    if ax and ax_v1(ax):
        cands.append(("arxiv:v1", ax_v1(ax)))  # type: ignore[arg-type]
    po = printed_online(pid)
    if po:
        cands.append(("printed:online", po))
    fallback = cr_dates(m, CR_FALLBACK_KEYS) if m else []
    if not cands:
        cands = fallback
    full = sorted((t, s) for s, t in cands if len(t) == 3)
    if full:
        new["published_on"] = iso(full[0][0])
        notes.append(f"published_on from {full[0][1]}")
    if cands:
        # year: earliest over every candidate, print-issue dates included (a year is not an availability claim)
        y = min(t[0] for _, t in cands + fallback)
        if full and full[0][0][0] != y:
            notes.append(f"FLAG partial date gives earlier year {y} than published_on {new['published_on']}")
        new["year"] = str(y)
        if p["year"] and int(p["year"]) < y:
            notes.append(
                f"FLAG earliest found year {y} is later than the current year {p['year']}; check for an earlier version"
            )
        if p["published_on"] and new["published_on"] > p["published_on"]:
            notes.append(f"FLAG published_on moves later {p['published_on']} -> {new['published_on']}")
    # (gg): title follows the DOI version
    if m and doi and m.get("title"):
        t = html.unescape(re.sub(r"<[^>]+>", "", html.unescape(str(m["title"][0]))))
        t = " ".join(t.replace("\u2010", "-").replace("\u2011", "-").split())

        def squash(x: str) -> str:
            return norm_title(x).replace(" ", "")

        # wording only: typography (hyphen code points, sub/superscript spacing) keeps the existing title
        if t and squash(t) != squash(p["title"]):
            new["title"] = t
            notes.append(f"title wording from Crossref; cached version: {p['title']!r}")
    # 2: authors
    cur = [a.strip() for a in p["authors"].split(";") if a.strip()]
    if m and m.get("author"):
        names, fl = cr_authors(m, cur, pid)
        notes += fl
        if len(names) != len(cur):
            notes.append(f"FLAG author count Crossref {len(names)} vs cached {len(cur)}")
        new["authors"] = "; ".join(names)
    # 4: licence of the cached copy
    if source_is_arxiv(pid, p) and ax and ax.get("license"):
        for frag, tok, red in LICENSES:
            if frag in ax["license"]:
                new["license"], new["redistribution"] = tok, red
                break
        else:
            notes.append(f"FLAG unmapped arXiv license {ax['license']}")
    elif source_is_arxiv(pid, p) and ax:
        new["license"], new["redistribution"] = "arXiv-nonexclusive-1.0", "restricted_local_only"
        notes.append("arXiv record has no license element: arXiv default non-exclusive distribution license")
    return new, notes


def plan(papers: list[dict[str, str]]) -> list[dict[str, Any]]:
    out = []
    for p in papers:
        new, notes = plan_row(p)
        changes = {k: (p[k], new[k]) for k in p if p[k] != new[k]}
        out.append({"paper_id": p["paper_id"], "changes": changes, "notes": notes, "new": new})
    return out


def write_csv(path: Path, header: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


def apply(papers_path: Path, plans: list[dict[str, Any]]) -> None:
    with papers_path.open(newline="") as f:
        r = csv.DictReader(f)
        header = list(r.fieldnames or [])
    write_csv(papers_path, header, [pl["new"] for pl in plans])
    # source.json licence fields follow the papers row (rule k: provenance in arxiv.json / crossref.json)
    for pl in plans:
        ch = pl["changes"]
        old_aid = ch.get("arxiv_id", ("", ""))[0]
        if old_aid and old_aid != bare_arxiv(old_aid):
            sp = REFS / pl["paper_id"] / "source.json"
            s = load_json(sp)
            if s is not None and not s.get("source_version") and source_is_arxiv(pl["paper_id"], pl["new"]):
                s["source_version"] = old_aid
                sp.write_text(json.dumps(s, indent=1, ensure_ascii=False) + "\n")
        stamp = arxiv_stamp(pl["paper_id"])
        if stamp:
            sp = REFS / pl["paper_id"] / "source.json"
            s = load_json(sp)
            if s is not None and not str(s.get("source_version", "")).startswith(bare_arxiv(stamp)):
                s["source_version"] = stamp
                sp.write_text(json.dumps(s, indent=1, ensure_ascii=False) + "\n")
        if "license" in ch or "redistribution" in ch:
            sp = REFS / pl["paper_id"] / "source.json"
            s = load_json(sp)
            if s is not None:
                s["license"], s["redistribution"] = pl["new"]["license"], pl["new"]["redistribution"]
                s["license_verified"] = True
                s["license_source"] = f"references/{pl['paper_id']}/arxiv.json (arXiv OAI-PMH arXivRaw license element)"
                sp.write_text(json.dumps(s, indent=1, ensure_ascii=False) + "\n")
    # author_affiliations: author names follow papers.csv by index when the count is unchanged
    ap = ROOT / "data" / "author_affiliations.csv"
    with ap.open(newline="") as f:
        r = csv.DictReader(f)
        ah, arows = list(r.fieldnames or []), list(r)
    names = {pl["paper_id"]: [a.strip() for a in pl["new"]["authors"].split(";")] for pl in plans}
    for row in arows:
        lst = names.get(row["paper_id"], [])
        i = int(row["author_index"]) - 1
        if 0 <= i < len(lst) and family(lst[i]) == family(row["author"]):
            row["author"] = lst[i]
        else:  # author list changed length (Crossref adds authors): re-index by unique name match
            hits = [k for k, n in enumerate(lst) if norm_title(n) == norm_title(row["author"])]
            if len(hits) == 1:
                row["author_index"] = str(hits[0] + 1)
                row["author"] = lst[hits[0]]
            else:
                print(f"FLAG affiliation row {row['paper_id']} {row['author']!r} not re-indexed")
    write_csv(ap, ah, arows)


# ---------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["fetch", "plan", "apply"])
    ap.add_argument("--only", nargs="*", default=None)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-arxiv", action="store_true", help="Crossref only (e.g. while arXiv returns 429)")
    a = ap.parse_args()
    with (ROOT / "data" / "papers.csv").open(newline="") as f:
        papers = list(csv.DictReader(f))
    if a.cmd in ("plan", "apply"):
        plans = plan(papers)
        rep = SEARCH.parent / (
            "W1_metadata_plan.json"
            if a.cmd == "apply"
            else f"W1_metadata_plan_dryrun_{time.strftime('%Y%m%dT%H%M%S')}.json"
        )
        rep.write_text(
            json.dumps([{k: v for k, v in pl.items() if k != "new"} for pl in plans], indent=1, ensure_ascii=False)
        )
        n = sum(1 for pl in plans if pl["changes"])
        print(f"{n} papers change; report {rep.relative_to(ROOT)}")
        if a.cmd == "apply":
            apply(ROOT / "data" / "papers.csv", plans)
        return 0
    if a.only:
        papers = [p for p in papers if p["paper_id"] in set(a.only)]
    if a.limit:
        papers = papers[: a.limit]
    log = SEARCH.parent / f"fetch_log_{time.strftime('%Y%m%dT%H%M%S')}.jsonl"
    log.parent.mkdir(parents=True, exist_ok=True)
    try:
        for p in papers:
            pid, doi, aid = p["paper_id"], p["doi"].strip().lower(), p["arxiv_id"].strip()
            first = p["authors"].split(";")[0].strip()
            st: dict[str, Any] = {"paper_id": pid}
            if not doi:
                st["crossref_search"] = crossref_search(pid, p["title"], first, a.dry_run)
                if st["crossref_search"].startswith("match:"):
                    doi = st["crossref_search"][6:]
            if doi:
                st["crossref"] = crossref_by_doi(pid, doi, a.dry_run)
            if not aid and not a.no_arxiv:
                st["arxiv_search"] = arxiv_search(pid, p["title"], first, a.dry_run)
                if st["arxiv_search"].startswith("match:"):
                    aid = st["arxiv_search"][6:]
            if aid and not a.no_arxiv:
                st["arxiv"] = arxiv_oai(pid, aid, a.dry_run)
                ax = load_json(REFS / pid / "arxiv.json")
                axdoi = str((ax or {}).get("doi", "")).strip().lower()
                if not doi and axdoi and not axdoi.startswith(ARXIV_DOI_PREFIX):
                    st["crossref_from_arxiv_doi"] = crossref_by_doi(pid, axdoi, a.dry_run)
            print(json.dumps(st), flush=True)
            with log.open("a") as f:
                f.write(json.dumps(st) + "\n")
    except Blocked as e:
        print(f"STOP: {e}", file=sys.stderr)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
