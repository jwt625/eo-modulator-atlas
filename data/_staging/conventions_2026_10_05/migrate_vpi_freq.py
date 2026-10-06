"""One-off migration for DevLog-020 decision 7 (dc/rf Vpi cutoff 1 GHz) from W4_vpi_frequency.csv.

Adds devices column vpi_dc_freq_ghz (schema + CSV), moves sub-GHz "RF" Vpi values to the dc columns, records stated
quasi-static frequencies with evidence entries. Usage: uv run python .../migrate_vpi_freq.py [--apply]
"""

import csv
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
from evidence_edit import append_entries, rename_field  # noqa: E402

APPLY = "--apply" in sys.argv
SCHEMA = ROOT / "data" / "schema" / "devices.schema.yaml"
DEV = ROOT / "data" / "devices.csv"
COL_LINE = (
    '  - {name: vpi_dc_freq_ghz, type: float, unit: GHz, evidence: true, desc: "modulation frequency of a quasi-static '
    'Vpi measurement (below 1 GHz, convention m) when the paper states it; empty for true DC, unstated, or a band average"}\n'
)
MOVES = {
    "chiang2025-a": [("vpi_rf_v", "vpi_dc_v"), ("vpil_rf_vcm", "vpil_dc_vcm"), ("vpi_rf_freq_ghz", "vpi_dc_freq_ghz")],
    "renaud2023-pm": [("vpi_rf_v", "vpi_dc_v"), ("vpi_rf_freq_ghz", "vpi_dc_freq_ghz")],
}
BAND_AVG_NOTE = {
    "valdez2022-a": "VpiL is an average over 0.1 to 10 MHz drive (p.7, Fig. 4(b)).",
    "xu2026a-a": "Vpi and VpiL are averages over 10 Hz to 10 kHz drive (1.045 V / 1.57 V cm at 10 Hz; p.2-3, Fig. 4(a)).",
    "xu2026b-a": "Vpi is an average over 1 Hz to 10 kHz drive, within +/-4% (p.2, Fig. 3(b)).",
}
CONFLICT = {"liu2025b-a": "Fig. 4(c) caption says 1 GHz; methods text says 500 kHz triangular sweep (taken)."}


def words(s: str, n: int) -> str:
    w = s.split()
    return " ".join(w[:n]) + (" ..." if len(w) > n else "")


def main() -> None:
    w4 = list(csv.DictReader((HERE / "W4_vpi_frequency.csv").open(newline="")))
    freq: dict[str, dict[str, str]] = {}
    for r in w4:
        if r["class"] == "FREQ" and ";" not in r["freq_ghz"]:
            prev = freq.get(r["device_id"])
            if prev is None or r["field"] == "vpi_dc_v":
                freq[r["device_id"]] = r
    with DEV.open(newline="") as f:
        rd = csv.DictReader(f)
        header, rows = list(rd.fieldnames or []), list(rd)
    if "vpi_dc_freq_ghz" not in header:
        header.insert(header.index("vpi_dc_v") + 1, "vpi_dc_freq_ghz")
        for r in rows:
            r["vpi_dc_freq_ghz"] = ""
    by_id = {r["device_id"]: r for r in rows}
    new_ev: dict[str, list[dict[str, object]]] = defaultdict(list)
    renames = []
    for did, mv in MOVES.items():
        r = by_id[did]
        for a, b in mv:
            assert r[b] == "", (did, b)
            print(f"MOVE {did} {a}={r[a]} -> {b}")
            r[b], r[a] = r[a], ""
            r["qualifiers"] = ";".join(
                (b + q[len(a) :]) if q.startswith(a + ":") else q for q in r["qualifiers"].split(";") if q
            )
            renames.append((r["paper_id"], did, a, b))
    for did, w in sorted(freq.items()):
        r = by_id[did]
        v = f"{float(w['freq_ghz']):g}"
        if r["vpi_dc_freq_ghz"]:
            continue
        r["vpi_dc_freq_ghz"] = v
        note = f"source: {words(w['quote'], 18)}"
        if did in CONFLICT:
            note = CONFLICT[did]
        new_ev[r["paper_id"]].append(
            {"device_id": did, "field": "vpi_dc_freq_ghz", "value": float(v), "unit": "GHz", "basis": "measured",
             "locator": w["locator"], "note": note}
        )
        print(f"FREQ {did} vpi_dc_freq_ghz={v}")
    for did, n in BAND_AVG_NOTE.items():
        r = by_id[did]
        if n not in r["notes"]:
            r["notes"] = (r["notes"].rstrip() + " " + n).strip()
            print(f"NOTE {did}: {n}")
    print(f"{sum(len(v) for v in new_ev.values())} new evidence entries in {len(new_ev)} files; {len(renames)} renames")
    if not APPLY:
        return
    s = SCHEMA.read_text()
    if "name: vpi_dc_freq_ghz" not in s:
        anchor = next(ln for ln in s.splitlines(keepends=True) if ln.startswith("  - {name: vpi_dc_v,"))
        s = s.replace(anchor, anchor + COL_LINE, 1)
        SCHEMA.write_text(s)
    with DEV.open("w", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=header)
        wr.writeheader()
        wr.writerows(rows)
    for pid, did, a, b in renames:
        rename_field(pid, did, a, b)
    for pid, ents in new_ev.items():
        append_entries(pid, ents)


if __name__ == "__main__":
    main()
