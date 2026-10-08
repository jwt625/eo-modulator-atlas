"""Apply the verified long-note rewrites (DevLog-022 D1; long_notes_proposals.csv + long-notes verify audit).

60 proposals as written (overflow sentences appended to the row notes), 5 corrected texts from the verifier, and
chen2025-h with its value correction (wavelength 1568.5 -> 1569.4 nm, verifier's calibrated reading of Fig. 3(d),
N80 peak; coordinator pixel check consistent).

Usage: uv run python data/_staging/ingest_2026_10_07/apply_notes.py [--apply]
"""

import csv
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "data" / "_staging" / "conventions_2026_10_05"))
import evidence_edit as ee  # noqa: E402

APPLY = "--apply" in sys.argv
HERE = Path(__file__).resolve().parent
FIX = {  # row number -> (note, overflow or None to keep the proposal's overflow, "" for none)
    13: (
        "Hysteresis fit (SI Eq. 3), 45 deg; 300 K about 365. SiN design: Fig. 1f caption field/voltage implies 9.0 um "
        "gap; Fig. S3 is BaTiO3-SiN.",
        None,
    ),
    23: (
        "Data end near 110 GHz at about -2.6 dB (lowest about -2.8 dB), no crossing; bw3db_ghz 110 is the paper's "
        "claimed crossing at instrument limit.",
        "",
    ),
    31: (
        "G of T-segment CPW, metal-to-metal gap across waveguide (Fig. 1(e), consistent with li2026ba SEM); caption: "
        "T-segments on grounds only; opposite element may be signal edge.",
        "electrode_gap_um 6 is G of the T-segment CPW, the gap between facing T-bars where the waveguide sits, read "
        "from the Fig. 1(e) schematic.",
    ),
    51: (
        "Vpi between the two differential signal lines; arms in series on common n-layer; paper says "
        "'differential'/'push-pull drive', not 'series'; ogiso2024 (same CL-TWE) is series_push_pull.",
        "",
    ),
    63: (
        "Authors give no formula or scope (modulator vs driver); auditor check 4*(0.161 V)^2/50 ohm/(130 GBd*15.38 "
        "bit/symbol) = 1.04 fJ/bit fits four sub-MZM 50 ohm loads.",
        "Auditor check (not from the authors): the stated 1.04 fJ/bit is consistent with RF power of the four "
        "sub-MZMs into 50 ohm only (modulator load, DAC excluded).",
    ),
    10: (
        "N = 80 peak read from Fig. 3(d), about 0.5 nm uncertainty (apex partly hidden by N50); devices' gap not "
        "stated, assigned by N only.",
        "",
    ),
}
CHEN_OLD = (
    "Resonance about 1568.5 nm read from the N = 80 trace of Fig. 3(d) (about 0.7 nm reading uncertainty (peak "
    "partly hidden behind other traces);"
)
CHEN_NEW = (
    "Resonance about 1569.4 nm read from the N = 80 trace of Fig. 3(d) (about 0.5 nm reading uncertainty, apex "
    "partly hidden behind the N50 trace; corrected 2026-10-07 from 1568.5);"
)


def main() -> None:
    props = list(csv.DictReader(open(HERE / "long_notes_proposals.csv", newline="")))
    path = ROOT / "data" / "devices.csv"
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        header, rows = list(r.fieldnames or []), list(r)
    dev = {x["device_id"]: x for x in rows}
    n_notes = n_over = 0
    for i, p in enumerate(props, 1):
        pid, did, field = p["paper_id"], p["device_id"], p["field"]
        note, over = p["new_note"], p["overflow_to_row_notes"]
        if i in FIX:
            note, fo = FIX[i]
            over = over if fo is None else fo
        assert len(note.split()) <= 25, (i, did, len(note.split()))
        d = yaml.safe_load((ROOT / "data" / "evidence" / f"{pid}.yaml").read_text())
        hits = [e for e in d["entries"] if e["device_id"] == did and e["field"] == field]
        assert len(hits) == 1, (did, field, len(hits))
        new = dict(hits[0])
        new["note"] = note
        if did == "chen2025-h" and field == "wavelength_nm":
            assert new["value"] == 1568.5
            new["value"] = 1569.4
            row = dev[did]
            assert row["wavelength_nm"] == "1568.5" and CHEN_OLD in row["notes"]
            row["wavelength_nm"] = "1569.4"
            row["notes"] = row["notes"].replace(CHEN_OLD, CHEN_NEW)
        if APPLY:
            ee.set_entry(pid, new)
        n_notes += 1
        if over and over not in dev[did]["notes"]:
            dev[did]["notes"] = dev[did]["notes"].rstrip() + " " + over.strip()
            n_over += 1
    if APPLY:
        with path.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=header, lineterminator="\r\n")
            w.writeheader()
            w.writerows(rows)
    print(f"notes {n_notes}, overflow sentences appended {n_over}", "(applied)" if APPLY else "(dry run)")


if __name__ == "__main__":
    main()
