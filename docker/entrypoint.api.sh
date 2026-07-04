#!/bin/sh
set -eu

exec docker/wait-for-services.sh "$@"
