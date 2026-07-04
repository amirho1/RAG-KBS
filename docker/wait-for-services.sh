#!/bin/sh
set -eu

wait_for_service() {
  service_address="$1"
  service_host="${service_address%:*}"
  service_port="${service_address##*:}"
  timeout_seconds="${WAIT_TIMEOUT_SECONDS:-60}"
  started_at="$(date +%s)"

  if [ "$service_host" = "$service_port" ]; then
    echo "Invalid service address '${service_address}'. Expected host:port." >&2
    exit 1
  fi

  echo "Waiting for ${service_host}:${service_port}..."

  while true; do
    if CHECK_HOST="$service_host" CHECK_PORT="$service_port" node -e "const net = require('node:net'); const socket = net.createConnection({ host: process.env.CHECK_HOST, port: Number(process.env.CHECK_PORT), timeout: 1000 }, () => { socket.destroy(); process.exit(0); }); socket.on('error', () => process.exit(1)); socket.on('timeout', () => { socket.destroy(); process.exit(1); });"; then
      echo "${service_host}:${service_port} is ready."
      break
    fi

    current_time="$(date +%s)"
    elapsed_seconds=$((current_time - started_at))

    if [ "$elapsed_seconds" -ge "$timeout_seconds" ]; then
      echo "Timed out waiting for ${service_host}:${service_port} after ${timeout_seconds}s." >&2
      exit 1
    fi

    sleep 2
  done
}

if [ -n "${WAIT_FOR_HOSTS:-}" ]; then
  for service_address in $(echo "$WAIT_FOR_HOSTS" | tr "," " "); do
    wait_for_service "$service_address"
  done
fi

exec "$@"
