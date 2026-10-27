# CasterFly Panel

Panel completo de gestión de contenido para radio y streaming con API REST pública.

**Dominios de producción:** `casterfly.com` (sitio público), `panel.casterfly.com` (panel) y `stream.casterfly.com` (Icecast). Ver `DEPLOY.md` para el mapa completo y la migración desde `panelipstream.cl`.
**Incluye módulo de streaming propio** con Icecast 2 + liquidsoap (AutoDJ, playlists, biblioteca MP3, DJ en vivo).

> **Antes de tocar código:** `AGENTS.md` es la fuente de verdad de arquitectura, envs y flujos de deploy. Cada push a `main` pasa por un gate de CI (tests + `tsc --noEmit` con `strict: true`) antes de construir la imagen; si falla, producción no se toca. Para probar sin riesgo hay un staging efímero manual (`staging.yml`).

## Características

- **Dashboard de administración** para clientes
- **Gestión completa de contenido** (programas, noticias, videos, etc.)
- **Sistema de upload de imágenes** con drag & drop
- **API REST pública** para consumir los datos
- **Autenticación segura** con NextAuth.js
- **Base de datos MySQL** con Prisma ORM
- **Interfaz moderna** con Tailwind CSS
- **🎵 Streaming propio** (Icecast 2 + liquidsoap 2.1) con:
  - AutoDJ con playlists y biblioteca MP3
  - Reproductor embebible para sitios externos
  - Conexión para DJs en vivo (BUTT, MIXXX, etc.)
  - Multi-tenant: cada cliente tiene su radio aislada

## Stack Tecnológico

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de datos**: MySQL
- **Autenticación**: NextAuth.js
- **Validación**: Zod
- **UI Components**: Headless UI, Heroicons
- **Streaming**: Icecast 2, liquidsoap 2.1, Node.js + Fastify (sidecar agent)

## Instalación

### Opción A — Docker (recomendado, todo en un comando)

La forma más rápida de levantar el proyecto. Solo necesitás Docker y Docker Compose.

```bash
# 1. (Opcional) Editar .env.docker para cambiar credenciales o secretos
cp .env.example .env.docker

# 2. Construir y levantar app + MySQL
docker compose up -d --build

# 3. Ver logs (opcional)
docker compose logs -f app
```

- App: <http://localhost:3000>
- MySQL: `localhost:3307` (usuario `ipstream`, password `ipstream_secret`, db `ipstream_panel`)
- Health check: <http://localhost:3000/api/health>
- Admin seed automático: `admin@casterfly.com` / `admin123456` (cambialo en `.env.docker`)

El contenedor `app` ejecuta automáticamente al arrancar:
1. Espera a que MySQL esté listo (healthcheck).
2. `prisma generate` + `prisma db push` (crea/actualiza todas las tablas).
3. Crea el usuario admin si no existe.
4. Inicia Next.js en producción.

Persistencia: dos volúmenes Docker (`ipstream_db_data` para MySQL, `ipstream_uploads` para imágenes subidas).

```bash
# Detener
docker compose down

# Reset completo (borra DB y uploads)
docker compose down -v
```

### Opción B — Sin Docker (desarrollo local)

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd ipstream-panel
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:
```env
DATABASE_URL="mysql://username:password@localhost:3306/ipstream_panel"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

4. **Configurar la base de datos**
```bash
# Generar el cliente de Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# O usar push para desarrollo
npm run db:push
```

5. **Ejecutar en desarrollo**
```bash
npm run dev
```

## Estructura del Proyecto

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # Autenticación
│   │   ├── public/            # API REST pública
│   │   └── [endpoints]/       # Endpoints privados
│   ├── auth/                  # Páginas de autenticación
│   ├── dashboard/             # Dashboard del cliente
│   └── layout.tsx
├── components/
│   └── dashboard/             # Componentes del dashboard
├── lib/
│   ├── prisma.ts             # Cliente de Prisma
│   ├── utils.ts              # Utilidades
│   └── validations.ts        # Esquemas de validación
├── prisma/
│   └── schema.prisma         # Esquema de la base de datos
└── types/
    └── next-auth.d.ts        # Tipos de NextAuth
```

## Funcionalidades

### Para Clientes
- **Datos Básicos**: Información del proyecto, logos, URLs de streaming
- **Redes Sociales**: Enlaces a todas las plataformas sociales
- **Programación**: Gestión de programas con horarios y días
- **Noticias**: Publicación y gestión de noticias con slugs únicos
- **Ranking de Videos**: Lista ordenada de videos con reordenamiento
- **Auspiciadores**: Gestión completa de sponsors con logos y redes sociales
- **Promociones**: Creación y gestión de promociones con imágenes y enlaces
- **Upload de Imágenes**: Sistema completo de subida de imágenes al servidor
- **API de Prueba**: Página integrada para probar todos los endpoints

### API REST Pública

Todos los endpoints están disponibles en `/api/public/[clientId]/`

#### Endpoints Disponibles

**Información completa del cliente:**
```
GET /api/public/[clientId]
```

**Datos básicos:**
```
GET /api/public/[clientId]/basic-data
```

**Redes sociales:**
```
GET /api/public/[clientId]/social-networks
```

**Programas:**
```
GET /api/public/[clientId]/programs
```

**Noticias:**
```
GET /api/public/[clientId]/news
GET /api/public/[clientId]/news?page=1&limit=10
GET /api/public/[clientId]/news/[slug]
```

**Videos:**
```
GET /api/public/[clientId]/videos
```

**Auspiciadores:**
```
GET /api/public/[clientId]/sponsors
```

**Promociones:**
```
GET /api/public/[clientId]/promotions
```

**Chat — Mensajes:**
```
GET  /api/public/[clientId]/chat/messages[?since=<iso>&limit=50]
POST /api/public/[clientId]/chat/messages
```

**Chat — En línea:**
```
GET /api/public/[clientId]/chat/online
```

## Sitio público (CMS)

El contenido editorial de casterfly.com se edita desde `/admin/sitio`. Ver [`docs/site-content-cms.md`](docs/site-content-cms.md).

## Chat en Vivo (oyentes↔oyentes)

El dashboard incluye una sección **Chat en Vivo** donde el dueño de la radio puede:

- Ver todos los mensajes en tiempo real (polling cada 3s)
- Enviar mensajes como **staff** (aparecen con badge distintivo en la web del cliente)
- Borrar mensajes inapropiados
- Banear usuarios por email y/o IP
- Ver estadísticas (mensajes por hora, oyentes activos, bans activos)

### Endpoints públicos (consumidos por la web de la radio)

**Obtener mensajes** (polling incremental):
```http
GET /api/public/[clientId]/chat/messages?since=2026-07-12T10:00:00.000Z&limit=50
```

Sin `since` devuelve los últimos N mensajes en orden ascendente. Con `since` devuelve solo los mensajes con `createdAt > since` y añade `nextCursor`/`hasMore` para seguir drenando tandas.

**Enviar mensaje** (oyente):
```http
POST /api/public/[clientId]/chat/messages
Content-Type: application/json

{ "name": "Juan", "email": "juan@ejemplo.com", "body": "¡Buena canción!" }
```

**Oyentes activos**:
```http
GET /api/public/[clientId]/chat/online
```

Devuelve `{ count, recentNames[], serverTime }` basado en actividad de los últimos 10 minutos.

### Reglas

- **Identidad:** nombre + email (2–60 y email válido, máx 120)
- **Cuerpo:** 1–500 caracteres
- **Rate limit:** 5 mensajes/minuto por IP+email
- **Bans:** emails o IPs baneadas no pueden enviar
- **Retención:** los mensajes se borran automáticamente a las **48 h** (cron `/api/cron/chat/cleanup`)
- **Staff:** los mensajes del staff (`authorType: "staff"`) solo se crean desde el dashboard, nunca desde la API pública. El server fija ese flag — los clientes no pueden inyectarlo.

### Limpieza automática (Cron)

```http
POST /api/cron/chat/cleanup
Authorization: Bearer ${CRON_SECRET}
```

Borra todos los mensajes con más de 48 h. Debe ejecutarse cada hora con `CRON_SECRET` configurado; si el secreto no está configurado, el endpoint responde error de configuración.

### Envío de notificaciones programadas (Cron)

```http
POST /api/cron/send-pending-notifications
Authorization: Bearer ${CRON_SECRET}
```

Envía las notificaciones push con `status=pending` y `scheduledFor <= ahora`, marcándolas `sent`/`failed`. **Debe correr cada 1 minuto** o las programadas no salen. El endpoint reclama cada notificación de forma atómica (`pending` → `sending`), así que dos corridas solapadas no reenvían.

Crontab del VPS (ejemplo):

```cron
* * * * * /opt/ipstream-panel/deploy/scripts/cron-push.sh >/dev/null 2>&1
```

El script lee `CRON_SECRET` y el dominio del `.env` del proyecto.

Limpieza del chat en el crontab del VPS (cada hora):

```cron
0 * * * * /opt/ipstream-panel/deploy/scripts/cron-chat.sh >/dev/null 2>&1
```

### Endpoints del dashboard (requieren auth, para moderar)

| Método | Path | Descripción |
|---|---|---|
| `GET` | `/api/dashboard/chat/messages` | Listar mensajes con paginación y búsqueda |
| `POST` | `/api/dashboard/chat/messages` | Enviar mensaje como staff |
| `DELETE` | `/api/dashboard/chat/messages/[id]` | Borrar un mensaje |
| `GET` | `/api/dashboard/chat/bans` | Listar bans |
| `POST` | `/api/dashboard/chat/bans` | Banear (body: `{ email?, ipAddress?, reason? }`) |
| `DELETE` | `/api/dashboard/chat/bans/[id]` | Quitar ban |
| `GET` | `/api/dashboard/chat/stats` | Métricas (mensajes/hora, oyentes activos, bans) |

### Privacidad

Los emails se almacenan en texto plano para poder aplicar bans. La ventana de retención de 48 h minimiza la exposición. Si necesitás mayor privacidad podemos hashear los emails en el futuro (perdiendo la capacidad de banear por email directo, pero permitiendo comparar hashes).

## Calidad de locución IA

Presets de voz, post-proceso, diccionario de pronunciación y garantía de créditos sin aumentos. Ver [`docs/elevenlabs-voice-quality.md`](docs/elevenlabs-voice-quality.md).

## Ejemplo de Uso de la API

```javascript
// Obtener toda la información de un cliente
const response = await fetch('/api/public/CLIENT_ID')
const data = await response.json()

console.log(data)
// {
//   client: { id: "...", name: "..." },
//   basicData: { projectName: "...", ... },
//   socialNetworks: { facebook: "...", ... },
//   programs: [...],
//   news: [...],
//   videos: [...],
//   sponsors: [...],
//   promotions: [...]
// }

// Obtener solo los programas
const programs = await fetch('/api/public/CLIENT_ID/programs')
const programsData = await programs.json()
```

## Estructura de Datos

### Datos Básicos
```typescript
{
  projectName: string
  projectDescription: string
  logoUrl?: string
  coverUrl?: string
  radioStreamingUrl?: string
  videoStreamingUrl?: string
}
```

### Programas
```typescript
{
  id: string
  name: string
  imageUrl?: string
  description: string
  startTime: string // "HH:MM"
  endTime: string   // "HH:MM"
  weekDays: string[] // ["monday", "tuesday", ...]
}
```

### Noticias
```typescript
{
  id: string
  name: string
  slug: string
  shortText: string
  longText: string
  imageUrl?: string
  createdAt: Date
}
```

## Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run start        # Ejecutar en producción
npm run lint         # Linter
npm run db:push      # Push del schema a la DB
npm run db:migrate   # Ejecutar migraciones
npm run db:generate  # Generar cliente Prisma
npm run db:studio    # Abrir Prisma Studio
```

## Deployment

### Vercel (Recomendado)
1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno
3. Usar PlanetScale o similar para MySQL

### Variables de Entorno para Producción
```env
DATABASE_URL="mysql://..."
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="secret-muy-seguro"
```

## Sistema de Upload de Imágenes

### Funcionalidades
- **Drag & Drop**: Arrastra imágenes directamente
- **Click to Upload**: Haz clic para seleccionar archivos
- **Vista previa**: Previsualización inmediata
- **Validación**: Solo imágenes (JPG, PNG, GIF, WebP)
- **Límite de tamaño**: Máximo 5MB por imagen
- **Organización**: Archivos organizados por cliente
- **Eliminación automática**: Limpia archivos del servidor

### Formatos Soportados
- JPEG/JPG
- PNG
- GIF
- WebP

### Estructura de Archivos
```
public/uploads/
├── [client-id-1]/
│   ├── timestamp_image1.jpg
│   └── timestamp_image2.png
└── [client-id-2]/
    └── timestamp_image3.jpg
```

## Desarrollo

### Agregar Nuevas Funcionalidades
1. Actualizar el schema de Prisma si es necesario
2. Crear las validaciones en `lib/validations.ts`
3. Crear los componentes del dashboard
4. Crear las APIs privadas y públicas
5. Actualizar la documentación

### Base de Datos
- Usar `npm run db:studio` para explorar la base de datos
- Las migraciones se generan automáticamente con Prisma
- Todos los modelos tienen timestamps automáticos

### Upload de Imágenes
- Las imágenes se guardan en `public/uploads/[clientId]/`
- Nombres únicos con timestamp para evitar conflictos
- API de eliminación automática cuando se remueven imágenes

## Seguridad

- Autenticación requerida para el dashboard
- APIs públicas sin autenticación (solo lectura)
- Validación de datos con Zod
- Sanitización automática con Prisma
- Separación clara entre APIs públicas y privadas
- **Streaming**: passwords encriptados con AES-256-GCM, audit log de reveals, auth Bearer entre panel y agent

## Soporte

Para soporte o preguntas sobre el proyecto, contacta al equipo de desarrollo.

---

## 🎵 Módulo de Streaming (Icecast + liquidsoap)

El panel incluye un **sistema de streaming propio** que reemplaza a SonicPanel u
otros paneles similares. Cada cliente tiene su radio aislada con AutoDJ,
biblioteca MP3, playlists y soporte para DJs en vivo.

### Arquitectura

```
┌──────────────────┐   HTTPS+Bearer   ┌────────────────────┐
│ IPStream Panel   │ ───────────────▶ │ Streaming Agent    │
│ (Next.js)        │                  │ (Node + Fastify)   │
└──────────────────┘                  └─────────┬──────────┘
                                                │
                                ┌───────────────┼───────────────┐
                                ▼               ▼               ▼
                          ┌──────────┐    ┌──────────┐    ┌──────────┐
                          │ Icecast 2│    │Liquidsoap│    │Filesystem│
                          │   :8000  │    │ 2.1      │    │/var/lib/ │
                          │          │    │(AutoDJ)  │    │ radio/   │
                          └──────────┘    └──────────┘    └──────────┘
```

### Stack

- **Icecast 2.4.4** — servidor de streaming HTTP estándar
- **liquidsoap 2.1.3** — motor AutoDJ (open source, very powerful)
- **Node.js 20 + Fastify 4** — sidecar que controla todo
- **music-metadata** — lectura de ID3 tags

### Servicios Docker

| Servicio | Puerto | Función |
|---|---|---|
| `db` | 3306 | MySQL (compartido con el panel) |
| `app` | 3000 | IPStream Panel (Next.js) |
| `icecast` | 8000 | Servidor de streaming HTTP |
| `liquidsoap` | - | Motor AutoDJ (1 proceso por cliente) |
| `agent` | 4000 | Sidecar que controla icecast + liquidsoap |

### Características

- **AutoDJ** con playlists: crear, editar, eliminar, activar
- **Biblioteca MP3** con drag&drop upload, lectura de ID3, edit metadata
- **Drag&drop reorder** de tracks en playlists
- **Multi-tenant**: cada cliente tiene su radio aislada
- **Auto-crear RadioStream** al registrarse (con mount, port, passwords únicos)
- **DJ en vivo**: BUTT/MIXXX pueden tomar el control sin cortar oyentes
- **Player público embebible** para sitios externos
- **Endpoint público** `/api/public/[clientId]/streaming/status` con `streamUrls`
- **Audit log** de todas las acciones
- **Encriptación** de passwords con AES-256-GCM (compatible con `lib/encryption.ts`)

### Transmitir en vivo (consola web, WebRTC)

La sección **Radio → Transmitir en vivo** (`/dashboard/streaming/live`) permite
salir al aire desde el navegador, sin BUTT/MIXXX:

- **Biblioteca local**: se eligen archivos o una carpeta. En Chromium la carpeta
  se recuerda (File System Access + IndexedDB); en otros navegadores se elige por
  sesión. Los audios **no se suben** al servidor.
- **Reproductor simple**: navegador de archivos a la izquierda, lista de reproducción a la derecha, transporte con anterior/play-pausa/siguiente, seek y tema actual/próximo.
- **Botonera de efectos de sonido**: cantidad de botones configurable, un audio por botón y volumen individual. Se guardan en el navegador (IndexedDB) y se mezclan sobre la transmisión.
- **Mezcladora avanzada**: dos decks, crossfader, gain, EQ, loops, micrófono, talkover y cue. Por ahora no se muestra en la vista; queda para una etapa posterior.
- **Transporte**: WHIP/WebRTC contra SRS como camino principal y WebSocket/FFmpeg
  como fallback. La consola no cambia al cambiar de transporte.
- **Calidad**: el puente apunta a 192 kbps. Antes de fijar el transporte se corre
  un gate A/B contra una fuente MP3 directa (ver `openspec/changes/radio-live-console`).

Variables nuevas:

```env
LIVE_SESSION_SECRET=openssl rand -hex 32
LIVE_AUDIO_BITRATE=192
LIVE_BRIDGE_CODEC=mp3          # o 'aac' si input.harbor lo acepta (spike)
AUDIO_BRIDGE_CONTAINER=ipstream-audio-bridge
SRS_RTC_UDP_PORT=8010
RTC_CANDIDATE=203.0.113.10     # IP pública del nodo (no DNS)
LIVE_ICE_SERVERS=[]            # STUN/TURN extra en JSON
LIVE_TRANSPORT_DEFAULT=whip
LIVE_PUBLIC_BASE_URL=          # opcional; usa el publicUrl del servidor
```

Para probar en local sin Caddy, apuntá el navegador directo al agente:

```env
LIVE_PUBLIC_BASE_URL=http://localhost:4000
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Prerrequisitos del nodo:

1. Abrir el puerto **UDP 8010** en el firewall del VPS.
2. Configurar `RTC_CANDIDATE` con la IP pública.
3. Caddy debe enrutar `/rtc/*` y `/ws/live` al agente (ya incluido en
   `deploy/Caddyfile`, `deploy/Caddyfile.node` y el provisioner).
4. Tras un cambio de agente/SRS/Caddy, pulsar **"Actualizar nodo"** en cada nodo
   remoto.

### Watchdog de Icecast

El supervisor del agente verifica Icecast cada 60 s. Si no responde, reinicia
el contenedor `ipstream-icecast` y, cuando vuelve, reinicia los streams que
quedaron sin mount. No reinicia un stream si hay un DJ conectado al harbor.
Hay un cooldown de 60 s para evitar bucles.

### Locuciones de clima y hora

La consola tiene botones **Clima** y **Hora** que generan una locución y la
mezclan sobre el programa (sale al aire y por el monitor). El clima usa la
ciudad/coordenadas configuradas en **Datos Básicos** y Open-Meteo; la hora usa
la zona horaria del cliente. Durante el anuncio la música baja al 12 %.

La voz principal se configura en **`/admin/settings` → Locución** con una API
key de **ElevenLabs** (encriptada en `app_config`), un Voice ID y el modelo
(`eleven_v4_turbo` por defecto). ElevenLabs se usa para Clima/Hora y los audios
se cachean en el volumen `app_uploads`; una frase repetida no se vuelve a
generar. Si no está configurado o falla, se usa **Piper TTS** como fallback
(offline, contenedor `piper`, voces `es_MX-ald-medium` y `es_MX-claude-high`).
Tocar `streaming/piper/*`, `streaming/agent/*` o `docker-compose.streaming.yml`
obliga a **"Actualizar nodo"**; el panel con ElevenLabs no requiere ese paso.

### Plan IA en vivo

El plan puede incluir **IA en vivo** (`aiLiveEnabled`) con una cuota mensual
(`aiMonthlyCharacters`). Incluye el presentador automático de la consola
(cada N temas, intro de hasta 15 s con nombre de la radio y próximo tema),
locuciones libres creadas por el cliente y voz premium para clima/hora.

La cuota se descuenta por caracteres solo cuando ElevenLabs genera un audio
nuevo; los audios cacheados no consumen. Al agotarse, el clima/hora y las
locuciones caen a Piper; el presentador se omite y muestra el aviso. Las
locuciones libres se agregan a la lista como pistas tipo `spot`.

### Presentador IA en AutoDJ

El presentador del AutoDJ usa una **fuente Liquidsoap separada** de los jingles:
las intros se generan por bloque con el próximo tema y se guardan en
`ai-intros.m3u`. Los jingles del cliente se mantienen en su propia capa y no
se modifican. La frecuencia y las frases se configuran por radio (`aiPresenterEvery`,
`aiIntroPhrases`) en **Radio → Locutor IA**. Las frases admiten `{{radio}}`,
`{{titulo}}` y `{{artista}}` y se eligen al azar; el botón **Aplicar al AutoDJ**
regenera las intros. Requiere playlist sin shuffle. Tocar el agente o el script de Liquidsoap obliga a **“Actualizar nodo”**
en los nodos remotos.

### Fallback por silencio

Si la fuente en vivo deja de emitir audio (consola web o DJ externo conectado al
harbor), Liquidsoap detecta el silencio y el agente corta la fuente para que
vuelva el AutoDJ. La consola no se reconecta en bucle: muestra que el AutoDJ
tomó el control y permite salir al aire de nuevo.

```env
RADIO_SILENCE_FALLBACK_SECONDS=10   # gracia antes de cortar
RADIO_SILENCE_THRESHOLD_DB=-50      # umbral de silencio
RADIO_SILENCE_COOLDOWN_SECONDS=30   # evita cortes repetidos
```

### Variables de entorno

```env
# Streaming
ICE_ADMIN_USER=admin
ICE_ADMIN_PASSWORD=hackme
ICE_SOURCE_PASSWORD=hackme
ICE_HOSTNAME=localhost
ICE_PUBLIC_URL=http://localhost:8000

# Streaming Agent
STREAMING_AGENT_URL=http://agent:4000
STREAMING_AGENT_TOKEN=tu-token-seguro-32-chars
```

### Acceso al módulo

- **UI**: `/dashboard/streaming`
- **API dashboard**: `/api/dashboard/streaming/*`
- **API pública**: `/api/public/[clientId]/streaming/status`
- **Player embebible**:
  ```tsx
  import { StreamingPlayer } from '@/components/public/StreamingPlayer'
  <StreamingPlayer clientId="abc123" theme="cyan" />
  ```

### Documentación detallada

Ver `streaming/PHASE-*.md` para los detalles de cada fase:
- `PHASE-0-RESULTS.md` — Setup base Icecast + liquidsoap
- `PHASE-1-RESULTS.md` — Schema Prisma + streaming-agent
- `PHASE-2-RESULTS.md` — Gestión de procesos
- `PHASE-3-RESULTS.md` — Library + Playlists CRUD
- `PHASE-4-RESULTS.md` — Cliente HTTP + API dashboard + API pública
- `PHASE-5-RESULTS.md` — UI completa + player público
- `PHASE-6-RESULTS.md` — Polish + WebSocket + auto-create
### Analítica de radio y TV

El panel expone `/dashboard/estadisticas` con tabs Radio | TV: KPIs (promedio, pico, únicos, tiempo de escucha, sesiones, uptime), series por hora/día, rankings (canciones, artistas, DJs, videos), heatmap día×hora y export CSV. Las métricas se recolectan en el agente (`listener_samples`/`viewer_samples`, `listener_sessions`/`viewer_sessions`), se agregan en `metrics_hourly`/`metrics_daily` y se leen con la zona horaria del cliente (configurada en Datos Básicos). Ver la sección "Analítica / Estadísticas" de `AGENTS.md`.
