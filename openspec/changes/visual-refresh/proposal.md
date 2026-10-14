# Proposal

## Why

La apariencia del panel se percibe genérica ("tipo IA"): usa colores por defecto de Tailwind, gradientes cian→azul, glassmorphism, sombras grandes y `hover:scale`, y **desaprovecha el sistema de tokens que ya existe** (`--background`, `--card`, `--primary`, etc.). Se quiere una identidad visual propia y profesional, con la **paleta del logo IPStream** (azul→cian), sobre la maqueta aprobada (Opción B+ "Marca IPStream", sombras suaves). **Restricción dura: no romper ninguna funcionalidad del dashboard.**

## What Changes

- **Sistema de tokens**: definir en `globals.css` + `tailwind.config.js` los tokens del diseño aprobado (colores de la marca, superficies, bordes, texto, radios, sombras suaves, tipografía, gradiente de marca). Fuente única de verdad.
- **Componentes base**: reestilizar `components/ui/*` (Button, Card, Badge, Input, Textarea, Tabs) y las clases de `globals.css` (`.card`, `.btn-*`, `.badge-*`, `.form-*`, `.sidebar-item`, `.glass-effect`, `gradient-bg`) para que usen los tokens.
- **Reducir clichés**: quitar/suavizar gradientes ruidosos, glass, `hover:scale` y sombras grandes; un solo acento de marca; bordes finos.
- **Tipografía**: aplicar Inter de verdad (hoy `globals.css` la pisa con `system-ui`).
- **Migración progresiva por pantalla**: Dashboard y su shell (sidebar/header) → secciones del dashboard → admin → público (registro/planes/login). En cada paso, **solo presentación**.
- **Sin cambios de comportamiento** (no-goal explícito): no se tocan props, handlers, consultas, rutas, nombres de archivos, atributos de DOM ni datos. Solo `className`/CSS/estilos.

## Capabilities

### New Capabilities

Ninguna. Es un cambio visual/de estilos, sin cambios de comportamiento observable (`.openspec.yaml` declara `skip_specs: true`).

### Modified Capabilities

Ninguna.

## Impact

- **Estilos/tokens**: `app/globals.css`, `tailwind.config.js`, `app/layout.tsx` (fuente).
- **Componentes base**: `components/ui/*`.
- **Pantallas**: `app/dashboard/**`, `components/dashboard/**`, `app/admin/**`, `components/admin/**`, `app/registro`, `app/planes`, `app/auth/**` (solo className).
- **Sin impacto** en: Prisma, APIs, lógica de negocio, streaming, pagos, onboarding, dominios. Ninguna ruta o handler cambia.
- **Riesgo principal**: los cambios centrales (tokens/clases) afectan muchas pantallas a la vez → se mitiga con migración por fases y verificación visual + funcional en cada paso.
