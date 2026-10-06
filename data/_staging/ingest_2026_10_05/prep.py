"""Prepare the 2026-10-05 inbox ingestion (DevLog-021): extract the user's retrieved PDFs into references/,
preserve superseded arXiv caches, put supplements/corrections in subfolders, fetch Crossref for new DOIs.

Usage: uv run python data/_staging/ingest_2026_10_05/prep.py [--apply]
"""

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts"))
import extract_source as ex  # noqa: E402
import refresh_metadata as rm  # noqa: E402

APPLY = "--apply" in sys.argv
INBOX = ROOT / "references" / "_inbox"
REFS = ROOT / "references"
NEW = {  # paper_id -> DOI (verified on page 1 of each PDF)
    "mao2022": "10.1063/5.0109251", "chen2023": "10.1515/nanoph-2023-0306", "liu2021a": "10.3788/col202119.060016",
    "yang2022": "10.3788/col202220.022502", "xue2026": "10.1364/oe.588103", "chen2026": "10.1364/oe.595937",
    "murai2025": "10.1364/oe.568498", "horst2025": "10.1364/optica.544016", "pan2021": "10.1364/oe.416908",
    "singer2025": "10.1364/oe.551866", "xue2023": "10.1364/optica.482667", "hillier2025": "10.1364/oe.536930",
}
FIRST_SOURCE = {"boynton2020": "10.1364/oe.28.001868", "xu2022": "10.1364/optica.449691"}  # had metadata only
VOR_UPGRADE = {"han2023": "10.1126/sciadv.adi5339", "li2022b": "10.1364/oe.469065"}  # arXiv cache -> arxiv/
SUBFOLDER = {"han2023_supplement": ("han2023", "supplement"), "lu2020_supplement": ("lu2020", "supplement"),
             "lu2020_correction": ("lu2020", "correction")}


def extract(pid: str, pdf: Path, out: Path, doi: str, role: str) -> None:
    meta = {"paper_id": pid, "url": f"https://doi.org/{doi}" if doi else "", "doi": doi, "license": "",
            "local_origin": "user_manual_download_2026-10-05", "source_version": "version_of_record", "role": role}
    info = ex.extract(pdf, out, meta)
    print(f"{pid:12s} {role:22s} pages={info['pages']:3d} chars={info['text_chars']:6d} -> {out.relative_to(ROOT)}")


def main() -> None:
    for pid, doi in {**NEW, **FIRST_SOURCE, **VOR_UPGRADE}.items():
        pdf = INBOX / f"{pid}.pdf"
        assert pdf.exists(), pdf
        out = REFS / pid
        if pid in VOR_UPGRADE:
            old = out / "source.pdf"
            print(f"{pid}: preserve arXiv cache -> {pid}/arxiv/ ({'exists' if old.exists() else 'missing'})")
            if APPLY and old.exists() and not (out / "arxiv" / "source.pdf").exists():
                (out / "arxiv").mkdir(exist_ok=True)
                for name in ("source.pdf", "source.json", "text.md", "figures"):
                    if (out / name).exists():
                        shutil.move(str(out / name), str(out / "arxiv" / name))
        role = "primary" if pid in NEW or pid in FIRST_SOURCE else "primary (version of record; arXiv cache in arxiv/)"
        if APPLY:
            extract(pid, pdf, out, doi, role)
        else:
            print(f"would extract {pid} -> references/{pid}/")
    for name, (pid, sub) in SUBFOLDER.items():
        pdf = INBOX / f"{name}.pdf"
        assert pdf.exists(), pdf
        if APPLY:
            extract(pid, pdf, REFS / pid / sub, "", sub)
        else:
            print(f"would extract {name} -> references/{pid}/{sub}/")
    if APPLY:  # Crossref work records for the new DOIs (cached, 2 s spacing)
        for pid, doi in NEW.items():
            print(pid, "crossref", rm.crossref_by_doi(pid, doi, False))


if __name__ == "__main__":
    main()
