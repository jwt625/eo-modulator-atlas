"""Build the Phase B worklist (W7): per device row, the fields that need a source re-read under the 2026-10-05
conventions. Writes W7_worklist.csv and W7_groups.txt (4 balanced paper groups)."""

import csv
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
rows = list(csv.DictReader((ROOT / "data" / "devices.csv").open(newline="")))
papers = [p["paper_id"] for p in csv.DictReader((ROOT / "data" / "papers.csv").open(newline=""))]
ORPHANS = {("aimone2026-a", "max_line_rate_gbps"), ("hulyal2026-a", "vpil_dc_vcm"), ("hulyal2026-a", "max_line_rate_gbps"),
           ("rakowski2026-a", "tuning_nm_per_v"), ("rakowski2026-b", "tuning_nm_per_v"), ("su2026-a", "vpi_dc_v"),
           ("taghavi2022a-a", "vpi_dc_v"), ("xu2026a-a", "slab_thickness_nm"), ("zhou2026-a", "max_line_rate_gbps")}
E8 = {"dong2026-a", "wang2026a-a", "wang2026a-b", "qiu2026a-a", "zheng2026-pre"}
NON_MZM = {"eam", "ring", "resonator", "free_space"}
MZM = {"mzm", "iq_mzm", "plasmonic_mzm"}

out = []
for r in rows:
    did, t = r["device_id"], []
    bw = r["bw3db_ghz"] or r["bw6db_ghz"] or r["eo_rolloff_db"]
    if not r["eo_effect"]:
        t.append("EO_EFFECT")
    if bw and not r["bw_method"]:
        t.append("BW_METHOD")
    if bw and r["bw3db_reference"] in ("", "unspecified"):
        t.append("BW_REF")
    if r["il_onchip_db"] and not r["il_onchip_scope"]:
        t.append("IL_SCOPE")
    if r["device_class"] in NON_MZM and r["drive"] not in ("", "not_applicable", "unspecified"):
        t.append("DRIVE_CHECK")
    if r["device_class"] not in MZM | NON_MZM and r["drive"] in ("", "unspecified"):
        t.append("DRIVE_OTHER")
    if r["integration"] in ("", "other"):
        t.append("INTEGRATION")
    if did in E8:
        t.append("ELECTRODE")
    if did in ("kawahara2025-b", "porto2026-a"):
        t.append("ROW_KIND")
    if r["sidewall_angle_deg"] and float(r["sidewall_angle_deg"]) < 45:
        t.append("SIDEWALL")
    if r["bias_for_vpi_v"] and float(r["bias_for_vpi_v"]) > 0:
        t.append("BIAS_SIGN")
    if r["tuning_nm_per_v"]:
        t.append("TUNING_SIGN")
    if did == "guo2026-a":
        t.append("POWER_HANDLING")
    if r["er_type"] == "dynamic":
        t.append("ER_DYNAMIC")
    if r["paper_id"] == "hu2026a" and r["extinction_ratio_db"]:
        t.append("ARRAY_ER")
    for k in ORPHANS:
        if k[0] == did:
            t.append(f"ORPHAN_DERIVED:{k[1]}")
    t.append("GENERAL")  # statistic, temperature_k, r_eff_pm_per_v, physical_device_id
    out.append({"paper_id": r["paper_id"], "device_id": did, "tasks": ";".join(t)})

with (HERE / "W7_worklist.csv").open("w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["paper_id", "device_id", "tasks"])
    w.writeheader()
    w.writerows(out)

load: dict[str, int] = defaultdict(int)
for o in out:
    load[o["paper_id"]] += len(o["tasks"].split(";"))
groups: list[list[str]] = [[], [], [], []]
weights = [0, 0, 0, 0]
for pid in sorted(load, key=lambda p: -load[p]):
    k = weights.index(min(weights))
    groups[k].append(pid)
    weights[k] += load[pid]
with (HERE / "W7_groups.txt").open("w") as f:
    for k, g in enumerate(groups, 1):
        f.write(f"g{k} ({weights[k - 1]} task units, {len(g)} papers): {' '.join(sorted(g))}\n")
print(f"{len(out)} rows; papers with devices {len(load)}; groups {weights}")
from collections import Counter  # noqa: E402

print(Counter(x.split(":")[0] for o in out for x in o["tasks"].split(";")))
