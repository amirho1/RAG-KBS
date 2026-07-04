#!/bin/sh
set -eu

rm -f "${WORKER_READY_FILE:-/tmp/rag-kbs-worker.ready}"

exec docker/wait-for-services.sh "$@"
