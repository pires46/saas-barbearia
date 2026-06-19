#!/bin/bash
# Cron jobs para VPS — configure no crontab:
# */15 * * * * /path/to/saas-barbearia/scripts/cron-vps.sh

set -e
cd "$(dirname "$0")/.."

CRON_SECRET="${CRON_SECRET:-change-me}"
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

curl -sf -X POST "$APP_URL/api/cron/whatsapp" -H "Authorization: Bearer $CRON_SECRET" || true
curl -sf -X POST "$APP_URL/api/cron/billing" -H "Authorization: Bearer $CRON_SECRET" || true

echo "[cron] $(date -Iseconds) ok"
