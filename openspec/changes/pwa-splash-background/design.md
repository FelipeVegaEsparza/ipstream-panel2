# Design

## Context

Ver `proposal.md` (Why). Estado actual relevante:
- El splash vive en dos lugares: el HTML estático (`pwa/index.html`, `.app-splash`) que se ve antes de React, y el loader de React (`pwa/src/app/LoadingScreen.tsx` + `.module.css`). Ambos usan un fondo sólido (`#1a1a2e`).
- El shell por dominio (`lib/client-site.ts` → `renderShell`) ya reescribe el HTML del bundle con metadatos del cliente (OG/Twitter). Es el punto natural para inyectar branding por tenant.
- Las imágenes subidas se sirven como `/api/uploads/...` y **funcionan en el dominio del cliente** (verificado: 200 `image/webp`), así que la URL relativa alcanza.
- El splash estático se renderiza **antes** de que corra JavaScript y antes de resolver el cliente en la PWA; por eso el branding del fondo debe venir ya inyectado en el HTML del shell.

## Goals / Non-Goals

**Goals:**
- Que el cliente pueda subir una imagen y que se vea como fondo del splash (estático y loader) en su dominio.

**Non-Goals:**
- Animaciones, video, texto dinámico en el splash, overlays configurables, y edición manual de la imagen (el encuadre/optimización es automático).

## Decisions

### D1. Campo `BasicData.splashBackgroundUrl`
Campo nullable opcional, mismo patrón que `logoUrl`/`coverUrl`. Se agrega a `basicDataSchema`, al `ImageUpload` de Datos básicos y al mapeo `prismaData` del endpoint `/api/basic-data` (que ya propaga los campos del schema).

### D2. Inyección por variable CSS en el shell
`renderShell` agrega un `<style>` al HTML del cliente:
```
:root { --splash-bg-image: url('/api/uploads/...'); }
```
y tanto `pwa/index.html` (`.app-splash`) como `LoadingScreen.module.css` (`.screen`) pasan a usar:
```
background-image: var(--splash-bg-image, none);
background-size: cover;
background-position: center;
background-color: #1a1a2e; /* fallback */
```
Así el branding cubre el splash previo a React **y** el loader, sin depender de que la PWA haya resuelto el cliente. Alternativa descartada: leer la URL desde la API pública en runtime → no sirve para el splash estático, que ocurre antes de JS.

### D3. URL relativa
Se usa la URL normalizada (`/api/uploads/...`) tal como se guarda. No se absolutiza porque el mismo path resuelve en el dominio del cliente.

### D4. Presentación
`background-size: cover` con `background-position: center`: la imagen cubre la pantalla sin deformarse (se recorta lo que sobra). Recomendación en la UI: imagen vertical (p. ej. 1080×1920) y liviana para no demorar la carga.

### D5. Fallback
Sin imagen (o si falla la carga), el `background-image` queda en `none` y se ve el color de fondo actual. No hay error visible.

### D6. Optimización de la imagen (WebP + vertical)
Al subir el fondo se procesa con `sharp`: `resize(720, 1280, { fit: 'cover', position: 'centre' })` + `webp({ quality: 82 })`, de modo que la imagen guardada es **WebP** con relación 9:16 y liviana. Se implementa como un **preset** en `/api/upload` (p. ej. `?preset=splash`) para no alterar el comportamiento del resto de las imágenes; `ImageUpload` acepta un `preset` opcional. Alternativa descartada: procesar en `/api/basic-data` al guardar (más acoplado y no reutilizable).

### D7. Presentación: blur del fondo y duración
El fondo se pinta en un **pseudo-elemento** (`::before`) de `.app-splash`/`.screen` con `background-image: var(--splash-bg-image)` y `filter: blur(8px)` (desenfoque suave, + `transform: scale(1.06)` para evitar bordes transparentes), dejando el logo/contenido en una capa superior **nítida**. Se suma una capa oscura semitransparente (`rgba(15,18,32,0.35)`) para contraste. Se agrega una **animación de entrada**: el fondo hace un fade + zoom muy lento y el logo un `fade-up`; todo se desactiva con `prefers-reduced-motion`. La duración mínima del splash sube a `SPLASH_MIN_MS = 6000` en `pwa/src/app/App.tsx`. Alternativa descartada: `filter: blur` sobre el contenedor → desenfocaría también el logo.

## Risks / Trade-offs

- **[Peso de la imagen]** → un fondo pesado retrasa el splash. Mitigación: recomendación de tamaño/peso en la UI (no se re-encodea).
- **[Contraste]** → si la imagen es clara, el logo/loader pueden perder contraste. Aceptado (el cliente elige la imagen).
- **[Deploy combinado]** → toca panel y PWA; el panel inyecta el `<style>` y la PWA consume la variable. Requiere deploy del panel + republicar el bundle.

## Migration Plan

1. `prisma db push` agrega `splashBackgroundUrl` (nullable).
2. Desplegar panel (campo + inyección) y republicar el bundle de la PWA (CSS usando la variable).
3. Verificar: cargar imagen en un cliente, abrir su dominio y ver el fondo en el splash estático y mientras carga.
4. Rollback: revertir commits; la columna nullable no rompe nada.

## Open Questions

- Tamaño/relación de aspecto exactos a recomendar en la UI (se define en implementación).
- Si conviene un overlay semitransparente fijo para legibilidad (se puede sumar luego, no cambia el contrato).
