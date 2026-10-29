# Proposal

## Why

El panel de cliente ya usa el lenguaje Control Room, pero `/admin` conserva el look anterior: sidebar con gradiente, glass, sombras, badges gritones y páginas con utilidades heredadas. Eso rompe la continuidad cuando un administrador impersona un cliente y vuelve al panel global. Esta fase lleva el mismo sistema al shell y a las pantallas de administración sin cambiar su lógica.

## What Changes

- Aplicar los tokens, tipografía y reglas de Control Room al shell de `/admin`: sidebar de 248px, header compacto de 56px, superficies planas y navegación con estado activo discreto.
- Normalizar las utilidades heredadas de las 38 pantallas de admin (radios, sombras, blur, gradientes decorativos, escalas, grises crudos y emojis).
- Reemplazar el badge ámbar de "ADMINISTRADOR" por una marca compacta y semántica.
- Mantener el comportamiento, permisos, rutas, datos y textos existentes.
- No rediseñar la estructura interna de cada pantalla de admin; se aplica el sistema visual compartido y se ajustan las cabeceras principales.

## Capabilities

### New Capabilities

- `admin/control-room`: lenguaje visual y shell de administración bajo la dirección Control Room.

### Modified Capabilities

<!-- Ninguna: el cambio es visual y no altera requisitos funcionales existentes. -->

## Impact

- Shell: `app/admin/layout.tsx`, `components/admin/AdminLayoutClient.tsx`, `components/admin/AdminSidebar.tsx`, `components/admin/AdminHeader.tsx`.
- Tokens y normalización: `app/globals.css` (reglas scopeadas a `.admin-shell`).
- Páginas de admin: limpieza de utilidades heredadas en `app/admin/**` y `components/admin/**`.
- Sin cambios de base de datos, APIs, permisos ni lógica de negocio.
