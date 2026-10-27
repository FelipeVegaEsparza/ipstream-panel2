# Design

## Context

Ver `proposal.md` — Why. El estado actual relevante:

- El panel es Next.js + Prisma/MySQL, con admin autenticado por `getServerSession` y rol `ADMIN`.
- El sitio público es una app Astro SSR separada (`ipstreamweb2`), con SQLite propio y deploy manual en `/opt/casterfly-site`.
- Los planes ya se leen desde `https://panel.casterfly.com/api/public/plans`, con caché de 60 s.
- El resto del contenido editorial está en `content.ts`/`content.en.ts` y en los mapas i18n `es.ts`/`en.ts`; se consume en `index`, `ia` y `caracteristicas`.
- Noticias, tutoriales, portafolio, mensajes y SEO local viven en la SQLite del sitio y se administran desde su `/admin`.

## Goals / Non-Goals

**Goals:**

- Una sola fuente de verdad en el panel para el contenido editorial.
- Editar desde el panel sin tocar código ni redesplegar el sitio.
- Mantener el sitio separado y compatible con su deploy actual.
- Soportar español e inglés con fallback seguro.
- No romper el sitio si el panel falla o devuelve contenido incompleto.
- Reutilizar la autenticación, validación y uploads que ya tiene el panel.

**Non-Goals:**

- Migrar noticias, tutoriales, portafolio o mensajes al panel.
- Mover el código Astro a este repo.
- Implementar borradores, preview o aprobación.
- Editar planes desde esta sección.
- Convertir el sitio en un page builder o permitir HTML/JS arbitrario.

## Decisions

### 1. Panel como CMS headless; sitio separado

El panel almacena el contenido y lo entrega por una API pública. El sitio Astro lo consume en runtime.

- **Por qué**: permite editar sin redeploy y evita una reescritura del sitio o un cambio riesgoso de Caddy/Docker.
- **Alternativa descartada**: mover el sitio a este repo. Mejora el deploy atómico, pero no resuelve el CMS y agrega complejidad al CI del panel.
- **Alternativa descartada**: compartir la base MySQL del panel con Astro. Acopla dos apps y sus ciclos de deploy.
- **Alternativa descartada**: embeber el `/admin` del sitio en el panel. Mantiene dos autenticaciones y no es una administración real desde el panel.

### 2. Documento JSON por idioma, validado con Zod

Nuevo modelo Prisma:

```prisma
model SiteContent {
  id        String   @id @default(cuid())
  locale    String   @unique // "es" | "en"
  content   Json
  version   Int      @default(1)
  updatedAt DateTime @updatedAt
  updatedBy String?

  @@map("site_content")
}
```

`content` contiene el árbol editorial completo de ese idioma: global, hero, secciones, colecciones (pilares, features, players, FAQ, soporte), SEO, contacto y redes. La forma se define en un esquema Zod compartido por la API admin, la API pública y el seed.

- **Por qué**: el contenido es un documento editorial que se guarda por bloque/idioma; normalizarlo en decenas de tablas agrega consultas y migraciones sin beneficio para esta fase.
- **Alternativa descartada**: tablas `SiteSection`, `SiteCard`, `SiteFaq`, etc. Más rígido y más trabajo para un contenido que se edita como conjunto.
- **Mitigación del riesgo JSON**: esquema Zod versionado, límites de longitud, validación al guardar y tests del seed.
- **Concurrencia**: la API admin devuelve `version`; si el cliente envía una versión anterior se rechaza con `409` para no pisar cambios.

### 3. Defaults y seed

El panel incluye un snapshot inicial del contenido actual del sitio (`prisma/seed/site-content.json` o equivalente) y un seed idempotente que crea/actualiza las filas `es` y `en` solo si no existen. El sitio conserva sus constantes actuales como fallback.

- **Por qué**: el administrador abre el editor con el contenido real, no con formularios vacíos.
- **Riesgo**: duplicación entre el snapshot del panel y las constantes del sitio. Se mitiga validando el snapshot con el mismo Zod y manteniendo el fallback del sitio como red de seguridad.
- **Alternativa descartada**: empezar vacío y obligar a cargar todo a mano. Mala primera experiencia y riesgo de publicar un sitio incompleto.

### 4. API pública cacheable

`GET /api/public/site-content?locale=es|en`

- Sin autenticación.
- `es` por defecto si el locale es inválido o falta.
- Respuesta `200` con `{ locale, version, updatedAt, content }`.
- Sin fila publicada: `200` con `content: null` para que el sitio aplique fallback.
- `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.
- CORS con los helpers existentes.
- Si el JSON guardado no valida, se registra el error y se responde `content: null` en lugar de exponer datos corruptos.

**Por qué**: el contenido es público y read-only; una caché corta reduce carga y hace que los cambios se vean en ~1 minuto.

### 5. API admin autenticada

`GET|PUT /api/admin/site-content?locale=es|en`

- Requiere `getServerSession` con rol `ADMIN`.
- `GET` devuelve el contenido guardado y su `version`.
- `PUT` valida con Zod, comprueba `version` y guarda; responde la nueva versión.
- Errores: `401` sin sesión, `403` sin rol, `400` inválido, `409` versión desactualizada.

**Por qué**: separar escritura y lectura permite proteger la escritura sin complicar la API pública.

### 6. Admin estructurado, no editor JSON

Página `/admin/sitio` dentro del grupo **Contenido** del sidebar, con pestañas:

- General / marca
- Inicio y hero
- IA
- Plataforma
- Studio
- Chat
- Reproductores
- FAQ y soporte
- SEO
- Contacto y redes

Selector de idioma ES/EN, guardado por idioma, fecha de última actualización y enlace a `https://casterfly.com`. Los campos de imagen usan el uploader existente del panel y guardan una URL absoluta.

- **Por qué**: el usuario administra contenido, no JSON; los formularios guían y evitan errores.
- **Alternativa descartada**: un textarea JSON. Rápido de implementar, pero frágil y poco intuitivo.

### 7. Consumo en el sitio con merge y fallback

Nuevo cliente `src/lib/panel-content.ts` en el sitio:

1. Consulta la API del panel con timeout corto.
2. Cachea en memoria ~60 s.
3. Si falla, no hay contenido o el JSON no valida, usa `content.ts`/`content.en.ts` y los mapas i18n actuales.
4. Si el idioma es `en` y falta un campo, aplica el valor `es`; si tampoco existe, usa el default estático.
5. Hace un merge profundo del contenido del panel sobre los defaults, de modo que un contenido parcial no rompe la página.

`index`, `ia` y `caracteristicas` pasan a recibir el contenido resuelto. El SEO, contacto y redes también se leen del panel cuando estén presentes.

- **Por qué**: el sitio ya es SSR, así que el fetch en runtime es directo y no requiere rebuild.
- **Alternativa descartada**: fetch en build. Obligaría a redesplegar para cada cambio, que es justo lo que se quiere evitar.

### 8. Imágenes

Se reutiliza `POST /api/upload` y el servido público `/api/uploads/...` del panel. Las imágenes del sitio se guardan bajo el directorio `admin` y se referencian con URL absoluta a `https://panel.casterfly.com`.

- **Por qué**: ya existe procesamiento con Sharp, límites, almacenamiento persistente y caché immutable.
- **Alternativa descartada**: subir imágenes al volumen SQLite del sitio; obliga a otro uploader y otro backup.
- También se aceptan URLs externas si el administrador las pega.

### 9. Caché y propagación

- Panel API: 60 s de caché HTTP.
- Sitio: 60 s de caché en memoria.
- El peor caso de propagación es ~2 minutos si coinciden ambas cachés; en la práctica suele ser menos.
- No se implementa invalidación cruzada en esta fase. El admin muestra una nota de "los cambios pueden tardar hasta ~1 minuto".

## Risks / Trade-offs

- **El esquema JSON evoluciona y rompe contenido viejo** → Zod con defaults y migraciones de datos; el sitio hace merge con defaults.
- **Duplicación del contenido inicial** (snapshot del panel vs constantes del sitio) → seed validado y fallback del sitio.
- **Panel caído o lento** → timeout corto, fallback estático y caché en memoria; la página nunca depende de que el panel responda.
- **Caché hace que un cambio no se vea al instante** → 60 s documentados y nota en el admin; a futuro se puede agregar purga.
- **Imágenes alojadas en el dominio del panel** → volumen persistente y backup; si una imagen falta, el sitio muestra placeholder.
- **Traducciones incompletas** → fallback EN → ES → estático.
- **Contenido demasiado grande o abusivo** → límites de longitud y tamaño del JSON en Zod; solo `ADMIN`.
- **El sitio sigue con deploy manual** → este cambio requiere un deploy único; automatizar el deploy del sitio queda como mejora separada.

## Migration Plan

1. Agregar el modelo `SiteContent`, migración y seed idempotente en el panel.
2. Implementar la API admin, la API pública y la página `/admin/sitio`.
3. Implementar el cliente de contenido y adaptar `index`, `ia` y `caracteristicas` del sitio.
4. Desplegar el panel por el flujo normal (GitHub Actions).
5. Sincronizar y reconstruir el sitio una vez (`/opt/casterfly-site`) para activar el consumo de la API.
6. Verificar: guardar un cambio en el panel, esperar la ventana de caché y comprobar el cambio en casterfly.com; luego probar el fallback cortando la API del panel.
7. Rollback: el sitio sigue sirviendo el contenido estático si la API falla; para revertir el panel, desactivar la sección y restaurar la migración/seed. No hay migración de datos del sitio ni cambios en el agente.

## Open Questions

Ninguna que bloquee la implementación. El conjunto exacto de campos de cada sección se cerrará al definir el esquema Zod; agregar un campo nuevo después no cambia la arquitectura.
