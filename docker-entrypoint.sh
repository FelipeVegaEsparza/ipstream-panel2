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
npx prisma db push --skip-generate || echo "[entrypoint] WARNING: prisma db push falló, continuando con migraciones manuales..."

# --- 4. Migraciones manuales (tablas que el agente necesita, se crean si no existen) ---
echo "[entrypoint] Ejecutando migraciones manuales..."
node << 'SQL_EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS jingles (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        clientId VARCHAR(191) NOT NULL,
        radioStreamId VARCHAR(191) NOT NULL,
        title VARCHAR(191) NOT NULL,
        artist VARCHAR(191),
        duration DOUBLE NOT NULL,
        fileName VARCHAR(191) NOT NULL,
        filePath VARCHAR(191) NOT NULL,
        fileSize INT NOT NULL,
        coverUrl VARCHAR(191),
        mimeType VARCHAR(191) NOT NULL DEFAULT 'audio/mpeg',
        uploadedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX idx_jingles_client (clientId),
        INDEX idx_jingles_radio (radioStreamId)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[entrypoint] Tabla jingles OK');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS playlist_schedules (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        clientId VARCHAR(191) NOT NULL,
        radioStreamId VARCHAR(191) NOT NULL,
        playlistId VARCHAR(191) NOT NULL,
        dayOfWeek INT NOT NULL,
        startTime VARCHAR(191) NOT NULL,
        endTime VARCHAR(191) NOT NULL,
        isActive BOOLEAN NOT NULL DEFAULT true,
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt DATETIME(3) NOT NULL,
        INDEX idx_schedule_client_day (clientId, dayOfWeek, isActive),
        INDEX idx_schedule_radio_day (radioStreamId, dayOfWeek, isActive)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[entrypoint] Tabla playlist_schedules OK');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS streaming_audit_logs (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        clientId VARCHAR(191) NOT NULL,
        action VARCHAR(191) NOT NULL,
        payload JSON,
        ipAddress VARCHAR(45),
        userAgent VARCHAR(500),
        createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX idx_audit_client_date (clientId, createdAt),
        INDEX idx_audit_action (action)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
      console.log('[entrypoint] Tabla streaming_audit_logs OK');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS stream_stats (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        clientId VARCHAR(191) NOT NULL,
        radioStreamId VARCHAR(191) NOT NULL,
        listenerCount INT NOT NULL,
        listenerPeak INT NOT NULL,
        currentTitle VARCHAR(191),
        currentArtist VARCHAR(191),
        timestamp DATETIME(3) NOT NULL,
        INDEX idx_stats_client_date (clientId, timestamp),
        INDEX idx_stats_radio_date (radioStreamId, timestamp)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
    console.log('[entrypoint] Tabla stream_stats OK');

    // Asegurar columnas de jingles en radio_streams (si prisma db push no lo hizo)
    // MySQL 8.0 no soporta ADD COLUMN IF NOT EXISTS: verificamos en information_schema
    const ensureColumn = async (column, definition) => {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'radio_streams' AND COLUMN_NAME = ?`,
        column
      );
      if (Number(rows[0].n) === 0) {
        await prisma.$executeRawUnsafe(`ALTER TABLE radio_streams ADD COLUMN ${column} ${definition}`);
      }
    };
    try {
      await ensureColumn('jinglePlayEvery', 'INT NOT NULL DEFAULT 5');
      await ensureColumn('jinglePlayCount', 'INT NOT NULL DEFAULT 1');
      console.log('[entrypoint] Columnas jingle en radio_streams OK');
    } catch (e2) {
      console.log('[entrypoint] Error asegurando columnas jingle en radio_streams:', e2.message);
    }
  } catch (e) {
    console.error('[entrypoint] Error en migraciones manuales:', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
SQL_EOF

# --- 5. Crear admin si no existe ---
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

# --- 6. Asegurar directorio de uploads (lo gestiona el volumen) ---
echo "[entrypoint] Asegurando /app/public/uploads..."
mkdir -p /app/public/uploads

echo "=========================================="
echo " Arrancando Next.js en puerto ${PORT:-3000}"
echo "=========================================="

exec "$@"
