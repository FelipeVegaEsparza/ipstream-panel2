# Proposal

## Why

Los clientes necesitan un espacio promocional destacado en su sitio público para comunicar campañas, auspiciadores o avisos con una imagen enlazable. Hoy no existe un contenido equivalente en el grupo "Contenido" del dashboard, por lo que deben usar secciones menos adecuadas (promociones con texto, galerías) y la PWA no tiene un lugar consistente para mostrarlo en todos los templates.

## What Changes

- Agregar una sección **Banner** dentro del grupo "Contenido" del dashboard, con listado, alta, edición y eliminación de banners por cliente.
- Cada banner tiene una imagen obligatoria, un enlace opcional, un orden de presentación y pertenece a un único cliente (aislamiento por `clientId`).
- Exponer los banners del cliente en la API pública de contenido que consume la PWA.
- Mostrar los banners en la parte superior del contenido del home de **todos** los templates de la PWA:
  - Un banner se muestra como imagen estática.
  - Dos o más banners se muestran en un carrusel.
  - Si el banner tiene enlace, la imagen abre ese enlace en una pestaña nueva (`target="_blank"` con `rel="noopener noreferrer"`).
  - Sin imagen no se renderiza nada.
- Agregar la clave de menú y los textos de internacionalización correspondientes, respetando los permisos de menú existentes por cliente.

## Capabilities

### New Capabilities

- `content/banners`: gestión de banners por cliente en el dashboard (CRUD, orden, validación y aislamiento) y su exposición en la API pública de contenido.
- `pwa/banner-carousel`: presentación de banners en la parte superior del home de todos los templates, con carrusel cuando hay más de uno y enlaces que abren en pestaña nueva.

### Modified Capabilities

Ninguna. No cambian requisitos de capacidades existentes.

## Impact

- **Base de datos**: nueva tabla `banners` con relación a `clients` y migración Prisma.
- **Dashboard**: nuevo ítem de menú en "Contenido", ruta `/dashboard/banner`, formulario y listado; textos en `lib/dashboard-i18n.ts`.
- **APIs**: nuevas rutas autenticadas `/api/banner` y `/api/banner/[id]`; los banners se incluyen en `GET /api/public/[clientId]` y en una ruta pública dedicada.
- **PWA**: nuevo tipo en `FullClientData`, componente de banner/carrusel compartido y su inserción en `ContentSectionStack`, por lo que aplica a todos los templates sin duplicar lógica.
- **Tests**: validación/utilidades del panel y componente de banners/carrusel en la PWA.
- No requiere cambios en el agente de streaming ni "Actualizar nodo".
