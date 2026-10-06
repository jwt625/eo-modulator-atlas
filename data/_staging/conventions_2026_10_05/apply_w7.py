"""Apply verified Phase B proposals (W7_g<N>.csv + W7_g<N>_verify.csv) to data/devices.csv and evidence.

Final value per (device_id, field): verifier `confirm` -> proposed; `correct` -> correct_value; `reject`,
`unverifiable` or no verifier line -> unchanged (reported). Evidence-required fields get their entry set (or
deleted when the value is cleared). `move_to_context` moves an orphan `derived` entry to context_values.

Usage: uv run python data/_staging/conventions_2026_10_05/apply_w7.py g1 [g2 ...] [--apply]
"""

import csv
import sys
from collections import Counter
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = ROOT / "data"
sys.path.insert(0, str(HERE))
from evidence_edit import delete_entry, set_entry  # noqa: E402

APPLY = "--apply" in sys.argv
GROUPS = [a for a in sys.argv[1:] if a.startswith("g")]
schema = yaml.safe_load((DATA / "schema" / "devices.schema.yaml").read_text())
COLS = {c["name"]: c for c in schema["devices_columns"]}
SKIP_VALUES = {"NO_SOURCE", ""}
# cells the coordinator handles by hand (row split under convention q): DevLog-020
MANUAL = {("taghavi2024-a", "eo_effect"), ("taghavi2024-a", "r_eff_pm_per_v"), ("taghavi2024-a", "row_split"),
          ("taghavi2026-a", "eo_effect"), ("taghavi2026-a", "tuning_nm_per_v"), ("taghavi2026-b", "split")}


def read(path: Path) -> list[dict[str, str]]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def norm(v: str) -> str:
    try:
        return f"{float(v):g}"
    except ValueError:
        return v.strip()


def move_to_context(pid: str, device_id: str, field: str) -> bool:
    p = DATA / "evidence" / f"{pid}.yaml"
    text = p.read_text()
    d = yaml.safe_load(text)
    hit = [e for e in d.get("derived") or [] if e.get("device_id") == device_id and e.get("field") == field]
    if not hit:
        return False
    e = hit[0]
    d["derived"] = [x for x in d["derived"] if x is not e]
    cv = d.get("context_values") or []
    cv.append({"item": f"{device_id} {field} (coordinator arithmetic, not stated in the paper)", "value": e.get("value"),
               "locator": "derived from: " + ", ".join(map(str, e.get("inputs") or [])), "note": str(e.get("formula", ""))})
    d["context_values"] = cv
    p.write_text(yaml.safe_dump(d, sort_keys=False, allow_unicode=True, width=120))
    return True


def main() -> None:
    with (DATA / "devices.csv").open(newline="") as f:
        rd = csv.DictReader(f)
        header, rows = list(rd.fieldnames or []), list(rd)
    by_id = {r["device_id"]: r for r in rows}
    stats: Counter[str] = Counter()
    report = []
    for g in GROUPS:
        props = read(HERE / f"W7_{g}.csv")
        ver: dict[tuple[str, str], dict[str, str]] = {}
        for v in read(HERE / f"W7_{g}_verify.csv"):
            ver.setdefault((v["device_id"], v["field"]), v)  # first line answers the proposal; extras are context
        for pr in props:
            did, field = pr["device_id"], pr["field"]
            if (did, field) in MANUAL:
                report.append(f"MANUAL {did} {field}")
                continue
            r = by_id.get(did)
            if r is None:
                report.append(f"{g} {did}: unknown device")
                continue
            proposed = pr["proposed"].strip()
            if proposed == "NO_SOURCE":
                stats["no_source"] += 1
                continue
            if proposed == "move_to_context":
                v = ver.get((did, field))
                if v and v["verdict"] in ("confirm",):
                    if APPLY and move_to_context(r["paper_id"], did, field):
                        stats["moved_to_context"] += 1
                    report.append(f"MOVE_CONTEXT {did} {field}")
                else:
                    report.append(f"KEEP_ORPHAN {did} {field} (verifier: {v['verdict'] if v else 'none'})")
                continue
            if field == "GENERAL":
                continue  # "checked, nothing stated" marker
            if field.endswith("_qualifier"):  # qualifier op proposal for the named field
                base = field[: -len("_qualifier")]
                if base not in COLS:  # e.g. optical_power_handling -> optical_power_handling_dbm
                    base = next((c for c in COLS if c.startswith(base + "_")), base)
                v = ver.get((did, field)) or ver.get((did, base))
                op = proposed if (v and v["verdict"] == "confirm") else ((v or {}).get("correct_value", "") if v and v["verdict"] == "correct" else None)
                if op is not None and r[base]:
                    qs = [q for q in r["qualifiers"].split(";") if q and not q.startswith(base + ":")]
                    if op:
                        qs.append(f"{base}:{op}")
                    if ";".join(qs) != r["qualifiers"]:
                        report.append(f"SET {did} qualifiers: {r['qualifiers']!r} -> {';'.join(qs)!r}")
                        r["qualifiers"] = ";".join(qs)
                        stats["set qualifiers"] += 1
                else:
                    report.append(f"NOT_APPLIED {did} {field} -> {proposed!r} (verifier {v['verdict'] if v else 'none'})")
                continue
            if field not in COLS:
                report.append(f"{g} {did}: unknown field {field}")
                continue
            current = r[field].strip()
            v = ver.get((did, field))
            verdict = v["verdict"] if v else "none"
            final = {"confirm": proposed, "correct": (v or {}).get("correct_value", "").strip()}.get(verdict)
            if final is None:
                if norm(proposed) != norm(current):
                    stats[f"not_applied_{verdict}"] += 1
                    report.append(f"NOT_APPLIED {did} {field}: {current!r} -> {proposed!r} (verifier {verdict})")
                continue
            if final in ("(empty)", "empty"):
                final = ""
            if norm(final) == norm(current):
                stats["unchanged"] += 1
                continue
            col = COLS[field]
            stats[f"set {field}"] += 1
            report.append(f"SET {did} {field}: {current!r} -> {final!r} ({verdict})")
            r[field] = final
            if not final:
                r["qualifiers"] = ";".join(q for q in r["qualifiers"].split(";") if q and not q.startswith(field + ":"))
            if APPLY and col.get("evidence"):
                if final:
                    note = pr["note"] if verdict == "confirm" else f"verified correction: {(v or {}).get('evidence', '')}"[:200]
                    set_entry(r["paper_id"], {"device_id": did, "field": field, "value": float(final) if col["type"] == "float" else final,
                                              "unit": col.get("unit", ""), "basis": pr["basis"] if pr["basis"] not in ("", "n/a") else "measured",
                                              "locator": pr["locator"], "note": " ".join(note.split()[:25])})
                else:
                    delete_entry(r["paper_id"], did, field)
        # verifier-only lines (coverage gaps) with a correction: apply like a proposal
        seen = {(pr["device_id"], pr["field"]) for pr in props}
        for (did, field), v in ver.items():
            if (did, field) in seen or v["verdict"] != "correct" or field not in COLS or did not in by_id:
                continue
            r, final = by_id[did], v["correct_value"].strip()
            if norm(final) != norm(r[field]) and not COLS[field].get("evidence"):
                report.append(f"SET {did} {field}: {r[field]!r} -> {final!r} (verifier-only line)")
                r[field] = final
                stats[f"set {field}"] += 1
            elif COLS[field].get("evidence"):
                report.append(f"NOT_APPLIED verifier-only evidence field {did} {field} -> {final!r}")
    for line in report:
        print(line)
    print(dict(stats))
    if APPLY:
        with (DATA / "devices.csv").open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=header)
            w.writeheader()
            w.writerows(rows)


if __name__ == "__main__":
    main()
