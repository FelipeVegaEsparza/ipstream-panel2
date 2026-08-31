# API REST IPStream — Instructivo para crear el sitio web de cada Radio / TV

Este documento es la especificación de la API REST pública de **IPStream Panel**.
La usan los sitios web de cada cliente (radio o TV) para mostrar su contenido:
reproductor de streaming, noticias, programas, galerías, etc.

> **Dato clave:** el `clientId` de cada cliente se obtiene desde el panel en
> `/dashboard/api-test` (sección "Tu Client ID"). Cada radio/TV tiene un ID único.

---

## Resumen

| Aspecto | Valor |
|---------|-------|
| **URL Base** | `https://panelipstream.cl` |
| **Prefijo** | `/api/public/{clientId}` |
| **Autenticación** | Ninguna (pública) |
| **CORS** | Habilitado para todos los orígenes (`Access-Control-Allow-Origin: *`) |
| **Formato de fechas** | ISO 8601 (`"2025-06-15T14:30:00.000Z"`) |
| **IDs** | Strings generadas por Prisma (formato `cm...`) |

Todos los endpoints GET son de solo lectura. Solo aceptan POST:
- `POST /polls/{pollId}/vote`
- `POST /pwa/register`
- `POST /chat/messages`

---

## Índice de Endpoints

| # | Endpoint | Método | Sección |
|---|----------|--------|---------|
| 1 | `/api/public/{clientId}` | GET | Información completa |
| 2 | `/api/public/{clientId}/basic-data` | GET | Información general |
| 3 | `/api/public/{clientId}/social-networks` | GET | Información general |
| 4 | `/api/public/{clientId}/streaming` | GET | Streaming |
| 5 | `/api/public/{clientId}/streaming/status` | GET | Streaming (en vivo) |
| 6 | `/api/public/{clientId}/programs` | GET | Programas |
| 7 | `/api/public/{clientId}/news` | GET | Noticias |
| 8 | `/api/public/{clientId}/news/{slug}` | GET | Noticias |
| 9 | `/api/public/{clientId}/videos` | GET | Videos |
| 10 | `/api/public/{clientId}/sponsors` | GET | Auspiciadores |
| 11 | `/api/public/{clientId}/galleries` | GET | Galerías |
| 12 | `/api/public/{clientId}/announcers` | GET | Locutores |
| 13 | `/api/public/{clientId}/events` | GET | Eventos |
| 14 | `/api/public/{clientId}/promotions` | GET | Promociones |
| 15 | `/api/public/{clientId}/podcasts` | GET | Podcasts |
| 16 | `/api/public/{clientId}/podcasts/{id}` | GET | Podcasts |
| 17 | `/api/public/{clientId}/videocasts` | GET | Videocasts |
| 18 | `/api/public/{clientId}/videocasts/{id}` | GET | Videocasts |
| 19 | `/api/public/{clientId}/polls` | GET | Encuestas |
| 20 | `/api/public/{clientId}/polls/{pollId}/vote` | POST | Encuestas |
| 21 | `/api/public/{clientId}/chat/messages` | GET | Chat |
| 22 | `/api/public/{clientId}/chat/messages` | POST | Chat |
| 23 | `/api/public/{clientId}/chat/online` | GET | Chat |
| 24 | `/api/public/{clientId}/pwa/register` | POST | PWA |

---

## 1. Información Completa del Cliente

Obtiene **todos** los datos del cliente en una sola llamada. Incluye la plantilla seleccionada y el OneSignal App ID.

```
GET {BASE}/api/public/{clientId}
```

### Respuesta (200 OK)

```json
{
  "client": {
    "id": "cm7abcdef1234567890",
    "name": "Radio Ejemplo FM"
  },
  "selectedTemplate": "plantilla-moderna",
  "oneSignalAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "basicData": { },
  "socialNetworks": { },
  "programs": [ ],
  "news": [ ],
  "videos": [ ],
  "sponsors": [ ],
  "galleries": [ ],
  "announcers": [ ],
  "polls": [ ],
  "events": [ ],
  "promotions": [ ],
  "podcasts": [ ],
  "videocasts": [ ]
}
```

### Campos raíz

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `client` | `{ id, name }` | ID y nombre del cliente |
| `selectedTemplate` | `string \| null` | Nombre interno de la plantilla o `null` |
| `oneSignalAppId` | `string \| null` | OneSignal App ID (push) o `null` |
| `basicData` | `object \| null` | Datos básicos (ver §2) |
| `socialNetworks` | `object \| null` | Redes sociales (ver §3) |
| `programs` | `array` | Programas (ver §6) |
| `news` | `array` | Últimas 10 noticias (ver §7) |
| `videos` | `array` | Ranking de videos (ver §9) |
| `sponsors` | `array` | Auspiciadores (ver §10) |
| `galleries` | `array` | Galerías (ver §11) |
| `announcers` | `array` | Locutores (ver §12) |
| `polls` | `array` | Encuestas activas (ver §19) |
| `events` | `array` | Eventos (ver §13) |
| `promotions` | `array` | Promociones (ver §14) |
| `podcasts` | `array` | Últimos 10 podcasts audio (ver §15) |
| `videocasts` | `array` | Últimos 10 videocasts video (ver §17) |

### Errores

```json
// 404
{ "error": "Cliente no encontrado" }
// 500
{ "error": "Error interno del servidor" }
```

---

## 2. Datos Básicos

Información general del proyecto.

```
GET {BASE}/api/public/{clientId}/basic-data
```

### Respuesta (200 OK)

```json
{
  "projectName": "Radio Ejemplo FM",
  "projectDescription": "La radio que te acompaña todos los días.",
  "logoUrl": "{BASE}/api/uploads/{clientId}/logo.png",
  "coverUrl": "{BASE}/api/uploads/{clientId}/cover.jpg",
  "websiteUrl": "https://midominio.cl",
  "radioStreamingUrl": "https://stream.example.com/radio.mp3",
  "videoStreamingUrl": "https://stream.example.com/video.m3u8",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-06-01T08:30:00.000Z"
}
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `projectName` | `string` | Nombre del proyecto |
| `projectDescription` | `string` | Descripción |
| `logoUrl` | `string \| null` | URL del logo |
| `coverUrl` | `string \| null` | URL de la portada |
| `websiteUrl` | `string \| null` | URL del sitio web del cliente (si está configurada) |
| `radioStreamingUrl` | `string \| null` | URL del streaming de audio |
| `videoStreamingUrl` | `string \| null` | URL del streaming de video (HLS) |
| `createdAt` / `updatedAt` | `string` | Fechas ISO 8601 |

> **Nota:** `radioStreamingUrl` y `videoStreamingUrl` se derivan automáticamente del servidor asignado al cliente.

### Errores

```json
// 404
{ "error": "Datos básicos no encontrados" }
```

---

## 3. Redes Sociales

```
GET {BASE}/api/public/{clientId}/social-networks
```

### Respuesta (200 OK)

```json
{
  "facebook": "https://facebook.com/radioejemplo",
  "youtube": "https://youtube.com/@radioejemplo",
  "instagram": "https://instagram.com/radioejemplo",
  "tiktok": "https://tiktok.com/@radioejemplo",
  "whatsapp": "https://wa.me/56912345678",
  "x": "https://x.com/radioejemplo",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-06-01T08:30:00.000Z"
}
```

Todos los campos de red pueden ser `null` si no están configurados.

### Errores

```json
// 404
{ "error": "Redes sociales no encontradas" }
```

---

## 4. Streaming (Radio)

URL del stream, tema en reproducción con carátula, oyentes en vivo y configuración de jingles.

```
GET {BASE}/api/public/{clientId}/streaming
```

### Respuesta (200 OK)

```json
{
  "clientId": "cm7abcdef1234567890",
  "clientName": "Radio Ejemplo FM",
  "mount": "radio_abc123def456",
  "streamUrl": "https://stream.panelipstream.cl/radio_abc123def456",
  "bitrate": 128,
  "status": "autodj",
  "isLive": false,
  "listeners": 12,
  "listenerPeak": 45,
  "jingleConfig": {
    "playEvery": 5,
    "playCount": 1
  },
  "currentTrack": {
    "title": "Nombre del tema",
    "artist": "Artista",
    "album": "Álbum",
    "coverUrl": "https://.../cover.jpg",
    "duration": 240,
    "isJingle": false
  },
  "nextTrack": {
    "title": "Siguiente tema",
    "artist": "Artista",
    "album": "Álbum",
    "coverUrl": null,
    "duration": 180,
    "isJingle": false
  },
  "position": { "index": 3, "total": 20 },
  "lastUpdate": "2025-06-01T10:00:00.000Z"
}
```

### Campos clave

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `string` | `off` \| `autodj` \| `live` |
| `isLive` | `boolean` | `true` si hay DJ conectado en vivo |
| `listeners` | `number` | Oyentes actuales |
| `listenerPeak` | `number` | Pico de oyentes |
| `currentTrack` | `object \| null` | Tema actual (con `coverUrl` si existe) |
| `nextTrack` | `object \| null` | Siguiente tema |
| `position` | `object \| null` | Posición en la playlist (`index`/`total`) |
| `jingleConfig` | `object` | Frecuencia de jingles |

> **Recomendación:** usa `streamUrl` como fuente del reproductor de audio (Icecast MP3).

### Errores

```json
// 404
{ "error": "Streaming no encontrado" }
// 500
{ "error": "Error interno del servidor" }
```

---

## 5. Streaming — Estado en vivo

Variante ligera del endpoint de streaming: solo el estado actual sin los tracks siguiente/posición.

```
GET {BASE}/api/public/{clientId}/streaming/status
```

### Respuesta (200 OK)

```json
{
  "clientId": "cm7abcdef1234567890",
  "clientName": "Radio Ejemplo FM",
  "mount": "radio_abc123def456",
  "bitrate": 128,
  "status": "autodj",
  "isLive": false,
  "listeners": 12,
  "listenerPeak": 45,
  "currentTitle": "Nombre del tema",
  "currentArtist": null,
  "currentCoverUrl": null,
  "streamUrls": {
    "http": "https://stream.panelipstream.cl/radio_abc123def456"
  },
  "lastUpdate": "2025-06-01T10:00:00.000Z"
}
```

> Útil para un "mini reproductor" o un widget que solo muestre el estado y los oyentes.

---

## 6. Programas

```
GET {BASE}/api/public/{clientId}/programs
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "name": "El Mañanero",
    "imageUrl": "{BASE}/api/uploads/{clientId}/programa.jpg",
    "description": "Programa matutino con las noticias más importantes.",
    "startTime": "08:00",
    "endTime": "10:00",
    "weekDays": [1, 2, 3, 4, 5],
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
```

### Campos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `startTime` / `endTime` | `string` | Horas formato `HH:MM` (24h) |
| `weekDays` | `number[]` | Días: `0`=Domingo … `6`=Sábado |

> **Orden:** por `startTime` ascendente.

---

## 7. Noticias

Lista paginada de noticias.

```
GET {BASE}/api/public/{clientId}/news[?page=1&limit=10]
```

### Query Params

| Parámetro | Tipo | Default | Máximo | Descripción |
|-----------|------|---------|--------|-------------|
| `page` | `number` | 1 | — | Número de página |
| `limit` | `number` | 10 | 50 | Elementos por página |

### Respuesta (200 OK)

```json
{
  "data": [
    {
      "id": "cm7abcdef1234567890",
      "name": "Lanzamos nueva programación 2025",
      "slug": "lanzamos-nueva-programacion-2025",
      "shortText": "Este año traemos nuevos programas.",
      "longText": "Con gran entusiasmo anunciamos nuestra nueva programación...",
      "imageUrl": "{BASE}/api/uploads/{clientId}/noticia.jpg",
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  },
  "source": "own"
}
```

### Campo `source`

- `"own"`: las noticias son propias del cliente.
- `"generic"`: el cliente usa noticias genéricas de la plataforma (cada item incluye además `category: { id, name, slug }`).

### Noticia individual por Slug

```
GET {BASE}/api/public/{clientId}/news/{slug}
```

```json
{
  "id": "cm7abcdef1234567890",
  "name": "Lanzamos nueva programación 2025",
  "slug": "lanzamos-nueva-programacion-2025",
  "shortText": "Resumen corto",
  "longText": "Contenido completo...",
  "imageUrl": "...",
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

### Errores

```json
// 404
{ "error": "Noticia no encontrada" }
```

---

## 8. Videos (Ranking)

```
GET {BASE}/api/public/{clientId}/videos
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "name": "Entrevista a banda local",
    "videoUrl": "https://www.youtube.com/watch?v=xxxxxxxxxxx",
    "description": "Conversamos con los músicos.",
    "order": 1,
    "createdAt": "2025-05-20T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
```

> **Orden:** por `order` ascendente (1 = primero).

---

## 9. Auspiciadores (Sponsors)

```
GET {BASE}/api/public/{clientId}/sponsors
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "name": "Tienda Musical S.A.",
    "logoUrl": "{BASE}/api/uploads/{clientId}/sponsor.png",
    "address": "Av. Principal 123, Santiago",
    "description": "La mejor tienda de instrumentos.",
    "facebook": "https://facebook.com/tienda",
    "youtube": null,
    "instagram": "https://instagram.com/tienda",
    "tiktok": null,
    "whatsapp": null,
    "x": null,
    "website": "https://tienda.cl",
    "createdAt": "2025-03-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
```

> **Orden:** por `name` ascendente.

---

## 10. Galerías

```
GET {BASE}/api/public/{clientId}/galleries
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "title": "Concierto de Verano 2025",
    "description": "Fotos del concierto.",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z",
    "images": [
      { "id": "cm7abc...1", "imageUrl": ".../foto-1.jpg", "order": 1 },
      { "id": "cm7abc...2", "imageUrl": ".../foto-2.jpg", "order": 2 }
    ]
  }
]
```

> **Orden:** galerías por `createdAt` desc, imágenes por `order` asc.

---

## 11. Locutores

```
GET {BASE}/api/public/{clientId}/announcers
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "name": "Carlos Méndez",
    "description": "Conductor de 'El Mañanero' desde 2020.",
    "imageUrl": "{BASE}/api/uploads/{clientId}/locutor.jpg",
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
```

---

## 12. Eventos

```
GET {BASE}/api/public/{clientId}/events
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "title": "Festival de la Canción 2025",
    "description": "Transmisión en vivo del festival.",
    "date": "2025-07-15",
    "time": "20:00",
    "location": "Estadio Nacional, Santiago",
    "eventUrl": "https://ejemplo.com/festival",
    "imageUrl": "...",
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T10:00:00.000Z"
  }
]
```

> `date` en formato `YYYY-MM-DD`. **Orden:** `date` desc, `time` asc.

---

## 13. Promociones

```
GET {BASE}/api/public/{clientId}/promotions
```

### Respuesta (200 OK) — array

```json
[
  {
    "id": "cm7abcdef1234567890",
    "title": "2x1 en entradas al festival",
    "description": "Compra una entrada y llévate otra gratis.",
    "imageUrl": "...",
    "link": "https://ejemplo.com/promo",
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T10:00:00.000Z"
  }
]
```

---

## 14. Podcasts (Solo Audio)

```
GET {BASE}/api/public/{clientId}/podcasts[?page=1&limit=10]
```

### Query Params

| Parámetro | Tipo | Default | Máximo |
|-----------|------|---------|--------|
| `page` | `number` | 1 | — |
| `limit` | `number` | 10 | 50 |

### Respuesta (200 OK)

```json
{
  "data": [
    {
      "id": "cm7abcdef1234567890",
      "title": "Entrevista: Historia del Jazz",
      "description": "Un recorrido por la historia del jazz.",
      "imageUrl": "...",
      "audioUrl": "{BASE}/api/uploads/{clientId}/episodio.mp3",
      "duration": 45,
      "episodeNumber": 12,
      "season": 2,
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 8, "pages": 1 }
}
```

### Podcast individual por ID

```
GET {BASE}/api/public/{clientId}/podcasts/{id}
```

> Respuesta: mismo esquema que `data[]` (objeto único, no array).

### Errores

```json
// 404
{ "error": "Episodio no encontrado" }
```

---

## 15. Videocasts (Solo Video)

```
GET {BASE}/api/public/{clientId}/videocasts[?page=1&limit=10]
```

### Respuesta (200 OK)

```json
{
  "data": [
    {
      "id": "cm7abcdef1234567890",
      "title": "Studio Session: Banda en vivo",
      "description": "Grabación en vivo.",
      "imageUrl": "...",
      "videoUrl": "{BASE}/api/uploads/{clientId}/sesion.mp4",
      "duration": 30,
      "episodeNumber": 5,
      "season": 1,
      "createdAt": "2025-05-15T10:00:00.000Z",
      "updatedAt": "2025-05-15T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 3, "pages": 1 }
}
```

### Videocast individual por ID

```
GET {BASE}/api/public/{clientId}/videocasts/{id}
```

### Errores

```json
// 404
{ "error": "Episodio no encontrado" }
```

---

## 16. Encuestas

### Listar encuestas activas

```
GET {BASE}/api/public/{clientId}/polls
```

```json
[
  {
    "id": "cm7abcdef1234567890",
    "title": "¿Qué género musical prefieres?",
    "active": true,
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T10:00:00.000Z",
    "options": [
      { "id": "cm7abc...1", "text": "Rock", "votes": 45 },
      { "id": "cm7abc...2", "text": "Pop", "votes": 32 }
    ]
  }
]
```

> Solo devuelve encuestas con `active: true`.

### Votar en una encuesta

```
POST {BASE}/api/public/{clientId}/polls/{pollId}/vote
```

**Body:**

```json
{
  "optionId": "cm7abcdef1234567890"
}
```

**Respuesta (200 OK):** la encuesta actualizada con los nuevos conteos de votos.

**Errores:**

```json
// 400 — optionId faltante
{ "error": "optionId es requerido" }
// 400 — optionId inválido
{ "error": "Opción no válida" }
// 404 — encuesta no existe o inactiva
{ "error": "Encuesta no encontrada o inactiva" }
```

> **Importante:** el endpoint no tiene protección server-side contra votos duplicados. El sitio debe usar `localStorage` del navegador (clave `poll_{pollId}`) para evitar que un mismo usuario vote dos veces.

---

## 17. Chat

### Obtener mensajes (polling)

```
GET {BASE}/api/public/{clientId}/chat/messages[?since=<iso>&limit=50]
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `since` | `string` (ISO) | Opcional. Devuelve solo mensajes nuevos posteriores a esa fecha |
| `limit` | `number` | Opcional. Máx. mensajes (default 50) |

**Respuesta (200 OK):**

```json
{
  "messages": [
    {
      "id": "cm7abcdef1234567890",
      "authorType": "listener",
      "name": "Oyente 1",
      "body": "Hola radio!",
      "email": "oyente@mail.com",
      "createdAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "serverTime": "2025-06-01T10:00:05.000Z",
  "retentionHours": 24
}
```

- `authorType`: `"listener"` (oyente) o `"admin"` (operador).
- Los mensajes se retienen solo unas horas (`retentionHours`).
- Para polling, guardá el `serverTime` de la última respuesta y pasalo como `since` en la siguiente llamada.

### Enviar mensaje (oyente)

```
POST {BASE}/api/public/{clientId}/chat/messages
```

**Body:**

```json
{
  "name": "Oyente 1",
  "email": "oyente@mail.com",
  "body": "Hola radio!"
}
```

- Rate limit: 5 mensajes/min por IP.
- Se aplican bans configurados por el administrador.

### Oyentes activos

```
GET {BASE}/api/public/{clientId}/chat/online
```

**Respuesta (200 OK):**

```json
{
  "count": 3,
  "recentNames": ["Oyente 1", "Oyente 2"]
}
```

Conteo y nombres de usuarios activos en los últimos 10 minutos.

---

## 18. Registrar Instalación PWA

```
POST {BASE}/api/public/{clientId}/pwa/register
```

**Body:**

```json
{
  "deviceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Respuesta (200 OK):**

```json
{
  "registered": true,
  "total": 42,
  "firstTime": true
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `registered` | `boolean` | `true` si se registró, `false` si ya existía |
| `total` | `number` | Total de instalaciones (después de esta) |
| `firstTime` | `boolean` | `true` si es primera vez de este dispositivo |

> **Idempotente:** si el mismo `deviceId` ya existe, no se duplica. Debe enviarse **una sola vez** por dispositivo.

---

## Guía de Implementación (para la IA del sitio web)

### Ejemplo base

```javascript
const CLIENT_ID = 'TU_CLIENT_ID'
const BASE = 'https://panelipstream.cl'
const API = `${BASE}/api/public/${CLIENT_ID}`
```

### 1. Obtener todos los datos de una vez

```javascript
const res = await fetch(`${API}`)
const data = await res.json()
// data.basicData, data.programs, data.news, data.socialNetworks, ...
```

### 2. Reproductor de radio con tema actual

```javascript
async function loadPlayer() {
  const res = await fetch(`${API}/streaming`)
  const s = await res.json()
  // Reproductor de audio con s.streamUrl
  // Mostrar s.currentTrack (título, artista, carátula), s.listeners
  // Refrescar cada 10-15s
}
```

### 3. Votación en encuestas (con localStorage)

```javascript
const pollsRes = await fetch(`${API}/polls`)
const polls = await pollsRes.json()

polls.forEach((poll) => {
  const voted = localStorage.getItem('poll_' + poll.id)
  if (voted) renderResults(poll)
  else renderVoteForm(poll)
})

async function vote(pollId, optionId) {
  const res = await fetch(`${API}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionId })
  })
  const updated = await res.json()
  localStorage.setItem('poll_' + pollId, 'true')
  // updated.options trae los votos actualizados → calcular porcentajes
}
```

### 4. Chat en vivo (polling)

```javascript
let serverTime = null

async function pollMessages() {
  const url = serverTime ? `${API}/chat/messages?since=${encodeURIComponent(serverTime)}` : `${API}/chat/messages`
  const res = await fetch(url)
  const data = await res.json()
  // Agregar data.messages al chat
  serverTime = data.serverTime
  setTimeout(pollMessages, 3000)
}

async function sendMessage(name, email, body) {
  await fetch(`${API}/chat/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, body })
  })
}
```

### 5. Registro PWA (una sola vez)

```javascript
const KEY = 'ipstream_device_id'
let deviceId = localStorage.getItem(KEY)

if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem(KEY, deviceId)
  await fetch(`${API}/pwa/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId })
  })
}
```

### Manejo de imágenes

Todas las URLs de imágenes se sirven desde:

```
{BASE}/api/uploads/{clientId}/<nombre-archivo>
```

Las imágenes se optimizan automáticamente al subirse (redimensionadas a max 1920px y convertidas a WebP).

### Consideraciones generales

- **CORS:** todos los orígenes habilitados; se puede consumir desde cualquier dominio.
- **Solo lectura:** los GET no modifican datos.
- **Paginación:** `news`, `podcasts` y `videocasts` soportan `page`/`limit`. Los demás devuelven todo.
- **Fechas:** siempre ISO 8601.
- **Cache del reproductor:** los endpoints de streaming usan `Cache-Control: no-store` para reflejar cambios en vivo; el resto puede cachearse.
- **Votos duplicados:** usar `localStorage` en el sitio para encuestas.
