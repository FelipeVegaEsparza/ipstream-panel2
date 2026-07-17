# Streaming — Resultados de Fase 2

**Fecha:** 2026-07-16
**Estado:** ✅ Validado
**Tiempo de ejecución:** ~2h

## Objetivo

Implementar la **gestión completa de streams** desde el streaming-agent:
start/stop/restart por cliente, status combinado DB+Icecast, m3u dinámico,
y WebSocket para status en vivo.

## Lo que se construyó

### Lib nuevas (agent)

| Archivo | Función |
|---|---|
| `lib/encryption.js` | AES-256-GCM compatible con `lib/encryption.ts` del panel (formato `iv:tag:hex`) |
| `lib/icecast.js` | Cliente HTTP: `getGlobalStatus()`, `getMountStatus(mount)`, `ping()`, `killSource()`, `updateMetadata()` |
| `lib/script-generator.js` | Genera el `.liq` por cliente con playlist + credenciales |
| `lib/liquidsoap.js` | Spawn/kill/restart vía `docker exec` + generación de m3u + script de check de procesos |

### Routes nuevas (agent)

| Método | Path | Función |
|---|---|---|
| `GET` | `/api/streams` | Lista todos los streams |
| `GET` | `/api/streams/:clientId` | Info de un stream |
| `GET` | `/api/streams/:clientId/status` | Status combinado DB + Icecast + proceso |
| `POST` | `/api/streams/:clientId/start` | Inicia AutoDJ |
| `POST` | `/api/streams/:clientId/stop` | Detiene AutoDJ |
| `POST` | `/api/streams/:clientId/restart` | Reinicia AutoDJ |
| `POST` | `/api/streams/:clientId/regenerate-m3u` | Regenera playlist.m3u desde DB |
| `GET` | `/api/icecast/status` | Status global de Icecast |
| `WS` | `/ws/streams/:clientId` | Push cada 3s con status en vivo |

### Cambios de infra

- **Agent Dockerfile**: agregado `docker.io` para poder hacer `docker exec` en el container de liquidsoap
- **docker-compose**: montado `/var/run/docker.sock` al agent + var `ICE_SOURCE_PASSWORD`

## Decisiones técnicas

### 1. Source password compartido
Por ahora todos los clientes usan el mismo `ICE_SOURCE_PASSWORD` (config en Icecast). Los `livePasswordEnc` y `sourcePasswordEnc` per-cliente están en DB pero no se usan todavía — se usarán cuando migremos a Icecast 2.5+ con mount configs dinámicas por cliente.

### 2. Detección de procesos via `/proc` y no `ps`
El container de liquidsoap es `debian-slim` y no tiene `ps` instalado. Usamos:
- Script bash en `/etc/liquidsoap/scripts/_check_proc.sh` (escrito en el volumen compartido)
- Itera `/proc/*/cmdline` y busca el patrón del mount

### 3. Generación dinámica de m3u
Cuando se activa una playlist, el agent regenera `/var/lib/radio/<clientId>/playlist.m3u` con paths **absolutos** (liquidsoap no resuelve paths relativos).

### 4. Control via docker exec
El agent hace `docker exec` en el container de liquidsoap para:
- Arrancar: `docker exec -d ... nohup liquidsoap <script> &`
- Detener: `docker exec ... kill -TERM <pid>; sleep 1; kill -KILL <pid>`
- Verificar: `docker exec ... bash /etc/liquidsoap/scripts/_check_proc.sh <mount>`

### 5. Script auto-generado
Cada cliente tiene un `.liq` con:
- `init.allow_root` (estamos en container)
- Telnet en puerto único (`liquidsoapTelnetPort`)
- Playlist con `mksafe()` (infallible)
- Output a Icecast con prioridad baja (DJ puede tomar el control)

## Pruebas realizadas

### ✅ E2E completo: start → broadcast → stop → restart

```bash
# 1. Seed: crear client + 3 tracks + playlist activa
$ docker exec agent node seed-e2e.js
{ "ok": true, "clientId": "test_4fe56d37", "trackCount": 3 }

# 2. Regenerar m3u
$ curl -X POST -H "Authorization: Bearer ..." .../regenerate-m3u
{ "ok": true, "active": true, "trackCount": 3 }

# 3. Start
$ curl -X POST -H "Authorization: Bearer ..." .../start
{ "ok": true, "pid": 844, "scriptPath": "..." }

# 4. Verificar en Icecast
$ curl http://localhost:8000/status-json.xsl
{
  "mount": "http://localhost:8000/test_b31024e8",
  "server_name": "Test Radio 1",
  "bitrate": 128,
  "listeners": 1  // peak después de probar
}

# 5. Listener recibe audio
$ ffmpeg -i stream.mp3 -t 2 -f null -
  Audio: mp3, 44100 Hz, stereo, 128 kb/s

# 6. Stop
$ curl -X POST -H "Authorization: Bearer ..." .../stop
{ "ok": true, "wasRunning": true, "killedPid": 844 }

# 7. Restart
$ curl -X POST -H "Authorization: Bearer ..." .../restart
{ "ok": true, "pid": 901, "hasPlaylist": true }
```

### ✅ Status combinado (DB + Icecast + proceso)

```json
{
  "clientId": "test_4fe56d37",
  "mount": "test_b31024e8",
  "clientName": "Test Radio 1",
  "process": { "running": true, "pid": 844 },
  "icecast": {
    "server_name": "Test Radio 1",
    "bitrate": 128,
    "listeners": 0,
    "listener_peak": 1,
    "stream_start": "Thu, 16 Jul 2026 23:03:10 +0000"
  },
  "db": { "status": "autodj", "bitrate": 128, "liquidsoapRunning": true }
}
```

### ✅ WebSocket push cada 3s

```javascript
WS connected
[1] type=status mount=test_b31024e8 proc=true pid=844 listeners=0
[2] type=status mount=test_b31024e8 proc=true pid=844 listeners=0
[3] type=status mount=test_b31024e8 proc=true pid=844 listeners=0
```

### ✅ Audit log

```
action           pid  createdAt
stream_restart   844  2026-07-16 23:03:30
stream_stop      NULL 2026-07-16 23:03:27
stream_restart   748  2026-07-16 23:03:09
error            NULL 2026-07-16 22:55:26
...
```

## Issues encontrados y arreglados

1. **MySQL reserved word `repeat`** — varias queries con `\`repeat\``
2. **MySQL reserved word `mount`** (en una query) — escapado con backticks
3. **ESM `require is not defined`** — cambiado a `import crypto from 'crypto'`
4. **Permisos en `/var/run/docker.sock`** — agent corre como root en dev (en prod configurar grupo docker)
5. **Bash escaping en template literals JS** — `\\$1` se malinterpretaba; cambiado a array de strings con `join('\n')`
6. **m3u con paths relativos** — liquidsoap no los resuelve; cambiado a paths absolutos
7. **401 en Icecast** — bug en mi código, usé `adminPassword` en vez de `sourcePassword`; agregado `ICE_SOURCE_PASSWORD` al config

## Estado actual

```
NAME                       STATUS                    PORTS
ipstream-db                Up (healthy)              3307→3306
ipstream-app               Up (healthy)              3000
ipstream-icecast           Up (healthy)              8000
ipstream-liquidsoap        Up (healthy)
ipstream-streaming-agent   Up                        4000
```

5 contenedores healthy, 5 tablas de streaming en MySQL, 3 tracks de prueba
en la biblioteca, 1 playlist activa, 1 stream transmitiendo.

## Próximos pasos (Fase 3)

- [ ] CRUD de tracks (upload, list, delete, scan ID3)
- [ ] CRUD de playlists (crear, editar nombre, eliminar, activar)
- [ ] CRUD de playlist entries (agregar/quitar/reordenar tracks)
- [ ] Endpoints: `POST /api/streams/:clientId/library/upload`, etc.
- [ ] WebSocket push en eventos de cambio (opcional)

## Comandos útiles

```bash
# Listar procesos liquidsoap activos
docker exec ipstream-liquidsoap bash /etc/liquidsoap/scripts/_check_proc.sh test_b31024e8

# Ver log de un cliente
docker exec ipstream-liquidsoap tail -f /var/log/liquidsoap/test_b31024e8.log

# Detener todos los streams
docker exec ipstream-liquidsoap bash -c "pkill -f liquidsoap || true"

# Probar el script generator standalone (Node)
node -e "import('./lib/script-generator.js').then(m => console.log(m.generateLiquidsoapScript({clientId:'c1', clientName:'Test', icecastMount:'m1', sourcePassword:'pwd', telnetPort:12345, bitrate:128})))"
```
