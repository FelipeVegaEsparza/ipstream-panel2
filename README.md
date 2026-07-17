# IPStream Panel

Panel completo de gestión de contenido para radio y streaming con API REST pública.
**Incluye módulo de streaming propio** con Icecast 2 + liquidsoap (AutoDJ, playlists, biblioteca MP3, DJ en vivo).

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
- Admin seed automático: `admin@ipstream.com` / `admin123456` (cambialo en `.env.docker`)

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

Sin `since` devuelve los últimos N mensajes. Con `since` devuelve solo los mensajes con `createdAt > since`.

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

Borra todos los mensajes con más de 48 h. Configurar para correr cada 1 h en el proveedor (Vercel Cron / externo). Si `CRON_SECRET` no está configurado, el endpoint no exige auth (útil para desarrollo local).

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