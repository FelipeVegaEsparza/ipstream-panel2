# Design

## Context

Ver `proposal.md` — Why. Hoy el chat se monta en dos lugares distintos:

- `ChatWidget` en `pwa/src/app/App.tsx`, condicionado por `shouldShowFloatingChat` (FAB inferior).
- Sección `chat` del catálogo de contenido, montada en la home de los templates que usan `ContentSections`.

Esa lógica depende de la ruta y del template, y el FAB se oculta justo en las homes que ya tienen la sección. El contenido del chat vive en `ChatSection`, que ya soporta el modo `embedded` y se reutiliza en el widget.

La PWA se sirve como bundle único para todos los clientes y se publica con `deploy-site-bundle.yml`; no hay cambios de backend ni de agente.

## Goals / Non-Goals

**Goals:**

- Un único punto de entrada al chat, igual en todos los templates y rutas.
- Abrir el chat en un modal dentro de la PWA, conservando la página de fondo.
- Quitar la sección de chat y el FAB anterior sin tocar la lógica de mensajes.
- Mantener el gate de `chatEnabled` y el aislamiento de la PWA respecto del panel.

**Non-Goals:**

- Cambiar endpoints, permisos, polling, validación o estilos internos de los mensajes.
- Cambiar el dashboard o la moderación del chat.
- Definir un nuevo sistema de popups genérico reutilizable por otras secciones.
- Soportar ventanas emergentes del navegador (`window.open`).

## Decisions

### 1. Montaje global en `TenantApp`

`ChatWidget` se renderiza una sola vez en `TenantApp`, fuera de `<Routes>` y del template, cuando `data.chatEnabled` es verdadero. Se elimina `shouldShowFloatingChat` y la dependencia de `pathname`/`selectedTemplate`.

- **Por qué**: garantiza presencia en todas las rutas y templates sin tocar cada componente de template.
- **Alternativa descartada**: integrar el botón en el `aside` de cada template. Multiplica cambios, duplica estilos y vuelve a hacer que la disponibilidad dependa del template.

### 2. Lanzador lateral, no FAB

El lanzador es una pestaña fija al borde derecho, centrada verticalmente, con el texto visible "Chat en vivo" (escritura vertical) e icono de chat. Se mantiene por encima del contenido y por debajo del modal. En móvil conserva el borde derecho para no chocar con el reproductor inferior.

- **Por qué**: el texto explícito cumple el pedido y deja de competir con los controles del player, que están abajo.
- **Alternativa descartada**: FAB circular inferior; se confunde con los controles del reproductor y ya existía el problema de ocultamiento.

### 3. Modal con el `ChatSection` existente

Al abrir, se monta `ChatSection embedded` dentro de un contenedor `role="dialog"` con `aria-modal="true"`. El chat solo se monta mientras el modal está abierto, así que no hay polling en segundo plano.

- **Por qué**: reutiliza toda la lógica de mensajes/permisos y evita dos implementaciones.
- **Alternativa descartada**: `window.open` a una ruta dedicada; los navegadores móviles y la PWA instalada suelen bloquear popups y se perdería el contexto.

### 4. Comportamiento del modal

- Cierre con botón, clic en el fondo y tecla `Escape`.
- Bloqueo del scroll del documento mientras está abierto, restaurándolo al cerrar.
- Foco inicial en el diálogo/cierre y retorno del foco al lanzador al cerrar.
- Etiqueta accesible "Chat en vivo" y botón con `aria-expanded`.

- **Por qué**: el modal actual es solo visual; sin foco ni Escape no es accesible ni se comporta como un diálogo real.

### 5. Retiro de la sección `chat`

Se quita `chat` de `SectionId`, `SECTION_LABELS`, `sectionHasContent`, de los órdenes por template, del `switch` de `ContentSections` y del mapa de iconos de `BlueTemplate`. El `ChatSection` deja de usarse en modo sección (solo `embedded`).

- **Por qué**: con el lanzador global, la sección sería un segundo acceso y el pedido es un único botón lateral.
- **Alternativa descartada**: mantener la sección además del lanzador; duplica la UI y el polling.

## Risks / Trade-offs

- **El botón tapa contenido en el borde derecho** → ancho reducido, posición centrada vertical y `z-index` moderado; se revisa en los templates con `aside`.
- **Doble título "Chat en vivo"** (modal + cabecera interna del chat) → se mantiene el título del modal y la cabecera interna solo aporta el contador de oyentes; si se ve redundante, se ajusta el texto de la cabecera interna sin cambiar la lógica.
- **Tests existentes de sección/visibilidad fallan** → se actualizan `sections.test.ts`, `visibility.test.ts` y los renders de templates; se agrega cobertura del modal.
- **El modal bloquea el scroll y el foco** → se restaura `overflow` y el foco en el cleanup del efecto para no dejar la página bloqueada.
- **Popups bloqueados** → se descarta `window.open` por diseño; el modal es DOM normal de la PWA.

## Migration Plan

1. Deploy del bundle de la PWA con el workflow `deploy-site-bundle.yml` (se dispara con cambios en `pwa/**`).
2. Rollback: revertir el commit y volver a publicar el bundle anterior; no hay datos ni migraciones.
3. No requiere "Actualizar nodo" ni cambios en el panel.
