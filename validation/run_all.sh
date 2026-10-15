#!/bin/sh
# Serial full reference run (one CPU-heavy process at a time, capped threads, nice 10). Logs in ../logs/.
# A watchdog kills any of this lane's reference processes whose RSS exceeds 1800 MB (logged as WATCHDOG).
cd "$(dirname "$0")" || exit 1
(
  while :; do
    ps -axo pid=,rss=,command= | grep "scripts/ref_" | grep -v grep | while read -r pid rss rest; do
      if [ "$rss" -gt 1843200 ]; then echo "WATCHDOG kill $pid rss=${rss}KB $rest"; kill "$pid"; fi
    done
    sleep 2
  done
) &
WD=$!
trap 'kill $WD 2>/dev/null' EXIT
trap 'kill $WD 2>/dev/null; exit 1' INT TERM
for c in K1 K2 K3; do ./run.sh scripts/ref_modes_fem.py $c; done
for c in K1 K2 K3; do ./run.sh scripts/ref_modes_tidy3d.py $c; done
for c in K6a K6b; do ./run.sh scripts/ref_cpw.py $c; done
./run.sh scripts/ref_es_eo.py K4 --domain-study
for g in 3 4 5 6 8; do ./run.sh scripts/ref_es_eo.py K5-g$g; done
echo "run_all done"
