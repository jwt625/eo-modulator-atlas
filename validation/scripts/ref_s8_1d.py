"""S8 1D references K10 (abrupt PN, C'(V)) and K12 (PIN forward bias) with DEVSIM and the own 1D solver (DevLog-040).

Usage: ./run_guarded.sh scripts/ref_s8_1d.py K10|K12 [--pilot] [--dry-run] [--out PATH]
Uniform grids over the device (N cells, N divisible by 4 so every doping step is a node); node doping = exact
control-volume average. Both codes run on every grid; the round-2 rule (eoref.util.richardson, p_formal 2) on the
three finest grids gives the reference value and U.
"""

from __future__ import annotations

import argparse
import importlib.metadata as md
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from eoref import dd1d  # noqa: E402
from eoref import geom as G  # noqa: E402
from eoref import semi as S  # noqa: E402
from eoref import semi_devsim as SD  # noqa: E402
from eoref.util import Logger, max_rss_mb, richardson, versions  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
LEVELS = [360, 500, 720, 1000, 1420, 2000]  # multiples of 20: steps (+-0.5 um) and window ends (+-0.4 um) on nodes
DV = 0.002  # V, central difference for C' (check against 2 DV)
I_MARGIN_UM = 0.1  # K12: i-region averages over the central part, 0.1 um away from the doping steps


def all_versions() -> dict:
    v = versions()
    for p in ("devsim", "matplotlib"):
        try:
            v[p] = md.version(p)
        except md.PackageNotFoundError:
            v[p] = "absent"
    return v


def boxes_of(case: dict) -> list[S.DopingBox]:
    out = []
    segs = case["geometry_1d"]["segments"]
    for k, s in enumerate(segs):
        x0, x1 = (v * 1e-4 for v in s["x_um"])
        if k == len(segs) - 1:
            x1 += 1e-12  # include the last node
        if s.get("donor_cm3", 0.0) > 0:
            out.append(S.DopingBox("donor", s["donor_cm3"], x0, x1))
        else:
            out.append(S.DopingBox("acceptor", s["acceptor_cm3"], x0, x1))
    return out


def make_devices(case: dict, N: int, tag: str):
    segs = case["geometry_1d"]["segments"]
    x0, x1 = segs[0]["x_um"][0] * 1e-4, segs[-1]["x_um"][1] * 1e-4
    x = np.linspace(x0, x1, N + 1)
    boxes = boxes_of(case)
    nd, na = S.cell_average_doping_1d(boxes, x)
    rec = case["models"]["recombination"]
    eps = case["materials"]["silicon"]["eps_r"]
    d = dd1d.Device1D(x, nd, na, eps_r=eps, tau_n=rec["tau_n_s"], tau_p=rec["tau_p_s"])

    def dop(xx, _yy):
        idx = np.array([int(np.argmin(np.abs(x - v))) for v in xx])
        return nd[idx], na[idx]

    coords, els, names, _ = SD.tensor_mesh_lists(
        x, None, lambda xc, yc: "silicon", [("anode", "silicon", x[0], x[0]), ("cathode", "silicon", x[-1], x[-1])],
        two_d=False)
    with SD.quiet():
        dev = SD.DevsimDevice(f"{tag}_{N}", coords, els, names, ["anode", "cathode"], False, eps, 3.9,
                              rec["tau_n_s"], rec["tau_p_s"], dop)
        info = dev.solve()
    if not info.get("converged", False):
        raise RuntimeError("DEVSIM equilibrium did not converge")
    st = dd1d.equilibrium(d)
    return x, d, st, dev


def sorted_vals(dev, name):
    o = np.argsort(dev.x)
    return dev.values(name)[o]


def run_k10(case, levels, biases, log) -> dict:
    NA = case["geometry_1d"]["segments"][0]["acceptor_cm3"]
    ND = case["geometry_1d"]["segments"][1]["donor_cm3"]
    eps = case["materials"]["silicon"]["eps_r"]
    per_level = []
    for N in levels:
        t0 = time.time()
        x, d, st, dev = make_devices(case, N, "K10")
        psi = sorted_vals(dev, "Potential")
        vbi_ds = float(psi[-1] - psi[0])
        rows = []
        for V in biases:
            with SD.quiet():
                dev.ramp("anode", V)
            st = dd1d.ramp(d, st, V)
            ne_ds, ne_dd, nh_ds = [], [], []
            for dv in (+DV, -DV):
                with SD.quiet():
                    dev.ramp("anode", V + dv, step=0.01)
                ne_ds.append(dev.integral("Electrons"))
                nh_ds.append(dev.integral("Holes"))
                s2 = dd1d.ramp(d, dd1d.State(st.psi.copy(), st.u.copy(), st.v.copy(), st.va, st.vc), V + dv, step=0.01)
                ne_dd.append(dd1d.observables(d, s2)["Ne_tot_cm2"])
            with SD.quiet():
                dev.ramp("anode", V, step=0.01)
            c_ds = S.Q * abs(ne_ds[0] - ne_ds[1]) / (2 * DV)
            c_ds_h = S.Q * abs(nh_ds[0] - nh_ds[1]) / (2 * DV)
            c_dd = S.Q * abs(ne_dd[0] - ne_dd[1]) / (2 * DV)
            n_ds = sorted_vals(dev, "Electrons")
            rows.append({"V": V, "C_devsim_F_cm2": c_ds, "C_devsim_holes_F_cm2": c_ds_h, "C_dd1d_F_cm2": c_dd,
                         "max_rel_n_devsim_vs_dd1d": float(np.max(np.abs(n_ds / st.n - 1)))})
        per_level.append({"N": N, "h_nm": float((x[1] - x[0]) * 1e7), "Vbi_devsim_V": vbi_ds, "rows": rows,
                          "seconds": time.time() - t0})
        log.info(f"K10 N={N} h={per_level[-1]['h_nm']:.3f} nm Vbi {vbi_ds:.9f} C(0) ds {rows[0]['C_devsim_F_cm2']:.9e} "
                 f"dd {rows[0]['C_dd1d_F_cm2']:.9e} ({per_level[-1]['seconds']:.1f} s)")
    # dV check at the finest level and V = 0, -4
    x, d, st, dev = make_devices(case, levels[-1], "K10dv")
    dvcheck = []
    for V in (biases[0], biases[-1]):
        with SD.quiet():
            dev.ramp("anode", V)
        vals = {}
        for dvv in (DV, 2 * DV):
            ne = []
            for s in (+1, -1):
                with SD.quiet():
                    dev.ramp("anode", V + s * dvv, step=0.01)
                ne.append(dev.integral("Electrons"))
            vals[f"dV_{dvv}"] = S.Q * abs(ne[0] - ne[1]) / (2 * dvv)
            with SD.quiet():
                dev.ramp("anode", V, step=0.01)
        r2 = vals[f"dV_{2 * DV}"] / vals[f"dV_{DV}"] - 1
        dvcheck.append({"V": V, **vals, "rel_diff_2dV_vs_dV": r2, "rel_err_dV_est": abs(r2) / 3})
    rel_dv = max(c["rel_err_dV_est"] for c in dvcheck)
    # extrapolation and closed forms
    hs = [lv["h_nm"] for lv in per_level]
    out_rows = []
    for k, V in enumerate(biases):
        cds = [lv["rows"][k]["C_devsim_F_cm2"] for lv in per_level]
        cdd = [lv["rows"][k]["C_dd1d_F_cm2"] for lv in per_level]
        r_ds = richardson(hs, cds, 2.0)
        r_dd = richardson(hs, cdd, 2.0)
        cf = S.depletion_closed_form(NA, ND, eps, V)
        cf2 = S.depletion_closed_form(NA, ND, eps, V, two_vt=True)
        cref = r_ds["f_ext"]
        out_rows.append({
            "V_pn": V,
            "C_F_cm2": {"value": cref, "U": r_ds["U"] + rel_dv * abs(cref), "U_mesh": r_ds["U"],
                        "U_dV": rel_dv * abs(cref), "f_finest": r_ds["f_finest"], "method": r_ds["method"],
                        "p": r_ds["p"]},
            "C_fF_um2": cref * 1e7,
            "C_dd1d_F_cm2": {"value": r_dd["f_ext"], "U": r_dd["U"], "f_finest": r_dd["f_finest"]},
            "W_eq_um_eps_over_C": eps * S.EPS0_F_PER_CM / cref * 1e4,
            "closed_form_depletion": {"C_F_cm2": cf["C_F_cm2"], "W_um": cf["W_cm"] * 1e4, "xp_um": cf["xp_cm"] * 1e4,
                                      "xn_um": cf["xn_cm"] * 1e4},
            "closed_form_depletion_2Vt": {"C_F_cm2": cf2["C_F_cm2"], "W_um": cf2["W_cm"] * 1e4},
            "ratio_DD_over_depletion": cref / cf["C_F_cm2"],
            "ratio_DD_over_depletion_2Vt": cref / cf2["C_F_cm2"],
            "levels_devsim": r_ds, "levels_dd1d": r_dd,
            "devsim_vs_dd1d_max_rel_C": float(max(abs(a / b - 1) for a, b in zip(cds, cdd, strict=True))),
            "devsim_vs_dd1d_max_rel_n": float(max(lv["rows"][k]["max_rel_n_devsim_vs_dd1d"] for lv in per_level)),
            "electron_vs_hole_C_rel": float(per_level[-1]["rows"][k]["C_devsim_holes_F_cm2"]
                                            / per_level[-1]["rows"][k]["C_devsim_F_cm2"] - 1),
        })
    return {"Vbi": {"closed_form_V": S.builtin_voltage(NA, ND), "devsim_contact_potential_difference_V":
                    per_level[-1]["Vbi_devsim_V"]},
            "rows": out_rows, "dV_check": dvcheck, "levels": per_level}


def run_k12(case, levels, biases, log) -> dict:
    segs = case["geometry_1d"]["segments"]
    xi0, xi1 = (v * 1e-4 for v in segs[1]["x_um"])
    per_level = []
    for N in levels:
        t0 = time.time()
        x, d, st, dev = make_devices(case, N, "K12")
        rows = []
        m_um = I_MARGIN_UM * 1e-4
        ci0, ci1 = xi0 + m_um, xi1 - m_um
        mi = (x >= ci0 - 1e-12) & (x <= ci1 + 1e-12)
        for edge in (ci0, ci1, xi0, xi1):
            if np.min(np.abs(x - edge)) > 1e-9 * (x[1] - x[0]):
                raise RuntimeError(f"window/step x = {edge} is not a node for N = {N} (audit Q3)")
        ic = int(np.argmin(np.abs(x - 0.5 * (xi0 + xi1))))
        mu0n = S.mu_electron(d.nd + d.na)
        mu0p = S.mu_hole(d.nd + d.na)
        for V in biases:
            with SD.quiet():
                dev.ramp("anode", V, step=0.02)
            st = dd1d.ramp(d, st, V, step=0.02)
            n_ds, p_ds, psi_ds = (sorted_vals(dev, k) for k in ("Electrons", "Holes", "Potential"))
            J_ds = -dev.contact_current("cathode")
            J_ds_a = dev.contact_current("anode")
            ob = dd1d.observables(d, st)
            usrh = sorted_vals(dev, "USRH")
            vol = sorted_vals(dev, "NodeVolume")
            Jrec = S.Q * float(np.sum(usrh * vol))  # bulk SRH recombination current (A/cm^2)
            E = -np.diff(psi_ds) / np.diff(x)
            phin = psi_ds - S.VT * np.log(n_ds / S.NI)
            phip = psi_ds + S.VT * np.log(p_ds / S.NI)
            emask = mi[1:] & mi[:-1]
            Fn = np.abs(np.diff(phin) / np.diff(x))[emask]  # quasi-Fermi driving force (V/cm), central i region
            Fp = np.abs(np.diff(phip) / np.diff(x))[emask]
            Ei = np.abs(E[emask])
            mun_e = 0.5 * (mu0n[1:] + mu0n[:-1])[emask]
            mup_e = 0.5 * (mu0p[1:] + mu0p[:-1])[emask]
            row = {
                "V": V,
                "J_devsim_A_cm2": J_ds, "J_devsim_anode_A_cm2": J_ds_a, "J_dd1d_A_cm2": ob["J_total_A_cm2"],
                "J_dd1d_spread_A_cm2": ob["J_spread_A_cm2"],
                "J_bulk_srh_A_cm2": Jrec,
                "contact_loss_fraction": 1.0 - Jrec / J_ds,
                "n_centre_cm3": float(n_ds[ic]), "p_centre_cm3": float(p_ds[ic]),
                "n_mean_i_cm3": float(np.trapezoid(n_ds[mi], x[mi]) / (ci1 - ci0)),
                "p_mean_i_cm3": float(np.trapezoid(p_ds[mi], x[mi]) / (ci1 - ci0)),
                "n_sheet_i_cm2": float(np.trapezoid(n_ds[mi], x[mi])),
                "p_sheet_i_cm2": float(np.trapezoid(p_ds[mi], x[mi])),
                "n_centre_dd1d_cm3": float(st.n[ic]), "p_centre_dd1d_cm3": float(st.p[ic]),
                "E_max_i_V_cm": float(Ei.max()),
                "F_n_max_V_cm": float(Fn.max()), "F_p_max_V_cm": float(Fp.max()),
                "caughey_thomas_min_factor_n": float(np.min(S.ct_factor(mun_e, Fn, "n"))),
                "caughey_thomas_min_factor_p": float(np.min(S.ct_factor(mup_e, Fp, "p"))),
                "max_rel_n_devsim_vs_dd1d": float(np.max(np.abs(n_ds / st.n - 1))),
            }
            rows.append(row)
        per_level.append({"N": N, "h_nm": float((x[1] - x[0]) * 1e7), "rows": rows, "seconds": time.time() - t0})
        r = rows[-1]
        log.info(f"K12 N={N} V={r['V']} J ds {r['J_devsim_A_cm2']:.9e} dd {r['J_dd1d_A_cm2']:.9e} n_c {r['n_centre_cm3']:.6e} "
                 f"({per_level[-1]['seconds']:.1f} s)")
    hs = [lv["h_nm"] for lv in per_level]
    keys = ["J_devsim_A_cm2", "n_centre_cm3", "p_centre_cm3", "n_mean_i_cm3", "p_mean_i_cm3", "n_sheet_i_cm2",
            "p_sheet_i_cm2"]
    out_rows = []
    for k, V in enumerate(biases):
        row = {"V_pn": V}
        for key in keys:
            vals = [lv["rows"][k][key] for lv in per_level]
            r = richardson(hs, vals, 2.0)
            row[key.replace("_devsim", "")] = {"value": r["f_ext"], "U": r["U"], "f_finest": r["f_finest"],
                                              "method": r["method"], "p": r["p"], "levels": r}
        fin = per_level[-1]["rows"][k]
        row["J_dd1d_finest_A_cm2"] = fin["J_dd1d_A_cm2"]
        row["J_bulk_srh_finest_A_cm2"] = fin["J_bulk_srh_A_cm2"]
        row["contact_loss_fraction_finest"] = fin["contact_loss_fraction"]
        row["devsim_vs_dd1d_max_rel_J"] = float(max(abs(lv["rows"][k]["J_devsim_A_cm2"] / lv["rows"][k]["J_dd1d_A_cm2"] - 1)
                                                    for lv in per_level))
        row["devsim_vs_dd1d_max_rel_n"] = float(max(lv["rows"][k]["max_rel_n_devsim_vs_dd1d"] for lv in per_level))
        row["anode_vs_cathode_J_rel"] = float(fin["J_devsim_anode_A_cm2"] / fin["J_devsim_A_cm2"] - 1)
        row["E_max_i_V_cm"] = fin["E_max_i_V_cm"]
        row["quasi_fermi_gradient_max_V_cm"] = {"n": fin["F_n_max_V_cm"], "p": fin["F_p_max_V_cm"]}
        row["caughey_thomas_min_factor"] = {"n": fin["caughey_thomas_min_factor_n"], "p": fin["caughey_thomas_min_factor_p"]}
        out_rows.append(row)
    return {"rows": out_rows, "levels": per_level}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("case", choices=["K10", "K12"])
    ap.add_argument("--pilot", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--out")
    a = ap.parse_args()
    cpath = ROOT / "cases" / f"{a.case}.yaml"
    case = G.load_case(cpath)
    levels = LEVELS[:3] if a.pilot else LEVELS
    biases = case["bias"]["values_V"]
    if a.pilot:
        biases = [biases[0], biases[-1]]
    out = Path(a.out) if a.out else ROOT / "reference" / f"s8-{a.case}.json"
    if a.dry_run:
        print(json.dumps({"case": str(cpath), "levels": levels, "biases": biases, "out": str(out)}, indent=1))
        return
    log = Logger(f"s8-{a.case}")
    t0 = time.time()
    res = run_k10(case, levels, biases, log) if a.case == "K10" else run_k12(case, levels, biases, log)
    doc = {
        "case": a.case,
        "case_file": f"validation/cases/{a.case}.yaml",
        "case_sha256": G.file_sha256(cpath),
        "date": time.strftime("%Y-%m-%d"),
        "lane": "T5 S8-REF (DevLog-040)",
        "tools": {"devsim": "DEVSIM 2.11.0 (Apache-2.0), own models via the DEVSIM model API",
                  "dd1d": "own numpy/scipy 1D drift-diffusion (eoref/dd1d.py)"},
        "models": {
            "n_i_cm3": S.NI, "T_K": S.T_K, "V_t_V": S.VT, "constants": "SI 2019 exact q, k_B; eps0 CODATA 2022",
            "mobility": S.MASETTI, "srh": "Shockley and Read 1952 eq. (4.4) p. 837, (5.4) p. 838; n1 = p1 = n_i",
            "statistics": "Boltzmann, complete ionisation, no bandgap narrowing, no Auger",
            "field_dependence": "none (Caughey-Thomas factor reported as a post-hoc check)",
        },
        "definitions": {
            "V_pn": "V(anode, p side) - V(cathode, n side)",
            "C": "q |d N_e,tot / dV|, N_e,tot = integral of n over the device, central difference dV = 2 mV; "
                 "U = U_mesh + U_dV, U_dV = |C(2 dV) - C(dV)|/3 (max relative over V = 0, -4 V at the finest grid)",
            "closed_form": "depletion approximation W = sqrt(2 eps (V_bi - V)/q (1/N_A + 1/N_D)), C = eps/W; "
                           "variant with V_bi - V - 2 V_t",
            "J": "total terminal current density (A/cm^2), positive from anode to cathode through the device",
            "contact_loss_fraction": "1 - q int U_SRH dx / J: share of J carried by minority-carrier recombination at the "
                                     "ideal ohmic contacts (infinite surface recombination) instead of bulk SRH",
            "contacts": "ideal ohmic contacts at both device ends (x = -1 um anode, x = +1 um cathode): charge-neutral "
                        "equilibrium n, p and psi = V + V_t ln(n_eq/n_i) pinned at the end node; K12: 0.5 um of p+ / n+ "
                        "between each contact and the i region; K10: 1 um of p / n",
            "mean_i": "trapezoid average (and sheet integral) over the central i region, 0.1 um away from both doping "
                      "steps (x in [-0.4, 0.4] um); centre = node at x = 0",
            "E_max_i": "max |E| on edges inside the central i region",
            "caughey_thomas_min_factor": "min over the central i region of mu(F)/mu0 = 1/(1 + (mu0 F/v_m)^beta)^(1/beta) with F the "
                                         "quasi-Fermi-level gradient (driving force); post-hoc only, not in the solve",
            "U": "round-2 rule (eoref.util.richardson, p_formal 2) on the three finest grids (h = cell size in nm)",
        },
        "levels_N_cells": levels,
        "pilot": a.pilot,
        **res,
        "versions": all_versions(),
        "seconds": time.time() - t0,
        "max_rss_MB": max_rss_mb(),
    }
    out.write_text(json.dumps(doc, indent=1, default=float, allow_nan=False) + "\n")
    log.info(f"wrote {out} ({doc['seconds']:.1f} s, max RSS {doc['max_rss_MB']:.0f} MB)")


if __name__ == "__main__":
    main()
