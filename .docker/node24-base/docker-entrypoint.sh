#!/usr/bin/env bash
set -euo pipefail

[[ ${DOCKER_DEBUG:-} == "true" ]] && set -x

case "${1:-}" in
  bash|sh|/bin/bash|/bin/sh)
    exec "$@"
    ;;
esac

CONFIG_DIR="/docker-entrypoint.d"

if [[ -d "${CONFIG_DIR}" ]]; then
  while IFS= read -r f; do
    echo "[Entrypoint] running $f"
    # shellcheck disable=SC1090
    . "$f"
  done < <(find "${CONFIG_DIR}" -name '*.sh' -type f | sort -u)
fi

echo
echo '[Entrypoint] Init process done. Ready for the start-up.'
echo

if [[ $# -eq 0 ]]; then
  echo "[Entrypoint] ERROR: no command provided"
  exit 1
fi

exec "$@"
