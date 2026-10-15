"""Collect validation/reference/*.json into reference/summary.json (engine metric names) and print a markdown table.

Run: uv run python scripts/summarize.py
"""

from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "reference"


def load(name: str) -> dict | None:
    p = REF / f"{name}.json"
    return json.loads(p.read_text()) if p.exists() else None


def ev(e: dict) -> dict:
    return {"value": e["f_ext"], "U": e["U"], "f_finest": e.get("f_finest", e["f"][-1]), "method": e["method"],
            "p": e["p"]}


def main() -> None:
    out: dict = {"date": time.strftime("%Y-%m-%d"),
                 "note": ("reference values; U = extrapolation uncertainty (DevLog-028 round-2 rule); primary values are "
                          "the vector FEM / scikit-fem results; tidy3d entries are sanity only, not a gate; for K4/K5 "
                          "the primary EO comparands are vpil_vcm and dn_mean_abs_per_V, per-arm dn and balance are "
                          "informational; vpil_scalar_vcm is a definitional comparison, not an engine target"),
                 "cases": {}}
    rows = []
    for cid in ("K1", "K2", "K3"):
        fem, td = load(f"{cid}-fem"), load(f"{cid}-tidy3d")
        if not fem:
            continue
        c = {"case_sha256": fem["case_sha256"], "fem": {}, "tidy3d": {"role": "sanity_only_not_a_gate"}}
        c["fem"]["n_eff"] = ev(fem["extrapolated"]["n_eff"])
        c["fem"]["ng_opt"] = ev(fem["extrapolated"]["ng_energy"])
        c["fem"]["ng_opt_fd10nm"] = ev(fem["extrapolated"]["ng_fd_10nm"])
        c["fem"]["te_fraction"] = ev(fem["extrapolated"]["te_fraction"])
        c["fem"]["power_fraction_core"] = ev(fem["extrapolated"]["power_fraction_core"])
        c["fem"]["window_1p5x_shift_n_eff"] = fem["window_check"]["dn_eff_vs_same_level"]
        if td:
            c["tidy3d"]["n_eff"] = ev(td["extrapolated"]["n_eff"])
            c["tidy3d"]["ng_opt"] = ev(td["extrapolated"]["ng_tidy3d"])
            c["tidy3d"]["ng_opt_fd10nm"] = ev(td["extrapolated"]["ng_fd_10nm"])
            c["tidy3d"]["te_fraction"] = ev(td["extrapolated"]["te_fraction"])
            c["delta_fem_minus_tidy3d"] = {k: c["fem"][k]["value"] - c["tidy3d"][k]["value"]
                                           for k in ("n_eff", "ng_opt", "te_fraction")}
        out["cases"][cid] = c
        for k in ("n_eff", "ng_opt", "te_fraction"):
            f = c["fem"][k]
            t = c["tidy3d"].get(k) if td else None
            rows.append((cid, k, f"{f['value']:.8f} +- {f['U']:.1e}",
                         f"tidy3d (sanity only) {t['value']:.5f} +- {t['U']:.1e}" if t else "N/A"))
    k7 = ["K7-D0", "K7-D1", "K7-D2.6", "K7-D3.6", "K7K4-D0", "K7K4-D0.9", "K7K4-D1.8"]
    for cid in ("K4", "K5-g3", "K5-g4", "K5-g5", "K5-g6", "K5-g8", *k7):
        r = load(f"{cid}-es-eo")
        if not r:
            continue
        x = r["extrapolated"]
        c = {"case_sha256": r["case_sha256"], "comparands": r.get("comparands"), **{k: ev(v) for k, v in x.items()}}
        c["arm_modes"] = r.get("arm_modes")
        if "optical_mesh_check" in r:
            c["optical_mesh_check_d_vpil_vcm"] = r["optical_mesh_check"]["d_vpil_vcm"]
        if "domain_study" in r:
            ref = r["domain_study"]["same_scale_yaml_domain"]
            c["domain_study"] = {"scale": r["domain_study"]["scale"],
                                 "rows": [{k: d[k] for k in ("domain_half_um", "C_pF_per_m", "C0_pF_per_m", "n_rf", "Z0_ohm")}
                                          for d in r["domain_study"]["rows"]],
                                 "yaml_domain_500_same_scale": {k: ref[k] for k in ("C_pF_per_m", "C0_pF_per_m", "n_rf", "Z0_ohm")}}
        out["cases"][cid] = c
        for k, name in (("C_pF_per_m", "c_pul_pf_per_m"), ("C0_pF_per_m", "c0_pul_pf_per_m"), ("n_rf", "n_rf"),
                        ("Z0_ohm", "z0_ohm"), ("vpil_vcm", "vpi_l_dc_vcm"), ("dn_mean_abs_per_V", "dn_mean_abs_per_V"),
                        ("vpil_r33only_vcm", "vpil_r33only_vcm (informational)"),
                        ("vpil_scalar_vcm", "vpil_scalar_vcm (definitional, not a target)")):
            e = x[k]
            rows.append((cid, name, f"{e['f_ext']:.6g} +- {e['U']:.1e}", ""))
    # K7 waveguide-position ratios VpiL(D = 0) / VpiL(D), U propagated in quadrature (round 3)
    for fam, ids in (("K7", k7[:4]), ("K7K4", k7[4:])):
        if all(i in out["cases"] for i in ids):
            v0 = out["cases"][ids[0]]["vpil_vcm"]
            out.setdefault("ratios", {})[fam] = {}
            for i in ids[1:]:
                v = out["cases"][i]["vpil_vcm"]
                r = v0["value"] / v["value"]
                u = r * ((v0["U"] / v0["value"]) ** 2 + (v["U"] / v["value"]) ** 2) ** 0.5
                out["ratios"][fam][f"{ids[0]}/{i}"] = {"value": r, "U": u}
                rows.append((fam, f"VpiL {ids[0]}/{i}", f"{r:.4f} +- {u:.1e}", ""))
    for cid in ("K6a", "K6b"):
        r = load(cid)
        if not r:
            continue
        cf = r["closed_form_t0_infinite"]
        c = {"case_sha256": r["case_sha256"], "closed_form_t0_infinite": cf}
        for mode in ("line_R500", "area_R500"):
            c[f"fem_{mode}"] = {k: ev(v) for k, v in r["fem"][mode]["extrapolated"].items()}
        # R -> infinity at the domain-study mesh scale, corrected by the mesh error of that scale at R = 500:
        # f(t=0, R inf, h -> 0) = f_Rinf(sd) + [f_R500(h -> 0) - f_R500(sd)]
        sd = r["domain_study"]["scale"]
        lv = {round(x["scale"], 9): x for x in r["fem"]["line_R500"]["levels"]}[round(sd, 9)]
        c["fem_line_R_inf"] = {}
        for k, v in r["domain_study"]["extrapolated_R_inf"].items():
            m500 = r["fem"]["line_R500"]["extrapolated"][k]
            val = v["f_ext"] + (m500["f_ext"] - lv[k])
            c["fem_line_R_inf"][k] = {"value": val, "U": float((v["U"] ** 2 + m500["U"] ** 2) ** 0.5),
                                      "method": "domain 1/R Richardson at scale sd + mesh correction at R=500", "p": v["p"]}
        c["closed_form_minus_fem_rel"] = {k: cf[k] / c["fem_line_R_inf"][k]["value"] - 1
                                          for k in ("C_pF_per_m", "C0_pF_per_m", "n_rf", "Z0_ohm")}
        out["cases"][cid] = c
        for k, name in (("C_pF_per_m", "c_pul_pf_per_m"), ("n_rf", "n_rf"), ("Z0_ohm", "z0_ohm")):
            a = c["fem_area_R500"][k]
            li = c["fem_line_R_inf"][k]
            rows.append((cid, name, f"area t=0.1 R=500: {a['value']:.6g} +- {a['U']:.1e}",
                         f"closed form {cf[k]:.6g}; FEM t=0 R->inf {li['value']:.6g} +- {li['U']:.1e}"))
    (REF / "summary.json").write_text(json.dumps(out, indent=1, default=float))
    print("| Case | Quantity | Primary (FEM) | Cross-check |")
    print("|---|---|---|---|")
    for r in rows:
        print("| " + " | ".join(r) + " |")


if __name__ == "__main__":
    main()
