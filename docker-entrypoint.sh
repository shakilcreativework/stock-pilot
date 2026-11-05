#!/bin/sh
set -e

echo "🚀 [StockPilot] Running database migrations..."
npx prisma migrate deploy

echo "🌱 [StockPilot] Ensuring deterministic seed data..."
npx tsx ./prisma/seed.ts || true

echo "✨ [StockPilot] Launching standalone server on port ${PORT:-3000}..."
exec "$@"

