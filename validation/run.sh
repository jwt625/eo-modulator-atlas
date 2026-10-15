#!/bin/sh
# Resource-capped runner for the reference scripts (shared laptop): nice 10, single-threaded BLAS, max RSS reported.
# Usage: ./run.sh scripts/<script>.py ARGS...
cd "$(dirname "$0")" || exit 1
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1
exec /usr/bin/time -l nice -n 10 uv run python "$@"
