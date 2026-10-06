"""Validate data/papers.csv, data/devices.csv, data/organizations.csv and data/evidence/*.yaml against the schema.

Integrity rule: every non-empty evidence-required value in devices.csv must have a matching evidence entry
(device_id, field, same value, locator, basis) or a `derived` entry with a formula. Empty cell means not reported.

Usage: uv run python scripts/validate_db.py [--data data] [--staging DIR]
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import math
import re
import sys
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent
ORG_COLUMNS = ["org_name", "org_type", "country", "region", "parent_org", "notes", "ror_id", "name_source"]
ORG_TYPES = {
    "university",
    "company",
    "national_lab",
    "research_institute",
    "foundry",
    "facility",
    "consortium",
    "other",
}
REGIONS = {"north_america", "europe", "east_asia", "south_asia", "southeast_asia", "oceania", "middle_east", "other"}


# Convention (l): ITU-T G.Sup39 telecom bands, ISO 20473 regions outside them; lower edge inclusive (nm).
BAND_EDGES_NM = [
    ("uv", 0.0, 380.0),
    ("visible", 380.0, 780.0),
    ("nir_below_o", 780.0, 1260.0),
    ("o_band", 1260.0, 1360.0),
    ("e_band", 1360.0, 1460.0),
    ("s_band", 1460.0, 1530.0),
    ("c_band", 1530.0, 1565.0),
    ("l_band", 1565.0, 1625.0),
    ("u_band", 1625.0, 1675.0),
    ("nir_above_u", 1675.0, 3000.0),
    ("mid_ir", 3000.0, 50000.0),
]
# V3: headline group -> row basis column; V5 and the 2026-10-05 columns: field set -> companion required.
BASIS_GROUPS = [
    (["vpi_dc_v", "vpi_rf_v", "vpil_dc_vcm", "vpil_rf_vcm"], "vpi_basis"),
    (["bw3db_ghz", "bw6db_ghz"], "bw_basis"),
    (["il_onchip_db", "il_fiber_to_fiber_db"], "il_basis"),
]
REQUIRED_WITH = [
    ("extinction_ratio_db", "er_type"),
    ("vpi_dc_v", "vpi_convention"),
    ("vpi_rf_v", "vpi_convention"),
    ("vpil_dc_vcm", "vpi_convention"),
    ("vpil_rf_vcm", "vpi_convention"),
    ("il_onchip_db", "il_onchip_scope"),
    ("bw3db_ghz", "bw_method"),
    ("bw6db_ghz", "bw_method"),
    ("eo_rolloff_db", "bw_method"),
]
DISCOVERED_VIA = {"drive_doc", "tmp_eo_md", "local_corpus", "ofc2026", "landmark", "web_search", "author_group_followup", "assigned"}


WARNINGS: list[str] = []


def band_for_wavelength(nm: float) -> str:
    for name, lo, hi in BAND_EDGES_NM:
        if lo <= nm < hi:
            return name
    return "other"


def load_schema(path: Path) -> dict[str, Any]:
    with path.open() as f:
        data: dict[str, Any] = yaml.safe_load(f)
    return data


def read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open(newline="") as f:
        reader = csv.DictReader(f)
        header = list(reader.fieldnames or [])
        rows = [dict(r) for r in reader]
    return header, rows


def split_list(cell: str) -> list[str]:
    return [p.strip() for p in cell.split(";") if p.strip()]


def check_cell(col: dict[str, Any], cell: str, enums: dict[str, list[str]]) -> str | None:
    """Return an error string for a malformed non-empty cell, else None."""
    if cell == "":
        return None
    t = col["type"]
    if t == "float":
        try:
            v = float(cell)
        except ValueError:
            return f"not a float: {cell!r}"
        if not math.isfinite(v):
            return f"non-finite: {cell!r}"
    elif t == "int":
        try:
            int(cell)
        except ValueError:
            return f"not an int: {cell!r}"
    elif t == "enum":
        if cell not in enums[col["enum"]]:
            return f"{cell!r} not in enum {col['enum']}"
    elif t == "date":
        try:
            dt.date.fromisoformat(cell)
        except ValueError:
            return f"not an ISO date: {cell!r}"
    return None


def values_match(csv_value: str, ev_value: Any) -> bool:
    try:
        a = float(csv_value)
        b = float(ev_value)
    except (TypeError, ValueError):
        return str(ev_value).strip() == csv_value.strip()
    return math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-12)


def validate_table(
    name: str, columns: list[dict[str, Any]], header: list[str], rows: list[dict[str, str]], enums: dict[str, list[str]]
) -> list[str]:
    errs: list[str] = []
    expected = [c["name"] for c in columns]
    if header != expected:
        missing = [c for c in expected if c not in header]
        extra = [c for c in header if c not in expected]
        errs.append(f"{name}: header mismatch; missing={missing} extra={extra}; order must follow the schema")
        return errs
    for i, row in enumerate(rows, start=2):
        for col in columns:
            cell = row[col["name"]].strip()
            if col.get("required") and cell == "":
                errs.append(f"{name}:{i} {col['name']} is required")
            msg = check_cell(col, cell, enums)
            if msg:
                errs.append(f"{name}:{i} {col['name']}: {msg}")
    return errs


def validate_orgs(path: Path) -> tuple[set[str], list[str]]:
    errs: list[str] = []
    names: set[str] = set()
    if not path.exists():
        return names, [f"{path.name}: missing"]
    header, rows = read_csv(path)
    if header != ORG_COLUMNS:
        return names, [f"{path.name}: header must be {ORG_COLUMNS}, got {header}"]
    for i, r in enumerate(rows, start=2):
        n = r["org_name"].strip()
        if not n:
            errs.append(f"organizations.csv:{i} org_name empty")
        if n in names:
            errs.append(f"organizations.csv:{i} duplicate org_name {n!r}")
        names.add(n)
        if r["org_type"] not in ORG_TYPES:
            errs.append(f"organizations.csv:{i} org_type {r['org_type']!r} not in {sorted(ORG_TYPES)}")
        if len(r["country"]) != 2 or not r["country"].isupper():
            errs.append(f"organizations.csv:{i} country must be ISO alpha-2 uppercase, got {r['country']!r}")
        if r["region"] not in REGIONS:
            errs.append(f"organizations.csv:{i} region {r['region']!r} not in {sorted(REGIONS)}")
    for i, r in enumerate(rows, start=2):
        if r["parent_org"].strip() and r["parent_org"].strip() not in names:
            errs.append(f"organizations.csv:{i} parent_org {r['parent_org']!r} has no organizations.csv row")
    return names, errs


def validate_evidence(
    data: Path, devices: list[dict[str, str]], dev_cols: list[dict[str, Any]], enums: dict[str, list[str]]
) -> list[str]:
    errs: list[str] = []
    ev_cols = {c["name"] for c in dev_cols if c.get("evidence")}
    all_cols = {c["name"] for c in dev_cols}
    by_paper: dict[str, list[dict[str, str]]] = {}
    for d in devices:
        by_paper.setdefault(d["paper_id"], []).append(d)
    for paper_id, devs in by_paper.items():
        ev_path = data / "evidence" / f"{paper_id}.yaml"
        if not ev_path.exists():
            errs.append(f"evidence: {ev_path.relative_to(data.parent)} missing for paper {paper_id}")
            continue
        with ev_path.open() as f:
            ev = yaml.safe_load(f) or {}
        if ev.get("paper_id") != paper_id:
            errs.append(f"{ev_path.name}: paper_id field must be {paper_id!r}")
        entries = {(e.get("device_id"), e.get("field")): e for e in ev.get("entries") or []}
        derived = {(e.get("device_id"), e.get("field")): e for e in ev.get("derived") or []}
        valid_devices = {d["device_id"] for d in devs}
        dev_cells = {d["device_id"]: d for d in devs}
        for key, e in entries.items():
            dv = dev_cells.get(str(key[0]))
            if dv is not None and key[1] in dv and key[1] not in ev_cols and dv[key[1]].strip() != "":
                if not values_match(dv[key[1]].strip(), e.get("value")):
                    errs.append(f"{ev_path.name}: {key} value {e.get('value')!r} != CSV {dv[key[1]]!r} (non-evidence column)")
            if key[0] not in valid_devices:
                errs.append(f"{ev_path.name}: entry for unknown device_id {key[0]!r}")
            if key[1] not in all_cols:
                errs.append(f"{ev_path.name}: entry for unknown field {key[1]!r}")
            if not str(e.get("locator", "")).strip():
                errs.append(f"{ev_path.name}: {key} missing locator")
            if e.get("basis") not in enums["basis"]:
                errs.append(f"{ev_path.name}: {key} basis {e.get('basis')!r} invalid")
        for key, e in derived.items():
            if not str(e.get("formula", "")).strip():
                errs.append(f"{ev_path.name}: derived {key} missing formula")
        cv = ev.get("context_values")
        if cv is not None and not (
            isinstance(cv, list) and all(isinstance(c, dict) and {"item", "locator"} <= set(c) and len(c) > 2 for c in cv)
        ):
            errs.append(f"{ev_path.name}: context_values must be a list of {{item, locator, value or named values, ...}} (V7)")
        dev_by_id = {d["device_id"]: d for d in devs}
        for key in derived:
            dv = dev_by_id.get(str(key[0]))
            if dv is not None and key[1] in dv and not dv[key[1]].strip():
                WARNINGS.append(f"{ev_path.name}: derived {key} has no CSV value (move to context_values if intentional)")
        for e in ev.get("entries") or []:
            if len(str(e.get("note", "")).split()) > 25:
                WARNINGS.append(f"{ev_path.name}: note on {(e.get('device_id'), e.get('field'))} exceeds 25 words")
        for d in devs:
            for field in ev_cols:
                cell = d[field].strip()
                if cell == "":
                    continue
                key = (d["device_id"], field)
                if key in entries:
                    if not values_match(cell, entries[key].get("value")):
                        errs.append(f"{ev_path.name}: {key} value {entries[key].get('value')!r} != CSV {cell!r}")
                elif key in derived:
                    if not values_match(cell, derived[key].get("value")):
                        errs.append(f"{ev_path.name}: derived {key} value != CSV {cell!r}")
                else:
                    errs.append(f"{d['device_id']}.{field}={cell!r} has no evidence entry")
    return errs


AFFIL_COLS = ["paper_id", "author_index", "author", "aff_order", "kind", "org_name", "unit", "locality", "country", "source", "locator", "note"]
SITE_COLS = ["org_name", "locality", "country", "lat", "lon", "precision", "source", "source_ref", "source_label", "verified_on", "notes"]
AFFIL_KINDS = {"primary", "additional", "present_address"}
AFFIL_SOURCES = {"paper", "crossref"}
SITE_PRECISION = {"building", "campus", "postcode", "city", "unresolved"}
SITE_SOURCES = {"wikidata", "nominatim", ""}


def validate_geo(data: Path, papers: list[dict[str, str]], org_names: set[str]) -> list[str]:
    """Optional tables: author_affiliations.csv (author x printed affiliation) and org_sites.csv (coordinates)."""
    errs: list[str] = []
    sites: set[tuple[str, str]] = set()
    s_path = data / "org_sites.csv"
    if s_path.exists():
        header, rows = read_csv(s_path)
        if header != SITE_COLS:
            return [f"org_sites.csv header mismatch: {header}"]
        for i, r in enumerate(rows, start=2):
            k = (r["org_name"], r["locality"])
            if k in sites:
                errs.append(f"org_sites.csv:{i} duplicate site {k}")
            sites.add(k)
            if r["org_name"] not in org_names:
                errs.append(f"org_sites.csv:{i} org_name {r['org_name']!r} not in organizations.csv")
            if len(r["country"]) != 2 or not r["country"].isupper():
                errs.append(f"org_sites.csv:{i} country must be ISO alpha-2 uppercase")
            if r["precision"] == "unresolved":
                if r["lat"] or r["lon"]:
                    errs.append(f"org_sites.csv:{i} unresolved site must have empty lat/lon")
                continue
            try:
                lat, lon = float(r["lat"]), float(r["lon"])
                if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    errs.append(f"org_sites.csv:{i} lat/lon out of range")
            except ValueError:
                errs.append(f"org_sites.csv:{i} {k} lat/lon must be numbers")
            if r["precision"] not in SITE_PRECISION:
                errs.append(f"org_sites.csv:{i} precision {r['precision']!r} not in {sorted(SITE_PRECISION)}")
            if r["source"] not in SITE_SOURCES:
                errs.append(f"org_sites.csv:{i} source {r['source']!r} not in {sorted(SITE_SOURCES)}")
    a_path = data / "author_affiliations.csv"
    if a_path.exists():
        header, rows = read_csv(a_path)
        if header != AFFIL_COLS:
            return errs + [f"author_affiliations.csv header mismatch: {header}"]
        authors = {p["paper_id"]: [a.strip() for a in p["authors"].split(";") if a.strip()] for p in papers}
        seen: set[tuple[str, str, str]] = set()
        for i, r in enumerate(rows, start=2):
            pid = r["paper_id"]
            if pid not in authors:
                errs.append(f"author_affiliations.csv:{i} unknown paper_id {pid}")
                continue
            try:
                idx, order = int(r["author_index"]), int(r["aff_order"])
            except ValueError:
                errs.append(f"author_affiliations.csv:{i} author_index and aff_order must be integers")
                continue
            if not (1 <= idx <= len(authors[pid])) or authors[pid][idx - 1] != r["author"]:
                errs.append(f"author_affiliations.csv:{i} {pid} author {idx} {r['author']!r} does not match papers.csv")
            k = (pid, r["author_index"], r["aff_order"])
            if k in seen or order < 1:
                errs.append(f"author_affiliations.csv:{i} duplicate or invalid {k}")
            seen.add(k)
            if r["kind"] not in AFFIL_KINDS:
                errs.append(f"author_affiliations.csv:{i} kind {r['kind']!r} not in {sorted(AFFIL_KINDS)}")
            if r["source"] not in AFFIL_SOURCES:
                errs.append(f"author_affiliations.csv:{i} source {r['source']!r} not in {sorted(AFFIL_SOURCES)}")
            if r["org_name"] not in org_names:
                errs.append(f"author_affiliations.csv:{i} org_name {r['org_name']!r} not in organizations.csv")
            if len(r["country"]) != 2 or not r["country"].isupper():
                errs.append(f"author_affiliations.csv:{i} country must be ISO alpha-2 uppercase")
            if s_path.exists() and (r["org_name"], r["locality"]) not in sites:
                errs.append(f"author_affiliations.csv:{i} no org_sites.csv row for {(r['org_name'], r['locality'])}")
    return errs


def validate_people(data: Path, papers: list[dict[str, str]]) -> list[str]:
    """Optional tables from scripts/build_people.py: people.csv and paper_authors.csv (one row per author slot)."""
    pa_path, pe_path = data / "paper_authors.csv", data / "people.csv"
    if not pa_path.exists():
        return []
    errs: list[str] = []
    _, people = read_csv(pe_path) if pe_path.exists() else ([], [])
    ids = {r["person_id"] for r in people}
    if len(ids) != len(people):
        errs.append("people.csv: duplicate person_id")
    _, pa = read_csv(pa_path)
    slots = {(r["paper_id"], int(r["author_index"])): r for r in pa}
    for p in papers:
        names = split_list(p["authors"])
        for i, n in enumerate(names, 1):
            r = slots.pop((p["paper_id"], i), None)
            if r is None or r["author"] != n:
                errs.append(f"paper_authors.csv: {p['paper_id']} author {i} {n!r} missing or different (run build_people.py)")
            elif r["person_id"] not in ids:
                errs.append(f"paper_authors.csv: {p['paper_id']} author {i} person_id {r['person_id']!r} not in people.csv")
    for k in slots:
        errs.append(f"paper_authors.csv: extra slot {k}")
    return errs


def validate(data: Path) -> list[str]:
    WARNINGS.clear()
    schema = load_schema(data / "schema" / "devices.schema.yaml")
    enums: dict[str, list[str]] = schema["enums"]
    errs: list[str] = []
    org_names, org_errs = validate_orgs(data / "organizations.csv")
    errs += org_errs

    p_path, d_path = data / "papers.csv", data / "devices.csv"
    if not p_path.exists() or not d_path.exists():
        return errs + ["papers.csv and devices.csv must exist"]
    p_header, papers = read_csv(p_path)
    d_header, devices = read_csv(d_path)
    errs += validate_table("papers.csv", schema["papers_columns"], p_header, papers, enums)
    errs += validate_table("devices.csv", schema["devices_columns"], d_header, devices, enums)
    if errs and any("header mismatch" in e for e in errs):
        return errs

    paper_ids: set[str] = set()
    for i, p in enumerate(papers, start=2):
        pid = p["paper_id"]
        if pid in paper_ids:
            errs.append(f"papers.csv:{i} duplicate paper_id {pid}")
        paper_ids.add(pid)
        if not (p["doi"] or p["arxiv_id"] or p["url"]):
            errs.append(f"papers.csv:{i} {pid} needs doi, arxiv_id or url")
        for col in ("universities", "companies", "foundry_or_fab"):
            for org in split_list(p[col]):
                if org not in org_names:
                    errs.append(f"papers.csv:{i} {pid} {col}: {org!r} not in organizations.csv")
        for c in split_list(p["countries"]):
            if len(c) != 2 or not c.isupper():
                errs.append(f"papers.csv:{i} {pid} countries: {c!r} must be ISO alpha-2 uppercase")
        if p["sim_config"] and not (ROOT / p["sim_config"]).exists():
            errs.append(f"papers.csv:{i} {pid} sim_config {p['sim_config']} does not exist")
        if "tweet" in p["url"] or "x.com" in p["url"] or "twitter.com" in p["url"]:
            errs.append(f"papers.csv:{i} {pid} url must be a primary source, not a tweet")
        doi, aid = p["doi"].strip(), p["arxiv_id"].strip()
        if doi.lower().startswith("10.48550/"):
            errs.append(f"papers.csv:{i} {pid} doi must be a version-of-record DOI, not an arXiv DataCite DOI (convention n)")
        want = f"https://doi.org/{doi}" if doi else (f"https://arxiv.org/abs/{aid}" if aid else p["url"])
        if p["url"] != want:
            errs.append(f"papers.csv:{i} {pid} url must be {want!r} (convention n), got {p['url']!r}")
        if aid and re.search(r"v\d+$", aid):
            errs.append(f"papers.csv:{i} {pid} arxiv_id must be unversioned (convention n), got {aid!r}")
        for tok in split_list(p["discovered_via"]):
            if tok not in DISCOVERED_VIA and not tok.startswith("blog:"):
                errs.append(f"papers.csv:{i} {pid} discovered_via token {tok!r} not in the vocabulary")

    dev_ids: set[str] = set()
    for i, d in enumerate(devices, start=2):
        did = d["device_id"]
        if did in dev_ids:
            errs.append(f"devices.csv:{i} duplicate device_id {did}")
        dev_ids.add(did)
        if d["paper_id"] not in paper_ids:
            errs.append(f"devices.csv:{i} {did} unknown paper_id {d['paper_id']}")
        if not did.startswith(d["paper_id"] + "-"):
            errs.append(f"devices.csv:{i} device_id must start with '<paper_id>-'")
        for q in split_list(d["qualifiers"]):
            fld, _, op = q.partition(":")
            if fld not in d or op not in enums["qualifier_ops"]:
                errs.append(f"devices.csv:{i} {did} bad qualifier {q!r} (field:op with op in lt|gt|approx)")
            elif d[fld].strip() == "":
                errs.append(f"devices.csv:{i} {did} qualifier on empty field {fld!r}")
        ops: dict[str, set[str]] = {}
        for q in split_list(d["qualifiers"]):
            fld, _, op = q.partition(":")
            ops.setdefault(fld, set()).add(op)
        for fld, o in ops.items():
            if len(o) > 1:
                errs.append(f"devices.csv:{i} {did} two qualifier ops on {fld}: {sorted(o)}")
        for group, basis_col in BASIS_GROUPS:
            if any(d[f].strip() for f in group) and not d[basis_col].strip():
                errs.append(f"devices.csv:{i} {did} {basis_col} required when {group[0]} (or its group) is set")
        for field, need in REQUIRED_WITH:
            if d[field].strip() and not d[need].strip():
                errs.append(f"devices.csv:{i} {did} {need} required when {field} is set")
        if d["wavelength_nm"].strip():
            want_band = band_for_wavelength(float(d["wavelength_nm"]))
            ok = d["band"] == want_band or (d["band"] == "cl_band" and want_band in ("c_band", "l_band"))
            if not ok:
                errs.append(f"devices.csv:{i} {did} band {d['band']!r} != {want_band!r} for {d['wavelength_nm']} nm (convention l)")
        if d["evidence_ref"] != f"data/evidence/{d['paper_id']}.yaml":
            errs.append(f"devices.csv:{i} {did} evidence_ref must be data/evidence/{d['paper_id']}.yaml")
    errs += validate_evidence(data, devices, schema["devices_columns"], enums)
    errs += validate_geo(data, papers, org_names)
    errs += validate_people(data, papers)
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(ROOT / "data"))
    args = ap.parse_args()
    errs = validate(Path(args.data))
    for w in WARNINGS:
        print("WARNING", w)
    for e in errs:
        print("ERROR", e)
    print(f"{len(errs)} error(s), {len(WARNINGS)} warning(s)")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
