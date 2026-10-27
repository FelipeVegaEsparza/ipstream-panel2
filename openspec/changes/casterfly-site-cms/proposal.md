# Proposal

## Why

El contenido editorial de casterfly.com vive hardcodeado en TypeScript y su administración está separada del panel: cambiar el hero, una tarjeta de funcionalidades, el FAQ o el SEO exige editar código y redesplegar el sitio. Los planes ya son la excepción porque se leen desde el panel. Centralizar el contenido editorial en el panel elimina esa fragmentación y permite publicar cambios sin deploy.

## What Changes

- Agregar al panel de administración una sección **Sitio público** para usuarios `ADMIN`, con edición de contenido editorial en español e inglés:
  - Hero principal y CTAs.
  - Encabezados y textos de las secciones (IA, plataforma, Studio, chat, planes, clientes, noticias).
  - Tarjetas de pilares, funcionalidades, IA, Studio y reproductores.
  - FAQ y tarjetas de soporte.
  - SEO por página, datos de contacto y redes sociales.
- Guardar ese contenido en MySQL del panel, con validación tipada y publicación directa (sin borradores ni aprobación en esta fase).
- Exponer una API pública de solo lectura, cacheable, que entregue el contenido publicado por idioma.
- Hacer que el sitio Astro consuma esa API en runtime, con el contenido estático actual como fallback y una caché corta. Los cambios del panel se verán sin redesplegar el sitio.
- Mantener por ahora en el sitio su SQLite y su admin para noticias, tutoriales, portafolio y mensajes de contacto.
- Mantener los planes como están: ya se administran en el panel y se consumen por `/api/public/plans`.
- Hacer un único deploy del sitio tras implementar el consumo de la API. No se mueve el código del sitio a este repo en esta fase.

## Capabilities

### New Capabilities

- `site/content-management`: administración del contenido editorial del sitio público desde el panel, entrega pública por idioma, fallback y caché.

### Modified Capabilities

Ninguna.

## Impact

- **Panel**: nuevo modelo y migración Prisma para contenido del sitio; página `/admin/sitio`; entrada en el sidebar; componentes de formulario; API admin y API pública de lectura; textos i18n del panel; uso de la infraestructura de uploads para imágenes.
- **Sitio (`ipstreamweb2`)**: nuevo cliente de contenido que consulta la API del panel; `index`, `ia` y `caracteristicas` dejan de depender solo de `content.ts`/`content.en.ts`; fallback al contenido estático y caché de ~60 s.
- **Operación**: un deploy manual del sitio para activar el consumo de la API. Después, editar contenido no requiere redeploy. No toca el agente de streaming ni requiere "Actualizar nodo".
- **Fuera de alcance en esta fase**: migrar noticias, tutoriales, portafolio o mensajes de contacto al panel; mover el sitio Astro a este repo; borradores, preview o flujo de aprobación; edición de planes.
