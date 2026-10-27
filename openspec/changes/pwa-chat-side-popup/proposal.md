# Proposal

## Why

El chat en vivo de la PWA se reparte hoy entre una sección de contenido en algunas homes y un botón flotante que se oculta en esos mismos homes. Eso obliga al visitante a buscarlo según el template, y en móvil el FAB compite con el reproductor. Un único acceso lateral y consistente, que abra el chat en un modal, hace el chat predecible en todos los templates sin duplicar la interfaz.

## What Changes

- Reemplazar la sección de contenido `chat` y el botón flotante actual por un **único botón lateral fijo** al borde derecho, visible en todas las páginas y templates de la PWA cuando el chat está habilitado.
- Al pulsar el botón, abrir el chat en un **overlay modal** dentro de la PWA (no una ventana del navegador), con cabecera "Chat en vivo", cierre explícito y cierre por teclado.
- Mantener el comportamiento del chat existente (mensajes, nombre/email, conteo de oyentes, polling, permisos).
- Conservar el estado del chat (historial y formulario) al cerrar y reabrir el modal, y avisar en el lanzador los mensajes nuevos con un badge numérico mientras está cerrado.
- Ocultar el botón lateral por completo cuando el cliente tenga el chat deshabilitado.
- **BREAKING** (interno de la PWA): se elimina la sección `chat` del catálogo de secciones y el FAB anterior; el chat deja de mostrarse embebido en la home.

## Capabilities

### New Capabilities

- `chat/live`: acceso al chat en vivo desde la PWA mediante un lanzador lateral fijo y un modal único disponibles en todas las rutas y templates. Complementa el contrato de mensajes y permisos que introduce `fix-live-chat`; no lo reemplaza.

### Modified Capabilities

Ninguna.

## Impact

- **PWA**: `pwa/src/app/App.tsx` (montaje global del lanzador), `pwa/src/modules/chat/ChatWidget.tsx`, `pwa/src/modules/chat/ChatSection.tsx` (estado persistente y aviso de mensajes nuevos) y su CSS, `pwa/src/modules/chat/visibility.ts` y tests.
- **Secciones**: quitar `chat` de `pwa/src/modules/content/sections.ts`, del switch de `pwa/src/modules/content/ContentSections.tsx` y del icono de `BlueTemplate`.
- **Tests**: actualizar `visibility` y los tests de templates que hoy esperan la sección de chat; agregar cobertura del lanzador y del modal.
- **Sin backend, sin panel y sin agente**: no requiere "Actualizar nodo".
