# Design

## Context

Ver `proposal.md` — Why. El dashboard es una app Next.js con Tailwind y tokens HSL en `app/globals.css`. El shell vive en `app/dashboard/layout.tsx` + `DashboardLayoutClient.tsx` + `Sidebar.tsx` + `Header.tsx`; la home en `app/dashboard/page.tsx` y componentes de tarjetas. Impeccable ya está instalado en `.opencode/` y `PRODUCT.md` captura la verdad de producto (usuario principal, posicionamiento, restricciones).

La dirección **Control Room** fue elegida por el usuario, no por una tirada de conceptos. Por eso se aplican las reglas de `mode-operate`: el mundo visual aporta tipografía, paleta, densidad y **un** movimiento de firma; nunca reemplaza la navegación ni los controles estándar. El build es code-led (superficie Operate), sin comps generados.

## Goals / Non-Goals

**Goals:**

- Un lenguaje visual reconocible en el shell y la home, con jerarquía operativa.
- Tokens semánticos que permitan extender el rediseño al resto del panel sin reescribir componentes.
- Misma funcionalidad, rutas, permisos, datos e i18n.
- Un movimiento de firma útil: la franja **On Air**.
- Documentar el sistema en `DESIGN.md` al terminar.

**Non-Goals:**

- Rediseñar admin en esta fase.
- Agregar features, endpoints, métricas nuevas o cambios de negocio.
- Cambiar el logo, el nombre o la paleta de marca.
- Reescribir la lógica de los componentes; se recompone y se reestiliza.
- Generar mockups con IA para una superficie Operate; el contrato vive en este documento y en el código.

**Rollout del resto del panel:** las pantallas del cliente heredan el shell y sus tokens. Las utilidades heredadas se normalizan con reglas scopeadas a `.dashboard-shell` (radios, sombras, blur, gradientes decorativos y escalas) y las pantallas principales de streaming, TV, biblioteca y analítica reciben cabeceras y controles del nuevo sistema. Las páginas de contenido se limpian en lotes para reemplazar emojis, acentos fuera de marca y tarjetas heredadas sin tocar su lógica.

## Decisions

### 1. Control Room como mundo visual, con una firma que no sea “gris + cyan”

El riesgo de esta dirección es caer en el dashboard oscuro genérico. Para evitarlo:

- **Paleta comprometida en el shell**, no solo un acento: rail en ink profundo, ground tintado y superficies escalonadas.
- **Tipografía de trabajo con carácter**: `Archivo` para UI y `Martian Mono` para métricas/tiempo. Se cargan con `next/font/google` y se aplican al contenedor del dashboard mediante variables CSS, sin cambiar la fuente del sitio público.
- **Movimiento de firma: On Air ribbon**. Una franja de altura baja, con estado a la izquierda, tema actual y progreso al centro, siguiente elemento a la derecha y acción principal. Es una “rundown” de emisión, no un adorno. El progreso se dibuja con una regla fina y tiempo monoespaciado.

Alternativa considerada: documentar el sistema actual y hacer un polish. Se descartó porque el look actual es el anti-referente; pulirlo perpetúa los tells. Alternativa considerada: usar una metáfora de consola física (perillas, VU meters). Se descartó porque el modo Operate prohíbe vestir la pantalla como el instrumento; solo se toma su disciplina de densidad y tiempo.

### 2. Tokens semánticos nuevos, marca intacta

Se conserva `--brand-500` y el gradiente de marca para usos puntuales, pero se agregan tokens de superficie y texto:

```
--surface-0   fondo de la app
--surface-1   rail / header
--surface-2   paneles
--surface-3   hover / selección
--line        bordes de 1px
--text-1/2/3  jerarquía de texto
--signal      cyan de marca para foco, enlaces y acción primaria
--live        verde semántico
--warn        ámbar semántico
--danger      rojo semántico
--radius-sm   6px   controles
--radius-md   10px  paneles
--radius-lg   12px  contenedores grandes
```

Las cards dejan de usar `rounded-2xl` y `shadow-soft` por defecto. La sombra se reserva para popovers/dropdowns. Los componentes nuevos usan tokens, nunca colores crudos.

Alternativa considerada: mantener los tokens actuales y cambiar solo clases. Se descartó porque el problema es sistémico; parchear clases deja inconsistencias en las 47 superficies que ya usan los patrones viejos.

### 3. Shell: rail sobrio, header compacto, densidad consistente

```
Sidebar 248px fijo (desktop) / drawer (móvil)
  logo 64px, sin drop-shadow
  secciones en sentence case, 12px medium
  items 36px, icono 18px, radio 8px
  activo: barra 2px + texto fuerte + fondo surface-3

Header 56px sticky
  fondo surface-0 sólido + borde inferior
  izquierda: contexto de página
  derecha: estado de emisión, sitio, ayuda, idioma, tema, usuario
  controles 32px, ghost

Main
  max-width 1440px, padding 24/32px
  sin contenedor con blur
```

En móvil se conserva el drawer actual, pero con la misma piel. `DashboardLayoutClient` mantiene sus props y lógica; solo cambia la composición visual.

### 4. Home: composición por trabajo, no por tarjeta

Orden:

1. **Identidad**: nombre de la emisora, plan y estado. El título “Dashboard” desaparece como hero; el nombre de la emisora es el ancla.
2. **On Air ribbon**: radio y TV, estado, tema actual/siguiente, audiencia y acción.
3. **Métricas**: almacenamiento radio/TV, créditos IA, PWA y plan en una fila de lectura, con cifras tabulares.
4. **Atención**: onboarding, datos básicos, pago y cuota, agrupados; si no hay nada, la zona colapsa.
5. **Cierre**: pago y accesos rápidos en formato compacto.

Se reutilizan `NowPlayingDisplay`, `NowPlayingTvDisplay`, `DashboardOverviewCards`, `AiCreditsCard`, `PaymentStatusCard` y los avisos de `page.tsx`. La reorganización es de presentación; no se agregan consultas.

### 5. Impeccable como guardarraíl, no como autoridad

- Instalación project-scope en `.opencode/` ya realizada.
- `PRODUCT.md` creado con la entrevista de producto.
- La dirección está fijada por el usuario; no se corre `concept-seed` para elegir un mundo nuevo.
- Al terminar la implementación se corre el detector sobre los archivos cambiados y se genera `DESIGN.md` desde el mundo construido. No se escribe `DESIGN.md` antes de construir para evitar defender una regla teórica contra la realidad.
- Si el detector sugiere algo que choca con marca o AGENTS.md, se descarta y se anota.

### 6. Tokens globales con impacto controlado

`globals.css` y `tailwind.config.js` son globales y también afectan admin y el sitio público. El rediseño:

- Agrega tokens nuevos sin borrar los existentes.
- Cambia valores de superficie de forma aditiva.
- Limita la tipografía nueva al wrapper del dashboard.
- Verifica admin en dark/light antes de cerrar.

## Risks / Trade-offs

- [El cambio de tokens afecta admin] → Pasada visual obligatoria por `/admin` en ambos temas; si algo se rompe, se ajusta el token, no se duplica el componente.
- [La fuente nueva no debe tocar el sitio público] → Variables CSS y clases aplicadas solo en el layout del dashboard; `app/layout.tsx` no cambia su fuente global.
- [Composición nueva de la home puede romper estados vacíos] → Revisar los estados sin radio, sin TV, sin plan, sin onboarding y con pago vencido.
- [Textos ES/EN de distinta longitud] → Probar la home y el shell en ambos idiomas, sobre todo botones y badges.
- [No hay tests visuales automatizados] → Capturas manuales desktop/mobile en dark/light + detector de Impeccable.
- [Impeccable puede no conocer los tokens] → `DESIGN.md` documenta los tokens y el detector se usa como lista de anti-patrones, no como diseñador.
- [Scope creep a 72 páginas] → La fase 1 se limita a shell + home; el resto se planifica después.

## Migration Plan

1. Implementar tokens y tipografía.
2. Rediseñar shell (sidebar/header/layout).
3. Recomponer la home.
4. Verificar dark/light, ES/EN, desktop/mobile y estados vacíos.
5. Pasar el detector de Impeccable sobre los archivos cambiados.
6. Generar `DESIGN.md` y `.impeccable/design.json`.
7. Deploy normal del panel; sin migraciones ni cambios de infraestructura.
8. Rollback: revertir el commit del rediseño. Los tokens nuevos son aditivos, así que no hay migración de datos.
