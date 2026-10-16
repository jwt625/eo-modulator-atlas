#!/bin/sh
# EO overlap references (DevLog-033): serial, guarded at 1.4 GB, nice 10, single-threaded BLAS.
# Set TMPDIR to a scratch directory before running (arm-mode npz files are written there and removed).
cd "$(dirname "$0")" || exit 1
export RSS_LIMIT_KB=1468006
for c in K4 K7-D0; do ./run_guarded.sh scripts/ref_eo_overlap.py $c --optical-check; done
for c in K5-g3 K5-g4 K5-g5 K5-g6 K5-g8 K7-D1 K7-D2.6 K7-D3.6 K7K4-D0 K7K4-D0.9 K7K4-D1.8; do
  ./run_guarded.sh scripts/ref_eo_overlap.py $c
done
./run.sh scripts/ref_eo_overlap.py --summarize
echo "run_eo done"
