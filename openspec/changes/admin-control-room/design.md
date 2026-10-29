# Design

## Context

Ver `proposal.md` — Why. El panel de cliente ya tiene tokens y reglas scopeadas a `.dashboard-shell`. Admin tiene su propio layout (`app/admin/layout.tsx` + `AdminLayoutClient` + `AdminSidebar` + `AdminHeader`) y 38 pantallas. Los tokens globales ya existen; falta aplicarlos al shell de admin y normalizar las utilidades heredadas.

## Goals / Non-Goals

**Goals:**

- Mismo shell y densidad que el panel del cliente.
- Normalizar las pantallas de admin sin reescribir su lógica.
- Mantener el badge de administrador como señal, no como decoración.

**Non-Goals:**

- Rediseñar la arquitectura interna de cada pantalla.
- Cambiar permisos, consultas, endpoints o flujos.
- Cambiar el logo o la paleta de marca.

## Decisions

### 1. Un `admin-shell` con las mismas reglas que `.dashboard-shell`

Se agrega la clase `.admin-shell` al wrapper de `app/admin/layout.tsx`, con las mismas variables de superficie, tipografía Archivo/Martian y reglas de normalización. Se mantiene separada de `.dashboard-shell` para poder ajustar admin sin afectar al cliente.

### 2. Shell: rail de 248px y header de 56px

- AdminSidebar: rail plano `surface-1`, logo sin drop-shadow, grupos en sentence case, items de 36px y activo con marca de 1px.
- AdminHeader: 56px, fondo sólido, borde inferior y controles compactos.
- Badge administrador: pill compacta con borde ámbar y texto ámbar, sin glass.
- Layout: `lg:pl-[248px]`, contenido máximo 1440px y padding 24–40px.

### 3. Normalización por codemod + CSS

Se aplican las mismas reglas que en el cliente:

- `text-gray-*` → tokens.
- `rounded-2xl/xl` → radios Control Room.
- `shadow-*`, `backdrop-blur`, `hover:scale` → eliminados.
- `bg-gradient-*` → superficie tonal.
- Emojis de UI → iconos o indicadores.
- Indigo/blue/purple decorativos → señal o superficie.

El CSS de admin se scopea a `.admin-shell` para no alterar el sitio público ni el panel del cliente.

## Risks / Trade-offs

- [Algún admin depende de un color fijo] → Los estados semánticos se preservan; solo se reemplazan colores decorativos.
- [Tablas densas con utilidades heredadas] → La normalización es visual; se revisan tablas y formularios con build y detector.
- [El shell de admin tiene badge y grupos propios] → Se ajustan clases sin tocar la definición de navegación.

## Migration Plan

1. Aplicar `.admin-shell` y tipografía.
2. Rediseñar AdminSidebar/AdminHeader/Layout.
3. Normalizar páginas y componentes de admin.
4. Ejecutar tsc, tests, build y detector.
5. Deploy y verificación visual.

## Open Questions

Ninguna.
