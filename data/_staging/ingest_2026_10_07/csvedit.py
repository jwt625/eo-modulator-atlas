"""Edit staged/canonical CSV cells in place, keeping the file's line terminator (DevLog-022 coordinator fixes).

Usage (as a module): edit(path, key_col, key, col, fn) where fn(old) -> new; returns the number of changed rows.
"""

import csv
from collections.abc import Callable
from pathlib import Path


def edit(path: Path, key_col: str, key: str, col: str, fn: Callable[[str], str]) -> int:
    raw = path.read_bytes()
    term = "\r\n" if b"\r\n" in raw[:4096] else "\n"
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        header, rows = list(r.fieldnames or []), list(r)
    n = 0
    for row in rows:
        if row[key_col] == key:
            new = fn(row[col])
            if new != row[col]:
                row[col] = new
                n += 1
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header, lineterminator=term)
        w.writeheader()
        w.writerows(rows)
    return n
