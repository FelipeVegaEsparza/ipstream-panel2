# Resumen del Proyecto: IPStream Panel (radio-dashboard)

## Descripción General
Panel completo de gestión de contenido para radio y streaming. Los clientes (radios/streamers) gestionan su contenido (programas, noticias, videos, podcasts, videocasts, auspiciadores, promociones, galerías, locutores, encuestas, eventos) y lo exponen mediante API REST pública. Incluye panel de administración para usuarios, planes, pagos, plantillas web, notificaciones push y tracking de instalaciones PWA.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 14.0.4 (App Router), React 18, TypeScript 5 |
| **Estilos** | Tailwind CSS 3.3.6 |
| **UI** | Headless UI 1.7, Heroicons 2.0, Lucide React, Radix UI |
| **Gráficos** | Recharts 3.1 |
| **Formularios** | React Hook Form 7.60, Zod 3.25 |
| **Autenticación** | NextAuth.js 4.24.5 (JWT, credenciales) |
| **ORM** | Prisma 5.7.1 |
| **BD** | MySQL (utf8mb4) |
| **Imágenes** | Sharp 0.34 |
| **Encriptación** | AES-256-GCM (crypto nativo) |
| **Linter** | ESLint 8, Next.js 14 |

---

## Estructura de Directorios

```
app/                          # Next.js App Router
├── admin/                    # Panel admin (usuarios, planes, pagos, stats, logs, plantillas)
├── api/                      # API Routes
│   ├── admin/                #   CRUD de administración
│   ├── announcers/           #   CRUD locutores
│   ├── auth/                 #   NextAuth + registro
│   ├── basic-data/           #   CRUD datos básicos
│   ├── cron/                 #   Tareas programadas
│   ├── dashboard/            #   Endpoints del dashboard
│   ├── events/               #   CRUD eventos
│   ├── galleries/            #   CRUD galerías
│   ├── health/               #   Health check
│   ├── news/                 #   CRUD noticias
│   ├── podcasts/             #   CRUD podcasts
│   ├── polls/                #   CRUD encuestas
│   ├── programs/             #   CRUD programas
│   ├── promotions/           #   CRUD promociones
│   ├── public/[clientId]/    #   ★ API REST pública (19 endpoints, CORS)
│   ├── social-networks/      #   CRUD redes sociales
│   ├── sponsors/             #   CRUD auspiciadores
│   ├── upload/               #   Subida/borrado de archivos (Sharp + WebP)
│   ├── uploads/              #   Servir archivos subidos
│   ├── videocasts/           #   CRUD videocasts
│   ├── videos/               #   CRUD videos
│   └── webhook/onesignal/    #   Webhook OneSignal
├── auth/                     # Páginas de login/register
├── dashboard/                # Dashboard del cliente (todos los módulos CRUD)
├── globals.css               # Tailwind
├── layout.tsx                # Layout raíz
└── page.tsx                  # Redirección

components/
├── admin/                    # 32 componentes del panel admin
├── dashboard/                # 27 componentes del dashboard cliente
├── providers/                # AuthSessionProvider, ImpersonationProvider, etc.
└── ui/                       # Componentes reutilizables (button, card, modal, tabs, upload, etc.)

lib/                          # Lógica compartida (auth, prisma, validaciones, encriptación, etc.)
prisma/                       # schema.prisma + migraciones
types/                        # next-auth.d.ts (tipos extendidos)
scripts/                      # create-admin.js, cleanup-pending-payments.js
public/uploads/               # Archivos subidos por clientes
```

---

## Base de Datos — 20 Modelos

| Modelo | Tabla | Descripción |
|--------|-------|-------------|
| User | `users` | Usuarios (CLIENT o ADMIN) |
| Client | `clients` | Clientes vinculados a usuarios |
| BasicData | `basic_data` | Info del proyecto radio/streaming |
| SocialNetworks | `social_networks` | Redes sociales del cliente |
| Program | `programs` | Programas con horario y días |
| News | `news` | Noticias con slug único |
| RankingVideo | `ranking_videos` | Videos ordenables |
| Sponsor | `sponsors` | Auspiciadores con logo |
| Promotion | `promotions` | Promociones con imagen/enlace |
| Podcast | `podcasts` | Episodios de audio |
| Event | `events` | Eventos y transmisiones especiales |
| Gallery | `galleries` | Galerías de imágenes |
| GalleryImage | `gallery_images` | Imágenes dentro de una galería |
| Announcer | `announcers` | Locutores/conductores |
| Poll | `polls` | Encuestas para oyentes |
| PollOption | `poll_options` | Opciones de cada encuesta |
| PwaInstall | `pwa_installs` | Instalaciones PWA por dispositivo |
| Plan | `plans` | Planes de suscripción (precio, moneda, intervalo) |
| Subscription | `subscriptions` | Suscripciones activas de clientes |
| Payment | `payments` | Pagos (estado, método, comprobante) |
| Template | `templates` | Plantillas web para clientes |
| PushNotification | `push_notifications` | Notificaciones push (OneSignal) |

IDs: CUID · Timestamps: createdAt/updatedAt · Cascade delete desde Client · Charset: utf8mb4

---

## Roles y Autenticación

- **CLIENT** → acceso `/dashboard/*` (gestión de su propio contenido)
- **ADMIN** → acceso `/admin/*` (gestión global + impersonación de clientes)
- NextAuth con estrategia JWT, cookies HTTP-only
- Middleware protege rutas según rol

---

## API REST Pública (sin auth, CORS habilitado)

```
GET    /api/public/[clientId]                              # Datos completos
GET    /api/public/[clientId]/basic-data                   # Info básica
GET    /api/public/[clientId]/social-networks              # Redes sociales
GET    /api/public/[clientId]/programs                     # Programas
GET    /api/public/[clientId]/news[?page=&limit=]          # Noticias (paginada)
GET    /api/public/[clientId]/news/[slug]                  # Noticia por slug
GET    /api/public/[clientId]/videos                       # Ranking videos
GET    /api/public/[clientId]/sponsors                     # Auspiciadores
GET    /api/public/[clientId]/promotions                   # Promociones
GET    /api/public/[clientId]/podcasts[?page=&limit=]      # Podcasts (paginada)
GET    /api/public/[clientId]/podcasts/[id]                # Podcast por ID
GET    /api/public/[clientId]/videocasts[?page=&limit=]    # Videocasts (paginada)
GET    /api/public/[clientId]/videocasts/[id]              # Videocast por ID
GET    /api/public/[clientId]/galleries                    # Galerías
GET    /api/public/[clientId]/announcers                   # Locutores
GET    /api/public/[clientId]/polls                        # Encuestas activas
GET    /api/public/[clientId]/events                       # Eventos
POST   /api/public/[clientId]/polls/[id]/vote              # Votar ({ optionId })
POST   /api/public/[clientId]/pwa/register                 # Registrar PWA ({ deviceId })
```

---

## Funcionalidades Principales

### Dashboard Cliente
- Datos básicos del proyecto (nombre, descripción, logos, URLs de streaming)
- Redes sociales (Facebook, YouTube, Instagram, TikTok, WhatsApp, X/Twitter)
- Programación (programas con horario HH:MM y días de semana)
- Noticias (CRUD con slug único, texto corto/largo, imágenes)
- Ranking de videos (ordenable, URL + descripción)
- Auspiciadores (logo, dirección, redes)
- Promociones (imagen, descripción, enlace)
- Podcasts (episodios de audio con nº, temporada, duración)
- Videocasts (episodios de video YouTube embebido)
- **Galerías** — imágenes agrupadas con drag & drop y reordenamiento
- **Locutores** — conductores con foto y biografía
- **Encuestas** — preguntas con opciones, activar/desactivar, barras de resultados
- **Eventos** — transmisiones especiales con fecha, hora, ubicación
- Notificaciones push (OneSignal)
- Selector de plantilla web
- Estado de pagos y suscripción
- **Conteo de instalaciones PWA** en el dashboard principal
- Probador de API integrado (`/dashboard/api-test`) con descarga de guía completa en Markdown
- Subida de imágenes con drag & drop

### Navegación del Dashboard
- Sidebar con secciones agrupadas (General, Contenido, Interactivos, Sistema)
- Acordeón colapsable por sección, estado persistido en localStorage
- Indicador activo con barra cyan y `aria-current="page"`

### Panel Admin
- Dashboard con estadísticas globales
- CRUD de usuarios y clientes
- CRUD de planes de suscripción
- Gestión de suscripciones (activa, vencida, cancelada)
- Gestión de pagos (registro, confirmación, comprobantes)
- CRUD de plantillas web
- Impersonación de clientes (soporte técnico)
- Estadísticas con gráficos (Recharts)
- Visor de logs con filtros
- Configuración del sistema (seguridad, notificaciones, backups)
- Facturación
- Info del sistema (licencia, changelog, soporte)

### Sistema de Pagos
- Planes con precio, moneda (CLP/USD), intervalo (mensual/anual)
- Suscripciones: active, cancelled, expired, pending
- Pagos: pending, completed, failed, refunded
- Métodos: credit_card, bank_transfer, paypal, other
- Generación automática de pagos mensuales
- Ciclo basado en día del mes de inicio
- Extensión automática al completar pagos
- Comprobantes (imagen/PDF)

### Notificaciones Push (OneSignal)
- Envío y programación de notificaciones
- Seguimiento: pending, sent, failed
- OneSignal App ID y API Key por cliente (encriptados AES-256-GCM)
- Webhook para eventos

---

## Variables de Entorno

```
DATABASE_URL              # MySQL connection string
NEXTAUTH_URL              # URL de la app
NEXTAUTH_SECRET           # Secreto JWT NextAuth
ENCRYPTION_KEY            # Clave AES-256-GCM (32 bytes hex)
CRON_SECRET               # Secreto para endpoints cron
ONESIGNAL_WEBHOOK_SECRET  # Secreto para webhook OneSignal
```

---

## Scripts npm

| Script | Comando |
|--------|---------|
| `dev` | `next dev` |
| `build` | `prisma generate && next build` |
| `start` | `prisma db push --accept-data-loss && next start` |
| `lint` | `next lint` |
| `db:push` | `prisma db push` |
| `db:migrate` | `prisma migrate dev` |
| `db:generate` | `prisma generate` |
| `db:studio` | `prisma studio` |

---

## Upload de Archivos

| Tipo | Extensiones | Máx. |
|------|-------------|------|
| Imagen | JPG, PNG, GIF, WebP | 5 MB |
| Audio | MP3, WAV, M4A, AAC | 100 MB |
| Video | MP4, MOV, AVI, WebM | 500 MB |

Ruta: `public/uploads/[clientId]/` · Nombres con timestamp
Optimización automática con Sharp: imágenes redimensionadas a max 1920px, convertidas a WebP (calidad 82%).

---

## Seguridad

- NextAuth JWT (cookies HTTP-only) · bcryptjs (12 rounds)
- Middleware verifica rol en cada request protegido
- Zod valida entrada en frontend y backend
- Rate limiting en endpoints críticos
- Text sanitizer (cliente servidor) previene caracteres Unicode problemáticos
- Impersonación solo para admins, con expiración y cookie firmada
- Encriptación AES-256-GCM para credenciales OneSignal
- CORS abierto (`*`) solo en API pública

---

## Despliegue

- **Plataforma:** Vercel + PlanetScale, o VPS (EasyPanel)
- **Scripts:** `deploy.sh` (Linux) y `deploy.ps1` (Windows) usan rsync + ssh
- Build: `npm ci && prisma generate && next build`
Diseña un reproductor de radio premium donde el elemento visual principal sea la carátula (cover) del tema que se está reproduciendo.

Fondo dinámico
El fondo de toda la sección debe utilizar la imagen del cover actual.
La imagen debe ocupar el 100% del ancho y alto del hero.
Aplicar:
Blur suave (10px a 20px).
Overlay oscuro semitransparente (70%-80%).
Gradiente oscuro desde abajo hacia arriba.
El objetivo es que el fondo cambie automáticamente cada vez que cambia la canción.
Layout principal

La información debe estar centrada verticalmente.

Distribución horizontal:

Izquierda

Mostrar el cover actual nuevamente dentro de una tarjeta.

Características:

Tamaño 280px a 350px.
Bordes redondeados.
Sombra pronunciada.
Mantener proporción cuadrada.
Efecto flotante elegante.
Derecha

Información del contenido en reproducción:

Pequeña etiqueta:

ON AIR

Debajo:

Texto pequeño:

REPRODUCIENDO AHORA

Título principal:

Nombre de la canción.
Muy grande (50px-70px).
Color blanco.
Peso bold.

Debajo:

Nombre del artista.
Tamaño mediano.
Color blanco con opacidad.

Debajo:

Álbum o programa (opcional).
Controles

Debajo de los datos:

Botón principal:

▶ ESCUCHAR EN VIVO
Forma de píldora.
Fondo blanco.
Texto oscuro.

Botón secundario:

Compartir
Circular.
Solo icono.
Cambio automático

Cuando cambia la canción:

Cambiar cover.
Cambiar fondo.
Animación fade de 500 ms.
Actualizar título y artista.
Sensación visual

La interfaz debe parecer una mezcla entre:

Spotify Desktop
Apple Music
Tidal
YouTube MusicOneSignal: Iniciando...
pwa-installer.js?v=3:42 PWA: Device detection: Object
pwa-installer.js?v=3:168 PWA: Modal created successfully
pwa-installer.js?v=3:25 PWA Installer: Initialized successfully Object
promotion-popup.js:15 PromotionPopup: Ya se mostró en esta sesión
main.js:42 CoveredTemplate: init started
template-base.js:52 TemplateBase: Initializing...
content-script-newvt-vimeo.js:34 downVal true
:3000/assets/js/index.js:1  Failed to load resource: the server responded with a status of 404 (Not Found)Understand this error
index.js:129 log: info: platform is not supported
audio-player.js:76 AudioPlayer: Stream URL set to: https://stream2.ipstream.cl/8002/stream
title-updater.js:32 TitleUpdater: Project name loaded from API: Raddio Fusion Austral
title-updater.js:60 TitleUpdater: Title updated to: Raddio Fusion Austral
title-updater.js:97 TitleUpdater: Meta tags updated
onesignal-init.js:34 OneSignal: Inicializado correctamente
onesignal-manager.js:55 OneSignal: Inicializado correctamente
index.js:85 Loading the script 'https://onesignal.com/api/v1/sync/8ba1bff5-b427-4f56-9270-8b4140237023/web?callback=__jp0' violates the following Content Security Policy directive: "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.onesignal.com https://unpkg.com". Note that 'script-src-elem' was not explicitly set, so 'script-src' is used as a fallback. The action has been blocked.
(anonymous) @ index.js:85Understand this error
meta-updater.js:34 MetaUpdater: Project data loaded: Object
meta-updater.js:78 MetaUpdater: Meta tags updated successfully
social-manager.js:50 SocialManager: Loaded 4 social networks
template-base.js:149 TemplateBase: updateCurrentSongDisplay - songData: Object
template-base.js:150 TemplateBase: domIds: Object
template-base.js:153 TemplateBase: titleEl: null artistEl: null
template-base.js:75 TemplateBase: Initialization complete
main.js:44 CoveredTemplate: super.init completed
template-base.js:149 TemplateBase: updateCurrentSongDisplay - songData: Object
template-base.js:150 TemplateBase: domIds: Object
template-base.js:153 TemplateBase: titleEl: null artistEl: null
pwa-installer.js?v=3:394 PWA: Floating button shown
main.js:51 CoveredTemplate: Template fully initialized!
utils.js:106 [DEV] Cache hit: https://dashboard.ipstream.cl/api/public/cmf4du07u000313x255b7jy2t/basic-data
pwa-installer.js?v=3:339 PWA: Modal shown successfully
pwa-installer.js?v=3:386 PWA: Modal dismissed by user

El usuario debe sentir que está viendo la portada del tema que está sonando, mientras que el reproductor y la información flotan encima del mismo cover.

Responsive

En móvil:

Cover arriba.
Nombre de canción.
Artista.
Botones.
Todo centrado.
Importante

El cover del tema actual aparece dos veces:

Como fondo gigante desenfocado de toda la sección.
Como imagen principal nítida dentro de una tarjeta cuadrada.

Esto genera una experiencia visual inmersiva similar a Spotify y Apple Music.
---

## Notas importantes

- **Idioma:** Español (UI y documentación)
- **Estado:** Desarrollo activo (últimas migraciones jun 2026)
- **No tiene tests automatizados**
- **No usa Docker**
- **Moneda principal:** CLP (soporte USD)
- **Next.config.js** ignora errores TS/ESLint en build; imágenes permitidas de cualquier dominio
- **Hay probador de API integrado** en `/dashboard/api-test` con descarga de guía Markdown
- **Guía de API descargable** contiene esquemas completos, tipos, ejemplos y código de implementación
- **20 modelos Prisma** en total
- **19 endpoints públicos** (GET y POST)
- **Dashboard reorganizado:** Stats → Acciones Rápidas → PaymentStatus + PwaSubscribers
- **Sidebar con acordeón:** 4 secciones colapsables con estado persistente
