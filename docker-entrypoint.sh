#!/bin/sh
# =====================================================
# IPStream Panel — entrypoint del contenedor
# =====================================================
# Espera a que la DB esté lista, sincroniza el schema, crea
# el usuario admin si no existe y arranca Next.js.

set -e

echo "=========================================="
echo " IPStream Panel — starting container"
echo "=========================================="

# --- 1. Esperar a que MySQL acepte conexiones ---
echo "[entrypoint] Esperando a MySQL en ${DB_HOST:-db}:${DB_PORT:-3306}..."
node -e "
const net = require('net');
const host = process.env.DB_HOST || 'db';
const port = parseInt(process.env.DB_PORT || '3306', 10);
const start = Date.now();
const timeout = 60000;

function attempt() {
  const socket = new net.Socket();
  socket.setTimeout(2000);
  socket.on('connect', () => { socket.destroy(); console.log('[entrypoint] MySQL OK'); process.exit(0); });
  socket.on('timeout', () => { socket.destroy(); retry(); });
  socket.on('error', () => { retry(); });
  socket.connect(port, host);
}
function retry() {
  if (Date.now() - start > timeout) { console.error('[entrypoint] MySQL timeout'); process.exit(1); }
  setTimeout(attempt, 1500);
}
attempt();
"

# --- 2. Generar cliente Prisma por si la imagen no lo trae ---
echo "[entrypoint] Generando cliente Prisma..."
npx prisma generate >/dev/null 2>&1 || true

# --- 3. Sincronizar schema (db push) ---
echo "[entrypoint] Sincronizando schema con la base de datos..."
npx prisma db push --skip-generate --accept-data-loss

# --- 4. Crear admin si no existe ---
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD" ]; then
  echo "[entrypoint] Asegurando admin $ADMIN_EMAIL..."
  ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" ADMIN_NAME="${ADMIN_NAME:-Administrador}" \
    node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    (async () => {
      const prisma = new PrismaClient();
      try {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;
        const name = process.env.ADMIN_NAME || 'Administrador';
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) { console.log('[entrypoint] Admin ya existe, OK'); return; }
        const hashed = await bcrypt.hash(password, 12);
        await prisma.user.create({ data: { email, password: hashed, name, role: 'ADMIN' } });
        console.log('[entrypoint] Admin creado:', email);
      } catch (e) { console.error('[entrypoint] Error creando admin:', e.message); }
      finally { await prisma.\$disconnect(); }
    })();
    "
else
  echo "[entrypoint] ADMIN_EMAIL/ADMIN_PASSWORD no definidos, no se crea admin."
fi

# --- 5. Asegurar directorio de uploads (lo gestiona el volumen) ---
echo "[entrypoint] Asegurando /app/public/uploads..."
mkdir -p /app/public/uploads

echo "=========================================="
echo " Arrancando Next.js en puerto ${PORT:-3000}"
echo "=========================================="

exec "$@"
