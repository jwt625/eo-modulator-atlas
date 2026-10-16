"""DEVSIM (Apache-2.0, https://devsim.org) drift-diffusion set-up for the S8 references (lane T5, DevLog-040).

Own physics models (constants of eoref.semi), written with the DEVSIM model API; reused from DEVSIM: the expression
parser with B() / dBdx(), the box-method assembly, Newton solver, and the `model_create` derivative helpers.
- Mesh: own tensor-product triangulation (each rectangle cell split along one diagonal; right triangles, so the box
  control volumes are the dual rectangles) passed to `create_gmsh_mesh` as coordinate/element lists. 1D uses edge
  elements. Regions: one `silicon` region (any union of cells) and optionally one `oxide` region; one continuous
  potential interface; ohmic contacts on boundary edges of silicon cells.
- Silicon: Potential, Electrons, Holes; Poisson with node charge q (p - n + NetDoping); SG electron/hole edge currents
  with the per-node Masetti mobility (node_solution values from eoref.semi, edge mean); SRH node recombination.
- Oxide: Poisson only. Outer boundaries: zero normal flux.
- Ohmic contacts: Potential = bias + V_t ln(n_eq/n_i), Electrons = n_eq, Holes = p_eq (node-wise charge-neutral values).
- Gauge: every contact bias carries a constant POT_OFFSET (10 V) so that no node potential is near 0 V (DEVSIM's
  per-equation relative update error is ill-defined there); only potential differences enter the results.
"""

from __future__ import annotations

import numpy as np

from . import semi as S

try:
    import devsim as ds
    from devsim.python_packages.model_create import (
        CreateContinuousInterfaceModel,
        CreateEdgeModel,
        CreateEdgeModelDerivatives,
        CreateNodeModel,
        CreateNodeModelDerivative,
        CreateSolution,
    )
except ImportError:  # pragma: no cover
    ds = None


POT_OFFSET = 10.0  # V


class quiet:
    """Redirect the C-level stdout (DEVSIM solver chatter) to /dev/null inside the block."""

    def __enter__(self):
        import os
        import sys

        sys.stdout.flush()
        self._saved = os.dup(1)
        self._null = os.open(os.devnull, os.O_WRONLY)
        os.dup2(self._null, 1)
        return self

    def __exit__(self, *exc):
        import os
        import sys

        sys.stdout.flush()
        os.dup2(self._saved, 1)
        os.close(self._saved)
        os.close(self._null)
        return False


def tensor_mesh_lists(xs, ys, cells_region, contacts, two_d=True):
    """Build DEVSIM python-mesh lists.

    xs, ys: grid lines (cm); cells_region(xc, yc) -> region name or None (no element); contacts: list of
    (name, region, x0, x1, y0, y1) boundary segments (cm). 1D: ys ignored, contacts are (name, region, x, x).
    Returns (coordinates, elements, physical_names, region_of_cell).
    """
    xs = np.asarray(xs, dtype=float)
    names: list[str] = []

    def pid(name):
        if name not in names:
            names.append(name)
        return names.index(name)

    coords: list[float] = []
    elements: list[int] = []
    if not two_d:
        for x in xs:
            coords += [float(x), 0.0, 0.0]
        regs = []
        for i in range(len(xs) - 1):
            r = cells_region(0.5 * (xs[i] + xs[i + 1]), 0.0)
            regs.append(r)
            elements += [1, pid(r), i, i + 1]
        for (cname, _reg, x0, _x1, *_rest) in contacts:
            k = int(np.argmin(np.abs(xs - x0)))
            elements += [0, pid(cname), k]
        return coords, elements, names, regs
    ys = np.asarray(ys, dtype=float)
    nx, ny = len(xs), len(ys)

    def nid(i, j):
        return j * nx + i

    for j in range(ny):
        for i in range(nx):
            coords += [float(xs[i]), float(ys[j]), 0.0]
    reg = np.empty((nx - 1, ny - 1), dtype=object)
    for i in range(nx - 1):
        xc = 0.5 * (xs[i] + xs[i + 1])
        for j in range(ny - 1):
            reg[i, j] = cells_region(xc, 0.5 * (ys[j] + ys[j + 1]))
    for i in range(nx - 1):
        for j in range(ny - 1):
            r = reg[i, j]
            if r is None:
                continue
            a, b, c, d = nid(i, j), nid(i + 1, j), nid(i + 1, j + 1), nid(i, j + 1)
            p = pid(r)
            elements += [2, p, a, b, c, 2, p, a, c, d]
    # interface edges between silicon and oxide cells
    for i in range(nx - 1):
        for j in range(ny - 1):
            r = reg[i, j]
            if r is None:
                continue
            if i + 1 < nx - 1 and reg[i + 1, j] is not None and reg[i + 1, j] != r:
                elements += [1, pid("si_ox"), nid(i + 1, j), nid(i + 1, j + 1)]
            if j + 1 < ny - 1 and reg[i, j + 1] is not None and reg[i, j + 1] != r:
                elements += [1, pid("si_ox"), nid(i, j + 1), nid(i + 1, j + 1)]
    tol = 1e-12
    for (cname, creg, x0, x1, y0, y1) in contacts:
        for i in range(nx - 1):
            for j in range(ny - 1):
                if reg[i, j] != creg:
                    continue
                for (p0, p1) in (((i, j), (i, j + 1)), ((i + 1, j), (i + 1, j + 1)), ((i, j), (i + 1, j)),
                                 ((i, j + 1), (i + 1, j + 1))):
                    xa, ya, xb, yb = xs[p0[0]], ys[p0[1]], xs[p1[0]], ys[p1[1]]
                    if (x0 - tol <= min(xa, xb) and max(xa, xb) <= x1 + tol and y0 - tol <= min(ya, yb)
                            and max(ya, yb) <= y1 + tol):
                        elements += [1, pid(cname), nid(*p0), nid(*p1)]
    return coords, elements, names, reg


class DevsimDevice:
    def __init__(self, name: str, coords, elements, names, contacts: list[str], has_oxide: bool, eps_si: float,
                 eps_ox: float, tau_n: float, tau_p: float, doping_fn, contact_regions=None):
        """doping_fn(x_cm, y_cm) -> (N_D, N_A) node values (control-volume averages computed by the caller)."""
        self.dev = name
        mesh = name + "_mesh"
        ds.create_gmsh_mesh(mesh=mesh, coordinates=coords, physical_names=names, elements=elements)
        ds.add_gmsh_region(gmsh_name="silicon", mesh=mesh, region="silicon", material="Silicon")
        if has_oxide:
            ds.add_gmsh_region(gmsh_name="oxide", mesh=mesh, region="oxide", material="Oxide")
            ds.add_gmsh_interface(gmsh_name="si_ox", mesh=mesh, name="si_ox", region0="silicon", region1="oxide")
        for c in contacts:
            ds.add_gmsh_contact(gmsh_name=c, mesh=mesh, name=c, region="silicon", material="metal")
        ds.finalize_mesh(mesh=mesh)
        ds.create_device(mesh=mesh, device=name)
        self.contacts = contacts
        self.has_oxide = has_oxide
        r = "silicon"
        for k, v in (("Permittivity", eps_si * S.EPS0_F_PER_CM), ("ElectronCharge", S.Q), ("n_i", S.NI),
                     ("V_t", S.VT), ("taun", tau_n), ("taup", tau_p)):
            ds.set_parameter(device=name, region=r, name=k, value=v)
        x = np.array(ds.get_node_model_values(device=name, region=r, name="x"))
        y = np.array(ds.get_node_model_values(device=name, region=r, name="y"))
        self.x, self.y = x, y
        nd, na = doping_fn(x, y)
        net = nd - na
        neq, peq = S.equilibrium_carriers(net)
        vals = {"NetDoping": net, "TotalDoping": nd + na, "MuN": S.mu_electron(nd + na), "MuP": S.mu_hole(nd + na),
                "Neq": neq, "Peq": peq, "PsiEq": S.VT * np.log(neq / S.NI)}
        for k, v in vals.items():
            ds.node_solution(device=name, region=r, name=k)
            ds.set_node_values(device=name, region=r, name=k, values=[float(t) for t in v])
            ds.edge_from_node_model(device=name, region=r, node_model=k)
        self.nodevals = vals
        for k in ("Potential", "Electrons", "Holes"):
            CreateSolution(name, r, k)
        ds.set_node_values(device=name, region=r, name="Potential", values=[float(t) + POT_OFFSET for t in vals["PsiEq"]])
        ds.set_node_values(device=name, region=r, name="Electrons", init_from="Neq")
        ds.set_node_values(device=name, region=r, name="Holes", init_from="Peq")
        self._silicon_equations(name, r)
        if has_oxide:
            ro = "oxide"
            ds.set_parameter(device=name, region=ro, name="Permittivity", value=eps_ox * S.EPS0_F_PER_CM)
            CreateSolution(name, ro, "Potential")
            xo = np.array(ds.get_node_model_values(device=name, region=ro, name="x"))
            ds.set_node_values(device=name, region=ro, name="Potential", values=[POT_OFFSET] * len(xo))
            ef = "(Potential@n0 - Potential@n1)*EdgeInverseLength"
            CreateEdgeModel(name, ro, "ElectricField", ef)
            CreateEdgeModelDerivatives(name, ro, "ElectricField", ef, "Potential")
            CreateEdgeModel(name, ro, "PotentialEdgeFlux", "Permittivity*ElectricField")
            CreateEdgeModelDerivatives(name, ro, "PotentialEdgeFlux", "Permittivity*ElectricField", "Potential")
            ds.equation(device=name, region=ro, name="PotentialEquation", variable_name="Potential",
                        edge_model="PotentialEdgeFlux", variable_update="default")
            m = CreateContinuousInterfaceModel(name, "si_ox", "Potential")
            ds.interface_equation(device=name, interface="si_ox", name="PotentialEquation", interface_model=m,
                                  type="continuous")
        for c in contacts:
            self._ohmic_contact(name, r, c)

    @staticmethod
    def _silicon_equations(dev, r):
        ef = "(Potential@n0 - Potential@n1)*EdgeInverseLength"
        CreateEdgeModel(dev, r, "ElectricField", ef)
        CreateEdgeModelDerivatives(dev, r, "ElectricField", ef, "Potential")
        CreateEdgeModel(dev, r, "PotentialEdgeFlux", "Permittivity*ElectricField")
        CreateEdgeModelDerivatives(dev, r, "PotentialEdgeFlux", "Permittivity*ElectricField", "Potential")
        pne = "-ElectronCharge*kahan3(Holes, -Electrons, NetDoping)"
        CreateNodeModel(dev, r, "PotentialNodeCharge", pne)
        CreateNodeModelDerivative(dev, r, "PotentialNodeCharge", pne, "Electrons")
        CreateNodeModelDerivative(dev, r, "PotentialNodeCharge", pne, "Holes")
        ds.equation(device=dev, region=r, name="PotentialEquation", variable_name="Potential",
                    node_model="PotentialNodeCharge", edge_model="PotentialEdgeFlux", variable_update="log_damp")
        # Scharfetter-Gummel (same expressions as DEVSIM simple_dd, with an edge-mean mobility)
        ds.edge_from_node_model(device=dev, region=r, node_model="Potential")
        ds.edge_from_node_model(device=dev, region=r, node_model="Electrons")
        ds.edge_from_node_model(device=dev, region=r, node_model="Holes")
        CreateEdgeModel(dev, r, "vdiff", "(Potential@n0 - Potential@n1)/V_t")
        CreateEdgeModel(dev, r, "vdiff:Potential@n0", "V_t^(-1)")
        CreateEdgeModel(dev, r, "vdiff:Potential@n1", "-vdiff:Potential@n0")
        CreateEdgeModel(dev, r, "Bern01", "B(vdiff)")
        CreateEdgeModel(dev, r, "Bern01:Potential@n0", "dBdx(vdiff) * vdiff:Potential@n0")
        CreateEdgeModel(dev, r, "Bern01:Potential@n1", "-Bern01:Potential@n0")
        CreateEdgeModel(dev, r, "MuNEdge", "0.5*(MuN@n0 + MuN@n1)")
        CreateEdgeModel(dev, r, "MuPEdge", "0.5*(MuP@n0 + MuP@n1)")
        Jn = ("ElectronCharge*MuNEdge*EdgeInverseLength*V_t*"
              "kahan3(Electrons@n1*Bern01, Electrons@n1*vdiff, -Electrons@n0*Bern01)")
        CreateEdgeModel(dev, r, "ElectronCurrent", Jn)
        for v in ("Electrons", "Potential", "Holes"):
            CreateEdgeModelDerivatives(dev, r, "ElectronCurrent", Jn, v)
        Jp = ("-ElectronCharge*MuPEdge*EdgeInverseLength*V_t*"
              "kahan3(Holes@n1*Bern01, -Holes@n0*Bern01, -Holes@n0*vdiff)")
        CreateEdgeModel(dev, r, "HoleCurrent", Jp)
        for v in ("Holes", "Potential", "Electrons"):
            CreateEdgeModelDerivatives(dev, r, "HoleCurrent", Jp, v)
        usrh = "(Electrons*Holes - n_i^2)/(taup*(Electrons + n_i) + taun*(Holes + n_i))"
        CreateNodeModel(dev, r, "USRH", usrh)
        for k, e in (("ElectronGeneration", "-ElectronCharge * USRH"), ("HoleGeneration", "+ElectronCharge * USRH")):
            CreateNodeModel(dev, r, k, e)
        for v in ("Electrons", "Holes"):
            CreateNodeModelDerivative(dev, r, "USRH", usrh, v)
            CreateNodeModelDerivative(dev, r, "ElectronGeneration", "-ElectronCharge * USRH", v)
            CreateNodeModelDerivative(dev, r, "HoleGeneration", "+ElectronCharge * USRH", v)
        CreateNodeModel(dev, r, "NCharge", "-ElectronCharge * Electrons")
        CreateNodeModelDerivative(dev, r, "NCharge", "-ElectronCharge * Electrons", "Electrons")
        CreateNodeModel(dev, r, "PCharge", "ElectronCharge * Holes")
        CreateNodeModelDerivative(dev, r, "PCharge", "ElectronCharge * Holes", "Holes")
        ds.equation(device=dev, region=r, name="ElectronContinuityEquation", variable_name="Electrons",
                    time_node_model="NCharge", edge_model="ElectronCurrent", variable_update="positive",
                    node_model="ElectronGeneration")
        ds.equation(device=dev, region=r, name="HoleContinuityEquation", variable_name="Holes",
                    time_node_model="PCharge", edge_model="HoleCurrent", variable_update="positive",
                    node_model="HoleGeneration")

    @staticmethod
    def _ohmic_contact(dev, r, c):
        bias = f"{c}_bias"
        ds.set_parameter(device=dev, name=bias, value=POT_OFFSET)
        for eqname, model, var in (("PotentialEquation", f"Potential - PsiEq - {bias}", "Potential"),
                                   ("ElectronContinuityEquation", "Electrons - Neq", "Electrons"),
                                   ("HoleContinuityEquation", "Holes - Peq", "Holes")):
            mname = f"{c}_{var}_bc"
            ds.contact_node_model(device=dev, contact=c, name=mname, equation=model)
            ds.contact_node_model(device=dev, contact=c, name=f"{mname}:{var}", equation="1")
            kw = {}
            if eqname == "PotentialEquation":
                ds.contact_edge_model(device=dev, contact=c, name="contactcharge_edge",
                                      equation="Permittivity*ElectricField")
                kw["edge_charge_model"] = "contactcharge_edge"
            elif eqname == "ElectronContinuityEquation":
                kw["edge_current_model"] = "ElectronCurrent"
            else:
                kw["edge_current_model"] = "HoleCurrent"
            ds.contact_equation(device=dev, contact=c, name=eqname, node_model=mname, **kw)

    rel = 1e-12  # per-equation relative update tolerance (2D runs set 1e-10: carrier floor ~1.6e-12, DevLog-040)

    def solve(self, rel=None, abs_=1e30, maxit=60):
        rel = self.rel if rel is None else rel
        return ds.solve(type="dc", absolute_error=abs_, relative_error=rel, maximum_iterations=maxit, info=True)

    def set_bias(self, contact: str, v: float):
        ds.set_parameter(device=self.dev, name=f"{contact}_bias", value=float(v) + POT_OFFSET)

    def get_bias(self, contact: str) -> float:
        return float(ds.get_parameter(device=self.dev, name=f"{contact}_bias")) - POT_OFFSET

    def ramp(self, contact: str, target: float, step: float = 0.05, min_step: float = 1e-4):
        v = self.get_bias(contact)
        h = step
        while abs(target - v) > 1e-15:
            nxt = v + np.sign(target - v) * min(h, abs(target - v))
            saved = {k: self.values(k) for k in ("Potential", "Electrons", "Holes")}
            saved_ox = self.values("Potential", "oxide") if self.has_oxide else None
            self.set_bias(contact, nxt)
            try:
                info = self.solve()
                ok = bool(info.get("converged", False)) if isinstance(info, dict) else True
            except ds.error:
                ok = False
            if not ok:
                for k, val in saved.items():
                    ds.set_node_values(device=self.dev, region="silicon", name=k, values=list(val))
                if saved_ox is not None:
                    ds.set_node_values(device=self.dev, region="oxide", name="Potential", values=list(saved_ox))
                self.set_bias(contact, v)
                h *= 0.5
                if h < min_step:
                    raise RuntimeError(f"ramp failed at {v} -> {nxt}")
                continue
            v = nxt
            h = min(step, 1.5 * h)

    def values(self, name: str, region: str = "silicon") -> np.ndarray:
        return np.array(ds.get_node_model_values(device=self.dev, region=region, name=name))

    def edge_values(self, name: str, region: str = "silicon") -> np.ndarray:
        return np.array(ds.get_edge_model_values(device=self.dev, region=region, name=name))

    def integral(self, name: str, xmax_abs: float | None = None) -> float:
        w = self.values("NodeVolume")
        if xmax_abs is not None:
            w = np.where(np.abs(self.x) <= xmax_abs, w, 0.0)
        return float(np.sum(self.values(name) * w))

    def contact_current(self, c: str) -> float:
        return float(ds.get_contact_current(device=self.dev, contact=c, equation="ElectronContinuityEquation")
                     + ds.get_contact_current(device=self.dev, contact=c, equation="HoleContinuityEquation"))

    def triangles(self, region: str = "silicon") -> np.ndarray:
        return np.array(ds.get_element_node_list(device=self.dev, region=region))
