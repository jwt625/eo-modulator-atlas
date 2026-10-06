"""One-off Phase A migration for DevLog-020 decision 8 (W2_schema_proposals.md adopt list): schema enums, new
columns and the mechanical fills (explicit device lists from W2, mapping from existing columns/tags).
Cells that need a source re-read are left for Phase B (W7 worklist).

Usage: uv run python data/_staging/conventions_2026_10_05/migrate_schema_w2.py [--apply]
"""

import csv
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
APPLY = "--apply" in sys.argv
DEV = ROOT / "data" / "devices.csv"
SCHEMA = ROOT / "data" / "schema" / "devices.schema.yaml"

# (new column, insert after, schema line)
NEW_COLS = [
    ("physical_device_id", "device_label",
     '  - {name: physical_device_id, type: str, required: false, desc: "rows that are operating points of one physical device share this id (<paper_id>-<slug>); empty = not stated or a single row"}'),
    ("row_kind", "device_class",
     '  - {name: row_kind, type: enum, enum: row_kind, required: true, desc: "device = fabricated and measured; design = simulated, projected or design-value row with no fabricated device behind the numbers"}'),
    ("eo_effect", "eo_material",
     '  - {name: eo_effect, type: enum, enum: eo_effect, required: true, desc: "primary modulation mechanism of the row (eo_material no longer implies it)"}'),
    ("temperature_k", "temperature_class",
     '  - {name: temperature_k, type: float, unit: K, evidence: true, desc: "device temperature during the reported measurement; C converted with a derived entry; empty = not reported (never assume room temperature)"}'),
    ("r_eff_pm_per_v", "vpi_basis",
     '  - {name: r_eff_pm_per_v, type: float, unit: pm/V, evidence: true, desc: "in-device effective Pockels coefficient the authors extract from their own measurement; tensor component/definition in the evidence note; assumed or literature inputs are not entered"}'),
    ("bw_method", "bw3db_reference_freq_ghz",
     '  - {name: bw_method, type: enum, enum: bw_method, required: false, desc: "how the row\'s bandwidth fields were obtained; required when bw3db_ghz, bw6db_ghz or eo_rolloff_db is set"}'),
    ("il_onchip_scope", "il_onchip_db",
     '  - {name: il_onchip_scope, type: enum, enum: il_onchip_scope, required: false, desc: "what il_onchip_db covers (convention s); required when il_onchip_db is set"}'),
    ("statistic", "il_basis",
     '  - {name: statistic, type: enum, enum: statistic, required: false, desc: "single, best, mean or median when the paper states how the headline values relate to several devices/channels/measurements (N, spread, yield in the evidence note); empty = not stated"}'),
]
NEW_ENUMS = {
    "row_kind": "[device, design]",
    "eo_effect": "[pockels, plasma_dispersion, qcse, franz_keldysh, pauli_blocking, stress_optic, orientational, other]",
    "bw_method": "[eo_s21, sideband, link_eoe, photon_lifetime_estimate, optical_linewidth, indirect, unspecified]",
    "il_onchip_scope": "[device_total, phase_section_only, excess_over_reference, free_space, undefined]",
    "statistic": "[single, best, mean, median]",
}
ENUM_ADD = {
    "device_class": ["resonator", "free_space"],
    "waveguide_platform": ["lnoi_loaded_oxide"],
    "integration": ["transferred_2d"],
    "electrode_type": ["tw_gssg"],
    "eo_material": ["transparent_conducting_oxide"],
    "drive": ["not_applicable"],
    "bw_reference": ["low_freq_unstated"],
}

IDS = str.split
E1 = IDS("berman2026-b liu2023-a liu2023-b liu2023-c liu2023-d witmer2020-converter witmer2020-slot witmer2020-unslotted zhong2026-a")
E2 = IDS("fukui2025-a fukui2025-b karakida2026-a liu2025c-a prountzou2026-a prountzou2026-b soma2025-a soma2025-b sun2026a-a sun2026a-b")
E4 = IDS("qi2024-a qi2024-b qi2024-c qi2024-d")
E8 = IDS("niels2026-a vanackere2023-a yang2026-a zheng2026-al1000 zheng2026-al500 zheng2026-g4 zheng2026-g5 zheng2026-g6 zhou2026-a")
E10 = IDS("gui2022-a gui2022-b lotkov2024-a")
N4_DESIGN = IDS("""gui2022-a gui2022-b navarro2026-a navarro2026-b navarro2026-c navarro2026-d navarro2026-e navarro2026-f
nenezic2026-case1 nenezic2026-case2 nenezic2026-case3 zwickel2020-design-0p5mm zwickel2020-design-1mm hsu2024-b lee2020a-b
fukui2025-b taghavi2022a-sim johnson2025-200g-design johnson2025-400g-design""")
N7_UNDEFINED = IDS("""cai2026-a cai2026-b guo2026-a han2023-a karakida2026-a kholeif2026-a lee2020a-a lee2020a-b liu2023-a liu2023-d
liu2026b-a lotkov2024-a luan2026-a luan2026-c luan2026a-a mao2024-1550 nelan2022-a ogiso2016-a soma2025-a steckler2025-a
steckler2025-b valdez2026-a wang2025-a wang2026a-a wang2026a-b wu2025-a zhang2023-a zhong2026-a""")
N7_FREE = IDS("fukui2025-a fukui2025-b soma2025-a")
N8_SIDEBAND = IDS("""arabjuneghani2022-a berman2026-c kari2025-a kari2025-b luan2026a-a nelan2022-a nelan2022a-a renaud2023-3um-738
shen2026-a valdez2022-a weigel2018-a yu2026-a zhang2022-a zhang2022-b""")
MATERIAL_EFFECT = {
    "lithium_niobate": "pockels", "lithium_tantalate": "pockels", "barium_titanate": "pockels", "eo_polymer": "pockels",
    "plzt": "pockels", "strontium_titanate": "pockels", "algaas_gaas": "pockels", "ktn": "pockels",
    "silicon_plasma_dispersion": "plasma_dispersion", "transparent_conducting_oxide": "plasma_dispersion",
    "germanium_silicon_eam": "franz_keldysh", "graphene_2d": "pauli_blocking", "pzt": "stress_optic",
}
TAG_FIXES = {"ring_assisted_mzi": "ring_assisted_mzm", "micro_transfer_printing": "micro_transfer_printed",
             "travelling_wave": "traveling_wave", "fabry_perot": "fabry_perot_cavity"}


def main() -> None:
    with DEV.open(newline="") as f:
        rd = csv.DictReader(f)
        header, rows = list(rd.fieldnames or []), list(rd)
    for col, after, _ in NEW_COLS:
        if col not in header:
            header.insert(header.index(after) + 1, col)
            for r in rows:
                r[col] = ""
    ch: Counter[str] = Counter()
    pending: Counter[str] = Counter()

    def put(r: dict[str, str], k: str, v: str) -> None:
        if r[k] != v:
            ch[f"{k}={v}"] += 1
            r[k] = v

    for r in rows:
        did, tags = r["device_id"], [t for t in r["tags"].split(";") if t]
        new_tags = list(dict.fromkeys(TAG_FIXES.get(t, t) for t in tags))
        if new_tags != tags:
            put(r, "tags", ";".join(new_tags))
            tags = new_tags
        if did in E1:
            put(r, "device_class", "resonator")
        if did in E2:
            put(r, "device_class", "free_space")
        if did in E4:
            put(r, "waveguide_platform", "lnoi_loaded_oxide")
        if r["eo_material"] == "graphene_2d" and r["integration"] == "other" and not did.startswith("navarro2026"):
            put(r, "integration", "transferred_2d")
        if did in E8 or (r["electrode_type"] in ("other", "") and "gsgsg" in tags and r["drive"] == "differential"):
            put(r, "electrode_type", "tw_gssg")
        if did in E10:
            put(r, "eo_material", "transparent_conducting_oxide")
        if r["device_class"] in ("eam", "ring", "resonator", "free_space") and r["drive"] in ("", "unspecified"):
            put(r, "drive", "not_applicable")
        put(r, "row_kind", "design" if did in N4_DESIGN else "device")
        eff = MATERIAL_EFFECT.get(r["eo_material"])
        if r["eo_material"] == "inp_mqw":
            eff = "qcse" if "qcse" in tags else None
        if eff:
            put(r, "eo_effect", eff)
        else:
            pending["eo_effect"] += 1
        if r["il_onchip_db"]:
            if did in N7_FREE:
                put(r, "il_onchip_scope", "free_space")
            elif did in N7_UNDEFINED:
                put(r, "il_onchip_scope", "undefined")
            elif "phase_only_loss" in tags:
                put(r, "il_onchip_scope", "phase_section_only")
            else:
                pending["il_onchip_scope"] += 1
        if r["bw3db_ghz"] or r["bw6db_ghz"] or r["eo_rolloff_db"]:
            if did in N8_SIDEBAND:
                put(r, "bw_method", "sideband")
            elif "photon_lifetime_limited" in tags:
                put(r, "bw_method", "photon_lifetime_estimate")
            elif "bw_indirect_method" in tags:
                put(r, "bw_method", "indirect")
            else:
                pending["bw_method"] += 1
    for k, v in sorted(ch.items()):
        print(f"{v:4d} {k}")
    print("pending for Phase B:", dict(pending))
    if not APPLY:
        return
    s = SCHEMA.read_text()
    for name, vals in ENUM_ADD.items():
        line = next(ln for ln in s.splitlines() if ln.startswith(f"  {name}: ["))
        cur = line.split("[", 1)[1].rstrip("]").split(", ")
        add = [v for v in vals if v not in cur]
        if add:
            # keep `other`/`unspecified` last
            tail = [v for v in cur if v in ("other", "unspecified")]
            new = [v for v in cur if v not in tail] + add + tail
            s = s.replace(line, f"  {name}: [{', '.join(new)}]")
    for name, vals in NEW_ENUMS.items():
        if f"  {name}: [" not in s:
            s = s.replace("  audit_status: [", f"  {name}: {vals}\n  audit_status: [", 1)
    for col, after, line in NEW_COLS:
        if f"name: {col}," not in s:
            anchor = next(ln for ln in s.splitlines() if ln.startswith(f"  - {{name: {after},"))
            s = s.replace(anchor, anchor + "\n" + line, 1)
    SCHEMA.write_text(s)
    with DEV.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=header)
        w.writeheader()
        w.writerows(rows)


if __name__ == "__main__":
    main()
