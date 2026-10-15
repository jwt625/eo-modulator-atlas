"""Write the canonical case inputs K1-K6 (DevLog-023 O3) as eo-atlas.sim/v1 YAML in validation/cases/.

Deterministic. Every detail that DevLog-023 leaves open is fixed here and written into the YAML header.
Run: uv run python scripts/make_cases.py [--dry-run]
"""

from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eoref import materials as M  # noqa: E402

CASES = Path(__file__).resolve().parents[1] / "cases"
LAM_UM = 1.55

N_SIO2 = float(f"{float(M.n_of('sio2', LAM_UM)):.10g}")  # 10 significant digits (audit R4)
N_SI = float(f"{float(M.n_of('si', LAM_UM)):.10g}")  # 10 significant digits (audit R4)
N_LN_O = float(f"{float(M.n_of('ln_o', LAM_UM)):.10g}")  # 10 significant digits (audit R4)
N_LN_E = float(f"{float(M.n_of('ln_e', LAM_UM)):.10g}")  # 10 significant digits (audit R4)

# K2 rib (shared by K2-K5)
FILM = 0.6
ETCH = 0.3
SLAB = FILM - ETCH
TOP_W = 1.0
SIDEWALL_DEG = 60.0
BOT_HALF = round(TOP_W / 2 + ETCH / math.tan(math.radians(SIDEWALL_DEG)), 9)

# K4 RF case inputs (DevLog-023 O3; case inputs, not material claims)
LN_EPS = {"perp": 44.0, "par": 28.0}
LN_R = {"r13": 9.6, "r22": 6.8, "r33": 30.9, "r51": 32.6}
EPS_SIO2 = 3.9
EPS_SI = 11.7

COMMON_FRAME = [
    "Frame: x lateral, y film normal (up), z propagation. x-cut LN, propagation along crystal y:",
    "  lab x = crystal z (n_e, eps par), lab y = crystal x (n_o, eps perp), lab z = crystal y (n_o).",
    "Optical constants at 1550 nm from the Sellmeier fits in engine/data/materials.json: LN Zelmon 1997 congruent",
    f"  n_o = {N_LN_O}, n_e = {N_LN_E}; SiO2 Malitson 1965 n = {N_SIO2}; Si Salzberg/Tatian n = {N_SI}.",
    "  Material names match library keys, so the engine can take dispersion slopes from the library for ng.",
]


def rib_polygon(xc: float) -> list[list[float]]:
    return [
        [round(xc - BOT_HALF, 9), SLAB],
        [round(xc + BOT_HALF, 9), SLAB],
        [round(xc + TOP_W / 2, 9), FILM],
        [round(xc - TOP_W / 2, 9), FILM],
    ]


def ln_material(with_rf: bool) -> dict:
    m: dict = {"crystal": {"cut": "x", "propagation": "y"}, "n_o": N_LN_O, "n_e": N_LN_E}
    m["eps_r"] = dict(LN_EPS)
    if with_rf:
        m["r_pm_per_v"] = dict(LN_R)
    return m


def optics_block(eo: dict | None = None, metal: str | None = None) -> dict:
    o: dict = {
        "wavelength_nm": 1550,
        "polarization": "TE",
        "mode_index": 0,
        "group_index_from": "finite_difference_wavelength",
        "ng_fixed": None,
        "eo_axis": "auto",
    }
    if metal:
        o["metal_in_window"] = metal
    if eo:
        o["eo"] = eo
    return o


def dummy_electrodes(x0: float, x1: float, y0: float, y1: float) -> list[dict]:
    return [
        {"name": "dummy_signal", "role": "signal", "weight": 1.0, "material": "gold",
         "rect": {"x_um": [x0, x1], "y_um": [y0, y1]}},
        {"name": "dummy_ground", "role": "ground", "weight": 0.0, "material": "gold",
         "rect": {"x_um": [-x1, -x0], "y_um": [y0, y1]}},
    ]


def base(case_id: str, title: str) -> dict:
    return {
        "schema": "eo-atlas.sim/v1",
        "id": case_id,
        "title": title,
        "validation_status": "unvalidated",
    }


def k1() -> tuple[dict, list[str]]:
    c = base("K1", "Canonical K1: Si strip 500 x 220 nm in SiO2, 1550 nm, TE0")
    c["chain"] = ["electrostatics", "optical_mode"]
    c["optics"] = optics_block()
    c["materials"] = {
        "silicon": {"n": N_SI, "eps_r": EPS_SI},
        "silicon_dioxide": {"n": N_SIO2, "eps_r": EPS_SIO2},
        "gold": {"conductor": True},
    }
    c["geometry"] = {
        "symmetry": "none",
        "domain": {"x_um": [-4.0, 4.0], "y_um": [-3.0, 3.0]},
        "regions": [
            {"name": "cladding", "material": "silicon_dioxide", "rect": {"x_um": [-4.0, 4.0], "y_um": [-3.0, 3.0]}},
            {"name": "core", "material": "silicon", "rect": {"x_um": [-0.25, 0.25], "y_um": [-0.11, 0.11]}},
        ],
        "electrodes": dummy_electrodes(3.0, 3.8, 2.5, 2.8),
        "optical_window": {"x_um": [-2.0, 2.0], "y_um": [-2.0, 2.0]},
        "mesh": {"max_edge_um": 0.5, "window_edge_um": 0.02},
    }
    hdr = [
        "Canonical case K1 (DevLog-023 O3), written by validation/scripts/make_cases.py (lane L-REF, DevLog-028).",
        "Si strip 500 nm wide x 220 nm tall, centred on the origin, fully embedded in SiO2. TE0 (E_x dominant).",
        "Fixed details: SiO2 everywhere outside the core; optical window x,y in [-2, 2] um with zero tangential E",
        "  (PEC) on the window edge in the references; electrodes are dummy pads outside the window (schema needs",
        "  >= 1 electrode); electrostatic outputs of K1 are not reference quantities. RF eps values are placeholders.",
        "ng: central wavelength difference with Sellmeier dispersion in every material.",
        f"Optical constants at 1550 nm (engine/data/materials.json fits): Si Salzberg/Tatian n = {N_SI},",
        f"  SiO2 Malitson n = {N_SIO2}. Material names match library keys (dispersion slopes for ng).",
    ]
    return c, hdr


def k2(clad: bool) -> tuple[dict, list[str]]:
    cid = "K3" if clad else "K2"
    c = base(cid, f"Canonical {cid}: x-cut LN rib 600/300 nm, 1.0 um top, 60 deg, {'SiO2' if clad else 'air'} clad, TE0")
    c["chain"] = ["electrostatics", "optical_mode"]
    c["optics"] = optics_block()
    c["materials"] = {
        "lithium_niobate": ln_material(False),
        "silicon_dioxide": {"n": N_SIO2, "eps_r": EPS_SIO2},
        "air": {"n": 1.0, "eps_r": 1.0},
        "gold": {"conductor": True},
    }
    regions = [
        {"name": "ambient", "material": "air", "rect": {"x_um": [-7.0, 7.0], "y_um": [-4.0, 4.0]}},
        {"name": "box", "material": "silicon_dioxide", "rect": {"x_um": [-7.0, 7.0], "y_um": [-4.0, 0.0]}},
    ]
    if clad:
        regions.append({"name": "cladding", "material": "silicon_dioxide",
                        "rect": {"x_um": [-7.0, 7.0], "y_um": [0.0, 4.0]}})
    regions += [
        {"name": "ln_slab", "material": "lithium_niobate", "rect": {"x_um": [-7.0, 7.0], "y_um": [0.0, SLAB]}},
        {"name": "ln_rib", "material": "lithium_niobate", "polygon_um": rib_polygon(0.0)},
    ]
    c["geometry"] = {
        "symmetry": "none",
        "domain": {"x_um": [-7.0, 7.0], "y_um": [-4.0, 4.0]},
        "regions": regions,
        "electrodes": dummy_electrodes(5.5, 6.5, 3.5, 3.8),
        "optical_window": {"x_um": [-5.0, 5.0], "y_um": [-3.0, 3.0]},
        "mesh": {"max_edge_um": 0.5, "window_edge_um": 0.02},
    }
    hdr = [
        f"Canonical case {cid} (DevLog-023 O3), written by validation/scripts/make_cases.py (lane L-REF, DevLog-028).",
        "x-cut LN rib: film 600 nm (y 0..0.6 um), etch 300 nm (slab y 0..0.3 um), top width 1.0 um, sidewalls 60 deg",
        f"  from horizontal, so the rib base is {2 * BOT_HALF:.9f} um wide (half-width {BOT_HALF:.9f} um). Rib centred at x = 0.",
        "Fixed details: SiO2 below the film fills y < 0 to the window edge (semi-infinite BOX for the mode; no Si",
        "  substrate inside the window); " + ("SiO2 cladding fills everything above the film up to the window edge."
                                              if clad else "air above the film."),
        "  Slab extends across the whole domain. Optical window x in [-5, 5], y in [-3, 3] um, zero tangential E",
        "  (PEC) on its edge in the references. TE0 = E_x-dominant fundamental mode (n_e lateral).",
        "  Dummy electrodes outside the window (schema needs >= 1 electrode); ES outputs are not reference quantities.",
        *COMMON_FRAME,
    ]
    return c, hdr


def k4(gap: float, cid: str, d: float = 0.0) -> tuple[dict, list[str]]:
    sig_half = 10.0
    gnd_w = 100.0
    xa = sig_half + gap / 2.0 - d
    x_dom = 500.0
    y_top = 500.0
    box = 4.7
    sub = 500.0
    t_au = 0.8
    c = base(cid, f"Canonical {cid}: x-cut LN rib pair in G-S-G, Au 0.8 um on slab, gap {gap:g} um, push-pull"
             + (f", ribs offset {d:g} um toward the signal" if d else ""))
    c["chain"] = ["electrostatics", "optical_mode", "eo_overlap"]
    win_a = {"x_um": [round(xa - 5.0, 6), round(xa + 5.0, 6)], "y_um": [-3.0, 3.0]}
    win_b = {"x_um": [round(-xa - 5.0, 6), round(-xa + 5.0, 6)], "y_um": [-3.0, 3.0]}
    c["optics"] = optics_block(
        eo={"arm_drive": "two_arm_field_resolved", "terminal_drive": "single_ended",
            "arm_windows": {"A": win_a, "B": win_b}},
        metal="absent",
    )
    c["materials"] = {
        "lithium_niobate": ln_material(True),
        "silicon_dioxide": {"n": N_SIO2, "eps_r": EPS_SIO2},
        "silicon": {"n": N_SI, "eps_r": EPS_SI},
        "air": {"n": 1.0, "eps_r": 1.0},
        "gold": {"conductor": True},
    }
    c["geometry"] = {
        "symmetry": "none",
        "domain": {"x_um": [-x_dom, x_dom], "y_um": [-(box + sub), y_top]},
        "regions": [
            {"name": "ambient", "material": "air", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-(box + sub), y_top]}},
            {"name": "substrate", "material": "silicon", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-(box + sub), -box]}},
            {"name": "box", "material": "silicon_dioxide", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-box, 0.0]}},
            {"name": "ln_slab", "material": "lithium_niobate", "rect": {"x_um": [-x_dom, x_dom], "y_um": [0.0, SLAB]}},
            {"name": "ln_rib_a", "material": "lithium_niobate", "polygon_um": rib_polygon(xa)},
            {"name": "ln_rib_b", "material": "lithium_niobate", "polygon_um": rib_polygon(-xa)},
        ],
        "electrodes": [
            {"name": "signal", "role": "signal", "weight": 1.0, "material": "gold",
             "rect": {"x_um": [-sig_half, sig_half], "y_um": [SLAB, SLAB + t_au]}},
            {"name": "ground_r", "role": "ground", "weight": 0.0, "material": "gold",
             "rect": {"x_um": [sig_half + gap, sig_half + gap + gnd_w], "y_um": [SLAB, SLAB + t_au]}},
            {"name": "ground_l", "role": "ground", "weight": 0.0, "material": "gold",
             "rect": {"x_um": [-(sig_half + gap + gnd_w), -(sig_half + gap)], "y_um": [SLAB, SLAB + t_au]}},
        ],
        "optical_window": dict(win_a),
        "mesh": {"max_edge_um": 20.0, "electrode_edge_um": 0.05, "window_edge_um": 0.05},
    }
    c["line"] = {"length_mm": 10.0, "differential": False, "loading": {"type": "none"}}
    hdr = [
        f"Canonical case {cid} (DevLog-023 O3 K4/K5), written by validation/scripts/make_cases.py (lane L-REF, DevLog-028).",
        "Two K2 ribs (film 600 nm, etch 300 nm, top 1.0 um, 60 deg) in a G-S-G line, one rib centred in each gap."
        if not d else f"Two K2 ribs in a G-S-G line, each moved D = {d:g} um from its gap centre toward the signal (K7 family).",
        f"Electrodes: Au, 0.8 um thick, sitting on the LN slab top (y {SLAB}..{SLAB + t_au} um); signal 20 um wide centred",
        f"  at x = 0; gap {gap:g} um (edge to edge); grounds 100 um wide. Rib A (right gap) centred at x = +{xa:g} um,",
        f"  rib B (left gap) at x = -{xa:g} um. Push-pull by geometry: single-ended drive, signal 1 V, grounds 0 V.",
        f"Stack: LN slab {SLAB} um everywhere, SiO2 BOX {box} um, Si substrate {sub:g} um (bottom at y = {-(box + sub):g} um),",
        f"  air above to y = {y_top:g} um. Domain x in [-{x_dom:g}, {x_dom:g}] um. Outer boundaries: engine default",
        "  (zero normal flux, Neumann) on all four sides; no backside metal.",
        "RF permittivity (case inputs, DevLog-023 O3): LN eps perp/par = 44/28 (lab xx = par = 28, yy = zz = 44),",
        f"  SiO2 {EPS_SIO2}, Si {EPS_SI} (lossless dielectric, no conduction), air 1. Au is a perfect conductor.",
        "Pockels (case inputs): r33 30.9, r13 9.6, r22 6.8, r51 32.6 pm/V, 3m point group, crystal z = c axis.",
        "Optical model of each arm: window of 10 x 6 um centred on the rib, metal_in_window: absent (electrodes",
        "  removed from the optical problem, replaced by the underlying air); Si substrate is outside the window, so",
        "  each arm mode equals the K2 mode. References use the full-vector mode and the full Pockels tensor.",
        "VpiL convention: V_t = full terminal difference (signal minus ground), VpiL = lambda / (2 |dn_A - dn_B|),",
        "  dn per volt of V_t (engine eo-overlap/v2 convention, SPEC). line.length_mm = 10 only sets Vpi = VpiL / L.",
        *COMMON_FRAME,
    ]
    return c, hdr


def k6(variant: str) -> tuple[dict, list[str]]:
    s, w, t = 20.0, 5.0, 0.1
    x_dom = 500.0
    eps = 11.7
    h = 10.0
    cid = f"K6{variant}"
    if variant == "a":
        title = "Canonical K6a: CPW S 20 / W 5 um on a dielectric half-space eps_r 11.7"
        diel = {"name": "substrate", "material": "dielectric", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-x_dom, 0.0]}}
    else:
        title = "Canonical K6b: CPW S 20 / W 5 um on a 10 um dielectric layer eps_r 11.7, air below"
        diel = {"name": "substrate", "material": "dielectric", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-h, 0.0]}}
    c = base(cid, title)
    c["chain"] = ["electrostatics"]
    c["materials"] = {
        "dielectric": {"eps_r": eps},
        "air": {"eps_r": 1.0},
        "gold": {"conductor": True},
    }
    c["geometry"] = {
        "symmetry": "none",
        "domain": {"x_um": [-x_dom, x_dom], "y_um": [-x_dom, x_dom]},
        "regions": [
            {"name": "ambient", "material": "air", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-x_dom, x_dom]}},
            diel,
        ],
        "electrodes": [
            {"name": "signal", "role": "signal", "weight": 1.0, "material": "gold",
             "rect": {"x_um": [-s / 2, s / 2], "y_um": [0.0, t]}},
            {"name": "ground_r", "role": "ground", "weight": 0.0, "material": "gold",
             "rect": {"x_um": [s / 2 + w, x_dom], "y_um": [0.0, t]}},
            {"name": "ground_l", "role": "ground", "weight": 0.0, "material": "gold",
             "rect": {"x_um": [-x_dom, -(s / 2 + w)], "y_um": [0.0, t]}},
        ],
        "mesh": {"max_edge_um": 20.0, "electrode_edge_um": 0.02},
    }
    hdr = [
        f"Canonical case {cid} (DevLog-023 O3 K6), written by validation/scripts/make_cases.py (lane L-REF, DevLog-028).",
        f"Coplanar waveguide: signal S = {s:g} um, slots W = {w:g} um (k = S/(S+2W) = {s / (s + 2 * w):.6f}), grounds run to",
        f"  the domain edge x = +-{x_dom:g} um (semi-infinite grounds of the conformal map, truncated by the domain).",
        f"  Dielectric eps_r = {eps} (isotropic case input), air eps_r = 1. "
        + ("Dielectric fills y < 0 (half-space)." if variant == "a"
           else f"Dielectric layer y in [-{h:g}, 0] um, air below and above."),
        f"Electrode thickness in this file: t = {t} um (the engine format needs an area). The conformal-map reference",
        "  is for t = 0; validation/reference also gives scikit-fem values at t = 0 (embedded lines) and at t = 0.1 um",
        "  in this exact domain, so the engine compares like with like.",
        "Domain x, y in [-500, 500] um; outer boundaries zero normal flux (engine default). Signal 1 V, grounds 0 V.",
    ]
    return c, hdr


class _NoAlias(yaml.SafeDumper):
    def ignore_aliases(self, data: object) -> bool:
        return True


def dump(case: dict, header: list[str], path: Path, dry: bool) -> None:
    text = "\n".join("# " + h if h else "#" for h in header) + "\n"
    text += yaml.dump(case, Dumper=_NoAlias, sort_keys=False, default_flow_style=None, width=120)
    if dry:
        print(f"[dry-run] would write {path} ({len(text)} bytes)")
        return
    path.write_text(text)
    print(f"wrote {path}")


def k7(D: float) -> tuple[dict, list[str]]:
    """arabjuneghani2022 device #2 cross-section with the ribs at offset D from the gap centre toward the signal."""
    film, etch, rib_w = 0.5, 0.2, 0.8
    slab = film - etch
    box, sub, x_dom, y_top = 2.0, 500.0, 500.0, 500.0
    tc, tb, tg = 0.8, 0.2, 1.0
    gap, wc, wg = 10.0, 22.0, 40.0
    sh = wc / 2
    xa = sh + gap / 2 - D
    y_e0, y_e1 = slab + tb, slab + tb + tg
    clad_top = slab + tc
    cid = f"K7-D{D:g}"
    c = base(cid, f"Canonical {cid}: arabjuneghani2022 #2 cross-section, ribs D = {D:g} um from the gap centre toward the signal")
    c["chain"] = ["electrostatics", "optical_mode", "eo_overlap"]

    def rib(xc):
        return [[round(xc - rib_w / 2, 9), slab], [round(xc + rib_w / 2, 9), slab],
                [round(xc + rib_w / 2, 9), film], [round(xc - rib_w / 2, 9), film]]

    win_a = {"x_um": [round(xa - 4.0, 6), round(xa + 4.0, 6)], "y_um": [-1.9, 2.5]}
    win_b = {"x_um": [round(-xa - 4.0, 6), round(-xa + 4.0, 6)], "y_um": [-1.9, 2.5]}
    c["optics"] = optics_block(
        eo={"arm_drive": "two_arm_field_resolved", "terminal_drive": "single_ended", "arm_windows": {"A": win_a, "B": win_b}},
        metal="absent")
    c["materials"] = {
        "lithium_niobate": {"crystal": {"cut": "x", "propagation": "y"}, "n_o": N_LN_O, "n_e": N_LN_E,
                            "eps_r": {"perp": 44.0, "par": 27.9},
                            "r_pm_per_v": {"r13": 8.6, "r22": 3.4, "r33": 30.8, "r51": 28.0}},
        "silicon_dioxide": {"n": N_SIO2, "eps_r": EPS_SIO2},
        "silicon": {"n": N_SI, "eps_r": EPS_SI},
        "air": {"n": 1.0, "eps_r": 1.0},
        "gold": {"conductor": True},
    }
    c["geometry"] = {
        "symmetry": "none",
        "domain": {"x_um": [-x_dom, x_dom], "y_um": [-(box + sub), y_top]},
        "regions": [
            {"name": "ambient", "material": "air", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-(box + sub), y_top]}},
            {"name": "substrate", "material": "silicon", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-(box + sub), -box]}},
            {"name": "box", "material": "silicon_dioxide", "rect": {"x_um": [-x_dom, x_dom], "y_um": [-box, 0.0]}},
            {"name": "cladding", "material": "silicon_dioxide", "rect": {"x_um": [-x_dom, x_dom], "y_um": [slab, clad_top]}},
            {"name": "ln_slab", "material": "lithium_niobate", "rect": {"x_um": [-x_dom, x_dom], "y_um": [0.0, slab]}},
            {"name": "ln_rib_a", "material": "lithium_niobate", "polygon_um": rib(xa)},
            {"name": "ln_rib_b", "material": "lithium_niobate", "polygon_um": rib(-xa)},
        ],
        "electrodes": [
            {"name": "signal", "role": "signal", "weight": 1.0, "material": "gold",
             "rect": {"x_um": [-sh, sh], "y_um": [y_e0, y_e1]}},
            {"name": "ground_r", "role": "ground", "weight": 0.0, "material": "gold",
             "rect": {"x_um": [sh + gap, sh + gap + wg], "y_um": [y_e0, y_e1]}},
            {"name": "ground_l", "role": "ground", "weight": 0.0, "material": "gold",
             "rect": {"x_um": [-(sh + gap + wg), -(sh + gap)], "y_um": [y_e0, y_e1]}},
        ],
        "optical_window": dict(win_a),
        "mesh": {"max_edge_um": 20.0, "electrode_edge_um": 0.05, "window_edge_um": 0.05},
    }
    c["line"] = {"length_mm": 5.0, "differential": False, "loading": {"type": "none"}}
    hdr = [
        f"Canonical case {cid} (K7 family, DevLog-028 round 3; DevLog-029 waveguide-position question), written by",
        "validation/scripts/make_cases.py (lane L-REF). Source: references/arabjuneghani2022 (Sec. 2 p.2, Table 1, Fig. 1(a),",
        "Fig. 3(c)) and sims/arabjuneghani2022/config.yaml (device #2).",
        f"LN film {film} um x-cut, etch {etch} um (slab y 0..{slab:g}), rib {rib_w} um wide, vertical walls (angle not stated;",
        "  width taken as the top width as in the config). Rib A centred at x = +" + f"{xa:g}, rib B at -{xa:g} um:",
        f"  D = {D:g} um from the gap centre toward the signal (paper text p.2: D is the distance between the waveguide centre",
        "  and the gap centre; Fig. 3(c) caption wording differs, text definition used as in the config).",
        f"Electrodes Au, Tg {tg:g} um, bottom at slab top + Tb {tb:g} um (y {y_e0:g}..{y_e1:g}); signal Wc {wc:g} um centred at",
        f"  x = 0, gap G {gap:g} um, grounds Wg {wg:g} um. SiO2 cladding flat from the slab top to y = {clad_top:g} um (Tc {tc:g} um",
        "  from the slab top, config reading of Fig. 1(a)); the buffer is the cladding under the electrodes; air above.",
        f"BOX {box:g} um (NOT stated in the paper; config placeholder), Si substrate {sub:g} um, air to y = {y_top:g} um,",
        f"  domain x +-{x_dom:g} um, zero-flux outer boundary (K4 conventions; the config truncates differently).",
        "RF permittivity and Pockels values: engine library lithium_niobate_congruent as used by the config (eps perp/par",
        "  44 / 27.9 clamped, Zhu 2021 Table 1; r13 8.6, r22 3.4, r33 30.8, r51 28.0 pm/V clamped, Veithen Table I),",
        f"  SiO2 {EPS_SIO2}, Si {EPS_SI}; lab xx = par for x-cut. Gold perfect conductor, metal absent in the optical problem.",
        "Optical window per arm x +-4 um around the rib, y -1.9..2.5 um (inside the BOX: substrate leakage neglected).",
        "VpiL convention as K4: V_t = signal minus ground, VpiL = lambda / (2 |dn_A - dn_B|). line.length_mm = 5 (paper).",
        *COMMON_FRAME,
    ]
    return c, hdr


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    CASES.mkdir(exist_ok=True)
    out = [("K1", k1()), ("K2", k2(False)), ("K3", k2(True)), ("K4", k4(5.0, "K4"))]
    for g in (3.0, 4.0, 5.0, 6.0, 8.0):
        out.append((f"K5-g{g:g}", k4(g, f"K5-g{g:g}")))
    out += [("K6a", k6("a")), ("K6b", k6("b"))]
    for D in (0.0, 1.0, 2.6, 3.6):
        out.append((f"K7-D{D:g}", k7(D)))
    for d in (0.0, 0.9, 1.8):
        out.append((f"K7K4-D{d:g}", k4(5.0, f"K7K4-D{d:g}", d)))
    for name, (c, h) in out:
        dump(c, h, CASES / f"{name}.yaml", a.dry_run)


if __name__ == "__main__":
    main()
