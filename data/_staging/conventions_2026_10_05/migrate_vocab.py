"""One-off migration for DevLog-020 decisions 5 and 7 (band, er_type, waveguide_platform, discovered_via).

Usage: uv run python data/_staging/conventions_2026_10_05/migrate_vocab.py [--apply]
"""

import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_db import band_for_wavelength  # noqa: E402

RESONANCE_DIP = """bao2026b-a hou2024-a kari2025-a kari2025-b kholeif2026-a kohli2025-rt li2025b-b lin2026-a liu2023-a liu2023-b
liu2023-c liu2023-d liu2026a-a montifiore2026-c montifiore2026-d soma2025-b taghavi2026-a tan2024-a zhang2023-a""".split()
PLATFORM = {**{f"tiberi2025-{x}": "soi_strip" for x in "abc"}, "gui2022-a": "soi_strip", "gui2022-b": "soi_strip",
            **{f"didier2026-{x}": "lnos_rib" for x in "abcdefgh"}, "celik2022-a": "lnos_rib"}
OLD_BAND_NO_WL = {"one_um": "nir_below_o"}  # rows without wavelength keep their stated band otherwise
DV = {"web": "web_search", "continuation_2026_10_02": None}


def rw(path: Path, fn, apply: bool) -> None:
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        header, rows = list(r.fieldnames or []), list(r)
    n = 0
    for row in rows:
        for k, (a, b) in fn(row).items():
            print(f"{path.name} {row[header[0]]} {k}: {a!r} -> {b!r}")
            row[k] = b
            n += 1
    print(f"{path.name}: {n} cell changes")
    if apply:
        with path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=header)
            w.writeheader()
            w.writerows(rows)


def dev(row):
    ch = {}
    if row["wavelength_nm"].strip():
        b = band_for_wavelength(float(row["wavelength_nm"]))
        if row["band"] != b and not (row["band"] == "cl_band" and b in ("c_band", "l_band")):
            ch["band"] = (row["band"], b)
    elif row["band"] in OLD_BAND_NO_WL:
        ch["band"] = (row["band"], OLD_BAND_NO_WL[row["band"]])
    if row["device_id"] in RESONANCE_DIP and row["er_type"] != "resonance_dip":
        ch["er_type"] = (row["er_type"], "resonance_dip")
    if row["device_id"] in PLATFORM and row["waveguide_platform"] != PLATFORM[row["device_id"]]:
        ch["waveguide_platform"] = (row["waveguide_platform"], PLATFORM[row["device_id"]])
    return ch


def pap(row):
    toks = [t.strip() for t in row["discovered_via"].split(";") if t.strip()]
    new = []
    for t in toks:
        t2 = DV.get(t, t)
        if t2 and t2 not in new:
            new.append(t2)
    v = ";".join(new)
    return {"discovered_via": (row["discovered_via"], v)} if v != row["discovered_via"] else {}


if __name__ == "__main__":
    ap = "--apply" in sys.argv
    rw(ROOT / "data" / "devices.csv", dev, ap)
    rw(ROOT / "data" / "papers.csv", pap, ap)
