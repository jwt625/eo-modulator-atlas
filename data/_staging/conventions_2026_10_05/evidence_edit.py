"""Surgical text edits of data/evidence/<paper_id>.yaml (append entries, rename an entry's field) that keep each
file's existing formatting. Used by the DevLog-020 migrations."""

import json
import re
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[3]


def _path(pid: str) -> Path:
    return ROOT / "data" / "evidence" / f"{pid}.yaml"


def _q(v: Any) -> str:
    """Scalar in the style yaml.safe_dump uses (bare unless quoting is needed)."""
    d = yaml.safe_dump(v, allow_unicode=True, width=10**9)
    d = d[:-5] if d.endswith("\n...\n") else d.rstrip("\n")
    return d if "\n" not in d else json.dumps(str(v), ensure_ascii=False)


def append_entries(pid: str, entries: list[dict[str, Any]]) -> None:
    p = _path(pid)
    lines = p.read_text().splitlines(keepends=True)
    before = yaml.safe_load("".join(lines))
    i_entries = next(i for i, ln in enumerate(lines) if ln.rstrip() == "entries:" or ln.startswith("entries:"))
    if lines[i_entries].strip() == "entries: []":
        lines[i_entries] = "entries:\n"
        indent = ""
        insert_at = i_entries + 1
    else:
        item = next(ln for ln in lines[i_entries + 1 :] if ln.lstrip().startswith("- "))
        indent = item[: len(item) - len(item.lstrip())]
        # end of the entries block: next top-level key
        insert_at = next(
            (i for i in range(i_entries + 1, len(lines)) if re.match(r"^[A-Za-z_]+:", lines[i])), len(lines)
        )
    block = []
    for e in entries:
        keys = list(e)
        block.append(f"{indent}- {keys[0]}: {_q(e[keys[0]])}\n")
        block += [f"{indent}  {k}: {_q(e[k])}\n" for k in keys[1:]]
    lines[insert_at:insert_at] = block
    text = "".join(lines)
    after = yaml.safe_load(text)
    assert len(after["entries"] or []) == len(before["entries"] or []) + len(entries), pid
    assert {k: v for k, v in after.items() if k != "entries"} == {k: v for k, v in before.items() if k != "entries"}
    p.write_text(text)


def rename_field(pid: str, device_id: str, old: str, new: str) -> None:
    """Rename `field: old` to `field: new` in the one entry of device_id (block or flow style)."""
    p = _path(pid)
    data = yaml.safe_load(p.read_text())
    hits = [e for e in data["entries"] if e["device_id"] == device_id and e["field"] == old]
    assert len(hits) == 1, (pid, device_id, old, len(hits))
    text = p.read_text()
    # block style: '- device_id: X' then lines until next '- '; flow style: one line
    pat_flow = re.compile(rf"^(\s*- \{{device_id: {re.escape(device_id)}, field: ){re.escape(old)}(,)", re.M)
    if pat_flow.search(text):
        text, n = pat_flow.subn(rf"\g<1>{new}\g<2>", text)
    else:
        pat = re.compile(
            rf"(^\s*- device_id: {re.escape(device_id)}\n(?:\s+(?!- )\S.*\n)*?\s+field: ){re.escape(old)}$", re.M
        )
        text, n = pat.subn(rf"\g<1>{new}", text)
    assert n == 1, (pid, device_id, old, n)
    after = yaml.safe_load(text)
    assert [e for e in after["entries"] if e["device_id"] == device_id and e["field"] == new]
    p.write_text(text)


def _entry_span(lines: list[str], device_id: str, field: str) -> tuple[int, int, str] | None:
    """Line span [start, end) of the block-style entry (device_id, field) inside `entries:`, and its indent."""
    i_entries = next(i for i, ln in enumerate(lines) if ln.startswith("entries:"))
    end_entries = next((i for i in range(i_entries + 1, len(lines)) if re.match(r"^[A-Za-z_]+:", lines[i])), len(lines))
    starts = [i for i in range(i_entries + 1, end_entries) if lines[i].lstrip().startswith("- device_id:")]
    for k, st in enumerate(starts):
        en = starts[k + 1] if k + 1 < len(starts) else end_entries
        indent = lines[st][: len(lines[st]) - len(lines[st].lstrip())]
        item = yaml.safe_load("".join(ln[len(indent) :] for ln in lines[st:en]))
        if isinstance(item, list) and item and item[0].get("device_id") == device_id and item[0].get("field") == field:
            return st, en, indent
    return None


def set_entry(pid: str, entry: dict[str, Any]) -> str:
    """Replace the (device_id, field) entry with `entry`, or append it. Returns 'replaced' or 'appended'."""
    p = _path(pid)
    lines = p.read_text().splitlines(keepends=True)
    before = yaml.safe_load("".join(lines))
    span = _entry_span(lines, entry["device_id"], entry["field"])
    if span is None:
        append_entries(pid, [entry])
        return "appended"
    s, e, indent = span
    keys = list(entry)
    block = [f"{indent}- {keys[0]}: {_q(entry[keys[0]])}\n"] + [f"{indent}  {k}: {_q(entry[k])}\n" for k in keys[1:]]
    lines[s:e] = block
    text = "".join(lines)
    after = yaml.safe_load(text)
    assert len(after["entries"]) == len(before["entries"]), pid
    p.write_text(text)
    return "replaced"


def delete_entry(pid: str, device_id: str, field: str) -> bool:
    p = _path(pid)
    lines = p.read_text().splitlines(keepends=True)
    before = yaml.safe_load("".join(lines))
    span = _entry_span(lines, device_id, field)
    if span is None:
        return False
    s, e, _ = span
    del lines[s:e]
    text = "".join(lines)
    assert len(yaml.safe_load(text)["entries"] or []) == len(before["entries"]) - 1, pid
    p.write_text(text)
    return True
