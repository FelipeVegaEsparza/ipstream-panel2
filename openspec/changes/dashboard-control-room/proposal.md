# Proposal

## Why

El panel del cliente acumuló reflejos visuales de plantilla generada: gradientes decorativos, tarjetas KPI multicolor, blobs, glassmorphism, `hover:scale` y emojis en controles. Eso resta credibilidad frente a radios y TVs que usan el panel a diario y hace difícil distinguir lo importante (estado al aire, cuotas, pagos) del ruido. La primera fase ataca el shell y la home, que definen el lenguaje visual del resto del producto.

## What Changes

- Reemplazar el lenguaje visual del shell del cliente (sidebar, header, contenedor principal) por una dirección **Control Room**: superficies planas, bordes de 1px, radios contenidos, tipografía de trabajo y un solo color de señal.
- Reorganizar la home por tareas, no por tarjetas: identidad de la emisora, franja **On Air** (radio y TV), métricas operativas compactas, avisos accionables y pago/accesos rápidos.
- Eliminar decoración de IA: gradientes de fondo en cards, blobs rotados, `backdrop-blur`, `hover:scale`, sombras grandes, emojis en botones y acentos decorativos (purple/amarillo/verde usados sin semántica).
- Incorporar una tipografía con carácter para UI y métricas (Archivo + Martian Mono) aplicada solo al dashboard, sin alterar el sitio público.
- Extender el lenguaje Control Room al resto de las pantallas del cliente: las utilidades heredadas (gradientes decorativos, sombras, blur, radios y escalas) se normalizan desde el shell y las pantallas principales reciben cabeceras, controles y estados consistentes.
- Formalizar el sistema en `DESIGN.md` y tokenizarlo en `app/globals.css` + `tailwind.config.js`.
- Instalar Impeccable como herramienta de crítica, rediseño y detección de anti-patrones, sin delegarle las decisiones de marca ni la lógica.
- Mantener rutas, datos, permisos, textos funcionales y comportamiento existente. **No** se agregan features nuevas ni endpoints.

## Capabilities

### New Capabilities

- `dashboard/control-room`: lenguaje visual, shell y composición de la home del panel del cliente bajo la dirección Control Room.

### Modified Capabilities

<!-- Ninguna: no existía una capability que cubriera el sistema visual del dashboard. -->

## Impact

- Tokens y tipografía: `app/globals.css`, `tailwind.config.js`, `app/layout.tsx` (fuente con alcance al dashboard), `DESIGN.md`.
- Shell: `app/dashboard/layout.tsx`, `components/dashboard/DashboardLayoutClient.tsx`, `components/dashboard/Sidebar.tsx`, `components/dashboard/Header.tsx`.
- Home: `app/dashboard/page.tsx`, `components/dashboard/DashboardOverviewCards.tsx`, `components/dashboard/AiCreditsCard.tsx`, `components/dashboard/PaymentStatusCard.tsx`, `components/dashboard/streaming/NowPlayingDisplay.tsx`, `components/dashboard/NowPlayingTvDisplay.tsx`.
- Tooling: instalación de Impeccable en `.opencode/` y `DESIGN.md`; sin dependencias de runtime nuevas salvo las fuentes de Next.js.
- Riesgos compartidos: los tokens son globales y también afectan `/admin`; hay que verificar ambos temas (dark/light) y admin antes de cerrar.
- Sin cambios de base de datos, APIs, permisos ni lógica de negocio.
