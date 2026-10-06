"""Apply W5 (fabrication sites, EO-material suppliers, zhang2023 split) with the coordinator decisions in DevLog-020.

Usage: uv run python data/_staging/conventions_2026_10_05/apply_w5.py [--apply]
"""

import csv
import io
import re
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DATA = ROOT / "data"
APPLY = "--apply" in sys.argv

FAB = {  # paper_id -> new foundry_or_fab list
    "anderson2025": ["Stanford Nanofabrication Facility", "Stanford Nano Shared Facilities"],
    "chen2023a": ["Zhejiang University Micro and Nano Processing Platform"],
    "liu2023": ["Westlake Center for Micro/Nano Fabrication"],
    "yu2024": ["ZJU Micro-Nano Fabrication Center"],
    "wang2022a": ["Center of Micro-Fabrication and Characterization"],
    "prountzou2026": ["Binnig and Rohrer Nanotechnology Center", "FIRST cleanroom of ETH Zurich"],
    "wu2025": ["Chongqing United Microelectronics Center Co., Ltd"],
    "zhou2026": ["Liobate Technology"],
    "johnson2025": ["Advanced Micro Foundry", "NLM Photonics"],
    "weigel2018": ["Sandia National Laboratories", "San Diego Nanotechnology Infrastructure"],
    "valdez2023a": ["San Diego Nanotechnology Infrastructure", "Sandia National Laboratories"],
    "hsu2024": ["Intel Corporation", "Materials Synthesis and Characterization Facility"],
    "kawahara2025": ["National Institute of Advanced Industrial Science and Technology"],
    "didier2026": ["Binnig and Rohrer Nanotechnology Center", "FIRST cleanroom of ETH Zurich"],
    "rakowski2026": ["GlobalFoundries"],
    "soma2025": ["Takeda Sentanchi Super Cleanroom",
                 "Nanofabrication Platform Center of School of Engineering, the University of Tokyo"],
}
SUPPLIER = {"karakida2026": "NLM Photonics", "soma2025": "NLM Photonics", "witmer2020": "Shin-Etsu;Soluxra",
            "taghavi2024": "Polaris Electro-Optics, Inc.", "taghavi2026": "Polaris Electro-Optics, Inc.",
            "zhang2026a": "Polaris Electro-Optics, Inc."}
NEW_ORGS = [
    ("Zhejiang University Micro and Nano Processing Platform", "facility", "CN", "east_asia", "Zhejiang University",
     "Hangzhou; named as facility support in chen2023a p.9 acknowledgments; country from host"),
    ("Westlake Center for Micro/Nano Fabrication", "facility", "CN", "east_asia", "Westlake University",
     "Hangzhou; named in liu2023 p.8 acknowledgements; country from host"),
    ("ZJU Micro-Nano Fabrication Center", "facility", "CN", "east_asia", "Zhejiang University",
     "Hangzhou; written 'ZJU Micro-Nano Fabrication Center, Zhejiang University' in yu2024 p.14; may be the same platform as Zhejiang University Micro and Nano Processing Platform (not merged: names differ)"),
    ("Center of Micro-Fabrication and Characterization", "facility", "CN", "east_asia",
     "Huazhong University of Science and Technology",
     "Wuhan; CMFC of Wuhan National Laboratory for Optoelectronics (wang2022a p.4); possibly the same WNLO facility as Center of Optoelectronic Micro and Nano Fabrication and Characterizing Facility (not merged: names differ)"),
    ("Materials Synthesis and Characterization Facility", "facility", "US", "north_america", "Oregon State University",
     "Corvallis, Oregon; MaSC, named for device fabrication in hsu2024 p.15"),
    ("Nanofabrication Platform Center of School of Engineering, the University of Tokyo", "facility", "JP", "east_asia",
     "The University of Tokyo", "Tokyo; soma2025 p.12 acknowledgements"),
]


def read(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def write(path: Path, header: list[str], rows: list[dict[str, str]]) -> None:
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


def zhang_split(d_header: list[str], devices: list[dict[str, str]]) -> list[dict[str, str]]:
    rep = (HERE / "W5_report.md").read_text()
    block = rep.split("```csv\n", 1)[1].split("```", 1)[0]
    new = list(csv.DictReader(io.StringIO(block)))
    old = next(d for d in devices if d["device_id"] == "zhang2023-a")
    out = []
    for r in new:
        row = {k: r.get(k, old.get(k, "")) for k in d_header}
        for k in d_header:
            if k not in r:
                row[k] = ""
        row.update(device_class="resonator", drive="not_applicable", row_kind="device", eo_effect="pockels")
        row["tags"] = r["tags"].replace("passive_reference", "reference_device")
        if row["band"] == "other" and not row["wavelength_nm"]:
            row["band"] = ""
        row["notes"] = row["notes"].replace(
            "wavelength_nm is empty and band is other (convention l)", "wavelength_nm and band are empty (convention l)")
        if row["il_onchip_db"]:
            row["il_onchip_scope"] = "undefined"
        if row["bw3db_ghz"]:
            row["bw_method"] = "eo_s21"
        out.append(row)
    return out


def zhang_evidence() -> str:
    rep = (HERE / "W5_report.md").read_text()
    block = rep.split("```yaml\n", 1)[1].split("```", 1)[0]
    entries = yaml.safe_load(block)["entries"]
    p = DATA / "evidence" / "zhang2023.yaml"
    cur = yaml.safe_load(p.read_text())
    cur["entries"] = entries
    return yaml.safe_dump(cur, sort_keys=False, allow_unicode=True, width=120)


def main() -> None:
    p_header, papers = read(DATA / "papers.csv")
    for p in papers:
        pid = p["paper_id"]
        if pid in FAB:
            v = ";".join(FAB[pid])
            if p["foundry_or_fab"] != v:
                print(f"fab {pid}: {p['foundry_or_fab']!r} -> {v!r}")
                p["foundry_or_fab"] = v
        if pid in SUPPLIER and p["wafer_supplier"] != SUPPLIER[pid]:
            print(f"supplier {pid}: {p['wafer_supplier']!r} -> {SUPPLIER[pid]!r}")
            p["wafer_supplier"] = SUPPLIER[pid]
    o_header, orgs = read(DATA / "organizations.csv")
    names = {o["org_name"] for o in orgs}
    for n, t, c, reg, parent, note in NEW_ORGS:
        if n not in names:
            orgs.append(dict(zip(o_header, [n, t, c, reg, parent, note], strict=False)) | {k: "" for k in o_header[6:]})
            print(f"org + {n}")
    orgs.sort(key=lambda o: o["org_name"])
    d_header, devices = read(DATA / "devices.csv")
    new_rows = zhang_split(d_header, devices)
    i = next(k for k, d in enumerate(devices) if d["device_id"] == "zhang2023-a")
    if not any(d["device_id"] == "zhang2023-c" for d in devices):
        devices[i : i + 1] = new_rows
        print("zhang2023-a split into", [r["device_id"] for r in new_rows])
    ev = zhang_evidence()
    if APPLY:
        write(DATA / "papers.csv", p_header, papers)
        write(DATA / "organizations.csv", o_header, orgs)
        write(DATA / "devices.csv", d_header, devices)
        (DATA / "evidence" / "zhang2023.yaml").write_text(ev)
        # zhang2023 papers list: the facility named there must stay valid
        assert re.search(r"zhang2023", ev)


if __name__ == "__main__":
    main()
