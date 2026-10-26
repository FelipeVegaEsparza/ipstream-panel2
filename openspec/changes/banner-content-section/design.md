# Design

## Context

Ver `proposal.md` para la motivación y `specs/content/banners/spec.md` + `specs/pwa/banner-carousel/spec.md` para el comportamiento esperado.

El panel ya tiene un patrón consolidado para contenido por cliente: ítem en `lib/menu-items.ts`, página server en `app/dashboard/<sección>`, API autenticada con `getEffectiveClientFromRequest`, validación con Zod, guard de menú `MENU_GUARD_INJECTED`, invalidación de caché pública y endpoints públicos en `app/api/public/[clientId]`. La PWA consume `FullClientData` desde `GET /api/public/[clientId]` y renderiza el home de todos los templates mediante el componente compartido `ContentSectionStack`.

Los banners son una colección ordenada (no una configuración singleton) porque deben mostrarse en carrusel cuando hay más de uno. La imagen se sube con el endpoint existente `/api/upload`, que ya limita tipos/tamaño y guarda bajo `public/uploads/<clientId>`.

## Goals / Non-Goals

**Goals:**

- CRUD de banners por cliente sin romper el aislamiento multi-tenant.
- Una única fuente de datos pública reutilizada por la PWA.
- Presentación consistente en todos los templates con un solo componente compartido.
- Validación de enlaces para evitar esquemas ejecutables.
- Carrusel accesible, con pausa por interacción y respeto a `prefers-reduced-motion`.

**Non-Goals:**

- No se agrega un banner al menú de navegación por secciones de los templates: es contenido promocional, no una sección navegable.
- No se implementan banners por página, segmentación, programación temporal ni métricas de clics.
- No se toca el agente de streaming ni se requiere "Actualizar nodo".
- No se reordena por drag-and-drop; el orden se edita con un campo numérico.

## Decisions

### Modelo `Banner` con varias filas por cliente

Se agrega `model Banner` en `prisma/schema.prisma` con `id`, `clientId`, `imageUrl`, `linkUrl` opcional, `order` y timestamps. `Client` recibe la relación `banners Banner[]`. Se crea una migración SQL con índice por `clientId` y FK `ON DELETE CASCADE`, siguiendo el patrón de `gc_bar_messages`.

Alternativa considerada: guardar una lista JSON en `BasicData`. Se descarta porque impide validar y ordenar filas individualmente, y complica futuras extensiones.

### Dashboard con manager cliente-side y formulario inline

Se usa el patrón de `GcBarManager`: una página server `/dashboard/banner` con guard de menú, consulta scoped a `clientId` y un componente cliente que lista, crea, edita y elimina. Para la imagen se reutiliza `components/ui/ImageUpload.tsx`; el enlace se edita con un input de URL. Esto evita rutas `new`/`edit` adicionales y mantiene coherencia con "Barra GC", que es el contenido más parecido.

Se agrega la clave `banner` a `MenuItemKey` y a `MENU_ITEMS` en la sección `Contenido`, con icono `PhotoIcon` o `MegaphoneIcon` de Heroicons. Los textos se agregan a `lib/dashboard-i18n.ts` (ES/EN) y a `MENU_NAME_EN`.

### Validación y seguridad del enlace

Se agrega `bannerSchema` en `lib/validations.ts`:

- `imageUrl`: string no vacío.
- `linkUrl`: opcional; cadena vacía se normaliza a `null`.
- Si hay enlace, debe ser una URL absoluta parseable y su protocolo debe ser `http:` o `https:`.

La validación se aplica en las rutas autenticadas. La API pública solo devuelve campos públicos (`id`, `imageUrl`, `linkUrl`, `order`) y filtra por `clientId`. Además se revalida el esquema del enlace al renderizar en la PWA como defensa en profundidad.

### APIs de gestión y exposición pública

- `app/api/banner/route.ts`: `GET` y `POST` autenticados, con guard de menú, `clientId` efectivo, validación e invalidación de caché.
- `app/api/banner/[id]/route.ts`: `GET`, `PUT` y `DELETE` con verificación de pertenencia por `clientId`.
- `GET /api/public/[clientId]`: se agrega la consulta de banners dentro del `Promise.all` existente y el campo `banners` a la respuesta.
- `app/api/public/[clientId]/banner/route.ts`: ruta pública dedicada para consumidores externos y pruebas, envuelta en `withPublicContentCache`.

Todas las mutaciones invocan `invalidatePublicCache()`.

### Un solo componente compartido en la PWA

Se agrega el tipo `Banner` y `banners?: Banner[]` a `FullClientData`. Se crea `pwa/src/modules/content/BannerCarousel.tsx` + CSS module, y se inserta al inicio de `ContentSectionStack`, antes del mapa de secciones. Ese stack cubre el home de todos los templates salvo `minimalista`, que en su home no monta el `<Outlet />`; por eso `MinimalistaTemplate` renderiza el mismo componente explícitamente cuando `isHome` es verdadero. No se agrega `banner` a `SectionId`/`getSectionOrder`.

El componente:

- No renderiza nada sin banners o con todos los banners inválidos.
- Con un banner renderiza una imagen estática; si hay enlace, envuelve la imagen en un `<a target="_blank" rel="noopener noreferrer">`.
- Con dos o más renderiza carrusel con controles anterior/siguiente e indicadores.
- Rota automáticamente cada 6 s; pausa en `pointerenter`/`focus` y reanuda al salir.
- Usa `matchMedia('(prefers-reduced-motion: reduce)')` para desactivar rotación y transiciones.
- Usa `SmartImage` para resolver URLs relativas y fallbacks; se extiende `SmartImage` con un callback `onError` opcional para descartar slides con imagen rota.
- Usa el nombre de la emisora/cliente como texto alternativo de la imagen.

Alternativa considerada: insertar el banner en cada template. Se descarta porque duplica lógica, estilos y pruebas en 11 templates y aumenta la probabilidad de inconsistencias.

### Ubicación visual

El banner se renderiza al tope del stack, justo después del hero/header que cada template dibuja antes del `<Outlet />`. No aparece en páginas de listado/detalle porque esas rutas no usan `ContentSectionStack`. El contenedor usa tokens de diseño (`bg-card`, `border-border`, radios y ancho máximo del contenido) para integrarse con ambos temas.

## Risks / Trade-offs

- **Caché pública desactualizada** → invalidar en cada mutación y cubrir el flujo con pruebas del endpoint.
- **Carrusel molesto o inaccesible** → pausa por hover/foco, controles de teclado y respeto a `prefers-reduced-motion`.
- **Imagen rota en un slide** → `SmartImage` acepta `onError`; el carrusel elimina ese banner de la vista y recalcula el índice.
- **Enlaces maliciosos** → validar protocolo `http`/`https` en escritura y renderizado.
- **El banner se ve grande en templates con layout angosto** → CSS responsivo con ancho máximo y `object-fit: cover`.
- **Migración en producción** → la migración es aditiva (tabla nueva); rollback consiste en eliminar la tabla y la relación, sin afectar contenido existente.

## Migration Plan

1. Crear la migración Prisma de `banners` y ejecutarla con el flujo habitual (`prisma migrate deploy` en el arranque/deploy del panel).
2. Desplegar panel + PWA (el bundle de la PWA se publica con el workflow existente).
3. No requiere cambios de entorno ni actualización de nodos remotos.

## Open Questions

Ninguna pendiente.
