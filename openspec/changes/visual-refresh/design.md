# Design

## Context

Ver `proposal.md - Why`. Estado actual relevante:

- Existe un sistema de tokens estilo shadcn en `app/globals.css` (`--background`, `--card`, `--primary`, `--border`, …) mapeado en `tailwind.config.js`, pero **casi no se usa**: ~18 usos de clases semánticas (`bg-card`, `border-border`…) contra ~1372 usos de colores crudos (`bg-gray-800`, `cyan-500`…), y ~58 gradientes `cyan→blue`.
- `globals.css` define clases de componente (`.card`, `.btn-primary`, `.badge-*`, `.form-*`, `.sidebar-item`, `.glass-effect`, `.gradient-bg`) con efectos genéricos, usadas en ~89 archivos.
- `app/layout.tsx` importa **Inter**, pero `globals.css` fuerza `font-family: system-ui` → se ignora.
- Ya existen `components/ui/{button,card,badge,input,textarea,tabs,modal,toast}.tsx`; `button` y `badge` usan `class-variance-authority` (CVA).
- Referencia visual aprobada: maqueta **Opción B+ "Marca IPStream" (sombras suaves)** — paleta azul→cian del logo.

## Goals / Non-Goals

**Goals:**
- Una identidad visual cohesiva con la paleta del logo, ordenada y profesional.
- Un sistema de tokens como **única fuente de verdad** (cambiar el look = cambiar variables).
- Migración **sin cambios de comportamiento** y con rollback fácil.

**Non-Goals:**
- No se cambia lógica, datos, rutas, APIs, ni la estructura del DOM (salvo envoltorios puramente visuales).
- No se rediseña la estructura/UX de las pantallas (misma disposición, misma función).
- No se unifica la PWA (`pwa/`) ni el sitio de clientes.
- No se implementan temas por cliente en el panel.

## Decisions

### 1. Token-first (variables CSS + Tailwind)
Se definen los tokens del mockup aprobado y se mapean a las variables existentes (convirtiendo a HSL donde hoy se usan variables HSL) y a extensiones de Tailwind.
```
Marca:      --brand-500 #28B4F0 · --brand-700 #0050B4 · --brand-300 #64F0F0 · --grad linear-gradient(135deg,#28B4F0,#0050B4)
Superficie: --background  · --card/--surface · --surface-2 · --sidebar
Borde:      --border · --border-soft
Texto:      --foreground · --muted-foreground · --muted-2
Estado:     --success (#5BE29B) + soft
Radio:      --radius 16 / --radius-sm 11 / --radius-xs 8
Sombra:     --shadow: 0 3px 12px -10px rgba(0,0,0,.5)  (plana)
Tipografía: Inter (400/500/600/700)
```
- **Por qué**: es la base de "no romper". Se cambian tokens, no componentes; y a futuro todo depende de un solo lugar.
- **Alternativa descartada**: rediseñar cada componente con colores literales (insostenible y propenso a inconsistencias).

### 2. Reusar la capa `components/ui/*` (CVA) + clases de `globals.css`
Se reestilizan los componentes base y las clases existentes; las pantallas se migran a usarlos. Se mantienen **los mismos nombres de archivo y de clase** para no tocar imports ni JSX estructural.
- **Por qué**: reutilizar la capa existente minimiza cambios y riesgo.

### 3. Elementos de firma
Gradiente de marca azul→cian como **único acento**; **sombras suaves/planas** (bordes finos como principal recurso de profundidad); radios 16/11/8; títulos con tracking negativo; un solo verde para estado "en vivo".

### 4. Cero cambios de comportamiento (regla de oro)
En cada edición: **solo** `className`/`class`/CSS/`style`. Prohibido tocar props, `onClick`/handlers, `href`, `id`, `data-*`, consultas, estados de React, rutas, nombres de archivos o firmas de componentes. Se verifica con revisión de `git diff` por pantalla.

### 5. Fases + verificación por pantalla
Definir tokens → componentes base → shell + Dashboard → secciones del dashboard → admin → público. Cada fase: `npm run build` + revisión visual + **smoke test funcional** (login, navegación, abrir modales, formularios, uploads, estado de streaming). Commits por fase para rollback simple.

### 6. Tema claro
El mockup es oscuro. Se define el tema oscuro como principal y se adaptan los mismos tokens para `[data-theme="light"]` (sin romperlo). Si el tema claro no se usa, se documenta como secundario pero se mantiene funcional.

### 7. Gráficos y terceros
Recharts y demás usos de color (charts, badges de estado) se mapean a tokens para consistencia.

## Risks / Trade-offs

- **Cambios centrales afectan muchas pantallas** → tokens + migración por fases + revisión visual por pantalla; mantener los nombres de clase reduce el riesgo.
- **Regresión funcional por un cambio "de paso"** → regla de oro (solo estilos) + revisión de diff por pantalla + smoke test.
- **Contraste/accesibilidad** → tokens con contraste verificado; preservar focus rings y estados hover/disabled/`:focus-visible`.
- **Tema claro** → adaptar y verificar ambos temas.
- **Responsive/sidebar móvil** → verificar en tamaño móvil (la sidebar es `Dialog` en mobile).
- **Fondo del mockup es negro-violáceo** → podría chocar con el acento azul; se decide abajo (Open Questions).

## Migration Plan

1. **Fase 0 — Tokens**: definir variables + tailwind + fuente Inter real. Sin tocar componentes. Verificar build y que el panel siga funcionando (los tokens aún no se aplican a componentes salvo lo que ya usaba variables).
2. **Fase 1 — Componentes base**: reestilizar `components/ui/*` y las clases de `globals.css`. Verificar build + smoke test.
3. **Fase 2 — Shell + Dashboard**: sidebar, header, layout y overview (incluye "Primeros pasos", cards de stats).
4. **Fase 3 — Secciones del dashboard**: streaming, TV, contenido, etc.
5. **Fase 4 — Admin**.
6. **Fase 5 — Público**: registro, planes, login.
7. **Fase 6 — Limpieza**: eliminar clases/efectos muertos (`gradient-bg`, `glass-effect` si ya no se usan) y documentar los tokens.

**Rollback**: cada fase es un commit; revertir el commit de la fase revierte solo esa parte. Los tokens pueden revertirse independientemente.

## Open Questions

- **Tinte del fondo**: el mockup usa un negro con tinte violáceo; el acento es azul. ¿Conviene un fondo neutro o con tinte azulado para coherencia con el logo? (No cambia el plan; se decide al implementar.)
- ¿Alcance del **tema claro** (mantener o marcar como no soportado)?
- ¿Incluimos el **sitio público** (registro/planes/login) en este mismo cambio o en uno aparte? (El plan lo incluye como Fase 5, separable.)
