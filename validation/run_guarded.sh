#!/bin/sh
# run.sh plus an RSS watchdog: kills this lane's reference processes above RSS_LIMIT_KB (default 1.5 GB; logged as WATCHDOG).
cd "$(dirname "$0")" || exit 1
LIM=${RSS_LIMIT_KB:-1572864}
( while :; do
    ps -axo pid=,rss=,command= | grep "scripts/ref_" | grep -v grep | while read -r pid rss rest; do
      if [ "$rss" -gt "$LIM" ]; then echo "WATCHDOG kill $pid rss=${rss}KB"; kill "$pid"; fi
    done
    sleep 0.5
  done ) &
WD=$!
trap 'kill $WD 2>/dev/null' EXIT
trap 'kill $WD 2>/dev/null; exit 1' INT TERM
./run.sh "$@"
