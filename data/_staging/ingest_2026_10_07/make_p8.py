"""Write the p8 batch CSVs (DevLog-022): cached, not yet ingested candidates.

Usage: uv run python data/_staging/ingest_2026_10_07/make_p8.py [--apply]
"""

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
APPLY = "--apply" in sys.argv
BATCHES = {
    "p8_01": ["behzadfar2026", "ghavami2023", "wu2022", "yeh2026", "bankwitz2026"],
    "p8_02": ["gaier2025", "liu2025d", "xie2024", "zhang2024", "park2026"],
    "p8_03": ["zhu2022", "axline2026", "mohl2025", "khalil2026", "lin2026b"],
    "p8_04": ["thureja2025", "tian2026", "datta2020", "datta2024", "taki2024"],
    "p8_05": ["anjali2025", "chaudhury2024", "saxena2023", "shawon2024", "shabaninezhad2025"],
    "p8_06": ["zhang2025", "yang2024"],
}
STATE = "NEW: cached source (references/<id>/), ingested 2026-10-07 (DevLog-022)"


def main() -> None:
    cand = {r["paper_id"]: r for r in csv.DictReader(open(ROOT / "data/candidates.csv"))}
    papers = {r["paper_id"] for r in csv.DictReader(open(ROOT / "data/papers.csv"))}
    fields = list(next(iter(cand.values())).keys()) + ["source_state"]
    only = [a for a in sys.argv[1:] if a.startswith("p8_")]
    for batch, ids in BATCHES.items():
        if only and batch not in only:
            continue
        rows = []
        for pid in ids:
            assert pid in cand and pid not in papers, pid
            if not (ROOT / "references" / pid / "text.md").exists():
                print(f"{batch} {pid}: no text.md, skipped")
                continue
            rows.append({**cand[pid], "source_state": STATE.replace("<id>", pid)})
        print(batch, [r["paper_id"] for r in rows])
        if APPLY and rows:
            with open(ROOT / "data/_staging/batches" / f"{batch}.csv", "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=fields)
                w.writeheader()
                w.writerows(rows)


if __name__ == "__main__":
    main()
