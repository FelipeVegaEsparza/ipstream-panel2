# Tasks

## 1. Contexto y herramientas

- [x] 1.1 Instalar Impeccable en el proyecto y verificar que `.opencode/skills/impeccable/` existe.
- [x] 1.2 Ejecutar `impeccable context` y capturar la verdad de producto en `PRODUCT.md`; verificar que el archivo existe en la raíz.
- [x] 1.3 Confirmar la dirección Control Room con el usuario y registrar el contrato en `design.md`; verificar que el alcance excluye streaming, contenido y admin.

## 2. Fundación visual

- [x] 2.1 Agregar los tokens semánticos de superficie, línea, texto, estados y radios en `app/globals.css` para dark y light; verificar que `--brand-500` y el logo no cambian.
- [x] 2.2 Extender `tailwind.config.js` con los tokens nuevos sin eliminar los existentes; verificar con `npx tsc --noEmit` y una página de prueba visual.
- [x] 2.3 Cargar `Archivo` y `Martian Mono` con `next/font/google` y aplicar las variables solo al wrapper del dashboard; verificar que el sitio público conserva su tipografía.
- [x] 2.4 Reemplazar los estilos base de card, botón y formulario por las nuevas reglas de radio, borde y densidad; verificar dark/light en una pantalla representativa.

## 3. Shell Control Room

- [x] 3.1 Rediseñar `Sidebar.tsx` con rail plano, secciones en sentence case, items de 36px y estado activo de señal; verificar desktop y drawer móvil.
- [x] 3.2 Rediseñar `Header.tsx` a 56px, fondo sólido, borde inferior y controles compactos; verificar que no quede `backdrop-blur` ni sombra de superficie.
- [x] 3.3 Ajustar `DashboardLayoutClient.tsx` y `app/dashboard/layout.tsx` al nuevo ancho, padding y wrapper tipográfico; verificar que las props y providers no cambian.
- [x] 3.4 Revisar el banner de impersonación y los avisos globales para que usen la nueva piel sin perder su función; verificar el modo impersonación de admin.

## 4. Home operativa

- [x] 4.1 Recomponer `app/dashboard/page.tsx`: identidad de emisora, On Air, métricas, atención y cierre; verificar que las mismas consultas y condiciones se mantienen.
- [x] 4.2 Implementar la franja On Air reutilizando radio y TV, con estado, actual, siguiente, audiencia y acción; verificar los estados radio-only, TV-only, ambas y sin transmisión.
- [x] 4.3 Convertir `DashboardOverviewCards` y `AiCreditsCard` a una fila compacta con cifras tabulares y color semántico; verificar que no queden tarjetas multicolor ni decoraciones.
- [x] 4.4 Compactar `PaymentStatusCard` y agrupar los avisos de onboarding, datos básicos, pago y cuota en la zona de atención; verificar cada estado por separado.
- [x] 4.5 Eliminar de la home los gradientes decorativos, blobs, `hover:scale`, emojis en controles y sombras grandes; verificar con búsqueda de patrones en los archivos tocados.

## 5. Temas, idiomas y accesibilidad

- [ ] 5.1 Verificar shell y home en tema oscuro y claro, desktop (1440) y móvil (390), con capturas en `.impeccable/review/`.
- [ ] 5.2 Verificar ES/EN en shell y home, incluyendo botones, badges, estados vacíos y textos largos.
- [x] 5.3 Revisar foco visible, contraste AA, navegación por teclado y `prefers-reduced-motion`; corregir lo que falle.
- [x] 5.4 Hacer una pasada visual por `/admin` en ambos temas para confirmar que los tokens globales no rompieron sus pantallas.

## 6. Cierre y documentación

- [x] 6.1 Ejecutar `npx tsc --noEmit`, `npm test` y `cd streaming/agent && npm test`; verificar que todo pasa.
- [x] 6.2 Ejecutar el detector de Impeccable sobre los archivos cambiados y corregir los hallazgos mecánicos; verificar que no quedan gradientes decorativos, glass, blobs, `hover:scale` ni emojis en controles.
- [x] 6.3 Generar `DESIGN.md` y `.impeccable/design.json` desde el mundo construido, con paleta, tipografía, radios, espaciado, estados y reglas de composición.
- [ ] 6.4 Hacer la revisión final con capturas desktop/mobile y confirmar que la home sigue el contrato de dirección (On Air primero, métricas compactas, atención agrupada).
- [ ] 6.5 Deployar el panel y verificar en producción que el shell y la home cargan bien en ambos temas; sin migraciones ni cambios de infraestructura.

## 7. Rollout al resto de pantallas del cliente

- [x] 7.1 Normalizar desde `.dashboard-shell` las utilidades heredadas: radios, sombras, blur, gradientes decorativos, escalas y títulos; verificar con `npx next build`.
- [x] 7.2 Aplicar la cabecera Control Room a streaming, TV, biblioteca y analítica; verificar que las rutas y acciones no cambian.
- [x] 7.3 Reemplazar acentos indigo/blue y estados verdes/rojos crudos por tokens semánticos en streaming y TV; verificar con búsqueda de patrones.
- [x] 7.4 Limpiar emojis y decoración heredada en las páginas de contenido (about, podcasts, videocasts y formularios asociados); verificar en ES/EN.
- [ ] 7.5 Revisar las pantallas de cuenta y sistema (datos básicos, pagos, soporte, notificaciones, primeros pasos); verificar dark/light y móvil.
- [x] 7.6 Ejecutar `npx tsc --noEmit`, `npm test`, `npx next build` y detector de Impeccable sobre los archivos tocados.
