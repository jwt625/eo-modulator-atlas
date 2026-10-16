"""Summary of the S8 references (DevLog-040): key values, U, gate roles and comparison conditions in one file.

Usage: ./run.sh scripts/summarize_s8.py   (reads reference/s8-K10/K11/K12.json, writes reference/summary-s8.json)
"""

from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference"


def vu(d):
    return {"value": d["value"], "U": d["U"]}


def main():
    k10 = json.loads((REF / "s8-K10.json").read_text())
    k11 = json.loads((REF / "s8-K11.json").read_text())
    k12 = json.loads((REF / "s8-K12.json").read_text())
    out = {
        "date": time.strftime("%Y-%m-%d"),
        "lane": "T5 S8-REF (DevLog-040)",
        "units": {"C_K10": "F/cm^2", "C_K11": "F/cm", "J": "A/cm^2", "densities": "cm^-3", "alpha": "cm^-1",
                  "VpiL": "V cm"},
        "K10": {
            "case_sha256": k10["case_sha256"],
            "gate_roles": {"C_F_cm2": "primary", "Vbi": "primary"},
            "comparison_conditions": k10["definitions"]["contacts"],
            "Vbi_V": k10["Vbi"]["closed_form_V"],
            "rows": [{"V_pn": r["V_pn"], "C_F_cm2": vu(r["C_F_cm2"]),
                      "C_closed_form_2Vt_F_cm2": r["closed_form_depletion_2Vt"]["C_F_cm2"]} for r in k10["rows"]],
        },
        "K12": {
            "case_sha256": k12["case_sha256"],
            "gate_roles": {"J_A_cm2": "primary at 0.5-0.9 V; 1.0 V only with identical ideal ohmic contacts",
                           "n_p_centre": "primary", "n_p_mean_central_i": "primary"},
            "comparison_conditions": k12["definitions"]["contacts"],
            "rows": [{"V_pn": r["V_pn"], "J_A_cm2": vu(r["J_A_cm2"]), "n_centre_cm3": vu(r["n_centre_cm3"]),
                      "p_centre_cm3": vu(r["p_centre_cm3"]), "n_mean_i_cm3": vu(r["n_mean_i_cm3"]),
                      "p_mean_i_cm3": vu(r["p_mean_i_cm3"]),
                      "contact_loss_fraction": r["contact_loss_fraction_finest"]} for r in k12["rows"]],
        },
        "K11": {
            "case_sha256": k11["case_sha256"],
            "gate_roles": k11["gate_roles"],
            "comparison_conditions": k11["comparison_conditions"],
            "n_eff_TE0": k11["optics_levels"][-1]["n_eff"],
            "rows": [],
        },
    }
    for r in k11["rows"]:
        row = {"V_pn": r["V_pn"], "C_si_only_F_cm": vu(r["C_si_only_F_cm"]), "C_F_cm": vu(r["C_F_cm"])}
        for m, o in r["optics"].items():
            if isinstance(o, str):
                continue
            row[m] = {"dneff_re": vu(o["dneff_re"]), "dalpha_mode_cm": vu(o["dalpha_mode_cm"]),
                      "alpha_mode_cm": vu(o["alpha_mode_cm"]), "VpiL_V_cm": o["VpiL_V_cm"]}
        out["K11"]["rows"].append(row)
    (REF / "summary-s8.json").write_text(json.dumps(out, indent=1, allow_nan=False) + "\n")
    print("wrote reference/summary-s8.json")


if __name__ == "__main__":
    main()
