"""DevLog-022 D1 coordinator rulings on canonical data (2026-10-07).

1. hu2026a-ch1..ch8 bandwidth: Fig. 7 (p.10) raw traces first dip below the drawn -3 dB line at about 39.2-39.7 GHz
   (coordinator pixel reading, dips 0.2-0.8 dB) while the text says "exceeding 40 GHz" and the undefined labels
   43.1-43.6 sit near the final crossing: bw3db_ghz 40 with qualifier approx (was gt), bw_basis
   extracted_from_figure; readings in the evidence note.
2. kari2025-a..e integration monolithic -> foundry_native: "Samples were fabricated at Luxtelligence using their
   open-source process design kit" (p.4); convention (ee), precedent liu2026d.
3. zhou2026-a integration monolithic -> foundry_native: "The TFLN MZM is designed and fabricated by Liobate
   Technology" (p.1); stale note sentence replaced.
4. papers.csv wafer_supplier: NANOLN / NanoLN Inc. -> NanoLN (the company's own body-text spelling on nanoln.com,
   legal name Jinan Jingzheng Electronics Co., Ltd.; convention e).

Usage: uv run python data/_staging/ingest_2026_10_07/apply_d1.py [--apply]
"""

import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "data" / "_staging" / "conventions_2026_10_05"))
import evidence_edit as ee  # noqa: E402

APPLY = "--apply" in sys.argv
HU_NOTE = (
    "text: all channels exceed 40 GHz; Fig. 7 traces first dip below -3 dB at 39.2-39.7 GHz (ripple); "
    "undefined labels 43.1-43.6 near the final crossing"
)
ZHOU_OLD = "Modulator by Liobate Technology (acknowledgement), not entered as fab."
ZHOU_NEW = "Designed and fabricated by Liobate Technology (p.1): integration foundry_native (convention ee)."


def rw(path: Path, fn) -> int:
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        header, rows = list(r.fieldnames or []), list(r)
    n = sum(fn(row) for row in rows)
    if APPLY:
        with path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=header, lineterminator="\r\n")
            w.writeheader()
            w.writerows(rows)
    return n


def devices(row: dict[str, str]) -> bool:
    did = row["device_id"]
    if re.fullmatch(r"hu2026a-ch[1-8]", did):
        q = row["qualifiers"].split(";")
        assert "bw3db_ghz:gt" in q, did
        row["qualifiers"] = ";".join("bw3db_ghz:approx" if x == "bw3db_ghz:gt" else x for x in q)
        row["bw_basis"] = "extracted_from_figure"
        return True
    if row["paper_id"] == "kari2025":
        assert row["integration"] == "monolithic", did
        row["integration"] = "foundry_native"
        return True
    if did == "zhou2026-a":
        assert row["integration"] == "monolithic" and ZHOU_OLD in row["notes"], did
        row["integration"] = "foundry_native"
        row["notes"] = row["notes"].replace(ZHOU_OLD, ZHOU_NEW)
        return True
    return False


def papers(row: dict[str, str]) -> bool:
    v = row["wafer_supplier"]
    new = re.sub(r"\bNANOLN\b", "NanoLN", v).replace("NanoLN Inc.", "NanoLN")
    row["wafer_supplier"] = new
    return new != v


def main() -> None:
    print("devices rows:", rw(ROOT / "data" / "devices.csv", devices))
    print("papers rows:", rw(ROOT / "data" / "papers.csv", papers))
    for i in range(1, 9):
        e = {
            "device_id": f"hu2026a-ch{i}",
            "field": "bw3db_ghz",
            "value": 40,
            "unit": "GHz",
            "basis": "extracted_from_figure",
            "locator": "p.10 Sec. 4.2; Fig. 7; p.11 Table 1",
            "note": HU_NOTE,
        }
        if APPLY:
            print(ee.set_entry("hu2026a", e))


if __name__ == "__main__":
    main()
