#!/bin/sh
set -eu
source_file=${1:-}
if [ ! -f "$source_file" ]; then echo "Backup file not found" >&2; exit 2; fi
if [ "${CONFIRM_RESTORE:-}" != "peremoney" ]; then echo "Set CONFIRM_RESTORE=peremoney to authorize restore" >&2; exit 2; fi
docker compose exec -T postgres pg_restore -U peremoney -d peremoney --clean --if-exists --no-owner < "$source_file"
echo "Restore completed"
