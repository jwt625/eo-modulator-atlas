#!/bin/sh
# Round 2 chain (DevLog-028): guarded, serial.
cd "$(dirname "$0")" || exit 1
for c in K6a K6b; do ./run_guarded.sh scripts/ref_cpw.py $c; done
./run_guarded.sh scripts/ref_es_eo.py K4 --domain-study
for g in 3 4 5 6 8; do ./run_guarded.sh scripts/ref_es_eo.py K5-g$g; done
echo "run_r2 done"
