'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

export default function ApiTestPage() {
  const { data: session } = useSession()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    return <div className="text-white">Cargando...</div>
  }

  if (!session?.user.clientId) {
    return <div className="text-white">Error: No se encontró información del cliente</div>
  }

  const clientId = session.user.clientId
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  const endpoints = [
    {
      name: 'Toda la información',
      method: 'GET',
      url: `/api/public/${clientId}`,
      description: 'Obtiene todos los datos del cliente (incluye plantilla seleccionada)'
    },
    {
      name: 'Streaming',
      method: 'GET',
      url: `/api/public/${clientId}/streaming`,
      description: 'URL del stream, metadatos del tema en reproducción con carátula, oyentes en vivo y configuración de jingles'
    },
    {
      name: 'Datos básicos',
      method: 'GET',
      url: `/api/public/${clientId}/basic-data`,
      description: 'Información básica del proyecto'
    },
    {
      name: 'Redes sociales',
      method: 'GET',
      url: `/api/public/${clientId}/social-networks`,
      description: 'Enlaces a redes sociales'
    },
    {
      name: 'Programas',
      method: 'GET',
      url: `/api/public/${clientId}/programs`,
      description: 'Lista de programas de radio'
    },
    {
      name: 'Noticias',
      method: 'GET',
      url: `/api/public/${clientId}/news`,
      description: 'Lista de noticias'
    },
    {
      name: 'Videos',
      method: 'GET',
      url: `/api/public/${clientId}/videos`,
      description: 'Ranking de videos'
    },
    {
      name: 'Auspiciadores',
      method: 'GET',
      url: `/api/public/${clientId}/sponsors`,
      description: 'Lista de sponsors'
    },
    {
      name: 'Galerías',
      method: 'GET',
      url: `/api/public/${clientId}/galleries`,
      description: 'Lista de galerías de imágenes'
    },
    {
      name: 'Locutores',
      method: 'GET',
      url: `/api/public/${clientId}/announcers`,
      description: 'Lista de locutores de la radio'
    },
    {
      name: 'Encuestas',
      method: 'GET',
      url: `/api/public/${clientId}/polls`,
      description: 'Encuestas activas para oyentes'
    },
    {
      name: 'Eventos',
      method: 'GET',
      url: `/api/public/${clientId}/events`,
      description: 'Eventos y transmisiones especiales'
    },
    {
      name: 'Promociones',
      method: 'GET',
      url: `/api/public/${clientId}/promotions`,
      description: 'Lista de promociones'
    },
    {
      name: 'Podcasts',
      method: 'GET',
      url: `/api/public/${clientId}/podcasts`,
      description: 'Lista de episodios de podcast (audio)'
    },
    {
      name: 'Videocasts',
      method: 'GET',
      url: `/api/public/${clientId}/videocasts`,
      description: 'Lista de episodios de videocast (video)'
    },
    {
      name: 'Noticia por Slug',
      method: 'GET',
      url: `/api/public/${clientId}/news/<slug>`,
      description: 'Obtener una noticia específica por su slug'
    },
    {
      name: 'Podcast por ID',
      method: 'GET',
      url: `/api/public/${clientId}/podcasts/<id>`,
      description: 'Obtener un episodio de audio específico'
    },
    {
      name: 'Videocast por ID',
      method: 'GET',
      url: `/api/public/${clientId}/videocasts/<id>`,
      description: 'Obtener un episodio de video específico'
    },
    {
      name: 'Votar en Encuesta',
      method: 'POST',
      url: `/api/public/${clientId}/polls/<pollId>/vote`,
      description: 'Registrar voto en una encuesta activa'
    },
    {
      name: 'Registro PWA',
      method: 'POST',
      url: `/api/public/${clientId}/pwa/register`,
      description: 'Registrar instalación de la PWA desde un dispositivo'
    },
    {
      name: 'Chat: Obtener mensajes (polling)',
      method: 'GET',
      url: `/api/public/${clientId}/chat/messages[?since=<iso>&limit=50]`,
      description: 'Lista mensajes del chat. Con `since` devuelve solo los nuevos (polling).'
    },
    {
      name: 'Chat: Enviar mensaje (oyente)',
      method: 'POST',
      url: `/api/public/${clientId}/chat/messages`,
      description: 'Body: { name, email, body }. Rate limit 5/min. Bans se aplican.'
    },
    {
      name: 'Chat: Oyentes activos',
      method: 'GET',
      url: `/api/public/${clientId}/chat/online`,
      description: 'Conteo y nombres recientes de usuarios activos en los últimos 10 min.'
    }
  ]

  const generateApiGuide = () => {
    const base = baseUrl
    const cid = clientId
    const date = new Date().toLocaleDateString('es-ES')
    const imgBase = `${base}/api/uploads/${cid}`
    const md = `# API REST IPStream — Especificación Completa

> **Cliente ID:** \`${cid}\`
> **URL Base:** ${base}
> **Generado:** ${date}
> **CORS:** Habilitado para todos los orígenes
> **Autenticación:** Ninguna (pública)
> **Formato fechas:** ISO 8601 (\`"2025-06-15T14:30:00.000Z"\`)
> **Imágenes:** \`${imgBase}/<nombre-archivo>\`

---

## 1. Información Completa del Cliente

Obtiene **todos** los datos del cliente en una sola llamada. Incluye plantilla seleccionada y OneSignal App ID.

\`\`\`
GET ${base}/api/public/${cid}
\`\`\`

### Respuesta (200 OK)

\`\`\`json
{
  "client": {
    "id": "${cid}",
    "name": "Radio Ejemplo FM"
  },
  "selectedTemplate": "plantilla-moderna",
  "oneSignalAppId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "basicData": { /* ver endpoint 2 */ },
  "socialNetworks": { /* ver endpoint 3 */ },
  "programs": [ /* ver endpoint 4 */ ],
  "news": [ /* ver endpoint 5 */ ],
  "videos": [ /* ver endpoint 6 */ ],
  "sponsors": [ /* ver endpoint 7 */ ],
  "galleries": [ /* ver endpoint 8 */ ],
  "announcers": [ /* ver endpoint 9 */ ],
  "polls": [ /* ver endpoint 10 */ ],
  "events": [ /* ver endpoint 11 */ ],
  "promotions": [ /* ver endpoint 12 */ ],
  "podcasts": [ /* ver endpoint 13 */ ],
  "videocasts": [ /* ver endpoint 14 */ ]
}
\`\`\`

### Campos raíz

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`client\` | \`{ id: string, name: string }\` | Objeto con ID y nombre del cliente |
| \`selectedTemplate\` | \`string | null\` | Nombre interno de la plantilla seleccionada o \`null\` |
| \`oneSignalAppId\` | \`string | null\` | OneSignal App ID para notificaciones push o \`null\` |
| \`basicData\` | \`object | null\` | Datos básicos |
| \`socialNetworks\` | \`object | null\` | Redes sociales |
| \`programs\` | \`array\` | Programas de radio |
| \`news\` | \`array\` | Últimas 10 noticias |
| \`videos\` | \`array\` | Ranking de videos |
| \`sponsors\` | \`array\` | Auspiciadores |
| \`galleries\` | \`array\` | Galerías de imágenes |
| \`announcers\` | \`array\` | Locutores |
| \`polls\` | \`array\` | Encuestas activas |
| \`events\` | \`array\` | Eventos |
| \`promotions\` | \`array\` | Promociones |
| \`podcasts\` | \`array\` | Últimos 10 podcasts (audio) |
| \`videocasts\` | \`array\` | Últimos 10 videocasts (video) |

### Error

\`\`\`json
// 404
{ "error": "Cliente no encontrado" }
// 500
{ "error": "Error interno del servidor" }
\`\`\`

---

## 2. Datos Básicos

Información general del proyecto de radio.

\`\`\`
GET ${base}/api/public/${cid}/basic-data
\`\`\`

### Respuesta (200 OK)

\`\`\`json
{
  "projectName": "Radio Ejemplo FM",
  "projectDescription": "La radio que te acompaña todos los días con la mejor música y noticias.",
  "logoUrl": "${imgBase}/logo.png",
  "coverUrl": "${imgBase}/cover.jpg",
  "radioStreamingUrl": "https://stream.example.com/radio.mp3",
  "videoStreamingUrl": "https://stream.example.com/video.m3u8",
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-06-01T08:30:00.000Z"
}
\`\`\`

### Esquema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`projectName\` | \`string | null\` | Nombre del proyecto |
| \`projectDescription\` | \`string | null\` | Descripción del proyecto |
| \`logoUrl\` | \`string | null\` | URL del logo |
| \`coverUrl\` | \`string | null\` | URL de la imagen de portada |
| \`radioStreamingUrl\` | \`string | null\` | URL del streaming de audio (MP3) |
| \`videoStreamingUrl\` | \`string | null\` | URL del streaming de video (HLS) |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de última actualización (ISO 8601) |

### Error

\`\`\`json
// 404
{ "error": "Datos básicos no encontrados" }
\`\`\`

---

## 3. Redes Sociales

Enlaces a las redes sociales configuradas.

\`\`\`
GET ${base}/api/public/${cid}/social-networks
\`\`\`

### Respuesta (200 OK)

\`\`\`json
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
\`\`\`

### Esquema

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`facebook\` | \`string | null\` | URL de Facebook |
| \`youtube\` | \`string | null\` | URL de YouTube |
| \`instagram\` | \`string | null\` | URL de Instagram |
| \`tiktok\` | \`string | null\` | URL de TikTok |
| \`whatsapp\` | \`string | null\` | Enlace WhatsApp |
| \`x\` | \`string | null\` | URL de X (Twitter) |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Nota:** Todos los campos de red social pueden ser \`null\` si no están configurados.

### Error

\`\`\`json
// 404
{ "error": "Redes sociales no encontradas" }
\`\`\`

---

## 4. Programas

Lista de programas de radio con horarios.

\`\`\`
GET ${base}/api/public/${cid}/programs
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567890",
    "name": "El Mañanero",
    "imageUrl": "${imgBase}/programa-mananero.jpg",
    "description": "Programa matutino con las noticias más importantes del día.",
    "startTime": "08:00",
    "endTime": "10:00",
    "weekDays": [1, 2, 3, 4, 5],
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  },
  {
    "id": "cm7abcdef1234567891",
    "name": "Rock & Roll Classics",
    "imageUrl": null,
    "description": "Los mejores clásicos del rock de todos los tiempos.",
    "startTime": "18:00",
    "endTime": "20:00",
    "weekDays": [2, 4, 6],
    "createdAt": "2025-02-10T10:00:00.000Z",
    "updatedAt": "2025-05-15T08:30:00.000Z"
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del programa |
| \`name\` | \`string\` | Nombre del programa |
| \`imageUrl\` | \`string | null\` | URL de la imagen del programa |
| \`description\` | \`string | null\` | Descripción del programa |
| \`startTime\` | \`string\` | Hora de inicio (formato HH:MM, 24h) |
| \`endTime\` | \`string\` | Hora de fin (formato HH:MM, 24h) |
| \`weekDays\` | \`number[]\` | Días de la semana: 0=Domingo, 1=Lunes...6=Sábado |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Orden:** Por \`startTime\` ascendente.

---

## 5. Noticias

Lista paginada de noticias. Soporta paginación vía query params.

\`\`\`
GET ${base}/api/public/${cid}/news[?page=1&limit=10]
\`\`\`

### Query Params

| Parámetro | Tipo | Default | Máximo | Descripción |
|-----------|------|---------|--------|-------------|
| \`page\` | \`number\` | 1 | — | Número de página |
| \`limit\` | \`number\` | 10 | 50 | Elementos por página |

### Respuesta (200 OK)

\`\`\`json
{
  "data": [
    {
      "id": "cm7abcdef1234567892",
      "name": "Lanzamos nueva programación 2025",
      "slug": "lanzamos-nueva-programacion-2025",
      "shortText": "Este año traemos nuevos programas y horarios renovados para acompañarte.",
      "longText": "Con gran entusiasmo anunciamos nuestra nueva programación...",
      "imageUrl": "${imgBase}/noticia-programacion.jpg",
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
\`\`\`

### Esquema \`data[]\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único de la noticia |
| \`name\` | \`string\` | Título de la noticia |
| \`slug\` | \`string\` | Slug URL-friendly (para noticia individual) |
| \`shortText\` | \`string | null\` | Resumen corto |
| \`longText\` | \`string | null\` | Contenido completo |
| \`imageUrl\` | \`string | null\` | URL de la imagen |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

### Esquema \`pagination\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`page\` | \`number\` | Página actual |
| \`limit\` | \`number\` | Elementos por página |
| \`total\` | \`number\` | Total de noticias |
| \`pages\` | \`number\` | Total de páginas |

> **Orden:** Por \`createdAt\` descendente.

### Noticia Individual por Slug

\`\`\`
GET ${base}/api/public/${cid}/news/<slug>
\`\`\`

\`\`\`json
{
  "id": "cm7abcdef1234567892",
  "name": "Lanzamos nueva programación 2025",
  "slug": "lanzamos-nueva-programacion-2025",
  "shortText": "Este año traemos nuevos programas y horarios renovados para acompañarte.",
  "longText": "Con gran entusiasmo anunciamos nuestra nueva programación...",
  "imageUrl": "${imgBase}/noticia-programacion.jpg",
  "createdAt": "2025-06-01T10:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
\`\`\`

### Error

\`\`\`json
// 404
{ "error": "Noticia no encontrada" }
\`\`\`

---

## 6. Ranking Videos

Lista de videos del ranking (top por orden).

\`\`\`
GET ${base}/api/public/${cid}/videos
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567893",
    "name": "Entrevista a banda local",
    "videoUrl": "https://www.youtube.com/watch?v=xxxxxxxxxxx",
    "description": "Conversamos con los músicos sobre su nuevo disco.",
    "order": 1,
    "createdAt": "2025-05-20T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del video |
| \`name\` | \`string\` | Título/nombre del video |
| \`videoUrl\` | \`string\` | URL del video (YouTube, Vimeo, etc.) |
| \`description\` | \`string | null\` | Descripción del video |
| \`order\` | \`number\` | Posición en el ranking (1 = primero) |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Orden:** Por \`order\` ascendente.

---

## 7. Auspiciadores (Sponsors)

Lista de patrocinadores con enlaces a redes.

\`\`\`
GET ${base}/api/public/${cid}/sponsors
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567894",
    "name": "Tienda Musical S.A.",
    "logoUrl": "${imgBase}/sponsor-tienda.png",
    "address": "Av. Principal 123, Santiago",
    "description": "La mejor tienda de instrumentos musicales.",
    "facebook": "https://facebook.com/tiendamusical",
    "youtube": "https://youtube.com/@tiendamusical",
    "instagram": "https://instagram.com/tiendamusical",
    "tiktok": null,
    "whatsapp": null,
    "x": null,
    "website": "https://tiendamusical.cl",
    "createdAt": "2025-03-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del auspiciador |
| \`name\` | \`string\` | Nombre del auspiciador |
| \`logoUrl\` | \`string | null\` | URL del logo |
| \`address\` | \`string | null\` | Dirección |
| \`description\` | \`string | null\` | Descripción |
| \`facebook\` | \`string | null\` | URL Facebook |
| \`youtube\` | \`string | null\` | URL YouTube |
| \`instagram\` | \`string | null\` | URL Instagram |
| \`tiktok\` | \`string | null\` | URL TikTok |
| \`whatsapp\` | \`string | null\` | Enlace WhatsApp |
| \`x\` | \`string | null\` | URL X (Twitter) |
| \`website\` | \`string | null\` | Sitio web |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Orden:** Por \`name\` ascendente.

---

## 8. Galerías

Galerías de imágenes con sus fotos.

\`\`\`
GET ${base}/api/public/${cid}/galleries
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567895",
    "title": "Concierto de Verano 2025",
    "description": "Fotos del concierto que realizamos en enero.",
    "createdAt": "2025-02-01T10:00:00.000Z",
    "updatedAt": "2025-02-01T10:00:00.000Z",
    "images": [
      {
        "id": "cm7abcdef1234567896",
        "imageUrl": "${imgBase}/galeria-concierto-1.jpg",
        "order": 1
      },
      {
        "id": "cm7abcdef1234567897",
        "imageUrl": "${imgBase}/galeria-concierto-2.jpg",
        "order": 2
      }
    ]
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único de la galería |
| \`title\` | \`string\` | Título de la galería |
| \`description\` | \`string | null\` | Descripción |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |
| \`images\` | \`array\` | Array de imágenes (ver abajo) |

### Esquema \`images[]\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único de la imagen |
| \`imageUrl\` | \`string\` | URL de la imagen |
| \`order\` | \`number\` | Orden de visualización |

> **Orden:** Galerías por \`createdAt\` descendente. Imágenes por \`order\` ascendente.

---

## 9. Locutores

Lista de locutores/conductores de la radio.

\`\`\`
GET ${base}/api/public/${cid}/announcers
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567898",
    "name": "Carlos Méndez",
    "description": "Conductor de 'El Mañanero' desde 2020. Apasionado por la música y el periodismo.",
    "imageUrl": "${imgBase}/locutor-carlos.jpg",
    "createdAt": "2025-01-20T10:00:00.000Z",
    "updatedAt": "2025-06-01T08:30:00.000Z"
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del locutor |
| \`name\` | \`string\` | Nombre del locutor |
| \`description\` | \`string | null\` | Biografía o descripción |
| \`imageUrl\` | \`string | null\` | URL de la foto |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Orden:** Por \`createdAt\` descendente.

---

## 10. Encuestas (Activas)

Encuestas disponibles para votación. Solo devuelve las que están activas.

\`\`\`
GET ${base}/api/public/${cid}/polls
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567899",
    "title": "¿Qué género musical prefieres?",
    "active": true,
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T10:00:00.000Z",
    "options": [
      {
        "id": "cm7abcdef1234567900",
        "text": "Rock",
        "votes": 45
      },
      {
        "id": "cm7abcdef1234567901",
        "text": "Pop",
        "votes": 32
      },
      {
        "id": "cm7abcdef1234567902",
        "text": "Electrónica",
        "votes": 18
      }
    ]
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único de la encuesta |
| \`title\` | \`string\` | Pregunta de la encuesta |
| \`active\` | \`boolean\` | Siempre \`true\` (solo activas) |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |
| \`options\` | \`array\` | Opciones de voto (ver abajo) |

### Esquema \`options[]\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único de la opción |
| \`text\` | \`string\` | Texto de la opción |
| \`votes\` | \`number\` | Conteo de votos |

> **Orden:** Por \`createdAt\` descendente.

---

## 11. Eventos

Lista de eventos y transmisiones especiales.

\`\`\`
GET ${base}/api/public/${cid}/events
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567903",
    "title": "Festival de la Canción 2025",
    "description": "Transmisión en vivo del festival con entrevistas exclusivas.",
    "date": "2025-07-15",
    "time": "20:00",
    "location": "Estadio Nacional, Santiago",
    "eventUrl": "https://ejemplo.com/festival",
    "imageUrl": "${imgBase}/evento-festival.jpg",
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T10:00:00.000Z"
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del evento |
| \`title\` | \`string\` | Título del evento |
| \`description\` | \`string | null\` | Descripción |
| \`date\` | \`string | null\` | Fecha (formato YYYY-MM-DD) |
| \`time\` | \`string | null\` | Hora (formato HH:MM, 24h) |
| \`location\` | \`string | null\` | Ubicación |
| \`eventUrl\` | \`string | null\` | URL relacionada al evento |
| \`imageUrl\` | \`string | null\` | URL de la imagen del evento |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Orden:** Por \`date\` descendente y \`time\` ascendente.

---

## 12. Promociones

Lista de promociones activas.

\`\`\`
GET ${base}/api/public/${cid}/promotions
\`\`\`

### Respuesta (200 OK)

\`\`\`json
[
  {
    "id": "cm7abcdef1234567904",
    "title": "2x1 en entradas al festival",
    "description": "Compra una entrada y llévate otra gratis. Válido hasta el 31 de julio.",
    "imageUrl": "${imgBase}/promo-2x1.jpg",
    "link": "https://ejemplo.com/promo",
    "createdAt": "2025-06-01T10:00:00.000Z",
    "updatedAt": "2025-06-01T10:00:00.000Z"
  }
]
\`\`\`

### Esquema (array de objetos)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único de la promoción |
| \`title\` | \`string\` | Título de la promoción |
| \`description\` | \`string | null\` | Descripción |
| \`imageUrl\` | \`string | null\` | URL de la imagen |
| \`link\` | \`string | null\` | URL de destino |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

> **Orden:** Por \`createdAt\` descendente.

---

## 13. Podcasts (Solo Audio)

Episodios de podcast de audio con paginación.

\`\`\`
GET ${base}/api/public/${cid}/podcasts[?page=1&limit=10]
\`\`\`

### Query Params

| Parámetro | Tipo | Default | Máximo | Descripción |
|-----------|------|---------|--------|-------------|
| \`page\` | \`number\` | 1 | — | Número de página |
| \`limit\` | \`number\` | 10 | 50 | Elementos por página |

### Respuesta (200 OK)

\`\`\`json
{
  "data": [
    {
      "id": "cm7abcdef1234567905",
      "title": "Entrevista: Historia del Jazz",
      "description": "Un recorrido por la historia del jazz con el músico invitado.",
      "imageUrl": "${imgBase}/podcast-jazz.jpg",
      "audioUrl": "${imgBase}/podcast-jazz.mp3",
      "duration": 45,
      "episodeNumber": 12,
      "season": 2,
      "createdAt": "2025-06-01T10:00:00.000Z",
      "updatedAt": "2025-06-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8,
    "pages": 1
  }
}
\`\`\`

### Esquema \`data[]\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del episodio |
| \`title\` | \`string\` | Título del episodio |
| \`description\` | \`string | null\` | Descripción |
| \`imageUrl\` | \`string | null\` | URL de la carátula |
| \`audioUrl\` | \`string | null\` | URL del archivo de audio |
| \`duration\` | \`number | null\` | Duración en minutos |
| \`episodeNumber\` | \`number | null\` | Número de episodio |
| \`season\` | \`number | null\` | Número de temporada |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

### Podcast Individual por ID

\`\`\`
GET ${base}/api/public/${cid}/podcasts/<id>
\`\`\`

> Respuesta: mismo esquema que \`data[]\`, objeto único (no array).

### Error

\`\`\`json
// 404
{ "error": "Episodio no encontrado" }
\`\`\`

---

## 14. Videocasts (Solo Video)

Episodios de videocast (video) con paginación.

\`\`\`
GET ${base}/api/public/${cid}/videocasts[?page=1&limit=10]
\`\`\`

### Query Params

| Parámetro | Tipo | Default | Máximo | Descripción |
|-----------|------|---------|--------|-------------|
| \`page\` | \`number\` | 1 | — | Número de página |
| \`limit\` | \`number\` | 10 | 50 | Elementos por página |

### Respuesta (200 OK)

\`\`\`json
{
  "data": [
    {
      "id": "cm7abcdef1234567906",
      "title": "Studio Session: Banda en vivo",
      "description": "Grabación en vivo desde nuestro estudio.",
      "imageUrl": "${imgBase}/videocast-session.jpg",
      "videoUrl": "${imgBase}/videocast-session.mp4",
      "duration": 30,
      "episodeNumber": 5,
      "season": 1,
      "createdAt": "2025-05-15T10:00:00.000Z",
      "updatedAt": "2025-05-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 3,
    "pages": 1
  }
}
\`\`\`

### Esquema \`data[]\`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`id\` | \`string\` | ID único del episodio |
| \`title\` | \`string\` | Título del episodio |
| \`description\` | \`string | null\` | Descripción |
| \`imageUrl\` | \`string | null\` | URL de la carátula |
| \`videoUrl\` | \`string | null\` | URL del archivo de video |
| \`duration\` | \`number | null\` | Duración en minutos |
| \`episodeNumber\` | \`number | null\` | Número de episodio |
| \`season\` | \`number | null\` | Número de temporada |
| \`createdAt\` | \`string\` | Fecha de creación (ISO 8601) |
| \`updatedAt\` | \`string\` | Fecha de actualización (ISO 8601) |

### Videocast Individual por ID

\`\`\`
GET ${base}/api/public/${cid}/videocasts/<id>
\`\`\`

> Respuesta: mismo esquema que \`data[]\`, objeto único (no array).

### Error

\`\`\`json
// 404
{ "error": "Episodio no encontrado" }
\`\`\`

---

## 15. Votar en Encuesta (POST)

Registra un voto en una opción de encuesta activa. Es **idempotente**: el endpoint no tiene protección del lado servidor contra votos duplicados (usa \`localStorage\` del cliente).

\`\`\`
POST ${base}/api/public/${cid}/polls/<pollId>/vote
\`\`\`

### Request Body

\`\`\`json
{
  "optionId": "cm7abcdef1234567900"
}
\`\`\`

### Campos del Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| \`optionId\` | \`string\` | Sí | ID de la opción a votar |

### Respuesta (200 OK) — Encuesta actualizada

\`\`\`json
{
  "id": "cm7abcdef1234567899",
  "title": "¿Qué género musical prefieres?",
  "active": true,
  "options": [
    { "id": "cm7abcdef1234567900", "text": "Rock", "votes": 46 },
    { "id": "cm7abcdef1234567901", "text": "Pop", "votes": 32 },
    { "id": "cm7abcdef1234567902", "text": "Electrónica", "votes": 18 }
  ]
}
\`\`\`

### Errores

\`\`\`json
// 400 — optionId faltante
{ "error": "optionId es requerido" }

// 400 — optionId inválido
{ "error": "Opción no válida" }

// 404 — Encuesta no existe o inactiva
{ "error": "Encuesta no encontrada o inactiva" }
\`\`\`

---

## 16. Registrar Instalación PWA (POST)

Registra la instalación de la PWA desde un dispositivo.

\`\`\`
POST ${base}/api/public/${cid}/pwa/register
\`\`\`

### Request Body

\`\`\`json
{
  "deviceId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
\`\`\`

### Campos del Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| \`deviceId\` | \`string\` | Sí | UUID único del dispositivo |

### Respuesta (200 OK)

\`\`\`json
{
  "registered": true,
  "total": 42,
  "firstTime": true
}
\`\`\`

### Esquema de Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| \`registered\` | \`boolean\` | \`true\` si se registró, \`false\` si ya existía |
| \`total\` | \`number\` | Total de instalaciones registradas (después de esta) |
| \`firstTime\` | \`boolean\` | \`true\` si es primera vez de este dispositivo |

> El endpoint es **idempotente**: si el mismo \`deviceId\` ya fue registrado, no se duplica.

### Error

\`\`\`json
// 400 — deviceId faltante
{ "error": "deviceId es requerido" }

// 404
{ "error": "Cliente no encontrado" }
\`\`\`

---

## Guía de Implementación

### Lógica de Votación (Frontend)

\`\`\`javascript
const API = '${base}/api/public/${cid}'

// 1. Obtener encuestas activas
const pollsRes = await fetch(API + '/polls')
const polls = await pollsRes.json()

// 2. Para cada encuesta, verificar si ya votó
polls.forEach(poll => {
  const voted = localStorage.getItem('poll_' + poll.id)
  if (voted) {
    renderResults(poll)
  } else {
    renderVoteForm(poll)
  }
})

// 3. Enviar voto
async function vote(pollId, optionId) {
  const res = await fetch(API + '/polls/' + pollId + '/vote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ optionId })
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error)
  }

  const updated = await res.json()

  // 4. Marcar como votado en localStorage
  localStorage.setItem('poll_' + pollId, 'true')

  // 5. Calcular porcentajes
  const total = updated.options.reduce((sum, o) => sum + o.votes, 0)
  return updated.options.map(opt => ({
    text: opt.text,
    votes: opt.votes,
    pct: total > 0 ? Math.round((opt.votes / total) * 100) : 0
  }))
}
\`\`\`

### Lógica de Instalación PWA

\`\`\`javascript
const API = '${base}/api/public/${cid}'
const STORAGE_KEY = 'ipstream_device_id'

// Verificar si ya tenemos deviceId (se ejecuta UNA SOLA VEZ por dispositivo)
let deviceId = localStorage.getItem(STORAGE_KEY)

if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, deviceId)

  // Registrar la instalación
  const res = await fetch(API + '/pwa/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId })
  })

  const data = await res.json()
  console.log('PWA registrada:', data)
}
\`\`\`

### Manejo de Imágenes

Todas las URLs de imágenes se sirven desde:

\`\`\`
${imgBase}/<nombre-archivo>
\`\`\`

Ejemplo:
\`\`\`
${imgBase}/logo.png
${imgBase}/programa-mananero.jpg
${imgBase}/galeria-concierto-1.jpg
\`\`\`

Las imágenes se optimizan automáticamente al subirse (redimensionadas a max 1920px y convertidas a WebP).

### Consideraciones Generales

- **Solo lectura:** Todos los endpoints GET son de solo lectura.
- **POST:** Solo los endpoints \`/polls/[id]/vote\` y \`/pwa/register\` aceptan POST.
- **CORS:** Habilitado para todos los orígenes (\`Access-Control-Allow-Origin: *\`).
- **Paginación:** Los endpoints de \`news\`, \`podcasts\` y \`videocasts\` soportan paginación. Los demás devuelven todos los elementos.
- **Fechas:** Siempre en formato ISO 8601.
- **IDs:** Son strings generadas por Prisma (formato \`cm7...\`).
`

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `guia-api-${cid}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Prueba de API REST
          </h1>
          <p className="text-gray-400">
            Prueba todos los endpoints de tu API REST pública
          </p>
        </div>
        <button
          onClick={generateApiGuide}
          className="btn-primary flex items-center gap-2 shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Descargar Guía API
        </button>
      </div>

      <div className="glass-effect rounded-xl p-6">
        <h3 className="text-lg font-medium text-cyan-400 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Tu Client ID
        </h3>
        <code className="bg-gray-700/50 px-4 py-3 rounded-lg text-sm text-cyan-300 font-mono block border border-gray-600">
          {clientId}
        </code>
        <p className="text-xs text-gray-400 mt-2">
          Usa este ID para acceder a tu API REST pública
        </p>
      </div>

      <div className="grid gap-6">
        {endpoints.map((endpoint) => (
          <div key={endpoint.url} className="card hover:scale-[1.02] transition-transform duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2">
                  {endpoint.name}
                </h3>
                <p className="text-gray-400">
                  {endpoint.description}
                </p>
              </div>
              <div className="flex space-x-3 ml-4">
                <a
                  href={endpoint.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseUrl}${endpoint.url}`)
                    // Opcional: mostrar notificación de copiado
                  }}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copiar
                </button>
              </div>
            </div>
            <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600 flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                endpoint.method === 'POST' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}>
                {endpoint.method}
              </span>
              <code className="text-sm text-green-400 font-mono break-all">
                {baseUrl}{endpoint.url}
              </code>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 text-purple-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Sistema de Plantillas
        </h3>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-6 mb-4">
          <p className="text-gray-300 mb-4">
            El endpoint principal <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">/api/public/{clientId}</code> ahora incluye el campo <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">selectedTemplate</code> que contiene el nombre de la plantilla que seleccionaste en tu dashboard.
          </p>
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <pre className="text-purple-300 text-sm leading-relaxed overflow-x-auto">
{`{
  "client": { "id": "${clientId}", "name": "..." },
  "selectedTemplate": "plantilla-moderna",  // ← Plantilla seleccionada
  "basicData": { ... },
  "socialNetworks": { ... },
  "programs": [ ... ],
  // ... resto de datos
}`}
            </pre>
          </div>
        </div>
        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cómo usar la plantilla en tu sitio web
          </h4>
          <p className="text-gray-400 text-sm">
            El sitio web debe leer el campo <code className="text-purple-400">selectedTemplate</code> y cargar la plantilla correspondiente. Si es <code className="text-purple-400">null</code>, usar una plantilla por defecto.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Encuestas: Lógica de Votación
        </h3>
        <p className="text-gray-300 mb-6">
          Implementa las encuestas en tu sitio web. El endpoint de votación valida que la encuesta esté activa
          y que la opción exista. Usa <code className="text-green-400 bg-gray-800 px-1.5 py-0.5 rounded">localStorage</code> del lado cliente
          para evitar votos duplicados.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold mr-2">1</span>
              Obtener encuestas activas
            </h4>
            <pre className="text-green-300 text-xs leading-relaxed overflow-x-auto">
{`const res = await fetch(
  '${baseUrl}/api/public/${clientId}/polls'
)
const polls = await res.json()
// polls = [{ id, title, options }]`}
            </pre>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold mr-2">2</span>
              Verificar voto existente
            </h4>
            <pre className="text-green-300 text-xs leading-relaxed overflow-x-auto">
{`const voted = localStorage.getItem(
  'poll_' + pollId
)
if (voted) {
  // Mostrar resultados directamente
  return showResults()
}`}
            </pre>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold mr-2">3</span>
              Enviar voto al servidor
            </h4>
            <pre className="text-green-300 text-xs leading-relaxed overflow-x-auto">
{`const res = await fetch(
  '${baseUrl}/api/public/${clientId}/polls/' + pollId + '/vote',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      optionId: selectedOptionId
    })
  }
)
const data = await res.json()`}
            </pre>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-green-400 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-xs font-bold mr-2">4</span>
              Guardar voto y mostrar resultados
            </h4>
            <pre className="text-green-300 text-xs leading-relaxed overflow-x-auto">
{`localStorage.setItem(
  'poll_' + pollId, 'true'
)
// data.options trae los votos actualizados
const total = data.options.reduce(
  (sum, o) => sum + o.votes, 0
)
data.options.forEach(opt => {
  const pct = total > 0
    ? Math.round(opt.votes / total * 100)
    : 0
  console.log(opt.text, pct + '%')
})`}
            </pre>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recomendaciones
          </h4>
          <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
            <li>El endpoint rechaza encuestas inactivas o <code className="text-green-400">optionId</code> inválidos</li>
            <li><code className="text-green-400">localStorage</code> evita votos duplicados del mismo navegador, pero el usuario puede borrarlo</li>
            <li>Si necesitas protección por IP, el administrador del sistema puede agregar esa lógica en el endpoint</li>
            <li>Siempre muestra los resultados después de votar para mejor experiencia de usuario</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 text-indigo-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          PWA: Lógica de Instalación
        </h3>
        <p className="text-gray-300 mb-6">
          Implementa el registro de instalación en tu PWA. La app debe enviar un <code className="text-indigo-400 bg-gray-800 px-1.5 py-0.5 rounded">deviceId</code> único por dispositivo
          al endpoint de registro <strong className="text-white">una sola vez</strong>.
        </p>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold mr-2">1</span>
              Generar deviceId (una sola vez)
            </h4>
            <pre className="text-indigo-300 text-xs leading-relaxed overflow-x-auto">
{`const KEY = 'ipstream_device_id'
let deviceId = localStorage.getItem(KEY)

if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem(KEY, deviceId)
}`}
            </pre>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold mr-2">2</span>
              Registrar instalación (solo si es nuevo)
            </h4>
            <pre className="text-indigo-300 text-xs leading-relaxed overflow-x-auto">
{`if (!localStorage.getItem(KEY + '_sent')) {
  await fetch('${baseUrl}/api/public/${clientId}/pwa/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ deviceId })
  })
  localStorage.setItem(KEY + '_sent', 'true')
}`}
            </pre>
          </div>
        </div>

        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-indigo-400 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Recomendaciones
          </h4>
          <ul className="text-gray-400 text-sm space-y-1 list-disc list-inside">
            <li>Usa <code className="text-indigo-400">crypto.randomUUID()</code> para generar un ID único por dispositivo</li>
            <li>El endpoint es idempotente: si el mismo <code className="text-indigo-400">deviceId</code> ya existe, no se duplica</li>
            <li>El registro se hace <strong className="text-white">una sola vez</strong> por dispositivo, no en cada carga</li>
            <li>Puedes ver el conteo de instalaciones en tu Dashboard principal</li>
          </ul>
        </div>
      </div>

      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center">
          <svg className="w-6 h-6 text-cyan-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Ejemplo de uso con JavaScript
        </h3>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 overflow-x-auto">
          <pre className="text-green-400 text-sm leading-relaxed">
{`// Obtener toda la información del cliente (incluye plantilla)
fetch('${baseUrl}/api/public/${clientId}')
  .then(response => response.json())
  .then(data => {
    console.log('Datos completos:', data)
    console.log('Plantilla seleccionada:', data.selectedTemplate)
    
    // Cargar la plantilla correspondiente
    const templateName = data.selectedTemplate || 'default'
    loadTemplate(templateName)
  })

// Obtener solo los programas
fetch('${baseUrl}/api/public/${clientId}/programs')
  .then(response => response.json())
  .then(programs => console.log(programs))

// Obtener ranking de videos
fetch('${baseUrl}/api/public/${clientId}/videos')
  .then(response => response.json())
  .then(videos => {
    console.log('Top 10 videos:', videos)
    // Los videos vienen ordenados por ranking (order ASC)
  })

// Obtener noticias con paginación
fetch('${baseUrl}/api/public/${clientId}/news?page=1&limit=5')
  .then(response => response.json())
  .then(data => {
    console.log('Noticias:', data.data)
    console.log('Paginación:', data.pagination)
  })

// Obtener podcasts (audio) con paginación
fetch('${baseUrl}/api/public/${clientId}/podcasts?page=1&limit=10')
  .then(response => response.json())
  .then(data => {
    console.log('Podcasts de audio:', data.data)
    console.log('Paginación:', data.pagination)
  })

// Obtener videocasts (video) con paginación
fetch('${baseUrl}/api/public/${clientId}/videocasts?page=1&limit=10')
  .then(response => response.json())
  .then(data => {
    console.log('Videocasts:', data.data)
    console.log('Paginación:', data.pagination)
  })

// Obtener galerías de imágenes
fetch('${baseUrl}/api/public/${clientId}/galleries')
  .then(response => response.json())
  .then(galleries => {
    console.log('Galerías:', galleries)
    // Cada galería tiene: id, title, description, images[]
    // Cada imagen tiene: id, imageUrl, order
  })

// Obtener locutores
fetch('${baseUrl}/api/public/${clientId}/announcers')
  .then(response => response.json())
  .then(announcers => {
    console.log('Locutores:', announcers)
    // Cada locutor tiene: id, name, description, imageUrl
  })

// Obtener eventos
fetch('${baseUrl}/api/public/${clientId}/events')
  .then(response => response.json())
  .then(events => {
    console.log('Eventos:', events)
    // Cada evento tiene: id, title, description, date, time, location, eventUrl, imageUrl
  })

// Registrar instalación PWA (ejecutar una sola vez por dispositivo)
const PWA_KEY = 'ipstream_device_id'
let deviceId = localStorage.getItem(PWA_KEY)
if (!deviceId) {
  deviceId = crypto.randomUUID()
  localStorage.setItem(PWA_KEY, deviceId)
  fetch('${baseUrl}/api/public/${clientId}/pwa/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId })
  })
  localStorage.setItem(PWA_KEY + '_sent', 'true')
}`}
          </pre>
        </div>
      </div>
    </div>
  )
}