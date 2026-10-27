# Tasks

## 1. Lanzador global y modal

- [x] 1.1 Reescribir `pwa/src/modules/chat/ChatWidget.tsx` como lanzador lateral fijo (texto "Chat en vivo" + icono) que abre un `role="dialog"` con `ChatSection embedded`; verificar con `cd pwa && npm run test -- ChatWidget`.
- [x] 1.2 Implementar el comportamiento del modal: cierre por botón, clic en el fondo y `Escape`, bloqueo/restauración del scroll y retorno del foco al lanzador; cubrirlo con tests de `ChatWidget`.
- [x] 1.3 Montar el lanzador una sola vez en `pwa/src/app/App.tsx` condicionado a `data.chatEnabled`, sin depender de la ruta ni del template; eliminar `shouldShowFloatingChat` de `App.tsx` y verificar con typecheck.
- [x] 1.4 Eliminar `pwa/src/modules/chat/visibility.ts` y su test al quedar sin uso; verificar que no queden imports con `grep -rn "visibility" pwa/src`.

## 2. Retiro de la sección de chat y del FAB

- [x] 2.1 Quitar `chat` de `SectionId`, `SECTION_LABELS`, `sectionHasContent`, `DEFAULT_ORDER` y los órdenes por template en `pwa/src/modules/content/sections.ts`; actualizar `sections.test.ts` y verificar que no queden referencias a `chat` como sección.
- [x] 2.2 Quitar el caso `chat` de `ContentSections.tsx` y el icono `FaComments` de `BlueTemplate.tsx`; verificar con `cd pwa && npm run build`.
- [x] 2.3 Ajustar los tests de templates que esperaban la sección de chat y verificar que el home de todos los templates renderiza sin sección embebida (`cd pwa && npm run test -- templates`).

## 3. Estilos y accesibilidad

- [x] 3.1 Reemplazar el CSS del FAB/panel por el lanzador lateral y el backdrop/modal en `ChatWidget.module.css`, con `z-index` bajo el modal y adaptación móvil; verificar visualmente en desarrollo en al menos un template con `aside`.
- [x] 3.2 Revisar que el lanzador no tape los controles del `PlayerBar` ni el contenido lateral en móvil y escritorio; verificar en viewport pequeño desde el navegador.
- [x] 3.3 Verificar la accesibilidad del modal (nombre accesible "Chat en vivo", `aria-expanded`, foco inicial y `Escape`) con el test de `ChatWidget` y una revisión manual con teclado.

## 4. Integración y publicación

- [x] 4.1 Ejecutar `cd pwa && npm run test`, `npm run build` y el linter de la PWA; corregir cualquier fallo.
- [x] 4.2 Confirmar que no se tocaron archivos del panel, del agente ni de `lib/*`, y que el cambio solo republica el bundle de la PWA sin requerir "Actualizar nodo".

## 5. Persistencia y mensajes nuevos

- [x] 5.1 Mantener `ChatSection` montado cuando el modal está cerrado (backdrop oculto) para conservar historial, cursor y formulario al reabrir; verificar que el nodo no se remonta en `ChatWidget.test.tsx`.
- [x] 5.2 Propagar los mensajes nuevos de `ChatSection` a `ChatWidget` y mostrar un badge numérico en el lanzador, sin contar el historial inicial ni incrementar mientras el modal está abierto; verificar con tests de `ChatSection` y `ChatWidget`.
- [x] 5.3 Actualizar la spec y el diseño con la persistencia y el badge, y ejecutar `npm run test` de la PWA; corregir fallos.
