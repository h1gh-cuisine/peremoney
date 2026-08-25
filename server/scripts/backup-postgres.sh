#!/bin/sh
set -eu
target=${1:-}
if [ -z "$target" ]; then echo "Usage: $0 /absolute/path/backup.dump" >&2; exit 2; fi
case "$target" in /*) ;; *) echo "Backup path must be absolute" >&2; exit 2;; esac
if [ -e "$target" ]; then echo "Refusing to overwrite: $target" >&2; exit 2; fi
mkdir -p "$(dirname "$target")"
docker compose exec -T postgres pg_dump -U peremoney -d peremoney -Fc > "$target"
test -s "$target"
echo "Backup created: $target"
