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
| `1935` | SRS | Ingesta del DJ: directa `rtmp://<host>:1935/dj/<stream_key>` y "Conexión Universal" `rtmp://<host>:1935/relay` + stream key (valida el key vía hook). AutoDJ usa `.../live/<stream_key>` |

Verificar desde fuera del VPS:

```bash
nc -zv <host> 1935
```

En el VPS (ufw):

```bash
sudo ufw allow 1935/tcp
```

Notas:
- La "Conexión Universal" entra por el puerto `1935` (app `relay` de SRS) con el mismo stream key de la conexión directa. SRS deniega keys desconocidas, así que **no hace falta abrir puertos extra** (el rango relay 1936–2235 fue eliminado). Si quedó abierto en el firewall del VPS, cerrarlo.
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

## Nodos de streaming (multi-servidor)

El panel puede gestionar servidores de streaming separados (radio y/o TV) además del VPS principal. El contenido y los clientes se gestionan siempre desde el panel central; cada nodo solo corre el stack de streaming.

### Arquitectura

```
PANEL CENTRAL (app + MySQL)          NODOS (radio/TV)
┌───────────────────────┐           ┌────────────────────────────┐
│  app (Next.js)        │  HTTP     │  agent + icecast           │
│  db (MySQL) ◄─────────┼──────────►│  + liquidsoap (+ srs,      │
│  /admin/servers       │  :4000    │  + video-encoder)          │
└───────────────────────┘           └────────────────────────────┘
```

### Registrar un nodo en el panel

1. En `/admin/servers` → **Agregar servidor**: nombre, tipo (`radio`, `tv` o `ambos`), **URL del agente** (`http://<ip-del-nodo>:4000`) y **hostname público** (el dominio/IP donde escucharán los oyentes/espectadores).
2. El **token del agente** (`STREAMING_AGENT_TOKEN`) debe ser el mismo que tendrá el `.env` del nodo. Se guarda encriptado.
3. El panel hace un health check inicial y muestra el estado.

### Desplegar un nodo

En el VPS del nodo (clonar el repo, igual que el principal):

```bash
ssh usuario@nodo
git clone https://github.com/FelipeVegaEsparza/ipstream-panel2.git /opt/ipstream-node
cd /opt/ipstream-node
cp .env.example .env
nano .env
#   DB_HOST=<ip-del-VPS-principal>      ← MySQL central
#   DB_PORT=3306
#   DB_USER=ipstream  DB_PASSWORD=...  DB_DATABASE=ipstream_panel
#   ENCRYPTION_KEY=<misma que el panel>
#   STREAMING_AGENT_TOKEN=<el que registraste en el panel>
#   ICE_HOSTNAME=<hostname público del nodo>
#   HARBOR_PUBLIC_HOSTNAME=<hostname público del nodo>
#   RTMP_RELAY_PUBLIC_HOST=<hostname público del nodo>

docker compose -f docker-compose.streaming.yml up -d --build
```

### Firewall / seguridad

- El agente escucha en `:4000`. **Acotar por firewall** el acceso a la IP del VPS del panel (o usar WireGuard/VPN).
- La MySQL central debe aceptar conexiones del nodo: acotar el bind de MySQL a las IPs de los nodos (y opcionalmente WireGuard).
- Cada nodo expone sus propios puertos públicos (icecast `:8000`, SRS `:1935`/`:8080`, harbor `:22340+`).

### Asignar y migrar clientes

- Al crear un cliente (admin) se elige el servidor de radio y/o TV.
- La migración es **100% manual**: botón **"Migrar a otro servidor"** en `/admin/streaming/<clientId>` o en el monitor. El panel copia la biblioteca, cambia la asignación, arranca en el destino y detiene el origen.
- El panel **nunca** migra automáticamente. Si un servidor cae, `/admin/monitor` lo marca con una alerta y muestra cuántos clientes afecta; el admin decide migrarlos.

> Nota: para migrar un cliente el servidor **origen** debe estar alcanzable (sus archivos se copian desde ahí). Si el origen está caído no se puede migrar sin perder contenido.

---

## Próximas mejoras pendientes (no críticas)

- Tests automatizados del flujo de streaming.
- Logs centralizados.
- Monitoreo con Prometheus / health checks externos.
- HTTPS automático con Caddy ya implementado.

---

**Dudas**: revisar el workflow `.github/workflows/deploy.yml` y `deploy/scripts/deploy.sh` para entender cada paso.