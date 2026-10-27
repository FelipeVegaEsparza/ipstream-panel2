# Spec Delta

## Purpose

Define cómo el visitante accede al chat en vivo desde la PWA: un lanzador lateral fijo que abre el chat en un modal, en todas las rutas y templates, reemplazando la sección de contenido y el botón flotante anteriores.

## ADDED Requirements

### Requirement: Acceso lateral al chat en vivo

La PWA SHALL mostrar el chat en vivo cuando el cliente lo tenga habilitado mediante un único lanzador lateral fijo al borde derecho, visible en todas las rutas y en todos los templates. El lanzador SHALL abrir el chat en un overlay modal dentro de la PWA, no en una ventana del navegador. La PWA NO SHALL mostrar el chat como sección de contenido en la home ni mediante un botón flotante inferior. Cuando el chat esté deshabilitado, la PWA NO SHALL mostrar el lanzador ni permitir abrir el modal.

#### Scenario: Chat habilitado en cualquier template

- **WHEN** un cliente con chat habilitado abre cualquier ruta de la PWA, incluida la home de cualquier template
- **THEN** ve el botón lateral “Chat en vivo” en el borde derecho de la pantalla

#### Scenario: Abrir el chat

- **WHEN** el visitante pulsa el botón lateral
- **THEN** se abre un modal con la cabecera “Chat en vivo”, el historial de mensajes y el formulario para enviar
- **AND** la página de fondo permanece montada y conserva su estado

#### Scenario: Cerrar el chat

- **WHEN** el visitante cierra el modal con el botón de cerrar o con la tecla Escape
- **THEN** vuelve a la página sin navegar y puede abrir el chat de nuevo con el botón lateral

#### Scenario: Home sin sección de chat

- **WHEN** el visitante abre la home de un template que antes montaba la sección de chat
- **THEN** el chat no aparece embebido en el contenido y solo se accede por el botón lateral

#### Scenario: Chat deshabilitado

- **WHEN** el cliente tiene deshabilitado el ítem de menú Chat en Vivo
- **THEN** la PWA no muestra el botón lateral ni el modal de chat

#### Scenario: Acceso en pantallas pequeñas

- **WHEN** el visitante usa la PWA en un dispositivo móvil con el reproductor visible
- **THEN** el botón lateral sigue siendo visible y accesible, y el modal se adapta al ancho de la pantalla
