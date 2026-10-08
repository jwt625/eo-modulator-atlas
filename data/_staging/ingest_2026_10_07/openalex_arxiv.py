"""Find arXiv versions of DOI papers via OpenAlex while export.arxiv.org is unavailable (DevLog-022 N1).

Caches one OpenAlex work record per paper in data/_staging/conventions_2026_10_05/search/openalex/<id>.json
(never re-fetched), 1.1 s between requests, stops on 403/429/5xx. Prints arXiv landing URLs found in the
record's locations. Does not change any table: a match is then confirmed against the arXiv record.

Usage: uv run python data/_staging/ingest_2026_10_07/openalex_arxiv.py <paper_id> ...
"""

import csv
import json
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data" / "_staging" / "conventions_2026_10_05" / "search" / "openalex"
UA = "eo-modulator-atlas/0.1 (research dataset metadata; https://github.com/jwt625/eo-modulator-atlas)"


def main() -> int:
    ids = sys.argv[1:]
    papers = {r["paper_id"]: r for r in csv.DictReader(open(ROOT / "data" / "papers.csv"))}
    OUT.mkdir(parents=True, exist_ok=True)
    for pid in ids:
        doi = papers[pid]["doi"].strip().lower()
        path = OUT / f"{pid}.json"
        if not path.exists():
            if not doi:
                print(pid, "no_doi")
                continue
            time.sleep(1.1)
            r = requests.get(f"https://api.openalex.org/works/doi:{doi}", headers={"User-Agent": UA}, timeout=60)
            if r.status_code == 404:
                path.write_text(json.dumps({"doi": doi, "status": 404}))
            elif r.status_code in (403, 429) or r.status_code >= 500:
                print(f"STOP: api.openalex.org HTTP {r.status_code}")
                return 3
            else:
                path.write_text(json.dumps(r.json(), indent=1, ensure_ascii=False))
        rec = json.loads(path.read_text())
        arx = sorted(
            {
                str(loc.get("landing_page_url") or loc.get("pdf_url") or "")
                for loc in rec.get("locations") or []
                if "arxiv" in str(loc.get("landing_page_url") or loc.get("pdf_url") or "").lower()
            }
        )
        print(pid, doi, "arxiv:", arx or "none")
    return 0


if __name__ == "__main__":
    sys.exit(main())
