#!/bin/sh
# S8 references (DevLog-040): serial, guarded at 1.4 GiB, nice 10, single-threaded BLAS.
# Set TMPDIR to a scratch directory before running (per-level JSON/npz files are written there and removed).
cd "$(dirname "$0")" || exit 1
export RSS_LIMIT_KB=1468006
./run_guarded.sh scripts/ref_s8_1d.py K10 || exit 1
./run_guarded.sh scripts/ref_s8_1d.py K12 || exit 1
./run_guarded.sh scripts/ref_s8_k11.py || exit 1
./run.sh scripts/summarize_s8.py || exit 1
echo "run_s8 done"
