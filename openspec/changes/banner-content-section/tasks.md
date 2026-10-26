# Tasks

## 1. Modelo de datos y validación

- [x] 1.1 Agregar `model Banner` a `prisma/schema.prisma` (`clientId`, `imageUrl`, `linkUrl?`, `order`, timestamps, índice por `clientId`, cascade) y la relación `banners Banner[]` en `model Client`; verificar con `npx prisma validate` y `npx prisma generate`.
- [x] 1.2 Crear la migración SQL `prisma/migrations/<timestamp>_add_banners/migration.sql` con la tabla, índice y FK cascade; verificar que `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma` no reporte diferencias pendientes.
- [x] 1.3 Agregar `bannerSchema` e inferencia de tipos en `lib/validations.ts` (imagen obligatoria, enlace opcional solo `http`/`https`, normalización de cadena vacía a `null`); verificar con `lib/banner-validation.test.ts` que cubra imagen vacía, enlace válido, enlace vacío y esquemas inválidos.

## 2. APIs del panel

- [x] 2.1 Crear `app/api/banner/route.ts` con `GET`/`POST`, guard de menú `banner`, `getEffectiveClientFromRequest`, parseo de `bannerSchema`, orden por `order`/`createdAt` e invalidación de caché pública; verificar con `npx tsc --noEmit` y una petición autenticada local que cree un banner visible en el `GET`.
- [x] 2.2 Crear `app/api/banner/[id]/route.ts` con `GET`/`PUT`/`DELETE`, verificación de pertenencia por `clientId`, validación e invalidación de caché; verificar que editar/eliminar un banner de otro cliente responda 404 y no altere el registro.
- [x] 2.3 Incluir `banners` en `GET /api/public/[clientId]` seleccionando solo campos públicos y ordenando por `order`/`createdAt`; verificar que la respuesta agregada incluya la lista ordenada y vacía cuando no haya banners.
- [x] 2.4 Crear `app/api/public/[clientId]/banner/route.ts` envuelto en `withPublicContentCache`, validando la existencia del cliente y filtrando por `clientId`; verificar que devuelva solo banners del cliente solicitado y que la caché se invalide tras una mutación.

## 3. Dashboard, menú e internacionalización

- [x] 3.1 Agregar la clave `banner` a `MenuItemKey`, el import de icono y el ítem "Banner" dentro de `section: 'Contenido'` en `lib/menu-items.ts`; verificar que aparezca en el sidebar y en la configuración de menú admin sin pasos extra.
- [x] 3.2 Agregar textos ES/EN de la sección Banner y la etiqueta `Banner` en `MENU_NAME_EN` de `lib/dashboard-i18n.ts`; verificar `lib/dashboard-i18n.test.ts` y que el sidebar cambie de idioma sin claves sin traducir.
- [x] 3.3 Crear `app/dashboard/banner/page.tsx` con el bloque `MENU_GUARD_INJECTED`, `getEffectiveClient` y consulta scoped a `clientId`; verificar que un cliente sin permiso sea redirigido a `/dashboard` y que un cliente sin banners vea el estado vacío.
- [x] 3.4 Crear `components/dashboard/BannerManager.tsx` con listado, formulario inline, `ImageUpload` para la imagen, campo de enlace y orden, acciones editar/eliminar, toasts y `router.refresh()`; verificar en desarrollo que crear, editar y eliminar actualiza la lista y persiste tras recargar.
- [x] 3.5 Verificar la validación de UI: intentar guardar sin imagen y con un enlace `javascript:` debe mostrar error y no llamar a la API con datos inválidos.

## 4. PWA: datos y carrusel

- [x] 4.1 Agregar el tipo `Banner` y `banners?: Banner[]` a `FullClientData` en `pwa/src/core/types/index.ts`; verificar que `npm run build` de la PWA compile sin errores de tipos.
- [x] 4.2 Extender `pwa/src/ui/SmartImage.tsx` con un callback `onError` opcional que se invoque cuando se agotan las fuentes; verificar agregando un caso a `pwa/src/ui/SmartImage.test.tsx` y corriendo `cd pwa && npm run test`.
- [x] 4.3 Crear `pwa/src/modules/content/BannerCarousel.tsx` y su CSS module: nada sin banners, imagen estática con un banner, enlace `target="_blank" rel="noopener noreferrer"` cuando exista, carrusel con controles e indicadores con dos o más, rotación de 6 s con pausa por hover/foco y desactivación con `prefers-reduced-motion`.
- [x] 4.4 Agregar `BannerCarousel.test.tsx` cubriendo cero banners, un banner con y sin enlace, varios banners con navegación manual e indicadores, pausa de rotación y modo de movimiento reducido; verificar con `cd pwa && npm run test`.
- [x] 4.5 Insertar `BannerCarousel` al inicio de `ContentSectionStack` en `pwa/src/modules/content/ContentSections.tsx` y, en el home de `MinimalistaTemplate` (que no monta el `Outlet`), antes de sus columnas; usar `clientData.banners` y verificar que el banner aparezca arriba del contenido en todos los templates y que las rutas de listado/detalle no lo repitan.

## 5. Verificación de integración

- [x] 5.1 Ejecutar `npx tsc --noEmit` y `npm test` en la raíz; corregir cualquier error de tipos o prueba fallida.
- [x] 5.2 Ejecutar `cd pwa && npm run test` y `cd pwa && npm run build`; corregir cualquier error de tipos, pruebas o build.
- [x] 5.3 Con el panel y la PWA en desarrollo, cargar dos banners con enlaces distintos y verificar en al menos tres templates que aparecen arriba del contenido, rotan, permiten navegación manual y abren el enlace en una pestaña nueva.
- [x] 5.4 Verificar que un cliente sin banners no vea espacio reservado, que deshabilitar el menú Banner oculte la sección y sus APIs, y que los datos de un cliente no aparezcan en el sitio de otro.
