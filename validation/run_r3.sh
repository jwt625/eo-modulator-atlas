#!/bin/sh
# Round 3 chain (DevLog-028): K7 off-centre waveguide families, guarded at 1.4 GB, serial.
cd "$(dirname "$0")" || exit 1
export RSS_LIMIT_KB=1468006
for c in K7-D0 K7-D1 K7-D2.6 K7-D3.6 K7K4-D0 K7K4-D0.9 K7K4-D1.8; do
  ./run_guarded.sh scripts/ref_es_eo.py $c --scales 2.8284271247461903,2.0,1.4142135623730951 --skip-optical-check
done
echo "run_r3 done"
