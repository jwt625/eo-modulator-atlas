"""Apply the verified buffer_oxide_um re-read (DevLog-022 D1; box_proposals.csv + box-proposals-verify audit).

keep: evidence basis/locator updated where proposed (value unchanged); zhang2022 locator change rejected by the
verifier (basis only). clear / move_to_cladding: CSV cell emptied, evidence entry deleted, qualifier dropped;
move_to_cladding also sets the cladding cell and its evidence entry (meng2023-a text per the verifier).
correct_value: value, basis, locator, note; weigel2018-a cladding added.

Usage: uv run python data/_staging/ingest_2026_10_07/apply_box.py [--apply]
"""

import csv
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "data" / "_staging" / "conventions_2026_10_05"))
import evidence_edit as ee  # noqa: E402

APPLY = "--apply" in sys.argv
HERE = Path(__file__).resolve().parent
MENG = (
    "SiO2 (Fig. 2(a)), over-cladding thickness not stated; 100 nm SiO2 buffer between the LN and the ITO/Au electrodes"
)
REJECT_LOCATOR = {"zhang2022-a", "zhang2022-b"}


def entry(pid: str, did: str, field: str) -> dict | None:
    d = yaml.safe_load((ROOT / "data" / "evidence" / f"{pid}.yaml").read_text())
    hits = [e for e in d["entries"] if e["device_id"] == did and e["field"] == field]
    return hits[0] if hits else None


def main() -> None:
    props = list(csv.DictReader(open(HERE / "box_proposals.csv", newline="")))
    path = ROOT / "data" / "devices.csv"
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        header, rows = list(r.fieldnames or []), list(r)
    dev = {x["device_id"]: x for x in rows}
    log = []
    for p in props:
        did, v = p["device_id"], p["verdict"]
        row = dev[did]
        pid = row["paper_id"]
        e = entry(pid, did, "buffer_oxide_um")
        if v == "keep":
            new = dict(e) if e else None
            if new is None:
                log.append(f"{did}: keep, no evidence entry")
                continue
            if p["new_buffer_basis"]:
                new["basis"] = p["new_buffer_basis"]
            if p["new_buffer_locator"] and did not in REJECT_LOCATOR:
                new["locator"] = p["new_buffer_locator"]
            if new != e:
                log.append(
                    f"{did}: keep; basis {e.get('basis')} -> {new.get('basis')}; locator -> {new.get('locator')}"
                )
                if APPLY:
                    ee.set_entry(pid, new)
            continue
        if v in ("clear", "move_to_cladding"):
            row["buffer_oxide_um"] = ""
            q = [x for x in row["qualifiers"].split(";") if x and not x.startswith("buffer_oxide_um:")]
            row["qualifiers"] = ";".join(q)
            log.append(f"{did}: {v}; buffer_oxide_um cleared (was {p['current_value']})")
            if APPLY and e:
                ee.delete_entry(pid, did, "buffer_oxide_um")
        if v == "correct_value":
            row["buffer_oxide_um"] = p["new_buffer_oxide_um"]
            new = dict(e)
            new.update(
                value=float(p["new_buffer_oxide_um"]), basis=p["new_buffer_basis"], locator=p["new_buffer_locator"]
            )
            new["note"] = (
                p["new_buffer_note"] + "; " if p["new_buffer_note"] else ""
            ) + f"was {p['current_value']} (top buffer), corrected 2026-10-07"
            log.append(f"{did}: value {p['current_value']} -> {p['new_buffer_oxide_um']}")
            if APPLY:
                ee.set_entry(pid, new)
        clad = MENG if did == "meng2023-a" else p["new_cladding"]
        if clad:
            old = row["cladding"]
            row["cladding"] = clad
            ce = entry(pid, did, "cladding")
            note = (
                f"buffer re-read 2026-10-07 (buffer_oxide_um = buried oxide only); previous cell: {old}"
                if old
                else "buffer re-read 2026-10-07"
            )
            new = {
                "device_id": did,
                "field": "cladding",
                "value": clad,
                "unit": "",
                "basis": "design_target",
                "locator": p["cladding_locator"] or (ce or {}).get("locator", ""),
                "note": note,
            }
            log.append(f"{did}: cladding {old!r} -> {clad!r}")
            if APPLY:
                ee.set_entry(pid, new)
    if APPLY:
        with path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=header, lineterminator="\r\n")
            w.writeheader()
            w.writerows(rows)
    print("\n".join(log))
    print(len(log), "changes", "(applied)" if APPLY else "(dry run)")


if __name__ == "__main__":
    main()
