#!/bin/sh
set -e

echo "[API] Aplicando migraciones de base de datos..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "[API] Iniciando servidor..."
exec node dist/main.js
