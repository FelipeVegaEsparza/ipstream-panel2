# IPStream Panel — Deploy Guide

> **Único documento para deployar a producción.** Si algo falla, vení acá primero.

## TL;DR (lo que el bot de deploy hace automáticamente)

```bash
git push origin main
# GitHub Actions build + push + deploy en el VPS
# Workflow: .github/workflows/deploy.yml
```

Si todo va bien, el workflow termina con ✓. Si algo falla, **no te asustes** — esta guía te ayuda a recuperarte.

---

## Pre-requisitos del VPS (solo la primera vez)

```bash
ssh usuario@vps

# 1. Clonar el repo
git clone https://github.com/FelipeVegaEsparza/ipstream-panel2.git /opt/ipstream-panel
cd /opt/ipstream-panel

# 2. Crear .env desde el ejemplo
cp .env.example .env

# 3. Generar todos los secrets seguros automáticamente
bash scripts/setup-prod.sh --force
# → crea tokens con openssl rand, actualiza .env, deja backup

# 4. Editar .env para completar variables no-seguras
nano .env
# Editá:
#   STREAM_DOMAIN=panelipstream.cl
#   ADMIN_EMAIL=tu@email.com
#   ADMIN_PASSWORD=...
#   (y otras que setup-prod no genera)

# 5. (Solo la primera vez) Generar migración inicial de Prisma
# Si la DB ya existe, saltá este paso.
# Si es nueva:
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d db
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml exec app npx prisma db push

# 6. Levantar todos los servicios
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
```

---

## Variables de entorno importantes

| Variable | Qué es | Default seguro |
|---|---|---|
| `NEXTAUTH_SECRET` | JWT para NextAuth | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | AES-256-GCM (64 chars hex) | `openssl rand -hex 32` |
| `STREAMING_AGENT_TOKEN` | Auth panel ↔ agente | `openssl rand -hex 32` |
| `HARBOR_CALLBACK_SECRET` | Auth liquidsoap ↔ agente (DJ en vivo) | `openssl rand -hex 32` |
| `ICE_*_PASSWORD` | Auth Icecast | `openssl rand -hex 32` |
| `CRON_SECRET` | Auth de cron jobs | `openssl rand -hex 32` |
| `STREAM_DOMAIN` | Dominio público (ej: panelipstream.cl) | manual |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Usuario admin inicial | manual |

`scripts/setup-prod.sh --force` regenera automáticamente las primeras6.

---

## Después de cambiar `ENCRYPTION_KEY`

Si por algún motivo regenerás `ENCRYPTION_KEY`, los passwords en la DB quedan ilegibles para el agente. Rotar:

```bash
docker exec -i ipstream-app node - < scripts/rotate-stream-passwords.js
docker restart ipstream-streaming-agent
```

---

## Diagnóstico rápido

```bash
# Estado de los contenedores
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps

# Logs del panel
docker logs ipstream-app --tail 50 -f

# Logs del agente
docker logs ipstream-streaming-agent --tail 50 -f

# Health checks
curl -s http://localhost:3000/api/health
curl -s http://localhost:4000/health

# ¿Icecast ve el stream?
curl -s http://localhost:8000/status-json.xsl | jq '.icestats.source'

# Probar endpoint del agente con auth
TOKEN=$(grep '^STREAMING_AGENT_TOKEN=' .env | cut -d= -f2)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:4000/api/streams/TU_CLIENT_ID/status | jq .
```

---

## Televisión — puertos RTMP (OBS)

Caddy **no proxya RTMP** (no es HTTP). Para que OBS pueda conectarse hay que abrir puertos TCP directos al host:

| Puerto(s) | Servicio | Uso |
|---|---|---|
| `1935` | SRS | Ingesta directa del DJ: `rtmp://<host>:1935/dj/<stream_key>` y AutoDJ `.../live/<stream_key>` |
| `1936–2235` (rango relay) | video-encoder | "Conexión Universal" (OBS enhanced RTMP): un puerto por cliente |

Verificar desde fuera del VPS:

```bash
nc -zv <host> 1935
nc -zv <host> 1936
```

En el VPS (ufw):

```bash
sudo ufw allow 1935/tcp
sudo ufw allow 1936:2235/tcp
```

Notas:
- El rango relay es configurable con `RTMP_RELAY_PORT_RANGE_START` / `RTMP_RELAY_PORT_RANGE_END`. Si tenés pocos clientes, acotalo (ej. `1936–1995`) para reducir superficie.
- La URL HLS del espectador cambia según el estado: `/live/<stream_key>.m3u8` con AutoDJ y `/dj/<stream_key>.m3u8` con DJ en vivo. Caddy proxya ambos.

---

## Errores comunes y solución

### ❌ "Stream no inicia" / "File is not readable" (Liquidsoap)

Permisos del directorio de logs o del script `.liq`:

```bash
# Desde el host (los UIDs del contenedor no existen en el host, pero
# world-writable funciona):
chmod -R u+rwX,g+rwX,o+rwX /opt/ipstream-panel/data/scripts
chmod -R u+rwX,g+rwX,o+rwX /opt/ipstream-panel/data/logs/liquidsoap

# Reiniciar agente (regenera scripts)
docker restart ipstream-streaming-agent
```

El `deploy.sh` automatiza esto pero los UIDs a veces no se setean bien.

### ❌ "Health check fail" / agente no responde

1. Verificar que `.env` tenga tokens reales (no `dev-...`):
   ```bash
   bash scripts/setup-prod.sh --check
   ```
2. Si reporta inseguros:
   ```bash
   bash scripts/setup-prod.sh --force
   docker exec -i ipstream-app node - < scripts/rotate-stream-passwords.js
   docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
   ```

### ❌ Image "not found" en registry

Bug en el workflow. Ver `.github/workflows/deploy.yml`:
- Tags usan `format=short` para SHA corto.
- Si el build no pusheó, el log muestra error.

### ❌ "Failed to find Server Action" / "Missing origin header"

Es un warning que aparece cuando Next.js Server Actions se ejecutan detrás de un proxy (Caddy). El fix está en `next.config.js` con `allowedOrigins`. Verificar que `PANEL_PUBLIC_URL` esté bien en `.env`.

### ❌ "Liquidsoap arrancó pero no se encontró el proceso"

Significa que liquidsoap falló al arrancar. Ver el log del contenedor:

```bash
docker exec ipstream-liquidsoap cat /var/log/liquidsoap/radio_*.log
```

Errores comunes:
- Path del playlist.m3u no existe (`/var/lib/radio/{clientId}/playlist.m3u`).
- El agent no pudo escribir el `.liq` (permisos).
- Sintaxis del `.liq` inválida (verificar que tenga URL literal, no `getenv`).

---

## Agregar nuevos clientes o migrar datos

Crear un cliente desde el admin (o por API), crear `RadioStream`, y la primera vez que hagas Iniciar AutoDJ, el agente genera los scripts. No requiere setup manual.

---

## Cuando algo sale MUY mal

Reset completo del stack:

```bash
ssh usuario@vps
cd /opt/ipstream-panel

# 1. Bajar todo
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml down

# 2. Backup de DB
docker exec ipstream-db mysqldump -uipstream -pipstream_secret ipstream_panel > backup-$(date +%Y%m%d).sql

# 3. Re-deploy con script automatizado
bash scripts/setup-prod.sh --check
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d
```

---

## Próximas mejoras pendientes (no críticas)

- Tests automatizados del flujo de streaming.
- Logs centralizados.
- Monitoreo con Prometheus / health checks externos.
- HTTPS automático con Caddy ya implementado.

---

**Dudas**: revisar el workflow `.github/workflows/deploy.yml` y `deploy/scripts/deploy.sh` para entender cada paso.