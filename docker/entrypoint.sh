#!/bin/sh
set -e

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-barbersaas}"
POSTGRES_DB="${POSTGRES_DB:-barbersaas}"

echo "[entrypoint] Aguardando PostgreSQL em ${POSTGRES_HOST}..."
until pg_isready -h "$POSTGRES_HOST" -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 2
done

echo "[entrypoint] Aplicando schema Prisma..."
npx prisma db push --schema=packages/database/prisma/schema.prisma --skip-generate

if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] Executando seed..."
  npx prisma db seed --schema=packages/database/prisma/schema.prisma
fi

echo "[entrypoint] Iniciando Next.js..."
if [ -f apps/web/server.js ]; then
  exec node apps/web/server.js
fi

exec node server.js
