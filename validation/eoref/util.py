"""Logging, versions, Richardson extrapolation."""

from __future__ import annotations

import importlib.metadata as md
import platform
import time
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[2]
LOGS = REPO / "logs"


class Logger:
    def __init__(self, case: str):
        LOGS.mkdir(exist_ok=True)
        self.path = LOGS / f"ref-{case}-{time.strftime('%Y%m%dT%H%M')}.log"
        self.fh = self.path.open("a")
        self.info(f"log {self.path.name}")

    def info(self, msg: str) -> None:
        line = f"{time.strftime('%Y-%m-%dT%H:%M:%S')} {msg}"
        print(line, flush=True)
        self.fh.write(line + "\n")
        self.fh.flush()


def max_rss_mb() -> float:
    import resource
    import sys

    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return r / 1e6 if sys.platform == "darwin" else r / 1e3


def versions() -> dict[str, str]:
    out = {"python": platform.python_version()}
    for p in ("numpy", "scipy", "scikit-fem", "femwell", "gmsh", "shapely", "tidy3d", "pyyaml", "pyamg"):
        try:
            out[p] = md.version(p)
        except md.PackageNotFoundError:
            out[p] = "absent"
    return out


def richardson(h: list[float], f: list[float], p_formal: float) -> dict:
    """Extrapolate f(h) -> h = 0 from the three finest levels (rule of DevLog-028 round 2, audit R2).

    Observed order p_obs from the three finest levels. Accepted only when the three levels are monotone and
    0.5 p_formal <= p_obs <= 1.5 p_formal: f_ext with p_obs, U = 1.25 |f_ext - f_finest|.
    Otherwise f_ext with p_formal and U = max(3 |f_ext - f_finest|, largest difference among the three finest).
    The finest-level value is always reported as `f_finest`.
    """
    h = list(map(float, h))
    f = list(map(float, f))
    i = np.argsort(h)[::-1]
    h = [h[k] for k in i]
    f = [f[k] for k in i]
    out: dict = {"h": h, "f": f, "f_finest": f[-1], "p_formal": p_formal}
    if len(f) < 2:
        out.update(f_ext=f[-1], U=float("nan"), p=None, method="single_level")
        return out
    d1 = f[-2] - f[-1]
    r2 = h[-2] / h[-1]
    if len(f) >= 3:
        d0 = f[-3] - f[-2]
        r = np.sqrt((h[-3] / h[-2]) * r2)
        monotone = d0 != 0 and d1 != 0 and np.sign(d0) == np.sign(d1) and abs(d1) < abs(d0)
        p_obs = float(np.log(abs(d0 / d1)) / np.log(r)) if (d0 != 0 and d1 != 0) else None
        out["p_observed"] = p_obs
        if monotone and p_obs is not None and 0.5 * p_formal <= p_obs <= 1.5 * p_formal:
            fe = f[-1] - d1 / (r2**p_obs - 1)
            out.update(f_ext=float(fe), U=float(1.25 * abs(fe - f[-1])), p=p_obs, method="observed_order_gci1.25")
            return out
        spread = max(abs(d0), abs(d1))
    else:
        spread = abs(d1)
    fe = f[-1] - d1 / (r2**p_formal - 1)
    out.update(f_ext=float(fe), U=float(max(3 * abs(fe - f[-1]), spread)), p=p_formal,
               method="formal_order_safety3")
    return out


def run_isolated(script: str, args: list[str], tag: str) -> dict:
    """Run one resolution level in a fresh Python process (bounds peak memory: native solver workspaces are not
    returned to the OS between solves) and return the JSON it writes."""
    import json
    import os
    import subprocess
    import sys
    import tempfile

    fd, out = tempfile.mkstemp(prefix=f"eoref-{tag}-", suffix=".json")
    os.close(fd)
    try:
        subprocess.run([sys.executable, script, *args, "--out", out], check=True)
        return json.loads(Path(out).read_text())
    finally:
        Path(out).unlink(missing_ok=True)
