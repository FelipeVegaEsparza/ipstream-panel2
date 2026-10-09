# Tasks

## 1. Tokens y base (sin tocar componentes)

- [x] 1.1 Definir los tokens del diseño aprobado en `app/globals.css` (variable de marca, superficies, bordes, texto, radios, sombra suave, verde de estado) para tema oscuro y claro, reusando/renombrando las variables existentes; verificar con `npm run build` que compila y que la app carga igual.
- [x] 1.2 Extender `tailwind.config.js` (colores de marca, `boxShadow` suave, `borderRadius` de la escala, fuentes) sin romper las clases existentes; verificar `npm run build`.
- [x] 1.3 Aplicar Inter de verdad (quitar el override `font-family: system-ui` en `globals.css` y conectar la fuente del layout); verificar visualmente que la tipografía cambia y no rompe layout.
- [ ] 1.4 Crear una vista de referencia de tokens (opcional, `components/ui/TestStyles.tsx` o página interna) para comparar contra la maqueta; verificar que muestra colores/radios/sombras.

## 2. Componentes base

- [x] 2.1 Reestilizar `components/ui/button.tsx` (variantes CVA) con tokens y sombras suaves; verificar build + que todos los usos existentes compilan y los botones siguen funcionando (click, disabled, links).
- [x] 2.2 Reestilizar `components/ui/card.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`, `tabs.tsx` con tokens; verificar build + smoke test (abrir modales/formularios).
- [x] 2.3 Actualizar las clases de `globals.css` (`.card`, `.btn-*`, `.badge-*`, `.form-*`, `.sidebar-item`, `.glass-effect`, `.gradient-bg`) para que usen tokens y bajen los efectos (sin gradientes ruidosos, sombras planas, sin `hover:scale`); verificar build + que las 89 pantallas que las usan siguen sirviendo.
- [x] 2.4 **Guardrail**: revisar `git diff` de las Fases 1–2 y confirmar que solo se tocaron `className`/CSS/estilos (ningún handler, prop, ruta o lógica).

## 3. Shell + Dashboard

- [x] 3.1 Reestilizar `components/dashboard/Sidebar.tsx` (marca con logo, ítems con iconos/estados, badge de "Primeros pasos", tarjeta "Al aire") usando tokens; verificar navegación (links activos, submenús, badges, mobile).
- [x] 3.2 Reestilizar `components/dashboard/Header.tsx` y `DashboardLayoutClient.tsx` (buscador, campana, usuario, breadcrumb); verificar que los botones/enlaces siguen funcionando.
- [x] 3.3 Reestilizar la pantalla `app/dashboard/page.tsx` (onboarding, `DashboardOverviewCards`, tarjetas de stats) hacia el layout de la maqueta; verificar que el progreso de "Primeros pasos" y los datos se muestran igual.
- [x] 3.4 **Guardrail** Fase 3: diff solo-estilos + smoke test (login, dashboard, navegar a 2-3 secciones, abrir un modal).

## 4. Secciones del dashboard

- [x] 4.1 Migrar las secciones de Radio (`app/dashboard/streaming/**`, `components/dashboard/streaming/**`) a tokens/componentes; verificar reproducción/estado y formularios.
- [x] 4.2 Migrar las secciones de TV (`app/dashboard/television/**`); verificar biblioteca/parrilla/estado.
- [x] 4.3 Migrar el resto del dashboard (contenido, noticias, podcasts, etc.), por grupos; verificar cada grupo con build + smoke.
- [x] 4.4 **Guardrail** Fase 4: diff solo-estilos + smoke test por grupo.

## 5. Admin

- [ ] 5.1 Migrar `app/admin/**` y `components/admin/**` (planes, usuarios/dominios, servidores, ajustes) a tokens; verificar que las acciones de admin siguen funcionando (crear/editar/eliminar, "Proveer", DNS base).
- [ ] 5.2 **Guardrail** Fase 5: diff solo-estilos + smoke test (editar plan, registrar/enlazar dominio, abrir nodos).

## 6. Público (opcional, separable)

- [ ] 6.1 Migrar `app/registro`, `app/planes`, `app/auth/**` y `SignupForm` a tokens; verificar que el registro (incluido el campo de radio + chequeo de subdominio) sigue funcionando.

## 7. Limpieza y verificación final

- [ ] 7.1 Eliminar clases/efectos muertos (`gradient-bg`, `glass-effect`, gradientes no usados) y confirmar con búsqueda que no quedan referencias.
- [ ] 7.2 Documentar los tokens y las reglas de estilo en `AGENTS.md` (o `docs/`); verificar que el texto coincide con lo implementado.
- [ ] 7.3 Verificación integral: `npm run build` sin errores, `npx tsc --noEmit` limpio, y checklist funcional completo (auth, dashboard, streaming, TV, onboarding, dominios, planes, emails) en tema oscuro y claro.
